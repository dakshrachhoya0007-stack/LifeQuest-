import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import type { SeasonalStatVisibility } from '../../types/game';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Eye,
  Flame,
  History,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Trophy,
  X,
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
  cosmetic_frame: 'Profile Frame',
  cosmetic_banner: 'Profile Banner',
  cosmetic_outfit: 'Hero Outfit',
  cosmetic_aura: 'Portrait Aura',
  title: 'Seasonal Title',
  badge: 'Rare Badge Boost',
  achievement: 'Commendation',
  relic: 'Collector Relic',
  collectible_card: 'Collectible Card',
  card_pack: 'Card Pack',
  fragments: 'Cosmetic Fragments',
  gold: 'Gold Coins',
};

type TierFilter = 'all' | '1-15' | '16-35' | '36-50' | 'claimable';

const VISIBILITY_LABELS: Array<{ key: keyof SeasonalStatVisibility; label: string }> = [
  { key: 'workouts', label: 'Verified Workouts' },
  { key: 'activeDays', label: 'Active Days' },
  { key: 'personalRecords', label: 'Personal Records' },
  { key: 'xpAndLevels', label: 'Season XP & Tier' },
  { key: 'questsAndAchievements', label: 'Quests & Achievements' },
  { key: 'rivals', label: 'Rivals Record' },
  { key: 'guildAndCommunity', label: 'Guild & Community' },
  { key: 'rarestMilestone', label: 'Rarest Milestone' },
];

export const SeasonalProgressionView: React.FC = () => {
  const {
    user,
    seasonState,
    seasonLoading,
    refreshSeasonState,
    claimSeasonChallenge,
    claimSeasonMilestone,
    unlockSeasonElite,
    purchaseBattlePassRmDisabled,
    seasonalRecap,
    refreshSeasonalRecap,
    updateSeasonalRecapVisibility,
    openPublicProfile,
  } = useGame();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [showElitePreview, setShowElitePreview] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshSeasonState(1);
    void refreshSeasonalRecap();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
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

  const handleClaimMilestone = async (milestoneId: string, track: 'free' | 'elite') => {
    setBusyId(`${milestoneId}-${track}`);
    const res = await claimSeasonMilestone(milestoneId, track);
    if (res.success) {
      showFeedback('success', `Unlocked ${res.rewardLabel || 'Battle Pass Reward'}!`);
    } else {
      showFeedback('error', res.error || 'Could not claim Battle Pass reward.');
    }
    setBusyId(null);
  };

  const handleUnlockElite = async () => {
    setBusyId('unlock-elite');
    const res = await unlockSeasonElite();
    if (res.success) {
      showFeedback('success', 'Elite Cosmetic Track unlocked via earned in-game progression!');
    } else {
      showFeedback('error', res.error || 'Could not unlock Elite Cosmetic Track.');
    }
    setBusyId(null);
  };

  const handleRmDisabledAttempt = async () => {
    setBusyId('rm-disabled');
    const res = await purchaseBattlePassRmDisabled();
    showFeedback(
      'error',
      res.error || 'Real-money Battle Pass checkout is disabled until payment settlement is configured.'
    );
    setBusyId(null);
  };

  const handleToggleRecapField = async (key: keyof SeasonalStatVisibility) => {
    if (!seasonalRecap) return;
    const next: SeasonalStatVisibility = {
      ...seasonalRecap.visibility,
      [key]: !seasonalRecap.visibility[key],
    };
    const res = await updateSeasonalRecapVisibility(next);
    if (res.success) {
      showFeedback('success', 'Seasonal Recap privacy updated.');
    } else {
      showFeedback('error', res.error || 'Could not update recap privacy.');
    }
  };

  const handleCopyRecapSummary = async () => {
    if (!seasonalRecap) return;
    const vis = seasonalRecap.visibility;
    const parts = [
      `LIFEQUEST · ${seasonalRecap.seasonName}`,
      vis.xpAndLevels ? `Tier ${seasonalRecap.tierReached}/50 (${seasonalRecap.seasonXpGained.toLocaleString()} XP)` : null,
      vis.workouts ? `${seasonalRecap.verifiedWorkouts} verified workouts` : null,
      vis.activeDays ? `${seasonalRecap.activeDays} active days` : null,
      vis.personalRecords ? `${seasonalRecap.personalRecordsSet} PRs` : null,
      vis.rarestMilestone ? `Rarest: ${seasonalRecap.rarestMilestoneTitle}` : null,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join(' | '));
      showFeedback('success', 'Shareable Season Recap copied to clipboard!');
    } catch {
      showFeedback('success', parts.join(' | '));
    }
  };

  const milestones = seasonState?.season?.milestones || [];
  const totalTiers = milestones.length || 50;
  const filteredMilestones = useMemo(() => {
    if (!seasonState) return [];
    const claimedFree = new Set(seasonState.playerProgress.claimedMilestoneIds);
    const claimedElite = new Set(seasonState.playerProgress.claimedEliteMilestoneIds || []);
    const eliteUnlocked = Boolean(seasonState.playerProgress.eliteUnlocked);
    return milestones.filter(ms => {
      if (tierFilter === '1-15') return ms.tier >= 1 && ms.tier <= 15;
      if (tierFilter === '16-35') return ms.tier >= 16 && ms.tier <= 35;
      if (tierFilter === '36-50') return ms.tier >= 36 && ms.tier <= 50;
      if (tierFilter === 'claimable') {
        const unlocked = seasonState.playerProgress.seasonXp >= ms.requiredSeasonXp;
        if (!unlocked) return false;
        const canClaimFree = !claimedFree.has(ms.id);
        const canClaimElite = eliteUnlocked && Boolean(ms.eliteRewardLabel) && !claimedElite.has(ms.id);
        return canClaimFree || canClaimElite;
      }
      return true;
    });
  }, [milestones, seasonState, tierFilter]);

  if (seasonLoading && !seasonState) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#C5A15A]" />
        <span>Loading 50-Level Aetheria Battle Pass...</span>
      </div>
    );
  }

  if (!seasonState) {
    return (
      <div className="p-8 rounded-2xl bg-[#0e0a1b] border border-purple-950 text-center space-y-3">
        <Calendar className="w-7 h-7 text-[#C5A15A] mx-auto" />
        <p className="text-sm font-semibold text-white">Seasonal Battle Pass unavailable right now.</p>
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
  const nextMilestone = milestones.find(m => m.requiredSeasonXp > playerProgress.seasonXp) || null;
  const claimedFreeCount = milestones.filter(m =>
    playerProgress.claimedMilestoneIds.includes(m.id)
  ).length;
  const claimedEliteIds = new Set(playerProgress.claimedEliteMilestoneIds || []);
  const claimedEliteCount = milestones.filter(
    m => Boolean(m.eliteRewardLabel) && claimedEliteIds.has(m.id)
  ).length;
  const eliteUnlocked = Boolean(playerProgress.eliteUnlocked);
  const dailyXpToday = playerProgress.dailyXpEarnedToday ?? 0;
  const dailyXpCap = playerProgress.dailyXpCap ?? season.dailyXpCap ?? 350;
  const dailyCapPct = Math.min(100, Math.round((dailyXpToday / Math.max(1, dailyXpCap)) * 100));

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Season Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1b1235] via-[#100b21] to-[#1f162a] border border-[#C5A15A]/30 p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Season {season.seasonNumber} · 50-Level Battle Pass
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

          <div className="p-4 rounded-xl bg-[#0b0816]/90 border border-[#C5A15A]/30 min-w-[260px] shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-['Cinzel'] font-bold text-[#C5A15A] uppercase tracking-wider">
                Tier {playerProgress.currentTier} / {totalTiers}
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
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#D9D2C5]/75 tabular-nums">
                <span>Daily Battle Pass Cap</span>
                <span>
                  {dailyXpToday} / {dailyXpCap} XP
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#140e24] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${dailyCapPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fair Rule + Elite Track Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-[#C5A15A]/15 pt-3">
          <p className="text-[11px] text-[#C5A15A]/85 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Cosmetics, collectible cards, titles, and fragments only—zero XP boosts, ranking distortion, or combat advantage.
          </p>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowElitePreview(true)}
              className="px-3 py-1.5 rounded-lg bg-[#161028] hover:bg-[#23183d] border border-purple-800/60 text-xs font-semibold text-purple-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-[#C5A15A]" />
              Preview Elite Track
            </button>
            {eliteUnlocked ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-xs font-bold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Elite Track Unlocked
              </span>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busyId === 'unlock-elite'}
                  onClick={() => void handleUnlockElite()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] text-xs font-bold whitespace-nowrap"
                >
                  {busyId === 'unlock-elite' ? 'Unlocking...' : 'Unlock Elite Track (Earned)'}
                </button>
                <button
                  type="button"
                  disabled={busyId === 'rm-disabled'}
                  onClick={() => void handleRmDisabledAttempt()}
                  className="px-3 py-1.5 rounded-lg bg-[#120d22] border border-[#C5A15A]/25 text-[11px] text-[#D9D2C5]/70 hover:text-white whitespace-nowrap"
                >
                  RM Checkout (Disabled)
                </button>
              </>
            )}
          </div>
        </div>
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

      {/* 50-Level Dual Track Battle Pass */}
      <div className="bg-[#0e0a1b] border border-[#C5A15A]/22 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#C5A15A]" />
              50-LEVEL SEASONAL BATTLE PASS (FREE + ELITE)
            </h3>
            <p className="text-xs text-[#D9D2C5]/60 tabular-nums mt-0.5">
              Free Claimed: {claimedFreeCount}/{totalTiers} · Elite Claimed: {claimedEliteCount}/{totalTiers}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#08060f] border border-[#C5A15A]/20">
            {(
              [
                { id: 'all', label: 'All (1–50)' },
                { id: '1-15', label: 'Tiers 1–15' },
                { id: '16-35', label: 'Tiers 16–35' },
                { id: '36-50', label: 'Tiers 36–50' },
                { id: 'claimable', label: 'Ready to Claim' },
              ] as const
            ).map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTierFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  tierFilter === f.id
                    ? 'bg-[#251638] text-[#C5A15A]'
                    : 'text-[#D9D2C5]/65 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMilestones.length === 0 ? (
          <p className="text-xs text-[#D9D2C5]/60 py-6 text-center">
            No Battle Pass tiers match this filter right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredMilestones.map(ms => {
              const unlocked = playerProgress.seasonXp >= ms.requiredSeasonXp;
              const freeClaimed = playerProgress.claimedMilestoneIds.includes(ms.id);
              const eliteClaimed = claimedEliteIds.has(ms.id);
              const freeBusy = busyId === `${ms.id}-free`;
              const eliteBusy = busyId === `${ms.id}-elite`;

              return (
                <div
                  key={ms.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    unlocked
                      ? 'bg-[#17112b] border-[#C5A15A]/45'
                      : 'bg-[#0b0816] border-purple-950/70 opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] border-b border-white/10 pb-2">
                    <span className="font-['Cinzel'] font-bold text-[#C5A15A]">
                      Tier {ms.tier} · {ms.title}
                    </span>
                    <span className="font-mono text-[#D9D2C5]/65 tabular-nums">
                      {ms.requiredSeasonXp.toLocaleString()} XP
                    </span>
                  </div>

                  {/* Free Track Slot */}
                  <div className="p-2.5 rounded-lg bg-[#0d0919] border border-purple-950/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                        Free · {REWARD_TYPE_LABELS[ms.rewardType] || ms.rewardType}
                      </span>
                      <p className="text-xs font-semibold text-white truncate">{ms.rewardLabel}</p>
                    </div>
                    {freeClaimed ? (
                      <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : unlocked ? (
                      <button
                        type="button"
                        disabled={freeBusy}
                        onClick={() => void handleClaimMilestone(ms.id, 'free')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] text-[11px] font-bold shrink-0"
                      >
                        {freeBusy ? '...' : 'Claim'}
                      </button>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </div>

                  {/* Elite Track Slot */}
                  {ms.eliteRewardLabel && (
                    <div className="p-2.5 rounded-lg bg-[#1d1330] border border-[#C5A15A]/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-[#C5A15A] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Elite · {REWARD_TYPE_LABELS[ms.eliteRewardType || 'cosmetic_crest'] || ms.eliteRewardType}
                        </span>
                        <p className="text-xs font-semibold text-[#F5EFE6] truncate">
                          {ms.eliteRewardLabel}
                        </p>
                      </div>
                      {eliteClaimed ? (
                        <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                        </span>
                      ) : unlocked && eliteUnlocked ? (
                        <button
                          type="button"
                          disabled={eliteBusy}
                          onClick={() => void handleClaimMilestone(ms.id, 'elite')}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shrink-0"
                        >
                          {eliteBusy ? '...' : 'Claim'}
                        </button>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#C5A15A]/60 shrink-0" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Challenges & Season Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Verified Challenges */}
        <div className="lg:col-span-6 bg-[#0e0a1b] border border-purple-950/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-950/70">
            <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              SEASONAL MISSIONS
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
                          {ch.cadence === 'weekly' ? 'Weekly Mission' : 'Season Objective'}
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

      {/* Seasonal Statistics Recap & Shareable Summary Card */}
      {seasonalRecap && (
        <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#C5A15A]/15">
            <div>
              <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C5A15A]" />
                SEASONAL STATISTICS RECAP
              </h3>
              <p className="text-xs text-[#D9D2C5]/65 mt-0.5">
                {seasonalRecap.seasonName} · Verified performance chronicle with customizable sharing visibility
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyRecapSummary()}
              className="px-3.5 py-2 rounded-xl bg-[#251638] hover:bg-[#331e4d] border border-[#C5A15A]/40 text-xs font-semibold text-[#C5A15A] flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Share Card
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {seasonalRecap.visibility.workouts && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Verified Workouts</span>
                <span className="text-xl font-black font-mono text-white tabular-nums">
                  {seasonalRecap.verifiedWorkouts}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.activeDays && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Active Days</span>
                <span className="text-xl font-black font-mono text-emerald-300 tabular-nums">
                  {seasonalRecap.activeDays}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.personalRecords && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Personal Records</span>
                <span className="text-xl font-black font-mono text-[#C5A15A] tabular-nums">
                  {seasonalRecap.personalRecordsSet}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.xpAndLevels && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Season XP · Tier</span>
                <span className="text-xl font-black font-mono text-purple-300 tabular-nums">
                  T{seasonalRecap.tierReached} · {seasonalRecap.seasonXpGained.toLocaleString()}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.questsAndAchievements && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Quests &amp; Honors</span>
                <span className="text-xl font-black font-mono text-white tabular-nums">
                  {seasonalRecap.questsCompleted}Q · {seasonalRecap.achievementsUnlocked}A
                </span>
              </div>
            )}
            {seasonalRecap.visibility.rivals && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Rivals Record</span>
                <span className="text-xl font-black font-mono text-amber-300 tabular-nums">
                  {seasonalRecap.rivalsWins}W-{seasonalRecap.rivalsLosses}L
                </span>
              </div>
            )}
            {seasonalRecap.visibility.guildAndCommunity && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Guild &amp; Event Pts</span>
                <span className="text-xl font-black font-mono text-sky-300 tabular-nums">
                  {seasonalRecap.guildAndCommunityPoints.toLocaleString()}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.rarestMilestone && (
              <div className="rounded-xl bg-[#151024] border border-purple-950/70 p-3.5">
                <span className="text-[10px] uppercase text-[#D9D2C5]/60 block">Rarest Milestone</span>
                <span className="text-xs font-bold text-[#E8CF96] block truncate mt-1">
                  {seasonalRecap.rarestMilestoneTitle} ({seasonalRecap.rarestMilestoneRarity})
                </span>
              </div>
            )}
          </div>

          {seasonalRecap.previousSeasonComparison && (
            <div className="p-3.5 rounded-xl bg-[#140e24] border border-[#C5A15A]/20 text-xs flex flex-wrap items-center gap-4 tabular-nums">
              <span className="font-semibold text-[#C5A15A]">
                vs {seasonalRecap.previousSeasonComparison.previousSeasonName}:
              </span>
              <span className="text-[#D9D2C5]">
                Workouts {seasonalRecap.previousSeasonComparison.workoutsDelta >= 0 ? '+' : ''}
                {seasonalRecap.previousSeasonComparison.workoutsDelta}
              </span>
              <span className="text-[#D9D2C5]">
                Active Days {seasonalRecap.previousSeasonComparison.activeDaysDelta >= 0 ? '+' : ''}
                {seasonalRecap.previousSeasonComparison.activeDaysDelta}
              </span>
              <span className="text-[#D9D2C5]">
                Season XP {seasonalRecap.previousSeasonComparison.seasonXpDelta >= 0 ? '+' : ''}
                {seasonalRecap.previousSeasonComparison.seasonXpDelta}
              </span>
            </div>
          )}

          {/* Privacy Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-[11px] font-semibold text-[#D9D2C5]/75 block">
              Customize Visible Recap Categories
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VISIBILITY_LABELS.map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 text-xs text-[#D9D2C5]/80 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(seasonalRecap.visibility[item.key])}
                    onChange={() => void handleToggleRecapField(item.key)}
                    className="accent-[#C5A15A]"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Elite Track Preview Modal */}
      {showElitePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowElitePreview(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#100D19] border border-[#C5A15A]/45 p-6 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#C5A15A]/20">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#C5A15A]" />
                <h3 className="font-['Cinzel'] font-bold text-base text-white">
                  Elite Battle Pass Cosmetic Track Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowElitePreview(false)}
                className="text-[#D9D2C5]/60 hover:text-white"
                aria-label="Close Elite Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#D9D2C5]/75">
              All 50 Elite rewards are cosmetic banners, frames, collectible cards, relics, titles, and Cosmetic Fragments—never combat stats or XP multipliers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {milestones
                .filter(ms => Boolean(ms.eliteRewardLabel))
                .map(ms => (
                  <div
                    key={`prev-${ms.id}`}
                    className="p-3 rounded-xl bg-[#161026] border border-[#C5A15A]/25 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-[#C5A15A] block">
                        Tier {ms.tier}
                      </span>
                      <span className="font-bold text-white truncate block">
                        {ms.eliteRewardLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-300 shrink-0">
                      {REWARD_TYPE_LABELS[ms.eliteRewardType || 'cosmetic_crest'] || ms.eliteRewardType}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
