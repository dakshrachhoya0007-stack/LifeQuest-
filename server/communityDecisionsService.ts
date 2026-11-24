import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import type {
  CommunityPoll,
  CommunityPollCategory,
  CommunityPollReport,
  CommunityPollType,
} from '../src/types/game.ts';

interface StoredPoll extends Omit<CommunityPoll, 'mySelectedOptionIds' | 'totalVotes' | 'reportCount'> {
  votesByUser: Record<string, string[]>;
}

interface DecisionsLedgerFile {
  polls: StoredPoll[];
  reports: CommunityPollReport[];
}

const VALID_CATEGORIES = new Set<CommunityPollCategory>([
  'community_event',
  'boss_theme',
  'seasonal_reward',
  'challenge_category',
]);

const buildDefaultPolls = (now = new Date()): StoredPoll[] => {
  const nextWeek = new Date(now.getTime() + 7 * 86400_000).toISOString();
  const prevWeekEnd = new Date(now.getTime() - 3 * 86400_000).toISOString();
  const prevWeekStart = new Date(now.getTime() - 10 * 86400_000).toISOString();
  return [
    {
      id: 'poll-next-boss-theme',
      title: 'Next Weekly Raid Titan Theme',
      description: 'Vote on which realm boss archetype should emerge for next week’s community raid.',
      category: 'boss_theme',
      pollType: 'single_choice',
      maxChoices: 1,
      status: 'active',
      showLiveResults: true,
      options: [
        {
          id: 'opt_starfall',
          label: 'Celestial Starfall Colossus',
          description: 'Astral-forged titan favoring endurance & consistency combos.',
          voteCount: 0,
        },
        {
          id: 'opt_ember',
          label: 'Emberforge Siege Golem',
          description: 'Obsidian furnace construct centered on strength reps.',
          voteCount: 0,
        },
        {
          id: 'opt_sylvan',
          label: 'Rootbound Ancient Warden',
          description: 'Vitality & recovery themed encounter rewarding balanced wellness.',
          voteCount: 0,
        },
      ],
      votesByUser: {},
      publishedOutcome: null,
      closesAt: nextWeek,
      createdAt: now.toISOString(),
      closedAt: null,
    },
    {
      id: 'poll-festival-challenges',
      title: 'Preferred Upcoming Community Event Challenges',
      description: 'Choose up to two challenge categories to feature in the next Live Community Moment.',
      category: 'challenge_category',
      pollType: 'multiple_choice',
      maxChoices: 2,
      status: 'active',
      showLiveResults: true,
      options: [
        { id: 'opt_cardio', label: 'Aerobic & Endurance Strides', voteCount: 0 },
        { id: 'opt_strength', label: 'Bodyweight & Strength Volume', voteCount: 0 },
        { id: 'opt_habits', label: 'Daily Habit & Focus Streaks', voteCount: 0 },
        { id: 'opt_parties', label: 'Cooperative Workout Parties', voteCount: 0 },
      ],
      votesByUser: {},
      publishedOutcome: null,
      closesAt: nextWeek,
      createdAt: now.toISOString(),
      closedAt: null,
    },
    {
      id: 'poll-archive-season-crest',
      title: 'Season 1 Cosmetic Crest Palette',
      description: 'Concluded community vote determining the twilight color scheme for Season 1.',
      category: 'seasonal_reward',
      pollType: 'single_choice',
      maxChoices: 1,
      status: 'published',
      showLiveResults: true,
      options: [
        { id: 'opt_amethyst', label: 'Royal Amethyst & Burnished Gold', voteCount: 0 },
        { id: 'opt_crimson', label: 'Obsidian Crimson', voteCount: 0 },
      ],
      votesByUser: {},
      publishedOutcome: 'Community selected Royal Amethyst & Burnished Gold as Season 1 aesthetic.',
      closesAt: prevWeekEnd,
      createdAt: prevWeekStart,
      closedAt: prevWeekEnd,
    },
  ];
};

export function createCommunityDecisionsService(
  rootDir: string,
  opts?: {
    onPollBroadcast?: (eventType: string, payload: unknown) => void;
    onPollNotification?: (params: {
      eventKey: string;
      title: string;
      body: string;
      userIds: string[];
    }) => Promise<void>;
    getKnownUserIds?: () => string[];
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_community_decisions.json');
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

  const readLedger = (): DecisionsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            polls: Array.isArray(parsed.polls) ? parsed.polls : buildDefaultPolls(),
            reports: Array.isArray(parsed.reports) ? parsed.reports : [],
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { polls: buildDefaultPolls(), reports: [] };
  };

  const writeLedger = (data: DecisionsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const refreshDeadlines = (ledger: DecisionsLedgerFile): boolean => {
    const now = Date.now();
    let changed = false;
    for (const poll of ledger.polls) {
      if (poll.status === 'active' && Date.parse(poll.closesAt) <= now) {
        poll.status = 'closed';
        poll.closedAt = new Date(now).toISOString();
        changed = true;
      }
    }
    return changed;
  };

  const toClientPoll = (p: StoredPoll, userId: string, reports: CommunityPollReport[]): CommunityPoll => {
    const myVotes = p.votesByUser[userId] || [];
    const totalVotes = Object.keys(p.votesByUser).length;
    const canSeeCounts =
      p.status === 'closed' ||
      p.status === 'published' ||
      (p.showLiveResults && (myVotes.length > 0 || p.status === 'active'));

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      pollType: p.pollType,
      maxChoices: p.maxChoices,
      status: p.status,
      showLiveResults: p.showLiveResults,
      options: p.options.map(o => ({
        ...o,
        voteCount: canSeeCounts ? o.voteCount : 0,
      })),
      totalVotes,
      mySelectedOptionIds: myVotes,
      publishedOutcome: p.publishedOutcome,
      closesAt: p.closesAt,
      createdAt: p.createdAt,
      closedAt: p.closedAt,
      reportCount: reports.filter(r => r.pollId === p.id && r.status === 'open').length,
    };
  };

  const isAuthorizedAdmin = (req: Request): boolean => {
    const expectedKey = process.env.LIFEQUEST_ADMIN_KEY || 'lifequest-local-admin';
    const provided = String(req.headers['x-lifequest-admin-key'] || '').trim();
    return Boolean(provided && provided === expectedKey);
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/decisions/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const payload = await withLock(() => {
        const ledger = readLedger();
        if (refreshDeadlines(ledger)) writeLedger(ledger);
        const polls = ledger.polls.map(p => toClientPoll(p, auth.userId!, ledger.reports));
        return {
          polls,
          reports: ledger.reports.filter(r => r.reporterId === auth.userId),
        };
      });

      res.json({ success: true, ...payload });
    });

    app.post('/api/decisions/vote', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const pollId = String(req.body?.pollId || '').trim();
      const optionIds: string[] = Array.isArray(req.body?.optionIds)
        ? Array.from(new Set<string>(req.body.optionIds.map((x: unknown) => String(x || '').trim()).filter(Boolean)))
        : [];

      if (!pollId || optionIds.length === 0) {
        res.status(400).json({ success: false, error: 'Select at least one option to cast your vote.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        refreshDeadlines(ledger);
        const poll = ledger.polls.find(p => p.id === pollId);
        if (!poll) return { status: 404, payload: { success: false, error: 'Poll not found.' } };
        if (poll.status !== 'active') {
          return { status: 400, payload: { success: false, error: `Poll is ${poll.status} and no longer accepting votes.` } };
        }
        if (poll.votesByUser[auth.userId!]) {
          return { status: 409, payload: { success: false, error: 'Duplicate vote rejected: you have already voted on this poll.' } };
        }

        const maxAllowed = poll.pollType === 'single_choice' ? 1 : Math.max(1, poll.maxChoices);
        if (optionIds.length > maxAllowed) {
          return {
            status: 400,
            payload: { success: false, error: `Select at most ${maxAllowed} option(s).` },
          };
        }

        const validOptIds = new Set(poll.options.map(o => o.id));
        for (const oid of optionIds) {
          if (!validOptIds.has(oid)) {
            return { status: 400, payload: { success: false, error: 'Invalid poll option.' } };
          }
        }

        poll.votesByUser[auth.userId!] = optionIds;
        for (const opt of poll.options) {
          if (optionIds.includes(opt.id)) opt.voteCount += 1;
        }
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            poll: toClientPoll(poll, auth.userId!, ledger.reports),
          },
        };
      });

      if (result.status === 200) {
        opts?.onPollBroadcast?.('poll:update', { pollId });
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/decisions/report', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const pollId = String(req.body?.pollId || '').trim();
      const reason = String(req.body?.reason || '').trim();
      if (!pollId || reason.length < 3 || reason.length > 400) {
        res.status(400).json({ success: false, error: 'Report reason must be 3–400 characters.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const poll = ledger.polls.find(p => p.id === pollId);
        if (!poll) return { status: 404, payload: { success: false, error: 'Poll not found.' } };
        const exists = ledger.reports.some(
          r => r.pollId === pollId && r.reporterId === auth.userId
        );
        if (exists) {
          return { status: 409, payload: { success: false, error: 'You already submitted a moderation report for this poll.' } };
        }
        const report: CommunityPollReport = {
          id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pollId,
          reporterId: auth.userId!,
          reason,
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        ledger.reports.unshift(report);
        writeLedger(ledger);
        return { status: 200, payload: { success: true, report } };
      });

      res.status(result.status).json(result.payload);
    });

    // Authorized Admin: Create & Publish Official Poll
    app.post('/api/admin/decisions/create', async (req: Request, res: Response) => {
      if (!isAuthorizedAdmin(req)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: only authorized administrators may create official community polls.',
        });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();
      const category = String(body.category || 'community_event') as CommunityPollCategory;
      const pollType: CommunityPollType =
        body.pollType === 'multiple_choice' ? 'multiple_choice' : 'single_choice';
      const maxChoices = pollType === 'single_choice' ? 1 : Math.max(2, Math.min(5, Number(body.maxChoices || 2)));
      const durationHours = Math.max(1, Math.min(720, Number(body.durationHours || 168)));
      const rawOptions: Array<{ label?: string; description?: string }> = Array.isArray(body.options)
        ? body.options
        : [];

      if (title.length < 4 || !VALID_CATEGORIES.has(category) || rawOptions.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Valid title, category, and at least 2 options are required.',
        });
        return;
      }

      const now = new Date();
      const created: StoredPoll = await withLock(() => {
        const ledger = readLedger();
        const poll: StoredPoll = {
          id: `poll-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
          title: title.slice(0, 120),
          description: description.slice(0, 400),
          category,
          pollType,
          maxChoices,
          status: 'active',
          showLiveResults: body.showLiveResults !== false,
          options: rawOptions.slice(0, 8).map((o, idx) => ({
            id: `opt_${idx + 1}_${now.getTime()}`,
            label: String(o.label || `Option ${idx + 1}`).trim().slice(0, 100),
            description: o.description ? String(o.description).trim().slice(0, 200) : undefined,
            voteCount: 0,
          })),
          votesByUser: {},
          publishedOutcome: null,
          closesAt: new Date(now.getTime() + durationHours * 3600_000).toISOString(),
          createdAt: now.toISOString(),
          closedAt: null,
        };
        ledger.polls.unshift(poll);
        writeLedger(ledger);
        return poll;
      });

      opts?.onPollBroadcast?.('poll:update', { pollId: created.id, action: 'created' });
      const userIds = opts?.getKnownUserIds?.() || [];
      if (opts?.onPollNotification && userIds.length > 0) {
        await opts.onPollNotification({
          eventKey: `poll_open:${created.id}`,
          title: `New Community Vote: ${created.title}`,
          body: 'Cast your voice in Community Decisions before the ballot closes.',
          userIds,
        });
      }

      res.json({ success: true, poll: created });
    });

    // Authorized Admin: Close, Cancel, or Publish Official Outcome
    app.post('/api/admin/decisions/action', async (req: Request, res: Response) => {
      if (!isAuthorizedAdmin(req)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: only authorized administrators may close, cancel, or publish polls.',
        });
        return;
      }

      const pollId = String(req.body?.pollId || '').trim();
      const action = String(req.body?.action || '').trim();
      const publishedOutcome = req.body?.publishedOutcome
        ? String(req.body.publishedOutcome).trim().slice(0, 300)
        : null;

      if (!pollId || !['close', 'cancel', 'publish'].includes(action)) {
        res.status(400).json({ success: false, error: 'Invalid pollId or admin action.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const poll = ledger.polls.find(p => p.id === pollId);
        if (!poll) return { status: 404, payload: { success: false, error: 'Poll not found.' } };

        const nowIso = new Date().toISOString();
        if (action === 'close') {
          poll.status = 'closed';
          poll.closedAt = nowIso;
        } else if (action === 'cancel') {
          poll.status = 'cancelled';
          poll.closedAt = nowIso;
        } else if (action === 'publish') {
          poll.status = 'published';
          poll.closedAt = poll.closedAt || nowIso;
          const winner = [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0];
          poll.publishedOutcome =
            publishedOutcome ||
            (winner
              ? `Final Result: ${winner.label} (${winner.voteCount} votes).`
              : 'Final results published.');
        }
        writeLedger(ledger);
        return { status: 200, poll, payload: { success: true, poll } };
      });

      if (result.status === 200 && 'poll' in result && result.poll) {
        opts?.onPollBroadcast?.('poll:update', { pollId, action });
        if (action === 'publish' && opts?.onPollNotification) {
          const userIds = Array.from(
            new Set([
              ...(opts.getKnownUserIds?.() || []),
              ...Object.keys(result.poll.votesByUser),
            ])
          );
          await opts.onPollNotification({
            eventKey: `poll_published:${pollId}`,
            title: `Vote Outcome Published: ${result.poll.title}`,
            body: result.poll.publishedOutcome || 'Community decision results are now archived.',
            userIds,
          });
        }
      }

      res.status(result.status).json(result.payload);
    });
  };

  return { registerRoutes };
}
