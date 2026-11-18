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
  Hammer,
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
    <header className="sticky top-0 z-40 w-full bg-[#100D19]/96 backdrop-blur-md border-b border-[#C5A15A]/18 px-4 sm:px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6">
        {/* Zone 1: Brand Wordmark & Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#251638]/70 text-[#C5A15A] hover:text-[#D9D2C5] hover:bg-[#251638] transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#251638] via-[#1b112a] to-[#100D19] border border-[#C5A15A]/45 shadow-lg flex items-center justify-center">
              <GoldenWorldTreeEmblem className="w-6 h-6 group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Cinzel'] font-black tracking-wider text-lg text-[#F5EFE6] group-hover:text-[#C5A15A] transition-colors whitespace-nowrap">
                LIFEQUEST
              </span>
              <span className="text-[10px] text-[#C5A15A]/80 uppercase tracking-widest font-semibold hidden sm:inline">
                World of Aetheria
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Primary Navigation Links (Single Row, 5 Crisp Links) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#D9D2C5]/75">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5EFE6] ${
              activeTab === 'dashboard' ? 'text-[#C5A15A] font-semibold border-b-2 border-[#C5A15A] pb-0.5' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('rivals')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors hover:text-[#F5EFE6] ${
              activeTab === 'rivals' ? 'text-[#C5A15A] font-semibold border-b-2 border-[#C5A15A] pb-0.5' : ''
            }`}
          >
            <span>Rivals</span>
            {pendingRivalsCount > 0 && (
              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-[#C5A15A] text-[#100D19] font-bold">
                {pendingRivalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('aether-vision')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5EFE6] ${
              activeTab === 'aether-vision' ? 'text-[#C5A15A] font-semibold border-b-2 border-[#C5A15A] pb-0.5' : ''
            }`}
          >
            Aether Vision
          </button>
          <button
            onClick={() => setActiveTab('armory')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5EFE6] ${
              activeTab === 'armory' ? 'text-[#C5A15A] font-semibold border-b-2 border-[#C5A15A] pb-0.5' : ''
            }`}
          >
            The Armory
          </button>
          <button
            onClick={() => setActiveTab('boss-battles')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5EFE6] ${
              activeTab === 'boss-battles' ? 'text-[#C5A15A] font-semibold border-b-2 border-[#C5A15A] pb-0.5' : ''
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
            className="p-2 rounded-lg bg-purple-950/30 border border-purple-800/40 text-purple-300 hover:text-white hover:bg-purple-900/40 transition-colors"
            title={stats.soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            aria-label="Toggle Sound"
          >
            {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notifications & Friend Requests Bell */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(v => !v)}
                className="relative p-2 rounded-lg bg-purple-950/30 border border-purple-800/40 text-purple-300 hover:text-white hover:bg-purple-900/40 transition-colors"
                title="Notifications & Companion Requests"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[#120d22] border border-purple-800/70 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-950 pb-2">
                    <span className="font-['Cinzel'] font-bold text-xs text-white uppercase tracking-wider">
                      Realm Alerts
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={() => markNotificationRead()}
                          className="text-[10px] text-purple-300 hover:text-white font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifMenu(false)}
                        className="text-slate-400 hover:text-white"
                        aria-label="Close notifications"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {pendingIncomingFriends.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                        <UserPlus className="w-3 h-3" /> Pending Friend Requests
                      </span>
                      {pendingIncomingFriends.map(req => (
                        <div
                          key={req.friendshipId}
                          className="p-2.5 rounded-xl bg-[#191230] border border-purple-800/50 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{req.champion.username}</p>
                            <p className="text-[10px] text-purple-300">
                              Lv.{req.champion.level} {req.champion.characterClass}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => respondFriendRequest(req.friendshipId, true)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Accept"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => respondFriendRequest(req.friendshipId, false)}
                              className="p-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-200"
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
                      <span className="text-[10px] uppercase tracking-wider text-purple-300 font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Pending Guild Invites
                      </span>
                      {guildInvites.map(inv => (
                        <div
                          key={inv.inviteId}
                          className="p-2.5 rounded-xl bg-[#191230] border border-purple-800/50 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              [{inv.guildTag}] {inv.guildName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              Invited by {inv.inviterName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => respondGuildInvite(inv.inviteId, true)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Accept guild invite"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => respondGuildInvite(inv.inviteId, false)}
                              className="p-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-200"
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
                      <p className="text-xs text-slate-400 text-center py-4">
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
                                  ? 'bg-[#0b0816] border-purple-950/60 text-slate-400'
                                  : 'bg-purple-950/50 border-purple-700/70 text-slate-200'
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
                                  <span className="font-semibold uppercase tracking-wider text-[#C5A15A]">
                                    {catLabel}
                                  </span>
                                  {!n.readAt && (
                                    <>
                                      <span className="text-slate-600" aria-hidden="true">·</span>
                                      <span className="text-amber-300 font-semibold">New</span>
                                    </>
                                  )}
                                </div>
                                <span className="font-bold text-white block mt-0.5 truncate">
                                  {n.title}
                                </span>
                                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                              </button>
                              <div className="flex flex-col gap-1 shrink-0">
                                {!n.readAt && (
                                  <button
                                    type="button"
                                    onClick={() => void markNotificationRead(n.id)}
                                    className="p-1 rounded text-purple-300 hover:text-white hover:bg-purple-900/50"
                                    title="Mark read"
                                    aria-label="Mark notification read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void dismissNotification(n.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-300 hover:bg-rose-950/50"
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

                  <div className="pt-2 border-t border-purple-950">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotifMenu(false);
                      }}
                      className="w-full py-2 rounded-xl bg-[#1b1231] hover:bg-[#251638] border border-[#C5A15A]/30 text-xs font-semibold text-[#E8CF96] transition-colors whitespace-nowrap"
                    >
                      Open Notification Center
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Currencies Split: Player XP, Forge XP & Gold */}
          <div className="hidden sm:flex items-center gap-3 bg-[#130f24] border border-purple-900/50 rounded-xl px-3 py-1.5 shadow-inner">
            {/* Level & XP */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-['Cinzel'] text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-700/40">
                Lv.{stats.level}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2">
                  <span className="font-mono tabular-nums text-slate-200 font-semibold">{stats.playerXP}</span>
                  <span>/ {stats.playerXPNextLevel} XP</span>
                </div>
                <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-300"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-purple-900/60" />

            {/* Forge XP (Armory Currency) */}
            <div
              onClick={() => setActiveTab('armory')}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Forge XP: Used for Blacksmith weapon upgrades"
            >
              <Hammer className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] text-amber-400/90 font-medium uppercase tracking-wider">Forge XP</span>
                <span className="font-mono tabular-nums text-xs font-bold text-amber-200">
                  {stats.forgeXP}
                </span>
              </div>
            </div>

            <div className="w-px h-6 bg-purple-900/60" />

            {/* Gold Currency */}
            <div
              onClick={() => setActiveTab('store')}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Gold Coins: Spend in the Royal Treasury Store"
            >
              <Coins className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="text-[10px] text-yellow-400/90 font-medium uppercase tracking-wider">Gold</span>
                <span className="font-mono tabular-nums text-xs font-bold text-yellow-200">
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
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-[#151022]/90 border border-[#C5A15A]/25 hover:border-[#C5A15A]/55 transition-colors focus:outline-none"
                title="Champion Status & Profile"
              >
                <div className="relative">
                  <img
                    src={resolveAssetUrl(user.googleAvatar || user.avatar, characterWarriorAvatarImg)}
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-cover border border-[#C5A15A]/50"
                  />
                  <PresenceBadge
                    status={myEffectivePresence}
                    size="xs"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#C5A15A]/80 hidden sm:block" />
              </button>

              {showPresenceMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#120d22] border border-[#C5A15A]/30 rounded-2xl shadow-2xl p-3.5 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#C5A15A]/15 pb-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#F5EFE6] truncate">{user.username}</p>
                      <PresenceBadge status={myEffectivePresence} showLabel size="xs" className="mt-0.5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPresenceMenu(false)}
                      className="text-slate-400 hover:text-white p-1"
                      aria-label="Close presence menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]/80 px-1">
                      Presence Status
                    </p>
                    {MANUAL_PRESENCE_OPTIONS.map(option => {
                      const meta = PRESENCE_STATUS_META[option];
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
                              ? 'bg-[#251638] text-[#F5EFE6] border border-[#C5A15A]/45'
                              : 'text-[#D9D2C5]/80 hover:bg-[#1b122c] border border-transparent'
                          }`}
                        >
                          <PresenceBadge status={option} showLabel size="sm" />
                          {active && <Check className="w-3.5 h-3.5 text-[#C5A15A]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#C5A15A]/15 pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('character');
                        setShowPresenceMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#D9D2C5] hover:bg-[#1b122c] hover:text-[#C5A15A] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-[#C5A15A]" />
                      Character Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('settings');
                        setShowPresenceMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#D9D2C5] hover:bg-[#1b122c] hover:text-[#C5A15A] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#C5A15A]" />
                      Presence &amp; Privacy Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true, 'login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#583385] to-[#7046A5] hover:from-[#683e9c] hover:to-[#8255bd] rounded-lg shadow-md transition-colors whitespace-nowrap"
            >
              Enter Realm
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
