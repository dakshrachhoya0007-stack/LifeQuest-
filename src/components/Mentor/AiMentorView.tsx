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
      <div className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#1677FF]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)] backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#061225] border border-[#00D9FF]/45 flex items-center justify-center shrink-0">
              <GoldenWorldTreeEmblem className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#00D9FF] font-semibold uppercase tracking-widest">
                <span className="font-['Cinzel']">Master Eldric</span>
                <span className="text-[#A9B8CC]/45" aria-hidden="true">·</span>
                <span>AI Fitness & Progression Mentor</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white mt-0.5">
                SANCTUARY OF GUIDANCE
              </h1>
              <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
                Private coaching grounded exclusively in your workouts, goals, Skill Tree attributes, and recovery habits.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={mentorLoading}
            onClick={() => void requestMentorWeeklyAnalysis()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 self-start md:self-auto shadow-[0_0_18px_rgba(22,119,255,0.35)] transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            {mentorLoading ? 'Analyzing...' : 'Generate Weekly Analysis'}
          </button>
        </div>

        {/* Safety boundary banner */}
        <div className="mt-4 pt-3 border-t border-[#1677FF]/25 flex items-center gap-2 text-[11px] text-[#A9B8CC]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
          Coaching guidance is educational only and never replaces qualified medical advice. Mentor cannot modify XP or rankings directly.
        </div>
      </div>

      {mentorError && (
        <div className="rounded-xl bg-rose-950/60 border border-rose-500/45 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300" />
          <span>{mentorError}</span>
        </div>
      )}

      {questFeedback && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/45 px-4 py-3 text-xs text-emerald-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            {questFeedback}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('quests')}
            className="text-xs font-bold text-[#00D9FF] hover:underline"
          >
            Open Quest Board →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversational Coach (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 overflow-hidden min-h-[520px] shadow-[0_12px_32px_rgba(2,8,20,0.55)]">
          <div className="px-5 py-3.5 border-b border-[#1677FF]/25 flex flex-wrap items-center justify-between gap-2 bg-[#0A1930]">
            <span className="text-xs font-['Cinzel'] font-bold text-white">
              Mentor Conversation ({mentorMessages.length})
            </span>
            <span className="text-[11px] text-[#A9B8CC] tabular-nums">
              Context: Lv.{stats.level} · {fitnessSessions.length} workouts · {stats.currentStreak}d streak
            </span>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
            {mentorMessages.length === 0 ? (
              <div className="py-10 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-[#00D9FF] mx-auto" />
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-['Cinzel'] font-bold text-white">
                    Greetings, {user?.username || 'Champion'}.
                  </p>
                  <p className="text-xs text-[#A9B8CC]">
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
                      className="text-left p-3 rounded-xl bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/30 hover:border-[#00D9FF]/50 text-xs text-white transition-colors"
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
                        ? 'bg-[#1677FF]/25 border border-[#00D9FF]/45 text-white'
                        : 'bg-[#0A1930] border border-[#1677FF]/25 text-[#A9B8CC]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.content}</p>

                    {msg.safetyNotice && (
                      <div className="rounded-lg bg-amber-950/60 border border-amber-500/40 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
                        <HeartPulse className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                        <span>{msg.safetyNotice}</span>
                      </div>
                    )}

                    {msg.focusAreas && msg.focusAreas.length > 0 && (
                      <div className="pt-1 text-[11px] text-[#00D9FF]">
                        Focus Areas: {msg.focusAreas.join(' · ')}
                      </div>
                    )}

                    {msg.recoveryAdvice && (
                      <div className="text-[11px] text-emerald-300/90">
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
            className="p-3.5 border-t border-[#1677FF]/25 bg-[#0A1930] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Master Eldric about training, consistency, recovery, or quests..."
              className="flex-1 rounded-xl bg-[#061225] border border-[#1677FF]/35 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#A9B8CC]/55 focus:outline-none focus:border-[#00D9FF]"
            />
            <button
              type="submit"
              disabled={mentorLoading || input.trim().length < 2}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] disabled:opacity-45 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(22,119,255,0.3)] transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {mentorLoading ? 'Sending...' : 'Ask'}
            </button>
          </form>
        </div>

        {/* Weekly Analysis & Recommended Quests (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Player Context Snapshot */}
          <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-5 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#00D9FF]" />
              Coaching Context Snapshot
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#0A1930] border border-[#1677FF]/20 p-2.5">
                <span className="text-[10px] text-[#A9B8CC] block">Strength Tree</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  Lv.{skillTreeState.attributes.strength.level}
                </span>
              </div>
              <div className="rounded-lg bg-[#0A1930] border border-[#1677FF]/20 p-2.5">
                <span className="text-[10px] text-[#A9B8CC] block">Endurance Tree</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  Lv.{skillTreeState.attributes.endurance.level}
                </span>
              </div>
              <div className="rounded-lg bg-[#0A1930] border border-[#1677FF]/20 p-2.5">
                <span className="text-[10px] text-[#A9B8CC] block">Discipline Tree</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  Lv.{skillTreeState.attributes.discipline.level}
                </span>
              </div>
              <div className="rounded-lg bg-[#0A1930] border border-[#1677FF]/20 p-2.5">
                <span className="text-[10px] text-[#A9B8CC] block">Vitality Tree</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  Lv.{skillTreeState.attributes.vitality.level}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Analysis Card */}
          <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-5 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-sm text-white">
              Weekly Progress Review
            </h3>
            {mentorWeeklyAnalysis ? (
              <div className="space-y-3 text-xs text-[#A9B8CC]">
                <p className="leading-relaxed text-white/90">{mentorWeeklyAnalysis.summary}</p>
                {mentorWeeklyAnalysis.strengths.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-emerald-300 uppercase mb-1">Strengths</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {mentorWeeklyAnalysis.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {mentorWeeklyAnalysis.realisticPlan.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-[#00D9FF] uppercase mb-1">Next Week Plan</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {mentorWeeklyAnalysis.realisticPlan.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[11px] text-[#00D9FF]/90">
                  Recovery: {mentorWeeklyAnalysis.recoveryRecommendation}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#A9B8CC]">
                Click "Generate Weekly Analysis" to review your recorded workouts, Skill Tree momentum, and recovery rhythm.
              </p>
            )}
          </div>

          {/* Mentor Recommended Quests */}
          <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-5 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-sm text-white">
              Mentor Quest Proposals
            </h3>
            {mentorQuests.length === 0 ? (
              <p className="text-xs text-[#A9B8CC]">
                Personalized safe quests proposed during coaching appear here for you to review and accept.
              </p>
            ) : (
              <div className="space-y-3">
                {mentorQuests.slice(0, 5).map(q => (
                  <div
                    key={q.id}
                    className="rounded-xl bg-[#0A1930] border border-[#1677FF]/25 p-3 space-y-2"
                  >
                    <p className="text-xs font-bold text-white">{q.title}</p>
                    <p className="text-[11px] text-[#A9B8CC]">{q.description}</p>
                    <p className="text-[11px] font-mono text-[#00D9FF] tabular-nums">
                      ~{q.estimatedMinutes}m · +{q.playerXpReward} XP · +{q.goldReward}g
                    </p>
                    <button
                      type="button"
                      disabled={q.accepted}
                      onClick={() => void handleAcceptQuest(q.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                        q.accepted
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40'
                          : 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]'
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
