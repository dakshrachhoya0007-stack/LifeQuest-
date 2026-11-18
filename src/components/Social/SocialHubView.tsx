import React from 'react';
import { useGame } from '../../context/GameContext';
import { LeaderboardView } from '../Leaderboard/LeaderboardView';
import { DiscoverPlayersView } from './DiscoverPlayersView';
import { ChatView } from '../Chat/ChatView';
import { Trophy, UserPlus, MessageSquare } from 'lucide-react';

export const SocialHubView: React.FC = () => {
  const {
    socialSubTab,
    setSocialSubTab,
    friends,
    chatMessages,
  } = useGame();

  const acceptedFriendsCount = friends.filter(f => f.status === 'accepted').length;
  const incomingRequestsCount = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  ).length;

  const tabs: Array<{
    id: 'leaderboard' | 'friends' | 'chat';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'friends', label: 'Friends', icon: UserPlus, badge: incomingRequestsCount },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Unified Social Hub Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-[#C5A15A]/25 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Fellowship of Aetheria
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75 font-medium tabular-nums">
                {acceptedFriendsCount} {acceptedFriendsCount === 1 ? 'Companion' : 'Companions'}
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75 font-medium tabular-nums">
                {chatMessages.length} {chatMessages.length === 1 ? 'Message' : 'Messages'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-white">
              SOCIAL
            </h1>
            <p className="text-xs sm:text-sm text-[#D9D2C5]/75 max-w-2xl mt-1">
              Track realm XP standings, connect with companions, and converse across realm channels. Competitive 1v1 matchmaking now lives in its own Rivals Arena.
            </p>
          </div>

          {/* Unified Hub Tabs */}
          <div
            role="tablist"
            aria-label="Social sections"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-[#090714]/90 border border-[#C5A15A]/20 rounded-xl self-start lg:self-auto"
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
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45 shadow-md'
                      : 'text-[#D9D2C5]/65 hover:text-[#D9D2C5] hover:bg-[#1a112b]/70 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C5A15A]' : 'text-[#D9D2C5]/50'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#7046A5] text-white text-[10px] font-mono font-bold tabular-nums">
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
        {socialSubTab === 'friends' && <DiscoverPlayersView embedded />}
        {socialSubTab === 'chat' && <ChatView embedded />}
      </div>
    </div>
  );
};
