-- Additive Migration: Permanent One-Time Hero Selection Lock
-- Backward-compatible: preserves existing onboarded players' heroes while enforcing one-time selection for new accounts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_hero_id TEXT,
  ADD COLUMN IF NOT EXISTS hero_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_selected_at TIMESTAMPTZ;

-- Preserve all pre-existing onboarded accounts without resetting their champion
UPDATE public.profiles p
SET
  selected_hero_id = COALESCE(
    NULLIF(p.selected_hero_id, ''),
    CASE
      WHEN gs.client_preferences->>'selectedHeroId' IN ('fallen_knight', 'shadowblade', 'arcane_mage', 'ranger', 'paladin')
        THEN gs.client_preferences->>'selectedHeroId'
      WHEN p.character_class = 'Mage' THEN 'arcane_mage'
      WHEN p.character_class = 'Ranger' THEN 'ranger'
      WHEN p.character_class = 'Guardian' THEN 'paladin'
      ELSE 'fallen_knight'
    END
  ),
  hero_locked = true,
  hero_selected_at = COALESCE(p.hero_selected_at, p.updated_at, p.created_at, now())
FROM public.game_states gs
WHERE gs.user_id = p.id
  AND p.is_onboarded = true
  AND p.hero_locked = false
  AND COALESCE((gs.client_preferences->>'heroSelectionPending')::BOOLEAN, false) = false;

UPDATE public.profiles p
SET
  selected_hero_id = COALESCE(
    NULLIF(p.selected_hero_id, ''),
    CASE
      WHEN p.character_class = 'Mage' THEN 'arcane_mage'
      WHEN p.character_class = 'Ranger' THEN 'ranger'
      WHEN p.character_class = 'Guardian' THEN 'paladin'
      ELSE 'fallen_knight'
    END
  ),
  hero_locked = true,
  hero_selected_at = COALESCE(p.hero_selected_at, p.updated_at, p.created_at, now())
WHERE p.is_onboarded = true
  AND p.hero_locked = false
  AND NOT EXISTS (SELECT 1 FROM public.game_states gs WHERE gs.user_id = p.id);

-- Server-authoritative one-time hero lock RPC
CREATE OR REPLACE FUNCTION public.rpc_lock_hero_selection(p_hero_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_mapped_class TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_hero_id IS NULL OR p_hero_id NOT IN ('fallen_knight', 'shadowblade', 'arcane_mage', 'ranger', 'paladin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid champion selection.'
    );
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Enforce strict one-time lock on the backend
  IF v_prof.hero_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'alreadyLocked', true,
      'selectedHeroId', COALESCE(v_prof.selected_hero_id, 'fallen_knight'),
      'characterClass', v_prof.character_class,
      'heroSelectedAt', v_prof.hero_selected_at,
      'error', 'Your champion is permanently locked to your account and cannot be changed.'
    );
  END IF;

  v_mapped_class := CASE p_hero_id
    WHEN 'fallen_knight' THEN 'Warrior'
    WHEN 'shadowblade' THEN 'Ranger'
    WHEN 'arcane_mage' THEN 'Mage'
    WHEN 'ranger' THEN 'Ranger'
    WHEN 'paladin' THEN 'Guardian'
    ELSE 'Warrior'
  END;

  UPDATE public.profiles
  SET
    selected_hero_id = p_hero_id,
    hero_locked = true,
    hero_selected_at = now(),
    character_class = v_mapped_class,
    updated_at = now()
  WHERE id = v_uid
  RETURNING * INTO v_prof;

  INSERT INTO public.game_states (user_id, client_preferences)
  VALUES (
    v_uid,
    jsonb_build_object(
      'selectedHeroId', p_hero_id,
      'heroLocked', true,
      'heroSelectionPending', false
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    client_preferences = COALESCE(public.game_states.client_preferences, '{}'::jsonb) || jsonb_build_object(
      'selectedHeroId', p_hero_id,
      'heroLocked', true,
      'heroSelectionPending', false
    ),
    state_version = public.game_states.state_version + 1,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'selectedHeroId', p_hero_id,
    'heroLocked', true,
    'heroSelectedAt', v_prof.hero_selected_at,
    'characterClass', v_mapped_class,
    'profile', to_jsonb(v_prof)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_lock_hero_selection(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lock_hero_selection(TEXT) TO authenticated;

-- Harden rpc_save_client_preferences so a locked hero can never be overwritten via preference sync
CREATE OR REPLACE FUNCTION public.rpc_save_client_preferences(p_preferences JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_next_prefs JSONB := COALESCE(p_preferences, '{}'::jsonb);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;

  IF FOUND AND v_prof.hero_locked THEN
    v_next_prefs := v_next_prefs || jsonb_build_object(
      'selectedHeroId', COALESCE(v_prof.selected_hero_id, 'fallen_knight'),
      'heroLocked', true,
      'heroSelectionPending', false
    );
  END IF;

  INSERT INTO public.game_states (user_id, client_preferences)
  VALUES (v_uid, v_next_prefs)
  ON CONFLICT (user_id) DO UPDATE SET
    client_preferences = v_next_prefs,
    state_version = public.game_states.state_version + 1,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Harden rpc_update_profile_preferences so character_class becomes immutable once hero_locked = true
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
    character_class = CASE
      WHEN hero_locked THEN character_class
      WHEN p_character_class IN ('Warrior','Ranger','Mage','Guardian') THEN p_character_class
      ELSE character_class
    END,
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
