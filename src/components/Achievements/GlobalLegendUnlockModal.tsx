import React from 'react';
import { useGame } from '../../context/GameContext';
import { RARITY_FRAME_META, TITLE_STYLE_META } from '../../data/globalLegendsData';
import { LegendEmblemIcon, LegendTitleBadge } from '../Social/LegendTitleBadge';
import { Crown, Sparkles, Coins, Globe2, X } from 'lucide-react';
import { RpgModalWrapper } from '../Motion/RpgMotionPrimitives';

export const GlobalLegendUnlockModal: React.FC = () => {
  const {
    recentGlobalUnlockCelebration,
    dismissGlobalUnlockCelebration,
    setActiveTab,
    user,
  } = useGame();

  const entry = recentGlobalUnlockCelebration;
  const rarityMeta = entry ? RARITY_FRAME_META[entry.rarity] || RARITY_FRAME_META.Legendary : RARITY_FRAME_META.Legendary;
  const styleMeta = entry ? TITLE_STYLE_META[entry.titleStyle] || TITLE_STYLE_META.gold : TITLE_STYLE_META.gold;

  const handleOpenHall = () => {
    dismissGlobalUnlockCelebration();
    setActiveTab('hall-of-legends');
  };

  return (
    <RpgModalWrapper
      isOpen={Boolean(entry)}
      onClose={dismissGlobalUnlockCelebration}
      panelClassName="w-full max-w-lg"
    >
      {entry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-legend-unlock-title"
          className={`relative w-full rounded-2xl border bg-gradient-to-b from-[#21152F] via-[#171220] to-[#100D18] p-6 sm:p-7 shadow-[0_24px_64px_rgba(5,3,10,0.92)] overflow-hidden ${rarityMeta.borderClass}`}
        >
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 rounded-full blur-3xl opacity-35"
            style={{ backgroundColor: styleMeta.accentHex }}
          />

          <button
            type="button"
            onClick={dismissGlobalUnlockCelebration}
            aria-label="Close announcement"
            className="absolute top-4 right-4 p-2 rounded-lg text-[#A69AAF] hover:text-[#F2EDF7] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-[0.2em] text-[#E8C777] mb-3">
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
              className="text-2xl font-black font-['Cinzel'] text-[#F2EDF7] tracking-wide text-balance"
            >
              {entry.name}
            </h2>

            <p className="text-xs sm:text-sm text-[#A69AAF] mt-2 max-w-md leading-relaxed">
              {entry.story}
            </p>

            <div className="mt-5 w-full rounded-xl bg-[#100D18] border border-[#D6A84B]/40 p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#A69AAF] mb-2">
                Equipped Worldwide Exclusive Nameplate
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <LegendTitleBadge
                  title={entry.titleTag}
                  style={entry.titleStyle}
                  emblemIcon={entry.emblemIcon}
                  size="md"
                />
                <span className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">
                  {user?.username || entry.ownership?.ownerUsername}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 w-full text-xs font-mono tabular-nums">
              <div className="rounded-xl bg-[#171220] border border-[#7045A0]/45 p-2.5">
                <div className="text-[#B998E3] font-bold flex items-center justify-center gap-1">
                  {entry.rewardPlayerXp > 0 ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />+{entry.rewardPlayerXp}
                    </>
                  ) : (
                    <>
                      <Crown className="w-3.5 h-3.5 text-[#E8C777]" />Exclusive
                    </>
                  )}
                </div>
                <div className="text-[10px] text-[#A69AAF] mt-0.5">
                  {entry.rewardPlayerXp > 0 ? 'Player XP' : 'Worldwide Title'}
                </div>
              </div>
              <div className="rounded-xl bg-[#171220] border border-[#D6A84B]/45 p-2.5">
                <div className="text-[#E8C777] font-bold flex items-center justify-center gap-1">
                  <Coins className="w-3.5 h-3.5" />+{entry.rewardGold}
                </div>
                <div className="text-[10px] text-[#A69AAF] mt-0.5">Gold</div>
              </div>
            </div>

            <p className="text-[11px] text-[#49B88A] mt-4">
              A permanent Realm Herald announcement has etched your name across the Hall of Legends. No other player in the world can ever claim this title.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={handleOpenHall}
                className="lq-btn lq-btn-gold flex-1 py-2.5 px-4 font-['Cinzel'] font-bold text-xs tracking-wider whitespace-nowrap shrink-0"
              >
                <Crown className="w-4 h-4" />
                View in Hall of Legends
              </button>
              <button
                type="button"
                onClick={dismissGlobalUnlockCelebration}
                className="lq-btn lq-btn-secondary px-5 py-2.5 text-xs whitespace-nowrap shrink-0"
              >
                Continue Adventure
              </button>
            </div>
          </div>
        </div>
      )}
    </RpgModalWrapper>
  );
};
