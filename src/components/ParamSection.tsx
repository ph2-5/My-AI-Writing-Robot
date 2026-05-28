import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParamSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function ParamSection({ title, children, defaultOpen = true }: ParamSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = open ? ChevronDown : ChevronRight

  return (
    <div className="border-l-2 border-amber-500 pl-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400 transition-colors"
      >
        <Icon size={14} strokeWidth={2.5} />
        {title}
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 pb-2 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
