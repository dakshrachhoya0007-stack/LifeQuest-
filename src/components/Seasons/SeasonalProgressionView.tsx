import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Crown,
  Eye,
  Flame,
  Gem,
  History,
  Layers,
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

const getRewardCategoryIcon = (rewardType?: string) => {
  const label = REWARD_TYPE_LABELS[rewardType || ''] || 'Cosmetic';
  if (label === 'Gold') return Coins;
  if (label === 'Fragments') return Gem;
  if (label === 'Title') return Award;
  if (label === 'Collectible Card' || label === 'Collectible') return Layers;
  return Crown;
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
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [showElitePreview, setShowElitePreview] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void refreshSeasonState(1);
    void refreshSeasonalRecap();
  }, []);

  useEffect(() => {
    if (seasonState?.playerProgress?.currentTier) {
      setSelectedTier(Math.max(1, seasonState.playerProgress.currentTier));
    }
  }, [seasonState?.playerProgress?.currentTier]);

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
      showFeedback('error', res.error || 'Could not claim seasonal mission.');
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
      showFeedback('success', 'Elite Pass Track unlocked via earned in-game progression!');
    } else {
      showFeedback('error', res.error || 'Could not unlock Elite Pass Track.');
    }
    setBusyId(null);
  };

  const handleCopyRecapSummary = async () => {
    if (!seasonalRecap) return;
    const vis = seasonalRecap.visibility;
    const parts = [
      `FITNESSFIGHT · ${seasonalRecap.seasonName}`,
      vis.xpAndLevels
        ? `Tier ${seasonalRecap.tierReached}/50 (${seasonalRecap.seasonXpGained.toLocaleString()} XP)`
        : null,
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

  const scrollRailBy = (delta: number) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const jumpToTier = (tier: number) => {
    setTierFilter('all');
    setSelectedTier(tier);
    window.setTimeout(() => {
      const target = railRef.current?.querySelector(`[data-bp-tier="${tier}"]`) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 40);
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
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#A9B8CC] text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#00D9FF]" />
        <span>Loading 50-Level FITNESSFIGHT Battle Pass...</span>
      </div>
    );
  }

  if (!seasonState) {
    return (
      <div className="p-8 rounded-2xl bg-[#0A1930]/90 border border-[#1677FF]/35 text-center space-y-3">
        <Calendar className="w-7 h-7 text-[#00D9FF] mx-auto" />
        <p className="text-sm font-semibold text-[#FFFFFF]">Battle Pass unavailable right now.</p>
        <button
          type="button"
          onClick={() => void refreshSeasonState(1)}
          className="px-4 py-2 rounded-xl bg-[#102440] hover:bg-[#16325C] border border-[#1677FF]/45 text-xs font-semibold text-[#00D9FF] cursor-pointer"
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

  const activePreviewMilestone =
    milestones.find(m => m.tier === selectedTier) ||
    filteredMilestones[0] ||
    milestones[0] ||
    null;

  const previewUnlocked = activePreviewMilestone
    ? playerProgress.seasonXp >= activePreviewMilestone.requiredSeasonXp
    : false;
  const previewFreeClaimed = activePreviewMilestone
    ? playerProgress.claimedMilestoneIds.includes(activePreviewMilestone.id)
    : false;
  const previewEliteClaimed = activePreviewMilestone
    ? claimedEliteIds.has(activePreviewMilestone.id)
    : false;

  const landmarks = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  return (
    <div className="space-y-7 animate-in fade-in pb-12">
      {/* 1. GAMING BATTLE PASS COMMAND BANNER */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061225] via-[#0A1930] to-[#102440] border border-[#1677FF]/40 p-5 sm:p-7 shadow-[0_18px_42px_rgba(2,8,20,0.75)]">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#1677FF]/12 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Season Identity + Level Crest */}
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1677FF] to-[#0099FF] p-[2px] shadow-[0_0_24px_rgba(0,217,255,0.3)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#061225] flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#00D9FF]">
                  Tier
                </span>
                <span className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#FFFFFF] tabular-nums leading-none">
                  {String(playerProgress.currentTier).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                  Season {season.seasonNumber} · Battle Pass
                </span>
                <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
                <span className="text-[#FFFFFF] font-medium">{season.theme}</span>
                <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
                <span className="text-amber-300 font-mono inline-flex items-center gap-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {formatCountdown(season.endsAt)}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-['Cinzel'] text-[#FFFFFF]">
                {season.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl leading-relaxed">
                {season.description}
              </p>
            </div>
          </div>

          {/* Season XP & Daily Cap Readout (Hairline Panel, No Box Clutter) */}
          <div className="lg:w-[330px] shrink-0 space-y-3 lg:pl-6 lg:border-l lg:border-[#1677FF]/25">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-[#00D9FF] font-bold">
                  {playerProgress.seasonXp.toLocaleString()} Season XP
                </span>
                <span className="text-[#A9B8CC]">
                  {nextMilestone ? `Next: ${nextMilestone.requiredSeasonXp.toLocaleString()} XP` : 'Max Tier'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#061225] border border-[#1677FF]/35 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1677FF] to-[#0099FF] transition-all duration-500"
                  style={{ width: `${Math.min(100, playerProgress.completionPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#A9B8CC] tabular-nums">
                <span>Tier {playerProgress.currentTier} / {totalTiers}</span>
                <span>{playerProgress.completionPercent}% Pass Complete</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1677FF]/20 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#A9B8CC] tabular-nums">
                <span>Daily Season XP Cap</span>
                <span className="text-emerald-300 font-semibold">
                  {dailyXpToday} / {dailyXpCap} XP
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#061225] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${dailyCapPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fair Play Guarantee + Elite Pass Toggle */}
        <div className="relative z-10 mt-5 pt-4 border-t border-[#1677FF]/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-xs text-[#A9B8CC] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00D9FF] shrink-0" />
            Balanced progression economy: Free &amp; Elite tracks award Cosmetics, Collectible Cards, Titles, Fragments, and Gold.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowElitePreview(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/40 hover:border-[#00D9FF]/60 text-xs font-semibold text-[#FFFFFF] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#00D9FF]" />
              Preview Elite Pass
            </button>
            {eliteUnlocked ? (
              <span className="px-3.5 py-2 rounded-xl bg-amber-950/50 border border-amber-400/50 text-xs font-bold text-amber-300 inline-flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Elite Pass Active
              </span>
            ) : (
              <button
                type="button"
                disabled={busyId === 'unlock-elite'}
                onClick={() => void handleUnlockElite()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-[#061225] text-xs font-['Cinzel'] font-black tracking-wider whitespace-nowrap shadow-[0_0_18px_rgba(245,158,11,0.3)] cursor-pointer transition-all"
              >
                {busyId === 'unlock-elite' ? 'Unlocking...' : 'Unlock Elite Pass (Earned)'}
              </button>
            )}
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs text-center font-medium ${
            notice.type === 'error'
              ? 'bg-rose-950/75 border-rose-500/55 text-rose-100'
              : 'bg-emerald-950/70 border-emerald-500/55 text-emerald-100'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 2. HORIZONTAL DUAL-TRACK GAMING BATTLE PASS */}
      <section className="space-y-4">
        {/* Controls & Landmark Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-lg text-[#FFFFFF] flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#00D9FF]" />
              50-LEVEL REWARD TRACK
            </h3>
            <p className="text-xs text-[#A9B8CC] tabular-nums mt-0.5">
              Free Pass Claimed: <span className="text-[#00D9FF] font-semibold">{claimedFreeCount}/{totalTiers}</span>
              <span className="mx-2 text-[#A9B8CC]/40" aria-hidden="true">·</span>
              Elite Pass Claimed: <span className="text-amber-300 font-semibold">{claimedEliteCount}/{totalTiers}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range Filter Controls */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#0A1930] border border-[#1677FF]/30">
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
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    tierFilter === f.id
                      ? 'bg-[#1677FF] text-white font-bold shadow-[0_0_12px_rgba(22,119,255,0.35)]'
                      : 'text-[#A9B8CC] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Rail Scroll Buttons */}
            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                aria-label="Scroll Battle Pass left"
                onClick={() => scrollRailBy(-440)}
                className="p-2 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/35 text-[#FFFFFF] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#00D9FF]" />
              </button>
              <button
                type="button"
                aria-label="Scroll Battle Pass right"
                onClick={() => scrollRailBy(440)}
                className="p-2 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/35 text-[#FFFFFF] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-[#00D9FF]" />
              </button>
            </div>
          </div>
        </div>

        {/* Landmark Quick-Jump Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A9B8CC] shrink-0">
            Milestones:
          </span>
          {landmarks.map(tier => {
            const reached = playerProgress.currentTier >= tier;
            const active = selectedTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => jumpToTier(tier)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tabular-nums transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#00D9FF] text-[#061225]'
                    : reached
                    ? 'bg-[#102440] border border-[#00D9FF]/45 text-[#00D9FF]'
                    : 'bg-[#0A1930] border border-[#1677FF]/25 text-[#A9B8CC] hover:text-white'
                }`}
              >
                T{tier}
              </button>
            );
          })}
        </div>

        {/* Selected Tier Interactive Reward Preview Stage */}
        {activePreviewMilestone && (
          <div className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#1677FF]/35 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="text-[#00D9FF] font-bold uppercase">
                  Tier {String(activePreviewMilestone.tier).padStart(2, '0')} Spotlight
                </span>
                <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
                <span className="text-[#A9B8CC] tabular-nums">
                  {activePreviewMilestone.requiredSeasonXp.toLocaleString()} Season XP Required
                </span>
                <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
                <span className={previewUnlocked ? 'text-emerald-300 font-semibold' : 'text-[#A9B8CC]'}>
                  {previewUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
              <h4 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#FFFFFF] truncate">
                {activePreviewMilestone.title}
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Free Preview Summary */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#061225]/90 border border-[#00D9FF]/35">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-[#00D9FF] block">
                    Free · {REWARD_TYPE_LABELS[activePreviewMilestone.rewardType] || 'Reward'}
                  </span>
                  <span className="text-xs font-semibold text-[#FFFFFF] truncate block max-w-[190px]">
                    {activePreviewMilestone.rewardLabel}
                  </span>
                </div>
                {previewFreeClaimed ? (
                  <span className="text-[11px] font-semibold text-emerald-300 shrink-0">Claimed</span>
                ) : previewUnlocked ? (
                  <button
                    type="button"
                    disabled={busyId === `${activePreviewMilestone.id}-free`}
                    onClick={() => void handleClaimMilestone(activePreviewMilestone.id, 'free')}
                    className="px-3 py-1.5 rounded-lg bg-[#00D9FF] hover:brightness-110 text-[#061225] text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Claim Free
                  </button>
                ) : (
                  <Lock className="w-3.5 h-3.5 text-[#A9B8CC]/50 shrink-0" />
                )}
              </div>

              {/* Elite Preview Summary */}
              {activePreviewMilestone.eliteRewardLabel && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#061225]/90 border border-amber-400/40">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-amber-300 block">
                      Elite · {REWARD_TYPE_LABELS[activePreviewMilestone.eliteRewardType || 'cosmetic_crest'] || 'Reward'}
                    </span>
                    <span className="text-xs font-semibold text-[#FFFFFF] truncate block max-w-[190px]">
                      {activePreviewMilestone.eliteRewardLabel}
                    </span>
                  </div>
                  {previewEliteClaimed ? (
                    <span className="text-[11px] font-semibold text-emerald-300 shrink-0">Claimed</span>
                  ) : previewUnlocked && eliteUnlocked ? (
                    <button
                      type="button"
                      disabled={busyId === `${activePreviewMilestone.id}-elite`}
                      onClick={() => void handleClaimMilestone(activePreviewMilestone.id, 'elite')}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:brightness-110 text-[#061225] text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      Claim Elite
                    </button>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-300/60 shrink-0" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Dual-Track Battle Pass Matrix */}
        {filteredMilestones.length === 0 ? (
          <div className="rounded-2xl bg-[#0A1930]/80 border border-[#1677FF]/25 py-10 text-center text-xs text-[#A9B8CC]">
            No Battle Pass tiers match this filter right now.
          </div>
        ) : (
          <div className="rounded-2xl bg-[#061225]/95 border border-[#1677FF]/35 overflow-hidden shadow-[0_14px_36px_rgba(2,8,20,0.75)] flex">
            {/* Pinned Track Legend Column (Desktop/Tablet) */}
            <div className="hidden md:flex flex-col w-36 shrink-0 bg-[#0A1930] border-r border-[#1677FF]/25 z-10">
              <div className="h-[72px] px-3.5 flex flex-col justify-center border-b border-[#1677FF]/20">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A9B8CC]">
                  Level Rail
                </span>
                <span className="font-['Cinzel'] font-bold text-xs text-[#FFFFFF]">
                  Tier &amp; XP
                </span>
              </div>
              <div className="h-[148px] px-3.5 flex flex-col justify-center border-b border-[#1677FF]/20 bg-[#00D9FF]/[0.03]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#00D9FF] font-bold">
                  Free Track
                </span>
                <span className="text-[11px] text-[#A9B8CC] mt-1">
                  Open to all champions
                </span>
              </div>
              <div className="h-[148px] px-3.5 flex flex-col justify-center bg-amber-500/[0.04]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Elite Track
                </span>
                <span className="text-[11px] text-[#A9B8CC] mt-1">
                  {eliteUnlocked ? 'Pass Active' : 'Earned Unlock'}
                </span>
              </div>
            </div>

            {/* Scrollable Horizontal Tier Columns */}
            <div
              ref={railRef}
              className="flex-1 overflow-x-auto flex divide-x divide-[#1677FF]/20 scroll-smooth"
            >
              {filteredMilestones.map(ms => {
                const unlocked = playerProgress.seasonXp >= ms.requiredSeasonXp;
                const freeClaimed = playerProgress.claimedMilestoneIds.includes(ms.id);
                const eliteClaimed = claimedEliteIds.has(ms.id);
                const freeBusy = busyId === `${ms.id}-free`;
                const eliteBusy = busyId === `${ms.id}-elite`;
                const isSelected = selectedTier === ms.tier;
                const isLandmark = ms.tier % 5 === 0;
                const FreeIcon = getRewardCategoryIcon(ms.rewardType);
                const EliteIcon = getRewardCategoryIcon(ms.eliteRewardType);

                return (
                  <div
                    key={ms.id}
                    data-bp-tier={ms.tier}
                    onClick={() => setSelectedTier(ms.tier)}
                    className={`w-[196px] sm:w-[210px] shrink-0 flex flex-col transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#102440]/55' : 'hover:bg-[#0A1930]/60'
                    }`}
                  >
                    {/* Top Row: Numbered Tier Node + XP Beam */}
                    <div className="h-[72px] px-3 flex flex-col justify-center items-center relative border-b border-[#1677FF]/20">
                      <div
                        aria-hidden="true"
                        className={`absolute left-0 right-0 top-[26px] h-[2px] ${
                          unlocked
                            ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF]'
                            : 'bg-[#1677FF]/20'
                        }`}
                      />
                      <div
                        className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-black tabular-nums border transition-all ${
                          unlocked
                            ? 'bg-gradient-to-br from-[#1677FF] to-[#0099FF] text-[#061225] border-[#00D9FF] shadow-[0_0_14px_rgba(0,217,255,0.4)]'
                            : isLandmark
                            ? 'bg-[#102440] text-[#FFFFFF] border-[#1677FF]/55'
                            : 'bg-[#0A1930] text-[#A9B8CC] border-[#1677FF]/30'
                        }`}
                      >
                        {ms.tier}
                      </div>
                      <span className="mt-1 text-[10px] font-mono text-[#A9B8CC] tabular-nums">
                        {ms.requiredSeasonXp.toLocaleString()} XP
                      </span>
                    </div>

                    {/* Middle Row: Free Pass Reward Cell */}
                    <div className="h-[148px] p-3 border-b border-[#1677FF]/20 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#00D9FF] uppercase font-bold">
                            {REWARD_TYPE_LABELS[ms.rewardType] || 'Reward'}
                          </span>
                          <FreeIcon className="w-3.5 h-3.5 text-[#00D9FF]" />
                        </div>
                        <p className="text-xs font-semibold text-[#FFFFFF] leading-snug line-clamp-2">
                          {ms.rewardLabel}
                        </p>
                      </div>

                      {freeClaimed ? (
                        <div className="py-1.5 px-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Claimed
                        </div>
                      ) : unlocked ? (
                        <button
                          type="button"
                          disabled={freeBusy}
                          onClick={e => {
                            e.stopPropagation();
                            void handleClaimMilestone(ms.id, 'free');
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 text-[#061225] text-[11px] font-bold shadow-[0_0_14px_rgba(0,217,255,0.3)] cursor-pointer transition-all"
                        >
                          {freeBusy ? '...' : 'Claim'}
                        </button>
                      ) : (
                        <div className="py-1.5 px-2.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/20 text-[10px] font-mono text-[#A9B8CC]/70 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" />
                          Tier {ms.tier}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Elite Pass Reward Cell */}
                    <div className="h-[148px] p-3 bg-gradient-to-b from-amber-500/[0.04] to-transparent flex flex-col justify-between">
                      {ms.eliteRewardLabel ? (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-amber-300 uppercase font-bold">
                                {REWARD_TYPE_LABELS[ms.eliteRewardType || 'cosmetic_crest'] || 'Elite'}
                              </span>
                              <EliteIcon className="w-3.5 h-3.5 text-amber-300" />
                            </div>
                            <p className="text-xs font-semibold text-[#FFFFFF] leading-snug line-clamp-2">
                              {ms.eliteRewardLabel}
                            </p>
                          </div>

                          {eliteClaimed ? (
                            <div className="py-1.5 px-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Claimed
                            </div>
                          ) : unlocked && eliteUnlocked ? (
                            <button
                              type="button"
                              disabled={eliteBusy}
                              onClick={e => {
                                e.stopPropagation();
                                void handleClaimMilestone(ms.id, 'elite');
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-300 hover:brightness-110 text-[#061225] text-[11px] font-bold shadow-[0_0_14px_rgba(245,158,11,0.3)] cursor-pointer transition-all"
                            >
                              {eliteBusy ? '...' : 'Claim'}
                            </button>
                          ) : (
                            <div className="py-1.5 px-2.5 rounded-lg bg-[#0A1930] border border-amber-400/20 text-[10px] font-mono text-amber-200/70 flex items-center justify-center gap-1">
                              <Lock className="w-3 h-3" />
                              {eliteUnlocked ? `Tier ${ms.tier}` : 'Elite Pass'}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="m-auto text-[11px] text-[#A9B8CC]/45 font-mono">
                          Free Tier Only
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 3. SEASONAL MISSIONS & STANDINGS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Seasonal Missions */}
        <section className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1677FF]/25">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#00D9FF]" />
              SEASONAL MISSIONS
            </h3>
            <span className="text-xs text-[#A9B8CC]">Earn Battle Pass XP</span>
          </div>

          <div className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/30 divide-y divide-[#1677FF]/20">
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
                <div key={ch.id} className="p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="uppercase tracking-wider font-bold text-[#00D9FF]">
                          {ch.cadence === 'weekly' ? 'Weekly Mission' : 'Season Objective'}
                        </span>
                        <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
                        <span className="font-mono text-amber-300 tabular-nums font-semibold">
                          +{ch.seasonalXpReward} Season XP
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#FFFFFF] mt-0.5">{ch.title}</h4>
                      <p className="text-xs text-[#A9B8CC] mt-0.5">{ch.description}</p>
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
                        className="px-3 py-1.5 rounded-lg bg-[#00D9FF] hover:brightness-110 text-[#061225] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isBusy ? 'Claiming...' : 'Claim XP'}
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-[#A9B8CC] tabular-nums">
                      <span>Progress</span>
                      <span>
                        {Math.min(chProg.current, chProg.target)} / {chProg.target} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#061225] overflow-hidden border border-[#1677FF]/25">
                      <div
                        className={`h-full transition-all duration-300 ${
                          chProg.completed
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-[#1677FF] to-[#0099FF]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Season Standings & Past Seasons */}
        <section className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1677FF]/25">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#00D9FF]" />
                SEASON STANDINGS
              </h3>
              <span className="text-xs text-[#A9B8CC] tabular-nums">
                Page {leaderboardPage} / {leaderboardTotalPages}
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/25 py-8 px-4 text-center text-xs text-[#A9B8CC]">
                Complete verified workouts, habits, or boss strikes to enter Season {season.seasonNumber} standings.
              </div>
            ) : (
              <div className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/30 divide-y divide-[#1677FF]/15 overflow-hidden">
                {leaderboard.map(row => {
                  const isCurrent = Boolean(user && row.userId === user.id);
                  return (
                    <button
                      key={`${row.userId}-${row.rank}`}
                      type="button"
                      onClick={() => openPublicProfile(row.userId)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-[#102440]' : 'hover:bg-[#102440]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 text-center font-mono font-bold text-xs text-[#00D9FF] tabular-nums shrink-0">
                          #{row.rank}
                        </span>
                        <img
                          src={getRpgAvatarForClass(row.characterClass || 'Warrior')}
                          alt={row.username}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover object-top border border-[#1677FF]/55 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#FFFFFF] truncate">
                            {row.username}
                            {isCurrent ? ' (You)' : ''}
                          </p>
                          <p className="text-[11px] text-[#A9B8CC] truncate tabular-nums">
                            Tier {row.currentTier} · {row.completionPercent}% complete
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#00D9FF] tabular-nums shrink-0">
                        {row.seasonXp.toLocaleString()} XP
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {leaderboardTotalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={leaderboardPage <= 1}
                  onClick={() => void refreshSeasonState(leaderboardPage - 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/35 text-xs text-[#FFFFFF] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={leaderboardPage >= leaderboardTotalPages}
                  onClick={() => void refreshSeasonState(leaderboardPage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/35 text-xs text-[#FFFFFF] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF] flex items-center gap-2 pb-2 border-b border-[#1677FF]/25">
                <History className="w-4 h-4 text-[#00D9FF]" />
                SEASON HISTORY ARCHIVE
              </h3>
              <div className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/30 divide-y divide-[#1677FF]/15">
                {history.map(arch => (
                  <div key={arch.seasonId} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-['Cinzel'] font-bold text-xs text-[#00D9FF]">
                        {arch.name}
                      </span>
                      {arch.playerSummary && (
                        <span className="text-[11px] font-mono text-[#FFFFFF] tabular-nums">
                          Tier {arch.playerSummary.tierReached} · {arch.playerSummary.seasonXp.toLocaleString()} XP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#A9B8CC] tabular-nums">
                      {arch.playerSummary?.rank ? `Final Rank #${arch.playerSummary.rank} · ` : ''}
                      {arch.totalParticipants} participants · Champion: {arch.topPlayers?.[0]?.username || 'Realm Vanguard'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 4. SEASONAL RECAP STRIP */}
      {seasonalRecap && (
        <section className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/30 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1677FF]/20">
            <div>
              <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                SEASONAL PERFORMANCE RECAP
              </h3>
              <p className="text-xs text-[#A9B8CC] mt-0.5">
                {seasonalRecap.seasonName} · Verified progression chronicle
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyRecapSummary()}
              className="px-3.5 py-2 rounded-xl bg-[#061225] hover:bg-[#102440] border border-[#1677FF]/40 hover:border-[#00D9FF]/60 text-xs font-semibold text-[#FFFFFF] inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#00D9FF]" />
              Copy Share Card
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 font-mono tabular-nums">
            {seasonalRecap.visibility.workouts && (
              <div>
                <span className="text-[10px] uppercase text-[#A9B8CC] block">Verified Workouts</span>
                <span className="text-xl font-black text-[#FFFFFF]">{seasonalRecap.verifiedWorkouts}</span>
              </div>
            )}
            {seasonalRecap.visibility.activeDays && (
              <div>
                <span className="text-[10px] uppercase text-[#A9B8CC] block">Active Days</span>
                <span className="text-xl font-black text-emerald-300">{seasonalRecap.activeDays}</span>
              </div>
            )}
            {seasonalRecap.visibility.personalRecords && (
              <div>
                <span className="text-[10px] uppercase text-[#A9B8CC] block">Personal Records</span>
                <span className="text-xl font-black text-amber-300">{seasonalRecap.personalRecordsSet}</span>
              </div>
            )}
            {seasonalRecap.visibility.xpAndLevels && (
              <div>
                <span className="text-[10px] uppercase text-[#A9B8CC] block">Season XP · Tier</span>
                <span className="text-xl font-black text-[#00D9FF]">
                  T{seasonalRecap.tierReached} · {seasonalRecap.seasonXpGained.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Elite Track Preview Modal */}
      {showElitePreview && (
        <div
          className="fixed inset-0 z-50 bg-[#061225]/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowElitePreview(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0A1930] border border-[#1677FF]/50 p-6 space-y-4 shadow-[0_20px_50px_rgba(2,8,20,0.85)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1677FF]/25">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-300" />
                <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
                  Elite Battle Pass Track Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowElitePreview(false)}
                className="text-[#A9B8CC] hover:text-white cursor-pointer"
                aria-label="Close Elite Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#A9B8CC]">
              All Elite rewards are cosmetics, collectible cards, titles, and Cosmetic Fragments—zero competitive pay-to-win stats.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {milestones
                .filter(ms => Boolean(ms.eliteRewardLabel))
                .map(ms => (
                  <div
                    key={`prev-${ms.id}`}
                    className="p-3 rounded-xl bg-[#061225] border border-amber-400/25 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-amber-300 block">
                        Tier {ms.tier}
                      </span>
                      <span className="font-bold text-[#FFFFFF] truncate block">
                        {ms.eliteRewardLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#00D9FF] shrink-0">
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
