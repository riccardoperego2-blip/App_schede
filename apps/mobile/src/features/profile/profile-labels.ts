import type { ExperienceLevel, TrainingGoal } from '../../lib/api/contracts';

export const TRAINING_GOAL_OPTIONS: { value: TrainingGoal; label: string }[] = [
  { value: 'strength', label: 'Forza' },
  { value: 'hypertrophy', label: 'Ipertrofia' },
  { value: 'fat_loss', label: 'Dimagrimento' },
  { value: 'general', label: 'Generale' },
  { value: 'rehab', label: 'Recupero' },
];

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzato' },
  { value: 'elite', label: 'Elite' },
];

export const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'barbell', label: 'Bilanciere' },
  { value: 'dumbbell', label: 'Manubri' },
  { value: 'machine', label: 'Macchine' },
  { value: 'cable', label: 'Cavi' },
  { value: 'bodyweight', label: 'Corpo libero' },
  { value: 'kettlebell', label: 'Kettlebell' },
];

export function trainingGoalLabel(goal: TrainingGoal): string {
  return TRAINING_GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? goal;
}

export function experienceLabel(level: ExperienceLevel): string {
  return EXPERIENCE_OPTIONS.find((o) => o.value === level)?.label ?? level;
}
