import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveOptionalViewerId, resolveVerifiedCaller } from './authGuard.ts';
import {
  COOP_FRIENDSHIP_MISSIONS,
  DAILY_CALENDAR_REWARDS,
  DAILY_CALENDAR_WEEKLY_MILESTONES,
  FRIENDSHIP_LEVEL_THRESHOLDS,
} from '../src/data/aaaGamingData.ts';
import { PLAYER_TITLES_CATALOG } from '../src/data/polish2Data.ts';
import type {
  CharacterClass,
  DailyCalendarStateResponse,
  FriendshipProgressRecord,
  SeasonalStatsRecap,
  SeasonalStatVisibility,
} from '../src/types/game.ts';

type VerifiedCoopSourceType =
  | 'workout_party'
  | 'coop_mission'
  | 'shared_rivalry'
  | 'milestone_support';

interface StoredPairRecord {
  pairKey: string;
  userIds: [string, string];
  friendshipXp: number;
  friendshipLevel: number;
  totalCoopActivities: number;
  completedMissionIds: string[];
  claimedMissionIdsByUser: Record<string, string[]>;
  unlockedRewardIds: string[];
  dailyXpByDay: Record<string, number>;
  idempotencyKeys: Record<string, boolean>;
  recentHistory: FriendshipProgressRecord['recentHistory'];
  updatedAt: string;
}

interface StoredCalendarUserRecord {
  claimedByMonth: Record<
    string,
    Record<
      number,
      {
        dateKey: string;
        mode: 'workout' | 'rest_recovery' | 'grace_catchup';
        claimedAt: string;
        rewardSummary: string;
      }
    >
  >;
  gracePassesUsedByMonth: Record<string, number>;
  claimedWeeklyMilestonesByMonth: Record<string, string[]>;
}

interface SocialEngagementLedger {
  friendships: Record<string, StoredPairRecord>;
  calendar: Record<string, StoredCalendarUserRecord>;
  recapVisibility: Record<string, SeasonalStatVisibility>;
}

const VALID_COOP_SOURCES = new Set<VerifiedCoopSourceType>([
  'workout_party',
  'coop_mission',
  'shared_rivalry',
  'milestone_support',
]);

const COOP_DAILY_XP_CAP_PER_PAIR = 150;
const MAX_MONTHLY_GRACE_PASSES = 2;

const DEFAULT_RECAP_VISIBILITY: SeasonalStatVisibility = {
  workouts: true,
  activeDays: true,
  personalRecords: true,
  xpAndLevels: true,
  questsAndAchievements: true,
  rivals: true,
  guildAndCommunity: true,
  rarestMilestone: true,
};

const safeReadJson = (p: string): any => {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    // ignore corrupt read
  }
  return null;
};

const getPairKey = (a: string, b: string): string => [a, b].sort().join('::');

const getDateKeyForTimezone = (timezone?: string): { dateKey: string; monthKey: string; dayOfMonth: number } => {
  const tz = typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) {
      return {
        dateKey: `${y}-${m}-${d}`,
        monthKey: `${y}-${m}`,
        dayOfMonth: Math.min(30, Math.max(1, Number(d))),
      };
    }
  } catch {
    // fallback
  }
  const iso = new Date().toISOString().slice(0, 10);
  return {
    dateKey: iso,
    monthKey: iso.slice(0, 7),
    dayOfMonth: Math.min(30, Math.max(1, Number(iso.slice(8, 10)))),
  };
};

const computeFriendshipLevelInfo = (xp: number): { level: number; nextLevelXp: number } => {
  let level = 1;
  let nextLevelXp = FRIENDSHIP_LEVEL_THRESHOLDS[1]?.requiredXp || 100;
  for (let i = 0; i < FRIENDSHIP_LEVEL_THRESHOLDS.length; i++) {
    const tier = FRIENDSHIP_LEVEL_THRESHOLDS[i];
    if (xp >= tier.requiredXp) {
      level = tier.level;
      nextLevelXp = FRIENDSHIP_LEVEL_THRESHOLDS[i + 1]?.requiredXp ?? tier.requiredXp;
    }
  }
  return { level, nextLevelXp };
};

export function createSocialEngagementService(
  rootDir: string,
  deps?: {
    privacyHelper?: {
      getRelationForUsers: (
        targetId: string,
        viewerId: string | null
      ) => { relation: 'self' | 'friends' | 'none' | 'blocked'; blockedByMe: boolean };
      getProfileSnapshot: (userId: string) => any;
    };
    economyCards?: {
      creditGold: (userId: string, amount: number, source: string, key?: string) => Promise<any>;
      creditFragments: (userId: string, amount: number, source: string, key?: string) => Promise<any>;
      grantCollectibleCard: (userId: string, cardId: string, sourceRef: string) => Promise<any>;
      grantCardPack: (userId: string, packId: string, sourceLabel: string) => Promise<any>;
    };
    grantDirectTitle?: (params: {
      userId: string;
      titleId: string;
      sourceRef: string;
    }) => Promise<boolean>;
    onNotifyUser?: (params: {
      userId: string;
      eventKey: string;
      title: string;
      body: string;
      actionTab?: string;
    }) => Promise<void>;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_social_engagement.json');
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

  const readLedger = (): SocialEngagementLedger => {
    const parsed = safeReadJson(LEDGER_PATH);
    if (parsed && typeof parsed === 'object') {
      return {
        friendships:
          parsed.friendships && typeof parsed.friendships === 'object' ? parsed.friendships : {},
        calendar: parsed.calendar && typeof parsed.calendar === 'object' ? parsed.calendar : {},
        recapVisibility:
          parsed.recapVisibility && typeof parsed.recapVisibility === 'object'
            ? parsed.recapVisibility
            : {},
      };
    }
    return { friendships: {}, calendar: {}, recapVisibility: {} };
  };

  const writeLedger = (ledger: SocialEngagementLedger) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
  };

  const ensurePair = (
    ledger: SocialEngagementLedger,
    a: string,
    b: string
  ): StoredPairRecord => {
    const key = getPairKey(a, b);
    if (!ledger.friendships[key]) {
      const sorted = [a, b].sort() as [string, string];
      ledger.friendships[key] = {
        pairKey: key,
        userIds: sorted,
        friendshipXp: 0,
        friendshipLevel: 1,
        totalCoopActivities: 0,
        completedMissionIds: [],
        claimedMissionIdsByUser: {},
        unlockedRewardIds: [],
        dailyXpByDay: {},
        idempotencyKeys: {},
        recentHistory: [],
        updatedAt: new Date().toISOString(),
      };
    }
    const rec = ledger.friendships[key];
    if (!rec.claimedMissionIdsByUser) rec.claimedMissionIdsByUser = {};
    if (!rec.dailyXpByDay) rec.dailyXpByDay = {};
    if (!rec.idempotencyKeys) rec.idempotencyKeys = {};
    if (!Array.isArray(rec.recentHistory)) rec.recentHistory = [];
    return rec;
  };

  const ensureCalendarUser = (
    ledger: SocialEngagementLedger,
    userId: string
  ): StoredCalendarUserRecord => {
    if (!ledger.calendar[userId]) {
      ledger.calendar[userId] = {
        claimedByMonth: {},
        gracePassesUsedByMonth: {},
        claimedWeeklyMilestonesByMonth: {},
      };
    }
    const c = ledger.calendar[userId];
    if (!c.claimedByMonth) c.claimedByMonth = {};
    if (!c.gracePassesUsedByMonth) c.gracePassesUsedByMonth = {};
    if (!c.claimedWeeklyMilestonesByMonth) c.claimedWeeklyMilestonesByMonth = {};
    return c;
  };

  const toFriendshipView = (
    pair: StoredPairRecord,
    viewerId: string
  ): FriendshipProgressRecord => {
    const friendId = pair.userIds[0] === viewerId ? pair.userIds[1] : pair.userIds[0];
    const snap = deps?.privacyHelper?.getProfileSnapshot?.(friendId);
    const { level, nextLevelXp } = computeFriendshipLevelInfo(pair.friendshipXp);
    return {
      pairKey: pair.pairKey,
      friendId,
      friendUsername: String(snap?.username || snap?.characterName || 'Adventurer'),
      friendClass: (snap?.characterClass || 'Warrior') as CharacterClass,
      friendLevel: Math.max(1, Number(snap?.level || 1)),
      friendshipXp: pair.friendshipXp,
      friendshipLevel: level,
      nextLevelXp,
      totalCoopActivities: pair.totalCoopActivities,
      completedMissionIds: pair.completedMissionIds,
      unlockedRewardIds: pair.unlockedRewardIds,
      recentHistory: pair.recentHistory.slice(0, 20),
      updatedAt: pair.updatedAt,
    };
  };

  const awardVerifiedCoopInternal = async (params: {
    userId: string;
    friendId: string;
    sourceType: VerifiedCoopSourceType;
    label: string;
    idempotencyKey: string;
    timezone?: string;
  }) => {
    const { userId, friendId, sourceType, label, idempotencyKey, timezone } = params;
    if (!userId || !friendId || userId === friendId) {
      return { ok: false, status: 400, error: 'Cannot record friendship progress with yourself.' };
    }
    if (!VALID_COOP_SOURCES.has(sourceType)) {
      return {
        ok: false,
        status: 400,
        error: 'Friendship XP requires verified cooperative activity (messages and spam likes do not grant XP).',
      };
    }
    if (deps?.privacyHelper?.getRelationForUsers(friendId, userId).relation === 'blocked') {
      return {
        ok: false,
        status: 403,
        error: 'Cannot build friendship progression with a blocked user.',
      };
    }

    const { dateKey } = getDateKeyForTimezone(timezone);
    const xpBySource: Record<VerifiedCoopSourceType, number> = {
      workout_party: 65,
      shared_rivalry: 55,
      milestone_support: 30,
      coop_mission: 45,
    };

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const pair = ensurePair(ledger, userId, friendId);
      const dedupeKey = `${pair.pairKey}:${idempotencyKey}`;
      if (pair.idempotencyKeys[dedupeKey]) {
        return {
          ok: true,
          status: 200,
          duplicate: true,
          xpAwarded: 0,
          levelReached: pair.friendshipLevel,
          titlesToGrant: [] as string[],
          record: toFriendshipView(pair, userId),
        };
      }

      const usedToday = Number(pair.dailyXpByDay[dateKey] || 0);
      const remaining = Math.max(0, COOP_DAILY_XP_CAP_PER_PAIR - usedToday);
      const award = Math.min(xpBySource[sourceType], remaining);

      pair.idempotencyKeys[dedupeKey] = true;
      pair.dailyXpByDay[dateKey] = usedToday + award;
      pair.friendshipXp += award;
      pair.totalCoopActivities += 1;

      const lvlInfo = computeFriendshipLevelInfo(pair.friendshipXp);
      pair.friendshipLevel = lvlInfo.level;

      const titlesToGrant: string[] = [];
      if (lvlInfo.level >= 3 && !pair.unlockedRewardIds.includes('title_oathbound_ally')) {
        pair.unlockedRewardIds.push('title_oathbound_ally');
        titlesToGrant.push('title_oathbound_ally');
      }
      if (lvlInfo.level >= 5 && !pair.unlockedRewardIds.includes('title_kindred_vanguard')) {
        pair.unlockedRewardIds.push('title_kindred_vanguard');
        titlesToGrant.push('title_kindred_vanguard');
      }

      for (const m of COOP_FRIENDSHIP_MISSIONS) {
        if (pair.totalCoopActivities >= m.targetActivities && !pair.completedMissionIds.includes(m.id)) {
          pair.completedMissionIds.push(m.id);
        }
      }

      pair.recentHistory.unshift({
        id: `fh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceType,
        label: label.slice(0, 90),
        xpAwarded: award,
        createdAt: new Date().toISOString(),
      });
      pair.recentHistory = pair.recentHistory.slice(0, 30);
      pair.updatedAt = new Date().toISOString();
      writeLedger(ledger);

      return {
        ok: true,
        status: 200,
        duplicate: false,
        xpAwarded: award,
        levelReached: lvlInfo.level,
        titlesToGrant,
        record: toFriendshipView(pair, userId),
      };
    });

    if (outcome.ok && outcome.titlesToGrant.length > 0 && deps?.grantDirectTitle) {
      for (const tid of outcome.titlesToGrant) {
        await deps.grantDirectTitle({ userId, titleId: tid, sourceRef: `friendship:${friendId}` });
        await deps.grantDirectTitle({ userId: friendId, titleId: tid, sourceRef: `friendship:${userId}` });
      }
    }

    return outcome;
  };

  const getMaxFriendshipLevelSync = (userId: string): number => {
    const ledger = readLedger();
    let maxLvl = 1;
    for (const pair of Object.values(ledger.friendships)) {
      if (pair.userIds.includes(userId)) {
        const { level } = computeFriendshipLevelInfo(pair.friendshipXp);
        if (level > maxLvl) maxLvl = level;
      }
    }
    return maxLvl;
  };

  const buildCalendarResponse = (
    ledger: SocialEngagementLedger,
    userId: string,
    timezone?: string
  ): DailyCalendarStateResponse => {
    const rec = ensureCalendarUser(ledger, userId);
    const { dateKey, monthKey, dayOfMonth } = getDateKeyForTimezone(timezone);
    const monthClaims = rec.claimedByMonth[monthKey] || {};
    const claimedWeekly = rec.claimedWeeklyMilestonesByMonth[monthKey] || [];
    const graceUsed = Number(rec.gracePassesUsedByMonth[monthKey] || 0);

    const days = DAILY_CALENDAR_REWARDS.map(r => {
      const claim = monthClaims[r.dayNumber];
      return {
        ...r,
        claimed: Boolean(claim),
        claimedMode: claim?.mode || null,
        claimedAt: claim?.claimedAt || null,
      };
    });

    const claimedToday =
      Boolean(monthClaims[dayOfMonth]) ||
      Object.values(monthClaims).some(entry => entry.dateKey === dateKey);

    const totalClaimedThisMonth = Object.keys(monthClaims).length;
    const activeParticipationDays = Object.values(monthClaims).filter(
      c => c.mode === 'workout' || c.mode === 'rest_recovery'
    ).length;

    const missedDaysRecoverable: number[] = [];
    for (let d = 1; d < dayOfMonth; d++) {
      if (!monthClaims[d]) missedDaysRecoverable.push(d);
    }

    const weeklyMilestones = DAILY_CALENDAR_WEEKLY_MILESTONES.map(ms => ({
      id: ms.id,
      dayTarget: ms.dayTarget,
      title: ms.title,
      rewardLabel: ms.rewardLabel,
      unlocked: totalClaimedThisMonth >= ms.dayTarget,
      claimed: claimedWeekly.includes(ms.id),
    }));

    return {
      userId,
      monthKey,
      todayDateKey: dateKey,
      claimedToday,
      totalClaimedThisMonth,
      activeParticipationDays,
      gracePassesRemaining: Math.max(0, MAX_MONTHLY_GRACE_PASSES - graceUsed),
      missedDaysRecoverable,
      weeklyMilestones,
      days,
    };
  };

  const buildSeasonalRecap = (
    ledger: SocialEngagementLedger,
    targetUserId: string,
    requestedSeasonId?: string,
    viewerId?: string | null
  ): SeasonalStatsRecap | null => {
    const seasonsLedger = safeReadJson(path.join(rootDir, '.lifequest_seasons.json'));
    const skillLedger = safeReadJson(path.join(rootDir, '.lifequest_skill_tree_ledger.json'));
    const museumLedger = safeReadJson(path.join(rootDir, '.lifequest_museum.json'));
    const rivalsLedger = safeReadJson(path.join(rootDir, '.lifequest_rivals.json'));
    const communityLedger = safeReadJson(path.join(rootDir, '.lifequest_community_events.json'));
    const territoryLedger = safeReadJson(path.join(rootDir, '.lifequest_territory_wars.json'));
    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));

    const allSeasons: any[] = Array.isArray(seasonsLedger?.seasons) ? seasonsLedger.seasons : [];
    const season =
      (requestedSeasonId ? allSeasons.find(s => s.id === requestedSeasonId) : null) ||
      allSeasons.find(s => s.status === 'active') ||
      allSeasons[0];

    if (!season) return null;

    const pProg = seasonsLedger?.playerProgress?.[`${season.id}:${targetUserId}`] || null;
    const isArchived = season.status === 'archived';
    const startMs = Date.parse(season.startsAt || '1970-01-01');
    const endMs = Date.parse(season.endsAt || new Date().toISOString());

    const visibility = ledger.recapVisibility[targetUserId] || DEFAULT_RECAP_VISIBILITY;

    // Verified activities from skill ledger inside season window
    const events: any[] = Array.isArray(skillLedger?.users?.[targetUserId]?.recentEvents)
      ? skillLedger.users[targetUserId].recentEvents
      : [];
    const seasonEvents = events.filter(ev => {
      const ts = Date.parse(ev.createdAt || '');
      return !Number.isNaN(ts) && ts >= startMs && ts <= endMs;
    });

    const verifiedWorkouts = Math.max(
      Number(pProg?.challengeCounts?.workouts || 0),
      seasonEvents.filter(
        ev => ev.activityType === 'strength_workout' || ev.activityType === 'cardio_workout'
      ).length
    );

    const activeDaySet = new Set<string>();
    for (const ev of seasonEvents) {
      if (ev.dailyBucket) activeDaySet.add(String(ev.dailyBucket));
    }
    for (const dayKey of Object.keys(pProg?.dailyXpByDay || {})) {
      activeDaySet.add(dayKey);
    }
    const activeDays = activeDaySet.size;

    const museumRecords = (Array.isArray(museumLedger?.records) ? museumLedger.records : []).filter(
      (r: any) =>
        r.userId === targetUserId &&
        Date.parse(r.achievedAt || '') >= startMs &&
        Date.parse(r.achievedAt || '') <= endMs
    );
    const personalRecordsSet = museumRecords.filter((r: any) => r.isPersonalBest).length;

    const completedRivals = (Array.isArray(rivalsLedger?.matches) ? rivalsLedger.matches : []).filter(
      (m: any) =>
        m.status === 'completed' &&
        (m.challengerId === targetUserId || m.opponentId === targetUserId) &&
        Date.parse(m.resolvedAt || m.endsAt || '') >= startMs &&
        Date.parse(m.resolvedAt || m.endsAt || '') <= endMs
    );
    const rivalsWins = completedRivals.filter((m: any) => m.winnerId === targetUserId).length;
    const rivalsLosses = completedRivals.filter(
      (m: any) => !m.isTie && m.winnerId && m.winnerId !== targetUserId
    ).length;
    const rivalsRatingDelta = completedRivals.reduce((sum: number, m: any) => {
      const d =
        m.challengerId === targetUserId ? m.challengerRatingDelta : m.opponentRatingDelta;
      return sum + Number(d || 0);
    }, 0);

    const communityPts = (Array.isArray(communityLedger?.contributions)
      ? communityLedger.contributions
      : []
    )
      .filter((c: any) => c.userId === targetUserId)
      .reduce((s: number, c: any) => s + Number(c.pointsAwarded || 0), 0);
    const territoryPts = Number(territoryLedger?.userPoints?.[targetUserId] || 0);

    const unlockedTitles: any[] = identityLedger?.users?.[targetUserId]?.unlockedTitles || [];
    let rarestTitle = 'Rising Champion';
    let rarestRarity = 'Common';
    const rarityRank: Record<string, number> = {
      Common: 1,
      Uncommon: 2,
      Rare: 3,
      Epic: 4,
      Legendary: 5,
      Mythic: 6,
    };
    for (const ut of unlockedTitles) {
      const def = PLAYER_TITLES_CATALOG.find(t => t.id === ut.titleId);
      if (def && (rarityRank[def.rarity] || 0) >= (rarityRank[rarestRarity] || 0)) {
        rarestTitle = def.name;
        rarestRarity = def.rarity;
      }
    }

    const previousSeason = allSeasons.find(
      s => s.id !== season.id && s.seasonNumber < season.seasonNumber
    );
    const prevProg = previousSeason
      ? seasonsLedger?.playerProgress?.[`${previousSeason.id}:${targetUserId}`]
      : null;

    const isSelf = !viewerId || viewerId === targetUserId;
    const mask = (allowed: boolean, val: number) => (isSelf || allowed ? val : 0);

    return {
      seasonId: season.id,
      seasonName: season.name,
      seasonNumber: season.seasonNumber,
      isArchived,
      generatedAt: new Date().toISOString(),
      verifiedWorkouts: mask(visibility.workouts, verifiedWorkouts),
      activeDays: mask(visibility.activeDays, activeDays),
      personalRecordsSet: mask(visibility.personalRecords, personalRecordsSet),
      seasonXpGained: mask(visibility.xpAndLevels, Number(pProg?.seasonXp || 0)),
      tierReached: mask(visibility.xpAndLevels, Number(pProg?.currentTier || 1)),
      questsCompleted: mask(
        visibility.questsAndAchievements,
        Number(pProg?.verifiedActivitiesCount || 0)
      ),
      achievementsUnlocked: mask(
        visibility.questsAndAchievements,
        Number(identityLedger?.users?.[targetUserId]?.verifiedSnapshot?.totalAchievementsUnlocked || 0)
      ),
      rivalsWins: mask(visibility.rivals, rivalsWins),
      rivalsLosses: mask(visibility.rivals, rivalsLosses),
      rivalsRatingDelta: mask(visibility.rivals, rivalsRatingDelta),
      guildAndCommunityPoints: mask(visibility.guildAndCommunity, communityPts + territoryPts),
      rarestMilestoneTitle:
        isSelf || visibility.rarestMilestone ? rarestTitle : 'Private Milestone',
      rarestMilestoneRarity:
        isSelf || visibility.rarestMilestone ? rarestRarity : 'Hidden',
      visibility,
      previousSeasonComparison:
        previousSeason && prevProg
          ? {
              previousSeasonName: previousSeason.name,
              workoutsDelta: verifiedWorkouts - Number(prevProg?.challengeCounts?.workouts || 0),
              activeDaysDelta: activeDays - Object.keys(prevProg?.dailyXpByDay || {}).length,
              seasonXpDelta: Number(pProg?.seasonXp || 0) - Number(prevProg?.seasonXp || 0),
              rivalsRatingDelta,
            }
          : null,
    };
  };

  const registerRoutes = (app: Express) => {
    // --- AAA 4: FRIENDSHIP LEVELS ---
    app.get('/api/friendships/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const state = await withLock(() => {
        const ledger = readLedger();
        const mySnap = deps?.privacyHelper?.getProfileSnapshot?.(auth.userId!);
        const friendIds: string[] = Array.isArray(mySnap?.friendIds) ? mySnap.friendIds : [];
        for (const fid of friendIds) {
          if (deps?.privacyHelper?.getRelationForUsers(fid, auth.userId!).relation !== 'blocked') {
            ensurePair(ledger, auth.userId!, fid);
          }
        }
        writeLedger(ledger);

        const records = Object.values(ledger.friendships)
          .filter(pair => {
            if (!pair.userIds.includes(auth.userId!)) return false;
            const otherId = pair.userIds[0] === auth.userId ? pair.userIds[1] : pair.userIds[0];
            return deps?.privacyHelper?.getRelationForUsers(otherId, auth.userId!).relation !== 'blocked';
          })
          .map(pair => toFriendshipView(pair, auth.userId!))
          .sort((a, b) => b.friendshipXp - a.friendshipXp);

        return { friendships: records, coopMissions: COOP_FRIENDSHIP_MISSIONS };
      });

      res.json({ success: true, ...state });
    });

    app.get('/api/friendships/history/:friendId', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const friendId = String(req.params.friendId || '').trim();
      const record = await withLock(() => {
        const ledger = readLedger();
        const pair = ensurePair(ledger, auth.userId!, friendId);
        return toFriendshipView(pair, auth.userId!);
      });
      res.json({ success: true, record });
    });

    app.post('/api/friendships/record-coop', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('friendshipXp' in body || 'xp' in body || 'level' in body) {
        res.status(400).json({
          success: false,
          error: 'Client-supplied friendship XP overrides are rejected.',
        });
        return;
      }
      const friendId = String(body.friendId || '').trim();
      const sourceType = String(body.sourceType || '') as VerifiedCoopSourceType;
      const label = String(body.label || 'Shared Verified Effort').trim();
      const idempotencyKey =
        String(body.idempotencyKey || '').trim() ||
        `coop:${sourceType}:${Date.now()}`;

      if (!friendId) {
        res.status(400).json({ success: false, error: 'Missing friendId.' });
        return;
      }

      const outcome = await awardVerifiedCoopInternal({
        userId: auth.userId,
        friendId,
        sourceType,
        label,
        idempotencyKey,
        timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
      });

      res.status(outcome.status).json(outcome);
    });

    app.post('/api/friendships/claim-mission', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const friendId = String(req.body?.friendId || '').trim();
      const missionId = String(req.body?.missionId || '').trim();
      const mission = COOP_FRIENDSHIP_MISSIONS.find(m => m.id === missionId);
      if (!mission || !friendId) {
        res.status(404).json({ success: false, error: 'Cooperative mission or friend not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const pair = ensurePair(ledger, auth.userId!, friendId);
        if (pair.totalCoopActivities < mission.targetActivities) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Mission requires ${mission.targetActivities} cooperative activities (${pair.totalCoopActivities}/${mission.targetActivities}).`,
            },
          };
        }
        const userClaimed = pair.claimedMissionIdsByUser[auth.userId!] || [];
        if (userClaimed.includes(mission.id)) {
          return {
            status: 409,
            payload: { success: false, error: 'Cooperative mission already claimed.' },
          };
        }

        userClaimed.push(mission.id);
        pair.claimedMissionIdsByUser[auth.userId!] = userClaimed;
        pair.friendshipXp += mission.friendshipXpReward;
        const lvlInfo = computeFriendshipLevelInfo(pair.friendshipXp);
        pair.friendshipLevel = lvlInfo.level;
        pair.recentHistory.unshift({
          id: `fh-ms-${Date.now()}`,
          sourceType: 'coop_mission',
          label: `Claimed Coop Mission: ${mission.title}`,
          xpAwarded: mission.friendshipXpReward,
          createdAt: new Date().toISOString(),
        });
        pair.updatedAt = new Date().toISOString();
        writeLedger(ledger);

        return {
          status: 200,
          payload: {
            success: true,
            xpAwarded: mission.friendshipXpReward,
            record: toFriendshipView(pair, auth.userId!),
          },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/friendships/reset-on-removal', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const friendId = String(req.body?.friendId || '').trim();
      if (!friendId) {
        res.status(400).json({ success: false, error: 'Missing friendId.' });
        return;
      }
      await withLock(() => {
        const ledger = readLedger();
        const key = getPairKey(auth.userId!, friendId);
        if (ledger.friendships[key]) {
          delete ledger.friendships[key];
          writeLedger(ledger);
        }
      });
      res.json({ success: true });
    });

    // --- AAA 12: FLEXIBLE 30-DAY DAILY REWARD CALENDAR ---
    app.get('/api/calendar/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : 'UTC';
      const state = await withLock(() => {
        const ledger = readLedger();
        const data = buildCalendarResponse(ledger, auth.userId!, timezone);
        writeLedger(ledger);
        return data;
      });
      res.json({ success: true, state });
    });

    app.post('/api/calendar/checkin', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';
      const rawMode = String(body.mode || 'workout');
      const requestedDay =
        typeof body.catchUpDayNumber === 'number' ? Math.round(body.catchUpDayNumber) : null;

      const { dateKey, monthKey, dayOfMonth } = getDateKeyForTimezone(timezone);

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const rec = ensureCalendarUser(ledger, auth.userId!);
        if (!rec.claimedByMonth[monthKey]) rec.claimedByMonth[monthKey] = {};
        const monthClaims = rec.claimedByMonth[monthKey];

        // Catch-up forgiveness flow for a past missed day this month
        if (requestedDay !== null) {
          if (requestedDay < 1 || requestedDay >= dayOfMonth) {
            return {
              status: 400,
              payload: {
                success: false,
                error: 'Grace catch-up passes can only recover an earlier missed day in the current month.',
              },
            };
          }
          if (monthClaims[requestedDay]) {
            return {
              status: 409,
              payload: { success: false, error: `Day ${requestedDay} has already been claimed.` },
            };
          }
          const usedPasses = Number(rec.gracePassesUsedByMonth[monthKey] || 0);
          if (usedPasses >= MAX_MONTHLY_GRACE_PASSES) {
            return {
              status: 400,
              payload: {
                success: false,
                error: `All ${MAX_MONTHLY_GRACE_PASSES} monthly Grace Catch-Up Passes have been used.`,
              },
            };
          }

          const rewardDef = DAILY_CALENDAR_REWARDS[requestedDay - 1];
          rec.gracePassesUsedByMonth[monthKey] = usedPasses + 1;
          monthClaims[requestedDay] = {
            dateKey,
            mode: 'grace_catchup',
            claimedAt: new Date().toISOString(),
            rewardSummary: rewardDef.rewardLabel,
          };
          writeLedger(ledger);
          return {
            status: 200,
            dayClaimed: requestedDay,
            rewardDef,
            payload: {
              success: true,
              dayClaimed: requestedDay,
              mode: 'grace_catchup',
              rewardLabel: rewardDef.rewardLabel,
              state: buildCalendarResponse(ledger, auth.userId!, timezone),
            },
          };
        }

        // Standard Today Check-In (Workout OR Rest & Recovery)
        const alreadyToday =
          Boolean(monthClaims[dayOfMonth]) ||
          Object.values(monthClaims).some(entry => entry.dateKey === dateKey);
        if (alreadyToday) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'Today’s daily calendar reward has already been claimed.',
            },
          };
        }

        const mode: 'workout' | 'rest_recovery' =
          rawMode === 'rest_recovery' || rawMode === 'recovery' || rawMode === 'rest'
            ? 'rest_recovery'
            : 'workout';

        const rewardDef = DAILY_CALENDAR_REWARDS[dayOfMonth - 1];
        monthClaims[dayOfMonth] = {
          dateKey,
          mode,
          claimedAt: new Date().toISOString(),
          rewardSummary: rewardDef.rewardLabel,
        };
        writeLedger(ledger);

        return {
          status: 200,
          dayClaimed: dayOfMonth,
          rewardDef,
          payload: {
            success: true,
            dayClaimed: dayOfMonth,
            mode,
            rewardLabel: rewardDef.rewardLabel,
            state: buildCalendarResponse(ledger, auth.userId!, timezone),
          },
        };
      });

      let updatedWallet: any = undefined;
      if (outcome.status === 200 && outcome.rewardDef && deps?.economyCards) {
        const rd = outcome.rewardDef;
        const dedupe = `cal:${monthKey}:${outcome.dayClaimed}:${auth.userId}`;
        if (rd.rewardType === 'gold' || rd.rewardType === 'quest_bonus') {
          updatedWallet = await deps.economyCards.creditGold(
            auth.userId,
            rd.amount,
            `Daily Calendar Day ${rd.dayNumber}`,
            dedupe
          );
        } else if (rd.rewardType === 'fragments') {
          updatedWallet = await deps.economyCards.creditFragments(
            auth.userId,
            rd.amount,
            `Daily Calendar Day ${rd.dayNumber}`,
            dedupe
          );
        } else if (rd.rewardType === 'card') {
          await deps.economyCards.grantCollectibleCard(
            auth.userId,
            'card_fit_stillwater',
            dedupe
          );
        } else if (rd.rewardType === 'card_pack') {
          await deps.economyCards.grantCardPack(
            auth.userId,
            rd.dayNumber === 30 ? 'pack_mythic_vanguard' : 'pack_seasonal_canopy',
            dedupe
          );
        }
        if (typeof (deps.economyCards as any).getWalletSummarySync === 'function') {
          (outcome.payload as any).wallet = (deps.economyCards as any).getWalletSummarySync(auth.userId);
        }
      }

      res.status(outcome.status).json(
        updatedWallet ? { ...outcome.payload, wallet: updatedWallet } : outcome.payload
      );
    });

    app.post('/api/calendar/claim-weekly-milestone', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const milestoneId = String(req.body?.milestoneId || '').trim();
      const timezone = typeof req.body?.timezone === 'string' ? req.body.timezone : 'UTC';
      const ms = DAILY_CALENDAR_WEEKLY_MILESTONES.find(m => m.id === milestoneId);
      if (!ms) {
        res.status(404).json({ success: false, error: 'Calendar weekly milestone not found.' });
        return;
      }
      const { monthKey } = getDateKeyForTimezone(timezone);

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const rec = ensureCalendarUser(ledger, auth.userId!);
        const claimed = rec.claimedWeeklyMilestonesByMonth[monthKey] || [];
        if (claimed.includes(ms.id)) {
          return {
            status: 409,
            payload: { success: false, error: 'Weekly milestone already claimed this month.' },
          };
        }
        const totalClaimed = Object.keys(rec.claimedByMonth[monthKey] || {}).length;
        if (totalClaimed < ms.dayTarget) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires ${ms.dayTarget} monthly check-ins (${totalClaimed}/${ms.dayTarget}).`,
            },
          };
        }

        claimed.push(ms.id);
        rec.claimedWeeklyMilestonesByMonth[monthKey] = claimed;
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            rewardGold: ms.rewardGold,
            rewardFragments: ms.rewardFragments,
            state: buildCalendarResponse(ledger, auth.userId!, timezone),
          },
        };
      });

      let updatedWallet: any = undefined;
      if (outcome.status === 200 && deps?.economyCards) {
        await deps.economyCards.creditGold(
          auth.userId,
          ms.rewardGold,
          `Calendar Milestone: ${ms.title}`,
          `cal_wk_g:${monthKey}:${ms.id}:${auth.userId}`
        );
        updatedWallet = await deps.economyCards.creditFragments(
          auth.userId,
          ms.rewardFragments,
          `Calendar Milestone: ${ms.title}`,
          `cal_wk_f:${monthKey}:${ms.id}:${auth.userId}`
        );
        if (typeof (deps.economyCards as any).getWalletSummarySync === 'function') {
          (outcome.payload as any).wallet = (deps.economyCards as any).getWalletSummarySync(auth.userId);
        }
      }

      res.status(outcome.status).json(
        updatedWallet ? { ...outcome.payload, wallet: updatedWallet } : outcome.payload
      );
    });

    // --- AAA 15: SEASONAL STATISTICS RECAP ---
    app.get('/api/seasons/recap', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId.trim() : undefined;
      const recap = await withLock(() => {
        const ledger = readLedger();
        return buildSeasonalRecap(ledger, auth.userId!, seasonId, auth.userId!);
      });
      if (!recap) {
        res.json({ success: true, recap: null });
        return;
      }
      res.json({ success: true, recap });
    });

    app.get('/api/seasons/recap/public/:targetUserId', async (req: Request, res: Response) => {
      const targetUserId = String(req.params.targetUserId || '').trim();
      const viewerId = await resolveOptionalViewerId(req);
      const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId.trim() : undefined;
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing targetUserId.' });
        return;
      }
      if (viewerId && deps?.privacyHelper?.getRelationForUsers(targetUserId, viewerId).relation === 'blocked') {
        res.status(403).json({ success: false, error: 'Unavailable.' });
        return;
      }
      const ledger = readLedger();
      const recap = buildSeasonalRecap(ledger, targetUserId, seasonId, viewerId);
      res.json({ success: true, recap });
    });

    app.post('/api/seasons/recap/visibility', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const raw = req.body?.visibility && typeof req.body.visibility === 'object' ? req.body.visibility : {};
      const next: SeasonalStatVisibility = {
        workouts: raw.workouts !== false,
        activeDays: raw.activeDays !== false,
        personalRecords: raw.personalRecords !== false,
        xpAndLevels: raw.xpAndLevels !== false,
        questsAndAchievements: raw.questsAndAchievements !== false,
        rivals: raw.rivals !== false,
        guildAndCommunity: raw.guildAndCommunity !== false,
        rarestMilestone: raw.rarestMilestone !== false,
      };
      const recap = await withLock(() => {
        const ledger = readLedger();
        ledger.recapVisibility[auth.userId!] = next;
        writeLedger(ledger);
        return buildSeasonalRecap(ledger, auth.userId!, undefined, auth.userId!);
      });
      res.json({ success: true, visibility: next, recap });
    });
  };

  return {
    registerRoutes,
    awardVerifiedCoopInternal,
    getMaxFriendshipLevelSync,
  };
}
