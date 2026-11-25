import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveOptionalViewerId, resolveVerifiedCaller } from './authGuard.ts';
import { GLOBAL_EXCLUSIVE_ACHIEVEMENTS } from '../src/data/globalLegendsData.ts';
import { RARE_BADGES_CATALOG } from '../src/data/polish2Data.ts';
import { MUSEUM_LOCKED_MILESTONES } from '../src/data/ecosystemData.ts';
import type { HiddenAchievementClientView, TrophyShowcaseItem, TrophyShowcaseState } from '../src/types/game.ts';
import type { PrivacyFieldKey, SyncedProfileRecord } from './presenceAndPrivacy.ts';

interface TrophyPinsLedgerFile {
  pinnedByUser: Record<string, string[]>;
}

export interface TrophyShowcaseDeps {
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
  };
}

const KNOWN_STANDARD_ACHIEVEMENTS: Array<{
  id: string;
  name: string;
  description: string;
  category: 'achievements' | 'fitness' | 'competitions' | 'seasons';
  rarity: TrophyShowcaseItem['rarity'];
  requirement: string;
}> = [
  {
    id: 'ach-1',
    name: 'First Quest',
    description: 'Completed and claimed your very first quest in Aetheria.',
    category: 'achievements',
    rarity: 'Common',
    requirement: 'Claim 1 quest in the Quest Board',
  },
  {
    id: 'ach-2',
    name: 'The Consistent',
    description: 'Maintained a 3-day consecutive healthy habit streak.',
    category: 'fitness',
    rarity: 'Rare',
    requirement: 'Maintain a 3-day habit streak',
  },
  {
    id: 'ach-4',
    name: 'Boss Slayer',
    description: 'Defeated your first Kingdom boss in turn-based combat.',
    category: 'competitions',
    rarity: 'Epic',
    requirement: 'Defeat 1 Kingdom Boss',
  },
  {
    id: 'ach-5',
    name: 'Aether Vision Master',
    description: 'Completed a workout session verified with camera motion tracking.',
    category: 'fitness',
    rarity: 'Epic',
    requirement: 'Verify 1 workout with Aether Vision',
  },
  {
    id: 'ach-6',
    name: 'Kingdom Explorer',
    description: 'Unlocked and advanced across kingdoms in the realm chronicle.',
    category: 'achievements',
    rarity: 'Legendary',
    requirement: 'Unlock 5 Kingdoms',
  },
  {
    id: 'ach-7',
    name: 'Team Player',
    description: 'Contributed alongside fellow adventurers in guild objectives.',
    category: 'competitions',
    rarity: 'Rare',
    requirement: 'Contribute to a Guild quest',
  },
];

const KNOWN_ACH_MAP = new Map(KNOWN_STANDARD_ACHIEVEMENTS.map(a => [a.id, a]));

const safeReadJson = (filePath: string): any => {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    // ignore corrupted read
  }
  return null;
};

export function createTrophyShowcaseService(rootDir: string, deps: TrophyShowcaseDeps) {
  const PINS_PATH = path.join(rootDir, '.lifequest_trophy_pins.json');
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

  const readPins = (): TrophyPinsLedgerFile => {
    const parsed = safeReadJson(PINS_PATH);
    if (parsed && parsed.pinnedByUser && typeof parsed.pinnedByUser === 'object') {
      return { pinnedByUser: parsed.pinnedByUser };
    }
    return { pinnedByUser: {} };
  };

  const writePins = (data: TrophyPinsLedgerFile) => {
    fs.writeFileSync(PINS_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const collectUserTrophies = (userId: string, pinsLedger: TrophyPinsLedgerFile): TrophyShowcaseState => {
    const profile = deps.privacyHelper.getProfileSnapshot(userId);
    const legendsLedger = safeReadJson(path.join(rootDir, '.lifequest_legends_ledger.json'));
    const museumLedger = safeReadJson(path.join(rootDir, '.lifequest_museum.json'));
    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));
    const seasonsLedger = safeReadJson(path.join(rootDir, '.lifequest_seasons.json'));

    const seenIds = new Set<string>();
    const trophies: TrophyShowcaseItem[] = [];
    const userPinnedIds = Array.isArray(pinsLedger.pinnedByUser[userId])
      ? pinsLedger.pinnedByUser[userId]
      : [];
    const pinSet = new Set(userPinnedIds);

    const addTrophy = (item: Omit<TrophyShowcaseItem, 'pinned'>) => {
      if (seenIds.has(item.id)) return;
      seenIds.add(item.id);
      trophies.push({ ...item, pinned: pinSet.has(item.id) });
    };

    // 1. Verified Standard Achievements (strictly cross-checked against known achievement IDs)
    if (Array.isArray(profile?.achievements)) {
      for (const a of profile.achievements) {
        if (!a || !a.unlocked) continue;
        const known = KNOWN_ACH_MAP.get(String(a.id));
        if (!known) continue;
        addTrophy({
          id: `trophy:ach:${known.id}`,
          sourceKind: 'achievement',
          category: known.category,
          title: known.name,
          description: known.description,
          requirement: known.requirement,
          rarity: known.rarity,
          unlockedAt: profile.updatedAt || new Date().toISOString(),
        });
      }
    }

    // 2. Global Exclusive Achievements from Hall of Legends ledger
    if (legendsLedger?.claims && typeof legendsLedger.claims === 'object') {
      for (const claim of Object.values(legendsLedger.claims) as any[]) {
        if (claim?.ownerId !== userId) continue;
        const def = GLOBAL_EXCLUSIVE_ACHIEVEMENTS.find(g => g.id === claim.achievementId);
        if (!def) continue;
        addTrophy({
          id: `trophy:legend:${def.id}`,
          sourceKind: 'global_legend',
          category: 'achievements',
          title: def.name,
          description: def.story,
          requirement: def.requirementSummary,
          rarity: def.rarity === 'Ascendant' || def.rarity === 'Celestial' ? 'Mythic' : def.rarity,
          unlockedAt: claim.claimedAt || new Date().toISOString(),
          isGlobalExclusive: true,
        });
      }
    }

    // 3. Rare Identity Badges from Identity ledger
    const identUser = identityLedger?.users?.[userId];
    if (Array.isArray(identUser?.unlockedBadges)) {
      for (const ub of identUser.unlockedBadges) {
        const def = RARE_BADGES_CATALOG.find(b => b.id === ub.badgeId);
        if (!def) continue;
        addTrophy({
          id: `trophy:badge:${def.id}`,
          sourceKind: 'badge',
          category:
            def.conditionType === 'rivalry_wins' || def.conditionType === 'boss_damage_total' || def.conditionType === 'bosses_defeated'
              ? 'competitions'
              : def.conditionType === 'workouts_total' || def.conditionType === 'verified_reps_total'
              ? 'fitness'
              : 'achievements',
          title: def.name,
          description: def.description,
          requirement: def.unlockRequirement,
          rarity: def.rarity === 'Uncommon' ? 'Common' : def.rarity,
          unlockedAt: ub.unlockedAt || new Date().toISOString(),
          isGlobalExclusive: Boolean(def.globalExclusive),
          globalClaimOrder: ub.globalClaimOrder ?? null,
        });
      }
    }

    // 4. Personal Records Museum verified highlights (Personal Bests, Boss/Rivalry/Community wins)
    if (Array.isArray(museumLedger?.records)) {
      const userRecords = museumLedger.records.filter((r: any) => r.userId === userId && r.verified);
      for (const r of userRecords) {
        if (!r.isPersonalBest && !['boss_battle', 'rivalry', 'community_event', 'rare_legendary'].includes(r.category)) {
          continue;
        }
        const cat: TrophyShowcaseItem['category'] =
          r.category === 'boss_battle' || r.category === 'rivalry'
            ? 'competitions'
            : r.category === 'seasonal'
            ? 'seasons'
            : r.category === 'community_event' || r.category === 'rare_legendary'
            ? 'achievements'
            : 'fitness';
        addTrophy({
          id: `trophy:museum:${r.metricKey}`,
          sourceKind: 'museum',
          category: cat,
          title: r.title,
          description: `${r.description} (${r.displayValue})`,
          requirement: `Verified Record · ${r.displayValue}`,
          rarity: r.rarity || 'Rare',
          unlockedAt: r.achievedAt || new Date().toISOString(),
        });
      }
    }

    // 5. Seasonal Journey permanent trophies
    const seasonCollection = Array.isArray(seasonsLedger?.cosmeticCollectionByUser?.[userId])
      ? seasonsLedger.cosmeticCollectionByUser[userId]
      : [];
    for (const sc of seasonCollection) {
      addTrophy({
        id: `trophy:season:${sc.seasonId}:${sc.rewardId}`,
        sourceKind: 'season',
        category: 'seasons',
        title: sc.rewardLabel,
        description: `Earned in ${sc.seasonName} (${sc.track === 'elite' ? 'Elite Track' : 'Free Track'}).`,
        requirement: `${sc.seasonName} Progression`,
        rarity: sc.track === 'elite' ? 'Legendary' : 'Epic',
        unlockedAt: sc.earnedAt || new Date().toISOString(),
      });
    }

    // Also include legacy claimed milestones in playerProgress if collection record absent
    if (seasonsLedger?.playerProgress && typeof seasonsLedger.playerProgress === 'object') {
      for (const prog of Object.values(seasonsLedger.playerProgress) as any[]) {
        if (prog?.userId !== userId || !Array.isArray(prog.unlockedCosmetics)) continue;
        for (const label of prog.unlockedCosmetics) {
          const idKey = `trophy:season:${prog.seasonId}:${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          if (!trophies.some(t => t.sourceKind === 'season' && t.title === label)) {
            addTrophy({
              id: idKey,
              sourceKind: 'season',
              category: 'seasons',
              title: String(label),
              description: 'Earned via verified Seasonal Journey dedication.',
              requirement: 'Seasonal Journey Milestone',
              rarity: 'Epic',
              unlockedAt: prog.updatedAt || new Date().toISOString(),
            });
          }
        }
      }
    }

    trophies.sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt));

    const validPinnedIds = userPinnedIds.filter(id => seenIds.has(id)).slice(0, 6);
    const totalAvailableCount =
      KNOWN_STANDARD_ACHIEVEMENTS.length +
      RARE_BADGES_CATALOG.length +
      MUSEUM_LOCKED_MILESTONES.length +
      5; // Season milestone tiers
    const unlockedCount = trophies.length;
    const completionPercent = Math.min(
      100,
      Math.round((unlockedCount / Math.max(1, totalAvailableCount)) * 100)
    );

    return {
      userId,
      trophies,
      pinnedIds: validPinnedIds,
      totalAvailableCount,
      unlockedCount,
      completionPercent,
    };
  };

  const buildHiddenAchievementsView = (userId: string): HiddenAchievementClientView[] => {
    const legendsLedger = safeReadJson(path.join(rootDir, '.lifequest_legends_ledger.json'));
    const claims = legendsLedger?.claims && typeof legendsLedger.claims === 'object' ? legendsLedger.claims : {};
    const hiddenDefs = GLOBAL_EXCLUSIVE_ACHIEVEMENTS.filter(g => g.isHidden);

    return hiddenDefs.map(def => {
      const ownerClaim = claims[def.id] || null;
      const revealedToCaller = Boolean(ownerClaim && ownerClaim.ownerId === userId);
      const claimedGlobally = Boolean(ownerClaim);
      const discovered = revealedToCaller || claimedGlobally;
      const maskedHint = def.hint || 'Walk steadily across balanced fitness, recovery, and fellowship.';
      return {
        id: def.id,
        discovered,
        revealed: discovered,
        unlockedByCaller: revealedToCaller,
        name: discovered ? def.name : 'Sealed Realm Mystery',
        maskedTitle: 'Sealed Realm Mystery',
        maskedHint,
        hint: maskedHint,
        rarity: def.rarity,
        emblemIcon: def.emblemIcon,
        story: discovered ? def.story : undefined,
        titleTag: discovered ? def.titleTag : undefined,
        requirementSummary: revealedToCaller ? def.requirementSummary : undefined,
        globalFirstOwnerName: ownerClaim?.ownerUsername || null,
        unlockedAt: revealedToCaller ? ownerClaim?.claimedAt : null,
      };
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/trophies/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const { state, hiddenAchievements } = await withLock(() => {
        const pins = readPins();
        return {
          state: collectUserTrophies(auth.userId!, pins),
          hiddenAchievements: buildHiddenAchievementsView(auth.userId!),
        };
      });

      res.json({ success: true, state, hiddenAchievements });
    });

    app.get('/api/trophies/hidden-achievements', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const hiddenAchievements = buildHiddenAchievementsView(auth.userId);
      res.json({ success: true, hiddenAchievements });
    });

    app.get('/api/trophies/public/:targetUserId', async (req: Request, res: Response) => {
      const targetUserId = String(req.params.targetUserId || '').trim();
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing targetUserId.' });
        return;
      }

      const viewerId = await resolveOptionalViewerId(req);
      const rel = deps.privacyHelper.getRelationForUsers(targetUserId, viewerId);
      if (rel.relation === 'blocked') {
        res.status(403).json({ success: false, error: 'Trophy showcase unavailable due to block settings.' });
        return;
      }

      const canView = deps.privacyHelper.canViewFieldForUsers(targetUserId, viewerId, 'achievements');
      if (!canView) {
        res.json({
          success: true,
          restricted: true,
          state: {
            userId: targetUserId,
            trophies: [],
            pinnedIds: [],
            totalAvailableCount: 0,
            unlockedCount: 0,
            completionPercent: 0,
          },
        });
        return;
      }

      const state = await withLock(() => {
        const pins = readPins();
        return collectUserTrophies(targetUserId, pins);
      });

      // Public profile shows pinned trophies prioritized (or top 6 unlocked if none pinned yet)
      res.json({ success: true, restricted: false, state });
    });

    app.post('/api/trophies/pin', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }

      const rawIds: string[] = Array.isArray(req.body?.pinnedIds)
        ? req.body.pinnedIds.map((x: unknown) => String(x))
        : [];
      const uniqueIds: string[] = Array.from(new Set(rawIds.map(id => id.trim()).filter(Boolean)));

      if (uniqueIds.length > 6) {
        res.status(400).json({ success: false, error: 'You can pin up to 6 trophies in your showcase.' });
        return;
      }

      const result = await withLock(() => {
        const pins = readPins();
        const current = collectUserTrophies(auth.userId!, pins);
        const ownedSet = new Set(current.trophies.map(t => t.id));
        const unowned = uniqueIds.find(id => !ownedSet.has(id));
        if (unowned) {
          return {
            status: 403,
            payload: { success: false, error: 'Cannot pin a trophy you have not genuinely unlocked.' },
          };
        }

        pins.pinnedByUser[auth.userId!] = uniqueIds;
        writePins(pins);
        return {
          status: 200,
          payload: { success: true, state: collectUserTrophies(auth.userId!, pins) },
        };
      });

      res.status(result.status).json(result.payload);
    });
  };

  return { registerRoutes };
}
