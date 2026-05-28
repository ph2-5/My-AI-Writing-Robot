import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

export default function FileUpload() {
  const { isUploading, fileId, setUploading, setUploadResult } = useGenerateStore()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.docx')) {
        setError('仅支持 .docx 文件')
        return
      }
      setError(null)
      setUploading(true)
      setUploadedName(file.name)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await apiFetch('/api/homework/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (data.success) {
          setUploadResult(data.fileId, data.filePath ?? '')
          if (data.warning) {
            setError(data.warning)
          }
        } else {
          setError(data.error || '上传失败')
          setUploadedName(null)
        }
      } catch {
        setError('网络错误，上传失败')
        setUploadedName(null)
      } finally {
        setUploading(false)
      }
    },
    [setUploading, setUploadResult],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    [uploadFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadFile(file)
    },
    [uploadFile],
  )

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors duration-200',
          isDragOver
            ? 'border-amber-500 bg-amber-500/5'
            : 'border-zinc-600 bg-zinc-900 hover:border-amber-500 hover:bg-zinc-800/50',
          isUploading && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          onChange={handleChange}
          className="hidden"
        />

        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        ) : fileId && uploadedName ? (
          <FileText className="h-8 w-8 text-amber-500" />
        ) : (
          <Upload className="h-8 w-8 text-zinc-500" />
        )}

        <div className="text-center">
          {isUploading ? (
            <p className="text-sm text-zinc-400">正在上传...</p>
          ) : fileId && uploadedName ? (
            <>
              <p className="text-sm font-medium text-zinc-200">{uploadedName}</p>
              <p className="mt-1 text-xs text-zinc-500">点击或拖拽替换文件</p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300">拖拽 .docx 文件到此处</p>
              <p className="mt-1 text-xs text-zinc-500">或点击选择文件</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
