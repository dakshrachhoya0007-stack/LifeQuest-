import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Weapon, WeaponCategory, WeaponRarity, AetherRankStage } from '../../types/game';
import { sound } from '../../utils/audio';
import { AETHER_RANK_STAGES, getEvolutionVisual } from '../../data/initialData';
import { PROGRESSION_UNLOCK_BLUEPRINTS, findBlueprintByWeaponId } from '../../data/weaponArsenal';
import { blacksmithForgeImg, getHeroArtwork } from '../../assets/images';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import {
  getRarityStyle,
  isBeyondMythicRarity,
  RARITY_ORDER,
  WEAPON_CATEGORIES_ORDER,
} from '../../utils/rarityStyles';
import { RpgCharacterStage } from './RpgCharacterStage';
import { WeaponUpgradeAnimationModal } from './WeaponUpgradeAnimationModal';
import {
  Hammer,
  Shield,
  Sparkles,
  Swords,
  ChevronRight,
  Flame,
  Check,
  Zap,
  RotateCw,
  Eye,
  Info,
  Star,
  Award,
  Layers,
  ArrowUp,
  BookOpen,
  Activity,
  Crosshair,
  Lock,
  Unlock,
  Radio,
  Dumbbell,
  Compass,
  Coins,
  ShoppingBag,
} from 'lucide-react';

export const ArmoryView: React.FC = () => {
  const {
    weapons,
    stats,
    user,
    selectedHeroId,
    kingdoms,
    shopItems,
    equippedGear,
    equipGearSlot,
    getDefaultSlotForCategory,
    upgradeWeapon,
    purchaseShopItem,
    equippedWeapon,
    trainWeaponMastery,
    evolveWeapon,
    unlockProgressionWeapon,
    ascendWeaponRarity,
    toggleSound,
    setActiveTab,
    recordEquipmentInspected,
  } = useGame();

  // Weapon selection & filters
  const [selectedCategory, setSelectedCategory] = useState<WeaponCategory | 'All'>('All');
  const [selectedRarity, setSelectedRarity] = useState<WeaponRarity | 'All'>('All');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(equippedWeapon.id);

  // Inspector Sub-Panel: 'evolution' | 'relics' | 'mastery' | 'forge' | 'shop'
  const [forgeTab, setForgeTab] = useState<'evolution' | 'relics' | 'mastery' | 'forge' | 'shop'>('evolution');

  // Character Stance controls
  const [characterAngle, setCharacterAngle] = useState<'heroic' | 'combat'>('heroic');

  // Upgrade, Evolution & Ascension feedback states
  const [isForging, setIsForging] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [isAscending, setIsAscending] = useState(false);
  const [claimingRelicId, setClaimingRelicId] = useState<string | null>(null);
  const [forgeSuccessMsg, setForgeSuccessMsg] = useState<string | null>(null);
  const [forgeError, setForgeError] = useState<string | null>(null);

  const [masteryFeedback, setMasteryFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTrainingMastery, setIsTrainingMastery] = useState(false);
  const [evolutionError, setEvolutionError] = useState<string | null>(null);
  const [relicFeedback, setRelicFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [shopFeedback, setShopFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);

  // Upgrade / Evolution / Ascension Reveal Animation Modal State (ONLY opened on backend success)
  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    mode: 'upgrade' | 'evolution' | 'ascension';
    weapon: Weapon;
    previousWeaponId?: string;
    previousRarity?: WeaponRarity;
    previousLevel: number;
    previousAttack: number;
    previousDefense: number;
    previousStage?: AetherRankStage;
  } | null>(null);

  const handleBuyShopItem = async (itemId: string, itemName: string) => {
    setBuyingItemId(itemId);
    setShopFeedback(null);
    const res = await purchaseShopItem(itemId);
    setBuyingItemId(null);
    if (!res.success && res.error) {
      setShopFeedback({ type: 'error', text: res.error });
    } else {
      setShopFeedback({ type: 'success', text: `Acquired ${itemName}! Check your arsenal or active buffs.` });
    }
    setTimeout(() => setShopFeedback(null), 3500);
  };

  // Categories (16 categories) and rarities (10 tiers: Common -> Eternal)
  const categories: WeaponCategory[] = WEAPON_CATEGORIES_ORDER;
  const rarities: WeaponRarity[] = RARITY_ORDER;

  // Current active weapon in the forge inspector
  const activeWeapon = weapons.find(w => w.id === selectedWeaponId) || equippedWeapon;

  // Sync selected weapon if equipped weapon changes externally
  useEffect(() => {
    if (!weapons.some(w => w.id === selectedWeaponId)) {
      setSelectedWeaponId(equippedWeapon.id);
    }
  }, [equippedWeapon.id, weapons, selectedWeaponId]);

  // Filtering
  const filteredWeapons = weapons.filter(w => {
    const matchCat = selectedCategory === 'All' || w.category === selectedCategory;
    const matchRarity = selectedRarity === 'All' || w.rarity === selectedRarity;
    return matchCat && matchRarity;
  });

  // Calculate Character Power Score across all equipped gear slots
  const equippedGearIds = new Set(
    [
      equippedGear.mainWeaponId,
      equippedGear.offHandId,
      equippedGear.armourId,
      equippedGear.helmetId,
      equippedGear.accessoryId,
    ].filter((id): id is string => Boolean(id))
  );
  const equippedItemsList = weapons.filter(w => w.equipped || equippedGearIds.has(w.id));
  const totalAttack = equippedItemsList.reduce((sum, w) => sum + w.baseAttack, 0);
  const totalDefense = equippedItemsList.reduce((sum, w) => sum + w.baseDefense, 0);
  const characterPowerRating = totalAttack * 3.5 + totalDefense * 2.5 + stats.level * 50;

  // Current Aether Rank Info
  const currentRankIndex = AETHER_RANK_STAGES.findIndex(r => r.stage === stats.aetherRank);
  const currentRankInfo = AETHER_RANK_STAGES[currentRankIndex !== -1 ? currentRankIndex : 1];
  const nextRankInfo = AETHER_RANK_STAGES[Math.min(AETHER_RANK_STAGES.length - 1, (currentRankIndex !== -1 ? currentRankIndex : 1) + 1)];

  // Calculate Aether Rank Progress
  const rankMin = currentRankInfo.minPoints;
  const rankMax = currentRankInfo.nextPoints;
  const rankPercent = Math.min(100, Math.max(0, Math.round(((stats.aetherPoints - rankMin) / (rankMax - rankMin)) * 100)));

  // Next Evolution Stage for Active Weapon
  const evolutionStagesOrder: AetherRankStage[] = ['Dormant', 'Awakened', 'Ascended', 'Mythic', 'Transcendent'];
  const activeStageIdx = evolutionStagesOrder.indexOf(activeWeapon.evolutionStage || 'Dormant');
  const isMaxEvolution = activeStageIdx >= evolutionStagesOrder.length - 1;
  const nextStageName = !isMaxEvolution ? evolutionStagesOrder[activeStageIdx + 1] : null;
  const nextStageVisual = nextStageName ? getEvolutionVisual(nextStageName) : null;

  const requiredMasteryMap: Record<AetherRankStage, number> = {
    Dormant: 1,
    Awakened: 2,
    Ascended: 4,
    Mythic: 6,
    Transcendent: 8,
  };
  const requiredForgeCostMap: Record<AetherRankStage, number> = {
    Dormant: 0,
    Awakened: 50,
    Ascended: 100,
    Mythic: 200,
    Transcendent: 350,
  };

  const nextReqMastery = nextStageName ? requiredMasteryMap[nextStageName] : 0;
  const nextReqForge = nextStageName ? requiredForgeCostMap[nextStageName] : 0;
  const playerRankStageIdx = evolutionStagesOrder.indexOf(stats.aetherRank);
  const hasAetherRankForNext = nextStageName ? playerRankStageIdx >= (activeStageIdx + 1) : false;
  const hasMasteryForNext = nextStageName ? (activeWeapon.masteryLevel || 1) >= nextReqMastery : false;
  const hasForgeForNext = nextStageName ? stats.forgeXP >= nextReqForge : false;
  const canEvolve = !isMaxEvolution && hasAetherRankForNext && hasMasteryForNext && hasForgeForNext;

  // Handle Standard Blacksmith Upgrade (Server-first: animation fires ONLY after success)
  const handleUpgradeWeapon = async () => {
    setForgeError(null);
    setForgeSuccessMsg(null);

    if (activeWeapon.level >= activeWeapon.maxLevel) {
      setForgeError('This item has achieved its absolute masterwork level!');
      return;
    }

    if (stats.forgeXP < activeWeapon.upgradeForgeCost) {
      setForgeError(`Insufficient Forge XP. Need ${activeWeapon.upgradeForgeCost - stats.forgeXP} more Forge XP from habits and quests.`);
      return;
    }

    setIsForging(true);
    try {
      const res = await upgradeWeapon(activeWeapon.id);
      if (res.success && res.updatedWeapon) {
        setForgeSuccessMsg(`⚔ ${res.updatedWeapon.name} successfully tempered to Level ${res.updatedWeapon.level}!`);
        setUpgradeModalState({
          isOpen: true,
          mode: 'upgrade',
          weapon: res.updatedWeapon,
          previousLevel: res.previousLevel ?? activeWeapon.level,
          previousAttack: res.previousAttack ?? activeWeapon.baseAttack,
          previousDefense: res.previousDefense ?? activeWeapon.baseDefense,
        });
      } else {
        setForgeError(res.error || 'Weapon upgrade could not be completed right now.');
      }
    } finally {
      setIsForging(false);
    }
  };

  // Handle Weapon Mastery Practice Drill (Server-authoritative: costs 15 Gold, 10m cooldown)
  const handlePracticeMastery = async () => {
    sound.playClick();
    setMasteryFeedback(null);
    setIsTrainingMastery(true);
    try {
      const result = await trainWeaponMastery(activeWeapon.id, 40);
      if (!result.success) {
        setMasteryFeedback({
          type: 'error',
          text: result.error || 'Mastery drill could not be completed right now.',
        });
        return;
      }

      if (result.abilityUnlocked) {
        setMasteryFeedback({
          type: 'success',
          text: `✨ UNLOCKED ABILITY: [${result.abilityUnlocked}]! (-15 Gold)`,
        });
      } else {
        setMasteryFeedback({
          type: 'success',
          text: `+40 Mastery XP honed into ${activeWeapon.name}! (Mastery Lv.${result.newLevel}, -15 Gold)`,
        });
      }
    } finally {
      setIsTrainingMastery(false);
    }
  };

  // Handle Rarity Ascension (Mythic -> Ascendant -> Divine -> Celestial -> Eternal)
  const activeEvoPath = activeWeapon.evolutionPath;
  const activeEvoBlueprint = activeEvoPath ? findBlueprintByWeaponId(activeEvoPath.nextWeaponId) : undefined;
  const reqKingdomClearedOk = !activeEvoPath?.requiredKingdomCleared || kingdoms.some(
    k => k.id === activeEvoPath.requiredKingdomCleared && k.cleared
  );
  const reqAscLevelOk = activeEvoPath ? activeWeapon.level >= activeEvoPath.reqWeaponLevel : false;
  const reqAscMasteryOk = activeEvoPath ? (activeWeapon.masteryLevel || 1) >= activeEvoPath.reqMasteryLevel : false;
  const reqAscRankOk = activeEvoPath
    ? evolutionStagesOrder.indexOf(stats.aetherRank) >= evolutionStagesOrder.indexOf(activeEvoPath.reqAetherRank)
    : false;
  const reqAscPlayerLvOk = activeEvoPath ? stats.level >= (activeEvoPath.reqPlayerLevel || 1) : false;
  const reqAscBossesOk = activeEvoPath ? stats.totalBossesDefeated >= (activeEvoPath.minBossesDefeated || 0) : false;
  const reqAscForgeOk = activeEvoPath ? stats.forgeXP >= activeEvoPath.forgeXpCost : false;
  const reqAscGoldOk = activeEvoPath ? stats.gold >= activeEvoPath.goldCost : false;
  const canAscendRarity = Boolean(
    activeEvoPath &&
      reqAscLevelOk &&
      reqAscMasteryOk &&
      reqAscRankOk &&
      reqAscPlayerLvOk &&
      reqKingdomClearedOk &&
      reqAscBossesOk &&
      reqAscForgeOk &&
      reqAscGoldOk
  );

  const handleAscendRarity = async () => {
    setEvolutionError(null);
    if (!activeEvoPath || isAscending) return;

    const prevWeaponId = activeWeapon.id;
    const prevRarity = activeWeapon.rarity;
    const prevLevel = activeWeapon.level;
    const prevAttack = activeWeapon.baseAttack;
    const prevDefense = activeWeapon.baseDefense;

    setIsAscending(true);
    try {
      const res = await ascendWeaponRarity(activeWeapon.id);
      if (res.success && res.updatedWeapon) {
        setSelectedWeaponId(res.updatedWeapon.id);
        setUpgradeModalState({
          isOpen: true,
          mode: 'ascension',
          weapon: res.updatedWeapon,
          previousWeaponId: prevWeaponId,
          previousRarity: prevRarity,
          previousLevel: res.previousLevel ?? prevLevel,
          previousAttack: res.previousAttack ?? prevAttack,
          previousDefense: res.previousDefense ?? prevDefense,
        });
      } else {
        setEvolutionError(res.error || 'Rarity ascension could not be completed right now.');
      }
    } finally {
      setIsAscending(false);
    }
  };

  const handleClaimRelic = async (weaponId: string) => {
    if (claimingRelicId) return;
    setRelicFeedback(null);
    setClaimingRelicId(weaponId);
    try {
      const res = await unlockProgressionWeapon(weaponId);
      if (res.success && res.weapon) {
        setSelectedWeaponId(res.weapon.id);
        setRelicFeedback({
          type: 'success',
          text: `Unsealed ${res.weapon.rarity} relic: ${res.weapon.name}!`,
        });
        setUpgradeModalState({
          isOpen: true,
          mode: 'ascension',
          weapon: res.weapon,
          previousRarity: 'Mythic',
          previousLevel: 1,
          previousAttack: Math.round(res.weapon.baseAttack * 0.7),
          previousDefense: Math.round(res.weapon.baseDefense * 0.7),
        });
      } else {
        setRelicFeedback({
          type: 'error',
          text: res.error || 'Unlock criteria not yet satisfied.',
        });
      }
    } finally {
      setClaimingRelicId(null);
    }
  };

  // Handle Weapon Evolution Trigger (Server-first: animation opens ONLY after backend confirms)
  const handleInitiateEvolution = async () => {
    setEvolutionError(null);
    if (!nextStageName || isEvolving) return;

    if (!hasAetherRankForNext) {
      setEvolutionError(`Global Aether Rank too low. Reach ${nextStageName} rank by completing daily habits & workouts!`);
      return;
    }

    if (!hasMasteryForNext) {
      setEvolutionError(`Requires ${activeWeapon.name} Mastery Level ${nextReqMastery}. Practice mastery drills!`);
      return;
    }

    if (!hasForgeForNext) {
      setEvolutionError(`Requires ${nextReqForge} Forge XP as an alchemical catalyst.`);
      return;
    }

    const oldStage = activeWeapon.evolutionStage || 'Dormant';
    const prevLevel = activeWeapon.level;
    const prevAttack = activeWeapon.baseAttack;
    const prevDefense = activeWeapon.baseDefense;

    setIsEvolving(true);
    try {
      const evolveResult = await evolveWeapon(activeWeapon.id);
      if (evolveResult.success && evolveResult.updatedWeapon) {
        setUpgradeModalState({
          isOpen: true,
          mode: 'evolution',
          weapon: evolveResult.updatedWeapon,
          previousLevel: prevLevel,
          previousAttack: prevAttack,
          previousDefense: prevDefense,
          previousStage: oldStage,
        });
      } else {
        setEvolutionError(evolveResult.error || 'Weapon evolution could not be completed right now.');
      }
    } finally {
      setIsEvolving(false);
    }
  };

  // Helper for Rarity Styling (6 Tiers: Common -> Mythic)
  const getRarityConfig = (rarity: WeaponRarity) => {
    const style = getRarityStyle(rarity);
    return {
      border: `${style.border} ${style.ringClass}`,
      badge: style.badge,
      text: style.text,
      pipActive: style.pipActive,
      orb: style.orb,
    };
  };

  const activeRarityConfig = getRarityConfig(activeWeapon.rarity);
  const activeEvolutionVisual = activeWeapon.evolutionVisual || getEvolutionVisual(activeWeapon.evolutionStage || 'Dormant');
  const activeTargetSlot = getDefaultSlotForCategory(activeWeapon.category);
  const isActiveItemEquipped =
    activeTargetSlot === 'mainWeapon'
      ? equippedGear.mainWeaponId === activeWeapon.id || activeWeapon.equipped
      : activeTargetSlot === 'offHand'
      ? equippedGear.offHandId === activeWeapon.id
      : activeTargetSlot === 'armour'
      ? equippedGear.armourId === activeWeapon.id
      : activeTargetSlot === 'helmet'
      ? equippedGear.helmetId === activeWeapon.id
      : equippedGear.accessoryId === activeWeapon.id;

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* 1. MMORPG TOP HUD STRIP */}
      <div
        data-tutorial-id="armory-forge"
        className="relative rounded-2xl bg-gradient-to-r from-[#170e28] via-[#0d0718] to-[#1e1136] border-2 border-purple-900/70 p-4 sm:p-5 shadow-2xl overflow-hidden"
      >
        {/* Background Forge Heat Texture */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <img
            src={blacksmithForgeImg}
            alt="Forge Anvil"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Player Identity Crest */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl bg-gradient-to-b from-amber-500 via-purple-700 to-indigo-900 p-0.5 shadow-xl shadow-purple-950">
                <img
                  src={getHeroArtwork(selectedHeroId, user?.characterClass)}
                  alt={`${user?.characterClass || 'Warrior'} Champion`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top rounded-xl"
                />
              </div>
              <span className="absolute -bottom-2 -right-1 bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 border border-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded-md font-['Cinzel'] shadow">
                Lv.{stats.level}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-['Cinzel'] tracking-wide text-white drop-shadow">
                  {user?.username || 'Hero'}’S ARMORY
                </h1>
                <span className="text-[11px] font-semibold text-purple-300 uppercase px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800">
                  {user?.characterClass || 'Warrior'}
                </span>
              </div>
              <p className="text-xs text-purple-300/80 mt-0.5 flex items-center gap-2">
                <span>Power Rating: <strong className="font-mono text-amber-300 font-bold">{Math.round(characterPowerRating)}</strong></span>
                <span>·</span>
                <span>Equipped: <strong className="text-slate-200">{equippedWeapon.name}</strong></span>
              </p>
            </div>
          </div>

          {/* Currency Vault: Player XP, Forge XP */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Player XP */}
            <div className="bg-[#090514]/90 border border-purple-900/80 rounded-xl px-3.5 py-2 min-w-[130px] shadow-inner">
              <div className="flex justify-between items-center text-[10px] text-purple-300 uppercase tracking-widest font-bold mb-1">
                <span>Player XP</span>
                <span className="font-mono text-slate-300">{stats.playerXP}/{stats.playerXPNextLevel}</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (stats.playerXP / stats.playerXPNextLevel) * 100)}%` }}
                />
              </div>
            </div>

            {/* Forge XP Vault (Blacksmith currency) */}
            <div className="bg-gradient-to-r from-[#1b1008] to-[#120a1c] border-2 border-amber-500/70 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg shadow-amber-950/40">
              <div className="w-9 h-9 rounded-lg bg-amber-950/90 text-amber-400 border border-amber-600 flex items-center justify-center">
                <Hammer className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-amber-400 font-black block">
                  Forge XP Balance
                </span>
                <span className="font-mono text-xl font-black text-amber-200 tabular-nums">
                  {stats.forgeXP}
                </span>
              </div>
            </div>

            {/* Gold Vault (Shop Currency) */}
            <div className="bg-gradient-to-r from-[#1a1608] to-[#120a1c] border-2 border-yellow-500/60 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-yellow-950/90 text-yellow-400 border border-yellow-600 flex items-center justify-center">
                <Coins className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-black block">
                  Gold Balance
                </span>
                <span className="font-mono text-xl font-black text-yellow-200 tabular-nums">
                  {stats.gold}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GLOBAL AETHER RANK PROGRESSION BANNER */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#100924] via-[#090514] to-[#140b28] border-2 border-purple-800/70 p-4 sm:p-5 shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Current Rank Badge & Description */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-900 to-indigo-950 border-2 border-purple-500/80 flex items-center justify-center text-2xl font-bold text-amber-300 shadow-lg shadow-purple-950/80 shrink-0">
              {currentRankInfo.symbol}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 font-['Cinzel']">
                  Global Weapon Evolution Stage
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-900/60 border border-purple-600 text-purple-200 uppercase font-bold">
                  Shared Across All Weapons
                </span>
              </div>
              <h3 className="font-['Cinzel'] font-black text-lg text-white flex items-center gap-2">
                AETHER RANK: <span className="text-amber-400">{stats.aetherRank.toUpperCase()}</span>
                <span className="text-xs text-purple-300 font-mono font-normal">
                  ({stats.aetherPoints} / {currentRankInfo.nextPoints} Aether Points)
                </span>
              </h3>
              <p className="text-xs text-purple-200/80 max-w-xl">
                {currentRankInfo.description}
              </p>
            </div>
          </div>

          {/* Stage Perk Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                Current Global Perk
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {currentRankInfo.perk}
              </span>
            </div>
          </div>
        </div>

        {/* 5-Stage Visual Progression Meter */}
        <div className="mt-4 pt-3 border-t border-purple-950/80">
          <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center mb-2">
            {AETHER_RANK_STAGES.map((stageInfo, idx) => {
              const isCurrent = stageInfo.stage === stats.aetherRank;
              const isPassed = currentRankIndex >= idx;

              return (
                <div
                  key={stageInfo.stage}
                  className={`p-2 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-purple-950/90 border-amber-400/90 ring-2 ring-purple-500/50 shadow-lg'
                      : isPassed
                      ? 'bg-[#150d26]/80 border-purple-800/60'
                      : 'bg-[#080512]/60 border-purple-950 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-sm font-bold">{stageInfo.symbol}</span>
                    <span className="text-[11px] font-['Cinzel'] font-black truncate">
                      {stageInfo.stage}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {stageInfo.minPoints} pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar to next rank */}
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-purple-950 relative">
            <div
              className="bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-400 h-full transition-all duration-500"
              style={{ width: `${rankPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
            <span>{rankPercent}% towards {nextRankInfo.stage}</span>
            <span>{currentRankInfo.nextPoints - stats.aetherPoints} points needed</span>
          </div>
        </div>
      </div>

      {/* 3. THREE-COLUMN MMORPG INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: WEAPON ARSENAL & INVENTORY (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0d091a]/95 border-2 border-purple-950 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-purple-950/80 pb-3">
            <h3 className="font-['Cinzel'] font-black text-sm text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              WEAPON ARSENAL
            </h3>
            <span className="text-xs font-mono text-purple-300/80 font-semibold">
              {filteredWeapons.length} / {weapons.length}
            </span>
          </div>

          {/* Category Tabs: All + 16 Weapon & Gear Categories */}
          <div>
            <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#07040e] rounded-xl border border-purple-950 text-[11px] font-semibold">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === 'All' ? 'bg-purple-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {categories.map(cat => {
                const label = cat === 'Magic Staffs' ? 'Staves' : cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategory === cat ? 'bg-purple-800 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 10-Tier Rarity Filter Strip */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono">
            <button
              onClick={() => setSelectedRarity('All')}
              className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                selectedRarity === 'All' ? 'bg-purple-950 border-purple-600 text-white' : 'border-purple-950 text-slate-500 hover:text-slate-300'
              }`}
            >
              All Tiers
            </button>
            {rarities.map(r => {
              const rSt = getRarityStyle(r);
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRarity(r)}
                  className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                    selectedRarity === r
                      ? `${rSt.badge} border-transparent`
                      : isBeyondMythicRarity(r)
                      ? 'border-purple-800/80 text-amber-300 hover:text-white'
                      : 'border-purple-950 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Weapon Cards Inventory Rack */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredWeapons.map(w => {
              const isSelected = activeWeapon.id === w.id;
              const isEquipped = w.equipped;
              const rarityStyle = getRarityConfig(w.rarity);
              const weaponEvolutionVisual = w.evolutionVisual || getEvolutionVisual(w.evolutionStage || 'Dormant');

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    setSelectedWeaponId(w.id);
                    recordEquipmentInspected();
                    sound.playClick();
                  }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden group ${
                    isSelected
                      ? `${rarityStyle.border} bg-[#170e28] scale-[1.01]`
                      : 'border-purple-950/80 bg-[#100b1e] hover:border-purple-800/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unique Equipment Artwork Thumbnail */}
                    <div className={`relative w-14 h-14 rounded-lg bg-[#080511] border-2 ${rarityStyle.border} ${weaponEvolutionVisual.auraStyle} overflow-hidden shrink-0 flex items-center justify-center p-1`}>
                      <EquipmentIllustration
                        itemId={w.id}
                        rarity={w.rarity}
                        level={w.level}
                        evolutionStage={w.evolutionStage}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      />

                      {/* Upgrade Level Pip */}
                      <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-[9px] font-mono font-bold text-amber-300 px-1 rounded">
                        +{w.level}
                      </span>
                    </div>

                    {/* Weapon Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-['Cinzel'] font-bold text-xs text-white truncate">
                          {w.name}
                        </h4>
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded ${rarityStyle.badge}`}>
                          {w.rarity}
                        </span>
                      </div>

                      {/* Category & Evolution Stage Badge */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 capitalize">
                        <span>{w.category === 'Magic Staffs' ? 'Magic Staff' : w.category}</span>
                        <span>·</span>
                        <span className="font-semibold text-purple-300">
                          {w.evolutionStage || 'Dormant'}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-amber-400">
                          M-Lv.{w.masteryLevel || 1}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-purple-950/60 text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-300 font-bold">ATK {w.baseAttack}</span>
                          <span className="text-indigo-300 font-bold">DEF {w.baseDefense}</span>
                        </div>

                        {/* Sockets */}
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.min(5, w.maxLevel) }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < w.level ? rarityStyle.orb : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipped Ribbon */}
                  {isEquipped && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg font-['Cinzel'] tracking-wider shadow">
                      EQUIPPED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: RPG CHARACTER EQUIPMENT STAGE (4 Cols) */}
        <div className="lg:col-span-4">
          <RpgCharacterStage
            heroId={selectedHeroId}
            characterClass={user?.characterClass || 'Warrior'}
            characterName={user?.characterName || user?.username || 'Hero of Aetheria'}
            level={stats.level}
            weapons={weapons}
            equippedGear={equippedGear}
            activeWeaponId={activeWeapon.id}
            stance={characterAngle === 'combat' ? 'combat' : 'heroic'}
            onChangeStance={nextStance => setCharacterAngle(nextStance)}
            onSelectItem={id => {
              setSelectedWeaponId(id);
              recordEquipmentInspected();
              sound.playClick();
            }}
            onOpenStore={() => setActiveTab('store')}
          />
        </div>

        {/* COLUMN 3: HYBRID WEAPON EVOLUTION, MASTERY & FORGE (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0d091a]/95 border-2 border-purple-950 rounded-2xl p-5 shadow-2xl space-y-4">
          {/* Section Header with 3 Tab Switchers */}
          <div className="space-y-2 border-b border-purple-950/80 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-black text-sm text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                WEAPON WORKSHOP
              </h3>
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${activeRarityConfig.badge}`}>
                {activeWeapon.rarity}
              </span>
            </div>

            {/* Segmented Mode Control: Evolution / Relics / Mastery / Forge / Shop */}
            <div className="grid grid-cols-5 gap-1 bg-[#07040e] p-1 rounded-xl border border-purple-950 text-[10px] font-bold">
              <button
                onClick={() => {
                  setForgeTab('evolution');
                  sound.playClick();
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  forgeTab === 'evolution'
                    ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Evolve
              </button>

              <button
                onClick={() => {
                  setForgeTab('relics');
                  sound.playClick();
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  forgeTab === 'relics'
                    ? 'bg-gradient-to-r from-teal-700 to-indigo-700 text-white shadow'
                    : 'text-amber-300 hover:text-white'
                }`}
              >
                <Award className="w-3 h-3" />
                Relics
              </button>

              <button
                onClick={() => {
                  setForgeTab('mastery');
                  sound.playClick();
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  forgeTab === 'mastery'
                    ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Mastery
              </button>

              <button
                onClick={() => {
                  setForgeTab('forge');
                  sound.playClick();
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  forgeTab === 'forge'
                    ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hammer className="w-3 h-3" />
                Forge
              </button>

              <button
                onClick={() => {
                  setForgeTab('shop');
                  sound.playClick();
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  forgeTab === 'shop'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                Shop
              </button>
            </div>
          </div>

          {/* Active Weapon Showcase Banner */}
          <div className={`relative rounded-xl bg-gradient-to-b from-[#180e2d] to-[#080410] border-2 ${activeRarityConfig.border} p-3.5 overflow-hidden space-y-2.5 shadow-inner`}>
            <div className="flex items-center gap-3.5">
              <div className={`relative w-20 h-20 rounded-xl bg-[#06030c] border-2 ${activeRarityConfig.border} ${activeEvolutionVisual.auraStyle} overflow-hidden shrink-0 p-1.5 flex items-center justify-center`}>
                <EquipmentIllustration
                  itemId={activeWeapon.id}
                  rarity={activeWeapon.rarity}
                  level={activeWeapon.level}
                  evolutionStage={activeWeapon.evolutionStage}
                />

                <span className="absolute top-1 left-1 text-[11px] font-bold text-amber-300">
                  {activeEvolutionVisual.runeSymbol}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-amber-400 font-['Cinzel'] tracking-wider truncate">
                    {activeWeapon.evolutionStage || 'Dormant'} · {activeWeapon.element || 'Physical'}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 whitespace-nowrap">
                    {activeWeapon.combatIntegrationStatus === 'visual_only'
                      ? 'Visual Only'
                      : activeWeapon.combatIntegrationStatus === 'passive_stat'
                      ? 'Passive Bonus'
                      : 'Boss Combat'}
                  </span>
                </div>
                <h4 className="font-['Cinzel'] font-black text-base text-white truncate">
                  {activeWeapon.name}
                </h4>
                <p className="text-xs text-purple-300">
                  {activeWeapon.category} · {activeWeapon.masteryPath} Path
                </p>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] font-mono">
                  <span className="text-purple-300 font-bold">ATK +{activeWeapon.baseAttack}</span>
                  <span className="text-indigo-300 font-bold">DEF +{activeWeapon.baseDefense}</span>
                  <span className="text-amber-300 font-bold">Lv.{activeWeapon.level}/{activeWeapon.maxLevel}</span>
                </div>
              </div>
            </div>

            {/* Extended Secondary Combat Attributes */}
            <div className="grid grid-cols-4 gap-1.5 bg-[#07040f]/90 border border-purple-950 rounded-lg p-2 text-center text-[10px] font-mono">
              <div>
                <span className="text-slate-500 block">CRIT</span>
                <span className="text-amber-300 font-bold">+{activeWeapon.critChance ?? 5}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">CRIT DMG</span>
                <span className="text-rose-300 font-bold">{activeWeapon.critDamage ?? 180}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">SPEED</span>
                <span className="text-cyan-300 font-bold">{activeWeapon.speed ?? 65}</span>
              </div>
              <div>
                <span className="text-slate-500 block">AB. PWR</span>
                <span className="text-purple-200 font-bold">+{activeWeapon.abilityPower ?? 5}%</span>
              </div>
            </div>

            {activeWeapon.specialAbilityName && (
              <div className="text-[11px] bg-[#0b0618] border border-purple-800/60 rounded-lg px-2.5 py-1.5">
                <span className="text-amber-300 font-bold">{activeWeapon.specialAbilityName}: </span>
                <span className="text-slate-300">{activeWeapon.specialAbilitySummary}</span>
              </div>
            )}
          </div>

          {/* TAB CONTENT 1: HYBRID WEAPON EVOLUTION */}
          {forgeTab === 'evolution' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Evolution Stage Flow: Current vs Next Preview */}
              <div className="bg-[#120a22] p-3.5 rounded-xl border border-purple-900/60 space-y-3">
                <div className="flex items-center justify-between text-xs font-['Cinzel'] font-bold">
                  <span className="text-slate-300">EVOLUTION TRANSFORMATION</span>
                  <span className="text-purple-400 font-mono text-[11px]">
                    Stage {activeStageIdx + 1} of 5
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  {/* Current Stage */}
                  <div className="p-2.5 rounded-xl bg-[#090514] border border-purple-800">
                    <span className="text-[10px] uppercase text-slate-400 font-mono block">Current Form</span>
                    <span className="text-sm font-black text-white font-['Cinzel'] block mt-0.5">
                      {activeWeapon.evolutionStage || 'Dormant'}
                    </span>
                    <span className="text-[10px] text-purple-300 mt-1 block">
                      Base Power Active
                    </span>
                  </div>

                  {/* Next Stage Preview */}
                  <div className="p-2.5 rounded-xl bg-[#090514] border border-amber-500/60 relative overflow-hidden">
                    <span className="text-[10px] uppercase text-amber-400 font-mono block">Next Evolution</span>
                    <span className="text-sm font-black text-amber-300 font-['Cinzel'] block mt-0.5">
                      {nextStageName || 'SUPREME'}
                    </span>
                    <span className="text-[10px] text-emerald-400 mt-1 block">
                      {nextStageName ? '+25% Stats Boost' : 'Maximum Reached'}
                    </span>
                  </div>
                </div>

                {/* Evolution Requirements Checklist */}
                {!isMaxEvolution && nextStageName && (
                  <div className="space-y-1.5 pt-2 border-t border-purple-950/80 text-[11px]">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block mb-1">
                      Evolution Requirements:
                    </span>

                    {/* Req 1: Global Aether Rank */}
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#07040e] border border-purple-950">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        {hasAetherRankForNext ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        Global Aether Rank: {nextStageName}
                      </span>
                      <span className={`font-mono font-bold ${hasAetherRankForNext ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {hasAetherRankForNext ? 'MET' : `Need ${nextStageName}`}
                      </span>
                    </div>

                    {/* Req 2: Individual Mastery */}
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#07040e] border border-purple-950">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        {hasMasteryForNext ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        Weapon Mastery Level {nextReqMastery}
                      </span>
                      <span className={`font-mono font-bold ${hasMasteryForNext ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Lv.{activeWeapon.masteryLevel || 1} / {nextReqMastery}
                      </span>
                    </div>

                    {/* Req 3: Forge Catalyst */}
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#07040e] border border-purple-950">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        {hasForgeForNext ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        Forge XP Catalyst ({nextReqForge} XP)
                      </span>
                      <span className={`font-mono font-bold ${hasForgeForNext ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.forgeXP} / {nextReqForge}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {evolutionError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 text-center animate-in fade-in">
                  {evolutionError}
                </div>
              )}

              {/* Evolution Button */}
              <button
                onClick={handleInitiateEvolution}
                disabled={isMaxEvolution || !canEvolve || isEvolving}
                className={`w-full py-3.5 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl whitespace-nowrap ${
                  isMaxEvolution
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : canEvolve
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-500 hover:scale-[1.02] text-white shadow-purple-950/80 cursor-pointer active:scale-95'
                    : 'bg-[#150d26] text-slate-500 border border-purple-950 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {isEvolving
                  ? 'CHANNELING AETHER ESSENCE...'
                  : isMaxEvolution
                  ? 'TRANSCENDENT FORM ACHIEVED'
                  : canEvolve
                  ? `EVOLVE TO ${nextStageName?.toUpperCase()} STAGE`
                  : `EVOLUTION LOCKED (CHECK CRITERIA)`}
              </button>

              {/* Beyond-Mythical Rarity Ascension Section */}
              {activeEvoPath && (
                <div className="bg-[#120a22] p-3.5 rounded-xl border-2 border-teal-500/60 space-y-3 mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-['Cinzel'] font-black text-teal-300 uppercase">
                      Beyond-Mythical Rarity Ascension
                    </span>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${getRarityStyle(activeEvoPath.nextRarity).badge}`}>
                      {activeEvoPath.nextRarity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center items-center bg-[#090514] border border-purple-950 rounded-xl p-2.5">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block">Current</span>
                      <span className="text-xs font-bold text-white block truncate">{activeWeapon.name}</span>
                      <span className="text-[10px] font-mono text-purple-300">ATK +{activeWeapon.baseAttack}</span>
                    </div>
                    <div className="border-l border-purple-950 pl-2">
                      <span className="text-[9px] uppercase text-amber-400 block">Ascended Form</span>
                      <span className="text-xs font-bold text-amber-300 block truncate">{activeEvoPath.nextName}</span>
                      {activeEvoBlueprint && (
                        <span className="text-[10px] font-mono text-emerald-300">
                          Base ATK +{activeEvoBlueprint.baseAttack} · CRIT {activeEvoBlueprint.critChance}%
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">{activeEvoPath.visualTransformation}</p>

                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className={reqAscLevelOk ? 'text-emerald-400' : 'text-rose-400'}>
                        {reqAscLevelOk ? '✓' : '✕'} Tempered Weapon Lv.{activeEvoPath.reqWeaponLevel}
                      </span>
                      <span className="text-slate-400">{activeWeapon.level}/{activeEvoPath.reqWeaponLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={reqAscMasteryOk ? 'text-emerald-400' : 'text-rose-400'}>
                        {reqAscMasteryOk ? '✓' : '✕'} Weapon Mastery Lv.{activeEvoPath.reqMasteryLevel}
                      </span>
                      <span className="text-slate-400">{activeWeapon.masteryLevel}/{activeEvoPath.reqMasteryLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={reqAscRankOk ? 'text-emerald-400' : 'text-rose-400'}>
                        {reqAscRankOk ? '✓' : '✕'} Aether Rank: {activeEvoPath.reqAetherRank}
                      </span>
                      <span className="text-slate-400">{stats.aetherRank}</span>
                    </div>
                    {activeEvoPath.requiredKingdomCleared && (
                      <div className="flex justify-between">
                        <span className={reqKingdomClearedOk ? 'text-emerald-400' : 'text-rose-400'}>
                          {reqKingdomClearedOk ? '✓' : '✕'} Clear Boss ({activeEvoPath.requiredKingdomCleared.replace('kingdom-', '')})
                        </span>
                        <span className="text-slate-400">{reqKingdomClearedOk ? 'CLEARED' : 'LOCKED'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className={reqAscForgeOk && reqAscGoldOk ? 'text-emerald-400' : 'text-rose-400'}>
                        {reqAscForgeOk && reqAscGoldOk ? '✓' : '✕'} Cost: {activeEvoPath.forgeXpCost} Forge XP · {activeEvoPath.goldCost} Gold
                      </span>
                      <span className="text-slate-400">
                        {stats.forgeXP}F / {stats.gold}G
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAscendRarity}
                    disabled={!canAscendRarity || isAscending}
                    className={`w-full py-3 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                      canAscendRarity
                        ? 'bg-gradient-to-r from-teal-500 via-amber-400 to-yellow-400 text-slate-950 shadow-lg hover:scale-[1.01] active:scale-95'
                        : 'bg-[#080411] text-slate-500 border border-purple-950 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAscending
                      ? 'ASCENDING RARITY...'
                      : `ASCEND TO ${activeEvoPath.nextRarity.toUpperCase()}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 1B: PINNACLE RELICS & BEYOND-MYTHICAL CODEX */}
          {forgeTab === 'relics' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-[#120a22] p-3 rounded-xl border border-teal-500/40 text-xs">
                <span className="font-['Cinzel'] font-black text-amber-300 block">
                  Pinnacle Progression Relics (Ascendant → Eternal)
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Supreme relics cannot be bought directly in the Bazaar. Meet the progression milestones below to unseal them.
                </p>
              </div>

              {relicFeedback && (
                <div
                  className={`p-2.5 rounded-xl border text-xs text-center ${
                    relicFeedback.type === 'error'
                      ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                      : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                  }`}
                >
                  {relicFeedback.text}
                </div>
              )}

              <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
                {PROGRESSION_UNLOCK_BLUEPRINTS.map(bp => {
                  const rStyle = getRarityStyle(bp.rarity);
                  const owned = weapons.some(w => w.id === bp.id);
                  const req = bp.unlockRequirement;
                  const evolutionOnly = bp.obtainMethod === 'evolution';
                  const levelOk = !req?.minLevel || stats.level >= req.minLevel;
                  const rankOk = !req?.minAetherRank || evolutionStagesOrder.indexOf(stats.aetherRank) >= evolutionStagesOrder.indexOf(req.minAetherRank);
                  const kingdomOk = !req?.requiredKingdomCleared || kingdoms.some(k => k.id === req.requiredKingdomCleared && k.cleared);
                  const bossesOk = !req?.minBossesDefeated || stats.totalBossesDefeated >= req.minBossesDefeated;
                  const streakOk = !req?.minStreakDays || stats.currentStreak >= req.minStreakDays;
                  const workoutsOk = !req?.minWorkouts || stats.totalWorkoutsCompleted >= req.minWorkouts;
                  const repsOk = !req?.minVerifiedReps || stats.totalVerifiedReps >= req.minVerifiedReps;
                  const forgeOk = !req?.forgeXpCost || stats.forgeXP >= req.forgeXpCost;
                  const readyToClaim =
                    !owned &&
                    !evolutionOnly &&
                    levelOk &&
                    rankOk &&
                    kingdomOk &&
                    bossesOk &&
                    streakOk &&
                    workoutsOk &&
                    repsOk &&
                    forgeOk;

                  return (
                    <div key={bp.id} className={`p-3 rounded-xl bg-[#100820] border ${rStyle.border} space-y-2`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-12 h-12 rounded-lg bg-[#06030d] border ${rStyle.border} p-1 shrink-0`}>
                          <EquipmentIllustration itemId={bp.id} rarity={bp.rarity} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${rStyle.badge}`}>
                              {bp.rarity}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase">
                              {bp.obtainMethod.replace('_', ' ')}
                            </span>
                          </div>
                          <h5 className="font-['Cinzel'] font-bold text-xs text-white truncate mt-0.5">{bp.name}</h5>
                          <p className="text-[10px] font-mono text-purple-300">
                            {bp.category} · ATK +{bp.baseAttack} · CRIT +{bp.critChance}% · SPD {bp.speed}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">
                        {req?.summary || bp.description}
                      </p>

                      {owned ? (
                        <button
                          type="button"
                          onClick={() => setSelectedWeaponId(bp.id)}
                          className="w-full py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600 text-emerald-300 text-[11px] font-['Cinzel'] font-bold"
                        >
                          OWNED — INSPECT IN ARMORY
                        </button>
                      ) : evolutionOnly ? (
                        <div className="py-1.5 px-2 rounded-lg bg-[#080412] border border-purple-900 text-center text-[10px] font-mono text-amber-300">
                          UNSEALED VIA RARITY ASCENSION IN EVOLVE TAB
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClaimRelic(bp.id)}
                          disabled={!readyToClaim || claimingRelicId === bp.id}
                          className={`w-full py-2 rounded-lg text-[11px] font-['Cinzel'] font-bold tracking-wider transition-all whitespace-nowrap ${
                            readyToClaim
                              ? 'bg-gradient-to-r from-teal-500 to-amber-400 text-slate-950 shadow hover:scale-[1.01]'
                              : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          {claimingRelicId === bp.id
                            ? 'UNSEALING RELIC...'
                            : readyToClaim
                            ? `CLAIM RELIC${req?.forgeXpCost ? ` (${req.forgeXpCost} FORGE XP)` : ''}`
                            : 'PROGRESSION LOCKED'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: INDIVIDUAL WEAPON MASTERY & ABILITIES */}
          {forgeTab === 'mastery' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Mastery Level & Progress Meter */}
              <div className="bg-[#120a22] p-3.5 rounded-xl border border-purple-900/60 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold font-['Cinzel']">
                    {activeWeapon.masteryPath} Path Mastery
                  </span>
                  <span className="text-amber-400 font-bold">
                    Mastery Level {activeWeapon.masteryLevel || 1} / 10
                  </span>
                </div>

                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-purple-950">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-400 h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        ((activeWeapon.masteryXP || 0) / (activeWeapon.masteryXPNextLevel || 100)) * 100
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{activeWeapon.masteryXP || 0} / {activeWeapon.masteryXPNextLevel || 100} Mastery XP</span>
                  <span>Max Level: 10</span>
                </div>

                {/* Practice Mastery Drill Action */}
                <button
                  onClick={handlePracticeMastery}
                  disabled={isTrainingMastery || stats.gold < 15}
                  className="w-full mt-2 py-2.5 rounded-xl bg-[#1b1035] hover:bg-[#251547] disabled:opacity-50 disabled:cursor-not-allowed border border-purple-700/60 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                  {isTrainingMastery
                    ? 'Honing Weapon Mastery...'
                    : 'Practice Mastery Drill (15 Gold · +40 XP)'}
                </button>
              </div>

              {masteryFeedback && (
                <div
                  className={`p-2.5 rounded-xl border text-xs text-center animate-in fade-in ${
                    masteryFeedback.type === 'error'
                      ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                      : 'bg-purple-950/80 border-purple-600 text-purple-200'
                  }`}
                >
                  {masteryFeedback.text}
                </div>
              )}

              {/* 3 Path Abilities Showcase */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                  {activeWeapon.masteryPath} Path Abilities (3 Unlocks):
                </span>

                {activeWeapon.abilities && activeWeapon.abilities.map((ability, idx) => {
                  const isUnlocked = ability.unlocked;
                  return (
                    <div
                      key={ability.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isUnlocked
                          ? 'bg-[#150d26] border-purple-600/80 shadow-md ring-1 ring-purple-500/30'
                          : 'bg-[#080512]/80 border-purple-950 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <Zap className={`w-3.5 h-3.5 ${isUnlocked ? 'text-amber-400' : 'text-slate-600'}`} />
                          <h5 className={`font-['Cinzel'] font-bold text-xs ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                            {ability.name}
                          </h5>
                        </div>

                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isUnlocked ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isUnlocked ? 'UNLOCKED' : `Lv.${ability.unlockMasteryLevel}`}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">
                        {ability.description}
                      </p>

                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-purple-950/60 text-[10px]">
                        <span className="text-emerald-400 font-mono font-semibold">
                          Combat: {ability.combatEffect}
                        </span>
                        {!isUnlocked && (
                          <span className="text-slate-500 italic">
                            🔒 {ability.unlockRequirement}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: BLACKSMITH UPGRADE FORGE */}
          {forgeTab === 'forge' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Sockets / Runic Gems */}
              <div className="bg-[#120a22] p-3.5 rounded-xl border border-purple-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-mono">Tempered Level</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <span className="text-white">Lv.{activeWeapon.level}</span>
                    {activeWeapon.level < activeWeapon.maxLevel && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-amber-400">Lv.{activeWeapon.level + 1}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Sockets display */}
                <div className="flex items-center gap-1.5 bg-[#090514] px-3 py-1.5 rounded-xl border border-purple-900/80">
                  <span className="text-[10px] text-slate-400 font-mono mr-1">Runic Sockets:</span>
                  {Array.from({ length: Math.min(5, activeWeapon.maxLevel) }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] transition-all duration-300 ${
                        idx < activeWeapon.level
                          ? `${activeRarityConfig.pipActive} font-bold scale-110`
                          : 'bg-slate-900 border-slate-700 text-slate-600'
                      }`}
                    >
                      ◆
                    </div>
                  ))}
                </div>

                {/* Attack / Defense Preview */}
                <div className="pt-2 border-t border-purple-950/80 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Attack Power</span>
                    <span className="text-purple-300 font-bold">
                      +{activeWeapon.baseAttack}{' '}
                      {activeWeapon.level < activeWeapon.maxLevel && (
                        <span className="text-emerald-400 font-normal">
                          (+{activeWeapon.attackPerLevel})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Defense Ward</span>
                    <span className="text-indigo-300 font-bold">
                      +{activeWeapon.baseDefense}{' '}
                      {activeWeapon.level < activeWeapon.maxLevel && (
                        <span className="text-emerald-400 font-normal">
                          (+{activeWeapon.defensePerLevel})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {forgeSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-xs text-emerald-200 text-center animate-in fade-in">
                  {forgeSuccessMsg}
                </div>
              )}

              {forgeError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 text-center animate-in fade-in">
                  {forgeError}
                </div>
              )}

              {/* Blacksmith Upgrade Button */}
              <button
                onClick={handleUpgradeWeapon}
                disabled={isForging || activeWeapon.level >= activeWeapon.maxLevel}
                className={`w-full py-3.5 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl ${
                  activeWeapon.level >= activeWeapon.maxLevel
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-amber-950/80 hover:scale-[1.02] active:scale-95'
                } ${isForging ? 'animate-pulse' : ''}`}
              >
                <Hammer className="w-4 h-4" />
                {activeWeapon.level >= activeWeapon.maxLevel
                  ? 'MAXIMUM LEVEL ATTAINED'
                  : `FORGE UPGRADE (${activeWeapon.upgradeForgeCost} FORGE XP)`}
              </button>
            </div>
          )}

          {/* TAB CONTENT 4: MERCHANT'S TREASURY SHOP */}
          {forgeTab === 'shop' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between gap-2 bg-[#120a22] px-3 py-2 rounded-xl border border-yellow-700/40 text-xs">
                <div>
                  <span className="text-slate-300 font-semibold block">Available Gold:</span>
                  <span className="font-mono font-black text-yellow-300 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    {stats.gold} Gold
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('store')}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-['Cinzel'] font-bold text-[11px] flex items-center gap-1.5 shadow"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Full Store
                </button>
              </div>

              {shopFeedback && (
                <div
                  className={`p-2.5 rounded-xl border text-xs text-center animate-in fade-in ${
                    shopFeedback.type === 'error'
                      ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                      : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                  }`}
                >
                  {shopFeedback.text}
                </div>
              )}

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {shopItems.map(item => {
                  const targetWeaponId = item.metadata?.weaponId || item.id;
                  const alreadyOwned =
                    item.itemType === 'weapon' &&
                    weapons.some(w => w.id === targetWeaponId || w.name === item.name);
                  const levelOk = stats.level >= item.requiredLevel;
                  const canAfford = stats.gold >= item.priceGold && stats.forgeXP >= item.priceForgeXp;
                  const disabled = alreadyOwned || !levelOk || !canAfford || buyingItemId === item.id;
                  const rStyle = getRarityStyle(item.rarity);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl bg-[#120a22] border ${rStyle.border} space-y-2`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-11 h-11 rounded-lg bg-[#07040e] border ${rStyle.border} p-1 shrink-0`}>
                            <EquipmentIllustration itemId={item.id} rarity={item.rarity} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-['Cinzel'] font-bold text-xs text-white truncate">{item.name}</h5>
                            <span className={`inline-block text-[9px] uppercase font-mono px-1.5 py-0.2 rounded ${rStyle.badge} mt-0.5`}>
                              {item.rarity}
                            </span>
                            <span className="text-[10px] uppercase font-mono text-purple-300 ml-1.5">
                              {item.metadata?.category ? String(item.metadata.category) : item.itemType} · Lv.{item.requiredLevel}+
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] shrink-0">
                          {item.priceGold > 0 && (
                            <span className="text-yellow-300 font-bold block">{item.priceGold} Gold</span>
                          )}
                          {item.priceForgeXp > 0 && (
                            <span className="text-amber-400 font-bold block">{item.priceForgeXp} Forge XP</span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">{item.description}</p>

                      <button
                        onClick={() => handleBuyShopItem(item.id, item.name)}
                        disabled={disabled}
                        className={`w-full py-2 rounded-lg text-[11px] font-['Cinzel'] font-bold tracking-wider transition-colors ${
                          alreadyOwned
                            ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300 cursor-default'
                            : disabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950'
                        }`}
                      >
                        {alreadyOwned
                          ? 'ALREADY OWNED'
                          : !levelOk
                          ? `REQUIRES LV.${item.requiredLevel}`
                          : buyingItemId === item.id
                          ? 'PURCHASING...'
                          : 'PURCHASE ITEM'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EQUIP GEAR BUTTON (Slot-Aware) */}
          <div className="pt-2 border-t border-purple-950/80">
            <button
              onClick={() => {
                equipGearSlot(activeWeapon.id, activeTargetSlot);
                sound.playClick();
              }}
              disabled={isActiveItemEquipped}
              className={`w-full py-3 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider border-2 transition-all flex items-center justify-center gap-2 ${
                isActiveItemEquipped
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 cursor-default'
                  : 'bg-[#150d26] border-purple-800 text-purple-200 hover:bg-purple-900/60 hover:text-white hover:border-purple-500 shadow-md cursor-pointer'
              }`}
            >
              {isActiveItemEquipped ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  {activeTargetSlot === 'offHand'
                    ? 'EQUIPPED IN OFF-HAND GUARD'
                    : activeTargetSlot === 'armour'
                    ? 'EQUIPPED AS CHEST ARMOUR'
                    : activeTargetSlot === 'helmet'
                    ? 'EQUIPPED AS HEADGEAR'
                    : activeTargetSlot === 'accessory'
                    ? 'EQUIPPED AS RELIC'
                    : 'CURRENTLY EQUIPPED IN MAIN HAND'}
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 text-purple-400" />
                  {activeTargetSlot === 'offHand'
                    ? 'EQUIP OFF-HAND GUARD'
                    : activeTargetSlot === 'armour'
                    ? 'EQUIP CHEST ARMOUR'
                    : activeTargetSlot === 'helmet'
                    ? 'EQUIP HEADGEAR'
                    : activeTargetSlot === 'accessory'
                    ? 'EQUIP RELIC'
                    : 'EQUIP TO MAIN HAND'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. UPGRADE, EVOLUTION & RARITY ASCENSION REVEAL MODAL (Gated by Backend Success) */}
      {upgradeModalState && (
        <WeaponUpgradeAnimationModal
          isOpen={upgradeModalState.isOpen}
          mode={upgradeModalState.mode}
          weapon={upgradeModalState.weapon}
          previousWeaponId={upgradeModalState.previousWeaponId}
          previousRarity={upgradeModalState.previousRarity}
          previousLevel={upgradeModalState.previousLevel}
          previousAttack={upgradeModalState.previousAttack}
          previousDefense={upgradeModalState.previousDefense}
          previousStage={upgradeModalState.previousStage}
          soundEnabled={stats.soundEnabled}
          onToggleSound={toggleSound}
          onClose={() => setUpgradeModalState(null)}
        />
      )}
    </div>
  );
};
