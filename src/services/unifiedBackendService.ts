import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import {
  AdaptiveDifficultyTier,
  AppNotification,
  BlockedUserSummary,
  ChampionSummary,
  CharacterClass,
  ChatMessage,
  DailyQuestReportData,
  DynamicDailyQuest,
  DynamicQuestCategory,
  DynamicQuestDifficulty,
  DynamicQuestEvidenceType,
  FriendRecord,
  GlobalAchievementOwnership,
  GlobalLegendAnnouncement,
  GlobalTitleStyle,
  Guild,
  GuildDetailsData,
  GuildRole,
  HabitFrequency,
  LeaderboardEntry,
  LeaderboardScope,
  MyGuildInviteRecord,
  ProfileVisibility,
  PublicPlayerProfile,
  PresenceStatus,
  GranularPrivacySettings,
  RelationshipStatus,
  ShopItem,
  PlayerSkillTreeState,
  SkillActivityAwardResult,
  SkillActivityType,
  SkillAttributeId,
} from '../types/game';
import {
  SKILL_ATTRIBUTE_IDS,
  computeAttributeProgress,
  createEmptySkillTreeState,
  getSkillMilestoneById,
  getSkillNodeById,
  type VerifiedActivityMetadata,
} from '../data/skillTreeData';
import { getRpgAvatarForClass } from '../assets/images';

export const resolveSocialRpgAvatar = (
  avatarUrl: string | null | undefined,
  characterClass?: string | null
): string => {
  if (!avatarUrl || avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return getRpgAvatarForClass(characterClass || 'Warrior');
  }
  return avatarUrl;
};

export const getLifequestAuthHeaders = async (
  userId?: string,
  withContentType: boolean = false
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {};
  if (withContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (userId) {
    headers['x-lifequest-user-id'] = userId;
  }
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Non-fatal fallback to header userId in local offline/Express mode
  }
  return headers;
};

export const createIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Computes consistent period key matching PostgreSQL public.resolve_period_key():
 * - Daily/weekdays/weekends/custom: YYYY-MM-DD in user timezone
 * - Weekly (Mon-Sun): ISO week YYYY-Www
 * - Once: 'once'
 */
export const getPeriodKeyForFrequency = (
  frequency: HabitFrequency,
  timezone: string = getUserTimezone(),
  date: Date = new Date()
): string => {
  if (frequency === 'once') return 'once';

  let localYear = date.getUTCFullYear();
  let localMonth = date.getUTCMonth() + 1;
  let localDay = date.getUTCDate();

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    localYear = Number(parts.find(p => p.type === 'year')?.value || localYear);
    localMonth = Number(parts.find(p => p.type === 'month')?.value || localMonth);
    localDay = Number(parts.find(p => p.type === 'day')?.value || localDay);
  } catch {
    // Fallback to UTC parts above
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  if (frequency === 'weekly') {
    const d = new Date(Date.UTC(localYear, localMonth - 1, localDay));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${pad(weekNo)}`;
  }

  return `${localYear}-${pad(localMonth)}-${pad(localDay)}`;
};

/**
 * Returns remaining duration labels until Daily reset (local midnight) and Weekly reset (Monday 00:00).
 */
export const getResetCountdowns = (now: Date = new Date()): {
  dailyLabel: string;
  weeklyLabel: string;
} => {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const dailyDiffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const dHours = Math.floor(dailyDiffMs / 3600000);
  const dMins = Math.floor((dailyDiffMs % 3600000) / 60000);
  const dSecs = Math.floor((dailyDiffMs % 60000) / 1000);

  const dayOfWeek = now.getDay(); // 0 Sun .. 6 Sat
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const weeklyDiffMs = Math.max(0, nextMonday.getTime() - now.getTime());
  const wDays = Math.floor(weeklyDiffMs / 86400000);
  const wHours = Math.floor((weeklyDiffMs % 86400000) / 3600000);
  const wMins = Math.floor((weeklyDiffMs % 3600000) / 60000);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    dailyLabel: `${pad(dHours)}h ${pad(dMins)}m ${pad(dSecs)}s`,
    weeklyLabel: `${wDays}d ${pad(wHours)}h ${pad(wMins)}m`,
  };
};

export const isBackendSchemaMissingError = (error: any): boolean => {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42883' ||
    code === '42P01' ||
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
};

export interface RpcResult<T = any> {
  ok: boolean;
  schemaMissing?: boolean;
  data?: T;
  error?: string;
}

const callRpc = async <T = any>(
  fnName: string,
  args?: Record<string, any>
): Promise<RpcResult<T>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await (supabase.rpc as any)(fnName, args || {});
    if (error) {
      return {
        ok: false,
        schemaMissing: isBackendSchemaMissingError(error),
        error: error.message,
      };
    }
    return { ok: true, data: data as T };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
};

export const bootstrapUnifiedPlayerState = () =>
  callRpc<any>('rpc_bootstrap_player_state');

export const updateProfilePreferencesServer = async (params: {
  username?: string | null;
  characterName?: string | null;
  avatarUrl?: string | null;
  characterClass?: string | null;
  preferredUnits?: string | null;
  ageYears?: number | null;
  ageGroup?: string | null;
  biologicalSex?: string | null;
  height?: string | null;
  weight?: string | null;
  activityLevel?: string | null;
  preferredFitnessActivities?: string[] | null;
  fitnessGoals?: string[] | null;
  dietaryPreference?: string | null;
  foodAllergies?: string[] | null;
  foodIntolerances?: string[] | null;
  dislikedFoods?: string | null;
  notificationPreferences?: Record<string, boolean> | null;
  timezone?: string | null;
  soundEnabled?: boolean | null;
  isOnboarded?: boolean | null;
  leaderboardVisible?: boolean | null;
  bio?: string | null;
  profileVisibility?: ProfileVisibility | null;
  showAchievements?: boolean | null;
  showEquipment?: boolean | null;
  showStats?: boolean | null;
  showGuild?: boolean | null;
}) => {
  const baseArgs = {
    p_username: params.username ?? null,
    p_character_name: params.characterName ?? null,
    p_avatar_url: params.avatarUrl ?? null,
    p_character_class: params.characterClass ?? null,
    p_preferred_units: params.preferredUnits ?? null,
    p_height: params.height ?? null,
    p_weight: params.weight ?? null,
    p_activity_level: params.activityLevel ?? null,
    p_preferred_fitness_activities: params.preferredFitnessActivities ?? null,
    p_fitness_goals: params.fitnessGoals ?? null,
    p_dietary_preference: params.dietaryPreference ?? null,
    p_food_allergies: params.foodAllergies ?? null,
    p_food_intolerances: params.foodIntolerances ?? null,
    p_disliked_foods: params.dislikedFoods ?? null,
    p_notification_preferences: params.notificationPreferences ?? null,
    p_timezone: params.timezone ?? null,
    p_sound_enabled: typeof params.soundEnabled === 'boolean' ? params.soundEnabled : null,
    p_is_onboarded: typeof params.isOnboarded === 'boolean' ? params.isOnboarded : null,
    p_leaderboard_visible: typeof params.leaderboardVisible === 'boolean' ? params.leaderboardVisible : null,
  };
  const extendedRes = await callRpc<any>('rpc_update_profile_preferences', {
    ...baseArgs,
    p_age_years: typeof params.ageYears === 'number' ? params.ageYears : null,
    p_age_group: params.ageGroup ?? null,
    p_biological_sex: params.biologicalSex ?? null,
    p_bio: params.bio !== undefined ? params.bio : null,
    p_profile_visibility: params.profileVisibility ?? null,
    p_show_achievements: typeof params.showAchievements === 'boolean' ? params.showAchievements : null,
    p_show_equipment: typeof params.showEquipment === 'boolean' ? params.showEquipment : null,
    p_show_stats: typeof params.showStats === 'boolean' ? params.showStats : null,
    p_show_guild: typeof params.showGuild === 'boolean' ? params.showGuild : null,
  });
  if (!extendedRes.ok && extendedRes.schemaMissing) {
    return callRpc<any>('rpc_update_profile_preferences', baseArgs);
  }
  return extendedRes;
};

export const saveClientPreferencesServer = (preferences: Record<string, any>) =>
  callRpc<any>('rpc_save_client_preferences', { p_preferences: preferences });

export const lockHeroSelectionServer = (heroId: string) =>
  callRpc<any>('rpc_lock_hero_selection', { p_hero_id: heroId });

export const claimHabitRewardServer = (habitId: string, idempotencyKey = createIdempotencyKey()) =>
  callRpc<any>('rpc_claim_habit_reward', {
    p_habit_id: habitId,
    p_idempotency_key: idempotencyKey,
  });

export const createHabitServer = (params: {
  name: string;
  category: string;
  frequency: HabitFrequency;
  iconName: string;
  playerXpReward: number;
  goldReward?: number;
}) =>
  callRpc<any>('rpc_create_habit', {
    p_name: params.name,
    p_category: params.category,
    p_frequency: params.frequency,
    p_icon_name: params.iconName,
    p_player_xp: params.playerXpReward,
    p_gold: params.goldReward ?? 15,
  });

export const archiveHabitServer = (habitId: string) =>
  callRpc<any>('rpc_archive_habit', { p_habit_id: habitId });

export const logWorkoutServer = (params: {
  exerciseType: string;
  exerciseName: string;
  durationMinutes: number;
  repetitions?: number;
  distanceKm?: number;
  verifiedWithAetherVision: boolean;
  notes?: string;
  idempotencyKey?: string;
}) =>
  callRpc<any>('rpc_log_workout', {
    p_exercise_type: params.exerciseType,
    p_exercise_name: params.exerciseName,
    p_duration_minutes: params.durationMinutes,
    p_repetitions: params.repetitions || 0,
    p_distance_km: params.distanceKm ?? null,
    p_verified_with_vision: params.verifiedWithAetherVision,
    p_notes: params.notes ?? null,
    p_idempotency_key: params.idempotencyKey || createIdempotencyKey(),
  });

export const logNutritionServer = async (params: {
  mealType: string;
  title: string;
  foodItems: string[];
  dietaryCategory: string;
  balancedNotes: string;
  idempotencyKey?: string;
  nutritionEstimate?: Record<string, any> | null;
}) => {
  const baseArgs = {
    p_meal_type: params.mealType,
    p_title: params.title,
    p_food_items: params.foodItems,
    p_dietary_category: params.dietaryCategory,
    p_balanced_notes: params.balancedNotes,
    p_idempotency_key: params.idempotencyKey || createIdempotencyKey(),
  };
  const extendedRes = await callRpc<any>('rpc_log_nutrition', {
    ...baseArgs,
    p_nutrition_estimate: params.nutritionEstimate ?? null,
  });
  if (!extendedRes.ok && extendedRes.schemaMissing) {
    return callRpc<any>('rpc_log_nutrition', baseArgs);
  }
  return extendedRes;
};

export const logWaterGlassServer = () => callRpc<any>('rpc_log_water_glass');
export const resetWaterDailyServer = () => callRpc<any>('rpc_reset_water_daily');

export const claimQuestServer = (questId: string, periodKey?: string) =>
  callRpc<any>('rpc_claim_quest', {
    p_quest_id: questId,
    p_period_key: periodKey ?? null,
  });

export const claimAchievementServer = (achievementId: string) =>
  callRpc<any>('rpc_claim_achievement', { p_achievement_id: achievementId });

export const purchaseShopItemServer = (itemId: string, idempotencyKey = createIdempotencyKey()) =>
  callRpc<any>('rpc_purchase_shop_item', {
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey,
  });

export const toggleBuffServer = (buffId: string) =>
  callRpc<any>('rpc_toggle_buff', { p_buff_id: buffId });

export const discoverBossWeaknessServer = (kingdomId: string) =>
  callRpc<any>('rpc_discover_boss_weakness', { p_kingdom_id: kingdomId });

export const startBossEncounterServer = (kingdomId: string) =>
  callRpc<any>('rpc_start_boss_encounter', { p_kingdom_id: kingdomId });

export const bossCombatTurnServer = (
  kingdomId: string,
  action: 'attack' | 'ability' | 'defend' | 'dodge',
  abilityId?: string | null
) =>
  callRpc<any>('rpc_boss_combat_turn', {
    p_kingdom_id: kingdomId,
    p_action: action,
    p_ability_id: abilityId ?? null,
  });

export const completeBossVictoryServer = (
  kingdomId: string,
  idempotencyKey = createIdempotencyKey()
) =>
  callRpc<any>('rpc_complete_boss_victory', {
    p_kingdom_id: kingdomId,
    p_idempotency_key: idempotencyKey,
  });

export const resetBossEncounterServer = (kingdomId: string) =>
  callRpc<any>('rpc_reset_boss_encounter', { p_kingdom_id: kingdomId });

export const claimStoryRewardServer = (params: {
  rewardKey: string;
  playerXp: number;
  gold: number;
  description: string;
}) =>
  callRpc<any>('rpc_claim_story_reward', {
    p_reward_key: params.rewardKey,
    p_player_xp: params.playerXp,
    p_gold: params.gold,
    p_description: params.description,
  });

export const getChampionProfilesServer = async (
  userIds: string[]
): Promise<RpcResult<Record<string, any>>> => {
  if (!userIds || userIds.length === 0) return { ok: true, data: {} };
  const res = await callRpc<any[]>('rpc_get_champion_profiles', { p_user_ids: userIds });
  if (!res.ok) {
    if (res.schemaMissing) {
      const supabase = getSupabase();
      if (!supabase) return { ok: true, data: {} };
      const { data: fallbackRows } = await supabase
        .from('champion_public_profiles')
        .select('*')
        .in('id', userIds);
      const fallbackMap: Record<string, any> = {};
      for (const row of fallbackRows || []) fallbackMap[row.id] = row;
      return { ok: true, data: fallbackMap };
    }
    return { ok: false, error: res.error };
  }
  const map: Record<string, any> = {};
  for (const row of res.data || []) map[row.id] = row;
  return { ok: true, data: map };
};

export const fetchShopCatalogServer = async (): Promise<RpcResult<ShopItem[]>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('price_gold', { ascending: true });
  if (error) {
    return { ok: false, schemaMissing: isBackendSchemaMissingError(error), error: error.message };
  }
  return {
    ok: true,
    data: (data || []).map((row: any) => ({
      id: row.id,
      itemType: row.item_type,
      name: row.name,
      description: row.description,
      rarity: row.rarity,
      priceGold: row.price_gold,
      requiredLevel: row.required_level,
      metadata: row.metadata || {},
    })),
  };
};

export const fetchLeaderboardServer = async (
  scope: LeaderboardScope,
  limit = 50,
  offset = 0
): Promise<RpcResult<LeaderboardEntry[]>> => {
  const res = await callRpc<any[]>('rpc_get_leaderboard', {
    p_scope: scope,
    p_limit: limit,
    p_offset: offset,
  });
  if (!res.ok) return res as RpcResult<LeaderboardEntry[]>;

  return {
    ok: true,
    data: (res.data || []).map(row => ({
      rank: Number(row.rank),
      userId: row.user_id,
      name: row.username || 'Champion',
      avatar: resolveSocialRpgAvatar(row.avatar_url, row.character_class),
      characterClass: (row.character_class || 'Warrior') as CharacterClass,
      level: Number(row.level || 1),
      aetherRank: (row.aether_rank || 'Dormant') as any,
      streak: Number(row.streak || 0),
      score: Number(row.score || 0),
      isCurrent: Boolean(row.is_current_user),
      legendTitle: row.legend_title ?? null,
      legendTitleStyle: (row.legend_style as GlobalTitleStyle) ?? null,
      legendEmblem: row.legend_emblem ?? null,
    })),
  };
};

export const fetchGuildsServer = async (userId: string): Promise<RpcResult<Guild[]>> => {
  const rpcRes = await callRpc<any[]>('rpc_list_guilds');
  if (rpcRes.ok) {
    return {
      ok: true,
      data: (rpcRes.data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        emblem: g.emblem || 'Shield',
        level: Number(g.level || 1),
        guildXp: Number(g.guild_xp || 0),
        membersCount: Math.max(0, Number(g.members_count || 0)),
        maxMembers: Number(g.max_members || 30),
        description: g.description || '',
        weeklyQuestName: g.weekly_quest_name || 'Collective Weekly Raid',
        weeklyQuestProgress: Number(g.weekly_quest_progress || 0),
        weeklyQuestMax: Number(g.weekly_quest_max || 5000),
        isMember: Boolean(g.is_member),
        myRole: (g.my_role as GuildRole) || null,
        ownerId: g.owner_id || null,
        isPublic: typeof g.is_public === 'boolean' ? g.is_public : true,
        minLevel: Number(g.min_level || 1),
        hasPendingRequest: Boolean(g.has_pending_request),
        hasPendingInvite: Boolean(g.has_pending_invite),
      })),
    };
  }

  if (!rpcRes.schemaMissing) {
    return { ok: false, error: rpcRes.error };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const [guildsRes, membersRes] = await Promise.all([
    supabase.from('guilds').select('*').order('level', { ascending: false }),
    supabase.from('guild_members').select('guild_id, user_id'),
  ]);

  if (guildsRes.error) {
    return {
      ok: false,
      schemaMissing: isBackendSchemaMissingError(guildsRes.error),
      error: guildsRes.error.message,
    };
  }

  const members = membersRes.data || [];
  const counts: Record<string, number> = {};
  let myGuildId: string | null = null;
  for (const m of members as any[]) {
    counts[m.guild_id] = (counts[m.guild_id] || 0) + 1;
    if (m.user_id === userId) myGuildId = m.guild_id;
  }

  const realGuilds = (guildsRes.data || []).filter((g: any) => {
    const memberCount = counts[g.id] || 0;
    return g.owner_id != null || memberCount > 0;
  });

  return {
    ok: true,
    data: realGuilds.map((g: any) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      emblem: g.emblem || 'Shield',
      level: g.level || 1,
      guildXp: g.guild_xp || 0,
      membersCount: counts[g.id] || 0,
      maxMembers: g.max_members || 30,
      description: g.description || '',
      weeklyQuestName: g.weekly_quest_name || 'Collective Weekly Raid',
      weeklyQuestProgress: g.weekly_quest_progress || 0,
      weeklyQuestMax: g.weekly_quest_max || 5000,
      isMember: g.id === myGuildId,
      ownerId: g.owner_id || null,
      isPublic: typeof g.is_public === 'boolean' ? g.is_public : true,
      minLevel: g.min_level || 1,
    })),
  };
};

export const createGuildServer = async (params: {
  name: string;
  tag: string;
  description: string;
  emblem?: string;
  isPublic?: boolean;
  minLevel?: number;
}) => {
  const res = await callRpc<any>('rpc_create_guild', {
    p_name: params.name,
    p_tag: params.tag,
    p_description: params.description,
    p_emblem: params.emblem || 'Shield',
    p_is_public: typeof params.isPublic === 'boolean' ? params.isPublic : true,
    p_min_level: params.minLevel ?? 1,
  });
  if (!res.ok && res.schemaMissing) {
    return callRpc<any>('rpc_create_guild', {
      p_name: params.name,
      p_tag: params.tag,
      p_description: params.description,
    });
  }
  return res;
};

export const joinGuildServer = (guildId: string) =>
  callRpc<any>('rpc_join_guild', { p_guild_id: guildId });

export const leaveGuildServer = () => callRpc<any>('rpc_leave_guild');

export const requestJoinGuildServer = (guildId: string, message = '') =>
  callRpc<any>('rpc_request_join_guild', { p_guild_id: guildId, p_message: message });

export const respondGuildRequestServer = (requestId: string, accept: boolean) =>
  callRpc<any>('rpc_respond_guild_request', { p_request_id: requestId, p_accept: accept });

export const inviteToGuildServer = (guildId: string, targetUserId: string) =>
  callRpc<any>('rpc_invite_to_guild', { p_guild_id: guildId, p_target_user_id: targetUserId });

export const respondGuildInviteServer = (inviteId: string, accept: boolean) =>
  callRpc<any>('rpc_respond_guild_invite', { p_invite_id: inviteId, p_accept: accept });

export const listMyGuildInvitesServer = async (): Promise<RpcResult<MyGuildInviteRecord[]>> => {
  const res = await callRpc<any[]>('rpc_list_my_guild_invites');
  if (!res.ok) return res as RpcResult<MyGuildInviteRecord[]>;
  return {
    ok: true,
    data: (res.data || []).map((row: any) => ({
      inviteId: row.invite_id,
      guildId: row.guild_id,
      guildName: row.guild_name,
      guildTag: row.guild_tag,
      guildLevel: Number(row.guild_level || 1),
      inviterName: row.inviter_name || 'Guild Leader',
      createdAt: row.created_at,
    })),
  };
};

export const disbandGuildServer = (guildId: string) =>
  callRpc<any>('rpc_disband_guild', { p_guild_id: guildId });

export const createGuildChallengeServer = (params: {
  guildId: string;
  title: string;
  targetValue: number;
  rewardGold?: number;
  rewardPlayerXp?: number;
}) =>
  callRpc<any>('rpc_create_guild_challenge', {
    p_guild_id: params.guildId,
    p_title: params.title,
    p_target_value: params.targetValue,
    p_reward_gold: params.rewardGold ?? 100,
    p_reward_player_xp: params.rewardPlayerXp ?? 80,
  });

export const getGuildDetailsServer = (guildId: string): Promise<RpcResult<GuildDetailsData & { success: boolean; error?: string }>> =>
  callRpc<any>('rpc_get_guild_details', { p_guild_id: guildId });

export const updateGuildDetailsServer = async (params: {
  guildId: string;
  description?: string | null;
  weeklyQuestName?: string | null;
  isPublic?: boolean | null;
  minLevel?: number | null;
  emblem?: string | null;
}) => {
  const res = await callRpc<any>('rpc_update_guild_details', {
    p_guild_id: params.guildId,
    p_description: params.description ?? null,
    p_weekly_quest_name: params.weeklyQuestName ?? null,
    p_is_public: typeof params.isPublic === 'boolean' ? params.isPublic : null,
    p_min_level: typeof params.minLevel === 'number' ? params.minLevel : null,
    p_emblem: params.emblem ?? null,
  });
  if (!res.ok && res.schemaMissing) {
    return callRpc<any>('rpc_update_guild_details', {
      p_guild_id: params.guildId,
      p_description: params.description ?? null,
      p_weekly_quest_name: params.weeklyQuestName ?? null,
    });
  }
  return res;
};

export const manageGuildMemberServer = (
  guildId: string,
  targetUserId: string,
  action: 'promote' | 'demote' | 'kick' | 'transfer_leader'
) =>
  callRpc<any>('rpc_manage_guild_member', {
    p_guild_id: guildId,
    p_target_user_id: targetUserId,
    p_action: action,
  });

export const searchChampionsServer = async (
  query = '',
  limit = 40,
  offset = 0
): Promise<RpcResult<ChampionSummary[]>> => {
  let res = await callRpc<any[]>('rpc_search_champions', {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  });
  if (!res.ok && res.schemaMissing) {
    res = await callRpc<any[]>('rpc_search_champions', { p_query: query });
  }
  if (!res.ok) return res as RpcResult<ChampionSummary[]>;
  return {
    ok: true,
    data: (res.data || []).map(row => ({
      id: row.id,
      username: row.username || 'Champion',
      avatarUrl: resolveSocialRpgAvatar(row.avatar_url, row.character_class),
      characterClass: (row.character_class || 'Warrior') as CharacterClass,
      level: Number(row.level || 1),
      aetherRank: (row.aether_rank || 'Dormant') as any,
      currentStreak: Number(row.current_streak || 0),
      bio: row.bio || '',
      profileVisibility: (row.profile_visibility || 'public') as ProfileVisibility,
      relationshipStatus: (row.relationship_status || 'none') as RelationshipStatus,
      friendshipId: row.friendship_id || null,
      guildId: row.guild_id || null,
      guildName: row.guild_name || null,
      guildTag: row.guild_tag || null,
      achievementCount: typeof row.achievement_count === 'number' ? Number(row.achievement_count) : undefined,
      legendTitle: row.legend_title ?? null,
      legendTitleStyle: (row.legend_style as GlobalTitleStyle) ?? null,
      legendEmblem: row.legend_emblem ?? null,
    })),
  };
};

export const getPublicPlayerProfileServer = async (
  targetUserId: string
): Promise<RpcResult<PublicPlayerProfile>> => {
  const res = await callRpc<any>('rpc_get_public_player_profile', {
    p_target_user_id: targetUserId,
  });
  if (!res.ok) return res as RpcResult<PublicPlayerProfile>;
  if (res.data && res.data.success === false && !res.data.blocked) {
    return { ok: false, error: res.data.error || 'Could not load player profile.' };
  }
  return {
    ok: true,
    data: {
      accessible: Boolean(res.data?.accessible),
      restrictedReason: res.data?.restrictedReason,
      blocked: Boolean(res.data?.blocked),
      blockedByMe: Boolean(res.data?.blockedByMe),
      error: res.data?.error,
      player: res.data?.player,
    },
  };
};

export const fetchFriendshipsServer = async (userId: string): Promise<RpcResult<FriendRecord[]>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return { ok: false, schemaMissing: isBackendSchemaMissingError(error), error: error.message };
  }

  const peerIds = Array.from(
    new Set(
      (rows || []).map((r: any) =>
        r.requester_id === userId ? r.addressee_id : r.requester_id
      )
    )
  );

  let peerMap: Record<string, any> = {};
  if (peerIds.length > 0) {
    const resolved = await getChampionProfilesServer(peerIds);
    if (resolved.ok && resolved.data) {
      peerMap = resolved.data;
    }
  }

  return {
    ok: true,
    data: (rows || []).map((r: any) => {
      const peerId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      const peer = peerMap[peerId];
      const peerClass = (peer?.character_class || 'Warrior') as CharacterClass;
      return {
        friendshipId: r.id,
        status: r.status,
        direction: r.requester_id === userId ? 'outgoing' : 'incoming',
        createdAt: r.created_at,
        champion: {
          id: peerId,
          username: peer?.username || 'Champion',
          avatarUrl: resolveSocialRpgAvatar(peer?.avatar_url, peerClass),
          characterClass: peerClass,
          level: Number(peer?.level || 1),
          aetherRank: (peer?.aether_rank || 'Dormant') as any,
          currentStreak: Number(peer?.current_streak || 0),
          legendTitle: peer?.equipped_legend_title ?? peer?.legend_title ?? null,
          legendTitleStyle: (peer?.equipped_legend_style ?? peer?.legend_style ?? null) as GlobalTitleStyle | null,
          legendEmblem: peer?.equipped_legend_emblem ?? peer?.legend_emblem ?? null,
        },
      };
    }),
  };
};

export const sendFriendRequestServer = (targetUserId: string) =>
  callRpc<any>('rpc_send_friend_request', { p_target_user_id: targetUserId });

export const cancelFriendRequestServer = (friendshipId: string) =>
  callRpc<any>('rpc_cancel_friend_request', { p_friendship_id: friendshipId });

export const respondFriendRequestServer = (friendshipId: string, accept: boolean) =>
  callRpc<any>('rpc_respond_friend_request', {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });

export const removeFriendServer = (friendshipId: string) =>
  callRpc<any>('rpc_remove_friend', { p_friendship_id: friendshipId });

export const blockUserServer = (targetUserId: string) =>
  callRpc<any>('rpc_block_user', { p_target_user_id: targetUserId });

export const unblockUserServer = (targetUserId: string) =>
  callRpc<any>('rpc_unblock_user', { p_target_user_id: targetUserId });

export const listBlockedUsersServer = async (): Promise<RpcResult<BlockedUserSummary[]>> => {
  const res = await callRpc<any[]>('rpc_list_blocked_users');
  if (!res.ok) return res as RpcResult<BlockedUserSummary[]>;
  return {
    ok: true,
    data: (res.data || []).map((row: any) => ({
      id: row.id,
      username: row.username || 'Champion',
      characterClass: (row.character_class || 'Warrior') as CharacterClass,
      level: Number(row.level || 1),
      aetherRank: (row.aether_rank || 'Dormant') as any,
      blockedAt: row.blocked_at,
    })),
  };
};

export const fetchChatMessagesServer = async (
  currentUserId: string
): Promise<RpcResult<ChatMessage[]>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data: rows, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    return { ok: false, schemaMissing: isBackendSchemaMissingError(error), error: error.message };
  }

  const senderIds = Array.from(new Set((rows || []).map((r: any) => r.sender_id)));
  let senderMap: Record<string, any> = {};
  if (senderIds.length > 0) {
    const resolved = await getChampionProfilesServer(senderIds);
    if (resolved.ok && resolved.data) {
      senderMap = resolved.data;
    }
  }

  return {
    ok: true,
    data: (rows || []).map((row: any) => {
      const sender = senderMap[row.sender_id];
      const senderClass = (sender?.character_class || 'Warrior') as CharacterClass;
      return {
        id: row.id,
        senderId: row.sender_id,
        senderName: sender?.username || 'Champion',
        senderAvatar: resolveSocialRpgAvatar(sender?.avatar_url, senderClass),
        senderClass,
        text: row.body,
        timestamp: new Date(row.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        channel: row.channel as 'guild' | 'general' | 'whisper',
        isCurrentUser: row.sender_id === currentUserId,
        senderLegendTitle: sender?.equipped_legend_title ?? sender?.legend_title ?? null,
        senderLegendStyle: (sender?.equipped_legend_style ?? sender?.legend_style ?? null) as GlobalTitleStyle | null,
        senderLegendEmblem: sender?.equipped_legend_emblem ?? sender?.legend_emblem ?? null,
      };
    }),
  };
};

export const sendChatMessageServer = (
  channel: 'guild' | 'general' | 'whisper',
  body: string,
  guildId?: string | null,
  recipientId?: string | null
) =>
  callRpc<any>('rpc_send_chat_message', {
    p_channel: channel,
    p_body: body,
    p_guild_id: guildId ?? null,
    p_recipient_id: recipientId ?? null,
  });

export const reportChatMessageServer = (messageId: string, reason = 'Inappropriate behavior') =>
  callRpc<any>('rpc_report_chat_message', { p_message_id: messageId, p_reason: reason });

export const fetchNotificationsServer = async (
  userId: string
): Promise<RpcResult<AppNotification[]>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    return { ok: false, schemaMissing: isBackendSchemaMissingError(error), error: error.message };
  }
  return {
    ok: true,
    data: (data || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      payload: n.payload || {},
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
  };
};

export const markNotificationsReadServer = (notificationId?: string | null) =>
  callRpc<any>('rpc_mark_notifications_read', { p_notification_id: notificationId ?? null });

export interface UnifiedRealtimeHandlers {
  onChatInsert?: () => void;
  onNotificationInsert?: () => void;
  onFriendshipChange?: () => void;
  onGuildChange?: () => void;
  onProfileUpdate?: (row: any) => void;
  onFeedChange?: () => void;
  onPartyChange?: () => void;
  onDecisionsChange?: () => void;
  onTerritoryChange?: () => void;
  onCommunityMomentsChange?: () => void;
}

export const subscribeUnifiedRealtime = (
  userId: string,
  handlers: UnifiedRealtimeHandlers
): (() => void) => {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`lifequest-sync-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      () => handlers.onChatInsert?.()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => handlers.onNotificationInsert?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships' },
      () => handlers.onFriendshipChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'guilds' },
      () => handlers.onGuildChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'guild_members' },
      () => handlers.onGuildChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'guild_join_requests' },
      () => handlers.onGuildChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'guild_invites', filter: `invitee_id=eq.${userId}` },
      () => handlers.onGuildChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_blocks', filter: `blocker_id=eq.${userId}` },
      () => handlers.onFriendshipChange?.()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      payload => handlers.onProfileUpdate?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity_feed_posts' },
      () => handlers.onFeedChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workout_parties' },
      () => handlers.onPartyChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'community_polls' },
      () => handlers.onDecisionsChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'territory_wars_territories' },
      () => handlers.onTerritoryChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'community_event_announcements' },
      () => handlers.onCommunityMomentsChange?.()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// -----------------------------------------------------------------------------
// FEATURE 10 & 11: AI DYNAMIC QUESTS & DAILY QUEST REPORT SERVICES
// -----------------------------------------------------------------------------

const mapDynamicQuestRow = (row: any): DynamicDailyQuest => ({
  id: String(row.id),
  periodKey: String(row.period_key || row.periodKey || ''),
  title: String(row.title || ''),
  description: String(row.description || ''),
  category: (row.category || 'discipline') as DynamicQuestCategory,
  difficulty: (row.difficulty || 'medium') as DynamicQuestDifficulty,
  objectiveLabel: String(row.objective_label || row.objectiveLabel || ''),
  evidenceType: (row.evidence_type || row.evidenceType || 'personal_reflection') as DynamicQuestEvidenceType,
  progress: Number(row.progress || 0),
  maxProgress: Math.max(1, Number(row.max_progress || row.maxProgress || 1)),
  unitLabel: String(row.unit_label || row.unitLabel || 'step'),
  estimatedMinutes: Math.max(5, Number(row.estimated_minutes || row.estimatedMinutes || 15)),
  playerXpReward: Number(row.player_xp_reward || row.playerXpReward || 30),
  goldReward: Number(row.gold_reward || row.goldReward || 25),
  isSpecialChallenge: Boolean(row.is_special_challenge ?? row.isSpecialChallenge),
  personalizationReason: String(row.personalization_reason || row.personalizationReason || ''),
  adaptiveTier: (row.adaptive_tier || row.adaptiveTier || 'balanced') as AdaptiveDifficultyTier,
  completed: Boolean(row.completed),
  claimed: Boolean(row.claimed),
  evidenceNote: row.evidence_note ?? row.evidenceNote ?? undefined,
  completedAt: row.completed_at ?? row.completedAt ?? undefined,
  claimedAt: row.claimed_at ?? row.claimedAt ?? undefined,
  createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
});

export const generateDailyQuestsAiServer = async (payload: {
  periodKey: string;
  player: Record<string, any>;
  checkIn?: {
    availableMinutes?: number;
    energyLevel?: 'low' | 'medium' | 'high';
    focusNote?: string;
  };
  recentQuestTitles?: string[];
}): Promise<
  RpcResult<{
    adaptiveTier: AdaptiveDifficultyTier;
    mentorGreeting: string;
    quests: DynamicDailyQuest[];
  }>
> => {
  try {
    const res = await fetch('/api/ai/generate-daily-quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Could not generate today’s quests.' };
    }
    return {
      ok: true,
      data: {
        adaptiveTier: data.adaptiveTier as AdaptiveDifficultyTier,
        mentorGreeting: String(data.mentorGreeting || ''),
        quests: Array.isArray(data.quests) ? data.quests.map(mapDynamicQuestRow) : [],
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unable to reach AI Quest Architect.' };
  }
};

export const generateDailyQuestReportAiServer = async (payload: {
  reportDate: string;
  yesterdayDate: string;
  metrics: Record<string, any>;
}): Promise<RpcResult<DailyQuestReportData>> => {
  try {
    const res = await fetch('/api/ai/daily-quest-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Could not generate Daily Quest Report.' };
    }
    return { ok: true, data: data as DailyQuestReportData };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unable to reach Daily Chronicle chronicler.' };
  }
};

export const fetchPlayerDynamicQuestsServer = async (
  userId: string,
  periodKey?: string
): Promise<RpcResult<DynamicDailyQuest[]>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  let query = (supabase as any)
    .from('player_dynamic_quests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (periodKey) {
    query = query.eq('period_key', periodKey);
  } else {
    query = query.limit(40);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, schemaMissing: isBackendSchemaMissingError(error), error: error.message };
  }
  return { ok: true, data: (data || []).map(mapDynamicQuestRow) };
};

export const saveGeneratedDailyQuestsServer = async (
  periodKey: string,
  quests: DynamicDailyQuest[]
): Promise<RpcResult<{ alreadyGenerated: boolean; quests: DynamicDailyQuest[] }>> => {
  const res = await callRpc<any>('rpc_save_generated_daily_quests', {
    p_period_key: periodKey,
    p_quests: quests,
  });
  if (!res.ok) return res as any;
  return {
    ok: true,
    data: {
      alreadyGenerated: Boolean(res.data?.alreadyGenerated),
      quests: Array.isArray(res.data?.quests) ? res.data.quests.map(mapDynamicQuestRow) : quests,
    },
  };
};

export const updateDynamicQuestProgressServer = (
  periodKey: string,
  updates: Array<{ id: string; progress: number; evidenceNote?: string }>
) =>
  callRpc<any>('rpc_update_dynamic_quest_progress', {
    p_period_key: periodKey,
    p_updates: updates,
  });

export const claimDynamicQuestServer = (questId: string, periodKey: string) =>
  callRpc<any>('rpc_claim_dynamic_quest', {
    p_quest_id: questId,
    p_period_key: periodKey,
  });

export const saveDailyReportServer = (reportDate: string, reportData: DailyQuestReportData) =>
  callRpc<any>('rpc_save_daily_report', {
    p_report_date: reportDate,
    p_report_data: reportData,
  });

export const fetchDailyReportServer = async (
  userId: string,
  reportDate: string
): Promise<RpcResult<DailyQuestReportData | null>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await (supabase as any)
    .from('player_daily_reports')
    .select('report_data')
    .eq('user_id', userId)
    .eq('report_date', reportDate)
    .maybeSingle();

  if (error) {
    return { ok: false, schemaMissing: isBackendSchemaMissingError(error), error: error.message };
  }
  return { ok: true, data: (data?.report_data as DailyQuestReportData) || null };
};

// -----------------------------------------------------------------------------
// FEATURE 12: HALL OF LEGENDS (GLOBAL EXCLUSIVE ACHIEVEMENTS)
// -----------------------------------------------------------------------------

export interface LegendsFallbackState {
  claims: GlobalAchievementOwnership[];
  equippedByUser: Record<
    string,
    { achievementId: string; titleTag: string; titleStyle: GlobalTitleStyle; emblemIcon: string }
  >;
  announcements: GlobalLegendAnnouncement[];
}

export const fetchLegendsLedgerFallback = async (): Promise<LegendsFallbackState | null> => {
  try {
    const res = await fetch('/api/legends/state');
    if (!res.ok) return null;
    const data = await res.json();
    return {
      claims: Array.isArray(data?.claims) ? data.claims : [],
      equippedByUser: data?.equippedByUser && typeof data.equippedByUser === 'object' ? data.equippedByUser : {},
      announcements: Array.isArray(data?.announcements) ? data.announcements : [],
    };
  } catch {
    return null;
  }
};

export const fetchHallOfLegendsServer = async (): Promise<
  RpcResult<{
    metrics?: Record<string, number>;
    claims: GlobalAchievementOwnership[];
    announcements: GlobalLegendAnnouncement[];
    equippedByUser?: Record<
      string,
      { achievementId: string; titleTag: string; titleStyle: GlobalTitleStyle; emblemIcon: string }
    >;
    isFallbackLedger?: boolean;
  }>
> => {
  const res = await callRpc<any>('rpc_get_hall_of_legends');
  if (res.ok && res.data?.success) {
    return {
      ok: true,
      data: {
        metrics: res.data.metrics || undefined,
        claims: Array.isArray(res.data.claims) ? res.data.claims : [],
        announcements: Array.isArray(res.data.announcements) ? res.data.announcements : [],
        isFallbackLedger: false,
      },
    };
  }

  // Pre-migration fallback to server-side atomic Express ledger
  if (res.schemaMissing || !res.ok) {
    const ledger = await fetchLegendsLedgerFallback();
    if (ledger) {
      return {
        ok: true,
        data: {
          claims: ledger.claims,
          announcements: ledger.announcements,
          equippedByUser: ledger.equippedByUser,
          isFallbackLedger: true,
        },
      };
    }
  }

  return { ok: false, error: res.error || 'Could not load Hall of Legends.' };
};

export const claimGlobalAchievementServer = async (params: {
  achievementId: string;
  achievementName: string;
  titleTag: string;
  titleStyle: GlobalTitleStyle;
  emblemIcon: string;
  rarity: string;
  ownerId: string;
  ownerUsername: string;
  threshold: number;
  progressValue: number;
}): Promise<
  RpcResult<{
    success: boolean;
    alreadyClaimedGlobally?: boolean;
    ownerId?: string;
    ownerUsername?: string;
    claimedAt?: string;
    profile?: any;
    ownership?: GlobalAchievementOwnership;
    announcements?: GlobalLegendAnnouncement[];
    equippedByUser?: Record<string, any>;
    isFallbackLedger?: boolean;
    error?: string;
  }>
> => {
  const res = await callRpc<any>('rpc_claim_global_achievement', {
    p_achievement_id: params.achievementId,
  });

  if (res.ok) {
    if (res.data?.success === false) {
      return {
        ok: false,
        error: res.data?.error || 'Could not claim Global Exclusive Achievement.',
        data: res.data,
      };
    }
    return { ok: true, data: { ...res.data, isFallbackLedger: false } };
  }

  if (res.schemaMissing) {
    try {
      const headers = await getLifequestAuthHeaders(params.ownerId, true);
      const httpRes = await fetch('/api/legends/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const payload = await httpRes.json().catch(() => ({}));
      if (!httpRes.ok || payload?.success === false) {
        return {
          ok: false,
          error: payload?.error || 'Claim rejected.',
          data: payload,
        };
      }
      return {
        ok: true,
        data: { ...payload, isFallbackLedger: true },
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Unable to verify atomic claim.' };
    }
  }

  return { ok: false, error: res.error || 'Could not claim Global Exclusive Achievement.' };
};

export const setEquippedLegendTitleServer = async (params: {
  ownerId: string;
  achievementId: string | null;
  titleTag?: string | null;
  titleStyle?: GlobalTitleStyle | null;
  emblemIcon?: string | null;
}): Promise<RpcResult<any>> => {
  const res = await callRpc<any>('rpc_set_equipped_legend_title', {
    p_achievement_id: params.achievementId ?? null,
  });

  if (res.ok) {
    return res;
  }

  if (res.schemaMissing) {
    try {
      const headers = await getLifequestAuthHeaders(params.ownerId, true);
      const httpRes = await fetch('/api/legends/equip', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const payload = await httpRes.json().catch(() => ({}));
      if (!httpRes.ok || payload?.success === false) {
        return { ok: false, error: payload?.error || 'Could not update equipped legend title.' };
      }
      return { ok: true, data: payload };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not update equipped legend title.' };
    }
  }

  return res;
};

// --- PHASE 1: REAL-LIFE SKILL TREE SERVICE (SUPABASE RPC + EXPRESS AUTHORITATIVE FALLBACK) ---

export const normalizeSkillTreeState = (raw: any): PlayerSkillTreeState => {
  const base = createEmptySkillTreeState();
  if (!raw || typeof raw !== 'object') return base;

  const rawAttrs = raw.attributes || {};
  for (const attrId of SKILL_ATTRIBUTE_IDS) {
    const item = rawAttrs[attrId];
    if (item && typeof item === 'object') {
      base.attributes[attrId] = computeAttributeProgress(
        attrId as SkillAttributeId,
        Number(item.xp || 0),
        Number(item.totalActivities || 0),
        Number(item.dailyXpEarned || 0),
        item.lastActivityAt || null
      );
    }
  }

  base.unlockedNodeIds = Array.isArray(raw.unlockedNodeIds) ? raw.unlockedNodeIds.map(String) : [];
  base.claimedMilestoneIds = Array.isArray(raw.claimedMilestoneIds)
    ? raw.claimedMilestoneIds.map(String)
    : [];
  base.recentEvents = Array.isArray(raw.recentEvents) ? raw.recentEvents : [];
  if (raw.analytics && typeof raw.analytics === 'object') {
    base.analytics = raw.analytics;
  }
  return base;
};

const shouldUseSkillTreeExpressFallback = (res: RpcResult<any>): boolean => {
  return Boolean(res.schemaMissing || res.error === 'Supabase not configured');
};

export const fetchSkillTreeStateServer = async (
  userId: string,
  timezone: string = getUserTimezone()
): Promise<RpcResult<{ state: PlayerSkillTreeState }>> => {
  if (!userId) return { ok: false, error: 'Missing player identity.' };

  const rpcRes = await callRpc<any>('rpc_get_skill_tree_state');
  if (rpcRes.ok && rpcRes.data?.success !== false) {
    return {
      ok: true,
      data: { state: normalizeSkillTreeState(rpcRes.data?.state) },
    };
  }

  if (!shouldUseSkillTreeExpressFallback(rpcRes)) {
    return { ok: false, error: rpcRes.data?.error || rpcRes.error || 'Could not load Skill Tree.' };
  }

  try {
    const resp = await fetch(
      `/api/skill-tree/state?timezone=${encodeURIComponent(timezone)}`,
      {
        headers: {
          'x-lifequest-user-id': userId,
        },
      }
    );
    const json = await resp.json();
    if (!resp.ok || json?.success === false) {
      return { ok: false, error: json?.error || 'Could not load Skill Tree.' };
    }
    return { ok: true, data: { state: normalizeSkillTreeState(json.state) } };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Could not reach Skill Tree service.' };
  }
};

export const recordVerifiedSkillActivityServer = async (params: {
  userId: string;
  activityType: SkillActivityType;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  metadata?: VerifiedActivityMetadata;
  timezone?: string;
}): Promise<SkillActivityAwardResult> => {
  if (!params.userId) {
    return { success: false, error: 'Authentication required to earn skill XP.' };
  }

  const rpcRes = await callRpc<any>('rpc_record_verified_skill_activity', {
    p_activity_type: params.activityType,
    p_idempotency_key: params.idempotencyKey,
    p_source_type: params.sourceType,
    p_source_id: params.sourceId,
    p_metadata: params.metadata || {},
  });

  if (rpcRes.ok && rpcRes.data?.success) {
    return {
      success: true,
      duplicate: Boolean(rpcRes.data.duplicate),
      safetyCapped: Boolean(rpcRes.data.safetyCapped),
      attributeId: rpcRes.data.attributeId,
      xpAwarded: Number(rpcRes.data.xpAwarded || 0),
      previousLevel: Number(rpcRes.data.previousLevel || 1),
      newLevel: Number(rpcRes.data.newLevel || 1),
      leveledUp: Boolean(rpcRes.data.leveledUp),
      state: normalizeSkillTreeState(rpcRes.data.state),
    };
  }

  if (rpcRes.ok && rpcRes.data?.success === false) {
    return { success: false, error: rpcRes.data.error || 'Skill activity could not be verified.' };
  }

  if (!shouldUseSkillTreeExpressFallback(rpcRes)) {
    return { success: false, error: rpcRes.error || 'Could not record skill activity.' };
  }

  try {
    const resp = await fetch('/api/skill-tree/award-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({
        activityType: params.activityType,
        idempotencyKey: params.idempotencyKey,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        metadata: params.metadata || {},
        timezone: params.timezone || getUserTimezone(),
      }),
    });
    const json = await resp.json();
    if (!resp.ok || json?.success === false) {
      return { success: false, error: json?.error || 'Could not record verified activity.' };
    }
    return {
      success: true,
      duplicate: Boolean(json.duplicate),
      safetyCapped: Boolean(json.safetyCapped),
      attributeId: json.attributeId,
      xpAwarded: Number(json.xpAwarded || 0),
      previousLevel: Number(json.previousLevel || 1),
      newLevel: Number(json.newLevel || 1),
      leveledUp: Boolean(json.leveledUp),
      state: normalizeSkillTreeState(json.state),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Skill Tree service unavailable.' };
  }
};

export const unlockSkillNodeServer = async (params: {
  userId: string;
  nodeId: string;
  timezone?: string;
}): Promise<{ success: boolean; alreadyUnlocked?: boolean; state?: PlayerSkillTreeState; error?: string }> => {
  if (!params.userId) return { success: false, error: 'Authentication required.' };
  const node = getSkillNodeById(params.nodeId);
  if (!node) return { success: false, error: 'Skill node not found.' };

  const rpcRes = await callRpc<any>('rpc_unlock_skill_node', {
    p_node_id: node.id,
    p_attribute_id: node.attributeId,
    p_branch_id: node.branchId,
    p_min_level: node.requirements.minAttributeLevel,
    p_min_activities: node.requirements.minVerifiedActivities ?? 0,
    p_prerequisite_ids: node.requirements.prerequisiteNodeIds,
  });

  if (rpcRes.ok && rpcRes.data?.success) {
    return {
      success: true,
      alreadyUnlocked: Boolean(rpcRes.data.alreadyUnlocked),
      state: normalizeSkillTreeState(rpcRes.data.state),
    };
  }

  if (rpcRes.ok && rpcRes.data?.success === false) {
    return { success: false, error: rpcRes.data.error || 'Skill node requirements not met.' };
  }

  if (!shouldUseSkillTreeExpressFallback(rpcRes)) {
    return { success: false, error: rpcRes.error || 'Could not unlock skill node.' };
  }

  try {
    const resp = await fetch('/api/skill-tree/unlock-node', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({
        nodeId: node.id,
        timezone: params.timezone || getUserTimezone(),
      }),
    });
    const json = await resp.json();
    if (!resp.ok || json?.success === false) {
      return { success: false, error: json?.error || 'Skill node requirements not met.' };
    }
    return {
      success: true,
      alreadyUnlocked: Boolean(json.alreadyUnlocked),
      state: normalizeSkillTreeState(json.state),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Skill Tree service unavailable.' };
  }
};

export const claimSkillMilestoneServer = async (params: {
  userId: string;
  milestoneId: string;
  timezone?: string;
}): Promise<{ success: boolean; alreadyClaimed?: boolean; state?: PlayerSkillTreeState; error?: string }> => {
  if (!params.userId) return { success: false, error: 'Authentication required.' };
  const milestone = getSkillMilestoneById(params.milestoneId);
  if (!milestone) return { success: false, error: 'Milestone not found.' };

  const rpcRes = await callRpc<any>('rpc_claim_skill_milestone', {
    p_milestone_id: milestone.id,
    p_attribute_id: milestone.attributeId,
    p_required_level: milestone.requiredLevel,
    p_required_nodes: milestone.requiredNodesUnlocked ?? 0,
  });

  if (rpcRes.ok && rpcRes.data?.success) {
    return {
      success: true,
      alreadyClaimed: Boolean(rpcRes.data.alreadyClaimed),
      state: normalizeSkillTreeState(rpcRes.data.state),
    };
  }

  if (rpcRes.ok && rpcRes.data?.success === false) {
    return { success: false, error: rpcRes.data.error || 'Milestone requirements not met.' };
  }

  if (!shouldUseSkillTreeExpressFallback(rpcRes)) {
    return { success: false, error: rpcRes.error || 'Could not claim milestone.' };
  }

  try {
    const resp = await fetch('/api/skill-tree/claim-milestone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({
        milestoneId: milestone.id,
        timezone: params.timezone || getUserTimezone(),
      }),
    });
    const json = await resp.json();
    if (!resp.ok || json?.success === false) {
      return { success: false, error: json?.error || 'Milestone requirements not met.' };
    }
    return {
      success: true,
      alreadyClaimed: Boolean(json.alreadyClaimed),
      state: normalizeSkillTreeState(json.state),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Skill Tree service unavailable.' };
  }
};

// -----------------------------------------------------------------------------
// PHASE 7: DISCORD-STYLE PRESENCE & GRANULAR PRIVACY ENGINE
// -----------------------------------------------------------------------------

export interface PresenceSyncStatePayload {
  manualStatus: 'online' | 'away' | 'dnd';
  effectiveStatus: PresenceStatus;
  autoAwayEnabled: boolean;
  autoAwayMinutes: number;
  isAutoAway: boolean;
  lastActiveAt: string | null;
}

export const setPresenceStatusServer = async (params: {
  userId: string;
  manualStatus?: 'online' | 'away' | 'dnd';
  isAutoAway?: boolean;
  autoAwayEnabled?: boolean;
  autoAwayMinutes?: number;
  disconnected?: boolean;
}): Promise<{ ok: boolean; self?: PresenceSyncStatePayload }> => {
  if (!params.userId) return { ok: false };
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/presence/state', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) return { ok: false };
    return { ok: true, self: json.self as PresenceSyncStatePayload };
  } catch {
    return { ok: false };
  }
};

export const sendPresenceHeartbeatServer = async (params: {
  userId: string;
  isAutoAway?: boolean;
}): Promise<{ ok: boolean; self?: PresenceSyncStatePayload }> => {
  if (!params.userId) return { ok: false };
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/presence/state', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: params.userId,
        heartbeatOnly: true,
        isAutoAway: Boolean(params.isAutoAway),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) return { ok: false };
    return { ok: true, self: json.self as PresenceSyncStatePayload };
  } catch {
    return { ok: false };
  }
};

export const sendPresenceOfflineBeacon = (userId: string) => {
  if (!userId || typeof navigator === 'undefined') return;
  try {
    const payload = JSON.stringify({ userId });
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
      navigator.sendBeacon('/api/presence/offline', blob);
    } else {
      fetch('/api/presence/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // non-fatal during unload
  }
};

export const fetchPresenceBatchServer = async (params: {
  viewerId: string;
  userIds: string[];
}): Promise<Record<string, { userId: string; status: PresenceStatus; lastActiveAt: string | null; hidden?: boolean }>> => {
  if (!params.userIds.length) return {};
  try {
    const headers = await getLifequestAuthHeaders(params.viewerId, true);
    const res = await fetch('/api/presence/batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ viewerId: params.viewerId, userIds: params.userIds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.presences) return {};
    return json.presences;
  } catch {
    return {};
  }
};

export const syncPrivacyProfileServer = async (profile: {
  id: string;
  username: string;
  avatarUrl?: string;
  characterClass?: string;
  level?: number;
  aetherRank?: string;
  playerXP?: number;
  playerXPNextLevel?: number;
  aetherPoints?: number;
  currentStreak?: number;
  longestStreak?: number;
  bio?: string;
  guildId?: string | null;
  guildName?: string | null;
  guildTag?: string | null;
  legendTitle?: string | null;
  legendTitleStyle?: string | null;
  legendEmblem?: string | null;
  achievementsUnlocked?: number;
  totalWorkouts?: number;
  totalVerifiedReps?: number;
  totalActiveMinutes?: number;
  todayStats?: {
    habitsCompleted: number;
    activeMinutes: number;
    waterGlasses: number;
  };
  recentWorkouts?: Array<{ id: string; exerciseName: string; reps: number; xpEarned: number; date: string }>;
  personalRecords?: Array<{ title: string; displayValue: string; achievedAt: string }>;
  privacySettings: GranularPrivacySettings;
  friendIds: string[];
  blockedIds: string[];
}): Promise<void> => {
  if (!profile.id) return;
  try {
    const headers = await getLifequestAuthHeaders(profile.id, true);
    await fetch('/api/privacy/sync-profile', {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
  } catch {
    // non-fatal background sync
  }
};

export const fetchServerFilteredPublicProfile = async (params: {
  targetUserId: string;
  viewerId?: string;
  previewAs?: 'public' | 'friend' | 'restricted';
}): Promise<{
  ok: boolean;
  found?: boolean;
  relation?: string;
  profile?: any;
}> => {
  try {
    const qs = new URLSearchParams();
    if (params.viewerId) qs.set('viewerId', params.viewerId);
    if (params.previewAs) qs.set('previewAs', params.previewAs);
    const headers = await getLifequestAuthHeaders(params.viewerId, false);
    const res = await fetch(
      `/api/profile/public/${encodeURIComponent(params.targetUserId)}?${qs.toString()}`,
      { headers }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.found) {
      return { ok: false, found: false };
    }
    return {
      ok: true,
      found: true,
      relation: json.relation,
      profile: json.profile,
    };
  } catch {
    return { ok: false };
  }
};

export const enforceDirectoryPrivacyServer = async (
  viewerId: string,
  entries: ChampionSummary[]
): Promise<ChampionSummary[]> => {
  if (!entries.length) return entries;
  try {
    const headers = await getLifequestAuthHeaders(viewerId, true);
    const res = await fetch('/api/social/filter-directory', {
      method: 'POST',
      headers,
      body: JSON.stringify({ viewerId, entries }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(json?.entries)) return entries;
    return json.entries as ChampionSummary[];
  } catch {
    return entries;
  }
};



