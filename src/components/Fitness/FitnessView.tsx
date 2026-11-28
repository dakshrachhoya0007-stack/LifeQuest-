import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { ExerciseType } from '../../types/game';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  RpgModalWrapper,
  RpgScrollReveal,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';
import {
  Activity,
  Camera,
  Plus,
  Flame,
  Zap,
  Dumbbell,
  Footprints,
  Bike,
  Wind,
  Target,
  X,
} from 'lucide-react';

export const FitnessView: React.FC = () => {
  const { fitnessSessions, logFitnessSession, setActiveTab, user } = useGame();

  const [showLogModal, setShowLogModal] = useState(false);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('walking');
  const [exerciseName, setExerciseName] = useState('Brisk Morning Walk');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [distanceInput, setDistanceInput] = useState('');
  const [notes, setNotes] = useState('');

  const isImperial = user?.preferredUnits === 'imperial';

  useEffect(() => {
    if (!showLogModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLogModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showLogModal]);

  const activityOptions = [
    { type: 'walking' as ExerciseType, label: 'Walking', Icon: Footprints },
    { type: 'running' as ExerciseType, label: 'Running', Icon: Zap },
    { type: 'cycling' as ExerciseType, label: 'Cycling', Icon: Bike },
    { type: 'gym' as ExerciseType, label: 'Gym Workout', Icon: Dumbbell },
    { type: 'yoga' as ExerciseType, label: 'Yoga & Mobility', Icon: Wind },
    { type: 'squat' as ExerciseType, label: 'Squat Training', Icon: Target },
    { type: 'pushup' as ExerciseType, label: 'Push-up Training', Icon: Flame },
  ];

  const openQuickLogForActivity = (actLabel: string) => {
    const lower = actLabel.toLowerCase();
    const matched =
      lower.includes('walk')
        ? activityOptions[0]
        : lower.includes('run')
        ? activityOptions[1]
        : lower.includes('cycl')
        ? activityOptions[2]
        : lower.includes('gym')
        ? activityOptions[3]
        : lower.includes('yoga')
        ? activityOptions[4]
        : activityOptions[5];
    setExerciseType(matched.type);
    setExerciseName(`${actLabel} Session`);
    setShowLogModal(true);
  };

  const handleManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDist = distanceInput ? parseFloat(distanceInput) : undefined;
    const distanceKm =
      parsedDist && !Number.isNaN(parsedDist)
        ? isImperial
          ? Number((parsedDist * 1.60934).toFixed(2))
          : parsedDist
        : undefined;

    logFitnessSession({
      exerciseType,
      exerciseName,
      durationMinutes,
      distanceKm,
      verifiedWithAetherVision: false,
      notes: notes || 'Logged routine workout in Aetheria.',
    });
    setShowLogModal(false);
    setDistanceInput('');
    setNotes('');
  };

  const totalMinutes = fitnessSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalVerifiedCount = fitnessSessions.filter(s => s.verifiedWithAetherVision).length;

  const activityPaceNote: Record<string, string> = {
    sedentary: 'Start light with 10–20 minute mobility breaks or brisk walks to build steady momentum.',
    light: 'Aim for 20–30 minute sessions a few days a week across your favorite activities.',
    moderate: 'Balanced 30–45 minute strength and cardio sessions keep streaks resilient.',
    very_active: 'Mix high-output training days with intentional recovery & mobility sessions.',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Fitness Banner */}
      <FeatureBanner themeId="fitness" data-tutorial-id="fitness-tracker">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A8C7]">
              <span className="font-['Cinzel'] font-semibold text-[#10B981] uppercase tracking-widest">
                Mountain of Strength
              </span>
              <span aria-hidden="true">·</span>
              <span>Physical Conditioning & Training Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Cinzel'] text-[#F2F7FF]">
              Fitness Tracker &amp; Logs
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl leading-relaxed">
              Record daily workouts, walks, gym sets, and calisthenics. Camera-verified sessions in
              Aether Vision earn maximum Player XP and combat buffs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('aether-vision')}
              className="lq-btn lq-btn-secondary px-4 py-2.5 text-xs whitespace-nowrap"
            >
              <Camera className="w-4 h-4 text-[#38D9F5]" />
              <span>Aether Vision AI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="lq-btn lq-btn-primary px-4 py-2.5 text-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Log Workout</span>
            </button>
          </div>
        </div>
      </FeatureBanner>

      {/* Personalized Fitness Focus */}
      <RpgScrollReveal>
        <div className="lq-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A8C7]">
              <span className="font-['Cinzel'] font-semibold text-[#10B981] uppercase tracking-wider">
                Training Focus: {(user?.activityLevel || 'moderate').replace('_', ' ')}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Units:{' '}
                <strong className="text-[#F2F7FF] uppercase">
                  {user?.preferredUnits || 'metric'}
                </strong>
              </span>
              {(user?.height || user?.weight) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Profile: {[user.height, user.weight].filter(Boolean).join(' / ')}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-[#94A8C7] leading-relaxed">
              {activityPaceNote[user?.activityLevel || 'moderate'] || activityPaceNote.moderate}
            </p>
            {user?.personalGoals && user.personalGoals.length > 0 && (
              <p className="text-[11px] text-[#38D9F5]">
                Active Goals: {user.personalGoals.join(' · ')}
              </p>
            )}
          </div>

          {user?.preferredActivities && user.preferredActivities.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] text-[#94A8C7] mr-1">Quick Log:</span>
              {user.preferredActivities.slice(0, 4).map(act => (
                <button
                  key={act}
                  type="button"
                  onClick={() => openQuickLogForActivity(act)}
                  className="lq-btn lq-btn-secondary px-3 py-1.5 text-xs whitespace-nowrap"
                >
                  + {act}
                </button>
              ))}
            </div>
          )}
        </div>
      </RpgScrollReveal>

      {/* KPI Stats Strip */}
      <RpgStaggerGrid className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RpgStaggerItem>
          <div className="lq-card p-5 h-full">
            <span className="text-xs font-semibold text-[#94A8C7] uppercase tracking-wider block mb-1.5">
              Total Sessions
            </span>
            <p className="font-mono text-3xl font-bold text-[#F2F7FF] tabular-nums">
              <AnimatedCounter value={fitnessSessions.length} />
            </p>
            <p className="text-xs text-[#10B981] mt-1.5">Across all training modalities</p>
          </div>
        </RpgStaggerItem>

        <RpgStaggerItem>
          <div className="lq-card p-5 h-full">
            <span className="text-xs font-semibold text-[#94A8C7] uppercase tracking-wider block mb-1.5">
              Total Active Time
            </span>
            <p className="font-mono text-3xl font-bold text-[#38D9F5] tabular-nums">
              <AnimatedCounter value={totalMinutes} />{' '}
              <span className="text-base font-normal text-[#94A8C7]">mins</span>
            </p>
            <p className="text-xs text-[#94A8C7] mt-1.5">Endurance forged in training</p>
          </div>
        </RpgStaggerItem>

        <RpgStaggerItem>
          <div className="lq-card-gold p-5 h-full">
            <span className="text-xs font-semibold text-[#10B981] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>AI Verified Sessions</span>
            </span>
            <p className="font-mono text-3xl font-bold text-[#F2F7FF] tabular-nums">
              <AnimatedCounter value={totalVerifiedCount} />
            </p>
            <p className="text-xs text-[#94A8C7] mt-1.5">Earned Warrior’s Momentum Buff</p>
          </div>
        </RpgStaggerItem>
      </RpgStaggerGrid>

      {/* Session History Feed */}
      <RpgScrollReveal>
        <div className="lq-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#10B981]" />
              <span>Activity Log History</span>
            </h2>
            <span className="text-xs font-mono text-[#94A8C7] tabular-nums">
              {fitnessSessions.length} recorded
            </span>
          </div>

          {fitnessSessions.length === 0 ? (
            <div className="text-center py-12 text-[#94A8C7] text-xs">
              No workouts logged yet. Start an Aether Vision session or log your first routine!
            </div>
          ) : (
            <div className="space-y-2.5">
              {fitnessSessions.map(session => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#061225] border border-[#1E3A63] hover:border-[#10B981]/45 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        session.verifiedWithAetherVision
                          ? 'bg-[#10B981]/12 border-[#10B981]/45 text-[#10B981]'
                          : 'bg-[#0A1930] border-[#1E3A63] text-[#38D9F5]'
                      }`}
                    >
                      {session.verifiedWithAetherVision ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Dumbbell className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#F2F7FF] truncate">
                          {session.exerciseName}
                        </h3>
                        <span aria-hidden="true" className="text-[#647A9E]">·</span>
                        <span
                          className={`text-[11px] font-medium ${
                            session.verifiedWithAetherVision
                              ? 'text-[#10B981]'
                              : 'text-[#94A8C7]'
                          }`}
                        >
                          {session.verifiedWithAetherVision ? 'AI Verified' : 'Manually Logged'}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A8C7] mt-0.5 tabular-nums">
                        {session.durationMinutes} mins
                        {session.repetitions ? ` · ${session.repetitions} reps` : ''}
                        {' · '}
                        {new Date(session.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                    <span className="text-[#10B981] font-semibold">
                      +{session.playerXpEarned} Player XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </RpgScrollReveal>

      {/* Manual Workout Log Modal */}
      <RpgModalWrapper
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        panelClassName="w-full max-w-md"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-workout-modal-title"
          className="lq-card-gold p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              id="log-workout-modal-title"
              className="text-lg font-bold font-['Cinzel'] text-[#F2F7FF]"
            >
              Record Fitness Session
            </h3>
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="p-1.5 rounded-lg text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-[#102440] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleManualLog} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1.5">
                Activity Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activityOptions.map(opt => {
                  const selected = exerciseType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setExerciseType(opt.type);
                        setExerciseName(`${opt.label} Session`);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        selected
                          ? 'bg-[#1677FF] border-[#00D9FF]/70 text-[#F2F7FF] font-semibold shadow-[0_6px_16px_rgba(22,119,255,0.35)]'
                          : 'bg-[#061225] border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF] hover:border-[#1677FF]/55'
                      }`}
                    >
                      <opt.Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          selected ? 'text-[#38D9F5]' : 'text-[#10B981]'
                        }`}
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1.5">
                Session Title
              </label>
              <input
                type="text"
                value={exerciseName}
                onChange={e => setExerciseName(e.target.value)}
                className="lq-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#94A8C7] mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="lq-input font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A8C7] mb-1.5">
                  {isImperial ? 'Distance (mi optional)' : 'Distance (km optional)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={isImperial ? 'e.g. 2.2' : 'e.g. 3.5'}
                  value={distanceInput}
                  onChange={e => setDistanceInput(e.target.value)}
                  className="lq-input font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="How did the session feel?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="lq-input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="lq-btn lq-btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="lq-btn lq-btn-gold px-5 py-2 text-xs">
                Save Workout
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>
    </div>
  );
};
