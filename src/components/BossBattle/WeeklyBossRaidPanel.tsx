import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { weeklyBossTitanImg } from '../../assets/images';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Trophy,
  Users,
} from 'lucide-react';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgScrollReveal,
} from '../Motion/RpgMotionPrimitives';

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
      <div className="lq-card rounded-2xl p-8 text-center text-sm text-[#94A8C7]">
        Summoning Weekly Community Raid status...
      </div>
    );
  }

  if (!event || !summary) {
    return (
      <div className="lq-card rounded-2xl p-8 text-center space-y-3">
        <p className="text-sm text-[#94A8C7]">Unable to load the Weekly Community Boss.</p>
        <button
          type="button"
          onClick={() => void refreshWeeklyBossState(1)}
          className="lq-btn lq-btn-secondary px-4 py-2 rounded-lg text-xs font-semibold text-[#38D9F5] cursor-pointer"
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
      <div className="lq-card rounded-2xl overflow-hidden border border-[#F43F5E]/35">
        <div className="relative h-64 sm:h-72 overflow-hidden">
          <img
            src={weeklyBossTitanImg}
            alt={event.bossName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#061225] via-[#0A1930]/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061225]/90 via-transparent to-transparent" />

          <div className="absolute bottom-5 left-5 right-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#38D9F5]">
                <span className="font-['Cinzel']">{event.bossTitle}</span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span>{event.difficulty} Tier</span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="tabular-nums">{event.weekKey}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF] tracking-wide">
                {event.bossName}
              </h2>
              <p className="text-xs sm:text-sm text-[#94A8C7] leading-relaxed">
                {event.bossDescription}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-[#061225]/90 backdrop-blur-md border border-[#F43F5E]/40 rounded-xl px-4 py-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                  {isDefeated ? 'Status' : isExpired ? 'Raid Window' : 'Time Remaining'}
                </span>
                <span className="text-sm font-bold font-mono text-[#38D9F5] flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#F43F5E]" />
                  {isDefeated
                    ? 'DEFEATED'
                    : isExpired
                    ? 'EXPIRED'
                    : formatCountdown(event.endsAt, nowMs)}
                </span>
              </div>
              <div className="h-8 w-px bg-[#1E3A63]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                  Raiders
                </span>
                <span className="text-sm font-bold font-mono text-[#F2F7FF] flex items-center gap-1.5 tabular-nums">
                  <Users className="w-3.5 h-3.5 text-[#F43F5E]" />
                  <AnimatedCounter value={event.totalParticipants} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Bar + Player Strike Summary */}
        <div className="p-5 sm:p-6 border-t border-[#1E3A63] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-['Cinzel'] font-bold uppercase tracking-wider text-[#F2F7FF]">
              Shared Realm Boss Health
            </span>
            <span className="font-mono font-bold text-[#F43F5E] tabular-nums">
              {event.currentHealth.toLocaleString()} / {event.totalHealth.toLocaleString()} HP ({hpPercent.toFixed(1)}%)
            </span>
          </div>
          <AnimatedProgressBar
            percentage={hpPercent}
            className="h-3.5 w-full rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
            barClassName={
              isDefeated
                ? 'bg-[#10B981]'
                : 'bg-gradient-to-r from-[#F43F5E] via-[#1677FF] to-[#00D9FF]'
            }
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="lq-surface rounded-xl p-3">
              <span className="text-[11px] text-[#94A8C7] block">Your Raid Damage</span>
              <span className="text-lg font-bold font-mono text-[#F2F7FF] tabular-nums">
                <AnimatedCounter value={summary.totalDamage} />
              </span>
            </div>
            <div className="lq-surface rounded-xl p-3">
              <span className="text-[11px] text-[#94A8C7] block">Verified Strikes</span>
              <span className="text-lg font-bold font-mono text-[#38D9F5] tabular-nums">
                <AnimatedCounter value={summary.contributionsCount} />
              </span>
            </div>
            <div className="lq-surface rounded-xl p-3">
              <span className="text-[11px] text-[#94A8C7] block">Daily Safety Budget</span>
              <span className="text-lg font-bold font-mono text-[#10B981] tabular-nums">
                {summary.dailyDamageDealt}/{summary.dailyDamageCap}
              </span>
            </div>
            <div className="lq-surface rounded-xl p-3">
              <span className="text-[11px] text-[#94A8C7] block">How to Strike</span>
              <button
                type="button"
                onClick={() => setActiveTab('fitness')}
                className="text-xs font-semibold text-[#38D9F5] hover:text-[#F2F7FF] hover:underline mt-1 text-left cursor-pointer"
              >
                Log Verified Activity →
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-xs border ${
                feedback.type === 'success'
                  ? 'bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981]'
                  : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F43F5E]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {isDefeated && (
            <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/45 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-['Cinzel'] font-bold text-sm text-[#10B981]">
                  VICTORY — {event.bossName} Has Fallen!
                </p>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Verified raid contributors can claim Victory Spoils and Top Contributor honors below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={summary.defeatRewardClaimed || summary.contributionsCount < 1 || claimingKey === 'defeat:reward'}
                  onClick={() => void handleClaim('defeat', 'reward')}
                  className="lq-btn lq-btn-gold px-4 py-2 rounded-lg disabled:opacity-45 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
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
                    className="lq-btn lq-btn-secondary px-4 py-2 rounded-lg border-[#F59E0B]/50 disabled:opacity-45 text-[#FBBF24] font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {summary.topContributorClaimed ? 'Top 3 Honor Claimed' : `Claim Top #${myRankEntry.rank} Bonus`}
                  </button>
                )}
              </div>
            </div>
          )}

          {isExpired && !isDefeated && (
            <div className="lq-surface rounded-xl border border-[#38D9F5]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-['Cinzel'] font-bold text-sm text-[#38D9F5]">
                  Weekly Raid Window Concluded
                </p>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  This titan endured until the weekly reset. Contributors may still claim Participation Honors.
                </p>
              </div>
              <button
                type="button"
                disabled={summary.participationClaimed || summary.contributionsCount < 1}
                onClick={() => void handleClaim('participation', 'reward')}
                className="lq-btn lq-btn-gold px-4 py-2 rounded-lg disabled:opacity-45 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                {summary.participationClaimed ? 'Participation Claimed' : 'Claim Participation'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Split: Raid Missions & Milestones vs Paginated Leaderboard & Strike Feed */}
      <RpgScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Missions & Milestones */}
        <div className="lg:col-span-6 space-y-5">
          <div className="lq-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#F43F5E]" />
                Weekly Raid Missions
              </h3>
              <span className="text-[11px] text-[#94A8C7]">
                Rest &amp; recovery count safely
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
                    className="lq-surface rounded-xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#F2F7FF]">{m.title}</p>
                        <p className="text-xs text-[#94A8C7] mt-0.5">{m.description}</p>
                        <p className="text-[11px] text-[#38D9F5] mt-1 font-mono tabular-nums">
                          +{m.damageReward} Siege Strike · +{m.playerXpReward} XP · +{m.goldReward}g
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#F2F7FF] tabular-nums shrink-0">
                        {prog.current}/{prog.target}
                      </span>
                    </div>
                    <AnimatedProgressBar
                      percentage={pct}
                      className="h-1.5 w-full rounded-full bg-[#061225] overflow-hidden"
                      barClassName="bg-gradient-to-r from-[#1677FF] to-[#00D9FF]"
                      shimmer={false}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!prog.completed || prog.claimed || claimingKey === `mission:${m.id}`}
                        onClick={() => void handleClaim('mission', m.id)}
                        className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                          prog.claimed
                            ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40'
                            : prog.completed
                            ? 'lq-btn-gold font-bold cursor-pointer'
                            : 'lq-btn-secondary opacity-45 cursor-not-allowed'
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
          <div className="lq-card rounded-2xl p-5 space-y-4">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F59E0B]" />
              Damage Milestones &amp; Participation
            </h3>
            <div className="space-y-2.5">
              {event.milestones.map(mil => {
                const reached = summary.totalDamage >= mil.damageRequired;
                const claimed = summary.claimedMilestones.includes(mil.id);
                return (
                  <div
                    key={mil.id}
                    className="lq-surface flex items-center justify-between gap-3 rounded-xl p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#F2F7FF]">{mil.title}</p>
                      <p className="text-[11px] text-[#94A8C7] font-mono tabular-nums">
                        {mil.damageRequired} DMG · +{mil.playerXpReward} XP · +{mil.goldReward}g
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!reached || claimed || claimingKey === `milestone:${mil.id}`}
                      onClick={() => void handleClaim('milestone', mil.id)}
                      className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                        claimed
                          ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40'
                          : reached
                          ? 'lq-btn-gold font-bold cursor-pointer'
                          : 'lq-btn-secondary opacity-45 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'Claimed' : reached ? 'Claim' : 'Locked'}
                    </button>
                  </div>
                );
              })}

              <div className="lq-surface-gold flex items-center justify-between gap-3 rounded-xl p-3">
                <div>
                  <p className="text-xs font-bold text-[#FBBF24]">Vanguard Participation Spoils</p>
                  <p className="text-[11px] text-[#94A8C7] font-mono tabular-nums">
                    1+ Verified Strike · +{event.rewards.participationXp} XP · +{event.rewards.participationGold}g
                  </p>
                </div>
                <button
                  type="button"
                  disabled={summary.contributionsCount < 1 || summary.participationClaimed}
                  onClick={() => void handleClaim('participation', 'reward')}
                  className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                    summary.participationClaimed
                      ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40'
                      : summary.contributionsCount >= 1
                      ? 'lq-btn-gold font-bold cursor-pointer'
                      : 'lq-btn-secondary opacity-45 cursor-not-allowed'
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
          <div className="lq-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F59E0B]" />
                Global Raid Contributors
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#94A8C7]">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => void refreshWeeklyBossState(page - 1)}
                  className="lq-btn lq-btn-secondary p-1.5 rounded-lg disabled:opacity-35 cursor-pointer"
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
                  className="lq-btn lq-btn-secondary p-1.5 rounded-lg disabled:opacity-35 cursor-pointer"
                  aria-label="Next leaderboard page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A8C7]">
                No verified raid strikes logged yet this week. Complete a workout, habit, or recovery session to claim #1.
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map(entry => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
                        isMe ? 'lq-surface-gold' : 'lq-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 text-center font-mono font-bold text-xs tabular-nums ${
                            entry.rank === 1
                              ? 'text-[#FBBF24]'
                              : entry.rank <= 3
                              ? 'text-[#F59E0B]'
                              : 'text-[#94A8C7]'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2F7FF] truncate">
                            {entry.username} {isMe && <span className="text-[#FBBF24]">(You)</span>}
                          </p>
                          <p className="text-[11px] text-[#94A8C7] tabular-nums">
                            {entry.contributionsCount} strikes · {entry.missionsCompleted} missions
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#F43F5E] tabular-nums shrink-0">
                        {entry.totalDamage.toLocaleString()} DMG
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lq-card rounded-2xl p-5 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#F43F5E]" />
              Recent Verified Strikes
            </h3>
            {recentContributions.length === 0 ? (
              <p className="text-xs text-[#94A8C7]">Strike log awaits your first verified action.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentContributions.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-xs py-2 border-b border-[#1E3A63] last:border-0"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-[#F2F7FF]">{c.username}</span>
                      <span className="text-[#94A8C7]"> · {c.actionLabel}</span>
                    </div>
                    <span className="font-mono font-bold text-[#F43F5E] tabular-nums shrink-0">
                      -{c.damageDealt} HP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </RpgScrollReveal>
    </div>
  );
};
