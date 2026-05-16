import { create } from 'zustand';
import type { ExperienceLevel, TrainingGoal } from '../../lib/api/contracts';

export interface OnboardingData {
  displayName: string;
  sex: 'male' | 'female' | 'other';
  birthYear: number | null;
  heightCm: number | null;
  bodyWeightKg: number | null;
  trainingGoal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  trainingDaysPerWeek: number;
  sessionDurationMin: number;
  availableEquipment: string[];
  injuries: string[];
  priorityMuscleGroups: string[];
}

/** Body for POST /v1/plans/generate — field names match backend `GeneratePlanDto`. */
export interface GeneratePlanRequestPayload {
  trainingGoal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  trainingDays: number;
  sessionDurationMinutes: number;
  availableEquipment: string[];
  recoveryCapacity: 1 | 2 | 3 | 4 | 5;
  priorityMuscleGroups: string[];
  injuries?: { code: string }[];
}

interface OnboardingState extends OnboardingData {
  stepIndex: number;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  asPlanInput: () => GeneratePlanRequestPayload;
}

const DEFAULTS: OnboardingData = {
  displayName: '',
  sex: 'male',
  birthYear: null,
  heightCm: null,
  bodyWeightKg: null,
  trainingGoal: 'hypertrophy',
  experienceLevel: 'beginner',
  trainingDaysPerWeek: 3,
  sessionDurationMin: 60,
  availableEquipment: ['barbell', 'dumbbell', 'machine', 'cable'],
  injuries: [],
  priorityMuscleGroups: [],
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...DEFAULTS,
  stepIndex: 0,
  setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
  next: () => set((state) => ({ stepIndex: Math.min(5, state.stepIndex + 1) })),
  prev: () => set((state) => ({ stepIndex: Math.max(0, state.stepIndex - 1) })),
  reset: () => set({ ...DEFAULTS, stepIndex: 0 }),
  asPlanInput: () => {
    const state = get();
    return {
      trainingGoal: state.trainingGoal,
      experienceLevel: state.experienceLevel,
      trainingDays: state.trainingDaysPerWeek,
      sessionDurationMinutes: state.sessionDurationMin,
      availableEquipment: state.availableEquipment,
      recoveryCapacity: 3,
      priorityMuscleGroups: state.priorityMuscleGroups,
      ...(state.injuries.length > 0
        ? { injuries: state.injuries.map((code) => ({ code })) }
        : {}),
    };
  },
}));
