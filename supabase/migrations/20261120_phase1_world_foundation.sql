-- Additive Migration: Phase 1 Explorable 3D World Foundation (The Heartlands)
-- Creates player_world_state table + owner-only RLS + validated RPCs without altering existing gameplay tables.

CREATE TABLE IF NOT EXISTS public.player_world_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_entered_world BOOLEAN NOT NULL DEFAULT false,
  selected_region_id TEXT NOT NULL DEFAULT 'heartlands'
    CHECK (selected_region_id IN ('heartlands')),
  golden_tree_stage TEXT NOT NULL DEFAULT 'growing'
    CHECK (golden_tree_stage IN ('fallen', 'awakening', 'growing', 'radiant', 'eternal')),
  landmark_states JSONB NOT NULL DEFAULT '{
    "ancient_castle": {"id": "ancient_castle", "stage": "repaired", "restorationPercent": 40},
    "forgotten_village": {"id": "forgotten_village", "stage": "ruined", "restorationPercent": 18},
    "ancient_bridge": {"id": "ancient_bridge", "stage": "restored", "restorationPercent": 65},
    "sacred_shrine": {"id": "sacred_shrine", "stage": "repaired", "restorationPercent": 40}
  }'::jsonb,
  graphics_quality TEXT NOT NULL DEFAULT 'high'
    CHECK (graphics_quality IN ('high', 'low')),
  last_player_position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_world_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own world state" ON public.player_world_state;
CREATE POLICY "Users read own world state"
  ON public.player_world_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.player_world_state FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_world_state TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_world_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.player_world_state%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.player_world_state (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.player_world_state WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'worldState', jsonb_build_object(
      'hasEnteredWorld', v_row.has_entered_world,
      'selectedRegionId', v_row.selected_region_id,
      'goldenTreeStage', v_row.golden_tree_stage,
      'landmarks', v_row.landmark_states,
      'graphicsQuality', v_row.graphics_quality,
      'lastPlayerPosition', v_row.last_player_position
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_save_world_state(
  p_has_entered_world BOOLEAN DEFAULT NULL,
  p_selected_region_id TEXT DEFAULT NULL,
  p_golden_tree_stage TEXT DEFAULT NULL,
  p_landmark_states JSONB DEFAULT NULL,
  p_graphics_quality TEXT DEFAULT NULL,
  p_last_player_position JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.player_world_state%ROWTYPE;
  v_region TEXT;
  v_tree_stage TEXT;
  v_quality TEXT;
  v_landmarks JSONB;
  v_key TEXT;
  v_item JSONB;
  v_stage TEXT;
  v_pct INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.player_world_state (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.player_world_state WHERE user_id = v_uid FOR UPDATE;

  -- Phase 1 boundary: only Heartlands may be active; locked regions are strictly rejected
  IF p_selected_region_id IS NOT NULL AND p_selected_region_id <> 'heartlands' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only The Heartlands is unlocked in Phase 1.');
  END IF;
  v_region := COALESCE(p_selected_region_id, v_row.selected_region_id);

  IF p_golden_tree_stage IS NOT NULL AND p_golden_tree_stage NOT IN ('fallen', 'awakening', 'growing', 'radiant', 'eternal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Golden Tree stage.');
  END IF;
  v_tree_stage := COALESCE(p_golden_tree_stage, v_row.golden_tree_stage);

  IF p_graphics_quality IS NOT NULL AND p_graphics_quality NOT IN ('high', 'low') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid graphics quality setting.');
  END IF;
  v_quality := COALESCE(p_graphics_quality, v_row.graphics_quality);

  v_landmarks := v_row.landmark_states;
  IF p_landmark_states IS NOT NULL AND jsonb_typeof(p_landmark_states) = 'object' THEN
    FOREACH v_key IN ARRAY ARRAY['ancient_castle', 'forgotten_village', 'ancient_bridge', 'sacred_shrine']
    LOOP
      IF p_landmark_states ? v_key THEN
        v_item := p_landmark_states -> v_key;
        v_stage := COALESCE(v_item ->> 'stage', (v_landmarks -> v_key ->> 'stage'), 'ruined');
        IF v_stage NOT IN ('ruined', 'repaired', 'restored', 'flourishing', 'legendary') THEN
          RETURN jsonb_build_object('success', false, 'error', 'Invalid landmark stage for ' || v_key);
        END IF;
        v_pct := LEAST(100, GREATEST(0, COALESCE((v_item ->> 'restorationPercent')::INTEGER, 0)));
        v_landmarks := jsonb_set(
          v_landmarks,
          ARRAY[v_key],
          jsonb_build_object('id', v_key, 'stage', v_stage, 'restorationPercent', v_pct)
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.player_world_state
  SET
    has_entered_world = COALESCE(p_has_entered_world, v_row.has_entered_world),
    selected_region_id = v_region,
    golden_tree_stage = v_tree_stage,
    landmark_states = v_landmarks,
    graphics_quality = v_quality,
    last_player_position = CASE
      WHEN p_last_player_position IS NOT NULL
        AND jsonb_typeof(p_last_player_position) = 'object'
        AND (p_last_player_position ? 'x')
        AND (p_last_player_position ? 'y')
        AND (p_last_player_position ? 'z')
      THEN jsonb_build_object(
        'x', LEAST(150, GREATEST(-150, (p_last_player_position ->> 'x')::DOUBLE PRECISION)),
        'y', LEAST(60, GREATEST(-20, (p_last_player_position ->> 'y')::DOUBLE PRECISION)),
        'z', LEAST(150, GREATEST(-150, (p_last_player_position ->> 'z')::DOUBLE PRECISION))
      )
      ELSE v_row.last_player_position
    END,
    updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'worldState', jsonb_build_object(
      'hasEnteredWorld', v_row.has_entered_world,
      'selectedRegionId', v_row.selected_region_id,
      'goldenTreeStage', v_row.golden_tree_stage,
      'landmarks', v_row.landmark_states,
      'graphicsQuality', v_row.graphics_quality,
      'lastPlayerPosition', v_row.last_player_position
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_world_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_world_state() TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_save_world_state(BOOLEAN, TEXT, TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_world_state(BOOLEAN, TEXT, TEXT, JSONB, TEXT, JSONB) TO authenticated;
