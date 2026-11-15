-- ==============================================================================
-- LIFEQUEST: AAA PLAYER PRESENCE & GRANULAR PROFILE PRIVACY SYSTEM
-- Migration: 20261119_presence_and_granular_privacy.sql
-- ==============================================================================

BEGIN;

-- 1. Extend profiles with persistent presence preferences and 11-field granular privacy JSONB
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_status TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS auto_away_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_away_minutes INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT jsonb_build_object(
    'privateByDefault', false,
    'usernameAvatar', 'everyone',
    'level', 'everyone',
    'xpProgression', 'everyone',
    'achievements', 'everyone',
    'fitnessStats', 'everyone',
    'workoutHistory', 'friends',
    'personalRecords', 'friends',
    'dailyActivity', 'friends',
    'onlineStatus', 'everyone',
    'lastActive', 'friends',
    'bio', 'everyone',
    'showEquipment', true,
    'showGuild', true
  );

-- 2. Authoritative Server-Side Presence Table with TTL heartbeat tracking
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  manual_status TEXT NOT NULL DEFAULT 'online' CHECK (manual_status IN ('online', 'offline', 'away', 'busy', 'dnd')),
  effective_status TEXT NOT NULL DEFAULT 'offline' CHECK (effective_status IN ('online', 'offline', 'away', 'busy', 'dnd')),
  is_auto_away BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_expires_at
  ON public.user_presence (expires_at);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_presence_select_authenticated ON public.user_presence;
CREATE POLICY user_presence_select_authenticated
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_presence_upsert_own ON public.user_presence;
CREATE POLICY user_presence_upsert_own
  ON public.user_presence FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Helper: Evaluate whether viewer is permitted for a specific granular field
CREATE OR REPLACE FUNCTION public._lq_can_view_field(
  p_privacy JSONB,
  p_field TEXT,
  p_is_self BOOLEAN,
  p_is_friend BOOLEAN,
  p_is_blocked BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_level TEXT;
BEGIN
  IF p_is_self THEN RETURN true; END IF;
  IF p_is_blocked THEN RETURN false; END IF;

  v_level := COALESCE(p_privacy->>p_field, 'everyone');
  IF v_level = 'everyone' THEN RETURN true; END IF;
  IF v_level = 'friends' THEN RETURN p_is_friend; END IF;
  RETURN false;
END;
$$;

-- 4. RPC: Update Presence Status & Heartbeat (never exposes Offline players as Online)
CREATE OR REPLACE FUNCTION public.rpc_update_presence(
  p_status TEXT DEFAULT NULL,
  p_auto_away_enabled BOOLEAN DEFAULT NULL,
  p_auto_away_minutes INTEGER DEFAULT NULL,
  p_heartbeat_only BOOLEAN DEFAULT false,
  p_is_auto_away BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_manual TEXT;
  v_effective TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_manual := COALESCE(NULLIF(lower(trim(p_status)), ''), v_profile.presence_status, 'online');
  IF v_manual NOT IN ('online', 'offline', 'away', 'busy', 'dnd') THEN
    v_manual := 'online';
  END IF;

  IF NOT p_heartbeat_only THEN
    UPDATE public.profiles
    SET
      presence_status = CASE WHEN p_is_auto_away THEN presence_status ELSE v_manual END,
      auto_away_enabled = COALESCE(p_auto_away_enabled, auto_away_enabled),
      auto_away_minutes = COALESCE(GREATEST(1, LEAST(60, p_auto_away_minutes)), auto_away_minutes),
      last_active_at = CASE WHEN v_manual = 'offline' THEN last_active_at ELSE v_now END,
      updated_at = v_now
    WHERE id = v_uid;
  ELSE
    UPDATE public.profiles
    SET last_active_at = CASE WHEN v_profile.presence_status = 'offline' THEN last_active_at ELSE v_now END
    WHERE id = v_uid;
  END IF;

  v_effective := CASE
    WHEN v_manual = 'offline' THEN 'offline'
    WHEN p_is_auto_away THEN 'away'
    ELSE v_manual
  END;

  INSERT INTO public.user_presence (
    user_id,
    manual_status,
    effective_status,
    is_auto_away,
    last_heartbeat_at,
    last_active_at,
    expires_at,
    updated_at
  )
  VALUES (
    v_uid,
    CASE WHEN p_is_auto_away THEN COALESCE(v_profile.presence_status, 'online') ELSE v_manual END,
    v_effective,
    p_is_auto_away,
    v_now,
    CASE WHEN v_effective = 'offline' THEN COALESCE(v_profile.last_active_at, v_now) ELSE v_now END,
    CASE WHEN v_effective = 'offline' THEN v_now ELSE v_now + interval '60 seconds' END,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    manual_status = CASE WHEN p_is_auto_away THEN user_presence.manual_status ELSE EXCLUDED.manual_status END,
    effective_status = EXCLUDED.effective_status,
    is_auto_away = EXCLUDED.is_auto_away,
    last_heartbeat_at = EXCLUDED.last_heartbeat_at,
    last_active_at = CASE WHEN EXCLUDED.effective_status = 'offline' THEN user_presence.last_active_at ELSE v_now END,
    expires_at = EXCLUDED.expires_at,
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'manualStatus', CASE WHEN p_is_auto_away THEN COALESCE(v_profile.presence_status, 'online') ELSE v_manual END,
    'effectiveStatus', v_effective,
    'lastActiveAt', v_now
  );
END;
$$;

-- 5. RPC: Batch Presence Query (Enforces Privacy, Invisible Offline, and TTL Expiration)
CREATE OR REPLACE FUNCTION public.rpc_get_presence_batch(p_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB := '{}'::jsonb;
  v_row RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  FOR v_row IN
    SELECT
      p.id,
      p.privacy_settings,
      p.last_active_at AS profile_last_active,
      up.effective_status,
      up.expires_at,
      up.last_active_at AS presence_last_active,
      EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
      ) AS is_blocked,
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = v_uid AND f.addressee_id = p.id)
            OR (f.addressee_id = v_uid AND f.requester_id = p.id))
      ) AS is_friend
    FROM public.profiles p
    LEFT JOIN public.user_presence up ON up.user_id = p.id
    WHERE p.id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
  LOOP
    IF v_row.is_blocked AND v_row.id <> v_uid THEN
      CONTINUE;
    END IF;

    DECLARE
      v_is_self BOOLEAN := (v_row.id = v_uid);
      v_can_status BOOLEAN := public._lq_can_view_field(v_row.privacy_settings, 'onlineStatus', v_is_self, v_row.is_friend, v_row.is_blocked);
      v_can_last_active BOOLEAN := public._lq_can_view_field(v_row.privacy_settings, 'lastActive', v_is_self, v_row.is_friend, v_row.is_blocked);
      v_live_status TEXT;
    BEGIN
      IF NOT v_can_status THEN
        v_live_status := 'offline';
      ELSIF v_row.effective_status IS NULL OR v_row.expires_at IS NULL OR v_row.expires_at < now() THEN
        v_live_status := 'offline';
      ELSE
        v_live_status := v_row.effective_status;
      END IF;

      v_result := v_result || jsonb_build_object(
        v_row.id::TEXT,
        jsonb_build_object(
          'status', v_live_status,
          'lastActiveAt', CASE WHEN v_can_last_active THEN COALESCE(v_row.presence_last_active, v_row.profile_last_active) ELSE NULL END,
          'hidden', NOT v_can_status
        )
      );
    END;
  END LOOP;

  RETURN v_result;
END;
$$;

-- 6. RPC: Update 11-Field Granular Privacy Settings
CREATE OR REPLACE FUNCTION public.rpc_update_privacy_settings(p_privacy_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_priv BOOLEAN;
  v_vis TEXT;
  v_any_everyone BOOLEAN;
  v_any_friends BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  v_priv := COALESCE((p_privacy_settings->>'privateByDefault')::BOOLEAN, false);
  v_any_everyone := (
    COALESCE(p_privacy_settings->>'level', 'everyone') = 'everyone'
    OR COALESCE(p_privacy_settings->>'xpProgression', 'everyone') = 'everyone'
    OR COALESCE(p_privacy_settings->>'fitnessStats', 'everyone') = 'everyone'
    OR COALESCE(p_privacy_settings->>'achievements', 'everyone') = 'everyone'
    OR COALESCE(p_privacy_settings->>'bio', 'everyone') = 'everyone'
  );
  v_any_friends := (
    COALESCE(p_privacy_settings->>'level', 'everyone') = 'friends'
    OR COALESCE(p_privacy_settings->>'xpProgression', 'everyone') = 'friends'
    OR COALESCE(p_privacy_settings->>'fitnessStats', 'everyone') = 'friends'
    OR COALESCE(p_privacy_settings->>'achievements', 'everyone') = 'friends'
    OR COALESCE(p_privacy_settings->>'bio', 'everyone') = 'friends'
  );

  v_vis := CASE
    WHEN v_priv AND NOT v_any_everyone AND NOT v_any_friends THEN 'private'
    WHEN NOT v_any_everyone AND v_any_friends THEN 'friends_only'
    WHEN v_any_everyone THEN 'public'
    ELSE 'private'
  END;

  UPDATE public.profiles
  SET
    privacy_settings = COALESCE(p_privacy_settings, privacy_settings),
    profile_visibility = v_vis,
    show_achievements = (COALESCE(p_privacy_settings->>'achievements', 'everyone') <> 'nobody'),
    show_stats = (
      COALESCE(p_privacy_settings->>'xpProgression', 'everyone') <> 'nobody'
      OR COALESCE(p_privacy_settings->>'fitnessStats', 'everyone') <> 'nobody'
      OR COALESCE(p_privacy_settings->>'dailyActivity', 'friends') <> 'nobody'
    ),
    show_equipment = COALESCE((p_privacy_settings->>'showEquipment')::BOOLEAN, true),
    show_guild = COALESCE((p_privacy_settings->>'showGuild')::BOOLEAN, true),
    updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object('success', true, 'privacySettings', p_privacy_settings);
END;
$$;

-- 7. Granular Server-Side Profile Enforcement (strips unauthorized keys completely)
CREATE OR REPLACE FUNCTION public.rpc_get_public_player_profile(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_target public.profiles%ROWTYPE;
  v_f public.friendships%ROWTYPE;
  v_up public.user_presence%ROWTYPE;
  v_rel TEXT := 'none';
  v_is_blocked BOOLEAN := false;
  v_blocked_by_me BOOLEAN := false;
  v_is_self BOOLEAN := false;
  v_is_friend BOOLEAN := false;
  v_priv JSONB;
  v_player JSONB;
  v_equipped JSONB;
  v_guild JSONB;
  v_achievements JSONB;
  v_legend_titles JSONB;
  v_workouts JSONB;
  v_prs JSONB;
  v_daily JSONB;
  v_weapons_count INTEGER := 0;
  v_permitted TEXT[] := ARRAY[]::TEXT[];
  v_live_status TEXT := 'offline';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target player ID required');
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Champion not found');
  END IF;

  v_is_self := (v_uid = p_target_user_id);

  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p_target_user_id)
       OR (ub.blocker_id = p_target_user_id AND ub.blocked_id = v_uid)
  ) INTO v_is_blocked;

  IF v_is_blocked AND NOT v_is_self THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_blocks WHERE blocker_id = v_uid AND blocked_id = p_target_user_id
    ) INTO v_blocked_by_me;
    RETURN jsonb_build_object(
      'success', false,
      'accessible', false,
      'blocked', true,
      'blockedByMe', v_blocked_by_me,
      'error', 'This profile is unavailable due to a block setting.'
    );
  END IF;

  SELECT * INTO v_f
  FROM public.friendships f
  WHERE (f.requester_id = v_uid AND f.addressee_id = p_target_user_id)
     OR (f.addressee_id = v_uid AND f.requester_id = p_target_user_id)
  LIMIT 1;

  IF FOUND THEN
    IF v_f.status = 'accepted' THEN
      v_rel := 'friends';
      v_is_friend := true;
    ELSIF v_f.status = 'pending' AND v_f.requester_id = v_uid THEN
      v_rel := 'request_sent';
    ELSIF v_f.status = 'pending' AND v_f.addressee_id = v_uid THEN
      v_rel := 'request_received';
    END IF;
  END IF;

  v_priv := COALESCE(v_target.privacy_settings, '{}'::jsonb);
  v_player := jsonb_build_object(
    'id', v_target.id,
    'relationshipStatus', CASE WHEN v_is_self THEN 'self' ELSE v_rel END,
    'friendshipId', v_f.id
  );

  -- 1. Username & Avatar
  IF public._lq_can_view_field(v_priv, 'usernameAvatar', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'usernameAvatar');
    v_player := v_player || jsonb_build_object(
      'username', v_target.username,
      'characterName', COALESCE(v_target.character_name, v_target.username),
      'characterClass', v_target.character_class
    );
    IF v_target.equipped_legend_title IS NOT NULL THEN
      v_player := v_player || jsonb_build_object(
        'legendTitle', v_target.equipped_legend_title,
        'legendTitleStyle', v_target.equipped_legend_style,
        'legendEmblem', v_target.equipped_legend_emblem
      );
    END IF;
  END IF;

  -- 2. Level
  IF public._lq_can_view_field(v_priv, 'level', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'level');
    v_player := v_player || jsonb_build_object(
      'level', v_target.level,
      'aetherRank', v_target.aether_rank
    );
  END IF;

  -- 3. XP & Progression
  IF public._lq_can_view_field(v_priv, 'xpProgression', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'xpProgression');
    v_player := v_player || jsonb_build_object(
      'playerXP', v_target.player_xp,
      'playerXPNextLevel', v_target.player_xp_next_level,
      'totalXp', v_target.total_xp,
      'aetherPoints', v_target.aether_points,
      'aetherPointsNextRank', v_target.aether_points_next_rank
    );
  END IF;

  -- 4. Achievements & Trophies
  IF public._lq_can_view_field(v_priv, 'achievements', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'achievements');
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ac.id,
      'name', ac.name,
      'description', ac.description,
      'category', ac.category,
      'icon', ac.icon,
      'unlocked', pa.unlocked
    ) ORDER BY ac.id), '[]'::jsonb)
    INTO v_achievements
    FROM public.player_achievements pa
    JOIN public.achievements_catalog ac ON ac.id = pa.achievement_id
    WHERE pa.user_id = p_target_user_id AND pa.unlocked = true;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'achievementId', gac.id,
      'name', gac.name,
      'titleTag', gac.title_tag,
      'titleStyle', gac.title_style,
      'emblemIcon', gac.emblem_icon,
      'rarity', gac.rarity,
      'claimedAt', gc.claimed_at
    ) ORDER BY gc.claimed_at DESC), '[]'::jsonb)
    INTO v_legend_titles
    FROM public.global_achievement_claims gc
    JOIN public.global_achievements_catalog gac ON gac.id = gc.achievement_id
    WHERE gc.owner_id = p_target_user_id;

    v_player := v_player || jsonb_build_object(
      'achievements', COALESCE(v_achievements, '[]'::jsonb),
      'legendTitles', COALESCE(v_legend_titles, '[]'::jsonb)
    );
  END IF;

  -- 5. Fitness Statistics
  IF public._lq_can_view_field(v_priv, 'fitnessStats', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'fitnessStats');
    v_player := v_player || jsonb_build_object(
      'currentStreak', v_target.current_streak,
      'totalWorkoutsCompleted', v_target.total_workouts_completed,
      'totalVerifiedReps', v_target.total_verified_reps,
      'totalBossesDefeated', v_target.total_bosses_defeated
    );
  END IF;

  -- 6. Workout History
  IF public._lq_can_view_field(v_priv, 'workoutHistory', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'workoutHistory');
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ws.id,
      'exerciseName', COALESCE(ws.exercise_name, ws.exercise_type, 'Training'),
      'exerciseType', COALESCE(ws.exercise_type, 'gym'),
      'durationMinutes', ws.duration_minutes,
      'repetitions', ws.repetitions,
      'distanceKm', ws.distance_km,
      'verifiedWithAetherVision', ws.verified_with_vision,
      'timestamp', ws.created_at
    ) ORDER BY ws.created_at DESC), '[]'::jsonb)
    INTO v_workouts
    FROM (
      SELECT * FROM public.workout_sessions
      WHERE user_id = p_target_user_id
      ORDER BY created_at DESC
      LIMIT 10
    ) ws;
    v_player := v_player || jsonb_build_object('workoutHistory', COALESCE(v_workouts, '[]'::jsonb));
  END IF;

  -- 7. Personal Records
  IF public._lq_can_view_field(v_priv, 'personalRecords', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'personalRecords');
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'exerciseName', pr.ex_name,
      'bestReps', pr.max_reps,
      'bestDurationMinutes', pr.max_dur,
      'bestDistanceKm', pr.max_dist,
      'achievedAt', pr.latest_at
    )), '[]'::jsonb)
    INTO v_prs
    FROM (
      SELECT
        COALESCE(exercise_name, exercise_type, 'Training') AS ex_name,
        MAX(NULLIF(repetitions, 0)) AS max_reps,
        MAX(NULLIF(duration_minutes, 0)) AS max_dur,
        MAX(distance_km) AS max_dist,
        MAX(created_at) AS latest_at
      FROM public.workout_sessions
      WHERE user_id = p_target_user_id
      GROUP BY COALESCE(exercise_name, exercise_type, 'Training')
      LIMIT 8
    ) pr;
    v_player := v_player || jsonb_build_object('personalRecords', COALESCE(v_prs, '[]'::jsonb));
  END IF;

  -- 8. Daily Activity
  IF public._lq_can_view_field(v_priv, 'dailyActivity', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'dailyActivity');
    v_daily := jsonb_build_object(
      'habitsCompletedToday', (SELECT count(*) FROM public.habit_logs hl WHERE hl.user_id = p_target_user_id AND hl.created_at::date = CURRENT_DATE),
      'habitsTotal', (SELECT count(*) FROM public.habits h WHERE h.user_id = p_target_user_id AND h.archived_at IS NULL),
      'workoutsToday', (SELECT count(*) FROM public.workout_sessions ws WHERE ws.user_id = p_target_user_id AND ws.created_at::date = CURRENT_DATE),
      'activeMinutesToday', (SELECT COALESCE(SUM(ws.duration_minutes), 0) FROM public.workout_sessions ws WHERE ws.user_id = p_target_user_id AND ws.created_at::date = CURRENT_DATE),
      'mealsLoggedToday', (SELECT count(*) FROM public.nutrition_logs nl WHERE nl.user_id = p_target_user_id AND nl.log_date = CURRENT_DATE),
      'waterGlassesToday', COALESCE((SELECT hd.glasses_count FROM public.hydration_daily hd WHERE hd.user_id = p_target_user_id AND hd.log_date = CURRENT_DATE), 0),
      'currentStreak', v_target.current_streak
    );
    v_player := v_player || jsonb_build_object('dailyActivity', v_daily);
  END IF;

  -- 9. Online / Presence Status
  IF public._lq_can_view_field(v_priv, 'onlineStatus', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'onlineStatus');
    SELECT * INTO v_up FROM public.user_presence WHERE user_id = p_target_user_id;
    IF FOUND AND v_up.expires_at >= now() THEN
      v_live_status := v_up.effective_status;
    ELSE
      v_live_status := 'offline';
    END IF;
    v_player := v_player || jsonb_build_object('presenceStatus', v_live_status);
  END IF;

  -- 10. Last Active
  IF public._lq_can_view_field(v_priv, 'lastActive', v_is_self, v_is_friend, v_is_blocked) THEN
    v_permitted := array_append(v_permitted, 'lastActive');
    v_player := v_player || jsonb_build_object('lastActiveAt', v_target.last_active_at);
  END IF;

  -- 11. Bio
  IF public._lq_can_view_field(v_priv, 'bio', v_is_self, v_is_friend, v_is_blocked) AND COALESCE(v_target.bio, '') <> '' THEN
    v_permitted := array_append(v_permitted, 'bio');
    v_player := v_player || jsonb_build_object('bio', v_target.bio);
  END IF;

  -- Equipment & Guild if profile isn't private-by-default or viewer is friend/self
  IF v_is_self OR (COALESCE(v_target.show_equipment, true) AND NOT COALESCE((v_priv->>'privateByDefault')::BOOLEAN, false)) THEN
    SELECT jsonb_build_object(
      'weaponId', pw.weapon_id,
      'name', pw.name,
      'category', pw.category,
      'rarity', pw.rarity,
      'level', pw.level,
      'evolutionStage', pw.evolution_stage,
      'masteryLevel', pw.mastery_level,
      'element', COALESCE(pw.element, 'Physical')
    )
    INTO v_equipped
    FROM public.player_weapons pw
    WHERE pw.user_id = p_target_user_id AND pw.equipped = true
    ORDER BY pw.updated_at DESC
    LIMIT 1;

    SELECT count(*)::INTEGER INTO v_weapons_count
    FROM public.player_weapons pw
    WHERE pw.user_id = p_target_user_id AND pw.unlocked = true;

    IF v_equipped IS NOT NULL THEN
      v_player := v_player || jsonb_build_object('equippedWeapon', v_equipped);
    END IF;
    v_player := v_player || jsonb_build_object('unlockedWeaponsCount', v_weapons_count);
  END IF;

  IF v_is_self OR (COALESCE(v_target.show_guild, true) AND NOT COALESCE((v_priv->>'privateByDefault')::BOOLEAN, false)) THEN
    SELECT jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'tag', g.tag,
      'level', g.level,
      'role', gm.role
    )
    INTO v_guild
    FROM public.guild_members gm
    JOIN public.guilds g ON g.id = gm.guild_id
    WHERE gm.user_id = p_target_user_id
    LIMIT 1;
    IF v_guild IS NOT NULL THEN
      v_player := v_player || jsonb_build_object('guild', v_guild);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'accessible', cardinality(v_permitted) > 0,
    'restrictedReason', CASE WHEN cardinality(v_permitted) = 0 THEN COALESCE(v_target.profile_visibility, 'private') ELSE NULL END,
    'permittedFields', to_jsonb(v_permitted),
    'player', v_player
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_update_presence(TEXT, BOOLEAN, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_presence_batch(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_privacy_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_public_player_profile(UUID) TO authenticated;

COMMIT;
