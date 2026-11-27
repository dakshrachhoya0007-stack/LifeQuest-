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
      className="relative w-full h-[500px] sm:h-[550px] lg:h-[600px] rounded-2xl overflow-hidden border border-[#1677FF]/40 bg-[#061225] shadow-2xl select-none"
    >
      {/* Citadel Backdrop & Atmospheric Particles */}
      <div className="absolute inset-0 bg-[#061225]">
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
                ? `radial-gradient(circle at 50% 42%, ${heroDef.accentHex}28 0%, rgba(10,25,48, 0.88) 62%, #061225 100%)`
                : 'radial-gradient(circle at 50% 46%, rgba(16,36,64, 0.35) 0%, rgba(4,12,28, 0.84) 68%, #061225 100%)',
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
          } rounded-2xl overflow-hidden border border-[#FFD978]/50 bg-[#0A1930] shadow-2xl`}
          style={{
            boxShadow: `0 24px 60px -12px rgba(4,12,28, 0.92), 0 0 36px -10px ${heroDef.accentHex}55`,
          }}
        >
          <img
            src={heroArtSrc}
            alt={`${heroDef.name} — ${heroDef.archetype}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#061225] via-[#061225]/65 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span
                className="text-[9px] font-mono uppercase tracking-widest font-bold block truncate"
                style={{ color: heroDef.accentHex }}
              >
                {heroDef.archetype}
              </span>
              <span className="font-['Cinzel'] font-black text-xs sm:text-sm text-[#F2F7FF] block truncate">
                {heroDef.name}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#FFD978] shrink-0">
              {stats.aetherRank}
            </span>
          </div>
        </div>
      </div>

      {/* TOP HUD: Champion Identity & Sanctuary View Controls */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 sm:top-4 sm:left-5 sm:right-5 z-20 flex flex-wrap items-start justify-between gap-3">
        {!hudHidden ? (
          <div className="pointer-events-auto flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/40 shadow-xl max-w-full sm:max-w-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-bold font-['Cinzel'] text-[#F2F7FF] tracking-wide truncate">
                  {user?.characterName || user?.username || heroDef.name}
                </h1>
                <span className="text-[11px] font-mono font-bold text-[#FFD978] bg-[#0A1930] border border-[#E7B94F]/45 px-2 py-0.5 rounded tabular-nums">
                  Lv.{stats.level}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#00D9FF] font-medium truncate mt-0.5">
                {heroDef.name} · {heroDef.mappedClass} Class · {stats.aetherRank}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#94A8C7] truncate mt-0.5">
                Kingdom:{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('storyline')}
                  className="text-[#FFD978] hover:text-white font-semibold transition-colors"
                >
                  {currentKingdom.name}
                </button>
                <span className="hidden sm:inline text-[#94A8C7]/75">
                  {' '}
                  · Citadel Restored {restorationPercent}% · {unlockedKingdomsCount} Realms Open
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-[#102440]/90 backdrop-blur-md border border-[#FFD978]/35 text-xs font-['Cinzel'] font-bold text-[#FFD978] tracking-widest">
            {heroDef.name.toUpperCase()} · {currentKingdom.name.toUpperCase()}
          </div>
        )}

        {/* Sanctuary Framing Switcher & Zen Toggle */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/40 shadow-xl">
          {!hudHidden && (
            <>
              <button
                type="button"
                onClick={() => setFocusMode('courtyard')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  focusMode === 'courtyard'
                    ? 'bg-[#1677FF] text-white border border-[#FFD978]/45 shadow-[0_0_12px_rgba(0,217,255,0.4)]'
                    : 'text-[#94A8C7] hover:text-white hover:bg-[#0A1930] border border-transparent'
                }`}
              >
                Citadel Vista
              </button>
              <button
                type="button"
                onClick={() => setFocusMode('hero')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  focusMode === 'hero'
                    ? 'bg-[#1677FF] text-white border border-[#FFD978]/45 shadow-[0_0_12px_rgba(0,217,255,0.4)]'
                    : 'text-[#94A8C7] hover:text-white hover:bg-[#0A1930] border border-transparent'
                }`}
              >
                Hero Spotlight
              </button>

              {!heroLocked && (
                <>
                  <span className="w-px h-4 bg-[#1677FF]/35 mx-0.5" />
                  <button
                    type="button"
                    onClick={onOpenHeroSelect}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-['Cinzel'] bg-[#0A1930] hover:bg-[#1677FF]/30 text-[#FFD978] border border-[#FFD978]/45 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
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
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#94A8C7] hover:text-[#FFD978] hover:bg-[#0A1930] flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
          >
            {hudHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{hudHidden ? 'Show HUD' : 'Zen'}</span>
          </button>
        </div>
      </div>

      {/* BOTTOM COMMAND BAR: XP, Currencies & Navigation */}
      {!hudHidden && (
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-4 sm:left-5 sm:right-5 z-20">
          <div className="pointer-events-auto rounded-xl bg-[#102440]/92 backdrop-blur-md border border-[#1677FF]/40 px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Hero XP & Active Buffs */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-['Cinzel'] font-bold text-[#FFD978] uppercase tracking-wider text-[11px]">
                    Ascension Progress
                  </span>
                  <span className="text-[#94A8C7]/40">·</span>
                  <span className="font-mono font-semibold text-[#F2F7FF] tabular-nums">
                    {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP
                  </span>
                  <span className="text-[11px] font-mono text-[#00D9FF] tabular-nums">
                    ({xpPercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-[#FFAA45]">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Flame className="w-3.5 h-3.5 text-[#FFAA45]" />
                    {stats.currentStreak}d Streak
                  </span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-[#061225] border border-[#1677FF]/35 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#FFD978] transition-all duration-300"
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
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0A1930] border border-[#FFAA45]/40 text-[#F2F7FF] hover:border-[#FFD978]/70 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#FFAA45]" />
                      {b.name} (+{b.effectValue}%)
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-[#94A8C7] flex items-center gap-1.5">
                    {heroLocked && <Lock className="w-3 h-3 text-[#FFD978]" />}
                    {heroDef.name} bound · Complete habits &amp; story chapters to restore the Keep.
                  </span>
                )}
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-[#1677FF]/30 shrink-0" />

            {/* Currencies & Sanctuary Actions */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#E7B94F] uppercase tracking-widest font-semibold flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Gold
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-[#FFD978] tabular-nums">
                    {stats.gold.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('store')}
                  className="px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 border border-[#FFD978]/45 text-white shadow-[0_0_18px_rgba(0,217,255,0.38)] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Treasury
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('storyline')}
                  className="hidden sm:flex px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-[#0A1930] hover:bg-[#102440] text-[#F2F7FF] border border-[#1677FF]/40 hover:border-[#FFD978]/50 transition-all items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#FFD978]" />
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
