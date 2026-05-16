/**
 * Centralized query key factory.
 * Keep keys hierarchical so React Query can target invalidations precisely.
 */
export const qk = {
  profile: () => ['profile'] as const,
  dashboard: () => ['dashboard'] as const,
  plans: {
    active: () => ['plans', 'active'] as const,
    activeFull: () => ['plans', 'active', 'full'] as const,
    byId: (id: string) => ['plans', 'detail', id] as const,
  },
  workouts: {
    todays: () => ['workouts', 'todays'] as const,
    byDay: (workoutDayId: string) => ['workouts', 'day', workoutDayId] as const,
    history: () => ['workouts', 'history'] as const,
    detail: (sessionId: string) => ['workouts', 'session', sessionId] as const,
  },
  exercises: {
    catalog: () => ['exercises', 'catalog'] as const,
    bySlug: (slug: string) => ['exercises', slug] as const,
  },
  analytics: {
    overview: (range: string) => ['analytics', 'overview', range] as const,
    prs: () => ['analytics', 'prs'] as const,
    measurements: () => ['analytics', 'measurements'] as const,
  },
} as const;
