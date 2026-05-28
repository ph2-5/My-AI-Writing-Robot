const { contextBridge, ipcRenderer } = require('electron')

const IPC_PERMISSIONS = {
  'get-server-url': { maxArgs: 0, validate: null },
  'select-docx-file': { maxArgs: 0, validate: null },
  'save-file': {
    maxArgs: 1,
    validate: (args) => typeof args[0] === 'object' && args[0] !== null,
  },
  'open-output-folder': { maxArgs: 0, validate: null },
  'upload': {
    maxArgs: 1,
    validate: (args) => typeof args[0] === 'object' && args[0] !== null,
  },
  'generate': {
    maxArgs: 1,
    validate: (args) => typeof args[0] === 'object' && args[0] !== null,
  },
  'demo': { maxArgs: 0, validate: null },
  'download': {
    maxArgs: 1,
    validate: (args) => typeof args[0] === 'string' && args[0].length > 0 && args[0].length < 256,
  },
  'preview': {
    maxArgs: 1,
    validate: (args) => typeof args[0] === 'object' && args[0] !== null,
  },
}

const rateLimits = new Map()
const RATE_WINDOW = 60000
const RATE_MAX = 100

function checkRateLimit(channel) {
  const now = Date.now()
  if (!rateLimits.has(channel)) {
    rateLimits.set(channel, [])
  }
  const timestamps = rateLimits.get(channel).filter((t) => now - t < RATE_WINDOW)
  rateLimits.set(channel, timestamps)
  if (timestamps.length >= RATE_MAX) {
    throw new Error(`Rate limit exceeded: ${channel}`)
  }
  timestamps.push(now)
}

function validateInput(channel, args) {
  const permission = IPC_PERMISSIONS[channel]
  if (!permission) {
    throw new Error(`Channel not permitted: ${channel}`)
  }
  if (args.length > permission.maxArgs) {
    throw new Error(`Too many arguments for: ${channel}`)
  }
  if (permission.validate && !permission.validate(args)) {
    throw new Error(`Invalid input for: ${channel}`)
  }
}

function secureInvoke(channel, ...args) {
  validateInput(channel, args)
  checkRateLimit(channel)
  return ipcRenderer.invoke(channel, ...args)
}

contextBridge.exposeInMainWorld('electronAPI', {
  getServerUrl: () => secureInvoke('get-server-url'),
  selectDocxFile: () => secureInvoke('select-docx-file'),
  saveFile: (options) => secureInvoke('save-file', options),
  openOutputFolder: () => secureInvoke('open-output-folder'),
  upload: (fileData) => secureInvoke('upload', fileData),
  generate: (params) => secureInvoke('generate', params),
  demo: () => secureInvoke('demo'),
  download: (fileId) => secureInvoke('download', fileId),
  preview: (params) => secureInvoke('preview', params),
})
