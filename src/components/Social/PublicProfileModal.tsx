import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { EquipmentIllustration, ArtworkItemId } from '../../assets/equipmentArtwork';
import { getRarityStyle } from '../../utils/rarityStyles';
import { PublicPlayerProfile } from '../../types/game';
import {
  X,
  UserPlus,
  UserMinus,
  UserCheck,
  Shield,
  Ban,
  Check,
  Lock,
  Loader2,
  Award,
  Swords,
  AlertTriangle,
  MailPlus,
} from 'lucide-react';

export const PublicProfileModal: React.FC = () => {
  const {
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
  } = useGame();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PublicPlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);

  const loadProfile = async (targetId: string) => {
    setLoading(true);
    setError(null);
    setConfirmAction(null);
    const res = await getPublicPlayerProfile(targetId);
    if (!res.success || !res.data) {
      setError(res.error || 'Unable to load player profile.');
      setProfile(null);
    } else {
      setProfile(res.data);
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

  const player = profile?.player;
  const weaponRarityStyle = player?.equippedWeapon
    ? getRarityStyle(player.equippedWeapon.rarity)
    : null;

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
              {/* Identity Summary (Strictly RPG Avatar, never OAuth email/photo) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-purple-950/70">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={getRpgAvatarForClass(player.characterClass)}
                    alt={`${player.characterClass} RPG Avatar`}
                    className="w-20 h-20 rounded-xl object-cover object-top border border-purple-600/70 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-['Cinzel'] font-bold text-xl text-white truncate">
                        {player.username}
                      </h3>
                      {player.characterName && player.characterName !== player.username && (
                        <span className="text-xs text-slate-400 truncate">
                          ({player.characterName})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-purple-300 mt-1 tabular-nums">
                      {player.characterClass}
                      {typeof player.level === 'number' && ` · Lv.${player.level}`}
                      {player.aetherRank && ` · ${player.aetherRank}`}
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
                      : `Only accepted friends can view ${player.username}'s equipment, stats, guild, and achievements. Send a friend request to connect.`}
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

                  {/* Equipped Weapon & Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {player.showEquipment !== false && (
                      <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950/80 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5 text-purple-400" />
                            Equipped Armament
                          </span>
                          {typeof player.unlockedWeaponsCount === 'number' && (
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {player.unlockedWeaponsCount} unlocked
                            </span>
                          )}
                        </div>
                        {player.equippedWeapon ? (
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-[#0a0714] border border-purple-900/60 flex items-center justify-center shrink-0">
                              <EquipmentIllustration
                                itemId={player.equippedWeapon.weaponId as ArtworkItemId}
                                rarity={player.equippedWeapon.rarity}
                                evolutionStage={player.equippedWeapon.evolutionStage}
                                level={player.equippedWeapon.level}
                                className="w-12 h-12"
                              />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-bold truncate"
                                style={{ color: weaponRarityStyle?.accentHex || '#f8fafc' }}
                              >
                                {player.equippedWeapon.name}
                              </p>
                              <p className="text-[11px] text-slate-400 tabular-nums">
                                {player.equippedWeapon.rarity} · Lv.{player.equippedWeapon.level} ·{' '}
                                {player.equippedWeapon.element}
                              </p>
                              <p className="text-[11px] text-purple-300 tabular-nums">
                                {player.equippedWeapon.evolutionStage} Stage · Mastery {player.equippedWeapon.masteryLevel}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No equipped weapon displayed.</p>
                        )}
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
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
