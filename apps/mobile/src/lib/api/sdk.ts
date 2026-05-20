import { http } from './http-client';
import type {
  ActivePlanFull,
  AnalyticsOverview,
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
  DashboardSummary,
  HistoryListResponse,
  PlannedWorkoutDetail,
  UserProfile,
} from './contracts';

/** Plan generation can take 20–90s+; keep other requests on the default 15s timeout. */
const PLAN_GENERATE_TIMEOUT_MS = 120_000;

export const api = {
  dashboard: {
    summary: () => http.get<DashboardSummary>('/dashboard/summary'),
  },
  plans: {
    generate: (input: unknown, idempotencyKey: string) =>
      http.post<{ planId: string; versionId: string }>('/plans/generate', input, {
        idempotencyKey,
        timeoutMs: PLAN_GENERATE_TIMEOUT_MS,
      }),
    active: () => http.get<{ planId: string; versionId: string }>('/plans/active'),
    activeFull: () => http.get<ActivePlanFull>('/plans/active/full'),
  },
  workouts: {
    todays: () => http.get<PlannedWorkoutDetail | null>('/workouts/today'),
    byDay: (workoutDayId: string) =>
      http.get<PlannedWorkoutDetail>(`/workouts/day/${workoutDayId}`),
    complete: (payload: CompleteWorkoutPayload, idempotencyKey: string) =>
      http.post<CompleteWorkoutResponse>('/workouts/complete', payload, { idempotencyKey }),
    history: (cursor?: string) =>
      http.get<HistoryListResponse>(
        cursor ? `/workouts/history?cursor=${encodeURIComponent(cursor)}` : '/workouts/history',
      ),
  },
  analytics: {
    overview: (range: '4w' | '12w' | '6m') =>
      http.get<AnalyticsOverview>(`/analytics/overview?range=${range}`),
  },
  profile: {
    me: () => http.get<UserProfile>('/me'),
    update: (patch: Partial<UserProfile>) => http.patch<UserProfile>('/me', patch),
  },
} as const;
