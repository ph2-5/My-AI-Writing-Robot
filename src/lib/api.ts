export interface ApiResult {
  success: boolean
  error?: string
  httpStatus?: number
  data?: unknown
}

type RequestInterceptor = (
  url: string,
  options: RequestInit,
) => Promise<{ url: string; options: RequestInit }> | { url: string; options: RequestInit }

type ResponseInterceptor = (
  response: Response,
) => Promise<Response> | Response

export class ApiClient {
  private serverUrl: string | null = null
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private readonly defaultTimeout = 30000
  private readonly generateTimeout = 120000
  private readonly imageAnalyzeTimeout = 60000
  private readonly maxRetries = 1

  private isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as any).electronAPI
  }

  async getServerUrl(): Promise<string> {
    if (this.serverUrl) return this.serverUrl
    if (this.isElectron()) {
      this.serverUrl = await (window as any).electronAPI.getServerUrl()
    } else {
      this.serverUrl = ''
    }
    return this.serverUrl
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  private async request(
    path: string,
    options: RequestInit = {},
    timeout?: number,
  ): Promise<ApiResult> {
    const baseUrl = await this.getServerUrl()
    let url = baseUrl ? `${baseUrl}${path}` : path
    let opts = { ...options }

    for (const interceptor of this.requestInterceptors) {
      const result = await interceptor(url, opts)
      url = result.url
      opts = result.options
    }

    const controller = new AbortController()
    opts.signal = controller.signal

    const timeoutMs = timeout ?? this.defaultTimeout
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let lastError: Error | null = null
    const attempts = this.maxRetries + 1

    for (let i = 0; i < attempts; i++) {
      try {
        let response = await fetch(url, opts)

        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response)
        }

        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}: ${response.statusText}`
          try {
            const errBody = await response.json()
            errorMsg = errBody.error || errorMsg
          } catch {}
          return {
            success: false,
            error: errorMsg,
            httpStatus: response.status,
          }
        }

        const data = await response.json()
        return {
          success: data.success !== undefined ? data.success : true,
          error: data.error,
          httpStatus: response.status,
          data,
        }
      } catch (err: any) {
        lastError = err
        if (err.name === 'AbortError') {
          clearTimeout(timer)
          return {
            success: false,
            error: '请求超时',
          }
        }
        if (i < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }
      } finally {
        clearTimeout(timer)
      }
    }

    return {
      success: false,
      error: lastError?.message || '网络错误',
    }
  }

  async upload(file: File, attachedImages?: File[]): Promise<ApiResult> {
    if (this.isElectron() && (window as any).electronAPI.upload) {
      try {
        const buffer = await file.arrayBuffer()
        const uint8 = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i])
        }
        const base64 = btoa(binary)
        
        // 处理附加图片
        const imageData: { name: string; data: string }[] = []
        if (attachedImages) {
          for (const img of attachedImages) {
            const imgBuffer = await img.arrayBuffer()
            const imgUint8 = new Uint8Array(imgBuffer)
            let imgBinary = ''
            for (let i = 0; i < imgUint8.length; i++) {
              imgBinary += String.fromCharCode(imgUint8[i])
            }
            imageData.push({
              name: img.name,
              data: btoa(imgBinary),
            })
          }
        }
        
        const result = await (window as any).electronAPI.upload({
          fileName: file.name,
          fileData: base64,
          mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          attachedImages: imageData,
        })
        return {
          success: result.success,
          error: result.error,
          data: result,
        }
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'IPC上传失败',
        }
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    
    // 添加附加图片
    if (attachedImages) {
      attachedImages.forEach((img, index) => {
        formData.append(`image_${index}`, img)
      })
    }
    
    return this.request('/api/homework/upload', {
      method: 'POST',
      body: formData,
    })
  }

  async generate(
    params: {
      fileId: string
      format: string
      seed: number | null
      config: Record<string, unknown>
      imageIds?: string[]
    },
    onProgress?: (msg: string) => void,
  ): Promise<ApiResult> {
    onProgress?.('正在生成...')

    if (this.isElectron() && (window as any).electronAPI.generate) {
      try {
        const result = await (window as any).electronAPI.generate(params)
        return {
          success: result.success,
          error: result.error,
          data: result,
        }
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'IPC生成失败',
        }
      }
    }

    return this.request(
      '/api/homework/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      this.generateTimeout,
    )
  }

  async demo(): Promise<ApiResult> {
    if (this.isElectron() && (window as any).electronAPI.demo) {
      try {
        const result = await (window as any).electronAPI.demo()
        return {
          success: result.success,
          error: result.error,
          data: result,
        }
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'IPC演示失败',
        }
      }
    }

    return this.request('/api/homework/demo')
  }

  async download(fileId: string): Promise<ApiResult> {
    if (this.isElectron() && (window as any).electronAPI.download) {
      try {
        const result = await (window as any).electronAPI.download(fileId)
        return {
          success: result.success,
          error: result.error,
          data: result,
        }
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'IPC下载失败',
        }
      }
    }

    const baseUrl = await this.getServerUrl()
    const url = baseUrl
      ? `${baseUrl}/api/homework/download/${fileId}`
      : `/api/homework/download/${fileId}`
    return {
      success: true,
      data: { downloadUrl: url },
    }
  }

  async preview(
    params: {
      fileId: string
      config: Record<string, unknown>
    },
  ): Promise<ApiResult> {
    if (this.isElectron() && (window as any).electronAPI.preview) {
      try {
        const result = await (window as any).electronAPI.preview(params)
        return {
          success: result.success,
          error: result.error,
          data: result,
        }
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'IPC预览失败',
        }
      }
    }

    return this.request(
      '/api/homework/preview',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      this.generateTimeout,
    )
  }

  async previewWithProgress(
    params: {
      fileId: string
      config: Record<string, unknown>
    },
    onProgress?: (event: { stage: string; message: string; data?: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ApiResult> {
    const baseUrl = await this.getServerUrl()
    const url = baseUrl ? `${baseUrl}/api/homework/preview` : '/api/homework/preview'

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.generateTimeout)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, stream: true }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorJson = JSON.parse(errorText)
          return { success: false, error: errorJson.error || `HTTP ${response.status}`, httpStatus: response.status }
        } catch {
          return { success: false, error: `HTTP ${response.status}`, httpStatus: response.status }
        }
      }

      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let finalResult: ApiResult = { success: true }
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6)
              try {
                const parsed = JSON.parse(dataStr)
                if (currentEvent === 'progress' && onProgress) {
                  onProgress(parsed)
                } else if (currentEvent === 'result') {
                  finalResult = parsed
                }
              } catch {}
            }
          }
        }

        return finalResult
      }

      const data = await response.json()
      return { success: data.success ?? true, error: data.error, httpStatus: response.status, data: data.data }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: '请求超时' }
      }
      return { success: false, error: err.message || '预览失败' }
    }
  }

  // 新增：图像分析接口
  async analyzeImage(
    imageFile: File,
    questionText?: string,
    config?: Record<string, unknown>,
  ): Promise<ApiResult> {
    const formData = new FormData()
    formData.append('image', imageFile)
    
    if (questionText) {
      formData.append('questionText', questionText)
    }
    
    if (config) {
      formData.append('config', JSON.stringify(config))
    }

    return this.request(
      '/api/homework/analyze-image',
      {
        method: 'POST',
        body: formData,
      },
      this.imageAnalyzeTimeout,
    )
  }

  async health(): Promise<ApiResult> {
    return this.request('/api/health')
  }
}

export const apiClient = new ApiClient()

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const baseUrl = await apiClient.getServerUrl()
  const url = baseUrl ? `${baseUrl}${path}` : path
  return fetch(url, options)
}
