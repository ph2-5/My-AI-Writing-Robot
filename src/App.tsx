import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import StepIndicator from '@/components/StepIndicator'
import UploadStep from '@/components/UploadStep'
import ConfigStep from '@/components/ConfigStep'
import PreviewStep from '@/components/PreviewStep'
import ReviewStep from '@/components/ReviewStep'
import { PenTool, Menu, X, Github, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

function App() {
  const { currentStep, isSidebarOpen, toggleSidebar } = useAppStore()
  const [showHelp, setShowHelp] = useState(false)

  // 根据当前步骤渲染对应组件
  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return <UploadStep />
      case 'config':
        return <ConfigStep />
      case 'preview':
        return <PreviewStep />
      case 'review':
        return <ReviewStep />
      default:
        return <UploadStep />
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      {/* 顶部导航 */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <PenTool className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">AI写字机器人</h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">智能作业生成系统</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              title="帮助"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              title="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* 步骤指示器 */}
      <StepIndicator />

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {renderStep()}
        </div>
      </main>

      {/* 底部 */}
      <footer className="border-t border-zinc-800 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-zinc-600">AI Writing Robot v1.0</p>
          <p className="text-xs text-zinc-600">Powered by DeepSeek</p>
        </div>
      </footer>

      {/* 帮助弹窗 */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">使用帮助</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-zinc-400">
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">1. 上传文档</h4>
                <p>支持 .docx 格式的Word文档。如果题目包含图片，可以附加图片文件。</p>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">2. 配置参数</h4>
                <p>调整纸张尺寸、字体大小、机器人参数等。配置会自动保存。</p>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">3. 预览效果</h4>
                <p>AI会分析题目并生成排版方案。可以缩放查看细节。</p>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">4. 审核确认</h4>
                <p>检查每道题的答案，可以编辑修改。确认后生成最终指令。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
