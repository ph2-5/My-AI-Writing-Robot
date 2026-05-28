import { Eye, Loader2, Layers, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const TYPE_LABELS: Record<string, string> = {
  uml_usecase: '用例图',
  uml_class: '类图',
  uml_sequence: '时序图',
  uml_activity: '活动图',
  essay: '文字题',
  unknown: '其他',
}

const TYPE_COLORS: Record<string, string> = {
  uml_usecase: 'bg-amber-500/15 text-amber-400',
  uml_class: 'bg-blue-500/15 text-blue-400',
  uml_sequence: 'bg-purple-500/15 text-purple-400',
  uml_activity: 'bg-green-500/15 text-green-400',
  essay: 'bg-cyan-500/15 text-cyan-400',
  unknown: 'bg-zinc-500/15 text-zinc-400',
}

export default function LayoutPreview() {
  const {
    fileId,
    previewSvg,
    questionPlans,
    previewPageCount,
    isPreviewing,
    startPreview,
    agentProgress,
    isAgentWorking,
  } = useGenerateStore()

  const { getConfig } = useConfigStore()
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())

  const handlePreview = async () => {
    if (!fileId || isPreviewing) return
    await startPreview({ fileId, config: getConfig() })
  }

  const toggleQuestion = (num: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const hasPreview = previewSvg.length > 0

  return (
    <div className="space-y-4">
      <button
        onClick={handlePreview}
        disabled={!fileId || isPreviewing}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          fileId && !isPreviewing
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'cursor-not-allowed bg-zinc-700 text-zinc-500',
        )}
      >
        {isPreviewing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        {hasPreview ? '刷新布局预览' : '预览答案布局'}
      </button>

      {(isAgentWorking || agentProgress.length > 0) && !hasPreview && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <div className={cn(
              'h-2 w-2 rounded-full',
              isAgentWorking ? 'bg-blue-400 animate-pulse' : 'bg-green-400',
            )} />
            <span className="text-xs font-medium text-zinc-400">
              {isAgentWorking ? 'Agent 工作中' : 'Agent 完成'}
            </span>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-zinc-700/50 bg-zinc-800/50 p-2">
            {agentProgress.map((event, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className={cn(
                  'shrink-0 mt-0.5 inline-block h-1.5 w-1.5 rounded-full',
                  event.stage === 'thinking' ? 'bg-yellow-400' :
                  event.stage === 'analyzing' ? 'bg-blue-400' :
                  event.stage === 'validated' ? 'bg-green-400' :
                  event.stage === 'refining' ? 'bg-orange-400' :
                  event.stage === 'adjusting' ? 'bg-orange-400' :
                  event.stage === 'rendering' ? 'bg-purple-400' :
                  'bg-zinc-400',
                )} />
                <span className="text-zinc-400 leading-tight">{event.message}</span>
              </div>
            ))}
            {isAgentWorking && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="shrink-0 inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-zinc-500 italic">思考中...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasPreview && (
        <>
          <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-[10px] text-zinc-500">布局概览</p>
              <p className="text-sm font-semibold text-zinc-200">
                {previewPageCount} 页 · {questionPlans.length} 道题 · {questionPlans.reduce((acc, q) => acc + (q.layoutPlan?.sections?.length || 0), 0)} 个区域
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-1">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium text-zinc-400">题目布局方案</span>
            </div>

            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {questionPlans.map((plan: any) => {
                const isExpanded = expandedQuestions.has(plan.questionNumber)
                const sections = plan.layoutPlan?.sections || []
                
                return (
                  <div
                    key={plan.questionNumber}
                    className="rounded-md border border-zinc-700/50 bg-zinc-800/50 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleQuestion(plan.questionNumber)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-700 text-xs font-bold text-zinc-300">
                        {plan.questionNumber}
                      </span>
                      <span className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        TYPE_COLORS[plan.questionType] || TYPE_COLORS.unknown,
                      )}>
                        {TYPE_LABELS[plan.questionType] ?? plan.questionType}
                      </span>
                      <span className="flex-1 truncate text-xs text-zinc-400">{plan.questionText}</span>
                      <span className="text-xs text-zinc-500">{sections.length}区</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-700/50 px-3 py-2 space-y-2">
                        {plan.answerContent && (
                          <div>
                            <p className="text-[10px] font-medium text-zinc-500 mb-1">AI 答案</p>
                            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">{plan.answerContent}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-[10px] font-medium text-zinc-500 mb-1">布局区域</p>
                          <div className="space-y-1">
                            {sections.map((sec: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={cn(
                                  'inline-block w-2 h-2 rounded-full',
                                  sec.type === 'text' ? 'bg-cyan-400' :
                                  sec.type === 'uml_usecase' ? 'bg-amber-400' :
                                  sec.type === 'uml_class' ? 'bg-blue-400' :
                                  sec.type === 'code' ? 'bg-green-400' :
                                  'bg-zinc-400',
                                )} />
                                <span className="text-zinc-300">
                                  {sec.type === 'text' ? '文字' :
                                   sec.type === 'uml_usecase' ? '用例图' :
                                   sec.type === 'uml_class' ? '类图' :
                                   sec.type === 'code' ? '代码' : sec.type}
                                </span>
                                {sec.content && (
                                  <span className="text-zinc-500 truncate flex-1">{sec.content.substring(0, 30)}</span>
                                )}
                                <span className="text-zinc-600">
                                  {sec.relative_position?.placement || 'flow'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {plan.styleRecommendation && (
                          <div>
                            <p className="text-[10px] font-medium text-zinc-500 mb-1">手写风格建议</p>
                            <p className="text-xs text-zinc-400">
                              变形幅度 {Math.round((plan.styleRecommendation.deformation?.char_spacing_var || 0.15) * 100)}% · 
                              基线波动 {Math.round((plan.styleRecommendation.deformation?.baseline_wobble || 0.3) * 100)}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
