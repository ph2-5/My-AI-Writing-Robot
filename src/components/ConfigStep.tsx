import { useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { ArrowLeft, ArrowRight, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConfigSection = 'paper' | 'font' | 'robot' | 'handdrawn' | 'llm'

const SECTIONS: { id: ConfigSection; label: string; description: string }[] = [
  { id: 'paper', label: '纸张设置', description: '纸张尺寸、边距、模板' },
  { id: 'font', label: '字体设置', description: '字号、行间距、字间距' },
  { id: 'robot', label: '机器人设置', description: '抬笔高度、移动速度' },
  { id: 'handdrawn', label: '手绘效果', description: '抖动幅度、风格化' },
  { id: 'llm', label: 'AI模型', description: 'API配置、模型选择' },
]

export default function ConfigStep() {
  const { setStep, markStepComplete } = useAppStore()
  const config = useConfigStore()
  const [expandedSection, setExpandedSection] = useState<ConfigSection>('paper')
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = () => {
    setIsApplying(true)
    setTimeout(() => {
      markStepComplete('config')
      setStep('preview')
      setIsApplying(false)
    }, 500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">配置参数</h2>
        <p className="text-zinc-400">根据您的需求调整生成参数</p>
      </div>

      {/* 配置面板 */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const isExpanded = expandedSection === section.id
          
          return (
            <div
              key={section.id}
              className={cn(
                'rounded-xl border transition-all duration-200',
                isExpanded
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              )}
            >
              {/* 头部 */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null as any : section.id)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                      isExpanded ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'
                    )}
                  >
                    {SECTIONS.indexOf(section) + 1}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-200">{section.label}</p>
                    <p className="text-xs text-zinc-500">{section.description}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                )}
              </button>

              {/* 内容 */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-zinc-800/50 pt-4">
                  {section.id === 'paper' && <PaperConfig />}
                  {section.id === 'font' && <FontConfig />}
                  {section.id === 'robot' && <RobotConfig />}
                  {section.id === 'handdrawn' && <HandDrawnConfig />}
                  {section.id === 'llm' && <LLMConfig />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setStep('upload')}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          上一步
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={config.resetToDefaults}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            重置默认
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            {isApplying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                应用中...
              </>
            ) : (
              <>
                应用配置
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// 纸张配置
function PaperConfig() {
  const config = useConfigStore()
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">纸张宽度 (mm)</label>
        <input
          type="number"
          value={config.paperWidth}
          onChange={(e) => config.setPaperWidth(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">纸张高度 (mm)</label>
        <input
          type="number"
          value={config.paperHeight}
          onChange={(e) => config.setPaperHeight(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">上边距 (mm)</label>
        <input
          type="number"
          value={config.marginTop}
          onChange={(e) => config.setMarginTop(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">下边距 (mm)</label>
        <input
          type="number"
          value={config.marginBottom}
          onChange={(e) => config.setMarginBottom(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">左边距 (mm)</label>
        <input
          type="number"
          value={config.marginLeft}
          onChange={(e) => config.setMarginLeft(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">右边距 (mm)</label>
        <input
          type="number"
          value={config.marginRight}
          onChange={(e) => config.setMarginRight(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

// 字体配置
function FontConfig() {
  const config = useConfigStore()
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">标题字号 (mm)</label>
        <input
          type="number"
          step="0.1"
          value={config.fontSizeTitle}
          onChange={(e) => config.setFontSizeTitle(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">正文字号 (mm)</label>
        <input
          type="number"
          step="0.1"
          value={config.fontSizeBody}
          onChange={(e) => config.setFontSizeBody(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">行间距 (mm)</label>
        <input
          type="number"
          step="0.1"
          value={config.lineSpacing}
          onChange={(e) => config.setLineSpacing(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">字间距 (mm)</label>
        <input
          type="number"
          step="0.1"
          value={config.charSpacing}
          onChange={(e) => config.setCharSpacing(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

// 机器人配置
function RobotConfig() {
  const config = useConfigStore()
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">抬笔高度 (mm)</label>
        <input
          type="number"
          value={config.penUpHeight}
          onChange={(e) => config.setPenUpHeight(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">落笔高度 (mm)</label>
        <input
          type="number"
          value={config.penDownHeight}
          onChange={(e) => config.setPenDownHeight(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">移动速度 (mm/s)</label>
        <input
          type="number"
          value={config.travelSpeed}
          onChange={(e) => config.setTravelSpeed(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">书写速度 (mm/s)</label>
        <input
          type="number"
          value={config.drawSpeed}
          onChange={(e) => config.setDrawSpeed(Number(e.target.value))}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

// 手绘效果配置
function HandDrawnConfig() {
  const config = useConfigStore()
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-xs text-zinc-500">抖动幅度</label>
          <span className="text-xs text-blue-400">{config.handDrawnAmplitude.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.handDrawnAmplitude}
          onChange={(e) => config.setHandDrawnAmplitude(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-xs text-zinc-500">拐角夸张</label>
          <span className="text-xs text-blue-400">{config.handDrawnCornerExaggeration.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={config.handDrawnCornerExaggeration}
          onChange={(e) => config.setHandDrawnCornerExaggeration(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>
    </div>
  )
}

// LLM配置
function LLMConfig() {
  const config = useConfigStore()
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">API Base URL</label>
        <input
          type="text"
          value={config.llmBaseUrl}
          onChange={(e) => config.setLlmBaseUrl(e.target.value)}
          placeholder="https://api.deepseek.com/v1"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">API Key</label>
        <input
          type="password"
          value={config.llmApiKey}
          onChange={(e) => config.setLlmApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">模型名称</label>
        <input
          type="text"
          value={config.llmModel}
          onChange={(e) => config.setLlmModel(e.target.value)}
          placeholder="deepseek-chat"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}
