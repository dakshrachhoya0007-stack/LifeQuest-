import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { RARITY_FRAME_META, TITLE_STYLE_META } from '../../data/globalLegendsData';
import { HallOfLegendsStatus } from '../../types/game';
import { LegendEmblemIcon, LegendTitleBadge } from '../Social/LegendTitleBadge';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedProgressBar,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';
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
    <div className="space-y-6 pb-12">
      <FeatureBanner themeId="achievements">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5] flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" />
                One-Player-Only Worldwide Registry
              </span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className="text-[#94A8C7] tabular-nums">
                {summary.claimedCount}/{summary.total} Claimed Globally
              </span>
              {summary.readyCount > 0 && (
                <>
                  <span className="text-[#647A9E]" aria-hidden="true">·</span>
                  <span className="text-[#10B981] font-semibold tabular-nums">
                    {summary.readyCount} Ready to Claim
                  </span>
                </>
              )}
            </div>
            <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F2F7FF] tracking-wide text-balance">
              HALL OF LEGENDS
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] mt-1 max-w-2xl">
              Five one-of-a-kind worldwide honors. Only the very first champion in Aetheria to fulfill each milestone claims it forever—locking it permanently to their name across the realm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user?.legendTitle && (
              <div className="flex items-center gap-2 rounded-xl bg-[#061225] border border-[#F59E0B]/40 px-3 py-2">
                <span className="text-[11px] text-[#94A8C7]">Active Title:</span>
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
              className="lq-btn lq-btn-secondary px-4 py-2.5 text-xs whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#38D9F5] ${hallLoading ? 'animate-spin' : ''}`} />
              <span>Sync Registry</span>
            </button>
          </div>
        </div>

        {legendAnnouncements.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#1E3A63]">
            <div className="flex items-center gap-1.5 text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#FBBF24] mb-2">
              <Scroll className="w-3.5 h-3.5" />
              <span>Recent Worldwide Claims</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {legendAnnouncements.slice(0, 5).map(ann => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => openPublicProfile(ann.ownerId)}
                  className="flex items-center gap-2.5 rounded-xl bg-[#061225] hover:bg-[#102440] border border-[#1E3A63] hover:border-[#F59E0B]/50 px-3 py-2 text-left transition-colors shrink-0 cursor-pointer"
                >
                  <LegendTitleBadge
                    title={ann.titleTag}
                    style={ann.titleStyle}
                    emblemIcon={ann.emblemIcon}
                    size="xs"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#F2F7FF]">{ann.ownerUsername}</span>
                    <span className="text-[#94A8C7]"> claimed {ann.achievementName}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </FeatureBanner>

      {feedback && (
        <div
          className={`rounded-xl border p-3.5 flex items-center gap-2 text-xs ${
            feedback.type === 'success'
              ? 'bg-[#10B981]/12 border-[#10B981]/45 text-[#10B981]'
              : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F43F5E]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#F43F5E] shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Concise Status Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#061225] rounded-xl border border-[#1E3A63]">
          {[
            { id: 'all', label: `All (${summary.total})` },
            { id: 'available', label: `Available (${summary.availableCount})` },
            { id: 'claimed', label: `Claimed (${summary.claimedCount})` },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id as 'all' | 'available' | 'claimed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-[#1677FF] text-[#F2F7FF] shadow-[0_4px_14px_rgba(22,119,255,0.4)]'
                  : 'text-[#94A8C7] hover:text-[#F2F7FF]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Worldwide Exclusive Achievement Cards */}
      <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map(entry => {
          const rarityMeta = RARITY_FRAME_META[entry.rarity] || RARITY_FRAME_META.Legendary;
          const styleMeta = TITLE_STYLE_META[entry.titleStyle] || TITLE_STYLE_META.gold;
          const isClaimed = entry.status === 'claimed';
          const isSecretMasked = Boolean(entry.isHidden && !isClaimed && !entry.eligibleToClaim);
          const pct = Math.min(100, Math.round((entry.userProgress / entry.threshold) * 100));
          const isEquippedByMe = entry.ownedByCurrentUser && user?.legendAchievementId === entry.id;

          return (
            <RpgStaggerItem key={entry.id}>
              <div
                className={`h-full rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  entry.eligibleToClaim
                    ? 'bg-gradient-to-b from-[#102440] to-[#0A1930] border-[#F59E0B]/75 shadow-[0_14px_34px_-12px_rgba(245,158,11,0.22)]'
                    : isClaimed
                    ? entry.ownedByCurrentUser
                      ? 'bg-gradient-to-b from-[#102440] to-[#0A1930] border-[#10B981]/50'
                      : 'bg-[#0A1930]/85 border-[#1E3A63] opacity-90'
                    : `bg-[#0A1930] ${rarityMeta.borderClass}`
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                          isClaimed && !entry.ownedByCurrentUser
                            ? 'bg-[#061225] border-[#1E3A63] text-[#647A9E]'
                            : `${styleMeta.badgeBg} ${styleMeta.badgeBorder} ${styleMeta.glowShadow}`
                        }`}
                      >
                        {isSecretMasked ? (
                          <EyeOff className="w-5 h-5 text-[#94A8C7]" />
                        ) : (
                          <LegendEmblemIcon
                            iconName={entry.emblemIcon}
                            className={`w-6 h-6 ${
                              isClaimed && !entry.ownedByCurrentUser ? 'text-[#647A9E]' : styleMeta.badgeText
                            }`}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <span className={`font-bold uppercase ${rarityMeta.textClass}`}>{entry.rarity}</span>
                          <span className="text-[#647A9E]" aria-hidden="true">·</span>
                          <span className="text-[#94A8C7]">{entry.difficulty}</span>
                        </div>
                        <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] leading-snug mt-0.5 truncate">
                          {isSecretMasked ? 'Hidden Legend of Aetheria' : entry.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] font-mono font-bold tracking-wider uppercase">
                    <span
                      className={
                        entry.eligibleToClaim
                          ? 'text-[#10B981]'
                          : entry.ownedByCurrentUser
                          ? 'text-[#FBBF24]'
                          : isClaimed
                          ? 'text-[#F43F5E]'
                          : 'text-[#94A8C7]'
                      }
                    >
                      {statusText(entry.status, entry.eligibleToClaim, entry.ownedByCurrentUser)}
                    </span>
                  </div>

                  <p className="text-xs text-[#94A8C7] leading-relaxed mt-2">
                    {isSecretMasked
                      ? 'A secret one-of-one feat concealed by ancient wards. Keep striving across Aetheria to uncover and claim it first.'
                      : entry.story}
                  </p>

                  {!isSecretMasked && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] text-[#94A8C7]">Title:</span>
                      <LegendTitleBadge
                        title={entry.titleTag}
                        style={entry.titleStyle}
                        emblemIcon={entry.emblemIcon}
                        size="xs"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E3A63] space-y-3">
                  <div className="text-xs text-[#94A8C7]">
                    <span className="text-[#F2F7FF] font-semibold">Requirement: </span>
                    {isSecretMasked ? 'Discovered upon meeting hidden mastery criteria.' : entry.requirementSummary}
                  </div>

                  {!isClaimed && (
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-[#94A8C7] mb-1 tabular-nums">
                        <span>Your Progress</span>
                        <span>
                          {Math.min(entry.userProgress, entry.threshold).toLocaleString()} / {entry.threshold.toLocaleString()}
                        </span>
                      </div>
                      <AnimatedProgressBar
                        percentage={pct}
                        className="w-full h-2 rounded-full bg-[#061225] overflow-hidden border border-[#1E3A63]"
                        barClassName={
                          entry.eligibleToClaim
                            ? 'bg-[#10B981]'
                            : 'bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#38D9F5]'
                        }
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#94A8C7]">
                    <span className="flex items-center gap-1 text-[#38D9F5]">
                      <Crown className="w-3 h-3 text-[#FBBF24]" />
                      Worldwide Title
                    </span>
                    <span className="flex items-center gap-1 text-[#FBBF24]">
                      <Coins className="w-3 h-3" />+{entry.rewardGold}g
                    </span>
                  </div>

                  {entry.ownership ? (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-[#061225] border border-[#1E3A63] px-3 py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="text-[#94A8C7]">Sole Owner: </span>
                          <button
                            type="button"
                            onClick={() => openPublicProfile(entry.ownership!.ownerId)}
                            className="font-bold text-[#FBBF24] hover:underline truncate cursor-pointer"
                          >
                            {entry.ownership.ownerUsername}
                          </button>
                        </div>
                        <span className="text-[10px] font-mono text-[#647A9E] shrink-0">
                          {new Date(entry.ownership.claimedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {entry.ownedByCurrentUser ? (
                        <button
                          type="button"
                          onClick={() => handleEquipToggle(entry.id)}
                          className={`lq-btn w-full py-2 text-xs font-['Cinzel'] font-bold tracking-wider ${
                            isEquippedByMe
                              ? 'bg-[#10B981]/15 border border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/25'
                              : 'lq-btn-secondary'
                          }`}
                        >
                          {isEquippedByMe ? 'EQUIPPED ON PROFILE (UNEQUIP)' : 'EQUIP WORLDWIDE TITLE'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs font-semibold text-[#647A9E] flex items-center justify-center gap-1.5 cursor-not-allowed"
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
                      className="lq-btn lq-btn-gold w-full py-2.5 font-['Cinzel'] font-bold text-xs tracking-wider"
                    >
                      <Crown className="w-4 h-4" />
                      <span>{claimingId === entry.id ? 'VERIFYING WORLD LOCK...' : 'CLAIM WORLDWIDE TITLE'}</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-[#061225] border border-[#1E3A63] text-center text-xs font-semibold text-[#94A8C7] flex items-center justify-center gap-1.5 tabular-nums">
                      <Lock className="w-3.5 h-3.5 text-[#38D9F5]" />
                      <span>Unclaimed Worldwide · {pct}% Complete</span>
                    </div>
                  )}
                </div>
              </div>
            </RpgStaggerItem>
          );
        })}
      </RpgStaggerGrid>
    </div>
  );
};
