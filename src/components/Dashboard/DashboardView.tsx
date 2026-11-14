import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { resolveAssetUrl } from '../../assets/images';
import { getResetCountdowns } from '../../services/unifiedBackendService';
import { RECLAIM_HONOR_OBJECTIVES } from '../../data/campaignData';
import { AetheriaKingdomHero } from './AetheriaKingdomHero';
import { ChampionArsenalShowcase } from './ChampionArsenalShowcase';
import {
  Activity,
  Droplets,
  Flame,
  CheckCircle2,
  Circle,
  Swords,
  Sparkles,
  ArrowRight,
  Plus,
  Compass,
  Moon,
  Utensils,
  BookOpen,
  Clock,
  Lock,
  Camera,
  Shield,
  Award,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    setShowHeroSelectModal,
    rpgAttributes,
    reclaimHonorQuest,
    claimReclaimHonorReward,
    campaignProgress,
    habits,
    quests,
    weapons,
    equippedWeapon,
    equippedGear,
    activeBuffs,
    kingdoms,
    waterGlasses,
    addWaterGlass,
    toggleHabitComplete,
    isHabitClaimedForCurrentPeriod,
    claimQuest,
    setActiveTab,
  } = useGame();

  const [countdowns, setCountdowns] = useState(() => getResetCountdowns());
  const [habitNotice, setHabitNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [honorNotice, setHonorNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [claimingHabitId, setClaimingHabitId] = useState<string | null>(null);
  const [claimingHonor, setClaimingHonor] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdowns(getResetCountdowns());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentKingdom = kingdoms.find(k => k.id === stats.currentKingdomId) || kingdoms[0];
  const unlockedKingdomsCount = kingdoms.filter(k => k.unlocked).length;
  const clearedKingdomsCount = kingdoms.filter(k => k.cleared).length;
  const currentBoss = currentKingdom.boss;

  // Citadel Courtyard restoration scales naturally with claimed chapters & cleared kingdoms
  const restorationRatio = Math.min(
    1,
    0.1 +
      campaignProgress.claimedChapterIds.length * 0.14 +
      clearedKingdomsCount * 0.08
  );

  const completedHabitsCount = habits.filter(h => isHabitClaimedForCurrentPeriod(h)).length;
  const totalHabitsCount = habits.length;
  const habitPercentage = totalHabitsCount > 0 ? Math.round((completedHabitsCount / totalHabitsCount) * 100) : 0;

  const honorDoneCount = Object.values(reclaimHonorQuest.objectives).filter(Boolean).length;
  const honorTotalCount = RECLAIM_HONOR_OBJECTIVES.length;

  const handleClaimHabit = async (habitId: string) => {
    if (claimingHabitId) return;
    setClaimingHabitId(habitId);
    const res = await toggleHabitComplete(habitId);
    setClaimingHabitId(null);
    if (!res.success && res.error) {
      setHabitNotice({ type: 'error', text: res.error });
    } else if (res.success) {
      setHabitNotice({ type: 'success', text: 'Habit reward claimed for this period!' });
    }
    setTimeout(() => setHabitNotice(null), 3200);
  };

  const handleClaimHonorQuest = async () => {
    if (claimingHonor) return;
    setClaimingHonor(true);
    setHonorNotice(null);
    const res = await claimReclaimHonorReward();
    setClaimingHonor(false);
    if (res.success) {
      setHonorNotice({
        type: 'success',
        text: 'Honor Reclaimed! +120 Player XP, +75 Forge XP & +100 Gold granted.',
      });
    } else if (res.error) {
      setHonorNotice({ type: 'error', text: res.error });
    }
  };

  const getHabitIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets': return Droplets;
      case 'Moon': return Moon;
      case 'Activity': return Activity;
      case 'Utensils': return Utensils;
      case 'BookOpen': return BookOpen;
      default: return Sparkles;
    }
  };

  const getFrequencyLabel = (freq: string) => {
    if (freq === 'weekly') return 'Weekly · Mon–Sun';
    if (freq === 'once') return 'One-Time';
    return 'Daily';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Unified 3D Medieval Castle Courtyard & Living Hero */}
      <AetheriaKingdomHero
        user={user}
        stats={stats}
        selectedHeroId={selectedHeroId}
        restorationRatio={restorationRatio}
        currentKingdom={currentKingdom}
        unlockedKingdomsCount={unlockedKingdomsCount}
        activeBuffs={activeBuffs}
        onNavigate={setActiveTab}
        onOpenHeroSelect={() => setShowHeroSelectModal(true)}
      />

      {/* First Introductory Story Quest: RECLAIM YOUR HONOR */}
      {!reclaimHonorQuest.claimed && (
        <section
          aria-label="Reclaim Your Honor Introductory Quest"
          className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/40 p-5 sm:p-6 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C5A15A]/15 pb-3.5">
            <div>
              <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A] block">
                Starter Story Trial · Awakening Chapter
              </span>
              <h2 className="font-['Cinzel'] font-black text-lg text-[#D9D2C5] flex items-center gap-2 mt-0.5">
                <Shield className="w-4 h-4 text-[#C5A15A]" />
                RECLAIM YOUR HONOR
              </h2>
              <p className="text-xs text-[#D9D2C5]/70 mt-0.5">
                Complete each genuine realm action below to awaken your citadel oath and unlock your starter reward.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs font-bold text-[#C5A15A] tabular-nums">
                {honorDoneCount} / {honorTotalCount} Complete
              </span>
              {reclaimHonorQuest.completed && (
                <button
                  type="button"
                  disabled={claimingHonor}
                  onClick={handleClaimHonorQuest}
                  className="px-4 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-black text-xs tracking-wider shadow-lg transition-colors"
                >
                  {claimingHonor ? 'CLAIMING...' : 'CLAIM STARTER REWARD'}
                </button>
              )}
            </div>
          </div>

          {honorNotice && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                honorNotice.type === 'error'
                  ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              }`}
            >
              {honorNotice.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {RECLAIM_HONOR_OBJECTIVES.map(obj => {
              const done = reclaimHonorQuest.objectives[obj.id];
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setActiveTab(obj.targetTab)}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    done
                      ? 'bg-[#171b24] border-emerald-600/50 text-[#D9D2C5]'
                      : 'bg-[#161124] border-[#C5A15A]/18 hover:border-[#C5A15A]/55 text-[#D9D2C5]'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#C5A15A]/60 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block ${done ? 'line-through text-[#D9D2C5]/60' : 'text-[#D9D2C5]'}`}>
                      {obj.label}
                    </span>
                    <span className="text-[10px] text-[#D9D2C5]/60 block mt-0.5 leading-snug">
                      {obj.hint}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Starter Reward Summary Box */}
            <div className="p-3 rounded-xl bg-[#181229] border border-[#7046A5]/45 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1">
                <Award className="w-3 h-3" /> Completion Reward
              </span>
              <div className="text-xs font-mono text-[#D9D2C5] mt-1 space-y-0.5">
                <div>+120 Player XP · +75 Forge XP</div>
                <div className="text-[#C5A15A]">+100 Gold · +2 DIS · +1 RES</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Champion Sanctuary: Six Attributes & 3D Equipped Armament */}
      <ChampionArsenalShowcase
        user={user}
        stats={stats}
        selectedHeroId={selectedHeroId}
        rpgAttributes={rpgAttributes}
        weapons={weapons}
        equippedWeapon={equippedWeapon}
        equippedGear={equippedGear}
        activeBuffs={activeBuffs}
        onNavigate={setActiveTab}
        onOpenHeroSelect={() => setShowHeroSelectModal(true)}
      />

      {/* 3. Lower Realm Activity Grid: Discipline Habits, Wellness Dispatch & Boss Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Daily Habits & Wellness Trackers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily & Weekly Discipline Habits */}
          <div
            data-tutorial-id="habits-panel"
            className="bg-[#100D19] border border-[#C5A15A]/22 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-['Cinzel'] font-bold text-base text-[#D9D2C5] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#C5A15A]" />
                  DAILY &amp; WEEKLY DISCIPLINE HABITS
                </h3>
                <p className="text-xs text-[#D9D2C5]/65">
                  {completedHabitsCount} of {totalHabitsCount} claimed for current period · {stats.currentStreak} day streak
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-mono font-bold text-[#C5A15A] tabular-nums">{habitPercentage}%</span>
                </div>
                <div className="w-16 bg-[#251638] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#7046A5] to-[#C5A15A] h-full transition-all duration-300"
                    style={{ width: `${habitPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Live Habit Reset Countdown Timer */}
            <div className="mb-4 p-2.5 rounded-xl bg-[#161124] border border-[#C5A15A]/18 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-[#D9D2C5]/80 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#C5A15A]" />
                Habit Reward Reset Timers ({user?.timezone || 'Local'})
              </span>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-[#D9D2C5]">
                  Daily: <strong className="text-[#C5A15A]">{countdowns.dailyLabel}</strong>
                </span>
                <span className="text-[#D9D2C5]/30">|</span>
                <span className="text-[#D9D2C5]">
                  Weekly (Mon): <strong className="text-[#C5A15A]">{countdowns.weeklyLabel}</strong>
                </span>
              </div>
            </div>

            {habitNotice && (
              <div
                className={`mb-3 p-2.5 rounded-xl border text-xs text-center ${
                  habitNotice.type === 'error'
                    ? 'bg-rose-950/70 border-rose-700/70 text-rose-200'
                    : 'bg-emerald-950/70 border-emerald-700/70 text-emerald-200'
                }`}
              >
                {habitNotice.text}
              </div>
            )}

            {/* Habit Check-off List (Period-Locked Anti-Exploit) */}
            <div className="space-y-2.5">
              {habits.map(h => {
                const IconComponent = getHabitIcon(h.iconName);
                const isClaimed = isHabitClaimedForCurrentPeriod(h);
                const isBusy = claimingHabitId === h.id;
                return (
                  <div
                    key={h.id}
                    onClick={() => handleClaimHabit(h.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isClaimed
                        ? 'bg-[#161124]/60 border-[#7046A5]/35 text-[#D9D2C5]/60 cursor-not-allowed'
                        : 'bg-[#161124] border-[#C5A15A]/15 hover:border-[#C5A15A]/50 text-[#D9D2C5] cursor-pointer'
                    } ${isBusy ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isClaimed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#D9D2C5]/40 hover:text-[#C5A15A] shrink-0" />
                      )}
                      <div className="p-1.5 rounded-lg bg-[#251638]/75 text-[#C5A15A] shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-semibold truncate ${isClaimed ? 'line-through text-[#D9D2C5]/50' : 'text-[#D9D2C5]'}`}>
                            {h.name}
                          </p>
                          <span className="text-[10px] font-mono uppercase text-[#D9D2C5]/55">
                            {getFrequencyLabel(h.frequency)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#D9D2C5]/65 flex items-center gap-2 mt-0.5 tabular-nums">
                          <span>+{h.playerXpReward} XP</span>
                          <span>·</span>
                          <span className="text-[#C5A15A]">+{h.forgeXpReward} Forge</span>
                          <span>·</span>
                          <span className="text-[#C5A15A]">+{h.goldReward ?? 15} Gold</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isClaimed && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          Claimed
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#C5A15A] flex items-center gap-1 tabular-nums">
                        <Flame className="w-3.5 h-3.5 text-[#C5A15A]" />
                        {h.streak}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions Bar */}
            <div className="mt-4 pt-4 border-t border-[#C5A15A]/15 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('aether-vision')}
                className="flex items-center gap-2 text-xs font-bold text-[#100D19] bg-[#C5A15A] hover:bg-[#d6b36d] px-3.5 py-2 rounded-lg transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                Launch Aether Vision Training
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fitness')}
                className="text-xs text-[#C5A15A] hover:text-[#e0be79] flex items-center gap-1 font-medium transition-colors"
              >
                Manual Workout Log <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hydration & Nutrition Quick Dispatch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hydration Widget */}
            <div className="bg-[#100D19] border border-[#C5A15A]/22 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-['Cinzel'] text-[#D9D2C5] flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-400" />
                    HYDRATION ELIXIR
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-300 tabular-nums">
                    {waterGlasses} / 8 Glasses
                  </span>
                </div>
                <p className="text-xs text-[#D9D2C5]/65 mb-3">
                  Stay hydrated to prime Nature’s Blessing (+10% quest XP).
                </p>
                <div className="flex items-center gap-1.5 mb-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2.5 rounded-full transition-all ${
                        i < waterGlasses ? 'bg-sky-400' : 'bg-[#251638]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={addWaterGlass}
                className="w-full py-2 rounded-xl bg-[#161124] hover:bg-[#251638] border border-sky-400/35 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Drink 1 Glass (+Water)
              </button>
            </div>

            {/* Nutrition & Meal Analysis Dispatch */}
            <div className="bg-[#100D19] border border-[#C5A15A]/22 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-['Cinzel'] text-[#D9D2C5] flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-[#C5A15A]" />
                    PROVISIONS &amp; NUTRITION
                  </span>
                  <span className="text-[11px] font-mono text-[#C5A15A] capitalize">
                    {user?.dietaryPreference || 'Balanced'}
                  </span>
                </div>
                <p className="text-xs text-[#D9D2C5]/65 mb-4 leading-relaxed">
                  Analyze meals with Aether Vision or log macros to sustain stamina and Vitality progression.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('nutrition')}
                  className="flex-1 py-2 rounded-xl bg-[#251638] hover:bg-[#7046A5]/45 border border-[#C5A15A]/30 text-[#D9D2C5] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Utensils className="w-3.5 h-3.5 text-[#C5A15A]" />
                  Meal Log
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('aether-vision')}
                  className="px-3 py-2 rounded-xl bg-[#161124] hover:bg-[#251638] border border-[#7046A5]/40 text-[#C5A15A] text-xs font-semibold transition-colors"
                >
                  Scan Meal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Kingdom Boss Encounter & Active Quests */}
        <div className="space-y-6">
          {/* Current Boss Showcase */}
          <div className="bg-[#100D19] border border-[#C5A15A]/22 rounded-2xl overflow-hidden shadow-xl">
            <div className="relative h-44 overflow-hidden">
              <img
                src={resolveAssetUrl(currentBoss.image)}
                alt={currentBoss.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#100D19] via-[#100D19]/40 to-transparent" />
              <div className="absolute top-3 left-3 bg-[#100D19]/85 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-[#C5A15A] border border-[#C5A15A]/35">
                {currentBoss.difficulty} Boss
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <h4 className="font-['Cinzel'] font-black text-lg text-[#D9D2C5]">{currentBoss.name}</h4>
                <p className="text-xs text-[#C5A15A] font-medium">{currentBoss.title}</p>
              </div>

              {/* Boss Health Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#D9D2C5]/70 mb-1 font-mono">
                  <span>Boss Health</span>
                  <span className="font-bold text-rose-300 tabular-nums">
                    {currentBoss.health} / {currentBoss.maxHealth} HP
                  </span>
                </div>
                <div className="w-full bg-[#251638] h-2.5 rounded-full overflow-hidden border border-rose-950/60">
                  <div
                    className="bg-gradient-to-r from-rose-700 to-[#C5A15A] h-full transition-all duration-300"
                    style={{ width: `${(currentBoss.health / currentBoss.maxHealth) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[#D9D2C5]/65 leading-relaxed">
                {currentBoss.specialAbilityDesc}
              </p>

              <button
                type="button"
                onClick={() => setActiveTab('boss-battles')}
                className="w-full py-2.5 font-bold font-['Cinzel'] tracking-wider text-xs rounded-xl bg-gradient-to-r from-[#251638] to-[#7046A5]/80 hover:from-[#7046A5]/70 hover:to-[#7046A5] text-[#D9D2C5] border border-[#C5A15A]/35 shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Swords className="w-4 h-4 text-[#C5A15A]" />
                ENTER BATTLE ARENA
              </button>
            </div>
          </div>

          {/* Quick Quest Board Preview */}
          <div className="bg-[#100D19] border border-[#C5A15A]/22 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-['Cinzel'] font-bold text-sm text-[#D9D2C5] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#C5A15A]" />
                ACTIVE QUESTS
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('quests')}
                className="text-[11px] text-[#C5A15A] hover:text-[#e0be79] font-medium transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {quests.slice(0, 3).map(q => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-[#161124] border border-[#C5A15A]/15 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-[#D9D2C5]">{q.title}</p>
                    <span className="text-[10px] uppercase font-bold text-[#C5A15A] shrink-0">
                      {q.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#D9D2C5]/65">
                    <span className="text-[#C5A15A] font-medium">+{q.playerXpReward} XP · +{q.forgeXpReward} Forge</span>
                    <span className="font-mono tabular-nums">{q.progress} / {q.maxProgress}</span>
                  </div>

                  <div className="w-full bg-[#251638] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#7046A5] to-[#C5A15A] h-full"
                      style={{ width: `${Math.min(100, (q.progress / q.maxProgress) * 100)}%` }}
                    />
                  </div>

                  {q.completed && !q.claimed && (
                    <button
                      type="button"
                      onClick={() => claimQuest(q.id)}
                      className="w-full py-1 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                    >
                      Claim Reward
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
