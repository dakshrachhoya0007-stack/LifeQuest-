import React, { useMemo, useState } from 'react';
import {
  Coins,
  Compass,
  Eye,
  EyeOff,
  Flame,
  Lock,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { Buff, Kingdom, PlayableHeroId, PlayerStats, UserAccount } from '../../types/game';
import { getHeroById } from '../../data/heroesData';
import { aetheriaCitadelKingdomImg, getHeroArtwork } from '../../assets/images';
import { AtmosphereParticlesCanvas } from './AtmosphereParticlesCanvas';

interface AetheriaKingdomHeroProps {
  user: UserAccount | null;
  stats: PlayerStats;
  selectedHeroId: PlayableHeroId;
  heroLocked?: boolean;
  restorationRatio: number;
  currentKingdom: Kingdom;
  unlockedKingdomsCount: number;
  activeBuffs: Buff[];
  onNavigate: (tab: string) => void;
  onOpenHeroSelect: () => void;
}

type SanctuaryFocusMode = 'courtyard' | 'hero';

export const AetheriaKingdomHero: React.FC<AetheriaKingdomHeroProps> = ({
  user,
  stats,
  selectedHeroId,
  heroLocked = true,
  restorationRatio,
  currentKingdom,
  unlockedKingdomsCount,
  activeBuffs,
  onNavigate,
  onOpenHeroSelect,
}) => {
  const [focusMode, setFocusMode] = useState<SanctuaryFocusMode>('courtyard');
  const [hudHidden, setHudHidden] = useState(false);

  const heroDef = useMemo(() => getHeroById(selectedHeroId), [selectedHeroId]);
  const heroArtSrc = useMemo(
    () => getHeroArtwork(selectedHeroId, user?.characterClass),
    [selectedHeroId, user?.characterClass]
  );

  const xpPercent = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );
  const restorationPercent = Math.round(Math.max(0, Math.min(1, restorationRatio)) * 100);

  return (
    <section
      data-tutorial-id="castle-courtyard"
      aria-label="World of Aetheria Sanctuary and Champion"
      className="relative w-full h-[500px] sm:h-[550px] lg:h-[600px] rounded-2xl overflow-hidden border border-[#8B5CF6]/30 bg-[#090910] shadow-2xl select-none"
    >
      {/* Citadel Backdrop & Atmospheric Particles */}
      <div className="absolute inset-0 bg-[#090910]">
        <img
          src={aetheriaCitadelKingdomImg}
          alt="Aetheria Citadel Sanctuary"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center transition-all duration-700 ${
            focusMode === 'hero' ? 'opacity-35 scale-105 filter blur-[2px]' : 'opacity-60 scale-100'
          }`}
        />
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              focusMode === 'hero'
                ? `radial-gradient(circle at 50% 42%, ${heroDef.accentHex}28 0%, rgba(14, 14, 23, 0.88) 62%, #090910 100%)`
                : 'radial-gradient(circle at 50% 46%, rgba(20, 20, 32, 0.35) 0%, rgba(9, 9, 16, 0.84) 68%, #090910 100%)',
          }}
        />
        <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={false} />
      </div>

      {/* Featured Champion Artwork Focal Point */}
      <div className="relative z-10 h-full flex items-center justify-center px-4 pt-16 pb-32 sm:pb-28 pointer-events-none">
        <div
          className={`relative transition-all duration-500 ${
            focusMode === 'hero'
              ? 'w-56 sm:w-64 lg:w-72 aspect-[3/4]'
              : 'w-44 sm:w-52 lg:w-60 aspect-[3/4]'
          } rounded-2xl overflow-hidden border border-[#D6A84B]/50 bg-[#141420] shadow-2xl`}
          style={{
            boxShadow: `0 24px 60px -12px rgba(4, 4, 10, 0.92), 0 0 36px -10px ${heroDef.accentHex}55`,
          }}
        >
          <img
            src={heroArtSrc}
            alt={`${heroDef.name} — ${heroDef.archetype}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#090910] via-[#090910]/65 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span
                className="text-[9px] font-mono uppercase tracking-widest font-bold block truncate"
                style={{ color: heroDef.accentHex }}
              >
                {heroDef.archetype}
              </span>
              <span className="font-['Cinzel'] font-black text-xs sm:text-sm text-[#F8FAFC] block truncate">
                {heroDef.name}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#D6A84B] shrink-0">
              {stats.aetherRank}
            </span>
          </div>
        </div>
      </div>

      {/* TOP HUD: Champion Identity & Sanctuary View Controls */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 sm:top-4 sm:left-5 sm:right-5 z-20 flex flex-wrap items-start justify-between gap-3">
        {!hudHidden ? (
          <div className="pointer-events-auto flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#141420]/90 backdrop-blur-md border border-[#8B5CF6]/30 shadow-xl max-w-full sm:max-w-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-bold font-['Cinzel'] text-[#F8FAFC] tracking-wide truncate">
                  {user?.characterName || user?.username || heroDef.name}
                </h1>
                <span className="text-[11px] font-mono font-bold text-[#D6A84B] bg-[#0E0E17] border border-[#D6A84B]/45 px-2 py-0.5 rounded tabular-nums">
                  Lv.{stats.level}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#D6A84B] font-medium truncate mt-0.5">
                {heroDef.name} · {heroDef.mappedClass} Class · {stats.aetherRank}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#A1A1B8] truncate mt-0.5">
                Kingdom:{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('storyline')}
                  className="text-[#8B5CF6] hover:text-[#D6A84B] font-semibold transition-colors"
                >
                  {currentKingdom.name}
                </button>
                <span className="hidden sm:inline text-[#A1A1B8]/75">
                  {' '}
                  · Citadel Restored {restorationPercent}% · {unlockedKingdomsCount} Realms Open
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-[#141420]/90 backdrop-blur-md border border-[#D6A84B]/35 text-xs font-['Cinzel'] font-bold text-[#D6A84B] tracking-widest">
            {heroDef.name.toUpperCase()} · {currentKingdom.name.toUpperCase()}
          </div>
        )}

        {/* Sanctuary Framing Switcher & Zen Toggle */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#141420]/90 backdrop-blur-md border border-[#8B5CF6]/30 shadow-xl">
          {!hudHidden && (
            <>
              <button
                type="button"
                onClick={() => setFocusMode('courtyard')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  focusMode === 'courtyard'
                    ? 'bg-[#8B5CF6] text-white border border-[#D6A84B]/45 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                    : 'text-[#A1A1B8] hover:text-white hover:bg-[#0E0E17] border border-transparent'
                }`}
              >
                Citadel Vista
              </button>
              <button
                type="button"
                onClick={() => setFocusMode('hero')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  focusMode === 'hero'
                    ? 'bg-[#8B5CF6] text-white border border-[#D6A84B]/45 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                    : 'text-[#A1A1B8] hover:text-white hover:bg-[#0E0E17] border border-transparent'
                }`}
              >
                Hero Spotlight
              </button>

              {!heroLocked && (
                <>
                  <span className="w-px h-4 bg-[#8B5CF6]/30 mx-0.5" />
                  <button
                    type="button"
                    onClick={onOpenHeroSelect}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-['Cinzel'] bg-[#0E0E17] hover:bg-[#8B5CF6]/25 text-[#D6A84B] border border-[#D6A84B]/45 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    Choose Hero
                  </button>
                </>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setHudHidden(h => !h)}
            title={hudHidden ? 'Show HUD controls' : 'Hide HUD to admire citadel artwork'}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#A1A1B8] hover:text-[#D6A84B] hover:bg-[#0E0E17] flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
          >
            {hudHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{hudHidden ? 'Show HUD' : 'Zen'}</span>
          </button>
        </div>
      </div>

      {/* BOTTOM COMMAND BAR: XP, Currencies & Navigation */}
      {!hudHidden && (
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-4 sm:left-5 sm:right-5 z-20">
          <div className="pointer-events-auto rounded-xl bg-[#141420]/92 backdrop-blur-md border border-[#8B5CF6]/30 px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Hero XP & Active Buffs */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-['Cinzel'] font-bold text-[#FBBF24] uppercase tracking-wider text-[11px]">
                    Ascension Progress
                  </span>
                  <span className="text-[#A1A1B8]/40">·</span>
                  <span className="font-mono font-semibold text-[#F8FAFC] tabular-nums">
                    {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP
                  </span>
                  <span className="text-[11px] font-mono text-[#FBBF24] tabular-nums">
                    ({xpPercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-[#FBBF24]">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Flame className="w-3.5 h-3.5 text-[#FBBF24]" />
                    {stats.currentStreak}d Streak
                  </span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-[#090910] border border-[#FBBF24]/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FBBF24] to-[#D6A84B] transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeBuffs.length > 0 ? (
                  activeBuffs.slice(0, 3).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onNavigate('store')}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0E0E17] border border-[#8B5CF6]/35 text-[#F8FAFC] hover:border-[#D6A84B]/60 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#D6A84B]" />
                      {b.name} (+{b.effectValue}%)
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-[#A1A1B8] flex items-center gap-1.5">
                    {heroLocked && <Lock className="w-3 h-3 text-[#D6A84B]" />}
                    {heroDef.name} bound · Complete habits &amp; story chapters to restore the Keep.
                  </span>
                )}
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-[#8B5CF6]/25 shrink-0" />

            {/* Currencies & Sanctuary Actions */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#D6A84B] uppercase tracking-widest font-semibold flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Gold
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-[#FBBF24] tabular-nums">
                    {stats.gold.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('store')}
                  className="px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#9D74F7] hover:to-[#7C3AED] text-white shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Treasury
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('storyline')}
                  className="hidden sm:flex px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-[#0E0E17] hover:bg-[#1B1B2B] text-white border border-[#8B5CF6]/40 hover:border-[#D6A84B]/50 transition-all items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#D6A84B]" />
                  Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
