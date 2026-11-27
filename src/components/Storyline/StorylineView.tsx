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
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedProgressBar,
  RpgScrollReveal,
} from '../Motion/RpgMotionPrimitives';

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

  const restorationPercent = Math.min(100, campaignProgress.claimedChapterIds.length * 20);

  return (
    <div className="space-y-8 pb-12 max-w-[1360px] mx-auto">
      {/* 1. Opening Lore Monologue Banner */}
      <FeatureBanner themeId="quests" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="font-['Cinzel'] font-bold text-[11px] uppercase tracking-widest text-[#D6A84B] block mb-1">
              Main Story Campaign · The Fallen Knight: Rise of Aetheria
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7]">
              The Great Fall &amp; The Chronicles of Aetheria
            </h1>
          </div>

          {heroLocked ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#100D18] border border-[#D6A84B]/45 text-xs font-bold font-['Cinzel'] text-[#E8C777] shrink-0">
              <Lock className="w-3.5 h-3.5" />
              Hero Oath: {heroDef.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowHeroSelectModal(true)}
              className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-bold font-['Cinzel'] text-[#E8C777] shrink-0 cursor-pointer"
            >
              Hero Path: {heroDef.name}
            </button>
          )}
        </div>

        {/* Canonical Great Fall Opening Quote */}
        <blockquote className="p-4 sm:p-5 rounded-xl bg-[#100D18] border border-[#362B45] text-xs sm:text-sm text-[#A69AAF] leading-relaxed whitespace-pre-line font-serif italic">
          {FALLEN_KNIGHT_OPENING_MONOLOGUE}
        </blockquote>

        {/* Selected Hero's Personal Origin Thread */}
        <div className="lq-surface p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#D6A84B] font-bold block">
              Your Hero Origin · {heroDef.name} ({heroDef.title})
            </span>
            <p className="text-xs text-[#A69AAF] leading-relaxed">
              {heroDef.greatFallOrigin}
            </p>
          </div>
          <span className="font-mono text-xs text-[#E8C777] shrink-0 tabular-nums">
            {campaignProgress.claimedChapterIds.length} / {CAMPAIGN_CHAPTERS.length} Chapters Complete
          </span>
        </div>
      </FeatureBanner>

      {chapterFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            chapterFeedback.type === 'error'
              ? 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
              : 'bg-[#49B88A]/10 border-[#49B88A]/45 text-[#49B88A]'
          }`}
        >
          {chapterFeedback.text}
        </div>
      )}

      {!reclaimHonorQuest.claimed && (
        <section
          aria-label="Reclaim Your Honor Introductory Quest"
          className="lq-card-gold rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#362B45] pb-3.5">
            <div>
              <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B] block">
                Starter Story Trial · Awakening Chapter
              </span>
              <h2 className="font-['Cinzel'] font-black text-lg text-[#F2EDF7] flex items-center gap-2 mt-0.5">
                <Shield className="w-4 h-4 text-[#D6A84B]" />
                Reclaim Your Honor
              </h2>
              <p className="text-xs text-[#A69AAF] mt-0.5">
                Complete each genuine realm action below to awaken your citadel oath and unlock your starter reward.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs font-bold text-[#E8C777] tabular-nums">
                {honorDoneCount} / {honorTotalCount} Complete
              </span>
              {reclaimHonorQuest.completed && (
                <button
                  type="button"
                  disabled={claimingHonor}
                  onClick={handleClaimHonor}
                  className="lq-btn lq-btn-gold px-4 py-2 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider cursor-pointer"
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
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    done
                      ? 'bg-[#49B88A]/10 border-[#49B88A]/45 text-[#F2EDF7]'
                      : 'lq-surface hover:border-[#D6A84B]/55 text-[#F2EDF7]'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#49B88A] shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#9A72CC] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block ${done ? 'line-through text-[#A69AAF]' : 'text-[#F2EDF7]'}`}>
                      {obj.label}
                    </span>
                    <span className="text-[10px] text-[#A69AAF] block mt-0.5 leading-snug">
                      {obj.hint}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="lq-surface p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#D6A84B] font-bold flex items-center gap-1">
                <Award className="w-3 h-3" /> Completion Reward
              </span>
              <div className="text-xs font-mono text-[#F2EDF7] mt-1 space-y-0.5 tabular-nums">
                <div>+120 Player XP · +100 Gold</div>
                <div className="text-[#E8C777]">+2 DIS · +1 RES</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Five Story Chapters */}
      <section data-tutorial-id="story-campaign" className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#F2EDF7] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#D6A84B]" />
              Campaign Chapters (Rise of Aetheria)
            </h2>
            <span className="text-xs font-mono text-[#E8C777] tabular-nums">
              Citadel Restoration: {restorationPercent}%
            </span>
          </div>
          <AnimatedProgressBar
            percentage={restorationPercent}
            className="h-2 rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden"
            barClassName="bg-gradient-to-r from-[#7045A0] via-[#9A72CC] to-[#D6A84B]"
          />
        </div>

        <div className="space-y-4">
          {CAMPAIGN_CHAPTERS.map((ch, idx) => {
            const isClaimed = campaignProgress.claimedChapterIds.includes(ch.id);
            const prevChapterClaimed =
              idx === 0 || campaignProgress.claimedChapterIds.includes(CAMPAIGN_CHAPTERS[idx - 1].id);
            const isUnlocked = prevChapterClaimed || isClaimed;
            const reqEval = evaluateChapterRequirements(ch.id);

            return (
              <RpgScrollReveal
                key={ch.id}
                className={`rounded-2xl p-5 sm:p-6 ${
                  isClaimed
                    ? 'lq-card border border-[#49B88A]/45'
                    : isUnlocked
                    ? 'lq-card'
                    : 'lq-surface opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A84B] block">
                      Chapter {ch.number} of 5 · +{ch.rewards.restorationPercent}% Restoration Target
                    </span>
                    <h3 className="font-['Cinzel'] font-black text-lg text-[#F2EDF7]">
                      {ch.title} — {ch.subtitle}
                    </h3>
                  </div>

                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#49B88A] self-start">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Chapter Completed
                    </span>
                  ) : isUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E8C777] self-start">
                      <Compass className="w-3.5 h-3.5" />
                      Active Chapter
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A69AAF] self-start">
                      <Lock className="w-3.5 h-3.5" />
                      Complete Chapter {ch.number - 1} First
                    </span>
                  )}
                </div>

                {/* Chapter Narrative & NPC Dialogue */}
                <p className="text-xs sm:text-sm text-[#A69AAF] leading-relaxed mb-3">
                  {ch.narrationIntro}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                  <div className="lq-surface p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#D6A84B] font-bold flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                      {ch.npcSpeaker} · {ch.npcRole}
                    </span>
                    <p className="text-xs italic text-[#F2EDF7] leading-relaxed">
                      {ch.npcDialogue}
                    </p>
                  </div>

                  <div className="lq-surface p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#9A72CC] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Lore Discovery
                    </span>
                    <p className="text-xs text-[#A69AAF] leading-relaxed">
                      {ch.loreDiscovery}
                    </p>
                  </div>
                </div>

                {/* Real-Life Connected Mission & Milestone Action */}
                <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#D6A84B]" />
                      <span className="text-xs font-bold text-[#F2EDF7]">
                        Mission: {ch.missionTitle}
                      </span>
                    </div>
                    <p className="text-xs text-[#A69AAF]">{ch.missionSummary}</p>

                    {!isClaimed && isUnlocked && reqEval.missing.length > 0 && (
                      <p className="text-[11px] text-[#E8C777] pt-1">
                        Remaining: {reqEval.missing.join(' · ')}
                      </p>
                    )}

                    <div className="text-[11px] font-mono text-[#9A72CC] pt-1 tabular-nums">
                      Reward: +{ch.rewards.playerXp} Player XP · <span className="text-[#E8C777]">+{ch.rewards.gold} Gold</span>
                    </div>
                  </div>

                  {isUnlocked && !isClaimed && (
                    <button
                      type="button"
                      disabled={!reqEval.met || claimingId === ch.id}
                      onClick={() => handleClaimChapter(ch.id)}
                      className={`lq-btn px-5 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider shrink-0 ${
                        reqEval.met
                          ? 'lq-btn-gold cursor-pointer'
                          : 'lq-btn-secondary opacity-50 cursor-not-allowed'
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
              </RpgScrollReveal>
            );
          })}
        </div>
      </section>

      {/* 3. The Five Corrupted Kingdoms & Boss Liberation */}
      <section data-tutorial-id="kingdom-restoration" className="space-y-4">
        <div>
          <h2 className="font-['Cinzel'] font-black text-lg sm:text-xl text-[#F2EDF7] flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#D6A84B]" />
            The Five Corrupted Kingdoms
          </h2>
          <p className="text-xs sm:text-sm text-[#A69AAF] mt-0.5">
            Push back the Void corruption across every province to liberate Aetheria and defeat each Void Sovereign.
          </p>
        </div>

        <div className="space-y-5">
          {kingdoms.map((kingdom, idx) => {
            const isUnlocked = kingdom.unlocked;
            const isCleared = kingdom.cleared;

            return (
              <RpgScrollReveal
                key={kingdom.id}
                className={`rounded-2xl overflow-hidden ${
                  isCleared
                    ? 'lq-card border border-[#49B88A]/45'
                    : isUnlocked
                    ? 'lq-card lq-card-interactive'
                    : 'lq-surface opacity-75'
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
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#100D18] via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 bg-[#100D18]/90 px-2.5 py-1 rounded text-[11px] font-bold text-[#E8C777] border border-[#D6A84B]/40">
                      Kingdom {idx + 1} of 5
                    </div>
                  </div>

                  <div className="md:col-span-8 p-6 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#D6A84B]">
                          Theme: {kingdom.theme}
                        </span>
                        {isCleared ? (
                          <span className="text-xs font-bold text-[#49B88A] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> CLEARED
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-xs font-bold text-[#E8C777]">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#A69AAF] flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> LOCKED
                          </span>
                        )}
                      </div>

                      <h3 className="font-['Cinzel'] font-black text-xl text-[#F2EDF7]">{kingdom.name}</h3>
                      <p className="text-xs text-[#9A72CC] font-medium mb-3">{kingdom.subtitle}</p>

                      <p className="text-xs text-[#A69AAF] leading-relaxed mb-3">
                        {kingdom.description}
                      </p>

                      <div className="lq-surface p-3 rounded-xl text-xs italic text-[#A69AAF] leading-relaxed">
                        &ldquo;{kingdom.loreIntro}&rdquo;
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-[#A69AAF]">Boss Sovereign: </span>
                        <strong className="text-[#F2EDF7]">{kingdom.boss.name}</strong>
                      </div>

                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab('boss-battles')}
                          className="lq-btn lq-btn-gold px-5 py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider flex items-center gap-1.5 cursor-pointer"
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          Challenge Boss
                        </button>
                      ) : (
                        <span className="text-xs text-[#766D82]">Defeat previous kingdom boss to unlock</span>
                      )}
                    </div>
                  </div>
                </div>
              </RpgScrollReveal>
            );
          })}
        </div>
      </section>
    </div>
  );
};
