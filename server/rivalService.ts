import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import {
  DEFAULT_DUEL_DURATION_SECONDS,
  DUEL_EXERCISES_CATALOG,
  DUEL_EXERCISE_IDS,
  MAX_DUEL_DURATION_SECONDS,
  MIN_DUEL_DURATION_SECONDS,
  calculateCompetitiveRatingChange,
  computeCompetitiveTier,
  pickAutoDuelExercise,
  validateServerDuelRep,
} from '../src/data/ecosystemData.ts';
import {
  DEMOTION_SHIELD_MATCHES,
  PLACEMENT_MATCHES_REQUIRED,
  RANKED_DIVISIONS_CATALOG,
  computeRankedDivision,
} from '../src/data/aaaGamingData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  CharacterClass,
  CommunityTournament,
  CommunityTournamentMatch,
  CompetitiveH2HRecord,
  CompetitiveLeaderboardEntry,
  CompetitiveMatchStatus,
  CompetitiveMatchVisibility,
  CompetitiveRivalMatch,
  CompetitiveRivalProfile,
  DuelExerciseId,
  MatchmakingQueueEntry,
  PresenceStatus,
  RankedDivisionName,
  RivalryRecord,
  RivalryScoreEntry,
  RivalryStatsSummary,
  SkillActivityType,
  SpectatorLiveMatchSummary,
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

interface StoredSpectatorCheer {
  id: string;
  matchId: string;
  spectatorId: string;
  spectatorName: string;
  targetUserId: string;
  emoji: string;
  createdAt: string;
}

interface RivalsLedgerFile {
  profiles: Record<string, CompetitiveRivalProfile>;
  matches: CompetitiveRivalMatch[];
  scores: RivalryScoreEntry[];
  queue: MatchmakingQueueEntry[];
  blocks: BlockEntry[];
  notifications: RivalNotificationEvent[];
  tournaments: CommunityTournament[];
  spectatorCheers: StoredSpectatorCheer[];
  followedCompetitors: Record<string, string[]>;
  claimedDivisionRewards: Record<string, string[]>;
  lastRepTimestamps?: Record<string, number>;
  legacyMigrated?: boolean;
  optionAMigrated?: boolean;
}

export interface RivalScoreUpdateResult {
  updatedCount: number;
  pointsAwardedTotal: number;
  resolvedRivalries: RivalryRecord[];
  resolvedMatches: CompetitiveRivalMatch[];
}

const VALID_DUEL_EXERCISES = new Set<DuelExerciseId>(DUEL_EXERCISE_IDS);
const VALID_VISIBILITIES = new Set<CompetitiveMatchVisibility>(['friends', 'public', 'private']);
const VALID_SPECTATOR_EMOJIS = new Set<string>(['🔥', '⚔️', '🏆', '💪', '👏']);
const CHEER_MAX_PER_MIN = 5;
const READY_STAGE_TIMEOUT_MS = 180_000; // 3 min to calibrate camera & ready up
const COUNTDOWN_MS = 5_000; // 5 sec synchronized countdown

const getDivisionIndex = (rating: number): number => {
  const div = computeRankedDivision(rating);
  const idx = RANKED_DIVISIONS_CATALOG.findIndex(d => d.division === div);
  return idx >= 0 ? idx : 1;
};

const createDefaultProfile = (
  userId: string,
  meta?: { username?: string; characterClass?: CharacterClass; level?: number }
): CompetitiveRivalProfile => ({
  userId,
  username: (meta?.username || 'Champion').trim().slice(0, 48) || 'Champion',
  characterClass: meta?.characterClass || 'Warrior',
  level: Math.max(1, Number(meta?.level || 1)),
  rating: 1200,
  ratingDeviation: 200,
  volatility: 0.06,
  kFactor: 32,
  tier: 'Silver',
  wins: 0,
  losses: 0,
  ties: 0,
  matchesPlayed: 0,
  winRate: 0,
  currentStreak: 0,
  bestStreak: 0,
  peakRating: 1200,
  seasonalRating: 1200,
  allowNonFriendChallenges: true,
  placementMatchesPlayed: 0,
  placementCompleted: false,
  demotionShieldRemaining: 0,
  currentDivisionIndex: getDivisionIndex(1200),
  updatedAt: new Date().toISOString(),
});

const matchToLegacyRecord = (m: CompetitiveRivalMatch): RivalryRecord => ({
  id: m.id,
  challengerId: m.challengerId,
  challengerName: m.challengerName,
  opponentId: m.opponentId,
  opponentName: m.opponentName,
  challengeType: m.challengeType,
  challengeTitle: m.challengeTitle,
  status:
    m.status === 'accepted'
      ? 'active'
      : m.status === 'disputed'
      ? 'cancelled'
      : (m.status as RivalryRecord['status']),
  challengerScore: m.challengerScore,
  opponentScore: m.opponentScore,
  winnerId: m.winnerId,
  isTie: m.isTie,
  startsAt: m.startsAt,
  endsAt: m.endsAt,
  createdAt: m.createdAt,
  resolvedAt: m.resolvedAt,
});

const buildTournamentBracket = (
  tournamentId: string,
  participants: CommunityTournament['participants']
): CommunityTournamentMatch[] => {
  if (participants.length < 2) return [];
  const seeded = [...participants].sort((a, b) => b.rating - a.rating);
  const matches: CommunityTournamentMatch[] = [];
  const roundLabel =
    seeded.length <= 2 ? 'Grand Final' : seeded.length <= 4 ? 'Semifinals' : 'Round 1';

  for (let i = 0; i < seeded.length; i += 2) {
    const pA = seeded[i];
    const pB = seeded[i + 1] || null;
    matches.push({
      id: `${tournamentId}-r1-m${Math.floor(i / 2) + 1}`,
      roundNumber: 1,
      roundLabel,
      playerAId: pA.userId,
      playerAName: pA.username,
      playerARating: pA.rating,
      playerBId: pB ? pB.userId : null,
      playerBName: pB ? pB.username : 'Bye',
      playerBRating: pB ? pB.rating : null,
      playerAScore: 0,
      playerBScore: 0,
      winnerId: pB ? null : pA.userId,
      status: pB ? 'live' : 'completed',
    });
  }
  return matches;
};

export function createRivalService(
  rootDir: string,
  opts?: {
    onBroadcast?: (eventType: string, payload: unknown, targetUserIds?: string[]) => void;
    onRivalryCompleted?: (rivalry: RivalryRecord) => Promise<void> | void;
    getPresenceStatus?: (targetUserId: string, viewerId: string | null) => PresenceStatus;
    isFriendsWith?: (userA: string, userB: string) => boolean;
    getCompetitorLoadoutSummary?: (userId: string) => string;
    onGrantTitle?: (params: { userId: string; titleId: string; sourceRef: string }) => Promise<any>;
    onUnlockCosmetic?: (params: { userId: string; cosmeticId: string; sourceRef: string }) => Promise<any>;
    onFriendDuelSettled?: (params: {
      challengerId: string;
      opponentId: string;
      matchId: string;
      challengeTitle: string;
    }) => Promise<void> | void;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_rivals.json');
  let queueLock: Promise<void> = Promise.resolve();
  const cheerTimestampsByUser = new Map<string, number[]>();

  const withLock = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    let release!: () => void;
    const prev = queueLock;
    queueLock = new Promise<void>(resolve => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  };

  const normalizeDuelMatch = (raw: any): CompetitiveRivalMatch => {
    const rawEx = String(raw?.duelExercise || raw?.rules?.exerciseId || '') as DuelExerciseId;
    const hasOptionAExercise = VALID_DUEL_EXERCISES.has(rawEx);
    const fallbackEx: DuelExerciseId = hasOptionAExercise ? rawEx : 'squat';
    const def = DUEL_EXERCISES_CATALOG[fallbackEx];

    const durSec = Math.min(
      MAX_DUEL_DURATION_SECONDS,
      Math.max(
        MIN_DUEL_DURATION_SECONDS,
        Number(raw?.durationSeconds || raw?.rules?.durationSeconds || DEFAULT_DUEL_DURATION_SECONDS)
      )
    );

    let status: CompetitiveMatchStatus = raw?.status || 'expired';
    // Retire legacy multi-day non-Option-A active/pending challenges cleanly so only real-time 1v1 duels run
    if (!hasOptionAExercise && (status === 'active' || status === 'accepted' || status === 'pending')) {
      status = 'expired';
    }

    return {
      ...raw,
      duelExercise: fallbackEx,
      exerciseName: raw?.exerciseName || (hasOptionAExercise ? def.name : raw?.challengeTitle || def.name),
      pointsPerRep: Number(raw?.pointsPerRep || raw?.rules?.pointsPerRep || def.pointsPerRep),
      durationSeconds: durSec,
      challengerReps: Number(raw?.challengerReps || 0),
      opponentReps: Number(raw?.opponentReps || 0),
      challengerReady: Boolean(raw?.challengerReady),
      opponentReady: Boolean(raw?.opponentReady),
      challengerCameraReady: Boolean(raw?.challengerCameraReady),
      opponentCameraReady: Boolean(raw?.opponentCameraReady),
      countdownEndsAt: raw?.countdownEndsAt ?? null,
      forfeitByUserId: raw?.forfeitByUserId ?? null,
      status,
      rules: {
        exerciseId: fallbackEx,
        pointsPerRep: Number(raw?.pointsPerRep || raw?.rules?.pointsPerRep || def.pointsPerRep),
        durationSeconds: durSec,
        ranked: raw?.isRanked !== false,
      },
    };
  };

  const readLedger = (): RivalsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          const profiles: Record<string, CompetitiveRivalProfile> =
            parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {};
          const scores: RivalryScoreEntry[] = Array.isArray(parsed.scores) ? parsed.scores : [];
          const rawQueue: MatchmakingQueueEntry[] = Array.isArray(parsed.queue) ? parsed.queue : [];
          const queue: MatchmakingQueueEntry[] = rawQueue.map(q =>
            q.status === 'searching' && q.mode !== ('duel' as any) && !VALID_DUEL_EXERCISES.has(q.mode as DuelExerciseId)
              ? { ...q, status: 'expired' }
              : q
          );
          const blocks: BlockEntry[] = Array.isArray(parsed.blocks) ? parsed.blocks : [];
          const notifications: RivalNotificationEvent[] = Array.isArray(parsed.notifications)
            ? parsed.notifications
            : [];
          const tournaments: CommunityTournament[] = Array.isArray(parsed.tournaments)
            ? parsed.tournaments
            : [];
          const spectatorCheers: StoredSpectatorCheer[] = Array.isArray(parsed.spectatorCheers)
            ? parsed.spectatorCheers
            : [];
          const followedCompetitors: Record<string, string[]> =
            parsed.followedCompetitors && typeof parsed.followedCompetitors === 'object'
              ? parsed.followedCompetitors
              : {};
          const claimedDivisionRewards: Record<string, string[]> =
            parsed.claimedDivisionRewards && typeof parsed.claimedDivisionRewards === 'object'
              ? parsed.claimedDivisionRewards
              : {};
          const lastRepTimestamps: Record<string, number> =
            parsed.lastRepTimestamps && typeof parsed.lastRepTimestamps === 'object'
              ? parsed.lastRepTimestamps
              : {};

          const rawMatches = Array.isArray(parsed.matches) ? parsed.matches : [];
          const matches: CompetitiveRivalMatch[] = rawMatches.map(normalizeDuelMatch);

          return {
            profiles,
            matches,
            scores,
            queue,
            blocks,
            notifications,
            tournaments,
            spectatorCheers,
            followedCompetitors,
            claimedDivisionRewards,
            lastRepTimestamps,
            legacyMigrated: true,
            optionAMigrated: true,
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return {
      profiles: {},
      matches: [],
      scores: [],
      queue: [],
      blocks: [],
      notifications: [],
      tournaments: [],
      spectatorCheers: [],
      followedCompetitors: {},
      claimedDivisionRewards: {},
      lastRepTimestamps: {},
      legacyMigrated: true,
      optionAMigrated: true,
    };
  };

  const writeLedger = (data: RivalsLedgerFile) => {
    fs.writeFileSync(
      LEDGER_PATH,
      JSON.stringify(
        {
          profiles: data.profiles,
          matches: data.matches,
          scores: data.scores.slice(0, 3000),
          queue: data.queue.slice(0, 300),
          blocks: data.blocks,
          notifications: data.notifications,
          tournaments: data.tournaments,
          spectatorCheers: data.spectatorCheers.slice(0, 600),
          followedCompetitors: data.followedCompetitors,
          claimedDivisionRewards: data.claimedDivisionRewards,
          lastRepTimestamps: data.lastRepTimestamps || {},
          legacyMigrated: true,
          optionAMigrated: true,
        },
        null,
        2
      ),
      'utf8'
    );
  };

  const ensureProfile = (
    ledger: RivalsLedgerFile,
    userId: string,
    meta?: { username?: string; characterClass?: CharacterClass; level?: number }
  ): CompetitiveRivalProfile => {
    const existing = ledger.profiles[userId];
    if (!existing) {
      const created = createDefaultProfile(userId, meta);
      ledger.profiles[userId] = created;
      return created;
    }
    if (meta?.username && meta.username.trim() && meta.username !== 'Champion') {
      existing.username = meta.username.trim().slice(0, 48);
    }
    if (meta?.characterClass) {
      existing.characterClass = meta.characterClass;
    }
    if (typeof meta?.level === 'number' && meta.level > 0) {
      existing.level = Math.max(existing.level, Math.round(meta.level));
    }
    if (typeof existing.placementMatchesPlayed !== 'number') {
      existing.placementMatchesPlayed = Math.min(PLACEMENT_MATCHES_REQUIRED, existing.matchesPlayed);
    }
    existing.placementCompleted = existing.placementMatchesPlayed >= PLACEMENT_MATCHES_REQUIRED;
    if (typeof existing.demotionShieldRemaining !== 'number') {
      existing.demotionShieldRemaining = 0;
    }
    if (typeof existing.currentDivisionIndex !== 'number') {
      existing.currentDivisionIndex = getDivisionIndex(existing.rating);
    }
    existing.tier = computeCompetitiveTier(existing.rating);
    existing.winRate =
      existing.matchesPlayed > 0
        ? Math.round((existing.wins / existing.matchesPlayed) * 1000) / 10
        : 0;
    return existing;
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

  const isPairBlocked = (ledger: RivalsLedgerFile, a: string, b: string): boolean =>
    ledger.blocks.some(
      blk =>
        (blk.blockerId === a && blk.blockedId === b) ||
        (blk.blockerId === b && blk.blockedId === a)
    );

  const applyDivisionTransition = (
    p: CompetitiveRivalProfile,
    rawNewRating: number
  ) => {
    const prevIdx =
      typeof p.currentDivisionIndex === 'number'
        ? p.currentDivisionIndex
        : getDivisionIndex(p.rating);
    const nextIdx = getDivisionIndex(rawNewRating);

    if (nextIdx > prevIdx) {
      p.rating = rawNewRating;
      p.currentDivisionIndex = nextIdx;
      p.demotionShieldRemaining = DEMOTION_SHIELD_MATCHES;
    } else if (nextIdx < prevIdx) {
      const shield = Math.max(0, Number(p.demotionShieldRemaining || 0));
      if (shield > 0) {
        p.demotionShieldRemaining = shield - 1;
        const floorRating = RANKED_DIVISIONS_CATALOG[prevIdx]?.minRating ?? 1100;
        p.rating = Math.max(floorRating, rawNewRating);
        p.currentDivisionIndex = prevIdx;
      } else {
        p.rating = rawNewRating;
        p.currentDivisionIndex = nextIdx;
      }
    } else {
      p.rating = rawNewRating;
    }

    p.peakRating = Math.max(p.peakRating, p.rating);
    p.tier = computeCompetitiveTier(p.rating);
  };

  const broadcastMatchEvent = (
    eventType: 'rivals:match_found' | 'rivals:match_updated' | 'rivals:match_settled',
    match: CompetitiveRivalMatch,
    extra?: Record<string, any>
  ) => {
    if (!opts?.onBroadcast) return;
    opts.onBroadcast(
      eventType,
      {
        serverNow: new Date().toISOString(),
        match,
        ...(extra || {}),
      },
      [match.challengerId, match.opponentId]
    );
  };

  const settleCompletedMatch = (
    ledger: RivalsLedgerFile,
    m: CompetitiveRivalMatch,
    nowMs: number,
    optsSettle?: { forfeitByUserId?: string }
  ) => {
    m.status = 'completed';
    m.resolvedAt = new Date(nowMs).toISOString();

    if (optsSettle?.forfeitByUserId) {
      m.forfeitByUserId = optsSettle.forfeitByUserId;
      m.winnerId =
        optsSettle.forfeitByUserId === m.challengerId ? m.opponentId : m.challengerId;
      m.isTie = false;
    } else if (m.challengerScore === m.opponentScore) {
      if (m.challengerReps > m.opponentReps) {
        m.winnerId = m.challengerId;
        m.isTie = false;
      } else if (m.opponentReps > m.challengerReps) {
        m.winnerId = m.opponentId;
        m.isTie = false;
      } else {
        m.winnerId = null;
        m.isTie = true;
      }
    } else if (m.challengerScore > m.opponentScore) {
      m.winnerId = m.challengerId;
      m.isTie = false;
    } else {
      m.winnerId = m.opponentId;
      m.isTie = false;
    }

    const pCh = ensureProfile(ledger, m.challengerId, { username: m.challengerName });
    const pOp = ensureProfile(ledger, m.opponentId, { username: m.opponentName });

    const totalCombinedScore = m.challengerScore + m.opponentScore;
    const countForRecords = totalCombinedScore > 0 || Boolean(optsSettle?.forfeitByUserId);
    m.challengerRatingBefore = pCh.rating;
    m.opponentRatingBefore = pOp.rating;

    if (countForRecords) {
      if (m.isTie) {
        pCh.ties += 1;
        pOp.ties += 1;
        pCh.currentStreak = 0;
        pOp.currentStreak = 0;
      } else if (m.winnerId === m.challengerId) {
        pCh.wins += 1;
        pCh.currentStreak = Math.max(0, pCh.currentStreak) + 1;
        pCh.bestStreak = Math.max(pCh.bestStreak, pCh.currentStreak);
        pOp.losses += 1;
        pOp.currentStreak = 0;
      } else {
        pOp.wins += 1;
        pOp.currentStreak = Math.max(0, pOp.currentStreak) + 1;
        pOp.bestStreak = Math.max(pOp.bestStreak, pOp.currentStreak);
        pCh.losses += 1;
        pCh.currentStreak = 0;
      }

      pCh.matchesPlayed += 1;
      pOp.matchesPlayed += 1;

      if (m.isRanked) {
        pCh.placementMatchesPlayed = Math.min(
          PLACEMENT_MATCHES_REQUIRED,
          Number(pCh.placementMatchesPlayed || 0) + 1
        );
        pCh.placementCompleted = pCh.placementMatchesPlayed >= PLACEMENT_MATCHES_REQUIRED;

        pOp.placementMatchesPlayed = Math.min(
          PLACEMENT_MATCHES_REQUIRED,
          Number(pOp.placementMatchesPlayed || 0) + 1
        );
        pOp.placementCompleted = pOp.placementMatchesPlayed >= PLACEMENT_MATCHES_REQUIRED;

        const scoreA: 1 | 0.5 | 0 = m.isTie
          ? 0.5
          : m.winnerId === m.challengerId
          ? 1
          : 0;
        const elo = calculateCompetitiveRatingChange({
          ratingA: pCh.rating,
          ratingB: pOp.rating,
          rdA: pCh.ratingDeviation,
          rdB: pOp.ratingDeviation,
          actualScoreA: scoreA,
        });

        const chBefore = pCh.rating;
        const opBefore = pOp.rating;
        applyDivisionTransition(pCh, elo.newRatingA);
        applyDivisionTransition(pOp, elo.newRatingB);

        const actualDeltaA = pCh.rating - chBefore;
        const actualDeltaB = pOp.rating - opBefore;

        pCh.seasonalRating = Math.max(100, pCh.seasonalRating + actualDeltaA);
        pCh.ratingDeviation = elo.newRdA;
        pOp.seasonalRating = Math.max(100, pOp.seasonalRating + actualDeltaB);
        pOp.ratingDeviation = elo.newRdB;

        m.challengerRatingAfter = pCh.rating;
        m.challengerRatingDelta = actualDeltaA;
        m.opponentRatingAfter = pOp.rating;
        m.opponentRatingDelta = actualDeltaB;
      } else {
        m.challengerRatingAfter = pCh.rating;
        m.challengerRatingDelta = 0;
        m.opponentRatingAfter = pOp.rating;
        m.opponentRatingDelta = 0;
      }

      pCh.winRate = Math.round((pCh.wins / pCh.matchesPlayed) * 1000) / 10;
      pOp.winRate = Math.round((pOp.wins / pOp.matchesPlayed) * 1000) / 10;
      pCh.updatedAt = m.resolvedAt;
      pOp.updatedAt = m.resolvedAt;
    } else {
      m.challengerRatingAfter = pCh.rating;
      m.challengerRatingDelta = 0;
      m.opponentRatingAfter = pOp.rating;
      m.opponentRatingDelta = 0;
    }

    const deltaDesc = m.isRanked
      ? ` Rating shift: ${m.challengerName} (${m.challengerRatingDelta! >= 0 ? '+' : ''}${m.challengerRatingDelta}), ${m.opponentName} (${m.opponentRatingDelta! >= 0 ? '+' : ''}${m.opponentRatingDelta}).`
      : '';
    const outcomeText = m.isTie
      ? `Your ${m.exerciseName} duel ended in a draw (${m.challengerScore} - ${m.opponentScore} pts).${deltaDesc}`
      : `${m.winnerId === m.challengerId ? m.challengerName : m.opponentName} won the ${m.exerciseName} duel (${m.challengerScore} vs ${m.opponentScore} pts)!${deltaDesc}`;
    pushNotif(ledger, m.challengerId, 'rivalry_completed', 'Rivals Duel Concluded', outcomeText, m.id);
    pushNotif(ledger, m.opponentId, 'rivalry_completed', 'Rivals Duel Concluded', outcomeText, m.id);
  };

  const resolveExpiredMatches = (ledger: RivalsLedgerFile): CompetitiveRivalMatch[] => {
    const now = Date.now();
    const resolved: CompetitiveRivalMatch[] = [];
    let changed = false;

    for (const m of ledger.matches) {
      const endMs = Date.parse(m.endsAt);
      if (m.status === 'active' && !Number.isNaN(endMs) && now >= endMs) {
        settleCompletedMatch(ledger, m, now);
        resolved.push({ ...m });
        changed = true;
      } else if (m.status === 'accepted' && !Number.isNaN(endMs) && now >= endMs) {
        // Readiness window timed out before both players clicked Ready
        m.status = 'expired';
        m.resolvedAt = new Date(now).toISOString();
        changed = true;
      } else if (m.status === 'pending' && !Number.isNaN(endMs) && now >= endMs) {
        m.status = 'expired';
        m.resolvedAt = new Date(now).toISOString();
        changed = true;
        pushNotif(
          ledger,
          m.challengerId,
          'rivalry_expired',
          'Rivals Challenge Expired',
          `Your pending ${m.exerciseName} duel invite to ${m.opponentName} expired.`,
          m.id
        );
      }
    }

    for (const q of ledger.queue) {
      if (q.status === 'searching' && now >= Date.parse(q.expiresAt)) {
        q.status = 'expired';
        changed = true;
      }
    }

    for (const t of ledger.tournaments) {
      const endMs = Date.parse(t.endsAt);
      if (t.status !== 'completed' && !Number.isNaN(endMs) && now >= endMs) {
        t.status = 'completed';
        for (const tm of t.matches) {
          if (tm.status !== 'completed') {
            tm.status = 'completed';
            if (tm.playerBId) {
              tm.winnerId = tm.playerAScore >= tm.playerBScore ? tm.playerAId : tm.playerBId;
            }
          }
        }
        changed = true;
      }
    }

    if (changed) {
      writeLedger(ledger);
    }
    return resolved;
  };

  const buildStatsForUser = (
    userId: string,
    profile: CompetitiveRivalProfile,
    matches: CompetitiveRivalMatch[]
  ): RivalryStatsSummary => {
    const mine = matches.filter(m => m.challengerId === userId || m.opponentId === userId);
    const activeCount = mine.filter(m => m.status === 'active' || m.status === 'accepted').length;
    const pendingIncomingCount = mine.filter(
      m => m.status === 'pending' && m.opponentId === userId
    ).length;

    const titlesUnlocked: string[] = [];
    const achievementsUnlocked: string[] = [];
    if (mine.some(m => m.status === 'active' || m.status === 'completed')) {
      achievementsUnlocked.push('Arena Contender');
    }
    if (profile.wins >= 1) {
      titlesUnlocked.push('Duelist of Honor');
      achievementsUnlocked.push('First Rivals Victory');
    }
    if (profile.rating >= 1300) {
      titlesUnlocked.push('Gold Division Duelist');
    }
    if (profile.rating >= 1500) {
      titlesUnlocked.push('Platinum Tactician');
    }
    if (profile.wins >= 5) {
      titlesUnlocked.push('Unbroken Sovereign');
      achievementsUnlocked.push('Veteran of the Arena');
    }

    return {
      wins: profile.wins,
      losses: profile.losses,
      ties: profile.ties,
      activeCount,
      pendingIncomingCount,
      titlesUnlocked,
      achievementsUnlocked,
    };
  };

  const buildH2HRecords = (
    ledger: RivalsLedgerFile,
    userId: string
  ): CompetitiveH2HRecord[] => {
    const map = new Map<string, CompetitiveH2HRecord>();
    const completed = ledger.matches.filter(
      m => m.status === 'completed' && (m.challengerId === userId || m.opponentId === userId)
    );

    for (const m of completed) {
      const opponentId = m.challengerId === userId ? m.opponentId : m.challengerId;
      const fallbackName = m.challengerId === userId ? m.opponentName : m.challengerName;
      const opProf = ledger.profiles[opponentId];
      let row = map.get(opponentId);
      if (!row) {
        row = {
          opponentId,
          opponentName: opProf?.username || fallbackName,
          opponentRating: opProf?.rating || 1200,
          opponentTier: opProf?.tier || 'Silver',
          wins: 0,
          losses: 0,
          ties: 0,
          totalMatches: 0,
          lastPlayedAt: m.resolvedAt || m.endsAt,
        };
        map.set(opponentId, row);
      }
      row.totalMatches += 1;
      if (m.isTie) row.ties += 1;
      else if (m.winnerId === userId) row.wins += 1;
      else row.losses += 1;

      const resolvedTs = m.resolvedAt || m.endsAt;
      if (!row.lastPlayedAt || resolvedTs > row.lastPlayedAt) {
        row.lastPlayedAt = resolvedTs;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalMatches - a.totalMatches);
  };

  const buildLeaderboard = (
    ledger: RivalsLedgerFile,
    viewerId: string,
    optsFilter?: {
      scope?: string;
      mode?: string;
      division?: string;
      friendIds?: Set<string>;
    }
  ): CompetitiveLeaderboardEntry[] => {
    const scope = optsFilter?.scope || 'global';
    const modeFilter = optsFilter?.mode && optsFilter.mode !== 'all' ? optsFilter.mode : null;
    const divisionFilter =
      optsFilter?.division && optsFilter.division !== 'all' ? optsFilter.division : null;
    const friendIds = optsFilter?.friendIds;

    let candidates = Object.values(ledger.profiles).filter(
      p => !isPairBlocked(ledger, viewerId, p.userId)
    );
    if (scope === 'friends' && friendIds) {
      candidates = candidates.filter(p => p.userId === viewerId || friendIds.has(p.userId));
    }
    if (divisionFilter) {
      candidates = candidates.filter(p => computeRankedDivision(p.rating) === divisionFilter);
    }

    const weeklyCutoff = Date.now() - 7 * 86400000;
    const scoreByUser = new Map<string, { wins: number; losses: number; ties: number }>();
    if (modeFilter || scope === 'weekly') {
      for (const m of ledger.matches) {
        if (m.status !== 'completed') continue;
        if (modeFilter && m.duelExercise !== modeFilter && m.mode !== modeFilter) continue;
        if (scope === 'weekly' && Date.parse(m.resolvedAt || m.endsAt) < weeklyCutoff) continue;

        for (const uid of [m.challengerId, m.opponentId]) {
          const cur = scoreByUser.get(uid) || { wins: 0, losses: 0, ties: 0 };
          if (m.isTie) cur.ties += 1;
          else if (m.winnerId === uid) cur.wins += 1;
          else cur.losses += 1;
          scoreByUser.set(uid, cur);
        }
      }
    }

    const sorted = [...candidates].sort((a, b) => {
      if (scope === 'seasonal') {
        if (b.seasonalRating !== a.seasonalRating) return b.seasonalRating - a.seasonalRating;
      }
      if (modeFilter || scope === 'weekly') {
        const aW = scoreByUser.get(a.userId)?.wins || 0;
        const bW = scoreByUser.get(b.userId)?.wins || 0;
        if (bW !== aW) return bW - aW;
      }
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.wins - a.wins;
    });

    return sorted.slice(0, 50).map((p, idx) => {
      const scopedStats = scoreByUser.get(p.userId);
      const wins = modeFilter || scope === 'weekly' ? scopedStats?.wins || 0 : p.wins;
      const losses = modeFilter || scope === 'weekly' ? scopedStats?.losses || 0 : p.losses;
      const ties = modeFilter || scope === 'weekly' ? scopedStats?.ties || 0 : p.ties;
      const total = wins + losses + ties;
      return {
        rank: idx + 1,
        userId: p.userId,
        username: p.username,
        characterClass: p.characterClass,
        rating: scope === 'seasonal' ? p.seasonalRating : p.rating,
        seasonalRating: p.seasonalRating,
        tier: p.tier,
        wins,
        losses,
        ties,
        winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
        currentStreak: p.currentStreak,
        peakRating: p.peakRating,
        presenceStatus: opts?.getPresenceStatus
          ? opts.getPresenceStatus(p.userId, viewerId)
          : undefined,
        isCurrent: p.userId === viewerId,
      };
    });
  };

  const buildSpectatorMatchView = (
    ledger: RivalsLedgerFile,
    m: CompetitiveRivalMatch
  ): SpectatorLiveMatchSummary => {
    const chProf = ledger.profiles[m.challengerId];
    const opProf = ledger.profiles[m.opponentId];
    const cheersForMatch = ledger.spectatorCheers.filter(c => c.matchId === m.id);
    const cheerCounts: Record<string, number> = {
      [m.challengerId]: 0,
      [m.opponentId]: 0,
    };
    for (const c of cheersForMatch) {
      cheerCounts[c.targetUserId] = (cheerCounts[c.targetUserId] || 0) + 1;
    }

    return {
      matchId: m.id,
      challengeTitle: m.challengeTitle,
      mode: m.mode,
      isRanked: m.isRanked,
      visibility: m.visibility,
      status: m.status,
      challengerId: m.challengerId,
      challengerName: m.challengerName,
      challengerRating: chProf?.rating || m.challengerRatingSnapshot || 1200,
      challengerDivision: computeRankedDivision(chProf?.rating || m.challengerRatingSnapshot || 1200),
      challengerScore: m.challengerScore,
      challengerLoadoutSummary: opts?.getCompetitorLoadoutSummary
        ? opts.getCompetitorLoadoutSummary(m.challengerId)
        : chProf?.characterClass || 'Warrior',
      opponentId: m.opponentId,
      opponentName: m.opponentName,
      opponentRating: opProf?.rating || m.opponentRatingSnapshot || 1200,
      opponentDivision: computeRankedDivision(opProf?.rating || m.opponentRatingSnapshot || 1200),
      opponentScore: m.opponentScore,
      opponentLoadoutSummary: opts?.getCompetitorLoadoutSummary
        ? opts.getCompetitorLoadoutSummary(m.opponentId)
        : opProf?.characterClass || 'Warrior',
      targetScore: m.durationSeconds,
      endsAt: m.endsAt,
      cheerCounts,
      recentCheers: cheersForMatch.slice(0, 12).map(c => ({
        id: c.id,
        spectatorName: c.spectatorName,
        targetUserId: c.targetUserId,
        emoji: c.emoji,
        createdAt: c.createdAt,
      })),
    };
  };

  const canSpectateMatch = (
    ledger: RivalsLedgerFile,
    m: CompetitiveRivalMatch,
    viewerId: string | null
  ): boolean => {
    if (m.status !== 'active' && m.status !== 'accepted') return false;
    if (viewerId) {
      if (isPairBlocked(ledger, viewerId, m.challengerId) || isPairBlocked(ledger, viewerId, m.opponentId)) {
        return false;
      }
      if (m.challengerId === viewerId || m.opponentId === viewerId) return true;
    }
    if (m.visibility === 'public') return true;
    if (m.visibility === 'friends' && viewerId && opts?.isFriendsWith) {
      return (
        opts.isFriendsWith(viewerId, m.challengerId) ||
        opts.isFriendsWith(viewerId, m.opponentId)
      );
    }
    return false;
  };

  const notifyCompleted = async (resolved: CompetitiveRivalMatch[]) => {
    if (resolved.length === 0) return;
    await Promise.all(
      resolved.map(async m => {
        broadcastMatchEvent('rivals:match_settled', m);
        if (opts?.onRivalryCompleted) {
          await Promise.resolve(opts.onRivalryCompleted(matchToLegacyRecord(m))).catch(() => {});
        }
        if (
          opts?.onFriendDuelSettled &&
          opts?.isFriendsWith &&
          opts.isFriendsWith(m.challengerId, m.opponentId)
        ) {
          await Promise.resolve(
            opts.onFriendDuelSettled({
              challengerId: m.challengerId,
              opponentId: m.opponentId,
              matchId: m.id,
              challengeTitle: m.challengeTitle,
            })
          ).catch(() => {});
        }
      })
    );
  };

  // Real-time duel timer monitor: settles expired active duels promptly on the server
  const settlementInterval = setInterval(() => {
    void (async () => {
      const resolved = await withLock(() => {
        const ledger = readLedger();
        const hasPendingOrLive = ledger.matches.some(
          m => m.status === 'active' || m.status === 'accepted' || m.status === 'pending'
        );
        if (!hasPendingOrLive) return [] as CompetitiveRivalMatch[];
        return resolveExpiredMatches(ledger);
      });
      if (resolved.length > 0) {
        await notifyCompleted(resolved);
      }
    })().catch(() => {});
  }, 1500);
  if (typeof settlementInterval.unref === 'function') {
    settlementInterval.unref();
  }

  /**
   * Preserved interface for ecosystemDispatcher.ts.
   * Option A strictly forbids passive habit/background logs from scoring inside live 1v1 PvP duels.
   */
  const applyVerifiedRivalScore = async (_params: {
    userId: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    timezone?: string;
  }): Promise<RivalScoreUpdateResult> => {
    return {
      updatedCount: 0,
      pointsAwardedTotal: 0,
      resolvedRivalries: [],
      resolvedMatches: [],
    };
  };

  const getStateForUser = async (
    userId: string,
    userMeta?: { username?: string; characterClass?: CharacterClass; level?: number }
  ) => {
    const { state, resolved } = await withLock(() => {
      const ledger = readLedger();
      const resolvedList = resolveExpiredMatches(ledger);
      const profile = ensureProfile(ledger, userId, userMeta);
      writeLedger(ledger);

      const myMatches = ledger.matches
        .filter(m => m.challengerId === userId || m.opponentId === userId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      const myMatchIds = new Set(myMatches.map(m => m.id));
      const events = ledger.scores.filter(s => myMatchIds.has(s.rivalryId)).slice(0, 50);
      const myNotifications = ledger.notifications
        .filter(n => n.userId === userId)
        .slice(0, 20);
      const blockedIds = ledger.blocks
        .filter(b => b.blockerId === userId)
        .map(b => b.blockedId);

      const activeQueueEntry =
        ledger.queue.find(q => q.userId === userId && q.status === 'searching') || null;

      const candidates = Object.values(ledger.profiles)
        .filter(
          p =>
            p.userId !== userId &&
            p.allowNonFriendChallenges !== false &&
            !isPairBlocked(ledger, userId, p.userId)
        )
        .map(p => ({
          ...p,
          presenceStatus: opts?.getPresenceStatus
            ? opts.getPresenceStatus(p.userId, userId)
            : undefined,
        }))
        .sort((a, b) => Math.abs(a.rating - profile.rating) - Math.abs(b.rating - profile.rating));

      const legacyRivalries = myMatches.map(matchToLegacyRecord);
      const summary = buildStatsForUser(userId, profile, myMatches);

      return {
        resolved: resolvedList,
        state: {
          serverNow: new Date().toISOString(),
          profile,
          queueEntry: activeQueueEntry,
          matches: myMatches,
          events,
          h2hRecords: buildH2HRecords(ledger, userId),
          leaderboard: buildLeaderboard(ledger, userId, { scope: 'global' }),
          candidates,
          rivalries: legacyRivalries,
          recentScores: events,
          stats: summary,
          summary,
          notifications: myNotifications,
          blockedIds,
          claimedDivisionRewards: ledger.claimedDivisionRewards[userId] || [],
          followedCompetitorIds: ledger.followedCompetitors[userId] || [],
        },
      };
    });

    await notifyCompleted(resolved);
    return state;
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/rivals/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const queryUid = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      if (queryUid && queryUid !== userId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: cannot inspect another player’s private rivalries.',
        });
        return;
      }

      const username = typeof req.query.username === 'string' ? req.query.username : undefined;
      const characterClass =
        typeof req.query.characterClass === 'string'
          ? (req.query.characterClass as CharacterClass)
          : undefined;
      const level = req.query.level ? Number(req.query.level) : undefined;

      const state = await getStateForUser(userId, { username, characterClass, level });
      res.json({ success: true, ...state });
    });

    app.get('/api/rivals/leaderboard', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const scope = typeof req.query.scope === 'string' ? req.query.scope : 'global';
      const mode = typeof req.query.mode === 'string' ? req.query.mode : 'all';
      const division = typeof req.query.division === 'string' ? req.query.division : 'all';
      const friendIdsParam =
        typeof req.query.friendIds === 'string'
          ? req.query.friendIds.split(',').map(s => s.trim()).filter(Boolean)
          : [];

      const entries = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        return buildLeaderboard(ledger, userId, {
          scope,
          mode,
          division,
          friendIds: new Set(friendIdsParam),
        });
      });

      res.json({ success: true, scope, mode, division, leaderboard: entries });
    });

    app.post('/api/rivals/claim-division-reward', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const divisionName = String(req.body?.division || '').trim() as RankedDivisionName;
      const divDef = RANKED_DIVISIONS_CATALOG.find(d => d.division === divisionName);
      if (!divDef) {
        res.status(404).json({ success: false, error: 'Ranked division not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const prof = ensureProfile(ledger, auth.userId!);
        const highestRating = Math.max(prof.rating, prof.peakRating);
        if (highestRating < divDef.minRating) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires ${divDef.minRating}+ Rivals rating to claim ${divDef.division} rewards.`,
            },
          };
        }

        const claimed = ledger.claimedDivisionRewards[auth.userId!] || [];
        if (claimed.includes(divDef.division)) {
          return {
            status: 409,
            payload: {
              success: false,
              error: `${divDef.division} Division seasonal reward has already been claimed.`,
            },
          };
        }

        claimed.push(divDef.division);
        ledger.claimedDivisionRewards[auth.userId!] = claimed;
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            division: divDef.division,
            rewardTitleName: divDef.rewardTitleName,
            claimedDivisionRewards: claimed,
          },
        };
      });

      if (outcome.status === 200) {
        if (opts?.onGrantTitle && divDef.rewardTitleId) {
          await opts.onGrantTitle({
            userId: auth.userId,
            titleId: divDef.rewardTitleId,
            sourceRef: `ranked_division:${divDef.division}`,
          });
        }
        if (opts?.onUnlockCosmetic && divDef.rewardFrameId) {
          await opts.onUnlockCosmetic({
            userId: auth.userId,
            cosmeticId: divDef.rewardFrameId,
            sourceRef: `ranked_division:${divDef.division}`,
          });
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });

    // FIND A RIVAL — Option A Elo Matchmaking (Auto-selects ONE verified exercise, 3-min default / 5-min max)
    app.post('/api/rivals/queue/join', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const body = req.body && typeof req.body === 'object' ? req.body : {};

      const requestedDur = Number(body.durationSeconds || DEFAULT_DUEL_DURATION_SECONDS);
      const durationSeconds = Math.min(
        MAX_DUEL_DURATION_SECONDS,
        Math.max(MIN_DUEL_DURATION_SECONDS, Math.round(requestedDur || DEFAULT_DUEL_DURATION_SECONDS))
      );

      const username = String(body.username || 'Champion').trim().slice(0, 48);
      const characterClass = body.characterClass as CharacterClass | undefined;
      const level = typeof body.level === 'number' ? body.level : undefined;

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const resolved = resolveExpiredMatches(ledger);
        const myProf = ensureProfile(ledger, userId, { username, characterClass, level });

        // Cancel existing queue search for this user cleanly
        for (const q of ledger.queue) {
          if (q.userId === userId && q.status === 'searching') {
            q.status = 'cancelled';
          }
        }

        const liveMatch = ledger.matches.find(
          m =>
            (m.status === 'active' || m.status === 'accepted') &&
            (m.challengerId === userId || m.opponentId === userId)
        );
        if (liveMatch) {
          return {
            status: 409,
            resolved,
            payload: {
              success: false,
              error: `You already have an active ${liveMatch.exerciseName} duel with ${
                liveMatch.challengerId === userId ? liveMatch.opponentName : liveMatch.challengerName
              }. Finish or concede it before searching again.`,
            },
          };
        }

        const nowMs = Date.now();
        const waiting = ledger.queue.filter(q => {
          if (q.status !== 'searching') return false;
          if (q.userId === userId) return false;
          if (isPairBlocked(ledger, userId, q.userId)) return false;

          const alreadyBusy = ledger.matches.some(
            m =>
              (m.status === 'active' || m.status === 'accepted') &&
              (m.challengerId === q.userId || m.opponentId === q.userId)
          );
          if (alreadyBusy) return false;

          const waitSec = Math.max(0, (nowMs - Date.parse(q.createdAt)) / 1000);
          const expandedHalfWindow = 150 + Math.floor(waitSec / 10) * 75;
          return Math.abs(myProf.rating - q.ratingSnapshot) <= expandedHalfWindow;
        });

        const fiveMinAgo = nowMs - 300_000;
        const recentOpponents = new Set(
          ledger.matches
            .filter(
              m =>
                m.status === 'completed' &&
                m.resolvedAt &&
                Date.parse(m.resolvedAt) >= fiveMinAgo &&
                (m.challengerId === userId || m.opponentId === userId)
            )
            .map(m => (m.challengerId === userId ? m.opponentId : m.challengerId))
        );

        waiting.sort((a, b) => {
          const aRecent = recentOpponents.has(a.userId) ? 1 : 0;
          const bRecent = recentOpponents.has(b.userId) ? 1 : 0;
          if (aRecent !== bRecent) return aRecent - bRecent;
          return (
            Math.abs(a.ratingSnapshot - myProf.rating) -
            Math.abs(b.ratingSnapshot - myProf.rating)
          );
        });

        const matchedQueueItem = waiting[0];
        if (matchedQueueItem) {
          const opProf = ensureProfile(ledger, matchedQueueItem.userId);
          const lastDuel = ledger.matches.find(
            m =>
              m.status === 'completed' &&
              ((m.challengerId === userId && m.opponentId === opProf.userId) ||
                (m.challengerId === opProf.userId && m.opponentId === userId))
          );

          // Server automatically selects ONE verified exercise for both players
          const duelExercise = pickAutoDuelExercise(lastDuel?.duelExercise || null);
          const exDef = DUEL_EXERCISES_CATALOG[duelExercise];

          const newMatch: CompetitiveRivalMatch = {
            id: `riv-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
            challengerId: matchedQueueItem.userId,
            challengerName: opProf.username,
            challengerRatingSnapshot: opProf.rating,
            challengerTierSnapshot: opProf.tier,
            opponentId: userId,
            opponentName: myProf.username,
            opponentRatingSnapshot: myProf.rating,
            opponentTierSnapshot: myProf.tier,
            mode: duelExercise,
            duelExercise,
            exerciseName: exDef.name,
            pointsPerRep: exDef.pointsPerRep,
            durationSeconds,
            challengeType: 'weekly_activity_score',
            challengeTitle: `${exDef.name} 1v1 Duel`,
            rules: {
              exerciseId: duelExercise,
              pointsPerRep: exDef.pointsPerRep,
              durationSeconds,
              ranked: true,
            },
            visibility: 'public',
            status: 'accepted',
            isRanked: true,
            challengerScore: 0,
            opponentScore: 0,
            challengerReps: 0,
            opponentReps: 0,
            challengerReady: false,
            opponentReady: false,
            challengerCameraReady: false,
            opponentCameraReady: false,
            countdownEndsAt: null,
            forfeitByUserId: null,
            winnerId: null,
            isTie: false,
            rematchOfMatchId: null,
            disputeReason: null,
            startsAt: new Date(nowMs).toISOString(),
            endsAt: new Date(nowMs + READY_STAGE_TIMEOUT_MS).toISOString(),
            createdAt: new Date(nowMs).toISOString(),
            resolvedAt: null,
          };

          matchedQueueItem.status = 'matched';
          matchedQueueItem.matchedMatchId = newMatch.id;
          ledger.matches.unshift(newMatch);

          pushNotif(
            ledger,
            opProf.userId,
            'rivalry_matched',
            'Rival Found!',
            `Matched with ${myProf.username} (${myProf.rating} ${myProf.tier}) for a ${exDef.name} duel!`,
            newMatch.id
          );
          pushNotif(
            ledger,
            userId,
            'rivalry_matched',
            'Rival Found!',
            `Matched with ${opProf.username} (${opProf.rating} ${opProf.tier}) for a ${exDef.name} duel!`,
            newMatch.id
          );

          writeLedger(ledger);
          return {
            status: 201,
            resolved,
            matchedMatch: newMatch,
            payload: {
              success: true,
              matched: true,
              match: newMatch,
              queueEntry: null,
            },
          };
        }

        const queueEntry: MatchmakingQueueEntry = {
          id: `rq-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
          userId,
          mode: 'squat', // queue matches across unified Option A single-exercise pool
          ratingSnapshot: myProf.rating,
          minRating: Math.max(100, myProf.rating - 150),
          maxRating: Math.min(4000, myProf.rating + 150),
          status: 'searching',
          matchedMatchId: null,
          createdAt: new Date(nowMs).toISOString(),
          expiresAt: new Date(nowMs + 30 * 60_000).toISOString(),
        };
        ledger.queue.unshift(queueEntry);
        writeLedger(ledger);

        return {
          status: 200,
          resolved,
          matchedMatch: null,
          payload: {
            success: true,
            matched: false,
            queueEntry,
          },
        };
      });

      await notifyCompleted(outcome.resolved);
      if (outcome.matchedMatch) {
        broadcastMatchEvent('rivals:match_found', outcome.matchedMatch);
      }

      const state = await getStateForUser(userId, { username, characterClass, level });
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    app.post('/api/rivals/queue/cancel', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      await withLock(() => {
        const ledger = readLedger();
        for (const q of ledger.queue) {
          if (q.userId === auth.userId && q.status === 'searching') {
            q.status = 'cancelled';
          }
        }
        writeLedger(ledger);
      });

      const state = await getStateForUser(auth.userId);
      res.json({ success: true, ...state });
    });

    // Direct Friend / Arena Challenge (Strict Option A: auto-selected 1 exercise, 3m default, max 5m)
    const handleDirectChallenge = async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const opponentId = String(body.opponentId || '').trim();
      const opponentName = String(body.opponentName || 'Companion').trim().slice(0, 48);
      const challengerName = String(body.challengerName || 'Champion').trim().slice(0, 48);
      const areFriends = body.isFriend !== false;

      if (!opponentId) {
        res.status(400).json({ success: false, error: 'Opponent ID is required.' });
        return;
      }
      if (opponentId === userId) {
        res.status(400).json({ success: false, error: 'You cannot challenge yourself.' });
        return;
      }

      const rawRules = body.rules && typeof body.rules === 'object' ? body.rules : {};
      const requestedDuration = Number(
        rawRules.durationSeconds || body.durationSeconds || DEFAULT_DUEL_DURATION_SECONDS
      );
      const durationSeconds = Math.min(
        MAX_DUEL_DURATION_SECONDS,
        Math.max(MIN_DUEL_DURATION_SECONDS, Math.round(requestedDuration || DEFAULT_DUEL_DURATION_SECONDS))
      );
      const ranked = typeof rawRules.ranked === 'boolean' ? rawRules.ranked : true;

      const visibility: CompetitiveMatchVisibility = VALID_VISIBILITIES.has(body.visibility)
        ? body.visibility
        : areFriends
        ? 'friends'
        : 'public';

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);

        if (isPairBlocked(ledger, userId, opponentId)) {
          return {
            status: 403,
            payload: { success: false, error: 'Cannot challenge a blocked player.' },
          };
        }

        const myProf = ensureProfile(ledger, userId, { username: challengerName });
        const opProf = ensureProfile(ledger, opponentId, { username: opponentName });

        if (!areFriends && opProf.allowNonFriendChallenges === false) {
          return {
            status: 403,
            payload: {
              success: false,
              error: `${opProf.username} currently restricts Rivals challenges to accepted friends.`,
            },
          };
        }

        const duplicate = ledger.matches.find(
          m =>
            (m.status === 'pending' || m.status === 'active' || m.status === 'accepted') &&
            ((m.challengerId === userId && m.opponentId === opponentId) ||
              (m.challengerId === opponentId && m.opponentId === userId))
        );
        if (duplicate) {
          return {
            status: 409,
            payload: {
              success: false,
              error: `An active or pending ${duplicate.exerciseName} duel already exists with this opponent.`,
            },
          };
        }

        const nowMs = Date.now();
        const duelExercise = pickAutoDuelExercise();
        const exDef = DUEL_EXERCISES_CATALOG[duelExercise];

        const match: CompetitiveRivalMatch = {
          id: `riv-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
          challengerId: userId,
          challengerName: myProf.username,
          challengerRatingSnapshot: myProf.rating,
          challengerTierSnapshot: myProf.tier,
          opponentId,
          opponentName: opProf.username,
          opponentRatingSnapshot: opProf.rating,
          opponentTierSnapshot: opProf.tier,
          mode: duelExercise,
          duelExercise,
          exerciseName: exDef.name,
          pointsPerRep: exDef.pointsPerRep,
          durationSeconds,
          challengeType: 'weekly_activity_score',
          challengeTitle: `${exDef.name} 1v1 Duel`,
          rules: {
            exerciseId: duelExercise,
            pointsPerRep: exDef.pointsPerRep,
            durationSeconds,
            ranked,
          },
          visibility,
          status: 'pending',
          isRanked: ranked,
          challengerScore: 0,
          opponentScore: 0,
          challengerReps: 0,
          opponentReps: 0,
          challengerReady: false,
          opponentReady: false,
          challengerCameraReady: false,
          opponentCameraReady: false,
          countdownEndsAt: null,
          forfeitByUserId: null,
          winnerId: null,
          isTie: false,
          rematchOfMatchId:
            typeof body.rematchOfMatchId === 'string' ? body.rematchOfMatchId : null,
          disputeReason: null,
          startsAt: new Date(nowMs).toISOString(),
          endsAt: new Date(nowMs + 15 * 60_000).toISOString(), // 15m invite expiration
          createdAt: new Date(nowMs).toISOString(),
          resolvedAt: null,
        };

        ledger.matches.unshift(match);
        pushNotif(
          ledger,
          opponentId,
          'rivalry_invite',
          'New Live Exercise Duel Invite',
          `${myProf.username} (${myProf.rating} ${myProf.tier}) challenged you to a ${Math.round(durationSeconds / 60)}-min ${exDef.name} duel!`,
          match.id
        );
        writeLedger(ledger);
        return {
          status: 201,
          createdMatch: match,
          payload: {
            success: true,
            match,
            rivalry: matchToLegacyRecord(match),
          },
        };
      });

      if (outcome.createdMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.createdMatch);
      }

      const state = await getStateForUser(userId, { username: challengerName });
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    };

    app.post('/api/rivals/challenge', handleDirectChallenge);
    app.post('/api/rivals/invite', handleDirectChallenge);

    app.post('/api/rivals/respond', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const matchId = String(body.matchId || body.rivalryId || '').trim();
      const decision = String(body.decision || '').trim();

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (m.opponentId !== userId) {
          return {
            status: 403,
            payload: { success: false, error: 'Only the challenged player can accept or decline.' },
          };
        }
        if (m.status !== 'pending') {
          return {
            status: 400,
            payload: { success: false, error: `Cannot respond to match in ${m.status} status.` },
          };
        }
        if (isPairBlocked(ledger, m.challengerId, m.opponentId)) {
          m.status = 'cancelled';
          m.resolvedAt = new Date().toISOString();
          writeLedger(ledger);
          return {
            status: 403,
            payload: { success: false, error: 'Blocked players cannot accept matches.' },
          };
        }

        if (decision === 'accept') {
          const now = Date.now();
          m.status = 'accepted';
          m.challengerReady = false;
          m.opponentReady = false;
          m.startsAt = new Date(now).toISOString();
          m.endsAt = new Date(now + READY_STAGE_TIMEOUT_MS).toISOString();
          pushNotif(
            ledger,
            m.challengerId,
            'rivalry_accepted',
            'Duel Accepted — Step Into Frame!',
            `${m.opponentName} accepted your ${m.exerciseName} duel. Ready up with camera calibration!`,
            m.id
          );
        } else if (decision === 'decline') {
          m.status = 'cancelled';
          m.resolvedAt = new Date().toISOString();
          pushNotif(
            ledger,
            m.challengerId,
            'rivalry_declined',
            'Rivals Challenge Declined',
            `${m.opponentName} declined your ${m.exerciseName} duel invitation.`,
            m.id
          );
        } else {
          return {
            status: 400,
            payload: { success: false, error: 'Decision must be accept or decline.' },
          };
        }

        writeLedger(ledger);
        return {
          status: 200,
          updatedMatch: m,
          payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
        };
      });

      if (outcome.updatedMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.updatedMatch);
      }

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    // Stage 2 -> Stage 3: Ready up & launch synchronized 5s countdown + 3m..5m duel clock
    app.post('/api/rivals/duel/ready', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const matchId = String(body.matchId || '').trim();
      const ready = body.ready !== false;
      const cameraReady = Boolean(body.cameraReady);

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Duel not found.' } };
        if (m.challengerId !== userId && m.opponentId !== userId) {
          return { status: 403, payload: { success: false, error: 'Forbidden.' } };
        }
        if (m.status !== 'accepted' && m.status !== 'active') {
          return { status: 400, payload: { success: false, error: `Duel is ${m.status}.` } };
        }
        if (ready && !cameraReady) {
          return {
            status: 400,
            payload: {
              success: false,
              error: 'Live Aether Vision camera tracking must be active before marking Ready.',
            },
          };
        }

        if (m.challengerId === userId) {
          m.challengerReady = ready;
          m.challengerCameraReady = cameraReady;
        } else {
          m.opponentReady = ready;
          m.opponentCameraReady = cameraReady;
        }

        let launchedNow = false;
        if (m.status === 'accepted' && m.challengerReady && m.opponentReady) {
          const nowMs = Date.now();
          const durMs = Math.min(
            MAX_DUEL_DURATION_SECONDS,
            Math.max(MIN_DUEL_DURATION_SECONDS, m.durationSeconds || DEFAULT_DUEL_DURATION_SECONDS)
          ) * 1000;
          const startMs = nowMs + COUNTDOWN_MS;
          m.status = 'active';
          m.countdownEndsAt = new Date(startMs).toISOString();
          m.startsAt = new Date(startMs).toISOString();
          m.endsAt = new Date(startMs + durMs).toISOString();
          launchedNow = true;
        }

        writeLedger(ledger);
        return {
          status: 200,
          updatedMatch: m,
          launchedNow,
          payload: { success: true, match: m, launchedNow },
        };
      });

      if (outcome.updatedMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.updatedMatch);
      }

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    // Stage 3: Server-Authoritative Live Rep Verification Endpoint
    app.post('/api/rivals/duel/rep', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const body = req.body && typeof req.body === 'object' ? req.body : {};

      // Strictly reject untrusted score/point overrides from client
      if (
        'points' in body ||
        'score' in body ||
        'pointsAwarded' in body ||
        'challengerScore' in body ||
        'opponentScore' in body ||
        'winnerId' in body
      ) {
        res.status(400).json({
          success: false,
          error: 'Untrusted score or point overrides are strictly rejected.',
        });
        return;
      }

      const matchId = String(body.matchId || '').trim();
      const eventId = String(body.eventId || '').trim();
      const exercise = String(body.exercise || '').trim() as DuelExerciseId;
      const repSeq = Number(body.repSeq || 0);
      const peakAngleDeg = Number(body.peakAngleDeg);
      const resetAngleDeg = Number(body.resetAngleDeg);
      const durationMs = Number(body.durationMs || 0);
      const confidence = Number(body.confidence || 0);
      const landmarksVisible = Boolean(body.landmarksVisible);
      const cameraStable = Boolean(body.cameraStable);

      if (!matchId || eventId.length < 4 || !VALID_DUEL_EXERCISES.has(exercise)) {
        res.status(400).json({ success: false, error: 'Invalid repetition verification payload.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const resolved = resolveExpiredMatches(ledger);
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) {
          return { status: 404, resolved, payload: { success: false, error: 'Duel not found.' } };
        }
        if (m.challengerId !== userId && m.opponentId !== userId) {
          return { status: 403, resolved, payload: { success: false, error: 'Forbidden.' } };
        }
        if (m.status !== 'active') {
          return {
            status: 409,
            resolved,
            payload: { success: false, error: `Duel is ${m.status}; repetitions cannot be recorded.` },
          };
        }
        if (exercise !== m.duelExercise) {
          return {
            status: 400,
            resolved,
            payload: {
              success: false,
              error: `Exercise mismatch: this duel requires ${m.exerciseName}.`,
            },
          };
        }

        const nowMs = Date.now();
        const startMs = Date.parse(m.startsAt);
        const endMs = Date.parse(m.endsAt);
        if (nowMs < startMs - 500) {
          return {
            status: 400,
            resolved,
            payload: { success: false, error: 'Wait for the countdown to reach GO before scoring reps.' },
          };
        }
        if (nowMs > endMs + 1500) {
          return {
            status: 409,
            resolved,
            payload: { success: false, error: 'Duel timer has already expired.' },
          };
        }

        // Duplicate / replay protection
        const dup = ledger.scores.find(
          s => s.rivalryId === m.id && s.userId === userId && s.idempotencyKey === eventId
        );
        if (dup) {
          return {
            status: 200,
            resolved,
            duplicate: true,
            updatedMatch: m,
            payload: { success: true, duplicate: true, match: m },
          };
        }

        const isChallenger = m.challengerId === userId;
        const currentReps = isChallenger ? m.challengerReps : m.opponentReps;
        if (!Number.isInteger(repSeq) || repSeq <= currentReps) {
          return {
            status: 409,
            resolved,
            payload: { success: false, error: 'Out-of-order or replayed repetition sequence.' },
          };
        }

        const repTsKey = `${m.id}:${userId}`;
        if (!ledger.lastRepTimestamps) ledger.lastRepTimestamps = {};
        const lastServerRepMs = Number(ledger.lastRepTimestamps[repTsKey] || 0);
        const msSinceLastRep = lastServerRepMs > 0 ? nowMs - lastServerRepMs : 10_000;
        const elapsedSeconds = Math.max(1, (nowMs - startMs) / 1000);

        const check = validateServerDuelRep({
          exerciseId: m.duelExercise,
          peakAngleDeg,
          resetAngleDeg,
          durationMs,
          confidence,
          landmarksVisible,
          cameraStable,
          msSinceLastRep,
          elapsedSeconds,
          currentRepCount: currentReps,
        });

        if (!check.valid) {
          return {
            status: 422,
            resolved,
            payload: { success: false, error: check.reason || 'Repetition failed biomechanical validation.' },
          };
        }

        const pointsEarned = DUEL_EXERCISES_CATALOG[m.duelExercise].pointsPerRep;
        ledger.lastRepTimestamps[repTsKey] = nowMs;

        if (isChallenger) {
          m.challengerReps += 1;
          m.challengerScore += pointsEarned;
        } else {
          m.opponentReps += 1;
          m.opponentScore += pointsEarned;
        }

        const scoreEntry: RivalryScoreEntry = {
          id: `rs-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
          rivalryId: m.id,
          userId,
          idempotencyKey: eventId,
          activityType: 'strength_workout',
          exercise: m.duelExercise,
          repSeq: isChallenger ? m.challengerReps : m.opponentReps,
          confidence: Math.round(confidence),
          label: `${m.exerciseName} Rep #${isChallenger ? m.challengerReps : m.opponentReps}`,
          pointsAwarded: pointsEarned,
          safetyCapped: false,
          createdAt: new Date(nowMs).toISOString(),
        };
        ledger.scores.unshift(scoreEntry);

        writeLedger(ledger);
        return {
          status: 200,
          resolved,
          updatedMatch: m,
          scoreEntry,
          payload: {
            success: true,
            pointsAwarded: pointsEarned,
            match: m,
            scoreEntry,
          },
        };
      });

      await notifyCompleted(outcome.resolved);
      if (outcome.updatedMatch && !outcome.duplicate) {
        broadcastMatchEvent('rivals:match_updated', outcome.updatedMatch, {
          lastScoreEntry: outcome.scoreEntry,
        });
      }

      res.status(outcome.status).json({
        serverNow: new Date().toISOString(),
        ...outcome.payload,
      });
    });

    app.post('/api/rivals/cancel', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;

      const matchId = String(req.body?.matchId || req.body?.rivalryId || '').trim();
      const outcome = await withLock(() => {
        const ledger = readLedger();
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (m.challengerId !== userId) {
          return {
            status: 403,
            payload: {
              success: false,
              error: 'Only the challenger can cancel a pending invitation.',
            },
          };
        }
        if (m.status !== 'pending') {
          return {
            status: 400,
            payload: { success: false, error: 'Only pending invitations can be cancelled.' },
          };
        }
        m.status = 'cancelled';
        m.resolvedAt = new Date().toISOString();
        writeLedger(ledger);
        return {
          status: 200,
          updatedMatch: m,
          payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
        };
      });

      if (outcome.updatedMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.updatedMatch);
      }

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    const handleConcedeOrEnd = async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;

      const matchId = String(req.body?.matchId || req.body?.rivalryId || '').trim();
      const outcome = await withLock(() => {
        const ledger = readLedger();
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (m.challengerId !== userId && m.opponentId !== userId) {
          return { status: 403, payload: { success: false, error: 'Forbidden.' } };
        }
        if (m.status !== 'active' && m.status !== 'accepted') {
          return {
            status: 400,
            payload: { success: false, error: 'Only active or setup-stage duels can be stopped.' },
          };
        }

        const nowMs = Date.now();
        const hasActivity = m.challengerReps + m.opponentReps > 0;
        const otherId = m.challengerId === userId ? m.opponentId : m.challengerId;

        if (m.status === 'active' && hasActivity) {
          // Safe early stop mid-duel after reps started -> clean forfeit victory to opponent
          settleCompletedMatch(ledger, m, nowMs, { forfeitByUserId: userId });
          writeLedger(ledger);
          return {
            status: 200,
            settledMatch: m,
            payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
          };
        }

        // Stopped during camera calibration or 0-rep start -> cancel safely without Elo penalty
        m.status = 'cancelled';
        m.resolvedAt = new Date(nowMs).toISOString();
        pushNotif(
          ledger,
          otherId,
          'rivalry_ended',
          'Duel Stopped Safely',
          `${m.challengerId === userId ? m.challengerName : m.opponentName} stepped out of the ${m.exerciseName} duel safely (no rating shift).`,
          m.id
        );
        writeLedger(ledger);
        return {
          status: 200,
          updatedMatch: m,
          payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
        };
      });

      if (outcome.settledMatch) {
        await notifyCompleted([outcome.settledMatch]);
      } else if (outcome.updatedMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.updatedMatch);
      }

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    };

    app.post('/api/rivals/end', handleConcedeOrEnd);
    app.post('/api/rivals/duel/concede', handleConcedeOrEnd);

    app.post('/api/rivals/rematch', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const sourceMatchId = String(req.body?.matchId || '').trim();
      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        const src = ledger.matches.find(m => m.id === sourceMatchId);
        if (!src) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (src.challengerId !== userId && src.opponentId !== userId) {
          return { status: 403, payload: { success: false, error: 'Forbidden.' } };
        }
        const opponentId = src.challengerId === userId ? src.opponentId : src.challengerId;
        if (isPairBlocked(ledger, userId, opponentId)) {
          return {
            status: 403,
            payload: { success: false, error: 'Cannot rematch a blocked player.' },
          };
        }
        const dup = ledger.matches.find(
          m =>
            (m.status === 'pending' || m.status === 'active' || m.status === 'accepted') &&
            ((m.challengerId === userId && m.opponentId === opponentId) ||
              (m.challengerId === opponentId && m.opponentId === userId))
        );
        if (dup) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'An active or pending duel already exists with this rival.',
            },
          };
        }

        const myProf = ensureProfile(ledger, userId);
        const opProf = ensureProfile(ledger, opponentId);
        const nowMs = Date.now();
        const duelExercise = pickAutoDuelExercise(src.duelExercise);
        const exDef = DUEL_EXERCISES_CATALOG[duelExercise];
        const durationSeconds = Math.min(
          MAX_DUEL_DURATION_SECONDS,
          Math.max(MIN_DUEL_DURATION_SECONDS, src.durationSeconds || DEFAULT_DUEL_DURATION_SECONDS)
        );

        const rematch: CompetitiveRivalMatch = {
          id: `riv-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
          challengerId: userId,
          challengerName: myProf.username,
          challengerRatingSnapshot: myProf.rating,
          challengerTierSnapshot: myProf.tier,
          opponentId,
          opponentName: opProf.username,
          opponentRatingSnapshot: opProf.rating,
          opponentTierSnapshot: opProf.tier,
          mode: duelExercise,
          duelExercise,
          exerciseName: exDef.name,
          pointsPerRep: exDef.pointsPerRep,
          durationSeconds,
          challengeType: 'weekly_activity_score',
          challengeTitle: `${exDef.name} 1v1 Duel`,
          rules: {
            exerciseId: duelExercise,
            pointsPerRep: exDef.pointsPerRep,
            durationSeconds,
            ranked: src.isRanked,
          },
          visibility: src.visibility,
          status: 'pending',
          isRanked: src.isRanked,
          challengerScore: 0,
          opponentScore: 0,
          challengerReps: 0,
          opponentReps: 0,
          challengerReady: false,
          opponentReady: false,
          challengerCameraReady: false,
          opponentCameraReady: false,
          countdownEndsAt: null,
          forfeitByUserId: null,
          winnerId: null,
          isTie: false,
          rematchOfMatchId: src.id,
          disputeReason: null,
          startsAt: new Date(nowMs).toISOString(),
          endsAt: new Date(nowMs + 15 * 60_000).toISOString(),
          createdAt: new Date(nowMs).toISOString(),
          resolvedAt: null,
        };
        ledger.matches.unshift(rematch);
        pushNotif(
          ledger,
          opponentId,
          'rivalry_rematch',
          'Rematch Challenge Received',
          `${myProf.username} requested a ${exDef.name} rematch!`,
          rematch.id
        );
        writeLedger(ledger);
        return {
          status: 201,
          createdMatch: rematch,
          payload: { success: true, match: rematch, rivalry: matchToLegacyRecord(rematch) },
        };
      });

      if (outcome.createdMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.createdMatch);
      }

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    app.post('/api/rivals/dispute', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const matchId = String(req.body?.matchId || '').trim();
      const reason = String(req.body?.reason || '').trim().slice(0, 240);
      if (reason.length < 5) {
        res.status(400).json({
          success: false,
          error: 'Please provide a clear dispute reason (min 5 characters).',
        });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (m.challengerId !== userId && m.opponentId !== userId) {
          return { status: 403, payload: { success: false, error: 'Forbidden.' } };
        }
        if (m.status !== 'active' && m.status !== 'completed') {
          return {
            status: 400,
            payload: {
              success: false,
              error: 'Only active or recently completed matches can be disputed.',
            },
          };
        }

        if (
          m.status === 'completed' &&
          m.isRanked &&
          typeof m.challengerRatingDelta === 'number' &&
          typeof m.opponentRatingDelta === 'number'
        ) {
          const pCh = ensureProfile(ledger, m.challengerId);
          const pOp = ensureProfile(ledger, m.opponentId);
          pCh.rating = Math.max(100, pCh.rating - m.challengerRatingDelta);
          pCh.seasonalRating = Math.max(100, pCh.seasonalRating - m.challengerRatingDelta);
          pCh.tier = computeCompetitiveTier(pCh.rating);

          pOp.rating = Math.max(100, pOp.rating - m.opponentRatingDelta);
          pOp.seasonalRating = Math.max(100, pOp.seasonalRating - m.opponentRatingDelta);
          pOp.tier = computeCompetitiveTier(pOp.rating);

          m.challengerRatingAfter = pCh.rating;
          m.challengerRatingDelta = 0;
          m.opponentRatingAfter = pOp.rating;
          m.opponentRatingDelta = 0;
        }

        m.status = 'disputed';
        m.disputeReason = reason;
        m.resolvedAt = new Date().toISOString();
        const otherId = m.challengerId === userId ? m.opponentId : m.challengerId;
        pushNotif(
          ledger,
          otherId,
          'rivalry_disputed',
          'Match Placed Under Review',
          `${m.exerciseName} duel was flagged for fair-play review and rating adjustment was paused.`,
          m.id
        );
        writeLedger(ledger);
        return { status: 200, updatedMatch: m, payload: { success: true, match: m } };
      });

      if (outcome.updatedMatch) {
        broadcastMatchEvent('rivals:match_updated', outcome.updatedMatch);
      }

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    app.post('/api/rivals/privacy', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const allowNonFriendChallenges = Boolean(req.body?.allowNonFriendChallenges);
      await withLock(() => {
        const ledger = readLedger();
        const p = ensureProfile(ledger, auth.userId!);
        p.allowNonFriendChallenges = allowNonFriendChallenges;
        p.updatedAt = new Date().toISOString();
        writeLedger(ledger);
      });
      const state = await getStateForUser(auth.userId);
      res.json({ success: true, ...state });
    });

    app.post('/api/rivals/block', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;

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
          for (const m of ledger.matches) {
            if (
              (m.status === 'pending' || m.status === 'active' || m.status === 'accepted') &&
              ((m.challengerId === userId && m.opponentId === targetId) ||
                (m.challengerId === targetId && m.opponentId === userId))
            ) {
              m.status = 'cancelled';
              m.resolvedAt = new Date().toISOString();
            }
          }
        }
        writeLedger(ledger);
      });

      const state = await getStateForUser(userId);
      res.json({ success: true, ...state });
    });

    // --- COMMUNITY TOURNAMENTS (SINGLE-EXERCISE BRACKETS ONLY) ---
    app.get('/api/tournaments/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const tournaments = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        return ledger.tournaments;
      });
      res.json({ success: true, tournaments });
    });

    app.post('/api/tournaments/create', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const title = String(body.title || '').trim().slice(0, 64);
      const subtitle = String(body.subtitle || 'Single-Exercise Bracket').trim().slice(0, 96);
      const rawEx = String(body.mode || '') as DuelExerciseId;
      const mode: DuelExerciseId = VALID_DUEL_EXERCISES.has(rawEx)
        ? rawEx
        : pickAutoDuelExercise();
      const username = String(body.username || 'Champion').trim().slice(0, 48);

      if (title.length < 3) {
        res.status(400).json({ success: false, error: 'Tournament title must be at least 3 characters.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const prof = ensureProfile(ledger, auth.userId!, { username });
        const now = Date.now();
        const endsAt = new Date(now + 7 * 86400000).toISOString();
        const tournament: CommunityTournament = {
          id: `tourn-${now}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          subtitle,
          mode,
          status: 'upcoming',
          startsAt: new Date(now).toISOString(),
          endsAt,
          participants: [
            {
              userId: prof.userId,
              username: prof.username,
              rating: prof.rating,
              division: computeRankedDivision(prof.rating),
            },
          ],
          matches: [],
        };
        ledger.tournaments.unshift(tournament);
        writeLedger(ledger);
        return { tournament, tournaments: ledger.tournaments };
      });

      res.status(201).json({ success: true, ...result });
    });

    app.post('/api/tournaments/join', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const tournamentId = String(req.body?.tournamentId || '').trim();
      const username = String(req.body?.username || 'Champion').trim().slice(0, 48);

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        const t = ledger.tournaments.find(item => item.id === tournamentId);
        if (!t) {
          return { status: 404, payload: { success: false, error: 'Tournament not found.' } };
        }
        if (t.status === 'completed') {
          return {
            status: 400,
            payload: { success: false, error: 'This tournament has already concluded.' },
          };
        }
        if (t.participants.some(p => p.userId === auth.userId)) {
          return {
            status: 409,
            payload: { success: false, error: 'You are already registered in this tournament.' },
          };
        }
        if (t.participants.some(p => isPairBlocked(ledger, auth.userId!, p.userId))) {
          return {
            status: 403,
            payload: {
              success: false,
              error: 'Cannot join a bracket containing a blocked competitor.',
            },
          };
        }

        const prof = ensureProfile(ledger, auth.userId!, { username });
        t.participants.push({
          userId: prof.userId,
          username: prof.username,
          rating: prof.rating,
          division: computeRankedDivision(prof.rating),
        });
        if (t.participants.length >= 2) {
          t.status = 'active';
          t.matches = buildTournamentBracket(t.id, t.participants);
        }
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, tournament: t, tournaments: ledger.tournaments },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    // --- READ-ONLY SPECTATOR MODE ---
    app.get('/api/spectator/matches', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }

      const payload = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        const eligibleMatches = ledger.matches
          .filter(m => canSpectateMatch(ledger, m, auth.userId!))
          .slice(0, 25)
          .map(m => buildSpectatorMatchView(ledger, m));

        return {
          matches: eligibleMatches,
          followedCompetitorIds: ledger.followedCompetitors[auth.userId!] || [],
        };
      });

      res.json({ success: true, ...payload });
    });

    app.get('/api/spectator/watch/:matchId', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const matchId = String(req.params.matchId || '').trim();
      const outcome = await withLock(() => {
        const ledger = readLedger();
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (!canSpectateMatch(ledger, m, auth.userId!)) {
          return {
            status: 403,
            payload: {
              success: false,
              error: 'Match is private or unavailable to spectate.',
            },
          };
        }
        return {
          status: 200,
          payload: { success: true, match: buildSpectatorMatchView(ledger, m) },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/spectator/cheer', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('score' in body || 'points' in body || 'rating' in body) {
        res.status(403).json({
          success: false,
          error: 'Spectator recognition is read-only and cannot modify match scores.',
        });
        return;
      }

      const matchId = String(body.matchId || '').trim();
      const targetUserId = String(body.targetUserId || '').trim();
      const emoji = String(body.emoji || '👏').trim();
      const spectatorName = String(body.spectatorName || 'Spectator').trim().slice(0, 48);

      if (!VALID_SPECTATOR_EMOJIS.has(emoji)) {
        res.status(400).json({ success: false, error: 'Invalid spectator cheer reaction.' });
        return;
      }

      const nowMs = Date.now();
      const recent = (cheerTimestampsByUser.get(auth.userId) || []).filter(
        ts => nowMs - ts < 60_000
      );
      if (recent.length >= CHEER_MAX_PER_MIN) {
        res.status(429).json({
          success: false,
          error: `Spectator cheers are limited to ${CHEER_MAX_PER_MIN} per minute.`,
        });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const m = ledger.matches.find(item => item.id === matchId);
        if (!m) return { status: 404, payload: { success: false, error: 'Match not found.' } };
        if (!canSpectateMatch(ledger, m, auth.userId!)) {
          return {
            status: 403,
            payload: { success: false, error: 'Cannot cheer in an ineligible or private match.' },
          };
        }
        if (targetUserId !== m.challengerId && targetUserId !== m.opponentId) {
          return {
            status: 400,
            payload: { success: false, error: 'Target must be a competitor in this match.' },
          };
        }

        recent.push(nowMs);
        cheerTimestampsByUser.set(auth.userId!, recent);

        ledger.spectatorCheers.unshift({
          id: `ch-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
          matchId: m.id,
          spectatorId: auth.userId!,
          spectatorName,
          targetUserId,
          emoji,
          createdAt: new Date(nowMs).toISOString(),
        });
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, match: buildSpectatorMatchView(ledger, m) },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/spectator/follow', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const targetUserId = String(req.body?.targetUserId || '').trim();
      if (!targetUserId || targetUserId === auth.userId) {
        res.status(400).json({ success: false, error: 'Invalid competitor ID.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        if (isPairBlocked(ledger, auth.userId!, targetUserId)) {
          return {
            status: 403,
            payload: { success: false, error: 'Cannot follow a blocked competitor.' },
          };
        }
        const current = ledger.followedCompetitors[auth.userId!] || [];
        const idx = current.indexOf(targetUserId);
        let following = true;
        if (idx >= 0) {
          current.splice(idx, 1);
          following = false;
        } else {
          current.push(targetUserId);
        }
        ledger.followedCompetitors[auth.userId!] = current;
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, following, followedCompetitorIds: current },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });
  };

  return {
    registerRoutes,
    applyVerifiedRivalScore,
    getStateForUser,
  };
}
