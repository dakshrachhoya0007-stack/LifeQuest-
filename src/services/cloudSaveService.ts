import { getSupabase } from '../lib/supabase';
import {
  PlayerStats,
  Habit,
  Quest,
  Buff,
  Kingdom,
  FitnessSession,
  Meal,
  Achievement,
  Guild,
  ChatMessage,
  Transaction,
} from '../types/game';

export interface CloudFullGameState {
  stats: PlayerStats;
  habits: Habit[];
  quests: Quest[];
  buffs: Buff[];
  kingdoms: Kingdom[];
  waterGlasses: number;
  achievements: Achievement[];
  guilds: Guild[];
  chatMessages: ChatMessage[];
  transactions: Transaction[];
  version: number;
  savedAt: string;
}

export interface CloudLoadResult {
  profile?: {
    id: string;
    username: string;
    character_name?: string | null;
    avatar_url: string | null;
    character_class?: string;
    level?: number;
    player_xp?: number;
    player_xp_next_level?: number;
    total_xp?: number;
    gold_balance?: number;
    aether_rank?: string;
    aether_points?: number;
    aether_points_next_rank?: number;
    current_streak?: number;
    total_workouts_completed?: number;
    total_verified_reps?: number;
    total_bosses_defeated?: number;
    current_kingdom_id?: string;
    preferred_units?: string;
    age_years?: number | null;
    age_group?: string | null;
    biological_sex?: string | null;
    height?: string | null;
    weight?: string | null;
    activity_level?: string;
    preferred_fitness_activities?: string[];
    fitness_goals?: string[];
    dietary_preference?: string;
    food_allergies?: string[];
    food_intolerances?: string[];
    disliked_foods?: string;
    notification_preferences?: any;
    timezone?: string;
    sound_enabled?: boolean;
    is_onboarded?: boolean;
    leaderboard_visible?: boolean;
    bio?: string | null;
    profile_visibility?: string | null;
    show_achievements?: boolean | null;
    show_equipment?: boolean | null;
    show_stats?: boolean | null;
    show_guild?: boolean | null;
  };
  gameState?: CloudFullGameState;
  clientPreferences?: Record<string, any>;
  workoutSessions?: FitnessSession[];
  meals?: Meal[];
  error?: string;
}

/**
 * Loads the complete game state, profile, workouts, and nutrition for the given user from Supabase.
 */
export const loadCloudGameState = async (userId: string): Promise<CloudLoadResult> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Supabase client not initialized' };
  }

  try {
    // 1. Fetch Profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('Error loading profile from cloud:', profileError);
    }

    // 2. Fetch Game State
    const { data: stateData, error: stateError } = await supabase
      .from('game_states')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (stateError && stateError.code !== 'PGRST116') {
      console.warn('Error loading game state from cloud:', stateError);
    }

    // 3. Fetch Workout Sessions (ordered by created_at desc, limit 50)
    const { data: workoutsData } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // 4. Fetch Nutrition Logs (ordered by logged_at desc, limit 50)
    const { data: nutritionData } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(50);

    const parsedWorkouts: FitnessSession[] = (workoutsData || []).map((row: any) => ({
      ...(row.workout_data as FitnessSession),
      id: row.id,
    }));

    const parsedMeals: Meal[] = (nutritionData || []).map((row: any) => ({
      ...(row.meal_data as Meal),
      id: row.id,
    }));

    return {
      profile: profileData || undefined,
      gameState: stateData ? (stateData.game_data as unknown as CloudFullGameState) : undefined,
      clientPreferences:
        stateData?.client_preferences && typeof stateData.client_preferences === 'object'
          ? (stateData.client_preferences as Record<string, any>)
          : undefined,
      workoutSessions: parsedWorkouts.length > 0 ? parsedWorkouts : undefined,
      meals: parsedMeals.length > 0 ? parsedMeals : undefined,
    };
  } catch (err: any) {
    console.error('Failed to load cloud game state:', err);
    return { error: err.message || 'Unknown network error' };
  }
};

/**
 * Saves safe client UI preferences only via rpc_save_client_preferences.
 * Authoritative progression (Gold, XP, levels, habits, inventory) is exclusively mutated server-side.
 */
export const saveCloudGameState = async (
  _userId: string,
  gameState: CloudFullGameState
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { error } = await (supabase.rpc as any)('rpc_save_client_preferences', {
      p_preferences: {
        soundEnabled: Boolean(gameState.stats?.soundEnabled ?? true),
        savedAt: gameState.savedAt || new Date().toISOString(),
      },
    });

    if (error) {
      const code = String(error.code || '');
      // If unified migration is not yet deployed on a pre-migration DB, ignore silently without minting
      if (code === '42883' || code === 'PGRST202') {
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network exception' };
  }
};

/**
 * Legacy helper retained for interface compatibility; workout creation is server-authoritative via rpc_log_workout.
 */
export const saveCloudWorkout = async (
  _userId: string,
  _session: FitnessSession
): Promise<{ success: boolean; error?: string }> => {
  return { success: false, error: 'Direct workout table writes are disabled; use rpc_log_workout.' };
};

/**
 * Legacy helper retained for interface compatibility; nutrition logging is server-authoritative via rpc_log_nutrition.
 */
export const saveCloudNutrition = async (
  _userId: string,
  _meal: Meal
): Promise<{ success: boolean; error?: string }> => {
  return { success: false, error: 'Direct nutrition table writes are disabled; use rpc_log_nutrition.' };
};

/**
 * Legacy helper retained for interface compatibility; habit claims are server-authoritative via rpc_claim_habit_reward.
 */
export const saveCloudHabitLog = async (
  _userId: string,
  _habitLog: { habitId: string; habitName: string; completedAt: string; streak: number }
): Promise<{ success: boolean; error?: string }> => {
  return { success: false, error: 'Direct habit_logs writes are disabled; use rpc_claim_habit_reward.' };
};

/**
 * Updates allowed user preference columns on profiles via rpc_update_profile_preferences,
 * falling back strictly to column-restricted UPDATE (never upsert/insert).
 */
export const updateCloudProfile = async (
  userId: string,
  profile: {
    username: string;
    character_name?: string | null;
    avatar_url?: string;
    character_class?: string;
    preferred_units?: string;
    age_years?: number | null;
    age_group?: string | null;
    biological_sex?: string | null;
    height?: string | null;
    weight?: string | null;
    activity_level?: string;
    preferred_fitness_activities?: string[];
    fitness_goals?: string[];
    dietary_preference?: string;
    food_allergies?: string[];
    food_intolerances?: string[];
    disliked_foods?: string;
    notification_preferences?: Record<string, boolean>;
    timezone?: string;
    sound_enabled?: boolean;
    is_onboarded?: boolean;
    leaderboard_visible?: boolean;
    bio?: string | null;
    profile_visibility?: string | null;
    show_achievements?: boolean | null;
    show_equipment?: boolean | null;
    show_stats?: boolean | null;
    show_guild?: boolean | null;
  }
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  try {
    const baseRpcArgs = {
      p_username: profile.username ?? null,
      p_character_name: profile.character_name ?? null,
      p_avatar_url: profile.avatar_url ?? null,
      p_character_class: profile.character_class ?? null,
      p_preferred_units: profile.preferred_units ?? null,
      p_height: profile.height !== undefined ? profile.height : null,
      p_weight: profile.weight !== undefined ? profile.weight : null,
      p_activity_level: profile.activity_level ?? null,
      p_preferred_fitness_activities: profile.preferred_fitness_activities ?? null,
      p_fitness_goals: profile.fitness_goals ?? null,
      p_dietary_preference: profile.dietary_preference ?? null,
      p_food_allergies: profile.food_allergies ?? null,
      p_food_intolerances: profile.food_intolerances ?? null,
      p_disliked_foods: profile.disliked_foods !== undefined ? profile.disliked_foods : null,
      p_notification_preferences: profile.notification_preferences ?? null,
      p_timezone: profile.timezone ?? null,
      p_sound_enabled: typeof profile.sound_enabled === 'boolean' ? profile.sound_enabled : null,
      p_is_onboarded: typeof profile.is_onboarded === 'boolean' ? profile.is_onboarded : null,
      p_leaderboard_visible:
        typeof profile.leaderboard_visible === 'boolean' ? profile.leaderboard_visible : null,
    };

    let { data, error: rpcErr } = await (supabase.rpc as any)('rpc_update_profile_preferences', {
      ...baseRpcArgs,
      p_age_years: typeof profile.age_years === 'number' ? profile.age_years : null,
      p_age_group: profile.age_group ?? null,
      p_biological_sex: profile.biological_sex ?? null,
      p_bio: profile.bio !== undefined ? profile.bio : null,
      p_profile_visibility: profile.profile_visibility ?? null,
      p_show_achievements: typeof profile.show_achievements === 'boolean' ? profile.show_achievements : null,
      p_show_equipment: typeof profile.show_equipment === 'boolean' ? profile.show_equipment : null,
      p_show_stats: typeof profile.show_stats === 'boolean' ? profile.show_stats : null,
      p_show_guild: typeof profile.show_guild === 'boolean' ? profile.show_guild : null,
    });

    if (rpcErr && (String(rpcErr.code) === 'PGRST202' || String(rpcErr.message || '').toLowerCase().includes('could not find the function'))) {
      const retry = await (supabase.rpc as any)('rpc_update_profile_preferences', baseRpcArgs);
      data = retry.data;
      rpcErr = retry.error;
    }

    if (!rpcErr && data?.success !== false) {
      return { success: true };
    }

    const code = String(rpcErr?.code || '');
    const msg = String(rpcErr?.message || '').toLowerCase();
    const rpcMissing =
      code === '42883' || code === 'PGRST202' || msg.includes('could not find the function');

    if (!rpcMissing && rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    // Fallback strictly uses UPDATE (not upsert/insert) with allowed preference columns only
    const extendedUpdate: Record<string, any> = {
      username: profile.username,
      avatar_url: profile.avatar_url || null,
      updated_at: new Date().toISOString(),
    };
    if (profile.character_name !== undefined) extendedUpdate.character_name = profile.character_name;
    if (profile.character_class) extendedUpdate.character_class = profile.character_class;
    if (profile.preferred_units) extendedUpdate.preferred_units = profile.preferred_units;
    if (profile.age_years !== undefined) extendedUpdate.age_years = profile.age_years;
    if (profile.age_group !== undefined) extendedUpdate.age_group = profile.age_group;
    if (profile.biological_sex !== undefined) extendedUpdate.biological_sex = profile.biological_sex;
    if (profile.height !== undefined) extendedUpdate.height = profile.height;
    if (profile.weight !== undefined) extendedUpdate.weight = profile.weight;
    if (profile.activity_level) extendedUpdate.activity_level = profile.activity_level;
    if (profile.preferred_fitness_activities) {
      extendedUpdate.preferred_fitness_activities = profile.preferred_fitness_activities;
    }
    if (profile.fitness_goals) extendedUpdate.fitness_goals = profile.fitness_goals;
    if (profile.dietary_preference) extendedUpdate.dietary_preference = profile.dietary_preference;
    if (profile.food_allergies) extendedUpdate.food_allergies = profile.food_allergies;
    if (profile.food_intolerances) extendedUpdate.food_intolerances = profile.food_intolerances;
    if (profile.disliked_foods !== undefined) extendedUpdate.disliked_foods = profile.disliked_foods;
    if (profile.notification_preferences) {
      extendedUpdate.notification_preferences = profile.notification_preferences;
    }
    if (profile.timezone) extendedUpdate.timezone = profile.timezone;
    if (typeof profile.sound_enabled === 'boolean') extendedUpdate.sound_enabled = profile.sound_enabled;
    if (typeof profile.is_onboarded === 'boolean') extendedUpdate.is_onboarded = profile.is_onboarded;
    if (typeof profile.leaderboard_visible === 'boolean') {
      extendedUpdate.leaderboard_visible = profile.leaderboard_visible;
    }
    if (profile.bio !== undefined) extendedUpdate.bio = profile.bio;
    if (profile.profile_visibility) extendedUpdate.profile_visibility = profile.profile_visibility;
    if (typeof profile.show_achievements === 'boolean') extendedUpdate.show_achievements = profile.show_achievements;
    if (typeof profile.show_equipment === 'boolean') extendedUpdate.show_equipment = profile.show_equipment;
    if (typeof profile.show_stats === 'boolean') extendedUpdate.show_stats = profile.show_stats;
    if (typeof profile.show_guild === 'boolean') extendedUpdate.show_guild = profile.show_guild;

    const { error } = await supabase
      .from('profiles')
      .update(extendedUpdate as any)
      .eq('id', userId);

    if (error) {
      if (error.code === '42703' || error.code === 'PGRST204') {
        const { error: legacyErr } = await supabase
          .from('profiles')
          .update({
            username: profile.username,
            avatar_url: profile.avatar_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (legacyErr) return { success: false, error: legacyErr.message };
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * Inspects localStorage to see if user has pre-existing offline progress
 * that can be migrated to the Supabase Cloud.
 */
export const checkLocalDataForMigration = (): {
  hasLocalData: boolean;
  level: number;
  workoutsCount: number;
  habitsCount: number;
  summary: string;
} => {
  try {
    const isMigrated = localStorage.getItem('lifequest_migrated_to_cloud') === 'true';
    if (isMigrated) {
      return { hasLocalData: false, level: 1, workoutsCount: 0, habitsCount: 0, summary: '' };
    }

    const statsStr = localStorage.getItem('lifequest_v1_stats');
    const fitnessStr = localStorage.getItem('lifequest_v1_fitness');
    const habitsStr = localStorage.getItem('lifequest_v1_habits');

    if (!statsStr && !fitnessStr && !habitsStr) {
      return { hasLocalData: false, level: 1, workoutsCount: 0, habitsCount: 0, summary: '' };
    }

    const stats = statsStr ? JSON.parse(statsStr) : null;
    const fitness = fitnessStr ? JSON.parse(fitnessStr) : [];
    const habits = habitsStr ? JSON.parse(habitsStr) : [];

    const level = stats?.level || 1;
    const workoutsCount = Array.isArray(fitness) ? fitness.length : 0;
    const habitsCount = Array.isArray(habits) ? habits.length : 0;

    // If level > 1 or user has logged workouts or has custom habits
    if (level > 1 || workoutsCount > 0 || (stats && stats.playerXP > 50)) {
      return {
        hasLocalData: true,
        level,
        workoutsCount,
        habitsCount,
        summary: `Level ${level} Knight with ${workoutsCount} completed workouts & ${habitsCount} habits.`,
      };
    }

    return { hasLocalData: false, level: 1, workoutsCount: 0, habitsCount: 0, summary: '' };
  } catch (e) {
    return { hasLocalData: false, level: 1, workoutsCount: 0, habitsCount: 0, summary: '' };
  }
};
