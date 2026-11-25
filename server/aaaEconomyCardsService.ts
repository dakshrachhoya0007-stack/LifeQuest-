import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { resolveOptionalViewerId, resolveVerifiedCaller } from './authGuard.ts';
import {
  CARD_COLLECTION_ACHIEVEMENTS,
  CARD_PACKS_CATALOG,
  COLLECTIBLE_CARDS_CATALOG,
  COLLECTION_COMPLETION_MILESTONES,
  DUPLICATE_CARD_FRAGMENT_RATES,
  MARKETPLACE_ITEMS_CATALOG,
} from '../src/data/aaaGamingData.ts';
import { COSMETICS_CATALOG } from '../src/data/expansionData.ts';
import { GLOBAL_EXCLUSIVE_ACHIEVEMENTS } from '../src/data/globalLegendsData.ts';
import { PLAYER_TITLES_CATALOG, RARE_BADGES_CATALOG } from '../src/data/polish2Data.ts';
import type {
  CardsStateResponse,
  CollectibleCardDef,
  CollectibleCardRarity,
  CollectionCompletionResponse,
  MarketplaceStateResponse,
  PlayerCollectibleCardEntry,
  PlayerWalletState,
} from '../src/types/game.ts';

interface StoredWalletRecord {
  goldBalance: number;
  cosmeticFragments: number;
  initializedFromClient: boolean;
  recentTransactions: PlayerWalletState['recentTransactions'];
  idempotencyKeys: Record<string, boolean>;
}

interface StoredCardsRecord {
  owned: Record<string, PlayerCollectibleCardEntry>;
  favoriteCardIds: string[];
  packHistory: CardsStateResponse['packHistory'];
  claimedAchievements: string[];
}

interface StoredMarketplaceRecord {
  ownedItemIds: string[];
  wishlistIds: string[];
  orders: MarketplaceStateResponse['orders'];
}

interface StoredCollectionRecord {
  claimedMilestoneIds: string[];
}

interface AaaEconomyCardsLedger {
  wallets: Record<string, StoredWalletRecord>;
  cards: Record<string, StoredCardsRecord>;
  marketplace: Record<string, StoredMarketplaceRecord>;
  collection: Record<string, StoredCollectionRecord>;
}

const RARITY_RANK: Record<CollectibleCardRarity, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythic: 5,
};

const safeReadJson = (p: string): any => {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    // ignore corrupt read
  }
  return null;
};

const pickRarityByRates = (
  rates: Record<CollectibleCardRarity, number>,
  minRarity: CollectibleCardRarity = 'Common'
): CollectibleCardRarity => {
  const minRank = RARITY_RANK[minRarity];
  const entries = (Object.entries(rates) as Array<[CollectibleCardRarity, number]>).filter(
    ([r, w]) => RARITY_RANK[r] >= minRank && w > 0
  );
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return minRarity;
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[entries.length - 1][0];
};

const pickCardForRarity = (
  rarity: CollectibleCardRarity,
  featuredCategory?: string
): CollectibleCardDef => {
  const exact = COLLECTIBLE_CARDS_CATALOG.filter(c => c.rarity === rarity);
  const pool = exact.length > 0 ? exact : COLLECTIBLE_CARDS_CATALOG;
  if (featuredCategory) {
    const featured = pool.filter(c => c.category === featuredCategory);
    if (featured.length > 0 && Math.random() < 0.55) {
      return featured[Math.floor(Math.random() * featured.length)];
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

export function createAaaEconomyCardsService(
  rootDir: string,
  deps?: {
    grantDirectCosmetic?: (params: {
      userId: string;
      cosmeticId: string;
      sourceRef: string;
    }) => Promise<boolean>;
    grantDirectTitle?: (params: {
      userId: string;
      titleId: string;
      sourceRef: string;
    }) => Promise<boolean>;
    evaluateIdentity?: (params: { userId: string; idempotencyKey?: string }) => Promise<any>;
    onRewardNotification?: (params: {
      userId: string;
      eventKey: string;
      title: string;
      body: string;
      actionTab?: string;
    }) => Promise<void>;
    isPairBlocked?: (a: string, b: string) => boolean;
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_aaa_economy_cards.json');
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

  const readLedger = (): AaaEconomyCardsLedger => {
    const parsed = safeReadJson(LEDGER_PATH);
    if (parsed && typeof parsed === 'object') {
      return {
        wallets: parsed.wallets && typeof parsed.wallets === 'object' ? parsed.wallets : {},
        cards: parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {},
        marketplace:
          parsed.marketplace && typeof parsed.marketplace === 'object' ? parsed.marketplace : {},
        collection:
          parsed.collection && typeof parsed.collection === 'object' ? parsed.collection : {},
      };
    }
    return { wallets: {}, cards: {}, marketplace: {}, collection: {} };
  };

  const writeLedger = (ledger: AaaEconomyCardsLedger) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
  };

  const ensureWallet = (ledger: AaaEconomyCardsLedger, userId: string): StoredWalletRecord => {
    if (!ledger.wallets[userId]) {
      ledger.wallets[userId] = {
        goldBalance: 250, // Fair welcome starter Gold for immediate interaction
        cosmeticFragments: 50,
        initializedFromClient: false,
        recentTransactions: [
          {
            id: `tx-init-${Date.now()}`,
            currency: 'gold',
            delta: 250,
            source: 'Citadel Welcome Purse',
            createdAt: new Date().toISOString(),
          },
          {
            id: `tx-initf-${Date.now()}`,
            currency: 'fragments',
            delta: 50,
            source: 'Citadel Welcome Fragments',
            createdAt: new Date().toISOString(),
          },
        ],
        idempotencyKeys: {},
      };
    }
    const w = ledger.wallets[userId];
    if (!Array.isArray(w.recentTransactions)) w.recentTransactions = [];
    if (!w.idempotencyKeys || typeof w.idempotencyKeys !== 'object') w.idempotencyKeys = {};
    return w;
  };

  const ensureCards = (ledger: AaaEconomyCardsLedger, userId: string): StoredCardsRecord => {
    if (!ledger.cards[userId]) {
      ledger.cards[userId] = {
        owned: {},
        favoriteCardIds: [],
        packHistory: [],
        claimedAchievements: [],
      };
    }
    const c = ledger.cards[userId];
    if (!c.owned || typeof c.owned !== 'object') c.owned = {};
    if (!Array.isArray(c.favoriteCardIds)) c.favoriteCardIds = [];
    if (!Array.isArray(c.packHistory)) c.packHistory = [];
    if (!Array.isArray(c.claimedAchievements)) c.claimedAchievements = [];
    return c;
  };

  const ensureMarketplace = (
    ledger: AaaEconomyCardsLedger,
    userId: string
  ): StoredMarketplaceRecord => {
    if (!ledger.marketplace[userId]) {
      ledger.marketplace[userId] = {
        ownedItemIds: [],
        wishlistIds: [],
        orders: [],
      };
    }
    const m = ledger.marketplace[userId];
    if (!Array.isArray(m.ownedItemIds)) m.ownedItemIds = [];
    if (!Array.isArray(m.wishlistIds)) m.wishlistIds = [];
    if (!Array.isArray(m.orders)) m.orders = [];
    return m;
  };

  const ensureCollection = (
    ledger: AaaEconomyCardsLedger,
    userId: string
  ): StoredCollectionRecord => {
    if (!ledger.collection[userId]) {
      ledger.collection[userId] = {
        claimedMilestoneIds: [],
      };
    }
    const c = ledger.collection[userId];
    if (!Array.isArray(c.claimedMilestoneIds)) c.claimedMilestoneIds = [];
    return c;
  };

  const recordWalletDelta = (
    w: StoredWalletRecord,
    currency: 'gold' | 'fragments',
    delta: number,
    source: string,
    idempotencyKey?: string
  ): boolean => {
    if (idempotencyKey) {
      if (w.idempotencyKeys[idempotencyKey]) return false;
      w.idempotencyKeys[idempotencyKey] = true;
    }
    if (currency === 'gold') {
      w.goldBalance = Math.max(0, Math.round(w.goldBalance + delta));
    } else {
      w.cosmeticFragments = Math.max(0, Math.round(w.cosmeticFragments + delta));
    }
    w.recentTransactions.unshift({
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      currency,
      delta: Math.round(delta),
      source: source.slice(0, 80),
      createdAt: new Date().toISOString(),
    });
    w.recentTransactions = w.recentTransactions.slice(0, 40);
    return true;
  };

  const grantCardInternal = (
    ledger: AaaEconomyCardsLedger,
    userId: string,
    cardId: string,
    sourceRef: string
  ): { isNew: boolean; fragmentsConverted: number; card: CollectibleCardDef | null } => {
    const def = COLLECTIBLE_CARDS_CATALOG.find(c => c.id === cardId) || null;
    if (!def) return { isNew: false, fragmentsConverted: 0, card: null };
    const cards = ensureCards(ledger, userId);
    const wallet = ensureWallet(ledger, userId);
    const existing = cards.owned[cardId];
    if (existing) {
      existing.quantity += 1;
      const fragValue = DUPLICATE_CARD_FRAGMENT_RATES[def.rarity] || 15;
      recordWalletDelta(
        wallet,
        'fragments',
        fragValue,
        `Duplicate Card Conversion: ${def.name}`
      );
      return { isNew: false, fragmentsConverted: fragValue, card: def };
    }
    cards.owned[cardId] = {
      cardId,
      quantity: 1,
      firstObtainedAt: new Date().toISOString(),
      isFavorite: false,
      favoriteSlot: null,
      sourceRef,
    };
    return { isNew: true, fragmentsConverted: 0, card: def };
  };

  const openPackInternal = (
    ledger: AaaEconomyCardsLedger,
    userId: string,
    packId: string,
    sourceLabel: string
  ) => {
    const pack = CARD_PACKS_CATALOG.find(p => p.id === packId);
    if (!pack) return null;
    const cards = ensureCards(ledger, userId);
    const drawnCards: Array<{ cardId: string; isNew: boolean; fragmentsConverted: number }> = [];
    let totalFragmentsGranted = 0;

    for (let i = 0; i < pack.cardCount; i++) {
      // First slot enforces pack's guaranteedMinRarity; remaining honor exact dropRates
      const rarity =
        i === 0
          ? pickRarityByRates(pack.dropRates, pack.guaranteedMinRarity)
          : pickRarityByRates(pack.dropRates, 'Common');
      const cardDef = pickCardForRarity(rarity, pack.featuredCategory);
      const outcome = grantCardInternal(ledger, userId, cardDef.id, sourceLabel);
      totalFragmentsGranted += outcome.fragmentsConverted;
      drawnCards.push({
        cardId: cardDef.id,
        isNew: outcome.isNew,
        fragmentsConverted: outcome.fragmentsConverted,
      });
    }

    const entry = {
      id: `pack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      packId: pack.id,
      packName: pack.name,
      cardsDrawn: drawnCards,
      totalFragmentsGranted,
      openedAt: new Date().toISOString(),
    };
    cards.packHistory.unshift(entry);
    cards.packHistory = cards.packHistory.slice(0, 30);

    return { entry, drawnCards, totalFragmentsGranted };
  };

  const toWalletResponse = (userId: string, w: StoredWalletRecord): PlayerWalletState => ({
    userId,
    goldBalance: w.goldBalance,
    cosmeticFragments: w.cosmeticFragments,
    recentTransactions: w.recentTransactions,
  });

  const toCardsResponse = (userId: string, c: StoredCardsRecord): CardsStateResponse => {
    const ownedList = Object.values(c.owned).map(entry => {
      const slotIdx = c.favoriteCardIds.indexOf(entry.cardId);
      return {
        ...entry,
        isFavorite: slotIdx >= 0,
        favoriteSlot: slotIdx >= 0 ? slotIdx : null,
      };
    });
    const uniqueOwnedCount = ownedList.length;
    const totalCatalogCount = COLLECTIBLE_CARDS_CATALOG.length;
    return {
      userId,
      ownedCards: ownedList,
      favoriteCardIds: c.favoriteCardIds,
      uniqueOwnedCount,
      totalCatalogCount,
      completionPercent: Math.round((uniqueOwnedCount / Math.max(1, totalCatalogCount)) * 100),
      packHistory: c.packHistory,
      claimedCollectionAchievements: c.claimedAchievements,
      duplicateFragmentRates: DUPLICATE_CARD_FRAGMENT_RATES,
    };
  };

  const computeCollectionState = (
    ledger: AaaEconomyCardsLedger,
    userId: string
  ): CollectionCompletionResponse => {
    const col = ensureCollection(ledger, userId);
    const cardsRec = ensureCards(ledger, userId);

    const identityLedger = safeReadJson(path.join(rootDir, '.lifequest_identity_ledger.json'));
    const cosmeticsLedger = safeReadJson(path.join(rootDir, '.lifequest_cosmetics.json'));
    const legendsLedger = safeReadJson(path.join(rootDir, '.lifequest_global_legends.json'));
    const seasonsLedger = safeReadJson(path.join(rootDir, '.lifequest_seasons.json'));

    const unlockedTitleSet = new Set<string>(
      (identityLedger?.users?.[userId]?.unlockedTitles || []).map((t: any) => String(t.titleId))
    );
    const unlockedBadgeSet = new Set<string>(
      (identityLedger?.users?.[userId]?.unlockedBadges || []).map((b: any) => String(b.badgeId))
    );
    const unlockedCosmeticSet = new Set<string>(
      cosmeticsLedger?.users?.[userId]?.unlockedIds || []
    );
    const legendClaims = legendsLedger?.claims || {};
    const seasonalCosmetics = new Set<string>(
      (seasonsLedger?.cosmeticCollectionByUser?.[userId] || []).map((x: any) => String(x.rewardId))
    );

    const trophiesItems = [
      ...RARE_BADGES_CATALOG.map(b => ({
        id: b.id,
        name: b.name,
        rarity: b.rarity,
        status: unlockedBadgeSet.has(b.id)
          ? ('owned' as const)
          : b.globalExclusive
          ? ('undiscovered' as const)
          : ('unowned' as const),
        hint: b.unlockRequirement,
      })),
      ...GLOBAL_EXCLUSIVE_ACHIEVEMENTS.filter(g => !g.isHidden).map(g => ({
        id: g.id,
        name: g.name,
        rarity: g.rarity,
        status:
          legendClaims[g.id]?.ownerId === userId
            ? ('owned' as const)
            : legendClaims[g.id]
            ? ('unowned' as const)
            : ('undiscovered' as const),
        hint: g.requirementSummary,
      })),
    ];

    const cardsItems = COLLECTIBLE_CARDS_CATALOG.map(c => ({
      id: c.id,
      name: c.name,
      rarity: c.rarity,
      status: cardsRec.owned[c.id]
        ? ('owned' as const)
        : c.rarity === 'Mythic'
        ? ('undiscovered' as const)
        : ('unowned' as const),
      hint: c.limitedEdition
        ? `Seasonal Card (${c.seasonTag || 'Limited'})`
        : `${c.subtitle} · Card Pack or Milestone`,
      seasonalTag: c.seasonTag,
    }));

    const cosmeticsItems = COSMETICS_CATALOG.map(c => ({
      id: c.id,
      name: c.name,
      rarity: c.rarity,
      status: unlockedCosmeticSet.has(c.id) ? ('owned' as const) : ('unowned' as const),
      hint: c.unlockSource,
    }));

    const seasonalItems = [
      ...COLLECTIBLE_CARDS_CATALOG.filter(c => c.limitedEdition).map(c => ({
        id: `sea_${c.id}`,
        name: c.name,
        rarity: c.rarity,
        status: cardsRec.owned[c.id] ? ('owned' as const) : ('unowned' as const),
        hint: `Earn via ${c.seasonTag || 'Season 1'} Battle Pass & Canopy Packs`,
        seasonalTag: c.seasonTag || 'Season 1',
      })),
      ...PLAYER_TITLES_CATALOG.filter(t => t.limitedEdition).map(t => ({
        id: `sea_${t.id}`,
        name: `Title: ${t.name}`,
        rarity: t.rarity,
        status:
          unlockedTitleSet.has(t.id) || seasonalCosmetics.has(t.id)
            ? ('owned' as const)
            : ('unowned' as const),
        hint: t.unlockRequirement,
        seasonalTag: 'Season 1',
      })),
    ];

    const rawCategories: Array<{
      key: CollectionCompletionResponse['categories'][number]['key'];
      label: string;
      items: CollectionCompletionResponse['categories'][number]['items'];
    }> = [
      { key: 'trophies', label: 'Trophies & Rare Badges', items: trophiesItems },
      { key: 'cards', label: 'Collectible Fantasy Cards', items: cardsItems },
      { key: 'cosmetics', label: '2D Cosmetics & Frames', items: cosmeticsItems },
      { key: 'seasonal', label: 'Seasonal Limited Items', items: seasonalItems },
    ];

    const categories = rawCategories.map(cat => {
      const ownedCount = cat.items.filter(i => i.status === 'owned').length;
      const undiscoveredCount = cat.items.filter(i => i.status === 'undiscovered').length;
      const totalCount = cat.items.length;
      return {
        key: cat.key,
        label: cat.label,
        ownedCount,
        totalCount,
        undiscoveredCount,
        percent: Math.round((ownedCount / Math.max(1, totalCount)) * 100),
        items: cat.items,
      };
    });

    const overallOwnedCount = categories.reduce((s, c) => s + c.ownedCount, 0);
    const overallTotalCount = categories.reduce((s, c) => s + c.totalCount, 0);
    const overallPercent = Math.round(
      (overallOwnedCount / Math.max(1, overallTotalCount)) * 100
    );

    const milestones = COLLECTION_COMPLETION_MILESTONES.map(m => ({
      ...m,
      unlocked: overallPercent >= m.thresholdPercent,
      claimed: col.claimedMilestoneIds.includes(m.id),
    }));

    return {
      userId,
      categories,
      overallOwnedCount,
      overallTotalCount,
      overallPercent,
      milestones,
    };
  };

  // --- Programmatic Cross-Service Grant Helpers ---
  const creditGold = async (
    userId: string,
    amount: number,
    source: string,
    idempotencyKey?: string
  ) => {
    if (!userId || amount === 0) return null;
    return withLock(() => {
      const ledger = readLedger();
      const w = ensureWallet(ledger, userId);
      recordWalletDelta(w, 'gold', amount, source, idempotencyKey);
      writeLedger(ledger);
      return toWalletResponse(userId, w);
    });
  };

  const creditFragments = async (
    userId: string,
    amount: number,
    source: string,
    idempotencyKey?: string
  ) => {
    if (!userId || amount === 0) return null;
    return withLock(() => {
      const ledger = readLedger();
      const w = ensureWallet(ledger, userId);
      recordWalletDelta(w, 'fragments', amount, source, idempotencyKey);
      writeLedger(ledger);
      return toWalletResponse(userId, w);
    });
  };

  const grantCollectibleCard = async (
    userId: string,
    cardId: string,
    sourceRef: string
  ) => {
    const res = await withLock(() => {
      const ledger = readLedger();
      const cards = ensureCards(ledger, userId);
      const granted = grantCardInternal(ledger, userId, cardId, sourceRef);
      writeLedger(ledger);
      return {
        ...granted,
        state: toCardsResponse(userId, cards),
      };
    });
    if (res.card && deps?.evaluateIdentity) {
      await deps.evaluateIdentity({ userId });
    }
    return res;
  };

  const grantCardPack = async (userId: string, packId: string, sourceLabel: string) => {
    const res = await withLock(() => {
      const ledger = readLedger();
      const opened = openPackInternal(ledger, userId, packId, sourceLabel);
      writeLedger(ledger);
      return opened;
    });
    if (res && deps?.evaluateIdentity) {
      await deps.evaluateIdentity({ userId });
    }
    return res;
  };

  const getUniqueCardCountSync = (userId: string): number => {
    const ledger = readLedger();
    return Object.keys(ledger.cards[userId]?.owned || {}).length;
  };

  const getMarketplaceUnlockCountSync = (userId: string): number => {
    const ledger = readLedger();
    return ledger.marketplace[userId]?.ownedItemIds?.length || 0;
  };

  const getCollectionPercentSync = (userId: string): number => {
    const ledger = readLedger();
    return computeCollectionState(ledger, userId).overallPercent;
  };

  const buildMarketplaceResponse = (
    ledger: AaaEconomyCardsLedger,
    userId: string
  ): MarketplaceStateResponse => {
    const wallet = ensureWallet(ledger, userId);
    const mkt = ensureMarketplace(ledger, userId);
    const now = new Date();
    const weekSeed = Math.floor(now.getTime() / (7 * 86400_000));
    const rotatingPool = MARKETPLACE_ITEMS_CATALOG.filter(i => i.rotating);
    const featured = [
      ...MARKETPLACE_ITEMS_CATALOG.filter(i => !i.rotating).slice(0, 2),
      ...(rotatingPool.length > 0
        ? [rotatingPool[weekSeed % rotatingPool.length]]
        : []),
    ].map(i => i.id);

    const nextWeekStart = new Date((weekSeed + 1) * 7 * 86400_000).toISOString();

    return {
      wallet: toWalletResponse(userId, wallet),
      ownedItemIds: mkt.ownedItemIds,
      wishlistIds: mkt.wishlistIds,
      featuredItemIds: featured,
      rotationEndsAt: nextWeekStart,
      realMoneyCheckoutEnabled: false,
      realMoneyStatusNotice:
        'Real-money checkout is currently disabled (Payment Settlement Not Configured). All Marketplace items & Card Packs unlock strictly with earned Gold or Cosmetic Fragments.',
      orders: mkt.orders.slice(0, 30),
    };
  };

  const registerRoutes = (app: Express) => {
    // --- WALLET ROUTES ---
    app.get('/api/economy/wallet', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const wallet = await withLock(() => {
        const ledger = readLedger();
        const w = ensureWallet(ledger, auth.userId!);
        writeLedger(ledger);
        return toWalletResponse(auth.userId!, w);
      });
      res.json({ success: true, wallet });
    });

    app.post('/api/economy/sync-initial-gold', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('fragments' in body || 'cosmeticFragments' in body || 'setGold' in body) {
        res.status(400).json({
          success: false,
          error: 'Direct fragment or currency override payloads are rejected.',
        });
        return;
      }

      const requestedBaseline = Math.max(0, Math.min(2000, Math.round(Number(body.gold || 0))));
      const wallet = await withLock(() => {
        const ledger = readLedger();
        const w = ensureWallet(ledger, auth.userId!);
        if (!w.initializedFromClient) {
          w.initializedFromClient = true;
          if (requestedBaseline > w.goldBalance) {
            const delta = requestedBaseline - w.goldBalance;
            recordWalletDelta(
              w,
              'gold',
              delta,
              'Existing Hero Treasury Sync',
              `init_sync:${auth.userId}`
            );
          }
          writeLedger(ledger);
        }
        return toWalletResponse(auth.userId!, w);
      });
      res.json({ success: true, wallet });
    });

    // --- COLLECTIBLE CARDS ROUTES ---
    app.get('/api/cards/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const payload = await withLock(() => {
        const ledger = readLedger();
        const c = ensureCards(ledger, auth.userId!);
        const w = ensureWallet(ledger, auth.userId!);
        writeLedger(ledger);
        return { state: toCardsResponse(auth.userId!, c), wallet: toWalletResponse(auth.userId!, w) };
      });
      res.json({ success: true, ...payload });
    });

    app.post('/api/cards/open-pack', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('odds' in body || 'cards' in body || 'pricePaid' in body || 'dropRates' in body) {
        res.status(400).json({
          success: false,
          error: 'Client-supplied pack odds, prices, or card draws are rejected.',
        });
        return;
      }

      const packId = String(body.packId || '').trim();
      const currency: 'gold' | 'fragments' = body.currency === 'fragments' ? 'fragments' : 'gold';
      const pack = CARD_PACKS_CATALOG.find(p => p.id === packId);
      if (!pack) {
        res.status(404).json({ success: false, error: 'Card pack not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const w = ensureWallet(ledger, auth.userId!);
        const cost = currency === 'fragments' ? pack.priceFragments : pack.priceGold;
        const available = currency === 'fragments' ? w.cosmeticFragments : w.goldBalance;

        if (available < cost) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Insufficient ${currency === 'fragments' ? 'Cosmetic Fragments' : 'Gold'} (${available}/${cost}).`,
            },
          };
        }

        recordWalletDelta(w, currency, -cost, `Opened ${pack.name}`);
        const opened = openPackInternal(ledger, auth.userId!, pack.id, `pack:${pack.id}`);
        writeLedger(ledger);
        const cardsState = toCardsResponse(auth.userId!, ensureCards(ledger, auth.userId!));

        return {
          status: 200,
          payload: {
            success: true,
            pack,
            currencyUsed: currency,
            costPaid: cost,
            drawnCards: opened?.drawnCards || [],
            fragmentsGrantedFromDuplicates: opened?.totalFragmentsGranted || 0,
            wallet: toWalletResponse(auth.userId!, w),
            state: cardsState,
          },
        };
      });

      if (outcome.status === 200 && deps?.evaluateIdentity) {
        await deps.evaluateIdentity({ userId: auth.userId });
      }
      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/cards/favorites', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const rawIds = Array.isArray(req.body?.cardIds) ? req.body.cardIds : [];
      const cardIds = Array.from(
        new Set<string>(rawIds.map((x: unknown) => String(x || '').trim()).filter(Boolean))
      );
      if (cardIds.length > 3) {
        res.status(400).json({
          success: false,
          error: 'Profile Favorite Cards Showcase supports up to 3 cards.',
        });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const c = ensureCards(ledger, auth.userId!);
        for (const id of cardIds) {
          if (!c.owned[id]) {
            return {
              status: 403,
              payload: { success: false, error: `Card "${id}" is not yet owned.` },
            };
          }
        }
        c.favoriteCardIds = cardIds;
        writeLedger(ledger);
        return {
          status: 200,
          payload: { success: true, state: toCardsResponse(auth.userId!, c) },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });

    app.post('/api/cards/claim-achievement', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const achievementId = String(req.body?.achievementId || '').trim();
      const def = CARD_COLLECTION_ACHIEVEMENTS.find(a => a.id === achievementId);
      if (!def) {
        res.status(404).json({ success: false, error: 'Card collection achievement not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const c = ensureCards(ledger, auth.userId!);
        const w = ensureWallet(ledger, auth.userId!);
        if (c.claimedAchievements.includes(def.id)) {
          return {
            status: 409,
            payload: { success: false, error: 'Card collection achievement already claimed.' },
          };
        }

        const ownedDefs = Object.keys(c.owned)
          .map(cid => COLLECTIBLE_CARDS_CATALOG.find(item => item.id === cid))
          .filter((x): x is CollectibleCardDef => Boolean(x));

        const qualified = def.requiredRarity
          ? ownedDefs.some(item => item.rarity === def.requiredRarity)
          : ownedDefs.length >= def.requiredUniqueCards;

        if (!qualified) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requirement not met yet for ${def.title}.`,
            },
          };
        }

        c.claimedAchievements.push(def.id);
        recordWalletDelta(
          w,
          'gold',
          def.rewardGold,
          `Card Milestone: ${def.title}`,
          `card_ach_g:${def.id}:${auth.userId}`
        );
        recordWalletDelta(
          w,
          'fragments',
          def.rewardFragments,
          `Card Milestone: ${def.title}`,
          `card_ach_f:${def.id}:${auth.userId}`
        );
        writeLedger(ledger);
        return {
          status: 200,
          rewardTitleId: def.rewardTitleId,
          payload: {
            success: true,
            rewardGold: def.rewardGold,
            rewardFragments: def.rewardFragments,
            wallet: toWalletResponse(auth.userId!, w),
            state: toCardsResponse(auth.userId!, c),
          },
        };
      });

      if (outcome.status === 200 && outcome.rewardTitleId && deps?.grantDirectTitle) {
        await deps.grantDirectTitle({
          userId: auth.userId,
          titleId: outcome.rewardTitleId,
          sourceRef: `card_ach:${def.id}`,
        });
      }
      if (outcome.status === 200 && deps?.evaluateIdentity) {
        await deps.evaluateIdentity({ userId: auth.userId });
      }
      res.status(outcome.status).json(outcome.payload);
    });

    app.get('/api/cards/public/:targetUserId', async (req: Request, res: Response) => {
      const targetUserId = String(req.params.targetUserId || '').trim();
      const viewerId = await resolveOptionalViewerId(req);
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing targetUserId.' });
        return;
      }
      if (viewerId && deps?.isPairBlocked?.(targetUserId, viewerId)) {
        res.json({ success: true, favoriteCards: [], uniqueOwnedCount: 0, totalCatalogCount: COLLECTIBLE_CARDS_CATALOG.length });
        return;
      }
      const ledger = readLedger();
      const c = ledger.cards[targetUserId];
      const favoriteIds = c?.favoriteCardIds || [];
      const favoriteCards = favoriteIds
        .map(id => COLLECTIBLE_CARDS_CATALOG.find(item => item.id === id))
        .filter((item): item is CollectibleCardDef => Boolean(item));
      res.json({
        success: true,
        favoriteCards,
        uniqueOwnedCount: Object.keys(c?.owned || {}).length,
        totalCatalogCount: COLLECTIBLE_CARDS_CATALOG.length,
      });
    });

    // --- COSMETIC MARKETPLACE ROUTES ---
    app.get('/api/marketplace/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const state = await withLock(() => {
        const ledger = readLedger();
        const data = buildMarketplaceResponse(ledger, auth.userId!);
        writeLedger(ledger);
        return data;
      });
      res.json({ success: true, state });
    });

    app.post('/api/marketplace/wishlist/toggle', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const itemId = String(req.body?.itemId || '').trim();
      if (!MARKETPLACE_ITEMS_CATALOG.some(i => i.id === itemId)) {
        res.status(404).json({ success: false, error: 'Marketplace item not found.' });
        return;
      }
      const state = await withLock(() => {
        const ledger = readLedger();
        const mkt = ensureMarketplace(ledger, auth.userId!);
        if (mkt.wishlistIds.includes(itemId)) {
          mkt.wishlistIds = mkt.wishlistIds.filter(id => id !== itemId);
        } else {
          mkt.wishlistIds.push(itemId);
        }
        writeLedger(ledger);
        return buildMarketplaceResponse(ledger, auth.userId!);
      });
      res.json({ success: true, state });
    });

    app.post('/api/marketplace/purchase', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if ('pricePaid' in body || 'free' in body || 'xpBoost' in body) {
        res.status(400).json({
          success: false,
          error: 'Untrusted price or pay-to-win overrides are rejected.',
        });
        return;
      }

      const itemId = String(body.itemId || '').trim();
      const currency: 'gold' | 'fragments' = body.currency === 'fragments' ? 'fragments' : 'gold';
      const item = MARKETPLACE_ITEMS_CATALOG.find(i => i.id === itemId);
      if (!item) {
        res.status(404).json({ success: false, error: 'Marketplace item not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const w = ensureWallet(ledger, auth.userId!);
        const mkt = ensureMarketplace(ledger, auth.userId!);

        if (item.category !== 'pack' && mkt.ownedItemIds.includes(item.id)) {
          return {
            status: 409,
            payload: { success: false, error: `${item.name} is already owned.` },
          };
        }

        const price = currency === 'fragments' ? item.priceFragments : item.priceGold;
        const available = currency === 'fragments' ? w.cosmeticFragments : w.goldBalance;
        if (available < price) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Insufficient ${currency === 'fragments' ? 'Cosmetic Fragments' : 'Gold'} (${available}/${price}).`,
            },
          };
        }

        recordWalletDelta(w, currency, -price, `Marketplace: ${item.name}`);
        if (item.category !== 'pack') {
          mkt.ownedItemIds.push(item.id);
          mkt.wishlistIds = mkt.wishlistIds.filter(id => id !== item.id);
        }

        const packDraw = item.linkedPackId
          ? openPackInternal(ledger, auth.userId!, item.linkedPackId, `marketplace:${item.id}`)
          : null;

        mkt.orders.unshift({
          id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemId: item.id,
          itemName: item.name,
          currency,
          pricePaid: price,
          createdAt: new Date().toISOString(),
        });
        mkt.orders = mkt.orders.slice(0, 40);

        writeLedger(ledger);
        return {
          status: 200,
          item,
          packDraw,
          payload: {
            success: true,
            purchasedItem: item,
            drawnCards: packDraw?.drawnCards || null,
            fragmentsGrantedFromDuplicates: packDraw?.totalFragmentsGranted || 0,
            state: buildMarketplaceResponse(ledger, auth.userId!),
          },
        };
      });

      if (outcome.status === 200 && outcome.item) {
        if (outcome.item.linkedCosmeticId && deps?.grantDirectCosmetic) {
          await deps.grantDirectCosmetic({
            userId: auth.userId,
            cosmeticId: outcome.item.linkedCosmeticId,
            sourceRef: `marketplace:${outcome.item.id}`,
          });
        }
        if (outcome.item.linkedTitleId && deps?.grantDirectTitle) {
          await deps.grantDirectTitle({
            userId: auth.userId,
            titleId: outcome.item.linkedTitleId,
            sourceRef: `marketplace:${outcome.item.id}`,
          });
        }
        if (deps?.evaluateIdentity) {
          await deps.evaluateIdentity({ userId: auth.userId });
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });

    // Explicitly disabled Real-Money Checkout endpoint (security compliance test target)
    app.post('/api/marketplace/checkout-rm', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      res.status(403).json({
        success: false,
        realMoneyCheckoutEnabled: false,
        error:
          'Payment Settlement Not Configured: Real-money purchases are disabled. Use earned Gold or Cosmetic Fragments instead.',
      });
    });

    // --- COLLECTION COMPLETION ROUTES ---
    app.get('/api/collection/state', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const state = await withLock(() => {
        const ledger = readLedger();
        const data = computeCollectionState(ledger, auth.userId!);
        writeLedger(ledger);
        return data;
      });
      res.json({ success: true, state });
    });

    app.post('/api/collection/claim-milestone', async (req: Request, res: Response) => {
      const auth = await resolveVerifiedCaller(req);
      if (!auth.ok || !auth.userId) {
        res.status(auth.status || 401).json({ success: false, error: auth.error });
        return;
      }
      const milestoneId = String(req.body?.milestoneId || '').trim();
      const def = COLLECTION_COMPLETION_MILESTONES.find(m => m.id === milestoneId);
      if (!def) {
        res.status(404).json({ success: false, error: 'Collection milestone not found.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const col = ensureCollection(ledger, auth.userId!);
        const w = ensureWallet(ledger, auth.userId!);
        if (col.claimedMilestoneIds.includes(def.id)) {
          return {
            status: 409,
            payload: { success: false, error: 'Collection milestone already claimed.' },
          };
        }
        const computed = computeCollectionState(ledger, auth.userId!);
        if (computed.overallPercent < def.thresholdPercent) {
          return {
            status: 400,
            payload: {
              success: false,
              error: `Requires ${def.thresholdPercent}% overall collection completion (currently ${computed.overallPercent}%).`,
            },
          };
        }

        col.claimedMilestoneIds.push(def.id);
        recordWalletDelta(
          w,
          'fragments',
          def.rewardFragments,
          `Collection Milestone (${def.thresholdPercent}%)`,
          `col_ms:${def.id}:${auth.userId}`
        );
        writeLedger(ledger);
        return {
          status: 200,
          def,
          payload: {
            success: true,
            wallet: toWalletResponse(auth.userId!, w),
            state: computeCollectionState(ledger, auth.userId!),
          },
        };
      });

      if (outcome.status === 200 && outcome.def) {
        if (outcome.def.rewardTitleId && deps?.grantDirectTitle) {
          await deps.grantDirectTitle({
            userId: auth.userId,
            titleId: outcome.def.rewardTitleId,
            sourceRef: `collection:${outcome.def.id}`,
          });
        }
        if (outcome.def.rewardCosmeticId && deps?.grantDirectCosmetic) {
          await deps.grantDirectCosmetic({
            userId: auth.userId,
            cosmeticId: outcome.def.rewardCosmeticId,
            sourceRef: `collection:${outcome.def.id}`,
          });
        }
        if (deps?.onRewardNotification) {
          await deps.onRewardNotification({
            userId: auth.userId,
            eventKey: `col_ms:${outcome.def.id}`,
            title: `Collection Milestone: ${outcome.def.title}`,
            body: `Earned ${outcome.def.rewardLabel}!`,
            actionTab: 'trophies',
          });
        }
      }

      res.status(outcome.status).json(outcome.payload);
    });
  };

  return {
    registerRoutes,
    creditGold,
    creditFragments,
    grantCollectibleCard,
    grantCardPack,
    getUniqueCardCountSync,
    getMarketplaceUnlockCountSync,
    getCollectionPercentSync,
  };
}
