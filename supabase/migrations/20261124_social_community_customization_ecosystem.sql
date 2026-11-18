-- ==============================================================================
-- LIFEQUEST — SOCIAL, MULTIPLAYER, 2D CUSTOMIZATION & COMMUNITY ECOSYSTEM
-- Strictly additive migration preserving all existing player data, XP,
-- achievements, records, guilds, and security rules.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADVENTURER'S ACTIVITY FEED
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.activity_feed_posts (
  id TEXT PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_username TEXT NOT NULL,
  author_class TEXT NOT NULL DEFAULT 'Warrior',
  author_level INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL CHECK (category IN ('workout', 'record', 'achievement', 'competition', 'milestone', 'level_up')),
  event_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlight_value TEXT DEFAULT NULL,
  privacy_scope TEXT NOT NULL DEFAULT 'everyone' CHECK (privacy_scope IN ('everyone', 'friends', 'nobody')),
  comment_permission TEXT NOT NULL DEFAULT 'everyone' CHECK (comment_permission IN ('everyone', 'friends', 'nobody')),
  verified BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_feed_author_event_key
  ON public.activity_feed_posts(author_id, event_key);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created
  ON public.activity_feed_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES public.activity_feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('like', '🔥', '⚔️', '🏆', '💪')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.activity_feed_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.activity_feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_username TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. WORKOUT PARTIES (REAL-TIME MULTIPLAYER)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workout_parties (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_name TEXT NOT NULL,
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  target_unit TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('friends', 'private', 'public')),
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'countdown', 'active', 'completed', 'expired')),
  countdown_starts_at TIMESTAMPTZ DEFAULT NULL,
  started_at TIMESTAMPTZ DEFAULT NULL,
  ended_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
  summary_saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_party_members (
  party_id TEXT NOT NULL REFERENCES public.workout_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  character_class TEXT NOT NULL DEFAULT 'Warrior',
  level INTEGER NOT NULL DEFAULT 1,
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'reconnecting', 'disconnected')),
  progress_value INTEGER NOT NULL DEFAULT 0 CHECK (progress_value >= 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  verified_submission_ref TEXT DEFAULT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workout_party_messages (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL REFERENCES public.workout_parties(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_username TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('message', 'reaction', 'system')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_party_history (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  challenge_name TEXT NOT NULL,
  group_total INTEGER NOT NULL DEFAULT 0,
  user_progress INTEGER NOT NULL DEFAULT 0,
  participants_count INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (party_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 3. 2D CHARACTER CUSTOMIZATION & COSMETICS (NON-PAY-TO-WIN)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_cosmetic_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id TEXT NOT NULL,
  source_ref TEXT NOT NULL DEFAULT 'verified_progression',
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS public.player_character_appearance (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  hairstyle_id TEXT DEFAULT NULL,
  outfit_id TEXT DEFAULT NULL,
  color_id TEXT DEFAULT NULL,
  frame_id TEXT DEFAULT NULL,
  banner_id TEXT DEFAULT NULL,
  aura_id TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_cosmetic_milestone_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL,
  reward_cosmetic_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_id)
);

-- ------------------------------------------------------------------------------
-- 4. COMMUNITY DECISIONS (POLLS & GOVERNANCE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_polls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('community_event', 'boss_theme', 'seasonal_reward', 'challenge_category')),
  poll_type TEXT NOT NULL CHECK (poll_type IN ('single_choice', 'multiple_choice')),
  max_choices INTEGER NOT NULL DEFAULT 1 CHECK (max_choices >= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled', 'published')),
  show_live_results BOOLEAN NOT NULL DEFAULT true,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_outcome TEXT DEFAULT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id TEXT NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_poll_reports (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 400),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, reporter_id)
);

-- ------------------------------------------------------------------------------
-- 5. TROPHY SHOWCASE (PINNED REFERENCES TO VERIFIED RECORDS)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_pinned_trophies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trophy_ref_id TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, trophy_ref_id)
);

-- ------------------------------------------------------------------------------
-- 6. SEASONAL JOURNEY EXTENSIONS
-- ------------------------------------------------------------------------------

ALTER TABLE public.seasons_catalog
  ADD COLUMN IF NOT EXISTS elite_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_xp_cap INTEGER NOT NULL DEFAULT 280;

ALTER TABLE public.player_season_progress
  ADD COLUMN IF NOT EXISTS elite_unlocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_activities_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.player_seasonal_cosmetic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES public.seasons_catalog(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  track TEXT NOT NULL DEFAULT 'free' CHECK (track IN ('free', 'elite')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id, reward_id)
);

-- ------------------------------------------------------------------------------
-- 7. TERRITORY WARS (2D FICTIONAL MAP, GUILD VS GUILD)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.territory_wars_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  season_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'resolved')),
  min_guild_members INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.territory_wars_territories (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES public.territory_wars_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region_theme TEXT NOT NULL,
  owner_guild_id TEXT DEFAULT NULL,
  owner_guild_name TEXT DEFAULT NULL,
  owner_guild_tag TEXT DEFAULT NULL,
  bonus_cosmetic_id TEXT NOT NULL,
  guild_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.territory_wars_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES public.territory_wars_campaigns(id) ON DELETE CASCADE,
  territory_id TEXT NOT NULL REFERENCES public.territory_wars_territories(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_stance TEXT NOT NULL CHECK (mission_stance IN ('offensive', 'defensive')),
  idempotency_key TEXT NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  daily_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.territory_wars_history (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  territory_id TEXT NOT NULL,
  territory_name TEXT NOT NULL,
  winning_guild_id TEXT DEFAULT NULL,
  winning_guild_name TEXT DEFAULT NULL,
  winning_guild_tag TEXT DEFAULT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8. LIVE COMMUNITY MOMENTS EXTENSIONS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_event_announcements (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'milestone', 'alert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY & POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.activity_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_party_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_party_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_cosmetic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_character_appearance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_cosmetic_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_pinned_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_seasonal_cosmetic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_wars_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_wars_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_wars_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_wars_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_announcements ENABLE ROW LEVEL SECURITY;

-- Activity Feed: block-aware & privacy-aware reads, owner deletes
DROP POLICY IF EXISTS "Feed posts visible respecting privacy and blocks" ON public.activity_feed_posts;
CREATE POLICY "Feed posts visible respecting privacy and blocks"
  ON public.activity_feed_posts FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = author_id)
         OR (b.blocker_id = author_id AND b.blocked_id = auth.uid())
    )
    AND (
      author_id = auth.uid()
      OR privacy_scope = 'everyone'
      OR (
        privacy_scope = 'friends'
        AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = auth.uid() AND f.addressee_id = author_id)
              OR (f.addressee_id = auth.uid() AND f.requester_id = author_id))
        )
      )
    )
  );

DROP POLICY IF EXISTS "Authors manage own feed posts" ON public.activity_feed_posts;
CREATE POLICY "Authors manage own feed posts"
  ON public.activity_feed_posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authenticated read feed reactions" ON public.activity_feed_reactions;
CREATE POLICY "Authenticated read feed reactions"
  ON public.activity_feed_reactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read feed comments" ON public.activity_feed_comments;
CREATE POLICY "Authenticated read feed comments"
  ON public.activity_feed_comments FOR SELECT TO authenticated USING (true);

-- Workout Parties
DROP POLICY IF EXISTS "Party members and friends read parties" ON public.workout_parties;
CREATE POLICY "Party members and friends read parties"
  ON public.workout_parties FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR visibility = 'public'
    OR EXISTS (SELECT 1 FROM public.workout_party_members m WHERE m.party_id = id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated read party members" ON public.workout_party_members;
CREATE POLICY "Authenticated read party members"
  ON public.workout_party_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Party members read messages" ON public.workout_party_messages;
CREATE POLICY "Party members read messages"
  ON public.workout_party_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workout_party_members m WHERE m.party_id = party_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users read own party history" ON public.workout_party_history;
CREATE POLICY "Users read own party history"
  ON public.workout_party_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Cosmetics
DROP POLICY IF EXISTS "Users read own cosmetic inventory" ON public.player_cosmetic_inventory;
CREATE POLICY "Users read own cosmetic inventory"
  ON public.player_cosmetic_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read character appearance" ON public.player_character_appearance;
CREATE POLICY "Authenticated read character appearance"
  ON public.player_character_appearance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own cosmetic milestones" ON public.player_cosmetic_milestone_claims;
CREATE POLICY "Users read own cosmetic milestones"
  ON public.player_cosmetic_milestone_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Community Decisions
DROP POLICY IF EXISTS "Authenticated read polls" ON public.community_polls;
CREATE POLICY "Authenticated read polls"
  ON public.community_polls FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own poll votes" ON public.community_poll_votes;
CREATE POLICY "Users read own poll votes"
  ON public.community_poll_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own poll reports" ON public.community_poll_reports;
CREATE POLICY "Users read own poll reports"
  ON public.community_poll_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Trophies & Seasonal Cosmetics
DROP POLICY IF EXISTS "Authenticated read pinned trophies" ON public.player_pinned_trophies;
CREATE POLICY "Authenticated read pinned trophies"
  ON public.player_pinned_trophies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own seasonal cosmetics" ON public.player_seasonal_cosmetic_records;
CREATE POLICY "Users read own seasonal cosmetics"
  ON public.player_seasonal_cosmetic_records FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Territory Wars & Announcements
DROP POLICY IF EXISTS "Authenticated read territory campaigns" ON public.territory_wars_campaigns;
CREATE POLICY "Authenticated read territory campaigns"
  ON public.territory_wars_campaigns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read territories" ON public.territory_wars_territories;
CREATE POLICY "Authenticated read territories"
  ON public.territory_wars_territories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read territory contributions" ON public.territory_wars_contributions;
CREATE POLICY "Authenticated read territory contributions"
  ON public.territory_wars_contributions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read territory history" ON public.territory_wars_history;
CREATE POLICY "Authenticated read territory history"
  ON public.territory_wars_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read community announcements" ON public.community_event_announcements;
CREATE POLICY "Authenticated read community announcements"
  ON public.community_event_announcements FOR SELECT TO authenticated USING (true);

-- Realtime Publication
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'activity_feed_posts',
    'activity_feed_reactions',
    'activity_feed_comments',
    'workout_parties',
    'workout_party_members',
    'workout_party_messages',
    'community_polls',
    'community_poll_votes',
    'territory_wars_territories',
    'community_event_announcements'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object OR undefined_object THEN
      NULL;
    END;
  END LOOP;
END $$;

COMMIT;
