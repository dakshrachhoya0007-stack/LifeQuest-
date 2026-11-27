import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgModalWrapper,
  RpgScrollReveal,
} from '../Motion/RpgMotionPrimitives';
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
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#A69AAF] text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#D6A84B]" />
        <span>Loading 50-Level Battle Pass...</span>
      </div>
    );
  }

  if (!seasonState) {
    return (
      <div className="lq-surface rounded-2xl p-8 text-center space-y-3">
        <Calendar className="w-7 h-7 text-[#D6A84B] mx-auto" />
        <p className="text-sm font-semibold text-[#F2EDF7]">Battle Pass unavailable right now.</p>
        <button
          type="button"
          onClick={() => void refreshSeasonState(1)}
          className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
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
    <div className="space-y-7 pb-12">
      {/* 1. BATTLE PASS COMMAND BANNER */}
      <FeatureBanner themeId="social" className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#D6A84B] to-[#7045A0] p-[2px] shadow-[0_0_24px_rgba(214,168,75,0.28)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#100D18] flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E8C777]">
                  Tier
                </span>
                <span className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F2EDF7] tabular-nums leading-none">
                  <AnimatedCounter
                    value={playerProgress.currentTier}
                    format={v => String(Math.round(v)).padStart(2, '0')}
                  />
                </span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
                  Season {season.seasonNumber} · Battle Pass
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="text-[#F2EDF7] font-medium">{season.theme}</span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="text-[#D6A84B] font-mono inline-flex items-center gap-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {formatCountdown(season.endsAt)}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7]">
                {season.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl leading-relaxed">
                {season.description}
              </p>
            </div>
          </div>

          {/* Season XP & Daily Cap Readout */}
          <div className="lg:w-[340px] shrink-0 space-y-3 lg:pl-6 lg:border-l lg:border-[#362B45]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-[#E8C777] font-bold">
                  <AnimatedCounter value={playerProgress.seasonXp} /> Season XP
                </span>
                <span className="text-[#A69AAF]">
                  {nextMilestone ? `Next: ${nextMilestone.requiredSeasonXp.toLocaleString()} XP` : 'Max Tier'}
                </span>
              </div>
              <AnimatedProgressBar
                percentage={Math.min(100, playerProgress.completionPercent)}
                barClassName="bg-gradient-to-r from-[#7045A0] via-[#9A72CC] to-[#D6A84B]"
              />
              <div className="flex items-center justify-between text-[11px] text-[#A69AAF] tabular-nums">
                <span>Tier {playerProgress.currentTier} / {totalTiers}</span>
                <span>{playerProgress.completionPercent}% Pass Complete</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#362B45] space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#A69AAF] tabular-nums">
                <span>Daily Season XP Cap</span>
                <span className="text-[#49B88A] font-semibold">
                  {dailyXpToday} / {dailyXpCap} XP
                </span>
              </div>
              <AnimatedProgressBar
                percentage={dailyCapPct}
                className="w-full h-1.5 rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden"
                barClassName="bg-[#49B88A]"
                shimmer={false}
              />
            </div>
          </div>
        </div>

        {/* Fair Play Guarantee + Elite Pass Toggle */}
        <div className="mt-5 pt-4 border-t border-[#362B45] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-xs text-[#A69AAF] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D6A84B] shrink-0" />
            Balanced progression economy: Free &amp; Elite tracks award Cosmetics, Collectible Cards, Titles, Fragments, and Gold.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowElitePreview(true)}
              className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#E8C777]" />
              Preview Elite Pass
            </button>
            {eliteUnlocked ? (
              <span className="px-3.5 py-2 rounded-xl bg-[#D6A84B]/12 border border-[#D6A84B]/45 text-xs font-bold text-[#E8C777] inline-flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Elite Pass Active
              </span>
            ) : (
              <button
                type="button"
                disabled={busyId === 'unlock-elite'}
                onClick={() => void handleUnlockElite()}
                className="lq-btn lq-btn-gold px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black tracking-wider whitespace-nowrap cursor-pointer"
              >
                {busyId === 'unlock-elite' ? 'Unlocking...' : 'Unlock Elite Pass (Earned)'}
              </button>
            )}
          </div>
        </div>
      </FeatureBanner>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs text-center font-medium ${
            notice.type === 'error'
              ? 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
              : 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#49B88A]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 2. HORIZONTAL DUAL-TRACK BATTLE PASS */}
      <section className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-lg text-[#F2EDF7] flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#D6A84B]" />
              50-Level Reward Track
            </h3>
            <p className="text-xs text-[#A69AAF] tabular-nums mt-0.5">
              Free Pass Claimed: <span className="text-[#9A72CC] font-semibold">{claimedFreeCount}/{totalTiers}</span>
              <span className="mx-2 text-[#766D82]" aria-hidden="true">·</span>
              Elite Pass Claimed: <span className="text-[#E8C777] font-semibold">{claimedEliteCount}/{totalTiers}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range Filter Controls */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#100D18] border border-[#362B45]">
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
                      ? 'bg-[#7045A0] text-[#F2EDF7] font-bold border border-[#E8C777]/30'
                      : 'text-[#A69AAF] hover:text-[#F2EDF7]'
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
                className="lq-btn lq-btn-secondary p-2 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#E8C777]" />
              </button>
              <button
                type="button"
                aria-label="Scroll Battle Pass right"
                onClick={() => scrollRailBy(440)}
                className="lq-btn lq-btn-secondary p-2 rounded-lg cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-[#E8C777]" />
              </button>
            </div>
          </div>
        </div>

        {/* Landmark Quick-Jump Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A69AAF] shrink-0">
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
                    ? 'bg-[#D6A84B] text-[#100D18]'
                    : reached
                    ? 'bg-[#21152F] border border-[#7045A0] text-[#E8C777]'
                    : 'bg-[#171220] border border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                }`}
              >
                T{tier}
              </button>
            );
          })}
        </div>

        {/* Selected Tier Interactive Reward Preview Stage */}
        {activePreviewMilestone && (
          <div className="lq-card rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="text-[#E8C777] font-bold uppercase">
                  Tier {String(activePreviewMilestone.tier).padStart(2, '0')} Spotlight
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="text-[#A69AAF] tabular-nums">
                  {activePreviewMilestone.requiredSeasonXp.toLocaleString()} Season XP Required
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className={previewUnlocked ? 'text-[#49B88A] font-semibold' : 'text-[#A69AAF]'}>
                  {previewUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
              <h4 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F2EDF7] truncate">
                {activePreviewMilestone.title}
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Free Preview Summary */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#100D18] border border-[#7045A0]/45">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-[#9A72CC] block">
                    Free · {REWARD_TYPE_LABELS[activePreviewMilestone.rewardType] || 'Reward'}
                  </span>
                  <span className="text-xs font-semibold text-[#F2EDF7] truncate block max-w-[190px]">
                    {activePreviewMilestone.rewardLabel}
                  </span>
                </div>
                {previewFreeClaimed ? (
                  <span className="text-[11px] font-semibold text-[#49B88A] shrink-0">Claimed</span>
                ) : previewUnlocked ? (
                  <button
                    type="button"
                    disabled={busyId === `${activePreviewMilestone.id}-free`}
                    onClick={() => void handleClaimMilestone(activePreviewMilestone.id, 'free')}
                    className="lq-btn lq-btn-primary px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Claim Free
                  </button>
                ) : (
                  <Lock className="w-3.5 h-3.5 text-[#766D82] shrink-0" />
                )}
              </div>

              {/* Elite Preview Summary */}
              {activePreviewMilestone.eliteRewardLabel && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#100D18] border border-[#D6A84B]/45">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-[#E8C777] block">
                      Elite · {REWARD_TYPE_LABELS[activePreviewMilestone.eliteRewardType || 'cosmetic_crest'] || 'Reward'}
                    </span>
                    <span className="text-xs font-semibold text-[#F2EDF7] truncate block max-w-[190px]">
                      {activePreviewMilestone.eliteRewardLabel}
                    </span>
                  </div>
                  {previewEliteClaimed ? (
                    <span className="text-[11px] font-semibold text-[#49B88A] shrink-0">Claimed</span>
                  ) : previewUnlocked && eliteUnlocked ? (
                    <button
                      type="button"
                      disabled={busyId === `${activePreviewMilestone.id}-elite`}
                      onClick={() => void handleClaimMilestone(activePreviewMilestone.id, 'elite')}
                      className="lq-btn lq-btn-gold px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      Claim Elite
                    </button>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#D6A84B]/60 shrink-0" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Dual-Track Battle Pass Matrix */}
        {filteredMilestones.length === 0 ? (
          <div className="lq-surface rounded-2xl py-10 text-center text-xs text-[#A69AAF]">
            No Battle Pass tiers match this filter right now.
          </div>
        ) : (
          <div className="lq-surface rounded-2xl overflow-hidden flex">
            {/* Pinned Track Legend Column */}
            <div className="hidden md:flex flex-col w-36 shrink-0 bg-[#171220] border-r border-[#362B45] z-10">
              <div className="h-[72px] px-3.5 flex flex-col justify-center border-b border-[#362B45]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A69AAF]">
                  Level Rail
                </span>
                <span className="font-['Cinzel'] font-bold text-xs text-[#F2EDF7]">
                  Tier &amp; XP
                </span>
              </div>
              <div className="h-[148px] px-3.5 flex flex-col justify-center border-b border-[#362B45] bg-[#7045A0]/[0.06]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A72CC] font-bold">
                  Free Track
                </span>
                <span className="text-[11px] text-[#A69AAF] mt-1">
                  Open to all champions
                </span>
              </div>
              <div className="h-[148px] px-3.5 flex flex-col justify-center bg-[#D6A84B]/[0.05]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E8C777] font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Elite Track
                </span>
                <span className="text-[11px] text-[#A69AAF] mt-1">
                  {eliteUnlocked ? 'Pass Active' : 'Earned Unlock'}
                </span>
              </div>
            </div>

            {/* Scrollable Horizontal Tier Columns */}
            <div
              ref={railRef}
              className="flex-1 overflow-x-auto flex divide-x divide-[#362B45] scroll-smooth bg-[#100D18]"
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
                      isSelected ? 'bg-[#21152F]' : 'hover:bg-[#171220]'
                    }`}
                  >
                    {/* Top Row: Numbered Tier Node + XP Beam */}
                    <div className="h-[72px] px-3 flex flex-col justify-center items-center relative border-b border-[#362B45]">
                      <div
                        aria-hidden="true"
                        className={`absolute left-0 right-0 top-[26px] h-[2px] ${
                          unlocked
                            ? 'bg-gradient-to-r from-[#7045A0] to-[#D6A84B]'
                            : 'bg-[#362B45]'
                        }`}
                      />
                      <div
                        className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-black tabular-nums border transition-all ${
                          unlocked
                            ? 'bg-gradient-to-br from-[#7045A0] to-[#D6A84B] text-[#100D18] border-[#E8C777]'
                            : isLandmark
                            ? 'bg-[#21152F] text-[#F2EDF7] border-[#7045A0]'
                            : 'bg-[#171220] text-[#A69AAF] border-[#362B45]'
                        }`}
                      >
                        {ms.tier}
                      </div>
                      <span className="mt-1 text-[10px] font-mono text-[#A69AAF] tabular-nums">
                        {ms.requiredSeasonXp.toLocaleString()} XP
                      </span>
                    </div>

                    {/* Middle Row: Free Pass Reward Cell */}
                    <div className="h-[148px] p-3 border-b border-[#362B45] flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#9A72CC] uppercase font-bold">
                            {REWARD_TYPE_LABELS[ms.rewardType] || 'Reward'}
                          </span>
                          <FreeIcon className="w-3.5 h-3.5 text-[#9A72CC]" />
                        </div>
                        <p className="text-xs font-semibold text-[#F2EDF7] leading-snug line-clamp-2">
                          {ms.rewardLabel}
                        </p>
                      </div>

                      {freeClaimed ? (
                        <div className="py-1.5 px-2.5 rounded-lg bg-[#49B88A]/12 border border-[#49B88A]/40 text-[11px] font-semibold text-[#49B88A] flex items-center justify-center gap-1">
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
                          className="lq-btn lq-btn-primary w-full py-1.5 px-3 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          {freeBusy ? '...' : 'Claim'}
                        </button>
                      ) : (
                        <div className="py-1.5 px-2.5 rounded-lg bg-[#171220] border border-[#362B45] text-[10px] font-mono text-[#766D82] flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" />
                          Tier {ms.tier}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Elite Pass Reward Cell */}
                    <div className="h-[148px] p-3 bg-gradient-to-b from-[#D6A84B]/[0.05] to-transparent flex flex-col justify-between">
                      {ms.eliteRewardLabel ? (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-[#E8C777] uppercase font-bold">
                                {REWARD_TYPE_LABELS[ms.eliteRewardType || 'cosmetic_crest'] || 'Elite'}
                              </span>
                              <EliteIcon className="w-3.5 h-3.5 text-[#D6A84B]" />
                            </div>
                            <p className="text-xs font-semibold text-[#F2EDF7] leading-snug line-clamp-2">
                              {ms.eliteRewardLabel}
                            </p>
                          </div>

                          {eliteClaimed ? (
                            <div className="py-1.5 px-2.5 rounded-lg bg-[#49B88A]/12 border border-[#49B88A]/40 text-[11px] font-semibold text-[#49B88A] flex items-center justify-center gap-1">
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
                              className="lq-btn lq-btn-gold w-full py-1.5 px-3 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              {eliteBusy ? '...' : 'Claim'}
                            </button>
                          ) : (
                            <div className="py-1.5 px-2.5 rounded-lg bg-[#171220] border border-[#D6A84B]/25 text-[10px] font-mono text-[#D6A84B]/70 flex items-center justify-center gap-1">
                              <Lock className="w-3 h-3" />
                              {eliteUnlocked ? `Tier ${ms.tier}` : 'Elite Pass'}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="m-auto text-[11px] text-[#766D82] font-mono">
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
      <RpgScrollReveal>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Seasonal Missions */}
          <section className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#362B45]">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#E8C777]" />
                Seasonal Missions
              </h3>
              <span className="text-xs text-[#A69AAF]">Earn Battle Pass XP</span>
            </div>

            <div className="lq-surface rounded-2xl divide-y divide-[#362B45]">
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
                          <span className="uppercase tracking-wider font-bold text-[#9A72CC]">
                            {ch.cadence === 'weekly' ? 'Weekly Mission' : 'Season Objective'}
                          </span>
                          <span className="text-[#766D82]" aria-hidden="true">·</span>
                          <span className="font-mono text-[#E8C777] tabular-nums font-semibold">
                            +{ch.seasonalXpReward} Season XP
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#F2EDF7] mt-0.5">{ch.title}</h4>
                        <p className="text-xs text-[#A69AAF] mt-0.5">{ch.description}</p>
                      </div>

                      {chProg.claimed ? (
                        <span className="text-[11px] font-semibold text-[#49B88A] flex items-center gap-1 whitespace-nowrap shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Claimed
                        </span>
                      ) : chProg.completed ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleClaimChallenge(ch.id, ch.title)}
                          className="lq-btn lq-btn-gold px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {isBusy ? 'Claiming...' : 'Claim XP'}
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-[#A69AAF] tabular-nums">
                        <span>Progress</span>
                        <span>
                          {Math.min(chProg.current, chProg.target)} / {chProg.target} ({pct}%)
                        </span>
                      </div>
                      <AnimatedProgressBar
                        percentage={pct}
                        className="w-full h-2 rounded-full bg-[#100D18] overflow-hidden border border-[#362B45]"
                        barClassName={
                          chProg.completed
                            ? 'bg-[#49B88A]'
                            : 'bg-gradient-to-r from-[#7045A0] to-[#D6A84B]'
                        }
                        shimmer={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Season Standings & Past Seasons */}
          <section className="lg:col-span-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#362B45]">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#D6A84B]" />
                  Season Standings
                </h3>
                <span className="text-xs text-[#A69AAF] tabular-nums font-mono">
                  Page {leaderboardPage} / {leaderboardTotalPages}
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <div className="lq-surface rounded-2xl py-8 px-4 text-center text-xs text-[#A69AAF]">
                  Complete verified workouts, habits, or boss strikes to enter Season {season.seasonNumber} standings.
                </div>
              ) : (
                <div className="lq-surface rounded-2xl divide-y divide-[#362B45] overflow-hidden">
                  {leaderboard.map(row => {
                    const isCurrent = Boolean(user && row.userId === user.id);
                    return (
                      <button
                        key={`${row.userId}-${row.rank}`}
                        type="button"
                        onClick={() => openPublicProfile(row.userId)}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isCurrent ? 'bg-[#21152F]' : 'hover:bg-[#21152F]/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 text-center font-mono font-bold text-xs text-[#E8C777] tabular-nums shrink-0">
                            #{row.rank}
                          </span>
                          <img
                            src={getRpgAvatarForClass(row.characterClass || 'Warrior')}
                            alt={row.username}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover object-top border border-[#7045A0] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#F2EDF7] truncate">
                              {row.username}
                              {isCurrent ? ' (You)' : ''}
                            </p>
                            <p className="text-[11px] text-[#A69AAF] truncate tabular-nums">
                              Tier {row.currentTier} · {row.completionPercent}% complete
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-[#E8C777] tabular-nums shrink-0">
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
                    className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={leaderboardPage >= leaderboardTotalPages}
                    onClick={() => void refreshSeasonState(leaderboardPage + 1)}
                    className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2 pb-2 border-b border-[#362B45]">
                  <History className="w-4 h-4 text-[#E8C777]" />
                  Season History Archive
                </h3>
                <div className="lq-surface rounded-2xl divide-y divide-[#362B45]">
                  {history.map(arch => (
                    <div key={arch.seasonId} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-['Cinzel'] font-bold text-xs text-[#E8C777]">
                          {arch.name}
                        </span>
                        {arch.playerSummary && (
                          <span className="text-[11px] font-mono text-[#F2EDF7] tabular-nums">
                            Tier {arch.playerSummary.tierReached} · {arch.playerSummary.seasonXp.toLocaleString()} XP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A69AAF] tabular-nums">
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
      </RpgScrollReveal>

      {/* 4. SEASONAL RECAP STRIP */}
      {seasonalRecap && (
        <RpgScrollReveal delay={0.05}>
          <section className="lq-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#362B45]">
              <div>
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D6A84B]" />
                  Seasonal Performance Recap
                </h3>
                <p className="text-xs text-[#A69AAF] mt-0.5">
                  {seasonalRecap.seasonName} · Verified progression chronicle
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyRecapSummary()}
                className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#E8C777]" />
                Copy Share Card
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 font-mono tabular-nums">
              {seasonalRecap.visibility.workouts && (
                <div>
                  <span className="text-[10px] uppercase text-[#A69AAF] block">Verified Workouts</span>
                  <span className="text-xl font-black text-[#F2EDF7]">{seasonalRecap.verifiedWorkouts}</span>
                </div>
              )}
              {seasonalRecap.visibility.activeDays && (
                <div>
                  <span className="text-[10px] uppercase text-[#A69AAF] block">Active Days</span>
                  <span className="text-xl font-black text-[#49B88A]">{seasonalRecap.activeDays}</span>
                </div>
              )}
              {seasonalRecap.visibility.personalRecords && (
                <div>
                  <span className="text-[10px] uppercase text-[#A69AAF] block">Personal Records</span>
                  <span className="text-xl font-black text-[#E8C777]">{seasonalRecap.personalRecordsSet}</span>
                </div>
              )}
              {seasonalRecap.visibility.xpAndLevels && (
                <div>
                  <span className="text-[10px] uppercase text-[#A69AAF] block">Season XP · Tier</span>
                  <span className="text-xl font-black text-[#9A72CC]">
                    T{seasonalRecap.tierReached} · {seasonalRecap.seasonXpGained.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </section>
        </RpgScrollReveal>
      )}

      {/* Elite Track Preview Modal */}
      <RpgModalWrapper
        isOpen={showElitePreview}
        onClose={() => setShowElitePreview(false)}
        panelClassName="w-full max-w-2xl"
      >
        <div className="lq-surface-elevated rounded-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#362B45]">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#D6A84B]" />
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">
                Elite Battle Pass Track Preview
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowElitePreview(false)}
              className="text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
              aria-label="Close Elite Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#A69AAF]">
            All Elite rewards are cosmetics, collectible cards, titles, and Cosmetic Fragments—zero competitive pay-to-win stats.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {milestones
              .filter(ms => Boolean(ms.eliteRewardLabel))
              .map(ms => (
                <div
                  key={`prev-${ms.id}`}
                  className="p-3 rounded-xl bg-[#100D18] border border-[#D6A84B]/30 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-[#E8C777] block">
                      Tier {ms.tier}
                    </span>
                    <span className="font-bold text-[#F2EDF7] truncate block">
                      {ms.eliteRewardLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#9A72CC] shrink-0">
                    {REWARD_TYPE_LABELS[ms.eliteRewardType || 'cosmetic_crest'] || ms.eliteRewardType}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </RpgModalWrapper>
    </div>
  );
};
