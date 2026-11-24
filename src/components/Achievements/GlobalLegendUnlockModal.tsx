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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090910]/85 backdrop-blur-md animate-in fade-in"
    >
      <div
        className={`relative w-full max-w-lg rounded-2xl border bg-gradient-to-b from-[#141420] via-[#0E0E17] to-[#090910] p-6 sm:p-7 shadow-[0_24px_64px_rgba(9,9,16,0.9)] overflow-hidden ${rarityMeta.borderClass}`}
      >
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: styleMeta.accentHex }}
        />

        <button
          type="button"
          onClick={dismissGlobalUnlockCelebration}
          aria-label="Close announcement"
          className="absolute top-4 right-4 p-2 rounded-lg text-[#A1A1B8] hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-[0.2em] text-[#D6A84B] mb-3">
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
            className="text-2xl font-black font-['Cinzel'] text-white tracking-wide"
          >
            {entry.name}
          </h2>

          <p className="text-xs sm:text-sm text-[#A1A1B8] mt-2 max-w-md leading-relaxed">
            {entry.story}
          </p>

          <div className="mt-5 w-full rounded-xl bg-[#090910] border border-[#8B5CF6]/30 p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#A1A1B8] mb-2">
              Equipped Worldwide Exclusive Nameplate
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <LegendTitleBadge
                title={entry.titleTag}
                style={entry.titleStyle}
                emblemIcon={entry.emblemIcon}
                size="md"
              />
              <span className="font-['Cinzel'] font-bold text-base text-white">
                {user?.username || entry.ownership?.ownerUsername}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 w-full text-xs font-mono tabular-nums">
            <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/40 p-2.5">
              <div className="text-[#8B5CF6] font-bold flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />+{entry.rewardPlayerXp}
              </div>
              <div className="text-[10px] text-[#A1A1B8] mt-0.5">Player XP</div>
            </div>
            <div className="rounded-xl bg-[#0E0E17] border border-[#FBBF24]/35 p-2.5">
              <div className="text-[#FBBF24] font-bold flex items-center justify-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{entry.rewardGold}
              </div>
              <div className="text-[10px] text-[#A1A1B8] mt-0.5">Gold</div>
            </div>
          </div>

          <p className="text-[11px] text-[#34D399] mt-4">
            A permanent Realm Herald announcement has etched your name across the Hall of Legends. No other player in the world can ever claim this title.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              type="button"
              onClick={handleOpenHall}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] hover:brightness-110 border border-[#FBBF24]/45 text-[#090910] font-['Cinzel'] font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(214,168,75,0.35)] transition-all whitespace-nowrap shrink-0"
            >
              <Crown className="w-4 h-4" />
              View in Hall of Legends
            </button>
            <button
              type="button"
              onClick={dismissGlobalUnlockCelebration}
              className="px-5 py-2.5 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/40 hover:border-[#D6A84B]/65 text-xs font-semibold text-white transition-all whitespace-nowrap shrink-0"
            >
              Continue Adventure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
