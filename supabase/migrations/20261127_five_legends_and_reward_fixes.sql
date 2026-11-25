-- =============================================================================
-- FORWARD-ONLY MIGRATION: CURATED 5 GLOBAL ACHIEVEMENTS & STRICT 1-CLAIM LOCK
-- =============================================================================

-- 1. Upsert the 5 curated worldwide exclusive achievements (zero Player XP inflation)
INSERT INTO public.global_achievements_catalog (
  id, name, story, category, rarity, difficulty, title_tag, title_style, emblem_icon,
  requirement_summary, requirement_type, threshold, reward_player_xp, reward_forge_xp, reward_gold, is_hidden
) VALUES
  (
    'gl-disc-02',
    'The Unyielding Vow',
    'While lesser knights faltered when fatigue spoke, one stood firm across three hundred verified daily habits.',
    'legendary_discipline',
    'Legendary',
    'Extreme',
    'THE UNYIELDING',
    'arcane',
    'Flame',
    'Record 300 completed habit logs across your journey',
    'habits_claimed_total',
    300,
    0,
    0,
    600,
    false
  ),
  (
    'gl-phys-02',
    'Titan of a Thousand Reps',
    'First across the world to push through 1,000 camera-verified physical repetitions without faltering.',
    'physical_excellence',
    'Legendary',
    'Extreme',
    'TITAN OF IRON',
    'crimson',
    'Dumbbell',
    'Accumulate 1,000 Aether Vision verified exercise repetitions',
    'total_verified_reps',
    1000,
    0,
    0,
    700,
    false
  ),
  (
    'gl-cons-02',
    'Moon-Cycle Warden',
    'Three weeks of uninterrupted discipline forged into an ironclad lifelong cadence.',
    'unbreakable_consistency',
    'Legendary',
    'Hard',
    'TWENTY-ONE DAWNS',
    'emerald',
    'ShieldCheck',
    'Maintain a 21-day verified healthy habit streak',
    'current_streak',
    21,
    0,
    0,
    650,
    false
  ),
  (
    'gl-ult-02',
    'Conqueror of All Five Realms',
    'Banished the Void from Forest, Mountain, Ocean, Desert, and Citadel before any rival could stand.',
    'ultimate_challenges',
    'Mythic',
    'Pinnacle',
    'FIVE REALMS CONQUEROR',
    'prismatic',
    'Crown',
    'Defeat the sovereign boss in all 5 Kingdoms of Aetheria',
    'all_kingdoms_cleared',
    1,
    0,
    0,
    900,
    false
  ),
  (
    'gl-ult-03',
    'Ascendant Paragon',
    'Reached Character Level 15 through pure, verified dedication across body and discipline.',
    'ultimate_challenges',
    'Mythic',
    'Pinnacle',
    'GRAND CHAMPION',
    'celestial',
    'Award',
    'Reach Character Level 15',
    'level',
    15,
    0,
    0,
    800,
    false
  )
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
  reward_forge_xp = 0,
  reward_gold = EXCLUDED.reward_gold,
  is_hidden = false;

-- Remove superseded unclaimed catalog entries so only the 5 curated global achievements remain claimable
DELETE FROM public.global_achievements_catalog g
WHERE g.id NOT IN ('gl-disc-02', 'gl-phys-02', 'gl-cons-02', 'gl-ult-02', 'gl-ult-03')
  AND NOT EXISTS (
    SELECT 1 FROM public.global_achievement_claims c WHERE c.achievement_id = g.id
  );

-- 2. Harden rpc_claim_global_achievement with FOR UPDATE lock & zero XP inflation
CREATE OR REPLACE FUNCTION public.rpc_claim_global_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_cat public.global_achievements_catalog%ROWTYPE;
  v_existing public.global_achievement_claims%ROWTYPE;
  v_metrics JSONB;
  v_progress INTEGER := 0;
  v_inserted_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF p_achievement_id NOT IN ('gl-disc-02', 'gl-phys-02', 'gl-cons-02', 'gl-ult-02', 'gl-ult-03') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This global achievement is not active in the current registry.');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Champion profile not found.');
  END IF;

  SELECT * INTO v_cat FROM public.global_achievements_catalog WHERE id = p_achievement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Global Exclusive Achievement does not exist.');
  END IF;

  -- Check if already permanently claimed by any player globally
  SELECT * INTO v_existing FROM public.global_achievement_claims WHERE achievement_id = p_achievement_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'alreadyClaimedGlobally', true,
      'ownerId', v_existing.owner_id,
      'ownerUsername', v_existing.owner_username,
      'claimedAt', v_existing.claimed_at,
      'error', 'This Global Exclusive Achievement has already been permanently claimed by ' || v_existing.owner_username || '.'
    );
  END IF;

  -- Authoritative server-side verification against real DB metrics
  v_metrics := public._compute_user_legend_metrics(v_uid);
  v_progress := COALESCE((v_metrics->>v_cat.requirement_type)::INTEGER, 0);

  IF v_progress < v_cat.threshold THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requirement not yet verified (' || v_progress || '/' || v_cat.threshold || ').'
    );
  END IF;

  -- Strict race-safe atomic one-owner insert (global_achievement_claims PK = achievement_id)
  INSERT INTO public.global_achievement_claims (achievement_id, owner_id, owner_username)
  VALUES (v_cat.id, v_uid, v_prof.username)
  ON CONFLICT (achievement_id) DO NOTHING
  RETURNING achievement_id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT * INTO v_existing FROM public.global_achievement_claims WHERE achievement_id = p_achievement_id;
    RETURN jsonb_build_object(
      'success', false,
      'alreadyClaimedGlobally', true,
      'ownerId', v_existing.owner_id,
      'ownerUsername', v_existing.owner_username,
      'claimedAt', v_existing.claimed_at,
      'error', 'Another champion (' || COALESCE(v_existing.owner_username, 'a rival') || ') claimed this Global Exclusive Title moments ago!'
    );
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);
  UPDATE public.profiles
  SET
    equipped_legend_title = v_cat.title_tag,
    equipped_legend_style = v_cat.title_style,
    equipped_legend_emblem = v_cat.emblem_icon,
    equipped_legend_achievement_id = v_cat.id
  WHERE id = v_uid;

  -- Grant Gold bounty only (zero XP inflation)
  v_prof := public._credit_currencies(
    v_uid,
    0,
    0,
    v_cat.reward_gold,
    0,
    'global_legend',
    v_cat.id,
    'World-First Legend Claimed: ' || v_cat.name,
    NULL
  );

  INSERT INTO public.global_legend_announcements (
    achievement_id, achievement_name, title_tag, title_style, emblem_icon, rarity, owner_id, owner_username
  ) VALUES (
    v_cat.id, v_cat.name, v_cat.title_tag, v_cat.title_style, v_cat.emblem_icon, v_cat.rarity, v_uid, v_prof.username
  );

  RETURN jsonb_build_object(
    'success', true,
    'profile', to_jsonb(v_prof),
    'ownership', jsonb_build_object(
      'achievementId', v_cat.id,
      'ownerId', v_uid,
      'ownerUsername', v_prof.username,
      'claimedAt', now()
    )
  );
END;
$$;
