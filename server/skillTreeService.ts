import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import {
  ACTIVITY_TO_ATTRIBUTE_MAP,
  SKILL_ATTRIBUTE_IDS,
  calculateSafeVerifiedActivityXp,
  computeAttributeProgress,
  evaluateSkillNodeStatus,
  getSkillMilestoneById,
  getSkillNodeById,
  type VerifiedActivityMetadata,
} from '../src/data/skillTreeData.ts';
import type {
  PlayerAttributeProgress,
  PlayerSkillTreeState,
  SkillActivityLedgerEntry,
  SkillActivityType,
  SkillAttributeId,
  SkillTreeAnalyticsPayload,
  SkillTreeDailyPoint,
} from '../src/types/game.ts';

interface StoredAttributeRecord {
  xp: number;
  totalActivities: number;
  lastActivityAt: string | null;
}

interface StoredDailyBucketRecord {
  totalXp: number;
  strength: number;
  endurance: number;
  discipline: number;
  focus: number;
  resilience: number;
  vitality: number;
  activitiesCount: number;
}

interface StoredUserSkillTree {
  attributes: Record<SkillAttributeId, StoredAttributeRecord>;
  unlockedNodeIds: string[];
  claimedMilestoneIds: string[];
  events: SkillActivityLedgerEntry[];
  processedKeys?: string[];
  dailyHistory?: Record<string, StoredDailyBucketRecord>;
}

interface SkillTreeLedgerFile {
  users: Record<string, StoredUserSkillTree>;
}

const VALID_ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  'strength_workout',
  'cardio_workout',
  'habit_completion',
  'study_session',
  'comeback_activity',
  'recovery_habit',
]);

const getBucketForDate = (dateInput: Date | string, timezone?: string): string => {
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const validDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const tz = typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(validDate);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback to UTC
  }
  return validDate.toISOString().slice(0, 10);
};

const getTodayBucket = (timezone?: string): string => getBucketForDate(new Date(), timezone);

const createEmptyDailyBucket = (): StoredDailyBucketRecord => ({
  totalXp: 0,
  strength: 0,
  endurance: 0,
  discipline: 0,
  focus: 0,
  resilience: 0,
  vitality: 0,
  activitiesCount: 0,
});

const createEmptyUserRecord = (): StoredUserSkillTree => {
  const attributes = {} as Record<SkillAttributeId, StoredAttributeRecord>;
  for (const attrId of SKILL_ATTRIBUTE_IDS) {
    attributes[attrId] = { xp: 0, totalActivities: 0, lastActivityAt: null };
  }
  return {
    attributes,
    unlockedNodeIds: [],
    claimedMilestoneIds: [],
    events: [],
    processedKeys: [],
    dailyHistory: {},
  };
};

const buildDailySeries = (
  dailyHistory: Record<string, StoredDailyBucketRecord>,
  todayBucket: string,
  days: number
): SkillTreeDailyPoint[] => {
  const endMs = Date.parse(`${todayBucket}T00:00:00Z`) || Date.now();
  const points: SkillTreeDailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(endMs - i * 86400000);
    const dateKey = dt.toISOString().slice(0, 10);
    const b = dailyHistory[dateKey];
    points.push({
      date: dateKey,
      totalXp: b?.totalXp || 0,
      strength: b?.strength || 0,
      endurance: b?.endurance || 0,
      discipline: b?.discipline || 0,
      focus: b?.focus || 0,
      resilience: b?.resilience || 0,
      vitality: b?.vitality || 0,
      activitiesCount: b?.activitiesCount || 0,
    });
  }
  return points;
};

const buildPlayerStateResponse = (
  record: StoredUserSkillTree,
  todayBucket: string,
  reconciledCount?: number
): PlayerSkillTreeState => {
  const attributes = {} as Record<SkillAttributeId, PlayerAttributeProgress>;
  const dailyHistory = record.dailyHistory || {};
  const todayRow = dailyHistory[todayBucket];

  let totalSkillXp = 0;
  let totalActivities = 0;

  for (const attrId of SKILL_ATTRIBUTE_IDS) {
    const raw = record.attributes[attrId] || { xp: 0, totalActivities: 0, lastActivityAt: null };
    const dailyXp = todayRow
      ? Number(todayRow[attrId] || 0)
      : record.events
          .filter(e => e.attributeId === attrId && e.dailyBucket === todayBucket)
          .reduce((sum, e) => sum + e.xpAwarded, 0);

    const progress = computeAttributeProgress(
      attrId,
      raw.xp,
      raw.totalActivities,
      dailyXp,
      raw.lastActivityAt
    );
    attributes[attrId] = progress;
    totalSkillXp += progress.xp;
    totalActivities += progress.totalActivities;
  }

  const attributeDistribution = {} as SkillTreeAnalyticsPayload['attributeDistribution'];
  for (const attrId of SKILL_ATTRIBUTE_IDS) {
    const p = attributes[attrId];
    attributeDistribution[attrId] = {
      xp: p.xp,
      percent: totalSkillXp > 0 ? Math.round((p.xp / totalSkillXp) * 1000) / 10 : 0,
      level: p.level,
    };
  }

  const analytics: SkillTreeAnalyticsPayload = {
    totalSkillXp,
    totalActivities,
    ...(typeof reconciledCount === 'number' ? { reconciledCount } : {}),
    attributeDistribution,
    dailySeries7d: buildDailySeries(dailyHistory, todayBucket, 7),
    dailySeries30d: buildDailySeries(dailyHistory, todayBucket, 30),
    lastUpdatedAt: new Date().toISOString(),
  };

  return {
    attributes,
    unlockedNodeIds: [...record.unlockedNodeIds],
    claimedMilestoneIds: [...record.claimedMilestoneIds],
    recentEvents: record.events.slice(0, 40),
    analytics,
  };
};

const resolveAuthenticatedUserId = async (
  req: Request
): Promise<{ userId: string | null; error?: string; status?: number }> => {
  const bodyUid =
    req.body && typeof req.body === 'object' ? String(req.body.userId || '').trim() : '';
  const queryUid = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
  const auth = await resolveVerifiedCaller(req, {
    expectedOwnerId: bodyUid || queryUid || undefined,
  });
  if (!auth.ok || !auth.userId) {
    return {
      userId: null,
      status: auth.status || 401,
      error: auth.error || 'Authentication required: missing verified player identity.',
    };
  }
  return { userId: auth.userId };
};

export function registerSkillTreeRoutes(app: Express, rootDir: string) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_skill_tree_ledger.json');
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

  const readLedger = (): SkillTreeLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object' && parsed.users) {
          return { users: parsed.users };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { users: {} };
  };

  const writeLedger = (data: SkillTreeLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const ensureUserRecord = (ledger: SkillTreeLedgerFile, userId: string): StoredUserSkillTree => {
    if (!ledger.users[userId]) {
      ledger.users[userId] = createEmptyUserRecord();
    }
    const u = ledger.users[userId];
    for (const attrId of SKILL_ATTRIBUTE_IDS) {
      if (!u.attributes[attrId]) {
        u.attributes[attrId] = { xp: 0, totalActivities: 0, lastActivityAt: null };
      }
    }
    if (!Array.isArray(u.unlockedNodeIds)) u.unlockedNodeIds = [];
    if (!Array.isArray(u.claimedMilestoneIds)) u.claimedMilestoneIds = [];
    if (!Array.isArray(u.events)) u.events = [];

    // Hydrate permanent processedKeys & dailyHistory from existing events if migrating from older ledger shape
    if (!Array.isArray(u.processedKeys)) {
      u.processedKeys = Array.from(new Set(u.events.map(e => e.idempotencyKey).filter(Boolean)));
    } else {
      const keySet = new Set(u.processedKeys);
      for (const e of u.events) {
        if (e.idempotencyKey && !keySet.has(e.idempotencyKey)) {
          keySet.add(e.idempotencyKey);
          u.processedKeys.push(e.idempotencyKey);
        }
      }
    }

    if (!u.dailyHistory || typeof u.dailyHistory !== 'object') {
      u.dailyHistory = {};
      for (const e of u.events) {
        const bKey = e.dailyBucket || String(e.createdAt || '').slice(0, 10);
        if (!bKey) continue;
        const row = u.dailyHistory[bKey] || createEmptyDailyBucket();
        row[e.attributeId] = (row[e.attributeId] || 0) + Number(e.xpAwarded || 0);
        row.totalXp += Number(e.xpAwarded || 0);
        row.activitiesCount += 1;
        u.dailyHistory[bKey] = row;
      }
    }

    return u;
  };

  const recordVerifiedEntry = (
    u: StoredUserSkillTree,
    params: {
      idempotencyKey: string;
      activityType: SkillActivityType;
      sourceType: string;
      sourceId: string;
      metadata: VerifiedActivityMetadata;
      bucket: string;
      createdAtIso?: string;
    }
  ): {
    duplicate: boolean;
    attributeId: SkillAttributeId;
    xpAwarded: number;
    safetyCapped: boolean;
    previousLevel: number;
    newLevel: number;
  } => {
    const { idempotencyKey, activityType, sourceType, sourceId, metadata, bucket } = params;
    const processedSet = new Set(u.processedKeys || []);

    if (processedSet.has(idempotencyKey)) {
      const existingEvt = u.events.find(e => e.idempotencyKey === idempotencyKey);
      const attrId = existingEvt?.attributeId || ACTIVITY_TO_ATTRIBUTE_MAP[activityType];
      const prog = computeAttributeProgress(
        attrId,
        u.attributes[attrId].xp,
        u.attributes[attrId].totalActivities,
        Number(u.dailyHistory?.[bucket]?.[attrId] || 0),
        u.attributes[attrId].lastActivityAt
      );
      return {
        duplicate: true,
        attributeId: attrId,
        xpAwarded: 0,
        safetyCapped: false,
        previousLevel: prog.level,
        newLevel: prog.level,
      };
    }

    const targetAttr = ACTIVITY_TO_ATTRIBUTE_MAP[activityType];
    const dailyHistory = u.dailyHistory || (u.dailyHistory = {});
    const currentDailyXp = Number(dailyHistory[bucket]?.[targetAttr] || 0);

    const calc = calculateSafeVerifiedActivityXp(activityType, metadata, currentDailyXp);
    const prevAttrRaw = u.attributes[targetAttr];
    const prevProgress = computeAttributeProgress(
      targetAttr,
      prevAttrRaw.xp,
      prevAttrRaw.totalActivities,
      currentDailyXp,
      prevAttrRaw.lastActivityAt
    );

    const nowIso = params.createdAtIso || new Date().toISOString();
    const entry: SkillActivityLedgerEntry = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      idempotencyKey,
      activityType,
      attributeId: calc.attributeId,
      sourceType: sourceType || 'verified_activity',
      sourceId: sourceId || idempotencyKey,
      xpAwarded: calc.xpAwarded,
      safetyCapped: calc.safetyCapped,
      dailyBucket: bucket,
      createdAt: nowIso,
    };

    u.attributes[targetAttr] = {
      xp: prevAttrRaw.xp + calc.xpAwarded,
      totalActivities: prevAttrRaw.totalActivities + 1,
      lastActivityAt:
        !prevAttrRaw.lastActivityAt || nowIso > prevAttrRaw.lastActivityAt
          ? nowIso
          : prevAttrRaw.lastActivityAt,
    };

    const row = dailyHistory[bucket] || createEmptyDailyBucket();
    row[targetAttr] = (row[targetAttr] || 0) + calc.xpAwarded;
    row.totalXp += calc.xpAwarded;
    row.activitiesCount += 1;
    dailyHistory[bucket] = row;

    u.processedKeys = u.processedKeys || [];
    u.processedKeys.push(idempotencyKey);

    u.events.unshift(entry);
    // Re-sort only if backfilling older items, cap recent events list at 500 without losing cumulative totals/dailyHistory/processedKeys!
    if (u.events.length > 500) {
      u.events = u.events.slice(0, 500);
    }

    const nextProgress = computeAttributeProgress(
      targetAttr,
      u.attributes[targetAttr].xp,
      u.attributes[targetAttr].totalActivities,
      row[targetAttr],
      u.attributes[targetAttr].lastActivityAt
    );

    return {
      duplicate: false,
      attributeId: targetAttr,
      xpAwarded: calc.xpAwarded,
      safetyCapped: calc.safetyCapped,
      previousLevel: prevProgress.level,
      newLevel: nextProgress.level,
    };
  };

  app.get('/api/skill-tree/state', async (req: Request, res: Response) => {
    const auth = await resolveAuthenticatedUserId(req);
    if (!auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error });
      return;
    }
    const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : 'UTC';
    const todayBucket = getTodayBucket(timezone);

    const state = await withLock(() => {
      const ledger = readLedger();
      const userRecord = ensureUserRecord(ledger, auth.userId!);
      return buildPlayerStateResponse(userRecord, todayBucket);
    });

    res.json({ success: true, state });
  });

  app.post('/api/skill-tree/award-activity', async (req: Request, res: Response) => {
    const auth = await resolveAuthenticatedUserId(req);
    if (!auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Never accept untrusted frontend XP/level overrides
    if (
      'xp' in body ||
      'xpAmount' in body ||
      'xpAwarded' in body ||
      'attributeXp' in body ||
      'level' in body
    ) {
      res.status(400).json({
        success: false,
        error:
          'Untrusted XP or level overrides are rejected. Skill XP is calculated strictly on the server.',
      });
      return;
    }

    const activityType = String(body.activityType || '') as SkillActivityType;
    const idempotencyKey = String(body.idempotencyKey || '').trim();
    const sourceType = String(body.sourceType || 'verified_activity').trim();
    const sourceId = String(body.sourceId || '').trim();
    const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';

    if (!VALID_ACTIVITY_TYPES.has(activityType)) {
      res.status(400).json({ success: false, error: 'Invalid verified skill activity type.' });
      return;
    }

    if (idempotencyKey.length < 3) {
      res.status(400).json({ success: false, error: 'Valid idempotencyKey is required.' });
      return;
    }

    const metadata: VerifiedActivityMetadata =
      body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (
      (metadata.durationMinutes !== undefined && Number(metadata.durationMinutes) < 0) ||
      (metadata.repetitions !== undefined && Number(metadata.repetitions) < 0)
    ) {
      res.status(400).json({ success: false, error: 'Invalid negative activity metrics.' });
      return;
    }

    const todayBucket = getTodayBucket(timezone);

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const userRecord = ensureUserRecord(ledger, auth.userId!);

      const resEntry = recordVerifiedEntry(userRecord, {
        idempotencyKey,
        activityType,
        sourceType,
        sourceId,
        metadata,
        bucket: todayBucket,
      });

      if (!resEntry.duplicate) {
        writeLedger(ledger);
      }

      const nextState = buildPlayerStateResponse(userRecord, todayBucket);

      return {
        status: 200,
        payload: {
          success: true,
          duplicate: resEntry.duplicate,
          safetyCapped: resEntry.safetyCapped,
          attributeId: resEntry.attributeId,
          xpAwarded: resEntry.xpAwarded,
          previousLevel: resEntry.previousLevel,
          newLevel: resEntry.newLevel,
          leveledUp: resEntry.newLevel > resEntry.previousLevel,
          state: nextState,
        },
      };
    });

    res.status(outcome.status).json(outcome.payload);
  });

  // Idempotent historical reconciliation endpoint from existing workouts & habit logs
  app.post('/api/skill-tree/reconcile', async (req: Request, res: Response) => {
    const auth = await resolveAuthenticatedUserId(req);
    if (!auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';
    const todayBucket = getTodayBucket(timezone);
    const workouts = Array.isArray(body.workouts) ? body.workouts.slice(0, 250) : [];
    const habits = Array.isArray(body.habits) ? body.habits.slice(0, 250) : [];

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const userRecord = ensureUserRecord(ledger, auth.userId!);
      let reconciledCount = 0;

      for (const w of workouts) {
        const wid = String(w?.id || '').trim();
        if (!wid) continue;
        const exType = String(w?.exerciseType || 'gym').toLowerCase();
        const durationMinutes = Math.max(0, Math.min(240, Number(w?.durationMinutes || 0)));
        const repetitions = Math.max(0, Math.min(500, Number(w?.repetitions || 0)));
        if (durationMinutes <= 0 && repetitions <= 0) continue;

        const activityType: SkillActivityType =
          exType === 'yoga'
            ? 'recovery_habit'
            : exType === 'running' ||
              exType === 'walking' ||
              exType === 'cycling' ||
              exType === 'jumping_jack'
            ? 'cardio_workout'
            : 'strength_workout';

        const ts = typeof w?.timestamp === 'string' ? w.timestamp : new Date().toISOString();
        const bucket = getBucketForDate(ts, timezone);

        const rec = recordVerifiedEntry(userRecord, {
          idempotencyKey: `workout:${wid}`,
          activityType,
          sourceType: 'workout_session_reconcile',
          sourceId: wid,
          metadata: {
            durationMinutes,
            repetitions,
            verifiedWithAetherVision: Boolean(w?.verifiedWithAetherVision),
          },
          bucket,
          createdAtIso: ts,
        });
        if (!rec.duplicate) reconciledCount += 1;
      }

      for (const h of habits) {
        const habitId = String(h?.habitId || h?.id || '').trim();
        const periodKey = String(h?.periodKey || '').trim();
        if (!habitId || !periodKey) continue;
        const cat = String(h?.category || 'discipline').toLowerCase();
        const activityType: SkillActivityType =
          cat === 'mindfulness'
            ? 'study_session'
            : cat === 'sleep' || cat === 'nutrition'
            ? 'recovery_habit'
            : cat === 'fitness'
            ? 'strength_workout'
            : 'habit_completion';

        const ts = typeof h?.timestamp === 'string' ? h.timestamp : new Date().toISOString();
        const bucket = /^\d{4}-\d{2}-\d{2}$/.test(periodKey)
          ? periodKey
          : getBucketForDate(ts, timezone);

        const rec = recordVerifiedEntry(userRecord, {
          idempotencyKey: `habit:${habitId}:${periodKey}`,
          activityType,
          sourceType: 'habit_completion_reconcile',
          sourceId: habitId,
          metadata: { streak: Math.max(0, Number(h?.streak || 1)) },
          bucket,
          createdAtIso: ts,
        });
        if (!rec.duplicate) reconciledCount += 1;
      }

      if (reconciledCount > 0) {
        writeLedger(ledger);
      }

      const state = buildPlayerStateResponse(userRecord, todayBucket, reconciledCount);
      return { success: true, reconciledCount, state };
    });

    res.json(outcome);
  });

  app.post('/api/skill-tree/unlock-node', async (req: Request, res: Response) => {
    const auth = await resolveAuthenticatedUserId(req);
    if (!auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error });
      return;
    }

    const nodeId = String(req.body?.nodeId || '').trim();
    const timezone = typeof req.body?.timezone === 'string' ? req.body.timezone : 'UTC';
    const node = getSkillNodeById(nodeId);
    if (!node) {
      res.status(404).json({ success: false, error: 'Skill node not found.' });
      return;
    }

    const todayBucket = getTodayBucket(timezone);

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const userRecord = ensureUserRecord(ledger, auth.userId!);
      const state = buildPlayerStateResponse(userRecord, todayBucket);
      const attrProgress = state.attributes[node.attributeId];

      const evaluation = evaluateSkillNodeStatus(node, attrProgress, userRecord.unlockedNodeIds);
      if (evaluation.status === 'unlocked') {
        return {
          status: 200,
          payload: { success: true, alreadyUnlocked: true, state },
        };
      }

      if (evaluation.status === 'locked') {
        return {
          status: 400,
          payload: {
            success: false,
            error: evaluation.unmetReasons[0] || 'Skill node requirements are not yet met.',
            unmetReasons: evaluation.unmetReasons,
          },
        };
      }

      userRecord.unlockedNodeIds.push(node.id);
      writeLedger(ledger);
      return {
        status: 200,
        payload: {
          success: true,
          unlockedNodeId: node.id,
          state: buildPlayerStateResponse(userRecord, todayBucket),
        },
      };
    });

    res.status(outcome.status).json(outcome.payload);
  });

  app.post('/api/skill-tree/claim-milestone', async (req: Request, res: Response) => {
    const auth = await resolveAuthenticatedUserId(req);
    if (!auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error });
      return;
    }

    const milestoneId = String(req.body?.milestoneId || '').trim();
    const timezone = typeof req.body?.timezone === 'string' ? req.body.timezone : 'UTC';
    const milestone = getSkillMilestoneById(milestoneId);
    if (!milestone) {
      res.status(404).json({ success: false, error: 'Skill milestone not found.' });
      return;
    }

    const todayBucket = getTodayBucket(timezone);

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const userRecord = ensureUserRecord(ledger, auth.userId!);
      const state = buildPlayerStateResponse(userRecord, todayBucket);
      const attrProgress = state.attributes[milestone.attributeId];

      if (userRecord.claimedMilestoneIds.includes(milestone.id)) {
        return {
          status: 200,
          payload: { success: true, alreadyClaimed: true, state },
        };
      }

      if (attrProgress.level < milestone.requiredLevel) {
        return {
          status: 400,
          payload: {
            success: false,
            error: `Requires Level ${milestone.requiredLevel} (currently Level ${attrProgress.level}).`,
          },
        };
      }

      const unlockedInAttr = userRecord.unlockedNodeIds.filter(
        nid => getSkillNodeById(nid)?.attributeId === milestone.attributeId
      ).length;
      if (
        milestone.requiredNodesUnlocked &&
        unlockedInAttr < milestone.requiredNodesUnlocked
      ) {
        return {
          status: 400,
          payload: {
            success: false,
            error: `Requires ${milestone.requiredNodesUnlocked} unlocked skill nodes (${unlockedInAttr}/${milestone.requiredNodesUnlocked}).`,
          },
        };
      }

      userRecord.claimedMilestoneIds.push(milestone.id);
      writeLedger(ledger);
      return {
        status: 200,
        payload: {
          success: true,
          claimedMilestoneId: milestone.id,
          state: buildPlayerStateResponse(userRecord, todayBucket),
        },
      };
    });

    res.status(outcome.status).json(outcome.payload);
  });
}
