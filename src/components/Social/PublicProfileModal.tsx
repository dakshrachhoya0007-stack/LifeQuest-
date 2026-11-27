import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroById, mapClassToDefaultHeroId } from '../../data/heroesData';
import type {
  CharacterAppearance,
  EndorsementCategory,
  IdentityRarity,
  PlayerEndorsementSummary,
  PublicPlayerProfile,
  TrophyShowcaseState,
} from '../../types/game';
import { fetchPublicIdentitySummaryServer } from '../../services/polish2Service';
import {
  fetchEndorsementsSummaryServer,
  fetchPublicFavoriteCardsServer,
} from '../../services/aaaGamingService';
import {
  fetchPublicCosmeticsServer,
  fetchPublicTrophyShowcaseServer,
} from '../../services/expansionService';
import { IDENTITY_RARITY_STYLE } from '../../data/polish2Data';
import {
  COLLECTIBLE_CARDS_CATALOG,
  ENDORSEMENT_CATEGORIES_META,
} from '../../data/aaaGamingData';
import {
  Character2DAvatar,
  CollectibleCardArtwork,
} from '../Character/Character2DAvatar';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { formatLastActiveRelative } from '../../utils/presence';
import { RpgModalWrapper } from '../Motion/RpgMotionPrimitives';
import {
  X,
  UserPlus,
  UserCheck,
  Shield,
  Ban,
  Check,
  Lock,
  Loader2,
  Award,
  Dumbbell,
  AlertTriangle,
  MailPlus,
  Crown,
  Star,
  HeartHandshake,
  Eye,
  Flag,
  Trophy,
  Layers,
} from 'lucide-react';
import { LegendTitleBadge } from './LegendTitleBadge';

export const PublicProfileModal: React.FC = () => {
  const {
    user,
    selectedPublicProfileId,
    closePublicProfile,
    getPublicPlayerProfile,
    sendFriendRequest,
    cancelFriendRequest,
    respondFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    inviteToGuild,
    guilds,
    refreshSocialState,
    hallOfLegends,
    equippedLegendMap,
    equipGlobalLegendTitle,
    getPlayerPresence,
    queryPresencesBatch,
    followedCompetitorIds,
    toggleFollowCompetitor,
    giveEndorsement,
    reportEndorsementAbuse,
  } = useGame();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PublicPlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const [identitySummary, setIdentitySummary] = useState<{
    equippedIdentityTitle: { id: string; name: string; rarity: string } | null;
    equippedSecondaryTitle?: { id: string; name: string; rarity: string } | null;
    prestigeTier?: number;
    featuredBadges: Array<{
      id: string;
      name: string;
      rarity: string;
      iconName: string;
      description: string;
    }>;
    reputationScore: number;
    reputationTier: string;
    joinedAt: string | null;
  } | null>(null);
  const [publicAppearance, setPublicAppearance] = useState<CharacterAppearance | null>(null);
  const [endorsementSummary, setEndorsementSummary] = useState<PlayerEndorsementSummary | null>(null);
  const [favoriteCardIds, setFavoriteCardIds] = useState<string[]>([]);
  const [publicTrophyState, setPublicTrophyState] = useState<TrophyShowcaseState | null>(null);

  const [endorseCategory, setEndorseCategory] = useState<EndorsementCategory>('helpfulness');
  const [endorseNote, setEndorseNote] = useState('');
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const loadProfile = async (targetId: string) => {
    setLoading(true);
    setError(null);
    setConfirmAction(null);
    setIdentitySummary(null);
    setPublicAppearance(null);
    setEndorsementSummary(null);
    setFavoriteCardIds([]);
    setPublicTrophyState(null);
    setShowReportBox(false);
    const res = await getPublicPlayerProfile(targetId);
    if (!res.success || !res.data) {
      setError(res.error || 'Unable to load player profile.');
      setProfile(null);
    } else {
      setProfile(res.data);
      if (res.data.accessible && !res.data.blocked) {
        const [cosRes, endRes] = await Promise.all([
          fetchPublicCosmeticsServer(targetId),
          fetchEndorsementsSummaryServer(user?.id, targetId),
        ]);
        if (cosRes.ok && cosRes.appearance) {
          setPublicAppearance(cosRes.appearance);
        }
        if (endRes.ok && endRes.summary) {
          setEndorsementSummary(endRes.summary);
        }

        if (res.data.player?.showAchievements !== false) {
          const [idRes, cardRes, trophyRes] = await Promise.all([
            fetchPublicIdentitySummaryServer(targetId),
            fetchPublicFavoriteCardsServer(targetId),
            user?.id ? fetchPublicTrophyShowcaseServer(user.id, targetId) : Promise.resolve(null),
          ]);
          if (idRes.ok && idRes.identity) {
            setIdentitySummary(idRes.identity);
          }
          if (cardRes.ok && cardRes.favoriteCardIds) {
            setFavoriteCardIds(cardRes.favoriteCardIds);
          }
          if (trophyRes && trophyRes.ok && !trophyRes.restricted && trophyRes.state) {
            setPublicTrophyState(trophyRes.state);
          }
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedPublicProfileId) {
      setProfile(null);
      setError(null);
      setActionNotice(null);
      setConfirmAction(null);
      return;
    }
    void loadProfile(selectedPublicProfileId);
    void queryPresencesBatch([selectedPublicProfileId]);
  }, [selectedPublicProfileId]);

  useEffect(() => {
    if (!selectedPublicProfileId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePublicProfile();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPublicProfileId, closePublicProfile]);

  const myManagedGuild = guilds.find(
    g => g.isMember && (g.myRole === 'leader' || g.myRole === 'officer')
  );

  const showNotice = (type: 'success' | 'error', text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleSendRequest = async () => {
    if (!profile?.player) return;
    setActionBusy(true);
    const res = await sendFriendRequest(profile.player.id);
    if (!res.success) {
      showNotice('error', res.error || 'Could not send friend request.');
    } else {
      showNotice('success', `Friend request sent to ${profile.player.username}.`);
      await loadProfile(profile.player.id);
    }
    setActionBusy(false);
  };

  const handleCancelRequest = async () => {
    if (!profile?.player?.friendshipId) return;
    setActionBusy(true);
    const res = await cancelFriendRequest(profile.player.friendshipId);
    if (!res.success) {
      showNotice('error', res.error || 'Could not cancel friend request.');
    } else {
      showNotice('success', 'Friend request cancelled.');
      await loadProfile(profile.player.id);
    }
    setActionBusy(false);
  };

  const handleRespondRequest = async (accept: boolean) => {
    if (!profile?.player?.friendshipId) return;
    setActionBusy(true);
    await respondFriendRequest(profile.player.friendshipId, accept);
    showNotice('success', accept ? 'Friend request accepted!' : 'Friend request declined.');
    await loadProfile(profile.player.id);
    setActionBusy(false);
  };

  const handleRemoveFriend = async () => {
    if (!profile?.player?.friendshipId) return;
    setActionBusy(true);
    await removeFriend(profile.player.friendshipId);
    setConfirmAction(null);
    showNotice('success', `Removed ${profile.player.username} from friends.`);
    await loadProfile(profile.player.id);
    setActionBusy(false);
  };

  const handleBlockUser = async () => {
    if (!selectedPublicProfileId) return;
    setActionBusy(true);
    const res = await blockUser(selectedPublicProfileId);
    setConfirmAction(null);
    if (!res.success) {
      showNotice('error', res.error || 'Could not block user.');
    } else {
      showNotice('success', 'User blocked. They can no longer view or interact with you.');
      await loadProfile(selectedPublicProfileId);
    }
    setActionBusy(false);
  };

  const handleUnblockUser = async () => {
    if (!selectedPublicProfileId) return;
    setActionBusy(true);
    const res = await unblockUser(selectedPublicProfileId);
    if (!res.success) {
      showNotice('error', res.error || 'Could not unblock user.');
    } else {
      await refreshSocialState();
      showNotice('success', 'User unblocked.');
      await loadProfile(selectedPublicProfileId);
    }
    setActionBusy(false);
  };

  const handleInviteToGuild = async () => {
    if (!myManagedGuild || !profile?.player) return;
    setActionBusy(true);
    const res = await inviteToGuild(myManagedGuild.id, profile.player.id);
    if (!res.success) {
      showNotice('error', res.error || 'Could not send guild invite.');
    } else {
      showNotice('success', `Guild invitation to ${myManagedGuild.name} sent!`);
    }
    setActionBusy(false);
  };

  const handleGiveEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.player) return;
    setActionBusy(true);
    const res = await giveEndorsement({
      targetUserId: profile.player.id,
      category: endorseCategory,
      note: endorseNote.trim() || undefined,
    });
    if (!res.success) {
      showNotice('error', res.error || 'Could not submit endorsement.');
    } else {
      if (res.summary) setEndorsementSummary(res.summary);
      setEndorseNote('');
      showNotice('success', `Endorsed ${profile.player.username} for ${ENDORSEMENT_CATEGORIES_META[endorseCategory].label}.`);
    }
    setActionBusy(false);
  };

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.player || reportReason.trim().length < 5) {
      showNotice('error', 'Provide a brief reason for your report.');
      return;
    }
    setActionBusy(true);
    const res = await reportEndorsementAbuse({
      targetUserId: profile.player.id,
      reason: reportReason.trim(),
    });
    if (!res.success) {
      showNotice('error', res.error || 'Could not submit abuse report.');
    } else {
      setReportReason('');
      setShowReportBox(false);
      showNotice('success', 'Report submitted for moderation review.');
    }
    setActionBusy(false);
  };

  const player = profile?.player;
  const heroProfile = player
    ? getHeroById(mapClassToDefaultHeroId(player.characterClass))
    : null;
  const isSelfProfile = Boolean(player && (player.relationshipStatus === 'self' || player.id === user?.id));
  const playerEquippedLegend = player
    ? player.legendTitle
      ? {
          titleTag: player.legendTitle,
          titleStyle: player.legendTitleStyle || ('gold' as const),
          emblemIcon: player.legendEmblem || 'Crown',
        }
      : equippedLegendMap[player.id]
    : undefined;
  const playerOwnedLegends = player
    ? player.legendTitles && player.legendTitles.length > 0
      ? player.legendTitles
      : hallOfLegends
          .filter(h => h.ownership?.ownerId === player.id)
          .map(h => ({
            achievementId: h.id,
            titleTag: h.titleTag,
            titleStyle: h.titleStyle,
            emblemIcon: h.emblemIcon,
            name: h.name,
            claimedAt: h.ownership?.claimedAt || new Date().toISOString(),
          }))
    : [];

  return (
    <RpgModalWrapper
      isOpen={Boolean(selectedPublicProfileId)}
      onClose={closePublicProfile}
      panelClassName="w-full max-w-2xl"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Player Profile"
        className="w-full max-h-[90vh] overflow-y-auto lq-surface-elevated rounded-2xl"
      >
        {/* Header Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#171220]/95 backdrop-blur-md border-b border-[#362B45]">
          <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] tracking-wide">
            Champion Profile
          </h2>
          <button
            type="button"
            onClick={closePublicProfile}
            className="p-2 rounded-lg text-[#A69AAF] hover:text-[#F2EDF7] hover:bg-[#21152F] transition-colors cursor-pointer"
            aria-label="Close player profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {actionNotice && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${
                actionNotice.type === 'error'
                  ? 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
                  : 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#49B88A]'
              }`}
            >
              {actionNotice.text}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#A69AAF] text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#D6A84B]" />
              <span>Loading champion dossier...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-[#D65C66]">{error}</p>
              <button
                type="button"
                onClick={closePublicProfile}
                className="lq-btn lq-btn-primary px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : profile?.blocked ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#D65C66]/12 border border-[#D65C66]/45 flex items-center justify-center mx-auto text-[#D65C66]">
                <Ban className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#F2EDF7]">Profile Unavailable</h3>
                <p className="text-xs text-[#A69AAF] max-w-sm mx-auto">
                  {profile.blockedByMe
                    ? 'You have blocked this player. Unblock them if you wish to view their profile again.'
                    : 'This player profile is not accessible due to privacy or block settings.'}
                </p>
              </div>
              {profile.blockedByMe && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleUnblockUser}
                  className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Unblock User
                </button>
              )}
            </div>
          ) : player ? (
            <>
              {/* Identity Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#362B45]">
                <div className="flex items-center gap-4 min-w-0">
                  <Character2DAvatar
                    characterClass={player.characterClass}
                    appearance={publicAppearance}
                    size="md"
                    prestigeTier={identitySummary?.prestigeTier ?? 0}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-['Cinzel'] font-bold text-xl text-[#F2EDF7] truncate">
                        {player.username || 'Champion'}
                      </h3>
                      {(() => {
                        const liveP = getPlayerPresence(player.id);
                        const statusToShow = player.presenceStatus || (!liveP.hidden ? liveP.status : undefined);
                        if (!statusToShow) return null;
                        return <PresenceBadge status={statusToShow} showLabel size="xs" />;
                      })()}
                      {playerEquippedLegend && (
                        <LegendTitleBadge
                          title={playerEquippedLegend.titleTag}
                          style={playerEquippedLegend.titleStyle}
                          emblemIcon={playerEquippedLegend.emblemIcon}
                          size="sm"
                        />
                      )}
                      {player.characterName && player.characterName !== player.username && (
                        <span className="text-xs text-[#A69AAF] truncate">
                          ({player.characterName})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#E8C777] mt-1 tabular-nums">
                      {player.characterClass || 'Champion'}
                      {typeof player.level === 'number' && ` · Lv.${player.level}`}
                      {identitySummary?.prestigeTier ? ` · Prestige ${identitySummary.prestigeTier}` : ''}
                      {player.aetherRank && ` · ${player.aetherRank}`}
                      {player.lastActiveAt && ` · Active ${formatLastActiveRelative(player.lastActiveAt)}`}
                      {(player.equippedIdentityTitle || identitySummary?.equippedIdentityTitle) &&
                        ` · ${(player.equippedIdentityTitle || identitySummary?.equippedIdentityTitle)?.name}`}
                      {identitySummary?.equippedSecondaryTitle &&
                        ` / ${identitySummary.equippedSecondaryTitle.name}`}
                      {(() => {
                        const rawJoin = player.joinedAt || identitySummary?.joinedAt;
                        if (!rawJoin || Number.isNaN(new Date(rawJoin).getTime())) return '';
                        return ` · Joined ${new Date(rawJoin).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
                      })()}
                    </p>
                    {player.bio && (
                      <p className="text-xs text-[#A69AAF] mt-2 leading-relaxed max-w-md">
                        {player.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Relationship / Action Controls */}
                {player.relationshipStatus !== 'self' && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {player.relationshipStatus === 'none' && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleSendRequest}
                        className="lq-btn lq-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Friend
                      </button>
                    )}

                    {player.relationshipStatus === 'request_sent' && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleCancelRequest}
                        className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel Request
                      </button>
                    )}

                    {player.relationshipStatus === 'request_received' && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleRespondRequest(true)}
                          className="lq-btn px-3.5 py-2 rounded-xl bg-[#49B88A] hover:brightness-110 text-[#100D18] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleRespondRequest(false)}
                          className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {player.relationshipStatus === 'friends' && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => setConfirmAction('remove')}
                        className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl hover:border-[#D65C66]/60 hover:text-[#D65C66] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#49B88A]" />
                        Friends · Remove
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void toggleFollowCompetitor(player.id)}
                      className={`lq-btn px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        followedCompetitorIds.includes(player.id)
                          ? 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#49B88A]'
                          : 'bg-[#100D18] border-[#362B45] hover:border-[#7045A0] text-[#E8C777]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {followedCompetitorIds.includes(player.id) ? 'Following Arena' : 'Follow Arena'}
                    </button>

                    {myManagedGuild && !player.guild && profile.accessible && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleInviteToGuild}
                        className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <MailPlus className="w-3.5 h-3.5 text-[#E8C777]" />
                        Invite to Guild
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => setConfirmAction('block')}
                      className="p-2 rounded-xl bg-[#100D18] border border-[#362B45] hover:border-[#D65C66]/60 text-[#A69AAF] hover:text-[#D65C66] transition-colors cursor-pointer"
                      title="Block user"
                      aria-label="Block user"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Confirmation Prompt */}
              {confirmAction && (
                <div className="p-4 rounded-xl bg-[#D65C66]/12 border border-[#D65C66]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-[#F2EDF7]">
                    <AlertTriangle className="w-4 h-4 text-[#D65C66] shrink-0 mt-0.5" />
                    <span>
                      {confirmAction === 'block'
                        ? `Block ${player.username}? This will remove any friendship and hide each other from discovery, chat, and leaderboards.`
                        : `Remove ${player.username} from your friends list?`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={confirmAction === 'block' ? handleBlockUser : handleRemoveFriend}
                      className="lq-btn px-3.5 py-1.5 rounded-lg bg-[#D65C66] hover:brightness-110 text-[#100D18] text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      {confirmAction === 'block' ? 'Confirm Block' : 'Confirm Remove'}
                    </button>
                  </div>
                </div>
              )}

              {/* Restricted Notice */}
              {!profile.accessible ? (
                <div className="p-6 rounded-xl bg-[#100D18] border border-[#362B45] text-center space-y-2">
                  <Lock className="w-6 h-6 text-[#D6A84B] mx-auto" />
                  <h4 className="text-sm font-bold text-[#F2EDF7]">
                    {profile.restrictedReason === 'private'
                      ? 'Private Profile'
                      : 'Friends-Only Profile'}
                  </h4>
                  <p className="text-xs text-[#A69AAF] max-w-md mx-auto">
                    {profile.restrictedReason === 'private'
                      ? `${player.username} has set their profile to private.`
                      : `Only accepted friends can view ${player.username}'s combat stance, stats, guild, and achievements. Send a friend request to connect.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Guild Affiliation */}
                  {player.showGuild !== false && player.guild && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#100D18] border border-[#362B45]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#171220] border border-[#D6A84B]/45 flex items-center justify-center text-[#E8C777] shrink-0">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#F2EDF7] truncate">
                            [{player.guild.tag}] {player.guild.name}
                          </p>
                          <p className="text-[11px] text-[#A69AAF] capitalize tabular-nums">
                            {player.guild.role} · Guild Lv.{player.guild.level}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bodyweight Stance & Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {player.showEquipment !== false && heroProfile && (
                      <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#F2EDF7] flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-[#D6A84B]" />
                            Bodyweight Discipline
                          </span>
                          <span className="text-[11px] text-[#E8C777]">
                            Hands &amp; Legs
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-[#F2EDF7] truncate">
                            {heroProfile.bodyweightDisciplines.conditioningStyle}
                          </p>
                          <p className="text-[11px] text-[#A69AAF]">
                            {heroProfile.archetype} · {player.characterClass || 'Champion'}
                          </p>
                          <p className="text-[11px] text-[#A69AAF] pt-1">
                            Hands: <span className="text-[#F2EDF7]">{heroProfile.bodyweightDisciplines.handsFocus}</span>
                            {' · '}
                            Legs: <span className="text-[#F2EDF7]">{heroProfile.bodyweightDisciplines.legsFocus}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {player.showStats !== false && (
                      <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-3">
                        <span className="text-xs font-semibold text-[#F2EDF7] block">
                          Realm Record
                        </span>
                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                          <div>
                            <span className="text-[11px] text-[#A69AAF] block">Total XP</span>
                            <span className="font-mono font-bold text-[#F2EDF7] tabular-nums">
                              {(player.totalXp ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#A69AAF] block">Habit Streak</span>
                            <span className="font-mono font-bold text-[#E8C777] tabular-nums">
                              {player.currentStreak ?? 0} days
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#A69AAF] block">Workouts</span>
                            <span className="font-mono font-bold text-[#F2EDF7] tabular-nums">
                              {(player.totalWorkoutsCompleted ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#A69AAF] block">Bosses Slain</span>
                            <span className="font-mono font-bold text-[#F2EDF7] tabular-nums">
                              {(player.totalBossesDefeated ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Worldwide Exclusive One-of-One Legend Titles */}
                  {playerOwnedLegends.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#100D18] border border-[#D6A84B]/40 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#F2EDF7] flex items-center gap-1.5 font-['Cinzel']">
                          <Crown className="w-3.5 h-3.5 text-[#D6A84B]" />
                          Worldwide Exclusive Titles
                        </span>
                        <span className="text-[11px] text-[#E8C777] font-mono tabular-nums">
                          {playerOwnedLegends.length} One-of-One
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {playerOwnedLegends.map(lt => {
                          const equipped = playerEquippedLegend?.titleTag === lt.titleTag;
                          return (
                            <div
                              key={lt.achievementId}
                              className="p-2.5 rounded-lg bg-[#171220] border border-[#D6A84B]/30 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 space-y-1">
                                <LegendTitleBadge
                                  title={lt.titleTag}
                                  style={lt.titleStyle}
                                  emblemIcon={lt.emblemIcon}
                                  size="xs"
                                />
                                <p className="text-[11px] text-[#A69AAF] truncate">{lt.name}</p>
                              </div>
                              {isSelfProfile && (
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={async () => {
                                    setActionBusy(true);
                                    const res = await equipGlobalLegendTitle(
                                      equipped ? null : lt.achievementId
                                    );
                                    if (res.success && player) {
                                      await loadProfile(player.id);
                                    }
                                    setActionBusy(false);
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold shrink-0 transition-all cursor-pointer ${
                                    equipped
                                      ? 'bg-[#7045A0] text-[#F2EDF7]'
                                      : 'bg-[#100D18] text-[#E8C777] border border-[#362B45] hover:border-[#7045A0]'
                                  }`}
                                >
                                  {equipped ? 'Equipped' : 'Equip'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reputation & Featured Rare Badges Showcase */}
                  {player.showAchievements !== false &&
                    (typeof player.reputationScore === 'number' ||
                      identitySummary ||
                      (player.featuredBadges && player.featuredBadges.length > 0)) && (
                      <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#F2EDF7] flex items-center gap-1.5 font-['Cinzel']">
                            <Star className="w-3.5 h-3.5 text-[#D6A84B]" />
                            Reputation &amp; Featured Badges
                          </span>
                          <span className="text-xs font-mono font-bold text-[#F2EDF7] tabular-nums">
                            {(
                              player.reputationScore ??
                              identitySummary?.reputationScore ??
                              0
                            ).toLocaleString()}{' '}
                            Rep ·{' '}
                            <span className="text-[#E8C777]">
                              {player.reputationTier ||
                                identitySummary?.reputationTier ||
                                'Aspiring Traveler'}
                            </span>
                          </span>
                        </div>
                        {((player.featuredBadges && player.featuredBadges.length > 0) ||
                          (identitySummary?.featuredBadges &&
                            identitySummary.featuredBadges.length > 0)) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(player.featuredBadges && player.featuredBadges.length > 0
                              ? player.featuredBadges
                              : identitySummary?.featuredBadges || []
                            )
                              .slice(0, 4)
                              .map(badge => {
                                const rStyle =
                                  IDENTITY_RARITY_STYLE[badge.rarity as IdentityRarity] ||
                                  IDENTITY_RARITY_STYLE.Common;
                                return (
                                  <div
                                    key={badge.id}
                                    className="p-2.5 rounded-lg bg-[#171220] border border-[#362B45]"
                                  >
                                    <span className={`text-[10px] font-bold uppercase ${rStyle.text}`}>
                                      {badge.rarity}
                                    </span>
                                    <p className="text-xs font-semibold text-[#F2EDF7] truncate mt-0.5">
                                      {badge.name}
                                    </p>
                                    <p className="text-[11px] text-[#A69AAF] truncate">
                                      {badge.description}
                                    </p>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#A69AAF]">
                            No rare badges featured yet.
                          </p>
                        )}
                      </div>
                    )}

                  {/* Unlocked Achievements */}
                  {player.showAchievements !== false && (
                    <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#F2EDF7] flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#D6A84B]" />
                          Unlocked Achievements
                        </span>
                        <span className="text-[11px] text-[#A69AAF] font-mono tabular-nums">
                          {player.achievements?.length || 0} earned
                        </span>
                      </div>
                      {!player.achievements || player.achievements.length === 0 ? (
                        <p className="text-xs text-[#766D82]">No achievements unlocked yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {player.achievements.slice(0, 8).map(ach => (
                            <div
                              key={ach.id}
                              className="p-2.5 rounded-lg bg-[#171220] border border-[#362B45]"
                            >
                              <p className="text-xs font-semibold text-[#F2EDF7] truncate">{ach.name}</p>
                              <p className="text-[11px] text-[#A69AAF] truncate">{ach.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Personal Records & Recent Workout History */}
                  {(player.personalRecords?.length || player.workoutHistory?.length || player.dailyActivity) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {player.personalRecords && player.personalRecords.length > 0 && (
                        <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-2.5">
                          <span className="text-xs font-semibold text-[#E8C777] block">
                            Personal Records
                          </span>
                          <div className="space-y-1.5 text-xs">
                            {player.personalRecords.slice(0, 5).map((pr, idx) => (
                              <div key={`${pr.exerciseName}-${idx}`} className="flex justify-between gap-2">
                                <span className="text-[#F2EDF7] truncate">{pr.exerciseName}</span>
                                <span className="font-mono text-[#E8C777] tabular-nums shrink-0">
                                  {pr.bestReps ? `${pr.bestReps} reps` : `${pr.bestDurationMinutes ?? 0} min`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {player.workoutHistory && player.workoutHistory.length > 0 && (
                        <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-2.5">
                          <span className="text-xs font-semibold text-[#F2EDF7] block">
                            Recent Workouts
                          </span>
                          <div className="space-y-1.5 text-xs">
                            {player.workoutHistory.slice(0, 5).map(w => (
                              <div key={w.id} className="flex justify-between gap-2">
                                <span className="text-[#A69AAF] truncate">{w.exerciseName}</span>
                                <span className="font-mono text-[#E8C777] tabular-nums shrink-0">
                                  {w.durationMinutes}m
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Favorite Collectible Cards Showcase */}
                  {player.showAchievements !== false && favoriteCardIds.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#F2EDF7] flex items-center gap-1.5 font-['Cinzel']">
                          <Layers className="w-3.5 h-3.5 text-[#D6A84B]" />
                          Curated Collectible Cards
                        </span>
                        <span className="text-[11px] text-[#E8C777] font-mono tabular-nums">
                          {favoriteCardIds.length}/3 Featured
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {favoriteCardIds.slice(0, 3).map(cid => {
                          const card = COLLECTIBLE_CARDS_CATALOG.find(c => c.id === cid);
                          if (!card) return null;
                          return (
                            <div
                              key={card.id}
                              className="p-2.5 rounded-xl bg-[#171220] border border-[#362B45] space-y-2"
                            >
                              <CollectibleCardArtwork card={card} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#F2EDF7] truncate">{card.name}</p>
                                <p className="text-[10px] text-[#E8C777] truncate">
                                  {card.rarity} · {card.flavorStatValue}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pinned Trophies Showcase */}
                  {player.showAchievements !== false &&
                    publicTrophyState &&
                    publicTrophyState.pinnedIds.length > 0 && (
                      <div className="p-4 rounded-xl bg-[#100D18] border border-[#D6A84B]/35 space-y-3">
                        <span className="text-xs font-semibold text-[#F2EDF7] flex items-center gap-1.5 font-['Cinzel']">
                          <Trophy className="w-3.5 h-3.5 text-[#D6A84B]" />
                          Pinned Trophy Case
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {publicTrophyState.pinnedIds.slice(0, 4).map(tid => {
                            const tDef = publicTrophyState.trophies.find(t => t.id === tid);
                            if (!tDef) return null;
                            return (
                              <div
                                key={tid}
                                className="p-2.5 rounded-lg bg-[#171220] border border-[#362B45]"
                              >
                                <p className="text-xs font-bold text-[#F2EDF7] truncate">{tDef.title}</p>
                                <p className="text-[11px] text-[#A69AAF] truncate">
                                  {tDef.rarity} · {tDef.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Peer Reputation & Endorsements */}
                  {endorsementSummary && (
                    <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#F2EDF7] flex items-center gap-1.5 font-['Cinzel']">
                          <HeartHandshake className="w-3.5 h-3.5 text-[#D6A84B]" />
                          Peer Endorsements ({endorsementSummary.totalEndorsements})
                        </span>
                        {!isSelfProfile && (
                          <button
                            type="button"
                            onClick={() => setShowReportBox(v => !v)}
                            className="text-[11px] text-[#A69AAF] hover:text-[#D65C66] flex items-center gap-1 cursor-pointer"
                          >
                            <Flag className="w-3 h-3" />
                            Report
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(Object.keys(ENDORSEMENT_CATEGORIES_META) as EndorsementCategory[]).map(cat => {
                          const meta = ENDORSEMENT_CATEGORIES_META[cat];
                          const count = endorsementSummary.countsByCategory?.[cat] ?? 0;
                          return (
                            <div
                              key={cat}
                              className="p-2.5 rounded-lg bg-[#171220] border border-[#362B45] text-center"
                            >
                              <span
                                className="text-[10px] font-bold uppercase block"
                                style={{ color: meta.accentHex }}
                              >
                                {meta.label}
                              </span>
                              <span className="font-mono font-bold text-sm text-[#F2EDF7] tabular-nums">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {!isSelfProfile && (
                        <form onSubmit={handleGiveEndorsement} className="space-y-2 pt-2 border-t border-[#362B45]">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={endorseCategory}
                              onChange={e => setEndorseCategory(e.target.value as EndorsementCategory)}
                              className="lq-input px-2.5 py-1.5 text-xs"
                            >
                              {(Object.keys(ENDORSEMENT_CATEGORIES_META) as EndorsementCategory[]).map(cat => (
                                <option key={cat} value={cat}>
                                  {ENDORSEMENT_CATEGORIES_META[cat].label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              maxLength={100}
                              value={endorseNote}
                              onChange={e => setEndorseNote(e.target.value)}
                              placeholder="Optional encouragement note..."
                              className="lq-input flex-1 min-w-[160px] px-2.5 py-1.5 text-xs"
                            />
                            <button
                              type="submit"
                              disabled={actionBusy || !endorsementSummary.canEndorseToday}
                              className="lq-btn lq-btn-primary px-3 py-1.5 rounded-lg disabled:opacity-45 font-bold text-xs whitespace-nowrap cursor-pointer"
                            >
                              Endorse
                            </button>
                          </div>
                          {!endorsementSummary.canEndorseToday && endorsementSummary.cooldownReason && (
                            <p className="text-[11px] text-[#E8C777]">
                              {endorsementSummary.cooldownReason}
                            </p>
                          )}
                        </form>
                      )}

                      {showReportBox && !isSelfProfile && (
                        <form onSubmit={handleReportAbuse} className="flex items-center gap-2 pt-2 border-t border-[#D65C66]/35">
                          <input
                            type="text"
                            maxLength={160}
                            value={reportReason}
                            onChange={e => setReportReason(e.target.value)}
                            placeholder="Describe inappropriate endorsement or abuse..."
                            className="lq-input flex-1 px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={actionBusy}
                            className="lq-btn px-3 py-1.5 rounded-lg bg-[#D65C66] hover:brightness-110 text-[#100D18] text-xs font-bold whitespace-nowrap cursor-pointer"
                          >
                            Submit Report
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </RpgModalWrapper>
  );
};
