import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveVerifiedCaller } from './authGuard.ts';
import { COSMETICS_CATALOG, COSMETIC_MILESTONES } from '../src/data/expansionData.ts';
import type {
  CharacterAppearance,
  CosmeticSlot,
  PlayerCosmeticState,
  PlayerLoadout,
} from '../src/types/game.ts';

interface StoredUserCosmetics {
  unlockedIds: string[];
  unlockedDetails: Record<string, { unlockedAt: string; sourceRef: string }>;
  appearance: CharacterAppearance;
  claimedMilestoneIds: string[];
  loadouts: PlayerLoadout[];
  activeLoadoutId: string | null;
  competitionLoadoutId: string | null;
}

interface CosmeticsLedgerFile {
  users: Record<string, StoredUserCosmetics>;
}

const DEFAULT_APPEARANCE: CharacterAppearance = {
  hairstyleId: 'hair_warden_crest',
  outfitId: 'outfit_novice_tunic',
  colorId: 'color_obsidian_gold',
  frameId: 'frame_bronze_crest',
  bannerId: 'banner_nightfall_keep',
  auraId: 'aura_none_embers',
};

const safeReadJson = (p: string): any => {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    // ignore
  }
  return null;
};

export function createCustomizationService(
  rootDir: string,
  opts?: {
    onCosmeticUnlocked?: (params: {
      userId: string;
      cosmeticId: string;
      cosmeticName: string;
      rarity: string;
    }) => Promise<void>;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_cosmetics.json');
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

  const readLedger = (): CosmeticsLedgerFile => {
    const parsed = safeReadJson(LEDGER_PATH);
    if (parsed && parsed.users && typeof parsed.users === 'object') {
      return { users: parsed.users };
    }
    return { users: {} };
  };

  const writeLedger = (data: CosmeticsLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const computeMaxLoadoutSlots = (userId: string, unlockedCount: number): number => {
    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));
    const level = Number(identityLedger?.users?.[userId]?.verifiedSnapshot?.level || 1);
    const bonusFromLevel = level >= 15 ? 2 : level >= 6 ? 1 : 0;
    const bonusFromCosmetics = unlockedCount >= 16 ? 2 : unlockedCount >= 10 ? 1 : 0;
    return Math.min(8, 3 + bonusFromLevel + bonusFromCosmetics);
  };

  const ensureUser = (ledger: CosmeticsLedgerFile, userId: string): StoredUserCosmetics => {
    if (!ledger.users[userId]) {
      const nowIso = new Date().toISOString();
      const starters = COSMETICS_CATALOG.filter(c => c.unlockRule.type === 'starter').map(c => c.id);
      const details: Record<string, { unlockedAt: string; sourceRef: string }> = {};
      for (const id of starters) details[id] = { unlockedAt: nowIso, sourceRef: 'starter' };
      const starterLoadout: PlayerLoadout = {
        id: 'loadout-default',
        name: 'Default Citadel Crest',
        context: 'default',
        appearance: { ...DEFAULT_APPEARANCE },
        titleId: null,
        secondaryTitleId: null,
        badgeIds: [],
        updatedAt: nowIso,
      };
      ledger.users[userId] = {
        unlockedIds: starters,
        unlockedDetails: details,
        appearance: { ...DEFAULT_APPEARANCE },
        claimedMilestoneIds: [],
        loadouts: [starterLoadout],
        activeLoadoutId: starterLoadout.id,
        competitionLoadoutId: null,
      };
    }
    const u = ledger.users[userId];
    if (!Array.isArray(u.unlockedIds)) u.unlockedIds = [];
    if (!u.unlockedDetails) u.unlockedDetails = {};
    if (!u.appearance) u.appearance = { ...DEFAULT_APPEARANCE };
    if (!Array.isArray(u.claimedMilestoneIds)) u.claimedMilestoneIds = [];
    if (!Array.isArray(u.loadouts) || u.loadouts.length === 0) {
      const starterLoadout: PlayerLoadout = {
        id: 'loadout-default',
        name: 'Default Citadel Crest',
        context: 'default',
        appearance: { ...u.appearance },
        titleId: null,
        secondaryTitleId: null,
        badgeIds: [],
        updatedAt: new Date().toISOString(),
      };
      u.loadouts = [starterLoadout];
      u.activeLoadoutId = starterLoadout.id;
    }
    if (!u.activeLoadoutId) u.activeLoadoutId = u.loadouts[0]?.id || null;
    if (u.competitionLoadoutId === undefined) u.competitionLoadoutId = null;
    return u;
  };

  const evaluateVerifiedCosmeticUnlocks = (ledger: CosmeticsLedgerFile, userId: string) => {
    const u = ensureUser(ledger, userId);
    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));
    const seasonLedger = safeReadJson(path.join(rootDir, '.lifequest_seasons.json'));
    const territoryLedger = safeReadJson(path.join(rootDir, '.lifequest_territory_wars.json'));

    const idUser = identityLedger?.users?.[userId];
    const level = Number(idUser?.verifiedSnapshot?.level || 1);
    const workouts = Number(idUser?.verifiedSnapshot?.totalWorkoutsCompleted || 0);
    const habits = Number(idUser?.verifiedSnapshot?.totalHabitsCompleted || 0);
    const achievements = Number(idUser?.verifiedSnapshot?.totalAchievementsUnlocked || 0);

    let maxSeasonTier = 0;
    if (seasonLedger?.playerProgress) {
      for (const p of Object.values(seasonLedger.playerProgress) as any[]) {
        if (p?.userId === userId) {
          maxSeasonTier = Math.max(maxSeasonTier, Number(p.currentTier || 0));
        }
      }
    }

    const territoryWonCosmetics: string[] = Array.isArray(
      territoryLedger?.userCosmeticsEarned?.[userId]
    )
      ? territoryLedger.userCosmeticsEarned[userId]
      : [];

    const newlyUnlocked: Array<{ id: string; name: string; rarity: string }> = [];
    const nowIso = new Date().toISOString();

    for (const item of COSMETICS_CATALOG) {
      if (u.unlockedIds.includes(item.id)) continue;
      let qualifies = false;
      let sourceRef = 'verified_progression';
      const rule = item.unlockRule;
      if (rule.type === 'starter') {
        qualifies = true;
        sourceRef = 'starter';
      } else if (rule.type === 'level' && level >= rule.threshold) {
        qualifies = true;
        sourceRef = `level:${rule.threshold}`;
      } else if (rule.type === 'workouts' && workouts >= rule.threshold) {
        qualifies = true;
        sourceRef = `workouts:${rule.threshold}`;
      } else if (rule.type === 'habits' && habits >= rule.threshold) {
        qualifies = true;
        sourceRef = `habits:${rule.threshold}`;
      } else if (rule.type === 'achievements' && achievements >= rule.threshold) {
        qualifies = true;
        sourceRef = `achievements:${rule.threshold}`;
      } else if (rule.type === 'season' && maxSeasonTier >= rule.threshold) {
        qualifies = true;
        sourceRef = `season_tier:${rule.threshold}`;
      } else if (rule.type === 'territory' && territoryWonCosmetics.includes(item.id)) {
        qualifies = true;
        sourceRef = 'territory_wars';
      }

      if (qualifies) {
        u.unlockedIds.push(item.id);
        u.unlockedDetails[item.id] = { unlockedAt: nowIso, sourceRef };
        newlyUnlocked.push({ id: item.id, name: item.name, rarity: item.rarity });
      }
    }

    return newlyUnlocked;
  };

  async function grantDirectCosmetic(
    paramsOrUserId: string | { userId: string; cosmeticId: string; sourceRef: string },
    cosmeticIdArg?: string,
    sourceRefArg?: string
  ): Promise<boolean> {
    const userId = typeof paramsOrUserId === 'string' ? paramsOrUserId : paramsOrUserId.userId;
    const cosmeticId =
      typeof paramsOrUserId === 'string' ? String(cosmeticIdArg || '') : paramsOrUserId.cosmeticId;
    const sourceRef =
      typeof paramsOrUserId === 'string' ? String(sourceRefArg || 'system') : paramsOrUserId.sourceRef;

    const def = COSMETICS_CATALOG.find(c => c.id === cosmeticId);
    if (!def || !userId) return false;
    const granted = await withLock(() => {
      const ledger = readLedger();
      const u = ensureUser(ledger, userId);
      if (u.unlockedIds.includes(cosmeticId)) return false;
      u.unlockedIds.push(cosmeticId);
      u.unlockedDetails[cosmeticId] = { unlockedAt: new Date().toISOString(), sourceRef };
      writeLedger(ledger);
      return true;
    });
    if (granted && opts?.onCosmeticUnlocked) {
      await opts.onCosmeticUnlocked({
        userId,
        cosmeticId: def.id,
        cosmeticName: def.name,
        rarity: def.rarity,
      });
    }
    return granted;
  }

  const getAppearanceSync = (userId: string): CharacterAppearance | undefined => {
    const ledger = readLedger();
    return ledger.users[userId]?.appearance;
  };

  const getUnlockedCountSync = (userId: string): number => {
    const ledger = readLedger();
    return ledger.users[userId]?.unlockedIds?.length || 0;
  };

  const getCompetitionAppearanceSync = (userId: string): CharacterAppearance | undefined => {
    const ledger = readLedger();
    const u = ledger.users[userId];
    if (!u) return undefined;
    if (u.competitionLoadoutId) {
      const comp = u.loadouts?.find(l => l.id === u.competitionLoadoutId);
      if (comp) return comp.appearance;
    }
    return u.appearance;
  };

  const toResponse = (userId: string, u: StoredUserCosmetics): PlayerCosmeticState => ({
    userId,
    unlockedIds: u.unlockedIds,
    unlockedDetails: u.unlockedDetails,
    appearance: u.appearance,
    claimedMilestoneIds: u.claimedMilestoneIds,
    loadouts: u.loadouts,
    activeLoadoutId: u.activeLoadoutId,
    competitionLoadoutId: u.competitionLoadoutId,
    unlockedLoadoutSlots: computeMaxLoadoutSlots(userId, u.unlockedIds.length),
  });

  const validateOwnedAppearance = (
    u: StoredUserCosmetics,
    appearance: Partial<CharacterAppearance>
  ): { ok: boolean; sanitized?: CharacterAppearance; error?: string } => {
    const keys: Array<keyof CharacterAppearance> = [
      'hairstyleId',
      'outfitId',
      'colorId',
      'frameId',
      'bannerId',
      'auraId',
    ];
    const sanitized: CharacterAppearance = { ...u.appearance };
    for (const k of keys) {
      if (!(k in appearance)) continue;
      const val = appearance[k];
      if (val === null || val === '') {
        sanitized[k] = null;
        continue;
      }
      const id = String(val).trim();
      const def = COSMETICS_CATALOG.find(c => c.id === id);
      if (!def) {
        return { ok: false, error: `Unknown cosmetic item: ${id}` };
      }
      if (!u.unlockedIds.includes(id)) {
        return { ok: false, error: `Cosmetic "${def.name}" is locked on your account.` };
      }
      sanitized[k] = id;
    }
    return { ok: true, sanitized };
  };

  const validateOwnedIdentityForLoadout = (
    userId: string,
    titleId: string | null | undefined,
    secondaryTitleId: string | null | undefined,
    badgeIds: string[]
  ): { ok: boolean; error?: string } => {
    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));
    const idUser = identityLedger?.users?.[userId];
    const unlockedTitles = new Set<string>(
      Array.isArray(idUser?.unlockedTitles) ? idUser.unlockedTitles.map((t: any) => t.titleId) : []
    );
    const unlockedBadges = new Set<string>(
      Array.isArray(idUser?.unlockedBadges) ? idUser.unlockedBadges.map((b: any) => b.badgeId) : []
    );

    if (titleId && !unlockedTitles.has(titleId)) {
      return { ok: false, error: 'Primary title in loadout is not unlocked.' };
    }
    if (secondaryTitleId && !unlockedTitles.has(secondaryTitleId)) {
      return { ok: false, error: 'Secondary title in loadout is not unlocked.' };
    }
    for (const bid of badgeIds) {
      if (!unlockedBadges.has(bid)) {
        return { ok: false, error: `Badge "${bid}" in loadout is not unlocked.` };
      }
    }
    return { ok: true };
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/cosmetics/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const { state, newlyUnlocked } = await withLock(() => {
        const ledger = readLedger();
        const newly = evaluateVerifiedCosmeticUnlocks(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);
        writeLedger(ledger);
        return { state: toResponse(auth.userId!, u), newlyUnlocked: newly };
      });

      for (const item of newlyUnlocked) {
        if (opts?.onCosmeticUnlocked) {
          await opts.onCosmeticUnlocked({
            userId: auth.userId,
            cosmeticId: item.id,
            cosmeticName: item.name,
            rarity: item.rarity,
          });
        }
      }

      res.json({ success: true, state });
    });

    app.post('/api/cosmetics/sync-verified', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('unlockedIds' in body || 'grantCosmeticId' in body || 'unlockAll' in body) {
        res.status(400).json({
          success: false,
          error: 'Unauthorized cosmetic unlock overrides are rejected.',
        });
        return;
      }

      const { state, newlyUnlocked } = await withLock(() => {
        const ledger = readLedger();
        const newly = evaluateVerifiedCosmeticUnlocks(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);
        writeLedger(ledger);
        return { state: toResponse(auth.userId!, u), newlyUnlocked: newly };
      });

      for (const item of newlyUnlocked) {
        if (opts?.onCosmeticUnlocked) {
          await opts.onCosmeticUnlocked({
            userId: auth.userId,
            cosmeticId: item.id,
            cosmeticName: item.name,
            rarity: item.rarity,
          });
        }
      }

      res.json({ success: true, state });
    });

    app.post('/api/cosmetics/equip', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const cosmeticId = String(req.body?.cosmeticId || '').trim();
      const def = COSMETICS_CATALOG.find(c => c.id === cosmeticId);
      if (!def) {
        res.status(404).json({ success: false, error: 'Cosmetic item not found.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        evaluateVerifiedCosmeticUnlocks(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);
        if (!u.unlockedIds.includes(cosmeticId)) {
          return {
            status: 403,
            payload: {
              success: false,
              error: `Cosmetic "${def.name}" is locked. Unlock via: ${def.unlockSource}`,
            },
          };
        }

        const slotMap: Record<CosmeticSlot, keyof CharacterAppearance> = {
          hairstyle: 'hairstyleId',
          outfit: 'outfitId',
          color: 'colorId',
          frame: 'frameId',
          banner: 'bannerId',
          aura: 'auraId',
        };
        u.appearance[slotMap[def.slot]] = def.id;
        // Also mirror into currently active loadout if present
        const activeLoadout = u.loadouts.find(l => l.id === u.activeLoadoutId);
        if (activeLoadout) {
          activeLoadout.appearance[slotMap[def.slot]] = def.id;
          activeLoadout.updatedAt = new Date().toISOString();
        }
        writeLedger(ledger);
        return { status: 200, payload: { success: true, state: toResponse(auth.userId!, u) } };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/cosmetics/unequip', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const slot = String(req.body?.slot || '').trim() as CosmeticSlot;
      const slotMap: Record<CosmeticSlot, keyof CharacterAppearance> = {
        hairstyle: 'hairstyleId',
        outfit: 'outfitId',
        color: 'colorId',
        frame: 'frameId',
        banner: 'bannerId',
        aura: 'auraId',
      };
      if (!(slot in slotMap)) {
        res.status(400).json({ success: false, error: 'Invalid cosmetic slot.' });
        return;
      }

      const state = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        u.appearance[slotMap[slot]] = null;
        const activeLoadout = u.loadouts.find(l => l.id === u.activeLoadoutId);
        if (activeLoadout) {
          activeLoadout.appearance[slotMap[slot]] = null;
          activeLoadout.updatedAt = new Date().toISOString();
        }
        writeLedger(ledger);
        return toResponse(auth.userId!, u);
      });

      res.json({ success: true, state });
    });

    app.post('/api/cosmetics/claim-milestone', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const milestoneId = String(req.body?.milestoneId || '').trim();
      const ms = COSMETIC_MILESTONES.find(m => m.id === milestoneId);
      if (!ms) {
        res.status(404).json({ success: false, error: 'Collection milestone not found.' });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        evaluateVerifiedCosmeticUnlocks(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);
        if (u.claimedMilestoneIds.includes(ms.id)) {
          return { status: 409, payload: { success: false, error: 'Collection milestone already claimed.' } };
        }
        if (u.unlockedIds.length < ms.requiredUnlocked) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires ${ms.requiredUnlocked} unlocked cosmetics (${u.unlockedIds.length}/${ms.requiredUnlocked}).`,
            },
          };
        }

        u.claimedMilestoneIds.push(ms.id);
        if (!u.unlockedIds.includes(ms.rewardCosmeticId)) {
          u.unlockedIds.push(ms.rewardCosmeticId);
          u.unlockedDetails[ms.rewardCosmeticId] = {
            unlockedAt: new Date().toISOString(),
            sourceRef: `collection_milestone:${ms.id}`,
          };
        }
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, rewardLabel: ms.rewardLabel, state: toResponse(auth.userId!, u) },
        };
      });

      res.status(result.status).json(result.payload);
    });

    // --- AAA 3: PLAYER LOADOUT SYSTEM ---
    app.get('/api/loadouts/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const state = await withLock(() => {
        const ledger = readLedger();
        evaluateVerifiedCosmeticUnlocks(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);
        writeLedger(ledger);
        return toResponse(auth.userId!, u);
      });
      res.json({ success: true, state });
    });

    app.post('/api/loadouts/save', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const name = String(body.name || 'Saved Loadout').trim().slice(0, 48);
      if (name.length < 2) {
        res.status(400).json({ success: false, error: 'Loadout name must be at least 2 characters.' });
        return;
      }
      const context = body.context === 'competition' ? 'competition' : 'default';
      const titleId = body.titleId ? String(body.titleId).trim() : null;
      const secondaryTitleId = body.secondaryTitleId ? String(body.secondaryTitleId).trim() : null;
      const badgeIds: string[] = Array.isArray(body.badgeIds)
        ? Array.from(new Set<string>(body.badgeIds.map((x: unknown) => String(x || '').trim()).filter(Boolean))).slice(0, 4)
        : [];
      const loadoutId = body.id ? String(body.id).trim() : '';

      const idCheck = validateOwnedIdentityForLoadout(auth.userId, titleId, secondaryTitleId, badgeIds);
      if (!idCheck.ok) {
        res.status(403).json({ success: false, error: idCheck.error });
        return;
      }

      const result = await withLock(() => {
        const ledger = readLedger();
        evaluateVerifiedCosmeticUnlocks(ledger, auth.userId!);
        const u = ensureUser(ledger, auth.userId!);
        const maxSlots = computeMaxLoadoutSlots(auth.userId!, u.unlockedIds.length);
        const appCheck = validateOwnedAppearance(
          u,
          body.appearance && typeof body.appearance === 'object' ? body.appearance : {}
        );
        if (!appCheck.ok || !appCheck.sanitized) {
          return { status: 403, payload: { success: false, error: appCheck.error || 'Unowned cosmetic.' } };
        }

        const nowIso = new Date().toISOString();
        const existingIdx = loadoutId ? u.loadouts.findIndex(l => l.id === loadoutId) : -1;
        if (existingIdx >= 0) {
          u.loadouts[existingIdx] = {
            ...u.loadouts[existingIdx],
            name,
            context,
            appearance: appCheck.sanitized,
            titleId,
            secondaryTitleId,
            badgeIds,
            updatedAt: nowIso,
          };
        } else {
          if (u.loadouts.length >= maxSlots) {
            return {
              status: 400,
              payload: {
                success: false,
                error: `Loadout slot limit reached (${u.loadouts.length}/${maxSlots}). Unlock more slots by leveling up or collecting cosmetics.`,
              },
            };
          }
          const newLoadout: PlayerLoadout = {
            id: `loadout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name,
            context,
            appearance: appCheck.sanitized,
            titleId,
            secondaryTitleId,
            badgeIds,
            updatedAt: nowIso,
          };
          u.loadouts.push(newLoadout);
        }

        writeLedger(ledger);
        return { status: 200, payload: { success: true, state: toResponse(auth.userId!, u) } };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/loadouts/equip', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const loadoutId = String(req.body?.loadoutId || '').trim();
      const applyAs = req.body?.applyAs === 'competition' ? 'competition' : 'default';

      const result = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        const target = u.loadouts.find(l => l.id === loadoutId);
        if (!target) {
          return { status: 404, payload: { success: false, error: 'Loadout not found.' } };
        }
        const appCheck = validateOwnedAppearance(u, target.appearance);
        if (!appCheck.ok || !appCheck.sanitized) {
          return { status: 403, payload: { success: false, error: appCheck.error } };
        }

        if (applyAs === 'competition') {
          u.competitionLoadoutId = target.id;
        } else {
          u.activeLoadoutId = target.id;
          u.appearance = { ...appCheck.sanitized };
        }
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, equippedLoadout: target, state: toResponse(auth.userId!, u) },
        };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/loadouts/duplicate', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const loadoutId = String(req.body?.loadoutId || '').trim();

      const result = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        const maxSlots = computeMaxLoadoutSlots(auth.userId!, u.unlockedIds.length);
        if (u.loadouts.length >= maxSlots) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Loadout slot limit reached (${u.loadouts.length}/${maxSlots}).`,
            },
          };
        }
        const src = u.loadouts.find(l => l.id === loadoutId);
        if (!src) return { status: 404, payload: { success: false, error: 'Loadout not found.' } };
        const copy: PlayerLoadout = {
          ...src,
          id: `loadout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: `${src.name.slice(0, 38)} (Copy)`,
          appearance: { ...src.appearance },
          badgeIds: [...src.badgeIds],
          updatedAt: new Date().toISOString(),
        };
        u.loadouts.push(copy);
        writeLedger(ledger);
        return { status: 200, payload: { success: true, state: toResponse(auth.userId!, u) } };
      });

      res.status(result.status).json(result.payload);
    });

    app.post('/api/loadouts/delete', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const loadoutId = String(req.body?.loadoutId || '').trim();

      const result = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, auth.userId!);
        if (u.loadouts.length <= 1) {
          return { status: 400, payload: { success: false, error: 'Keep at least 1 saved loadout.' } };
        }
        const next = u.loadouts.filter(l => l.id !== loadoutId);
        if (next.length === u.loadouts.length) {
          return { status: 404, payload: { success: false, error: 'Loadout not found.' } };
        }
        u.loadouts = next;
        if (u.activeLoadoutId === loadoutId) u.activeLoadoutId = u.loadouts[0].id;
        if (u.competitionLoadoutId === loadoutId) u.competitionLoadoutId = null;
        writeLedger(ledger);
        return { status: 200, payload: { success: true, state: toResponse(auth.userId!, u) } };
      });

      res.status(result.status).json(result.payload);
    });

    app.get('/api/cosmetics/public/:targetUserId', (req: Request, res: Response) => {
      const targetUserId = String(req.params.targetUserId || '').trim();
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing targetUserId.' });
        return;
      }
      const ledger = readLedger();
      const u = ledger.users[targetUserId];
      const compLoadout = u?.competitionLoadoutId
        ? u.loadouts?.find(l => l.id === u.competitionLoadoutId) || null
        : null;
      res.json({
        success: true,
        appearance: u?.appearance || DEFAULT_APPEARANCE,
        competitionAppearance: compLoadout?.appearance || u?.appearance || DEFAULT_APPEARANCE,
        activeLoadout: u?.loadouts?.find(l => l.id === u.activeLoadoutId) || null,
        unlockedCount: u?.unlockedIds?.length || 6,
      });
    });
  };

  return {
    registerRoutes,
    grantDirectCosmetic,
    getAppearanceSync,
    getCompetitionAppearanceSync,
    getUnlockedCountSync,
  };
}

