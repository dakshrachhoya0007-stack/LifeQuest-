import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { territoryAetheriaMapImg } from '../../assets/images';
import type { TerritoryMissionStance } from '../../types/game';
import {
  Castle,
  Crown,
  History,
  MapPin,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';

export const TerritoryWarsView: React.FC = () => {
  const {
    user,
    guilds,
    territoryWarsState,
    refreshTerritoryWars,
    registerGuildTerritoryWar,
    selectTerritoryMission,
  } = useGame();

  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('ter_obsidian_mountains');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshTerritoryWars();
  }, []);

  useEffect(() => {
    if (territoryWarsState?.playerStatus?.selectedTerritoryId) {
      setSelectedTerritoryId(territoryWarsState.playerStatus.selectedTerritoryId);
    }
  }, [territoryWarsState?.playerStatus?.selectedTerritoryId]);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const myGuild = guilds.find(g => g.isMember) || null;
  const territories = territoryWarsState?.territories || [];
  const activeTerritory =
    territories.find(t => t.id === selectedTerritoryId) || territories[0] || null;
  const playerStatus = territoryWarsState?.playerStatus;

  const handleRegisterGuild = async () => {
    if (!myGuild) {
      flash('error', 'Join or create a Guild before entering Territory Wars.');
      return;
    }
    setBusyAction('register');
    const res = await registerGuildTerritoryWar(
      myGuild.id,
      myGuild.name,
      myGuild.tag || myGuild.name.slice(0, 4).toUpperCase(),
      myGuild.membersCount || 1
    );
    setBusyAction(null);
    if (res.success) {
      flash('success', `${myGuild.name} registered for this Territory War campaign.`);
    } else {
      flash('error', res.error || 'Could not register guild.');
    }
  };

  const handleSelectMission = async (territoryId: string, stance: TerritoryMissionStance) => {
    setSelectedTerritoryId(territoryId);
    setBusyAction(`stance-${stance}`);
    const res = await selectTerritoryMission(territoryId, stance);
    setBusyAction(null);
    if (res.success) {
      flash('success', `Active war orders updated: ${stance} campaign in selected territory.`);
    } else {
      flash('error', res.error || 'Could not update territory stance.');
    }
  };

  const regionTopGuilds = activeTerritory
    ? Object.values(activeTerritory.guildScores || {})
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Campaign Banner */}
      <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#FB7185]/25 shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
            <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#FB7185]">
              Guild vs Guild 2D Campaign
            </span>
            <span className="text-[#A1A1B8]/45" aria-hidden="true">·</span>
            <span className="text-[#A1A1B8] tabular-nums">
              Min Guild Size: {territoryWarsState?.campaign.minGuildMembers ?? 2}
            </span>
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-white">
            {territoryWarsState?.campaign.title || 'WAR FOR AETHERIA'}
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl mt-1">
            Earn guild territory points purely through verified workouts, healthy habits, and cooperative challenges. Choose an Aetheria region and stance on the 2D tactical map.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-[#0E0E17] border border-white/10 text-xs">
            <span className="text-[#A1A1B8]">Daily Contribution: </span>
            <span className="font-mono font-bold text-[#D6A84B] tabular-nums">
              {playerStatus?.dailyPointsToday || 0} / {playerStatus?.dailyPointsCap || 250}
            </span>
          </div>

          {myGuild && !playerStatus?.eligible && (
            <button
              type="button"
              disabled={busyAction === 'register'}
              onClick={() => void handleRegisterGuild()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#BE123C] to-[#FB7185] hover:from-[#E11D48] hover:to-[#FDA4AF] text-white shadow-[0_0_16px_rgba(251,113,133,0.35)] text-xs font-bold whitespace-nowrap shrink-0 transition-all"
            >
              <Castle className="w-4 h-4 shrink-0" />
              <span>{busyAction === 'register' ? 'Enlisting...' : `Enlist [${myGuild.tag || 'GUILD'}]`}</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl border text-xs font-semibold ${
            notice.type === 'success'
              ? 'bg-[#34D399]/10 border-[#34D399]/40 text-[#34D399]'
              : 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[#FB7185]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {!playerStatus?.eligible && (
        <div className="rounded-xl bg-[#0E0E17] border border-white/15 px-4 py-3 text-xs text-[#A1A1B8] flex flex-wrap items-center justify-between gap-3">
          <span>
            {playerStatus?.eligibilityReason ||
              'Join an eligible Guild to contribute points and unlock bonus territory cosmetics.'}
          </span>
          {myGuild && (
            <button
              type="button"
              onClick={() => void handleRegisterGuild()}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#BE123C] to-[#FB7185] hover:from-[#E11D48] hover:to-[#FDA4AF] text-white shadow-[0_0_14px_rgba(251,113,133,0.3)] font-bold text-xs whitespace-nowrap shrink-0 transition-all"
            >
              Register Guild Now
            </button>
          )}
        </div>
      )}

      {/* 2D Interactive Tactical Map + Region Orders Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-4">
          <div className="flex items-center justify-between gap-2 mb-3 text-xs">
            <span className="font-['Cinzel'] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D6A84B]" />
              2D Tactical Map of Aetheria
            </span>
            <span className="text-[#A1A1B8]">Click a region node to inspect &amp; deploy</span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-white/15 bg-[#090910]">
            <img
              src={territoryAetheriaMapImg}
              alt="2D Fantasy Map of Aetheria"
              className="absolute inset-0 w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090910]/85 via-transparent to-[#090910]/35" />

            {/* 2D SVG Tactical Overlay */}
            <svg
              viewBox="0 0 100 62.5"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              {territories.slice(0, -1).map((t, i) => {
                const next = territories[i + 1];
                return (
                  <line
                    key={`${t.id}-${next.id}`}
                    x1={t.mapX}
                    y1={(t.mapY * 62.5) / 100}
                    x2={next.mapX}
                    y2={(next.mapY * 62.5) / 100}
                    stroke="rgba(214, 168, 75, 0.5)"
                    strokeWidth="0.35"
                    strokeDasharray="1 1"
                  />
                );
              })}
            </svg>

            {/* Interactive Region Pins */}
            {territories.map(territory => {
              const isSelected = activeTerritory?.id === territory.id;
              const isPlayerAssigned = playerStatus?.selectedTerritoryId === territory.id;
              return (
                <button
                  key={territory.id}
                  type="button"
                  onClick={() => setSelectedTerritoryId(territory.id)}
                  style={{ left: `${territory.mapX}%`, top: `${territory.mapY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl border text-left transition-all shadow-lg ${
                    isSelected
                      ? 'bg-[#141420]/95 border-[#D6A84B] shadow-[0_0_16px_rgba(214,168,75,0.35)] scale-105 z-20'
                      : 'bg-[#0E0E17]/90 border-white/20 hover:border-[#D6A84B]/80 z-10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isPlayerAssigned ? 'bg-[#34D399]' : 'bg-[#FB7185]'
                      }`}
                    />
                    <span className="text-[11px] font-['Cinzel'] font-bold text-white whitespace-nowrap">
                      {territory.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#D6A84B]/90 font-mono tabular-nums mt-0.5 whitespace-nowrap">
                    {territory.ownerGuildTag ? `[${territory.ownerGuildTag}]` : 'Unclaimed'} · {territory.totalPoints} pts
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Region Details & Stance Selector */}
        <div className="xl:col-span-5 rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-5 flex flex-col justify-between gap-4">
          {activeTerritory ? (
            <>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#D6A84B]">
                      {activeTerritory.subtitle}
                    </div>
                    <h3 className="text-xl font-black font-['Cinzel'] text-white">
                      {activeTerritory.name}
                    </h3>
                  </div>
                  <div className="text-right text-xs font-mono text-[#D6A84B] tabular-nums shrink-0">
                    {activeTerritory.totalPoints} pts
                  </div>
                </div>

                <div className="rounded-xl bg-[#0E0E17] border border-white/10 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#A1A1B8]">Controlling Guild</span>
                    <span className="font-bold text-white">
                      {activeTerritory.ownerGuildName
                        ? `[${activeTerritory.ownerGuildTag}] ${activeTerritory.ownerGuildName}`
                        : 'Contested Frontier'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#A1A1B8]">Conquest Reward</span>
                    <span className="text-[#D6A84B] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {activeTerritory.bonusCosmeticName}
                    </span>
                  </div>
                </div>

                {/* Stance Selection */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#A1A1B8]">
                    Deploy Personal War Stance
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleSelectMission(activeTerritory.id, 'offensive')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                        playerStatus?.selectedTerritoryId === activeTerritory.id &&
                        playerStatus?.selectedStance === 'offensive'
                          ? 'bg-[#FB7185]/15 border-[#FB7185] text-[#FB7185] shadow-[0_0_12px_rgba(251,113,133,0.25)]'
                          : 'bg-[#0E0E17] border-white/15 text-[#A1A1B8] hover:text-white hover:border-[#FB7185]/50'
                      }`}
                    >
                      <Swords className="w-4 h-4 shrink-0" />
                      <span>Offensive Push</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleSelectMission(activeTerritory.id, 'defensive')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                        playerStatus?.selectedTerritoryId === activeTerritory.id &&
                        playerStatus?.selectedStance === 'defensive'
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                          : 'bg-[#0E0E17] border-white/15 text-[#A1A1B8] hover:text-white hover:border-[#8B5CF6]/50'
                      }`}
                    >
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Defensive Hold</span>
                    </button>
                  </div>
                </div>

                {/* Region Guild Leaderboard */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-[#A1A1B8]">
                    Regional Guild Standings
                  </div>
                  {regionTopGuilds.length === 0 ? (
                    <p className="text-xs text-[#A1A1B8]/75">No verified guild points scored in this sector yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {regionTopGuilds.map((gs, idx) => (
                        <div
                          key={gs.guildId}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0E0E17] border border-white/10 text-xs"
                        >
                          <span className="font-semibold text-white">
                            #{idx + 1} [{gs.guildTag}] {gs.guildName}
                          </span>
                          <span className="font-mono text-[#D6A84B] tabular-nums">{gs.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Campaign Standings & Past History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-5">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#D6A84B] mb-3">
            <Crown className="w-4 h-4" />
            <span>Overall Guild Campaign Standings</span>
          </div>
          {(territoryWarsState?.standings || []).length === 0 ? (
            <p className="text-xs text-[#A1A1B8]/75">No guilds have scored points yet in this campaign.</p>
          ) : (
            <div className="space-y-2">
              {territoryWarsState?.standings.map(row => (
                <div
                  key={row.guildId}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#0E0E17] border border-white/10 hover:border-[#D6A84B]/45 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-[#D6A84B] tabular-nums">#{row.rank}</span>
                    <span className="font-bold text-white truncate">
                      [{row.guildTag}] {row.guildName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[#A1A1B8] font-mono tabular-nums shrink-0">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {row.contributorsCount}
                    </span>
                    <span>{row.territoriesControlled} Sectors</span>
                    <span className="text-[#D6A84B] font-bold">{row.totalPoints} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-5">
          <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#8B5CF6] mb-3">
            <History className="w-4 h-4" />
            <span>Past Territory Conquests</span>
          </div>
          {(territoryWarsState?.history || []).length === 0 ? (
            <p className="text-xs text-[#A1A1B8]/75">Resolved campaign records will appear here at season end.</p>
          ) : (
            <div className="space-y-2">
              {territoryWarsState?.history.map(h => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#0E0E17] border border-white/10 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{h.territoryName}</div>
                    <div className="text-[11px] text-[#A1A1B8]">
                      {h.winningGuildName ? `Captured by [${h.winningGuildTag}] ${h.winningGuildName}` : 'Unclaimed'}
                    </div>
                  </div>
                  <span className="font-mono text-[#D6A84B] tabular-nums">{h.totalPoints} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
