import { useState, useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { apiClient } from '@/lib/api'
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PreviewStep() {
  const { setStep, markStepComplete } = useAppStore()
  const { fileId, setPreviewSvg, setQuestionPlans } = useGenerateStore()
  const config = useConfigStore()
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [svgContent, setSvgContent] = useState('')
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  const handlePreview = useCallback(async () => {
    if (!fileId) {
      setError('请先上传文档')
      return
    }
    
    setIsGenerating(true)
    setError(null)
    setProgress('正在分析文档...')
    
    try {
      const result = await apiClient.previewWithProgress(
        {
          fileId,
          config: {
            paperWidth: config.paperWidth,
            paperHeight: config.paperHeight,
            marginTop: config.marginTop,
            marginBottom: config.marginBottom,
            marginLeft: config.marginLeft,
            marginRight: config.marginRight,
            fontSizeTitle: config.fontSizeTitle,
            fontSizeBody: config.fontSizeBody,
            fontSizeLabel: config.fontSizeLabel,
            lineSpacing: config.lineSpacing,
            questionSpacing: config.questionSpacing,
            charSpacing: config.charSpacing,
            charSpacingVar: config.charSpacingVar,
            baselineWobble: config.baselineWobble,
            slant: config.slant,
            penUpHeight: config.penUpHeight,
            penDownHeight: config.penDownHeight,
            travelSpeed: config.travelSpeed,
            drawSpeed: config.drawSpeed,
            handDrawnAmplitude: config.handDrawnAmplitude,
            handDrawnCornerExaggeration: config.handDrawnCornerExaggeration,
            paperTemplate: config.paperTemplate,
            llmBaseUrl: config.llmBaseUrl,
            llmApiKey: config.llmApiKey,
            llmModel: config.llmModel,
            providerId: config.providerId,
          },
        },
        (event) => {
          setProgress(event.message)
        }
      )
      
      if (result.success && result.data) {
        const data = result.data as any
        setSvgContent(data.previewSvg || '')
        setPreviewSvg(data.previewSvg || '')
        setQuestionPlans(data.questionPlans || [])
        markStepComplete('preview')
      } else {
        setError(result.error || '预览生成失败')
      }
    } catch (err: any) {
      setError(err.message || '生成失败')
    } finally {
      setIsGenerating(false)
      setProgress('')
    }
  }, [fileId, config, setPreviewSvg, setQuestionPlans, markStepComplete])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">预览效果</h2>
        <p className="text-zinc-400">AI分析题目并生成排版方案</p>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handlePreview}
          disabled={isGenerating || !fileId}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : svgContent ? (
            <>
              <RefreshCw className="h-4 w-4" />
              重新生成
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              生成预览
            </>
          )}
        </button>
      </div>

      {/* 进度提示 */}
      {progress && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          <p className="text-sm text-blue-400">{progress}</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 预览区域 */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {svgContent ? (
          <div 
            className="w-full h-[600px] overflow-auto flex items-center justify-center p-8"
            style={{ background: 'repeating-conic-gradient(#18181b 0% 25%, #27272a 0% 50%) 50% / 20px 20px' }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: svgContent }}
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
        ) : (
          <div className="flex h-[400px] items-center justify-center">
            <div className="text-center space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mx-auto">
                <RefreshCw className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">点击"生成预览"查看效果</p>
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('config')}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          上一步
        </button>

        {svgContent && (
          <button
            onClick={() => setStep('review')}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            下一步：审核确认
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
