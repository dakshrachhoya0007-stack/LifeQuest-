import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { realmCitadelGatheringImg } from '../../assets/images';
import {
  AnimatedProgressBar,
  RpgModalWrapper,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#7045A0]/45 bg-[#171220] shadow-[0_16px_38px_-14px_rgba(5,3,10,0.88)]">
        <img
          src={realmCitadelGatheringImg}
          alt="Citadel Council Chamber"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 p-5 sm:p-6 bg-gradient-to-r from-[#100D18]/95 via-[#171220]/85 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
                Aetheria Realm Council
              </span>
              <span className="text-[#766D82]" aria-hidden="true">·</span>
              <span className="text-[#A69AAF] font-mono tabular-nums">
                {communityDecisionPolls.length} Active Votes
              </span>
            </div>
            <h2 className="text-2xl font-black font-['Cinzel'] text-[#F2EDF7]">
              Community Decisions
            </h2>
            <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
              Vote on upcoming community events, weekly raid boss themes, seasonal rewards, and challenge categories. Published decrees are preserved in the council archive.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#49B88A] bg-[#100D18]/90 border border-[#49B88A]/40 rounded-xl px-3.5 py-2.5 shrink-0">
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
              ? 'bg-[#49B88A]/12 border-[#49B88A]/45 text-[#49B88A]'
              : 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Active Polls */}
      {communityDecisionPolls.length === 0 ? (
        <div className="lq-surface rounded-2xl p-8 text-center">
          <Scale className="w-8 h-8 text-[#D6A84B] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#F2EDF7]">No Active Council Votes Right Now</p>
          <p className="text-xs text-[#A69AAF] mt-1">Check back soon or review published decrees below.</p>
        </div>
      ) : (
        <RpgStaggerGrid className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {communityDecisionPolls.map(poll => {
            const currentSelection = draftSelections[poll.id] ?? poll.mySelectedOptionIds;
            const totalVotes = Math.max(1, poll.totalVotes);
            const isBusy = busyPollId === poll.id;

            return (
              <RpgStaggerItem key={poll.id}>
                <div className="lq-card rounded-2xl p-5 h-full flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-3 text-xs mb-2">
                      <span className="font-['Cinzel'] font-bold text-[#E8C777] capitalize">
                        {poll.category.replace('_', ' ')} · {poll.pollType === 'multiple_choice' ? `Up to ${poll.maxChoices}` : 'Single Choice'}
                      </span>
                      <span className="flex items-center gap-1 text-[#A69AAF] font-mono tabular-nums shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {formatCountdown(poll.closesAt)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold font-['Cinzel'] text-[#F2EDF7]">{poll.title}</h3>
                    <p className="text-xs text-[#A69AAF] mt-1">{poll.description}</p>

                    <div className="space-y-2.5 mt-4">
                      {poll.options.map(opt => {
                        const selected = currentSelection.includes(opt.id);
                        const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleOption(poll.id, opt.id, poll.pollType, poll.maxChoices)}
                            className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#21152F] border-[#D6A84B] shadow-[0_0_16px_rgba(214,168,75,0.16)]'
                                : 'bg-[#100D18] border-[#362B45] hover:border-[#7045A0]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#F2EDF7]">
                              <span className="flex items-center gap-2">
                                <CheckCircle2
                                  className={`w-4 h-4 shrink-0 ${
                                    selected ? 'text-[#E8C777]' : 'text-[#766D82]'
                                  }`}
                                />
                                {opt.label}
                              </span>
                              {poll.showLiveResults && (
                                <span className="font-mono text-[11px] text-[#E8C777] tabular-nums">
                                  {pct}% ({opt.voteCount})
                                </span>
                              )}
                            </div>
                            {opt.description && (
                              <p className="text-[11px] text-[#A69AAF] mt-1 pl-6">{opt.description}</p>
                            )}
                            {poll.showLiveResults && (
                              <div className="mt-2 ml-6">
                                <AnimatedProgressBar
                                  percentage={pct}
                                  className="h-1.5 rounded-full bg-[#171220] overflow-hidden border border-[#362B45]"
                                  barClassName="bg-gradient-to-r from-[#7045A0] to-[#D6A84B]"
                                  shimmer={false}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#362B45]">
                    <div className="flex items-center gap-3 text-xs text-[#A69AAF] font-mono tabular-nums">
                      <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReportingPollId(poll.id);
                          setReportReason('');
                        }}
                        className="flex items-center gap-1 text-[#A69AAF] hover:text-[#D65C66] font-sans transition-colors cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleSubmitVote(poll.id, poll.mySelectedOptionIds)}
                      className="lq-btn lq-btn-gold flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
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
              </RpgStaggerItem>
            );
          })}
        </RpgStaggerGrid>
      )}

      {/* Published Archive */}
      <div className="lq-surface rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#E8C777] mb-3">
          <Archive className="w-4 h-4 text-[#D6A84B]" />
          <span>Published Council Archive</span>
        </div>

        {communityDecisionArchive.length === 0 ? (
          <p className="text-xs text-[#A69AAF]">No archived council decrees yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {communityDecisionArchive.map(item => (
              <div key={item.id} className="rounded-xl bg-[#100D18] border border-[#362B45] p-4">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#A69AAF]">
                  <span className="capitalize">{item.category.replace('_', ' ')}</span>
                  <span className="tabular-nums font-mono">{item.totalVotes} Total Votes</span>
                </div>
                <h4 className="text-sm font-bold text-[#F2EDF7] mt-1">{item.title}</h4>
                {item.publishedOutcome && (
                  <p className="text-xs text-[#49B88A] mt-1.5">
                    Enacted Outcome: {item.publishedOutcome}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <RpgModalWrapper
        isOpen={Boolean(reportingPollId)}
        onClose={() => setReportingPollId(null)}
        panelClassName="w-full max-w-md"
      >
        <form
          onSubmit={handleSubmitReport}
          className="lq-surface-elevated rounded-2xl border border-[#D65C66]/45 p-5 space-y-4"
        >
          <h3 className="text-base font-bold font-['Cinzel'] text-[#F2EDF7]">
            Report Poll Concern
          </h3>
          <p className="text-xs text-[#A69AAF]">
            Describe why this poll requires council moderator review.
          </p>
          <textarea
            rows={3}
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Explain concern..."
            className="lq-input w-full p-3 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportingPollId(null)}
              className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="lq-btn px-4 py-2 rounded-lg bg-[#D65C66] hover:brightness-110 text-[#100D18] text-xs font-bold cursor-pointer"
            >
              Submit Report
            </button>
          </div>
        </form>
      </RpgModalWrapper>
    </div>
  );
};
