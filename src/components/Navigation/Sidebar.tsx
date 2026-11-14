import React from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { getHeroById } from '../../data/heroesData';
import {
  LayoutDashboard,
  Scroll,
  User,
  Activity,
  Apple,
  Camera,
  Hammer,
  Sparkles,
  Swords,
  Map,
  Trophy,
  Users,
  UserPlus,
  MessageSquare,
  Award,
  Settings,
  X,
  Shield,
  Zap,
  ShoppingBag,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    user,
    stats,
    selectedHeroId,
    setShowHeroSelectModal,
    activeBuffs,
    friends,
    guildInvites,
  } = useGame();
  const heroDef = getHeroById(selectedHeroId);

  const incomingFriendCount = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core' },
    { id: 'quests', label: 'Quest Board', icon: Scroll, category: 'Core' },
    { id: 'character', label: 'Character Profile', icon: User, category: 'Progression' },
    { id: 'fitness', label: 'Fitness Log', icon: Activity, category: 'Wellness' },
    { id: 'nutrition', label: 'Nutrition & Meals', icon: Apple, category: 'Wellness' },
    { id: 'aether-vision', label: 'Aether Vision AI', icon: Camera, category: 'Wellness', highlight: true },
    { id: 'armory', label: 'The Armory', icon: Hammer, category: 'Combat' },
    { id: 'store', label: 'Store', icon: ShoppingBag, category: 'Combat' },
    { id: 'buffs', label: 'Active Buffs', icon: Sparkles, category: 'Combat', badge: activeBuffs.length },
    { id: 'boss-battles', label: 'Boss Battles', icon: Swords, category: 'Combat' },
    { id: 'storyline', label: 'World of Aetheria', icon: Map, category: 'World' },
    { id: 'friends', label: 'Discover & Friends', icon: UserPlus, category: 'Social', badge: incomingFriendCount },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, category: 'Social' },
    { id: 'guilds', label: 'Guilds & Raids', icon: Users, category: 'Social', badge: guildInvites.length },
    { id: 'chat', label: 'Realm Chat', icon: MessageSquare, category: 'Social' },
    { id: 'achievements', label: 'Achievements', icon: Award, category: 'Progression' },
    { id: 'settings', label: 'Settings & Privacy', icon: Settings, category: 'System' },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onClose();
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
                src={getRpgAvatarForClass(user.characterClass)}
                alt={`${heroDef.name}`}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-lg object-cover object-top border border-[#C5A15A]/55 shadow"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#D9D2C5] truncate">{user.username}</p>
                <p className="text-[11px] text-[#C5A15A] font-medium flex items-center gap-1 tabular-nums truncate">
                  <Shield className="w-3 h-3 text-[#C5A15A] shrink-0" />
                  Lv.{stats.level} · {heroDef.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowHeroSelectModal(true);
                onClose();
              }}
              className="w-full py-1.5 rounded-lg bg-[#161124] hover:bg-[#251638] border border-[#C5A15A]/30 text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#C5A15A] transition-colors"
            >
              Switch 3D Hero
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group ${
                  isActive
                    ? 'bg-[#251638]/90 text-[#D9D2C5] border border-[#C5A15A]/40 shadow-sm'
                    : 'text-[#D9D2C5]/65 hover:text-[#D9D2C5] hover:bg-[#251638]/40 border border-transparent'
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
                        : 'text-[#D9D2C5]/45 group-hover:text-[#C5A15A]'
                    }`}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
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
          })}
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
