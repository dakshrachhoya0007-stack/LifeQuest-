import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import type { FeedCommentPermission, FeedFilter, FeedReactionKey } from '../../types/game';
import {
  CheckCircle2,
  Flame,
  MessageSquare,
  Send,
  Shield,
  Trash2,
} from 'lucide-react';

const FEED_FILTERS: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'All Activity' },
  { id: 'friends', label: 'Friends' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'competitions', label: 'Competitions' },
];

const REACTION_BUTTONS: Array<{ key: FeedReactionKey; label: string }> = [
  { key: 'like', label: 'Like' },
  { key: '🔥', label: '🔥' },
  { key: '⚔️', label: '⚔️' },
  { key: '🏆', label: '🏆' },
  { key: '💪', label: '💪' },
];

export const AdventurersFeedView: React.FC = () => {
  const {
    user,
    fitnessSessions,
    feedData,
    feedFilter,
    feedLoading,
    refreshActivityFeed,
    shareFeedWorkoutNote,
    reactToFeedPost,
    commentOnFeedPost,
    deleteFeedPost,
    updateFeedCommentPermission,
    openPublicProfile,
  } = useGame();

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSummary, setNoteSummary] = useState('');
  const [commentPerm, setCommentPerm] = useState<FeedCommentPermission>('everyone');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshActivityFeed('all', 1);
  }, []);

  useEffect(() => {
    if (!selectedSessionId && fitnessSessions.length > 0) {
      setSelectedSessionId(fitnessSessions[0].id);
    }
  }, [fitnessSessions, selectedSessionId]);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3200);
  };

  const handleShareNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !noteSummary.trim()) return;
    const sess = fitnessSessions.find(s => s.id === selectedSessionId);
    setBusyId('share-note');
    const res = await shareFeedWorkoutNote({
      verifiedRef: selectedSessionId,
      title: noteTitle.trim() || `${sess?.exerciseName || sess?.exerciseType || 'Training'} Session Completed`,
      summary: noteSummary.trim(),
      highlightValue: sess ? `${sess.durationMinutes}m` : undefined,
      commentPermission: commentPerm,
    });
    setBusyId(null);
    if (res.success) {
      setNoteTitle('');
      setNoteSummary('');
      flash('success', 'Verified workout update shared to the Adventurer Feed.');
    } else {
      flash('error', res.error || 'Could not share workout note.');
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;
    setBusyId(`comment-${postId}`);
    const res = await commentOnFeedPost(postId, body);
    setBusyId(null);
    if (res.success) {
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
    } else {
      flash('error', res.error || 'Could not post comment.');
    }
  };

  const posts = feedData?.posts || [];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/30 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
        <div>
          <h2 className="font-['Cinzel'] font-bold text-lg text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FBBF24]" />
            Adventurer’s Activity Feed
          </h2>
          <p className="text-xs text-[#A1A1B8] mt-0.5">
            Live stream of verified workouts, personal bests, achievements, level-ups, and Rivals results—respecting privacy & blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FEED_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => void refreshActivityFeed(f.id, 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                feedFilter === f.id
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white border border-[#D6A84B]/40 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                  : 'bg-[#0E0E17] text-[#A1A1B8] border border-white/10 hover:text-white hover:border-[#8B5CF6]/45'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#34D399]/10 border-[#34D399]/40 text-[#34D399]'
              : 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[#FB7185]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Share Verified Workout Reflection */}
      <form
        onSubmit={handleShareNote}
        className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/25 p-5 space-y-3 shadow-[0_12px_32px_rgba(9,9,16,0.55)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-['Cinzel'] font-bold text-sm text-[#D6A84B]">
            Share Verified Training Milestone
          </h3>
          <span className="text-[11px] text-[#A1A1B8]">
            Requires a logged fitness session—prevents duplicate or unverified posts
          </span>
        </div>

        {fitnessSessions.length === 0 ? (
          <p className="text-xs text-[#A1A1B8]">
            Log a workout in Fitness Log first to unlock sharing training reflections with companions.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="md:col-span-4 rounded-xl bg-[#0E0E17] border border-white/15 focus:border-[#8B5CF6] focus:outline-none px-3 py-2 text-xs text-white"
            >
              {fitnessSessions.slice(0, 12).map(s => (
                <option key={s.id} value={s.id}>
                  {s.exerciseName || s.exerciseType} · {s.durationMinutes}m ({new Date(s.timestamp).toLocaleDateString()})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              placeholder="Headline (optional)"
              maxLength={70}
              className="md:col-span-4 rounded-xl bg-[#0E0E17] border border-white/15 focus:border-[#8B5CF6] focus:outline-none px-3 py-2 text-xs text-white placeholder-[#A1A1B8]/50"
            />
            <select
              value={commentPerm}
              onChange={e => setCommentPerm(e.target.value as FeedCommentPermission)}
              className="md:col-span-4 rounded-xl bg-[#0E0E17] border border-white/15 focus:border-[#8B5CF6] focus:outline-none px-3 py-2 text-xs text-white"
            >
              <option value="everyone">Comments: Everyone</option>
              <option value="friends">Comments: Friends Only</option>
              <option value="nobody">Comments: Disabled</option>
            </select>
            <div className="md:col-span-10">
              <input
                type="text"
                required
                maxLength={240}
                value={noteSummary}
                onChange={e => setNoteSummary(e.target.value)}
                placeholder="Share how the session felt or what milestone you reached..."
                className="w-full rounded-xl bg-[#0E0E17] border border-white/15 focus:border-[#8B5CF6] focus:outline-none px-3 py-2 text-xs text-white placeholder-[#A1A1B8]/50"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === 'share-note'}
              className="md:col-span-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BFA] text-white text-xs font-bold whitespace-nowrap shadow-[0_0_14px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
            >
              {busyId === 'share-note' ? 'Posting...' : 'Share Post'}
            </button>
          </div>
        )}
      </form>

      {/* Posts List */}
      {feedLoading && posts.length === 0 ? (
        <div className="rounded-2xl bg-[#141420]/95 border border-white/10 p-8 text-center text-xs text-[#A1A1B8]">
          Loading Adventurer’s Activity Feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-[#141420]/95 border border-white/10 p-10 text-center space-y-2">
          <p className="font-['Cinzel'] font-bold text-sm text-white">No Activity Posts Yet</p>
          <p className="text-xs text-[#A1A1B8]">
            Real verified workouts, personal records, level-ups, and achievements from you and your companions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const isAuthor = user?.id === post.authorId;
            return (
              <article
                key={post.id}
                className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/25 hover:border-[#D6A84B]/45 p-5 space-y-4 transition-all shadow-[0_12px_32px_rgba(9,9,16,0.55)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openPublicProfile(post.authorId)}
                      className="shrink-0 cursor-pointer"
                    >
                      <img
                        src={getRpgAvatarForClass(post.authorClass)}
                        alt={post.authorUsername}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover object-top border border-[#D6A84B]/50"
                      />
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openPublicProfile(post.authorId)}
                          className="font-bold text-white hover:text-[#D6A84B] cursor-pointer"
                        >
                          {post.authorUsername}
                        </button>
                        <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
                        <span className="text-[#8B5CF6] capitalize font-semibold">{post.category.replace('_', ' ')}</span>
                        <span className="text-[#A1A1B8]/40" aria-hidden="true">·</span>
                        <span className="text-[#A1A1B8]/70 tabular-nums">
                          {new Date(post.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-white mt-0.5 flex items-center gap-1.5">
                        {post.verified && (
                          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                        )}
                        {post.title}
                      </h3>
                    </div>
                  </div>

                  {isAuthor && (
                    <div className="flex items-center gap-2">
                      <select
                        value={post.commentPermission}
                        onChange={e =>
                          void updateFeedCommentPermission(
                            post.id,
                            e.target.value as FeedCommentPermission
                          )
                        }
                        aria-label="Comment permission"
                        className="rounded-lg bg-[#0E0E17] border border-white/15 px-2 py-1 text-[11px] text-[#A1A1B8]"
                      >
                        <option value="everyone">Comments: All</option>
                        <option value="friends">Comments: Friends</option>
                        <option value="nobody">Comments: Off</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void deleteFeedPost(post.id)}
                        aria-label="Delete post"
                        className="p-1.5 rounded-lg bg-[#0E0E17] hover:bg-[#FB7185]/20 text-[#FB7185] border border-white/15 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[#A1A1B8] leading-relaxed">
                  {post.summary}
                  {post.highlightValue ? (
                    <span className="ml-2 font-mono font-bold text-[#34D399] tabular-nums">
                      ({post.highlightValue})
                    </span>
                  ) : null}
                </p>

                {/* Reactions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                  {REACTION_BUTTONS.map(rb => {
                    const count = post.reactions[rb.key] || 0;
                    const active = post.myReactions.includes(rb.key);
                    return (
                      <button
                        key={rb.key}
                        type="button"
                        onClick={() => void reactToFeedPost(post.id, rb.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 tabular-nums cursor-pointer ${
                          active
                            ? 'bg-[#8B5CF6]/25 border-[#8B5CF6]/70 text-white shadow-[0_0_10px_rgba(139,92,246,0.25)]'
                            : 'bg-[#0E0E17] border-white/10 text-[#A1A1B8] hover:text-white hover:border-[#8B5CF6]/45'
                        }`}
                      >
                        <span>{rb.label}</span>
                        {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Comments Thread */}
                <div className="space-y-2.5 pt-1">
                  {post.comments.length > 0 && (
                    <div className="space-y-1.5 pl-3 border-l border-[#8B5CF6]/35">
                      {post.comments.map(c => (
                        <div key={c.id} className="text-xs">
                          <span className="font-semibold text-white">{c.authorUsername}: </span>
                          <span className="text-[#A1A1B8]">{c.body}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {post.canComment ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={240}
                        value={commentDrafts[post.id] || ''}
                        onChange={e =>
                          setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder="Write an encouraging comment..."
                        className="flex-1 rounded-xl bg-[#0E0E17] border border-white/15 px-3 py-1.5 text-xs text-white placeholder-[#A1A1B8]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <button
                        type="button"
                        disabled={busyId === `comment-${post.id}`}
                        onClick={() => void handleCommentSubmit(post.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#1B1B2B] hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/40 hover:border-[#8B5CF6] text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                      >
                        <Send className="w-3 h-3 text-[#8B5CF6]" />
                        Reply
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#A1A1B8]/60 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Comments restricted by author privacy settings.
                    </p>
                  )}
                </div>
              </article>
            );
          })}

          {feedData?.hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={feedLoading}
                onClick={() => void refreshActivityFeed(feedFilter, (feedData.page || 1) + 1)}
                className="px-5 py-2.5 rounded-xl bg-[#141420] hover:bg-[#1B1B2B] border border-[#8B5CF6]/40 hover:border-[#8B5CF6] text-xs font-semibold text-white transition-all cursor-pointer"
              >
                {feedLoading ? 'Loading More...' : 'Load Older Activity'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
