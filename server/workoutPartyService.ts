import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import { WORKOUT_PARTY_TEMPLATES } from '../src/data/expansionData.ts';
import type {
  CharacterAppearance,
  CharacterClass,
  WorkoutParty,
  WorkoutPartyHistoryEntry,
} from '../src/types/game.ts';
import type { SyncedProfileRecord } from './presenceAndPrivacy.ts';

interface WorkoutPartiesLedgerFile {
  parties: WorkoutParty[];
  history: WorkoutPartyHistoryEntry[];
}

export interface WorkoutPartyDeps {
  privacyHelper: {
    getRelationForUsers: (
      targetId: string,
      viewerId: string | null
    ) => { relation: 'self' | 'friends' | 'none' | 'blocked'; blockedByMe: boolean };
    getProfileSnapshot: (userId: string) => SyncedProfileRecord | null;
    broadcastDomainEvent: (eventType: string, payload: unknown, targetUserIds?: string[]) => void;
  };
  getAppearance?: (userId: string) => CharacterAppearance | undefined;
  onPartyInvite?: (params: {
    inviteeId: string;
    hostId: string;
    hostUsername: string;
    partyId: string;
    roomCode: string;
    challengeName: string;
  }) => Promise<void>;
  onVerifiedCoopProgress?: (params: {
    userId: string;
    teammateIds: string[];
    partyTitle: string;
    sessionRef: string;
  }) => Promise<void>;
}

const ROOM_EXPIRY_MS = 4 * 60 * 60 * 1000;
const RECONNECT_STALE_MS = 30_000;
const DISCONNECT_STALE_MS = 90_000;

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export function createWorkoutPartyService(rootDir: string, deps: WorkoutPartyDeps) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_workout_parties.json');
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

  const readLedger = (): WorkoutPartiesLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            parties: Array.isArray(parsed.parties) ? parsed.parties : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { parties: [], history: [] };
  };

  const writeLedger = (data: WorkoutPartiesLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const refreshPartyLifecycles = (ledger: WorkoutPartiesLedgerFile): boolean => {
    const now = Date.now();
    let changed = false;
    for (const party of ledger.parties) {
      if (party.status === 'countdown' && party.countdownEndsAt && Date.parse(party.countdownEndsAt) <= now) {
        party.status = 'active';
        party.startedAt = new Date(now).toISOString();
        party.messages.push({
          id: `pm-${now}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: 'system',
          senderUsername: 'Realm Steward',
          kind: 'system',
          content: `Synchronized session started: ${party.challengeName}!`,
          createdAt: party.startedAt,
        });
        changed = true;
      }
      if (
        (party.status === 'lobby' || party.status === 'countdown' || party.status === 'active') &&
        Date.parse(party.expiresAt) <= now
      ) {
        party.status = 'expired';
        changed = true;
      }
      for (const m of party.members) {
        const elapsed = now - Date.parse(m.lastHeartbeatAt || m.joinedAt);
        const nextStatus =
          elapsed > DISCONNECT_STALE_MS
            ? 'disconnected'
            : elapsed > RECONNECT_STALE_MS
            ? 'reconnecting'
            : 'connected';
        if (m.connectionStatus !== nextStatus) {
          m.connectionStatus = nextStatus;
          changed = true;
        }
      }
    }
    return changed;
  };

  const broadcastParty = (party: WorkoutParty) => {
    const memberIds = Array.from(
      new Set([...party.members.map(m => m.userId), ...party.invitedUserIds])
    );
    deps.privacyHelper.broadcastDomainEvent('party:update', { party }, memberIds);
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/parties/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const payload = await withLock(() => {
        const ledger = readLedger();
        if (refreshPartyLifecycles(ledger)) writeLedger(ledger);

        const visibleParties = ledger.parties.filter(p => {
          if (p.status === 'expired') return false;
          const isMember = p.members.some(m => m.userId === auth.userId);
          const isInvited = p.invitedUserIds.includes(auth.userId!);
          if (isMember || isInvited) return true;
          if (deps.privacyHelper.getRelationForUsers(p.hostId, auth.userId!).relation === 'blocked') {
            return false;
          }
          if (p.visibility === 'public') return true;
          if (p.visibility === 'friends') {
            return deps.privacyHelper.getRelationForUsers(p.hostId, auth.userId!).relation === 'friends';
          }
          return false;
        });

        const myHistory = ledger.history
          .filter(h => h.userId === auth.userId)
          .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
          .slice(0, 25);

        return {
          parties: visibleParties.slice(0, 20),
          history: myHistory,
        };
      });

      res.json({ success: true, ...payload });
    });

    app.post('/api/parties/create', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const challengeId = String(body.challengeId || '').trim();
      const tpl = WORKOUT_PARTY_TEMPLATES.find(t => t.id === challengeId);
      if (!tpl) {
        res.status(400).json({ success: false, error: 'Invalid workout party challenge template.' });
        return;
      }

      const snap = deps.privacyHelper.getProfileSnapshot(auth.userId);
      const username = String(body.username || snap?.username || 'Champion').slice(0, 48);
      const characterClass = (body.characterClass || snap?.characterClass || 'Warrior') as CharacterClass;
      const level = Math.max(1, Math.round(Number(body.level ?? snap?.level ?? 1)));
      const visibility: 'friends' | 'private' | 'public' =
        body.visibility === 'friends' || body.visibility === 'public' ? body.visibility : 'private';

      const party = await withLock(() => {
        const ledger = readLedger();
        refreshPartyLifecycles(ledger);

        let code = generateRoomCode();
        while (ledger.parties.some(p => p.roomCode === code && p.status !== 'expired')) {
          code = generateRoomCode();
        }
        const now = new Date();
        const created: WorkoutParty = {
          id: `party-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
          roomCode: code,
          hostId: auth.userId!,
          hostUsername: username,
          title: String(body.title || `${username}'s ${tpl.title}`).slice(0, 80),
          challengeId: tpl.id,
          challengeName: tpl.title,
          activityType: tpl.activityType,
          targetValue: tpl.targetValue,
          targetUnit: tpl.targetUnit,
          visibility,
          status: 'lobby',
          countdownEndsAt: null,
          startedAt: null,
          endedAt: null,
          expiresAt: new Date(now.getTime() + ROOM_EXPIRY_MS).toISOString(),
          summarySaved: false,
          members: [
            {
              userId: auth.userId!,
              username,
              characterClass,
              level,
              connectionStatus: 'connected',
              progressValue: 0,
              completed: false,
              joinedAt: now.toISOString(),
              lastHeartbeatAt: now.toISOString(),
              appearance: deps.getAppearance?.(auth.userId!),
            },
          ],
          messages: [
            {
              id: `pm-${now.getTime()}`,
              senderId: 'system',
              senderUsername: 'Realm Steward',
              kind: 'system',
              content: `${username} opened the Workout Party (${code}).`,
              createdAt: now.toISOString(),
            },
          ],
          invitedUserIds: [],
          createdAt: now.toISOString(),
        };
        ledger.parties.unshift(created);
        ledger.parties = ledger.parties.slice(0, 100);
        writeLedger(ledger);
        return created;
      });

      broadcastParty(party);
      res.json({ success: true, party });
    });

    app.post('/api/parties/join', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const partyId = String(body.partyId || '').trim();
      const roomCode = String(body.roomCode || '').trim().toUpperCase();
      if (!partyId && !roomCode) {
        res.status(400).json({ success: false, error: 'Provide partyId or roomCode.' });
        return;
      }

      const snap = deps.privacyHelper.getProfileSnapshot(auth.userId);
      const username = String(body.username || snap?.username || 'Champion').slice(0, 48);
      const characterClass = (body.characterClass || snap?.characterClass || 'Warrior') as CharacterClass;
      const level = Math.max(1, Math.round(Number(body.level ?? snap?.level ?? 1)));

      const result = await withLock(() => {
        const ledger = readLedger();
        refreshPartyLifecycles(ledger);
        const party = ledger.parties.find(
          p => (partyId && p.id === partyId) || (roomCode && p.roomCode === roomCode)
        );
        if (!party) return { status: 404, payload: { success: false, error: 'Workout party not found.' } };
        if (party.status === 'expired') {
          return { status: 410, payload: { success: false, error: 'This workout party room has expired.' } };
        }
        if (deps.privacyHelper.getRelationForUsers(party.hostId, auth.userId!).relation === 'blocked') {
          return { status: 403, payload: { success: false, error: 'Cannot join this room.' } };
        }
        if (
          party.visibility === 'private' &&
          !roomCode &&
          party.hostId !== auth.userId &&
          !party.invitedUserIds.includes(auth.userId!) &&
          !party.members.some(m => m.userId === auth.userId)
        ) {
          return { status: 403, payload: { success: false, error: 'Private room requires a room code or invite.' } };
        }

        const nowIso = new Date().toISOString();
        const existing = party.members.find(m => m.userId === auth.userId);
        if (existing) {
          existing.connectionStatus = 'connected';
          existing.lastHeartbeatAt = nowIso;
          existing.appearance = deps.getAppearance?.(auth.userId!) || existing.appearance;
        } else {
          if (party.members.length >= 8) {
            return { status: 400, payload: { success: false, error: 'Party is at maximum capacity (8).' } };
          }
          party.members.push({
            userId: auth.userId!,
            username,
            characterClass,
            level,
            connectionStatus: 'connected',
            progressValue: 0,
            completed: false,
            joinedAt: nowIso,
            lastHeartbeatAt: nowIso,
            appearance: deps.getAppearance?.(auth.userId!),
          });
          party.messages.push({
            id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderUsername: 'Realm Steward',
            kind: 'system',
            content: `${username} joined the party.`,
            createdAt: nowIso,
          });
        }
        writeLedger(ledger);
        return { status: 200, party, payload: { success: true, party } };
      });

      if (result.status === 200 && 'party' in result && result.party) {
        broadcastParty(result.party);
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/parties/invite', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const partyId = String(req.body?.partyId || '').trim();
      const targetUserId = String(req.body?.targetUserId || '').trim();
      const hostUsername = String(req.body?.username || 'Champion').slice(0, 48);
      if (!partyId || !targetUserId) {
        res.status(400).json({ success: false, error: 'Missing partyId or targetUserId.' });
        return;
      }

      const rel = deps.privacyHelper.getRelationForUsers(targetUserId, auth.userId).relation;
      if (rel === 'blocked') {
        res.status(403).json({ success: false, error: 'Cannot invite blocked user.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) return { status: 404, payload: { success: false, error: 'Party not found.' } };
        if (!party.members.some(m => m.userId === auth.userId)) {
          return { status: 403, payload: { success: false, error: 'Only party members can invite.' } };
        }
        if (!party.invitedUserIds.includes(targetUserId)) {
          party.invitedUserIds.push(targetUserId);
          writeLedger(ledger);
        }
        return { status: 200, party, payload: { success: true, party } };
      });

      if (result.status === 200 && 'party' in result && result.party) {
        if (deps.onPartyInvite) {
          await deps.onPartyInvite({
            inviteeId: targetUserId,
            hostId: auth.userId,
            hostUsername,
            partyId,
            roomCode: result.party.roomCode,
            challengeName: result.party.challengeName,
          });
        }
        broadcastParty(result.party);
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/parties/start', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const partyId = String(req.body?.partyId || '').trim();
      const result = await withLock(() => {
        const ledger = readLedger();
        refreshPartyLifecycles(ledger);
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) return { status: 404, payload: { success: false, error: 'Party not found.' } };
        if (party.hostId !== auth.userId) {
          return { status: 403, payload: { success: false, error: 'Only the party host may start the countdown.' } };
        }
        if (party.status !== 'lobby') {
          return { status: 400, payload: { success: false, error: `Party is already ${party.status}.` } };
        }
        const countdownSeconds = 5;
        party.status = 'countdown';
        party.countdownEndsAt = new Date(Date.now() + countdownSeconds * 1000).toISOString();
        party.messages.push({
          id: `pm-${Date.now()}`,
          senderId: 'system',
          senderUsername: 'Realm Steward',
          kind: 'system',
          content: `Countdown initiated — synchronized start in ${countdownSeconds} seconds!`,
          createdAt: new Date().toISOString(),
        });
        writeLedger(ledger);
        return { status: 200, party, payload: { success: true, party } };
      });

      if (result.status === 200 && 'party' in result && result.party) {
        broadcastParty(result.party);
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/parties/heartbeat', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const partyId = String(req.body?.partyId || '').trim();
      const result = await withLock(() => {
        const ledger = readLedger();
        const changed = refreshPartyLifecycles(ledger);
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) {
          if (changed) writeLedger(ledger);
          return { status: 404, payload: { success: false, error: 'Party not found.' } };
        }
        const m = party.members.find(x => x.userId === auth.userId);
        if (m) {
          m.connectionStatus = 'connected';
          m.lastHeartbeatAt = new Date().toISOString();
          writeLedger(ledger);
        } else if (changed) {
          writeLedger(ledger);
        }
        return { status: 200, party, payload: { success: true, party } };
      });

      res.status(result.status).json(result.payload);
    });

    // Server-verified individual workout completion inside party
    app.post('/api/parties/submit-workout', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      // Reject client progress tampering or forced completion flags
      if ('completed' in body || 'forceComplete' in body || 'xp' in body || 'claimAll' in body) {
        res.status(400).json({
          success: false,
          error: 'Untrusted party completion overrides are rejected.',
        });
        return;
      }

      const partyId = String(body.partyId || '').trim();
      const verifiedSessionId = String(body.verifiedSessionId || '').trim();
      const durationMinutes = Math.round(Number(body.durationMinutes || 0));
      const repetitions = Math.round(Number(body.repetitions || 0));
      const verifiedWithVision = Boolean(body.verifiedWithAetherVision);

      if (verifiedSessionId.length < 3) {
        res.status(400).json({
          success: false,
          error: 'A verified workout session reference is required.',
        });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        refreshPartyLifecycles(ledger);
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) return { status: 404, payload: { success: false, error: 'Party not found.' } };
        if (party.status === 'expired') {
          return { status: 410, payload: { success: false, error: 'Party room expired.' } };
        }
        if (party.status === 'lobby') {
          return { status: 400, payload: { success: false, error: 'Start the party session before submitting workout completions.' } };
        }

        const member = party.members.find(m => m.userId === auth.userId);
        if (!member) {
          return {
            status: 403,
            payload: {
              success: false,
              error: 'Participation could not be verified: you did not join this party session.',
            },
          };
        }
        if (member.verifiedSubmissionRef === verifiedSessionId) {
          return { status: 409, payload: { success: false, error: 'This workout session was already submitted to the party.' } };
        }

        const tpl = WORKOUT_PARTY_TEMPLATES.find(t => t.id === party.challengeId);
        // Validate realistic bounds against challenge template & anti-cheat caps
        if (!verifiedWithVision && durationMinutes < (tpl?.minVerifiedMinutes || 3)) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires at least ${tpl?.minVerifiedMinutes || 3} minutes of verified effort or Aether Vision verification.`,
            },
          };
        }
        if (repetitions > 500 || durationMinutes > 240) {
          return {
            status: 400,
            payload: { success: false, error: 'Submitted workout metrics exceed single-session safety validation bounds.' },
          };
        }

        const delta =
          party.targetUnit === 'reps'
            ? Math.max(0, Math.min(party.targetValue * 2, repetitions))
            : Math.max(0, Math.min(party.targetValue * 2, durationMinutes));

        if (delta <= 0) {
          return {
            status: 400,
            payload: { success: false, error: `Record at least 1 ${party.targetUnit} to advance the party board.` },
          };
        }

        member.progressValue = Math.min(party.targetValue * 2, member.progressValue + delta);
        member.completed = member.progressValue >= party.targetValue;
        member.verifiedSubmissionRef = verifiedSessionId;
        member.lastHeartbeatAt = new Date().toISOString();
        member.connectionStatus = 'connected';

        if (party.members.every(m => m.completed)) {
          party.status = 'completed';
          party.endedAt = new Date().toISOString();
        }

        party.messages.push({
          id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: 'system',
          senderUsername: 'Realm Steward',
          kind: 'system',
          content: `${member.username} logged +${delta} ${party.targetUnit} (${member.completed ? 'Challenge Complete!' : `${member.progressValue}/${party.targetValue}`})`,
          createdAt: new Date().toISOString(),
        });

        writeLedger(ledger);
        return { status: 200, party, payload: { success: true, party } };
      });

      if (result.status === 200 && 'party' in result && result.party) {
        broadcastParty(result.party);
        const teammateIds = result.party.members
          .map(m => m.userId)
          .filter(uid => uid !== auth.userId);
        if (teammateIds.length > 0 && deps.onVerifiedCoopProgress) {
          await deps.onVerifiedCoopProgress({
            userId: auth.userId!,
            teammateIds,
            partyTitle: result.party.challengeName,
            sessionRef: `${partyId}:${verifiedSessionId}`,
          });
        }
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/parties/message', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const partyId = String(req.body?.partyId || '').trim();
      const kind = req.body?.kind === 'reaction' ? 'reaction' : 'message';
      const content = String(req.body?.content || '').trim();
      const senderUsername = String(req.body?.username || 'Champion').slice(0, 48);
      if (!partyId || content.length < 1 || content.length > 260) {
        res.status(400).json({ success: false, error: 'Message content must be 1–260 characters.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) return { status: 404, payload: { success: false, error: 'Party not found.' } };
        if (!party.members.some(m => m.userId === auth.userId)) {
          return { status: 403, payload: { success: false, error: 'Only joined members can message in this party.' } };
        }
        party.messages.push({
          id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: auth.userId!,
          senderUsername,
          kind,
          content,
          createdAt: new Date().toISOString(),
        });
        party.messages = party.messages.slice(-80);
        writeLedger(ledger);
        return { status: 200, party, payload: { success: true, party } };
      });

      if (result.status === 200 && 'party' in result && result.party) {
        broadcastParty(result.party);
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/parties/save-summary', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const partyId = String(req.body?.partyId || '').trim();
      const result = await withLock(() => {
        const ledger = readLedger();
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) return { status: 404, payload: { success: false, error: 'Party not found.' } };
        const member = party.members.find(m => m.userId === auth.userId);
        if (!member) {
          return { status: 403, payload: { success: false, error: 'Only participants can save the session summary.' } };
        }
        // Only count members who actually submitted verified progress
        const activeContributors = party.members.filter(m => m.progressValue > 0);
        if (activeContributors.length === 0) {
          return {
            status: 400,
            payload: { success: false, error: 'At least one participant must complete verified effort before saving.' },
          };
        }

        party.status = 'completed';
        party.summarySaved = true;
        party.endedAt = party.endedAt || new Date().toISOString();

        const groupTotal = activeContributors.reduce((s, m) => s + m.progressValue, 0);
        for (const m of activeContributors) {
          const exists = ledger.history.some(h => h.partyId === party.id && h.userId === m.userId);
          if (!exists) {
            ledger.history.unshift({
              id: `ph-${party.id}-${m.userId}`,
              partyId: party.id,
              challengeId: party.challengeId,
              challengeName: party.challengeName,
              targetValue: party.targetValue,
              targetUnit: party.targetUnit,
              groupTotal,
              userProgress: m.progressValue,
              participantsCount: activeContributors.length,
              completedAt: party.endedAt,
              // attach userId internally via cast-safe property stored on record
              ...( { userId: m.userId } as any ),
            });
          }
        }
        ledger.history = ledger.history.slice(0, 300);
        writeLedger(ledger);
        return {
          status: 200,
          party,
          payload: {
            success: true,
            party,
            history: ledger.history.filter((h: any) => h.userId === auth.userId),
          },
        };
      });

      if (result.status === 200 && 'party' in result && result.party) {
        broadcastParty(result.party);
      }
      res.status(result.status).json(result.payload);
    });

    app.post('/api/parties/leave', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const partyId = String(req.body?.partyId || '').trim();
      const result = await withLock(() => {
        const ledger = readLedger();
        const party = ledger.parties.find(p => p.id === partyId);
        if (!party) return { status: 404, payload: { success: false, error: 'Party not found.' } };
        party.members = party.members.filter(m => m.userId !== auth.userId);
        if (party.hostId === auth.userId && party.members.length > 0) {
          party.hostId = party.members[0].userId;
          party.hostUsername = party.members[0].username;
        }
        writeLedger(ledger);
        return { status: 200, party, payload: { success: true } };
      });
      if (result.status === 200 && 'party' in result && result.party) {
        broadcastParty(result.party);
      }
      res.status(result.status).json(result.payload);
    });
  };

  return { registerRoutes };
}
