import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import { AnimatedCounter, RpgScrollReveal } from '../Motion/RpgMotionPrimitives';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  HeartPulse,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'Analyze my recent workouts and tell me where to focus this week.',
  'Suggest a balanced 20-minute workout that fits my current goals.',
  'How can I stay consistent on low-energy or busy days?',
  'What recovery habits will best support my current training load?',
];

export const AiMentorView: React.FC = () => {
  const {
    user,
    stats,
    skillTreeState,
    fitnessSessions,
    mentorMessages,
    mentorQuests,
    mentorWeeklyAnalysis,
    mentorLoading,
    mentorError,
    refreshAiMentorState,
    sendAiMentorMessage,
    requestMentorWeeklyAnalysis,
    acceptMentorQuest,
    setActiveTab,
  } = useGame();

  const [input, setInput] = useState('');
  const [questFeedback, setQuestFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void refreshAiMentorState();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mentorMessages.length]);

  const handleSend = async (promptText?: string) => {
    const clean = (promptText ?? input).trim();
    if (!clean || mentorLoading) return;
    if (!promptText) setInput('');
    await sendAiMentorMessage(clean);
  };

  const handleAcceptQuest = async (questId: string) => {
    setQuestFeedback(null);
    const res = await acceptMentorQuest(questId);
    if (res.success) {
      setQuestFeedback('Quest validated and added to your Quest Board!');
    } else if (res.error) {
      setQuestFeedback(res.error);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <FeatureBanner themeId="mentor">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#100D18] border border-[#D6A84B]/45 flex items-center justify-center shrink-0">
              <GoldenWorldTreeEmblem className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#E8C777] font-semibold uppercase tracking-widest">
                <span className="font-['Cinzel']">Master Eldric</span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="text-[#A69AAF] normal-case tracking-normal font-medium">
                  AI Fitness &amp; Progression Mentor
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-['Cinzel'] text-[#F2EDF7] mt-0.5">
                Sanctuary of Guidance
              </h1>
              <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1 leading-relaxed">
                Private coaching grounded exclusively in your workouts, goals, Skill Tree
                attributes, and recovery habits.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={mentorLoading}
            onClick={() => void requestMentorWeeklyAnalysis()}
            className="lq-btn lq-btn-gold px-4 py-2.5 text-xs whitespace-nowrap shrink-0 self-start md:self-auto disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{mentorLoading ? 'Analyzing...' : 'Generate Weekly Analysis'}</span>
          </button>
        </div>

        {/* Safety boundary note */}
        <div className="mt-4 pt-3 border-t border-[#362B45] flex items-center gap-2 text-[11px] text-[#A69AAF]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#E8C777] shrink-0" />
          <span>
            Coaching guidance is educational only and never replaces qualified medical advice.
            Mentor cannot modify XP or rankings directly.
          </span>
        </div>
      </FeatureBanner>

      {mentorError && (
        <div className="rounded-xl bg-[#D65C66]/12 border border-[#D65C66]/45 px-4 py-3 text-xs text-[#D65C66] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{mentorError}</span>
        </div>
      )}

      {questFeedback && (
        <div className="rounded-xl bg-[#49B88A]/12 border border-[#49B88A]/45 px-4 py-3 text-xs text-[#49B88A] flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{questFeedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('quests')}
            className="text-xs font-semibold text-[#E8C777] hover:underline shrink-0"
          >
            Open Quest Board →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversational Coach (8 cols) */}
        <div className="lg:col-span-8 flex flex-col lq-card overflow-hidden min-h-[520px]">
          <div className="px-5 py-3.5 border-b border-[#362B45] flex flex-wrap items-center justify-between gap-2 bg-[#100D18]">
            <span className="text-xs font-['Cinzel'] font-bold text-[#F2EDF7]">
              Mentor Conversation ({mentorMessages.length})
            </span>
            <span className="text-[11px] text-[#A69AAF] font-mono tabular-nums">
              Lv.{stats.level} · {fitnessSessions.length} workouts · {stats.currentStreak}d streak
            </span>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
            {mentorMessages.length === 0 ? (
              <div className="py-10 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-[#E8C777] mx-auto" />
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-['Cinzel'] font-bold text-[#F2EDF7]">
                    Greetings, {user?.username || 'Champion'}.
                  </p>
                  <p className="text-xs text-[#A69AAF]">
                    Ask for workout strategy, recovery balance, weekly review, or a tailored daily
                    quest.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-2">
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={mentorLoading}
                      onClick={() => void handleSend(prompt)}
                      className="text-left p-3.5 rounded-xl bg-[#100D18] hover:bg-[#21152F] border border-[#362B45] hover:border-[#9A72CC]/55 text-xs text-[#F2EDF7] transition-colors disabled:opacity-60"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mentorMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-[#7045A0]/28 border border-[#9A72CC]/45 text-[#F2EDF7]'
                        : 'bg-[#100D18] border border-[#362B45] text-[#A69AAF]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-[#F2EDF7]">
                      {msg.content}
                    </p>

                    {msg.safetyNotice && (
                      <div className="rounded-lg bg-[#D6A84B]/12 border border-[#D6A84B]/40 px-3 py-2 text-xs text-[#E8C777] flex items-start gap-2">
                        <HeartPulse className="w-4 h-4 shrink-0 mt-0.5 text-[#E8C777]" />
                        <span>{msg.safetyNotice}</span>
                      </div>
                    )}

                    {msg.focusAreas && msg.focusAreas.length > 0 && (
                      <div className="pt-1 text-[11px] text-[#9A72CC]">
                        Focus Areas: {msg.focusAreas.join(' · ')}
                      </div>
                    )}

                    {msg.recoveryAdvice && (
                      <div className="text-[11px] text-[#49B88A]">
                        Recovery Note: {msg.recoveryAdvice}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              void handleSend();
            }}
            className="p-3.5 border-t border-[#362B45] bg-[#100D18] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Master Eldric about training, consistency, recovery, or quests..."
              className="lq-input flex-1"
            />
            <button
              type="submit"
              disabled={mentorLoading || input.trim().length < 2}
              className="lq-btn lq-btn-primary px-4 py-2.5 text-xs shrink-0 disabled:opacity-45"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{mentorLoading ? 'Sending...' : 'Ask'}</span>
            </button>
          </form>
        </div>

        {/* Weekly Analysis & Recommended Quests (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Player Context Snapshot */}
          <RpgScrollReveal>
            <div className="lq-card p-5 space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#E8C777]" />
                <span>Coaching Context Snapshot</span>
              </h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  { label: 'Strength Tree', level: skillTreeState.attributes.strength.level },
                  { label: 'Endurance Tree', level: skillTreeState.attributes.endurance.level },
                  { label: 'Discipline Tree', level: skillTreeState.attributes.discipline.level },
                  { label: 'Vitality Tree', level: skillTreeState.attributes.vitality.level },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-[#100D18] border border-[#362B45] p-3"
                  >
                    <span className="text-[11px] text-[#A69AAF] block">{item.label}</span>
                    <span className="font-mono font-bold text-base text-[#F2EDF7] tabular-nums">
                      Lv.<AnimatedCounter value={item.level} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </RpgScrollReveal>

          {/* Weekly Analysis Card */}
          <RpgScrollReveal>
            <div className="lq-card p-5 space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">
                Weekly Progress Review
              </h3>
              {mentorWeeklyAnalysis ? (
                <div className="space-y-3 text-xs text-[#A69AAF]">
                  <p className="leading-relaxed text-[#F2EDF7]/90">
                    {mentorWeeklyAnalysis.summary}
                  </p>
                  {mentorWeeklyAnalysis.strengths.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-[#49B88A] uppercase mb-1">
                        Strengths
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {mentorWeeklyAnalysis.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {mentorWeeklyAnalysis.realisticPlan.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-[#E8C777] uppercase mb-1">
                        Next Week Plan
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {mentorWeeklyAnalysis.realisticPlan.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[11px] text-[#9A72CC]">
                    Recovery: {mentorWeeklyAnalysis.recoveryRecommendation}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#A69AAF] leading-relaxed">
                  Click &ldquo;Generate Weekly Analysis&rdquo; to review your recorded workouts,
                  Skill Tree momentum, and recovery rhythm.
                </p>
              )}
            </div>
          </RpgScrollReveal>

          {/* Mentor Recommended Quests */}
          <RpgScrollReveal>
            <div className="lq-card-gold p-5 space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">
                Mentor Quest Proposals
              </h3>
              {mentorQuests.length === 0 ? (
                <p className="text-xs text-[#A69AAF] leading-relaxed">
                  Personalized safe quests proposed during coaching appear here for you to review
                  and accept.
                </p>
              ) : (
                <div className="space-y-3">
                  {mentorQuests.slice(0, 5).map(q => (
                    <div
                      key={q.id}
                      className="rounded-xl bg-[#100D18] border border-[#362B45] p-3.5 space-y-2"
                    >
                      <p className="text-xs font-bold text-[#F2EDF7]">{q.title}</p>
                      <p className="text-[11px] text-[#A69AAF] leading-relaxed">{q.description}</p>
                      <p className="text-[11px] font-mono text-[#E8C777] tabular-nums">
                        ~{q.estimatedMinutes}m · +{q.playerXpReward} XP · +{q.goldReward}g
                      </p>
                      <button
                        type="button"
                        disabled={q.accepted}
                        onClick={() => void handleAcceptQuest(q.id)}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                          q.accepted
                            ? 'bg-[#49B88A]/12 text-[#49B88A] border border-[#49B88A]/45 cursor-default'
                            : 'lq-btn lq-btn-primary'
                        }`}
                      >
                        {q.accepted ? 'Added to Quest Board' : 'Accept Quest to Board'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </RpgScrollReveal>
        </div>
      </div>
    </div>
  );
};
