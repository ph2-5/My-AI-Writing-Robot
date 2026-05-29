const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const crypto = require('crypto')

process.on('uncaughtException', (err) => {
  const msg = `[CRASH] ${new Date().toISOString()} Uncaught Exception: ${err.stack || err.message}\n`
  try {
    const crashDir = path.join(app.getPath('userData'))
    if (!fs.existsSync(crashDir)) fs.mkdirSync(crashDir, { recursive: true })
    fs.appendFileSync(path.join(crashDir, 'crash.log'), msg)
  } catch {}
  console.error(msg)
  dialog.showErrorBox('应用崩溃', `发生未预期的错误：${err.message}\n\n详细信息已记录到日志文件。`)
  app.quit()
})

process.on('unhandledRejection', (reason) => {
  const msg = `[CRASH] ${new Date().toISOString()} Unhandled Rejection: ${reason}\n`
  try {
    const crashDir = path.join(app.getPath('userData'))
    if (!fs.existsSync(crashDir)) fs.mkdirSync(crashDir, { recursive: true })
    fs.appendFileSync(path.join(crashDir, 'crash.log'), msg)
  } catch {}
  console.error(msg)
})

app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-gpu')

let logStream = null
let logReady = false

function initLog() {
  try {
    const logDir = app.getPath('userData')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const logFile = path.join(logDir, 'app.log')
    logStream = fs.createWriteStream(logFile, { flags: 'a' })
    logReady = true
  } catch (err) {
    console.error('Failed to init log:', err.message)
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  if (logReady && logStream) {
    logStream.write(line)
  }
  console.log(line.trim())
}

initLog()

log(`App starting... isPackaged=${app.isPackaged}, __dirname=${__dirname}`)
log(`Electron version: ${process.versions.electron}, Node: ${process.version}`)
log(`Platform: ${process.platform}, Arch: ${process.arch}`)

const isPackaged = app.isPackaged || __dirname.includes('app.asar') || !fs.existsSync(path.resolve(__dirname, '..', 'package.json'))

function getAppRoot() {
  if (isPackaged) {
    const appPath = path.join(process.resourcesPath, 'app')
    log(`Packaged mode, appPath: ${appPath}`)
    return appPath
  }
  log(`Dev mode, __dirname parent: ${path.resolve(__dirname, '..')}`)
  return path.resolve(__dirname, '..')
}

const appRoot = getAppRoot()

const isDev = !isPackaged
const SERVER_PY = path.join(appRoot, 'electron', 'server.py')
const uploadsDir = path.join(appRoot, 'uploads')
const outputsDir = path.join(appRoot, 'outputs')

log(`appRoot=${appRoot}, isDev=${isDev}, SERVER_PY=${SERVER_PY}`)
log(`SERVER_PY exists: ${fs.existsSync(SERVER_PY)}`)

let PYTHON = null

function findPython() {
  const isWin = process.platform === 'win32'

  // Windows: check common installation paths first
  if (isWin) {
    const winPaths = []
    const localAppData = process.env.LOCALAPPDATA || ''
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    if (localAppData) {
      try {
        const versions = fs.readdirSync(path.join(localAppData, 'Programs', 'Python')).filter(d => d.startsWith('Python3'))
        for (const v of versions) {
          winPaths.push(path.join(localAppData, 'Programs', 'Python', v, 'python.exe'))
        }
      } catch {}
    }

    winPaths.push(
      path.join(programFiles, 'Python312', 'python.exe'),
      path.join(programFiles, 'Python311', 'python.exe'),
      path.join(programFiles, 'Python310', 'python.exe'),
      path.join(programFilesX86, 'Python312', 'python.exe'),
      path.join(programFilesX86, 'Python311', 'python.exe'),
      path.join(programFilesX86, 'Python310', 'python.exe'),
    )

    for (const p of winPaths) {
      if (fs.existsSync(p)) {
        log(`Found python at: ${p}`)
        return p
      }
    }
  }

  // Fallback: check PATH
  const candidates = ['python3', 'python', 'py']
  const cmd = isWin ? 'where' : 'which'

  for (const name of candidates) {
    try {
      const result = require('child_process').execSync(`${cmd} ${name}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
      if (result) {
        const paths = result.split(/\r?\n/).filter(p => !p.includes('WindowsApps'))
        if (paths.length > 0) {
          log(`Found python via '${cmd} ${name}': ${paths[0]}`)
          return paths[0]
        }
      }
    } catch {}
  }

  const bundledPython = path.join(process.resourcesPath, 'python', 'python.exe')
  if (fs.existsSync(bundledPython)) {
    log(`Found bundled python: ${bundledPython}`)
    return bundledPython
  }

  return null
}

let mainWindow = null
let pythonProcess = null
let serverPort = 0

function ensureDirs() {
  ;[uploadsDir, outputsDir].forEach((dir) => {
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

function startPythonServer(port) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PORT: String(port) }
    log(`Spawning Python: ${PYTHON} ${SERVER_PY} --port ${port}`)
    log(`CWD: ${appRoot}`)

    pythonProcess = spawn(PYTHON, [SERVER_PY, '--port', String(port)], {
      cwd: appRoot,
      env,
    })

    let resolved = false

    pythonProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim()
      log(`[Python stdout] ${msg}`)
      if (msg.includes('Server running') && !resolved) {
        resolved = true
        resolve()
      }
    })

    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim()
      log(`[Python stderr] ${msg}`)
    })

    pythonProcess.on('error', (err) => {
      log(`Python spawn error: ${err.message}`)
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })

    pythonProcess.on('close', (code) => {
      log(`Python process exited with code ${code}`)
      if (code !== 0 && code !== null && !resolved) {
        resolved = true
        reject(new Error(`Python exited with code ${code}`))
      }
    })

    setTimeout(() => {
      if (!resolved) {
        log('Python server startup timeout (5s), proceeding anyway')
        resolved = true
        resolve()
      }
    }, 5000)
  })
}

function getBaseUrl() {
  return `http://127.0.0.1:${serverPort}`
}

function serverRequest(method, urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl()
    const parsedUrl = new URL(urlPath, baseUrl)

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: options.headers || {},
    }

    const req = http.request(requestOptions, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        if (options.rawResponse) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body })
        } else {
          try {
            const json = JSON.parse(body.toString('utf-8'))
            resolve(json)
          } catch (e) {
            resolve({ success: false, error: body.toString('utf-8') })
          }
        }
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'AI 写字机器人',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    titleBarStyle: 'default',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '..', 'index.html')
    log(`Loading file: ${indexPath}`)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Window shown')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log('Web content loaded successfully')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    log(`Web content failed to load: ${errorCode} ${errorDesc}`)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  log('App ready, initializing...')
  ensureDirs()

  PYTHON = findPython()
  log(`Python found: ${PYTHON}`)
  if (!PYTHON) {
    dialog.showMessageBoxSync(null, {
      type: 'error',
      title: '缺少 Python 环境',
      message: '未找到 Python，请安装 Python 3.10+ 并添加到系统 PATH。',
      detail: '下载地址: https://www.python.org/downloads/\n\n安装时请勾选 "Add Python to PATH"',
      buttons: ['确定'],
    })
    app.quit()
    return
  }

  try {
    serverPort = await findFreePort()
    log(`Starting Python server on port ${serverPort}`)
    await startPythonServer(serverPort)
    log(`Python server started on port ${serverPort}`)
  } catch (err) {
    log(`Failed to start Python server: ${err.message}`)
    dialog.showErrorBox('启动错误', `无法启动 Python 后端服务：${err.message}\n\n请确保 Python 已正确安装。`)
    app.quit()
    return
  }

  createWindow()
  log('Window created successfully')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch((err) => {
  log(`Fatal error in app.whenReady: ${err.stack || err.message}`)
  dialog.showErrorBox('启动失败', `应用启动时发生错误：${err.message}`)
  app.quit()
})

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
  if (logStream) {
    logStream.end()
  }
})

ipcMain.handle('get-server-url', () => {
  return `http://127.0.0.1:${serverPort}`
})

ipcMain.handle('select-docx-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Word Documents', extensions: ['docx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  return result
})

ipcMain.handle('save-file', async (_event, { defaultPath, data, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'G-code Files', extensions: ['gcode'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data, 'utf-8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('open-output-folder', async () => {
  shell.openPath(outputsDir)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('upload', async (_event, { fileName, fileData, mimeType }) => {
  const boundary = '----ElectronBoundary' + crypto.randomBytes(16).toString('hex')
  const fileBuffer = Buffer.from(fileData, 'base64')

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([header, fileBuffer, footer])

  return serverRequest('POST', '/api/homework/upload', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  })
})

ipcMain.handle('generate', async (_event, { fileId, format, seed, config }) => {
  const body = Buffer.from(JSON.stringify({ fileId, format, seed, config }), 'utf-8')
  return serverRequest('POST', '/api/homework/generate', {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
    },
    body,
  })
})

ipcMain.handle('demo', async () => {
  return serverRequest('GET', '/api/homework/demo')
})

ipcMain.handle('download', async (_event, fileId) => {
  const result = await serverRequest('GET', `/api/homework/download/${fileId}`, {
    rawResponse: true,
  })
  if (result.statusCode === 200) {
    return {
      success: true,
      data: result.body.toString('base64'),
      mimeType: result.headers['content-type'] || 'application/octet-stream',
    }
  }
  try {
    const json = JSON.parse(result.body.toString('utf-8'))
    return json
  } catch {
    return { success: false, error: `Download failed with status ${result.statusCode}` }
  }
})

ipcMain.handle('preview', async (_event, { fileId, config }) => {
  const body = Buffer.from(JSON.stringify({ fileId, config, stream: false }), 'utf-8')
  const result = await serverRequest('POST', '/api/homework/preview', {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
    },
    body,
  })
  return result
})
