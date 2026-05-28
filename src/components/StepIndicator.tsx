import { useAppStore, type Step } from '@/stores/useAppStore'
import { Upload, Settings, Eye, CheckSquare, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS: { id: Step; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: '上传文档', icon: Upload },
  { id: 'config', label: '参数配置', icon: Settings },
  { id: 'preview', label: '预览效果', icon: Eye },
  { id: 'review', label: '审核确认', icon: CheckSquare },
]

export default function StepIndicator() {
  const { currentStep, completedSteps, setStep, canNavigateTo } = useAppStore()

  return (
    <div className="w-full bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id
            const isCompleted = completedSteps.has(step.id)
            const isClickable = canNavigateTo(step.id)
            const Icon = step.icon

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => isClickable && setStep(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50'
                      : isCompleted
                      ? 'text-green-400 hover:bg-green-900/20'
                      : 'text-zinc-600 cursor-not-allowed',
                    isClickable && !isActive && 'hover:bg-zinc-800 cursor-pointer'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-zinc-800 text-zinc-600'
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className={cn(
                      'text-xs font-semibold',
                      isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-zinc-500'
                    )}>
                      步骤 {index + 1}
                    </p>
                    <p className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-white' : isCompleted ? 'text-green-300' : 'text-zinc-500'
                    )}>
                      {step.label}
                    </p>
                  </div>
                </button>

                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4">
                    <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          isCompleted ? 'bg-green-500/50 w-full' : 'w-0'
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
