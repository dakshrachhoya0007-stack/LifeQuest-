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
  Zap,
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
  cosmetic: 'Cosmetic',
  title: 'Title',
  badge: 'Title',
  achievement: 'Title',
  relic: 'Collectible',
  card: 'Collectible Card',
  collectible_card: 'Collectible Card',
  card_pack: 'Collectible Card',
  fragments: 'Fragments',
  gold: 'Gold',
};

const getRewardVisualMeta = (rewardType?: string) => {
  const label = REWARD_TYPE_LABELS[rewardType || ''] || 'Cosmetic';
  if (label === 'Gold') {
    return {
      label,
      icon: Coins,
      accentHex: '#FBBF24',
      bgTint: 'from-[#F59E0B]/20 via-[#102440] to-[#061225]',
    };
  }
  if (label === 'Fragments') {
    return {
      label,
      icon: Gem,
      accentHex: '#38D9F5',
      bgTint: 'from-[#00D9FF]/20 via-[#102440] to-[#061225]',
    };
  }
  if (label === 'Title') {
    return {
      label,
      icon: Award,
      accentHex: '#60A5FA',
      bgTint: 'from-[#1677FF]/25 via-[#102440] to-[#061225]',
    };
  }
  if (label === 'Collectible Card' || label === 'Collectible') {
    return {
      label,
      icon: Layers,
      accentHex: '#34D399',
      bgTint: 'from-[#10B981]/20 via-[#102440] to-[#061225]',
    };
  }
  return {
    label,
    icon: Crown,
    accentHex: '#00D9FF',
    bgTint: 'from-[#00D9FF]/20 via-[#1677FF]/15 to-[#061225]',
  };
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

  const readyClaims = useMemo(() => {
    if (!seasonState) return [] as Array<{ milestoneId: string; track: 'free' | 'elite' }>;
    const claimedFree = new Set(seasonState.playerProgress.claimedMilestoneIds);
    const claimedElite = new Set(seasonState.playerProgress.claimedEliteMilestoneIds || []);
    const eliteActive = Boolean(seasonState.playerProgress.eliteUnlocked);
    const list: Array<{ milestoneId: string; track: 'free' | 'elite' }> = [];
    for (const ms of milestones) {
      if (seasonState.playerProgress.seasonXp < ms.requiredSeasonXp) continue;
      if (!claimedFree.has(ms.id)) {
        list.push({ milestoneId: ms.id, track: 'free' });
      }
      if (eliteActive && ms.eliteRewardLabel && !claimedElite.has(ms.id)) {
        list.push({ milestoneId: ms.id, track: 'elite' });
      }
    }
    return list;
  }, [milestones, seasonState]);

  const handleClaimAllReady = async () => {
    if (readyClaims.length === 0 || busyId) return;
    setBusyId('claim-all');
    let claimedNow = 0;
    for (const item of readyClaims) {
      const res = await claimSeasonMilestone(item.milestoneId, item.track);
      if (res.success) claimedNow += 1;
    }
    setBusyId(null);
    if (claimedNow > 0) {
      showFeedback(
        'success',
        `Claimed ${claimedNow} unlocked Battle Pass ${claimedNow === 1 ? 'reward' : 'rewards'}!`
      );
    } else {
      showFeedback('error', 'Could not claim available Battle Pass rewards right now.');
    }
  };

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
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#94A8C7] text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#00D9FF]" />
        <span>Loading 50-Level Battle Pass...</span>
      </div>
    );
  }

  if (!seasonState) {
    return (
      <div className="lq-surface rounded-2xl p-8 text-center space-y-3">
        <Calendar className="w-7 h-7 text-[#00D9FF] mx-auto" />
        <p className="text-sm font-semibold text-[#F2F7FF]">Battle Pass unavailable right now.</p>
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

  const FreePreviewMeta = getRewardVisualMeta(activePreviewMilestone?.rewardType);
  const ElitePreviewMeta = getRewardVisualMeta(activePreviewMilestone?.eliteRewardType);
  const FreePreviewIcon = FreePreviewMeta.icon;
  const ElitePreviewIcon = ElitePreviewMeta.icon;

  const landmarks = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. BATTLE PASS SEASON COMMAND HERO */}
      <FeatureBanner themeId="social" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(125deg, rgba(0,217,255,0.08) 0px, rgba(0,217,255,0.08) 1px, transparent 1px, transparent 28px)',
            maskImage: 'radial-gradient(ellipse 85% 90% at 90% 10%, #000 10%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 85% 90% at 90% 10%, #000 10%, transparent 75%)',
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Gaming-style Tier Emblem */}
            <div
              className={`w-18 h-18 sm:w-22 sm:h-22 rounded-2xl p-[2px] shrink-0 ${
                eliteUnlocked
                  ? 'bg-gradient-to-br from-[#FBBF24] via-[#00D9FF] to-[#1677FF] shadow-[0_0_26px_rgba(251,191,36,0.3)]'
                  : 'bg-gradient-to-br from-[#00D9FF] to-[#1677FF] shadow-[0_0_26px_rgba(0,217,255,0.28)]'
              }`}
            >
              <div className="w-full h-full rounded-[14px] bg-[#061225] flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#38D9F5]">
                  Tier
                </span>
                <span className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F2F7FF] tabular-nums leading-none mt-0.5">
                  <AnimatedCounter
                    value={playerProgress.currentTier}
                    format={v => String(Math.round(v)).padStart(2, '0')}
                  />
                </span>
                <span className="text-[9px] font-mono text-[#647A9E] mt-0.5">/ {totalTiers}</span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                  Season {season.seasonNumber} · Battle Pass
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="text-[#F2F7FF] font-medium">{season.theme}</span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="text-[#38D9F5] font-mono inline-flex items-center gap-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {formatCountdown(season.endsAt)}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
                {season.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl leading-relaxed">
                {season.description}
              </p>
            </div>
          </div>

          {/* Season XP & Daily Cap Telemetry */}
          <div className="lg:w-[340px] shrink-0 space-y-3 lg:pl-6 lg:border-l lg:border-[#1E3A63]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-[#00D9FF] font-bold">
                  <AnimatedCounter value={playerProgress.seasonXp} /> Season XP
                </span>
                <span className="text-[#94A8C7]">
                  {nextMilestone
                    ? `Next: ${nextMilestone.requiredSeasonXp.toLocaleString()} XP`
                    : 'Max Tier Reached'}
                </span>
              </div>
              <AnimatedProgressBar
                percentage={Math.min(100, playerProgress.completionPercent)}
                barClassName="bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#FBBF24]"
              />
              <div className="flex items-center justify-between text-[11px] text-[#94A8C7] tabular-nums">
                <span>
                  Tier {playerProgress.currentTier} / {totalTiers}
                </span>
                <span className="text-[#38D9F5] font-semibold">
                  {playerProgress.completionPercent}% Pass Complete
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1E3A63] space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A8C7] tabular-nums">
                <span>Daily Season XP Cap</span>
                <span className="text-[#34D399] font-semibold">
                  {dailyXpToday} / {dailyXpCap} XP
                </span>
              </div>
              <AnimatedProgressBar
                percentage={dailyCapPct}
                className="w-full h-1.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                barClassName="bg-[#10B981]"
                shimmer={false}
              />
            </div>
          </div>
        </div>

        {/* Fair Play Guarantee + Action Strip */}
        <div className="relative z-10 mt-5 pt-4 border-t border-[#1E3A63] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-xs text-[#94A8C7] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00D9FF] shrink-0" />
            Fair-Play Pass: Free &amp; Elite tracks award Cosmetics, Collectible Cards, Titles, Fragments, and Gold.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {readyClaims.length > 0 && (
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void handleClaimAllReady()}
                className="lq-btn lq-btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#00D9FF]" />
                {busyId === 'claim-all'
                  ? 'Claiming...'
                  : `Claim All Ready (${readyClaims.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowElitePreview(true)}
              className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#00D9FF]" />
              Preview Elite Pass
            </button>
            {eliteUnlocked ? (
              <span className="px-3.5 py-2 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/50 text-xs font-bold text-[#FBBF24] inline-flex items-center gap-1.5 whitespace-nowrap">
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
              ? 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#FB7185]'
              : 'bg-[#10B981]/12 border-[#10B981]/45 text-[#34D399]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 2. HORIZONTAL DUAL-TRACK BATTLE PASS MATRIX (FREE FIRE-INSPIRED FITNESSFIGHT PASS) */}
      <section className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-lg text-[#F2F7FF] flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#FBBF24]" />
              50-Level Reward Track
            </h3>
            <p className="text-xs text-[#94A8C7] tabular-nums mt-0.5">
              Free Pass Claimed:{' '}
              <span className="text-[#00D9FF] font-semibold">
                {claimedFreeCount}/{totalTiers}
              </span>
              <span className="mx-2 text-[#647A9E]" aria-hidden="true">·</span>
              Elite Pass Claimed:{' '}
              <span className="text-[#FBBF24] font-semibold">
                {claimedEliteCount}/{totalTiers}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range Filter Controls */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#061225] border border-[#1E3A63]">
              {(
                [
                  { id: 'all', label: 'All (1–50)' },
                  { id: '1-15', label: 'Tiers 1–15' },
                  { id: '16-35', label: 'Tiers 16–35' },
                  { id: '36-50', label: 'Tiers 36–50' },
                  { id: 'claimable', label: `Ready (${readyClaims.length})` },
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTierFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    tierFilter === f.id
                      ? 'bg-[#1677FF] text-[#F2F7FF] font-bold border border-[#00D9FF]/45 shadow-[0_2px_10px_rgba(22,119,255,0.45)]'
                      : 'text-[#94A8C7] hover:text-[#F2F7FF]'
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
                <ChevronLeft className="w-4 h-4 text-[#00D9FF]" />
              </button>
              <button
                type="button"
                aria-label="Scroll Battle Pass right"
                onClick={() => scrollRailBy(440)}
                className="lq-btn lq-btn-secondary p-2 rounded-lg cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-[#00D9FF]" />
              </button>
            </div>
          </div>
        </div>

        {/* Landmark Quick-Jump Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A8C7] shrink-0">
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
                    ? 'bg-[#00D9FF] text-[#061225] shadow-[0_0_12px_rgba(0,217,255,0.4)]'
                    : reached
                    ? 'bg-[#102440] border border-[#1677FF] text-[#38D9F5]'
                    : 'bg-[#0A1930] border border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF]'
                }`}
              >
                T{tier}
              </button>
            );
          })}
        </div>

        {/* Selected Tier Interactive Reward Spotlight */}
        {activePreviewMilestone && (
          <div className="lq-card rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-[#00D9FF]/35">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="text-[#00D9FF] font-bold uppercase">
                  Tier {String(activePreviewMilestone.tier).padStart(2, '0')} Spotlight
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="text-[#94A8C7] tabular-nums">
                  {activePreviewMilestone.requiredSeasonXp.toLocaleString()} Season XP Required
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className={previewUnlocked ? 'text-[#34D399] font-semibold' : 'text-[#94A8C7]'}>
                  {previewUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
              <h4 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F2F7FF] truncate">
                {activePreviewMilestone.title}
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Free Preview Summary */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#061225] border border-[#1677FF]/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#102440] border border-[#00D9FF]/35 flex items-center justify-center shrink-0">
                    <FreePreviewIcon className="w-4 h-4 text-[#00D9FF]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-[#38D9F5] block">
                      Free · {FreePreviewMeta.label}
                    </span>
                    <span className="text-xs font-semibold text-[#F2F7FF] truncate block max-w-[190px]">
                      {activePreviewMilestone.rewardLabel}
                    </span>
                  </div>
                </div>
                {previewFreeClaimed ? (
                  <span className="text-[11px] font-semibold text-[#34D399] shrink-0">Claimed</span>
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
                  <Lock className="w-3.5 h-3.5 text-[#647A9E] shrink-0" />
                )}
              </div>

              {/* Elite Preview Summary */}
              {activePreviewMilestone.eliteRewardLabel && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#061225] border border-[#F59E0B]/45">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#102440] border border-[#F59E0B]/40 flex items-center justify-center shrink-0">
                      <ElitePreviewIcon className="w-4 h-4 text-[#FBBF24]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-[#FBBF24] block">
                        Elite · {ElitePreviewMeta.label}
                      </span>
                      <span className="text-xs font-semibold text-[#F2F7FF] truncate block max-w-[190px]">
                        {activePreviewMilestone.eliteRewardLabel}
                      </span>
                    </div>
                  </div>
                  {previewEliteClaimed ? (
                    <span className="text-[11px] font-semibold text-[#34D399] shrink-0">Claimed</span>
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
                    <Lock className="w-3.5 h-3.5 text-[#F59E0B]/60 shrink-0" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Dual-Track Battle Pass Matrix */}
        {filteredMilestones.length === 0 ? (
          <div className="lq-surface rounded-2xl py-10 text-center text-xs text-[#94A8C7]">
            No Battle Pass tiers match this filter right now.
          </div>
        ) : (
          <div className="lq-surface rounded-2xl overflow-hidden flex border-[#1E3A63]">
            {/* Pinned Track Legend Column */}
            <div className="hidden md:flex flex-col w-38 shrink-0 bg-[#0A1930] border-r border-[#1E3A63] z-10">
              <div className="h-[78px] px-4 flex flex-col justify-center border-b border-[#1E3A63]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#94A8C7]">
                  Level Rail
                </span>
                <span className="font-['Cinzel'] font-bold text-xs text-[#F2F7FF]">
                  Tier &amp; XP
                </span>
              </div>
              <div className="h-[164px] px-4 flex flex-col justify-center border-b border-[#1E3A63] bg-gradient-to-r from-[#1677FF]/[0.12] to-transparent">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#00D9FF] font-bold">
                  Free Track
                </span>
                <span className="text-[11px] text-[#94A8C7] mt-1">
                  Open to all champions
                </span>
              </div>
              <div className="h-[164px] px-4 flex flex-col justify-center bg-gradient-to-r from-[#F59E0B]/[0.10] to-transparent">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FBBF24] font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Elite Pass
                </span>
                <span className="text-[11px] text-[#94A8C7] mt-1">
                  {eliteUnlocked ? 'Pass Active' : 'Earned Unlock'}
                </span>
              </div>
            </div>

            {/* Scrollable Horizontal Tier Columns */}
            <div
              ref={railRef}
              className="flex-1 overflow-x-auto flex divide-x divide-[#1E3A63] scroll-smooth bg-[#061225]"
            >
              {filteredMilestones.map(ms => {
                const unlocked = playerProgress.seasonXp >= ms.requiredSeasonXp;
                const freeClaimed = playerProgress.claimedMilestoneIds.includes(ms.id);
                const eliteClaimed = claimedEliteIds.has(ms.id);
                const freeBusy = busyId === `${ms.id}-free`;
                const eliteBusy = busyId === `${ms.id}-elite`;
                const isSelected = selectedTier === ms.tier;
                const isCurrentTier = playerProgress.currentTier === ms.tier;
                const isLandmark = ms.tier % 5 === 0;
                const freeMeta = getRewardVisualMeta(ms.rewardType);
                const eliteMeta = getRewardVisualMeta(ms.eliteRewardType);
                const FreeIcon = freeMeta.icon;
                const EliteIcon = eliteMeta.icon;

                return (
                  <div
                    key={ms.id}
                    data-bp-tier={ms.tier}
                    onClick={() => setSelectedTier(ms.tier)}
                    className={`w-[202px] sm:w-[216px] shrink-0 flex flex-col transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#102440]/90' : 'hover:bg-[#0A1930]'
                    }`}
                  >
                    {/* Top Row: Numbered Tier Node + XP Progress Beam */}
                    <div className="h-[78px] px-3 flex flex-col justify-center items-center relative border-b border-[#1E3A63]">
                      <div
                        aria-hidden="true"
                        className={`absolute left-0 right-0 top-[28px] h-[3px] ${
                          unlocked
                            ? 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF]'
                            : 'bg-[#1E3A63]'
                        }`}
                      />
                      <div
                        className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black tabular-nums border transition-all ${
                          isCurrentTier
                            ? 'bg-gradient-to-br from-[#00D9FF] to-[#1677FF] text-[#061225] border-[#F2F7FF] shadow-[0_0_18px_rgba(0,217,255,0.55)] scale-105'
                            : unlocked
                            ? 'bg-gradient-to-br from-[#1677FF] to-[#0099FF] text-[#F2F7FF] border-[#00D9FF]/60'
                            : isLandmark
                            ? 'bg-[#102440] text-[#F2F7FF] border-[#1677FF]'
                            : 'bg-[#0A1930] text-[#94A8C7] border-[#1E3A63]'
                        }`}
                      >
                        {String(ms.tier).padStart(2, '0')}
                      </div>
                      <span className="mt-1 text-[10px] font-mono text-[#94A8C7] tabular-nums">
                        {isCurrentTier ? 'CURRENT · ' : ''}
                        {ms.requiredSeasonXp.toLocaleString()} XP
                      </span>
                    </div>

                    {/* Middle Row: Free Pass Reward Cell */}
                    <div className="h-[164px] p-3 border-b border-[#1E3A63] flex flex-col justify-between">
                      <div className="space-y-2">
                        <div
                          className={`rounded-xl p-2.5 border bg-gradient-to-br ${freeMeta.bgTint} ${
                            unlocked && !freeClaimed
                              ? 'border-[#00D9FF]/55 shadow-[0_0_16px_-6px_rgba(0,217,255,0.4)]'
                              : 'border-[#1E3A63]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-[#38D9F5] truncate">
                              {freeMeta.label}
                            </span>
                            <FreeIcon
                              className="w-4 h-4 shrink-0"
                              style={{ color: freeMeta.accentHex }}
                            />
                          </div>
                          <p className="text-xs font-semibold text-[#F2F7FF] leading-snug line-clamp-2 mt-1.5 min-h-[32px]">
                            {ms.rewardLabel}
                          </p>
                        </div>
                      </div>

                      {freeClaimed ? (
                        <div className="py-1.5 px-2.5 rounded-lg bg-[#10B981]/12 border border-[#10B981]/40 text-[11px] font-semibold text-[#34D399] flex items-center justify-center gap-1">
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
                          {freeBusy ? '...' : 'Claim Free'}
                        </button>
                      ) : (
                        <div className="py-1.5 px-2.5 rounded-lg bg-[#0A1930] border border-[#1E3A63] text-[10px] font-mono text-[#647A9E] flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" />
                          Tier {ms.tier}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Elite Pass Reward Cell */}
                    <div className="h-[164px] p-3 bg-gradient-to-b from-[#F59E0B]/[0.05] to-transparent flex flex-col justify-between">
                      {ms.eliteRewardLabel ? (
                        <>
                          <div
                            className={`rounded-xl p-2.5 border bg-gradient-to-br from-[#F59E0B]/15 via-[#102440] to-[#061225] ${
                              unlocked && eliteUnlocked && !eliteClaimed
                                ? 'border-[#FBBF24]/65 shadow-[0_0_16px_-6px_rgba(251,191,36,0.42)]'
                                : 'border-[#F59E0B]/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono uppercase font-bold text-[#FBBF24] truncate">
                                {eliteMeta.label}
                              </span>
                              <EliteIcon className="w-4 h-4 text-[#FBBF24] shrink-0" />
                            </div>
                            <p className="text-xs font-semibold text-[#F2F7FF] leading-snug line-clamp-2 mt-1.5 min-h-[32px]">
                              {ms.eliteRewardLabel}
                            </p>
                          </div>

                          {eliteClaimed ? (
                            <div className="py-1.5 px-2.5 rounded-lg bg-[#10B981]/12 border border-[#10B981]/40 text-[11px] font-semibold text-[#34D399] flex items-center justify-center gap-1">
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
                              {eliteBusy ? '...' : 'Claim Elite'}
                            </button>
                          ) : (
                            <div className="py-1.5 px-2.5 rounded-lg bg-[#0A1930] border border-[#F59E0B]/25 text-[10px] font-mono text-[#FBBF24]/75 flex items-center justify-center gap-1">
                              <Lock className="w-3 h-3" />
                              {eliteUnlocked ? `Tier ${ms.tier}` : 'Elite Pass'}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="m-auto text-[11px] text-[#647A9E] font-mono">
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
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1E3A63]">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#00D9FF]" />
                Seasonal Missions
              </h3>
              <span className="text-xs text-[#94A8C7]">Earn Battle Pass XP</span>
            </div>

            <div className="lq-surface rounded-2xl divide-y divide-[#1E3A63]">
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
                          <span className="uppercase tracking-wider font-bold text-[#38D9F5]">
                            {ch.cadence === 'weekly' ? 'Weekly Mission' : 'Season Objective'}
                          </span>
                          <span className="text-[#647A9E]" aria-hidden="true">·</span>
                          <span className="font-mono text-[#00D9FF] tabular-nums font-semibold">
                            +{ch.seasonalXpReward} Season XP
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#F2F7FF] mt-0.5">{ch.title}</h4>
                        <p className="text-xs text-[#94A8C7] mt-0.5">{ch.description}</p>
                      </div>

                      {chProg.claimed ? (
                        <span className="text-[11px] font-semibold text-[#34D399] flex items-center gap-1 whitespace-nowrap shrink-0">
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
                      <div className="flex justify-between text-[11px] font-mono text-[#94A8C7] tabular-nums">
                        <span>Progress</span>
                        <span>
                          {Math.min(chProg.current, chProg.target)} / {chProg.target} ({pct}%)
                        </span>
                      </div>
                      <AnimatedProgressBar
                        percentage={pct}
                        className="w-full h-2 rounded-full bg-[#061225] overflow-hidden border border-[#1E3A63]"
                        barClassName={
                          chProg.completed
                            ? 'bg-[#10B981]'
                            : 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF]'
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
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1E3A63]">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#00D9FF]" />
                  Season Standings
                </h3>
                <span className="text-xs text-[#94A8C7] tabular-nums font-mono">
                  Page {leaderboardPage} / {leaderboardTotalPages}
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <div className="lq-surface rounded-2xl py-8 px-4 text-center text-xs text-[#94A8C7]">
                  Complete verified workouts, habits, or boss strikes to enter Season {season.seasonNumber} standings.
                </div>
              ) : (
                <div className="lq-surface rounded-2xl divide-y divide-[#1E3A63] overflow-hidden">
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
                            className="w-8 h-8 rounded-full object-cover object-top border border-[#1677FF] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#F2F7FF] truncate">
                              {row.username}
                              {isCurrent ? ' (You)' : ''}
                            </p>
                            <p className="text-[11px] text-[#94A8C7] truncate tabular-nums">
                              Tier {row.currentTier} · {row.completionPercent}% complete
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-[#38D9F5] tabular-nums shrink-0">
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
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2 pb-2 border-b border-[#1E3A63]">
                  <History className="w-4 h-4 text-[#00D9FF]" />
                  Season History Archive
                </h3>
                <div className="lq-surface rounded-2xl divide-y divide-[#1E3A63]">
                  {history.map(arch => (
                    <div key={arch.seasonId} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-['Cinzel'] font-bold text-xs text-[#38D9F5]">
                          {arch.name}
                        </span>
                        {arch.playerSummary && (
                          <span className="text-[11px] font-mono text-[#F2F7FF] tabular-nums">
                            Tier {arch.playerSummary.tierReached} · {arch.playerSummary.seasonXp.toLocaleString()} XP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#94A8C7] tabular-nums">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E3A63]">
              <div>
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                  Seasonal Performance Recap
                </h3>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  {seasonalRecap.seasonName} · Verified progression chronicle
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyRecapSummary()}
                className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#00D9FF]" />
                Copy Share Card
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 font-mono tabular-nums">
              {seasonalRecap.visibility.workouts && (
                <div>
                  <span className="text-[10px] uppercase text-[#94A8C7] block">Verified Workouts</span>
                  <span className="text-xl font-black text-[#F2F7FF]">{seasonalRecap.verifiedWorkouts}</span>
                </div>
              )}
              {seasonalRecap.visibility.activeDays && (
                <div>
                  <span className="text-[10px] uppercase text-[#94A8C7] block">Active Days</span>
                  <span className="text-xl font-black text-[#34D399]">{seasonalRecap.activeDays}</span>
                </div>
              )}
              {seasonalRecap.visibility.personalRecords && (
                <div>
                  <span className="text-[10px] uppercase text-[#94A8C7] block">Personal Records</span>
                  <span className="text-xl font-black text-[#FBBF24]">{seasonalRecap.personalRecordsSet}</span>
                </div>
              )}
              {seasonalRecap.visibility.xpAndLevels && (
                <div>
                  <span className="text-[10px] uppercase text-[#94A8C7] block">Season XP · Tier</span>
                  <span className="text-xl font-black text-[#00D9FF]">
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
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1E3A63]">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#FBBF24]" />
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                Elite Battle Pass Track Preview
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowElitePreview(false)}
              className="text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
              aria-label="Close Elite Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#94A8C7]">
            All Elite rewards are cosmetics, collectible cards, titles, and Cosmetic Fragments—zero competitive pay-to-win stats.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {milestones
              .filter(ms => Boolean(ms.eliteRewardLabel))
              .map(ms => (
                <div
                  key={`prev-${ms.id}`}
                  className="p-3 rounded-xl bg-[#061225] border border-[#F59E0B]/35 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-[#FBBF24] block">
                      Tier {ms.tier}
                    </span>
                    <span className="font-bold text-[#F2F7FF] truncate block">
                      {ms.eliteRewardLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#38D9F5] shrink-0">
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
