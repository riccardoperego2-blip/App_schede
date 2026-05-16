import type { FatigueAccumulation, ReadinessBand, WorkoutExecutionInput } from '../domain/execution.types';

export class FatigueAccumulationModel {
  evaluate(input: WorkoutExecutionInput): FatigueAccumulation {
    const sessions = input.workoutHistory.recentSessions.slice(-7);
    const loads = sessions.map((s) => {
      const rpe = s.sessionRpe ?? 7;
      const systemic = s.systemicFatigueEstimate ?? 12;
      return systemic * (rpe / 7) * Math.max(0.55, s.adherenceScore);
    });

    const current = (input.completedWorkout.sessionRpe ?? input.fatigueLevel) * 6;
    const allLoads = [...loads, current];
    const acuteLoad = round(allLoads.reduce((a, v) => a + v, 0));
    const mean = acuteLoad / Math.max(1, allLoads.length);
    const sd = Math.sqrt(allLoads.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, allLoads.length));
    const monotony = round(mean / Math.max(1, sd));
    const strain = round(acuteLoad * monotony);

    return {
      acuteLoad,
      monotony,
      strain,
      overreachingRisk: riskBand(strain, input.fatigueLevel, input.soreness),
    };
  }
}

function riskBand(strain: number, fatigue: number, soreness: number): ReadinessBand {
  if (strain >= 850 || (fatigue >= 8 && soreness >= 8)) return 'red';
  if (strain >= 650 || fatigue >= 8 || soreness >= 8) return 'orange';
  if (strain >= 450 || fatigue >= 6 || soreness >= 6) return 'yellow';
  return 'green';
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
