import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  ScrollText,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Compass,
  Flame,
  Dumbbell,
  Apple,
  Clock,
  Shield,
  ArrowRight,
} from 'lucide-react';

export const DailyQuestReportView: React.FC = () => {
  const {
    dailyReport,
    isGeneratingDailyReport,
    dailyReportError,
    generateTodaysDailyReport,
    setProgressionSubTab,
    user,
  } = useGame();

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Golden Scroll Banner */}
      <div className="rounded-2xl border border-[#D6A84B]/30 bg-gradient-to-br from-[#0E0E17] via-[#141420] to-[#0E0E17] p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)] backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs mb-1.5">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]">
                Royal Chronicler&apos;s Scroll
              </span>
              <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
              <span className="text-[#A1A1B8]">
                Grounded solely in {user?.username || 'Champion'}&apos;s real recorded activity
              </span>
            </div>
            <h2 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-white tracking-wide">
              DAILY QUEST REPORT
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1B8] mt-1 max-w-2xl">
              An honest daily progression analysis of yesterday&apos;s efforts, strengths, areas to refine, and a grounded plan for today.
            </p>
          </div>

          <button
            type="button"
            disabled={isGeneratingDailyReport}
            onClick={() => generateTodaysDailyReport(Boolean(dailyReport))}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 disabled:opacity-60 text-white font-['Cinzel'] font-bold text-xs tracking-wider shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-all whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingDailyReport ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingDailyReport
                ? 'Inscribing Chronicle...'
                : dailyReport
                ? 'Refresh Today’s Report'
                : 'Generate Daily Report'}
            </span>
          </button>
        </div>

        {dailyReportError && (
          <div className="mt-4 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/15 p-3.5 flex items-center justify-between gap-3 text-xs text-[#FB7185]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
              <span>{dailyReportError}</span>
            </div>
            <button
              type="button"
              onClick={() => generateTodaysDailyReport(true)}
              className="px-3 py-1.5 rounded-lg bg-[#FB7185]/20 hover:bg-[#FB7185]/30 text-white font-semibold whitespace-nowrap shrink-0"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Empty State before first generation */}
      {!dailyReport && !isGeneratingDailyReport && (
        <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#141420]/90 backdrop-blur-md p-8 text-center shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0E0E17] border border-[#D6A84B]/40 flex items-center justify-center mb-4">
            <ScrollText className="w-7 h-7 text-[#D6A84B]" />
          </div>
          <h3 className="font-['Cinzel'] font-bold text-lg text-white">
            Your Daily Progression Scroll Awaits
          </h3>
          <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-lg mx-auto mt-2">
            Summon the Royal Chronicler to review yesterday&apos;s recorded habits, quests, workouts, and meals and prepare focused guidance for today.
          </p>
          <button
            type="button"
            onClick={() => generateTodaysDailyReport(false)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 text-white font-['Cinzel'] font-bold text-xs tracking-wider shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-all whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Generate Today&apos;s Report
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isGeneratingDailyReport && (
        <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#141420]/90 backdrop-blur-md p-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#38BDF8] border-t-transparent animate-spin" />
          <p className="font-['Cinzel'] text-sm font-bold text-[#38BDF8]">
            Evaluating your recorded chronicle...
          </p>
          <p className="text-xs text-[#A1A1B8]">
            Analyzing genuine quests, habits, workouts, and nutrition without fabricating progress.
          </p>
        </div>
      )}

      {/* Report Scroll Content */}
      {dailyReport && !isGeneratingDailyReport && (
        <div className="space-y-6">
          {/* 1. Yesterday's Performance */}
          <section className="rounded-2xl border border-[#8B5CF6]/30 bg-[#141420]/90 backdrop-blur-md p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#8B5CF6]/20">
              <div>
                <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-[#38BDF8]">
                  Section I · Yesterday&apos;s Performance ({dailyReport.yesterdayDate})
                </p>
                <h3 className="font-['Cinzel'] font-bold text-lg text-white mt-0.5">
                  {dailyReport.headline}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#A1A1B8] block">Consistency Score</span>
                <span className="font-mono font-bold text-xl text-[#38BDF8] tabular-nums">
                  {dailyReport.yesterdayPerformance.consistencyScore}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 tabular-nums">
              <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1B8]">
                  <ScrollText className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Quests</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.questsCompleted}/{dailyReport.yesterdayPerformance.questsTotal}
                </div>
              </div>

              <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1B8]">
                  <Flame className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Habits</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.habitsCompleted}
                </div>
              </div>

              <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1B8]">
                  <Dumbbell className="w-3.5 h-3.5 text-[#FB7185]" />
                  <span>Workouts</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.workoutsLogged}
                </div>
              </div>

              <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1B8]">
                  <Apple className="w-3.5 h-3.5 text-[#34D399]" />
                  <span>Meals</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.mealsLogged}
                </div>
              </div>

              <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1B8]">
                  <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>XP &amp; Gold</span>
                </div>
                <div className="font-mono font-bold text-sm text-[#FBBF24] mt-1.5">
                  +{dailyReport.yesterdayPerformance.playerXpEarned} XP · +{dailyReport.yesterdayPerformance.goldEarned}g
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#A1A1B8] leading-relaxed mt-4">
              {dailyReport.yesterdayPerformance.summary}
            </p>
          </section>

          {/* 2 & 3. Strengths & Areas for Improvement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-[#34D399]/25 bg-[#141420]/90 backdrop-blur-md p-5">
              <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-[#34D399]">
                Section II · Personal Strengths
              </p>
              <h3 className="font-['Cinzel'] font-bold text-base text-white mt-0.5 mb-3">
                What You Carried Well
              </h3>
              <div className="space-y-3">
                {dailyReport.personalStrengths.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#34D399]/10 border border-[#34D399]/25 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#34D399] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                        {s.title}
                      </span>
                      <span className="text-[11px] font-mono text-[#34D399]/80 uppercase">
                        {s.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1B8] mt-1.5 leading-relaxed">{s.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#8B5CF6]/30 bg-[#141420]/90 backdrop-blur-md p-5">
              <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-[#38BDF8]">
                Section III · Areas for Improvement
              </p>
              <h3 className="font-['Cinzel'] font-bold text-base text-white mt-0.5 mb-3">
                Gentle Next Adjustments
              </h3>
              <div className="space-y-3">
                {dailyReport.areasForImprovement.map((area, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5"
                  >
                    <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#38BDF8] shrink-0" />
                      {area.area}
                    </div>
                    <p className="text-xs text-[#A1A1B8] mt-1 leading-relaxed">{area.observation}</p>
                    <p className="text-xs text-[#38BDF8] mt-2 font-medium">
                      Next step: {area.gentleAction}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 4. Today's Recommendations */}
          <section className="rounded-2xl border border-[#8B5CF6]/30 bg-[#141420]/90 backdrop-blur-md p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-[#D6A84B]">
                  Section IV · Today&apos;s Recommendations
                </p>
                <h3 className="font-['Cinzel'] font-bold text-lg text-white mt-0.5">
                  Primary Focus: {dailyReport.todayRecommendations.primaryFocus}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A1A1B8] tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                ~{dailyReport.todayRecommendations.suggestedMinutes} min suggested
              </span>
            </div>

            <ul className="space-y-2 mt-3">
              {dailyReport.todayRecommendations.realisticGoals.map((goal, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-[#A1A1B8]"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D6A84B] shrink-0" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/25 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#A1A1B8]">
                <span className="font-semibold text-[#D6A84B]">Special Challenge Counsel: </span>
                {dailyReport.todayRecommendations.specialChallengeAdvice}
              </div>
              <button
                type="button"
                onClick={() => setProgressionSubTab('quests')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/40 hover:border-[#D6A84B]/50 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Open Quest Board</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D6A84B]" />
              </button>
            </div>
          </section>

          {/* 5. Daily RPG Evaluation */}
          <section className="rounded-2xl border border-[#D6A84B]/30 bg-gradient-to-r from-[#0E0E17] via-[#141420] to-[#0E0E17] p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
            <div className="flex items-center gap-2 text-xs text-[#D6A84B] font-['Cinzel'] font-bold uppercase tracking-widest mb-1">
              <Shield className="w-4 h-4" />
              <span>Section V · Daily RPG Evaluation</span>
            </div>
            <h3 className="font-['Cinzel'] font-bold text-lg text-white">
              {dailyReport.dailyRpgEvaluation.mentorTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1B8] leading-relaxed mt-2">
              {dailyReport.dailyRpgEvaluation.narrative}
            </p>
            <p className="text-xs text-[#8B5CF6] mt-3 pt-3 border-t border-[#8B5CF6]/20">
              Long-Term Character Growth: {dailyReport.dailyRpgEvaluation.longTermConnection}
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
