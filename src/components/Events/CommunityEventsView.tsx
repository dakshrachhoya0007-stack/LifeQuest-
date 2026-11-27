import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { CommunityDecisionsView } from './CommunityDecisionsView';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgScrollReveal,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';
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
    <FeatureTabBar
      themeId="events"
      layoutId="events-sub-tab"
      activeId={eventsSubTab}
      onSelect={id => setEventsSubTab(id)}
      tabs={[
        { id: 'events', label: 'Community Events', icon: Sparkles },
        { id: 'decisions', label: 'Community Decisions', icon: Vote },
      ]}
      className="w-fit"
    />
  );

  const timeLeftDays = evt
    ? Math.max(0, Math.ceil((Date.parse(evt.endsAt) - Date.now()) / 86400000))
    : 0;
  const announcements = communityEventState?.announcements || [];
  const limitedChallenges = evt?.limitedChallenges || [];
  const upcomingEvents = communityEventState?.upcomingEvents || [];
  const eventHistory = communityEventState?.eventHistory || [];

  return (
    <div className="space-y-6 pb-12">
      {tabSwitcher}

      <RpgSubTabTransition tabKey={eventsSubTab}>
        {eventsSubTab === 'decisions' ? (
          <CommunityDecisionsView />
        ) : communityEventLoading && !evt ? (
          <div className="lq-surface rounded-2xl p-8 text-center text-sm text-[#A69AAF]">
            Loading Realm Community Event...
          </div>
        ) : !evt || !communityEventState ? (
          <div className="lq-surface rounded-2xl p-8 text-center">
            <button
              type="button"
              onClick={() => void refreshCommunityEventState()}
              className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Reload Community Events
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Announcements Banner Strip */}
            {announcements.length > 0 && (
              <div className="lq-surface rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#E8C777]">
                  <Megaphone className="w-4 h-4 text-[#D6A84B]" />
                  Realm Herald Announcements
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {announcements.slice(0, 4).map(ann => (
                    <div
                      key={ann.id}
                      className={`rounded-xl p-3 border text-xs ${
                        ann.severity === 'milestone'
                          ? 'bg-[#49B88A]/10 border-[#49B88A]/40'
                          : ann.severity === 'alert'
                          ? 'bg-[#D6A84B]/12 border-[#D6A84B]/45'
                          : 'bg-[#100D18] border-[#362B45]'
                      }`}
                    >
                      <p className="font-bold text-[#F2EDF7]">{ann.title}</p>
                      <p className="text-[#A69AAF] mt-0.5 leading-snug">{ann.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header Chronicle Card */}
            <FeatureBanner themeId="events" className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#100D18] border border-[#D6A84B]/45 flex items-center justify-center shrink-0">
                    <GoldenWorldTreeEmblem className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#E8C777] font-semibold uppercase tracking-widest">
                      <span className="font-['Cinzel']">Realm-Wide Event</span>
                      <span className="text-[#766D82]" aria-hidden="true">·</span>
                      <span className="tabular-nums font-mono">{timeLeftDays}d remaining</span>
                      <span className="text-[#766D82]" aria-hidden="true">·</span>
                      <span className="tabular-nums font-mono">{evt.participantsCount} Participants</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7] mt-0.5">
                      {evt.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
                      {evt.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('fitness')}
                  className="lq-btn lq-btn-gold px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
                >
                  Contribute Activity
                </button>
              </div>

              {/* Collective Progress */}
              <div className="space-y-2 pt-3 border-t border-[#362B45]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-['Cinzel'] font-bold text-[#F2EDF7]">Collective Realm Points</span>
                  <span className="font-mono font-bold text-[#E8C777] tabular-nums">
                    {evt.currentGoalPoints.toLocaleString()} / {evt.targetGoalPoints.toLocaleString()} pts ({pct.toFixed(1)}%)
                  </span>
                </div>
                <AnimatedProgressBar
                  percentage={pct}
                  className="h-3 w-full rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden"
                  barClassName="bg-gradient-to-r from-[#7045A0] via-[#D6A84B] to-[#E8C777]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-[#100D18] border border-[#362B45] p-3">
                  <span className="text-[11px] text-[#A69AAF] block">Your Event Points</span>
                  <span className="text-lg font-bold font-mono text-[#E8C777] tabular-nums">
                    <AnimatedCounter value={communityEventState.playerPoints} />
                  </span>
                </div>
                <div className="rounded-xl bg-[#100D18] border border-[#362B45] p-3">
                  <span className="text-[11px] text-[#A69AAF] block">Your Verified Actions</span>
                  <span className="text-lg font-bold font-mono text-[#F2EDF7] tabular-nums">
                    <AnimatedCounter value={communityEventState.playerContributionsCount} />
                  </span>
                </div>
                <div className="rounded-xl bg-[#100D18] border border-[#362B45] p-3 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-[#A69AAF] block">Active Champions</span>
                  <span className="text-lg font-bold font-mono text-[#49B88A] tabular-nums">
                    <AnimatedCounter value={evt.participantsCount} />
                  </span>
                </div>
              </div>
            </FeatureBanner>

            {feedback && (
              <div
                className={`rounded-xl px-4 py-3 text-xs border font-medium ${
                  feedback.type === 'success'
                    ? 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#49B88A]'
                    : 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* Limited-Time Event Challenges */}
            {limitedChallenges.length > 0 && (
              <RpgScrollReveal>
                <div className="lq-surface rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D6A84B]" />
                      Limited-Time Event Challenges
                    </h2>
                    <span className="text-xs text-[#A69AAF]">
                      Verified Workouts, Habits, Study &amp; Healthy Recovery Count
                    </span>
                  </div>
                  <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                        <RpgStaggerItem key={ch.id}>
                          <div className="lq-card lq-card-interactive h-full rounded-xl p-4 flex flex-col justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="uppercase tracking-wider font-bold text-[#E8C777]">
                                  {ch.metric === 'recovery_habit'
                                    ? 'Rest & Recovery'
                                    : ch.metric.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono text-[#A69AAF] tabular-nums">
                                  +{ch.rewardXp} XP · +{ch.rewardGold}g
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#F2EDF7]">{ch.title}</p>
                              <p className="text-xs text-[#A69AAF] leading-snug">{ch.description}</p>
                              {extras.length > 0 && (
                                <p className="text-[11px] font-semibold text-[#E8C777]">
                                  Bonus Unlock: {extras.join(' + ')}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-mono text-[#A69AAF] tabular-nums">
                                  <span>Progress</span>
                                  <span>
                                    {Math.min(prog.current, prog.target)} / {prog.target} ({chPct}%)
                                  </span>
                                </div>
                                <AnimatedProgressBar
                                  percentage={chPct}
                                  className="w-full h-1.5 rounded-full bg-[#100D18] overflow-hidden border border-[#362B45]"
                                  barClassName={
                                    prog.completed
                                      ? 'bg-[#49B88A]'
                                      : 'bg-gradient-to-r from-[#7045A0] to-[#D6A84B]'
                                  }
                                  shimmer={false}
                                />
                              </div>

                              <button
                                type="button"
                                disabled={!prog.completed || prog.claimed || claimingId === ch.id}
                                onClick={() => void handleClaimChallenge(ch.id, ch.title)}
                                className={`lq-btn w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                  prog.claimed
                                    ? 'bg-[#49B88A]/12 text-[#49B88A] border border-[#49B88A]/45'
                                    : prog.completed
                                    ? 'lq-btn-gold cursor-pointer'
                                    : 'bg-[#100D18] text-[#766D82] border border-[#362B45] cursor-not-allowed'
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
                        </RpgStaggerItem>
                      );
                    })}
                  </RpgStaggerGrid>
                </div>
              </RpgScrollReveal>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Milestones */}
              <div className="lg:col-span-6 lq-surface rounded-2xl p-5 space-y-4">
                <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
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
                        className="rounded-xl bg-[#100D18] border border-[#362B45] p-4 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#F2EDF7]">{m.title}</p>
                          <p className="text-xs text-[#A69AAF] font-mono tabular-nums mt-0.5">
                            Goal: {m.targetPoints.toLocaleString()} pts · +{m.rewardXp} XP · +{m.rewardGold}g
                          </p>
                          {exclusives.length > 0 && (
                            <p className="text-[11px] text-[#E8C777] font-semibold mt-0.5">
                              Includes: {exclusives.join(' + ')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!eligible || claimed || claimingId === m.id}
                          onClick={() => void handleClaim(m.id)}
                          className={`lq-btn px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 ${
                            claimed
                              ? 'bg-[#49B88A]/12 text-[#49B88A] border border-[#49B88A]/45'
                              : eligible
                              ? 'lq-btn-gold cursor-pointer'
                              : 'bg-[#171220] text-[#766D82] border border-[#362B45] cursor-not-allowed'
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
              <div className="lg:col-span-6 lq-surface rounded-2xl p-5 space-y-4">
                <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#D6A84B]" />
                  Top Event Stewards
                </h2>
                {communityEventState.topContributors.length === 0 ? (
                  <p className="text-xs text-[#A69AAF]">
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
                              ? 'bg-[#21152F] border-[#D6A84B]/50'
                              : 'bg-[#100D18] border-[#362B45]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[#E8C777] tabular-nums">
                              #{c.rank}
                            </span>
                            <span className="font-bold text-[#F2EDF7]">
                              {c.username} {isMe && <span className="text-[#E8C777]">(You)</span>}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[#49B88A] tabular-nums">
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
                <div className="lq-surface rounded-2xl p-5 space-y-3">
                  <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#D6A84B]" />
                    Upcoming Realm Gatherings
                  </h2>
                  {upcomingEvents.length === 0 ? (
                    <p className="text-xs text-[#A69AAF]">
                      Upcoming community schedules will be posted here ahead of the next equinox.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {upcomingEvents.map(up => (
                        <div
                          key={up.id}
                          className="rounded-xl bg-[#100D18] border border-[#362B45] p-3.5 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-[#E8C777] uppercase">{up.subtitle || 'Scheduled'}</span>
                            <span className="font-mono text-[#A69AAF] tabular-nums">
                              Starts {new Date(up.startsAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-[#F2EDF7]">{up.title}</p>
                          <p className="text-xs text-[#A69AAF]">{up.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lq-surface rounded-2xl p-5 space-y-3">
                  <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                    <History className="w-4 h-4 text-[#D6A84B]" />
                    Past Event Archive
                  </h2>
                  {eventHistory.length === 0 ? (
                    <p className="text-xs text-[#A69AAF]">
                      Completed realm festivals and collective tallies are archived here permanently.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {eventHistory.map(hist => (
                        <div
                          key={hist.id}
                          className="rounded-xl bg-[#100D18] border border-[#362B45] p-3.5 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-[#F2EDF7]">{hist.title}</span>
                            <span className="font-mono text-[#49B88A] tabular-nums">
                              {hist.finalPoints.toLocaleString()} / {hist.targetGoalPoints.toLocaleString()} pts
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A69AAF] tabular-nums">
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
        )}
      </RpgSubTabTransition>
    </div>
  );
};
