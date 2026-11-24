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

  if (!selectedPublicProfileId) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={closePublicProfile}
      role="dialog"
      aria-modal="true"
      aria-label="Player Profile"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0e0a1b] border border-purple-900/70 rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#120d22]/95 backdrop-blur-md border-b border-purple-950/80">
          <h2 className="font-['Cinzel'] font-bold text-base text-white tracking-wide">
            Champion Profile
          </h2>
          <button
            onClick={closePublicProfile}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-purple-950/60 transition-colors"
            aria-label="Close player profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {actionNotice && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                actionNotice.type === 'error'
                  ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              }`}
            >
              {actionNotice.text}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span>Loading champion dossier...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-rose-300">{error}</p>
              <button
                onClick={closePublicProfile}
                className="px-4 py-2 rounded-lg bg-purple-800 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          ) : profile?.blocked ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-950/70 border border-rose-800/60 flex items-center justify-center mx-auto text-rose-400">
                <Ban className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Profile Unavailable</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {profile.blockedByMe
                    ? 'You have blocked this player. Unblock them if you wish to view their profile again.'
                    : 'This player profile is not accessible due to privacy or block settings.'}
                </p>
              </div>
              {profile.blockedByMe && (
                <button
                  disabled={actionBusy}
                  onClick={handleUnblockUser}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Unblock User
                </button>
              )}
            </div>
          ) : player ? (
            <>
              {/* Identity Summary (Strictly 2D RPG Avatar, never OAuth email/photo) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-purple-950/70">
                <div className="flex items-center gap-4 min-w-0">
                  <Character2DAvatar
                    characterClass={player.characterClass}
                    appearance={publicAppearance}
                    size="md"
                    prestigeTier={identitySummary?.prestigeTier ?? 0}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-['Cinzel'] font-bold text-xl text-white truncate">
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
                        <span className="text-xs text-slate-400 truncate">
                          ({player.characterName})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-purple-300 mt-1 tabular-nums">
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
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-md">
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
                        disabled={actionBusy}
                        onClick={handleSendRequest}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Friend
                      </button>
                    )}

                    {player.relationshipStatus === 'request_sent' && (
                      <button
                        disabled={actionBusy}
                        onClick={handleCancelRequest}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel Request
                      </button>
                    )}

                    {player.relationshipStatus === 'request_received' && (
                      <>
                        <button
                          disabled={actionBusy}
                          onClick={() => handleRespondRequest(true)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          disabled={actionBusy}
                          onClick={() => handleRespondRequest(false)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {player.relationshipStatus === 'friends' && (
                      <button
                        disabled={actionBusy}
                        onClick={() => setConfirmAction('remove')}
                        className="px-3.5 py-2 rounded-xl bg-[#161029] border border-purple-800/70 hover:border-rose-700/70 text-slate-200 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Friends · Remove
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void toggleFollowCompetitor(player.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        followedCompetitorIds.includes(player.id)
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                          : 'bg-[#161029] border-[#C5A15A]/30 hover:border-[#C5A15A] text-[#E8CF96]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {followedCompetitorIds.includes(player.id) ? 'Following Arena' : 'Follow Arena'}
                    </button>

                    {myManagedGuild && !player.guild && profile.accessible && (
                      <button
                        disabled={actionBusy}
                        onClick={handleInviteToGuild}
                        className="px-3.5 py-2 rounded-xl bg-[#161029] border border-purple-700/60 hover:bg-purple-900/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <MailPlus className="w-3.5 h-3.5" />
                        Invite to Guild
                      </button>
                    )}

                    <button
                      disabled={actionBusy}
                      onClick={() => setConfirmAction('block')}
                      className="p-2 rounded-xl bg-[#161029] border border-purple-900/60 hover:border-rose-700/70 text-slate-400 hover:text-rose-300 transition-colors"
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
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      {confirmAction === 'block'
                        ? `Block ${player.username}? This will remove any friendship and hide each other from discovery, chat, and leaderboards.`
                        : `Remove ${player.username} from your friends list?`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={actionBusy}
                      onClick={confirmAction === 'block' ? handleBlockUser : handleRemoveFriend}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      {confirmAction === 'block' ? 'Confirm Block' : 'Confirm Remove'}
                    </button>
                  </div>
                </div>
              )}

              {/* Restricted Notice if Private or Friends-Only */}
              {!profile.accessible ? (
                <div className="p-6 rounded-xl bg-[#130f24] border border-purple-950/80 text-center space-y-2">
                  <Lock className="w-6 h-6 text-purple-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">
                    {profile.restrictedReason === 'private'
                      ? 'Private Profile'
                      : 'Friends-Only Profile'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {profile.restrictedReason === 'private'
                      ? `${player.username} has set their profile to private.`
                      : `Only accepted friends can view ${player.username}'s combat stance, stats, guild, and achievements. Send a friend request to connect.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Guild Affiliation */}
                  {player.showGuild !== false && player.guild && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#130f24] border border-purple-950/80">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-purple-900/50 border border-purple-700/60 flex items-center justify-center text-amber-400 shrink-0">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            [{player.guild.tag}] {player.guild.name}
                          </p>
                          <p className="text-[11px] text-slate-400 capitalize tabular-nums">
                            {player.guild.role} · Guild Lv.{player.guild.level}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bodyweight Stance & Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {player.showEquipment !== false && heroProfile && (
                      <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-purple-400" />
                            Bodyweight Discipline
                          </span>
                          <span className="text-[11px] text-purple-300">
                            Hands &amp; Legs
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-white truncate">
                            {heroProfile.bodyweightDisciplines.conditioningStyle}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {heroProfile.archetype} · {player.characterClass || 'Champion'}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="px-2 py-0.5 rounded bg-[#0a0714] border border-purple-900/60 text-[10px] text-purple-200">
                              Hands: {heroProfile.bodyweightDisciplines.handsFocus}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#0a0714] border border-purple-900/60 text-[10px] text-purple-200">
                              Legs: {heroProfile.bodyweightDisciplines.legsFocus}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {player.showStats !== false && (
                      <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-3">
                        <span className="text-xs font-semibold text-slate-200 block">
                          Realm Record
                        </span>
                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Total XP</span>
                            <span className="font-mono font-bold text-white tabular-nums">
                              {(player.totalXp ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Habit Streak</span>
                            <span className="font-mono font-bold text-amber-300 tabular-nums">
                              {player.currentStreak ?? 0} days
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Workouts</span>
                            <span className="font-mono font-bold text-slate-100 tabular-nums">
                              {(player.totalWorkoutsCompleted ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Bosses Slain</span>
                            <span className="font-mono font-bold text-slate-100 tabular-nums">
                              {(player.totalBossesDefeated ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Worldwide Exclusive One-of-One Legend Titles */}
                  {playerOwnedLegends.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#130f24] border border-[#C5A15A]/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#E8CF96] flex items-center gap-1.5 font-['Cinzel']">
                          <Crown className="w-3.5 h-3.5 text-[#C5A15A]" />
                          Worldwide Exclusive Titles
                        </span>
                        <span className="text-[11px] text-[#C5A15A]/80 tabular-nums">
                          {playerOwnedLegends.length} One-of-One
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {playerOwnedLegends.map(lt => {
                          const equipped = playerEquippedLegend?.titleTag === lt.titleTag;
                          return (
                            <div
                              key={lt.achievementId}
                              className="p-2.5 rounded-lg bg-[#0a0714] border border-[#C5A15A]/20 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 space-y-1">
                                <LegendTitleBadge
                                  title={lt.titleTag}
                                  style={lt.titleStyle}
                                  emblemIcon={lt.emblemIcon}
                                  size="xs"
                                />
                                <p className="text-[11px] text-slate-300 truncate">{lt.name}</p>
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
                                  className={`px-2 py-1 rounded text-[10px] font-semibold shrink-0 transition-colors ${
                                    equipped
                                      ? 'bg-[#C5A15A] text-[#100D19]'
                                      : 'bg-[#1a132c] text-[#C5A15A] border border-[#C5A15A]/35 hover:bg-[#251638]'
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

                  {/* Reputation & Featured Rare Badges Showcase (respects Achievements privacy) */}
                  {player.showAchievements !== false &&
                    (typeof player.reputationScore === 'number' ||
                      identitySummary ||
                      (player.featuredBadges && player.featuredBadges.length > 0)) && (
                      <div className="p-4 rounded-xl bg-[#130f24] border border-[#C5A15A]/25 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#E8CF96] flex items-center gap-1.5 font-['Cinzel']">
                            <Star className="w-3.5 h-3.5 text-[#C5A15A]" />
                            Reputation &amp; Featured Badges
                          </span>
                          <span className="text-xs font-mono font-bold text-white tabular-nums">
                            {(
                              player.reputationScore ??
                              identitySummary?.reputationScore ??
                              0
                            ).toLocaleString()}{' '}
                            Rep ·{' '}
                            <span className="text-[#C5A15A]">
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
                                    className="p-2.5 rounded-lg bg-[#0a0714] border border-purple-950/70"
                                  >
                                    <span className={`text-[10px] font-bold uppercase ${rStyle.text}`}>
                                      {badge.rarity}
                                    </span>
                                    <p className="text-xs font-semibold text-white truncate mt-0.5">
                                      {badge.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {badge.description}
                                    </p>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            No rare badges featured yet.
                          </p>
                        )}
                      </div>
                    )}

                  {/* Unlocked Achievements */}
                  {player.showAchievements !== false && (
                    <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          Unlocked Achievements
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {player.achievements?.length || 0} earned
                        </span>
                      </div>
                      {!player.achievements || player.achievements.length === 0 ? (
                        <p className="text-xs text-slate-500">No achievements unlocked yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {player.achievements.slice(0, 8).map(ach => (
                            <div
                              key={ach.id}
                              className="p-2.5 rounded-lg bg-[#0a0714] border border-purple-950/60"
                            >
                              <p className="text-xs font-semibold text-white truncate">{ach.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{ach.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Privacy-Gated Personal Records & Recent Workout History */}
                  {(player.personalRecords?.length || player.workoutHistory?.length || player.dailyActivity) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {player.personalRecords && player.personalRecords.length > 0 && (
                        <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-2.5">
                          <span className="text-xs font-semibold text-[#C5A15A] block">
                            Personal Records
                          </span>
                          <div className="space-y-1.5 text-xs">
                            {player.personalRecords.slice(0, 5).map((pr, idx) => (
                              <div key={`${pr.exerciseName}-${idx}`} className="flex justify-between gap-2">
                                <span className="text-slate-200 truncate">{pr.exerciseName}</span>
                                <span className="font-mono text-[#E8CF96] tabular-nums shrink-0">
                                  {pr.bestReps ? `${pr.bestReps} reps` : `${pr.bestDurationMinutes ?? 0} min`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {player.workoutHistory && player.workoutHistory.length > 0 && (
                        <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-2.5">
                          <span className="text-xs font-semibold text-slate-200 block">
                            Recent Workouts
                          </span>
                          <div className="space-y-1.5 text-xs">
                            {player.workoutHistory.slice(0, 5).map(w => (
                              <div key={w.id} className="flex justify-between gap-2">
                                <span className="text-slate-300 truncate">{w.exerciseName}</span>
                                <span className="font-mono text-slate-400 tabular-nums shrink-0">
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
                    <div className="p-4 rounded-xl bg-[#130f24] border border-[#C5A15A]/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#E8CF96] flex items-center gap-1.5 font-['Cinzel']">
                          <Layers className="w-3.5 h-3.5 text-[#C5A15A]" />
                          Curated Collectible Cards
                        </span>
                        <span className="text-[11px] text-[#C5A15A]/80 tabular-nums">
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
                              className="p-2.5 rounded-xl bg-[#0a0714] border border-purple-950/70 space-y-2"
                            >
                              <CollectibleCardArtwork card={card} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{card.name}</p>
                                <p className="text-[10px] text-[#C5A15A] truncate">
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
                      <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-3">
                        <span className="text-xs font-semibold text-[#E8CF96] flex items-center gap-1.5 font-['Cinzel']">
                          <Trophy className="w-3.5 h-3.5 text-[#C5A15A]" />
                          Pinned Trophy Case
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {publicTrophyState.pinnedIds.slice(0, 4).map(tid => {
                            const tDef = publicTrophyState.trophies.find(t => t.id === tid);
                            if (!tDef) return null;
                            return (
                              <div
                                key={tid}
                                className="p-2.5 rounded-lg bg-[#0a0714] border border-[#C5A15A]/20"
                              >
                                <p className="text-xs font-bold text-white truncate">{tDef.title}</p>
                                <p className="text-[11px] text-slate-400 truncate">
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
                    <div className="p-4 rounded-xl bg-[#130f24] border border-[#C5A15A]/25 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#E8CF96] flex items-center gap-1.5 font-['Cinzel']">
                          <HeartHandshake className="w-3.5 h-3.5 text-[#C5A15A]" />
                          Peer Endorsements ({endorsementSummary.totalEndorsements})
                        </span>
                        {!isSelfProfile && (
                          <button
                            type="button"
                            onClick={() => setShowReportBox(v => !v)}
                            className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1"
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
                              className="p-2.5 rounded-lg bg-[#0a0714] border border-purple-950/70 text-center"
                            >
                              <span
                                className="text-[10px] font-bold uppercase block"
                                style={{ color: meta.accentHex }}
                              >
                                {meta.label}
                              </span>
                              <span className="font-mono font-bold text-sm text-white tabular-nums">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {!isSelfProfile && (
                        <form onSubmit={handleGiveEndorsement} className="space-y-2 pt-2 border-t border-purple-950/70">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={endorseCategory}
                              onChange={e => setEndorseCategory(e.target.value as EndorsementCategory)}
                              className="rounded-lg bg-[#0a0714] border border-[#C5A15A]/25 px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                              className="flex-1 min-w-[160px] rounded-lg bg-[#0a0714] border border-purple-900/70 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={actionBusy || !endorsementSummary.canEndorseToday}
                              className="px-3 py-1.5 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] disabled:opacity-45 text-[#100D19] font-bold text-xs whitespace-nowrap"
                            >
                              Endorse
                            </button>
                          </div>
                          {!endorsementSummary.canEndorseToday && endorsementSummary.cooldownReason && (
                            <p className="text-[11px] text-amber-300/80">
                              {endorsementSummary.cooldownReason}
                            </p>
                          )}
                        </form>
                      )}

                      {showReportBox && !isSelfProfile && (
                        <form onSubmit={handleReportAbuse} className="flex items-center gap-2 pt-2 border-t border-rose-900/40">
                          <input
                            type="text"
                            maxLength={160}
                            value={reportReason}
                            onChange={e => setReportReason(e.target.value)}
                            placeholder="Describe inappropriate endorsement or abuse..."
                            className="flex-1 rounded-lg bg-[#0a0714] border border-rose-900/60 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={actionBusy}
                            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold whitespace-nowrap"
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
    </div>
  );
};
