import { ListChecks, Inbox } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  uml_usecase: '用例图',
  uml_class: '类图',
  uml_sequence: '时序图',
  uml_activity: '活动图',
  essay: '文字题',
  unknown: '其他',
}

export default function QuestionList() {
  const { questions } = useGenerateStore()

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-10">
        <Inbox className="h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">暂无题目</p>
        <p className="text-xs text-zinc-600">上传文档后将显示解析结果</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-1">
        <ListChecks className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-zinc-400">
          共 {questions.length} 道题目
        </span>
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {questions.map((q) => (
          <div
            key={q.number}
            className="group rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-700 text-xs font-bold text-zinc-300">
                {q.number}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      'bg-amber-500/15 text-amber-400',
                    )}
                  >
                    {TYPE_LABELS[q.type] ?? q.type}
                  </span>
                </div>

                <p className="mt-1 truncate text-xs leading-relaxed text-zinc-300">
                  {q.text}
                </p>

                {q.requirements.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {q.requirements.map((req, i) => (
                      <span
                        key={i}
                        className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-400"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
