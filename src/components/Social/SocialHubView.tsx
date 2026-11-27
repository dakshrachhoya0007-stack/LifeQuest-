import React from 'react';
import { useGame } from '../../context/GameContext';
import { LeaderboardView } from '../Leaderboard/LeaderboardView';
import { DiscoverPlayersView } from './DiscoverPlayersView';
import { ChatView } from '../Chat/ChatView';
import { AdventurersFeedView } from './AdventurersFeedView';
import { WorkoutPartiesView } from './WorkoutPartiesView';
import { FriendshipProgressView } from './FriendshipProgressView';
import { SeasonalProgressionView } from '../Seasons/SeasonalProgressionView';
import { Crown, Trophy, UserPlus, MessageSquare, Newspaper, Users, HeartHandshake } from 'lucide-react';

export const SocialHubView: React.FC = () => {
  const {
    socialSubTab,
    setSocialSubTab,
    friends,
    chatMessages,
    workoutParties,
    seasonState,
  } = useGame();

  const acceptedFriendsCount = friends.filter(f => f.status === 'accepted').length;
  const incomingRequestsCount = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  ).length;
  const activePartiesCount = workoutParties.filter(
    p => p.status !== 'completed' && p.status !== 'expired'
  ).length;
  const claimableSeasonCount = seasonState
    ? Object.values(seasonState.playerProgress.challengeProgress || {}).filter(
        c => c.completed && !c.claimed
      ).length +
      seasonState.season.milestones.filter(
        m =>
          seasonState.playerProgress.seasonXp >= m.requiredSeasonXp &&
          (!seasonState.playerProgress.claimedMilestoneIds.includes(m.id) ||
            (Boolean(seasonState.playerProgress.eliteUnlocked) &&
              Boolean(m.eliteRewardLabel) &&
              !(seasonState.playerProgress.claimedEliteMilestoneIds || []).includes(m.id)))
      ).length
    : 0;

  const tabs: Array<{
    id:
      | 'battle-pass'
      | 'leaderboard'
      | 'activity-feed'
      | 'workout-parties'
      | 'friendships'
      | 'friends'
      | 'chat';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'battle-pass', label: 'Battle Pass', icon: Crown, badge: claimableSeasonCount },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'activity-feed', label: 'Activity Feed', icon: Newspaper },
    { id: 'workout-parties', label: 'Workout Parties', icon: Users, badge: activePartiesCount },
    { id: 'friendships', label: 'Friendships', icon: HeartHandshake },
    { id: 'friends', label: 'Friends', icon: UserPlus, badge: incomingRequestsCount },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Unified Fellowship Hub Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#061225] via-[#0A1930] to-[#102440] border border-[#1677FF]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(2,8,20,0.72)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                Fellowship of Aetheria
              </span>
              <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC] font-medium tabular-nums">
                {acceptedFriendsCount} {acceptedFriendsCount === 1 ? 'Companion' : 'Companions'}
              </span>
              <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC] font-medium tabular-nums">
                {chatMessages.length} {chatMessages.length === 1 ? 'Message' : 'Messages'}
              </span>
              {seasonState && (
                <>
                  <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
                  <span className="text-[#00D9FF] font-mono font-semibold tabular-nums">
                    Season Tier {seasonState.playerProgress.currentTier}/50
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-[#FFFFFF]">
              FELLOWSHIP
            </h1>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Advance your seasonal Battle Pass, train in live Workout Parties, track realm standings, and coordinate with companions.
            </p>
          </div>

          {/* Unified Fellowship Hub Tabs */}
          <div
            role="tablist"
            aria-label="Fellowship sections"
            className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#061225]/90 border border-[#1677FF]/30 rounded-xl self-start xl:self-auto max-w-full"
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = socialSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setSocialSubTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-[#FFFFFF] border border-[#00D9FF]/55 shadow-[0_0_16px_rgba(0,217,255,0.28)]'
                      : 'text-[#A9B8CC] hover:text-[#FFFFFF] hover:bg-[#102440] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFFFFF]' : 'text-[#00D9FF]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                        isActive ? 'bg-[#061225] text-[#00D9FF]' : 'bg-[#00D9FF] text-[#061225]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Fellowship Tab Content */}
      <div role="tabpanel">
        {socialSubTab === 'battle-pass' && <SeasonalProgressionView />}
        {socialSubTab === 'leaderboard' && <LeaderboardView embedded />}
        {socialSubTab === 'activity-feed' && <AdventurersFeedView />}
        {socialSubTab === 'workout-parties' && <WorkoutPartiesView />}
        {socialSubTab === 'friendships' && <FriendshipProgressView />}
        {socialSubTab === 'friends' && <DiscoverPlayersView embedded />}
        {socialSubTab === 'chat' && <ChatView embedded />}
      </div>
    </div>
  );
};
