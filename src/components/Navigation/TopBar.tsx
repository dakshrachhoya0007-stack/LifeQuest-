import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { characterWarriorAvatarImg, resolveAssetUrl } from '../../assets/images';
import { NOTIFICATION_CATEGORY_META } from '../../data/polish2Data';
import { MANUAL_PRESENCE_OPTIONS } from '../../utils/presence';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { PresenceBadge } from '../Brand/PresenceBadge';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  LQ_EASE,
  RpgDropdown,
} from '../Motion/RpgMotionPrimitives';
import {
  Volume2,
  VolumeX,
  Menu,
  Coins,
  Bell,
  Check,
  X,
  UserPlus,
  Shield,
  Trash2,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const {
    user,
    stats,
    activeTab,
    setActiveTab,
    toggleSound,
    setShowAuthModal,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    dismissNotification,
    navigateFromNotification,
    friends,
    respondFriendRequest,
    guildInvites,
    respondGuildInvite,
    myManualPresence,
    myEffectivePresence,
    setManualPresenceStatus,
    rivalsState,
  } = useGame();

  const prefersReduced = useReducedMotion();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);
  const pendingRivalsCount = rivalsState?.stats?.pendingIncomingCount || 0;

  const pendingIncomingFriends = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  );
  const totalBadgeCount =
    unreadNotificationsCount + pendingIncomingFriends.length + guildInvites.length;

  const xpPercentage = Math.min(
    100,
    Math.round((stats.playerXP / Math.max(1, stats.playerXPNextLevel)) * 100)
  );

  const primaryNavLinks = [
    { id: 'dashboard', label: 'Command' },
    { id: 'progression', label: 'Quests' },
    { id: 'aether-vision', label: 'Aether Vision' },
    { id: 'boss-battles', label: 'Bosses' },
    { id: 'rivals', label: 'Rivals', badge: pendingRivalsCount },
  ];

  const isNavActive = (id: string) => {
    if (id === 'progression') {
      return (
        activeTab === 'progression' ||
        activeTab === 'quests' ||
        activeTab === 'achievements' ||
        activeTab === 'skill-tree' ||
        activeTab === 'daily-calendar'
      );
    }
    return activeTab === id;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#100D18]/92 backdrop-blur-md border-b border-[#362B45] px-4 sm:px-6 py-3 shadow-[0_10px_28px_-12px_rgba(5,3,10,0.85)]">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark & Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#171220] border border-[#362B45] text-[#E8C777] hover:border-[#7045A0] hover:text-[#F2EDF7] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="group flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#171220] border border-[#D6A84B]/45 flex items-center justify-center group-hover:border-[#E8C777]/80 transition-colors">
              <GoldenWorldTreeEmblem className="w-6 h-6 transition-transform duration-200 group-hover:scale-105" />
            </div>
            <span className="font-['Cinzel'] font-black tracking-[0.16em] text-base sm:text-lg text-[#F2EDF7] group-hover:text-[#E8C777] transition-colors whitespace-nowrap shrink-0">
              LIFEQUEST
            </span>
          </button>
        </div>

        {/* Zone 2: Clean Single-Row Navigation Links */}
        <nav
          aria-label="Primary Realm Links"
          className="hidden xl:flex items-center gap-6 text-xs font-semibold tracking-wide"
        >
          {primaryNavLinks.map(link => {
            const active = isNavActive(link.id);
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setActiveTab(link.id)}
                className={`relative py-2 whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active ? 'text-[#F2EDF7]' : 'text-[#A69AAF] hover:text-[#F2EDF7]'
                }`}
              >
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-[#D65C66] text-[#F2EDF7] font-bold">
                    {link.badge}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'topbar-active-underline'}
                    transition={{ duration: 0.2, ease: LQ_EASE }}
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full bg-gradient-to-r from-[#7045A0] via-[#E8C777] to-[#D6A84B]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Player Progression HUD & Quick Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Audio Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="lq-btn p-2 rounded-lg bg-[#171220] border border-[#362B45] text-[#A69AAF] hover:text-[#E8C777] hover:border-[#7045A0] cursor-pointer"
            title={stats.soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            aria-label="Toggle Sound"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#E8C777]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#766D82]" />
            )}
          </button>

          {/* Notifications & Requests Bell */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifMenu(v => !v);
                  setShowPresenceMenu(false);
                }}
                className="lq-btn relative p-2 rounded-lg bg-[#171220] border border-[#362B45] text-[#E8C777] hover:text-[#F2EDF7] hover:border-[#7045A0] cursor-pointer"
                title="Notifications & Companion Requests"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#D65C66] border border-[#100D18] text-[#F2EDF7] text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              <RpgDropdown
                isOpen={showNotifMenu}
                className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[#171220] border border-[#362B45] rounded-2xl shadow-[0_24px_54px_rgba(5,3,10,0.92)] p-4 z-50 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#362B45] pb-2">
                  <span className="font-['Cinzel'] font-bold text-xs text-[#E8C777] uppercase tracking-wider">
                    Realm Alerts
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead()}
                        className="text-[11px] text-[#E8C777] hover:text-[#F2EDF7] font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifMenu(false)}
                      className="text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {pendingIncomingFriends.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#A69AAF] font-bold flex items-center gap-1">
                      <UserPlus className="w-3 h-3 text-[#E8C777]" /> Pending Friend Requests
                    </span>
                    {pendingIncomingFriends.map(req => (
                      <div
                        key={req.friendshipId}
                        className="p-2.5 rounded-xl bg-[#21152F] border border-[#362B45] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2EDF7] truncate">{req.champion.username}</p>
                          <p className="text-[10px] text-[#A69AAF]">
                            Lv.{req.champion.level} {req.champion.characterClass}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => respondFriendRequest(req.friendshipId, true)}
                            className="p-1.5 rounded-lg bg-[#49B88A] hover:brightness-110 text-[#100D18] cursor-pointer"
                            title="Accept"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => respondFriendRequest(req.friendshipId, false)}
                            className="p-1.5 rounded-lg bg-[#D65C66]/20 hover:bg-[#D65C66]/35 text-[#D65C66] cursor-pointer"
                            title="Decline"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {guildInvites.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#A69AAF] font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#E8C777]" /> Pending Guild Invites
                    </span>
                    {guildInvites.map(inv => (
                      <div
                        key={inv.inviteId}
                        className="p-2.5 rounded-xl bg-[#21152F] border border-[#362B45] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2EDF7] truncate">
                            [{inv.guildTag}] {inv.guildName}
                          </p>
                          <p className="text-[10px] text-[#A69AAF] truncate">
                            Invited by {inv.inviterName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => respondGuildInvite(inv.inviteId, true)}
                            className="p-1.5 rounded-lg bg-[#49B88A] hover:brightness-110 text-[#100D18] cursor-pointer"
                            title="Accept guild invite"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => respondGuildInvite(inv.inviteId, false)}
                            className="p-1.5 rounded-lg bg-[#D65C66]/20 hover:bg-[#D65C66]/35 text-[#D65C66] cursor-pointer"
                            title="Decline guild invite"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.filter(n => !n.dismissedAt).length === 0 &&
                  pendingIncomingFriends.length === 0 &&
                  guildInvites.length === 0 ? (
                    <p className="text-xs text-[#766D82] text-center py-4">
                      No alerts right now.
                    </p>
                  ) : (
                    notifications
                      .filter(n => !n.dismissedAt)
                      .slice(0, 8)
                      .map(n => {
                        const catLabel =
                          (n.category && NOTIFICATION_CATEGORY_META[n.category]?.label) || 'Alert';
                        return (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors flex items-start justify-between gap-2 ${
                              n.readAt
                                ? 'bg-[#100D18]/75 border-[#362B45]/70 text-[#A69AAF]'
                                : 'bg-[#21152F] border-[#7045A0]/55 text-[#F2EDF7]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                navigateFromNotification(n);
                                setShowNotifMenu(false);
                              }}
                              className="min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-semibold uppercase tracking-wider text-[#A69AAF]">
                                  {catLabel}
                                </span>
                                {!n.readAt && (
                                  <>
                                    <span className="text-[#766D82]" aria-hidden="true">·</span>
                                    <span className="text-[#E8C777] font-semibold">New</span>
                                  </>
                                )}
                              </div>
                              <span className="font-bold text-[#F2EDF7] block mt-0.5 truncate">
                                {n.title}
                              </span>
                              <p className="text-[11px] text-[#A69AAF] mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            </button>
                            <div className="flex flex-col gap-1 shrink-0">
                              {!n.readAt && (
                                <button
                                  type="button"
                                  onClick={() => void markNotificationRead(n.id)}
                                  className="p-1 rounded text-[#49B88A] hover:text-[#F2EDF7] hover:bg-[#49B88A]/15 cursor-pointer"
                                  title="Mark read"
                                  aria-label="Mark notification read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void dismissNotification(n.id)}
                                className="p-1 rounded text-[#766D82] hover:text-[#D65C66] hover:bg-[#D65C66]/15 cursor-pointer"
                                title="Dismiss"
                                aria-label="Dismiss notification"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                <div className="pt-2 border-t border-[#362B45]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('notifications');
                      setShowNotifMenu(false);
                    }}
                    className="lq-btn-secondary w-full py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Open Notification Center
                  </button>
                </div>
              </RpgDropdown>
            </div>
          )}

          {/* Compact Level, XP & Gold HUD */}
          <div className="hidden sm:flex items-center gap-3 bg-[#171220] border border-[#362B45] rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold font-['Cinzel'] text-[#E8C777] bg-[#21152F] px-2 py-0.5 rounded border border-[#D6A84B]/40 tabular-nums">
                Lv.{stats.level}
              </span>
              <div className="flex flex-col min-w-[90px]">
                <div className="flex items-center justify-between text-[11px] text-[#A69AAF] gap-1.5 font-mono tabular-nums">
                  <AnimatedCounter value={stats.playerXP} className="text-[#F2EDF7] font-semibold" />
                  <span className="text-[#766D82]">/ {stats.playerXPNextLevel}</span>
                </div>
                <AnimatedProgressBar
                  percentage={xpPercentage}
                  className="w-full bg-[#100D18] h-1.5 rounded-full overflow-hidden mt-0.5 border border-[#362B45]"
                  barClassName="bg-gradient-to-r from-[#7045A0] via-[#9A72CC] to-[#D6A84B]"
                  shimmer={false}
                />
              </div>
            </div>

            <div className="w-px h-6 bg-[#362B45]" />

            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Gold Coins: Spend in the Royal Treasury Store"
            >
              <Coins className="w-4 h-4 text-[#D6A84B] group-hover:scale-110 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#766D82] font-semibold uppercase tracking-wider leading-none">
                  Gold
                </span>
                <AnimatedCounter
                  value={stats.gold}
                  className="font-mono tabular-nums text-xs font-bold text-[#E8C777] leading-tight"
                />
              </div>
            </button>
          </div>

          {/* Player Avatar & Presence Selector */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPresenceMenu(v => !v);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-[#171220] border border-[#362B45] hover:border-[#7045A0] transition-colors focus:outline-none cursor-pointer"
                title="Champion Status & Profile"
              >
                <div className="relative">
                  <img
                    src={resolveAssetUrl(user.googleAvatar || user.avatar, characterWarriorAvatarImg)}
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-cover border border-[#D6A84B]/50"
                  />
                  <PresenceBadge
                    status={myEffectivePresence}
                    size="xs"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#A69AAF] hidden sm:block" />
              </button>

              <RpgDropdown
                isOpen={showPresenceMenu}
                className="absolute right-0 mt-2 w-64 bg-[#171220] border border-[#362B45] rounded-2xl shadow-[0_24px_54px_rgba(5,3,10,0.92)] p-3.5 z-50 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#362B45] pb-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F2EDF7] truncate">{user.username}</p>
                    <PresenceBadge status={myEffectivePresence} showLabel size="xs" className="mt-0.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPresenceMenu(false)}
                    className="text-[#A69AAF] hover:text-[#F2EDF7] p-1 cursor-pointer"
                    aria-label="Close presence menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#A69AAF] px-1">
                    Presence Status
                  </p>
                  {MANUAL_PRESENCE_OPTIONS.map(option => {
                    const active = myManualPresence === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          void setManualPresenceStatus(option);
                          setShowPresenceMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#7045A0]/35 text-[#F2EDF7] border border-[#7045A0]'
                            : 'text-[#A69AAF] hover:bg-[#21152F] hover:text-[#F2EDF7] border border-transparent'
                        }`}
                      >
                        <PresenceBadge status={option} showLabel size="sm" />
                        {active && <Check className="w-3.5 h-3.5 text-[#E8C777]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-[#362B45] pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('character');
                      setShowPresenceMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#A69AAF] hover:bg-[#21152F] hover:text-[#F2EDF7] transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#E8C777]" />
                    Character Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setShowPresenceMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#A69AAF] hover:bg-[#21152F] hover:text-[#F2EDF7] transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#A69AAF]" />
                    Settings &amp; Privacy
                  </button>
                </div>
              </RpgDropdown>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true, 'login')}
              className="lq-btn-primary px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
            >
              Enter Realm
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
