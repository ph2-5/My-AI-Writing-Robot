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
import { useConfigStore } from '@/stores/useConfigStore'
import { PenTool, RotateCcw } from 'lucide-react'

export default function Home() {
  const resetToDefaults = useConfigStore((s) => s.resetToDefaults)

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
          <div className="flex-1 overflow-hidden">
            <PreviewCanvas />
          </div>
          <div className="border-t border-zinc-800 shrink-0">
            <GeneratePanel />
          </div>
        </main>
      </div>
    </div>
  )
}
