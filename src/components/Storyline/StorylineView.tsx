import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { resolveAssetUrl } from '../../assets/images';
import {
  CAMPAIGN_CHAPTERS,
  FALLEN_KNIGHT_OPENING_MONOLOGUE,
  RECLAIM_HONOR_OBJECTIVES,
} from '../../data/campaignData';
import { getHeroById } from '../../data/heroesData';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Compass,
  Crown,
  Lock,
  MessageSquareQuote,
  Shield,
  Sparkles,
  Swords,
} from 'lucide-react';

export const StorylineView: React.FC = () => {
  const {
    kingdoms,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    campaignProgress,
    evaluateChapterRequirements,
    claimCampaignChapterReward,
    reclaimHonorQuest,
    claimReclaimHonorReward,
    setActiveTab,
  } = useGame();

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingHonor, setClaimingHonor] = useState(false);
  const [chapterFeedback, setChapterFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const heroDef = getHeroById(selectedHeroId);
  const honorDoneCount = Object.values(reclaimHonorQuest.objectives).filter(Boolean).length;
  const honorTotalCount = RECLAIM_HONOR_OBJECTIVES.length;

  const handleClaimHonor = async () => {
    if (claimingHonor) return;
    setClaimingHonor(true);
    setChapterFeedback(null);
    const res = await claimReclaimHonorReward();
    setClaimingHonor(false);
    if (res.success) {
      setChapterFeedback({
        type: 'success',
        text: 'Honor Reclaimed! +120 Player XP, +75 Forge XP & +100 Gold granted.',
      });
    } else if (res.error) {
      setChapterFeedback({ type: 'error', text: res.error });
    }
  };

  const handleClaimChapter = async (chapterId: string) => {
    if (claimingId) return;
    setClaimingId(chapterId);
    setChapterFeedback(null);
    const res = await claimCampaignChapterReward(chapterId);
    setClaimingId(null);
    if (res.success) {
      setChapterFeedback({
        type: 'success',
        text: 'Chapter completed! Aetheria Citadel restoration advanced and milestone rewards granted.',
      });
    } else if (res.error) {
      setChapterFeedback({ type: 'error', text: res.error });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* 1. Opening Lore Monologue Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#19102e] via-[#100D19] to-[#201233] border border-[#C5A15A]/35 p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="font-['Cinzel'] font-bold text-[11px] uppercase tracking-widest text-[#C5A15A] block mb-1">
              Main Story Campaign · The Fallen Knight: Rise of Aetheria
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#D9D2C5]">
              THE GREAT FALL &amp; THE CHRONICLES OF AETHERIA
            </h1>
          </div>

          {heroLocked ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#251638] border border-[#C5A15A]/40 text-xs font-bold font-['Cinzel'] text-[#C5A15A] shrink-0">
              <Lock className="w-3.5 h-3.5" />
              Hero Oath: {heroDef.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowHeroSelectModal(true)}
              className="px-4 py-2 rounded-xl bg-[#251638] hover:bg-[#7046A5]/45 border border-[#C5A15A]/40 text-xs font-bold font-['Cinzel'] text-[#C5A15A] shrink-0 transition-colors"
            >
              Hero Path: {heroDef.name}
            </button>
          )}
        </div>

        {/* Canonical Great Fall Opening Quote */}
        <blockquote className="p-4 sm:p-5 rounded-xl bg-[#0b0813] border border-[#C5A15A]/25 text-xs sm:text-sm text-[#D9D2C5]/90 leading-relaxed whitespace-pre-line font-serif italic">
          {FALLEN_KNIGHT_OPENING_MONOLOGUE}
        </blockquote>

        {/* Selected Hero's Personal Origin Thread */}
        <div className="p-4 rounded-xl bg-[#161124] border border-[#7046A5]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#C5A15A] font-bold block">
              Your Hero Origin · {heroDef.name} ({heroDef.title})
            </span>
            <p className="text-xs text-[#D9D2C5]/80 leading-relaxed">
              {heroDef.greatFallOrigin}
            </p>
          </div>
          <span className="font-mono text-xs text-[#C5A15A] shrink-0">
            {campaignProgress.claimedChapterIds.length} / {CAMPAIGN_CHAPTERS.length} Chapters Complete
          </span>
        </div>
      </div>

      {chapterFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            chapterFeedback.type === 'error'
              ? 'bg-rose-950/70 border-rose-700 text-rose-200'
              : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
          }`}
        >
          {chapterFeedback.text}
        </div>
      )}

      {!reclaimHonorQuest.claimed && (
        <section
          aria-label="Reclaim Your Honor Introductory Quest"
          className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/40 p-5 sm:p-6 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C5A15A]/15 pb-3.5">
            <div>
              <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A] block">
                Starter Story Trial · Awakening Chapter
              </span>
              <h2 className="font-['Cinzel'] font-black text-lg text-[#D9D2C5] flex items-center gap-2 mt-0.5">
                <Shield className="w-4 h-4 text-[#C5A15A]" />
                RECLAIM YOUR HONOR
              </h2>
              <p className="text-xs text-[#D9D2C5]/70 mt-0.5">
                Complete each genuine realm action below to awaken your citadel oath and unlock your starter reward.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs font-bold text-[#C5A15A] tabular-nums">
                {honorDoneCount} / {honorTotalCount} Complete
              </span>
              {reclaimHonorQuest.completed && (
                <button
                  type="button"
                  disabled={claimingHonor}
                  onClick={handleClaimHonor}
                  className="px-4 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-black text-xs tracking-wider shadow-lg transition-colors"
                >
                  {claimingHonor ? 'CLAIMING...' : 'CLAIM STARTER REWARD'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {RECLAIM_HONOR_OBJECTIVES.map(obj => {
              const done = reclaimHonorQuest.objectives[obj.id];
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setActiveTab(obj.targetTab)}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    done
                      ? 'bg-[#171b24] border-emerald-600/50 text-[#D9D2C5]'
                      : 'bg-[#161124] border-[#C5A15A]/18 hover:border-[#C5A15A]/55 text-[#D9D2C5]'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#C5A15A]/60 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block ${done ? 'line-through text-[#D9D2C5]/60' : 'text-[#D9D2C5]'}`}>
                      {obj.label}
                    </span>
                    <span className="text-[10px] text-[#D9D2C5]/60 block mt-0.5 leading-snug">
                      {obj.hint}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="p-3 rounded-xl bg-[#181229] border border-[#7046A5]/45 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1">
                <Award className="w-3 h-3" /> Completion Reward
              </span>
              <div className="text-xs font-mono text-[#D9D2C5] mt-1 space-y-0.5">
                <div>+120 Player XP · +75 Forge XP</div>
                <div className="text-[#C5A15A]">+100 Gold · +2 DIS · +1 RES</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Five Story Chapters */}
      <section data-tutorial-id="story-campaign" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#D9D2C5] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#C5A15A]" />
            CAMPAIGN CHAPTERS (RISE OF AETHERIA)
          </h2>
          <span className="text-xs font-mono text-[#C5A15A]">
            Citadel Restoration: {Math.min(100, campaignProgress.claimedChapterIds.length * 20)}%
          </span>
        </div>

        <div className="space-y-4">
          {CAMPAIGN_CHAPTERS.map((ch, idx) => {
            const isClaimed = campaignProgress.claimedChapterIds.includes(ch.id);
            const prevChapterClaimed =
              idx === 0 || campaignProgress.claimedChapterIds.includes(CAMPAIGN_CHAPTERS[idx - 1].id);
            const isUnlocked = prevChapterClaimed || isClaimed;
            const reqEval = evaluateChapterRequirements(ch.id);

            return (
              <div
                key={ch.id}
                className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                  isClaimed
                    ? 'bg-[#10141c] border-emerald-700/50'
                    : isUnlocked
                    ? 'bg-[#100D19] border-[#C5A15A]/35 shadow-xl'
                    : 'bg-[#0b0812] border-[#C5A15A]/12 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A15A] block">
                      Chapter {ch.number} of 5 · +{ch.rewards.restorationPercent}% Restoration Target
                    </span>
                    <h3 className="font-['Cinzel'] font-black text-lg text-[#D9D2C5]">
                      {ch.title} — {ch.subtitle}
                    </h3>
                  </div>

                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1 rounded-lg self-start">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Chapter Completed
                    </span>
                  ) : isUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A15A] bg-[#251638] border border-[#C5A15A]/45 px-3 py-1 rounded-lg self-start">
                      <Compass className="w-3.5 h-3.5" />
                      Active Chapter
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-lg self-start">
                      <Lock className="w-3.5 h-3.5" />
                      Complete Chapter {ch.number - 1} First
                    </span>
                  )}
                </div>

                {/* Chapter Narrative & NPC Dialogue */}
                <p className="text-xs sm:text-sm text-[#D9D2C5]/85 leading-relaxed mb-3">
                  {ch.narrationIntro}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl bg-[#161124] border border-[#7046A5]/35 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                      {ch.npcSpeaker} · {ch.npcRole}
                    </span>
                    <p className="text-xs italic text-[#D9D2C5]/90 leading-relaxed">
                      {ch.npcDialogue}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#151021] border border-[#C5A15A]/20 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Lore Discovery
                    </span>
                    <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
                      {ch.loreDiscovery}
                    </p>
                  </div>
                </div>

                {/* Real-Life Connected Mission & Milestone Action */}
                <div className="p-4 rounded-xl bg-[#140f21] border border-[#C5A15A]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span className="text-xs font-bold text-[#D9D2C5]">
                        Mission: {ch.missionTitle}
                      </span>
                    </div>
                    <p className="text-xs text-[#D9D2C5]/70">{ch.missionSummary}</p>

                    {!isClaimed && isUnlocked && reqEval.missing.length > 0 && (
                      <p className="text-[11px] text-amber-300/90 pt-1">
                        Remaining: {reqEval.missing.join(' · ')}
                      </p>
                    )}

                    <div className="text-[11px] font-mono text-[#C5A15A] pt-1">
                      Reward: +{ch.rewards.playerXp} Player XP · +{ch.rewards.forgeXp} Forge XP · +{ch.rewards.gold} Gold
                    </div>
                  </div>

                  {isUnlocked && !isClaimed && (
                    <button
                      type="button"
                      disabled={!reqEval.met || claimingId === ch.id}
                      onClick={() => handleClaimChapter(ch.id)}
                      className={`px-5 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider shrink-0 transition-colors ${
                        reqEval.met
                          ? 'bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] shadow-lg'
                          : 'bg-[#251638] text-[#D9D2C5]/50 border border-[#7046A5]/30 cursor-not-allowed'
                      }`}
                    >
                      {claimingId === ch.id
                        ? 'CLAIMING...'
                        : reqEval.met
                        ? 'COMPLETE CHAPTER'
                        : 'IN PROGRESS'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. The Five Corrupted Kingdoms & Boss Liberation */}
      <section data-tutorial-id="kingdom-restoration" className="space-y-4">
        <div>
          <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#D9D2C5] flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#C5A15A]" />
            THE FIVE CORRUPTED KINGDOMS
          </h2>
          <p className="text-xs sm:text-sm text-[#D9D2C5]/70 mt-0.5">
            Push back the Void corruption across every province to liberate Aetheria and defeat each Void Sovereign.
          </p>
        </div>

        <div className="space-y-5">
          {kingdoms.map((kingdom, idx) => {
            const isUnlocked = kingdom.unlocked;
            const isCleared = kingdom.cleared;

            return (
              <div
                key={kingdom.id}
                className={`rounded-2xl border overflow-hidden transition-all shadow-xl ${
                  isCleared
                    ? 'bg-[#0b0816] border-emerald-900/70'
                    : isUnlocked
                    ? 'bg-[#100D19] border-[#C5A15A]/30'
                    : 'bg-[#080610] border-purple-950/40 opacity-75'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                  <div className="md:col-span-4 relative h-52 md:h-auto overflow-hidden">
                    <img
                      src={resolveAssetUrl(kingdom.boss.image)}
                      alt={kingdom.name}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover filter ${isUnlocked ? 'brightness-90' : 'grayscale brightness-50'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0e0a1b] via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 bg-[#100D19]/90 px-2.5 py-1 rounded text-[11px] font-bold text-[#C5A15A] border border-[#C5A15A]/40">
                      Kingdom {idx + 1} of 5
                    </div>
                  </div>

                  <div className="md:col-span-8 p-6 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                          Theme: {kingdom.theme}
                        </span>
                        {isCleared ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" /> CLEARED
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-700/60 px-2 py-0.5 rounded">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded">
                            <Lock className="w-3.5 h-3.5" /> LOCKED
                          </span>
                        )}
                      </div>

                      <h3 className="font-['Cinzel'] font-black text-xl text-white">{kingdom.name}</h3>
                      <p className="text-xs text-purple-300 font-medium mb-3">{kingdom.subtitle}</p>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {kingdom.description}
                      </p>

                      <div className="p-3 rounded-xl bg-[#130f24] border border-purple-950/80 text-xs italic text-slate-300 leading-relaxed">
                        "{kingdom.loreIntro}"
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-slate-400">Boss Sovereign: </span>
                        <strong className="text-white">{kingdom.boss.name}</strong>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => setActiveTab('boss-battles')}
                          className="px-5 py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-rose-700 hover:bg-rose-600 text-white shadow flex items-center gap-1.5 transition-colors"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          Challenge Boss
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">Defeat previous kingdom boss to unlock</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
