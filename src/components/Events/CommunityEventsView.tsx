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
    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0E0E17] border border-white/10 w-fit">
      <button
        type="button"
        onClick={() => setEventsSubTab('events')}
        className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
          eventsSubTab === 'events'
            ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]'
            : 'text-[#A1A1B8] hover:text-white border border-transparent'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Community Events
      </button>
      <button
        type="button"
        onClick={() => setEventsSubTab('decisions')}
        className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
          eventsSubTab === 'decisions'
            ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]'
            : 'text-[#A1A1B8] hover:text-white border border-transparent'
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
        <div className="rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-8 text-center text-sm text-[#A1A1B8]">
          Loading Realm Community Event...
        </div>
      </div>
    );
  }

  if (!evt || !communityEventState) {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <div className="rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-8 text-center">
          <button
            type="button"
            onClick={() => void refreshCommunityEventState()}
            className="px-4 py-2 rounded-lg bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/40 hover:border-[#8B5CF6] text-xs font-semibold text-[#8B5CF6] transition-all"
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
        <div className="rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-[#D6A84B]/25 p-4 space-y-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#D6A84B]">
            <Megaphone className="w-4 h-4" />
            Realm Herald Announcements
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {announcements.slice(0, 4).map(ann => (
              <div
                key={ann.id}
                className={`rounded-xl p-3 border text-xs ${
                  ann.severity === 'milestone'
                    ? 'bg-[#34D399]/10 border-[#34D399]/35'
                    : ann.severity === 'alert'
                    ? 'bg-[#FBBF24]/10 border-[#FBBF24]/35'
                    : 'bg-[#0E0E17] border-white/10'
                }`}
              >
                <p className="font-bold text-white">{ann.title}</p>
                <p className="text-[#A1A1B8] mt-0.5 leading-snug">{ann.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Chronicle Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#141420] via-[#1B1B2B]/80 to-[#141420] backdrop-blur-md border border-[#D6A84B]/30 p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.6)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0E0E17] border border-[#D6A84B]/45 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(214,168,75,0.22)]">
              <GoldenWorldTreeEmblem className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#D6A84B] font-semibold uppercase tracking-widest">
                <span className="font-['Cinzel']">Realm-Wide Event</span>
                <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
                <span className="tabular-nums">{timeLeftDays}d remaining</span>
                <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
                <span className="tabular-nums">{evt.participantsCount} Participants</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white mt-0.5">
                {evt.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl mt-1">
                {evt.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('fitness')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BFA] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)] font-bold text-xs whitespace-nowrap shrink-0 self-start md:self-auto transition-all"
          >
            Contribute Activity
          </button>
        </div>

        {/* Collective Progress */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-['Cinzel'] font-bold text-white">Collective Realm Points</span>
            <span className="font-mono font-bold text-[#D6A84B] tabular-nums">
              {evt.currentGoalPoints.toLocaleString()} / {evt.targetGoalPoints.toLocaleString()} pts ({pct.toFixed(1)}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#090910] border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#D6A84B] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#0E0E17] border border-white/10 p-3">
            <span className="text-[11px] text-[#A1A1B8] block">Your Event Points</span>
            <span className="text-lg font-bold font-mono text-[#D6A84B] tabular-nums">
              {communityEventState.playerPoints.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl bg-[#0E0E17] border border-white/10 p-3">
            <span className="text-[11px] text-[#A1A1B8] block">Your Verified Actions</span>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {communityEventState.playerContributionsCount}
            </span>
          </div>
          <div className="rounded-xl bg-[#0E0E17] border border-white/10 p-3 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#A1A1B8] block">Active Champions</span>
            <span className="text-lg font-bold font-mono text-[#34D399] tabular-nums">
              {evt.participantsCount}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            feedback.type === 'success'
              ? 'bg-[#34D399]/10 border-[#34D399]/40 text-[#34D399]'
              : 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[#FB7185]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Limited-Time Event Challenges */}
      {limitedChallenges.length > 0 && (
        <div className="rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-5 space-y-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              Limited-Time Event Challenges
            </h2>
            <span className="text-xs text-[#A1A1B8]">
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
                  className="rounded-xl bg-[#0E0E17] border border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="uppercase tracking-wider font-bold text-[#8B5CF6]">
                        {ch.metric === 'recovery_habit'
                          ? 'Rest & Recovery'
                          : ch.metric.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[#A1A1B8] tabular-nums">
                        +{ch.rewardXp} XP · +{ch.rewardGold}g
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">{ch.title}</p>
                    <p className="text-xs text-[#A1A1B8] leading-snug">{ch.description}</p>
                    {extras.length > 0 && (
                      <p className="text-[11px] font-semibold text-[#D6A84B]">
                        Bonus Unlock: {extras.join(' + ')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-[#A1A1B8] tabular-nums">
                        <span>Progress</span>
                        <span>
                          {Math.min(prog.current, prog.target)} / {prog.target} ({chPct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#090910] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            prog.completed ? 'bg-[#34D399]' : 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6]'
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
                          ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/35'
                          : prog.completed
                          ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BFA] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                          : 'bg-[#141420] text-[#A1A1B8]/45 border border-white/10 cursor-not-allowed'
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
        <div className="lg:col-span-6 rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-5 space-y-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#D6A84B]" />
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
                  className="rounded-xl bg-[#0E0E17] border border-white/10 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{m.title}</p>
                    <p className="text-xs text-[#A1A1B8] font-mono tabular-nums mt-0.5">
                      Goal: {m.targetPoints.toLocaleString()} pts · +{m.rewardXp} XP · +{m.rewardGold}g
                    </p>
                    {exclusives.length > 0 && (
                      <p className="text-[11px] text-[#D6A84B] font-semibold mt-0.5">
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
                        ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/35'
                        : eligible
                        ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BFA] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                        : 'bg-[#141420] text-[#A1A1B8]/45 border border-white/10 cursor-not-allowed'
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
        <div className="lg:col-span-6 rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-5 space-y-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#D6A84B]" />
            Top Event Stewards
          </h2>
          {communityEventState.topContributors.length === 0 ? (
            <p className="text-xs text-[#A1A1B8]">
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
                        ? 'bg-[#1B1B2B] border-[#8B5CF6]/55 shadow-[0_0_12px_rgba(139,92,246,0.16)]'
                        : 'bg-[#0E0E17] border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#D6A84B] tabular-nums">
                        #{c.rank}
                      </span>
                      <span className="font-bold text-white">
                        {c.username} {isMe && <span className="text-[#8B5CF6]">(You)</span>}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#34D399] tabular-nums">
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
          <div className="rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-5 space-y-3 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#D6A84B]" />
              Upcoming Realm Gatherings
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-[#A1A1B8]">
                Upcoming community schedules will be posted here ahead of the next equinox.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map(up => (
                  <div
                    key={up.id}
                    className="rounded-xl bg-[#0E0E17] border border-white/10 p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[#D6A84B] uppercase">{up.subtitle || 'Scheduled'}</span>
                      <span className="font-mono text-[#A1A1B8] tabular-nums">
                        Starts {new Date(up.startsAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">{up.title}</p>
                    <p className="text-xs text-[#A1A1B8]">{up.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-white/10 p-5 space-y-3 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#8B5CF6]" />
              Past Event Archive
            </h2>
            {eventHistory.length === 0 ? (
              <p className="text-xs text-[#A1A1B8]">
                Completed realm festivals and collective tallies are archived here permanently.
              </p>
            ) : (
              <div className="space-y-2.5">
                {eventHistory.map(hist => (
                  <div
                    key={hist.id}
                    className="rounded-xl bg-[#0E0E17] border border-white/10 p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-white">{hist.title}</span>
                      <span className="font-mono text-[#34D399] tabular-nums">
                        {hist.finalPoints.toLocaleString()} / {hist.targetGoalPoints.toLocaleString()} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1B8] tabular-nums">
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
