const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const crypto = require('crypto')

// ============ Error Handling ============
process.on('uncaughtException', (err) => {
  const msg = `[CRASH] ${new Date().toISOString()} ${err.stack || err.message}\n`
  try {
    const d = app.getPath('userData')
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
    fs.appendFileSync(path.join(d, 'crash.log'), msg)
  } catch {}
  dialog.showErrorBox('Application Error', err.message)
  app.quit()
})

// ============ Logging ============
let logStream = null

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    if (logStream) logStream.write(line)
  } catch {}
  try {
    console.log(line.trim())
  } catch {}
}

function initLog() {
  try {
    const logDir = app.getPath('userData')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    logStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'w' })
  } catch (err) {
    console.error('Log init failed:', err.message)
  }
}

// ============ Path Resolution ============
// CRITICAL: Understand the packaged file structure
//
// Dev mode:
//   __dirname = <project>/electron
//   Frontend: http://localhost:5173
//   Python CWD: <project>/
//   server.py: <project>/electron/server.py
//
// Packaged mode (with asar):
//   __dirname = <app>/resources/app.asar/electron
//   process.resourcesPath = <app>/resources
//   Frontend: app.asar/dist/index.html
//   Python files (extraResources): resources/main.py, resources/analyzers/, etc.
//   server.py: app.asar/electron/server.py (inside asar, but Python can't read asar!)
//
// Packaged mode (without asar):
//   __dirname = <app>/resources/app/electron
//   process.resourcesPath = <app>/resources
//   Frontend: resources/app/dist/index.html
//   Python files (extraResources): resources/main.py, resources/analyzers/, etc.
//   server.py: resources/app/electron/server.py
//
// We use --no-asar for packaging so Python can find server.py directly.

const isDev = !app.isPackaged

function resolveFrontendPath() {
  if (isDev) return null // Use URL instead
  // __dirname is either app.asar/electron or resources/app/electron
  // index.html is in dist/ folder one level up from electron/
  const candidate = path.join(__dirname, '..', 'dist', 'index.html')
  log(`Frontend candidate: ${candidate}, exists: ${fs.existsSync(candidate)}`)
  return candidate
}

function resolvePythonCwd() {
  if (isDev) return path.resolve(__dirname, '..')
  return path.join(process.resourcesPath, 'app')
}

function resolveServerPy() {
  if (isDev) return path.join(path.resolve(__dirname, '..'), 'electron', 'server.py')
  // In packaged mode, server.py could be in several locations:
  // 1. resources/server.py (extraResources flat copy)
  // 2. resources/electron/server.py (extraResources with directory structure)
  // 3. resources/app/electron/server.py (inside app directory, no-asar mode)
  const candidates = [
    path.join(process.resourcesPath, 'server.py'),
    path.join(process.resourcesPath, 'electron', 'server.py'),
    path.join(__dirname, 'server.py'),
  ]
  for (const p of candidates) {
    log(`Checking server.py: ${p}, exists: ${fs.existsSync(p)}`)
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

// ============ Python Detection ============
function findPython() {
  const isWin = process.platform === 'win32'
  const candidates = []

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || ''
    const pf = process.env.ProgramFiles || 'C:\\Program Files'
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    if (localAppData) {
      try {
        const versions = fs.readdirSync(path.join(localAppData, 'Programs', 'Python'))
          .filter(d => d.startsWith('Python3'))
          .sort()
          .reverse()
        for (const v of versions) {
          candidates.push(path.join(localAppData, 'Programs', 'Python', v, 'python.exe'))
        }
      } catch {}
    }

    candidates.push(
      path.join(pf, 'Python313', 'python.exe'),
      path.join(pf, 'Python312', 'python.exe'),
      path.join(pf, 'Python311', 'python.exe'),
      path.join(pf, 'Python310', 'python.exe'),
      path.join(pfx86, 'Python313', 'python.exe'),
      path.join(pfx86, 'Python312', 'python.exe'),
      path.join(pfx86, 'Python311', 'python.exe'),
      path.join(pfx86, 'Python310', 'python.exe'),
    )
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      log(`Found Python: ${p}`)
      return p
    }
  }

  // Try PATH
  const pathNames = isWin ? ['python.exe', 'python3.exe', 'py.exe'] : ['python3', 'python']
  const cmd = isWin ? 'where' : 'which'

  for (const name of pathNames) {
    try {
      const result = require('child_process').execSync(`${cmd} ${name}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 3000,
      }).trim()
      const paths = result.split(/\r?\n/).filter(p => !p.includes('WindowsApps'))
      if (paths.length > 0) {
        log(`Found Python via PATH: ${paths[0]}`)
        return paths[0]
      }
    } catch {}
  }

  return null
}

// ============ Server Management ============
let mainWindow = null
let pythonProcess = null
let serverPort = 0
const uploadsDir = path.join(app.getPath('userData'), 'uploads')
const outputsDir = path.join(app.getPath('userData'), 'outputs')
const imagesDir = path.join(app.getPath('userData'), 'images')

function ensureDirs() {
  ;[uploadsDir, outputsDir, imagesDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

function startPythonServer(port, pythonExe, serverPy, cwd) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PORT: String(port), UPLOADS_DIR: uploadsDir, OUTPUTS_DIR: outputsDir, IMAGES_DIR: imagesDir }
    log(`Starting Python: ${pythonExe} ${serverPy} --port ${port}`)
    log(`CWD: ${cwd}`)

    pythonProcess = spawn(pythonExe, [serverPy, '--port', String(port)], {
      cwd,
      env,
    })

    let resolved = false

    pythonProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim()
      log(`[Python] ${msg}`)
      if (msg.includes('Server running') && !resolved) {
        resolved = true
        resolve()
      }
    })

    pythonProcess.stderr.on('data', (data) => {
      log(`[Python err] ${data.toString().trim()}`)
    })

    pythonProcess.on('error', (err) => {
      log(`Python spawn error: ${err.message}`)
      if (!resolved) { resolved = true; reject(err) }
    })

    pythonProcess.on('close', (code) => {
      log(`Python exited with code ${code}`)
      if (code !== 0 && code !== null && !resolved) {
        resolved = true
        reject(new Error(`Python exited with code ${code}`))
      }
    })

    setTimeout(() => {
      if (!resolved) {
        log('Python startup timeout (5s), proceeding anyway')
        resolved = true
        resolve()
      }
    }, 5000)
  })
}

function serverRequest(method, urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, `http://127.0.0.1:${serverPort}`)
    const reqOpts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: options.headers || {},
    }

    const req = http.request(reqOpts, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        if (options.rawResponse) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body })
        } else {
          try {
            resolve(JSON.parse(body.toString('utf-8')))
          } catch {
            resolve({ success: false, error: body.toString('utf-8') })
          }
        }
      })
    })

    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

// ============ Window ============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'AI Writing Robot',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const frontendPath = resolveFrontendPath()
    if (!frontendPath || !fs.existsSync(frontendPath)) {
      const msg = `Frontend file not found!\n\nExpected: ${frontendPath}\n__dirname: ${__dirname}\nresourcesPath: ${process.resourcesPath}\n\nListing __dirname/..:\n${fs.readdirSync(path.join(__dirname, '..')).join('\n')}`
      log(msg)
      dialog.showErrorBox('Startup Error', msg)
      app.quit()
      return
    }
    log(`Loading frontend: ${frontendPath}`)
    mainWindow.loadFile(frontendPath)
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Window shown')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log('Web content loaded successfully')
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`Web content FAILED: ${code} ${desc}`)
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ============ App Lifecycle ============
app.whenReady().then(async () => {
  initLog()
  log('=== App Starting ===')
  log(`isDev: ${isDev}`)
  log(`__dirname: ${__dirname}`)
  log(`resourcesPath: ${process.resourcesPath}`)
  log(`app.isPackaged: ${app.isPackaged}`)

  // List key directories for debugging
  if (!isDev) {
    log(`Listing __dirname: ${fs.readdirSync(__dirname).join(', ')}`)
    log(`Listing __dirname/..: ${fs.readdirSync(path.join(__dirname, '..')).join(', ')}`)
    log(`Listing resourcesPath: ${fs.readdirSync(process.resourcesPath).join(', ')}`)
    const distDir = path.join(__dirname, '..', 'dist')
    if (fs.existsSync(distDir)) {
      log(`Listing dist: ${fs.readdirSync(distDir).join(', ')}`)
    }
  }

  ensureDirs()

  const PYTHON = findPython()
  if (!PYTHON) {
    dialog.showMessageBoxSync(null, {
      type: 'error',
      title: 'Python Not Found',
      message: 'Python 3.10+ is required but not found.',
      detail: 'Please install Python from https://www.python.org/downloads/\nand check "Add Python to PATH" during installation.',
      buttons: ['OK'],
    })
    app.quit()
    return
  }

  const pythonCwd = resolvePythonCwd()
  const serverPy = resolveServerPy()

  if (!fs.existsSync(serverPy)) {
    const msg = `server.py not found at: ${serverPy}`
    log(msg)
    dialog.showErrorBox('Startup Error', msg)
    app.quit()
    return
  }

  try {
    serverPort = await findFreePort()
    log(`Using port ${serverPort}`)
    await startPythonServer(serverPort, PYTHON, serverPy, pythonCwd)
    log('Python server started')
  } catch (err) {
    log(`Python server failed: ${err.message}`)
    dialog.showErrorBox('Backend Error', `Failed to start Python backend:\n${err.message}`)
    app.quit()
    return
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((err) => {
  log(`Fatal: ${err.stack || err.message}`)
  dialog.showErrorBox('Fatal Error', err.message)
  app.quit()
})

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (pythonProcess) pythonProcess.kill()
  if (logStream) logStream.end()
})

// ============ IPC Handlers ============
ipcMain.handle('get-server-url', () => `http://127.0.0.1:${serverPort}`)

ipcMain.handle('select-docx-file', async () => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Word Documents', extensions: ['docx'] }, { name: 'All Files', extensions: ['*'] }],
  })
})

ipcMain.handle('save-file', async (_e, { defaultPath, data, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data, 'utf-8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('open-output-folder', () => shell.openPath(outputsDir))

ipcMain.handle('get-app-version', () => app.getVersion())

ipcMain.handle('upload', async (_e, { fileName, fileData, mimeType, attachedImages }) => {
  const boundary = '----Boundary' + crypto.randomBytes(16).toString('hex')
  const fileBuffer = Buffer.from(fileData, 'base64')
  const parts = [Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`), fileBuffer]

  if (attachedImages && Array.isArray(attachedImages)) {
    for (let i = 0; i < attachedImages.length; i++) {
      const img = attachedImages[i]
      const imgBuffer = Buffer.from(img.data, 'base64')
      parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="image_${i}"; filename="${img.name}"\r\nContent-Type: application/octet-stream\r\n\r\n`), imgBuffer)
    }
  }

  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
  const body = Buffer.concat(parts)
  return serverRequest('POST', '/api/homework/upload', {
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    body,
  })
})

ipcMain.handle('generate', async (_e, { fileId, format, seed, config }) => {
  const body = Buffer.from(JSON.stringify({ fileId, format, seed, config }), 'utf-8')
  return serverRequest('POST', '/api/homework/generate', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    body,
  })
})

ipcMain.handle('demo', async () => serverRequest('GET', '/api/homework/demo'))

ipcMain.handle('download', async (_e, fileId) => {
  const result = await serverRequest('GET', `/api/homework/download/${fileId}`, { rawResponse: true })
  if (result.statusCode === 200) {
    return { success: true, data: result.body.toString('base64'), mimeType: result.headers['content-type'] || 'application/octet-stream' }
  }
  try { return JSON.parse(result.body.toString('utf-8')) } catch { return { success: false, error: `Download failed: ${result.statusCode}` } }
})

ipcMain.handle('preview', async (_e, { fileId, config }) => {
  const body = Buffer.from(JSON.stringify({ fileId, config, stream: false }), 'utf-8')
  return serverRequest('POST', '/api/homework/preview', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    body,
  })
})

ipcMain.handle('robot-ports', async () => serverRequest('GET', '/api/robot/ports'))

ipcMain.handle('robot-connect', async (_e, { port, baudrate }) => {
  const body = Buffer.from(JSON.stringify({ port, baudrate }), 'utf-8')
  return serverRequest('POST', '/api/robot/connect', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    body,
  })
})

ipcMain.handle('robot-disconnect', async () => serverRequest('POST', '/api/robot/disconnect'))

ipcMain.handle('robot-status', async () => serverRequest('GET', '/api/robot/status'))

ipcMain.handle('robot-send', async (_e, params) => {
  const body = Buffer.from(JSON.stringify(params), 'utf-8')
  return serverRequest('POST', '/api/robot/send', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    body,
  })
})
