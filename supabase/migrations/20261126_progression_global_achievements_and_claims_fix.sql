-- ============================================================================
-- Migration: 20261126_progression_global_achievements_and_claims_fix.sql
-- Purpose:
--   1. Prune global_achievements_catalog strictly to the 5 curated 1-of-1
--      Global Exclusive Achievements (zero weapons, zero Forge XP, zero Daily Report,
--      rebalanced Gold 350-600g, zero XP inflation).
--   2. Update _compute_user_legend_metrics to remove weapon/forge_xp references
--      and preserve clean active metrics across discipline, reps, streaks, bosses, level.
--   3. Keep rpc_claim_global_achievement atomic via PK conflict guard.
--   4. Rebalance classic quest/achievement gold rewards and remove forge_xp usage.
-- ============================================================================

-- 1. Prune stale claims outside the 5 curated IDs & replace catalog cleanly
DELETE FROM public.global_legend_announcements
WHERE achievement_id NOT IN ('gl-disc-02', 'gl-phys-02', 'gl-cons-01', 'gl-ult-01', 'gl-ult-03');

DELETE FROM public.global_achievement_claims
WHERE achievement_id NOT IN ('gl-disc-02', 'gl-phys-02', 'gl-cons-01', 'gl-ult-01', 'gl-ult-03');

DELETE FROM public.global_achievements_catalog
WHERE id NOT IN ('gl-disc-02', 'gl-phys-02', 'gl-cons-01', 'gl-ult-01', 'gl-ult-03');

INSERT INTO public.global_achievements_catalog (
  id, name, story, category, rarity, difficulty, title_tag, title_style,
  emblem_icon, requirement_summary, requirement_type, threshold,
  reward_player_xp, reward_forge_xp, reward_gold, is_hidden, hint
) VALUES
  (
    'gl-disc-02',
    'The Unyielding Vow',
    'Three hundred unbroken oaths forged a will sharper than any citadel gate.',
    'legendary_discipline',
    'Legendary',
    'Hard',
    'UNYIELDING VOW',
    'gold',
    'Shield',
    'Complete 300 healthy habits',
    'habits_claimed_total',
    300,
    0,
    0,
    350,
    false,
    NULL
  ),
  (
    'gl-phys-02',
    'Titan of Fifteen Thousand Reps',
    'Fifteen thousand camera-verified bodyweight reps forged an unshakable frame.',
    'physical_excellence',
    'Mythic',
    'Pinnacle',
    'REP TITAN',
    'crimson',
    'Flame',
    'Perform 15,000 verified Aether Vision reps',
    'total_verified_reps',
    15000,
    0,
    0,
    450,
    false,
    NULL
  ),
  (
    'gl-cons-01',
    'Keeper of the Forty-Five-Day Flame',
    'Forty-five consecutive dawns greeted with unbroken discipline and vigor.',
    'unbreakable_consistency',
    'Legendary',
    'Extreme',
    'ETERNAL FLAME',
    'gold',
    'Flame',
    'Reach a 45-day consecutive habit streak',
    'current_streak',
    45,
    0,
    0,
    400,
    false,
    NULL
  ),
  (
    'gl-ult-01',
    'Dragonslayer of the Five Kingdoms',
    'Forty sovereign bosses felled in pure bodyweight combat across the realm.',
    'ultimate_challenges',
    'Mythic',
    'Pinnacle',
    'DRAGONSLAYER',
    'crimson',
    'Trophy',
    'Defeat 40 Kingdom bosses in verified combat',
    'total_bosses_defeated',
    40,
    0,
    0,
    500,
    false,
    NULL
  ),
  (
    'gl-ult-03',
    'Ascendant Level Thirty',
    'The first champion to ascend to Level 30 through pure consistency and training.',
    'ultimate_challenges',
    'Ascendant',
    'Pinnacle',
    'ASCENDANT XXX',
    'prismatic',
    'Crown',
    'Reach Character Level 30',
    'level',
    30,
    0,
    0,
    600,
    false,
    NULL
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
  is_hidden = false,
  hint = NULL;

-- 2. Harden _compute_user_legend_metrics without legacy weapon/forge_xp dependencies
CREATE OR REPLACE FUNCTION public._compute_user_legend_metrics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_habits_claimed INTEGER := 0;
  v_meals_total INTEGER := 0;
  v_water_cur INTEGER := 0;
  v_quests_claimed INTEGER := 0;
  v_dyn_claimed INTEGER := 0;
  v_norm_ach INTEGER := 0;
  v_friends_count INTEGER := 0;
  v_story_claimed INTEGER := 0;
  v_all_kingdoms INTEGER := 0;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_habits_claimed
  FROM public.habit_logs WHERE user_id = p_user_id;

  SELECT COUNT(*)::INTEGER INTO v_meals_total
  FROM public.nutrition_logs WHERE user_id = p_user_id;

  SELECT COALESCE(glasses_today, 0)::INTEGER INTO v_water_cur
  FROM public.water_logs
  WHERE user_id = p_user_id
    AND log_date = (now() AT TIME ZONE COALESCE(NULLIF(v_prof.timezone, ''), 'UTC'))::DATE;

  SELECT COUNT(*)::INTEGER INTO v_quests_claimed
  FROM public.player_quest_progress WHERE user_id = p_user_id AND claimed = true;

  SELECT COUNT(*)::INTEGER INTO v_dyn_claimed
  FROM public.player_dynamic_quests WHERE user_id = p_user_id AND claimed = true;

  SELECT COUNT(*)::INTEGER INTO v_norm_ach
  FROM public.player_achievements WHERE user_id = p_user_id AND unlocked = true;

  SELECT COUNT(*)::INTEGER INTO v_friends_count
  FROM public.friendships WHERE status = 'accepted' AND (requester_id = p_user_id OR addressee_id = p_user_id);

  SELECT CASE WHEN COALESCE(COUNT(*) FILTER (WHERE cleared = true), 0) >= 5 THEN 1 ELSE 0 END
  INTO v_all_kingdoms
  FROM public.boss_encounters WHERE user_id = p_user_id;

  SELECT COUNT(*)::INTEGER INTO v_story_claimed
  FROM public.player_story_rewards WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'level', COALESCE(v_prof.level, 1),
    'total_xp', COALESCE(v_prof.total_xp, 0),
    'current_streak', GREATEST(COALESCE(v_prof.current_streak, 0), COALESCE(v_prof.longest_streak, 0)),
    'total_workouts', COALESCE(v_prof.total_workouts_completed, 0),
    'total_verified_reps', COALESCE(v_prof.total_verified_reps, 0),
    'total_bosses_defeated', COALESCE(v_prof.total_bosses_defeated, 0),
    'all_kingdoms_cleared', GREATEST(v_all_kingdoms, CASE WHEN COALESCE(v_prof.total_bosses_defeated, 0) >= 5 THEN 1 ELSE 0 END),
    'aether_points', COALESCE(v_prof.aether_points, 0),
    'habits_claimed_total', v_habits_claimed,
    'meals_logged_total', v_meals_total,
    'water_glasses_current', v_water_cur,
    'quests_claimed_total', v_quests_claimed + v_dyn_claimed,
    'dynamic_quests_claimed_total', v_dyn_claimed,
    'normal_achievements_unlocked', v_norm_ach,
    'friends_count', v_friends_count,
    'story_chapters_claimed', v_story_claimed,
    'gold_balance', COALESCE(v_prof.gold_balance, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._compute_user_legend_metrics(UUID) FROM PUBLIC, anon, authenticated;

-- 3. Update classic quest & achievement rewards to remove forge_xp & assign fair gold
UPDATE public.quests_catalog SET forge_xp_reward = 0, gold_reward = 20 WHERE id = 'q-1';
UPDATE public.quests_catalog SET forge_xp_reward = 0, gold_reward = 30 WHERE id = 'q-2';
UPDATE public.quests_catalog SET forge_xp_reward = 0, gold_reward = 20 WHERE id = 'q-3';
UPDATE public.quests_catalog SET forge_xp_reward = 0, gold_reward = 65 WHERE id = 'q-4';
UPDATE public.quests_catalog SET forge_xp_reward = 0, gold_reward = 90 WHERE id = 'q-6';

UPDATE public.achievements_catalog SET reward_forge_xp = 0, reward_gold = 25 WHERE id = 'ach-1';
UPDATE public.achievements_catalog SET reward_forge_xp = 0, reward_gold = 50 WHERE id = 'ach-2';
UPDATE public.achievements_catalog SET reward_forge_xp = 0, reward_gold = 100 WHERE id = 'ach-4';
UPDATE public.achievements_catalog SET reward_forge_xp = 0, reward_gold = 60 WHERE id = 'ach-5';
UPDATE public.achievements_catalog SET reward_forge_xp = 0, reward_gold = 125 WHERE id = 'ach-6';
UPDATE public.achievements_catalog SET reward_forge_xp = 0, reward_gold = 50 WHERE id = 'ach-7';
