import type {
  ExecutionAdaptationResult,
  ExecutionRepository,
  WorkoutHistory,
} from '../domain/execution.types';

export class InMemoryExecutionRepository implements ExecutionRepository {
  private readonly saved: { userId: string; result: ExecutionAdaptationResult }[] = [];

  constructor(private readonly historyByUser: Readonly<Record<string, WorkoutHistory>> = {}) {}

  async loadWorkoutHistory(userId: string): Promise<WorkoutHistory> {
    return this.historyByUser[userId] ?? { recentSessions: [], exerciseHistory: [] };
  }

  async saveAdaptationResult(userId: string, result: ExecutionAdaptationResult): Promise<void> {
    this.saved.push({ userId, result });
  }

  getSaved(): readonly { userId: string; result: ExecutionAdaptationResult }[] {
    return this.saved;
  }
}
