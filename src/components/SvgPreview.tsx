import { FileText } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'

export default function SvgPreview() {
  const { svgContent } = useGenerateStore()

  if (!svgContent) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <FileText className="h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-600">生成后将在此处预览</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="mx-auto" style={{ aspectRatio: '210 / 297', maxWidth: '100%' }}>
        <div
          className="relative h-full w-full border-2 border-dashed border-zinc-600 bg-white"
          style={{ aspectRatio: '210 / 297' }}
        >
          <div
            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    </div>
  )
}
