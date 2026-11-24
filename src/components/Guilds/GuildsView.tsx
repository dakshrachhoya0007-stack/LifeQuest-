import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { GuildDetailsData, ChampionSummary } from '../../types/game';
import {
  Users,
  Shield,
  Flame,
  Crown,
  Dumbbell,
  Sparkles,
  Compass,
  Sun,
  Plus,
  Check,
  X,
  ArrowLeft,
  Lock,
  Globe,
  UserPlus,
  Settings,
  Trash2,
  LogOut,
  AlertTriangle,
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
  Target,
  MapPin,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { TerritoryWarsView } from './TerritoryWarsView';

const EMBLEM_OPTIONS = [
  { id: 'Shield', label: 'Shield', Icon: Shield },
  { id: 'Flame', label: 'Flame', Icon: Flame },
  { id: 'Crown', label: 'Crown', Icon: Crown },
  { id: 'Dumbbell', label: 'Strength', Icon: Dumbbell },
  { id: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
  { id: 'Compass', label: 'Compass', Icon: Compass },
  { id: 'Sun', label: 'Sun', Icon: Sun },
] as const;

const renderGuildEmblem = (emblem: string, className = 'w-5 h-5 text-amber-400') => {
  if (emblem === 'Swords') return <Dumbbell className={className} />;
  const found = EMBLEM_OPTIONS.find(e => e.id === emblem);
  const Icon = found ? found.Icon : Shield;
  return <Icon className={className} />;
};

export const GuildsView: React.FC = () => {
  const {
    user,
    stats,
    guilds,
    guildInvites,
    friends,
    unifiedBackendReady,
    createGuild,
    toggleGuildMembership,
    leaveGuild,
    getGuildDetails,
    requestJoinGuild,
    respondGuildRequest,
    inviteToGuild,
    respondGuildInvite,
    disbandGuild,
    updateGuildDetails,
    manageGuildMember,
    createGuildChallenge,
    searchChampions,
    openPublicProfile,
    equippedLegendMap,
    queryPresencesBatch,
    getPlayerPresence,
    guildsSubTab,
    setGuildsSubTab,
  } = useGame();

  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [guildDetails, setGuildDetails] = useState<GuildDetailsData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [directorySearch, setDirectorySearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Guild Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildTag, setGuildTag] = useState('');
  const [guildDesc, setGuildDesc] = useState('');
  const [guildEmblem, setGuildEmblem] = useState('Shield');
  const [guildPublic, setGuildPublic] = useState(true);
  const [guildMinLevel, setGuildMinLevel] = useState(1);

  // Private Guild Request Modal
  const [requestModalGuildId, setRequestModalGuildId] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');

  // Challenge Modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeTarget, setChallengeTarget] = useState(500);
  const [challengeRewardGold, setChallengeRewardGold] = useState(120);
  const [challengeRewardXp, setChallengeRewardXp] = useState(90);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editQuestName, setEditQuestName] = useState('');
  const [editEmblem, setEditEmblem] = useState('Shield');
  const [editPublic, setEditPublic] = useState(true);
  const [editMinLevel, setEditMinLevel] = useState(1);

  // Invite Search inside HQ
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<ChampionSummary[]>([]);
  const [searchingInvites, setSearchingInvites] = useState(false);

  // Destructive Confirmation Modal
  const [confirmState, setConfirmState] = useState<{
    kind: 'leave' | 'disband' | 'kick' | 'transfer';
    guildId: string;
    guildName: string;
    targetUserId?: string;
    targetUsername?: string;
  } | null>(null);

  const myGuild = guilds.find(g => g.isMember) || null;

  const showNotice = (type: 'error' | 'success', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadDetails = async (guildId: string) => {
    setLoadingDetails(true);
    const res = await getGuildDetails(guildId);
    if (res.success && res.data) {
      setGuildDetails(res.data);
      const ids = res.data.members.map(m => m.userId).filter(Boolean);
      if (ids.length > 0) {
        void queryPresencesBatch(ids);
      }
    } else {
      showNotice('error', res.error || 'Could not load guild details.');
    }
    setLoadingDetails(false);
  };

  useEffect(() => {
    if (selectedGuildId) {
      void loadDetails(selectedGuildId);
    } else {
      setGuildDetails(null);
    }
  }, [selectedGuildId]);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildName.trim()) return;
    setIsSubmitting(true);
    const res = await createGuild({
      name: guildName,
      tag: guildTag,
      description: guildDesc,
      emblem: guildEmblem,
      isPublic: guildPublic,
      minLevel: guildMinLevel,
    });
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', `Guild "${guildName.trim()}" established!`);
      setShowCreateModal(false);
      setGuildName('');
      setGuildTag('');
      setGuildDesc('');
      setGuildEmblem('Shield');
      setGuildPublic(true);
      setGuildMinLevel(1);
    }
  };

  const handleJoinPublic = async (guildId: string) => {
    setIsSubmitting(true);
    const res = await toggleGuildMembership(guildId);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', 'Welcome to your new guild!');
      if (selectedGuildId === guildId) await loadDetails(guildId);
    }
  };

  const handleSubmitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalGuildId) return;
    setIsSubmitting(true);
    const res = await requestJoinGuild(requestModalGuildId, requestNote.trim());
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', 'Join request sent to the guild officers.');
      setRequestModalGuildId(null);
      setRequestNote('');
    }
  };

  const handleRespondInvite = async (inviteId: string, accept: boolean, gName: string) => {
    setIsSubmitting(true);
    const res = await respondGuildInvite(inviteId, accept);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', accept ? `Joined ${gName}!` : `Declined invitation from ${gName}.`);
    }
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    if (!selectedGuildId) return;
    setIsSubmitting(true);
    const res = await respondGuildRequest(requestId, accept);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', accept ? 'Applicant accepted into the guild.' : 'Join request declined.');
      await loadDetails(selectedGuildId);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId || !challengeTitle.trim()) return;
    setIsSubmitting(true);
    const res = await createGuildChallenge({
      guildId: selectedGuildId,
      title: challengeTitle.trim(),
      targetValue: challengeTarget,
      rewardGold: challengeRewardGold,
      rewardPlayerXp: challengeRewardXp,
    });
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', 'Guild challenge published!');
      setShowChallengeModal(false);
      setChallengeTitle('');
      await loadDetails(selectedGuildId);
    }
  };

  const openEditSettings = () => {
    if (!guildDetails) return;
    setEditDesc(guildDetails.guild.description || '');
    setEditQuestName(guildDetails.guild.weeklyQuestName || '');
    setEditEmblem(guildDetails.guild.emblem || 'Shield');
    setEditPublic(guildDetails.guild.isPublic !== false);
    setEditMinLevel(guildDetails.guild.minLevel || 1);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId) return;
    setIsSubmitting(true);
    const res = await updateGuildDetails({
      guildId: selectedGuildId,
      description: editDesc.trim(),
      weeklyQuestName: editQuestName.trim(),
      emblem: editEmblem,
      isPublic: editPublic,
      minLevel: editMinLevel,
    });
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', 'Guild settings updated.');
      setShowSettingsModal(false);
      await loadDetails(selectedGuildId);
    }
  };

  const handleSearchInviteCandidates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchingInvites(true);
    const results = await searchChampions(inviteQuery.trim(), 15, 0);
    setInviteResults(results);
    setSearchingInvites(false);
  };

  const handleSendInvite = async (targetUserId: string, username: string) => {
    if (!selectedGuildId) return;
    setIsSubmitting(true);
    const res = await inviteToGuild(selectedGuildId, targetUserId);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      showNotice('success', `Invitation sent to ${username}.`);
      await loadDetails(selectedGuildId);
    }
  };

  const handleMemberRoleChange = async (
    targetUserId: string,
    action: 'promote' | 'demote'
  ) => {
    if (!selectedGuildId) return;
    setIsSubmitting(true);
    const res = await manageGuildMember(selectedGuildId, targetUserId, action);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      showNotice('error', res.error);
    } else {
      await loadDetails(selectedGuildId);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmState) return;
    setIsSubmitting(true);
    if (confirmState.kind === 'leave') {
      const res = await leaveGuild();
      if (!res.success && res.error) {
        showNotice('error', res.error);
      } else {
        showNotice('success', `Left ${confirmState.guildName}.`);
        setSelectedGuildId(null);
      }
    } else if (confirmState.kind === 'disband') {
      const res = await disbandGuild(confirmState.guildId);
      if (!res.success && res.error) {
        showNotice('error', res.error);
      } else {
        showNotice('success', `${confirmState.guildName} has been disbanded.`);
        setSelectedGuildId(null);
      }
    } else if (confirmState.kind === 'kick' && confirmState.targetUserId) {
      const res = await manageGuildMember(confirmState.guildId, confirmState.targetUserId, 'kick');
      if (!res.success && res.error) {
        showNotice('error', res.error);
      } else {
        showNotice('success', `Removed ${confirmState.targetUsername} from the guild.`);
        if (selectedGuildId === confirmState.guildId) await loadDetails(confirmState.guildId);
      }
    } else if (confirmState.kind === 'transfer' && confirmState.targetUserId) {
      const res = await manageGuildMember(
        confirmState.guildId,
        confirmState.targetUserId,
        'transfer_leader'
      );
      if (!res.success && res.error) {
        showNotice('error', res.error);
      } else {
        showNotice('success', `Leadership transferred to ${confirmState.targetUsername}.`);
        if (selectedGuildId === confirmState.guildId) await loadDetails(confirmState.guildId);
      }
    }
    setConfirmState(null);
    setIsSubmitting(false);
  };

  const filteredGuilds = guilds.filter(g => {
    if (!directorySearch.trim()) return true;
    const q = directorySearch.trim().toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.tag.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-300 mb-1">
              Player-Founded Brotherhoods · Real Member Progress Only
            </p>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              GUILDS & COOPERATIVE RAIDS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Found a guild or join an active fellowship. Guild XP and challenge progress advance strictly from verified member workouts, habits, and boss victories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-[#090714] border border-[#C5A15A]/25 rounded-xl">
              <button
                type="button"
                onClick={() => setGuildsSubTab('directory')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  guildsSubTab === 'directory'
                    ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                    : 'text-[#D9D2C5]/65 hover:text-white border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Guild Directory
              </button>
              <button
                type="button"
                onClick={() => setGuildsSubTab('territory-wars')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  guildsSubTab === 'territory-wars'
                    ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                    : 'text-[#D9D2C5]/65 hover:text-white border border-transparent'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Territory Wars
              </button>
            </div>
            {guildsSubTab === 'directory' && myGuild && selectedGuildId !== myGuild.id && (
              <button
                onClick={() => setSelectedGuildId(myGuild.id)}
                className="px-4 py-2.5 rounded-xl border border-purple-600/70 bg-purple-950/60 hover:bg-purple-900/60 text-purple-100 text-xs font-semibold whitespace-nowrap"
              >
                Open My Guild ([{myGuild.tag}])
              </button>
            )}
            {guildsSubTab === 'directory' && !myGuild && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-purple-700 hover:bg-purple-600 text-white shadow-lg flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Create Guild
              </button>
            )}
          </div>
        </div>
      </div>

      {guildsSubTab === 'territory-wars' ? (
        <TerritoryWarsView />
      ) : (
        <>
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs animate-in fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-950/70 border-rose-700 text-rose-200'
              : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Pending Incoming Guild Invites */}
      {guildInvites.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#130f24] border border-purple-700/60 space-y-3">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
            Pending Guild Invitations ({guildInvites.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {guildInvites.map(inv => (
              <div
                key={inv.inviteId}
                className="p-3.5 rounded-xl bg-[#0b0816] border border-purple-900/60 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    [{inv.guildTag}] {inv.guildName}
                  </p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    Lv.{inv.guildLevel} · Invited by {inv.inviterName}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={isSubmitting || Boolean(myGuild)}
                    onClick={() => handleRespondInvite(inv.inviteId, true, inv.guildName)}
                    title={myGuild ? 'Leave your current guild first' : 'Accept invite'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleRespondInvite(inv.inviteId, false, inv.guildName)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SELECTED GUILD HQ / DETAILS VIEW */}
      {selectedGuildId ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedGuildId(null)}
              className="px-3.5 py-2 rounded-xl bg-[#0e0a1b] border border-purple-950 hover:border-purple-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Guilds
            </button>

            {guildDetails?.guild.isMember && (
              <div className="flex items-center gap-2">
                {(guildDetails.guild.myRole === 'leader' || guildDetails.guild.myRole === 'officer') && (
                  <>
                    <button
                      onClick={() => setShowChallengeModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Target className="w-3.5 h-3.5" />
                      New Challenge
                    </button>
                    <button
                      onClick={openEditSettings}
                      className="px-3.5 py-2 rounded-xl bg-[#0e0a1b] border border-purple-800/70 hover:bg-purple-950/60 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    setConfirmState({
                      kind: 'leave',
                      guildId: guildDetails.guild.id,
                      guildName: guildDetails.guild.name,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#0e0a1b] border border-rose-900/70 hover:bg-rose-950/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Leave Guild
                </button>

                {guildDetails.guild.myRole === 'leader' && (
                  <button
                    onClick={() =>
                      setConfirmState({
                        kind: 'disband',
                        guildId: guildDetails.guild.id,
                        guildName: guildDetails.guild.name,
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Disband
                  </button>
                )}
              </div>
            )}
          </div>

          {loadingDetails || !guildDetails ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 bg-[#0e0a1b] border border-purple-950 rounded-2xl text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span>Loading guild roster and challenges...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Guild Summary Header */}
              <div className="p-6 rounded-2xl bg-[#0e0a1b] border border-purple-900/70 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-900/50 border border-purple-600/70 flex items-center justify-center shrink-0">
                      {renderGuildEmblem(guildDetails.guild.emblem, 'w-7 h-7 text-amber-400')}
                    </div>
                    <div>
                      <h2 className="font-['Cinzel'] font-bold text-xl text-white">
                        {guildDetails.guild.name}
                      </h2>
                      <p className="text-xs text-purple-300 mt-0.5 tabular-nums flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold">[{guildDetails.guild.tag}]</span>
                        <span aria-hidden="true">·</span>
                        <span>Guild Lv.{guildDetails.guild.level}</span>
                        <span aria-hidden="true">·</span>
                        <span>{(guildDetails.guild.guildXp || 0).toLocaleString()} Guild XP</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          {guildDetails.guild.isPublic !== false ? (
                            <>
                              <Globe className="w-3 h-3" /> Public
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" /> Private
                            </>
                          )}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Min Lv.{guildDetails.guild.minLevel || 1}</span>
                      </p>
                      {guildDetails.guild.description && (
                        <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                          {guildDetails.guild.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <span className="text-[11px] text-slate-400 block">Roster Capacity</span>
                    <span className="text-lg font-mono font-bold text-white">
                      {guildDetails.guild.membersCount} / {guildDetails.guild.maxMembers}
                    </span>
                  </div>
                </div>

                {/* Guild XP Bar */}
                {(() => {
                  const totalGxp = guildDetails.guild.guildXp || 0;
                  const levelFloor = (guildDetails.guild.level - 1) * 1000;
                  const levelPct = Math.min(100, Math.round(((totalGxp - levelFloor) / 1000) * 100));
                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400 tabular-nums">
                        <span>Guild Level Progression</span>
                        <span>{Math.max(0, totalGxp - levelFloor)} / 1,000 XP to next level</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-300"
                          style={{ width: `${Math.max(0, levelPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Challenges + Roster Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Roster (2 cols) */}
                <div className="lg:col-span-2 bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      Guild Roster ({guildDetails.members.length})
                    </h3>
                  </div>

                  {guildDetails.members.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No members in this guild.</p>
                  ) : (
                    <div className="divide-y divide-purple-950/60">
                      {guildDetails.members.map(member => {
                        const isSelf = member.userId === user?.id;
                        const myRole = guildDetails.guild.myRole;
                        const canManage =
                          !isSelf &&
                          (myRole === 'leader' || (myRole === 'officer' && member.role === 'member'));

                        return (
                          <div
                            key={member.userId}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => openPublicProfile(member.userId)}
                                className="relative shrink-0"
                              >
                                <img
                                  src={getRpgAvatarForClass(member.characterClass)}
                                  alt={member.username}
                                  className="w-10 h-10 rounded-xl object-cover object-top border border-purple-700/70"
                                />
                                <PresenceBadge
                                  status={getPlayerPresence(member.userId)?.status}
                                  size="sm"
                                  className="absolute -bottom-0.5 -right-0.5"
                                />
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => openPublicProfile(member.userId)}
                                    className="text-sm font-bold text-white hover:text-purple-300 truncate"
                                  >
                                    {member.username}
                                  </button>
                                  <LegendTitleBadge
                                    title={member.legendTitle || equippedLegendMap[member.userId]?.titleTag}
                                    style={member.legendTitleStyle || equippedLegendMap[member.userId]?.titleStyle}
                                    emblemIcon={member.legendEmblem || equippedLegendMap[member.userId]?.emblemIcon}
                                    size="xs"
                                  />
                                  <span
                                    className={`text-[11px] capitalize font-semibold ${
                                      member.role === 'leader'
                                        ? 'text-amber-400'
                                        : member.role === 'officer'
                                        ? 'text-purple-300'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {member.role}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 tabular-nums">
                                  Lv.{member.level} · {member.characterClass} ·{' '}
                                  <span className="text-slate-300 font-mono">
                                    {member.weeklyContribution} contribution
                                  </span>
                                </p>
                              </div>
                            </div>

                            {canManage && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {myRole === 'leader' && member.role === 'member' && (
                                  <button
                                    disabled={isSubmitting}
                                    onClick={() => handleMemberRoleChange(member.userId, 'promote')}
                                    className="px-2.5 py-1 rounded-lg bg-[#161029] hover:bg-purple-950/60 text-purple-200 text-[11px] font-medium flex items-center gap-1"
                                    title="Promote to Officer"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                    Promote
                                  </button>
                                )}
                                {myRole === 'leader' && member.role === 'officer' && (
                                  <button
                                    disabled={isSubmitting}
                                    onClick={() => handleMemberRoleChange(member.userId, 'demote')}
                                    className="px-2.5 py-1 rounded-lg bg-[#161029] hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                    Demote
                                  </button>
                                )}
                                {myRole === 'leader' && (
                                  <button
                                    disabled={isSubmitting}
                                    onClick={() =>
                                      setConfirmState({
                                        kind: 'transfer',
                                        guildId: guildDetails.guild.id,
                                        guildName: guildDetails.guild.name,
                                        targetUserId: member.userId,
                                        targetUsername: member.username,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#161029] hover:bg-amber-950/50 text-amber-300 text-[11px] font-medium whitespace-nowrap"
                                  >
                                    Make Leader
                                  </button>
                                )}
                                <button
                                  disabled={isSubmitting}
                                  onClick={() =>
                                    setConfirmState({
                                      kind: 'kick',
                                      guildId: guildDetails.guild.id,
                                      guildName: guildDetails.guild.name,
                                      targetUserId: member.userId,
                                      targetUsername: member.username,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-950/50 text-[11px] font-medium"
                                >
                                  Kick
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Challenges, Join Requests, Invites */}
                <div className="space-y-6">
                  {/* Weekly Challenges */}
                  <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-4">
                    <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      Guild Challenges
                    </h3>

                    {guildDetails.challenges.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No challenges recorded yet. Complete workouts, habits, or boss battles to contribute.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {guildDetails.challenges.map(ch => {
                          const pct = Math.min(100, Math.round((ch.currentValue / Math.max(1, ch.targetValue)) * 100));
                          return (
                            <div key={ch.id} className="p-3 rounded-xl bg-[#130f24] border border-purple-950 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-semibold text-white">{ch.title}</span>
                                <span className="text-[11px] font-mono text-amber-300 tabular-nums shrink-0">
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-amber-400"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                                <span className="font-mono">
                                  {ch.currentValue.toLocaleString()} / {ch.targetValue.toLocaleString()}
                                </span>
                                <span>
                                  +{ch.rewardGold}G · +{ch.rewardPlayerXp}XP
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Join Requests Queue (Leader/Officer) */}
                  {(guildDetails.guild.myRole === 'leader' || guildDetails.guild.myRole === 'officer') && (
                    <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3">
                      <h3 className="font-['Cinzel'] font-bold text-sm text-white">
                        Join Requests ({guildDetails.joinRequests.length})
                      </h3>
                      {guildDetails.joinRequests.length === 0 ? (
                        <p className="text-xs text-slate-500">No pending join applications.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {guildDetails.joinRequests.map(req => (
                            <div
                              key={req.id}
                              className="p-3 rounded-xl bg-[#130f24] border border-purple-900/60 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPublicProfile(req.userId)}
                                  className="text-xs font-bold text-white hover:text-purple-300 truncate"
                                >
                                  {req.username}
                                </button>
                                <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                                  Lv.{req.level} {req.characterClass}
                                </span>
                              </div>
                              {req.message && (
                                <p className="text-[11px] text-slate-300">{req.message}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleRespondRequest(req.id, true)}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold"
                                >
                                  Accept
                                </button>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleRespondRequest(req.id, false)}
                                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invite Players (Leader/Officer) */}
                  {(guildDetails.guild.myRole === 'leader' || guildDetails.guild.myRole === 'officer') && (
                    <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3">
                      <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-purple-400" />
                        Invite Players
                      </h3>

                      <form onSubmit={handleSearchInviteCandidates} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inviteQuery}
                          onChange={e => setInviteQuery(e.target.value)}
                          placeholder="Search username..."
                          className="flex-1 min-w-0 bg-[#130f24] border border-purple-900 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={searchingInvites}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold shrink-0"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </form>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {inviteResults.length > 0
                          ? inviteResults.map(c => (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{c.username}</p>
                                  <p className="text-[11px] text-slate-400 tabular-nums">
                                    Lv.{c.level} {c.characterClass}
                                  </p>
                                </div>
                                <button
                                  disabled={isSubmitting || Boolean(c.guildId)}
                                  onClick={() => handleSendInvite(c.id, c.username)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[11px] font-semibold shrink-0"
                                >
                                  {c.guildId ? 'In Guild' : 'Invite'}
                                </button>
                              </div>
                            ))
                          : acceptedFriends.map(f => (
                              <div
                                key={f.friendshipId}
                                className="p-2.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{f.champion.username}</p>
                                  <p className="text-[11px] text-slate-400 tabular-nums">
                                    Friend · Lv.{f.champion.level}
                                  </p>
                                </div>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleSendInvite(f.champion.id, f.champion.username)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-semibold shrink-0"
                                >
                                  Invite
                                </button>
                              </div>
                            ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* GUILD DIRECTORY */
        <div className="space-y-5">
          {guilds.length > 0 && (
            <div className="flex items-center gap-3 bg-[#0e0a1b] border border-purple-950 rounded-2xl p-4">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                value={directorySearch}
                onChange={e => setDirectorySearch(e.target.value)}
                placeholder="Filter guilds by name, tag, or focus..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          )}

          {guilds.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#0e0a1b] border border-purple-950 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center mx-auto text-amber-400">
                <Shield className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-['Cinzel'] font-bold text-lg text-white">
                  No Guilds Founded Yet
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  No guilds have been founded yet. Be the first to establish one!
                </p>
              </div>
              {unifiedBackendReady && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-purple-700 hover:bg-purple-600 text-white shadow-lg inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Guild
                </button>
              )}
            </div>
          ) : filteredGuilds.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#0e0a1b] border border-purple-950 text-center text-xs text-slate-400">
              No guilds match "{directorySearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredGuilds.map(guild => {
                const progressPercent = Math.min(
                  100,
                  Math.round((guild.weeklyQuestProgress / Math.max(1, guild.weeklyQuestMax)) * 100)
                );
                const isPrivate = guild.isPublic === false;
                const meetsMinLevel = stats.level >= (guild.minLevel || 1);

                return (
                  <div
                    key={guild.id}
                    className={`p-6 rounded-2xl border flex flex-col justify-between transition-colors shadow-xl ${
                      guild.isMember
                        ? 'bg-purple-950/35 border-purple-500'
                        : 'bg-[#0e0a1b] border-purple-950/80 hover:border-purple-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-purple-900/60 flex items-center justify-center border border-purple-700 shrink-0">
                            {renderGuildEmblem(guild.emblem)}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedGuildId(guild.id)}
                              className="font-['Cinzel'] font-bold text-base text-white hover:text-purple-300 truncate block text-left"
                            >
                              {guild.name}
                            </button>
                            <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                              <span className="font-mono font-bold text-purple-300">[{guild.tag}]</span>
                              {' · '}Lv.{guild.level}
                              {' · '}
                              {isPrivate ? 'Private' : 'Public'}
                              {(guild.minLevel || 1) > 1 ? ` · Min Lv.${guild.minLevel}` : ''}
                            </p>
                          </div>
                        </div>

                        {guild.isMember && (
                          <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                            Joined ({guild.myRole || 'member'})
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
                        {guild.description || 'Active player-led fellowship.'}
                      </p>

                      {/* Real Raid Quest Progress */}
                      <div className="bg-[#130f24] p-3.5 rounded-xl border border-purple-950 space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] text-purple-300 font-semibold">
                            Weekly Guild Challenge
                          </span>
                          <span className="text-[11px] text-amber-300 font-mono font-bold tabular-nums">
                            {progressPercent}%
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-100 truncate">
                          {guild.weeklyQuestName}
                        </p>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-amber-400 h-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 flex justify-between font-mono tabular-nums">
                          <span>Progress</span>
                          <span>
                            {guild.weeklyQuestProgress.toLocaleString()} /{' '}
                            {guild.weeklyQuestMax.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-950/70 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        {guild.membersCount} / {guild.maxMembers} Members
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedGuildId(guild.id)}
                          className="px-3 py-2 rounded-xl bg-[#161029] hover:bg-purple-950/60 text-slate-200 text-xs font-semibold whitespace-nowrap"
                        >
                          {guild.isMember ? 'Manage' : 'Inspect'}
                        </button>

                        {!guild.isMember && !myGuild && (
                          isPrivate ? (
                            guild.hasPendingRequest ? (
                              <span className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold whitespace-nowrap">
                                Requested
                              </span>
                            ) : (
                              <button
                                disabled={!meetsMinLevel || isSubmitting}
                                onClick={() => setRequestModalGuildId(guild.id)}
                                className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold whitespace-nowrap"
                              >
                                Request Join
                              </button>
                            )
                          ) : (
                            <button
                              disabled={!meetsMinLevel || isSubmitting}
                              onClick={() => handleJoinPublic(guild.id)}
                              className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold whitespace-nowrap"
                            >
                              Join
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Create Guild Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0f0c1b] border border-purple-900 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold font-['Cinzel'] text-white mb-4">
              ESTABLISH A GUILD
            </h3>
            <form onSubmit={handleCreateGuild} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-300 mb-1">Guild Name</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={60}
                    value={guildName}
                    onChange={e => setGuildName(e.target.value)}
                    placeholder="e.g. Iron Vanguard"
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Tag (2–4 chars)</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={4}
                    value={guildTag}
                    onChange={e => setGuildTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="IRON"
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Guild Charter</label>
                <textarea
                  value={guildDesc}
                  onChange={e => setGuildDesc(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Describe your guild's fitness routines and goals..."
                  className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">Guild Emblem</label>
                <div className="flex flex-wrap gap-2">
                  {EMBLEM_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setGuildEmblem(opt.id)}
                      className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                        guildEmblem === opt.id
                          ? 'bg-purple-800/70 border-purple-400 text-white'
                          : 'bg-[#140f26] border-purple-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <opt.Icon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Membership Type</label>
                  <select
                    value={guildPublic ? 'public' : 'private'}
                    onChange={e => setGuildPublic(e.target.value === 'public')}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="public">Public (Anyone can join)</option>
                    <option value="private">Private (Requires approval)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Minimum Level</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={guildMinLevel}
                    onChange={e => setGuildMinLevel(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold font-['Cinzel'] bg-purple-700 hover:bg-purple-600 text-white rounded-xl shadow"
                >
                  {isSubmitting ? 'Creating...' : 'Found Guild'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Join Private Guild Modal */}
      {requestModalGuildId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setRequestModalGuildId(null)}
        >
          <div
            className="w-full max-w-md bg-[#0f0c1b] border border-purple-900 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold font-['Cinzel'] text-white mb-3">
              REQUEST TO JOIN GUILD
            </h3>
            <form onSubmit={handleSubmitJoinRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Message to Guild Officers (Optional)</label>
                <textarea
                  value={requestNote}
                  onChange={e => setRequestNote(e.target.value)}
                  maxLength={240}
                  rows={3}
                  placeholder="Share your workout focus or why you'd like to join..."
                  className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestModalGuildId(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showChallengeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowChallengeModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0f0c1b] border border-purple-900 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold font-['Cinzel'] text-white mb-4">
              SET WEEKLY GUILD CHALLENGE
            </h3>
            <form onSubmit={handleCreateChallenge} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={120}
                  value={challengeTitle}
                  onChange={e => setChallengeTitle(e.target.value)}
                  placeholder="e.g. 1,000 Verified Squad Reps"
                  className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Target</label>
                  <input
                    type="number"
                    min={100}
                    max={50000}
                    value={challengeTarget}
                    onChange={e => setChallengeTarget(Number(e.target.value) || 500)}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Gold Reward</label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={challengeRewardGold}
                    onChange={e => setChallengeRewardGold(Number(e.target.value) || 100)}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">XP Reward</label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={challengeRewardXp}
                    onChange={e => setChallengeRewardXp(Number(e.target.value) || 80)}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold"
                >
                  Publish Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Guild Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0f0c1b] border border-purple-900 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold font-['Cinzel'] text-white mb-4">
              GUILD SETTINGS
            </h3>
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Charter Description</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Weekly Focus Name</label>
                <input
                  type="text"
                  value={editQuestName}
                  onChange={e => setEditQuestName(e.target.value)}
                  maxLength={120}
                  className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Visibility</label>
                  <select
                    value={editPublic ? 'public' : 'private'}
                    onChange={e => setEditPublic(e.target.value === 'public')}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Min Level</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editMinLevel}
                    onChange={e => setEditMinLevel(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Emblem</label>
                <select
                  value={editEmblem}
                  onChange={e => setEditEmblem(e.target.value)}
                  className="w-full bg-[#140f26] border border-purple-900 rounded-xl px-3 py-2 text-white"
                >
                  {EMBLEM_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destructive Confirmation Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setConfirmState(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0f0c1b] border border-rose-900/70 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-['Cinzel'] font-bold text-base">
                {confirmState.kind === 'disband'
                  ? 'Disband Guild?'
                  : confirmState.kind === 'leave'
                  ? 'Leave Guild?'
                  : confirmState.kind === 'kick'
                  ? 'Remove Member?'
                  : 'Transfer Leadership?'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmState.kind === 'disband'
                ? `Permanently disband "${confirmState.guildName}"? All members, invites, and active challenges will be removed.`
                : confirmState.kind === 'leave'
                ? `Leave "${confirmState.guildName}"? If you are the leader, ownership will pass to the highest-ranking officer or longest-standing member.`
                : confirmState.kind === 'kick'
                ? `Remove ${confirmState.targetUsername} from "${confirmState.guildName}"?`
                : `Transfer guild leadership of "${confirmState.guildName}" to ${confirmState.targetUsername}? You will become an officer.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
