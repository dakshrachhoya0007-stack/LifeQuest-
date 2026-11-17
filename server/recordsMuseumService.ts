import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { getSkillAttributeById, getSkillNodeById } from '../src/data/skillTreeData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  MuseumCategory,
  MuseumRarity,
  MuseumRecord,
  SkillActivityType,
  SkillAttributeId,
} from '../src/types/game.ts';

interface MuseumLedgerFile {
  records: MuseumRecord[];
  publicVisibilityByUser: Record<string, boolean>;
}

const VALID_CATEGORIES = new Set<MuseumCategory>([
  'fitness',
  'strength',
  'endurance',
  'consistency',
  'personal_best',
  'boss_battle',
  'rivalry',
  'community_event',
  'seasonal',
  'rare_legendary',
]);

const RARITY_RANK: Record<MuseumRarity, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythic: 5,
};

export function createRecordsMuseumService(rootDir: string) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_museum.json');
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

  const readLedger = (): MuseumLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            records: Array.isArray(parsed.records) ? parsed.records : [],
            publicVisibilityByUser:
              parsed.publicVisibilityByUser && typeof parsed.publicVisibilityByUser === 'object'
                ? parsed.publicVisibilityByUser
                : {},
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { records: [], publicVisibilityByUser: {} };
  };

  const writeLedger = (data: MuseumLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  /**
   * Append-only historical Personal Record archiver:
   * - Never overwrites previous records!
   * - When a new Personal Best exceeds currentBest for a numeric metricKey,
   *   older PB records for that metricKey are updated ONLY to `isPersonalBest = false`
   *   while retaining every timestamp, value, and id intact, and the new PB is appended with `isPersonalBest = true`.
   */
  const archiveRecordInternal = (
    ledger: MuseumLedgerFile,
    input: {
      userId: string;
      idempotencyKey: string;
      category: MuseumCategory;
      metricKey: string;
      title: string;
      description: string;
      numericValue: number;
      displayValue: string;
      trackAsPersonalBest: boolean;
      sourceActivityRef: string;
      rarity: MuseumRarity;
      achievedAt?: string;
    }
  ): { created: boolean; record: MuseumRecord | null; isNewPersonalBest: boolean } => {
    const existing = ledger.records.find(
      r => r.userId === input.userId && r.idempotencyKey === input.idempotencyKey
    );
    if (existing) {
      return { created: false, record: existing, isNewPersonalBest: false };
    }

    let isPersonalBest = false;
    if (input.trackAsPersonalBest) {
      const priorForMetric = ledger.records.filter(
        r => r.userId === input.userId && r.metricKey === input.metricKey
      );
      const currentBestVal = priorForMetric.reduce(
        (maxVal, r) => (r.numericValue > maxVal ? r.numericValue : maxVal),
        0
      );

      if (input.numericValue > currentBestVal) {
        isPersonalBest = true;
        for (const oldRec of priorForMetric) {
          if (oldRec.isPersonalBest) {
            oldRec.isPersonalBest = false;
          }
        }
      } else {
        // Not a new Personal Best, skip inserting non-PB duplicate milestone if PB-only
        return { created: false, record: null, isNewPersonalBest: false };
      }
    }

    const record: MuseumRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      category: input.category,
      metricKey: input.metricKey,
      title: input.title,
      description: input.description,
      numericValue: input.numericValue,
      displayValue: input.displayValue,
      isPersonalBest,
      achievedAt: input.achievedAt || new Date().toISOString(),
      sourceActivityRef: input.sourceActivityRef,
      verified: true,
      rarity: input.rarity,
    };

    ledger.records.unshift(record);
    return { created: true, record, isNewPersonalBest: isPersonalBest };
  };

  const evaluateAndArchiveVerifiedRecords = async (params: {
    userId: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    sourceType: string;
    sourceId: string;
    metadata?: VerifiedActivityMetadata & {
      exerciseName?: string;
      exerciseType?: string;
    };
    bossOutcome?: {
      eventId?: string;
      bossName?: string;
      damageDealt?: number;
      bossDefeatedJustNow?: boolean;
      participantIds?: string[];
    };
    communityPoints?: number;
    unlockedNodeId?: string;
    skillLevelUp?: {
      attributeId: SkillAttributeId;
      newLevel: number;
    };
  }): Promise<{ createdRecords: MuseumRecord[] }> => {
    const {
      userId,
      activityType,
      idempotencyKey,
      sourceType,
      sourceId,
      metadata = {},
      bossOutcome,
      communityPoints,
      unlockedNodeId,
      skillLevelUp,
    } = params;

    return withLock(() => {
      const ledger = readLedger();
      const created: MuseumRecord[] = [];
      let dirty = false;

      const tryArchive = (item: Parameters<typeof archiveRecordInternal>[1]) => {
        const res = archiveRecordInternal(ledger, item);
        if (res.created && res.record) {
          created.push(res.record);
          dirty = true;
        }
      };

      const dur = Math.round(Number(metadata.durationMinutes || 0));
      const reps = Math.round(Number(metadata.repetitions || 0));
      const dist = Number(metadata.distanceKm || 0);
      const streak = Math.round(Number(metadata.streak || 0));
      const exLabel = String(metadata.exerciseName || metadata.exerciseType || 'Training');

      // 1. First Fitness Session milestone
      if (activityType === 'strength_workout' || activityType === 'cardio_workout') {
        tryArchive({
          userId,
          idempotencyKey: `milestone:first_workout`,
          category: 'fitness',
          metricKey: 'first_verified_workout',
          title: 'First Verified Training',
          description: `Logged verified ${exLabel} session into your permanent chronicle.`,
          numericValue: 1,
          displayValue: `${exLabel} Verified`,
          trackAsPersonalBest: false,
          sourceActivityRef: `${sourceType}:${sourceId}`,
          rarity: 'Common',
        });

        // Personal Best Duration
        if (dur >= 5) {
          tryArchive({
            userId,
            idempotencyKey: `pb:duration:${idempotencyKey}`,
            category: 'personal_best',
            metricKey: 'pb_workout_duration_minutes',
            title: 'Longest Verified Workout Session',
            description: `Achieved a new personal best active duration during ${exLabel}.`,
            numericValue: dur,
            displayValue: `${dur} min`,
            trackAsPersonalBest: true,
            sourceActivityRef: `${sourceType}:${sourceId}`,
            rarity: dur >= 45 ? 'Epic' : dur >= 25 ? 'Rare' : 'Common',
          });
        }
      }

      // 2. Strength Rep Personal Best
      if (activityType === 'strength_workout' && reps > 0) {
        tryArchive({
          userId,
          idempotencyKey: `pb:reps:${idempotencyKey}`,
          category: 'strength',
          metricKey: `pb_strength_reps_${String(metadata.exerciseType || 'strength')}`,
          title: `${exLabel} Single-Session Rep Best`,
          description: `Recorded a new highest verified repetition count for ${exLabel}.`,
          numericValue: reps,
          displayValue: `${reps} reps`,
          trackAsPersonalBest: true,
          sourceActivityRef: `${sourceType}:${sourceId}`,
          rarity: reps >= 50 ? 'Legendary' : reps >= 25 ? 'Epic' : 'Rare',
        });
      }

      // 3. Endurance Cardio Distance Personal Best
      if (activityType === 'cardio_workout' && dist > 0) {
        tryArchive({
          userId,
          idempotencyKey: `pb:dist:${idempotencyKey}`,
          category: 'endurance',
          metricKey: 'pb_cardio_distance_km',
          title: 'Longest Cardio Distance',
          description: `Surpassed previous verified cardio distance in ${exLabel}.`,
          numericValue: dist,
          displayValue: `${dist.toFixed(1)} km`,
          trackAsPersonalBest: true,
          sourceActivityRef: `${sourceType}:${sourceId}`,
          rarity: dist >= 10 ? 'Legendary' : dist >= 5 ? 'Epic' : 'Rare',
        });
      }

      // 4. Habit Streak & Comeback Consistency
      if (streak >= 3) {
        tryArchive({
          userId,
          idempotencyKey: `pb:streak:${streak}:${idempotencyKey}`,
          category: 'consistency',
          metricKey: 'pb_habit_streak_days',
          title: 'Longest Habit Streak',
          description: 'Sustained verified daily consistency without breaking your oath.',
          numericValue: streak,
          displayValue: `${streak} days`,
          trackAsPersonalBest: true,
          sourceActivityRef: `${sourceType}:${sourceId}`,
          rarity: streak >= 21 ? 'Legendary' : streak >= 7 ? 'Epic' : 'Rare',
        });
      }

      if (activityType === 'comeback_activity') {
        tryArchive({
          userId,
          idempotencyKey: `milestone:comeback:${idempotencyKey.slice(0, 24)}`,
          category: 'consistency',
          metricKey: `comeback_${idempotencyKey}`,
          title: 'Unfallen Ember Comeback',
          description: 'Returned to verified real-life training with resilience.',
          numericValue: 1,
          displayValue: 'Comeback Logged',
          trackAsPersonalBest: false,
          sourceActivityRef: `${sourceType}:${sourceId}`,
          rarity: 'Rare',
        });
      }

      // 5. Boss Battle Records
      if (bossOutcome?.damageDealt && bossOutcome.damageDealt > 0) {
        tryArchive({
          userId,
          idempotencyKey: `pb:boss_hit:${idempotencyKey}`,
          category: 'boss_battle',
          metricKey: 'pb_weekly_boss_single_strike',
          title: 'Strongest Weekly Raid Strike',
          description: `Dealt massive verified raid damage against ${bossOutcome.bossName || 'Weekly Titan'}.`,
          numericValue: bossOutcome.damageDealt,
          displayValue: `${bossOutcome.damageDealt} DMG`,
          trackAsPersonalBest: true,
          sourceActivityRef: `weekly_boss:${bossOutcome.eventId || 'current'}`,
          rarity: bossOutcome.damageDealt >= 110 ? 'Epic' : 'Rare',
        });
      }

      if (bossOutcome?.bossDefeatedJustNow && Array.isArray(bossOutcome.participantIds)) {
        for (const pid of bossOutcome.participantIds) {
          const res = archiveRecordInternal(ledger, {
            userId: pid,
            idempotencyKey: `boss_defeat:${bossOutcome.eventId}`,
            category: 'boss_battle',
            metricKey: `boss_defeat_${bossOutcome.eventId}`,
            title: `Vanquisher of ${bossOutcome.bossName || 'Weekly Titan'}`,
            description: 'Contributed verified strikes to bring down the Weekly Community Raid Boss.',
            numericValue: 1,
            displayValue: 'Titan Defeated',
            trackAsPersonalBest: false,
            sourceActivityRef: `weekly_boss:${bossOutcome.eventId}`,
            rarity: 'Legendary',
          });
          if (res.created) dirty = true;
        }
      }

      // 6. Community Event Record
      if (typeof communityPoints === 'number' && communityPoints >= 100) {
        tryArchive({
          userId,
          idempotencyKey: `community_steward_100`,
          category: 'community_event',
          metricKey: 'community_steward_100',
          title: 'Golden Canopy Steward',
          description: 'Contributed 100+ verified points toward a realm-wide Community Event.',
          numericValue: communityPoints,
          displayValue: `${communityPoints} pts`,
          trackAsPersonalBest: false,
          sourceActivityRef: `community_event:current`,
          rarity: 'Rare',
        });
      }

      // 7. Skill Tree Level & Node Records
      if (skillLevelUp && skillLevelUp.newLevel >= 3) {
        const attr = getSkillAttributeById(skillLevelUp.attributeId);
        const cat: MuseumCategory =
          skillLevelUp.attributeId === 'strength'
            ? 'strength'
            : skillLevelUp.attributeId === 'endurance'
            ? 'endurance'
            : skillLevelUp.newLevel >= 7
            ? 'rare_legendary'
            : 'consistency';
        tryArchive({
          userId,
          idempotencyKey: `skill_lv:${skillLevelUp.attributeId}:${skillLevelUp.newLevel}`,
          category: cat,
          metricKey: `pb_skill_level_${skillLevelUp.attributeId}`,
          title: `${attr?.name || skillLevelUp.attributeId} Mastery Lv.${skillLevelUp.newLevel}`,
          description: `Reached Level ${skillLevelUp.newLevel} in the ${attr?.name || ''} Real-Life Skill Tree.`,
          numericValue: skillLevelUp.newLevel,
          displayValue: `Lv.${skillLevelUp.newLevel}`,
          trackAsPersonalBest: true,
          sourceActivityRef: `skill_tree:${skillLevelUp.attributeId}`,
          rarity: skillLevelUp.newLevel >= 8 ? 'Mythic' : skillLevelUp.newLevel >= 5 ? 'Epic' : 'Rare',
        });
      }

      if (unlockedNodeId) {
        const node = getSkillNodeById(unlockedNodeId);
        if (node) {
          tryArchive({
            userId,
            idempotencyKey: `skill_node:${node.id}`,
            category: node.tier === 3 ? 'rare_legendary' : 'seasonal',
            metricKey: `skill_node_${node.id}`,
            title: `Skill Node Awakened: ${node.name}`,
            description: `${node.masteryTitle} — ${node.description}`,
            numericValue: node.tier,
            displayValue: `Tier ${node.tier}`,
            trackAsPersonalBest: false,
            sourceActivityRef: `skill_node:${node.id}`,
            rarity: node.tier === 3 ? 'Legendary' : node.tier === 2 ? 'Epic' : 'Rare',
          });
        }
      }

      if (dirty) writeLedger(ledger);
      return { createdRecords: created };
    });
  };

  const archiveDirectMilestone = async (input: {
    userId: string;
    idempotencyKey: string;
    category: MuseumCategory;
    metricKey: string;
    title: string;
    description: string;
    numericValue: number;
    displayValue: string;
    trackAsPersonalBest: boolean;
    sourceActivityRef: string;
    rarity: MuseumRarity;
  }) => {
    return withLock(() => {
      const ledger = readLedger();
      const res = archiveRecordInternal(ledger, input);
      if (res.created) writeLedger(ledger);
      return res;
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/museum/records', async (req: Request, res: Response) => {
      const callerId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!callerId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const targetUserId =
        typeof req.query.userId === 'string' && req.query.userId.trim()
          ? req.query.userId.trim()
          : callerId;

      const category = typeof req.query.category === 'string' ? req.query.category.trim() : 'all';
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
      const page = Math.max(1, Math.round(Number(req.query.page || 1)));
      const limit = Math.min(50, Math.max(1, Math.round(Number(req.query.limit || 12))));

      const outcome = await withLock(() => {
        const ledger = readLedger();

        if (targetUserId !== callerId) {
          const isPublic = ledger.publicVisibilityByUser[targetUserId] === true;
          if (!isPublic) {
            return {
              status: 403,
              payload: {
                success: false,
                error: 'Forbidden: player has restricted Personal Records Museum visibility.',
              },
            };
          }
        }

        let userRecords = ledger.records.filter(r => r.userId === targetUserId);
        const personalBests = userRecords.filter(r => r.isPersonalBest);

        const categoryCounts: Record<string, number> = { all: userRecords.length };
        for (const r of userRecords) {
          categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
        }

        if (category !== 'all' && VALID_CATEGORIES.has(category as MuseumCategory)) {
          userRecords = userRecords.filter(r => r.category === category);
        }

        if (search) {
          userRecords = userRecords.filter(
            r =>
              r.title.toLowerCase().includes(search) ||
              r.description.toLowerCase().includes(search) ||
              r.displayValue.toLowerCase().includes(search)
          );
        }

        userRecords = [...userRecords].sort((a, b) => {
          if (sort === 'oldest') return Date.parse(a.achievedAt) - Date.parse(b.achievedAt);
          if (sort === 'rarity') return (RARITY_RANK[b.rarity] || 1) - (RARITY_RANK[a.rarity] || 1);
          if (sort === 'value') return b.numericValue - a.numericValue;
          return Date.parse(b.achievedAt) - Date.parse(a.achievedAt);
        });

        const totalRecords = userRecords.length;
        const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
        const safePage = Math.min(page, totalPages);
        const startIdx = (safePage - 1) * limit;

        return {
          status: 200,
          payload: {
            success: true,
            records: userRecords.slice(startIdx, startIdx + limit),
            personalBests,
            categoryCounts,
            totalRecords,
            page: safePage,
            totalPages,
          },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/museum/privacy', async (req: Request, res: Response) => {
      const callerId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!callerId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const allowPublic = Boolean(req.body?.allowPublic);
      await withLock(() => {
        const ledger = readLedger();
        ledger.publicVisibilityByUser[callerId] = allowPublic;
        writeLedger(ledger);
      });
      res.json({ success: true, allowPublic });
    });
  };

  return {
    registerRoutes,
    archiveDirectMilestone,
    evaluateAndArchiveVerifiedRecords,
  };
}
