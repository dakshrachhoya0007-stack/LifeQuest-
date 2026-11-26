import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { RARITY_FRAME_META, TITLE_STYLE_META } from '../../data/globalLegendsData';
import { HallOfLegendsStatus } from '../../types/game';
import { LegendEmblemIcon, LegendTitleBadge } from '../Social/LegendTitleBadge';
import {
  Crown,
  Lock,
  Coins,
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'claimed'>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const summary = useMemo(() => {
    const claimedCount = hallOfLegends.filter(h => h.status === 'claimed').length;
    const readyCount = hallOfLegends.filter(h => h.eligibleToClaim).length;
    return {
      total: hallOfLegends.length,
      claimedCount,
      availableCount: hallOfLegends.length - claimedCount,
      readyCount,
    };
  }, [hallOfLegends]);

  const filteredEntries = useMemo(() => {
    return hallOfLegends.filter(entry => {
      if (statusFilter === 'available' && entry.status === 'claimed') return false;
      if (statusFilter === 'claimed' && entry.status !== 'claimed') return false;
      return true;
    });
  }, [hallOfLegends, statusFilter]);

  const handleClaim = async (achievementId: string) => {
    setFeedback(null);
    setClaimingId(achievementId);
    try {
      const res = await claimGlobalExclusiveAchievement(achievementId);
      if (!res.success) {
        setFeedback({
          type: 'error',
          text: res.error || 'Could not claim this Worldwide Title.',
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

  const statusText = (status: HallOfLegendsStatus, eligibleToClaim: boolean, ownedByMe: boolean) => {
    if (status === 'claimed') return ownedByMe ? 'CLAIMED BY YOU' : 'CLAIMED FOREVER';
    if (eligibleToClaim) return 'READY TO CLAIM';
    return 'UNCLAIMED · IN PROGRESS';
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E7B94F]/35 bg-gradient-to-br from-[#19122B] via-[#24143D] to-[#19122B] p-6 shadow-[0_12px_32px_rgba(16,13,28,0.65)] backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#FFD978] flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" />
                One-Player-Only Worldwide Registry
              </span>
              <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
              <span className="text-[#BEB4D6] tabular-nums">
                {summary.claimedCount}/{summary.total} Claimed Globally
              </span>
              {summary.readyCount > 0 && (
                <>
                  <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                  <span className="text-[#35D69A] font-semibold tabular-nums">
                    {summary.readyCount} Ready to Claim
                  </span>
                </>
              )}
            </div>
            <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F7F4FF] tracking-wide">
              HALL OF LEGENDS
            </h1>
            <p className="text-xs sm:text-sm text-[#BEB4D6] mt-1 max-w-2xl">
              Five one-of-a-kind worldwide honors. Only the very first champion in Aetheria to fulfill each milestone claims it forever—locking it permanently to their name across the realm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user?.legendTitle && (
              <div className="flex items-center gap-2 rounded-xl bg-[#100D1C]/90 border border-[#E7B94F]/35 px-3 py-2">
                <span className="text-[11px] text-[#BEB4D6]">Active Title:</span>
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#A875FF]/40 hover:border-[#FFD978]/55 text-xs font-semibold text-[#F7F4FF] transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FFD978] ${hallLoading ? 'animate-spin' : ''}`} />
              <span>Sync Registry</span>
            </button>
          </div>
        </div>

        {/* Realm Herald Announcements Strip */}
        {legendAnnouncements.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#E7B94F]/20">
            <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#FFD978] mb-2">
              <Scroll className="w-3.5 h-3.5" />
              <span>Recent Worldwide Claims</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {legendAnnouncements.slice(0, 5).map(ann => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => openPublicProfile(ann.ownerId)}
                  className="flex items-center gap-2.5 rounded-xl bg-[#19122B]/90 hover:bg-[#2F1B4E] border border-[#6638B8]/35 hover:border-[#FFD978]/50 px-3 py-2 text-left transition-colors shrink-0"
                >
                  <LegendTitleBadge
                    title={ann.titleTag}
                    style={ann.titleStyle}
                    emblemIcon={ann.emblemIcon}
                    size="xs"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#F7F4FF]">{ann.ownerUsername}</span>
                    <span className="text-[#BEB4D6]"> claimed {ann.achievementName}</span>
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
              ? 'bg-[#35D69A]/10 border-[#35D69A]/45 text-[#35D69A]'
              : 'bg-[#F05B70]/10 border-[#F05B70]/45 text-[#F05B70]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#35D69A] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#F05B70] shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Concise Status Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 p-1 bg-[#100D1C] rounded-xl border border-[#6638B8]/30">
          {[
            { id: 'all', label: `All (${summary.total})` },
            { id: 'available', label: `Available (${summary.availableCount})` },
            { id: 'claimed', label: `Claimed (${summary.claimedCount})` },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id as 'all' | 'available' | 'claimed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === item.id
                  ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-[#F7F4FF] border border-[#FFD978]/45 shadow-[0_0_16px_rgba(168,117,255,0.3)]'
                  : 'text-[#BEB4D6] hover:text-[#F7F4FF] border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Worldwide Exclusive Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  ? 'bg-gradient-to-b from-[#24143D] to-[#19122B] border-[#FFD978]/70 ring-1 ring-[#FFD978]/35 shadow-[0_12px_32px_rgba(231,185,79,0.18)]'
                  : isClaimed
                  ? entry.ownedByCurrentUser
                    ? 'bg-gradient-to-b from-[#24143D] to-[#19122B] border-[#35D69A]/50'
                    : 'bg-[#19122B]/85 border-[#6638B8]/25 opacity-90'
                  : `bg-[#24143D]/90 backdrop-blur-md ${rarityMeta.borderClass}`
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                        isClaimed && !entry.ownedByCurrentUser
                          ? 'bg-[#100D1C] border-[#6638B8]/25 text-[#BEB4D6]/70'
                          : `${styleMeta.badgeBg} ${styleMeta.badgeBorder} ${styleMeta.glowShadow}`
                      }`}
                    >
                      {isSecretMasked ? (
                        <EyeOff className="w-5 h-5 text-[#BEB4D6]" />
                      ) : (
                        <LegendEmblemIcon
                          iconName={entry.emblemIcon}
                          className={`w-6 h-6 ${
                            isClaimed && !entry.ownedByCurrentUser ? 'text-[#BEB4D6]/70' : styleMeta.badgeText
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className={`font-bold uppercase ${rarityMeta.textClass}`}>{entry.rarity}</span>
                        <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                        <span className="text-[#BEB4D6]">{entry.difficulty}</span>
                      </div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] leading-snug mt-0.5 truncate">
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
                        ? 'text-[#35D69A]'
                        : entry.ownedByCurrentUser
                        ? 'text-[#FFD978]'
                        : isClaimed
                        ? 'text-[#F05B70]'
                        : 'text-[#BEB4D6]'
                    }
                  >
                    {statusText(entry.status, entry.eligibleToClaim, entry.ownedByCurrentUser)}
                  </span>
                </div>

                {/* Story */}
                <p className="text-xs text-[#BEB4D6] leading-relaxed mt-2">
                  {isSecretMasked
                    ? 'A secret one-of-one feat concealed by ancient wards. Keep striving across Aetheria to uncover and claim it first.'
                    : entry.story}
                </p>

                {/* Exclusive Title Preview */}
                {!isSecretMasked && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] text-[#BEB4D6]">Title:</span>
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
              <div className="mt-4 pt-3 border-t border-[#6638B8]/25 space-y-3">
                <div className="text-xs text-[#BEB4D6]">
                  <span className="text-[#F7F4FF]/85 font-semibold">Requirement: </span>
                  {isSecretMasked ? 'Discovered upon meeting hidden mastery criteria.' : entry.requirementSummary}
                </div>

                {!isClaimed && (
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#BEB4D6] mb-1 tabular-nums">
                      <span>Your Progress</span>
                      <span>
                        {Math.min(entry.userProgress, entry.threshold).toLocaleString()} / {entry.threshold.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#100D1C] overflow-hidden border border-[#6638B8]/25">
                      <div
                        className={`h-full transition-all ${
                          entry.eligibleToClaim ? 'bg-[#35D69A]' : 'bg-gradient-to-r from-[#6638B8] via-[#A875FF] to-[#FFD978]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rewards Row */}
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#BEB4D6]">
                  <span className="flex items-center gap-1 text-[#A875FF]">
                    <Crown className="w-3 h-3 text-[#FFD978]" />
                    Worldwide Title
                  </span>
                  <span className="flex items-center gap-1 text-[#FFD978]">
                    <Coins className="w-3 h-3" />+{entry.rewardGold}g
                  </span>
                </div>

                {/* Action / Ownership State */}
                {entry.ownership ? (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-[#100D1C] border border-[#6638B8]/30 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[#BEB4D6]">Sole Owner: </span>
                        <button
                          type="button"
                          onClick={() => openPublicProfile(entry.ownership!.ownerId)}
                          className="font-bold text-[#FFD978] hover:underline truncate"
                        >
                          {entry.ownership.ownerUsername}
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-[#BEB4D6]/70 shrink-0">
                        {new Date(entry.ownership.claimedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {entry.ownedByCurrentUser ? (
                      <button
                        type="button"
                        onClick={() => handleEquipToggle(entry.id)}
                        className={`w-full py-2 rounded-xl text-xs font-['Cinzel'] font-bold tracking-wider transition-all ${
                          isEquippedByMe
                            ? 'bg-[#35D69A]/15 border border-[#35D69A]/50 text-[#35D69A] hover:bg-[#35D69A]/25'
                            : 'bg-[#19122B] hover:bg-[#2F1B4E] border border-[#E7B94F]/45 hover:border-[#FFD978] text-[#F7F4FF]'
                        }`}
                      >
                        {isEquippedByMe ? 'EQUIPPED ON PROFILE (UNEQUIP)' : 'EQUIP WORLDWIDE TITLE'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 rounded-xl bg-[#100D1C] border border-[#6638B8]/25 text-xs font-semibold text-[#BEB4D6]/60 flex items-center justify-center gap-1.5 cursor-not-allowed"
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
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] hover:from-[#FFD978] hover:to-[#FFAA45] disabled:opacity-60 text-[#100D1C] font-['Cinzel'] font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(231,185,79,0.35)] transition-all"
                  >
                    <Crown className="w-4 h-4" />
                    <span>{claimingId === entry.id ? 'VERIFYING WORLD LOCK...' : 'CLAIM WORLDWIDE TITLE'}</span>
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl bg-[#100D1C] border border-[#6638B8]/25 text-center text-xs font-semibold text-[#BEB4D6] flex items-center justify-center gap-1.5 tabular-nums">
                    <Lock className="w-3.5 h-3.5 text-[#A875FF]" />
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
