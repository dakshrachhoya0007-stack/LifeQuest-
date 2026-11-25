import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { realmCitadelGatheringImg } from '../../assets/images';
import {
  Archive,
  CheckCircle2,
  Clock,
  Flag,
  Scale,
  ShieldCheck,
  Vote,
} from 'lucide-react';

export const CommunityDecisionsView: React.FC = () => {
  const {
    communityDecisionPolls,
    communityDecisionArchive,
    refreshCommunityDecisions,
    castCommunityDecisionVote,
    reportCommunityDecisionPoll,
  } = useGame();

  const [draftSelections, setDraftSelections] = useState<Record<string, string[]>>({});
  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [reportingPollId, setReportingPollId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshCommunityDecisions();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const toggleOption = (pollId: string, optionId: string, pollType: 'single_choice' | 'multiple_choice', maxChoices: number) => {
    setDraftSelections(prev => {
      const current = prev[pollId] || [];
      if (pollType === 'single_choice') {
        return { ...prev, [pollId]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [pollId]: current.filter(id => id !== optionId) };
      }
      if (current.length >= maxChoices) {
        flash('error', `Select at most ${maxChoices} options for this council decree.`);
        return prev;
      }
      return { ...prev, [pollId]: [...current, optionId] };
    });
  };

  const handleSubmitVote = async (pollId: string, fallbackSelected: string[]) => {
    const selected = draftSelections[pollId] ?? fallbackSelected;
    if (!selected || selected.length === 0) {
      flash('error', 'Choose at least one option before casting your ballot.');
      return;
    }
    setBusyPollId(pollId);
    const res = await castCommunityDecisionVote(pollId, selected);
    setBusyPollId(null);
    if (res.success) {
      flash('success', 'Your council ballot has been recorded.');
    } else {
      flash('error', res.error || 'Could not record vote.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPollId || reportReason.trim().length < 5) {
      flash('error', 'Please enter a short explanation (at least 5 characters).');
      return;
    }
    const res = await reportCommunityDecisionPoll(reportingPollId, reportReason.trim());
    if (res.success) {
      setReportingPollId(null);
      setReportReason('');
      flash('success', 'Report submitted for council moderation review.');
    } else {
      flash('error', res.error || 'Could not submit report.');
    }
  };

  const formatCountdown = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'Closing soon';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#1677FF]/30 bg-[#102440]/90 shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
        <img
          src={realmCitadelGatheringImg}
          alt="Citadel Council Chamber"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 p-5 sm:p-6 bg-gradient-to-r from-[#061225]/95 via-[#0A1930]/85 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                Aetheria Realm Council
              </span>
              <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC] tabular-nums">
                {communityDecisionPolls.length} Active Votes
              </span>
            </div>
            <h2 className="text-2xl font-black font-['Cinzel'] text-white">
              COMMUNITY DECISIONS
            </h2>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Vote on upcoming community events, weekly raid boss themes, seasonal rewards, and challenge categories. Published decrees are preserved in the council archive.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-300/90 bg-[#061225]/85 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 shrink-0">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>One Verified Ballot Per Player</span>
          </div>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl border text-xs font-semibold ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Active Polls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {communityDecisionPolls.length === 0 ? (
          <div className="lg:col-span-2 rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-8 text-center shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
            <Scale className="w-8 h-8 text-[#00D9FF]/80 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No Active Council Votes Right Now</p>
            <p className="text-xs text-[#A9B8CC] mt-1">Check back soon or review published decrees below.</p>
          </div>
        ) : (
          communityDecisionPolls.map(poll => {
            const currentSelection = draftSelections[poll.id] ?? poll.mySelectedOptionIds;
            const totalVotes = Math.max(1, poll.totalVotes);
            const isBusy = busyPollId === poll.id;

            return (
              <div
                key={poll.id}
                className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-5 flex flex-col justify-between gap-4 shadow-[0_12px_32px_rgba(2,8,20,0.6)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs mb-2">
                    <span className="font-['Cinzel'] font-bold text-[#00D9FF] capitalize">
                      {poll.category.replace('_', ' ')} · {poll.pollType === 'multiple_choice' ? `Up to ${poll.maxChoices}` : 'Single Choice'}
                    </span>
                    <span className="flex items-center gap-1 text-[#A9B8CC] tabular-nums shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formatCountdown(poll.closesAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-['Cinzel'] text-white">{poll.title}</h3>
                  <p className="text-xs text-[#A9B8CC] mt-1">{poll.description}</p>

                  <div className="space-y-2.5 mt-4">
                    {poll.options.map(opt => {
                      const selected = currentSelection.includes(opt.id);
                      const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(poll.id, opt.id, poll.pollType, poll.maxChoices)}
                          className={`w-full text-left rounded-xl border p-3 transition-all ${
                            selected
                              ? 'bg-[#0A1930] border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.18)]'
                              : 'bg-[#061225] border-[#1677FF]/20 hover:border-[#00D9FF]/45'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                            <span className="flex items-center gap-2">
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 ${
                                  selected ? 'text-[#00D9FF]' : 'text-[#A9B8CC]/35'
                                }`}
                              />
                              {opt.label}
                            </span>
                            {poll.showLiveResults && (
                              <span className="font-mono text-[11px] text-[#00D9FF] tabular-nums">
                                {pct}% ({opt.voteCount})
                              </span>
                            )}
                          </div>
                          {opt.description && (
                            <p className="text-[11px] text-[#A9B8CC] mt-1 pl-6">{opt.description}</p>
                          )}
                          {poll.showLiveResults && (
                            <div className="mt-2 ml-6 h-1.5 rounded-full bg-[#0A1930] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#1677FF] to-[#00D9FF]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1677FF]/20">
                  <div className="flex items-center gap-3 text-xs text-[#A9B8CC] tabular-nums">
                    <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReportingPollId(poll.id);
                        setReportReason('');
                      }}
                      className="flex items-center gap-1 text-[#A9B8CC]/75 hover:text-rose-300 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleSubmitVote(poll.id, poll.mySelectedOptionIds)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)] text-xs font-bold whitespace-nowrap shrink-0 transition-all"
                  >
                    <Vote className="w-4 h-4 shrink-0" />
                    <span>
                      {isBusy
                        ? 'Submitting...'
                        : poll.mySelectedOptionIds.length > 0
                          ? 'Update Ballot'
                          : 'Cast Ballot'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Published Archive */}
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-5 shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
        <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#00D9FF] mb-3">
          <Archive className="w-4 h-4" />
          <span>Published Council Archive</span>
        </div>

        {communityDecisionArchive.length === 0 ? (
          <p className="text-xs text-[#A9B8CC]">No archived council decrees yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {communityDecisionArchive.map(item => (
              <div key={item.id} className="rounded-xl bg-[#061225] border border-[#1677FF]/25 p-4">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#A9B8CC]">
                  <span className="capitalize">{item.category.replace('_', ' ')}</span>
                  <span className="tabular-nums">{item.totalVotes} Total Votes</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">{item.title}</h4>
                {item.publishedOutcome && (
                  <p className="text-xs text-emerald-300 mt-1.5">
                    Enacted Outcome: {item.publishedOutcome}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportingPollId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061225]/85 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-md rounded-2xl bg-[#102440] border border-[#00D9FF]/40 p-5 space-y-4 shadow-[0_20px_50px_rgba(2,8,20,0.8)]"
          >
            <h3 className="text-base font-bold font-['Cinzel'] text-white">
              Report Poll Concern
            </h3>
            <p className="text-xs text-[#A9B8CC]">
              Describe why this poll requires council moderator review.
            </p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder="Explain concern..."
              className="w-full rounded-xl bg-[#061225] border border-[#1677FF]/35 p-3 text-xs text-white placeholder-[#A9B8CC]/50 focus:outline-none focus:border-[#00D9FF]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportingPollId(null)}
                className="px-3.5 py-2 rounded-lg bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/30 text-xs text-[#A9B8CC] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
