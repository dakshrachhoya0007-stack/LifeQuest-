import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  COMPETITIVE_TIERS,
  DEFAULT_DUEL_DURATION_SECONDS,
  DUEL_EXERCISES_CATALOG,
  DUEL_EXERCISE_IDS,
  MAX_DUEL_DURATION_SECONDS,
} from '../../data/ecosystemData';
import {
  PLACEMENT_MATCHES_REQUIRED,
  RANKED_DIVISIONS_CATALOG,
  computeRankedDivision,
} from '../../data/aaaGamingData';
import type {
  CompetitiveLeaderboardEntry,
  CompetitiveMatchVisibility,
  CompetitiveRivalMatch,
  CompetitiveRivalMode,
  CompetitiveTier,
  DuelExerciseId,
  RankedDivisionName,
} from '../../types/game';
import { DuelPoseTracker, type DuelCameraStatus } from './DuelPoseTracker';
import type { VerifiedRepProof } from '../../utils/aetherMotionEngine';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import {
  AlertTriangle,
  Award,
  Ban,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Dumbbell,
  Eye,
  Flame,
  Heart,
  History,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Shield,
  Target,
  Trophy,
  Unlock,
  Users,
  X,
} from 'lucide-react';

type ArenaSubView = 'duel' | 'history' | 'rankings' | 'spectate' | 'tournaments';
type DuelStage = 1 | 2 | 3 | 4;

const DURATION_PRESETS: Array<{ seconds: number; label: string; caption: string }> = [
  { seconds: 120, label: '2 Min Sprint', caption: 'Fast burst endurance' },
  { seconds: DEFAULT_DUEL_DURATION_SECONDS, label: '3 Min Standard', caption: 'Recommended duel' },
  { seconds: MAX_DUEL_DURATION_SECONDS, label: '5 Min Max', caption: 'Maximum duel cap' },
];

const TIER_ACCENT_MAP: Record<CompetitiveTier, string> = COMPETITIVE_TIERS.reduce(
  (acc, item) => {
    acc[item.tier] = item.accentHex;
    return acc;
  },
  {} as Record<CompetitiveTier, string>
);

const formatClockMmSs = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getExerciseDef = (exerciseId?: DuelExerciseId | string) => {
  if (exerciseId && exerciseId in DUEL_EXERCISES_CATALOG) {
    return DUEL_EXERCISES_CATALOG[exerciseId as DuelExerciseId];
  }
  return DUEL_EXERCISES_CATALOG.squat;
};

export const RivalsView: React.FC = () => {
  const {
    user,
    friends,
    rivalsState,
    rivalsLoading,
    rivalsServerClockOffsetMs,
    refreshRivalsState,
    joinRivalsQueue,
    cancelRivalsQueue,
    readyRivalDuel,
    submitVerifiedDuelRep,
    concedeRivalDuel,
    sendDirectRivalChallenge,
    respondRivalInvite,
    cancelRivalInvite,
    rematchRival,
    disputeRivalMatch,
    updateRivalsPrivacy,
    fetchRivalsLeaderboard,
    blockRivalUser,
    openPublicProfile,
    getPlayerPresence,
    queryPresencesBatch,
    claimRankedDivisionReward,
    tournaments,
    refreshTournaments,
    createTournament,
    joinTournament,
    spectatorMatches,
    followedCompetitorIds,
    refreshSpectatorMatches,
    sendSpectatorCheer,
    toggleFollowCompetitor,
  } = useGame();

  const [subView, setSubView] = useState<ArenaSubView>('duel');
  const [selectedDurationSec, setSelectedDurationSec] = useState<number>(
    DEFAULT_DUEL_DURATION_SECONDS
  );
  const [showDivisionRoadmap, setShowDivisionRoadmap] = useState(false);

  // Direct Challenge form state (server auto-selects 1 verified exercise)
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [directDurationSec, setDirectDurationSec] = useState<number>(DEFAULT_DUEL_DURATION_SECONDS);
  const [isRanked, setIsRanked] = useState<boolean>(true);
  const [visibility, setVisibility] = useState<CompetitiveMatchVisibility>('friends');
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [showDirectPanel, setShowDirectPanel] = useState<boolean>(false);

  // Live duel & stage tracking
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());
  const [cameraStatus, setCameraStatus] = useState<DuelCameraStatus>({
    cameraReady: false,
    isLoading: false,
    landmarksVisible: false,
    cameraStable: true,
    confidence: 0,
    protocolMismatch: false,
    feedback: '',
    error: null,
  });
  const [repFeedbackNotice, setRepFeedbackNotice] = useState<string | null>(null);
  const [confirmSafeStop, setConfirmSafeStop] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Dispute modal
  const [disputeMatchId, setDisputeMatchId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');

  // History / Rankings / Tournaments state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [lbScope, setLbScope] = useState<'global' | 'friends' | 'seasonal' | 'weekly'>('global');
  const [lbMode, setLbMode] = useState<CompetitiveRivalMode | 'all'>('all');
  const [lbDivision, setLbDivision] = useState<string>('all');
  const [leaderboardRows, setLeaderboardRows] = useState<CompetitiveLeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const [newTourneyTitle, setNewTourneyTitle] = useState('');
  const [newTourneySubtitle, setNewTourneySubtitle] = useState('');
  const [newTourneyMode, setNewTourneyMode] = useState<DuelExerciseId>('squat');

  const trackedDuelIdRef = useRef<string | null>(null);
  const settleRefreshFiredForRef = useRef<string | null>(null);

  useEffect(() => {
    void refreshRivalsState();
    void refreshTournaments();
    void refreshSpectatorMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll leaderboard when Rankings tab active
  useEffect(() => {
    if (subView !== 'rankings') return;
    let active = true;
    setLbLoading(true);
    void fetchRivalsLeaderboard({ scope: lbScope, mode: lbMode, division: lbDivision }).then(res => {
      if (!active) return;
      if (res.ok && res.leaderboard) setLeaderboardRows(res.leaderboard);
      setLbLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subView, lbScope, lbMode, lbDivision]);

  // Batch presence lookup
  useEffect(() => {
    if (!rivalsState) return;
    const ids = new Set<string>();
    friends.filter(f => f.status === 'accepted').forEach(f => ids.add(f.champion.id));
    rivalsState.candidates?.forEach(c => ids.add(c.userId));
    rivalsState.matches?.forEach(m => {
      ids.add(m.challengerId);
      ids.add(m.opponentId);
    });
    const arr = Array.from(ids).filter(Boolean);
    if (arr.length > 0) void queryPresencesBatch(arr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalsState?.candidates?.length, rivalsState?.matches?.length, friends.length]);

  const myUserId = user?.id || '';
  const profile = rivalsState?.profile;
  const queueEntry = rivalsState?.queueEntry;
  const matches = rivalsState?.matches || [];
  const events = rivalsState?.events || [];
  const h2hRecords = rivalsState?.h2hRecords || [];
  const candidates = rivalsState?.candidates || [];
  const blockedIds = rivalsState?.blockedIds || [];

  const activeLiveMatch = useMemo(
    () => matches.find(m => m.status === 'active') || null,
    [matches]
  );
  const setupMatch = useMemo(
    () => matches.find(m => m.status === 'accepted') || null,
    [matches]
  );
  const currentDuelMatch = activeLiveMatch || setupMatch;

  const incomingInvites = useMemo(
    () => matches.filter(m => m.status === 'pending' && m.opponentId === myUserId),
    [matches, myUserId]
  );
  const sentInvites = useMemo(
    () => matches.filter(m => m.status === 'pending' && m.challengerId === myUserId),
    [matches, myUserId]
  );
  const resultMatch = useMemo(
    () => (resultMatchId ? matches.find(m => m.id === resultMatchId) || null : null),
    [matches, resultMatchId]
  );

  // Track active/accepted duel ID so when it transitions to completed we automatically display Stage 4 Results
  useEffect(() => {
    if (currentDuelMatch) {
      trackedDuelIdRef.current = currentDuelMatch.id;
      settleRefreshFiredForRef.current = null;
      if (resultMatchId === currentDuelMatch.id) {
        setResultMatchId(null);
      }
      return;
    }

    const prevId = trackedDuelIdRef.current;
    if (prevId) {
      const prevMatch = matches.find(m => m.id === prevId);
      if (prevMatch && (prevMatch.status === 'completed' || prevMatch.status === 'disputed')) {
        setResultMatchId(prevMatch.id);
        setSubView('duel');
      } else if (prevMatch && prevMatch.status === 'cancelled') {
        setFeedbackBanner({
          type: 'ok',
          text: `${prevMatch.exerciseName} duel ended safely with no rating change.`,
        });
      }
      trackedDuelIdRef.current = null;
      setConfirmSafeStop(false);
    }
  }, [currentDuelMatch, matches, resultMatchId]);

  // Light fallback sync poll while searching in matchmaking queue
  useEffect(() => {
    if (queueEntry?.status !== 'searching') return;
    const t = window.setInterval(() => {
      void refreshRivalsState();
    }, 4500);
    return () => clearInterval(t);
  }, [queueEntry?.status, refreshRivalsState]);

  // Live 200ms timer tick during Stage 2/3 or active queue search
  useEffect(() => {
    if (!currentDuelMatch && queueEntry?.status !== 'searching') return;
    const interval = window.setInterval(() => {
      setNowTickMs(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [currentDuelMatch, queueEntry?.status]);

  // Synchronized server clock calculation
  const serverNowMs = nowTickMs + rivalsServerClockOffsetMs;
  const countdownRemainingMs = useMemo(() => {
    if (!activeLiveMatch?.countdownEndsAt) return 0;
    return Math.max(0, Date.parse(activeLiveMatch.countdownEndsAt) - serverNowMs);
  }, [activeLiveMatch?.countdownEndsAt, serverNowMs]);

  const duelTimeRemainingMs = useMemo(() => {
    if (!activeLiveMatch?.endsAt) return 0;
    return Math.max(0, Date.parse(activeLiveMatch.endsAt) - serverNowMs);
  }, [activeLiveMatch?.endsAt, serverNowMs]);

  // When server timer hits 00:00, fetch settled match state once if WS hasn't delivered yet
  useEffect(() => {
    if (!activeLiveMatch) return;
    if (
      duelTimeRemainingMs <= 0 &&
      serverNowMs >= Date.parse(activeLiveMatch.endsAt) + 1500 &&
      settleRefreshFiredForRef.current !== activeLiveMatch.id
    ) {
      settleRefreshFiredForRef.current = activeLiveMatch.id;
      void refreshRivalsState();
    }
  }, [activeLiveMatch, duelTimeRemainingMs, serverNowMs, refreshRivalsState]);

  const currentStage: DuelStage = activeLiveMatch
    ? 3
    : setupMatch
    ? 2
    : resultMatch
    ? 4
    : 1;

  // Division info
  const divisionName = useMemo(
    () => computeRankedDivision(profile?.rating || 1200),
    [profile?.rating]
  );

  const placementGames = Math.min(
    PLACEMENT_MATCHES_REQUIRED,
    profile?.placementMatchesPlayed ?? profile?.matchesPlayed ?? 0
  );
  const placementDone =
    profile?.placementCompleted ?? (profile?.matchesPlayed || 0) >= PLACEMENT_MATCHES_REQUIRED;

  // Challengeable players list
  const acceptedFriends = useMemo(
    () =>
      friends
        .filter(f => f.status === 'accepted')
        .map(f => ({
          userId: f.champion.id,
          username: f.champion.username,
          characterClass: f.champion.characterClass,
          level: f.champion.level,
          rating: candidates.find(c => c.userId === f.champion.id)?.rating || 1200,
          tier: (candidates.find(c => c.userId === f.champion.id)?.tier || 'Silver') as CompetitiveTier,
          isFriend: true,
        })),
    [friends, candidates]
  );

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    const map = new Map<
      string,
      {
        userId: string;
        username: string;
        rating: number;
        tier: CompetitiveTier;
        isFriend: boolean;
      }
    >();
    acceptedFriends.forEach(f => map.set(f.userId, f));
    candidates.forEach(c => {
      if (c.userId === myUserId) return;
      if (!map.has(c.userId)) {
        map.set(c.userId, {
          userId: c.userId,
          username: c.username,
          rating: c.rating,
          tier: c.tier,
          isFriend: false,
        });
      }
    });
    return Array.from(map.values()).filter(
      c => !blockedIds.includes(c.userId) && (!q || c.username.toLowerCase().includes(q))
    );
  }, [acceptedFriends, candidates, blockedIds, myUserId, candidateSearch]);

  const historyMatches = useMemo(() => {
    return matches.filter(m => {
      if (m.status === 'pending' || m.status === 'accepted' || m.status === 'active') return false;
      if (historyFilter === 'completed') return m.status === 'completed' || m.status === 'disputed';
      if (historyFilter === 'cancelled') return m.status === 'cancelled' || m.status === 'expired';
      return true;
    });
  }, [matches, historyFilter]);

  const handleActionResult = (
    res: { success?: boolean; ok?: boolean; error?: string },
    okMsg?: string
  ) => {
    const succeeded = Boolean(res.success ?? res.ok);
    if (succeeded) {
      if (okMsg) setFeedbackBanner({ type: 'ok', text: okMsg });
    } else {
      setFeedbackBanner({ type: 'err', text: res.error || 'Action failed.' });
    }
  };

  // --- Handlers ---
  const handleFindRival = async () => {
    setBusyAction('queue');
    setFeedbackBanner(null);
    setResultMatchId(null);
    const res = await joinRivalsQueue({ durationSeconds: selectedDurationSec });
    setBusyAction(null);
    if (!res.success) {
      handleActionResult(res);
      return;
    }
    if (res.matched && res.match) {
      setFeedbackBanner({
        type: 'ok',
        text: `Rival matched! Get your camera ready for ${res.match.exerciseName}.`,
      });
    } else {
      setFeedbackBanner({
        type: 'ok',
        text: 'Searching for a real player near your Elo rating...',
      });
    }
  };

  const handleCancelQueue = async () => {
    setBusyAction('cancel-queue');
    const res = await cancelRivalsQueue();
    setBusyAction(null);
    handleActionResult(res, 'Left matchmaking queue.');
  };

  const handleDirectChallenge = async () => {
    const opponent = filteredCandidates.find(c => c.userId === selectedOpponentId);
    if (!opponent) {
      setFeedbackBanner({ type: 'err', text: 'Select a real player to challenge.' });
      return;
    }
    setBusyAction('challenge');
    setFeedbackBanner(null);
    const res = await sendDirectRivalChallenge({
      opponentId: opponent.userId,
      opponentName: opponent.username,
      visibility,
      rules: {
        durationSeconds: directDurationSec,
        ranked: isRanked,
      },
    });
    setBusyAction(null);
    if (res.success) {
      setShowDirectPanel(false);
    }
    handleActionResult(
      res,
      `Live duel invite sent to ${opponent.username}. A single verified exercise was auto-selected.`
    );
  };

  const handleReadyToggle = async (ready: boolean) => {
    if (!currentDuelMatch) return;
    if (ready && !cameraStatus.cameraReady) {
      setFeedbackBanner({
        type: 'err',
        text: 'Enable and verify your live Aether Vision camera feed before marking Ready.',
      });
      return;
    }
    setBusyAction('ready');
    setFeedbackBanner(null);
    const res = await readyRivalDuel({
      matchId: currentDuelMatch.id,
      ready,
      cameraReady: cameraStatus.cameraReady,
    });
    setBusyAction(null);
    if (!res.success) {
      handleActionResult(res);
      return;
    }
    if (res.launchedNow) {
      setFeedbackBanner({
        type: 'ok',
        text: 'Both players ready! Synchronized 5-second countdown started.',
      });
    }
  };

  const handleVerifiedRepFromTracker = useCallback(
    async (proof: VerifiedRepProof & { landmarksVisible: boolean; cameraStable: boolean }) => {
      if (!activeLiveMatch) return;
      const eventId = `rep-${activeLiveMatch.id}-${proof.repSeq}-${Date.now()}`;
      const res = await submitVerifiedDuelRep({
        matchId: activeLiveMatch.id,
        eventId,
        repSeq: proof.repSeq,
        exercise: activeLiveMatch.duelExercise,
        peakAngleDeg: proof.peakAngleDeg,
        resetAngleDeg: proof.resetAngleDeg,
        durationMs: proof.durationMs,
        confidence: proof.confidence,
        landmarksVisible: proof.landmarksVisible,
        cameraStable: proof.cameraStable,
      });
      if (res.success) {
        setRepFeedbackNotice(
          `Rep #${proof.repSeq} verified (+${res.pointsAwarded ?? activeLiveMatch.pointsPerRep} pts)`
        );
      } else if (res.error) {
        setRepFeedbackNotice(`Not counted: ${res.error}`);
      }
    },
    [activeLiveMatch, submitVerifiedDuelRep]
  );

  const handleConcedeOrSafeStop = async () => {
    if (!currentDuelMatch) return;
    setBusyAction('concede');
    setFeedbackBanner(null);
    const res = await concedeRivalDuel(currentDuelMatch.id);
    setBusyAction(null);
    setConfirmSafeStop(false);
    if (!res.success) {
      handleActionResult(res);
      return;
    }
    if (res.match && (res.match.status === 'completed' || res.match.status === 'disputed')) {
      setResultMatchId(res.match.id);
    } else {
      setFeedbackBanner({
        type: 'ok',
        text: 'Stopped safely before scoring started (no Elo rating change).',
      });
    }
  };

  const handleRematch = async (matchId: string) => {
    setBusyAction(`rematch-${matchId}`);
    const res = await rematchRival(matchId);
    setBusyAction(null);
    if (res.success) {
      setResultMatchId(null);
      setSubView('duel');
    }
    handleActionResult(res, 'Rematch challenge sent!');
  };

  const isCountingLive =
    Boolean(activeLiveMatch) &&
    countdownRemainingMs <= 0 &&
    duelTimeRemainingMs > 0;

  // Derived stage match perspectives
  const activePerspective = useMemo(() => {
    const m = currentDuelMatch;
    if (!m) return null;
    const amChallenger = m.challengerId === myUserId;
    return {
      match: m,
      amChallenger,
      myName: amChallenger ? m.challengerName : m.opponentName,
      myRating: amChallenger ? m.challengerRatingSnapshot : m.opponentRatingSnapshot,
      myTier: amChallenger ? m.challengerTierSnapshot : m.opponentTierSnapshot,
      myScore: amChallenger ? m.challengerScore : m.opponentScore,
      myReps: amChallenger ? m.challengerReps : m.opponentReps,
      myReady: amChallenger ? m.challengerReady : m.opponentReady,
      opId: amChallenger ? m.opponentId : m.challengerId,
      opName: amChallenger ? m.opponentName : m.challengerName,
      opRating: amChallenger ? m.opponentRatingSnapshot : m.challengerRatingSnapshot,
      opTier: amChallenger ? m.opponentTierSnapshot : m.challengerTierSnapshot,
      opScore: amChallenger ? m.opponentScore : m.challengerScore,
      opReps: amChallenger ? m.opponentReps : m.challengerReps,
      opReady: amChallenger ? m.opponentReady : m.challengerReady,
      opCameraReady: amChallenger ? m.opponentCameraReady : m.challengerCameraReady,
      exDef: getExerciseDef(m.duelExercise),
    };
  }, [currentDuelMatch, myUserId]);

  const activeMatchEvents = useMemo(() => {
    if (!currentDuelMatch) return [];
    return events.filter(e => e.rivalryId === currentDuelMatch.id).slice(0, 6);
  }, [events, currentDuelMatch]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Compact Elo Summary */}
      <div className="bg-[#141420] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0">
              <GoldenWorldTreeEmblem className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#D6A84B]">
                Live Camera-Verified 1v1 Exercise Arena
              </p>
              <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                Real-Life PvP Rivalry
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Compete head-to-head with real players in a single auto-selected bodyweight exercise.
                Aether Vision verifies every repetition live—no manual scoring or AI opponents.
              </p>
            </div>
          </div>

          {/* Compact Competitive Rating & Privacy */}
          <div className="flex flex-wrap items-center gap-6 lg:border-l lg:border-white/10 lg:pl-6">
            <div>
              <p className="text-xs text-slate-400">Elo Rating</p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {profile?.rating ?? 1200}
              </p>
              <p className="text-xs text-[#D6A84B] font-medium">
                {divisionName} Division
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Record</p>
              <p className="text-lg font-semibold text-white tabular-nums">
                {profile?.wins ?? 0}W - {profile?.losses ?? 0}L - {profile?.ties ?? 0}T
              </p>
              <p className="text-xs text-slate-400 tabular-nums">
                Streak: {profile?.currentStreak ?? 0} ·{' '}
                {placementDone
                  ? 'Ranked Active'
                  : `Placements ${placementGames}/${PLACEMENT_MATCHES_REQUIRED}`}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !(profile?.allowNonFriendChallenges ?? true);
                const res = await updateRivalsPrivacy(next);
                handleActionResult(
                  res,
                  next
                    ? 'Open to public and arena rival invites.'
                    : 'Direct invites restricted to accepted friends.'
                );
              }}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-[#0D0D18] hover:bg-white/5 text-xs font-medium text-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              {profile?.allowNonFriendChallenges === false ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#FBBF24]" />
                  Friends-Only Invites
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#34D399]" />
                  Public Invites Open
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-view Switcher */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0D0D18] p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'duel', label: 'Duel Arena', icon: Dumbbell },
                { id: 'history', label: 'History & H2H', icon: History },
                { id: 'rankings', label: 'Rankings', icon: Trophy },
                { id: 'spectate', label: 'Spectate', icon: Eye },
                { id: 'tournaments', label: 'Tournaments', icon: Crown },
              ] as Array<{ id: ArenaSubView; label: string; icon: React.ComponentType<any> }>
            ).map(tab => {
              const Icon = tab.icon;
              const isActive = subView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubView(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#8B5CF6] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowDivisionRoadmap(v => !v)}
            className="text-xs font-medium text-slate-400 hover:text-[#E8CF96] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Award className="w-3.5 h-3.5 text-[#D6A84B]" />
            <span>Ranked Divisions</span>
            {showDivisionRoadmap ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible Ranked Division Progress */}
        {showDivisionRoadmap && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {RANKED_DIVISIONS_CATALOG.map(div => {
              const unlocked = (profile?.rating ?? 1200) >= div.minRating;
              const claimed = (rivalsState as any)?.claimedDivisionRewards?.includes(div.division);
              return (
                <div
                  key={div.division}
                  className={`p-3.5 rounded-xl border ${
                    unlocked
                      ? 'bg-[#0D0D18] border-[#D6A84B]/30'
                      : 'bg-[#090910] border-white/5 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{div.division}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {div.minRating}+ Elo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{div.rewardTitleName}</p>
                  {unlocked && !claimed && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await claimRankedDivisionReward(
                          div.division as RankedDivisionName
                        );
                        handleActionResult(res, `${div.division} milestone claimed!`);
                      }}
                      className="mt-2 px-2.5 py-1 rounded-lg bg-[#D6A84B]/20 hover:bg-[#D6A84B]/30 text-[#E8CF96] text-[11px] font-semibold cursor-pointer"
                    >
                      Claim Title Milestone
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            feedbackBanner.type === 'ok'
              ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
              : 'bg-[#FB7185]/10 border-[#FB7185]/30 text-[#FB7185]'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-1 rounded hover:bg-white/10 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DUEL ARENA: 4-STAGE FOCUSED FLOW                                      */}
      {/* ===================================================================== */}
      {subView === 'duel' && (
        <div className="space-y-6">
          {/* 4-Stage Stepper */}
          <div className="bg-[#141420] border border-white/10 rounded-2xl px-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { step: 1, title: '1. Find a Rival', sub: 'Elo matchmaking' },
                  { step: 2, title: '2. Exercise', sub: 'Rules & camera check' },
                  { step: 3, title: '3. Live Duel', sub: 'Real-time verified reps' },
                  { step: 4, title: '4. Results', sub: 'Score & Elo update' },
                ] as Array<{ step: DuelStage; title: string; sub: string }>
              ).map(s => {
                const isCurrent = currentStage === s.step;
                const isDone = currentStage > s.step;
                return (
                  <div
                    key={s.step}
                    className={`px-3.5 py-2.5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/60'
                        : isDone
                        ? 'bg-[#34D399]/10 border-[#34D399]/30'
                        : 'bg-[#0D0D18] border-white/5 opacity-60'
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-white'
                          : isDone
                          ? 'text-[#34D399]'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 1: FIND A RIVAL                                             */}
          {/* ----------------------------------------------------------------- */}
          {currentStage === 1 && (
            <div className="space-y-6">
              {/* Primary Find a Rival Card */}
              <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 lg:p-8">
                <div className="max-w-3xl space-y-6">
                  <div>
                    <p className="text-xs font-medium text-[#D6A84B]">
                      Real-Player Matchmaking · Single Auto-Selected Exercise
                    </p>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Step Into a Live 1v1 Exercise Duel
                    </h2>
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                      You will be paired with a real player near your Elo rating. Once matched, both
                      competitors perform the exact same verified bodyweight exercise under identical
                      rules and live camera tracking.
                    </p>
                  </div>

                  {/* Duration Selector (Default 3 min, Absolute Max 5 min) */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Duel Duration (3 Min Default · 5 Min Max)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {DURATION_PRESETS.map(preset => {
                        const selected = selectedDurationSec === preset.seconds;
                        return (
                          <button
                            key={preset.seconds}
                            type="button"
                            disabled={queueEntry?.status === 'searching'}
                            onClick={() => setSelectedDurationSec(preset.seconds)}
                            className={`px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-60 ${
                              selected
                                ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                                : 'bg-[#0D0D18] border-white/10 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <div className="text-sm font-semibold">{preset.label}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{preset.caption}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Supported Exercise Pool (Clean Unboxed Metadata) */}
                  <div className="pt-2 border-t border-white/10 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-slate-300 font-medium">Supported Duel Exercises:</span>
                    {DUEL_EXERCISE_IDS.map((exId, idx) => (
                      <React.Fragment key={exId}>
                        <span>{DUEL_EXERCISES_CATALOG[exId].name}</span>
                        {idx < DUEL_EXERCISE_IDS.length - 1 && (
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Queue Status or Primary CTA */}
                  {queueEntry?.status === 'searching' ? (
                    <div className="p-5 rounded-xl bg-[#0D0D18] border border-[#8B5CF6]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <RefreshCw className="w-4 h-4 text-[#A78BFA] animate-spin" />
                          <span>Searching for a Real Rival...</span>
                        </div>
                        <p className="text-xs text-slate-400 tabular-nums">
                          Rating range {queueEntry.minRating} – {queueEntry.maxRating} Elo · Elapsed{' '}
                          {formatClockMmSs(
                            Math.max(0, Date.now() - Date.parse(queueEntry.createdAt))
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCancelQueue()}
                        disabled={busyAction === 'cancel-queue'}
                        className="px-4 py-2.5 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 hover:bg-[#FB7185]/20 text-[#FB7185] text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Cancel Search
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void handleFindRival()}
                        disabled={busyAction === 'queue' || rivalsLoading}
                        className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white text-sm font-bold shadow-lg shadow-[#8B5CF6]/20 inline-flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
                      >
                        <Target className="w-4 h-4 text-[#E8CF96]" />
                        <span>{busyAction === 'queue' ? 'Matching...' : 'Find a Rival'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDirectPanel(v => !v)}
                        className="px-4 py-3 rounded-xl border border-white/10 bg-[#0D0D18] hover:bg-white/5 text-xs font-semibold text-slate-200 inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Challenge a Specific Player</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Incoming & Pending Invites */}
              {(incomingInvites.length > 0 || sentInvites.length > 0) && (
                <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white">Pending Duel Invitations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingInvites.map(inv => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-xl bg-[#0D0D18] border border-[#D6A84B]/30 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white">
                              {inv.challengerName}
                            </span>
                            <span className="text-xs text-[#D6A84B] tabular-nums">
                              {inv.challengerRatingSnapshot ?? 1200} Elo
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {inv.exerciseName} · {Math.round(inv.durationSeconds / 60)} min ·{' '}
                            {inv.isRanked ? 'Ranked' : 'Friendly'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setBusyAction(`accept-${inv.id}`);
                              const res = await respondRivalInvite(inv.id, 'accept');
                              setBusyAction(null);
                              handleActionResult(res, 'Invite accepted! Calibrate your camera.');
                            }}
                            disabled={busyAction === `accept-${inv.id}`}
                            className="flex-1 px-3 py-2 rounded-lg bg-[#34D399] hover:bg-[#10B981] text-[#090910] text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            Accept Duel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await respondRivalInvite(inv.id, 'decline');
                              handleActionResult(res, 'Invitation declined.');
                            }}
                            className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-medium text-slate-300 cursor-pointer whitespace-nowrap"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}

                    {sentInvites.map(inv => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-xl bg-[#0D0D18] border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Sent to {inv.opponentName}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {inv.exerciseName} · {Math.round(inv.durationSeconds / 60)} min · Awaiting
                            acceptance
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await cancelRivalInvite(inv.id);
                            handleActionResult(res, 'Challenge cancelled.');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-slate-300 cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Friend / Arena Player Challenge Drawer */}
              {showDirectPanel && (
                <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">Direct Friend / Player Invite</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        A single verified exercise is automatically assigned once invited.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={candidateSearch}
                        onChange={e => setCandidateSearch(e.target.value)}
                        placeholder="Search players..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  {filteredCandidates.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">
                      No available players found right now. Use Find a Rival above to match with
                      real players in queue!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                      {filteredCandidates.map(c => {
                        const pres = getPlayerPresence(c.userId);
                        const selected = selectedOpponentId === c.userId;
                        return (
                          <button
                            key={c.userId}
                            type="button"
                            onClick={() => setSelectedOpponentId(c.userId)}
                            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]'
                                : 'bg-[#0D0D18] border-white/10 hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white truncate">
                                {c.username}
                              </span>
                              <PresenceBadge status={pres.status} size="sm" />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                              {c.rating} Elo · {c.isFriend ? 'Friend' : 'Arena Player'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/10">
                    <select
                      value={directDurationSec}
                      onChange={e => setDirectDurationSec(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white"
                    >
                      {DURATION_PRESETS.map(p => (
                        <option key={p.seconds} value={p.seconds}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={visibility}
                      onChange={e => setVisibility(e.target.value as CompetitiveMatchVisibility)}
                      className="px-3 py-2 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white"
                    >
                      <option value="friends">Friends Spectate</option>
                      <option value="public">Public Spectate</option>
                      <option value="private">Private</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsRanked(v => !v)}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                        isRanked
                          ? 'bg-[#D6A84B]/15 border-[#D6A84B]/40 text-[#E8CF96]'
                          : 'bg-[#0D0D18] border-white/10 text-slate-300'
                      }`}
                    >
                      {isRanked ? 'Ranked Elo Match' : 'Unranked Practice'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDirectChallenge()}
                      disabled={!selectedOpponentId || busyAction === 'challenge'}
                      className="ml-auto px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      {busyAction === 'challenge' ? 'Sending...' : 'Send Live Invite'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 2 & STAGE 3 SHARED ARENA (Continuous Camera & Transition)   */}
          {/* ----------------------------------------------------------------- */}
          {(currentStage === 2 || currentStage === 3) && activePerspective && (
            <div className="space-y-6">
              {/* Synchronized Match Header & Scoreboard */}
              <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-medium text-[#D6A84B]">
                      {currentStage === 2
                        ? 'Stage 2 · Prepare & Calibrate Camera'
                        : countdownRemainingMs > 0
                        ? 'Starting Countdown · Get In Position'
                        : 'Stage 3 · Live Real-Life Duel'}
                    </p>
                    <h2 className="text-2xl font-bold text-white mt-0.5">
                      {activePerspective.exDef.name} 1v1 Duel
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 tabular-nums">
                      +{activePerspective.match.pointsPerRep} pts per verified rep ·{' '}
                      {Math.round(activePerspective.match.durationSeconds / 60)} min duration ·{' '}
                      {activePerspective.match.isRanked ? 'Ranked Elo' : 'Friendly'}
                    </p>
                  </div>

                  {/* Synchronized Timer Display */}
                  <div className="text-right">
                    {currentStage === 2 ? (
                      <div className="px-4 py-2.5 rounded-xl bg-[#0D0D18] border border-white/10">
                        <p className="text-[11px] text-slate-400">Match Duration</p>
                        <p className="text-xl font-bold text-white tabular-nums">
                          {formatClockMmSs(activePerspective.match.durationSeconds * 1000)}
                        </p>
                      </div>
                    ) : countdownRemainingMs > 0 ? (
                      <div className="px-5 py-2.5 rounded-xl bg-[#FBBF24]/15 border border-[#FBBF24]/50">
                        <p className="text-[11px] text-[#FBBF24] font-semibold">Starting In</p>
                        <p className="text-3xl font-black text-[#FBBF24] tabular-nums">
                          {Math.ceil(countdownRemainingMs / 1000)}
                        </p>
                      </div>
                    ) : (
                      <div className="px-5 py-2.5 rounded-xl bg-[#0D0D18] border border-[#34D399]/40">
                        <p className="text-[11px] text-slate-400">Time Remaining</p>
                        <p
                          className={`text-3xl font-black tabular-nums ${
                            duelTimeRemainingMs <= 15_000 ? 'text-[#FB7185]' : 'text-[#34D399]'
                          }`}
                        >
                          {formatClockMmSs(duelTimeRemainingMs)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Versus Scoreboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* You */}
                  <div className="p-5 rounded-xl bg-[#0D0D18] border border-[#8B5CF6]/40 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#A78BFA] font-semibold">You</p>
                      <p className="text-lg font-bold text-white">
                        {activePerspective.myName}
                      </p>
                      <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {activePerspective.myRating ?? 1200} Elo ·{' '}
                        {currentStage === 2
                          ? activePerspective.myReady
                            ? 'Ready'
                            : cameraStatus.cameraReady
                            ? 'Camera Ready'
                            : 'Calibrating'
                          : 'Live'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white tabular-nums">
                        {activePerspective.myScore}
                        <span className="text-xs font-medium text-slate-400 ml-1">pts</span>
                      </p>
                      <p className="text-xs text-[#34D399] font-semibold tabular-nums mt-0.5">
                        {activePerspective.myReps} verified reps
                      </p>
                    </div>
                  </div>

                  {/* Opponent */}
                  <div className="p-5 rounded-xl bg-[#0D0D18] border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#FB7185] font-semibold">Opponent</p>
                      <p className="text-lg font-bold text-white">
                        {activePerspective.opName}
                      </p>
                      <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {activePerspective.opRating ?? 1200} Elo ·{' '}
                        {currentStage === 2
                          ? activePerspective.opReady
                            ? 'Ready'
                            : activePerspective.opCameraReady
                            ? 'Camera Active'
                            : 'Preparing Camera...'
                          : 'Synced Live'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white tabular-nums">
                        {activePerspective.opScore}
                        <span className="text-xs font-medium text-slate-400 ml-1">pts</span>
                      </p>
                      <p className="text-xs text-slate-300 font-semibold tabular-nums mt-0.5">
                        {activePerspective.opReps} verified reps
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera Tracker + Guidance / Live Feed Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-3">
                  <DuelPoseTracker
                    exercise={activePerspective.match.duelExercise}
                    exerciseName={activePerspective.exDef.name}
                    trackingEnabled={true}
                    countingActive={isCountingLive}
                    onStatusChange={setCameraStatus}
                    onVerifiedRep={handleVerifiedRepFromTracker}
                  />

                  {repFeedbackNotice && currentStage === 3 && (
                    <div className="px-4 py-2.5 rounded-xl bg-[#141420] border border-white/10 text-xs text-slate-200 flex items-center justify-between">
                      <span>{repFeedbackNotice}</span>
                      <span className="text-[11px] text-[#D6A84B]">Server Verified</span>
                    </div>
                  )}
                </div>

                {/* Right Column: Stage 2 Controls & Guidance OR Stage 3 Live Log & Safe Stop */}
                <div className="lg:col-span-5 space-y-4">
                  {currentStage === 2 ? (
                    <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-5">
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {activePerspective.exDef.name} Standards & Safety
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {activePerspective.exDef.description}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300">
                        <p className="font-semibold text-white">Form & Camera Checklist</p>
                        <ul className="space-y-1.5 text-slate-400">
                          {activePerspective.exDef.formCues.map((cue, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#34D399] shrink-0 mt-0.5" />
                              <span>{cue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-slate-400">
                        <p>
                          <span className="text-slate-200 font-medium">Camera Placement:</span>{' '}
                          {activePerspective.exDef.cameraSetupTip}
                        </p>
                        <p>
                          <span className="text-slate-200 font-medium">Warm-Up:</span>{' '}
                          {activePerspective.exDef.warmupGuidance}
                        </p>
                        <p>
                          <span className="text-slate-200 font-medium">Accessible Option:</span>{' '}
                          {activePerspective.exDef.accessibleModification}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <button
                          type="button"
                          onClick={() =>
                            void handleReadyToggle(!activePerspective.myReady)
                          }
                          disabled={
                            busyAction === 'ready' ||
                            (!activePerspective.myReady && !cameraStatus.cameraReady)
                          }
                          className={`w-full py-3.5 px-5 rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                            activePerspective.myReady
                              ? 'bg-[#34D399]/15 border border-[#34D399]/50 text-[#34D399]'
                              : 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white'
                          }`}
                        >
                          {busyAction === 'ready'
                            ? 'Syncing Readiness...'
                            : activePerspective.myReady
                            ? `Ready — Waiting for ${activePerspective.opName}...`
                            : cameraStatus.cameraReady
                            ? 'Mark Ready to Duel'
                            : 'Enable Camera First'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleConcedeOrSafeStop()}
                          disabled={busyAction === 'concede'}
                          className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-slate-300 cursor-pointer"
                        >
                          Step Out Safely (No Elo Penalty)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-5">
                      <div>
                        <h3 className="text-base font-bold text-white">Live Verification Log</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Every repetition is validated for full range of motion, landmark
                          visibility, and natural cadence before points are credited.
                        </p>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {activeMatchEvents.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">
                            {countdownRemainingMs > 0
                              ? 'Get ready—scoring unlocks on GO.'
                              : 'Perform full repetitions in view to score verified points.'}
                          </p>
                        ) : (
                          activeMatchEvents.map(ev => {
                            const isMe = ev.userId === myUserId;
                            return (
                              <div
                                key={ev.id}
                                className="px-3.5 py-2.5 rounded-xl bg-[#0D0D18] border border-white/5 flex items-center justify-between text-xs"
                              >
                                <span className={isMe ? 'text-[#A78BFA] font-semibold' : 'text-slate-300'}>
                                  {isMe ? 'You' : activePerspective.opName} · {ev.label}
                                </span>
                                <span className="text-[#34D399] font-bold tabular-nums">
                                  +{ev.pointsAwarded} pts
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Safety First: Maintain controlled form and breathe steadily. Stop
                          immediately if you feel sharp pain, dizziness, or unsafe fatigue.
                        </p>

                        {!confirmSafeStop ? (
                          <button
                            type="button"
                            onClick={() => setConfirmSafeStop(true)}
                            className="w-full py-2.5 px-4 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 hover:bg-[#FB7185]/20 text-[#FB7185] text-xs font-semibold cursor-pointer"
                          >
                            Stop Safely / Concede Duel
                          </button>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-[#0D0D18] border border-[#FB7185]/40 space-y-2.5">
                            <p className="text-xs text-slate-300">
                              {activePerspective.myReps + activePerspective.opReps === 0
                                ? 'No reps scored yet—stopping now cancels cleanly with no Elo shift.'
                                : 'Reps are already recorded—stopping early awards a forfeit win to your opponent.'}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleConcedeOrSafeStop()}
                                disabled={busyAction === 'concede'}
                                className="flex-1 py-2 px-3 rounded-lg bg-[#FB7185] hover:bg-[#F43F5E] text-[#090910] text-xs font-bold cursor-pointer"
                              >
                                Confirm Stop
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmSafeStop(false)}
                                className="py-2 px-3 rounded-lg border border-white/10 text-xs text-slate-300 cursor-pointer"
                              >
                                Keep Going
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 4: RESULTS                                                  */}
          {/* ----------------------------------------------------------------- */}
          {currentStage === 4 && resultMatch && (
            <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 lg:p-8 space-y-6">
              {(() => {
                const amChallenger = resultMatch.challengerId === myUserId;
                const won = resultMatch.winnerId === myUserId;
                const myScore = amChallenger ? resultMatch.challengerScore : resultMatch.opponentScore;
                const myReps = amChallenger ? resultMatch.challengerReps : resultMatch.opponentReps;
                const opScore = amChallenger ? resultMatch.opponentScore : resultMatch.challengerScore;
                const opReps = amChallenger ? resultMatch.opponentReps : resultMatch.challengerReps;
                const opName = amChallenger ? resultMatch.opponentName : resultMatch.challengerName;
                const myRatingBefore = amChallenger
                  ? resultMatch.challengerRatingBefore
                  : resultMatch.opponentRatingBefore;
                const myRatingAfter = amChallenger
                  ? resultMatch.challengerRatingAfter
                  : resultMatch.opponentRatingAfter;
                const myDelta = amChallenger
                  ? resultMatch.challengerRatingDelta
                  : resultMatch.opponentRatingDelta;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            resultMatch.isTie
                              ? 'text-[#FBBF24]'
                              : won
                              ? 'text-[#34D399]'
                              : 'text-[#FB7185]'
                          }`}
                        >
                          {resultMatch.isTie
                            ? 'Draw · Even Effort'
                            : won
                            ? 'Victory · Verified Winner'
                            : 'Defeat · Duel Concluded'}
                        </p>
                        <h2 className="text-2xl font-bold text-white mt-1">
                          {resultMatch.exerciseName} 1v1 Results
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          {resultMatch.forfeitByUserId
                            ? resultMatch.forfeitByUserId === myUserId
                              ? 'Ended via safe early stop.'
                              : `${opName} stopped early (forfeit victory).`
                            : 'Full duel clock completed · All points verified server-side.'}
                        </p>
                      </div>

                      {typeof myDelta === 'number' && (
                        <div className="px-5 py-3 rounded-xl bg-[#0D0D18] border border-white/10 text-right">
                          <p className="text-[11px] text-slate-400">Elo Rating Update</p>
                          <p className="text-xl font-bold text-white tabular-nums">
                            {myRatingBefore ?? profile?.rating ?? 1200} →{' '}
                            {myRatingAfter ?? profile?.rating ?? 1200}
                            <span
                              className={`ml-2 text-sm ${
                                myDelta >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
                              }`}
                            >
                              ({myDelta >= 0 ? `+${myDelta}` : myDelta})
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`p-5 rounded-xl bg-[#0D0D18] border ${
                          won ? 'border-[#34D399]/50' : 'border-white/10'
                        }`}
                      >
                        <p className="text-xs text-[#A78BFA] font-semibold">You</p>
                        <p className="text-lg font-bold text-white mt-0.5">
                          {amChallenger ? resultMatch.challengerName : resultMatch.opponentName}
                        </p>
                        <div className="mt-4 flex items-baseline gap-4">
                          <span className="text-3xl font-black text-white tabular-nums">
                            {myScore} pts
                          </span>
                          <span className="text-sm text-slate-400 tabular-nums">
                            {myReps} verified reps
                          </span>
                        </div>
                      </div>

                      <div
                        className={`p-5 rounded-xl bg-[#0D0D18] border ${
                          !won && !resultMatch.isTie ? 'border-[#34D399]/50' : 'border-white/10'
                        }`}
                      >
                        <p className="text-xs text-[#FB7185] font-semibold">Opponent</p>
                        <p className="text-lg font-bold text-white mt-0.5">{opName}</p>
                        <div className="mt-4 flex items-baseline gap-4">
                          <span className="text-3xl font-black text-white tabular-nums">
                            {opScore} pts
                          </span>
                          <span className="text-sm text-slate-400 tabular-nums">
                            {opReps} verified reps
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setResultMatchId(null);
                          }}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white text-sm font-bold cursor-pointer whitespace-nowrap"
                        >
                          Find Another Rival
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRematch(resultMatch.id)}
                          disabled={busyAction === `rematch-${resultMatch.id}`}
                          className="px-5 py-3 rounded-xl border border-[#D6A84B]/40 bg-[#D6A84B]/10 hover:bg-[#D6A84B]/20 text-[#E8CF96] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Rematch Opponent</span>
                        </button>
                      </div>

                      {resultMatch.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeMatchId(resultMatch.id);
                            setDisputeReason('');
                          }}
                          className="text-xs text-slate-400 hover:text-[#FB7185] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Report Fair-Play Issue</span>
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* HISTORY & HEAD-TO-HEAD TAB                                            */}
      {/* ===================================================================== */}
      {subView === 'history' && (
        <div className="space-y-6">
          <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Past Exercise Duels</h2>
              <div className="flex items-center gap-1.5 bg-[#0D0D18] p-1 rounded-xl border border-white/10">
                {(['all', 'completed', 'cancelled'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                      historyFilter === f
                        ? 'bg-[#8B5CF6] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {historyMatches.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                No concluded duels recorded yet. Complete a live 1v1 exercise duel to build your
                history.
              </p>
            ) : (
              <div className="space-y-3">
                {historyMatches.map(m => {
                  const amCh = m.challengerId === myUserId;
                  const won = m.winnerId === myUserId;
                  const myScore = amCh ? m.challengerScore : m.opponentScore;
                  const opScore = amCh ? m.opponentScore : m.challengerScore;
                  const myReps = amCh ? m.challengerReps : m.opponentReps;
                  const opReps = amCh ? m.opponentReps : m.challengerReps;
                  const opName = amCh ? m.opponentName : m.challengerName;
                  const opId = amCh ? m.opponentId : m.challengerId;
                  const delta = amCh ? m.challengerRatingDelta : m.opponentRatingDelta;

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-[#0D0D18] border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <span>{m.exerciseName} vs {opName}</span>
                          <span
                            className={`text-xs font-semibold ${
                              m.status !== 'completed'
                                ? 'text-slate-400'
                                : m.isTie
                                ? 'text-[#FBBF24]'
                                : won
                                ? 'text-[#34D399]'
                                : 'text-[#FB7185]'
                            }`}
                          >
                            {m.status === 'completed'
                              ? m.isTie
                                ? 'Draw'
                                : won
                                ? 'Victory'
                                : 'Defeat'
                              : m.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 tabular-nums">
                          Score {myScore} – {opScore} pts · Reps {myReps} – {opReps}
                          {typeof delta === 'number' &&
                            ` · Elo ${delta >= 0 ? `+${delta}` : delta}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {m.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setResultMatchId(m.id);
                              setSubView('duel');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-slate-300 cursor-pointer whitespace-nowrap"
                          >
                            View Breakdown
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleRematch(m.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Rematch
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await blockRivalUser(opId, false);
                            handleActionResult(res, `Blocked ${opName}.`);
                          }}
                          className="p-1.5 rounded-lg border border-white/10 hover:bg-[#FB7185]/15 text-slate-400 hover:text-[#FB7185] cursor-pointer"
                          title="Block player"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {h2hRecords.length > 0 && (
            <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Head-to-Head Rivalries</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {h2hRecords.map(rec => (
                  <div
                    key={rec.opponentId}
                    className="p-4 rounded-xl bg-[#0D0D18] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => openPublicProfile(rec.opponentId)}
                        className="text-sm font-bold text-white hover:text-[#E8CF96] cursor-pointer"
                      >
                        {rec.opponentName}
                      </button>
                      <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {rec.opponentRating} {rec.opponentTier}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-sm font-bold text-white">
                        {rec.wins}W - {rec.losses}L - {rec.ties}T
                      </p>
                      <p className="text-[11px] text-slate-400">{rec.totalMatches} duels</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* RANKINGS TAB                                                          */}
      {/* ===================================================================== */}
      {subView === 'rankings' && (
        <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Competitive Elo Standings</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={lbScope}
                onChange={e => setLbScope(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white"
              >
                <option value="global">Global</option>
                <option value="friends">Friends</option>
                <option value="seasonal">Seasonal</option>
                <option value="weekly">Weekly</option>
              </select>

              <select
                value={lbMode}
                onChange={e => setLbMode(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white"
              >
                <option value="all">All Duel Exercises</option>
                {DUEL_EXERCISE_IDS.map(exId => (
                  <option key={exId} value={exId}>
                    {DUEL_EXERCISES_CATALOG[exId].name}
                  </option>
                ))}
              </select>

              <select
                value={lbDivision}
                onChange={e => setLbDivision(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white"
              >
                <option value="all">All Divisions</option>
                {RANKED_DIVISIONS_CATALOG.map(d => (
                  <option key={d.division} value={d.division}>
                    {d.division}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {lbLoading ? (
            <p className="text-xs text-slate-400 py-8 text-center">Loading competitive standings...</p>
          ) : leaderboardRows.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No ranked competitors found for this filter yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Champion</th>
                    <th className="py-2.5 px-3 font-semibold">Tier</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rating</th>
                    <th className="py-2.5 px-3 font-semibold text-right">W-L-T</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Win %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboardRows.map(row => (
                    <tr
                      key={row.userId}
                      className={row.isCurrent ? 'bg-[#8B5CF6]/10' : 'hover:bg-white/[0.02]'}
                    >
                      <td className="py-3 px-3 font-bold text-slate-300 tabular-nums">
                        {row.rank}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => openPublicProfile(row.userId)}
                          className="font-semibold text-white hover:text-[#E8CF96] cursor-pointer"
                        >
                          {row.username}
                          {row.isCurrent && (
                            <span className="ml-2 text-[11px] text-[#A78BFA]">(You)</span>
                          )}
                        </button>
                      </td>
                      <td
                        className="py-3 px-3 font-medium"
                        style={{ color: TIER_ACCENT_MAP[row.tier] || '#E8CF96' }}
                      >
                        {row.tier}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white tabular-nums">
                        {row.rating}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                        {row.wins}-{row.losses}-{row.ties}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                        {row.winRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SPECTATE TAB                                                          */}
      {/* ===================================================================== */}
      {subView === 'spectate' && (
        <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Live Spectate Arena</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Watch public and friend 1v1 exercise duels in real time and send cheers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshSpectatorMatches()}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-[#0D0D18] hover:bg-white/5 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {spectatorMatches.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No public or friend live duels are active right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spectatorMatches.map(sm => {
                const exDef = getExerciseDef(sm.mode as DuelExerciseId);
                return (
                  <div
                    key={sm.matchId}
                    className="p-5 rounded-xl bg-[#0D0D18] border border-white/10 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{sm.challengeTitle}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {exDef.name} · {sm.isRanked ? 'Ranked' : 'Friendly'}
                        </p>
                      </div>
                      <span className="text-xs text-[#34D399] font-semibold">Live</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#141420] border border-white/5">
                        <p className="font-semibold text-white truncate">{sm.challengerName}</p>
                        <p className="text-lg font-bold text-white tabular-nums mt-1">
                          {sm.challengerScore} pts
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void sendSpectatorCheer({
                                matchId: sm.matchId,
                                targetUserId: sm.challengerId,
                                emoji: '🔥',
                              })
                            }
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] cursor-pointer"
                          >
                            Cheer 🔥 {sm.cheerCounts?.[sm.challengerId] || 0}
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleFollowCompetitor(sm.challengerId)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            title="Follow competitor"
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                followedCompetitorIds.includes(sm.challengerId)
                                  ? 'text-[#FB7185] fill-[#FB7185]'
                                  : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#141420] border border-white/5">
                        <p className="font-semibold text-white truncate">{sm.opponentName}</p>
                        <p className="text-lg font-bold text-white tabular-nums mt-1">
                          {sm.opponentScore} pts
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void sendSpectatorCheer({
                                matchId: sm.matchId,
                                targetUserId: sm.opponentId,
                                emoji: '🔥',
                              })
                            }
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] cursor-pointer"
                          >
                            Cheer 🔥 {sm.cheerCounts?.[sm.opponentId] || 0}
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleFollowCompetitor(sm.opponentId)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            title="Follow competitor"
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                followedCompetitorIds.includes(sm.opponentId)
                                  ? 'text-[#FB7185] fill-[#FB7185]'
                                  : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOURNAMENTS TAB                                                       */}
      {/* ===================================================================== */}
      {subView === 'tournaments' && (
        <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-5 rounded-xl bg-[#0D0D18] border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white">Create Single-Exercise Bracket</h3>
              <input
                type="text"
                value={newTourneyTitle}
                onChange={e => setNewTourneyTitle(e.target.value)}
                placeholder="Tournament title..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141420] border border-white/10 text-xs text-white placeholder-slate-500"
              />
              <input
                type="text"
                value={newTourneySubtitle}
                onChange={e => setNewTourneySubtitle(e.target.value)}
                placeholder="Subtitle (optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141420] border border-white/10 text-xs text-white placeholder-slate-500"
              />
              <select
                value={newTourneyMode}
                onChange={e => setNewTourneyMode(e.target.value as DuelExerciseId)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141420] border border-white/10 text-xs text-white"
              >
                {DUEL_EXERCISE_IDS.map(exId => (
                  <option key={exId} value={exId}>
                    {DUEL_EXERCISES_CATALOG[exId].name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  const res = await createTournament({
                    title: newTourneyTitle,
                    subtitle: newTourneySubtitle || 'Single-Exercise Bracket',
                    mode: newTourneyMode,
                  });
                  if (res.success) {
                    setNewTourneyTitle('');
                    setNewTourneySubtitle('');
                  }
                  handleActionResult(res, 'Bracket created!');
                }}
                disabled={newTourneyTitle.trim().length < 3}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Launch Bracket</span>
              </button>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-sm font-bold text-white">Community Brackets</h3>
              {tournaments.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  No community brackets active yet.
                </p>
              ) : (
                tournaments.map(t => {
                  const joined = t.participants.some(p => p.userId === myUserId);
                  const exDef = getExerciseDef(t.mode as DuelExerciseId);
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#0D0D18] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{t.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                          {exDef.name} · {t.participants.length} players · {t.status}
                        </p>
                      </div>
                      {!joined && t.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await joinTournament(t.id);
                            handleActionResult(res, 'Joined tournament bracket!');
                          }}
                          className="px-4 py-2 rounded-lg bg-[#D6A84B]/20 hover:bg-[#D6A84B]/30 text-[#E8CF96] text-xs font-bold cursor-pointer whitespace-nowrap"
                        >
                          Join Bracket
                        </button>
                      ) : (
                        <span className="text-xs text-[#34D399] font-semibold">
                          {joined ? 'Registered' : 'Concluded'}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fair-Play Dispute Modal */}
      {disputeMatchId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#141420] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Submit Fair-Play Dispute</h3>
            <p className="text-xs text-slate-400">
              Describe any tracking or verification issue observed in this duel.
            </p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={3}
              placeholder="Explain what happened..."
              className="w-full p-3 rounded-xl bg-[#0D0D18] border border-white/10 text-xs text-white placeholder-slate-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisputeMatchId(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await disputeRivalMatch(disputeMatchId, disputeReason);
                  if (res.success) setDisputeMatchId(null);
                  handleActionResult(res, 'Match marked disputed for review.');
                }}
                disabled={disputeReason.trim().length < 8}
                className="px-4 py-2 rounded-xl bg-[#FB7185] disabled:opacity-50 text-[#090910] text-xs font-bold cursor-pointer"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
