import { create } from 'zustand'

export type Step = 'upload' | 'config' | 'preview' | 'review'

export interface AppState {
  currentStep: Step
  completedSteps: Set<Step>
  isSidebarOpen: boolean
  
  setStep: (step: Step) => void
  markStepComplete: (step: Step) => void
  canNavigateTo: (step: Step) => boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentStep: 'upload',
  completedSteps: new Set(),
  isSidebarOpen: true,

  setStep: (step) => set({ currentStep: step }),
  
  markStepComplete: (step) => set((state) => ({
    completedSteps: new Set([...state.completedSteps, step]),
  })),
  
  canNavigateTo: (step) => {
    const { completedSteps } = get()
    const stepOrder: Step[] = ['upload', 'config', 'preview', 'review']
    const targetIndex = stepOrder.indexOf(step)
    const currentIndex = stepOrder.indexOf(get().currentStep)
    
    // Can always go back or stay
    if (targetIndex <= currentIndex) return true
    
    // Can go to next step only if current is completed
    if (targetIndex === currentIndex + 1) {
      return completedSteps.has(stepOrder[currentIndex])
    }
    
    return false
  },
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))
