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
import {
  AnimatedCounter,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';

export const DailyCalendarView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
      const modeLabel =
        catchUpDayNumber !== undefined
          ? 'Grace Catch-Up'
          : mode === 'rest_recovery'
            ? 'Rest & Recovery'
            : 'Verified Workout';
      flash(
        'success',
        `Day ${res.dayNumber || ''} ${modeLabel} claimed${res.rewardSummary ? ` · +${res.rewardSummary}` : ''}.`
      );
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
        return <Gift className="w-4 h-4 text-[#F43F5E] shrink-0" />;
      case 'card':
        return <Layers className="w-4 h-4 text-[#38D9F5] shrink-0" />;
      case 'fragments':
        return <Sparkles className="w-4 h-4 text-[#38D9F5] shrink-0" />;
      case 'quest_bonus':
        return <Flame className="w-4 h-4 text-[#10B981] shrink-0" />;
      default:
        return <Coins className="w-4 h-4 text-[#F59E0B] shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Healthy Rest Policy */}
      <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] p-5 sm:p-6 shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5]">
                Sustainable Monthly Cadence
              </span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className="text-[#94A8C7] font-mono tabular-nums">
                {state?.monthKey || 'Current Cycle'}
              </span>
            </div>
            <h2 className={`${embedded ? 'text-lg sm:text-xl' : 'text-2xl'} font-black font-['Cinzel'] text-[#F2F7FF]`}>
              30-DAY ADVENTURER CALENDAR
            </h2>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
              Honor both effort and recovery. Claim today&apos;s step via a verified workout or an intentional Rest &amp; Recovery check-in, and recover missed days with monthly Grace Passes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#061225] border border-[#1E3A63]">
              <div className="text-[11px] text-[#94A8C7]">Active Days</div>
              <div className="text-lg font-black font-mono text-[#38D9F5] tabular-nums">
                <AnimatedCounter value={state?.activeParticipationDays || 0} /> / 30
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#061225] border border-[#1E3A63]">
              <div className="text-[11px] text-[#94A8C7]">Grace Passes</div>
              <div className="text-lg font-black font-mono text-[#10B981] tabular-nums">
                <AnimatedCounter value={state?.gracePassesRemaining ?? 2} /> / 2
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#061225] border border-[#1E3A63]">
              <div className="text-[11px] text-[#94A8C7]">Fragments</div>
              <div className="text-lg font-black font-mono text-[#38D9F5] tabular-nums">
                <AnimatedCounter value={walletState?.cosmeticFragments ?? 0} />
              </div>
            </div>
          </div>
        </div>

        {/* Today Check-In Bar */}
        <div className="mt-5 pt-4 border-t border-[#1E3A63] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-[#94A8C7]">
            <ShieldCheck className="w-4 h-4 text-[#38D9F5] shrink-0 mt-0.5" />
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
              className={`lq-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                state?.claimedToday
                  ? 'bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] cursor-not-allowed'
                  : 'lq-btn-gold'
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
              className={`lq-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 ${
                state?.claimedToday
                  ? 'bg-[#061225]/70 border-[#1E3A63] text-[#647A9E] cursor-not-allowed'
                  : 'bg-[#102440] hover:bg-[#162E52] border-[#10B981]/45 hover:border-[#10B981]/75 text-[#F2F7FF] cursor-pointer'
              }`}
            >
              <HeartHandshake className="w-4 h-4 shrink-0 text-[#10B981]" />
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
              ? 'bg-[#10B981]/12 border-[#10B981]/45 text-[#F2F7FF]'
              : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F2F7FF]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 4 Weekly Participation Milestones */}
      <RpgStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {(state?.weeklyMilestones || []).map(ms => {
          const busy = busyId === `week-${ms.id}`;
          return (
            <RpgStaggerItem key={ms.id}>
              <div
                className={`h-full rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  ms.claimed
                    ? 'bg-[#0A1930] border-[#10B981]/40'
                    : ms.unlocked
                      ? 'bg-[#102440] border-[#F59E0B]/60 shadow-[0_0_18px_rgba(245,158,11,0.22)]'
                      : 'bg-[#0A1930] border-[#1E3A63]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-['Cinzel'] font-bold text-[#FBBF24]">{ms.title}</span>
                    <span className="font-mono text-[11px] text-[#94A8C7] tabular-nums">
                      {ms.dayTarget} Days
                    </span>
                  </div>
                  <p className="text-xs text-[#94A8C7] mt-1">{ms.rewardLabel}</p>
                </div>

                <button
                  type="button"
                  disabled={!ms.unlocked || ms.claimed || busy}
                  onClick={() => void handleClaimWeekly(ms.id)}
                  className={`lq-btn w-full py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 ${
                    ms.claimed
                      ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/35 cursor-default'
                      : ms.unlocked
                        ? 'lq-btn-gold'
                        : 'bg-[#061225] text-[#647A9E] border border-[#1E3A63] cursor-not-allowed'
                  }`}
                >
                  {ms.claimed ? 'Claimed' : busy ? 'Claiming...' : ms.unlocked ? 'Claim Milestone' : 'Locked'}
                </button>
              </div>
            </RpgStaggerItem>
          );
        })}
      </RpgStaggerGrid>

      {/* 30-Day Calendar Grid */}
      <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold text-[#F2F7FF] uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4 text-[#38D9F5]" />
            <span>Monthly Track (30 Steps)</span>
          </div>
          <span className="text-[11px] text-[#94A8C7] tabular-nums">
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
                    ? 'bg-[#0A2628] border-[#10B981]/40'
                    : isRecoverable
                      ? 'bg-[#102440] border-[#38D9F5]/55'
                      : day.isWeeklyMilestone
                        ? 'bg-[#102440]/75 border-[#F59E0B]/45'
                        : 'bg-[#061225]/90 border-[#1E3A63] hover:border-[#1677FF]/65'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold text-[#F2F7FF] tabular-nums">
                    Day {day.dayNumber}
                  </span>
                  {day.claimed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  ) : day.isWeeklyMilestone ? (
                    <Trophy className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                  ) : null}
                </div>

                <div className="flex items-start gap-2 my-1">
                  {getRewardIcon(day.rewardType)}
                  <span className="text-[11px] text-[#94A8C7] leading-snug">
                    {day.rewardLabel}
                  </span>
                </div>

                {day.claimed ? (
                  <div className="text-[10px] font-semibold text-[#10B981] capitalize">
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
                    className="lq-btn w-full py-1.5 px-2 rounded-lg bg-[#102440] hover:bg-[#0A2628] border border-[#10B981]/50 text-[#10B981] text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {busyCatchup ? 'Applying...' : 'Grace Catch-Up'}
                  </button>
                ) : (
                  <div className="text-[10px] text-[#647A9E]">
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
