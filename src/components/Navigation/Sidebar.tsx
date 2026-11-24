import React from 'react';
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
  Zap,
  ShoppingBag,
  Crown,
  Lock,
  Landmark,
  Brain,
  Calendar,
  Bell,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { PresenceBadge } from '../Brand/PresenceBadge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
  subtitle?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
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
  } = useGame();
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
    claimableQuestsCount + claimableAiQuestsCount + claimableAchievementsCount + eligibleLegendsCount;

  const equippedLegend = user
    ? user.legendTitle
      ? {
          titleTag: user.legendTitle,
          titleStyle: user.legendTitleStyle || ('gold' as const),
          emblemIcon: user.legendEmblem || 'Crown',
        }
      : equippedLegendMap[user.id]
    : undefined;

  const mobileTopBarItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rivals', label: 'Rivals Arena', icon: Trophy, badge: pendingRivalsCount, highlight: true },
    { id: 'aether-vision', label: 'Aether Vision AI', icon: Camera, highlight: true },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'boss-battles', label: 'Boss Battles', icon: Flame },
  ];

  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Adventure & Wellness',
      items: [
        {
          id: 'progression',
          label: 'PROGRESSION',
          subtitle: 'Quests, Skill Tree, Battle Pass & Calendar',
          icon: Crown,
          badge: claimableProgressionCount,
        },
        { id: 'character', label: 'Character Profile', subtitle: '2D Wardrobe, Cards & Trophies', icon: User },
        { id: 'fitness', label: 'Fitness Log', icon: Activity },
        { id: 'nutrition', label: 'Nutrition & Meals', icon: Apple },
        { id: 'mentor', label: 'AI Fitness Mentor', icon: Brain },
        { id: 'museum', label: 'Records Museum', icon: Landmark },
        { id: 'store', label: 'Royal Treasury Store', subtitle: 'Treasury & Cosmetic Marketplace', icon: ShoppingBag },
        { id: 'storyline', label: 'World of Aetheria', icon: Map },
      ],
    },
    {
      title: 'Fellowship',
      items: [
        {
          id: 'rivals',
          label: 'RIVALS ARENA',
          subtitle: 'Divisions, Tournaments & Spectate',
          icon: Trophy,
          badge: pendingRivalsCount,
          highlight: true,
        },
        {
          id: 'social',
          label: 'SOCIAL',
          subtitle: 'Leaderboard, Feed, Parties & Chat',
          icon: Users,
          badge: incomingFriendCount,
        },
        { id: 'events', label: 'Community Events', subtitle: 'Community Events & Council', icon: Calendar },
        { id: 'guilds', label: 'Guilds & Territory', subtitle: 'Guilds & Territory Wars', icon: Flag, badge: guildInvites.length },
      ],
    },
    {
      title: 'System',
      items: [
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

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => handleSelect(item.id)}
        className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
          isActive
            ? 'bg-gradient-to-r from-[#8B5CF6]/25 to-[#141420] text-[#F8FAFC] border border-[#D6A84B]/50 shadow-[0_0_16px_rgba(139,92,246,0.22)]'
            : 'text-[#A1A1B8] hover:text-[#F8FAFC] hover:bg-[#141420]/85 border border-transparent hover:border-[#8B5CF6]/25'
        }`}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-[#D6A84B]"
          />
        )}
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-[#D6A84B]'
                : item.id === 'rivals' || item.id === 'boss-battles'
                ? 'text-[#FB7185]'
                : item.id === 'aether-vision' || item.id === 'mentor'
                ? 'text-[#38BDF8]'
                : item.id === 'fitness' || item.id === 'nutrition'
                ? 'text-[#34D399]'
                : item.highlight
                ? 'text-[#8B5CF6]'
                : 'text-[#A1A1B8]/75 group-hover:text-[#C4B5FD]'
            }`}
          />
          <div className="min-w-0 text-left">
            <span
              className={`block truncate whitespace-nowrap ${
                item.subtitle ? "font-['Cinzel'] font-bold tracking-wider text-[11px]" : ''
              }`}
            >
              {item.label}
            </span>
            {item.subtitle && (
              <span className="block truncate text-[10px] text-[#A1A1B8]/70 font-normal">
                {item.subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.badge !== undefined && item.badge > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold tabular-nums shadow ${
              item.id === 'rivals'
                ? 'bg-[#FB7185] text-[#090910]'
                : 'bg-[#8B5CF6] text-white shadow-[0_0_8px_rgba(139,92,246,0.45)]'
            }`}>
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
          className="fixed inset-0 z-40 bg-[#090910]/85 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0E0E17]/96 backdrop-blur-xl border-r border-[#8B5CF6]/25 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px]`}
      >
        {/* Header (Mobile Close Button) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#8B5CF6]/20 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="font-['Cinzel'] font-bold text-[#D6A84B] text-base tracking-wider">AETHERIA</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A1A1B8] hover:text-white hover:bg-[#141420]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Mini Badge */}
        {user && (
          <div className="p-3.5 mx-3 my-3 rounded-xl bg-gradient-to-br from-[#1B1B2B] via-[#141420] to-[#090910] border border-[#8B5CF6]/35 shadow-[0_8px_24px_rgba(4,4,10,0.65)] space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={getHeroArtwork(selectedHeroId, user.characterClass)}
                  alt={`${heroDef.name}`}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-lg object-cover object-top border border-[#D6A84B]/55 shadow"
                />
                <PresenceBadge
                  status={myEffectivePresence}
                  size="xs"
                  className="absolute -bottom-0.5 -right-0.5"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-sm font-bold text-[#F8FAFC] truncate">{user.username}</p>
                </div>
                {equippedLegend && (
                  <LegendTitleBadge
                    title={equippedLegend.titleTag}
                    style={equippedLegend.titleStyle}
                    emblemIcon={equippedLegend.emblemIcon}
                    size="xs"
                  />
                )}
                <p className="text-[11px] text-[#D6A84B] font-medium flex items-center gap-1 tabular-nums truncate">
                  <Award className="w-3 h-3 text-[#FBBF24] shrink-0" />
                  Lv.{stats.level} · {heroDef.name}
                </p>
              </div>
            </div>
            {heroLocked ? (
              <div className="w-full py-1 px-2.5 rounded-lg bg-[#090910]/80 border border-[#8B5CF6]/25 text-[10px] font-['Cinzel'] font-semibold uppercase tracking-wider text-[#A1A1B8] flex items-center justify-center gap-1.5">
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
                className="w-full py-1.5 rounded-lg bg-[#141420] hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/45 hover:border-[#D6A84B]/70 text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-white transition-all"
              >
                Choose Champion
              </button>
            )}
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <div className="md:hidden space-y-1">
            <p className="px-3 text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]/90">
              Realm Core
            </p>
            <div className="space-y-0.5">{mobileTopBarItems.map(renderNavButton)}</div>
          </div>

          {navGroups.map(group => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]/90">
                {group.title}
              </p>
              <div className="space-y-0.5">{group.items.map(renderNavButton)}</div>
            </div>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-[#8B5CF6]/20 text-[11px] text-[#A1A1B8]/75 flex items-center justify-between">
          <span>Aetheria Chronicle</span>
          <span className="flex items-center gap-1 text-[#D6A84B] font-mono">
            <Zap className="w-3 h-3 text-[#8B5CF6]" /> Realm
          </span>
        </div>
      </aside>
    </>
  );
};
