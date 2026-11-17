import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { buildInitialSeasonsCatalog } from '../src/data/polish2Data.ts';
import type {
  ArchivedSeasonSummary,
  CharacterClass,
  PlayerSeasonStateResponse,
  SeasonDefinition,
  SeasonLeaderboardEntry,
  SkillActivityType,
} from '../src/types/game.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';

interface StoredPlayerSeasonProgress {
  seasonId: string;
  userId: string;
  username: string;
  characterClass: CharacterClass;
  seasonXp: number;
  currentTier: number;
  challengeCounts: Record<string, number>;
  claimedIds: string[];
  unlockedCosmetics: string[];
  updatedAt: string;
}

interface SeasonsLedgerFile {
  seasons: SeasonDefinition[];
  playerProgress: Record<string, StoredPlayerSeasonProgress>; // `${seasonId}:${userId}`
  idempotencyKeys: Record<string, boolean>;
  history: ArchivedSeasonSummary[];
}

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
    };
  };

  const writeLedger = (data: SeasonsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const computeTierAndPercent = (season: SeasonDefinition, seasonXp: number) => {
    const maxReq =
      season.milestones.length > 0
        ? season.milestones[season.milestones.length - 1].requiredSeasonXp
        : 1000;
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
        unlockedCosmetics: [],
        updatedAt: new Date().toISOString(),
      };
    }
    const p = ledger.playerProgress[key];
    if (username) p.username = username;
    if (characterClass) p.characterClass = characterClass;
    return p;
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

    return {
      season,
      playerProgress: {
        seasonXp: p.seasonXp,
        currentTier,
        completionPercent,
        challengeProgress,
        claimedMilestoneIds: p.claimedIds.filter(k => k.startsWith('milestone:')).map(k => k.replace('milestone:', '')),
        unlockedCosmetics: p.unlockedCosmetics,
      },
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
  }) => {
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

      if (
        params.activityType === 'strength_workout' ||
        params.activityType === 'cardio_workout'
      ) {
        p.challengeCounts.workouts = Number(p.challengeCounts.workouts || 0) + 1;
      }
      if (params.activityType === 'habit_completion') {
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

      // Bounded seasonal XP award per verified activity (purely seasonal progression)
      const seasonalDelta =
        params.activityType === 'strength_workout' || params.activityType === 'cardio_workout'
          ? 45
          : 30;
      p.seasonXp += seasonalDelta;
      const stats = computeTierAndPercent(season, p.seasonXp);
      p.currentTier = stats.currentTier;
      p.updatedAt = new Date().toISOString();

      writeLedger(ledger);
      return {
        applied: true,
        seasonXpAwarded: seasonalDelta,
        seasonXp: p.seasonXp,
        currentTier: p.currentTier,
      };
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/seasons/state', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const page = Math.max(1, Math.round(Number(req.query.page || 1)));
      const limit = Math.min(50, Math.max(1, Math.round(Number(req.query.limit || 10))));

      const payload = await withLock(() => {
        const ledger = readLedger();
        const { season, changed } = ensureActiveSeason(ledger);
        if (changed) writeLedger(ledger);
        return buildResponseForUser(ledger, season, userId, page, limit);
      });

      res.json({ success: true, ...payload });
    });

    app.post('/api/seasons/claim-challenge', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
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
        const p = ensurePlayerProgress(ledger, season, userId);
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
            ...buildResponseForUser(ledger, season, userId, 1, 10),
          },
        };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/seasons/claim-milestone', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const milestoneId = String(req.body?.milestoneId || '').trim();

      const result = await withLock(() => {
        const ledger = readLedger();
        const { season } = ensureActiveSeason(ledger);
        const ms = season.milestones.find(m => m.id === milestoneId);
        if (!ms) {
          return { status: 404, payload: { success: false, error: 'Season milestone not found.' }, notifyInfo: null };
        }
        const p = ensurePlayerProgress(ledger, season, userId);
        const claimKey = `milestone:${ms.id}`;
        if (p.claimedIds.includes(claimKey)) {
          return { status: 409, payload: { success: false, error: 'Milestone already claimed.' }, notifyInfo: null };
        }
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
        p.claimedIds.push(claimKey);
        if (!p.unlockedCosmetics.includes(ms.rewardLabel)) {
          p.unlockedCosmetics.push(ms.rewardLabel);
        }
        p.updatedAt = new Date().toISOString();
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            rewardLabel: ms.rewardLabel,
            ...buildResponseForUser(ledger, season, userId, 1, 10),
          },
          notifyInfo: {
            seasonName: season.name,
            milestoneTitle: ms.title,
            rewardLabel: ms.rewardLabel,
            milestoneId: ms.id,
          },
        };
      });

      if (result.status === 200 && result.notifyInfo && opts?.onSeasonMilestoneReached) {
        await opts.onSeasonMilestoneReached({
          userId,
          ...result.notifyInfo,
        });
      }

      res.status(result.status).json(result.payload);
    });

    // Protected administrative transition endpoint (simulates or triggers season rollover safely)
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
