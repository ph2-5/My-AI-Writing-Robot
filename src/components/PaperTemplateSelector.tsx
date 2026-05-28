import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'
import { FileText, AlignJustify, Grid3X3, BookOpen } from 'lucide-react'

const templates = [
  { key: 'blank', label: '空白A4', icon: FileText },
  { key: 'ruled', label: '横线本', icon: AlignJustify },
  { key: 'grid', label: '方格本', icon: Grid3X3 },
  { key: 'notebook', label: '笔记本', icon: BookOpen },
] as const

export default function PaperTemplateSelector() {
  const { paperTemplate, setField } = useConfigStore()

  return (
    <ParamSection title="纸张模板" defaultOpen>
      <div className="grid grid-cols-4 gap-2">
        {templates.map((t) => {
          const Icon = t.icon
          const active = paperTemplate === t.key
          return (
            <button
              key={t.key}
              onClick={() => setField('paperTemplate', t.key)}
              className={`flex flex-col items-center gap-1 py-2 rounded border transition-colors ${
                active
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{t.label}</span>
            </button>
          )
        })}
      </div>
    </ParamSection>
  )
}
