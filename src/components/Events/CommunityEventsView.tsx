import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { GoldenWorldTreeEmblem } from '../Welcome/WelcomeLanding';
import { Award, Clock, Sparkles, Trophy, Users } from 'lucide-react';

export const CommunityEventsView: React.FC = () => {
  const {
    user,
    communityEventState,
    communityEventLoading,
    refreshCommunityEventState,
    claimCommunityMilestone,
    setActiveTab,
  } = useGame();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    void refreshCommunityEventState();
  }, []);

  const evt = communityEventState?.event;
  const pct = useMemo(() => {
    if (!evt || evt.targetGoalPoints <= 0) return 0;
    return Math.min(100, (evt.currentGoalPoints / evt.targetGoalPoints) * 100);
  }, [evt]);

  const handleClaim = async (milestoneId: string) => {
    setClaimingId(milestoneId);
    setFeedback(null);
    try {
      const res = await claimCommunityMilestone(milestoneId);
      if (res.success) {
        setFeedback({ type: 'success', text: 'Community Event milestone honor claimed!' });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not claim milestone.' });
      }
    } finally {
      setClaimingId(null);
    }
  };

  if (communityEventLoading && !evt) {
    return (
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-8 text-center text-sm text-[#D9D2C5]/70">
        Loading Realm Community Event...
      </div>
    );
  }

  if (!evt || !communityEventState) {
    return (
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-8 text-center">
        <button
          type="button"
          onClick={() => void refreshCommunityEventState()}
          className="px-4 py-2 rounded-lg bg-[#251638] border border-[#C5A15A]/40 text-xs font-semibold text-[#C5A15A]"
        >
          Reload Community Events
        </button>
      </div>
    );
  }

  const timeLeftDays = Math.max(0, Math.ceil((Date.parse(evt.endsAt) - Date.now()) / 86400000));

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Chronicle Card */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-[#C5A15A]/25 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a122b] border border-[#C5A15A]/45 flex items-center justify-center shrink-0">
              <GoldenWorldTreeEmblem className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#C5A15A] font-semibold uppercase tracking-widest">
                <span className="font-['Cinzel']">Realm-Wide Event</span>
                <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                <span className="tabular-nums">{timeLeftDays}d remaining</span>
                <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                <span className="tabular-nums">{evt.participantsCount} Participants</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white mt-0.5">
                {evt.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#D9D2C5]/75 max-w-2xl mt-1">
                {evt.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('fitness')}
            className="px-4 py-2.5 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914] font-bold text-xs whitespace-nowrap shrink-0 self-start md:self-auto"
          >
            Contribute Activity
          </button>
        </div>

        {/* Collective Progress */}
        <div className="space-y-2 pt-2 border-t border-[#C5A15A]/15">
          <div className="flex items-center justify-between text-xs">
            <span className="font-['Cinzel'] font-bold text-[#D9D2C5]">Collective Realm Points</span>
            <span className="font-mono font-bold text-[#C5A15A] tabular-nums">
              {evt.currentGoalPoints.toLocaleString()} / {evt.targetGoalPoints.toLocaleString()} pts ({pct.toFixed(1)}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#090714] border border-[#C5A15A]/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7046A5] via-[#9C6CE0] to-[#C5A15A] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3">
            <span className="text-[11px] text-[#D9D2C5]/60 block">Your Event Points</span>
            <span className="text-lg font-bold font-mono text-[#C5A15A] tabular-nums">
              {communityEventState.playerPoints.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3">
            <span className="text-[11px] text-[#D9D2C5]/60 block">Your Verified Actions</span>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {communityEventState.playerContributionsCount}
            </span>
          </div>
          <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#D9D2C5]/60 block">Active Champions</span>
            <span className="text-lg font-bold font-mono text-emerald-300 tabular-nums">
              {evt.participantsCount}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Milestones */}
        <div className="lg:col-span-6 rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-4">
          <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C5A15A]" />
            Realm Event Milestones
          </h2>
          <div className="space-y-3">
            {evt.milestones.map(m => {
              const unlocked = evt.currentGoalPoints >= m.targetPoints;
              const claimed = communityEventState.claimedMilestoneIds.includes(m.id);
              const eligible = unlocked && communityEventState.playerContributionsCount >= 1;
              return (
                <div
                  key={m.id}
                  className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{m.title}</p>
                    <p className="text-xs text-[#D9D2C5]/65 font-mono tabular-nums mt-0.5">
                      Goal: {m.targetPoints.toLocaleString()} pts · +{m.rewardXp} XP · +{m.rewardGold}g
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!eligible || claimed || claimingId === m.id}
                    onClick={() => void handleClaim(m.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 ${
                      claimed
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40'
                        : eligible
                        ? 'bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914]'
                        : 'bg-[#1f1833] text-[#D9D2C5]/40 cursor-not-allowed'
                    }`}
                  >
                    {claimed ? 'Claimed' : eligible ? 'Claim Honor' : unlocked ? 'Contribute 1+' : 'Locked'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="lg:col-span-6 rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-4">
          <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#C5A15A]" />
            Top Event Stewards
          </h2>
          {communityEventState.topContributors.length === 0 ? (
            <p className="text-xs text-[#D9D2C5]/60">
              Complete any verified workout, habit, or study session to open the festival chronicle.
            </p>
          ) : (
            <div className="space-y-2">
              {communityEventState.topContributors.map(c => {
                const isMe = c.userId === user?.id;
                return (
                  <div
                    key={c.userId}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border text-xs ${
                      isMe
                        ? 'bg-[#251638]/70 border-[#C5A15A]/45'
                        : 'bg-[#151022] border-[#C5A15A]/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#C5A15A] tabular-nums">
                        #{c.rank}
                      </span>
                      <span className="font-bold text-white">
                        {c.username} {isMe && <span className="text-[#C5A15A]">(You)</span>}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {c.points.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
