-- =============================================================================
-- App Schede - PostgreSQL schema (Supabase-ready)
-- Production-oriented: UUID PKs, enums, indexes, versioning, i18n hooks
-- Apply after Supabase project creation; run as postgres or via migration tool
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";   -- case-insensitive username

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM (
  'athlete',
  'coach',
  'admin'
);

CREATE TYPE public.gender AS ENUM (
  'male',
  'female',
  'non_binary',
  'prefer_not_say',
  'unknown'
);

CREATE TYPE public.goal_category AS ENUM (
  'fat_loss',
  'muscle_gain',
  'strength',
  'endurance',
  'general_fitness',
  'sport_specific',
  'rehab'
);

CREATE TYPE public.goal_status AS ENUM (
  'active',
  'completed',
  'paused',
  'cancelled'
);

CREATE TYPE public.plan_status AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE public.plan_version_status AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE public.workout_session_status AS ENUM (
  'in_progress',
  'completed',
  'abandoned',
  'paused'
);

CREATE TYPE public.coach_client_status AS ENUM (
  'pending',
  'active',
  'paused',
  'ended'
);

CREATE TYPE public.pr_record_type AS ENUM (
  'estimated_1rm',
  'max_weight_single',
  'max_reps_at_weight',
  'max_volume_set',
  'max_volume_session',
  'time_hold',
  'distance'
);

CREATE TYPE public.notification_kind AS ENUM (
  'workout_reminder',
  'coach_message',
  'plan_updated',
  'pr_achieved',
  'system',
  'marketing'
);

CREATE TYPE public.notification_channel AS ENUM (
  'in_app',
  'push',
  'email'
);

CREATE TYPE public.measurement_site AS ENUM (
  'weight_body',
  'body_fat_pct',
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hips',
  'bicep_left',
  'bicep_right',
  'thigh_left',
  'thigh_right',
  'calf_left',
  'calf_right',
  'forearm_left',
  'forearm_right',
  'custom'
);

CREATE TYPE public.measurement_unit AS ENUM (
  'kg',
  'lb',
  'cm',
  'in',
  'pct',
  'mm',
  's',
  'm'
);

CREATE TYPE public.equipment_type AS ENUM (
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'band',
  'bodyweight',
  'smith_machine',
  'other'
);

CREATE TYPE public.movement_pattern AS ENUM (
  'squat',
  'hinge',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'carry',
  'core_anti_extension',
  'core_anti_rotation',
  'other'
);

CREATE TYPE public.ai_generation_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TYPE public.analytics_event_category AS ENUM (
  'screen_view',
  'workout',
  'social',
  'subscription',
  'experiment',
  'performance',
  'other'
);

-- -----------------------------------------------------------------------------
-- Timestamp helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1) Users / profiles (Supabase: link profiles.id -> auth.users.id)
-- =============================================================================
CREATE TABLE public.profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name      text,
  username          citext UNIQUE,
  role              public.user_role NOT NULL DEFAULT 'athlete',
  gender            public.gender NOT NULL DEFAULT 'unknown',
  birth_date        date,
  height_cm         numeric(5, 2),
  locale            text NOT NULL DEFAULT 'it-IT'
    CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone          text NOT NULL DEFAULT 'Europe/Rome',
  avatar_url        text,
  onboarding_done   boolean NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_username_len CHECK (username IS NULL OR char_length(username::text) >= 3)
);

CREATE INDEX idx_profiles_role ON public.profiles (role) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_locale ON public.profiles (locale) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

COMMENT ON TABLE public.profiles IS 'Application profile; PK mirrors auth.users.id';

-- Optional: separate athlete-specific attributes to avoid wide profiles
CREATE TABLE public.athlete_profiles (
  user_id                   uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  training_experience       text CHECK (training_experience IN ('beginner','intermediate','advanced','elite')),
  weekly_availability_days  smallint CHECK (weekly_availability_days BETWEEN 0 AND 7),
  injuries_notes            text,
  preferred_units           text NOT NULL DEFAULT 'metric' CHECK (preferred_units IN ('metric','imperial')),
  created_at                timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at                timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_athlete_profiles_updated_at
BEFORE UPDATE ON public.athlete_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================================================
-- 2) Fitness goals
-- =============================================================================
CREATE TABLE public.user_fitness_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category        public.goal_category NOT NULL,
  title           text NOT NULL,
  description     text,
  target_value    numeric(12, 4),
  target_unit     public.measurement_unit,
  target_date     date,
  status          public.goal_status NOT NULL DEFAULT 'active',
  priority        smallint NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at      timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_user_fitness_goals_user_status
  ON public.user_fitness_goals (user_id, status);
CREATE INDEX idx_user_fitness_goals_category
  ON public.user_fitness_goals (category);

CREATE TRIGGER trg_user_fitness_goals_updated_at
BEFORE UPDATE ON public.user_fitness_goals
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================================================
-- 3) Exercises + variations + i18n (multi-language)
-- =============================================================================
CREATE TABLE public.exercises (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  is_custom             boolean NOT NULL DEFAULT false,
  created_by_user_id    uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  equipment             public.equipment_type,
  pattern               public.movement_pattern,
  is_unilateral         boolean NOT NULL DEFAULT false,
  video_url             text,
  thumbnail_url         text,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at            timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT exercises_custom_owner_chk CHECK (
    (is_custom = false AND created_by_user_id IS NULL)
    OR (is_custom = true AND created_by_user_id IS NOT NULL)
  )
);

CREATE INDEX idx_exercises_custom_owner ON public.exercises (created_by_user_id)
  WHERE is_custom = true;
CREATE INDEX idx_exercises_equipment ON public.exercises (equipment);

CREATE TRIGGER trg_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.exercise_translations (
  exercise_id   uuid NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  locale        text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name          text NOT NULL,
  description   text,
  coaching_cues text,
  PRIMARY KEY (exercise_id, locale)
);

CREATE INDEX idx_exercise_translations_locale ON public.exercise_translations (locale);

CREATE TABLE public.exercise_variations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_exercise_id   uuid NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  slug               text NOT NULL UNIQUE,
  sort_order         int NOT NULL DEFAULT 0,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at         timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_exercise_variations_base ON public.exercise_variations (base_exercise_id);

CREATE TRIGGER trg_exercise_variations_updated_at
BEFORE UPDATE ON public.exercise_variations
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.exercise_variation_translations (
  variation_id  uuid NOT NULL REFERENCES public.exercise_variations (id) ON DELETE CASCADE,
  locale        text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name          text NOT NULL,
  description   text,
  PRIMARY KEY (variation_id, locale)
);

-- Many-to-many: which muscles are primary/secondary (optional normalized tagging)
CREATE TABLE public.muscle_tags (
  id     smallserial PRIMARY KEY,
  code   citext NOT NULL UNIQUE
);

CREATE TABLE public.exercise_muscles (
  exercise_id   uuid NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  muscle_id     smallint NOT NULL REFERENCES public.muscle_tags (id) ON DELETE CASCADE,
  is_primary    boolean NOT NULL DEFAULT true,
  PRIMARY KEY (exercise_id, muscle_id)
);

CREATE INDEX idx_exercise_muscles_muscle ON public.exercise_muscles (muscle_id);

-- =============================================================================
-- 4) Workout plans + versioning (immutable published versions)
-- =============================================================================
CREATE TABLE public.workout_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  coach_user_id   uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  status          public.plan_status NOT NULL DEFAULT 'draft',
  source          text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','template','ai','import')),
  tags            text[] NOT NULL DEFAULT '{}',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at      timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_workout_plans_owner ON public.workout_plans (owner_user_id);
CREATE INDEX idx_workout_plans_coach ON public.workout_plans (coach_user_id);
CREATE INDEX idx_workout_plans_status ON public.workout_plans (status);

CREATE TRIGGER trg_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.workout_plan_versions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            uuid NOT NULL REFERENCES public.workout_plans (id) ON DELETE CASCADE,
  version_number     int NOT NULL,
  status             public.plan_version_status NOT NULL DEFAULT 'draft',
  is_current         boolean NOT NULL DEFAULT false,
  effective_from     date,
  effective_to       date,
  changelog          text,
  created_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  published_at       timestamptz,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (plan_id, version_number)
);

CREATE INDEX idx_workout_plan_versions_plan ON public.workout_plan_versions (plan_id);
CREATE INDEX idx_workout_plan_versions_status ON public.workout_plan_versions (status);
CREATE INDEX idx_workout_plan_versions_plan_current
  ON public.workout_plan_versions (plan_id)
  WHERE is_current;

-- Exactly one "current" snapshot per plan (the athlete trains against this row).
CREATE UNIQUE INDEX uq_workout_plan_version_current
  ON public.workout_plan_versions (plan_id)
  WHERE is_current;

CREATE TRIGGER trg_workout_plan_versions_updated_at
BEFORE UPDATE ON public.workout_plan_versions
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.workout_weeks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id    uuid NOT NULL REFERENCES public.workout_plan_versions (id) ON DELETE CASCADE,
  week_index    smallint NOT NULL CHECK (week_index > 0),
  name          text,
  notes         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (version_id, week_index)
);

CREATE INDEX idx_workout_weeks_version ON public.workout_weeks (version_id);

CREATE TABLE public.workout_days (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id       uuid NOT NULL REFERENCES public.workout_weeks (id) ON DELETE CASCADE,
  day_index     smallint NOT NULL CHECK (day_index > 0),
  name          text,
  notes         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (week_id, day_index)
);

CREATE INDEX idx_workout_days_week ON public.workout_days (week_id);

CREATE TABLE public.workout_exercises (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id               uuid NOT NULL REFERENCES public.workout_days (id) ON DELETE CASCADE,
  exercise_id          uuid NOT NULL REFERENCES public.exercises (id) ON DELETE RESTRICT,
  variation_id         uuid REFERENCES public.exercise_variations (id) ON DELETE SET NULL,
  position             smallint NOT NULL CHECK (position > 0),
  superset_group       smallint,
  prescription         jsonb NOT NULL DEFAULT '{}'::jsonb,
  coach_notes          text,
  athlete_notes        text,
  created_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (day_id, position)
);

CREATE INDEX idx_workout_exercises_day ON public.workout_exercises (day_id);
CREATE INDEX idx_workout_exercises_exercise ON public.workout_exercises (exercise_id);

CREATE TABLE public.workout_sets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id  uuid NOT NULL REFERENCES public.workout_exercises (id) ON DELETE CASCADE,
  set_index            smallint NOT NULL CHECK (set_index > 0),
  set_type             text NOT NULL DEFAULT 'working'
    CHECK (set_type IN ('warmup','working','dropset','myo','cluster','amrap','emom')),
  target_reps_min      smallint,
  target_reps_max      smallint,
  target_weight_kg     numeric(8, 3),
  target_rpe           numeric(3, 1),
  target_distance_m    numeric(10, 2),
  target_duration_s    int,
  rest_seconds         int,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (workout_exercise_id, set_index)
);

CREATE INDEX idx_workout_sets_we ON public.workout_sets (workout_exercise_id);

-- =============================================================================
-- 5) Sessions + logs (tracking allenamenti)
-- =============================================================================
CREATE TABLE public.workout_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_version_id    uuid REFERENCES public.workout_plan_versions (id) ON DELETE SET NULL,
  workout_day_id     uuid REFERENCES public.workout_days (id) ON DELETE SET NULL,
  status             public.workout_session_status NOT NULL DEFAULT 'in_progress',
  started_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ended_at           timestamptz,
  duration_seconds   int GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at))::int)
    END
  ) STORED,
  perceived_exertion smallint CHECK (perceived_exertion BETWEEN 1 AND 10),
  notes              text,
  device_metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at         timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_workout_sessions_user_started
  ON public.workout_sessions (user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_plan_version
  ON public.workout_sessions (plan_version_id);
CREATE INDEX idx_workout_sessions_status
  ON public.workout_sessions (user_id, status)
  WHERE status = 'in_progress';

CREATE TRIGGER trg_workout_sessions_updated_at
BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.exercise_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES public.workout_sessions (id) ON DELETE CASCADE,
  workout_exercise_id  uuid REFERENCES public.workout_exercises (id) ON DELETE SET NULL,
  exercise_id          uuid NOT NULL REFERENCES public.exercises (id) ON DELETE RESTRICT,
  variation_id         uuid REFERENCES public.exercise_variations (id) ON DELETE SET NULL,
  workout_set_id       uuid REFERENCES public.workout_sets (id) ON DELETE SET NULL,
  set_index            smallint NOT NULL CHECK (set_index > 0),
  set_type             text NOT NULL DEFAULT 'working'
    CHECK (set_type IN ('warmup','working','dropset','myo','cluster','amrap','emom')),
  reps_completed       smallint CHECK (reps_completed >= 0),
  weight_kg            numeric(10, 3),
  rpe                  numeric(3, 1),
  distance_m           numeric(12, 2),
  duration_s           int,
  is_pr_attempt        boolean NOT NULL DEFAULT false,
  completed            boolean NOT NULL DEFAULT false,
  notes                text,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_exercise_logs_session ON public.exercise_logs (session_id);
CREATE INDEX idx_exercise_logs_exercise ON public.exercise_logs (exercise_id);
CREATE INDEX idx_exercise_logs_session_exercise
  ON public.exercise_logs (session_id, exercise_id, set_index);

-- =============================================================================
-- 6) Load progression suggestions (optional denormalized cache; source of truth = logs)
-- =============================================================================
CREATE TABLE public.exercise_progression_state (
  user_id              uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  exercise_id          uuid NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  last_session_id      uuid REFERENCES public.workout_sessions (id) ON DELETE SET NULL,
  last_weight_kg       numeric(10, 3),
  last_reps            smallint,
  last_rpe             numeric(3, 1),
  suggested_weight_kg  numeric(10, 3),
  suggested_reps_min   smallint,
  suggested_reps_max   smallint,
  updated_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, exercise_id)
);

CREATE TRIGGER trg_exercise_progression_state_updated_at
BEFORE UPDATE ON public.exercise_progression_state
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================================================
-- 7) Body measurements + weight (normalized rows per site)
-- =============================================================================
CREATE TABLE public.body_measurement_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  recorded_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  source       text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','device','import')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_body_measurement_sessions_user_time
  ON public.body_measurement_sessions (user_id, recorded_at DESC);

CREATE TABLE public.body_measurements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.body_measurement_sessions (id) ON DELETE CASCADE,
  site          public.measurement_site NOT NULL,
  value         numeric(12, 4) NOT NULL,
  unit          public.measurement_unit NOT NULL,
  custom_label  text,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT body_measurements_custom_label_chk CHECK (
    (site <> 'custom' AND custom_label IS NULL)
    OR (site = 'custom' AND custom_label IS NOT NULL)
  )
);

CREATE INDEX idx_body_measurements_session ON public.body_measurements (session_id);
CREATE INDEX idx_body_measurements_site ON public.body_measurements (site);

-- =============================================================================
-- 8) Progress photos (binary in Supabase Storage; DB holds metadata)
-- =============================================================================
CREATE TABLE public.progress_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  storage_bucket  text NOT NULL DEFAULT 'progress_photos',
  storage_path    text NOT NULL,
  taken_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),
  weight_kg       numeric(8, 3),
  visibility      text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','coach','public')),
  caption         text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX idx_progress_photos_user_taken ON public.progress_photos (user_id, taken_at DESC);

-- =============================================================================
-- 9) Personal records
-- =============================================================================
CREATE TABLE public.personal_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  exercise_id      uuid NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  record_type      public.pr_record_type NOT NULL,
  value_primary    numeric(14, 4) NOT NULL,
  value_secondary  numeric(14, 4),
  unit_primary     public.measurement_unit NOT NULL,
  unit_secondary   public.measurement_unit,
  achieved_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  session_id       uuid REFERENCES public.workout_sessions (id) ON DELETE SET NULL,
  log_id           uuid REFERENCES public.exercise_logs (id) ON DELETE SET NULL,
  is_estimated     boolean NOT NULL DEFAULT false,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_personal_records_user_exercise
  ON public.personal_records (user_id, exercise_id, achieved_at DESC);
CREATE INDEX idx_personal_records_type ON public.personal_records (record_type);

-- =============================================================================
-- 10) Coach / client
-- =============================================================================
CREATE TABLE public.coaches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  bio         text,
  credentials text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_coaches_updated_at
BEFORE UPDATE ON public.coaches
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.coach_clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid NOT NULL REFERENCES public.coaches (id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  status          public.coach_client_status NOT NULL DEFAULT 'pending',
  invited_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  responded_at    timestamptz,
  ended_at        timestamptz,
  notes           text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (coach_id, client_id)
);

CREATE INDEX idx_coach_clients_coach ON public.coach_clients (coach_id, status);
CREATE INDEX idx_coach_clients_client ON public.coach_clients (client_id, status);

-- =============================================================================
-- 11) Notifications
-- =============================================================================
CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  kind         public.notification_kind NOT NULL,
  channel      public.notification_channel NOT NULL DEFAULT 'in_app',
  title        text NOT NULL,
  body         text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at      timestamptz,
  delivered_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE public.notification_preferences (
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  channel    public.notification_channel NOT NULL,
  enabled    boolean NOT NULL DEFAULT true,
  quiet_hours jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, channel)
);

CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================================================
-- 12) AI workout generation (future-ready)
-- =============================================================================
CREATE TABLE public.ai_workout_generations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status             public.ai_generation_status NOT NULL DEFAULT 'queued',
  model              text,
  prompt_version     text,
  input              jsonb NOT NULL,
  output             jsonb,
  error              text,
  result_plan_id     uuid REFERENCES public.workout_plans (id) ON DELETE SET NULL,
  result_version_id  uuid REFERENCES public.workout_plan_versions (id) ON DELETE SET NULL,
  tokens_prompt      int,
  tokens_completion  int,
  created_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at       timestamptz
);

CREATE INDEX idx_ai_workout_generations_user
  ON public.ai_workout_generations (user_id, created_at DESC);
CREATE INDEX idx_ai_workout_generations_status
  ON public.ai_workout_generations (status, created_at);

-- =============================================================================
-- 13) Analytics (event stream; partition in production at scale)
-- =============================================================================
CREATE TABLE public.analytics_events (
  id            bigserial PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  session_id    uuid,
  category      public.analytics_event_category NOT NULL,
  event_name    text NOT NULL,
  properties    jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  client_locale text,
  app_version   text
);

CREATE INDEX idx_analytics_events_user_time
  ON public.analytics_events (user_id, occurred_at DESC);
CREATE INDEX idx_analytics_events_name_time
  ON public.analytics_events (event_name, occurred_at DESC);

COMMENT ON TABLE public.analytics_events IS 'High-volume; consider Timescale/pg_partman partitioning by month';

COMMIT;
