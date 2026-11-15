import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  GLOBAL_LEGEND_CATEGORIES,
  RARITY_FRAME_META,
  TITLE_STYLE_META,
} from '../../data/globalLegendsData';
import { GlobalAchievementCategory, HallOfLegendsStatus } from '../../types/game';
import { LegendEmblemIcon, LegendTitleBadge } from '../Social/LegendTitleBadge';
import {
  Crown,
  Lock,
  Sparkles,
  Hammer,
  Coins,
  Search,
  RefreshCw,
  Globe2,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Scroll,
} from 'lucide-react';

export const HallOfLegendsView: React.FC = () => {
  const {
    hallOfLegends,
    legendAnnouncements,
    hallLoading,
    refreshHallOfLegends,
    claimGlobalExclusiveAchievement,
    equipGlobalLegendTitle,
    openPublicProfile,
    user,
  } = useGame();

  const [activeCategory, setActiveCategory] = useState<GlobalAchievementCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'unclaimed' | 'claimed' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const summary = useMemo(() => {
    const claimedCount = hallOfLegends.filter(h => h.status === 'claimed').length;
    const readyCount = hallOfLegends.filter(h => h.eligibleToClaim).length;
    const mineCount = hallOfLegends.filter(h => h.ownedByCurrentUser).length;
    return { total: hallOfLegends.length, claimedCount, readyCount, mineCount };
  }, [hallOfLegends]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return hallOfLegends.filter(entry => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) return false;
      if (statusFilter === 'ready' && !entry.eligibleToClaim) return false;
      if (statusFilter === 'unclaimed' && entry.status === 'claimed') return false;
      if (statusFilter === 'claimed' && entry.status !== 'claimed') return false;
      if (statusFilter === 'mine' && !entry.ownedByCurrentUser) return false;

      if (q) {
        const revealed = !entry.isHidden || entry.status === 'claimed' || entry.eligibleToClaim;
        const searchable = [
          revealed ? entry.name : 'secret hidden legend',
          revealed ? entry.titleTag : '',
          entry.rarity,
          entry.ownership?.ownerUsername || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [hallOfLegends, activeCategory, statusFilter, searchQuery]);

  const handleClaim = async (achievementId: string) => {
    setFeedback(null);
    setClaimingId(achievementId);
    try {
      const res = await claimGlobalExclusiveAchievement(achievementId);
      if (!res.success) {
        setFeedback({
          type: 'error',
          text: res.error || 'Could not claim this Global Exclusive Title.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'You are now the sole permanent owner of this Worldwide Title!',
        });
      }
    } finally {
      setClaimingId(null);
    }
  };

  const handleEquipToggle = async (achievementId: string) => {
    const isAlreadyEquipped = user?.legendAchievementId === achievementId;
    const res = await equipGlobalLegendTitle(isAlreadyEquipped ? null : achievementId);
    if (!res.success && res.error) {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  const statusBadgeText = (status: HallOfLegendsStatus, ownedByMe: boolean) => {
    if (status === 'claimed') return ownedByMe ? 'CLAIMED BY YOU' : 'CLAIMED FOREVER';
    if (status === 'unclaimed') return 'UNCLAIMED · ELIGIBLE NOW';
    return 'LOCKED FOR YOU';
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Hall Header Banner */}
      <div className="rounded-2xl border border-[#C5A15A]/35 bg-gradient-to-br from-[#19112b] via-[#0e0a1a] to-[#1a1308] p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A] flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" />
                One-Player-Only Worldwide Registry
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75 tabular-nums">
                {summary.claimedCount}/{summary.total} Claimed Globally
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-emerald-300 font-semibold tabular-nums">
                {summary.readyCount} Ready to Claim
              </span>
            </div>
            <h2 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white tracking-wide">
              HALL OF LEGENDS
            </h2>
            <p className="text-xs sm:text-sm text-[#D9D2C5]/75 mt-1 max-w-2xl">
              Fifty-two unique worldwide honors. Only the very first champion in Aetheria to fulfill a requirement may claim each title—locking it permanently to their name forever.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user?.legendTitle && (
              <div className="flex items-center gap-2 rounded-xl bg-[#090714]/90 border border-[#C5A15A]/25 px-3 py-2">
                <span className="text-[11px] text-slate-400">Active Title:</span>
                <LegendTitleBadge
                  title={user.legendTitle}
                  style={user.legendTitleStyle}
                  emblemIcon={user.legendEmblem}
                  size="sm"
                />
              </div>
            )}
            <button
              type="button"
              disabled={hallLoading}
              onClick={refreshHallOfLegends}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1a1230] hover:bg-[#251a43] border border-[#C5A15A]/30 text-xs font-semibold text-[#C5A15A] transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${hallLoading ? 'animate-spin' : ''}`} />
              <span>Sync Registry</span>
            </button>
          </div>
        </div>

        {/* Realm Herald Announcements Strip */}
        {legendAnnouncements.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#C5A15A]/15">
            <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#C5A15A] mb-2">
              <Scroll className="w-3.5 h-3.5" />
              <span>Recent Worldwide Legend Claims</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {legendAnnouncements.slice(0, 6).map(ann => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => openPublicProfile(ann.ownerId)}
                  className="flex items-center gap-2.5 rounded-xl bg-[#090714]/85 hover:bg-[#130e24] border border-white/10 px-3 py-2 text-left transition-colors shrink-0"
                >
                  <LegendTitleBadge
                    title={ann.titleTag}
                    style={ann.titleStyle}
                    emblemIcon={ann.emblemIcon}
                    size="xs"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white">{ann.ownerUsername}</span>
                    <span className="text-slate-400"> claimed {ann.achievementName}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-3.5 flex items-center gap-2 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search 52 worldwide titles, rarities, or holders..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0e0a1b] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#C5A15A]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#090714] rounded-xl border border-white/10">
          {[
            { id: 'all', label: `All (${summary.total})` },
            { id: 'ready', label: `Ready (${summary.readyCount})` },
            { id: 'unclaimed', label: `Unclaimed (${summary.total - summary.claimedCount})` },
            { id: 'claimed', label: `Claimed (${summary.claimedCount})` },
            { id: 'mine', label: `Owned (${summary.mineCount})` },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === item.id
                  ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/40'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            activeCategory === 'all'
              ? 'bg-[#251638] text-[#C5A15A] border-[#C5A15A]/45'
              : 'bg-[#0e0a1b] text-slate-400 border-white/10 hover:text-white'
          }`}
        >
          All 8 Pillars
        </button>
        {GLOBAL_LEGEND_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
              activeCategory === cat.id
                ? 'bg-[#251638] text-[#C5A15A] border-[#C5A15A]/45'
                : 'bg-[#0e0a1b] text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 52 Worldwide Exclusive Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredEntries.map(entry => {
          const rarityMeta = RARITY_FRAME_META[entry.rarity] || RARITY_FRAME_META.Legendary;
          const styleMeta = TITLE_STYLE_META[entry.titleStyle] || TITLE_STYLE_META.gold;
          const isClaimed = entry.status === 'claimed';
          const isSecretMasked = Boolean(entry.isHidden && !isClaimed && !entry.eligibleToClaim);
          const pct = Math.min(100, Math.round((entry.userProgress / entry.threshold) * 100));
          const isEquippedByMe = entry.ownedByCurrentUser && user?.legendAchievementId === entry.id;

          return (
            <div
              key={entry.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                entry.eligibleToClaim
                  ? 'bg-gradient-to-b from-[#1e1431] to-[#110b20] border-[#C5A15A]/75 ring-1 ring-[#C5A15A]/40 shadow-xl'
                  : isClaimed
                  ? entry.ownedByCurrentUser
                    ? 'bg-gradient-to-b from-[#131a26] to-[#0b0e18] border-emerald-500/45'
                    : 'bg-[#0b0913] border-slate-800/90 opacity-90'
                  : `bg-[#0f0c1c] ${rarityMeta.borderClass}`
              }`}
            >
              <div>
                {/* Top Metadata Line (No pill overload) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                        isClaimed && !entry.ownedByCurrentUser
                          ? 'bg-slate-900/80 border-slate-700 text-slate-400'
                          : `${styleMeta.badgeBg} ${styleMeta.badgeBorder} ${styleMeta.glowShadow}`
                      }`}
                    >
                      {isSecretMasked ? (
                        <EyeOff className="w-5 h-5 text-slate-400" />
                      ) : (
                        <LegendEmblemIcon
                          iconName={entry.emblemIcon}
                          className={`w-6 h-6 ${
                            isClaimed && !entry.ownedByCurrentUser ? 'text-slate-400' : styleMeta.badgeText
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className={`font-bold uppercase ${rarityMeta.textClass}`}>{entry.rarity}</span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-slate-400">{entry.difficulty}</span>
                      </div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-white leading-snug mt-0.5 truncate">
                        {isSecretMasked ? 'Hidden Legend of Aetheria' : entry.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Status line */}
                <div className="mt-3 text-[11px] font-mono font-bold tracking-wider uppercase">
                  <span
                    className={
                      entry.eligibleToClaim
                        ? 'text-emerald-400'
                        : entry.ownedByCurrentUser
                        ? 'text-[#C5A15A]'
                        : isClaimed
                        ? 'text-rose-400/90'
                        : 'text-slate-400'
                    }
                  >
                    {statusBadgeText(entry.status, entry.ownedByCurrentUser)}
                  </span>
                </div>

                {/* Story */}
                <p className="text-xs text-[#D9D2C5]/75 leading-relaxed mt-2">
                  {isSecretMasked
                    ? 'A secret one-of-one feat concealed by ancient wards. Keep striving across Aetheria to uncover and claim it first.'
                    : entry.story}
                </p>

                {/* Exclusive Title Preview */}
                {!isSecretMasked && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Title:</span>
                    <LegendTitleBadge
                      title={entry.titleTag}
                      style={entry.titleStyle}
                      emblemIcon={entry.emblemIcon}
                      size="xs"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Requirements, Progress & Ownership */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                <div className="text-xs text-slate-300">
                  <span className="text-slate-500 font-semibold">Requirement: </span>
                  {isSecretMasked ? 'Discovered upon meeting hidden mastery criteria.' : entry.requirementSummary}
                </div>

                {!isClaimed && (
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1 tabular-nums">
                      <span>Your Progress</span>
                      <span>
                        {Math.min(entry.userProgress, entry.threshold).toLocaleString()} / {entry.threshold.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          entry.eligibleToClaim ? 'bg-emerald-400' : 'bg-[#C5A15A]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rewards Row */}
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
                  <span className="flex items-center gap-1 text-purple-300">
                    <Sparkles className="w-3 h-3" />+{entry.rewardPlayerXp} XP
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <Hammer className="w-3 h-3" />+{entry.rewardForgeXp} Forge
                  </span>
                  <span className="flex items-center gap-1 text-yellow-300">
                    <Coins className="w-3 h-3" />+{entry.rewardGold}g
                  </span>
                </div>

                {/* Action / Ownership State */}
                {entry.ownership ? (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-[#090714] border border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-slate-400">Sole Owner: </span>
                        <button
                          type="button"
                          onClick={() => openPublicProfile(entry.ownership!.ownerId)}
                          className="font-bold text-[#C5A15A] hover:underline truncate"
                        >
                          {entry.ownership.ownerUsername}
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {new Date(entry.ownership.claimedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {entry.ownedByCurrentUser ? (
                      <button
                        type="button"
                        onClick={() => handleEquipToggle(entry.id)}
                        className={`w-full py-2 rounded-xl text-xs font-['Cinzel'] font-bold tracking-wider transition-all ${
                          isEquippedByMe
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
                            : 'bg-[#251638] border border-[#C5A15A]/45 text-[#C5A15A] hover:bg-[#311d4a]'
                        }`}
                      >
                        {isEquippedByMe ? 'EQUIPPED ON PROFILE (UNEQUIP)' : 'EQUIP WORLDWIDE TITLE'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Claimed Forever</span>
                      </button>
                    )}
                  </div>
                ) : entry.eligibleToClaim ? (
                  <button
                    type="button"
                    disabled={claimingId === entry.id}
                    onClick={() => handleClaim(entry.id)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C5A15A] to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 text-slate-950 font-['Cinzel'] font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all"
                  >
                    <Crown className="w-4 h-4" />
                    <span>{claimingId === entry.id ? 'VERIFYING WORLD LOCK...' : 'CLAIM WORLDWIDE TITLE'}</span>
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl bg-[#090714] border border-white/10 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unclaimed Worldwide · {pct}% Complete</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
