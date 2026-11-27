import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { TrophyCategoryFilter } from '../../types/game';
import {
  CheckCircle2,
  EyeOff,
  Layers,
  Pin,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';

export const TrophyShowcasePanel: React.FC = () => {
  const {
    trophyShowcase,
    hiddenAchievements,
    collectionState,
    refreshTrophyShowcase,
    updatePinnedTrophies,
    refreshCollectionState,
    claimCollectionMilestone,
  } = useGame();

  const [section, setSection] = useState<'trophies' | 'collection' | 'hidden'>('trophies');
  const [trophyFilter, setTrophyFilter] = useState<TrophyCategoryFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshTrophyShowcase();
    void refreshCollectionState();
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

  return (
    <div className="space-y-6">
      <FeatureBanner
        themeId="achievements"
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"
      >
        <div>
          <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]">
            Honors, Vault Completion &amp; Hidden Secrets
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-[#F2EDF7] mt-0.5">
            Trophy Vault
          </h2>
          <p className="text-xs text-[#A69AAF] tabular-nums mt-1">
            <AnimatedCounter value={trophyShowcase?.unlockedCount || 0} /> Trophies
            <span aria-hidden="true" className="mx-1.5 text-[#766D82]">·</span>
            <AnimatedCounter value={collectionState?.overallPercent || 0} />% Vault Complete
          </p>
        </div>

        <FeatureTabBar
          themeId="achievements"
          layoutId="trophy-vault-pill"
          ariaLabel="Trophy Vault sections"
          activeId={section}
          onSelect={id => setSection(id)}
          tabs={[
            { id: 'trophies', label: 'Trophy Showcase', icon: Trophy },
            { id: 'collection', label: 'Collection Tracker', icon: Layers },
            { id: 'hidden', label: 'Hidden Secrets', icon: EyeOff },
          ]}
        />
      </FeatureBanner>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#49B88A]/10 border-[#49B88A]/45 text-[#49B88A]'
              : 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
          }`}
        >
          {notice.text}
        </div>
      )}

      <RpgSubTabTransition tabKey={section}>
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
                      className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                        trophyFilter === f
                          ? 'lq-btn-primary'
                          : 'lq-btn-secondary text-[#A69AAF]'
                      }`}
                    >
                      {f}
                    </button>
                  )
                )}
              </div>
              <span className="text-xs text-[#A69AAF] tabular-nums">
                {pinnedIds.length} / 6 Pinned to Public Profile
              </span>
            </div>

            {trophies.length === 0 ? (
              <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#A69AAF]">
                Unlock achievements, personal records, or seasonal milestones to display them in your Trophy Showcase.
              </div>
            ) : (
              <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trophies.map(t => (
                  <RpgStaggerItem key={t.id}>
                    <div
                      className={`${
                        t.pinned ? 'lq-card-gold' : 'lq-card lq-card-interactive'
                      } rounded-2xl p-4 h-full flex flex-col justify-between gap-3`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-[#E8C777] font-semibold">{t.rarity}</span>
                          <span className="text-[#A69AAF] capitalize">{t.category}</span>
                        </div>
                        <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">{t.title}</h4>
                        <p className="text-xs text-[#A69AAF] mt-1">{t.description}</p>
                        <p className="text-[11px] text-[#766D82] mt-2">{t.requirement}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === `pin-${t.id}`}
                        onClick={() => void handleTogglePin(t.id)}
                        className={`lq-btn py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          t.pinned ? 'lq-btn-gold' : 'lq-btn-secondary'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {t.pinned ? 'Pinned on Profile' : 'Pin to Profile'}
                      </button>
                    </div>
                  </RpgStaggerItem>
                ))}
              </RpgStaggerGrid>
            )}
          </div>
        )}

        {/* 2. UNIFIED COLLECTION COMPLETION TRACKER */}
        {section === 'collection' && collectionState && (
          <div className="space-y-6">
            <div className="lq-card rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-['Cinzel'] font-bold text-[#F2EDF7] uppercase tracking-wider">
                  Overall Vault Completion
                </span>
                <span className="font-mono font-bold text-[#E8C777] tabular-nums">
                  {collectionState.overallOwnedCount} / {collectionState.overallTotalCount} ({collectionState.overallPercent}%)
                </span>
              </div>
              <AnimatedProgressBar
                percentage={collectionState.overallPercent}
                className="h-2.5 rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden"
                barClassName="bg-gradient-to-r from-[#7045A0] via-[#9A72CC] to-[#D6A84B]"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-3 border-t border-[#362B45]">
                {collectionState.categories.map(cat => (
                  <div key={cat.key} className="py-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-['Cinzel'] font-bold text-[#F2EDF7]">{cat.label}</span>
                      <span className="font-mono text-[#E8C777] tabular-nums">{cat.percent}%</span>
                    </div>
                    <AnimatedProgressBar
                      percentage={cat.percent}
                      className="h-1.5 rounded-full bg-[#100D18] border border-[#362B45]/60 overflow-hidden"
                      barClassName="bg-gradient-to-r from-[#7045A0] to-[#D6A84B]"
                      shimmer={false}
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#A69AAF] tabular-nums">
                      <span>{cat.ownedCount} Owned</span>
                      <span>{Math.max(0, cat.totalCount - cat.ownedCount - cat.undiscoveredCount)} Unowned</span>
                      <span>{cat.undiscoveredCount} Undiscovered</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectionState.milestones.map(ms => (
                <RpgStaggerItem key={ms.id}>
                  <div className="lq-card lq-card-interactive rounded-2xl p-5 flex items-center justify-between gap-4 h-full">
                    <div>
                      <p className="text-xs text-[#E8C777] font-semibold tabular-nums">
                        {ms.thresholdPercent}% Overall Collection
                      </p>
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] mt-0.5">{ms.title}</h4>
                      <p className="text-xs text-[#A69AAF] mt-1">{ms.rewardLabel}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!ms.unlocked || ms.claimed || busyId === ms.id}
                      onClick={() => void handleClaimCollectionMs(ms.id)}
                      className={`lq-btn px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        ms.claimed
                          ? 'bg-[#49B88A]/15 border border-[#49B88A]/45 text-[#49B88A]'
                          : ms.unlocked
                          ? 'lq-btn-gold font-bold'
                          : 'lq-btn-secondary opacity-50'
                      }`}
                    >
                      {ms.claimed ? 'Claimed' : ms.unlocked ? 'Claim' : 'Locked'}
                    </button>
                  </div>
                </RpgStaggerItem>
              ))}
            </RpgStaggerGrid>
          </div>
        )}

        {/* 3. HIDDEN ACHIEVEMENTS MYSTERY LEDGER */}
        {section === 'hidden' && (
          <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hiddenAchievements.map(entry => (
              <RpgStaggerItem key={entry.id}>
                <div
                  className={`${
                    entry.discovered ? 'lq-card-gold' : 'lq-surface'
                  } rounded-2xl p-5 space-y-2 h-full`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={entry.discovered ? 'text-[#49B88A] font-semibold' : 'text-[#9A72CC]'}>
                      {entry.discovered ? 'Secret Discovered' : 'Mystery Concealed'}
                    </span>
                    <span className="text-[#A69AAF] font-semibold">{entry.rarity}</span>
                  </div>
                  <h4 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                    {entry.discovered ? (
                      <CheckCircle2 className="w-4 h-4 text-[#49B88A] shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-[#D6A84B] shrink-0" />
                    )}
                    {entry.discovered ? entry.name : entry.maskedTitle}
                  </h4>
                  <p className="text-xs text-[#A69AAF] leading-relaxed">
                    {entry.discovered ? entry.story || entry.maskedHint : entry.maskedHint}
                  </p>
                  {entry.discovered && entry.titleTag && (
                    <p className="text-[11px] text-[#E8C777] font-semibold">
                      Legend Title: {entry.titleTag}
                    </p>
                  )}
                </div>
              </RpgStaggerItem>
            ))}
          </RpgStaggerGrid>
        )}
      </RpgSubTabTransition>
    </div>
  );
};
