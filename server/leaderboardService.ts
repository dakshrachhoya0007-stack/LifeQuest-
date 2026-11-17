import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { getCurrentWeekKey } from '../src/data/ecosystemData.ts';
import { PLAYER_TITLES_CATALOG } from '../src/data/polish2Data.ts';
import type {
  AdvancedLeaderboardResponse,
  AetherRankStage,
  CharacterClass,
  LeaderboardEntry,
  LeaderboardScope,
} from '../src/types/game.ts';

interface LeaderboardSnapshotRecord {
  periodKey: string;
  scope: LeaderboardScope;
  capturedAt: string;
  rankings: Array<{ rank: number; userId: string; name: string; score: number }>;
}

interface LeaderboardLedgerFile {
  snapshots: LeaderboardSnapshotRecord[];
}

const VALID_SCOPES = new Set<LeaderboardScope>([
  'global',
  'weekly',
  'monthly',
  'seasonal',
  'guild',
  'friends',
  'strength',
  'endurance',
  'consistency',
  'discipline',
  'community',
  'boss_battle',
]);

const safeReadJson = (filePath: string): any => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // ignore corrupted read
  }
  return null;
};

const getCurrentMonthKey = (now: Date = new Date()): string =>
  `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

const getScoreUnitForScope = (scope: LeaderboardScope): string => {
  switch (scope) {
    case 'weekly':
      return 'Weekly XP';
    case 'monthly':
      return 'Monthly XP';
    case 'seasonal':
      return 'Season XP';
    case 'strength':
      return 'Strength XP';
    case 'endurance':
      return 'Endurance XP';
    case 'consistency':
      return 'Streak Days';
    case 'discipline':
      return 'Discipline XP';
    case 'community':
      return 'Event Pts';
    case 'boss_battle':
      return 'Boss DMG';
    default:
      return 'Honor Pts';
  }
};

export function createLeaderboardService(rootDir: string) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_leaderboards.json');
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

  const readLedger = (): LeaderboardLedgerFile => {
    const parsed = safeReadJson(LEDGER_PATH);
    if (parsed && Array.isArray(parsed.snapshots)) {
      return { snapshots: parsed.snapshots };
    }
    return { snapshots: [] };
  };

  const writeLedger = (data: LeaderboardLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const computeRankingsForScope = (
    scope: LeaderboardScope,
    callerId: string,
    ledger: LeaderboardLedgerFile,
    supabaseRows: LeaderboardEntry[] = []
  ): AdvancedLeaderboardResponse & { snapshotUpdated: boolean } => {
    const socialLedger = safeReadJson(path.join(rootDir, '.lifequest_social_privacy_state.json'));
    const skillLedger = safeReadJson(path.join(rootDir, '.lifequest_skill_tree_ledger.json'));
    const bossLedger = safeReadJson(path.join(rootDir, '.lifequest_weekly_boss.json'));
    const communityLedger = safeReadJson(path.join(rootDir, '.lifequest_community_events.json'));
    const seasonsLedger = safeReadJson(path.join(rootDir, '.lifequest_seasons.json'));
    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));
    const legendsLedger = safeReadJson(path.join(rootDir, '.lifequest_legends_ledger.json'));

    const profiles: Record<string, any> = socialLedger?.profiles || {};
    const callerProfile = profiles[callerId];
    const callerBlockedSet = new Set<string>(
      Array.isArray(callerProfile?.blockedIds) ? callerProfile.blockedIds : []
    );
    const callerFriendsSet = new Set<string>(
      Array.isArray(callerProfile?.friendIds) ? callerProfile.friendIds : []
    );

    const supabaseByUser = new Map<string, LeaderboardEntry>();
    for (const r of supabaseRows) {
      if (r && r.userId) supabaseByUser.set(r.userId, r);
    }

    // Collect all known verified user IDs from server ledgers
    const allUserIds = new Set<string>();
    for (const uid of Object.keys(profiles)) allUserIds.add(uid);
    for (const uid of Object.keys(skillLedger?.users || {})) allUserIds.add(uid);
    for (const uid of Object.keys(identityLedger?.users || {})) allUserIds.add(uid);
    for (const c of bossLedger?.contributions || []) {
      if (c?.userId) allUserIds.add(c.userId);
    }
    for (const c of communityLedger?.contributions || []) {
      if (c?.userId) allUserIds.add(c.userId);
    }
    for (const p of Object.values(seasonsLedger?.playerProgress || {}) as any[]) {
      if (p?.userId) allUserIds.add(p.userId);
    }
    for (const uid of supabaseByUser.keys()) allUserIds.add(uid);

    const activeSeason = Array.isArray(seasonsLedger?.seasons)
      ? seasonsLedger.seasons.find((s: any) => s.status === 'active') || seasonsLedger.seasons[0]
      : null;

    const now = new Date();
    const weekKey = getCurrentWeekKey(now);
    const monthKey = getCurrentMonthKey(now);
    const periodKey =
      scope === 'weekly'
        ? weekKey
        : scope === 'monthly'
        ? monthKey
        : scope === 'seasonal' && activeSeason
        ? activeSeason.id
        : 'all_time';

    const rawEntries: Array<LeaderboardEntry & { sortTieBreaker: number }> = [];

    for (const uid of allUserIds) {
      const targetProf = profiles[uid];
      const sbEntry = supabaseByUser.get(uid);

      // Enforce mutual blocks & privacy visibility
      const targetBlockedCaller =
        Array.isArray(targetProf?.blockedIds) && targetProf.blockedIds.includes(callerId);
      if (uid !== callerId && (callerBlockedSet.has(uid) || targetBlockedCaller)) {
        continue;
      }

      if (scope === 'friends' && uid !== callerId && !callerFriendsSet.has(uid)) {
        continue;
      }

      if (scope === 'guild' && callerProfile?.guild?.id) {
        if (targetProf?.guild?.id !== callerProfile.guild.id && uid !== callerId) {
          continue;
        }
      }

      const privacy = targetProf?.privacySettings;
      const isFriend = callerFriendsSet.has(uid);
      const identityHidden =
        uid !== callerId &&
        Boolean(
          privacy &&
            (privacy.usernameAvatar === 'nobody' ||
              (privacy.usernameAvatar === 'friends' && !isFriend))
        );
      const levelHidden =
        uid !== callerId &&
        Boolean(
          privacy &&
            (privacy.level === 'nobody' || (privacy.level === 'friends' && !isFriend))
        );

      const skillUser = skillLedger?.users?.[uid];
      const identUser = identityLedger?.users?.[uid];
      const equippedTitleDef = identUser?.equippedTitleId
        ? PLAYER_TITLES_CATALOG.find(t => t.id === identUser.equippedTitleId) || null
        : null;

      let score = 0;
      if (scope === 'strength') {
        score = Number(skillUser?.attributes?.strength?.xp || 0);
      } else if (scope === 'endurance') {
        score = Number(skillUser?.attributes?.endurance?.xp || 0);
      } else if (scope === 'discipline') {
        score = Number(skillUser?.attributes?.discipline?.xp || 0);
      } else if (scope === 'consistency') {
        score = Math.max(
          Number(targetProf?.currentStreak || 0),
          Number(identUser?.verifiedSnapshot?.longestStreak || 0),
          Number(sbEntry?.streak || 0)
        );
      } else if (scope === 'boss_battle') {
        const activeBoss = Array.isArray(bossLedger?.events)
          ? bossLedger.events.find((e: any) => e.status === 'active') || bossLedger.events[0]
          : null;
        score = (bossLedger?.contributions || [])
          .filter((c: any) => c.userId === uid && (!activeBoss || c.eventId === activeBoss.id))
          .reduce((sum: number, c: any) => sum + Number(c.damageDealt || 0), 0);
      } else if (scope === 'community') {
        score = (communityLedger?.contributions || [])
          .filter((c: any) => c.userId === uid)
          .reduce((sum: number, c: any) => sum + Number(c.pointsAwarded || 0), 0);
      } else if (scope === 'seasonal') {
        const pProg = activeSeason
          ? seasonsLedger?.playerProgress?.[`${activeSeason.id}:${uid}`]
          : null;
        score = Number(pProg?.seasonXp || 0);
      } else if (scope === 'weekly' || scope === 'monthly') {
        const cutoffMs =
          scope === 'weekly'
            ? now.getTime() - 7 * 86400_000
            : now.getTime() - 30 * 86400_000;
        const skillPeriodXp = Array.isArray(skillUser?.events)
          ? skillUser.events
              .filter((e: any) => Date.parse(e.createdAt) >= cutoffMs)
              .reduce((sum: number, e: any) => sum + Number(e.xpAwarded || 0), 0)
          : 0;
        score = Math.max(Number(sbEntry?.score || 0), skillPeriodXp);
      } else {
        // global / friends / guild verified aggregate
        const totalSkillXp = skillUser
          ? Object.values(skillUser.attributes || {}).reduce(
              (s: number, a: any) => s + Number(a?.xp || 0),
              0
            )
          : 0;
        const profXp = Number(targetProf?.totalXp || 0);
        const streakVal = Number(targetProf?.currentStreak || sbEntry?.streak || 0);
        score = Math.max(Number(sbEntry?.score || 0), profXp + totalSkillXp + streakVal * 20);
      }

      const levelVal = Number(
        targetProf?.level || identUser?.verifiedSnapshot?.level || sbEntry?.level || 1
      );
      const streakVal = Number(
        targetProf?.currentStreak || identUser?.verifiedSnapshot?.currentStreak || sbEntry?.streak || 0
      );
      const username = identityHidden
        ? 'Private Champion'
        : String(targetProf?.username || sbEntry?.name || 'Champion');
      const legendEq = legendsLedger?.equippedByUser?.[uid];

      rawEntries.push({
        rank: 0,
        userId: uid,
        name: username,
        avatar: identityHidden ? '' : String(sbEntry?.avatar || ''),
        characterClass: (targetProf?.characterClass || sbEntry?.characterClass || 'Warrior') as CharacterClass,
        level: levelHidden ? 0 : levelVal,
        aetherRank: (targetProf?.aetherRank || sbEntry?.aetherRank || 'Dormant') as AetherRankStage,
        streak: streakVal,
        score: Math.max(0, Math.round(score)),
        scoreLabel: getScoreUnitForScope(scope),
        isCurrent: uid === callerId,
        equippedTitleName: identityHidden ? null : equippedTitleDef?.name || null,
        equippedTitleRarity: identityHidden ? null : equippedTitleDef?.rarity || null,
        reputationScore: identityHidden ? undefined : undefined,
        legendTitle: identityHidden ? null : targetProf?.legendTitle || legendEq?.titleTag || null,
        legendTitleStyle: identityHidden
          ? null
          : targetProf?.legendTitleStyle || legendEq?.titleStyle || null,
        legendEmblem: identityHidden
          ? null
          : targetProf?.legendEmblem || legendEq?.emblemIcon || null,
        identityHidden,
        levelHidden,
        sortTieBreaker: levelVal,
      });
    }

    rawEntries.sort(
      (a, b) =>
        b.score - a.score ||
        b.sortTieBreaker - a.sortTieBreaker ||
        b.streak - a.streak ||
        a.name.localeCompare(b.name)
    );

    // Compare against prior recorded snapshot if one exists for this scope
    const priorSnapshot = ledger.snapshots.find(
      s => s.scope === scope && s.periodKey !== periodKey
    ) || ledger.snapshots.find(s => s.scope === scope && s.periodKey === periodKey);

    const priorRankMap = new Map<string, number>();
    if (priorSnapshot) {
      for (const r of priorSnapshot.rankings) {
        priorRankMap.set(r.userId, r.rank);
      }
    }

    const rankedEntries: LeaderboardEntry[] = rawEntries.map((item, idx) => {
      const rank = idx + 1;
      const previousRank = priorRankMap.has(item.userId)
        ? priorRankMap.get(item.userId)!
        : null;
      const rankDelta = previousRank !== null ? previousRank - rank : null;
      const { sortTieBreaker: _drop, ...clean } = item;
      return {
        ...clean,
        rank,
        previousRank,
        rankDelta,
      };
    });

    // Record / refresh snapshot for current periodKey
    let snapshotUpdated = false;
    const existingSnapIdx = ledger.snapshots.findIndex(
      s => s.scope === scope && s.periodKey === periodKey
    );
    const nextSnap: LeaderboardSnapshotRecord = {
      periodKey,
      scope,
      capturedAt: now.toISOString(),
      rankings: rankedEntries.slice(0, 50).map(e => ({
        rank: e.rank,
        userId: e.userId,
        name: e.name,
        score: e.score,
      })),
    };
    if (rankedEntries.length > 0) {
      if (existingSnapIdx === -1) {
        ledger.snapshots.unshift(nextSnap);
        snapshotUpdated = true;
      } else {
        const prevTop = JSON.stringify(ledger.snapshots[existingSnapIdx].rankings);
        const newTop = JSON.stringify(nextSnap.rankings);
        if (prevTop !== newTop) {
          ledger.snapshots[existingSnapIdx] = nextSnap;
          snapshotUpdated = true;
        }
      }
    }

    const resetInfo = (() => {
      if (scope === 'weekly' || scope === 'boss_battle') {
        const day = now.getUTCDay();
        const daysToMon = day === 0 ? 1 : 8 - day;
        const resetDate = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon)
        );
        return {
          resetLabel: `Resets Weekly (${weekKey})`,
          resetAt: resetDate.toISOString(),
        };
      }
      if (scope === 'monthly' || scope === 'seasonal') {
        const resetDate = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
        );
        return {
          resetLabel:
            scope === 'seasonal' && activeSeason
              ? `Ends ${new Date(activeSeason.endsAt).toLocaleDateString()}`
              : `Monthly Reset (${monthKey})`,
          resetAt: scope === 'seasonal' && activeSeason ? activeSeason.endsAt : resetDate.toISOString(),
        };
      }
      return { resetLabel: 'All-Time Verified Standings', resetAt: null };
    })();

    const historicalSnapshots = ledger.snapshots
      .filter(s => s.scope === scope)
      .slice(0, 6)
      .map(s => ({
        periodKey: s.periodKey,
        scope: s.scope,
        capturedAt: s.capturedAt,
        topThree: s.rankings.slice(0, 3),
      }));

    return {
      scope,
      periodKey,
      resetLabel: resetInfo.resetLabel,
      resetAt: resetInfo.resetAt,
      scoreUnit: getScoreUnitForScope(scope),
      page: 1,
      limit: 20,
      totalEntries: rankedEntries.length,
      totalPages: Math.max(1, Math.ceil(rankedEntries.length / 20)),
      entries: rankedEntries,
      currentUserEntry: rankedEntries.find(e => e.userId === callerId) || null,
      historicalSnapshots,
      snapshotUpdated,
    };
  };

  const registerRoutes = (app: Express) => {
    app.post('/api/leaderboards/query', async (req: Request, res: Response) => {
      const callerId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!callerId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      // Anti-cheat guard: reject untrusted client score or rank injections
      if ('score' in body || 'rank' in body || 'overrideScore' in body || 'rankings' in body) {
        res.status(400).json({
          success: false,
          error: 'Untrusted leaderboard score or rank overrides are rejected.',
        });
        return;
      }

      const scopeRaw = String(body.scope || 'global') as LeaderboardScope;
      if (!VALID_SCOPES.has(scopeRaw)) {
        res.status(400).json({ success: false, error: 'Invalid leaderboard scope.' });
        return;
      }

      const page = Math.max(1, Math.round(Number(body.page || 1)));
      const limit = Math.min(50, Math.max(1, Math.round(Number(body.limit || 20))));
      const supabaseRows: LeaderboardEntry[] = Array.isArray(body.supabaseEntries)
        ? body.supabaseEntries
        : [];

      const response = await withLock(() => {
        const ledger = readLedger();
        const computed = computeRankingsForScope(scopeRaw, callerId, ledger, supabaseRows);
        if (computed.snapshotUpdated) writeLedger(ledger);

        const totalPages = Math.max(1, Math.ceil(computed.entries.length / limit));
        const safePage = Math.min(page, totalPages);
        const startIdx = (safePage - 1) * limit;

        return {
          success: true,
          scope: computed.scope,
          periodKey: computed.periodKey,
          resetLabel: computed.resetLabel,
          resetAt: computed.resetAt,
          scoreUnit: computed.scoreUnit,
          page: safePage,
          limit,
          totalEntries: computed.totalEntries,
          totalPages,
          entries: computed.entries.slice(startIdx, startIdx + limit),
          currentUserEntry: computed.currentUserEntry,
          historicalSnapshots: computed.historicalSnapshots,
        };
      });

      res.json(response);
    });
  };

  return {
    registerRoutes,
  };
}
