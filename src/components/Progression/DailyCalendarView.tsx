import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  CalendarCheck,
  CheckCircle2,
  Coins,
  Dumbbell,
  Flame,
  Gift,
  HeartHandshake,
  Layers,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';

export const DailyCalendarView: React.FC = () => {
  const {
    dailyCalendarState,
    refreshDailyCalendar,
    claimDailyCalendarCheckin,
    claimCalendarWeeklyMilestone,
    walletState,
  } = useGame();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshDailyCalendar();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3600);
  };

  const handleCheckIn = async (mode: 'workout' | 'rest_recovery', catchUpDayNumber?: number) => {
    setBusyId(catchUpDayNumber ? `catchup-${catchUpDayNumber}` : `checkin-${mode}`);
    const res = await claimDailyCalendarCheckin({ mode, catchUpDayNumber });
    setBusyId(null);
    if (res.success) {
      flash('success', res.rewardSummary || `Day ${res.dayNumber || ''} calendar reward claimed.`);
    } else {
      flash('error', res.error || 'Could not claim daily calendar check-in.');
    }
  };

  const handleClaimWeekly = async (milestoneId: string) => {
    setBusyId(`week-${milestoneId}`);
    const res = await claimCalendarWeeklyMilestone(milestoneId);
    setBusyId(null);
    if (res.success) {
      flash('success', 'Weekly participation milestone reward claimed!');
    } else {
      flash('error', res.error || 'Weekly milestone requirements not reached yet.');
    }
  };

  const state = dailyCalendarState;
  const recoverableSet = new Set(state?.missedDaysRecoverable || []);

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'card_pack':
        return <Gift className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'card':
        return <Layers className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'fragments':
        return <Sparkles className="w-4 h-4 text-[#00D9FF] shrink-0" />;
      case 'quest_bonus':
        return <Flame className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Coins className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Healthy Rest Policy */}
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 shadow-[0_12px_32px_rgba(2,8,20,0.6)] p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                Sustainable Monthly Cadence
              </span>
              <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC] font-mono tabular-nums">
                {state?.monthKey || 'Current Cycle'}
              </span>
            </div>
            <h2 className="text-2xl font-black font-['Cinzel'] text-white">
              30-DAY ADVENTURER CALENDAR
            </h2>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Honor both effort and recovery. Claim today&apos;s step via a verified workout or an intentional Rest &amp; Recovery check-in, and recover missed days with monthly Grace Passes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/25">
              <div className="text-[11px] text-[#A9B8CC]">Active Days</div>
              <div className="text-lg font-black font-mono text-white tabular-nums">
                {state?.activeParticipationDays || 0} / 30
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/30">
              <div className="text-[11px] text-[#A9B8CC]">Grace Passes</div>
              <div className="text-lg font-black font-mono text-[#00D9FF] tabular-nums">
                {state?.gracePassesRemaining ?? 2} / 2
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0A1930] border border-[#00D9FF]/30">
              <div className="text-[11px] text-[#A9B8CC]">Fragments</div>
              <div className="text-lg font-black font-mono text-[#00D9FF] tabular-nums">
                {walletState?.cosmeticFragments ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Today Check-In Bar */}
        <div className="mt-5 pt-4 border-t border-[#1677FF]/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-[#A9B8CC]">
            <ShieldCheck className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
            <div>
              {state?.claimedToday ? (
                <span>
                  Today&apos;s reward ({state.todayDateKey}) is claimed. Return tomorrow or use an eligible Grace Catch-Up Pass on a missed day below.
                </span>
              ) : (
                <span>
                  Choose how you honor today ({state?.todayDateKey || 'Today'}): verify a workout session or intentionally log Rest &amp; Recovery without penalty.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={Boolean(state?.claimedToday) || busyId !== null}
              onClick={() => void handleCheckIn('workout')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                state?.claimedToday
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_18px_rgba(22,119,255,0.35)]'
              }`}
            >
              <Dumbbell className="w-4 h-4 shrink-0" />
              <span>
                {busyId === 'checkin-workout'
                  ? 'Verifying...'
                  : state?.claimedToday
                    ? 'Claimed Today'
                    : 'Check In: Verified Workout'}
              </span>
            </button>

            <button
              type="button"
              disabled={Boolean(state?.claimedToday) || busyId !== null}
              onClick={() => void handleCheckIn('rest_recovery')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
                state?.claimedToday
                  ? 'bg-[#0A1930]/60 border-[#1677FF]/15 text-[#A9B8CC]/40 cursor-not-allowed'
                  : 'bg-[#0A1930] hover:bg-[#16325C] border-[#1677FF]/40 hover:border-[#00D9FF]/50 text-white'
              }`}
            >
              <HeartHandshake className="w-4 h-4 shrink-0 text-[#00D9FF]" />
              <span>
                {busyId === 'checkin-rest_recovery' ? 'Recording...' : 'Check In: Rest & Recovery'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl border text-xs font-semibold ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 4 Weekly Participation Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {(state?.weeklyMilestones || []).map(ms => {
          const busy = busyId === `week-${ms.id}`;
          return (
            <div
              key={ms.id}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                ms.claimed
                  ? 'bg-emerald-950/25 border-emerald-500/35'
                  : ms.unlocked
                    ? 'bg-[#102440]/90 border-[#00D9FF]/50 shadow-[0_0_16px_rgba(0,217,255,0.12)]'
                    : 'bg-[#0A1930] border-[#1677FF]/25'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-['Cinzel'] font-bold text-[#00D9FF]">{ms.title}</span>
                  <span className="font-mono text-[11px] text-[#A9B8CC] tabular-nums">
                    {ms.dayTarget} Days
                  </span>
                </div>
                <p className="text-xs text-[#A9B8CC] mt-1">{ms.rewardLabel}</p>
              </div>

              <button
                type="button"
                disabled={!ms.unlocked || ms.claimed || busy}
                onClick={() => void handleClaimWeekly(ms.id)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  ms.claimed
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                    : ms.unlocked
                      ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_18px_rgba(22,119,255,0.35)]'
                      : 'bg-[#061225] text-[#A9B8CC]/50 border border-[#1677FF]/20 cursor-not-allowed'
                }`}
              >
                {ms.claimed ? 'Claimed' : busy ? 'Claiming...' : ms.unlocked ? 'Claim Milestone' : 'Locked'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 30-Day Calendar Grid */}
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 shadow-[0_12px_32px_rgba(2,8,20,0.6)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold text-white uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4 text-[#00D9FF]" />
            <span>Monthly Track (30 Steps)</span>
          </div>
          <span className="text-[11px] text-[#A9B8CC] tabular-nums">
            {state?.totalClaimedThisMonth || 0} / 30 Claimed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-3">
          {(state?.days || []).map(day => {
            const isRecoverable = !day.claimed && recoverableSet.has(day.dayNumber);
            const busyCatchup = busyId === `catchup-${day.dayNumber}`;
            return (
              <div
                key={day.dayNumber}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition-all ${
                  day.claimed
                    ? 'bg-emerald-950/25 border-emerald-500/40'
                    : isRecoverable
                      ? 'bg-[#102440] border-[#00D9FF]/50'
                      : day.isWeeklyMilestone
                        ? 'bg-[#0A1930] border-[#1677FF]/45'
                        : 'bg-[#061225]/90 border-[#1677FF]/20 hover:border-[#00D9FF]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold text-white tabular-nums">
                    Day {day.dayNumber}
                  </span>
                  {day.claimed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : day.isWeeklyMilestone ? (
                    <Trophy className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
                  ) : null}
                </div>

                <div className="flex items-start gap-2 my-1">
                  {getRewardIcon(day.rewardType)}
                  <span className="text-[11px] text-[#A9B8CC] leading-snug">
                    {day.rewardLabel}
                  </span>
                </div>

                {day.claimed ? (
                  <div className="text-[10px] font-semibold text-emerald-300/90 capitalize">
                    {day.claimedMode === 'rest_recovery'
                      ? 'Rest & Recovery'
                      : day.claimedMode === 'grace_catchup'
                        ? 'Grace Catch-Up'
                        : 'Verified Workout'}
                  </div>
                ) : isRecoverable && (state?.gracePassesRemaining ?? 0) > 0 ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void handleCheckIn('rest_recovery', day.dayNumber)}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#0A1930] hover:bg-[#16325C] border border-[#00D9FF]/50 text-[#00D9FF] text-[10px] font-bold whitespace-nowrap shrink-0 transition-colors"
                  >
                    {busyCatchup ? 'Applying...' : 'Grace Catch-Up'}
                  </button>
                ) : (
                  <div className="text-[10px] text-[#A9B8CC]/60">
                    {day.isWeeklyMilestone ? 'Milestone Step' : 'Upcoming Step'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
