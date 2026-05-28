import { useState, useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { apiClient } from '@/lib/api'
import { ArrowLeft, Download, Loader2, Check, Edit2, Save, X, FileText, Clock, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnswerItem {
  questionNumber: number
  questionType: string
  questionText: string
  answerContent: string
  isCorrected: boolean
  isEditing: boolean
}

export default function ReviewStep() {
  const { setStep } = useAppStore()
  const { fileId, questionPlans, previewSvg } = useGenerateStore()
  const config = useConfigStore()
  
  const [answers, setAnswers] = useState<AnswerItem[]>(() => {
    return (questionPlans || []).map((plan: any) => ({
      questionNumber: plan.questionNumber || 0,
      questionType: plan.questionType || 'unknown',
      questionText: plan.questionText || '',
      answerContent: plan.answerContent || '',
      isCorrected: false,
      isEditing: false,
    }))
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [outputFormat, setOutputFormat] = useState<'kuixiang' | 'svg' | 'gcode'>('kuixiang')

  const handleEdit = useCallback((questionNumber: number) => {
    setAnswers(prev => prev.map(item =>
      item.questionNumber === questionNumber ? { ...item, isEditing: true } : item
    ))
  }, [])

  const handleSave = useCallback((questionNumber: number, newContent: string) => {
    setAnswers(prev => prev.map(item =>
      item.questionNumber === questionNumber
        ? { ...item, answerContent: newContent, isEditing: false, isCorrected: true }
        : item
    ))
  }, [])

  const handleConfirm = useCallback((questionNumber: number) => {
    setAnswers(prev => prev.map(item =>
      item.questionNumber === questionNumber ? { ...item, isCorrected: true } : item
    ))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!fileId) {
      setError('请先上传文档')
      return
    }
    
    setIsGenerating(true)
    setError(null)
    setSuccess(null)
    
    try {
      const result = await apiClient.generate({
        fileId,
        format: outputFormat,
        seed: null,
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
      })
      
      if (result.success) {
        setSuccess('生成成功！')
      } else {
        setError(result.error || '生成失败')
      }
    } catch (err: any) {
      setError(err.message || '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }, [fileId, outputFormat, config])

  const handleDownload = useCallback(async () => {
    if (!fileId) return
    setIsDownloading(true)
    try {
      const result = await apiClient.download(fileId)
      if (result.success && result.data) {
        const url = (result.data as any).downloadUrl
        if (url) {
          window.open(url, '_blank')
        }
      }
    } catch (err: any) {
      setError(err.message || '下载失败')
    } finally {
      setIsDownloading(false)
    }
  }, [fileId])

  const correctedCount = answers.filter(a => a.isCorrected).length
  const progress = answers.length > 0 ? Math.round((correctedCount / answers.length) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">审核确认</h2>
        <p className="text-zinc-400">检查并确认每道题的答案内容</p>
      </div>

      {/* 进度概览 */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
              <Check className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">审核进度</p>
              <p className="text-xs text-zinc-500">{correctedCount} / {answers.length} 道题已确认</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-blue-400">{progress}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 答案列表 */}
      <div className="space-y-3">
        {answers.map((item) => (
          <AnswerCard
            key={item.questionNumber}
            item={item}
            onEdit={() => handleEdit(item.questionNumber)}
            onSave={(content) => handleSave(item.questionNumber, content)}
            onConfirm={() => handleConfirm(item.questionNumber)}
          />
        ))}
      </div>

      {/* 输出格式选择 */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-300 mb-3">输出格式</p>
        <div className="flex gap-2">
          {(['kuixiang', 'svg', 'gcode'] as const).map((format) => (
            <button
              key={format}
              onClick={() => setOutputFormat(format)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                outputFormat === format
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              )}
            >
              {format === 'kuixiang' && '奎享格式'}
              {format === 'svg' && 'SVG'}
              {format === 'gcode' && 'GCode'}
            </button>
          ))}
        </div>
      </div>

      {/* 提示信息 */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setStep('preview')}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          上一步
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-60"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            下载文件
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                生成指令
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// 答案卡片组件
function AnswerCard({
  item,
  onEdit,
  onSave,
  onConfirm,
}: {
  item: AnswerItem
  onEdit: () => void
  onSave: (content: string) => void
  onConfirm: () => void
}) {
  const [editContent, setEditContent] = useState(item.answerContent)

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        item.isCorrected
          ? 'border-green-800/50 bg-green-900/10'
          : 'border-zinc-800 bg-zinc-900/50'
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold',
              item.isCorrected
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {item.isCorrected ? <Check className="h-3.5 w-3.5" /> : item.questionNumber}
          </div>
          <div>
            <span className="text-xs text-zinc-500">{item.questionType}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!item.isEditing ? (
            <>
              <button
                onClick={onEdit}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                title="编辑"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              {!item.isCorrected && (
                <button
                  onClick={onConfirm}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-green-900/50 hover:text-green-400 transition-colors"
                  title="确认正确"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => onSave(editContent)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-blue-900/50 hover:text-blue-400 transition-colors"
                title="保存"
              >
                <Save className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onEdit}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                title="取消"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 题目 */}
      <div className="px-4 pb-2">
        <p className="text-xs text-zinc-500 line-clamp-2">{item.questionText}</p>
      </div>

      {/* 答案内容 */}
      <div className="px-4 pb-4">
        {item.isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            rows={4}
          />
        ) : (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{item.answerContent}</p>
          </div>
        )}
      </div>
    </div>
  )
}
