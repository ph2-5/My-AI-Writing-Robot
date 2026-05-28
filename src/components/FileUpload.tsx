import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, Loader2, Image as ImageIcon, X } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

export default function FileUpload() {
  const { isUploading, fileId, setUploading, setUploadResult } = useGenerateStore()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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
      
      // 附加图片
      attachedImages.forEach((img, index) => {
        formData.append(`image_${index}`, img.file)
      })

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
    [setUploading, setUploadResult, attachedImages],
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

  // 添加图片
  const handleAddImage = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: { file: File; preview: string }[] = []
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const preview = event.target?.result as string
          setAttachedImages(prev => [...prev, { file, preview }])
        }
        reader.readAsDataURL(file)
      }
    })
  }, [])

  // 移除图片
  const handleRemoveImage = useCallback((index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="space-y-3">
      {/* 主文件上传区域 */}
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

      {/* 图片附件区域 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">题目图片附件（可选）</p>
          <button
            onClick={handleAddImage}
            className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <ImageIcon className="h-3 w-3" />
            添加图片
          </button>
        </div>
        
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="hidden"
        />

        {/* 图片预览 */}
        {attachedImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {attachedImages.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img.preview}
                  alt={`附件 ${index + 1}`}
                  className="h-16 w-full rounded-md object-cover border border-zinc-700"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{img.file.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
