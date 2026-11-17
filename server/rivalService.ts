import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import {
  RIVAL_CHALLENGE_CATALOG,
  calculateSafeRivalScoreDelta,
} from '../src/data/ecosystemData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  RivalChallengeType,
  RivalryRecord,
  RivalryScoreEntry,
  RivalryStatsSummary,
  SkillActivityType,
} from '../src/types/game.ts';

interface BlockEntry {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

interface RivalNotificationEvent {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  rivalryId: string;
  createdAt: string;
}

interface RivalsLedgerFile {
  rivalries: RivalryRecord[];
  scores: RivalryScoreEntry[];
  blocks: BlockEntry[];
  notifications: RivalNotificationEvent[];
}

export interface RivalScoreUpdateResult {
  updatedCount: number;
  pointsAwardedTotal: number;
  resolvedRivalries: RivalryRecord[];
}

const VALID_CHALLENGES = new Set<RivalChallengeType>([
  'weekly_activity_score',
  'workout_consistency',
  'strength_milestones',
  'endurance_achievements',
  'habit_completion',
]);

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

export function createRivalService(
  rootDir: string,
  opts?: { onRivalryCompleted?: (rivalry: RivalryRecord) => Promise<void> | void }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_rivals.json');
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

  const readLedger = (): RivalsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            rivalries: Array.isArray(parsed.rivalries) ? parsed.rivalries : [],
            scores: Array.isArray(parsed.scores) ? parsed.scores : [],
            blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
            notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { rivalries: [], scores: [], blocks: [], notifications: [] };
  };

  const writeLedger = (data: RivalsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const pushNotif = (
    ledger: RivalsLedgerFile,
    userId: string,
    type: string,
    title: string,
    body: string,
    rivalryId: string
  ) => {
    ledger.notifications.unshift({
      id: `rnotif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type,
      title,
      body,
      rivalryId,
      createdAt: new Date().toISOString(),
    });
    if (ledger.notifications.length > 500) {
      ledger.notifications = ledger.notifications.slice(0, 500);
    }
  };

  const isPairBlocked = (ledger: RivalsLedgerFile, a: string, b: string): boolean => {
    return ledger.blocks.some(
      blk =>
        (blk.blockerId === a && blk.blockedId === b) ||
        (blk.blockerId === b && blk.blockedId === a)
    );
  };

  const resolveExpiredRivalries = (ledger: RivalsLedgerFile): RivalryRecord[] => {
    const now = Date.now();
    const resolved: RivalryRecord[] = [];
    let changed = false;

    for (const r of ledger.rivalries) {
      const endMs = Date.parse(r.endsAt);
      if (r.status === 'active' && !Number.isNaN(endMs) && now >= endMs) {
        r.status = 'completed';
        r.resolvedAt = new Date(now).toISOString();
        if (r.challengerScore === r.opponentScore) {
          r.winnerId = null;
          r.isTie = true;
        } else if (r.challengerScore > r.opponentScore) {
          r.winnerId = r.challengerId;
          r.isTie = false;
        } else {
          r.winnerId = r.opponentId;
          r.isTie = false;
        }
        resolved.push({ ...r });
        changed = true;

        const outcomeText = r.isTie
          ? `Your ${r.challengeTitle} rivalry ended in a tie (${r.challengerScore} - ${r.opponentScore} pts).`
          : `${r.winnerId === r.challengerId ? r.challengerName : r.opponentName} won the ${r.challengeTitle} duel (${r.challengerScore} vs ${r.opponentScore} pts)!`;
        pushNotif(ledger, r.challengerId, 'rivalry_completed', 'Rivalry Concluded', outcomeText, r.id);
        pushNotif(ledger, r.opponentId, 'rivalry_completed', 'Rivalry Concluded', outcomeText, r.id);
      } else if (r.status === 'pending' && !Number.isNaN(endMs) && now >= endMs) {
        r.status = 'expired';
        r.resolvedAt = new Date(now).toISOString();
        changed = true;
        pushNotif(
          ledger,
          r.challengerId,
          'rivalry_expired',
          'Rivalry Invitation Expired',
          `Your pending ${r.challengeTitle} invitation to ${r.opponentName} expired.`,
          r.id
        );
      }
    }

    if (changed) {
      writeLedger(ledger);
    }
    return resolved;
  };

  const buildStatsForUser = (
    userId: string,
    rivalries: RivalryRecord[]
  ): RivalryStatsSummary => {
    const mine = rivalries.filter(r => r.challengerId === userId || r.opponentId === userId);
    const completed = mine.filter(r => r.status === 'completed');
    const wins = completed.filter(r => r.winnerId === userId).length;
    const ties = completed.filter(r => r.isTie).length;
    const losses = completed.filter(r => !r.isTie && r.winnerId && r.winnerId !== userId).length;
    const activeCount = mine.filter(r => r.status === 'active').length;
    const pendingIncomingCount = mine.filter(
      r => r.status === 'pending' && r.opponentId === userId
    ).length;

    const titlesUnlocked: string[] = [];
    const achievementsUnlocked: string[] = [];
    if (mine.some(r => r.status === 'active' || r.status === 'completed')) {
      achievementsUnlocked.push('Sworn Contender');
    }
    if (wins >= 1) {
      titlesUnlocked.push('Duelist of Honor');
      achievementsUnlocked.push('First Rivalry Victory');
    }
    if (wins >= 3) {
      titlesUnlocked.push('Vanguard Rival');
      achievementsUnlocked.push('Triad Champion');
    }
    if (wins >= 5) {
      titlesUnlocked.push('Unbroken Sovereign');
      achievementsUnlocked.push('Master of Friend Duels');
    }

    return {
      wins,
      losses,
      ties,
      activeCount,
      pendingIncomingCount,
      titlesUnlocked,
      achievementsUnlocked,
    };
  };

  const notifyCompleted = async (resolved: RivalryRecord[]) => {
    if (!opts?.onRivalryCompleted || resolved.length === 0) return;
    await Promise.all(
      resolved.map(r => Promise.resolve(opts.onRivalryCompleted!({ ...r })).catch(() => {}))
    );
  };

  const applyVerifiedRivalScore = async (params: {
    userId: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    timezone?: string;
  }): Promise<RivalScoreUpdateResult> => {
    const { userId, activityType, idempotencyKey, metadata = {}, timezone } = params;
    const todayBucket = getTodayBucket(timezone);

    const { result, resolved } = await withLock(() => {
      const ledger = readLedger();
      const resolvedList = resolveExpiredRivalries(ledger);
      const activeRivalries = ledger.rivalries.filter(
        r =>
          r.status === 'active' &&
          (r.challengerId === userId || r.opponentId === userId)
      );

      let updatedCount = 0;
      let pointsAwardedTotal = 0;

      for (const r of activeRivalries) {
        const dup = ledger.scores.find(
          s => s.rivalryId === r.id && s.userId === userId && s.idempotencyKey === idempotencyKey
        );
        if (dup) continue;

        const currentDailyScore = ledger.scores
          .filter(
            s =>
              s.rivalryId === r.id &&
              s.userId === userId &&
              s.createdAt.slice(0, 10) === todayBucket
          )
          .reduce((sum, s) => sum + s.pointsAwarded, 0);

        const calc = calculateSafeRivalScoreDelta(
          r.challengeType,
          activityType,
          metadata,
          currentDailyScore
        );

        if (calc.pointsAwarded <= 0) continue;

        if (r.challengerId === userId) {
          r.challengerScore += calc.pointsAwarded;
        } else {
          r.opponentScore += calc.pointsAwarded;
        }

        ledger.scores.unshift({
          id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          rivalryId: r.id,
          userId,
          idempotencyKey,
          activityType,
          label: calc.label,
          pointsAwarded: calc.pointsAwarded,
          safetyCapped: calc.safetyCapped,
          createdAt: new Date().toISOString(),
        });

        updatedCount += 1;
        pointsAwardedTotal += calc.pointsAwarded;
      }

      if (ledger.scores.length > 3000) {
        ledger.scores = ledger.scores.slice(0, 3000);
      }

      if (updatedCount > 0) {
        writeLedger(ledger);
      }

      return {
        resolved: resolvedList,
        result: {
          updatedCount,
          pointsAwardedTotal,
          resolvedRivalries: resolvedList.filter(
            r => r.challengerId === userId || r.opponentId === userId
          ),
        },
      };
    });

    await notifyCompleted(resolved);
    return result;
  };

  const getStateForUser = async (userId: string) => {
    const { state, resolved } = await withLock(() => {
      const ledger = readLedger();
      const resolvedList = resolveExpiredRivalries(ledger);

      // Strict privacy isolation: only expose rivalries belonging to caller
      const myRivalries = ledger.rivalries
        .filter(r => r.challengerId === userId || r.opponentId === userId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      const myRivalryIds = new Set(myRivalries.map(r => r.id));
      const recentScores = ledger.scores.filter(s => myRivalryIds.has(s.rivalryId)).slice(0, 30);
      const myNotifications = ledger.notifications
        .filter(n => n.userId === userId)
        .slice(0, 20);
      const blockedIds = ledger.blocks
        .filter(b => b.blockerId === userId)
        .map(b => b.blockedId);

      return {
        resolved: resolvedList,
        state: {
          rivalries: myRivalries,
          recentScores,
          stats: buildStatsForUser(userId, myRivalries),
          notifications: myNotifications,
          blockedIds,
        },
      };
    });

    await notifyCompleted(resolved);
    return state;
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/rivals/state', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const queryUid = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      if (queryUid && queryUid !== userId) {
        res.status(403).json({ success: false, error: 'Forbidden: cannot inspect another player’s private rivalries.' });
        return;
      }

      const state = await getStateForUser(userId);
      res.json({ success: true, ...state });
    });

    app.post('/api/rivals/invite', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const opponentId = String(body.opponentId || '').trim();
      const opponentName = String(body.opponentName || 'Companion').trim().slice(0, 48);
      const challengerName = String(body.challengerName || 'Champion').trim().slice(0, 48);
      const challengeType = String(body.challengeType || 'weekly_activity_score') as RivalChallengeType;
      const areFriends = body.isFriend !== false;

      if (!opponentId) {
        res.status(400).json({ success: false, error: 'Opponent ID is required.' });
        return;
      }
      if (opponentId === userId) {
        res.status(400).json({ success: false, error: 'You cannot challenge yourself to a rivalry.' });
        return;
      }
      if (!areFriends) {
        res.status(403).json({ success: false, error: 'Rivalry challenges are only allowed between accepted friends.' });
        return;
      }
      if (!VALID_CHALLENGES.has(challengeType)) {
        res.status(400).json({ success: false, error: 'Invalid rivalry challenge type.' });
        return;
      }

      const durationDays = Math.min(14, Math.max(1, Math.round(Number(body.durationDays || 7))));

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredRivalries(ledger);

        if (isPairBlocked(ledger, userId, opponentId)) {
          return {
            status: 403,
            payload: { success: false, error: 'Cannot challenge a blocked player.' },
          };
        }

        const duplicate = ledger.rivalries.find(
          r =>
            (r.status === 'pending' || r.status === 'active') &&
            r.challengeType === challengeType &&
            ((r.challengerId === userId && r.opponentId === opponentId) ||
              (r.challengerId === opponentId && r.opponentId === userId))
        );
        if (duplicate) {
          return {
            status: 409,
            payload: {
              success: false,
              error: `An active or pending ${duplicate.challengeTitle} rivalry already exists with this companion.`,
            },
          };
        }

        const nowMs = Date.now();
        const customEndsMs = body.endsAt ? Date.parse(String(body.endsAt)) : NaN;
        const endsIso = !Number.isNaN(customEndsMs)
          ? new Date(customEndsMs).toISOString()
          : new Date(nowMs + durationDays * 86400000).toISOString();

        const record: RivalryRecord = {
          id: `riv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          challengerId: userId,
          challengerName,
          opponentId,
          opponentName,
          challengeType,
          challengeTitle: RIVAL_CHALLENGE_CATALOG[challengeType].title,
          status: 'pending',
          challengerScore: 0,
          opponentScore: 0,
          winnerId: null,
          isTie: false,
          startsAt: new Date(nowMs).toISOString(),
          endsAt: endsIso,
          createdAt: new Date(nowMs).toISOString(),
          resolvedAt: null,
        };

        ledger.rivalries.unshift(record);
        pushNotif(
          ledger,
          opponentId,
          'rivalry_invite',
          'New Rivalry Challenge',
          `${challengerName} challenged you to a 7-day ${record.challengeTitle} duel!`,
          record.id
        );
        writeLedger(ledger);
        return { status: 201, payload: { success: true, rivalry: record } };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...outcome.payload, ...state });
    });

    app.post('/api/rivals/respond', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rivalryId = String(body.rivalryId || '').trim();
      const decision = String(body.decision || '').trim(); // 'accept' | 'decline'

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredRivalries(ledger);
        const r = ledger.rivalries.find(item => item.id === rivalryId);
        if (!r) return { status: 404, payload: { success: false, error: 'Rivalry not found.' } };
        if (r.opponentId !== userId) {
          return { status: 403, payload: { success: false, error: 'Only the challenged player can accept or decline.' } };
        }
        if (r.status !== 'pending') {
          return { status: 400, payload: { success: false, error: `Cannot respond to rivalry in ${r.status} status.` } };
        }
        if (isPairBlocked(ledger, r.challengerId, r.opponentId)) {
          r.status = 'cancelled';
          r.resolvedAt = new Date().toISOString();
          writeLedger(ledger);
          return { status: 403, payload: { success: false, error: 'Blocked players cannot accept rivalries.' } };
        }

        if (decision === 'accept') {
          const durationMs = Math.max(60000, Date.parse(r.endsAt) - Date.parse(r.startsAt));
          const now = Date.now();
          r.status = 'active';
          r.startsAt = new Date(now).toISOString();
          r.endsAt = new Date(now + durationMs).toISOString();
          pushNotif(
            ledger,
            r.challengerId,
            'rivalry_accepted',
            'Rivalry Accepted',
            `${r.opponentName} accepted your ${r.challengeTitle} duel!`,
            r.id
          );
        } else if (decision === 'decline') {
          r.status = 'declined';
          r.resolvedAt = new Date().toISOString();
          pushNotif(
            ledger,
            r.challengerId,
            'rivalry_declined',
            'Rivalry Declined',
            `${r.opponentName} declined your ${r.challengeTitle} invitation.`,
            r.id
          );
        } else {
          return { status: 400, payload: { success: false, error: 'Decision must be accept or decline.' } };
        }

        writeLedger(ledger);
        return { status: 200, payload: { success: true, rivalry: r } };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...outcome.payload, ...state });
    });

    app.post('/api/rivals/cancel', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const rivalryId = String(req.body?.rivalryId || '').trim();
      const outcome = await withLock(() => {
        const ledger = readLedger();
        const r = ledger.rivalries.find(item => item.id === rivalryId);
        if (!r) return { status: 404, payload: { success: false, error: 'Rivalry not found.' } };
        if (r.challengerId !== userId) {
          return { status: 403, payload: { success: false, error: 'Only the challenger can cancel a pending invitation.' } };
        }
        if (r.status !== 'pending') {
          return { status: 400, payload: { success: false, error: 'Only pending invitations can be cancelled.' } };
        }
        r.status = 'cancelled';
        r.resolvedAt = new Date().toISOString();
        writeLedger(ledger);
        return { status: 200, payload: { success: true, rivalry: r } };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...outcome.payload, ...state });
    });

    app.post('/api/rivals/end', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const rivalryId = String(req.body?.rivalryId || '').trim();
      const outcome = await withLock(() => {
        const ledger = readLedger();
        const r = ledger.rivalries.find(item => item.id === rivalryId);
        if (!r) return { status: 404, payload: { success: false, error: 'Rivalry not found.' } };
        if (r.challengerId !== userId && r.opponentId !== userId) {
          return { status: 403, payload: { success: false, error: 'Forbidden.' } };
        }
        if (r.status !== 'active') {
          return { status: 400, payload: { success: false, error: 'Only active rivalries can be ended early.' } };
        }
        r.status = 'cancelled';
        r.resolvedAt = new Date().toISOString();
        const otherId = r.challengerId === userId ? r.opponentId : r.challengerId;
        pushNotif(
          ledger,
          otherId,
          'rivalry_ended',
          'Rivalry Ended',
          `The active ${r.challengeTitle} rivalry was ended early.`,
          r.id
        );
        writeLedger(ledger);
        return { status: 200, payload: { success: true, rivalry: r } };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...outcome.payload, ...state });
    });

    app.post('/api/rivals/block', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const targetId = String(req.body?.targetUserId || '').trim();
      const unblock = Boolean(req.body?.unblock);
      if (!targetId || targetId === userId) {
        res.status(400).json({ success: false, error: 'Invalid targetUserId.' });
        return;
      }

      await withLock(() => {
        const ledger = readLedger();
        if (unblock) {
          ledger.blocks = ledger.blocks.filter(
            b => !(b.blockerId === userId && b.blockedId === targetId)
          );
        } else {
          if (!ledger.blocks.some(b => b.blockerId === userId && b.blockedId === targetId)) {
            ledger.blocks.push({
              blockerId: userId,
              blockedId: targetId,
              createdAt: new Date().toISOString(),
            });
          }
          // Cancel any pending or active rivalries between these two players
          for (const r of ledger.rivalries) {
            if (
              (r.status === 'pending' || r.status === 'active') &&
              ((r.challengerId === userId && r.opponentId === targetId) ||
                (r.challengerId === targetId && r.opponentId === userId))
            ) {
              r.status = 'cancelled';
              r.resolvedAt = new Date().toISOString();
            }
          }
        }
        writeLedger(ledger);
      });

      const state = await getStateForUser(userId);
      res.json({ success: true, ...state });
    });
  };

  return {
    registerRoutes,
    applyVerifiedRivalScore,
    getStateForUser,
  };
}
