import React from 'react';
import { useGame } from '../../context/GameContext';
import { HeroCommandStage } from './HeroCommandStage';
import { FitnessCommandCenter } from './FitnessCommandCenter';
import { Character2DAvatar } from '../Character/Character2DAvatar';
import { getHeroById } from '../../data/heroesData';
import {
  IDENTITY_RARITY_STYLE,
  PLAYER_TITLES_CATALOG,
  RARE_BADGES_CATALOG,
} from '../../data/polish2Data';
import { Award, Flame, Landmark, Star, Target, User } from 'lucide-react';

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
    prestigeState,
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
  const prestigeTier = prestigeState?.prestigeTier ?? identityState?.prestigeTier ?? 0;
  const featuredBadges = (identityState?.featuredBadgeIds || [])
    .map(id => RARE_BADGES_CATALOG.find(b => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .slice(0, 4);

  const xpPercent = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );
  const reputationScore = identityState?.reputationScore ?? 0;
  const reputationTier = identityState?.reputationTier || 'Aspiring Traveler';
  const bestStreak = Math.max(stats.currentStreak, identityState?.lifetimeStats?.longestStreak ?? 0);

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const unlockedBadges = (identityState?.unlockedBadges || [])
    .map(ub => RARE_BADGES_CATALOG.find(b => b.id === ub.badgeId))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

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
        prestigeTier={prestigeTier}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* MAIN: Character Identity Summary Card + Fitness Overview & Weekly Progress */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Character Identity Card */}
        <section
          aria-label="Character Identity"
          className="xl:col-span-4 rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 sm:p-6 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#C5A15A]/15">
            <h2 className="font-['Cinzel'] font-bold text-sm tracking-wider uppercase text-[#C5A15A] flex items-center gap-2">
              <User className="w-4 h-4" />
              Character Identity
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('character')}
              className="text-xs font-semibold text-[#D9D2C5]/75 hover:text-[#C5A15A] transition-colors whitespace-nowrap"
            >
              Customize →
            </button>
          </div>

          <div className="flex items-center gap-3.5 min-w-0">
            <Character2DAvatar
              heroId={selectedHeroId}
              characterClass={user?.characterClass}
              appearance={cosmeticsState?.appearance}
              size="md"
              prestigeTier={prestigeTier}
            />
            <div className="min-w-0 space-y-0.5">
              <h3 className="font-['Cinzel'] font-bold text-base text-white truncate">
                {user?.characterName || user?.username || 'Champion'}
              </h3>
              <p className="text-xs text-[#C5A15A] font-semibold truncate">
                {equippedIdentityTitle ? equippedIdentityTitle.name : heroDef.title}
                {equippedSecondaryTitle ? ` · ${equippedSecondaryTitle.name}` : ''}
              </p>
              <p className="text-[11px] text-[#D9D2C5]/65 tabular-nums">
                Level {stats.level} · {user?.characterClass || 'Warrior'}
                {prestigeTier > 0 ? ` · Prestige ${prestigeTier}` : ''}
              </p>
            </div>
          </div>

          {/* Level & XP Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-[#D9D2C5]/75">Experience</span>
              <span className="text-[#E8CF96] font-bold">
                {stats.playerXP.toLocaleString()} / {stats.playerXPNextLevel.toLocaleString()} XP ({xpPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1C142B] border border-[#C5A15A]/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7046A5] to-[#C5A15A] transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Reputation Summary */}
          <div className="p-3.5 rounded-xl bg-[#0b0816] border border-purple-950/80 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-semibold flex items-center gap-1">
                <Star className="w-3 h-3" />
                Realm Reputation
              </span>
              <span className="text-xs font-bold text-white block truncate mt-0.5">
                {reputationTier}
              </span>
            </div>
            <span className="font-mono font-black text-lg text-[#E8CF96] tabular-nums shrink-0">
              {reputationScore.toLocaleString()}
            </span>
          </div>

          {/* Featured Badges (Max 4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-['Cinzel'] uppercase tracking-wider text-[#D9D2C5]/75">
                Featured Badges
              </span>
              <span className="text-[11px] text-[#D9D2C5]/50 tabular-nums">
                {featuredBadges.length}/4
              </span>
            </div>
            {featuredBadges.length === 0 ? (
              <button
                type="button"
                onClick={() => setActiveTab('character')}
                className="w-full p-3 rounded-xl bg-[#0b0816] border border-purple-950/60 hover:border-[#C5A15A]/40 text-left text-xs text-[#D9D2C5]/65 transition-colors"
              >
                {unlockedBadges.length > 0
                  ? `You have ${unlockedBadges.length} unlocked badge${unlockedBadges.length > 1 ? 's' : ''}. Feature up to 4 on your profile.`
                  : 'Complete verified workouts and milestones to unlock Rare Badges.'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {featuredBadges.map(badge => {
                  const rStyle = IDENTITY_RARITY_STYLE[badge.rarity];
                  return (
                    <div
                      key={badge.id}
                      className="p-2.5 rounded-xl bg-[#0b0816] border border-purple-950/80 min-w-0"
                    >
                      <span className={`text-[9px] font-bold uppercase block ${rStyle.text}`}>
                        {badge.rarity}
                      </span>
                      <span className="text-xs font-semibold text-white truncate block mt-0.5">
                        {badge.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
        {/* 1. Active Fitness Goal */}
        <button
          type="button"
          onClick={() => setActiveTab('fitness')}
          className="p-4 rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 hover:border-[#C5A15A]/45 text-left transition-colors space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#C5A15A] flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Active Fitness Goal
          </span>
          <p className="text-sm font-bold text-white capitalize truncate">{activeGoalLabel}</p>
          <p className="text-xs text-[#D9D2C5]/65 tabular-nums">
            {fitnessSessions.length} logged session{fitnessSessions.length === 1 ? '' : 's'} · {stats.totalVerifiedReps.toLocaleString()} AI reps
          </p>
        </button>

        {/* 2. Current Streak */}
        <button
          type="button"
          onClick={() => setActiveTab('quests')}
          className="p-4 rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 hover:border-[#C5A15A]/45 text-left transition-colors space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            Current Streak
          </span>
          <p className="text-sm font-bold text-white tabular-nums">
            {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'} Active
          </p>
          <p className="text-xs text-[#D9D2C5]/65 tabular-nums">
            Longest Streak: {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
          </p>
        </button>

        {/* 3. Recent Achievements & Badges */}
        <button
          type="button"
          onClick={() => setActiveTab('achievements')}
          className="p-4 rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 hover:border-[#C5A15A]/45 text-left transition-colors space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            Recent Honors
          </span>
          <p className="text-sm font-bold text-white truncate">
            {unlockedBadges[0]?.name || unlockedAchievements[0]?.name || 'No honors unlocked yet'}
          </p>
          <p className="text-xs text-[#D9D2C5]/65 tabular-nums">
            {unlockedAchievements.length} achievements · {unlockedBadges.length} rare badges
          </p>
        </button>

        {/* 4. Personal Record Highlight */}
        <button
          type="button"
          onClick={() => setActiveTab(topPersonalRecord ? 'museum' : 'fitness')}
          className="p-4 rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 hover:border-[#C5A15A]/45 text-left transition-colors space-y-1.5"
        >
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" />
            Personal Record
          </span>
          <p className="text-sm font-bold text-white truncate">
            {topPersonalRecord ? topPersonalRecord.title : 'Record Your First Milestone'}
          </p>
          <p className="text-xs text-[#D9D2C5]/65 truncate tabular-nums">
            {topPersonalRecord
              ? `${topPersonalRecord.displayValue} · Records Museum`
              : 'Log a verified workout to enshrine a personal best'}
          </p>
        </button>
      </section>
    </div>
  );
};
