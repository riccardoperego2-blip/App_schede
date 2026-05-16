import type { TrainingSplit } from '@schede/exercise-selection';
import type { WorkoutGenerationInput } from '../domain/generation.types';

interface SplitScore {
  readonly split: TrainingSplit;
  readonly score: number;
  readonly rationale: string;
}

/**
 * Deterministic split choice: scores candidate splits from coaching heuristics
 * (frequency × recovery, pattern exposure, goal alignment). Tie → lexicographic split name.
 */
export function chooseOptimalSplit(input: WorkoutGenerationInput): TrainingSplit {
  const candidates = ALL_SPLITS;
  const scored: SplitScore[] = candidates.map((split) => ({
    split,
    score: scoreSplit(split, input),
    rationale: describeSplitFit(split, input),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.split.localeCompare(b.split);
  });
  return scored[0]!.split;
}

const ALL_SPLITS: readonly TrainingSplit[] = [
  'full_body',
  'upper_lower',
  'push_pull_legs',
  'bro_split',
  'powerlifting_focus',
  'athlete_hybrid',
];

function scoreSplit(split: TrainingSplit, input: WorkoutGenerationInput): number {
  let s = 0;
  const d = Math.min(7, Math.max(1, input.trainingDays));
  const g = input.trainingGoal;
  const e = input.experienceLevel;

  /** Frequency match */
  s += frequencyFit(split, d) * 18;

  /** Goal alignment */
  if (g === 'strength' && split === 'powerlifting_focus') s += 35;
  if (g === 'strength' && split === 'upper_lower') s += 22;
  if (g === 'hypertrophy' && split === 'push_pull_legs' && d >= 5) s += 28;
  if (g === 'hypertrophy' && split === 'upper_lower' && d === 4) s += 30;
  if (g === 'fat_loss' && split === 'full_body') s += 25;
  if (g === 'general' && split === 'full_body' && d <= 3) s += 26;
  if (g === 'rehab' && split === 'full_body') s += 32;
  if (g === 'sport_performance' && split === 'athlete_hybrid') s += 28;

  /** Experience guardrails */
  if (e === 'beginner' && split === 'bro_split') s -= 40;
  if (e === 'beginner' && split === 'full_body') s += 12;
  if (e === 'elite' && split === 'bro_split' && d >= 5) s += 8;

  /** Equipment */
  const hasBar = input.availableEquipment.has('barbell');
  if (!hasBar && split === 'powerlifting_focus') s -= 80;

  /** Recovery capacity — lower recovery favours lower frequency templates */
  if (input.recoveryCapacity <= 2 && split === 'bro_split') s -= 15;
  if (input.recoveryCapacity >= 4 && split === 'push_pull_legs' && d >= 5) s += 8;

  /** Training days hard constraints */
  if (d <= 2 && split !== 'full_body' && split !== 'upper_lower') s -= 50;
  if (d === 3 && split === 'bro_split') s -= 35;
  if (d >= 6 && split === 'full_body') s -= 20;

  return s;
}

function frequencyFit(split: TrainingSplit, days: number): number {
  const ideal =
    split === 'full_body'
      ? days <= 4
        ? 1
        : 0.4
      : split === 'upper_lower'
        ? days === 4
          ? 1
          : days === 3
            ? 0.75
            : 0.5
        : split === 'push_pull_legs'
          ? days >= 5
            ? 1
            : days === 3
              ? 0.7
              : 0.45
          : split === 'bro_split'
            ? days >= 5
              ? 0.85
              : 0.3
            : split === 'powerlifting_focus'
              ? days >= 3 && days <= 4
                ? 1
                : 0.55
              : split === 'athlete_hybrid'
                ? days >= 4
                  ? 0.9
                  : 0.5
                : 0.5;
  return ideal;
}

function describeSplitFit(split: TrainingSplit, input: WorkoutGenerationInput): string {
  return `${split};days=${input.trainingDays};goal=${input.trainingGoal}`;
}
