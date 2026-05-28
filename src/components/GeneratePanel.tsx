import { useCallback, useRef } from 'react'
import {
  Play,
  Eye,
  Download,
  Loader2,
  PenTool,
  Clock,
  Terminal,
} from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

export default function GeneratePanel() {
  const {
    fileId,
    isGenerating,
    svgContent,
    strokeCount,
    estimatedTime,
    log,
    setGenerating,
    setGenerateResult,
  } = useGenerateStore()

  const { outputFormat, seed, getConfig } = useConfigStore()
  const logRef = useRef<HTMLPreElement>(null)

  const handleGenerate = useCallback(async () => {
    if (!fileId || isGenerating) return

    setGenerating(true)
    try {
      const res = await apiFetch('/api/homework/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          format: outputFormat,
          seed,
          config: getConfig(),
        }),
      })
      const data = await res.json()

      if (data.success) {
        setGenerateResult({
          fileId: data.fileId ?? fileId,
          questions: data.questions ?? [],
          svgContent: data.svgContent ?? '',
          strokeCount: data.strokeCount ?? 0,
          estimatedTime: data.estimatedTime ?? 0,
        })
      } else {
        useGenerateStore.setState({
          log: data.error || '生成失败',
        })
      }
    } catch {
      useGenerateStore.setState({ log: '网络错误，生成失败' })
    } finally {
      setGenerating(false)
    }
  }, [fileId, isGenerating, outputFormat, seed, getConfig, setGenerating, setGenerateResult])

  const handleDemo = useCallback(async () => {
    if (isGenerating) return

    setGenerating(true)
    try {
      const res = await apiFetch('/api/homework/demo')
      const data = await res.json()

      if (data.success) {
        setGenerateResult({
          questions: [],
          svgContent: data.svgContent ?? '',
          strokeCount: data.strokeCount ?? 0,
          estimatedTime: data.estimatedTime ?? 0,
        })
      } else {
        useGenerateStore.setState({ log: data.error || '演示失败' })
      }
    } catch {
      useGenerateStore.setState({ log: '网络错误，演示失败' })
    } finally {
      setGenerating(false)
    }
  }, [isGenerating, setGenerating, setGenerateResult])

  const hasResult = svgContent.length > 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={!fileId || isGenerating}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors',
            fileId && !isGenerating
              ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400'
              : 'cursor-not-allowed bg-zinc-700 text-zinc-500',
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          生成
        </button>

        <button
          onClick={handleDemo}
          disabled={isGenerating}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-3 text-sm font-medium transition-colors',
            isGenerating
              ? 'cursor-not-allowed text-zinc-500'
              : 'text-zinc-300 hover:bg-zinc-600',
          )}
        >
          <Eye className="h-4 w-4" />
          演示模式
        </button>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
            <span className="text-xs text-zinc-400">正在生成...</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full animate-pulse rounded-full bg-amber-500" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {hasResult && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2">
            <PenTool className="h-3.5 w-3.5 text-amber-500" />
            <div>
              <p className="text-[10px] text-zinc-500">笔画数</p>
              <p className="text-sm font-mono font-semibold text-zinc-200">{strokeCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <div>
              <p className="text-[10px] text-zinc-500">预计时间</p>
              <p className="text-sm font-mono font-semibold text-zinc-200">
                {estimatedTime > 60
                  ? `${Math.floor(estimatedTime / 60)}m ${Math.round(estimatedTime % 60)}s`
                  : `${Math.round(estimatedTime)}s`}
              </p>
            </div>
          </div>
        </div>
      )}

      {log && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-1">
            <Terminal className="h-3 w-3 text-zinc-500" />
            <span className="text-[10px] font-medium text-zinc-500">日志输出</span>
          </div>
          <pre
            ref={logRef}
            className="max-h-40 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-400"
          >
            {log}
          </pre>
        </div>
      )}

      {hasResult && fileId && (
        <a
          href={`/api/homework/download/${fileId}`}
          download
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-amber-500/50 hover:bg-zinc-700 hover:text-amber-400"
        >
          <Download className="h-4 w-4" />
          下载文件
        </a>
      )}
    </div>
  )
}
