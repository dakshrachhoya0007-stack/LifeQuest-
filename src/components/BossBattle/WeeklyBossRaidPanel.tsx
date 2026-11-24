import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { weeklyBossTitanImg } from '../../assets/images';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Dumbbell,
  Flame,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

const formatCountdown = (endsAtIso: string, nowMs: number): string => {
  const diff = Math.max(0, Date.parse(endsAtIso) - nowMs);
  if (diff === 0) return '0d 00h 00m';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
};

export const WeeklyBossRaidPanel: React.FC = () => {
  const {
    user,
    weeklyBossState,
    weeklyBossLoading,
    refreshWeeklyBossState,
    claimWeeklyBossReward,
    setActiveTab,
  } = useGame();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  useEffect(() => {
    void refreshWeeklyBossState(1);
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const event = weeklyBossState?.event;
  const summary = weeklyBossState?.playerSummary;
  const leaderboard = weeklyBossState?.leaderboard || [];
  const recentContributions = weeklyBossState?.recentContributions || [];
  const page = weeklyBossState?.leaderboardPage || 1;
  const totalPages = weeklyBossState?.leaderboardTotalPages || 1;

  const hpPercent = useMemo(() => {
    if (!event || event.totalHealth <= 0) return 0;
    return Math.max(0, Math.min(100, (event.currentHealth / event.totalHealth) * 100));
  }, [event]);

  const handleClaim = async (
    claimType: 'mission' | 'milestone' | 'participation' | 'defeat' | 'top_contributor',
    claimId: string
  ) => {
    const key = `${claimType}:${claimId}`;
    setClaimingKey(key);
    setFeedback(null);
    try {
      const res = await claimWeeklyBossReward(claimType, claimId);
      if (res.success) {
        const xp = res.rewards?.xp || 0;
        const gold = res.rewards?.gold || 0;
        setFeedback({
          type: 'success',
          text: `Raid honor claimed: +${xp} Player XP and +${gold} Gold credited to your champion profile.`,
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not claim reward.' });
      }
    } finally {
      setClaimingKey(null);
    }
  };

  if (weeklyBossLoading && !event) {
    return (
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-8 text-center text-sm text-[#D9D2C5]/70">
        Summoning Weekly Community Raid status...
      </div>
    );
  }

  if (!event || !summary) {
    return (
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-8 text-center space-y-3">
        <p className="text-sm text-[#D9D2C5]/80">Unable to load the Weekly Community Boss.</p>
        <button
          type="button"
          onClick={() => void refreshWeeklyBossState(1)}
          className="px-4 py-2 rounded-lg bg-[#251638] border border-[#C5A15A]/40 text-xs font-semibold text-[#C5A15A]"
        >
          Retry Raid Sync
        </button>
      </div>
    );
  }

  const isDefeated = event.status === 'defeated' || event.currentHealth <= 0;
  const isExpired = event.status === 'expired';
  const myRankEntry = leaderboard.find(r => r.userId === user?.id);

  return (
    <div className="space-y-6">
      {/* Cinematic Raid Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#C5A15A]/30 bg-[#100D19] shadow-2xl">
        <div className="relative h-64 sm:h-72 overflow-hidden">
          <img
            src={weeklyBossTitanImg}
            alt={event.bossName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#100D19] via-[#100D19]/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#100D19]/90 via-transparent to-transparent" />

          <div className="absolute bottom-5 left-5 right-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#C5A15A]">
                <span className="font-['Cinzel']">{event.bossTitle}</span>
                <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                <span>{event.difficulty} Tier</span>
                <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                <span className="tabular-nums">{event.weekKey}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white tracking-wide">
                {event.bossName}
              </h2>
              <p className="text-xs sm:text-sm text-[#D9D2C5]/80 leading-relaxed">
                {event.bossDescription}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-[#0b0813]/90 border border-[#C5A15A]/25 rounded-xl px-4 py-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#D9D2C5]/55 block">
                  {isDefeated ? 'Status' : isExpired ? 'Raid Window' : 'Time Remaining'}
                </span>
                <span className="text-sm font-bold font-mono text-[#C5A15A] flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {isDefeated
                    ? 'DEFEATED'
                    : isExpired
                    ? 'EXPIRED'
                    : formatCountdown(event.endsAt, nowMs)}
                </span>
              </div>
              <div className="h-8 w-px bg-[#C5A15A]/20" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#D9D2C5]/55 block">
                  Raiders
                </span>
                <span className="text-sm font-bold font-mono text-white flex items-center gap-1.5 tabular-nums">
                  <Users className="w-3.5 h-3.5 text-[#7046A5]" />
                  {event.totalParticipants}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Bar + Player Strike Summary */}
        <div className="p-5 sm:p-6 border-t border-[#C5A15A]/15 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-['Cinzel'] font-bold uppercase tracking-wider text-[#D9D2C5]">
              Shared Realm Boss Health
            </span>
            <span className="font-mono font-bold text-[#C5A15A] tabular-nums">
              {event.currentHealth.toLocaleString()} / {event.totalHealth.toLocaleString()} HP ({hpPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-3.5 w-full rounded-full bg-[#090714] border border-[#C5A15A]/25 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                isDefeated
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-rose-700 via-rose-500 to-[#C5A15A]'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3">
              <span className="text-[11px] text-[#D9D2C5]/55 block">Your Raid Damage</span>
              <span className="text-lg font-bold font-mono text-white tabular-nums">
                {summary.totalDamage.toLocaleString()}
              </span>
            </div>
            <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3">
              <span className="text-[11px] text-[#D9D2C5]/55 block">Verified Strikes</span>
              <span className="text-lg font-bold font-mono text-[#C5A15A] tabular-nums">
                {summary.contributionsCount}
              </span>
            </div>
            <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3">
              <span className="text-[11px] text-[#D9D2C5]/55 block">Daily Safety Budget</span>
              <span className="text-lg font-bold font-mono text-emerald-300 tabular-nums">
                {summary.dailyDamageDealt}/{summary.dailyDamageCap}
              </span>
            </div>
            <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3">
              <span className="text-[11px] text-[#D9D2C5]/55 block">How to Strike</span>
              <button
                type="button"
                onClick={() => setActiveTab('fitness')}
                className="text-xs font-semibold text-[#C5A15A] hover:underline mt-1 text-left"
              >
                Log Verified Activity →
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-xs border ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {isDefeated && (
            <div className="rounded-xl bg-gradient-to-r from-emerald-950/70 to-[#1a1330] border border-emerald-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-['Cinzel'] font-bold text-sm text-emerald-300">
                  VICTORY — {event.bossName} Has Fallen!
                </p>
                <p className="text-xs text-[#D9D2C5]/75 mt-0.5">
                  Verified raid contributors can claim Victory Spoils and Top Contributor honors below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={summary.defeatRewardClaimed || summary.contributionsCount < 1 || claimingKey === 'defeat:reward'}
                  onClick={() => void handleClaim('defeat', 'reward')}
                  className="px-4 py-2 rounded-lg bg-[#C5A15A] hover:bg-[#d6b36c] disabled:opacity-45 text-[#0d0a16] font-bold text-xs whitespace-nowrap shrink-0"
                >
                  {summary.defeatRewardClaimed
                    ? 'Victory Spoils Claimed'
                    : `Claim Victory (+${event.rewards.defeatXp} XP · +${event.rewards.defeatGold}g)`}
                </button>
                {myRankEntry && myRankEntry.rank <= 3 && (
                  <button
                    type="button"
                    disabled={summary.topContributorClaimed || claimingKey === 'top_contributor:reward'}
                    onClick={() => void handleClaim('top_contributor', 'reward')}
                    className="px-4 py-2 rounded-lg bg-[#251638] border border-[#C5A15A]/50 disabled:opacity-45 text-[#C5A15A] font-bold text-xs whitespace-nowrap shrink-0"
                  >
                    {summary.topContributorClaimed ? 'Top 3 Honor Claimed' : `Claim Top #${myRankEntry.rank} Bonus`}
                  </button>
                )}
              </div>
            </div>
          )}

          {isExpired && !isDefeated && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-500/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-['Cinzel'] font-bold text-sm text-amber-300">
                  Weekly Raid Window Concluded
                </p>
                <p className="text-xs text-[#D9D2C5]/75 mt-0.5">
                  This titan endured until the weekly reset. Contributors may still claim Participation Honors.
                </p>
              </div>
              <button
                type="button"
                disabled={summary.participationClaimed || summary.contributionsCount < 1}
                onClick={() => void handleClaim('participation', 'reward')}
                className="px-4 py-2 rounded-lg bg-[#251638] border border-[#C5A15A]/45 disabled:opacity-45 text-xs font-bold text-[#C5A15A] whitespace-nowrap shrink-0"
              >
                {summary.participationClaimed ? 'Participation Claimed' : 'Claim Participation'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Split: Raid Missions & Milestones vs Paginated Leaderboard & Strike Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Missions & Milestones */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#C5A15A]" />
                Weekly Raid Missions
              </h3>
              <span className="text-[11px] text-[#D9D2C5]/55">
                Rest & recovery count safely
              </span>
            </div>

            <div className="space-y-3">
              {event.missions.map(m => {
                const prog = summary.missionProgress[m.id] || {
                  current: 0,
                  target: m.targetCount,
                  completed: false,
                  claimed: false,
                };
                const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
                return (
                  <div
                    key={m.id}
                    className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{m.title}</p>
                        <p className="text-xs text-[#D9D2C5]/70 mt-0.5">{m.description}</p>
                        <p className="text-[11px] text-[#C5A15A] mt-1 font-mono tabular-nums">
                          +{m.damageReward} Siege Strike · +{m.playerXpReward} XP · +{m.goldReward}g
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#D9D2C5] tabular-nums shrink-0">
                        {prog.current}/{prog.target}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#090714] overflow-hidden">
                      <div
                        className="h-full bg-[#C5A15A] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!prog.completed || prog.claimed || claimingKey === `mission:${m.id}`}
                        onClick={() => void handleClaim('mission', m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          prog.claimed
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40'
                            : prog.completed
                            ? 'bg-[#C5A15A] hover:bg-[#d5b26b] text-[#0c0914] font-bold'
                            : 'bg-[#1f1833] text-[#D9D2C5]/40 cursor-not-allowed'
                        }`}
                      >
                        {prog.claimed ? 'Claimed' : prog.completed ? 'Claim Mission Reward' : 'In Progress'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Damage Milestones & Rewards Preview */}
          <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-4">
            <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C5A15A]" />
              Damage Milestones & Participation
            </h3>
            <div className="space-y-2.5">
              {event.milestones.map(mil => {
                const reached = summary.totalDamage >= mil.damageRequired;
                const claimed = summary.claimedMilestones.includes(mil.id);
                return (
                  <div
                    key={mil.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{mil.title}</p>
                      <p className="text-[11px] text-[#D9D2C5]/65 font-mono tabular-nums">
                        {mil.damageRequired} DMG · +{mil.playerXpReward} XP · +{mil.goldReward}g
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!reached || claimed || claimingKey === `milestone:${mil.id}`}
                      onClick={() => void handleClaim('milestone', mil.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                        claimed
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40'
                          : reached
                          ? 'bg-[#7046A5] hover:bg-[#8255ba] text-white'
                          : 'bg-[#1f1833] text-[#D9D2C5]/40 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'Claimed' : reached ? 'Claim' : 'Locked'}
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#151022] border border-[#C5A15A]/20 p-3">
                <div>
                  <p className="text-xs font-bold text-[#C5A15A]">Vanguard Participation Spoils</p>
                  <p className="text-[11px] text-[#D9D2C5]/65 font-mono tabular-nums">
                    1+ Verified Strike · +{event.rewards.participationXp} XP · +{event.rewards.participationGold}g
                  </p>
                </div>
                <button
                  type="button"
                  disabled={summary.contributionsCount < 1 || summary.participationClaimed}
                  onClick={() => void handleClaim('participation', 'reward')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                    summary.participationClaimed
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40'
                      : summary.contributionsCount >= 1
                      ? 'bg-[#C5A15A] text-[#0c0914] font-bold'
                      : 'bg-[#1f1833] text-[#D9D2C5]/40 cursor-not-allowed'
                  }`}
                >
                  {summary.participationClaimed ? 'Claimed' : 'Claim'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Paginated Global Leaderboard & Contribution History */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#C5A15A]" />
                Global Raid Contributors
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#D9D2C5]/70">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => void refreshWeeklyBossState(page - 1)}
                  className="p-1.5 rounded-lg bg-[#151022] border border-[#C5A15A]/20 disabled:opacity-35"
                  aria-label="Previous leaderboard page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {page}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => void refreshWeeklyBossState(page + 1)}
                  className="p-1.5 rounded-lg bg-[#151022] border border-[#C5A15A]/20 disabled:opacity-35"
                  aria-label="Next leaderboard page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#D9D2C5]/60">
                No verified raid strikes logged yet this week. Complete a workout, habit, or recovery session to claim #1.
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map(entry => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border ${
                        isMe
                          ? 'bg-[#251638]/70 border-[#C5A15A]/45'
                          : 'bg-[#151022] border-[#C5A15A]/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 text-center font-mono font-bold text-xs tabular-nums ${
                            entry.rank === 1
                              ? 'text-[#C5A15A]'
                              : entry.rank <= 3
                              ? 'text-purple-300'
                              : 'text-[#D9D2C5]/50'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {entry.username} {isMe && <span className="text-[#C5A15A]">(You)</span>}
                          </p>
                          <p className="text-[11px] text-[#D9D2C5]/55 tabular-nums">
                            {entry.contributionsCount} strikes · {entry.missionsCompleted} missions
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#C5A15A] tabular-nums shrink-0">
                        {entry.totalDamage.toLocaleString()} DMG
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#C5A15A]" />
              Recent Verified Strikes
            </h3>
            {recentContributions.length === 0 ? (
              <p className="text-xs text-[#D9D2C5]/60">Strike log awaits your first verified action.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentContributions.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-xs py-2 border-b border-[#C5A15A]/10 last:border-0"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-white">{c.username}</span>
                      <span className="text-[#D9D2C5]/60"> · {c.actionLabel}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-300 tabular-nums shrink-0">
                      -{c.damageDealt} HP
                    </span>
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
