import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRESTIGE_CHALLENGES_CATALOG, PRESTIGE_TIERS_CATALOG } from '../../data/aaaGamingData';
import type { TrophyCategoryFilter } from '../../types/game';
import {
  Award,
  CheckCircle2,
  Crown,
  EyeOff,
  Flame,
  Layers,
  Lock,
  Pin,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';

export const TrophyShowcasePanel: React.FC = () => {
  const {
    trophyShowcase,
    hiddenAchievements,
    collectionState,
    prestigeState,
    refreshTrophyShowcase,
    updatePinnedTrophies,
    refreshCollectionState,
    claimCollectionMilestone,
    refreshPrestigeState,
    unlockPrestigeTier,
    claimPrestigeChallenge,
  } = useGame();

  const [section, setSection] = useState<'trophies' | 'collection' | 'prestige' | 'hidden'>('trophies');
  const [trophyFilter, setTrophyFilter] = useState<TrophyCategoryFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshTrophyShowcase();
    void refreshCollectionState();
    void refreshPrestigeState();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3200);
  };

  const trophies = (trophyShowcase?.trophies || []).filter(
    t => trophyFilter === 'all' || t.category === trophyFilter
  );
  const pinnedIds = trophyShowcase?.pinnedIds || [];

  const handleTogglePin = async (trophyId: string) => {
    const isPinned = pinnedIds.includes(trophyId);
    if (!isPinned && pinnedIds.length >= 6) {
      flash('error', 'Up to 6 trophies can be pinned to your profile showcase.');
      return;
    }
    const next = isPinned ? pinnedIds.filter(id => id !== trophyId) : [...pinnedIds, trophyId];
    setBusyId(`pin-${trophyId}`);
    const res = await updatePinnedTrophies(next);
    setBusyId(null);
    if (res.success) flash('success', isPinned ? 'Trophy unpinned.' : 'Trophy pinned to showcase.');
    else flash('error', res.error || 'Could not update showcase.');
  };

  const handleClaimCollectionMs = async (milestoneId: string) => {
    setBusyId(milestoneId);
    const res = await claimCollectionMilestone(milestoneId);
    setBusyId(null);
    if (res.success) flash('success', 'Collection completion milestone claimed!');
    else flash('error', res.error || 'Could not claim milestone.');
  };

  const handleAscendPrestige = async () => {
    setBusyId('prestige-ascend');
    const res = await unlockPrestigeTier();
    setBusyId(null);
    if (res.success) flash('success', 'Additive Prestige Tier unlocked—all lifetime stats and gear preserved!');
    else flash('error', res.error || 'Level requirement not yet reached.');
  };

  const handleClaimPrestigeChallenge = async (challengeId: string) => {
    setBusyId(challengeId);
    const res = await claimPrestigeChallenge(challengeId);
    setBusyId(null);
    if (res.success) flash('success', 'Prestige challenge reward claimed!');
    else flash('error', res.error || 'Challenge requirements not met yet.');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 shadow-[0_12px_32px_rgba(2,8,20,0.6)] p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
            Honors, Vault Completion & Additive Prestige
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-white mt-0.5">
            TROPHY CABINET & VAULT
          </h2>
          <p className="text-xs text-[#A9B8CC] tabular-nums mt-1">
            {trophyShowcase?.unlockedCount || 0} Trophies · {collectionState?.overallPercent || 0}% Collection Complete · Prestige Tier {prestigeState?.prestigeTier || 0}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#061225] border border-[#1677FF]/30">
          {[
            { id: 'trophies', label: 'Trophy Showcase', icon: Trophy },
            { id: 'collection', label: 'Collection Tracker', icon: Layers },
            { id: 'prestige', label: 'Prestige Tiers', icon: Crown },
            { id: 'hidden', label: 'Hidden Secrets', icon: EyeOff },
          ].map(tab => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id as typeof section)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)] border border-[#00D9FF]/45'
                    : 'text-[#A9B8CC] hover:text-white hover:bg-[#102440] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 1. PERSONAL TROPHY SHOWCASE */}
      {section === 'trophies' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'achievements', 'fitness', 'competitions', 'seasons'] as TrophyCategoryFilter[]).map(
                f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTrophyFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap shrink-0 transition-all ${
                      trophyFilter === f
                        ? 'bg-[#1677FF] text-white border border-[#00D9FF]/50 shadow-[0_0_12px_rgba(22,119,255,0.3)]'
                        : 'bg-[#0A1930] hover:bg-[#16325C] text-[#A9B8CC] hover:text-white border border-[#1677FF]/30'
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>
            <span className="text-xs text-[#A9B8CC] tabular-nums">
              {pinnedIds.length} / 6 Pinned to Public Profile
            </span>
          </div>

          {trophies.length === 0 ? (
            <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-8 text-center text-xs text-[#A9B8CC]">
              Unlock achievements, personal records, badges, or seasonal milestones to display them in your Trophy Showcase.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trophies.map(t => (
                <div
                  key={t.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-all ${
                    t.pinned
                      ? 'bg-[#102440] border-[#00D9FF]/55 shadow-[0_0_20px_rgba(0,217,255,0.15)]'
                      : 'bg-[#102440]/90 border-[#1677FF]/25 hover:border-[#00D9FF]/45'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#00D9FF] font-semibold">{t.rarity}</span>
                      <span className="text-[#A9B8CC] capitalize">{t.category}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-white">{t.title}</h4>
                    <p className="text-xs text-[#A9B8CC] mt-1">{t.description}</p>
                    <p className="text-[11px] text-[#A9B8CC]/75 mt-2">{t.requirement}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === `pin-${t.id}`}
                    onClick={() => void handleTogglePin(t.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                      t.pinned
                        ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                        : 'bg-[#0A1930] hover:bg-[#16325C] text-white border border-[#1677FF]/40 hover:border-[#00D9FF]/50'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {t.pinned ? 'Pinned on Profile' : 'Pin to Profile'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. UNIFIED COLLECTION COMPLETION TRACKER */}
      {section === 'collection' && collectionState && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 shadow-[0_12px_32px_rgba(2,8,20,0.6)] p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-['Cinzel'] font-bold text-white uppercase tracking-wider">
                Overall Vault Completion
              </span>
              <span className="font-mono font-bold text-[#00D9FF] tabular-nums">
                {collectionState.overallOwnedCount} / {collectionState.overallTotalCount} ({collectionState.overallPercent}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-[#061225] border border-[#1677FF]/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1677FF] to-[#00D9FF]"
                style={{ width: `${Math.min(100, collectionState.overallPercent)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {collectionState.categories.map(cat => (
                <div key={cat.key} className="rounded-xl bg-[#0A1930] border border-[#1677FF]/25 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-['Cinzel'] font-bold text-white">{cat.label}</span>
                    <span className="font-mono text-[#00D9FF] tabular-nums">{cat.percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#061225] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1677FF] to-[#00D9FF]"
                      style={{ width: `${Math.min(100, cat.percent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#A9B8CC] tabular-nums">
                    <span>{cat.ownedCount} Owned</span>
                    <span>{Math.max(0, cat.totalCount - cat.ownedCount - cat.undiscoveredCount)} Unowned</span>
                    <span>{cat.undiscoveredCount} Undiscovered</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collectionState.milestones.map(ms => (
              <div
                key={ms.id}
                className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 hover:border-[#00D9FF]/45 p-5 flex items-center justify-between gap-4 transition-all"
              >
                <div>
                  <p className="text-xs text-[#00D9FF] font-semibold tabular-nums">
                    {ms.thresholdPercent}% Overall Collection
                  </p>
                  <h4 className="font-['Cinzel'] font-bold text-sm text-white mt-0.5">{ms.title}</h4>
                  <p className="text-xs text-[#A9B8CC] mt-1">{ms.rewardLabel}</p>
                </div>
                <button
                  type="button"
                  disabled={!ms.unlocked || ms.claimed || busyId === ms.id}
                  onClick={() => void handleClaimCollectionMs(ms.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    ms.claimed
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      : ms.unlocked
                      ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                      : 'bg-[#0A1930] border border-[#1677FF]/25 text-[#A9B8CC]/50'
                  }`}
                >
                  {ms.claimed ? 'Claimed' : ms.unlocked ? 'Claim' : 'Locked'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ADDITIVE PRESTIGE SYSTEM (ZERO RESETS) */}
      {section === 'prestige' && prestigeState && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#1677FF]/35 shadow-[0_12px_32px_rgba(2,8,20,0.6)] p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#00D9FF] font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  Zero Reset Guarantee · Lifetime XP, Gear & Ratings Stay Intact
                </div>
                <h3 className="font-['Cinzel'] font-black text-xl text-white">
                  Prestige Tier {prestigeState.prestigeTier} · {prestigeState.prestigeTitle}
                </h3>
                <p className="text-xs text-[#A9B8CC] max-w-2xl">
                  {prestigeState.neverResetsGuarantee}
                </p>
              </div>
              <button
                type="button"
                disabled={!prestigeState.eligibleForNextPrestige || busyId === 'prestige-ascend'}
                onClick={() => void handleAscendPrestige()}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  prestigeState.eligibleForNextPrestige
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_18px_rgba(22,119,255,0.4)]'
                    : 'bg-[#0A1930] border border-[#1677FF]/25 text-[#A9B8CC]/55'
                }`}
              >
                {prestigeState.nextPrestigeTitle
                  ? `Ascend to Tier ${prestigeState.prestigeTier + 1} (Lv.${prestigeState.requiredLevelForNext})`
                  : 'Max Prestige Tier Reached'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {PRESTIGE_TIERS_CATALOG.map(pt => {
                const achieved = prestigeState.prestigeTier >= pt.tier;
                return (
                  <div
                    key={pt.tier}
                    className={`rounded-xl p-3 border space-y-1 transition-all ${
                      achieved
                        ? 'bg-[#16325C]/80 border-[#00D9FF]/55 shadow-[0_0_16px_rgba(0,217,255,0.15)]'
                        : 'bg-[#061225] border-[#1677FF]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-['Cinzel'] font-bold">
                      <span className="text-[#00D9FF]">Prestige {pt.roman}</span>
                      <span className="text-[11px] font-mono text-[#A9B8CC]">Lv.{pt.requiredLevel}</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{pt.title}</p>
                    <p className="text-[11px] text-[#A9B8CC]">{pt.rewardLabel}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESTIGE_CHALLENGES_CATALOG.map(ch => {
              const claimed = prestigeState.completedChallengeIds.includes(ch.id);
              const unlocked = prestigeState.prestigeTier >= ch.minPrestigeTier;
              return (
                <div
                  key={ch.id}
                  className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-white">{ch.title}</h4>
                    <p className="text-xs text-[#A9B8CC] mt-1">{ch.description}</p>
                    <p className="text-xs text-amber-300 font-mono tabular-nums mt-1.5">
                      +{ch.rewardGold} Gold · <span className="text-[#00D9FF]">+{ch.rewardFragments} Fragments</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!unlocked || claimed || busyId === ch.id}
                    onClick={() => void handleClaimPrestigeChallenge(ch.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                      claimed
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : unlocked
                        ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                        : 'bg-[#0A1930] border border-[#1677FF]/25 text-[#A9B8CC]/50'
                    }`}
                  >
                    {claimed ? 'Claimed' : unlocked ? 'Claim' : `Prestige ${ch.minPrestigeTier}+`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. HIDDEN ACHIEVEMENTS MYSTERY LEDGER */}
      {section === 'hidden' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hiddenAchievements.map(entry => (
            <div
              key={entry.id}
              className={`rounded-2xl p-5 border space-y-2 transition-all ${
                entry.discovered
                  ? 'bg-[#102440] border-[#00D9FF]/55 shadow-[0_0_18px_rgba(0,217,255,0.15)]'
                  : 'bg-[#102440]/85 border-[#1677FF]/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={entry.discovered ? 'text-emerald-300 font-semibold' : 'text-[#00D9FF]'}>
                  {entry.discovered ? 'Secret Discovered' : 'Mystery Concealed'}
                </span>
                <span className="text-[#00D9FF] font-semibold">{entry.rarity}</span>
              </div>
              <h4 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                {entry.discovered ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#00D9FF] shrink-0" />
                )}
                {entry.discovered ? entry.name : entry.maskedTitle}
              </h4>
              <p className="text-xs text-[#A9B8CC] leading-relaxed">
                {entry.discovered ? entry.story || entry.maskedHint : entry.maskedHint}
              </p>
              {entry.discovered && entry.titleTag && (
                <p className="text-[11px] text-[#00D9FF] font-semibold">
                  Legend Title: {entry.titleTag}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
