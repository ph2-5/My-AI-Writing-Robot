import { useState, useCallback } from 'react'
import { Check, X, Edit2, Save, Eye, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AnswerItem {
  questionNumber: number
  questionType: string
  questionText: string
  answerContent: string
  isCorrected: boolean
}

interface AnswerReviewProps {
  answers: AnswerItem[]
  onAnswerChange?: (questionNumber: number, newContent: string) => void
  onConfirm?: (questionNumber: number) => void
}

export default function AnswerReview({ answers, onAnswerChange, onConfirm }: AnswerReviewProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const startEdit = useCallback((item: AnswerItem) => {
    setEditingId(item.questionNumber)
    setEditContent(item.answerContent)
  }, [])

  const saveEdit = useCallback((questionNumber: number) => {
    onAnswerChange?.(questionNumber, editContent)
    setEditingId(null)
  }, [editContent, onAnswerChange])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditContent('')
  }, [])

  const toggleExpand = useCallback((questionNumber: number) => {
    setExpandedId(prev => prev === questionNumber ? null : questionNumber)
  }, [])

  if (answers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">暂无答案内容，请先生成预览</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">答案审核</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            共 {answers.length} 道题，已确认 {answers.filter(a => a.isCorrected).length} 道
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {Math.round((answers.filter(a => a.isCorrected).length / answers.length) * 100)}% 完成
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {answers.map((item) => {
          const isEditing = editingId === item.questionNumber
          const isExpanded = expandedId === item.questionNumber
          const isConfirmed = item.isCorrected

          return (
            <div
              key={item.questionNumber}
              className={cn(
                'rounded-lg border transition-colors',
                isConfirmed
                  ? 'border-green-800/50 bg-green-900/10'
                  : 'border-zinc-700 bg-zinc-800/50',
              )}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    isConfirmed
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-700 text-zinc-400',
                  )}>
                    {isConfirmed ? <Check className="h-3 w-3" /> : item.questionNumber}
                  </span>
                  <span className="text-xs text-zinc-400">{item.questionType}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => toggleExpand(item.questionNumber)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                        title="查看/收起"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                        title="编辑"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {!isConfirmed && (
                        <button
                          onClick={() => onConfirm?.(item.questionNumber)}
                          className="rounded p-1 text-zinc-500 hover:bg-green-900/50 hover:text-green-400"
                          title="确认正确"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 题目内容 */}
              <div className="px-3 pb-1">
                <p className="text-xs text-zinc-500 line-clamp-1">{item.questionText}</p>
              </div>

              {/* 答案内容 */}
              {(isExpanded || isEditing) && (
                <div className="px-3 pb-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-md border border-zinc-600 bg-zinc-900 p-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                        rows={6}
                        placeholder="编辑答案内容..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
                        >
                          <X className="h-3 w-3" />
                          取消
                        </button>
                        <button
                          onClick={() => saveEdit(item.questionNumber)}
                          className="flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-500"
                        >
                          <Save className="h-3 w-3" />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md bg-zinc-900/50 p-2">
                      <p className="text-xs text-zinc-300 whitespace-pre-wrap">{item.answerContent}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
