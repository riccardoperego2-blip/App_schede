-- =============================================================================
-- Row Level Security (Supabase) — apply after 001_initial_schema.sql
-- Tune policies for your product (coach dashboards, shared plans, etc.)
-- =============================================================================

BEGIN;

-- Helper: active coach–client link
CREATE OR REPLACE FUNCTION public.is_coach_for_athlete(p_coach uuid, p_athlete uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_clients cc
    JOIN public.coaches c ON c.id = cc.coach_id
    JOIN public.clients cl ON cl.id = cc.client_id
    WHERE c.user_id = p_coach
      AND cl.user_id = p_athlete
      AND cc.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_coach_for_athlete(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coach_for_athlete(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY athlete_profiles_crud_self ON public.athlete_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
ALTER TABLE public.user_fitness_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_goals_crud_self ON public.user_fitness_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Exercises: global read; custom exercises writable only by owner
-- -----------------------------------------------------------------------------
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercises_select_visible ON public.exercises
  FOR SELECT TO authenticated
  USING (
    is_custom = false
    OR created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
CREATE POLICY exercises_insert_custom ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    is_custom = true
    AND created_by_user_id = auth.uid()
  );
CREATE POLICY exercises_update_own_custom ON public.exercises
  FOR UPDATE TO authenticated
  USING (is_custom = true AND created_by_user_id = auth.uid())
  WITH CHECK (is_custom = true AND created_by_user_id = auth.uid());
CREATE POLICY exercises_delete_own_custom ON public.exercises
  FOR DELETE TO authenticated
  USING (is_custom = true AND created_by_user_id = auth.uid());

ALTER TABLE public.exercise_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_i18n_select ON public.exercise_translations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY exercise_i18n_maintainer ON public.exercise_translations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Similar pattern for variations (admin-maintained catalogue + optional user extensions later)
ALTER TABLE public.exercise_variations ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_variations_select ON public.exercise_variations
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.exercise_variation_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_variation_i18n_select ON public.exercise_variation_translations
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.muscle_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY muscle_tags_read ON public.muscle_tags FOR SELECT TO authenticated USING (true);

ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_muscles_read ON public.exercise_muscles FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_plans_owner_coach ON public.workout_plans
  FOR ALL TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR coach_user_id = auth.uid()
    OR public.is_coach_for_athlete(auth.uid(), owner_user_id)
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR coach_user_id = auth.uid()
    OR public.is_coach_for_athlete(auth.uid(), owner_user_id)
  );

-- Child tables: access via plan ownership (simplified with EXISTS)
ALTER TABLE public.workout_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_plan_versions_rw ON public.workout_plan_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_plan_versions.plan_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_plan_versions.plan_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  );

ALTER TABLE public.workout_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_weeks_rw ON public.workout_weeks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_versions v
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE v.id = workout_weeks.version_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_versions v
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE v.id = workout_weeks.version_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  );

ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_days_rw ON public.workout_days
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_weeks wk
      JOIN public.workout_plan_versions v ON v.id = wk.version_id
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE wk.id = workout_days.week_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_weeks wk
      JOIN public.workout_plan_versions v ON v.id = wk.version_id
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE wk.id = workout_days.week_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  );

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_exercises_rw ON public.workout_exercises
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_days d
      JOIN public.workout_weeks wk ON wk.id = d.week_id
      JOIN public.workout_plan_versions v ON v.id = wk.version_id
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE d.id = workout_exercises.day_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_days d
      JOIN public.workout_weeks wk ON wk.id = d.week_id
      JOIN public.workout_plan_versions v ON v.id = wk.version_id
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE d.id = workout_exercises.day_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  );

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_sets_rw ON public.workout_sets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_exercises we
      JOIN public.workout_days d ON d.id = we.day_id
      JOIN public.workout_weeks wk ON wk.id = d.week_id
      JOIN public.workout_plan_versions v ON v.id = wk.version_id
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE we.id = workout_sets.workout_exercise_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_exercises we
      JOIN public.workout_days d ON d.id = we.day_id
      JOIN public.workout_weeks wk ON wk.id = d.week_id
      JOIN public.workout_plan_versions v ON v.id = wk.version_id
      JOIN public.workout_plans wp ON wp.id = v.plan_id
      WHERE we.id = workout_sets.workout_exercise_id
        AND (
          wp.owner_user_id = auth.uid()
          OR wp.coach_user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), wp.owner_user_id)
        )
    )
  );

-- -----------------------------------------------------------------------------
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_sessions_rw_self ON public.workout_sessions
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_coach_for_athlete(auth.uid(), user_id)
  )
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_logs_rw ON public.exercise_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = exercise_logs.session_id
        AND (
          s.user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), s.user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = exercise_logs.session_id
        AND s.user_id = auth.uid()
    )
  );

ALTER TABLE public.exercise_progression_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_progression_self ON public.exercise_progression_state
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
ALTER TABLE public.body_measurement_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY body_ms_self ON public.body_measurement_sessions
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_coach_for_athlete(auth.uid(), user_id)
  )
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY body_m_self ON public.body_measurements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.body_measurement_sessions ms
      WHERE ms.id = body_measurements.session_id
        AND (
          ms.user_id = auth.uid()
          OR public.is_coach_for_athlete(auth.uid(), ms.user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.body_measurement_sessions ms
      WHERE ms.id = body_measurements.session_id
        AND ms.user_id = auth.uid()
    )
  );

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY progress_photos_self ON public.progress_photos
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      visibility = 'coach'
      AND public.is_coach_for_athlete(auth.uid(), user_id)
    )
  )
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_self ON public.personal_records
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_coach_for_athlete(auth.uid(), user_id)
  )
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY coaches_self ON public.coaches
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_self ON public.clients
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY coach_clients_participants ON public.coach_clients
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_clients.coach_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = coach_clients.client_id AND cl.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_clients.coach_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = coach_clients.client_id AND cl.user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_self ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_pref_self ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
ALTER TABLE public.ai_workout_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_gen_self ON public.ai_workout_generations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_insert_self ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY analytics_select_self ON public.analytics_events
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

COMMIT;
