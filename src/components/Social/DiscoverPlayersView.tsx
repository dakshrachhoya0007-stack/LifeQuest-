import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { ChampionSummary, CharacterClass } from '../../types/game';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { formatLastActiveRelative } from '../../utils/presence';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import { RpgModalWrapper, RpgStaggerGrid, RpgStaggerItem } from '../Motion/RpgMotionPrimitives';
import {
  Search,
  UserPlus,
  Users,
  Check,
  X,
  UserMinus,
  Ban,
  Loader2,
  Eye,
  AlertTriangle,
  Clock,
  Inbox,
} from 'lucide-react';
import { LegendTitleBadge } from './LegendTitleBadge';

type SocialSection = 'discover' | 'friends' | 'received' | 'sent' | 'blocked';

export const DiscoverPlayersView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    friends,
    blockedUsers,
    unifiedBackendReady,
    searchChampions,
    sendFriendRequest,
    cancelFriendRequest,
    respondFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    openPublicProfile,
    equippedLegendMap,
    getPlayerPresence,
    queryPresencesBatch,
  } = useGame();

  const [section, setSection] = useState<SocialSection>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'All' | CharacterClass>('All');
  const [champions, setChampions] = useState<ChampionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: 'remove' | 'block';
    targetUserId: string;
    friendshipId?: string;
    username: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadDirectory = async (q = searchQuery) => {
    if (!unifiedBackendReady) {
      setChampions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await searchChampions(q.trim(), 50, 0);
      setChampions(list);
    } catch (e: any) {
      setError(e?.message || 'Unable to load champion directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDirectory('');
  }, [unifiedBackendReady]);

  useEffect(() => {
    const ids = new Set<string>();
    champions.forEach(c => ids.add(c.id));
    friends.forEach(f => ids.add(f.champion.id));
    if (ids.size > 0) {
      void queryPresencesBatch(Array.from(ids));
    }
  }, [champions.length, friends.length]);

  const acceptedFriends = useMemo(
    () => friends.filter(f => f.status === 'accepted'),
    [friends]
  );
  const pendingIncoming = useMemo(
    () => friends.filter(f => f.status === 'pending' && f.direction === 'incoming'),
    [friends]
  );
  const pendingOutgoing = useMemo(
    () => friends.filter(f => f.status === 'pending' && f.direction === 'outgoing'),
    [friends]
  );

  // Merge live friendship state onto discovered champions so state stays consistent immediately
  const enrichedChampions = useMemo(() => {
    return champions
      .filter(c => classFilter === 'All' || c.characterClass === classFilter)
      .map(champ => {
        const localFriend = friends.find(f => f.champion.id === champ.id);
        if (!localFriend) return champ;
        const derivedStatus =
          localFriend.status === 'accepted'
            ? ('friends' as const)
            : localFriend.direction === 'outgoing'
            ? ('request_sent' as const)
            : ('request_received' as const);
        return {
          ...champ,
          relationshipStatus: derivedStatus,
          friendshipId: localFriend.friendshipId,
        };
      });
  }, [champions, friends, classFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadDirectory(searchQuery);
  };

  const handleSendRequest = async (champ: ChampionSummary) => {
    setBusyId(champ.id);
    const res = await sendFriendRequest(champ.id);
    if (!res.success) {
      showNotice('error', res.error || 'Could not send friend request.');
    } else {
      showNotice('success', `Friend request sent to ${champ.username}.`);
      await loadDirectory(searchQuery);
    }
    setBusyId(null);
  };

  const handleCancelRequest = async (friendshipId: string, username: string) => {
    setBusyId(friendshipId);
    const res = await cancelFriendRequest(friendshipId);
    if (!res.success) {
      showNotice('error', res.error || 'Could not cancel request.');
    } else {
      showNotice('success', `Cancelled friend request to ${username}.`);
      await loadDirectory(searchQuery);
    }
    setBusyId(null);
  };

  const handleRespond = async (friendshipId: string, accept: boolean, username: string) => {
    setBusyId(friendshipId);
    await respondFriendRequest(friendshipId, accept);
    showNotice(
      'success',
      accept ? `${username} is now your friend!` : `Declined request from ${username}.`
    );
    await loadDirectory(searchQuery);
    setBusyId(null);
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setBusyId(pendingConfirm.targetUserId);
    if (pendingConfirm.kind === 'remove' && pendingConfirm.friendshipId) {
      await removeFriend(pendingConfirm.friendshipId);
      showNotice('success', `Removed ${pendingConfirm.username} from friends.`);
    } else if (pendingConfirm.kind === 'block') {
      const res = await blockUser(pendingConfirm.targetUserId);
      if (!res.success) {
        showNotice('error', res.error || 'Could not block user.');
      } else {
        showNotice('success', `Blocked ${pendingConfirm.username}.`);
      }
    }
    setPendingConfirm(null);
    await loadDirectory(searchQuery);
    setBusyId(null);
  };

  const handleUnblock = async (userId: string, username: string) => {
    setBusyId(userId);
    const res = await unblockUser(userId);
    if (!res.success) {
      showNotice('error', res.error || 'Could not unblock user.');
    } else {
      showNotice('success', `Unblocked ${username}.`);
      await loadDirectory(searchQuery);
    }
    setBusyId(null);
  };

  const sectionTabs: Array<{ id: SocialSection; label: string; badge?: number }> = [
    { id: 'discover', label: 'Discover Players' },
    { id: 'friends', label: 'Friends', badge: acceptedFriends.length || undefined },
    { id: 'received', label: 'Received', badge: pendingIncoming.length || undefined },
    { id: 'sent', label: 'Sent', badge: pendingOutgoing.length || undefined },
    { id: 'blocked', label: 'Blocked', badge: blockedUsers.length || undefined },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      {!embedded && (
        <FeatureBanner>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5] mb-1">
                Social Directory · Verified Players
              </p>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF] text-balance">
                DISCOVER &amp; FRIENDS
              </h1>
              <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
                Find active Aetheria champions, inspect public RPG profiles, manage friend requests, and keep your social circle safe.
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs text-[#94A8C7] shrink-0 tabular-nums">
              <div>
                <span className="text-[11px] text-[#647A9E] block">Friends</span>
                <span className="text-lg font-bold text-[#F2F7FF] font-mono">{acceptedFriends.length}</span>
              </div>
              <div className="w-px h-8 bg-[#1E3A63]" />
              <div>
                <span className="text-[11px] text-[#647A9E] block">Incoming</span>
                <span className="text-lg font-bold text-[#00D9FF] font-mono">{pendingIncoming.length}</span>
              </div>
              <div className="w-px h-8 bg-[#1E3A63]" />
              <div>
                <span className="text-[11px] text-[#647A9E] block">Sent</span>
                <span className="text-lg font-bold text-[#38D9F5] font-mono">{pendingOutgoing.length}</span>
              </div>
            </div>
          </div>
        </FeatureBanner>
      )}

      {/* Section Tabs */}
      <FeatureTabBar
        tabs={sectionTabs}
        activeId={section}
        onSelect={setSection}
        ariaLabel="Player discovery sections"
        layoutId="discover-section-tab"
        className="w-fit"
      />

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs ${
            notice.type === 'error'
              ? 'bg-[#F43F5E]/15 border-[#F43F5E]/45 text-[#FB7185]'
              : 'bg-[#10B981]/15 border-[#10B981]/45 text-[#10B981]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {!unifiedBackendReady && (
        <div className="p-4 rounded-xl bg-[#00D9FF]/10 border border-[#00D9FF]/35 text-xs text-[#38D9F5]">
          Player discovery and friend requests are currently offline. Please check your connection or try again shortly.
        </div>
      )}

      {/* DISCOVER PLAYERS */}
      {section === 'discover' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="lq-surface rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A8C7] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username, character name, or class..."
                className="lq-input pl-10 pr-4 py-2.5 text-xs w-full"
              />
            </div>

            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value as 'All' | CharacterClass)}
              className="lq-input px-3.5 py-2.5 text-xs sm:w-auto"
              aria-label="Filter by character class"
            >
              <option value="All">All Classes</option>
              <option value="Warrior">Warrior</option>
              <option value="Mage">Mage</option>
              <option value="Ranger">Ranger</option>
              <option value="Guardian">Guardian</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="lq-btn lq-btn-primary py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </form>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[#94A8C7] lq-surface rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-[#00D9FF]" />
              <span>Searching Aetheria champions...</span>
            </div>
          ) : error ? (
            <div className="p-6 lq-surface rounded-2xl border-[#F43F5E]/45 text-center space-y-3">
              <p className="text-xs text-[#FB7185]">{error}</p>
              <button
                type="button"
                onClick={() => loadDirectory(searchQuery)}
                className="lq-btn lq-btn-primary py-2 px-4 rounded-xl text-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : enrichedChampions.length === 0 ? (
            <div className="p-10 lq-surface rounded-2xl text-center space-y-2">
              <Users className="w-7 h-7 text-[#00D9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No matching players found</p>
              <p className="text-xs text-[#94A8C7]">
                Try another username or clear your class filter to view all public champions.
              </p>
            </div>
          ) : (
            <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrichedChampions.map(champ => {
                const rel = champ.relationshipStatus || 'none';
                const statusLabel =
                  rel === 'friends'
                    ? 'Already friends'
                    : rel === 'request_sent'
                    ? 'Request sent'
                    : rel === 'request_received'
                    ? 'Request received'
                    : rel === 'blocked'
                    ? 'Blocked'
                    : 'Not friends';

                return (
                  <RpgStaggerItem key={champ.id}>
                    <div className="lq-card rounded-2xl p-4 h-full flex flex-col justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => openPublicProfile(champ.id)}
                          className="shrink-0 focus:outline-none group cursor-pointer"
                          title={`View ${champ.username}'s profile`}
                        >
                          <img
                            src={getRpgAvatarForClass(champ.characterClass)}
                            alt={`${champ.characterClass} Portrait`}
                            className="w-14 h-14 rounded-xl object-cover object-top border border-[#1677FF]/60 group-hover:border-[#00D9FF] transition-colors"
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              {(() => {
                                const liveP = getPlayerPresence(champ.id);
                                const effectiveStatus = liveP.hidden
                                  ? 'offline'
                                  : champ.presenceStatus || liveP.status;
                                return !liveP.hidden ? (
                                  <PresenceBadge status={effectiveStatus} size="xs" />
                                ) : null;
                              })()}
                              <button
                                type="button"
                                onClick={() => openPublicProfile(champ.id)}
                                className="text-sm font-bold text-[#F2F7FF] hover:text-[#00D9FF] truncate text-left transition-colors cursor-pointer"
                              >
                                {champ.username}
                              </button>
                              <LegendTitleBadge
                                title={champ.legendTitle || equippedLegendMap[champ.id]?.titleTag}
                                style={champ.legendTitleStyle || equippedLegendMap[champ.id]?.titleStyle}
                                emblemIcon={champ.legendEmblem || equippedLegendMap[champ.id]?.emblemIcon}
                                size="xs"
                              />
                            </div>
                            <span
                              className={`text-[11px] font-medium shrink-0 ${
                                rel === 'friends'
                                  ? 'text-[#10B981]'
                                  : rel === 'request_sent' || rel === 'request_received'
                                  ? 'text-[#00D9FF]'
                                  : 'text-[#647A9E]'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-[#38D9F5] mt-0.5 tabular-nums">
                            {champ.levelHidden ? 'Level Private' : `Lv.${champ.level}`} · {champ.characterClass} · {champ.aetherRank}
                            {(() => {
                              const liveP = getPlayerPresence(champ.id);
                              if (liveP.hidden || liveP.status === 'online') return '';
                              const ts = champ.lastActiveAt || liveP.lastActiveAt;
                              return ts ? ` · Last active ${formatLastActiveRelative(ts)}` : '';
                            })()}
                          </p>
                          {champ.guildName && (
                            <p className="text-[11px] text-[#94A8C7] mt-1 truncate">
                              [{champ.guildTag}] {champ.guildName}
                            </p>
                          )}
                          {champ.bio && (
                            <p className="text-xs text-[#94A8C7] mt-1.5 line-clamp-2">
                              {champ.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1E3A63]">
                        <button
                          type="button"
                          onClick={() => openPublicProfile(champ.id)}
                          className="lq-btn lq-btn-secondary py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#00D9FF]" />
                          View Profile
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          {rel === 'none' && (
                            <button
                              type="button"
                              disabled={busyId === champ.id}
                              onClick={() => handleSendRequest(champ)}
                              className="lq-btn lq-btn-primary py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Send Request
                            </button>
                          )}
                          {rel === 'request_sent' && champ.friendshipId && (
                            <button
                              type="button"
                              disabled={busyId === champ.friendshipId}
                              onClick={() => handleCancelRequest(champ.friendshipId!, champ.username)}
                              className="lq-btn lq-btn-secondary py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}
                          {rel === 'request_received' && champ.friendshipId && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === champ.friendshipId}
                                onClick={() => handleRespond(champ.friendshipId!, true, champ.username)}
                                className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:brightness-110 text-[#061225] text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Accept
                              </button>
                              <button
                                type="button"
                                disabled={busyId === champ.friendshipId}
                                onClick={() => handleRespond(champ.friendshipId!, false, champ.username)}
                                className="lq-btn lq-btn-secondary py-1.5 px-3 rounded-lg text-xs whitespace-nowrap cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {rel === 'friends' && champ.friendshipId && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingConfirm({
                                  kind: 'remove',
                                  targetUserId: champ.id,
                                  friendshipId: champ.friendshipId!,
                                  username: champ.username,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg text-[#94A8C7] hover:text-[#FB7185] hover:bg-[#F43F5E]/15 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </RpgStaggerItem>
                );
              })}
            </RpgStaggerGrid>
          )}
        </div>
      )}

      {/* FRIENDS LIST */}
      {section === 'friends' && (
        <div className="lq-surface rounded-2xl p-5 divide-y divide-[#1E3A63]/65">
          {acceptedFriends.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Users className="w-7 h-7 text-[#00D9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No friends added yet</p>
              <p className="text-xs text-[#94A8C7]">
                Use Discover Players to find active champions and send a friend request.
              </p>
              <button
                type="button"
                onClick={() => setSection('discover')}
                className="lq-btn lq-btn-primary py-2 px-4 rounded-xl text-xs cursor-pointer"
              >
                Browse Players
              </button>
            </div>
          ) : (
            acceptedFriends.map(f => (
              <div
                key={f.friendshipId}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="shrink-0 focus:outline-none cursor-pointer"
                  >
                    <img
                      src={getRpgAvatarForClass(f.champion.characterClass)}
                      alt={f.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-[#1677FF]/60"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const liveP = getPlayerPresence(f.champion.id);
                        return !liveP.hidden ? (
                          <PresenceBadge status={f.champion.presenceStatus || liveP.status} size="xs" />
                        ) : null;
                      })()}
                      <button
                        type="button"
                        onClick={() => openPublicProfile(f.champion.id)}
                        className="text-sm font-bold text-[#F2F7FF] hover:text-[#00D9FF] truncate block transition-colors cursor-pointer"
                      >
                        {f.champion.username}
                      </button>
                      <LegendTitleBadge
                        title={f.champion.legendTitle || equippedLegendMap[f.champion.id]?.titleTag}
                        style={f.champion.legendTitleStyle || equippedLegendMap[f.champion.id]?.titleStyle}
                        emblemIcon={f.champion.legendEmblem || equippedLegendMap[f.champion.id]?.emblemIcon}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#94A8C7] tabular-nums">
                      Lv.{f.champion.level} · {f.champion.characterClass} · {f.champion.currentStreak}d streak
                      {(() => {
                        const liveP = getPlayerPresence(f.champion.id);
                        if (liveP.hidden) return '';
                        if (liveP.status === 'online') return ' · Online now';
                        const ts = f.champion.lastActiveAt || liveP.lastActiveAt;
                        return ts ? ` · Last active ${formatLastActiveRelative(ts)}` : '';
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="lq-btn lq-btn-secondary py-1.5 px-3 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingConfirm({
                        kind: 'remove',
                        targetUserId: f.champion.id,
                        friendshipId: f.friendshipId,
                        username: f.champion.username,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-[#94A8C7] hover:text-[#FB7185] hover:bg-[#F43F5E]/15 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingConfirm({
                        kind: 'block',
                        targetUserId: f.champion.id,
                        username: f.champion.username,
                      })
                    }
                    className="p-1.5 rounded-lg text-[#94A8C7] hover:text-[#FB7185] hover:bg-[#F43F5E]/15 cursor-pointer transition-colors"
                    title="Block user"
                    aria-label={`Block ${f.champion.username}`}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RECEIVED REQUESTS */}
      {section === 'received' && (
        <div className="lq-surface rounded-2xl p-5 divide-y divide-[#1E3A63]/65">
          {pendingIncoming.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Inbox className="w-7 h-7 text-[#00D9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No incoming friend requests</p>
              <p className="text-xs text-[#94A8C7]">
                When another player sends you a request, it will appear here.
              </p>
            </div>
          ) : (
            pendingIncoming.map(req => (
              <div
                key={req.friendshipId}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="shrink-0 cursor-pointer"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-[#1677FF]/60"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(req.champion.id)}
                        className="text-sm font-bold text-[#F2F7FF] hover:text-[#00D9FF] truncate block transition-colors cursor-pointer"
                      >
                        {req.champion.username}
                      </button>
                      <LegendTitleBadge
                        title={req.champion.legendTitle || equippedLegendMap[req.champion.id]?.titleTag}
                        style={req.champion.legendTitleStyle || equippedLegendMap[req.champion.id]?.titleStyle}
                        emblemIcon={req.champion.legendEmblem || equippedLegendMap[req.champion.id]?.emblemIcon}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#38D9F5] tabular-nums">
                      Lv.{req.champion.level} · {req.champion.characterClass} · Wants to connect
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === req.friendshipId}
                    onClick={() => handleRespond(req.friendshipId, true, req.champion.username)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:brightness-110 text-[#061225] text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.friendshipId}
                    onClick={() => handleRespond(req.friendshipId, false, req.champion.username)}
                    className="lq-btn lq-btn-secondary py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SENT REQUESTS */}
      {section === 'sent' && (
        <div className="lq-surface rounded-2xl p-5 divide-y divide-[#1E3A63]/65">
          {pendingOutgoing.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="w-7 h-7 text-[#00D9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No pending sent requests</p>
              <p className="text-xs text-[#94A8C7]">
                Requests you send to other champions appear here until accepted or cancelled.
              </p>
            </div>
          ) : (
            pendingOutgoing.map(req => (
              <div
                key={req.friendshipId}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="shrink-0 cursor-pointer"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-[#1677FF]/60"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(req.champion.id)}
                        className="text-sm font-bold text-[#F2F7FF] hover:text-[#00D9FF] truncate block transition-colors cursor-pointer"
                      >
                        {req.champion.username}
                      </button>
                      <LegendTitleBadge
                        title={req.champion.legendTitle || equippedLegendMap[req.champion.id]?.titleTag}
                        style={req.champion.legendTitleStyle || equippedLegendMap[req.champion.id]?.titleStyle}
                        emblemIcon={req.champion.legendEmblem || equippedLegendMap[req.champion.id]?.emblemIcon}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#94A8C7] tabular-nums">
                      Lv.{req.champion.level} · {req.champion.characterClass} · Awaiting response
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === req.friendshipId}
                  onClick={() => handleCancelRequest(req.friendshipId, req.champion.username)}
                  className="lq-btn lq-btn-secondary py-1.5 px-3.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* BLOCKED USERS */}
      {section === 'blocked' && (
        <div className="lq-surface rounded-2xl p-5 divide-y divide-[#1E3A63]/65">
          {blockedUsers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Ban className="w-7 h-7 text-[#00D9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No blocked users</p>
              <p className="text-xs text-[#94A8C7]">
                Players you block cannot send you friend requests, chat whispers, or view your profile.
              </p>
            </div>
          ) : (
            blockedUsers.map(b => (
              <div
                key={b.id}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={getRpgAvatarForClass(b.characterClass)}
                    alt={b.username}
                    className="w-10 h-10 rounded-xl object-cover object-top border border-[#1E3A63] grayscale"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#F2F7FF] truncate">{b.username}</p>
                    <p className="text-xs text-[#94A8C7] tabular-nums">
                      Lv.{b.level} · {b.characterClass}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => handleUnblock(b.id, b.username)}
                  className="lq-btn lq-btn-secondary py-1.5 px-3.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal for Remove Friend / Block User */}
      <RpgModalWrapper
        isOpen={Boolean(pendingConfirm)}
        onClose={() => setPendingConfirm(null)}
        panelClassName="w-full max-w-sm"
      >
        {pendingConfirm && (
          <div className="lq-surface-elevated border border-[#F43F5E]/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#FB7185]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-['Cinzel'] font-bold text-base">
                {pendingConfirm.kind === 'block' ? 'Block Player?' : 'Remove Friend?'}
              </h3>
            </div>
            <p className="text-xs text-[#94A8C7] leading-relaxed">
              {pendingConfirm.kind === 'block'
                ? `Block ${pendingConfirm.username}? Existing friendship links will be removed and neither of you will see each other in discovery or leaderboards.`
                : `Remove ${pendingConfirm.username} from your friends list? You can send a new friend request later if you change your mind.`}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="lq-btn lq-btn-secondary py-2 px-4 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === pendingConfirm.targetUserId}
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-[#F43F5E] hover:brightness-110 text-[#061225] text-xs font-bold cursor-pointer"
              >
                {pendingConfirm.kind === 'block' ? 'Block User' : 'Remove Friend'}
              </button>
            </div>
          </div>
        )}
      </RpgModalWrapper>
    </div>
  );
};

