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
  Hammer,
  Sparkles,
  Swords,
  Map,
  Users,
  Settings,
  X,
  Shield,
  Zap,
  ShoppingBag,
  Crown,
  Lock,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';

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
    activeBuffs,
    friends,
    guildInvites,
    quests,
    achievements,
    dynamicDailyQuests,
    hallOfLegends,
    equippedLegendMap,
  } = useGame();
  const heroDef = getHeroById(selectedHeroId);

  const incomingFriendCount = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  ).length;

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

  // Mobile-only quick access for routes shown in TopBar on md+ screens (avoids desktop duplication)
  const mobileTopBarItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'aether-vision', label: 'Aether Vision AI', icon: Camera, highlight: true },
    { id: 'armory', label: 'The Armory', icon: Hammer },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'boss-battles', label: 'Boss Battles', icon: Swords },
  ];

  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Adventure & Wellness',
      items: [
        {
          id: 'progression',
          label: 'PROGRESSION',
          subtitle: 'Quests, Report & Legends',
          icon: Crown,
          badge: claimableProgressionCount,
        },
        { id: 'character', label: 'Character Profile', icon: User },
        { id: 'fitness', label: 'Fitness Log', icon: Activity },
        { id: 'nutrition', label: 'Nutrition & Meals', icon: Apple },
        { id: 'buffs', label: 'Active Buffs', icon: Sparkles, badge: activeBuffs.length },
        { id: 'storyline', label: 'World of Aetheria', icon: Map },
      ],
    },
    {
      title: 'Fellowship',
      items: [
        {
          id: 'social',
          label: 'SOCIAL',
          subtitle: 'Leaderboard, Friends & Chat',
          icon: Users,
          badge: incomingFriendCount,
        },
        { id: 'guilds', label: 'Guilds & Raids', icon: Shield, badge: guildInvites.length },
      ],
    },
    {
      title: 'System',
      items: [{ id: 'settings', label: 'Settings & Privacy', icon: Settings }],
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
        className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group ${
          isActive
            ? 'bg-[#251638]/90 text-[#D9D2C5] border border-[#C5A15A]/45 shadow-sm'
            : 'text-[#D9D2C5]/70 hover:text-[#D9D2C5] hover:bg-[#251638]/40 border border-transparent'
        }`}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-[#C5A15A]"
          />
        )}
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-[#C5A15A]'
                : item.highlight
                ? 'text-[#C5A15A]/85'
                : 'text-[#D9D2C5]/50 group-hover:text-[#C5A15A]'
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
              <span className="block truncate text-[10px] text-[#D9D2C5]/45 font-normal">
                {item.subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.highlight && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A15A]">
              Vision
            </span>
          )}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#7046A5] text-[#D9D2C5] font-bold tabular-nums">
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#100D19]/96 border-r border-[#C5A15A]/18 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px]`}
      >
        {/* Header (Mobile Close Button) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C5A15A]/15 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="font-['Cinzel'] font-bold text-[#C5A15A] text-base tracking-wider">AETHERIA</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#D9D2C5]/60 hover:text-[#D9D2C5] hover:bg-[#251638]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Mini Badge */}
        {user && (
          <div className="p-3.5 mx-3 my-3 rounded-xl bg-gradient-to-br from-[#251638]/70 via-[#151022] to-[#100D19] border border-[#C5A15A]/22 space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={getHeroArtwork(selectedHeroId, user.characterClass)}
                alt={`${heroDef.name}`}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-lg object-cover object-top border border-[#C5A15A]/55 shadow"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-bold text-[#D9D2C5] truncate">{user.username}</p>
                {equippedLegend && (
                  <LegendTitleBadge
                    title={equippedLegend.titleTag}
                    style={equippedLegend.titleStyle}
                    emblemIcon={equippedLegend.emblemIcon}
                    size="xs"
                  />
                )}
                <p className="text-[11px] text-[#C5A15A] font-medium flex items-center gap-1 tabular-nums truncate">
                  <Shield className="w-3 h-3 text-[#C5A15A] shrink-0" />
                  Lv.{stats.level} · {heroDef.name}
                </p>
              </div>
            </div>
            {heroLocked ? (
              <div className="w-full py-1 px-2.5 rounded-lg bg-[#161124]/80 border border-[#C5A15A]/20 text-[10px] font-['Cinzel'] font-semibold uppercase tracking-wider text-[#C5A15A]/75 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                Champion Bound
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowHeroSelectModal(true);
                  onClose();
                }}
                className="w-full py-1.5 rounded-lg bg-[#161124] hover:bg-[#251638] border border-[#C5A15A]/30 text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#C5A15A] transition-colors"
              >
                Choose Champion
              </button>
            )}
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Mobile-only section for TopBar routes */}
          <div className="md:hidden space-y-1">
            <p className="px-3 text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]/70">
              Realm Core
            </p>
            <div className="space-y-0.5">{mobileTopBarItems.map(renderNavButton)}</div>
          </div>

          {navGroups.map(group => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]/70">
                {group.title}
              </p>
              <div className="space-y-0.5">{group.items.map(renderNavButton)}</div>
            </div>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-[#C5A15A]/15 text-[11px] text-[#D9D2C5]/45 flex items-center justify-between">
          <span>Aetheria Chronicle</span>
          <span className="flex items-center gap-1 text-[#C5A15A]/80 font-mono">
            <Zap className="w-3 h-3" /> Realm
          </span>
        </div>
      </aside>
    </>
  );
};
