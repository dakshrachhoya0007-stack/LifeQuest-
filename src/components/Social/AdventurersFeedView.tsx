import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import type { FeedCommentPermission, FeedFilter, FeedReactionKey } from '../../types/game';
import { FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  CheckCircle2,
  Flame,
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
      title: noteTitle.trim() || `${sess?.exerciseName || 'Training'} Session Completed`,
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
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="lq-surface rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Cinzel'] font-bold text-lg text-[#F2F7FF] flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#00D9FF]" />
            Adventurer’s Activity Feed
          </h2>
          <p className="text-xs text-[#94A8C7] mt-0.5">
            Live stream of verified workouts, personal bests, achievements, level-ups, and Rivals results—respecting privacy &amp; blocks.
          </p>
        </div>

        <FeatureTabBar
          tabs={FEED_FILTERS}
          activeId={feedFilter}
          onSelect={id => void refreshActivityFeed(id, 1)}
          ariaLabel="Activity feed filters"
          layoutId="feed-filter-tab"
        />
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#10B981]/15 border-[#10B981]/45 text-[#10B981]'
              : 'bg-[#F43F5E]/15 border-[#F43F5E]/45 text-[#FB7185]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Share Verified Workout Reflection */}
      <form
        onSubmit={handleShareNote}
        className="lq-surface rounded-2xl p-5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-['Cinzel'] font-bold text-sm text-[#38D9F5]">
            Share Verified Training Milestone
          </h3>
          <span className="text-[11px] text-[#94A8C7]">
            Requires a logged fitness session—prevents duplicate or unverified posts
          </span>
        </div>

        {fitnessSessions.length === 0 ? (
          <p className="text-xs text-[#94A8C7]">
            Log a workout in Fitness Log first to unlock sharing training reflections with companions.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="md:col-span-4 lq-input py-2 px-3 text-xs"
            >
              {fitnessSessions.slice(0, 12).map(s => (
                <option key={s.id} value={s.id}>
                  {s.exerciseName} · {s.durationMinutes}m ({new Date(s.timestamp).toLocaleDateString()})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              placeholder="Headline (optional)"
              maxLength={70}
              className="md:col-span-4 lq-input py-2 px-3 text-xs"
            />
            <select
              value={commentPerm}
              onChange={e => setCommentPerm(e.target.value as FeedCommentPermission)}
              className="md:col-span-4 lq-input py-2 px-3 text-xs"
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
                className="lq-input py-2 px-3 text-xs w-full"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === 'share-note'}
              className="md:col-span-2 lq-btn lq-btn-primary py-2 px-4 rounded-xl text-xs whitespace-nowrap font-semibold cursor-pointer"
            >
              {busyId === 'share-note' ? 'Posting...' : 'Share Post'}
            </button>
          </div>
        )}
      </form>

      {/* Posts List */}
      {feedLoading && posts.length === 0 ? (
        <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#94A8C7]">
          Loading Adventurer’s Activity Feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="lq-surface rounded-2xl p-10 text-center space-y-2">
          <p className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">No Activity Posts Yet</p>
          <p className="text-xs text-[#94A8C7]">
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
                className="lq-card rounded-2xl p-5 space-y-4"
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
                        className="w-10 h-10 rounded-xl object-cover object-top border border-[#1677FF]/60"
                      />
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openPublicProfile(post.authorId)}
                          className="font-bold text-[#F2F7FF] hover:text-[#00D9FF] transition-colors cursor-pointer"
                        >
                          {post.authorUsername}
                        </button>
                        <span className="text-[#647A9E]" aria-hidden="true">·</span>
                        <span className="text-[#38D9F5] capitalize">{post.category.replace('_', ' ')}</span>
                        <span className="text-[#647A9E]" aria-hidden="true">·</span>
                        <span className="text-[#647A9E] tabular-nums">
                          {new Date(post.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] mt-0.5 flex items-center gap-1.5">
                        {post.verified && (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
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
                        className="lq-input py-1 px-2 text-[11px] w-auto"
                      >
                        <option value="everyone">Comments: All</option>
                        <option value="friends">Comments: Friends</option>
                        <option value="nobody">Comments: Off</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void deleteFeedPost(post.id)}
                        aria-label="Delete post"
                        className="p-1.5 rounded-lg bg-[#061225] hover:bg-[#F43F5E]/15 text-[#FB7185] border border-[#1E3A63] hover:border-[#F43F5E]/45 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[#94A8C7] leading-relaxed">
                  {post.summary}
                  {post.highlightValue ? (
                    <span className="ml-2 font-mono font-bold text-[#38D9F5] tabular-nums">
                      ({post.highlightValue})
                    </span>
                  ) : null}
                </p>

                {/* Reactions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E3A63]">
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
                            ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] border-[#00D9FF]/60 text-[#F2F7FF] shadow-[0_4px_12px_rgba(22,119,255,0.3)]'
                            : 'bg-[#061225] border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF] hover:border-[#00D9FF]'
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
                    <div className="space-y-1.5 rounded-xl bg-[#061225] border border-[#1E3A63] p-3">
                      {post.comments.map(c => (
                        <div key={c.id} className="text-xs">
                          <span className="font-semibold text-[#F2F7FF]">{c.authorUsername}: </span>
                          <span className="text-[#94A8C7]">{c.body}</span>
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
                        className="lq-input flex-1 py-1.5 px-3 text-xs"
                      />
                      <button
                        type="button"
                        disabled={busyId === `comment-${post.id}`}
                        onClick={() => void handleCommentSubmit(post.id)}
                        className="lq-btn lq-btn-secondary py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Send className="w-3 h-3 text-[#00D9FF]" />
                        Reply
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#647A9E] flex items-center gap-1">
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
                className="lq-btn lq-btn-secondary py-2 px-4 rounded-xl text-xs cursor-pointer"
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

