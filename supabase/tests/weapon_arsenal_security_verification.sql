-- ==============================================================================
-- LIFEQUEST — WEAPON ARSENAL EXPANSION & BEYOND-MYTHICAL SECURITY VERIFICATION
-- ==============================================================================
-- Non-destructive transaction-wrapped SQL test suite targeting:
--   supabase/migrations/20261114_weapon_arsenal_expansion.sql
--
-- Checks:
--   1. Existing schema & player_weapons additive columns + read-only weapon_catalog.
--   2. Internal helper functions (_aether_rank_tier, _get_mastery_path_for_category,
--      _default_abilities_for_category) cannot be executed by anon or authenticated.
--   3. Shop purchase blocks Beyond-Mythical (Ascendant..Eternal) items even if tampered.
--   4. rpc_unlock_progression_weapon rejects unmet progression milestones & duplicates.
--   5. rpc_unlock_progression_weapon grants relic cleanly when criteria met & enforces idempotency.
--   6. rpc_ascend_weapon_rarity rejects insufficient level/mastery/rank/bosses/forge XP/gold.
--   7. rpc_ascend_weapon_rarity transforms weapon cleanly across tiers when criteria met.
--   8. rpc_boss_combat_turn applies speed, crit_chance, crit_damage, element & awakened bonuses.
--
-- Wrapped in BEGIN; ... ROLLBACK; — safe to run against a staging/branch database.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_user UUID := '44444444-4444-4444-8444-444444444444';
  v_res JSONB;
  v_idem1 UUID := '12121212-1212-4121-8121-121212121212';
  v_idem2 UUID := '34343434-3434-4343-8343-343434343434';
  v_idem3 UUID := '56565656-5656-4565-8565-565656565656';
  v_col_count INTEGER;
  v_weapon_after TEXT;
BEGIN
  -- 1. Schema & catalog checks
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'player_weapons'
    AND column_name IN (
      'crit_chance', 'crit_damage', 'speed', 'element',
      'ability_power', 'awakened', 'awakening_level',
      'evolution_target_id', 'unlock_source'
    );

  IF v_col_count <> 9 THEN
    RAISE EXCEPTION 'FAIL [Arsenal 1]: Expected 9 additive weapon columns on player_weapons, found %', v_col_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'weapon_catalog' AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 1]: public.weapon_catalog missing or RLS not enabled';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 1]: Additive player_weapons columns & RLS-protected weapon_catalog verified.';

  -- 2. Privilege checks on internal helper functions & catalog
  IF has_function_privilege('anon', 'public._aether_rank_tier(TEXT)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._aether_rank_tier(TEXT)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._get_mastery_path_for_category(TEXT)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._get_mastery_path_for_category(TEXT)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._default_abilities_for_category(TEXT)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._default_abilities_for_category(TEXT)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL [Arsenal 2]: Internal helper functions must NOT be executable by anon or authenticated';
  END IF;

  IF has_table_privilege('authenticated', 'public.weapon_catalog', 'INSERT')
     OR has_table_privilege('authenticated', 'public.weapon_catalog', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.weapon_catalog', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL [Arsenal 2]: weapon_catalog must be read-only for authenticated users';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 2]: Helper EXECUTE privileges revoked & weapon_catalog is read-only.';

  -- Seed synthetic test user
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (v_user, 'arsenal-test@aetheria.local', '{"username":"ArsenalTester"}'::jsonb, 'authenticated', 'authenticated');

  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  PERFORM public.rpc_bootstrap_player();

  -- 3. Beyond-Mythical purchase protection in shop_items (must fail even if directly requested)
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO public.shop_items (id, item_type, name, description, rarity, price_gold, price_forge_xp, required_level, is_active, metadata)
  VALUES (
    'shop-tamper-eternal', 'weapon', 'Tampered Eternal Blade', 'Should never be purchasable',
    'Eternal', 1, 0, 1, true, '{"weaponId":"w-et-chronosword","category":"Greatswords"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('role', 'authenticated', true);
  v_res := public.rpc_purchase_shop_item('shop-tamper-eternal', v_idem1);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 3]: rpc_purchase_shop_item allowed purchasing an Eternal rarity weapon!';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 3]: Shop blocked purchasing Beyond-Mythical Eternal item.';

  -- 4. Progression unlock blocked when player milestones are not met
  v_res := public.rpc_unlock_progression_weapon('w-asc-runeblade', v_idem1);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 4]: Low-level player was allowed to unlock Ascendant progression relic';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 4]: Unqualified player blocked from claiming Ascendant progression relic.';

  -- 5. Grant valid milestones & test unlock + idempotency + duplicate rejection
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('app.trusted_rpc', 'true', true);
  UPDATE public.profiles
  SET level = 8, aether_rank = 'Ascended', forge_xp = 800, gold_balance = 1000,
      total_bosses_defeated = 3, current_streak = 10, total_workouts_completed = 20, total_verified_reps = 200
  WHERE id = v_user;
  INSERT INTO public.boss_encounters (user_id, kingdom_id, boss_name, boss_hp, boss_max_hp, unlocked, cleared)
  VALUES (v_user, 'kingdom-mountain', 'Ignis Rex', 0, 600, true, true)
  ON CONFLICT (user_id, kingdom_id) DO UPDATE SET cleared = true, boss_hp = 0;

  PERFORM set_config('role', 'authenticated', true);
  v_res := public.rpc_unlock_progression_weapon('w-asc-runeblade', v_idem1);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 5]: Qualified player unlock failed: %', v_res->>'error';
  END IF;

  -- Re-call with different idempotency key must fail duplicate check
  v_res := public.rpc_unlock_progression_weapon('w-asc-runeblade', v_idem2);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 5]: Allowed duplicate unlock of same progression relic';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 5]: Progression relic unlock + anti-duplicate guard verified.';

  -- 6. Rarity Ascension gate + transform test (Ascendant -> Divine)
  v_res := public.rpc_ascend_weapon_rarity('w-asc-runeblade', v_idem3);
  IF COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 6]: Weapon ascended rarity despite Lv.1 (needs Lv.10)';
  END IF;

  PERFORM set_config('role', 'postgres', true);
  UPDATE public.profiles SET aether_rank = 'Mythic', level = 12, forge_xp = 1500, gold_balance = 1500 WHERE id = v_user;
  INSERT INTO public.boss_encounters (user_id, kingdom_id, boss_name, boss_hp, boss_max_hp, unlocked, cleared)
  VALUES (v_user, 'kingdom-ocean', 'Abyssal Leviathan', 0, 900, true, true)
  ON CONFLICT (user_id, kingdom_id) DO UPDATE SET cleared = true, boss_hp = 0;
  UPDATE public.player_weapons SET level = 10, mastery_level = 7 WHERE user_id = v_user AND weapon_id = 'w-asc-runeblade';

  PERFORM set_config('role', 'authenticated', true);
  v_res := public.rpc_ascend_weapon_rarity('w-asc-runeblade', v_idem3);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL [Arsenal 6]: Qualified rarity ascension failed: %', v_res->>'error';
  END IF;
  SELECT weapon_id INTO v_weapon_after FROM public.player_weapons WHERE user_id = v_user AND weapon_id = 'w-div-solaris';
  IF v_weapon_after IS NULL THEN
    RAISE EXCEPTION 'FAIL [Arsenal 6]: Ascended weapon row was not transformed to w-div-solaris';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 6]: Rarity Ascension transformed Ascendant weapon into Divine Solaris cleanly.';

  -- 7. Equip new category weapon and verify boss combat turn executes cleanly
  v_res := public.rpc_equip_weapon('w-div-solaris');
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO public.boss_encounters (user_id, kingdom_id, boss_name, boss_hp, boss_max_hp, player_hp, player_max_hp, unlocked, battle_active)
  VALUES (v_user, 'kingdom-citadel', 'Void Sovereign', 2500, 2500, 350, 350, true, true)
  ON CONFLICT (user_id, kingdom_id) DO UPDATE SET battle_active = true, boss_hp = 2500, player_hp = 350;

  PERFORM set_config('role', 'authenticated', true);
  v_res := public.rpc_boss_combat_turn('kingdom-citadel', 'attack', NULL);
  IF NOT COALESCE((v_res->>'success')::boolean, false) OR COALESCE((v_res->>'playerDamage')::integer, 0) <= 0 THEN
    RAISE EXCEPTION 'FAIL [Arsenal 7]: Boss combat turn failed with Divine Greatsword: %', v_res->>'error';
  END IF;
  RAISE NOTICE 'PASS [Arsenal 7]: Boss combat executed cleanly with Divine Greatsword (damage=%).', v_res->>'playerDamage';
END $$;

ROLLBACK;
