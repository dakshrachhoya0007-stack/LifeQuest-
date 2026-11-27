import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { GuildDetailsData, ChampionSummary } from '../../types/game';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedProgressBar,
  RpgModalWrapper,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';
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

const renderGuildEmblem = (emblem: string, className = 'w-5 h-5 text-[#E8C777]') => {
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildTag, setGuildTag] = useState('');
  const [guildDesc, setGuildDesc] = useState('');
  const [guildEmblem, setGuildEmblem] = useState('Shield');
  const [guildPublic, setGuildPublic] = useState(true);
  const [guildMinLevel, setGuildMinLevel] = useState(1);

  const [requestModalGuildId, setRequestModalGuildId] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');

  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeTarget, setChallengeTarget] = useState(500);
  const [challengeRewardGold, setChallengeRewardGold] = useState(120);
  const [challengeRewardXp, setChallengeRewardXp] = useState(90);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editQuestName, setEditQuestName] = useState('');
  const [editEmblem, setEditEmblem] = useState('Shield');
  const [editPublic, setEditPublic] = useState(true);
  const [editMinLevel, setEditMinLevel] = useState(1);

  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<ChampionSummary[]>([]);
  const [searchingInvites, setSearchingInvites] = useState(false);

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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <FeatureBanner themeId="social">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#E8C777] mb-1">
              Player-Founded Brotherhoods · Real Member Progress Only
            </p>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7]">
              Guilds &amp; Cooperative Raids
            </h1>
            <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
              Found a guild or join an active fellowship. Guild XP and challenge progress advance strictly from verified member workouts, habits, and boss victories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <FeatureTabBar
              themeId="social"
              layoutId="guilds-sub-tab"
              activeId={guildsSubTab}
              onSelect={id => setGuildsSubTab(id)}
              tabs={[
                { id: 'directory', label: 'Guild Directory', icon: Shield },
                { id: 'territory-wars', label: 'Territory Wars', icon: MapPin },
              ]}
            />
            {guildsSubTab === 'directory' && myGuild && selectedGuildId !== myGuild.id && (
              <button
                type="button"
                onClick={() => setSelectedGuildId(myGuild.id)}
                className="lq-btn lq-btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Open My Guild ([{myGuild.tag}])
              </button>
            )}
            {guildsSubTab === 'directory' && !myGuild && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="lq-btn lq-btn-gold px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Guild
              </button>
            )}
          </div>
        </div>
      </FeatureBanner>

      <RpgSubTabTransition tabKey={guildsSubTab}>
        {guildsSubTab === 'territory-wars' ? (
          <TerritoryWarsView />
        ) : (
          <div className="space-y-6">
            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium ${
                  feedback.type === 'error'
                    ? 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
                    : 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#49B88A]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* Pending Incoming Guild Invites */}
            {guildInvites.length > 0 && (
              <div className="lq-surface rounded-2xl p-4 space-y-3 border border-[#D6A84B]/35">
                <span className="text-xs font-bold text-[#E8C777] uppercase tracking-wider block">
                  Pending Guild Invitations ({guildInvites.length})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {guildInvites.map(inv => (
                    <div
                      key={inv.inviteId}
                      className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#F2EDF7] truncate">
                          [{inv.guildTag}] {inv.guildName}
                        </p>
                        <p className="text-xs text-[#A69AAF] tabular-nums">
                          Lv.{inv.guildLevel} · Invited by {inv.inviterName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isSubmitting || Boolean(myGuild)}
                          onClick={() => handleRespondInvite(inv.inviteId, true, inv.guildName)}
                          title={myGuild ? 'Leave your current guild first' : 'Accept invite'}
                          className="lq-btn px-3 py-1.5 rounded-lg bg-[#49B88A] hover:brightness-110 disabled:opacity-40 text-[#100D18] text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRespondInvite(inv.inviteId, false, inv.guildName)}
                          className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
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
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedGuildId(null)}
                    className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#E8C777]" />
                    All Guilds
                  </button>

                  {guildDetails?.guild.isMember && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(guildDetails.guild.myRole === 'leader' || guildDetails.guild.myRole === 'officer') && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowChallengeModal(true)}
                            className="lq-btn lq-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            <Target className="w-3.5 h-3.5" />
                            New Challenge
                          </button>
                          <button
                            type="button"
                            onClick={openEditSettings}
                            className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#E8C777]" />
                            Settings
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            kind: 'leave',
                            guildId: guildDetails.guild.id,
                            guildName: guildDetails.guild.name,
                          })
                        }
                        className="lq-btn px-3.5 py-2 rounded-xl bg-[#100D18] border border-[#D65C66]/45 hover:bg-[#D65C66]/15 text-[#D65C66] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Leave Guild
                      </button>

                      {guildDetails.guild.myRole === 'leader' && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmState({
                              kind: 'disband',
                              guildId: guildDetails.guild.id,
                              guildName: guildDetails.guild.name,
                            })
                          }
                          className="lq-btn px-3.5 py-2 rounded-xl bg-[#D65C66] hover:brightness-110 text-[#100D18] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Disband
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {loadingDetails || !guildDetails ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 lq-surface rounded-2xl text-xs text-[#A69AAF]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#D6A84B]" />
                    <span>Loading guild roster and challenges...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Guild Summary Header */}
                    <div className="lq-card rounded-2xl p-6 space-y-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-[#100D18] border border-[#D6A84B]/45 flex items-center justify-center shrink-0">
                            {renderGuildEmblem(guildDetails.guild.emblem, 'w-7 h-7 text-[#E8C777]')}
                          </div>
                          <div>
                            <h2 className="font-['Cinzel'] font-bold text-xl text-[#F2EDF7]">
                              {guildDetails.guild.name}
                            </h2>
                            <p className="text-xs text-[#E8C777] mt-0.5 tabular-nums flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold">[{guildDetails.guild.tag}]</span>
                              <span aria-hidden="true" className="text-[#766D82]">·</span>
                              <span>Guild Lv.{guildDetails.guild.level}</span>
                              <span aria-hidden="true" className="text-[#766D82]">·</span>
                              <span>{(guildDetails.guild.guildXp || 0).toLocaleString()} Guild XP</span>
                              <span aria-hidden="true" className="text-[#766D82]">·</span>
                              <span className="inline-flex items-center gap-1 text-[#A69AAF]">
                                {guildDetails.guild.isPublic !== false ? (
                                  <>
                                    <Globe className="w-3 h-3 text-[#9A72CC]" /> Public
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-[#E8C777]" /> Private
                                  </>
                                )}
                              </span>
                              <span aria-hidden="true" className="text-[#766D82]">·</span>
                              <span className="text-[#A69AAF]">Min Lv.{guildDetails.guild.minLevel || 1}</span>
                            </p>
                            {guildDetails.guild.description && (
                              <p className="text-xs text-[#A69AAF] mt-2 max-w-2xl leading-relaxed">
                                {guildDetails.guild.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 tabular-nums">
                          <span className="text-[11px] text-[#A69AAF] block">Roster Capacity</span>
                          <span className="text-lg font-mono font-bold text-[#F2EDF7]">
                            {guildDetails.guild.membersCount} / {guildDetails.guild.maxMembers}
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const totalGxp = guildDetails.guild.guildXp || 0;
                        const levelFloor = (guildDetails.guild.level - 1) * 1000;
                        const levelPct = Math.min(100, Math.round(((totalGxp - levelFloor) / 1000) * 100));
                        return (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-[#A69AAF] tabular-nums">
                              <span>Guild Level Progression</span>
                              <span className="font-mono">{Math.max(0, totalGxp - levelFloor)} / 1,000 XP to next level</span>
                            </div>
                            <AnimatedProgressBar
                              percentage={Math.max(0, levelPct)}
                              className="w-full h-2 bg-[#100D18] rounded-full overflow-hidden border border-[#362B45]"
                              barClassName="bg-gradient-to-r from-[#7045A0] to-[#D6A84B]"
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Challenges + Roster Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Roster */}
                      <div className="lg:col-span-2 lq-surface rounded-2xl p-5 space-y-4">
                        <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#D6A84B]" />
                          Guild Roster ({guildDetails.members.length})
                        </h3>

                        {guildDetails.members.length === 0 ? (
                          <p className="text-xs text-[#A69AAF] py-6 text-center">No members in this guild.</p>
                        ) : (
                          <div className="divide-y divide-[#362B45]">
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
                                      className="relative shrink-0 cursor-pointer"
                                    >
                                      <img
                                        src={getRpgAvatarForClass(member.characterClass)}
                                        alt={member.username}
                                        className="w-10 h-10 rounded-xl object-cover object-top border border-[#7045A0]"
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
                                          className="text-sm font-bold text-[#F2EDF7] hover:text-[#E8C777] truncate transition-colors cursor-pointer"
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
                                              ? 'text-[#E8C777]'
                                              : member.role === 'officer'
                                              ? 'text-[#9A72CC]'
                                              : 'text-[#A69AAF]'
                                          }`}
                                        >
                                          {member.role}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#A69AAF] tabular-nums">
                                        Lv.{member.level} · {member.characterClass} ·{' '}
                                        <span className="text-[#F2EDF7] font-mono">
                                          {member.weeklyContribution} contribution
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  {canManage && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {myRole === 'leader' && member.role === 'member' && (
                                        <button
                                          type="button"
                                          disabled={isSubmitting}
                                          onClick={() => handleMemberRoleChange(member.userId, 'promote')}
                                          className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                          title="Promote to Officer"
                                        >
                                          <ChevronUp className="w-3 h-3 text-[#9A72CC]" />
                                          Promote
                                        </button>
                                      )}
                                      {myRole === 'leader' && member.role === 'officer' && (
                                        <button
                                          type="button"
                                          disabled={isSubmitting}
                                          onClick={() => handleMemberRoleChange(member.userId, 'demote')}
                                          className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                          Demote
                                        </button>
                                      )}
                                      {myRole === 'leader' && (
                                        <button
                                          type="button"
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
                                          className="lq-btn px-2.5 py-1 rounded-lg bg-[#100D18] border border-[#D6A84B]/40 hover:border-[#E8C777] text-[#E8C777] text-[11px] font-medium whitespace-nowrap cursor-pointer"
                                        >
                                          Make Leader
                                        </button>
                                      )}
                                      <button
                                        type="button"
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
                                        className="px-2.5 py-1 rounded-lg text-[#D65C66] hover:bg-[#D65C66]/12 text-[11px] font-medium cursor-pointer"
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
                        <div className="lq-surface rounded-2xl p-5 space-y-4">
                          <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#D6A84B]" />
                            Guild Challenges
                          </h3>

                          {guildDetails.challenges.length === 0 ? (
                            <p className="text-xs text-[#A69AAF]">
                              No challenges recorded yet. Complete workouts, habits, or boss battles to contribute.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {guildDetails.challenges.map(ch => {
                                const pct = Math.min(100, Math.round((ch.currentValue / Math.max(1, ch.targetValue)) * 100));
                                return (
                                  <div key={ch.id} className="p-3 rounded-xl bg-[#100D18] border border-[#362B45] space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-xs font-semibold text-[#F2EDF7]">{ch.title}</span>
                                      <span className="text-[11px] font-mono text-[#E8C777] tabular-nums shrink-0">
                                        {pct}%
                                      </span>
                                    </div>
                                    <AnimatedProgressBar
                                      percentage={pct}
                                      className="w-full h-1.5 bg-[#171220] rounded-full overflow-hidden border border-[#362B45]"
                                      barClassName="bg-gradient-to-r from-[#7045A0] to-[#D6A84B]"
                                      shimmer={false}
                                    />
                                    <div className="flex items-center justify-between text-[11px] text-[#A69AAF] tabular-nums">
                                      <span className="font-mono">
                                        {ch.currentValue.toLocaleString()} / {ch.targetValue.toLocaleString()}
                                      </span>
                                      <span className="text-[#E8C777] font-mono">
                                        +{ch.rewardGold}G · +{ch.rewardPlayerXp}XP
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Join Requests Queue */}
                        {(guildDetails.guild.myRole === 'leader' || guildDetails.guild.myRole === 'officer') && (
                          <div className="lq-surface rounded-2xl p-5 space-y-3">
                            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">
                              Join Requests ({guildDetails.joinRequests.length})
                            </h3>
                            {guildDetails.joinRequests.length === 0 ? (
                              <p className="text-xs text-[#766D82]">No pending join applications.</p>
                            ) : (
                              <div className="space-y-2.5">
                                {guildDetails.joinRequests.map(req => (
                                  <div
                                    key={req.id}
                                    className="p-3 rounded-xl bg-[#100D18] border border-[#362B45] space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openPublicProfile(req.userId)}
                                        className="text-xs font-bold text-[#F2EDF7] hover:text-[#E8C777] truncate cursor-pointer"
                                      >
                                        {req.username}
                                      </button>
                                      <span className="text-[11px] text-[#A69AAF] tabular-nums shrink-0 font-mono">
                                        Lv.{req.level} {req.characterClass}
                                      </span>
                                    </div>
                                    {req.message && (
                                      <p className="text-[11px] text-[#A69AAF]">{req.message}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => handleRespondRequest(req.id, true)}
                                        className="lq-btn flex-1 py-1.5 rounded-lg bg-[#49B88A] hover:brightness-110 text-[#100D18] text-[11px] font-bold cursor-pointer"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => handleRespondRequest(req.id, false)}
                                        className="lq-btn lq-btn-secondary flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
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

                        {/* Invite Players */}
                        {(guildDetails.guild.myRole === 'leader' || guildDetails.guild.myRole === 'officer') && (
                          <div className="lq-surface rounded-2xl p-5 space-y-3">
                            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] flex items-center gap-1.5">
                              <UserPlus className="w-4 h-4 text-[#D6A84B]" />
                              Invite Players
                            </h3>

                            <form onSubmit={handleSearchInviteCandidates} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={inviteQuery}
                                onChange={e => setInviteQuery(e.target.value)}
                                placeholder="Search username..."
                                className="lq-input flex-1 min-w-0 px-3 py-1.5 text-xs"
                              />
                              <button
                                type="submit"
                                disabled={searchingInvites}
                                className="lq-btn lq-btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </button>
                            </form>

                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {inviteResults.length > 0
                                ? inviteResults.map(c => (
                                    <div
                                      key={c.id}
                                      className="p-2.5 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-[#F2EDF7] truncate">{c.username}</p>
                                        <p className="text-[11px] text-[#A69AAF] tabular-nums">
                                          Lv.{c.level} {c.characterClass}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isSubmitting || Boolean(c.guildId)}
                                        onClick={() => handleSendInvite(c.id, c.username)}
                                        className="lq-btn lq-btn-primary px-2.5 py-1 rounded-lg disabled:opacity-45 text-[11px] font-semibold shrink-0 cursor-pointer"
                                      >
                                        {c.guildId ? 'In Guild' : 'Invite'}
                                      </button>
                                    </div>
                                  ))
                                : acceptedFriends.map(f => (
                                    <div
                                      key={f.friendshipId}
                                      className="p-2.5 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-[#F2EDF7] truncate">{f.champion.username}</p>
                                        <p className="text-[11px] text-[#A69AAF] tabular-nums">
                                          Friend · Lv.{f.champion.level}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => handleSendInvite(f.champion.id, f.champion.username)}
                                        className="lq-btn lq-btn-primary px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer"
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
                  <div className="lq-surface flex items-center gap-3 rounded-2xl p-4">
                    <Search className="w-4 h-4 text-[#E8C777] shrink-0" />
                    <input
                      type="text"
                      value={directorySearch}
                      onChange={e => setDirectorySearch(e.target.value)}
                      placeholder="Filter guilds by name, tag, or focus..."
                      className="flex-1 bg-transparent text-xs text-[#F2EDF7] placeholder-[#766D82] focus:outline-none"
                    />
                  </div>
                )}

                {guilds.length === 0 ? (
                  <div className="lq-surface p-12 rounded-2xl text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#100D18] border border-[#D6A84B]/45 flex items-center justify-center mx-auto text-[#D6A84B]">
                      <Shield className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="font-['Cinzel'] font-bold text-lg text-[#F2EDF7]">
                        No Guilds Founded Yet
                      </h2>
                      <p className="text-xs sm:text-sm text-[#A69AAF] max-w-md mx-auto">
                        No guilds have been founded yet. Be the first to establish one!
                      </p>
                    </div>
                    {unifiedBackendReady && (
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="lq-btn lq-btn-gold px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Create Guild
                      </button>
                    )}
                  </div>
                ) : filteredGuilds.length === 0 ? (
                  <div className="lq-surface p-10 rounded-2xl text-center text-xs text-[#A69AAF]">
                    No guilds match "{directorySearch}".
                  </div>
                ) : (
                  <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredGuilds.map(guild => {
                      const progressPercent = Math.min(
                        100,
                        Math.round((guild.weeklyQuestProgress / Math.max(1, guild.weeklyQuestMax)) * 100)
                      );
                      const isPrivate = guild.isPublic === false;
                      const meetsMinLevel = stats.level >= (guild.minLevel || 1);

                      return (
                        <RpgStaggerItem key={guild.id}>
                          <div
                            className={`p-6 rounded-2xl h-full flex flex-col justify-between transition-all ${
                              guild.isMember ? 'lq-card-gold' : 'lq-card lq-card-interactive'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-11 h-11 rounded-xl bg-[#100D18] flex items-center justify-center border border-[#362B45] shrink-0">
                                    {renderGuildEmblem(guild.emblem, 'w-5 h-5 text-[#E8C777]')}
                                  </div>
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedGuildId(guild.id)}
                                      className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] hover:text-[#E8C777] truncate block text-left transition-colors cursor-pointer"
                                    >
                                      {guild.name}
                                    </button>
                                    <p className="text-[11px] text-[#A69AAF] tabular-nums mt-0.5">
                                      <span className="font-mono font-bold text-[#E8C777]">[{guild.tag}]</span>
                                      {' · '}Lv.{guild.level}
                                      {' · '}
                                      {isPrivate ? 'Private' : 'Public'}
                                      {(guild.minLevel || 1) > 1 ? ` · Min Lv.${guild.minLevel}` : ''}
                                    </p>
                                  </div>
                                </div>

                                {guild.isMember && (
                                  <span className="text-[11px] font-semibold text-[#49B88A] shrink-0">
                                    Joined ({guild.myRole || 'member'})
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#A69AAF] leading-relaxed mb-4 line-clamp-2">
                                {guild.description || 'Active player-led fellowship.'}
                              </p>

                              {/* Raid Quest Progress */}
                              <div className="bg-[#100D18] p-3.5 rounded-xl border border-[#362B45] space-y-2 mb-4">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[11px] text-[#E8C777] font-semibold">
                                    Weekly Guild Challenge
                                  </span>
                                  <span className="text-[11px] text-[#E8C777] font-mono font-bold tabular-nums">
                                    {progressPercent}%
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-[#F2EDF7] truncate">
                                  {guild.weeklyQuestName}
                                </p>
                                <AnimatedProgressBar
                                  percentage={progressPercent}
                                  className="w-full bg-[#171220] h-2 rounded-full overflow-hidden border border-[#362B45]"
                                  barClassName="bg-gradient-to-r from-[#7045A0] to-[#D6A84B]"
                                  shimmer={false}
                                />
                                <div className="text-[11px] text-[#A69AAF] flex justify-between font-mono tabular-nums">
                                  <span>Progress</span>
                                  <span>
                                    {guild.weeklyQuestProgress.toLocaleString()} /{' '}
                                    {guild.weeklyQuestMax.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-[#362B45] flex items-center justify-between gap-2">
                              <span className="text-xs text-[#A69AAF] font-mono tabular-nums">
                                {guild.membersCount} / {guild.maxMembers} Members
                              </span>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedGuildId(guild.id)}
                                  className="lq-btn lq-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
                                >
                                  {guild.isMember ? 'Manage' : 'Inspect'}
                                </button>

                                {!guild.isMember && !myGuild && (
                                  isPrivate ? (
                                    guild.hasPendingRequest ? (
                                      <span className="px-3 py-2 rounded-xl bg-[#100D18] border border-[#362B45] text-[#A69AAF] text-xs font-semibold whitespace-nowrap">
                                        Requested
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={!meetsMinLevel || isSubmitting}
                                        onClick={() => setRequestModalGuildId(guild.id)}
                                        className="lq-btn lq-btn-primary px-3.5 py-2 rounded-xl disabled:opacity-45 text-xs font-semibold whitespace-nowrap cursor-pointer"
                                      >
                                        Request Join
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!meetsMinLevel || isSubmitting}
                                      onClick={() => handleJoinPublic(guild.id)}
                                      className="lq-btn lq-btn-primary px-3.5 py-2 rounded-xl disabled:opacity-45 text-xs font-semibold whitespace-nowrap cursor-pointer"
                                    >
                                      Join
                                    </button>
                                  )
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
          </div>
        )}
      </RpgSubTabTransition>

      {/* Create Guild Modal */}
      <RpgModalWrapper
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        panelClassName="w-full max-w-lg"
      >
        <div className="lq-surface-elevated rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-bold font-['Cinzel'] text-[#F2EDF7] mb-4">
            Establish a Guild
          </h3>
          <form onSubmit={handleCreateGuild} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-medium text-[#A69AAF] mb-1">Guild Name</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={60}
                  value={guildName}
                  onChange={e => setGuildName(e.target.value)}
                  placeholder="e.g. Iron Vanguard"
                  className="lq-input w-full px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Tag (2–4 chars)</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={4}
                  value={guildTag}
                  onChange={e => setGuildTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="IRON"
                  className="lq-input w-full px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#A69AAF] mb-1">Guild Charter</label>
              <textarea
                value={guildDesc}
                onChange={e => setGuildDesc(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Describe your guild's fitness routines and goals..."
                className="lq-input w-full px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-medium text-[#A69AAF] mb-1.5">Guild Emblem</label>
              <div className="flex flex-wrap gap-2">
                {EMBLEM_OPTIONS.map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setGuildEmblem(opt.id)}
                    className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      guildEmblem === opt.id
                        ? 'bg-[#7045A0] border-[#E8C777]/50 text-[#F2EDF7]'
                        : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                    }`}
                  >
                    <opt.Icon className="w-3.5 h-3.5 text-[#E8C777]" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Membership Type</label>
                <select
                  value={guildPublic ? 'public' : 'private'}
                  onChange={e => setGuildPublic(e.target.value === 'public')}
                  className="lq-input w-full px-3 py-2"
                >
                  <option value="public">Public (Anyone can join)</option>
                  <option value="private">Private (Requires approval)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Minimum Level</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={guildMinLevel}
                  onChange={e => setGuildMinLevel(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="lq-input w-full px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="lq-btn lq-btn-gold px-5 py-2 font-bold font-['Cinzel'] rounded-xl cursor-pointer"
              >
                {isSubmitting ? 'Creating...' : 'Found Guild'}
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>

      {/* Request Join Private Guild Modal */}
      <RpgModalWrapper
        isOpen={Boolean(requestModalGuildId)}
        onClose={() => setRequestModalGuildId(null)}
        panelClassName="w-full max-w-md"
      >
        <div className="lq-surface-elevated rounded-2xl p-6">
          <h3 className="text-base font-bold font-['Cinzel'] text-[#F2EDF7] mb-3">
            Request to Join Guild
          </h3>
          <form onSubmit={handleSubmitJoinRequest} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#A69AAF] mb-1">Message to Guild Officers (Optional)</label>
              <textarea
                value={requestNote}
                onChange={e => setRequestNote(e.target.value)}
                maxLength={240}
                rows={3}
                placeholder="Share your workout focus or why you'd like to join..."
                className="lq-input w-full px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestModalGuildId(null)}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="lq-btn lq-btn-primary px-4 py-2 rounded-xl font-semibold cursor-pointer"
              >
                Send Request
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>

      {/* Create Challenge Modal */}
      <RpgModalWrapper
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        panelClassName="w-full max-w-md"
      >
        <div className="lq-surface-elevated rounded-2xl p-6">
          <h3 className="text-base font-bold font-['Cinzel'] text-[#F2EDF7] mb-4">
            Set Weekly Guild Challenge
          </h3>
          <form onSubmit={handleCreateChallenge} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#A69AAF] mb-1">Challenge Title</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={challengeTitle}
                onChange={e => setChallengeTitle(e.target.value)}
                placeholder="e.g. 1,000 Verified Squad Reps"
                className="lq-input w-full px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[#A69AAF] mb-1">Target</label>
                <input
                  type="number"
                  min={100}
                  max={50000}
                  value={challengeTarget}
                  onChange={e => setChallengeTarget(Number(e.target.value) || 500)}
                  className="lq-input w-full px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-[#A69AAF] mb-1">Gold Reward</label>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={challengeRewardGold}
                  onChange={e => setChallengeRewardGold(Number(e.target.value) || 100)}
                  className="lq-input w-full px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-[#A69AAF] mb-1">XP Reward</label>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={challengeRewardXp}
                  onChange={e => setChallengeRewardXp(Number(e.target.value) || 80)}
                  className="lq-input w-full px-3 py-2 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowChallengeModal(false)}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="lq-btn lq-btn-gold px-4 py-2 rounded-xl font-semibold cursor-pointer"
              >
                Publish Challenge
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>

      {/* Edit Guild Settings Modal */}
      <RpgModalWrapper
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        panelClassName="w-full max-w-md"
      >
        <div className="lq-surface-elevated rounded-2xl p-6">
          <h3 className="text-base font-bold font-['Cinzel'] text-[#F2EDF7] mb-4">
            Guild Settings
          </h3>
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#A69AAF] mb-1">Charter Description</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={3}
                maxLength={300}
                className="lq-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[#A69AAF] mb-1">Weekly Focus Name</label>
              <input
                type="text"
                value={editQuestName}
                onChange={e => setEditQuestName(e.target.value)}
                maxLength={120}
                className="lq-input w-full px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#A69AAF] mb-1">Visibility</label>
                <select
                  value={editPublic ? 'public' : 'private'}
                  onChange={e => setEditPublic(e.target.value === 'public')}
                  className="lq-input w-full px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-[#A69AAF] mb-1">Min Level</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editMinLevel}
                  onChange={e => setEditMinLevel(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="lq-input w-full px-3 py-2 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#A69AAF] mb-1">Emblem</label>
              <select
                value={editEmblem}
                onChange={e => setEditEmblem(e.target.value)}
                className="lq-input w-full px-3 py-2"
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
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="lq-btn lq-btn-gold px-4 py-2 rounded-xl font-semibold cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>

      {/* Destructive Confirmation Dialog */}
      <RpgModalWrapper
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        panelClassName="w-full max-w-sm"
      >
        {confirmState && (
          <div className="lq-surface-elevated border border-[#D65C66]/45 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#D65C66]">
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
            <p className="text-xs text-[#A69AAF] leading-relaxed">
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
                type="button"
                onClick={() => setConfirmState(null)}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeConfirmedAction}
                className="lq-btn px-4 py-2 rounded-xl bg-[#D65C66] hover:brightness-110 text-[#100D18] text-xs font-bold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </RpgModalWrapper>
    </div>
  );
};
