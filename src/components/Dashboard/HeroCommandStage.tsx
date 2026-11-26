import React, { useMemo, useState } from 'react';
import {
  Dumbbell,
  Flame,
  Footprints,
  Hand,
  Heart,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
  Wind,
  ChevronDown,
  ChevronUp,
  Lock,
  Bell,
} from 'lucide-react';
import {
  Buff,
  PlayableHeroId,
  PlayerStats,
  RpgAttributeKey,
  RpgAttributes,
  UserAccount,
} from '../../types/game';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { aetheriaCitadelKingdomImg, getHeroArtwork } from '../../assets/images';
import { AtmosphereParticlesCanvas } from './AtmosphereParticlesCanvas';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { useGame } from '../../context/GameContext';

interface HeroCommandStageProps {
  user: UserAccount | null;
  stats: PlayerStats;
  selectedHeroId: PlayableHeroId;
  heroLocked: boolean;
  rpgAttributes: RpgAttributes;
  activeBuffs: Buff[];
  onNavigate: (tab: string) => void;
  onOpenHeroSelect: () => void;
  equippedIdentityTitle?: { name: string; rarity: string } | null;
  equippedSecondaryTitle?: { name: string; rarity: string } | null;
  prestigeTier?: number;
  unreadNotificationsCount?: number;
}

const ATTR_ICON_MAP: Record<RpgAttributeKey, React.ComponentType<{ className?: string }>> = {
  strength: Dumbbell,
  discipline: Target,
  intelligence: Sparkles,
  vitality: Heart,
  agility: Wind,
  resilience: Flame,
};

const ATTRIBUTE_SUBTITLE_MAP: Record<RpgAttributeKey, string> = {
  strength: 'Physical Force',
  discipline: 'Willpower',
  intelligence: 'Tactical Mind',
  vitality: 'Recovery & Stamina',
  agility: 'Speed & Mobility',
  resilience: 'Endurance & Defense',
};

export const HeroCommandStage: React.FC<HeroCommandStageProps> = ({
  user,
  stats,
  selectedHeroId,
  heroLocked,
  rpgAttributes,
  activeBuffs,
  onNavigate,
  onOpenHeroSelect,
  equippedIdentityTitle,
  equippedSecondaryTitle,
  prestigeTier = 0,
  unreadNotificationsCount = 0,
}) => {
  const { equippedLegendMap } = useGame();
  const [showAttributeSources, setShowAttributeSources] = useState(false);

  const heroDef = useMemo(() => getHeroById(selectedHeroId), [selectedHeroId]);
  const heroArtSrc = useMemo(
    () => getHeroArtwork(selectedHeroId, user?.characterClass),
    [selectedHeroId, user?.characterClass]
  );

  const equippedLegend = user
    ? user.legendTitle
      ? {
          titleTag: user.legendTitle,
          titleStyle: user.legendTitleStyle || ('gold' as const),
          emblemIcon: user.legendEmblem || 'Crown',
        }
      : equippedLegendMap[user.id]
    : undefined;

  const xpPercent = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );
  const rankPercent = Math.min(
    100,
    Math.round((stats.aetherPoints / Math.max(1, stats.aetherPointsNextRank)) * 100)
  );

  const rawAtk = 18 + Math.round(rpgAttributes.strength * 1.4 + rpgAttributes.agility * 0.6);
  const rawDef = 12 + Math.round(rpgAttributes.resilience * 1.2 + rpgAttributes.discipline * 0.8);
  const atkBuff = activeBuffs.find(b => b.effectType === 'attack');
  const defBuff = activeBuffs.find(b => b.effectType === 'defense');
  const critBuff = activeBuffs.find(b => b.effectType === 'crit');
  const totalAttack = Math.round(rawAtk * (1 + (atkBuff ? atkBuff.effectValue / 100 : 0)));
  const totalDefense = Math.round(rawDef * (1 + (defBuff ? defBuff.effectValue / 100 : 0)));
  const critPercent = Math.min(60, 10 + Math.round(rpgAttributes.agility * 0.25) + (critBuff ? critBuff.effectValue : 0));

  const maxStatScale = Math.max(
    40,
    ...RPG_ATTRIBUTE_META.map(m => rpgAttributes[m.key] + 8)
  );

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <section
      data-tutorial-id="castle-courtyard"
      aria-label="Character Command Center"
      className="relative rounded-2xl overflow-hidden border border-[#6638B8]/40 bg-[#100D1C] shadow-2xl"
    >
      {/* Layered Atmospheric Citadel Backdrop */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img
          src={aetheriaCitadelKingdomImg}
          alt="Aetheria Sanctuary Vista"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-22 scale-105 filter blur-[1px]"
        />
        {/* Royal Midnight Vignette Scrim */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 72% at 50% 48%, ${heroDef.accentHex}24 0%, rgba(25, 18, 43, 0.84) 54%, #100D1C 96%)`,
          }}
        />
        {/* Soft Gold Key Light & Royal Violet Rim Light */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 68% 18%, rgba(255, 217, 120, 0.14) 0%, transparent 45%), radial-gradient(circle at 26% 78%, rgba(168, 117, 255, 0.2) 0%, transparent 48%)',
          }}
        />
        <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={Boolean(reducedMotion)} />
      </div>

      {/* TOP BAR: Minimal Identity, Equipped Legendary Title, Level Diamond & XP */}
      <div className="relative z-20 px-5 sm:px-7 py-4 border-b border-[#6638B8]/30 bg-[#19122B]/85 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Crest + Player Identity + Legendary Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* LIFEQUEST Golden Emblem SVG */}
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#24143D] via-[#19122B] to-[#100D1C] border border-[#FFD978]/50 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(231,185,79,0.25)]"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FFD978]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 21V9" strokeLinecap="round" />
              <path d="M12 13c-3 0-5-2.2-5-5 0-2.5 2-4.5 5-5.5 3 1 5 3 5 5.5 0 2.8-2 5-5 5Z" />
              <path d="M9 17c-1.8 0-3-1.1-3-2.6M15 17c1.8 0 3-1.1 3-2.6" strokeLinecap="round" />
              <path d="M8.5 21h7" strokeLinecap="round" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#F7F4FF] tracking-wide truncate">
                Welcome, {user?.characterName || user?.username || heroDef.name}
              </h1>
              {prestigeTier > 0 && (
                <span className="text-[11px] font-['Cinzel'] font-bold px-2 py-0.5 rounded bg-[#24143D] text-[#FFD978] border border-[#E7B94F]/45">
                  Prestige {['', 'I', 'II', 'III', 'IV', 'V'][prestigeTier] || prestigeTier}
                </span>
              )}
              {equippedLegend && (
                <LegendTitleBadge
                  title={equippedLegend.titleTag}
                  style={equippedLegend.titleStyle}
                  emblemIcon={equippedLegend.emblemIcon}
                  size="sm"
                />
              )}
              {equippedIdentityTitle && (
                <span className="text-xs font-semibold text-[#FFD978]">
                  · {equippedIdentityTitle.name}
                </span>
              )}
              {equippedSecondaryTitle && (
                <span className="text-xs font-medium text-[#BEB4D6]">
                  · {equippedSecondaryTitle.name}
                </span>
              )}
            </div>
            <p className="text-xs text-[#A875FF] mt-0.5 truncate">
              <span>{heroDef.name}</span>
              <span className="text-[#BEB4D6]/45 mx-1.5" aria-hidden="true">·</span>
              <span className="text-[#BEB4D6]">{heroDef.mappedClass} Class</span>
              <span className="text-[#BEB4D6]/45 mx-1.5" aria-hidden="true">·</span>
              <span className="text-[#E7B94F]">{stats.aetherRank} Rank</span>
            </p>
          </div>
        </div>

        {/* Right: Level Diamond + XP Progress + Profile Action */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-[220px] sm:min-w-[260px]">
            {/* Diamond Level Crest */}
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rotate-45 rounded-xs bg-gradient-to-br from-[#6638B8] to-[#24143D] border border-[#FFD978]/75 shadow-[0_0_16px_rgba(231,185,79,0.3)]" />
              <span className="relative z-10 font-['Cinzel'] font-black text-xs text-[#FFD978] tabular-nums">
                {stats.level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1 tabular-nums">
                <span className="text-[#FFD978] font-semibold uppercase tracking-wider text-[10px]">
                  Level {stats.level} XP
                </span>
                <span className="text-[#BEB4D6]">
                  {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} ({xpPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#100D1C] border border-[#6638B8]/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6638B8] via-[#A875FF] to-[#FFD978] transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!heroLocked && (
              <button
                type="button"
                onClick={onOpenHeroSelect}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#6638B8] to-[#A875FF] hover:from-[#7A49CF] hover:to-[#E7B94F] border border-[#FFD978]/45 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_18px_rgba(168,117,255,0.38)] transition-all whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                Select Hero
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('rivals')}
              className="px-3.5 py-2 rounded-lg bg-[#24143D] hover:bg-[#311C52] border border-[#F05B70]/45 text-xs font-['Cinzel'] font-bold text-[#F7F4FF] flex items-center gap-1.5 hover:shadow-[0_0_16px_rgba(240,91,112,0.28)] transition-all whitespace-nowrap shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-[#F05B70]" />
              Rivals Arena
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="px-3 py-2 rounded-lg bg-[#19122B] hover:bg-[#24143D] border border-[#6638B8]/40 hover:border-[#FFD978]/50 text-xs font-medium text-[#F7F4FF] flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
              title="Open Notification Center"
            >
              <Bell className="w-3.5 h-3.5 text-[#FFD978]" />
              <span className="tabular-nums">
                {unreadNotificationsCount > 0 ? `Alerts (${unreadNotificationsCount})` : 'Alerts'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('character')}
              className="px-3.5 py-2 rounded-lg bg-[#19122B] hover:bg-[#24143D] border border-[#6638B8]/40 hover:border-[#A875FF]/60 text-xs font-medium text-[#F7F4FF] flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5 text-[#A875FF]" />
              Character Sheet
            </button>
          </div>
        </div>
      </div>

      {/* MAIN HERO COMMAND STAGE: Left Dossier · Center Hero Centerpiece · Right Attributes */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-stretch gap-6 p-5 sm:p-7">
        {/* LEFT COLUMN (4 cols): Hero Title, Rank, Loadout & Cosmetic Traits */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5 order-2 lg:order-1">
          <div className="rounded-xl bg-[#24143D]/85 backdrop-blur-md border border-[#6638B8]/35 p-5 space-y-4 shadow-[0_12px_32px_rgba(10,6,20,0.55)]">
            {/* Archetype & Binding */}
            <div className="border-b border-[#6638B8]/25 pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-['Cinzel'] font-bold text-xs tracking-wider text-[#FFD978] uppercase">
                  {heroDef.archetype}
                </span>
                {heroLocked && (
                  <span className="text-[11px] text-[#BEB4D6] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#FFD978]" />
                    Bound
                  </span>
                )}
              </div>
              <p className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] mt-1">
                {heroDef.title}
              </p>
              <p className="text-xs text-[#BEB4D6] mt-1.5 leading-relaxed line-clamp-3">
                {heroDef.roleSummary}
              </p>
            </div>

            {/* Aether Rank Progression */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-[#BEB4D6] font-medium">Aether Rank · {stats.aetherRank}</span>
                <span className="font-mono text-[#FFD978] text-[11px]">
                  {stats.aetherPoints.toLocaleString()} / {stats.aetherPointsNextRank.toLocaleString()} AP
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#100D1C] overflow-hidden border border-[#6638B8]/30">
                <div
                  className="h-full bg-gradient-to-r from-[#6638B8] to-[#E7B94F] transition-all duration-500"
                  style={{ width: `${rankPercent}%` }}
                />
              </div>
            </div>

            {/* Hands & Legs Bodyweight Combat Spotlight */}
            <div className="pt-2 border-t border-[#6638B8]/25 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-['Cinzel'] font-bold text-[#35D69A] tracking-wider uppercase text-[11px]">
                  Bodyweight Combat Form
                </span>
                <span className="text-[11px] text-[#BEB4D6] font-mono tabular-nums">
                  Hands &amp; Legs Only
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-[#19122B] border border-[#35D69A]/40 shrink-0 flex items-center justify-center text-[#35D69A]">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#F7F4FF] truncate">
                    {heroDef.bodyweightDisciplines.conditioningStyle}
                  </p>
                  <p className="text-[11px] text-[#BEB4D6] mt-0.5 leading-snug">
                    Bodyweight training builds strength through exercise.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-[#6638B8]/20 text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Hand className="w-3.5 h-3.5 text-[#FFD978] shrink-0" />
                  <span className="text-[#BEB4D6]/80 shrink-0">Hands:</span>
                  <span className="text-[#F7F4FF] font-medium truncate">
                    {heroDef.bodyweightDisciplines.handsFocus}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Footprints className="w-3.5 h-3.5 text-[#35D69A] shrink-0" />
                  <span className="text-[#BEB4D6]/80 shrink-0">Legs:</span>
                  <span className="text-[#F7F4FF] font-medium truncate">
                    {heroDef.bodyweightDisciplines.legsFocus}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Buffs & Hero Signature Traits */}
            <div className="pt-2 border-t border-[#6638B8]/25 space-y-1.5">
              <span className="font-['Cinzel'] font-bold text-[10px] tracking-wider uppercase text-[#BEB4D6] block">
                {activeBuffs.length > 0 ? 'Active Aura & Blessings' : 'Champion Traits'}
              </span>
              {activeBuffs.length > 0 ? (
                <div className="space-y-1">
                  {activeBuffs.slice(0, 2).map(buff => (
                    <p key={buff.id} className="text-xs text-[#BEB4D6] truncate">
                      <span className="text-[#FFAA45] font-semibold">{buff.name}</span>
                      <span className="text-[#BEB4D6]/45 mx-1.5" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] tabular-nums text-[#F7F4FF]">+{buff.effectValue}% {buff.effectType}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {heroDef.abilities.slice(0, 2).map(ab => (
                    <p key={ab.name} className="text-xs text-[#BEB4D6] truncate">
                      <span className="text-[#A875FF] font-medium">{ab.name}</span>
                      <span className="text-[#BEB4D6]/45 mx-1.5" aria-hidden="true">·</span>
                      <span className="text-[#BEB4D6]/85">{ab.description}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (4 cols): Dominating Full-Body Hero Centerpiece */}
        <div className="lg:col-span-4 relative flex flex-col items-center justify-end min-h-[380px] sm:min-h-[450px] lg:min-h-[500px] order-1 lg:order-2 select-none">
          {/* Directional Aura Halo Behind Champion */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 rounded-full blur-3xl opacity-35"
            style={{
              background: `radial-gradient(circle, ${heroDef.accentHex} 0%, ${heroDef.secondaryHex}55 55%, transparent 80%)`,
            }}
          />

          {/* Arcane Royal Violet & Gold Rotating Pedestal Beneath Hero's Feet */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-64 opacity-55"
            style={{ perspective: '600px' }}
          >
            <div className="w-full h-full rounded-full border border-[#FFD978]/55 animate-runic-ring flex items-center justify-center shadow-[0_0_24px_rgba(168,117,255,0.28)]">
              <div className="w-[82%] h-[82%] rounded-full border border-dashed border-[#A875FF]/75" />
            </div>
          </div>

          {/* Full-Body Seamlessly Masked Hero Illustration */}
          <div className="relative z-10 w-full max-w-[330px] sm:max-w-[370px] h-[360px] sm:h-[430px] lg:h-[470px] flex items-end justify-center animate-hero-breathe">
            <img
              src={heroArtSrc}
              alt={`${heroDef.name} — ${heroDef.archetype}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-bottom drop-shadow-[0_24px_38px_rgba(10,6,20,0.92)]"
              style={{
                WebkitMaskImage:
                  'radial-gradient(ellipse 76% 88% at 50% 48%, #000 56%, rgba(0,0,0,0.85) 74%, transparent 98%)',
                maskImage:
                  'radial-gradient(ellipse 76% 88% at 50% 48%, #000 56%, rgba(0,0,0,0.85) 74%, transparent 98%)',
              }}
            />
          </div>

          {/* Ground Shadow & Subtle Footing Caption */}
          <div className="relative z-20 -mt-3 text-center">
            <p className="font-['Cinzel'] font-black text-sm sm:text-base tracking-[0.14em] uppercase text-[#F7F4FF]">
              {heroDef.name}
            </p>
            <p className="text-[11px] text-[#FFD978] tracking-wide">
              {heroDef.introFlourishLabel}
              <span className="text-[#BEB4D6]/45 mx-1.5" aria-hidden="true">·</span>
              {stats.currentStreak} Day Streak
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols): Six Character Attributes Panel */}
        <div
          data-tutorial-id="character-attributes"
          className="lg:col-span-4 flex flex-col justify-between order-3"
        >
          <div className="rounded-xl bg-[#24143D]/85 backdrop-blur-md border border-[#6638B8]/35 p-5 h-full flex flex-col justify-between gap-4 shadow-[0_12px_32px_rgba(10,6,20,0.55)]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-[#6638B8]/25 pb-3">
                <div>
                  <h2 className="font-['Cinzel'] font-bold text-sm tracking-wider uppercase text-[#F7F4FF]">
                    Character Attributes
                  </h2>
                  <p className="text-[11px] text-[#BEB4D6] mt-0.5">
                    Game stats scaled from tracked habits &amp; training
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttributeSources(s => !s)}
                  className="text-[11px] text-[#FFD978] hover:text-white flex items-center gap-1 font-medium whitespace-nowrap shrink-0 transition-colors"
                >
                  {showAttributeSources ? 'Hide Sources' : 'Sources'}
                  {showAttributeSources ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Clean Vertical RPG Stat Rows */}
              <div className="space-y-3">
                {RPG_ATTRIBUTE_META.map(attr => {
                  const Icon = ATTR_ICON_MAP[attr.key];
                  const val = rpgAttributes[attr.key];
                  const pct = Math.min(100, Math.max(4, Math.round((val / maxStatScale) * 100)));
                  const isFocus = heroDef.attributeFocus.includes(attr.key);

                  return (
                    <div key={attr.key} className="space-y-1.5 group">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded bg-[#19122B] border border-[#6638B8]/40 flex items-center justify-center shrink-0"
                            style={{ color: attr.accentHex }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <span className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F7F4FF]">
                              {attr.label}
                            </span>
                            <span className="text-[10px] text-[#BEB4D6] ml-1.5">
                              {isFocus ? '· Hero Focus' : `· ${ATTRIBUTE_SUBTITLE_MAP[attr.key]}`}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-base text-[#F7F4FF] tabular-nums shrink-0">
                          {val}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-xs bg-[#100D1C] border border-[#6638B8]/25 overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${attr.accentHex}99 0%, ${attr.accentHex} 100%)`,
                          }}
                        />
                      </div>

                      {showAttributeSources && (
                        <p className="text-[10px] text-[#BEB4D6] leading-snug pl-8">
                          {attr.realLifeSource}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Combat Readiness Footer Strip */}
            <div className="pt-3 border-t border-[#6638B8]/25 grid grid-cols-3 divide-x divide-[#6638B8]/25 text-center font-mono">
              <div className="px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#BEB4D6] block">
                  Attack
                </span>
                <span className="text-sm font-bold text-[#F05B70] tabular-nums">
                  +{totalAttack}
                </span>
              </div>
              <div className="px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#BEB4D6] block">
                  Defense
                </span>
                <span className="text-sm font-bold text-[#35D69A] tabular-nums">
                  +{totalDefense}
                </span>
              </div>
              <div className="px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#BEB4D6] block">
                  Crit Rate
                </span>
                <span className="text-sm font-bold text-[#38D9F5] tabular-nums">
                  {critPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
