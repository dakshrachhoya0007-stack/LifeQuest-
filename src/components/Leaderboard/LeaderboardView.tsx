import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { IDENTITY_RARITY_STYLE } from '../../data/polish2Data';
import type {
  AdvancedLeaderboardResponse,
  ChampionSummary,
  IdentityRarity,
  LeaderboardEntry,
  LeaderboardScope,
} from '../../types/game';
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
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';

const SCOPE_LABELS: Record<LeaderboardScope, string> = {
  global: 'Global Realm Standings',
  weekly: 'Weekly Progression',
  monthly: 'Monthly Progression',
  seasonal: 'Seasonal Standings',
  guild: 'Guild Fellowship',
  friends: 'Friends & Rivals',
  strength: 'Strength Mastery',
  endurance: 'Endurance Mastery',
  consistency: 'Consistency Mastery',
  discipline: 'Discipline Mastery',
  community: 'Community Impact',
  boss_battle: 'Weekly Raid Boss',
};

const LEADERBOARD_SCOPE_GROUPS: Array<{
  group: string;
  items: Array<{ id: LeaderboardScope; label: string }>;
}> = [
  {
    group: 'Overview',
    items: [
      { id: 'global', label: 'Global' },
      { id: 'friends', label: 'Friends' },
      { id: 'guild', label: 'Guild' },
    ],
  },
  {
    group: 'Periods',
    items: [
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' },
      { id: 'seasonal', label: 'Seasonal' },
    ],
  },
  {
    group: 'Pillars & Events',
    items: [
      { id: 'strength', label: 'Strength' },
      { id: 'endurance', label: 'Endurance' },
      { id: 'consistency', label: 'Consistency' },
      { id: 'discipline', label: 'Discipline' },
      { id: 'community', label: 'Community' },
      { id: 'boss_battle', label: 'Boss Raid' },
    ],
  },
];

const renderRankDelta = (delta?: number | null) => {
  if (typeof delta !== 'number') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-500" title="No prior snapshot comparison">
        <Minus className="w-3 h-3" />
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-400 tabular-nums" title={`Up ${delta} ranks`}>
        <TrendingUp className="w-3 h-3" />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-rose-400 tabular-nums" title={`Down ${Math.abs(delta)} ranks`}>
        <TrendingDown className="w-3 h-3" />
        {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-mono text-slate-500" title="Unchanged">
      —
    </span>
  );
};

export const LeaderboardView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    queryAdvancedLeaderboard,
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

  const [activeScope, setActiveScope] = useState<LeaderboardScope>('global');
  const [page, setPage] = useState<number>(1);
  const [boardData, setBoardData] = useState<AdvancedLeaderboardResponse | null>(null);
  const [fallbackEntries, setFallbackEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChampionSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendNotice, setFriendNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    queryAdvancedLeaderboard(activeScope, page, 20).then(async res => {
      if (!active) return;
      if (res.ok && res.data) {
        setBoardData(res.data);
        setFallbackEntries(res.data.entries);
        setIsLiveBackend(res.isLiveBackend);
      } else {
        const legacy = await fetchLeaderboard(activeScope);
        if (!active) return;
        setBoardData(null);
        setFallbackEntries(legacy.entries);
        setIsLiveBackend(legacy.isLiveBackend);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeScope, page, unifiedBackendReady]);

  const handleScopeChange = (nextScope: LeaderboardScope) => {
    setActiveScope(nextScope);
    setPage(1);
  };

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

  const entries = boardData?.entries || fallbackEntries;
  const currentUserEntry = boardData?.currentUserEntry || entries.find(e => e.isCurrent) || null;
  const scoreUnit = boardData?.scoreUnit || 'pts';
  const totalPages = boardData?.totalPages || 1;
  const historicalSnapshots = boardData?.historicalSnapshots || [];
  const scopeTitle = SCOPE_LABELS[activeScope] || 'Standings';

  const pendingIncoming = friends.filter(f => f.status === 'pending' && f.direction === 'incoming');
  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header & 12-Category Filter Selector */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-[#C5A15A]/22 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Honor of the Realm
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-purple-300 font-medium">{scopeTitle}</span>
              {boardData?.resetLabel && (
                <>
                  <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                  <span className="text-[#D9D2C5]/65 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#C5A15A]" />
                    {boardData.resetLabel}
                  </span>
                </>
              )}
            </div>
            {embedded ? (
              <h2 className="font-['Cinzel'] font-bold text-lg sm:text-xl text-white">
                Aetheria Hall of Champions
              </h2>
            ) : (
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
                AETHERIA HALL OF CHAMPIONS
              </h1>
            )}
            <p className="text-xs text-[#D9D2C5]/75 mt-1 max-w-2xl">
              Compare verified real-life workouts, Skill Tree mastery, consistency streaks, seasonal dedication, and Weekly Raid Boss strikes across 12 competitive categories.
            </p>
          </div>
        </div>

        {/* 12 Category Tabs Grouped Cleanly */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
          {LEADERBOARD_SCOPE_GROUPS.map(group => (
            <div
              key={group.group}
              className="p-2 rounded-xl bg-[#090714]/90 border border-purple-950/80 space-y-1.5"
            >
              <span className="px-1.5 text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#C5A15A]/80 block">
                {group.group}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.items.map(tab => {
                  const isActive = activeScope === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleScopeChange(tab.id)}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/50 shadow-sm'
                          : 'text-[#D9D2C5]/65 hover:text-white hover:bg-[#161028] border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isLiveBackend && !loading && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Showing verified standings from recorded player activity. Additional cross-realm entries sync automatically as players compete.
          </span>
        </div>
      )}

      {/* Your Standing Highlight Banner */}
      {currentUserEntry && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#21153b] via-[#140e27] to-[#1d1532] border border-[#C5A15A]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#0c0916] border border-[#C5A15A]/55 flex flex-col items-center justify-center shrink-0">
              <span className="font-mono font-black text-sm text-[#C5A15A] tabular-nums">
                #{currentUserEntry.rank}
              </span>
              {renderRankDelta(currentUserEntry.rankDelta)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-['Cinzel'] uppercase tracking-wider text-[#C5A15A] font-bold">
                  Your Standing
                </span>
                {currentUserEntry.equippedTitleName && (
                  <span className="text-[11px] text-purple-200 font-semibold">
                    · {currentUserEntry.equippedTitleName}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white truncate">{currentUserEntry.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs shrink-0">
            <div>
              <span className="text-[10px] text-[#D9D2C5]/55 uppercase block">Level</span>
              <span className="font-mono font-bold text-white tabular-nums">
                Lv.{currentUserEntry.level}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#D9D2C5]/55 uppercase block">Streak</span>
              <span className="font-mono font-bold text-amber-300 tabular-nums">
                {currentUserEntry.streak}d
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#D9D2C5]/55 uppercase block">
                {scopeTitle}
              </span>
              <span className="font-mono font-black text-base text-[#E8CF96] tabular-nums">
                {currentUserEntry.score.toLocaleString()} {scoreUnit}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-950/80 bg-[#130f24] text-[11px] font-semibold uppercase tracking-wider text-purple-300">
                <th className="py-3.5 px-4 w-24 text-center">Rank</th>
                <th className="py-3.5 px-4">Champion</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4 text-center">Level</th>
                <th className="py-3.5 px-4 text-center">Streak</th>
                <th className="py-3.5 px-4 text-right">{scoreUnit.toUpperCase()}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-950/50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      Loading standings...
                    </span>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {activeScope === 'guild'
                      ? 'Join a guild in the Guilds tab to see your fellowship leaderboard!'
                      : activeScope === 'friends'
                      ? 'Add companions in Discover & Friends to compare streaks and scores.'
                      : 'No ranked champions recorded in this category yet.'}
                  </td>
                </tr>
              ) : (
                entries.map(player => {
                  const titleRarity = player.equippedTitleRarity as IdentityRarity | undefined;
                  const titleColorClass =
                    titleRarity && IDENTITY_RARITY_STYLE[titleRarity]
                      ? IDENTITY_RARITY_STYLE[titleRarity].text
                      : 'text-[#C5A15A]';
                  return (
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
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {player.rank === 1 && <span className="text-amber-400 text-base">🥇</span>}
                          {player.rank === 2 && <span className="text-slate-300 text-base">🥈</span>}
                          {player.rank === 3 && <span className="text-amber-600 text-base">🥉</span>}
                          {player.rank > 3 && <span className="text-slate-400">#{player.rank}</span>}
                          {renderRankDelta(player.rankDelta)}
                        </div>
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
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
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
                            {player.equippedTitleName && (
                              <span className={`text-[10px] font-semibold block ${titleColorClass}`}>
                                {player.equippedTitleName}
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
                        {player.streak}d
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#E8CF96] tabular-nums">
                        {player.score.toLocaleString()} {scoreUnit}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-purple-950/70 bg-[#120d22] flex items-center justify-between gap-2 text-xs">
            <span className="text-[#D9D2C5]/65 tabular-nums">
              Page {page} of {totalPages} · {boardData?.totalEntries || entries.length} ranked
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-[#19122e] border border-purple-900/60 text-[#D9D2C5] disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-[#19122e] border border-purple-900/60 text-[#D9D2C5] disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historical Snapshots */}
      {historicalSnapshots.length > 0 && (
        <div className="bg-[#0e0a1b] border border-purple-950/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#C5A15A]" />
              HISTORICAL LEADERBOARD SNAPSHOTS
            </h3>
            <span className="text-[11px] text-[#D9D2C5]/60 tabular-nums">
              {historicalSnapshots.length} Archived Periods
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {historicalSnapshots.slice(0, 6).map(snap => (
              <div
                key={`${snap.scope}-${snap.periodKey}-${snap.capturedAt}`}
                className="p-3.5 rounded-xl bg-[#130e24] border border-purple-950/70 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-['Cinzel'] font-bold text-[#C5A15A]">
                    {snap.periodKey}
                  </span>
                  <span className="text-[#D9D2C5]/50 tabular-nums">
                    {new Date(snap.capturedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {snap.topThree.map(row => (
                    <div key={`${snap.periodKey}-${row.userId}`} className="flex items-center justify-between gap-2">
                      <span className="text-[#D9D2C5]/85 truncate">
                        #{row.rank} {row.name}
                      </span>
                      <span className="font-mono text-[#E8CF96] tabular-nums shrink-0">
                        {row.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              COMPANIONS &amp; REQUESTS ({acceptedFriends.length})
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
                        Lv.{f.champion.level} {f.champion.characterClass} · {f.champion.currentStreak}d streak
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
