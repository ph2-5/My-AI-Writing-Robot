import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'

export default function FontSettings() {
  const { fontSizeTitle, fontSizeBody, fontSizeLabel, lineSpacing, questionSpacing, charSpacing, setField } = useConfigStore()

  return (
    <ParamSection title="字体设置" defaultOpen>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">标题字号 (mm)</label>
          <input
            type="number"
            step="0.1"
            min="2"
            max="10"
            value={fontSizeTitle}
            onChange={(e) => setField('fontSizeTitle', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">正文字号 (mm)</label>
          <input
            type="number"
            step="0.1"
            min="2"
            max="10"
            value={fontSizeBody}
            onChange={(e) => setField('fontSizeBody', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">标注字号 (mm)</label>
          <input
            type="number"
            step="0.1"
            min="2"
            max="10"
            value={fontSizeLabel}
            onChange={(e) => setField('fontSizeLabel', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">行间距 (mm)</label>
          <input
            type="number"
            step="0.1"
            min="3"
            max="20"
            value={lineSpacing}
            onChange={(e) => setField('lineSpacing', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">题间距 (mm)</label>
          <input
            type="number"
            step="1"
            min="5"
            max="50"
            value={questionSpacing}
            onChange={(e) => setField('questionSpacing', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">字间距 (倍)</label>
          <input
            type="number"
            step="0.05"
            min="0.5"
            max="2.0"
            value={charSpacing}
            onChange={(e) => setField('charSpacing', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
      </div>
    </ParamSection>
  )
}
