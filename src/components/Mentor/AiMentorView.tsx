import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
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
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#19122B] via-[#24143D] to-[#19122B] border border-[#6638B8]/40 p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,5,24,0.65)] backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#100D1C] border border-[#65A9FF]/45 flex items-center justify-center shrink-0">
              <GoldenWorldTreeEmblem className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#65A9FF] font-semibold uppercase tracking-widest">
                <span className="font-['Cinzel']">Master Eldric</span>
                <span className="text-[#BEB4D6]/45" aria-hidden="true">·</span>
                <span>AI Fitness & Progression Mentor</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F7F4FF] mt-0.5">
                SANCTUARY OF GUIDANCE
              </h1>
              <p className="text-xs sm:text-sm text-[#BEB4D6] max-w-2xl mt-1">
                Private coaching grounded exclusively in your workouts, goals, Skill Tree attributes, and recovery habits.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={mentorLoading}
            onClick={() => void requestMentorWeeklyAnalysis()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6638B8] to-[#65A9FF] hover:from-[#7849cc] hover:to-[#7bb6ff] disabled:opacity-50 text-[#F7F4FF] font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 self-start md:self-auto shadow-[0_0_18px_rgba(102,56,184,0.35)] transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            {mentorLoading ? 'Analyzing...' : 'Generate Weekly Analysis'}
          </button>
        </div>

        {/* Safety boundary banner */}
        <div className="mt-4 pt-3 border-t border-[#6638B8]/25 flex items-center gap-2 text-[11px] text-[#BEB4D6]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#65A9FF] shrink-0" />
          Coaching guidance is educational only and never replaces qualified medical advice. Mentor cannot modify XP or rankings directly.
        </div>
      </div>

      {mentorError && (
        <div className="rounded-xl bg-[#36111F]/85 border border-[#F05B70]/45 px-4 py-3 text-xs text-[#F05B70] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#F05B70]" />
          <span>{mentorError}</span>
        </div>
      )}

      {questFeedback && (
        <div className="rounded-xl bg-[#35D69A]/15 border border-[#35D69A]/45 px-4 py-3 text-xs text-[#35D69A] flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#35D69A]" />
            {questFeedback}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('quests')}
            className="text-xs font-bold text-[#65A9FF] hover:underline"
          >
            Open Quest Board →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversational Coach (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 overflow-hidden min-h-[520px] shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
          <div className="px-5 py-3.5 border-b border-[#6638B8]/30 flex flex-wrap items-center justify-between gap-2 bg-[#19122B]">
            <span className="text-xs font-['Cinzel'] font-bold text-[#F7F4FF]">
              Mentor Conversation ({mentorMessages.length})
            </span>
            <span className="text-[11px] text-[#BEB4D6] tabular-nums">
              Context: Lv.{stats.level} · {fitnessSessions.length} workouts · {stats.currentStreak}d streak
            </span>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
            {mentorMessages.length === 0 ? (
              <div className="py-10 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-[#A875FF] mx-auto" />
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-['Cinzel'] font-bold text-[#F7F4FF]">
                    Greetings, {user?.username || 'Champion'}.
                  </p>
                  <p className="text-xs text-[#BEB4D6]">
                    Ask for workout strategy, recovery balance, weekly review, or a tailored daily quest.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto pt-2">
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={mentorLoading}
                      onClick={() => void handleSend(prompt)}
                      className="text-left p-3 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/35 hover:border-[#65A9FF]/50 text-xs text-[#F7F4FF] transition-colors"
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
                        ? 'bg-[#6638B8]/30 border border-[#A875FF]/50 text-[#F7F4FF]'
                        : 'bg-[#19122B] border border-[#6638B8]/30 text-[#BEB4D6]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-[#F7F4FF]">{msg.content}</p>

                    {msg.safetyNotice && (
                      <div className="rounded-lg bg-[#FFAA45]/15 border border-[#FFAA45]/45 px-3 py-2 text-xs text-[#FFD978] flex items-start gap-2">
                        <HeartPulse className="w-4 h-4 shrink-0 mt-0.5 text-[#FFAA45]" />
                        <span>{msg.safetyNotice}</span>
                      </div>
                    )}

                    {msg.focusAreas && msg.focusAreas.length > 0 && (
                      <div className="pt-1 text-[11px] text-[#65A9FF]">
                        Focus Areas: {msg.focusAreas.join(' · ')}
                      </div>
                    )}

                    {msg.recoveryAdvice && (
                      <div className="text-[11px] text-[#35D69A]">
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
            className="p-3.5 border-t border-[#6638B8]/30 bg-[#19122B] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Master Eldric about training, consistency, recovery, or quests..."
              className="flex-1 rounded-xl bg-[#100D1C] border border-[#6638B8]/40 px-3.5 py-2.5 text-xs sm:text-sm text-[#F7F4FF] placeholder-[#BEB4D6]/55 focus:outline-none focus:border-[#65A9FF]"
            />
            <button
              type="submit"
              disabled={mentorLoading || input.trim().length < 2}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6638B8] to-[#65A9FF] hover:from-[#7849cc] hover:to-[#7bb6ff] disabled:opacity-45 text-[#F7F4FF] font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(102,56,184,0.3)] transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {mentorLoading ? 'Sending...' : 'Ask'}
            </button>
          </form>
        </div>

        {/* Weekly Analysis & Recommended Quests (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Player Context Snapshot */}
          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-5 space-y-3 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#65A9FF]" />
              Coaching Context Snapshot
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#19122B] border border-[#6638B8]/25 p-2.5">
                <span className="text-[10px] text-[#BEB4D6] block">Strength Tree</span>
                <span className="font-mono font-bold text-[#F7F4FF] tabular-nums">
                  Lv.{skillTreeState.attributes.strength.level}
                </span>
              </div>
              <div className="rounded-lg bg-[#19122B] border border-[#6638B8]/25 p-2.5">
                <span className="text-[10px] text-[#BEB4D6] block">Endurance Tree</span>
                <span className="font-mono font-bold text-[#F7F4FF] tabular-nums">
                  Lv.{skillTreeState.attributes.endurance.level}
                </span>
              </div>
              <div className="rounded-lg bg-[#19122B] border border-[#6638B8]/25 p-2.5">
                <span className="text-[10px] text-[#BEB4D6] block">Discipline Tree</span>
                <span className="font-mono font-bold text-[#F7F4FF] tabular-nums">
                  Lv.{skillTreeState.attributes.discipline.level}
                </span>
              </div>
              <div className="rounded-lg bg-[#19122B] border border-[#6638B8]/25 p-2.5">
                <span className="text-[10px] text-[#BEB4D6] block">Vitality Tree</span>
                <span className="font-mono font-bold text-[#F7F4FF] tabular-nums">
                  Lv.{skillTreeState.attributes.vitality.level}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Analysis Card */}
          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-5 space-y-3 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF]">
              Weekly Progress Review
            </h3>
            {mentorWeeklyAnalysis ? (
              <div className="space-y-3 text-xs text-[#BEB4D6]">
                <p className="leading-relaxed text-[#F7F4FF]/90">{mentorWeeklyAnalysis.summary}</p>
                {mentorWeeklyAnalysis.strengths.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-[#35D69A] uppercase mb-1">Strengths</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {mentorWeeklyAnalysis.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {mentorWeeklyAnalysis.realisticPlan.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-[#65A9FF] uppercase mb-1">Next Week Plan</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {mentorWeeklyAnalysis.realisticPlan.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[11px] text-[#65A9FF]">
                  Recovery: {mentorWeeklyAnalysis.recoveryRecommendation}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#BEB4D6]">
                Click "Generate Weekly Analysis" to review your recorded workouts, Skill Tree momentum, and recovery rhythm.
              </p>
            )}
          </div>

          {/* Mentor Recommended Quests */}
          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-5 space-y-3 shadow-[0_12px_32px_rgba(10,5,24,0.65)]">
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF]">
              Mentor Quest Proposals
            </h3>
            {mentorQuests.length === 0 ? (
              <p className="text-xs text-[#BEB4D6]">
                Personalized safe quests proposed during coaching appear here for you to review and accept.
              </p>
            ) : (
              <div className="space-y-3">
                {mentorQuests.slice(0, 5).map(q => (
                  <div
                    key={q.id}
                    className="rounded-xl bg-[#19122B] border border-[#6638B8]/30 p-3 space-y-2"
                  >
                    <p className="text-xs font-bold text-[#F7F4FF]">{q.title}</p>
                    <p className="text-[11px] text-[#BEB4D6]">{q.description}</p>
                    <p className="text-[11px] font-mono text-[#65A9FF] tabular-nums">
                      ~{q.estimatedMinutes}m · +{q.playerXpReward} XP · +{q.goldReward}g
                    </p>
                    <button
                      type="button"
                      disabled={q.accepted}
                      onClick={() => void handleAcceptQuest(q.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                        q.accepted
                          ? 'bg-[#35D69A]/15 text-[#35D69A] border border-[#35D69A]/45'
                          : 'bg-gradient-to-r from-[#6638B8] to-[#65A9FF] hover:from-[#7849cc] hover:to-[#7bb6ff] text-[#F7F4FF] shadow-[0_0_12px_rgba(102,56,184,0.3)]'
                      }`}
                    >
                      {q.accepted ? 'Added to Quest Board' : 'Accept Quest to Board'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
