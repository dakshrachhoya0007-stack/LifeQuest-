-- =============================================================================
-- LIFEQUEST AAA GAMING 15-FEATURE SUITE ADDITIVE MIGRATION
-- Preserves all existing player XP, levels, achievements, stats, and ratings.
-- =============================================================================

-- 1. Extend player_identity for dual titles and prestige links
ALTER TABLE IF EXISTS public.player_identity
  ADD COLUMN IF NOT EXISTS equipped_secondary_title_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS prestige_tier INTEGER NOT NULL DEFAULT 0;

-- 2. Server-authoritative Gold & Cosmetic Fragments Wallet Ledger
CREATE TABLE IF NOT EXISTS public.player_wallet_ledger (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gold_balance INTEGER NOT NULL DEFAULT 0 CHECK (gold_balance >= 0),
  cosmetic_fragments INTEGER NOT NULL DEFAULT 0 CHECK (cosmetic_fragments >= 0),
  last_synced_client_gold INTEGER NOT NULL DEFAULT 0,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Collectible Card Binder & Profile Showcase Favorites
CREATE TABLE IF NOT EXISTS public.player_collectible_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  favorite_slot INTEGER NULL CHECK (favorite_slot BETWEEN 1 AND 3),
  first_obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_ref TEXT NULL,
  UNIQUE (user_id, card_id)
);

CREATE TABLE IF NOT EXISTS public.player_card_packs_opened (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  currency_used TEXT NOT NULL,
  spent_amount INTEGER NOT NULL DEFAULT 0,
  cards_drawn JSONB NOT NULL DEFAULT '[]'::jsonb,
  fragments_granted INTEGER NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Multi-Loadout Cosmetic Presets (Strictly Cosmetic)
CREATE TABLE IF NOT EXISTS public.player_loadouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 8),
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_competition BOOLEAN NOT NULL DEFAULT FALSE,
  frame_id TEXT NULL,
  banner_id TEXT NULL,
  hairstyle_id TEXT NULL,
  outfit_id TEXT NULL,
  color_id TEXT NULL,
  aura_id TEXT NULL,
  primary_title_id TEXT NULL,
  secondary_title_id TEXT NULL,
  badge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  showcase_card_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slot_index)
);

-- 5. Friendship Progression & Cooperative Missions
CREATE TABLE IF NOT EXISTS public.player_friendships_progression (
  pair_key TEXT PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friendship_xp INTEGER NOT NULL DEFAULT 0 CHECK (friendship_xp >= 0),
  friendship_level INTEGER NOT NULL DEFAULT 1 CHECK (friendship_level >= 1),
  total_coop_activities INTEGER NOT NULL DEFAULT 0,
  completed_mission_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_reward_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  interaction_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Cosmetic Marketplace Wishlist & Order Ledger
CREATE TABLE IF NOT EXISTS public.marketplace_wishlists (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  price_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Peer Reputation & Endorsement System
CREATE TABLE IF NOT EXISTS public.player_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('helpfulness', 'sportsmanship', 'consistency', 'encouragement')),
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_endorsement_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endorsement_id UUID NULL REFERENCES public.player_endorsements(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Additive Prestige Honor Layer (Zero Resets)
CREATE TABLE IF NOT EXISTS public.player_prestige (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prestige_tier INTEGER NOT NULL DEFAULT 0 CHECK (prestige_tier >= 0 AND prestige_tier <= 10),
  prestige_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_challenge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_reward_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Flexible Daily Reward Calendar (Supports Workout & Rest/Recovery Check-in + Grace)
CREATE TABLE IF NOT EXISTS public.player_daily_calendar_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 31),
  date_key TEXT NOT NULL,
  check_in_mode TEXT NOT NULL CHECK (check_in_mode IN ('workout', 'rest_recovery', 'grace_catchup')),
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date_key),
  UNIQUE (user_id, month_key, day_number)
);

-- 10. Community Tournaments & Read-Only Spectator Actions
CREATE TABLE IF NOT EXISTS public.community_tournaments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rivals_spectator_follows (
  spectator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (spectator_user_id, competitor_user_id)
);

CREATE TABLE IF NOT EXISTS public.rivals_spectator_cheers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  spectator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Archived Seasonal Statistics Recaps
CREATE TABLE IF NOT EXISTS public.seasonal_stat_recaps (
  season_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, user_id)
);

-- Enable Row Level Security safely
ALTER TABLE IF EXISTS public.player_wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_collectible_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_card_packs_opened ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_friendships_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_endorsement_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_prestige ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_daily_calendar_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rivals_spectator_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rivals_spectator_cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seasonal_stat_recaps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_self_rw') THEN
    CREATE POLICY wallet_self_rw ON public.player_wallet_ledger FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cards_self_rw') THEN
    CREATE POLICY cards_self_rw ON public.player_collectible_cards FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loadouts_public_read') THEN
    CREATE POLICY loadouts_public_read ON public.player_loadouts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loadouts_self_write') THEN
    CREATE POLICY loadouts_self_write ON public.player_loadouts FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prestige_public_read') THEN
    CREATE POLICY prestige_public_read ON public.player_prestige FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'endorsements_read') THEN
    CREATE POLICY endorsements_read ON public.player_endorsements FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tournaments_read') THEN
    CREATE POLICY tournaments_read ON public.community_tournaments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seasonal_recap_self') THEN
    CREATE POLICY seasonal_recap_self ON public.seasonal_stat_recaps FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
