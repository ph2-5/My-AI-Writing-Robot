import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'

export default function HandDrawnSettings() {
  const { handDrawnAmplitude, handDrawnCornerExaggeration, charSpacingVar, baselineWobble, slant, seed, setField } = useConfigStore()

  return (
    <ParamSection title="手绘效果" defaultOpen>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">抖动幅度 (mm)</label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="2"
            value={handDrawnAmplitude}
            onChange={(e) => setField('handDrawnAmplitude', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">拐角增强 (倍)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="3"
            value={handDrawnCornerExaggeration}
            onChange={(e) => setField('handDrawnCornerExaggeration', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">字间距变化</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="0.5"
            value={charSpacingVar}
            onChange={(e) => setField('charSpacingVar', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">基线浮动 (mm)</label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="2"
            value={baselineWobble}
            onChange={(e) => setField('baselineWobble', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">倾斜度</label>
          <input
            type="number"
            step="0.005"
            min="0"
            max="0.1"
            value={slant}
            onChange={(e) => setField('slant', parseFloat(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
          />
        </div>
      </div>
      <div className="mt-2">
        <label className="text-xs text-zinc-400 block mb-1">随机种子</label>
        <input
          type="number"
          value={seed ?? ''}
          placeholder="留空为随机"
          onChange={(e) => {
            const v = e.target.value
            setField('seed', v === '' ? null : parseInt(v))
          }}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:ring-1 focus:ring-amber-500 font-mono"
        />
      </div>
    </ParamSection>
  )
}
