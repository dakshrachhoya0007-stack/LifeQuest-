import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UserAccount,
  PlayerStats,
  Habit,
  Quest,
  Weapon,
  Buff,
  Kingdom,
  FitnessSession,
  Meal,
  Achievement,
  Guild,
  ChatMessage,
  Transaction,
  CharacterClass,
  AetherRankStage,
  ShopItem,
  LeaderboardEntry,
  LeaderboardScope,
  FriendRecord,
  ChampionSummary,
  AppNotification,
  EquippedGear,
  EquipmentSlotType,
  WeaponCategory,
  ProfileVisibility,
  PublicPlayerProfile,
  BlockedUserSummary,
  GuildDetailsData,
  MyGuildInviteRecord,
  PlayableHeroId,
  RpgAttributes,
  ReclaimHonorQuestState,
  CampaignProgressState,
  TutorialState,
  DynamicDailyQuest,
  DynamicQuestCategory,
  DynamicQuestEvidenceType,
  DynamicQuestHistoryEntry,
  AiQuestMentorMemory,
  DailyQuestReportData,
  HallOfLegendsEntry,
  GlobalLegendAnnouncement,
  GlobalAchievementOwnership,
  GlobalTitleStyle,
  AdaptiveDifficultyTier,
  HallOfLegendsStatus,
  GoldenTreeStage,
  LandmarkId,
  LandmarkRestorationStage,
  WorldGraphicsQuality,
  WorldPersistenceState,
  WorldPlayerPosition,
  PlayerSkillTreeState,
  SkillActivityAwardResult,
  SkillActivityType,
} from '../types/game';
import { createEmptySkillTreeState, type VerifiedActivityMetadata } from '../data/skillTreeData';
import type {
  CommunityEventPlayerState,
  MentorChatMessage,
  MentorRecommendedQuest,
  MentorWeeklyAnalysis,
  MuseumCategory,
  MuseumRecord,
  RivalChallengeType,
  WeeklyBossStatePayload,
} from '../types/game';
import {
  acceptMentorQuestServer,
  archiveSkillNodeMuseumServer,
  blockRivalUserServer,
  cancelRivalInviteServer,
  claimCommunityMilestoneServer,
  claimWeeklyBossRewardServer,
  dispatchVerifiedEcosystemActivityServer,
  endActiveRivalryServer,
  fetchAiMentorStateServer,
  fetchCommunityEventsStateServer,
  fetchMuseumRecordsServer,
  fetchRivalsStateServer,
  fetchWeeklyBossStateServer,
  inviteRivalServer,
  requestMentorWeeklyAnalysisServer,
  respondRivalInviteServer,
  sendAiMentorMessageServer,
  syncMuseumPrivacyServer,
  type MuseumQueryResponse,
  type RivalsStateResponse,
} from '../services/ecosystemService';
import { DEFAULT_WORLD_STATE } from '../data/heartlandsWorldData';
import { getHeroById, mapClassToDefaultHeroId } from '../data/heroesData';
import { CAMPAIGN_CHAPTERS, TUTORIAL_STEPS } from '../data/campaignData';
import {
  GLOBAL_EXCLUSIVE_ACHIEVEMENTS,
  GlobalMetricSnapshot,
  getMetricValueForRequirement,
} from '../data/globalLegendsData';
import {
  INITIAL_PLAYER_STATS,
  INITIAL_WEAPONS,
  INITIAL_HABITS,
  INITIAL_QUESTS,
  INITIAL_BUFFS,
  INITIAL_KINGDOMS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_SHOP_ITEMS,
  AETHER_RANK_STAGES,
  getEvolutionVisual,
  createAbilitiesForCategory,
} from '../data/initialData';
import {
  findBlueprintByWeaponId,
  LEGACY_WEAPON_EVOLUTION_OVERRIDES,
  getMasteryPathForCategory,
} from '../data/weaponArsenal';
import { getRarityStyle } from '../utils/rarityStyles';
import { sound } from '../utils/audio';
import { characterWarriorAvatarImg, getHeroArtwork, getRpgAvatarForClass } from '../assets/images';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { getOAuthRedirectUrl, sanitizeAuthErrorMessage } from '../lib/authRedirect';
import {
  loadCloudGameState,
  saveCloudGameState,
  saveCloudWorkout,
  saveCloudNutrition,
  saveCloudHabitLog,
  updateCloudProfile,
  checkLocalDataForMigration,
  CloudFullGameState,
} from '../services/cloudSaveService';
import {
  bootstrapUnifiedPlayerState,
  saveClientPreferencesServer,
  lockHeroSelectionServer,
  claimHabitRewardServer,
  createHabitServer,
  archiveHabitServer,
  logWorkoutServer,
  logNutritionServer,
  logWaterGlassServer,
  resetWaterDailyServer,
  claimQuestServer,
  claimAchievementServer,
  fetchShopCatalogServer,
  purchaseShopItemServer,
  equipWeaponServer,
  upgradeWeaponServer,
  trainWeaponMasteryServer,
  evolveWeaponServer,
  unlockProgressionWeaponServer,
  ascendWeaponRarityServer,
  toggleBuffServer,
  discoverBossWeaknessServer,
  startBossEncounterServer,
  bossCombatTurnServer,
  completeBossVictoryServer,
  resetBossEncounterServer,
  claimStoryRewardServer,
  fetchLeaderboardServer,
  fetchGuildsServer,
  createGuildServer,
  joinGuildServer,
  leaveGuildServer,
  requestJoinGuildServer,
  respondGuildRequestServer,
  inviteToGuildServer,
  respondGuildInviteServer,
  listMyGuildInvitesServer,
  disbandGuildServer,
  createGuildChallengeServer,
  getGuildDetailsServer,
  updateGuildDetailsServer,
  manageGuildMemberServer,
  fetchFriendshipsServer,
  searchChampionsServer,
  getPublicPlayerProfileServer,
  sendFriendRequestServer,
  cancelFriendRequestServer,
  respondFriendRequestServer,
  removeFriendServer,
  blockUserServer,
  unblockUserServer,
  listBlockedUsersServer,
  fetchChatMessagesServer,
  sendChatMessageServer,
  reportChatMessageServer,
  fetchNotificationsServer,
  markNotificationsReadServer,
  subscribeUnifiedRealtime,
  getPeriodKeyForFrequency,
  getUserTimezone,
  generateDailyQuestsAiServer,
  generateDailyQuestReportAiServer,
  fetchPlayerDynamicQuestsServer,
  saveGeneratedDailyQuestsServer,
  updateDynamicQuestProgressServer,
  claimDynamicQuestServer,
  saveDailyReportServer,
  fetchDailyReportServer,
  fetchHallOfLegendsServer,
  claimGlobalAchievementServer,
  setEquippedLegendTitleServer,
  getWorldStateServer,
  saveWorldStateServer,
  createIdempotencyKey,
  fetchSkillTreeStateServer,
  recordVerifiedSkillActivityServer,
  unlockSkillNodeServer,
  claimSkillMilestoneServer,
} from '../services/unifiedBackendService';
import { CloudSyncStatus } from '../components/Navigation/CloudSyncIndicator';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface GameContextType {
  user: UserAccount | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  stats: PlayerStats;
  habits: Habit[];
  quests: Quest[];
  weapons: Weapon[];
  buffs: Buff[];
  kingdoms: Kingdom[];
  fitnessSessions: FitnessSession[];
  meals: Meal[];
  waterGlasses: number;
  achievements: Achievement[];
  guilds: Guild[];
  chatMessages: ChatMessage[];
  transactions: Transaction[];
  shopItems: ShopItem[];
  friends: FriendRecord[];
  blockedUsers: BlockedUserSummary[];
  guildInvites: MyGuildInviteRecord[];
  selectedPublicProfileId: string | null;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  unifiedBackendReady: boolean;
  activeTab: string;
  socialSubTab: 'leaderboard' | 'friends' | 'chat' | 'rivals';
  setSocialSubTab: (subTab: 'leaderboard' | 'friends' | 'chat' | 'rivals') => void;
  progressionSubTab: 'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree';
  setProgressionSubTab: (
    subTab: 'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree'
  ) => void;
  // Phase 1: Real-Life Skill Tree (Strictly Independent from Player XP)
  skillTreeState: PlayerSkillTreeState;
  skillTreeLoading: boolean;
  lastSkillAwardBanner: SkillActivityAwardResult | null;
  dismissSkillAwardBanner: () => void;
  refreshSkillTreeState: () => Promise<void>;
  unlockSkillNode: (nodeId: string) => Promise<{ success: boolean; error?: string }>;
  claimSkillMilestone: (milestoneId: string) => Promise<{ success: boolean; error?: string }>;
  logVerifiedStudySession: (params: {
    topic: string;
    durationMinutes: number;
    reflection: string;
  }) => Promise<SkillActivityAwardResult>;
  // Phase 2: Weekly Boss Battles
  weeklyBossState: WeeklyBossStatePayload | null;
  weeklyBossLoading: boolean;
  refreshWeeklyBossState: (page?: number) => Promise<void>;
  claimWeeklyBossReward: (
    claimType: 'mission' | 'milestone' | 'participation' | 'defeat' | 'top_contributor',
    claimId: string
  ) => Promise<{ success: boolean; error?: string; rewards?: { xp: number; forgeXp: number; gold: number } }>;
  // Phase 3: Friend Rival System
  rivalsState: RivalsStateResponse | null;
  rivalsLoading: boolean;
  refreshRivalsState: () => Promise<void>;
  sendRivalInvite: (
    opponentId: string,
    opponentName: string,
    challengeType: RivalChallengeType
  ) => Promise<{ success: boolean; error?: string }>;
  respondRivalInvite: (
    rivalryId: string,
    decision: 'accept' | 'decline'
  ) => Promise<{ success: boolean; error?: string }>;
  cancelRivalInvite: (rivalryId: string) => Promise<{ success: boolean; error?: string }>;
  endActiveRivalry: (rivalryId: string) => Promise<{ success: boolean; error?: string }>;
  blockRivalUser: (targetUserId: string, unblock?: boolean) => Promise<{ success: boolean; error?: string }>;
  // Phase 4: AI Fitness Mentor
  mentorMessages: MentorChatMessage[];
  mentorQuests: MentorRecommendedQuest[];
  mentorWeeklyAnalysis: MentorWeeklyAnalysis | null;
  mentorLoading: boolean;
  mentorError: string | null;
  refreshAiMentorState: () => Promise<void>;
  sendAiMentorMessage: (message: string) => Promise<{ success: boolean; error?: string }>;
  requestMentorWeeklyAnalysis: () => Promise<{ success: boolean; error?: string }>;
  acceptMentorQuest: (questId: string) => Promise<{ success: boolean; error?: string }>;
  // Phase 5: Community Events
  communityEventState: CommunityEventPlayerState | null;
  communityEventLoading: boolean;
  refreshCommunityEventState: () => Promise<void>;
  claimCommunityMilestone: (milestoneId: string) => Promise<{ success: boolean; error?: string }>;
  // Phase 6: Personal Records Museum
  museumData: MuseumQueryResponse | null;
  museumLoading: boolean;
  refreshMuseumRecords: (params?: {
    category?: MuseumCategory | 'all';
    search?: string;
    sort?: 'newest' | 'oldest' | 'rarity' | 'value';
    page?: number;
  }) => Promise<void>;
  inspectPlayerMuseumRecords: (
    targetUserId: string,
    page?: number
  ) => Promise<{ ok: boolean; data?: MuseumQueryResponse; error?: string }>;
  // Feature 10: AI-Powered Dynamic Quest Generator
  dynamicDailyQuests: DynamicDailyQuest[];
  dynamicQuestHistory: DynamicQuestHistoryEntry[];
  aiMentorMemory: AiQuestMentorMemory;
  isGeneratingDailyQuests: boolean;
  questGenerationError: string | null;
  mentorGreeting: string | null;
  generateTodaysAiQuests: (checkIn?: {
    availableMinutes?: number;
    energyLevel?: 'low' | 'medium' | 'high';
    focusNote?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  submitDynamicQuestEvidence: (questId: string, evidenceNote: string) => Promise<{ success: boolean; error?: string }>;
  claimDynamicQuest: (questId: string) => Promise<{ success: boolean; error?: string }>;
  // Feature 11: Daily Quest Report
  dailyReport: DailyQuestReportData | null;
  isGeneratingDailyReport: boolean;
  dailyReportError: string | null;
  generateTodaysDailyReport: (forceRefresh?: boolean) => Promise<{ success: boolean; error?: string }>;
  // Feature 12: Global Exclusive Achievements & Hall of Legends
  hallOfLegends: HallOfLegendsEntry[];
  legendAnnouncements: GlobalLegendAnnouncement[];
  recentGlobalUnlockCelebration: HallOfLegendsEntry | null;
  hallLoading: boolean;
  equippedLegendMap: Record<
    string,
    { achievementId: string; titleTag: string; titleStyle: GlobalTitleStyle; emblemIcon: string }
  >;
  refreshHallOfLegends: () => Promise<void>;
  claimGlobalExclusiveAchievement: (
    achievementId: string
  ) => Promise<{ success: boolean; error?: string; ownerUsername?: string }>;
  equipGlobalLegendTitle: (achievementId: string | null) => Promise<{ success: boolean; error?: string }>;
  dismissGlobalUnlockCelebration: () => void;
  showAuthModal: boolean;
  authMode: 'login' | 'register';
  equippedWeapon: Weapon;
  equippedGear: EquippedGear;
  activeBuffs: Buff[];
  selectedHeroId: PlayableHeroId;
  heroLocked: boolean;
  heroSelectedAt: string | null;
  showHeroSelectModal: boolean;
  setShowHeroSelectModal: (show: boolean) => void;
  selectPlayableHero: (heroId: PlayableHeroId) => Promise<{ success: boolean; error?: string }>;
  rpgAttributes: RpgAttributes;
  reclaimHonorQuest: ReclaimHonorQuestState;
  recordEquipmentInspected: () => void;
  claimReclaimHonorReward: () => Promise<{ success: boolean; error?: string }>;
  campaignProgress: CampaignProgressState;
  evaluateChapterRequirements: (chapterId: string) => { met: boolean; missing: string[] };
  claimCampaignChapterReward: (chapterId: string) => Promise<{ success: boolean; error?: string }>;
  tutorialState: TutorialState;
  startTutorial: (startStepIndex?: number) => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  setActiveTab: (tab: string) => void;
  setShowAuthModal: (show: boolean, mode?: 'login' | 'register') => void;
  authError: string | null;
  clearAuthError: () => void;
  authCallbackError: string | null;
  clearAuthCallbackError: () => void;
  logout: () => Promise<void>;
  recheckAuthSession: () => Promise<void>;
  updateUser: (updates: Partial<UserAccount>) => Promise<{ success: boolean; error?: string }>;
  finishOnboarding: (accountData: Partial<UserAccount>, options?: { soundEnabled?: boolean }) => Promise<{ success: boolean; error?: string }>;
  // Habit Actions (Anti-Exploit)
  toggleHabitComplete: (habitId: string) => Promise<{ success: boolean; error?: string }>;
  createHabit: (newHabit: Omit<Habit, 'id' | 'completedToday' | 'streak' | 'history'>) => Promise<{ success: boolean; error?: string }>;
  deleteHabit: (habitId: string) => Promise<void>;
  isHabitClaimedForCurrentPeriod: (habit: Habit) => boolean;
  // Quest Actions
  claimQuest: (questId: string) => Promise<{ success: boolean; error?: string }>;
  // Armory, Shop & Weapon Evolution Actions
  equipWeapon: (weaponId: string) => void;
  equipGearSlot: (itemId: string, slot?: EquipmentSlotType) => void;
  getDefaultSlotForCategory: (category: WeaponCategory) => EquipmentSlotType;
  upgradeWeapon: (weaponId: string) => Promise<{
    success: boolean;
    updatedWeapon?: Weapon;
    previousLevel?: number;
    previousAttack?: number;
    previousDefense?: number;
    error?: string;
  }>;
  purchaseShopItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  trainWeaponMastery: (
    weaponId: string,
    gainedXP?: number
  ) => Promise<{ success: boolean; newLevel: number; abilityUnlocked?: string; error?: string }>;
  evolveWeapon: (weaponId: string) => Promise<{ success: boolean; newStage?: AetherRankStage; updatedWeapon?: Weapon; error?: string }>;
  unlockProgressionWeapon: (
    weaponId: string
  ) => Promise<{ success: boolean; weapon?: Weapon; error?: string }>;
  ascendWeaponRarity: (
    weaponId: string
  ) => Promise<{
    success: boolean;
    previousWeaponId?: string;
    updatedWeapon?: Weapon;
    previousAttack?: number;
    previousDefense?: number;
    previousLevel?: number;
    error?: string;
  }>;
  // Buff Actions
  activateBuff: (buffId: string) => void;
  // Fitness Actions
  logFitnessSession: (
    session: Omit<FitnessSession, 'id' | 'timestamp' | 'playerXpEarned' | 'forgeXpEarned'> & {
      idempotencyKey?: string;
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    deduplicated?: boolean;
    dailyCapReached?: boolean;
    rewards?: {
      playerXp: number;
      forgeXp: number;
      gold: number;
      aetherPoints: number;
      buffActivated: boolean;
    };
  }>;
  // Nutrition Actions
  logMeal: (
    meal: Omit<Meal, 'id' | 'timestamp'> & { idempotencyKey?: string }
  ) => Promise<{
    success: boolean;
    error?: string;
    deduplicated?: boolean;
    dailyCapReached?: boolean;
    rewards?: {
      playerXp: number;
      forgeXp: number;
      gold: number;
      aetherPoints: number;
    };
  }>;
  addWaterGlass: () => void;
  resetWaterGlasses: () => void;
  // Boss Battle Actions
  startBossBattle: (kingdomId: string) => Promise<{
    success: boolean;
    playerHp: number;
    playerStamina: number;
    turnCount: number;
    telegraphActive: boolean;
    error?: string;
  }>;
  attackBoss: (
    kingdomId: string,
    attackType: 'standard' | 'power' | 'special' | 'attack' | 'ability' | 'defend' | 'dodge',
    abilityId?: string,
    isWarningActive?: boolean
  ) => Promise<{
    playerDamage: number;
    bossDamage: number;
    isCrit: boolean;
    isWeaknessHit: boolean;
    isDefended: boolean;
    isDodged: boolean;
    bossDefeated: boolean;
    playerDefeated: boolean;
    combatLog: string;
    newPhase?: number;
    playerHp?: number;
    playerStamina?: number;
    turnCount?: number;
    telegraphActive?: boolean;
    error?: string;
  }>;
  discoverBossWeakness: (kingdomId: string) => void;
  resetBossBattle: (kingdomId: string) => void;
  // Achievement Actions
  claimAchievement: (achievementId: string) => Promise<{ success: boolean; error?: string }>;
  // Social, Friend Discovery, Guilds, Leaderboard & Notifications Actions
  openPublicProfile: (userId: string) => void;
  closePublicProfile: () => void;
  getPublicPlayerProfile: (userId: string) => Promise<{ success: boolean; data?: PublicPlayerProfile; error?: string }>;
  refreshSocialState: () => Promise<void>;
  fetchLeaderboard: (scope: LeaderboardScope) => Promise<{ entries: LeaderboardEntry[]; isLiveBackend: boolean }>;
  sendChatMessage: (channel: 'guild' | 'general' | 'whisper', text: string, recipientId?: string) => Promise<{ success: boolean; error?: string }>;
  reportChatMessage: (messageId: string) => Promise<void>;
  toggleGuildMembership: (guildId: string) => Promise<{ success: boolean; error?: string }>;
  leaveGuild: () => Promise<{ success: boolean; error?: string }>;
  createGuild: (params: {
    name: string;
    tag: string;
    description: string;
    emblem?: string;
    isPublic?: boolean;
    minLevel?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  getGuildDetails: (guildId: string) => Promise<{ success: boolean; data?: GuildDetailsData; error?: string }>;
  requestJoinGuild: (guildId: string, message?: string) => Promise<{ success: boolean; error?: string }>;
  respondGuildRequest: (requestId: string, accept: boolean) => Promise<{ success: boolean; error?: string }>;
  inviteToGuild: (guildId: string, targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  respondGuildInvite: (inviteId: string, accept: boolean) => Promise<{ success: boolean; error?: string }>;
  disbandGuild: (guildId: string) => Promise<{ success: boolean; error?: string }>;
  updateGuildDetails: (params: {
    guildId: string;
    description?: string | null;
    weeklyQuestName?: string | null;
    isPublic?: boolean | null;
    minLevel?: number | null;
    emblem?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  manageGuildMember: (
    guildId: string,
    targetUserId: string,
    action: 'promote' | 'demote' | 'kick' | 'transfer_leader'
  ) => Promise<{ success: boolean; error?: string }>;
  createGuildChallenge: (params: {
    guildId: string;
    title: string;
    targetValue: number;
    rewardGold?: number;
    rewardPlayerXp?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  searchChampions: (query?: string, limit?: number, offset?: number) => Promise<ChampionSummary[]>;
  sendFriendRequest: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  cancelFriendRequest: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  respondFriendRequest: (friendshipId: string, accept: boolean) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  blockUser: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  markNotificationRead: (notificationId?: string) => Promise<void>;
  // System Actions
  toggleSound: () => void;
  resetAllData: () => void;
  exportData: () => string;
  // Cloud & Supabase Persistence
  cloudStatus: CloudSyncStatus;
  lastSavedAt: Date | null;
  showMigrationModal: boolean;
  migrationSummary: string;
  showSupabaseConfigModal: boolean;
  setShowSupabaseConfigModal: (show: boolean) => void;
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogleWithSupabase: () => Promise<{ success: boolean; error?: string }>;
  registerWithSupabase: (params: { email: string; password: string; username: string }) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  resetPasswordWithSupabase: (email: string) => Promise<{ success: boolean; error?: string }>;
  performMigration: () => Promise<boolean>;
  skipMigration: () => void;
  triggerManualCloudSave: () => Promise<boolean>;
  // Phase 1: Explorable 3D World Foundation (The Heartlands)
  worldState: WorldPersistenceState;
  markWorldEntered: () => Promise<void>;
  setWorldGoldenTreeStage: (stage: GoldenTreeStage) => Promise<void>;
  setWorldLandmarkStage: (
    landmarkId: LandmarkId,
    stage: LandmarkRestorationStage,
    restorationPercent: number
  ) => Promise<void>;
  setWorldGraphicsQuality: (quality: WorldGraphicsQuality) => Promise<void>;
  saveWorldPlayerPosition: (pos: WorldPlayerPosition) => void;
}

const STORAGE_KEY_PREFIX = 'lifequest_v1_';

const ROUTE_TO_TAB: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/quests': 'quests',
  '/habits': 'quests',
  '/profile': 'character',
  '/character': 'character',
  '/workouts': 'fitness',
  '/fitness': 'fitness',
  '/nutrition': 'nutrition',
  '/aether-vision': 'aether-vision',
  '/armory': 'armory',
  '/buffs': 'buffs',
  '/boss-battles': 'boss-battles',
  '/weekly-boss': 'boss-battles',
  '/storyline': 'storyline',
  '/social': 'social',
  '/rivals': 'rivals',
  '/mentor': 'mentor',
  '/events': 'events',
  '/museum': 'museum',
  '/records': 'museum',
  '/leaderboard': 'leaderboard',
  '/leaderboards': 'leaderboard',
  '/friends': 'friends',
  '/discover': 'friends',
  '/guilds': 'guilds',
  '/chat': 'chat',
  '/progression': 'progression',
  '/daily-report': 'daily-report',
  '/report': 'daily-report',
  '/rewards': 'achievements',
  '/achievements': 'achievements',
  '/hall-of-legends': 'hall-of-legends',
  '/legends': 'hall-of-legends',
  '/skill-tree': 'skill-tree',
  '/skills': 'skill-tree',
  '/world': 'world',
  '/heartlands': 'world',
  '/settings': 'settings',
};

const resolveTabFromPathname = (pathname: string): string | null => {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return ROUTE_TO_TAB[normalized] || null;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Never auto-authenticate from localStorage; require verified Supabase session
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'stats');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_PLAYER_STATS,
          ...parsed,
          aetherRank: parsed.aetherRank || INITIAL_PLAYER_STATS.aetherRank,
          aetherPoints: typeof parsed.aetherPoints === 'number' ? parsed.aetherPoints : INITIAL_PLAYER_STATS.aetherPoints,
          aetherPointsNextRank: typeof parsed.aetherPointsNextRank === 'number' ? parsed.aetherPointsNextRank : INITIAL_PLAYER_STATS.aetherPointsNextRank,
        };
      }
      return INITIAL_PLAYER_STATS;
    } catch {
      return INITIAL_PLAYER_STATS;
    }
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'habits');
      return stored ? JSON.parse(stored) : INITIAL_HABITS;
    } catch {
      return INITIAL_HABITS;
    }
  });

  const [quests, setQuests] = useState<Quest[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'quests');
      return stored ? JSON.parse(stored) : INITIAL_QUESTS;
    } catch {
      return INITIAL_QUESTS;
    }
  });

  const [weapons, setWeapons] = useState<Weapon[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'weapons');
      if (stored) {
        const parsed: Weapon[] = JSON.parse(stored);
        return parsed.map(w => {
          const fallback = INITIAL_WEAPONS.find(iw => iw.id === w.id);
          const bp = findBlueprintByWeaponId(w.id);
          const legacyOv = LEGACY_WEAPON_EVOLUTION_OVERRIDES[w.id];
          const stage = w.evolutionStage || fallback?.evolutionStage || 'Dormant';
          const masteryLevel = w.masteryLevel || fallback?.masteryLevel || (bp?.awakened ? 4 : 1);
          const category = w.category || fallback?.category || bp?.category || 'Swords';
          const abilities = (w.abilities && w.abilities.length > 0)
            ? w.abilities
            : createAbilitiesForCategory(category, masteryLevel);
          return {
            ...fallback,
            ...legacyOv,
            ...w,
            critChance: w.critChance ?? bp?.critChance ?? legacyOv?.critChance ?? fallback?.critChance ?? 5,
            critDamage: w.critDamage ?? bp?.critDamage ?? legacyOv?.critDamage ?? fallback?.critDamage ?? 180,
            speed: w.speed ?? bp?.speed ?? legacyOv?.speed ?? fallback?.speed ?? 65,
            element: w.element ?? bp?.element ?? legacyOv?.element ?? fallback?.element ?? 'Physical',
            abilityPower: w.abilityPower ?? bp?.abilityPower ?? legacyOv?.abilityPower ?? fallback?.abilityPower ?? 5,
            specialAbilityName: w.specialAbilityName ?? bp?.specialAbilityName ?? legacyOv?.specialAbilityName,
            specialAbilitySummary: w.specialAbilitySummary ?? bp?.specialAbilitySummary ?? legacyOv?.specialAbilitySummary,
            combatIntegrationStatus: w.combatIntegrationStatus ?? bp?.combatIntegrationStatus ?? legacyOv?.combatIntegrationStatus ?? 'active_in_combat',
            obtainMethod: w.obtainMethod ?? bp?.obtainMethod ?? legacyOv?.obtainMethod ?? 'starter',
            unlockRequirement: w.unlockRequirement ?? bp?.unlockRequirement,
            evolutionPath: w.evolutionPath ?? bp?.evolutionPath ?? legacyOv?.evolutionPath,
            awakened: w.awakened ?? bp?.awakened ?? false,
            awakeningLevel: w.awakeningLevel ?? bp?.awakeningLevel ?? 0,
            evolutionStage: stage,
            masteryLevel,
            masteryXP: typeof w.masteryXP === 'number' ? w.masteryXP : 0,
            masteryXPNextLevel: w.masteryXPNextLevel || 100,
            masteryPath: w.masteryPath || fallback?.masteryPath || getMasteryPathForCategory(category),
            abilities,
            evolutionVisual: w.evolutionVisual || getEvolutionVisual(stage),
          };
        });
      }
      return INITIAL_WEAPONS;
    } catch {
      return INITIAL_WEAPONS;
    }
  });

  const [buffs, setBuffs] = useState<Buff[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'buffs');
      return stored ? JSON.parse(stored) : INITIAL_BUFFS;
    } catch {
      return INITIAL_BUFFS;
    }
  });

  const [kingdoms, setKingdoms] = useState<Kingdom[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'kingdoms');
      if (stored) {
        const parsed: Kingdom[] = JSON.parse(stored);
        return INITIAL_KINGDOMS.map(initK => {
          const matched = parsed.find(k => k.id === initK.id);
          if (!matched) return initK;
          return {
            ...initK,
            unlocked: matched.unlocked,
            cleared: matched.cleared,
            boss: {
              ...initK.boss,
              ...matched.boss,
              weakness: {
                ...initK.boss.weakness,
                ...(matched.boss?.weakness || {}),
              },
              resistance: initK.boss.resistance,
              signatureAttack: initK.boss.signatureAttack,
              defensiveMechanic: initK.boss.defensiveMechanic,
              phases: initK.boss.phases,
              health: typeof matched.boss?.health === 'number' ? matched.boss.health : initK.boss.health,
              defeated: matched.boss?.defeated ?? initK.boss.defeated,
            },
          };
        });
      }
      return INITIAL_KINGDOMS;
    } catch {
      return INITIAL_KINGDOMS;
    }
  });

  const [fitnessSessions, setFitnessSessions] = useState<FitnessSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'fitness');
      return stored ? JSON.parse(stored) : [
        {
          id: 'fit-init-1',
          exerciseType: 'squat',
          exerciseName: 'Aether Vision Verified Squats',
          repetitions: 20,
          durationMinutes: 10,
          verifiedWithAetherVision: true,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          playerXpEarned: 40,
          forgeXpEarned: 50,
        },
      ];
    } catch {
      return [];
    }
  });

  const [meals, setMeals] = useState<Meal[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'meals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'water');
      return stored ? Number(stored) : 5;
    } catch {
      return 5;
    }
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'achievements');
      return stored ? JSON.parse(stored) : INITIAL_ACHIEVEMENTS;
    } catch {
      return INITIAL_ACHIEVEMENTS;
    }
  });

  const [guilds, setGuilds] = useState<Guild[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'tx');
      return stored ? JSON.parse(stored) : [
        {
          id: 'tx-1',
          type: 'FORGE_XP',
          source: 'Initial Blacksmith Starter Grant',
          amount: 120,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: 'tx-2',
          type: 'PLAYER_XP',
          source: 'Morning Sleep Recovery Habit',
          amount: 20,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    } catch {
      return [];
    }
  });

  const [shopItems, setShopItems] = useState<ShopItem[]>(INITIAL_SHOP_ITEMS);
  const [equippedGear, setEquippedGear] = useState<EquippedGear>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'equipped_gear');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          mainWeaponId: parsed.mainWeaponId || 'w-sword-1',
          offHandId: parsed.offHandId ?? 'w-shield-1',
          armourId: parsed.armourId ?? null,
          helmetId: parsed.helmetId ?? null,
          accessoryId: parsed.accessoryId ?? null,
        };
      }
    } catch {
      // ignore storage failure
    }
    return {
      mainWeaponId: 'w-sword-1',
      offHandId: 'w-shield-1',
      armourId: null,
      helmetId: null,
      accessoryId: null,
    };
  });
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserSummary[]>([]);
  const [guildInvites, setGuildInvites] = useState<MyGuildInviteRecord[]>([]);
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unifiedBackendReady, setUnifiedBackendReady] = useState<boolean>(false);

  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const [socialSubTab, setSocialSubTabState] = useState<'leaderboard' | 'friends' | 'chat' | 'rivals'>('leaderboard');
  const [progressionSubTab, setProgressionSubTabState] = useState<
    'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree'
  >('quests');
  const [skillTreeState, setSkillTreeState] = useState<PlayerSkillTreeState>(() =>
    createEmptySkillTreeState()
  );
  const [skillTreeLoading, setSkillTreeLoading] = useState<boolean>(false);
  const [lastSkillAwardBanner, setLastSkillAwardBanner] =
    useState<SkillActivityAwardResult | null>(null);
  // Phases 2-6 Ecosystem State
  const [weeklyBossState, setWeeklyBossState] = useState<WeeklyBossStatePayload | null>(null);
  const [weeklyBossLoading, setWeeklyBossLoading] = useState<boolean>(false);
  const [rivalsState, setRivalsState] = useState<RivalsStateResponse | null>(null);
  const [rivalsLoading, setRivalsLoading] = useState<boolean>(false);
  const [mentorMessages, setMentorMessages] = useState<MentorChatMessage[]>([]);
  const [mentorQuests, setMentorQuests] = useState<MentorRecommendedQuest[]>([]);
  const [mentorWeeklyAnalysis, setMentorWeeklyAnalysis] = useState<MentorWeeklyAnalysis | null>(null);
  const [mentorLoading, setMentorLoading] = useState<boolean>(false);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [communityEventState, setCommunityEventState] = useState<CommunityEventPlayerState | null>(null);
  const [communityEventLoading, setCommunityEventLoading] = useState<boolean>(false);
  const [museumData, setMuseumData] = useState<MuseumQueryResponse | null>(null);
  const [museumLoading, setMuseumLoading] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModalState] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const clearAuthError = () => setAuthError(null);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null);
  const clearAuthCallbackError = () => setAuthCallbackError(null);

  const DEFAULT_RECLAIM_HONOR: ReclaimHonorQuestState = {
    objectives: {
      visit_armory: false,
      inspect_equipment: false,
      visit_shop: false,
      open_quest_board: false,
      view_attributes: false,
      complete_habit: false,
      return_castle: false,
    },
    completed: false,
    claimed: false,
  };

  const DEFAULT_CAMPAIGN_PROGRESS: CampaignProgressState = {
    activeChapterId: CAMPAIGN_CHAPTERS[0].id,
    completedChapterIds: [],
    claimedChapterIds: [],
  };

  const DEFAULT_ATTRIBUTE_BONUSES: RpgAttributes = {
    strength: 0,
    discipline: 0,
    intelligence: 0,
    vitality: 0,
    agility: 0,
    resilience: 0,
  };

  const [selectedHeroId, setSelectedHeroId] = useState<PlayableHeroId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'selected_hero_id');
      if (saved) return getHeroById(saved).id;
    } catch {
      // ignore
    }
    return 'fallen_knight';
  });
  const [heroLocked, setHeroLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + 'hero_locked') === 'true';
    } catch {
      return false;
    }
  });
  const [heroSelectedAt, setHeroSelectedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + 'hero_selected_at');
    } catch {
      return null;
    }
  });
  const [showHeroSelectModal, setShowHeroSelectModalState] = useState<boolean>(false);
  const setShowHeroSelectModal = (show: boolean) => {
    if (show && heroLocked) return;
    setShowHeroSelectModalState(show);
  };

  const [reclaimHonorQuest, setReclaimHonorQuest] = useState<ReclaimHonorQuestState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'reclaim_honor');
      if (saved) return { ...DEFAULT_RECLAIM_HONOR, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_RECLAIM_HONOR;
  });

  const [campaignProgress, setCampaignProgress] = useState<CampaignProgressState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'campaign_progress');
      if (saved) return { ...DEFAULT_CAMPAIGN_PROGRESS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_CAMPAIGN_PROGRESS;
  });

  const [attributeBonuses, setAttributeBonuses] = useState<RpgAttributes>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'attribute_bonuses');
      if (saved) return { ...DEFAULT_ATTRIBUTE_BONUSES, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_ATTRIBUTE_BONUSES;
  });

  const [tutorialState, setTutorialState] = useState<TutorialState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'tutorial_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isOpen: false,
          stepIndex: 0,
          completed: Boolean(parsed.completed),
          skipped: Boolean(parsed.skipped),
        };
      }
    } catch {
      // ignore
    }
    return { isOpen: false, stepIndex: 0, completed: false, skipped: false };
  });

  // Feature 10, 11 & 12 States
  const DEFAULT_MENTOR_MEMORY: AiQuestMentorMemory = {
    recentQuestTitles: [],
    preferredCategories: [],
    struggleCategories: [],
    lastAdaptiveTier: 'balanced',
    mentorNotes: '',
    reportsGeneratedCount: 0,
  };

  const [dynamicDailyQuests, setDynamicDailyQuests] = useState<DynamicDailyQuest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'dynamic_quests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dynamicQuestHistory, setDynamicQuestHistory] = useState<DynamicQuestHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'dynamic_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [aiMentorMemory, setAiMentorMemory] = useState<AiQuestMentorMemory>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'mentor_memory');
      if (saved) return { ...DEFAULT_MENTOR_MEMORY, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_MENTOR_MEMORY;
  });

  const [isGeneratingDailyQuests, setIsGeneratingDailyQuests] = useState<boolean>(false);
  const [questGenerationError, setQuestGenerationError] = useState<string | null>(null);
  const [mentorGreeting, setMentorGreeting] = useState<string | null>(null);

  const [dailyReport, setDailyReport] = useState<DailyQuestReportData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'daily_report');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGeneratingDailyReport, setIsGeneratingDailyReport] = useState<boolean>(false);
  const [dailyReportError, setDailyReportError] = useState<string | null>(null);

  const [legendClaims, setLegendClaims] = useState<GlobalAchievementOwnership[]>([]);
  const [legendAnnouncements, setLegendAnnouncements] = useState<GlobalLegendAnnouncement[]>([]);
  const [serverLegendMetrics, setServerLegendMetrics] = useState<Record<string, number> | null>(null);
  const [equippedLegendMap, setEquippedLegendMap] = useState<
    Record<string, { achievementId: string; titleTag: string; titleStyle: GlobalTitleStyle; emblemIcon: string }>
  >({});
  const [recentGlobalUnlockCelebration, setRecentGlobalUnlockCelebration] =
    useState<HallOfLegendsEntry | null>(null);
  const [hallLoading, setHallLoading] = useState<boolean>(false);

  // Phase 1: Explorable 3D World State (The Heartlands)
  const [worldState, setWorldState] = useState<WorldPersistenceState>(DEFAULT_WORLD_STATE);
  const worldStateRef = useRef<WorldPersistenceState>(DEFAULT_WORLD_STATE);
  const worldPosSaveTimerRef = useRef<any>(null);

  const normalizeWorldState = (raw: any): WorldPersistenceState => {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      hasEnteredWorld: Boolean(src.hasEnteredWorld),
      selectedRegionId: 'heartlands',
      goldenTreeStage: (['fallen', 'awakening', 'growing', 'radiant', 'eternal'].includes(src.goldenTreeStage)
        ? src.goldenTreeStage
        : DEFAULT_WORLD_STATE.goldenTreeStage) as GoldenTreeStage,
      landmarks: {
        ancient_castle: {
          ...DEFAULT_WORLD_STATE.landmarks.ancient_castle,
          ...(src.landmarks?.ancient_castle || {}),
          id: 'ancient_castle',
        },
        forgotten_village: {
          ...DEFAULT_WORLD_STATE.landmarks.forgotten_village,
          ...(src.landmarks?.forgotten_village || {}),
          id: 'forgotten_village',
        },
        ancient_bridge: {
          ...DEFAULT_WORLD_STATE.landmarks.ancient_bridge,
          ...(src.landmarks?.ancient_bridge || {}),
          id: 'ancient_bridge',
        },
        sacred_shrine: {
          ...DEFAULT_WORLD_STATE.landmarks.sacred_shrine,
          ...(src.landmarks?.sacred_shrine || {}),
          id: 'sacred_shrine',
        },
      },
      graphicsQuality: src.graphicsQuality === 'low' ? 'low' : 'high',
      lastPlayerPosition:
        src.lastPlayerPosition &&
        typeof src.lastPlayerPosition.x === 'number' &&
        typeof src.lastPlayerPosition.y === 'number' &&
        typeof src.lastPlayerPosition.z === 'number'
          ? src.lastPlayerPosition
          : DEFAULT_WORLD_STATE.lastPlayerPosition,
    };
  };

  const updateReclaimHonorObjective = (key: keyof ReclaimHonorQuestState['objectives']) => {
    setReclaimHonorQuest(prev => {
      if (prev.objectives[key]) return prev;
      const nextObj = { ...prev.objectives, [key]: true };
      const allDone = Object.values(nextObj).every(Boolean);
      return {
        ...prev,
        objectives: nextObj,
        completed: allDone || prev.completed,
      };
    });
  };

  const setSocialSubTab = (subTab: 'leaderboard' | 'friends' | 'chat' | 'rivals') => {
    sound.playClick();
    setSocialSubTabState(subTab);
  };

  const setProgressionSubTab = (
    subTab: 'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree'
  ) => {
    sound.playClick();
    setProgressionSubTabState(subTab);
    if (subTab === 'quests') {
      updateReclaimHonorObjective('open_quest_board');
    }
  };

  const setActiveTab = (tab: string) => {
    if (!isAuthenticated || !user) return;
    sound.playClick();

    // Unified hub routing while preserving all deep-links and tutorial/quest tracking
    if (tab === 'leaderboard' || tab === 'friends' || tab === 'chat' || tab === 'rivals') {
      setSocialSubTabState(tab);
      setActiveTabState('social');
    } else if (tab === 'social') {
      setActiveTabState('social');
    } else if (
      tab === 'quests' ||
      tab === 'daily-report' ||
      tab === 'achievements' ||
      tab === 'hall-of-legends' ||
      tab === 'skill-tree'
    ) {
      setProgressionSubTabState(tab);
      setActiveTabState('progression');
      if (tab === 'quests') updateReclaimHonorObjective('open_quest_board');
    } else if (tab === 'progression') {
      setActiveTabState('progression');
      if (progressionSubTab === 'quests') updateReclaimHonorObjective('open_quest_board');
    } else {
      setActiveTabState(tab);
    }

    // Genuine interactive navigation tracking for "Reclaim Your Honor"
    if (tab === 'armory') updateReclaimHonorObjective('visit_armory');
    if (tab === 'store') updateReclaimHonorObjective('visit_shop');
    if (tab === 'quests') updateReclaimHonorObjective('open_quest_board');
    if (tab === 'character') updateReclaimHonorObjective('view_attributes');
    if (tab === 'dashboard') {
      setReclaimHonorQuest(prev => {
        const priorSixMet =
          prev.objectives.visit_armory &&
          prev.objectives.inspect_equipment &&
          prev.objectives.visit_shop &&
          prev.objectives.open_quest_board &&
          prev.objectives.view_attributes &&
          prev.objectives.complete_habit;
        if (!priorSixMet || prev.objectives.return_castle) return prev;
        const nextObj = { ...prev.objectives, return_castle: true };
        return {
          ...prev,
          objectives: nextObj,
          completed: true,
        };
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setShowAuthModal = (show: boolean, mode: 'login' | 'register' = 'login') => {
    sound.playClick();
    setAuthMode(mode);
    setShowAuthModalState(show);
  };

  // Cloud Sync & Supabase States
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() =>
    isSupabaseConfigured() ? 'saved' : 'unconfigured'
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState<boolean>(false);
  const [migrationSummary, setMigrationSummary] = useState<string>('');
  const [showSupabaseConfigModal, setShowSupabaseConfigModal] = useState<boolean>(false);
  const cloudHydratedRef = useRef(false);
  const activeSessionUserIdRef = useRef<string | null>(null);
  const isVerifyingSessionRef = useRef<boolean>(false);
  const loadingUserPromisesRef = useRef<Record<string, Promise<void> | undefined>>({});
  const cloudSaveTimerRef = useRef<any>(null);

  const clearPrivateStorage = () => {
    const keys = [
      'user',
      'stats',
      'habits',
      'quests',
      'weapons',
      'buffs',
      'kingdoms',
      'fitness',
      'meals',
      'water',
      'achievements',
      'guilds',
      'chat',
      'tx',
      'equipped_gear',
      'selected_hero_id',
      'hero_locked',
      'hero_selected_at',
      'reclaim_honor',
      'campaign_progress',
      'attribute_bonuses',
      'tutorial_state',
      'dynamic_quests',
      'dynamic_history',
      'mentor_memory',
      'daily_report',
    ];
    keys.forEach(k => localStorage.removeItem(STORAGE_KEY_PREFIX + k));
  };

  const resetPrivateGameState = () => {
    clearPrivateStorage();
    setStats(INITIAL_PLAYER_STATS);
    setHabits(INITIAL_HABITS);
    setQuests(INITIAL_QUESTS);
    setWeapons(INITIAL_WEAPONS);
    setEquippedGear({
      mainWeaponId: 'w-sword-1',
      offHandId: 'w-shield-1',
      armourId: null,
      helmetId: null,
      accessoryId: null,
    });
    setBuffs(INITIAL_BUFFS);
    setKingdoms(INITIAL_KINGDOMS);
    setFitnessSessions([]);
    setMeals([]);
    setWaterGlasses(5);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setGuilds([]);
    setChatMessages([]);
    setFriends([]);
    setBlockedUsers([]);
    setGuildInvites([]);
    setSelectedPublicProfileId(null);
    setTransactions([]);
    setSelectedHeroId('fallen_knight');
    setHeroLocked(false);
    setHeroSelectedAt(null);
    setShowHeroSelectModalState(false);
    setReclaimHonorQuest(DEFAULT_RECLAIM_HONOR);
    setCampaignProgress(DEFAULT_CAMPAIGN_PROGRESS);
    setAttributeBonuses(DEFAULT_ATTRIBUTE_BONUSES);
    setTutorialState({ isOpen: false, stepIndex: 0, completed: false, skipped: false });
    setDynamicDailyQuests([]);
    setDynamicQuestHistory([]);
    setAiMentorMemory(DEFAULT_MENTOR_MEMORY);
    setDailyReport(null);
    setQuestGenerationError(null);
    setDailyReportError(null);
    setSkillTreeState(createEmptySkillTreeState());
    setLastSkillAwardBanner(null);
    setWeeklyBossState(null);
    setRivalsState(null);
    setMentorMessages([]);
    setMentorQuests([]);
    setMentorWeeklyAnalysis(null);
    setMentorError(null);
    setCommunityEventState(null);
    setMuseumData(null);
    if (worldPosSaveTimerRef.current) {
      clearTimeout(worldPosSaveTimerRef.current);
      worldPosSaveTimerRef.current = null;
    }
    if (activeSessionUserIdRef.current) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'world_state_' + activeSessionUserIdRef.current);
    }
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'world_state_guest');
    worldStateRef.current = DEFAULT_WORLD_STATE;
    setWorldState(DEFAULT_WORLD_STATE);
    setMentorGreeting(null);
    setRecentGlobalUnlockCelebration(null);
  };

  const applyServerProfileToStats = (prof: any) => {
    if (!prof) return;
    setStats(prev => ({
      ...prev,
      level: typeof prof.level === 'number' ? prof.level : prev.level,
      playerXP: typeof prof.player_xp === 'number' ? prof.player_xp : prev.playerXP,
      playerXPNextLevel: typeof prof.player_xp_next_level === 'number' ? prof.player_xp_next_level : prev.playerXPNextLevel,
      forgeXP: typeof prof.forge_xp === 'number' ? prof.forge_xp : prev.forgeXP,
      gold: typeof prof.gold_balance === 'number' ? prof.gold_balance : prev.gold,
      aetherRank: (prof.aether_rank || prev.aetherRank) as AetherRankStage,
      aetherPoints: typeof prof.aether_points === 'number' ? prof.aether_points : prev.aetherPoints,
      aetherPointsNextRank: typeof prof.aether_points_next_rank === 'number' ? prof.aether_points_next_rank : prev.aetherPointsNextRank,
      currentStreak: typeof prof.current_streak === 'number' ? prof.current_streak : prev.currentStreak,
      totalWorkoutsCompleted: typeof prof.total_workouts_completed === 'number' ? prof.total_workouts_completed : prev.totalWorkoutsCompleted,
      totalVerifiedReps: typeof prof.total_verified_reps === 'number' ? prof.total_verified_reps : prev.totalVerifiedReps,
      totalBossesDefeated: typeof prof.total_bosses_defeated === 'number' ? prof.total_bosses_defeated : prev.totalBossesDefeated,
      equippedWeaponId: prof.equipped_weapon_id || prev.equippedWeaponId,
      currentKingdomId: prof.current_kingdom_id || prev.currentKingdomId,
    }));
  };

  const mapServerWeapon = (row: any): Weapon => {
    const id = row.weapon_id || row.id;
    const base = INITIAL_WEAPONS.find(iw => iw.id === id);
    const bp = findBlueprintByWeaponId(id);
    const legacyOv = LEGACY_WEAPON_EVOLUTION_OVERRIDES[id];
    const shopMatch = INITIAL_SHOP_ITEMS.find(si => si.metadata?.weaponId === id || si.id === id);
    const category = (row.category || base?.category || bp?.category || shopMatch?.metadata?.category || 'Swords') as Weapon['category'];
    const stage = (row.evolution_stage || base?.evolutionStage || (bp?.awakened ? 'Awakened' : 'Dormant')) as AetherRankStage;
    const masteryLevel = typeof row.mastery_level === 'number' ? row.mastery_level : (base?.masteryLevel || (bp?.awakened ? 4 : 1));
    const rawAbilities = Array.isArray(row.abilities) && row.abilities.length > 0
      ? row.abilities
      : base?.abilities || createAbilitiesForCategory(category, masteryLevel);
    const resolvedRarity = (row.rarity === 'Mythical' ? 'Mythic' : row.rarity) || base?.rarity || bp?.rarity || shopMatch?.rarity || 'Common';

    return {
      id,
      name: row.name || base?.name || bp?.name || shopMatch?.name || 'Forged Weapon',
      category,
      rarity: resolvedRarity as Weapon['rarity'],
      level: typeof row.level === 'number' ? row.level : 1,
      maxLevel: typeof row.max_level === 'number' ? row.max_level : (base?.maxLevel || bp?.maxLevel || shopMatch?.metadata?.maxLevel || 10),
      baseAttack: typeof row.base_attack === 'number' ? row.base_attack : (base?.baseAttack || bp?.baseAttack || shopMatch?.metadata?.baseAttack || 15),
      attackPerLevel: typeof row.attack_per_level === 'number' ? row.attack_per_level : (base?.attackPerLevel || bp?.attackPerLevel || shopMatch?.metadata?.attackPerLevel || 4),
      baseDefense: typeof row.base_defense === 'number' ? row.base_defense : (base?.baseDefense || bp?.baseDefense || shopMatch?.metadata?.baseDefense || 2),
      defensePerLevel: typeof row.defense_per_level === 'number' ? row.defense_per_level : (base?.defensePerLevel || bp?.defensePerLevel || shopMatch?.metadata?.defensePerLevel || 1),
      critChance: typeof row.crit_chance === 'number' ? row.crit_chance : (bp?.critChance ?? legacyOv?.critChance ?? base?.critChance ?? Number(shopMatch?.metadata?.critChance ?? 6)),
      critDamage: typeof row.crit_damage === 'number' ? row.crit_damage : (bp?.critDamage ?? legacyOv?.critDamage ?? base?.critDamage ?? Number(shopMatch?.metadata?.critDamage ?? 180)),
      speed: typeof row.speed === 'number' ? row.speed : (bp?.speed ?? legacyOv?.speed ?? base?.speed ?? Number(shopMatch?.metadata?.speed ?? 65)),
      element: (row.element || bp?.element || legacyOv?.element || base?.element || shopMatch?.metadata?.element || 'Physical') as Weapon['element'],
      abilityPower: typeof row.ability_power === 'number' ? row.ability_power : (bp?.abilityPower ?? legacyOv?.abilityPower ?? base?.abilityPower ?? Number(shopMatch?.metadata?.abilityPower ?? 8)),
      specialAbilityName: bp?.specialAbilityName ?? legacyOv?.specialAbilityName ?? base?.specialAbilityName ?? (shopMatch?.metadata?.specialAbilityName as string | undefined),
      specialAbilitySummary: bp?.specialAbilitySummary ?? legacyOv?.specialAbilitySummary ?? base?.specialAbilitySummary ?? (shopMatch?.metadata?.specialAbilitySummary as string | undefined),
      combatIntegrationStatus: bp?.combatIntegrationStatus ?? legacyOv?.combatIntegrationStatus ?? base?.combatIntegrationStatus ?? 'active_in_combat',
      obtainMethod: (row.unlock_source || bp?.obtainMethod || legacyOv?.obtainMethod || base?.obtainMethod || 'shop') as Weapon['obtainMethod'],
      unlockRequirement: bp?.unlockRequirement ?? base?.unlockRequirement,
      evolutionPath: bp?.evolutionPath ?? legacyOv?.evolutionPath ?? base?.evolutionPath ?? (shopMatch?.metadata?.evolutionPath as Weapon['evolutionPath'] | undefined),
      awakened: typeof row.awakened === 'boolean' ? row.awakened : (bp?.awakened ?? base?.awakened ?? false),
      awakeningLevel: typeof row.awakening_level === 'number' ? row.awakening_level : (bp?.awakeningLevel ?? base?.awakeningLevel ?? 0),
      upgradeForgeCost: typeof row.upgrade_forge_cost === 'number' ? row.upgrade_forge_cost : (base?.upgradeForgeCost || bp?.upgradeForgeCost || shopMatch?.metadata?.upgradeForgeCost || 30),
      unlocked: row.unlocked ?? true,
      equipped: Boolean(row.equipped),
      description: base?.description || bp?.description || shopMatch?.description || 'A finely forged artifact of Aetheria.',
      lore: base?.lore || bp?.lore || shopMatch?.metadata?.lore || 'Tempered through disciplined real-world training.',
      illustration: base?.illustration,
      evolutionStage: stage,
      masteryLevel,
      masteryXP: typeof row.mastery_xp === 'number' ? row.mastery_xp : 0,
      masteryXPNextLevel: typeof row.mastery_xp_next_level === 'number' ? row.mastery_xp_next_level : 100,
      masteryPath: (row.mastery_path || base?.masteryPath || getMasteryPathForCategory(category)) as Weapon['masteryPath'],
      abilities: rawAbilities.map((ab: any) => ({
        ...ab,
        unlocked: Boolean(ab.unlocked) || masteryLevel >= (ab.unlockMasteryLevel || 1),
      })),
      evolutionVisual: getEvolutionVisual(stage),
    };
  };

  const syncWeaponsFromServer = async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('player_weapons')
      .select('*')
      .eq('user_id', uid)
      .order('equipped', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      setWeapons(data.map(mapServerWeapon));
    }
  };

  const refreshSocialAndShopData = async (uid: string) => {
    const [shopRes, guildsRes, friendsRes, chatRes, notifRes, blocksRes, invitesRes] = await Promise.all([
      fetchShopCatalogServer(),
      fetchGuildsServer(uid),
      fetchFriendshipsServer(uid),
      fetchChatMessagesServer(uid),
      fetchNotificationsServer(uid),
      listBlockedUsersServer(),
      listMyGuildInvitesServer(),
    ]);
    if (shopRes.ok && shopRes.data && shopRes.data.length > 0) {
      // Keep authoritative server shop items first, enriched with local lore/artwork metadata
      const serverIds = new Set(shopRes.data.map(s => s.id));
      const enrichedServer = shopRes.data.map(s => {
        const localMeta = INITIAL_SHOP_ITEMS.find(i => i.id === s.id);
        return localMeta ? { ...s, metadata: { ...localMeta.metadata, ...(s.metadata || {}) } } : s;
      });
      const upcomingCatalog = INITIAL_SHOP_ITEMS.filter(i => !serverIds.has(i.id));
      setShopItems([...enrichedServer, ...upcomingCatalog]);
    }
    if (guildsRes.ok && guildsRes.data) setGuilds(guildsRes.data);
    if (friendsRes.ok && friendsRes.data) setFriends(friendsRes.data);
    if (chatRes.ok && chatRes.data) setChatMessages(chatRes.data);
    if (notifRes.ok && notifRes.data) setNotifications(notifRes.data);
    if (blocksRes.ok && blocksRes.data) setBlockedUsers(blocksRes.data);
    if (invitesRes.ok && invitesRes.data) setGuildInvites(invitesRes.data);
  };

  // Helper to load user profile & cloud state from Supabase (deduped per user id)
  const loadUserCloudData = async (sbUser: SupabaseUser) => {
    const existingPromise = loadingUserPromisesRef.current[sbUser.id];
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      cloudHydratedRef.current = false;
      setCloudStatus('saving');
      try {
        const cloudRes = await loadCloudGameState(sbUser.id);
        const prof = cloudRes.profile;
        const userTimezone = prof?.timezone || getUserTimezone();

        const buildUserFromProfile = (p: any, existing?: UserAccount | null): UserAccount => {
          const allergiesArr: string[] = Array.isArray(p?.food_allergies)
            ? p.food_allergies
            : existing?.foodAllergiesList || [];
          const intolerancesArr: string[] = Array.isArray(p?.food_intolerances)
            ? p.food_intolerances
            : existing?.foodIntolerances || [];
          const activitiesArr: string[] =
            Array.isArray(p?.preferred_fitness_activities) && p.preferred_fitness_activities.length > 0
              ? p.preferred_fitness_activities
              : existing?.preferredActivities || [];
          const goalsArr: string[] =
            Array.isArray(p?.fitness_goals) && p.fitness_goals.length > 0
              ? p.fitness_goals
              : existing?.personalGoals || [];
          const notifObj =
            p?.notification_preferences && typeof p.notification_preferences === 'object'
              ? {
                  dailyReminders: p.notification_preferences.dailyReminders ?? true,
                  weeklySummary: p.notification_preferences.weeklySummary ?? true,
                  guildUpdates: p.notification_preferences.guildUpdates ?? true,
                  questAlerts: p.notification_preferences.questAlerts ?? true,
                }
              : existing?.notificationPreferences || {
                  dailyReminders: true,
                  weeklySummary: true,
                  guildUpdates: true,
                  questAlerts: true,
                };

          const hasLegacyGameplay = Boolean(
            cloudRes.gameState?.stats ||
            (cloudRes.workoutSessions && cloudRes.workoutSessions.length > 0) ||
            (cloudRes.meals && cloudRes.meals.length > 0)
          );

          const resolvedOnboarded =
            typeof p?.is_onboarded === 'boolean'
              ? p.is_onboarded
              : hasLegacyGameplay;

          const metaUsername =
            (sbUser.user_metadata?.username as string) ||
            (sbUser.user_metadata?.full_name as string) ||
            (sbUser.user_metadata?.name as string) ||
            sbUser.email?.split('@')[0] ||
            'Hero';

          const metaAvatar =
            (sbUser.user_metadata?.avatar_url as string) ||
            (sbUser.user_metadata?.picture as string) ||
            '';
          const googlePhoto =
            metaAvatar.startsWith('http')
              ? metaAvatar
              : (p?.avatar_url && String(p.avatar_url).startsWith('http') ? String(p.avatar_url) : existing?.googleAvatar);

          const clientPrefs = cloudRes.clientPreferences || {};
          const resolvedAgeYears =
            typeof p?.age_years === 'number'
              ? p.age_years
              : typeof clientPrefs.ageYears === 'number'
              ? clientPrefs.ageYears
              : existing?.ageYears;
          const resolvedAgeGroup =
            (p?.age_group as UserAccount['ageGroup']) ||
            (clientPrefs.ageGroup as UserAccount['ageGroup']) ||
            existing?.ageGroup;
          const resolvedBiologicalSex =
            (p?.biological_sex as UserAccount['biologicalSex']) ||
            (clientPrefs.biologicalSex as UserAccount['biologicalSex']) ||
            existing?.biologicalSex;

          return {
            id: sbUser.id,
            username: p?.username || metaUsername,
            characterName: p?.character_name || existing?.characterName || p?.username || metaUsername,
            email: sbUser.email || '',
            avatar: p?.avatar_url || metaAvatar || characterWarriorAvatarImg,
            googleAvatar: googlePhoto,
            characterClass: (p?.character_class as CharacterClass) || existing?.characterClass || 'Warrior',
            bio: typeof p?.bio === 'string' ? p.bio : existing?.bio || '',
            profileVisibility: (p?.profile_visibility as ProfileVisibility) || existing?.profileVisibility || 'public',
            showAchievements: typeof p?.show_achievements === 'boolean' ? p.show_achievements : existing?.showAchievements ?? true,
            showEquipment: typeof p?.show_equipment === 'boolean' ? p.show_equipment : existing?.showEquipment ?? true,
            showStats: typeof p?.show_stats === 'boolean' ? p.show_stats : existing?.showStats ?? true,
            showGuild: typeof p?.show_guild === 'boolean' ? p.show_guild : existing?.showGuild ?? true,
            ageYears: resolvedAgeYears,
            ageGroup: resolvedAgeGroup,
            biologicalSex: resolvedBiologicalSex,
            height: p?.height ?? existing?.height ?? undefined,
            weight: p?.weight ?? existing?.weight ?? undefined,
            preferredUnits: (p?.preferred_units as any) || existing?.preferredUnits || 'metric',
            activityLevel: (p?.activity_level as any) || existing?.activityLevel || 'moderate',
            preferredActivities: activitiesArr,
            experienceLevel: existing?.experienceLevel || 'intermediate',
            dietaryPreference: (p?.dietary_preference as any) || existing?.dietaryPreference || 'vegetarian',
            foodAllergiesList: allergiesArr,
            foodAllergies: allergiesArr.length > 0 ? allergiesArr.join(', ') : existing?.foodAllergies,
            foodIntolerances: intolerancesArr,
            dislikedFoods: typeof p?.disliked_foods === 'string' ? p.disliked_foods : existing?.dislikedFoods || '',
            selectedHabits: existing?.selectedHabits || ['h-1', 'h-2', 'h-3'],
            personalGoals: goalsArr,
            notificationPreferences: notifObj,
            timezone: p?.timezone || userTimezone,
            leaderboardVisible: p?.leaderboard_visible ?? true,
            createdAt: sbUser.created_at || new Date().toISOString(),
            isOnboarded: resolvedOnboarded,
            legendTitle: p?.equipped_legend_title ?? existing?.legendTitle ?? null,
            legendTitleStyle: (p?.equipped_legend_style as GlobalTitleStyle) ?? existing?.legendTitleStyle ?? null,
            legendEmblem: p?.equipped_legend_emblem ?? existing?.legendEmblem ?? null,
            legendAchievementId: p?.equipped_legend_achievement_id ?? existing?.legendAchievementId ?? null,
          };
        };

        const localUser = buildUserFromProfile(prof);
        activeSessionUserIdRef.current = sbUser.id;
        setUser(localUser);
        setIsAuthenticated(true);

        if (cloudRes.gameState) {
          if (cloudRes.gameState.stats) {
            setStats({
              ...INITIAL_PLAYER_STATS,
              ...cloudRes.gameState.stats,
              gold: typeof cloudRes.gameState.stats.gold === 'number' ? cloudRes.gameState.stats.gold : INITIAL_PLAYER_STATS.gold,
            });
          }
          if (cloudRes.gameState.habits) setHabits(cloudRes.gameState.habits);
          if (cloudRes.gameState.quests) setQuests(cloudRes.gameState.quests);
          if (cloudRes.gameState.weapons) setWeapons(cloudRes.gameState.weapons);
          if (cloudRes.gameState.buffs) setBuffs(cloudRes.gameState.buffs);
          if (cloudRes.gameState.kingdoms) setKingdoms(cloudRes.gameState.kingdoms);
          if (typeof cloudRes.gameState.waterGlasses === 'number')
            setWaterGlasses(cloudRes.gameState.waterGlasses);
          if (cloudRes.gameState.achievements)
            setAchievements(cloudRes.gameState.achievements);
          if (cloudRes.gameState.transactions)
            setTransactions(cloudRes.gameState.transactions);

          setCloudStatus('saved');
          setLastSavedAt(new Date(cloudRes.gameState.savedAt || Date.now()));
        } else {
          const localCheck = checkLocalDataForMigration();
          if (localCheck.hasLocalData) {
            setMigrationSummary(localCheck.summary);
            setShowMigrationModal(true);
          }
          setCloudStatus('saved');
          setLastSavedAt(new Date());
        }

        if (cloudRes.workoutSessions && cloudRes.workoutSessions.length > 0) {
          setFitnessSessions(cloudRes.workoutSessions);
        }
        if (cloudRes.meals && cloudRes.meals.length > 0) {
          setMeals(cloudRes.meals);
        }

        // Authoritative Unified Backend Bootstrap (normalizes & hydrates all gameplay state)
        const boot = await bootstrapUnifiedPlayerState();
        if (boot.ok && boot.data) {
          setUnifiedBackendReady(true);
          if (boot.data.profile) {
            applyServerProfileToStats(boot.data.profile);
            setUser(prev => buildUserFromProfile(boot.data.profile, prev));
            if (typeof boot.data.profile.sound_enabled === 'boolean') {
              setStats(prev => ({ ...prev, soundEnabled: boot.data.profile.sound_enabled }));
            }
            const srvGear = boot.data.profile.client_preferences?.equippedGear || cloudRes.clientPreferences?.equippedGear;
            const srvMainId = boot.data.profile.equipped_weapon_id;
            if (srvGear || srvMainId) {
              setEquippedGear(prev => ({
                mainWeaponId: srvMainId || srvGear?.mainWeaponId || prev.mainWeaponId,
                offHandId: srvGear?.offHandId !== undefined ? srvGear.offHandId : prev.offHandId,
                armourId: srvGear?.armourId !== undefined ? srvGear.armourId : prev.armourId,
                helmetId: srvGear?.helmetId !== undefined ? srvGear.helmetId : prev.helmetId,
                accessoryId: srvGear?.accessoryId !== undefined ? srvGear.accessoryId : prev.accessoryId,
              }));
            }

            // Hydrate Hero Identity, One-Time Permanent Lock, Tutorial, Reclaim Your Honor & Campaign Progress
            const srvPrefs = {
              ...(cloudRes.clientPreferences || {}),
              ...(boot.data.profile.client_preferences || {}),
            };
            const serverLockedFlag =
              typeof boot.data.profile.hero_locked === 'boolean'
                ? boot.data.profile.hero_locked
                : srvPrefs.heroLocked === true ||
                  (Boolean(boot.data.profile.is_onboarded ?? localUser.isOnboarded) &&
                    srvPrefs.heroSelectionPending !== true);

            const resolvedHeroRaw =
              boot.data.profile.selected_hero_id || srvPrefs.selectedHeroId;
            if (resolvedHeroRaw) {
              setSelectedHeroId(getHeroById(resolvedHeroRaw).id);
            } else if (boot.data.profile.character_class) {
              setSelectedHeroId(mapClassToDefaultHeroId(boot.data.profile.character_class));
            }
            setHeroLocked(Boolean(serverLockedFlag));
            setHeroSelectedAt(
              boot.data.profile.hero_selected_at || srvPrefs.heroSelectedAt || null
            );

            // If user completed onboarding but hasn't locked their one-time hero yet, require Hero Selection immediately
            const profileOnboarded = Boolean(
              boot.data.profile.is_onboarded ?? localUser.isOnboarded
            );
            if (profileOnboarded && !serverLockedFlag) {
              setShowHeroSelectModalState(true);
            } else {
              setShowHeroSelectModalState(false);
            }

            if (srvPrefs.reclaimHonor && typeof srvPrefs.reclaimHonor === 'object') {
              setReclaimHonorQuest({ ...DEFAULT_RECLAIM_HONOR, ...srvPrefs.reclaimHonor });
            }
            if (srvPrefs.campaignProgress && typeof srvPrefs.campaignProgress === 'object') {
              setCampaignProgress({ ...DEFAULT_CAMPAIGN_PROGRESS, ...srvPrefs.campaignProgress });
            }
            if (srvPrefs.attributeBonuses && typeof srvPrefs.attributeBonuses === 'object') {
              setAttributeBonuses({ ...DEFAULT_ATTRIBUTE_BONUSES, ...srvPrefs.attributeBonuses });
            }
            if (srvPrefs.tutorialState && typeof srvPrefs.tutorialState === 'object') {
              setTutorialState({
                isOpen: false,
                stepIndex: 0,
                completed: Boolean(srvPrefs.tutorialState.completed),
                skipped: Boolean(srvPrefs.tutorialState.skipped),
              });
            }

            if (Array.isArray(srvPrefs.dynamicDailyQuests)) {
              setDynamicDailyQuests(srvPrefs.dynamicDailyQuests);
            }
            if (Array.isArray(srvPrefs.dynamicQuestHistory)) {
              setDynamicQuestHistory(srvPrefs.dynamicQuestHistory);
            }
            if (srvPrefs.aiMentorMemory && typeof srvPrefs.aiMentorMemory === 'object') {
              setAiMentorMemory({ ...DEFAULT_MENTOR_MEMORY, ...srvPrefs.aiMentorMemory });
            }
            if (srvPrefs.dailyReport && typeof srvPrefs.dailyReport === 'object') {
              setDailyReport(srvPrefs.dailyReport);
            }
            if (srvPrefs.worldState && typeof srvPrefs.worldState === 'object') {
              const normFromPrefs = normalizeWorldState(srvPrefs.worldState);
              worldStateRef.current = normFromPrefs;
              setWorldState(normFromPrefs);
            }
          }

          // Hydrate Dynamic Quests, Daily Report, Hall of Legends & 3D World State from SQL tables if migrated
          const todayPeriod = getPeriodKeyForFrequency('daily', userTimezone);
          const [dynRes, repRes, hallRes, worldRes] = await Promise.all([
            fetchPlayerDynamicQuestsServer(sbUser.id, todayPeriod),
            fetchDailyReportServer(sbUser.id, todayPeriod),
            fetchHallOfLegendsServer(),
            getWorldStateServer(),
          ]);
          if (worldRes.ok && worldRes.data?.worldState) {
            const normSrvWorld = normalizeWorldState(worldRes.data.worldState);
            worldStateRef.current = normSrvWorld;
            setWorldState(normSrvWorld);
            try {
              localStorage.setItem(
                STORAGE_KEY_PREFIX + 'world_state_' + sbUser.id,
                JSON.stringify(normSrvWorld)
              );
            } catch {
              // ignore storage quota
            }
          } else {
            try {
              const cachedWorld = localStorage.getItem(STORAGE_KEY_PREFIX + 'world_state_' + sbUser.id);
              if (cachedWorld) {
                const parsedWorld = normalizeWorldState(JSON.parse(cachedWorld));
                worldStateRef.current = parsedWorld;
                setWorldState(parsedWorld);
              }
            } catch {
              // ignore
            }
          }
          if (dynRes.ok && Array.isArray(dynRes.data) && dynRes.data.length > 0) {
            setDynamicDailyQuests(dynRes.data);
          }
          if (repRes.ok && repRes.data) {
            setDailyReport(repRes.data);
          }
          if (hallRes.ok && hallRes.data) {
            setLegendClaims(hallRes.data.claims);
            setLegendAnnouncements(hallRes.data.announcements);
            if (hallRes.data.metrics) setServerLegendMetrics(hallRes.data.metrics);
            if (hallRes.data.equippedByUser) {
              setEquippedLegendMap(hallRes.data.equippedByUser);
              const mine = hallRes.data.equippedByUser[sbUser.id];
              if (mine) {
                setUser(prev =>
                  prev && !prev.legendTitle
                    ? {
                        ...prev,
                        legendTitle: mine.titleTag,
                        legendTitleStyle: mine.titleStyle,
                        legendEmblem: mine.emblemIcon,
                        legendAchievementId: mine.achievementId,
                      }
                    : prev
                );
              }
            }
          }
          if (Array.isArray(boot.data.habits) && boot.data.habits.length > 0) {
            setHabits(
              boot.data.habits.map((h: any) => {
                const freq = (h.frequency || 'daily') as any;
                const curPeriod = getPeriodKeyForFrequency(freq, userTimezone);
                const claimedNow = h.last_period_key === curPeriod;
                return {
                  id: h.id,
                  name: h.name,
                  category: h.category,
                  frequency: freq,
                  iconName: h.icon_name || 'Sparkles',
                  playerXpReward: h.player_xp_reward ?? 15,
                  forgeXpReward: h.forge_xp_reward ?? 20,
                  goldReward: h.gold_reward ?? 15,
                  completedToday: claimedNow,
                  streak: h.streak ?? 0,
                  history: h.last_period_key ? [h.last_period_key] : [],
                  lastPeriodKey: h.last_period_key || undefined,
                  lastCompletedDate: h.last_completed_at ? String(h.last_completed_at).split('T')[0] : undefined,
                };
              })
            );
          }
          if (Array.isArray(boot.data.weapons) && boot.data.weapons.length > 0) {
            const mappedWeapons = boot.data.weapons.map(mapServerWeapon);
            setWeapons(mappedWeapons);
            const srvEquipped = mappedWeapons.find((w: Weapon) => w.equipped);
            if (srvEquipped) {
              setEquippedGear(prev => ({ ...prev, mainWeaponId: srvEquipped.id }));
            }
          }
          if (Array.isArray(boot.data.buffs) && boot.data.buffs.length > 0) {
            setBuffs(
              boot.data.buffs.map((b: any) => {
                const base = INITIAL_BUFFS.find(ib => ib.id === b.buff_id);
                return {
                  id: b.buff_id,
                  name: b.name || base?.name || 'Combat Buff',
                  description: base?.description || 'Active combat blessing.',
                  rarity: base?.rarity || 'Rare',
                  effectType: (b.effect_type || base?.effectType || 'attack') as Buff['effectType'],
                  effectValue: typeof b.effect_value === 'number' ? b.effect_value : (base?.effectValue || 10),
                  unlockRequirement: base?.unlockRequirement || 'Complete realm activities.',
                  earnedSource: base?.earnedSource || 'Aetheria Blessing',
                  durationBattles: typeof b.duration_battles === 'number' ? b.duration_battles : (base?.durationBattles || 1),
                  usesRemaining: typeof b.uses_remaining === 'number' ? b.uses_remaining : 1,
                  active: Boolean(b.active),
                  iconName: base?.iconName || 'Sparkles',
                };
              })
            );
          }
          if (Array.isArray(boot.data.bossEncounters) && boot.data.bossEncounters.length > 0) {
            const encMap = new Map<string, any>();
            for (const enc of boot.data.bossEncounters) {
              encMap.set(enc.kingdom_id, enc);
            }
            setKingdoms(
              INITIAL_KINGDOMS.map(initK => {
                const enc = encMap.get(initK.id);
                if (!enc) return initK;
                return {
                  ...initK,
                  unlocked: Boolean(enc.unlocked),
                  cleared: Boolean(enc.cleared),
                  boss: {
                    ...initK.boss,
                    health: typeof enc.boss_hp === 'number' ? enc.boss_hp : initK.boss.health,
                    defeated: Boolean(enc.cleared),
                    weakness: {
                      ...initK.boss.weakness,
                      discovered: Boolean(enc.weakness_discovered) || initK.boss.weakness.discovered,
                    },
                  },
                };
              })
            );
          }
          if (Array.isArray(boot.data.questProgress)) {
            const qpList: any[] = boot.data.questProgress;
            setQuests(
              INITIAL_QUESTS.map(q => {
                const period =
                  q.type === 'special'
                    ? 'once'
                    : getPeriodKeyForFrequency(q.type === 'weekly' ? 'weekly' : 'daily', userTimezone);
                const matched = qpList.find(qp => qp.quest_id === q.id && qp.period_key === period);
                if (!matched) return { ...q, progress: 0, completed: false, claimed: false };
                return {
                  ...q,
                  progress: matched.progress ?? 0,
                  maxProgress: matched.max_progress ?? q.maxProgress,
                  completed: Boolean(matched.completed),
                  claimed: Boolean(matched.claimed),
                };
              })
            );
          }
          if (Array.isArray(boot.data.achievements)) {
            const paMap = new Map<string, any>();
            for (const pa of boot.data.achievements) paMap.set(pa.achievement_id, pa);
            setAchievements(
              INITIAL_ACHIEVEMENTS.map(a => {
                const pa = paMap.get(a.id);
                if (!pa) return a;
                return {
                  ...a,
                  progress: typeof pa.progress === 'number' ? pa.progress : a.progress,
                  maxProgress: typeof pa.max_progress === 'number' ? pa.max_progress : a.maxProgress,
                  unlocked: Boolean(pa.unlocked),
                  claimed: Boolean(pa.claimed),
                };
              })
            );
          }
          if (boot.data.hydration && typeof boot.data.hydration.glasses_count === 'number') {
            setWaterGlasses(boot.data.hydration.glasses_count);
          }
          if (Array.isArray(boot.data.transactions) && boot.data.transactions.length > 0) {
            setTransactions(
              boot.data.transactions.map((t: any) => ({
                id: t.id,
                type: t.currency,
                source: t.description,
                amount: t.delta,
                timestamp: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }))
            );
          }
          setCloudStatus('saved');
          setLastSavedAt(new Date());
          await refreshSocialAndShopData(sbUser.id);
        } else {
          setUnifiedBackendReady(false);
          const fallbackPrefs = cloudRes.clientPreferences || {};
          const fallbackLocked =
            fallbackPrefs.heroLocked === true ||
            (localUser.isOnboarded && fallbackPrefs.heroSelectionPending !== true);
          if (fallbackPrefs.selectedHeroId) {
            setSelectedHeroId(getHeroById(fallbackPrefs.selectedHeroId).id);
          } else if (localUser.characterClass) {
            setSelectedHeroId(mapClassToDefaultHeroId(localUser.characterClass));
          }
          setHeroLocked(Boolean(fallbackLocked));
          setHeroSelectedAt(fallbackPrefs.heroSelectedAt || null);
          if (localUser.isOnboarded && !fallbackLocked) {
            setShowHeroSelectModalState(true);
          }
        }
        // Hydrate Real-Life Skill Tree + Phases 2-6 Ecosystem Services for authenticated user
        const [skillRes, bossRes, rivalRes, mentorRes, eventRes, museumRes] = await Promise.all([
          fetchSkillTreeStateServer(sbUser.id, userTimezone),
          fetchWeeklyBossStateServer(sbUser.id, 1, 10, userTimezone),
          fetchRivalsStateServer(sbUser.id),
          fetchAiMentorStateServer(sbUser.id),
          fetchCommunityEventsStateServer(sbUser.id),
          fetchMuseumRecordsServer({ callerUserId: sbUser.id, page: 1, limit: 12 }),
        ]);
        if (skillRes.ok && skillRes.data?.state) {
          setSkillTreeState(skillRes.data.state);
        }
        if (bossRes.ok && bossRes.data) {
          setWeeklyBossState(bossRes.data);
        }
        if (rivalRes.ok && rivalRes.data) {
          setRivalsState(rivalRes.data);
        }
        if (mentorRes.ok && mentorRes.data) {
          setMentorMessages(mentorRes.data.messages || []);
          setMentorQuests(mentorRes.data.recommendedQuests || []);
          setMentorWeeklyAnalysis(mentorRes.data.latestWeeklyAnalysis || null);
        }
        if (eventRes.ok && eventRes.data) {
          setCommunityEventState(eventRes.data);
        }
        if (museumRes.ok && museumRes.data) {
          setMuseumData(museumRes.data);
        }
        void syncMuseumPrivacyServer(
          sbUser.id,
          localUser.profileVisibility === 'public' && localUser.privacySettings?.personalRecords === 'everyone'
        );
      } catch (err) {
        console.error('Failed to load user cloud data:', err);
        setCloudStatus('error');
      } finally {
        cloudHydratedRef.current = true;
        delete loadingUserPromisesRef.current[sbUser.id];
      }
    })();

    loadingUserPromisesRef.current[sbUser.id] = promise;
    return promise;
  };

  const hasOAuthUrlArtifacts = (): boolean => {
    const search = window.location.search;
    const hash = window.location.hash;
    const pathname = window.location.pathname.toLowerCase();
    return (
      pathname.includes('/auth/callback') ||
      search.includes('code=') ||
      search.includes('error=') ||
      search.includes('error_description=') ||
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('error=') ||
      hash.includes('error_description=')
    );
  };

  const clearOAuthUrlArtifacts = () => {
    if (hasOAuthUrlArtifacts()) {
      window.history.replaceState(null, '', '/');
    }
  };

  const verifyAuthSession = async () => {
    isVerifyingSessionRef.current = true;
    setIsAuthLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
      activeSessionUserIdRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      setShowAuthModalState(false);
      setCloudStatus('unconfigured');
      isVerifyingSessionRef.current = false;
      setIsAuthLoading(false);
      return;
    }

    try {
      // Inspect callback parameters locally without logging or storing tokens
      const searchParams = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);

      const urlError =
        searchParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');

      const authCode = searchParams.get('code');
      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      const isCallbackPath = window.location.pathname.toLowerCase().includes('/auth/callback');
      const isOAuthCallback = Boolean(urlError || authCode || hashAccessToken || isCallbackPath);

      if (urlError) {
        const safeErr = sanitizeAuthErrorMessage(urlError);
        clearOAuthUrlArtifacts();
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
        activeSessionUserIdRef.current = null;
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(safeErr);
        setAuthCallbackError(safeErr);
        setShowAuthModalState(false);
        return;
      }

      // Let Supabase finish URL detection & persist any session BEFORE clearing URL params
      let {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // PKCE authorization-code callback (?code=...)
      if (!session && authCode) {
        const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeErr) {
          sessionError = exchangeErr;
        } else if (exchangeData?.session) {
          session = exchangeData.session;
          sessionError = null;
        }
      }

      // Implicit-flow hash token callback (#access_token=...&refresh_token=...)
      if (!session && hashAccessToken) {
        if (hashRefreshToken) {
          const { data: setSessionData, error: setSessionErr } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (setSessionErr) {
            sessionError = setSessionErr;
          } else if (setSessionData?.session) {
            session = setSessionData.session;
            sessionError = null;
          }
        } else {
          sessionError = new Error(
            'Authentication callback was incomplete. Please try signing in with Google again.'
          ) as any;
        }
      }

      if (session?.user) {
        await loadUserCloudData(session.user);
        const routeTab = isOAuthCallback ? null : resolveTabFromPathname(window.location.pathname);
        if (routeTab === 'leaderboard' || routeTab === 'friends' || routeTab === 'chat' || routeTab === 'rivals') {
          setSocialSubTabState(routeTab);
          setActiveTabState('social');
        } else if (
          routeTab === 'quests' ||
          routeTab === 'daily-report' ||
          routeTab === 'achievements' ||
          routeTab === 'hall-of-legends' ||
          routeTab === 'skill-tree'
        ) {
          setProgressionSubTabState(routeTab);
          setActiveTabState('progression');
        } else {
          setActiveTabState(routeTab || 'dashboard');
        }
        // Clear callback query/hash ONLY after session persistence and profile load succeed
        clearOAuthUrlArtifacts();
        setAuthError(null);
        setAuthCallbackError(null);
        setShowAuthModalState(false);
      } else {
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
        activeSessionUserIdRef.current = null;
        setUser(null);
        setIsAuthenticated(false);
        setShowAuthModalState(false);

        if (isOAuthCallback || sessionError) {
          const safeErr = sanitizeAuthErrorMessage(
            sessionError?.message || 'Unable to verify your sign-in session. Please try again.'
          );
          clearOAuthUrlArtifacts();
          setAuthError(safeErr);
          setAuthCallbackError(safeErr);
        }
      }
    } catch (err: any) {
      const safeErr = sanitizeAuthErrorMessage(err?.message || 'Unable to verify authentication session.');
      console.error('Auth session verification failed:', safeErr);
      clearOAuthUrlArtifacts();
      setAuthError(safeErr);
      setAuthCallbackError(safeErr);
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
      activeSessionUserIdRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      setShowAuthModalState(false);
    } finally {
      isVerifyingSessionRef.current = false;
      setIsAuthLoading(false);
    }
  };

  const recheckAuthSession = async () => {
    await verifyAuthSession();
  };

  // Listen to Supabase Auth State changes & verify active session on startup
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    verifyAuthSession();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Avoid competing with verifyAuthSession while initial callback/session recovery runs
      if (isVerifyingSessionRef.current) {
        return;
      }

      if (event === 'SIGNED_OUT' || (event !== 'INITIAL_SESSION' && !session?.user)) {
        activeSessionUserIdRef.current = null;
        cloudHydratedRef.current = false;
        setUser(null);
        setIsAuthenticated(false);
        resetPrivateGameState();
        setActiveTabState('dashboard');
        setAuthMode('login');
        setShowAuthModalState(false);
        setCloudStatus(isSupabaseConfigured() ? 'saved' : 'unconfigured');
        setIsAuthLoading(false);
        if (window.location.pathname !== '/') {
          window.history.replaceState(null, '', '/');
        }
        return;
      }

      if (
        session?.user &&
        (event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED')
      ) {
        const needsHydration = activeSessionUserIdRef.current !== session.user.id;
        if (needsHydration) {
          await loadUserCloudData(session.user);
        }
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (needsHydration) {
            setActiveTabState('dashboard');
          }
          clearOAuthUrlArtifacts();
          setAuthError(null);
          setAuthCallbackError(null);
          setShowAuthModalState(false);
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Live Cross-Device & Multiplayer Sync via Supabase Realtime
  useEffect(() => {
    if (!isAuthenticated || !user || !unifiedBackendReady) return;
    const unsubscribe = subscribeUnifiedRealtime(user.id, {
      onChatInsert: () => {
        fetchChatMessagesServer(user.id).then(res => {
          if (res.ok && res.data) setChatMessages(res.data);
        });
      },
      onNotificationInsert: () => {
        fetchNotificationsServer(user.id).then(res => {
          if (res.ok && res.data) setNotifications(res.data);
        });
        listMyGuildInvitesServer().then(res => {
          if (res.ok && res.data) setGuildInvites(res.data);
        });
        fetchFriendshipsServer(user.id).then(res => {
          if (res.ok && res.data) setFriends(res.data);
        });
      },
      onFriendshipChange: () => {
        fetchFriendshipsServer(user.id).then(res => {
          if (res.ok && res.data) setFriends(res.data);
        });
        listBlockedUsersServer().then(res => {
          if (res.ok && res.data) setBlockedUsers(res.data);
        });
      },
      onGuildChange: () => {
        fetchGuildsServer(user.id).then(res => {
          if (res.ok && res.data) setGuilds(res.data);
        });
        listMyGuildInvitesServer().then(res => {
          if (res.ok && res.data) setGuildInvites(res.data);
        });
      },
      onProfileUpdate: newProf => {
        applyServerProfileToStats(newProf);
      },
    });
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.id, unifiedBackendReady]);

  // Debounced Saving of Safe Client Preferences Only (Authoritative progression lives in normalized tables)
  useEffect(() => {
    if (!isAuthenticated || !user || !cloudHydratedRef.current) return;

    if (!isSupabaseConfigured()) {
      setCloudStatus('unconfigured');
      return;
    }

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
    }

    cloudSaveTimerRef.current = setTimeout(async () => {
      if (!unifiedBackendReady) return;
      const res = await saveClientPreferencesServer({
        soundEnabled: stats.soundEnabled,
        activeTab,
        equippedGear,
        selectedHeroId,
        heroLocked,
        heroSelectedAt,
        heroSelectionPending: user?.isOnboarded ? !heroLocked : false,
        reclaimHonor: reclaimHonorQuest,
        campaignProgress,
        attributeBonuses,
        tutorialState: {
          completed: tutorialState.completed,
          skipped: tutorialState.skipped,
        },
        ageYears: user.ageYears ?? null,
        ageGroup: user.ageGroup ?? null,
        biologicalSex: user.biologicalSex ?? null,
        dynamicDailyQuests,
        dynamicQuestHistory: dynamicQuestHistory.slice(0, 60),
        aiMentorMemory,
        dailyReport,
        savedAt: new Date().toISOString(),
      });
      if (res.ok) {
        setCloudStatus('saved');
        setLastSavedAt(new Date());
      } else if (!res.schemaMissing) {
        console.warn('Preference sync notice:', res.error);
      }
    }, 900);

    return () => {
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, [
    stats.soundEnabled,
    activeTab,
    equippedGear,
    selectedHeroId,
    heroLocked,
    heroSelectedAt,
    reclaimHonorQuest,
    campaignProgress,
    attributeBonuses,
    tutorialState.completed,
    tutorialState.skipped,
    dynamicDailyQuests,
    dynamicQuestHistory,
    aiMentorMemory,
    dailyReport,
    user?.id,
    user?.isOnboarded,
    isAuthenticated,
    unifiedBackendReady,
  ]);

  // Keep per-device localStorage mirror for newly added hero/story states
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'selected_hero_id', selectedHeroId);
  }, [selectedHeroId, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'hero_locked', heroLocked ? 'true' : 'false');
    if (heroSelectedAt) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'hero_selected_at', heroSelectedAt);
    }
  }, [heroLocked, heroSelectedAt, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'reclaim_honor', JSON.stringify(reclaimHonorQuest));
  }, [reclaimHonorQuest, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'campaign_progress', JSON.stringify(campaignProgress));
  }, [campaignProgress, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'attribute_bonuses', JSON.stringify(attributeBonuses));
  }, [attributeBonuses, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'tutorial_state', JSON.stringify(tutorialState));
  }, [tutorialState, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'dynamic_quests', JSON.stringify(dynamicDailyQuests));
  }, [dynamicDailyQuests, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'dynamic_history', JSON.stringify(dynamicQuestHistory));
  }, [dynamicQuestHistory, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'mentor_memory', JSON.stringify(aiMentorMemory));
  }, [aiMentorMemory, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (dailyReport) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'daily_report', JSON.stringify(dailyReport));
    }
  }, [dailyReport, isAuthenticated, user]);

  // Sync state changes with LocalStorage ONLY for authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'user', JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    sound.setMuted(!stats.soundEnabled);
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'stats', JSON.stringify(stats));
  }, [stats, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'habits', JSON.stringify(habits));
  }, [habits, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'quests', JSON.stringify(quests));
  }, [quests, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'weapons', JSON.stringify(weapons));
  }, [weapons, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'buffs', JSON.stringify(buffs));
  }, [buffs, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'kingdoms', JSON.stringify(kingdoms));
  }, [kingdoms, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'fitness', JSON.stringify(fitnessSessions));
  }, [fitnessSessions, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'meals', JSON.stringify(meals));
  }, [meals, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'water', String(waterGlasses));
  }, [waterGlasses, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'achievements', JSON.stringify(achievements));
  }, [achievements, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'tx', JSON.stringify(transactions));
  }, [transactions, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'equipped_gear', JSON.stringify(equippedGear));
  }, [equippedGear, isAuthenticated, user]);

  // Derived Values
  const equippedWeapon = weapons.find(w => w.equipped) || weapons[0];
  const activeBuffs = buffs.filter(b => b.active);

  // Helper to apply authoritative server profile and trigger level/rank celebration if promoted
  const syncProfileWithCelebration = (prof: any) => {
    if (!prof) return;
    setStats(prev => {
      const nextLevel = typeof prof.level === 'number' ? prof.level : prev.level;
      const nextStage = (prof.aether_rank || prev.aetherRank) as AetherRankStage;
      if (nextLevel > prev.level || nextStage !== prev.aetherRank) {
        sound.playVictory();
        confetti({
          particleCount: 95,
          spread: 75,
          origin: { y: 0.55 },
          colors: ['#a855f7', '#ec4899', '#f59e0b', '#38bdf8'],
        });
      }
      return {
        ...prev,
        level: nextLevel,
        playerXP: typeof prof.player_xp === 'number' ? prof.player_xp : prev.playerXP,
        playerXPNextLevel: typeof prof.player_xp_next_level === 'number' ? prof.player_xp_next_level : prev.playerXPNextLevel,
        forgeXP: typeof prof.forge_xp === 'number' ? prof.forge_xp : prev.forgeXP,
        gold: typeof prof.gold_balance === 'number' ? prof.gold_balance : prev.gold,
        aetherRank: nextStage,
        aetherPoints: typeof prof.aether_points === 'number' ? prof.aether_points : prev.aetherPoints,
        aetherPointsNextRank: typeof prof.aether_points_next_rank === 'number' ? prof.aether_points_next_rank : prev.aetherPointsNextRank,
        currentStreak: typeof prof.current_streak === 'number' ? prof.current_streak : prev.currentStreak,
        totalWorkoutsCompleted: typeof prof.total_workouts_completed === 'number' ? prof.total_workouts_completed : prev.totalWorkoutsCompleted,
        totalVerifiedReps: typeof prof.total_verified_reps === 'number' ? prof.total_verified_reps : prev.totalVerifiedReps,
        totalBossesDefeated: typeof prof.total_bosses_defeated === 'number' ? prof.total_bosses_defeated : prev.totalBossesDefeated,
        equippedWeaponId: prof.equipped_weapon_id || prev.equippedWeaponId,
        currentKingdomId: prof.current_kingdom_id || prev.currentKingdomId,
      };
    });
  };

  // Server-authoritative Weapon Mastery Drill (15 Gold, 10m cooldown, +40 XP fixed on server)
  const trainWeaponMastery = async (
    weaponId: string,
    gainedXP: number = 40
  ): Promise<{ success: boolean; newLevel: number; abilityUnlocked?: string; error?: string }> => {
    const prevWeapon = weapons.find(w => w.id === weaponId);
    if (!prevWeapon) return { success: false, newLevel: 1, error: 'Weapon not found.' };
    if (!unifiedBackendReady) {
      return { success: false, newLevel: prevWeapon.masteryLevel, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await trainWeaponMasteryServer(weaponId, gainedXP);
    if (!res.ok || res.data?.success === false) {
      return {
        success: false,
        newLevel: prevWeapon.masteryLevel,
        error: res.data?.error || res.error || 'Could not train weapon mastery.',
      };
    }

    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);

    let abilityUnlocked: string | undefined;
    let finalLevel = prevWeapon.masteryLevel;

    if (res.data?.weapon) {
      const mapped = mapServerWeapon(res.data.weapon);
      finalLevel = mapped.masteryLevel;
      const newly = mapped.abilities.find(ab => {
        const old = prevWeapon.abilities.find(o => o.id === ab.id);
        return ab.unlocked && (!old || !old.unlocked);
      });
      if (newly) {
        abilityUnlocked = newly.name;
        sound.playQuestComplete();
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#a855f7', '#fbbf24'],
        });
      } else {
        sound.playForgeUpgrade();
      }
      setWeapons(prev => prev.map(w => (w.id === weaponId ? mapped : w)));
    }

    setTransactions(prev => [
      {
        id: 'tx-' + Date.now(),
        type: 'GOLD',
        source: `Mastery Drill: ${prevWeapon.name} (+40 Mastery XP)`,
        amount: -15,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return { success: true, newLevel: finalLevel, abilityUnlocked };
  };

  // Server-authoritative Weapon Evolution
  const evolveWeapon = async (
    weaponId: string
  ): Promise<{ success: boolean; newStage?: AetherRankStage; updatedWeapon?: Weapon; error?: string }> => {
    const target = weapons.find(w => w.id === weaponId);
    if (!target) return { success: false, error: 'Weapon not found.' };
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await evolveWeaponServer(weaponId);
    if (!res.ok || res.data?.success === false) {
      return {
        success: false,
        error: res.data?.error || res.error || 'Unable to complete weapon evolution right now.',
      };
    }

    const newStage = (res.data?.newStage || res.data?.weapon?.evolution_stage || target.evolutionStage) as AetherRankStage;
    let updatedWeapon: Weapon | undefined;
    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);
    if (res.data?.weapon) {
      updatedWeapon = mapServerWeapon(res.data.weapon);
      setWeapons(prev => prev.map(w => (w.id === weaponId ? updatedWeapon! : w)));
    }

    sound.playForgeUpgrade();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#a855f7', '#fbbf24', '#38bdf8', '#ec4899'],
    });

    const forgeCostMap: Record<AetherRankStage, number> = {
      Dormant: 0,
      Awakened: 50,
      Ascended: 100,
      Mythic: 200,
      Transcendent: 350,
    };
    setTransactions(prev => [
      {
        id: 'tx-' + Date.now(),
        type: 'FORGE_XP',
        source: `Weapon Evolution: ${target.name} -> ${newStage}`,
        amount: -(forgeCostMap[newStage] || 0),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return { success: true, newStage, updatedWeapon };
  };

  // Server-authoritative Unlock of Pinnacle Progression Relics (Ascendant -> Eternal)
  const unlockProgressionWeapon = async (
    weaponId: string
  ): Promise<{ success: boolean; weapon?: Weapon; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await unlockProgressionWeaponServer(weaponId);
    if (!res.ok || res.data?.success === false) {
      return {
        success: false,
        error: res.data?.error || res.error || 'Progression requirements have not been met yet.',
      };
    }

    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);

    let unlockedWeapon: Weapon | undefined;
    if (res.data?.weapon) {
      unlockedWeapon = mapServerWeapon(res.data.weapon);
      setWeapons(prev => {
        if (prev.some(w => w.id === unlockedWeapon!.id)) {
          return prev.map(w => (w.id === unlockedWeapon!.id ? unlockedWeapon! : w));
        }
        return [unlockedWeapon!, ...prev];
      });
    } else {
      await syncWeaponsFromServer(user.id);
    }

    const rarity = unlockedWeapon?.rarity || findBlueprintByWeaponId(weaponId)?.rarity || 'Ascendant';
    const rStyle = getRarityStyle(rarity);
    sound.playRarityAscension(rarity);
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.52 },
      colors: [rStyle.accentHex, rStyle.secondaryHex, '#fbbf24', '#ffffff'],
    });

    const bp = findBlueprintByWeaponId(weaponId);
    const forgeCost = bp?.unlockRequirement?.forgeXpCost || 0;
    setTransactions(prev => [
      {
        id: 'tx-relic-' + Date.now(),
        type: 'FORGE_XP',
        source: `Pinnacle Relic Unlocked: ${unlockedWeapon?.name || bp?.name || weaponId}`,
        amount: -forgeCost,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return { success: true, weapon: unlockedWeapon };
  };

  // Server-authoritative Weapon Rarity Ascension (Mythic -> Ascendant -> Divine -> Celestial -> Eternal)
  const ascendWeaponRarity = async (
    weaponId: string
  ): Promise<{
    success: boolean;
    previousWeaponId?: string;
    updatedWeapon?: Weapon;
    previousAttack?: number;
    previousDefense?: number;
    previousLevel?: number;
    error?: string;
  }> => {
    const target = weapons.find(w => w.id === weaponId);
    if (!target) return { success: false, error: 'Source weapon not found in armory.' };
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const previousAttack = target.baseAttack;
    const previousDefense = target.baseDefense;
    const previousLevel = target.level;

    const res = await ascendWeaponRarityServer(weaponId);
    if (!res.ok || res.data?.success === false) {
      return {
        success: false,
        error: res.data?.error || res.error || 'Unable to complete rarity ascension right now.',
      };
    }

    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);

    let updatedWeapon: Weapon | undefined;
    if (res.data?.weapon) {
      updatedWeapon = mapServerWeapon(res.data.weapon);
      setWeapons(prev => prev.map(w => (w.id === weaponId ? updatedWeapon! : w)));
      if (updatedWeapon.equipped || equippedGear.mainWeaponId === weaponId) {
        setStats(prev => ({ ...prev, equippedWeaponId: updatedWeapon!.id }));
        setEquippedGear(prev => ({
          ...prev,
          mainWeaponId: prev.mainWeaponId === weaponId ? updatedWeapon!.id : prev.mainWeaponId,
          offHandId: prev.offHandId === weaponId ? updatedWeapon!.id : prev.offHandId,
          armourId: prev.armourId === weaponId ? updatedWeapon!.id : prev.armourId,
          helmetId: prev.helmetId === weaponId ? updatedWeapon!.id : prev.helmetId,
          accessoryId: prev.accessoryId === weaponId ? updatedWeapon!.id : prev.accessoryId,
        }));
      }
    } else {
      await syncWeaponsFromServer(user.id);
    }

    const nextRarity = updatedWeapon?.rarity || 'Ascendant';
    const rStyle = getRarityStyle(nextRarity);
    sound.playRarityAscension(nextRarity);
    confetti({
      particleCount: 165,
      spread: 110,
      origin: { y: 0.5 },
      colors: [rStyle.accentHex, rStyle.secondaryHex, '#fbbf24', '#ffffff'],
    });

    const evoPath = target.evolutionPath;
    setTransactions(prev => [
      {
        id: 'tx-asc-' + Date.now(),
        type: 'FORGE_XP',
        source: `Rarity Ascension (${nextRarity}): ${target.name} -> ${updatedWeapon?.name || 'Ascended Form'}`,
        amount: -(evoPath?.forgeXpCost || 0),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return {
      success: true,
      previousWeaponId: weaponId,
      updatedWeapon,
      previousAttack,
      previousDefense,
      previousLevel,
    };
  };

  // Anti-Exploit Habit Period Helper (Daily, Weekly Mon-Sun, One-Time)
  const isHabitClaimedForCurrentPeriod = (habit: Habit): boolean => {
    const tz = user?.timezone || getUserTimezone();
    const currentPeriod = getPeriodKeyForFrequency(habit.frequency, tz);
    if (habit.lastPeriodKey && habit.lastPeriodKey === currentPeriod) return true;
    if (Array.isArray(habit.history) && habit.history.includes(currentPeriod)) return true;
    if (habit.frequency === 'once') {
      return Boolean(habit.completedToday || (habit.history && habit.history.length > 0));
    }
    if (habit.completedToday && habit.lastCompletedDate) {
      const parsed = new Date(habit.lastCompletedDate);
      if (!Number.isNaN(parsed.getTime())) {
        return getPeriodKeyForFrequency(habit.frequency, tz, parsed) === currentPeriod;
      }
    }
    return Boolean(habit.completedToday && !habit.lastPeriodKey);
  };

  // Habit System Handlers (Strictly Server-Authoritative & Period-Locked)
  const toggleHabitComplete = async (habitId: string): Promise<{ success: boolean; error?: string }> => {
    const targetHabit = habits.find(h => h.id === habitId);
    if (!targetHabit) {
      return { success: false, error: 'Habit not found.' };
    }

    if (isHabitClaimedForCurrentPeriod(targetHabit)) {
      sound.playClick();
      const lockedMsg =
        targetHabit.frequency === 'once'
          ? 'This one-time habit has already been claimed permanently.'
          : targetHabit.frequency === 'weekly'
          ? 'Reward already claimed for this week (Mon–Sun).'
          : 'Reward already claimed for today. Come back after reset!';
      return { success: false, error: lockedMsg };
    }

    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const tz = user.timezone || getUserTimezone();
    const currentPeriod = getPeriodKeyForFrequency(targetHabit.frequency, tz);
    const today = new Date().toISOString().split('T')[0];

    const res = await claimHabitRewardServer(habitId);
    if (!res.ok || res.data?.success === false) {
      if (res.data?.alreadyClaimed) {
        const serverPeriod = res.data.periodKey || currentPeriod;
        setHabits(prev =>
          prev.map(h =>
            h.id === habitId
              ? {
                  ...h,
                  completedToday: true,
                  lastPeriodKey: serverPeriod,
                  history: h.history.includes(serverPeriod) ? h.history : [serverPeriod, ...h.history],
                }
              : h
          )
        );
        return { success: false, error: res.data.error || 'Reward already claimed for this period.' };
      }
      return { success: false, error: res.data?.error || res.error || 'Unable to claim habit reward.' };
    }

    sound.playQuestComplete();
    syncProfileWithCelebration(res.data.profile);
    const newStreak = res.data.streak ?? targetHabit.streak + 1;
    const periodKey = res.data.periodKey || currentPeriod;

    setHabits(prev =>
      prev.map(h =>
        h.id === habitId
          ? {
              ...h,
              completedToday: true,
              streak: newStreak,
              lastPeriodKey: periodKey,
              lastCompletedDate: today,
              history: h.history.includes(periodKey) ? h.history : [periodKey, ...h.history],
            }
          : h
      )
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTransactions(prev => [
      {
        id: 'tx-xp-' + Date.now(),
        type: 'PLAYER_XP',
        source: `Habit: ${targetHabit.name}`,
        amount: res.data.xpAwarded ?? targetHabit.playerXpReward,
        timestamp: nowTime,
      },
      {
        id: 'tx-gold-' + Date.now(),
        type: 'GOLD',
        source: `Habit: ${targetHabit.name}`,
        amount: res.data.goldAwarded ?? (targetHabit.goldReward ?? 15),
        timestamp: nowTime,
      },
      ...prev.slice(0, 47),
    ]);

    void syncWeaponsFromServer(user.id);

    if (newStreak >= 3) {
      setAchievements(achList =>
        achList.map(a => (a.id === 'ach-2' ? { ...a, progress: Math.max(a.progress, newStreak), unlocked: true } : a))
      );
    }

    setQuests(qList =>
      qList.map(q => {
        if (q.category === 'habit' && !q.completed) {
          const nextProg = Math.min(q.progress + 1, q.maxProgress);
          return { ...q, progress: nextProg, completed: nextProg >= q.maxProgress };
        }
        return q;
      })
    );

    // Track genuine introductory habit completion for "Reclaim Your Honor"
    updateReclaimHonorObjective('complete_habit');
    advanceDynamicQuestsByEvidence(['habit_completions'], 1);

    // Server-authoritative Real-Life Skill Tree XP integration
    const habitSkillActivity: SkillActivityType =
      targetHabit.category === 'mindfulness'
        ? 'study_session'
        : targetHabit.category === 'sleep' || targetHabit.category === 'nutrition'
        ? 'recovery_habit'
        : targetHabit.category === 'fitness'
        ? 'strength_workout'
        : 'habit_completion';

    void awardVerifiedSkillActivityInternal({
      activityType: habitSkillActivity,
      idempotencyKey: `habit:${habitId}:${periodKey}`,
      sourceType: 'habit_completion',
      sourceId: habitId,
      metadata: {
        streak: newStreak,
        subAction: targetHabit.category === 'sleep' ? 'sleep' : 'habit',
      },
    });

    // Comeback Resilience XP when returning after broken streak or gentle comeback tier
    if (
      (targetHabit.streak === 0 && targetHabit.history.length > 0) ||
      aiMentorMemory.lastAdaptiveTier === 'gentle_comeback'
    ) {
      void awardVerifiedSkillActivityInternal({
        activityType: 'comeback_activity',
        idempotencyKey: `comeback:habit:${habitId}:${periodKey}`,
        sourceType: 'comeback_habit',
        sourceId: habitId,
        metadata: { subAction: 'habit' },
      });
    }

    return { success: true };
  };

  const createHabit = async (
    newHabit: Omit<Habit, 'id' | 'completedToday' | 'streak' | 'history'>
  ): Promise<{ success: boolean; error?: string }> => {
    sound.playClick();
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await createHabitServer({
      name: newHabit.name,
      category: newHabit.category,
      frequency: newHabit.frequency,
      iconName: newHabit.iconName,
      playerXpReward: newHabit.playerXpReward,
      forgeXpReward: newHabit.forgeXpReward,
      goldReward: newHabit.goldReward ?? 15,
    });

    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not create habit.' };
    }

    const row = res.data?.habit || res.data;
    if (!row?.id) {
      return { success: false, error: 'Unable to create habit right now. Please try again.' };
    }

    const created: Habit = {
      id: row.id,
      name: row.name,
      category: row.category,
      frequency: row.frequency,
      iconName: row.icon_name || newHabit.iconName,
      playerXpReward: row.player_xp_reward ?? newHabit.playerXpReward,
      forgeXpReward: row.forge_xp_reward ?? newHabit.forgeXpReward,
      goldReward: row.gold_reward ?? (newHabit.goldReward ?? 15),
      completedToday: false,
      streak: 0,
      history: [],
    };
    setHabits(prev => [created, ...prev]);
    return { success: true };
  };

  const deleteHabit = async (habitId: string) => {
    sound.playClick();
    if (!unifiedBackendReady) return;
    const res = await archiveHabitServer(habitId);
    if (res.ok && res.data?.success !== false) {
      setHabits(prev => prev.filter(h => h.id !== habitId));
    }
  };

  // Quest Claiming (Strictly Server-Authoritative)
  const claimQuest = async (questId: string): Promise<{ success: boolean; error?: string }> => {
    const q = quests.find(item => item.id === questId);
    if (!q || !q.completed || q.claimed) {
      return { success: false, error: 'Quest is not eligible to claim.' };
    }
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await claimQuestServer(questId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Unable to claim quest reward right now.' };
    }

    sound.playVictory();
    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#9333ea', '#c084fc', '#f59e0b'],
    });

    setQuests(prev => prev.map(item => (item.id === questId ? { ...item, claimed: true } : item)));
    setAchievements(achList => achList.map(a => (a.id === 'ach-1' ? { ...a, progress: 1, unlocked: true } : a)));
    setTransactions(prev => [
      {
        id: 'tx-q-' + Date.now(),
        type: 'PLAYER_XP',
        source: `Quest Claimed: ${q.title}`,
        amount: q.playerXpReward,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return { success: true };
  };

  // Armory & Shop Actions
  const getDefaultSlotForCategory = (category: WeaponCategory): EquipmentSlotType => {
    if (category === 'Shields') return 'offHand';
    if (category === 'Armour') return 'armour';
    if (category === 'Helmets') return 'helmet';
    if (category === 'Accessories') return 'accessory';
    return 'mainWeapon';
  };

  const equipWeapon = (weaponId: string) => {
    if (!unifiedBackendReady) return;
    sound.playClick();
    setWeapons(prev =>
      prev.map(w => ({
        ...w,
        equipped: w.id === weaponId,
      }))
    );
    setStats(prev => ({ ...prev, equippedWeaponId: weaponId }));
    setEquippedGear(prev => ({ ...prev, mainWeaponId: weaponId }));
    void equipWeaponServer(weaponId);
  };

  const equipGearSlot = (itemId: string, explicitSlot?: EquipmentSlotType) => {
    const item = weapons.find(w => w.id === itemId);
    if (!item) return;
    const slot = explicitSlot || getDefaultSlotForCategory(item.category);
    sound.playClick();
    if (slot === 'mainWeapon') {
      equipWeapon(itemId);
      return;
    }
    setEquippedGear(prev => {
      const next: EquippedGear = {
        ...prev,
        offHandId: slot === 'offHand' ? (prev.offHandId === itemId ? null : itemId) : prev.offHandId,
        armourId: slot === 'armour' ? (prev.armourId === itemId ? null : itemId) : prev.armourId,
        helmetId: slot === 'helmet' ? (prev.helmetId === itemId ? null : itemId) : prev.helmetId,
        accessoryId: slot === 'accessory' ? (prev.accessoryId === itemId ? null : itemId) : prev.accessoryId,
      };
      if (unifiedBackendReady) {
        void saveClientPreferencesServer({
          soundEnabled: stats.soundEnabled,
          activeTab,
          equippedGear: next,
          selectedHeroId,
          reclaimHonor: reclaimHonorQuest,
          campaignProgress,
          attributeBonuses,
          tutorialState: {
            completed: tutorialState.completed,
            skipped: tutorialState.skipped,
          },
          savedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  const upgradeWeapon = async (
    weaponId: string
  ): Promise<{
    success: boolean;
    updatedWeapon?: Weapon;
    previousLevel?: number;
    previousAttack?: number;
    previousDefense?: number;
    error?: string;
  }> => {
    const weapon = weapons.find(w => w.id === weaponId);
    if (!weapon) return { success: false, error: 'Weapon not found.' };
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const previousLevel = weapon.level;
    const previousAttack = weapon.baseAttack;
    const previousDefense = weapon.baseDefense;

    const res = await upgradeWeaponServer(weaponId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Weapon upgrade failed.' };
    }

    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);
    let updatedWeapon: Weapon | undefined;
    if (res.data?.weapon) {
      updatedWeapon = mapServerWeapon(res.data.weapon);
      setWeapons(prev => prev.map(w => (w.id === weaponId ? updatedWeapon! : w)));
    }

    sound.playForgeUpgrade();
    confetti({
      particleCount: 65,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#f59e0b', '#fbbf24', '#a855f7'],
    });

    setTransactions(prev => [
      {
        id: 'tx-' + Date.now(),
        type: 'FORGE_XP',
        source: `Blacksmith Upgrade: ${weapon.name} to Lv.${(updatedWeapon?.level ?? weapon.level + 1)}`,
        amount: -weapon.upgradeForgeCost,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    setAchievements(achList =>
      achList.map(a => (a.id === 'ach-3' ? { ...a, progress: 1, unlocked: true } : a))
    );
    setQuests(qList =>
      qList.map(q => (q.id === 'q-5' ? { ...q, progress: 1, completed: true } : q))
    );

    return {
      success: true,
      updatedWeapon,
      previousLevel,
      previousAttack,
      previousDefense,
    };
  };

  const purchaseShopItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Shop item not found.' };
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await purchaseShopItemServer(itemId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Purchase failed.' };
    }

    if (res.data?.profile) {
      syncProfileWithCelebration(res.data.profile);
    }

    const meta = item.metadata || {};
    if (
      (item.itemType === 'weapon' ||
        item.itemType === 'shield' ||
        item.itemType === 'armour' ||
        item.itemType === 'helmet' ||
        item.itemType === 'accessory') &&
      user
    ) {
      await syncWeaponsFromServer(user.id);
    } else if ((item.itemType === 'elixir' || item.itemType === 'buff') && meta.buffId) {
      setBuffs(prev =>
        prev.map(b =>
          b.id === meta.buffId
            ? { ...b, active: true, usesRemaining: Math.max(b.usesRemaining, 0) + Number(meta.uses || 2) }
            : b
        )
      );
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTransactions(prev => [
      {
        id: 'tx-shop-' + Date.now(),
        type: 'GOLD',
        source: `Shop Purchase: ${item.name}`,
        amount: -item.priceGold,
        timestamp: nowTime,
      },
      ...prev.slice(0, 49),
    ]);

    sound.playForgeUpgrade();
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#a855f7', '#38bdf8'],
    });

    return { success: true };
  };

  // Buff Actions
  const activateBuff = (buffId: string) => {
    if (!unifiedBackendReady) return;
    sound.playBuffActivation();
    toggleBuffServer(buffId).then(res => {
      if (res.ok && res.data?.success && res.data.buff) {
        const b = res.data.buff;
        setBuffs(prev =>
          prev.map(item =>
            item.id === buffId
              ? { ...item, active: Boolean(b.active), usesRemaining: b.uses_remaining ?? item.usesRemaining }
              : item
          )
        );
      }
    });
  };

  // Fitness Logging (Strictly Server-Authoritative & Idempotent)
  const logFitnessSession = async (
    session: Omit<FitnessSession, 'id' | 'timestamp' | 'playerXpEarned' | 'forgeXpEarned'> & {
      idempotencyKey?: string;
    }
  ) => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const { idempotencyKey, ...sessionPayload } = session;
    const res = await logWorkoutServer({
      exerciseType: sessionPayload.exerciseType,
      exerciseName: sessionPayload.exerciseName,
      durationMinutes: sessionPayload.durationMinutes,
      repetitions: sessionPayload.repetitions,
      distanceKm: sessionPayload.distanceKm,
      verifiedWithAetherVision: sessionPayload.verifiedWithAetherVision,
      notes: sessionPayload.notes,
      idempotencyKey,
    });

    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not log workout.' };
    }

    const deduplicated = Boolean(res.data?.deduplicated);
    const dailyCapReached = Boolean(res.data?.dailyCapReached);
    if (!deduplicated) {
      sound.playVictory();
    }
    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);

    const srv = res.data.session;
    const isVerified = sessionPayload.verifiedWithAetherVision;
    const playerXp = Number(srv?.xp_awarded ?? 0);
    const forgeXp = Number(srv?.forge_xp_awarded ?? 0);
    const gold = Number(srv?.gold_awarded ?? 0);
    const aetherPoints = Number(srv?.aether_points_awarded ?? 0);

    const savedSession: FitnessSession = {
      ...sessionPayload,
      id: srv?.id || 'fit-' + Date.now(),
      timestamp: srv?.created_at || new Date().toISOString(),
      playerXpEarned: playerXp,
      forgeXpEarned: forgeXp,
      goldEarned: gold,
      aetherPointsEarned: aetherPoints,
    };

    setFitnessSessions(prev => {
      if (prev.some(s => s.id === savedSession.id)) return prev;
      return [savedSession, ...prev];
    });
    void syncWeaponsFromServer(user.id);

    if (!deduplicated) {
      if (isVerified) {
        setBuffs(prev =>
          prev.map(b => (b.id === 'buff-1' ? { ...b, active: true, usesRemaining: 2 } : b))
        );
        setAchievements(achList =>
          achList.map(a => (a.id === 'ach-5' ? { ...a, progress: 1, unlocked: true } : a))
        );
      }

      if (!dailyCapReached && (playerXp > 0 || forgeXp > 0 || gold > 0)) {
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTransactions(prev => [
          ...(gold > 0
            ? [
                {
                  id: 'tx-w-gold-' + Date.now(),
                  type: 'GOLD' as const,
                  source: `Workout: ${sessionPayload.exerciseName}`,
                  amount: gold,
                  timestamp: nowTime,
                },
              ]
            : []),
          ...(forgeXp > 0
            ? [
                {
                  id: 'tx-w-fxp-' + Date.now(),
                  type: 'FORGE_XP' as const,
                  source: `Workout: ${sessionPayload.exerciseName}`,
                  amount: forgeXp,
                  timestamp: nowTime,
                },
              ]
            : []),
          ...(playerXp > 0
            ? [
                {
                  id: 'tx-w-pxp-' + Date.now(),
                  type: 'PLAYER_XP' as const,
                  source: `Workout: ${sessionPayload.exerciseName}`,
                  amount: playerXp,
                  timestamp: nowTime,
                },
              ]
            : []),
          ...prev.slice(0, 46),
        ]);
      }

      setQuests(qList =>
        qList.map(q => {
          if (q.id === 'q-2' && isVerified && sessionPayload.exerciseType === 'squat') {
            const nextProg = Math.min(q.progress + (sessionPayload.repetitions || 0), q.maxProgress);
            return { ...q, progress: nextProg, completed: nextProg >= q.maxProgress };
          }
          if (q.id === 'q-4') {
            const nextProg = Math.min(q.progress + sessionPayload.durationMinutes, q.maxProgress);
            return { ...q, progress: nextProg, completed: nextProg >= q.maxProgress };
          }
          return q;
        })
      );

      advanceDynamicQuestsByEvidence(['workout_sessions'], 1);
      if (sessionPayload.durationMinutes > 0) {
        advanceDynamicQuestsByEvidence(['workout_minutes'], sessionPayload.durationMinutes);
      }
      if (isVerified && sessionPayload.repetitions && sessionPayload.repetitions > 0) {
        advanceDynamicQuestsByEvidence(['vision_reps'], sessionPayload.repetitions);
      }

      // Server-authoritative Real-Life Skill Tree XP integration (Strength / Endurance / Vitality)
      const isCardio = ['running', 'walking', 'cycling', 'jumping_jack'].includes(
        sessionPayload.exerciseType
      );
      const isYogaRecovery = sessionPayload.exerciseType === 'yoga';
      const skillActivityType: SkillActivityType = isYogaRecovery
        ? 'recovery_habit'
        : isCardio
        ? 'cardio_workout'
        : 'strength_workout';

      void awardVerifiedSkillActivityInternal({
        activityType: skillActivityType,
        idempotencyKey: `workout:${savedSession.id}`,
        sourceType: 'workout_session',
        sourceId: savedSession.id,
        metadata: {
          durationMinutes: sessionPayload.durationMinutes,
          repetitions: sessionPayload.repetitions,
          distanceKm: sessionPayload.distanceKm,
          verifiedWithAetherVision: isVerified,
          subAction: isYogaRecovery ? 'yoga' : undefined,
        },
      });
    }

    return {
      success: true,
      deduplicated,
      dailyCapReached,
      rewards: {
        playerXp,
        forgeXp,
        gold,
        aetherPoints,
        buffActivated: isVerified,
      },
    };
  };

  // Nutrition & Hydration (Strictly Server-Authoritative & Idempotent)
  const logMeal = async (
    meal: Omit<Meal, 'id' | 'timestamp'> & { idempotencyKey?: string }
  ) => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const { idempotencyKey, ...mealPayload } = meal;
    const res = await logNutritionServer({
      mealType: mealPayload.mealType,
      title: mealPayload.title,
      foodItems: mealPayload.foodItems,
      dietaryCategory: mealPayload.dietaryCategory,
      balancedNotes: mealPayload.balancedNotes,
      idempotencyKey,
      nutritionEstimate: mealPayload.nutritionEstimate ?? null,
    });

    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not log nutrition entry.' };
    }

    const deduplicated = Boolean(res.data?.deduplicated);
    const dailyCapReached = Boolean(res.data?.dailyCapReached);
    if (!deduplicated) {
      sound.playQuestComplete();
    }
    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);

    const srv = res.data.meal;
    const playerXp = Number(srv?.xp_awarded ?? 0);
    const forgeXp = Number(srv?.forge_xp_awarded ?? 0);
    const gold = Number(srv?.gold_awarded ?? 0);
    const aetherPoints = Number(srv?.aether_points_awarded ?? 0);

    const savedMeal: Meal = {
      ...mealPayload,
      id: srv?.id || 'meal-' + Date.now(),
      timestamp: srv?.logged_at || new Date().toISOString(),
      nutritionEstimate:
        mealPayload.nutritionEstimate ||
        (srv?.meal_data?.nutritionEstimate as Meal['nutritionEstimate']) ||
        undefined,
    };

    setMeals(prev => {
      if (prev.some(m => m.id === savedMeal.id)) return prev;
      return [savedMeal, ...prev];
    });
    void syncWeaponsFromServer(user.id);

    if (!deduplicated) {
      if (!dailyCapReached && (playerXp > 0 || gold > 0)) {
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTransactions(prev => [
          ...(gold > 0
            ? [
                {
                  id: 'tx-m-gold-' + Date.now(),
                  type: 'GOLD' as const,
                  source: `Meal Logged: ${mealPayload.title}`,
                  amount: gold,
                  timestamp: nowTime,
                },
              ]
            : []),
          ...(playerXp > 0
            ? [
                {
                  id: 'tx-m-pxp-' + Date.now(),
                  type: 'PLAYER_XP' as const,
                  source: `Meal Logged: ${mealPayload.title}`,
                  amount: playerXp,
                  timestamp: nowTime,
                },
              ]
            : []),
          ...prev.slice(0, 47),
        ]);
      }

      setQuests(qList =>
        qList.map(q => {
          if (q.id === 'q-3') {
            const nextProg = Math.min(q.progress + 1, q.maxProgress);
            return { ...q, progress: nextProg, completed: nextProg >= q.maxProgress };
          }
          return q;
        })
      );

      advanceDynamicQuestsByEvidence(['meal_logs'], 1);

      void awardVerifiedSkillActivityInternal({
        activityType: 'recovery_habit',
        idempotencyKey: `meal:${savedMeal.id}`,
        sourceType: 'nutrition_log',
        sourceId: savedMeal.id,
        metadata: { subAction: 'meal' },
      });
    }

    return {
      success: true,
      deduplicated,
      dailyCapReached,
      rewards: {
        playerXp,
        forgeXp,
        gold,
        aetherPoints,
      },
    };
  };

  const addWaterGlass = () => {
    if (!unifiedBackendReady || !user) return;
    sound.playClick();
    logWaterGlassServer().then(res => {
      if (res.ok && res.data?.success) {
        if (typeof res.data.glassesCount === 'number') {
          setWaterGlasses(res.data.glassesCount);
        }
        if (res.data.goalNewlyClaimed) {
          sound.playVictory();
          setBuffs(buffList =>
            buffList.map(b => (b.id === 'buff-4' ? { ...b, active: true, usesRemaining: 2 } : b))
          );
          const todayKey = getPeriodKeyForFrequency('daily', user.timezone || getUserTimezone());
          void awardVerifiedSkillActivityInternal({
            activityType: 'recovery_habit',
            idempotencyKey: `water_goal:${todayKey}`,
            sourceType: 'hydration_goal',
            sourceId: todayKey,
            metadata: { subAction: 'hydration_goal' },
          });
        }
        if (res.data.profile) syncProfileWithCelebration(res.data.profile);
        void syncWeaponsFromServer(user.id);
        advanceDynamicQuestsByEvidence(['water_glasses'], 1);
      }
    });
  };

  const resetWaterGlasses = () => {
    if (!unifiedBackendReady) return;
    sound.playClick();
    resetWaterDailyServer().then(res => {
      if (res.ok && res.data?.success) {
        setWaterGlasses(0);
      }
    });
  };

  // Boss Weakness Discovery
  const discoverBossWeakness = (kingdomId: string) => {
    if (!unifiedBackendReady) return;
    sound.playQuestComplete();
    discoverBossWeaknessServer(kingdomId).then(res => {
      if (res.ok && res.data?.success) {
        setKingdoms(prev =>
          prev.map(k => {
            if (k.id === kingdomId && k.boss.weakness) {
              return {
                ...k,
                boss: {
                  ...k.boss,
                  weakness: {
                    ...k.boss.weakness,
                    discovered: true,
                  },
                },
              };
            }
            return k;
          })
        );
      }
    });
  };

  // Start Server-Authoritative Boss Encounter
  const startBossBattle = async (kingdomId: string) => {
    if (!unifiedBackendReady) {
      return {
        success: false,
        playerHp: 220 + stats.level * 15,
        playerStamina: 100,
        turnCount: 1,
        telegraphActive: false,
        error: 'Unable to connect to realm services right now. Please try again shortly.',
      };
    }

    const res = await startBossEncounterServer(kingdomId);
    if (!res.ok || res.data?.success === false) {
      return {
        success: false,
        playerHp: 220 + stats.level * 15,
        playerStamina: 100,
        turnCount: 1,
        telegraphActive: false,
        error: res.data?.error || res.error || 'Could not start boss encounter.',
      };
    }

    const enc = res.data.encounter;
    setKingdoms(kList =>
      kList.map(k =>
        k.id === kingdomId
          ? { ...k, boss: { ...k.boss, health: enc?.boss_hp ?? k.boss.maxHealth, defeated: false } }
          : k
      )
    );

    if (kingdomId === 'kingdom-forest') {
      setQuests(qList =>
        qList.map(q => (q.id === 'q-6' ? { ...q, progress: 1, completed: true } : q))
      );
    }

    return {
      success: true,
      playerHp: enc?.player_hp ?? (220 + stats.level * 15),
      playerStamina: enc?.player_stamina ?? 100,
      turnCount: enc?.turn_count ?? 1,
      telegraphActive: Boolean(enc?.telegraph_active),
    };
  };

  // Server-Authoritative Boss Combat Engine
  const attackBoss = async (
    kingdomId: string,
    attackType: 'standard' | 'power' | 'special' | 'attack' | 'ability' | 'defend' | 'dodge',
    abilityId?: string
  ) => {
    if (!unifiedBackendReady) {
      return {
        playerDamage: 0,
        bossDamage: 0,
        isCrit: false,
        isWeaknessHit: false,
        isDefended: false,
        isDodged: false,
        bossDefeated: false,
        playerDefeated: false,
        combatLog: 'Unable to connect to realm services right now. Please try again shortly.',
        error: 'Unable to connect to realm services right now. Please try again shortly.',
      };
    }

    const normalizedAction: 'attack' | 'ability' | 'defend' | 'dodge' =
      attackType === 'ability'
        ? 'ability'
        : attackType === 'defend'
        ? 'defend'
        : attackType === 'dodge'
        ? 'dodge'
        : 'attack';

    const res = await bossCombatTurnServer(kingdomId, normalizedAction, abilityId);
    if (!res.ok || res.data?.success === false) {
      const msg = res.data?.error || res.error || 'Combat turn failed.';
      return {
        playerDamage: 0,
        bossDamage: 0,
        isCrit: false,
        isWeaknessHit: false,
        isDefended: false,
        isDodged: false,
        bossDefeated: false,
        playerDefeated: false,
        combatLog: msg,
        error: msg,
      };
    }

    const turn = res.data;
    const enc = turn.encounter;

    if (turn.bossDefeated) {
      sound.playVictory();
      confetti({
        particleCount: 110,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b'],
      });

      const vic = await completeBossVictoryServer(kingdomId);
      if (vic.ok && vic.data?.success) {
        if (vic.data.profile) syncProfileWithCelebration(vic.data.profile);
        const kIndex = kingdoms.findIndex(k => k.id === kingdomId);
        setKingdoms(kList =>
          kList.map((k, idx) => {
            if (k.id === kingdomId) {
              return { ...k, cleared: true, boss: { ...k.boss, health: 0, defeated: true } };
            }
            if (vic.data.firstClear && idx === kIndex + 1) {
              return { ...k, unlocked: true };
            }
            return k;
          })
        );
        setAchievements(achList =>
          achList.map(a => {
            if (a.id === 'ach-4') return { ...a, progress: 1, unlocked: true };
            if (a.id === 'ach-6' && vic.data.firstClear) {
              const nextProg = Math.min(a.progress + 1, 5);
              return { ...a, progress: nextProg, unlocked: nextProg >= 5 };
            }
            return a;
          })
        );
      }
    } else {
      setKingdoms(kList =>
        kList.map(k =>
          k.id === kingdomId
            ? {
                ...k,
                boss: {
                  ...k.boss,
                  health: typeof enc?.boss_hp === 'number' ? enc.boss_hp : k.boss.health,
                  weakness: {
                    ...k.boss.weakness,
                    discovered: Boolean(enc?.weakness_discovered) || k.boss.weakness.discovered,
                  },
                },
              }
            : k
        )
      );
    }

    return {
      playerDamage: Number(turn.playerDamage || 0),
      bossDamage: Number(turn.bossDamage || 0),
      isCrit: Boolean(turn.isCrit),
      isWeaknessHit: Boolean(turn.isWeaknessHit),
      isDefended: Boolean(turn.isDefended),
      isDodged: Boolean(turn.isDodged),
      bossDefeated: Boolean(turn.bossDefeated),
      playerDefeated: Boolean(turn.playerDefeated),
      combatLog: String(turn.combatLog || ''),
      newPhase: typeof turn.newPhase === 'number' ? turn.newPhase : undefined,
      playerHp: typeof enc?.player_hp === 'number' ? enc.player_hp : undefined,
      playerStamina: typeof enc?.player_stamina === 'number' ? enc.player_stamina : undefined,
      turnCount: typeof enc?.turn_count === 'number' ? enc.turn_count : undefined,
      telegraphActive: Boolean(enc?.telegraph_active),
    };
  };

  const resetBossBattle = (kingdomId: string) => {
    if (!unifiedBackendReady) return;
    sound.playClick();
    resetBossEncounterServer(kingdomId).then(res => {
      if (res.ok && res.data?.success) {
        setKingdoms(kList =>
          kList.map(k =>
            k.id === kingdomId
              ? { ...k, boss: { ...k.boss, health: k.boss.maxHealth, defeated: false } }
              : k
          )
        );
      }
    });
  };

  // Achievement Claiming (Strictly Server-Authoritative)
  const claimAchievement = async (
    achievementId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const a = achievements.find(item => item.id === achievementId);
    if (!a || !a.unlocked || a.claimed) {
      return { success: false, error: 'Achievement is not eligible to claim.' };
    }
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }

    const res = await claimAchievementServer(achievementId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Unable to claim achievement reward right now.' };
    }

    sound.playVictory();
    if (res.data?.profile) syncProfileWithCelebration(res.data.profile);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    setAchievements(prev => prev.map(item => (item.id === achievementId ? { ...item, claimed: true } : item)));
    return { success: true };
  };

  const openPublicProfile = (userId: string) => {
    if (!userId) return;
    sound.playClick();
    setSelectedPublicProfileId(userId);
  };

  const closePublicProfile = () => {
    setSelectedPublicProfileId(null);
  };

  const getPublicPlayerProfile = async (
    userId: string
  ): Promise<{ success: boolean; data?: PublicPlayerProfile; error?: string }> => {
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await getPublicPlayerProfileServer(userId);
    if (!res.ok || !res.data) {
      return { success: false, error: res.error || 'Could not load player profile.' };
    }
    return { success: true, data: res.data };
  };

  const refreshSocialState = async () => {
    if (!user || !unifiedBackendReady) return;
    await refreshSocialAndShopData(user.id);
  };

  // Real Multi-Scope Leaderboard (Global / Weekly / Monthly / Friends / Guild)
  const fetchLeaderboard = async (
    scope: LeaderboardScope
  ): Promise<{ entries: LeaderboardEntry[]; isLiveBackend: boolean }> => {
    if (unifiedBackendReady) {
      const res = await fetchLeaderboardServer(scope, 50, 0);
      if (res.ok && res.data) {
        return { entries: res.data, isLiveBackend: true };
      }
    }

    const fallbackSelf: LeaderboardEntry = {
      rank: 1,
      userId: user?.id || 'self',
      name: user?.username || 'AetherKnight',
      avatar: getRpgAvatarForClass(user?.characterClass),
      characterClass: user?.characterClass || 'Warrior',
      level: stats.level,
      aetherRank: stats.aetherRank,
      streak: stats.currentStreak,
      score: stats.playerXP + (stats.level - 1) * 100 + stats.currentStreak * 25,
      isCurrent: true,
    };
    return { entries: [fallbackSelf], isLiveBackend: false };
  };

  // Social & Guild Chat
  const sendChatMessage = async (
    channel: 'guild' | 'general' | 'whisper',
    text: string,
    recipientId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!text.trim()) return { success: false, error: 'Message cannot be empty.' };
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    sound.playClick();

    const myGuild = guilds.find(g => g.isMember);
    const res = await sendChatMessageServer(
      channel,
      text.trim(),
      channel === 'guild' ? myGuild?.id ?? null : null,
      channel === 'whisper' ? recipientId ?? null : null
    );
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Failed to send message.' };
    }
    const refreshed = await fetchChatMessagesServer(user.id);
    if (refreshed.ok && refreshed.data) {
      setChatMessages(refreshed.data);
    }
    advanceDynamicQuestsByEvidence(['friend_interaction'], 1);
    return { success: true };
  };

  const reportChatMessage = async (messageId: string) => {
    if (unifiedBackendReady) {
      await reportChatMessageServer(messageId);
    }
  };

  const toggleGuildMembership = async (guildId: string): Promise<{ success: boolean; error?: string }> => {
    sound.playClick();
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const targetGuild = guilds.find(g => g.id === guildId);
    if (!targetGuild) return { success: false, error: 'Guild not found.' };

    const res = targetGuild.isMember
      ? await leaveGuildServer()
      : await joinGuildServer(guildId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not update guild membership.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const leaveGuild = async (): Promise<{ success: boolean; error?: string }> => {
    sound.playClick();
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await leaveGuildServer();
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not leave guild.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const createGuild = async (params: {
    name: string;
    tag: string;
    description: string;
    emblem?: string;
    isPublic?: boolean;
    minLevel?: number;
  }): Promise<{ success: boolean; error?: string }> => {
    sound.playClick();
    const cleanName = params.name.trim();
    const cleanTag = params.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanName.length < 3 || cleanTag.length < 2) {
      return { success: false, error: 'Guild name (min 3 chars) and tag (2–4 alphanumeric chars) are required.' };
    }
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await createGuildServer({
      name: cleanName,
      tag: cleanTag,
      description: params.description.trim(),
      emblem: params.emblem || 'Shield',
      isPublic: params.isPublic ?? true,
      minLevel: params.minLevel ?? 1,
    });
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Failed to create guild.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const getGuildDetails = async (
    guildId: string
  ): Promise<{ success: boolean; data?: GuildDetailsData; error?: string }> => {
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await getGuildDetailsServer(guildId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not load guild details.' };
    }
    return { success: true, data: res.data };
  };

  const requestJoinGuild = async (guildId: string, message = ''): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await requestJoinGuildServer(guildId, message);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not send join request.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const respondGuildRequest = async (requestId: string, accept: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await respondGuildRequestServer(requestId, accept);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not process join request.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const inviteToGuild = async (guildId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await inviteToGuildServer(guildId, targetUserId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not send guild invite.' };
    }
    return { success: true };
  };

  const respondGuildInvite = async (inviteId: string, accept: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await respondGuildInviteServer(inviteId, accept);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not respond to guild invite.' };
    }
    const [guildsRes, invitesRes, notifRes] = await Promise.all([
      fetchGuildsServer(user.id),
      listMyGuildInvitesServer(),
      fetchNotificationsServer(user.id),
    ]);
    if (guildsRes.ok && guildsRes.data) setGuilds(guildsRes.data);
    if (invitesRes.ok && invitesRes.data) setGuildInvites(invitesRes.data);
    if (notifRes.ok && notifRes.data) setNotifications(notifRes.data);
    return { success: true };
  };

  const disbandGuild = async (guildId: string): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await disbandGuildServer(guildId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not disband guild.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const updateGuildDetails = async (params: {
    guildId: string;
    description?: string | null;
    weeklyQuestName?: string | null;
    isPublic?: boolean | null;
    minLevel?: number | null;
    emblem?: string | null;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await updateGuildDetailsServer(params);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not update guild settings.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const manageGuildMember = async (
    guildId: string,
    targetUserId: string,
    action: 'promote' | 'demote' | 'kick' | 'transfer_leader'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await manageGuildMemberServer(guildId, targetUserId, action);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not update guild member.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const createGuildChallenge = async (params: {
    guildId: string;
    title: string;
    targetValue: number;
    rewardGold?: number;
    rewardPlayerXp?: number;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await createGuildChallengeServer(params);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not create guild challenge.' };
    }
    const refreshed = await fetchGuildsServer(user.id);
    if (refreshed.ok && refreshed.data) setGuilds(refreshed.data);
    return { success: true };
  };

  const searchChampions = async (query = '', limit = 40, offset = 0): Promise<ChampionSummary[]> => {
    if (!unifiedBackendReady) return [];
    const res = await searchChampionsServer(query, limit, offset);
    return res.ok && res.data ? res.data : [];
  };

  const sendFriendRequest = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await sendFriendRequestServer(targetUserId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not send friend request.' };
    }
    const refreshed = await fetchFriendshipsServer(user.id);
    if (refreshed.ok && refreshed.data) setFriends(refreshed.data);
    advanceDynamicQuestsByEvidence(['friend_interaction'], 1);
    return { success: true };
  };

  const cancelFriendRequest = async (friendshipId: string): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await cancelFriendRequestServer(friendshipId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not cancel friend request.' };
    }
    const refreshed = await fetchFriendshipsServer(user.id);
    if (refreshed.ok && refreshed.data) setFriends(refreshed.data);
    return { success: true };
  };

  const respondFriendRequest = async (friendshipId: string, accept: boolean) => {
    if (!unifiedBackendReady || !user) return;
    await respondFriendRequestServer(friendshipId, accept);
    const [friendsRes, notifRes] = await Promise.all([
      fetchFriendshipsServer(user.id),
      fetchNotificationsServer(user.id),
    ]);
    if (friendsRes.ok && friendsRes.data) setFriends(friendsRes.data);
    if (notifRes.ok && notifRes.data) setNotifications(notifRes.data);
  };

  const removeFriend = async (friendshipId: string) => {
    if (!unifiedBackendReady || !user) return;
    await removeFriendServer(friendshipId);
    const refreshed = await fetchFriendshipsServer(user.id);
    if (refreshed.ok && refreshed.data) setFriends(refreshed.data);
  };

  const blockUser = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await blockUserServer(targetUserId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not block user.' };
    }
    const [friendsRes, blocksRes] = await Promise.all([
      fetchFriendshipsServer(user.id),
      listBlockedUsersServer(),
    ]);
    if (friendsRes.ok && friendsRes.data) setFriends(friendsRes.data);
    if (blocksRes.ok && blocksRes.data) setBlockedUsers(blocksRes.data);
    return { success: true };
  };

  const unblockUser = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (!unifiedBackendReady || !user) {
      return { success: false, error: 'Unable to connect to realm services right now. Please try again shortly.' };
    }
    const res = await unblockUserServer(targetUserId);
    if (!res.ok || res.data?.success === false) {
      return { success: false, error: res.data?.error || res.error || 'Could not unblock user.' };
    }
    const blocksRes = await listBlockedUsersServer();
    if (blocksRes.ok && blocksRes.data) setBlockedUsers(blocksRes.data);
    return { success: true };
  };

  const markNotificationRead = async (notificationId?: string) => {
    const nowIso = new Date().toISOString();
    setNotifications(prev =>
      prev.map(n =>
        !notificationId || n.id === notificationId ? { ...n, readAt: n.readAt || nowIso } : n
      )
    );
    if (unifiedBackendReady) {
      await markNotificationsReadServer(notificationId ?? null);
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.readAt).length;

  // Sound Engine Toggle
  const toggleSound = () => {
    setStats(prev => {
      const nextSound = !prev.soundEnabled;
      sound.setMuted(!nextSound);
      if (nextSound) sound.playClick();
      return { ...prev, soundEnabled: nextSound };
    });
  };

  // Real Supabase Authentication Methods (No hardcoded/demo fallbacks)
  const loginWithSupabase = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'Account services are temporarily unavailable. Please try again later.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        sound.playVictory();
        setAuthError(null);
        setAuthCallbackError(null);
        await loadUserCloudData(data.user);
        setActiveTabState('dashboard');
        if (window.location.pathname !== '/') {
          window.history.replaceState(null, '', '/');
        }
        setShowAuthModalState(false);
        return { success: true };
      }
      return { success: false, error: 'User session could not be established.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const loginWithGoogleWithSupabase = async (): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'Account services are temporarily unavailable. Please try again later.',
      };
    }

    try {
      setAuthError(null);
      setAuthCallbackError(null);
      const redirectTo = getOAuthRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Google sign-in failed to initialize.' };
    }
  };

  const registerWithSupabase = async ({
    email,
    password,
    username,
  }: {
    email: string;
    password: string;
    username: string;
  }): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'Account services are temporarily unavailable. Please try again later.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getOAuthRedirectUrl(),
          data: {
            username,
            avatar_url: characterWarriorAvatarImg,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        sound.playVictory();

        if (data.session) {
          setAuthError(null);
          setAuthCallbackError(null);
          await updateCloudProfile(data.user.id, { username });
          await loadUserCloudData(data.user);
          setActiveTabState('dashboard');
          if (window.location.pathname !== '/') {
            window.history.replaceState(null, '', '/');
          }
          setShowAuthModalState(false);
          return { success: true };
        } else {
          return { success: true, requiresEmailConfirmation: true };
        }
      }
      return { success: false, error: 'Registration could not be completed.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration failed' };
    }
  };

  const resetPasswordWithSupabase = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Account services are temporarily unavailable. Please try again later.' };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getOAuthRedirectUrl(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    sound.playClick();
    activeSessionUserIdRef.current = null;
    cloudHydratedRef.current = false;
    setAuthError(null);
    setAuthCallbackError(null);
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    setUser(null);
    setIsAuthenticated(false);
    resetPrivateGameState();
    setActiveTabState('dashboard');
    setAuthMode('login');
    setShowAuthModalState(false);
    setCloudStatus(isSupabaseConfigured() ? 'saved' : 'unconfigured');
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  const performMigration = async (): Promise<boolean> => {
    if (!user) return false;
    setCloudStatus('saving');
    try {
      if (unifiedBackendReady) {
        await saveClientPreferencesServer({
          soundEnabled: stats.soundEnabled,
          migratedAt: new Date().toISOString(),
        });
      }

      if (fitnessSessions.length > 0 && unifiedBackendReady) {
        for (const session of fitnessSessions.slice(0, 5)) {
          await logWorkoutServer({
            exerciseType: session.exerciseType,
            exerciseName: session.exerciseName,
            durationMinutes: session.durationMinutes,
            repetitions: session.repetitions,
            distanceKm: session.distanceKm,
            verifiedWithAetherVision: session.verifiedWithAetherVision,
            notes: session.notes,
          });
        }
      }
      if (meals.length > 0 && unifiedBackendReady) {
        for (const meal of meals.slice(0, 5)) {
          await logNutritionServer({
            mealType: meal.mealType,
            title: meal.title,
            foodItems: meal.foodItems,
            dietaryCategory: meal.dietaryCategory,
            balancedNotes: meal.balancedNotes,
          });
        }
      }

      localStorage.setItem('lifequest_migrated_to_cloud', 'true');
      setShowMigrationModal(false);
      setCloudStatus('saved');
      setLastSavedAt(new Date());
      return true;
    } catch (e) {
      console.error('Migration error:', e);
      setCloudStatus('error');
      return false;
    }
  };

  const skipMigration = () => {
    localStorage.setItem('lifequest_migrated_to_cloud', 'true');
    setShowMigrationModal(false);
  };

  const triggerManualCloudSave = async (): Promise<boolean> => {
    if (!isAuthenticated || !user || !isSupabaseConfigured()) return false;
    setCloudStatus('saving');
    const fullPayload: CloudFullGameState = {
      stats,
      habits,
      quests,
      weapons,
      buffs,
      kingdoms,
      waterGlasses,
      achievements,
      guilds,
      chatMessages,
      transactions,
      version: 1,
      savedAt: new Date().toISOString(),
    };
    const res = await saveCloudGameState(user.id, fullPayload);
    if (res.success) {
      setCloudStatus('saved');
      setLastSavedAt(new Date());
      return true;
    } else {
      setCloudStatus('error');
      return false;
    }
  };

  const updateUser = async (updates: Partial<UserAccount>): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) return { success: false, error: 'Not authenticated.' };
    sound.playClick();
    const safeUpdates: Partial<UserAccount> = heroLocked
      ? { ...updates, characterClass: user.characterClass }
      : updates;
    const updated: UserAccount = { ...user, ...safeUpdates };
    setUser(updated);

    if (isSupabaseConfigured()) {
      const allergiesArr =
        updated.foodAllergiesList ??
        (updated.foodAllergies
          ? updated.foodAllergies.split(',').map(s => s.trim()).filter(Boolean)
          : []);
      const res = await updateCloudProfile(updated.id, {
        username: updated.username,
        character_name: updated.characterName ?? updated.username,
        avatar_url: updated.avatar,
        character_class: updated.characterClass,
        preferred_units: updated.preferredUnits,
        age_years: updated.ageYears ?? null,
        age_group: updated.ageGroup ?? null,
        biological_sex: updated.biologicalSex ?? null,
        height: updated.height ? updated.height : null,
        weight: updated.weight ? updated.weight : null,
        activity_level: updated.activityLevel,
        preferred_fitness_activities: updated.preferredActivities,
        fitness_goals: updated.personalGoals,
        dietary_preference: updated.dietaryPreference,
        food_allergies: allergiesArr,
        food_intolerances: updated.foodIntolerances || [],
        disliked_foods: updated.dislikedFoods || '',
        notification_preferences: updated.notificationPreferences as any,
        timezone: updated.timezone || getUserTimezone(),
        is_onboarded: updated.isOnboarded,
        leaderboard_visible: updated.leaderboardVisible ?? true,
        bio: updated.bio ?? '',
        profile_visibility: updated.profileVisibility ?? 'public',
        show_achievements: updated.showAchievements ?? true,
        show_equipment: updated.showEquipment ?? true,
        show_stats: updated.showStats ?? true,
        show_guild: updated.showGuild ?? true,
      });
      if (unifiedBackendReady && (updated.ageYears || updated.ageGroup || updated.biologicalSex)) {
        void saveClientPreferencesServer({
          soundEnabled: stats.soundEnabled,
          ageYears: updated.ageYears ?? null,
          ageGroup: updated.ageGroup ?? null,
          biologicalSex: updated.biologicalSex ?? null,
        });
      }
      if (!res.success) {
        return { success: false, error: res.error };
      }
    }
    return { success: true };
  };

  const finishOnboarding = async (
    accountData: Partial<UserAccount>,
    options?: { soundEnabled?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) return { success: false, error: 'Not authenticated.' };

    const soundChoice = typeof options?.soundEnabled === 'boolean' ? options.soundEnabled : stats.soundEnabled;
    if (typeof options?.soundEnabled === 'boolean') {
      sound.setMuted(!soundChoice);
      setStats(prev => ({ ...prev, soundEnabled: soundChoice }));
    }

    const updated: UserAccount = {
      ...user,
      ...accountData,
      characterName: accountData.characterName || accountData.username || user.characterName || user.username,
      timezone: accountData.timezone || user.timezone || getUserTimezone(),
      isOnboarded: true,
    };

    const allergiesArr =
      updated.foodAllergiesList ??
      (updated.foodAllergies
        ? updated.foodAllergies.split(',').map(s => s.trim()).filter(Boolean)
        : []);

    if (isSupabaseConfigured()) {
      const saveRes = await updateCloudProfile(updated.id, {
        username: updated.username,
        character_name: updated.characterName ?? updated.username,
        avatar_url: updated.avatar,
        character_class: updated.characterClass,
        preferred_units: updated.preferredUnits,
        age_years: updated.ageYears ?? null,
        age_group: updated.ageGroup ?? null,
        biological_sex: updated.biologicalSex ?? null,
        height: updated.height ? updated.height : null,
        weight: updated.weight ? updated.weight : null,
        activity_level: updated.activityLevel,
        preferred_fitness_activities: updated.preferredActivities || [],
        fitness_goals: updated.personalGoals || [],
        dietary_preference: updated.dietaryPreference,
        food_allergies: allergiesArr,
        food_intolerances: updated.foodIntolerances || [],
        disliked_foods: updated.dislikedFoods || '',
        notification_preferences: updated.notificationPreferences as any,
        timezone: updated.timezone,
        sound_enabled: soundChoice,
        is_onboarded: true,
        leaderboard_visible: updated.leaderboardVisible ?? true,
      });

      if (!saveRes.success) {
        return { success: false, error: saveRes.error || 'Could not save your character profile. Please try again.' };
      }

      if (updated.ageYears || updated.ageGroup || updated.biologicalSex) {
        void saveClientPreferencesServer({
          soundEnabled: soundChoice,
          ageYears: updated.ageYears ?? null,
          ageGroup: updated.ageGroup ?? null,
          biologicalSex: updated.biologicalSex ?? null,
        });
      }

      // Ensure starter progression, starter weapons & initial habits are bootstrapped idempotently
      const boot = await bootstrapUnifiedPlayerState();
      if (boot.ok && boot.data) {
        setUnifiedBackendReady(true);
        if (boot.data.profile) applyServerProfileToStats(boot.data.profile);
        if (Array.isArray(boot.data.weapons) && boot.data.weapons.length > 0) {
          setWeapons(boot.data.weapons.map(mapServerWeapon));
        }
      }
    }

    sound.playVictory();
    setUser(updated);
    const derivedHero = mapClassToDefaultHeroId(updated.characterClass);
    setSelectedHeroId(derivedHero);
    setHeroLocked(false);
    setHeroSelectedAt(null);
    if (isSupabaseConfigured()) {
      void saveClientPreferencesServer({
        soundEnabled: soundChoice,
        activeTab: 'dashboard',
        equippedGear,
        selectedHeroId: derivedHero,
        heroLocked: false,
        heroSelectionPending: true,
        ageYears: updated.ageYears ?? null,
        ageGroup: updated.ageGroup ?? null,
        biologicalSex: updated.biologicalSex ?? null,
        savedAt: new Date().toISOString(),
      });
    }
    setShowHeroSelectModalState(true);
    setActiveTabState('dashboard');
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#fbbf24', '#38bdf8'],
    });
    return { success: true };
  };

  // --- HERO SELECTION, SIX ATTRIBUTES, CAMPAIGN & TUTORIAL HANDLERS ---
  const heroDef = getHeroById(selectedHeroId);
  const equippedWeaponSafe = weapons.find(w => w.id === stats.equippedWeaponId || w.equipped) || weapons[0] || INITIAL_WEAPONS[0];

  const claimedPeriodHabitsCount = habits.filter(h => isHabitClaimedForCurrentPeriod(h)).length;
  const rpgAttributes: RpgAttributes = {
    strength:
      5 +
      stats.totalWorkoutsCompleted * 2 +
      Math.floor(stats.totalVerifiedReps / 12) +
      Math.floor(stats.level / 2) +
      (heroDef.id === 'fallen_knight' ? 2 : 0) +
      attributeBonuses.strength,
    discipline:
      5 +
      claimedPeriodHabitsCount * 2 +
      stats.currentStreak * 2 +
      quests.filter(q => q.claimed).length * 2 +
      (reclaimHonorQuest.claimed ? 2 : 0) +
      (heroDef.id === 'paladin' ? 1 : 0) +
      attributeBonuses.discipline,
    intelligence:
      5 +
      habits.filter(h => h.category === 'mindfulness' && isHabitClaimedForCurrentPeriod(h)).length * 2 +
      meals.filter(m => Boolean(m.nutritionEstimate?.isImageEstimate)).length * 2 +
      fitnessSessions.filter(f => f.verifiedWithAetherVision).length +
      kingdoms.reduce((sum, k) => sum + (k.boss.weakness.discovered ? 1 : 0), 0) +
      (heroDef.id === 'arcane_mage' ? 3 : 0) +
      attributeBonuses.intelligence,
    vitality:
      5 +
      meals.length * 2 +
      Math.floor(waterGlasses / 2) +
      habits.filter(h => (h.category === 'nutrition' || h.category === 'sleep') && isHabitClaimedForCurrentPeriod(h)).length * 2 +
      (heroDef.id === 'ranger' ? 1 : 0) +
      attributeBonuses.vitality,
    agility:
      5 +
      fitnessSessions.filter(s => ['running', 'walking', 'cycling', 'jumping_jack', 'lunge'].includes(s.exerciseType)).length * 2 +
      Math.max(0, Math.floor(((equippedWeaponSafe?.speed ?? 60) - 50) / 10)) +
      (heroDef.id === 'shadowblade' || heroDef.id === 'ranger' ? 2 : 0) +
      attributeBonuses.agility,
    resilience:
      5 +
      stats.currentStreak * 2 +
      stats.totalBossesDefeated * 3 +
      Math.floor((equippedWeaponSafe?.baseDefense ?? 0) / 8) +
      (heroDef.id === 'paladin' || heroDef.id === 'fallen_knight' ? 2 : 0) +
      attributeBonuses.resilience,
  };

  const selectPlayableHero = async (
    heroId: PlayableHeroId
  ): Promise<{ success: boolean; error?: string }> => {
    if (heroLocked) {
      return {
        success: false,
        error: 'Your hero is permanently locked to your account and cannot be changed.',
      };
    }

    const def = getHeroById(heroId);
    const lockedTimestamp = new Date().toISOString();

    if (isSupabaseConfigured() && unifiedBackendReady) {
      const lockRes = await lockHeroSelectionServer(def.id);
      if (!lockRes.ok || lockRes.data?.success === false) {
        if (lockRes.data?.alreadyLocked) {
          const serverHero = getHeroById(lockRes.data.selectedHeroId);
          setSelectedHeroId(serverHero.id);
          setHeroLocked(true);
          setHeroSelectedAt(lockRes.data.heroSelectedAt || lockedTimestamp);
          setShowHeroSelectModalState(false);
          if (user && lockRes.data.characterClass && user.characterClass !== lockRes.data.characterClass) {
            setUser(prev =>
              prev ? { ...prev, characterClass: lockRes.data.characterClass } : prev
            );
          }
          return {
            success: false,
            error: lockRes.data.error || 'Your hero has already been permanently chosen.',
          };
        }

        if (!lockRes.schemaMissing) {
          return {
            success: false,
            error:
              lockRes.data?.error ||
              lockRes.error ||
              'Could not lock your hero selection right now. Please try again.',
          };
        }

        // Unmigrated backend schema fallback: persist lock via client_preferences + profile update
        if (user && user.characterClass !== def.mappedClass) {
          await updateUser({
            characterClass: def.mappedClass,
            avatar: getHeroArtwork(def.id, def.mappedClass),
          });
        }
        await saveClientPreferencesServer({
          soundEnabled: stats.soundEnabled,
          activeTab,
          equippedGear,
          selectedHeroId: def.id,
          heroLocked: true,
          heroSelectedAt: lockedTimestamp,
          heroSelectionPending: false,
          reclaimHonor: reclaimHonorQuest,
          campaignProgress,
          attributeBonuses,
          tutorialState: {
            completed: tutorialState.completed,
            skipped: tutorialState.skipped,
          },
          savedAt: lockedTimestamp,
        });
      } else if (lockRes.data?.profile) {
        applyServerProfileToStats(lockRes.data.profile);
      }
    } else if (user && user.characterClass !== def.mappedClass) {
      await updateUser({
        characterClass: def.mappedClass,
        avatar: getHeroArtwork(def.id, def.mappedClass),
      });
    }

    sound.playVictory();
    setSelectedHeroId(def.id);
    setHeroLocked(true);
    setHeroSelectedAt(lockedTimestamp);
    setUser(prev =>
      prev
        ? {
            ...prev,
            characterClass: def.mappedClass,
            avatar:
              prev.avatar && prev.avatar.startsWith('http')
                ? prev.avatar
                : getHeroArtwork(def.id, def.mappedClass),
          }
        : prev
    );
    setShowHeroSelectModalState(false);

    // Start interactive tour for new players who haven't completed/skipped it yet
    if (!tutorialState.completed && !tutorialState.skipped) {
      setTutorialState(prev => ({ ...prev, isOpen: true, stepIndex: 0 }));
    }

    return { success: true };
  };

  const recordEquipmentInspected = () => {
    updateReclaimHonorObjective('inspect_equipment');
  };

  const claimReclaimHonorReward = async (): Promise<{ success: boolean; error?: string }> => {
    if (!reclaimHonorQuest.completed) {
      return { success: false, error: 'Complete all 7 Reclaim Your Honor objectives first.' };
    }
    if (reclaimHonorQuest.claimed) {
      return { success: false, error: 'Starter quest reward has already been claimed.' };
    }

    const rewardPx = 120;
    const rewardForge = 75;
    const rewardGold = 100;

    if (unifiedBackendReady) {
      const rpcRes = await claimStoryRewardServer({
        rewardKey: 'reclaim-honor-starter-v1',
        playerXp: rewardPx,
        forgeXp: rewardForge,
        gold: rewardGold,
        description: 'Quest Completed: Reclaim Your Honor',
      });
      if (rpcRes.ok && rpcRes.data?.profile) {
        syncProfileWithCelebration(rpcRes.data.profile);
      } else if (rpcRes.ok && rpcRes.data?.alreadyClaimed) {
        setReclaimHonorQuest(prev => ({ ...prev, claimed: true }));
        return { success: false, error: 'Already claimed on this account.' };
      } else {
        // Pre-migration fallback: update client stats directly and persist claimed state via client_preferences
        setStats(prev => {
          let nextXp = prev.playerXP + rewardPx;
          let nextLevel = prev.level;
          let nextReq = prev.playerXPNextLevel;
          while (nextXp >= nextReq) {
            nextXp -= nextReq;
            nextLevel += 1;
            nextReq = Math.floor(nextReq * 1.25);
          }
          return {
            ...prev,
            level: nextLevel,
            playerXP: nextXp,
            playerXPNextLevel: nextReq,
            forgeXP: prev.forgeXP + rewardForge,
            gold: prev.gold + rewardGold,
          };
        });
      }
    }

    sound.playVictory();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#C5A15A', '#7046A5', '#D9D2C5'] });

    setReclaimHonorQuest(prev => ({
      ...prev,
      claimed: true,
      claimedAt: new Date().toISOString(),
    }));
    setAttributeBonuses(prev => ({
      ...prev,
      discipline: prev.discipline + 2,
      resilience: prev.resilience + 1,
    }));
    setTransactions(prev => [
      {
        id: 'tx-honor-' + Date.now(),
        type: 'PLAYER_XP',
        source: 'Starter Trial: Reclaim Your Honor',
        amount: rewardPx,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);
    return { success: true };
  };

  const evaluateChapterRequirements = (chapterId: string): { met: boolean; missing: string[] } => {
    const ch = CAMPAIGN_CHAPTERS.find(c => c.id === chapterId);
    if (!ch) return { met: false, missing: ['Unknown chapter'] };
    const req = ch.requirements;
    const missing: string[] = [];

    if (req.minLevel && stats.level < req.minLevel) {
      missing.push(`Reach Level ${req.minLevel} (currently Lv.${stats.level})`);
    }
    if (req.minHabitsCompleted && claimedPeriodHabitsCount < req.minHabitsCompleted) {
      missing.push(`Complete ${req.minHabitsCompleted} habit(s) for current period (${claimedPeriodHabitsCount}/${req.minHabitsCompleted})`);
    }
    if (req.requireReclaimHonor && !reclaimHonorQuest.claimed) {
      missing.push('Claim the "Reclaim Your Honor" starter trial');
    }
    if (req.minWorkouts && stats.totalWorkoutsCompleted < req.minWorkouts) {
      missing.push(`Complete ${req.minWorkouts} workout session(s) (${stats.totalWorkoutsCompleted}/${req.minWorkouts})`);
    }
    if (req.minMealsLogged && meals.length < req.minMealsLogged) {
      missing.push(`Log ${req.minMealsLogged} balanced meal(s) (${meals.length}/${req.minMealsLogged})`);
    }
    if (req.minBossesDefeated && stats.totalBossesDefeated < req.minBossesDefeated) {
      missing.push(`Defeat ${req.minBossesDefeated} Kingdom Boss(es) (${stats.totalBossesDefeated}/${req.minBossesDefeated})`);
    }
    if (req.attributeKey && req.minAttributeValue) {
      const val = rpgAttributes[req.attributeKey];
      if (val < req.minAttributeValue) {
        missing.push(
          `Raise ${req.attributeKey.toUpperCase()} to ${req.minAttributeValue} (currently ${val})`
        );
      }
    }

    return { met: missing.length === 0, missing };
  };

  const claimCampaignChapterReward = async (
    chapterId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const ch = CAMPAIGN_CHAPTERS.find(c => c.id === chapterId);
    if (!ch) return { success: false, error: 'Chapter not found.' };
    if (campaignProgress.claimedChapterIds.includes(chapterId)) {
      return { success: false, error: 'Chapter milestone reward already claimed.' };
    }
    const status = evaluateChapterRequirements(chapterId);
    if (!status.met) {
      return { success: false, error: `Requirements remaining: ${status.missing.join(' · ')}` };
    }

    if (unifiedBackendReady) {
      const rpcRes = await claimStoryRewardServer({
        rewardKey: `campaign-${ch.id}`,
        playerXp: ch.rewards.playerXp,
        forgeXp: ch.rewards.forgeXp,
        gold: ch.rewards.gold,
        description: `Campaign Completed: ${ch.title}`,
      });
      if (rpcRes.ok && rpcRes.data?.profile) {
        syncProfileWithCelebration(rpcRes.data.profile);
      } else if (!rpcRes.ok || rpcRes.schemaMissing) {
        setStats(prev => {
          let nextXp = prev.playerXP + ch.rewards.playerXp;
          let nextLevel = prev.level;
          let nextReq = prev.playerXPNextLevel;
          while (nextXp >= nextReq) {
            nextXp -= nextReq;
            nextLevel += 1;
            nextReq = Math.floor(nextReq * 1.25);
          }
          return {
            ...prev,
            level: nextLevel,
            playerXP: nextXp,
            playerXPNextLevel: nextReq,
            forgeXP: prev.forgeXP + ch.rewards.forgeXp,
            gold: prev.gold + ch.rewards.gold,
          };
        });
      }
    }

    sound.playVictory();
    confetti({ particleCount: 80, spread: 75, origin: { y: 0.6 }, colors: ['#C5A15A', '#7046A5', '#D9D2C5'] });

    const nextIdx = CAMPAIGN_CHAPTERS.findIndex(c => c.id === ch.id) + 1;
    const nextChapterId = CAMPAIGN_CHAPTERS[nextIdx]?.id || ch.id;

    setCampaignProgress(prev => ({
      activeChapterId: nextChapterId,
      completedChapterIds: Array.from(new Set([...prev.completedChapterIds, ch.id])),
      claimedChapterIds: Array.from(new Set([...prev.claimedChapterIds, ch.id])),
    }));

    if (ch.rewards.attributeBoost) {
      setAttributeBonuses(prev => ({
        strength: prev.strength + (ch.rewards.attributeBoost?.strength || 0),
        discipline: prev.discipline + (ch.rewards.attributeBoost?.discipline || 0),
        intelligence: prev.intelligence + (ch.rewards.attributeBoost?.intelligence || 0),
        vitality: prev.vitality + (ch.rewards.attributeBoost?.vitality || 0),
        agility: prev.agility + (ch.rewards.attributeBoost?.agility || 0),
        resilience: prev.resilience + (ch.rewards.attributeBoost?.resilience || 0),
      }));
    }

    setTransactions(prev => [
      {
        id: 'tx-ch-' + Date.now(),
        type: 'PLAYER_XP',
        source: `Campaign: ${ch.title}`,
        amount: ch.rewards.playerXp,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return { success: true };
  };

  const startTutorial = (startStepIndex = 0) => {
    sound.playClick();
    setTutorialState(prev => ({
      ...prev,
      isOpen: true,
      stepIndex: Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, startStepIndex)),
    }));
  };

  const nextTutorialStep = () => {
    sound.playClick();
    setTutorialState(prev => ({
      ...prev,
      stepIndex: Math.min(TUTORIAL_STEPS.length - 1, prev.stepIndex + 1),
    }));
  };

  const prevTutorialStep = () => {
    sound.playClick();
    setTutorialState(prev => ({
      ...prev,
      stepIndex: Math.max(0, prev.stepIndex - 1),
    }));
  };

  const skipTutorial = () => {
    sound.playClick();
    setTutorialState(prev => ({
      ...prev,
      isOpen: false,
      skipped: true,
    }));
  };

  const completeTutorial = () => {
    sound.playVictory();
    setTutorialState({
      isOpen: false,
      stepIndex: 0,
      completed: true,
      skipped: false,
    });
    setActiveTabState('dashboard');
  };

  // ===========================================================================
  // FEATURE 10: AI-POWERED DYNAMIC QUEST GENERATOR ACTIONS
  // ===========================================================================
  const getTodayDailyPeriod = (): string => {
    const tz = user?.timezone || getUserTimezone();
    return getPeriodKeyForFrequency('daily', tz);
  };

  const getYesterdayDailyPeriod = (): string => {
    const tz = user?.timezone || getUserTimezone();
    const yDate = new Date(Date.now() - 86400000);
    return getPeriodKeyForFrequency('daily', tz, yDate);
  };

  const advanceDynamicQuestsByEvidence = (
    evidenceTypes: DynamicQuestEvidenceType[],
    amount: number,
    evidenceNote?: string
  ) => {
    if (!amount || amount <= 0) return;
    const todayKey = getTodayDailyPeriod();
    const updatesToSync: Array<{ id: string; progress: number; evidenceNote?: string }> = [];

    setDynamicDailyQuests(prev =>
      prev.map(q => {
        if (q.periodKey !== todayKey || q.claimed) return q;
        if (!evidenceTypes.includes(q.evidenceType)) return q;
        const nextProgress = Math.min(q.maxProgress, q.progress + amount);
        const nowDone = nextProgress >= q.maxProgress;
        if (nextProgress === q.progress && !evidenceNote) return q;
        updatesToSync.push({ id: q.id, progress: nextProgress, evidenceNote });
        return {
          ...q,
          progress: nextProgress,
          completed: q.completed || nowDone,
          evidenceNote: evidenceNote || q.evidenceNote,
          completedAt: q.completedAt || (nowDone ? new Date().toISOString() : undefined),
        };
      })
    );

    if (unifiedBackendReady && updatesToSync.length > 0) {
      void updateDynamicQuestProgressServer(todayKey, updatesToSync);
    }
  };

  const generateTodaysAiQuests = async (checkIn?: {
    availableMinutes?: number;
    energyLevel?: 'low' | 'medium' | 'high';
    focusNote?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Please sign in to generate your daily quests.' };
    }
    const todayKey = getTodayDailyPeriod();
    const existingToday = dynamicDailyQuests.filter(q => q.periodKey === todayKey);
    if (existingToday.length > 0) {
      return {
        success: false,
        error: 'Today’s AI quests have already been forged. Complete them before the daily reset!',
      };
    }

    setIsGeneratingDailyQuests(true);
    setQuestGenerationError(null);
    try {
      const yesterdayKey = getYesterdayDailyPeriod();
      const yDynamic = dynamicQuestHistory.filter(h => h.periodKey === yesterdayKey);
      const yWorkouts = fitnessSessions.filter(s => s.timestamp?.startsWith(yesterdayKey)).length;
      const yMeals = meals.filter(m => m.timestamp?.startsWith(yesterdayKey)).length;
      const yHabits = habits.filter(
        h => h.lastPeriodKey === yesterdayKey || (h.history || []).includes(yesterdayKey)
      ).length;
      const totalTodayItems = Math.max(1, habits.length + yDynamic.length);
      const yesterdayCompletionRate = Math.min(
        1,
        (yHabits + yDynamic.filter(q => q.claimed).length + yWorkouts) / totalTodayItems
      );

      const res = await generateDailyQuestsAiServer({
        periodKey: todayKey,
        checkIn,
        recentQuestTitles: aiMentorMemory.recentQuestTitles,
        player: {
          username: user.username,
          characterClass: user.characterClass,
          level: stats.level,
          currentStreak: stats.currentStreak,
          yesterdayCompletionRate,
          missedDaysEstimate: stats.currentStreak === 0 && yHabits === 0 && yWorkouts === 0 ? 2 : 0,
          personalGoals: user.personalGoals || [],
          preferredActivities: user.preferredActivities || [],
          habits: habits.map(h => ({ name: h.name, category: h.category, streak: h.streak })),
          incompleteClassicQuests: quests.filter(q => !q.completed).map(q => q.title),
          recentAchievements: achievements.filter(a => a.unlocked).slice(0, 6).map(a => a.name),
          yesterdaySummary: {
            workouts: yWorkouts,
            meals: yMeals,
            habitsCompleted: yHabits,
            dynamicQuestsClaimed: yDynamic.filter(q => q.claimed).length,
          },
          struggleCategories: aiMentorMemory.struggleCategories,
          preferredCategories: aiMentorMemory.preferredCategories,
        },
      });

      if (!res.ok || !res.data || res.data.quests.length === 0) {
        const msg = res.error || 'Could not generate today’s quests. Please retry.';
        setQuestGenerationError(msg);
        return { success: false, error: msg };
      }

      let finalQuests = res.data.quests;
      if (unifiedBackendReady) {
        const saveRes = await saveGeneratedDailyQuestsServer(todayKey, finalQuests);
        if (saveRes.ok && saveRes.data?.quests?.length) {
          finalQuests = saveRes.data.quests;
        }
      }

      setDynamicDailyQuests(prev => [...finalQuests, ...prev.filter(q => q.periodKey !== todayKey)]);
      setMentorGreeting(res.data.mentorGreeting || null);
      setAiMentorMemory(prev => ({
        ...prev,
        lastAdaptiveTier: res.data!.adaptiveTier,
        lastGeneratedDate: todayKey,
        recentQuestTitles: Array.from(
          new Set([...finalQuests.map(q => q.title), ...prev.recentQuestTitles])
        ).slice(0, 30),
      }));
      sound.playQuestComplete();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error generating quests.';
      setQuestGenerationError(msg);
      return { success: false, error: msg };
    } finally {
      setIsGeneratingDailyQuests(false);
    }
  };

  const submitDynamicQuestEvidence = async (
    questId: string,
    evidenceNote: string
  ): Promise<{ success: boolean; error?: string }> => {
    const note = evidenceNote.trim();
    if (note.length < 12) {
      return {
        success: false,
        error: 'Share a brief genuine reflection (at least 12 characters) describing what you completed.',
      };
    }

    const q = dynamicDailyQuests.find(item => item.id === questId);
    if (!q) return { success: false, error: 'Quest not found.' };
    if (q.claimed) return { success: false, error: 'This quest has already been claimed.' };

    const nowIso = new Date().toISOString();
    setDynamicDailyQuests(prev =>
      prev.map(item =>
        item.id === questId
          ? {
              ...item,
              progress: item.maxProgress,
              completed: true,
              evidenceNote: note,
              completedAt: item.completedAt || nowIso,
            }
          : item
      )
    );

    if (unifiedBackendReady) {
      await updateDynamicQuestProgressServer(q.periodKey, [
        { id: questId, progress: q.maxProgress, evidenceNote: note },
      ]);
    }
    if (q.evidenceType === 'study_or_skill_reflection' || q.category === 'intellectual') {
      void awardVerifiedSkillActivityInternal({
        activityType: 'study_session',
        idempotencyKey: `quest:${q.periodKey}:${q.id}`,
        sourceType: 'intellectual_quest',
        sourceId: q.id,
        metadata: {
          durationMinutes: q.estimatedMinutes,
          subAction: 'reflection',
        },
      });
    } else if (q.adaptiveTier === 'gentle_comeback') {
      void awardVerifiedSkillActivityInternal({
        activityType: 'comeback_activity',
        idempotencyKey: `comeback:quest:${q.periodKey}:${q.id}`,
        sourceType: 'comeback_quest',
        sourceId: q.id,
        metadata: { subAction: 'quest' },
      });
    }
    sound.playQuestComplete();
    return { success: true };
  };

  const claimDynamicQuest = async (questId: string): Promise<{ success: boolean; error?: string }> => {
    const q = dynamicDailyQuests.find(item => item.id === questId);
    if (!q) return { success: false, error: 'Quest not found.' };
    if (q.claimed) return { success: false, error: 'Reward already claimed for this quest.' };
    if (!q.completed || q.progress < q.maxProgress) {
      return { success: false, error: 'Complete the quest objective before claiming its reward.' };
    }

    let creditedViaRpc = false;
    if (unifiedBackendReady) {
      const rpcRes = await claimDynamicQuestServer(questId, q.periodKey);
      if (rpcRes.ok && rpcRes.data?.profile) {
        syncProfileWithCelebration(rpcRes.data.profile);
        creditedViaRpc = true;
      } else if (rpcRes.ok && rpcRes.data?.success === false) {
        return { success: false, error: rpcRes.data.error || 'Could not claim quest.' };
      } else if (!rpcRes.schemaMissing && !rpcRes.ok) {
        return { success: false, error: rpcRes.error || 'Could not claim quest.' };
      }
    }

    if (!creditedViaRpc) {
      setStats(prev => {
        let nextXp = prev.playerXP + q.playerXpReward;
        let nextLevel = prev.level;
        let nextReq = prev.playerXPNextLevel;
        while (nextXp >= nextReq) {
          nextXp -= nextReq;
          nextLevel += 1;
          nextReq = Math.floor(nextReq * 1.25);
        }
        return {
          ...prev,
          level: nextLevel,
          playerXP: nextXp,
          playerXPNextLevel: nextReq,
          forgeXP: prev.forgeXP + q.forgeXpReward,
          gold: prev.gold + q.goldReward,
        };
      });
    }

    const claimedAt = new Date().toISOString();
    sound.playVictory();
    confetti({
      particleCount: q.isSpecialChallenge ? 95 : 55,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#C5A15A', '#7046A5', '#34D399'],
    });

    setDynamicDailyQuests(prev =>
      prev.map(item => (item.id === questId ? { ...item, claimed: true, claimedAt } : item))
    );

    setDynamicQuestHistory(prev => {
      if (prev.some(h => h.id === questId)) return prev;
      return [
        {
          id: q.id,
          periodKey: q.periodKey,
          title: q.title,
          category: q.category,
          difficulty: q.difficulty,
          completed: true,
          claimed: true,
          playerXpReward: q.playerXpReward,
          forgeXpReward: q.forgeXpReward,
          goldReward: q.goldReward,
          evidenceNote: q.evidenceNote,
          recordedAt: claimedAt,
        },
        ...prev.slice(0, 99),
      ];
    });

    setAiMentorMemory(prev => ({
      ...prev,
      preferredCategories: Array.from(new Set([q.category, ...prev.preferredCategories])).slice(0, 5),
    }));

    setTransactions(prev => [
      {
        id: 'tx-dq-' + Date.now(),
        type: 'PLAYER_XP',
        source: `AI Quest: ${q.title}`,
        amount: q.playerXpReward,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 49),
    ]);

    return { success: true };
  };

  // ===========================================================================
  // FEATURE 11: DAILY QUEST REPORT
  // ===========================================================================
  const generateTodaysDailyReport = async (
    forceRefresh = false
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Please sign in to view your Daily Quest Report.' };
    }

    const todayKey = getTodayDailyPeriod();
    if (!forceRefresh && dailyReport && dailyReport.reportDate === todayKey) {
      return { success: true };
    }

    setIsGeneratingDailyReport(true);
    setDailyReportError(null);
    try {
      const yesterdayKey = getYesterdayDailyPeriod();
      const yDyn = dynamicDailyQuests.filter(q => q.periodKey === yesterdayKey);
      const yHist = dynamicQuestHistory.filter(h => h.periodKey === yesterdayKey);
      const questsTotal = Math.max(yDyn.length, yHist.length);
      const questsCompleted = Math.max(
        yDyn.filter(q => q.claimed).length,
        yHist.filter(h => h.claimed).length
      );
      const habitsCompleted = habits.filter(
        h => h.lastPeriodKey === yesterdayKey || (h.history || []).includes(yesterdayKey)
      ).length;
      const yesterdayWorkouts = fitnessSessions.filter(s => s.timestamp?.startsWith(yesterdayKey));
      const yesterdayMeals = meals.filter(m => m.timestamp?.startsWith(yesterdayKey));

      const yPlayerXp =
        yesterdayWorkouts.reduce((acc, w) => acc + (w.playerXpEarned || 0), 0) +
        yHist.reduce((acc, q) => acc + (q.claimed ? q.playerXpReward : 0), 0);
      const yForgeXp =
        yesterdayWorkouts.reduce((acc, w) => acc + (w.forgeXpEarned || 0), 0) +
        yHist.reduce((acc, q) => acc + (q.claimed ? q.forgeXpReward : 0), 0);
      const yGold =
        yesterdayWorkouts.reduce((acc, w) => acc + (w.goldEarned || 0), 0) +
        yHist.reduce((acc, q) => acc + (q.claimed ? q.goldReward : 0), 0);

      const totalOpportunities = Math.max(1, habits.length + questsTotal);
      const consistencyScore = Math.min(
        100,
        Math.round(
          ((habitsCompleted + questsCompleted + (yesterdayWorkouts.length > 0 ? 1 : 0)) /
            (totalOpportunities + 1)) *
            100
        )
      );

      const res = await generateDailyQuestReportAiServer({
        reportDate: todayKey,
        yesterdayDate: yesterdayKey,
        metrics: {
          username: user.username,
          characterClass: user.characterClass,
          level: stats.level,
          currentStreak: stats.currentStreak,
          aetherRank: stats.aetherRank,
          yesterdayQuestsCompleted: questsCompleted,
          yesterdayQuestsTotal: questsTotal,
          yesterdayHabitsCompleted: habitsCompleted,
          totalActiveHabits: habits.length,
          yesterdayWorkouts: yesterdayWorkouts.length,
          yesterdayMeals: yesterdayMeals.length,
          yesterdayPlayerXp: yPlayerXp,
          yesterdayForgeXp: yForgeXp,
          yesterdayGold: yGold,
          yesterdayAchievements: 0,
          consistencyScore,
          todayDynamicQuestsCount: dynamicDailyQuests.filter(q => q.periodKey === todayKey).length,
          personalGoals: user.personalGoals || [],
        },
      });

      if (!res.ok || !res.data) {
        const msg = res.error || 'Unable to compile your Daily Quest Report.';
        setDailyReportError(msg);
        return { success: false, error: msg };
      }

      setDailyReport(res.data);
      setAiMentorMemory(prev => ({
        ...prev,
        reportsGeneratedCount: (prev.reportsGeneratedCount || 0) + 1,
      }));

      if (unifiedBackendReady) {
        void saveDailyReportServer(todayKey, res.data);
      }
      sound.playQuestComplete();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error generating Daily Quest Report.';
      setDailyReportError(msg);
      return { success: false, error: msg };
    } finally {
      setIsGeneratingDailyReport(false);
    }
  };

  // ===========================================================================
  // FEATURE 12: GLOBAL EXCLUSIVE ACHIEVEMENTS & HALL OF LEGENDS
  // ===========================================================================
  const computeLocalMetricSnapshot = (): GlobalMetricSnapshot => {
    const claimedClassicQuests = quests.filter(q => q.claimed).length;
    const claimedDynAll = dynamicQuestHistory.filter(h => h.claimed);
    const totalXpApprox =
      stats.playerXP + Math.max(0, stats.level - 1) * 120;
    const myChatCount = chatMessages.filter(
      m => m.isCurrentUser || (user && m.senderId === user.id)
    ).length;
    const acceptedFriends = friends.filter(f => f.status === 'accepted').length;
    const inGuild = guilds.some(g => g.isMember) ? 1 : 0;
    const isGuildLeader = guilds.some(g => g.isMember && g.myRole === 'leader') ? 1 : 0;

    return {
      level: stats.level,
      totalXp: Math.max(serverLegendMetrics?.total_xp ?? 0, totalXpApprox),
      currentStreak: Math.max(serverLegendMetrics?.current_streak ?? 0, stats.currentStreak),
      totalWorkouts: Math.max(serverLegendMetrics?.total_workouts ?? 0, stats.totalWorkoutsCompleted, fitnessSessions.length),
      totalVerifiedReps: Math.max(serverLegendMetrics?.total_verified_reps ?? 0, stats.totalVerifiedReps),
      totalBossesDefeated: Math.max(serverLegendMetrics?.total_bosses_defeated ?? 0, stats.totalBossesDefeated),
      aetherPoints: Math.max(serverLegendMetrics?.aether_points ?? 0, stats.aetherPoints),
      habitsClaimedTotal: Math.max(
        serverLegendMetrics?.habits_claimed_total ?? 0,
        habits.reduce((sum, h) => sum + Math.max(h.history?.length || 0, h.completedToday ? 1 : 0), 0)
      ),
      mealsLoggedTotal: Math.max(serverLegendMetrics?.meals_logged_total ?? 0, meals.length),
      waterGlassesCurrent: Math.max(serverLegendMetrics?.water_glasses_current ?? 0, waterGlasses),
      questsClaimedTotal: Math.max(
        serverLegendMetrics?.quests_claimed_total ?? 0,
        claimedClassicQuests + claimedDynAll.length
      ),
      dynamicQuestsClaimedTotal: Math.max(
        serverLegendMetrics?.dynamic_quests_claimed_total ?? 0,
        claimedDynAll.length
      ),
      dynamicPhysicalClaimed: Math.max(
        serverLegendMetrics?.dynamic_physical_claimed ?? 0,
        claimedDynAll.filter(q => q.category === 'physical').length
      ),
      dynamicIntellectualClaimed: Math.max(
        serverLegendMetrics?.dynamic_intellectual_claimed ?? 0,
        claimedDynAll.filter(q => q.category === 'intellectual').length
      ),
      dynamicDisciplineClaimed: Math.max(
        serverLegendMetrics?.dynamic_discipline_claimed ?? 0,
        claimedDynAll.filter(q => q.category === 'discipline').length
      ),
      dynamicPersonalGrowthClaimed: Math.max(
        serverLegendMetrics?.dynamic_personal_growth_claimed ?? 0,
        claimedDynAll.filter(q => q.category === 'personal_growth').length
      ),
      dynamicSocialClaimed: Math.max(
        serverLegendMetrics?.dynamic_social_claimed ?? 0,
        claimedDynAll.filter(q => q.category === 'social').length
      ),
      normalAchievementsUnlocked: Math.max(
        serverLegendMetrics?.normal_achievements_unlocked ?? 0,
        achievements.filter(a => a.unlocked).length
      ),
      unlockedWeaponsCount: Math.max(
        serverLegendMetrics?.unlocked_weapons_count ?? 0,
        weapons.filter(w => w.unlocked).length
      ),
      maxWeaponLevel: Math.max(
        serverLegendMetrics?.max_weapon_level ?? 1,
        weapons.reduce((mx, w) => Math.max(mx, w.level || 1), 1)
      ),
      friendsCount: Math.max(serverLegendMetrics?.friends_count ?? 0, acceptedFriends),
      guildJoined: Math.max(serverLegendMetrics?.guild_joined ?? 0, inGuild),
      guildLeader: Math.max(serverLegendMetrics?.guild_leader ?? 0, isGuildLeader),
      chatMessagesSent: Math.max(serverLegendMetrics?.chat_messages_sent ?? 0, myChatCount),
      storyChaptersClaimed: Math.max(
        serverLegendMetrics?.story_chapters_claimed ?? 0,
        campaignProgress.claimedChapterIds.length
      ),
      allKingdomsCleared: Math.max(
        serverLegendMetrics?.all_kingdoms_cleared ?? 0,
        kingdoms.every(k => k.cleared) ? 1 : 0
      ),
      honorReclaimed: Math.max(
        serverLegendMetrics?.honor_reclaimed ?? 0,
        reclaimHonorQuest.claimed ? 1 : 0
      ),
      dailyReportsGenerated: Math.max(
        serverLegendMetrics?.daily_reports_generated ?? 0,
        aiMentorMemory.reportsGeneratedCount || (dailyReport ? 1 : 0)
      ),
      goldBalance: Math.max(serverLegendMetrics?.gold_balance ?? 0, stats.gold),
      forgeXpBalance: Math.max(serverLegendMetrics?.forge_xp_balance ?? 0, stats.forgeXP),
    };
  };

  const metricSnapshot = computeLocalMetricSnapshot();
  const ownershipByAchievement = new Map<string, GlobalAchievementOwnership>();
  for (const c of legendClaims) {
    ownershipByAchievement.set(c.achievementId, c);
  }

  const hallOfLegends: HallOfLegendsEntry[] = GLOBAL_EXCLUSIVE_ACHIEVEMENTS.map(def => {
    const ownership = ownershipByAchievement.get(def.id) || null;
    const userProgress = getMetricValueForRequirement(def.requirementType, metricSnapshot);
    const eligible = !ownership && userProgress >= def.threshold;
    const status: HallOfLegendsStatus = ownership
      ? 'claimed'
      : eligible
      ? 'unclaimed'
      : 'locked_for_you';
    return {
      ...def,
      ownership,
      status,
      userProgress,
      eligibleToClaim: eligible,
      ownedByCurrentUser: Boolean(ownership && user && ownership.ownerId === user.id),
    };
  });

  const refreshHallOfLegends = async () => {
    setHallLoading(true);
    try {
      const res = await fetchHallOfLegendsServer();
      if (res.ok && res.data) {
        setLegendClaims(res.data.claims);
        setLegendAnnouncements(res.data.announcements);
        if (res.data.metrics) setServerLegendMetrics(res.data.metrics);
        if (res.data.equippedByUser) setEquippedLegendMap(res.data.equippedByUser);
      }
    } finally {
      setHallLoading(false);
    }
  };

  const claimGlobalExclusiveAchievement = async (
    achievementId: string
  ): Promise<{ success: boolean; error?: string; ownerUsername?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Please sign in to claim a Global Exclusive Title.' };
    }
    const entry = hallOfLegends.find(h => h.id === achievementId);
    if (!entry) return { success: false, error: 'Global achievement not found.' };
    if (entry.ownership) {
      return {
        success: false,
        ownerUsername: entry.ownership.ownerUsername,
        error: `Already claimed permanently by ${entry.ownership.ownerUsername}.`,
      };
    }
    if (entry.userProgress < entry.threshold) {
      return {
        success: false,
        error: `Requirement not yet fulfilled (${entry.userProgress}/${entry.threshold}).`,
      };
    }

    const res = await claimGlobalAchievementServer({
      achievementId: entry.id,
      achievementName: entry.name,
      titleTag: entry.titleTag,
      titleStyle: entry.titleStyle,
      emblemIcon: entry.emblemIcon,
      rarity: entry.rarity,
      ownerId: user.id,
      ownerUsername: user.username,
      threshold: entry.threshold,
      progressValue: entry.userProgress,
    });

    if (!res.ok || !res.data || res.data.success === false) {
      await refreshHallOfLegends();
      return {
        success: false,
        ownerUsername: res.data?.ownerUsername,
        error: res.error || res.data?.error || 'Could not claim this Global Exclusive Title.',
      };
    }

    if (res.data.profile) {
      syncProfileWithCelebration(res.data.profile);
    } else if (res.data.isFallbackLedger) {
      setStats(prev => {
        let nextXp = prev.playerXP + entry.rewardPlayerXp;
        let nextLevel = prev.level;
        let nextReq = prev.playerXPNextLevel;
        while (nextXp >= nextReq) {
          nextXp -= nextReq;
          nextLevel += 1;
          nextReq = Math.floor(nextReq * 1.25);
        }
        return {
          ...prev,
          level: nextLevel,
          playerXP: nextXp,
          playerXPNextLevel: nextReq,
          forgeXP: prev.forgeXP + entry.rewardForgeXp,
          gold: prev.gold + entry.rewardGold,
        };
      });
    }

    const ownership: GlobalAchievementOwnership = res.data.ownership || {
      achievementId: entry.id,
      ownerId: user.id,
      ownerUsername: user.username,
      claimedAt: new Date().toISOString(),
    };

    setLegendClaims(prev => [...prev.filter(c => c.achievementId !== entry.id), ownership]);
    if (res.data.announcements) {
      setLegendAnnouncements(res.data.announcements);
    } else {
      setLegendAnnouncements(prev => [
        {
          id: 'ann-local-' + Date.now(),
          achievementId: entry.id,
          achievementName: entry.name,
          titleTag: entry.titleTag,
          titleStyle: entry.titleStyle,
          emblemIcon: entry.emblemIcon,
          rarity: entry.rarity,
          ownerId: user.id,
          ownerUsername: user.username,
          announcedAt: ownership.claimedAt,
        },
        ...prev,
      ]);
    }
    if (res.data.equippedByUser) {
      setEquippedLegendMap(res.data.equippedByUser);
    } else {
      setEquippedLegendMap(prev => ({
        ...prev,
        [user.id]: {
          achievementId: entry.id,
          titleTag: entry.titleTag,
          titleStyle: entry.titleStyle,
          emblemIcon: entry.emblemIcon,
        },
      }));
    }

    setUser(prev =>
      prev
        ? {
            ...prev,
            legendTitle: entry.titleTag,
            legendTitleStyle: entry.titleStyle,
            legendEmblem: entry.emblemIcon,
            legendAchievementId: entry.id,
          }
        : prev
    );

    const wonEntry: HallOfLegendsEntry = {
      ...entry,
      ownership,
      status: 'claimed',
      eligibleToClaim: false,
      ownedByCurrentUser: true,
    };
    setRecentGlobalUnlockCelebration(wonEntry);

    sound.playRarityAscension('Eternal');
    confetti({
      particleCount: 160,
      spread: 110,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#38BDF8', '#A855F7', '#F43F5E', '#34D399'],
    });

    return { success: true };
  };

  const equipGlobalLegendTitle = async (
    achievementId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Please sign in first.' };

    const target = achievementId
      ? hallOfLegends.find(h => h.id === achievementId && h.ownedByCurrentUser)
      : null;
    if (achievementId && !target) {
      return { success: false, error: 'You can only equip Global Titles you own.' };
    }

    const res = await setEquippedLegendTitleServer({
      ownerId: user.id,
      achievementId: target ? target.id : null,
      titleTag: target ? target.titleTag : null,
      titleStyle: target ? target.titleStyle : null,
      emblemIcon: target ? target.emblemIcon : null,
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Could not update equipped legend title.' };
    }

    setUser(prev =>
      prev
        ? {
            ...prev,
            legendTitle: target ? target.titleTag : null,
            legendTitleStyle: target ? target.titleStyle : null,
            legendEmblem: target ? target.emblemIcon : null,
            legendAchievementId: target ? target.id : null,
          }
        : prev
    );
    setEquippedLegendMap(prev => {
      const next = { ...prev };
      if (!target) {
        delete next[user.id];
      } else {
        next[user.id] = {
          achievementId: target.id,
          titleTag: target.titleTag,
          titleStyle: target.titleStyle,
          emblemIcon: target.emblemIcon,
        };
      }
      return next;
    });
    sound.playClick();
    return { success: true };
  };

  const dismissGlobalUnlockCelebration = () => {
    setRecentGlobalUnlockCelebration(null);
  };

  // Phase 1: Explorable 3D World Persistence & Preview Handlers
  const persistWorldState = async (
    nextState: WorldPersistenceState,
    rpcPatch?: {
      hasEnteredWorld?: boolean;
      selectedRegionId?: 'heartlands';
      goldenTreeStage?: GoldenTreeStage;
      landmarks?: WorldPersistenceState['landmarks'];
      graphicsQuality?: WorldGraphicsQuality;
      lastPlayerPosition?: WorldPlayerPosition | null;
    }
  ) => {
    const uid = activeSessionUserIdRef.current;
    try {
      const storageKey = uid
        ? STORAGE_KEY_PREFIX + 'world_state_' + uid
        : STORAGE_KEY_PREFIX + 'world_state_guest';
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch {
      // ignore storage quota
    }

    if (!isSupabaseConfigured() || !uid) return;

    const res = await saveWorldStateServer(rpcPatch || nextState);
    if (!res.ok && res.schemaMissing && unifiedBackendReady) {
      await saveClientPreferencesServer({
        soundEnabled: stats.soundEnabled,
        activeTab,
        equippedGear,
        selectedHeroId,
        heroLocked,
        heroSelectedAt,
        reclaimHonor: reclaimHonorQuest,
        campaignProgress,
        attributeBonuses,
        tutorialState: {
          completed: tutorialState.completed,
          skipped: tutorialState.skipped,
        },
        worldState: nextState,
        savedAt: new Date().toISOString(),
      });
    }
  };

  const markWorldEntered = async () => {
    if (worldStateRef.current.hasEnteredWorld) return;
    const next: WorldPersistenceState = {
      ...worldStateRef.current,
      hasEnteredWorld: true,
    };
    worldStateRef.current = next;
    setWorldState(next);
    await persistWorldState(next, { hasEnteredWorld: true });
  };

  const setWorldGoldenTreeStage = async (stage: GoldenTreeStage) => {
    sound.playClick();
    const next: WorldPersistenceState = {
      ...worldStateRef.current,
      goldenTreeStage: stage,
    };
    worldStateRef.current = next;
    setWorldState(next);
    await persistWorldState(next, { goldenTreeStage: stage });
  };

  const setWorldLandmarkStage = async (
    landmarkId: LandmarkId,
    stage: LandmarkRestorationStage,
    restorationPercent: number
  ) => {
    sound.playClick();
    const clampedPct = Math.max(0, Math.min(100, Math.round(restorationPercent)));
    const nextLandmarks = {
      ...worldStateRef.current.landmarks,
      [landmarkId]: {
        id: landmarkId,
        stage,
        restorationPercent: clampedPct,
      },
    };
    const next: WorldPersistenceState = {
      ...worldStateRef.current,
      landmarks: nextLandmarks,
    };
    worldStateRef.current = next;
    setWorldState(next);
    await persistWorldState(next, { landmarks: nextLandmarks });
  };

  const setWorldGraphicsQuality = async (quality: WorldGraphicsQuality) => {
    sound.playClick();
    const next: WorldPersistenceState = {
      ...worldStateRef.current,
      graphicsQuality: quality,
    };
    worldStateRef.current = next;
    setWorldState(next);
    await persistWorldState(next, { graphicsQuality: quality });
  };

  const saveWorldPlayerPosition = (pos: WorldPlayerPosition) => {
    const sanitized: WorldPlayerPosition = {
      x: Math.round(Math.max(-145, Math.min(145, pos.x)) * 100) / 100,
      y: Math.round(Math.max(-20, Math.min(60, pos.y)) * 100) / 100,
      z: Math.round(Math.max(-145, Math.min(145, pos.z)) * 100) / 100,
    };
    const next: WorldPersistenceState = {
      ...worldStateRef.current,
      lastPlayerPosition: sanitized,
    };
    worldStateRef.current = next;
    setWorldState(next);

    const uid = activeSessionUserIdRef.current;
    try {
      const storageKey = uid
        ? STORAGE_KEY_PREFIX + 'world_state_' + uid
        : STORAGE_KEY_PREFIX + 'world_state_guest';
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }

    if (worldPosSaveTimerRef.current) {
      clearTimeout(worldPosSaveTimerRef.current);
    }
    worldPosSaveTimerRef.current = setTimeout(() => {
      void persistWorldState(worldStateRef.current, { lastPlayerPosition: sanitized });
    }, 1800);
  };

  // Reset & Export
  const resetAllData = () => {
    if (!isAuthenticated || !user) return;
    sound.playClick();
    clearPrivateStorage();
    setStats(INITIAL_PLAYER_STATS);
    setHabits(INITIAL_HABITS);
    setQuests(INITIAL_QUESTS);
    setWeapons(INITIAL_WEAPONS);
    setBuffs(INITIAL_BUFFS);
    setKingdoms(INITIAL_KINGDOMS);
    setFitnessSessions([]);
    setMeals([]);
    setWaterGlasses(5);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setGuilds([]);
    setChatMessages([]);
    setFriends([]);
    setBlockedUsers([]);
    setGuildInvites([]);
    setSelectedPublicProfileId(null);
    setTransactions([]);
  };

  const exportData = () => {
    return JSON.stringify(
      {
        user,
        stats,
        habits,
        quests,
        weapons,
        buffs,
        kingdoms,
        fitnessSessions,
        meals,
        waterGlasses,
        achievements,
      },
      null,
      2
    );
  };

  // --- PHASE 1: REAL-LIFE SKILL TREE HANDLERS ---
  const refreshSkillTreeState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setSkillTreeLoading(true);
    try {
      const tz = user?.timezone || getUserTimezone();
      const res = await fetchSkillTreeStateServer(uid, tz);
      if (res.ok && res.data?.state) {
        setSkillTreeState(res.data.state);
      }
    } finally {
      setSkillTreeLoading(false);
    }
  };

  const awardVerifiedSkillActivityInternal = async (params: {
    activityType: SkillActivityType;
    idempotencyKey: string;
    sourceType: string;
    sourceId: string;
    metadata?: VerifiedActivityMetadata;
  }): Promise<SkillActivityAwardResult> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) {
      return { success: false, error: 'Authentication required.' };
    }
    const tz = user?.timezone || getUserTimezone();
    const res = await recordVerifiedSkillActivityServer({
      userId: uid,
      activityType: params.activityType,
      idempotencyKey: params.idempotencyKey,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      metadata: params.metadata,
      timezone: tz,
    });
    if (res.success && res.state) {
      setSkillTreeState(res.state);
      if (!res.duplicate) {
        // Dispatch verified activity across Weekly Boss, Rivalries, Community Events, and Personal Records Museum
        const ecoRes = await dispatchVerifiedEcosystemActivityServer({
          userId: uid,
          username: user?.username || 'Champion',
          activityType: params.activityType,
          idempotencyKey: params.idempotencyKey,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          metadata: params.metadata,
          timezone: tz,
          skillLevelUp:
            res.leveledUp && res.attributeId && res.newLevel
              ? { attributeId: res.attributeId, newLevel: res.newLevel }
              : undefined,
        });
        if (ecoRes.ok && ecoRes.data) {
          if (ecoRes.data.weeklyBoss?.bossDefeatedJustNow) {
            setNotifications(prev => [
              {
                id: `notif-wb-${Date.now()}`,
                type: 'weekly_boss_defeated',
                title: 'Weekly Raid Boss Vanquished!',
                body: `The realm defeated ${ecoRes.data.weeklyBoss.bossName}! Claim your raid rewards.`,
                readAt: null,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }
          if (Array.isArray(ecoRes.data.museumRecordsCreated) && ecoRes.data.museumRecordsCreated.length > 0) {
            const firstRec = ecoRes.data.museumRecordsCreated[0] as MuseumRecord;
            if (firstRec.isPersonalBest) {
              setNotifications(prev => [
                {
                  id: `notif-pb-${Date.now()}`,
                  type: 'museum_personal_best',
                  title: 'New Personal Best Enshrined!',
                  body: `${firstRec.title}: ${firstRec.displayValue}`,
                  readAt: null,
                  createdAt: new Date().toISOString(),
                },
                ...prev,
              ]);
            }
          }
          // Refresh affected ecosystem caches quietly
          void refreshWeeklyBossState();
          void refreshRivalsState();
          void refreshCommunityEventState();
          void refreshMuseumRecords();
        }
      }
      if (!res.duplicate && (res.xpAwarded || 0) > 0) {
        setLastSkillAwardBanner(res);
        if (res.leveledUp) {
          sound.playVictory();
        }
      }
    }
    return res;
  };

  const unlockSkillNode = async (
    nodeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const tz = user?.timezone || getUserTimezone();
    const res = await unlockSkillNodeServer({ userId: uid, nodeId, timezone: tz });
    if (res.success && res.state) {
      setSkillTreeState(res.state);
      sound.playQuestComplete();
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#C5A15A', '#7046A5', '#34D399'],
      });
      void archiveSkillNodeMuseumServer(uid, nodeId).then(() => refreshMuseumRecords());
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not unlock skill node.' };
  };

  const claimSkillMilestone = async (
    milestoneId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const tz = user?.timezone || getUserTimezone();
    const res = await claimSkillMilestoneServer({ userId: uid, milestoneId, timezone: tz });
    if (res.success && res.state) {
      setSkillTreeState(res.state);
      sound.playVictory();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not claim milestone.' };
  };

  const logVerifiedStudySession = async (params: {
    topic: string;
    durationMinutes: number;
    reflection: string;
  }): Promise<SkillActivityAwardResult> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) {
      return { success: false, error: 'Please sign in to log a verified study session.' };
    }
    const cleanTopic = params.topic.trim();
    const cleanReflection = params.reflection.trim();
    const mins = Math.round(Number(params.durationMinutes) || 0);
    if (cleanTopic.length < 2) {
      return { success: false, error: 'Enter the subject or skill you practiced.' };
    }
    if (mins < 10 || mins > 240) {
      return { success: false, error: 'Study duration must be between 10 and 240 minutes.' };
    }
    if (cleanReflection.length < 12) {
      return {
        success: false,
        error: 'Share a brief study takeaway (at least 12 characters) to verify your session.',
      };
    }
    const sessionKey = `study:${createIdempotencyKey()}`;
    const result = await awardVerifiedSkillActivityInternal({
      activityType: 'study_session',
      idempotencyKey: sessionKey,
      sourceType: 'verified_study_session',
      sourceId: cleanTopic.slice(0, 64),
      metadata: {
        durationMinutes: mins,
        subAction: 'reflection',
      },
    });
    if (result.success) {
      sound.playQuestComplete();
    }
    return result;
  };

  const dismissSkillAwardBanner = () => setLastSkillAwardBanner(null);

  // --- CENTRAL REWARD CREDITING HELPER (NO DUPLICATE XP SYSTEMS) ---
  const applyCentralRewardGrant = (sourceLabel: string, xp: number, forgeXp: number, gold: number) => {
    if (xp <= 0 && forgeXp <= 0 && gold <= 0) return;
    setStats(prev => {
      let nextLevel = prev.level;
      let nextXp = prev.playerXP + xp;
      let nextThreshold = prev.playerXPNextLevel;
      while (nextXp >= nextThreshold) {
        nextXp -= nextThreshold;
        nextLevel += 1;
        nextThreshold = Math.round(nextThreshold * 1.25);
      }
      if (nextLevel > prev.level) {
        sound.playVictory();
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.55 },
          colors: ['#C5A15A', '#7046A5', '#38bdf8'],
        });
      }
      return {
        ...prev,
        level: nextLevel,
        playerXP: nextXp,
        playerXPNextLevel: nextThreshold,
        forgeXP: prev.forgeXP + forgeXp,
        gold: prev.gold + gold,
      };
    });
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTransactions(prev => [
      ...(xp > 0 ? [{ id: `tx-pxp-${Date.now()}`, type: 'PLAYER_XP' as const, source: sourceLabel, amount: xp, timestamp: nowTime }] : []),
      ...(forgeXp > 0 ? [{ id: `tx-fxp-${Date.now() + 1}`, type: 'FORGE_XP' as const, source: sourceLabel, amount: forgeXp, timestamp: nowTime }] : []),
      ...(gold > 0 ? [{ id: `tx-g-${Date.now() + 2}`, type: 'GOLD' as const, source: sourceLabel, amount: gold, timestamp: nowTime }] : []),
      ...prev.slice(0, 46),
    ]);
  };

  // --- PHASE 2: WEEKLY BOSS BATTLES ---
  const refreshWeeklyBossState = async (page: number = 1) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setWeeklyBossLoading(true);
    try {
      const tz = user?.timezone || getUserTimezone();
      const res = await fetchWeeklyBossStateServer(uid, page, 10, tz);
      if (res.ok && res.data) {
        setWeeklyBossState(res.data);
      }
    } finally {
      setWeeklyBossLoading(false);
    }
  };

  const claimWeeklyBossReward = async (
    claimType: 'mission' | 'milestone' | 'participation' | 'defeat' | 'top_contributor',
    claimId: string
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const tz = user?.timezone || getUserTimezone();
    const res = await claimWeeklyBossRewardServer({ userId: uid, claimType, claimId, timezone: tz });
    if (res.ok) {
      if (res.state) setWeeklyBossState(res.state);
      if (res.rewards) {
        applyCentralRewardGrant(
          `Weekly Raid (${claimType.replace('_', ' ')})`,
          res.rewards.xp || 0,
          res.rewards.forgeXp || 0,
          res.rewards.gold || 0
        );
      }
      sound.playQuestComplete();
      return { success: true, rewards: res.rewards };
    }
    return { success: false, error: res.error || 'Could not claim reward.' };
  };

  // --- PHASE 3: FRIEND RIVAL SYSTEM ---
  const refreshRivalsState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setRivalsLoading(true);
    try {
      const res = await fetchRivalsStateServer(uid);
      if (res.ok && res.data) {
        setRivalsState(res.data);
      }
    } finally {
      setRivalsLoading(false);
    }
  };

  const sendRivalInvite = async (
    opponentId: string,
    opponentName: string,
    challengeType: RivalChallengeType
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const isAcceptedFriend = friends.some(
      f => f.status === 'accepted' && f.champion.id === opponentId
    );
    const res = await inviteRivalServer({
      userId: uid,
      challengerName: user.username,
      opponentId,
      opponentName,
      challengeType,
      isFriend: isAcceptedFriend,
    });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const respondRivalInvite = async (rivalryId: string, decision: 'accept' | 'decline') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await respondRivalInviteServer({ userId: uid, rivalryId, decision });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      if (decision === 'accept') sound.playQuestComplete();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const cancelRivalInvite = async (rivalryId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await cancelRivalInviteServer({ userId: uid, rivalryId });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const endActiveRivalry = async (rivalryId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await endActiveRivalryServer({ userId: uid, rivalryId });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const blockRivalUser = async (targetUserId: string, unblock: boolean = false) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await blockRivalUserServer({ userId: uid, targetUserId, unblock });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // --- PHASE 4: AI FITNESS MENTOR ---
  const buildMinimizedMentorContext = () => ({
    username: user?.username || 'Champion',
    characterClass: user?.characterClass || 'Warrior',
    level: stats.level,
    currentStreak: stats.currentStreak,
    fitnessGoals: user?.personalGoals || [],
    recentWorkouts: fitnessSessions.slice(0, 8).map(w => ({
      exercise: w.exerciseName,
      durationMinutes: w.durationMinutes,
      reps: w.repetitions,
    })),
    personalRecords: (museumData?.personalBests || []).slice(0, 6).map(p => ({
      title: p.title,
      displayValue: p.displayValue,
    })),
    skillTreeLevels: Object.fromEntries(
      Object.entries(skillTreeState.attributes).map(([k, v]) => [k, v.level])
    ),
    completedQuestsCount: quests.filter(q => q.completed).length + dynamicDailyQuests.filter(q => q.completed).length,
    recentAchievements: achievements.filter(a => a.unlocked).slice(0, 6).map(a => a.name),
    waterGlassesToday: waterGlasses,
    mealsLoggedCount: meals.length,
  });

  const refreshAiMentorState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchAiMentorStateServer(uid);
    if (res.ok && res.data) {
      setMentorMessages(res.data.messages || []);
      setMentorQuests(res.data.recommendedQuests || []);
      setMentorWeeklyAnalysis(res.data.latestWeeklyAnalysis || null);
    }
  };

  const sendAiMentorMessage = async (message: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    setMentorLoading(true);
    setMentorError(null);
    try {
      const res = await sendAiMentorMessageServer({
        userId: uid,
        message,
        playerContext: buildMinimizedMentorContext(),
      });
      if (!res.ok) {
        const msg = res.error || 'AI Mentor is currently unavailable.';
        setMentorError(msg);
        return { success: false, error: msg };
      }
      if (res.messages) setMentorMessages(res.messages);
      if (res.recommendedQuests) setMentorQuests(res.recommendedQuests);
      return { success: true };
    } finally {
      setMentorLoading(false);
    }
  };

  const requestMentorWeeklyAnalysis = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    setMentorLoading(true);
    setMentorError(null);
    try {
      const res = await requestMentorWeeklyAnalysisServer({
        userId: uid,
        playerContext: buildMinimizedMentorContext(),
      });
      if (!res.ok || !res.analysis) {
        const msg = res.error || 'Could not generate weekly analysis.';
        setMentorError(msg);
        return { success: false, error: msg };
      }
      setMentorWeeklyAnalysis(res.analysis);
      return { success: true };
    } finally {
      setMentorLoading(false);
    }
  };

  const acceptMentorQuest = async (questId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await acceptMentorQuestServer({ userId: uid, questId });
    if (!res.ok || !res.quest) {
      return { success: false, error: res.error || 'Could not accept mentor quest.' };
    }
    if (res.recommendedQuests) setMentorQuests(res.recommendedQuests);
    const tz = user?.timezone || getUserTimezone();
    const todayKey = getPeriodKeyForFrequency('daily', tz);
    const q = res.quest;
    const mappedQuest: DynamicDailyQuest = {
      id: `mentor-${q.id}`,
      periodKey: todayKey,
      title: q.title,
      description: q.description,
      category: q.category,
      difficulty: q.difficulty,
      objectiveLabel: q.objectiveLabel,
      evidenceType: q.evidenceType,
      progress: 0,
      maxProgress: q.maxProgress,
      unitLabel: q.unitLabel,
      estimatedMinutes: q.estimatedMinutes,
      playerXpReward: q.playerXpReward,
      forgeXpReward: q.forgeXpReward,
      goldReward: q.goldReward,
      isSpecialChallenge: false,
      personalizationReason: `AI Mentor Guidance: ${q.rationale}`,
      adaptiveTier: 'balanced',
      completed: false,
      claimed: false,
      createdAt: new Date().toISOString(),
    };
    setDynamicDailyQuests(prev => [mappedQuest, ...prev.filter(item => item.id !== mappedQuest.id)]);
    sound.playQuestComplete();
    return { success: true };
  };

  // --- PHASE 5: COMMUNITY EVENTS ---
  const refreshCommunityEventState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setCommunityEventLoading(true);
    try {
      const res = await fetchCommunityEventsStateServer(uid);
      if (res.ok && res.data) {
        setCommunityEventState(res.data);
      }
    } finally {
      setCommunityEventLoading(false);
    }
  };

  const claimCommunityMilestone = async (milestoneId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimCommunityMilestoneServer({ userId: uid, milestoneId });
    if (res.ok) {
      if (res.state) setCommunityEventState(res.state);
      if (res.rewards) {
        applyCentralRewardGrant(
          'Community Event Milestone',
          res.rewards.xp || 0,
          0,
          res.rewards.gold || 0
        );
      }
      sound.playVictory();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not claim community milestone.' };
  };

  // --- PHASE 6: PERSONAL RECORDS MUSEUM ---
  const refreshMuseumRecords = async (params?: {
    category?: MuseumCategory | 'all';
    search?: string;
    sort?: 'newest' | 'oldest' | 'rarity' | 'value';
    page?: number;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setMuseumLoading(true);
    try {
      const res = await fetchMuseumRecordsServer({
        callerUserId: uid,
        category: params?.category || 'all',
        search: params?.search || '',
        sort: params?.sort || 'newest',
        page: params?.page || 1,
        limit: 12,
      });
      if (res.ok && res.data) {
        setMuseumData(res.data);
      }
    } finally {
      setMuseumLoading(false);
    }
  };

  const inspectPlayerMuseumRecords = async (targetUserId: string, page: number = 1) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { ok: false, error: 'Authentication required.' };
    return fetchMuseumRecordsServer({
      callerUserId: uid,
      targetUserId,
      page,
      limit: 10,
    });
  };

  return (
    <GameContext.Provider
      value={{
        user,
        isAuthLoading,
        isAuthenticated,
        stats,
        habits,
        quests,
        weapons,
        buffs,
        kingdoms,
        fitnessSessions,
        meals,
        waterGlasses,
        achievements,
        guilds,
        chatMessages,
        transactions,
        shopItems,
        friends,
        blockedUsers,
        guildInvites,
        selectedPublicProfileId,
        notifications,
        unreadNotificationsCount,
        unifiedBackendReady,
        activeTab,
        socialSubTab,
        setSocialSubTab,
        progressionSubTab,
        setProgressionSubTab,
        skillTreeState,
        skillTreeLoading,
        lastSkillAwardBanner,
        dismissSkillAwardBanner,
        refreshSkillTreeState,
        unlockSkillNode,
        claimSkillMilestone,
        logVerifiedStudySession,
        weeklyBossState,
        weeklyBossLoading,
        refreshWeeklyBossState,
        claimWeeklyBossReward,
        rivalsState,
        rivalsLoading,
        refreshRivalsState,
        sendRivalInvite,
        respondRivalInvite,
        cancelRivalInvite,
        endActiveRivalry,
        blockRivalUser,
        mentorMessages,
        mentorQuests,
        mentorWeeklyAnalysis,
        mentorLoading,
        mentorError,
        refreshAiMentorState,
        sendAiMentorMessage,
        requestMentorWeeklyAnalysis,
        acceptMentorQuest,
        communityEventState,
        communityEventLoading,
        refreshCommunityEventState,
        claimCommunityMilestone,
        museumData,
        museumLoading,
        refreshMuseumRecords,
        inspectPlayerMuseumRecords,
        dynamicDailyQuests,
        dynamicQuestHistory,
        aiMentorMemory,
        isGeneratingDailyQuests,
        questGenerationError,
        mentorGreeting,
        generateTodaysAiQuests,
        submitDynamicQuestEvidence,
        claimDynamicQuest,
        dailyReport,
        isGeneratingDailyReport,
        dailyReportError,
        generateTodaysDailyReport,
        hallOfLegends,
        legendAnnouncements,
        recentGlobalUnlockCelebration,
        hallLoading,
        equippedLegendMap,
        refreshHallOfLegends,
        claimGlobalExclusiveAchievement,
        equipGlobalLegendTitle,
        dismissGlobalUnlockCelebration,
        showAuthModal,
        authMode,
        equippedWeapon,
        equippedGear,
        activeBuffs,
        selectedHeroId,
        heroLocked,
        heroSelectedAt,
        showHeroSelectModal,
        setShowHeroSelectModal,
        selectPlayableHero,
        rpgAttributes,
        reclaimHonorQuest,
        recordEquipmentInspected,
        claimReclaimHonorReward,
        campaignProgress,
        evaluateChapterRequirements,
        claimCampaignChapterReward,
        tutorialState,
        startTutorial,
        nextTutorialStep,
        prevTutorialStep,
        skipTutorial,
        completeTutorial,
        cloudStatus,
        lastSavedAt,
        showMigrationModal,
        migrationSummary,
        showSupabaseConfigModal,
        setShowSupabaseConfigModal,
        setActiveTab,
        setShowAuthModal,
        authError,
        clearAuthError,
        authCallbackError,
        clearAuthCallbackError,
        loginWithSupabase,
        loginWithGoogleWithSupabase,
        registerWithSupabase,
        resetPasswordWithSupabase,
        logout,
        recheckAuthSession,
        performMigration,
        skipMigration,
        triggerManualCloudSave,
        updateUser,
        finishOnboarding,
        toggleHabitComplete,
        createHabit,
        deleteHabit,
        isHabitClaimedForCurrentPeriod,
        claimQuest,
        equipWeapon,
        equipGearSlot,
        getDefaultSlotForCategory,
        upgradeWeapon,
        purchaseShopItem,
        trainWeaponMastery,
        evolveWeapon,
        unlockProgressionWeapon,
        ascendWeaponRarity,
        activateBuff,
        logFitnessSession,
        logMeal,
        addWaterGlass,
        resetWaterGlasses,
        startBossBattle,
        attackBoss,
        discoverBossWeakness,
        resetBossBattle,
        claimAchievement,
        openPublicProfile,
        closePublicProfile,
        getPublicPlayerProfile,
        refreshSocialState,
        fetchLeaderboard,
        sendChatMessage,
        reportChatMessage,
        toggleGuildMembership,
        leaveGuild,
        createGuild,
        getGuildDetails,
        requestJoinGuild,
        respondGuildRequest,
        inviteToGuild,
        respondGuildInvite,
        disbandGuild,
        updateGuildDetails,
        manageGuildMember,
        createGuildChallenge,
        searchChampions,
        sendFriendRequest,
        cancelFriendRequest,
        respondFriendRequest,
        removeFriend,
        blockUser,
        unblockUser,
        markNotificationRead,
        toggleSound,
        resetAllData,
        exportData,
        worldState,
        markWorldEntered,
        setWorldGoldenTreeStage,
        setWorldLandmarkStage,
        setWorldGraphicsQuality,
        saveWorldPlayerPosition,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
