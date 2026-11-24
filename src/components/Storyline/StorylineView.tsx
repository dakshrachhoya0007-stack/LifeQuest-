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
  Dumbbell,
  Lock,
  MessageSquareQuote,
  Shield,
  Sparkles,
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
        text: 'Honor Reclaimed! +120 Player XP & +100 Gold granted.',
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
      <div className="rounded-2xl bg-gradient-to-br from-[#061225] via-[#0A1930] to-[#102440] border border-[#1677FF]/35 p-6 sm:p-8 shadow-[0_12px_32px_rgba(2,8,20,0.6)] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="font-['Cinzel'] font-bold text-[11px] uppercase tracking-widest text-[#00D9FF] block mb-1">
              Main Story Campaign · The Fallen Knight: Rise of Aetheria
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              THE GREAT FALL &amp; THE CHRONICLES OF AETHERIA
            </h1>
          </div>

          {heroLocked ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1930] border border-[#00D9FF]/45 text-xs font-bold font-['Cinzel'] text-[#00D9FF] shrink-0">
              <Lock className="w-3.5 h-3.5" />
              Hero Oath: {heroDef.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowHeroSelectModal(true)}
              className="px-4 py-2 rounded-xl bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/45 hover:border-[#00D9FF]/50 text-xs font-bold font-['Cinzel'] text-[#00D9FF] shrink-0 transition-all"
            >
              Hero Path: {heroDef.name}
            </button>
          )}
        </div>

        {/* Canonical Great Fall Opening Quote */}
        <blockquote className="p-4 sm:p-5 rounded-xl bg-[#061225] border border-[#1677FF]/30 text-xs sm:text-sm text-[#A9B8CC] leading-relaxed whitespace-pre-line font-serif italic">
          {FALLEN_KNIGHT_OPENING_MONOLOGUE}
        </blockquote>

        {/* Selected Hero's Personal Origin Thread */}
        <div className="p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#00D9FF] font-bold block">
              Your Hero Origin · {heroDef.name} ({heroDef.title})
            </span>
            <p className="text-xs text-[#A9B8CC] leading-relaxed">
              {heroDef.greatFallOrigin}
            </p>
          </div>
          <span className="font-mono text-xs text-[#00D9FF] shrink-0">
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
          className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/40 p-5 sm:p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)] space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1677FF]/25 pb-3.5">
            <div>
              <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF] block">
                Starter Story Trial · Awakening Chapter
              </span>
              <h2 className="font-['Cinzel'] font-black text-lg text-white flex items-center gap-2 mt-0.5">
                <Shield className="w-4 h-4 text-[#00D9FF]" />
                RECLAIM YOUR HONOR
              </h2>
              <p className="text-xs text-[#A9B8CC] mt-0.5">
                Complete each genuine realm action below to awaken your citadel oath and unlock your starter reward.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs font-bold text-[#00D9FF] tabular-nums">
                {honorDoneCount} / {honorTotalCount} Complete
              </span>
              {reclaimHonorQuest.completed && (
                <button
                  type="button"
                  disabled={claimingHonor}
                  onClick={handleClaimHonor}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white font-['Cinzel'] font-black text-xs tracking-wider shadow-[0_0_16px_rgba(22,119,255,0.35)] transition-all"
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
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    done
                      ? 'bg-[#0A1930] border-emerald-500/50 text-white'
                      : 'bg-[#0A1930] border-[#1677FF]/25 hover:border-[#00D9FF]/55 text-white'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#00D9FF]/70 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block ${done ? 'line-through text-[#A9B8CC]' : 'text-white'}`}>
                      {obj.label}
                    </span>
                    <span className="text-[10px] text-[#A9B8CC] block mt-0.5 leading-snug">
                      {obj.hint}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold flex items-center gap-1">
                <Award className="w-3 h-3" /> Completion Reward
              </span>
              <div className="text-xs font-mono text-white mt-1 space-y-0.5">
                <div>+120 Player XP · +100 Gold</div>
                <div className="text-[#00D9FF]">+2 DIS · +1 RES</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Five Story Chapters */}
      <section data-tutorial-id="story-campaign" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#00D9FF]" />
            CAMPAIGN CHAPTERS (RISE OF AETHERIA)
          </h2>
          <span className="text-xs font-mono text-[#00D9FF]">
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
                    ? 'bg-[#102440]/95 border-emerald-500/45 shadow-[0_12px_32px_rgba(2,8,20,0.5)]'
                    : isUnlocked
                    ? 'bg-[#102440]/90 backdrop-blur-md border-[#1677FF]/35 shadow-[0_12px_32px_rgba(2,8,20,0.6)]'
                    : 'bg-[#0A1930]/80 border-[#1677FF]/15 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#00D9FF] block">
                      Chapter {ch.number} of 5 · +{ch.rewards.restorationPercent}% Restoration Target
                    </span>
                    <h3 className="font-['Cinzel'] font-black text-lg text-white">
                      {ch.title} — {ch.subtitle}
                    </h3>
                  </div>

                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1 rounded-lg self-start">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Chapter Completed
                    </span>
                  ) : isUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00D9FF] bg-[#0A1930] border border-[#00D9FF]/45 px-3 py-1 rounded-lg self-start">
                      <Compass className="w-3.5 h-3.5" />
                      Active Chapter
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A9B8CC] bg-[#061225] border border-[#1677FF]/20 px-3 py-1 rounded-lg self-start">
                      <Lock className="w-3.5 h-3.5" />
                      Complete Chapter {ch.number - 1} First
                    </span>
                  )}
                </div>

                {/* Chapter Narrative & NPC Dialogue */}
                <p className="text-xs sm:text-sm text-[#A9B8CC] leading-relaxed mb-3">
                  {ch.narrationIntro}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                      {ch.npcSpeaker} · {ch.npcRole}
                    </span>
                    <p className="text-xs italic text-white/90 leading-relaxed">
                      {ch.npcDialogue}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/25 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Lore Discovery
                    </span>
                    <p className="text-xs text-[#A9B8CC] leading-relaxed">
                      {ch.loreDiscovery}
                    </p>
                  </div>
                </div>

                {/* Real-Life Connected Mission & Milestone Action */}
                <div className="p-4 rounded-xl bg-[#061225] border border-[#1677FF]/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#00D9FF]" />
                      <span className="text-xs font-bold text-white">
                        Mission: {ch.missionTitle}
                      </span>
                    </div>
                    <p className="text-xs text-[#A9B8CC]">{ch.missionSummary}</p>

                    {!isClaimed && isUnlocked && reqEval.missing.length > 0 && (
                      <p className="text-[11px] text-amber-300/90 pt-1">
                        Remaining: {reqEval.missing.join(' · ')}
                      </p>
                    )}

                    <div className="text-[11px] font-mono text-[#00D9FF] pt-1">
                      Reward: +{ch.rewards.playerXp} Player XP · <span className="text-amber-300">+{ch.rewards.gold} Gold</span>
                    </div>
                  </div>

                  {isUnlocked && !isClaimed && (
                    <button
                      type="button"
                      disabled={!reqEval.met || claimingId === ch.id}
                      onClick={() => handleClaimChapter(ch.id)}
                      className={`px-5 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider shrink-0 transition-all ${
                        reqEval.met
                          ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                          : 'bg-[#0A1930] text-[#A9B8CC]/50 border border-[#1677FF]/25 cursor-not-allowed'
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
          <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#00D9FF]" />
            THE FIVE CORRUPTED KINGDOMS
          </h2>
          <p className="text-xs sm:text-sm text-[#A9B8CC] mt-0.5">
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
                className={`rounded-2xl border overflow-hidden transition-all shadow-[0_12px_32px_rgba(2,8,20,0.6)] ${
                  isCleared
                    ? 'bg-[#102440]/95 border-emerald-500/45'
                    : isUnlocked
                    ? 'bg-[#102440]/90 backdrop-blur-md border-[#1677FF]/35 hover:border-[#00D9FF]/50'
                    : 'bg-[#0A1930]/80 border-[#1677FF]/20 opacity-75'
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
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#061225] via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 bg-[#061225]/90 px-2.5 py-1 rounded text-[11px] font-bold text-[#00D9FF] border border-[#00D9FF]/40">
                      Kingdom {idx + 1} of 5
                    </div>
                  </div>

                  <div className="md:col-span-8 p-6 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#00D9FF]">
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
                          <span className="text-xs font-bold text-[#A9B8CC] flex items-center gap-1 bg-[#061225] px-2 py-0.5 rounded">
                            <Lock className="w-3.5 h-3.5" /> LOCKED
                          </span>
                        )}
                      </div>

                      <h3 className="font-['Cinzel'] font-black text-xl text-white">{kingdom.name}</h3>
                      <p className="text-xs text-[#00D9FF] font-medium mb-3">{kingdom.subtitle}</p>

                      <p className="text-xs text-[#A9B8CC] leading-relaxed mb-3">
                        {kingdom.description}
                      </p>

                      <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/25 text-xs italic text-[#A9B8CC] leading-relaxed">
                        "{kingdom.loreIntro}"
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-[#A9B8CC]">Boss Sovereign: </span>
                        <strong className="text-white">{kingdom.boss.name}</strong>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => setActiveTab('boss-battles')}
                          className="px-5 py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)] flex items-center gap-1.5 transition-all"
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          Challenge Boss
                        </button>
                      ) : (
                        <span className="text-xs text-[#A9B8CC]/70">Defeat previous kingdom boss to unlock</span>
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
