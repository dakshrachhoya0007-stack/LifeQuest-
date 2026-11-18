-- ==============================================================================
-- LIFEQUEST — PHASES 2 TO 7 ADDITIVE UPGRADE MIGRATION
-- Strictly additive & non-destructive: preserves all existing player progress.
-- Phase 2: Independent Competitive Rivals Platform (separated from Boss Battles)
-- Phase 3: Skill Tree Ledger Completeness, Analytics & Historical Reconciliation
-- Phase 4: Global Achievements Rarity Overhaul, Auth/Security & Zero XP Inflation
-- Phase 6: Personal Records Museum Recovery & Privacy Integrity
-- Phase 7: 4-State Player Presence Standardization ('online','offline','away','dnd')
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PHASE 7: STANDARDIZE PLAYER PRESENCE STATUS TO 4 STATES ('busy' -> 'dnd')
-- ==============================================================================

UPDATE public.profiles
SET presence_status = 'dnd'
WHERE presence_status = 'busy';

UPDATE public.user_presence
SET
  manual_status = CASE WHEN manual_status = 'busy' THEN 'dnd' ELSE manual_status END,
  effective_status = CASE WHEN effective_status = 'busy' THEN 'dnd' ELSE effective_status END
WHERE manual_status = 'busy' OR effective_status = 'busy';

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_presence'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%manual_status%' OR pg_get_constraintdef(oid) LIKE '%effective_status%')
  LOOP
    EXECUTE format('ALTER TABLE public.user_presence DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.user_presence
  ADD CONSTRAINT user_presence_manual_status_check
    CHECK (manual_status IN ('online', 'offline', 'away', 'dnd')),
  ADD CONSTRAINT user_presence_effective_status_check
    CHECK (effective_status IN ('online', 'offline', 'away', 'dnd'));

CREATE OR REPLACE FUNCTION public.rpc_update_presence(
  p_status TEXT DEFAULT NULL,
  p_is_auto_away BOOLEAN DEFAULT NULL,
  p_auto_away_enabled BOOLEAN DEFAULT NULL,
  p_auto_away_minutes INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := now();
  v_profile public.profiles%ROWTYPE;
  v_manual TEXT;
  v_effective TEXT;
  v_auto_enabled BOOLEAN;
  v_auto_mins INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
  END IF;

  v_manual := COALESCE(NULLIF(lower(trim(p_status)), ''), v_profile.presence_status, 'online');
  IF v_manual = 'busy' THEN
    v_manual := 'dnd';
  END IF;
  IF v_manual NOT IN ('online', 'offline', 'away', 'dnd') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid presence status.');
  END IF;

  v_auto_enabled := COALESCE(p_auto_away_enabled, v_profile.auto_away_enabled, true);
  v_auto_mins := LEAST(60, GREATEST(1, COALESCE(p_auto_away_minutes, v_profile.auto_away_minutes, 5)));
  v_effective := CASE
    WHEN COALESCE(p_is_auto_away, false) AND v_manual = 'online' THEN 'away'
    ELSE v_manual
  END;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  UPDATE public.profiles
  SET
    presence_status = CASE WHEN COALESCE(p_is_auto_away, false) THEN CASE WHEN presence_status = 'busy' THEN 'dnd' ELSE presence_status END ELSE v_manual END,
    auto_away_enabled = v_auto_enabled,
    auto_away_minutes = v_auto_mins,
    last_active_at = CASE WHEN v_effective = 'offline' THEN last_active_at ELSE v_now END
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  INSERT INTO public.user_presence (
    user_id, manual_status, effective_status, is_auto_away, auto_away_enabled, auto_away_minutes, last_heartbeat_at, last_active_at, updated_at
  )
  VALUES (
    v_uid,
    CASE WHEN COALESCE(p_is_auto_away, false) THEN COALESCE(NULLIF(v_profile.presence_status, 'busy'), 'online') ELSE v_manual END,
    v_effective,
    COALESCE(p_is_auto_away, false),
    v_auto_enabled,
    v_auto_mins,
    v_now,
    CASE WHEN v_effective = 'offline' THEN v_profile.last_active_at ELSE v_now END,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    manual_status = CASE WHEN COALESCE(p_is_auto_away, false) THEN user_presence.manual_status ELSE v_manual END,
    effective_status = v_effective,
    is_auto_away = COALESCE(p_is_auto_away, false),
    auto_away_enabled = v_auto_enabled,
    auto_away_minutes = v_auto_mins,
    last_heartbeat_at = v_now,
    last_active_at = CASE WHEN v_effective = 'offline' THEN user_presence.last_active_at ELSE v_now END,
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'manualStatus', CASE WHEN COALESCE(p_is_auto_away, false) THEN v_profile.presence_status ELSE v_manual END,
    'effectiveStatus', v_effective,
    'isAutoAway', COALESCE(p_is_auto_away, false),
    'lastActiveAt', v_profile.last_active_at
  );
END;
$$;

-- ==============================================================================
-- PHASE 2: INDEPENDENT COMPETITIVE RIVALS PLATFORM
-- Completely separated from Boss Battles, XP rewards, Gold, and XP Leaderboards
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rival_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1200 CHECK (rating BETWEEN 100 AND 4000),
  rating_deviation NUMERIC NOT NULL DEFAULT 200 CHECK (rating_deviation BETWEEN 30 AND 350),
  volatility NUMERIC NOT NULL DEFAULT 0.06,
  k_factor INTEGER NOT NULL DEFAULT 32 CHECK (k_factor BETWEEN 12 AND 48),
  tier TEXT NOT NULL DEFAULT 'Silver' CHECK (
    tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Legendary')
  ),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  ties INTEGER NOT NULL DEFAULT 0 CHECK (ties >= 0),
  matches_played INTEGER NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  peak_rating INTEGER NOT NULL DEFAULT 1200,
  seasonal_rating INTEGER NOT NULL DEFAULT 1200,
  allow_nonfriend_challenges BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rival_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (
    mode IN ('strength', 'endurance', 'consistency', 'discipline', 'overall_fitness', 'custom')
  ),
  challenge_title TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{"durationDays":7,"targetScore":500,"allowRestDays":true,"ranked":true}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'friends' CHECK (visibility IN ('friends', 'public', 'private')),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'accepted', 'active', 'completed', 'cancelled', 'expired', 'disputed')
  ),
  is_ranked BOOLEAN NOT NULL DEFAULT true,
  challenger_score INTEGER NOT NULL DEFAULT 0 CHECK (challenger_score >= 0),
  opponent_score INTEGER NOT NULL DEFAULT 0 CHECK (opponent_score >= 0),
  winner_id UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_tie BOOLEAN NOT NULL DEFAULT false,
  challenger_rating_before INTEGER DEFAULT NULL,
  challenger_rating_after INTEGER DEFAULT NULL,
  challenger_rating_delta INTEGER DEFAULT NULL,
  opponent_rating_before INTEGER DEFAULT NULL,
  opponent_rating_after INTEGER DEFAULT NULL,
  opponent_rating_delta INTEGER DEFAULT NULL,
  rematch_of_match_id UUID DEFAULT NULL REFERENCES public.rival_matches(id) ON DELETE SET NULL,
  dispute_reason TEXT DEFAULT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (challenger_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_rival_matches_participants
  ON public.rival_matches(challenger_id, opponent_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.rival_matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (
    mode IN ('strength', 'endurance', 'consistency', 'discipline', 'overall_fitness', 'custom')
  ),
  rating_snapshot INTEGER NOT NULL DEFAULT 1200,
  min_rating INTEGER NOT NULL DEFAULT 1050,
  max_rating INTEGER NOT NULL DEFAULT 1350,
  status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled', 'expired')),
  matched_match_id UUID DEFAULT NULL REFERENCES public.rival_matches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rival_queue_active_user_mode
  ON public.rival_matchmaking_queue(user_id, mode)
  WHERE status = 'searching';

CREATE TABLE IF NOT EXISTS public.rival_match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.rival_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  safety_capped BOOLEAN NOT NULL DEFAULT false,
  daily_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_rival_match_events_lookup
  ON public.rival_match_events(match_id, user_id, daily_bucket);

-- Safe, idempotent migration of valid historical player_rivalries into rival_matches
INSERT INTO public.rival_matches (
  id, challenger_id, opponent_id, mode, challenge_title, status,
  is_ranked, challenger_score, opponent_score, winner_id, is_tie,
  starts_at, ends_at, resolved_at, created_at
)
SELECT
  pr.id,
  pr.challenger_id,
  pr.opponent_id,
  CASE pr.challenge_type
    WHEN 'weekly_activity_score' THEN 'overall_fitness'
    WHEN 'workout_consistency' THEN 'consistency'
    WHEN 'strength_milestones' THEN 'strength'
    WHEN 'endurance_achievements' THEN 'endurance'
    WHEN 'habit_completion' THEN 'discipline'
    ELSE 'overall_fitness'
  END,
  pr.challenge_title,
  CASE pr.status
    WHEN 'declined' THEN 'cancelled'
    ELSE pr.status
  END,
  false, -- Legacy social challenges migrate safely as unranked archive without fabricating ratings
  pr.challenger_score,
  pr.opponent_score,
  pr.winner_id,
  pr.is_tie,
  pr.starts_at,
  pr.ends_at,
  pr.resolved_at,
  pr.created_at
FROM public.player_rivalries pr
WHERE pr.challenger_id <> pr.opponent_id
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.rival_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rival_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rival_matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rival_match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view rival profiles" ON public.rival_profiles;
CREATE POLICY "Authenticated can view rival profiles"
  ON public.rival_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view accessible rival matches" ON public.rival_matches;
CREATE POLICY "Users can view accessible rival matches"
  ON public.rival_matches FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id OR visibility = 'public');

DROP POLICY IF EXISTS "Users can view own matchmaking queue" ON public.rival_matchmaking_queue;
CREATE POLICY "Users can view own matchmaking queue"
  ON public.rival_matchmaking_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view rival match events" ON public.rival_match_events;
CREATE POLICY "Users can view rival match events"
  ON public.rival_match_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rival_matches m
      WHERE m.id = match_id
        AND (m.challenger_id = auth.uid() OR m.opponent_id = auth.uid() OR m.visibility = 'public')
    )
  );

-- Competitive tier computation helper
CREATE OR REPLACE FUNCTION public.compute_competitive_tier(p_rating INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_rating >= 2300 THEN RETURN 'Legendary'; END IF;
  IF p_rating >= 2100 THEN RETURN 'Grandmaster'; END IF;
  IF p_rating >= 1900 THEN RETURN 'Master'; END IF;
  IF p_rating >= 1700 THEN RETURN 'Diamond'; END IF;
  IF p_rating >= 1500 THEN RETURN 'Platinum'; END IF;
  IF p_rating >= 1300 THEN RETURN 'Gold'; END IF;
  IF p_rating >= 1100 THEN RETURN 'Silver'; END IF;
  RETURN 'Bronze';
END;
$$;

-- ==============================================================================
-- PHASE 3: SKILL TREE ANALYTICS & VERIFIED HISTORICAL RECONCILIATION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_reconcile_skill_tree_from_verified()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inserted_count INTEGER := 0;
  v_w RECORD;
  v_h RECORD;
  v_act TEXT;
  v_attr TEXT;
  v_xp INTEGER;
  v_bucket TEXT;
  v_idem TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Idempotently backfill verified workout sessions not yet recorded in skill ledger
  FOR v_w IN
    SELECT id, exercise_type, duration_minutes, repetitions, verified_with_aether_vision, created_at
    FROM public.workout_sessions
    WHERE user_id = v_uid
    ORDER BY created_at ASC
  LOOP
    v_idem := 'workout:' || v_w.id::text;
    IF NOT EXISTS (
      SELECT 1 FROM public.skill_activity_ledger WHERE user_id = v_uid AND idempotency_key = v_idem
    ) THEN
      v_act := CASE
        WHEN v_w.exercise_type = 'yoga' THEN 'recovery_habit'
        WHEN v_w.exercise_type IN ('running', 'walking', 'cycling', 'jumping_jack') THEN 'cardio_workout'
        ELSE 'strength_workout'
      END;
      v_attr := CASE v_act
        WHEN 'cardio_workout' THEN 'endurance'
        WHEN 'recovery_habit' THEN 'vitality'
        ELSE 'strength'
      END;
      v_xp := CASE v_act
        WHEN 'recovery_habit' THEN LEAST(32, 24 + LEAST(8, COALESCE(v_w.duration_minutes, 10) / 5))
        WHEN 'cardio_workout' THEN 18 + LEAST(14, LEAST(12, COALESCE(v_w.duration_minutes, 10) * 1 / 3)) + CASE WHEN v_w.verified_with_aether_vision THEN 8 ELSE 0 END
        ELSE 18 + LEAST(14, LEAST(10, COALESCE(v_w.duration_minutes, 10) / 4) + LEAST(8, COALESCE(v_w.repetitions, 0) / 8)) + CASE WHEN v_w.verified_with_aether_vision THEN 8 ELSE 0 END
      END;
      v_bucket := to_char(v_w.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD');

      INSERT INTO public.skill_activity_ledger (
        user_id, idempotency_key, activity_type, attribute_id, source_type, source_id, xp_awarded, safety_capped, daily_bucket, created_at
      ) VALUES (
        v_uid, v_idem, v_act, v_attr, 'workout_session_reconcile', v_w.id::text, v_xp, false, v_bucket, v_w.created_at
      ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;

      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  -- Idempotently backfill verified habit logs not yet recorded in skill ledger
  FOR v_h IN
    SELECT hl.habit_id, hl.period_key, hl.created_at, COALESCE(h.category, 'discipline') AS cat
    FROM public.habit_logs hl
    LEFT JOIN public.habits h ON h.id = hl.habit_id
    WHERE hl.user_id = v_uid
    ORDER BY hl.created_at ASC
  LOOP
    v_idem := 'habit:' || v_h.habit_id || ':' || v_h.period_key;
    IF NOT EXISTS (
      SELECT 1 FROM public.skill_activity_ledger WHERE user_id = v_uid AND idempotency_key = v_idem
    ) THEN
      v_act := CASE
        WHEN v_h.cat = 'mindfulness' THEN 'study_session'
        WHEN v_h.cat IN ('sleep', 'nutrition') THEN 'recovery_habit'
        WHEN v_h.cat = 'fitness' THEN 'strength_workout'
        ELSE 'habit_completion'
      END;
      v_attr := CASE v_act
        WHEN 'study_session' THEN 'focus'
        WHEN 'recovery_habit' THEN 'vitality'
        WHEN 'strength_workout' THEN 'strength'
        ELSE 'discipline'
      END;
      v_xp := CASE v_act
        WHEN 'study_session' THEN 24
        WHEN 'recovery_habit' THEN 24
        WHEN 'strength_workout' THEN 24
        ELSE 24
      END;
      v_bucket := to_char(v_h.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD');

      INSERT INTO public.skill_activity_ledger (
        user_id, idempotency_key, activity_type, attribute_id, source_type, source_id, xp_awarded, safety_capped, daily_bucket, created_at
      ) VALUES (
        v_uid, v_idem, v_act, v_attr, 'habit_completion_reconcile', v_h.habit_id, v_xp, false, v_bucket, v_h.created_at
      ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;

      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  -- Recompute authoritative player_skill_attributes totals from complete skill_activity_ledger
  IF v_inserted_count > 0 THEN
    INSERT INTO public.player_skill_attributes (user_id, attribute_id, xp, level, total_activities, last_activity_at, updated_at)
    SELECT
      v_uid,
      a.attr_id,
      COALESCE(SUM(l.xp_awarded), 0)::INTEGER,
      public.compute_skill_attribute_level(COALESCE(SUM(l.xp_awarded), 0)::INTEGER),
      COUNT(l.id)::INTEGER,
      MAX(l.created_at),
      now()
    FROM unnest(ARRAY['strength','endurance','discipline','focus','resilience','vitality']) AS a(attr_id)
    LEFT JOIN public.skill_activity_ledger l
      ON l.user_id = v_uid AND l.attribute_id = a.attr_id
    GROUP BY a.attr_id
    ON CONFLICT (user_id, attribute_id) DO UPDATE SET
      xp = GREATEST(public.player_skill_attributes.xp, EXCLUDED.xp),
      level = public.compute_skill_attribute_level(GREATEST(public.player_skill_attributes.xp, EXCLUDED.xp)),
      total_activities = GREATEST(public.player_skill_attributes.total_activities, EXCLUDED.total_activities),
      last_activity_at = COALESCE(EXCLUDED.last_activity_at, public.player_skill_attributes.last_activity_at),
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reconciledCount', v_inserted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_reconcile_skill_tree_from_verified() TO authenticated;

-- ==============================================================================
-- PHASE 4: GLOBAL ACHIEVEMENTS — RARE LIFETIME THRESHOLDS & SECURITY HARDENING
-- Overhaul all 52 achievements so none can be trivially completed in one day.
-- Reward ZERO XP into global competitive XP leaderboards (Prestige Honor + Title + Trophy only).
-- ==============================================================================

INSERT INTO public.global_achievements_catalog (
  id, name, story, category, rarity, difficulty, title_tag, title_style,
  emblem_icon, requirement_summary, requirement_type, threshold,
  reward_player_xp, reward_forge_xp, reward_gold, is_hidden
) VALUES
  ('gl-disc-01','Oathkeeper of Dawn','First across the realm to conquer seventy-five Discipline trials with unshakeable poise.','legendary_discipline','Legendary','Hard','OATHKEEPER OF DAWN','gold','ShieldCheck','Claim 75 Discipline category AI quests','dynamic_discipline_claimed',75,0,500,800,false),
  ('gl-disc-02','The Unyielding Vow','While lesser knights broke when fatigue spoke, one stood firm through three hundred daily habits.','legendary_discipline','Legendary','Extreme','THE UNYIELDING','gold','Flame','Record 300 completed habit logs across your journey','habits_claimed_total',300,0,650,1000,false),
  ('gl-disc-03','Architect of Order','Carved structure out of chaos across one hundred fifty AI-forged daily quests.','legendary_discipline','Mythic','Extreme','ARCHITECT OF ORDER','arcane','Compass','Claim 150 AI Dynamic Daily Quests','dynamic_quests_claimed_total',150,0,800,1400,false),
  ('gl-disc-04','Sovereign of Routine','A thousand vows kept over seasons of unwavering personal command.','legendary_discipline','Ascendant','Pinnacle','ROUTINE SOVEREIGN','celestial','Crown','Record 1,000 completed habit logs','habits_claimed_total',1000,0,1500,3000,false),
  ('gl-disc-05','Sentinel of Procrastination Slain','Struck down hesitation permanently across two hundred Discipline quests.','legendary_discipline','Mythic','Pinnacle','IRON WILL SENTINEL','crimson','Swords','Claim 200 Discipline category AI quests','dynamic_discipline_claimed',200,0,1200,2200,false),
  ('gl-disc-06','Tempered Temperance','Mastered lifelong consistency across three hundred total completed quests.','legendary_discipline','Celestial','Pinnacle','TEMPERED PARAGON','emerald','Gem','Claim 300 quests across classic and dynamic quest boards','quests_claimed_total',300,0,1400,2600,false),
  ('gl-disc-07','The First Ascendant','First champion to reach 100,000 lifetime Player XP through authentic dedication.','legendary_discipline','Eternal','Pinnacle','THE FIRST ASCENDANT','prismatic','Sparkles','Amass 100,000 total Player XP across the realm','total_xp',100000,0,2200,5000,false),

  ('gl-know-01','Scribe of the Astral Archive','Inscribed seventy-five verified study reflections into the Astral Chronicle.','master_of_knowledge','Legendary','Hard','ASTRAL SCRIBE','celestial','BookOpen','Complete 75 Intellectual category AI quests','dynamic_intellectual_claimed',75,0,500,800,false),
  ('gl-know-02','Grand Scholar of Aetheria','Turned hundreds of quiet study hours into unmatched realm wisdom.','master_of_knowledge','Mythic','Extreme','GRAND SCHOLAR','arcane','GraduationCap','Complete 175 Intellectual category AI quests','dynamic_intellectual_claimed',175,0,900,1600,false),
  ('gl-know-03','Oracle of Self-Mastery','Reviewed sixty full Daily Quest Reports across seasons of deliberate self-study.','master_of_knowledge','Legendary','Extreme','SELF ORACLE','celestial','ScrollText','Generate and review 60 Daily Quest Reports','daily_reports_generated',60,0,700,1200,false),
  ('gl-know-04','Sage of Growth','Conquered one hundred fifty Personal Growth quests through steady reflection.','master_of_knowledge','Ascendant','Extreme','SAGE OF GROWTH','emerald','Lightbulb','Complete 150 Personal Growth category AI quests','dynamic_personal_growth_claimed',150,0,950,1800,false),
  ('gl-know-05','Luminary of the High Spire','Completed three hundred Intellectual trials; an unmatched beacon of focus.','master_of_knowledge','Celestial','Pinnacle','HIGH SPIRE LUMINARY','celestial','Eye','Complete 300 Intellectual category AI quests','dynamic_intellectual_claimed',300,0,1600,3200,false),
  ('gl-know-06','Keeper of All Scrolls','Reviewed one hundred eighty Daily Quest Reports across half a year of self-mastery.','master_of_knowledge','Eternal','Pinnacle','KEEPER OF SCROLLS','prismatic','Library','Generate and review 180 Daily Quest Reports','daily_reports_generated',180,0,2000,4200,false),

  ('gl-phys-01','Vanguard of Iron','Forged steel resilience across one hundred twenty verified workout sessions.','physical_excellence','Legendary','Extreme','VANGUARD OF IRON','crimson','Dumbbell','Complete 120 fitness workout sessions','total_workouts',120,0,750,1200,false),
  ('gl-phys-02','Titan of Fifteen Thousand Reps','Fifteen thousand verified repetitions witnessed under disciplined form.','physical_excellence','Mythic','Extreme','TITAN OF IRON','crimson','Zap','Accumulate 15,000 Aether Vision verified repetitions','total_verified_reps',15000,0,1100,2000,false),
  ('gl-phys-03','Avatar of Motion','Conquered one hundred fifty Physical AI quests across running, strength, and mobility.','physical_excellence','Ascendant','Extreme','AVATAR OF MOTION','gold','Activity','Complete 150 Physical category AI quests','dynamic_physical_claimed',150,0,1000,1800,false),
  ('gl-phys-04','Colossus of Endurance','Three hundred full training sessions earned safely over long-term commitment.','physical_excellence','Celestial','Pinnacle','COLOSSUS','crimson','Shield','Complete 300 fitness workout sessions','total_workouts',300,0,1800,3500,false),
  ('gl-phys-05','Fifty-Thousandfold Strike','Fifty thousand verified repetitions built patiently without shortcuts or injury.','physical_excellence','Eternal','Pinnacle','APEX ATHLETE','prismatic','Trophy','Accumulate 50,000 Aether Vision verified repetitions','total_verified_reps',50000,0,2400,5000,false),
  ('gl-phys-06','Swift Strider of the Realm','First runner to conquer eighty Physical AI quests with balanced recovery.','physical_excellence','Legendary','Hard','SWIFT STRIDER','emerald','Wind','Complete 80 Physical category AI quests','dynamic_physical_claimed',80,0,650,1100,false),
  ('gl-phys-07','Aether Body Ascendant','Gathered 18,000 Aether Points through pure physical mastery and vitality.','physical_excellence','Ascendant','Pinnacle','AETHER VESSEL','celestial','Sun','Earn 18,000 Aether Points','aether_points',18000,0,1400,2800,false),

  ('gl-cons-01','Keeper of the Forty-Five-Day Flame','Sustained a blazing 45-day streak through storms, travel, and fatigue.','unbreakable_consistency','Legendary','Extreme','FLAMEKEEPER','gold','Flame','Reach a 45-day habit streak','current_streak',45,0,750,1200,false),
  ('gl-cons-02','Quarter-Year Sentinel','Ninety unbroken dawns; discipline ceased to be effort and became identity.','unbreakable_consistency','Mythic','Pinnacle','NINETY DAWNS','celestial','Moon','Reach a 90-day habit streak','current_streak',90,0,1400,2600,false),
  ('gl-cons-03','Immortal Sunbeam','One hundred eighty consecutive days of honoring your word across Aetheria.','unbreakable_consistency','Eternal','Pinnacle','UNBROKEN','prismatic','Crown','Reach a 180-day habit streak','current_streak',180,0,2500,5500,false),
  ('gl-cons-04','Steward of Living Springs','Honored nourishment and hydration across sixty full daily hydration milestones.','unbreakable_consistency','Legendary','Extreme','SPRING STEWARD','celestial','Droplets','Complete 60 daily hydration milestones','hydration_goals_total',60,0,650,1100,false),
  ('gl-cons-05','Alchemist of Wholesome Table','Recorded one hundred eighty balanced meals with honest culinary discipline.','unbreakable_consistency','Mythic','Extreme','HARVEST KEEPER','emerald','Apple','Log 180 balanced meals in Nutrition','meals_logged_total',180,0,850,1500,false),
  ('gl-cons-06','Five-Hundredfold Nourishment','Five hundred mindful meals logged across seasons of sustained health.','unbreakable_consistency','Ascendant','Pinnacle','VITALITY MASTER','emerald','Heart','Log 500 balanced meals in Nutrition','meals_logged_total',500,0,1600,3200,false),
  ('gl-cons-07','Centurion of Quests','Claimed three hundred fifty AI-crafted daily quests without yielding a season.','unbreakable_consistency','Celestial','Pinnacle','QUEST CENTURION','gold','Award','Claim 350 AI Dynamic Daily Quests','dynamic_quests_claimed_total',350,0,1900,3800,false),

  ('gl-expl-01','Chronicler of the First Ruin','Conquered 450 lifetime habit vows while reconstructing the Fallen Citadel lore.','exploration_and_discovery','Legendary','Extreme','REALM CHRONICLER','gold','Map','Record 450 completed habit logs after Storyline initiation','habits_claimed_total',450,0,800,1400,false),
  ('gl-expl-02','Restorer of Aetheria','Reached Level 35 and completed all 7 Storyline Campaign chapters.','exploration_and_discovery','Celestial','Pinnacle','REALM RESTORER','prismatic','Crown','Reach Player Level 35 across Aetheria campaigns','level',35,0,2000,4000,false),
  ('gl-expl-03','Collector of Relics','Assembled twenty distinct armaments forged through long-term dedication.','exploration_and_discovery','Mythic','Extreme','RELIC COLLECTOR','arcane','Hammer','Unlock 20 weapons or gear pieces in your Armory','unlocked_weapons_count',20,0,1000,1800,false),
  ('gl-expl-04','Grand Arsenal Curator','Collected thirty legendary armaments into a sovereign armory vault.','exploration_and_discovery','Ascendant','Pinnacle','ARSENAL CURATOR','gold','Swords','Unlock 30 weapons or gear pieces in your Armory','unlocked_weapons_count',30,0,1600,3200,false),
  ('gl-expl-05','Master of the Anvil','Tempered an heirloom weapon to pinnacle Level 25 in the Blacksmith Forge.','exploration_and_discovery','Mythic','Pinnacle','ANVIL MASTER','crimson','Hammer','Upgrade any weapon in the Armory to Level 25','max_weapon_level',25,0,1400,2500,false),
  ('gl-expl-06','Archivist of Heroic Feats','Unlocked thirty-five standard realm achievements across every pillar of LifeQuest.','exploration_and_discovery','Ascendant','Extreme','ARCHIVIST','celestial','Award','Unlock 35 normal realm achievements','normal_achievements_unlocked',35,0,1200,2200,false),

  ('gl-soc-01','Herald of Fellowship','Built an enduring circle of twenty-five accepted allies across Aetheria.','social_legends','Legendary','Hard','HERALD OF BONDS','emerald','Users','Have 25 accepted friends in Aetheria','friends_count',25,0,600,1000,false),
  ('gl-soc-02','Ambassador of Kindness','Completed seventy-five Social AI quests Uplifting real-world communities.','social_legends','Mythic','Extreme','REALM AMBASSADOR','emerald','HeartHandshake','Complete 75 Social category AI quests','dynamic_social_claimed',75,0,900,1600,false),
  ('gl-soc-03','Founder of the Citadel Guild','Achieved Level 30 Guild command and sustained active guild leadership.','social_legends','Mythic','Pinnacle','GUILD SOVEREIGN','gold','Shield','Hold Guild Leader rank at Player Level 30+','level',30,0,1400,2600,false),
  ('gl-soc-04','Tavern Bard of Aetheria','Shared two hundred fifty encouraging dispatches across Realm and Guild chat.','social_legends','Legendary','Hard','TAVERN BARD','arcane','MessageSquare','Send 250 messages in Realm or Guild Chat','chat_messages_sent',250,0,650,1100,false),
  ('gl-soc-05','Paragon of Unity','Completed two hundred Social AI quests, uplifting real communities beyond the screen.','social_legends','Celestial','Pinnacle','PARAGON OF UNITY','celestial','Sparkles','Complete 200 Social category AI quests','dynamic_social_claimed',200,0,1700,3400,false),
  ('gl-soc-06','Bannerlord of Sixty Allies','Forged sixty trusted, accepted friendships across the realm.','social_legends','Ascendant','Pinnacle','BANNERLORD','gold','Users','Have 60 accepted friends in Aetheria','friends_count',60,0,1400,2800,false),

  ('gl-ult-01','Dragonslayer of the Five Kingdoms','Vanquished bosses forty times over, turning dread into sovereign triumph.','ultimate_challenges','Mythic','Extreme','DREADSLAYER','crimson','Swords','Defeat Kingdom Bosses 40 times','total_bosses_defeated',40,0,1300,2400,false),
  ('gl-ult-02','Conqueror of All Five Realms','Defeated bosses eighty times and cleansed every realm of stagnation.','ultimate_challenges','Celestial','Pinnacle','FIVE REALMS CONQUEROR','crimson','Crown','Defeat Kingdom Bosses 80 times','total_bosses_defeated',80,0,2200,4500,false),
  ('gl-ult-03','Ascendant Level Thirty','Reached Player Level 30 through months of balanced training, habits, and focus.','ultimate_challenges','Ascendant','Extreme','GRAND CHAMPION','gold','Star','Reach Player Level 30','level',30,0,1500,3000,false),
  ('gl-ult-04','Eternal Level Fifty','A mythic plateau of real-world transformation achieved at Level 50.','ultimate_challenges','Eternal','Pinnacle','ETERNAL LEGEND','prismatic','Crown','Reach Player Level 50','level',50,0,3000,6500,false),
  ('gl-ult-05','Gilded Treasurer of the Crown','Held twenty-five thousand Gold Sovereigns earned honestly through quests and raids.','ultimate_challenges','Ascendant','Pinnacle','GILDED SOVEREIGN','gold','Coins','Hold 25,000 Gold in your treasury','gold_balance',25000,0,1200,2000,false),
  ('gl-ult-06','Emberheart Forge Master','Accumulated 10,000 Forge XP—enough cosmic fire to reforge celestial steel.','ultimate_challenges','Mythic','Pinnacle','EMBERHEART','crimson','Flame','Hold 10,000 Forge XP ready for the anvil','forge_xp_balance',10000,0,1100,2200,false),
  ('gl-ult-07','Celestial Starbearer','Reached 35,000 Aether Points, shining like a second sun above the Fallen Citadel.','ultimate_challenges','Eternal','Pinnacle','STARBEARER','prismatic','Sparkles','Accumulate 35,000 Aether Points','aether_points',35000,0,2600,5800,false),

  ('gl-hid-01','Echo of the Fallen Crown','Sustained a 120-day unbroken streak after reclaiming the Fallen Crown.','special_hidden_achievements','Mythic','Secret','CROWN RECLAIMED','gold','Crown','Reach a 120-day habit streak','current_streak',120,0,1800,3600,true),
  ('gl-hid-02','Voice Across the Veil','Delivered five hundred Realm or Guild messages uniting fellow champions.','special_hidden_achievements','Legendary','Secret','VOICE OF FELLOWSHIP','arcane','Compass','Send 500 messages across Realm and Guild halls','chat_messages_sent',500,0,1100,2000,true),
  ('gl-hid-03','Mirror of True Growth','Completed two hundred Personal Growth quests that reshaped daily mastery.','special_hidden_achievements','Celestial','Secret','SOULFORGED','emerald','Sparkles','Complete 200 Personal Growth AI quests','dynamic_personal_growth_claimed',200,0,1800,3600,true),
  ('gl-hid-04','Century of the Aether Blade','Defeated Kingdom Bosses 100 times in silent mastery of timing and resolve.','special_hidden_achievements','Eternal','Secret','VOIDBREAKER','crimson','Swords','Defeat Kingdom Bosses 100 times','total_bosses_defeated',100,0,2600,5500,true),
  ('gl-hid-05','Whisper of the Five-Hundredth Deed','Completed 500 combined quests—etching permanence into the notice board.','special_hidden_achievements','Celestial','Secret','MYTHWALKER','arcane','ScrollText','Claim 500 quests across classic and dynamic quest boards','quests_claimed_total',500,0,2200,4500,true),
  ('gl-hid-06','The Phoenix Sovereign','Amassed 250,000 lifetime Player XP—the ultimate phoenix of real-world progression.','special_hidden_achievements','Eternal','Secret','PHOENIX SOVEREIGN','prismatic','Flame','Amass 250,000 total Player XP across the realm','total_xp',250000,0,3500,7500,true)
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

-- Update _compute_user_legend_metrics to also track hydration_goals_total cleanly
CREATE OR REPLACE FUNCTION public._compute_user_legend_metrics(p_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
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

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_habits_claimed FROM public.habit_logs WHERE user_id = p_uid;
  SELECT COALESCE(count(*), 0)::INTEGER INTO v_meals_total FROM public.nutrition_logs WHERE user_id = p_uid;
  SELECT COALESCE(glasses_count, 0)::INTEGER INTO v_water_cur
  FROM public.hydration_logs WHERE user_id = p_uid ORDER BY log_date DESC LIMIT 1;
  SELECT COALESCE(count(*), 0)::INTEGER INTO v_hydration_goals
  FROM public.hydration_logs WHERE user_id = p_uid AND glasses_count >= 8;

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

  v_story_claimed := COALESCE(jsonb_array_length(v_prof.client_preferences->'campaignProgress'->'claimedChapterIds'), 0);
  v_honor_claimed := CASE WHEN COALESCE((v_prof.client_preferences->'reclaimHonor'->>'claimed')::BOOLEAN, false) THEN 1 ELSE 0 END;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_reports_count FROM public.player_daily_reports WHERE user_id = p_uid;

  RETURN jsonb_build_object(
    'level', COALESCE(v_prof.level, 1),
    'total_xp', COALESCE(v_prof.total_xp, 0),
    'current_streak', COALESCE(v_prof.current_streak, 0),
    'total_workouts', COALESCE(v_prof.total_workouts_completed, 0),
    'total_verified_reps', COALESCE(v_prof.total_verified_reps, 0),
    'total_bosses_defeated', COALESCE(v_prof.total_bosses_defeated, 0),
    'aether_points', COALESCE(v_prof.aether_points, 0),
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
    'daily_reports_generated', v_reports_count,
    'gold_balance', COALESCE(v_prof.gold_balance, 0),
    'forge_xp_balance', COALESCE(v_prof.forge_xp, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._compute_user_legend_metrics(UUID) FROM PUBLIC, anon, authenticated;

-- Audit query for existing global achievement claims (non-destructive)
CREATE OR REPLACE FUNCTION public.rpc_audit_global_achievement_claims()
RETURNS TABLE (
  achievement_id TEXT,
  owner_id UUID,
  owner_username TEXT,
  claimed_at TIMESTAMPTZ,
  required_threshold INTEGER,
  verified_progress INTEGER,
  is_verified_eligible BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.achievement_id,
    c.owner_id,
    c.owner_username,
    c.claimed_at,
    g.threshold AS required_threshold,
    COALESCE((public._compute_user_legend_metrics(c.owner_id)->>g.requirement_type)::INTEGER, 0) AS verified_progress,
    COALESCE((public._compute_user_legend_metrics(c.owner_id)->>g.requirement_type)::INTEGER, 0) >= g.threshold AS is_verified_eligible
  FROM public.global_achievement_claims c
  JOIN public.global_achievements_catalog g ON g.id = c.achievement_id
  ORDER BY c.claimed_at ASC;
$$;

REVOKE ALL ON FUNCTION public.rpc_audit_global_achievement_claims() FROM PUBLIC, anon;

-- ==============================================================================
-- PHASE 6: PERSONAL RECORDS MUSEUM RECOVERY & PRIVACY INTEGRITY
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_reconcile_museum_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_added INTEGER := 0;
  v_max_dur INTEGER := 0;
  v_max_dur_at TIMESTAMPTZ := now();
  v_max_reps INTEGER := 0;
  v_max_reps_at TIMESTAMPTZ := now();
  v_workouts_total INTEGER := 0;
  v_streak INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT COALESCE(MAX(duration_minutes), 0) INTO v_max_dur
  FROM public.workout_sessions WHERE user_id = v_uid;

  SELECT COALESCE(MAX(repetitions), 0) INTO v_max_reps
  FROM public.workout_sessions WHERE user_id = v_uid;

  SELECT COUNT(*)::INTEGER INTO v_workouts_total
  FROM public.workout_sessions WHERE user_id = v_uid;

  SELECT COALESCE(current_streak, 0) INTO v_streak
  FROM public.profiles WHERE id = v_uid;

  IF v_max_dur > 0 AND NOT EXISTS (
    SELECT 1 FROM public.personal_records_museum
    WHERE user_id = v_uid AND metric_key = 'max_workout_duration' AND numeric_value >= v_max_dur
  ) THEN
    UPDATE public.personal_records_museum
    SET is_personal_best = false
    WHERE user_id = v_uid AND metric_key = 'max_workout_duration' AND is_personal_best = true;

    SELECT created_at INTO v_max_dur_at
    FROM public.workout_sessions WHERE user_id = v_uid AND duration_minutes = v_max_dur
    ORDER BY created_at DESC LIMIT 1;

    INSERT INTO public.personal_records_museum (
      id, user_id, idempotency_key, category, metric_key, title, description,
      numeric_value, display_value, is_personal_best, achieved_at, source_activity_ref, verified, rarity
    ) VALUES (
      'pb-dur-' || v_uid::text || '-' || v_max_dur::text,
      v_uid,
      'pb:max_workout_duration:' || v_max_dur::text,
      'personal_best',
      'max_workout_duration',
      'Longest Verified Workout',
      'Recovered personal best duration across verified workout history.',
      v_max_dur,
      v_max_dur::text || ' mins',
      true,
      COALESCE(v_max_dur_at, now()),
      'workout_history_reconcile',
      true,
      CASE WHEN v_max_dur >= 45 THEN 'Epic' ELSE 'Rare' END
    ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;

    v_added := v_added + 1;
  END IF;

  IF v_max_reps > 0 AND NOT EXISTS (
    SELECT 1 FROM public.personal_records_museum
    WHERE user_id = v_uid AND metric_key = 'max_session_reps' AND numeric_value >= v_max_reps
  ) THEN
    UPDATE public.personal_records_museum
    SET is_personal_best = false
    WHERE user_id = v_uid AND metric_key = 'max_session_reps' AND is_personal_best = true;

    SELECT created_at INTO v_max_reps_at
    FROM public.workout_sessions WHERE user_id = v_uid AND repetitions = v_max_reps
    ORDER BY created_at DESC LIMIT 1;

    INSERT INTO public.personal_records_museum (
      id, user_id, idempotency_key, category, metric_key, title, description,
      numeric_value, display_value, is_personal_best, achieved_at, source_activity_ref, verified, rarity
    ) VALUES (
      'pb-reps-' || v_uid::text || '-' || v_max_reps::text,
      v_uid,
      'pb:max_session_reps:' || v_max_reps::text,
      'strength',
      'max_session_reps',
      'Most Verified Reps in a Session',
      'Recovered peak repetition record from verified workout logs.',
      v_max_reps,
      v_max_reps::text || ' reps',
      true,
      COALESCE(v_max_reps_at, now()),
      'workout_history_reconcile',
      true,
      CASE WHEN v_max_reps >= 50 THEN 'Epic' ELSE 'Rare' END
    ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;

    v_added := v_added + 1;
  END IF;

  IF v_workouts_total > 0 AND NOT EXISTS (
    SELECT 1 FROM public.personal_records_museum
    WHERE user_id = v_uid AND metric_key = 'total_verified_workouts' AND numeric_value >= v_workouts_total
  ) THEN
    UPDATE public.personal_records_museum
    SET is_personal_best = false
    WHERE user_id = v_uid AND metric_key = 'total_verified_workouts' AND is_personal_best = true;

    INSERT INTO public.personal_records_museum (
      id, user_id, idempotency_key, category, metric_key, title, description,
      numeric_value, display_value, is_personal_best, achieved_at, source_activity_ref, verified, rarity
    ) VALUES (
      'pb-wkt-' || v_uid::text || '-' || v_workouts_total::text,
      v_uid,
      'pb:total_verified_workouts:' || v_workouts_total::text,
      'fitness',
      'total_verified_workouts',
      'Verified Workouts Cumulative',
      'Total verified workout sessions recorded across Aetheria.',
      v_workouts_total,
      v_workouts_total::text || ' workouts',
      true,
      now(),
      'workout_history_reconcile',
      true,
      CASE WHEN v_workouts_total >= 25 THEN 'Legendary' WHEN v_workouts_total >= 10 THEN 'Epic' ELSE 'Common' END
    ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;

    v_added := v_added + 1;
  END IF;

  IF v_streak >= 3 AND NOT EXISTS (
    SELECT 1 FROM public.personal_records_museum
    WHERE user_id = v_uid AND metric_key = 'longest_habit_streak' AND numeric_value >= v_streak
  ) THEN
    UPDATE public.personal_records_museum
    SET is_personal_best = false
    WHERE user_id = v_uid AND metric_key = 'longest_habit_streak' AND is_personal_best = true;

    INSERT INTO public.personal_records_museum (
      id, user_id, idempotency_key, category, metric_key, title, description,
      numeric_value, display_value, is_personal_best, achieved_at, source_activity_ref, verified, rarity
    ) VALUES (
      'pb-stk-' || v_uid::text || '-' || v_streak::text,
      v_uid,
      'pb:longest_habit_streak:' || v_streak::text,
      'consistency',
      'longest_habit_streak',
      'Longest Habit Consistency Streak',
      'Consecutive days of verified habit fulfillment.',
      v_streak,
      v_streak::text || ' days',
      true,
      now(),
      'habit_streak_reconcile',
      true,
      CASE WHEN v_streak >= 30 THEN 'Legendary' WHEN v_streak >= 14 THEN 'Epic' ELSE 'Rare' END
    ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;

    v_added := v_added + 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'recoveredCount', v_added
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_reconcile_museum_records() TO authenticated;

COMMIT;
