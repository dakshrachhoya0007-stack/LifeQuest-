-- ==============================================================================
-- LIFEQUEST — HARDENED UNIFIED BACKEND ARCHITECTURE MIGRATION (WEB + MOBILE)
-- Target: Existing Supabase Project (Atomic, Additive, Non-Destructive, Idempotent)
-- ==============================================================================
-- Preserves all 5 existing tables & all existing player data:
--   public.profiles, public.game_states, public.workout_sessions,
--   public.nutrition_logs, public.habit_logs
-- Hardens:
--   - Atomic transaction wrapper (BEGIN ... COMMIT)
--   - Strict EXECUTE revocations on internal helpers & anon role
--   - Column-level UPDATE privileges & progression-guard trigger on public.profiles
--   - Read-only client isolation on game_states, habit_logs, workout_sessions, nutrition_logs
--   - Anti-exploit hydration resets, boss battle state machine, weapon mastery & habit caps
--   - Starter weapon seeding for new users + clamped/idempotent legacy backfill
--   - security_invoker champion_public_profiles view backed by public_champion_directory
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 0. SHARED TIMEZONE & GAME FORMULA HELPERS (SAFE search_path)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_period_key(
  p_frequency TEXT,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tz TEXT := COALESCE(NULLIF(trim(p_timezone), ''), 'UTC');
  v_local_ts TIMESTAMP;
  v_freq TEXT := lower(COALESCE(p_frequency, 'daily'));
BEGIN
  BEGIN
    v_local_ts := now() AT TIME ZONE v_tz;
  EXCEPTION WHEN OTHERS THEN
    v_local_ts := now() AT TIME ZONE 'UTC';
  END;

  IF v_freq = 'once' THEN
    RETURN 'once';
  ELSIF v_freq = 'weekly' THEN
    -- ISO-8601 week (Monday through Sunday)
    RETURN to_char(v_local_ts, 'IYYY-"W"IW');
  ELSE
    -- daily, weekdays, weekends, custom -> calendar day YYYY-MM-DD
    RETURN to_char(v_local_ts, 'YYYY-MM-DD');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_aether_rank(p_aether_points INTEGER)
RETURNS TABLE(rank_stage TEXT, next_threshold INTEGER)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_pts INTEGER := GREATEST(0, COALESCE(p_aether_points, 0));
BEGIN
  IF v_pts >= 1000 THEN
    rank_stage := 'Transcendent';
    next_threshold := 2000;
  ELSIF v_pts >= 650 THEN
    rank_stage := 'Mythic';
    next_threshold := 1000;
  ELSIF v_pts >= 350 THEN
    rank_stage := 'Ascended';
    next_threshold := 650;
  ELSIF v_pts >= 150 THEN
    rank_stage := 'Awakened';
    next_threshold := 350;
  ELSE
    rank_stage := 'Dormant';
    next_threshold := 150;
  END IF;
  RETURN NEXT;
END;
$$;

-- Harden existing handle_new_user() trigger function with explicit search_path & safe OAuth metadata handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_avatar TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(left(trim(NEW.raw_user_meta_data->>'username'), 40), ''),
    NULLIF(left(trim(NEW.raw_user_meta_data->>'full_name'), 40), ''),
    NULLIF(left(trim(NEW.raw_user_meta_data->>'name'), 40), ''),
    NULLIF(left(split_part(COALESCE(NEW.email, ''), '@', 1), 40), ''),
    'Hero'
  );
  v_avatar := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'picture'), ''),
    ''
  );

  INSERT INTO public.profiles (id, username, avatar_url, is_onboarded)
  VALUES (
    NEW.id,
    v_username,
    v_avatar,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 1. EXTEND EXISTING 5 TABLES (PRESERVING ALL DATA)
-- ------------------------------------------------------------------------------

-- 1A. public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS character_name TEXT,
  ADD COLUMN IF NOT EXISTS character_class TEXT NOT NULL DEFAULT 'Warrior',
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS player_xp INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS player_xp_next_level INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS forge_xp INTEGER NOT NULL DEFAULT 450,
  ADD COLUMN IF NOT EXISTS gold_balance INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS aether_rank TEXT NOT NULL DEFAULT 'Awakened',
  ADD COLUMN IF NOT EXISTS aether_points INTEGER NOT NULL DEFAULT 210,
  ADD COLUMN IF NOT EXISTS aether_points_next_rank INTEGER NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_workouts_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_verified_reps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bosses_defeated INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_kingdom_id TEXT NOT NULL DEFAULT 'kingdom-forest',
  ADD COLUMN IF NOT EXISTS current_chapter_id TEXT NOT NULL DEFAULT 'ch-1',
  ADD COLUMN IF NOT EXISTS equipped_weapon_id TEXT NOT NULL DEFAULT 'w-sword-1',
  ADD COLUMN IF NOT EXISTS preferred_units TEXT NOT NULL DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS age_years INTEGER,
  ADD COLUMN IF NOT EXISTS age_group TEXT,
  ADD COLUMN IF NOT EXISTS biological_sex TEXT,
  ADD COLUMN IF NOT EXISTS height TEXT,
  ADD COLUMN IF NOT EXISTS weight TEXT,
  ADD COLUMN IF NOT EXISTS activity_level TEXT NOT NULL DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS preferred_fitness_activities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fitness_goals TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_preference TEXT NOT NULL DEFAULT 'vegetarian',
  ADD COLUMN IF NOT EXISTS food_allergies TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_intolerances TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disliked_foods TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"dailyReminders":true,"weeklySummary":true,"guildUpdates":true,"questAlerts":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leaderboard_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legacy_migrated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Ensure brand-new signups start un-onboarded, while preserving pre-existing active players
ALTER TABLE public.profiles
  ALTER COLUMN is_onboarded SET DEFAULT false;

UPDATE public.profiles p
SET is_onboarded = true
WHERE p.is_onboarded = false
  AND (
    p.legacy_migrated = true
    OR EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.user_id = p.id)
    OR EXISTS (SELECT 1 FROM public.nutrition_logs nl WHERE nl.user_id = p.id)
    OR EXISTS (SELECT 1 FROM public.habit_logs hl WHERE hl.user_id = p.id)
    OR EXISTS (
      SELECT 1 FROM public.game_states gs
      WHERE gs.user_id = p.id
        AND jsonb_typeof(gs.game_data->'stats') = 'object'
    )
  );

-- Trigger guard: blocks direct client writes to authoritative progression columns
CREATE OR REPLACE FUNCTION public.guard_profiles_progression_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.trusted_rpc', true), '') <> 'true'
     AND (
       current_user IN ('anon', 'authenticated')
       OR session_user IN ('anon', 'authenticated', 'authenticator')
     ) THEN
    IF NEW.level IS DISTINCT FROM OLD.level
       OR NEW.player_xp IS DISTINCT FROM OLD.player_xp
       OR NEW.player_xp_next_level IS DISTINCT FROM OLD.player_xp_next_level
       OR NEW.total_xp IS DISTINCT FROM OLD.total_xp
       OR NEW.forge_xp IS DISTINCT FROM OLD.forge_xp
       OR NEW.gold_balance IS DISTINCT FROM OLD.gold_balance
       OR NEW.aether_rank IS DISTINCT FROM OLD.aether_rank
       OR NEW.aether_points IS DISTINCT FROM OLD.aether_points
       OR NEW.aether_points_next_rank IS DISTINCT FROM OLD.aether_points_next_rank
       OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
       OR NEW.total_workouts_completed IS DISTINCT FROM OLD.total_workouts_completed
       OR NEW.total_verified_reps IS DISTINCT FROM OLD.total_verified_reps
       OR NEW.total_bosses_defeated IS DISTINCT FROM OLD.total_bosses_defeated
       OR NEW.current_kingdom_id IS DISTINCT FROM OLD.current_kingdom_id
       OR NEW.current_chapter_id IS DISTINCT FROM OLD.current_chapter_id
       OR NEW.equipped_weapon_id IS DISTINCT FROM OLD.equipped_weapon_id
       OR NEW.legacy_migrated IS DISTINCT FROM OLD.legacy_migrated
    THEN
      RAISE EXCEPTION 'Direct modification of authoritative player progression is forbidden';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_progression ON public.profiles;
CREATE TRIGGER trg_profiles_guard_progression
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_progression_columns();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_total_xp_desc ON public.profiles (total_xp DESC, level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

-- Narrow public directory table synced via trigger so public.profiles stays strictly private
CREATE TABLE IF NOT EXISTS public.public_champion_directory (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  character_class TEXT NOT NULL DEFAULT 'Warrior',
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 45,
  aether_rank TEXT NOT NULL DEFAULT 'Awakened',
  aether_points INTEGER NOT NULL DEFAULT 210,
  current_streak INTEGER NOT NULL DEFAULT 0,
  total_bosses_defeated INTEGER NOT NULL DEFAULT 0,
  leaderboard_visible BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.sync_public_champion_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_champion_directory (
    id, username, avatar_url, character_class, level, total_xp,
    aether_rank, aether_points, current_streak, total_bosses_defeated,
    leaderboard_visible, last_active_at
  )
  VALUES (
    NEW.id, NEW.username, NEW.avatar_url, NEW.character_class, NEW.level, NEW.total_xp,
    NEW.aether_rank, NEW.aether_points, NEW.current_streak, NEW.total_bosses_defeated,
    NEW.leaderboard_visible, NEW.last_active_at
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    character_class = EXCLUDED.character_class,
    level = EXCLUDED.level,
    total_xp = EXCLUDED.total_xp,
    aether_rank = EXCLUDED.aether_rank,
    aether_points = EXCLUDED.aether_points,
    current_streak = EXCLUDED.current_streak,
    total_bosses_defeated = EXCLUDED.total_bosses_defeated,
    leaderboard_visible = EXCLUDED.leaderboard_visible,
    last_active_at = EXCLUDED.last_active_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_public_dir ON public.profiles;
CREATE TRIGGER trg_profiles_sync_public_dir
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_public_champion_directory();

-- Backfill existing profiles into public_champion_directory cleanly
INSERT INTO public.public_champion_directory (
  id, username, avatar_url, character_class, level, total_xp,
  aether_rank, aether_points, current_streak, total_bosses_defeated,
  leaderboard_visible, last_active_at
)
SELECT
  p.id, p.username, p.avatar_url, p.character_class, p.level, p.total_xp,
  p.aether_rank, p.aether_points, p.current_streak, p.total_bosses_defeated,
  p.leaderboard_visible, p.last_active_at
FROM public.profiles p
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  character_class = EXCLUDED.character_class,
  level = EXCLUDED.level,
  total_xp = EXCLUDED.total_xp,
  aether_rank = EXCLUDED.aether_rank,
  aether_points = EXCLUDED.aether_points,
  current_streak = EXCLUDED.current_streak,
  total_bosses_defeated = EXCLUDED.total_bosses_defeated,
  leaderboard_visible = EXCLUDED.leaderboard_visible,
  last_active_at = EXCLUDED.last_active_at;

-- Public view using security_invoker = true and exposing ONLY leaderboard-visible champions
DROP VIEW IF EXISTS public.champion_public_profiles;
CREATE VIEW public.champion_public_profiles
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.username,
  d.avatar_url,
  d.character_class,
  d.level,
  d.total_xp,
  d.aether_rank,
  d.aether_points,
  d.current_streak,
  d.total_bosses_defeated,
  d.leaderboard_visible,
  d.last_active_at
FROM public.public_champion_directory d
WHERE d.leaderboard_visible = true;

REVOKE ALL ON public.champion_public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.champion_public_profiles TO authenticated;

-- 1B. public.game_states (Retained read-only for clients; client_preferences updated via RPC)
ALTER TABLE public.game_states
  ADD COLUMN IF NOT EXISTS state_version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS client_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

DROP TRIGGER IF EXISTS trg_game_states_updated_at ON public.game_states;
CREATE TRIGGER trg_game_states_updated_at
  BEFORE UPDATE ON public.game_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1C. public.workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS exercise_type TEXT,
  ADD COLUMN IF NOT EXISTS exercise_name TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS verified_with_vision BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forge_xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aether_points_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_idempotency
  ON public.workout_sessions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_created
  ON public.workout_sessions (user_id, created_at DESC);

-- 1D. public.nutrition_logs
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS meal_type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS dietary_category TEXT,
  ADD COLUMN IF NOT EXISTS log_date DATE NOT NULL DEFAULT (timezone('utc'::text, now()))::date,
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forge_xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aether_points_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_logs_idempotency
  ON public.nutrition_logs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date
  ON public.nutrition_logs (user_id, logged_at DESC);

-- 1E. public.habit_logs (DB-level anti-exploit uniqueness by period & idempotency key)
ALTER TABLE public.habit_logs
  ADD COLUMN IF NOT EXISTS habit_id TEXT,
  ADD COLUMN IF NOT EXISTS frequency_type TEXT,
  ADD COLUMN IF NOT EXISTS period_key TEXT,
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forge_xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aether_points_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Backfill legacy habit_logs rows safely before enforcing unique index
UPDATE public.habit_logs
SET
  habit_id = COALESCE(habit_id, NULLIF(habit_data->>'habitId', ''), id::text),
  frequency_type = COALESCE(frequency_type, 'daily'),
  period_key = COALESCE(period_key, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') || '-legacy-' || id::text)
WHERE habit_id IS NULL OR period_key IS NULL;

ALTER TABLE public.habit_logs
  ALTER COLUMN habit_id SET NOT NULL,
  ALTER COLUMN frequency_type SET DEFAULT 'daily',
  ALTER COLUMN period_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_habit_claim_per_period
  ON public.habit_logs (user_id, habit_id, period_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_idempotency
  ON public.habit_logs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_created
  ON public.habit_logs (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. REPLACE LEGACY PERMISSIVE RLS POLICIES ON EXISTING 5 TABLES
-- ------------------------------------------------------------------------------

-- 2.1 public.profiles: clients may read own profile and update ONLY allowed preference columns
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enforce column-level privileges so authenticated cannot even target Gold/XP/level columns via REST
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (
  username,
  character_name,
  avatar_url,
  character_class,
  preferred_units,
  age_years,
  age_group,
  biological_sex,
  height,
  weight,
  activity_level,
  preferred_fitness_activities,
  fitness_goals,
  dietary_preference,
  food_allergies,
  food_intolerances,
  disliked_foods,
  notification_preferences,
  timezone,
  sound_enabled,
  is_onboarded,
  leaderboard_visible,
  last_active_at,
  updated_at
) ON public.profiles TO authenticated;

-- 2.2 public.game_states: read-only for clients (all writes via server RPCs)
DROP POLICY IF EXISTS "Users can view own game state" ON public.game_states;
CREATE POLICY "Users can view own game state"
  ON public.game_states FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own game state" ON public.game_states;
DROP POLICY IF EXISTS "Users can update own game state" ON public.game_states;
DROP POLICY IF EXISTS "Users can delete own game state" ON public.game_states;
REVOKE INSERT, UPDATE, DELETE ON public.game_states FROM PUBLIC, anon, authenticated;

-- 2.3 public.workout_sessions: read-only for clients (writes exclusively via rpc_log_workout)
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workout_sessions;
CREATE POLICY "Users can view own workouts"
  ON public.workout_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workout_sessions;
REVOKE INSERT, UPDATE, DELETE ON public.workout_sessions FROM PUBLIC, anon, authenticated;

-- 2.4 public.nutrition_logs: read-only for clients (writes exclusively via rpc_log_nutrition)
DROP POLICY IF EXISTS "Users can view own nutrition" ON public.nutrition_logs;
CREATE POLICY "Users can view own nutrition"
  ON public.nutrition_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own nutrition" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can update own nutrition" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can delete own nutrition" ON public.nutrition_logs;
REVOKE INSERT, UPDATE, DELETE ON public.nutrition_logs FROM PUBLIC, anon, authenticated;

-- 2.5 public.habit_logs: read-only for clients (prevents deleting/altering claim periods)
DROP POLICY IF EXISTS "Users can view own habit logs" ON public.habit_logs;
CREATE POLICY "Users can view own habit logs"
  ON public.habit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can update own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can delete own habit logs" ON public.habit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.habit_logs FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. NEW NORMALIZED TABLES (SHARED ACROSS WEB & MOBILE)
-- ------------------------------------------------------------------------------

-- 3A. Daily Hydration Counter (tracks monotonic rewarded_glasses_count so resets never re-grant)
CREATE TABLE IF NOT EXISTS public.hydration_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  glasses_count INTEGER NOT NULL DEFAULT 0 CHECK (glasses_count >= 0 AND glasses_count <= 24),
  rewarded_glasses_count INTEGER NOT NULL DEFAULT 0 CHECK (rewarded_glasses_count >= 0 AND rewarded_glasses_count <= 8),
  goal_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, log_date)
);

ALTER TABLE public.hydration_daily
  ADD COLUMN IF NOT EXISTS rewarded_glasses_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.hydration_daily
SET rewarded_glasses_count = LEAST(8, GREATEST(0, glasses_count))
WHERE rewarded_glasses_count < LEAST(8, glasses_count);

DROP TRIGGER IF EXISTS trg_hydration_daily_updated_at ON public.hydration_daily;
CREATE TRIGGER trg_hydration_daily_updated_at
  BEFORE UPDATE ON public.hydration_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3B. User Habits Definitions
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'discipline',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'once', 'weekdays', 'weekends', 'custom')),
  icon_name TEXT NOT NULL DEFAULT 'Sparkles',
  player_xp_reward INTEGER NOT NULL DEFAULT 15 CHECK (player_xp_reward >= 0 AND player_xp_reward <= 500),
  forge_xp_reward INTEGER NOT NULL DEFAULT 20 CHECK (forge_xp_reward >= 0 AND forge_xp_reward <= 500),
  gold_reward INTEGER NOT NULL DEFAULT 15 CHECK (gold_reward >= 0 AND gold_reward <= 500),
  streak INTEGER NOT NULL DEFAULT 0,
  last_period_key TEXT,
  last_completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, id)
);

DROP TRIGGER IF EXISTS trg_habits_updated_at ON public.habits;
CREATE TRIGGER trg_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON public.habits (user_id, created_at DESC)
  WHERE archived_at IS NULL;

-- 3C. Immutable Economy Ledger (Anti-Exploit & Weekly/Monthly Leaderboard Source)
CREATE TABLE IF NOT EXISTS public.economy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('PLAYER_XP', 'FORGE_XP', 'GOLD', 'AETHER_POINTS')),
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  description TEXT NOT NULL,
  idempotency_key UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP INDEX IF EXISTS public.idx_economy_tx_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_economy_tx_idempotency
  ON public.economy_transactions (user_id, currency, source_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_economy_tx_user_created
  ON public.economy_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_tx_leaderboard_window
  ON public.economy_transactions (currency, created_at DESC)
  WHERE delta > 0;

-- 3D. Shop Catalog & Player Armory/Buffs
CREATE TABLE IF NOT EXISTS public.shop_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'buff', 'elixir', 'catalyst', 'cosmetic')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'Common',
  price_gold INTEGER NOT NULL DEFAULT 0 CHECK (price_gold >= 0),
  price_forge_xp INTEGER NOT NULL DEFAULT 0 CHECK (price_forge_xp >= 0),
  required_level INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shop_items_active
  ON public.shop_items (is_active, price_gold ASC);

CREATE TABLE IF NOT EXISTS public.player_weapons (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  max_level INTEGER NOT NULL DEFAULT 10,
  base_attack INTEGER NOT NULL DEFAULT 10,
  attack_per_level INTEGER NOT NULL DEFAULT 3,
  base_defense INTEGER NOT NULL DEFAULT 2,
  defense_per_level INTEGER NOT NULL DEFAULT 1,
  upgrade_forge_cost INTEGER NOT NULL DEFAULT 30,
  unlocked BOOLEAN NOT NULL DEFAULT true,
  equipped BOOLEAN NOT NULL DEFAULT false,
  evolution_stage TEXT NOT NULL DEFAULT 'Dormant',
  mastery_level INTEGER NOT NULL DEFAULT 1,
  mastery_xp INTEGER NOT NULL DEFAULT 0,
  mastery_xp_next_level INTEGER NOT NULL DEFAULT 100,
  mastery_path TEXT NOT NULL DEFAULT 'Strength',
  abilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_mastery_drill_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, weapon_id)
);

ALTER TABLE public.player_weapons
  ADD COLUMN IF NOT EXISTS last_mastery_drill_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_player_weapons_user_equipped
  ON public.player_weapons (user_id, equipped);

DROP TRIGGER IF EXISTS trg_player_weapons_updated_at ON public.player_weapons;
CREATE TRIGGER trg_player_weapons_updated_at
  BEFORE UPDATE ON public.player_weapons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.player_buffs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buff_id TEXT NOT NULL,
  name TEXT NOT NULL,
  effect_type TEXT NOT NULL,
  effect_value INTEGER NOT NULL DEFAULT 10,
  duration_battles INTEGER NOT NULL DEFAULT 1,
  uses_remaining INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, buff_id)
);

ALTER TABLE public.player_buffs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS trg_player_buffs_updated_at ON public.player_buffs;
CREATE TRIGGER trg_player_buffs_updated_at
  BEFORE UPDATE ON public.player_buffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.player_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.shop_items(id) ON DELETE RESTRICT,
  price_gold INTEGER NOT NULL DEFAULT 0,
  price_forge_xp INTEGER NOT NULL DEFAULT 0,
  idempotency_key UUID,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_purchases_idempotency
  ON public.player_purchases (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_player_purchases_user_time
  ON public.player_purchases (user_id, purchased_at DESC);

-- 3E. Quests & Achievements Catalog + Claim Progress
CREATE TABLE IF NOT EXISTS public.quests_catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'special')),
  category TEXT NOT NULL,
  max_progress INTEGER NOT NULL DEFAULT 1,
  player_xp_reward INTEGER NOT NULL DEFAULT 30,
  forge_xp_reward INTEGER NOT NULL DEFAULT 25,
  gold_reward INTEGER NOT NULL DEFAULT 25,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.player_quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  period_key TEXT NOT NULL DEFAULT 'once',
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, quest_id, period_key)
);

DROP TRIGGER IF EXISTS trg_player_quest_progress_updated_at ON public.player_quest_progress;
CREATE TRIGGER trg_player_quest_progress_updated_at
  BEFORE UPDATE ON public.player_quest_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_player_quest_progress_user
  ON public.player_quest_progress (user_id, period_key);

CREATE TABLE IF NOT EXISTS public.achievements_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Award',
  max_progress INTEGER NOT NULL DEFAULT 1,
  reward_player_xp INTEGER NOT NULL DEFAULT 50,
  reward_forge_xp INTEGER NOT NULL DEFAULT 40,
  reward_gold INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS public.player_achievements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL DEFAULT 1,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, achievement_id)
);

DROP TRIGGER IF EXISTS trg_player_achievements_updated_at ON public.player_achievements;
CREATE TRIGGER trg_player_achievements_updated_at
  BEFORE UPDATE ON public.player_achievements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_player_achievements_user
  ON public.player_achievements (user_id, unlocked);

-- 3F. Boss Encounters (Authoritative server-side combat state machine)
CREATE TABLE IF NOT EXISTS public.boss_encounters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kingdom_id TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  cleared BOOLEAN NOT NULL DEFAULT false,
  boss_hp INTEGER NOT NULL,
  boss_max_hp INTEGER NOT NULL,
  player_hp INTEGER NOT NULL DEFAULT 235,
  player_stamina INTEGER NOT NULL DEFAULT 100,
  current_phase INTEGER NOT NULL DEFAULT 1,
  turn_count INTEGER NOT NULL DEFAULT 1,
  telegraph_active BOOLEAN NOT NULL DEFAULT false,
  weakness_discovered BOOLEAN NOT NULL DEFAULT false,
  first_clear_claimed BOOLEAN NOT NULL DEFAULT false,
  battle_active BOOLEAN NOT NULL DEFAULT false,
  victory_pending BOOLEAN NOT NULL DEFAULT false,
  last_repeat_reward_period_key TEXT,
  last_victory_at TIMESTAMPTZ,
  times_defeated INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, kingdom_id)
);

ALTER TABLE public.boss_encounters
  ADD COLUMN IF NOT EXISTS battle_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS victory_pending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_repeat_reward_period_key TEXT,
  ADD COLUMN IF NOT EXISTS last_victory_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_boss_encounters_user
  ON public.boss_encounters (user_id, unlocked);

DROP TRIGGER IF EXISTS trg_boss_encounters_updated_at ON public.boss_encounters;
CREATE TRIGGER trg_boss_encounters_updated_at
  BEFORE UPDATE ON public.boss_encounters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3G. Multiplayer Guilds & Challenges
CREATE TABLE IF NOT EXISTS public.guilds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT NOT NULL UNIQUE,
  emblem TEXT NOT NULL DEFAULT 'Shield',
  level INTEGER NOT NULL DEFAULT 1,
  max_members INTEGER NOT NULL DEFAULT 30,
  description TEXT NOT NULL DEFAULT '',
  weekly_quest_name TEXT NOT NULL DEFAULT 'Collective Realm Challenge',
  weekly_quest_progress INTEGER NOT NULL DEFAULT 0,
  weekly_quest_max INTEGER NOT NULL DEFAULT 5000,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_guilds_updated_at ON public.guilds;
CREATE TRIGGER trg_guilds_updated_at
  BEFORE UPDATE ON public.guilds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_guilds_level_desc
  ON public.guilds (level DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.guild_members (
  guild_id TEXT NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  weekly_contribution INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (guild_id, user_id),
  CONSTRAINT unique_user_single_guild UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild_role
  ON public.guild_members (guild_id, role);

CREATE TABLE IF NOT EXISTS public.guild_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_key TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 5000,
  current_value INTEGER NOT NULL DEFAULT 0,
  reward_gold INTEGER NOT NULL DEFAULT 100,
  reward_player_xp INTEGER NOT NULL DEFAULT 150,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_guild_period_challenge UNIQUE (guild_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_guild_challenges_guild_period
  ON public.guild_challenges (guild_id, period_key DESC);

CREATE TABLE IF NOT EXISTS public.guild_challenge_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.guild_challenges(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_delta INTEGER NOT NULL CHECK (contribution_delta > 0),
  source_type TEXT NOT NULL DEFAULT 'workout',
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_guild_challenge_contrib_challenge
  ON public.guild_challenge_contributions (challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_challenge_contrib_user
  ON public.guild_challenge_contributions (guild_id, user_id, created_at DESC);

-- 3H. Friendships & Friend Requests
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_friendship_not_self CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship_pair
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id, status);

DROP TRIGGER IF EXISTS trg_friendships_updated_at ON public.friendships;
CREATE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3I. Real-Time Chat Messages & Moderation Reports
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('general', 'guild', 'whisper')),
  guild_id TEXT REFERENCES public.guilds(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
  ON public.chat_messages (channel, guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_whisper
  ON public.chat_messages (channel, sender_id, recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'Inappropriate behavior',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_chat_report UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reports_message
  ON public.chat_reports (message_id);

-- 3J. Cross-Platform Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. SEED SHARED CATALOG DATA (IDEMPOTENT, BEFORE CATALOG FKs)
-- ------------------------------------------------------------------------------

INSERT INTO public.shop_items (id, item_type, name, description, rarity, price_gold, price_forge_xp, required_level, metadata, is_active)
VALUES
  ('shop-elixir-focus', 'elixir', 'Elixir of Unbroken Focus', 'Primes Focus Aura (+10% Crit Chance) for 2 boss encounters.', 'Rare', 75, 0, 1, '{"buffId":"buff-3","uses":2,"effectType":"crit","effectValue":10}'::jsonb, true),
  ('shop-elixir-vitality', 'elixir', 'Aether Vitality Tonic', 'Grants Warrior Momentum (+10% Attack) for 3 boss encounters.', 'Uncommon', 60, 0, 1, '{"buffId":"buff-1","uses":3,"effectType":"attack","effectValue":10}'::jsonb, true),
  ('shop-catalyst-ember', 'catalyst', 'Starforge Catalyst Shard', 'Transmutes Gold into +80 Forge XP for Blacksmith weapon upgrades and evolutions.', 'Epic', 120, 0, 1, '{"grantForgeXp":80}'::jsonb, true),
  ('shop-weapon-obsidian-blade', 'weapon', 'Obsidian Sunblade', 'A rare Fire-attuned blade forged from volcanic glass and gilded runic steel.', 'Rare', 280, 50, 2, '{"weaponId":"w-sword-shop-1","category":"Swords","rarity":"Rare","baseAttack":52,"attackPerLevel":10,"baseDefense":14,"defensePerLevel":3,"upgradeForgeCost":110,"maxLevel":12}'::jsonb, true),
  ('shop-weapon-storm-bow', 'weapon', 'Tempest Recurve Bow', 'Lightning-strung recurve longbow favored by sky scouts across the Mountain peaks.', 'Rare', 260, 40, 2, '{"weaponId":"w-bow-shop-1","category":"Bows","rarity":"Rare","baseAttack":48,"attackPerLevel":9,"baseDefense":8,"defensePerLevel":2,"upgradeForgeCost":105,"maxLevel":12}'::jsonb, true),
  ('shop-weapon-flame-sword', 'weapon', 'Flame Sword', 'A roaring solar-forged blade whose serrated edge ignites Void shadows on impact.', 'Epic', 420, 75, 3, '{"weaponId":"w-sword-flame","category":"Swords","rarity":"Epic","baseAttack":78,"attackPerLevel":14,"baseDefense":16,"defensePerLevel":4,"upgradeForgeCost":165,"maxLevel":14}'::jsonb, true),
  ('shop-weapon-frostblade', 'weapon', 'Frostblade', 'An ice-forged crystalline saber that freezes armor joints and slows relentless foes.', 'Epic', 440, 80, 3, '{"weaponId":"w-sword-frost","category":"Swords","rarity":"Epic","baseAttack":80,"attackPerLevel":14,"baseDefense":18,"defensePerLevel":4,"upgradeForgeCost":170,"maxLevel":14}'::jsonb, true),
  ('shop-weapon-celestial-sword', 'weapon', 'Celestial Sword', 'Mythic twin-winged starlight greatsword radiating purifying dawn across all realms.', 'Mythic', 850, 160, 5, '{"weaponId":"w-sword-celestial","category":"Swords","rarity":"Mythic","baseAttack":142,"attackPerLevel":22,"baseDefense":28,"defensePerLevel":7,"upgradeForgeCost":310,"maxLevel":15}'::jsonb, true),
  ('shop-staff-astral', 'weapon', 'Astral Sovereign Staff', 'Mythic cosmic conduit crowned with an orbiting astrolabe and void-cleansing orb.', 'Mythic', 880, 170, 5, '{"weaponId":"w-staff-astral","category":"Magic Staffs","rarity":"Mythic","baseAttack":148,"attackPerLevel":24,"baseDefense":24,"defensePerLevel":6,"upgradeForgeCost":320,"maxLevel":15}'::jsonb, true),
  ('shop-shield-dragon', 'weapon', 'Dragon Shield', 'Scale-clad draconic kite shield forged with crimson horn plates and fireproof rivets.', 'Epic', 460, 90, 3, '{"weaponId":"w-shield-dragon","category":"Shields","rarity":"Epic","baseAttack":38,"attackPerLevel":7,"baseDefense":96,"defensePerLevel":17,"upgradeForgeCost":185,"maxLevel":14}'::jsonb, true),
  ('shop-armour-leather', 'weapon', 'Scout Leather Cuirass', 'Supple stitched ranger jerkin with reinforced brass buckles for agile training.', 'Common', 140, 0, 1, '{"weaponId":"armour-leather","category":"Armour","rarity":"Common","baseAttack":6,"attackPerLevel":2,"baseDefense":22,"defensePerLevel":5,"upgradeForgeCost":45,"maxLevel":8}'::jsonb, true),
  ('shop-armour-silverguard', 'weapon', 'Silverguard Brigandine', 'Layered silver-plated chest armor etched with steadfast recovery wards.', 'Uncommon', 260, 35, 2, '{"weaponId":"armour-silverguard","category":"Armour","rarity":"Uncommon","baseAttack":10,"attackPerLevel":3,"baseDefense":40,"defensePerLevel":8,"upgradeForgeCost":80,"maxLevel":10}'::jsonb, true),
  ('shop-armour-obsidian', 'weapon', 'Runic Obsidian Cuirass', 'Heavy volcanic obsidian plate inlaid with arcane amethyst deflection runes.', 'Epic', 520, 95, 4, '{"weaponId":"armour-obsidian","category":"Armour","rarity":"Epic","baseAttack":20,"attackPerLevel":4,"baseDefense":88,"defensePerLevel":15,"upgradeForgeCost":185,"maxLevel":14}'::jsonb, true),
  ('shop-armour-sunforged', 'weapon', 'Sunforged Archon Plate', 'Mythic winged golden armor radiating solar vitality and near-impervious defense.', 'Mythic', 920, 180, 5, '{"weaponId":"armour-sunforged","category":"Armour","rarity":"Mythic","baseAttack":34,"attackPerLevel":7,"baseDefense":148,"defensePerLevel":24,"upgradeForgeCost":310,"maxLevel":15}'::jsonb, true),
  ('shop-helm-iron', 'weapon', 'Vanguard Iron Helm', 'Solid nasal steel helm with brass crest protecting focus during strenuous combat.', 'Uncommon', 160, 15, 1, '{"weaponId":"helm-iron","category":"Helmets","rarity":"Uncommon","baseAttack":8,"attackPerLevel":2,"baseDefense":26,"defensePerLevel":6,"upgradeForgeCost":55,"maxLevel":10}'::jsonb, true),
  ('shop-helm-shadow', 'weapon', 'Shadow-Steel Barbute', 'Horned midnight-steel helm sharpening tactical awareness against Void ambushes.', 'Rare', 340, 60, 3, '{"weaponId":"helm-shadow","category":"Helmets","rarity":"Rare","baseAttack":18,"attackPerLevel":4,"baseDefense":52,"defensePerLevel":10,"upgradeForgeCost":115,"maxLevel":12}'::jsonb, true),
  ('shop-helm-archon', 'weapon', 'Crown of the Dawn Archon', 'Legendary winged solar circlet elevating both critical sight and guardian poise.', 'Legendary', 680, 120, 4, '{"weaponId":"helm-archon","category":"Helmets","rarity":"Legendary","baseAttack":32,"attackPerLevel":6,"baseDefense":86,"defensePerLevel":14,"upgradeForgeCost":220,"maxLevel":15}'::jsonb, true),
  ('shop-acc-flame-ring', 'weapon', 'Band of the First Flame', 'Ruby-set signet ring igniting every strike with lingering ember ferocity.', 'Rare', 290, 45, 2, '{"weaponId":"acc-flame-ring","category":"Accessories","rarity":"Rare","baseAttack":26,"attackPerLevel":6,"baseDefense":14,"defensePerLevel":3,"upgradeForgeCost":105,"maxLevel":12}'::jsonb, true),
  ('shop-acc-astral-amulet', 'weapon', 'Astral Resonance Amulet', 'Moon-pendant channeling serene oceanic and storm currents through your stance.', 'Epic', 540, 100, 4, '{"weaponId":"acc-astral-amulet","category":"Accessories","rarity":"Epic","baseAttack":42,"attackPerLevel":8,"baseDefense":34,"defensePerLevel":7,"upgradeForgeCost":185,"maxLevel":14}'::jsonb, true),
  ('shop-acc-celestial', 'weapon', 'Celestial Eternity Signet', 'Mythic winged prism talisman amplifying all attack, defense, and mastery gains.', 'Mythic', 960, 190, 5, '{"weaponId":"acc-celestial-signet","category":"Accessories","rarity":"Mythic","baseAttack":64,"attackPerLevel":12,"baseDefense":58,"defensePerLevel":11,"upgradeForgeCost":315,"maxLevel":15}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  price_gold = EXCLUDED.price_gold,
  price_forge_xp = EXCLUDED.price_forge_xp,
  required_level = EXCLUDED.required_level,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active;

INSERT INTO public.quests_catalog (id, title, description, quest_type, category, max_progress, player_xp_reward, forge_xp_reward, gold_reward, is_active)
VALUES
  ('q-1', 'Morning Patrol of the Grove', 'Complete at least 2 healthy morning habits to strengthen your connection to Aetheria.', 'daily', 'habit', 2, 35, 30, 30, true),
  ('q-2', 'Aether Vision Trial: Squat Drill', 'Perform 10 verified squats using the Aether Vision AI motion tracker.', 'daily', 'fitness', 10, 50, 45, 45, true),
  ('q-3', 'Nourishment of the Wardens', 'Log 2 balanced meals with protein and hydration today.', 'daily', 'nutrition', 2, 30, 25, 25, true),
  ('q-4', 'Weekly Endurance Expedition', 'Accumulate 120 total minutes of verified physical activity or workout logging this week.', 'weekly', 'fitness', 120, 120, 100, 120, true),
  ('q-5', 'Fortify the Arsenal', 'Upgrade any weapon at the Blacksmith Forge using earned Forge XP.', 'special', 'armory', 1, 80, 60, 75, true),
  ('q-6', 'Confront the Void Stalker', 'Prepare your equipment and engage the boss of Forest of Discipline in battle.', 'special', 'boss', 1, 150, 150, 150, true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  quest_type = EXCLUDED.quest_type,
  max_progress = EXCLUDED.max_progress,
  player_xp_reward = EXCLUDED.player_xp_reward,
  forge_xp_reward = EXCLUDED.forge_xp_reward,
  gold_reward = EXCLUDED.gold_reward,
  is_active = EXCLUDED.is_active;

INSERT INTO public.achievements_catalog (id, name, description, category, icon, max_progress, reward_player_xp, reward_forge_xp, reward_gold)
VALUES
  ('ach-1', 'First Quest', 'Complete and claim your very first quest in Aetheria.', 'quests', 'Scroll', 1, 50, 40, 50),
  ('ach-2', 'The Consistent', 'Maintain a 3-day consecutive healthy habit streak.', 'consistency', 'Flame', 3, 100, 80, 100),
  ('ach-3', 'First Forge', 'Upgrade any weapon at the Blacksmith Armory.', 'armory', 'Hammer', 1, 75, 50, 75),
  ('ach-4', 'Boss Slayer', 'Defeat your first Kingdom boss in turn-based combat.', 'combat', 'Swords', 1, 200, 150, 200),
  ('ach-5', 'Aether Vision Master', 'Complete a workout session verified with camera AI motion tracking.', 'consistency', 'Camera', 1, 120, 100, 100),
  ('ach-6', 'Kingdom Explorer', 'Unlock and advance to a new kingdom in the storyline.', 'exploration', 'Compass', 5, 250, 200, 250),
  ('ach-7', 'Team Player', 'Contribute to a guild quest alongside fellow adventurers.', 'multiplayer', 'Users', 1, 100, 75, 100)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  reward_player_xp = EXCLUDED.reward_player_xp,
  reward_forge_xp = EXCLUDED.reward_forge_xp,
  reward_gold = EXCLUDED.reward_gold;

INSERT INTO public.guilds (id, name, tag, emblem, level, max_members, description, weekly_quest_name, weekly_quest_progress, weekly_quest_max)
VALUES
  ('guild-1', 'Vanguard of Iron Will', 'IRON', 'Shield', 7, 30, 'A disciplined brotherhood of runners, lifters, and daily meditators.', 'Collective 5,000 Verified Repetitions', 3820, 5000),
  ('guild-2', 'Sunfire Sentinels', 'SOL', 'Sun', 5, 30, 'Early morning habit champions and walking enthusiasts.', '1,000,000 Combined Steps', 680000, 1000000),
  ('guild-3', 'Arcane Ascetics', 'MYST', 'Sparkles', 6, 30, 'Focused on clean nutrition, mindful breathwork, and deep restful sleep.', '300 Balanced Meal Logs', 245, 300)
ON CONFLICT DO NOTHING;

INSERT INTO public.guild_challenges (guild_id, title, period_key, target_value, current_value)
SELECT g.id, g.weekly_quest_name, public.resolve_period_key('weekly', 'UTC'), g.weekly_quest_max, g.weekly_quest_progress
FROM public.guilds g
WHERE g.id IN ('guild-1', 'guild-2', 'guild-3')
ON CONFLICT (guild_id, period_key) DO NOTHING;

-- Attach catalog Foreign Keys safely (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_player_quest_progress_quest'
  ) THEN
    ALTER TABLE public.player_quest_progress
      ADD CONSTRAINT fk_player_quest_progress_quest
      FOREIGN KEY (quest_id) REFERENCES public.quests_catalog(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_player_achievements_achievement'
  ) THEN
    ALTER TABLE public.player_achievements
      ADD CONSTRAINT fk_player_achievements_achievement
      FOREIGN KEY (achievement_id) REFERENCES public.achievements_catalog(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES & LEAST-PRIVILEGE GRANTS (ALL 20 NEW TABLES)
-- ------------------------------------------------------------------------------

-- Read-only auth-scoped membership predicate prevents RLS recursion on guild_members
CREATE OR REPLACE FUNCTION public.is_member_of_guild(p_guild_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guild_members gm
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = auth.uid()
  );
$$;

ALTER TABLE public.public_champion_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_buffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_challenge_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Public directory: strictly leaderboard-visible rows
DROP POLICY IF EXISTS "Public directory visible rows" ON public.public_champion_directory;
CREATE POLICY "Public directory visible rows"
  ON public.public_champion_directory FOR SELECT TO authenticated
  USING (leaderboard_visible = true);

-- Own-row read-only policies
DROP POLICY IF EXISTS "Users view own hydration" ON public.hydration_daily;
CREATE POLICY "Users view own hydration" ON public.hydration_daily FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own habits" ON public.habits;
CREATE POLICY "Users view own habits" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own economy ledger" ON public.economy_transactions;
CREATE POLICY "Users view own economy ledger" ON public.economy_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Catalog readable by authenticated" ON public.shop_items;
CREATE POLICY "Catalog readable by authenticated" ON public.shop_items FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Users view own weapons" ON public.player_weapons;
CREATE POLICY "Users view own weapons" ON public.player_weapons FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own buffs" ON public.player_buffs;
CREATE POLICY "Users view own buffs" ON public.player_buffs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own purchases" ON public.player_purchases;
CREATE POLICY "Users view own purchases" ON public.player_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quests catalog readable" ON public.quests_catalog;
CREATE POLICY "Quests catalog readable" ON public.quests_catalog FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Users view own quest progress" ON public.player_quest_progress;
CREATE POLICY "Users view own quest progress" ON public.player_quest_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Achievements catalog readable" ON public.achievements_catalog;
CREATE POLICY "Achievements catalog readable" ON public.achievements_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users view own achievements" ON public.player_achievements;
CREATE POLICY "Users view own achievements" ON public.player_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own boss encounters" ON public.boss_encounters;
CREATE POLICY "Users view own boss encounters" ON public.boss_encounters FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Social: Guilds (browsing) & Guild-Member-Restricted Data (members, challenges, contributions)
DROP POLICY IF EXISTS "Guilds readable by authenticated" ON public.guilds;
CREATE POLICY "Guilds readable by authenticated" ON public.guilds FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Guild members readable by authenticated" ON public.guild_members;
DROP POLICY IF EXISTS "Guild members view own guild roster" ON public.guild_members;
CREATE POLICY "Guild members view own guild roster"
  ON public.guild_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_member_of_guild(guild_id));

DROP POLICY IF EXISTS "Guild challenges readable by authenticated" ON public.guild_challenges;
DROP POLICY IF EXISTS "Guild members view own guild challenges" ON public.guild_challenges;
CREATE POLICY "Guild members view own guild challenges"
  ON public.guild_challenges FOR SELECT TO authenticated
  USING (public.is_member_of_guild(guild_id));

DROP POLICY IF EXISTS "Guild members view own challenge contributions" ON public.guild_challenge_contributions;
CREATE POLICY "Guild members view own challenge contributions"
  ON public.guild_challenge_contributions FOR SELECT TO authenticated
  USING (public.is_member_of_guild(guild_id));

-- Social: Friendships
DROP POLICY IF EXISTS "Users view own friendships" ON public.friendships;
CREATE POLICY "Users view own friendships" ON public.friendships
  FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Social: Chat Messages (Channel-isolated)
DROP POLICY IF EXISTS "Read allowed chat channels" ON public.chat_messages;
CREATE POLICY "Read allowed chat channels" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    channel = 'general'
    OR (channel = 'guild' AND public.is_member_of_guild(guild_id))
    OR (channel = 'whisper' AND (auth.uid() = sender_id OR auth.uid() = recipient_id))
  );

DROP POLICY IF EXISTS "Users view own chat reports" ON public.chat_reports;
CREATE POLICY "Users view own chat reports" ON public.chat_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users insert own chat reports" ON public.chat_reports;
CREATE POLICY "Users insert own chat reports" ON public.chat_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Notifications: recipient read-only directly; read_at updated exclusively via rpc_mark_notifications_read
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;

-- Explicit least-privilege table grants (no direct writes from anon or authenticated)
REVOKE ALL ON public.public_champion_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_champion_directory TO authenticated;

REVOKE ALL ON public.habits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.habits TO authenticated;

REVOKE ALL ON public.hydration_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.hydration_daily TO authenticated;

REVOKE ALL ON public.economy_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.economy_transactions TO authenticated;

REVOKE ALL ON public.shop_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.shop_items TO authenticated;

REVOKE ALL ON public.player_weapons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_weapons TO authenticated;

REVOKE ALL ON public.player_buffs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_buffs TO authenticated;

REVOKE ALL ON public.player_purchases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_purchases TO authenticated;

REVOKE ALL ON public.quests_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quests_catalog TO authenticated;

REVOKE ALL ON public.player_quest_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_quest_progress TO authenticated;

REVOKE ALL ON public.achievements_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.achievements_catalog TO authenticated;

REVOKE ALL ON public.player_achievements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_achievements TO authenticated;

REVOKE ALL ON public.boss_encounters FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.boss_encounters TO authenticated;

REVOKE ALL ON public.guilds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guilds TO authenticated;

REVOKE ALL ON public.guild_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guild_members TO authenticated;

REVOKE ALL ON public.guild_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guild_challenges TO authenticated;

REVOKE ALL ON public.guild_challenge_contributions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guild_challenge_contributions TO authenticated;

REVOKE ALL ON public.friendships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.friendships TO authenticated;

REVOKE ALL ON public.chat_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;

REVOKE ALL ON public.chat_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.chat_reports TO authenticated;

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. INTERNAL SERVER-ONLY ENGINE (REVOKED FROM PUBLIC, anon, authenticated)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._credit_currencies(
  p_user_id UUID,
  p_player_xp INTEGER DEFAULT 0,
  p_forge_xp INTEGER DEFAULT 0,
  p_gold INTEGER DEFAULT 0,
  p_aether_points INTEGER DEFAULT 0,
  p_source_type TEXT DEFAULT 'system',
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'Realm Activity',
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_xp_buff_pct INTEGER := 0;
  v_final_xp INTEGER := GREATEST(0, COALESCE(p_player_xp, 0));
  v_cur_xp INTEGER;
  v_cur_lvl INTEGER;
  v_next_xp INTEGER;
  v_new_rank TEXT;
  v_next_rank_pts INTEGER;
BEGIN
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  IF p_player_xp > 0 THEN
    SELECT COALESCE(MAX(effect_value), 0) INTO v_xp_buff_pct
    FROM public.player_buffs
    WHERE user_id = p_user_id AND active = true AND effect_type = 'xp' AND uses_remaining > 0;

    IF v_xp_buff_pct > 0 THEN
      v_final_xp := round(p_player_xp * (1 + v_xp_buff_pct / 100.0))::INTEGER;
    END IF;
  ELSE
    v_final_xp := COALESCE(p_player_xp, 0);
  END IF;

  v_cur_xp := GREATEST(0, v_prof.player_xp + v_final_xp);
  v_cur_lvl := v_prof.level;
  v_next_xp := GREATEST(100, v_prof.player_xp_next_level);

  WHILE v_cur_xp >= v_next_xp LOOP
    v_cur_xp := v_cur_xp - v_next_xp;
    v_cur_lvl := v_cur_lvl + 1;
    v_next_xp := round(v_next_xp * 1.5)::INTEGER;
  END LOOP;

  IF v_prof.forge_xp + COALESCE(p_forge_xp, 0) < 0 THEN
    RAISE EXCEPTION 'Insufficient Forge XP';
  END IF;
  IF v_prof.gold_balance + COALESCE(p_gold, 0) < 0 THEN
    RAISE EXCEPTION 'Insufficient Gold';
  END IF;

  SELECT rank_stage, next_threshold INTO v_new_rank, v_next_rank_pts
  FROM public.compute_aether_rank(v_prof.aether_points + COALESCE(p_aether_points, 0));

  UPDATE public.profiles
  SET
    level = v_cur_lvl,
    player_xp = v_cur_xp,
    player_xp_next_level = v_next_xp,
    total_xp = GREATEST(0, total_xp + GREATEST(0, v_final_xp)),
    forge_xp = forge_xp + COALESCE(p_forge_xp, 0),
    gold_balance = gold_balance + COALESCE(p_gold, 0),
    aether_points = GREATEST(0, aether_points + COALESCE(p_aether_points, 0)),
    aether_rank = v_new_rank,
    aether_points_next_rank = v_next_rank_pts,
    last_active_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_prof;

  IF v_final_xp <> 0 THEN
    INSERT INTO public.economy_transactions (user_id, currency, delta, balance_after, source_type, source_id, description, idempotency_key)
    VALUES (p_user_id, 'PLAYER_XP', v_final_xp, v_prof.total_xp, p_source_type, p_source_id, p_description, p_idempotency_key);
  END IF;

  IF COALESCE(p_forge_xp, 0) <> 0 THEN
    INSERT INTO public.economy_transactions (user_id, currency, delta, balance_after, source_type, source_id, description, idempotency_key)
    VALUES (p_user_id, 'FORGE_XP', p_forge_xp, v_prof.forge_xp, p_source_type, p_source_id, p_description, p_idempotency_key);
  END IF;

  IF COALESCE(p_gold, 0) <> 0 THEN
    INSERT INTO public.economy_transactions (user_id, currency, delta, balance_after, source_type, source_id, description, idempotency_key)
    VALUES (p_user_id, 'GOLD', p_gold, v_prof.gold_balance, p_source_type, p_source_id, p_description, p_idempotency_key);
  END IF;

  IF COALESCE(p_aether_points, 0) <> 0 THEN
    INSERT INTO public.economy_transactions (user_id, currency, delta, balance_after, source_type, source_id, description, idempotency_key)
    VALUES (p_user_id, 'AETHER_POINTS', p_aether_points, v_prof.aether_points, p_source_type, p_source_id, p_description, p_idempotency_key);
  END IF;

  RETURN v_prof;
END;
$$;

CREATE OR REPLACE FUNCTION public._grant_weapon_mastery(
  p_user_id UUID,
  p_weapon_id TEXT,
  p_gained_xp INTEGER
)
RETURNS public.player_weapons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w public.player_weapons%ROWTYPE;
  v_xp INTEGER;
  v_lvl INTEGER;
  v_next INTEGER;
  v_gain INTEGER := LEAST(100, GREATEST(1, COALESCE(p_gained_xp, 10)));
  v_abilities JSONB := '[]'::jsonb;
  v_ab JSONB;
  v_unlock_lvl INTEGER;
BEGIN
  IF p_weapon_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_w FROM public.player_weapons WHERE user_id = p_user_id AND weapon_id = p_weapon_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT * INTO v_w FROM public.player_weapons WHERE user_id = p_user_id AND equipped = true LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
  END IF;

  v_xp := v_w.mastery_xp + v_gain;
  v_lvl := v_w.mastery_level;
  v_next := GREATEST(100, v_w.mastery_xp_next_level);

  WHILE v_xp >= v_next AND v_lvl < 10 LOOP
    v_xp := v_xp - v_next;
    v_lvl := v_lvl + 1;
    v_next := round(v_next * 1.45)::INTEGER;
  END LOOP;

  IF v_lvl >= 10 THEN
    v_xp := LEAST(v_xp, v_next);
  END IF;

  IF jsonb_typeof(v_w.abilities) = 'array' THEN
    FOR v_ab IN SELECT * FROM jsonb_array_elements(v_w.abilities)
    LOOP
      v_unlock_lvl := COALESCE((v_ab->>'unlockMasteryLevel')::INTEGER, 1);
      v_abilities := v_abilities || jsonb_build_array(
        v_ab || jsonb_build_object('unlocked', v_lvl >= v_unlock_lvl)
      );
    END LOOP;
  END IF;

  UPDATE public.player_weapons
  SET
    mastery_xp = v_xp,
    mastery_level = v_lvl,
    mastery_xp_next_level = v_next,
    abilities = CASE WHEN jsonb_array_length(v_abilities) > 0 THEN v_abilities ELSE v_w.abilities END,
    updated_at = now()
  WHERE user_id = v_w.user_id AND weapon_id = v_w.weapon_id
  RETURNING * INTO v_w;

  RETURN v_w;
END;
$$;

CREATE OR REPLACE FUNCTION public._transfer_guild_ownership_on_leave(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_guild_id TEXT;
  v_owner_id UUID;
  v_next_owner UUID;
BEGIN
  SELECT gm.guild_id, g.owner_id INTO v_old_guild_id, v_owner_id
  FROM public.guild_members gm
  JOIN public.guilds g ON g.id = gm.guild_id
  WHERE gm.user_id = p_user_id
  FOR UPDATE OF g;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM public.guild_members WHERE guild_id = v_old_guild_id AND user_id = p_user_id;

  IF v_owner_id = p_user_id THEN
    SELECT gm.user_id INTO v_next_owner
    FROM public.guild_members gm
    WHERE gm.guild_id = v_old_guild_id
    ORDER BY
      CASE gm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END ASC,
      gm.joined_at ASC
    LIMIT 1;

    IF v_next_owner IS NOT NULL THEN
      UPDATE public.guild_members SET role = 'leader'
      WHERE guild_id = v_old_guild_id AND user_id = v_next_owner;
      UPDATE public.guilds SET owner_id = v_next_owner, updated_at = now()
      WHERE id = v_old_guild_id;
    ELSE
      UPDATE public.guilds SET owner_id = NULL, updated_at = now()
      WHERE id = v_old_guild_id;
    END IF;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. BOOTSTRAP, VALIDATED LEGACY BACKFILL & STARTER INVENTORY
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_bootstrap_player_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_gs JSONB;
  v_item JSONB;
  v_rank TEXT;
  v_next_pts INTEGER;
  v_legacy_lvl INTEGER;
  v_legacy_next_xp INTEGER;
  v_legacy_pxp INTEGER;
  v_legacy_forge INTEGER;
  v_legacy_gold INTEGER;
  v_legacy_aether INTEGER;
  v_legacy_streak INTEGER;
  v_legacy_workouts INTEGER;
  v_legacy_reps INTEGER;
  v_legacy_bosses INTEGER;
  v_max_w_lvl INTEGER;
  v_w_lvl INTEGER;
  v_has_equipped BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, username, avatar_url, is_onboarded)
    SELECT
      u.id,
      COALESCE(
        NULLIF(left(trim(u.raw_user_meta_data->>'username'), 40), ''),
        NULLIF(left(trim(u.raw_user_meta_data->>'full_name'), 40), ''),
        NULLIF(left(trim(u.raw_user_meta_data->>'name'), 40), ''),
        NULLIF(left(split_part(COALESCE(u.email, ''), '@', 1), 40), ''),
        'Hero'
      ),
      COALESCE(
        NULLIF(trim(u.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(trim(u.raw_user_meta_data->>'picture'), ''),
        ''
      ),
      false
    FROM auth.users u
    WHERE u.id = v_uid
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
      INSERT INTO public.profiles (id, username, is_onboarded)
      VALUES (v_uid, 'Hero', false)
      ON CONFLICT (id) DO NOTHING;
    END IF;
    SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  END IF;

  SELECT game_data INTO v_gs FROM public.game_states WHERE user_id = v_uid;

  -- Strictly one-time, clamped backfill from pre-existing legacy game_states
  IF NOT v_prof.legacy_migrated THEN
    IF v_gs IS NOT NULL AND jsonb_typeof(v_gs->'stats') = 'object' AND NOT EXISTS (SELECT 1 FROM public.habits WHERE user_id = v_uid) THEN
      v_legacy_lvl := LEAST(50, GREATEST(1, COALESCE((v_gs->'stats'->>'level')::INTEGER, v_prof.level)));
      v_legacy_next_xp := LEAST(500000, GREATEST(100, COALESCE((v_gs->'stats'->>'playerXPNextLevel')::INTEGER, v_prof.player_xp_next_level)));
      v_legacy_pxp := LEAST(v_legacy_next_xp - 1, GREATEST(0, COALESCE((v_gs->'stats'->>'playerXP')::INTEGER, v_prof.player_xp)));
      v_legacy_forge := LEAST(10000, GREATEST(0, COALESCE((v_gs->'stats'->>'forgeXP')::INTEGER, v_prof.forge_xp)));
      v_legacy_gold := LEAST(10000, GREATEST(0, COALESCE((v_gs->'stats'->>'gold')::INTEGER, v_prof.gold_balance)));
      v_legacy_aether := LEAST(2500, GREATEST(0, COALESCE((v_gs->'stats'->>'aetherPoints')::INTEGER, v_prof.aether_points)));
      v_legacy_streak := LEAST(365, GREATEST(0, COALESCE((v_gs->'stats'->>'currentStreak')::INTEGER, v_prof.current_streak)));
      v_legacy_workouts := LEAST(5000, GREATEST(0, COALESCE((v_gs->'stats'->>'totalWorkoutsCompleted')::INTEGER, v_prof.total_workouts_completed)));
      v_legacy_reps := LEAST(50000, GREATEST(0, COALESCE((v_gs->'stats'->>'totalVerifiedReps')::INTEGER, v_prof.total_verified_reps)));
      v_legacy_bosses := LEAST(100, GREATEST(0, COALESCE((v_gs->'stats'->>'totalBossesDefeated')::INTEGER, v_prof.total_bosses_defeated)));

      SELECT rank_stage, next_threshold INTO v_rank, v_next_pts
      FROM public.compute_aether_rank(v_legacy_aether);

      UPDATE public.profiles
      SET
        level = v_legacy_lvl,
        player_xp = v_legacy_pxp,
        player_xp_next_level = v_legacy_next_xp,
        total_xp = GREATEST(total_xp, v_legacy_pxp + (v_legacy_lvl - 1) * 100),
        forge_xp = v_legacy_forge,
        gold_balance = v_legacy_gold,
        aether_points = v_legacy_aether,
        aether_rank = v_rank,
        aether_points_next_rank = v_next_pts,
        current_streak = v_legacy_streak,
        total_workouts_completed = v_legacy_workouts,
        total_verified_reps = v_legacy_reps,
        total_bosses_defeated = v_legacy_bosses,
        equipped_weapon_id = COALESCE(NULLIF(v_gs->'stats'->>'equippedWeaponId', ''), equipped_weapon_id),
        legacy_migrated = true
      WHERE id = v_uid
      RETURNING * INTO v_prof;
    ELSE
      UPDATE public.profiles SET legacy_migrated = true WHERE id = v_uid RETURNING * INTO v_prof;
    END IF;
  END IF;

  -- Seed/Backfill Habits if user has none yet
  IF NOT EXISTS (SELECT 1 FROM public.habits WHERE user_id = v_uid) THEN
    IF v_gs IS NOT NULL AND jsonb_typeof(v_gs->'habits') = 'array' AND jsonb_array_length(v_gs->'habits') > 0 THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_gs->'habits') LIMIT 20
      LOOP
        INSERT INTO public.habits (user_id, id, name, category, frequency, icon_name, player_xp_reward, forge_xp_reward, gold_reward, streak, last_period_key)
        VALUES (
          v_uid,
          COALESCE(NULLIF(v_item->>'id', ''), 'h-' || substr(md5(random()::text), 1, 8)),
          left(COALESCE(NULLIF(trim(v_item->>'name'), ''), 'Healthy Habit'), 100),
          COALESCE(v_item->>'category', 'discipline'),
          CASE WHEN (v_item->>'frequency') IN ('daily','weekly','once','weekdays','weekends','custom') THEN (v_item->>'frequency') ELSE 'daily' END,
          COALESCE(v_item->>'iconName', 'Sparkles'),
          LEAST(60, GREATEST(5, COALESCE((v_item->>'playerXpReward')::INTEGER, 15))),
          LEAST(60, GREATEST(5, COALESCE((v_item->>'forgeXpReward')::INTEGER, 20))),
          LEAST(50, GREATEST(5, COALESCE((v_item->>'goldReward')::INTEGER, 15))),
          LEAST(365, GREATEST(0, COALESCE((v_item->>'streak')::INTEGER, 0))),
          CASE WHEN COALESCE((v_item->>'completedToday')::BOOLEAN, false)
            THEN public.resolve_period_key(
              CASE WHEN (v_item->>'frequency') IN ('daily','weekly','once','weekdays','weekends','custom') THEN (v_item->>'frequency') ELSE 'daily' END,
              v_prof.timezone
            )
            ELSE NULL
          END
        )
        ON CONFLICT (user_id, id) DO NOTHING;
      END LOOP;
    ELSE
      INSERT INTO public.habits (user_id, id, name, category, frequency, icon_name, player_xp_reward, forge_xp_reward, gold_reward, streak)
      VALUES
        (v_uid, 'h-1', 'Drink 8 Glasses of Water', 'nutrition', 'daily', 'Droplets', 15, 20, 15, 0),
        (v_uid, 'h-2', '7+ Hours Restful Sleep', 'sleep', 'daily', 'Moon', 20, 20, 20, 0),
        (v_uid, 'h-3', '30-Minute Movement or Workout', 'fitness', 'daily', 'Activity', 25, 25, 25, 0),
        (v_uid, 'h-4', 'Log a Wholesome Balanced Meal', 'nutrition', 'daily', 'Utensils', 15, 20, 15, 0),
        (v_uid, 'h-5', '10 Minutes Meditation & Mindfulness', 'mindfulness', 'daily', 'Sparkles', 15, 20, 15, 0),
        (v_uid, 'h-6', 'Weekly Deep Review & Planning', 'discipline', 'weekly', 'BookOpen', 45, 40, 50, 0)
      ON CONFLICT (user_id, id) DO NOTHING;
    END IF;
  END IF;

  -- Backfill player weapons from valid legacy state OR seed complete starter arsenal across all 4 categories
  IF NOT EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid) THEN
    IF v_gs IS NOT NULL AND jsonb_typeof(v_gs->'weapons') = 'array' AND jsonb_array_length(v_gs->'weapons') > 0 THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_gs->'weapons') LIMIT 25
      LOOP
        IF NULLIF(v_item->>'id', '') IS NULL OR NULLIF(v_item->>'name', '') IS NULL THEN
          CONTINUE;
        END IF;
        v_max_w_lvl := LEAST(15, GREATEST(5, COALESCE((v_item->>'maxLevel')::INTEGER, 10)));
        v_w_lvl := LEAST(v_max_w_lvl, GREATEST(1, COALESCE((v_item->>'level')::INTEGER, 1)));
        INSERT INTO public.player_weapons (
          user_id, weapon_id, name, category, rarity, level, max_level,
          base_attack, attack_per_level, base_defense, defense_per_level,
          upgrade_forge_cost, unlocked, equipped, evolution_stage,
          mastery_level, mastery_xp, mastery_xp_next_level, mastery_path, abilities
        )
        VALUES (
          v_uid,
          v_item->>'id',
          left(v_item->>'name', 80),
          CASE WHEN (v_item->>'category') IN ('Swords','Bows','Magic Staffs','Shields','Armour','Helmets','Accessories') THEN v_item->>'category' ELSE 'Swords' END,
          CASE WHEN (v_item->>'rarity') IN ('Common','Uncommon','Rare','Epic','Legendary','Mythic') THEN v_item->>'rarity' ELSE 'Common' END,
          v_w_lvl,
          v_max_w_lvl,
          LEAST(400, GREATEST(5, COALESCE((v_item->>'baseAttack')::INTEGER, 15))),
          LEAST(30, GREATEST(1, COALESCE((v_item->>'attackPerLevel')::INTEGER, 4))),
          LEAST(400, GREATEST(0, COALESCE((v_item->>'baseDefense')::INTEGER, 2))),
          LEAST(30, GREATEST(1, COALESCE((v_item->>'defensePerLevel')::INTEGER, 1))),
          LEAST(5000, GREATEST(10, COALESCE((v_item->>'upgradeForgeCost')::INTEGER, 30))),
          COALESCE((v_item->>'unlocked')::BOOLEAN, true),
          COALESCE((v_item->>'equipped')::BOOLEAN, false),
          CASE WHEN (v_item->>'evolutionStage') IN ('Dormant','Awakened','Ascended','Mythic','Transcendent') THEN v_item->>'evolutionStage' ELSE 'Dormant' END,
          LEAST(10, GREATEST(1, COALESCE((v_item->>'masteryLevel')::INTEGER, 1))),
          GREATEST(0, COALESCE((v_item->>'masteryXP')::INTEGER, 0)),
          GREATEST(100, COALESCE((v_item->>'masteryXPNextLevel')::INTEGER, 100)),
          COALESCE(v_item->>'masteryPath', 'Strength'),
          CASE WHEN jsonb_typeof(v_item->'abilities') = 'array' THEN v_item->'abilities' ELSE '[]'::jsonb END
        )
        ON CONFLICT (user_id, weapon_id) DO NOTHING;
      END LOOP;
    END IF;

    -- Always guarantee starter weapons exist even for brand-new users (or empty legacy weapons)
    IF NOT EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid) THEN
      INSERT INTO public.player_weapons (
        user_id, weapon_id, name, category, rarity, level, max_level,
        base_attack, attack_per_level, base_defense, defense_per_level,
        upgrade_forge_cost, unlocked, equipped, evolution_stage,
        mastery_level, mastery_xp, mastery_xp_next_level, mastery_path, abilities
      )
      VALUES
        (
          v_uid, 'w-sword-1', 'Rusted Sword', 'Swords', 'Common', 1, 5, 15, 4, 2, 1, 30, true, true, 'Awakened', 2, 40, 100, 'Strength',
          '[{"id":"ab-sw-1","name":"Power Strike","icon":"Zap","description":"Deliver a devastating physical blow that pierces 10% enemy armor.","unlockRequirement":"Attain Sword Mastery Level 2 (Strength Path)","unlockMasteryLevel":2,"combatEffect":"+50% Attack Damage Strike","unlocked":true,"damageMultiplier":1.5,"element":"Physical","staminaCost":25},{"id":"ab-sw-2","name":"Berserker Slash","icon":"Flame","description":"Unleash two sweeping slashes dealing 220% damage with +15% critical momentum.","unlockRequirement":"Attain Sword Mastery Level 4 (Strength Path)","unlockMasteryLevel":4,"combatEffect":"+120% Attack Damage, +15% Crit Strike (Fire Element)","unlocked":false,"damageMultiplier":2.2,"critBonus":15,"element":"Fire","staminaCost":35},{"id":"ab-sw-3","name":"Titan''s Wrath","icon":"Swords","description":"Channel celestial titan fury for 350% colossal radiant damage and stance break.","unlockRequirement":"Attain Sword Mastery Level 7 (Strength Path)","unlockMasteryLevel":7,"combatEffect":"+250% Colossal Attack Damage (Radiant Light)","unlocked":false,"damageMultiplier":3.5,"element":"Light","staminaCost":45}]'::jsonb
        ),
        (
          v_uid, 'w-staff-1', 'Apprentice Staff', 'Magic Staffs', 'Common', 1, 5, 18, 5, 1, 1, 35, true, false, 'Dormant', 2, 40, 100, 'Focus',
          '[{"id":"ab-st-1","name":"Arcane Pulse","icon":"Sparkles","description":"Releases a concentrated radiant shockwave dealing 160% radiant light damage.","unlockRequirement":"Attain Staff Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+60% Arcane Shock Damage (Radiant Light)","unlocked":true,"damageMultiplier":1.6,"element":"Light","staminaCost":25},{"id":"ab-st-2","name":"Mana Burst","icon":"Eye","description":"Condenses stored mental energy into an explosive sphere dealing 240% fire damage.","unlockRequirement":"Attain Staff Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+140% Arcane Burst Damage (Fire Element)","unlocked":false,"damageMultiplier":2.4,"element":"Fire","staminaCost":35},{"id":"ab-st-3","name":"Aether Storm","icon":"CloudLightning","description":"Summons a swirling celestial deluge of oceanic aether dealing 360% water damage.","unlockRequirement":"Attain Staff Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+260% Celestial Tempest Damage (Water Element)","unlocked":false,"damageMultiplier":3.6,"element":"Water","staminaCost":45}]'::jsonb
        ),
        (
          v_uid, 'w-bow-1', 'Wooden Bow', 'Bows', 'Common', 1, 5, 16, 4, 2, 1, 30, true, false, 'Dormant', 2, 40, 100, 'Endurance',
          '[{"id":"ab-bw-1","name":"Quick Shot","icon":"Crosshair","description":"Instant double arrow release dealing 140% rapid precision damage.","unlockRequirement":"Attain Bow Mastery Level 2 (Endurance Path)","unlockMasteryLevel":2,"combatEffect":"+40% Rapid Attack Speed","unlocked":true,"damageMultiplier":1.4,"element":"Physical","staminaCost":20},{"id":"ab-bw-2","name":"Piercing Arrow","icon":"Zap","description":"Fires a high-velocity lightning phase bolt that bypasses 50% of target defense.","unlockRequirement":"Attain Bow Mastery Level 4 (Endurance Path)","unlockMasteryLevel":4,"combatEffect":"+110% Armor Piercing Damage (Lightning Element)","unlocked":false,"damageMultiplier":2.1,"element":"Lightning","staminaCost":30},{"id":"ab-bw-3","name":"Phantom Volley","icon":"Sparkles","description":"Rains down a barrage of 6 spectral glacial arrows dealing 330% frost damage.","unlockRequirement":"Attain Bow Mastery Level 7 (Endurance Path)","unlockMasteryLevel":7,"combatEffect":"+230% Multi-arrow Lunar Barrage (Ice Element)","unlocked":false,"damageMultiplier":3.3,"element":"Ice","staminaCost":45}]'::jsonb
        ),
        (
          v_uid, 'w-shield-1', 'Wooden Shield', 'Shields', 'Common', 1, 5, 8, 2, 18, 5, 30, true, false, 'Dormant', 2, 40, 100, 'Recovery',
          '[{"id":"ab-sh-1","name":"Iron Guard","icon":"Shield","description":"Brace shield firmly to absorb 40% incoming damage and counter-strike.","unlockRequirement":"Attain Shield Mastery Level 2 (Recovery Path)","unlockMasteryLevel":2,"combatEffect":"+40% Damage Absorption & Stance Guard","unlocked":true,"defenseBoost":40,"element":"Physical","staminaCost":20},{"id":"ab-sh-2","name":"Reflective Ward","icon":"ShieldAlert","description":"Ignites radiant barrier absorbing 65% damage and blinding the enemy with light.","unlockRequirement":"Attain Shield Mastery Level 4 (Recovery Path)","unlockMasteryLevel":4,"combatEffect":"+65% Damage Absorption & Reflection (Light Element)","unlocked":false,"defenseBoost":65,"damageMultiplier":1.4,"element":"Light","staminaCost":30},{"id":"ab-sh-3","name":"Divine Barrier","icon":"ShieldCheck","description":"Deploys an impervious purifying water aegis absorbing the next strikes completely.","unlockRequirement":"Attain Shield Mastery Level 7 (Recovery Path)","unlockMasteryLevel":7,"combatEffect":"+100% Defense Ward & Full Absorption (Water Element)","unlocked":false,"defenseBoost":100,"element":"Water","staminaCost":45}]'::jsonb
        )
      ON CONFLICT (user_id, weapon_id) DO NOTHING;

      UPDATE public.profiles SET equipped_weapon_id = 'w-sword-1' WHERE id = v_uid;
    END IF;
  END IF;

  -- Ensure at least one weapon is marked equipped and aligned with profiles.equipped_weapon_id
  SELECT EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid AND equipped = true) INTO v_has_equipped;
  IF NOT v_has_equipped THEN
    UPDATE public.player_weapons
    SET equipped = true
    WHERE user_id = v_uid
      AND weapon_id = COALESCE(
        (SELECT weapon_id FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = v_prof.equipped_weapon_id LIMIT 1),
        (SELECT weapon_id FROM public.player_weapons WHERE user_id = v_uid ORDER BY unlocked DESC, level DESC LIMIT 1)
      );
  END IF;

  -- Ensure player buffs exist
  INSERT INTO public.player_buffs (user_id, buff_id, name, effect_type, effect_value, duration_battles, uses_remaining, active)
  VALUES
    (v_uid, 'buff-1', 'Warrior''s Momentum', 'attack', 10, 1, 1, true),
    (v_uid, 'buff-2', 'Guardian''s Recovery', 'defense', 10, 1, 1, false),
    (v_uid, 'buff-3', 'Focus Aura', 'crit', 10, 1, 2, false),
    (v_uid, 'buff-4', 'Nature''s Blessing', 'xp', 10, 2, 2, true)
  ON CONFLICT (user_id, buff_id) DO NOTHING;

  -- Ensure default Kingdom boss encounters exist
  INSERT INTO public.boss_encounters (user_id, kingdom_id, boss_id, unlocked, cleared, boss_hp, boss_max_hp, player_hp, weakness_discovered)
  VALUES
    (v_uid, 'kingdom-forest', 'boss-void-stalker', true, false, 320, 320, 220 + v_prof.level * 15, true),
    (v_uid, 'kingdom-mountain', 'boss-mountain-titan', false, false, 560, 560, 220 + v_prof.level * 15, false),
    (v_uid, 'kingdom-ocean', 'boss-abyssal-hydra', false, false, 820, 820, 220 + v_prof.level * 15, false),
    (v_uid, 'kingdom-desert', 'boss-dune-sovereign', false, false, 1100, 1100, 220 + v_prof.level * 15, false),
    (v_uid, 'kingdom-citadel', 'boss-void-sovereign', false, false, 1400, 1400, 220 + v_prof.level * 15, false)
  ON CONFLICT (user_id, kingdom_id) DO NOTHING;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;

  RETURN jsonb_build_object(
    'profile', to_jsonb(v_prof),
    'habits', COALESCE((SELECT jsonb_agg(h ORDER BY h.created_at DESC) FROM public.habits h WHERE h.user_id = v_uid AND h.archived_at IS NULL), '[]'::jsonb),
    'weapons', COALESCE((SELECT jsonb_agg(w ORDER BY w.equipped DESC, w.base_attack ASC) FROM public.player_weapons w WHERE w.user_id = v_uid), '[]'::jsonb),
    'buffs', COALESCE((SELECT jsonb_agg(b ORDER BY b.buff_id ASC) FROM public.player_buffs b WHERE b.user_id = v_uid), '[]'::jsonb),
    'bossEncounters', COALESCE((SELECT jsonb_agg(be) FROM public.boss_encounters be WHERE be.user_id = v_uid), '[]'::jsonb),
    'questProgress', COALESCE((SELECT jsonb_agg(qp) FROM public.player_quest_progress qp WHERE qp.user_id = v_uid), '[]'::jsonb),
    'achievements', COALESCE((SELECT jsonb_agg(pa) FROM public.player_achievements pa WHERE pa.user_id = v_uid), '[]'::jsonb),
    'hydration', COALESCE((SELECT row_to_json(hd)::jsonb FROM public.hydration_daily hd WHERE hd.user_id = v_uid AND hd.log_date = (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''),'UTC'))::date), jsonb_build_object('glasses_count', 0, 'rewarded_glasses_count', 0, 'goal_reward_claimed', false)),
    'transactions', COALESCE((SELECT jsonb_agg(t) FROM (SELECT * FROM public.economy_transactions WHERE user_id = v_uid ORDER BY created_at DESC LIMIT 50) t), '[]'::jsonb)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. SERVER-AUTHORITATIVE GAMEPLAY & SOCIAL RPCs
-- ------------------------------------------------------------------------------

-- 8A. Safe Profile Preferences & Client UI Prefs
DROP FUNCTION IF EXISTS public.rpc_update_profile_preferences(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.rpc_update_profile_preferences(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
CREATE OR REPLACE FUNCTION public.rpc_update_profile_preferences(
  p_username TEXT DEFAULT NULL,
  p_character_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_character_class TEXT DEFAULT NULL,
  p_preferred_units TEXT DEFAULT NULL,
  p_height TEXT DEFAULT NULL,
  p_weight TEXT DEFAULT NULL,
  p_activity_level TEXT DEFAULT NULL,
  p_preferred_fitness_activities TEXT[] DEFAULT NULL,
  p_fitness_goals TEXT[] DEFAULT NULL,
  p_dietary_preference TEXT DEFAULT NULL,
  p_food_allergies TEXT[] DEFAULT NULL,
  p_food_intolerances TEXT[] DEFAULT NULL,
  p_disliked_foods TEXT DEFAULT NULL,
  p_notification_preferences JSONB DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_sound_enabled BOOLEAN DEFAULT NULL,
  p_is_onboarded BOOLEAN DEFAULT NULL,
  p_leaderboard_visible BOOLEAN DEFAULT NULL,
  p_age_years INTEGER DEFAULT NULL,
  p_age_group TEXT DEFAULT NULL,
  p_biological_sex TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  UPDATE public.profiles
  SET
    username = COALESCE(NULLIF(left(trim(p_username), 40), ''), username),
    character_name = COALESCE(NULLIF(left(trim(p_character_name), 50), ''), character_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    character_class = CASE WHEN p_character_class IN ('Warrior','Ranger','Mage','Guardian') THEN p_character_class ELSE character_class END,
    preferred_units = CASE WHEN p_preferred_units IN ('metric','imperial') THEN p_preferred_units ELSE preferred_units END,
    age_years = CASE WHEN p_age_years IS NOT NULL AND p_age_years BETWEEN 5 AND 120 THEN p_age_years ELSE age_years END,
    age_group = CASE WHEN p_age_group IN ('child','early_teen','older_teen','adult','older_adult') THEN p_age_group ELSE age_group END,
    biological_sex = CASE WHEN p_biological_sex IN ('female','male','non_binary','prefer_not_to_say') THEN p_biological_sex ELSE biological_sex END,
    height = CASE WHEN p_height IS NULL THEN height ELSE NULLIF(left(trim(p_height), 24), '') END,
    weight = CASE WHEN p_weight IS NULL THEN weight ELSE NULLIF(left(trim(p_weight), 24), '') END,
    activity_level = CASE WHEN p_activity_level IN ('sedentary','light','moderate','very_active','active','athlete') THEN p_activity_level ELSE activity_level END,
    preferred_fitness_activities = COALESCE(p_preferred_fitness_activities, preferred_fitness_activities),
    fitness_goals = COALESCE(p_fitness_goals, fitness_goals),
    dietary_preference = CASE WHEN p_dietary_preference IN ('vegetarian','vegan','eggetarian','non_vegetarian','other','omnivore','pescatarian','gluten_free') THEN p_dietary_preference ELSE dietary_preference END,
    food_allergies = COALESCE(p_food_allergies, food_allergies),
    food_intolerances = COALESCE(p_food_intolerances, food_intolerances),
    disliked_foods = CASE WHEN p_disliked_foods IS NULL THEN disliked_foods ELSE left(trim(p_disliked_foods), 300) END,
    notification_preferences = COALESCE(p_notification_preferences, notification_preferences),
    timezone = COALESCE(NULLIF(trim(p_timezone), ''), timezone),
    sound_enabled = COALESCE(p_sound_enabled, sound_enabled),
    is_onboarded = COALESCE(p_is_onboarded, is_onboarded),
    leaderboard_visible = COALESCE(p_leaderboard_visible, leaderboard_visible),
    last_active_at = now()
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_prof));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_save_client_preferences(p_preferences JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  INSERT INTO public.game_states (user_id, client_preferences)
  VALUES (v_uid, COALESCE(p_preferences, '{}'::jsonb))
  ON CONFLICT (user_id) DO UPDATE SET
    client_preferences = COALESCE(p_preferences, public.game_states.client_preferences),
    state_version = public.game_states.state_version + 1,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8B. Anti-Exploit Habit Reward Claim
CREATE OR REPLACE FUNCTION public.rpc_claim_habit_reward(
  p_habit_id TEXT,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_habit public.habits%ROWTYPE;
  v_period_key TEXT;
  v_new_streak INTEGER;
  v_daily_period TEXT;
  v_existing public.habit_logs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  SELECT * INTO v_existing FROM public.habit_logs WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'deduplicated', true,
      'periodKey', v_existing.period_key,
      'xpAwarded', v_existing.xp_awarded,
      'forgeXpAwarded', v_existing.forge_xp_awarded,
      'goldAwarded', v_existing.gold_awarded,
      'profile', to_jsonb(v_prof)
    );
  END IF;

  SELECT * INTO v_habit FROM public.habits WHERE user_id = v_uid AND id = p_habit_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Habit not found');
  END IF;

  v_period_key := public.resolve_period_key(v_habit.frequency, v_prof.timezone);

  IF EXISTS (
    SELECT 1 FROM public.habit_logs
    WHERE user_id = v_uid AND habit_id = p_habit_id AND period_key = v_period_key
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'alreadyClaimed', true,
      'periodKey', v_period_key,
      'error', CASE
        WHEN v_habit.frequency = 'once' THEN 'This one-time habit has already been claimed permanently.'
        WHEN v_habit.frequency = 'weekly' THEN 'Reward already claimed for this week (Mon–Sun).'
        ELSE 'Reward already claimed for today.'
      END
    );
  END IF;

  v_new_streak := COALESCE(v_habit.streak, 0) + 1;

  INSERT INTO public.habit_logs (
    user_id, habit_id, frequency_type, period_key,
    xp_awarded, forge_xp_awarded, gold_awarded, aether_points_awarded,
    idempotency_key, habit_data
  )
  VALUES (
    v_uid, p_habit_id, v_habit.frequency, v_period_key,
    v_habit.player_xp_reward, v_habit.forge_xp_reward, v_habit.gold_reward, 15,
    p_idempotency_key,
    jsonb_build_object('habitId', p_habit_id, 'habitName', v_habit.name, 'periodKey', v_period_key, 'streak', v_new_streak, 'completedAt', now())
  );

  UPDATE public.habits
  SET streak = v_new_streak, last_period_key = v_period_key, last_completed_at = now()
  WHERE user_id = v_uid AND id = p_habit_id;

  v_prof := public._credit_currencies(
    v_uid,
    v_habit.player_xp_reward,
    v_habit.forge_xp_reward,
    v_habit.gold_reward,
    15,
    'habit',
    p_habit_id,
    'Habit: ' || v_habit.name,
    p_idempotency_key
  );

  UPDATE public.profiles
  SET current_streak = GREATEST(current_streak, v_new_streak)
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  PERFORM public._grant_weapon_mastery(v_uid, v_prof.equipped_weapon_id, 20);

  v_daily_period := public.resolve_period_key('daily', v_prof.timezone);
  INSERT INTO public.player_quest_progress (user_id, quest_id, period_key, progress, max_progress, completed)
  VALUES (v_uid, 'q-1', v_daily_period, 1, 2, false)
  ON CONFLICT (user_id, quest_id, period_key) DO UPDATE SET
    progress = LEAST(public.player_quest_progress.max_progress, public.player_quest_progress.progress + 1),
    completed = LEAST(public.player_quest_progress.max_progress, public.player_quest_progress.progress + 1) >= public.player_quest_progress.max_progress;

  IF v_new_streak >= 3 THEN
    INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
    VALUES (v_uid, 'ach-2', v_new_streak, 3, true)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(public.player_achievements.progress, v_new_streak),
      unlocked = true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'periodKey', v_period_key,
    'streak', v_new_streak,
    'xpAwarded', v_habit.player_xp_reward,
    'forgeXpAwarded', v_habit.forge_xp_reward,
    'goldAwarded', v_habit.gold_reward,
    'profile', to_jsonb(v_prof)
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'alreadyClaimed', true, 'error', 'Duplicate claim rejected by database protection.');
END;
$$;

-- 8C. Create / Archive Habit (enforces active cap, daily creation cap & reward bounds)
CREATE OR REPLACE FUNCTION public.rpc_create_habit(
  p_name TEXT,
  p_category TEXT DEFAULT 'discipline',
  p_frequency TEXT DEFAULT 'daily',
  p_icon_name TEXT DEFAULT 'Sparkles',
  p_player_xp INTEGER DEFAULT 15,
  p_forge_xp INTEGER DEFAULT 20,
  p_gold INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_row public.habits%ROWTYPE;
  v_active_count INTEGER;
  v_today_created INTEGER;
  v_freq TEXT := CASE WHEN p_frequency IN ('daily','weekly','once','weekdays','weekends','custom') THEN p_frequency ELSE 'daily' END;
  v_max_xp INTEGER := CASE WHEN p_frequency = 'weekly' THEN 60 WHEN p_frequency = 'once' THEN 40 ELSE 30 END;
  v_max_forge INTEGER := CASE WHEN p_frequency = 'weekly' THEN 50 WHEN p_frequency = 'once' THEN 40 ELSE 30 END;
  v_max_gold INTEGER := CASE WHEN p_frequency = 'weekly' THEN 50 WHEN p_frequency = 'once' THEN 35 ELSE 25 END;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(COALESCE(p_name, ''))) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Habit name must be at least 2 characters.');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  SELECT count(*) INTO v_active_count FROM public.habits WHERE user_id = v_uid AND archived_at IS NULL;
  IF v_active_count >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum of 20 active habits reached. Archive an existing habit first.');
  END IF;

  SELECT count(*) INTO v_today_created
  FROM public.habits
  WHERE user_id = v_uid
    AND (created_at AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date =
        (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date;
  IF v_today_created >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily limit of 5 new habits reached. Try again tomorrow.');
  END IF;

  INSERT INTO public.habits (
    user_id, id, name, category, frequency, icon_name,
    player_xp_reward, forge_xp_reward, gold_reward
  )
  VALUES (
    v_uid,
    'h-' || substr(gen_random_uuid()::text, 1, 12),
    left(trim(p_name), 100),
    COALESCE(NULLIF(trim(p_category), ''), 'discipline'),
    v_freq,
    COALESCE(NULLIF(trim(p_icon_name), ''), 'Sparkles'),
    LEAST(v_max_xp, GREATEST(5, COALESCE(p_player_xp, 15))),
    LEAST(v_max_forge, GREATEST(5, COALESCE(p_forge_xp, 20))),
    LEAST(v_max_gold, GREATEST(5, COALESCE(p_gold, 15)))
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'habit', to_jsonb(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_archive_habit(p_habit_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.habits SET archived_at = now() WHERE user_id = v_uid AND id = p_habit_id AND archived_at IS NULL;
  RETURN jsonb_build_object('success', FOUND);
END;
$$;

-- 8D. Log Workout Session (Idempotency required + Daily reward cap)
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
  v_dur INTEGER := LEAST(180, GREATEST(1, COALESCE(p_duration_minutes, 10)));
  v_reps INTEGER := LEAST(300, GREATEST(0, COALESCE(p_repetitions, 0)));
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
    v_xp := CASE WHEN p_verified_with_vision THEN GREATEST(10, v_reps) * 4 + 30 ELSE v_dur * 2 + 10 END;
    v_forge := CASE WHEN p_verified_with_vision THEN GREATEST(10, v_reps) * 5 + 40 ELSE v_dur * 3 + 15 END;
    v_gold := CASE WHEN p_verified_with_vision THEN 40 + LEAST(60, v_reps) ELSE 20 + LEAST(40, v_dur) END;
    v_aether := CASE WHEN p_verified_with_vision THEN 40 ELSE 25 END;
  END IF;

  INSERT INTO public.workout_sessions (
    user_id, exercise_type, exercise_name, duration_minutes, repetitions, distance_km,
    verified_with_vision, xp_awarded, forge_xp_awarded, gold_awarded, aether_points_awarded,
    idempotency_key, workout_data
  )
  VALUES (
    v_uid, left(COALESCE(p_exercise_type, 'workout'), 40), left(COALESCE(p_exercise_name, 'Training'), 100), v_dur, v_reps, p_distance_km,
    COALESCE(p_verified_with_vision, false), v_xp, v_forge, v_gold, v_aether,
    p_idempotency_key,
    jsonb_build_object(
      'exerciseType', p_exercise_type,
      'exerciseName', p_exercise_name,
      'durationMinutes', v_dur,
      'repetitions', v_reps,
      'distanceKm', p_distance_km,
      'verifiedWithAetherVision', COALESCE(p_verified_with_vision, false),
      'notes', p_notes,
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
      'Fitness Session: ' || COALESCE(p_exercise_name, 'Workout'),
      p_idempotency_key
    );

    PERFORM public._grant_weapon_mastery(v_uid, v_prof.equipped_weapon_id, CASE WHEN COALESCE(p_verified_with_vision, false) THEN 45 ELSE 30 END);
  END IF;

  UPDATE public.profiles
  SET
    total_workouts_completed = total_workouts_completed + 1,
    total_verified_reps = total_verified_reps + CASE WHEN COALESCE(p_verified_with_vision, false) THEN v_reps ELSE 0 END
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  IF COALESCE(p_verified_with_vision, false) THEN
    UPDATE public.player_buffs SET active = true, uses_remaining = 2 WHERE user_id = v_uid AND buff_id = 'buff-1';
    INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
    VALUES (v_uid, 'ach-5', 1, 1, true)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = 1, unlocked = true;
  END IF;

  v_daily_period := public.resolve_period_key('daily', v_prof.timezone);
  v_weekly_period := public.resolve_period_key('weekly', v_prof.timezone);

  IF COALESCE(p_verified_with_vision, false) AND p_exercise_type = 'squat' AND v_reps > 0 THEN
    INSERT INTO public.player_quest_progress (user_id, quest_id, period_key, progress, max_progress, completed)
    VALUES (v_uid, 'q-2', v_daily_period, LEAST(10, v_reps), 10, v_reps >= 10)
    ON CONFLICT (user_id, quest_id, period_key) DO UPDATE SET
      progress = LEAST(10, public.player_quest_progress.progress + v_reps),
      completed = LEAST(10, public.player_quest_progress.progress + v_reps) >= 10;
  END IF;

  INSERT INTO public.player_quest_progress (user_id, quest_id, period_key, progress, max_progress, completed)
  VALUES (v_uid, 'q-4', v_weekly_period, LEAST(120, v_dur), 120, v_dur >= 120)
  ON CONFLICT (user_id, quest_id, period_key) DO UPDATE SET
    progress = LEAST(120, public.player_quest_progress.progress + v_dur),
    completed = LEAST(120, public.player_quest_progress.progress + v_dur) >= 120;

  SELECT guild_id INTO v_guild_id FROM public.guild_members WHERE user_id = v_uid LIMIT 1;
  IF v_guild_id IS NOT NULL AND NOT v_cap_reached THEN
    UPDATE public.guilds
    SET weekly_quest_progress = LEAST(weekly_quest_max, weekly_quest_progress + GREATEST(v_reps, v_dur))
    WHERE id = v_guild_id;

    UPDATE public.guild_members
    SET weekly_contribution = weekly_contribution + GREATEST(v_reps, v_dur)
    WHERE guild_id = v_guild_id AND user_id = v_uid;

    INSERT INTO public.guild_challenges (guild_id, title, period_key, target_value, current_value)
    SELECT g.id, g.weekly_quest_name, v_weekly_period, GREATEST(100, g.weekly_quest_max), 0
    FROM public.guilds g WHERE g.id = v_guild_id
    ON CONFLICT (guild_id, period_key) DO NOTHING;

    UPDATE public.guild_challenges
    SET
      current_value = LEAST(target_value, current_value + GREATEST(v_reps, v_dur)),
      completed = LEAST(target_value, current_value + GREATEST(v_reps, v_dur)) >= target_value
    WHERE guild_id = v_guild_id AND period_key = v_weekly_period
    RETURNING id INTO v_challenge_id;

    IF v_challenge_id IS NOT NULL THEN
      INSERT INTO public.guild_challenge_contributions (
        challenge_id, guild_id, user_id, contribution_delta, source_type, source_id
      )
      VALUES (
        v_challenge_id, v_guild_id, v_uid, GREATEST(1, GREATEST(v_reps, v_dur)), 'workout', v_session.id::text
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'dailyCapReached', v_cap_reached,
    'session', to_jsonb(v_session),
    'profile', to_jsonb(v_prof)
  );
END;
$$;

-- 8E. Log Nutrition Meal & Anti-Reset Hydration
DROP FUNCTION IF EXISTS public.rpc_log_nutrition(TEXT, TEXT, TEXT[], TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.rpc_log_nutrition(
  p_meal_type TEXT,
  p_title TEXT,
  p_food_items TEXT[],
  p_dietary_category TEXT DEFAULT 'vegetarian',
  p_balanced_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_nutrition_estimate JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_meal public.nutrition_logs%ROWTYPE;
  v_daily_period TEXT;
  v_today_meals INTEGER;
  v_cap_reached BOOLEAN := false;
  v_xp INTEGER := 25;
  v_forge INTEGER := 25;
  v_gold INTEGER := 20;
  v_aether INTEGER := 15;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;
  IF char_length(trim(COALESCE(p_title, ''))) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meal title is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  SELECT * INTO v_meal FROM public.nutrition_logs WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'meal', to_jsonb(v_meal), 'profile', to_jsonb(v_prof));
  END IF;

  SELECT count(*) INTO v_today_meals
  FROM public.nutrition_logs
  WHERE user_id = v_uid
    AND (logged_at AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date =
        (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date;

  IF v_today_meals >= 5 THEN
    v_cap_reached := true;
    v_xp := 0;
    v_forge := 0;
    v_gold := 0;
    v_aether := 0;
  END IF;

  INSERT INTO public.nutrition_logs (
    user_id, meal_type, title, dietary_category, xp_awarded, forge_xp_awarded, gold_awarded, aether_points_awarded,
    idempotency_key, meal_data
  )
  VALUES (
    v_uid, left(COALESCE(p_meal_type, 'lunch'), 30), left(trim(p_title), 120), COALESCE(p_dietary_category, 'vegetarian'),
    v_xp, v_forge, v_gold, v_aether,
    p_idempotency_key,
    jsonb_build_object(
      'mealType', p_meal_type,
      'title', trim(p_title),
      'foodItems', COALESCE(to_jsonb(p_food_items), '[]'::jsonb),
      'dietaryCategory', p_dietary_category,
      'balancedNotes', p_balanced_notes,
      'timestamp', now()
    ) || CASE
      WHEN p_nutrition_estimate IS NOT NULL
      THEN jsonb_build_object('nutritionEstimate', p_nutrition_estimate)
      ELSE '{}'::jsonb
    END
  )
  RETURNING * INTO v_meal;

  IF NOT v_cap_reached THEN
    v_prof := public._credit_currencies(v_uid, v_xp, v_forge, v_gold, v_aether, 'nutrition', v_meal.id::text, 'Balanced Meal: ' || left(trim(p_title), 80), p_idempotency_key);
    PERFORM public._grant_weapon_mastery(v_uid, v_prof.equipped_weapon_id, 15);
  END IF;

  v_daily_period := public.resolve_period_key('daily', v_prof.timezone);
  INSERT INTO public.player_quest_progress (user_id, quest_id, period_key, progress, max_progress, completed)
  VALUES (v_uid, 'q-3', v_daily_period, 1, 2, false)
  ON CONFLICT (user_id, quest_id, period_key) DO UPDATE SET
    progress = LEAST(2, public.player_quest_progress.progress + 1),
    completed = LEAST(2, public.player_quest_progress.progress + 1) >= 2;

  RETURN jsonb_build_object(
    'success', true,
    'dailyCapReached', v_cap_reached,
    'meal', to_jsonb(v_meal),
    'profile', to_jsonb(v_prof)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_log_water_glass()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_date DATE;
  v_hd public.hydration_daily%ROWTYPE;
  v_newly_rewarded BOOLEAN := false;
  v_goal_newly_claimed BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  v_date := (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date;

  INSERT INTO public.hydration_daily (user_id, log_date, glasses_count, rewarded_glasses_count)
  VALUES (v_uid, v_date, 1, 0)
  ON CONFLICT (user_id, log_date) DO UPDATE SET
    glasses_count = LEAST(16, public.hydration_daily.glasses_count + 1),
    updated_at = now()
  RETURNING * INTO v_hd;

  -- Strictly award glass XP/Gold only up to 8 unique glasses per day (immune to rpc_reset_water_daily)
  IF v_hd.glasses_count <= 8 AND v_hd.glasses_count > v_hd.rewarded_glasses_count THEN
    v_newly_rewarded := true;
    UPDATE public.hydration_daily
    SET rewarded_glasses_count = LEAST(8, GREATEST(rewarded_glasses_count, v_hd.glasses_count))
    WHERE user_id = v_uid AND log_date = v_date
    RETURNING * INTO v_hd;

    v_prof := public._credit_currencies(v_uid, 0, 0, 5, 5, 'hydration', v_date::text, 'Hydration Glass #' || v_hd.glasses_count, NULL);
    PERFORM public._grant_weapon_mastery(v_uid, v_prof.equipped_weapon_id, 5);
  END IF;

  IF v_hd.glasses_count >= 8 AND NOT v_hd.goal_reward_claimed THEN
    v_goal_newly_claimed := true;
    UPDATE public.hydration_daily SET goal_reward_claimed = true WHERE user_id = v_uid AND log_date = v_date
    RETURNING * INTO v_hd;

    v_prof := public._credit_currencies(v_uid, 20, 25, 30, 25, 'hydration_goal', v_date::text, 'Daily Hydration Target Reached (8 Glasses)', NULL);
    UPDATE public.player_buffs SET active = true, uses_remaining = 2 WHERE user_id = v_uid AND buff_id = 'buff-4';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'glassesCount', v_hd.glasses_count,
    'rewardedGlassesCount', v_hd.rewarded_glasses_count,
    'rewardGranted', v_newly_rewarded,
    'goalRewardClaimed', v_hd.goal_reward_claimed,
    'goalNewlyClaimed', v_goal_newly_claimed,
    'profile', to_jsonb(v_prof)
  );
END;
$$;

-- Reset ONLY clears visual counter; NEVER grants rewards or resets rewarded_glasses_count / goal_reward_claimed
CREATE OR REPLACE FUNCTION public.rpc_reset_water_daily()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_date DATE;
  v_hd public.hydration_daily%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  v_date := (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone,''), 'UTC'))::date;

  UPDATE public.hydration_daily
  SET glasses_count = 0, updated_at = now()
  WHERE user_id = v_uid AND log_date = v_date
  RETURNING * INTO v_hd;

  RETURN jsonb_build_object(
    'success', true,
    'glassesCount', 0,
    'rewardedGlassesCount', COALESCE(v_hd.rewarded_glasses_count, 0),
    'goalRewardClaimed', COALESCE(v_hd.goal_reward_claimed, false)
  );
END;
$$;

-- 8F. Claim Quest & Achievement
CREATE OR REPLACE FUNCTION public.rpc_claim_quest(p_quest_id TEXT, p_period_key TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_q public.quests_catalog%ROWTYPE;
  v_qp public.player_quest_progress%ROWTYPE;
  v_period TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  SELECT * INTO v_q FROM public.quests_catalog WHERE id = p_quest_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Quest not found'); END IF;

  v_period := COALESCE(NULLIF(trim(p_period_key), ''), public.resolve_period_key(v_q.quest_type, v_prof.timezone));
  SELECT * INTO v_qp FROM public.player_quest_progress WHERE user_id = v_uid AND quest_id = p_quest_id AND period_key = v_period FOR UPDATE;
  IF NOT FOUND OR NOT v_qp.completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest requirements not yet completed');
  END IF;
  IF v_qp.claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest reward already claimed for this period');
  END IF;

  UPDATE public.player_quest_progress SET claimed = true, claimed_at = now()
  WHERE user_id = v_uid AND quest_id = p_quest_id AND period_key = v_period;

  v_prof := public._credit_currencies(v_uid, v_q.player_xp_reward, v_q.forge_xp_reward, v_q.gold_reward, 20, 'quest', p_quest_id, 'Quest Claimed: ' || v_q.title, NULL);

  INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
  VALUES (v_uid, 'ach-1', 1, 1, true)
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = 1, unlocked = true;

  RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_prof));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_claim_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_ach public.achievements_catalog%ROWTYPE;
  v_pa public.player_achievements%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_ach FROM public.achievements_catalog WHERE id = p_achievement_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Achievement not found'); END IF;

  SELECT * INTO v_pa FROM public.player_achievements WHERE user_id = v_uid AND achievement_id = p_achievement_id FOR UPDATE;
  IF NOT FOUND OR NOT v_pa.unlocked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement not yet unlocked');
  END IF;
  IF v_pa.claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement already claimed');
  END IF;

  UPDATE public.player_achievements SET claimed = true, claimed_at = now()
  WHERE user_id = v_uid AND achievement_id = p_achievement_id;

  v_prof := public._credit_currencies(v_uid, v_ach.reward_player_xp, v_ach.reward_forge_xp, v_ach.reward_gold, 25, 'achievement', p_achievement_id, 'Achievement: ' || v_ach.name, NULL);
  RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_prof));
END;
$$;

-- 8G. Shop & Armory RPCs (Race-safe idempotency, cooldown/cost on manual mastery drills)
CREATE OR REPLACE FUNCTION public.rpc_purchase_shop_item(
  p_item_id TEXT,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_item public.shop_items%ROWTYPE;
  v_meta JSONB;
  v_cat TEXT;
  v_w_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  -- Acquire row lock BEFORE checking idempotency so concurrent requests serialize cleanly
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.player_purchases WHERE user_id = v_uid AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'profile', to_jsonb(v_prof));
  END IF;

  SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id AND is_active = true FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shop item unavailable');
  END IF;

  IF v_prof.level < v_item.required_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Hero Level ' || v_item.required_level);
  END IF;
  IF v_prof.gold_balance < v_item.price_gold THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Gold (' || v_item.price_gold || ' Gold required)');
  END IF;
  IF v_prof.forge_xp < v_item.price_forge_xp THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Forge XP');
  END IF;

  v_meta := v_item.metadata;

  IF v_item.item_type = 'weapon' THEN
    v_w_id := v_meta->>'weaponId';
    v_cat := COALESCE(v_meta->>'category', 'Swords');
    IF EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = v_w_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already own ' || v_item.name);
    END IF;
    INSERT INTO public.player_weapons (
      user_id, weapon_id, name, category, rarity, level, max_level,
      base_attack, attack_per_level, base_defense, defense_per_level,
      upgrade_forge_cost, unlocked, equipped, evolution_stage, mastery_level, mastery_path, abilities
    )
    VALUES (
      v_uid,
      v_w_id,
      v_item.name,
      v_cat,
      v_item.rarity,
      1,
      COALESCE((v_meta->>'maxLevel')::INTEGER, 12),
      COALESCE((v_meta->>'baseAttack')::INTEGER, 45),
      COALESCE((v_meta->>'attackPerLevel')::INTEGER, 9),
      COALESCE((v_meta->>'baseDefense')::INTEGER, 10),
      COALESCE((v_meta->>'defensePerLevel')::INTEGER, 3),
      COALESCE((v_meta->>'upgradeForgeCost')::INTEGER, 100),
      true,
      false,
      v_prof.aether_rank,
      2,
      CASE WHEN v_cat = 'Bows' THEN 'Endurance' WHEN v_cat IN ('Magic Staffs','Helmets','Accessories') THEN 'Focus' WHEN v_cat IN ('Shields','Armour') THEN 'Recovery' ELSE 'Strength' END,
      CASE
        WHEN v_cat = 'Bows' THEN '[{"id":"ab-bw-1","name":"Quick Shot","icon":"Crosshair","description":"Instant double arrow release dealing 140% rapid precision damage.","unlockRequirement":"Attain Bow Mastery Level 2 (Endurance Path)","unlockMasteryLevel":2,"combatEffect":"+40% Rapid Attack Speed","unlocked":true,"damageMultiplier":1.4,"element":"Physical","staminaCost":20},{"id":"ab-bw-2","name":"Piercing Arrow","icon":"Zap","description":"Fires a high-velocity lightning phase bolt that bypasses 50% of target defense.","unlockRequirement":"Attain Bow Mastery Level 4 (Endurance Path)","unlockMasteryLevel":4,"combatEffect":"+110% Armor Piercing Damage (Lightning Element)","unlocked":false,"damageMultiplier":2.1,"element":"Lightning","staminaCost":30},{"id":"ab-bw-3","name":"Phantom Volley","icon":"Sparkles","description":"Rains down a barrage of 6 spectral glacial arrows dealing 330% frost damage.","unlockRequirement":"Attain Bow Mastery Level 7 (Endurance Path)","unlockMasteryLevel":7,"combatEffect":"+230% Multi-arrow Lunar Barrage (Ice Element)","unlocked":false,"damageMultiplier":3.3,"element":"Ice","staminaCost":45}]'::jsonb
        WHEN v_cat = 'Magic Staffs' THEN '[{"id":"ab-st-1","name":"Arcane Pulse","icon":"Sparkles","description":"Releases a concentrated radiant shockwave dealing 160% radiant light damage.","unlockRequirement":"Attain Staff Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+60% Arcane Shock Damage (Radiant Light)","unlocked":true,"damageMultiplier":1.6,"element":"Light","staminaCost":25},{"id":"ab-st-2","name":"Mana Burst","icon":"Eye","description":"Condenses stored mental energy into an explosive sphere dealing 240% fire damage.","unlockRequirement":"Attain Staff Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+140% Arcane Burst Damage (Fire Element)","unlocked":false,"damageMultiplier":2.4,"element":"Fire","staminaCost":35},{"id":"ab-st-3","name":"Aether Storm","icon":"CloudLightning","description":"Summons a swirling celestial deluge of oceanic aether dealing 360% water damage.","unlockRequirement":"Attain Staff Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+260% Celestial Tempest Damage (Water Element)","unlocked":false,"damageMultiplier":3.6,"element":"Water","staminaCost":45}]'::jsonb
        WHEN v_cat = 'Shields' THEN '[{"id":"ab-sh-1","name":"Iron Guard","icon":"Shield","description":"Brace shield firmly to absorb 40% incoming damage and counter-strike.","unlockRequirement":"Attain Shield Mastery Level 2 (Recovery Path)","unlockMasteryLevel":2,"combatEffect":"+40% Damage Absorption & Stance Guard","unlocked":true,"defenseBoost":40,"element":"Physical","staminaCost":20},{"id":"ab-sh-2","name":"Reflective Ward","icon":"ShieldAlert","description":"Ignites radiant barrier absorbing 65% damage and blinding the enemy with light.","unlockRequirement":"Attain Shield Mastery Level 4 (Recovery Path)","unlockMasteryLevel":4,"combatEffect":"+65% Damage Absorption & Reflection (Light Element)","unlocked":false,"defenseBoost":65,"damageMultiplier":1.4,"element":"Light","staminaCost":30},{"id":"ab-sh-3","name":"Divine Barrier","icon":"ShieldCheck","description":"Deploys an impervious purifying water aegis absorbing the next strikes completely.","unlockRequirement":"Attain Shield Mastery Level 7 (Recovery Path)","unlockMasteryLevel":7,"combatEffect":"+100% Defense Ward & Full Absorption (Water Element)","unlocked":false,"defenseBoost":100,"element":"Water","staminaCost":45}]'::jsonb
        WHEN v_cat = 'Armour' THEN '[{"id":"ab-ar-1","name":"Bulwark Stance","icon":"Shield","description":"Reinforce chestplate plating to deflect 35% of heavy melee blows.","unlockRequirement":"Attain Armour Mastery Level 2 (Recovery Path)","unlockMasteryLevel":2,"combatEffect":"+35% Physical Damage Mitigation","unlocked":true,"defenseBoost":35,"element":"Physical","staminaCost":20},{"id":"ab-ar-2","name":"Sunforged Aegis","icon":"Flame","description":"Engulfs cuirass in solar embers, scorching attackers and boosting ward +60%.","unlockRequirement":"Attain Armour Mastery Level 4 (Recovery Path)","unlockMasteryLevel":4,"combatEffect":"+60% Defense & Solar Retaliation (Fire Element)","unlocked":false,"defenseBoost":60,"damageMultiplier":1.35,"element":"Fire","staminaCost":30},{"id":"ab-ar-3","name":"Immortal Bastion","icon":"ShieldCheck","description":"Channels sacred starlight through runes for +95% total defense resilience.","unlockRequirement":"Attain Armour Mastery Level 7 (Recovery Path)","unlockMasteryLevel":7,"combatEffect":"+95% Bastion Shielding (Light Element)","unlocked":false,"defenseBoost":95,"element":"Light","staminaCost":40}]'::jsonb
        WHEN v_cat = 'Helmets' THEN '[{"id":"ab-hl-1","name":"Battle Clarity","icon":"Eye","description":"Sharpens tactical vision to anticipate strikes (+15% Defense, +8% Crit).","unlockRequirement":"Attain Helm Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+15% Defense & +8% Crit Precision","unlocked":true,"defenseBoost":15,"critBonus":8,"element":"Physical","staminaCost":15},{"id":"ab-hl-2","name":"Archon Sight","icon":"Sparkles","description":"Reveals enemy weak points through celestial focus (+18% Crit, Light burst).","unlockRequirement":"Attain Helm Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+18% Crit Strike & Weakness Insight (Light)","unlocked":false,"damageMultiplier":1.5,"critBonus":18,"element":"Light","staminaCost":25},{"id":"ab-hl-3","name":"Crown of Sovereignty","icon":"Sparkles","description":"Radiates commanding dawn aura empowering attacks by 220% and fortifying poise.","unlockRequirement":"Attain Helm Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+120% Radiant Strike & +25% Crit (Light)","unlocked":false,"damageMultiplier":2.2,"critBonus":25,"defenseBoost":30,"element":"Light","staminaCost":35}]'::jsonb
        WHEN v_cat = 'Accessories' THEN '[{"id":"ab-ac-1","name":"Ember Resonance","icon":"Flame","description":"Ignites relic warmth around your strikes (+12% Crit, Fire surge).","unlockRequirement":"Attain Relic Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+45% Fire Damage Surge & +12% Crit","unlocked":true,"damageMultiplier":1.45,"critBonus":12,"element":"Fire","staminaCost":20},{"id":"ab-ac-2","name":"Astral Conduit","icon":"Zap","description":"Channels stellar currents for +100% lightning damage and rapid stamina surge.","unlockRequirement":"Attain Relic Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+100% Astral Arc Damage (Lightning Element)","unlocked":false,"damageMultiplier":2.0,"critBonus":15,"element":"Lightning","staminaCost":30},{"id":"ab-ac-3","name":"Celestial Convergence","icon":"Sparkles","description":"Harmonizes all discipline paths into a 280% cosmic burst.","unlockRequirement":"Attain Relic Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+180% Cosmic Convergence (Light Element)","unlocked":false,"damageMultiplier":2.8,"critBonus":22,"element":"Light","staminaCost":40}]'::jsonb
        ELSE '[{"id":"ab-sw-1","name":"Power Strike","icon":"Zap","description":"Deliver a devastating physical blow that pierces 10% enemy armor.","unlockRequirement":"Attain Sword Mastery Level 2 (Strength Path)","unlockMasteryLevel":2,"combatEffect":"+50% Attack Damage Strike","unlocked":true,"damageMultiplier":1.5,"element":"Physical","staminaCost":25},{"id":"ab-sw-2","name":"Berserker Slash","icon":"Flame","description":"Unleash two sweeping slashes dealing 220% damage with +15% critical momentum.","unlockRequirement":"Attain Sword Mastery Level 4 (Strength Path)","unlockMasteryLevel":4,"combatEffect":"+120% Attack Damage, +15% Crit Strike (Fire Element)","unlocked":false,"damageMultiplier":2.2,"critBonus":15,"element":"Fire","staminaCost":35},{"id":"ab-sw-3","name":"Titan''s Wrath","icon":"Swords","description":"Channel celestial titan fury for 350% colossal radiant damage and stance break.","unlockRequirement":"Attain Sword Mastery Level 7 (Strength Path)","unlockMasteryLevel":7,"combatEffect":"+250% Colossal Attack Damage (Radiant Light)","unlocked":false,"damageMultiplier":3.5,"element":"Light","staminaCost":45}]'::jsonb
      END
    );
  ELSIF v_item.item_type IN ('elixir', 'buff') AND (v_meta ? 'buffId') THEN
    INSERT INTO public.player_buffs (user_id, buff_id, name, effect_type, effect_value, duration_battles, uses_remaining, active)
    VALUES (
      v_uid,
      v_meta->>'buffId',
      v_item.name,
      COALESCE(v_meta->>'effectType', 'attack'),
      COALESCE((v_meta->>'effectValue')::INTEGER, 10),
      COALESCE((v_meta->>'uses')::INTEGER, 2),
      COALESCE((v_meta->>'uses')::INTEGER, 2),
      true
    )
    ON CONFLICT (user_id, buff_id) DO UPDATE SET
      active = true,
      uses_remaining = GREATEST(public.player_buffs.uses_remaining, 0) + COALESCE((v_meta->>'uses')::INTEGER, 2),
      updated_at = now();
  ELSIF v_item.item_type = 'catalyst' AND (v_meta ? 'grantForgeXp') THEN
    v_prof := public._credit_currencies(v_uid, 0, (v_meta->>'grantForgeXp')::INTEGER, 0, 0, 'shop_catalyst', p_item_id, 'Catalyst Transmutation: ' || v_item.name, p_idempotency_key);
  END IF;

  INSERT INTO public.player_purchases (user_id, item_id, price_gold, price_forge_xp, idempotency_key)
  VALUES (v_uid, p_item_id, v_item.price_gold, v_item.price_forge_xp, p_idempotency_key);

  v_prof := public._credit_currencies(
    v_uid, 0, -v_item.price_forge_xp, -v_item.price_gold, 0,
    'shop_purchase', p_item_id, 'Purchased: ' || v_item.name, p_idempotency_key
  );

  RETURN jsonb_build_object('success', true, 'item', to_jsonb(v_item), 'profile', to_jsonb(v_prof));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_equip_weapon(p_weapon_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  IF NOT EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id AND unlocked = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weapon not unlocked');
  END IF;
  UPDATE public.player_weapons SET equipped = (weapon_id = p_weapon_id), updated_at = now() WHERE user_id = v_uid;
  UPDATE public.profiles SET equipped_weapon_id = p_weapon_id WHERE id = v_uid;
  RETURN jsonb_build_object('success', true, 'equippedWeaponId', p_weapon_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_upgrade_weapon(p_weapon_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_w public.player_weapons%ROWTYPE;
  v_cost INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Weapon not found'); END IF;
  IF v_w.level >= v_w.max_level THEN RETURN jsonb_build_object('success', false, 'error', 'Weapon already at max level'); END IF;

  v_cost := v_w.upgrade_forge_cost;
  IF v_prof.forge_xp < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Forge XP');
  END IF;

  UPDATE public.player_weapons
  SET
    level = level + 1,
    base_attack = base_attack + attack_per_level,
    base_defense = base_defense + defense_per_level,
    upgrade_forge_cost = round(upgrade_forge_cost * 1.5)::INTEGER,
    updated_at = now()
  WHERE user_id = v_uid AND weapon_id = p_weapon_id
  RETURNING * INTO v_w;

  v_prof := public._credit_currencies(v_uid, 0, -v_cost, 0, 0, 'forge_upgrade', p_weapon_id, 'Blacksmith Upgrade: ' || v_w.name || ' Lv.' || v_w.level, NULL);

  INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
  VALUES (v_uid, 'ach-3', 1, 1, true)
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = 1, unlocked = true;

  INSERT INTO public.player_quest_progress (user_id, quest_id, period_key, progress, max_progress, completed)
  VALUES (v_uid, 'q-5', 'once', 1, 1, true)
  ON CONFLICT (user_id, quest_id, period_key) DO UPDATE SET progress = 1, completed = true;

  RETURN jsonb_build_object('success', true, 'weapon', to_jsonb(v_w), 'profile', to_jsonb(v_prof));
END;
$$;

-- Manual Mastery Drill: fixed 40 XP gain, costs 15 Gold, and enforces 10-minute cooldown per weapon
CREATE OR REPLACE FUNCTION public.rpc_train_weapon_mastery(p_weapon_id TEXT, p_gained_xp INTEGER DEFAULT 40)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_w public.player_weapons%ROWTYPE;
  v_gold_cost CONSTANT INTEGER := 15;
  v_cooldown CONSTANT INTERVAL := interval '10 minutes';
  v_fixed_gain CONSTANT INTEGER := 40;
  v_secs_left INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Weapon not found'); END IF;
  IF v_w.mastery_level >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weapon has already reached Mastery Level 10');
  END IF;

  IF v_w.last_mastery_drill_at IS NOT NULL AND v_w.last_mastery_drill_at + v_cooldown > now() THEN
    v_secs_left := CEIL(EXTRACT(EPOCH FROM (v_w.last_mastery_drill_at + v_cooldown - now())))::INTEGER;
    RETURN jsonb_build_object(
      'success', false,
      'cooldownSeconds', v_secs_left,
      'error', 'Weapon mastery drill is cooling down (' || GREATEST(1, CEIL(v_secs_left / 60.0)::INTEGER) || 'm remaining). Complete habits or workouts to earn passive mastery XP!'
    );
  END IF;

  IF v_prof.gold_balance < v_gold_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_gold_cost || ' Gold for sparring ground access.');
  END IF;

  v_prof := public._credit_currencies(v_uid, 0, 0, -v_gold_cost, 0, 'mastery_drill', p_weapon_id, 'Mastery Drill: ' || v_w.name, NULL);
  v_w := public._grant_weapon_mastery(v_uid, p_weapon_id, v_fixed_gain);

  UPDATE public.player_weapons
  SET last_mastery_drill_at = now()
  WHERE user_id = v_uid AND weapon_id = p_weapon_id
  RETURNING * INTO v_w;

  RETURN jsonb_build_object('success', true, 'weapon', to_jsonb(v_w), 'profile', to_jsonb(v_prof));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_evolve_weapon(p_weapon_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_w public.player_weapons%ROWTYPE;
  v_stages TEXT[] := ARRAY['Dormant','Awakened','Ascended','Mythic','Transcendent'];
  v_cur_idx INTEGER;
  v_rank_idx INTEGER;
  v_next_stage TEXT;
  v_req_mastery INTEGER;
  v_forge_cost INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Weapon not found'); END IF;

  v_cur_idx := array_position(v_stages, v_w.evolution_stage);
  v_rank_idx := array_position(v_stages, v_prof.aether_rank);
  IF v_cur_idx IS NULL OR v_cur_idx >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weapon has already reached Transcendent stage');
  END IF;

  v_next_stage := v_stages[v_cur_idx + 1];
  IF COALESCE(v_rank_idx, 1) < (v_cur_idx + 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires global Aether Rank: ' || v_next_stage);
  END IF;

  v_req_mastery := CASE v_next_stage WHEN 'Awakened' THEN 2 WHEN 'Ascended' THEN 4 WHEN 'Mythic' THEN 6 ELSE 8 END;
  IF v_w.mastery_level < v_req_mastery THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Mastery Level ' || v_req_mastery);
  END IF;

  v_forge_cost := CASE v_next_stage WHEN 'Awakened' THEN 50 WHEN 'Ascended' THEN 100 WHEN 'Mythic' THEN 200 ELSE 350 END;
  IF v_prof.forge_xp < v_forge_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Forge XP (' || v_forge_cost || ' required)');
  END IF;

  UPDATE public.player_weapons
  SET
    evolution_stage = v_next_stage,
    base_attack = round(base_attack * 1.25)::INTEGER,
    base_defense = round(base_defense * 1.25)::INTEGER,
    updated_at = now()
  WHERE user_id = v_uid AND weapon_id = p_weapon_id
  RETURNING * INTO v_w;

  v_prof := public._credit_currencies(v_uid, 0, -v_forge_cost, 0, 0, 'weapon_evolution', p_weapon_id, 'Weapon Evolution: ' || v_w.name || ' -> ' || v_next_stage, NULL);

  RETURN jsonb_build_object('success', true, 'newStage', v_next_stage, 'weapon', to_jsonb(v_w), 'profile', to_jsonb(v_prof));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_buff(p_buff_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_b public.player_buffs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_b FROM public.player_buffs WHERE user_id = v_uid AND buff_id = p_buff_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buff not found');
  END IF;
  IF NOT v_b.active AND v_b.uses_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No buff charges remaining');
  END IF;

  UPDATE public.player_buffs SET active = NOT active, updated_at = now()
  WHERE user_id = v_uid AND buff_id = p_buff_id
  RETURNING * INTO v_b;
  RETURN jsonb_build_object('success', true, 'buff', to_jsonb(v_b));
END;
$$;

-- 8H. Server-Authoritative Boss Encounters & Victory Validation
CREATE OR REPLACE FUNCTION public.rpc_discover_boss_weakness(p_kingdom_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.boss_encounters SET weakness_discovered = true, updated_at = now()
  WHERE user_id = v_uid AND kingdom_id = p_kingdom_id AND unlocked = true;
  RETURN jsonb_build_object('success', FOUND);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_start_boss_encounter(p_kingdom_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_be public.boss_encounters%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  SELECT * INTO v_be FROM public.boss_encounters WHERE user_id = v_uid AND kingdom_id = p_kingdom_id FOR UPDATE;
  IF NOT FOUND OR NOT v_be.unlocked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kingdom encounter not unlocked');
  END IF;

  UPDATE public.boss_encounters
  SET
    boss_hp = boss_max_hp,
    player_hp = 220 + v_prof.level * 15,
    player_stamina = 100,
    current_phase = 1,
    turn_count = 1,
    telegraph_active = false,
    battle_active = true,
    victory_pending = false,
    updated_at = now()
  WHERE user_id = v_uid AND kingdom_id = p_kingdom_id
  RETURNING * INTO v_be;

  IF p_kingdom_id = 'kingdom-forest' THEN
    INSERT INTO public.player_quest_progress (user_id, quest_id, period_key, progress, max_progress, completed)
    VALUES (v_uid, 'q-6', 'once', 1, 1, true)
    ON CONFLICT (user_id, quest_id, period_key) DO UPDATE SET progress = 1, completed = true;
  END IF;

  RETURN jsonb_build_object('success', true, 'encounter', to_jsonb(v_be));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_boss_combat_turn(
  p_kingdom_id TEXT,
  p_action TEXT,
  p_ability_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_be public.boss_encounters%ROWTYPE;
  v_w public.player_weapons%ROWTYPE;
  v_action TEXT := lower(COALESCE(p_action, 'attack'));
  v_ab JSONB := NULL;
  v_ab_elem JSONB;
  v_stam_cost INTEGER := 0;
  v_atk_buff INTEGER := 0;
  v_def_buff INTEGER := 0;
  v_crit_buff INTEGER := 0;
  v_hp_ratio NUMERIC;
  v_next_ratio NUMERIC;
  v_cur_phase INTEGER := 1;
  v_new_phase INTEGER := NULL;
  v_phase_mult NUMERIC := 1.0;
  v_base_dmg NUMERIC := 0;
  v_boss_weak_elem TEXT;
  v_boss_weak_mult NUMERIC;
  v_boss_res_elem TEXT;
  v_boss_res_pct NUMERIC;
  v_boss_def_pct NUMERIC;
  v_boss_base_atk NUMERIC;
  v_sig_mult NUMERIC;
  v_ab_element TEXT;
  v_ab_dmg_mult NUMERIC;
  v_ab_crit_bonus NUMERIC;
  v_ab_def_boost NUMERIC;
  v_is_weakness BOOLEAN := false;
  v_is_crit BOOLEAN := false;
  v_crit_chance NUMERIC := 0.15;
  v_player_dmg INTEGER := 0;
  v_boss_dmg INTEGER := 0;
  v_boss_raw_dmg NUMERIC;
  v_next_boss_hp INTEGER;
  v_next_player_hp INTEGER;
  v_next_stamina INTEGER;
  v_next_turn INTEGER;
  v_next_telegraph BOOLEAN := false;
  v_boss_defeated BOOLEAN := false;
  v_player_defeated BOOLEAN := false;
  v_log TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_action NOT IN ('attack', 'ability', 'defend', 'dodge') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid combat action');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  SELECT * INTO v_be FROM public.boss_encounters WHERE user_id = v_uid AND kingdom_id = p_kingdom_id FOR UPDATE;
  IF NOT FOUND OR NOT v_be.unlocked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kingdom encounter not unlocked');
  END IF;
  IF NOT v_be.battle_active OR v_be.boss_hp <= 0 OR v_be.player_hp <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active boss battle. Start or reset the encounter first.');
  END IF;

  SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = v_prof.equipped_weapon_id;
  IF NOT FOUND THEN
    SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND equipped = true LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid ORDER BY base_attack DESC LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No weapon available in armory');
  END IF;

  IF v_action = 'ability' THEN
    IF p_ability_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ability ID required');
    END IF;
    IF jsonb_typeof(v_w.abilities) = 'array' THEN
      FOR v_ab_elem IN SELECT * FROM jsonb_array_elements(v_w.abilities)
      LOOP
        IF (v_ab_elem->>'id') = p_ability_id AND COALESCE((v_ab_elem->>'unlocked')::BOOLEAN, false) THEN
          v_ab := v_ab_elem;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    IF v_ab IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selected ability is not unlocked for equipped weapon');
    END IF;
    v_stam_cost := COALESCE((v_ab->>'staminaCost')::INTEGER, 30);
  ELSIF v_action = 'dodge' THEN
    v_stam_cost := 20;
  ELSIF v_action = 'defend' THEN
    v_stam_cost := 15;
  END IF;

  IF v_be.player_stamina < v_stam_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stamina');
  END IF;

  SELECT COALESCE(MAX(effect_value), 0) INTO v_atk_buff FROM public.player_buffs WHERE user_id = v_uid AND active = true AND effect_type = 'attack' AND uses_remaining > 0;
  SELECT COALESCE(MAX(effect_value), 0) INTO v_def_buff FROM public.player_buffs WHERE user_id = v_uid AND active = true AND effect_type = 'defense' AND uses_remaining > 0;
  SELECT COALESCE(MAX(effect_value), 0) INTO v_crit_buff FROM public.player_buffs WHERE user_id = v_uid AND active = true AND effect_type = 'crit' AND uses_remaining > 0;

  -- Server-authoritative boss parameters
  CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN
      v_boss_base_atk := 22; v_boss_weak_elem := 'Fire'; v_boss_weak_mult := 1.75; v_boss_res_elem := 'Nature'; v_boss_res_pct := 40; v_boss_def_pct := 35; v_sig_mult := 2.2;
    WHEN 'kingdom-mountain' THEN
      v_boss_base_atk := 40; v_boss_weak_elem := 'Water'; v_boss_weak_mult := 1.85; v_boss_res_elem := 'Fire'; v_boss_res_pct := 60; v_boss_def_pct := 40; v_sig_mult := 2.5;
    WHEN 'kingdom-ocean' THEN
      v_boss_base_atk := 62; v_boss_weak_elem := 'Lightning'; v_boss_weak_mult := 1.80; v_boss_res_elem := 'Water'; v_boss_res_pct := 50; v_boss_def_pct := 20; v_sig_mult := 2.4;
    WHEN 'kingdom-desert' THEN
      v_boss_base_atk := 90; v_boss_weak_elem := 'Ice'; v_boss_weak_mult := 1.80; v_boss_res_elem := 'Physical'; v_boss_res_pct := 35; v_boss_def_pct := 25; v_sig_mult := 2.6;
    ELSE
      v_boss_base_atk := 115; v_boss_weak_elem := 'Light'; v_boss_weak_mult := 2.00; v_boss_res_elem := 'Void'; v_boss_res_pct := 70; v_boss_def_pct := 50; v_sig_mult := 2.8;
  END CASE;

  v_hp_ratio := v_be.boss_hp::NUMERIC / GREATEST(1, v_be.boss_max_hp)::NUMERIC;
  IF v_hp_ratio <= 0.33 THEN
    v_cur_phase := 3; v_phase_mult := CASE WHEN p_kingdom_id = 'kingdom-citadel' THEN 1.6 ELSE 1.5 END;
  ELSIF v_hp_ratio <= 0.66 THEN
    v_cur_phase := 2; v_phase_mult := CASE WHEN p_kingdom_id = 'kingdom-citadel' THEN 1.3 ELSE 1.25 END;
  END IF;

  -- Player attack calculation
  IF v_action = 'defend' THEN
    v_player_dmg := GREATEST(8, round(v_w.base_defense * 0.35)::INTEGER);
  ELSIF v_action = 'dodge' THEN
    v_player_dmg := 0;
  ELSE
    v_base_dmg := v_w.base_attack;
    IF v_w.evolution_stage = 'Awakened' THEN v_base_dmg := v_base_dmg * 1.15;
    ELSIF v_w.evolution_stage = 'Ascended' THEN v_base_dmg := v_base_dmg * 1.30;
    ELSIF v_w.evolution_stage = 'Mythic' THEN v_base_dmg := v_base_dmg * 1.50;
    ELSIF v_w.evolution_stage = 'Transcendent' THEN v_base_dmg := v_base_dmg * 1.80;
    END IF;

    IF v_ab IS NOT NULL THEN
      v_ab_dmg_mult := COALESCE((v_ab->>'damageMultiplier')::NUMERIC, 1.0);
      v_ab_element := COALESCE(v_ab->>'element', 'Physical');
      v_ab_crit_bonus := COALESCE((v_ab->>'critBonus')::NUMERIC, 0);
      v_ab_def_boost := COALESCE((v_ab->>'defenseBoost')::NUMERIC, 0);
      v_base_dmg := v_base_dmg * v_ab_dmg_mult;

      IF v_ab_element = v_boss_weak_elem THEN
        v_is_weakness := true;
        v_base_dmg := v_base_dmg * v_boss_weak_mult;
      ELSIF v_ab_element = v_boss_res_elem THEN
        v_base_dmg := v_base_dmg * (1 - v_boss_res_pct / 100.0);
      END IF;
    END IF;

    IF NOT v_is_weakness THEN
      v_base_dmg := v_base_dmg * (1 - v_boss_def_pct / 100.0);
    END IF;

    IF v_atk_buff > 0 THEN
      v_base_dmg := v_base_dmg * (1 + v_atk_buff / 100.0);
    END IF;

    v_crit_chance := 0.15 + (v_crit_buff / 100.0) + COALESCE(v_ab_crit_bonus, 0) / 100.0;
    IF v_w.evolution_stage IN ('Ascended', 'Mythic', 'Transcendent') THEN
      v_crit_chance := v_crit_chance + 0.10;
    END IF;

    v_is_crit := random() < v_crit_chance;
    IF v_is_crit THEN
      v_base_dmg := v_base_dmg * 1.8;
    END IF;

    v_player_dmg := GREATEST(12, round(v_base_dmg + (random() * 14 - 7))::INTEGER);
  END IF;

  -- Boss retaliation calculation
  v_boss_raw_dmg := v_boss_base_atk * v_phase_mult;
  IF v_be.telegraph_active THEN
    v_boss_raw_dmg := v_boss_raw_dmg * v_sig_mult;
  END IF;
  IF v_def_buff > 0 THEN
    v_boss_raw_dmg := v_boss_raw_dmg * (1 - v_def_buff / 100.0);
  END IF;
  IF COALESCE(v_ab_def_boost, 0) > 0 THEN
    v_boss_raw_dmg := v_boss_raw_dmg * GREATEST(0, 1 - v_ab_def_boost / 100.0);
  END IF;

  v_boss_dmg := GREATEST(3, round(v_boss_raw_dmg - v_w.base_defense * 0.4 + (random() * 8 - 4))::INTEGER);
  IF v_action = 'dodge' THEN
    v_boss_dmg := 0;
  ELSIF v_action = 'defend' THEN
    v_boss_dmg := GREATEST(2, round(v_boss_dmg * 0.22)::INTEGER);
  END IF;

  v_next_boss_hp := GREATEST(0, v_be.boss_hp - v_player_dmg);
  v_next_player_hp := GREATEST(0, v_be.player_hp - v_boss_dmg);
  v_boss_defeated := v_next_boss_hp <= 0;
  v_player_defeated := (NOT v_boss_defeated) AND (v_next_player_hp <= 0);

  v_next_stamina := LEAST(100, GREATEST(0, (v_be.player_stamina - v_stam_cost) + CASE WHEN v_action = 'attack' THEN 25 ELSE 15 END));
  v_next_turn := v_be.turn_count + 1;

  v_next_ratio := v_next_boss_hp::NUMERIC / GREATEST(1, v_be.boss_max_hp)::NUMERIC;
  IF v_hp_ratio > 0.66 AND v_next_ratio <= 0.66 AND NOT v_boss_defeated THEN
    v_new_phase := 2;
    v_cur_phase := 2;
  ELSIF v_hp_ratio > 0.33 AND v_next_ratio <= 0.33 AND NOT v_boss_defeated THEN
    v_new_phase := 3;
    v_cur_phase := 3;
  END IF;

  IF NOT v_be.telegraph_active AND NOT v_boss_defeated AND NOT v_player_defeated THEN
    IF (v_next_turn % 3 = 0) OR (v_cur_phase = 3 AND v_next_turn % 2 = 0) THEN
      v_next_telegraph := true;
    END IF;
  END IF;

  UPDATE public.boss_encounters
  SET
    boss_hp = v_next_boss_hp,
    player_hp = v_next_player_hp,
    player_stamina = v_next_stamina,
    current_phase = v_cur_phase,
    turn_count = v_next_turn,
    telegraph_active = v_next_telegraph,
    weakness_discovered = weakness_discovered OR v_is_weakness,
    battle_active = (NOT v_boss_defeated AND NOT v_player_defeated),
    victory_pending = v_boss_defeated,
    updated_at = now()
  WHERE user_id = v_uid AND kingdom_id = p_kingdom_id
  RETURNING * INTO v_be;

  v_log := CASE
    WHEN v_boss_defeated THEN 'VICTORY! ' || v_w.name || ' struck for ' || v_player_dmg || ' damage, cleansing the Void corruption!'
    WHEN v_action = 'dodge' THEN 'Evasive Dodge! You rolled clear of the boss''s blow (0 damage taken).'
    WHEN v_action = 'defend' THEN 'Perfect Guard! You braced and absorbed the strike for ' || v_boss_dmg || ' damage.'
    ELSE
      COALESCE(CASE WHEN v_ab IS NOT NULL THEN '[' || (v_ab->>'name') || '] ' ELSE '' END, '') ||
      CASE WHEN v_is_weakness THEN '[WEAKNESS EXPLOITED!] ' ELSE '' END ||
      'Struck with ' || v_w.name || ' for ' || v_player_dmg || ' damage' ||
      CASE WHEN v_is_crit THEN ' (CRITICAL HIT!)' ELSE '' END ||
      '. Boss retaliated for ' || v_boss_dmg || ' damage.'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'playerDamage', v_player_dmg,
    'bossDamage', v_boss_dmg,
    'isCrit', v_is_crit,
    'isWeaknessHit', v_is_weakness,
    'isDefended', v_action = 'defend',
    'isDodged', v_action = 'dodge',
    'bossDefeated', v_boss_defeated,
    'playerDefeated', v_player_defeated,
    'newPhase', v_new_phase,
    'combatLog', v_log,
    'encounter', to_jsonb(v_be)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_complete_boss_victory(
  p_kingdom_id TEXT,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_be public.boss_encounters%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
  v_xp INTEGER := 0;
  v_forge INTEGER := 0;
  v_gold INTEGER := 0;
  v_aether INTEGER := 60;
  v_next_kingdom TEXT;
  v_today_key TEXT;
  v_is_first_clear BOOLEAN := false;
  v_repeat_cooldown BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.economy_transactions
    WHERE user_id = v_uid AND source_type = 'boss_victory' AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'profile', to_jsonb(v_prof));
  END IF;

  SELECT * INTO v_be FROM public.boss_encounters WHERE user_id = v_uid AND kingdom_id = p_kingdom_id FOR UPDATE;
  IF NOT FOUND OR NOT v_be.unlocked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kingdom encounter not unlocked');
  END IF;
  IF NOT v_be.victory_pending OR v_be.boss_hp > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Boss has not been defeated in an active server encounter');
  END IF;

  v_xp := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 180
    WHEN 'kingdom-mountain' THEN 300
    WHEN 'kingdom-ocean' THEN 450
    WHEN 'kingdom-desert' THEN 650
    ELSE 1200
  END;
  v_forge := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 160
    WHEN 'kingdom-mountain' THEN 280
    WHEN 'kingdom-ocean' THEN 420
    WHEN 'kingdom-desert' THEN 600
    ELSE 1000
  END;
  v_gold := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 120
    WHEN 'kingdom-mountain' THEN 200
    WHEN 'kingdom-ocean' THEN 300
    WHEN 'kingdom-desert' THEN 450
    ELSE 800
  END;

  v_today_key := public.resolve_period_key('daily', v_prof.timezone);
  v_is_first_clear := NOT v_be.first_clear_claimed;

  IF NOT v_is_first_clear THEN
    -- Repeat clear bounty capped to once per daily period per kingdom
    IF v_be.last_repeat_reward_period_key = v_today_key THEN
      v_repeat_cooldown := true;
      v_xp := 0;
      v_forge := 0;
      v_gold := 0;
      v_aether := 0;
    ELSE
      v_xp := round(v_xp * 0.4)::INTEGER;
      v_forge := round(v_forge * 0.4)::INTEGER;
      v_gold := round(v_gold * 0.4)::INTEGER;
      v_aether := 20;
    END IF;
  END IF;

  UPDATE public.boss_encounters
  SET
    cleared = true,
    boss_hp = 0,
    battle_active = false,
    victory_pending = false,
    first_clear_claimed = true,
    last_repeat_reward_period_key = CASE WHEN NOT v_repeat_cooldown THEN v_today_key ELSE last_repeat_reward_period_key END,
    last_victory_at = now(),
    times_defeated = times_defeated + 1,
    updated_at = now()
  WHERE user_id = v_uid AND kingdom_id = p_kingdom_id;

  v_next_kingdom := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 'kingdom-mountain'
    WHEN 'kingdom-mountain' THEN 'kingdom-ocean'
    WHEN 'kingdom-ocean' THEN 'kingdom-desert'
    WHEN 'kingdom-desert' THEN 'kingdom-citadel'
    ELSE NULL
  END;

  IF v_is_first_clear AND v_next_kingdom IS NOT NULL THEN
    UPDATE public.boss_encounters SET unlocked = true, updated_at = now()
    WHERE user_id = v_uid AND kingdom_id = v_next_kingdom;
  END IF;

  IF NOT v_repeat_cooldown THEN
    v_prof := public._credit_currencies(v_uid, v_xp, v_forge, v_gold, v_aether, 'boss_victory', p_kingdom_id, 'Boss Defeated: ' || v_be.boss_id, p_idempotency_key);
  END IF;

  UPDATE public.profiles SET total_bosses_defeated = total_bosses_defeated + 1 WHERE id = v_uid RETURNING * INTO v_prof;

  INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
  VALUES (v_uid, 'ach-4', 1, 1, true)
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = 1, unlocked = true;

  IF v_is_first_clear AND v_next_kingdom IS NOT NULL THEN
    INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
    VALUES (v_uid, 'ach-6', 2, 5, false)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = LEAST(5, public.player_achievements.progress + 1),
      unlocked = LEAST(5, public.player_achievements.progress + 1) >= 5;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'firstClear', v_is_first_clear,
    'repeatRewardOnCooldown', v_repeat_cooldown,
    'xpAwarded', v_xp,
    'forgeXpAwarded', v_forge,
    'goldAwarded', v_gold,
    'nextKingdom', v_next_kingdom,
    'profile', to_jsonb(v_prof)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_reset_boss_encounter(p_kingdom_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;

  UPDATE public.boss_encounters
  SET
    boss_hp = boss_max_hp,
    player_hp = 220 + v_prof.level * 15,
    player_stamina = 100,
    current_phase = 1,
    turn_count = 1,
    telegraph_active = false,
    battle_active = false,
    victory_pending = false,
    updated_at = now()
  WHERE user_id = v_uid AND kingdom_id = p_kingdom_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8I. Guilds, Directory, Contributions & Authorized Management RPCs
CREATE OR REPLACE FUNCTION public.rpc_list_guilds()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  tag TEXT,
  emblem TEXT,
  level INTEGER,
  max_members INTEGER,
  description TEXT,
  weekly_quest_name TEXT,
  weekly_quest_progress INTEGER,
  weekly_quest_max INTEGER,
  members_count BIGINT,
  is_member BOOLEAN,
  my_role TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.tag,
    g.emblem,
    g.level,
    g.max_members,
    g.description,
    g.weekly_quest_name,
    g.weekly_quest_progress,
    g.weekly_quest_max,
    COUNT(gm.user_id)::BIGINT AS members_count,
    BOOL_OR(gm.user_id = v_uid) AS is_member,
    MAX(CASE WHEN gm.user_id = v_uid THEN gm.role ELSE NULL END) AS my_role
  FROM public.guilds g
  LEFT JOIN public.guild_members gm ON gm.guild_id = g.id
  GROUP BY g.id
  ORDER BY g.level DESC, g.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_create_guild(
  p_name TEXT,
  p_tag TEXT,
  p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_guild public.guilds%ROWTYPE;
  v_clean_tag TEXT := upper(left(regexp_replace(COALESCE(p_tag, ''), '[^A-Za-z0-9]', '', 'g'), 4));
  v_weekly_period TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(p_name)) < 3 OR char_length(v_clean_tag) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild name (min 3 chars) and tag (2-4 chars) are required.');
  END IF;

  INSERT INTO public.guilds (id, name, tag, description, owner_id)
  VALUES ('guild-' || substr(gen_random_uuid()::text, 1, 8), left(trim(p_name), 60), v_clean_tag, left(trim(COALESCE(p_description, '')), 300), v_uid)
  RETURNING * INTO v_guild;

  PERFORM public._transfer_guild_ownership_on_leave(v_uid);
  INSERT INTO public.guild_members (guild_id, user_id, role) VALUES (v_guild.id, v_uid, 'leader');

  v_weekly_period := public.resolve_period_key('weekly', 'UTC');
  INSERT INTO public.guild_challenges (guild_id, title, period_key, target_value, current_value)
  VALUES (v_guild.id, v_guild.weekly_quest_name, v_weekly_period, v_guild.weekly_quest_max, 0)
  ON CONFLICT (guild_id, period_key) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'guild', to_jsonb(v_guild));
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Guild tag [' || v_clean_tag || '] is already taken.');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_join_guild(p_guild_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_guild public.guilds%ROWTYPE;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Guild not found'); END IF;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', true, 'alreadyMember', true, 'guildId', p_guild_id);
  END IF;

  SELECT count(*) INTO v_count FROM public.guild_members WHERE guild_id = p_guild_id;
  IF v_count >= v_guild.max_members THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild is already at full capacity');
  END IF;

  PERFORM public._transfer_guild_ownership_on_leave(v_uid);
  INSERT INTO public.guild_members (guild_id, user_id, role) VALUES (p_guild_id, v_uid, 'member');

  RETURN jsonb_build_object('success', true, 'guildId', p_guild_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_leave_guild()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM public._transfer_guild_ownership_on_leave(v_uid);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_guild_details(
  p_guild_id TEXT,
  p_description TEXT DEFAULT NULL,
  p_weekly_quest_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actor_role TEXT;
  v_guild public.guilds%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT role INTO v_actor_role
  FROM public.guild_members
  WHERE guild_id = p_guild_id AND user_id = v_uid;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('leader', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only guild leaders or officers can update guild settings.');
  END IF;

  UPDATE public.guilds
  SET
    description = COALESCE(left(trim(p_description), 300), description),
    weekly_quest_name = COALESCE(NULLIF(left(trim(p_weekly_quest_name), 120), ''), weekly_quest_name),
    updated_at = now()
  WHERE id = p_guild_id
  RETURNING * INTO v_guild;

  RETURN jsonb_build_object('success', true, 'guild', to_jsonb(v_guild));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_manage_guild_member(
  p_guild_id TEXT,
  p_target_user_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actor_role TEXT;
  v_target_role TEXT;
  v_action TEXT := lower(COALESCE(p_action, ''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target member cannot be yourself');
  END IF;
  IF v_action NOT IN ('promote', 'demote', 'kick', 'transfer_leader') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported guild management action');
  END IF;

  SELECT role INTO v_actor_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid FOR UPDATE;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('leader', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only guild leaders or officers can manage members');
  END IF;

  SELECT role INTO v_target_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_target_user_id FOR UPDATE;
  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found in this guild');
  END IF;
  IF v_target_role = 'leader' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify the guild leader');
  END IF;

  IF v_action IN ('promote', 'demote', 'transfer_leader') AND v_actor_role <> 'leader' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the guild leader can change roles or transfer leadership');
  END IF;

  IF v_action = 'kick' AND v_actor_role = 'officer' AND v_target_role <> 'member' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Officers can only remove regular members');
  END IF;

  IF v_action = 'promote' THEN
    UPDATE public.guild_members SET role = 'officer' WHERE guild_id = p_guild_id AND user_id = p_target_user_id;
  ELSIF v_action = 'demote' THEN
    UPDATE public.guild_members SET role = 'member' WHERE guild_id = p_guild_id AND user_id = p_target_user_id;
  ELSIF v_action = 'kick' THEN
    DELETE FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_target_user_id;
  ELSIF v_action = 'transfer_leader' THEN
    UPDATE public.guild_members SET role = 'officer' WHERE guild_id = p_guild_id AND user_id = v_uid;
    UPDATE public.guild_members SET role = 'leader' WHERE guild_id = p_guild_id AND user_id = p_target_user_id;
    UPDATE public.guilds SET owner_id = p_target_user_id, updated_at = now() WHERE id = p_guild_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'action', v_action);
END;
$$;

-- 8J. Friendships, Social Directory & Notifications RPCs
CREATE OR REPLACE FUNCTION public.rpc_send_friend_request(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_me public.profiles%ROWTYPE;
  v_req public.friendships%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot add yourself as a friend');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target champion not found');
  END IF;

  SELECT * INTO v_me FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (v_uid, p_target_user_id, 'pending')
  RETURNING * INTO v_req;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    p_target_user_id,
    'friend_request',
    'New Companion Request',
    v_me.username || ' (Lv.' || v_me.level || ' ' || v_me.character_class || ') sent you a friend request!',
    jsonb_build_object('friendshipId', v_req.id, 'requesterId', v_uid, 'requesterName', v_me.username)
  );

  RETURN jsonb_build_object('success', true, 'friendship', to_jsonb(v_req));
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Friend request or friendship already exists');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_respond_friend_request(p_friendship_id UUID, p_accept BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_f public.friendships%ROWTYPE;
  v_me public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_f FROM public.friendships WHERE id = p_friendship_id FOR UPDATE;
  IF NOT FOUND OR v_f.addressee_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Friend request not found');
  END IF;

  IF p_accept THEN
    UPDATE public.friendships SET status = 'accepted', updated_at = now() WHERE id = p_friendship_id RETURNING * INTO v_f;
    SELECT * INTO v_me FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (v_f.requester_id, 'friend_accepted', 'Friend Request Accepted', v_me.username || ' accepted your friend request!', jsonb_build_object('friendId', v_uid));
    RETURN jsonb_build_object('success', true, 'status', 'accepted');
  ELSE
    DELETE FROM public.friendships WHERE id = p_friendship_id;
    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_remove_friend(p_friendship_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  DELETE FROM public.friendships WHERE id = p_friendship_id AND (requester_id = v_uid OR addressee_id = v_uid);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_send_chat_message(
  p_channel TEXT,
  p_body TEXT,
  p_guild_id TEXT DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_msg public.chat_messages%ROWTYPE;
  v_resolved_guild_id TEXT := p_guild_id;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_channel NOT IN ('general', 'guild', 'whisper') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid chat channel');
  END IF;
  IF char_length(trim(COALESCE(p_body, ''))) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;

  IF p_channel = 'guild' THEN
    IF v_resolved_guild_id IS NULL THEN
      SELECT guild_id INTO v_resolved_guild_id FROM public.guild_members WHERE user_id = v_uid LIMIT 1;
    END IF;
    IF v_resolved_guild_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.guild_members WHERE guild_id = v_resolved_guild_id AND user_id = v_uid
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Join a guild first to post in Guild Chat.');
    END IF;
  ELSIF p_channel = 'whisper' THEN
    IF p_recipient_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Select a valid recipient for Whisper messages.');
    END IF;
  END IF;

  INSERT INTO public.chat_messages (channel, guild_id, sender_id, recipient_id, body)
  VALUES (p_channel, CASE WHEN p_channel = 'guild' THEN v_resolved_guild_id ELSE NULL END, v_uid, CASE WHEN p_channel = 'whisper' THEN p_recipient_id ELSE NULL END, left(trim(p_body), 1000))
  RETURNING * INTO v_msg;

  RETURN jsonb_build_object('success', true, 'message', to_jsonb(v_msg));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_report_chat_message(p_message_id UUID, p_reason TEXT DEFAULT 'Inappropriate behavior')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.chat_reports (message_id, reporter_id, reason)
  VALUES (p_message_id, v_uid, left(COALESCE(NULLIF(trim(p_reason), ''), 'Inappropriate behavior'), 300))
  ON CONFLICT (message_id, reporter_id) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_mark_notifications_read(p_notification_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = v_uid
    AND read_at IS NULL
    AND (p_notification_id IS NULL OR id = p_notification_id);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_leaderboard(
  p_scope TEXT DEFAULT 'global',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  streak INTEGER,
  score BIGINT,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_scope TEXT := lower(COALESCE(p_scope, 'global'));
  v_my_guild_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT guild_id INTO v_my_guild_id FROM public.guild_members WHERE guild_members.user_id = v_uid LIMIT 1;

  RETURN QUERY
  WITH friend_ids AS (
    SELECT v_uid AS fid
    UNION
    SELECT CASE WHEN f.requester_id = v_uid THEN f.addressee_id ELSE f.requester_id END AS fid
    FROM public.friendships f
    WHERE f.status = 'accepted' AND (f.requester_id = v_uid OR f.addressee_id = v_uid)
  ),
  window_xp AS (
    SELECT
      et.user_id,
      COALESCE(SUM(et.delta), 0)::BIGINT AS earned_xp
    FROM public.economy_transactions et
    WHERE et.currency = 'PLAYER_XP'
      AND et.delta > 0
      AND (
        (v_scope = 'weekly' AND et.created_at >= date_trunc('week', now() AT TIME ZONE 'UTC'))
        OR (v_scope = 'monthly' AND et.created_at >= date_trunc('month', now() AT TIME ZONE 'UTC'))
      )
    GROUP BY et.user_id
  ),
  filtered AS (
    SELECT
      p.id,
      p.username,
      p.avatar_url,
      p.character_class,
      p.level,
      p.aether_rank,
      p.current_streak,
      CASE
        WHEN v_scope IN ('weekly', 'monthly') THEN COALESCE(wx.earned_xp, 0)
        ELSE (p.total_xp + p.current_streak * 25)::BIGINT
      END AS computed_score
    FROM public.profiles p
    LEFT JOIN window_xp wx ON wx.user_id = p.id
    WHERE (p.leaderboard_visible = true OR p.id = v_uid)
      AND (
        v_scope IN ('global', 'weekly', 'monthly')
        OR (v_scope = 'friends' AND EXISTS (SELECT 1 FROM friend_ids fi WHERE fi.fid = p.id))
        OR (v_scope = 'guild' AND v_my_guild_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = v_my_guild_id AND gm.user_id = p.id
        ))
      )
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY f.computed_score DESC, f.level DESC, f.current_streak DESC, f.username ASC) AS rank,
    f.id AS user_id,
    f.username,
    f.avatar_url,
    f.character_class,
    f.level,
    f.aether_rank,
    f.current_streak AS streak,
    f.computed_score AS score,
    (f.id = v_uid) AS is_current_user
  FROM filtered f
  ORDER BY rank ASC
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_limit, 50)))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_search_champions(p_query TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  current_streak INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.avatar_url, p.character_class, p.level, p.aether_rank, p.current_streak
  FROM public.profiles p
  WHERE p.id <> v_uid
    AND p.leaderboard_visible = true
    AND (v_q = '%%' OR lower(p.username) LIKE v_q)
  ORDER BY p.level DESC, p.total_xp DESC
  LIMIT 25;
END;
$$;

-- Safe summary resolver for friends / guildmates / chat senders (never returns private stats)
CREATE OR REPLACE FUNCTION public.rpc_get_champion_profiles(p_user_ids UUID[])
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  current_streak INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.avatar_url, p.character_class, p.level, p.aether_rank, p.current_streak
  FROM public.profiles p
  WHERE p.id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    AND (
      p.id = v_uid
      OR p.leaderboard_visible = true
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.requester_id = v_uid AND f.addressee_id = p.id)
           OR (f.addressee_id = v_uid AND f.requester_id = p.id)
      )
      OR EXISTS (
        SELECT 1 FROM public.guild_members gm1
        JOIN public.guild_members gm2 ON gm1.guild_id = gm2.guild_id
        WHERE gm1.user_id = v_uid AND gm2.user_id = p.id
      )
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. LOCK DOWN FUNCTION EXECUTE PERMISSIONS (LEAST PRIVILEGE)
-- ------------------------------------------------------------------------------

-- Internal functions & triggers: strictly revoked from PUBLIC, anon, authenticated
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profiles_progression_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_public_champion_directory() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._credit_currencies(UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._grant_weapon_mastery(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._transfer_guild_ownership_on_leave(UUID) FROM PUBLIC, anon, authenticated;

-- Pure utility & RLS predicate helpers: authenticated only
REVOKE ALL ON FUNCTION public.resolve_period_key(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_period_key(TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.compute_aether_rank(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_aether_rank(INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.is_member_of_guild(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member_of_guild(TEXT) TO authenticated;

-- User-facing RPCs: strictly revoked from PUBLIC & anon, granted ONLY to authenticated
REVOKE ALL ON FUNCTION public.rpc_bootstrap_player_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_bootstrap_player_state() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_update_profile_preferences(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_profile_preferences(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_save_client_preferences(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_client_preferences(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_claim_habit_reward(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_habit_reward(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_create_habit(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_habit(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_archive_habit(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_archive_habit(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_log_workout(TEXT, TEXT, INTEGER, INTEGER, NUMERIC, BOOLEAN, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_log_workout(TEXT, TEXT, INTEGER, INTEGER, NUMERIC, BOOLEAN, TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_log_nutrition(TEXT, TEXT, TEXT[], TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_log_nutrition(TEXT, TEXT, TEXT[], TEXT, TEXT, UUID, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_log_water_glass() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_log_water_glass() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_reset_water_daily() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_reset_water_daily() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_claim_quest(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_quest(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_claim_achievement(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_achievement(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_purchase_shop_item(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_purchase_shop_item(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_equip_weapon(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_equip_weapon(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_upgrade_weapon(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_upgrade_weapon(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_train_weapon_mastery(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_train_weapon_mastery(TEXT, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_evolve_weapon(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_evolve_weapon(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_toggle_buff(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_buff(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_discover_boss_weakness(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_discover_boss_weakness(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_start_boss_encounter(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_start_boss_encounter(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_boss_combat_turn(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_boss_combat_turn(TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_complete_boss_victory(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_complete_boss_victory(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_reset_boss_encounter(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_reset_boss_encounter(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_list_guilds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_list_guilds() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_create_guild(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_guild(TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_join_guild(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_join_guild(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_leave_guild() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_leave_guild() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_update_guild_details(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_guild_details(TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_manage_guild_member(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_manage_guild_member(TEXT, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_send_friend_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_send_friend_request(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_respond_friend_request(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_respond_friend_request(UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_remove_friend(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_remove_friend(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_send_chat_message(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_send_chat_message(TEXT, TEXT, TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_report_chat_message(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_report_chat_message(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_mark_notifications_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_mark_notifications_read(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_leaderboard(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_leaderboard(TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_search_champions(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_search_champions(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_champion_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_champion_profiles(UUID[]) TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. REALTIME PUBLICATION SETUP (WEB + MOBILE LIVE SYNC)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'profiles',
    'habits',
    'player_weapons',
    'player_buffs',
    'player_quest_progress',
    'player_achievements',
    'player_purchases',
    'boss_encounters',
    'guilds',
    'guild_members',
    'guild_challenges',
    'guild_challenge_contributions',
    'friendships',
    'chat_messages',
    'notifications',
    'economy_transactions'
  ];
  v_tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_tbl IN ARRAY v_tables
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
