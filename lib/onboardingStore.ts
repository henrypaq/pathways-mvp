import { create } from "zustand";

export type OnboardingMode = "voice" | "chat" | "manual" | null;
export type SituationChoice = "help-choose" | "know-destination" | null;
export type DocumentStatus = "not_uploaded" | "uploaded" | "verified";

export interface ProfileField {
  label: string;
  value: string | null;
}

export interface DocumentState {
  id: string;
  status: DocumentStatus;
  file?: File;
}

interface OnboardingState {
  currentStep: number;
  mode: OnboardingMode;
  situationChoice: SituationChoice;
  selectedPathwayId: string | null;
  selectedDestination: string | null;
  selectedPurpose: string | null;
  profile: Record<string, string>;
  documents: Record<string, DocumentState>;
  applicationStrength: number;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setMode: (mode: OnboardingMode) => void;
  setSituationChoice: (choice: SituationChoice) => void;
  setSelectedPathway: (id: string) => void;
  setDestination: (dest: string) => void;
  setPurpose: (purpose: string) => void;
  updateProfile: (key: string, value: string) => void;
  updateDocument: (id: string, status: DocumentStatus, file?: File) => void;
  setApplicationStrength: (strength: number) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 0,
  mode: null,
  situationChoice: null,
  selectedPathwayId: null,
  selectedDestination: null,
  selectedPurpose: null,
  profile: {},
  documents: {},
  applicationStrength: 72,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
  setMode: (mode) => set({ mode }),
  setSituationChoice: (situationChoice) => set({ situationChoice }),
  setSelectedPathway: (id) => set({ selectedPathwayId: id }),
  setDestination: (selectedDestination) => set({ selectedDestination }),
  setPurpose: (selectedPurpose) => set({ selectedPurpose }),
  updateProfile: (key, value) =>
    set((s) => ({ profile: { ...s.profile, [key]: value } })),
  updateDocument: (id, status, file) =>
    set((s) => ({
      documents: { ...s.documents, [id]: { id, status, file } },
    })),
  setApplicationStrength: (applicationStrength) => set({ applicationStrength }),
}));
