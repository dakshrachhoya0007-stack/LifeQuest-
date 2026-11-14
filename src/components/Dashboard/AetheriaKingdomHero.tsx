import React, { useMemo, useState } from 'react';
import {
  Coins,
  Compass,
  Eye,
  EyeOff,
  Flame,
  Hammer,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { Buff, Kingdom, PlayableHeroId, PlayerStats, UserAccount } from '../../types/game';
import { getHeroById } from '../../data/heroesData';
import { probeWebGLCapabilities } from './world3d/AetheriaRelicCanvas';
import {
  AetheriaCourtyardCanvas,
  CourtyardCameraPreset,
} from '../world3d/AetheriaCourtyardCanvas';

interface AetheriaKingdomHeroProps {
  user: UserAccount | null;
  stats: PlayerStats;
  selectedHeroId: PlayableHeroId;
  restorationRatio: number;
  currentKingdom: Kingdom;
  unlockedKingdomsCount: number;
  activeBuffs: Buff[];
  onNavigate: (tab: string) => void;
  onOpenHeroSelect: () => void;
}

const PRESET_LABELS: Record<CourtyardCameraPreset, string> = {
  courtyard: 'Courtyard',
  hero: 'Hero Close-Up',
  citadel: 'Citadel Keep',
};

export const AetheriaKingdomHero: React.FC<AetheriaKingdomHeroProps> = ({
  user,
  stats,
  selectedHeroId,
  restorationRatio,
  currentKingdom,
  unlockedKingdomsCount,
  activeBuffs,
  onNavigate,
  onOpenHeroSelect,
}) => {
  const gpuProbe = useMemo(() => probeWebGLCapabilities(), []);
  const [webglFailed, setWebglFailed] = useState(!gpuProbe.webglAvailable);
  const [cameraPreset, setCameraPreset] = useState<CourtyardCameraPreset>('courtyard');
  const [hudHidden, setHudHidden] = useState(false);

  const heroDef = useMemo(() => getHeroById(selectedHeroId), [selectedHeroId]);
  const xpPercent = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );
  const restorationPercent = Math.round(Math.max(0, Math.min(1, restorationRatio)) * 100);

  return (
    <section
      data-tutorial-id="castle-courtyard"
      aria-label="World of Aetheria 3D Castle Courtyard and Selected Hero"
      className="relative w-full h-[480px] sm:h-[540px] lg:h-[590px] rounded-2xl overflow-hidden border border-[#C5A15A]/28 bg-[#100D19] shadow-2xl select-none"
    >
      {/* Unified Interactive 3D Castle Courtyard & Selected Hero Scene */}
      <div className="absolute inset-0">
        {!webglFailed ? (
          <AetheriaCourtyardCanvas
            heroId={selectedHeroId}
            restorationRatio={restorationRatio}
            cameraPreset={cameraPreset}
            isSoftwareGl={gpuProbe.isSoftwareGl}
            onWebglError={() => setWebglFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#100D19]">
            <p className="font-['Cinzel'] text-lg font-bold text-[#C5A15A]">
              {heroDef.name} · Citadel Courtyard
            </p>
            <p className="text-xs text-[#D9D2C5]/75 max-w-md mt-1">
              WebGL hardware acceleration is unavailable in this browser context. All RPG quests, attributes, and campaign progression remain active.
            </p>
          </div>
        )}
      </div>

      {/* Subtle Radial Edge Vignette (Pointer-Transparent) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 46%, transparent 56%, rgba(16, 13, 25, 0.72) 100%)',
        }}
      />

      {/* TOP HUD: Active 3D Hero Identity & Camera / Switch Hero Controls */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 sm:top-4 sm:left-5 sm:right-5 z-10 flex flex-wrap items-start justify-between gap-3">
        {!hudHidden ? (
          <div className="pointer-events-auto flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#100D19]/90 border border-[#C5A15A]/30 shadow-xl max-w-full sm:max-w-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-bold font-['Cinzel'] text-[#D9D2C5] tracking-wide truncate">
                  {user?.characterName || user?.username || heroDef.name}
                </h1>
                <span className="text-[11px] font-mono font-bold text-[#C5A15A] bg-[#251638] border border-[#C5A15A]/45 px-2 py-0.5 rounded tabular-nums">
                  Lv.{stats.level}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#C5A15A] font-medium truncate mt-0.5">
                {heroDef.name} · {heroDef.archetype} · {stats.aetherRank}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#D9D2C5]/70 truncate mt-0.5">
                Kingdom:{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('storyline')}
                  className="text-[#C5A15A] hover:text-[#e3c07c] font-semibold transition-colors"
                >
                  {currentKingdom.name}
                </button>
                <span className="hidden sm:inline text-[#D9D2C5]/55">
                  {' '}
                  · Citadel Restored {restorationPercent}% · {unlockedKingdomsCount} Realms Open
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-[#100D19]/88 border border-[#C5A15A]/30 text-xs font-['Cinzel'] font-bold text-[#C5A15A] tracking-widest">
            {heroDef.name.toUpperCase()} · {currentKingdom.name.toUpperCase()}
          </div>
        )}

        {/* Camera Preset Switcher, Hero Selector CTA & Zen Toggle */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#100D19]/90 border border-[#C5A15A]/25 shadow-xl">
          {!hudHidden && (
            <>
              {(Object.keys(PRESET_LABELS) as CourtyardCameraPreset[]).map(presetKey => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => setCameraPreset(presetKey)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === presetKey
                      ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                      : 'text-[#D9D2C5]/70 hover:text-[#D9D2C5] hover:bg-[#251638]/50 border border-transparent'
                  }`}
                >
                  {PRESET_LABELS[presetKey]}
                </button>
              ))}

              <span className="w-px h-4 bg-[#C5A15A]/20 mx-0.5" />

              <button
                type="button"
                onClick={onOpenHeroSelect}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-['Cinzel'] bg-[#C5A15A]/15 hover:bg-[#C5A15A]/30 text-[#C5A15A] border border-[#C5A15A]/45 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
              >
                <Users className="w-3 h-3" />
                Switch 3D Hero
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setHudHidden(h => !h)}
            title={hudHidden ? 'Show HUD controls' : 'Hide HUD to view 3D courtyard'}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#D9D2C5]/80 hover:text-[#C5A15A] hover:bg-[#251638]/50 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
          >
            {hudHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{hudHidden ? 'Show HUD' : 'Zen'}</span>
          </button>
        </div>
      </div>

      {/* BOTTOM COMMAND BAR: XP, Currencies & Navigation */}
      {!hudHidden && (
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-4 sm:left-5 sm:right-5 z-10">
          <div className="pointer-events-auto rounded-xl bg-[#100D19]/92 border border-[#C5A15A]/25 px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Hero XP & Active Buffs */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-['Cinzel'] font-bold text-[#C5A15A] uppercase tracking-wider text-[11px]">
                    Ascension Progress
                  </span>
                  <span className="text-[#D9D2C5]/30">·</span>
                  <span className="font-mono font-semibold text-[#D9D2C5] tabular-nums">
                    {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP
                  </span>
                  <span className="text-[11px] font-mono text-[#C5A15A] tabular-nums">
                    ({xpPercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-[#C5A15A]">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Flame className="w-3.5 h-3.5 text-[#C5A15A]" />
                    {stats.currentStreak}d Streak
                  </span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-[#251638] border border-[#7046A5]/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7046A5] to-[#C5A15A] transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeBuffs.length > 0 ? (
                  activeBuffs.slice(0, 3).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onNavigate('buffs')}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#251638]/85 border border-[#7046A5]/45 text-[#D9D2C5] hover:border-[#C5A15A]/60 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#C5A15A]" />
                      {b.name} (+{b.effectValue}%)
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-[#D9D2C5]/65">
                    Drag inside the 3D courtyard to inspect your champion · Complete habits &amp; chapters to restore the Keep.
                  </span>
                )}
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-[#C5A15A]/20 shrink-0" />

            {/* Currencies & Sanctuary Actions */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#C5A15A] uppercase tracking-widest font-semibold flex items-center gap-1">
                    <Hammer className="w-3 h-3" /> Forge XP
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-[#D9D2C5] tabular-nums">
                    {stats.forgeXP.toLocaleString()}
                  </span>
                </div>

                <div className="w-px h-8 bg-[#C5A15A]/20" />

                <div className="flex flex-col">
                  <span className="text-[10px] text-[#C5A15A] uppercase tracking-widest font-semibold flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Gold
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-[#C5A15A] tabular-nums">
                    {stats.gold.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('armory')}
                  className="px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-[#251638] hover:bg-[#7046A5]/45 text-[#D9D2C5] border border-[#7046A5]/50 transition-colors whitespace-nowrap shrink-0"
                >
                  Armory
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('store')}
                  className="px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-[#C5A15A] hover:bg-[#d6b36d] text-[#100D19] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Treasury
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('storyline')}
                  className="hidden sm:flex px-3.5 py-2 text-xs font-bold font-['Cinzel'] rounded-lg bg-[#100D19] hover:bg-[#251638] text-[#D9D2C5] border border-[#C5A15A]/35 transition-colors items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#C5A15A]" />
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
