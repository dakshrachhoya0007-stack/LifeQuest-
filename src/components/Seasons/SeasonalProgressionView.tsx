import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  History,
  Loader2,
  Shield,
  Trophy,
} from 'lucide-react';

const formatCountdown = (endsAtIso: string): string => {
  const endMs = new Date(endsAtIso).getTime();
  if (Number.isNaN(endMs)) return 'Active Season';
  const diff = Math.max(0, endMs - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hrs}h remaining`;
  return `${hrs}h remaining`;
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  cosmetic_crest: 'Cosmetic Crest',
  title: 'Seasonal Title',
  badge: 'Rare Badge Boost',
  achievement: 'Commendation',
};

export const SeasonalProgressionView: React.FC = () => {
  const {
    user,
    seasonState,
    seasonLoading,
    refreshSeasonState,
    claimSeasonChallenge,
    claimSeasonMilestone,
    openPublicProfile,
  } = useGame();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshSeasonState(1);
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleClaimChallenge = async (challengeId: string, title: string) => {
    setBusyId(challengeId);
    const res = await claimSeasonChallenge(challengeId);
    if (res.success) {
      showFeedback(
        'success',
        `Claimed ${title}${res.seasonXpAwarded ? ` (+${res.seasonXpAwarded} Season XP)` : ''}!`
      );
    } else {
      showFeedback('error', res.error || 'Could not claim seasonal challenge.');
    }
    setBusyId(null);
  };

  const handleClaimMilestone = async (milestoneId: string) => {
    setBusyId(milestoneId);
    const res = await claimSeasonMilestone(milestoneId);
    if (res.success) {
      showFeedback('success', `Unlocked ${res.rewardLabel || 'Seasonal Reward'}!`);
    } else {
      showFeedback('error', res.error || 'Could not claim seasonal milestone.');
    }
    setBusyId(null);
  };

  if (seasonLoading && !seasonState) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#C5A15A]" />
        <span>Loading active Aetheria season...</span>
      </div>
    );
  }

  if (!seasonState) {
    return (
      <div className="p-8 rounded-2xl bg-[#0e0a1b] border border-purple-950 text-center space-y-3">
        <Calendar className="w-7 h-7 text-[#C5A15A] mx-auto" />
        <p className="text-sm font-semibold text-white">Seasonal chronicle unavailable right now.</p>
        <button
          type="button"
          onClick={() => void refreshSeasonState(1)}
          className="px-4 py-2 rounded-xl bg-[#251638] border border-[#C5A15A]/45 text-xs font-semibold text-[#C5A15A]"
        >
          Retry
        </button>
      </div>
    );
  }

  const { season, playerProgress, leaderboard, leaderboardPage, leaderboardTotalPages, history } =
    seasonState;
  const challenges = season.challenges || [];
  const milestones = season.milestones || [];
  const nextMilestone = milestones.find(m => m.requiredSeasonXp > playerProgress.seasonXp) || null;
  const claimedMilestonesCount = milestones.filter(m =>
    playerProgress.claimedMilestoneIds.includes(m.id)
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Season Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1b1235] via-[#100b21] to-[#1f162a] border border-[#C5A15A]/30 p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Season {season.seasonNumber}
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-purple-200 font-medium">{season.theme}</span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-amber-300 font-mono flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {formatCountdown(season.endsAt)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Cinzel'] text-white">
              {season.name}
            </h2>
            <p className="text-xs text-[#D9D2C5]/75 max-w-2xl leading-relaxed">
              {season.description}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0b0816]/90 border border-[#C5A15A]/30 min-w-[230px] shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-['Cinzel'] font-bold text-[#C5A15A] uppercase tracking-wider">
                Tier {playerProgress.currentTier} / 5
              </span>
              <span className="font-mono font-bold text-white tabular-nums">
                {playerProgress.seasonXp.toLocaleString()} Season XP
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#1e1535] border border-[#C5A15A]/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7046A5] via-[#9E6FE0] to-[#C5A15A] transition-all duration-500"
                style={{ width: `${Math.min(100, playerProgress.completionPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#D9D2C5]/65 tabular-nums">
              <span>
                {nextMilestone ? `Next Tier: ${nextMilestone.requiredSeasonXp} XP` : 'Max Tier Reached'}
              </span>
              <span>{playerProgress.completionPercent}% complete</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#C5A15A]/85 flex items-center gap-1.5 border-t border-[#C5A15A]/15 pt-3">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          Fair Seasonal Rule: Season tiers grant collectible crests, badges, titles, and commendations only—permanent hero balance, equipment power, and lifetime XP remain unaffected on rollover.
        </p>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs text-center ${
            notice.type === 'error'
              ? 'bg-rose-950/70 border-rose-700 text-rose-200'
              : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 5-Tier Seasonal Reward Track */}
      <div className="bg-[#0e0a1b] border border-[#C5A15A]/22 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#C5A15A]" />
            SEASONAL REWARD TRACK
          </h3>
          <span className="text-xs text-[#D9D2C5]/60 tabular-nums">
            {claimedMilestonesCount}/{milestones.length} Tiers Claimed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {milestones.map(ms => {
            const isBusy = busyId === ms.id;
            const claimed = playerProgress.claimedMilestoneIds.includes(ms.id);
            const unlocked = playerProgress.seasonXp >= ms.requiredSeasonXp;
            return (
              <div
                key={ms.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  claimed
                    ? 'bg-emerald-950/25 border-emerald-700/50'
                    : unlocked
                    ? 'bg-[#1a1230] border-[#C5A15A]/55'
                    : 'bg-[#0b0816] border-purple-950/70 opacity-80'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-['Cinzel'] font-bold text-[#C5A15A]">
                      Tier {ms.tier}
                    </span>
                    <span className="font-mono text-[#D9D2C5]/65 tabular-nums">
                      {ms.requiredSeasonXp} XP
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white">{ms.title}</p>
                  <p className="text-[11px] text-purple-300 font-medium">
                    {REWARD_TYPE_LABELS[ms.rewardType] || ms.rewardType}
                  </p>
                  <p className="text-[11px] text-[#D9D2C5]/75 leading-snug">{ms.rewardLabel}</p>
                </div>

                {claimed ? (
                  <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Claimed
                  </div>
                ) : unlocked ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleClaimMilestone(ms.id)}
                    className="w-full py-2 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] text-xs font-bold whitespace-nowrap transition-colors"
                  >
                    {isBusy ? 'Claiming...' : 'Claim Reward'}
                  </button>
                ) : (
                  <span className="text-[11px] text-[#D9D2C5]/45 font-medium pt-1">
                    Needs {(ms.requiredSeasonXp - playerProgress.seasonXp).toLocaleString()} XP
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenges & Season Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Verified Challenges */}
        <div className="lg:col-span-6 bg-[#0e0a1b] border border-purple-950/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-950/70">
            <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              SEASONAL CHALLENGES
            </h3>
            <span className="text-xs text-[#D9D2C5]/60">Verified Activity Progress</span>
          </div>

          <div className="space-y-3">
            {challenges.map(ch => {
              const chProg = playerProgress.challengeProgress?.[ch.id] || {
                current: 0,
                target: ch.targetCount,
                completed: false,
                claimed: false,
              };
              const pct = Math.min(100, Math.round((chProg.current / Math.max(1, chProg.target)) * 100));
              const isBusy = busyId === ch.id;
              return (
                <div
                  key={ch.id}
                  className="p-4 rounded-xl bg-[#130e24] border border-purple-950/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="uppercase tracking-wider font-bold text-[#C5A15A]">
                          {ch.cadence === 'weekly' ? 'Weekly Trial' : 'Season Objective'}
                        </span>
                        <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                        <span className="font-mono text-purple-300 tabular-nums">
                          +{ch.seasonalXpReward} Season XP
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{ch.title}</h4>
                      <p className="text-xs text-[#D9D2C5]/70 mt-0.5">{ch.description}</p>
                    </div>

                    {chProg.claimed ? (
                      <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Claimed
                      </span>
                    ) : chProg.completed ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleClaimChallenge(ch.id, ch.title)}
                        className="px-3 py-1.5 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                      >
                        {isBusy ? 'Claiming...' : 'Claim XP'}
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-[#D9D2C5]/70 tabular-nums">
                      <span>Progress</span>
                      <span>
                        {Math.min(chProg.current, chProg.target)} / {chProg.target} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#090714] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          chProg.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#7046A5] to-[#C5A15A]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Season Standings & Past Season History */}
        <div className="lg:col-span-6 space-y-6">
          {/* Season Leaderboard */}
          <div className="bg-[#0e0a1b] border border-purple-950/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-950/70">
              <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#C5A15A]" />
                SEASON STANDINGS
              </h3>
              <span className="text-xs text-[#D9D2C5]/60 tabular-nums">
                Page {leaderboardPage} / {leaderboardTotalPages}
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-[#D9D2C5]/60 py-8 text-center">
                Complete verified workouts, habits, or boss strikes to enter Season {season.seasonNumber} standings.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map(row => {
                  const isCurrent = Boolean(user && row.userId === user.id);
                  return (
                    <button
                      key={`${row.userId}-${row.rank}`}
                      type="button"
                      onClick={() => openPublicProfile(row.userId)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-[#21153b] border-[#C5A15A]/45'
                          : 'bg-[#120d22] border-purple-950/70 hover:bg-[#191130]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 text-center font-mono font-bold text-xs text-[#C5A15A] tabular-nums shrink-0">
                          #{row.rank}
                        </span>
                        <img
                          src={getRpgAvatarForClass(row.characterClass || 'Warrior')}
                          alt={row.username}
                          className="w-8 h-8 rounded-full object-cover object-top border border-purple-600/70 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {row.username}
                            {isCurrent ? ' (You)' : ''}
                          </p>
                          <p className="text-[11px] text-[#D9D2C5]/60 truncate tabular-nums">
                            Tier {row.currentTier} · {row.completionPercent}% complete
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#E8CF96] tabular-nums shrink-0">
                        {row.seasonXp.toLocaleString()} XP
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {leaderboardTotalPages > 1 && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={leaderboardPage <= 1}
                  onClick={() => void refreshSeasonState(leaderboardPage - 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#151025] border border-purple-900/60 text-xs text-[#D9D2C5] disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={leaderboardPage >= leaderboardTotalPages}
                  onClick={() => void refreshSeasonState(leaderboardPage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#151025] border border-purple-900/60 text-xs text-[#D9D2C5] disabled:opacity-40 flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Permanent Season History Archive */}
          <div className="bg-[#0e0a1b] border border-purple-950/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              SEASON HISTORY ARCHIVE
            </h3>
            {history.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#120d22] border border-purple-950/60 text-xs text-[#D9D2C5]/65 leading-relaxed">
                Season {season.seasonNumber} is the active inaugural chapter. When a season concludes, your final rank, tier reached, and earned seasonal rewards are permanently preserved here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map(arch => (
                  <div
                    key={arch.seasonId}
                    className="p-4 rounded-xl bg-[#120d22] border border-[#C5A15A]/25 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-['Cinzel'] font-bold text-xs text-[#E8CF96]">
                        {arch.name}
                      </span>
                      {arch.playerSummary && (
                        <span className="text-[11px] font-mono text-purple-300 tabular-nums">
                          Tier {arch.playerSummary.tierReached} · {arch.playerSummary.seasonXp.toLocaleString()} XP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#D9D2C5]/70 tabular-nums">
                      {arch.playerSummary?.rank ? `Final Rank #${arch.playerSummary.rank} · ` : ''}
                      {arch.totalParticipants} participants · Champion: {arch.topPlayers?.[0]?.username || 'Realm Vanguard'}
                    </p>
                    {arch.playerSummary?.claimedRewardTitles && arch.playerSummary.claimedRewardTitles.length > 0 && (
                      <p className="text-[11px] text-amber-300 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        {arch.playerSummary.claimedRewardTitles.join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
