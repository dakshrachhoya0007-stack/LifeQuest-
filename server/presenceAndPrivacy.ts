import express from 'express';
import type { Express, Request, Response } from 'express';
import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import {
  isSupabaseAuthConfigured,
  resolveOptionalViewerId,
  resolveVerifiedCaller,
  verifySupabaseBearerToken,
} from './authGuard.ts';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'dnd';
export type FieldVisibilityLevel = 'everyone' | 'friends' | 'nobody';
export type PrivacyFieldKey =
  | 'usernameAvatar'
  | 'level'
  | 'xpProgression'
  | 'achievements'
  | 'fitnessStats'
  | 'workoutHistory'
  | 'personalRecords'
  | 'dailyActivity'
  | 'onlineStatus'
  | 'lastActive'
  | 'bio';

export interface GranularPrivacySettings {
  privateByDefault: boolean;
  usernameAvatar: FieldVisibilityLevel;
  level: FieldVisibilityLevel;
  xpProgression: FieldVisibilityLevel;
  achievements: FieldVisibilityLevel;
  fitnessStats: FieldVisibilityLevel;
  workoutHistory: FieldVisibilityLevel;
  personalRecords: FieldVisibilityLevel;
  dailyActivity: FieldVisibilityLevel;
  onlineStatus: FieldVisibilityLevel;
  lastActive: FieldVisibilityLevel;
  bio: FieldVisibilityLevel;
  showEquipment?: boolean;
  showGuild?: boolean;
}

export interface SyncedProfileRecord {
  id: string;
  username?: string;
  characterName?: string;
  characterClass?: string;
  heroName?: string;
  level?: number;
  playerXP?: number;
  playerXPNextLevel?: number;
  totalXp?: number;
  aetherRank?: string;
  aetherPoints?: number;
  aetherPointsNextRank?: number;
  currentStreak?: number;
  totalWorkoutsCompleted?: number;
  totalVerifiedReps?: number;
  totalBossesDefeated?: number;
  totalActiveMinutes?: number;
  bio?: string;
  profileVisibility?: string;
  guild?: Record<string, any> | null;
  achievements?: Array<Record<string, any>>;
  workoutHistory?: Array<Record<string, any>>;
  personalRecords?: Array<Record<string, any>>;
  dailyActivity?: Record<string, any>;
  legendTitle?: string | null;
  legendTitleStyle?: string | null;
  legendEmblem?: string | null;
  legendTitles?: Array<Record<string, any>>;
  privacySettings: GranularPrivacySettings;
  friendIds: string[];
  blockedIds: string[];
  updatedAt: string;
}

export interface ServerPresenceRecord {
  userId: string;
  manualStatus: PresenceStatus;
  effectiveStatus: PresenceStatus;
  isAutoAway: boolean;
  autoAwayEnabled: boolean;
  autoAwayMinutes: number;
  lastHeartbeatMs: number;
  lastActiveAt: string;
}

interface PersistedStateFile {
  profiles: Record<string, SyncedProfileRecord>;
  presencePrefs: Record<
    string,
    {
      manualStatus: PresenceStatus;
      autoAwayEnabled: boolean;
      autoAwayMinutes: number;
      lastActiveAt: string;
    }
  >;
}

const VALID_STATUSES = new Set<PresenceStatus>(['online', 'offline', 'away', 'dnd']);
const normalizePresenceInput = (raw: unknown): PresenceStatus | undefined => {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim().toLowerCase();
  if (s === 'busy' || s === 'dnd' || s === 'do_not_disturb') return 'dnd';
  if (s === 'online' || s === 'away' || s === 'offline') return s;
  return undefined;
};
const VALID_VIS_LEVELS = new Set<FieldVisibilityLevel>(['everyone', 'friends', 'nobody']);
const HEARTBEAT_TTL_MS = 42_000;
const SWEEP_INTERVAL_MS = 10_000;

export const DEFAULT_PRIVACY_SETTINGS: GranularPrivacySettings = {
  privateByDefault: false,
  usernameAvatar: 'everyone',
  level: 'everyone',
  xpProgression: 'everyone',
  achievements: 'everyone',
  fitnessStats: 'everyone',
  workoutHistory: 'friends',
  personalRecords: 'friends',
  dailyActivity: 'friends',
  onlineStatus: 'everyone',
  lastActive: 'friends',
  bio: 'everyone',
  showEquipment: true,
  showGuild: true,
};

const normalizeVisibilityLevel = (
  val: unknown,
  fallback: FieldVisibilityLevel
): FieldVisibilityLevel => {
  return typeof val === 'string' && VALID_VIS_LEVELS.has(val as FieldVisibilityLevel)
    ? (val as FieldVisibilityLevel)
    : fallback;
};

export const normalizePrivacySettings = (raw: any): GranularPrivacySettings => {
  const privDefault = Boolean(raw?.privateByDefault);
  const def = privDefault ? 'nobody' : 'everyone';
  return {
    privateByDefault: privDefault,
    usernameAvatar: normalizeVisibilityLevel(raw?.usernameAvatar, privDefault ? 'nobody' : 'everyone'),
    level: normalizeVisibilityLevel(raw?.level, def),
    xpProgression: normalizeVisibilityLevel(raw?.xpProgression, def),
    achievements: normalizeVisibilityLevel(raw?.achievements, def),
    fitnessStats: normalizeVisibilityLevel(raw?.fitnessStats, def),
    workoutHistory: normalizeVisibilityLevel(raw?.workoutHistory, privDefault ? 'nobody' : 'friends'),
    personalRecords: normalizeVisibilityLevel(raw?.personalRecords, privDefault ? 'nobody' : 'friends'),
    dailyActivity: normalizeVisibilityLevel(raw?.dailyActivity, privDefault ? 'nobody' : 'friends'),
    onlineStatus: normalizeVisibilityLevel(raw?.onlineStatus, def),
    lastActive: normalizeVisibilityLevel(raw?.lastActive, privDefault ? 'nobody' : 'friends'),
    bio: normalizeVisibilityLevel(raw?.bio, def),
    showEquipment: typeof raw?.showEquipment === 'boolean' ? raw.showEquipment : !privDefault,
    showGuild: typeof raw?.showGuild === 'boolean' ? raw.showGuild : !privDefault,
  };
};

const canViewField = (
  privacy: GranularPrivacySettings,
  field: PrivacyFieldKey,
  relation: 'self' | 'friends' | 'none' | 'blocked'
): boolean => {
  if (relation === 'self') return true;
  if (relation === 'blocked') return false;
  const level = privacy[field];
  if (level === 'everyone') return true;
  if (level === 'friends') return relation === 'friends';
  return false;
};

interface SocketMeta {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  alive: boolean;
}

export function attachPresenceAndPrivacySystem(
  app: Express,
  httpServer: HttpServer,
  dataDir: string
) {
  const STATE_FILE = path.join(dataDir, '.lifequest_social_privacy_state.json');

  const persisted: PersistedStateFile = (() => {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          profiles: parsed?.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {},
          presencePrefs:
            parsed?.presencePrefs && typeof parsed.presencePrefs === 'object'
              ? parsed.presencePrefs
              : {},
        };
      }
    } catch {
      // ignore corrupted state file
    }
    return { profiles: {}, presencePrefs: {} };
  })();

  let persistTimer: NodeJS.Timeout | null = null;
  const schedulePersist = () => {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(persisted, null, 2), 'utf8');
      } catch (err) {
        console.error('Failed to persist social/privacy state:', err);
      }
    }, 300);
  };

  const persistImmediate = () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(persisted, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write social/privacy state:', err);
    }
  };

  // Live in-memory WebSocket & TTL presence tracking
  const userSockets = new Map<string, Set<SocketMeta>>();
  const livePresence = new Map<string, ServerPresenceRecord>();

  // Hydrate known offline records from persisted preferences (NEVER hydrate as online!)
  for (const [uid, pref] of Object.entries(persisted.presencePrefs)) {
    const manual = normalizePresenceInput(pref.manualStatus) || 'online';
    persisted.presencePrefs[uid].manualStatus = manual;
    livePresence.set(uid, {
      userId: uid,
      manualStatus: manual,
      effectiveStatus: 'offline', // Disconnected at boot -> always offline until active heartbeat/WS
      isAutoAway: false,
      autoAwayEnabled: pref.autoAwayEnabled ?? true,
      autoAwayMinutes: Math.max(1, Math.min(60, Number(pref.autoAwayMinutes || 5))),
      lastHeartbeatMs: 0,
      lastActiveAt: pref.lastActiveAt || new Date(0).toISOString(),
    });
  }

  const getRelation = (
    targetId: string,
    viewerId: string | null
  ): {
    relation: 'self' | 'friends' | 'none' | 'blocked';
    blockedByMe: boolean;
  } => {
    if (viewerId && viewerId === targetId) {
      return { relation: 'self', blockedByMe: false };
    }
    const target = persisted.profiles[targetId];
    const viewer = viewerId ? persisted.profiles[viewerId] : undefined;

    if (viewerId) {
      const targetBlockedViewer = Boolean(target?.blockedIds?.includes(viewerId));
      const viewerBlockedTarget = Boolean(viewer?.blockedIds?.includes(targetId));
      if (targetBlockedViewer || viewerBlockedTarget) {
        return { relation: 'blocked', blockedByMe: viewerBlockedTarget };
      }

      const isFriend = Boolean(
        target?.friendIds?.includes(viewerId) || viewer?.friendIds?.includes(targetId)
      );
      if (isFriend) {
        return { relation: 'friends', blockedByMe: false };
      }
    }

    return { relation: 'none', blockedByMe: false };
  };

  const computeEffectivePresenceForTarget = (
    targetId: string,
    viewerId: string | null,
    overrideRelation?: 'self' | 'friends' | 'none' | 'blocked'
  ): { status: PresenceStatus; lastActiveAt: string | null; hidden: boolean } => {
    const rec = livePresence.get(targetId);
    const targetProfile = persisted.profiles[targetId];
    const privacy = targetProfile?.privacySettings || DEFAULT_PRIVACY_SETTINGS;
    const rel = overrideRelation ?? getRelation(targetId, viewerId).relation;

    if (rel === 'blocked') {
      return { status: 'offline', lastActiveAt: null, hidden: true };
    }

    const canSeeStatus = canViewField(privacy, 'onlineStatus', rel);
    const canSeeLastActive = canViewField(privacy, 'lastActive', rel);

    const lastActiveAt = canSeeLastActive
      ? rec?.lastActiveAt || persisted.presencePrefs[targetId]?.lastActiveAt || null
      : null;

    if (!canSeeStatus) {
      return { status: 'offline', lastActiveAt, hidden: true };
    }

    if (!rec) {
      return { status: 'offline', lastActiveAt, hidden: false };
    }

    // Offline / invisible manual selection NEVER shows online to anyone else (and shows offline to self too)
    if (rec.manualStatus === 'offline') {
      return { status: 'offline', lastActiveAt, hidden: false };
    }

    const hasOpenSocket = (userSockets.get(targetId)?.size || 0) > 0;
    const heartbeatFresh = Date.now() - rec.lastHeartbeatMs <= HEARTBEAT_TTL_MS;
    if (!hasOpenSocket && !heartbeatFresh) {
      return { status: 'offline', lastActiveAt, hidden: false };
    }

    const status: PresenceStatus = rec.isAutoAway ? 'away' : rec.manualStatus;
    return { status, lastActiveAt, hidden: false };
  };

  const broadcastPresenceToPeers = (targetUserId: string) => {
    for (const [viewerId, sockets] of userSockets.entries()) {
      const view = computeEffectivePresenceForTarget(targetUserId, viewerId);
      const payload = JSON.stringify({
        type: 'presence:update',
        userId: targetUserId,
        status: view.status,
        lastActiveAt: view.lastActiveAt,
        hidden: view.hidden,
      });
      for (const meta of sockets) {
        if (meta.ws.readyState === WebSocket.OPEN) {
          meta.ws.send(payload);
        }
      }
    }
  };

  const updateServerPresence = (
    userId: string,
    opts: {
      manualStatus?: PresenceStatus;
      isAutoAway?: boolean;
      autoAwayEnabled?: boolean;
      autoAwayMinutes?: number;
      heartbeatOnly?: boolean;
      disconnected?: boolean;
    }
  ): ServerPresenceRecord => {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const existing = livePresence.get(userId);
    const pref = persisted.presencePrefs[userId];

    const normalizedIncoming = normalizePresenceInput(opts.manualStatus);
    let manualStatus: PresenceStatus =
      normalizedIncoming
        ? normalizedIncoming
        : normalizePresenceInput(existing?.manualStatus) ||
          normalizePresenceInput(pref?.manualStatus) ||
          'online';

    const autoAwayEnabled =
      typeof opts.autoAwayEnabled === 'boolean'
        ? opts.autoAwayEnabled
        : existing?.autoAwayEnabled ?? pref?.autoAwayEnabled ?? true;

    const autoAwayMinutes =
      typeof opts.autoAwayMinutes === 'number' && !Number.isNaN(opts.autoAwayMinutes)
        ? Math.max(1, Math.min(60, Math.round(opts.autoAwayMinutes)))
        : existing?.autoAwayMinutes ?? pref?.autoAwayMinutes ?? 5;

    const isAutoAway =
      opts.disconnected || manualStatus === 'offline'
        ? false
        : typeof opts.isAutoAway === 'boolean'
        ? opts.isAutoAway
        : existing?.isAutoAway ?? false;

    const hasOpenSocket = (userSockets.get(userId)?.size || 0) > 0;
    const isConnected = !opts.disconnected && (hasOpenSocket || !opts.disconnected);

    const effectiveStatus: PresenceStatus =
      opts.disconnected || manualStatus === 'offline' || (!hasOpenSocket && opts.disconnected)
        ? 'offline'
        : isAutoAway
        ? 'away'
        : manualStatus;

    const shouldAdvanceLastActive =
      !opts.disconnected && manualStatus !== 'offline' && isConnected;

    const record: ServerPresenceRecord = {
      userId,
      manualStatus,
      effectiveStatus,
      isAutoAway,
      autoAwayEnabled,
      autoAwayMinutes,
      lastHeartbeatMs: opts.disconnected ? 0 : nowMs,
      lastActiveAt: shouldAdvanceLastActive
        ? nowIso
        : existing?.lastActiveAt || pref?.lastActiveAt || nowIso,
    };

    livePresence.set(userId, record);
    persisted.presencePrefs[userId] = {
      manualStatus: record.manualStatus,
      autoAwayEnabled: record.autoAwayEnabled,
      autoAwayMinutes: record.autoAwayMinutes,
      lastActiveAt: record.lastActiveAt,
    };
    schedulePersist();

    return record;
  };

  // Attach real WebSocketServer to port 3000 HTTP server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/presence' });

  wss.on('connection', (ws: WebSocket) => {
    let boundMeta: SocketMeta | null = null;

    ws.on('pong', () => {
      if (boundMeta) {
        boundMeta.alive = true;
        const rec = livePresence.get(boundMeta.userId);
        if (rec) {
          rec.lastHeartbeatMs = Date.now();
          if (rec.manualStatus !== 'offline') {
            rec.lastActiveAt = new Date().toISOString();
          }
        }
      }
    });

    ws.on('message', async raw => {
      let msg: any;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'auth' && typeof msg.userId === 'string' && msg.userId.trim()) {
        const requestedUserId = msg.userId.trim();
        let userId = requestedUserId;
        const rawToken =
          typeof msg.token === 'string'
            ? msg.token.trim()
            : typeof msg.accessToken === 'string'
            ? msg.accessToken.trim()
            : '';

        if (isSupabaseAuthConfigured()) {
          if (!rawToken) {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Authentication token required.' }));
            return;
          }
          const verifiedUid = await verifySupabaseBearerToken(rawToken);
          if (!verifiedUid || verifiedUid !== requestedUserId) {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Invalid or mismatched authentication token.' }));
            return;
          }
          userId = verifiedUid;
        } else if (rawToken) {
          const verifiedUid = await verifySupabaseBearerToken(rawToken);
          if (verifiedUid && verifiedUid !== requestedUserId) {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Mismatched authentication token.' }));
            return;
          }
        }

        const sessionId = String(msg.sessionId || `sess-${Math.random().toString(36).slice(2, 8)}`);

        if (boundMeta && boundMeta.userId !== userId) {
          const oldSet = userSockets.get(boundMeta.userId);
          oldSet?.delete(boundMeta);
          if (oldSet && oldSet.size === 0) userSockets.delete(boundMeta.userId);
        }

        boundMeta = { ws, userId, sessionId, alive: true };
        let set = userSockets.get(userId);
        if (!set) {
          set = new Set();
          userSockets.set(userId, set);
        }
        set.add(boundMeta);

        const pref = persisted.presencePrefs[userId];
        const requestedStatus =
          normalizePresenceInput(msg.manualStatus) ||
          normalizePresenceInput(pref?.manualStatus) ||
          'online';

        const updated = updateServerPresence(userId, {
          manualStatus: requestedStatus,
          autoAwayEnabled: typeof msg.autoAwayEnabled === 'boolean' ? msg.autoAwayEnabled : undefined,
          autoAwayMinutes: typeof msg.autoAwayMinutes === 'number' ? msg.autoAwayMinutes : undefined,
          isAutoAway: Boolean(msg.isAutoAway),
        });

        // Send initial privacy-filtered snapshot of all known presences to newly connected client
        const snapshot: Record<string, { userId: string; status: PresenceStatus; lastActiveAt: string | null; hidden: boolean }> = {};
        for (const tid of livePresence.keys()) {
          const view = computeEffectivePresenceForTarget(tid, userId);
          snapshot[tid] = { userId: tid, ...view };
        }
        ws.send(
          JSON.stringify({
            type: 'presence:snapshot',
            self: {
              manualStatus: updated.manualStatus,
              effectiveStatus: updated.effectiveStatus,
              autoAwayEnabled: updated.autoAwayEnabled,
              autoAwayMinutes: updated.autoAwayMinutes,
              isAutoAway: updated.isAutoAway,
              lastActiveAt: updated.lastActiveAt,
            },
            peers: snapshot,
          })
        );

        broadcastPresenceToPeers(userId);
        return;
      }

      if (!boundMeta) return;

      if (msg.type === 'presence:set') {
        const manualStatus = normalizePresenceInput(msg.manualStatus);
        const updated = updateServerPresence(boundMeta.userId, {
          manualStatus,
          autoAwayEnabled: typeof msg.autoAwayEnabled === 'boolean' ? msg.autoAwayEnabled : undefined,
          autoAwayMinutes: typeof msg.autoAwayMinutes === 'number' ? msg.autoAwayMinutes : undefined,
          isAutoAway: Boolean(msg.isAutoAway),
        });
        ws.send(
          JSON.stringify({
            type: 'presence:self',
            self: {
              manualStatus: updated.manualStatus,
              effectiveStatus: updated.effectiveStatus,
              autoAwayEnabled: updated.autoAwayEnabled,
              autoAwayMinutes: updated.autoAwayMinutes,
              isAutoAway: updated.isAutoAway,
              lastActiveAt: updated.lastActiveAt,
            },
          })
        );
        broadcastPresenceToPeers(boundMeta.userId);
        return;
      }

      if (msg.type === 'heartbeat') {
        boundMeta.alive = true;
        updateServerPresence(boundMeta.userId, {
          heartbeatOnly: true,
          isAutoAway: typeof msg.isAutoAway === 'boolean' ? msg.isAutoAway : undefined,
        });
        ws.send(JSON.stringify({ type: 'heartbeat:ack', ts: Date.now() }));
        return;
      }

      if (msg.type === 'presence:query' && Array.isArray(msg.userIds)) {
        const peers: Record<string, any> = {};
        for (const rawId of msg.userIds.slice(0, 120)) {
          const tid = String(rawId || '');
          if (!tid) continue;
          peers[tid] = { userId: tid, ...computeEffectivePresenceForTarget(tid, boundMeta.userId) };
        }
        ws.send(JSON.stringify({ type: 'presence:batch', peers }));
      }
    });

    ws.on('close', () => {
      if (!boundMeta) return;
      const set = userSockets.get(boundMeta.userId);
      set?.delete(boundMeta);
      if (!set || set.size === 0) {
        userSockets.delete(boundMeta.userId);
        updateServerPresence(boundMeta.userId, { disconnected: true });
        broadcastPresenceToPeers(boundMeta.userId);
      }
    });
  });

  // Periodic sweep: detect unexpected connection drops / expired TTL heartbeats
  const sweepTimer = setInterval(() => {
    const now = Date.now();

    for (const [uid, sockets] of userSockets.entries()) {
      for (const meta of Array.from(sockets)) {
        if (!meta.alive) {
          sockets.delete(meta);
          try {
            meta.ws.terminate();
          } catch {
            // ignore
          }
          continue;
        }
        meta.alive = false;
        if (meta.ws.readyState === WebSocket.OPEN) {
          try {
            meta.ws.ping();
          } catch {
            // ignore
          }
        }
      }
      if (sockets.size === 0) {
        userSockets.delete(uid);
      }
    }

    for (const [uid, rec] of livePresence.entries()) {
      if (rec.effectiveStatus === 'offline') continue;
      const hasSocket = (userSockets.get(uid)?.size || 0) > 0;
      const expired = now - rec.lastHeartbeatMs > HEARTBEAT_TTL_MS;
      if (!hasSocket && expired) {
        rec.effectiveStatus = 'offline';
        rec.isAutoAway = false;
        broadcastPresenceToPeers(uid);
      }
    }
  }, SWEEP_INTERVAL_MS);

  httpServer.on('close', () => {
    clearInterval(sweepTimer);
    persistImmediate();
  });

  // ---------------------------------------------------------------------------
  // Server-Side Profile Filter (Strict 11-Field Granular Enforcement)
  // ---------------------------------------------------------------------------
  const buildFilteredPublicProfile = (
    targetId: string,
    viewerId: string | null,
    previewAs?: 'public' | 'friend' | 'restricted' | null
  ) => {
    const target = persisted.profiles[targetId];
    if (!target) {
      return {
        status: 404,
        body: { success: false, accessible: false, error: 'Champion profile not found.' },
      };
    }

    // Security guard: previewAs is ONLY valid when the authenticated owner views their own profile
    const safePreview =
      previewAs && viewerId && viewerId === targetId ? previewAs : null;

    if (safePreview === 'restricted') {
      return {
        status: 200,
        body: {
          success: false,
          accessible: false,
          blocked: true,
          blockedByMe: false,
          previewMode: 'restricted',
          error: 'This profile is unavailable due to a block setting.',
        },
      };
    }

    const relInfo = getRelation(targetId, viewerId);
    const effectiveRelation: 'self' | 'friends' | 'none' | 'blocked' =
      safePreview === 'public'
        ? 'none'
        : safePreview === 'friend'
        ? 'friends'
        : relInfo.relation;

    if (effectiveRelation === 'blocked') {
      return {
        status: 403,
        body: {
          success: false,
          accessible: false,
          blocked: true,
          blockedByMe: relInfo.blockedByMe,
          error: 'This profile is unavailable due to a block setting.',
        },
      };
    }

    const privacy = target.privacySettings || DEFAULT_PRIVACY_SETTINGS;
    const permittedFields: PrivacyFieldKey[] = [];
    const playerPayload: Record<string, any> = {
      id: target.id,
      relationshipStatus: effectiveRelation === 'self' ? 'self' : effectiveRelation,
    };

    // 1. Username & Avatar
    if (canViewField(privacy, 'usernameAvatar', effectiveRelation)) {
      permittedFields.push('usernameAvatar');
      if (target.username) playerPayload.username = target.username;
      if (target.characterName) playerPayload.characterName = target.characterName;
      if (target.characterClass) playerPayload.characterClass = target.characterClass;
      if (target.heroName) playerPayload.heroName = target.heroName;
      if (target.legendTitle) playerPayload.legendTitle = target.legendTitle;
      if (target.legendTitleStyle) playerPayload.legendTitleStyle = target.legendTitleStyle;
      if (target.legendEmblem) playerPayload.legendEmblem = target.legendEmblem;
    }

    // 2. Player Level
    if (canViewField(privacy, 'level', effectiveRelation)) {
      permittedFields.push('level');
      if (typeof target.level === 'number') playerPayload.level = target.level;
      if (target.aetherRank) playerPayload.aetherRank = target.aetherRank;
    }

    // 3. XP & Progression
    if (canViewField(privacy, 'xpProgression', effectiveRelation)) {
      permittedFields.push('xpProgression');
      if (typeof target.playerXP === 'number') playerPayload.playerXP = target.playerXP;
      if (typeof target.playerXPNextLevel === 'number') {
        playerPayload.playerXPNextLevel = target.playerXPNextLevel;
      }
      if (typeof target.totalXp === 'number') playerPayload.totalXp = target.totalXp;
      if (typeof target.aetherPoints === 'number') playerPayload.aetherPoints = target.aetherPoints;
      if (typeof target.aetherPointsNextRank === 'number') {
        playerPayload.aetherPointsNextRank = target.aetherPointsNextRank;
      }
    }

    // 4. Achievements, Trophies & Rare Identity Badges
    if (canViewField(privacy, 'achievements', effectiveRelation)) {
      permittedFields.push('achievements');
      playerPayload.achievements = Array.isArray(target.achievements) ? target.achievements : [];
      if (Array.isArray(target.legendTitles)) {
        playerPayload.legendTitles = target.legendTitles;
      }
      if ((target as any).equippedIdentityTitle) {
        playerPayload.equippedIdentityTitle = (target as any).equippedIdentityTitle;
      }
      if (Array.isArray((target as any).featuredBadges)) {
        playerPayload.featuredBadges = (target as any).featuredBadges;
      }
      if (typeof (target as any).reputationScore === 'number') {
        playerPayload.reputationScore = (target as any).reputationScore;
        playerPayload.reputationTier = (target as any).reputationTier;
      }
      if ((target as any).joinedAt) {
        playerPayload.joinedAt = (target as any).joinedAt;
      }
    }

    // 5. Fitness Statistics
    if (canViewField(privacy, 'fitnessStats', effectiveRelation)) {
      permittedFields.push('fitnessStats');
      if (typeof target.currentStreak === 'number') {
        playerPayload.currentStreak = target.currentStreak;
      }
      if (typeof target.totalWorkoutsCompleted === 'number') {
        playerPayload.totalWorkoutsCompleted = target.totalWorkoutsCompleted;
      }
      if (typeof target.totalVerifiedReps === 'number') {
        playerPayload.totalVerifiedReps = target.totalVerifiedReps;
      }
      if (typeof target.totalBossesDefeated === 'number') {
        playerPayload.totalBossesDefeated = target.totalBossesDefeated;
      }
      if (typeof target.totalActiveMinutes === 'number') {
        playerPayload.totalActiveMinutes = target.totalActiveMinutes;
      }
    }

    // 6. Workout History
    if (canViewField(privacy, 'workoutHistory', effectiveRelation)) {
      permittedFields.push('workoutHistory');
      playerPayload.workoutHistory = Array.isArray(target.workoutHistory)
        ? target.workoutHistory.slice(0, 12)
        : [];
    }

    // 7. Personal Records
    if (canViewField(privacy, 'personalRecords', effectiveRelation)) {
      permittedFields.push('personalRecords');
      playerPayload.personalRecords = Array.isArray(target.personalRecords)
        ? target.personalRecords
        : [];
    }

    // 8. Daily Activity
    if (canViewField(privacy, 'dailyActivity', effectiveRelation)) {
      permittedFields.push('dailyActivity');
      if (target.dailyActivity) {
        playerPayload.dailyActivity = target.dailyActivity;
      }
    }

    // 9. Online Status & 10. Last Active
    const presenceView = computeEffectivePresenceForTarget(
      targetId,
      viewerId,
      effectiveRelation
    );
    if (canViewField(privacy, 'onlineStatus', effectiveRelation)) {
      permittedFields.push('onlineStatus');
      playerPayload.presenceStatus = presenceView.status;
    }
    if (canViewField(privacy, 'lastActive', effectiveRelation)) {
      permittedFields.push('lastActive');
      if (presenceView.lastActiveAt) {
        playerPayload.lastActiveAt = presenceView.lastActiveAt;
      }
    }

    // 11. Bio
    if (canViewField(privacy, 'bio', effectiveRelation) && target.bio) {
      permittedFields.push('bio');
      playerPayload.bio = target.bio;
    }

    // Guild (respect privateByDefault and toggles)
    if (
      effectiveRelation === 'self' ||
      (privacy.showGuild !== false && !privacy.privateByDefault)
    ) {
      if (target.guild) playerPayload.guild = target.guild;
    }

    const accessible = permittedFields.length > 0;
    return {
      status: 200,
      body: {
        success: true,
        accessible,
        restrictedReason: !accessible
          ? privacy.privateByDefault
            ? 'private'
            : 'restricted'
          : undefined,
        previewMode: safePreview || undefined,
        permittedFields,
        player: playerPayload,
      },
    };
  };

  // ---------------------------------------------------------------------------
  // HTTP API Routes
  // ---------------------------------------------------------------------------

  // Update player presence / heartbeat via HTTP
  app.post('/api/presence/state', async (req: Request, res: Response) => {
    const body = req.body || {};
    const auth = await resolveVerifiedCaller(req, {
      expectedOwnerId: body.userId ? String(body.userId) : undefined,
    });
    if (!auth.ok || !auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
      return;
    }
    const userId = auth.userId;

    const updated = updateServerPresence(userId, {
      manualStatus: normalizePresenceInput(body.manualStatus),
      isAutoAway: typeof body.isAutoAway === 'boolean' ? body.isAutoAway : undefined,
      autoAwayEnabled: typeof body.autoAwayEnabled === 'boolean' ? body.autoAwayEnabled : undefined,
      autoAwayMinutes: typeof body.autoAwayMinutes === 'number' ? body.autoAwayMinutes : undefined,
      heartbeatOnly: Boolean(body.heartbeatOnly),
      disconnected: Boolean(body.disconnected),
    });

    broadcastPresenceToPeers(userId);
    res.json({ success: true, presence: updated });
  });

  // Unload / pagehide navigator.sendBeacon endpoint (accepts text/plain or application/json)
  app.post(
    '/api/presence/offline',
    express.text({ type: ['text/plain', 'application/json'] }),
    async (req: Request, res: Response) => {
      let userId = '';
      let bodyToken = '';
      try {
        if (typeof req.body === 'string') {
          const parsed = JSON.parse(req.body);
          userId = String(parsed?.userId || '').trim();
          bodyToken = String(parsed?.token || parsed?.accessToken || '').trim();
        } else if (req.body && typeof req.body === 'object') {
          userId = String(req.body.userId || '').trim();
          bodyToken = String(req.body.token || req.body.accessToken || '').trim();
        }
      } catch {
        userId = '';
      }

      if (isSupabaseAuthConfigured()) {
        const authHeader = String(req.headers['authorization'] || '').trim();
        const headerBearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
        const token = headerBearer || bodyToken;
        const verifiedUid = token ? await verifySupabaseBearerToken(token) : null;
        if (!verifiedUid || (userId && verifiedUid !== userId)) {
          res.status(204).end();
          return;
        }
        userId = verifiedUid;
      }

      if (userId) {
        const openSockets = userSockets.get(userId);
        // Only force offline if no other active tab holds an open WebSocket
        if (!openSockets || openSockets.size <= 1) {
          if (openSockets) {
            for (const m of openSockets) {
              try {
                m.ws.close(1000, 'tab_unload');
              } catch {
                // ignore
              }
            }
            userSockets.delete(userId);
          }
          updateServerPresence(userId, { disconnected: true });
          broadcastPresenceToPeers(userId);
          persistImmediate();
        }
      }
      res.status(204).end();
    }
  );

  // Batch presence query with server-side privacy filtering
  app.post('/api/presence/batch', async (req: Request, res: Response) => {
    const body = req.body || {};
    const auth = await resolveVerifiedCaller(req);
    const viewerId = auth.ok && auth.userId ? auth.userId : await resolveOptionalViewerId(req);
    const userIds: string[] = Array.isArray(body.userIds)
      ? body.userIds.map((id: unknown) => String(id || '').trim()).filter(Boolean).slice(0, 150)
      : [];

    const presences: Record<string, { userId: string; status: PresenceStatus; lastActiveAt: string | null; hidden: boolean }> = {};
    for (const targetId of userIds) {
      const view = computeEffectivePresenceForTarget(targetId, viewerId);
      presences[targetId] = { userId: targetId, ...view };
    }

    res.json({ success: true, presences });
  });

  // Sync full profile snapshot & granular privacy settings to authoritative server store
  app.post('/api/privacy/sync-profile', async (req: Request, res: Response) => {
    const body = req.body || {};
    const auth = await resolveVerifiedCaller(req, {
      expectedOwnerId: (body.id || body.userId) ? String(body.id || body.userId) : undefined,
    });
    if (!auth.ok || !auth.userId) {
      res.status(auth.status || 401).json({ success: false, error: auth.error || 'Authentication required.' });
      return;
    }
    const userId = auth.userId;

    const existing = persisted.profiles[userId];
    const normalizedPrivacy = normalizePrivacySettings(
      body.privacySettings ?? existing?.privacySettings
    );

    const record: SyncedProfileRecord = {
      id: userId,
      username: typeof body.username === 'string' ? body.username : existing?.username,
      characterName:
        typeof body.characterName === 'string' ? body.characterName : existing?.characterName,
      characterClass:
        typeof body.characterClass === 'string' ? body.characterClass : existing?.characterClass,
      heroName: typeof body.heroName === 'string' ? body.heroName : existing?.heroName,
      level: typeof body.level === 'number' ? body.level : existing?.level,
      playerXP: typeof body.playerXP === 'number' ? body.playerXP : existing?.playerXP,
      playerXPNextLevel:
        typeof body.playerXPNextLevel === 'number'
          ? body.playerXPNextLevel
          : existing?.playerXPNextLevel,
      totalXp: typeof body.totalXp === 'number' ? body.totalXp : existing?.totalXp,
      aetherRank: typeof body.aetherRank === 'string' ? body.aetherRank : existing?.aetherRank,
      aetherPoints:
        typeof body.aetherPoints === 'number' ? body.aetherPoints : existing?.aetherPoints,
      aetherPointsNextRank:
        typeof body.aetherPointsNextRank === 'number'
          ? body.aetherPointsNextRank
          : existing?.aetherPointsNextRank,
      currentStreak:
        typeof body.currentStreak === 'number' ? body.currentStreak : existing?.currentStreak,
      totalWorkoutsCompleted:
        typeof body.totalWorkoutsCompleted === 'number'
          ? body.totalWorkoutsCompleted
          : existing?.totalWorkoutsCompleted,
      totalVerifiedReps:
        typeof body.totalVerifiedReps === 'number'
          ? body.totalVerifiedReps
          : existing?.totalVerifiedReps,
      totalBossesDefeated:
        typeof body.totalBossesDefeated === 'number'
          ? body.totalBossesDefeated
          : existing?.totalBossesDefeated,
      totalActiveMinutes:
        typeof body.totalActiveMinutes === 'number'
          ? body.totalActiveMinutes
          : existing?.totalActiveMinutes,
      bio: typeof body.bio === 'string' ? body.bio : existing?.bio,
      profileVisibility:
        typeof body.profileVisibility === 'string'
          ? body.profileVisibility
          : existing?.profileVisibility,
      guild: body.guild !== undefined ? body.guild : existing?.guild,
      achievements: Array.isArray(body.achievements)
        ? body.achievements
        : existing?.achievements || [],
      workoutHistory: Array.isArray(body.workoutHistory)
        ? body.workoutHistory.slice(0, 20)
        : existing?.workoutHistory || [],
      personalRecords: Array.isArray(body.personalRecords)
        ? body.personalRecords
        : existing?.personalRecords || [],
      dailyActivity:
        body.dailyActivity !== undefined ? body.dailyActivity : existing?.dailyActivity,
      legendTitle: body.legendTitle !== undefined ? body.legendTitle : existing?.legendTitle,
      legendTitleStyle:
        body.legendTitleStyle !== undefined ? body.legendTitleStyle : existing?.legendTitleStyle,
      legendEmblem:
        body.legendEmblem !== undefined ? body.legendEmblem : existing?.legendEmblem,
      legendTitles: Array.isArray(body.legendTitles)
        ? body.legendTitles
        : existing?.legendTitles || [],
      privacySettings: normalizedPrivacy,
      friendIds: Array.isArray(body.friendIds)
        ? body.friendIds.map(String)
        : existing?.friendIds || [],
      blockedIds: Array.isArray(body.blockedIds)
        ? body.blockedIds.map(String)
        : existing?.blockedIds || [],
      updatedAt: new Date().toISOString(),
    };

    persisted.profiles[userId] = record;
    schedulePersist();
    broadcastPresenceToPeers(userId);

    res.json({ success: true, privacySettings: normalizedPrivacy });
  });

  // Strictly filtered public player profile endpoint (also handles owner-only Preview As Others)
  app.get('/api/profile/public/:targetId', async (req: Request, res: Response) => {
    const targetId = String(req.params.targetId || '').trim();
    const viewerId = await resolveOptionalViewerId(req);
    const rawPreview = String(req.query.previewAs || '').trim();
    const previewAs =
      rawPreview === 'public' || rawPreview === 'friend' || rawPreview === 'restricted'
        ? rawPreview
        : null;

    if (!targetId) {
      res.status(400).json({ success: false, accessible: false, error: 'Missing targetId.' });
      return;
    }

    if (previewAs && viewerId !== targetId) {
      res.status(403).json({
        success: false,
        accessible: false,
        error: 'Forbidden: only the profile owner can preview alternate visibility modes.',
      });
      return;
    }

    const result = buildFilteredPublicProfile(targetId, viewerId, previewAs);
    res.status(result.status).json(result.body);
  });

  // Server-side enforcement for directory / search / leaderboard entries
  app.post('/api/social/filter-directory', async (req: Request, res: Response) => {
    const body = req.body || {};
    const auth = await resolveVerifiedCaller(req);
    const viewerId = auth.ok && auth.userId ? auth.userId : await resolveOptionalViewerId(req);
    const entries: any[] = Array.isArray(body.entries) ? body.entries : [];

    const filtered = entries
      .map(entry => {
        const targetId = String(entry?.userId || entry?.id || '').trim();
        if (!targetId) return entry;

        const rel = getRelation(targetId, viewerId).relation;
        if (rel === 'blocked') return null;

        const target = persisted.profiles[targetId];
        const privacy = target?.privacySettings || DEFAULT_PRIVACY_SETTINGS;
        const canIdentity = canViewField(privacy, 'usernameAvatar', rel);
        const canLevel = canViewField(privacy, 'level', rel);
        const presence = computeEffectivePresenceForTarget(targetId, viewerId, rel);

        const next = { ...entry };
        if (!canIdentity) {
          if ('username' in next) next.username = 'Private Champion';
          if ('name' in next) next.name = 'Private Champion';
          if ('avatarUrl' in next) next.avatarUrl = '';
          if ('avatar' in next) next.avatar = '';
          next.legendTitle = null;
          next.legendTitleStyle = null;
          next.legendEmblem = null;
          next.identityHidden = true;
        }
        if (!canLevel) {
          delete next.level;
          delete next.aetherRank;
          next.levelHidden = true;
        }
        if (!canViewField(privacy, 'bio', rel)) {
          delete next.bio;
        }
        if (canViewField(privacy, 'onlineStatus', rel)) {
          next.presenceStatus = presence.status;
        } else {
          delete next.presenceStatus;
        }
        if (canViewField(privacy, 'lastActive', rel) && presence.lastActiveAt) {
          next.lastActiveAt = presence.lastActiveAt;
        } else {
          delete next.lastActiveAt;
        }
        return next;
      })
      .filter(Boolean);

    res.json({ success: true, entries: filtered });
  });

  // Merge server-enforced profile fields into existing Supabase-fetched profile payload
  app.post('/api/profile/enforce', async (req: Request, res: Response) => {
    const body = req.body || {};
    const targetId = String(body.targetId || '').trim();
    const auth = await resolveVerifiedCaller(req);
    const viewerId = auth.ok && auth.userId ? auth.userId : await resolveOptionalViewerId(req);
    const incoming = body.profile;

    if (!targetId || !incoming) {
      res.status(400).json({ success: false, error: 'Missing targetId or profile.' });
      return;
    }

    const serverFiltered = buildFilteredPublicProfile(targetId, viewerId);
    if (serverFiltered.status === 200) {
      res.json(serverFiltered.body);
      return;
    }

    // Target hasn't synced to local Express cache yet -> apply incoming's live presence if available
    const presence = computeEffectivePresenceForTarget(targetId, viewerId);
    const cloned = JSON.parse(JSON.stringify(incoming));
    if (cloned?.player) {
      cloned.player.presenceStatus = presence.status;
      if (presence.lastActiveAt) {
        cloned.player.lastActiveAt = presence.lastActiveAt;
      }
    }
    res.json(cloned);
  });

  const canViewPersonalRecords = (targetUserId: string, viewerId: string | null): boolean => {
    const rel = getRelation(targetUserId, viewerId).relation;
    if (rel === 'self') return true;
    if (rel === 'blocked') return false;
    const target = persisted.profiles[targetUserId];
    const privacy = target?.privacySettings || DEFAULT_PRIVACY_SETTINGS;
    return canViewField(privacy, 'personalRecords', rel);
  };

  const getRelationForUsers = (targetUserId: string, viewerId: string | null) =>
    getRelation(targetUserId, viewerId);

  const getProfileSnapshot = (userId: string): SyncedProfileRecord | null =>
    persisted.profiles[userId] || null;

  const canViewFieldForUsers = (
    targetUserId: string,
    viewerId: string | null,
    field: PrivacyFieldKey
  ): boolean => {
    const rel = getRelation(targetUserId, viewerId).relation;
    if (rel === 'self') return true;
    if (rel === 'blocked') return false;
    const target = persisted.profiles[targetUserId];
    const privacy = target?.privacySettings || DEFAULT_PRIVACY_SETTINGS;
    if (privacy.privateByDefault) return false;
    return canViewField(privacy, field, rel);
  };

  const broadcastDomainEvent = (
    eventType: string,
    payload: unknown,
    targetUserIds?: string[]
  ) => {
    const msg = JSON.stringify({
      type: eventType,
      payload,
      ts: Date.now(),
    });
    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      const targetSet = new Set(targetUserIds);
      for (const [uid, sockets] of userSockets.entries()) {
        if (!targetSet.has(uid)) continue;
        for (const meta of sockets) {
          if (meta.ws.readyState === WebSocket.OPEN) {
            meta.ws.send(msg);
          }
        }
      }
      return;
    }
    for (const sockets of userSockets.values()) {
      for (const meta of sockets) {
        if (meta.ws.readyState === WebSocket.OPEN) {
          meta.ws.send(msg);
        }
      }
    }
  };

  return {
    canViewPersonalRecords,
    canViewFieldForUsers,
    getRelationForUsers,
    getProfileSnapshot,
    getKnownUserIds: () => Object.keys(persisted.profiles),
    computeEffectivePresenceForTarget,
    broadcastDomainEvent,
  };
}
