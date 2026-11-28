import React from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import {
  Dumbbell,
  Flame,
  Footprints,
  Hand,
  Award,
  Edit,
  ShoppingBag,
  Users,
  Lock,
  Crown,
  Calendar,
  Trophy,
  User,
  ArrowUpRight,
  Shield,
  Zap,
  Sparkles,
  Target,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { Character2DAvatar } from './Character2DAvatar';
import { TrophyShowcasePanel } from './TrophyShowcasePanel';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgScrollReveal,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';

export const CharacterView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    rpgAttributes,
    activeBuffs,
    setActiveTab,
    characterSubTab,
    setCharacterSubTab,
    cosmeticsState,
    hallOfLegends,
    equippedLegendMap,
    equipGlobalLegendTitle,
    identityState,
    museumData,
    rivalsState,
    skillTreeState,
  } = useGame();

  const authoritativePrCount =
    museumData?.personalBestCount ??
    museumData?.personalBests.length ??
    identityState?.lifetimeStats.totalPersonalRecords ??
    0;
  const authoritativeRivalWins =
    rivalsState?.profile?.wins ??
    rivalsState?.stats?.wins ??
    identityState?.lifetimeStats.rivalryWins ??
    0;

  const lifetime = identityState?.lifetimeStats;
  const validJoinedAt =
    lifetime?.joinedAt && !Number.isNaN(new Date(lifetime.joinedAt).getTime())
      ? new Date(lifetime.joinedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  const equippedLegend = user
    ? user.legendTitle
      ? {
          achievementId:
            hallOfLegends.find(h => h.ownedByCurrentUser && h.titleTag === user.legendTitle)?.id || '',
          titleTag: user.legendTitle,
          titleStyle: user.legendTitleStyle || ('gold' as const),
          emblemIcon: user.legendEmblem || 'Crown',
        }
      : equippedLegendMap[user.id]
    : undefined;
  const ownedLegends = hallOfLegends.filter(h => h.ownedByCurrentUser);

  const heroDef = getHeroById(selectedHeroId);
  const xpPercent = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );
  const xpRemaining = Math.max(0, stats.playerXPNextLevel - stats.playerXP);
  const rankPercent = Math.min(
    100,
    Math.round((stats.aetherPoints / Math.max(1, stats.aetherPointsNextRank)) * 100)
  );

  const rawAttack = 18 + Math.round(rpgAttributes.strength * 1.4 + rpgAttributes.agility * 0.6);
  const rawDefense = 12 + Math.round(rpgAttributes.resilience * 1.2 + rpgAttributes.discipline * 0.8);

  const atkBuff = activeBuffs.find(b => b.effectType === 'attack');
  const defBuff = activeBuffs.find(b => b.effectType === 'defense');
  const critBuff = activeBuffs.find(b => b.effectType === 'crit');

  const totalAttack = Math.round(rawAttack * (1 + (atkBuff ? atkBuff.effectValue / 100 : 0)));
  const totalDefense = Math.round(rawDefense * (1 + (defBuff ? defBuff.effectValue / 100 : 0)));
  const critPercent = Math.min(
    60,
    10 + Math.round(rpgAttributes.agility * 0.25) + (critBuff ? critBuff.effectValue : 0)
  );

  const unlockedSkillNodesCount = Math.max(
    skillTreeState?.unlockedNodeIds?.length || 0,
    lifetime?.skillNodesUnlocked ?? 0
  );

  const activeSubTab = characterSubTab === 'trophies' ? 'trophies' : 'overview';

  return (
    <div className="space-y-8 pb-14 max-w-[1360px] mx-auto">
      {/* Open Architectural Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E3A63] pb-4">
        <div>
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-[0.22em] text-[#00D9FF]">
            Champion Dossier · Aetheria
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF] tracking-wide mt-0.5">
            Character Profile
          </h1>
        </div>

        <FeatureTabBar
          themeId="character"
          layoutId="character-subtab-pill"
          ariaLabel="Character Profile sections"
          activeId={activeSubTab}
          onSelect={id => setCharacterSubTab(id)}
          tabs={[
            { id: 'overview', label: 'Hero Overview', icon: User },
            { id: 'trophies', label: 'Trophy Vault', icon: Trophy },
          ]}
        />
      </div>

      <RpgSubTabTransition tabKey={activeSubTab}>
        {activeSubTab === 'trophies' ? (
          <TrophyShowcasePanel />
        ) : (
          <div className="space-y-9">
            {/* 1. HERO COMMAND STAGE — Premium Gaming RPG Identity & Progression */}
            <FeatureBanner themeId="character" className="relative overflow-hidden">
              {/* Subtle Tactical Grid Accent */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(0,217,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,217,255,0.08) 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                  maskImage: 'radial-gradient(ellipse 80% 70% at 85% 20%, #000 10%, transparent 75%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse 80% 70% at 85% 20%, #000 10%, transparent 75%)',
                }}
              />

              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch gap-7 lg:gap-9">
                {/* Left Portrait Stage + Level Crest */}
                <div className="relative flex flex-col items-center justify-center shrink-0">
                  <div className="relative p-2 rounded-3xl bg-gradient-to-b from-[#00D9FF]/35 via-[#1677FF]/25 to-transparent border border-[#00D9FF]/30 shadow-[0_0_32px_rgba(0,217,255,0.16)]">
                    <Character2DAvatar
                      heroId={selectedHeroId}
                      characterClass={user?.characterClass}
                      appearance={cosmeticsState?.appearance}
                      size="xl"
                      showBannerBackdrop
                    />
                    {/* Level Shield Emblem Overlay */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-xl bg-[#061225] border border-[#00D9FF]/70 shadow-[0_6px_18px_rgba(2,8,20,0.9)] flex items-center gap-2 whitespace-nowrap">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#38D9F5]">
                        LV
                      </span>
                      <span className="font-['Cinzel'] font-black text-base text-[#F2F7FF] tabular-nums leading-none">
                        <AnimatedCounter value={stats.level} />
                      </span>
                      <span className="text-[#1E3A63]" aria-hidden="true">|</span>
                      <span className="text-[11px] font-semibold text-[#94A8C7]">
                        {user?.characterClass || heroDef.mappedClass}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Core Identity & Dual XP / Rank Rails */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-6 text-center lg:text-left pt-2 lg:pt-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#00D9FF] font-bold">
                        {heroDef.archetype}
                      </span>
                      {heroLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#94A8C7]">
                          <Lock className="w-3 h-3 text-[#38D9F5]" />
                          Permanent Oath
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <h2 className="text-2xl sm:text-4xl font-black font-['Cinzel'] text-[#F2F7FF] tracking-wide">
                        {user?.characterName || user?.username || heroDef.name}
                      </h2>
                      {equippedLegend && (
                        <LegendTitleBadge
                          title={equippedLegend.titleTag}
                          style={equippedLegend.titleStyle}
                          emblemIcon={equippedLegend.emblemIcon}
                          size="md"
                        />
                      )}
                    </div>

                    {/* Clean Unboxed Identity Strip */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-2.5 gap-y-1 text-xs text-[#94A8C7]">
                      <span className="text-[#38D9F5] font-semibold">{heroDef.name}</span>
                      <span className="text-[#647A9E]" aria-hidden="true">·</span>
                      <span>{heroDef.title}</span>
                      <span className="text-[#647A9E]" aria-hidden="true">·</span>
                      <span className="text-[#F2F7FF] font-medium">
                        Aether Rank: <span className="text-[#00D9FF]">{stats.aetherRank}</span>
                      </span>
                      {validJoinedAt && (
                        <>
                          <span className="text-[#647A9E]" aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-[#38D9F5]" />
                            Joined {validJoinedAt}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#94A8C7] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      {heroDef.greatFallOrigin}
                    </p>

                    {/* Earned Worldwide Legend Title Quick Switcher (only shown if earned) */}
                    {ownedLegends.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        <span className="text-[11px] font-['Cinzel'] uppercase tracking-wider text-[#FBBF24] flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          Global Titles:
                        </span>
                        {ownedLegends.map(entry => {
                          const isEquipped = equippedLegend?.titleTag === entry.titleTag;
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => void equipGlobalLegendTitle(isEquipped ? null : entry.id)}
                              title={
                                isEquipped
                                  ? 'Click to unequip title'
                                  : `Equip [${entry.titleTag}] across the realm`
                              }
                              className={`inline-flex items-center gap-1 rounded-lg p-0.5 transition-all cursor-pointer ${
                                isEquipped
                                  ? 'ring-1 ring-[#00D9FF] bg-[#102440]'
                                  : 'opacity-80 hover:opacity-100'
                              }`}
                            >
                              <LegendTitleBadge
                                title={entry.titleTag}
                                style={entry.titleStyle}
                                emblemIcon={entry.emblemIcon}
                                size="xs"
                              />
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setActiveTab('hall-of-legends')}
                          className="text-[11px] text-[#38D9F5] hover:text-[#F2F7FF] underline ml-1 cursor-pointer whitespace-nowrap"
                        >
                          Hall of Legends
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dual Progression Rails & Hero Actions */}
                  <div className="pt-4 border-t border-[#1E3A63] flex flex-col xl:flex-row xl:items-end justify-between gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-2xl mx-auto lg:mx-0 w-full">
                      {/* Level XP Beam */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="text-[#94A8C7] uppercase tracking-wider text-[10px]">
                            Level {stats.level} XP ({xpPercent}%)
                          </span>
                          <span className="font-bold text-[#00D9FF]">
                            {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()}
                          </span>
                        </div>
                        <AnimatedProgressBar
                          percentage={xpPercent}
                          className="w-full h-2.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden p-0.5"
                          barClassName="bg-gradient-to-r from-[#1677FF] via-[#0099FF] to-[#00D9FF]"
                        />
                        <p className="text-[10px] font-mono text-[#647A9E] tabular-nums">
                          {xpRemaining.toLocaleString()} XP to Level {stats.level + 1}
                        </p>
                      </div>

                      {/* Aether Rank Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="text-[#94A8C7] uppercase tracking-wider text-[10px]">
                            Aether Rank · {stats.aetherRank}
                          </span>
                          <span className="font-bold text-[#38D9F5]">
                            {stats.aetherPoints.toLocaleString()} / {stats.aetherPointsNextRank.toLocaleString()} AP
                          </span>
                        </div>
                        <AnimatedProgressBar
                          percentage={rankPercent}
                          className="w-full h-2.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden p-0.5"
                          barClassName="bg-gradient-to-r from-[#0099FF] to-[#10B981]"
                          shimmer={false}
                        />
                        <p className="text-[10px] font-mono text-[#647A9E] tabular-nums">
                          {rankPercent}% toward next Aether promotion
                        </p>
                      </div>
                    </div>

                    {/* Primary Hero Actions */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 shrink-0">
                      {!heroLocked && (
                        <button
                          type="button"
                          onClick={() => setShowHeroSelectModal(true)}
                          className="lq-btn lq-btn-gold px-4 py-2 text-xs font-bold font-['Cinzel'] rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Choose Champion
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCharacterSubTab('trophies')}
                        className="lq-btn lq-btn-secondary px-3.5 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Trophy className="w-3.5 h-3.5 text-[#FBBF24]" />
                        Trophy Vault
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className="lq-btn lq-btn-primary px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Edit className="w-3.5 h-3.5 text-[#00D9FF]" />
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </FeatureBanner>

            {/* 2. LAYERED TELEMETRY SPLIT: Combat Readiness (Left) + Lifetime Heroic Record (Right) */}
            <RpgScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-9 items-start">
              {/* Combat Readiness & Bodyweight Discipline */}
              <section className="lg:col-span-6 space-y-5">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1E3A63]">
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00D9FF]" />
                    Combat Readiness
                  </h3>
                  <span className="text-[11px] font-mono text-[#94A8C7]">
                    Unarmed Bodyweight Discipline
                  </span>
                </div>

                {/* Unified 3-Metric Hairline Strip */}
                <div className="lq-surface rounded-2xl grid grid-cols-3 divide-x divide-[#1E3A63] font-mono overflow-hidden">
                  <div className="p-4 sm:p-5 text-center bg-gradient-to-b from-[#1677FF]/[0.08] to-transparent">
                    <span className="text-[10px] text-[#94A8C7] uppercase tracking-wider block mb-1">
                      Strike Power
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#F2F7FF] tabular-nums">
                      +<AnimatedCounter value={totalAttack} />
                    </span>
                    {atkBuff ? (
                      <span className="text-[10px] text-[#00D9FF] block mt-0.5 tabular-nums">
                        +{atkBuff.effectValue}% Aura
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#647A9E] block mt-0.5">STR + AGI</span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 text-center bg-gradient-to-b from-[#00D9FF]/[0.07] to-transparent">
                    <span className="text-[10px] text-[#94A8C7] uppercase tracking-wider block mb-1">
                      Body Guard
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#38D9F5] tabular-nums">
                      +<AnimatedCounter value={totalDefense} />
                    </span>
                    {defBuff ? (
                      <span className="text-[10px] text-[#00D9FF] block mt-0.5 tabular-nums">
                        +{defBuff.effectValue}% Aura
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#647A9E] block mt-0.5">RES + DIS</span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 text-center bg-gradient-to-b from-[#10B981]/[0.07] to-transparent">
                    <span className="text-[10px] text-[#94A8C7] uppercase tracking-wider block mb-1">
                      Crit Rate
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#10B981] tabular-nums">
                      <AnimatedCounter value={critPercent} />%
                    </span>
                    {critBuff ? (
                      <span className="text-[10px] text-[#34D399] block mt-0.5 tabular-nums">
                        +{critBuff.effectValue}% Aura
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#647A9E] block mt-0.5">Tempo Edge</span>
                    )}
                  </div>
                </div>

                {/* Discipline Summary + Direct Training Links */}
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#00D9FF] font-semibold">
                        {heroDef.bodyweightDisciplines.conditioningStyle}
                      </p>
                      <p className="text-xs text-[#94A8C7] mt-0.5">
                        Hands &amp; legs bodyweight conditioning builds strike power and tactical resilience.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('store')}
                        className="lq-btn lq-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#FBBF24]" />
                        Store
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('fitness')}
                        className="lq-btn lq-btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Dumbbell className="w-3.5 h-3.5 text-[#00D9FF]" />
                        Train
                      </button>
                    </div>
                  </div>

                  {/* Unboxed Hairline Conditioning Rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1E3A63] text-xs">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Hand className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                          Hands Technique
                        </span>
                        <span className="text-xs font-semibold text-[#F2F7FF] block truncate">
                          {heroDef.bodyweightDisciplines.handsFocus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Footprints className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                          Legs Technique
                        </span>
                        <span className="text-xs font-semibold text-[#F2F7FF] block truncate">
                          {heroDef.bodyweightDisciplines.legsFocus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Hero Techniques */}
                  <div className="pt-3 border-t border-[#1E3A63] space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#647A9E] block">
                      {activeBuffs.length > 0 ? 'Active Aura Blessings' : 'Signature Combat Forms'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {activeBuffs.length > 0
                        ? activeBuffs.slice(0, 2).map(buff => (
                            <div key={buff.id} className="flex items-start gap-2 min-w-0">
                              <Sparkles className="w-3.5 h-3.5 text-[#FBBF24] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-semibold text-[#F2F7FF] truncate">{buff.name}</p>
                                <p className="text-[11px] text-[#38D9F5] font-mono">
                                  +{buff.effectValue}% {buff.effectType} · {buff.usesRemaining} uses
                                </p>
                              </div>
                            </div>
                          ))
                        : heroDef.abilities.slice(0, 2).map(ab => (
                            <div key={ab.name} className="flex items-start gap-2 min-w-0">
                              <Target className="w-3.5 h-3.5 text-[#38D9F5] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-semibold text-[#F2F7FF] truncate">{ab.name}</p>
                                <p className="text-[11px] text-[#94A8C7] line-clamp-2">{ab.description}</p>
                              </div>
                            </div>
                          ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Lifetime Heroic Record — Clean Ledger Rows */}
              <section className="lg:col-span-6 space-y-5">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1E3A63]">
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#00D9FF]" />
                    Lifetime Heroic Record
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('museum')}
                    className="text-xs font-semibold text-[#38D9F5] hover:text-[#F2F7FF] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    Inspect {authoritativePrCount} Personal Bests
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lq-surface rounded-2xl divide-y divide-[#1E3A63]/75 text-xs overflow-hidden">
                  {[
                    {
                      label: 'Current Habit Streak',
                      value: `${stats.currentStreak}d`,
                      sub: `Best ${Math.max(stats.currentStreak, lifetime?.longestStreak ?? 0)}d`,
                      accent: 'text-[#FBBF24]',
                      icon: Flame,
                    },
                    {
                      label: 'Verified Workouts',
                      value: `${Math.max(stats.totalWorkoutsCompleted, lifetime?.totalWorkouts ?? 0)}`,
                      sub: 'Sessions',
                      accent: 'text-[#38D9F5]',
                    },
                    {
                      label: 'Aether Vision Reps',
                      value: `${Math.max(stats.totalVerifiedReps, lifetime?.totalVerifiedReps ?? 0)}`,
                      sub: 'Tracked',
                      accent: 'text-[#10B981]',
                    },
                    {
                      label: 'Bosses Defeated',
                      value: `${Math.max(stats.totalBossesDefeated, lifetime?.totalBossesDefeated ?? 0)}`,
                      sub: `${(lifetime?.totalBossDamage ?? 0).toLocaleString()} Boss DMG`,
                      accent: 'text-[#FB7185]',
                    },
                    {
                      label: 'Skill Nodes & Rivalries',
                      value: `${unlockedSkillNodesCount} Nodes`,
                      sub: `${authoritativeRivalWins} Rival Wins · ${authoritativePrCount} PRs`,
                      accent: 'text-[#F2F7FF]',
                    },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#102440]/45 transition-colors"
                    >
                      <span className="text-[#94A8C7] font-medium">{row.label}</span>
                      <div className="text-right font-mono tabular-nums">
                        <span className={`font-bold text-sm ${row.accent}`}>{row.value}</span>
                        <span className="text-[11px] text-[#647A9E] ml-2">{row.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#94A8C7]">
                  Wellness Profile:{' '}
                  <strong className="text-[#F2F7FF] capitalize">{user?.activityLevel || 'Moderate'}</strong>
                  <span className="mx-1.5 text-[#647A9E]" aria-hidden="true">·</span>
                  <strong className="text-[#F2F7FF] capitalize">{user?.dietaryPreference || 'Balanced'}</strong>
                  <span className="mx-1.5 text-[#647A9E]" aria-hidden="true">·</span>
                  <span className="uppercase">{user?.preferredUnits || 'Metric'} Units</span>
                </p>
              </section>
            </RpgScrollReveal>

            {/* 3. SIX INDEPENDENT HERO ATTRIBUTES — Sleek Open Mastery Matrix */}
            <RpgScrollReveal>
              <section data-tutorial-id="character-attributes" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#1E3A63]">
                  <div>
                    <h3 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F2F7FF] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#00D9FF]" />
                      Six Independent Hero Attributes
                    </h3>
                    <p className="text-xs text-[#94A8C7] mt-0.5">
                      Affinity:{' '}
                      <span className="text-[#38D9F5] font-mono">
                        {heroDef.attributeFocus.map(k => k.toUpperCase()).join(' · ')}
                      </span>{' '}
                      — Built strictly from verified real-life effort.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('skill-tree')}
                    className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-['Cinzel'] font-bold tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    Open Skill Tree
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#00D9FF]" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  {RPG_ATTRIBUTE_META.map(attr => {
                    const val = rpgAttributes[attr.key];
                    const pct = Math.min(100, Math.round((val / 40) * 100));
                    const isAffinity = heroDef.attributeFocus.includes(attr.key);
                    return (
                      <div
                        key={attr.key}
                        className="space-y-2 pb-4 border-b border-[#1E3A63]/75"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-[#38D9F5]">
                              {attr.shortLabel}
                            </span>
                            <span className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                              {attr.label}
                            </span>
                            {isAffinity && (
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#00D9FF] font-semibold">
                                Hero Focus
                              </span>
                            )}
                          </div>
                          <span
                            className="font-mono text-xl font-black tabular-nums shrink-0"
                            style={{ color: isAffinity ? '#00D9FF' : '#F2F7FF' }}
                          >
                            <AnimatedCounter value={val} />
                          </span>
                        </div>

                        <AnimatedProgressBar
                          percentage={pct}
                          className="w-full h-2 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                          barClassName={
                            isAffinity
                              ? 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF]'
                              : 'bg-[#38D9F5]'
                          }
                          barStyle={isAffinity ? undefined : { backgroundColor: attr.accentHex }}
                          shimmer={isAffinity}
                        />

                        <p className="text-xs text-[#94A8C7] leading-snug">{attr.description}</p>
                        <p className="text-[11px] text-[#38D9F5]/85">Source: {attr.realLifeSource}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </RpgScrollReveal>
          </div>
        )}
      </RpgSubTabTransition>
    </div>
  );
};
