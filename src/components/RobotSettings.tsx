import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500'
const labelCls = 'text-xs text-zinc-400'

export default function RobotSettings() {
  const { penUpHeight, penDownHeight, travelSpeed, drawSpeed, setField } = useConfigStore()

  return (
    <ParamSection title="机器人参数">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>抬笔高度 (mm)</label>
          <input
            type="number"
            step="0.1"
            value={penUpHeight}
            onChange={(e) => setField('penUpHeight', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>落笔高度 (mm)</label>
          <input
            type="number"
            step="0.1"
            value={penDownHeight}
            onChange={(e) => setField('penDownHeight', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>空走速度 (mm/s)</label>
          <input
            type="number"
            step="0.1"
            value={travelSpeed}
            onChange={(e) => setField('travelSpeed', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>书写速度 (mm/s)</label>
          <input
            type="number"
            step="0.1"
            value={drawSpeed}
            onChange={(e) => setField('drawSpeed', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>
    </ParamSection>
  )
}
