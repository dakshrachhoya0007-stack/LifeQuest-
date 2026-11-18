import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import { buildInitialSeasonsCatalog } from '../src/data/polish2Data.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  ArchivedSeasonSummary,
  CharacterClass,
  PlayerSeasonStateResponse,
  SeasonalCosmeticRecord,
  SeasonDefinition,
  SeasonLeaderboardEntry,
  SkillActivityType,
} from '../src/types/game.ts';

interface StoredPlayerSeasonProgress {
  seasonId: string;
  userId: string;
  username: string;
  characterClass: CharacterClass;
  seasonXp: number;
  currentTier: number;
  challengeCounts: Record<string, number>;
  claimedIds: string[];
  claimedEliteIds?: string[];
  unlockedCosmetics: string[];
  eliteUnlocked?: boolean;
  verifiedActivitiesCount?: number;
  dailyXpByDay?: Record<string, number>;
  updatedAt: string;
}

interface SeasonsLedgerFile {
  seasons: SeasonDefinition[];
  playerProgress: Record<string, StoredPlayerSeasonProgress>; // `${seasonId}:${userId}`
  idempotencyKeys: Record<string, boolean>;
  history: ArchivedSeasonSummary[];
  cosmeticCollectionByUser?: Record<string, SeasonalCosmeticRecord[]>;
}

const SEASON_DAILY_XP_CAP = 350;

const getTodayKey = (timezone?: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback
  }
  return new Date().toISOString().slice(0, 10);
};

export function createSeasonService(
  rootDir: string,
  opts?: {
    onSeasonMilestoneReached?: (params: {
      userId: string;
      seasonName: string;
      milestoneTitle: string;
      rewardLabel: string;
      milestoneId: string;
    }) => Promise<void> | void;
    onUnlockCosmetic?: (params: {
      userId: string;
      cosmeticId: string;
      sourceRef: string;
    }) => Promise<any> | void;
    onGrantGold?: (userId: string, amount: number, source: string, key?: string) => Promise<any>;
    onGrantFragments?: (userId: string, amount: number, source: string, key?: string) => Promise<any>;
    onGrantCard?: (userId: string, cardId: string, sourceRef: string) => Promise<any>;
    onGrantTitle?: (params: { userId: string; titleId: string; sourceRef: string }) => Promise<any>;
    onGrantRelic?: (userId: string, relicId: string) => Promise<any>;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_seasons.json');
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

  const readLedger = (): SeasonsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            seasons: Array.isArray(parsed.seasons) ? parsed.seasons : [],
            playerProgress:
              parsed.playerProgress && typeof parsed.playerProgress === 'object'
                ? parsed.playerProgress
                : {},
            idempotencyKeys:
              parsed.idempotencyKeys && typeof parsed.idempotencyKeys === 'object'
                ? parsed.idempotencyKeys
                : {},
            history: Array.isArray(parsed.history) ? parsed.history : [],
            cosmeticCollectionByUser:
              parsed.cosmeticCollectionByUser && typeof parsed.cosmeticCollectionByUser === 'object'
                ? parsed.cosmeticCollectionByUser
                : {},
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return {
      seasons: buildInitialSeasonsCatalog(),
      playerProgress: {},
      idempotencyKeys: {},
      history: [],
      cosmeticCollectionByUser: {},
    };
  };

  const writeLedger = (data: SeasonsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const computeTierAndPercent = (season: SeasonDefinition, seasonXp: number) => {
    const maxReq =
      season.milestones.length > 0
        ? season.milestones[season.milestones.length - 1].requiredSeasonXp
        : 15400;
    let tier = 0;
    for (const m of season.milestones) {
      if (seasonXp >= m.requiredSeasonXp) tier = m.tier;
    }
    return {
      currentTier: Math.max(1, tier || 1),
      completionPercent: Math.min(100, Math.round((seasonXp / Math.max(1, maxReq)) * 100)),
    };
  };

  const buildLeaderboardForSeason = (
    ledger: SeasonsLedgerFile,
    season: SeasonDefinition
  ): SeasonLeaderboardEntry[] => {
    const rows = Object.values(ledger.playerProgress)
      .filter(p => p.seasonId === season.id)
      .sort((a, b) => b.seasonXp - a.seasonXp || Date.parse(a.updatedAt) - Date.parse(b.updatedAt));

    return rows.map((p, idx) => {
      const { currentTier, completionPercent } = computeTierAndPercent(season, p.seasonXp);
      return {
        rank: idx + 1,
        userId: p.userId,
        username: p.username || 'Champion',
        characterClass: p.characterClass || 'Warrior',
        seasonXp: p.seasonXp,
        currentTier,
        completionPercent,
      };
    });
  };

  const archiveSeasonInternal = (ledger: SeasonsLedgerFile, season: SeasonDefinition, nowIso: string) => {
    season.status = 'archived';
    const existingArchive = ledger.history.find(h => h.seasonId === season.id);
    if (existingArchive) return;

    const lb = buildLeaderboardForSeason(ledger, season);
    ledger.history.unshift({
      seasonId: season.id,
      seasonNumber: season.seasonNumber,
      name: season.name,
      theme: season.theme,
      startsAt: season.startsAt,
      endsAt: season.endsAt,
      archivedAt: nowIso,
      totalParticipants: lb.length,
      topPlayers: lb.slice(0, 10),
    });
  };

  const ensureActiveSeason = (ledger: SeasonsLedgerFile): { season: SeasonDefinition; changed: boolean } => {
    let changed = false;
    const now = new Date();
    const nowMs = now.getTime();
    const nowIso = now.toISOString();

    if (ledger.seasons.length === 0) {
      ledger.seasons = buildInitialSeasonsCatalog(now);
      changed = true;
    }

    for (const s of ledger.seasons) {
      if (s.status === 'active' && Date.parse(s.endsAt) < nowMs) {
        archiveSeasonInternal(ledger, s, nowIso);
        changed = true;
      }
      // Automatically upgrade Season 1 to full 50-tier Battle Pass catalog if saved with <50 tiers
      if (s.status === 'active' && (!Array.isArray(s.milestones) || s.milestones.length < 50)) {
        const fresh = buildInitialSeasonsCatalog(now)[0];
        s.milestones = fresh.milestones;
        s.challenges = fresh.challenges;
        s.dailyXpCap = SEASON_DAILY_XP_CAP;
        s.subtitle = fresh.subtitle;
        changed = true;
      }
      if (!s.dailyXpCap || s.dailyXpCap < SEASON_DAILY_XP_CAP) {
        s.dailyXpCap = SEASON_DAILY_XP_CAP;
      }
    }

    let active = ledger.seasons.find(s => s.status === 'active');
    if (!active) {
      const nextNum =
        ledger.seasons.reduce((m, s) => Math.max(m, s.seasonNumber), 0) + 1;
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
      const template = buildInitialSeasonsCatalog(now)[0];
      active = {
        ...template,
        id: `season-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-s${nextNum}`,
        seasonNumber: nextNum,
        name: `Season ${nextNum}: Solar Ascent`,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        status: 'active',
        dailyXpCap: SEASON_DAILY_XP_CAP,
        milestones: template.milestones.map(m => ({ ...m, id: `s${nextNum}_tier_${m.tier}` })),
      };
      ledger.seasons.unshift(active);
      changed = true;
    }

    return { season: active, changed };
  };

  const ensurePlayerProgress = (
    ledger: SeasonsLedgerFile,
    season: SeasonDefinition,
    userId: string,
    username?: string,
    characterClass?: CharacterClass
  ): StoredPlayerSeasonProgress => {
    const key = `${season.id}:${userId}`;
    if (!ledger.playerProgress[key]) {
      ledger.playerProgress[key] = {
        seasonId: season.id,
        userId,
        username: username || 'Champion',
        characterClass: characterClass || 'Warrior',
        seasonXp: 0,
        currentTier: 1,
        challengeCounts: {},
        claimedIds: [],
        claimedEliteIds: [],
        unlockedCosmetics: [],
        eliteUnlocked: false,
        verifiedActivitiesCount: 0,
        dailyXpByDay: {},
        updatedAt: new Date().toISOString(),
      };
    }
    const p = ledger.playerProgress[key];
    if (username) p.username = username;
    if (characterClass) p.characterClass = characterClass;
    if (!Array.isArray(p.claimedEliteIds)) p.claimedEliteIds = [];
    if (!p.dailyXpByDay || typeof p.dailyXpByDay !== 'object') p.dailyXpByDay = {};
    if (typeof p.verifiedActivitiesCount !== 'number') {
      p.verifiedActivitiesCount = Number(p.challengeCounts.verified_activities || 0);
    }
    return p;
  };

  const appendPermanentCosmetic = (
    ledger: SeasonsLedgerFile,
    userId: string,
    record: SeasonalCosmeticRecord
  ) => {
    if (!ledger.cosmeticCollectionByUser) ledger.cosmeticCollectionByUser = {};
    if (!Array.isArray(ledger.cosmeticCollectionByUser[userId])) {
      ledger.cosmeticCollectionByUser[userId] = [];
    }
    const list = ledger.cosmeticCollectionByUser[userId];
    if (!list.some(r => r.seasonId === record.seasonId && r.rewardId === record.rewardId && r.track === record.track)) {
      list.unshift(record);
    }
  };

  const buildResponseForUser = (
    ledger: SeasonsLedgerFile,
    season: SeasonDefinition,
    userId: string,
    page: number,
    limit: number
  ): PlayerSeasonStateResponse => {
    const p = ensurePlayerProgress(ledger, season, userId);
    const { currentTier, completionPercent } = computeTierAndPercent(season, p.seasonXp);
    p.currentTier = currentTier;
    const today = getTodayKey('UTC');
    const dailyCap = season.dailyXpCap || SEASON_DAILY_XP_CAP;
    const dailyXpEarnedToday = Number(p.dailyXpByDay?.[today] || 0);

    const challengeProgress: PlayerSeasonStateResponse['playerProgress']['challengeProgress'] = {};
    for (const ch of season.challenges) {
      const cur = Number(p.challengeCounts[ch.metric] || 0);
      challengeProgress[ch.id] = {
        current: cur,
        target: ch.targetCount,
        completed: cur >= ch.targetCount,
        claimed: p.claimedIds.includes(`challenge:${ch.id}`),
      };
    }

    const fullLb = buildLeaderboardForSeason(ledger, season);
    const totalPages = Math.max(1, Math.ceil(fullLb.length / limit));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * limit;

    const historyWithPlayer = ledger.history.map(h => {
      const archivedPlayer = ledger.playerProgress[`${h.seasonId}:${userId}`];
      const rankIdx = h.topPlayers.findIndex(tp => tp.userId === userId);
      const archivedSeason = ledger.seasons.find(s => s.id === h.seasonId);
      const stats = archivedPlayer && archivedSeason
        ? computeTierAndPercent(archivedSeason, archivedPlayer.seasonXp)
        : null;
      return {
        ...h,
        playerSummary: archivedPlayer
          ? {
              rank: rankIdx >= 0 ? h.topPlayers[rankIdx].rank : null,
              seasonXp: archivedPlayer.seasonXp,
              tierReached: stats?.currentTier || archivedPlayer.currentTier,
              completionPercent: stats?.completionPercent || 0,
              claimedRewardTitles: archivedPlayer.unlockedCosmetics,
            }
          : null,
      };
    });

    const collection = ledger.cosmeticCollectionByUser?.[userId] || [];

    return {
      season: { ...season, dailyXpCap: dailyCap },
      playerProgress: {
        seasonXp: p.seasonXp,
        currentTier,
        completionPercent,
        challengeProgress,
        claimedMilestoneIds: p.claimedIds
          .filter(k => k.startsWith('milestone:'))
          .map(k => k.replace('milestone:', '')),
        claimedEliteMilestoneIds: p.claimedEliteIds || [],
        unlockedCosmetics: p.unlockedCosmetics,
        eliteUnlocked: Boolean(p.eliteUnlocked),
        verifiedActivitiesCount: p.verifiedActivitiesCount || 0,
        dailyXpEarnedToday,
        dailyXpCap: dailyCap,
      },
      cosmeticCollection: collection,
      leaderboard: fullLb.slice(startIdx, startIdx + limit),
      leaderboardPage: safePage,
      leaderboardTotalPages: totalPages,
      history: historyWithPlayer,
    };
  };

  const applyVerifiedSeasonProgress = async (params: {
    userId: string;
    username: string;
    characterClass?: CharacterClass;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    bossHit?: boolean;
    communityPointsAwarded?: number;
    timezone?: string;
  }) => {
    const today = getTodayKey(params.timezone);
    return withLock(() => {
      const ledger = readLedger();
      const { season } = ensureActiveSeason(ledger);
      const dedupeKey = `${season.id}:${params.userId}:${params.idempotencyKey}`;
      if (ledger.idempotencyKeys[dedupeKey]) {
        return { applied: false, duplicate: true };
      }

      ledger.idempotencyKeys[dedupeKey] = true;
      const p = ensurePlayerProgress(
        ledger,
        season,
        params.userId,
        params.username,
        params.characterClass
      );

      p.challengeCounts.verified_activities =
        Number(p.challengeCounts.verified_activities || 0) + 1;
      p.verifiedActivitiesCount = p.challengeCounts.verified_activities;

      if (
        params.activityType === 'strength_workout' ||
        params.activityType === 'cardio_workout'
      ) {
        p.challengeCounts.workouts = Number(p.challengeCounts.workouts || 0) + 1;
      }
      if (params.activityType === 'habit_completion' || params.activityType === 'recovery_habit') {
        p.challengeCounts.habit_completions =
          Number(p.challengeCounts.habit_completions || 0) + 1;
      }
      if (params.activityType === 'study_session') {
        p.challengeCounts.study_sessions =
          Number(p.challengeCounts.study_sessions || 0) + 1;
      }
      if (params.bossHit) {
        p.challengeCounts.boss_hits = Number(p.challengeCounts.boss_hits || 0) + 1;
      }
      if (params.communityPointsAwarded && params.communityPointsAwarded > 0) {
        p.challengeCounts.community_points =
          Number(p.challengeCounts.community_points || 0) + params.communityPointsAwarded;
      }

      const dailyCap = season.dailyXpCap || SEASON_DAILY_XP_CAP;
      const usedToday = Number(p.dailyXpByDay?.[today] || 0);
      const remaining = Math.max(0, dailyCap - usedToday);

      const rawDelta =
        params.activityType === 'strength_workout' || params.activityType === 'cardio_workout'
          ? 65
          : 45;
      const seasonalDelta = Math.min(rawDelta, remaining);

      p.seasonXp += seasonalDelta;
      if (!p.dailyXpByDay) p.dailyXpByDay = {};
      p.dailyXpByDay[today] = usedToday + seasonalDelta;

      const stats = computeTierAndPercent(season, p.seasonXp);
      p.currentTier = stats.currentTier;
      p.updatedAt = new Date().toISOString();

      writeLedger(ledger);
      return {
        applied: true,
        seasonXpAwarded: seasonalDelta,
        safetyCapped: seasonalDelta < rawDelta,
        seasonXp: p.seasonXp,
        currentTier: p.currentTier,
      };
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/seasons/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const page = Math.max(1, Math.round(Number(req.query.page || 1)));
      const limit = Math.min(50, Math.max(1, Math.round(Number(req.query.limit || 10))));

      const payload = await withLock(() => {
        const ledger = readLedger();
        const { season, changed } = ensureActiveSeason(ledger);
        if (changed) writeLedger(ledger);
        return buildResponseForUser(ledger, season, auth.userId!, page, limit);
      });

      res.json({ success: true, ...payload });
    });

    app.post('/api/seasons/claim-challenge', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('seasonXp' in body || 'xp' in body || 'tier' in body) {
        res.status(400).json({
          success: false,
          error: 'Untrusted seasonal XP or tier overrides are rejected.',
        });
        return;
      }

      const challengeId = String(body.challengeId || '').trim();
      const result = await withLock(() => {
        const ledger = readLedger();
        const { season } = ensureActiveSeason(ledger);
        const ch = season.challenges.find(c => c.id === challengeId);
        if (!ch) {
          return { status: 404, payload: { success: false, error: 'Season challenge not found.' } };
        }
        const p = ensurePlayerProgress(ledger, season, auth.userId!);
        const claimKey = `challenge:${ch.id}`;
        if (p.claimedIds.includes(claimKey)) {
          return { status: 409, payload: { success: false, error: 'Challenge already claimed.' } };
        }
        const cur = Number(p.challengeCounts[ch.metric] || 0);
        if (cur < ch.targetCount) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Challenge incomplete (${cur}/${ch.targetCount}).`,
            },
          };
        }
        p.claimedIds.push(claimKey);
        p.seasonXp += ch.seasonalXpReward;
        const stats = computeTierAndPercent(season, p.seasonXp);
        p.currentTier = stats.currentTier;
        p.updatedAt = new Date().toISOString();
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            seasonXpAwarded: ch.seasonalXpReward,
            ...buildResponseForUser(ledger, season, auth.userId!, 1, 10),
          },
        };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/seasons/purchase-premium-rm', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      res.status(403).json({
        success: false,
        paymentSettlementConfigured: false,
        error:
          'Payment Settlement Not Configured: Real-money Battle Pass purchases are currently disabled. Unlock the Premium Cosmetic Track through earned Seasonal dedication instead.',
      });
    });

    app.post('/api/seasons/unlock-elite', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const { season } = ensureActiveSeason(ledger);
        const p = ensurePlayerProgress(ledger, season, auth.userId!);
        if (p.eliteUnlocked) {
          return {
            status: 200,
            payload: { success: true, alreadyUnlocked: true, ...buildResponseForUser(ledger, season, auth.userId!, 1, 10) },
          };
        }
        if (p.seasonXp < 100) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Earn at least 100 Season XP through verified activities to unlock the Premium Cosmetic Track (${p.seasonXp}/100).`,
            },
          };
        }
        p.eliteUnlocked = true;
        p.updatedAt = new Date().toISOString();
        writeLedger(ledger);
        return { status: 200, payload: { success: true, ...buildResponseForUser(ledger, season, auth.userId!, 1, 10) } };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/seasons/claim-milestone', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const milestoneId = String(req.body?.milestoneId || '').trim();
      const track = req.body?.track === 'elite' || req.body?.track === 'premium' ? 'elite' : 'free';

      const result = await withLock(() => {
        const ledger = readLedger();
        const { season } = ensureActiveSeason(ledger);
        const ms = season.milestones.find(m => m.id === milestoneId);
        if (!ms) {
          return { status: 404, payload: { success: false, error: 'Battle Pass tier not found.' }, notifyInfo: null };
        }
        const p = ensurePlayerProgress(ledger, season, auth.userId!);
        if (p.seasonXp < ms.requiredSeasonXp) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires ${ms.requiredSeasonXp} Season XP (currently ${p.seasonXp}).`,
            },
            notifyInfo: null,
          };
        }

        if (track === 'elite') {
          if (!p.eliteUnlocked) {
            return {
              status: 403,
              payload: { success: false, error: 'Unlock the Premium Cosmetic Track first.' },
              notifyInfo: null,
            };
          }
          if (!p.claimedEliteIds) p.claimedEliteIds = [];
          if (p.claimedEliteIds.includes(ms.id)) {
            return { status: 409, payload: { success: false, error: 'Premium tier reward already claimed.' }, notifyInfo: null };
          }
          const label = ms.eliteRewardLabel || `${ms.title} Premium Reward`;
          p.claimedEliteIds.push(ms.id);
          if (!p.unlockedCosmetics.includes(label)) {
            p.unlockedCosmetics.push(label);
          }
          appendPermanentCosmetic(ledger, auth.userId!, {
            seasonId: season.id,
            seasonName: season.name,
            rewardId: ms.id,
            rewardLabel: label,
            track: 'elite',
            earnedAt: new Date().toISOString(),
          });
          p.updatedAt = new Date().toISOString();
          writeLedger(ledger);
          return {
            status: 200,
            grants: {
              cosmeticId: ms.eliteCosmeticId,
              cardId: ms.eliteCardId,
              titleId: ms.eliteTitleId,
              relicId: ms.eliteRelicId,
              gold: ms.eliteGold,
              fragments: ms.eliteFragments,
            },
            payload: {
              success: true,
              rewardLabel: label,
              ...buildResponseForUser(ledger, season, auth.userId!, 1, 10),
            },
            notifyInfo: {
              seasonName: season.name,
              milestoneTitle: `${ms.title} (Premium Track)`,
              rewardLabel: label,
              milestoneId: `elite:${ms.id}`,
            },
          };
        }

        const claimKey = `milestone:${ms.id}`;
        if (p.claimedIds.includes(claimKey)) {
          return { status: 409, payload: { success: false, error: 'Battle Pass tier already claimed.' }, notifyInfo: null };
        }
        p.claimedIds.push(claimKey);
        if (!p.unlockedCosmetics.includes(ms.rewardLabel)) {
          p.unlockedCosmetics.push(ms.rewardLabel);
        }
        appendPermanentCosmetic(ledger, auth.userId!, {
          seasonId: season.id,
          seasonName: season.name,
          rewardId: ms.id,
          rewardLabel: ms.rewardLabel,
          track: 'free',
          earnedAt: new Date().toISOString(),
        });
        p.updatedAt = new Date().toISOString();
        writeLedger(ledger);
        return {
          status: 200,
          grants: {
            cosmeticId: ms.rewardRefId?.startsWith('hair_') || ms.rewardRefId?.startsWith('frame_') || ms.rewardRefId?.startsWith('banner_') || ms.rewardRefId?.startsWith('outfit_') || ms.rewardRefId?.startsWith('aura_') ? ms.rewardRefId : undefined,
            cardId: ms.rewardCardId,
            titleId: ms.rewardTitleId,
            relicId: ms.rewardRelicId,
            gold: ms.rewardGold,
            fragments: ms.rewardFragments,
          },
          payload: {
            success: true,
            rewardLabel: ms.rewardLabel,
            ...buildResponseForUser(ledger, season, auth.userId!, 1, 10),
          },
          notifyInfo: {
            seasonName: season.name,
            milestoneTitle: ms.title,
            rewardLabel: ms.rewardLabel,
            milestoneId: ms.id,
          },
        };
      });

      if (result.status === 200 && 'grants' in result && result.grants) {
        const g = result.grants;
        const keyBase = `season_bp:${track}:${milestoneId}:${auth.userId}`;
        if (g.cosmeticId && opts?.onUnlockCosmetic) {
          await opts.onUnlockCosmetic({
            userId: auth.userId!,
            cosmeticId: g.cosmeticId,
            sourceRef: `season_${track}:${milestoneId}`,
          });
        }
        if (g.cardId && opts?.onGrantCard) {
          await opts.onGrantCard(auth.userId!, g.cardId, keyBase);
        }
        if (g.titleId && opts?.onGrantTitle) {
          await opts.onGrantTitle({ userId: auth.userId!, titleId: g.titleId, sourceRef: keyBase });
        }
        if (g.relicId && opts?.onGrantRelic) {
          await opts.onGrantRelic(auth.userId!, g.relicId);
        }
        if (g.gold && g.gold > 0 && opts?.onGrantGold) {
          await opts.onGrantGold(auth.userId!, g.gold, `Battle Pass ${track === 'elite' ? 'Premium' : 'Free'} Tier`, `${keyBase}:g`);
        }
        if (g.fragments && g.fragments > 0 && opts?.onGrantFragments) {
          await opts.onGrantFragments(auth.userId!, g.fragments, `Battle Pass ${track === 'elite' ? 'Premium' : 'Free'} Tier`, `${keyBase}:f`);
        }
      }

      if (result.status === 200 && result.notifyInfo && opts?.onSeasonMilestoneReached) {
        await opts.onSeasonMilestoneReached({
          userId: auth.userId!,
          ...result.notifyInfo,
        });
      }

      res.status(result.status).json(result.payload);
    });

    app.post('/api/admin/seasons/transition', async (req: Request, res: Response) => {
      const expectedKey = process.env.LIFEQUEST_ADMIN_KEY || 'lifequest-local-admin';
      const providedKey = String(req.headers['x-lifequest-admin-key'] || '').trim();
      if (!providedKey || providedKey !== expectedKey) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: admin authorization key required for season lifecycle transitions.',
        });
        return;
      }

      const payload = await withLock(() => {
        const ledger = readLedger();
        const { season: current } = ensureActiveSeason(ledger);
        const now = new Date();
        archiveSeasonInternal(ledger, current, now.toISOString());

        const nextNum =
          ledger.seasons.reduce((m, s) => Math.max(m, s.seasonNumber), 0) + 1;
        const template = buildInitialSeasonsCatalog(now)[0];
        const nextSeason: SeasonDefinition = {
          ...template,
          id: `season-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-s${nextNum}`,
          seasonNumber: nextNum,
          name: String(req.body?.nextSeasonName || `Season ${nextNum}: Celestial Hearth`).slice(0, 80),
          theme: String(req.body?.nextTheme || 'Endurance, Wisdom & Community').slice(0, 80),
          startsAt: now.toISOString(),
          endsAt: new Date(now.getTime() + 30 * 86400_000).toISOString(),
          status: 'active',
          dailyXpCap: SEASON_DAILY_XP_CAP,
          milestones: template.milestones.map(m => ({ ...m, id: `s${nextNum}_tier_${m.tier}` })),
        };
        ledger.seasons.unshift(nextSeason);
        writeLedger(ledger);
        return {
          archivedSeasonId: current.id,
          newSeason: nextSeason,
          historyCount: ledger.history.length,
        };
      });

      res.json({ success: true, ...payload });
    });
  };

  return {
    registerRoutes,
    applyVerifiedSeasonProgress,
  };
}
