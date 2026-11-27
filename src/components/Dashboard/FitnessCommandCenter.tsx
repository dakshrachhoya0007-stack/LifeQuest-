import React, { useMemo, useState } from 'react';
import {
  Activity,
  Camera,
  CheckCircle2,
  Circle,
  Droplets,
  Flame,
  Footprints,
  Plus,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { ExerciseType, FitnessSession } from '../../types/game';
import { getPeriodKeyForFrequency } from '../../services/unifiedBackendService';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  LQ_EASE,
  RpgModalWrapper,
} from '../Motion/RpgMotionPrimitives';

const DAILY_TARGET_MINUTES_BY_LEVEL: Record<string, number> = {
  sedentary: 15,
  light: 25,
  moderate: 35,
  very_active: 50,
};

const KCAL_PER_MIN_BY_TYPE: Record<ExerciseType, number> = {
  walking: 4.0,
  yoga: 3.2,
  plank: 4.2,
  bicep_curl: 4.8,
  shoulder_press: 5.2,
  squat: 6.5,
  pushup: 6.8,
  lunge: 6.5,
  knee_raise: 7.5,
  jumping_jack: 8.0,
  gym: 7.0,
  cycling: 8.2,
  running: 9.8,
};

const getLocalDateKey = (dateInput: Date | string, timeZone?: string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
};

const getShortDayLabel = (dateInput: Date, timeZone?: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      weekday: 'short',
    }).format(dateInput);
  } catch {
    return dateInput.toLocaleDateString('en-US', { weekday: 'short' });
  }
};

const estimateCaloriesFromSessions = (sessions: FitnessSession[]): number => {
  return Math.round(
    sessions.reduce((sum, s) => {
      const rate = KCAL_PER_MIN_BY_TYPE[s.exerciseType] || 6.0;
      const mins = Math.max(0, s.durationMinutes || 0);
      return sum + mins * rate;
    }, 0)
  );
};

export const FitnessCommandCenter: React.FC = () => {
  const {
    user,
    stats,
    fitnessSessions,
    logFitnessSession,
    habits,
    toggleHabitComplete,
    isHabitClaimedForCurrentPeriod,
    quests,
    claimQuest,
    dynamicDailyQuests,
    claimDynamicQuest,
    waterGlasses,
    addWaterGlass,
    setActiveTab,
    setProgressionSubTab,
  } = useGame();

  const [showLogModal, setShowLogModal] = useState(false);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('walking');
  const [exerciseName, setExerciseName] = useState('Morning Brisk Walk');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [distanceInput, setDistanceInput] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);
  const [claimingHabitId, setClaimingHabitId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const tz = user?.timezone;
  const isImperial = user?.preferredUnits === 'imperial';
  const dailyGoalMinutes =
    DAILY_TARGET_MINUTES_BY_LEVEL[user?.activityLevel || 'moderate'] || 35;

  const todayKey = useMemo(() => getPeriodKeyForFrequency('daily', tz), [tz]);

  const todaySessions = useMemo(
    () => fitnessSessions.filter(s => getLocalDateKey(s.timestamp, tz) === todayKey),
    [fitnessSessions, tz, todayKey]
  );

  const todayMinutes = useMemo(
    () => todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
    [todaySessions]
  );
  const todayReps = useMemo(
    () => todaySessions.reduce((sum, s) => sum + (s.repetitions || 0), 0),
    [todaySessions]
  );
  const todayDistanceKm = useMemo(
    () => todaySessions.reduce((sum, s) => sum + (s.distanceKm || 0), 0),
    [todaySessions]
  );
  const todayWalkRunDistanceKm = useMemo(
    () =>
      todaySessions
        .filter(s => s.exerciseType === 'walking' || s.exerciseType === 'running')
        .reduce((sum, s) => sum + (s.distanceKm || 0), 0),
    [todaySessions]
  );
  const todayEstimatedSteps =
    todayWalkRunDistanceKm > 0 ? Math.round(todayWalkRunDistanceKm * 1312) : null;
  const todayCaloriesBurned = estimateCaloriesFromSessions(todaySessions);
  const todayVerifiedCount = todaySessions.filter(s => s.verifiedWithAetherVision).length;

  const dailyGoalPercent = Math.min(
    100,
    Math.round((todayMinutes / Math.max(1, dailyGoalMinutes)) * 100)
  );

  const weeklyDays = useMemo(() => {
    const days: Array<{
      dateKey: string;
      label: string;
      minutes: number;
      sessions: FitnessSession[];
    }> = [];
    const now = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(now.getTime() - offset * 86400000);
      const key = getLocalDateKey(d, tz);
      const daySessions = fitnessSessions.filter(s => getLocalDateKey(s.timestamp, tz) === key);
      const mins = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      days.push({
        dateKey: key,
        label: offset === 0 ? 'Today' : getShortDayLabel(d, tz),
        minutes: mins,
        sessions: daySessions,
      });
    }
    return days;
  }, [fitnessSessions, tz]);

  const maxWeeklyMinutes = Math.max(dailyGoalMinutes, ...weeklyDays.map(d => d.minutes));
  const weeklyTotalMinutes = weeklyDays.reduce((sum, d) => sum + d.minutes, 0);
  const weeklyActiveDays = weeklyDays.filter(d => d.minutes > 0 || d.sessions.length > 0).length;

  const fitnessHabits = useMemo(
    () => habits.filter(h => h.category === 'fitness').slice(0, 4),
    [habits]
  );

  const fitnessQuests = useMemo(() => {
    const aiPhysical = dynamicDailyQuests
      .filter(q => q.category === 'physical')
      .map(q => ({
        id: q.id,
        kind: 'dynamic' as const,
        title: q.title,
        progress: q.progress,
        maxProgress: q.maxProgress,
        completed: q.completed,
        claimed: q.claimed,
        rewardLabel: `+${q.playerXpReward} XP`,
      }));
    const classicFitness = quests
      .filter(q => q.category === 'fitness')
      .map(q => ({
        id: q.id,
        kind: 'classic' as const,
        title: q.title,
        progress: q.progress,
        maxProgress: q.maxProgress,
        completed: q.completed,
        claimed: q.claimed,
        rewardLabel: `+${q.playerXpReward} XP`,
      }));
    return [...aiPhysical, ...classicFitness].slice(0, 3);
  }, [dynamicDailyQuests, quests]);

  const activityOptions: Array<{ type: ExerciseType; label: string }> = [
    { type: 'walking', label: 'Walking' },
    { type: 'running', label: 'Running' },
    { type: 'cycling', label: 'Cycling' },
    { type: 'gym', label: 'Gym Strength' },
    { type: 'yoga', label: 'Yoga & Mobility' },
    { type: 'squat', label: 'Squats' },
    { type: 'pushup', label: 'Push-ups' },
  ];

  const handleLogWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDist = distanceInput ? parseFloat(distanceInput) : undefined;
    const distanceKm =
      parsedDist && !Number.isNaN(parsedDist) && parsedDist > 0
        ? isImperial
          ? Number((parsedDist * 1.60934).toFixed(2))
          : parsedDist
        : undefined;

    logFitnessSession({
      exerciseType,
      exerciseName: exerciseName.trim() || 'Training Session',
      durationMinutes: Math.max(1, Math.min(300, durationMinutes)),
      distanceKm,
      verifiedWithAetherVision: false,
      notes: notes.trim() || 'Logged from Fitness Command Center.',
    });

    setShowLogModal(false);
    setDistanceInput('');
    setNotes('');
    setNotice({
      type: 'success',
      text: 'Workout recorded. Character Attributes and Fitness Progress updated.',
    });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleToggleFitnessHabit = async (habitId: string) => {
    if (claimingHabitId) return;
    setClaimingHabitId(habitId);
    const res = await toggleHabitComplete(habitId);
    setClaimingHabitId(null);
    if (!res.success && res.error) {
      setNotice({ type: 'error', text: res.error });
    } else if (res.success) {
      setNotice({ type: 'success', text: 'Fitness discipline habit logged for this period.' });
    }
    setTimeout(() => setNotice(null), 3200);
  };

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - dailyGoalPercent / 100);
  const selectedDay = weeklyDays[selectedDayIndex] || weeklyDays[weeklyDays.length - 1];

  return (
    <section
      aria-label="Fitness Command Center"
      className="lq-surface rounded-2xl overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-5 sm:px-7 py-5 border-b border-[#362B45] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#21152F]/45">
        <div>
          <span className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#49B88A] block">
            Physical Conditioning &amp; Real-Life Progression
          </span>
          <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#F2EDF7] mt-0.5">
            Fitness Command Center
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="lq-btn-secondary px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#49B88A]" />
            Log Workout
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aether-vision')}
            className="lq-btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#E8C777]" />
            Aether Vision Training
          </button>
        </div>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: LQ_EASE }}
            className={`mx-5 sm:mx-7 mt-4 p-3 rounded-xl border text-xs ${
              notice.type === 'error'
                ? 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#F2EDF7]'
                : 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#F2EDF7]'
            }`}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3-Zone Integrated Fitness Band */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#362B45]">
        {/* ZONE 1 (4 cols): Daily Activity Ring & Today's Measurements */}
        <div className="lg:col-span-4 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F2EDF7] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#49B88A]" />
              Today’s Activity
            </h3>
            <span className="text-[11px] font-mono text-[#A69AAF] tabular-nums">
              Target {dailyGoalMinutes} min
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 132 132">
                <defs>
                  <linearGradient id="fitnessRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7045A0" />
                    <stop offset="55%" stopColor="#49B88A" />
                    <stop offset="100%" stopColor="#E8C777" />
                  </linearGradient>
                </defs>
                <circle
                  cx="66"
                  cy="66"
                  r={ringRadius}
                  fill="none"
                  stroke="#100D18"
                  strokeWidth="9"
                />
                <circle
                  cx="66"
                  cy="66"
                  r={ringRadius}
                  fill="none"
                  stroke="url(#fitnessRingGrad)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <AnimatedCounter
                  value={todayMinutes}
                  className="font-mono font-black text-2xl text-[#F2EDF7] leading-none"
                />
                <span className="text-[10px] text-[#49B88A] uppercase tracking-wider mt-1">
                  of {dailyGoalMinutes} min
                </span>
                <span className="text-[10px] font-mono text-[#A69AAF] tabular-nums mt-0.5">
                  {dailyGoalPercent}%
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] text-[#766D82] block">Workouts Today</span>
                <span className="font-mono font-bold text-sm text-[#F2EDF7] tabular-nums">
                  {todaySessions.length} {todaySessions.length === 1 ? 'session' : 'sessions'}
                  {todayVerifiedCount > 0 && (
                    <span className="text-[11px] text-[#49B88A] font-normal ml-1.5">
                      ({todayVerifiedCount} Vision)
                    </span>
                  )}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#766D82] block">Reps &amp; Distance</span>
                <span className="font-mono font-semibold text-[#F2EDF7] tabular-nums">
                  {todayReps > 0 ? `${todayReps} reps` : '0 reps'}
                  {todayDistanceKm > 0 && (
                    <>
                      {' · '}
                      {isImperial
                        ? `${(todayDistanceKm / 1.60934).toFixed(1)} mi`
                        : `${todayDistanceKm.toFixed(1)} km`}
                    </>
                  )}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#766D82] block">Exercise Burn (Est.)</span>
                <span className="font-mono font-semibold text-[#E8C777] tabular-nums">
                  {todayCaloriesBurned > 0
                    ? `${todayCaloriesBurned.toLocaleString()} kcal`
                    : '0 kcal'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#362B45] space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#A69AAF] flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-[#49B88A]" />
                Steps
              </span>
              <span className="font-mono text-[#F2EDF7] tabular-nums text-right">
                {todayEstimatedSteps !== null
                  ? `~${todayEstimatedSteps.toLocaleString()} (from distance)`
                  : 'Log walk or run distance'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[#A69AAF] flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#9A72CC]" />
                Hydration Today
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-[#E8C777] tabular-nums">
                  {waterGlasses} / 8 glasses
                </span>
                <button
                  type="button"
                  onClick={addWaterGlass}
                  className="lq-btn-secondary px-2 py-0.5 rounded text-[11px] font-semibold text-[#E8C777] cursor-pointer"
                  title="Record 1 glass of water"
                >
                  +1
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE 2 (5 cols): 7-Day Consistency Chart & Habits */}
        <div className="lg:col-span-5 p-5 sm:p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F2EDF7] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D6A84B]" />
                  Weekly Activity Overview
                </h3>
                <p className="text-[11px] text-[#A69AAF] mt-0.5">
                  Rolling 7-day active minutes from logged workouts
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-[#49B88A] tabular-nums">
                {weeklyTotalMinutes}m · {weeklyActiveDays}/7d
              </span>
            </div>

            <div className="pt-2">
              <div className="h-32 flex items-end justify-between gap-2 sm:gap-3">
                {weeklyDays.map((day, idx) => {
                  const barHeightPct =
                    day.minutes > 0
                      ? Math.max(12, Math.round((day.minutes / maxWeeklyMinutes) * 100))
                      : 5;
                  const isSelected = idx === selectedDayIndex;
                  const hasActivity = day.minutes > 0 || day.sessions.length > 0;

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group focus:outline-none cursor-pointer"
                      title={`${day.label}: ${day.minutes} mins (${day.sessions.length} sessions)`}
                    >
                      <span
                        className={`text-[10px] font-mono tabular-nums transition-opacity ${
                          isSelected || day.minutes > 0
                            ? 'text-[#E8C777] opacity-100'
                            : 'text-[#766D82] opacity-70 group-hover:opacity-100'
                        }`}
                      >
                        {day.minutes > 0 ? `${day.minutes}m` : '0'}
                      </span>
                      <div className="w-full max-w-[34px] flex-1 bg-[#100D18] rounded-t-md flex items-end overflow-hidden border border-[#362B45]">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            hasActivity
                              ? isSelected
                                ? 'bg-gradient-to-t from-[#7045A0] via-[#49B88A] to-[#E8C777]'
                                : 'bg-gradient-to-t from-[#362B45] to-[#49B88A] group-hover:to-[#E8C777]'
                              : 'bg-[#171220]'
                          }`}
                          style={{ height: `${barHeightPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-medium whitespace-nowrap ${
                          isSelected ? 'text-[#F2EDF7] font-bold' : 'text-[#A69AAF]'
                        }`}
                      >
                        {day.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#362B45] flex items-center justify-between text-[11px] text-[#A69AAF] tabular-nums">
                <span>
                  <strong className="text-[#F2EDF7]">{selectedDay.label}</strong>
                  {' · '}
                  {selectedDay.sessions.length}{' '}
                  {selectedDay.sessions.length === 1 ? 'workout' : 'workouts'}
                </span>
                <span className="truncate max-w-[220px] text-[#49B88A]">
                  {selectedDay.sessions.length > 0
                    ? selectedDay.sessions.map(s => s.exerciseName).join(', ')
                    : 'No sessions recorded'}
                </span>
              </div>
            </div>
          </div>

          {/* Inline Consistency Metrics & Habits */}
          <div className="space-y-3 pt-3 border-t border-[#362B45]">
            <div className="grid grid-cols-3 divide-x divide-[#362B45] py-2 rounded-xl bg-[#100D18]/75 border border-[#362B45] text-center font-mono">
              <div>
                <span className="text-[10px] text-[#766D82] uppercase block">Streak</span>
                <span className="text-sm font-bold text-[#E8C777] tabular-nums">
                  <AnimatedCounter value={stats.currentStreak} />d
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#766D82] uppercase block">Sessions</span>
                <span className="text-sm font-bold text-[#F2EDF7] tabular-nums">
                  <AnimatedCounter value={stats.totalWorkoutsCompleted} />
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#766D82] uppercase block">Vision Reps</span>
                <span className="text-sm font-bold text-[#49B88A] tabular-nums">
                  <AnimatedCounter value={stats.totalVerifiedReps} />
                </span>
              </div>
            </div>

            {fitnessHabits.length > 0 && (
              <div data-tutorial-id="habits-panel" className="space-y-1.5 pt-1">
                <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#A69AAF] block">
                  Physical Consistency Habits
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {fitnessHabits.map(habit => {
                    const claimed = isHabitClaimedForCurrentPeriod(habit);
                    const busy = claimingHabitId === habit.id;
                    return (
                      <button
                        key={habit.id}
                        type="button"
                        disabled={claimed || busy}
                        onClick={() => handleToggleFitnessHabit(habit.id)}
                        className={`px-2.5 py-2 rounded-lg border text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                          claimed
                            ? 'bg-[#100D18]/60 border-[#49B88A]/40 text-[#766D82] cursor-default'
                            : 'bg-[#21152F]/70 hover:bg-[#21152F] border-[#362B45] hover:border-[#7045A0] text-[#F2EDF7] cursor-pointer'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          {claimed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#49B88A] shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-[#7045A0] shrink-0" />
                          )}
                          <span className={`truncate ${claimed ? 'line-through' : ''}`}>
                            {habit.name}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-[#E8C777] shrink-0 tabular-nums">
                          {habit.streak}d
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ZONE 3 (3 cols): Fitness Goals & Physical Quests */}
        <div className="lg:col-span-3 p-5 sm:p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <h3 className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F2EDF7] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#49B88A]" />
              Fitness Goals
            </h3>
            <p className="text-[11px] text-[#A69AAF]">
              Pace:{' '}
              <span className="text-[#49B88A] capitalize font-medium">
                {(user?.activityLevel || 'moderate').replace('_', ' ')}
              </span>
              {' · '}
              {dailyGoalMinutes} min/day
            </p>
            {user?.personalGoals && user.personalGoals.length > 0 ? (
              <ul className="space-y-1.5 pt-1">
                {user.personalGoals.slice(0, 4).map(goal => (
                  <li
                    key={goal}
                    className="text-xs text-[#A69AAF] py-1 border-b border-[#362B45]/75 last:border-b-0"
                  >
                    {goal}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#766D82] leading-relaxed">
                No personal fitness goals saved yet. Set your focus in Settings.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-[#362B45]">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-['Cinzel'] font-bold text-xs tracking-wider uppercase text-[#F2EDF7] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#D6A84B]" />
                Physical Quests
              </h4>
              <button
                type="button"
                onClick={() => {
                  setProgressionSubTab('quests');
                  setActiveTab('progression');
                }}
                className="text-[11px] text-[#E8C777] hover:text-[#F2EDF7] font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                All Quests →
              </button>
            </div>

            {fitnessQuests.length === 0 ? (
              <div className="py-4 text-xs text-[#A69AAF] space-y-2">
                <p>No active physical quests yet today.</p>
                <button
                  type="button"
                  onClick={() => {
                    setProgressionSubTab('quests');
                    setActiveTab('progression');
                  }}
                  className="text-[#E8C777] hover:underline font-medium cursor-pointer"
                >
                  Open Quest Board →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {fitnessQuests.map(q => {
                  const pct = Math.min(
                    100,
                    Math.round((q.progress / Math.max(1, q.maxProgress)) * 100)
                  );
                  return (
                    <div key={q.id} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#F2EDF7] line-clamp-1">
                          {q.title}
                        </span>
                        <span className="font-mono text-[11px] text-[#E8C777] shrink-0 tabular-nums">
                          {q.progress}/{q.maxProgress}
                        </span>
                      </div>
                      <AnimatedProgressBar
                        percentage={pct}
                        className="w-full h-1.5 rounded-full bg-[#100D18] overflow-hidden border border-[#362B45]"
                        barClassName="bg-gradient-to-r from-[#D6A84B] to-[#E8C777]"
                        shimmer={false}
                      />
                      {q.completed && !q.claimed ? (
                        <button
                          type="button"
                          onClick={() =>
                            q.kind === 'dynamic' ? claimDynamicQuest(q.id) : claimQuest(q.id)
                          }
                          className="lq-btn-gold w-full py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Claim {q.rewardLabel}
                        </button>
                      ) : (
                        <p className="text-[10px] text-[#766D82] font-mono">
                          {q.claimed ? 'Completed & claimed' : `Reward: ${q.rewardLabel}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Workout Logger Modal */}
      <RpgModalWrapper
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        panelClassName="w-full max-w-md"
      >
        <div
          className="lq-surface-elevated rounded-2xl p-6 space-y-4"
          role="dialog"
          aria-modal="true"
          aria-label="Log Workout Session"
        >
          <div className="flex items-center justify-between border-b border-[#362B45] pb-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">
              Record Workout Session
            </h3>
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="p-1.5 rounded-lg text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
              aria-label="Close workout modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleLogWorkout} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#A69AAF] mb-1.5">
                Activity Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activityOptions.map(opt => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setExerciseType(opt.type);
                      setExerciseName(`${opt.label} Session`);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors cursor-pointer ${
                      exerciseType === opt.type
                        ? 'bg-[#7045A0]/30 border-[#7045A0] text-[#F2EDF7]'
                        : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A69AAF] mb-1">
                Session Name
              </label>
              <input
                type="text"
                value={exerciseName}
                onChange={e => setExerciseName(e.target.value)}
                className="lq-input w-full px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#A69AAF] mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="lq-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A69AAF] mb-1">
                  {isImperial ? 'Distance (mi optional)' : 'Distance (km optional)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={isImperial ? 'e.g. 2.0' : 'e.g. 3.2'}
                  value={distanceInput}
                  onChange={e => setDistanceInput(e.target.value)}
                  className="lq-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A69AAF] mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did the session feel?"
                className="lq-input w-full px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="lq-btn-secondary px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="lq-btn-gold px-5 py-2 rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Workout
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>
    </section>
  );
};
