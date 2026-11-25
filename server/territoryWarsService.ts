import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller, verifyAdminHeader } from './authGuard.ts';
import { TERRITORY_BLUEPRINTS } from '../src/data/expansionData.ts';
import type { VerifiedActivityMetadata } from '../src/data/skillTreeData.ts';
import type {
  SkillActivityType,
  TerritoryGuildStanding,
  TerritoryMissionStance,
  TerritoryRegion,
  TerritoryWarHistoryEntry,
  TerritoryWarsStateResponse,
} from '../src/types/game.ts';
import type { SyncedProfileRecord } from './presenceAndPrivacy.ts';

interface TerritorySelection {
  territoryId: string;
  stance: TerritoryMissionStance;
  guildId: string;
  guildName: string;
  guildTag: string;
}

interface TerritoryContribEntry {
  id: string;
  campaignId: string;
  userId: string;
  guildId: string;
  territoryId: string;
  stance: TerritoryMissionStance;
  points: number;
  dailyBucket: string;
  idempotencyKey: string;
  createdAt: string;
}

interface TerritoryWarsLedgerFile {
  campaign: {
    id: string;
    title: string;
    seasonNumber: number;
    status: 'scheduled' | 'active' | 'resolved';
    minGuildMembers: number;
    startsAt: string;
    endsAt: string;
  };
  territories: TerritoryRegion[];
  selections: Record<string, TerritorySelection>; // userId -> selection
  userLockedGuild: Record<string, Record<string, { guildId: string; guildName: string; guildTag: string }>>; // campaignId -> userId -> guild
  knownGuildMembers: Record<string, number>; // guildId -> reported member count
  contributions: TerritoryContribEntry[];
  history: TerritoryWarHistoryEntry[];
}

export interface TerritoryWarsDeps {
  privacyHelper: {
    getProfileSnapshot: (userId: string) => SyncedProfileRecord | null;
    broadcastDomainEvent: (eventType: string, payload: unknown, targetUserIds?: string[]) => void;
  };
  grantSharedCosmetic?: (params: {
    userId: string;
    cosmeticId: string;
    sourceRef: string;
  }) => Promise<any>;
  onCampaignNotification?: (params: {
    userIds: string[];
    eventKey: string;
    title: string;
    body: string;
  }) => Promise<void>;
}

const DAILY_TERRITORY_CAP = 240;

const getTodayBucket = (tz?: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // ignore
  }
  return new Date().toISOString().slice(0, 10);
};

const createInitialTerritories = (): TerritoryRegion[] =>
  TERRITORY_BLUEPRINTS.map(bp => ({
    ...bp,
    ownerGuildId: null,
    ownerGuildName: null,
    ownerGuildTag: null,
    guildScores: {},
    totalPoints: 0,
  }));

const createDefaultCampaign = (now = new Date(), seasonNum = 1) => {
  const start = new Date(now.getTime() - 24 * 3600_000);
  const end = new Date(now.getTime() + 6 * 86400_000);
  return {
    id: `tw-campaign-s${seasonNum}-${now.toISOString().slice(0, 10)}`,
    title: `Aetheria Sovereign Siege · Cycle ${seasonNum}`,
    seasonNumber: seasonNum,
    status: 'active' as const,
    minGuildMembers: 1,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
};

export function createTerritoryWarsService(rootDir: string, deps: TerritoryWarsDeps) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_territory_wars.json');
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

  const readLedger = (): TerritoryWarsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object' && parsed.campaign) {
          return {
            campaign: parsed.campaign,
            territories: Array.isArray(parsed.territories) && parsed.territories.length > 0
              ? parsed.territories
              : createInitialTerritories(),
            selections: parsed.selections || {},
            userLockedGuild: parsed.userLockedGuild || {},
            knownGuildMembers: parsed.knownGuildMembers || {},
            contributions: Array.isArray(parsed.contributions) ? parsed.contributions : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
          };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return {
      campaign: createDefaultCampaign(),
      territories: createInitialTerritories(),
      selections: {},
      userLockedGuild: {},
      knownGuildMembers: {},
      contributions: [],
      history: [],
    };
  };

  const writeLedger = (data: TerritoryWarsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const computeStandings = (ledger: TerritoryWarsLedgerFile): TerritoryGuildStanding[] => {
    const map = new Map<
      string,
      {
        guildId: string;
        guildName: string;
        guildTag: string;
        territoriesControlled: number;
        totalPoints: number;
        contributors: Set<string>;
      }
    >();

    for (const t of ledger.territories) {
      if (t.ownerGuildId) {
        const cur = map.get(t.ownerGuildId) || {
          guildId: t.ownerGuildId,
          guildName: t.ownerGuildName || 'Guild',
          guildTag: t.ownerGuildTag || 'GLD',
          territoriesControlled: 0,
          totalPoints: 0,
          contributors: new Set<string>(),
        };
        cur.territoriesControlled += 1;
        map.set(t.ownerGuildId, cur);
      }

      for (const gs of Object.values(t.guildScores || {})) {
        const cur = map.get(gs.guildId) || {
          guildId: gs.guildId,
          guildName: gs.guildName,
          guildTag: gs.guildTag,
          territoriesControlled: 0,
          totalPoints: 0,
          contributors: new Set<string>(),
        };
        cur.totalPoints += Number(gs.points || 0);
        map.set(gs.guildId, cur);
      }
    }

    for (const c of ledger.contributions.filter(c => c.campaignId === ledger.campaign.id)) {
      const cur = map.get(c.guildId);
      if (cur) cur.contributors.add(c.userId);
    }

    return Array.from(map.values())
      .sort((a, b) => b.territoriesControlled - a.territoriesControlled || b.totalPoints - a.totalPoints)
      .map((row, idx) => ({
        rank: idx + 1,
        guildId: row.guildId,
        guildName: row.guildName,
        guildTag: row.guildTag,
        territoriesControlled: row.territoriesControlled,
        totalPoints: row.totalPoints,
        contributorsCount: row.contributors.size,
      }));
  };

  const resolveUserGuildEligibility = (
    ledger: TerritoryWarsLedgerFile,
    userId: string
  ): {
    guildId: string | null;
    guildName: string | null;
    guildTag: string | null;
    eligible: boolean;
    reason?: string;
  } => {
    const locked = ledger.userLockedGuild[ledger.campaign.id]?.[userId];
    const syncedGuild = deps.privacyHelper.getProfileSnapshot(userId)?.guild;
    const effectiveGuild = locked || (syncedGuild?.id
      ? { guildId: syncedGuild.id, guildName: syncedGuild.name, guildTag: syncedGuild.tag }
      : null);

    if (!effectiveGuild || !effectiveGuild.guildId) {
      return {
        guildId: null,
        guildName: null,
        guildTag: null,
        eligible: false,
        reason: 'Join or found a Guild to participate in Territory Wars.',
      };
    }

    if (locked && syncedGuild?.id && syncedGuild.id !== locked.guildId) {
      return {
        guildId: locked.guildId,
        guildName: locked.guildName,
        guildTag: locked.guildTag,
        eligible: true,
        reason: `Locked to ${locked.guildName} for this active battle campaign.`,
      };
    }

    const memberCount = ledger.knownGuildMembers[effectiveGuild.guildId] ?? 1;
    if (memberCount < ledger.campaign.minGuildMembers) {
      return {
        guildId: effectiveGuild.guildId,
        guildName: effectiveGuild.guildName,
        guildTag: effectiveGuild.guildTag,
        eligible: false,
        reason: `Guild requires at least ${ledger.campaign.minGuildMembers} members for this campaign.`,
      };
    }

    return {
      guildId: effectiveGuild.guildId,
      guildName: effectiveGuild.guildName,
      guildTag: effectiveGuild.guildTag,
      eligible: true,
    };
  };

  const buildResponse = (ledger: TerritoryWarsLedgerFile, userId: string): TerritoryWarsStateResponse => {
    const today = getTodayBucket('UTC');
    const elig = resolveUserGuildEligibility(ledger, userId);
    const sel = ledger.selections[userId];
    const selectedTerritoryId = sel?.territoryId || TERRITORY_BLUEPRINTS[2].id; // Sun Citadel default
    const selectedStance: TerritoryMissionStance = sel?.stance || 'offensive';

    const userContribs = ledger.contributions.filter(
      c => c.campaignId === ledger.campaign.id && c.userId === userId
    );
    const playerPoints = userContribs.reduce((s, c) => s + c.points, 0);
    const dailyPointsToday = userContribs
      .filter(c => c.dailyBucket === today)
      .reduce((s, c) => s + c.points, 0);

    return {
      campaign: ledger.campaign,
      territories: ledger.territories,
      standings: computeStandings(ledger),
      history: ledger.history.slice(0, 30),
      playerStatus: {
        guildId: elig.guildId,
        guildName: elig.guildName,
        guildTag: elig.guildTag,
        eligible: elig.eligible,
        eligibilityReason: elig.reason,
        selectedTerritoryId,
        selectedStance,
        playerPoints,
        dailyPointsToday,
        dailyPointsCap: DAILY_TERRITORY_CAP,
      },
    };
  };

  const recomputeOwners = (ledger: TerritoryWarsLedgerFile) => {
    for (const t of ledger.territories) {
      const sorted = Object.values(t.guildScores || {}).sort((a, b) => b.points - a.points);
      if (sorted.length > 0 && sorted[0].points > 0) {
        t.ownerGuildId = sorted[0].guildId;
        t.ownerGuildName = sorted[0].guildName;
        t.ownerGuildTag = sorted[0].guildTag;
      }
      t.totalPoints = sorted.reduce((s, g) => s + g.points, 0);
    }
  };

  const applyVerifiedTerritoryContribution = async (params: {
    userId: string;
    activityType: SkillActivityType;
    idempotencyKey: string;
    metadata?: VerifiedActivityMetadata;
    timezone?: string;
  }) => {
    const today = getTodayBucket(params.timezone);

    const outcome = await withLock(() => {
      const ledger = readLedger();
      if (ledger.campaign.status !== 'active') {
        return { applied: false, reason: 'campaign_inactive', pointsAwarded: 0 };
      }

      const elig = resolveUserGuildEligibility(ledger, params.userId);
      if (!elig.eligible || !elig.guildId) {
        return { applied: false, reason: 'not_in_eligible_guild', pointsAwarded: 0 };
      }

      const dup = ledger.contributions.find(
        c => c.campaignId === ledger.campaign.id && c.userId === params.userId && c.idempotencyKey === params.idempotencyKey
      );
      if (dup) {
        return { applied: false, duplicate: true, pointsAwarded: 0 };
      }

      const dailyUsed = ledger.contributions
        .filter(
          c =>
            c.campaignId === ledger.campaign.id &&
            c.userId === params.userId &&
            c.dailyBucket === today
        )
        .reduce((s, c) => s + c.points, 0);
      const remaining = Math.max(0, DAILY_TERRITORY_CAP - dailyUsed);
      if (remaining <= 0) {
        return { applied: false, safetyCapped: true, pointsAwarded: 0 };
      }

      // Compute verified activity points strictly on server (clamped, non-buyable)
      const dur = Math.min(45, Math.max(0, Math.round(Number(params.metadata?.durationMinutes) || 0)));
      const visionBonus = params.metadata?.verifiedWithAetherVision ? 10 : 0;
      let rawPts = 25;
      if (params.activityType === 'strength_workout' || params.activityType === 'cardio_workout') {
        rawPts = 35 + Math.min(20, Math.floor(dur / 2)) + visionBonus;
      } else if (params.activityType === 'comeback_activity') {
        rawPts = 32;
      } else if (params.activityType === 'recovery_habit') {
        rawPts = 24;
      }

      const sel = ledger.selections[params.userId];
      const territoryId = sel?.territoryId || TERRITORY_BLUEPRINTS[2].id;
      const stance: TerritoryMissionStance = sel?.stance || 'offensive';

      // Defensive stance protects an already-owned region with a +15% resilience efficiency bonus;
      // Offensive stance excels when pressing contested regions (+15% assault efficiency).
      const targetTerr = ledger.territories.find(t => t.id === territoryId) || ledger.territories[0];
      const stanceBonus =
        stance === 'defensive' && targetTerr.ownerGuildId === elig.guildId
          ? 6
          : stance === 'offensive' && targetTerr.ownerGuildId !== elig.guildId
          ? 6
          : 0;

      const pointsAwarded = Math.max(0, Math.min(rawPts + stanceBonus, remaining));
      if (pointsAwarded <= 0) {
        return { applied: false, safetyCapped: true, pointsAwarded: 0 };
      }

      // Lock user's guild ID for this campaign upon first contribution
      if (!ledger.userLockedGuild[ledger.campaign.id]) {
        ledger.userLockedGuild[ledger.campaign.id] = {};
      }
      ledger.userLockedGuild[ledger.campaign.id][params.userId] = {
        guildId: elig.guildId,
        guildName: elig.guildName || 'Guild',
        guildTag: elig.guildTag || 'GLD',
      };

      const existingScore = targetTerr.guildScores[elig.guildId] || {
        guildId: elig.guildId,
        guildName: elig.guildName || 'Guild',
        guildTag: elig.guildTag || 'GLD',
        points: 0,
      };
      existingScore.points += pointsAwarded;
      targetTerr.guildScores[elig.guildId] = existingScore;
      recomputeOwners(ledger);

      ledger.contributions.unshift({
        id: `twc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        campaignId: ledger.campaign.id,
        userId: params.userId,
        guildId: elig.guildId,
        territoryId: targetTerr.id,
        stance,
        points: pointsAwarded,
        dailyBucket: today,
        idempotencyKey: params.idempotencyKey,
        createdAt: new Date().toISOString(),
      });
      ledger.contributions = ledger.contributions.slice(0, 3000);
      writeLedger(ledger);

      return {
        applied: true,
        pointsAwarded,
        territoryId: targetTerr.id,
        territoryName: targetTerr.name,
        guildId: elig.guildId,
      };
    });

    if (outcome.applied) {
      deps.privacyHelper.broadcastDomainEvent('territory:update', {
        territoryId: outcome.territoryId,
        guildId: outcome.guildId,
        pointsAwarded: outcome.pointsAwarded,
      });
    }

    return outcome;
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/territory-wars/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const state = await withLock(() => buildResponse(readLedger(), auth.userId!));
      res.json({ success: true, ...state });
    });

    app.post('/api/territory-wars/register-guild', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('points' in body || 'territoryControl' in body || 'gold' in body) {
        res.status(400).json({ success: false, error: 'Territory control cannot be purchased or forged.' });
        return;
      }

      const synced = deps.privacyHelper.getProfileSnapshot(auth.userId)?.guild;
      const guildId = String(synced?.id || body.guildId || '').trim();
      const guildName = String(synced?.name || body.guildName || '').trim().slice(0, 60);
      const guildTag = String(synced?.tag || body.guildTag || 'GLD').trim().slice(0, 8);
      const membersCount = Math.max(1, Math.round(Number(body.membersCount || 1)));

      if (!guildId || !guildName) {
        res.status(400).json({ success: false, error: 'Valid guild membership is required.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const existingLock = ledger.userLockedGuild[ledger.campaign.id]?.[auth.userId!];
        if (existingLock && existingLock.guildId !== guildId) {
          return {
            status: 409,
            payload: {
              success: false,
              error: `You are locked to ${existingLock.guildName} for this battle cycle to preserve fair play.`,
            },
          };
        }

        ledger.knownGuildMembers[guildId] = Math.max(
          ledger.knownGuildMembers[guildId] || 1,
          membersCount
        );
        if (!ledger.userLockedGuild[ledger.campaign.id]) {
          ledger.userLockedGuild[ledger.campaign.id] = {};
        }
        ledger.userLockedGuild[ledger.campaign.id][auth.userId!] = {
          guildId,
          guildName,
          guildTag,
        };
        writeLedger(ledger);

        return { status: 200, payload: { success: true, ...buildResponse(ledger, auth.userId!) } };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/territory-wars/select-mission', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('points' in body || 'control' in body || 'purchase' in body) {
        res.status(400).json({ success: false, error: 'Untrusted territory score or purchase overrides are rejected.' });
        return;
      }

      const territoryId = String(body.territoryId || '').trim();
      const stance = body.stance === 'defensive' ? 'defensive' : 'offensive';
      if (!TERRITORY_BLUEPRINTS.some(t => t.id === territoryId)) {
        res.status(400).json({ success: false, error: 'Unknown territory region.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        const elig = resolveUserGuildEligibility(ledger, auth.userId!);
        if (!elig.eligible || !elig.guildId) {
          return {
            status: 403,
            payload: { success: false, error: elig.reason || 'Join an eligible guild to assign territory missions.' },
          };
        }

        ledger.selections[auth.userId!] = {
          territoryId,
          stance,
          guildId: elig.guildId,
          guildName: elig.guildName || 'Guild',
          guildTag: elig.guildTag || 'GLD',
        };
        writeLedger(ledger);
        return { status: 200, payload: { success: true, ...buildResponse(ledger, auth.userId!) } };
      });

      if (result.status === 200) {
        deps.privacyHelper.broadcastDomainEvent('territory:update', { action: 'mission_selected', territoryId });
      }
      res.status(result.status).json(result.payload);
    });

    // Admin resolve campaign -> archive outcomes + award winning guild members shared cosmetics
    app.post('/api/admin/territory-wars/resolve', async (req: Request, res: Response) => {
      if (!verifyAdminHeader(req, ['LIFEQUEST_ADMIN_KEY', 'LIFEQUEST_ADMIN_SECRET'])) {
        res.status(403).json({ success: false, error: 'Forbidden: admin authorization required.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const nowIso = new Date().toISOString();
        const grants: Array<{ userId: string; cosmeticId: string; sourceRef: string }> = [];
        const notifiedUsers = new Set<string>();

        for (const t of ledger.territories) {
          ledger.history.unshift({
            id: `twh-${ledger.campaign.id}-${t.id}-${Date.now()}`,
            campaignId: ledger.campaign.id,
            territoryId: t.id,
            territoryName: t.name,
            winningGuildId: t.ownerGuildId,
            winningGuildName: t.ownerGuildName,
            winningGuildTag: t.ownerGuildTag,
            totalPoints: t.totalPoints,
            resolvedAt: nowIso,
          });

          if (t.ownerGuildId) {
            const contributors = new Set(
              ledger.contributions
                .filter(c => c.campaignId === ledger.campaign.id && c.guildId === t.ownerGuildId)
                .map(c => c.userId)
            );
            for (const uid of contributors) {
              grants.push({
                userId: uid,
                cosmeticId: t.bonusCosmeticId,
                sourceRef: `territory_victory:${ledger.campaign.id}:${t.id}`,
              });
              notifiedUsers.add(uid);
            }
          }
        }

        ledger.history = ledger.history.slice(0, 60);
        const nextNum = ledger.campaign.seasonNumber + 1;
        ledger.campaign = createDefaultCampaign(new Date(), nextNum);
        ledger.territories = createInitialTerritories();
        writeLedger(ledger);

        return { grants, notifiedUsers: Array.from(notifiedUsers), newCampaign: ledger.campaign };
      });

      if (deps.grantSharedCosmetic) {
        for (const g of outcome.grants) {
          await deps.grantSharedCosmetic(g);
        }
      }
      if (deps.onCampaignNotification && outcome.notifiedUsers.length > 0) {
        await deps.onCampaignNotification({
          userIds: outcome.notifiedUsers,
          eventKey: `tw_resolved:${outcome.newCampaign.id}`,
          title: 'Territory War Honors Bestowed!',
          body: 'Your guild claimed territorial control! Shared cosmetic rewards have been added to your Wardrobe.',
        });
      }
      deps.privacyHelper.broadcastDomainEvent('territory:update', { action: 'resolved' });
      res.json({ success: true, grantsCount: outcome.grants.length, newCampaign: outcome.newCampaign });
    });
  };

  return {
    registerRoutes,
    applyVerifiedTerritoryContribution,
  };
}
