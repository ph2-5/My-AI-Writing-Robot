import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500'
const labelCls = 'text-xs text-zinc-400'

export default function PaperSettings() {
  const { paperWidth, paperHeight, marginTop, marginBottom, marginLeft, marginRight, setField } =
    useConfigStore()

  return (
    <ParamSection title="纸张设置">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>宽度 (mm)</label>
          <input
            type="number"
            step="0.1"
            value={paperWidth}
            onChange={(e) => setField('paperWidth', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>高度 (mm)</label>
          <input
            type="number"
            step="0.1"
            value={paperHeight}
            onChange={(e) => setField('paperHeight', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>上边距</label>
          <input
            type="number"
            step="0.1"
            value={marginTop}
            onChange={(e) => setField('marginTop', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>下边距</label>
          <input
            type="number"
            step="0.1"
            value={marginBottom}
            onChange={(e) => setField('marginBottom', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>左边距</label>
          <input
            type="number"
            step="0.1"
            value={marginLeft}
            onChange={(e) => setField('marginLeft', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>右边距</label>
          <input
            type="number"
            step="0.1"
            value={marginRight}
            onChange={(e) => setField('marginRight', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>
    </ParamSection>
  )
}
