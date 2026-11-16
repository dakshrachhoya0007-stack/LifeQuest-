-- ==============================================================================
-- LIFEQUEST AAA UPGRADE — PHASE 1: REAL-LIFE SKILL TREE
-- Additive, server-authoritative schema & SECURITY DEFINER RPCs
-- Keeps attribute XP/levels strictly separate from profiles.player_xp & gold.
-- Prevents duplicate activity rewards and enforces daily healthy XP ceilings.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABLES & INDEXES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_attribute_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL CHECK (
    attribute_id IN ('strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality')
  ),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  total_activities INTEGER NOT NULL DEFAULT 0 CHECK (total_activities >= 0),
  last_activity_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_player_attribute_progress_user
  ON public.player_attribute_progress(user_id);

CREATE TABLE IF NOT EXISTS public.player_skill_nodes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  attribute_id TEXT NOT NULL CHECK (
    attribute_id IN ('strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality')
  ),
  branch_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_player_skill_nodes_user_attr
  ON public.player_skill_nodes(user_id, attribute_id);

CREATE TABLE IF NOT EXISTS public.player_skill_milestones (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL,
  attribute_id TEXT NOT NULL CHECK (
    attribute_id IN ('strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality')
  ),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_player_skill_milestones_user
  ON public.player_skill_milestones(user_id);

CREATE TABLE IF NOT EXISTS public.skill_activity_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN (
      'strength_workout',
      'cardio_workout',
      'habit_completion',
      'study_session',
      'comeback_activity',
      'recovery_habit'
    )
  ),
  attribute_id TEXT NOT NULL CHECK (
    attribute_id IN ('strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality')
  ),
  source_type TEXT NOT NULL DEFAULT 'activity',
  source_id TEXT NOT NULL DEFAULT '',
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  safety_capped BOOLEAN NOT NULL DEFAULT false,
  daily_bucket TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_skill_activity_ledger_user_attr_day
  ON public.skill_activity_ledger(user_id, attribute_id, daily_bucket);

CREATE INDEX IF NOT EXISTS idx_skill_activity_ledger_user_created
  ON public.skill_activity_ledger(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (STRICT OWNER-ONLY READ; SERVER RPC WRITES ONLY)
-- ------------------------------------------------------------------------------

ALTER TABLE public.player_attribute_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_skill_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_activity_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own attribute progress" ON public.player_attribute_progress;
CREATE POLICY "Users read own attribute progress"
  ON public.player_attribute_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own unlocked skill nodes" ON public.player_skill_nodes;
CREATE POLICY "Users read own unlocked skill nodes"
  ON public.player_skill_nodes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own skill milestones" ON public.player_skill_milestones;
CREATE POLICY "Users read own skill milestones"
  ON public.player_skill_milestones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own skill activity ledger" ON public.skill_activity_ledger;
CREATE POLICY "Users read own skill activity ledger"
  ON public.skill_activity_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.player_attribute_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_attribute_progress TO authenticated;

REVOKE ALL ON public.player_skill_nodes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_skill_nodes TO authenticated;

REVOKE ALL ON public.player_skill_milestones FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_skill_milestones TO authenticated;

REVOKE ALL ON public.skill_activity_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.skill_activity_ledger TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. INTERNAL LEVEL & VALIDATION HELPERS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.compute_skill_attribute_level(p_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_xp INTEGER := GREATEST(0, COALESCE(p_xp, 0));
BEGIN
  IF v_xp >= 2860 THEN RETURN 10;
  ELSIF v_xp >= 2260 THEN RETURN 9;
  ELSIF v_xp >= 1740 THEN RETURN 8;
  ELSIF v_xp >= 1300 THEN RETURN 7;
  ELSIF v_xp >= 940 THEN RETURN 6;
  ELSIF v_xp >= 650 THEN RETURN 5;
  ELSIF v_xp >= 420 THEN RETURN 4;
  ELSIF v_xp >= 240 THEN RETURN 3;
  ELSIF v_xp >= 100 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_skill_attribute_level(INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.internal_build_skill_tree_state(p_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT;
  v_today TEXT;
  v_attrs JSONB := '{}'::jsonb;
  v_attr TEXT;
  v_row public.player_attribute_progress%ROWTYPE;
  v_daily_xp INTEGER;
  v_nodes TEXT[];
  v_milestones TEXT[];
  v_events JSONB;
BEGIN
  SELECT COALESCE(NULLIF(trim(timezone), ''), 'UTC') INTO v_tz
  FROM public.profiles WHERE id = p_uid;
  v_today := public.resolve_period_key('daily', COALESCE(v_tz, 'UTC'));

  FOREACH v_attr IN ARRAY ARRAY['strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality']
  LOOP
    INSERT INTO public.player_attribute_progress (user_id, attribute_id)
    VALUES (p_uid, v_attr)
    ON CONFLICT (user_id, attribute_id) DO NOTHING;

    SELECT * INTO v_row
    FROM public.player_attribute_progress
    WHERE user_id = p_uid AND attribute_id = v_attr;

    SELECT COALESCE(SUM(xp_awarded), 0) INTO v_daily_xp
    FROM public.skill_activity_ledger
    WHERE user_id = p_uid AND attribute_id = v_attr AND daily_bucket = v_today;

    v_attrs := jsonb_set(
      v_attrs,
      ARRAY[v_attr],
      jsonb_build_object(
        'attributeId', v_attr,
        'xp', v_row.xp,
        'level', v_row.level,
        'totalActivities', v_row.total_activities,
        'dailyXpEarned', v_daily_xp,
        'lastActivityAt', v_row.last_activity_at
      )
    );
  END LOOP;

  SELECT COALESCE(array_agg(node_id ORDER BY unlocked_at), ARRAY[]::TEXT[])
  INTO v_nodes
  FROM public.player_skill_nodes
  WHERE user_id = p_uid;

  SELECT COALESCE(array_agg(milestone_id ORDER BY claimed_at), ARRAY[]::TEXT[])
  INTO v_milestones
  FROM public.player_skill_milestones
  WHERE user_id = p_uid;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'idempotencyKey', idempotency_key,
        'activityType', activity_type,
        'attributeId', attribute_id,
        'sourceType', source_type,
        'sourceId', source_id,
        'xpAwarded', xp_awarded,
        'safetyCapped', safety_capped,
        'dailyBucket', daily_bucket,
        'createdAt', created_at
      )
      ORDER BY created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM (
    SELECT * FROM public.skill_activity_ledger
    WHERE user_id = p_uid
    ORDER BY created_at DESC
    LIMIT 30
  ) recent;

  RETURN jsonb_build_object(
    'attributes', v_attrs,
    'unlockedNodeIds', to_jsonb(v_nodes),
    'claimedMilestoneIds', to_jsonb(v_milestones),
    'recentEvents', v_events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_build_skill_tree_state(UUID) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. PUBLIC AUTHENTICATED RPCs
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_get_skill_tree_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'state', public.internal_build_skill_tree_state(v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_record_verified_skill_activity(
  p_activity_type TEXT,
  p_idempotency_key TEXT,
  p_source_type TEXT DEFAULT 'activity',
  p_source_id TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_attr TEXT;
  v_cap INTEGER;
  v_tz TEXT;
  v_today TEXT;
  v_daily_xp INTEGER;
  v_dur INTEGER;
  v_study_dur INTEGER;
  v_reps INTEGER;
  v_dist NUMERIC;
  v_streak INTEGER;
  v_vision INTEGER;
  v_sub TEXT;
  v_raw_xp INTEGER := 0;
  v_xp_awarded INTEGER := 0;
  v_capped BOOLEAN := false;
  v_prev_row public.player_attribute_progress%ROWTYPE;
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing idempotency key.');
  END IF;

  -- Check duplicate activity idempotency first
  IF EXISTS (
    SELECT 1 FROM public.skill_activity_ledger
    WHERE user_id = v_uid AND idempotency_key = trim(p_idempotency_key)
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'xpAwarded', 0,
      'state', public.internal_build_skill_tree_state(v_uid)
    );
  END IF;

  -- Map activity type -> attribute & daily safety cap
  CASE p_activity_type
    WHEN 'strength_workout' THEN v_attr := 'strength'; v_cap := 120;
    WHEN 'cardio_workout'   THEN v_attr := 'endurance'; v_cap := 120;
    WHEN 'habit_completion' THEN v_attr := 'discipline'; v_cap := 128;
    WHEN 'study_session'    THEN v_attr := 'focus'; v_cap := 114;
    WHEN 'comeback_activity' THEN v_attr := 'resilience'; v_cap := 72;
    WHEN 'recovery_habit'   THEN v_attr := 'vitality'; v_cap := 96;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid skill activity type.');
  END CASE;

  SELECT COALESCE(NULLIF(trim(timezone), ''), 'UTC') INTO v_tz
  FROM public.profiles WHERE id = v_uid;
  v_today := public.resolve_period_key('daily', COALESCE(v_tz, 'UTC'));

  -- Clamp physiological values to safe healthy bounds (ignores any client XP claims)
  v_dur := LEAST(45, GREATEST(0, COALESCE((p_metadata->>'durationMinutes')::INTEGER, 0)));
  v_study_dur := LEAST(60, GREATEST(0, COALESCE((p_metadata->>'durationMinutes')::INTEGER, 0)));
  v_reps := LEAST(60, GREATEST(0, COALESCE((p_metadata->>'repetitions')::INTEGER, 0)));
  v_dist := LEAST(8, GREATEST(0, COALESCE((p_metadata->>'distanceKm')::NUMERIC, 0)));
  v_streak := LEAST(14, GREATEST(0, COALESCE((p_metadata->>'streak')::INTEGER, 0)));
  v_vision := CASE WHEN COALESCE((p_metadata->>'verifiedWithAetherVision')::BOOLEAN, false) THEN 8 ELSE 0 END;
  v_sub := COALESCE(p_metadata->>'subAction', '');

  CASE p_activity_type
    WHEN 'strength_workout' THEN
      v_raw_xp := 18 + LEAST(14, LEAST(10, floor(v_dur / 4.0)::INTEGER) + LEAST(8, floor(v_reps / 8.0)::INTEGER)) + v_vision;
    WHEN 'cardio_workout' THEN
      v_raw_xp := 18 + LEAST(14, GREATEST(LEAST(12, floor(v_dur / 3.0)::INTEGER), LEAST(8, floor(v_dist * 2.0)::INTEGER))) + v_vision;
    WHEN 'habit_completion' THEN
      v_raw_xp := 22 + LEAST(10, floor(v_streak / 2.0)::INTEGER);
    WHEN 'study_session' THEN
      v_raw_xp := 20 + CASE WHEN v_study_dur >= 10 THEN LEAST(18, floor(v_study_dur / 3.0)::INTEGER) ELSE 6 END;
    WHEN 'comeback_activity' THEN
      v_raw_xp := 26 + CASE WHEN v_sub = 'quest' THEN 10 ELSE 6 END;
    WHEN 'recovery_habit' THEN
      IF v_sub IN ('sleep', 'yoga') THEN
        v_raw_xp := 24 + LEAST(8, floor(v_dur / 5.0)::INTEGER);
      ELSIF v_sub = 'hydration_goal' THEN
        v_raw_xp := 22;
      ELSE
        v_raw_xp := 16;
      END IF;
  END CASE;

  INSERT INTO public.player_attribute_progress (user_id, attribute_id)
  VALUES (v_uid, v_attr)
  ON CONFLICT (user_id, attribute_id) DO NOTHING;

  SELECT * INTO v_prev_row
  FROM public.player_attribute_progress
  WHERE user_id = v_uid AND attribute_id = v_attr
  FOR UPDATE;

  SELECT COALESCE(SUM(xp_awarded), 0) INTO v_daily_xp
  FROM public.skill_activity_ledger
  WHERE user_id = v_uid AND attribute_id = v_attr AND daily_bucket = v_today;

  v_xp_awarded := LEAST(v_raw_xp, GREATEST(0, v_cap - v_daily_xp));
  v_capped := v_xp_awarded < v_raw_xp;

  INSERT INTO public.skill_activity_ledger (
    user_id, idempotency_key, activity_type, attribute_id,
    source_type, source_id, xp_awarded, safety_capped, daily_bucket, metadata
  )
  VALUES (
    v_uid,
    trim(p_idempotency_key),
    p_activity_type,
    v_attr,
    COALESCE(NULLIF(trim(p_source_type), ''), 'activity'),
    COALESCE(trim(p_source_id), ''),
    v_xp_awarded,
    v_capped,
    v_today,
    COALESCE(p_metadata, '{}'::jsonb) - 'xp' - 'xpAmount' - 'xpAwarded' - 'level'
  );

  v_new_xp := v_prev_row.xp + v_xp_awarded;
  v_new_level := public.compute_skill_attribute_level(v_new_xp);

  UPDATE public.player_attribute_progress
  SET
    xp = v_new_xp,
    level = v_new_level,
    total_activities = total_activities + 1,
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = v_uid AND attribute_id = v_attr;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'safetyCapped', v_capped,
    'attributeId', v_attr,
    'xpAwarded', v_xp_awarded,
    'previousLevel', v_prev_row.level,
    'newLevel', v_new_level,
    'leveledUp', v_new_level > v_prev_row.level,
    'state', public.internal_build_skill_tree_state(v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_unlock_skill_node(
  p_node_id TEXT,
  p_attribute_id TEXT,
  p_branch_id TEXT,
  p_min_level INTEGER,
  p_min_activities INTEGER,
  p_prerequisite_ids TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.player_attribute_progress%ROWTYPE;
  v_prereq TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_attribute_id NOT IN ('strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid skill attribute.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.player_skill_nodes
    WHERE user_id = v_uid AND node_id = p_node_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'alreadyUnlocked', true,
      'state', public.internal_build_skill_tree_state(v_uid)
    );
  END IF;

  INSERT INTO public.player_attribute_progress (user_id, attribute_id)
  VALUES (v_uid, p_attribute_id)
  ON CONFLICT (user_id, attribute_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.player_attribute_progress
  WHERE user_id = v_uid AND attribute_id = p_attribute_id
  FOR UPDATE;

  IF v_row.level < GREATEST(1, COALESCE(p_min_level, 1)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Requires Level %s (currently Level %s).', p_min_level, v_row.level)
    );
  END IF;

  IF v_row.total_activities < GREATEST(0, COALESCE(p_min_activities, 0)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Requires %s verified activities (%s/%s).', p_min_activities, v_row.total_activities, p_min_activities)
    );
  END IF;

  IF p_prerequisite_ids IS NOT NULL THEN
    FOREACH v_prereq IN ARRAY p_prerequisite_ids
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.player_skill_nodes
        WHERE user_id = v_uid AND node_id = v_prereq
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Prerequisite skill node %s is not unlocked.', v_prereq)
        );
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.player_skill_nodes (user_id, node_id, attribute_id, branch_id)
  VALUES (v_uid, p_node_id, p_attribute_id, p_branch_id);

  RETURN jsonb_build_object(
    'success', true,
    'state', public.internal_build_skill_tree_state(v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_claim_skill_milestone(
  p_milestone_id TEXT,
  p_attribute_id TEXT,
  p_required_level INTEGER,
  p_required_nodes INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.player_attribute_progress%ROWTYPE;
  v_node_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_attribute_id NOT IN ('strength', 'endurance', 'discipline', 'focus', 'resilience', 'vitality') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid attribute.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.player_skill_milestones
    WHERE user_id = v_uid AND milestone_id = p_milestone_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'alreadyClaimed', true,
      'state', public.internal_build_skill_tree_state(v_uid)
    );
  END IF;

  INSERT INTO public.player_attribute_progress (user_id, attribute_id)
  VALUES (v_uid, p_attribute_id)
  ON CONFLICT (user_id, attribute_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.player_attribute_progress
  WHERE user_id = v_uid AND attribute_id = p_attribute_id;

  IF v_row.level < GREATEST(1, COALESCE(p_required_level, 1)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Attribute level requirement not yet met.');
  END IF;

  SELECT COUNT(*) INTO v_node_count
  FROM public.player_skill_nodes
  WHERE user_id = v_uid AND attribute_id = p_attribute_id;

  IF v_node_count < GREATEST(0, COALESCE(p_required_nodes, 0)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Required unlocked skill nodes count not yet met.');
  END IF;

  INSERT INTO public.player_skill_milestones (user_id, milestone_id, attribute_id)
  VALUES (v_uid, p_milestone_id, p_attribute_id);

  RETURN jsonb_build_object(
    'success', true,
    'state', public.internal_build_skill_tree_state(v_uid)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_skill_tree_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_skill_tree_state() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_record_verified_skill_activity(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_record_verified_skill_activity(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_unlock_skill_node(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_unlock_skill_node(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_claim_skill_milestone(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_skill_milestone(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

COMMIT;
