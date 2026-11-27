import React from 'react';
import { useGame } from '../../context/GameContext';
import { HeroCommandStage } from './HeroCommandStage';
import { FitnessCommandCenter } from './FitnessCommandCenter';
import { PLAYER_TITLES_CATALOG } from '../../data/polish2Data';
import { Award, Flame, Landmark, ArrowUpRight } from 'lucide-react';
import { RpgScrollReveal } from '../Motion/RpgMotionPrimitives';

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
    unreadNotificationsCount,
    achievements,
    museumData,
    fitnessSessions,
  } = useGame();

  const equippedIdentityTitle = identityState?.equippedTitleId
    ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedTitleId) || null
    : null;
  const equippedSecondaryTitle = identityState?.equippedSecondaryTitleId
    ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedSecondaryTitleId) || null
    : null;

  const bestStreak = Math.max(stats.currentStreak, identityState?.lifetimeStats?.longestStreak ?? 0);
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const topPersonalRecord = museumData?.personalBests?.[0] || null;
  const activeGoalLabel =
    user?.personalGoals && user.personalGoals.length > 0
      ? user.personalGoals[0]
      : `${(user?.activityLevel || 'moderate').replace('_', ' ')} training consistency`;

  return (
    <div className="space-y-8 pb-14 max-w-[1360px] mx-auto">
      {/* 1. CHARACTER COMMAND STAGE: Visual Hero Centerpiece, Progression & Attributes */}
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

      {/* 2. FITNESS COMMAND CENTER: Integrated Activity, 7-Day Consistency & Physical Quests */}
      <RpgScrollReveal>
        <FitnessCommandCenter />
      </RpgScrollReveal>

      {/* 3. MILESTONES & PERSONAL RECORDS BAND: Single Unified Strip (No Repetitive Box Clutter) */}
      <RpgScrollReveal delay={0.05}>
        <section
          aria-label="Milestones and Personal Records"
          className="lq-surface rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#362B45]"
        >
          {/* Active Goal & Volume */}
          <button
            type="button"
            onClick={() => setActiveTab('fitness')}
            className="p-5 text-left hover:bg-[#21152F]/60 transition-colors flex flex-col justify-between gap-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#49B88A] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Active Focus &amp; Streak
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#766D82] group-hover:text-[#F2EDF7] transition-colors" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F2EDF7] capitalize truncate">{activeGoalLabel}</p>
              <p className="text-xs text-[#A69AAF] tabular-nums mt-0.5">
                {stats.currentStreak}d active streak · best {bestStreak}d · {fitnessSessions.length} sessions
              </p>
            </div>
          </button>

          {/* Personal Record Spotlight */}
          <button
            type="button"
            onClick={() => setActiveTab(topPersonalRecord ? 'museum' : 'fitness')}
            className="p-5 text-left hover:bg-[#21152F]/60 transition-colors flex flex-col justify-between gap-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#E8C777] flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#D6A84B]" />
                Personal Record Milestone
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#766D82] group-hover:text-[#E8C777] transition-colors" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F2EDF7] truncate">
                {topPersonalRecord ? topPersonalRecord.title : 'Record Your First Milestone'}
              </p>
              <p className="text-xs text-[#A69AAF] truncate tabular-nums mt-0.5">
                {topPersonalRecord
                  ? `${topPersonalRecord.displayValue} · Records Museum`
                  : 'Log a workout to enshrine a personal best'}
              </p>
            </div>
          </button>

          {/* Heroic Honors */}
          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className="p-5 text-left hover:bg-[#21152F]/60 transition-colors flex flex-col justify-between gap-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#D6A84B] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Honors &amp; Achievements
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#766D82] group-hover:text-[#E8C777] transition-colors" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F2EDF7] truncate">
                {unlockedAchievements[0]?.name || 'No honors unlocked yet'}
              </p>
              <p className="text-xs text-[#A69AAF] tabular-nums mt-0.5">
                {unlockedAchievements.length} of {achievements.length} achievements unlocked
              </p>
            </div>
          </button>
        </section>
      </RpgScrollReveal>
    </div>
  );
};
