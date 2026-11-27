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
        return <Gift className="w-4 h-4 text-[#D65C66] shrink-0" />;
      case 'card':
        return <Layers className="w-4 h-4 text-[#B998E3] shrink-0" />;
      case 'fragments':
        return <Sparkles className="w-4 h-4 text-[#9A72CC] shrink-0" />;
      case 'quest_bonus':
        return <Flame className="w-4 h-4 text-[#49B88A] shrink-0" />;
      default:
        return <Coins className="w-4 h-4 text-[#D6A84B] shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Healthy Rest Policy */}
      <div className="rounded-2xl bg-[#171220] border border-[#362B45] p-5 sm:p-6 shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
                Sustainable Monthly Cadence
              </span>
              <span className="text-[#766D82]" aria-hidden="true">·</span>
              <span className="text-[#A69AAF] font-mono tabular-nums">
                {state?.monthKey || 'Current Cycle'}
              </span>
            </div>
            <h2 className={`${embedded ? 'text-lg sm:text-xl' : 'text-2xl'} font-black font-['Cinzel'] text-[#F2EDF7]`}>
              30-DAY ADVENTURER CALENDAR
            </h2>
            <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
              Honor both effort and recovery. Claim today&apos;s step via a verified workout or an intentional Rest &amp; Recovery check-in, and recover missed days with monthly Grace Passes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#100D18] border border-[#362B45]">
              <div className="text-[11px] text-[#A69AAF]">Active Days</div>
              <div className="text-lg font-black font-mono text-[#E8C777] tabular-nums">
                <AnimatedCounter value={state?.activeParticipationDays || 0} /> / 30
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#100D18] border border-[#362B45]">
              <div className="text-[11px] text-[#A69AAF]">Grace Passes</div>
              <div className="text-lg font-black font-mono text-[#49B88A] tabular-nums">
                <AnimatedCounter value={state?.gracePassesRemaining ?? 2} /> / 2
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#100D18] border border-[#362B45]">
              <div className="text-[11px] text-[#A69AAF]">Fragments</div>
              <div className="text-lg font-black font-mono text-[#B998E3] tabular-nums">
                <AnimatedCounter value={walletState?.cosmeticFragments ?? 0} />
              </div>
            </div>
          </div>
        </div>

        {/* Today Check-In Bar */}
        <div className="mt-5 pt-4 border-t border-[#362B45] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-[#A69AAF]">
            <ShieldCheck className="w-4 h-4 text-[#E8C777] shrink-0 mt-0.5" />
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
                  ? 'bg-[#49B88A]/15 border border-[#49B88A]/40 text-[#49B88A] cursor-not-allowed'
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
                  ? 'bg-[#100D18]/70 border-[#362B45] text-[#766D82] cursor-not-allowed'
                  : 'bg-[#21152F] hover:bg-[#2B1D3D] border-[#49B88A]/45 hover:border-[#49B88A]/75 text-[#F2EDF7] cursor-pointer'
              }`}
            >
              <HeartHandshake className="w-4 h-4 shrink-0 text-[#49B88A]" />
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
              ? 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#F2EDF7]'
              : 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#F2EDF7]'
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
                    ? 'bg-[#171220] border-[#49B88A]/40'
                    : ms.unlocked
                      ? 'bg-[#21152F] border-[#D6A84B]/60 shadow-[0_0_18px_rgba(214,168,75,0.18)]'
                      : 'bg-[#171220] border-[#362B45]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-['Cinzel'] font-bold text-[#E8C777]">{ms.title}</span>
                    <span className="font-mono text-[11px] text-[#A69AAF] tabular-nums">
                      {ms.dayTarget} Days
                    </span>
                  </div>
                  <p className="text-xs text-[#A69AAF] mt-1">{ms.rewardLabel}</p>
                </div>

                <button
                  type="button"
                  disabled={!ms.unlocked || ms.claimed || busy}
                  onClick={() => void handleClaimWeekly(ms.id)}
                  className={`lq-btn w-full py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 ${
                    ms.claimed
                      ? 'bg-[#49B88A]/15 text-[#49B88A] border border-[#49B88A]/35 cursor-default'
                      : ms.unlocked
                        ? 'lq-btn-gold'
                        : 'bg-[#100D18] text-[#766D82] border border-[#362B45] cursor-not-allowed'
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
      <div className="rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold text-[#F2EDF7] uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4 text-[#E8C777]" />
            <span>Monthly Track (30 Steps)</span>
          </div>
          <span className="text-[11px] text-[#A69AAF] tabular-nums">
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
                    ? 'bg-[#14201C] border-[#49B88A]/40'
                    : isRecoverable
                      ? 'bg-[#21152F] border-[#E8C777]/55'
                      : day.isWeeklyMilestone
                        ? 'bg-[#21152F]/75 border-[#D6A84B]/45'
                        : 'bg-[#100D18]/90 border-[#362B45] hover:border-[#7045A0]/65'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold text-[#F2EDF7] tabular-nums">
                    Day {day.dayNumber}
                  </span>
                  {day.claimed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#49B88A] shrink-0" />
                  ) : day.isWeeklyMilestone ? (
                    <Trophy className="w-3.5 h-3.5 text-[#E8C777] shrink-0" />
                  ) : null}
                </div>

                <div className="flex items-start gap-2 my-1">
                  {getRewardIcon(day.rewardType)}
                  <span className="text-[11px] text-[#A69AAF] leading-snug">
                    {day.rewardLabel}
                  </span>
                </div>

                {day.claimed ? (
                  <div className="text-[10px] font-semibold text-[#49B88A] capitalize">
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
                    className="lq-btn w-full py-1.5 px-2 rounded-lg bg-[#21152F] hover:bg-[#172822] border border-[#49B88A]/50 text-[#49B88A] text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {busyCatchup ? 'Applying...' : 'Grace Catch-Up'}
                  </button>
                ) : (
                  <div className="text-[10px] text-[#766D82]">
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
