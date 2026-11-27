import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller, verifyAdminHeader } from './authGuard.ts';
import {
  calculateSafeCommunityPoints,
  createDefaultCommunityEvent,
  getCurrentWeekKey,
} from '../src/data/ecosystemData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  CommunityEvent,
  CommunityEventAnnouncement,
  CommunityEventChallenge,
  CommunityEventHistoryEntry,
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

interface CommunityChallengeClaimEntry {
  eventId: string;
  userId: string;
  challengeId: string;
  xpAwarded: number;
  goldAwarded: number;
  claimedAt: string;
}

interface CommunityEventsLedgerFile {
  events: CommunityEvent[];
  contributions: CommunityContributionEntry[];
  claims: CommunityClaimEntry[];
  challengeClaims: CommunityChallengeClaimEntry[];
  challengeProgress: Record<string, Record<string, Record<string, number>>>; // eventId -> userId -> metric -> count
  announcements: CommunityEventAnnouncement[];
  history: CommunityEventHistoryEntry[];
}

export interface CommunityEventsDeps {
  onBroadcast?: (eventType: string, payload: unknown) => void;
  onNotifyUsers?: (params: {
    userIds: string[];
    eventKey: string;
    title: string;
    body: string;
  }) => Promise<void>;
  getKnownUserIds?: () => string[];
  onGrantCard?: (userId: string, cardId: string, sourceRef: string) => Promise<any>;
  onGrantTitle?: (params: { userId: string; titleId: string; sourceRef: string }) => Promise<any>;
  onUnlockCosmetic?: (params: { userId: string; cosmeticId: string; sourceRef: string }) => Promise<any>;
}

const DEFAULT_LIMITED_CHALLENGES: CommunityEventChallenge[] = [
  {
    id: 'cec_workouts_2',
    title: 'Festival Vanguard Set',
    description: 'Complete 2 verified physical workouts during this community moment.',
    metric: 'workouts',
    targetCount: 2,
    rewardXp: 50,
    rewardGold: 40,
    minLevel: 1,
    rewardCardId: 'card_evt_banner_call',
  },
  {
    id: 'cec_habits_4',
    title: 'Heartlands Daily Oath',
    description: 'Complete 4 verified daily habits or recovery actions while the festival burns.',
    metric: 'habits',
    targetCount: 4,
    rewardXp: 45,
    rewardGold: 35,
    minLevel: 1,
    rewardCardId: 'card_evt_golden_festival',
  },
  {
    id: 'cec_recovery_2',
    title: 'Sanctuary Rest & Recovery',
    description: 'Honor 2 restorative recovery or mindfulness check-ins during the event.',
    metric: 'recovery_habit',
    targetCount: 2,
    rewardXp: 40,
    rewardGold: 35,
    minLevel: 1,
    rewardCardId: 'card_fit_stillwater',
  },
  {
    id: 'cec_verified_5',
    title: 'Torchbearer Dedication',
    description: 'Log 5 total verified activities across any wellness pillar.',
    metric: 'verified_activities',
    targetCount: 5,
    rewardXp: 70,
    rewardGold: 60,
    minLevel: 1,
    rewardTitleId: 'title_event_herald',
  },
];

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

export function createCommunityEventsService(rootDir: string, deps?: CommunityEventsDeps) {
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
            challengeClaims: Array.isArray(parsed.challengeClaims) ? parsed.challengeClaims : [],
            challengeProgress:
              parsed.challengeProgress && typeof parsed.challengeProgress === 'object'
                ? parsed.challengeProgress
                : {},
            announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return {
      events: [],
      contributions: [],
      claims: [],
      challengeClaims: [],
      challengeProgress: {},
      announcements: [],
      history: [],
    };
  };

  const writeLedger = (data: CommunityEventsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const archiveCompletedEvent = (ledger: CommunityEventsLedgerFile, evt: CommunityEvent) => {
    evt.status = 'completed';
    if (ledger.history.some(h => h.id === evt.id)) return;
    const participants = new Set(
      ledger.contributions.filter(c => c.eventId === evt.id).map(c => c.userId)
    );
    const completedMilestonesCount = evt.milestones.filter(
      m => evt.currentGoalPoints >= m.targetPoints
    ).length;
    ledger.history.unshift({
      id: evt.id,
      title: evt.title,
      subtitle: evt.subtitle,
      startsAt: evt.startsAt,
      endsAt: evt.endsAt,
      finalPoints: evt.currentGoalPoints,
      targetGoalPoints: evt.targetGoalPoints,
      participantsCount: participants.size,
      completedMilestonesCount,
      endedAt: new Date().toISOString(),
    });
    ledger.history = ledger.history.slice(0, 30);
  };

  const ensureCurrentEvent = (ledger: CommunityEventsLedgerFile): CommunityEvent => {
    const now = Date.now();
    let changed = false;

    for (const evt of ledger.events) {
      if (evt.status === 'active' && Date.parse(evt.endsAt) < now) {
        archiveCompletedEvent(ledger, evt);
        changed = true;
      } else if (evt.status === 'upcoming' && Date.parse(evt.startsAt) <= now && Date.parse(evt.endsAt) > now) {
        evt.status = 'active';
        changed = true;
      }
      if (!Array.isArray(evt.limitedChallenges) || evt.limitedChallenges.length === 0) {
        evt.limitedChallenges = DEFAULT_LIMITED_CHALLENGES;
        changed = true;
      }
    }

    const weekKey = getCurrentWeekKey(new Date(now));
    let activeEvt =
      ledger.events.find(e => e.status === 'active') ||
      ledger.events.find(e => e.id.includes(weekKey)) ||
      ledger.events[0];

    if (!activeEvt) {
      activeEvt = {
        ...createDefaultCommunityEvent(new Date(now)),
        limitedChallenges: DEFAULT_LIMITED_CHALLENGES,
        minLevelRequired: 1,
      };
      ledger.events.unshift(activeEvt);
      ledger.announcements.unshift({
        id: `cea-init-${Date.now()}`,
        eventId: activeEvt.id,
        title: `${activeEvt.title} is Live`,
        message: 'Every verified workout, habit, study block, and recovery activity fuels collective realm milestones.',
        severity: 'info',
        createdAt: new Date(now).toISOString(),
      });
      changed = true;
    }

    // Ensure at least one scheduled upcoming moment exists when none is queued
    const hasUpcoming = ledger.events.some(e => e.status === 'upcoming');
    if (!hasUpcoming) {
      const nextStart = new Date(Math.max(now + 86400_000, Date.parse(activeEvt.endsAt) + 3600_000));
      const nextEnd = new Date(nextStart.getTime() + 7 * 86400_000);
      ledger.events.push({
        id: `ce-upcoming-${nextStart.toISOString().slice(0, 10)}`,
        title: 'Solstice Spire Endurance Rally',
        subtitle: 'Scheduled Realm-Wide Conditioning Moment',
        description: 'Prepare your guild and workout parties for a 7-day collective endurance celebration across Aetheria.',
        themeColor: '#1677FF',
        status: 'upcoming',
        startsAt: nextStart.toISOString(),
        endsAt: nextEnd.toISOString(),
        targetGoalPoints: 8000,
        currentGoalPoints: 0,
        participantsCount: 0,
        milestones: activeEvt.milestones,
        limitedChallenges: DEFAULT_LIMITED_CHALLENGES,
        minLevelRequired: 1,
      });
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

    const claimedChallengeIds = ledger.challengeClaims
      .filter(c => c.eventId === event.id && c.userId === userId)
      .map(c => c.challengeId);

    const userCounts = ledger.challengeProgress[event.id]?.[userId] || {};
    const challengeProgress: NonNullable<CommunityEventPlayerState['challengeProgress']> = {};
    for (const ch of event.limitedChallenges || DEFAULT_LIMITED_CHALLENGES) {
      const cur = Number(userCounts[ch.metric] || 0);
      challengeProgress[ch.id] = {
        current: cur,
        target: ch.targetCount,
        completed: cur >= ch.targetCount,
        claimed: claimedChallengeIds.includes(ch.id),
      };
    }

    const upcomingEvents = ledger.events
      .filter(e => e.status === 'upcoming')
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .slice(0, 5);

    const announcements = ledger.announcements
      .filter(a => a.eventId === event.id || a.eventId === 'global')
      .slice(0, 20);

    return {
      event: { ...event, participantsCount: byUser.size },
      upcomingEvents,
      eventHistory: ledger.history.slice(0, 15),
      announcements,
      playerPoints,
      playerContributionsCount,
      claimedMilestoneIds,
      claimedChallengeIds,
      challengeProgress,
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

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const event = ensureCurrentEvent(ledger);
      if (event.status !== 'active') {
        const pTotal = ledger.contributions
          .filter(c => c.eventId === event.id && c.userId === userId)
          .reduce((s, c) => s + c.pointsAwarded, 0);
        return {
          applied: false,
          pointsAwarded: 0,
          playerTotalPoints: pTotal,
          eventId: event.id,
          milestoneReached: null as string | null,
        };
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
          milestoneReached: null as string | null,
        };
      }

      const dailyPoints = ledger.contributions
        .filter(c => c.eventId === event.id && c.userId === userId && c.dailyBucket === todayBucket)
        .reduce((s, c) => s + c.pointsAwarded, 0);

      const calc = calculateSafeCommunityPoints(activityType, metadata, dailyPoints);
      let milestoneReachedTitle: string | null = null;

      if (calc.pointsAwarded > 0) {
        const prevPts = event.currentGoalPoints;
        event.currentGoalPoints += calc.pointsAwarded;
        const newlyCrossed = event.milestones.find(
          m => prevPts < m.targetPoints && event.currentGoalPoints >= m.targetPoints
        );
        if (newlyCrossed) {
          milestoneReachedTitle = newlyCrossed.title;
          ledger.announcements.unshift({
            id: `cea-ms-${Date.now()}`,
            eventId: event.id,
            title: `Community Milestone Unlocked: ${newlyCrossed.title}`,
            message: `The realm crossed ${newlyCrossed.targetPoints.toLocaleString()} points! Contributors can now claim their milestone reward.`,
            severity: 'milestone',
            createdAt: new Date().toISOString(),
          });
        }

        // Track challenge metrics
        if (!ledger.challengeProgress[event.id]) ledger.challengeProgress[event.id] = {};
        if (!ledger.challengeProgress[event.id][userId]) ledger.challengeProgress[event.id][userId] = {};
        const uc = ledger.challengeProgress[event.id][userId];
        uc.verified_activities = (uc.verified_activities || 0) + 1;
        if (activityType === 'strength_workout' || activityType === 'cardio_workout') {
          uc.workouts = (uc.workouts || 0) + 1;
        }
        if (activityType === 'cardio_workout') uc.cardio = (uc.cardio || 0) + 1;
        if (activityType === 'habit_completion' || activityType === 'recovery_habit') {
          uc.habits = (uc.habits || 0) + 1;
        }
        if (activityType === 'recovery_habit') {
          uc.recovery_habit = (uc.recovery_habit || 0) + 1;
        }
        if (activityType === 'study_session') uc.study = (uc.study || 0) + 1;

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
        milestoneReached: milestoneReachedTitle,
      };
    });

    if (outcome.pointsAwarded > 0) {
      deps?.onBroadcast?.('community_moment:update', {
        eventId: outcome.eventId,
        pointsAwarded: outcome.pointsAwarded,
      });
    }
    if (outcome.milestoneReached && deps?.onNotifyUsers) {
      const userIds = deps.getKnownUserIds ? deps.getKnownUserIds() : [userId];
      await deps.onNotifyUsers({
        userIds,
        eventKey: `ce_milestone:${outcome.eventId}:${outcome.milestoneReached}`,
        title: `Community Milestone: ${outcome.milestoneReached}`,
        body: 'The realm reached a collective Community Moment milestone! Visit Live Events to claim.',
      });
    }

    return {
      applied: outcome.applied,
      pointsAwarded: outcome.pointsAwarded,
      playerTotalPoints: outcome.playerTotalPoints,
      eventId: outcome.eventId,
    };
  };

  const getStateForUser = async (userId: string) => {
    return withLock(() => {
      const ledger = readLedger();
      return buildPlayerState(userId, ledger);
    });
  };

  const requireAdminKey = (req: Request, res: Response): boolean => {
    if (!verifyAdminHeader(req, ['LIFEQUEST_ADMIN_KEY', 'LIFEQUEST_ADMIN_SECRET'])) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Steward admin authorization key required.',
      });
      return false;
    }
    return true;
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/community-events/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const state = await getStateForUser(auth.userId);
      res.json({ success: true, ...state });
    });

    app.post('/api/community-events/claim-milestone', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const milestoneId = String(req.body?.milestoneId || '').trim();

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const state = buildPlayerState(auth.userId!, ledger);
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
          userId: auth.userId!,
          milestoneId: milestone.id,
          xpAwarded: milestone.rewardXp,
          goldAwarded: milestone.rewardGold,
          claimedAt: new Date().toISOString(),
        });
        writeLedger(ledger);
        return {
          status: 200,
          milestone,
          payload: {
            success: true,
            rewards: { xp: milestone.rewardXp, gold: milestone.rewardGold },
            ...buildPlayerState(auth.userId!, ledger),
          },
        };
      });

      if (outcome.status === 200 && outcome.milestone) {
        const ms = outcome.milestone;
        if (ms.rewardCardId && deps?.onGrantCard) {
          await deps.onGrantCard(auth.userId, ms.rewardCardId, `ce_ms:${ms.id}`);
        }
        if (ms.rewardTitleId && deps?.onGrantTitle) {
          await deps.onGrantTitle({ userId: auth.userId, titleId: ms.rewardTitleId, sourceRef: `ce_ms:${ms.id}` });
        }
        if (ms.rewardCosmeticId && deps?.onUnlockCosmetic) {
          await deps.onUnlockCosmetic({ userId: auth.userId, cosmeticId: ms.rewardCosmeticId, sourceRef: `ce_ms:${ms.id}` });
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/community-events/claim-challenge', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const challengeId = String(req.body?.challengeId || '').trim();

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const state = buildPlayerState(auth.userId!, ledger);
        const challenges = state.event.limitedChallenges || DEFAULT_LIMITED_CHALLENGES;
        const ch = challenges.find(c => c.id === challengeId);
        if (!ch) {
          return { status: 404, payload: { success: false, error: 'Limited challenge not found.' } };
        }
        const prog = state.challengeProgress?.[ch.id];
        if (!prog || !prog.completed) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Challenge incomplete (${prog?.current || 0}/${ch.targetCount}).`,
            },
          };
        }
        if (prog.claimed) {
          return { status: 409, payload: { success: false, error: 'Limited challenge already claimed.' } };
        }

        ledger.challengeClaims.push({
          eventId: state.event.id,
          userId: auth.userId!,
          challengeId: ch.id,
          xpAwarded: ch.rewardXp,
          goldAwarded: ch.rewardGold,
          claimedAt: new Date().toISOString(),
        });
        writeLedger(ledger);
        return {
          status: 200,
          ch,
          payload: {
            success: true,
            rewards: { xp: ch.rewardXp, gold: ch.rewardGold },
            ...buildPlayerState(auth.userId!, ledger),
          },
        };
      });

      if (outcome.status === 200 && outcome.ch) {
        const ch = outcome.ch;
        if (ch.rewardCardId && deps?.onGrantCard) {
          await deps.onGrantCard(auth.userId, ch.rewardCardId, `ce_ch:${ch.id}`);
        }
        if (ch.rewardTitleId && deps?.onGrantTitle) {
          await deps.onGrantTitle({ userId: auth.userId, titleId: ch.rewardTitleId, sourceRef: `ce_ch:${ch.id}` });
        }
        if (ch.rewardCosmeticId && deps?.onUnlockCosmetic) {
          await deps.onUnlockCosmetic({ userId: auth.userId, cosmeticId: ch.rewardCosmeticId, sourceRef: `ce_ch:${ch.id}` });
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });

    // Admin Steward endpoints for Live Community Moments
    app.post('/api/admin/community-events/create', async (req: Request, res: Response) => {
      if (!requireAdminKey(req, res)) return;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const title = String(body.title || '').trim().slice(0, 90);
      const subtitle = String(body.subtitle || 'Community Wellness Rally').trim().slice(0, 120);
      const description = String(body.description || 'Unite verified wellness efforts across Aetheria.').trim().slice(0, 320);
      const status = body.status === 'active' ? 'active' : 'upcoming';
      const targetGoalPoints = Math.max(500, Math.min(100_000, Math.round(Number(body.targetGoalPoints || 5000))));
      const durationDays = Math.max(1, Math.min(30, Math.round(Number(body.durationDays || 7))));

      if (title.length < 4) {
        res.status(400).json({ success: false, error: 'Event title must be at least 4 characters.' });
        return;
      }

      const created = await withLock(() => {
        const ledger = readLedger();
        const now = Date.now();
        const startsAt =
          status === 'active'
            ? new Date(now).toISOString()
            : body.startsAt && !Number.isNaN(Date.parse(body.startsAt))
            ? new Date(body.startsAt).toISOString()
            : new Date(now + 86400_000).toISOString();
        const endsAt = new Date(Date.parse(startsAt) + durationDays * 86400_000).toISOString();

        if (status === 'active') {
          for (const e of ledger.events) {
            if (e.status === 'active') archiveCompletedEvent(ledger, e);
          }
        }

        const evt: CommunityEvent = {
          id: `ce-${Date.now()}`,
          title,
          subtitle,
          description,
          themeColor: '#C5A15A',
          status,
          startsAt,
          endsAt,
          targetGoalPoints,
          currentGoalPoints: 0,
          participantsCount: 0,
          milestones: [
            { id: `cem-${Date.now()}-1`, title: 'First Spark', targetPoints: Math.round(targetGoalPoints * 0.2), rewardXp: 35, rewardGold: 25 },
            { id: `cem-${Date.now()}-2`, title: 'Realm Surge', targetPoints: Math.round(targetGoalPoints * 0.55), rewardXp: 65, rewardGold: 55 },
            { id: `cem-${Date.now()}-3`, title: 'Grand Convergence', targetPoints: targetGoalPoints, rewardXp: 110, rewardGold: 95 },
          ],
          limitedChallenges: DEFAULT_LIMITED_CHALLENGES,
          minLevelRequired: Math.max(1, Math.round(Number(body.minLevelRequired || 1))),
        };
        ledger.events.unshift(evt);
        writeLedger(ledger);
        return evt;
      });

      deps?.onBroadcast?.('community_moment:update', { action: 'created', eventId: created.id });
      if (created.status === 'active' && deps?.onNotifyUsers && deps?.getKnownUserIds) {
        await deps.onNotifyUsers({
          userIds: deps.getKnownUserIds(),
          eventKey: `ce_start:${created.id}`,
          title: `Live Event Started: ${created.title}`,
          body: created.subtitle,
        });
      }
      res.status(201).json({ success: true, event: created });
    });

    app.post('/api/admin/community-events/update', async (req: Request, res: Response) => {
      if (!requireAdminKey(req, res)) return;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const eventId = String(body.eventId || '').trim();
      const result = await withLock(() => {
        const ledger = readLedger();
        const evt = ledger.events.find(e => e.id === eventId);
        if (!evt) return { status: 404, payload: { success: false, error: 'Event not found.' } };
        if (typeof body.title === 'string' && body.title.trim().length >= 3) {
          evt.title = body.title.trim().slice(0, 90);
        }
        if (typeof body.subtitle === 'string' && body.subtitle.trim()) {
          evt.subtitle = body.subtitle.trim().slice(0, 120);
        }
        if (typeof body.description === 'string' && body.description.trim()) {
          evt.description = body.description.trim().slice(0, 320);
        }
        if (typeof body.targetGoalPoints === 'number' && body.targetGoalPoints >= 500) {
          evt.targetGoalPoints = Math.min(100_000, Math.round(body.targetGoalPoints));
        }
        writeLedger(ledger);
        return { status: 200, payload: { success: true, event: evt } };
      });
      if (result.status === 200) {
        deps?.onBroadcast?.('community_moment:update', { action: 'updated', eventId });
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/admin/community-events/announce', async (req: Request, res: Response) => {
      if (!requireAdminKey(req, res)) return;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const title = String(body.title || '').trim().slice(0, 100);
      const message = String(body.message || '').trim().slice(0, 320);
      const severity =
        body.severity === 'milestone' || body.severity === 'alert' ? body.severity : 'info';

      if (title.length < 3 || message.length < 4) {
        res.status(400).json({ success: false, error: 'Announcement title and message required.' });
        return;
      }

      const announcement = await withLock(() => {
        const ledger = readLedger();
        const active = ensureCurrentEvent(ledger);
        const entry: CommunityEventAnnouncement = {
          id: `cea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          eventId: String(body.eventId || active.id),
          title,
          message,
          severity,
          createdAt: new Date().toISOString(),
        };
        ledger.announcements.unshift(entry);
        ledger.announcements = ledger.announcements.slice(0, 40);
        writeLedger(ledger);
        return entry;
      });

      deps?.onBroadcast?.('community_moment:update', { action: 'announcement', announcement });
      if (deps?.onNotifyUsers && deps?.getKnownUserIds) {
        await deps.onNotifyUsers({
          userIds: deps.getKnownUserIds(),
          eventKey: `ce_ann:${announcement.id}`,
          title: `Realm Dispatch: ${announcement.title}`,
          body: announcement.message,
        });
      }
      res.json({ success: true, announcement });
    });

    app.post('/api/admin/community-events/end', async (req: Request, res: Response) => {
      if (!requireAdminKey(req, res)) return;
      const eventId = String(req.body?.eventId || '').trim();

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const evt = eventId
          ? ledger.events.find(e => e.id === eventId)
          : ledger.events.find(e => e.status === 'active');
        if (!evt) return { status: 404, payload: { success: false, error: 'Active event not found.' } };

        archiveCompletedEvent(ledger, evt);
        const upcoming = ledger.events.find(e => e.status === 'upcoming');
        if (upcoming) {
          upcoming.status = 'active';
          upcoming.startsAt = new Date().toISOString();
          upcoming.endsAt = new Date(Date.now() + 7 * 86400_000).toISOString();
        }
        const nextActive = ensureCurrentEvent(ledger);
        writeLedger(ledger);
        return {
          status: 200,
          endedTitle: evt.title,
          payload: { success: true, endedEventId: evt.id, nextActiveEvent: nextActive },
        };
      });

      if (outcome.status === 200) {
        deps?.onBroadcast?.('community_moment:update', { action: 'ended', eventId });
        if (deps?.onNotifyUsers && deps?.getKnownUserIds) {
          await deps.onNotifyUsers({
            userIds: deps.getKnownUserIds(),
            eventKey: `ce_end:${Date.now()}`,
            title: `Community Event Concluded: ${(outcome as any).endedTitle}`,
            body: 'Final community statistics have been archived in Event History.',
          });
        }
      }
      res.status(outcome.status).json(outcome.payload);
    });
  };

  return {
    registerRoutes,
    applyVerifiedCommunityContribution,
    getStateForUser,
  };
}
