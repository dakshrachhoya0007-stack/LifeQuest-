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
        return <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />;
      case 'quest_bonus':
        return <Flame className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Coins className="w-4 h-4 text-[#E8CF96] shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Healthy Rest Policy */}
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Sustainable Monthly Cadence
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75 font-mono tabular-nums">
                {state?.monthKey || 'Current Cycle'}
              </span>
            </div>
            <h2 className="text-2xl font-black font-['Cinzel'] text-white">
              30-DAY ADVENTURER CALENDAR
            </h2>
            <p className="text-xs sm:text-sm text-[#D9D2C5]/75 max-w-2xl mt-1">
              Honor both effort and recovery. Claim today&apos;s step via a verified workout or an intentional Rest &amp; Recovery check-in, and recover missed days with monthly Grace Passes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#08060f] border border-white/10">
              <div className="text-[11px] text-[#D9D2C5]/60">Active Days</div>
              <div className="text-lg font-black font-mono text-white tabular-nums">
                {state?.activeParticipationDays || 0} / 30
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#08060f] border border-[#C5A15A]/25">
              <div className="text-[11px] text-[#D9D2C5]/60">Grace Passes</div>
              <div className="text-lg font-black font-mono text-[#E8CF96] tabular-nums">
                {state?.gracePassesRemaining ?? 2} / 2
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#08060f] border border-purple-500/25">
              <div className="text-[11px] text-[#D9D2C5]/60">Fragments</div>
              <div className="text-lg font-black font-mono text-purple-300 tabular-nums">
                {walletState?.cosmeticFragments ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Today Check-In Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-[#D9D2C5]/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
                  : 'bg-[#C5A15A] text-slate-950 hover:bg-[#E8CF96]'
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
                  ? 'bg-white/5 border-white/10 text-[#D9D2C5]/40 cursor-not-allowed'
                  : 'bg-[#1a132c] border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/50'
              }`}
            >
              <HeartHandshake className="w-4 h-4 shrink-0 text-emerald-400" />
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
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                ms.claimed
                  ? 'bg-emerald-950/25 border-emerald-500/35'
                  : ms.unlocked
                    ? 'bg-[#1a132c] border-[#C5A15A]/50'
                    : 'bg-[#0d0a16] border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-['Cinzel'] font-bold text-[#E8CF96]">{ms.title}</span>
                  <span className="font-mono text-[11px] text-[#D9D2C5]/65 tabular-nums">
                    {ms.dayTarget} Days
                  </span>
                </div>
                <p className="text-xs text-[#D9D2C5]/75 mt-1">{ms.rewardLabel}</p>
              </div>

              <button
                type="button"
                disabled={!ms.unlocked || ms.claimed || busy}
                onClick={() => void handleClaimWeekly(ms.id)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  ms.claimed
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                    : ms.unlocked
                      ? 'bg-[#C5A15A] text-slate-950 hover:bg-[#E8CF96]'
                      : 'bg-white/5 text-[#D9D2C5]/40 border border-white/10 cursor-not-allowed'
                }`}
              >
                {ms.claimed ? 'Claimed' : busy ? 'Claiming...' : ms.unlocked ? 'Claim Milestone' : 'Locked'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 30-Day Calendar Grid */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/10 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold text-white uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4 text-[#C5A15A]" />
            <span>Monthly Track (30 Steps)</span>
          </div>
          <span className="text-[11px] text-[#D9D2C5]/60 tabular-nums">
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
                      ? 'bg-[#1a132c] border-amber-500/45'
                      : day.isWeeklyMilestone
                        ? 'bg-[#141022] border-[#C5A15A]/35'
                        : 'bg-[#090710] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold text-white tabular-nums">
                    Day {day.dayNumber}
                  </span>
                  {day.claimed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : day.isWeeklyMilestone ? (
                    <Trophy className="w-3.5 h-3.5 text-[#C5A15A] shrink-0" />
                  ) : null}
                </div>

                <div className="flex items-start gap-2 my-1">
                  {getRewardIcon(day.rewardType)}
                  <span className="text-[11px] text-[#D9D2C5]/85 leading-snug">
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
                    className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-200 text-[10px] font-bold whitespace-nowrap shrink-0"
                  >
                    {busyCatchup ? 'Applying...' : 'Grace Catch-Up'}
                  </button>
                ) : (
                  <div className="text-[10px] text-[#D9D2C5]/45">
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
