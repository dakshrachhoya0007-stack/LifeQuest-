-- ==============================================================================
-- LIFEQUEST: WORLD OF AETHERIA — SOCIAL DISCOVERY, REAL GUILDS & ECONOMY REBALANCE
-- Additive, backward-compatible migration for existing Supabase project:
--   grlnojmvacbpcqfhzwpd
-- Preserves ALL existing user accounts, profiles, XP, Gold, Aether Points, and gear.
-- DO NOT execute automatically against production without maintenance review.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PRIVACY CONTROLS, PLAYER BIO & PUBLIC PROFILE DISCOVERY EXTENSIONS
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS show_achievements BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_equipment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stats BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_guild BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_visibility'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_visibility
      CHECK (profile_visibility IN ('public', 'friends_only', 'private'));
  END IF;
END $$;

GRANT UPDATE (
  bio,
  profile_visibility,
  show_achievements,
  show_equipment,
  show_stats,
  show_guild
) ON public.profiles TO authenticated;

ALTER TABLE public.public_champion_directory
  ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS show_achievements BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_equipment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stats BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_guild BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS equipped_weapon_id TEXT NOT NULL DEFAULT 'w-sword-1';

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
    leaderboard_visible, last_active_at,
    bio, profile_visibility, show_achievements, show_equipment, show_stats, show_guild, equipped_weapon_id
  )
  VALUES (
    NEW.id,
    NEW.username,
    CASE WHEN COALESCE(NEW.avatar_url, '') LIKE 'http%' THEN NULL ELSE NEW.avatar_url END,
    NEW.character_class,
    NEW.level,
    NEW.total_xp,
    NEW.aether_rank,
    NEW.aether_points,
    NEW.current_streak,
    NEW.total_bosses_defeated,
    NEW.leaderboard_visible,
    NEW.last_active_at,
    COALESCE(NEW.bio, ''),
    COALESCE(NEW.profile_visibility, 'public'),
    COALESCE(NEW.show_achievements, true),
    COALESCE(NEW.show_equipment, true),
    COALESCE(NEW.show_stats, true),
    COALESCE(NEW.show_guild, true),
    COALESCE(NEW.equipped_weapon_id, 'w-sword-1')
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
    last_active_at = EXCLUDED.last_active_at,
    bio = EXCLUDED.bio,
    profile_visibility = EXCLUDED.profile_visibility,
    show_achievements = EXCLUDED.show_achievements,
    show_equipment = EXCLUDED.show_equipment,
    show_stats = EXCLUDED.show_stats,
    show_guild = EXCLUDED.show_guild,
    equipped_weapon_id = EXCLUDED.equipped_weapon_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_public_champion_directory() FROM PUBLIC, anon, authenticated;

-- Backfill new public_champion_directory privacy & bio fields cleanly without exposing external OAuth photos
INSERT INTO public.public_champion_directory (
  id, username, avatar_url, character_class, level, total_xp,
  aether_rank, aether_points, current_streak, total_bosses_defeated,
  leaderboard_visible, last_active_at,
  bio, profile_visibility, show_achievements, show_equipment, show_stats, show_guild, equipped_weapon_id
)
SELECT
  p.id,
  p.username,
  CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END,
  p.character_class,
  p.level,
  p.total_xp,
  p.aether_rank,
  p.aether_points,
  p.current_streak,
  p.total_bosses_defeated,
  p.leaderboard_visible,
  p.last_active_at,
  COALESCE(p.bio, ''),
  COALESCE(p.profile_visibility, 'public'),
  COALESCE(p.show_achievements, true),
  COALESCE(p.show_equipment, true),
  COALESCE(p.show_stats, true),
  COALESCE(p.show_guild, true),
  COALESCE(p.equipped_weapon_id, 'w-sword-1')
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
  last_active_at = EXCLUDED.last_active_at,
  bio = EXCLUDED.bio,
  profile_visibility = EXCLUDED.profile_visibility,
  show_achievements = EXCLUDED.show_achievements,
  show_equipment = EXCLUDED.show_equipment,
  show_stats = EXCLUDED.show_stats,
  show_guild = EXCLUDED.show_guild,
  equipped_weapon_id = EXCLUDED.equipped_weapon_id;

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
  d.bio,
  d.profile_visibility,
  d.show_achievements,
  d.show_equipment,
  d.show_stats,
  d.show_guild,
  d.equipped_weapon_id,
  d.last_active_at
FROM public.public_champion_directory d
WHERE d.leaderboard_visible = true
  AND d.profile_visibility <> 'private';

REVOKE ALL ON public.champion_public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.champion_public_profiles TO authenticated;

-- Extend rpc_update_profile_preferences with bio & visibility toggles
DROP FUNCTION IF EXISTS public.rpc_update_profile_preferences(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT
);

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
  p_biological_sex TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_profile_visibility TEXT DEFAULT NULL,
  p_show_achievements BOOLEAN DEFAULT NULL,
  p_show_equipment BOOLEAN DEFAULT NULL,
  p_show_stats BOOLEAN DEFAULT NULL,
  p_show_guild BOOLEAN DEFAULT NULL
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
    bio = CASE WHEN p_bio IS NULL THEN bio ELSE left(trim(p_bio), 240) END,
    profile_visibility = CASE WHEN p_profile_visibility IN ('public','friends_only','private') THEN p_profile_visibility ELSE profile_visibility END,
    show_achievements = COALESCE(p_show_achievements, show_achievements),
    show_equipment = COALESCE(p_show_equipment, show_equipment),
    show_stats = COALESCE(p_show_stats, show_stats),
    show_guild = COALESCE(p_show_guild, show_guild),
    last_active_at = now()
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_prof));
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. USER BLOCKING & SAFETY TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own blocks" ON public.user_blocks;
CREATE POLICY "Users view own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

REVOKE ALL ON public.user_blocks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_blocks TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_block_user(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot block yourself.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found.');
  END IF;

  DELETE FROM public.friendships
  WHERE (requester_id = v_uid AND addressee_id = p_target_user_id)
     OR (requester_id = p_target_user_id AND addressee_id = v_uid);

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (v_uid, p_target_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'blockedUserId', p_target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_unblock_user(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  DELETE FROM public.user_blocks WHERE blocker_id = v_uid AND blocked_id = p_target_user_id;
  RETURN jsonb_build_object('success', true, 'unblockedUserId', p_target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_blocked_users()
RETURNS TABLE (
  id UUID,
  username TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  blocked_at TIMESTAMPTZ
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
    p.id,
    p.username,
    p.character_class,
    p.level,
    p.aether_rank,
    ub.created_at AS blocked_at
  FROM public.user_blocks ub
  JOIN public.profiles p ON p.id = ub.blocked_id
  WHERE ub.blocker_id = v_uid
  ORDER BY ub.created_at DESC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. REAL GUILDS ONLY (REMOVE UNJOINED SYNTHETIC SEED DATA), INVITES & REQUESTS
-- ------------------------------------------------------------------------------

-- Safely remove ONLY synthetic baseline guilds if they have 0 real human members/activity.
-- Preserves any guild with real players, real memberships, or user ownership.
DELETE FROM public.guild_challenges gc
USING public.guilds g
WHERE gc.guild_id = g.id
  AND g.id IN ('guild-1', 'guild-2', 'guild-3')
  AND g.owner_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = g.id)
  AND NOT EXISTS (SELECT 1 FROM public.guild_challenge_contributions gcc WHERE gcc.guild_id = g.id);

DELETE FROM public.guilds g
WHERE g.id IN ('guild-1', 'guild-2', 'guild-3')
  AND g.owner_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = g.id);

-- Ensure any surviving real guilds reflect authentic verified contributions only
UPDATE public.guilds g
SET
  weekly_quest_progress = COALESCE((
    SELECT SUM(gcc.contribution_delta)::INTEGER
    FROM public.guild_challenge_contributions gcc
    WHERE gcc.guild_id = g.id
  ), 0);

ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS guild_xp INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guilds_name_lower_unique ON public.guilds (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_guilds_tag_upper_unique ON public.guilds (upper(tag));

CREATE TABLE IF NOT EXISTS public.guild_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_guild_join_request UNIQUE (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_join_requests_guild ON public.guild_join_requests (guild_id, status);

DROP TRIGGER IF EXISTS trg_guild_join_requests_updated_at ON public.guild_join_requests;
CREATE TRIGGER trg_guild_join_requests_updated_at
  BEFORE UPDATE ON public.guild_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.guild_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_guild_invite UNIQUE (guild_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_invites_invitee ON public.guild_invites (invitee_id, status);

DROP TRIGGER IF EXISTS trg_guild_invites_updated_at ON public.guild_invites;
CREATE TRIGGER trg_guild_invites_updated_at
  BEFORE UPDATE ON public.guild_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_guild_officer_or_leader(p_guild_id TEXT)
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
      AND gm.role IN ('leader', 'officer')
  );
$$;

ALTER TABLE public.guild_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and officers view join requests" ON public.guild_join_requests;
CREATE POLICY "Users and officers view join requests"
  ON public.guild_join_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_guild_officer_or_leader(guild_id));

DROP POLICY IF EXISTS "Users and officers view guild invites" ON public.guild_invites;
CREATE POLICY "Users and officers view guild invites"
  ON public.guild_invites FOR SELECT TO authenticated
  USING (auth.uid() = invitee_id OR public.is_guild_officer_or_leader(guild_id));

REVOKE ALL ON public.guild_join_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guild_join_requests TO authenticated;

REVOKE ALL ON public.guild_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guild_invites TO authenticated;

-- Internal helper to record legitimate activity contributions into active guild challenges
CREATE OR REPLACE FUNCTION public._record_verified_guild_contribution(
  p_user_id UUID,
  p_delta INTEGER,
  p_source_type TEXT,
  p_source_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id TEXT;
  v_weekly_period TEXT;
  v_challenge_id UUID;
  v_guild public.guilds%ROWTYPE;
  v_delta INTEGER := GREATEST(1, LEAST(250, COALESCE(p_delta, 1)));
  v_new_gxp INTEGER;
  v_new_lvl INTEGER;
  v_tz TEXT;
BEGIN
  SELECT guild_id INTO v_guild_id FROM public.guild_members WHERE user_id = p_user_id LIMIT 1;
  IF v_guild_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(timezone, ''), 'UTC') INTO v_tz FROM public.profiles WHERE id = p_user_id;
  v_weekly_period := public.resolve_period_key('weekly', COALESCE(v_tz, 'UTC'));

  SELECT * INTO v_guild FROM public.guilds WHERE id = v_guild_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.guild_challenges (guild_id, title, period_key, target_value, current_value)
  VALUES (v_guild.id, v_guild.weekly_quest_name, v_weekly_period, GREATEST(100, v_guild.weekly_quest_max), 0)
  ON CONFLICT (guild_id, period_key) DO NOTHING;

  UPDATE public.guild_challenges
  SET
    current_value = LEAST(target_value, current_value + v_delta),
    completed = LEAST(target_value, current_value + v_delta) >= target_value
  WHERE guild_id = v_guild_id AND period_key = v_weekly_period
  RETURNING id INTO v_challenge_id;

  IF v_challenge_id IS NOT NULL THEN
    INSERT INTO public.guild_challenge_contributions (
      challenge_id, guild_id, user_id, contribution_delta, source_type, source_id
    )
    VALUES (
      v_challenge_id, v_guild_id, p_user_id, v_delta, COALESCE(p_source_type, 'activity'), p_source_id
    );
  END IF;

  v_new_gxp := COALESCE(v_guild.guild_xp, 0) + v_delta;
  v_new_lvl := GREATEST(1, 1 + floor(v_new_gxp / 1000.0)::INTEGER);

  UPDATE public.guilds
  SET
    guild_xp = v_new_gxp,
    level = v_new_lvl,
    weekly_quest_progress = LEAST(weekly_quest_max, COALESCE((
      SELECT current_value FROM public.guild_challenges WHERE id = v_challenge_id
    ), weekly_quest_progress + v_delta)),
    updated_at = now()
  WHERE id = v_guild_id;

  UPDATE public.guild_members
  SET weekly_contribution = weekly_contribution + v_delta
  WHERE guild_id = v_guild_id AND user_id = p_user_id;

  INSERT INTO public.player_achievements (user_id, achievement_id, progress, max_progress, unlocked)
  VALUES (p_user_id, 'ach-7', 1, 1, true)
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = 1, unlocked = true;
END;
$$;

REVOKE ALL ON FUNCTION public._record_verified_guild_contribution(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. FRIEND DISCOVERY, REQUEST LIFECYCLE & PUBLIC PLAYER PROFILES RPCs
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_search_champions(TEXT);
CREATE OR REPLACE FUNCTION public.rpc_search_champions(
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 40,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  current_streak INTEGER,
  bio TEXT,
  profile_visibility TEXT,
  relationship_status TEXT,
  friendship_id UUID,
  guild_id TEXT,
  guild_name TEXT,
  guild_tag TEXT,
  achievement_count BIGINT
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
  SELECT
    p.id,
    p.username,
    CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END AS avatar_url,
    p.character_class,
    p.level,
    p.aether_rank,
    p.current_streak,
    COALESCE(p.bio, '') AS bio,
    COALESCE(p.profile_visibility, 'public') AS profile_visibility,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
      ) THEN 'blocked'
      WHEN f.status = 'accepted' THEN 'friends'
      WHEN f.status = 'pending' AND f.requester_id = v_uid THEN 'request_sent'
      WHEN f.status = 'pending' AND f.addressee_id = v_uid THEN 'request_received'
      ELSE 'none'
    END AS relationship_status,
    f.id AS friendship_id,
    g.id AS guild_id,
    g.name AS guild_name,
    g.tag AS guild_tag,
    (
      SELECT COUNT(*) FROM public.player_achievements pa
      WHERE pa.user_id = p.id AND pa.unlocked = true
    ) AS achievement_count
  FROM public.profiles p
  LEFT JOIN public.friendships f
    ON ((f.requester_id = v_uid AND f.addressee_id = p.id)
     OR (f.addressee_id = v_uid AND f.requester_id = p.id))
  LEFT JOIN public.guild_members gm ON gm.user_id = p.id
  LEFT JOIN public.guilds g ON g.id = gm.guild_id
  WHERE p.id <> v_uid
    AND COALESCE(p.profile_visibility, 'public') <> 'private'
    AND (p.leaderboard_visible = true OR f.status = 'accepted')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
         OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
    )
    AND (
      v_q = '%%'
      OR lower(p.username) LIKE v_q
      OR lower(COALESCE(p.character_name, '')) LIKE v_q
      OR lower(p.character_class) LIKE v_q
    )
  ORDER BY
    CASE WHEN f.status = 'accepted' THEN 0 WHEN f.status = 'pending' THEN 1 ELSE 2 END ASC,
    p.level DESC,
    p.total_xp DESC,
    p.username ASC
  LIMIT LEAST(60, GREATEST(1, COALESCE(p_limit, 40)))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_get_champion_profiles(UUID[]);
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
  SELECT
    p.id,
    p.username,
    CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END AS avatar_url,
    p.character_class,
    p.level,
    p.aether_rank,
    p.current_streak
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
  v_rel TEXT := 'none';
  v_is_blocked BOOLEAN := false;
  v_blocked_by_me BOOLEAN := false;
  v_is_self BOOLEAN := false;
  v_is_friend BOOLEAN := false;
  v_equipped JSONB;
  v_guild JSONB;
  v_achievements JSONB;
  v_weapons_count INTEGER := 0;
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

  -- Respect profile_visibility ('public', 'friends_only', 'private')
  IF NOT v_is_self THEN
    IF COALESCE(v_target.profile_visibility, 'public') = 'private' THEN
      RETURN jsonb_build_object(
        'success', true,
        'accessible', false,
        'restrictedReason', 'private',
        'player', jsonb_build_object(
          'id', v_target.id,
          'username', v_target.username,
          'characterClass', v_target.character_class,
          'relationshipStatus', v_rel,
          'friendshipId', v_f.id
        )
      );
    END IF;

    IF COALESCE(v_target.profile_visibility, 'public') = 'friends_only' AND NOT v_is_friend THEN
      RETURN jsonb_build_object(
        'success', true,
        'accessible', false,
        'restrictedReason', 'friends_only',
        'player', jsonb_build_object(
          'id', v_target.id,
          'username', v_target.username,
          'characterClass', v_target.character_class,
          'level', v_target.level,
          'aetherRank', v_target.aether_rank,
          'bio', COALESCE(v_target.bio, ''),
          'relationshipStatus', v_rel,
          'friendshipId', v_f.id
        )
      );
    END IF;
  END IF;

  -- Strictly non-sensitive RPG data conditioned on privacy toggles
  IF v_is_self OR COALESCE(v_target.show_equipment, true) THEN
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
  END IF;

  IF v_is_self OR COALESCE(v_target.show_guild, true) THEN
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
  END IF;

  IF v_is_self OR COALESCE(v_target.show_achievements, true) THEN
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
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'accessible', true,
    'player', jsonb_build_object(
      'id', v_target.id,
      'username', v_target.username,
      'characterName', COALESCE(v_target.character_name, v_target.username),
      'characterClass', v_target.character_class,
      'level', v_target.level,
      'totalXp', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_xp ELSE NULL END,
      'aetherRank', v_target.aether_rank,
      'aetherPoints', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.aether_points ELSE NULL END,
      'currentStreak', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.current_streak ELSE NULL END,
      'totalWorkoutsCompleted', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_workouts_completed ELSE NULL END,
      'totalVerifiedReps', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_verified_reps ELSE NULL END,
      'totalBossesDefeated', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_bosses_defeated ELSE NULL END,
      'bio', COALESCE(v_target.bio, ''),
      'profileVisibility', COALESCE(v_target.profile_visibility, 'public'),
      'showAchievements', COALESCE(v_target.show_achievements, true),
      'showEquipment', COALESCE(v_target.show_equipment, true),
      'showStats', COALESCE(v_target.show_stats, true),
      'showGuild', COALESCE(v_target.show_guild, true),
      'relationshipStatus', CASE WHEN v_is_self THEN 'self' ELSE v_rel END,
      'friendshipId', v_f.id,
      'equippedWeapon', v_equipped,
      'unlockedWeaponsCount', CASE WHEN v_is_self OR COALESCE(v_target.show_equipment, true) THEN v_weapons_count ELSE NULL END,
      'guild', v_guild,
      'achievements', COALESCE(v_achievements, '[]'::jsonb),
      'lastActiveAt', v_target.last_active_at
    )
  );
END;
$$;

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
  v_existing public.friendships%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot send a friend request to yourself.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p_target_user_id)
       OR (ub.blocker_id = p_target_user_id AND ub.blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send friend request while a user block is active.');
  END IF;

  SELECT * INTO v_existing
  FROM public.friendships f
  WHERE (f.requester_id = v_uid AND f.addressee_id = p_target_user_id)
     OR (f.requester_id = p_target_user_id AND f.addressee_id = v_uid)
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are already friends with this player.');
    ELSIF v_existing.requester_id = v_uid THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already have a pending request sent to this player.');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'This player already sent you a friend request. Check Received Requests.');
    END IF;
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
    v_me.username || ' (Lv.' || v_me.level || ' ' || v_me.character_class || ') sent you a friend request.',
    jsonb_build_object('friendshipId', v_req.id, 'requesterId', v_uid, 'requesterName', v_me.username)
  );

  RETURN jsonb_build_object('success', true, 'friendship', to_jsonb(v_req));
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Friend request or friendship already exists.');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cancel_friend_request(p_friendship_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_f public.friendships%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_f FROM public.friendships WHERE id = p_friendship_id FOR UPDATE;
  IF NOT FOUND OR v_f.requester_id <> v_uid OR v_f.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Outgoing pending friend request not found.');
  END IF;

  DELETE FROM public.friendships WHERE id = p_friendship_id;
  RETURN jsonb_build_object('success', true, 'cancelledId', p_friendship_id);
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
  IF NOT FOUND OR v_f.addressee_id <> v_uid OR v_f.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incoming pending friend request not found.');
  END IF;

  IF p_accept THEN
    IF EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = v_uid AND ub.blocked_id = v_f.requester_id)
         OR (ub.blocker_id = v_f.requester_id AND ub.blocked_id = v_uid)
    ) THEN
      DELETE FROM public.friendships WHERE id = p_friendship_id;
      RETURN jsonb_build_object('success', false, 'error', 'Cannot accept request while blocked.');
    END IF;

    UPDATE public.friendships SET status = 'accepted', updated_at = now() WHERE id = p_friendship_id RETURNING * INTO v_f;
    SELECT * INTO v_me FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      v_f.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      v_me.username || ' accepted your companion request!',
      jsonb_build_object('friendId', v_uid, 'friendName', v_me.username)
    );
    RETURN jsonb_build_object('success', true, 'status', 'accepted');
  ELSE
    DELETE FROM public.friendships WHERE id = p_friendship_id;
    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;
END;
$$;

-- Sanitize avatar_url on rpc_get_leaderboard so OAuth photos never appear in rankings
DROP FUNCTION IF EXISTS public.rpc_get_leaderboard(TEXT, INTEGER, INTEGER);
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
      CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END AS safe_avatar,
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
      AND (COALESCE(p.profile_visibility, 'public') <> 'private' OR p.id = v_uid)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
      )
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
    f.safe_avatar AS avatar_url,
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

-- ------------------------------------------------------------------------------
-- 5. COMPLETE REAL GUILD GOVERNANCE & AUTHENTIC CHALLENGE PROGRESS RPCs
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_list_guilds();
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
  my_role TEXT,
  is_public BOOLEAN,
  min_level INTEGER,
  guild_xp INTEGER,
  owner_id UUID,
  has_pending_request BOOLEAN,
  has_pending_invite BOOLEAN
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
    COALESCE((
      SELECT gc.current_value
      FROM public.guild_challenges gc
      WHERE gc.guild_id = g.id
      ORDER BY gc.created_at DESC
      LIMIT 1
    ), 0) AS weekly_quest_progress,
    g.weekly_quest_max,
    COUNT(gm.user_id)::BIGINT AS members_count,
    COALESCE(BOOL_OR(gm.user_id = v_uid), false) AS is_member,
    MAX(CASE WHEN gm.user_id = v_uid THEN gm.role ELSE NULL END) AS my_role,
    COALESCE(g.is_public, true) AS is_public,
    COALESCE(g.min_level, 1) AS min_level,
    COALESCE(g.guild_xp, 0) AS guild_xp,
    g.owner_id,
    EXISTS (
      SELECT 1 FROM public.guild_join_requests gjr
      WHERE gjr.guild_id = g.id AND gjr.user_id = v_uid AND gjr.status = 'pending'
    ) AS has_pending_request,
    EXISTS (
      SELECT 1 FROM public.guild_invites gi
      WHERE gi.guild_id = g.id AND gi.invitee_id = v_uid AND gi.status = 'pending'
    ) AS has_pending_invite
  FROM public.guilds g
  LEFT JOIN public.guild_members gm ON gm.guild_id = g.id
  GROUP BY g.id
  ORDER BY is_member DESC, g.level DESC, g.guild_xp DESC, g.created_at ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_create_guild(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_create_guild(
  p_name TEXT,
  p_tag TEXT,
  p_description TEXT DEFAULT '',
  p_emblem TEXT DEFAULT 'Shield',
  p_is_public BOOLEAN DEFAULT true,
  p_min_level INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_guild public.guilds%ROWTYPE;
  v_clean_name TEXT := left(trim(COALESCE(p_name, '')), 60);
  v_clean_tag TEXT := upper(left(regexp_replace(COALESCE(p_tag, ''), '[^A-Za-z0-9]', '', 'g'), 4));
  v_emblem TEXT := CASE
    WHEN COALESCE(p_emblem, '') IN ('Shield','Flame','Crown','Swords','Sparkles','Compass','Sun') THEN p_emblem
    ELSE 'Shield'
  END;
  v_min_lvl INTEGER := LEAST(50, GREATEST(1, COALESCE(p_min_level, 1)));
  v_weekly_period TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(v_clean_name) < 3 OR char_length(v_clean_tag) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild name (min 3 chars) and tag (2-4 chars) are required.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already belong to a guild. Leave or disband your current guild first.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.guilds WHERE lower(name) = lower(v_clean_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A guild with this name already exists.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.guilds WHERE upper(tag) = v_clean_tag) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild tag [' || v_clean_tag || '] is already taken.');
  END IF;

  INSERT INTO public.guilds (
    id, name, tag, emblem, level, max_members, description,
    weekly_quest_name, weekly_quest_progress, weekly_quest_max,
    owner_id, is_public, min_level, guild_xp
  )
  VALUES (
    'guild-' || substr(gen_random_uuid()::text, 1, 8),
    v_clean_name,
    v_clean_tag,
    v_emblem,
    1,
    30,
    left(trim(COALESCE(p_description, '')), 300),
    'Collective Weekly Endurance & Discipline',
    0,
    1000,
    v_uid,
    COALESCE(p_is_public, true),
    v_min_lvl,
    0
  )
  RETURNING * INTO v_guild;

  INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution)
  VALUES (v_guild.id, v_uid, 'leader', 0);

  v_weekly_period := public.resolve_period_key('weekly', 'UTC');
  INSERT INTO public.guild_challenges (guild_id, title, period_key, target_value, current_value, reward_gold, reward_player_xp)
  VALUES (v_guild.id, v_guild.weekly_quest_name, v_weekly_period, v_guild.weekly_quest_max, 0, 75, 100)
  ON CONFLICT (guild_id, period_key) DO NOTHING;

  DELETE FROM public.guild_join_requests WHERE user_id = v_uid AND status = 'pending';
  DELETE FROM public.guild_invites WHERE invitee_id = v_uid AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'guild', to_jsonb(v_guild));
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Guild name or tag is already taken.');
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
  v_prof public.profiles%ROWTYPE;
  v_guild public.guilds%ROWTYPE;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Guild not found'); END IF;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', true, 'alreadyMember', true, 'guildId', p_guild_id);
  END IF;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leave your current guild before joining another one.');
  END IF;

  IF NOT COALESCE(v_guild.is_public, true) THEN
    RETURN jsonb_build_object('success', false, 'requiresRequest', true, 'error', 'This guild is private. Submit a join request instead.');
  END IF;

  IF v_prof.level < COALESCE(v_guild.min_level, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Level ' || v_guild.min_level || ' to join this guild.');
  END IF;

  SELECT count(*) INTO v_count FROM public.guild_members WHERE guild_id = p_guild_id;
  IF v_count >= v_guild.max_members THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild is already at full capacity.');
  END IF;

  INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution)
  VALUES (p_guild_id, v_uid, 'member', 0);

  DELETE FROM public.guild_join_requests WHERE guild_id = p_guild_id AND user_id = v_uid;
  DELETE FROM public.guild_invites WHERE guild_id = p_guild_id AND invitee_id = v_uid;

  RETURN jsonb_build_object('success', true, 'guildId', p_guild_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_request_join_guild(
  p_guild_id TEXT,
  p_message TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_guild public.guilds%ROWTYPE;
  v_req public.guild_join_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Guild not found.'); END IF;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leave your current guild before requesting to join another.');
  END IF;

  IF v_prof.level < COALESCE(v_guild.min_level, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Level ' || v_guild.min_level || ' to apply.');
  END IF;

  INSERT INTO public.guild_join_requests (guild_id, user_id, message, status)
  VALUES (p_guild_id, v_uid, left(trim(COALESCE(p_message, '')), 240), 'pending')
  ON CONFLICT (guild_id, user_id) DO UPDATE SET
    message = left(trim(COALESCE(p_message, '')), 240),
    status = 'pending',
    updated_at = now()
  RETURNING * INTO v_req;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT
    gm.user_id,
    'guild_join_request',
    'New Guild Join Request',
    v_prof.username || ' (Lv.' || v_prof.level || ') requested to join [' || v_guild.tag || '] ' || v_guild.name || '.',
    jsonb_build_object('guildId', v_guild.id, 'requestId', v_req.id, 'applicantId', v_uid)
  FROM public.guild_members gm
  WHERE gm.guild_id = p_guild_id AND gm.role IN ('leader', 'officer');

  RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_req));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_respond_guild_request(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_req public.guild_join_requests%ROWTYPE;
  v_guild public.guilds%ROWTYPE;
  v_actor_role TEXT;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.guild_join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pending join request not found.');
  END IF;

  SELECT role INTO v_actor_role
  FROM public.guild_members
  WHERE guild_id = v_req.guild_id AND user_id = v_uid;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('leader', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only guild leaders or officers can review join requests.');
  END IF;

  SELECT * INTO v_guild FROM public.guilds WHERE id = v_req.guild_id FOR UPDATE;

  IF p_accept THEN
    IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_req.user_id) THEN
      UPDATE public.guild_join_requests SET status = 'rejected', updated_at = now() WHERE id = p_request_id;
      RETURN jsonb_build_object('success', false, 'error', 'Applicant already joined another guild.');
    END IF;

    SELECT count(*) INTO v_count FROM public.guild_members WHERE guild_id = v_req.guild_id;
    IF v_count >= v_guild.max_members THEN
      RETURN jsonb_build_object('success', false, 'error', 'Guild is at full capacity.');
    END IF;

    INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution)
    VALUES (v_req.guild_id, v_req.user_id, 'member', 0);

    UPDATE public.guild_join_requests SET status = 'accepted', updated_at = now() WHERE id = p_request_id;
    DELETE FROM public.guild_invites WHERE invitee_id = v_req.user_id;

    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      v_req.user_id,
      'guild_accepted',
      'Guild Application Approved',
      'Your request to join [' || v_guild.tag || '] ' || v_guild.name || ' was accepted!',
      jsonb_build_object('guildId', v_guild.id)
    );
    RETURN jsonb_build_object('success', true, 'status', 'accepted');
  ELSE
    UPDATE public.guild_join_requests SET status = 'rejected', updated_at = now() WHERE id = p_request_id;
    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_invite_to_guild(
  p_guild_id TEXT,
  p_target_user_id UUID
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
  v_me public.profiles%ROWTYPE;
  v_inv public.guild_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid target player.');
  END IF;

  SELECT role INTO v_actor_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('leader', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only guild leaders or officers can send invites.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p_target_user_id)
       OR (ub.blocker_id = p_target_user_id AND ub.blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot invite this player.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player is already in your guild.');
  END IF;

  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id;
  SELECT * INTO v_me FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.guild_invites (guild_id, inviter_id, invitee_id, status)
  VALUES (p_guild_id, v_uid, p_target_user_id, 'pending')
  ON CONFLICT (guild_id, invitee_id) DO UPDATE SET
    inviter_id = v_uid,
    status = 'pending',
    updated_at = now()
  RETURNING * INTO v_inv;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    p_target_user_id,
    'guild_invite',
    'Guild Invitation',
    v_me.username || ' invited you to join [' || v_guild.tag || '] ' || v_guild.name || '.',
    jsonb_build_object('inviteId', v_inv.id, 'guildId', v_guild.id, 'guildName', v_guild.name)
  );

  RETURN jsonb_build_object('success', true, 'invite', to_jsonb(v_inv));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_respond_guild_invite(
  p_invite_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv public.guild_invites%ROWTYPE;
  v_guild public.guilds%ROWTYPE;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_inv FROM public.guild_invites WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND OR v_inv.invitee_id <> v_uid OR v_inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pending guild invite not found.');
  END IF;

  IF p_accept THEN
    IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_uid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Leave your current guild before accepting a new guild invite.');
    END IF;
    SELECT * INTO v_guild FROM public.guilds WHERE id = v_inv.guild_id FOR UPDATE;
    IF NOT FOUND THEN
      DELETE FROM public.guild_invites WHERE id = p_invite_id;
      RETURN jsonb_build_object('success', false, 'error', 'Guild no longer exists.');
    END IF;

    SELECT count(*) INTO v_count FROM public.guild_members WHERE guild_id = v_inv.guild_id;
    IF v_count >= v_guild.max_members THEN
      RETURN jsonb_build_object('success', false, 'error', 'Guild is at full capacity.');
    END IF;

    INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution)
    VALUES (v_inv.guild_id, v_uid, 'member', 0);

    UPDATE public.guild_invites SET status = 'accepted', updated_at = now() WHERE id = p_invite_id;
    DELETE FROM public.guild_join_requests WHERE user_id = v_uid;

    RETURN jsonb_build_object('success', true, 'status', 'accepted', 'guildId', v_inv.guild_id);
  ELSE
    UPDATE public.guild_invites SET status = 'declined', updated_at = now() WHERE id = p_invite_id;
    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_my_guild_invites()
RETURNS TABLE (
  invite_id UUID,
  guild_id TEXT,
  guild_name TEXT,
  guild_tag TEXT,
  guild_level INTEGER,
  inviter_name TEXT,
  created_at TIMESTAMPTZ
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
    gi.id AS invite_id,
    g.id AS guild_id,
    g.name AS guild_name,
    g.tag AS guild_tag,
    g.level AS guild_level,
    COALESCE(p.username, 'Guild Leader') AS inviter_name,
    gi.created_at
  FROM public.guild_invites gi
  JOIN public.guilds g ON g.id = gi.guild_id
  LEFT JOIN public.profiles p ON p.id = gi.inviter_id
  WHERE gi.invitee_id = v_uid AND gi.status = 'pending'
  ORDER BY gi.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_disband_guild(p_guild_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_guild public.guilds%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role INTO v_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid;
  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild not found.');
  END IF;
  IF v_role <> 'leader' AND v_guild.owner_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the guild leader can disband the guild.');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT
    gm.user_id,
    'guild_disbanded',
    'Guild Disbanded',
    '[' || v_guild.tag || '] ' || v_guild.name || ' has been disbanded by its leader.',
    jsonb_build_object('guildId', v_guild.id)
  FROM public.guild_members gm
  WHERE gm.guild_id = p_guild_id AND gm.user_id <> v_uid;

  DELETE FROM public.guilds WHERE id = p_guild_id;
  RETURN jsonb_build_object('success', true, 'disbandedId', p_guild_id);
END;
$$;

-- Override leave guild helper so empty non-member guilds with 0 members are deleted cleanly instead of zombie ghosts
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

  IF v_owner_id = p_user_id OR v_owner_id IS NULL THEN
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
      -- No members remain: remove empty guild cleanly
      DELETE FROM public.guilds WHERE id = v_old_guild_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._transfer_guild_ownership_on_leave(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_create_guild_challenge(
  p_guild_id TEXT,
  p_title TEXT,
  p_target_value INTEGER DEFAULT 1000,
  p_reward_gold INTEGER DEFAULT 75,
  p_reward_player_xp INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_weekly_period TEXT;
  v_target INTEGER := LEAST(25000, GREATEST(50, COALESCE(p_target_value, 1000)));
  v_gold INTEGER := LEAST(120, GREATEST(15, COALESCE(p_reward_gold, 75)));
  v_xp INTEGER := LEAST(150, GREATEST(20, COALESCE(p_reward_player_xp, 100)));
  v_title TEXT := left(trim(COALESCE(p_title, '')), 120);
  v_ch public.guild_challenges%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(v_title) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge title must be at least 3 characters.');
  END IF;

  SELECT role INTO v_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('leader', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only guild leaders or officers can configure challenges.');
  END IF;

  v_weekly_period := public.resolve_period_key('weekly', 'UTC');

  INSERT INTO public.guild_challenges (
    guild_id, title, period_key, target_value, current_value, reward_gold, reward_player_xp, completed
  )
  VALUES (p_guild_id, v_title, v_weekly_period, v_target, 0, v_gold, v_xp, false)
  ON CONFLICT (guild_id, period_key) DO UPDATE SET
    title = EXCLUDED.title,
    target_value = EXCLUDED.target_value,
    reward_gold = EXCLUDED.reward_gold,
    reward_player_xp = EXCLUDED.reward_player_xp,
    completed = public.guild_challenges.current_value >= EXCLUDED.target_value
  RETURNING * INTO v_ch;

  UPDATE public.guilds
  SET
    weekly_quest_name = v_title,
    weekly_quest_max = v_target,
    weekly_quest_progress = LEAST(v_target, v_ch.current_value),
    updated_at = now()
  WHERE id = p_guild_id;

  RETURN jsonb_build_object('success', true, 'challenge', to_jsonb(v_ch));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_guild_details(p_guild_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_guild public.guilds%ROWTYPE;
  v_my_role TEXT;
  v_members JSONB;
  v_challenges JSONB;
  v_requests JSONB := '[]'::jsonb;
  v_invites JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild not found.');
  END IF;

  SELECT role INTO v_my_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'userId', p.id,
    'username', p.username,
    'characterClass', p.character_class,
    'level', p.level,
    'aetherRank', p.aether_rank,
    'role', gm.role,
    'weeklyContribution', gm.weekly_contribution,
    'joinedAt', gm.joined_at
  ) ORDER BY
    CASE gm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END ASC,
    gm.weekly_contribution DESC,
    gm.joined_at ASC
  ), '[]'::jsonb)
  INTO v_members
  FROM public.guild_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.guild_id = p_guild_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', gc.id,
    'title', gc.title,
    'periodKey', gc.period_key,
    'targetValue', gc.target_value,
    'currentValue', gc.current_value,
    'rewardGold', gc.reward_gold,
    'rewardPlayerXp', gc.reward_player_xp,
    'completed', gc.completed
  ) ORDER BY gc.created_at DESC), '[]'::jsonb)
  INTO v_challenges
  FROM public.guild_challenges gc
  WHERE gc.guild_id = p_guild_id;

  IF v_my_role IN ('leader', 'officer') THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', gjr.id,
      'userId', p.id,
      'username', p.username,
      'characterClass', p.character_class,
      'level', p.level,
      'aetherRank', p.aether_rank,
      'message', gjr.message,
      'createdAt', gjr.created_at
    ) ORDER BY gjr.created_at ASC), '[]'::jsonb)
    INTO v_requests
    FROM public.guild_join_requests gjr
    JOIN public.profiles p ON p.id = gjr.user_id
    WHERE gjr.guild_id = p_guild_id AND gjr.status = 'pending';

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', gi.id,
      'inviteeId', p.id,
      'inviteeName', p.username,
      'inviteeClass', p.character_class,
      'inviteeLevel', p.level,
      'createdAt', gi.created_at
    ) ORDER BY gi.created_at DESC), '[]'::jsonb)
    INTO v_invites
    FROM public.guild_invites gi
    JOIN public.profiles p ON p.id = gi.invitee_id
    WHERE gi.guild_id = p_guild_id AND gi.status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'guild', jsonb_build_object(
      'id', v_guild.id,
      'name', v_guild.name,
      'tag', v_guild.tag,
      'emblem', v_guild.emblem,
      'level', v_guild.level,
      'guildXp', COALESCE(v_guild.guild_xp, 0),
      'maxMembers', v_guild.max_members,
      'membersCount', jsonb_array_length(v_members),
      'description', v_guild.description,
      'weeklyQuestName', v_guild.weekly_quest_name,
      'weeklyQuestProgress', v_guild.weekly_quest_progress,
      'weeklyQuestMax', v_guild.weekly_quest_max,
      'isPublic', COALESCE(v_guild.is_public, true),
      'minLevel', COALESCE(v_guild.min_level, 1),
      'ownerId', v_guild.owner_id,
      'isMember', v_my_role IS NOT NULL,
      'myRole', v_my_role
    ),
    'members', v_members,
    'challenges', v_challenges,
    'joinRequests', v_requests,
    'pendingInvites', v_invites
  );
END;
$$;

-- Also update rpc_update_guild_details to allow editing privacy / min_level / emblem
DROP FUNCTION IF EXISTS public.rpc_update_guild_details(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.rpc_update_guild_details(
  p_guild_id TEXT,
  p_description TEXT DEFAULT NULL,
  p_weekly_quest_name TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT NULL,
  p_min_level INTEGER DEFAULT NULL,
  p_emblem TEXT DEFAULT NULL
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
    is_public = COALESCE(p_is_public, is_public),
    min_level = CASE WHEN p_min_level IS NOT NULL THEN LEAST(50, GREATEST(1, p_min_level)) ELSE min_level END,
    emblem = CASE WHEN p_emblem IN ('Shield','Flame','Crown','Swords','Sparkles','Compass','Sun') THEN p_emblem ELSE emblem END,
    updated_at = now()
  WHERE id = p_guild_id
  RETURNING * INTO v_guild;

  RETURN jsonb_build_object('success', true, 'guild', to_jsonb(v_guild));
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. SHOP PRICE REBALANCING (PROGRESSIVE BY RARITY & UTILITY)
--    Preserves all existing player purchases and owned inventory items.
-- ------------------------------------------------------------------------------

UPDATE public.shop_items SET price_gold = v.price_gold, price_forge_xp = v.price_forge_xp
FROM (VALUES
  -- Consumables & Catalysts
  ('shop-elixir-vitality', 95, 0),
  ('shop-elixir-focus', 145, 0),
  ('shop-catalyst-ember', 240, 0),
  -- Common Starter / Entry Gear
  ('shop-wand-ember', 180, 15),
  ('shop-armour-leather', 200, 15),
  -- Uncommon Progression Gear
  ('shop-dag-shadow', 310, 30),
  ('shop-helm-iron', 320, 30),
  ('shop-axe-berserker', 340, 35),
  ('shop-gs-titan', 360, 40),
  ('shop-xbow-arbalest', 375, 40),
  ('shop-armour-silverguard', 420, 50),
  -- Rare Mid-Game Gear
  ('shop-weapon-storm-bow', 580, 75),
  ('shop-weapon-obsidian-blade', 620, 85),
  ('shop-acc-flame-ring', 640, 85),
  ('shop-dag-phantom', 660, 90),
  ('shop-ham-granite', 680, 95),
  ('shop-spear-valkyrie', 700, 100),
  ('shop-dual-tempest', 720, 105),
  ('shop-helm-shadow', 740, 110),
  ('shop-scythe-dusk', 760, 115),
  -- Epic High-Power Gear
  ('shop-weapon-flame-sword', 1150, 165),
  ('shop-weapon-frostblade', 1180, 170),
  ('shop-wand-starweave', 1220, 175),
  ('shop-shield-dragon', 1260, 185),
  ('shop-gs-volcanic', 1350, 195),
  ('shop-axe-bloodmoon', 1380, 205),
  ('shop-dual-crimson', 1400, 210),
  ('shop-armour-obsidian', 1420, 215),
  ('shop-acc-astral-amulet', 1480, 225),
  -- Legendary Endgame Shop Gear
  ('shop-helm-archon', 2100, 310),
  ('shop-spear-storm', 2250, 340),
  ('shop-xbow-thunder', 2350, 360),
  ('shop-ham-thunder', 2450, 380),
  -- Mythic Pinnacle Shop Gear
  ('shop-weapon-celestial-sword', 3400, 520),
  ('shop-staff-astral', 3550, 550),
  ('shop-armour-sunforged', 3650, 570),
  ('shop-scythe-eclipse', 3750, 590),
  ('shop-acc-celestial', 3900, 620)
) AS v(id, price_gold, price_forge_xp)
WHERE public.shop_items.id = v.id;

-- ------------------------------------------------------------------------------
-- 7. HABIT & BOSS XP REBALANCING (~25-28% REDUCTION + ANTI-FARM PROTECTION)
--    Applies strictly to FUTURE habit/boss claims; existing XP & Gold preserved!
-- ------------------------------------------------------------------------------

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS rebalance_version INTEGER NOT NULL DEFAULT 1;

-- One-time rebalance of existing habit rows' future payout (~25% XP / ~20% Gold)
UPDATE public.habits
SET
  player_xp_reward = CASE id
    WHEN 'h-1' THEN 11
    WHEN 'h-2' THEN 15
    WHEN 'h-3' THEN 18
    WHEN 'h-4' THEN 11
    WHEN 'h-5' THEN 11
    WHEN 'h-6' THEN 32
    ELSE GREATEST(5, round(player_xp_reward * 0.75)::INTEGER)
  END,
  gold_reward = CASE id
    WHEN 'h-1' THEN 12
    WHEN 'h-2' THEN 15
    WHEN 'h-3' THEN 18
    WHEN 'h-4' THEN 12
    WHEN 'h-5' THEN 12
    WHEN 'h-6' THEN 38
    ELSE GREATEST(5, round(gold_reward * 0.80)::INTEGER)
  END,
  rebalance_version = 2
WHERE rebalance_version = 1;

CREATE OR REPLACE FUNCTION public.rpc_create_habit(
  p_name TEXT,
  p_category TEXT DEFAULT 'discipline',
  p_frequency TEXT DEFAULT 'daily',
  p_icon_name TEXT DEFAULT 'Sparkles',
  p_player_xp INTEGER DEFAULT 11,
  p_forge_xp INTEGER DEFAULT 16,
  p_gold INTEGER DEFAULT 12
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
  -- Rebalanced ~25% lower caps
  v_max_xp INTEGER := CASE WHEN p_frequency = 'weekly' THEN 45 WHEN p_frequency = 'once' THEN 30 ELSE 22 END;
  v_max_forge INTEGER := CASE WHEN p_frequency = 'weekly' THEN 40 WHEN p_frequency = 'once' THEN 32 ELSE 24 END;
  v_max_gold INTEGER := CASE WHEN p_frequency = 'weekly' THEN 40 WHEN p_frequency = 'once' THEN 28 ELSE 20 END;
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
    player_xp_reward, forge_xp_reward, gold_reward, rebalance_version
  )
  VALUES (
    v_uid,
    'h-' || substr(gen_random_uuid()::text, 1, 12),
    left(trim(p_name), 100),
    COALESCE(NULLIF(trim(p_category), ''), 'discipline'),
    v_freq,
    COALESCE(NULLIF(trim(p_icon_name), ''), 'Sparkles'),
    LEAST(v_max_xp, GREATEST(5, COALESCE(p_player_xp, 11))),
    LEAST(v_max_forge, GREATEST(5, COALESCE(p_forge_xp, 16))),
    LEAST(v_max_gold, GREATEST(5, COALESCE(p_gold, 12))),
    2
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'habit', to_jsonb(v_row));
END;
$$;

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
  v_today_claims INTEGER := 0;
  v_daily_cap_reached BOOLEAN := false;
  v_xp INTEGER := 0;
  v_forge INTEGER := 0;
  v_gold INTEGER := 0;
  v_aether INTEGER := 12;
  v_streak_mult NUMERIC := 1.0;
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

  -- Daily anti-farm cap: up to 8 rewarded habits per calendar day
  SELECT count(*) INTO v_today_claims
  FROM public.habit_logs
  WHERE user_id = v_uid
    AND (created_at AT TIME ZONE COALESCE(NULLIF(v_prof.timezone, ''), 'UTC'))::date =
        (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone, ''), 'UTC'))::date
    AND xp_awarded > 0;

  IF v_today_claims >= 8 THEN
    v_daily_cap_reached := true;
    v_xp := 0;
    v_forge := 0;
    v_gold := 0;
    v_aether := 0;
  ELSE
    v_streak_mult := CASE WHEN v_new_streak >= 7 THEN 1.20 WHEN v_new_streak >= 3 THEN 1.10 ELSE 1.0 END;
    v_xp := LEAST(55, round(v_habit.player_xp_reward * v_streak_mult)::INTEGER);
    v_forge := v_habit.forge_xp_reward;
    v_gold := v_habit.gold_reward;
    v_aether := 12;
  END IF;

  INSERT INTO public.habit_logs (
    user_id, habit_id, frequency_type, period_key,
    xp_awarded, forge_xp_awarded, gold_awarded, aether_points_awarded,
    idempotency_key, habit_data
  )
  VALUES (
    v_uid, p_habit_id, v_habit.frequency, v_period_key,
    v_xp, v_forge, v_gold, v_aether,
    p_idempotency_key,
    jsonb_build_object('habitId', p_habit_id, 'habitName', v_habit.name, 'periodKey', v_period_key, 'streak', v_new_streak, 'completedAt', now())
  );

  UPDATE public.habits
  SET streak = v_new_streak, last_period_key = v_period_key, last_completed_at = now()
  WHERE user_id = v_uid AND id = p_habit_id;

  IF NOT v_daily_cap_reached THEN
    v_prof := public._credit_currencies(
      v_uid,
      v_xp,
      v_forge,
      v_gold,
      v_aether,
      'habit',
      p_habit_id,
      'Habit: ' || v_habit.name,
      p_idempotency_key
    );

    PERFORM public._grant_weapon_mastery(v_uid, v_prof.equipped_weapon_id, 18);
    PERFORM public._record_verified_guild_contribution(v_uid, 10, 'habit', p_habit_id);
  END IF;

  UPDATE public.profiles
  SET current_streak = GREATEST(current_streak, v_new_streak)
  WHERE id = v_uid
  RETURNING * INTO v_prof;

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
    'dailyCapReached', v_daily_cap_reached,
    'xpAwarded', v_xp,
    'forgeXpAwarded', v_forge,
    'goldAwarded', v_gold,
    'profile', to_jsonb(v_prof)
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'alreadyClaimed', true, 'error', 'Duplicate claim rejected by database protection.');
END;
$$;

-- Rebalanced Boss Victory XP (~26-28% lower) + tighter daily repeat protection + guild contribution
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
  v_aether INTEGER := 50;
  v_next_kingdom TEXT;
  v_today_key TEXT;
  v_is_first_clear BOOLEAN := false;
  v_repeat_cooldown BOOLEAN := false;
  v_today_repeat_clears INTEGER := 0;
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

  -- Difficulty-scaled rebalanced Boss XP (~26-28% lower than pre-rebalance)
  v_xp := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 130
    WHEN 'kingdom-mountain' THEN 220
    WHEN 'kingdom-ocean' THEN 330
    WHEN 'kingdom-desert' THEN 480
    ELSE 860
  END;
  v_forge := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 130
    WHEN 'kingdom-mountain' THEN 225
    WHEN 'kingdom-ocean' THEN 340
    WHEN 'kingdom-desert' THEN 480
    ELSE 780
  END;
  v_gold := CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN 100
    WHEN 'kingdom-mountain' THEN 170
    WHEN 'kingdom-ocean' THEN 260
    WHEN 'kingdom-desert' THEN 380
    ELSE 680
  END;

  v_today_key := public.resolve_period_key('daily', v_prof.timezone);
  v_is_first_clear := NOT v_be.first_clear_claimed;

  IF NOT v_is_first_clear THEN
    SELECT count(*) INTO v_today_repeat_clears
    FROM public.boss_encounters
    WHERE user_id = v_uid
      AND last_repeat_reward_period_key = v_today_key
      AND times_defeated > 1;

    -- Repeat clear bounty capped to once per daily period per kingdom AND max 2 rewarded repeats per day
    IF v_be.last_repeat_reward_period_key = v_today_key OR v_today_repeat_clears >= 2 THEN
      v_repeat_cooldown := true;
      v_xp := 0;
      v_forge := 0;
      v_gold := 0;
      v_aether := 0;
    ELSE
      v_xp := round(v_xp * 0.35)::INTEGER;
      v_forge := round(v_forge * 0.35)::INTEGER;
      v_gold := round(v_gold * 0.35)::INTEGER;
      v_aether := 15;
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
    v_prof := public._credit_currencies(
      v_uid, v_xp, v_forge, v_gold, v_aether,
      'boss_victory', p_kingdom_id, 'Boss Defeated: ' || v_be.boss_id, p_idempotency_key
    );
    PERFORM public._record_verified_guild_contribution(v_uid, 50, 'boss_victory', p_kingdom_id);
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

-- Also align rpc_bootstrap_player_state default habit seed with rebalanced rewards (11, 15, 18, 11, 11, 32)
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef('public.rpc_bootstrap_player_state()'::regprocedure) INTO v_def;
  IF v_def IS NOT NULL AND position('''Drink 8 Glasses of Water'', ''nutrition'', ''daily'', ''Droplets'', 15, 20, 15, 0' IN v_def) > 0 THEN
    v_def := replace(v_def, '''Drink 8 Glasses of Water'', ''nutrition'', ''daily'', ''Droplets'', 15, 20, 15, 0', '''Drink 8 Glasses of Water'', ''nutrition'', ''daily'', ''Droplets'', 11, 20, 12, 0');
    v_def := replace(v_def, '''7+ Hours Restful Sleep'', ''sleep'', ''daily'', ''Moon'', 20, 20, 20, 0', '''7+ Hours Restful Sleep'', ''sleep'', ''daily'', ''Moon'', 15, 20, 15, 0');
    v_def := replace(v_def, '''30-Minute Movement or Workout'', ''fitness'', ''daily'', ''Activity'', 25, 25, 25, 0', '''30-Minute Movement or Workout'', ''fitness'', ''daily'', ''Activity'', 18, 25, 18, 0');
    v_def := replace(v_def, '''Log a Wholesome Balanced Meal'', ''nutrition'', ''daily'', ''Utensils'', 15, 20, 15, 0', '''Log a Wholesome Balanced Meal'', ''nutrition'', ''daily'', ''Utensils'', 11, 20, 12, 0');
    v_def := replace(v_def, '''10 Minutes Meditation & Mindfulness'', ''mindfulness'', ''daily'', ''Sparkles'', 15, 20, 15, 0', '''10 Minutes Meditation & Mindfulness'', ''mindfulness'', ''daily'', ''Sparkles'', 11, 20, 12, 0');
    v_def := replace(v_def, '''Weekly Deep Review & Planning'', ''discipline'', ''weekly'', ''BookOpen'', 45, 40, 50, 0', '''Weekly Deep Review & Planning'', ''discipline'', ''weekly'', ''BookOpen'', 32, 35, 38, 0');
    EXECUTE v_def;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. LEAST-PRIVILEGE GRANTS & REALTIME SETUP
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_guild_officer_or_leader(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guild_officer_or_leader(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_update_profile_preferences(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_profile_preferences(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_block_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_block_user(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_unblock_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_unblock_user(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_list_blocked_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_list_blocked_users() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_search_champions(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_search_champions(TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_champion_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_champion_profiles(UUID[]) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_public_player_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_public_player_profile(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_send_friend_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_send_friend_request(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_cancel_friend_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cancel_friend_request(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_respond_friend_request(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_respond_friend_request(UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_leaderboard(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_leaderboard(TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_list_guilds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_list_guilds() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_create_guild(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_guild(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_join_guild(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_join_guild(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_request_join_guild(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_request_join_guild(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_respond_guild_request(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_respond_guild_request(UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_invite_to_guild(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_invite_to_guild(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_respond_guild_invite(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_respond_guild_invite(UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_list_my_guild_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_list_my_guild_invites() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_disband_guild(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_disband_guild(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_create_guild_challenge(TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_guild_challenge(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_guild_details(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_guild_details(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_update_guild_details(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_guild_details(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_create_habit(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_habit(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_claim_habit_reward(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_habit_reward(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_complete_boss_victory(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_complete_boss_victory(TEXT, UUID) TO authenticated;

DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'user_blocks',
    'guild_join_requests',
    'guild_invites'
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
