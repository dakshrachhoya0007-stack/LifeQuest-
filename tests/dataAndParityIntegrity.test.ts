import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GLOBAL_EXCLUSIVE_ACHIEVEMENTS } from '../src/data/globalLegendsData.ts';

const ROOT = process.cwd();

test('initialData.ts has zeroed starter progression and no static fake timers', () => {
  const initialDataSrc = fs.readFileSync(path.join(ROOT, 'src/data/initialData.ts'), 'utf8');

  // Ensure initial player stats block has zeroed progress counters
  const statsMatch = initialDataSrc.match(
    /export const INITIAL_PLAYER_STATS:[\s\S]*?=\s*\{([\s\S]*?)\};/
  );
  assert.ok(statsMatch, 'INITIAL_PLAYER_STATS must exist');
  const statsBlock = statsMatch[1];
  assert.match(statsBlock, /playerXP:\s*0,/);
  assert.match(statsBlock, /currentStreak:\s*0,/);
  assert.match(statsBlock, /totalWorkoutsCompleted:\s*0,/);
  assert.match(statsBlock, /totalVerifiedReps:\s*0,/);
  assert.match(statsBlock, /aetherRank:\s*'Dormant',/);
  assert.match(statsBlock, /aetherPoints:\s*0,/);

  // Ensure static fake remaining strings are gone
  assert.equal(initialDataSrc.includes('14h remaining'), false);
  assert.equal(initialDataSrc.includes('4 days remaining'), false);

  const questCatalogSrc = fs.readFileSync(path.join(ROOT, 'src/data/questCatalogData.ts'), 'utf8');

  // Ensure INITIAL_ACHIEVEMENTS does not pre-unlock or pre-claim any achievement
  const achMatch = questCatalogSrc.match(
    /export const INITIAL_ACHIEVEMENTS:\s*Achievement\[\]\s*=\s*\[([\s\S]*?)\];/
  );
  assert.ok(achMatch, 'INITIAL_ACHIEVEMENTS must exist in questCatalogData.ts');
  assert.equal(/unlocked:\s*true/.test(achMatch[1]), false, 'No initial achievement may be unlocked');
  assert.equal(/claimed:\s*true/.test(achMatch[1]), false, 'No initial achievement may be claimed');
});

test('Hall of Legends has exactly 5 curated entries with zero XP inflation and server.ts coverage', () => {
  assert.equal(
    GLOBAL_EXCLUSIVE_ACHIEVEMENTS.length,
    5,
    'Hall of Legends must contain strictly 5 curated worldwide exclusive achievements'
  );

  for (const entry of GLOBAL_EXCLUSIVE_ACHIEVEMENTS) {
    assert.equal(
      entry.rewardPlayerXp,
      0,
      `Global achievement "${entry.id}" must award 0 Player XP`
    );
  }

  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
  const reqTypes = Array.from(
    new Set(GLOBAL_EXCLUSIVE_ACHIEVEMENTS.map(a => a.requirementType))
  );

  for (const reqType of reqTypes) {
    assert.ok(
      serverSrc.includes(`case '${reqType}':`),
      `server.ts resolveServerVerifiedLegendMetric must handle requirementType "${reqType}"`
    );
  }
});

test('SQL migrations and globalLegendsData.ts catalog stay aligned', () => {
  const mig20261118 = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261118_ai_quests_report_hall_of_legends.sql'),
    'utf8'
  );
  const mig20261126 = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261126_security_integrity_repairs.sql'),
    'utf8'
  );
  const mig20261127 = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261127_five_legends_and_reward_fixes.sql'),
    'utf8'
  );
  const combinedSql = mig20261118 + '\n' + mig20261126 + '\n' + mig20261127;

  // Every ID in GLOBAL_EXCLUSIVE_ACHIEVEMENTS must exist in the 20261127 migration and combined catalog
  for (const legend of GLOBAL_EXCLUSIVE_ACHIEVEMENTS) {
    assert.ok(
      combinedSql.includes(`'${legend.id}'`),
      `Hall of Legends SQL catalog missing entry '${legend.id}'`
    );
    assert.ok(
      mig20261127.includes(`'${legend.id}'`),
      `20261127 migration missing curated entry '${legend.id}'`
    );
  }

  // Forward-only migrations should keep security & concurrency hardening intact
  assert.equal(mig20261126.includes('hydration_daily'), true);
  assert.equal(mig20261126.includes('game_states'), true);
  assert.equal(mig20261126.includes('rpc_add_mentor_daily_quest'), true);
  assert.equal(mig20261127.includes('ON CONFLICT (achievement_id) DO NOTHING'), true);
});
