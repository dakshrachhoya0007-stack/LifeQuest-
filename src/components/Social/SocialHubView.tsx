import React from 'react';
import { useGame } from '../../context/GameContext';
import { LeaderboardView } from '../Leaderboard/LeaderboardView';
import { DiscoverPlayersView } from './DiscoverPlayersView';
import { ChatView } from '../Chat/ChatView';
import { AdventurersFeedView } from './AdventurersFeedView';
import { WorkoutPartiesView } from './WorkoutPartiesView';
import { FriendshipProgressView } from './FriendshipProgressView';
import { SeasonalProgressionView } from '../Seasons/SeasonalProgressionView';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import { RpgSubTabTransition } from '../Motion/RpgMotionPrimitives';
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
    <div className="space-y-6 pb-14 max-w-[1360px] mx-auto">
      {/* Unified Fellowship Hub Header */}
      <FeatureBanner themeId="social" className="relative overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                Fellowship of Aetheria
              </span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className="text-[#94A8C7] font-medium tabular-nums">
                {acceptedFriendsCount} {acceptedFriendsCount === 1 ? 'Companion' : 'Companions'}
              </span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className="text-[#94A8C7] font-medium tabular-nums">
                {chatMessages.length} {chatMessages.length === 1 ? 'Message' : 'Messages'}
              </span>
              {seasonState && (
                <>
                  <span className="text-[#647A9E]" aria-hidden="true">·</span>
                  <span className="text-[#38D9F5] font-mono font-semibold tabular-nums">
                    Battle Pass Tier {seasonState.playerProgress.currentTier}/50
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-[#F2F7FF] text-balance">
              FELLOWSHIP
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
              Advance your seasonal Battle Pass, train in live Workout Parties, track realm standings, and coordinate with companions.
            </p>
          </div>

          <FeatureTabBar
            tabs={tabs}
            activeId={socialSubTab}
            onSelect={setSocialSubTab}
            ariaLabel="Fellowship sections"
            layoutId="social-hub-tab"
            className="self-start xl:self-auto"
          />
        </div>
      </FeatureBanner>

      {/* Active Fellowship Tab Content */}
      <div role="tabpanel">
        <RpgSubTabTransition tabKey={socialSubTab}>
          {socialSubTab === 'battle-pass' && <SeasonalProgressionView />}
          {socialSubTab === 'leaderboard' && <LeaderboardView embedded />}
          {socialSubTab === 'activity-feed' && <AdventurersFeedView />}
          {socialSubTab === 'workout-parties' && <WorkoutPartiesView />}
          {socialSubTab === 'friendships' && <FriendshipProgressView />}
          {socialSubTab === 'friends' && <DiscoverPlayersView embedded />}
          {socialSubTab === 'chat' && <ChatView embedded />}
        </RpgSubTabTransition>
      </div>
    </div>
  );
};
