-- Additive Migration: 3D Hero Identity, Campaign Milestones & Reclaim Your Honor Rewards
-- Backward-compatible: adds idempotent server-side story reward ledger & RPC without modifying existing columns or progression.

CREATE TABLE IF NOT EXISTS public.player_story_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  player_xp_granted INTEGER NOT NULL DEFAULT 0,
  forge_xp_granted INTEGER NOT NULL DEFAULT 0,
  gold_granted INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_key)
);

ALTER TABLE public.player_story_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own story rewards" ON public.player_story_rewards;
CREATE POLICY "Users read own story rewards"
  ON public.player_story_rewards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.player_story_rewards FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_story_rewards TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_claim_story_reward(
  p_reward_key TEXT,
  p_player_xp INTEGER DEFAULT 0,
  p_forge_xp INTEGER DEFAULT 0,
  p_gold INTEGER DEFAULT 0,
  p_description TEXT DEFAULT 'Story & Tutorial Milestone'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_safe_pxp INTEGER := LEAST(GREATEST(COALESCE(p_player_xp, 0), 0), 500);
  v_safe_fxp INTEGER := LEAST(GREATEST(COALESCE(p_forge_xp, 0), 0), 400);
  v_safe_gold INTEGER := LEAST(GREATEST(COALESCE(p_gold, 0), 0), 500);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_reward_key IS NULL OR btrim(p_reward_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward key is required');
  END IF;

  INSERT INTO public.player_story_rewards (
    user_id, reward_key, player_xp_granted, forge_xp_granted, gold_granted
  ) VALUES (
    v_uid, p_reward_key, v_safe_pxp, v_safe_fxp, v_safe_gold
  )
  ON CONFLICT (user_id, reward_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'alreadyClaimed', true, 'error', 'Story reward already claimed.');
  END IF;

  UPDATE public.profiles
  SET
    player_xp = player_xp + v_safe_pxp,
    total_xp = total_xp + v_safe_pxp,
    forge_xp = forge_xp + v_safe_fxp,
    gold_balance = gold_balance + v_safe_gold,
    updated_at = now()
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  -- Level-up rollover loop matching existing profile progression
  WHILE v_prof.player_xp >= v_prof.player_xp_next_level LOOP
    UPDATE public.profiles
    SET
      level = level + 1,
      player_xp = player_xp - player_xp_next_level,
      player_xp_next_level = GREATEST(100, FLOOR(player_xp_next_level * 1.25)::INTEGER),
      updated_at = now()
    WHERE id = v_uid
    RETURNING * INTO v_prof;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'profile', to_jsonb(v_prof),
    'playerXpGranted', v_safe_pxp,
    'forgeXpGranted', v_safe_fxp,
    'goldGranted', v_safe_gold
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_claim_story_reward(TEXT, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_claim_story_reward(TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
