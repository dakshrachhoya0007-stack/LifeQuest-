import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { characterWarriorAvatarImg, resolveAssetUrl } from '../../assets/images';
import { NOTIFICATION_CATEGORY_META } from '../../data/polish2Data';
import { MANUAL_PRESENCE_OPTIONS, PRESENCE_STATUS_META } from '../../utils/presence';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { PresenceBadge } from '../Brand/PresenceBadge';
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

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);
  const pendingRivalsCount = rivalsState?.stats?.pendingIncomingCount || 0;

  const pendingIncomingFriends = friends.filter(
    f => f.status === 'pending' && f.direction === 'incoming'
  );
  const totalBadgeCount =
    unreadNotificationsCount + pendingIncomingFriends.length + guildInvites.length;

  const xpPercentage = Math.min(100, Math.round((stats.playerXP / stats.playerXPNextLevel) * 100));

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0E0E17]/92 backdrop-blur-md border-b border-[#8B5CF6]/25 px-4 sm:px-6 py-3.5 transition-colors shadow-[0_6px_28px_rgba(4,4,10,0.7)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6">
        {/* Zone 1: Brand Wordmark & Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#141420] border border-[#8B5CF6]/35 text-[#C4B5FD] hover:text-white hover:border-[#D6A84B]/70 hover:shadow-[0_0_12px_rgba(139,92,246,0.28)] transition-all"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1B1B2B] via-[#141420] to-[#090910] border border-[#D6A84B]/45 shadow-[0_0_16px_rgba(139,92,246,0.24)] flex items-center justify-center group-hover:border-[#D6A84B]/85 transition-all">
              <GoldenWorldTreeEmblem className="w-6 h-6 group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Cinzel'] font-black tracking-wider text-lg text-[#F8FAFC] group-hover:text-[#D6A84B] transition-colors whitespace-nowrap">
                LIFEQUEST
              </span>
              <span className="text-[10px] text-[#A1A1B8] uppercase tracking-widest font-semibold hidden sm:inline">
                World of Aetheria
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Primary Navigation Links (Single Row) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#A1A1B8]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC] ${
              activeTab === 'dashboard'
                ? 'text-[#D6A84B] font-semibold border-b-2 border-[#D6A84B] pb-0.5'
                : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('rivals')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors hover:text-[#F8FAFC] ${
              activeTab === 'rivals'
                ? 'text-[#FB7185] font-semibold border-b-2 border-[#FB7185] pb-0.5'
                : ''
            }`}
          >
            <span>Rivals</span>
            {pendingRivalsCount > 0 && (
              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-[#FB7185] text-[#090910] font-bold">
                {pendingRivalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('aether-vision')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC] ${
              activeTab === 'aether-vision'
                ? 'text-[#38BDF8] font-semibold border-b-2 border-[#38BDF8] pb-0.5'
                : ''
            }`}
          >
            Aether Vision
          </button>
          <button
            onClick={() => setActiveTab('boss-battles')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC] ${
              activeTab === 'boss-battles'
                ? 'text-[#FB7185] font-semibold border-b-2 border-[#FB7185] pb-0.5'
                : ''
            }`}
          >
            Boss Battles
          </button>
        </nav>

        {/* Zone 3: RPG Currency & Player Stats HUD */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-[#141420] border border-[#8B5CF6]/35 text-[#C4B5FD] hover:text-white hover:border-[#D6A84B]/70 hover:shadow-[0_0_12px_rgba(139,92,246,0.28)] transition-all"
            title={stats.soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            aria-label="Toggle Sound"
          >
            {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[#A1A1B8]" />}
          </button>

          {/* Notifications & Friend Requests Bell */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(v => !v)}
                className="relative p-2 rounded-lg bg-[#141420] border border-[#8B5CF6]/35 text-[#C4B5FD] hover:text-white hover:border-[#D6A84B]/70 hover:shadow-[0_0_12px_rgba(139,92,246,0.28)] transition-all"
                title="Notifications & Companion Requests"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#8B5CF6] border border-[#D6A84B]/75 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[#141420]/96 backdrop-blur-xl border border-[#8B5CF6]/45 rounded-2xl shadow-[0_20px_50px_rgba(4,4,10,0.88)] p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#8B5CF6]/25 pb-2">
                    <span className="font-['Cinzel'] font-bold text-xs text-[#F8FAFC] uppercase tracking-wider">
                      Realm Alerts
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={() => markNotificationRead()}
                          className="text-[10px] text-[#D6A84B] hover:text-white font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifMenu(false)}
                        className="text-[#A1A1B8] hover:text-white"
                        aria-label="Close notifications"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {pendingIncomingFriends.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#D6A84B] font-bold flex items-center gap-1">
                        <UserPlus className="w-3 h-3" /> Pending Friend Requests
                      </span>
                      {pendingIncomingFriends.map(req => (
                        <div
                          key={req.friendshipId}
                          className="p-2.5 rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/35 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{req.champion.username}</p>
                            <p className="text-[10px] text-[#A1A1B8]">
                              Lv.{req.champion.level} {req.champion.characterClass}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => respondFriendRequest(req.friendshipId, true)}
                              className="p-1.5 rounded-lg bg-[#34D399]/20 border border-[#34D399]/50 hover:bg-[#34D399] hover:text-[#090910] text-[#34D399]"
                              title="Accept"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => respondFriendRequest(req.friendshipId, false)}
                              className="p-1.5 rounded-lg bg-[#FB7185]/15 border border-[#FB7185]/40 hover:bg-[#FB7185] hover:text-[#090910] text-[#FB7185]"
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
                      <span className="text-[10px] uppercase tracking-wider text-[#D6A84B] font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Pending Guild Invites
                      </span>
                      {guildInvites.map(inv => (
                        <div
                          key={inv.inviteId}
                          className="p-2.5 rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/35 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              [{inv.guildTag}] {inv.guildName}
                            </p>
                            <p className="text-[10px] text-[#A1A1B8] truncate">
                              Invited by {inv.inviterName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => respondGuildInvite(inv.inviteId, true)}
                              className="p-1.5 rounded-lg bg-[#34D399]/20 border border-[#34D399]/50 hover:bg-[#34D399] hover:text-[#090910] text-[#34D399]"
                              title="Accept guild invite"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => respondGuildInvite(inv.inviteId, false)}
                              className="p-1.5 rounded-lg bg-[#FB7185]/15 border border-[#FB7185]/40 hover:bg-[#FB7185] hover:text-[#090910] text-[#FB7185]"
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
                      <p className="text-xs text-[#A1A1B8] text-center py-4">
                        No notifications right now.
                      </p>
                    ) : (
                      notifications
                        .filter(n => !n.dismissedAt)
                        .slice(0, 8)
                        .map(n => {
                          const catLabel =
                            (n.category && NOTIFICATION_CATEGORY_META[n.category]?.label) ||
                            'Alert';
                          return (
                            <div
                              key={n.id}
                              className={`p-2.5 rounded-xl border text-xs transition-colors flex items-start justify-between gap-2 ${
                                n.readAt
                                  ? 'bg-[#090910]/80 border-[#8B5CF6]/15 text-[#A1A1B8]'
                                  : 'bg-[#0E0E17] border-[#D6A84B]/40 text-[#F8FAFC]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  navigateFromNotification(n);
                                  setShowNotifMenu(false);
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="font-semibold uppercase tracking-wider text-[#C4B5FD]">
                                    {catLabel}
                                  </span>
                                  {!n.readAt && (
                                    <>
                                      <span className="text-[#A1A1B8]/50" aria-hidden="true">·</span>
                                      <span className="text-[#D6A84B] font-semibold">New</span>
                                    </>
                                  )}
                                </div>
                                <span className="font-bold text-white block mt-0.5 truncate">
                                  {n.title}
                                </span>
                                <p className="text-[11px] text-[#A1A1B8] mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                              </button>
                              <div className="flex flex-col gap-1 shrink-0">
                                {!n.readAt && (
                                  <button
                                    type="button"
                                    onClick={() => void markNotificationRead(n.id)}
                                    className="p-1 rounded text-[#D6A84B] hover:text-white hover:bg-[#8B5CF6]/25"
                                    title="Mark read"
                                    aria-label="Mark notification read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void dismissNotification(n.id)}
                                  className="p-1 rounded text-[#A1A1B8] hover:text-[#FB7185] hover:bg-rose-950/50"
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

                  <div className="pt-2 border-t border-[#8B5CF6]/25">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotifMenu(false);
                      }}
                      className="w-full py-2 rounded-xl bg-[#0E0E17] hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/45 hover:border-[#D6A84B]/70 text-xs font-semibold text-white transition-all whitespace-nowrap"
                    >
                      Open Notification Center
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Currencies Split: Player XP & Gold */}
          <div className="hidden sm:flex items-center gap-3 bg-[#141420]/92 border border-[#8B5CF6]/35 rounded-xl px-3 py-1.5 shadow-inner">
            {/* Level & XP */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-['Cinzel'] text-[#D6A84B] bg-[#090910] px-2 py-0.5 rounded border border-[#D6A84B]/45">
                Lv.{stats.level}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[11px] text-[#A1A1B8] gap-2">
                  <span className="font-mono tabular-nums text-[#FBBF24] font-semibold">{stats.playerXP}</span>
                  <span>/ {stats.playerXPNextLevel} XP</span>
                </div>
                <div className="w-20 bg-[#090910] h-1.5 rounded-full overflow-hidden mt-0.5 border border-[#FBBF24]/25">
                  <div
                    className="bg-gradient-to-r from-[#FBBF24] to-[#D6A84B] h-full transition-all duration-300"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-[#8B5CF6]/30" />

            {/* Gold Currency */}
            <div
              onClick={() => setActiveTab('store')}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Gold Coins: Spend in the Royal Treasury Store"
            >
              <Coins className="w-4 h-4 text-[#D6A84B] group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#A1A1B8] font-medium uppercase tracking-wider">Gold</span>
                <span className="font-mono tabular-nums text-xs font-bold text-[#FDE68A]">
                  {stats.gold}
                </span>
              </div>
            </div>
          </div>

          {/* Player Account Avatar + Live Presence Selector */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPresenceMenu(v => !v);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-[#141420] border border-[#8B5CF6]/35 hover:border-[#D6A84B]/70 transition-all focus:outline-none"
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
                <ChevronDown className="w-3.5 h-3.5 text-[#D6A84B]/80 hidden sm:block" />
              </button>

              {showPresenceMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#141420]/96 backdrop-blur-xl border border-[#8B5CF6]/45 rounded-2xl shadow-[0_20px_50px_rgba(4,4,10,0.88)] p-3.5 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#8B5CF6]/25 pb-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#F8FAFC] truncate">{user.username}</p>
                      <PresenceBadge status={myEffectivePresence} showLabel size="xs" className="mt-0.5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPresenceMenu(false)}
                      className="text-[#A1A1B8] hover:text-white p-1"
                      aria-label="Close presence menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B] px-1">
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
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                            active
                              ? 'bg-[#8B5CF6]/25 text-white border border-[#8B5CF6]/55'
                              : 'text-[#A1A1B8] hover:bg-[#0E0E17] hover:text-white border border-transparent'
                          }`}
                        >
                          <PresenceBadge status={option} showLabel size="sm" />
                          {active && <Check className="w-3.5 h-3.5 text-[#D6A84B]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#8B5CF6]/25 pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('character');
                        setShowPresenceMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#A1A1B8] hover:bg-[#0E0E17] hover:text-[#D6A84B] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      Character Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('settings');
                        setShowPresenceMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#A1A1B8] hover:bg-[#0E0E17] hover:text-[#D6A84B] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      Presence &amp; Privacy Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true, 'login')}
              className="ff-btn-primary px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              Enter Realm
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
