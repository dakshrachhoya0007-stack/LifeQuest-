import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
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
  cosmetic_crest: 'Cosmetic',
  cosmetic_frame: 'Cosmetic',
  cosmetic_banner: 'Cosmetic',
  cosmetic_outfit: 'Cosmetic',
  cosmetic_aura: 'Cosmetic',
  title: 'Title',
  badge: 'Title',
  achievement: 'Title',
  relic: 'Collectible',
  collectible_card: 'Collectible Card',
  card_pack: 'Collectible Card',
  fragments: 'Fragments',
  gold: 'Gold',
};

type TierFilter = 'all' | '1-15' | '16-35' | '36-50' | 'claimable';

export const SeasonalProgressionView: React.FC = () => {
  const {
    user,
    seasonState,
    seasonLoading,
    refreshSeasonState,
    claimSeasonChallenge,
    claimSeasonMilestone,
    unlockSeasonElite,
    seasonalRecap,
    refreshSeasonalRecap,
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
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#BEB4D6] text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFD978]" />
        <span>Loading 50-Level Aetheria Battle Pass...</span>
      </div>
    );
  }

  if (!seasonState) {
    return (
      <div className="p-8 rounded-2xl bg-[#24143D]/90 border border-[#E7B94F]/30 text-center space-y-3">
        <Calendar className="w-7 h-7 text-[#FFD978] mx-auto" />
        <p className="text-sm font-semibold text-[#F7F4FF]">Seasonal Battle Pass unavailable right now.</p>
        <button
          type="button"
          onClick={() => void refreshSeasonState(1)}
          className="px-4 py-2 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#E7B94F]/40 text-xs font-semibold text-[#FFD978]"
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
      <div className="rounded-2xl bg-gradient-to-br from-[#19122B] via-[#24143D] to-[#19122B] border border-[#E7B94F]/35 p-5 sm:p-7 shadow-[0_12px_32px_rgba(10,6,20,0.65)] backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#FFD978]">
                Season {season.seasonNumber} · 50-Level Battle Pass
              </span>
              <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
              <span className="text-[#F7F4FF] font-medium">{season.theme}</span>
              <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
              <span className="text-[#FFAA45] font-mono flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {formatCountdown(season.endsAt)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Cinzel'] text-[#F7F4FF]">
              {season.name}
            </h2>
            <p className="text-xs text-[#BEB4D6] max-w-2xl leading-relaxed">
              {season.description}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#100D1C]/90 border border-[#E7B94F]/35 min-w-[260px] shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-['Cinzel'] font-bold text-[#FFD978] uppercase tracking-wider">
                Tier {playerProgress.currentTier} / {totalTiers}
              </span>
              <span className="font-mono font-bold text-[#F7F4FF] tabular-nums">
                {playerProgress.seasonXp.toLocaleString()} Season XP
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#19122B] border border-[#6638B8]/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6638B8] via-[#A875FF] to-[#FFD978] transition-all duration-500"
                style={{ width: `${Math.min(100, playerProgress.completionPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#BEB4D6] tabular-nums">
              <span>
                {nextMilestone ? `Next Tier: ${nextMilestone.requiredSeasonXp} XP` : 'Max Tier Reached'}
              </span>
              <span>{playerProgress.completionPercent}% complete</span>
            </div>
            <div className="pt-2 border-t border-[#6638B8]/25 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#BEB4D6] tabular-nums">
                <span>Daily Battle Pass Cap</span>
                <span>
                  {dailyXpToday} / {dailyXpCap} XP
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#19122B] overflow-hidden">
                <div
                  className="h-full bg-[#35D69A] transition-all duration-300"
                  style={{ width: `${dailyCapPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fair Rule + Elite Track Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-[#6638B8]/25 pt-3">
          <p className="text-[11px] text-[#BEB4D6] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#FFD978] shrink-0" />
            Cosmetics, collectible cards, titles, and fragments only—zero XP boosts, ranking distortion, or combat advantage.
          </p>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowElitePreview(true)}
              className="px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 hover:border-[#FFD978]/55 text-xs font-semibold text-[#F7F4FF] flex items-center gap-1.5 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-[#FFD978]" />
              Preview Elite Track
            </button>
            {eliteUnlocked ? (
              <span className="px-3 py-1.5 rounded-lg bg-[#113328]/70 border border-[#35D69A]/50 text-xs font-bold text-[#35D69A] flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Elite Track Unlocked
              </span>
            ) : (
              <button
                type="button"
                disabled={busyId === 'unlock-elite'}
                onClick={() => void handleUnlockElite()}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#6638B8] to-[#E7B94F] hover:brightness-110 text-white text-xs font-bold whitespace-nowrap shadow-[0_0_16px_rgba(231,185,79,0.3)]"
              >
                {busyId === 'unlock-elite' ? 'Unlocking...' : 'Unlock Elite Track (Earned)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs text-center ${
            notice.type === 'error'
              ? 'bg-[#36111F]/70 border-[#F05B70]/60 text-[#F7F4FF]'
              : 'bg-[#113328]/70 border-[#35D69A]/60 text-[#F7F4FF]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 50-Level Dual Track Battle Pass */}
      <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#E7B94F]/30 rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,6,20,0.65)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#FFD978]" />
              50-LEVEL SEASONAL BATTLE PASS (FREE + ELITE)
            </h3>
            <p className="text-xs text-[#BEB4D6] tabular-nums mt-0.5">
              Free Claimed: <span className="text-[#35D69A] font-semibold">{claimedFreeCount}/{totalTiers}</span> · Elite Claimed: <span className="text-[#FFD978] font-semibold">{claimedEliteCount}/{totalTiers}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#100D1C] border border-[#6638B8]/30">
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
                    ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] text-[#100D1C] font-bold'
                    : 'text-[#BEB4D6] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMilestones.length === 0 ? (
          <p className="text-xs text-[#BEB4D6] py-6 text-center">
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
                      ? 'bg-[#24143D] border-[#FFD978]/65 shadow-[0_8px_24px_rgba(231,185,79,0.14)]'
                      : 'bg-[#19122B] border-[#6638B8]/25 opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] border-b border-[#6638B8]/25 pb-2">
                    <span className="font-['Cinzel'] font-bold text-[#FFD978]">
                      Tier {ms.tier} · {ms.title}
                    </span>
                    <span className="font-mono text-[#BEB4D6] tabular-nums">
                      {ms.requiredSeasonXp.toLocaleString()} XP
                    </span>
                  </div>

                  {/* Free Track Slot (Emerald Accent) */}
                  <div className="p-2.5 rounded-lg bg-[#100D1C] border border-[#35D69A]/35 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#35D69A] block">
                        Free Track · {REWARD_TYPE_LABELS[ms.rewardType] || 'Reward'}
                      </span>
                      <p className="text-xs font-semibold text-[#F7F4FF] truncate">{ms.rewardLabel}</p>
                    </div>
                    {freeClaimed ? (
                      <span className="text-[11px] font-semibold text-[#35D69A] flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : unlocked ? (
                      <button
                        type="button"
                        disabled={freeBusy}
                        onClick={() => void handleClaimMilestone(ms.id, 'free')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#35D69A] hover:brightness-110 text-[#100D1C] text-[11px] font-bold shrink-0"
                      >
                        {freeBusy ? '...' : 'Claim'}
                      </button>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#BEB4D6]/60 shrink-0" />
                    )}
                  </div>

                  {/* Elite Track Slot (Royal Purple + Gold Accent) */}
                  {ms.eliteRewardLabel && (
                    <div className="p-2.5 rounded-lg bg-[#19122B] border border-[#E7B94F]/45 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFD978] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#A875FF]" />
                          Elite Track · {REWARD_TYPE_LABELS[ms.eliteRewardType || 'cosmetic_crest'] || 'Reward'}
                        </span>
                        <p className="text-xs font-semibold text-[#F7F4FF] truncate">
                          {ms.eliteRewardLabel}
                        </p>
                      </div>
                      {eliteClaimed ? (
                        <span className="text-[11px] font-semibold text-[#35D69A] flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                        </span>
                      ) : unlocked && eliteUnlocked ? (
                        <button
                          type="button"
                          disabled={eliteBusy}
                          onClick={() => void handleClaimMilestone(ms.id, 'elite')}
                          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#6638B8] to-[#E7B94F] hover:brightness-110 text-white text-[11px] font-bold shrink-0"
                        >
                          {eliteBusy ? '...' : 'Claim'}
                        </button>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#E7B94F]/60 shrink-0" />
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
        <div className="lg:col-span-6 bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,6,20,0.65)] space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#6638B8]/25">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#FFAA45]" />
              SEASONAL MISSIONS
            </h3>
            <span className="text-xs text-[#BEB4D6]">Verified Activity Progress</span>
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
                  className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/30 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="uppercase tracking-wider font-bold text-[#FFAA45]">
                          {ch.cadence === 'weekly' ? 'Weekly Mission' : 'Season Objective'}
                        </span>
                        <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                        <span className="font-mono text-[#FFD978] tabular-nums">
                          +{ch.seasonalXpReward} Season XP
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#F7F4FF] mt-0.5">{ch.title}</h4>
                      <p className="text-xs text-[#BEB4D6] mt-0.5">{ch.description}</p>
                    </div>

                    {chProg.claimed ? (
                      <span className="text-[11px] font-semibold text-[#35D69A] flex items-center gap-1 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Claimed
                      </span>
                    ) : chProg.completed ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleClaimChallenge(ch.id, ch.title)}
                        className="px-3 py-1.5 rounded-lg bg-[#35D69A] hover:brightness-110 text-[#100D1C] text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                      >
                        {isBusy ? 'Claiming...' : 'Claim XP'}
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-[#BEB4D6] tabular-nums">
                      <span>Progress</span>
                      <span>
                        {Math.min(chProg.current, chProg.target)} / {chProg.target} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#100D1C] overflow-hidden border border-[#6638B8]/25">
                      <div
                        className={`h-full transition-all duration-300 ${
                          chProg.completed ? 'bg-[#35D69A]' : 'bg-gradient-to-r from-[#E7B94F] to-[#FFD978]'
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
          <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,6,20,0.65)] space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#6638B8]/25">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD978]" />
                SEASON STANDINGS
              </h3>
              <span className="text-xs text-[#BEB4D6] tabular-nums">
                Page {leaderboardPage} / {leaderboardTotalPages}
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-[#BEB4D6] py-8 text-center">
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
                          ? 'bg-[#24143D] border-[#FFD978]/65'
                          : 'bg-[#19122B] border-[#6638B8]/30 hover:bg-[#2F1B4E]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 text-center font-mono font-bold text-xs text-[#FFD978] tabular-nums shrink-0">
                          #{row.rank}
                        </span>
                        <img
                          src={getRpgAvatarForClass(row.characterClass || 'Warrior')}
                          alt={row.username}
                          className="w-8 h-8 rounded-full object-cover object-top border border-[#E7B94F]/55 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F7F4FF] truncate">
                            {row.username}
                            {isCurrent ? ' (You)' : ''}
                          </p>
                          <p className="text-[11px] text-[#BEB4D6] truncate tabular-nums">
                            Tier {row.currentTier} · {row.completionPercent}% complete
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#A875FF] tabular-nums shrink-0">
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
                  className="px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 text-xs text-[#F7F4FF] disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={leaderboardPage >= leaderboardTotalPages}
                  onClick={() => void refreshSeasonState(leaderboardPage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 text-xs text-[#F7F4FF] disabled:opacity-40 flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Past Season History Archive (shown when past seasons exist) */}
          {history.length > 0 && (
            <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,6,20,0.65)] space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
                <History className="w-4 h-4 text-[#FFD978]" />
                SEASON HISTORY ARCHIVE
              </h3>
              <div className="space-y-2.5">
                {history.map(arch => (
                  <div
                    key={arch.seasonId}
                    className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-['Cinzel'] font-bold text-xs text-[#FFD978]">
                        {arch.name}
                      </span>
                      {arch.playerSummary && (
                        <span className="text-[11px] font-mono text-[#A875FF] tabular-nums">
                          Tier {arch.playerSummary.tierReached} · {arch.playerSummary.seasonXp.toLocaleString()} XP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#BEB4D6] tabular-nums">
                      {arch.playerSummary?.rank ? `Final Rank #${arch.playerSummary.rank} · ` : ''}
                      {arch.totalParticipants} participants · Champion: {arch.topPlayers?.[0]?.username || 'Realm Vanguard'}
                    </p>
                    {arch.playerSummary?.claimedRewardTitles && arch.playerSummary.claimedRewardTitles.length > 0 && (
                      <p className="text-[11px] text-[#FFD978] flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        {arch.playerSummary.claimedRewardTitles.join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seasonal Statistics Recap & Shareable Summary Card */}
      {seasonalRecap && (
        <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#E7B94F]/30 p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,6,20,0.65)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#6638B8]/25">
            <div>
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD978]" />
                SEASONAL STATISTICS RECAP
              </h3>
              <p className="text-xs text-[#BEB4D6] mt-0.5">
                {seasonalRecap.seasonName} · Verified performance chronicle with customizable sharing visibility
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyRecapSummary()}
              className="px-3.5 py-2 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#E7B94F]/40 hover:border-[#FFD978]/60 text-xs font-semibold text-[#F7F4FF] flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <Copy className="w-3.5 h-3.5 text-[#FFD978]" />
              Copy Share Card
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {seasonalRecap.visibility.workouts && (
              <div className="rounded-xl bg-[#19122B] border border-[#6638B8]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Verified Workouts</span>
                <span className="text-xl font-black font-mono text-[#F7F4FF] tabular-nums">
                  {seasonalRecap.verifiedWorkouts}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.activeDays && (
              <div className="rounded-xl bg-[#19122B] border border-[#35D69A]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Active Days</span>
                <span className="text-xl font-black font-mono text-[#35D69A] tabular-nums">
                  {seasonalRecap.activeDays}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.personalRecords && (
              <div className="rounded-xl bg-[#19122B] border border-[#E7B94F]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Personal Records</span>
                <span className="text-xl font-black font-mono text-[#FFD978] tabular-nums">
                  {seasonalRecap.personalRecordsSet}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.xpAndLevels && (
              <div className="rounded-xl bg-[#19122B] border border-[#A875FF]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Season XP · Tier</span>
                <span className="text-xl font-black font-mono text-[#A875FF] tabular-nums">
                  T{seasonalRecap.tierReached} · {seasonalRecap.seasonXpGained.toLocaleString()}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.questsAndAchievements && (
              <div className="rounded-xl bg-[#19122B] border border-[#6638B8]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Quests &amp; Honors</span>
                <span className="text-xl font-black font-mono text-[#F7F4FF] tabular-nums">
                  {seasonalRecap.questsCompleted}Q · {seasonalRecap.achievementsUnlocked}A
                </span>
              </div>
            )}
            {seasonalRecap.visibility.rivals && (
              <div className="rounded-xl bg-[#19122B] border border-[#F05B70]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Rivals Record</span>
                <span className="text-xl font-black font-mono text-[#F05B70] tabular-nums">
                  {seasonalRecap.rivalsWins}W-{seasonalRecap.rivalsLosses}L
                </span>
              </div>
            )}
            {seasonalRecap.visibility.guildAndCommunity && (
              <div className="rounded-xl bg-[#19122B] border border-[#65A9FF]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Guild &amp; Event Pts</span>
                <span className="text-xl font-black font-mono text-[#65A9FF] tabular-nums">
                  {seasonalRecap.guildAndCommunityPoints.toLocaleString()}
                </span>
              </div>
            )}
            {seasonalRecap.visibility.rarestMilestone && (
              <div className="rounded-xl bg-[#19122B] border border-[#FFD978]/30 p-3.5">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Rarest Milestone</span>
                <span className="text-xs font-bold text-[#FFD978] block truncate mt-1">
                  {seasonalRecap.rarestMilestoneTitle} ({seasonalRecap.rarestMilestoneRarity})
                </span>
              </div>
            )}
          </div>

          {seasonalRecap.previousSeasonComparison && (
            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 text-xs flex flex-wrap items-center gap-4 tabular-nums">
              <span className="font-semibold text-[#FFD978]">
                vs {seasonalRecap.previousSeasonComparison.previousSeasonName}:
              </span>
              <span className="text-[#BEB4D6]">
                Workouts {seasonalRecap.previousSeasonComparison.workoutsDelta >= 0 ? '+' : ''}
                {seasonalRecap.previousSeasonComparison.workoutsDelta}
              </span>
              <span className="text-[#BEB4D6]">
                Active Days {seasonalRecap.previousSeasonComparison.activeDaysDelta >= 0 ? '+' : ''}
                {seasonalRecap.previousSeasonComparison.activeDaysDelta}
              </span>
              <span className="text-[#BEB4D6]">
                Season XP {seasonalRecap.previousSeasonComparison.seasonXpDelta >= 0 ? '+' : ''}
                {seasonalRecap.previousSeasonComparison.seasonXpDelta}
              </span>
            </div>
          )}

        </div>
      )}

      {/* Elite Track Preview Modal */}
      {showElitePreview && (
        <div
          className="fixed inset-0 z-50 bg-[#100D1C]/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowElitePreview(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#24143D] border border-[#E7B94F]/50 p-6 space-y-4 shadow-[0_20px_50px_rgba(10,6,20,0.85)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#6638B8]/30">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#FFD978]" />
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF]">
                  Elite Battle Pass Cosmetic Track Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowElitePreview(false)}
                className="text-[#BEB4D6] hover:text-white"
                aria-label="Close Elite Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#BEB4D6]">
              All 50 Elite rewards are cosmetic banners, frames, collectible cards, relics, titles, and Cosmetic Fragments—never combat stats or XP multipliers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {milestones
                .filter(ms => Boolean(ms.eliteRewardLabel))
                .map(ms => (
                  <div
                    key={`prev-${ms.id}`}
                    className="p-3 rounded-xl bg-[#19122B] border border-[#E7B94F]/30 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-[#FFD978] block">
                        Tier {ms.tier}
                      </span>
                      <span className="font-bold text-[#F7F4FF] truncate block">
                        {ms.eliteRewardLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A875FF] shrink-0">
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
