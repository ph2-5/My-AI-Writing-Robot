import PaperSettings from '@/components/PaperSettings'
import FontSettings from '@/components/FontSettings'
import RobotSettings from '@/components/RobotSettings'
import HandDrawnSettings from '@/components/HandDrawnSettings'
import LLMSettings from '@/components/LLMSettings'
import OutputSettings from '@/components/OutputSettings'
import PaperTemplateSelector from '@/components/PaperTemplateSelector'
import FileUpload from '@/components/FileUpload'
import QuestionList from '@/components/QuestionList'
import LayoutPreview from '@/components/LayoutPreview'
import PreviewCanvas from '@/components/PreviewCanvas'
import GeneratePanel from '@/components/GeneratePanel'
import AnswerReview, { AnswerItem } from '@/components/AnswerReview'
import { useConfigStore } from '@/stores/useConfigStore'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { PenTool, RotateCcw, CheckSquare, Layout, Eye } from 'lucide-react'
import { useState, useCallback } from 'react'

export default function Home() {
  const resetToDefaults = useConfigStore((s) => s.resetToDefaults)
  const { questionPlans } = useGenerateStore()
  const [activeTab, setActiveTab] = useState<'preview' | 'review'>('preview')
  const [answers, setAnswers] = useState<AnswerItem[]>([])

  // 从questionPlans生成答案列表
  const updateAnswersFromPlans = useCallback(() => {
    if (questionPlans && questionPlans.length > 0) {
      const newAnswers: AnswerItem[] = questionPlans.map((plan: any) => ({
        questionNumber: plan.questionNumber || 0,
        questionType: plan.questionType || 'unknown',
        questionText: plan.questionText || '',
        answerContent: plan.answerContent || '',
        isCorrected: false,
      }))
      setAnswers(newAnswers)
    }
  }, [questionPlans])

  const handleAnswerChange = useCallback((questionNumber: number, newContent: string) => {
    setAnswers(prev => prev.map(item =>
      item.questionNumber === questionNumber
        ? { ...item, answerContent: newContent, isCorrected: true }
        : item
    ))
  }, [])

  const handleConfirm = useCallback((questionNumber: number) => {
    setAnswers(prev => prev.map(item =>
      item.questionNumber === questionNumber
        ? { ...item, isCorrected: true }
        : item
    ))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <PenTool className="w-5 h-5 text-amber-500" />
        <h1 className="text-lg font-semibold tracking-tight">AI 写字机器人</h1>
        <span className="text-xs text-zinc-500 ml-2">Word → AI分析 → 布局预览 → 机器人指令</span>
        <div className="flex-1" />
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors px-3 py-1.5 rounded border border-zinc-700 hover:border-amber-500/50"
        >
          <RotateCcw className="w-3 h-3" />
          重置默认
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-zinc-800 overflow-y-auto p-4 space-y-2 shrink-0">
          <FileUpload />
          <QuestionList />
          <LayoutPreview />
          <div className="border-t border-zinc-800 my-3" />
          <PaperTemplateSelector />
          <PaperSettings />
          <FontSettings />
          <RobotSettings />
          <HandDrawnSettings />
          <LLMSettings />
          <OutputSettings />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 标签切换 */}
          <div className="flex items-center gap-1 border-b border-zinc-800 px-4 py-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              效果预览
            </button>
            <button
              onClick={() => {
                setActiveTab('review')
                updateAnswersFromPlans()
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'review'
                  ? 'bg-amber-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              答案审核
              {answers.length > 0 && (
                <span className="ml-1 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px]">
                  {answers.filter(a => a.isCorrected).length}/{answers.length}
                </span>
              )}
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <PreviewCanvas />
            ) : (
              <AnswerReview
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onConfirm={handleConfirm}
              />
            )}
          </div>

          <div className="border-t border-zinc-800 shrink-0">
            <GeneratePanel />
          </div>
        </main>
      </div>
    </div>
  )
}
