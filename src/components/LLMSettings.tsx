import ParamSection from './ParamSection'
import { useConfigStore } from '@/stores/useConfigStore'

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500'
const labelCls = 'text-xs text-zinc-400'

export default function LLMSettings() {
  const { llmBaseUrl, llmApiKey, llmModel, setField } = useConfigStore()

  return (
    <ParamSection title="LLM 配置">
      <div>
        <label className={labelCls}>Base URL</label>
        <input
          type="text"
          value={llmBaseUrl}
          onChange={(e) => setField('llmBaseUrl', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>API Key</label>
        <input
          type="password"
          value={llmApiKey}
          onChange={(e) => setField('llmApiKey', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Model</label>
        <input
          type="text"
          value={llmModel}
          onChange={(e) => setField('llmModel', e.target.value)}
          className={inputCls}
        />
      </div>
    </ParamSection>
  )
}
