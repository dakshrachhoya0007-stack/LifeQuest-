import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller, verifyAdminHeader } from './authGuard.ts';
import {
  DAILY_BOSS_DAMAGE_CAP,
  calculateSafeBossDamage,
  createDefaultWeeklyBossEvent,
  doesActivityMatchBossMission,
  getCurrentWeekKey,
} from '../src/data/ecosystemData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  SkillActivityType,
  WeeklyBossContributionEntry,
  WeeklyBossDifficulty,
  WeeklyBossEvent,
  WeeklyBossLeaderboardEntry,
  WeeklyBossMilestone,
  WeeklyBossMission,
  WeeklyBossPlayerSummary,
  WeeklyBossRewardConfig,
  WeeklyBossStatePayload,
  WeeklyBossStatus,
} from '../src/types/game.ts';

interface StoredClaimRecord {
  eventId: string;
  userId: string;
  claimKey: string;
  xpAwarded: number;
  goldAwarded: number;
  claimedAt: string;
}

interface WeeklyBossLedgerFile {
  events: WeeklyBossEvent[];
  contributions: WeeklyBossContributionEntry[];
  claims: StoredClaimRecord[];
}

export interface BossActivityResult {
  applied: boolean;
  duplicate?: boolean;
  reason?: string;
  eventId?: string;
  bossName?: string;
  damageDealt?: number;
  safetyCapped?: boolean;
  bossDefeatedJustNow?: boolean;
  remainingHealth?: number;
  totalHealth?: number;
  newlyDefeatedParticipantIds?: string[];
}

const VALID_DIFFICULTIES = new Set<WeeklyBossDifficulty>(['Heroic', 'Mythic', 'Cataclysmic']);

const getTodayBucket = (timezone?: string): string => {
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
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback
  }
  return new Date().toISOString().slice(0, 10);
};

export function createWeeklyBossService(rootDir: string) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_weekly_boss.json');
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

  const readLedger = (): WeeklyBossLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            events: Array.isArray(parsed.events) ? parsed.events : [],
            contributions: Array.isArray(parsed.contributions) ? parsed.contributions : [],
            claims: Array.isArray(parsed.claims) ? parsed.claims : [],
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { events: [], contributions: [], claims: [] };
  };

  const writeLedger = (data: WeeklyBossLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const refreshStatusesAndEnsureCurrentEvent = (ledger: WeeklyBossLedgerFile): WeeklyBossEvent => {
    const now = Date.now();
    let changed = false;

    for (const evt of ledger.events) {
      const startMs = Date.parse(evt.startsAt);
      const endMs = Date.parse(evt.endsAt);

      if (evt.status === 'scheduled' && !Number.isNaN(startMs) && now >= startMs) {
        evt.status = evt.currentHealth <= 0 ? 'defeated' : 'active';
        changed = true;
      }

      if (
        (evt.status === 'active' || evt.status === 'scheduled') &&
        !Number.isNaN(endMs) &&
        now > endMs
      ) {
        evt.status = evt.currentHealth <= 0 ? 'defeated' : 'expired';
        changed = true;
      }
    }

    const weekKey = getCurrentWeekKey(new Date(now));
    // Prefer an active or current-week event, or most recent non-scheduled event
    let activeEvt =
      ledger.events.find(e => e.status === 'active') ||
      ledger.events.find(e => e.weekKey === weekKey) ||
      ledger.events.find(e => e.status === 'defeated') ||
      ledger.events[0];

    if (!activeEvt) {
      activeEvt = createDefaultWeeklyBossEvent(new Date(now));
      ledger.events.unshift(activeEvt);
      changed = true;
    }

    if (changed) {
      writeLedger(ledger);
    }
    return activeEvt;
  };

  const computeLeaderboard = (
    event: WeeklyBossEvent,
    contributions: WeeklyBossContributionEntry[]
  ): WeeklyBossLeaderboardEntry[] => {
    const evtContribs = contributions.filter(c => c.eventId === event.id);
    const byUser = new Map<
      string,
      { username: string; totalDamage: number; count: number; byActivity: SkillActivityType[] }
    >();

    for (const c of evtContribs) {
      const prev = byUser.get(c.userId) || {
        username: c.username || 'Champion',
        totalDamage: 0,
        count: 0,
        byActivity: [],
      };
      prev.username = c.username || prev.username;
      prev.totalDamage += c.damageDealt;
      prev.count += 1;
      prev.byActivity.push(c.activityType);
      byUser.set(c.userId, prev);
    }

    const rows = Array.from(byUser.entries()).map(([uid, info]) => {
      let missionsCompleted = 0;
      for (const m of event.missions) {
        const matchCount = info.byActivity.filter(a => doesActivityMatchBossMission(m, a)).length;
        if (matchCount >= m.targetCount) missionsCompleted += 1;
      }
      return {
        rank: 0,
        userId: uid,
        username: info.username,
        totalDamage: info.totalDamage,
        contributionsCount: info.count,
        missionsCompleted,
      };
    });

    rows.sort((a, b) => b.totalDamage - a.totalDamage || b.contributionsCount - a.contributionsCount);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
    });
    return rows;
  };

  const buildPlayerSummary = (
    event: WeeklyBossEvent,
    userId: string,
    ledger: WeeklyBossLedgerFile,
    todayBucket: string
  ): WeeklyBossPlayerSummary => {
    const userContribs = ledger.contributions.filter(
      c => c.eventId === event.id && c.userId === userId
    );
    const totalDamage = userContribs.reduce((s, c) => s + c.damageDealt, 0);
    const dailyDamageDealt = userContribs
      .filter(c => c.createdAt.slice(0, 10) === todayBucket)
      .reduce((s, c) => s + c.damageDealt, 0);

    const userClaims = new Set(
      ledger.claims
        .filter(c => c.eventId === event.id && c.userId === userId)
        .map(c => c.claimKey)
    );

    const missionProgress: WeeklyBossPlayerSummary['missionProgress'] = {};
    for (const m of event.missions) {
      const current = userContribs.filter(c =>
        doesActivityMatchBossMission(m, c.activityType)
      ).length;
      missionProgress[m.id] = {
        current: Math.min(m.targetCount, current),
        target: m.targetCount,
        completed: current >= m.targetCount,
        claimed: userClaims.has(`mission:${m.id}`),
      };
    }

    const claimedMilestones = event.milestones
      .filter(mil => userClaims.has(`milestone:${mil.id}`))
      .map(mil => mil.id);

    return {
      totalDamage,
      contributionsCount: userContribs.length,
      dailyDamageDealt,
      dailyDamageCap: DAILY_BOSS_DAMAGE_CAP,
      missionProgress,
      claimedMilestones,
      participationClaimed: userClaims.has('participation:reward'),
      defeatRewardClaimed: userClaims.has('defeat:reward'),
      topContributorClaimed: userClaims.has('top_contributor:reward'),
    };
  };

  const applyVerifiedBossDamage = async (params: {
    userId: string;
    username: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    timezone?: string;
    eventId?: string;
  }): Promise<BossActivityResult> => {
    const { userId, username, activityType, idempotencyKey, metadata = {}, timezone, eventId } = params;
    const todayBucket = getTodayBucket(timezone);

    return withLock(() => {
      const ledger = readLedger();
      const defaultEvt = refreshStatusesAndEnsureCurrentEvent(ledger);
      const event = eventId
        ? ledger.events.find(e => e.id === eventId) || defaultEvt
        : defaultEvt;

      if (event.status === 'expired' || event.status === 'resolved') {
        return {
          applied: false,
          reason: `Weekly Boss event "${event.bossName}" has ended (${event.status}).`,
          eventId: event.id,
        };
      }

      if (event.status === 'scheduled') {
        return {
          applied: false,
          reason: `Weekly Boss event "${event.bossName}" has not started yet.`,
          eventId: event.id,
        };
      }

      if (event.status === 'defeated' || event.currentHealth <= 0) {
        return {
          applied: false,
          reason: `Weekly Boss "${event.bossName}" has already been defeated this week.`,
          eventId: event.id,
          remainingHealth: 0,
          totalHealth: event.totalHealth,
        };
      }

      const duplicate = ledger.contributions.find(
        c => c.eventId === event.id && c.userId === userId && c.idempotencyKey === idempotencyKey
      );
      if (duplicate) {
        return {
          applied: true,
          duplicate: true,
          eventId: event.id,
          bossName: event.bossName,
          damageDealt: 0,
          safetyCapped: false,
          remainingHealth: event.currentHealth,
          totalHealth: event.totalHealth,
        };
      }

      const currentDailyDamage = ledger.contributions
        .filter(
          c =>
            c.eventId === event.id &&
            c.userId === userId &&
            c.createdAt.slice(0, 10) === todayBucket
        )
        .reduce((sum, c) => sum + c.damageDealt, 0);

      const calc = calculateSafeBossDamage(activityType, metadata, currentDailyDamage);
      const appliedDamage = Math.min(event.currentHealth, calc.damageDealt);
      const prevHealth = event.currentHealth;
      event.currentHealth = Math.max(0, event.currentHealth - appliedDamage);
      event.totalHits += 1;

      const entry: WeeklyBossContributionEntry = {
        id: `wbc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventId: event.id,
        userId,
        username: username || 'Champion',
        idempotencyKey,
        activityType,
        actionLabel: calc.actionLabel,
        damageDealt: appliedDamage,
        safetyCapped: calc.safetyCapped,
        createdAt: new Date().toISOString(),
      };
      ledger.contributions.unshift(entry);
      if (ledger.contributions.length > 2500) {
        ledger.contributions = ledger.contributions.slice(0, 2500);
      }

      const participantSet = new Set(
        ledger.contributions.filter(c => c.eventId === event.id).map(c => c.userId)
      );
      event.totalParticipants = participantSet.size;

      let bossDefeatedJustNow = false;
      if (prevHealth > 0 && event.currentHealth === 0) {
        event.status = 'defeated';
        event.defeatedAt = new Date().toISOString();
        bossDefeatedJustNow = true;
      }

      writeLedger(ledger);

      return {
        applied: true,
        duplicate: false,
        eventId: event.id,
        bossName: event.bossName,
        damageDealt: appliedDamage,
        safetyCapped: calc.safetyCapped,
        bossDefeatedJustNow,
        remainingHealth: event.currentHealth,
        totalHealth: event.totalHealth,
        newlyDefeatedParticipantIds: bossDefeatedJustNow ? Array.from(participantSet) : [],
      };
    });
  };

  const getStateForUser = async (params: {
    userId: string;
    page?: number;
    limit?: number;
    timezone?: string;
    eventId?: string;
  }): Promise<WeeklyBossStatePayload> => {
    const page = Math.max(1, Math.round(Number(params.page || 1)));
    const limit = Math.min(50, Math.max(1, Math.round(Number(params.limit || 10))));
    const todayBucket = getTodayBucket(params.timezone);

    return withLock(() => {
      const ledger = readLedger();
      const defaultEvt = refreshStatusesAndEnsureCurrentEvent(ledger);
      const event = params.eventId
        ? ledger.events.find(e => e.id === params.eventId) || defaultEvt
        : defaultEvt;

      const fullBoard = computeLeaderboard(event, ledger.contributions);
      const totalPages = Math.max(1, Math.ceil(fullBoard.length / limit));
      const safePage = Math.min(page, totalPages);
      const startIdx = (safePage - 1) * limit;

      return {
        event: { ...event },
        playerSummary: buildPlayerSummary(event, params.userId, ledger, todayBucket),
        leaderboard: fullBoard.slice(startIdx, startIdx + limit),
        leaderboardPage: safePage,
        leaderboardTotalPages: totalPages,
        recentContributions: ledger.contributions
          .filter(c => c.eventId === event.id)
          .slice(0, 15),
      };
    });
  };

  const isAdminAuthorized = (req: Request): boolean => {
    return verifyAdminHeader(req, ['LIFEQUEST_ADMIN_SECRET', 'LIFEQUEST_ADMIN_KEY']);
  };

  const registerRoutes = (app: Express) => {
    // Publicly authenticated player read
    app.get('/api/weekly-boss/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : 'UTC';
      const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

      const state = await getStateForUser({ userId, page, limit, timezone, eventId });
      res.json({ success: true, ...state });
    });

    // Reject arbitrary client boss damage submissions strictly
    app.post('/api/weekly-boss/contribute', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('damage' in body || 'damageDealt' in body || 'health' in body || 'currentHealth' in body) {
        res.status(400).json({
          success: false,
          error: 'Arbitrary boss damage or health overrides are forbidden. Damage is computed strictly on the server from verified activities.',
        });
        return;
      }
      const activityType = String(body.activityType || '') as SkillActivityType;
      const validTypes = new Set<SkillActivityType>([
        'strength_workout',
        'cardio_workout',
        'habit_completion',
        'study_session',
        'comeback_activity',
        'recovery_habit',
      ]);
      if (!validTypes.has(activityType)) {
        res.status(400).json({ success: false, error: 'Invalid verified activityType.' });
        return;
      }
      const idempotencyKey = String(body.idempotencyKey || '').trim();
      if (idempotencyKey.length < 3) {
        res.status(400).json({ success: false, error: 'Valid idempotencyKey is required.' });
        return;
      }

      const result = await applyVerifiedBossDamage({
        userId,
        username: String(body.username || 'Champion').slice(0, 48),
        activityType,
        idempotencyKey,
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
        timezone: typeof body.timezone === 'string' ? body.timezone : 'UTC',
        eventId: typeof body.eventId === 'string' ? body.eventId : undefined,
      });

      const status = result.applied ? 200 : 400;
      const state = await getStateForUser({ userId, eventId: result.eventId });
      res.status(status).json({
        success: result.applied,
        ...result,
        ...state,
      });
    });

    // Idempotent Claim for Missions, Milestones, Participation, Defeat & Top Contributor Rewards
    app.post('/api/weekly-boss/claim', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const claimType = String(body.claimType || '');
      const claimTargetId = String(body.claimId || '');
      const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';
      const eventId = typeof body.eventId === 'string' ? body.eventId : undefined;
      const todayBucket = getTodayBucket(timezone);

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const defaultEvt = refreshStatusesAndEnsureCurrentEvent(ledger);
        const event = eventId
          ? ledger.events.find(e => e.id === eventId) || defaultEvt
          : defaultEvt;

        const summary = buildPlayerSummary(event, userId, ledger, todayBucket);
        let claimKey = '';
        let xpAwarded = 0;
        let goldAwarded = 0;
        let bonusBossDamage = 0;

        if (claimType === 'mission') {
          const mission = event.missions.find(m => m.id === claimTargetId);
          if (!mission) return { status: 404, payload: { success: false, error: 'Boss mission not found.' } };
          const prog = summary.missionProgress[mission.id];
          if (!prog?.completed) {
            return { status: 400, payload: { success: false, error: 'Mission objective not yet completed.' } };
          }
          claimKey = `mission:${mission.id}`;
          xpAwarded = mission.playerXpReward;
          goldAwarded = mission.goldReward;
          bonusBossDamage = event.status === 'active' && event.currentHealth > 0 ? mission.damageReward : 0;
        } else if (claimType === 'milestone') {
          const milestone = event.milestones.find(m => m.id === claimTargetId);
          if (!milestone) return { status: 404, payload: { success: false, error: 'Boss milestone not found.' } };
          if (summary.totalDamage < milestone.damageRequired) {
            return { status: 400, payload: { success: false, error: `Requires ${milestone.damageRequired} boss damage.` } };
          }
          claimKey = `milestone:${milestone.id}`;
          xpAwarded = milestone.playerXpReward;
          goldAwarded = milestone.goldReward;
        } else if (claimType === 'participation') {
          if (summary.contributionsCount < 1) {
            return { status: 400, payload: { success: false, error: 'Deal at least 1 verified strike to earn participation honors.' } };
          }
          claimKey = 'participation:reward';
          xpAwarded = event.rewards.participationXp;
          goldAwarded = event.rewards.participationGold;
        } else if (claimType === 'defeat') {
          if (event.status !== 'defeated' && event.currentHealth > 0) {
            return { status: 400, payload: { success: false, error: 'Weekly Boss has not been defeated yet.' } };
          }
          if (summary.contributionsCount < 1) {
            return { status: 400, payload: { success: false, error: 'Only raid contributors can claim victory spoils.' } };
          }
          claimKey = 'defeat:reward';
          xpAwarded = event.rewards.defeatXp;
          goldAwarded = event.rewards.defeatGold;
        } else if (claimType === 'top_contributor') {
          if (event.status !== 'defeated' && event.status !== 'resolved') {
            return { status: 400, payload: { success: false, error: 'Top contributor honors unlock once the boss falls or event resolves.' } };
          }
          const board = computeLeaderboard(event, ledger.contributions);
          const myRank = board.findIndex(r => r.userId === userId);
          if (myRank === -1 || myRank >= 3) {
            return { status: 403, payload: { success: false, error: 'Reserved for Top 3 raid contributors.' } };
          }
          claimKey = 'top_contributor:reward';
          xpAwarded = event.rewards.topContributorBonusXp;
          goldAwarded = event.rewards.topContributorBonusGold;
        } else {
          return { status: 400, payload: { success: false, error: 'Unknown claimType.' } };
        }

        const existing = ledger.claims.find(
          c => c.eventId === event.id && c.userId === userId && c.claimKey === claimKey
        );
        if (existing) {
          return {
            status: 409,
            payload: { success: false, alreadyClaimed: true, error: 'Reward already claimed.' },
          };
        }

        if (bonusBossDamage > 0) {
          event.currentHealth = Math.max(0, event.currentHealth - bonusBossDamage);
          if (event.currentHealth === 0 && event.status === 'active') {
            event.status = 'defeated';
            event.defeatedAt = new Date().toISOString();
          }
        }

        ledger.claims.push({
          eventId: event.id,
          userId,
          claimKey,
          xpAwarded,
          goldAwarded,
          claimedAt: new Date().toISOString(),
        });
        writeLedger(ledger);

        return {
          status: 200,
          payload: {
            success: true,
            claimKey,
            rewards: { xp: xpAwarded, gold: goldAwarded },
            bonusBossDamage,
          },
        };
      });

      const state = await getStateForUser({ userId, timezone, eventId });
      res.status(outcome.status).json({ ...outcome.payload, ...state });
    });

    // STRICTLY SERVER-PROTECTED ADMIN ENDPOINTS (Never exposed in player UI)
    app.post('/api/admin/weekly-boss/events', async (req: Request, res: Response) => {
      if (!isAdminAuthorized(req)) {
        res.status(403).json({ success: false, error: 'Forbidden: administrator privileges required.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const bossName = String(body.bossName || '').trim();
      const totalHealth = Math.round(Number(body.totalHealth || 10000));
      const difficulty = (VALID_DIFFICULTIES.has(body.difficulty) ? body.difficulty : 'Mythic') as WeeklyBossDifficulty;

      if (bossName.length < 3 || totalHealth < 100 || totalHealth > 5000000) {
        res.status(400).json({ success: false, error: 'Invalid boss event configuration.' });
        return;
      }

      const template = createDefaultWeeklyBossEvent();
      const nowIso = new Date().toISOString();
      const startsAt = body.startsAt ? String(body.startsAt) : nowIso;
      const endsAt = body.endsAt
        ? String(body.endsAt)
        : new Date(Date.now() + 7 * 86400000).toISOString();

      const customStatus: WeeklyBossStatus =
        Date.parse(startsAt) > Date.now()
          ? 'scheduled'
          : Date.parse(endsAt) < Date.now()
          ? 'expired'
          : 'active';

      const newEvent: WeeklyBossEvent = {
        id: String(body.id || `wb-${Date.now()}`),
        weekKey: String(body.weekKey || template.weekKey),
        bossName,
        bossTitle: String(body.bossTitle || 'Scheduled Raid Boss'),
        bossDescription: String(body.bossDescription || template.bossDescription),
        artworkKey: String(body.artworkKey || 'weekly_boss_titan'),
        difficulty,
        totalHealth,
        currentHealth: body.currentHealth !== undefined ? Math.max(0, Math.min(totalHealth, Number(body.currentHealth))) : totalHealth,
        startsAt,
        endsAt,
        status: (body.status as WeeklyBossStatus) || customStatus,
        missions: Array.isArray(body.missions) ? (body.missions as WeeklyBossMission[]) : template.missions,
        milestones: Array.isArray(body.milestones) ? (body.milestones as WeeklyBossMilestone[]) : template.milestones,
        rewards: body.rewards && typeof body.rewards === 'object' ? (body.rewards as WeeklyBossRewardConfig) : template.rewards,
        totalParticipants: 0,
        totalHits: 0,
        defeatedAt: null,
      };

      await withLock(() => {
        const ledger = readLedger();
        // Put newly scheduled/active event first if active
        if (newEvent.status === 'active') {
          for (const e of ledger.events) {
            if (e.status === 'active') e.status = 'resolved';
          }
        }
        ledger.events.unshift(newEvent);
        writeLedger(ledger);
      });

      res.status(201).json({ success: true, event: newEvent });
    });

    app.patch('/api/admin/weekly-boss/events/:id', async (req: Request, res: Response) => {
      if (!isAdminAuthorized(req)) {
        res.status(403).json({ success: false, error: 'Forbidden: administrator privileges required.' });
        return;
      }

      const id = String(req.params.id || '');
      const body = req.body && typeof req.body === 'object' ? req.body : {};

      const updated = await withLock(() => {
        const ledger = readLedger();
        const evt = ledger.events.find(e => e.id === id);
        if (!evt) return null;

        if (typeof body.bossName === 'string' && body.bossName.trim()) evt.bossName = body.bossName.trim();
        if (typeof body.bossDescription === 'string') evt.bossDescription = body.bossDescription;
        if (VALID_DIFFICULTIES.has(body.difficulty)) evt.difficulty = body.difficulty;
        if (typeof body.totalHealth === 'number' && body.totalHealth >= 100) {
          evt.totalHealth = Math.round(body.totalHealth);
          evt.currentHealth = Math.min(evt.currentHealth, evt.totalHealth);
        }
        if (typeof body.currentHealth === 'number') {
          evt.currentHealth = Math.max(0, Math.min(evt.totalHealth, Math.round(body.currentHealth)));
        }
        if (typeof body.startsAt === 'string') evt.startsAt = body.startsAt;
        if (typeof body.endsAt === 'string') evt.endsAt = body.endsAt;
        if (Array.isArray(body.missions)) evt.missions = body.missions;
        if (body.rewards && typeof body.rewards === 'object') {
          evt.rewards = { ...evt.rewards, ...body.rewards };
        }
        if (body.action === 'end' || body.status === 'resolved') {
          evt.status = evt.currentHealth <= 0 ? 'defeated' : 'resolved';
        } else if (typeof body.status === 'string') {
          evt.status = body.status as WeeklyBossStatus;
        }
        writeLedger(ledger);
        return evt;
      });

      if (!updated) {
        res.status(404).json({ success: false, error: 'Boss event not found.' });
        return;
      }

      res.json({ success: true, event: updated });
    });
  };

  return {
    registerRoutes,
    applyVerifiedBossDamage,
    getStateForUser,
  };
}
