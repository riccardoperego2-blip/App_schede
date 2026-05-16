import type { ExperienceLevel, ProgressionDecision, TrainingGoal } from '../domain/generation.types';

/**
 * Selects progression heuristics matching goal × experience (coach-style defaults).
 */
export function progressionStrategySelector(
  goal: TrainingGoal,
  experience: ExperienceLevel,
): ProgressionDecision {
  if (goal === 'rehab') {
    return {
      model: 'maintenance_volume',
      weeklyLoadIncrementPct: 0,
      rirProgressionStep: 0.5,
      notes: 'Technique and tolerance first; micro-load when pain-free ROM stable.',
    };
  }
  if (goal === 'strength') {
    if (experience === 'beginner' || experience === 'intermediate') {
      return {
        model: 'linear_load_addition',
        weeklyLoadIncrementPct: 1.25,
        rirProgressionStep: 0,
        notes: 'Add load weekly while bar speed stable; keep reps fixed.',
      };
    }
    return {
      model: 'top_set_rpe_autoregulation',
      weeklyLoadIncrementPct: 0.5,
      rirProgressionStep: 0,
      notes: 'Autoregulate top sets to RPE targets; backoff volume fixed.',
    };
  }
  if (goal === 'hypertrophy') {
    if (experience === 'beginner') {
      return {
        model: 'double_progression_reps_then_load',
        weeklyLoadIncrementPct: 0,
        rirProgressionStep: 0.5,
        notes: 'Add reps across sets until top of range, then add smallest load increment.',
      };
    }
    return {
      model: 'double_progression_reps_then_load',
      weeklyLoadIncrementPct: 0.25,
      rirProgressionStep: 0.5,
      notes: 'Progress reps then load; maintain RIR 1–3 on compounds most sets.',
    };
  }
  if (goal === 'fat_loss') {
    return {
      model: 'volume_wave_then_intensity',
      weeklyLoadIncrementPct: 0.25,
      rirProgressionStep: 0.5,
      notes: 'Preserve strength; slight rep progression when energy allows.',
    };
  }
  return {
    model: 'double_progression_reps_then_load',
    weeklyLoadIncrementPct: 0.35,
    rirProgressionStep: 0.5,
    notes: 'Balanced progression across patterns.',
  };
}
