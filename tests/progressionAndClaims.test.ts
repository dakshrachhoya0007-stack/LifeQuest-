import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { GLOBAL_EXCLUSIVE_ACHIEVEMENTS } from '../src/data/globalLegendsData.ts';
import { buildBattlePassTiers, buildInitialSeasonsCatalog } from '../src/data/polish2Data.ts';
import {
  SKILL_TREE_ATTRIBUTES,
  calculateSafeVerifiedActivityXp,
  computeAttributeProgress,
  evaluateSkillNodeStatus,
} from '../src/data/skillTreeData.ts';
import {
  clampDynamicQuestReward,
  createQuestsClaimService,
  getAchievementRewardSpec,
  getQuestRewardSpec,
  resolveServerPeriodKey,
} from '../server/questsClaimService.ts';
import { createSeasonService } from '../server/seasonService.ts';

const ROOT = process.cwd();

test('Global Exclusive Achievements catalog retains strictly 5 curated worldwide entries', () => {
  assert.equal(GLOBAL_EXCLUSIVE_ACHIEVEMENTS.length, 5);
  assert.deepEqual(
    GLOBAL_EXCLUSIVE_ACHIEVEMENTS.map(a => a.id),
    ['gl-disc-02', 'gl-phys-02', 'gl-cons-02', 'gl-ult-02', 'gl-ult-03']
  );

  for (const ach of GLOBAL_EXCLUSIVE_ACHIEVEMENTS) {
    assert.equal(ach.rewardPlayerXp, 0);
    assert.ok(ach.rewardGold >= 500 && ach.rewardGold <= 1000);
    assert.equal(/sword|weapon|dagger|bow|forge xp/i.test(`${ach.name} ${ach.story}`), false);
  }
});

test('Battle Pass contains 50 ascending tiers strictly classified into 5 streamlined categories', () => {
  const allowedCategories = new Set(['cosmetic', 'card', 'title', 'fragments', 'gold']);
  const catalog = buildInitialSeasonsCatalog(new Date('2026-11-15T12:00:00Z'));
  assert.equal(catalog.length, 1);

  const season = catalog[0];
  assert.equal(season.milestones.length, 50);

  let prevXp = 0;
  for (let i = 0; i < season.milestones.length; i++) {
    const tier = season.milestones[i];
    assert.equal(tier.tier, i + 1);
    assert.ok(tier.requiredSeasonXp > prevXp, `Tier ${tier.tier} XP must strictly ascend`);
    prevXp = tier.requiredSeasonXp;
    assert.ok(
      allowedCategories.has(tier.rewardType),
      `Unexpected free rewardType "${tier.rewardType}" on tier ${tier.tier}`
    );
    if (tier.eliteRewardType) {
      assert.ok(
        allowedCategories.has(tier.eliteRewardType),
        `Unexpected eliteRewardType "${tier.eliteRewardType}" on tier ${tier.tier}`
      );
    }
  }

  assert.equal(season.milestones[49].requiredSeasonXp, 15400);
  assert.equal(buildBattlePassTiers(2)[0].id, 's2_tier_1');
});

test('Skill Tree evaluateSkillNodeStatus enforces locked -> available -> unlocked progression', () => {
  const strAttr = SKILL_TREE_ATTRIBUTES.find(a => a.id === 'strength');
  assert.ok(strAttr);
  const tier1Node = strAttr.nodes.find(n => n.id === 'str-1a');
  const tier2Node = strAttr.nodes.find(n => n.id === 'str-1b');
  assert.ok(tier1Node && tier2Node);

  // Zero progress -> locked
  const zeroProg = computeAttributeProgress('strength', 0, 0, 0, null);
  assert.equal(evaluateSkillNodeStatus(tier1Node, zeroProg, []).status, 'locked');

  // 1 activity -> tier 1 available, tier 2 locked (requires prerequisite str-1a + lv4)
  const oneActProg = computeAttributeProgress('strength', 30, 1, 30, null);
  assert.equal(evaluateSkillNodeStatus(tier1Node, oneActProg, []).status, 'available');
  assert.equal(evaluateSkillNodeStatus(tier2Node, oneActProg, []).status, 'locked');

  // High XP & activities without unlocking str-1a -> tier 2 still locked due to missing prerequisite
  const highProg = computeAttributeProgress('strength', 500, 6, 40, null);
  assert.equal(evaluateSkillNodeStatus(tier2Node, highProg, []).status, 'locked');

  // Unlocking str-1a unlocks str-1b availability
  assert.equal(evaluateSkillNodeStatus(tier2Node, highProg, ['str-1a']).status, 'available');
  assert.equal(evaluateSkillNodeStatus(tier2Node, highProg, ['str-1a', 'str-1b']).status, 'unlocked');

  // Daily safety cap clamps physiological inputs safely
  const safe = calculateSafeVerifiedActivityXp(
    'strength_workout',
    { durationMinutes: 999, repetitions: 999, verifiedWithAetherVision: true },
    110
  );
  assert.equal(safe.xpAwarded, 10);
  assert.equal(safe.safetyCapped, true);
});

test('Quest & Achievement reward specs and clamping stay balanced', () => {
  const q1 = getQuestRewardSpec('q-1');
  assert.ok(q1);
  assert.ok(q1.playerXpReward > 0 && q1.goldReward > 0);
  assert.equal(getQuestRewardSpec('non-existent'), null);

  const a1 = getAchievementRewardSpec('ach-1');
  assert.ok(a1);
  assert.ok(a1.playerXpReward > 0 && a1.goldReward > 0);
  assert.equal(getAchievementRewardSpec('non-existent'), null);

  const clampedHigh = clampDynamicQuestReward(9999, 9999);
  assert.deepEqual(clampedHigh, { playerXpReward: 160, goldReward: 120 });

  const clampedLow = clampDynamicQuestReward(-10, -5);
  assert.deepEqual(clampedLow, { playerXpReward: 15, goldReward: 15 });

  assert.equal(resolveServerPeriodKey('special', ''), 'special');
  assert.equal(resolveServerPeriodKey('daily', '2026-11-26'), '2026-11-26');
});

test('questsClaimService prevents duplicate & concurrent claims atomically and syncs wallet gold', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifequest-claims-'));
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevKey = process.env.VITE_SUPABASE_ANON_KEY;
  const prevSrvUrl = process.env.SUPABASE_URL;
  const prevSrvKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;

  const balances = new Map<string, number>();
  const service = createQuestsClaimService(tmpDir, {
    creditGold: async (userId, amount) => {
      const next = (balances.get(userId) || 0) + amount;
      balances.set(userId, next);
      return { wallet: { userId, goldBalance: next, cosmeticFragments: 0 } };
    },
    getWallet: userId => ({
      userId,
      goldBalance: balances.get(userId) || 0,
      cosmeticFragments: 0,
      lifetimeGoldEarned: balances.get(userId) || 0,
      recentTransactions: [],
      updatedAt: new Date().toISOString(),
    }),
  });

  const app = express();
  app.use(express.json());
  service.registerRoutes(app);

  const server = await new Promise<http.Server>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-lifequest-user-id': 'tester-user-1',
    };

    // Concurrent race on classic quest claim -> exactly 1 succeeds (200) and 1 fails (409)
    const [r1, r2] = await Promise.all([
      fetch(`${baseUrl}/api/quests/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ questId: 'q-1', periodKey: '2026-11-26' }),
      }),
      fetch(`${baseUrl}/api/quests/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ questId: 'q-1', periodKey: '2026-11-26' }),
      }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [200, 409]);
    assert.equal(balances.get('tester-user-1'), 20);

    // Achievement claim once -> 200, second -> 409
    const achRes1 = await fetch(`${baseUrl}/api/achievements/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ achievementId: 'ach-1' }),
    });
    assert.equal(achRes1.status, 200);
    const achJson1 = (await achRes1.json()) as any;
    assert.equal(achJson1.rewards.goldReward, 25);
    assert.equal(balances.get('tester-user-1'), 45);

    const achRes2 = await fetch(`${baseUrl}/api/achievements/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ achievementId: 'ach-1' }),
    });
    assert.equal(achRes2.status, 409);
    assert.equal(balances.get('tester-user-1'), 45);

    // Dynamic quest claim with inflated rewards gets clamped server-side
    const dynRes = await fetch(`${baseUrl}/api/quests/claim-dynamic`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        questId: 'dq-daily-1',
        periodKey: '2026-11-26',
        playerXpReward: 50000,
        goldReward: 50000,
      }),
    });
    assert.equal(dynRes.status, 200);
    const dynJson = (await dynRes.json()) as any;
    assert.equal(dynJson.rewards.playerXpReward, 160);
    assert.equal(dynJson.rewards.goldReward, 120);
    assert.equal(balances.get('tester-user-1'), 165);
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (prevUrl !== undefined) process.env.VITE_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = prevKey;
    if (prevSrvUrl !== undefined) process.env.SUPABASE_URL = prevSrvUrl;
    if (prevSrvKey !== undefined) process.env.SUPABASE_ANON_KEY = prevSrvKey;
  }
});

test('seasonService unlocks elite after 100 XP and prevents duplicate tier claims', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifequest-season-'));
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevKey = process.env.VITE_SUPABASE_ANON_KEY;
  const prevSrvUrl = process.env.SUPABASE_URL;
  const prevSrvKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;

  const goldGranted: number[] = [];
  const svc = createSeasonService(tmpDir, {
    onGrantGold: async (_uid, amt) => {
      goldGranted.push(amt);
    },
  });

  const app = express();
  app.use(express.json());
  svc.registerRoutes(app);

  const server = await new Promise<http.Server>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-lifequest-user-id': 'season-tester-1',
    };

    // Award 130 seasonal XP across two verified workouts
    await svc.applyVerifiedSeasonProgress({
      userId: 'season-tester-1',
      username: 'Tester',
      activityType: 'strength_workout',
      idempotencyKey: 'wk-1',
    });
    await svc.applyVerifiedSeasonProgress({
      userId: 'season-tester-1',
      username: 'Tester',
      activityType: 'strength_workout',
      idempotencyKey: 'wk-2',
    });

    const stateRes = await fetch(`${baseUrl}/api/seasons/state`, { headers });
    assert.equal(stateRes.status, 200);
    const stateJson = (await stateRes.json()) as any;
    const tier1Id = stateJson.season.milestones[0].id;
    assert.ok(stateJson.playerProgress.seasonXp >= 100);

    // Free Tier 1 claim succeeds once, duplicate fails 409
    const free1 = await fetch(`${baseUrl}/api/seasons/claim-milestone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId: tier1Id, track: 'free' }),
    });
    assert.equal(free1.status, 200);
    assert.deepEqual(goldGranted, [40]);

    const free2 = await fetch(`${baseUrl}/api/seasons/claim-milestone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId: tier1Id, track: 'free' }),
    });
    assert.equal(free2.status, 409);

    // Elite claim before unlock returns 403
    const eliteLocked = await fetch(`${baseUrl}/api/seasons/claim-milestone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId: tier1Id, track: 'elite' }),
    });
    assert.equal(eliteLocked.status, 403);

    // Unlock Elite -> claim succeeds once
    const unlockRes = await fetch(`${baseUrl}/api/seasons/unlock-elite`, {
      method: 'POST',
      headers,
    });
    assert.equal(unlockRes.status, 200);

    const elite1 = await fetch(`${baseUrl}/api/seasons/claim-milestone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId: tier1Id, track: 'elite' }),
    });
    assert.equal(elite1.status, 200);
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (prevUrl !== undefined) process.env.VITE_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = prevKey;
    if (prevSrvUrl !== undefined) process.env.SUPABASE_URL = prevSrvUrl;
    if (prevSrvKey !== undefined) process.env.SUPABASE_ANON_KEY = prevSrvKey;
  }
});

test('Navigation & UI structure keep System simplified and Quest Board unified with zero purple tokens', () => {
  const sidebarSrc = fs.readFileSync(path.join(ROOT, 'src/components/Navigation/Sidebar.tsx'), 'utf8');
  assert.equal(sidebarSrc.includes('ai-architect'), false);
  assert.equal(sidebarSrc.includes('daily-report'), false);
  const hallMatches = sidebarSrc.match(/id:\s*'hall-of-legends'/g) || [];
  assert.equal(hallMatches.length, 1, 'Hall of Legends must appear exactly once in System navigation');

  const questsViewSrc = fs.readFileSync(path.join(ROOT, 'src/components/Quests/QuestsView.tsx'), 'utf8');
  assert.ok(questsViewSrc.includes("'board'"));
  assert.ok(questsViewSrc.includes("'calendar'"));
  assert.ok(questsViewSrc.includes("'achievements'"));
});
