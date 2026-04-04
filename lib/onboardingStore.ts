import { create } from "zustand";

export type OnboardingMode = "voice" | "chat" | "manual" | null;

interface OnboardingState {
  currentStep: number;
  mode: OnboardingMode;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setMode: (mode: OnboardingMode) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 0,
  mode: null,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
  setMode: (mode) => set({ mode }),
}));
