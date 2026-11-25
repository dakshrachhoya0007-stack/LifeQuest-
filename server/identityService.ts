import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import {
  ENDORSEMENT_CATEGORIES_META,
  ENDORSEMENT_MILESTONES,
  PRESTIGE_CHALLENGES_CATALOG,
  PRESTIGE_TIERS_CATALOG,
  computeRankedDivision,
  RANKED_DIVISIONS_CATALOG,
} from '../src/data/aaaGamingData.ts';
import {
  PLAYER_TITLES_CATALOG,
  RARE_BADGES_CATALOG,
  computeTotalReputation,
  getReputationTierLabel,
} from '../src/data/polish2Data.ts';
import { computeAttributeProgress, SKILL_ATTRIBUTE_IDS } from '../src/data/skillTreeData.ts';
import { resolveVerifiedCaller } from './authGuard.ts';
import type {
  EndorsementCategory,
  PlayerEndorsementSummary,
  PlayerIdentityState,
  PlayerLifetimeStatistics,
  PlayerPrestigeState,
  PlayerUnlockedBadge,
  PlayerUnlockedTitle,
  ReputationBreakdown,
  SkillAttributeId,
} from '../src/types/game.ts';

interface StoredEndorsementEntry {
  id: string;
  fromUserId: string;
  fromUsername: string;
  category: EndorsementCategory;
  note?: string | null;
  createdAt: string;
}

interface StoredUserIdentity {
  equippedTitleId: string | null;
  equippedSecondaryTitleId: string | null;
  featuredBadgeIds: string[];
  unlockedTitles: PlayerUnlockedTitle[];
  unlockedBadges: PlayerUnlockedBadge[];
  reputationLedgerKeys: Record<string, { source: string; points: number; createdAt: string }>;
  prestigeTier: number;
  prestigeHistory: PlayerPrestigeState['history'];
  completedPrestigeChallengeIds: string[];
  unlockedPrestigeRewardIds: string[];
  endorsementsReceived: StoredEndorsementEntry[];
  endorsementCooldownsByTarget: Record<string, string>;
  endorsementDailyCounts: Record<string, number>;
  verifiedSnapshot: {
    level: number;
    currentStreak: number;
    longestStreak: number;
    totalWorkoutsCompleted: number;
    totalVerifiedReps: number;
    totalActiveMinutes: number;
    totalHabitsCompleted: number;
    totalAchievementsUnlocked: number;
    totalBossesDefeated: number;
    joinedAt: string | null;
  };
}

interface EndorsementAbuseReport {
  id: string;
  reporterId: string;
  targetUserId: string;
  endorsementId?: string;
  reason: string;
  status: 'open' | 'reviewed';
  createdAt: string;
}

interface IdentityLedgerFile {
  users: Record<string, StoredUserIdentity>;
  globalBadgeOwners: Record<
    string,
    { badgeId: string; ownerId: string; ownerUsername: string; claimedAt: string }
  >;
  endorsementReports: EndorsementAbuseReport[];
}

const VALID_ENDORSEMENT_CATS = new Set<EndorsementCategory>([
  'helpfulness',
  'sportsmanship',
  'consistency',
  'encouragement',
]);
const ENDORSEMENT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const ENDORSEMENT_DAILY_LIMIT = 5;

const safeReadJson = (filePath: string): any => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // ignore corrupted read
  }
  return null;
};

export function createIdentityService(
  rootDir: string,
  opts?: {
    onIdentityUnlocked?: (params: {
      userId: string;
      kind: 'title' | 'badge';
      itemId: string;
      itemName: string;
      rarity: string;
    }) => Promise<void> | void;
    grantDirectCosmetic?: (params: {
      userId: string;
      cosmeticId: string;
      sourceRef: string;
    }) => Promise<boolean>;
    creditGold?: (userId: string, amount: number, source: string, key?: string) => Promise<any>;
    creditFragments?: (userId: string, amount: number, source: string, key?: string) => Promise<any>;
    getUniqueCardCount?: (userId: string) => number;
    getCollectionPercent?: (userId: string) => number;
    getMaxFriendshipLevel?: (userId: string) => number;
    getMarketplaceUnlockCount?: (userId: string) => number;
    isPairBlocked?: (a: string, b: string) => boolean;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_identity_ledger.json');
  let queue: Promise<void> = Promise.resolve();

  const withLock = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    let release!: () => void;
    const prev = queue;
    queue = new Promise<void>(resolve => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  };

  const readLedger = (): IdentityLedgerFile => {
    const parsed = safeReadJson(LEDGER_PATH);
    if (parsed && typeof parsed === 'object') {
      return {
        users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
        globalBadgeOwners:
          parsed.globalBadgeOwners && typeof parsed.globalBadgeOwners === 'object'
            ? parsed.globalBadgeOwners
            : {},
        endorsementReports: Array.isArray(parsed.endorsementReports)
          ? parsed.endorsementReports
          : [],
      };
    }
    return { users: {}, globalBadgeOwners: {}, endorsementReports: [] };
  };

  const writeLedger = (data: IdentityLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const ensureUser = (ledger: IdentityLedgerFile, userId: string): StoredUserIdentity => {
    if (!ledger.users[userId]) {
      ledger.users[userId] = {
        equippedTitleId: null,
        equippedSecondaryTitleId: null,
        featuredBadgeIds: [],
        unlockedTitles: [],
        unlockedBadges: [],
        reputationLedgerKeys: {},
        prestigeTier: 0,
        prestigeHistory: [],
        completedPrestigeChallengeIds: [],
        unlockedPrestigeRewardIds: [],
        endorsementsReceived: [],
        endorsementCooldownsByTarget: {},
        endorsementDailyCounts: {},
        verifiedSnapshot: {
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          totalWorkoutsCompleted: 0,
          totalVerifiedReps: 0,
          totalActiveMinutes: 0,
          totalHabitsCompleted: 0,
          totalAchievementsUnlocked: 0,
          totalBossesDefeated: 0,
          joinedAt: null,
        },
      };
    }
    const u = ledger.users[userId];
    if (u.equippedSecondaryTitleId === undefined) u.equippedSecondaryTitleId = null;
    if (!Array.isArray(u.featuredBadgeIds)) u.featuredBadgeIds = [];
    if (!Array.isArray(u.unlockedTitles)) u.unlockedTitles = [];
    if (!Array.isArray(u.unlockedBadges)) u.unlockedBadges = [];
    if (!u.reputationLedgerKeys || typeof u.reputationLedgerKeys !== 'object') {
      u.reputationLedgerKeys = {};
    }
    if (typeof u.prestigeTier !== 'number') u.prestigeTier = 0;
    if (!Array.isArray(u.prestigeHistory)) u.prestigeHistory = [];
    if (!Array.isArray(u.completedPrestigeChallengeIds)) u.completedPrestigeChallengeIds = [];
    if (!Array.isArray(u.unlockedPrestigeRewardIds)) u.unlockedPrestigeRewardIds = [];
    if (!Array.isArray(u.endorsementsReceived)) u.endorsementsReceived = [];
    if (!u.endorsementCooldownsByTarget) u.endorsementCooldownsByTarget = {};
    if (!u.endorsementDailyCounts) u.endorsementDailyCounts = {};
    return u;
  };

  const aggregateVerifiedPlayerMetrics = (
    userId: string,
    u: StoredUserIdentity
  ): {
    lifetimeStats: PlayerLifetimeStatistics;
    reputationBreakdown: ReputationBreakdown;
    maxSkillLevel: number;
    bossHitsTotal: number;
    seasonTier: number;
    cardsCollected: number;
    collectionPercent: number;
    friendshipLevelMax: number;
    rankedDivisionRank: number;
    marketplaceUnlockCount: number;
    eventMilestonesClaimed: number;
  } => {
    const skillLedger = safeReadJson(path.join(rootDir, '.lifequest_skill_tree_ledger.json'));
    const bossLedger = safeReadJson(path.join(rootDir, '.lifequest_weekly_boss.json'));
    const rivalsLedger = safeReadJson(path.join(rootDir, '.lifequest_rivals.json'));
    const communityLedger = safeReadJson(path.join(rootDir, '.lifequest_community_events.json'));
    const museumLedger = safeReadJson(path.join(rootDir, '.lifequest_museum.json'));
    const seasonsLedger = safeReadJson(path.join(rootDir, '.lifequest_seasons.json'));
    const socialLedger = safeReadJson(path.join(rootDir, '.lifequest_social_privacy_state.json'));
    const ecoCardsLedger = safeReadJson(path.join(rootDir, '.lifequest_aaa_economy_cards.json'));

    const userSkill = skillLedger?.users?.[userId];
    let skillActivities = 0;
    let skillNodesUnlocked = 0;
    let maxSkillLevel = 1;
    let skillStrengthWorkouts = 0;
    let skillCardioWorkouts = 0;
    let skillHabits = 0;
    if (userSkill) {
      skillNodesUnlocked = Array.isArray(userSkill.unlockedNodeIds)
        ? userSkill.unlockedNodeIds.length
        : 0;
      for (const attrId of SKILL_ATTRIBUTE_IDS) {
        const raw = userSkill.attributes?.[attrId];
        if (!raw) continue;
        skillActivities += Number(raw.totalActivities || 0);
        const prog = computeAttributeProgress(
          attrId as SkillAttributeId,
          Number(raw.xp || 0),
          Number(raw.totalActivities || 0),
          0,
          raw.lastActivityAt || null
        );
        if (prog.level > maxSkillLevel) maxSkillLevel = prog.level;
        if (attrId === 'strength') skillStrengthWorkouts += Number(raw.totalActivities || 0);
        if (attrId === 'endurance') skillCardioWorkouts += Number(raw.totalActivities || 0);
        if (attrId === 'discipline') skillHabits += Number(raw.totalActivities || 0);
      }
    }

    const bossContribs = Array.isArray(bossLedger?.contributions)
      ? bossLedger.contributions.filter((c: any) => c.userId === userId)
      : [];
    const totalBossDamage = bossContribs.reduce(
      (sum: number, c: any) => sum + Math.max(0, Number(c.damageDealt || 0)),
      0
    );
    const bossHitsTotal = bossContribs.length;
    const defeatedEventsParticipated = Array.isArray(bossLedger?.events)
      ? bossLedger.events.filter(
          (e: any) =>
            e.status === 'defeated' &&
            bossContribs.some((c: any) => c.eventId === e.id)
        ).length
      : 0;

    const rawRivals = Array.isArray(rivalsLedger?.matches)
      ? rivalsLedger.matches
      : Array.isArray(rivalsLedger?.rivalries)
      ? rivalsLedger.rivalries
      : [];
    const completedRivalries = rawRivals.filter(
      (r: any) =>
        r.status === 'completed' &&
        (r.challengerId === userId || r.opponentId === userId)
    );
    const rivalryWins = completedRivalries.filter((r: any) => r.winnerId === userId).length;
    const rivalRating = Number(rivalsLedger?.profiles?.[userId]?.rating || 1200);
    const rivalDivision = computeRankedDivision(rivalRating);
    const rankedDivisionRank = Math.max(
      1,
      RANKED_DIVISIONS_CATALOG.findIndex(d => d.division === rivalDivision) + 1
    );

    const communityContribs = Array.isArray(communityLedger?.contributions)
      ? communityLedger.contributions.filter((c: any) => c.userId === userId)
      : [];
    const communityPoints = communityContribs.reduce(
      (sum: number, c: any) => sum + Math.max(0, Number(c.pointsAwarded || 0)),
      0
    );
    const eventMilestonesClaimed = Array.isArray(communityLedger?.claims)
      ? communityLedger.claims.filter((c: any) => c.userId === userId).length
      : 0;

    const museumRecords = Array.isArray(museumLedger?.records)
      ? museumLedger.records.filter((r: any) => r.userId === userId)
      : [];

    let seasonTier = 1;
    const activeSeason = Array.isArray(seasonsLedger?.seasons)
      ? seasonsLedger.seasons.find((s: any) => s.status === 'active') || seasonsLedger.seasons[0]
      : null;
    if (activeSeason && seasonsLedger?.playerProgress) {
      const pProg = seasonsLedger.playerProgress[`${activeSeason.id}:${userId}`];
      if (pProg && typeof pProg.currentTier === 'number') {
        seasonTier = pProg.currentTier;
      }
    }

    const syncedProfile = socialLedger?.profiles?.[userId];
    const cardsCollected = opts?.getUniqueCardCount
      ? opts.getUniqueCardCount(userId)
      : Object.keys(ecoCardsLedger?.cards?.[userId]?.owned || {}).length;
    const marketplaceUnlockCount = opts?.getMarketplaceUnlockCount
      ? opts.getMarketplaceUnlockCount(userId)
      : Array.isArray(ecoCardsLedger?.marketplace?.[userId]?.ownedItemIds)
      ? ecoCardsLedger.marketplace[userId].ownedItemIds.length
      : 0;
    const collectionPercent = opts?.getCollectionPercent ? opts.getCollectionPercent(userId) : 0;
    const friendshipLevelMax = opts?.getMaxFriendshipLevel ? opts.getMaxFriendshipLevel(userId) : 1;

    const snap = u.verifiedSnapshot;
    const totalWorkouts = Math.max(
      snap.totalWorkoutsCompleted,
      skillStrengthWorkouts + skillCardioWorkouts,
      Number(syncedProfile?.totalWorkoutsCompleted || 0)
    );
    const totalHabitsCompleted = Math.max(snap.totalHabitsCompleted, skillHabits);
    const longestStreak = Math.max(
      snap.longestStreak,
      snap.currentStreak,
      Number(syncedProfile?.currentStreak || 0)
    );
    const totalBossesDefeated = Math.max(
      snap.totalBossesDefeated,
      defeatedEventsParticipated,
      Number(syncedProfile?.totalBossesDefeated || 0)
    );
    const totalActivities = Math.max(
      skillActivities,
      totalWorkouts + totalHabitsCompleted + bossHitsTotal
    );

    const lifetimeStats: PlayerLifetimeStatistics = {
      totalActivities,
      totalWorkouts,
      totalVerifiedReps: Math.max(
        snap.totalVerifiedReps,
        Number(syncedProfile?.totalVerifiedReps || 0)
      ),
      totalActiveMinutes: Math.max(
        snap.totalActiveMinutes,
        Number(syncedProfile?.totalActiveMinutes || 0)
      ),
      totalHabitsCompleted,
      longestStreak,
      totalAchievementsUnlocked: Math.max(
        snap.totalAchievementsUnlocked,
        Array.isArray(syncedProfile?.achievements) ? syncedProfile.achievements.length : 0
      ),
      totalPersonalRecords: museumRecords.length,
      totalBossDamage,
      totalBossesDefeated,
      rivalryWins,
      communityPoints,
      skillNodesUnlocked,
      joinedAt: snap.joinedAt || null,
    };

    const reputationBreakdown: ReputationBreakdown = {
      workoutsScore: Math.min(800, totalWorkouts * 18),
      consistencyScore: Math.min(700, longestStreak * 20 + totalHabitsCompleted * 6),
      bossParticipationScore: Math.min(
        700,
        Math.round(totalBossDamage / 12) + totalBossesDefeated * 60
      ),
      rivalryScore: Math.min(400, rivalryWins * 55 + completedRivalries.length * 15),
      communityScore: Math.min(
        500,
        Math.round(communityPoints / 5) + u.endorsementsReceived.length * 15
      ),
      skillMasteryScore: Math.min(600, skillNodesUnlocked * 35 + Math.max(0, maxSkillLevel - 1) * 25),
      titlesAndBadgesScore:
        u.unlockedTitles.length * 25 + u.unlockedBadges.length * 30,
    };

    return {
      lifetimeStats,
      reputationBreakdown,
      maxSkillLevel,
      bossHitsTotal,
      seasonTier,
      cardsCollected,
      collectionPercent,
      friendshipLevelMax,
      rankedDivisionRank,
      marketplaceUnlockCount,
      eventMilestonesClaimed,
    };
  };

  const evaluateUserUnlocksInternal = (
    ledger: IdentityLedgerFile,
    userId: string
  ): {
    newlyUnlockedTitles: Array<{ id: string; name: string; rarity: string }>;
    newlyUnlockedBadges: Array<{ id: string; name: string; rarity: string }>;
    state: PlayerIdentityState;
  } => {
    const u = ensureUser(ledger, userId);
    const metrics = aggregateVerifiedPlayerMetrics(userId, u);
    const { lifetimeStats, reputationBreakdown, maxSkillLevel, bossHitsTotal, seasonTier } = metrics;
    const repScore = computeTotalReputation(reputationBreakdown);

    const checkCondition = (condType: string, threshold: number): boolean => {
      switch (condType) {
        case 'workouts_total':
          return lifetimeStats.totalWorkouts >= threshold;
        case 'verified_reps_total':
          return lifetimeStats.totalVerifiedReps >= threshold;
        case 'streak_days':
          return lifetimeStats.longestStreak >= threshold;
        case 'boss_hits_total':
          return bossHitsTotal >= threshold;
        case 'boss_damage_total':
          return lifetimeStats.totalBossDamage >= threshold;
        case 'bosses_defeated':
          return lifetimeStats.totalBossesDefeated >= threshold;
        case 'skill_level_any':
          return maxSkillLevel >= threshold;
        case 'skill_nodes_unlocked':
          return lifetimeStats.skillNodesUnlocked >= threshold;
        case 'achievements_unlocked':
          return lifetimeStats.totalAchievementsUnlocked >= threshold;
        case 'rivalry_wins':
          return lifetimeStats.rivalryWins >= threshold;
        case 'community_points':
          return lifetimeStats.communityPoints >= threshold;
        case 'museum_records':
          return lifetimeStats.totalPersonalRecords >= threshold;
        case 'player_level':
          return u.verifiedSnapshot.level >= threshold;
        case 'season_tier':
          return seasonTier >= threshold;
        case 'reputation_score':
          return repScore >= threshold;
        case 'cards_collected':
          return metrics.cardsCollected >= threshold;
        case 'collection_percent':
          return metrics.collectionPercent >= threshold;
        case 'prestige_tier':
          return u.prestigeTier >= threshold;
        case 'friendship_level':
          return metrics.friendshipLevelMax >= threshold;
        case 'ranked_division':
          return metrics.rankedDivisionRank >= threshold;
        case 'marketplace_unlock':
          return metrics.marketplaceUnlockCount >= threshold;
        case 'event_milestone':
          return metrics.eventMilestonesClaimed >= threshold;
        default:
          return false;
      }
    };

    const nowIso = new Date().toISOString();
    const newlyUnlockedTitles: Array<{ id: string; name: string; rarity: string }> = [];
    const newlyUnlockedBadges: Array<{ id: string; name: string; rarity: string }> = [];

    for (const t of PLAYER_TITLES_CATALOG) {
      if (u.unlockedTitles.some(x => x.titleId === t.id)) continue;
      if (checkCondition(t.conditionType, t.threshold)) {
        u.unlockedTitles.push({
          titleId: t.id,
          unlockedAt: nowIso,
          sourceRef: `${t.conditionType}:${t.threshold}`,
        });
        newlyUnlockedTitles.push({ id: t.id, name: t.name, rarity: t.rarity });
      }
    }

    for (const b of RARE_BADGES_CATALOG) {
      if (b.globalExclusive) continue;
      if (u.unlockedBadges.some(x => x.badgeId === b.id)) continue;
      if (checkCondition(b.conditionType, b.threshold)) {
        u.unlockedBadges.push({
          badgeId: b.id,
          unlockedAt: nowIso,
          sourceRef: `${b.conditionType}:${b.threshold}`,
        });
        newlyUnlockedBadges.push({ id: b.id, name: b.name, rarity: b.rarity });
      }
    }

    const updatedMetrics = aggregateVerifiedPlayerMetrics(userId, u);
    const finalRep = computeTotalReputation(updatedMetrics.reputationBreakdown);

    const state: PlayerIdentityState = {
      userId,
      equippedTitleId: u.equippedTitleId,
      equippedSecondaryTitleId: u.equippedSecondaryTitleId,
      prestigeTier: u.prestigeTier,
      featuredBadgeIds: u.featuredBadgeIds,
      unlockedTitles: u.unlockedTitles,
      unlockedBadges: u.unlockedBadges,
      reputationScore: finalRep,
      reputationTier: getReputationTierLabel(finalRep),
      reputationBreakdown: updatedMetrics.reputationBreakdown,
      lifetimeStats: updatedMetrics.lifetimeStats,
      globalBadgeOwners: ledger.globalBadgeOwners,
    };

    return { newlyUnlockedTitles, newlyUnlockedBadges, state };
  };

  const grantDirectTitle = async (params: {
    userId: string;
    titleId: string;
    sourceRef: string;
  }): Promise<boolean> => {
    const def = PLAYER_TITLES_CATALOG.find(t => t.id === params.titleId);
    if (!def || !params.userId) return false;
    const granted = await withLock(() => {
      const ledger = readLedger();
      const u = ensureUser(ledger, params.userId);
      if (u.unlockedTitles.some(x => x.titleId === params.titleId)) return false;
      u.unlockedTitles.push({
        titleId: params.titleId,
        unlockedAt: new Date().toISOString(),
        sourceRef: params.sourceRef,
      });
      writeLedger(ledger);
      return true;
    });
    if (granted && opts?.onIdentityUnlocked) {
      await opts.onIdentityUnlocked({
        userId: params.userId,
        kind: 'title',
        itemId: def.id,
        itemName: def.name,
        rarity: def.rarity,
      });
    }
    return granted;
  };

  const evaluateAndRecordActivity = async (params: {
    userId: string;
    idempotencyKey?: string;
    snapshot?: Partial<StoredUserIdentity['verifiedSnapshot']>;
  }): Promise<PlayerIdentityState> => {
    const { outcome, unlockedEvents } = await withLock(() => {
      const ledger = readLedger();
      const u = ensureUser(ledger, params.userId);

      if (params.snapshot) {
        const s = params.snapshot;
        if (typeof s.level === 'number' && s.level >= 1) {
          u.verifiedSnapshot.level = Math.max(u.verifiedSnapshot.level, Math.round(s.level));
        }
        if (typeof s.currentStreak === 'number' && s.currentStreak >= 0) {
          u.verifiedSnapshot.currentStreak = Math.round(s.currentStreak);
          u.verifiedSnapshot.longestStreak = Math.max(
            u.verifiedSnapshot.longestStreak,
            u.verifiedSnapshot.currentStreak
          );
        }
        if (typeof s.longestStreak === 'number' && s.longestStreak >= 0) {
          u.verifiedSnapshot.longestStreak = Math.max(
            u.verifiedSnapshot.longestStreak,
            Math.round(s.longestStreak)
          );
        }
        if (typeof s.totalWorkoutsCompleted === 'number' && s.totalWorkoutsCompleted >= 0) {
          u.verifiedSnapshot.totalWorkoutsCompleted = Math.max(
            u.verifiedSnapshot.totalWorkoutsCompleted,
            Math.round(s.totalWorkoutsCompleted)
          );
        }
        if (typeof s.totalVerifiedReps === 'number' && s.totalVerifiedReps >= 0) {
          u.verifiedSnapshot.totalVerifiedReps = Math.max(
            u.verifiedSnapshot.totalVerifiedReps,
            Math.round(s.totalVerifiedReps)
          );
        }
        if (typeof s.totalActiveMinutes === 'number' && s.totalActiveMinutes >= 0) {
          u.verifiedSnapshot.totalActiveMinutes = Math.max(
            u.verifiedSnapshot.totalActiveMinutes,
            Math.round(s.totalActiveMinutes)
          );
        }
        if (typeof s.totalHabitsCompleted === 'number' && s.totalHabitsCompleted >= 0) {
          u.verifiedSnapshot.totalHabitsCompleted = Math.max(
            u.verifiedSnapshot.totalHabitsCompleted,
            Math.round(s.totalHabitsCompleted)
          );
        }
        if (typeof s.totalAchievementsUnlocked === 'number' && s.totalAchievementsUnlocked >= 0) {
          u.verifiedSnapshot.totalAchievementsUnlocked = Math.max(
            u.verifiedSnapshot.totalAchievementsUnlocked,
            Math.round(s.totalAchievementsUnlocked)
          );
        }
        if (typeof s.totalBossesDefeated === 'number' && s.totalBossesDefeated >= 0) {
          u.verifiedSnapshot.totalBossesDefeated = Math.max(
            u.verifiedSnapshot.totalBossesDefeated,
            Math.round(s.totalBossesDefeated)
          );
        }
        if (typeof s.joinedAt === 'string' && s.joinedAt.trim() && !Number.isNaN(Date.parse(s.joinedAt))) {
          u.verifiedSnapshot.joinedAt = u.verifiedSnapshot.joinedAt || s.joinedAt;
        }
      }

      if (params.idempotencyKey && !u.reputationLedgerKeys[params.idempotencyKey]) {
        u.reputationLedgerKeys[params.idempotencyKey] = {
          source: 'verified_activity',
          points: 10,
          createdAt: new Date().toISOString(),
        };
      }

      const evalRes = evaluateUserUnlocksInternal(ledger, params.userId);
      writeLedger(ledger);

      const events: Array<{ kind: 'title' | 'badge'; id: string; name: string; rarity: string }> = [
        ...evalRes.newlyUnlockedTitles.map(t => ({ kind: 'title' as const, ...t })),
        ...evalRes.newlyUnlockedBadges.map(b => ({ kind: 'badge' as const, ...b })),
      ];
      return { outcome: evalRes.state, unlockedEvents: events };
    });

    if (opts?.onIdentityUnlocked) {
      for (const ev of unlockedEvents) {
        await opts.onIdentityUnlocked({
          userId: params.userId,
          kind: ev.kind,
          itemId: ev.id,
          itemName: ev.name,
          rarity: ev.rarity,
        });
      }
    }

    return outcome;
  };

  const buildEndorsementSummary = (
    ledger: IdentityLedgerFile,
    targetUserId: string,
    viewerId?: string | null
  ): PlayerEndorsementSummary => {
    const u = ensureUser(ledger, targetUserId);
    const countsByCategory: Record<EndorsementCategory, number> = {
      helpfulness: 0,
      sportsmanship: 0,
      consistency: 0,
      encouragement: 0,
    };
    for (const e of u.endorsementsReceived) {
      if (VALID_ENDORSEMENT_CATS.has(e.category)) {
        countsByCategory[e.category] += 1;
      }
    }
    const total = u.endorsementsReceived.length;
    const unlockedMilestoneIds = ENDORSEMENT_MILESTONES.filter(m => total >= m.requiredTotal).map(
      m => m.id
    );

    let canEndorseToday = Boolean(viewerId && viewerId !== targetUserId);
    let cooldownReason: string | null = null;
    if (viewerId) {
      if (viewerId === targetUserId) {
        canEndorseToday = false;
        cooldownReason = 'You cannot endorse yourself.';
      } else if (opts?.isPairBlocked?.(targetUserId, viewerId)) {
        canEndorseToday = false;
        cooldownReason = 'Blocked users cannot exchange endorsements.';
      } else {
        const viewer = ensureUser(ledger, viewerId);
        const lastIso = viewer.endorsementCooldownsByTarget[targetUserId];
        if (lastIso && Date.now() - Date.parse(lastIso) < ENDORSEMENT_COOLDOWN_MS) {
          canEndorseToday = false;
          cooldownReason = '24h cooldown active for this adventurer.';
        }
        const today = new Date().toISOString().slice(0, 10);
        if ((viewer.endorsementDailyCounts[today] || 0) >= ENDORSEMENT_DAILY_LIMIT) {
          canEndorseToday = false;
          cooldownReason = `Daily goodwill endorsement limit (${ENDORSEMENT_DAILY_LIMIT}/day) reached.`;
        }
      }
    }

    return {
      targetUserId,
      totalEndorsements: total,
      countsByCategory,
      unlockedMilestoneIds,
      canEndorseToday,
      cooldownReason,
      recentEndorsements: u.endorsementsReceived.slice(0, 12),
    };
  };

  const buildPrestigeState = (userId: string, u: StoredUserIdentity): PlayerPrestigeState => {
    const nextTierDef = PRESTIGE_TIERS_CATALOG.find(t => t.tier === u.prestigeTier + 1) || null;
    const currentDef = PRESTIGE_TIERS_CATALOG.find(t => t.tier === u.prestigeTier) || null;
    const requiredLevel = nextTierDef?.requiredLevel ?? 999;
    const eligibleForNextPrestige = Boolean(
      nextTierDef && u.verifiedSnapshot.level >= nextTierDef.requiredLevel
    );

    return {
      userId,
      prestigeTier: u.prestigeTier,
      eligibleForNextPrestige,
      requiredLevelForNext: requiredLevel,
      currentHeroLevel: u.verifiedSnapshot.level,
      prestigeTitle: currentDef ? `Prestige ${currentDef.roman}: ${currentDef.title}` : 'Unprestiged Champion',
      nextPrestigeTitle: nextTierDef ? `Prestige ${nextTierDef.roman}: ${nextTierDef.title}` : null,
      completedChallengeIds: u.completedPrestigeChallengeIds,
      unlockedRewardIds: u.unlockedPrestigeRewardIds,
      history: u.prestigeHistory,
      neverResetsGuarantee:
        'Additive Honor Only — Prestiging NEVER resets or deletes your Hero XP, levels, workouts, skill trees, inventory, currencies, achievements, or Rivals rating.',
    };
  };

  const getPublicIdentitySummary = (userId: string) => {
    const ledger = readLedger();
    const u = ledger.users[userId];
    if (!u) return null;
    const { reputationBreakdown, lifetimeStats } = aggregateVerifiedPlayerMetrics(userId, u);
    const repScore = computeTotalReputation(reputationBreakdown);
    const titleDef = u.equippedTitleId
      ? PLAYER_TITLES_CATALOG.find(t => t.id === u.equippedTitleId) || null
      : null;
    const secTitleDef = u.equippedSecondaryTitleId
      ? PLAYER_TITLES_CATALOG.find(t => t.id === u.equippedSecondaryTitleId) || null
      : null;
    const featuredBadges = u.featuredBadgeIds
      .map(bid => RARE_BADGES_CATALOG.find(b => b.id === bid))
      .filter((b): b is NonNullable<typeof b> => Boolean(b))
      .map(b => ({
        id: b.id,
        name: b.name,
        rarity: b.rarity,
        iconName: b.iconName,
        description: b.description,
      }));
    return {
      equippedIdentityTitle: titleDef
        ? { id: titleDef.id, name: titleDef.name, rarity: titleDef.rarity }
        : null,
      equippedSecondaryTitle: secTitleDef
        ? { id: secTitleDef.id, name: secTitleDef.name, rarity: secTitleDef.rarity }
        : null,
      prestigeTier: u.prestigeTier || 0,
      endorsementsSummary: buildEndorsementSummary(ledger, userId, null),
      featuredBadges,
      reputationScore: repScore,
      reputationTier: getReputationTierLabel(repScore),
      joinedAt: lifetimeStats.joinedAt,
    };
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/identity/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      const state = await evaluateAndRecordActivity({ userId: auth.userId });
      res.json({ success: true, state });
    });

    app.post('/api/identity/sync-verified', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if (
        'reputation' in body ||
        'reputationScore' in body ||
        'reputationBreakdown' in body ||
        'unlockedTitles' in body ||
        'unlockedBadges' in body ||
        'prestigeTier' in body
      ) {
        res.status(400).json({
          success: false,
          error:
            'Untrusted identity, prestige, or reputation overrides are rejected. Reputation and unlocks are strictly server-computed.',
        });
        return;
      }

      const state = await evaluateAndRecordActivity({
        userId: auth.userId,
        snapshot: body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : undefined,
      });
      res.json({ success: true, state });
    });

    app.post('/api/identity/select-title', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      const titleId =
        req.body?.titleId === null || req.body?.titleId === ''
          ? null
          : String(req.body?.titleId || '').trim();

      const result = await withLock(() => {
        const ledger = readLedger();
        const evalRes = evaluateUserUnlocksInternal(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);

        if (titleId !== null) {
          const isUnlocked = u.unlockedTitles.some(t => t.titleId === titleId);
          if (!isUnlocked) {
            return {
              status: 403,
              payload: {
                success: false,
                error: 'Title is locked. Meet its verified progression requirement first.',
              },
            };
          }
          if (u.equippedSecondaryTitleId === titleId) {
            u.equippedSecondaryTitleId = null;
          }
        }

        u.equippedTitleId = titleId;
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            state: {
              ...evalRes.state,
              equippedTitleId: u.equippedTitleId,
              equippedSecondaryTitleId: u.equippedSecondaryTitleId,
            },
          },
        };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/identity/select-secondary-title', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      const titleId =
        req.body?.titleId === null || req.body?.titleId === ''
          ? null
          : String(req.body?.titleId || '').trim();

      const result = await withLock(() => {
        const ledger = readLedger();
        const evalRes = evaluateUserUnlocksInternal(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);

        if (titleId !== null) {
          if (u.equippedTitleId === titleId) {
            return {
              status: 400,
              payload: {
                success: false,
                error: 'Select a different unlocked title for your secondary honor slot.',
              },
            };
          }
          const isUnlocked = u.unlockedTitles.some(t => t.titleId === titleId);
          if (!isUnlocked) {
            return {
              status: 403,
              payload: {
                success: false,
                error: 'Secondary title is locked. Unlock it first.',
              },
            };
          }
        }

        u.equippedSecondaryTitleId = titleId;
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            state: {
              ...evalRes.state,
              equippedTitleId: u.equippedTitleId,
              equippedSecondaryTitleId: u.equippedSecondaryTitleId,
            },
          },
        };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/identity/feature-badges', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      const badgeIds: string[] = Array.isArray(req.body?.badgeIds)
        ? Array.from(
            new Set<string>(
              req.body.badgeIds.map((x: unknown) => String(x || '').trim()).filter(Boolean)
            )
          ).slice(0, 4)
        : [];

      const result = await withLock(() => {
        const ledger = readLedger();
        const evalRes = evaluateUserUnlocksInternal(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);

        for (const bid of badgeIds) {
          if (!u.unlockedBadges.some(b => b.badgeId === bid)) {
            return {
              status: 403,
              payload: {
                success: false,
                error: `Badge ${bid} is not unlocked on your account.`,
              },
            };
          }
        }

        u.featuredBadgeIds = badgeIds;
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            state: { ...evalRes.state, featuredBadgeIds: u.featuredBadgeIds },
          },
        };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/identity/claim-global-badge', async (req: Request, res: Response) => {
      const caller = await resolveVerifiedCaller(req, {
        expectedOwnerId: req.body?.userId ? String(req.body.userId) : undefined,
      });
      if (!caller.ok || !caller.userId) {
        res.status(caller.status || 401).json({ success: false, error: caller.error || 'Authentication required.' });
        return;
      }
      const userId = caller.userId;

      const badgeId = String(req.body?.badgeId || '').trim();
      const username = String(req.body?.username || 'Champion').slice(0, 48);
      const badgeDef = RARE_BADGES_CATALOG.find(b => b.id === badgeId && b.globalExclusive);
      if (!badgeDef) {
        res.status(400).json({ success: false, error: 'Unknown global exclusive rare badge.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const existingOwner = ledger.globalBadgeOwners[badgeId];
        if (existingOwner) {
          return {
            status: 409,
            payload: {
              success: false,
              alreadyClaimedGlobally: true,
              owner: existingOwner,
              error: `Already claimed globally by ${existingOwner.ownerUsername}.`,
            },
          };
        }

        const u = ensureUser(ledger, userId);
        const { lifetimeStats, reputationBreakdown, seasonTier } =
          aggregateVerifiedPlayerMetrics(userId, u);
        const repScore = computeTotalReputation(reputationBreakdown);

        const actualMetricValue = (() => {
          switch (badgeDef.conditionType) {
            case 'workouts_total':
              return lifetimeStats.totalWorkouts;
            case 'verified_reps_total':
              return lifetimeStats.totalVerifiedReps;
            case 'streak_days':
              return lifetimeStats.longestStreak;
            case 'boss_damage_total':
              return lifetimeStats.totalBossDamage;
            case 'bosses_defeated':
              return lifetimeStats.totalBossesDefeated;
            case 'skill_nodes_unlocked':
              return lifetimeStats.skillNodesUnlocked;
            case 'rivalry_wins':
              return lifetimeStats.rivalryWins;
            case 'community_points':
              return lifetimeStats.communityPoints;
            case 'museum_records':
              return lifetimeStats.totalPersonalRecords;
            case 'season_tier':
              return seasonTier;
            case 'reputation_score':
              return repScore;
            default:
              return 0;
          }
        })();

        if (actualMetricValue < badgeDef.threshold) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Verified requirement not yet met for ${badgeDef.name} (${actualMetricValue}/${badgeDef.threshold}).`,
            },
          };
        }

        const claimedAt = new Date().toISOString();
        ledger.globalBadgeOwners[badgeId] = {
          badgeId,
          ownerId: userId,
          ownerUsername: username,
          claimedAt,
        };
        if (!u.unlockedBadges.some(b => b.badgeId === badgeId)) {
          u.unlockedBadges.push({
            badgeId,
            unlockedAt: claimedAt,
            sourceRef: 'global_first_claim',
            globalClaimOrder: 1,
          });
        }
        const evalRes = evaluateUserUnlocksInternal(ledger, userId);
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            ownership: ledger.globalBadgeOwners[badgeId],
            state: evalRes.state,
          },
        };
      });

      if (outcome.status === 200 && opts?.onIdentityUnlocked) {
        await opts.onIdentityUnlocked({
          userId,
          kind: 'badge',
          itemId: badgeDef.id,
          itemName: badgeDef.name,
          rarity: badgeDef.rarity,
        });
      }

      res.status(outcome.status).json(outcome.payload);
    });

    app.get('/api/identity/public/:targetUserId', (req: Request, res: Response) => {
      const targetUserId = String(req.params.targetUserId || '').trim();
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing targetUserId.' });
        return;
      }
      const summary = getPublicIdentitySummary(targetUserId);
      res.json({ success: true, identity: summary });
    });

    // --- AAA 10: PEER REPUTATION & POSITIVE ENDORSEMENTS ---
    app.get('/api/endorsements/state/:targetUserId', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      const viewerId = auth.ok ? auth.userId || null : null;
      const targetUserId = String(req.params.targetUserId || '').trim();
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing targetUserId.' });
        return;
      }
      const summary = await withLock(() => {
        const ledger = readLedger();
        return buildEndorsementSummary(ledger, targetUserId, viewerId);
      });
      res.json({ success: true, summary });
    });

    app.post('/api/endorsements/give', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('points' in body || 'reputation' in body || 'boost' in body) {
        res.status(400).json({
          success: false,
          error: 'Endorsements cannot include custom point or competitive overrides.',
        });
        return;
      }

      const targetUserId = String(body.targetUserId || '').trim();
      const category = String(body.category || '') as EndorsementCategory;
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 120) : null;
      const fromUsername = String(body.fromUsername || 'Fellow Adventurer').trim().slice(0, 48);

      if (!targetUserId || targetUserId === auth.userId) {
        res.status(400).json({ success: false, error: 'You cannot endorse yourself.' });
        return;
      }
      if (!VALID_ENDORSEMENT_CATS.has(category)) {
        res.status(400).json({ success: false, error: 'Invalid positive endorsement category.' });
        return;
      }
      if (opts?.isPairBlocked?.(targetUserId, auth.userId)) {
        res.status(403).json({ success: false, error: 'Cannot endorse blocked players.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const giver = ensureUser(ledger, auth.userId!);
        const target = ensureUser(ledger, targetUserId);
        const nowMs = Date.now();
        const lastIso = giver.endorsementCooldownsByTarget[targetUserId];
        if (lastIso && nowMs - Date.parse(lastIso) < ENDORSEMENT_COOLDOWN_MS) {
          return {
            status: 429,
            payload: {
              success: false,
              error: '24-hour cooldown active: you already endorsed this adventurer today.',
            },
          };
        }

        const today = new Date(nowMs).toISOString().slice(0, 10);
        const todayCount = Number(giver.endorsementDailyCounts[today] || 0);
        if (todayCount >= ENDORSEMENT_DAILY_LIMIT) {
          return {
            status: 429,
            payload: {
              success: false,
              error: `Daily endorsement cap (${ENDORSEMENT_DAILY_LIMIT}/day) reached.`,
            },
          };
        }

        giver.endorsementCooldownsByTarget[targetUserId] = new Date(nowMs).toISOString();
        giver.endorsementDailyCounts[today] = todayCount + 1;
        target.endorsementsReceived.unshift({
          id: `end-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
          fromUserId: auth.userId!,
          fromUsername,
          category,
          note: note || null,
          createdAt: new Date(nowMs).toISOString(),
        });
        target.endorsementsReceived = target.endorsementsReceived.slice(0, 100);
        writeLedger(ledger);

        return {
          status: 200,
          payload: {
            success: true,
            categoryLabel: ENDORSEMENT_CATEGORIES_META[category].label,
            summary: buildEndorsementSummary(ledger, targetUserId, auth.userId!),
          },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/endorsements/report', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const targetUserId = String(req.body?.targetUserId || '').trim();
      const endorsementId = req.body?.endorsementId ? String(req.body.endorsementId) : undefined;
      const reason = String(req.body?.reason || '').trim().slice(0, 240);
      if (!targetUserId || reason.length < 4) {
        res.status(400).json({ success: false, error: 'Provide a clear reason (min 4 characters).' });
        return;
      }
      await withLock(() => {
        const ledger = readLedger();
        ledger.endorsementReports.unshift({
          id: `erep-${Date.now()}`,
          reporterId: auth.userId!,
          targetUserId,
          endorsementId,
          reason,
          status: 'open',
          createdAt: new Date().toISOString(),
        });
        ledger.endorsementReports = ledger.endorsementReports.slice(0, 200);
        writeLedger(ledger);
      });
      res.json({ success: true, reported: true });
    });

    // --- AAA 11: ADDITIVE PRESTIGE SYSTEM (ZERO RESETS EVER) ---
    app.get('/api/prestige/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const state = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        writeLedger(ledger);
        return buildPrestigeState(auth.userId!, u);
      });
      res.json({ success: true, state });
    });

    app.post('/api/prestige/unlock', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        const nextTier = PRESTIGE_TIERS_CATALOG.find(t => t.tier === u.prestigeTier + 1);
        if (!nextTier) {
          return {
            status: 400,
            payload: { success: false, error: 'Maximum Prestige Tier already attained!' },
          };
        }
        if (u.verifiedSnapshot.level < nextTier.requiredLevel) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Prestige ${nextTier.roman} requires Hero Level ${nextTier.requiredLevel} (currently Level ${u.verifiedSnapshot.level}).`,
            },
          };
        }

        u.prestigeTier = nextTier.tier;
        if (!u.unlockedPrestigeRewardIds.includes(nextTier.title)) {
          u.unlockedPrestigeRewardIds.push(nextTier.title);
        }
        u.prestigeHistory.unshift({
          tier: nextTier.tier,
          tierRoman: nextTier.roman,
          ascendedAt: new Date().toISOString(),
          heroLevelAtAscension: u.verifiedSnapshot.level,
          rewardLabel: nextTier.rewardLabel,
        });

        const evalRes = evaluateUserUnlocksInternal(ledger, auth.userId!);
        writeLedger(ledger);

        return {
          status: 200,
          tierDef: nextTier,
          payload: {
            success: true,
            unlockedTier: nextTier,
            state: buildPrestigeState(auth.userId!, u),
            identityState: evalRes.state,
          },
        };
      });

      if (outcome.status === 200 && outcome.tierDef) {
        if (outcome.tierDef.rewardCosmeticId && opts?.grantDirectCosmetic) {
          await opts.grantDirectCosmetic({
            userId: auth.userId,
            cosmeticId: outcome.tierDef.rewardCosmeticId,
            sourceRef: `prestige:${outcome.tierDef.tier}`,
          });
        }
        if (outcome.tierDef.rewardTitleId) {
          await grantDirectTitle({
            userId: auth.userId,
            titleId: outcome.tierDef.rewardTitleId,
            sourceRef: `prestige:${outcome.tierDef.tier}`,
          });
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/prestige/claim-challenge', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const challengeId = String(req.body?.challengeId || '').trim();
      const ch = PRESTIGE_CHALLENGES_CATALOG.find(c => c.id === challengeId);
      if (!ch) {
        res.status(404).json({ success: false, error: 'Prestige challenge not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        if (u.prestigeTier < ch.minPrestigeTier) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Unlock Prestige Tier ${ch.minPrestigeTier} first.`,
            },
          };
        }
        if (u.completedPrestigeChallengeIds.includes(ch.id)) {
          return {
            status: 409,
            payload: { success: false, error: 'Prestige challenge already claimed.' },
          };
        }

        const metrics = aggregateVerifiedPlayerMetrics(auth.userId!, u);
        if (ch.id === 'pch_steady_week' && metrics.lifetimeStats.totalActivities < 5) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires 5 verified activities (${metrics.lifetimeStats.totalActivities}/5).`,
            },
          };
        }
        if (ch.id === 'pch_community_mentor' && metrics.lifetimeStats.communityPoints < 20) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Contribute to Community Events or Workout Parties first (${metrics.lifetimeStats.communityPoints}/20 pts).`,
            },
          };
        }

        u.completedPrestigeChallengeIds.push(ch.id);
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            rewardGold: ch.rewardGold,
            rewardFragments: ch.rewardFragments,
            state: buildPrestigeState(auth.userId!, u),
          },
        };
      });

      if (outcome.status === 200) {
        if (opts?.creditGold) {
          await opts.creditGold(auth.userId, ch.rewardGold, `Prestige Challenge: ${ch.title}`, `pch_g:${ch.id}:${auth.userId}`);
        }
        if (opts?.creditFragments) {
          await opts.creditFragments(auth.userId, ch.rewardFragments, `Prestige Challenge: ${ch.title}`, `pch_f:${ch.id}:${auth.userId}`);
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });
  };

  return {
    registerRoutes,
    evaluateAndRecordActivity,
    getPublicIdentitySummary,
    grantDirectTitle,
  };
}
