import React from 'react';
import { useGame } from '../../context/GameContext';
import { HeroCommandStage } from './HeroCommandStage';
import { FitnessCommandCenter } from './FitnessCommandCenter';
import { Character2DAvatar } from '../Character/Character2DAvatar';
import { getHeroById } from '../../data/heroesData';
import { PLAYER_TITLES_CATALOG } from '../../data/polish2Data';
import { Award, Flame, Landmark, Shield, Target, User } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    rpgAttributes,
    activeBuffs,
    setActiveTab,
    identityState,
    cosmeticsState,
    unreadNotificationsCount,
    achievements,
    museumData,
    fitnessSessions,
  } = useGame();

  const heroDef = getHeroById(selectedHeroId);
  const equippedIdentityTitle = identityState?.equippedTitleId
    ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedTitleId) || null
    : null;
  const equippedSecondaryTitle = identityState?.equippedSecondaryTitleId
    ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedSecondaryTitleId) || null
    : null;

  const xpPercent = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );
  const bestStreak = Math.max(stats.currentStreak, identityState?.lifetimeStats?.longestStreak ?? 0);
  const combatPower =
    rpgAttributes.strength +
    rpgAttributes.discipline +
    rpgAttributes.intelligence +
    rpgAttributes.vitality +
    rpgAttributes.agility +
    rpgAttributes.resilience;

  const unlockedAchievements = achievements.filter(a => a.unlocked);

  const topPersonalRecord = museumData?.personalBests?.[0] || null;
  const activeGoalLabel =
    user?.personalGoals && user.personalGoals.length > 0
      ? user.personalGoals[0]
      : `${(user?.activityLevel || 'moderate').replace('_', ' ')} training consistency`;

  return (
    <div className="space-y-8 pb-14 max-w-[1400px] mx-auto">
      {/* TOP: Welcome Header, Level & Equipped Title, Notification Trigger & Hero Showcase */}
      <HeroCommandStage
        user={user}
        stats={stats}
        selectedHeroId={selectedHeroId}
        heroLocked={heroLocked}
        rpgAttributes={rpgAttributes}
        activeBuffs={activeBuffs}
        onNavigate={setActiveTab}
        onOpenHeroSelect={() => setShowHeroSelectModal(true)}
        equippedIdentityTitle={equippedIdentityTitle}
        equippedSecondaryTitle={equippedSecondaryTitle}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* MAIN: Character Identity Summary Card + Fitness Overview & Weekly Progress */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Hero Profile Card */}
        <section
          aria-label="Hero Profile Summary"
          className="xl:col-span-4 rounded-2xl bg-[#0A1930]/95 backdrop-blur-md border border-[#1677FF]/30 p-5 sm:p-6 shadow-[0_12px_32px_rgba(4,12,28,0.65)] space-y-5"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1677FF]/25">
            <h2 className="font-['Cinzel'] font-bold text-sm tracking-wider uppercase text-[#00D9FF] flex items-center gap-2">
              <User className="w-4 h-4" />
              Hero Profile
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('character')}
              className="text-xs font-semibold text-[#94A8C7] hover:text-[#00D9FF] transition-colors whitespace-nowrap"
            >
              Hero Overview →
            </button>
          </div>

          <div className="flex items-center gap-3.5 min-w-0">
            <Character2DAvatar
              heroId={selectedHeroId}
              characterClass={user?.characterClass}
              appearance={cosmeticsState?.appearance}
              size="md"
            />
            <div className="min-w-0 space-y-0.5">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] truncate">
                {user?.characterName || user?.username || 'Champion'}
              </h3>
              <p className="text-xs text-[#00D9FF] font-semibold truncate">
                {equippedIdentityTitle ? equippedIdentityTitle.name : heroDef.title}
                {equippedSecondaryTitle ? ` · ${equippedSecondaryTitle.name}` : ''}
              </p>
              <p className="text-[11px] text-[#94A8C7] tabular-nums">
                Level {stats.level} · {user?.characterClass || 'Warrior'} · {stats.aetherRank}
              </p>
            </div>
          </div>

          {/* Level & XP Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-[#94A8C7]">Experience</span>
              <span className="text-[#FFD978] font-bold">
                {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP ({xpPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#061225] border border-[#1677FF]/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#FFD978] transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Combat Power & Discipline Summary */}
          <div className="pt-3 border-t border-[#1677FF]/20 grid grid-cols-2 divide-x divide-[#1677FF]/20">
            <div className="pr-3">
              <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Combat Power
              </span>
              <span className="font-mono font-black text-xl text-[#F2F7FF] tabular-nums block mt-0.5">
                {combatPower.toLocaleString()}
              </span>
            </div>
            <div className="pl-3">
              <span className="text-[10px] uppercase tracking-wider text-[#FFD978] font-semibold block">
                Verified Reps
              </span>
              <span className="font-mono font-black text-xl text-[#FFD978] tabular-nums block mt-0.5">
                {stats.totalVerifiedReps.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Training Callout */}
          <button
            type="button"
            onClick={() => setActiveTab('character')}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#102440] hover:bg-[#1677FF]/20 border border-[#1677FF]/35 hover:border-[#00D9FF]/60 text-left text-xs text-[#C7D7EE] transition-colors flex items-center justify-between"
          >
            <span>Inspect full attributes &amp; trophy vault</span>
            <span className="text-[#00D9FF] font-semibold">Open →</span>
          </button>
        </section>

        {/* Fitness Overview & Weekly Progress */}
        <div className="xl:col-span-8 min-w-0">
          <FitnessCommandCenter />
        </div>
      </div>

      {/* SECONDARY: Compact 4-Card Summary Strip (Real Data Only) */}
      <section
        aria-label="Progression Highlights"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* 1. Active Fitness Goal (Emerald) */}
        <button
          type="button"
          onClick={() => setActiveTab('fitness')}
          className="p-4 rounded-2xl bg-[#0A1930]/95 backdrop-blur-md border border-[#35D69A]/30 hover:border-[#35D69A]/65 hover:shadow-[0_0_20px_rgba(53,214,154,0.16)] text-left transition-all space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#35D69A] flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Active Fitness Goal
          </span>
          <p className="text-sm font-bold text-[#F2F7FF] capitalize truncate">{activeGoalLabel}</p>
          <p className="text-xs text-[#94A8C7] tabular-nums">
            {fitnessSessions.length} logged session{fitnessSessions.length === 1 ? '' : 's'} · {stats.totalVerifiedReps.toLocaleString()} AI reps
          </p>
        </button>

        {/* 2. Current Streak (Warm Amber) */}
        <button
          type="button"
          onClick={() => setActiveTab('quests')}
          className="p-4 rounded-2xl bg-[#0A1930]/95 backdrop-blur-md border border-[#FFAA45]/30 hover:border-[#FFAA45]/65 hover:shadow-[0_0_20px_rgba(255,170,69,0.16)] text-left transition-all space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#FFAA45] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            Current Streak
          </span>
          <p className="text-sm font-bold text-[#F2F7FF] tabular-nums">
            {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'} Active
          </p>
          <p className="text-xs text-[#94A8C7] tabular-nums">
            Longest Streak: {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
          </p>
        </button>

        {/* 3. Recent Achievements (Gold) */}
        <button
          type="button"
          onClick={() => setActiveTab('achievements')}
          className="p-4 rounded-2xl bg-[#0A1930]/95 backdrop-blur-md border border-[#E7B94F]/30 hover:border-[#FFD978]/65 hover:shadow-[0_0_20px_rgba(231,185,79,0.18)] text-left transition-all space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#FFD978] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#E7B94F]" />
            Recent Honors
          </span>
          <p className="text-sm font-bold text-[#F2F7FF] truncate">
            {unlockedAchievements[0]?.name || 'No honors unlocked yet'}
          </p>
          <p className="text-xs text-[#94A8C7] tabular-nums">
            {unlockedAchievements.length} achievements unlocked
          </p>
        </button>

        {/* 4. Personal Record Highlight (Electric Cyan) */}
        <button
          type="button"
          onClick={() => setActiveTab(topPersonalRecord ? 'museum' : 'fitness')}
          className="p-4 rounded-2xl bg-[#0A1930]/95 backdrop-blur-md border border-[#00D9FF]/30 hover:border-[#00D9FF]/65 hover:shadow-[0_0_20px_rgba(0,217,255,0.18)] text-left transition-all space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#00D9FF] flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" />
            Personal Record
          </span>
          <p className="text-sm font-bold text-[#F2F7FF] truncate">
            {topPersonalRecord ? topPersonalRecord.title : 'Record Your First Milestone'}
          </p>
          <p className="text-xs text-[#94A8C7] truncate tabular-nums">
            {topPersonalRecord
              ? `${topPersonalRecord.displayValue} · Records Museum`
              : 'Log a verified workout to enshrine a personal best'}
          </p>
        </button>
      </section>
    </div>
  );
};
