import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { ChampionSummary, LeaderboardEntry, LeaderboardScope } from '../../types/game';
import {
  Users,
  Search,
  UserPlus,
  Check,
  X,
  UserMinus,
  Loader2,
  Info,
  Compass,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';

export const LeaderboardView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    fetchLeaderboard,
    friends,
    searchChampions,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    unifiedBackendReady,
    openPublicProfile,
    setActiveTab: setAppTab,
    equippedLegendMap,
  } = useGame();

  const [activeTab, setActiveTab] = useState<LeaderboardScope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChampionSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendNotice, setFriendNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLeaderboard(activeTab).then(res => {
      if (!active) return;
      setEntries(res.entries);
      setIsLiveBackend(res.isLiveBackend);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeTab, unifiedBackendReady]);

  const handleSearchChampions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    const list = await searchChampions(searchQuery);
    setSearchResults(list);
    setSearching(false);
  };

  const handleAddFriend = async (targetId: string, username: string) => {
    const res = await sendFriendRequest(targetId);
    if (!res.success && res.error) {
      setFriendNotice({ type: 'error', text: res.error });
    } else {
      setFriendNotice({ type: 'success', text: `Friend request sent to ${username}!` });
    }
    setTimeout(() => setFriendNotice(null), 3500);
  };

  const pendingIncoming = friends.filter(f => f.status === 'pending' && f.direction === 'incoming');
  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner / Scope Toolbar */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e0a1b] border border-purple-950/90 rounded-2xl p-4">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white">
              Aetheria Hall of Champions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any champion to inspect their public profile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#090714] rounded-xl border border-purple-950">
            {(['global', 'weekly', 'monthly', 'guild', 'friends'] as LeaderboardScope[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab
                    ? 'bg-purple-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-amber-400">
                  Honor of the Realm
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-purple-300 font-semibold">Unified Web & Mobile Rankings</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
                AETHERIA HALL OF CHAMPIONS
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
                Rankings reflect healthy habit streaks, quest completions, and verified fitness participation. Click any champion to inspect their public profile.
              </p>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#090714] rounded-xl border border-purple-950">
              {(['global', 'weekly', 'monthly', 'guild', 'friends'] as LeaderboardScope[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab
                      ? 'bg-purple-800 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLiveBackend && !loading && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Showing your personal realm standing. Live multi-player rankings will appear automatically once connected.
          </span>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-950/80 bg-[#130f24] text-[11px] font-semibold uppercase tracking-wider text-purple-300">
                <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                <th className="py-3.5 px-4">Champion</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4 text-center">Level</th>
                <th className="py-3.5 px-4 text-center">Habit Streak</th>
                <th className="py-3.5 px-4 text-right">
                  {activeTab === 'weekly'
                    ? 'Weekly XP'
                    : activeTab === 'monthly'
                    ? 'Monthly XP'
                    : 'Progress Score'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-950/50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      Loading {activeTab} standings...
                    </span>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {activeTab === 'guild'
                      ? 'Join a guild in the Guilds tab to see your fellowship leaderboard!'
                      : activeTab === 'friends'
                      ? 'Add companions in Discover & Friends to compare streaks and scores.'
                      : 'No ranked champions found in this period yet.'}
                  </td>
                </tr>
              ) : (
                entries.map(player => (
                  <tr
                    key={`${player.userId}-${player.rank}`}
                    onClick={() => openPublicProfile(player.userId)}
                    className={`transition-colors cursor-pointer ${
                      player.isCurrent
                        ? 'bg-purple-950/40 font-semibold text-purple-200 hover:bg-purple-950/55'
                        : 'hover:bg-purple-950/25 text-slate-300'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-mono font-bold tabular-nums">
                      {player.rank === 1 && <span className="text-amber-400 text-base">🥇</span>}
                      {player.rank === 2 && <span className="text-slate-300 text-base">🥈</span>}
                      {player.rank === 3 && <span className="text-amber-600 text-base">🥉</span>}
                      {player.rank > 3 && <span className="text-slate-400">#{player.rank}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openPublicProfile(player.userId);
                        }}
                        className="flex items-center gap-3 text-left group"
                      >
                        <img
                          src={getRpgAvatarForClass(player.characterClass)}
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover object-top border border-purple-600 shrink-0"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {player.name}
                          </span>
                          <LegendTitleBadge
                            title={player.legendTitle || equippedLegendMap[player.userId]?.titleTag}
                            style={player.legendTitleStyle || equippedLegendMap[player.userId]?.titleStyle}
                            emblemIcon={player.legendEmblem || equippedLegendMap[player.userId]?.emblemIcon}
                            size="xs"
                          />
                          {player.isCurrent && (
                            <span className="text-[10px] bg-purple-700 text-white px-1.5 py-0.5 rounded font-mono">
                              YOU
                            </span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-purple-300">{player.characterClass}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200 tabular-nums">
                      Lv.{player.level}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-amber-400 tabular-nums">
                      🔥 {player.streak}d
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-300 tabular-nums">
                      {player.score.toLocaleString()} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Companions & Friend Requests Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Champions */}
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              FIND CHAMPIONS
            </h3>
            <button
              type="button"
              onClick={() => setAppTab('friends')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900/70 border border-purple-800/70 text-[11px] font-semibold text-purple-200 whitespace-nowrap shrink-0 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Discover Players
            </button>
          </div>

          <form onSubmit={handleSearchChampions} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search champion username..."
              className="flex-1 bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              {searching ? '...' : 'Search'}
            </button>
          </form>

          {friendNotice && (
            <div
              className={`p-2.5 rounded-xl border text-xs text-center ${
                friendNotice.type === 'error'
                  ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              }`}
            >
              {friendNotice.text}
            </div>
          )}

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {searchResults.map(champ => {
              const linked = friends.find(f => f.champion.id === champ.id);
              const relationLabel =
                linked?.status === 'accepted'
                  ? 'Friends'
                  : linked?.status === 'pending'
                  ? linked.direction === 'outgoing'
                    ? 'Pending Sent'
                    : 'Respond'
                  : 'Add Friend';

              return (
                <div
                  key={champ.id}
                  className="p-2.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => openPublicProfile(champ.id)}
                    className="flex items-center gap-2.5 min-w-0 text-left group"
                  >
                    <img
                      src={getRpgAvatarForClass(champ.characterClass)}
                      alt={champ.username}
                      className="w-8 h-8 rounded-full object-cover object-top border border-purple-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {champ.username}
                        </p>
                        <LegendTitleBadge
                          title={champ.legendTitle || equippedLegendMap[champ.id]?.titleTag}
                          style={champ.legendTitleStyle || equippedLegendMap[champ.id]?.titleStyle}
                          emblemIcon={champ.legendEmblem || equippedLegendMap[champ.id]?.emblemIcon}
                          size="xs"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Lv.{champ.level} {champ.characterClass} · {champ.aetherRank}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={!!linked}
                    onClick={() => handleAddFriend(champ.id, champ.username)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 ${
                      linked
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : 'bg-purple-700 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {relationLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Friend Requests & Accepted Companions */}
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              COMPANIONS & REQUESTS ({acceptedFriends.length})
            </h3>
            <button
              type="button"
              onClick={() => setAppTab('friends')}
              className="text-[11px] font-semibold text-purple-300 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              Manage All →
            </button>
          </div>

          {pendingIncoming.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                Incoming Friend Requests
              </span>
              {pendingIncoming.map(req => (
                <div
                  key={req.friendshipId}
                  className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-700/60 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="flex items-center gap-2.5 min-w-0 text-left group"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-8 h-8 rounded-full object-cover object-top border border-purple-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {req.champion.username}
                        </p>
                        <LegendTitleBadge
                          title={req.champion.legendTitle || equippedLegendMap[req.champion.id]?.titleTag}
                          style={req.champion.legendTitleStyle || equippedLegendMap[req.champion.id]?.titleStyle}
                          emblemIcon={req.champion.legendEmblem || equippedLegendMap[req.champion.id]?.emblemIcon}
                          size="xs"
                        />
                      </div>
                      <p className="text-[10px] text-purple-300">
                        Lv.{req.champion.level} {req.champion.characterClass}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => respondFriendRequest(req.friendshipId, true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={() => respondFriendRequest(req.friendshipId, false)}
                      className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-200 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {acceptedFriends.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No companions added yet. Visit Discover Players or search on the left!
              </p>
            ) : (
              acceptedFriends.map(f => (
                <div
                  key={f.friendshipId}
                  className="p-2.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="flex items-center gap-2.5 min-w-0 text-left group"
                  >
                    <img
                      src={getRpgAvatarForClass(f.champion.characterClass)}
                      alt={f.champion.username}
                      className="w-8 h-8 rounded-full object-cover object-top border border-purple-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {f.champion.username}
                        </p>
                        <LegendTitleBadge
                          title={f.champion.legendTitle || equippedLegendMap[f.champion.id]?.titleTag}
                          style={f.champion.legendTitleStyle || equippedLegendMap[f.champion.id]?.titleStyle}
                          emblemIcon={f.champion.legendEmblem || equippedLegendMap[f.champion.id]?.emblemIcon}
                          size="xs"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Lv.{f.champion.level} {f.champion.characterClass} · 🔥 {f.champion.currentStreak}d
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeFriend(f.friendshipId)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 shrink-0"
                    title="Remove friend"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
