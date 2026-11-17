-- ==============================================================================
-- LIFEQUEST AAA POLISH 2.0 — ADDITIVE MIGRATION
-- Phase 1: Advanced Player Identity (Titles, Rare Badges, Reputation)
-- Phase 2: Intelligent Notification System & Preferences
-- Phase 3: Seasonal Progression System & Permanent Season History
-- Phase 4: Advanced Leaderboards & Period Snapshots
-- Strictly additive; preserves all existing tables, rows, XP, and records.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PHASE 1: ADVANCED PLAYER IDENTITY
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_identity_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipped_title_id TEXT DEFAULT NULL,
  featured_badge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reputation_score INTEGER NOT NULL DEFAULT 0 CHECK (reputation_score >= 0),
  reputation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_unlocked_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL,
  source_ref TEXT NOT NULL DEFAULT 'verified_progression',
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_id)
);

CREATE TABLE IF NOT EXISTS public.player_unlocked_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  source_ref TEXT NOT NULL DEFAULT 'verified_progression',
  global_claim_order INTEGER DEFAULT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.global_rare_badge_claims (
  badge_id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_username TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reputation_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  source_category TEXT NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

-- ------------------------------------------------------------------------------
-- PHASE 2: INTELLIGENT NOTIFICATIONS
-- ------------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'player_progression',
  ADD COLUMN IF NOT EXISTS preference_key TEXT NOT NULL DEFAULT 'achievement',
  ADD COLUMN IF NOT EXISTS event_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_tab TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_sub_tab TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event_key_unique
  ON public.notifications(user_id, event_key)
  WHERE event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.player_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  master_enabled BOOLEAN NOT NULL DEFAULT true,
  fitness BOOLEAN NOT NULL DEFAULT true,
  social BOOLEAN NOT NULL DEFAULT true,
  achievement BOOLEAN NOT NULL DEFAULT true,
  boss BOOLEAN NOT NULL DEFAULT true,
  community BOOLEAN NOT NULL DEFAULT true,
  seasonal BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- PHASE 3: SEASONAL PROGRESSION SYSTEM
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seasons_catalog (
  id TEXT PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  accent_hex TEXT NOT NULL DEFAULT '#C5A15A',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'archived')),
  challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_season_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id TEXT NOT NULL REFERENCES public.seasons_catalog(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Champion',
  character_class TEXT NOT NULL DEFAULT 'Warrior',
  season_xp INTEGER NOT NULL DEFAULT 0 CHECK (season_xp >= 0),
  current_tier INTEGER NOT NULL DEFAULT 1,
  challenge_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.player_season_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id TEXT NOT NULL REFERENCES public.seasons_catalog(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_key TEXT NOT NULL,
  season_xp_awarded INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id, claim_key)
);

CREATE TABLE IF NOT EXISTS public.season_history_archives (
  season_id TEXT PRIMARY KEY REFERENCES public.seasons_catalog(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_participants INTEGER NOT NULL DEFAULT 0,
  top_players JSONB NOT NULL DEFAULT '[]'::jsonb,
  participant_summaries JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ------------------------------------------------------------------------------
-- PHASE 4: ADVANCED LEADERBOARD PERIOD SNAPSHOTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leaderboard_period_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  period_key TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rankings JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (scope, period_key)
);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------

ALTER TABLE public.player_identity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_unlocked_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_unlocked_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_rare_badge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_season_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_season_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_history_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_period_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own identity profile" ON public.player_identity_profiles;
CREATE POLICY "Users read own identity profile"
  ON public.player_identity_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own unlocked titles" ON public.player_unlocked_titles;
CREATE POLICY "Users read own unlocked titles"
  ON public.player_unlocked_titles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own unlocked badges" ON public.player_unlocked_badges;
CREATE POLICY "Users read own unlocked badges"
  ON public.player_unlocked_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read global badge claims" ON public.global_rare_badge_claims;
CREATE POLICY "Authenticated read global badge claims"
  ON public.global_rare_badge_claims FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own reputation ledger" ON public.reputation_ledger;
CREATE POLICY "Users read own reputation ledger"
  ON public.reputation_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own notification preferences" ON public.player_notification_preferences;
CREATE POLICY "Users read own notification preferences"
  ON public.player_notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read seasons" ON public.seasons_catalog;
CREATE POLICY "Authenticated read seasons"
  ON public.seasons_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read season progress" ON public.player_season_progress;
CREATE POLICY "Authenticated read season progress"
  ON public.player_season_progress FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own season claims" ON public.player_season_claims;
CREATE POLICY "Users read own season claims"
  ON public.player_season_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read season archives" ON public.season_history_archives;
CREATE POLICY "Authenticated read season archives"
  ON public.season_history_archives FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read leaderboard snapshots" ON public.leaderboard_period_snapshots;
CREATE POLICY "Authenticated read leaderboard snapshots"
  ON public.leaderboard_period_snapshots FOR SELECT TO authenticated USING (true);

COMMIT;
