import type { Express, Request, Response } from 'express';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type { SkillActivityType, SkillAttributeId } from '../src/types/game.ts';

interface EcosystemDeps {
  weeklyBoss: {
    applyVerifiedBossDamage: (params: {
      userId: string;
      username: string;
      activityType: SkillActivityType;
      idempotencyKey: string;
      metadata?: VerifiedActivityMetadata;
      timezone?: string;
    }) => Promise<any>;
  };
  rivals: {
    applyVerifiedRivalScore: (params: {
      userId: string;
      activityType: SkillActivityType;
      idempotencyKey: string;
      metadata?: VerifiedActivityMetadata;
      timezone?: string;
    }) => Promise<any>;
  };
  communityEvents: {
    applyVerifiedCommunityContribution: (params: {
      userId: string;
      username: string;
      activityType: SkillActivityType;
      idempotencyKey: string;
      metadata?: VerifiedActivityMetadata;
      timezone?: string;
    }) => Promise<any>;
  };
  museum: {
    evaluateAndArchiveVerifiedRecords: (params: {
      userId: string;
      activityType: SkillActivityType;
      idempotencyKey: string;
      sourceType: string;
      sourceId: string;
      metadata?: VerifiedActivityMetadata & { exerciseName?: string; exerciseType?: string };
      bossOutcome?: {
        eventId?: string;
        bossName?: string;
        damageDealt?: number;
        bossDefeatedJustNow?: boolean;
        participantIds?: string[];
      };
      communityPoints?: number;
      unlockedNodeId?: string;
      skillLevelUp?: { attributeId: SkillAttributeId; newLevel: number };
    }) => Promise<{ createdRecords: any[] }>;
  };
  seasons?: {
    applyVerifiedSeasonProgress: (params: {
      userId: string;
      username: string;
      activityType: SkillActivityType;
      idempotencyKey: string;
      metadata?: VerifiedActivityMetadata;
      bossHit?: boolean;
      communityPointsAwarded?: number;
    }) => Promise<any>;
  };
  identity?: {
    evaluateAndRecordActivity: (params: {
      userId: string;
      idempotencyKey?: string;
    }) => Promise<any>;
  };
  notifications?: {
    emitNotification: (input: {
      userId: string;
      category: 'player_progression' | 'social' | 'game_world' | 'fitness';
      preferenceKey: 'fitness' | 'social' | 'achievement' | 'boss' | 'community' | 'seasonal';
      eventKey: string;
      type: string;
      title: string;
      body: string;
      actionTab?: string | null;
      actionSubTab?: string | null;
      payload?: Record<string, any>;
    }) => Promise<any>;
  };
}

const VALID_ACTIVITY_TYPES = new Set<SkillActivityType>([
  'strength_workout',
  'cardio_workout',
  'habit_completion',
  'study_session',
  'comeback_activity',
  'recovery_habit',
]);

export function registerEcosystemDispatcherRoutes(app: Express, deps: EcosystemDeps) {
  app.post('/api/ecosystem/dispatch-activity', async (req: Request, res: Response) => {
    const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    // Reject any untrusted damage, points, or XP overrides
    if (
      'damage' in body ||
      'damageDealt' in body ||
      'points' in body ||
      'xp' in body ||
      'gold' in body
    ) {
      res.status(400).json({
        success: false,
        error: 'Untrusted damage, points, or reward overrides are rejected.',
      });
      return;
    }

    const activityType = String(body.activityType || '') as SkillActivityType;
    if (!VALID_ACTIVITY_TYPES.has(activityType)) {
      res.status(400).json({ success: false, error: 'Invalid verified activityType.' });
      return;
    }

    const idempotencyKey = String(body.idempotencyKey || '').trim();
    if (idempotencyKey.length < 3) {
      res.status(400).json({ success: false, error: 'Valid idempotencyKey is required.' });
      return;
    }

    const username = String(body.username || 'Champion').slice(0, 48);
    const sourceType = String(body.sourceType || 'verified_activity').slice(0, 48);
    const sourceId = String(body.sourceId || idempotencyKey).slice(0, 96);
    const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    const bossRes = await deps.weeklyBoss.applyVerifiedBossDamage({
      userId,
      username,
      activityType,
      idempotencyKey: `boss:${idempotencyKey}`,
      metadata,
      timezone,
    });

    const rivalRes = await deps.rivals.applyVerifiedRivalScore({
      userId,
      activityType,
      idempotencyKey: `rival:${idempotencyKey}`,
      metadata,
      timezone,
    });

    const communityRes = await deps.communityEvents.applyVerifiedCommunityContribution({
      userId,
      username,
      activityType,
      idempotencyKey: `ce:${idempotencyKey}`,
      metadata,
      timezone,
    });

    const museumRes = await deps.museum.evaluateAndArchiveVerifiedRecords({
      userId,
      activityType,
      idempotencyKey,
      sourceType,
      sourceId,
      metadata,
      bossOutcome: bossRes?.applied
        ? {
            eventId: bossRes.eventId,
            bossName: bossRes.bossName,
            damageDealt: bossRes.damageDealt,
            bossDefeatedJustNow: bossRes.bossDefeatedJustNow,
            participantIds: bossRes.newlyDefeatedParticipantIds,
          }
        : undefined,
      communityPoints: communityRes?.playerTotalPoints,
      skillLevelUp:
        body.skillLevelUp &&
        typeof body.skillLevelUp === 'object' &&
        body.skillLevelUp.attributeId &&
        body.skillLevelUp.newLevel
          ? {
              attributeId: body.skillLevelUp.attributeId as SkillAttributeId,
              newLevel: Number(body.skillLevelUp.newLevel),
            }
          : undefined,
    });

    const seasonRes = deps.seasons
      ? await deps.seasons.applyVerifiedSeasonProgress({
          userId,
          username,
          activityType,
          idempotencyKey: `season:${idempotencyKey}`,
          metadata,
          bossHit: Boolean(bossRes?.applied && !bossRes?.duplicate),
          communityPointsAwarded: Number(communityRes?.pointsAwarded || 0),
        })
      : null;

    const identityRes = deps.identity
      ? await deps.identity.evaluateAndRecordActivity({
          userId,
          idempotencyKey: `rep:${idempotencyKey}`,
        })
      : null;

    if (deps.notifications) {
      if (bossRes?.bossDefeatedJustNow) {
        await deps.notifications.emitNotification({
          userId,
          category: 'game_world',
          preferenceKey: 'boss',
          eventKey: `boss_defeated:${bossRes.eventId || 'current'}`,
          type: 'weekly_boss_defeated',
          title: 'Weekly Raid Boss Vanquished!',
          body: `${bossRes.bossName || 'Weekly Titan'} has fallen! Claim your raid rewards.`,
          actionTab: 'boss-battles',
        });
      }
      if (body.skillLevelUp?.attributeId && body.skillLevelUp?.newLevel) {
        await deps.notifications.emitNotification({
          userId,
          category: 'player_progression',
          preferenceKey: 'achievement',
          eventKey: `skill_lv:${body.skillLevelUp.attributeId}:${body.skillLevelUp.newLevel}`,
          type: 'skill_level_up',
          title: `Skill Mastery Level ${body.skillLevelUp.newLevel}`,
          body: `Your ${String(body.skillLevelUp.attributeId).toUpperCase()} mastery ascended to Level ${body.skillLevelUp.newLevel}.`,
          actionTab: 'progression',
          actionSubTab: 'skill-tree',
        });
      }
      const pbRec = Array.isArray(museumRes.createdRecords)
        ? museumRes.createdRecords.find((r: any) => r.isPersonalBest)
        : null;
      if (pbRec) {
        await deps.notifications.emitNotification({
          userId,
          category: 'fitness',
          preferenceKey: 'fitness',
          eventKey: `pb:${pbRec.id}`,
          type: 'museum_personal_best',
          title: 'New Personal Best Enshrined!',
          body: `${pbRec.title}: ${pbRec.displayValue}`,
          actionTab: 'museum',
        });
      }
    }

    res.json({
      success: true,
      weeklyBoss: bossRes,
      rivals: rivalRes,
      communityEvent: communityRes,
      museumRecordsCreated: museumRes.createdRecords,
      seasonProgress: seasonRes,
      identityState: identityRes,
    });
  });

  // Archive a verified skill tree node unlock into Personal Records Museum
  app.post('/api/ecosystem/record-skill-node', async (req: Request, res: Response) => {
    const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const nodeId = String(req.body?.nodeId || '').trim();
    if (!nodeId) {
      res.status(400).json({ success: false, error: 'Missing nodeId.' });
      return;
    }

    const museumRes = await deps.museum.evaluateAndArchiveVerifiedRecords({
      userId,
      activityType: 'habit_completion',
      idempotencyKey: `skillnode:${nodeId}`,
      sourceType: 'skill_node_unlock',
      sourceId: nodeId,
      unlockedNodeId: nodeId,
    });

    res.json({ success: true, museumRecordsCreated: museumRes.createdRecords });
  });
}
