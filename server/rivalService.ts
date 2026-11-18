import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import {
  COMPETITIVE_RIVAL_MODES,
  calculateCompetitiveRatingChange,
  calculateSafeRivalScoreDelta,
  computeCompetitiveTier,
  mapLegacyTypeToRivalMode,
  mapRivalModeToLegacyType,
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
  CompetitiveRivalMode,
  CompetitiveRivalProfile,
  MatchmakingQueueEntry,
  PresenceStatus,
  RankedDivisionName,
  RivalChallengeType,
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
  legacyMigrated?: boolean;
}

export interface RivalScoreUpdateResult {
  updatedCount: number;
  pointsAwardedTotal: number;
  resolvedRivalries: RivalryRecord[];
  resolvedMatches: CompetitiveRivalMatch[];
}

const VALID_MODES = new Set<CompetitiveRivalMode>([
  'strength',
  'endurance',
  'consistency',
  'discipline',
  'overall_fitness',
  'custom',
]);

const VALID_LEGACY_CHALLENGES = new Set<RivalChallengeType>([
  'weekly_activity_score',
  'workout_consistency',
  'strength_milestones',
  'endurance_achievements',
  'habit_completion',
]);

const VALID_VISIBILITIES = new Set<CompetitiveMatchVisibility>(['friends', 'public', 'private']);
const VALID_SPECTATOR_EMOJIS = new Set<string>(['🔥', '⚔️', '🏆', '💪', '👏']);
const CHEER_MAX_PER_MIN = 5;

const getDivisionIndex = (rating: number): number => {
  const div = computeRankedDivision(rating);
  const idx = RANKED_DIVISIONS_CATALOG.findIndex(d => d.division === div);
  return idx >= 0 ? idx : 1;
};

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

const getModeTitle = (mode: CompetitiveRivalMode): string => {
  const found = COMPETITIVE_RIVAL_MODES.find(m => m.id === mode);
  return found?.title || 'Competitive Duel';
};

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

  const readLedger = (): RivalsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          const profiles: Record<string, CompetitiveRivalProfile> =
            parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {};
          const scores: RivalryScoreEntry[] = Array.isArray(parsed.scores) ? parsed.scores : [];
          const queue: MatchmakingQueueEntry[] = Array.isArray(parsed.queue) ? parsed.queue : [];
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

          const matches: CompetitiveRivalMatch[] = Array.isArray(parsed.matches) ? parsed.matches : [];

          if (Array.isArray(parsed.rivalries) && !parsed.legacyMigrated) {
            const existingIds = new Set(matches.map(m => m.id));
            for (const r of parsed.rivalries as RivalryRecord[]) {
              if (!r?.id || existingIds.has(r.id) || r.challengerId === r.opponentId) continue;
              const mode = mapLegacyTypeToRivalMode(r.challengeType);
              const status: CompetitiveMatchStatus =
                r.status === 'declined' ? 'cancelled' : (r.status as CompetitiveMatchStatus);
              matches.push({
                id: r.id,
                challengerId: r.challengerId,
                challengerName: r.challengerName,
                opponentId: r.opponentId,
                opponentName: r.opponentName,
                mode,
                challengeType: r.challengeType,
                challengeTitle: r.challengeTitle || getModeTitle(mode),
                rules: {
                  durationDays: 7,
                  targetScore: 500,
                  allowRestDays: true,
                  ranked: false,
                },
                visibility: 'friends',
                status,
                isRanked: false,
                challengerScore: Number(r.challengerScore || 0),
                opponentScore: Number(r.opponentScore || 0),
                winnerId: r.winnerId || null,
                isTie: Boolean(r.isTie),
                startsAt: r.startsAt,
                endsAt: r.endsAt,
                createdAt: r.createdAt,
                resolvedAt: r.resolvedAt || null,
              });
              existingIds.add(r.id);

              if (!profiles[r.challengerId]) {
                profiles[r.challengerId] = createDefaultProfile(r.challengerId, {
                  username: r.challengerName,
                });
              }
              if (!profiles[r.opponentId]) {
                profiles[r.opponentId] = createDefaultProfile(r.opponentId, {
                  username: r.opponentName,
                });
              }
            }
          }

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
            legacyMigrated: true,
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
      legacyMigrated: true,
    };
  };

  const writeLedger = (data: RivalsLedgerFile) => {
    fs.writeFileSync(
      LEDGER_PATH,
      JSON.stringify(
        {
          profiles: data.profiles,
          matches: data.matches,
          scores: data.scores,
          queue: data.queue,
          blocks: data.blocks,
          notifications: data.notifications,
          tournaments: data.tournaments,
          spectatorCheers: data.spectatorCheers.slice(0, 600),
          followedCompetitors: data.followedCompetitors,
          claimedDivisionRewards: data.claimedDivisionRewards,
          legacyMigrated: true,
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

  const settleCompletedMatch = (
    ledger: RivalsLedgerFile,
    m: CompetitiveRivalMatch,
    nowMs: number
  ) => {
    m.status = 'completed';
    m.resolvedAt = new Date(nowMs).toISOString();

    if (m.challengerScore === m.opponentScore) {
      m.winnerId = null;
      m.isTie = true;
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
    m.challengerRatingBefore = pCh.rating;
    m.opponentRatingBefore = pOp.rating;

    if (totalCombinedScore > 0) {
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
      ? `Your ${m.challengeTitle} ended in a draw (${m.challengerScore} - ${m.opponentScore} pts).${deltaDesc}`
      : `${m.winnerId === m.challengerId ? m.challengerName : m.opponentName} won the ${m.challengeTitle} (${m.challengerScore} vs ${m.opponentScore} pts)!${deltaDesc}`;
    pushNotif(ledger, m.challengerId, 'rivalry_completed', 'Rivals Match Concluded', outcomeText, m.id);
    pushNotif(ledger, m.opponentId, 'rivalry_completed', 'Rivals Match Concluded', outcomeText, m.id);
  };

  const resolveExpiredMatches = (ledger: RivalsLedgerFile): CompetitiveRivalMatch[] => {
    const now = Date.now();
    const resolved: CompetitiveRivalMatch[] = [];
    let changed = false;

    for (const m of ledger.matches) {
      const endMs = Date.parse(m.endsAt);
      if ((m.status === 'active' || m.status === 'accepted') && !Number.isNaN(endMs) && now >= endMs) {
        settleCompletedMatch(ledger, m, now);
        resolved.push({ ...m });
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
          `Your pending ${m.challengeTitle} challenge to ${m.opponentName} expired.`,
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
              tm.winnerId =
                tm.playerAScore >= tm.playerBScore ? tm.playerAId : tm.playerBId;
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
        if (modeFilter && m.mode !== modeFilter) continue;
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
      targetScore: m.rules?.targetScore || 500,
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

  const applyVerifiedRivalScore = async (params: {
    userId: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    timezone?: string;
  }): Promise<RivalScoreUpdateResult> => {
    const { userId, activityType, idempotencyKey, metadata = {}, timezone } = params;
    const todayBucket = getTodayBucket(timezone);

    const { result, resolved } = await withLock(() => {
      const ledger = readLedger();
      const resolvedList = resolveExpiredMatches(ledger);
      const activeMatches = ledger.matches.filter(
        m =>
          (m.status === 'active' || m.status === 'accepted') &&
          (m.challengerId === userId || m.opponentId === userId)
      );

      let updatedCount = 0;
      let pointsAwardedTotal = 0;
      let tournamentChanged = false;

      for (const m of activeMatches) {
        const dup = ledger.scores.find(
          s => s.rivalryId === m.id && s.userId === userId && s.idempotencyKey === idempotencyKey
        );
        if (dup) continue;

        const currentDailyScore = ledger.scores
          .filter(
            s =>
              s.rivalryId === m.id &&
              s.userId === userId &&
              s.createdAt.slice(0, 10) === todayBucket
          )
          .reduce((sum, s) => sum + s.pointsAwarded, 0);

        const calc = calculateSafeRivalScoreDelta(
          m.mode || m.challengeType,
          activityType,
          metadata,
          currentDailyScore
        );

        if (calc.pointsAwarded <= 0) continue;

        if (m.challengerId === userId) {
          m.challengerScore += calc.pointsAwarded;
        } else {
          m.opponentScore += calc.pointsAwarded;
        }

        ledger.scores.unshift({
          id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          rivalryId: m.id,
          userId,
          idempotencyKey,
          activityType,
          label: calc.label,
          pointsAwarded: calc.pointsAwarded,
          safetyCapped: calc.safetyCapped,
          createdAt: new Date().toISOString(),
        });

        updatedCount += 1;
        pointsAwardedTotal += calc.pointsAwarded;
      }

      // Advance live Community Tournament bracket scores strictly from verified activities
      for (const t of ledger.tournaments) {
        if (t.status !== 'active') continue;
        for (const tm of t.matches) {
          if (tm.status !== 'live') continue;
          if (tm.playerAId === userId || tm.playerBId === userId) {
            const calc = calculateSafeRivalScoreDelta(t.mode, activityType, metadata, 0);
            if (calc.pointsAwarded > 0) {
              if (tm.playerAId === userId) tm.playerAScore += calc.pointsAwarded;
              else if (tm.playerBId === userId) tm.playerBScore += calc.pointsAwarded;
              tournamentChanged = true;
            }
          }
        }
      }

      if (ledger.scores.length > 3000) {
        ledger.scores = ledger.scores.slice(0, 3000);
      }

      if (updatedCount > 0 || tournamentChanged) {
        writeLedger(ledger);
      }

      const mineResolved = resolvedList.filter(
        m => m.challengerId === userId || m.opponentId === userId
      );

      return {
        resolved: resolvedList,
        result: {
          updatedCount,
          pointsAwardedTotal,
          resolvedRivalries: mineResolved.map(matchToLegacyRecord),
          resolvedMatches: mineResolved,
        },
      };
    });

    await notifyCompleted(resolved);
    return result;
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
      const events = ledger.scores.filter(s => myMatchIds.has(s.rivalryId)).slice(0, 40);
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

    app.post('/api/rivals/queue/join', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
        return;
      }
      const userId = auth.userId;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const mode = String(body.mode || 'overall_fitness') as CompetitiveRivalMode;
      if (!VALID_MODES.has(mode)) {
        res.status(400).json({ success: false, error: 'Invalid competitive mode.' });
        return;
      }

      const username = String(body.username || 'Champion').trim().slice(0, 48);
      const characterClass = body.characterClass as CharacterClass | undefined;
      const level = typeof body.level === 'number' ? body.level : undefined;

      const outcome = await withLock(() => {
        const ledger = readLedger();
        resolveExpiredMatches(ledger);
        const myProf = ensureProfile(ledger, userId, { username, characterClass, level });

        for (const q of ledger.queue) {
          if (q.userId === userId && q.status === 'searching') {
            q.status = 'cancelled';
          }
        }

        const activeCount = ledger.matches.filter(
          m =>
            (m.status === 'active' || m.status === 'accepted') &&
            (m.challengerId === userId || m.opponentId === userId)
        ).length;
        if (activeCount >= 5) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'Maximum of 5 concurrent active Rivals matches reached.',
            },
          };
        }

        const nowMs = Date.now();
        const waiting = ledger.queue.filter(q => {
          if (q.status !== 'searching') return false;
          if (q.userId === userId) return false;
          if (q.mode !== mode) return false;
          if (isPairBlocked(ledger, userId, q.userId)) return false;

          const alreadyFighting = ledger.matches.some(
            m =>
              (m.status === 'pending' || m.status === 'active' || m.status === 'accepted') &&
              m.mode === mode &&
              ((m.challengerId === userId && m.opponentId === q.userId) ||
                (m.challengerId === q.userId && m.opponentId === userId))
          );
          if (alreadyFighting) return false;

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
          const durationDays =
            COMPETITIVE_RIVAL_MODES.find(m => m.id === mode)?.defaultDurationDays || 7;
          const targetScore =
            COMPETITIVE_RIVAL_MODES.find(m => m.id === mode)?.defaultTargetScore || 500;

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
            mode,
            challengeType: mapRivalModeToLegacyType(mode),
            challengeTitle: getModeTitle(mode),
            rules: {
              durationDays,
              targetScore,
              allowRestDays: true,
              ranked: true,
            },
            visibility: 'public',
            status: 'active',
            isRanked: true,
            challengerScore: 0,
            opponentScore: 0,
            winnerId: null,
            isTie: false,
            rematchOfMatchId: null,
            disputeReason: null,
            startsAt: new Date(nowMs).toISOString(),
            endsAt: new Date(nowMs + durationDays * 86400000).toISOString(),
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
            'Matchmaking Opponent Found!',
            `You were matched with ${myProf.username} (${myProf.rating} ${myProf.tier}) in ${newMatch.challengeTitle}.`,
            newMatch.id
          );
          pushNotif(
            ledger,
            userId,
            'rivalry_matched',
            'Matchmaking Opponent Found!',
            `You were matched with ${opProf.username} (${opProf.rating} ${opProf.tier}) in ${newMatch.challengeTitle}.`,
            newMatch.id
          );

          writeLedger(ledger);
          return {
            status: 201,
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
          mode,
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
          payload: {
            success: true,
            matched: false,
            queueEntry,
          },
        };
      });

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

      let mode: CompetitiveRivalMode;
      if (body.mode && VALID_MODES.has(String(body.mode) as CompetitiveRivalMode)) {
        mode = String(body.mode) as CompetitiveRivalMode;
      } else if (
        body.challengeType &&
        VALID_LEGACY_CHALLENGES.has(String(body.challengeType) as RivalChallengeType)
      ) {
        mode = mapLegacyTypeToRivalMode(String(body.challengeType));
      } else {
        mode = 'overall_fitness';
      }

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
      const durationDays = Math.min(
        14,
        Math.max(1, Math.round(Number(rawRules.durationDays || body.durationDays || 7)))
      );
      const targetScore = Math.min(
        5000,
        Math.max(50, Math.round(Number(rawRules.targetScore || 500)))
      );
      const ranked = typeof rawRules.ranked === 'boolean' ? rawRules.ranked : true;
      const allowRestDays = typeof rawRules.allowRestDays === 'boolean' ? rawRules.allowRestDays : true;
      const customFocusNote =
        typeof rawRules.customFocusNote === 'string'
          ? rawRules.customFocusNote.trim().slice(0, 120)
          : undefined;

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
            m.mode === mode &&
            ((m.challengerId === userId && m.opponentId === opponentId) ||
              (m.challengerId === opponentId && m.opponentId === userId))
        );
        if (duplicate) {
          return {
            status: 409,
            payload: {
              success: false,
              error: `An active or pending ${duplicate.challengeTitle} already exists with this opponent.`,
            },
          };
        }

        const nowMs = Date.now();
        const customEndsMs = body.endsAt ? Date.parse(String(body.endsAt)) : NaN;
        const endsIso = !Number.isNaN(customEndsMs)
          ? new Date(customEndsMs).toISOString()
          : new Date(nowMs + durationDays * 86400000).toISOString();

        const challengeTitle =
          mode === 'custom' && customFocusNote
            ? `Custom Duel: ${customFocusNote.slice(0, 32)}`
            : getModeTitle(mode);

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
          mode,
          challengeType: mapRivalModeToLegacyType(mode),
          challengeTitle,
          rules: {
            durationDays,
            targetScore,
            allowRestDays,
            ranked,
            customFocusNote,
          },
          visibility,
          status: 'pending',
          isRanked: ranked,
          challengerScore: 0,
          opponentScore: 0,
          winnerId: null,
          isTie: false,
          rematchOfMatchId:
            typeof body.rematchOfMatchId === 'string' ? body.rematchOfMatchId : null,
          disputeReason: null,
          startsAt: new Date(nowMs).toISOString(),
          endsAt: endsIso,
          createdAt: new Date(nowMs).toISOString(),
          resolvedAt: null,
        };

        ledger.matches.unshift(match);
        pushNotif(
          ledger,
          opponentId,
          'rivalry_invite',
          'New Competitive Rivals Challenge',
          `${myProf.username} (${myProf.rating} ${myProf.tier}) challenged you to a ${durationDays}-day ${match.challengeTitle}!`,
          match.id
        );
        writeLedger(ledger);
        return {
          status: 201,
          payload: {
            success: true,
            match,
            rivalry: matchToLegacyRecord(match),
          },
        };
      });

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
          const durationMs = Math.max(60000, Date.parse(m.endsAt) - Date.parse(m.startsAt));
          const now = Date.now();
          m.status = 'active';
          m.startsAt = new Date(now).toISOString();
          m.endsAt = new Date(now + durationMs).toISOString();
          pushNotif(
            ledger,
            m.challengerId,
            'rivalry_accepted',
            'Rivals Match Accepted',
            `${m.opponentName} accepted your ${m.challengeTitle}!`,
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
            `${m.opponentName} declined your ${m.challengeTitle} invitation.`,
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
          payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
        };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
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
          payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
        };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

    app.post('/api/rivals/end', async (req: Request, res: Response) => {
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
            payload: { success: false, error: 'Only active matches can be ended early.' },
          };
        }
        m.status = 'cancelled';
        m.resolvedAt = new Date().toISOString();
        const otherId = m.challengerId === userId ? m.opponentId : m.challengerId;
        pushNotif(
          ledger,
          otherId,
          'rivalry_ended',
          'Rivals Match Ended',
          `The active ${m.challengeTitle} was cancelled without rating changes.`,
          m.id
        );
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, match: m, rivalry: matchToLegacyRecord(m) },
        };
      });

      const state = await getStateForUser(userId);
      res.status(outcome.status).json({ ...state, ...outcome.payload });
    });

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
            (m.status === 'pending' || m.status === 'active') &&
            m.mode === src.mode &&
            ((m.challengerId === userId && m.opponentId === opponentId) ||
              (m.challengerId === opponentId && m.opponentId === userId))
        );
        if (dup) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'An active or pending rematch already exists.',
            },
          };
        }

        const myProf = ensureProfile(ledger, userId);
        const opProf = ensureProfile(ledger, opponentId);
        const nowMs = Date.now();
        const durationDays = Math.max(1, Number(src.rules?.durationDays || 7));

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
          mode: src.mode,
          challengeType: src.challengeType,
          challengeTitle: src.challengeTitle,
          rules: { ...src.rules },
          visibility: src.visibility,
          status: 'pending',
          isRanked: src.isRanked,
          challengerScore: 0,
          opponentScore: 0,
          winnerId: null,
          isTie: false,
          rematchOfMatchId: src.id,
          disputeReason: null,
          startsAt: new Date(nowMs).toISOString(),
          endsAt: new Date(nowMs + durationDays * 86400000).toISOString(),
          createdAt: new Date(nowMs).toISOString(),
          resolvedAt: null,
        };
        ledger.matches.unshift(rematch);
        pushNotif(
          ledger,
          opponentId,
          'rivalry_rematch',
          'Rematch Challenge Received',
          `${myProf.username} requested a rematch in ${rematch.challengeTitle}!`,
          rematch.id
        );
        writeLedger(ledger);
        return {
          status: 201,
          payload: { success: true, match: rematch, rivalry: matchToLegacyRecord(rematch) },
        };
      });

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
          `${m.challengeTitle} was flagged for fair-play review and rating adjustment was paused.`,
          m.id
        );
        writeLedger(ledger);
        return { status: 200, payload: { success: true, match: m } };
      });

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

    // --- AAA 13: COMMUNITY TOURNAMENTS (STRICTLY REAL COMPETITORS, ZERO BOTS) ---
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
      const subtitle = String(body.subtitle || 'Open Community Bracket').trim().slice(0, 96);
      const mode = (VALID_MODES.has(String(body.mode) as CompetitiveRivalMode)
        ? String(body.mode)
        : 'overall_fitness') as CompetitiveRivalMode;
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
        // Prevent joining alongside a mutually blocked user
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

    // --- AAA 13: READ-ONLY SPECTATOR MODE & RATE-LIMITED RECOGNITION ---
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
      // Spectator mode is strictly read-only: reject score/damage overrides
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

      // Sliding window rate limit: <= 5 cheers per minute
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
