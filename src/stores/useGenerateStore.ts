import { create } from 'zustand'
import { apiClient } from '@/lib/api'
import { useConfigStore } from '@/stores/useConfigStore'

interface Question {
  number: number
  type: string
  text: string
  requirements: string[]
}

interface SerialPort {
  port: string
  description: string
  hwid: string
}

interface GenerateState {
  fileId: string | null
  filePath: string | null
  questions: Question[]
  svgContent: string
  strokeCount: number
  estimatedTime: number
  log: string
  isGenerating: boolean
  isUploading: boolean
  error: string | null
  previewSvg: string
  questionPlans: any[]
  previewPageCount: number
  isPreviewing: boolean
  agentProgress: Array<{ stage: string; message: string; data?: Record<string, unknown>; timestamp: number }>
  isAgentWorking: boolean
  robotConnected: boolean
  robotPort: string | null
  robotBaudrate: number
  robotPorts: SerialPort[]
  isRobotConnecting: boolean
  isRobotSending: boolean

  setUploadResult: (fileId: string, filePath: string) => void
  setGenerateResult: (result: {
    fileId?: string
    questions: Question[]
    svgContent: string
    strokeCount: number
    estimatedTime: number
  }) => void
  reset: () => void
  setGenerating: (value: boolean) => void
  setUploading: (value: boolean) => void
  clearError: () => void
  uploadFile: (file: File) => Promise<void>
  startGenerate: (
    params: {
      fileId: string
      format: string
      seed: number | null
      config: Record<string, unknown>
    },
    onProgress?: (msg: string) => void,
  ) => Promise<void>
  startDemo: () => Promise<void>
  setPreviewResult: (result: { previewSvg: string; questionPlans: any[]; previewPageCount: number }) => void
  startPreview: (params: { fileId: string; config: Record<string, unknown> }) => Promise<void>
  addAgentProgress: (event: { stage: string; message: string; data?: Record<string, unknown>; timestamp: number }) => void
  clearAgentProgress: () => void
  setAgentWorking: (working: boolean) => void
  setPreviewSvg: (svg: string) => void
  setQuestionPlans: (plans: any[]) => void
  setQuestions: (questions: Question[]) => void
  adjustLayout: (adjustments: Record<string, unknown>) => Promise<void>
  runSelfCheck: () => Promise<void>
  selfCheckResult: Record<string, unknown> | null
  refreshRobotPorts: () => Promise<void>
  connectRobot: (port: string, baudrate?: number) => Promise<void>
  disconnectRobot: () => Promise<void>
  refreshRobotStatus: () => Promise<void>
  sendToRobot: (params: { command?: string; fileId?: string }) => Promise<void>
}

const initialState = {
  fileId: null as string | null,
  filePath: null as string | null,
  questions: [] as Question[],
  svgContent: '',
  strokeCount: 0,
  estimatedTime: 0,
  log: '',
  isGenerating: false,
  isUploading: false,
  error: null as string | null,
  previewSvg: '' as string,
  questionPlans: [] as any[],
  previewPageCount: 1 as number,
  isPreviewing: false as boolean,
  agentProgress: [] as Array<{ stage: string; message: string; data?: Record<string, unknown>; timestamp: number }>,
  isAgentWorking: false as boolean,
  robotConnected: false as boolean,
  robotPort: null as string | null,
  robotBaudrate: 115200 as number,
  robotPorts: [] as SerialPort[],
  isRobotConnecting: false as boolean,
  isRobotSending: false as boolean,
  selfCheckResult: null as Record<string, unknown> | null,
}

export const useGenerateStore = create<GenerateState>((set) => ({
  ...initialState,

  setUploadResult: (fileId, filePath) => set({ fileId, filePath }),

  setGenerateResult: (result) =>
    set({
      ...(result.fileId !== undefined ? { fileId: result.fileId } : {}),
      questions: result.questions,
      svgContent: result.svgContent,
      strokeCount: result.strokeCount,
      estimatedTime: result.estimatedTime,
    }),

  reset: () => set(initialState),

  setGenerating: (value) => set({ isGenerating: value }),

  setUploading: (value) => set({ isUploading: value }),

  clearError: () => set({ error: null }),

  uploadFile: async (file) => {
    set({ isUploading: true, error: null })
    try {
      const result = await apiClient.upload(file)
      if (result.success && result.data) {
        const data = result.data as any
        set({ fileId: data.fileId, filePath: data.filePath ?? '' })
        if (data.warning) {
          set({ error: data.warning })
        }
      } else {
        set({ error: result.error || '上传失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '上传异常' })
    } finally {
      set({ isUploading: false })
    }
  },

  startGenerate: async (params, onProgress?) => {
    set({ isGenerating: true, error: null })
    try {
      const result = await apiClient.generate(params, onProgress)
      if (result.success && result.data) {
        const data = result.data as any
        set({
          fileId: data.fileId ?? params.fileId,
          questions: data.questions ?? [],
          svgContent: data.svgContent ?? '',
          strokeCount: data.strokeCount ?? 0,
          estimatedTime: data.estimatedTime ?? 0,
          log: data.log ?? '',
        })
      } else {
        set({ error: result.error || '生成失败', log: result.error || '生成失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '生成异常', log: err.message || '生成异常' })
    } finally {
      set({ isGenerating: false })
    }
  },

  startDemo: async () => {
    set({ isGenerating: true, error: null })
    try {
      const result = await apiClient.demo()
      if (result.success && result.data) {
        const data = result.data as any
        set({
          questions: [],
          svgContent: data.svgContent ?? '',
          strokeCount: data.strokeCount ?? 0,
          estimatedTime: data.estimatedTime ?? 0,
          log: data.log ?? '',
        })
      } else {
        set({ error: result.error || '演示失败', log: result.error || '演示失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '演示异常', log: err.message || '演示异常' })
    } finally {
      set({ isGenerating: false })
    }
  },

  setPreviewResult: (result) => set({
    previewSvg: result.previewSvg,
    questionPlans: result.questionPlans,
    previewPageCount: result.previewPageCount,
  }),

  addAgentProgress: (event) => set(state => {
    const progress = [...state.agentProgress, event]
    return { agentProgress: progress.length > 50 ? progress.slice(-50) : progress }
  }),

  clearAgentProgress: () => set({ agentProgress: [] }),

  setAgentWorking: (working) => set({ isAgentWorking: working }),

  setPreviewSvg: (svg) => set({ previewSvg: svg }),

  setQuestionPlans: (plans) => set({ questionPlans: plans }),

  setQuestions: (questions) => set({ questions }),

  startPreview: async (params) => {
    set({ isPreviewing: true, error: null, isAgentWorking: true, agentProgress: [] })
    let lastProgressTime = 0
    try {
      const result = await apiClient.previewWithProgress(
        params,
        (event) => {
          const now = Date.now()
          if (now - lastProgressTime >= 200) {
            set(state => {
              const progress = [...state.agentProgress, event]
              return { agentProgress: progress.length > 50 ? progress.slice(-50) : progress }
            })
            lastProgressTime = now
          }
        },
      )
      if (result.success && result.data) {
        const data = result.data as any
        set({
          previewSvg: data.previewSvg ?? '',
          questionPlans: data.questionPlans ?? [],
          previewPageCount: data.pageCount ?? 1,
          questions: data.questions ?? [],
        })
      } else {
        set({ error: result.error || '预览失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '预览异常' })
    } finally {
      set({ isPreviewing: false, isAgentWorking: false })
    }
  },

  adjustLayout: async (adjustments) => {
    const state = useGenerateStore.getState()
    if (!state.fileId) return
    set({ isGenerating: true, error: null })
    try {
      const config = useConfigStore.getState().getConfig()
      const result = await apiClient.adjust({
        fileId: state.fileId,
        adjustments,
        config,
        format: (config.outputFormat as string) || 'kuixiang',
      })
      if (result.success && result.data) {
        const data = result.data as any
        set({
          svgContent: data.svgContent ?? '',
          strokeCount: data.strokeCount ?? 0,
          estimatedTime: data.estimatedTime ?? 0,
        })
      } else {
        set({ error: result.error || '调整失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '调整异常' })
    } finally {
      set({ isGenerating: false })
    }
  },

  runSelfCheck: async () => {
    const state = useGenerateStore.getState()
    if (!state.fileId) return
    set({ isAgentWorking: true, error: null, selfCheckResult: null })
    try {
      const config = useConfigStore.getState().getConfig()
      const result = await apiClient.selfCheck({
        fileId: state.fileId,
        svgContent: state.svgContent || state.previewSvg,
        questions: state.questions,
        config,
      })
      if (result.success && result.data) {
        const data = result.data as any
        set({ selfCheckResult: data.checkResult || data })
        const checkResult = data.checkResult || data
        if (!checkResult.passed && checkResult.suggestions && Object.keys(checkResult.suggestions).length > 0) {
          await useGenerateStore.getState().adjustLayout(checkResult.suggestions)
        }
      } else {
        set({ error: result.error || '自检失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '自检异常' })
    } finally {
      set({ isAgentWorking: false })
    }
  },

  refreshRobotPorts: async () => {
    try {
      const result = await apiClient.robotListPorts()
      if (result.success && result.data) {
        const data = result.data as any
        set({ robotPorts: data.ports || [] })
      }
    } catch {}
  },

  connectRobot: async (port, baudrate = 115200) => {
    set({ isRobotConnecting: true, error: null })
    try {
      const result = await apiClient.robotConnect(port, baudrate)
      if (result.success && result.data) {
        const data = result.data as any
        set({ robotConnected: true, robotPort: data.port || port, robotBaudrate: baudrate })
      } else {
        set({ error: result.error || '机器人连接失败', robotConnected: false })
      }
    } catch (err: any) {
      set({ error: err.message || '机器人连接异常', robotConnected: false })
    } finally {
      set({ isRobotConnecting: false })
    }
  },

  disconnectRobot: async () => {
    try {
      await apiClient.robotDisconnect()
      set({ robotConnected: false, robotPort: null })
    } catch {
      set({ robotConnected: false, robotPort: null })
    }
  },

  refreshRobotStatus: async () => {
    try {
      const result = await apiClient.robotStatus()
      if (result.success && result.data) {
        const data = result.data as any
        set({
          robotConnected: data.connected || false,
          robotPort: data.port || null,
          robotBaudrate: data.baudrate || 115200,
        })
      }
    } catch {}
  },

  sendToRobot: async (params) => {
    set({ isRobotSending: true, error: null })
    try {
      const result = await apiClient.robotSend(params)
      if (!result.success) {
        set({ error: result.error || '发送指令失败' })
      }
    } catch (err: any) {
      set({ error: err.message || '发送指令异常' })
    } finally {
      set({ isRobotSending: false })
    }
  },
}))
