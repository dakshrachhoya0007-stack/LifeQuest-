import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { getHeroArtwork } from '../../assets/images';
import { getHeroById } from '../../data/heroesData';
import {
  LayoutDashboard,
  User,
  Activity,
  Apple,
  Camera,
  Flame,
  Trophy,
  Map,
  Users,
  Settings,
  X,
  Flag,
  Award,
  ShoppingBag,
  Crown,
  Lock,
  Landmark,
  Brain,
  Calendar,
  Bell,
  Scroll,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { LQ_EASE } from '../Motion/RpgMotionPrimitives';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  subtitle?: string;
  goldHighlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    socialSubTab,
    setActiveTab,
    user,
    stats,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    friends,
    guildInvites,
    quests,
    achievements,
    dynamicDailyQuests,
    hallOfLegends,
    equippedLegendMap,
    rivalsState,
    unreadNotificationsCount,
    myEffectivePresence,
    seasonState,
  } = useGame();
  const prefersReduced = useReducedMotion();
  const heroDef = getHeroById(selectedHeroId);

  const incomingFriendCount = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  ).length;
  const pendingRivalsCount = rivalsState?.stats?.pendingIncomingCount || 0;

  const claimableQuestsCount = quests.filter(q => q.completed && !q.claimed).length;
  const claimableAiQuestsCount = dynamicDailyQuests.filter(q => q.completed && !q.claimed).length;
  const claimableAchievementsCount = achievements.filter(a => a.unlocked && !a.claimed).length;
  const eligibleLegendsCount = hallOfLegends.filter(
    h => h.eligibleToClaim && h.status !== 'claimed'
  ).length;
  const claimableProgressionCount =
    claimableQuestsCount + claimableAiQuestsCount + claimableAchievementsCount;

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

  const equippedLegend = user
    ? user.legendTitle
      ? {
          titleTag: user.legendTitle,
          titleStyle: user.legendTitleStyle || ('gold' as const),
          emblemIcon: user.legendEmblem || 'Crown',
        }
      : equippedLegendMap[user.id]
    : undefined;

  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Command & Training',
      items: [
        {
          id: 'dashboard',
          label: 'Command Center',
          icon: LayoutDashboard,
        },
        {
          id: 'progression',
          label: 'Quests & Achievements',
          subtitle: 'Bounties, Calendar & Skills',
          icon: Scroll,
          badge: claimableProgressionCount,
          goldHighlight: claimableProgressionCount > 0,
        },
        {
          id: 'character',
          label: 'Character Profile',
          subtitle: 'Hero Dossier & Trophies',
          icon: User,
        },
        { id: 'fitness', label: 'Fitness Log', icon: Activity },
        { id: 'nutrition', label: 'Nutrition & Meals', icon: Apple },
        { id: 'aether-vision', label: 'Aether Vision AI', icon: Camera },
        { id: 'boss-battles', label: 'Boss Battles', icon: Flame },
        { id: 'storyline', label: 'World of Aetheria', icon: Map },
      ],
    },
    {
      title: 'Fellowship',
      items: [
        {
          id: 'social',
          label: 'Social',
          subtitle: 'Leaderboard, Friends & Chat',
          icon: Users,
          badge: incomingFriendCount,
        },
        {
          id: 'seasons',
          label: 'Battle Pass',
          subtitle: 'Seasonal Rewards Track',
          icon: Crown,
          badge: claimableSeasonCount,
          goldHighlight: claimableSeasonCount > 0,
        },
        {
          id: 'rivals',
          label: 'Rivals Arena',
          icon: Trophy,
          badge: pendingRivalsCount,
        },
        { id: 'guilds', label: 'Guilds & Territory', icon: Flag, badge: guildInvites.length },
        { id: 'events', label: 'Community Events', icon: Calendar },
      ],
    },
    {
      title: 'Sanctuary & System',
      items: [
        { id: 'mentor', label: 'AI Fitness Mentor', icon: Brain },
        { id: 'museum', label: 'Records Museum', icon: Landmark },
        { id: 'store', label: 'Royal Treasury Store', icon: ShoppingBag },
        {
          id: 'hall-of-legends',
          label: 'Hall of Legends',
          icon: Award,
          badge: eligibleLegendsCount,
          goldHighlight: eligibleLegendsCount > 0,
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadNotificationsCount,
        },
        { id: 'settings', label: 'Settings & Privacy', icon: Settings },
      ],
    },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  const isNavItemActive = (id: string) => {
    if (id === 'seasons') {
      return activeTab === 'seasons' || (activeTab === 'social' && socialSubTab === 'battle-pass');
    }
    if (id === 'social') {
      return activeTab === 'social' && socialSubTab !== 'battle-pass';
    }
    if (id === 'progression') {
      return (
        activeTab === 'progression' ||
        activeTab === 'quests' ||
        activeTab === 'achievements' ||
        activeTab === 'skill-tree' ||
        activeTab === 'daily-calendar'
      );
    }
    if (id === 'character') {
      return (
        activeTab === 'character' ||
        activeTab === 'customization' ||
        activeTab === 'cards' ||
        activeTab === 'trophies'
      );
    }
    if (id === 'store') {
      return activeTab === 'store' || activeTab === 'marketplace';
    }
    if (id === 'guilds') {
      return activeTab === 'guilds' || activeTab === 'territory-wars';
    }
    if (id === 'events') {
      return activeTab === 'events' || activeTab === 'decisions';
    }
    return activeTab === id;
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isNavItemActive(item.id);

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors group cursor-pointer ${
          isActive ? 'text-[#F2EDF7]' : 'text-[#A69AAF] hover:text-[#F2EDF7] hover:bg-[#21152F]/60'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId={prefersReduced ? undefined : 'sidebar-active-pill'}
            transition={{ duration: 0.2, ease: LQ_EASE }}
            aria-hidden="true"
            className="absolute inset-0 rounded-xl bg-[#21152F] border border-[#7045A0] shadow-[0_6px_18px_-8px_rgba(112,69,160,0.65)]"
          />
        )}

        <div className="relative z-10 flex items-center gap-3 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-[#E8C777]'
                : item.goldHighlight
                ? 'text-[#D6A84B]'
                : 'text-[#766D82] group-hover:text-[#E8C777]'
            }`}
          />
          <div className="min-w-0 text-left">
            <span className="block truncate whitespace-nowrap font-semibold">
              {item.label}
            </span>
            {item.subtitle && (
              <span className="block truncate text-[10px] text-[#766D82] font-normal">
                {item.subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          {item.badge !== undefined && item.badge > 0 && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold tabular-nums ${
                item.goldHighlight
                  ? 'bg-[#D6A84B] text-[#100D18]'
                  : 'bg-[#7045A0] text-[#F2EDF7]'
              }`}
            >
              {item.badge}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#100D18]/80 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Rail */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#171220] border-r border-[#362B45] flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-61px)] lg:sticky lg:top-[61px]`}
      >
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#362B45] lg:hidden">
          <span className="font-['Cinzel'] font-bold text-[#E8C777] text-base tracking-[0.16em]">
            AETHERIA
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A69AAF] hover:text-[#F2EDF7] hover:bg-[#21152F] cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Identity Card */}
        {user && (
          <div className="p-3.5 mx-3 my-3 rounded-xl bg-[#21152F]/75 border border-[#362B45] space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={getHeroArtwork(selectedHeroId, user.characterClass)}
                  alt={heroDef.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-lg object-cover object-top border border-[#D6A84B]/50"
                />
                <PresenceBadge
                  status={myEffectivePresence}
                  size="xs"
                  className="absolute -bottom-0.5 -right-0.5"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-bold text-[#F2EDF7] truncate">{user.username}</p>
                {equippedLegend && (
                  <LegendTitleBadge
                    title={equippedLegend.titleTag}
                    style={equippedLegend.titleStyle}
                    emblemIcon={equippedLegend.emblemIcon}
                    size="xs"
                  />
                )}
                <p className="text-[11px] text-[#E8C777] font-medium flex items-center gap-1 tabular-nums truncate">
                  <Award className="w-3 h-3 text-[#D6A84B] shrink-0" />
                  Lv.{stats.level} · {heroDef.name}
                </p>
              </div>
            </div>
            {heroLocked ? (
              <div className="w-full py-1 px-2.5 rounded-lg bg-[#100D18]/80 border border-[#362B45] text-[10px] font-['Cinzel'] font-semibold uppercase tracking-wider text-[#A69AAF] flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-[#D6A84B]" />
                Champion Bound
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowHeroSelectModal(true);
                  onClose();
                }}
                className="lq-btn-secondary w-full py-1.5 rounded-lg text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider cursor-pointer"
              >
                Choose Champion
              </button>
            )}
          </div>
        )}

        {/* Navigation Groups */}
        <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {navGroups.map(group => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-['Cinzel'] font-bold uppercase tracking-[0.16em] text-[#766D82]">
                {group.title}
              </p>
              <div className="space-y-0.5">{group.items.map(renderNavButton)}</div>
            </div>
          ))}
        </nav>

        {/* Quiet Footer */}
        <div className="px-4 py-3 border-t border-[#362B45] text-[11px] text-[#766D82] flex items-center justify-between">
          <span>World of Aetheria</span>
          <span className="font-mono text-[#A69AAF] tabular-nums">{stats.aetherRank}</span>
        </div>
      </aside>
    </>
  );
};
