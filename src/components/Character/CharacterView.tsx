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

  const tabSwitcher = (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1677FF]/25 pb-4">
      <div>
        <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
          Champion Dossier
        </span>
        <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#FFFFFF] tracking-wide">
          CHARACTER PROFILE
        </h1>
      </div>

      <div
        role="tablist"
        aria-label="Character Profile sections"
        className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 w-fit"
      >
        {[
          { id: 'overview' as const, label: 'Hero Overview', icon: User },
          { id: 'trophies' as const, label: 'Trophy Vault', icon: Trophy },
        ].map(t => {
          const Icon = t.icon;
          const active = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setCharacterSubTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_16px_rgba(0,217,255,0.28)] border border-[#00D9FF]/50'
                  : 'text-[#A9B8CC] hover:text-[#FFFFFF] hover:bg-[#102440] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#00D9FF]'}`} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (activeSubTab === 'trophies') {
    return (
      <div className="space-y-6 animate-in fade-in pb-12 max-w-[1360px] mx-auto">
        {tabSwitcher}
        <TrophyShowcasePanel />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in pb-14 max-w-[1360px] mx-auto">
      {tabSwitcher}

      {/* 1. HERO COMMAND STAGE — Layered RPG Identity Showcase */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061225] via-[#0A1930] to-[#102440] border border-[#1677FF]/35 shadow-[0_18px_42px_rgba(2,8,20,0.7)]">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#1677FF]/12 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute left-1/3 -bottom-20 w-64 h-64 rounded-full bg-[#00D9FF]/8 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-center lg:items-stretch gap-7">
          {/* Portrait Stage */}
          <div className="relative flex flex-col items-center justify-center shrink-0">
            <div className="relative p-1.5 rounded-2xl bg-gradient-to-b from-[#00D9FF]/45 via-[#1677FF]/25 to-transparent">
              <Character2DAvatar
                heroId={selectedHeroId}
                characterClass={user?.characterClass}
                appearance={cosmeticsState?.appearance}
                size="lg"
                showBannerBackdrop
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-mono tabular-nums">
              <span className="font-['Cinzel'] font-black text-sm text-[#00D9FF]">
                LEVEL {stats.level}
              </span>
              <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
              <span className="text-[#FFFFFF] font-semibold">
                {user?.characterClass || heroDef.mappedClass}
              </span>
            </div>
          </div>

          {/* Core Identity & XP Progression Beam */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 text-center lg:text-left">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                <h2 className="text-2xl sm:text-4xl font-black font-['Cinzel'] text-[#FFFFFF] tracking-wide">
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
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-2.5 gap-y-1 text-xs text-[#A9B8CC]">
                <span className="text-[#00D9FF] font-semibold">{heroDef.name}</span>
                <span aria-hidden="true">·</span>
                <span>{heroDef.title}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#FFFFFF] font-medium">Aether Rank: {stats.aetherRank}</span>
                {validJoinedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-[#00D9FF]" />
                      Joined {validJoinedAt}
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#A9B8CC]/90 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {heroDef.greatFallOrigin}
              </p>

              {/* Worldwide Legend Title Quick Switcher (if earned in Hall of Legends) */}
              {ownedLegends.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="text-[11px] font-['Cinzel'] uppercase tracking-wider text-[#00D9FF] flex items-center gap-1">
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
                    className="text-[11px] text-[#00D9FF] hover:text-white underline ml-1 cursor-pointer"
                  >
                    Hall of Legends
                  </button>
                </div>
              )}
            </div>

            {/* Expressive Level & XP Rail */}
            <div className="pt-3 border-t border-[#1677FF]/20 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div className="flex-1 max-w-xl space-y-1.5 mx-auto lg:mx-0 w-full">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-[#A9B8CC] uppercase tracking-wider text-[11px]">
                    Level {stats.level} Progression
                  </span>
                  <span className="font-bold text-[#00D9FF]">
                    {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP ({xpPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#061225] border border-[#1677FF]/35 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1677FF] via-[#0099FF] to-[#00D9FF] transition-all duration-500 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>

              {/* Primary Hero Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 shrink-0">
                {heroLocked ? (
                  <span className="px-3.5 py-2 text-xs font-['Cinzel'] font-semibold text-[#00D9FF] border border-[#1677FF]/30 rounded-xl bg-[#061225]/70 inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Lock className="w-3.5 h-3.5" />
                    Permanent Champion
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHeroSelectModal(true)}
                    className="px-4 py-2 text-xs font-bold font-['Cinzel'] rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 text-[#061225] shadow-[0_0_18px_rgba(0,217,255,0.3)] inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Choose Champion
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#1677FF]/40 hover:border-[#00D9FF]/65 bg-[#0A1930] hover:bg-[#102440] text-[#FFFFFF] inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Edit className="w-3.5 h-3.5 text-[#00D9FF]" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LAYERED TELEMETRY SPLIT: Combat Readiness (Left) + Lifetime Heroic Record (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Combat Readiness Panel — Sleek Divider Matrix */}
        <section className="lg:col-span-6 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1677FF]/25">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00D9FF]" />
              COMBAT READINESS
            </h3>
            <span className="text-[11px] font-mono text-[#A9B8CC]">
              Unarmed Bodyweight Discipline
            </span>
          </div>

          {/* Unified 3-Metric Hairline Strip (No Nested Card Clutter) */}
          <div className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/30 grid grid-cols-3 divide-x divide-[#1677FF]/25 font-mono overflow-hidden">
            <div className="p-4 sm:p-5 text-center">
              <span className="text-[10px] text-[#A9B8CC] uppercase tracking-wider block mb-1">
                Strike Power
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#FFFFFF] tabular-nums">
                +{totalAttack}
              </span>
              {atkBuff && (
                <span className="text-[10px] text-[#00D9FF] block mt-0.5 tabular-nums">
                  +{atkBuff.effectValue}% Aura
                </span>
              )}
            </div>
            <div className="p-4 sm:p-5 text-center">
              <span className="text-[10px] text-[#A9B8CC] uppercase tracking-wider block mb-1">
                Body Guard
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#1677FF] tabular-nums">
                +{totalDefense}
              </span>
              {defBuff && (
                <span className="text-[10px] text-[#00D9FF] block mt-0.5 tabular-nums">
                  +{defBuff.effectValue}% Aura
                </span>
              )}
            </div>
            <div className="p-4 sm:p-5 text-center">
              <span className="text-[10px] text-[#A9B8CC] uppercase tracking-wider block mb-1">
                Crit Rate
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#00D9FF] tabular-nums">
                {critPercent}%
              </span>
              {critBuff && (
                <span className="text-[10px] text-[#00D9FF] block mt-0.5 tabular-nums">
                  +{critBuff.effectValue}% Aura
                </span>
              )}
            </div>
          </div>

          {/* Discipline Summary + Direct Training Links */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#00D9FF]">
                  {heroDef.bodyweightDisciplines.conditioningStyle}
                </p>
                <p className="text-xs text-[#A9B8CC] mt-0.5">
                  Hands &amp; legs bodyweight conditioning builds strike power and tactical resilience.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('store')}
                  className="px-3 py-2 rounded-xl bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/35 hover:border-[#00D9FF]/55 text-[#FFFFFF] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#00D9FF]" />
                  Store
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fitness')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2684FF] hover:to-[#00D9FF] text-white text-xs font-bold shadow-[0_4px_16px_rgba(22,119,255,0.35)] inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  Train
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1677FF]/20 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <Hand className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#A9B8CC] block">
                    Hands Technique
                  </span>
                  <span className="text-xs font-semibold text-[#FFFFFF] block truncate">
                    {heroDef.bodyweightDisciplines.handsFocus}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 min-w-0">
                <Footprints className="w-4 h-4 text-[#1677FF] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#A9B8CC] block">
                    Legs Technique
                  </span>
                  <span className="text-xs font-semibold text-[#FFFFFF] block truncate">
                    {heroDef.bodyweightDisciplines.legsFocus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lifetime Heroic Record — Clean Ledger Rows */}
        <section className="lg:col-span-6 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1677FF]/25">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00D9FF]" />
              LIFETIME HEROIC RECORD
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('museum')}
              className="text-xs font-semibold text-[#00D9FF] hover:text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              Inspect {authoritativePrCount} Personal Bests
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-2xl bg-[#0A1930]/85 border border-[#1677FF]/30 divide-y divide-[#1677FF]/15 text-xs">
            {[
              {
                label: 'Current Habit Streak',
                value: `${stats.currentStreak}d`,
                sub: `Best ${Math.max(stats.currentStreak, lifetime?.longestStreak ?? 0)}d`,
                accent: 'text-amber-300',
                icon: Flame,
              },
              {
                label: 'Verified Workouts',
                value: `${Math.max(stats.totalWorkoutsCompleted, lifetime?.totalWorkouts ?? 0)}`,
                sub: 'Sessions',
                accent: 'text-[#00D9FF]',
              },
              {
                label: 'Aether Vision Reps',
                value: `${Math.max(stats.totalVerifiedReps, lifetime?.totalVerifiedReps ?? 0)}`,
                sub: 'Tracked',
                accent: 'text-emerald-300',
              },
              {
                label: 'Bosses Defeated',
                value: `${Math.max(stats.totalBossesDefeated, lifetime?.totalBossesDefeated ?? 0)}`,
                sub: `${(lifetime?.totalBossDamage ?? 0).toLocaleString()} Boss DMG`,
                accent: 'text-rose-300',
              },
              {
                label: 'Skill Nodes & Rivalries',
                value: `${unlockedSkillNodesCount} Nodes`,
                sub: `${authoritativeRivalWins} Rival Wins · ${authoritativePrCount} PRs`,
                accent: 'text-[#FFFFFF]',
              },
            ].map(row => (
              <div
                key={row.label}
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4"
              >
                <span className="text-[#A9B8CC] font-medium">{row.label}</span>
                <div className="text-right font-mono tabular-nums">
                  <span className={`font-bold text-sm ${row.accent}`}>{row.value}</span>
                  <span className="text-[11px] text-[#A9B8CC]/75 ml-2">{row.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#A9B8CC]">
            Wellness Profile:{' '}
            <strong className="text-[#FFFFFF] capitalize">{user?.activityLevel || 'Moderate'}</strong>
            <span className="mx-1.5 text-[#A9B8CC]/40" aria-hidden="true">·</span>
            <strong className="text-[#FFFFFF] capitalize">{user?.dietaryPreference || 'Balanced'}</strong>
            <span className="mx-1.5 text-[#A9B8CC]/40" aria-hidden="true">·</span>
            <span className="uppercase">{user?.preferredUnits || 'Metric'} Units</span>
          </p>
        </section>
      </div>

      {/* 3. SIX INDEPENDENT HERO ATTRIBUTES — Sleek Mastery Matrix */}
      <section data-tutorial-id="character-attributes" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#1677FF]/25">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#FFFFFF] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00D9FF]" />
              SIX INDEPENDENT HERO ATTRIBUTES
            </h3>
            <p className="text-xs text-[#A9B8CC] mt-0.5">
              Affinity: <span className="text-[#00D9FF] font-mono">{heroDef.attributeFocus.map(k => k.toUpperCase()).join(' · ')}</span> — Built strictly from verified real-life effort.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('skill-tree')}
            className="px-3.5 py-2 rounded-xl bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/40 hover:border-[#00D9FF]/65 text-xs font-['Cinzel'] font-bold tracking-wider uppercase text-[#FFFFFF] transition-all whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
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
                className="space-y-2 pb-4 border-b border-[#1677FF]/15"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF]">
                      {attr.label}
                    </span>
                    {isAffinity && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#00D9FF]">
                        Hero Focus
                      </span>
                    )}
                  </div>
                  <span
                    className="font-mono text-xl font-black tabular-nums shrink-0"
                    style={{ color: isAffinity ? '#00D9FF' : '#FFFFFF' }}
                  >
                    {val}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-[#061225] border border-[#1677FF]/25 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: isAffinity
                        ? 'linear-gradient(90deg, #1677FF, #00D9FF)'
                        : attr.accentHex,
                    }}
                  />
                </div>

                <p className="text-xs text-[#A9B8CC] leading-snug">{attr.description}</p>
                <p className="text-[11px] text-[#00D9FF]/80">Source: {attr.realLifeSource}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
