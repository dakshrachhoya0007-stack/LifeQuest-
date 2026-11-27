import React from 'react';
import { useGame } from '../../context/GameContext';
import { RARITY_FRAME_META, TITLE_STYLE_META } from '../../data/globalLegendsData';
import { LegendEmblemIcon, LegendTitleBadge } from '../Social/LegendTitleBadge';
import { Crown, Sparkles, Coins, Globe2, X } from 'lucide-react';

export const GlobalLegendUnlockModal: React.FC = () => {
  const {
    recentGlobalUnlockCelebration,
    dismissGlobalUnlockCelebration,
    setActiveTab,
    user,
  } = useGame();

  if (!recentGlobalUnlockCelebration) return null;

  const entry = recentGlobalUnlockCelebration;
  const rarityMeta = RARITY_FRAME_META[entry.rarity] || RARITY_FRAME_META.Legendary;
  const styleMeta = TITLE_STYLE_META[entry.titleStyle] || TITLE_STYLE_META.gold;

  const handleOpenHall = () => {
    dismissGlobalUnlockCelebration();
    setActiveTab('hall-of-legends');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-legend-unlock-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061225]/85 backdrop-blur-md animate-in fade-in"
    >
      <div
        className={`relative w-full max-w-lg rounded-2xl border bg-gradient-to-b from-[#102440] via-[#0A1930] to-[#061225] p-6 sm:p-7 shadow-[0_24px_64px_rgba(4,12,28,0.92)] overflow-hidden ${rarityMeta.borderClass}`}
      >
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 rounded-full blur-3xl opacity-35"
          style={{ backgroundColor: styleMeta.accentHex }}
        />

        <button
          type="button"
          onClick={dismissGlobalUnlockCelebration}
          aria-label="Close announcement"
          className="absolute top-4 right-4 p-2 rounded-lg text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-[0.2em] text-[#FFD978] mb-3">
            <Globe2 className="w-3.5 h-3.5" />
            <span>World-First Achievement Claimed Forever</span>
          </div>

          <div
            className={`w-20 h-20 rounded-2xl border flex items-center justify-center mb-4 shadow-xl ${styleMeta.badgeBg} ${styleMeta.badgeBorder} ${styleMeta.glowShadow}`}
          >
            <LegendEmblemIcon iconName={entry.emblemIcon} className={`w-10 h-10 ${styleMeta.badgeText}`} />
          </div>

          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${rarityMeta.textClass}`}>
            {entry.rarity} · {entry.difficulty}
          </p>

          <h2
            id="global-legend-unlock-title"
            className="text-2xl font-black font-['Cinzel'] text-[#F2F7FF] tracking-wide"
          >
            {entry.name}
          </h2>

          <p className="text-xs sm:text-sm text-[#94A8C7] mt-2 max-w-md leading-relaxed">
            {entry.story}
          </p>

          <div className="mt-5 w-full rounded-xl bg-[#061225] border border-[#E7B94F]/35 p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#94A8C7] mb-2">
              Equipped Worldwide Exclusive Nameplate
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <LegendTitleBadge
                title={entry.titleTag}
                style={entry.titleStyle}
                emblemIcon={entry.emblemIcon}
                size="md"
              />
              <span className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                {user?.username || entry.ownership?.ownerUsername}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 w-full text-xs font-mono tabular-nums">
            <div className="rounded-xl bg-[#0A1930] border border-[#00D9FF]/40 p-2.5">
              <div className="text-[#00D9FF] font-bold flex items-center justify-center gap-1">
                {entry.rewardPlayerXp > 0 ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />+{entry.rewardPlayerXp}
                  </>
                ) : (
                  <>
                    <Crown className="w-3.5 h-3.5 text-[#FFD978]" />Exclusive
                  </>
                )}
              </div>
              <div className="text-[10px] text-[#94A8C7] mt-0.5">
                {entry.rewardPlayerXp > 0 ? 'Player XP' : 'Worldwide Title'}
              </div>
            </div>
            <div className="rounded-xl bg-[#0A1930] border border-[#E7B94F]/40 p-2.5">
              <div className="text-[#FFD978] font-bold flex items-center justify-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{entry.rewardGold}
              </div>
              <div className="text-[10px] text-[#94A8C7] mt-0.5">Gold</div>
            </div>
          </div>

          <p className="text-[11px] text-[#35D69A] mt-4">
            A permanent Realm Herald announcement has etched your name across the Hall of Legends. No other player in the world can ever claim this title.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              type="button"
              onClick={handleOpenHall}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] hover:from-[#FFD978] hover:to-[#FFAA45] border border-[#FFD978]/50 text-[#061225] font-['Cinzel'] font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(231,185,79,0.35)] transition-all whitespace-nowrap shrink-0"
            >
              <Crown className="w-4 h-4" />
              View in Hall of Legends
            </button>
            <button
              type="button"
              onClick={dismissGlobalUnlockCelebration}
              className="px-5 py-2.5 rounded-xl bg-[#0A1930] hover:bg-[#152E52] border border-[#1677FF]/45 hover:border-[#00D9FF]/65 text-xs font-semibold text-[#F2F7FF] transition-all whitespace-nowrap shrink-0"
            >
              Continue Adventure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
