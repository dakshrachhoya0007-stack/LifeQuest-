import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import type {
  CharacterClass,
  FeedComment,
  FeedCommentPermission,
  FeedFilter,
  FeedListResponse,
  FeedPost,
  FeedPostCategory,
  FeedReactionKey,
} from '../src/types/game.ts';
import type { PrivacyFieldKey, SyncedProfileRecord } from './presenceAndPrivacy.ts';

interface StoredFeedPost {
  id: string;
  authorId: string;
  authorUsername: string;
  authorClass: CharacterClass;
  authorLevel: number;
  category: FeedPostCategory;
  eventKey: string;
  title: string;
  summary: string;
  highlightValue?: string | null;
  privacyScope: 'everyone' | 'friends' | 'nobody';
  commentPermission: FeedCommentPermission;
  verified: boolean;
  reactionsByEmoji: Record<FeedReactionKey, string[]>;
  comments: FeedComment[];
  createdAt: string;
}

interface ActivityFeedLedgerFile {
  posts: StoredFeedPost[];
}

const VALID_REACTIONS = new Set<FeedReactionKey>(['like', '🔥', '⚔️', '🏆', '💪']);
const VALID_COMMENT_PERMS = new Set<FeedCommentPermission>(['everyone', 'friends', 'nobody']);
const VALID_FILTERS = new Set<FeedFilter>(['all', 'friends', 'achievements', 'workouts', 'competitions']);

export interface ActivityFeedDeps {
  privacyHelper: {
    getRelationForUsers: (
      targetId: string,
      viewerId: string | null
    ) => { relation: 'self' | 'friends' | 'none' | 'blocked'; blockedByMe: boolean };
    getProfileSnapshot: (userId: string) => SyncedProfileRecord | null;
    canViewFieldForUsers: (
      targetId: string,
      viewerId: string | null,
      field: PrivacyFieldKey
    ) => boolean;
    broadcastDomainEvent: (eventType: string, payload: unknown, targetUserIds?: string[]) => void;
  };
  onSocialInteraction?: (params: {
    recipientUserId: string;
    actorUserId: string;
    actorUsername: string;
    kind: 'like' | 'reaction' | 'comment';
    postId: string;
    postTitle: string;
    detail?: string;
  }) => Promise<void>;
}

const categoryToPrivacyField = (cat: FeedPostCategory): PrivacyFieldKey => {
  switch (cat) {
    case 'workout':
      return 'workoutHistory';
    case 'record':
      return 'personalRecords';
    case 'achievement':
      return 'achievements';
    case 'level_up':
      return 'level';
    case 'competition':
    case 'milestone':
    default:
      return 'achievements';
  }
};

export function createActivityFeedService(rootDir: string, deps: ActivityFeedDeps) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_activity_feed.json');
  let queue: Promise<void> = Promise.resolve();

  const withLock = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    let release!: () => void;
    const prev = queue;
    queue = new Promise<void>(resolve => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  };

  const readLedger = (): ActivityFeedLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && Array.isArray(parsed.posts)) {
          return { posts: parsed.posts };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { posts: [] };
  };

  const writeLedger = (data: ActivityFeedLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const formatPostForViewer = (post: StoredFeedPost, viewerId: string): FeedPost | null => {
    const rel = deps.privacyHelper.getRelationForUsers(post.authorId, viewerId).relation;
    if (rel === 'blocked') return null;

    if (rel !== 'self') {
      if (post.privacyScope === 'nobody') return null;
      if (post.privacyScope === 'friends' && rel !== 'friends') return null;

      const privField = categoryToPrivacyField(post.category);
      if (!deps.privacyHelper.canViewFieldForUsers(post.authorId, viewerId, privField)) {
        return null;
      }
    }

    const canSeeFitnessStats =
      rel === 'self' ||
      deps.privacyHelper.canViewFieldForUsers(post.authorId, viewerId, 'fitnessStats');

    const canComment =
      rel === 'self' ||
      (post.commentPermission === 'everyone' ||
        (post.commentPermission === 'friends' && rel === 'friends'));

    const reactions: Record<FeedReactionKey, number> = {
      like: (post.reactionsByEmoji.like || []).length,
      '🔥': (post.reactionsByEmoji['🔥'] || []).length,
      '⚔️': (post.reactionsByEmoji['⚔️'] || []).length,
      '🏆': (post.reactionsByEmoji['🏆'] || []).length,
      '💪': (post.reactionsByEmoji['💪'] || []).length,
    };

    const myReactions = (Object.keys(reactions) as FeedReactionKey[]).filter(k =>
      (post.reactionsByEmoji[k] || []).includes(viewerId)
    );

    // Filter out comments from users who blocked viewer or whom viewer blocked
    const visibleComments = post.comments.filter(
      c => deps.privacyHelper.getRelationForUsers(c.authorId, viewerId).relation !== 'blocked'
    );

    return {
      id: post.id,
      authorId: post.authorId,
      authorUsername: post.authorUsername,
      authorClass: post.authorClass,
      authorLevel: deps.privacyHelper.canViewFieldForUsers(post.authorId, viewerId, 'level')
        ? post.authorLevel
        : 1,
      category: post.category,
      eventKey: post.eventKey,
      title: post.title,
      summary: post.summary,
      highlightValue:
        post.category === 'workout' && !canSeeFitnessStats ? 'Verified Workout' : post.highlightValue,
      privacyScope: post.privacyScope,
      commentPermission: post.commentPermission,
      canComment,
      verified: post.verified,
      reactions,
      myReactions,
      comments: visibleComments,
      createdAt: post.createdAt,
    };
  };

  /**
   * Server-trusted verified activity publication (deduped via (authorId, eventKey)).
   * Never creates fake achievements or duplicate posts.
   */
  const publishVerifiedPost = async (params: {
    authorId: string;
    authorUsername: string;
    authorClass?: CharacterClass;
    authorLevel?: number;
    category: FeedPostCategory;
    eventKey: string;
    title: string;
    summary: string;
    highlightValue?: string | null;
    commentPermission?: FeedCommentPermission;
  }): Promise<{ created: boolean; post?: StoredFeedPost }> => {
    const cleanKey = params.eventKey.trim();
    if (!params.authorId || !cleanKey) return { created: false };

    const snap = deps.privacyHelper.getProfileSnapshot(params.authorId);
    const priv = snap?.privacySettings;
    const defaultPrivacy: 'everyone' | 'friends' | 'nobody' = priv?.privateByDefault
      ? 'nobody'
      : snap?.profileVisibility === 'friends_only'
      ? 'friends'
      : snap?.profileVisibility === 'private'
      ? 'nobody'
      : 'everyone';

    const outcome = await withLock(() => {
      const ledger = readLedger();
      const dup = ledger.posts.find(
        p => p.authorId === params.authorId && p.eventKey === cleanKey
      );
      if (dup) return { created: false as const, post: dup };

      const newPost: StoredFeedPost = {
        id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        authorId: params.authorId,
        authorUsername: (params.authorUsername || snap?.username || 'Champion').slice(0, 48),
        authorClass: params.authorClass || (snap?.characterClass as CharacterClass) || 'Warrior',
        authorLevel: Math.max(1, Math.round(params.authorLevel ?? snap?.level ?? 1)),
        category: params.category,
        eventKey: cleanKey,
        title: params.title.trim().slice(0, 140),
        summary: params.summary.trim().slice(0, 420),
        highlightValue: params.highlightValue ? String(params.highlightValue).slice(0, 64) : null,
        privacyScope: defaultPrivacy,
        commentPermission:
          params.commentPermission && VALID_COMMENT_PERMS.has(params.commentPermission)
            ? params.commentPermission
            : 'everyone',
        verified: true,
        reactionsByEmoji: { like: [], '🔥': [], '⚔️': [], '🏆': [], '💪': [] },
        comments: [],
        createdAt: new Date().toISOString(),
      };

      ledger.posts.unshift(newPost);
      ledger.posts = ledger.posts.slice(0, 400);
      writeLedger(ledger);
      return { created: true as const, post: newPost };
    });

    if (outcome.created) {
      deps.privacyHelper.broadcastDomainEvent('feed:update', {
        action: 'post_created',
        postId: outcome.post.id,
        authorId: params.authorId,
      });
    }

    return outcome;
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/feed/list', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const filterRaw = String(req.query.filter || 'all').trim() as FeedFilter;
      const filter: FeedFilter = VALID_FILTERS.has(filterRaw) ? filterRaw : 'all';
      const page = Math.max(1, Math.round(Number(req.query.page || 1)));
      const limit = Math.min(30, Math.max(1, Math.round(Number(req.query.limit || 10))));

      const payload: FeedListResponse = await withLock(() => {
        const ledger = readLedger();
        const visible: FeedPost[] = [];
        for (const p of ledger.posts) {
          if (filter === 'friends') {
            const rel = deps.privacyHelper.getRelationForUsers(p.authorId, auth.userId!).relation;
            if (rel !== 'friends' && rel !== 'self') continue;
          } else if (filter === 'achievements') {
            if (p.category !== 'achievement' && p.category !== 'milestone' && p.category !== 'level_up') {
              continue;
            }
          } else if (filter === 'workouts') {
            if (p.category !== 'workout' && p.category !== 'record') continue;
          } else if (filter === 'competitions') {
            if (p.category !== 'competition') continue;
          }

          const formatted = formatPostForViewer(p, auth.userId!);
          if (formatted) visible.push(formatted);
        }

        const start = (page - 1) * limit;
        const paged = visible.slice(start, start + limit);
        return {
          posts: paged,
          page,
          limit,
          totalPosts: visible.length,
          hasMore: start + limit < visible.length,
        };
      });

      res.json({ success: true, ...payload });
    });

    // Reject unverified achievement claims; only verified server-linked notes or reflections allowed
    app.post('/api/feed/share-note', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if (body.category === 'achievement' || body.category === 'level_up' || body.verified === true) {
        res.status(400).json({
          success: false,
          error: 'Achievements and level-ups can only be announced by verified server progression.',
        });
        return;
      }

      const verifiedRef = String(body.verifiedRef || '').trim();
      const summary = String(body.summary || '').trim();
      if (verifiedRef.length < 3 || summary.length < 4 || summary.length > 350) {
        res.status(400).json({
          success: false,
          error: 'A verified activity reference and summary (4-350 chars) are required.',
        });
        return;
      }

      const resPost = await publishVerifiedPost({
        authorId: auth.userId,
        authorUsername: String(body.username || 'Champion'),
        category: 'workout',
        eventKey: `shared:${verifiedRef}`,
        title: String(body.title || 'Verified Training Reflection').slice(0, 100),
        summary,
        highlightValue: body.highlightValue ? String(body.highlightValue).slice(0, 48) : undefined,
        commentPermission: body.commentPermission,
      });

      if (!resPost.created) {
        res.status(409).json({ success: false, error: 'This verified activity has already been posted.' });
        return;
      }

      res.json({ success: true, postId: resPost.post?.id });
    });

    app.post('/api/feed/react', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const postId = String(req.body?.postId || '').trim();
      const emoji = String(req.body?.emoji || 'like').trim() as FeedReactionKey;
      const actorUsername = String(req.body?.username || 'Champion').slice(0, 48);
      if (!postId || !VALID_REACTIONS.has(emoji)) {
        res.status(400).json({ success: false, error: 'Invalid postId or reaction.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const post = ledger.posts.find(p => p.id === postId);
        if (!post) return { status: 404, payload: { success: false, error: 'Post not found.' } };

        const view = formatPostForViewer(post, auth.userId!);
        if (!view) {
          return { status: 403, payload: { success: false, error: 'You cannot interact with this post.' } };
        }

        if (!post.reactionsByEmoji[emoji]) post.reactionsByEmoji[emoji] = [];
        const list = post.reactionsByEmoji[emoji];
        const idx = list.indexOf(auth.userId!);
        let added = false;
        if (idx >= 0) {
          list.splice(idx, 1);
        } else {
          list.push(auth.userId!);
          added = true;
        }
        writeLedger(ledger);
        return {
          status: 200,
          added,
          postAuthorId: post.authorId,
          postTitle: post.title,
          payload: { success: true, post: formatPostForViewer(post, auth.userId!) },
        };
      });

      if (result.status === 200 && 'added' in result && result.added && result.postAuthorId !== auth.userId) {
        if (deps.onSocialInteraction) {
          await deps.onSocialInteraction({
            recipientUserId: result.postAuthorId!,
            actorUserId: auth.userId,
            actorUsername,
            kind: emoji === 'like' ? 'like' : 'reaction',
            postId,
            postTitle: result.postTitle!,
            detail: emoji === 'like' ? undefined : emoji,
          });
        }
      }
      if (result.status === 200) {
        deps.privacyHelper.broadcastDomainEvent('feed:update', { action: 'reaction', postId });
      }

      res.status(result.status).json(result.payload);
    });

    app.post('/api/feed/comment', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const postId = String(req.body?.postId || '').trim();
      const bodyText = String(req.body?.body || '').trim();
      const actorUsername = String(req.body?.username || 'Champion').slice(0, 48);
      if (!postId || bodyText.length < 1 || bodyText.length > 400) {
        res.status(400).json({ success: false, error: 'Comment must be 1–400 characters.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const post = ledger.posts.find(p => p.id === postId);
        if (!post) return { status: 404, payload: { success: false, error: 'Post not found.' } };

        const view = formatPostForViewer(post, auth.userId!);
        if (!view || !view.canComment) {
          return {
            status: 403,
            payload: { success: false, error: 'Comments are restricted by the author.' },
          };
        }

        const comment: FeedComment = {
          id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          postId,
          authorId: auth.userId!,
          authorUsername: actorUsername,
          body: bodyText,
          createdAt: new Date().toISOString(),
        };
        post.comments.push(comment);
        post.comments = post.comments.slice(-80);
        writeLedger(ledger);
        return {
          status: 200,
          postAuthorId: post.authorId,
          postTitle: post.title,
          commentId: comment.id,
          payload: { success: true, post: formatPostForViewer(post, auth.userId!) },
        };
      });

      if (result.status === 200 && 'postAuthorId' in result && result.postAuthorId !== auth.userId) {
        if (deps.onSocialInteraction) {
          await deps.onSocialInteraction({
            recipientUserId: result.postAuthorId!,
            actorUserId: auth.userId,
            actorUsername,
            kind: 'comment',
            postId,
            postTitle: result.postTitle!,
            detail: bodyText.slice(0, 90),
          });
        }
      }
      if (result.status === 200) {
        deps.privacyHelper.broadcastDomainEvent('feed:update', { action: 'comment', postId });
      }

      res.status(result.status).json(result.payload);
    });

    app.post('/api/feed/permissions', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const postId = String(req.body?.postId || '').trim();
      const permission = String(req.body?.commentPermission || '').trim() as FeedCommentPermission;
      if (!postId || !VALID_COMMENT_PERMS.has(permission)) {
        res.status(400).json({ success: false, error: 'Invalid postId or commentPermission.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const post = ledger.posts.find(p => p.id === postId);
        if (!post) return { status: 404, payload: { success: false, error: 'Post not found.' } };
        if (post.authorId !== auth.userId) {
          return { status: 403, payload: { success: false, error: 'Only the post owner may change permissions.' } };
        }
        post.commentPermission = permission;
        writeLedger(ledger);
        return { status: 200, payload: { success: true, post: formatPostForViewer(post, auth.userId!) } };
      });

      if (result.status === 200) {
        deps.privacyHelper.broadcastDomainEvent('feed:update', { action: 'permissions', postId });
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/feed/delete', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const postId = String(req.body?.postId || '').trim();
      if (!postId) {
        res.status(400).json({ success: false, error: 'Missing postId.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const idx = ledger.posts.findIndex(p => p.id === postId);
        if (idx === -1) return { status: 404, payload: { success: false, error: 'Post not found.' } };
        if (ledger.posts[idx].authorId !== auth.userId) {
          return { status: 403, payload: { success: false, error: 'Forbidden: cannot delete another adventurer’s post.' } };
        }
        ledger.posts.splice(idx, 1);
        writeLedger(ledger);
        return { status: 200, payload: { success: true } };
      });

      if (result.status === 200) {
        deps.privacyHelper.broadcastDomainEvent('feed:update', { action: 'deleted', postId });
      }
      res.status(result.status).json(result.payload);
    });
  };

  return {
    registerRoutes,
    publishVerifiedPost,
  };
}
