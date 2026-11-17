import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import {
  calculateSafeCommunityPoints,
  createDefaultCommunityEvent,
  getCurrentWeekKey,
} from '../src/data/ecosystemData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  CommunityEvent,
  CommunityEventPlayerState,
  SkillActivityType,
} from '../src/types/game.ts';

interface CommunityContributionEntry {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  idempotencyKey: string;
  activityType: SkillActivityType;
  pointsAwarded: number;
  dailyBucket: string;
  createdAt: string;
}

interface CommunityClaimEntry {
  eventId: string;
  userId: string;
  milestoneId: string;
  xpAwarded: number;
  goldAwarded: number;
  claimedAt: string;
}

interface CommunityEventsLedgerFile {
  events: CommunityEvent[];
  contributions: CommunityContributionEntry[];
  claims: CommunityClaimEntry[];
}

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

export function createCommunityEventsService(rootDir: string) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_community_events.json');
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

  const readLedger = (): CommunityEventsLedgerFile => {
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

  const writeLedger = (data: CommunityEventsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const ensureCurrentEvent = (ledger: CommunityEventsLedgerFile): CommunityEvent => {
    const now = Date.now();
    let changed = false;

    for (const evt of ledger.events) {
      if (evt.status === 'active' && Date.parse(evt.endsAt) < now) {
        evt.status = 'completed';
        changed = true;
      }
    }

    const weekKey = getCurrentWeekKey(new Date(now));
    let activeEvt =
      ledger.events.find(e => e.status === 'active') ||
      ledger.events.find(e => e.id.includes(weekKey)) ||
      ledger.events[0];

    if (!activeEvt) {
      activeEvt = createDefaultCommunityEvent(new Date(now));
      ledger.events.unshift(activeEvt);
      changed = true;
    }

    if (changed) writeLedger(ledger);
    return activeEvt;
  };

  const buildPlayerState = (
    userId: string,
    ledger: CommunityEventsLedgerFile
  ): CommunityEventPlayerState => {
    const event = ensureCurrentEvent(ledger);
    const evtContribs = ledger.contributions.filter(c => c.eventId === event.id);
    const byUser = new Map<string, { username: string; points: number }>();

    let playerPoints = 0;
    let playerContributionsCount = 0;

    for (const c of evtContribs) {
      const prev = byUser.get(c.userId) || { username: c.username || 'Champion', points: 0 };
      prev.username = c.username || prev.username;
      prev.points += c.pointsAwarded;
      byUser.set(c.userId, prev);

      if (c.userId === userId) {
        playerPoints += c.pointsAwarded;
        playerContributionsCount += 1;
      }
    }

    const topContributors = Array.from(byUser.entries())
      .map(([uid, info]) => ({
        rank: 0,
        userId: uid,
        username: info.username,
        points: info.points,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 15)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const claimedMilestoneIds = ledger.claims
      .filter(c => c.eventId === event.id && c.userId === userId)
      .map(c => c.milestoneId);

    return {
      event: { ...event, participantsCount: byUser.size },
      playerPoints,
      playerContributionsCount,
      claimedMilestoneIds,
      topContributors,
    };
  };

  const applyVerifiedCommunityContribution = async (params: {
    userId: string;
    username: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    timezone?: string;
  }): Promise<{ applied: boolean; pointsAwarded: number; playerTotalPoints: number; eventId: string }> => {
    const { userId, username, activityType, idempotencyKey, metadata = {}, timezone } = params;
    const todayBucket = getTodayBucket(timezone);

    return withLock(() => {
      const ledger = readLedger();
      const event = ensureCurrentEvent(ledger);
      if (event.status !== 'active') {
        const pTotal = ledger.contributions
          .filter(c => c.eventId === event.id && c.userId === userId)
          .reduce((s, c) => s + c.pointsAwarded, 0);
        return { applied: false, pointsAwarded: 0, playerTotalPoints: pTotal, eventId: event.id };
      }

      const dup = ledger.contributions.find(
        c => c.eventId === event.id && c.userId === userId && c.idempotencyKey === idempotencyKey
      );
      const existingPlayerPoints = ledger.contributions
        .filter(c => c.eventId === event.id && c.userId === userId)
        .reduce((s, c) => s + c.pointsAwarded, 0);
      if (dup) {
        return {
          applied: true,
          pointsAwarded: 0,
          playerTotalPoints: existingPlayerPoints,
          eventId: event.id,
        };
      }

      const dailyPoints = ledger.contributions
        .filter(c => c.eventId === event.id && c.userId === userId && c.dailyBucket === todayBucket)
        .reduce((s, c) => s + c.pointsAwarded, 0);

      const calc = calculateSafeCommunityPoints(activityType, metadata, dailyPoints);
      if (calc.pointsAwarded > 0) {
        event.currentGoalPoints += calc.pointsAwarded;
        ledger.contributions.unshift({
          id: `cec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventId: event.id,
          userId,
          username: username || 'Champion',
          idempotencyKey,
          activityType,
          pointsAwarded: calc.pointsAwarded,
          dailyBucket: todayBucket,
          createdAt: new Date().toISOString(),
        });
        if (ledger.contributions.length > 2500) {
          ledger.contributions = ledger.contributions.slice(0, 2500);
        }
        const uniqueUsers = new Set(
          ledger.contributions.filter(c => c.eventId === event.id).map(c => c.userId)
        );
        event.participantsCount = uniqueUsers.size;
        writeLedger(ledger);
      }

      return {
        applied: true,
        pointsAwarded: calc.pointsAwarded,
        playerTotalPoints: existingPlayerPoints + calc.pointsAwarded,
        eventId: event.id,
      };
    });
  };

  const getStateForUser = async (userId: string) => {
    return withLock(() => {
      const ledger = readLedger();
      return buildPlayerState(userId, ledger);
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/community-events/state', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const state = await getStateForUser(userId);
      res.json({ success: true, ...state });
    });

    app.post('/api/community-events/claim-milestone', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const milestoneId = String(req.body?.milestoneId || '').trim();

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const state = buildPlayerState(userId, ledger);
        const milestone = state.event.milestones.find(m => m.id === milestoneId);
        if (!milestone) {
          return { status: 404, payload: { success: false, error: 'Community milestone not found.' } };
        }
        if (state.event.currentGoalPoints < milestone.targetPoints) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Realm goal has ${state.event.currentGoalPoints}/${milestone.targetPoints} pts.`,
            },
          };
        }
        if (state.playerContributionsCount < 1) {
          return {
            status: 400,
            payload: {
              success: false,
              error: 'Contribute at least 1 verified activity to claim community milestone honors.',
            },
          };
        }
        if (state.claimedMilestoneIds.includes(milestone.id)) {
          return {
            status: 409,
            payload: { success: false, alreadyClaimed: true, error: 'Milestone already claimed.' },
          };
        }

        ledger.claims.push({
          eventId: state.event.id,
          userId,
          milestoneId: milestone.id,
          xpAwarded: milestone.rewardXp,
          goldAwarded: milestone.rewardGold,
          claimedAt: new Date().toISOString(),
        });
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            rewards: { xp: milestone.rewardXp, gold: milestone.rewardGold },
            ...buildPlayerState(userId, ledger),
          },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });
  };

  return {
    registerRoutes,
    applyVerifiedCommunityContribution,
    getStateForUser,
  };
}
