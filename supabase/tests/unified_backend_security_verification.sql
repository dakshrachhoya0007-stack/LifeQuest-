-- ==============================================================================
-- LIFEQUEST — UNIFIED BACKEND 10-POINT SECURITY & SCHEMA VERIFICATION SUITE
-- ==============================================================================
-- PURPOSE:
--   Runs non-destructive, transaction-wrapped verification checks against
--   supabase/migrations/20261113_unified_backend.sql BEFORE production release.
--   Entire script is wrapped in BEGIN; ... ROLLBACK; so zero test data persists.
--
-- USAGE:
--   Run against a Staging/Branch DB (or disposable copy) via psql or Supabase SQL Editor:
--     psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/unified_backend_security_verification.sql
--
-- EXPECTED RESULT:
--   Raises NOTICE lines for Tests 1 through 10 and finishes cleanly with ROLLBACK.
--   Any failed assertion raises an EXCEPTION and aborts cleanly.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a UUID := '11111111-1111-4111-8111-111111111111';
  v_user_b UUID := '22222222-2222-4222-8222-222222222222';
  v_user_c UUID := '33333333-3333-4333-8333-333333333333';
  v_res JSONB;
  v_gold_before INTEGER;
  v_gold_after INTEGER;
  v_forge_before INTEGER;
  v_guild_id TEXT;
  v_owner_after UUID;
  v_role_after TEXT;
  v_idem1 UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_idem2 UUID := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_idem3 UUID := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_idem4 UUID := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_idem5 UUID := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_i INTEGER;
  v_count INTEGER;
  v_err_caught BOOLEAN;
  v_missing_tbl TEXT;
  v_rls_off_tbl TEXT;
  v_required_20 TEXT[] := ARRAY[
    'habits', 'hydration_daily', 'economy_transactions', 'shop_items',
    'player_weapons', 'player_buffs', 'player_purchases',
    'quests_catalog', 'player_quest_progress', 'achievements_catalog', 'player_achievements',
    'boss_encounters',
    'guilds', 'guild_members', 'guild_challenges', 'guild_challenge_contributions',
    'friendships', 'chat_messages', 'chat_reports', 'notifications'
  ];
  v_original_5 TEXT[] := ARRAY[
    'profiles', 'game_states', 'workout_sessions', 'nutrition_logs', 'habit_logs'
  ];
  v_tbl TEXT;
BEGIN
  -- ============================================================================
  -- TEST 1: SCHEMA COMPLETENESS (ALL 20 NEW TABLES + 5 ORIGINAL + DIRECTORY)
  -- ============================================================================
  FOREACH v_tbl IN ARRAY v_required_20
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_tbl AND table_type = 'BASE TABLE'
    ) THEN
      RAISE EXCEPTION 'FAIL [Test 1]: Missing required new table public.%', v_tbl;
    END IF;
  END LOOP;

  FOREACH v_tbl IN ARRAY v_original_5
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_tbl AND table_type = 'BASE TABLE'
    ) THEN
      RAISE EXCEPTION 'FAIL [Test 1]: Missing original preserved table public.%', v_tbl;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'public_champion_directory'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'champion_public_profiles'
  ) THEN
    RAISE EXCEPTION 'FAIL [Test 1]: Missing public_champion_directory or champion_public_profiles view';
  END IF;

  -- Ensure private onboarding/health fields are NEVER exposed in public directory or view
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('public_champion_directory', 'champion_public_profiles')
      AND column_name IN (
        'age_years', 'age_group', 'biological_sex',
        'height', 'weight', 'food_allergies', 'food_intolerances',
        'disliked_foods', 'preferred_fitness_activities', 'fitness_goals',
        'notification_preferences', 'timezone'
      )
  ) THEN
    RAISE EXCEPTION 'FAIL [Test 1]: Private profile/health columns exposed on public directory or champion_public_profiles view';
  END IF;
  RAISE NOTICE 'PASS [Test 1]: All 20 new tables, 5 original tables, directory table, and view exist (private fields isolated).';

  -- ============================================================================
  -- TEST 2: RLS ENABLED ON ALL 26 TABLES & LEAST-PRIVILEGE GRANTS
  -- ============================================================================
  FOREACH v_tbl IN ARRAY (v_required_20 || v_original_5 || ARRAY['public_champion_directory'])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_tbl AND c.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'FAIL [Test 2]: Row Level Security (RLS) is NOT enabled on public.%', v_tbl;
    END IF;

    IF has_table_privilege('anon', 'public.' || v_tbl, 'SELECT')
       OR has_table_privilege('anon', 'public.' || v_tbl, 'INSERT')
       OR has_table_privilege('anon', 'public.' || v_tbl, 'UPDATE')
       OR has_table_privilege('anon', 'public.' || v_tbl, 'DELETE') THEN
      RAISE EXCEPTION 'FAIL [Test 2]: anon role retains table privilege on public.%', v_tbl;
    END IF;
  END LOOP;

  -- Profiles must allow UPDATE ONLY on safe preference columns, NEVER progression columns
  IF has_column_privilege('authenticated', 'public.profiles', 'gold_balance', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'level', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'forge_xp', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'player_xp', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'aether_points', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL [Test 2]: authenticated has column UPDATE privilege on authoritative progression column(s)';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'timezone', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL [Test 2]: authenticated missing column UPDATE privilege on profiles.timezone';
  END IF;

  IF has_table_privilege('anon', 'public.champion_public_profiles', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL [Test 2]: anon must NOT have SELECT on champion_public_profiles';
  END IF;
  RAISE NOTICE 'PASS [Test 2]: RLS enabled on all 26 tables; anon locked out; profiles column-level UPDATE verified.';

  -- ============================================================================
  -- TEST 3: INTERNAL HELPER & ANON RPC PRIVILEGE REVOCATION CHECK
  -- ============================================================================
  IF has_function_privilege('anon', 'public._credit_currencies(uuid,integer,integer,integer,integer,text,text,text,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._credit_currencies(uuid,integer,integer,integer,integer,text,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL [Test 3]: _credit_currencies EXECUTE must be revoked from anon & authenticated';
  END IF;
  IF has_function_privilege('anon', 'public._grant_weapon_mastery(uuid,text,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._grant_weapon_mastery(uuid,text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL [Test 3]: _grant_weapon_mastery EXECUTE must be revoked from anon & authenticated';
  END IF;
  IF has_function_privilege('anon', 'public._transfer_guild_ownership_on_leave(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._transfer_guild_ownership_on_leave(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL [Test 3]: _transfer_guild_ownership_on_leave EXECUTE must be revoked from anon & authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.rpc_claim_habit_reward(text,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.rpc_bootstrap_player_state()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.rpc_list_guilds()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.rpc_manage_guild_member(text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL [Test 3]: anon must NOT have EXECUTE on user RPCs';
  END IF;
  RAISE NOTICE 'PASS [Test 3]: Internal helper & anon RPC EXECUTE privileges properly revoked.';

  -- ----------------------------------------------------------------------------
  -- SETUP: Three isolated test users inside auth.users (rolled back at end)
  -- ----------------------------------------------------------------------------
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit_alpha@example.test', 'x', now(), '{"username":"AuditAlpha"}'::jsonb, now(), now()),
    (v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit_bravo@example.test', 'x', now(), '{"username":"AuditBravo"}'::jsonb, now(), now()),
    (v_user_c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit_charlie@example.test', 'x', now(), '{"username":"AuditCharlie"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Seed legacy records across original 5 tables for User A to verify preservation & clamping
  INSERT INTO public.game_states (user_id, game_data)
  VALUES (
    v_user_a,
    '{"stats":{"level":999,"playerXP":999999,"playerXPNextLevel":100,"forgeXP":9999999,"gold":9999999,"aetherPoints":999999,"currentStreak":9999}}'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE SET game_data = EXCLUDED.game_data;

  INSERT INTO public.workout_sessions (user_id, exercise_type, exercise_name, duration_minutes, workout_data)
  VALUES (v_user_a, 'strength', 'Legacy Pushups', 15, '{"title":"Legacy Pushups"}'::jsonb);

  INSERT INTO public.nutrition_logs (user_id, meal_type, title, meal_data)
  VALUES (v_user_a, 'lunch', 'Legacy Bowl', '{"title":"Legacy Bowl"}'::jsonb);

  -- Foreign key & unique constraint checks (as superuser before dropping to authenticated)
  v_err_caught := false;
  BEGIN
    INSERT INTO public.player_purchases (user_id, item_id, price_gold)
    VALUES (v_user_a, 'non-existent-item-999', 10);
  EXCEPTION WHEN foreign_key_violation THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'FAIL [Test 4 Setup]: FK fk/player_purchases.item_id allowed non-existent item_id';
  END IF;

  -- ============================================================================
  -- SWITCH SESSION TO AUTHENTICATED USER A
  -- ============================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- ============================================================================
  -- TEST 4: BOOTSTRAP CLAMPING, LEGACY PRESERVATION, STARTER WEAPONS & IDEMPOTENCY
  -- ============================================================================
  v_res := public.rpc_bootstrap_player_state();
  IF (v_res->'profile'->>'level')::INTEGER > 50
     OR (v_res->'profile'->>'gold_balance')::INTEGER > 10000
     OR (v_res->'profile'->>'forge_xp')::INTEGER > 10000 THEN
    RAISE EXCEPTION 'FAIL [Test 4]: Legacy backfill values were not clamped (%)', v_res->'profile';
  END IF;
  IF NOT COALESCE((v_res->'profile'->>'legacy_migrated')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 4]: legacy_migrated flag not set to true after bootstrap';
  END IF;
  IF jsonb_array_length(v_res->'weapons') < 4 THEN
    RAISE EXCEPTION 'FAIL [Test 4]: Expected 4 starter weapons seeded on bootstrap, got %', jsonb_array_length(v_res->'weapons');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workout_sessions WHERE user_id = v_user_a AND exercise_name = 'Legacy Pushups')
     OR NOT EXISTS (SELECT 1 FROM public.nutrition_logs WHERE user_id = v_user_a AND title = 'Legacy Bowl') THEN
    RAISE EXCEPTION 'FAIL [Test 4]: Existing workout_sessions / nutrition_logs rows were not preserved!';
  END IF;
  RAISE NOTICE 'PASS [Test 4]: Bootstrap clamped legacy stats, preserved legacy data, and seeded starter weapons.';

  -- ============================================================================
  -- TEST 5: DIRECT CLIENT MUTATION BLOCKS (PROFILES & LEGACY TABLES)
  -- ============================================================================
  v_err_caught := false;
  BEGIN
    UPDATE public.profiles SET gold_balance = 999999 WHERE id = v_user_a;
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'FAIL [Test 5a]: Client was able to directly update profiles.gold_balance';
  END IF;

  v_err_caught := false;
  BEGIN
    UPDATE public.profiles SET level = 99, forge_xp = 99999 WHERE id = v_user_a;
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'FAIL [Test 5b]: Client was able to directly update profiles.level / forge_xp';
  END IF;

  v_err_caught := false;
  BEGIN
    INSERT INTO public.game_states (user_id, game_data) VALUES (v_user_a, '{}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'FAIL [Test 5c]: Client was able to directly INSERT into game_states';
  END IF;

  v_err_caught := false;
  BEGIN
    INSERT INTO public.habit_logs (user_id, habit_id, period_key, habit_data)
    VALUES (v_user_a, 'h-1', 'fake', '{}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'FAIL [Test 5d]: Client was able to directly INSERT into habit_logs';
  END IF;

  -- Verify allowed preference update succeeds (e.g., Edge Function / profile settings updating timezone)
  UPDATE public.profiles SET timezone = 'America/New_York', last_active_at = now() WHERE id = v_user_a;
  RAISE NOTICE 'PASS [Test 5]: Authoritative progression columns & legacy tables locked; timezone preference update allowed.';

  -- ============================================================================
  -- TEST 6: HABIT ANTI-EXPLOIT (DOUBLE CLAIM, DELETE BLOCK, CREATION CAPS)
  -- ============================================================================
  SELECT gold_balance INTO v_gold_before FROM public.profiles WHERE id = v_user_a;
  v_res := public.rpc_claim_habit_reward('h-1', v_idem1);
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 6a]: First daily habit claim failed: %', v_res;
  END IF;

  SELECT gold_balance INTO v_gold_after FROM public.profiles WHERE id = v_user_a;
  v_res := public.rpc_claim_habit_reward('h-1', v_idem1);
  IF NOT COALESCE((v_res->>'deduplicated')::BOOLEAN, false)
     OR (v_res->'profile'->>'gold_balance')::INTEGER <> v_gold_after THEN
    RAISE EXCEPTION 'FAIL [Test 6b]: Idempotency replay double-credited or failed: %', v_res;
  END IF;

  v_res := public.rpc_claim_habit_reward('h-1', v_idem2);
  IF COALESCE((v_res->>'success')::BOOLEAN, true) OR NOT COALESCE((v_res->>'alreadyClaimed')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 6c]: Duplicate daily habit claim was not rejected: %', v_res;
  END IF;

  v_err_caught := false;
  BEGIN
    DELETE FROM public.habit_logs WHERE user_id = v_user_a;
  EXCEPTION WHEN insufficient_privilege THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'FAIL [Test 6d]: Client was able to DELETE habit_logs rows';
  END IF;

  FOR v_i IN 1..6 LOOP
    v_res := public.rpc_create_habit('Audit Habit #' || v_i, 'discipline', 'daily', 'Sparkles', 500, 500, 500);
    IF v_i <= 5 AND NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
      RAISE EXCEPTION 'FAIL [Test 6e]: Habit #% creation unexpectedly rejected: %', v_i, v_res;
    END IF;
    IF v_i = 1 AND (v_res->'habit'->>'gold_reward')::INTEGER > 25 THEN
      RAISE EXCEPTION 'FAIL [Test 6f]: Custom habit reward was not clamped server-side: %', v_res->'habit';
    END IF;
    IF v_i = 6 AND COALESCE((v_res->>'success')::BOOLEAN, true) THEN
      RAISE EXCEPTION 'FAIL [Test 6g]: 6th habit created on same day exceeded daily cap of 5';
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS [Test 6]: Habit double-claim, idempotency, log deletion block, and creation/reward caps verified.';

  -- ============================================================================
  -- TEST 7: HYDRATION RESET ANTI-EXPLOIT & WORKOUT + GUILD CONTRIBUTION LEDGER
  -- ============================================================================
  FOR v_i IN 1..8 LOOP
    v_res := public.rpc_log_water_glass();
  END LOOP;
  SELECT gold_balance INTO v_gold_before FROM public.profiles WHERE id = v_user_a;
  IF NOT COALESCE((v_res->>'goalRewardClaimed')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 7a]: 8th glass should claim hydration goal reward';
  END IF;

  PERFORM public.rpc_reset_water_daily();
  FOR v_i IN 1..8 LOOP
    v_res := public.rpc_log_water_glass();
    IF COALESCE((v_res->>'rewardGranted')::BOOLEAN, false) OR COALESCE((v_res->>'goalNewlyClaimed')::BOOLEAN, false) THEN
      RAISE EXCEPTION 'FAIL [Test 7b]: Hydration reset re-granted glass/goal reward on glass #%: %', v_i, v_res;
    END IF;
  END LOOP;
  SELECT gold_balance INTO v_gold_after FROM public.profiles WHERE id = v_user_a;
  IF v_gold_after <> v_gold_before THEN
    RAISE EXCEPTION 'FAIL [Test 7c]: Gold increased across hydration reset (% -> %)', v_gold_before, v_gold_after;
  END IF;
  RAISE NOTICE 'PASS [Test 7]: Hydration reset anti-exploit confirmed (0 Gold re-awarded after reset).';

  -- ============================================================================
  -- TEST 8: BOSS VICTORY STATE MACHINE, REPEAT COOLDOWN & WEAPON MASTERY COOLDOWN
  -- ============================================================================
  v_res := public.rpc_complete_boss_victory('kingdom-forest', v_idem3);
  IF COALESCE((v_res->>'success')::BOOLEAN, true) THEN
    RAISE EXCEPTION 'FAIL [Test 8a]: Direct rpc_complete_boss_victory succeeded without combat';
  END IF;

  v_res := public.rpc_start_boss_encounter('kingdom-forest');
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 8b]: rpc_start_boss_encounter failed: %', v_res;
  END IF;

  FOR v_i IN 1..60 LOOP
    v_res := public.rpc_boss_combat_turn('kingdom-forest', 'attack', NULL);
    EXIT WHEN COALESCE((v_res->>'bossDefeated')::BOOLEAN, false);
    IF COALESCE((v_res->>'playerDefeated')::BOOLEAN, false) THEN
      PERFORM public.rpc_reset_boss_encounter('kingdom-forest');
      PERFORM public.rpc_start_boss_encounter('kingdom-forest');
    END IF;
  END LOOP;
  IF NOT COALESCE((v_res->>'bossDefeated')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 8c]: Could not defeat forest boss within 60 turns';
  END IF;

  v_res := public.rpc_complete_boss_victory('kingdom-forest', v_idem3);
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) OR NOT COALESCE((v_res->>'firstClear')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 8d]: First boss victory claim failed: %', v_res;
  END IF;

  PERFORM public.rpc_start_boss_encounter('kingdom-forest');
  FOR v_i IN 1..60 LOOP
    v_res := public.rpc_boss_combat_turn('kingdom-forest', 'attack', NULL);
    EXIT WHEN COALESCE((v_res->>'bossDefeated')::BOOLEAN, false);
    IF COALESCE((v_res->>'playerDefeated')::BOOLEAN, false) THEN
      PERFORM public.rpc_reset_boss_encounter('kingdom-forest');
      PERFORM public.rpc_start_boss_encounter('kingdom-forest');
    END IF;
  END LOOP;
  v_res := public.rpc_complete_boss_victory('kingdom-forest', v_idem4);
  IF NOT COALESCE((v_res->>'repeatRewardOnCooldown')::BOOLEAN, false) OR (v_res->>'goldAwarded')::INTEGER <> 0 THEN
    RAISE EXCEPTION 'FAIL [Test 8e]: Same-day repeat boss victory should be on cooldown with 0 Gold: %', v_res;
  END IF;

  SELECT gold_balance, forge_xp INTO v_gold_before, v_forge_before FROM public.profiles WHERE id = v_user_a;
  v_res := public.rpc_train_weapon_mastery('w-sword-1', 9999);
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 8f]: First weapon mastery drill failed: %', v_res;
  END IF;
  SELECT gold_balance INTO v_gold_after FROM public.profiles WHERE id = v_user_a;
  IF v_gold_after <> v_gold_before - 15 THEN
    RAISE EXCEPTION 'FAIL [Test 8g]: Weapon mastery drill did not deduct 15 Gold (% -> %)', v_gold_before, v_gold_after;
  END IF;
  v_res := public.rpc_train_weapon_mastery('w-sword-1', 40);
  IF COALESCE((v_res->>'success')::BOOLEAN, true) THEN
    RAISE EXCEPTION 'FAIL [Test 8h]: Immediate second mastery drill bypassed 10-minute cooldown';
  END IF;
  RAISE NOTICE 'PASS [Test 8]: Boss state machine, repeat cooldown, mastery 15 Gold cost, and 10m cooldown verified.';

  -- ============================================================================
  -- TEST 9: CROSS-USER PRIVATE ISOLATION & NON-MEMBER GUILD CHAT/ROSTER ISOLATION
  -- ============================================================================
  v_res := public.rpc_create_guild('Audit Order', 'AUDT', 'Verification Guild');
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 9a]: Guild creation failed: %', v_res;
  END IF;
  v_guild_id := v_res->'guild'->>'id';

  -- User A logs a workout while in guild -> must record guild_challenge_contributions
  v_res := public.rpc_log_workout('strength', 'Pushups', 20, 40, NULL, true, NULL, v_idem5);
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 9b]: rpc_log_workout failed: %', v_res;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guild_challenge_contributions
    WHERE guild_id = v_guild_id AND user_id = v_user_a AND contribution_delta > 0
  ) THEN
    RAISE EXCEPTION 'FAIL [Test 9c]: Workout did not record guild_challenge_contributions';
  END IF;

  -- User A sends private guild chat and private whisper to User C
  PERFORM public.rpc_send_chat_message('guild', 'Secret Guild Raid Plan', v_guild_id, NULL);
  PERFORM public.rpc_send_chat_message('whisper', 'Secret Whisper Alpha->Charlie', NULL, v_user_c);

  -- Hide User A from public leaderboard
  PERFORM public.rpc_update_profile_preferences(p_leaderboard_visible => false);

  -- Switch to User B (NOT a member of User A guild, NOT recipient of whisper)
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.rpc_bootstrap_player_state();

  -- Assert User B cannot see ANY of User A private rows
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_a)
     OR EXISTS (SELECT 1 FROM public.habits WHERE user_id = v_user_a)
     OR EXISTS (SELECT 1 FROM public.economy_transactions WHERE user_id = v_user_a)
     OR EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_user_a)
     OR EXISTS (SELECT 1 FROM public.boss_encounters WHERE user_id = v_user_a)
     OR EXISTS (SELECT 1 FROM public.habit_logs WHERE user_id = v_user_a) THEN
    RAISE EXCEPTION 'FAIL [Test 9d]: User B was able to read User A private table rows!';
  END IF;

  -- Assert User B cannot see hidden User A in champion_public_profiles
  IF EXISTS (SELECT 1 FROM public.champion_public_profiles WHERE id = v_user_a) THEN
    RAISE EXCEPTION 'FAIL [Test 9e]: Hidden User A exposed in champion_public_profiles';
  END IF;

  -- Assert User B (non-member) cannot read User A guild roster, guild challenges, guild contributions, guild chat, or private whisper
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = v_guild_id)
     OR EXISTS (SELECT 1 FROM public.guild_challenges WHERE guild_id = v_guild_id)
     OR EXISTS (SELECT 1 FROM public.guild_challenge_contributions WHERE guild_id = v_guild_id)
     OR EXISTS (SELECT 1 FROM public.chat_messages WHERE channel = 'guild' AND guild_id = v_guild_id)
     OR EXISTS (SELECT 1 FROM public.chat_messages WHERE channel = 'whisper' AND sender_id = v_user_a) THEN
    RAISE EXCEPTION 'FAIL [Test 9f]: Non-member User B accessed private guild/whisper data!';
  END IF;

  -- Confirm non-member User B still sees guild summary count accurately via rpc_list_guilds
  SELECT COUNT(*) INTO v_count FROM public.rpc_list_guilds() g WHERE g.id = v_guild_id AND g.members_count = 1 AND g.is_member = false;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL [Test 9g]: rpc_list_guilds did not return accurate member count to non-member';
  END IF;
  RAISE NOTICE 'PASS [Test 9]: Cross-user privacy, hidden leaderboard, non-member guild/whisper isolation, and workout challenge contributions verified.';

  -- ============================================================================
  -- TEST 10: UNAUTHORIZED GUILD MANAGEMENT REJECTION & OWNERSHIP TRANSFER
  -- ============================================================================
  -- Non-member User B cannot update guild details
  v_res := public.rpc_update_guild_details(v_guild_id, 'Hacked Description', NULL);
  IF COALESCE((v_res->>'success')::BOOLEAN, true) THEN
    RAISE EXCEPTION 'FAIL [Test 10a]: Non-member User B was able to edit guild details';
  END IF;

  -- User B joins guild as 'member' -> still must NOT be allowed to edit guild details or promote self/others
  PERFORM public.rpc_join_guild(v_guild_id);
  v_res := public.rpc_update_guild_details(v_guild_id, 'Member Overwrite', NULL);
  IF COALESCE((v_res->>'success')::BOOLEAN, true) THEN
    RAISE EXCEPTION 'FAIL [Test 10b]: Regular guild member was able to edit guild details';
  END IF;
  v_res := public.rpc_manage_guild_member(v_guild_id, v_user_a, 'kick');
  IF COALESCE((v_res->>'success')::BOOLEAN, true) THEN
    RAISE EXCEPTION 'FAIL [Test 10c]: Regular guild member was able to kick guild leader';
  END IF;

  -- Now User B IS a guild member, so guild_challenges and guild_challenge_contributions MUST become visible
  IF NOT EXISTS (SELECT 1 FROM public.guild_challenge_contributions WHERE guild_id = v_guild_id AND user_id = v_user_a) THEN
    RAISE EXCEPTION 'FAIL [Test 10d]: Joined guild member User B could not view own guild challenge contributions';
  END IF;

  -- Switch back to leader User A -> leader CAN update guild details & promote User B -> leaving transfers ownership to User B
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_res := public.rpc_update_guild_details(v_guild_id, 'Official Guild Charter', NULL);
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 10e]: Guild leader failed to update guild details: %', v_res;
  END IF;

  v_res := public.rpc_manage_guild_member(v_guild_id, v_user_b, 'promote');
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'FAIL [Test 10f]: Guild leader failed to promote member: %', v_res;
  END IF;

  PERFORM public.rpc_leave_guild();

  RESET ROLE;
  SELECT owner_id INTO v_owner_after FROM public.guilds WHERE id = v_guild_id;
  SELECT role INTO v_role_after FROM public.guild_members WHERE guild_id = v_guild_id AND user_id = v_user_b;
  IF v_owner_after <> v_user_b OR v_role_after <> 'leader' THEN
    RAISE EXCEPTION 'FAIL [Test 10g]: Guild ownership did not transfer to remaining member (owner=%, role=%)', v_owner_after, v_role_after;
  END IF;
  RAISE NOTICE 'PASS [Test 10]: Unauthorized guild management rejected; leader actions & ownership transfer verified.';

  RAISE NOTICE '=== ALL 10 SECURITY & SCHEMA VERIFICATION SUITES PASSED CLEANLY ===';
END $$;

ROLLBACK;
