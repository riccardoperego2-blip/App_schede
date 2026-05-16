# Backend Application Layer

## Runtime Architecture

```text
React Native / Coach Dashboard
  -> NestJS API Gateway (apps/backend)
      -> Supabase Auth Guard (JWT verification)
      -> Application Services
          -> deterministic coaching engines
          -> PgUnitOfWork transaction
          -> repositories
          -> outbox events
      -> PostgreSQL / Supabase Storage / Realtime
      -> Event consumers: analytics, notifications, future workers
```

## Module Boundaries

- `PlansModule`: plan generation pipeline. It turns a validated request into a deterministic workout plan and persists `workout_plans`, `workout_plan_versions`, weeks, days, exercises and sets in one transaction.
- `WorkoutsModule`: workout execution pipeline. It loads the planned workout, stores execution logs, runs progression/readiness/deload engines and persists PRs/events atomically.
- `ExercisesModule`: catalog adapter. It maps normalized PostgreSQL exercise rows + JSONB biomechanics into `ExerciseCatalogEntry`.
- `AnalyticsModule`: event consumer for durable product/workout analytics.
- `NotificationsModule`: event consumer for in-app notifications; push/email can be added behind this module.
- `SupabaseModule`: Supabase Admin client, PostgreSQL pool and transaction boundary.

## Workout Lifecycle

```text
Generate plan
  POST /api/v1/plans/generate
  -> validate DTO
  -> auth user or active coach/client relation
  -> WorkoutGenerationEngine
  -> UnitOfWork
      -> insert plan/version/week/day/exercise/set
      -> append application_events: workout.plan.generated
  -> event listeners create analytics + notification

Execute workout
  POST /api/v1/workouts/complete
  -> load planned day
  -> insert workout_session + exercise_logs
  -> WorkoutExecutionEngine
      -> readiness
      -> performance comparison
      -> stall detection
      -> PR detection
      -> progression patch
      -> deload decision
  -> persist PRs + outbox event
```

## Sequence: Plan Generation

```text
Client -> PlansController
PlansController -> SupabaseAuthGuard
PlansController -> PlanGenerationService
PlanGenerationService -> SupabaseExerciseRepository: loadCatalog()
PlanGenerationService -> WorkoutGenerationEngine: generateWorkoutPlan()
PlanGenerationService -> PgUnitOfWork: BEGIN
PgUnitOfWork -> PlanRepository: saveGeneratedPlan()
PgUnitOfWork -> DomainEventBus: appendToOutbox()
PgUnitOfWork -> PostgreSQL: COMMIT
PlanGenerationService -> DomainEventBus: publish()
Analytics/Notifications -> PostgreSQL
```

## Sequence: Workout Completion

```text
Client -> WorkoutsController
WorkoutsController -> WorkoutExecutionService
WorkoutExecutionService -> PgUnitOfWork: BEGIN
WorkoutRepository -> PostgreSQL: load planned day
WorkoutRepository -> PostgreSQL: save session/logs
WorkoutExecutionEngine -> deterministic adaptation result
WorkoutExecutionService -> PostgreSQL: personal_records
WorkoutExecutionService -> application_events
PgUnitOfWork -> PostgreSQL: COMMIT
```

## Authorization

- Client calls backend with Supabase JWT.
- `SupabaseAuthGuard` verifies token using Supabase Admin API.
- User-owned writes rely on authenticated user id.
- Coach/client writes must pass `public.is_coach_for_athlete(coach, client)`.
- Database RLS remains enabled for client-facing direct Supabase access; backend uses service role + server-side authorization.

## Transactions / Unit of Work

Supabase JS is used for auth/storage/admin capabilities. Mutating domain workflows use direct PostgreSQL via `pg` because plan generation and workout completion require multi-table atomic commits.

## Event Pattern

The backend uses an outbox table `application_events` plus in-process `EventEmitter2`.

- Outbox = durable delivery for workers/retries.
- In-process events = immediate UX analytics/notification in simple deployments.
- At scale, add a worker that polls unpublished outbox rows with `FOR UPDATE SKIP LOCKED`, publishes to Redis/SQS, then marks `published_at`.

## API Examples

```http
POST /api/v1/plans/generate
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "trainingGoal": "hypertrophy",
  "experienceLevel": "intermediate",
  "trainingDays": 4,
  "sessionDurationMinutes": 70,
  "availableEquipment": ["barbell", "dumbbell", "machine", "cable"],
  "recoveryCapacity": 4,
  "preferredExercises": ["romanian_deadlift"],
  "excludedExercises": [],
  "weakMuscleGroups": ["hamstrings"],
  "priorityMuscleGroups": ["chest"],
  "mesocycleWeeks": 4
}
```

```http
POST /api/v1/workouts/complete
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "workoutDayId": "uuid",
  "completedAt": "2026-05-13T13:00:00.000Z",
  "durationMinutes": 62,
  "sessionRpe": 8,
  "sleepQuality": 7,
  "soreness": 4,
  "fatigueLevel": 5,
  "adherenceScore": 0.95,
  "trainingGoal": "hypertrophy",
  "experienceLevel": "intermediate",
  "progressionModel": "double_progression_reps_then_load",
  "exerciseLogs": [
    {
      "exerciseSlug": "flat_bench_press",
      "sets": [
        {
          "setIndex": 1,
          "targetRepsMin": 6,
          "targetRepsMax": 10,
          "completedReps": 10,
          "loadKg": 100,
          "actualRir": 2,
          "completed": true
        }
      ]
    }
  ]
}
```

## Realtime Strategy

- Use Supabase Realtime on `notifications`, `workout_sessions`, and `application_events` views.
- For live workout tracking, send client-side set updates to a lightweight endpoint or direct Supabase table write under RLS, then backend finalizes with `/complete`.
- Coach dashboards subscribe to client `workout_sessions` + generated analytics materialized views.

## Caching

- Cache exercise catalog by `catalog_version` in memory per backend instance.
- Optional Redis:
  - `exercise_catalog:v1`
  - `profile:{userId}:permissions`
  - `coach_dashboard:{coachId}:summary`
- Invalidate catalog cache on exercise admin changes/outbox event.

## Observability

- Structured logs with request id, user id, aggregate id.
- Metrics:
  - plan generation duration
  - workout completion duration
  - progression action counts
  - deload trigger counts
  - repository query latency
- Traces:
  - controller -> application service -> repository -> engine -> outbox.

## Deployment

- API: stateless NestJS container.
- Database: Supabase PostgreSQL.
- Storage: Supabase Storage for progress photos.
- Worker: optional separate NestJS command app for outbox, notifications, analytics aggregation.
- Redis: optional for queues/cache/rate limiting in high-traffic deployments.

## CI/CD

- `npm ci`
- `npm run build`
- `npm test`
- SQL migrations in order: `001` ... `006_backend_outbox.sql`
- Run migrations before API rollout.
- Add contract tests against a disposable Supabase/Postgres instance.

## Edge Cases

- Coach attempts client generation without active relation: forbidden.
- Exercise slug missing during persistence: transaction rolls back.
- Workout completion with stale `workoutDayId`: transaction fails before logs are written.
- PR insert failure: session/log insert rolls back with the adaptation event.
- Event consumer failure: outbox remains durable for retry.
