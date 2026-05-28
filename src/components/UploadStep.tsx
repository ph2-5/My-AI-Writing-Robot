import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, Loader2, Image as ImageIcon, X, ArrowRight, Sparkles } from 'lucide-react'
import { useGenerateStore } from '@/stores/useGenerateStore'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

export default function UploadStep() {
  const { setUploading, setUploadResult, setQuestions } = useGenerateStore()
  const { markStepComplete, setStep } = useAppStore()
  
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.docx')) {
        setError('仅支持 .docx 文件')
        return
      }
      setError(null)
      setIsUploading(true)
      setUploading(true)
      setUploadedName(file.name)

      const formData = new FormData()
      formData.append('file', file)
      
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
          setQuestions(data.questions ?? [])
          markStepComplete('upload')
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
        setIsUploading(false)
        setUploading(false)
      }
    },
    [setUploading, setUploadResult, setQuestions, markStepComplete, attachedImages],
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

  const handleAddImage = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
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

  const handleRemoveImage = useCallback((index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">上传作业文档</h2>
        <p className="text-zinc-400">支持 .docx 格式，可附加题目图片</p>
      </div>

      {/* 上传区域 */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 cursor-pointer transition-all duration-300',
          isDragOver
            ? 'border-blue-500 bg-blue-500/5 scale-[1.02]'
            : uploadedName
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50',
          isUploading && 'pointer-events-none opacity-60',
        )}
      >
        <input ref={inputRef} type="file" accept=".docx" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} className="hidden" />

        {isUploading ? (
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        ) : uploadedName ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20">
              <FileText className="h-8 w-8 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-white">{uploadedName}</p>
              <p className="text-sm text-green-400 mt-1">上传成功</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
              <Upload className="h-8 w-8 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-zinc-300">点击或拖拽上传</p>
              <p className="text-sm text-zinc-500 mt-1">支持 .docx 格式文件</p>
            </div>
          </>
        )}
      </div>

      {/* 图片附件 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">题目图片附件（可选）</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleAddImage() }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <Upload className="h-3 w-3" />
            添加图片
          </button>
        </div>
        
        <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />

        {attachedImages.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {attachedImages.map((img, index) => (
              <div key={index} className="relative group rounded-xl overflow-hidden border border-zinc-700">
                <img src={img.preview} alt={`附件 ${index + 1}`} className="h-20 w-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(index) }}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 下一步按钮 */}
      {uploadedName && (
        <div className="flex justify-end">
          <button
            onClick={() => setStep('config')}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            下一步：配置参数
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
