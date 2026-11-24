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
  PresenceStatus,
  GranularPrivacySettings,
  CompetitiveRivalMode,
  CompetitiveMatchRules,
  CompetitiveMatchVisibility,
  CompetitiveLeaderboardEntry,
  CompetitiveRivalMatch,
  PlayerSkillTreeState,
  SkillActivityAwardResult,
  SkillActivityType,
  AdvancedLeaderboardResponse,
  NotificationCategory,
  PlayerIdentityState,
  PlayerSeasonStateResponse,
  ServerNotificationPreferences,
  FeedFilter,
  FeedListResponse,
  FeedPost,
  FeedReactionKey,
  FeedCommentPermission,
  WorkoutParty,
  WorkoutPartyHistoryEntry,
  PlayerCosmeticState,
  CosmeticSlot,
  CommunityPoll,
  TrophyShowcaseState,
  HiddenAchievementClientView,
  TerritoryMissionStance,
  TerritoryWarsStateResponse,
  PlayerWalletState,
  CardsStateResponse,
  MarketplaceStateResponse,
  CollectionCompletionResponse,
  FriendshipProgressRecord,
  EndorsementCategory,
  PlayerEndorsementSummary,
  PlayerPrestigeState,
  DailyCalendarStateResponse,
  SeasonalStatsRecap,
  SeasonalStatVisibility,
  CommunityTournament,
  SpectatorLiveMatchSummary,
  RankedDivisionName,
  PlayerLoadout,
} from '../types/game';
import { createEmptySkillTreeState, type VerifiedActivityMetadata } from '../data/skillTreeData';
import { DEFAULT_SERVER_NOTIFICATION_PREFS } from '../data/polish2Data';
import {
  DEFAULT_GRANULAR_PRIVACY_SETTINGS,
  deriveLegacyVisibilityFromGranular,
  normalizeGranularPrivacySettings,
  normalizePresenceStatus,
} from '../utils/presence';
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
  cancelRivalsQueueServer,
  claimCommunityMilestoneServer,
  claimWeeklyBossRewardServer,
  dispatchVerifiedEcosystemActivityServer,
  disputeRivalMatchServer,
  endActiveRivalryServer,
  fetchAiMentorStateServer,
  fetchCommunityEventsStateServer,
  fetchMuseumRecordsServer,
  fetchRivalsArenaStateServer,
  fetchRivalsLeaderboardServer,
  fetchRivalsStateServer,
  fetchWeeklyBossStateServer,
  inviteRivalServer,
  joinRivalsQueueServer,
  reconcileMuseumServer,
  reconcileSkillTreeServer,
  rematchRivalServer,
  requestMentorWeeklyAnalysisServer,
  respondRivalInviteServer,
  sendAiMentorMessageServer,
  sendDirectRivalChallengeServer,
  syncMuseumPrivacyServer,
  updateRivalsPrivacyServer,
  type MuseumQueryResponse,
  type RivalsStateResponse,
} from '../services/ecosystemService';
import {
  claimGlobalRareBadgeServer,
  claimSeasonChallengeServer,
  claimSeasonMilestoneServer,
  dismissNotificationApiServer,
  featureIdentityBadgesServer,
  fetchIdentityStateServer,
  fetchNotificationsStateServer,
  fetchSeasonStateServer,
  markAllNotificationsReadApiServer,
  markNotificationReadApiServer,
  queryAdvancedLeaderboardServer,
  saveNotificationPreferencesServer,
  selectIdentityTitleServer,
  selectSecondaryIdentityTitleServer,
  syncVerifiedIdentitySnapshotServer,
  unlockSeasonEliteServer,
} from '../services/polish2Service';
import {
  fetchFeedPostsServer,
  shareFeedWorkoutNoteServer,
  reactToFeedPostServer,
  commentOnFeedPostServer,
  deleteFeedPostServer,
  updateFeedCommentPermissionServer,
  fetchWorkoutPartiesStateServer,
  createWorkoutPartyServer,
  joinWorkoutPartyServer,
  inviteToWorkoutPartyServer,
  startWorkoutPartyServer,
  saveWorkoutPartySummaryServer,
  leaveWorkoutPartyServer,
  submitWorkoutPartyProgressServer,
  sendWorkoutPartyMessageServer,
  fetchCosmeticsStateServer,
  syncVerifiedCosmeticsServer,
  equipCosmeticServer,
  unequipCosmeticSlotServer,
  claimCosmeticMilestoneServer,
  fetchCommunityDecisionsServer,
  castCommunityDecisionVoteServer,
  reportCommunityDecisionPollServer,
  updatePinnedTrophiesServer,
  fetchTerritoryWarsStateServer,
  registerGuildTerritoryWarServer,
  selectTerritoryMissionServer,
  claimCommunityChallengeServer,
} from '../services/expansionService';
import {
  syncInitialWalletGoldServer,
  fetchCardsStateServer,
  openCardPackServer,
  setFavoriteCardsServer,
  claimCardAchievementServer,
  saveLoadoutServer,
  equipLoadoutServer,
  duplicateLoadoutServer,
  deleteLoadoutServer,
  fetchFriendshipsStateServer,
  claimFriendshipCoopMissionServer,
  resetFriendshipOnRemovalServer,
  fetchTrophiesAndHiddenServer,
  fetchMarketplaceStateServer,
  toggleMarketplaceWishlistServer,
  purchaseMarketplaceItemServer,
  attemptMarketplaceRmCheckoutServer,
  claimRankedDivisionRewardServer,
  fetchTournamentsStateServer,
  createTournamentServer,
  joinTournamentServer,
  fetchSpectatorMatchesServer,
  sendSpectatorCheerServer,
  toggleFollowCompetitorServer,
  fetchCollectionCompletionServer,
  syncCollectionRelicsServer,
  claimCollectionMilestoneServer,
  giveEndorsementServer,
  reportEndorsementAbuseServer,
  fetchPrestigeStateServer,
  unlockPrestigeTierServer,
  claimPrestigeChallengeServer,
  fetchDailyCalendarStateServer,
  claimDailyCalendarCheckinServer,
  claimCalendarWeeklyMilestoneServer,
  fetchSeasonalRecapServer,
  updateSeasonalRecapVisibilityServer,
  purchaseBattlePassRmDisabledServer,
} from '../services/aaaGamingService';
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
  createIdempotencyKey,
  fetchSkillTreeStateServer,
  normalizeSkillTreeState,
  recordVerifiedSkillActivityServer,
  unlockSkillNodeServer,
  claimSkillMilestoneServer,
  setPresenceStatusServer,
  sendPresenceHeartbeatServer,
  sendPresenceOfflineBeacon,
  fetchPresenceBatchServer,
  syncPrivacyProfileServer,
  fetchServerFilteredPublicProfile,
  enforceDirectoryPrivacyServer,
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
  socialSubTab: 'leaderboard' | 'friends' | 'chat' | 'activity-feed' | 'workout-parties' | 'friendships';
  setSocialSubTab: (
    subTab: 'leaderboard' | 'friends' | 'chat' | 'activity-feed' | 'workout-parties' | 'friendships'
  ) => void;
  characterSubTab: 'overview' | 'customization' | 'cards' | 'trophies';
  setCharacterSubTab: (subTab: 'overview' | 'customization' | 'cards' | 'trophies') => void;
  storeSubTab: 'bazaar' | 'relics' | 'marketplace';
  setStoreSubTab: (subTab: 'bazaar' | 'relics' | 'marketplace') => void;
  guildsSubTab: 'directory' | 'territory-wars';
  setGuildsSubTab: (subTab: 'directory' | 'territory-wars') => void;
  eventsSubTab: 'events' | 'decisions';
  setEventsSubTab: (subTab: 'events' | 'decisions') => void;
  progressionSubTab: 'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree' | 'seasons' | 'daily-calendar';
  setProgressionSubTab: (
    subTab: 'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree' | 'seasons' | 'daily-calendar'
  ) => void;
  // Polish 2.0 Phase 1: Advanced Player Identity
  identityState: PlayerIdentityState | null;
  identityLoading: boolean;
  refreshIdentityState: () => Promise<void>;
  syncVerifiedIdentitySnapshot: () => Promise<void>;
  selectIdentityTitle: (titleId: string | null) => Promise<{ success: boolean; error?: string }>;
  selectSecondaryIdentityTitle: (titleId: string | null) => Promise<{ success: boolean; error?: string }>;
  featureIdentityBadges: (badgeIds: string[]) => Promise<{ success: boolean; error?: string }>;
  claimGlobalRareBadge: (
    badgeId: string
  ) => Promise<{ success: boolean; alreadyClaimedGlobally?: boolean; error?: string }>;
  // Polish 2.0 Phase 2: Intelligent Notifications & Preferences
  notificationPreferences: ServerNotificationPreferences;
  notificationCategoryCounts: Record<string, { total: number; unread: number }>;
  refreshNotificationsState: (category?: NotificationCategory | 'all') => Promise<void>;
  saveServerNotificationPreferences: (
    prefs: Partial<ServerNotificationPreferences>
  ) => Promise<{ success: boolean; error?: string }>;
  dismissNotification: (notificationId: string) => Promise<void>;
  navigateFromNotification: (notif: AppNotification) => void;
  // Polish 2.0 Phase 3: 50-Level Seasonal Battle Pass
  seasonState: PlayerSeasonStateResponse | null;
  seasonLoading: boolean;
  refreshSeasonState: (page?: number) => Promise<void>;
  claimSeasonChallenge: (
    challengeId: string
  ) => Promise<{ success: boolean; seasonXpAwarded?: number; error?: string }>;
  claimSeasonMilestone: (
    milestoneId: string,
    track?: 'free' | 'elite'
  ) => Promise<{ success: boolean; rewardLabel?: string; error?: string }>;
  unlockSeasonElite: () => Promise<{ success: boolean; error?: string }>;
  purchaseBattlePassRmDisabled: () => Promise<{ ok: boolean; error?: string }>;
  // Expansion 3.0 & AAA-15 State & Actions
  feedData: FeedListResponse | null;
  feedFilter: FeedFilter;
  feedLoading: boolean;
  refreshActivityFeed: (filter?: FeedFilter, page?: number) => Promise<void>;
  shareFeedWorkoutNote: (params: {
    verifiedRef: string;
    title: string;
    summary: string;
    highlightValue?: string;
    commentPermission?: FeedCommentPermission;
  }) => Promise<{ success: boolean; error?: string }>;
  reactToFeedPost: (postId: string, emoji: FeedReactionKey) => Promise<{ success: boolean; error?: string }>;
  commentOnFeedPost: (postId: string, body: string) => Promise<{ success: boolean; error?: string }>;
  deleteFeedPost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  updateFeedCommentPermission: (
    postId: string,
    permission: FeedCommentPermission
  ) => Promise<{ success: boolean; error?: string }>;
  workoutParties: WorkoutParty[];
  workoutPartyHistory: WorkoutPartyHistoryEntry[];
  partiesLoading: boolean;
  refreshWorkoutParties: () => Promise<void>;
  createWorkoutParty: (params: {
    title?: string;
    challengeId: string;
    visibility?: 'friends' | 'private' | 'public';
    inviteFriendIds?: string[];
  }) => Promise<{ success: boolean; party?: WorkoutParty; error?: string }>;
  joinWorkoutPartyByCode: (roomCode: string) => Promise<{ success: boolean; party?: WorkoutParty; error?: string }>;
  inviteToWorkoutParty: (partyId: string, inviteeId: string) => Promise<{ success: boolean; error?: string }>;
  startWorkoutParty: (partyId: string) => Promise<{ success: boolean; error?: string }>;
  saveWorkoutPartySummary: (partyId: string) => Promise<{ success: boolean; error?: string }>;
  leaveWorkoutParty: (partyId: string) => Promise<{ success: boolean; error?: string }>;
  submitWorkoutPartyProgress: (
    partyId: string,
    verifiedSessionId: string,
    params: { durationMinutes?: number; repetitions?: number; verifiedWithAetherVision?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
  sendWorkoutPartyMessage: (
    partyId: string,
    content: string,
    kind?: 'message' | 'reaction'
  ) => Promise<{ success: boolean; error?: string }>;
  cosmeticsState: PlayerCosmeticState | null;
  refreshCosmeticsState: () => Promise<void>;
  equipCosmetic: (cosmeticId: string) => Promise<{ success: boolean; error?: string }>;
  unequipCosmeticSlot: (slot: CosmeticSlot) => Promise<{ success: boolean; error?: string }>;
  claimCosmeticMilestone: (milestoneId: string) => Promise<{ success: boolean; error?: string }>;
  saveLoadout: (
    loadout: Partial<PlayerLoadout> & { name: string; context: 'default' | 'competition' }
  ) => Promise<{ success: boolean; error?: string }>;
  equipLoadout: (loadoutId: string, applyAs?: 'default' | 'competition') => Promise<{ success: boolean; error?: string }>;
  duplicateLoadout: (loadoutId: string) => Promise<{ success: boolean; error?: string }>;
  deleteLoadout: (loadoutId: string) => Promise<{ success: boolean; error?: string }>;
  communityDecisionPolls: CommunityPoll[];
  communityDecisionArchive: CommunityPoll[];
  refreshCommunityDecisions: () => Promise<void>;
  castCommunityDecisionVote: (pollId: string, optionIds: string[]) => Promise<{ success: boolean; error?: string }>;
  reportCommunityDecisionPoll: (pollId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  trophyShowcase: TrophyShowcaseState | null;
  hiddenAchievements: HiddenAchievementClientView[];
  refreshTrophyShowcase: () => Promise<void>;
  updatePinnedTrophies: (pinnedIds: string[]) => Promise<{ success: boolean; error?: string }>;
  territoryWarsState: TerritoryWarsStateResponse | null;
  refreshTerritoryWars: () => Promise<void>;
  registerGuildTerritoryWar: (
    guildId: string,
    guildName: string,
    guildTag: string,
    membersCount: number
  ) => Promise<{ success: boolean; error?: string }>;
  selectTerritoryMission: (
    territoryId: string,
    stance: TerritoryMissionStance
  ) => Promise<{ success: boolean; error?: string }>;
  claimCommunityChallenge: (challengeId: string) => Promise<{ success: boolean; error?: string }>;
  // AAA-15 Economy, Cards, Marketplace, Collection, Friendships, Prestige, Calendar, Recap, Tournaments, Spectator
  walletState: PlayerWalletState | null;
  cardsState: CardsStateResponse | null;
  refreshCardsState: () => Promise<void>;
  openCardPack: (
    packId: string,
    currency: 'gold' | 'fragments'
  ) => Promise<{
    success: boolean;
    drawnCards?: Array<{ cardId: string; isNew: boolean; fragmentsConverted: number }>;
    fragmentsGrantedFromDuplicates?: number;
    error?: string;
  }>;
  setFavoriteCards: (cardIds: string[]) => Promise<{ success: boolean; error?: string }>;
  claimCardAchievement: (achievementId: string) => Promise<{ success: boolean; error?: string }>;
  marketplaceState: MarketplaceStateResponse | null;
  refreshMarketplaceState: () => Promise<void>;
  toggleMarketplaceWishlist: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  purchaseMarketplaceItem: (
    itemId: string,
    currency: 'gold' | 'fragments'
  ) => Promise<{ success: boolean; error?: string }>;
  attemptMarketplaceRmCheckout: () => Promise<{ ok: boolean; error?: string }>;
  collectionState: CollectionCompletionResponse | null;
  refreshCollectionState: () => Promise<void>;
  claimCollectionMilestone: (milestoneId: string) => Promise<{ success: boolean; error?: string }>;
  friendshipLevels: FriendshipProgressRecord[];
  refreshFriendshipsExtended: () => Promise<void>;
  claimFriendshipCoopMission: (friendId: string, missionId: string) => Promise<{ success: boolean; error?: string }>;
  prestigeState: PlayerPrestigeState | null;
  refreshPrestigeState: () => Promise<void>;
  unlockPrestigeTier: () => Promise<{ success: boolean; error?: string }>;
  claimPrestigeChallenge: (challengeId: string) => Promise<{ success: boolean; error?: string }>;
  dailyCalendarState: DailyCalendarStateResponse | null;
  refreshDailyCalendar: () => Promise<void>;
  claimDailyCalendarCheckin: (params: {
    mode: 'workout' | 'rest_recovery';
    catchUpDayNumber?: number;
  }) => Promise<{ success: boolean; dayNumber?: number; rewardSummary?: string; error?: string }>;
  claimCalendarWeeklyMilestone: (milestoneId: string) => Promise<{ success: boolean; error?: string }>;
  seasonalRecap: SeasonalStatsRecap | null;
  refreshSeasonalRecap: (seasonId?: string) => Promise<void>;
  updateSeasonalRecapVisibility: (visibility: SeasonalStatVisibility) => Promise<{ success: boolean; error?: string }>;
  claimRankedDivisionReward: (division: RankedDivisionName) => Promise<{ success: boolean; rewardTitleName?: string; error?: string }>;
  tournaments: CommunityTournament[];
  refreshTournaments: () => Promise<void>;
  createTournament: (params: { title: string; subtitle?: string; mode: CompetitiveRivalMode }) => Promise<{ success: boolean; error?: string }>;
  joinTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  spectatorMatches: SpectatorLiveMatchSummary[];
  followedCompetitorIds: string[];
  refreshSpectatorMatches: () => Promise<void>;
  sendSpectatorCheer: (params: { matchId: string; targetUserId: string; emoji: string }) => Promise<{ success: boolean; error?: string }>;
  toggleFollowCompetitor: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  giveEndorsement: (params: { targetUserId: string; category: EndorsementCategory; note?: string }) => Promise<{ success: boolean; summary?: PlayerEndorsementSummary; error?: string }>;
  reportEndorsementAbuse: (params: { targetUserId: string; endorsementId?: string; reason: string }) => Promise<{ success: boolean; error?: string }>;
  // Polish 2.0 Phase 4: Advanced Leaderboards
  queryAdvancedLeaderboard: (
    scope: LeaderboardScope,
    page?: number,
    limit?: number
  ) => Promise<{
    ok: boolean;
    data?: AdvancedLeaderboardResponse;
    isLiveBackend: boolean;
    error?: string;
  }>;
  // Phase 1: Real-Life Skill Tree (Strictly Independent from Player XP)
  skillTreeState: PlayerSkillTreeState;
  skillTreeLoading: boolean;
  lastSkillAwardBanner: SkillActivityAwardResult | null;
  dismissSkillAwardBanner: () => void;
  refreshSkillTreeState: () => Promise<void>;
  reconcileSkillTree: () => Promise<{ ok: boolean; reconciledCount?: number }>;
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
  // Phase 2 (Competitive Arena): Independent Rivals Platform
  rivalsState: RivalsStateResponse | null;
  rivalsLoading: boolean;
  refreshRivalsState: () => Promise<void>;
  joinRivalsQueue: (
    mode: CompetitiveRivalMode
  ) => Promise<{ success: boolean; matched?: boolean; match?: CompetitiveRivalMatch | null; error?: string }>;
  cancelRivalsQueue: () => Promise<{ success: boolean; error?: string }>;
  sendDirectRivalChallenge: (params: {
    opponentId: string;
    opponentName: string;
    mode?: CompetitiveRivalMode;
    challengeType?: RivalChallengeType;
    visibility?: CompetitiveMatchVisibility;
    rules?: Partial<CompetitiveMatchRules>;
  }) => Promise<{ success: boolean; error?: string }>;
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
  rematchRival: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  disputeRivalMatch: (matchId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  updateRivalsPrivacy: (allowNonFriendChallenges: boolean) => Promise<{ success: boolean; error?: string }>;
  fetchRivalsLeaderboard: (params?: {
    scope?: 'global' | 'friends' | 'seasonal' | 'weekly';
    mode?: CompetitiveRivalMode | 'all';
    division?: string;
  }) => Promise<{ ok: boolean; leaderboard?: CompetitiveLeaderboardEntry[]; error?: string }>;
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
    pbOnly?: boolean;
    search?: string;
    sort?: 'newest' | 'oldest' | 'rarity' | 'value';
    page?: number;
  }) => Promise<void>;
  reconcileMuseum: () => Promise<{ ok: boolean; reconciledCount?: number }>;
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
  markNotificationRead: (notificationId?: string, category?: NotificationCategory | 'all') => Promise<void>;
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
  // Phase 7: Discord-Style Player Presence & Granular Privacy
  myManualPresence: 'online' | 'away' | 'dnd';
  myEffectivePresence: PresenceStatus;
  autoAwayEnabled: boolean;
  autoAwayMinutes: number;
  presenceMap: Record<string, { status: PresenceStatus; lastActiveAt?: string | null; hidden?: boolean }>;
  setManualPresenceStatus: (status: 'online' | 'away' | 'dnd') => Promise<void>;
  updatePresencePreferences: (prefs: { autoAwayEnabled?: boolean; autoAwayMinutes?: number }) => Promise<void>;
  getPlayerPresence: (userId: string) => { status: PresenceStatus; lastActiveAt?: string | null; hidden?: boolean };
  queryPresencesBatch: (userIds: string[]) => Promise<void>;
  previewPublicProfileAs: (mode: 'public' | 'friend' | 'restricted') => Promise<any>;
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
  '/seasons': 'seasons',
  '/notifications': 'notifications',
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
  const [socialSubTab, setSocialSubTabState] = useState<
    'leaderboard' | 'friends' | 'chat' | 'activity-feed' | 'workout-parties' | 'friendships'
  >('leaderboard');
  const [characterSubTab, setCharacterSubTabState] = useState<
    'overview' | 'customization' | 'cards' | 'trophies'
  >('overview');
  const [storeSubTab, setStoreSubTabState] = useState<'bazaar' | 'relics' | 'marketplace'>('bazaar');
  const [guildsSubTab, setGuildsSubTabState] = useState<'directory' | 'territory-wars'>('directory');
  const [eventsSubTab, setEventsSubTabState] = useState<'events' | 'decisions'>('events');
  const [progressionSubTab, setProgressionSubTabState] = useState<
    'quests' | 'daily-report' | 'achievements' | 'hall-of-legends' | 'skill-tree' | 'seasons' | 'daily-calendar'
  >('quests');
  const [identityState, setIdentityState] = useState<PlayerIdentityState | null>(null);
  const [identityLoading, setIdentityLoading] = useState<boolean>(false);
  const [notificationPreferences, setNotificationPreferences] = useState<ServerNotificationPreferences>(
    DEFAULT_SERVER_NOTIFICATION_PREFS
  );
  const [notificationCategoryCounts, setNotificationCategoryCounts] = useState<
    Record<string, { total: number; unread: number }>
  >({});
  const [seasonState, setSeasonState] = useState<PlayerSeasonStateResponse | null>(null);
  const [seasonLoading, setSeasonLoading] = useState<boolean>(false);
  // Expansion 3.0 & AAA-15 States
  const [feedData, setFeedData] = useState<FeedListResponse | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedLoading, setFeedLoading] = useState<boolean>(false);
  const [workoutParties, setWorkoutParties] = useState<WorkoutParty[]>([]);
  const [workoutPartyHistory, setWorkoutPartyHistory] = useState<WorkoutPartyHistoryEntry[]>([]);
  const [partiesLoading, setPartiesLoading] = useState<boolean>(false);
  const [cosmeticsState, setCosmeticsState] = useState<PlayerCosmeticState | null>(null);
  const [communityDecisionPolls, setCommunityDecisionPolls] = useState<CommunityPoll[]>([]);
  const [communityDecisionArchive, setCommunityDecisionArchive] = useState<CommunityPoll[]>([]);
  const [trophyShowcase, setTrophyShowcase] = useState<TrophyShowcaseState | null>(null);
  const [hiddenAchievements, setHiddenAchievements] = useState<HiddenAchievementClientView[]>([]);
  const [territoryWarsState, setTerritoryWarsState] = useState<TerritoryWarsStateResponse | null>(null);
  const [walletState, setWalletState] = useState<PlayerWalletState | null>(null);
  const [cardsState, setCardsState] = useState<CardsStateResponse | null>(null);
  const [marketplaceState, setMarketplaceState] = useState<MarketplaceStateResponse | null>(null);
  const [collectionState, setCollectionState] = useState<CollectionCompletionResponse | null>(null);
  const [friendshipLevels, setFriendshipLevels] = useState<FriendshipProgressRecord[]>([]);
  const [prestigeState, setPrestigeState] = useState<PlayerPrestigeState | null>(null);
  const [dailyCalendarState, setDailyCalendarState] = useState<DailyCalendarStateResponse | null>(null);
  const [seasonalRecap, setSeasonalRecap] = useState<SeasonalStatsRecap | null>(null);
  const [tournaments, setTournaments] = useState<CommunityTournament[]>([]);
  const [spectatorMatches, setSpectatorMatches] = useState<SpectatorLiveMatchSummary[]>([]);
  const [followedCompetitorIds, setFollowedCompetitorIds] = useState<string[]>([]);
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

  // Phase 7: Presence State (WS + Heartbeat + Auto-Away)
  const [myManualPresence, setMyManualPresence] = useState<'online' | 'away' | 'dnd'>('online');
  const [myEffectivePresence, setMyEffectivePresence] = useState<PresenceStatus>('online');
  const [autoAwayEnabled, setAutoAwayEnabled] = useState<boolean>(true);
  const [autoAwayMinutes, setAutoAwayMinutes] = useState<number>(5);
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { status: PresenceStatus; lastActiveAt?: string | null; hidden?: boolean }>
  >({});
  const presenceWsRef = useRef<WebSocket | null>(null);
  const presenceSessionIdRef = useRef<string>(createIdempotencyKey());
  const myManualPresenceRef = useRef<'online' | 'away' | 'dnd'>('online');
  const autoAwayEnabledRef = useRef<boolean>(true);
  const autoAwayMinutesRef = useRef<number>(5);
  const isAutoAwayRef = useRef<boolean>(false);
  const lastInteractionAtRef = useRef<number>(Date.now());

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

  const setSocialSubTab = (
    subTab: 'leaderboard' | 'friends' | 'chat' | 'activity-feed' | 'workout-parties' | 'friendships'
  ) => {
    sound.playClick();
    setSocialSubTabState(subTab);
  };

  const setCharacterSubTab = (subTab: 'overview' | 'customization' | 'cards' | 'trophies') => {
    sound.playClick();
    setCharacterSubTabState(subTab);
  };

  const setStoreSubTab = (subTab: 'bazaar' | 'relics' | 'marketplace') => {
    sound.playClick();
    setStoreSubTabState(subTab);
  };

  const setGuildsSubTab = (subTab: 'directory' | 'territory-wars') => {
    sound.playClick();
    setGuildsSubTabState(subTab);
  };

  const setEventsSubTab = (subTab: 'events' | 'decisions') => {
    sound.playClick();
    setEventsSubTabState(subTab);
  };

  const setProgressionSubTab = (
    subTab:
      | 'quests'
      | 'daily-report'
      | 'achievements'
      | 'hall-of-legends'
      | 'skill-tree'
      | 'seasons'
      | 'daily-calendar'
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

    // Unified hub routing while keeping Rivals Arena as an independent top-level tab
    if (
      tab === 'leaderboard' ||
      tab === 'friends' ||
      tab === 'chat' ||
      tab === 'activity-feed' ||
      tab === 'workout-parties' ||
      tab === 'friendships'
    ) {
      setSocialSubTabState(tab);
      setActiveTabState('social');
    } else if (tab === 'customization' || tab === 'cards' || tab === 'trophies') {
      setCharacterSubTabState(tab);
      setActiveTabState('character');
      updateReclaimHonorObjective('view_attributes');
    } else if (tab === 'marketplace') {
      setStoreSubTabState('marketplace');
      setActiveTabState('store');
    } else if (tab === 'territory-wars') {
      setGuildsSubTabState('territory-wars');
      setActiveTabState('guilds');
    } else if (tab === 'decisions') {
      setEventsSubTabState('decisions');
      setActiveTabState('events');
    } else if (tab === 'rivals') {
      setActiveTabState('rivals');
    } else if (tab === 'social') {
      setActiveTabState('social');
    } else if (
      tab === 'quests' ||
      tab === 'daily-report' ||
      tab === 'achievements' ||
      tab === 'hall-of-legends' ||
      tab === 'skill-tree' ||
      tab === 'seasons' ||
      tab === 'daily-calendar'
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
    setPresenceMap({});
    setMyManualPresence('online');
    setMyEffectivePresence('offline');
    if (presenceWsRef.current) {
      try {
        presenceWsRef.current.close();
      } catch {
        // ignore
      }
      presenceWsRef.current = null;
    }
    setMentorGreeting(null);
    setRecentGlobalUnlockCelebration(null);
    setFeedData(null);
    setWorkoutParties([]);
    setWorkoutPartyHistory([]);
    setCosmeticsState(null);
    setCommunityDecisionPolls([]);
    setCommunityDecisionArchive([]);
    setTrophyShowcase(null);
    setHiddenAchievements([]);
    setTerritoryWarsState(null);
    setWalletState(null);
    setCardsState(null);
    setMarketplaceState(null);
    setCollectionState(null);
    setFriendshipLevels([]);
    setPrestigeState(null);
    setDailyCalendarState(null);
    setSeasonalRecap(null);
    setTournaments([]);
    setSpectatorMatches([]);
    setFollowedCompetitorIds([]);
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
            presenceStatus: normalizePresenceStatus(clientPrefs?.manualPresenceStatus || 'online'),
            autoAwayEnabled: typeof clientPrefs?.autoAwayEnabled === 'boolean' ? clientPrefs.autoAwayEnabled : true,
            autoAwayMinutes: typeof clientPrefs?.autoAwayMinutes === 'number' ? clientPrefs.autoAwayMinutes : 5,
            privacySettings: normalizeGranularPrivacySettings(
              clientPrefs?.privacySettings || p?.privacy_settings,
              {
                profileVisibility: (p?.profile_visibility as ProfileVisibility) || existing?.profileVisibility || 'public',
                showAchievements: typeof p?.show_achievements === 'boolean' ? p.show_achievements : existing?.showAchievements ?? true,
                showEquipment: typeof p?.show_equipment === 'boolean' ? p.show_equipment : existing?.showEquipment ?? true,
                showStats: typeof p?.show_stats === 'boolean' ? p.show_stats : existing?.showStats ?? true,
                showGuild: typeof p?.show_guild === 'boolean' ? p.show_guild : existing?.showGuild ?? true,
              }
            ),
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
          }

          // Hydrate Dynamic Quests, Daily Report & Hall of Legends from SQL tables if migrated
          const todayPeriod = getPeriodKeyForFrequency('daily', userTimezone);
          const [dynRes, repRes, hallRes] = await Promise.all([
            fetchPlayerDynamicQuestsServer(sbUser.id, todayPeriod),
            fetchDailyReportServer(sbUser.id, todayPeriod),
            fetchHallOfLegendsServer(),
          ]);
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
        // Hydrate Real-Life Skill Tree + Phases 2-6 Ecosystem + Polish 2.0 Identity, Notifications, Seasons
        const srvProf = boot?.ok && boot.data?.profile ? boot.data.profile : prof;
        const gsStats = cloudRes.gameState?.stats;
        const initWorkoutsCount = Array.isArray(cloudRes.workoutSessions)
          ? cloudRes.workoutSessions.length
          : 0;
        const initActiveMins = Array.isArray(cloudRes.workoutSessions)
          ? cloudRes.workoutSessions.reduce((acc, w) => acc + (Number(w.durationMinutes) || 0), 0)
          : 0;
        const initAchievementsUnlocked = Array.isArray(boot?.ok ? boot.data?.achievements : undefined)
          ? boot!.data!.achievements.filter((a: any) => Boolean(a.unlocked)).length
          : Array.isArray(cloudRes.gameState?.achievements)
          ? cloudRes.gameState!.achievements.filter(a => a.unlocked).length
          : 0;

        const [
          skillRes,
          bossRes,
          rivalRes,
          mentorRes,
          eventRes,
          museumRes,
          identityRes,
          notifStateRes,
          seasonRes,
        ] = await Promise.all([
          fetchSkillTreeStateServer(sbUser.id, userTimezone),
          fetchWeeklyBossStateServer(sbUser.id, 1, 10, userTimezone),
          fetchRivalsArenaStateServer({
            userId: sbUser.id,
            username: localUser.username,
            characterClass: localUser.characterClass,
            level: Number(srvProf?.level ?? gsStats?.level ?? 1),
          }),
          fetchAiMentorStateServer(sbUser.id),
          fetchCommunityEventsStateServer(sbUser.id),
          fetchMuseumRecordsServer({ callerUserId: sbUser.id, page: 1, limit: 12 }),
          syncVerifiedIdentitySnapshotServer({
            userId: sbUser.id,
            snapshot: {
              level: Number(srvProf?.level ?? gsStats?.level ?? 1),
              currentStreak: Number(srvProf?.current_streak ?? gsStats?.currentStreak ?? 0),
              longestStreak: Number(srvProf?.current_streak ?? gsStats?.currentStreak ?? 0),
              totalWorkoutsCompleted: Math.max(
                Number(srvProf?.total_workouts_completed ?? gsStats?.totalWorkoutsCompleted ?? 0),
                initWorkoutsCount
              ),
              totalVerifiedReps: Number(srvProf?.total_verified_reps ?? gsStats?.totalVerifiedReps ?? 0),
              totalActiveMinutes: initActiveMins,
              totalAchievementsUnlocked: initAchievementsUnlocked,
              totalBossesDefeated: Number(srvProf?.total_bosses_defeated ?? gsStats?.totalBossesDefeated ?? 0),
              joinedAt: sbUser.created_at || null,
            },
          }),
          fetchNotificationsStateServer(sbUser.id, 'all'),
          fetchSeasonStateServer(sbUser.id, 1, 10),
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
        if (identityRes.ok && identityRes.state) {
          setIdentityState(identityRes.state);
        }
        if (notifStateRes.ok && notifStateRes.data) {
          const srvList = notifStateRes.data.notifications || [];
          setNotifications(prev => {
            const seenKeys = new Set<string>(
              srvList.map(n => n.eventKey || n.id)
            );
            const merged = [...srvList];
            for (const existing of prev) {
              const k = existing.eventKey || existing.id;
              if (!seenKeys.has(k) && !existing.dismissedAt) {
                merged.push(existing);
              }
            }
            return merged
              .filter(n => !n.dismissedAt)
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
          });
          setNotificationCategoryCounts(notifStateRes.data.categoryCounts || {});
          if (notifStateRes.data.preferences) {
            setNotificationPreferences(notifStateRes.data.preferences);
          }
        }
        if (seasonRes.ok && seasonRes.data) {
          setSeasonState(seasonRes.data);
        }
        // Hydrate Expansion 3.0 + AAA-15 server states in background without blocking initial login
        const initialGold = Number(srvProf?.gold_balance ?? gsStats?.gold ?? 0);
        const unlockedWeaponIds = (cloudRes.gameState?.weapons || INITIAL_WEAPONS)
          .filter((w: any) => w.unlocked)
          .map((w: any) => w.id);
        void Promise.all([
          syncInitialWalletGoldServer(sbUser.id, initialGold).then(r => {
            if (r.ok && r.wallet) {
              setWalletState(r.wallet);
              setStats(prev => ({ ...prev, gold: r.wallet!.goldBalance }));
            }
          }),
          fetchCosmeticsStateServer(sbUser.id).then(r => {
            if (r.ok && r.state) setCosmeticsState(r.state);
          }),
          syncVerifiedCosmeticsServer(sbUser.id).then(r => {
            if (r.ok && r.state) setCosmeticsState(r.state);
          }),
          fetchCardsStateServer(sbUser.id).then(r => {
            if (r.ok && r.state) setCardsState(r.state);
            if (r.ok && r.wallet) setWalletState(r.wallet);
          }),
          fetchMarketplaceStateServer(sbUser.id).then(r => {
            if (r.ok && r.state) setMarketplaceState(r.state);
          }),
          syncCollectionRelicsServer(sbUser.id, unlockedWeaponIds).then(r => {
            if (r.ok && r.state) setCollectionState(r.state);
          }),
          fetchTrophiesAndHiddenServer(sbUser.id).then(r => {
            if (r.ok && r.state) setTrophyShowcase(r.state);
            if (r.ok && r.hiddenAchievements) setHiddenAchievements(r.hiddenAchievements);
          }),
          fetchFriendshipsStateServer(sbUser.id).then(r => {
            if (r.ok && r.friendships) setFriendshipLevels(r.friendships);
          }),
          fetchPrestigeStateServer(sbUser.id).then(r => {
            if (r.ok && r.state) setPrestigeState(r.state);
          }),
          fetchDailyCalendarStateServer(sbUser.id, userTimezone).then(r => {
            if (r.ok && r.state) setDailyCalendarState(r.state);
          }),
          fetchSeasonalRecapServer(sbUser.id).then(r => {
            if (r.ok && r.recap) setSeasonalRecap(r.recap);
          }),
          fetchFeedPostsServer({ userId: sbUser.id, filter: 'all', page: 1 }).then(r => {
            if (r.ok && r.data) setFeedData(r.data);
          }),
          fetchWorkoutPartiesStateServer(sbUser.id).then(r => {
            if (r.ok && r.data) {
              setWorkoutParties([...(r.data.parties || []), ...(r.data.invitedParties || [])]);
              setWorkoutPartyHistory(r.data.history || []);
            }
          }),
          fetchCommunityDecisionsServer(sbUser.id).then(r => {
            if (r.ok) {
              setCommunityDecisionPolls(r.activePolls || []);
              setCommunityDecisionArchive(r.archivePolls || []);
            }
          }),
          fetchTerritoryWarsStateServer(sbUser.id).then(r => {
            if (r.ok && r.data) setTerritoryWarsState(r.data);
          }),
          fetchTournamentsStateServer(sbUser.id).then(r => {
            if (r.ok && r.tournaments) setTournaments(r.tournaments);
          }),
          fetchSpectatorMatchesServer(sbUser.id).then(r => {
            if (r.ok && r.matches) setSpectatorMatches(r.matches);
            if (r.ok && r.followedCompetitorIds) setFollowedCompetitorIds(r.followedCompetitorIds);
          }),
        ]);
        const hydratedWorkouts = Array.isArray(cloudRes.workoutSessions) ? cloudRes.workoutSessions : [];
        const hydratedHabits = Array.isArray(cloudRes.gameState?.habits) ? cloudRes.gameState!.habits : [];
        const hydratedStreak = Number(srvProf?.current_streak ?? gsStats?.currentStreak ?? 0);
        // Backfill & reconcile historical verified records idempotently for Skill Tree & Museum
        if (hydratedWorkouts.length > 0 || hydratedHabits.length > 0) {
          void reconcileSkillTreeServer({
            userId: sbUser.id,
            timezone: userTimezone,
            workouts: hydratedWorkouts.map(w => ({
              id: w.id,
              exerciseName: w.exerciseName,
              exerciseType: w.exerciseType,
              reps: w.repetitions,
              durationMinutes: w.durationMinutes,
              date: w.timestamp,
            })),
            habits: hydratedHabits.map(h => ({
              id: h.id,
              name: h.name,
              category: h.category,
              completedCount: h.history?.length || (h.completedToday ? 1 : 0),
              lastCompleted: h.lastCompletedDate || null,
            })),
          }).then(rec => {
            if (rec.ok && rec.state) {
              setSkillTreeState(normalizeSkillTreeState(rec.state));
            }
          });
          if (hydratedWorkouts.length > 0 || hydratedStreak > 0) {
            void reconcileMuseumServer({
              userId: sbUser.id,
              workouts: hydratedWorkouts.map(w => ({
                id: w.id,
                exerciseName: w.exerciseName,
                exerciseType: w.exerciseType,
                reps: w.repetitions,
                durationMinutes: w.durationMinutes,
                date: w.timestamp,
              })),
              currentStreak: hydratedStreak,
            }).then(rec => {
              if (rec.ok && (rec.reconciledCount || 0) > 0) {
                void fetchMuseumRecordsServer({ callerUserId: sbUser.id, page: 1, limit: 12 }).then(m => {
                  if (m.ok && m.data) setMuseumData(m.data);
                });
              }
            });
          }
        }
        const effectiveManual =
          localUser.presenceStatus === 'away' || localUser.presenceStatus === 'dnd'
            ? localUser.presenceStatus
            : 'online';
        myManualPresenceRef.current = effectiveManual;
        autoAwayEnabledRef.current = localUser.autoAwayEnabled ?? true;
        autoAwayMinutesRef.current = localUser.autoAwayMinutes ?? 5;
        setMyManualPresence(effectiveManual);
        setMyEffectivePresence(effectiveManual);
        setAutoAwayEnabled(localUser.autoAwayEnabled ?? true);
        setAutoAwayMinutes(localUser.autoAwayMinutes ?? 5);
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
        if (routeTab === 'leaderboard' || routeTab === 'friends' || routeTab === 'chat') {
          setSocialSubTabState(routeTab);
          setActiveTabState('social');
        } else if (routeTab === 'rivals') {
          setActiveTabState('rivals');
        } else if (
          routeTab === 'quests' ||
          routeTab === 'daily-report' ||
          routeTab === 'achievements' ||
          routeTab === 'hall-of-legends' ||
          routeTab === 'skill-tree' ||
          routeTab === 'seasons'
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
    void syncVerifiedIdentitySnapshot();
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
    const [res, overlay] = await Promise.all([
      getPublicPlayerProfileServer(userId),
      fetchServerFilteredPublicProfile({ targetUserId: userId, viewerId: user?.id }),
    ]);
    if (!res.ok || !res.data) {
      if (overlay.ok && overlay.profile) {
        return {
          success: true,
          data: {
            accessible: Boolean(overlay.profile.accessible),
            restrictedReason: overlay.profile.restrictedReason,
            blocked: Boolean(overlay.profile.blocked),
            blockedByMe: Boolean(overlay.profile.blockedByMe),
            player: overlay.profile,
          },
        };
      }
      return { success: false, error: res.error || 'Could not load player profile.' };
    }
    if (overlay.ok && overlay.profile && res.data.player) {
      const ov = overlay.profile;
      const basePlayer = res.data.player;
      return {
        success: true,
        data: {
          ...res.data,
          accessible: ov.accessible ?? res.data.accessible,
          restrictedReason: ov.restrictedReason ?? res.data.restrictedReason,
          player: {
            ...basePlayer,
            presenceStatus: ov.presenceStatus ?? basePlayer.presenceStatus,
            lastActiveAt: ov.lastActiveAt ?? basePlayer.lastActiveAt,
            hiddenFields: ov.hiddenFields ?? basePlayer.hiddenFields,
            achievements: ov.achievements === null ? [] : basePlayer.achievements,
            workoutHistory: ov.recentWorkouts === null ? [] : basePlayer.workoutHistory,
            personalRecords: ov.personalRecords === null ? [] : basePlayer.personalRecords,
            bio: ov.bio === null ? '' : basePlayer.bio,
          },
        },
      };
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
    if (!res.ok || !res.data) return [];
    if (!user?.id) return res.data;
    const filtered = await enforceDirectoryPrivacyServer(user.id, res.data);
    void queryPresencesBatch(filtered.map(c => c.id));
    return filtered;
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
    const removed = friends.find(f => f.friendshipId === friendshipId);
    await removeFriendServer(friendshipId);
    if (removed?.champion?.id) {
      await resetFriendshipOnRemovalServer(user.id, removed.champion.id);
      setFriendshipLevels(prev => prev.filter(fr => fr.friendId !== removed.champion.id));
    }
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

  const markNotificationRead = async (
    notificationId?: string,
    category: NotificationCategory | 'all' = 'all'
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    const nowIso = new Date().toISOString();
    setNotifications(prev =>
      prev.map(n => {
        if (notificationId) {
          return n.id === notificationId ? { ...n, readAt: n.readAt || nowIso } : n;
        }
        if (category === 'all' || n.category === category) {
          return { ...n, readAt: n.readAt || nowIso };
        }
        return n;
      })
    );
    if (uid) {
      if (notificationId) {
        await markNotificationReadApiServer(uid, notificationId);
      } else {
        await markAllNotificationsReadApiServer(uid, category);
      }
    }
    if (unifiedBackendReady) {
      await markNotificationsReadServer(notificationId ?? null);
    }
    if (uid) {
      void refreshNotificationsState();
    }
  };

  const dismissNotification = async (notificationId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    const nowIso = new Date().toISOString();
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId).map(n => (n.id === notificationId ? { ...n, dismissedAt: nowIso } : n))
    );
    if (uid) {
      await dismissNotificationApiServer(uid, notificationId);
      void refreshNotificationsState();
    }
  };

  const navigateFromNotification = (notif: AppNotification) => {
    if (!notif.readAt) {
      void markNotificationRead(notif.id);
    }
    if (notif.actionSubTab) {
      setActiveTab(notif.actionSubTab);
      return;
    }
    if (notif.actionTab) {
      setActiveTab(notif.actionTab);
      return;
    }
    switch (notif.type) {
      case 'friend_request':
      case 'friend_accepted':
      case 'rival_invite':
      case 'rival_accepted':
        setActiveTab(notif.type.startsWith('rival') ? 'rivals' : 'friends');
        break;
      case 'guild_invite':
        setActiveTab('guilds');
        break;
      case 'weekly_boss_defeated':
      case 'boss_update':
        setActiveTab('boss-battles');
        break;
      case 'community_milestone':
        setActiveTab('events');
        break;
      case 'season_milestone':
        setActiveTab('seasons');
        break;
      case 'skill_level_up':
        setActiveTab('skill-tree');
        break;
      case 'title_unlocked':
      case 'badge_unlocked':
        setActiveTab('character');
        break;
      case 'museum_personal_best':
        setActiveTab('museum');
        break;
      default:
        setActiveTab('notifications');
        break;
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.readAt && !n.dismissedAt).length;

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
    const prevUid = activeSessionUserIdRef.current || user?.id;
    if (prevUid) {
      sendPresenceOfflineBeacon(prevUid);
      void setPresenceStatusServer({ userId: prevUid, disconnected: true });
    }
    if (presenceWsRef.current) {
      try {
        presenceWsRef.current.close();
      } catch {
        // ignore
      }
      presenceWsRef.current = null;
    }
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
    let mergedUpdates: Partial<UserAccount> = heroLocked
      ? { ...updates, characterClass: user.characterClass }
      : { ...updates };

    if (mergedUpdates.privacySettings) {
      const normalizedPrivacy = normalizeGranularPrivacySettings(mergedUpdates.privacySettings, user);
      const legacyDerived = deriveLegacyVisibilityFromGranular(normalizedPrivacy);
      mergedUpdates = {
        ...mergedUpdates,
        privacySettings: normalizedPrivacy,
        ...legacyDerived,
      };
      void syncMuseumPrivacyServer(
        user.id,
        legacyDerived.profileVisibility === 'public' && normalizedPrivacy.personalRecords === 'everyone'
      );
    }

    const updated: UserAccount = { ...user, ...mergedUpdates };
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
      if (unifiedBackendReady) {
        void saveClientPreferencesServer({
          soundEnabled: stats.soundEnabled,
          ageYears: updated.ageYears ?? null,
          ageGroup: updated.ageGroup ?? null,
          biologicalSex: updated.biologicalSex ?? null,
          privacySettings: updated.privacySettings,
          manualPresenceStatus: myManualPresenceRef.current,
          autoAwayEnabled: autoAwayEnabledRef.current,
          autoAwayMinutes: autoAwayMinutesRef.current,
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
      hydrationGoalsTotal: Math.max(
        serverLegendMetrics?.hydration_goals_total ?? 0,
        waterGlasses >= 8 ? 1 : 0
      ),
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
      // Phase 4 Rule: Global Exclusive Achievements grant Prestige + Forge XP + Gold ONLY (zero Leaderboard XP)
      setStats(prev => ({
        ...prev,
        forgeXP: prev.forgeXP + entry.rewardForgeXp,
        gold: prev.gold + entry.rewardGold,
      }));
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

  // Phase 7: Discord-Style Player Presence Engine (WebSocket + Heartbeat + Auto-Away + Privacy Sync)
  const sendPresenceWsPayload = (payload: Record<string, any>) => {
    const ws = presenceWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.id || typeof window === 'undefined') {
      return;
    }
    const uid = user.id;
    let disposed = false;
    let reconnectTimer: any = null;
    let heartbeatTimer: any = null;
    let idleCheckTimer: any = null;
    let reconnectAttempts = 0;

    const connectPresenceSocket = () => {
      if (disposed) return;
      try {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/presence`);
        presenceWsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts = 0;
          ws.send(
            JSON.stringify({
              type: 'auth',
              userId: uid,
              sessionId: presenceSessionIdRef.current,
              manualStatus: myManualPresenceRef.current,
              autoAwayEnabled: autoAwayEnabledRef.current,
              autoAwayMinutes: autoAwayMinutesRef.current,
              isAutoAway: isAutoAwayRef.current,
            })
          );
        };

        ws.onmessage = evt => {
          try {
            const msg = JSON.parse(String(evt.data || '{}'));
            if (msg.type === 'presence:snapshot') {
              if (msg.self?.effectiveStatus) {
                setMyEffectivePresence(normalizePresenceStatus(msg.self.effectiveStatus));
              }
              if (msg.peers && typeof msg.peers === 'object') {
                setPresenceMap(prev => ({ ...prev, ...msg.peers }));
              }
            } else if (msg.type === 'presence:self' && msg.self) {
              setMyEffectivePresence(normalizePresenceStatus(msg.self.effectiveStatus));
              if (msg.self.manualStatus) {
                const normMan = normalizePresenceStatus(msg.self.manualStatus);
                if (normMan === 'online' || normMan === 'away' || normMan === 'dnd') {
                  myManualPresenceRef.current = normMan;
                  setMyManualPresence(normMan);
                }
              }
            } else if (msg.type === 'presence:update' && msg.userId) {
              setPresenceMap(prev => ({
                ...prev,
                [msg.userId]: {
                  status: normalizePresenceStatus(msg.status),
                  lastActiveAt: msg.lastActiveAt || null,
                  hidden: Boolean(msg.hidden),
                },
              }));
            } else if (msg.type === 'presence:batch' && msg.peers) {
              setPresenceMap(prev => ({ ...prev, ...msg.peers }));
            } else if (msg.type === 'activity_feed:new_post' && msg.payload) {
              setFeedData(prev => {
                if (!prev) return prev;
                const incoming = msg.payload as FeedPost;
                if (prev.posts.some(p => p.id === incoming.id)) return prev;
                return { ...prev, posts: [incoming, ...prev.posts], totalPosts: prev.totalPosts + 1 };
              });
            } else if (msg.type === 'party:update' && msg.payload) {
              const updatedParty = msg.payload as WorkoutParty;
              setWorkoutParties(prev => {
                const exists = prev.some(p => p.id === updatedParty.id);
                if (updatedParty.status !== 'active') {
                  return prev.filter(p => p.id !== updatedParty.id);
                }
                return exists
                  ? prev.map(p => (p.id === updatedParty.id ? updatedParty : p))
                  : [updatedParty, ...prev];
              });
            } else if (msg.type === 'community_decision:update' && msg.payload) {
              const updatedPoll = msg.payload as CommunityPoll;
              setCommunityDecisionPolls(prev =>
                prev.map(p => (p.id === updatedPoll.id ? updatedPoll : p))
              );
            } else if (msg.type === 'territory_war:update') {
              void refreshTerritoryWars();
            } else if (msg.type === 'community_moment:update') {
              void refreshCommunityEventState();
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onclose = () => {
          if (disposed) return;
          const backoffMs = Math.min(30000, 1500 * Math.pow(2, reconnectAttempts));
          reconnectAttempts = Math.min(reconnectAttempts + 1, 5);
          reconnectTimer = setTimeout(connectPresenceSocket, backoffMs);
        };

        ws.onerror = () => {
          // onclose handles reconnect
        };
      } catch {
        // Fallback to HTTP heartbeat below if WS fails
      }
    };

    connectPresenceSocket();

    // Initial HTTP presence registration for immediate availability
    void setPresenceStatusServer({
      userId: uid,
      manualStatus: myManualPresenceRef.current,
      isAutoAway: isAutoAwayRef.current,
      autoAwayEnabled: autoAwayEnabledRef.current,
      autoAwayMinutes: autoAwayMinutesRef.current,
    }).then(res => {
      if (res.ok && res.self) {
        setMyEffectivePresence(normalizePresenceStatus(res.self.effectiveStatus));
      }
    });

    const handleUserActivity = () => {
      lastInteractionAtRef.current = Date.now();
      if (isAutoAwayRef.current) {
        isAutoAwayRef.current = false;
        if (!sendPresenceWsPayload({ type: 'heartbeat', isAutoAway: false })) {
          void sendPresenceHeartbeatServer({ userId: uid, isAutoAway: false });
        }
        if (myManualPresenceRef.current === 'online') {
          setMyEffectivePresence('online');
        }
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });

    const handleUnload = () => {
      sendPresenceOfflineBeacon(uid);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    heartbeatTimer = setInterval(() => {
      const sent = sendPresenceWsPayload({
        type: 'heartbeat',
        isAutoAway: isAutoAwayRef.current,
      });
      if (!sent) {
        void sendPresenceHeartbeatServer({
          userId: uid,
          isAutoAway: isAutoAwayRef.current,
        });
      }
    }, 25000);

    idleCheckTimer = setInterval(() => {
      if (!autoAwayEnabledRef.current || myManualPresenceRef.current !== 'online') return;
      const idleMs = Date.now() - lastInteractionAtRef.current;
      const thresholdMs = Math.max(1, autoAwayMinutesRef.current) * 60_000;
      if (idleMs >= thresholdMs && !isAutoAwayRef.current) {
        isAutoAwayRef.current = true;
        setMyEffectivePresence('away');
        if (!sendPresenceWsPayload({ type: 'presence:set', isAutoAway: true })) {
          void setPresenceStatusServer({ userId: uid, isAutoAway: true });
        }
      }
    }, 15000);

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (idleCheckTimer) clearInterval(idleCheckTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      if (presenceWsRef.current) {
        try {
          presenceWsRef.current.close();
        } catch {
          // ignore
        }
        presenceWsRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  // Sync user's latest profile snapshot + granular privacy rules to server privacy engine
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const timer = setTimeout(() => {
      const acceptedFriendIds = friends.filter(f => f.status === 'accepted').map(f => f.champion.id);
      const blockedUserIds = blockedUsers.map(b => b.id);
      const todayKey = new Date().toISOString().split('T')[0];
      const workoutsToday = fitnessSessions.filter(w => String(w.timestamp || '').startsWith(todayKey));
      const activeMinutesTotal = fitnessSessions.reduce((s, w) => s + (Number(w.durationMinutes) || 0), 0);
      const activeMinutesToday = workoutsToday.reduce((s, w) => s + (Number(w.durationMinutes) || 0), 0);
      const habitsCompletedToday = habits.filter(h => isHabitClaimedForCurrentPeriod(h)).length;

      void syncPrivacyProfileServer({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar,
        characterClass: user.characterClass,
        level: stats.level,
        aetherRank: stats.aetherRank,
        playerXP: stats.playerXP,
        playerXPNextLevel: stats.playerXPNextLevel,
        aetherPoints: stats.aetherPoints,
        currentStreak: stats.currentStreak,
        longestStreak: Math.max(stats.currentStreak, identityState?.lifetimeStats?.longestStreak || 0),
        bio: user.bio || '',
        guildId: null,
        guildName: null,
        guildTag: null,
        legendTitle: user.legendTitle || null,
        legendTitleStyle: user.legendTitleStyle || null,
        legendEmblem: user.legendEmblem || null,
        achievementsUnlocked: achievements.filter(a => a.unlocked).length,
        totalWorkouts: Math.max(stats.totalWorkoutsCompleted, fitnessSessions.length),
        totalVerifiedReps: stats.totalVerifiedReps,
        totalActiveMinutes: activeMinutesTotal,
        todayStats: {
          habitsCompleted: habitsCompletedToday,
          activeMinutes: activeMinutesToday,
          waterGlasses,
        },
        recentWorkouts: fitnessSessions.slice(0, 8).map(w => ({
          id: w.id,
          exerciseName: w.exerciseName,
          reps: Number(w.repetitions || 0),
          xpEarned: w.playerXpEarned,
          date: w.timestamp,
        })),
        personalRecords: (museumData?.personalBests || []).slice(0, 8).map(p => ({
          title: p.title,
          displayValue: p.displayValue,
          achievedAt: p.achievedAt,
        })),
        privacySettings: user.privacySettings || DEFAULT_GRANULAR_PRIVACY_SETTINGS,
        friendIds: acceptedFriendIds,
        blockedIds: blockedUserIds,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    isAuthenticated,
    user?.id,
    user?.username,
    user?.avatar,
    user?.bio,
    user?.privacySettings,
    user?.legendTitle,
    stats.level,
    stats.playerXP,
    stats.currentStreak,
    stats.totalWorkoutsCompleted,
    stats.totalVerifiedReps,
    friends.length,
    blockedUsers.length,
    fitnessSessions.length,
    museumData?.personalBestCount,
    habits,
    waterGlasses,
  ]);

  const setManualPresenceStatus = async (status: 'online' | 'away' | 'dnd') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    sound.playClick();
    myManualPresenceRef.current = status;
    isAutoAwayRef.current = false;
    setMyManualPresence(status);
    setMyEffectivePresence(status);
    setUser(prev => (prev ? { ...prev, presenceStatus: status } : prev));
    if (!uid) return;
    sendPresenceWsPayload({ type: 'presence:set', manualStatus: status, isAutoAway: false });
    await setPresenceStatusServer({ userId: uid, manualStatus: status, isAutoAway: false });
    if (unifiedBackendReady) {
      void saveClientPreferencesServer({ manualPresenceStatus: status });
    }
  };

  const updatePresencePreferences = async (prefs: { autoAwayEnabled?: boolean; autoAwayMinutes?: number }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    const nextEnabled =
      typeof prefs.autoAwayEnabled === 'boolean' ? prefs.autoAwayEnabled : autoAwayEnabledRef.current;
    const nextMins =
      typeof prefs.autoAwayMinutes === 'number'
        ? Math.max(1, Math.min(60, prefs.autoAwayMinutes))
        : autoAwayMinutesRef.current;
    autoAwayEnabledRef.current = nextEnabled;
    autoAwayMinutesRef.current = nextMins;
    setAutoAwayEnabled(nextEnabled);
    setAutoAwayMinutes(nextMins);
    setUser(prev => (prev ? { ...prev, autoAwayEnabled: nextEnabled, autoAwayMinutes: nextMins } : prev));
    if (!uid) return;
    sendPresenceWsPayload({
      type: 'presence:set',
      autoAwayEnabled: nextEnabled,
      autoAwayMinutes: nextMins,
    });
    await setPresenceStatusServer({
      userId: uid,
      autoAwayEnabled: nextEnabled,
      autoAwayMinutes: nextMins,
    });
    if (unifiedBackendReady) {
      void saveClientPreferencesServer({
        autoAwayEnabled: nextEnabled,
        autoAwayMinutes: nextMins,
      });
    }
  };

  const getPlayerPresence = (
    targetUserId: string
  ): { status: PresenceStatus; lastActiveAt?: string | null; hidden?: boolean } => {
    if (user && targetUserId === user.id) {
      return { status: myEffectivePresence, lastActiveAt: new Date().toISOString(), hidden: false };
    }
    const cached = presenceMap[targetUserId];
    if (cached) return cached;
    return { status: 'offline', lastActiveAt: null, hidden: false };
  };

  const queryPresencesBatch = async (userIds: string[]) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !userIds.length) return;
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean))).slice(0, 60);
    if (!uniqueIds.length) return;
    sendPresenceWsPayload({ type: 'presence:query', userIds: uniqueIds });
    const batch = await fetchPresenceBatchServer({ viewerId: uid, userIds: uniqueIds });
    if (Object.keys(batch).length > 0) {
      setPresenceMap(prev => ({ ...prev, ...batch }));
    }
  };

  const previewPublicProfileAs = async (mode: 'public' | 'friend' | 'restricted') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return null;
    const res = await fetchServerFilteredPublicProfile({
      targetUserId: uid,
      viewerId: uid,
      previewAs: mode,
    });
    return res.ok ? res.profile : null;
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

  const reconcileSkillTree = async (): Promise<{ ok: boolean; reconciledCount?: number }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { ok: false };
    setSkillTreeLoading(true);
    try {
      const tz = user?.timezone || getUserTimezone();
      const res = await reconcileSkillTreeServer({
        userId: uid,
        timezone: tz,
        workouts: fitnessSessions.map(w => ({
          id: w.id,
          exerciseName: w.exerciseName,
          exerciseType: w.exerciseType,
          reps: w.repetitions,
          durationMinutes: w.durationMinutes,
          date: w.timestamp,
        })),
        habits: habits.map(h => ({
          id: h.id,
          name: h.name,
          category: h.category,
          completedCount: h.history?.length || (h.completedToday ? 1 : 0),
          lastCompleted: h.lastCompletedDate || null,
        })),
      });
      if (res.ok && res.state) {
        setSkillTreeState(normalizeSkillTreeState(res.state));
        return { ok: true, reconciledCount: res.reconciledCount || 0 };
      }
      return { ok: false };
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
          if (ecoRes.data.identityState) {
            setIdentityState(ecoRes.data.identityState as PlayerIdentityState);
          } else {
            void refreshIdentityState();
          }
          // Refresh affected ecosystem + Polish 2.0 caches quietly
          void refreshWeeklyBossState();
          void refreshRivalsState();
          void refreshCommunityEventState();
          void refreshMuseumRecords();
          void refreshSeasonState();
          void refreshNotificationsState();
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

  // --- PHASE 2 (COMPETITIVE ARENA): INDEPENDENT RIVALS PLATFORM ---
  const refreshRivalsState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setRivalsLoading(true);
    try {
      const res = await fetchRivalsArenaStateServer({
        userId: uid,
        username: user?.username,
        characterClass: user?.characterClass,
        level: stats.level,
      });
      if (res.ok && res.data) {
        setRivalsState(res.data);
      }
    } finally {
      setRivalsLoading(false);
    }
  };

  const joinRivalsQueue = async (mode: CompetitiveRivalMode) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await joinRivalsQueueServer({
      userId: uid,
      mode,
      username: user.username,
      characterClass: user.characterClass,
      level: stats.level,
    });
    if (res.ok) {
      if (res.data) setRivalsState(res.data);
      if (res.matched) sound.playQuestComplete();
      else sound.playClick();
      return { success: true, matched: res.matched, match: res.match || null };
    }
    return { success: false, error: res.error };
  };

  const cancelRivalsQueue = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await cancelRivalsQueueServer(uid);
    if (res.ok) {
      if (res.data) setRivalsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const sendDirectRivalChallenge = async (params: {
    opponentId: string;
    opponentName: string;
    mode?: CompetitiveRivalMode;
    challengeType?: RivalChallengeType;
    visibility?: CompetitiveMatchVisibility;
    rules?: Partial<CompetitiveMatchRules>;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const isAcceptedFriend = friends.some(
      f => f.status === 'accepted' && f.champion.id === params.opponentId
    );
    const res = await sendDirectRivalChallengeServer({
      userId: uid,
      challengerName: user.username,
      opponentId: params.opponentId,
      opponentName: params.opponentName,
      mode: params.mode,
      challengeType: params.challengeType,
      isFriend: isAcceptedFriend,
      visibility: params.visibility,
      rules: params.rules,
    });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const sendRivalInvite = async (
    opponentId: string,
    opponentName: string,
    challengeType: RivalChallengeType
  ) => {
    return sendDirectRivalChallenge({ opponentId, opponentName, challengeType });
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

  const rematchRival = async (matchId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await rematchRivalServer({ userId: uid, matchId });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const disputeRivalMatch = async (matchId: string, reason: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await disputeRivalMatchServer({ userId: uid, matchId, reason });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const updateRivalsPrivacy = async (allowNonFriendChallenges: boolean) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await updateRivalsPrivacyServer({ userId: uid, allowNonFriendChallenges });
    if (res.ok && res.data) {
      setRivalsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const fetchRivalsLeaderboard = async (params?: {
    scope?: 'global' | 'friends' | 'seasonal' | 'weekly';
    mode?: CompetitiveRivalMode | 'all';
    division?: string;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { ok: false, error: 'Authentication required.' };
    const acceptedFriendIds = friends.filter(f => f.status === 'accepted').map(f => f.champion.id);
    return fetchRivalsLeaderboardServer({
      userId: uid,
      scope: params?.scope || 'global',
      mode: params?.mode || 'all',
      division: params?.division,
      friendIds: acceptedFriendIds,
    });
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
    pbOnly?: boolean;
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
        pbOnly: params?.pbOnly,
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

  const reconcileMuseum = async (): Promise<{ ok: boolean; reconciledCount?: number }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { ok: false };
    setMuseumLoading(true);
    try {
      const rec = await reconcileMuseumServer({
        userId: uid,
        workouts: fitnessSessions.map(w => ({
          id: w.id,
          exerciseName: w.exerciseName,
          exerciseType: w.exerciseType,
          reps: w.repetitions,
          durationMinutes: w.durationMinutes,
          date: w.timestamp,
        })),
        currentStreak: stats.currentStreak,
      });
      if (rec.ok) {
        await refreshMuseumRecords({ page: 1 });
        return { ok: true, reconciledCount: rec.reconciledCount || 0 };
      }
      return { ok: false };
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

  // --- POLISH 2.0 PHASE 1: ADVANCED PLAYER IDENTITY ---
  const refreshIdentityState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setIdentityLoading(true);
    try {
      const res = await fetchIdentityStateServer(uid);
      if (res.ok && res.state) {
        setIdentityState(res.state);
      }
    } finally {
      setIdentityLoading(false);
    }
  };

  const syncVerifiedIdentitySnapshot = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const totalActiveMins = fitnessSessions.reduce(
      (sum, s) => sum + (Number(s.durationMinutes) || 0),
      0
    );
    const totalHabitsDone = habits.reduce((sum, h) => sum + (h.history?.length || (h.completedToday ? 1 : 0)), 0);
    const unlockedAch = achievements.filter(a => a.unlocked).length;
    const res = await syncVerifiedIdentitySnapshotServer({
      userId: uid,
      snapshot: {
        level: stats.level,
        currentStreak: stats.currentStreak,
        longestStreak: Math.max(stats.currentStreak, identityState?.lifetimeStats?.longestStreak || 0),
        totalWorkoutsCompleted: Math.max(stats.totalWorkoutsCompleted, fitnessSessions.length),
        totalVerifiedReps: stats.totalVerifiedReps,
        totalActiveMinutes: totalActiveMins,
        totalHabitsCompleted: totalHabitsDone,
        totalAchievementsUnlocked: unlockedAch,
        totalBossesDefeated: stats.totalBossesDefeated,
        joinedAt: user?.createdAt || null,
      },
    });
    if (res.ok && res.state) {
      setIdentityState(res.state);
    }
  };

  const selectIdentityTitle = async (
    titleId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await selectIdentityTitleServer(uid, titleId);
    if (res.ok && res.state) {
      setIdentityState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not update title.' };
  };

  const featureIdentityBadges = async (
    badgeIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await featureIdentityBadgesServer(uid, badgeIds);
    if (res.ok && res.state) {
      setIdentityState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not update featured badges.' };
  };

  const claimGlobalRareBadge = async (
    badgeId: string
  ): Promise<{ success: boolean; alreadyClaimedGlobally?: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await claimGlobalRareBadgeServer(uid, badgeId, user.username);
    if (res.ok && res.state) {
      setIdentityState(res.state);
      sound.playVictory();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#C5A15A', '#7046A5', '#FB7185'] });
      void refreshNotificationsState();
      return { success: true };
    }
    return {
      success: false,
      alreadyClaimedGlobally: res.alreadyClaimedGlobally,
      error: res.error || 'Could not claim rare badge.',
    };
  };

  // --- POLISH 2.0 PHASE 2: INTELLIGENT NOTIFICATIONS ---
  const refreshNotificationsState = async (category: NotificationCategory | 'all' = 'all') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchNotificationsStateServer(uid, category);
    if (res.ok && res.data) {
      const srvList = res.data.notifications || [];
      if (category === 'all') {
        setNotifications(prev => {
          const seenKeys = new Set<string>(srvList.map(n => n.eventKey || n.id));
          const merged = [...srvList];
          for (const existing of prev) {
            const k = existing.eventKey || existing.id;
            if (!seenKeys.has(k) && !existing.dismissedAt && existing.id.startsWith('notif-')) {
              // Keep non-synthetic Supabase-originated social notifications if still active
              if (!existing.id.startsWith('notif-wb-') && !existing.id.startsWith('notif-pb-')) {
                merged.push(existing);
              }
            }
          }
          return merged
            .filter(n => !n.dismissedAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      }
      setNotificationCategoryCounts(res.data.categoryCounts || {});
      if (res.data.preferences) {
        setNotificationPreferences(res.data.preferences);
      }
    }
  };

  const saveServerNotificationPreferences = async (
    prefs: Partial<ServerNotificationPreferences>
  ): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await saveNotificationPreferencesServer(uid, prefs);
    if (res.ok && res.preferences) {
      setNotificationPreferences(res.preferences);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not save notification preferences.' };
  };

  const selectSecondaryIdentityTitle = async (
    titleId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await selectSecondaryIdentityTitleServer(uid, titleId);
    if (res.ok && res.state) {
      setIdentityState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not update secondary title.' };
  };

  // --- POLISH 2.0 PHASE 3 + AAA-1: 50-LEVEL SEASONAL BATTLE PASS ---
  const refreshSeasonState = async (page: number = 1) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setSeasonLoading(true);
    try {
      const res = await fetchSeasonStateServer(uid, page, 50);
      if (res.ok && res.data) {
        setSeasonState(res.data);
      }
    } finally {
      setSeasonLoading(false);
    }
  };

  const claimSeasonChallenge = async (
    challengeId: string
  ): Promise<{ success: boolean; seasonXpAwarded?: number; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimSeasonChallengeServer(uid, challengeId);
    if (res.ok && res.data) {
      setSeasonState(res.data);
      sound.playQuestComplete();
      void refreshNotificationsState();
      void refreshSeasonalRecap();
      return { success: true, seasonXpAwarded: res.seasonXpAwarded };
    }
    return { success: false, error: res.error || 'Could not claim seasonal challenge.' };
  };

  const claimSeasonMilestone = async (
    milestoneId: string,
    track: 'free' | 'elite' = 'free'
  ): Promise<{ success: boolean; rewardLabel?: string; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimSeasonMilestoneServer(uid, milestoneId, track);
    if (res.ok && res.data) {
      setSeasonState(res.data);
      sound.playVictory();
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 }, colors: ['#C5A15A', '#7046A5', '#34D399'] });
      void refreshIdentityState();
      void refreshCosmeticsState();
      void refreshCardsState();
      void refreshCollectionState();
      void refreshNotificationsState();
      return { success: true, rewardLabel: res.rewardLabel };
    }
    return { success: false, error: res.error || 'Could not claim seasonal milestone.' };
  };

  const unlockSeasonElite = async (): Promise<{ success: boolean; error?: string }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await unlockSeasonEliteServer(uid);
    if (res.ok && res.data) {
      setSeasonState(res.data);
      sound.playVictory();
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not unlock Elite track.' };
  };

  const purchaseBattlePassRmDisabled = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { ok: false, error: 'Authentication required.' };
    return purchaseBattlePassRmDisabledServer(uid);
  };

  // --- EXPANSION 3.0 & AAA-15 ACTIONS ---
  const applyWalletSync = (w?: PlayerWalletState) => {
    if (!w) return;
    setWalletState(w);
    setStats(prev => ({ ...prev, gold: w.goldBalance }));
  };

  const refreshActivityFeed = async (filter: FeedFilter = feedFilter, page: number = 1) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setFeedFilter(filter);
    setFeedLoading(true);
    try {
      const res = await fetchFeedPostsServer({ userId: uid, filter, page, limit: 15 });
      if (res.ok && res.data) {
        setFeedData(prev =>
          page > 1 && prev
            ? { ...res.data!, posts: [...prev.posts, ...res.data!.posts] }
            : res.data!
        );
      }
    } finally {
      setFeedLoading(false);
    }
  };

  const shareFeedWorkoutNote = async (params: {
    verifiedRef: string;
    title: string;
    summary: string;
    highlightValue?: string;
    commentPermission?: FeedCommentPermission;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await shareFeedWorkoutNoteServer({ ...params, userId: uid, username: user.username });
    if (res.ok) {
      await refreshActivityFeed(feedFilter, 1);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const reactToFeedPost = async (postId: string, emoji: FeedReactionKey) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await reactToFeedPostServer({ userId: uid, username: user.username, postId, emoji });
    if (res.ok && res.post) {
      setFeedData(prev =>
        prev ? { ...prev, posts: prev.posts.map(p => (p.id === postId ? res.post! : p)) } : prev
      );
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const commentOnFeedPost = async (postId: string, body: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await commentOnFeedPostServer({ userId: uid, username: user.username, postId, body });
    if (res.ok && res.post) {
      setFeedData(prev =>
        prev ? { ...prev, posts: prev.posts.map(p => (p.id === postId ? res.post! : p)) } : prev
      );
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const deleteFeedPost = async (postId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await deleteFeedPostServer(uid, postId);
    if (res.ok) {
      setFeedData(prev =>
        prev ? { ...prev, posts: prev.posts.filter(p => p.id !== postId) } : prev
      );
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const updateFeedCommentPermission = async (postId: string, permission: FeedCommentPermission) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await updateFeedCommentPermissionServer({
      userId: uid,
      postId,
      commentPermission: permission,
    });
    if (res.ok && res.post) {
      setFeedData(prev =>
        prev ? { ...prev, posts: prev.posts.map(p => (p.id === postId ? res.post! : p)) } : prev
      );
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshWorkoutParties = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    setPartiesLoading(true);
    try {
      const res = await fetchWorkoutPartiesStateServer(uid);
      if (res.ok && res.data) {
        setWorkoutParties([...(res.data.parties || []), ...(res.data.invitedParties || [])]);
        setWorkoutPartyHistory(res.data.history || []);
      }
    } finally {
      setPartiesLoading(false);
    }
  };

  const createWorkoutParty = async (params: {
    title?: string;
    challengeId: string;
    visibility?: 'friends' | 'private' | 'public';
    inviteFriendIds?: string[];
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await createWorkoutPartyServer({
      userId: uid,
      username: user.username,
      title: params.title,
      challengeId: params.challengeId,
      visibility: params.visibility || 'friends',
      inviteFriendIds: params.inviteFriendIds,
    });
    if (res.ok && res.party) {
      setWorkoutParties(prev => [res.party!, ...prev]);
      return { success: true, party: res.party };
    }
    return { success: false, error: res.error };
  };

  const joinWorkoutPartyByCode = async (roomCode: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await joinWorkoutPartyServer({
      userId: uid,
      username: user.username,
      roomCode,
    });
    if (res.ok && res.party) {
      await refreshWorkoutParties();
      return { success: true, party: res.party };
    }
    return { success: false, error: res.error };
  };

  const inviteToWorkoutParty = async (partyId: string, inviteeId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await inviteToWorkoutPartyServer({
      userId: uid,
      partyId,
      friendId: inviteeId,
    });
    if (res.ok) {
      await refreshWorkoutParties();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const startWorkoutParty = async (partyId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await startWorkoutPartyServer(uid, partyId);
    if (res.ok && res.party) {
      setWorkoutParties(prev => prev.map(p => (p.id === partyId ? res.party! : p)));
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const saveWorkoutPartySummary = async (partyId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await saveWorkoutPartySummaryServer(uid, partyId);
    if (res.ok) {
      await refreshWorkoutParties();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const leaveWorkoutParty = async (partyId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await leaveWorkoutPartyServer(uid, partyId);
    if (res.ok) {
      await refreshWorkoutParties();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const submitWorkoutPartyProgress = async (
    partyId: string,
    verifiedSessionId: string,
    params: { durationMinutes?: number; repetitions?: number; verifiedWithAetherVision?: boolean }
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await submitWorkoutPartyProgressServer({
      userId: uid,
      partyId,
      verifiedSessionId,
      durationMinutes: params.durationMinutes,
      repetitions: params.repetitions,
      verifiedWithAetherVision: params.verifiedWithAetherVision,
    });
    if (res.ok) {
      await refreshWorkoutParties();
      void refreshFriendshipsExtended();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const sendWorkoutPartyMessage = async (
    partyId: string,
    content: string,
    kind: 'message' | 'reaction' = 'message'
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await sendWorkoutPartyMessageServer({
      userId: uid,
      username: user.username,
      partyId,
      content,
      kind,
    });
    if (res.ok && res.party) {
      setWorkoutParties(prev => prev.map(p => (p.id === partyId ? res.party! : p)));
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshCosmeticsState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchCosmeticsStateServer(uid);
    if (res.ok && res.state) setCosmeticsState(res.state);
  };

  const equipCosmetic = async (cosmeticId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await equipCosmeticServer(uid, cosmeticId);
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const unequipCosmeticSlot = async (slot: CosmeticSlot) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await unequipCosmeticSlotServer(uid, slot);
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const claimCosmeticMilestone = async (milestoneId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimCosmeticMilestoneServer(uid, milestoneId);
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      sound.playVictory();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const saveLoadout = async (
    loadout: Partial<PlayerLoadout> & { name: string; context: 'default' | 'competition' }
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await saveLoadoutServer({ userId: uid, loadout });
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const equipLoadout = async (loadoutId: string, applyAs: 'default' | 'competition' = 'default') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await equipLoadoutServer(uid, loadoutId, applyAs);
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const duplicateLoadout = async (loadoutId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await duplicateLoadoutServer(uid, loadoutId);
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const deleteLoadout = async (loadoutId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await deleteLoadoutServer(uid, loadoutId);
    if (res.ok && res.state) {
      setCosmeticsState(res.state);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshCommunityDecisions = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchCommunityDecisionsServer(uid);
    if (res.ok) {
      setCommunityDecisionPolls(res.activePolls || []);
      setCommunityDecisionArchive(res.archivePolls || []);
    }
  };

  const castCommunityDecisionVote = async (pollId: string, optionIds: string[]) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await castCommunityDecisionVoteServer({ userId: uid, pollId, optionIds });
    if (res.ok && res.poll) {
      setCommunityDecisionPolls(prev => prev.map(p => (p.id === pollId ? res.poll! : p)));
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const reportCommunityDecisionPoll = async (pollId: string, reason: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await reportCommunityDecisionPollServer({ userId: uid, pollId, reason });
    return { success: res.ok, error: res.error };
  };

  const refreshTrophyShowcase = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchTrophiesAndHiddenServer(uid);
    if (res.ok && res.state) setTrophyShowcase(res.state);
    if (res.ok && res.hiddenAchievements) setHiddenAchievements(res.hiddenAchievements);
  };

  const updatePinnedTrophies = async (pinnedIds: string[]) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await updatePinnedTrophiesServer(uid, pinnedIds);
    if (res.ok && res.state) {
      setTrophyShowcase(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshTerritoryWars = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchTerritoryWarsStateServer(uid);
    if (res.ok && res.data) setTerritoryWarsState(res.data);
  };

  const registerGuildTerritoryWar = async (
    guildId: string,
    guildName: string,
    guildTag: string,
    membersCount: number
  ) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await registerGuildTerritoryWarServer({
      userId: uid,
      guildId,
      guildName,
      guildTag,
      membersCount,
    });
    if (res.ok && res.data) {
      setTerritoryWarsState(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const selectTerritoryMission = async (territoryId: string, stance: TerritoryMissionStance) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await selectTerritoryMissionServer({ userId: uid, territoryId, stance });
    if (res.ok && res.data) {
      setTerritoryWarsState(res.data);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const claimCommunityChallenge = async (challengeId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimCommunityChallengeServer(uid, challengeId);
    if (res.ok && res.data) {
      setCommunityEventState(res.data);
      sound.playQuestComplete();
      void refreshCardsState();
      void refreshIdentityState();
      void refreshCosmeticsState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshCardsState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchCardsStateServer(uid);
    if (res.ok && res.state) setCardsState(res.state);
    if (res.ok && res.wallet) applyWalletSync(res.wallet);
  };

  const openCardPack = async (packId: string, currency: 'gold' | 'fragments') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await openCardPackServer({ userId: uid, packId, currency });
    if (res.ok && res.state) {
      setCardsState(res.state);
      applyWalletSync(res.wallet);
      sound.playVictory();
      void refreshCollectionState();
      void refreshIdentityState();
      return {
        success: true,
        drawnCards: res.drawnCards,
        fragmentsGrantedFromDuplicates: res.fragmentsGrantedFromDuplicates,
      };
    }
    return { success: false, error: res.error };
  };

  const setFavoriteCards = async (cardIds: string[]) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await setFavoriteCardsServer(uid, cardIds);
    if (res.ok && res.state) {
      setCardsState(res.state);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const claimCardAchievement = async (achievementId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimCardAchievementServer(uid, achievementId);
    if (res.ok && res.state) {
      setCardsState(res.state);
      applyWalletSync(res.wallet);
      sound.playVictory();
      void refreshIdentityState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshMarketplaceState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchMarketplaceStateServer(uid);
    if (res.ok && res.state) {
      setMarketplaceState(res.state);
      applyWalletSync(res.state.wallet);
    }
  };

  const toggleMarketplaceWishlist = async (itemId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await toggleMarketplaceWishlistServer(uid, itemId);
    if (res.ok && res.state) {
      setMarketplaceState(res.state);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const purchaseMarketplaceItem = async (itemId: string, currency: 'gold' | 'fragments') => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await purchaseMarketplaceItemServer(uid, itemId, currency);
    if (res.ok && res.state) {
      setMarketplaceState(res.state);
      applyWalletSync(res.state.wallet);
      sound.playVictory();
      void refreshCosmeticsState();
      void refreshIdentityState();
      void refreshCardsState();
      void refreshCollectionState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const attemptMarketplaceRmCheckout = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { ok: false, error: 'Authentication required.' };
    return attemptMarketplaceRmCheckoutServer(uid);
  };

  const refreshCollectionState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchCollectionCompletionServer(uid);
    if (res.ok && res.state) setCollectionState(res.state);
  };

  const claimCollectionMilestone = async (milestoneId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimCollectionMilestoneServer(uid, milestoneId);
    if (res.ok && res.state) {
      setCollectionState(res.state);
      applyWalletSync(res.wallet);
      sound.playVictory();
      void refreshCosmeticsState();
      void refreshIdentityState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshFriendshipsExtended = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchFriendshipsStateServer(uid);
    if (res.ok && res.friendships) setFriendshipLevels(res.friendships);
  };

  const claimFriendshipCoopMission = async (friendId: string, missionId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimFriendshipCoopMissionServer(uid, friendId, missionId);
    if (res.ok && res.record) {
      await refreshFriendshipsExtended();
      sound.playVictory();
      void refreshIdentityState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshPrestigeState = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchPrestigeStateServer(uid);
    if (res.ok && res.state) setPrestigeState(res.state);
  };

  const unlockPrestigeTier = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await unlockPrestigeTierServer(uid, stats.level);
    if (res.ok && res.state) {
      setPrestigeState(res.state);
      sound.playVictory();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors: ['#C5A15A', '#7046A5', '#FBBF24'] });
      void refreshIdentityState();
      void refreshCosmeticsState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const claimPrestigeChallenge = async (challengeId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimPrestigeChallengeServer(uid, challengeId);
    if (res.ok && res.state) {
      setPrestigeState(res.state);
      sound.playQuestComplete();
      void refreshMarketplaceState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshDailyCalendar = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchDailyCalendarStateServer(uid, getUserTimezone());
    if (res.ok && res.state) setDailyCalendarState(res.state);
  };

  const claimDailyCalendarCheckin = async (params: {
    mode: 'workout' | 'rest_recovery';
    catchUpDayNumber?: number;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimDailyCalendarCheckinServer({
      userId: uid,
      mode: params.mode,
      catchUpDayNumber: params.catchUpDayNumber,
      timezone: getUserTimezone(),
    });
    if (res.ok && res.state) {
      setDailyCalendarState(res.state);
      sound.playQuestComplete();
      void refreshCardsState();
      void refreshMarketplaceState();
      return { success: true, dayNumber: res.dayNumber, rewardSummary: res.rewardSummary };
    }
    return { success: false, error: res.error };
  };

  const claimCalendarWeeklyMilestone = async (milestoneId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimCalendarWeeklyMilestoneServer(uid, milestoneId, getUserTimezone());
    if (res.ok && res.state) {
      setDailyCalendarState(res.state);
      sound.playVictory();
      void refreshMarketplaceState();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshSeasonalRecap = async (seasonId?: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchSeasonalRecapServer(uid, seasonId);
    if (res.ok && res.recap) setSeasonalRecap(res.recap);
  };

  const updateSeasonalRecapVisibility = async (visibility: SeasonalStatVisibility) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await updateSeasonalRecapVisibilityServer(uid, visibility);
    if (res.ok && res.recap) {
      setSeasonalRecap(res.recap);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const claimRankedDivisionReward = async (division: RankedDivisionName) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await claimRankedDivisionRewardServer(uid, division);
    if (res.ok) {
      sound.playVictory();
      await refreshRivalsState();
      void refreshIdentityState();
      void refreshCosmeticsState();
      return { success: true, rewardTitleName: res.rewardTitleName };
    }
    return { success: false, error: res.error };
  };

  const refreshTournaments = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchTournamentsStateServer(uid);
    if (res.ok && res.tournaments) setTournaments(res.tournaments);
  };

  const createTournament = async (params: {
    title: string;
    subtitle?: string;
    mode: CompetitiveRivalMode;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await createTournamentServer({ ...params, userId: uid, username: user.username });
    if (res.ok && res.tournaments) {
      setTournaments(res.tournaments);
      sound.playClick();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const joinTournament = async (tournamentId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await joinTournamentServer({ userId: uid, tournamentId, username: user.username });
    if (res.ok && res.tournaments) {
      setTournaments(res.tournaments);
      sound.playVictory();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const refreshSpectatorMatches = async () => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return;
    const res = await fetchSpectatorMatchesServer(uid);
    if (res.ok) {
      setSpectatorMatches(res.matches || []);
      setFollowedCompetitorIds(res.followedCompetitorIds || []);
    }
  };

  const sendSpectatorCheer = async (params: {
    matchId: string;
    targetUserId: string;
    emoji: string;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await sendSpectatorCheerServer({
      userId: uid,
      matchId: params.matchId,
      targetUserId: params.targetUserId,
      emoji: params.emoji,
      spectatorName: user.username,
    });
    if (res.ok && res.match) {
      setSpectatorMatches(prev => prev.map(m => (m.matchId === res.match!.matchId ? res.match! : m)));
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const toggleFollowCompetitor = async (targetUserId: string) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await toggleFollowCompetitorServer(uid, targetUserId);
    if (res.ok && res.followedCompetitorIds) {
      setFollowedCompetitorIds(res.followedCompetitorIds);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const giveEndorsement = async (params: {
    targetUserId: string;
    category: EndorsementCategory;
    note?: string;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid || !user) return { success: false, error: 'Authentication required.' };
    const res = await giveEndorsementServer({
      userId: uid,
      targetUserId: params.targetUserId,
      category: params.category,
      note: params.note,
      username: user.username,
    });
    if (res.ok) {
      sound.playClick();
      return { success: true, summary: res.summary };
    }
    return { success: false, error: res.error };
  };

  const reportEndorsementAbuse = async (params: {
    targetUserId: string;
    endorsementId?: string;
    reason: string;
  }) => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) return { success: false, error: 'Authentication required.' };
    const res = await reportEndorsementAbuseServer({ userId: uid, ...params });
    return { success: res.ok, error: res.error };
  };

  // --- POLISH 2.0 PHASE 4: ADVANCED LEADERBOARDS ---
  const queryAdvancedLeaderboard = async (
    scope: LeaderboardScope,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    ok: boolean;
    data?: AdvancedLeaderboardResponse;
    isLiveBackend: boolean;
    error?: string;
  }> => {
    const uid = activeSessionUserIdRef.current || user?.id;
    if (!uid) {
      return { ok: false, isLiveBackend: false, error: 'Authentication required.' };
    }

    let supabaseEntries: LeaderboardEntry[] = [];
    let isLiveBackend = false;
    if (
      unifiedBackendReady &&
      (scope === 'global' ||
        scope === 'weekly' ||
        scope === 'monthly' ||
        scope === 'guild' ||
        scope === 'friends')
    ) {
      const srv = await fetchLeaderboardServer(scope, 50, 0);
      if (srv.ok && srv.data) {
        supabaseEntries = srv.data;
        isLiveBackend = true;
      }
    }

    const res = await queryAdvancedLeaderboardServer({
      userId: uid,
      scope,
      page,
      limit,
      supabaseEntries,
    });
    if (res.ok && res.data) {
      return { ok: true, data: res.data, isLiveBackend: true };
    }
    return { ok: false, isLiveBackend, error: res.error || 'Could not load leaderboard.' };
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
        characterSubTab,
        setCharacterSubTab,
        storeSubTab,
        setStoreSubTab,
        guildsSubTab,
        setGuildsSubTab,
        eventsSubTab,
        setEventsSubTab,
        progressionSubTab,
        setProgressionSubTab,
        identityState,
        identityLoading,
        refreshIdentityState,
        syncVerifiedIdentitySnapshot,
        selectIdentityTitle,
        selectSecondaryIdentityTitle,
        featureIdentityBadges,
        claimGlobalRareBadge,
        notificationPreferences,
        notificationCategoryCounts,
        refreshNotificationsState,
        saveServerNotificationPreferences,
        dismissNotification,
        navigateFromNotification,
        seasonState,
        seasonLoading,
        refreshSeasonState,
        claimSeasonChallenge,
        claimSeasonMilestone,
        unlockSeasonElite,
        purchaseBattlePassRmDisabled,
        feedData,
        feedFilter,
        feedLoading,
        refreshActivityFeed,
        shareFeedWorkoutNote,
        reactToFeedPost,
        commentOnFeedPost,
        deleteFeedPost,
        updateFeedCommentPermission,
        workoutParties,
        workoutPartyHistory,
        partiesLoading,
        refreshWorkoutParties,
        createWorkoutParty,
        joinWorkoutPartyByCode,
        inviteToWorkoutParty,
        startWorkoutParty,
        saveWorkoutPartySummary,
        leaveWorkoutParty,
        submitWorkoutPartyProgress,
        sendWorkoutPartyMessage,
        cosmeticsState,
        refreshCosmeticsState,
        equipCosmetic,
        unequipCosmeticSlot,
        claimCosmeticMilestone,
        saveLoadout,
        equipLoadout,
        duplicateLoadout,
        deleteLoadout,
        communityDecisionPolls,
        communityDecisionArchive,
        refreshCommunityDecisions,
        castCommunityDecisionVote,
        reportCommunityDecisionPoll,
        trophyShowcase,
        hiddenAchievements,
        refreshTrophyShowcase,
        updatePinnedTrophies,
        territoryWarsState,
        refreshTerritoryWars,
        registerGuildTerritoryWar,
        selectTerritoryMission,
        claimCommunityChallenge,
        walletState,
        cardsState,
        refreshCardsState,
        openCardPack,
        setFavoriteCards,
        claimCardAchievement,
        marketplaceState,
        refreshMarketplaceState,
        toggleMarketplaceWishlist,
        purchaseMarketplaceItem,
        attemptMarketplaceRmCheckout,
        collectionState,
        refreshCollectionState,
        claimCollectionMilestone,
        friendshipLevels,
        refreshFriendshipsExtended,
        claimFriendshipCoopMission,
        prestigeState,
        refreshPrestigeState,
        unlockPrestigeTier,
        claimPrestigeChallenge,
        dailyCalendarState,
        refreshDailyCalendar,
        claimDailyCalendarCheckin,
        claimCalendarWeeklyMilestone,
        seasonalRecap,
        refreshSeasonalRecap,
        updateSeasonalRecapVisibility,
        claimRankedDivisionReward,
        tournaments,
        refreshTournaments,
        createTournament,
        joinTournament,
        spectatorMatches,
        followedCompetitorIds,
        refreshSpectatorMatches,
        sendSpectatorCheer,
        toggleFollowCompetitor,
        giveEndorsement,
        reportEndorsementAbuse,
        queryAdvancedLeaderboard,
        skillTreeState,
        skillTreeLoading,
        lastSkillAwardBanner,
        dismissSkillAwardBanner,
        refreshSkillTreeState,
        reconcileSkillTree,
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
        joinRivalsQueue,
        cancelRivalsQueue,
        sendDirectRivalChallenge,
        sendRivalInvite,
        respondRivalInvite,
        cancelRivalInvite,
        endActiveRivalry,
        rematchRival,
        disputeRivalMatch,
        updateRivalsPrivacy,
        fetchRivalsLeaderboard,
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
        reconcileMuseum,
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
        myManualPresence,
        myEffectivePresence,
        autoAwayEnabled,
        autoAwayMinutes,
        presenceMap,
        setManualPresenceStatus,
        updatePresencePreferences,
        getPlayerPresence,
        queryPresencesBatch,
        previewPublicProfileAs,
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
