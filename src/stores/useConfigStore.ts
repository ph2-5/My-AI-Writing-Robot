import { create } from 'zustand'

interface ConfigData {
  paperWidth: number
  paperHeight: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  fontSizeTitle: number
  fontSizeBody: number
  fontSizeLabel: number
  lineSpacing: number
  questionSpacing: number
  charSpacing: number
  penUpHeight: number
  penDownHeight: number
  travelSpeed: number
  drawSpeed: number
  handDrawnAmplitude: number
  handDrawnCornerExaggeration: number
  charSpacingVar: number
  baselineWobble: number
  slant: number
  paperTemplate: 'blank' | 'ruled' | 'grid' | 'notebook'
  llmBaseUrl: string
  llmApiKey: string
  llmModel: string
}

interface ConfigState extends ConfigData {
  outputFormat: 'kuixiang' | 'svg' | 'gcode'
  seed: number | null

  setField: <K extends keyof ConfigState>(key: K, value: ConfigState[K]) => void
  getConfig: () => ConfigData
  resetToDefaults: () => void
}

const DEFAULT_DATA: ConfigData = {
  paperWidth: 210,
  paperHeight: 297,
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 15,
  marginRight: 15,
  fontSizeTitle: 5.0,
  fontSizeBody: 4.2,
  fontSizeLabel: 3.5,
  lineSpacing: 6.3,
  questionSpacing: 15,
  charSpacing: 1.2,
  penUpHeight: 3.0,
  penDownHeight: 0.0,
  travelSpeed: 80.0,
  drawSpeed: 25.0,
  handDrawnAmplitude: 0.4,
  handDrawnCornerExaggeration: 1.5,
  charSpacingVar: 0.15,
  baselineWobble: 0.3,
  slant: 0.02,
  paperTemplate: 'blank',
  llmBaseUrl: 'https://api.deepseek.com/v1',
  llmApiKey: '',
  llmModel: 'deepseek-coder',
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  ...DEFAULT_DATA,
  outputFormat: 'kuixiang' as const,
  seed: 42,

  setField: (key, value) => set({ [key]: value }),

  getConfig: () => {
    const state = get()
    return {
      paperWidth: state.paperWidth,
      paperHeight: state.paperHeight,
      marginTop: state.marginTop,
      marginBottom: state.marginBottom,
      marginLeft: state.marginLeft,
      marginRight: state.marginRight,
      fontSizeTitle: state.fontSizeTitle,
      fontSizeBody: state.fontSizeBody,
      fontSizeLabel: state.fontSizeLabel,
      lineSpacing: state.lineSpacing,
      questionSpacing: state.questionSpacing,
      charSpacing: state.charSpacing,
      penUpHeight: state.penUpHeight,
      penDownHeight: state.penDownHeight,
      travelSpeed: state.travelSpeed,
      drawSpeed: state.drawSpeed,
      handDrawnAmplitude: state.handDrawnAmplitude,
      handDrawnCornerExaggeration: state.handDrawnCornerExaggeration,
      charSpacingVar: state.charSpacingVar,
      baselineWobble: state.baselineWobble,
      slant: state.slant,
      paperTemplate: state.paperTemplate,
      llmBaseUrl: state.llmBaseUrl,
      llmApiKey: state.llmApiKey,
      llmModel: state.llmModel,
    }
  },

  resetToDefaults: () => set((state) => ({
    ...DEFAULT_DATA,
    llmApiKey: state.llmApiKey,
    outputFormat: state.outputFormat,
    seed: state.seed,
  })),
}))
