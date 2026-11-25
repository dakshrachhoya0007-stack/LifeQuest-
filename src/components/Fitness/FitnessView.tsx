import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { ExerciseType } from '../../types/game';
import {
  Activity,
  Camera,
  Plus,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  Zap,
  Dumbbell,
  Footprints,
  Bike,
  Wind,
  Target,
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
    sedentary: 'Start light with 10-20 minute mobility breaks or brisk walks to build steady momentum.',
    light: 'Aim for 20-30 minute sessions a few days a week across your favorite activities.',
    moderate: 'Balanced 30-45 minute strength and cardio sessions keep streaks resilient.',
    very_active: 'Mix high-output training days with intentional recovery & mobility sessions.',
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Fitness Banner */}
      <div
        data-tutorial-id="fitness-tracker"
        className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#1677FF]/35 p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)] backdrop-blur-md"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#00D9FF] bg-[#061225]/80 border border-[#00D9FF]/35 px-2.5 py-0.5 rounded">
                Mountain of Strength
              </span>
              <span className="text-xs text-[#A9B8CC] font-semibold">Physical Conditioning</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              FITNESS TRACKER & LOGS
            </h1>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Record daily workouts, walks, gym sets, and calisthenics. Camera-verified sessions on Aether Vision grant maximum Player XP, bodyweight combat strength, and combat buffs!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('aether-vision')}
              className="px-4 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-[#0A1930] hover:bg-[#16325C] border border-[#00D9FF]/45 hover:border-[#00D9FF] text-white shadow-[0_0_16px_rgba(0,217,255,0.18)] flex items-center gap-2 transition-all"
            >
              <Camera className="w-4 h-4 text-[#00D9FF]" />
              Aether Vision AI
            </button>
            <button
              onClick={() => setShowLogModal(true)}
              className="px-4 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_18px_rgba(22,119,255,0.35)] flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Log Workout
            </button>
          </div>
        </div>
      </div>

      {/* Personalized Fitness Focus (from Onboarding & Settings) */}
      <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl p-5 shadow-[0_12px_32px_rgba(2,8,20,0.5)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-['Cinzel'] font-bold text-[#00D9FF] uppercase tracking-wider">
              Training Focus: {(user?.activityLevel || 'moderate').replace('_', ' ')}
            </span>
            <span className="text-[#1677FF]/60">·</span>
            <span className="text-[#A9B8CC]">
              Units: <strong className="text-white uppercase">{user?.preferredUnits || 'metric'}</strong>
            </span>
            {(user?.height || user?.weight) && (
              <>
                <span className="text-[#1677FF]/60">·</span>
                <span className="text-[#A9B8CC]">
                  Profile: {[user.height, user.weight].filter(Boolean).join(' / ')}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-[#A9B8CC]">
            {activityPaceNote[user?.activityLevel || 'moderate'] || activityPaceNote.moderate}
          </p>
          {user?.personalGoals && user.personalGoals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {user.personalGoals.map(goal => (
                <span
                  key={goal}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/35 text-[#A9B8CC]"
                >
                  {goal}
                </span>
              ))}
            </div>
          )}
        </div>

        {user?.preferredActivities && user.preferredActivities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-[#A9B8CC] mr-1">Quick Log:</span>
            {user.preferredActivities.slice(0, 4).map(act => (
              <button
                key={act}
                type="button"
                onClick={() => openQuickLogForActivity(act)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/40 hover:border-[#00D9FF]/60 text-xs font-medium text-white transition-colors whitespace-nowrap"
              >
                + {act}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 hover:border-[#00D9FF]/45 transition-colors rounded-2xl p-5 shadow-[0_12px_32px_rgba(2,8,20,0.45)]">
          <span className="text-xs font-semibold text-[#A9B8CC] uppercase tracking-wider block mb-1">
            Total Sessions
          </span>
          <span className="font-mono text-3xl font-black text-white tabular-nums">
            {fitnessSessions.length}
          </span>
          <p className="text-xs text-[#00D9FF] mt-1">Across all fitness modalities</p>
        </div>

        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 hover:border-[#00D9FF]/45 transition-colors rounded-2xl p-5 shadow-[0_12px_32px_rgba(2,8,20,0.45)]">
          <span className="text-xs font-semibold text-[#A9B8CC] uppercase tracking-wider block mb-1">
            Total Active Time
          </span>
          <span className="font-mono text-3xl font-black text-[#00D9FF] tabular-nums">
            {totalMinutes} <span className="text-lg font-normal text-[#A9B8CC]">mins</span>
          </span>
          <p className="text-xs text-[#A9B8CC] mt-1">Endurance built for the Mountain</p>
        </div>

        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 hover:border-[#00D9FF]/45 transition-colors rounded-2xl p-5 shadow-[0_12px_32px_rgba(2,8,20,0.45)]">
          <span className="text-xs font-semibold text-[#00D9FF] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> AI Verified Sessions
          </span>
          <span className="font-mono text-3xl font-black text-white tabular-nums">
            {totalVerifiedCount}
          </span>
          <p className="text-xs text-[#A9B8CC] mt-1">Earned Warrior’s Momentum Buff</p>
        </div>
      </div>

      {/* Session History Feed */}
      <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl p-6 shadow-[0_12px_32px_rgba(2,8,20,0.5)]">
        <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#00D9FF]" />
          ACTIVITY LOG HISTORY
        </h3>

        {fitnessSessions.length === 0 ? (
          <div className="text-center py-12 text-[#A9B8CC] text-xs">
            No workouts logged yet. Start an Aether Vision session or log your first routine!
          </div>
        ) : (
          <div className="space-y-3">
            {fitnessSessions.map(session => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/25 hover:border-[#00D9FF]/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${
                      session.verifiedWithAetherVision
                        ? 'bg-[#1677FF]/20 border-[#00D9FF]/55 text-[#00D9FF]'
                        : 'bg-[#061225] border-[#1677FF]/40 text-[#1677FF]'
                    }`}
                  >
                    {session.verifiedWithAetherVision ? (
                      <Zap className="w-4 h-4 text-[#00D9FF]" />
                    ) : (
                      <Dumbbell className="w-4 h-4 text-[#00D9FF]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{session.exerciseName}</h4>
                      {session.verifiedWithAetherVision ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#1677FF]/20 text-[#00D9FF] border border-[#00D9FF]/45">
                          AI Verified
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded bg-[#061225] text-[#A9B8CC] border border-[#1677FF]/25">
                          Manually Logged
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#A9B8CC] mt-0.5">
                      {session.durationMinutes} mins {session.repetitions ? `· ${session.repetitions} reps` : ''} · {new Date(session.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-[#00D9FF] font-semibold">+{session.playerXpEarned} Player XP</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Workout Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061225]/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#102440] border border-[#1677FF]/45 rounded-2xl p-6 shadow-[0_20px_50px_rgba(2,8,20,0.8)]">
            <h3 className="text-lg font-bold font-['Cinzel'] text-white mb-4">
              RECORD FITNESS SESSION
            </h3>

            <form onSubmit={handleManualLog} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A9B8CC] mb-1">Activity Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {activityOptions.map(opt => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setExerciseType(opt.type);
                        setExerciseName(`${opt.label} Session`);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        exerciseType === opt.type
                          ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white border-[#00D9FF]/70 shadow-[0_0_12px_rgba(22,119,255,0.35)]'
                          : 'bg-[#0A1930] border-[#1677FF]/30 text-[#A9B8CC] hover:text-white hover:border-[#00D9FF]/45'
                      }`}
                    >
                      <opt.Icon className={`w-3.5 h-3.5 shrink-0 ${exerciseType === opt.type ? 'text-white' : 'text-[#00D9FF]'}`} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A9B8CC] mb-1">Session Title</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={e => setExerciseName(e.target.value)}
                  className="w-full bg-[#0A1930] border border-[#1677FF]/35 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A9B8CC] mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-[#0A1930] border border-[#1677FF]/35 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00D9FF] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A9B8CC] mb-1">
                    {isImperial ? 'Distance (mi optional)' : 'Distance (km optional)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={isImperial ? 'e.g. 2.2' : 'e.g. 3.5'}
                    value={distanceInput}
                    onChange={e => setDistanceInput(e.target.value)}
                    className="w-full bg-[#0A1930] border border-[#1677FF]/35 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00D9FF] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs rounded-xl bg-[#0A1930] border border-[#1677FF]/35 text-[#A9B8CC] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold font-['Cinzel'] bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white rounded-xl shadow-[0_0_15px_rgba(22,119,255,0.35)] transition-all"
                >
                  Log Workout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
