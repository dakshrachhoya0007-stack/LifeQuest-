import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  COMPETITIVE_RIVAL_MODES,
  COMPETITIVE_TIERS,
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
  RankedDivisionName,
} from '../../types/game';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgModalWrapper,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';
import {
  AlertTriangle,
  Award,
  Ban,
  Check,
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

type ArenaTab = 'queue' | 'challenge' | 'matches' | 'tournaments' | 'spectate' | 'history' | 'rankings';

const TIER_ACCENT_MAP: Record<CompetitiveTier, string> = COMPETITIVE_TIERS.reduce(
  (acc, item) => {
    acc[item.tier] = item.accentHex;
    return acc;
  },
  {} as Record<CompetitiveTier, string>
);

const formatRemainingTime = (endsAt: string): string => {
  const diff = Math.max(0, Date.parse(endsAt) - Date.now());
  if (diff === 0) return 'Settling';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hours}h left`;
};

export const RivalsView: React.FC = () => {
  const {
    user,
    friends,
    rivalsState,
    rivalsLoading,
    refreshRivalsState,
    joinRivalsQueue,
    cancelRivalsQueue,
    sendDirectRivalChallenge,
    respondRivalInvite,
    cancelRivalInvite,
    endActiveRivalry,
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

  const [arenaTab, setArenaTab] = useState<ArenaTab>('queue');
  const [queueMode, setQueueMode] = useState<CompetitiveRivalMode>('overall_fitness');
  const [showDivisionRoadmap, setShowDivisionRoadmap] = useState(false);

  const [newTourneyTitle, setNewTourneyTitle] = useState('');
  const [newTourneySubtitle, setNewTourneySubtitle] = useState('');
  const [newTourneyMode, setNewTourneyMode] = useState<CompetitiveRivalMode>('overall_fitness');

  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [challengeMode, setChallengeMode] = useState<CompetitiveRivalMode>('overall_fitness');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [targetScore, setTargetScore] = useState<number>(500);
  const [allowRestDays, setAllowRestDays] = useState<boolean>(true);
  const [isRanked, setIsRanked] = useState<boolean>(true);
  const [visibility, setVisibility] = useState<CompetitiveMatchVisibility>('friends');
  const [customNote, setCustomNote] = useState<string>('');
  const [candidateSearch, setCandidateSearch] = useState<string>('');

  const [lbScope, setLbScope] = useState<'global' | 'friends' | 'seasonal' | 'weekly'>('global');
  const [lbMode, setLbMode] = useState<CompetitiveRivalMode | 'all'>('all');
  const [lbDivision, setLbDivision] = useState<RankedDivisionName | 'all'>('all');
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<CompetitiveLeaderboardEntry[] | null>(
    null
  );
  const [lbLoading, setLbLoading] = useState(false);

  const [disputeTarget, setDisputeTarget] = useState<CompetitiveRivalMatch | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void refreshRivalsState();
  }, []);

  const profile = rivalsState?.profile;
  const queueEntry = rivalsState?.queueEntry || null;
  const matches: CompetitiveRivalMatch[] = rivalsState?.matches || [];
  const h2hRecords = rivalsState?.h2hRecords || [];
  const candidates = rivalsState?.candidates || [];
  const events = rivalsState?.events || rivalsState?.recentScores || [];
  const defaultLeaderboard = rivalsState?.leaderboard || [];
  const blockedSet = new Set(rivalsState?.blockedIds || []);

  const acceptedFriends = useMemo(
    () => friends.filter(f => f.status === 'accepted' && !blockedSet.has(f.champion.id)),
    [friends, rivalsState?.blockedIds]
  );

  const selectableOpponents = useMemo(() => {
    const byId = new Map<
      string,
      {
        id: string;
        username: string;
        characterClass: string;
        level: number;
        rating: number;
        tier: CompetitiveTier;
        isFriend: boolean;
        allowNonFriendChallenges: boolean;
      }
    >();

    for (const f of acceptedFriends) {
      const cand = candidates.find(c => c.userId === f.champion.id);
      byId.set(f.champion.id, {
        id: f.champion.id,
        username: f.champion.username,
        characterClass: f.champion.characterClass,
        level: f.champion.level,
        rating: cand?.rating ?? 1200,
        tier: cand?.tier ?? 'Silver',
        isFriend: true,
        allowNonFriendChallenges: true,
      });
    }

    for (const c of candidates) {
      if (c.userId === user?.id || blockedSet.has(c.userId)) continue;
      if (!byId.has(c.userId) && c.allowNonFriendChallenges) {
        byId.set(c.userId, {
          id: c.userId,
          username: c.username,
          characterClass: c.characterClass,
          level: c.level,
          rating: c.rating,
          tier: c.tier,
          isFriend: false,
          allowNonFriendChallenges: c.allowNonFriendChallenges,
        });
      }
    }

    const q = candidateSearch.trim().toLowerCase();
    return Array.from(byId.values()).filter(o =>
      q ? o.username.toLowerCase().includes(q) || o.characterClass.toLowerCase().includes(q) : true
    );
  }, [acceptedFriends, candidates, user?.id, rivalsState?.blockedIds, candidateSearch]);

  useEffect(() => {
    if (!selectedOpponentId && selectableOpponents.length > 0) {
      setSelectedOpponentId(selectableOpponents[0].id);
    }
  }, [selectableOpponents, selectedOpponentId]);

  useEffect(() => {
    const ids = new Set<string>();
    selectableOpponents.forEach(o => ids.add(o.id));
    matches.forEach(m => {
      ids.add(m.challengerId);
      ids.add(m.opponentId);
    });
    defaultLeaderboard.forEach(e => ids.add(e.userId));
    filteredLeaderboard?.forEach(e => ids.add(e.userId));
    if (ids.size > 0) {
      void queryPresencesBatch(Array.from(ids));
    }
  }, [selectableOpponents.length, matches.length, defaultLeaderboard.length]);

  useEffect(() => {
    if (arenaTab === 'tournaments') {
      void refreshTournaments();
    } else if (arenaTab === 'spectate') {
      void refreshSpectatorMatches();
    }
  }, [arenaTab]);

  useEffect(() => {
    if (arenaTab !== 'rankings') return;
    let active = true;
    setLbLoading(true);
    fetchRivalsLeaderboard({
      scope: lbScope,
      mode: lbMode,
      division: lbDivision === 'all' ? undefined : lbDivision,
    }).then(res => {
      if (!active) return;
      if (res.ok && res.leaderboard) {
        setFilteredLeaderboard(res.leaderboard);
      }
      setLbLoading(false);
    });
    return () => {
      active = false;
    };
  }, [arenaTab, lbScope, lbMode, lbDivision]);

  const incomingInvites = matches.filter(
    m => m.status === 'pending' && m.opponentId === user?.id
  );
  const outgoingInvites = matches.filter(
    m => m.status === 'pending' && m.challengerId === user?.id
  );
  const activeDuels = matches.filter(
    m => m.status === 'active' || m.status === 'accepted'
  );
  const historyDuels = matches.filter(
    m =>
      m.status === 'completed' ||
      m.status === 'cancelled' ||
      m.status === 'expired' ||
      m.status === 'disputed'
  );

  const handleJoinQueue = async () => {
    setBusyId('queue');
    setFeedback(null);
    try {
      const res = await joinRivalsQueue(queueMode);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Could not enter matchmaking queue.' });
      } else if (res.matched && res.match) {
        setFeedback({
          type: 'success',
          text: `Opponent found! ${res.match.challengerName} vs ${res.match.opponentName} match started.`,
        });
        setArenaTab('matches');
      } else {
        setFeedback({
          type: 'success',
          text: 'Entered live matchmaking queue. Waiting for a verified real champion in your rating bracket.',
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelQueue = async () => {
    setBusyId('queue-cancel');
    setFeedback(null);
    try {
      const res = await cancelRivalsQueue();
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success ? 'Left matchmaking queue.' : res.error || 'Could not cancel queue.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSendDirectChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = selectableOpponents.find(o => o.id === selectedOpponentId);
    if (!target) {
      setFeedback({ type: 'error', text: 'Select an eligible opponent to challenge.' });
      return;
    }
    setBusyId('challenge-send');
    setFeedback(null);
    try {
      const modeMeta =
        COMPETITIVE_RIVAL_MODES.find(m => m.id === challengeMode) || COMPETITIVE_RIVAL_MODES[0];
      const res = await sendDirectRivalChallenge({
        opponentId: target.id,
        opponentName: target.username,
        mode: challengeMode,
        challengeType: modeMeta.legacyChallengeType,
        visibility,
        rules: {
          durationDays,
          targetScore,
          allowRestDays,
          ranked: isRanked,
          customFocusNote: customNote.trim() || undefined,
        },
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Sent ${isRanked ? 'Ranked' : 'Unranked'} ${modeMeta.title} challenge to ${target.username}.`,
        });
        setArenaTab('matches');
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not send challenge.' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRespond = async (matchId: string, decision: 'accept' | 'decline') => {
    setBusyId(matchId);
    setFeedback(null);
    try {
      const res = await respondRivalInvite(matchId, decision);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success
          ? decision === 'accept'
            ? 'Competitive match accepted. Verified activities now tally head-to-head match points.'
            : 'Match invitation declined.'
          : res.error || 'Action failed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRematch = async (matchId: string) => {
    setBusyId(`rematch-${matchId}`);
    setFeedback(null);
    try {
      const res = await rematchRival(matchId);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success ? 'Rematch challenge sent!' : res.error || 'Could not send rematch.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeTarget || disputeReason.trim().length < 6) {
      setFeedback({ type: 'error', text: 'Enter a clear dispute reason (at least 6 characters).' });
      return;
    }
    setBusyId(`dispute-${disputeTarget.id}`);
    try {
      const res = await disputeRivalMatch(disputeTarget.id, disputeReason.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          text: 'Match marked disputed and Elo ratings safely reverted pending review.',
        });
        setDisputeTarget(null);
        setDisputeReason('');
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not file match dispute.' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!profile) return;
    setBusyId('privacy');
    try {
      const next = !profile.allowNonFriendChallenges;
      const res = await updateRivalsPrivacy(next);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success
          ? next
            ? 'Open Arena Challenges enabled: non-friends can now send direct ranked challenges.'
            : 'Friends-Only Challenges enabled: only accepted friends may challenge you directly.'
          : res.error || 'Could not update arena privacy.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleClaimDivisionReward = async (division: RankedDivisionName) => {
    setBusyId(`div-${division}`);
    setFeedback(null);
    try {
      const res = await claimRankedDivisionReward(division);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success
          ? `Claimed ${division} Division reward${res.rewardTitleName ? `: ${res.rewardTitleName}` : ''}!`
          : res.error || 'Could not claim division reward.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTourneyTitle.trim().length < 3) {
      setFeedback({ type: 'error', text: 'Tournament title must be at least 3 characters.' });
      return;
    }
    setBusyId('create-tourney');
    setFeedback(null);
    try {
      const res = await createTournament({
        title: newTourneyTitle.trim(),
        subtitle: newTourneySubtitle.trim() || undefined,
        mode: newTourneyMode,
      });
      if (res.success) {
        setFeedback({ type: 'success', text: 'Community tournament opened for real competitors.' });
        setNewTourneyTitle('');
        setNewTourneySubtitle('');
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not create tournament.' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleJoinTournament = async (tournamentId: string) => {
    setBusyId(`join-tourney-${tournamentId}`);
    setFeedback(null);
    try {
      const res = await joinTournament(tournamentId);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success ? 'Entered tournament bracket!' : res.error || 'Could not join tournament.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCheer = async (matchId: string, targetUserId: string, emoji: string) => {
    setBusyId(`cheer-${matchId}-${targetUserId}-${emoji}`);
    setFeedback(null);
    try {
      const res = await sendSpectatorCheer({ matchId, targetUserId, emoji });
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Could not send spectator cheer.' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    setBusyId(`follow-${targetUserId}`);
    try {
      const res = await toggleFollowCompetitor(targetUserId);
      if (!res.success && res.error) {
        setFeedback({ type: 'error', text: res.error });
      }
    } finally {
      setBusyId(null);
    }
  };

  const playerRating = profile?.rating ?? 1200;
  const playerTier: CompetitiveTier = profile?.tier ?? 'Silver';
  const playerDivision = computeRankedDivision(playerRating);
  const playerDivisionMeta =
    RANKED_DIVISIONS_CATALOG.find(d => d.division === playerDivision) || RANKED_DIVISIONS_CATALOG[1];
  const placementPlayed = profile?.placementMatchesPlayed ?? profile?.matchesPlayed ?? 0;
  const placementDone = Boolean(profile?.placementCompleted || placementPlayed >= PLACEMENT_MATCHES_REQUIRED);
  const demotionShieldRemaining = profile?.demotionShieldRemaining ?? 0;
  const tierHex = TIER_ACCENT_MAP[playerTier] || playerDivisionMeta.accentHex || '#F59E0B';
  const wins = profile?.wins ?? rivalsState?.stats.wins ?? 0;
  const losses = profile?.losses ?? rivalsState?.stats.losses ?? 0;
  const ties = profile?.ties ?? rivalsState?.stats.ties ?? 0;
  const winRate = profile?.winRate ?? 0;
  const currentStreak = profile?.currentStreak ?? 0;
  const peakRating = profile?.peakRating ?? playerRating;

  const displayedLeaderboard = filteredLeaderboard ?? defaultLeaderboard;

  return (
    <div className="space-y-6 pb-12">
      {/* Arena Hero Header — Isolated Competitive Domain */}
      <FeatureBanner themeId="rivals" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#061225] border border-[#F43F5E]/45 flex items-center justify-center shrink-0">
              <GoldenWorldTreeEmblem className="w-9 h-9" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#F43F5E] font-semibold">
                <span className="font-['Cinzel'] uppercase tracking-widest">
                  Competitive Arena
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="text-[#94A8C7]">
                  Isolated 1v1 Elo Ladder · Rating &amp; H2H Only (Zero XP/Gold)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF] mt-0.5">
                Rivals Arena
              </h1>
              <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
                Compete head-to-head against real champions using server-verified fitness telemetry. Matches award Elo Rating, Competitive Tiers, and Head-to-Head Prestige—never Boss damage, Player XP, or Gold.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={busyId === 'privacy' || !profile}
              onClick={() => void handleTogglePrivacy()}
              className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle whether non-friends can challenge you directly"
            >
              {profile?.allowNonFriendChallenges !== false ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
                  Open Challenges On
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#FBBF24]" />
                  Friends-Only Challenges
                </>
              )}
            </button>
            <button
              type="button"
              disabled={rivalsLoading}
              onClick={() => void refreshRivalsState()}
              className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold text-[#38D9F5] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rivalsLoading ? 'animate-spin' : ''}`} />
              Sync Arena
            </button>
          </div>
        </div>

        {/* Rating & Competitive Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-[#1E3A63]">
          <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5">
            <span className="text-[11px] text-[#94A8C7] block">Arena Elo &amp; Division</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black font-mono text-[#F2F7FF] tabular-nums">
                <AnimatedCounter value={playerRating} />
              </span>
              <span className="text-xs font-bold uppercase" style={{ color: tierHex }}>
                {playerDivision}
              </span>
            </div>
            <span className="text-[10px] text-[#647A9E] tabular-nums block mt-0.5">
              {placementDone
                ? demotionShieldRemaining > 0
                  ? `Shield: ${demotionShieldRemaining} games`
                  : `${playerTier} Bracket`
                : `Placement ${Math.min(placementPlayed, PLACEMENT_MATCHES_REQUIRED)}/${PLACEMENT_MATCHES_REQUIRED}`}
            </span>
          </div>
          <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5">
            <span className="text-[11px] text-[#94A8C7] block">Match Record</span>
            <span className="text-xl font-bold font-mono text-[#FBBF24] tabular-nums mt-0.5 block">
              {wins}-{losses}-{ties}
            </span>
          </div>
          <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5">
            <span className="text-[11px] text-[#94A8C7] block">Win Rate</span>
            <span className="text-xl font-bold font-mono text-[#F2F7FF] tabular-nums mt-0.5 block">
              {winRate}%
            </span>
          </div>
          <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5">
            <span className="text-[11px] text-[#94A8C7] block">Win Streak</span>
            <span className="text-xl font-bold font-mono text-[#10B981] tabular-nums mt-0.5 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#F59E0B]" />
              {currentStreak}
            </span>
          </div>
          <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5">
            <span className="text-[11px] text-[#94A8C7] block">Peak Rating</span>
            <span className="text-xl font-bold font-mono text-[#FBBF24] tabular-nums mt-0.5 block">
              {peakRating}
            </span>
          </div>
          <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5">
            <span className="text-[11px] text-[#94A8C7] block">Active Matches</span>
            <span className="text-xl font-bold font-mono text-[#F2F7FF] tabular-nums mt-0.5 block">
              {activeDuels.length}
              {incomingInvites.length > 0 ? ` (${incomingInvites.length} pending)` : ''}
            </span>
          </div>
        </div>

        {/* Collapsible 7-Division Ranked Roadmap */}
        <div className="pt-2 border-t border-[#1E3A63]">
          <button
            type="button"
            onClick={() => setShowDivisionRoadmap(v => !v)}
            className="text-xs font-semibold text-[#F2F7FF] hover:text-[#38D9F5] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>Ranked Divisions &amp; Milestone Rewards (7 Tiers)</span>
            {showDivisionRoadmap ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showDivisionRoadmap && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 mt-3">
              {RANKED_DIVISIONS_CATALOG.map(div => {
                const isCurrent = div.division === playerDivision;
                const unlocked = Math.max(playerRating, peakRating) >= div.minRating;
                return (
                  <div
                    key={div.division}
                    className={`rounded-xl p-3 border space-y-2 transition-all ${
                      isCurrent
                        ? 'bg-[#102440] border-[#00D9FF]'
                        : unlocked
                        ? 'bg-[#0A1930] border-[#F43F5E]/40'
                        : 'bg-[#061225] border-[#1E3A63] opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-['Cinzel'] font-bold text-xs"
                        style={{ color: div.accentHex }}
                      >
                        {div.division}
                      </span>
                      <span className="text-[10px] font-mono text-[#94A8C7] tabular-nums">
                        {div.maxRating ? `${div.minRating}–${div.maxRating}` : `${div.minRating}+`}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#F2F7FF] truncate">
                      {div.rewardTitleName}
                    </p>
                    <button
                      type="button"
                      disabled={!unlocked || busyId === `div-${div.division}`}
                      onClick={() => void handleClaimDivisionReward(div.division)}
                      className={`lq-btn w-full py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                        unlocked
                          ? 'lq-btn-gold cursor-pointer'
                          : 'bg-[#0A1930] text-[#647A9E] border border-[#1E3A63] cursor-not-allowed'
                      }`}
                    >
                      {unlocked
                        ? busyId === `div-${div.division}`
                          ? 'Claiming...'
                          : 'Claim Title'
                        : 'Locked'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FeatureBanner>

      {/* Arena Navigation Tabs */}
      <FeatureTabBar
        themeId="rivals"
        layoutId="rivals-arena-tab"
        activeId={arenaTab}
        onSelect={setArenaTab}
        tabs={[
          { id: 'queue', label: 'Arena & Queue', icon: Dumbbell },
          { id: 'challenge', label: 'Direct Challenge', icon: Target },
          {
            id: 'matches',
            label: 'Matches',
            icon: Trophy,
            badge: activeDuels.length + incomingInvites.length,
          },
          { id: 'tournaments', label: 'Tournaments', icon: Award },
          { id: 'spectate', label: 'Spectate', icon: Eye },
          { id: 'history', label: 'Archive & H2H', icon: History },
          { id: 'rankings', label: 'Rankings', icon: Crown },
        ]}
        className="w-fit"
      />

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border flex items-center justify-between gap-2 font-medium ${
            feedback.type === 'success'
              ? 'bg-[#10B981]/12 border-[#10B981]/45 text-[#10B981]'
              : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F43F5E]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current/70 hover:text-current cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <RpgSubTabTransition tabKey={arenaTab}>
        {/* TAB 1: ARENA & MATCHMAKING QUEUE */}
        {arenaTab === 'queue' && (
          <div className="space-y-5">
            {queueEntry && queueEntry.status === 'searching' && (
              <div className="lq-card-gold rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#38D9F5]">
                    Live Matchmaking Queue · Real Players Only
                  </div>
                  <p className="text-sm font-bold text-[#F2F7FF]">
                    Searching for {COMPETITIVE_RIVAL_MODES.find(m => m.id === queueEntry.mode)?.title || queueEntry.mode} opponent
                  </p>
                  <p className="text-xs text-[#94A8C7] font-mono tabular-nums">
                    Your Rating: {queueEntry.ratingSnapshot} · Bracket: {queueEntry.minRating} – {queueEntry.maxRating} · Expanding +75 every 10s
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === 'queue-cancel'}
                  onClick={() => void handleCancelQueue()}
                  className="lq-btn px-4 py-2 rounded-xl bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 border border-[#F43F5E]/45 text-[#F43F5E] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Leave Queue
                </button>
              </div>
            )}

            <div className="lq-surface rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                    Select Competitive Match Format
                  </h2>
                  <p className="text-xs text-[#94A8C7] mt-0.5">
                    Pairs you with a real player inside your Elo window (zero AI bots or simulated opponents).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === 'queue' || queueEntry?.status === 'searching'}
                  onClick={() => void handleJoinQueue()}
                  className="lq-btn lq-btn-gold px-5 py-2.5 rounded-xl disabled:opacity-50 font-['Cinzel'] font-bold text-xs tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {queueEntry?.status === 'searching'
                    ? 'Searching Queue...'
                    : busyId === 'queue'
                    ? 'Entering...'
                    : 'Find Ranked Match'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {COMPETITIVE_RIVAL_MODES.map(mode => {
                  const selected = queueMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setQueueMode(mode.id)}
                      className={`text-left rounded-xl p-4 border transition-all space-y-1.5 cursor-pointer ${
                        selected
                          ? 'bg-[#102440] border-[#00D9FF] shadow-[0_0_16px_rgba(0,217,255,0.18)]'
                          : 'bg-[#061225] border-[#1E3A63] hover:border-[#1677FF]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-['Cinzel'] font-bold text-[#F2F7FF]">
                          {mode.title}
                        </span>
                        <span className="font-mono text-[11px] text-[#38D9F5] tabular-nums">
                          {mode.defaultDurationDays}d
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#F43F5E]">{mode.subtitle}</p>
                      <p className="text-xs text-[#94A8C7] leading-relaxed">
                        {mode.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT CHALLENGE */}
        {arenaTab === 'challenge' && (
          <div className="lq-surface rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                  Direct Rival Challenge
                </h2>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Issue a customized head-to-head challenge to an accepted friend or open-challenge player.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#647A9E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                  placeholder="Filter opponents..."
                  className="lq-input w-full pl-8 pr-3 py-2 text-xs"
                />
              </div>
            </div>

            {selectableOpponents.length === 0 ? (
              <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-5 text-xs text-[#94A8C7] flex items-center gap-3">
                <Users className="w-4 h-4 text-[#38D9F5] shrink-0" />
                No eligible opponents matched right now. Add friends in the Friends tab or discover open-challenge champions as more players enter the Arena.
              </div>
            ) : (
              <form onSubmit={handleSendDirectChallenge} className="space-y-4">
                {/* Opponent Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectableOpponents.map(opp => {
                    const presence = getPlayerPresence(opp.id);
                    const chosen = selectedOpponentId === opp.id;
                    return (
                      <button
                        key={opp.id}
                        type="button"
                        onClick={() => setSelectedOpponentId(opp.id)}
                        className={`text-left rounded-xl p-3 border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          chosen
                            ? 'bg-[#102440] border-[#00D9FF]'
                            : 'bg-[#061225] border-[#1E3A63] hover:border-[#1677FF]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <PresenceBadge status={presence.status} size="xs" />
                            <span className="text-xs font-bold text-[#F2F7FF] truncate">
                              {opp.username}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94A8C7] tabular-nums mt-0.5">
                            Lv.{opp.level} · {opp.characterClass} · {opp.isFriend ? 'Friend' : 'Open Arena'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-[#FBBF24] tabular-nums block">
                            {opp.rating}
                          </span>
                          <span className="text-[10px] text-[#647A9E]">{opp.tier}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Match Rule Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1E3A63]">
                  <div>
                    <label className="text-[11px] text-[#94A8C7] font-semibold block mb-1">
                      Duel Mode
                    </label>
                    <select
                      value={challengeMode}
                      onChange={e => {
                        const nextMode = e.target.value as CompetitiveRivalMode;
                        setChallengeMode(nextMode);
                        const def = COMPETITIVE_RIVAL_MODES.find(m => m.id === nextMode);
                        if (def) {
                          setDurationDays(def.defaultDurationDays);
                          setTargetScore(def.defaultTargetScore);
                        }
                      }}
                      className="lq-input w-full px-3 py-2 text-xs"
                    >
                      {COMPETITIVE_RIVAL_MODES.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#94A8C7] font-semibold block mb-1">
                      Duration (3–14 Days)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={14}
                      value={durationDays}
                      onChange={e => setDurationDays(Math.max(3, Math.min(14, Number(e.target.value) || 7)))}
                      className="lq-input w-full px-3 py-2 text-xs font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#94A8C7] font-semibold block mb-1">
                      Target Score Cap (100–2000)
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={2000}
                      step={25}
                      value={targetScore}
                      onChange={e => setTargetScore(Math.max(100, Math.min(2000, Number(e.target.value) || 500)))}
                      className="lq-input w-full px-3 py-2 text-xs font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#94A8C7] font-semibold block mb-1">
                      Visibility
                    </label>
                    <select
                      value={visibility}
                      onChange={e => setVisibility(e.target.value as CompetitiveMatchVisibility)}
                      className="lq-input w-full px-3 py-2 text-xs"
                    >
                      <option value="friends">Friends Visible</option>
                      <option value="public">Public Arena Log</option>
                      <option value="private">Private (Participants Only)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#94A8C7]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRanked}
                        onChange={e => setIsRanked(e.target.checked)}
                        className="accent-[#1677FF]"
                      />
                      <span>Ranked Elo Match</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowRestDays}
                        onChange={e => setAllowRestDays(e.target.checked)}
                        className="accent-[#1677FF]"
                      />
                      <span>Healthy Recovery Rest Days Allowed</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={busyId === 'challenge-send' || !selectedOpponentId}
                    className="lq-btn lq-btn-gold px-5 py-2.5 rounded-xl disabled:opacity-50 font-['Cinzel'] font-bold text-xs tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {busyId === 'challenge-send' ? 'Sending...' : 'Send Direct Challenge'}
                  </button>
                </div>

                {challengeMode === 'custom' && (
                  <div>
                    <label className="text-[11px] text-[#94A8C7] font-semibold block mb-1">
                      Custom Match Stipulation (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={customNote}
                      onChange={e => setCustomNote(e.target.value)}
                      placeholder="e.g. Clean form workouts & minimum 1 recovery stretch"
                      className="lq-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE & PENDING MATCHES */}
        {arenaTab === 'matches' && (
          <div className="space-y-5">
            {(incomingInvites.length > 0 || outgoingInvites.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {incomingInvites.length > 0 && (
                  <div className="lq-surface rounded-2xl p-5 space-y-3">
                    <h3 className="font-['Cinzel'] font-bold text-sm text-[#38D9F5]">
                      Incoming Challenges ({incomingInvites.length})
                    </h3>
                    {incomingInvites.map(inv => {
                      const presence = getPlayerPresence(inv.challengerId);
                      return (
                        <div
                          key={inv.id}
                          className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <PresenceBadge status={presence.status} size="xs" />
                              <button
                                type="button"
                                onClick={() => openPublicProfile(inv.challengerId)}
                                className="text-xs font-bold text-[#F2F7FF] hover:text-[#38D9F5] truncate transition-colors cursor-pointer"
                              >
                                {inv.challengerName}
                              </button>
                              <span className="text-xs text-[#94A8C7]">
                                · {inv.challengeTitle}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#647A9E] font-mono tabular-nums mt-0.5">
                              {inv.isRanked ? 'Ranked Elo' : 'Casual'} · {inv.rules.durationDays}d · Target {inv.rules.targetScore} pts
                              {inv.challengerRatingSnapshot ? ` · ${inv.challengerRatingSnapshot} Elo` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() => void handleRespond(inv.id, 'accept')}
                              className="lq-btn px-2.5 py-1.5 rounded-lg bg-[#10B981] hover:brightness-110 text-[#061225] text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept
                            </button>
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() => void handleRespond(inv.id, 'decline')}
                              className="lq-btn px-2.5 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#F43F5E]/15 border border-[#F43F5E]/45 text-[#F43F5E] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {outgoingInvites.length > 0 && (
                  <div className="lq-surface rounded-2xl p-5 space-y-3">
                    <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                      Sent Challenges ({outgoingInvites.length})
                    </h3>
                    {outgoingInvites.map(inv => (
                      <div
                        key={inv.id}
                        className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2F7FF] truncate">
                            To {inv.opponentName} · {inv.challengeTitle}
                          </p>
                          <p className="text-[11px] text-[#647A9E] font-mono tabular-nums mt-0.5">
                            {inv.isRanked ? 'Ranked' : 'Casual'} · {inv.rules.durationDays}d · Awaiting response
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void cancelRivalInvite(inv.id)}
                          className="lq-btn px-3 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#F43F5E]/15 border border-[#F43F5E]/45 text-xs text-[#F43F5E] font-semibold shrink-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Head-to-Head Duels */}
            <div className="lq-surface rounded-2xl p-5 space-y-4">
              <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#F43F5E]" />
                Active Competitive Matches
              </h2>

              {activeDuels.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-[#94A8C7]">
                    No active matches right now. Enter the matchmaking queue or challenge a rival directly.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setArenaTab('queue')}
                      className="lq-btn lq-btn-gold px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Matchmaking Queue
                    </button>
                    <button
                      type="button"
                      onClick={() => setArenaTab('challenge')}
                      className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Direct Challenge
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeDuels.map(m => {
                    const amChallenger = m.challengerId === user?.id;
                    const myScore = amChallenger ? m.challengerScore : m.opponentScore;
                    const theirScore = amChallenger ? m.opponentScore : m.challengerScore;
                    const theirName = amChallenger ? m.opponentName : m.challengerName;
                    const theirId = amChallenger ? m.opponentId : m.challengerId;
                    const theirRating = amChallenger
                      ? m.opponentRatingSnapshot
                      : m.challengerRatingSnapshot;
                    const total = Math.max(1, myScore + theirScore);
                    const myShare = Math.round((myScore / total) * 100);
                    const theirPresence = getPlayerPresence(theirId);

                    return (
                      <div
                        key={m.id}
                        className="lq-card rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-['Cinzel'] font-bold text-[#38D9F5]">
                              {m.challengeTitle} · {m.isRanked ? 'Ranked' : 'Unranked'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-sm font-bold text-[#F2F7FF]">You vs</span>
                              <PresenceBadge status={theirPresence.status} size="xs" />
                              <button
                                type="button"
                                onClick={() => openPublicProfile(theirId)}
                                className="text-sm font-bold text-[#38D9F5] hover:underline truncate cursor-pointer"
                              >
                                {theirName}
                              </button>
                              {theirRating && (
                                <span className="text-[11px] font-mono text-[#94A8C7] tabular-nums">
                                  ({theirRating})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-[#94A8C7] flex items-center gap-1 tabular-nums shrink-0">
                            <Clock className="w-3 h-3" /> {formatRemainingTime(m.endsAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm font-mono font-bold tabular-nums">
                          <span className="text-[#10B981]">
                            {myScore} pts <span className="text-[10px] font-sans font-normal text-[#94A8C7]">(You)</span>
                          </span>
                          <span className="text-[11px] text-[#647A9E] font-sans">
                            Goal {m.rules.targetScore} pts
                          </span>
                          <span className="text-[#F43F5E]">
                            {theirScore} pts <span className="text-[10px] font-sans font-normal text-[#94A8C7]">({theirName})</span>
                          </span>
                        </div>

                        <AnimatedProgressBar
                          percentage={myShare}
                          className="h-2 w-full rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                          barClassName="bg-[#10B981]"
                          shimmer={false}
                        />

                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[#94A8C7]">
                          <span>
                            {m.rules.allowRestDays ? 'Rest-day safe scoring' : 'Full active output'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void endActiveRivalry(m.id)}
                              className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                            >
                              Settle Match
                            </button>
                            <button
                              type="button"
                              onClick={() => void blockRivalUser(theirId)}
                              className="lq-btn px-2.5 py-1 rounded-lg bg-[#F43F5E]/12 hover:bg-[#F43F5E]/22 text-[#F43F5E] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" /> Block
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MATCH ARCHIVE & HEAD-TO-HEAD MATRIX */}
        {arenaTab === 'history' && (
          <div className="space-y-5">
            <div className="lq-surface rounded-2xl p-5 space-y-3">
              <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#F59E0B]" />
                Head-to-Head Rivalries ({h2hRecords.length})
              </h2>
              {h2hRecords.length === 0 ? (
                <p className="text-xs text-[#94A8C7]">
                  Complete matches against rivals to build your lifetime Head-to-Head ledger.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {h2hRecords.map(h => (
                    <div
                      key={h.opponentId}
                      className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openPublicProfile(h.opponentId)}
                          className="text-xs font-bold text-[#F2F7FF] hover:text-[#38D9F5] truncate block transition-colors cursor-pointer"
                        >
                          {h.opponentName}
                        </button>
                        <span className="text-[11px] text-[#94A8C7] font-mono tabular-nums">
                          {h.opponentRating} Elo · {h.opponentTier}
                        </span>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className="text-sm font-bold text-[#FBBF24]">
                          {h.wins}W - {h.losses}L - {h.ties}T
                        </span>
                        <span className="text-[10px] text-[#647A9E] block">
                          {h.totalMatches} matches
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lq-surface rounded-2xl p-5 space-y-3">
              <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F59E0B]" />
                Completed &amp; Archived Matches ({historyDuels.length})
              </h2>
              {historyDuels.length === 0 ? (
                <p className="text-xs text-[#94A8C7]">No finished matches archived yet.</p>
              ) : (
                <div className="space-y-2">
                  {historyDuels.slice(0, 20).map(m => {
                    const amChallenger = m.challengerId === user?.id;
                    const myScore = amChallenger ? m.challengerScore : m.opponentScore;
                    const theirScore = amChallenger ? m.opponentScore : m.challengerScore;
                    const theirName = amChallenger ? m.opponentName : m.challengerName;
                    const theirId = amChallenger ? m.opponentId : m.challengerId;
                    const myDelta = amChallenger
                      ? m.challengerRatingDelta
                      : m.opponentRatingDelta;
                    const verdict =
                      m.status === 'completed'
                        ? m.isTie
                          ? 'Draw'
                          : m.winnerId === user?.id
                          ? 'Victory'
                          : 'Defeat'
                        : m.status.toUpperCase();

                    return (
                      <div
                        key={m.id}
                        className="rounded-xl bg-[#061225] border border-[#1E3A63] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#F2F7FF]">{m.challengeTitle}</span>
                            <span className="text-[#94A8C7]">vs</span>
                            <button
                              type="button"
                              onClick={() => openPublicProfile(theirId)}
                              className="font-semibold text-[#38D9F5] hover:underline cursor-pointer"
                            >
                              {theirName}
                            </button>
                            <span className="text-[11px] font-mono text-[#647A9E]">
                              {m.isRanked ? 'Ranked' : 'Unranked'}
                            </span>
                          </div>
                          {m.disputeReason && (
                            <p className="text-[11px] text-[#FBBF24] mt-0.5">
                              Dispute note: {m.disputeReason}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums shrink-0">
                          <span className="text-[#F2F7FF]">
                            {myScore} – {theirScore}
                          </span>
                          {typeof myDelta === 'number' && m.isRanked && m.status === 'completed' && (
                            <span
                              className={
                                myDelta >= 0 ? 'text-[#10B981] font-bold' : 'text-[#F43F5E] font-bold'
                              }
                            >
                              {myDelta >= 0 ? `+${myDelta}` : myDelta} Elo
                            </span>
                          )}
                          <span
                            className={`font-bold ${
                              verdict === 'Victory'
                                ? 'text-[#10B981]'
                                : verdict === 'Defeat'
                                ? 'text-[#F43F5E]'
                                : verdict === 'DISPUTED'
                                ? 'text-[#FBBF24]'
                                : 'text-[#F59E0B]'
                            }`}
                          >
                            {verdict}
                          </span>
                          {m.status === 'completed' && (
                            <div className="flex items-center gap-1.5 font-sans">
                              <button
                                type="button"
                                disabled={busyId === `rematch-${m.id}`}
                                onClick={() => void handleRematch(m.id)}
                                className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-[#38D9F5]" /> Rematch
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeTarget(m);
                                  setDisputeReason('');
                                }}
                                className="lq-btn lq-btn-secondary px-2 py-1 rounded-lg hover:text-[#F43F5E] text-[11px] cursor-pointer"
                              >
                                Dispute
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {events.length > 0 && (
              <div className="lq-surface rounded-2xl p-5 space-y-2.5">
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#38D9F5]">
                  Recent Server-Verified Match Telemetry
                </h3>
                <div className="divide-y divide-[#1E3A63]">
                  {events.slice(0, 10).map(ev => (
                    <div key={ev.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="text-[#94A8C7]">
                        {ev.label} · {ev.activityType.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono font-bold text-[#10B981] tabular-nums">
                        +{ev.pointsAwarded} match pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: COMMUNITY TOURNAMENTS */}
        {arenaTab === 'tournaments' && (
          <div className="space-y-5">
            <div className="lq-surface rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#F59E0B]" />
                    Community Tournaments
                  </h2>
                  <p className="text-xs text-[#94A8C7] mt-0.5">
                    Multi-round brackets composed strictly of real verified LIFEQUEST competitors (zero AI bots or simulated opponents).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshTournaments()}
                  className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Refresh Brackets
                </button>
              </div>

              <form
                onSubmit={handleCreateTournament}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1E3A63]"
              >
                <input
                  type="text"
                  maxLength={60}
                  value={newTourneyTitle}
                  onChange={e => setNewTourneyTitle(e.target.value)}
                  placeholder="Host Tournament Title..."
                  className="lq-input px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  maxLength={80}
                  value={newTourneySubtitle}
                  onChange={e => setNewTourneySubtitle(e.target.value)}
                  placeholder="Theme or stipulation (optional)"
                  className="lq-input px-3 py-2 text-xs"
                />
                <select
                  value={newTourneyMode}
                  onChange={e => setNewTourneyMode(e.target.value as CompetitiveRivalMode)}
                  className="lq-input px-3 py-2 text-xs"
                >
                  {COMPETITIVE_RIVAL_MODES.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busyId === 'create-tourney'}
                  className="lq-btn lq-btn-gold px-4 py-2 rounded-xl disabled:opacity-50 font-['Cinzel'] font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {busyId === 'create-tourney' ? 'Opening...' : 'Host Bracket'}
                </button>
              </form>
            </div>

            {tournaments.length === 0 ? (
              <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#94A8C7]">
                No active community brackets yet. Host the first verified tournament above!
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map(t => {
                  const isJoined = t.participants.some(p => p.userId === user?.id);
                  return (
                    <div
                      key={t.id}
                      className="lq-card rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[#38D9F5]">
                            <span>{t.status}</span>
                            <span>·</span>
                            <span>{t.mode.replace('_', ' ')}</span>
                            <span>·</span>
                            <span className="tabular-nums font-mono">{t.participants.length} Real Competitors</span>
                          </div>
                          <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] mt-0.5">
                            {t.title}
                          </h3>
                          {t.subtitle && (
                            <p className="text-xs text-[#94A8C7] mt-0.5">{t.subtitle}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isJoined || busyId === `join-tourney-${t.id}`}
                          onClick={() => void handleJoinTournament(t.id)}
                          className={`lq-btn px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                            isJoined
                              ? 'bg-[#10B981]/12 border border-[#10B981]/45 text-[#10B981]'
                              : 'lq-btn-gold cursor-pointer'
                          }`}
                        >
                          {isJoined
                            ? 'Registered'
                            : busyId === `join-tourney-${t.id}`
                            ? 'Joining...'
                            : 'Join Tournament'}
                        </button>
                      </div>

                      {t.matches.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#1E3A63]">
                          {t.matches.map(bm => (
                            <div
                              key={bm.id}
                              className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[10px] text-[#38D9F5] uppercase font-semibold">
                                <span>{bm.roundLabel}</span>
                                <span>{bm.status}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#F2F7FF] truncate">
                                  {bm.playerAName}{' '}
                                  <span className="text-[10px] font-mono text-[#647A9E]">
                                    ({bm.playerARating})
                                  </span>
                                </span>
                                <span className="font-mono font-bold text-[#FBBF24] tabular-nums">
                                  {bm.playerAScore}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#94A8C7] truncate">
                                  {bm.playerBId ? bm.playerBName : 'Awaiting Opponent'}
                                  {bm.playerBRating ? (
                                    <span className="text-[10px] font-mono text-[#647A9E] ml-1">
                                      ({bm.playerBRating})
                                    </span>
                                  ) : null}
                                </span>
                                <span className="font-mono font-bold text-[#F43F5E] tabular-nums">
                                  {bm.playerBScore}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: READ-ONLY SPECTATOR MODE & CHEERING */}
        {arenaTab === 'spectate' && (
          <div className="space-y-4">
            <div className="lq-surface rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#38D9F5]" />
                  Arena Spectator Gallery
                </h2>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Follow top competitors and watch live public/friends Rivals matches in read-only mode. Send encouraging cheers without influencing match scores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshSpectatorMatches()}
                className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Refresh Live Matches
              </button>
            </div>

            {spectatorMatches.length === 0 ? (
              <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#94A8C7]">
                No public or friends-visible matches are currently live to spectate.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {spectatorMatches.map(m => {
                  const total = Math.max(1, m.challengerScore + m.opponentScore);
                  const cShare = Math.round((m.challengerScore / total) * 100);
                  const followingChallenger = followedCompetitorIds.includes(m.challengerId);
                  const followingOpponent = followedCompetitorIds.includes(m.opponentId);
                  return (
                    <div
                      key={m.matchId}
                      className="lq-card rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-['Cinzel'] font-bold text-[#38D9F5]">
                            {m.challengeTitle} · {m.isRanked ? 'Ranked' : 'Casual'} · Read-Only
                          </span>
                          <p className="text-xs text-[#94A8C7] mt-0.5 font-mono tabular-nums">
                            Target {m.targetScore} pts · {formatRemainingTime(m.endsAt)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => openPublicProfile(m.challengerId)}
                              className="font-bold text-[#F2F7FF] hover:text-[#38D9F5] truncate transition-colors cursor-pointer"
                            >
                              {m.challengerName}
                            </button>
                            {m.challengerId !== user?.id && (
                              <button
                                type="button"
                                disabled={busyId === `follow-${m.challengerId}`}
                                onClick={() => void handleToggleFollow(m.challengerId)}
                                className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap transition-colors cursor-pointer ${
                                  followingChallenger
                                    ? 'border-[#10B981]/50 text-[#10B981] bg-[#10B981]/12'
                                    : 'border-[#1E3A63] text-[#38D9F5] hover:border-[#00D9FF]'
                                }`}
                              >
                                {followingChallenger ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[#94A8C7] font-mono tabular-nums">
                            {m.challengerDivision} ({m.challengerRating}) · {m.challengerScore} pts
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(['🔥', '⚔️', '🏆', '💪'] as const).map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => void handleCheer(m.matchId, m.challengerId, emoji)}
                                className="px-2 py-1 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1E3A63] text-xs transition-colors cursor-pointer"
                                title={`Cheer ${m.challengerName}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => openPublicProfile(m.opponentId)}
                              className="font-bold text-[#38D9F5] hover:text-[#F2F7FF] truncate transition-colors cursor-pointer"
                            >
                              {m.opponentName}
                            </button>
                            {m.opponentId !== user?.id && (
                              <button
                                type="button"
                                disabled={busyId === `follow-${m.opponentId}`}
                                onClick={() => void handleToggleFollow(m.opponentId)}
                                className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap transition-colors cursor-pointer ${
                                  followingOpponent
                                    ? 'border-[#10B981]/50 text-[#10B981] bg-[#10B981]/12'
                                    : 'border-[#1E3A63] text-[#38D9F5] hover:border-[#00D9FF]'
                                }`}
                              >
                                {followingOpponent ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[#94A8C7] font-mono tabular-nums">
                            {m.opponentDivision} ({m.opponentRating}) · {m.opponentScore} pts
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(['🔥', '⚔️', '🏆', '💪'] as const).map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => void handleCheer(m.matchId, m.opponentId, emoji)}
                                className="px-2 py-1 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1E3A63] text-xs transition-colors cursor-pointer"
                                title={`Cheer ${m.opponentName}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <AnimatedProgressBar
                        percentage={cShare}
                        className="h-2 w-full rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                        barClassName="bg-[#10B981]"
                        shimmer={false}
                      />

                      {m.recentCheers && m.recentCheers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#94A8C7]">
                          <Heart className="w-3 h-3 text-[#F43F5E] shrink-0" />
                          {m.recentCheers.slice(0, 4).map(ch => (
                            <span key={ch.id} className="text-[11px] text-[#F2F7FF]">
                              {ch.emoji} {ch.spectatorName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COMPETITIVE ELO RANKINGS */}
        {arenaTab === 'rankings' && (
          <div className="lq-surface rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1E3A63] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#F59E0B]" />
                  Competitive Arena Rankings
                </h2>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Ranked strictly by Arena Elo and Seasonal Match Performance—separate from Realm XP standings.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-[#061225] rounded-lg border border-[#1E3A63]">
                  {(['global', 'friends', 'seasonal', 'weekly'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLbScope(s)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                        lbScope === s
                          ? 'bg-[#1677FF] text-[#F2F7FF] font-bold'
                          : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <select
                  value={lbDivision}
                  onChange={e => setLbDivision(e.target.value as RankedDivisionName | 'all')}
                  className="lq-input px-2.5 py-1.5 text-xs"
                >
                  <option value="all">All Divisions</option>
                  {RANKED_DIVISIONS_CATALOG.map(d => (
                    <option key={d.division} value={d.division}>
                      {d.division}
                    </option>
                  ))}
                </select>

                <select
                  value={lbMode}
                  onChange={e => setLbMode(e.target.value as CompetitiveRivalMode | 'all')}
                  className="lq-input px-2.5 py-1.5 text-xs"
                >
                  <option value="all">All Modes</option>
                  {COMPETITIVE_RIVAL_MODES.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#061225] border-b border-[#1E3A63] text-[11px] uppercase tracking-wider text-[#38D9F5]">
                    <th className="py-3 px-4 w-20 text-center">Rank</th>
                    <th className="py-3 px-4">Competitor</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4 text-center">Record</th>
                    <th className="py-3 px-4 text-center">Win %</th>
                    <th className="py-3 px-4 text-right">Elo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3A63]">
                  {lbLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#94A8C7]">
                        Loading competitive standings...
                      </td>
                    </tr>
                  ) : displayedLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#94A8C7]">
                        No ranked competitors in this bracket yet.
                      </td>
                    </tr>
                  ) : (
                    displayedLeaderboard.map(row => {
                      const pStatus = getPlayerPresence(row.userId).status;
                      const rowTierHex = TIER_ACCENT_MAP[row.tier] || '#FBBF24';
                      return (
                        <tr
                          key={row.userId}
                          onClick={() => openPublicProfile(row.userId)}
                          className={`cursor-pointer transition-colors ${
                            row.isCurrent
                              ? 'bg-[#102440] hover:bg-[#162E52]'
                              : 'hover:bg-[#102440]/60'
                          }`}
                        >
                          <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                            <span
                              className={
                                row.rank === 1
                                  ? 'text-[#F59E0B]'
                                  : row.rank === 2
                                  ? 'text-[#F2F7FF]'
                                  : row.rank === 3
                                  ? 'text-[#FBBF24]'
                                  : 'text-[#94A8C7]'
                              }
                            >
                              #{row.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <PresenceBadge status={pStatus} size="xs" />
                              <span className="font-bold text-[#F2F7FF]">{row.username}</span>
                              <span className="text-[11px] text-[#94A8C7]">
                                · {row.characterClass}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold" style={{ color: rowTierHex }}>
                            {row.tier}
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums text-[#94A8C7]">
                            {row.wins}-{row.losses}-{row.ties}
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums text-[#94A8C7]">
                            {row.winRate}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#FBBF24] tabular-nums">
                            {row.rating}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </RpgSubTabTransition>

      {/* Dispute Modal */}
      <RpgModalWrapper
        isOpen={Boolean(disputeTarget)}
        onClose={() => setDisputeTarget(null)}
        panelClassName="w-full max-w-md"
      >
        {disputeTarget && (
          <div className="lq-surface-elevated border border-[#F43F5E]/45 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#FBBF24]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                  File Match Integrity Dispute
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeTarget(null)}
                className="text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
                aria-label="Close dispute dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#94A8C7]">
              Filing a dispute for{' '}
              <strong className="text-[#F2F7FF]">{disputeTarget.challengeTitle}</strong> safely freezes
              and reverts any Elo rating shift pending verification.
            </p>
            <form onSubmit={handleSubmitDispute} className="space-y-3">
              <textarea
                rows={3}
                required
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe the synchronization discrepancy or scoring concern..."
                className="lq-input w-full px-3 py-2 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisputeTarget(null)}
                  className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === `dispute-${disputeTarget.id}`}
                  className="lq-btn px-4 py-2 rounded-xl bg-[#F43F5E] hover:brightness-110 text-[#061225] font-bold text-xs cursor-pointer"
                >
                  Submit Dispute
                </button>
              </div>
            </form>
          </div>
        )}
      </RpgModalWrapper>
    </div>
  );
};
