import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
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
} from '../src/types/game.ts';

interface StoredAttributeRecord {
  xp: number;
  totalActivities: number;
  lastActivityAt: string | null;
}

interface StoredUserSkillTree {
  attributes: Record<SkillAttributeId, StoredAttributeRecord>;
  unlockedNodeIds: string[];
  claimedMilestoneIds: string[];
  events: SkillActivityLedgerEntry[];
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
    // fallback to UTC
  }
  return new Date().toISOString().slice(0, 10);
};

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
  };
};

const buildPlayerStateResponse = (
  record: StoredUserSkillTree,
  todayBucket: string
): PlayerSkillTreeState => {
  const attributes = {} as Record<SkillAttributeId, PlayerAttributeProgress>;
  for (const attrId of SKILL_ATTRIBUTE_IDS) {
    const raw = record.attributes[attrId] || { xp: 0, totalActivities: 0, lastActivityAt: null };
    const dailyXp = record.events
      .filter(e => e.attributeId === attrId && e.dailyBucket === todayBucket)
      .reduce((sum, e) => sum + e.xpAwarded, 0);

    attributes[attrId] = computeAttributeProgress(
      attrId,
      raw.xp,
      raw.totalActivities,
      dailyXp,
      raw.lastActivityAt
    );
  }

  return {
    attributes,
    unlockedNodeIds: [...record.unlockedNodeIds],
    claimedMilestoneIds: [...record.claimedMilestoneIds],
    recentEvents: record.events.slice(0, 30),
  };
};

const resolveAuthenticatedUserId = (req: Request): { userId: string | null; error?: string; status?: number } => {
  const headerUid = String(req.headers['x-lifequest-user-id'] || '').trim();
  const bodyUid = req.body && typeof req.body === 'object' ? String(req.body.userId || '').trim() : '';
  const queryUid = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

  if (!headerUid) {
    return {
      userId: null,
      status: 401,
      error: 'Authentication required: missing verified player identity.',
    };
  }

  // Enforce strict multi-account isolation: caller cannot target another user's tree
  if ((bodyUid && bodyUid !== headerUid) || (queryUid && queryUid !== headerUid)) {
    return {
      userId: null,
      status: 403,
      error: 'Forbidden: you can only access and modify your own skill progression.',
    };
  }

  return { userId: headerUid };
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
    return u;
  };

  app.get('/api/skill-tree/state', async (req: Request, res: Response) => {
    const auth = resolveAuthenticatedUserId(req);
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
    const auth = resolveAuthenticatedUserId(req);
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
        error: 'Untrusted XP or level overrides are rejected. Skill XP is calculated strictly on the server.',
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
    const todayBucket = getTodayBucket(timezone);

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const userRecord = ensureUserRecord(ledger, auth.userId!);

      // Prevent duplicate activity rewards strictly via idempotencyKey
      const alreadyRecorded = userRecord.events.find(e => e.idempotencyKey === idempotencyKey);
      if (alreadyRecorded) {
        const state = buildPlayerStateResponse(userRecord, todayBucket);
        return {
          status: 200,
          payload: {
            success: true,
            duplicate: true,
            safetyCapped: false,
            attributeId: alreadyRecorded.attributeId,
            xpAwarded: 0,
            previousLevel: state.attributes[alreadyRecorded.attributeId].level,
            newLevel: state.attributes[alreadyRecorded.attributeId].level,
            leveledUp: false,
            state,
          },
        };
      }

      const targetAttr = ACTIVITY_TO_ATTRIBUTE_MAP[activityType];
      const currentDailyXp = userRecord.events
        .filter(e => e.attributeId === targetAttr && e.dailyBucket === todayBucket)
        .reduce((sum, e) => sum + e.xpAwarded, 0);

      const calc = calculateSafeVerifiedActivityXp(activityType, metadata, currentDailyXp);
      const prevAttrRaw = userRecord.attributes[targetAttr];
      const prevProgress = computeAttributeProgress(
        targetAttr,
        prevAttrRaw.xp,
        prevAttrRaw.totalActivities,
        currentDailyXp,
        prevAttrRaw.lastActivityAt
      );

      const nowIso = new Date().toISOString();
      const entry: SkillActivityLedgerEntry = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        idempotencyKey,
        activityType,
        attributeId: calc.attributeId,
        sourceType: sourceType || 'verified_activity',
        sourceId: sourceId || idempotencyKey,
        xpAwarded: calc.xpAwarded,
        safetyCapped: calc.safetyCapped,
        dailyBucket: todayBucket,
        createdAt: nowIso,
      };

      userRecord.attributes[targetAttr] = {
        xp: prevAttrRaw.xp + calc.xpAwarded,
        totalActivities: prevAttrRaw.totalActivities + 1,
        lastActivityAt: nowIso,
      };
      userRecord.events.unshift(entry);
      if (userRecord.events.length > 500) {
        userRecord.events = userRecord.events.slice(0, 500);
      }

      writeLedger(ledger);

      const nextState = buildPlayerStateResponse(userRecord, todayBucket);
      const nextProgress = nextState.attributes[targetAttr];

      return {
        status: 200,
        payload: {
          success: true,
          duplicate: false,
          safetyCapped: calc.safetyCapped,
          attributeId: targetAttr,
          xpAwarded: calc.xpAwarded,
          previousLevel: prevProgress.level,
          newLevel: nextProgress.level,
          leveledUp: nextProgress.level > prevProgress.level,
          state: nextState,
        },
      };
    });

    res.status(outcome.status).json(outcome.payload);
  });

  app.post('/api/skill-tree/unlock-node', async (req: Request, res: Response) => {
    const auth = resolveAuthenticatedUserId(req);
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
    const auth = resolveAuthenticatedUserId(req);
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
