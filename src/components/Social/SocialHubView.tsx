import React from 'react';
import { useGame } from '../../context/GameContext';
import { LeaderboardView } from '../Leaderboard/LeaderboardView';
import { DiscoverPlayersView } from './DiscoverPlayersView';
import { ChatView } from '../Chat/ChatView';
import { AdventurersFeedView } from './AdventurersFeedView';
import { WorkoutPartiesView } from './WorkoutPartiesView';
import { FriendshipProgressView } from './FriendshipProgressView';
import { Trophy, UserPlus, MessageSquare, Newspaper, Users, HeartHandshake } from 'lucide-react';

export const SocialHubView: React.FC = () => {
  const {
    socialSubTab,
    setSocialSubTab,
    friends,
    chatMessages,
    workoutParties,
  } = useGame();

  const acceptedFriendsCount = friends.filter(f => f.status === 'accepted').length;
  const incomingRequestsCount = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  ).length;
  const activePartiesCount = workoutParties.filter(
    p => p.status !== 'completed' && p.status !== 'expired'
  ).length;

  const tabs: Array<{
    id: 'leaderboard' | 'activity-feed' | 'workout-parties' | 'friendships' | 'friends' | 'chat';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'activity-feed', label: 'Activity Feed', icon: Newspaper },
    { id: 'workout-parties', label: 'Workout Parties', icon: Users, badge: activePartiesCount },
    { id: 'friendships', label: 'Friendships', icon: HeartHandshake },
    { id: 'friends', label: 'Friends', icon: UserPlus, badge: incomingRequestsCount },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Unified Social Hub Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0E0E17] via-[#141420] to-[#1B1B2B] border border-[#8B5CF6]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(9,9,16,0.7)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]">
                Fellowship of Aetheria
              </span>
              <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
              <span className="text-[#A1A1B8] font-medium tabular-nums">
                {acceptedFriendsCount} {acceptedFriendsCount === 1 ? 'Companion' : 'Companions'}
              </span>
              <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
              <span className="text-[#A1A1B8] font-medium tabular-nums">
                {chatMessages.length} {chatMessages.length === 1 ? 'Message' : 'Messages'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-white">
              SOCIAL
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl mt-1">
              Follow friends&apos; verified achievements on the Activity Feed, train together in live Workout Parties, deepen Co-Op Friendships, and check realm standings.
            </p>
          </div>

          {/* Unified Hub Tabs */}
          <div
            role="tablist"
            aria-label="Social sections"
            className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#090910]/90 border border-white/10 rounded-xl self-start xl:self-auto"
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
                      ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white border border-[#D6A84B]/40 shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                      : 'text-[#A1A1B8] hover:text-white hover:bg-[#1B1B2B] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D6A84B]' : 'text-[#A1A1B8]/70'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#D6A84B] text-[#090910] text-[10px] font-mono font-bold tabular-nums">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Social Tab Content */}
      <div role="tabpanel">
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
