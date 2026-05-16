/**
 * Analytics event contracts — single source of truth for the client telemetry SDK
 * and the backend ingestion endpoint.
 *
 * Naming convention: `<domain>.<entity>.<action>` in snake_case.
 *  - `domain`   = product surface or system (auth, onboarding, workout, screen, perf, sync, ux, error).
 *  - `entity`   = optional sub-noun (set, exercise, rest, queue).
 *  - `action`   = verb in past tense (started, completed, skipped, failed, viewed).
 *
 * Rules:
 *  1. Events are immutable past-tense facts. No "is_*" / "current_*" properties.
 *  2. Property keys are snake_case. Values must be JSON-serializable primitives.
 *  3. PII is never put in property values. User identity travels in the wrapper.
 *  4. Adding a new event = adding it to `AnalyticsEvent`. The discriminated union
 *     forces compile-time exhaustiveness across the SDK and dashboards.
 *  5. Backwards-incompatible changes use a new event name. Never reshape existing
 *     events in place.
 */

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type TrainingGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general' | 'rehab';
export type ReadinessBand = 'green' | 'yellow' | 'red';

export type AnalyticsCategory =
  | 'app'
  | 'auth'
  | 'onboarding'
  | 'screen'
  | 'workout'
  | 'progression'
  | 'sync'
  | 'feature'
  | 'notification'
  | 'perf'
  | 'ux'
  | 'error';

interface BaseEvent<TName extends string, TProps extends Record<string, unknown>> {
  readonly name: TName;
  readonly category: AnalyticsCategory;
  readonly properties: TProps;
}

// -----------------------------------------------------------------------------
// app lifecycle
// -----------------------------------------------------------------------------

export type AppSessionStarted = BaseEvent<
  'app.session.started',
  {
    readonly cold_start: boolean;
    readonly app_version: string;
    readonly os: 'ios' | 'android';
    readonly os_version: string;
    readonly locale: string;
  }
>;

export type AppSessionEnded = BaseEvent<
  'app.session.ended',
  {
    readonly duration_ms: number;
    readonly screens_viewed: number;
  }
>;

export type AppForegrounded = BaseEvent<
  'app.foregrounded',
  { readonly background_ms: number }
>;

export type AppBackgrounded = BaseEvent<'app.backgrounded', Record<string, never>>;

// -----------------------------------------------------------------------------
// auth
// -----------------------------------------------------------------------------

export type AuthSignInSucceeded = BaseEvent<
  'auth.signin.succeeded',
  { readonly method: 'password' | 'apple' | 'google' }
>;

export type AuthSignInFailed = BaseEvent<
  'auth.signin.failed',
  { readonly method: 'password' | 'apple' | 'google'; readonly reason: string }
>;

export type AuthSignUpSucceeded = BaseEvent<
  'auth.signup.succeeded',
  { readonly method: 'password' | 'apple' | 'google' }
>;

export type AuthSignOut = BaseEvent<'auth.signed_out', Record<string, never>>;

// -----------------------------------------------------------------------------
// onboarding
// -----------------------------------------------------------------------------

export type OnboardingStarted = BaseEvent<'onboarding.started', Record<string, never>>;

export type OnboardingStepViewed = BaseEvent<
  'onboarding.step.viewed',
  { readonly step_index: number; readonly step_key: string }
>;

export type OnboardingStepCompleted = BaseEvent<
  'onboarding.step.completed',
  { readonly step_index: number; readonly step_key: string; readonly duration_ms: number }
>;

export type OnboardingStepBackTracked = BaseEvent<
  'onboarding.step.back_tracked',
  { readonly from_step: number; readonly to_step: number }
>;

export type OnboardingCompleted = BaseEvent<
  'onboarding.completed',
  {
    readonly training_goal: TrainingGoal;
    readonly experience_level: ExperienceLevel;
    readonly training_days: number;
    readonly session_duration_min: number;
    readonly total_duration_ms: number;
  }
>;

export type OnboardingAbandoned = BaseEvent<
  'onboarding.abandoned',
  { readonly last_step_index: number; readonly last_step_key: string; readonly duration_ms: number }
>;

// -----------------------------------------------------------------------------
// screen
// -----------------------------------------------------------------------------

export type ScreenViewed = BaseEvent<
  'screen.viewed',
  {
    readonly screen: string;
    readonly previous_screen: string | null;
    readonly time_to_interactive_ms: number | null;
  }
>;

// -----------------------------------------------------------------------------
// workout lifecycle
// -----------------------------------------------------------------------------

export type WorkoutStarted = BaseEvent<
  'workout.started',
  {
    readonly workout_day_id: string;
    readonly plan_version_id: string;
    readonly week_number: number;
    readonly is_deload_week: boolean;
    readonly planned_exercise_count: number;
    readonly planned_set_count: number;
    readonly source: 'dashboard' | 'history' | 'notification' | 'deeplink';
  }
>;

export type WorkoutPaused = BaseEvent<
  'workout.paused',
  { readonly workout_day_id: string; readonly elapsed_ms: number }
>;

export type WorkoutResumed = BaseEvent<
  'workout.resumed',
  { readonly workout_day_id: string; readonly paused_ms: number }
>;

export type WorkoutCancelled = BaseEvent<
  'workout.cancelled',
  {
    readonly workout_day_id: string;
    readonly elapsed_ms: number;
    readonly completed_set_count: number;
    readonly planned_set_count: number;
  }
>;

export type WorkoutCompleted = BaseEvent<
  'workout.completed',
  {
    readonly workout_day_id: string;
    readonly session_id: string | null;
    readonly duration_minutes: number;
    readonly adherence_score: number;
    readonly completed_set_count: number;
    readonly planned_set_count: number;
    readonly skipped_exercise_count: number;
    readonly volume_kg: number;
    readonly pr_count: number;
    readonly readiness_band: ReadinessBand | null;
    readonly deload_triggered: boolean;
    readonly synced: boolean;
  }
>;

export type WorkoutSetCompleted = BaseEvent<
  'workout.set.completed',
  {
    readonly workout_day_id: string;
    readonly exercise_slug: string;
    readonly exercise_index: number;
    readonly set_index: number;
    readonly target_reps_min: number;
    readonly target_reps_max: number;
    readonly target_load_kg: number | null;
    readonly completed_reps: number;
    readonly load_kg: number | null;
    readonly actual_rpe: number | null;
    readonly hit_target: boolean;
    readonly time_to_log_ms: number;
  }
>;

export type WorkoutSetSkipped = BaseEvent<
  'workout.set.skipped',
  {
    readonly workout_day_id: string;
    readonly exercise_slug: string;
    readonly set_index: number;
    readonly reason: 'fatigue' | 'pain' | 'equipment' | 'time' | 'other';
  }
>;

export type WorkoutSetMissedTarget = BaseEvent<
  'workout.set.missed_target',
  {
    readonly workout_day_id: string;
    readonly exercise_slug: string;
    readonly set_index: number;
    readonly target_reps_min: number;
    readonly completed_reps: number;
    readonly delta_reps: number;
  }
>;

export type WorkoutExerciseSkipped = BaseEvent<
  'workout.exercise.skipped',
  {
    readonly workout_day_id: string;
    readonly exercise_slug: string;
    readonly exercise_index: number;
    readonly reason: 'equipment' | 'pain' | 'time' | 'preference' | 'other';
  }
>;

export type WorkoutExerciseReplaced = BaseEvent<
  'workout.exercise.replaced',
  {
    readonly workout_day_id: string;
    readonly original_slug: string;
    readonly replacement_slug: string;
    readonly reason: 'equipment' | 'pain' | 'preference' | 'other';
  }
>;

export type WorkoutRestStarted = BaseEvent<
  'workout.rest.started',
  { readonly workout_day_id: string; readonly planned_seconds: number }
>;

export type WorkoutRestExtended = BaseEvent<
  'workout.rest.extended',
  { readonly workout_day_id: string; readonly added_seconds: number; readonly remaining_seconds: number }
>;

export type WorkoutRestSkipped = BaseEvent<
  'workout.rest.skipped',
  { readonly workout_day_id: string; readonly remaining_seconds: number }
>;

export type WorkoutPainReported = BaseEvent<
  'workout.pain.reported',
  {
    readonly workout_day_id: string;
    readonly exercise_slug: string;
    readonly pain_score: number;
    readonly action_taken: 'continue' | 'reduce_load' | 'replace' | 'stop_exercise';
  }
>;

// -----------------------------------------------------------------------------
// progression
// -----------------------------------------------------------------------------

export type ProgressionPRDetected = BaseEvent<
  'progression.pr.detected',
  {
    readonly exercise_slug: string;
    readonly type: 'estimated_1rm' | 'max_weight_single' | 'session_volume';
    readonly value: number;
    readonly previous_value: number | null;
    readonly unit: string;
  }
>;

export type ProgressionDeloadApplied = BaseEvent<
  'progression.deload.applied',
  {
    readonly reason: string;
    readonly week_number: number;
    readonly forced: boolean;
  }
>;

export type ProgressionStallDetected = BaseEvent<
  'progression.stall.detected',
  {
    readonly exercise_slug: string;
    readonly consecutive_sessions: number;
    readonly suggested_action: 'deload' | 'replace' | 'maintain';
  }
>;

export type ProgressionPlanGenerated = BaseEvent<
  'progression.plan.generated',
  {
    readonly plan_id: string;
    readonly version_id: string;
    readonly split: string;
    readonly training_days: number;
    readonly mesocycle_weeks: number;
    readonly is_first_plan: boolean;
  }
>;

// -----------------------------------------------------------------------------
// sync / offline
// -----------------------------------------------------------------------------

export type SyncQueueEnqueued = BaseEvent<
  'sync.queue.enqueued',
  { readonly kind: string; readonly queue_size_after: number }
>;

export type SyncQueueFlushed = BaseEvent<
  'sync.queue.flushed',
  {
    readonly reason: 'foreground' | 'online' | 'interval' | 'boot';
    readonly processed: number;
    readonly succeeded: number;
    readonly remaining: number;
  }
>;

export type SyncFailed = BaseEvent<
  'sync.failed',
  {
    readonly kind: string;
    readonly attempt: number;
    readonly error_kind: string;
    readonly status: number | null;
  }
>;

export type SyncDropped = BaseEvent<
  'sync.dropped',
  { readonly kind: string; readonly attempt: number; readonly reason: 'non_retryable' | 'max_attempts' }
>;

// -----------------------------------------------------------------------------
// notifications
// -----------------------------------------------------------------------------

export type NotificationReceived = BaseEvent<
  'notification.received',
  { readonly notification_id: string; readonly type: string }
>;

export type NotificationOpened = BaseEvent<
  'notification.opened',
  { readonly notification_id: string; readonly type: string }
>;

// -----------------------------------------------------------------------------
// feature adoption
// -----------------------------------------------------------------------------

export type FeatureUsed = BaseEvent<
  'feature.used',
  { readonly feature_key: string; readonly value?: string | number | boolean }
>;

// -----------------------------------------------------------------------------
// performance
// -----------------------------------------------------------------------------

export type PerfApiLatency = BaseEvent<
  'perf.api_latency',
  {
    readonly endpoint: string;
    readonly method: string;
    readonly status: number;
    readonly duration_ms: number;
  }
>;

export type PerfScreenLoad = BaseEvent<
  'perf.screen_load',
  { readonly screen: string; readonly time_to_interactive_ms: number }
>;

// -----------------------------------------------------------------------------
// UX signals
// -----------------------------------------------------------------------------

export type UxRageTap = BaseEvent<
  'ux.rage_tap',
  {
    readonly screen: string;
    readonly target: string;
    readonly tap_count: number;
    readonly window_ms: number;
  }
>;

export type UxKeyboardFrustration = BaseEvent<
  'ux.keyboard_frustration',
  { readonly screen: string; readonly field: string; readonly clear_count: number }
>;

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

export type ErrorApi = BaseEvent<
  'error.api',
  {
    readonly endpoint: string;
    readonly status: number | null;
    readonly error_kind: string;
    readonly trace_id?: string;
  }
>;

export type ErrorAppCrash = BaseEvent<
  'error.app.crashed',
  { readonly fatal: boolean; readonly stack_hash: string }
>;

// -----------------------------------------------------------------------------
// Discriminated union
// -----------------------------------------------------------------------------

export type AnalyticsEvent =
  | AppSessionStarted
  | AppSessionEnded
  | AppForegrounded
  | AppBackgrounded
  | AuthSignInSucceeded
  | AuthSignInFailed
  | AuthSignUpSucceeded
  | AuthSignOut
  | OnboardingStarted
  | OnboardingStepViewed
  | OnboardingStepCompleted
  | OnboardingStepBackTracked
  | OnboardingCompleted
  | OnboardingAbandoned
  | ScreenViewed
  | WorkoutStarted
  | WorkoutPaused
  | WorkoutResumed
  | WorkoutCancelled
  | WorkoutCompleted
  | WorkoutSetCompleted
  | WorkoutSetSkipped
  | WorkoutSetMissedTarget
  | WorkoutExerciseSkipped
  | WorkoutExerciseReplaced
  | WorkoutRestStarted
  | WorkoutRestExtended
  | WorkoutRestSkipped
  | WorkoutPainReported
  | ProgressionPRDetected
  | ProgressionDeloadApplied
  | ProgressionStallDetected
  | ProgressionPlanGenerated
  | SyncQueueEnqueued
  | SyncQueueFlushed
  | SyncFailed
  | SyncDropped
  | NotificationReceived
  | NotificationOpened
  | FeatureUsed
  | PerfApiLatency
  | PerfScreenLoad
  | UxRageTap
  | UxKeyboardFrustration
  | ErrorApi
  | ErrorAppCrash;

export type AnalyticsEventName = AnalyticsEvent['name'];

/**
 * Wire-level envelope for a single tracked event. Created by the mobile SDK,
 * accepted by `POST /v1/analytics/events`, stored in `public.analytics_events`.
 */
export interface AnalyticsEventEnvelope {
  readonly event_id: string;
  readonly name: AnalyticsEventName;
  readonly category: AnalyticsCategory;
  readonly properties: Record<string, unknown>;
  readonly occurred_at: string;
  readonly client_session_id: string;
  readonly app_version: string;
  readonly os: 'ios' | 'android';
  readonly os_version: string;
  readonly locale: string;
  readonly schema_version: 1;
}
