import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  AdaptiveDifficultyTier,
  DynamicDailyQuest,
  DynamicQuestCategory,
  QuestType,
} from '../../types/game';
import {
  getPeriodKeyForFrequency,
  getResetCountdowns,
  getUserTimezone,
} from '../../services/unifiedBackendService';
import {
  Scroll,
  CheckCircle2,
  Clock,
  Sparkles,
  History,
  Wand2,
  Dumbbell,
  BookOpen,
  Shield,
  TrendingUp,
  Users,
  Crown,
  Coins,
  AlertCircle,
  SlidersHorizontal,
  PenLine,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const CATEGORY_META: Record<
  DynamicQuestCategory,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  physical: { label: 'Physical', color: 'text-[#FB7185]', icon: Dumbbell },
  intellectual: { label: 'Intellectual', color: 'text-[#38BDF8]', icon: BookOpen },
  discipline: { label: 'Discipline', color: 'text-[#FBBF24]', icon: Shield },
  personal_growth: { label: 'Personal Growth', color: 'text-[#34D399]', icon: TrendingUp },
  social: { label: 'Social', color: 'text-[#8B5CF6]', icon: Users },
};

const TIER_LABELS: Record<AdaptiveDifficultyTier, { label: string; note: string }> = {
  gentle_comeback: {
    label: 'Gentle Comeback',
    note: 'Short, low-friction wins tailored to rebuild momentum safely.',
  },
  supportive: {
    label: 'Supportive Pace',
    note: 'Achievable objectives matched to today’s energy and current habits.',
  },
  balanced: {
    label: 'Balanced Progression',
    note: 'Steady multi-pillar growth across body, mind, discipline, and fellowship.',
  },
  escalating: {
    label: 'Escalating Mastery',
    note: 'Ambitious stretch objectives unlocked by your strong recent streak.',
  },
};

export const QuestsView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    user,
    quests,
    claimQuest,
    transactions,
    dynamicDailyQuests,
    dynamicQuestHistory,
    aiMentorMemory,
    isGeneratingDailyQuests,
    questGenerationError,
    mentorGreeting,
    generateTodaysAiQuests,
    submitDynamicQuestEvidence,
    claimDynamicQuest,
    setActiveTab,
  } = useGame();

  const [selectedType, setSelectedType] = useState<QuestType | 'all'>('all');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [availableMinutes, setAvailableMinutes] = useState(45);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [focusNote, setFocusNote] = useState('');

  const [activeEvidenceQuestId, setActiveEvidenceQuestId] = useState<string | null>(null);
  const [evidenceInput, setEvidenceInput] = useState('');
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [countdowns, setCountdowns] = useState(() => getResetCountdowns());
  useEffect(() => {
    const id = setInterval(() => setCountdowns(getResetCountdowns()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayPeriodKey = getPeriodKeyForFrequency('daily', user?.timezone || getUserTimezone());
  const todaysAiQuests = useMemo(
    () => dynamicDailyQuests.filter(q => q.periodKey === todayPeriodKey),
    [dynamicDailyQuests, todayPeriodKey]
  );

  const specialChallenge = todaysAiQuests.find(q => q.isSpecialChallenge) || null;
  const standardAiQuests = todaysAiQuests.filter(q => !q.isSpecialChallenge);

  const filteredQuests = quests.filter(q =>
    selectedType === 'all' ? true : q.type === selectedType
  );

  const handleGenerate = async () => {
    setActionMessage(null);
    const res = await generateTodaysAiQuests({
      availableMinutes,
      energyLevel,
      focusNote: focusNote.trim() || undefined,
    });
    if (!res.success && res.error) {
      setActionMessage(res.error);
    } else {
      setShowCheckIn(false);
    }
  };

  const handleSubmitReflection = async (questId: string) => {
    setEvidenceError(null);
    const res = await submitDynamicQuestEvidence(questId, evidenceInput);
    if (!res.success) {
      setEvidenceError(res.error || 'Please describe what you accomplished.');
      return;
    }
    setActiveEvidenceQuestId(null);
    setEvidenceInput('');
  };

  const handleClaimAiQuest = async (questId: string) => {
    setActionMessage(null);
    const res = await claimDynamicQuest(questId);
    if (!res.success && res.error) {
      setActionMessage(res.error);
    }
  };

  const isReflectionQuest = (q: DynamicDailyQuest) =>
    q.evidenceType === 'study_or_skill_reflection' ||
    q.evidenceType === 'personal_reflection';

  const getAutoTrackRoute = (q: DynamicDailyQuest): { label: string; tab: string } | null => {
    switch (q.evidenceType) {
      case 'workout_minutes':
      case 'workout_sessions':
        return { label: 'Log in Workouts', tab: 'fitness' };
      case 'vision_reps':
        return { label: 'Track in Aether Vision', tab: 'aether-vision' };
      case 'habit_completions':
        return { label: 'Complete in Dashboard', tab: 'dashboard' };
      case 'meal_logs':
      case 'water_glasses':
        return { label: 'Log in Nutrition', tab: 'nutrition' };
      case 'friend_interaction':
        return { label: 'Open Social Chat / Friends', tab: 'social' };
      default:
        return null;
    }
  };

  const renderDynamicQuestCard = (q: DynamicDailyQuest, spotlight = false) => {
    const catMeta = CATEGORY_META[q.category] || CATEGORY_META.discipline;
    const CatIcon = catMeta.icon;
    const pct = Math.min(100, Math.round((q.progress / q.maxProgress) * 100));
    const needsReflection = isReflectionQuest(q);
    const autoRoute = getAutoTrackRoute(q);
    const isEditingEvidence = activeEvidenceQuestId === q.id;

    return (
      <div
        key={q.id}
        className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
          spotlight
            ? 'bg-gradient-to-br from-[#1B1B2B] via-[#141420] to-[#090910] border-[#D6A84B]/60 shadow-[0_12px_32px_rgba(9,9,16,0.65)] ring-1 ring-[#D6A84B]/25'
            : q.claimed
            ? 'bg-[#0E0E17]/75 border-[#34D399]/25 opacity-85'
            : q.completed
            ? 'bg-[#141420] border-[#34D399]/55 ring-1 ring-[#34D399]/30 shadow-lg'
            : 'bg-[#141420]/90 backdrop-blur-md border-[#8B5CF6]/30 hover:border-[#D6A84B]/45 shadow-[0_12px_32px_rgba(9,9,16,0.65)]'
        }`}
      >
        <div>
          {/* Metadata Line (Typography + dot separators, no pill spam) */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold">
              <CatIcon className={`w-3.5 h-3.5 ${catMeta.color}`} />
              <span className={catMeta.color}>{catMeta.label}</span>
              <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
              <span className={`uppercase tracking-wider font-mono ${spotlight ? 'text-[#D6A84B]' : 'text-[#8B5CF6]'}`}>
                {spotlight ? 'Special Daily Challenge' : q.difficulty}
              </span>
            </div>
            <span className="text-[#A1A1B8] font-mono flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3 text-[#A1A1B8]/70" />
              ~{q.estimatedMinutes}m
            </span>
          </div>

          <h3 className="font-['Cinzel'] font-bold text-base sm:text-lg text-white leading-snug">
            {q.title}
          </h3>

          <p className="text-xs text-[#A1A1B8] leading-relaxed mt-1.5">
            {q.description}
          </p>

          <p className="text-[11px] text-[#38BDF8]/90 mt-2.5 leading-snug">
            <span className="font-semibold text-[#38BDF8]">Why this quest: </span>
            {q.personalizationReason}
          </p>
        </div>

        <div className="space-y-3 pt-4 mt-4 border-t border-[#8B5CF6]/20">
          {/* Rewards */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
            <span className="text-[#FBBF24] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />+{q.playerXpReward} XP
            </span>
            <span className="text-[#D6A84B] font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#D6A84B]" />+{q.goldReward} Gold
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-[#A1A1B8] mb-1 font-mono tabular-nums">
              <span className="truncate pr-2">{q.objectiveLabel}</span>
              <span className="shrink-0">
                {q.progress}/{q.maxProgress} {q.unitLabel}
              </span>
            </div>
            <div className="w-full bg-[#090910] h-2 rounded-full overflow-hidden border border-[#8B5CF6]/20">
              <div
                className={`h-full transition-all ${
                  q.completed ? 'bg-[#34D399]' : spotlight ? 'bg-[#D6A84B]' : 'bg-gradient-to-r from-[#8B5CF6] to-[#FBBF24]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Inline Reflection Drawer for Offline / Study Quests */}
          {isEditingEvidence && !q.completed && (
            <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/35 p-3 space-y-2">
              <label className="block text-[11px] font-semibold text-[#8B5CF6]">
                Record Genuine Reflection (min 12 chars)
              </label>
              <textarea
                rows={2}
                value={evidenceInput}
                onChange={e => setEvidenceInput(e.target.value)}
                placeholder="Briefly describe what you practiced, learned, or completed..."
                className="w-full rounded-lg bg-[#090910] border border-[#8B5CF6]/30 p-2 text-xs text-white placeholder:text-[#A1A1B8]/50 focus:outline-none focus:border-[#D6A84B]"
              />
              {evidenceError && <p className="text-[11px] text-[#FB7185]">{evidenceError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveEvidenceQuestId(null);
                    setEvidenceError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs text-[#A1A1B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitReflection(q.id)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 text-white font-bold text-xs whitespace-nowrap shrink-0"
                >
                  Confirm Completion
                </button>
              </div>
            </div>
          )}

          {/* Action Row */}
          {q.claimed ? (
            <div className="text-center py-2 text-xs font-semibold text-[#34D399] flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Claimed &amp; Recorded in Chronicle</span>
            </div>
          ) : q.completed ? (
            <button
              type="button"
              onClick={() => handleClaimAiQuest(q.id)}
              className="w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-[#34D399] to-emerald-500 hover:brightness-110 text-[#090910] shadow-lg shadow-emerald-950/60 transition-all"
            >
              CLAIM REWARD
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {autoRoute && (
                <button
                  type="button"
                  onClick={() => setActiveTab(autoRoute.tab)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D6A84B] hover:text-white transition-colors"
                >
                  <span>{autoRoute.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {(needsReflection || q.evidenceType === 'friend_interaction') && !isEditingEvidence && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveEvidenceQuestId(q.id);
                    setEvidenceInput('');
                    setEvidenceError(null);
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/40 hover:border-[#D6A84B]/50 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>
                    {q.evidenceType === 'friend_interaction'
                      ? 'Log Real-World Outreach'
                      : 'Submit Study / Growth Reflection'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeTierMeta = TIER_LABELS[aiMentorMemory.lastAdaptiveTier] || TIER_LABELS.balanced;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* AI-Powered Dynamic Quest Generator Section */}
      <section
        data-tutorial-id="quest-board"
        className="rounded-2xl border border-[#8B5CF6]/30 bg-[#141420]/90 backdrop-blur-md p-5 sm:p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)] space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#38BDF8] flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                AI Quest Architect
              </span>
              <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
              <span className="text-white font-semibold">{activeTierMeta.label}</span>
              <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
              <span className="text-[#FBBF24] font-mono tabular-nums">
                Daily Reset in {countdowns.dailyLabel}
              </span>
            </div>
            <h2 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-white tracking-wide">
              TODAY&apos;S PERSONALIZED AI QUESTS
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1B8] mt-1 max-w-2xl">
              {activeTierMeta.note} Every quest is tailored uniquely to your habits, goals, streak, and recent activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {todaysAiQuests.length === 0 && (
              <button
                type="button"
                onClick={() => setShowCheckIn(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/40 hover:border-[#D6A84B]/50 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Energy &amp; Time Check-In</span>
              </button>
            )}

            <button
              type="button"
              disabled={isGeneratingDailyQuests || todaysAiQuests.length > 0}
              onClick={handleGenerate}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider transition-all whitespace-nowrap shrink-0 ${
                todaysAiQuests.length > 0
                  ? 'bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399] cursor-default'
                  : 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 disabled:opacity-60 text-white shadow-[0_0_18px_rgba(139,92,246,0.35)]'
              }`}
            >
              {isGeneratingDailyQuests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Quests...</span>
                </>
              ) : todaysAiQuests.length > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Today&apos;s Slate Active ({todaysAiQuests.filter(q => q.claimed).length}/{todaysAiQuests.length})</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>GENERATE TODAY&apos;S QUESTS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Check-In Drawer */}
        {showCheckIn && todaysAiQuests.length === 0 && (
          <div className="rounded-xl bg-[#0E0E17]/90 border border-[#8B5CF6]/30 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1B8] mb-1.5">
                Available Time Today: <span className="text-[#D6A84B] font-mono">{availableMinutes} min</span>
              </label>
              <input
                type="range"
                min={15}
                max={120}
                step={15}
                value={availableMinutes}
                onChange={e => setAvailableMinutes(Number(e.target.value))}
                className="w-full accent-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1B8] mb-1.5">
                Self-Reported Energy Level
              </label>
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergyLevel(lvl)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                      energyLevel === lvl
                        ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] border-[#D6A84B]/50 text-white'
                        : 'bg-[#090910] border-[#8B5CF6]/25 text-[#A1A1B8] hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1B8] mb-1.5">
                Optional Focus Note
              </label>
              <input
                type="text"
                value={focusNote}
                onChange={e => setFocusNote(e.target.value)}
                placeholder="e.g., exam study, light walk, clean evening routine"
                className="w-full px-3 py-1.5 rounded-lg bg-[#090910] border border-[#8B5CF6]/30 text-xs text-white placeholder:text-[#A1A1B8]/50 focus:outline-none focus:border-[#D6A84B]"
              />
            </div>
          </div>
        )}

        {/* Mentor Greeting */}
        {mentorGreeting && todaysAiQuests.length > 0 && (
          <div className="rounded-xl bg-[#0E0E17]/80 border border-[#D6A84B]/30 px-4 py-3 text-xs text-[#A1A1B8] italic">
            &ldquo;{mentorGreeting}&rdquo;
          </div>
        )}

        {/* Errors */}
        {(questGenerationError || actionMessage) && (
          <div className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/15 p-3.5 flex items-center justify-between gap-3 text-xs text-[#FB7185]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
              <span>{questGenerationError || actionMessage}</span>
            </div>
            {questGenerationError && todaysAiQuests.length === 0 && (
              <button
                type="button"
                onClick={handleGenerate}
                className="px-3 py-1 rounded-lg bg-[#FB7185]/20 hover:bg-[#FB7185]/30 text-white font-semibold whitespace-nowrap shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Rune-forging Loading State */}
        {isGeneratingDailyQuests && (
          <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#0E0E17] p-8 text-center space-y-3">
            <div className="w-11 h-11 mx-auto rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
            <p className="font-['Cinzel'] font-bold text-sm text-[#D6A84B]">
              Inscribing Personalized Runes from Your Chronicle...
            </p>
            <p className="text-xs text-[#A1A1B8]">
              Balancing Physical, Intellectual, Discipline, Personal Growth, and Social objectives.
            </p>
          </div>
        )}

        {/* Active AI Quests Slate */}
        {!isGeneratingDailyQuests && todaysAiQuests.length > 0 && (
          <div className="space-y-4">
            {specialChallenge && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B] mb-2">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Special Daily Challenge Spotlight</span>
                </div>
                {renderDynamicQuestCard(specialChallenge, true)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standardAiQuests.map(q => renderDynamicQuestCard(q, false))}
            </div>
          </div>
        )}

        {/* Empty State CTA */}
        {!isGeneratingDailyQuests && todaysAiQuests.length === 0 && (
          <div className="rounded-xl border border-[#8B5CF6]/25 bg-[#0E0E17]/80 p-6 text-center">
            <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-xl mx-auto">
              Press <strong className="text-[#D6A84B]">GENERATE TODAY&apos;S QUESTS</strong> above to craft five adaptive daily objectives across Physical, Intellectual, Discipline, Personal Growth, and Social pillars.
            </p>
          </div>
        )}
      </section>

      {/* Classic Realm Bounties Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141420]/90 backdrop-blur-md border border-[#8B5CF6]/30 rounded-2xl p-4 shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
        <div>
          <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Scroll className="w-4 h-4 text-[#D6A84B]" />
            <span>Classic Realm Bounties</span>
          </h2>
          <p className="text-xs text-[#A1A1B8] mt-0.5">
            Weekly reset in {countdowns.weeklyLabel} · Preserved core habit and combat bounties.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#090910] rounded-xl border border-[#8B5CF6]/25">
          {(['all', 'daily', 'weekly', 'special'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 ${
                selectedType === type
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_14px_rgba(139,92,246,0.35)]'
                  : 'text-[#A1A1B8] hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Classic Quests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuests.map(q => {
          const isCompleted = q.completed;
          const isClaimed = q.claimed;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isClaimed
                  ? 'bg-[#0E0E17]/70 border-[#34D399]/25 text-[#A1A1B8]'
                  : isCompleted
                  ? 'bg-[#141420] border-[#34D399]/60 ring-1 ring-[#34D399]/30 shadow-[0_12px_32px_rgba(9,9,16,0.65)]'
                  : 'bg-[#141420]/90 backdrop-blur-md border-[#8B5CF6]/30 hover:border-[#D6A84B]/45 shadow-[0_12px_32px_rgba(9,9,16,0.65)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2 text-[11px]">
                  <span className="uppercase font-bold text-[#D6A84B] tracking-wider">
                    {q.type} Quest
                  </span>
                  {q.expiresIn && (
                    <span className="text-[#A1A1B8] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A1A1B8]/70" />
                      {q.expiresIn}
                    </span>
                  )}
                </div>

                <h3 className="font-['Cinzel'] font-bold text-base text-white mb-1">
                  {q.title}
                </h3>
                <p className="text-xs text-[#A1A1B8] leading-relaxed mb-4">
                  {q.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#8B5CF6]/20">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-[#FBBF24] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
                    +{q.playerXpReward} Player XP
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#A1A1B8] mb-1 font-mono tabular-nums">
                    <span>Progress</span>
                    <span>
                      {q.progress} / {q.maxProgress}
                    </span>
                  </div>
                  <div className="w-full bg-[#090910] h-2 rounded-full overflow-hidden border border-[#8B5CF6]/20">
                    <div
                      className="bg-gradient-to-r from-[#8B5CF6] to-[#FBBF24] h-full transition-all"
                      style={{ width: `${Math.min(100, (q.progress / q.maxProgress) * 100)}%` }}
                    />
                  </div>
                </div>

                {isCompleted && !isClaimed ? (
                  <button
                    type="button"
                    onClick={() => claimQuest(q.id)}
                    className="w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-[#34D399] to-emerald-500 hover:brightness-110 text-[#090910] shadow-lg shadow-emerald-950/60 transition-all"
                  >
                    CLAIM REWARD
                  </button>
                ) : isClaimed ? (
                  <div className="text-center py-2 text-xs font-semibold text-[#34D399] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reward Claimed</span>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-[#A1A1B8]/70 font-medium">
                    In Progress
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Combined AI Quest & Reward History */}
      <div className="bg-[#141420]/90 backdrop-blur-md border border-[#8B5CF6]/30 rounded-2xl p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)] space-y-5">
        {dynamicQuestHistory.length > 0 && (
          <div>
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#D6A84B] flex items-center gap-2 mb-3">
              <Wand2 className="w-4 h-4" />
              <span>AI QUEST ARCHIVE</span>
            </h3>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {dynamicQuestHistory.slice(0, 12).map(h => (
                <div
                  key={h.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{h.title}</span>
                    <span className="text-[11px] text-[#A1A1B8] ml-2 font-mono">{h.periodKey}</span>
                    {h.evidenceNote && (
                      <p className="text-[11px] text-[#A1A1B8]/80 mt-0.5 italic">
                        &ldquo;{h.evidenceNote}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-[#34D399] whitespace-nowrap shrink-0 tabular-nums">
                    +{h.playerXpReward} XP · +{h.goldReward}g
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-[#D6A84B]" />
            <span>RECENT XP &amp; REWARD HISTORY</span>
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{tx.source}</span>
                  <span className="text-[10px] text-[#A1A1B8]/70 ml-2 font-mono">{tx.timestamp}</span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    tx.type === 'GOLD' ? 'text-[#D6A84B]' : 'text-[#FBBF24]'
                  }`}
                >
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}{' '}
                  {tx.type === 'GOLD' ? 'Gold' : 'Player XP'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
