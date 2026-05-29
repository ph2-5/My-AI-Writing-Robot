import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ConfigState {
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
  charSpacingVar: number
  baselineWobble: number
  slant: number
  penUpHeight: number
  penDownHeight: number
  travelSpeed: number
  drawSpeed: number
  handDrawnAmplitude: number
  handDrawnCornerExaggeration: number
  paperTemplate: string
  llmBaseUrl: string
  llmApiKey: string
  llmModel: string
  providerId: string
  outputFormat: 'kuixiang' | 'svg' | 'gcode'
  seed: number | null

  setPaperWidth: (v: number) => void
  setPaperHeight: (v: number) => void
  setMarginTop: (v: number) => void
  setMarginBottom: (v: number) => void
  setMarginLeft: (v: number) => void
  setMarginRight: (v: number) => void
  setFontSizeTitle: (v: number) => void
  setFontSizeBody: (v: number) => void
  setFontSizeLabel: (v: number) => void
  setLineSpacing: (v: number) => void
  setQuestionSpacing: (v: number) => void
  setCharSpacing: (v: number) => void
  setCharSpacingVar: (v: number) => void
  setBaselineWobble: (v: number) => void
  setSlant: (v: number) => void
  setPenUpHeight: (v: number) => void
  setPenDownHeight: (v: number) => void
  setTravelSpeed: (v: number) => void
  setDrawSpeed: (v: number) => void
  setHandDrawnAmplitude: (v: number) => void
  setHandDrawnCornerExaggeration: (v: number) => void
  setPaperTemplate: (v: string) => void
  setLlmBaseUrl: (v: string) => void
  setLlmApiKey: (v: string) => void
  setLlmModel: (v: string) => void
  setProviderId: (v: string) => void
  setField: (field: string, value: any) => void
  getConfig: () => Record<string, unknown>
  resetToDefaults: () => void
}

const DEFAULTS = {
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
  charSpacingVar: 0.3,
  baselineWobble: 0.5,
  slant: 0,
  penUpHeight: 5,
  penDownHeight: 0,
  travelSpeed: 80,
  drawSpeed: 25,
  handDrawnAmplitude: 0.3,
  handDrawnCornerExaggeration: 2.0,
  paperTemplate: 'blank',
  llmBaseUrl: '',
  llmApiKey: '',
  llmModel: 'deepseek-chat',
  providerId: 'deepseek',
  outputFormat: 'kuixiang' as 'kuixiang' | 'svg' | 'gcode',
  seed: null as number | null,
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setPaperWidth: (v) => set({ paperWidth: v }),
      setPaperHeight: (v) => set({ paperHeight: v }),
      setMarginTop: (v) => set({ marginTop: v }),
      setMarginBottom: (v) => set({ marginBottom: v }),
      setMarginLeft: (v) => set({ marginLeft: v }),
      setMarginRight: (v) => set({ marginRight: v }),
      setFontSizeTitle: (v) => set({ fontSizeTitle: v }),
      setFontSizeBody: (v) => set({ fontSizeBody: v }),
      setFontSizeLabel: (v) => set({ fontSizeLabel: v }),
      setLineSpacing: (v) => set({ lineSpacing: v }),
      setQuestionSpacing: (v) => set({ questionSpacing: v }),
      setCharSpacing: (v) => set({ charSpacing: v }),
      setCharSpacingVar: (v) => set({ charSpacingVar: v }),
      setBaselineWobble: (v) => set({ baselineWobble: v }),
      setSlant: (v) => set({ slant: v }),
      setPenUpHeight: (v) => set({ penUpHeight: v }),
      setPenDownHeight: (v) => set({ penDownHeight: v }),
      setTravelSpeed: (v) => set({ travelSpeed: v }),
      setDrawSpeed: (v) => set({ drawSpeed: v }),
      setHandDrawnAmplitude: (v) => set({ handDrawnAmplitude: v }),
      setHandDrawnCornerExaggeration: (v) => set({ handDrawnCornerExaggeration: v }),
      setPaperTemplate: (v) => set({ paperTemplate: v }),
      setLlmBaseUrl: (v) => set({ llmBaseUrl: v }),
      setLlmApiKey: (v) => set({ llmApiKey: v }),
      setLlmModel: (v) => set({ llmModel: v }),
      setProviderId: (v) => set({ providerId: v }),

      setField: (field: string, value: any) => set((state: any) => ({ ...state, [field]: value })),

      getConfig: () => {
        const state = get() as ConfigState
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
          charSpacingVar: state.charSpacingVar,
          baselineWobble: state.baselineWobble,
          slant: state.slant,
          penUpHeight: state.penUpHeight,
          penDownHeight: state.penDownHeight,
          travelSpeed: state.travelSpeed,
          drawSpeed: state.drawSpeed,
          handDrawnAmplitude: state.handDrawnAmplitude,
          handDrawnCornerExaggeration: state.handDrawnCornerExaggeration,
          paperTemplate: state.paperTemplate,
          llmBaseUrl: state.llmBaseUrl,
          llmApiKey: state.llmApiKey,
          llmModel: state.llmModel,
          providerId: state.providerId,
          outputFormat: state.outputFormat,
          seed: state.seed,
        }
      },

      resetToDefaults: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'ai-writing-robot-config',
      partialize: (state: ConfigState) => ({
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
        charSpacingVar: state.charSpacingVar,
        baselineWobble: state.baselineWobble,
        slant: state.slant,
        penUpHeight: state.penUpHeight,
        penDownHeight: state.penDownHeight,
        travelSpeed: state.travelSpeed,
        drawSpeed: state.drawSpeed,
        handDrawnAmplitude: state.handDrawnAmplitude,
        handDrawnCornerExaggeration: state.handDrawnCornerExaggeration,
        paperTemplate: state.paperTemplate,
        llmBaseUrl: state.llmBaseUrl,
        llmApiKey: state.llmApiKey,
        llmModel: state.llmModel,
        providerId: state.providerId,
      }),
    }
  ) as any
)
