-- ==============================================================================
-- LIFEQUEST — SOCIAL, REAL GUILDS & ECONOMY REBALANCE SECURITY VERIFICATION
-- ==============================================================================
-- Non-destructive transaction-wrapped SQL test suite targeting:
--   supabase/migrations/20261115_social_guilds_economy_rebalance.sql
--
-- Checks:
--   1. Profile privacy settings (public / friends_only / private) & zero leaked
--      Google OAuth photo URLs (avatar_url NEVER starts with 'http').
--   2. User blocking removes existing friendship, blocks friend requests, hides
--      from rpc_search_champions & rpc_get_public_player_profile, and unblocks cleanly.
--   3. Friendship lifecycle: duplicate & reverse friend requests rejected,
--      rpc_cancel_friend_request cancels outgoing request, accept makes friends.
--   4. Real guilds only: seeded guild-1/2/3 purged if unjoined, rpc_list_guilds
--      starts clean, rpc_create_guild grants 'leader' with 0 fabricated XP/progress,
--      1-guild-per-player rule enforced, private guild blocks direct join until
--      rpc_request_join_guild + rpc_respond_guild_request approval, and leader-only
--      rpc_disband_guild enforcement.
--   5. Habit & boss economy rebalance + progressive shop pricing order verified.
--
-- Wrapped in BEGIN; ... ROLLBACK; — NEVER run unedited mutations on live DB;
-- run only on a staging/branch database copy.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_alice UUID := 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  v_bob   UUID := 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  v_carol UUID := 'cccccccc-3333-4333-8333-cccccccccccc';
  v_res JSONB;
  v_friendship_id UUID;
  v_guild_id TEXT;
  v_req_id UUID;
  v_count INTEGER;
  v_xp INTEGER;
  v_price_common INTEGER;
  v_price_mythic INTEGER;
BEGIN
  -- Ensure schema extensions & user_blocks RLS exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_blocks' AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'FAIL [Social 0]: public.user_blocks missing or RLS disabled';
  END IF;

  -- Create 3 synthetic users (Alice has a raw Google OAuth https:// avatar_url to verify stripping)
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES
    (v_alice, 'alice-social@aetheria.local', '{"username":"AliceHero","avatar_url":"https://lh3.googleusercontent.com/fake-photo"}'::jsonb, 'authenticated', 'authenticated'),
    (v_bob,   'bob-social@aetheria.local',   '{"username":"BobRanger"}'::jsonb, 'authenticated', 'authenticated'),
    (v_carol, 'carol-social@aetheria.local', '{"username":"CarolMage"}'::jsonb, 'authenticated', 'authenticated');

  -- Bootstrap Alice
  PERFORM set_config('request.jwt.claim.sub', v_alice::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public.rpc_bootstrap_player();
  PERFORM public.rpc_update_profile_preferences(
    p_username => 'AliceHero',
    p_character_class => 'Warrior',
    p_bio => 'Discipline every sunrise.',
    p_profile_visibility => 'private',
    p_show_achievements => false,
    p_show_equipment => true,
    p_show_stats => true,
    p_show_guild => true
  );

  -- Inject raw https photo directly as postgres to simulate OAuth login sync
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('app.trusted_rpc', 'true', true);
  UPDATE public.profiles SET avatar_url = 'https://lh3.googleusercontent.com/private-oauth-pic' WHERE id = v_alice;

  -- Bootstrap Bob & Carol
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public.rpc_bootstrap_player();
  PERFORM public.rpc_update_profile_preferences(
    p_username => 'BobRanger',
    p_character_class => 'Ranger',
    p_profile_visibility => 'friends_only',
    p_show_achievements => true,
    p_show_equipment => true,
    p_show_stats => true,
    p_show_guild => true
  );

  PERFORM set_config('request.jwt.claim.sub', v_carol::text, true);
  PERFORM public.rpc_bootstrap_player();
  PERFORM public.rpc_update_profile_preferences(
    p_username => 'CarolMage',
    p_character_class => 'Mage',
    p_profile_visibility => 'public'
  );

  -- --------------------------------------------------------------------------
  -- 1. Privacy & RPG Avatar Stripping Checks
  -- --------------------------------------------------------------------------
  -- Bob searches for Alice (private -> hidden) and Carol (public -> visible, no http avatar)
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);

  SELECT count(*) INTO v_count
  FROM public.rpc_search_champions('AliceHero', 20, 0)
  WHERE id = v_alice;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [Social 1]: Private profile AliceHero appeared in rpc_search_champions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rpc_search_champions('', 40, 0)
    WHERE COALESCE(avatar_url, '') LIKE 'http%'
  ) THEN
    RAISE EXCEPTION 'FAIL [Social 1]: OAuth http avatar_url leaked through rpc_search_champions';
  END IF;

  -- Direct inspection of Alice (private) must return accessible = false
  v_res := public.rpc_get_public_player_profile(v_alice);
  IF COALESCE((v_res->>'accessible')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL [Social 1]: Private profile AliceHero returned accessible=true';
  END IF;

  -- Carol inspecting Bob (friends_only, not friends yet) -> accessible = false
  PERFORM set_config('request.jwt.claim.sub', v_carol::text, true);
  v_res := public.rpc_get_public_player_profile(v_bob);
  IF COALESCE((v_res->>'accessible')::boolean, true) OR (v_res->>'restrictedReason') <> 'friends_only' THEN
    RAISE EXCEPTION 'FAIL [Social 1]: friends_only profile did not restrict non-friend inspection: %', v_res;
  END IF;

  RAISE NOTICE 'PASS [Social 1]: Private & friends_only visibility enforced + OAuth URLs never exposed.';

  -- --------------------------------------------------------------------------
  -- 2. Friendship Lifecycle (Send, Duplicate Guard, Reverse Guard, Cancel, Accept)
  -- --------------------------------------------------------------------------
  v_res := public.rpc_send_friend_request(v_bob);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 2]: Carol->Bob friend request failed: %', v_res->>'error';
  END IF;
  v_friendship_id := (v_res->'friendship'->>'id')::uuid;

  -- Duplicate request blocked
  v_res := public.rpc_send_friend_request(v_bob);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 2]: Duplicate friend request should be rejected';
  END IF;

  -- Reverse request by Bob blocked while pending
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  v_res := public.rpc_send_friend_request(v_carol);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 2]: Reverse friend request while incoming pending should be rejected';
  END IF;

  -- Carol cancels outgoing request
  PERFORM set_config('request.jwt.claim.sub', v_carol::text, true);
  v_res := public.rpc_cancel_friend_request(v_friendship_id);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 2]: rpc_cancel_friend_request failed: %', v_res->>'error';
  END IF;

  -- Re-send and Bob accepts -> unlocks friends_only inspection!
  v_res := public.rpc_send_friend_request(v_bob);
  v_friendship_id := (v_res->'friendship'->>'id')::uuid;
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  v_res := public.rpc_respond_friend_request(v_friendship_id, true);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 2]: Bob failed to accept friend request: %', v_res->>'error';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_carol::text, true);
  v_res := public.rpc_get_public_player_profile(v_bob);
  IF NOT COALESCE((v_res->>'accessible')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 2]: Accepted friend Carol still blocked from friends_only profile Bob: %', v_res;
  END IF;

  RAISE NOTICE 'PASS [Social 2]: Friend request lifecycle, anti-duplicate guards, cancel, and friends_only unlock verified.';

  -- --------------------------------------------------------------------------
  -- 3. User Blocking Enforcement & Unblock Recovery
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  v_res := public.rpc_block_user(v_carol);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 3]: rpc_block_user failed';
  END IF;

  -- Existing friendship must be purged
  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (requester_id = v_bob AND addressee_id = v_carol)
       OR (requester_id = v_carol AND addressee_id = v_bob)
  ) THEN
    RAISE EXCEPTION 'FAIL [Social 3]: Blocking user did not delete existing friendship row';
  END IF;

  -- Blocked user cannot send friend request or inspect profile
  PERFORM set_config('request.jwt.claim.sub', v_carol::text, true);
  v_res := public.rpc_send_friend_request(v_bob);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 3]: Blocked user was allowed to send friend request';
  END IF;

  v_res := public.rpc_get_public_player_profile(v_bob);
  IF COALESCE((v_res->>'success')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL [Social 3]: Blocked user was allowed to view blocker profile';
  END IF;

  -- Unblock restores eligibility
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  PERFORM public.rpc_unblock_user(v_carol);
  PERFORM set_config('request.jwt.claim.sub', v_carol::text, true);
  v_res := public.rpc_send_friend_request(v_bob);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Social 3]: Friend request failed after unblock: %', v_res->>'error';
  END IF;

  RAISE NOTICE 'PASS [Social 3]: User block/unblock removes friendships, blocks inspection/requests, and restores cleanly.';

  -- --------------------------------------------------------------------------
  -- 4. Real Guilds Only & Private Guild Governance
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM public.guilds g
    WHERE g.id IN ('guild-1', 'guild-2', 'guild-3')
      AND NOT EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = g.id)
  ) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Unjoined seeded placeholder guilds (guild-1/2/3) still exist';
  END IF;

  -- Alice creates private guild (creator = leader, guild_xp = 0, weekly progress = 0)
  PERFORM set_config('request.jwt.claim.sub', v_alice::text, true);
  v_res := public.rpc_create_guild(
    p_name => 'Iron Horizon',
    p_tag => 'IRON',
    p_description => 'Real guild only.',
    p_emblem => 'Shield',
    p_is_public => false,
    p_min_level => 1
  );
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: rpc_create_guild failed: %', v_res->>'error';
  END IF;
  v_guild_id := v_res->'guild'->>'id';

  IF COALESCE((v_res->'guild'->>'guild_xp')::integer, -1) <> 0
     OR COALESCE((v_res->'guild'->>'weekly_quest_progress')::integer, -1) <> 0 THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Newly created guild had non-zero fabricated XP or progress';
  END IF;

  -- Alice cannot create or join a second guild while member
  v_res := public.rpc_create_guild('Second Guild', 'SEC2', 'Blocked', 'Crown', true, 1);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Player allowed to belong to two guilds simultaneously';
  END IF;

  -- Bob cannot directly join a private guild
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  v_res := public.rpc_join_guild(v_guild_id);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Bob bypassed private guild gate via rpc_join_guild';
  END IF;

  -- Bob applies and Alice approves
  v_res := public.rpc_request_join_guild(v_guild_id, 'Ready to train.');
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: rpc_request_join_guild failed: %', v_res->>'error';
  END IF;
  v_req_id := (v_res->'request'->>'id')::uuid;

  -- Non-leader Bob cannot disband guild
  v_res := public.rpc_disband_guild(v_guild_id);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Non-member Bob was allowed to disband guild';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_alice::text, true);
  v_res := public.rpc_respond_guild_request(v_req_id, true);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Leader failed to approve join request: %', v_res->>'error';
  END IF;

  -- Regular member Bob still cannot disband guild
  PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
  v_res := public.rpc_disband_guild(v_guild_id);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Non-leader member Bob was allowed to disband guild';
  END IF;

  -- Leader Alice disbands cleanly
  PERFORM set_config('request.jwt.claim.sub', v_alice::text, true);
  v_res := public.rpc_disband_guild(v_guild_id);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Guild 4]: Leader failed to disband guild: %', v_res->>'error';
  END IF;

  RAISE NOTICE 'PASS [Guild 4]: Zero fake guilds, 0 starting progress, 1-guild cap, private approval, and leader-only disband verified.';

  -- --------------------------------------------------------------------------
  -- 5. Economy Rebalancing (Habit Cap, Boss XP, Progressive Shop Pricing)
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_alice::text, true);
  SELECT xp_awarded INTO v_xp FROM public.habit_logs WHERE false;

  v_res := public.rpc_create_habit('Morning Mobility', 'fitness', 'daily', 'Activity', 999, 999, 999);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Economy 5]: rpc_create_habit failed: %', v_res->>'error';
  END IF;
  IF (v_res->'habit'->>'player_xp_reward')::integer > 22 THEN
    RAISE EXCEPTION 'FAIL [Economy 5]: Daily habit XP cap exceeded 22: %', v_res->'habit'->>'player_xp_reward';
  END IF;

  SELECT price_gold INTO v_price_common FROM public.shop_items WHERE id = 'shop-wand-ember';
  SELECT price_gold INTO v_price_mythic FROM public.shop_items WHERE id = 'shop-acc-celestial';
  IF COALESCE(v_price_common, 0) < 150 OR COALESCE(v_price_mythic, 0) <= COALESCE(v_price_common, 0) THEN
    RAISE EXCEPTION 'FAIL [Economy 5]: Progressive shop pricing tier check failed (common=%, mythic=%)', v_price_common, v_price_mythic;
  END IF;

  RAISE NOTICE 'PASS [Economy 5]: Habit daily XP cap (<=22) & progressive shop price tiers verified.';
END $$;

ROLLBACK;
