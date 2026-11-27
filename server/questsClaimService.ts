import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import { INITIAL_ACHIEVEMENTS, INITIAL_QUESTS } from '../src/data/questCatalogData.ts';
import type { PlayerWalletState } from '../src/types/game.ts';

export interface QuestClaimRecord {
  questId: string;
  periodKey: string;
  playerXpReward: number;
  goldReward: number;
  claimedAt: string;
}

export interface AchievementClaimRecord {
  achievementId: string;
  playerXpReward: number;
  goldReward: number;
  claimedAt: string;
}

export interface QuestsClaimsLedgerFile {
  questClaimsByUser: Record<string, Record<string, QuestClaimRecord>>;
  dynamicClaimsByUser: Record<string, Record<string, QuestClaimRecord>>;
  achievementClaimsByUser: Record<string, Record<string, AchievementClaimRecord>>;
}

export interface QuestRewardSpec {
  id: string;
  title: string;
  questType: 'daily' | 'weekly' | 'special';
  playerXpReward: number;
  goldReward: number;
  maxProgress: number;
}

export interface AchievementRewardSpec {
  id: string;
  name: string;
  playerXpReward: number;
  goldReward: number;
  maxProgress: number;
}

const CLASSIC_QUEST_GOLD_REWARDS: Record<string, number> = {
  'q-1': 20,
  'q-2': 30,
  'q-3': 20,
  'q-4': 65,
  'q-6': 90,
};

const CLASSIC_ACHIEVEMENT_GOLD_REWARDS: Record<string, number> = {
  'ach-1': 25,
  'ach-2': 50,
  'ach-4': 100,
  'ach-5': 60,
  'ach-6': 125,
  'ach-7': 50,
};

export const getQuestRewardSpec = (questId: string): QuestRewardSpec | null => {
  const q = INITIAL_QUESTS.find(item => item.id === questId);
  if (!q) return null;
  return {
    id: q.id,
    title: q.title,
    questType: q.type,
    playerXpReward: q.playerXpReward,
    goldReward: CLASSIC_QUEST_GOLD_REWARDS[q.id] ?? 25,
    maxProgress: q.maxProgress,
  };
};

export const getAchievementRewardSpec = (achievementId: string): AchievementRewardSpec | null => {
  const a = INITIAL_ACHIEVEMENTS.find(item => item.id === achievementId);
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    playerXpReward: a.rewardPlayerXp,
    goldReward: CLASSIC_ACHIEVEMENT_GOLD_REWARDS[a.id] ?? 40,
    maxProgress: a.maxProgress,
  };
};

export const clampDynamicQuestReward = (
  requestedXp: unknown,
  requestedGold: unknown
): { playerXpReward: number; goldReward: number } => {
  const rawXp = Number(requestedXp || 45);
  const rawGold = Number(requestedGold || 30);
  const safeXp = Number.isFinite(rawXp) ? Math.min(160, Math.max(15, Math.round(rawXp))) : 45;
  const safeGold = Number.isFinite(rawGold) ? Math.min(120, Math.max(15, Math.round(rawGold))) : 30;
  return { playerXpReward: safeXp, goldReward: safeGold };
};

export const createEmptyQuestsLedger = (): QuestsClaimsLedgerFile => ({
  questClaimsByUser: {},
  dynamicClaimsByUser: {},
  achievementClaimsByUser: {},
});

export function resolveServerPeriodKey(questType: 'daily' | 'weekly' | 'special', requestedPeriodKey?: string): string {
  const clean = String(requestedPeriodKey || '').trim();
  if (clean && /^[a-zA-Z0-9_-]{3,40}$/.test(clean)) return clean;
  if (questType === 'special') return 'special';
  const now = new Date();
  if (questType === 'weekly') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
  return now.toISOString().slice(0, 10);
}

export function createQuestsClaimService(
  rootDir: string,
  deps?: {
    creditGold?: (
      userId: string,
      amount: number,
      source: string,
      idempotencyKey?: string
    ) => Promise<{ wallet?: PlayerWalletState } | any>;
    getWallet?: (userId: string) => PlayerWalletState;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_quests_ledger.json');
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

  const readLedger = (): QuestsClaimsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        return {
          questClaimsByUser: parsed?.questClaimsByUser || {},
          dynamicClaimsByUser: parsed?.dynamicClaimsByUser || {},
          achievementClaimsByUser: parsed?.achievementClaimsByUser || {},
        };
      }
    } catch {
      // ignore corrupted read
    }
    return createEmptyQuestsLedger();
  };

  const writeLedger = (ledger: QuestsClaimsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/quests/claims-state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const data = await withLock(() => {
        const ledger = readLedger();
        return {
          questClaims: Object.values(ledger.questClaimsByUser[auth.userId!] || {}),
          dynamicClaims: Object.values(ledger.dynamicClaimsByUser[auth.userId!] || {}),
          achievementClaims: Object.values(ledger.achievementClaimsByUser[auth.userId!] || {}),
        };
      });
      res.json({ success: true, ...data });
    });

    app.post('/api/quests/claim', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body || {};
      const questId = String(body.questId || '').trim();
      if (!questId) {
        res.status(400).json({ success: false, error: 'Missing questId.' });
        return;
      }

      const spec = getQuestRewardSpec(questId);
      if (!spec) {
        res.status(404).json({ success: false, error: 'Quest not found.' });
        return;
      }

      const periodKey = resolveServerPeriodKey(spec.questType, body.periodKey);
      const claimKey = `${questId}:${periodKey}`;

      const outcome = await withLock(() => {
        const ledger = readLedger();
        if (!ledger.questClaimsByUser[auth.userId!]) {
          ledger.questClaimsByUser[auth.userId!] = {};
        }
        const existing = ledger.questClaimsByUser[auth.userId!][claimKey];
        if (existing) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'Quest reward already claimed for this period.',
              alreadyClaimed: true,
            },
          };
        }

        const record: QuestClaimRecord = {
          questId: spec.id,
          periodKey,
          playerXpReward: spec.playerXpReward,
          goldReward: spec.goldReward,
          claimedAt: new Date().toISOString(),
        };
        ledger.questClaimsByUser[auth.userId!][claimKey] = record;
        writeLedger(ledger);
        return { status: 200, record };
      });

      if (outcome.status !== 200 || !outcome.record) {
        res.status(outcome.status).json(outcome.payload);
        return;
      }

      let wallet: PlayerWalletState | undefined;
      if (deps?.creditGold && outcome.record.goldReward > 0) {
        const creditRes = await deps.creditGold(
          auth.userId,
          outcome.record.goldReward,
          `Quest Claimed: ${spec.title}`,
          `quest_claim:${auth.userId}:${claimKey}`
        );
        wallet =
          creditRes?.wallet ||
          (typeof creditRes?.goldBalance === 'number' ? creditRes : undefined);
      }
      if (!wallet && deps?.getWallet) {
        wallet = deps.getWallet(auth.userId);
      }

      res.json({
        success: true,
        isFallbackLedger: true,
        questId: spec.id,
        periodKey,
        rewards: {
          playerXpReward: outcome.record.playerXpReward,
          goldReward: outcome.record.goldReward,
        },
        wallet,
      });
    });

    app.post('/api/quests/claim-dynamic', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body || {};
      const questId = String(body.questId || '').trim();
      if (!questId) {
        res.status(400).json({ success: false, error: 'Missing dynamic questId.' });
        return;
      }
      const periodKey = resolveServerPeriodKey('daily', body.periodKey);
      const claimKey = `${questId}:${periodKey}`;
      const rewards = clampDynamicQuestReward(body.playerXpReward, body.goldReward);
      const questTitle = String(body.title || 'Daily Activity Quest').trim().slice(0, 80);

      const outcome = await withLock(() => {
        const ledger = readLedger();
        if (!ledger.dynamicClaimsByUser[auth.userId!]) {
          ledger.dynamicClaimsByUser[auth.userId!] = {};
        }
        if (ledger.dynamicClaimsByUser[auth.userId!][claimKey]) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'Quest reward already claimed for today.',
              alreadyClaimed: true,
            },
          };
        }

        const record: QuestClaimRecord = {
          questId,
          periodKey,
          playerXpReward: rewards.playerXpReward,
          goldReward: rewards.goldReward,
          claimedAt: new Date().toISOString(),
        };
        ledger.dynamicClaimsByUser[auth.userId!][claimKey] = record;
        writeLedger(ledger);
        return { status: 200, record };
      });

      if (outcome.status !== 200) {
        res.status(outcome.status).json(outcome.payload);
        return;
      }

      let wallet: PlayerWalletState | undefined;
      if (deps?.creditGold && rewards.goldReward > 0) {
        const creditRes = await deps.creditGold(
          auth.userId,
          rewards.goldReward,
          `Daily Quest: ${questTitle}`,
          `dyn_quest:${auth.userId}:${claimKey}`
        );
        wallet =
          creditRes?.wallet ||
          (typeof creditRes?.goldBalance === 'number' ? creditRes : undefined);
      }
      if (!wallet && deps?.getWallet) {
        wallet = deps.getWallet(auth.userId);
      }

      res.json({
        success: true,
        isFallbackLedger: true,
        questId,
        periodKey,
        rewards,
        wallet,
      });
    });

    app.post('/api/achievements/claim', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body || {};
      const achievementId = String(body.achievementId || '').trim();
      if (!achievementId) {
        res.status(400).json({ success: false, error: 'Missing achievementId.' });
        return;
      }

      const spec = getAchievementRewardSpec(achievementId);
      if (!spec) {
        res.status(404).json({ success: false, error: 'Achievement not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        if (!ledger.achievementClaimsByUser[auth.userId!]) {
          ledger.achievementClaimsByUser[auth.userId!] = {};
        }
        if (ledger.achievementClaimsByUser[auth.userId!][spec.id]) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'Achievement reward already claimed.',
              alreadyClaimed: true,
            },
          };
        }

        const record: AchievementClaimRecord = {
          achievementId: spec.id,
          playerXpReward: spec.playerXpReward,
          goldReward: spec.goldReward,
          claimedAt: new Date().toISOString(),
        };
        ledger.achievementClaimsByUser[auth.userId!][spec.id] = record;
        writeLedger(ledger);
        return { status: 200, record };
      });

      if (outcome.status !== 200 || !outcome.record) {
        res.status(outcome.status).json(outcome.payload);
        return;
      }

      let wallet: PlayerWalletState | undefined;
      if (deps?.creditGold && outcome.record.goldReward > 0) {
        const creditRes = await deps.creditGold(
          auth.userId,
          outcome.record.goldReward,
          `Achievement: ${spec.name}`,
          `ach_claim:${auth.userId}:${spec.id}`
        );
        wallet =
          creditRes?.wallet ||
          (typeof creditRes?.goldBalance === 'number' ? creditRes : undefined);
      }
      if (!wallet && deps?.getWallet) {
        wallet = deps.getWallet(auth.userId);
      }

      res.json({
        success: true,
        isFallbackLedger: true,
        achievementId: spec.id,
        rewards: {
          playerXpReward: outcome.record.playerXpReward,
          goldReward: outcome.record.goldReward,
        },
        wallet,
      });
    });
  };

  return {
    registerRoutes,
    readLedger,
  };
}
