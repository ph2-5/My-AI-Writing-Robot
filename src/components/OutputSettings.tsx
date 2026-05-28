import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'

const radioCls =
  'h-3.5 w-3.5 border border-zinc-600 text-amber-500 focus:ring-amber-500 focus:ring-1 bg-zinc-800 accent-amber-500'
const labelCls = 'text-xs text-zinc-400'

const formats: { value: 'kuixiang' | 'svg' | 'gcode'; label: string }[] = [
  { value: 'kuixiang', label: 'Kuixiang' },
  { value: 'svg', label: 'SVG' },
  { value: 'gcode', label: 'GCode' },
]

export default function OutputSettings() {
  const { outputFormat, setField } = useConfigStore()

  return (
    <ParamSection title="输出格式">
      <div className="flex gap-4">
        {formats.map((f) => (
          <label key={f.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="outputFormat"
              value={f.value}
              checked={outputFormat === f.value}
              onChange={() => setField('outputFormat', f.value)}
              className={radioCls}
            />
            <span className={labelCls}>{f.label}</span>
          </label>
        ))}
      </div>
    </ParamSection>
  )
}
