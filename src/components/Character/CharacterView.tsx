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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#362B45] pb-4">
        <div>
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]">
            Champion Dossier
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7] tracking-wide">
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
          <div className="space-y-8">
            {/* 1. HERO COMMAND STAGE — Layered RPG Identity Showcase */}
            <FeatureBanner themeId="character" className="relative overflow-hidden">
              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch gap-7">
                {/* Portrait Stage */}
                <div className="relative flex flex-col items-center justify-center shrink-0">
                  <div className="relative p-1.5 rounded-2xl bg-gradient-to-b from-[#D6A84B]/45 via-[#7045A0]/30 to-transparent">
                    <Character2DAvatar
                      heroId={selectedHeroId}
                      characterClass={user?.characterClass}
                      appearance={cosmeticsState?.appearance}
                      size="lg"
                      showBannerBackdrop
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-mono tabular-nums">
                    <span className="font-['Cinzel'] font-black text-sm text-[#E8C777]">
                      LEVEL <AnimatedCounter value={stats.level} />
                    </span>
                    <span className="text-[#766D82]" aria-hidden="true">·</span>
                    <span className="text-[#F2EDF7] font-semibold">
                      {user?.characterClass || heroDef.mappedClass}
                    </span>
                  </div>
                </div>

                {/* Core Identity & XP Progression Beam */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 text-center lg:text-left">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                      <h2 className="text-2xl sm:text-4xl font-black font-['Cinzel'] text-[#F2EDF7] tracking-wide">
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

                    {/* Clean Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-2.5 gap-y-1 text-xs text-[#A69AAF]">
                      <span className="text-[#E8C777] font-semibold">{heroDef.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{heroDef.title}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#F2EDF7] font-medium">Aether Rank: {stats.aetherRank}</span>
                      {validJoinedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-[#D6A84B]" />
                            Joined {validJoinedAt}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#A69AAF] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      {heroDef.greatFallOrigin}
                    </p>

                    {/* Worldwide Legend Title Quick Switcher (if earned in Hall of Legends) */}
                    {ownedLegends.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        <span className="text-[11px] font-['Cinzel'] uppercase tracking-wider text-[#D6A84B] flex items-center gap-1">
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
                                  ? 'ring-1 ring-[#D6A84B] bg-[#21152F]'
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
                          className="text-[11px] text-[#E8C777] hover:text-[#F2EDF7] underline ml-1 cursor-pointer whitespace-nowrap"
                        >
                          Hall of Legends
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expressive Level & XP Rail */}
                  <div className="pt-4 border-t border-[#362B45] flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                    <div className="flex-1 max-w-xl space-y-1.5 mx-auto lg:mx-0 w-full">
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className="text-[#A69AAF] uppercase tracking-wider text-[11px]">
                          Level {stats.level} Progression
                        </span>
                        <span className="font-bold text-[#E8C777]">
                          {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP ({xpPercent}%)
                        </span>
                      </div>
                      <AnimatedProgressBar
                        percentage={xpPercent}
                        className="w-full h-3 rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden p-0.5"
                        barClassName="bg-gradient-to-r from-[#7045A0] via-[#9A72CC] to-[#D6A84B]"
                      />
                    </div>

                    {/* Primary Hero Actions */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 shrink-0">
                      {heroLocked ? (
                        <span className="px-3.5 py-2 text-xs font-['Cinzel'] font-semibold text-[#E8C777] border border-[#362B45] rounded-xl bg-[#100D18]/80 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                          <Lock className="w-3.5 h-3.5 text-[#D6A84B]" />
                          Permanent Champion
                        </span>
                      ) : (
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
                        onClick={() => setActiveTab('settings')}
                        className="lq-btn lq-btn-secondary px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Edit className="w-3.5 h-3.5 text-[#E8C777]" />
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </FeatureBanner>

            {/* 2. LAYERED TELEMETRY SPLIT: Combat Readiness (Left) + Lifetime Heroic Record (Right) */}
            <RpgScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Combat Readiness Panel */}
              <section className="lg:col-span-6 space-y-5">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#362B45]">
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#D6A84B]" />
                    Combat Readiness
                  </h3>
                  <span className="text-[11px] font-mono text-[#A69AAF]">
                    Unarmed Bodyweight Discipline
                  </span>
                </div>

                {/* Unified 3-Metric Hairline Strip */}
                <div className="lq-surface rounded-2xl grid grid-cols-3 divide-x divide-[#362B45] font-mono overflow-hidden">
                  <div className="p-4 sm:p-5 text-center">
                    <span className="text-[10px] text-[#A69AAF] uppercase tracking-wider block mb-1">
                      Strike Power
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#F2EDF7] tabular-nums">
                      +<AnimatedCounter value={totalAttack} />
                    </span>
                    {atkBuff && (
                      <span className="text-[10px] text-[#E8C777] block mt-0.5 tabular-nums">
                        +{atkBuff.effectValue}% Aura
                      </span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 text-center">
                    <span className="text-[10px] text-[#A69AAF] uppercase tracking-wider block mb-1">
                      Body Guard
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#9A72CC] tabular-nums">
                      +<AnimatedCounter value={totalDefense} />
                    </span>
                    {defBuff && (
                      <span className="text-[10px] text-[#E8C777] block mt-0.5 tabular-nums">
                        +{defBuff.effectValue}% Aura
                      </span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 text-center">
                    <span className="text-[10px] text-[#A69AAF] uppercase tracking-wider block mb-1">
                      Crit Rate
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#E8C777] tabular-nums">
                      <AnimatedCounter value={critPercent} />%
                    </span>
                    {critBuff && (
                      <span className="text-[10px] text-[#E8C777] block mt-0.5 tabular-nums">
                        +{critBuff.effectValue}% Aura
                      </span>
                    )}
                  </div>
                </div>

                {/* Discipline Summary + Direct Training Links */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#E8C777]">
                        {heroDef.bodyweightDisciplines.conditioningStyle}
                      </p>
                      <p className="text-xs text-[#A69AAF] mt-0.5">
                        Hands &amp; legs bodyweight conditioning builds strike power and tactical resilience.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('store')}
                        className="lq-btn lq-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#D6A84B]" />
                        Store
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('fitness')}
                        className="lq-btn lq-btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Dumbbell className="w-3.5 h-3.5 text-[#E8C777]" />
                        Train
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#362B45] text-xs">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Hand className="w-4 h-4 text-[#D6A84B] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#A69AAF] block">
                          Hands Technique
                        </span>
                        <span className="text-xs font-semibold text-[#F2EDF7] block truncate">
                          {heroDef.bodyweightDisciplines.handsFocus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Footprints className="w-4 h-4 text-[#9A72CC] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#A69AAF] block">
                          Legs Technique
                        </span>
                        <span className="text-xs font-semibold text-[#F2EDF7] block truncate">
                          {heroDef.bodyweightDisciplines.legsFocus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Lifetime Heroic Record — Clean Ledger Rows */}
              <section className="lg:col-span-6 space-y-5">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#362B45]">
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#D6A84B]" />
                    Lifetime Heroic Record
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('museum')}
                    className="text-xs font-semibold text-[#E8C777] hover:text-[#F2EDF7] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    Inspect {authoritativePrCount} Personal Bests
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lq-surface rounded-2xl divide-y divide-[#362B45]/70 text-xs overflow-hidden">
                  {[
                    {
                      label: 'Current Habit Streak',
                      value: `${stats.currentStreak}d`,
                      sub: `Best ${Math.max(stats.currentStreak, lifetime?.longestStreak ?? 0)}d`,
                      accent: 'text-[#E8C777]',
                      icon: Flame,
                    },
                    {
                      label: 'Verified Workouts',
                      value: `${Math.max(stats.totalWorkoutsCompleted, lifetime?.totalWorkouts ?? 0)}`,
                      sub: 'Sessions',
                      accent: 'text-[#9A72CC]',
                    },
                    {
                      label: 'Aether Vision Reps',
                      value: `${Math.max(stats.totalVerifiedReps, lifetime?.totalVerifiedReps ?? 0)}`,
                      sub: 'Tracked',
                      accent: 'text-[#49B88A]',
                    },
                    {
                      label: 'Bosses Defeated',
                      value: `${Math.max(stats.totalBossesDefeated, lifetime?.totalBossesDefeated ?? 0)}`,
                      sub: `${(lifetime?.totalBossDamage ?? 0).toLocaleString()} Boss DMG`,
                      accent: 'text-[#D65C66]',
                    },
                    {
                      label: 'Skill Nodes & Rivalries',
                      value: `${unlockedSkillNodesCount} Nodes`,
                      sub: `${authoritativeRivalWins} Rival Wins · ${authoritativePrCount} PRs`,
                      accent: 'text-[#F2EDF7]',
                    },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4"
                    >
                      <span className="text-[#A69AAF] font-medium">{row.label}</span>
                      <div className="text-right font-mono tabular-nums">
                        <span className={`font-bold text-sm ${row.accent}`}>{row.value}</span>
                        <span className="text-[11px] text-[#766D82] ml-2">{row.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#A69AAF]">
                  Wellness Profile:{' '}
                  <strong className="text-[#F2EDF7] capitalize">{user?.activityLevel || 'Moderate'}</strong>
                  <span className="mx-1.5 text-[#766D82]" aria-hidden="true">·</span>
                  <strong className="text-[#F2EDF7] capitalize">{user?.dietaryPreference || 'Balanced'}</strong>
                  <span className="mx-1.5 text-[#766D82]" aria-hidden="true">·</span>
                  <span className="uppercase">{user?.preferredUnits || 'Metric'} Units</span>
                </p>
              </section>
            </RpgScrollReveal>

            {/* 3. SIX INDEPENDENT HERO ATTRIBUTES — Sleek Mastery Matrix */}
            <RpgScrollReveal>
              <section data-tutorial-id="character-attributes" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#362B45]">
                  <div>
                    <h3 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F2EDF7] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#D6A84B]" />
                      Six Independent Hero Attributes
                    </h3>
                    <p className="text-xs text-[#A69AAF] mt-0.5">
                      Affinity:{' '}
                      <span className="text-[#E8C777] font-mono">
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
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#D6A84B]" />
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
                        className="space-y-2 pb-4 border-b border-[#362B45]/70"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">
                              {attr.label}
                            </span>
                            {isAffinity && (
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8C777]">
                                Hero Focus
                              </span>
                            )}
                          </div>
                          <span
                            className="font-mono text-xl font-black tabular-nums shrink-0"
                            style={{ color: isAffinity ? '#E8C777' : '#F2EDF7' }}
                          >
                            <AnimatedCounter value={val} />
                          </span>
                        </div>

                        <AnimatedProgressBar
                          percentage={pct}
                          className="w-full h-2 rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden"
                          barClassName={
                            isAffinity
                              ? 'bg-gradient-to-r from-[#7045A0] to-[#D6A84B]'
                              : 'bg-[#9A72CC]'
                          }
                          barStyle={isAffinity ? undefined : { backgroundColor: attr.accentHex }}
                          shimmer={isAffinity}
                        />

                        <p className="text-xs text-[#A69AAF] leading-snug">{attr.description}</p>
                        <p className="text-[11px] text-[#E8C777]/85">Source: {attr.realLifeSource}</p>
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
