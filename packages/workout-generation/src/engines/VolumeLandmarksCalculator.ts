/**
 * Coach-calibrated **weekly hard-set** landmarks (MEV / MAV band / MRV).
 * Values are deterministic policy constants — tune per population via config service in production.
 *
 * References (conceptual): Israetel et al. — *volume landmarks* for hypertrophy;
 * strength work typically sits below hypertrophy MRV with higher intensity.
 */
import type { ExperienceLevel, MuscleVolumeGroup, TrainingGoal, VolumeLandmarks } from '../domain/generation.types';
import { MUSCLE_VOLUME_GROUPS } from '../domain/generation.types';

type LandmarkTable = Readonly<Record<MuscleVolumeGroup, VolumeLandmarks>>;

const HYPERTROPHY_INTERMEDIATE: LandmarkTable = {
  chest: { mev: 8, mavLow: 12, mavHigh: 20, mrv: 24 },
  upper_back: { mev: 8, mavLow: 12, mavHigh: 22, mrv: 26 },
  lower_back: { mev: 0, mavLow: 2, mavHigh: 6, mrv: 8 },
  quads: { mev: 6, mavLow: 12, mavHigh: 18, mrv: 22 },
  hamstrings: { mev: 4, mavLow: 8, mavHigh: 16, mrv: 20 },
  glutes: { mev: 0, mavLow: 4, mavHigh: 12, mrv: 16 },
  delts_anterior: { mev: 0, mavLow: 6, mavHigh: 14, mrv: 18 },
  delts_lateral: { mev: 0, mavLow: 8, mavHigh: 16, mrv: 20 },
  delts_posterior: { mev: 4, mavLow: 8, mavHigh: 16, mrv: 20 },
  biceps: { mev: 5, mavLow: 8, mavHigh: 16, mrv: 20 },
  triceps: { mev: 4, mavLow: 8, mavHigh: 14, mrv: 18 },
  forearms: { mev: 0, mavLow: 2, mavHigh: 8, mrv: 12 },
  calves: { mev: 4, mavLow: 8, mavHigh: 14, mrv: 18 },
  core: { mev: 0, mavLow: 4, mavHigh: 12, mrv: 16 },
};

const HYPERTROPHY_BEGINNER: LandmarkTable = scaleTable(HYPERTROPHY_INTERMEDIATE, 0.75);
const HYPERTROPHY_ADVANCED: LandmarkTable = scaleTable(HYPERTROPHY_INTERMEDIATE, 1.08);
const HYPERTROPHY_ELITE: LandmarkTable = scaleTable(HYPERTROPHY_INTERMEDIATE, 1.12);

const STRENGTH_INTERMEDIATE: LandmarkTable = scaleTable(HYPERTROPHY_INTERMEDIATE, 0.55, {
  quads: 1.1,
  hamstrings: 1.1,
  chest: 0.9,
  upper_back: 1.05,
});

const STRENGTH_BEGINNER: LandmarkTable = scaleTable(STRENGTH_INTERMEDIATE, 0.85);
const STRENGTH_ADVANCED: LandmarkTable = scaleTable(STRENGTH_INTERMEDIATE, 1.1);

const FAT_LOSS_INTERMEDIATE: LandmarkTable = scaleTable(HYPERTROPHY_INTERMEDIATE, 0.65, {
  core: 1.2,
  quads: 1.05,
  hamstrings: 1.05,
});

const REHAB: LandmarkTable = scaleTable(HYPERTROPHY_INTERMEDIATE, 0.35, {
  lower_back: 1.5,
  core: 1.4,
});

function scaleTable(
  base: LandmarkTable,
  factor: number,
  bumps: Partial<Record<MuscleVolumeGroup, number>> = {},
): LandmarkTable {
  const out = {} as Record<MuscleVolumeGroup, VolumeLandmarks>;
  for (const g of MUSCLE_VOLUME_GROUPS) {
    const b = base[g];
    const bump = bumps[g] ?? 1;
    out[g] = {
      mev: round2(b.mev * factor * bump),
      mavLow: round2(b.mavLow * factor * bump),
      mavHigh: round2(b.mavHigh * factor * bump),
      mrv: round2(b.mrv * factor * bump),
    };
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 10) / 10;
}

export function calculateVolumeLandmarks(
  experience: ExperienceLevel,
  goal: TrainingGoal,
): Readonly<Record<MuscleVolumeGroup, VolumeLandmarks>> {
  const table = pickBaseTable(goal, experience);
  return { ...table };
}

function pickBaseTable(goal: TrainingGoal, exp: ExperienceLevel): LandmarkTable {
  if (goal === 'rehab') return REHAB;
  if (goal === 'fat_loss') {
    return exp === 'beginner' ? scaleTable(FAT_LOSS_INTERMEDIATE, 0.9) : FAT_LOSS_INTERMEDIATE;
  }
  if (goal === 'strength') {
    if (exp === 'beginner') return STRENGTH_BEGINNER;
    if (exp === 'intermediate') return STRENGTH_INTERMEDIATE;
    if (exp === 'advanced' || exp === 'elite') return STRENGTH_ADVANCED;
    return STRENGTH_INTERMEDIATE;
  }
  if (goal === 'general') {
    return scaleTable(HYPERTROPHY_INTERMEDIATE, 0.85);
  }
  /** hypertrophy default */
  if (exp === 'beginner') return HYPERTROPHY_BEGINNER;
  if (exp === 'intermediate') return HYPERTROPHY_INTERMEDIATE;
  if (exp === 'advanced') return HYPERTROPHY_ADVANCED;
  return HYPERTROPHY_ELITE;
}
