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
    <header className="sticky top-0 z-40 w-full bg-[#061225]/92 backdrop-blur-md border-b border-[#1E3A63] px-4 sm:px-6 py-3 shadow-[0_10px_28px_-12px_rgba(2,8,20,0.9)]">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark & Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#0A1930] border border-[#1E3A63] text-[#00D9FF] hover:border-[#00D9FF] hover:text-[#F2F7FF] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="group flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0A1930] border border-[#00D9FF]/45 flex items-center justify-center group-hover:border-[#00D9FF]/80 transition-colors shadow-[0_0_16px_rgba(0,217,255,0.16)]">
              <GoldenWorldTreeEmblem className="w-6 h-6 transition-transform duration-200 group-hover:scale-105" />
            </div>
            <span className="font-['Cinzel'] font-black tracking-[0.16em] text-base sm:text-lg text-[#F2F7FF] group-hover:text-[#00D9FF] transition-colors whitespace-nowrap shrink-0">
              FITNESSFIGHT
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
                  active ? 'text-[#F2F7FF]' : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                }`}
              >
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-[#F43F5E] text-[#F2F7FF] font-bold">
                    {link.badge}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'topbar-active-underline'}
                    transition={{ duration: 0.2, ease: LQ_EASE }}
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#38D9F5]"
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
            className="lq-btn p-2 rounded-lg bg-[#0A1930] border border-[#1E3A63] text-[#94A8C7] hover:text-[#00D9FF] hover:border-[#00D9FF] cursor-pointer"
            title={stats.soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            aria-label="Toggle Sound"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#00D9FF]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#647A9E]" />
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
                className="lq-btn relative p-2 rounded-lg bg-[#0A1930] border border-[#1E3A63] text-[#38D9F5] hover:text-[#F2F7FF] hover:border-[#00D9FF] cursor-pointer"
                title="Notifications & Companion Requests"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#F43F5E] border border-[#061225] text-[#F2F7FF] text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              <RpgDropdown
                isOpen={showNotifMenu}
                className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[#0A1930] border border-[#1E3A63] rounded-2xl shadow-[0_24px_54px_rgba(2,8,20,0.94)] p-4 z-50 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#1E3A63] pb-2">
                  <span className="font-['Cinzel'] font-bold text-xs text-[#38D9F5] uppercase tracking-wider">
                    Realm Alerts
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead()}
                        className="text-[11px] text-[#38D9F5] hover:text-[#F2F7FF] font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifMenu(false)}
                      className="text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {pendingIncomingFriends.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] font-bold flex items-center gap-1">
                      <UserPlus className="w-3 h-3 text-[#38D9F5]" /> Pending Friend Requests
                    </span>
                    {pendingIncomingFriends.map(req => (
                      <div
                        key={req.friendshipId}
                        className="p-2.5 rounded-xl bg-[#102440] border border-[#1E3A63] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2F7FF] truncate">{req.champion.username}</p>
                          <p className="text-[10px] text-[#94A8C7]">
                            Lv.{req.champion.level} {req.champion.characterClass}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => respondFriendRequest(req.friendshipId, true)}
                            className="p-1.5 rounded-lg bg-[#10B981] hover:brightness-110 text-[#061225] cursor-pointer"
                            title="Accept"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => respondFriendRequest(req.friendshipId, false)}
                            className="p-1.5 rounded-lg bg-[#F43F5E]/20 hover:bg-[#F43F5E]/35 text-[#F43F5E] cursor-pointer"
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
                    <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#38D9F5]" /> Pending Guild Invites
                    </span>
                    {guildInvites.map(inv => (
                      <div
                        key={inv.inviteId}
                        className="p-2.5 rounded-xl bg-[#102440] border border-[#1E3A63] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2F7FF] truncate">
                            [{inv.guildTag}] {inv.guildName}
                          </p>
                          <p className="text-[10px] text-[#94A8C7] truncate">
                            Invited by {inv.inviterName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => respondGuildInvite(inv.inviteId, true)}
                            className="p-1.5 rounded-lg bg-[#10B981] hover:brightness-110 text-[#061225] cursor-pointer"
                            title="Accept guild invite"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => respondGuildInvite(inv.inviteId, false)}
                            className="p-1.5 rounded-lg bg-[#F43F5E]/20 hover:bg-[#F43F5E]/35 text-[#F43F5E] cursor-pointer"
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
                    <p className="text-xs text-[#647A9E] text-center py-4">
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
                                ? 'bg-[#061225]/80 border-[#1E3A63]/70 text-[#94A8C7]'
                                : 'bg-[#102440] border-[#1677FF]/60 text-[#F2F7FF]'
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
                                <span className="font-semibold uppercase tracking-wider text-[#94A8C7]">
                                  {catLabel}
                                </span>
                                {!n.readAt && (
                                  <>
                                    <span className="text-[#647A9E]" aria-hidden="true">·</span>
                                    <span className="text-[#00D9FF] font-semibold">New</span>
                                  </>
                                )}
                              </div>
                              <span className="font-bold text-[#F2F7FF] block mt-0.5 truncate">
                                {n.title}
                              </span>
                              <p className="text-[11px] text-[#94A8C7] mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            </button>
                            <div className="flex flex-col gap-1 shrink-0">
                              {!n.readAt && (
                                <button
                                  type="button"
                                  onClick={() => void markNotificationRead(n.id)}
                                  className="p-1 rounded text-[#10B981] hover:text-[#F2F7FF] hover:bg-[#10B981]/15 cursor-pointer"
                                  title="Mark read"
                                  aria-label="Mark notification read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void dismissNotification(n.id)}
                                className="p-1 rounded text-[#647A9E] hover:text-[#F43F5E] hover:bg-[#F43F5E]/15 cursor-pointer"
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

                <div className="pt-2 border-t border-[#1E3A63]">
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
          <div className="hidden sm:flex items-center gap-3 bg-[#0A1930] border border-[#1E3A63] rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold font-['Cinzel'] text-[#00D9FF] bg-[#102440] px-2 py-0.5 rounded border border-[#1677FF]/45 tabular-nums">
                Lv.{stats.level}
              </span>
              <div className="flex flex-col min-w-[90px]">
                <div className="flex items-center justify-between text-[11px] text-[#94A8C7] gap-1.5 font-mono tabular-nums">
                  <AnimatedCounter value={stats.playerXP} className="text-[#F2F7FF] font-semibold" />
                  <span className="text-[#647A9E]">/ {stats.playerXPNextLevel}</span>
                </div>
                <AnimatedProgressBar
                  percentage={xpPercentage}
                  className="w-full bg-[#061225] h-1.5 rounded-full overflow-hidden mt-0.5 border border-[#1E3A63]"
                  barClassName="bg-gradient-to-r from-[#1677FF] via-[#0099FF] to-[#00D9FF]"
                  shimmer={false}
                />
              </div>
            </div>

            <div className="w-px h-6 bg-[#1E3A63]" />

            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Gold Coins: Spend in the Royal Treasury Store"
            >
              <Coins className="w-4 h-4 text-[#F59E0B] group-hover:scale-110 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#647A9E] font-semibold uppercase tracking-wider leading-none">
                  Gold
                </span>
                <AnimatedCounter
                  value={stats.gold}
                  className="font-mono tabular-nums text-xs font-bold text-[#FBBF24] leading-tight"
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
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-[#0A1930] border border-[#1E3A63] hover:border-[#00D9FF] transition-colors focus:outline-none cursor-pointer"
                title="Champion Status & Profile"
              >
                <div className="relative">
                  <img
                    src={resolveAssetUrl(user.googleAvatar || user.avatar, characterWarriorAvatarImg)}
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-cover border border-[#00D9FF]/50"
                  />
                  <PresenceBadge
                    status={myEffectivePresence}
                    size="xs"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#94A8C7] hidden sm:block" />
              </button>

              <RpgDropdown
                isOpen={showPresenceMenu}
                className="absolute right-0 mt-2 w-64 bg-[#0A1930] border border-[#1E3A63] rounded-2xl shadow-[0_24px_54px_rgba(2,8,20,0.94)] p-3.5 z-50 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#1E3A63] pb-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F2F7FF] truncate">{user.username}</p>
                    <PresenceBadge status={myEffectivePresence} showLabel size="xs" className="mt-0.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPresenceMenu(false)}
                    className="text-[#94A8C7] hover:text-[#F2F7FF] p-1 cursor-pointer"
                    aria-label="Close presence menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#94A8C7] px-1">
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
                            ? 'bg-[#1677FF]/25 text-[#F2F7FF] border border-[#00D9FF]/60'
                            : 'text-[#94A8C7] hover:bg-[#102440] hover:text-[#F2F7FF] border border-transparent'
                        }`}
                      >
                        <PresenceBadge status={option} showLabel size="sm" />
                        {active && <Check className="w-3.5 h-3.5 text-[#00D9FF]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-[#1E3A63] pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('character');
                      setShowPresenceMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#94A8C7] hover:bg-[#102440] hover:text-[#F2F7FF] transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#00D9FF]" />
                    Character Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setShowPresenceMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#94A8C7] hover:bg-[#102440] hover:text-[#F2F7FF] transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#94A8C7]" />
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
