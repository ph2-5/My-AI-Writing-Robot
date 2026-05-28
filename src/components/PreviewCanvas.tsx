import { FileText, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useState, useCallback } from 'react'

export default function PreviewCanvas() {
  const { previewSvg, svgContent } = useGenerateStore()
  const [zoom, setZoom] = useState(1)
  const [showPreview, setShowPreview] = useState(true)

  const displaySvg = showPreview ? previewSvg : svgContent
  const hasContent = displaySvg.length > 0

  const zoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.5)), [])
  const resetZoom = useCallback(() => setZoom(1), [])

  if (!hasContent) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <FileText className="h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-600">点击"预览答案布局"查看AI设计方案</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
        {previewSvg && svgContent && (
          <div className="flex rounded-md border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                showPreview ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              布局预览
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                !showPreview ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              最终效果
            </button>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-zinc-500 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={resetZoom} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-900 p-6">
        <div
          className="mx-auto transition-transform origin-top"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div
            className="border border-zinc-600 bg-white shadow-2xl"
            style={{ aspectRatio: '210 / 297' }}
          >
            <div
              className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: displaySvg }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
