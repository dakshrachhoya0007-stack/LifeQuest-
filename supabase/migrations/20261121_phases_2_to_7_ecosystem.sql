-- ==============================================================================
-- LIFEQUEST AAA UPGRADE — PHASES 2 TO 7 FULL ECOSYSTEM
-- Phase 2: Weekly Boss Battles
-- Phase 3: Friend Rival System
-- Phase 4: AI Fitness Mentor
-- Phase 5: Community Events
-- Phase 6: Personal Records Museum
-- Phase 7: Integrated Verified Activity Dispatch
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PHASE 2: WEEKLY BOSS BATTLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weekly_boss_events (
  id TEXT PRIMARY KEY,
  week_key TEXT NOT NULL,
  boss_name TEXT NOT NULL,
  boss_title TEXT NOT NULL,
  boss_description TEXT NOT NULL,
  artwork_key TEXT NOT NULL DEFAULT 'weekly_boss_titan',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Heroic', 'Mythic', 'Cataclysmic')),
  total_health INTEGER NOT NULL CHECK (total_health > 0),
  current_health INTEGER NOT NULL CHECK (current_health >= 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'defeated', 'expired', 'resolved')),
  missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  defeated_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_boss_events_status_window
  ON public.weekly_boss_events(status, starts_at DESC, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.weekly_boss_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.weekly_boss_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Champion',
  idempotency_key TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  action_label TEXT NOT NULL,
  damage_dealt INTEGER NOT NULL CHECK (damage_dealt >= 0),
  safety_capped BOOLEAN NOT NULL DEFAULT false,
  daily_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_weekly_boss_contrib_event_user
  ON public.weekly_boss_contributions(event_id, user_id, daily_bucket);

CREATE INDEX IF NOT EXISTS idx_weekly_boss_contrib_event_created
  ON public.weekly_boss_contributions(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.weekly_boss_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.weekly_boss_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_key TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  forge_xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (forge_xp_awarded >= 0),
  gold_awarded INTEGER NOT NULL DEFAULT 0 CHECK (gold_awarded >= 0),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, claim_key)
);

-- ------------------------------------------------------------------------------
-- PHASE 3: FRIEND RIVAL SYSTEM
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_rivalries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (
    challenge_type IN (
      'weekly_activity_score',
      'workout_consistency',
      'strength_milestones',
      'endurance_achievements',
      'habit_completion'
    )
  ),
  challenge_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled', 'expired')),
  challenger_score INTEGER NOT NULL DEFAULT 0 CHECK (challenger_score >= 0),
  opponent_score INTEGER NOT NULL DEFAULT 0 CHECK (opponent_score >= 0),
  winner_id UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_tie BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (challenger_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_player_rivalries_participants
  ON public.player_rivalries(challenger_id, opponent_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_rivalry_pair_type
  ON public.player_rivalries(
    LEAST(challenger_id::text, opponent_id::text),
    GREATEST(challenger_id::text, opponent_id::text),
    challenge_type
  )
  WHERE status IN ('pending', 'active');

CREATE TABLE IF NOT EXISTS public.rival_score_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rivalry_id UUID NOT NULL REFERENCES public.player_rivalries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  safety_capped BOOLEAN NOT NULL DEFAULT false,
  daily_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rivalry_id, user_id, idempotency_key)
);

-- ------------------------------------------------------------------------------
-- PHASE 4: AI FITNESS MENTOR
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'mentor')),
  content TEXT NOT NULL,
  focus_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_advice TEXT DEFAULT NULL,
  safety_notice TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_mentor_messages_user_created
  ON public.ai_mentor_messages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_mentor_recommended_quests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 60),
  objective_label TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  max_progress INTEGER NOT NULL CHECK (max_progress BETWEEN 1 AND 60),
  unit_label TEXT NOT NULL,
  player_xp_reward INTEGER NOT NULL CHECK (player_xp_reward BETWEEN 10 AND 80),
  forge_xp_reward INTEGER NOT NULL CHECK (forge_xp_reward BETWEEN 5 AND 60),
  gold_reward INTEGER NOT NULL CHECK (gold_reward BETWEEN 5 AND 70),
  rationale TEXT NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_mentor_quests_user
  ON public.ai_mentor_recommended_quests(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- PHASE 5: COMMUNITY EVENTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  theme_color TEXT NOT NULL DEFAULT '#C5A15A',
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  target_goal_points INTEGER NOT NULL CHECK (target_goal_points > 0),
  current_goal_points INTEGER NOT NULL DEFAULT 0 CHECK (current_goal_points >= 0),
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_event_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Champion',
  idempotency_key TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  daily_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.community_event_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  gold_awarded INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, milestone_id)
);

-- ------------------------------------------------------------------------------
-- PHASE 6: PERSONAL RECORDS MUSEUM (APPEND-ONLY HISTORICAL INTEGRITY)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.personal_records_museum (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'fitness',
      'strength',
      'endurance',
      'consistency',
      'personal_best',
      'boss_battle',
      'rivalry',
      'community_event',
      'seasonal',
      'rare_legendary'
    )
  ),
  metric_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  numeric_value NUMERIC NOT NULL DEFAULT 0,
  display_value TEXT NOT NULL,
  is_personal_best BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_activity_ref TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Rare', 'Epic', 'Legendary', 'Mythic')),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_museum_user_cat_time
  ON public.personal_records_museum(user_id, category, achieved_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_museum_single_pb_per_metric
  ON public.personal_records_museum(user_id, metric_key)
  WHERE is_personal_best = true;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------

ALTER TABLE public.weekly_boss_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_boss_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_boss_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_rivalries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rival_score_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_mentor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_mentor_recommended_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records_museum ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read weekly boss events" ON public.weekly_boss_events;
CREATE POLICY "Public read weekly boss events"
  ON public.weekly_boss_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read weekly boss contributions" ON public.weekly_boss_contributions;
CREATE POLICY "Authenticated read weekly boss contributions"
  ON public.weekly_boss_contributions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own weekly boss claims" ON public.weekly_boss_claims;
CREATE POLICY "Users read own weekly boss claims"
  ON public.weekly_boss_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own rivalries" ON public.player_rivalries;
CREATE POLICY "Users read own rivalries"
  ON public.player_rivalries FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Users read own rival scores" ON public.rival_score_ledger;
CREATE POLICY "Users read own rival scores"
  ON public.rival_score_ledger FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.player_rivalries r
      WHERE r.id = rivalry_id AND (r.challenger_id = auth.uid() OR r.opponent_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users read own mentor messages" ON public.ai_mentor_messages;
CREATE POLICY "Users read own mentor messages"
  ON public.ai_mentor_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own mentor quests" ON public.ai_mentor_recommended_quests;
CREATE POLICY "Users read own mentor quests"
  ON public.ai_mentor_recommended_quests FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read community events" ON public.community_events;
CREATE POLICY "Authenticated read community events"
  ON public.community_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read community contributions" ON public.community_event_contributions;
CREATE POLICY "Authenticated read community contributions"
  ON public.community_event_contributions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own community claims" ON public.community_event_claims;
CREATE POLICY "Users read own community claims"
  ON public.community_event_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own museum records" ON public.personal_records_museum;
CREATE POLICY "Users read own museum records"
  ON public.personal_records_museum FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMIT;
