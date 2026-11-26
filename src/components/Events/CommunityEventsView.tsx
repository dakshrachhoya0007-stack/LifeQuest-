import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { CommunityDecisionsView } from './CommunityDecisionsView';
import { Award, CalendarClock, CheckCircle2, History, Megaphone, Sparkles, Trophy, Vote } from 'lucide-react';

export const CommunityEventsView: React.FC = () => {
  const {
    user,
    eventsSubTab,
    setEventsSubTab,
    communityEventState,
    communityEventLoading,
    refreshCommunityEventState,
    claimCommunityMilestone,
    claimCommunityChallenge,
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

  const handleClaimChallenge = async (challengeId: string, title: string) => {
    setClaimingId(challengeId);
    setFeedback(null);
    try {
      const res = await claimCommunityChallenge(challengeId);
      if (res.success) {
        setFeedback({ type: 'success', text: `Claimed event challenge "${title}"!` });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not claim event challenge.' });
      }
    } finally {
      setClaimingId(null);
    }
  };

  const tabSwitcher = (
    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#19122B] border border-[#FFAA45]/30 w-fit">
      <button
        type="button"
        onClick={() => setEventsSubTab('events')}
        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
          eventsSubTab === 'events'
            ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] text-[#100D1C] shadow-[0_0_12px_rgba(255,170,69,0.3)]'
            : 'text-[#BEB4D6] hover:text-[#F7F4FF] border border-transparent'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Community Events
      </button>
      <button
        type="button"
        onClick={() => setEventsSubTab('decisions')}
        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
          eventsSubTab === 'decisions'
            ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] text-[#100D1C] shadow-[0_0_12px_rgba(255,170,69,0.3)]'
            : 'text-[#BEB4D6] hover:text-[#F7F4FF] border border-transparent'
        }`}
      >
        <Vote className="w-3.5 h-3.5" />
        Community Decisions
      </button>
    </div>
  );

  if (eventsSubTab === 'decisions') {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <CommunityDecisionsView />
      </div>
    );
  }

  if (communityEventLoading && !evt) {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#FFAA45]/30 p-8 text-center text-sm text-[#BEB4D6]">
          Loading Realm Community Event...
        </div>
      </div>
    );
  }

  if (!evt || !communityEventState) {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#FFAA45]/30 p-8 text-center">
          <button
            type="button"
            onClick={() => void refreshCommunityEventState()}
            className="px-4 py-2 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#FFAA45]/40 hover:border-[#FFAA45]/70 text-xs font-semibold text-[#FFAA45] transition-all"
          >
            Reload Community Events
          </button>
        </div>
      </div>
    );
  }

  const timeLeftDays = Math.max(0, Math.ceil((Date.parse(evt.endsAt) - Date.now()) / 86400000));
  const announcements = communityEventState.announcements || [];
  const limitedChallenges = evt.limitedChallenges || [];
  const upcomingEvents = communityEventState.upcomingEvents || [];
  const eventHistory = communityEventState.eventHistory || [];

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {tabSwitcher}

      {/* Announcements Banner Strip */}
      {announcements.length > 0 && (
        <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#FFAA45]/30 p-4 space-y-2 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#FFAA45]">
            <Megaphone className="w-4 h-4" />
            Realm Herald Announcements
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {announcements.slice(0, 4).map(ann => (
              <div
                key={ann.id}
                className={`rounded-xl p-3 border text-xs ${
                  ann.severity === 'milestone'
                    ? 'bg-[#35D69A]/15 border-[#35D69A]/45'
                    : ann.severity === 'alert'
                    ? 'bg-[#FFAA45]/15 border-[#FFAA45]/45'
                    : 'bg-[#100D1C] border-[#A875FF]/30'
                }`}
              >
                <p className="font-bold text-[#F7F4FF]">{ann.title}</p>
                <p className="text-[#BEB4D6] mt-0.5 leading-snug">{ann.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Chronicle Card */}
      <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#FFAA45]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,5,24,0.65)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#19122B] border border-[#FFAA45]/45 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,170,69,0.2)]">
              <GoldenWorldTreeEmblem className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#FFAA45] font-semibold uppercase tracking-widest">
                <span className="font-['Cinzel']">Realm-Wide Event</span>
                <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                <span className="tabular-nums">{timeLeftDays}d remaining</span>
                <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                <span className="tabular-nums">{evt.participantsCount} Participants</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F7F4FF] mt-0.5">
                {evt.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#BEB4D6] max-w-2xl mt-1">
                {evt.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('fitness')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#f47587] hover:to-[#ffbe6b] text-[#100D1C] shadow-[0_0_16px_rgba(255,170,69,0.3)] font-bold text-xs whitespace-nowrap shrink-0 self-start md:self-auto transition-all"
          >
            Contribute Activity
          </button>
        </div>

        {/* Collective Progress */}
        <div className="space-y-2 pt-2 border-t border-[#A875FF]/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-['Cinzel'] font-bold text-[#F7F4FF]">Collective Realm Points</span>
            <span className="font-mono font-bold text-[#FFAA45] tabular-nums">
              {evt.currentGoalPoints.toLocaleString()} / {evt.targetGoalPoints.toLocaleString()} pts ({pct.toFixed(1)}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#100D1C] border border-[#FFAA45]/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F05B70] via-[#FFAA45] to-[#FFD978] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-3">
            <span className="text-[11px] text-[#BEB4D6] block">Your Event Points</span>
            <span className="text-lg font-bold font-mono text-[#FFAA45] tabular-nums">
              {communityEventState.playerPoints.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-3">
            <span className="text-[11px] text-[#BEB4D6] block">Your Verified Actions</span>
            <span className="text-lg font-bold font-mono text-[#F7F4FF] tabular-nums">
              {communityEventState.playerContributionsCount}
            </span>
          </div>
          <div className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-3 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#BEB4D6] block">Active Champions</span>
            <span className="text-lg font-bold font-mono text-[#35D69A] tabular-nums">
              {evt.participantsCount}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            feedback.type === 'success'
              ? 'bg-[#35D69A]/15 border-[#35D69A]/45 text-[#35D69A]'
              : 'bg-[#36111F]/85 border-[#F05B70]/45 text-[#F05B70]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Limited-Time Event Challenges */}
      {limitedChallenges.length > 0 && (
        <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-4 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFAA45]" />
              Limited-Time Event Challenges
            </h2>
            <span className="text-xs text-[#BEB4D6]">
              Verified Workouts, Habits, Study &amp; Healthy Recovery Count
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {limitedChallenges.map(ch => {
              const prog = communityEventState.challengeProgress?.[ch.id] || {
                current: 0,
                target: ch.targetCount,
                completed: false,
                claimed: (communityEventState.claimedChallengeIds || []).includes(ch.id),
              };
              const chPct = Math.min(100, Math.round((prog.current / Math.max(1, prog.target)) * 100));
              const extras = [
                ch.rewardCardId ? 'Collectible Card' : null,
                ch.rewardTitleId ? 'Exclusive Title' : null,
                ch.rewardCosmeticId ? 'Cosmetic Trim' : null,
              ].filter(Boolean);
              return (
                <div
                  key={ch.id}
                  className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="uppercase tracking-wider font-bold text-[#FFAA45]">
                        {ch.metric === 'recovery_habit'
                          ? 'Rest & Recovery'
                          : ch.metric.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[#BEB4D6] tabular-nums">
                        +{ch.rewardXp} XP · +{ch.rewardGold}g
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#F7F4FF]">{ch.title}</p>
                    <p className="text-xs text-[#BEB4D6] leading-snug">{ch.description}</p>
                    {extras.length > 0 && (
                      <p className="text-[11px] font-semibold text-[#FFD978]">
                        Bonus Unlock: {extras.join(' + ')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-[#BEB4D6] tabular-nums">
                        <span>Progress</span>
                        <span>
                          {Math.min(prog.current, prog.target)} / {prog.target} ({chPct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#19122B] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            prog.completed ? 'bg-[#35D69A]' : 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45]'
                          }`}
                          style={{ width: `${chPct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!prog.completed || prog.claimed || claimingId === ch.id}
                      onClick={() => void handleClaimChallenge(ch.id, ch.title)}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                        prog.claimed
                          ? 'bg-[#35D69A]/15 text-[#35D69A] border border-[#35D69A]/45'
                          : prog.completed
                          ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#f47587] hover:to-[#ffbe6b] text-[#100D1C] shadow-[0_0_16px_rgba(255,170,69,0.3)]'
                          : 'bg-[#19122B] text-[#BEB4D6]/45 border border-[#A875FF]/15 cursor-not-allowed'
                      }`}
                    >
                      {prog.claimed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Claimed
                        </>
                      ) : claimingId === ch.id ? (
                        'Claiming...'
                      ) : prog.completed ? (
                        'Claim Challenge'
                      ) : (
                        'In Progress'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Milestones */}
        <div className="lg:col-span-6 rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-4 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
          <h2 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FFAA45]" />
            Realm Event Milestones
          </h2>
          <div className="space-y-3">
            {evt.milestones.map(m => {
              const unlocked = evt.currentGoalPoints >= m.targetPoints;
              const claimed = communityEventState.claimedMilestoneIds.includes(m.id);
              const eligible = unlocked && communityEventState.playerContributionsCount >= 1;
              const exclusives = [
                m.rewardCardId ? 'Limited Card' : null,
                m.rewardTitleId ? 'Exclusive Title' : null,
                m.rewardCosmeticId ? 'Event Cosmetic' : null,
              ].filter(Boolean);
              return (
                <div
                  key={m.id}
                  className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#F7F4FF]">{m.title}</p>
                    <p className="text-xs text-[#BEB4D6] font-mono tabular-nums mt-0.5">
                      Goal: {m.targetPoints.toLocaleString()} pts · +{m.rewardXp} XP · +{m.rewardGold}g
                    </p>
                    {exclusives.length > 0 && (
                      <p className="text-[11px] text-[#FFD978] font-semibold mt-0.5">
                        Includes: {exclusives.join(' + ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!eligible || claimed || claimingId === m.id}
                    onClick={() => void handleClaim(m.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      claimed
                        ? 'bg-[#35D69A]/15 text-[#35D69A] border border-[#35D69A]/45'
                        : eligible
                        ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#f47587] hover:to-[#ffbe6b] text-[#100D1C] shadow-[0_0_16px_rgba(255,170,69,0.3)]'
                        : 'bg-[#19122B] text-[#BEB4D6]/45 border border-[#A875FF]/15 cursor-not-allowed'
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
        <div className="lg:col-span-6 rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-4 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
          <h2 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFD978]" />
            Top Event Stewards
          </h2>
          {communityEventState.topContributors.length === 0 ? (
            <p className="text-xs text-[#BEB4D6]">
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
                        ? 'bg-[#19122B] border-[#FFAA45]/50 shadow-[0_0_12px_rgba(255,170,69,0.14)]'
                        : 'bg-[#100D1C] border-[#A875FF]/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#FFAA45] tabular-nums">
                        #{c.rank}
                      </span>
                      <span className="font-bold text-[#F7F4FF]">
                        {c.username} {isMe && <span className="text-[#FFAA45]">(You)</span>}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#35D69A] tabular-nums">
                      {c.points.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events & Past Event Archive */}
      {(upcomingEvents.length > 0 || eventHistory.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-3 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#FFAA45]" />
              Upcoming Realm Gatherings
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-[#BEB4D6]">
                Upcoming community schedules will be posted here ahead of the next equinox.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map(up => (
                  <div
                    key={up.id}
                    className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[#FFAA45] uppercase">{up.subtitle || 'Scheduled'}</span>
                      <span className="font-mono text-[#BEB4D6] tabular-nums">
                        Starts {new Date(up.startsAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#F7F4FF]">{up.title}</p>
                    <p className="text-xs text-[#BEB4D6]">{up.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-3 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <History className="w-4 h-4 text-[#FFAA45]" />
              Past Event Archive
            </h2>
            {eventHistory.length === 0 ? (
              <p className="text-xs text-[#BEB4D6]">
                Completed realm festivals and collective tallies are archived here permanently.
              </p>
            ) : (
              <div className="space-y-2.5">
                {eventHistory.map(hist => (
                  <div
                    key={hist.id}
                    className="rounded-xl bg-[#100D1C] border border-[#A875FF]/25 p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[#F7F4FF]">{hist.title}</span>
                      <span className="font-mono text-[#35D69A] tabular-nums">
                        {hist.finalPoints.toLocaleString()} / {hist.targetGoalPoints.toLocaleString()} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-[#BEB4D6] tabular-nums">
                      {hist.participantsCount} champions · {hist.completedMilestonesCount} milestones · Concluded {new Date(hist.endedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
