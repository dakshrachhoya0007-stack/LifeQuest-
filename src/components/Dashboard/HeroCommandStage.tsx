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
import { AnimatedCounter, AnimatedProgressBar } from '../Motion/RpgMotionPrimitives';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';

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
  const critPercent = Math.min(
    60,
    10 + Math.round(rpgAttributes.agility * 0.25) + (critBuff ? critBuff.effectValue : 0)
  );

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
      className="relative rounded-2xl overflow-hidden border border-[#1E3A63] bg-[#0A1930] shadow-[0_22px_50px_-16px_rgba(2,8,20,0.92)]"
    >
      {/* Layered Atmospheric Citadel Backdrop */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img
          src={aetheriaCitadelKingdomImg}
          alt="Aetheria Sanctuary Vista"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-18 scale-105 filter blur-[1px]"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 58% 72% at 50% 48%, rgba(22, 119, 255, 0.22) 0%, rgba(10, 25, 48, 0.90) 56%, #061225 98%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 65% 20%, rgba(0, 217, 255, 0.14) 0%, transparent 45%), radial-gradient(circle at 28% 78%, rgba(22, 119, 255, 0.16) 0%, transparent 48%)',
          }}
        />
        <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={Boolean(reducedMotion)} />
      </div>

      {/* TOP COMMAND HEADER: Player Identity, Level Crest & XP Progression */}
      <div className="relative z-20 px-5 sm:px-7 py-4 border-b border-[#1E3A63] bg-[#061225]/82 backdrop-blur-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl bg-[#0A1930] border border-[#00D9FF]/45 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <GoldenWorldTreeEmblem className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#F2F7FF] tracking-wide truncate">
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
              {equippedIdentityTitle && (
                <span className="text-xs font-semibold text-[#38D9F5]">
                  · {equippedIdentityTitle.name}
                </span>
              )}
              {equippedSecondaryTitle && (
                <span className="text-xs font-medium text-[#94A8C7]">
                  · {equippedSecondaryTitle.name}
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A8C7] mt-0.5 truncate">
              <span className="text-[#38D9F5] font-semibold">{heroDef.name}</span>
              <span className="text-[#647A9E] mx-1.5" aria-hidden="true">·</span>
              <span>{heroDef.mappedClass}</span>
              <span className="text-[#647A9E] mx-1.5" aria-hidden="true">·</span>
              <span className="text-[#FBBF24]">{stats.aetherRank} Rank</span>
            </p>
          </div>
        </div>

        {/* Right: Level Diamond, XP Bar & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-[220px] sm:min-w-[250px]">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rotate-45 rounded-xs bg-[#102440] border border-[#F59E0B]/70 shadow-[0_0_14px_rgba(245,158,11,0.24)]" />
              <span className="relative z-10 font-['Cinzel'] font-black text-xs text-[#FBBF24] tabular-nums">
                {stats.level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1 tabular-nums">
                <span className="text-[#FBBF24] font-semibold uppercase tracking-wider text-[10px]">
                  Level {stats.level}
                </span>
                <span className="text-[#94A8C7]">
                  {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP ({xpPercent}%)
                </span>
              </div>
              <AnimatedProgressBar
                percentage={xpPercent}
                className="w-full h-2 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                barClassName="bg-gradient-to-r from-[#1677FF] via-[#0099FF] to-[#00D9FF]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!heroLocked && (
              <button
                type="button"
                onClick={onOpenHeroSelect}
                className="lq-btn-gold px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Select Hero
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('rivals')}
              className="lq-btn-secondary px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-[#F43F5E]" />
              Rivals
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="lq-btn-secondary px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Open Notification Center"
            >
              <Bell className="w-3.5 h-3.5 text-[#38D9F5]" />
              <span className="tabular-nums">
                {unreadNotificationsCount > 0 ? `Alerts (${unreadNotificationsCount})` : 'Alerts'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('character')}
              className="lq-btn-primary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#38D9F5]" />
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* MAIN COMMAND STAGE: Integrated 3-Column Composition (Clean Surface, Minimal Boxing) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-[#1E3A63]/75">
        {/* LEFT COLUMN (4 cols): Champion Dossier, Rank & Bodyweight Stance */}
        <div className="lg:col-span-4 p-5 sm:p-7 flex flex-col justify-between gap-5 order-2 lg:order-1 bg-[#0A1930]/55">
          <div className="space-y-4">
            <div className="border-b border-[#1E3A63] pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-['Cinzel'] font-bold text-xs tracking-wider text-[#38D9F5] uppercase">
                  {heroDef.archetype}
                </span>
                {heroLocked && (
                  <span className="text-[11px] text-[#94A8C7] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#00D9FF]" />
                    Bound
                  </span>
                )}
              </div>
              <p className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] mt-1">
                {heroDef.title}
              </p>
              <p className="text-xs text-[#94A8C7] mt-1.5 leading-relaxed line-clamp-3">
                {heroDef.roleSummary}
              </p>
            </div>

            {/* Aether Rank Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-[#94A8C7] font-medium">Aether Rank · {stats.aetherRank}</span>
                <span className="font-mono text-[#FBBF24] text-[11px]">
                  {stats.aetherPoints.toLocaleString()} / {stats.aetherPointsNextRank.toLocaleString()} AP
                </span>
              </div>
              <AnimatedProgressBar
                percentage={rankPercent}
                className="w-full h-1.5 rounded-full bg-[#061225] overflow-hidden border border-[#1E3A63]"
                barClassName="bg-gradient-to-r from-[#1677FF] to-[#00D9FF]"
                shimmer={false}
              />
            </div>

            {/* Bodyweight Combat Stance */}
            <div className="pt-3 border-t border-[#1E3A63] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-['Cinzel'] font-bold text-[#10B981] tracking-wider uppercase text-[11px]">
                  Bodyweight Discipline
                </span>
                <span className="text-[11px] text-[#647A9E] font-mono">Hands &amp; Legs</span>
              </div>
              <p className="text-sm font-semibold text-[#F2F7FF] truncate">
                {heroDef.bodyweightDisciplines.conditioningStyle}
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Hand className="w-3.5 h-3.5 text-[#38D9F5] shrink-0" />
                  <span className="text-[#647A9E] shrink-0">Hands:</span>
                  <span className="text-[#F2F7FF] font-medium truncate">
                    {heroDef.bodyweightDisciplines.handsFocus}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Footprints className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span className="text-[#647A9E] shrink-0">Legs:</span>
                  <span className="text-[#F2F7FF] font-medium truncate">
                    {heroDef.bodyweightDisciplines.legsFocus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Buffs / Signature Traits */}
          <div className="pt-3 border-t border-[#1E3A63] space-y-1.5">
            <span className="font-['Cinzel'] font-bold text-[10px] tracking-wider uppercase text-[#647A9E] block">
              {activeBuffs.length > 0 ? 'Active Aura & Blessings' : 'Champion Traits'}
            </span>
            {activeBuffs.length > 0 ? (
              <div className="space-y-1">
                {activeBuffs.slice(0, 2).map(buff => (
                  <p key={buff.id} className="text-xs text-[#94A8C7] truncate">
                    <span className="text-[#38D9F5] font-semibold">{buff.name}</span>
                    <span className="text-[#647A9E] mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] tabular-nums text-[#F2F7FF]">
                      +{buff.effectValue}% {buff.effectType}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {heroDef.abilities.slice(0, 2).map(ab => (
                  <p key={ab.name} className="text-xs text-[#94A8C7] truncate">
                    <span className="text-[#38D9F5] font-medium">{ab.name}</span>
                    <span className="text-[#647A9E] mx-1.5" aria-hidden="true">·</span>
                    <span>{ab.description}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN (4 cols): Full-Body Hero Centerpiece */}
        <div className="lg:col-span-4 relative flex flex-col items-center justify-end min-h-[380px] sm:min-h-[450px] lg:min-h-[490px] py-6 px-4 order-1 lg:order-2 select-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 rounded-full blur-3xl opacity-35"
            style={{
              background: `radial-gradient(circle, rgba(22, 119, 255, 0.75) 0%, rgba(0, 217, 255, 0.30) 55%, transparent 80%)`,
            }}
          />

          {/* Subtle Rotating Runic Pedestal */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 w-60 h-60 opacity-55"
            style={{ perspective: '600px' }}
          >
            <div className="w-full h-full rounded-full border border-[#00D9FF]/45 animate-runic-ring flex items-center justify-center shadow-[0_0_24px_rgba(22,119,255,0.32)]">
              <div className="w-[82%] h-[82%] rounded-full border border-dashed border-[#1677FF]/70" />
            </div>
          </div>

          <div className="relative z-10 w-full max-w-[320px] sm:max-w-[360px] h-[350px] sm:h-[420px] lg:h-[450px] flex items-end justify-center animate-hero-breathe">
            <img
              src={heroArtSrc}
              alt={`${heroDef.name} — ${heroDef.archetype}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-bottom drop-shadow-[0_24px_38px_rgba(2,8,20,0.92)]"
              style={{
                WebkitMaskImage:
                  'radial-gradient(ellipse 76% 88% at 50% 48%, #000 56%, rgba(0,0,0,0.85) 74%, transparent 98%)',
                maskImage:
                  'radial-gradient(ellipse 76% 88% at 50% 48%, #000 56%, rgba(0,0,0,0.85) 74%, transparent 98%)',
              }}
            />
          </div>

          <div className="relative z-20 -mt-2 text-center">
            <p className="font-['Cinzel'] font-black text-sm sm:text-base tracking-[0.14em] uppercase text-[#F2F7FF]">
              {heroDef.name}
            </p>
            <p className="text-[11px] text-[#38D9F5] tracking-wide tabular-nums">
              {heroDef.introFlourishLabel}
              <span className="text-[#647A9E] mx-1.5" aria-hidden="true">·</span>
              {stats.currentStreak} Day Streak
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols): Six Character Attributes & Combat Readiness */}
        <div
          data-tutorial-id="character-attributes"
          className="lg:col-span-4 p-5 sm:p-7 flex flex-col justify-between gap-4 order-3 bg-[#0A1930]/55"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-[#1E3A63] pb-3">
              <div>
                <h2 className="font-['Cinzel'] font-bold text-sm tracking-wider uppercase text-[#F2F7FF]">
                  Character Attributes
                </h2>
                <p className="text-[11px] text-[#94A8C7] mt-0.5">
                  Scaled directly from real-world habits &amp; workouts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttributeSources(s => !s)}
                className="text-[11px] text-[#38D9F5] hover:text-[#F2F7FF] flex items-center gap-1 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {showAttributeSources ? 'Hide' : 'Sources'}
                {showAttributeSources ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="space-y-3">
              {RPG_ATTRIBUTE_META.map(attr => {
                const Icon = ATTR_ICON_MAP[attr.key];
                const val = rpgAttributes[attr.key];
                const pct = Math.min(100, Math.max(5, Math.round((val / maxStatScale) * 100)));
                const isFocus = heroDef.attributeFocus.includes(attr.key);

                return (
                  <div key={attr.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-6 h-6 rounded bg-[#061225] border border-[#1E3A63] flex items-center justify-center shrink-0"
                          style={{ color: attr.accentHex }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F2F7FF]">
                            {attr.label}
                          </span>
                          <span className="text-[10px] text-[#647A9E] ml-1.5">
                            {isFocus ? '· Focus' : `· ${ATTRIBUTE_SUBTITLE_MAP[attr.key]}`}
                          </span>
                        </div>
                      </div>
                      <AnimatedCounter
                        value={val}
                        className="font-mono font-black text-base text-[#F2F7FF] shrink-0"
                      />
                    </div>

                    <AnimatedProgressBar
                      percentage={pct}
                      className="w-full h-1.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                      barClassName=""
                      barStyle={{
                        background: `linear-gradient(90deg, #1677FF 0%, ${attr.accentHex} 100%)`,
                      }}
                      shimmer={false}
                    />

                    {showAttributeSources && (
                      <p className="text-[10px] text-[#94A8C7] leading-snug pl-8">
                        {attr.realLifeSource}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combat Readiness Summary Strip */}
          <div className="pt-3 border-t border-[#1E3A63] grid grid-cols-3 divide-x divide-[#1E3A63] text-center font-mono">
            <div className="px-2">
              <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                Attack
              </span>
              <span className="text-sm font-bold text-[#F43F5E] tabular-nums">
                +<AnimatedCounter value={totalAttack} />
              </span>
            </div>
            <div className="px-2">
              <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                Defense
              </span>
              <span className="text-sm font-bold text-[#10B981] tabular-nums">
                +<AnimatedCounter value={totalDefense} />
              </span>
            </div>
            <div className="px-2">
              <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                Crit Rate
              </span>
              <span className="text-sm font-bold text-[#FBBF24] tabular-nums">
                <AnimatedCounter value={critPercent} />%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
