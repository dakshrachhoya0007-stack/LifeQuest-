import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { NOTIFICATION_CATEGORY_META } from '../../data/polish2Data';
import type { NotificationCategory, ServerNotificationPreferences } from '../../types/game';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Compass,
  Flame,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';

type FilterTab = 'all' | NotificationCategory;

const CATEGORY_TABS: Array<{
  id: FilterTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: 'All Alerts', icon: Bell },
  { id: 'player_progression', label: 'Progression', icon: Sparkles },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'game_world', label: 'Game World', icon: Compass },
  { id: 'fitness', label: 'Fitness', icon: Flame },
];

const PREFERENCE_ITEMS: Array<{
  key: keyof Omit<ServerNotificationPreferences, 'masterEnabled' | 'updatedAt'>;
  label: string;
  description: string;
}> = [
  {
    key: 'fitness',
    label: 'Fitness & Personal Bests',
    description: 'Verified workout milestones and personal records enshrined in the Museum.',
  },
  {
    key: 'achievement',
    label: 'Progression, Titles & Badges',
    description: 'Skill Tree level-ups, unlocked player titles, rare badges, and reputation milestones.',
  },
  {
    key: 'social',
    label: 'Fellowship & Rivalries',
    description: 'Friend requests, guild invitations, and 7-day Friend Rivalry challenges.',
  },
  {
    key: 'boss',
    label: 'Weekly Raid Bosses',
    description: 'Raid boss breakthroughs, boss defeat alerts, and claimable raid rewards.',
  },
  {
    key: 'community',
    label: 'Community Events',
    description: 'Shared realm milestone unlocks and cooperative event alerts.',
  },
  {
    key: 'seasonal',
    label: 'Seasonal Progression',
    description: 'Season tier unlocks, seasonal challenge completions, and rollover notices.',
  },
];

const formatAlertTimestamp = (iso: string): string => {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const inferCategory = (type: string, category?: NotificationCategory): NotificationCategory => {
  if (category) return category;
  if (type === 'friend_request' || type === 'friend_accepted' || type === 'guild_invite' || type === 'rival_invite' || type === 'rival_accepted') {
    return 'social';
  }
  if (type === 'weekly_boss_defeated' || type === 'boss_update' || type === 'community_milestone' || type === 'season_milestone') {
    return 'game_world';
  }
  if (type === 'museum_personal_best' || type === 'fitness_milestone') {
    return 'fitness';
  }
  return 'player_progression';
};

export const NotificationCenterView: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    notificationCategoryCounts,
    notificationPreferences,
    refreshNotificationsState,
    saveServerNotificationPreferences,
    markNotificationRead,
    dismissNotification,
    navigateFromNotification,
  } = useGame();

  const [selectedCategory, setSelectedCategory] = useState<FilterTab>('all');
  const [savingPref, setSavingPref] = useState(false);
  const [prefNotice, setPrefNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshNotificationsState('all');
  }, []);

  const visibleNotifications = notifications.filter(n => {
    if (n.dismissedAt) return false;
    if (selectedCategory === 'all') return true;
    return inferCategory(n.type, n.category) === selectedCategory;
  });

  const handleTogglePreference = async (
    key: keyof ServerNotificationPreferences,
    nextVal: boolean
  ) => {
    setSavingPref(true);
    setPrefNotice(null);
    const res = await saveServerNotificationPreferences({
      ...notificationPreferences,
      [key]: nextVal,
    });
    if (res.success) {
      setPrefNotice({ type: 'success', text: 'Notification preferences saved.' });
    } else {
      setPrefNotice({ type: 'error', text: res.error || 'Could not update preferences.' });
    }
    setSavingPref(false);
    setTimeout(() => setPrefNotice(null), 2800);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12 max-w-[1400px] mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#1677FF]/35 shadow-[0_12px_32px_rgba(2,8,20,0.6)] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                Aetheria Herald
              </span>
              <span className="text-[#A9B8CC]/45" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC] font-medium tabular-nums">
                {unreadNotificationsCount} Unread
              </span>
              <span className="text-[#A9B8CC]/45" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC]/80 font-medium tabular-nums">
                {notifications.filter(n => !n.dismissedAt).length} Active Alerts
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white tracking-wide">
              NOTIFICATION CENTER
            </h1>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Follow progression breakthroughs, social invitations, raid updates, and verified fitness records without noise or duplicate clutter.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={() => void markNotificationRead(undefined, selectedCategory)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
              >
                <CheckCheck className="w-4 h-4 text-white" />
                {selectedCategory === 'all' ? 'Mark All Read' : 'Mark Category Read'}
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Notification categories"
          className="mt-5 flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-[#061225]/90 border border-[#1677FF]/25 rounded-xl overflow-x-auto max-w-full"
        >
          {CATEGORY_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id;
            const unread =
              tab.id === 'all'
                ? unreadNotificationsCount
                : notificationCategoryCounts[tab.id]?.unread ??
                  notifications.filter(
                    n => !n.dismissedAt && !n.readAt && inferCategory(n.type, n.category) === tab.id
                  ).length;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white border border-[#00D9FF]/50 shadow-[0_0_14px_rgba(22,119,255,0.3)]'
                    : 'text-[#A9B8CC] hover:text-white hover:bg-[#102440]/80 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#A9B8CC]/70'}`} />
                <span>{tab.label}</span>
                {unread > 0 && (
                  <span className={`font-mono text-[11px] font-bold tabular-nums ${isActive ? 'text-[#00D9FF]' : 'text-[#00D9FF]'}`}>
                    ({unread})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout: Alert Stream + Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Alert Feed */}
        <div className="lg:col-span-8 bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)] space-y-3">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1677FF]/25">
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#00D9FF]" />
              {selectedCategory === 'all'
                ? 'ALL NOTIFICATIONS'
                : `${NOTIFICATION_CATEGORY_META[selectedCategory].label.toUpperCase()} ALERTS`}
            </h2>
            <span className="text-xs text-[#A9B8CC] tabular-nums">
              {visibleNotifications.length} {visibleNotifications.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {visibleNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 flex items-center justify-center mx-auto text-[#00D9FF]">
                <BellOff className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-white">No alerts in this category</p>
              <p className="text-xs text-[#A9B8CC] max-w-md mx-auto">
                Complete verified workouts, unlock titles or rare badges, battle Weekly Raid Bosses, or connect with companions to receive meaningful updates here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleNotifications.map(notif => {
                const cat = inferCategory(notif.type, notif.category);
                const catLabel = NOTIFICATION_CATEGORY_META[cat]?.label || 'Realm';
                const isUnread = !notif.readAt;

                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                      isUnread
                        ? 'bg-[#0A1930] border-[#00D9FF]/45 shadow-[0_0_14px_rgba(0,217,255,0.12)]'
                        : 'bg-[#061225]/80 border-[#1677FF]/20 opacity-85 hover:border-[#1677FF]/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => navigateFromNotification(notif)}
                      className="min-w-0 flex-1 text-left group space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-semibold uppercase tracking-wider text-[#00D9FF]">
                          {catLabel}
                        </span>
                        <span className="text-[#A9B8CC]/45" aria-hidden="true">·</span>
                        <span className="text-[#A9B8CC] tabular-nums">
                          {formatAlertTimestamp(notif.createdAt)}
                        </span>
                        {isUnread && (
                          <>
                            <span className="text-[#A9B8CC]/45" aria-hidden="true">·</span>
                            <span className="font-semibold text-[#00D9FF]">Unread</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#00D9FF] transition-colors">
                        {notif.title}
                      </h3>
                      <p className="text-xs text-[#A9B8CC] leading-relaxed">{notif.body}</p>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(notif.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#102440] hover:bg-[#16325C] border border-[#1677FF]/40 hover:border-[#00D9FF]/50 text-[11px] font-semibold text-white flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 text-[#00D9FF]" />
                          Read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void dismissNotification(notif.id)}
                        className="p-1.5 rounded-lg bg-[#0A1930] hover:bg-rose-950/60 border border-[#1677FF]/25 hover:border-rose-700/60 text-[#A9B8CC] hover:text-rose-300 transition-colors"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preferences Panel */}
        <div className="lg:col-span-4 bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)] space-y-4">
          <div className="pb-3 border-b border-[#1677FF]/25">
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#00D9FF]" />
              ALERT PREFERENCES
            </h2>
            <p className="text-xs text-[#A9B8CC] mt-1">
              Control which events generate notifications across your account.
            </p>
          </div>

          {prefNotice && (
            <div
              className={`p-2.5 rounded-xl border text-xs ${
                prefNotice.type === 'error'
                  ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
              }`}
            >
              {prefNotice.text}
            </div>
          )}

          {/* Master Toggle */}
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 cursor-pointer">
            <div className="min-w-0">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#00D9FF]" />
                All Notifications Enabled
              </span>
              <span className="text-[11px] text-[#A9B8CC] block mt-0.5">
                Pause or resume every notification channel at once.
              </span>
            </div>
            <input
              type="checkbox"
              disabled={savingPref}
              checked={notificationPreferences.masterEnabled}
              onChange={e => void handleTogglePreference('masterEnabled', e.target.checked)}
              className="w-4 h-4 accent-[#1677FF] cursor-pointer shrink-0"
            />
          </label>

          {/* Individual Toggles */}
          <div className="space-y-2.5">
            {PREFERENCE_ITEMS.map(item => {
              const checked = notificationPreferences[item.key];
              const disabled = savingPref || !notificationPreferences.masterEnabled;
              return (
                <label
                  key={item.key}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-colors ${
                    disabled
                      ? 'bg-[#061225]/70 border-[#1677FF]/15 opacity-55 cursor-not-allowed'
                      : 'bg-[#0A1930] border-[#1677FF]/25 hover:border-[#00D9FF]/45 cursor-pointer'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white block">{item.label}</span>
                    <span className="text-[11px] text-[#A9B8CC] block mt-0.5 leading-snug">
                      {item.description}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={checked}
                    onChange={e => void handleTogglePreference(item.key, e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#1677FF] cursor-pointer shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
