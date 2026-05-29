import { useState, useRef, useCallback, useEffect } from 'react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { cn } from '@/lib/utils'
import {
  PenTool, Upload, Settings, Eye, Play, Download,
  Image as ImageIcon, X, ZoomIn, ZoomOut, Maximize2,
  Loader2, FileText, ChevronDown, ChevronUp,
  HelpCircle, Github, PanelLeft, PanelRight,
  GripVertical, Type, Ruler, Bot, BrainCircuit,
  LayoutTemplate, SlidersHorizontal, Undo2,
  CheckCircle2, AlertCircle, Clock, Hash, MousePointer2,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

// ============ Floating Panel System ============

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

// ============ Dockable Panel ============

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

// ============ Main App ============

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
      {/* Header */}
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

        {/* Floating panel toggles */}
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

      {/* Main workspace */}
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

        {/* Floating panels */}
        {floatingPanels.upload && (
          <FloatingPanel
            id="upload"
            title="Document Upload"
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
            title="Configuration"
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
            title="Questions"
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

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Help</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>Left/right panels can be resized and toggled</p>
              <p>Click top buttons to open floating panels</p>
              <p>Floating panels can be dragged, resized, and closed</p>
              <p>Canvas supports zoom (Ctrl+wheel) and pan (Alt+drag)</p>
              <p>All settings are saved automatically</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Global Actions ============

function GlobalActions() {
  const { fileId, isGenerating } = useGenerateStore()
  const [isGen, setIsGen] = useState(false)

  const handleGenerate = async () => {
    if (!fileId || isGen) return
    setIsGen(true)
    setTimeout(() => setIsGen(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleGenerate}
        disabled={isGen || !fileId}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
          fileId && !isGen
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        )}
      >
        {isGen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isGen ? 'Generating...' : 'Generate'}</span>
      </button>
      <button className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </button>
    </div>
  )
}

// ============ Left Sidebar ============

function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<'upload' | 'config' | 'preview'>('upload')

  const tabs = [
    { id: 'upload' as const, icon: Upload, label: 'Upload', color: 'text-blue-400' },
    { id: 'config' as const, icon: SlidersHorizontal, label: 'Config', color: 'text-green-400' },
    { id: 'preview' as const, icon: Eye, label: 'Preview', color: 'text-purple-400' },
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

// ============ Right Sidebar ============

function RightSidebar() {
  return (
    <>
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Status
        </h3>
      </div>
      <div className="flex-1 overflow-auto">
        <StatusPanel />
      </div>
    </>
  )
}

// ============ Upload Panel ============

function UploadPanel() {
  const { setUploading, setUploadResult, setQuestions, fileId } = useGenerateStore()
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      setError('Only .docx files supported')
      return
    }
    setError(null)
    setIsUploading(true)
    setUploading(true)
    setUploadedName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await apiFetch('/api/homework/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setUploadResult(data.fileId, data.filePath ?? '')
        setQuestions(data.questions ?? [])
      } else {
        setError(data.error || 'Upload failed')
        setUploadedName(null)
      }
    } catch {
      setError('Network error')
      setUploadedName(null)
    } finally {
      setIsUploading(false)
      setUploading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-all hover:scale-[1.02]',
          uploadedName
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
        )}
      >
        <input ref={inputRef} type="file" accept=".docx" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} className="hidden" />
        {isUploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        ) : uploadedName ? (
          <>
            <FileText className="h-10 w-10 text-green-400" />
            <span className="text-sm text-zinc-300 text-center truncate w-full font-medium">{uploadedName}</span>
            <span className="text-[10px] text-green-500/70">Click to change</span>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-zinc-600" />
            <span className="text-xs text-zinc-500">Click or drag .docx file</span>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {fileId && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-400">Document loaded</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Paper Templates</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'blank', label: 'Blank', icon: FileText },
            { id: 'lined', label: 'Lined', icon: Ruler },
            { id: 'grid', label: 'Grid', icon: LayoutTemplate },
            { id: 'homework', label: 'Homework', icon: Type },
          ].map((t) => (
            <button
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
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

// ============ Config Panel with Sliders ============

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
      label: 'Paper & Margins',
      icon: Ruler,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <SliderField label="Width" value={config.paperWidth} min={100} max={500} step={1} onChange={config.setPaperWidth} unit="mm" />
            <SliderField label="Height" value={config.paperHeight} min={100} max={500} step={1} onChange={config.setPaperHeight} unit="mm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SliderField label="Top Margin" value={config.marginTop} min={0} max={50} step={1} onChange={config.setMarginTop} unit="mm" />
            <SliderField label="Bottom Margin" value={config.marginBottom} min={0} max={50} step={1} onChange={config.setMarginBottom} unit="mm" />
            <SliderField label="Left Margin" value={config.marginLeft} min={0} max={50} step={1} onChange={config.setMarginLeft} unit="mm" />
            <SliderField label="Right Margin" value={config.marginRight} min={0} max={50} step={1} onChange={config.setMarginRight} unit="mm" />
          </div>
        </div>
      ),
    },
    {
      id: 'font',
      label: 'Typography',
      icon: Type,
      content: (
        <div className="space-y-3">
          <SliderField label="Title Size" value={config.fontSizeTitle} min={2} max={10} step={0.1} onChange={config.setFontSizeTitle} unit="mm" />
          <SliderField label="Body Size" value={config.fontSizeBody} min={2} max={8} step={0.1} onChange={config.setFontSizeBody} unit="mm" />
          <SliderField label="Line Spacing" value={config.lineSpacing} min={3} max={12} step={0.1} onChange={config.setLineSpacing} unit="mm" />
          <SliderField label="Char Spacing" value={config.charSpacing} min={0.5} max={3} step={0.1} onChange={config.setCharSpacing} unit="mm" />
          <SliderField label="Slant" value={config.slant} min={-15} max={15} step={1} onChange={config.setSlant} unit="deg" />
        </div>
      ),
    },
    {
      id: 'handdrawn',
      label: 'Handwriting Effect',
      icon: PenTool,
      content: (
        <div className="space-y-3">
          <SliderField label="Wobble" value={config.handDrawnAmplitude} min={0} max={2} step={0.05} onChange={config.setHandDrawnAmplitude} />
          <SliderField label="Corner Exaggeration" value={config.handDrawnCornerExaggeration} min={0} max={5} step={0.1} onChange={config.setHandDrawnCornerExaggeration} />
          <SliderField label="Baseline Wobble" value={config.baselineWobble} min={0} max={2} step={0.1} onChange={config.setBaselineWobble} unit="mm" />
        </div>
      ),
    },
    {
      id: 'robot',
      label: 'Robot Settings',
      icon: Bot,
      content: (
        <div className="space-y-3">
          <SliderField label="Pen Up Height" value={config.penUpHeight} min={0} max={20} step={1} onChange={config.setPenUpHeight} unit="mm" />
          <SliderField label="Pen Down Height" value={config.penDownHeight} min={-2} max={5} step={0.5} onChange={config.setPenDownHeight} unit="mm" />
          <SliderField label="Travel Speed" value={config.travelSpeed} min={10} max={200} step={5} onChange={config.setTravelSpeed} unit="mm/s" />
          <SliderField label="Draw Speed" value={config.drawSpeed} min={5} max={100} step={5} onChange={config.setDrawSpeed} unit="mm/s" />
        </div>
      ),
    },
    {
      id: 'llm',
      label: 'AI Model',
      icon: BrainCircuit,
      content: (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">API URL</label>
            <input
              type="text"
              value={config.llmBaseUrl}
              onChange={(e) => config.setLlmBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">API Key</label>
            <input
              type="password"
              value={config.llmApiKey}
              onChange={(e) => config.setLlmApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Model</label>
            <input
              type="text"
              value={config.llmModel}
              onChange={(e) => config.setLlmModel(e.target.value)}
              placeholder="deepseek-chat"
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Output Format</label>
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
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Settings</span>
        <button
          onClick={() => config.resetToDefaults()}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Undo2 className="h-3 w-3" />
          Reset
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

// ============ Preview Panel ============

function PreviewPanel() {
  const { fileId } = useGenerateStore()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!fileId) return
    setIsGenerating(true)
    setTimeout(() => setIsGenerating(false), 2000)
  }

  return (
    <div className="p-4 space-y-3">
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !fileId}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors',
          fileId && !isGenerating
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        )}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {isGenerating ? 'Generating...' : 'Generate Preview'}
      </button>

      <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-800 py-2.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
        <Download className="h-3.5 w-3.5" />
        Export Commands
      </button>

      <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 space-y-2">
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
            Single Question
          </button>
          <button className="rounded bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
            Full Paper
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ Questions Panel ============

function QuestionsPanel() {
  const { questions, fileId } = useGenerateStore()

  if (!fileId) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-zinc-500">Upload a document first</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-zinc-500">No questions found</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1.5">
      <div className="text-[10px] text-zinc-500 mb-2">{questions.length} questions</div>
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

// ============ Canvas Area with Pan + Zoom ============

function CanvasArea() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { svgContent } = useGenerateStore()

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
      {/* Canvas toolbar */}
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
          Alt+Drag to pan
        </span>
        <span className="text-[10px] text-zinc-600 flex items-center gap-1 ml-2">
          <ZoomIn className="h-3 w-3" />
          Ctrl+Wheel to zoom
        </span>

        <div className="flex-1" />

        <span className="text-[10px] text-zinc-600">
          X: {Math.round(pan.x)} Y: {Math.round(pan.y)}
        </span>
      </div>

      {/* Canvas content */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        {/* Grid background */}
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
          {svgContent ? (
            <div
              dangerouslySetInnerHTML={{ __html: svgContent }}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out',
              }}
            />
          ) : (
            <div className="text-center space-y-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto">
                <ImageIcon className="h-10 w-10 text-zinc-700" />
              </div>
              <p className="text-sm text-zinc-600">Upload document to preview</p>
              <p className="text-xs text-zinc-700">Supports .docx format</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Status Panel ============

function StatusPanel() {
  const { fileId, isGenerating, questions, svgContent, strokeCount, estimatedTime } = useGenerateStore()

  return (
    <div className="p-3 space-y-3">
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Document
        </h4>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-400">
            {fileId ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                Loaded ({questions.length} questions)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-zinc-500" />
                Not uploaded
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
                Generating...
              </span>
            ) : (
              'Ready'
            )}
          </p>
        </div>
      </div>

      {svgContent && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <PenTool className="h-3 w-3" />
            Output
          </h4>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Strokes</span>
              <span className="text-zinc-300 font-mono">{strokeCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Est. Time</span>
              <span className="text-zinc-300 font-mono">{estimatedTime}s</span>
            </div>
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <Hash className="h-3 w-3" />
            Questions
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
    </div>
  )
}

// ============ Status Bar ============

function StatusBar() {
  const { isGenerating, isUploading } = useGenerateStore()

  return (
    <footer className="h-7 border-t border-zinc-800 bg-zinc-900 flex items-center px-3 gap-4 text-[11px] text-zinc-500 flex-shrink-0 z-40">
      <span className="font-semibold text-zinc-400">AI Writing Robot</span>
      <span className="text-zinc-700">|</span>
      <span className={cn(
        'flex items-center gap-1',
        isGenerating ? 'text-blue-400' : isUploading ? 'text-yellow-400' : 'text-green-400'
      )}>
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          isGenerating ? 'bg-blue-400 animate-pulse' : isUploading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
        )} />
        {isGenerating ? 'Generating' : isUploading ? 'Uploading' : 'Ready'}
      </span>
      <div className="flex-1" />
      <span>DeepSeek V3</span>
      <span className="text-zinc-700">|</span>
      <span>v1.0.0</span>
    </footer>
  )
}
