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
      <div className="rounded-2xl border border-[#C5A15A]/35 bg-gradient-to-br from-[#1d152a] via-[#130d1e] to-[#1a130b] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs mb-1.5">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Royal Chronicler&apos;s Scroll
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/70">
                Grounded solely in {user?.username || 'Champion'}&apos;s real recorded activity
              </span>
            </div>
            <h2 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-white tracking-wide">
              DAILY QUEST REPORT
            </h2>
            <p className="text-xs sm:text-sm text-[#D9D2C5]/75 mt-1 max-w-2xl">
              An honest daily progression analysis of yesterday&apos;s efforts, strengths, areas to refine, and a grounded plan for today.
            </p>
          </div>

          <button
            type="button"
            disabled={isGeneratingDailyReport}
            onClick={() => generateTodaysDailyReport(Boolean(dailyReport))}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#C5A15A] to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 text-slate-950 font-['Cinzel'] font-bold text-xs tracking-wider shadow-lg shadow-amber-950/40 transition-all whitespace-nowrap shrink-0"
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
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{dailyReportError}</span>
            </div>
            <button
              type="button"
              onClick={() => generateTodaysDailyReport(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-white font-semibold whitespace-nowrap shrink-0"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Empty State before first generation */}
      {!dailyReport && !isGeneratingDailyReport && (
        <div className="rounded-2xl border border-[#C5A15A]/20 bg-[#0f0c1c] p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1a132c] border border-[#C5A15A]/30 flex items-center justify-center mb-4">
            <ScrollText className="w-7 h-7 text-[#C5A15A]" />
          </div>
          <h3 className="font-['Cinzel'] font-bold text-lg text-white">
            Your Daily Progression Scroll Awaits
          </h3>
          <p className="text-xs sm:text-sm text-[#D9D2C5]/75 max-w-lg mx-auto mt-2">
            Summon the Royal Chronicler to review yesterday&apos;s recorded habits, quests, workouts, and meals and prepare focused guidance for today.
          </p>
          <button
            type="button"
            onClick={() => generateTodaysDailyReport(false)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#251638] hover:bg-[#311d4a] border border-[#C5A15A]/45 text-[#C5A15A] font-['Cinzel'] font-bold text-xs tracking-wider transition-all whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Generate Today&apos;s Report
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isGeneratingDailyReport && (
        <div className="rounded-2xl border border-[#C5A15A]/25 bg-[#0f0c1c] p-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#C5A15A] border-t-transparent animate-spin" />
          <p className="font-['Cinzel'] text-sm font-bold text-[#C5A15A]">
            Evaluating your recorded chronicle...
          </p>
          <p className="text-xs text-slate-400">
            Analyzing genuine quests, habits, workouts, and nutrition without fabricating progress.
          </p>
        </div>
      )}

      {/* Report Scroll Content */}
      {dailyReport && !isGeneratingDailyReport && (
        <div className="space-y-6">
          {/* 1. Yesterday's Performance */}
          <section className="rounded-2xl border border-[#C5A15A]/30 bg-gradient-to-b from-[#171124] to-[#0d0a17] p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#C5A15A]/15">
              <div>
                <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A]">
                  Section I · Yesterday&apos;s Performance ({dailyReport.yesterdayDate})
                </p>
                <h3 className="font-['Cinzel'] font-bold text-lg text-white mt-0.5">
                  {dailyReport.headline}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Consistency Score</span>
                <span className="font-mono font-bold text-xl text-[#C5A15A] tabular-nums">
                  {dailyReport.yesterdayPerformance.consistencyScore}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 tabular-nums">
              <div className="rounded-xl bg-[#0a0814] border border-white/10 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ScrollText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Quests</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.questsCompleted}/{dailyReport.yesterdayPerformance.questsTotal}
                </div>
              </div>

              <div className="rounded-xl bg-[#0a0814] border border-white/10 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Habits</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.habitsCompleted}
                </div>
              </div>

              <div className="rounded-xl bg-[#0a0814] border border-white/10 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
                  <span>Workouts</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.workoutsLogged}
                </div>
              </div>

              <div className="rounded-xl bg-[#0a0814] border border-white/10 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Apple className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Meals</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-1">
                  {dailyReport.yesterdayPerformance.mealsLogged}
                </div>
              </div>

              <div className="rounded-xl bg-[#0a0814] border border-white/10 p-3.5 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>XP &amp; Gold</span>
                </div>
                <div className="font-mono font-bold text-sm text-white mt-1.5">
                  +{dailyReport.yesterdayPerformance.playerXpEarned} XP · +{dailyReport.yesterdayPerformance.goldEarned}g
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#D9D2C5]/85 leading-relaxed mt-4">
              {dailyReport.yesterdayPerformance.summary}
            </p>
          </section>

          {/* 2 & 3. Strengths & Areas for Improvement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-emerald-500/25 bg-[#0f0c1c] p-5">
              <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-emerald-400">
                Section II · Personal Strengths
              </p>
              <h3 className="font-['Cinzel'] font-bold text-base text-white mt-0.5 mb-3">
                What You Carried Well
              </h3>
              <div className="space-y-3">
                {dailyReport.personalStrengths.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-emerald-950/20 border border-emerald-500/20 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        {s.title}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-300/75 uppercase">
                        {s.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#D9D2C5]/80 mt-1.5 leading-relaxed">{s.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-500/25 bg-[#0f0c1c] p-5">
              <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-amber-400">
                Section III · Areas for Improvement
              </p>
              <h3 className="font-['Cinzel'] font-bold text-base text-white mt-0.5 mb-3">
                Gentle Next Adjustments
              </h3>
              <div className="space-y-3">
                {dailyReport.areasForImprovement.map((area, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-amber-950/15 border border-amber-500/20 p-3.5"
                  >
                    <div className="font-semibold text-sm text-amber-200 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                      {area.area}
                    </div>
                    <p className="text-xs text-[#D9D2C5]/75 mt-1 leading-relaxed">{area.observation}</p>
                    <p className="text-xs text-amber-300/90 mt-2 font-medium">
                      Next step: {area.gentleAction}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 4. Today's Recommendations */}
          <section className="rounded-2xl border border-purple-500/30 bg-[#120d22] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-[11px] font-['Cinzel'] uppercase tracking-widest text-purple-300">
                  Section IV · Today&apos;s Recommendations
                </p>
                <h3 className="font-['Cinzel'] font-bold text-lg text-white mt-0.5">
                  Primary Focus: {dailyReport.todayRecommendations.primaryFocus}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-purple-200 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                ~{dailyReport.todayRecommendations.suggestedMinutes} min suggested
              </span>
            </div>

            <ul className="space-y-2 mt-3">
              {dailyReport.todayRecommendations.realisticGoals.map((goal, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-[#D9D2C5]/85"
                >
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#C5A15A] shrink-0" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-[#090714] border border-[#C5A15A]/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#D9D2C5]/80">
                <span className="font-semibold text-[#C5A15A]">Special Challenge Counsel: </span>
                {dailyReport.todayRecommendations.specialChallengeAdvice}
              </div>
              <button
                type="button"
                onClick={() => setProgressionSubTab('quests')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#251638] hover:bg-[#311d4a] border border-[#C5A15A]/35 text-xs font-semibold text-[#C5A15A] whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Open Quest Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* 5. Daily RPG Evaluation */}
          <section className="rounded-2xl border border-[#C5A15A]/35 bg-gradient-to-r from-[#1c1328] via-[#130d1e] to-[#1a140a] p-6">
            <div className="flex items-center gap-2 text-xs text-[#C5A15A] font-['Cinzel'] font-bold uppercase tracking-widest mb-1">
              <Shield className="w-4 h-4" />
              <span>Section V · Daily RPG Evaluation</span>
            </div>
            <h3 className="font-['Cinzel'] font-bold text-lg text-white">
              {dailyReport.dailyRpgEvaluation.mentorTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[#D9D2C5]/85 leading-relaxed mt-2">
              {dailyReport.dailyRpgEvaluation.narrative}
            </p>
            <p className="text-xs text-[#C5A15A]/90 mt-3 pt-3 border-t border-white/10">
              Long-Term Character Growth: {dailyReport.dailyRpgEvaluation.longTermConnection}
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
