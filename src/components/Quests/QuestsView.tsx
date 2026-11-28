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
import { DailyCalendarView } from '../Progression/DailyCalendarView';
import { AchievementsView } from '../Achievements/AchievementsView';
import { FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedProgressBar,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';
import {
  Scroll,
  CheckCircle2,
  Clock,
  Sparkles,
  History,
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
  CalendarCheck,
  Award,
  Compass,
} from 'lucide-react';

const CATEGORY_META: Record<
  DynamicQuestCategory,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  physical: { label: 'Physical', color: 'text-[#10B981]', icon: Dumbbell },
  intellectual: { label: 'Intellectual', color: 'text-[#38D9F5]', icon: BookOpen },
  discipline: { label: 'Discipline', color: 'text-[#60A5FA]', icon: Shield },
  personal_growth: { label: 'Personal Growth', color: 'text-[#FBBF24]', icon: TrendingUp },
  social: { label: 'Social', color: 'text-[#38D9F5]', icon: Users },
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
    achievements,
    dailyCalendarState,
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
    questHubSubTab,
    setQuestHubSubTab,
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
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);

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
    setClaimingQuestId(questId);
    try {
      const res = await claimDynamicQuest(questId);
      if (!res.success && res.error) {
        setActionMessage(res.error);
      }
    } finally {
      setClaimingQuestId(null);
    }
  };

  const handleClaimClassicQuest = async (questId: string) => {
    setActionMessage(null);
    setClaimingQuestId(questId);
    try {
      await claimQuest(questId);
    } finally {
      setClaimingQuestId(null);
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
            ? 'bg-gradient-to-br from-[#102440] via-[#0A1930] to-[#061225] border-[#F59E0B]/65 shadow-[0_14px_34px_-12px_rgba(245,158,11,0.22)]'
            : q.claimed
            ? 'bg-[#0A1930]/80 border-[#1E3A63] opacity-85'
            : q.completed
            ? 'bg-[#102440] border-[#10B981]/60 shadow-[0_12px_30px_-14px_rgba(16,185,129,0.25)]'
            : 'bg-[#0A1930] border-[#1E3A63] hover:border-[#1677FF]/75 shadow-[0_12px_28px_-14px_rgba(3,10,24,0.8)]'
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold">
              <CatIcon className={`w-3.5 h-3.5 ${catMeta.color}`} />
              <span className={catMeta.color}>{catMeta.label}</span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className={`uppercase tracking-wider font-mono ${spotlight ? 'text-[#FBBF24]' : 'text-[#38D9F5]'}`}>
                {spotlight ? 'Special Daily Challenge' : q.difficulty}
              </span>
            </div>
            <span className="text-[#94A8C7] font-mono flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3 text-[#647A9E]" />
              ~{q.estimatedMinutes}m
            </span>
          </div>

          <h3 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F2F7FF] leading-snug">
            {q.title}
          </h3>

          <p className="text-xs text-[#94A8C7] leading-relaxed mt-1.5">
            {q.description}
          </p>

          <p className="text-[11px] text-[#38D9F5]/90 mt-2.5 leading-snug">
            <span className="font-semibold text-[#38D9F5]">Why this quest: </span>
            {q.personalizationReason}
          </p>
        </div>

        <div className="space-y-3 pt-4 mt-4 border-t border-[#1E3A63]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
            <span className="text-[#38D9F5] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#38D9F5]" />+{q.playerXpReward} XP
            </span>
            <span className="text-[#FBBF24] font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />+{q.goldReward} Gold
            </span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[#94A8C7] mb-1 font-mono tabular-nums">
              <span className="truncate pr-2">{q.objectiveLabel}</span>
              <span className="shrink-0">
                {q.progress}/{q.maxProgress} {q.unitLabel}
              </span>
            </div>
            <AnimatedProgressBar
              percentage={pct}
              className="w-full bg-[#061225] h-2 rounded-full overflow-hidden border border-[#1E3A63]"
              barClassName={
                q.completed
                  ? 'bg-[#10B981]'
                  : spotlight
                  ? 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]'
                  : 'bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#38D9F5]'
              }
            />
          </div>

          {isEditingEvidence && !q.completed && (
            <div className="rounded-xl bg-[#061225] border border-[#00D9FF]/40 p-3 space-y-2">
              <label className="block text-[11px] font-semibold text-[#38D9F5]">
                Record Genuine Reflection (min 12 chars)
              </label>
              <textarea
                rows={2}
                value={evidenceInput}
                onChange={e => setEvidenceInput(e.target.value)}
                placeholder="Briefly describe what you practiced, learned, or completed..."
                className="lq-input w-full p-2 text-xs"
              />
              {evidenceError && <p className="text-[11px] text-[#F43F5E]">{evidenceError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveEvidenceQuestId(null);
                    setEvidenceError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitReflection(q.id)}
                  className="lq-btn lq-btn-gold px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
                >
                  Confirm Completion
                </button>
              </div>
            </div>
          )}

          {q.claimed ? (
            <div className="text-center py-2 text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Claimed &amp; Recorded in Chronicle</span>
            </div>
          ) : q.completed ? (
            <button
              type="button"
              disabled={claimingQuestId === q.id}
              onClick={() => handleClaimAiQuest(q.id)}
              className="lq-btn w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-[#059669] to-[#10B981] hover:brightness-110 disabled:opacity-60 text-[#061225] shadow-[0_8px_20px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              {claimingQuestId === q.id ? 'CLAIMING...' : 'CLAIM REWARD'}
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {autoRoute && (
                <button
                  type="button"
                  onClick={() => setActiveTab(autoRoute.tab)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38D9F5] hover:text-[#F2F7FF] transition-colors cursor-pointer"
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
                  className="lq-btn lq-btn-secondary ml-auto px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
                >
                  <PenLine className="w-3.5 h-3.5 text-[#38D9F5]" />
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
  const claimableBoardCount =
    quests.filter(q => q.completed && !q.claimed).length +
    todaysAiQuests.filter(q => q.completed && !q.claimed).length;
  const claimableAchievementsCount = achievements.filter(a => a.unlocked && !a.claimed).length;
  const claimableCalendarCount = dailyCalendarState && !dailyCalendarState.claimedToday ? 1 : 0;

  const hubSubTabs: Array<{
    id: 'board' | 'calendar' | 'achievements';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'board', label: 'Quest Board', icon: Scroll, badge: claimableBoardCount },
    { id: 'calendar', label: 'Daily Calendar', icon: CalendarCheck, badge: claimableCalendarCount },
    { id: 'achievements', label: 'Achievements', icon: Award, badge: claimableAchievementsCount },
  ];

  return (
    <div className={`space-y-6 ${embedded ? '' : 'pb-12'}`}>
      {/* Unified Quest Board Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#0A1930] border border-[#1E3A63] p-3 sm:px-4">
        <FeatureTabBar
          tabs={hubSubTabs}
          activeId={questHubSubTab}
          onSelect={setQuestHubSubTab}
          ariaLabel="Quest Board sections"
          layoutId="quest-hub-subtab"
        />

        <div className="flex items-center gap-2 text-xs text-[#94A8C7] font-mono tabular-nums px-1">
          <Clock className="w-3.5 h-3.5 text-[#38D9F5]" />
          <span>Daily Reset: {countdowns.dailyLabel}</span>
        </div>
      </div>

      <RpgSubTabTransition tabKey={questHubSubTab}>
        {questHubSubTab === 'calendar' && <DailyCalendarView embedded />}
        {questHubSubTab === 'achievements' && <AchievementsView embedded />}

        {questHubSubTab === 'board' && (
          <div className="space-y-6 pb-8">
            {/* Adaptive Daily Quests Section */}
            <section
              data-tutorial-id="quest-board"
              className="rounded-2xl border border-[#1E3A63] bg-[#0A1930] p-5 sm:p-6 shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] space-y-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      Adaptive Cadence
                    </span>
                    <span className="text-[#647A9E]" aria-hidden="true">·</span>
                    <span className="text-[#F2F7FF] font-semibold">{activeTierMeta.label}</span>
                    <span className="text-[#647A9E]" aria-hidden="true">·</span>
                    <span className="text-[#94A8C7] font-mono tabular-nums">
                      Daily Reset in {countdowns.dailyLabel}
                    </span>
                  </div>
                  <h2 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-[#F2F7FF] tracking-wide">
                    DAILY QUESTS
                  </h2>
                  <p className="text-xs sm:text-sm text-[#94A8C7] mt-1 max-w-2xl">
                    {activeTierMeta.note} Every objective adapts to your habits, goals, streak, and recent training activity.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {todaysAiQuests.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCheckIn(prev => !prev)}
                      className="lq-btn lq-btn-secondary px-3.5 py-2.5 text-xs whitespace-nowrap shrink-0"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#38D9F5]" />
                      <span>Energy &amp; Time Check-In</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isGeneratingDailyQuests || todaysAiQuests.length > 0}
                    onClick={handleGenerate}
                    className={`lq-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider whitespace-nowrap shrink-0 ${
                      todaysAiQuests.length > 0
                        ? 'bg-[#10B981]/12 border border-[#10B981]/45 text-[#10B981] cursor-default'
                        : 'lq-btn-gold'
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
                <div className="rounded-xl bg-[#061225] border border-[#1E3A63] p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A8C7] mb-1.5">
                      Available Time Today: <span className="text-[#38D9F5] font-mono">{availableMinutes} min</span>
                    </label>
                    <input
                      type="range"
                      min={15}
                      max={120}
                      step={15}
                      value={availableMinutes}
                      onChange={e => setAvailableMinutes(Number(e.target.value))}
                      className="w-full accent-[#1677FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94A8C7] mb-1.5">
                      Self-Reported Energy Level
                    </label>
                    <div className="flex gap-1.5">
                      {(['low', 'medium', 'high'] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setEnergyLevel(lvl)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                            energyLevel === lvl
                              ? 'bg-[#1677FF] border-[#00D9FF]/40 text-[#F2F7FF] font-bold'
                              : 'bg-[#0A1930] border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94A8C7] mb-1.5">
                      Optional Focus Note
                    </label>
                    <input
                      type="text"
                      value={focusNote}
                      onChange={e => setFocusNote(e.target.value)}
                      placeholder="e.g., exam study, light walk, clean evening routine"
                      className="lq-input w-full px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Mentor Greeting */}
              {mentorGreeting && todaysAiQuests.length > 0 && (
                <div className="rounded-xl bg-[#102440]/70 border border-[#1677FF]/45 px-4 py-3 text-xs text-[#94A8C7] italic">
                  &ldquo;{mentorGreeting}&rdquo;
                </div>
              )}

              {/* Errors */}
              {(questGenerationError || actionMessage) && (
                <div className="rounded-xl border border-[#F43F5E]/45 bg-[#F43F5E]/10 p-3.5 flex items-center justify-between gap-3 text-xs text-[#F2F7FF]">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0" />
                    <span>{questGenerationError || actionMessage}</span>
                  </div>
                  {questGenerationError && todaysAiQuests.length === 0 && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="px-3 py-1 rounded-lg bg-[#F43F5E] hover:brightness-110 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Rune-forging Loading State */}
              {isGeneratingDailyQuests && (
                <div className="rounded-2xl border border-[#00D9FF]/35 bg-[#061225] p-8 text-center space-y-3">
                  <div className="w-11 h-11 mx-auto rounded-full border-2 border-[#00D9FF] border-t-transparent animate-spin" />
                  <p className="font-['Cinzel'] font-bold text-sm text-[#38D9F5]">
                    Inscribing Personalized Runes from Your Chronicle...
                  </p>
                  <p className="text-xs text-[#94A8C7]">
                    Balancing Physical, Intellectual, Discipline, Personal Growth, and Social objectives.
                  </p>
                </div>
              )}

              {/* Active AI Quests Slate */}
              {!isGeneratingDailyQuests && todaysAiQuests.length > 0 && (
                <div className="space-y-4">
                  {specialChallenge && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#FBBF24] mb-2">
                        <Crown className="w-3.5 h-3.5" />
                        <span>Special Daily Challenge Spotlight</span>
                      </div>
                      {renderDynamicQuestCard(specialChallenge, true)}
                    </div>
                  )}

                  <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {standardAiQuests.map(q => (
                      <RpgStaggerItem key={q.id}>
                        {renderDynamicQuestCard(q, false)}
                      </RpgStaggerItem>
                    ))}
                  </RpgStaggerGrid>
                </div>
              )}

              {/* Empty State CTA */}
              {!isGeneratingDailyQuests && todaysAiQuests.length === 0 && (
                <div className="rounded-xl border border-[#1E3A63] bg-[#061225]/80 p-6 text-center">
                  <p className="text-xs sm:text-sm text-[#94A8C7] max-w-xl mx-auto">
                    Press <strong className="text-[#38D9F5]">GENERATE TODAY&apos;S QUESTS</strong> above to craft five adaptive daily objectives across Physical, Intellectual, Discipline, Personal Growth, and Social pillars.
                  </p>
                </div>
              )}
            </section>

            {/* Classic Realm Bounties Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A1930] border border-[#1E3A63] rounded-2xl p-4 shadow-[0_12px_30px_-14px_rgba(3,10,24,0.85)]">
              <div>
                <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                  <Scroll className="w-4 h-4 text-[#38D9F5]" />
                  <span>Classic Realm Bounties</span>
                </h2>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Weekly reset in {countdowns.weeklyLabel} · Preserved core habit and combat bounties.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#061225] rounded-xl border border-[#1E3A63]">
                {(['all', 'daily', 'weekly', 'special'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedType === type
                        ? 'bg-[#1677FF] text-[#F2F7FF] font-bold shadow-[0_4px_14px_rgba(22,119,255,0.4)]'
                        : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Classic Quests List */}
            <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuests.map(q => {
                const isCompleted = q.completed;
                const isClaimed = q.claimed;

                return (
                  <RpgStaggerItem key={q.id}>
                    <div
                      className={`h-full p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                        isClaimed
                          ? 'bg-[#0A1930]/75 border-[#1E3A63] text-[#94A8C7]'
                          : isCompleted
                          ? 'bg-[#102440] border-[#10B981]/60 shadow-[0_12px_28px_-14px_rgba(16,185,129,0.25)]'
                          : 'bg-[#0A1930] border-[#1E3A63] hover:border-[#1677FF]/70 shadow-[0_12px_28px_-14px_rgba(3,10,24,0.8)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2 text-[11px]">
                          <span className="uppercase font-bold text-[#38D9F5] tracking-wider">
                            {q.type} Quest
                          </span>
                          {q.expiresIn && (
                            <span className="text-[#94A8C7] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#647A9E]" />
                              {q.expiresIn}
                            </span>
                          )}
                        </div>

                        <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] mb-1">
                          {q.title}
                        </h3>
                        <p className="text-xs text-[#94A8C7] leading-relaxed mb-4">
                          {q.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-[#1E3A63]">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="text-[#38D9F5] font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#38D9F5]" />
                            +{q.playerXpReward} Player XP
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-[#94A8C7] mb-1 font-mono tabular-nums">
                            <span>Progress</span>
                            <span>
                              {q.progress} / {q.maxProgress}
                            </span>
                          </div>
                          <AnimatedProgressBar
                            percentage={Math.min(100, (q.progress / q.maxProgress) * 100)}
                            className="w-full bg-[#061225] h-2 rounded-full overflow-hidden border border-[#1E3A63]"
                            barClassName={
                              isCompleted
                                ? 'bg-[#10B981]'
                                : 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF]'
                            }
                          />
                        </div>

                        {isCompleted && !isClaimed ? (
                          <button
                            type="button"
                            disabled={claimingQuestId === q.id}
                            onClick={() => handleClaimClassicQuest(q.id)}
                            className="lq-btn w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-[#059669] to-[#10B981] hover:brightness-110 disabled:opacity-60 text-[#061225] shadow-[0_8px_20px_rgba(16,185,129,0.3)] cursor-pointer"
                          >
                            {claimingQuestId === q.id ? 'CLAIMING...' : 'CLAIM REWARD'}
                          </button>
                        ) : isClaimed ? (
                          <div className="text-center py-2 text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Reward Claimed</span>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-xs text-[#647A9E] font-medium">
                            In Progress
                          </div>
                        )}
                      </div>
                    </div>
                  </RpgStaggerItem>
                );
              })}
            </RpgStaggerGrid>

            {/* Completed Daily Quests & Reward History */}
            {(dynamicQuestHistory.length > 0 || transactions.length > 0) && (
              <div className="bg-[#0A1930] border border-[#1E3A63] rounded-2xl p-6 shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] space-y-5">
                {dynamicQuestHistory.length > 0 && (
                  <div>
                    <h3 className="font-['Cinzel'] font-bold text-sm text-[#38D9F5] flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>COMPLETED DAILY QUESTS</span>
                    </h3>
                    <div className="divide-y divide-[#1E3A63] max-h-44 overflow-y-auto">
                      {dynamicQuestHistory.slice(0, 12).map(h => (
                        <div
                          key={h.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#F2F7FF]">{h.title}</span>
                            <span className="text-[11px] text-[#647A9E] ml-2 font-mono">{h.periodKey}</span>
                            {h.evidenceNote && (
                              <p className="text-[11px] text-[#94A8C7] mt-0.5 italic">
                                &ldquo;{h.evidenceNote}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="font-mono font-bold text-[#10B981] whitespace-nowrap shrink-0 tabular-nums">
                            +{h.playerXpReward} XP · +{h.goldReward}g
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {transactions.length > 0 && (
                  <div>
                    <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2 mb-3">
                      <History className="w-4 h-4 text-[#38D9F5]" />
                      <span>RECENT XP &amp; REWARD HISTORY</span>
                    </h3>
                    <div className="divide-y divide-[#1E3A63] max-h-56 overflow-y-auto">
                      {transactions.map(tx => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-2.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#F2F7FF]">{tx.source}</span>
                            <span className="text-[10px] text-[#647A9E] ml-2 font-mono">{tx.timestamp}</span>
                          </div>
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              tx.type === 'GOLD' ? 'text-[#FBBF24]' : 'text-[#38D9F5]'
                            }`}
                          >
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}{' '}
                            {tx.type === 'GOLD' ? 'Gold' : 'Player XP'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </RpgSubTabTransition>
    </div>
  );
};
