import React, { useMemo, useState } from 'react';
import {
  Flame,
  Heart,
  Shield,
  Sparkles,
  Swords,
  User,
  Users,
  Wind,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import {
  Buff,
  EquippedGear,
  PlayableHeroId,
  PlayerStats,
  RpgAttributeKey,
  RpgAttributes,
  UserAccount,
  Weapon,
} from '../../types/game';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { aetheriaCitadelKingdomImg, getHeroArtwork } from '../../assets/images';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import { AtmosphereParticlesCanvas } from './world3d/AtmosphereParticlesCanvas';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { useGame } from '../../context/GameContext';

interface HeroCommandStageProps {
  user: UserAccount | null;
  stats: PlayerStats;
  selectedHeroId: PlayableHeroId;
  heroLocked: boolean;
  rpgAttributes: RpgAttributes;
  weapons: Weapon[];
  equippedWeapon: Weapon;
  equippedGear: EquippedGear;
  activeBuffs: Buff[];
  onNavigate: (tab: string) => void;
  onOpenHeroSelect: () => void;
}

const ATTR_ICON_MAP: Record<RpgAttributeKey, React.ComponentType<{ className?: string }>> = {
  strength: Swords,
  discipline: Shield,
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
  weapons,
  equippedWeapon,
  equippedGear,
  activeBuffs,
  onNavigate,
  onOpenHeroSelect,
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

  const offHand = equippedGear.offHandId
    ? weapons.find(w => w.id === equippedGear.offHandId && w.id !== equippedWeapon.id)
    : undefined;
  const armour = equippedGear.armourId
    ? weapons.find(w => w.id === equippedGear.armourId)
    : undefined;
  const helmet = equippedGear.helmetId
    ? weapons.find(w => w.id === equippedGear.helmetId)
    : undefined;
  const accessory = equippedGear.accessoryId
    ? weapons.find(w => w.id === equippedGear.accessoryId)
    : undefined;

  const equippedList = [equippedWeapon, offHand, armour, helmet, accessory].filter(
    (item): item is Weapon => Boolean(item)
  );
  const rawAtk = equippedList.reduce((sum, item) => sum + item.baseAttack, 0);
  const rawDef = equippedList.reduce((sum, item) => sum + item.baseDefense, 0);
  const atkBuff = activeBuffs.find(b => b.effectType === 'attack');
  const defBuff = activeBuffs.find(b => b.effectType === 'defense');
  const critBuff = activeBuffs.find(b => b.effectType === 'crit');
  const totalAttack = Math.round(rawAtk * (1 + (atkBuff ? atkBuff.effectValue / 100 : 0)));
  const totalDefense = Math.round(rawDef * (1 + (defBuff ? defBuff.effectValue / 100 : 0)));
  const critPercent = 10 + (equippedWeapon.critChance ?? 5) + (critBuff ? critBuff.effectValue : 0);

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
      className="relative rounded-2xl overflow-hidden border border-[#C5A15A]/28 bg-[#08060E] shadow-2xl"
    >
      {/* Layered Atmospheric Citadel Backdrop */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img
          src={aetheriaCitadelKingdomImg}
          alt="Aetheria Sanctuary Vista"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-22 scale-105 filter blur-[1px]"
        />
        {/* Obsidian & Royal Violet Vignette Scrim */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 72% at 50% 48%, ${heroDef.accentHex}1F 0%, rgba(16, 12, 26, 0.78) 54%, #08060E 96%)`,
          }}
        />
        {/* Warm Directional Key Light (Upper Right) & Royal Purple Rim Light (Lower Left) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 68% 18%, rgba(197, 161, 90, 0.14) 0%, transparent 45%), radial-gradient(circle at 26% 78%, rgba(112, 70, 165, 0.16) 0%, transparent 48%)',
          }}
        />
        <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={Boolean(reducedMotion)} />
      </div>

      {/* TOP BAR: Minimal Identity, Equipped Legendary Title, Level Diamond & XP */}
      <div className="relative z-20 px-5 sm:px-7 py-4 border-b border-[#C5A15A]/20 bg-[#0A0712]/78 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Golden Tree Crest + Player Identity + Legendary Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* LIFEQUEST Golden Tree Emblem SVG */}
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#231838] via-[#140E22] to-[#0B0812] border border-[#C5A15A]/45 flex items-center justify-center shrink-0 shadow-md"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C5A15A]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 21V9" strokeLinecap="round" />
              <path d="M12 13c-3 0-5-2.2-5-5 0-2.5 2-4.5 5-5.5 3 1 5 3 5 5.5 0 2.8-2 5-5 5Z" />
              <path d="M9 17c-1.8 0-3-1.1-3-2.6M15 17c1.8 0 3-1.1 3-2.6" strokeLinecap="round" />
              <path d="M8.5 21h7" strokeLinecap="round" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#F2ECE1] tracking-wide truncate">
                {user?.characterName || user?.username || heroDef.name}
              </h1>
              {equippedLegend && (
                <LegendTitleBadge
                  title={equippedLegend.titleTag}
                  style={equippedLegend.titleStyle}
                  emblemIcon={equippedLegend.emblemIcon}
                  size="sm"
                />
              )}
            </div>
            <p className="text-xs text-[#C5A15A]/90 mt-0.5 truncate">
              <span>{heroDef.name}</span>
              <span className="text-[#D9D2C5]/35 mx-1.5" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/80">{heroDef.mappedClass} Class</span>
              <span className="text-[#D9D2C5]/35 mx-1.5" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75">{stats.aetherRank} Rank</span>
            </p>
          </div>
        </div>

        {/* Right: God of War Inspired Level Diamond + XP Progress + Profile Action */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-[220px] sm:min-w-[260px]">
            {/* Diamond Level Crest */}
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rotate-45 rounded-xs bg-gradient-to-br from-[#2B1D42] to-[#120D1E] border border-[#C5A15A]/75 shadow-[0_0_16px_rgba(197,161,90,0.22)]" />
              <span className="relative z-10 font-['Cinzel'] font-black text-xs text-[#F5EFE6] tabular-nums">
                {stats.level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1 tabular-nums">
                <span className="text-[#C5A15A] font-semibold uppercase tracking-wider text-[10px]">
                  Level {stats.level} XP
                </span>
                <span className="text-[#D9D2C5]/85">
                  {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} ({xpPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1C142B] border border-[#C5A15A]/25 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7046A5] via-[#9B6BD1] to-[#C5A15A] transition-all duration-500"
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
                className="px-3.5 py-2 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0D0A14] text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                Select Hero
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('character')}
              className="px-3.5 py-2 rounded-lg bg-[#161124]/90 hover:bg-[#251638] border border-[#C5A15A]/30 text-xs font-medium text-[#D9D2C5] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5 text-[#C5A15A]" />
              Character Sheet
            </button>
          </div>
        </div>
      </div>

      {/* MAIN HERO COMMAND STAGE: Left Dossier · Center Hero Centerpiece · Right Attributes */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-stretch gap-6 p-5 sm:p-7">
        {/* LEFT COLUMN (4 cols): Hero Title, Rank, Loadout & Cosmetic Traits */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5 order-2 lg:order-1">
          <div className="rounded-xl bg-[#0D0917]/82 backdrop-blur-md border border-[#C5A15A]/22 p-5 space-y-4">
            {/* Archetype & Binding */}
            <div className="border-b border-[#C5A15A]/15 pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-['Cinzel'] font-bold text-xs tracking-wider text-[#C5A15A] uppercase">
                  {heroDef.archetype}
                </span>
                {heroLocked && (
                  <span className="text-[11px] text-[#D9D2C5]/60 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#C5A15A]/80" />
                    Bound
                  </span>
                )}
              </div>
              <p className="font-['Cinzel'] font-bold text-base text-[#F2ECE1] mt-1">
                {heroDef.title}
              </p>
              <p className="text-xs text-[#D9D2C5]/70 mt-1.5 leading-relaxed line-clamp-3">
                {heroDef.roleSummary}
              </p>
            </div>

            {/* Aether Rank Progression */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-[#D9D2C5]/80 font-medium">Aether Rank · {stats.aetherRank}</span>
                <span className="font-mono text-[#C5A15A] text-[11px]">
                  {stats.aetherPoints.toLocaleString()} / {stats.aetherPointsNextRank.toLocaleString()} AP
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#1C142B] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#B68A4C] to-[#C5A15A] transition-all duration-500"
                  style={{ width: `${rankPercent}%` }}
                />
              </div>
            </div>

            {/* Equipped Main Armament Spotlight */}
            <div className="pt-2 border-t border-[#C5A15A]/15 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-['Cinzel'] font-bold text-[#C5A15A] tracking-wider uppercase text-[11px]">
                  Equipped Armament
                </span>
                <span className="text-[11px] text-[#D9D2C5]/65 font-mono tabular-nums">
                  {equippedWeapon.rarity} · Lv.{equippedWeapon.level}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-[#140E22] border border-[#C5A15A]/30 p-1.5 shrink-0 flex items-center justify-center">
                  <EquipmentIllustration
                    itemId={equippedWeapon.id}
                    rarity={equippedWeapon.rarity}
                    level={equippedWeapon.level}
                    evolutionStage={equippedWeapon.evolutionStage}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#F2ECE1] truncate">
                    {equippedWeapon.name}
                  </p>
                  <p className="text-[11px] text-[#D9D2C5]/65 font-mono tabular-nums mt-0.5">
                    ATK +{equippedWeapon.baseAttack} · DEF +{equippedWeapon.baseDefense} · {equippedWeapon.evolutionStage}
                  </p>
                </div>
              </div>

              {/* Concise Secondary Loadout Lines */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-white/8 text-[11px]">
                {[
                  { label: 'Off-Hand', item: offHand },
                  { label: 'Armour', item: armour },
                  { label: 'Helm', item: helmet },
                  { label: 'Relic', item: accessory },
                ].map(slot => (
                  <div key={slot.label} className="min-w-0">
                    <span className="text-[#D9D2C5]/45 mr-1">{slot.label}:</span>
                    <span className={slot.item ? 'text-[#D9D2C5]/90 font-medium truncate' : 'text-[#D9D2C5]/35'}>
                      {slot.item ? slot.item.name : 'Unassigned'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Buffs & Hero Signature Traits */}
            <div className="pt-2 border-t border-[#C5A15A]/15 space-y-1.5">
              <span className="font-['Cinzel'] font-bold text-[10px] tracking-wider uppercase text-[#D9D2C5]/60 block">
                {activeBuffs.length > 0 ? 'Active Aura & Blessings' : 'Champion Traits'}
              </span>
              {activeBuffs.length > 0 ? (
                <div className="space-y-1">
                  {activeBuffs.slice(0, 2).map(buff => (
                    <p key={buff.id} className="text-xs text-[#D9D2C5]/85 truncate">
                      <span className="text-[#C5A15A] font-semibold">{buff.name}</span>
                      <span className="text-[#D9D2C5]/45 mx-1.5" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] tabular-nums">+{buff.effectValue}% {buff.effectType}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {heroDef.abilities.slice(0, 2).map(ab => (
                    <p key={ab.name} className="text-xs text-[#D9D2C5]/80 truncate">
                      <span className="text-[#C5A15A] font-medium">{ab.name}</span>
                      <span className="text-[#D9D2C5]/45 mx-1.5" aria-hidden="true">·</span>
                      <span className="text-[#D9D2C5]/60">{ab.description}</span>
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

          {/* Carved Obsidian & Gold Rotating Rune Pedestal Beneath Hero's Feet */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-64 opacity-45"
            style={{ perspective: '600px' }}
          >
            <div className="w-full h-full rounded-full border border-[#C5A15A]/55 animate-runic-ring flex items-center justify-center">
              <div className="w-[82%] h-[82%] rounded-full border border-dashed border-[#7046A5]/65" />
            </div>
          </div>

          {/* Full-Body Seamlessly Masked Hero Illustration */}
          <div className="relative z-10 w-full max-w-[330px] sm:max-w-[370px] h-[360px] sm:h-[430px] lg:h-[470px] flex items-end justify-center animate-hero-breathe">
            <img
              src={heroArtSrc}
              alt={`${heroDef.name} — ${heroDef.archetype}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-bottom drop-shadow-[0_24px_38px_rgba(0,0,0,0.92)]"
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
            <p className="font-['Cinzel'] font-black text-sm sm:text-base tracking-[0.14em] uppercase text-[#F2ECE1]">
              {heroDef.name}
            </p>
            <p className="text-[11px] text-[#C5A15A]/85 tracking-wide">
              {heroDef.introFlourishLabel}
              <span className="text-[#D9D2C5]/35 mx-1.5" aria-hidden="true">·</span>
              {stats.currentStreak} Day Streak
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols): Six Character Attributes Panel (God of War Inspired) */}
        <div
          data-tutorial-id="character-attributes"
          className="lg:col-span-4 flex flex-col justify-between order-3"
        >
          <div className="rounded-xl bg-[#0D0917]/84 backdrop-blur-md border border-[#C5A15A]/22 p-5 h-full flex flex-col justify-between gap-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-[#C5A15A]/15 pb-3">
                <div>
                  <h2 className="font-['Cinzel'] font-bold text-sm tracking-wider uppercase text-[#F2ECE1]">
                    Character Attributes
                  </h2>
                  <p className="text-[11px] text-[#D9D2C5]/55 mt-0.5">
                    Game stats scaled from tracked habits &amp; training
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttributeSources(s => !s)}
                  className="text-[11px] text-[#C5A15A] hover:text-[#e3c07c] flex items-center gap-1 font-medium whitespace-nowrap shrink-0 transition-colors"
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
                            className="w-6 h-6 rounded bg-[#171126] border border-[#C5A15A]/25 flex items-center justify-center shrink-0"
                            style={{ color: attr.accentHex }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <span className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F2ECE1]">
                              {attr.label}
                            </span>
                            <span className="text-[10px] text-[#D9D2C5]/50 ml-1.5">
                              {isFocus ? '· Hero Focus' : `· ${ATTRIBUTE_SUBTITLE_MAP[attr.key]}`}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-base text-[#F2ECE1] tabular-nums shrink-0">
                          {val}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-xs bg-[#171126] border border-white/8 overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${attr.accentHex}99 0%, ${attr.accentHex} 100%)`,
                          }}
                        />
                      </div>

                      {showAttributeSources && (
                        <p className="text-[10px] text-[#D9D2C5]/60 leading-snug pl-8">
                          {attr.realLifeSource}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Combat Readiness Footer Strip */}
            <div className="pt-3 border-t border-[#C5A15A]/15 grid grid-cols-3 divide-x divide-[#C5A15A]/15 text-center font-mono">
              <div className="px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#D9D2C5]/50 block">
                  Attack
                </span>
                <span className="text-sm font-bold text-[#F2ECE1] tabular-nums">
                  +{totalAttack}
                </span>
              </div>
              <div className="px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#D9D2C5]/50 block">
                  Defense
                </span>
                <span className="text-sm font-bold text-[#F2ECE1] tabular-nums">
                  +{totalDefense}
                </span>
              </div>
              <div className="px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#D9D2C5]/50 block">
                  Crit Rate
                </span>
                <span className="text-sm font-bold text-[#C5A15A] tabular-nums">
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
