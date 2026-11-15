import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { ShopItem, Weapon, WeaponCategory, WeaponRarity } from '../../types/game';
import {
  ArsenalItemBlueprint,
  blueprintToWeapon,
  createExpandedCategoryAbilities,
  findBlueprintByWeaponId,
  PROGRESSION_UNLOCK_BLUEPRINTS,
} from '../../data/weaponArsenal';
import { createAbilitiesForCategory, INITIAL_WEAPONS } from '../../data/initialData';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import {
  getRarityStyle,
  isBeyondMythicRarity,
  RARITY_ORDER,
  WEAPON_CATEGORIES_ORDER,
} from '../../utils/rarityStyles';
import { sound } from '../../utils/audio';
import {
  Award,
  Check,
  Coins,
  Eye,
  Hammer,
  Lock,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';

type StoreFilterCategory = 'All' | WeaponCategory | 'Consumables';
type StoreViewMode = 'bazaar' | 'relics';

export const StoreView: React.FC = () => {
  const {
    shopItems,
    weapons,
    kingdoms,
    stats,
    purchaseShopItem,
    unlockProgressionWeapon,
    equipGearSlot,
    setActiveTab,
    recordEquipmentInspected,
  } = useGame();

  const [storeMode, setStoreMode] = useState<StoreViewMode>('bazaar');
  const [categoryFilter, setCategoryFilter] = useState<StoreFilterCategory>('All');
  const [rarityFilter, setRarityFilter] = useState<WeaponRarity | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<{
    weapon: Weapon;
    priceGold?: number;
    priceForgeXp?: number;
    requiredLevel?: number;
    shopItemId?: string;
    blueprint?: ArsenalItemBlueprint;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const aetherStageOrder = ['Dormant', 'Awakened', 'Ascended', 'Mythic', 'Transcendent'];

  const getStoreItemCategory = (item: ShopItem): StoreFilterCategory => {
    if (item.itemType === 'elixir' || item.itemType === 'buff' || item.itemType === 'catalyst') {
      return 'Consumables';
    }
    const metaCat = item.metadata?.category as WeaponCategory | undefined;
    if (metaCat) return metaCat;
    return 'Swords';
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shopItems.filter(item => {
      if (isBeyondMythicRarity(item.rarity)) return false;
      const cat = getStoreItemCategory(item);
      const matchCat = categoryFilter === 'All' || cat === categoryFilter;
      const matchRarity = rarityFilter === 'All' || item.rarity === rarityFilter;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        String(item.metadata?.category || item.itemType).toLowerCase().includes(q) ||
        String(item.metadata?.element || '').toLowerCase().includes(q);
      return matchCat && matchRarity && matchSearch;
    });
  }, [shopItems, categoryFilter, rarityFilter, searchQuery]);

  const filteredRelics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PROGRESSION_UNLOCK_BLUEPRINTS.filter(bp => {
      const matchCat = categoryFilter === 'All' || bp.category === categoryFilter;
      const matchRarity = rarityFilter === 'All' || bp.rarity === rarityFilter;
      const matchSearch =
        !q ||
        bp.name.toLowerCase().includes(q) ||
        bp.description.toLowerCase().includes(q) ||
        bp.category.toLowerCase().includes(q) ||
        bp.element.toLowerCase().includes(q);
      return matchCat && matchRarity && matchSearch;
    });
  }, [categoryFilter, rarityFilter, searchQuery]);

  const handlePurchase = async (item: ShopItem) => {
    if (buyingId) return;
    setBuyingId(item.id);
    setFeedback(null);

    const res = await purchaseShopItem(item.id);
    setBuyingId(null);

    if (!res.success) {
      setFeedback({
        type: 'error',
        text: res.error || 'Purchase could not be completed right now.',
      });
    } else {
      setFeedback({
        type: 'success',
        text:
          item.itemType === 'catalyst'
            ? `Transmuted ${item.name}! +${item.metadata?.grantForgeXp || 80} Forge XP added.`
            : item.itemType === 'elixir' || item.itemType === 'buff'
            ? `Activated ${item.name}! Buff charges added to your Active Buffs.`
            : `Acquired ${item.name}! It has been added to your Armory & ready to equip.`,
      });
      setInspectedItem(null);
    }
  };

  const handleClaimRelic = async (bp: ArsenalItemBlueprint) => {
    if (claimingId) return;
    setClaimingId(bp.id);
    setFeedback(null);
    const res = await unlockProgressionWeapon(bp.id);
    setClaimingId(null);

    if (!res.success) {
      setFeedback({
        type: 'error',
        text: res.error || 'Progression milestone criteria not yet satisfied.',
      });
    } else {
      setFeedback({
        type: 'success',
        text: `Unsealed ${bp.rarity} relic: ${bp.name}! Added to your Armory.`,
      });
      setInspectedItem(null);
    }
  };

  const buildInspectWeaponFromShop = (item: ShopItem): Weapon => {
    const meta = item.metadata || {};
    const targetId = String(meta.weaponId || item.id);
    const bp = findBlueprintByWeaponId(targetId);
    if (bp) return blueprintToWeapon(bp);

    const legacyMatch = INITIAL_WEAPONS.find(w => w.id === targetId || w.name === item.name);
    if (legacyMatch) return legacyMatch;

    const category = (meta.category || 'Swords') as WeaponCategory;
    return {
      id: targetId,
      name: item.name,
      category,
      rarity: item.rarity,
      level: 1,
      maxLevel: Number(meta.maxLevel || 12),
      baseAttack: Number(meta.baseAttack || 20),
      attackPerLevel: Number(meta.attackPerLevel || 5),
      baseDefense: Number(meta.baseDefense || 5),
      defensePerLevel: Number(meta.defensePerLevel || 2),
      critChance: Number(meta.critChance ?? 8),
      critDamage: Number(meta.critDamage ?? 185),
      speed: Number(meta.speed ?? 65),
      element: (meta.element || 'Physical') as Weapon['element'],
      abilityPower: Number(meta.abilityPower ?? 10),
      specialAbilityName: meta.specialAbilityName as string | undefined,
      specialAbilitySummary: meta.specialAbilitySummary as string | undefined,
      combatIntegrationStatus: 'active_in_combat',
      obtainMethod: 'shop',
      upgradeForgeCost: Number(meta.upgradeForgeCost || 35),
      unlocked: false,
      equipped: false,
      description: item.description,
      lore: String(meta.lore || 'Forged inside the Royal Aetherian Treasury.'),
      evolutionStage: 'Dormant',
      masteryLevel: 1,
      masteryXP: 0,
      masteryXPNextLevel: 100,
      masteryPath: 'Strength',
      abilities: createAbilitiesForCategory(category, 2) || createExpandedCategoryAbilities(category, 2),
    };
  };

  const categoryTabs: { id: StoreFilterCategory; label: string }[] = [
    { id: 'All', label: 'All Goods' },
    ...WEAPON_CATEGORIES_ORDER.map(cat => ({
      id: cat as StoreFilterCategory,
      label: cat === 'Magic Staffs' ? 'Staves' : cat,
    })),
    ...(storeMode === 'bazaar' ? [{ id: 'Consumables' as StoreFilterCategory, label: 'Elixirs & Catalysts' }] : []),
  ];

  const rarities: (WeaponRarity | 'All')[] =
    storeMode === 'bazaar'
      ? ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']
      : ['All', 'Ascendant', 'Divine', 'Celestial', 'Eternal'];

  const evaluateRelicStatus = (bp: ArsenalItemBlueprint) => {
    const owned = weapons.some(w => w.id === bp.id || w.name === bp.name);
    if (owned) return { owned: true, unlockable: false, evolutionOnly: false };
    if (bp.obtainMethod === 'evolution') return { owned: false, unlockable: false, evolutionOnly: true };

    const req = bp.unlockRequirement;
    const levelOk = !req?.minLevel || stats.level >= req.minLevel;
    const rankOk =
      !req?.minAetherRank ||
      aetherStageOrder.indexOf(stats.aetherRank) >= aetherStageOrder.indexOf(req.minAetherRank);
    const kingdomOk =
      !req?.requiredKingdomCleared ||
      kingdoms.some(k => k.id === req.requiredKingdomCleared && k.cleared);
    const bossesOk = !req?.minBossesDefeated || stats.totalBossesDefeated >= req.minBossesDefeated;
    const streakOk = !req?.minStreakDays || stats.currentStreak >= req.minStreakDays;
    const workoutsOk = !req?.minWorkouts || stats.totalWorkoutsCompleted >= req.minWorkouts;
    const repsOk = !req?.minVerifiedReps || stats.totalVerifiedReps >= req.minVerifiedReps;
    const forgeOk = !req?.forgeXpCost || stats.forgeXP >= req.forgeXpCost;

    return {
      owned: false,
      evolutionOnly: false,
      unlockable:
        levelOk &&
        rankOk &&
        kingdomOk &&
        bossesOk &&
        streakOk &&
        workoutsOk &&
        repsOk &&
        forgeOk,
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Header Banner */}
      <div
        data-tutorial-id="shop-bazaar"
        className="rounded-2xl bg-gradient-to-r from-[#1a1030] via-[#0e081c] to-[#1f1229] border-2 border-purple-900/70 p-6 shadow-2xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 rounded">
                Aetheria Grand Bazaar
              </span>
              <span className="text-xs text-purple-300 font-medium">
                Hero Level {stats.level} · {stats.aetherRank} Rank
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-amber-400" />
              ROYAL TREASURY & PINNACLE ARSENAL
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Acquire 16 weapon & gear archetypes from the Bazaar, or unlock Beyond-Mythical Ascendant, Divine, Celestial, and Eternal relics through verified progression.
            </p>
          </div>

          {/* Currencies & Armory Link */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#090514]/90 border-2 border-yellow-500/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-400" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-yellow-400 font-bold block">
                  Gold
                </span>
                <span className="font-mono text-lg font-black text-yellow-200 tabular-nums">
                  {stats.gold}
                </span>
              </div>
            </div>

            <div className="bg-[#090514]/90 border-2 border-amber-500/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Hammer className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                  Forge XP
                </span>
                <span className="font-mono text-lg font-black text-amber-200 tabular-nums">
                  {stats.forgeXP}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('armory')}
              className="px-4 py-3 rounded-xl bg-purple-900/70 hover:bg-purple-800 border border-purple-600/60 text-xs font-['Cinzel'] font-bold text-white flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Swords className="w-4 h-4 text-amber-300" />
              Open Armory
            </button>
          </div>
        </div>

        {/* Store Mode Switcher: Treasury Store vs Beyond-Mythical Pinnacle Relics */}
        <div className="mt-5 pt-4 border-t border-purple-950/80 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStoreMode('bazaar');
              setRarityFilter('All');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'bazaar'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 shadow-lg'
                : 'bg-[#090514] border border-purple-900 text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Purchasable Bazaar (Common – Mythic)
          </button>

          <button
            type="button"
            onClick={() => {
              setStoreMode('relics');
              setRarityFilter('All');
              if (categoryFilter === 'Consumables') setCategoryFilter('All');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'relics'
                ? 'bg-gradient-to-r from-teal-500 via-amber-400 to-violet-500 text-slate-950 shadow-lg'
                : 'bg-[#090514] border border-teal-500/60 text-teal-200 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            Beyond-Mythical Relics (Ascendant – Eternal)
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 16+ Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categoryTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(tab.id);
                  sound.playClick();
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  categoryFilter === tab.id
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-bold shadow'
                    : 'bg-[#140e24] text-slate-300 hover:text-white border border-purple-950'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search weapon, element, stats..."
              className="w-full bg-[#140e24] border border-purple-900/70 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Rarity Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-[11px] font-mono">
          <span className="text-slate-500 mr-1 uppercase text-[10px]">Tier:</span>
          {rarities.map(r => {
            const active = rarityFilter === r;
            const rStyle = r !== 'All' ? getRarityStyle(r) : null;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRarityFilter(r)}
                className={`px-2.5 py-1 rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? rStyle
                      ? `${rStyle.badge} border-transparent`
                      : 'bg-purple-800 text-white border-purple-500'
                    : 'bg-[#120c22] border-purple-950 text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchase / Relic Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium text-center animate-in fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-950/80 border-rose-700 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* BAZAAR ITEMS GRID */}
      {storeMode === 'bazaar' ? (
        filteredItems.length === 0 ? (
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-10 text-center space-y-2">
            <p className="font-['Cinzel'] font-bold text-slate-200 text-base">
              No items match your current filter
            </p>
            <p className="text-xs text-slate-400">
              Clear your search or switch category/rarity tabs to view more Aetherian wares.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredItems.map(item => {
              const rStyle = getRarityStyle(item.rarity);
              const meta = item.metadata || {};
              const targetWeaponId = meta.weaponId as string | undefined;
              const isPermanentGear = Boolean(targetWeaponId);
              const ownedWeapon = isPermanentGear
                ? weapons.find(w => w.id === targetWeaponId || w.name === item.name)
                : undefined;
              const alreadyOwned = Boolean(ownedWeapon);
              const levelMet = stats.level >= item.requiredLevel;
              const goldMet = stats.gold >= item.priceGold;
              const forgeMet = stats.forgeXP >= item.priceForgeXp;
              const canBuy = !alreadyOwned && levelMet && goldMet && forgeMet && buyingId !== item.id;
              const inspectObj = isPermanentGear ? buildInspectWeaponFromShop(item) : null;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-[#110a22]/95 border-2 ${rStyle.border} ${rStyle.cardGlow} ${rStyle.ringClass} p-5 flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-22 h-22 rounded-xl bg-[#07040f] border-2 ${rStyle.border} p-2 shrink-0 flex items-center justify-center relative`}
                      >
                        <EquipmentIllustration itemId={item.id} rarity={item.rarity} />
                        {alreadyOwned && (
                          <span className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1 shadow">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${rStyle.badge}`}>
                            {item.rarity}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              alreadyOwned
                                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                                : levelMet
                                ? 'bg-[#090514] border-purple-800/70 text-slate-300'
                                : 'bg-rose-950/70 border-rose-700 text-rose-300'
                            }`}
                          >
                            {alreadyOwned ? 'OWNED' : `Req Lv.${item.requiredLevel}`}
                          </span>
                        </div>

                        <h3 className="font-['Cinzel'] font-black text-base text-white leading-tight">
                          {item.name}
                        </h3>

                        <p className="text-[11px] font-mono text-purple-300">
                          {meta.category ? String(meta.category) : item.itemType.toUpperCase()}
                          {meta.element ? ` · ${String(meta.element)}` : ''}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">{item.description}</p>

                    <div className="bg-[#090514]/85 border border-purple-950 rounded-xl p-2.5 space-y-1 text-xs font-mono">
                      {isPermanentGear ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-purple-300 font-bold tabular-nums">
                              ATK +{meta.baseAttack ?? 0}{' '}
                              <span className="text-[10px] text-slate-400">(+{meta.attackPerLevel ?? 0}/lv)</span>
                            </span>
                            <span className="text-indigo-300 font-bold tabular-nums">
                              DEF +{meta.baseDefense ?? 0}{' '}
                              <span className="text-[10px] text-slate-400">(+{meta.defensePerLevel ?? 0}/lv)</span>
                            </span>
                          </div>
                          {inspectObj && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-purple-950/70">
                              <span>CRIT +{inspectObj.critChance}%</span>
                              <span>SPD {inspectObj.speed}</span>
                              <span>AB +{inspectObj.abilityPower}%</span>
                            </div>
                          )}
                        </>
                      ) : item.itemType === 'catalyst' ? (
                        <span className="text-amber-300 font-bold flex items-center gap-1.5">
                          <Hammer className="w-3.5 h-3.5" />+{meta.grantForgeXp || 80} Forge XP Instant
                        </span>
                      ) : (
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />+{meta.uses || 2} Battle Charges
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-purple-950/70">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Price:</span>
                      <div className="flex items-center gap-3">
                        {item.priceGold > 0 && (
                          <span
                            className={`font-bold flex items-center gap-1 tabular-nums ${
                              goldMet ? 'text-yellow-300' : 'text-rose-400'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            {item.priceGold} Gold
                          </span>
                        )}
                        {item.priceForgeXp > 0 && (
                          <span
                            className={`font-bold flex items-center gap-1 tabular-nums ${
                              forgeMet ? 'text-amber-300' : 'text-rose-400'
                            }`}
                          >
                            <Hammer className="w-3.5 h-3.5" />
                            {item.priceForgeXp} Forge XP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inspectObj && (
                        <button
                          type="button"
                          onClick={() => {
                            recordEquipmentInspected();
                            setInspectedItem({
                              weapon: inspectObj,
                              priceGold: item.priceGold,
                              priceForgeXp: item.priceForgeXp,
                              requiredLevel: item.requiredLevel,
                              shopItemId: item.id,
                            });
                          }}
                          className="px-3 py-2.5 rounded-xl bg-[#120b22] hover:bg-purple-950 border border-purple-800/70 text-purple-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      )}

                      {alreadyOwned && ownedWeapon ? (
                        <button
                          type="button"
                          onClick={() => equipGearSlot(ownedWeapon.id)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-['Cinzel'] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Equip Owned
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePurchase(item)}
                          disabled={!canBuy}
                          className={`flex-1 py-2.5 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                            canBuy
                              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 shadow-lg hover:scale-[1.01] active:scale-95'
                              : 'bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          {!levelMet ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              REQ LV.{item.requiredLevel}
                            </>
                          ) : buyingId === item.id ? (
                            <span>BUYING...</span>
                          ) : !goldMet || !forgeMet ? (
                            <span>NEED {!goldMet ? 'GOLD' : 'FORGE XP'}</span>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              PURCHASE
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* BEYOND-MYTHICAL PINNACLE RELICS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRelics.map(bp => {
            const rStyle = getRarityStyle(bp.rarity);
            const status = evaluateRelicStatus(bp);
            const previewWeapon = blueprintToWeapon(bp);

            return (
              <div
                key={bp.id}
                className={`rounded-2xl bg-[#110a22]/95 border-2 ${rStyle.border} ${rStyle.cardGlow} ${rStyle.ringClass} p-5 flex flex-col justify-between gap-4`}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-22 h-22 rounded-xl bg-[#07040f] border-2 ${rStyle.border} p-2 shrink-0 flex items-center justify-center relative`}
                    >
                      <EquipmentIllustration itemId={bp.id} rarity={bp.rarity} evolutionStage="Transcendent" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${rStyle.badge}`}>
                          {bp.rarity}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            status.owned
                              ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                              : status.unlockable
                              ? 'bg-teal-950 border-teal-400 text-teal-200'
                              : 'bg-slate-900 border-purple-900 text-amber-300'
                          }`}
                        >
                          {status.owned
                            ? 'OWNED'
                            : status.evolutionOnly
                            ? 'EVOLUTION ONLY'
                            : status.unlockable
                            ? 'UNLOCKABLE'
                            : 'LOCKED'}
                        </span>
                      </div>

                      <h3 className="font-['Cinzel'] font-black text-base text-white leading-tight">
                        {bp.name}
                      </h3>

                      <p className="text-[11px] font-mono text-purple-300">
                        {bp.category} · {bp.element}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{bp.description}</p>

                  <div className="bg-[#090514]/85 border border-purple-950 rounded-xl p-2.5 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-purple-300 font-bold">ATK +{bp.baseAttack}</span>
                      <span className="text-indigo-300 font-bold">DEF +{bp.baseDefense}</span>
                      <span className="text-amber-300 font-bold">CRIT +{bp.critChance}%</span>
                    </div>
                    <div className="text-[10px] text-teal-200 pt-1 border-t border-purple-950/70">
                      Unlock: {bp.unlockRequirement?.summary || 'Ascension Path'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-purple-950/70">
                  <button
                    type="button"
                    onClick={() => {
                      recordEquipmentInspected();
                      setInspectedItem({ weapon: previewWeapon, blueprint: bp });
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#120b22] hover:bg-purple-950 border border-purple-800/70 text-purple-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect
                  </button>

                  {status.owned ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('armory')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-['Cinzel'] font-bold tracking-wider whitespace-nowrap"
                    >
                      VIEW IN ARMORY
                    </button>
                  ) : status.evolutionOnly ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('armory')}
                      className="flex-1 py-2.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-500 text-purple-100 text-xs font-['Cinzel'] font-bold tracking-wider whitespace-nowrap"
                    >
                      EVOLVE IN ARMORY
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleClaimRelic(bp)}
                      disabled={!status.unlockable || claimingId === bp.id}
                      className={`flex-1 py-2.5 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider whitespace-nowrap ${
                        status.unlockable
                          ? 'bg-gradient-to-r from-teal-500 to-amber-400 text-slate-950 shadow-lg hover:scale-[1.01]'
                          : 'bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {claimingId === bp.id
                        ? 'UNSEALING...'
                        : status.unlockable
                        ? 'CLAIM RELIC'
                        : 'MILESTONE LOCKED'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WEAPON / RELIC INSPECTION MODAL */}
      {inspectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Weapon Inspection"
        >
          {(() => {
            const w = inspectedItem.weapon;
            const rStyle = getRarityStyle(w.rarity);
            return (
              <div
                className={`w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#170e2e] via-[#0b0618] to-[#0f0820] border-2 ${rStyle.border} ${rStyle.cardGlow} p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-20 h-20 rounded-2xl bg-[#07040f] border-2 ${rStyle.border} p-2 shrink-0`}>
                      <EquipmentIllustration itemId={w.id} rarity={w.rarity} />
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${rStyle.badge}`}>
                        Tier {rStyle.shortTag} · {w.rarity}
                      </span>
                      <h3 className="font-['Cinzel'] font-black text-lg text-white mt-1">{w.name}</h3>
                      <p className="text-xs font-mono text-purple-300">
                        {w.category} · {w.element} · {w.masteryPath} Path
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedItem(null)}
                    className="p-1.5 rounded-lg bg-[#120b22] text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">{w.description}</p>
                <p className="text-xs text-slate-400 italic">“{w.lore}”</p>

                <div className="grid grid-cols-3 gap-2 bg-[#080412] border border-purple-950 rounded-xl p-3 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ATK (+/lv)</span>
                    <span className="text-purple-300 font-bold">
                      +{w.baseAttack} (+{w.attackPerLevel})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">DEF (+/lv)</span>
                    <span className="text-indigo-300 font-bold">
                      +{w.baseDefense} (+{w.defensePerLevel})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">CRIT / DMG</span>
                    <span className="text-amber-300 font-bold">
                      {w.critChance}% / {w.critDamage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">SPEED</span>
                    <span className="text-cyan-300 font-bold">{w.speed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">AB. POWER</span>
                    <span className="text-fuchsia-300 font-bold">+{w.abilityPower}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">COMBAT LINK</span>
                    <span className="text-emerald-300 font-bold">Boss Combat</span>
                  </div>
                </div>

                {w.specialAbilityName && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/50 text-xs">
                    <span className="font-bold text-amber-300 block">{w.specialAbilityName}</span>
                    <span className="text-slate-200">{w.specialAbilitySummary}</span>
                  </div>
                )}

                {w.abilities && w.abilities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Mastery Skills ({w.masteryPath}):
                    </span>
                    {w.abilities.map(ab => (
                      <div
                        key={ab.id}
                        className="p-2 rounded-lg bg-[#0d0719] border border-purple-950 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-['Cinzel'] font-bold text-white flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                            {ab.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">{ab.combatEffect}</span>
                        </div>
                        <span className="text-[10px] font-mono text-purple-300 shrink-0">
                          M-Lv.{ab.unlockMasteryLevel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {w.evolutionPath && (
                  <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/50 text-xs">
                    <span className="text-[10px] font-mono uppercase text-teal-300 block">
                      Rarity Ascension Path
                    </span>
                    <span className="font-bold text-white">
                      Ascends to {w.evolutionPath.nextRarity}: {w.evolutionPath.nextName}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
