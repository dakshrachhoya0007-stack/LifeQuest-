import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { DEFAULT_SERVER_NOTIFICATION_PREFS } from '../src/data/polish2Data.ts';
import type {
  AppNotification,
  NotificationCategory,
  ServerNotificationPreferences,
} from '../src/types/game.ts';

interface NotificationLedgerFile {
  notifications: Array<AppNotification & { userId: string }>;
  preferencesByUser: Record<string, ServerNotificationPreferences>;
}

const VALID_CATEGORIES = new Set<NotificationCategory>([
  'player_progression',
  'social',
  'game_world',
  'fitness',
]);

export type NotificationPreferenceKey =
  | 'fitness'
  | 'social'
  | 'achievement'
  | 'boss'
  | 'community'
  | 'seasonal';

export function createNotificationService(rootDir: string) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_notifications.json');
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

  const readLedger = (): NotificationLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
            preferencesByUser:
              parsed.preferencesByUser && typeof parsed.preferencesByUser === 'object'
                ? parsed.preferencesByUser
                : {},
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { notifications: [], preferencesByUser: {} };
  };

  const writeLedger = (data: NotificationLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const getUserPrefs = (ledger: NotificationLedgerFile, userId: string): ServerNotificationPreferences => {
    const raw = ledger.preferencesByUser[userId];
    return {
      masterEnabled: raw?.masterEnabled ?? DEFAULT_SERVER_NOTIFICATION_PREFS.masterEnabled,
      fitness: raw?.fitness ?? DEFAULT_SERVER_NOTIFICATION_PREFS.fitness,
      social: raw?.social ?? DEFAULT_SERVER_NOTIFICATION_PREFS.social,
      achievement: raw?.achievement ?? DEFAULT_SERVER_NOTIFICATION_PREFS.achievement,
      boss: raw?.boss ?? DEFAULT_SERVER_NOTIFICATION_PREFS.boss,
      community: raw?.community ?? DEFAULT_SERVER_NOTIFICATION_PREFS.community,
      seasonal: raw?.seasonal ?? DEFAULT_SERVER_NOTIFICATION_PREFS.seasonal,
      updatedAt: raw?.updatedAt,
    };
  };

  const resolveCallerUserId = (
    req: Request
  ): { userId: string | null; status?: number; error?: string } => {
    const headerUid = String(req.headers['x-lifequest-user-id'] || '').trim();
    if (!headerUid) {
      return { userId: null, status: 401, error: 'Authentication required.' };
    }
    const targetParam =
      (typeof req.query.userId === 'string' && req.query.userId.trim()) ||
      (req.body && typeof req.body.userId === 'string' && req.body.userId.trim()) ||
      '';
    if (targetParam && targetParam !== headerUid) {
      return {
        userId: null,
        status: 403,
        error: 'Forbidden: players can only access or modify their own notifications.',
      };
    }
    return { userId: headerUid };
  };

  const emitNotification = async (input: {
    userId: string;
    category: NotificationCategory;
    preferenceKey: NotificationPreferenceKey;
    eventKey: string;
    type: string;
    title: string;
    body: string;
    actionTab?: string | null;
    actionSubTab?: string | null;
    payload?: Record<string, any>;
  }): Promise<{ created: boolean; suppressedByPreference?: boolean; notification?: AppNotification }> => {
    const uid = String(input.userId || '').trim();
    const eventKey = String(input.eventKey || '').trim();
    if (!uid || !eventKey) return { created: false };

    return withLock(() => {
      const ledger = readLedger();
      const prefs = getUserPrefs(ledger, uid);

      if (!prefs.masterEnabled || !prefs[input.preferenceKey]) {
        return { created: false, suppressedByPreference: true };
      }

      const duplicate = ledger.notifications.find(
        n => n.userId === uid && n.eventKey === eventKey
      );
      if (duplicate) {
        return { created: false, notification: duplicate };
      }

      const record: AppNotification & { userId: string } = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: uid,
        category: VALID_CATEGORIES.has(input.category) ? input.category : 'player_progression',
        preferenceKey: input.preferenceKey,
        eventKey,
        type: String(input.type || 'realm_alert'),
        title: String(input.title || 'Realm Alert').slice(0, 120),
        body: String(input.body || '').slice(0, 320),
        actionTab: input.actionTab ?? null,
        actionSubTab: input.actionSubTab ?? null,
        payload: input.payload || {},
        readAt: null,
        dismissedAt: null,
        createdAt: new Date().toISOString(),
      };

      ledger.notifications.unshift(record);
      // Keep bounded history per user
      const userNotifs = ledger.notifications.filter(n => n.userId === uid);
      if (userNotifs.length > 120) {
        const keepIds = new Set(userNotifs.slice(0, 120).map(n => n.id));
        ledger.notifications = ledger.notifications.filter(
          n => n.userId !== uid || keepIds.has(n.id)
        );
      }

      writeLedger(ledger);
      return { created: true, notification: record };
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/notifications/state', async (req: Request, res: Response) => {
      const auth = resolveCallerUserId(req);
      if (!auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const categoryFilter =
        typeof req.query.category === 'string' ? req.query.category.trim() : 'all';

      const payload = await withLock(() => {
        const ledger = readLedger();
        const prefs = getUserPrefs(ledger, auth.userId!);
        const activeList = ledger.notifications
          .filter(n => n.userId === auth.userId && !n.dismissedAt)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

        const filtered =
          categoryFilter !== 'all' && VALID_CATEGORIES.has(categoryFilter as NotificationCategory)
            ? activeList.filter(n => n.category === categoryFilter)
            : activeList;

        const categoryCounts: Record<string, { total: number; unread: number }> = {
          all: {
            total: activeList.length,
            unread: activeList.filter(n => !n.readAt).length,
          },
          player_progression: { total: 0, unread: 0 },
          social: { total: 0, unread: 0 },
          game_world: { total: 0, unread: 0 },
          fitness: { total: 0, unread: 0 },
        };

        for (const n of activeList) {
          const cat = n.category || 'player_progression';
          if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, unread: 0 };
          categoryCounts[cat].total += 1;
          if (!n.readAt) categoryCounts[cat].unread += 1;
        }

        return {
          success: true,
          notifications: filtered.slice(0, 80),
          unreadCount: categoryCounts.all.unread,
          categoryCounts,
          preferences: prefs,
        };
      });

      res.json(payload);
    });

    app.get('/api/notifications/preferences', async (req: Request, res: Response) => {
      const auth = resolveCallerUserId(req);
      if (!auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const prefs = await withLock(() => getUserPrefs(readLedger(), auth.userId!));
      res.json({ success: true, preferences: prefs });
    });

    app.post('/api/notifications/preferences', async (req: Request, res: Response) => {
      const auth = resolveCallerUserId(req);
      if (!auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const preferences = await withLock(() => {
        const ledger = readLedger();
        const cur = getUserPrefs(ledger, auth.userId!);
        const next: ServerNotificationPreferences = {
          masterEnabled:
            typeof body.masterEnabled === 'boolean' ? body.masterEnabled : cur.masterEnabled,
          fitness: typeof body.fitness === 'boolean' ? body.fitness : cur.fitness,
          social: typeof body.social === 'boolean' ? body.social : cur.social,
          achievement: typeof body.achievement === 'boolean' ? body.achievement : cur.achievement,
          boss: typeof body.boss === 'boolean' ? body.boss : cur.boss,
          community: typeof body.community === 'boolean' ? body.community : cur.community,
          seasonal: typeof body.seasonal === 'boolean' ? body.seasonal : cur.seasonal,
          updatedAt: new Date().toISOString(),
        };
        ledger.preferencesByUser[auth.userId!] = next;
        writeLedger(ledger);
        return next;
      });

      res.json({ success: true, preferences });
    });

    app.post('/api/notifications/read', async (req: Request, res: Response) => {
      const auth = resolveCallerUserId(req);
      if (!auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const notificationId = String(req.body?.notificationId || '').trim();
      if (!notificationId) {
        res.status(400).json({ success: false, error: 'Missing notificationId.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const item = ledger.notifications.find(n => n.id === notificationId);
        if (!item) {
          return { status: 404, payload: { success: false, error: 'Notification not found.' } };
        }
        if (item.userId !== auth.userId) {
          return {
            status: 403,
            payload: { success: false, error: 'Forbidden: cannot modify another player’s notification.' },
          };
        }
        if (!item.readAt) {
          item.readAt = new Date().toISOString();
          writeLedger(ledger);
        }
        return { status: 200, payload: { success: true, notification: item } };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/notifications/read-all', async (req: Request, res: Response) => {
      const auth = resolveCallerUserId(req);
      if (!auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const category =
        typeof req.body?.category === 'string' ? req.body.category.trim() : 'all';

      await withLock(() => {
        const ledger = readLedger();
        const nowIso = new Date().toISOString();
        let changed = false;
        for (const n of ledger.notifications) {
          if (n.userId !== auth.userId || n.dismissedAt || n.readAt) continue;
          if (category !== 'all' && n.category !== category) continue;
          n.readAt = nowIso;
          changed = true;
        }
        if (changed) writeLedger(ledger);
      });

      res.json({ success: true });
    });

    app.post('/api/notifications/dismiss', async (req: Request, res: Response) => {
      const auth = resolveCallerUserId(req);
      if (!auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const notificationId = String(req.body?.notificationId || '').trim();
      if (!notificationId) {
        res.status(400).json({ success: false, error: 'Missing notificationId.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const item = ledger.notifications.find(n => n.id === notificationId);
        if (!item) {
          return { status: 404, payload: { success: false, error: 'Notification not found.' } };
        }
        if (item.userId !== auth.userId) {
          return {
            status: 403,
            payload: { success: false, error: 'Forbidden: cannot dismiss another player’s notification.' },
          };
        }
        item.dismissedAt = new Date().toISOString();
        writeLedger(ledger);
        return { status: 200, payload: { success: true } };
      });

      res.status(result.status).json(result.payload);
    });
  };

  return {
    registerRoutes,
    emitNotification,
  };
}
