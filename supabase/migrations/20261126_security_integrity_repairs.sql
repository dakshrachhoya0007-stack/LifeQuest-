-- =============================================================================
-- FORWARD-ONLY SECURITY & INTEGRITY REPAIRS MIGRATION (2026-11-26)
-- Fixes:
-- 1. _compute_user_legend_metrics(UUID): replace nonexistent hydration_logs and
--    profiles.client_preferences with public.hydration_daily & public.game_states.
-- 2. global_achievements_catalog: add missing gl-hid-07..10 entries to match
--    globalLegendsData.ts and prune unclaimed obsolete weapon/forge entries.
-- 3. rpc_claim_story_reward: set app.trusted_rpc GUC so profile updates pass
--    guard_profiles_progression_columns(), and enforce strict server-side
--    reward_key allowlist (never trust client XP/Gold amounts or invented keys).
-- 4. rpc_log_workout: add server-side exercise validation & plausibility bounds.
-- 5. Lock down over-permissive FOR ALL RLS policies from 20261125 so authenticated
--    clients cannot directly write authoritative wallet/cards/recap ledgers.
-- =============================================================================

-- 1. Sync global_achievements_catalog with globalLegendsData.ts
INSERT INTO public.global_achievements_catalog (
  id, name, story, category, rarity, difficulty, title_tag, title_style, emblem_icon,
  requirement_summary, requirement_type, threshold, reward_player_xp, reward_forge_xp, reward_gold, is_hidden
) VALUES
  (
    'gl-hid-07',
    'Spring of the Still Mind',
    'Completed 30 Daily Hydration targets, proving calm recovery fuels endurance.',
    'special_hidden_achievements',
    'Legendary',
    'Secret',
    'WELLSPRING',
    'emerald',
    'Droplets',
    'Complete 30 full daily hydration goals',
    'hydration_goals_total',
    30,
    0,
    0,
    1600,
    true
  ),
  (
    'gl-hid-08',
    'Scribe of Thirty Mornings',
    'Generated 30 AI Daily Reports to learn from balanced victories and rest.',
    'special_hidden_achievements',
    'Legendary',
    'Secret',
    'DAWN SCRIBE',
    'arcane',
    'BookOpen',
    'Generate 30 Daily Progression Reports',
    'daily_reports_generated',
    30,
    0,
    0,
    1800,
    true
  ),
  (
    'gl-hid-09',
    'Keepers of the Balanced Table',
    'Logged 120 balanced meals nourishing real-life strength and vitality.',
    'special_hidden_achievements',
    'Legendary',
    'Secret',
    'HEARTH STEWARD',
    'gold',
    'Utensils',
    'Log 120 balanced meals in the Nutrition Ledger',
    'meals_logged_total',
    120,
    0,
    0,
    2400,
    true
  ),
  (
    'gl-hid-10',
    'Scholar of the Quiet Hour',
    'Claimed 50 Intellectual dynamic quests—strengthening mind alongside body.',
    'special_hidden_achievements',
    'Legendary',
    'Secret',
    'QUIET LUMINARY',
    'arcane',
    'Sparkles',
    'Complete 50 Intellectual dynamic quests',
    'dynamic_intellectual_claimed',
    50,
    0,
    0,
    2800,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  story = EXCLUDED.story,
  category = EXCLUDED.category,
  rarity = EXCLUDED.rarity,
  difficulty = EXCLUDED.difficulty,
  title_tag = EXCLUDED.title_tag,
  title_style = EXCLUDED.title_style,
  emblem_icon = EXCLUDED.emblem_icon,
  requirement_summary = EXCLUDED.requirement_summary,
  requirement_type = EXCLUDED.requirement_type,
  threshold = EXCLUDED.threshold,
  reward_player_xp = 0,
  reward_forge_xp = EXCLUDED.reward_forge_xp,
  reward_gold = EXCLUDED.reward_gold,
  is_hidden = EXCLUDED.is_hidden;

DELETE FROM public.global_achievements_catalog g
WHERE g.id IN ('gl-expl-03', 'gl-expl-04', 'gl-expl-05', 'gl-ult-06')
  AND NOT EXISTS (
    SELECT 1 FROM public.global_achievement_claims c WHERE c.achievement_id = g.id
  );

-- 2. Fix _compute_user_legend_metrics(UUID) to query real tables/columns
CREATE OR REPLACE FUNCTION public._compute_user_legend_metrics(p_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_client_prefs JSONB := '{}'::jsonb;
  v_habits_claimed INTEGER := 0;
  v_meals_total INTEGER := 0;
  v_water_cur INTEGER := 0;
  v_hydration_goals INTEGER := 0;
  v_quests_claimed INTEGER := 0;
  v_dyn_claimed INTEGER := 0;
  v_dyn_phys INTEGER := 0;
  v_dyn_intel INTEGER := 0;
  v_dyn_disc INTEGER := 0;
  v_dyn_pg INTEGER := 0;
  v_dyn_soc INTEGER := 0;
  v_norm_ach INTEGER := 0;
  v_weapons_count INTEGER := 0;
  v_max_weapon_lvl INTEGER := 1;
  v_friends_count INTEGER := 0;
  v_guild_joined INTEGER := 0;
  v_guild_leader INTEGER := 0;
  v_chat_sent INTEGER := 0;
  v_story_claimed INTEGER := 0;
  v_all_kingdoms INTEGER := 0;
  v_honor_claimed INTEGER := 0;
  v_reports_count INTEGER := 0;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE id = p_uid;
  SELECT COALESCE(client_preferences, '{}'::jsonb)
  INTO v_client_prefs
  FROM public.game_states
  WHERE user_id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_habits_claimed FROM public.habit_logs WHERE user_id = p_uid;
  SELECT COALESCE(count(*), 0)::INTEGER INTO v_meals_total FROM public.nutrition_logs WHERE user_id = p_uid;

  SELECT COALESCE(glasses_count, 0)::INTEGER INTO v_water_cur
  FROM public.hydration_daily WHERE user_id = p_uid ORDER BY log_date DESC LIMIT 1;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_hydration_goals
  FROM public.hydration_daily WHERE user_id = p_uid AND glasses_count >= 8;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_quests_claimed
  FROM public.player_quest_progress WHERE user_id = p_uid AND claimed = true;

  SELECT
    COALESCE(count(*) FILTER (WHERE claimed = true), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'physical'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'intellectual'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'discipline'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'personal_growth'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'social'), 0)::INTEGER
  INTO v_dyn_claimed, v_dyn_phys, v_dyn_intel, v_dyn_disc, v_dyn_pg, v_dyn_soc
  FROM public.player_dynamic_quests WHERE user_id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_norm_ach
  FROM public.player_achievements WHERE user_id = p_uid AND unlocked = true;

  SELECT
    COALESCE(count(*) FILTER (WHERE unlocked = true), 0)::INTEGER,
    COALESCE(max(level), 1)::INTEGER
  INTO v_weapons_count, v_max_weapon_lvl
  FROM public.player_weapons WHERE user_id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_friends_count
  FROM public.friendships WHERE status = 'accepted' AND (requester_id = p_uid OR addressee_id = p_uid);

  SELECT
    CASE WHEN EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = p_uid) THEN 1 ELSE 0 END,
    CASE WHEN EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = p_uid AND role = 'leader') THEN 1 ELSE 0 END
  INTO v_guild_joined, v_guild_leader;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_chat_sent FROM public.chat_messages WHERE sender_id = p_uid;

  SELECT CASE WHEN COALESCE(count(*) FILTER (WHERE cleared = true), 0) >= 5 THEN 1 ELSE 0 END
  INTO v_all_kingdoms
  FROM public.boss_encounters WHERE user_id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_story_claimed
  FROM public.player_story_rewards
  WHERE user_id = p_uid AND reward_key LIKE 'campaign-%';

  v_story_claimed := GREATEST(
    v_story_claimed,
    COALESCE(jsonb_array_length(v_client_prefs->'campaignProgress'->'claimedChapterIds'), 0)
  );

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.player_story_rewards WHERE user_id = p_uid AND reward_key = 'reclaim-honor-starter-v1'
  ) OR COALESCE((v_client_prefs->'reclaimHonor'->>'claimed')::BOOLEAN, false) THEN 1 ELSE 0 END
  INTO v_honor_claimed;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_reports_count FROM public.player_daily_reports WHERE user_id = p_uid;

  RETURN jsonb_build_object(
    'level', COALESCE(v_prof.level, 1),
    'total_xp', COALESCE(v_prof.total_xp, 0),
    'current_streak', COALESCE(v_prof.current_streak, 0),
    'total_workouts', COALESCE(v_prof.total_workouts_completed, 0),
    'total_verified_reps', COALESCE(v_prof.total_verified_reps, 0),
    'total_bosses_defeated', COALESCE(v_prof.total_bosses_defeated, 0),
    'aether_points', COALESCE(v_prof.aether_points, 0),
    'gold_balance', COALESCE(v_prof.gold_balance, 0),
    'forge_xp_balance', COALESCE(v_prof.forge_xp, 0),
    'habits_claimed_total', v_habits_claimed,
    'meals_logged_total', v_meals_total,
    'water_glasses_current', v_water_cur,
    'hydration_goals_total', v_hydration_goals,
    'quests_claimed_total', v_quests_claimed + v_dyn_claimed,
    'dynamic_quests_claimed_total', v_dyn_claimed,
    'dynamic_physical_claimed', v_dyn_phys,
    'dynamic_intellectual_claimed', v_dyn_intel,
    'dynamic_discipline_claimed', v_dyn_disc,
    'dynamic_personal_growth_claimed', v_dyn_pg,
    'dynamic_social_claimed', v_dyn_soc,
    'normal_achievements_unlocked', v_norm_ach,
    'unlocked_weapons_count', v_weapons_count,
    'max_weapon_level', v_max_weapon_lvl,
    'friends_count', v_friends_count,
    'guild_joined', v_guild_joined,
    'guild_leader', v_guild_leader,
    'chat_messages_sent', v_chat_sent,
    'story_chapters_claimed', v_story_claimed,
    'all_kingdoms_cleared', v_all_kingdoms,
    'honor_reclaimed', v_honor_claimed,
    'daily_reports_generated', v_reports_count
  );
END;
$$;

-- 3. Fix rpc_claim_story_reward: trusted_rpc config + strict allowlist
CREATE OR REPLACE FUNCTION public.rpc_claim_story_reward(
  p_reward_key TEXT,
  p_player_xp INTEGER DEFAULT 0,
  p_forge_xp INTEGER DEFAULT 0,
  p_gold INTEGER DEFAULT 0,
  p_description TEXT DEFAULT 'Story & Tutorial Milestone'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_key TEXT := btrim(COALESCE(p_reward_key, ''));
  v_prof public.profiles%ROWTYPE;
  v_safe_pxp INTEGER := 0;
  v_safe_fxp INTEGER := 0;
  v_safe_gold INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Strictly derive rewards on the server from known story milestone keys (ignore client p_player_xp / p_forge_xp / p_gold)
  CASE v_key
    WHEN 'reclaim-honor-starter-v1' THEN
      v_safe_pxp := 120; v_safe_fxp := 0; v_safe_gold := 100;
    WHEN 'campaign-chapter-1-awakening' THEN
      v_safe_pxp := 80;  v_safe_fxp := 0; v_safe_gold := 75;
    WHEN 'campaign-chapter-2-reclaim-honor' THEN
      v_safe_pxp := 130; v_safe_fxp := 0; v_safe_gold := 120;
    WHEN 'campaign-chapter-3-lost-guardians' THEN
      v_safe_pxp := 200; v_safe_fxp := 0; v_safe_gold := 180;
    WHEN 'campaign-chapter-4-kingdom-reborn' THEN
      v_safe_pxp := 280; v_safe_fxp := 0; v_safe_gold := 250;
    WHEN 'campaign-chapter-5-final-ascension' THEN
      v_safe_pxp := 450; v_safe_fxp := 0; v_safe_gold := 400;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown or unauthorized story reward key.');
  END CASE;

  PERFORM set_config('app.trusted_rpc', 'true', true);
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  INSERT INTO public.player_story_rewards (
    user_id, reward_key, player_xp_granted, forge_xp_granted, gold_granted
  ) VALUES (
    v_uid, v_key, v_safe_pxp, v_safe_fxp, v_safe_gold
  )
  ON CONFLICT (user_id, reward_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'alreadyClaimed', true, 'error', 'Story reward already claimed.');
  END IF;

  UPDATE public.profiles
  SET
    player_xp = player_xp + v_safe_pxp,
    total_xp = total_xp + v_safe_pxp,
    forge_xp = forge_xp + v_safe_fxp,
    gold_balance = gold_balance + v_safe_gold,
    updated_at = now()
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  WHILE v_prof.player_xp >= v_prof.player_xp_next_level LOOP
    UPDATE public.profiles
    SET
      level = level + 1,
      player_xp = player_xp - player_xp_next_level,
      player_xp_next_level = GREATEST(100, FLOOR(player_xp_next_level * 1.25)::INTEGER),
      updated_at = now()
    WHERE id = v_uid
    RETURNING * INTO v_prof;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'profile', to_jsonb(v_prof),
    'playerXpGranted', v_safe_pxp,
    'forgeXpGranted', v_safe_fxp,
    'goldGranted', v_safe_gold
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_claim_story_reward(TEXT, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_story_reward(TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

-- 4. Harden rpc_log_workout plausibility bounds
CREATE OR REPLACE FUNCTION public.rpc_log_workout(
  p_exercise_type TEXT,
  p_exercise_name TEXT,
  p_duration_minutes INTEGER DEFAULT 15,
  p_repetitions INTEGER DEFAULT 0,
  p_distance_km NUMERIC DEFAULT NULL,
  p_verified_with_vision BOOLEAN DEFAULT false,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ex_type TEXT := lower(btrim(COALESCE(p_exercise_type, 'workout')));
  v_dur INTEGER := LEAST(180, GREATEST(1, COALESCE(p_duration_minutes, 10)));
  v_raw_reps INTEGER := LEAST(300, GREATEST(0, COALESCE(p_repetitions, 0)));
  v_reps INTEGER;
  v_verified BOOLEAN := COALESCE(p_verified_with_vision, false);
  v_xp INTEGER;
  v_forge INTEGER;
  v_gold INTEGER;
  v_aether INTEGER;
  v_prof public.profiles%ROWTYPE;
  v_session public.workout_sessions%ROWTYPE;
  v_daily_period TEXT;
  v_weekly_period TEXT;
  v_guild_id TEXT;
  v_challenge_id UUID;
  v_today_workouts INTEGER;
  v_cap_reached BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  IF v_ex_type NOT IN (
    'squat', 'pushup', 'jumping_jack', 'lunge', 'knee_raise',
    'plank', 'bicep_curl', 'shoulder_press',
    'walking', 'running', 'cycling', 'gym', 'yoga', 'workout'
  ) THEN
    v_ex_type := 'workout';
  END IF;

  -- Plausibility cap: no more than 45 reps/min for any single session, min 1 rep if vision-verified
  v_reps := LEAST(v_raw_reps, v_dur * 45);
  IF v_verified AND v_reps = 0 THEN
    v_verified := false;
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  SELECT * INTO v_session FROM public.workout_sessions WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'session', to_jsonb(v_session), 'profile', to_jsonb(v_prof));
  END IF;

  SELECT count(*) INTO v_today_workouts
  FROM public.workout_sessions
  WHERE user_id = v_uid
    AND (created_at AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date =
        (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date;

  IF v_today_workouts >= 6 THEN
    v_cap_reached := true;
    v_xp := 0;
    v_forge := 0;
    v_gold := 0;
    v_aether := 0;
  ELSE
    v_xp := CASE WHEN v_verified THEN GREATEST(10, v_reps) * 4 + 30 ELSE v_dur * 2 + 10 END;
    v_forge := CASE WHEN v_verified THEN GREATEST(10, v_reps) * 5 + 40 ELSE v_dur * 3 + 15 END;
    v_gold := CASE WHEN v_verified THEN 40 + LEAST(60, v_reps) ELSE 20 + LEAST(40, v_dur) END;
    v_aether := CASE WHEN v_verified THEN 40 ELSE 25 END;
  END IF;

  INSERT INTO public.workout_sessions (
    user_id, exercise_type, exercise_name, duration_minutes, repetitions, distance_km,
    verified_with_vision, xp_awarded, forge_xp_awarded, gold_awarded, aether_points_awarded,
    idempotency_key, workout_data
  )
  VALUES (
    v_uid, left(v_ex_type, 40), left(COALESCE(p_exercise_name, 'Training'), 100), v_dur, v_reps,
    CASE WHEN p_distance_km IS NULL THEN NULL ELSE LEAST(200, GREATEST(0, p_distance_km)) END,
    v_verified, v_xp, v_forge, v_gold, v_aether,
    p_idempotency_key,
    jsonb_build_object(
      'exerciseType', v_ex_type,
      'exerciseName', left(COALESCE(p_exercise_name, 'Training'), 100),
      'durationMinutes', v_dur,
      'repetitions', v_reps,
      'distanceKm', p_distance_km,
      'verifiedWithAetherVision', v_verified,
      'notes', left(COALESCE(p_notes, ''), 500),
      'timestamp', now(),
      'playerXpEarned', v_xp,
      'forgeXpEarned', v_forge,
      'goldEarned', v_gold
    )
  )
  RETURNING * INTO v_session;

  IF NOT v_cap_reached THEN
    v_prof := public._credit_currencies(
      v_uid, v_xp, v_forge, v_gold, v_aether,
      'workout', v_session.id::text,
      'Fitness Session: ' || left(COALESCE(p_exercise_name, 'Workout'), 80),
      p_idempotency_key
    );

    PERFORM public._grant_weapon_mastery(v_uid, v_prof.equipped_weapon_id, CASE WHEN v_verified THEN 45 ELSE 30 END);
  END IF;

  UPDATE public.profiles
  SET
    total_workouts_completed = total_workouts_completed + 1,
    total_verified_reps = total_verified_reps + CASE WHEN v_verified THEN v_reps ELSE 0 END
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  IF v_verified THEN
    UPDATE public.player_buffs SET active = true, uses_remaining = 2 WHERE user_id = v_uid AND buff_id = 'buff-1';
    INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
    VALUES (v_uid, 'ach-5', 1, 1, true)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = 1, unlocked = true;
  END IF;

  v_daily_period := public.resolve_period_key('daily', v_prof.timezone);
  v_weekly_period := public.resolve_period_key('weekly', v_prof.timezone);

  IF v_verified AND v_ex_type = 'squat' AND v_reps > 0 THEN
    UPDATE public.player_quest_progress
    SET progress = LEAST(max_progress, progress + v_reps),
        completed = (LEAST(max_progress, progress + v_reps) >= max_progress)
    WHERE user_id = v_uid AND quest_id = 'q-2' AND period_key = v_daily_period AND claimed = false;
  END IF;

  UPDATE public.player_quest_progress
  SET progress = LEAST(max_progress, progress + v_dur),
      completed = (LEAST(max_progress, progress + v_dur) >= max_progress)
  WHERE user_id = v_uid AND quest_id = 'q-4' AND period_key = v_weekly_period AND claimed = false;

  SELECT guild_id INTO v_guild_id FROM public.guild_members WHERE user_id = v_uid LIMIT 1;
  IF v_guild_id IS NOT NULL THEN
    SELECT id INTO v_challenge_id FROM public.guild_challenges
    WHERE guild_id = v_guild_id AND metric = 'workouts'
    ORDER BY created_at DESC LIMIT 1;
    IF v_challenge_id IS NOT NULL THEN
      PERFORM public._record_verified_guild_contribution(
        v_uid, v_guild_id, v_challenge_id, 'workout', v_session.id::text, 1
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deduplicated', false,
    'dailyCapReached', v_cap_reached,
    'session', to_jsonb(v_session),
    'profile', to_jsonb(v_prof)
  );
END;
$$;

-- 5. Lock down over-permissive FOR ALL RLS policies from 20261125 to read-only for clients
DROP POLICY IF EXISTS wallet_self_rw ON public.player_wallet_ledger;
CREATE POLICY wallet_self_read ON public.player_wallet_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.player_wallet_ledger FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS cards_self_rw ON public.player_collectible_cards;
CREATE POLICY cards_self_read ON public.player_collectible_cards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.player_collectible_cards FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS loadouts_self_write ON public.player_loadouts;
REVOKE INSERT, UPDATE, DELETE ON public.player_loadouts FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS seasonal_recap_self ON public.seasonal_stat_recaps;
CREATE POLICY seasonal_recap_self_read ON public.seasonal_stat_recaps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.seasonal_stat_recaps FROM PUBLIC, anon, authenticated;

-- 6. Allow adding individual AI Mentor accepted quests into player_dynamic_quests
CREATE OR REPLACE FUNCTION public.rpc_add_mentor_daily_quest(
  p_period_key TEXT,
  p_quest JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_quest_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_period_key IS NULL OR trim(p_period_key) = '' OR p_quest IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quest payload.');
  END IF;

  v_quest_id := LEFT(COALESCE(NULLIF(trim(p_quest->>'id'), ''), 'mentor-' || gen_random_uuid()::text), 100);

  INSERT INTO public.player_dynamic_quests (
    id, user_id, period_key, title, description, category, difficulty,
    objective_label, evidence_type, progress, max_progress, unit_label,
    estimated_minutes, player_xp_reward, forge_xp_reward, gold_reward,
    is_special_challenge, personalization_reason, adaptive_tier
  ) VALUES (
    v_quest_id,
    v_uid,
    p_period_key,
    LEFT(COALESCE(p_quest->>'title', 'Mentor Guidance Quest'), 140),
    LEFT(COALESCE(p_quest->>'description', ''), 500),
    CASE WHEN p_quest->>'category' IN ('physical','intellectual','discipline','personal_growth','social') THEN p_quest->>'category' ELSE 'discipline' END,
    CASE WHEN p_quest->>'difficulty' IN ('easy','medium','challenging','special') THEN p_quest->>'difficulty' ELSE 'medium' END,
    LEFT(COALESCE(p_quest->>'objectiveLabel', 'Complete objective'), 200),
    COALESCE(p_quest->>'evidenceType', 'personal_reflection'),
    0,
    GREATEST(1, LEAST(500, COALESCE((p_quest->>'maxProgress')::INTEGER, 1))),
    LEFT(COALESCE(p_quest->>'unitLabel', 'step'), 40),
    GREATEST(5, LEAST(180, COALESCE((p_quest->>'estimatedMinutes')::INTEGER, 15))),
    GREATEST(10, LEAST(250, COALESCE((p_quest->>'playerXpReward')::INTEGER, 45))),
    GREATEST(10, LEAST(200, COALESCE((p_quest->>'forgeXpReward')::INTEGER, 30))),
    GREATEST(10, LEAST(200, COALESCE((p_quest->>'goldReward')::INTEGER, 30))),
    false,
    LEFT(COALESCE(p_quest->>'personalizationReason', 'AI Mentor Guidance'), 300),
    COALESCE(p_quest->>'adaptiveTier', 'balanced')
  )
  ON CONFLICT (user_id, period_key, id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'questId', v_quest_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_add_mentor_daily_quest(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_add_mentor_daily_quest(TEXT, JSONB) TO authenticated;

