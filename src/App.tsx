import { useState, useRef, useCallback, useEffect } from 'react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api'
import {
  PenTool, Upload, Settings, Eye, Play, Download,
  Image as ImageIcon, X, ZoomIn, ZoomOut, Maximize2,
  Loader2, FileText, ChevronDown, ChevronUp,
  HelpCircle, Github, PanelLeft, PanelRight,
  GripVertical, Type, Ruler, Bot, BrainCircuit,
  LayoutTemplate, SlidersHorizontal, Undo2,
  CheckCircle2, AlertCircle, Clock, Hash, MousePointer2,
  Sparkles, RotateCcw, Usb, Wifi, WifiOff, RefreshCw, Send,
} from 'lucide-react'

interface FloatingPanelProps {
  id: string
  title: string
  icon: React.ReactNode
  defaultPosition: { x: number; y: number }
  defaultSize: { width: number; height: number }
  minSize?: { width: number; height: number }
  children: React.ReactNode
  onClose?: () => void
}

function FloatingPanel({
  title,
  icon,
  defaultPosition,
  defaultSize,
  minSize = { width: 240, height: 200 },
  children,
  onClose,
}: FloatingPanelProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [size, setSize] = useState(defaultSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.panel-resize-handle')) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }
    e.preventDefault()
  }, [position])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height }
    e.preventDefault()
    e.stopPropagation()
  }, [size])

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = dragStart.current.px + (e.clientX - dragStart.current.x)
        const newY = dragStart.current.py + (e.clientY - dragStart.current.y)
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - size.width)),
          y: Math.max(32, Math.min(newY, window.innerHeight - size.height)),
        })
      }
      if (isResizing) {
        const newW = Math.max(minSize.width, resizeStart.current.w + (e.clientX - resizeStart.current.x))
        const newH = Math.max(minSize.height, resizeStart.current.h + (e.clientY - resizeStart.current.y))
        setSize({ width: newW, height: newH })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, size.width, size.height, minSize])

  return (
    <div
      className={cn(
        'absolute flex flex-col rounded-xl border border-zinc-700/80 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden',
        isDragging && 'cursor-grabbing shadow-zinc-900/50'
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isDragging || isResizing ? 100 : 50,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 cursor-grab active:cursor-grabbing bg-zinc-800/50"
        onMouseDown={handleDragStart}
      >
        <GripVertical className="h-3.5 w-3.5 text-zinc-600" />
        {icon}
        <span className="text-xs font-semibold text-zinc-300 flex-1 select-none">{title}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>

      <div
        className="panel-resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={handleResizeStart}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="absolute bottom-1 right-1 text-zinc-600">
          <path d="M8 12L12 8M4 12L12 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  )
}

interface DockablePanelProps {
  side: 'left' | 'right'
  width: number
  onWidthChange: (w: number) => void
  children: React.ReactNode
}

function DockablePanel({ side, width, onWidthChange, children }: DockablePanelProps) {
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = () => {
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newWidth = side === 'left' ? e.clientX : window.innerWidth - e.clientX
    onWidthChange(Math.max(200, Math.min(500, newWidth)))
  }, [side, onWidthChange])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  return (
    <div
      className={cn(
        'relative flex-shrink-0 bg-zinc-900 border-zinc-800 flex flex-col',
        side === 'left' ? 'border-r' : 'border-l'
      )}
      style={{ width }}
    >
      {children}
      <div
        className={cn(
          'absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 transition-colors z-10',
          side === 'left' ? 'right-0' : 'left-0',
          isResizing && 'bg-blue-500/50'
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

export default function App() {
  const [leftWidth, setLeftWidth] = useState(300)
  const [rightWidth, setRightWidth] = useState(280)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  const [floatingPanels, setFloatingPanels] = useState<Record<string, boolean>>({
    upload: false,
    config: false,
    questions: false,
  })

  const toggleFloating = (id: string) => {
    setFloatingPanels(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="h-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden select-none">
      <header className="h-11 border-b border-zinc-800 bg-zinc-900 flex items-center px-3 gap-2 flex-shrink-0 z-40">
        <div className="flex items-center gap-2 mr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <PenTool className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">AI写字机器人</span>
        </div>

        <div className="h-5 w-px bg-zinc-700 mx-1" />

        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            leftOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          )}
          title="Toggle Left Panel"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            rightOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          )}
          title="Toggle Right Panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>

        <div className="h-5 w-px bg-zinc-700 mx-1" />

        <button
          onClick={() => toggleFloating('upload')}
          className={cn(
            'rounded-lg p-1.5 transition-colors text-xs flex items-center gap-1.5',
            floatingPanels.upload ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">上传</span>
        </button>
        <button
          onClick={() => toggleFloating('config')}
          className={cn(
            'rounded-lg p-1.5 transition-colors text-xs flex items-center gap-1.5',
            floatingPanels.config ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">配置</span>
        </button>
        <button
          onClick={() => toggleFloating('questions')}
          className={cn(
            'rounded-lg p-1.5 transition-colors text-xs flex items-center gap-1.5',
            floatingPanels.questions ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          )}
        >
          <Hash className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">题目</span>
        </button>

        <div className="flex-1" />

        <GlobalActions />

        <div className="h-5 w-px bg-zinc-700 mx-1" />

        <button
          onClick={() => setShowHelp(true)}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        <a
          href="https://github.com/ph2-5/My-AI-Writing-Robot"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <Github className="h-4 w-4" />
        </a>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {leftOpen && (
          <DockablePanel side="left" width={leftWidth} onWidthChange={setLeftWidth}>
            <LeftSidebar />
          </DockablePanel>
        )}

        <main className="flex-1 bg-zinc-950 relative overflow-hidden">
          <CanvasArea />
        </main>

        {rightOpen && (
          <DockablePanel side="right" width={rightWidth} onWidthChange={setRightWidth}>
            <RightSidebar />
          </DockablePanel>
        )}

        {floatingPanels.upload && (
          <FloatingPanel
            id="upload"
            title="文档上传"
            icon={<Upload className="h-3.5 w-3.5 text-blue-400" />}
            defaultPosition={{ x: 60, y: 60 }}
            defaultSize={{ width: 320, height: 400 }}
            onClose={() => toggleFloating('upload')}
          >
            <UploadPanel />
          </FloatingPanel>
        )}
        {floatingPanels.config && (
          <FloatingPanel
            id="config"
            title="配置"
            icon={<SlidersHorizontal className="h-3.5 w-3.5 text-green-400" />}
            defaultPosition={{ x: 400, y: 60 }}
            defaultSize={{ width: 340, height: 500 }}
            onClose={() => toggleFloating('config')}
          >
            <ConfigPanel />
          </FloatingPanel>
        )}
        {floatingPanels.questions && (
          <FloatingPanel
            id="questions"
            title="题目"
            icon={<Hash className="h-3.5 w-3.5 text-purple-400" />}
            defaultPosition={{ x: 760, y: 60 }}
            defaultSize={{ width: 300, height: 400 }}
            onClose={() => toggleFloating('questions')}
          >
            <QuestionsPanel />
          </FloatingPanel>
        )}
      </div>

      <StatusBar />

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">帮助</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>左右面板可调整大小和开关</p>
              <p>点击顶部按钮打开浮动面板</p>
              <p>浮动面板可拖拽、调整大小和关闭</p>
              <p>画布支持缩放（Ctrl+滚轮）和平移（Alt+拖拽）</p>
              <p>所有设置自动保存</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GlobalActions() {
  const { fileId, isGenerating, isPreviewing, isAgentWorking, error, svgContent, previewSvg, robotConnected, isRobotSending } = useGenerateStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleGenerate = async () => {
    if (!fileId || isGenerating || isPreviewing) return
    const config = useConfigStore.getState().getConfig()
    if (!config.llmApiKey) {
      useGenerateStore.getState().clearError()
      useGenerateStore.setState({ error: '请先在左侧「配置」面板中填写 LLM API Key，才能使用 AI 分析功能' })
      return
    }
    try {
      await useGenerateStore.getState().startPreview({ fileId, config })
      await useGenerateStore.getState().startGenerate({
        fileId,
        format: (config.outputFormat as string) || 'kuixiang',
        seed: (config.seed as number | null) ?? null,
        config,
      })
    } catch {}
  }

  const handleExport = async () => {
    if (!fileId || isExporting) return
    setIsExporting(true)
    try {
      const result = await apiClient.download(fileId)
      if (result.success && result.data) {
        const data = result.data as any
        if (data.downloadUrl) {
          const a = document.createElement('a')
          a.href = data.downloadUrl
          a.download = `output-${fileId}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else if (data.fileData) {
          const byteChars = atob(data.fileData)
          const byteNums = new Array(byteChars.length)
          for (let i = 0; i < byteChars.length; i++) {
            byteNums[i] = byteChars.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNums)
          const blob = new Blob([byteArray])
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.fileName || `output-${fileId}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }
    } catch {
    } finally {
      setIsExporting(false)
    }
  }

  const handleDemo = async () => {
    if (isGenerating) return
    await useGenerateStore.getState().startDemo()
  }

  const isWorking = isGenerating || isPreviewing || isAgentWorking

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDemo}
        disabled={isWorking}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
          !isWorking
            ? 'bg-purple-600 text-white hover:bg-purple-500'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">演示</span>
      </button>
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !fileId}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
          fileId && !isGenerating
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        )}
      >
        {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isGenerating ? '生成中...' : '生成'}</span>
      </button>
      <button
        onClick={handleExport}
        disabled={isExporting || !(svgContent || previewSvg) || !fileId}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
          (svgContent || previewSvg) && !isExporting && fileId
            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        )}
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isExporting ? '导出中...' : '导出'}</span>
      </button>
      {(svgContent || previewSvg) && robotConnected && (
        <button
          onClick={() => useGenerateStore.getState().sendToRobot({ fileId: fileId || '' })}
          disabled={isRobotSending || !fileId}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            fileId && robotConnected && !isRobotSending
              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
        >
          {isRobotSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isRobotSending ? '发送中...' : '发送'}</span>
        </button>
      )}
    </div>
  )
}

function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<'upload' | 'config' | 'preview'>('upload')

  const tabs = [
    { id: 'upload' as const, icon: Upload, label: '上传', color: 'text-blue-400' },
    { id: 'config' as const, icon: SlidersHorizontal, label: '配置', color: 'text-green-400' },
    { id: 'preview' as const, icon: Eye, label: '预览', color: 'text-purple-400' },
  ]

  return (
    <>
      <div className="flex border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'text-zinc-200 border-blue-500 bg-zinc-800/50'
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/30'
            )}
          >
            <tab.icon className={cn('h-3.5 w-3.5', activeTab === tab.id && tab.color)} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'upload' && <UploadPanel />}
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'preview' && <PreviewPanel />}
      </div>
    </>
  )
}

function RightSidebar() {
  return (
    <>
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          状态
        </h3>
      </div>
      <div className="flex-1 overflow-auto">
        <StatusPanel />
      </div>
    </>
  )
}

function UploadPanel() {
  const { fileId, isUploading, error } = useGenerateStore()
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const paperTemplate = useConfigStore((s) => s.paperTemplate)

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      useGenerateStore.setState({ error: '仅支持 .docx 格式文件' })
      return
    }
    setUploadedName(file.name)
    await useGenerateStore.getState().uploadFile(file)
  }

  return (
    <div className="p-4 space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-all hover:scale-[1.02]',
          fileId
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
        )}
      >
        <input ref={inputRef} type="file" accept=".docx" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" />
        {isUploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        ) : fileId ? (
          <>
            <FileText className="h-10 w-10 text-green-400" />
            <span className="text-sm text-zinc-300 text-center truncate w-full font-medium">{uploadedName || '文档已加载'}</span>
            <span className="text-[10px] text-green-500/70">点击更换</span>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-zinc-600" />
            <span className="text-xs text-zinc-500">点击上传 .docx 文件</span>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button
            onClick={() => useGenerateStore.getState().clearError()}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {fileId && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-400">文档已加载</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">纸张模板</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'blank', label: '空白', icon: FileText },
            { id: 'lined', label: '横线', icon: Ruler },
            { id: 'grid', label: '网格', icon: LayoutTemplate },
            { id: 'homework', label: '作业', icon: Type },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => useConfigStore.getState().setPaperTemplate(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
                paperTemplate === t.id
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-zinc-800 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfigPanel() {
  const config = useConfigStore()
  const [expandedSections, setExpandedSections] = useState<string[]>(['paper', 'font'])

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const SliderField = ({ label, value, min, max, step, onChange, unit = '' }: {
    label: string
    value: number
    min: number
    max: number
    step: number
    onChange: (v: number) => void
    unit?: string
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-zinc-500">{label}</label>
        <span className="text-[10px] text-zinc-400 font-mono">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-14 rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[10px] text-white focus:border-blue-500 focus:outline-none text-right"
        />
      </div>
    </div>
  )

  const sections = [
    {
      id: 'paper',
      label: '纸张与边距',
      icon: Ruler,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <SliderField label="宽度" value={config.paperWidth} min={100} max={500} step={1} onChange={config.setPaperWidth} unit="mm" />
            <SliderField label="高度" value={config.paperHeight} min={100} max={500} step={1} onChange={config.setPaperHeight} unit="mm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SliderField label="上边距" value={config.marginTop} min={0} max={50} step={1} onChange={config.setMarginTop} unit="mm" />
            <SliderField label="下边距" value={config.marginBottom} min={0} max={50} step={1} onChange={config.setMarginBottom} unit="mm" />
            <SliderField label="左边距" value={config.marginLeft} min={0} max={50} step={1} onChange={config.setMarginLeft} unit="mm" />
            <SliderField label="右边距" value={config.marginRight} min={0} max={50} step={1} onChange={config.setMarginRight} unit="mm" />
          </div>
        </div>
      ),
    },
    {
      id: 'font',
      label: '字体排版',
      icon: Type,
      content: (
        <div className="space-y-3">
          <SliderField label="标题字号" value={config.fontSizeTitle} min={2} max={10} step={0.1} onChange={config.setFontSizeTitle} unit="mm" />
          <SliderField label="正文字号" value={config.fontSizeBody} min={2} max={8} step={0.1} onChange={config.setFontSizeBody} unit="mm" />
          <SliderField label="行距" value={config.lineSpacing} min={3} max={12} step={0.1} onChange={config.setLineSpacing} unit="mm" />
          <SliderField label="字距" value={config.charSpacing} min={0.5} max={3} step={0.1} onChange={config.setCharSpacing} unit="mm" />
          <SliderField label="倾斜" value={config.slant} min={-15} max={15} step={1} onChange={config.setSlant} unit="deg" />
        </div>
      ),
    },
    {
      id: 'handdrawn',
      label: '手写效果',
      icon: PenTool,
      content: (
        <div className="space-y-3">
          <SliderField label="抖动幅度" value={config.handDrawnAmplitude} min={0} max={2} step={0.05} onChange={config.setHandDrawnAmplitude} />
          <SliderField label="转角夸张" value={config.handDrawnCornerExaggeration} min={0} max={5} step={0.1} onChange={config.setHandDrawnCornerExaggeration} />
          <SliderField label="基线抖动" value={config.baselineWobble} min={0} max={2} step={0.1} onChange={config.setBaselineWobble} unit="mm" />
        </div>
      ),
    },
    {
      id: 'robot',
      label: '机器人设置',
      icon: Bot,
      content: (
        <div className="space-y-3">
          <SliderField label="抬笔高度" value={config.penUpHeight} min={0} max={20} step={1} onChange={config.setPenUpHeight} unit="mm" />
          <SliderField label="落笔高度" value={config.penDownHeight} min={-2} max={5} step={0.5} onChange={config.setPenDownHeight} unit="mm" />
          <SliderField label="移动速度" value={config.travelSpeed} min={10} max={200} step={5} onChange={config.setTravelSpeed} unit="mm/s" />
          <SliderField label="绘制速度" value={config.drawSpeed} min={5} max={100} step={5} onChange={config.setDrawSpeed} unit="mm/s" />
        </div>
      ),
    },
    {
      id: 'llm',
      label: 'AI 模型',
      icon: BrainCircuit,
      content: (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">API 地址</label>
            <input
              type="text"
              value={config.llmBaseUrl}
              onChange={(e) => config.setLlmBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">API 密钥</label>
            <input
              type="password"
              value={config.llmApiKey}
              onChange={(e) => config.setLlmApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">模型</label>
            <input
              type="text"
              value={config.llmModel}
              onChange={(e) => config.setLlmModel(e.target.value)}
              placeholder="deepseek-chat"
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">输出格式</label>
            <select
              value={config.outputFormat}
              onChange={(e) => config.setField('outputFormat', e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="kuixiang">Kuixiang</option>
              <option value="svg">SVG</option>
              <option value="gcode">GCode</option>
            </select>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="p-3 space-y-1.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">设置</span>
        <button
          onClick={() => config.resetToDefaults()}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Undo2 className="h-3 w-3" />
          重置
        </button>
      </div>
      {sections.map((section) => (
        <div key={section.id} className="rounded-lg border border-zinc-800 overflow-hidden">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 transition-colors"
          >
            <section.icon className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-300 flex-1 text-left">{section.label}</span>
            {expandedSections.includes(section.id) ? (
              <ChevronUp className="h-3 w-3 text-zinc-500" />
            ) : (
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            )}
          </button>
          {expandedSections.includes(section.id) && (
            <div className="px-3 pb-3 border-t border-zinc-800/50 pt-2.5">{section.content}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function PreviewPanel() {
  const { fileId, isPreviewing, isAgentWorking, isGenerating, agentProgress, error, svgContent, previewSvg, selfCheckResult } = useGenerateStore()
  const [adjustScale, setAdjustScale] = useState(1.0)
  const [adjustLineSpacing, setAdjustLineSpacing] = useState(0)
  const [adjustFontSize, setAdjustFontSize] = useState(0)
  const hasContent = !!(svgContent || previewSvg)

  const handlePreview = async () => {
    if (!fileId || isPreviewing) return
    const config = useConfigStore.getState().getConfig()
    if (!config.llmApiKey) {
      useGenerateStore.getState().clearError()
      useGenerateStore.setState({ error: '请先在左侧「配置」面板中填写 LLM API Key，才能使用 AI 分析功能' })
      return
    }
    await useGenerateStore.getState().startPreview({
      fileId,
      config,
    })
  }

  const handleExport = async () => {
    if (!fileId) return
    const result = await apiClient.download(fileId)
    if (result.success && result.data) {
      const data = result.data as any
      if (data.downloadUrl) {
        const a = document.createElement('a')
        a.href = data.downloadUrl
        a.download = `output-${fileId}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else if (data.fileData) {
        const byteChars = atob(data.fileData)
        const byteNums = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNums)
        const blob = new Blob([byteArray])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.fileName || `output-${fileId}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }
  }

  return (
    <div className="p-4 space-y-3">
      <button
        onClick={handlePreview}
        disabled={isPreviewing || !fileId}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors',
          fileId && !isPreviewing
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        )}
      >
        {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {isPreviewing ? '正在生成预览...' : '生成预览'}
      </button>

      <button
        onClick={handleExport}
        disabled={!fileId}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-colors',
          fileId
            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        )}
      >
        <Download className="h-3.5 w-3.5" />
        导出命令
      </button>

      {hasContent && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 space-y-3">
          <h4 className="text-[10px] font-semibold text-zinc-500 uppercase">布局调整</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">缩放</span>
              <span className="text-[10px] text-blue-400">{adjustScale.toFixed(1)}x</span>
            </div>
            <input type="range" min="0.5" max="2.0" step="0.1" value={adjustScale}
              onChange={(e) => setAdjustScale(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">行间距调整</span>
              <span className="text-[10px] text-blue-400">{adjustLineSpacing > 0 ? '+' : ''}{adjustLineSpacing.toFixed(1)}mm</span>
            </div>
            <input type="range" min="-3" max="5" step="0.5" value={adjustLineSpacing}
              onChange={(e) => setAdjustLineSpacing(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">字号调整</span>
              <span className="text-[10px] text-blue-400">{adjustFontSize > 0 ? '+' : ''}{adjustFontSize.toFixed(1)}mm</span>
            </div>
            <input type="range" min="-2" max="3" step="0.5" value={adjustFontSize}
              onChange={(e) => setAdjustFontSize(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <button
            onClick={() => {
              const adjustments: Record<string, unknown> = {}
              if (adjustScale !== 1.0) adjustments.scale = adjustScale
              if (adjustLineSpacing !== 0) adjustments.lineSpacing = useConfigStore.getState().lineSpacing + adjustLineSpacing
              if (adjustFontSize !== 0) {
                adjustments.fontSizeBody = useConfigStore.getState().fontSizeBody + adjustFontSize
                adjustments.fontSizeTitle = useConfigStore.getState().fontSizeTitle + adjustFontSize
              }
              if (Object.keys(adjustments).length > 0) {
                useGenerateStore.getState().adjustLayout(adjustments)
              }
            }}
            disabled={isGenerating || (adjustScale === 1.0 && adjustLineSpacing === 0 && adjustFontSize === 0)}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-colors',
              !isGenerating && (adjustScale !== 1.0 || adjustLineSpacing !== 0 || adjustFontSize !== 0)
                ? 'bg-orange-600 text-white hover:bg-orange-500'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
            {isGenerating ? '调整中...' : '应用调整'}
          </button>
        </div>
      )}

      {hasContent && (
        <button
          onClick={() => useGenerateStore.getState().runSelfCheck()}
          disabled={isAgentWorking || isGenerating}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors',
            !isAgentWorking && !isGenerating
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          )}
        >
          {isAgentWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
          {isAgentWorking ? 'AI 检查中...' : 'AI 自检优化'}
        </button>
      )}

      {selfCheckResult && (
        <div className={cn(
          'rounded-lg border px-3 py-2 space-y-1',
          (selfCheckResult as any).passed ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'
        )}>
          <p className={cn('text-xs font-medium', (selfCheckResult as any).passed ? 'text-green-400' : 'text-amber-400')}>
            {(selfCheckResult as any).passed ? '✓ 检查通过' : '⚠ 发现问题'}
          </p>
          {(selfCheckResult as any).summary && (
            <p className="text-[10px] text-zinc-400">{(selfCheckResult as any).summary}</p>
          )}
          {((selfCheckResult as any).issues || []).length > 0 && (
            <ul className="text-[10px] text-zinc-500 space-y-0.5">
              {((selfCheckResult as any).issues || []).map((issue: string, i: number) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isAgentWorking && agentProgress.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 space-y-2">
          <h4 className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
            AI 代理进度
          </h4>
          <div className="max-h-32 overflow-auto space-y-1">
            {agentProgress.slice(-8).map((evt, i) => (
              <div key={i} className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                <span className="text-zinc-600 font-mono">{evt.stage}</span>
                <span className="flex-1 truncate">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 space-y-2">
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase">快捷操作</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePreview}
            disabled={!fileId || isPreviewing}
            className={cn(
              'rounded px-2 py-1.5 text-[10px] transition-colors',
              fileId && !isPreviewing
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            单题预览
          </button>
          <button
            onClick={async () => {
              if (!fileId || isPreviewing) return
              const config = useConfigStore.getState().getConfig()
              await useGenerateStore.getState().startPreview({ fileId, config })
            }}
            disabled={!fileId || isPreviewing}
            className={cn(
              'rounded px-2 py-1.5 text-[10px] transition-colors',
              fileId && !isPreviewing
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            整卷预览
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionsPanel() {
  const { questions, fileId } = useGenerateStore()

  if (!fileId) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-zinc-500">请先上传文档</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-zinc-500">未找到题目</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1.5">
      <div className="text-[10px] text-zinc-500 mb-2">{questions.length} 道题目</div>
      {questions.map((q, i) => (
        <button
          key={i}
          className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-700 text-[10px] font-bold text-zinc-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
              {q.number}
            </span>
            <span className="text-xs text-zinc-300 flex-1 truncate">{q.type}</span>
          </div>
          {q.requirements && q.requirements.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {q.requirements.slice(0, 2).map((req, j) => (
                <span key={j} className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {req}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function CanvasArea() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { svgContent, previewSvg, isGenerating, isPreviewing, isAgentWorking, agentProgress, error } = useGenerateStore()

  const displaySvg = svgContent || previewSvg
  const isWorking = isGenerating || isPreviewing || isAgentWorking

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(z => Math.max(0.2, Math.min(5, z + delta)))
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
      e.preventDefault()
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y),
      })
    }
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0 flex flex-col',
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="h-9 border-b border-zinc-800 bg-zinc-900 flex items-center px-3 gap-1 z-10">
        <button
          onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-zinc-500 w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(5, z + 0.1))}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          title="Reset View"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-700 mx-1" />

        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
          <MousePointer2 className="h-3 w-3" />
          Alt+拖拽 平移
        </span>
        <span className="text-[10px] text-zinc-600 flex items-center gap-1 ml-2">
          <ZoomIn className="h-3 w-3" />
          Ctrl+滚轮 缩放
        </span>

        <div className="flex-1" />

        {isWorking && (
          <span className="text-[10px] text-blue-400 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {isGenerating ? '生成中' : isPreviewing ? '预览中' : 'AI代理工作中'}
            {agentProgress.length > 0 && ` - ${agentProgress[agentProgress.length - 1].message}`}
          </span>
        )}

        <span className="text-[10px] text-zinc-600 ml-2">
          X: {Math.round(pan.x)} Y: {Math.round(pan.y)}
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #fff 1px, transparent 1px),
              linear-gradient(to bottom, #fff 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            transform: `translate(${pan.x % 20}px, ${pan.y % 20}px)`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          {displaySvg ? (
            <div
              dangerouslySetInnerHTML={{ __html: displaySvg }}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out',
              }}
            />
          ) : error ? (
            <div className="text-center space-y-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto">
                <AlertCircle className="h-10 w-10 text-red-400" />
              </div>
              <p className="text-sm text-red-400 max-w-md">{error}</p>
              <button
                onClick={() => useGenerateStore.getState().clearError()}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                关闭
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto">
                <ImageIcon className="h-10 w-10 text-zinc-700" />
              </div>
              <p className="text-sm text-zinc-600">上传文档以预览</p>
              <p className="text-xs text-zinc-700">支持 .docx 格式</p>
              <button
                onClick={() => useGenerateStore.getState().startDemo()}
                disabled={isWorking}
                className={cn(
                  'mt-2 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
                  !isWorking
                    ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                试试演示
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPanel() {
  const { fileId, isGenerating, isPreviewing, isAgentWorking, questions, svgContent, previewSvg, strokeCount, estimatedTime, error, agentProgress, robotConnected, robotPort, robotPorts, isRobotConnecting, isRobotSending } = useGenerateStore()

  return (
    <div className="p-3 space-y-3">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button
            onClick={() => useGenerateStore.getState().clearError()}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          文档
        </h4>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-400">
            {fileId ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                已加载 ({questions.length} 道题目)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-zinc-500" />
                未上传
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Status
        </h4>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-400">
            {isGenerating ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                生成中...
              </span>
            ) : isPreviewing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                预览中...
              </span>
            ) : isAgentWorking ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
                AI代理工作中...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                就绪
              </span>
            )}
          </p>
        </div>
      </div>

      {isAgentWorking && agentProgress.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <Bot className="h-3 w-3" />
            AI 代理进度
          </h4>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2 max-h-32 overflow-auto space-y-1">
            {agentProgress.slice(-10).map((evt, i) => (
              <div key={i} className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                <span className="text-zinc-600 font-mono w-16 flex-shrink-0">{evt.stage}</span>
                <span className="flex-1 truncate">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(svgContent || previewSvg) && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <PenTool className="h-3 w-3" />
            输出
          </h4>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">笔画数</span>
              <span className="text-zinc-300 font-mono">{strokeCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">预计时间</span>
              <span className="text-zinc-300 font-mono">{estimatedTime}s</span>
            </div>
            {previewSvg && !svgContent && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">来源</span>
                <span className="text-purple-400 font-mono text-[10px]">预览</span>
              </div>
            )}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <Hash className="h-3 w-3" />
            题目
          </h4>
          <div className="space-y-1 max-h-40 overflow-auto">
            {questions.slice(0, 5).map((q, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-zinc-800/30 px-2 py-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-700 text-[9px] font-bold text-zinc-400">
                  {q.number}
                </span>
                <span className="text-[11px] text-zinc-400 flex-1 truncate">{q.type}</span>
              </div>
            ))}
            {questions.length > 5 && (
              <div className="text-center text-[10px] text-zinc-600 py-1">
                +{questions.length - 5} more...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <Bot className="h-3 w-3" />
          机器人
        </h4>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              {robotConnected ? (
                <Wifi className="h-3 w-3 text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-zinc-500" />
              )}
              {robotConnected ? '已连接' : '未连接'}
            </span>
            {robotPort && (
              <span className="text-[10px] text-zinc-500 font-mono">{robotPort}</span>
            )}
          </div>
          {robotConnected ? (
            <button
              onClick={() => useGenerateStore.getState().disconnectRobot()}
              className="w-full flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
            >
              <WifiOff className="h-3 w-3" />
              断开连接
            </button>
          ) : (
            <button
              onClick={() => useGenerateStore.getState().refreshRobotPorts()}
              className="w-full flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[10px] bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700 transition-colors"
            >
              <RefreshCw className={cn("h-3 w-3", isRobotConnecting && "animate-spin")} />
              扫描串口
            </button>
          )}
          {robotPorts.length > 0 && !robotConnected && (
            <div className="space-y-1 max-h-24 overflow-auto">
              {robotPorts.map((p) => (
                <button
                  key={p.port}
                  onClick={() => useGenerateStore.getState().connectRobot(p.port)}
                  disabled={isRobotConnecting}
                  className="w-full text-left flex items-center gap-2 rounded bg-zinc-800/50 px-2 py-1.5 hover:bg-zinc-700/50 transition-colors group"
                >
                  <Usb className="h-3 w-3 text-zinc-500 group-hover:text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-zinc-300 truncate">{p.port}</div>
                    <div className="text-[9px] text-zinc-600 truncate">{p.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {isRobotConnecting && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在连接...
            </div>
          )}
          {isRobotSending && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在发送指令...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  const { isGenerating, isUploading, isPreviewing, isAgentWorking, error, robotConnected, robotPort } = useGenerateStore()
  const llmModel = useConfigStore((s) => s.llmModel)

  const isActive = isGenerating || isUploading || isPreviewing || isAgentWorking

  return (
    <footer className="h-7 border-t border-zinc-800 bg-zinc-900 flex items-center px-3 gap-4 text-[11px] text-zinc-500 flex-shrink-0 z-40">
      <span className="font-semibold text-zinc-400">AI写字机器人</span>
      <span className="text-zinc-700">|</span>
      <span className={cn(
        'flex items-center gap-1',
        error ? 'text-red-400' : isGenerating ? 'text-blue-400' : isPreviewing ? 'text-purple-400' : isUploading ? 'text-yellow-400' : isAgentWorking ? 'text-yellow-400' : 'text-green-400'
      )}>
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          error ? 'bg-red-400' : isActive ? 'bg-current animate-pulse' : 'bg-green-400'
        )} />
        {error ? '错误' : isGenerating ? '生成中' : isPreviewing ? '预览中' : isUploading ? '上传中' : isAgentWorking ? 'AI代理工作中' : '就绪'}
      </span>
      <span className={cn(
        'flex items-center gap-1',
        robotConnected ? 'text-green-400' : 'text-zinc-600'
      )}>
        {robotConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {robotConnected ? robotPort : '未连接'}
      </span>
      <span className="text-zinc-700">|</span>
      <div className="flex-1" />
      <span>{llmModel || '未配置'}</span>
      <span className="text-zinc-700">|</span>
      <span>v1.0.0</span>
    </footer>
  )
}
