import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroArtwork, resolveAssetUrl } from '../../assets/images';
import { getHeroById } from '../../data/heroesData';
import { BODYWEIGHT_TECHNIQUES } from '../../data/initialData';
import {
  Activity,
  Dumbbell,
  Footprints,
  Hand,
  Sparkles,
  Flame,
  Trophy,
  Zap,
  AlertTriangle,
  Wind,
  Droplets,
  CloudLightning,
  Sun,
  Moon,
  BookOpen,
  Check,
  HelpCircle,
  Skull,
  Target,
} from 'lucide-react';
import { BodyweightTechnique, ElementType } from '../../types/game';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { WeeklyBossRaidPanel } from './WeeklyBossRaidPanel';

export const BossBattleView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    rpgAttributes,
    kingdoms,
    buffs,
    activateBuff,
    startBossBattle,
    attackBoss,
    discoverBossWeakness,
    resetBossBattle,
    setActiveTab,
  } = useGame();

  const [bossMode, setBossMode] = useState<'weekly' | 'kingdom'>('weekly');
  const [selectedKingdomId, setSelectedKingdomId] = useState<string>(stats.currentKingdomId);
  const [battleState, setBattleState] = useState<'PREP' | 'FIGHTING' | 'VICTORY' | 'DEFEAT'>('PREP');
  const [combatLogs, setCombatLogs] = useState<string[]>([]);

  // Player Combat Vitals & Stamina
  const playerMaxHp = 220 + stats.level * 15;
  const [playerCurrentHp, setPlayerCurrentHp] = useState<number>(playerMaxHp);
  const playerMaxStamina = 100;
  const [playerStamina, setPlayerStamina] = useState<number>(100);

  // Turn & Telegraph Warning System
  const [turnCount, setTurnCount] = useState<number>(1);
  const [isTelegraphWarningActive, setIsTelegraphWarningActive] = useState<boolean>(false);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);

  // Combat Animations & Dynamic Floating Feedback
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastDamageDealt, setLastDamageDealt] = useState<number | null>(null);
  const [lastBossDamage, setLastBossDamage] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<'normal' | 'crit' | 'weakness' | 'defended' | 'dodged' | null>(null);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState<string | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);
  const [isStartingBattle, setIsStartingBattle] = useState<boolean>(false);

  // Bestiary & Weakness Lore Clue Modal
  const [showLoreClueModal, setShowLoreClueModal] = useState<boolean>(false);

  // Battle Analytics for Summary
  const [battleStats, setBattleStats] = useState({
    turns: 0,
    weaknessHits: 0,
    attacksAvoided: 0,
    damageDealt: 0,
    damageTaken: 0,
  });

  const activeKingdom = kingdoms.find(k => k.id === selectedKingdomId) || kingdoms[0];
  const boss = activeKingdom.boss;
  const heroDef = getHeroById(selectedHeroId);

  const bodyweightTechniques = BODYWEIGHT_TECHNIQUES.map(tech => ({
    ...tech,
    unlocked: stats.level >= tech.unlockLevel,
  }));

  const rawAtk = 18 + Math.round(rpgAttributes.strength * 1.4 + rpgAttributes.agility * 0.6);
  const rawDef = 12 + Math.round(rpgAttributes.resilience * 1.2 + rpgAttributes.discipline * 0.8);
  const critPercent = Math.min(60, 10 + Math.round(rpgAttributes.agility * 0.25));

  // Calculate Boss Current Phase
  const bossHpRatio = boss.health / boss.maxHealth;
  const currentPhaseNumber = bossHpRatio <= 0.33 ? 3 : bossHpRatio <= 0.66 ? 2 : 1;
  const currentPhaseInfo = boss.phases?.find(p => p.phaseNumber === currentPhaseNumber) || {
    phaseNumber: currentPhaseNumber,
    name: currentPhaseNumber === 3 ? 'Desperation Frenzy' : currentPhaseNumber === 2 ? 'Enraged Awakening' : 'Initial Stance',
    description: 'Engaging challenger in battle.',
    attackMultiplier: currentPhaseNumber === 3 ? 1.5 : currentPhaseNumber === 2 ? 1.25 : 1.0,
    auraColor: currentPhaseNumber === 3 ? 'text-[#F05B70]' : currentPhaseNumber === 2 ? 'text-[#FFAA45]' : 'text-[#00D9FF]',
  };

  // Helper for elemental icon
  const getElementBadge = (element: ElementType) => {
    switch (element) {
      case 'Fire':
        return { label: 'Fire', color: 'bg-[#36111F] border-[#F05B70] text-[#F05B70]', icon: <Flame className="w-3.5 h-3.5 text-[#F05B70]" /> };
      case 'Water':
        return { label: 'Water', color: 'bg-[#0A1930] border-[#38D9F5] text-[#38D9F5]', icon: <Droplets className="w-3.5 h-3.5 text-[#38D9F5]" /> };
      case 'Ice':
        return { label: 'Ice', color: 'bg-[#0A1930] border-[#65A9FF] text-[#65A9FF]', icon: <Wind className="w-3.5 h-3.5 text-[#65A9FF]" /> };
      case 'Lightning':
        return { label: 'Lightning', color: 'bg-[#102440] border-[#FFAA45] text-[#FFD978]', icon: <Zap className="w-3.5 h-3.5 text-[#FFAA45]" /> };
      case 'Light':
        return { label: 'Light', color: 'bg-[#102440] border-[#FFD978] text-[#FFD978]', icon: <Sun className="w-3.5 h-3.5 text-[#FFD978]" /> };
      case 'Void':
        return { label: 'Void', color: 'bg-[#061225] border-[#00D9FF]/60 text-[#00D9FF]', icon: <Moon className="w-3.5 h-3.5 text-[#00D9FF]" /> };
      case 'Nature':
        return { label: 'Nature', color: 'bg-[#0A1930] border-[#35D69A] text-[#35D69A]', icon: <Sparkles className="w-3.5 h-3.5 text-[#35D69A]" /> };
      case 'Earth':
        return { label: 'Earth', color: 'bg-[#102440] border-[#FFAA45] text-[#FFAA45]', icon: <Dumbbell className="w-3.5 h-3.5 text-[#FFAA45]" /> };
      case 'Wind':
        return { label: 'Wind', color: 'bg-[#0A1930] border-[#35D69A] text-[#35D69A]', icon: <Wind className="w-3.5 h-3.5 text-[#35D69A]" /> };
      case 'Shadow':
        return { label: 'Shadow', color: 'bg-[#0A1930] border-[#1677FF] text-[#94A8C7]', icon: <Moon className="w-3.5 h-3.5 text-[#94A8C7]" /> };
      case 'Arcane':
        return { label: 'Arcane', color: 'bg-[#0A1930] border-[#00D9FF] text-[#00D9FF]', icon: <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" /> };
      case 'Cosmic':
        return { label: 'Cosmic', color: 'bg-[#061225] border-[#38D9F5] text-[#38D9F5]', icon: <CloudLightning className="w-3.5 h-3.5 text-[#38D9F5]" /> };
      default:
        return { label: 'Physical', color: 'bg-[#0A1930] border-[#1677FF]/50 text-[#94A8C7]', icon: <Hand className="w-3.5 h-3.5 text-[#94A8C7]" /> };
    }
  };

  // Start Combat (Server-Authoritative Encounter Initialization)
  const handleStartFight = async () => {
    if (isStartingBattle) return;
    setBattleError(null);
    setIsStartingBattle(true);
    try {
      const startRes = await startBossBattle(activeKingdom.id);
      if (!startRes.success) {
        setBattleError(startRes.error || 'Could not start boss encounter right now.');
        return;
      }
      setPlayerCurrentHp(startRes.playerHp || playerMaxHp);
      setPlayerStamina(startRes.playerStamina ?? 100);
      setTurnCount(startRes.turnCount || 1);
      setIsTelegraphWarningActive(Boolean(startRes.telegraphActive));
      setSelectedAbilityId(null);
      setBattleState('FIGHTING');
      setBattleStats({
        turns: 0,
        weaknessHits: 0,
        attacksAvoided: 0,
        damageDealt: 0,
        damageTaken: 0,
      });
      setCombatLogs([
        `Battle commenced! You enter a bodyweight combat stance (Hands & Legs) against ${boss.name}.`,
        `[Tip] Monitor stamina, chain Hand & Leg techniques built from exercise, and heed attack warnings!`,
      ]);
      sound.playClick();
    } finally {
      setIsStartingBattle(false);
    }
  };

  // Execute Strategic Action: Hands/Legs Strike, Technique, Brace Defend, or Footwork Dodge
  const executeCombatAction = async (
    action: 'attack' | 'ability' | 'defend' | 'dodge',
    techniqueToUse?: BodyweightTechnique
  ) => {
    if (isAnimating || boss.health <= 0) return;

    // 1. Stamina Cost Validation (UI check; server enforces authoritatively)
    let staminaCost = 0;
    if (action === 'dodge') staminaCost = 20;
    else if (action === 'defend') staminaCost = 15;
    else if (action === 'ability' && techniqueToUse) staminaCost = techniqueToUse.staminaCost || 25;

    if (playerStamina < staminaCost) {
      sound.playClick();
      setCombatLogs(prev => [
        `⚠️ Not enough stamina! Need ${staminaCost} STAM (Current: ${playerStamina}). Recover with a Hands & Legs Combo!`,
        ...prev.slice(0, 4),
      ]);
      return;
    }

    setIsAnimating(true);

    try {
      // 2. Execute Strategic Engine via Server RPC
      const abilityId = action === 'ability' && techniqueToUse ? techniqueToUse.id : undefined;
      const isWarning = isTelegraphWarningActive;
      const result = await attackBoss(activeKingdom.id, action, abilityId);

      if (result.error) {
        setCombatLogs(prev => [`⚠️ ${result.error}`, ...prev.slice(0, 5)]);
        setIsAnimating(false);
        return;
      }

      // 3. Audio & Visual Feedback
      setLastDamageDealt(result.playerDamage);
      setLastBossDamage(result.bossDamage);

      if (result.isWeaknessHit) {
        setFeedbackType('weakness');
        sound.playWeaknessHit();
      } else if (result.isCrit) {
        setFeedbackType('crit');
        sound.playBossHit();
      } else if (result.isDodged) {
        setFeedbackType('dodged');
        sound.playDodge();
      } else if (result.isDefended) {
        setFeedbackType('defended');
        sound.playGuardBlock();
      } else {
        setFeedbackType('normal');
        sound.playAttack();
      }

      // 4. Update Logs & Authoritative Vitals/Stats
      setCombatLogs(prev => [result.combatLog, ...prev.slice(0, 5)]);

      const nextHp =
        typeof result.playerHp === 'number'
          ? result.playerHp
          : Math.max(0, playerCurrentHp - result.bossDamage);
      setPlayerCurrentHp(nextHp);

      if (typeof result.playerStamina === 'number') {
        setPlayerStamina(result.playerStamina);
      }
      if (typeof result.turnCount === 'number') {
        setTurnCount(result.turnCount);
      }
      if (typeof result.telegraphActive === 'boolean') {
        setIsTelegraphWarningActive(result.telegraphActive);
      }

      // Track analytics
      setBattleStats(prev => ({
        turns: prev.turns + 1,
        weaknessHits: result.isWeaknessHit ? prev.weaknessHits + 1 : prev.weaknessHits,
        attacksAvoided: (result.isDodged || (result.isDefended && isWarning)) ? prev.attacksAvoided + 1 : prev.attacksAvoided,
        damageDealt: prev.damageDealt + result.playerDamage,
        damageTaken: prev.damageTaken + result.bossDamage,
      }));

      // 5. Phase Transition Notification
      if (result.newPhase) {
        sound.playVictory();
        setPhaseAnnouncement(`PHASE ${result.newPhase} ACTIVATED: ${boss.phases?.[result.newPhase - 1]?.name || 'ENRAGE'}!`);
        setTimeout(() => setPhaseAnnouncement(null), 3000);
      }

      // Reset feedback after animation
      setTimeout(() => {
        setIsAnimating(false);
        setLastDamageDealt(null);
        setLastBossDamage(null);
        setFeedbackType(null);

        if (result.bossDefeated) {
          setBattleState('VICTORY');
        } else if (result.playerDefeated || nextHp <= 0) {
          setBattleState('DEFEAT');
        }
      }, 650);
    } catch {
      setIsAnimating(false);
    }
  };

  // Inspect & Discover Weakness Clue
  const handleInspectClue = () => {
    setShowLoreClueModal(true);
    sound.playClick();
  };

  const handleUnlockWeakness = () => {
    discoverBossWeakness(activeKingdom.id);
    sound.playQuestComplete();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#F05B70', '#FFAA45', '#FFD978'],
    });
  };

  const bossWeaknessBadge = boss.weakness ? getElementBadge(boss.weakness.element) : null;
  const bossResistanceBadge = boss.resistance ? getElementBadge(boss.resistance.element) : null;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Mode Switcher: Weekly Community Raid vs Kingdom Story Bosses */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#F05B70]/35 p-3 shadow-[0_12px_32px_rgba(4,12,28,0.65)]">
        <div className="flex items-center gap-2 px-2">
          <Dumbbell className="w-4 h-4 text-[#F05B70]" />
          <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#FFAA45]">
            Boss Encounters
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Boss battle modes"
          className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A1930] border border-[#F05B70]/30"
        >
          <button
            type="button"
            role="tab"
            aria-selected={bossMode === 'weekly'}
            onClick={() => setBossMode('weekly')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              bossMode === 'weekly'
                ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] text-[#061225] font-bold border border-[#FFAA45]/50 shadow-[0_0_16px_rgba(240,91,112,0.35)]'
                : 'text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-[#102440] border border-transparent'
            }`}
          >
            Weekly Community Raid
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={bossMode === 'kingdom'}
            onClick={() => setBossMode('kingdom')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              bossMode === 'kingdom'
                ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] text-[#061225] font-bold border border-[#FFAA45]/50 shadow-[0_0_16px_rgba(240,91,112,0.35)]'
                : 'text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-[#102440] border border-transparent'
            }`}
          >
            Kingdom Story Bosses
          </button>
        </div>
      </div>

      {bossMode === 'weekly' ? (
        <WeeklyBossRaidPanel />
      ) : (
        <>
      {/* Top Banner & Kingdom Navigation */}
      <div className="rounded-2xl bg-gradient-to-br from-[#36111F] via-[#102440] to-[#0A1930] border border-[#F05B70]/40 p-5 sm:p-6 shadow-[0_12px_32px_rgba(4,12,28,0.7)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#F05B70] bg-[#061225]/80 border border-[#F05B70]/50 px-2.5 py-0.5 rounded">
                Strategic Kingdom Encounters
              </span>
              <span className="text-xs text-[#FFAA45] font-semibold">{activeKingdom.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
              KINGDOM BOSS ENCOUNTERS
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
              Exploit elemental weaknesses, manage stamina, respond to telegraphed attack warnings, and weather 3 boss phases.
            </p>
          </div>

          {/* Kingdom Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#061225] rounded-xl border border-[#F05B70]/30 overflow-x-auto max-w-full">
            {kingdoms.map(k => (
              <button
                key={k.id}
                onClick={() => {
                  setSelectedKingdomId(k.id);
                  setBattleState('PREP');
                  sound.playClick();
                }}
                disabled={!k.unlocked}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedKingdomId === k.id
                    ? 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] text-[#061225] font-bold shadow-[0_0_12px_rgba(240,91,112,0.4)] cursor-pointer'
                    : k.unlocked
                    ? 'text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-[#102440] cursor-pointer'
                    : 'text-[#94A8C7]/40 cursor-not-allowed'
                }`}
              >
                {k.name} {!k.unlocked && '🔒'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. PREPARATION SCREEN */}
      {battleState === 'PREP' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Boss Tactical Dossier (7 Cols) */}
          <div className="lg:col-span-7 bg-[#102440]/90 backdrop-blur-md border border-[#F05B70]/35 rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(4,12,28,0.65)]">
            {/* Header Art & Phase Indicator */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={resolveAssetUrl(boss.image)}
                alt={boss.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102440] via-[#061225]/45 to-transparent" />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-[#0A1930]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#FFAA45] border border-[#FFAA45]/45 shadow">
                  {boss.difficulty} Difficulty
                </span>
                <span className="bg-[#36111F]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#F05B70] border border-[#F05B70]/45 shadow">
                  3 Boss Phases
                </span>
              </div>

              {/* Quick Inspect Weakness Clue Button */}
              <button
                onClick={handleInspectClue}
                className="absolute top-4 right-4 bg-[#0A1930]/90 hover:bg-[#152E52] border border-[#FFAA45]/50 hover:border-[#FFD978] text-[#F2F7FF] text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all hover:scale-105 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FFD978]" />
                <span>Weakness Dossier</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-['Cinzel'] font-black text-2xl text-[#F2F7FF]">{boss.name}</h3>
                <p className="text-xs text-[#FFAA45] font-medium">{boss.title}</p>
              </div>

              <p className="text-xs text-[#94A8C7] leading-relaxed italic border-l-2 border-[#F05B70] pl-3">
                "{boss.lore}"
              </p>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-3 bg-[#0A1930] p-3 rounded-xl border border-[#F05B70]/25 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#94A8C7] uppercase block">Max Health</span>
                  <span className="text-[#F05B70] font-bold">{boss.maxHealth} HP</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A8C7] uppercase block">Base Attack</span>
                  <span className="text-[#FFAA45] font-bold">{boss.attack} ATK</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A8C7] uppercase block">Armor Def</span>
                  <span className="text-[#00D9FF] font-bold">{boss.defense} DEF</span>
                </div>
              </div>

              {/* TACTICAL PROFILE: WEAKNESS, RESISTANCE & MECHANICS */}
              <div className="space-y-3 pt-2 border-t border-[#F05B70]/25">
                <span className="text-xs font-['Cinzel'] font-bold text-[#F2F7FF] uppercase tracking-wider block">
                  Tactical Reconnaissance Profile
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Elemental Weakness */}
                  <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#94A8C7] font-mono">
                        Elemental Weakness
                      </span>
                      {boss.weakness?.discovered ? (
                        <span className="text-[9px] font-mono font-bold text-[#35D69A] px-1.5 py-0.2 rounded bg-[#35D69A]/10 border border-[#35D69A]/40">
                          DISCOVERED
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-[#FFAA45] px-1.5 py-0.2 rounded bg-[#FFAA45]/10 border border-[#FFAA45]/40">
                          HIDDEN INTEL
                        </span>
                      )}
                    </div>

                    {boss.weakness?.discovered ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {bossWeaknessBadge?.icon}
                          <span className="font-bold text-[#F2F7FF] font-['Cinzel'] text-xs">
                            {boss.weakness.element} Element ({boss.weakness.damageMultiplier}x Damage)
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A8C7] leading-tight">
                          {boss.weakness.description}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[#94A8C7] font-mono italic text-[11px] block">
                          ??? [Undiscovered Elemental Weakness]
                        </span>
                        <button
                          onClick={handleInspectClue}
                          className="text-[10px] font-bold text-[#FFD978] hover:text-[#F2F7FF] underline block cursor-pointer"
                        >
                          Consult Archives to Reveal Clue ➔
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resistance */}
                  <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/40 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#94A8C7] font-mono block">
                      Damage Resistance
                    </span>
                    <div className="flex items-center gap-1.5 mb-1">
                      {bossResistanceBadge?.icon}
                      <span className="font-bold text-[#F2F7FF] font-['Cinzel'] text-xs">
                        {boss.resistance?.element} Element (-{boss.resistance?.damageReductionPercent}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A8C7] leading-tight">
                      {boss.resistance?.description}
                    </p>
                  </div>
                </div>

                {/* Signature Attack Warning Info */}
                {boss.signatureAttack && (
                  <div className="p-3 rounded-xl bg-[#36111F]/65 border border-[#F05B70]/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F05B70] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#F05B70]" />
                        Telegraphed Signature: {boss.signatureAttack.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#F05B70]/20 text-[#FFD978] border border-[#F05B70]/40 font-bold">
                        Counter with {boss.signatureAttack.defenseResponse.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#94A8C7] text-[11px] leading-tight">
                      {boss.signatureAttack.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Prep & Champion Bodyweight Conditioning (5 Cols) */}
          <div className="lg:col-span-5 bg-[#102440]/90 backdrop-blur-md border border-[#F05B70]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(4,12,28,0.65)] space-y-5">
            <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#FFAA45]" />
              HANDS &amp; LEGS BODYWEIGHT READINESS
            </h4>

            {/* Bodyweight Conditioning Profile */}
            <div className="p-4 rounded-xl bg-[#0A1930] border border-[#F05B70]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A8C7]">Combat Discipline</span>
                <span className="text-[10px] uppercase font-bold text-[#FFD978] bg-[#061225] px-2 py-0.5 rounded border border-[#FFAA45]/40">
                  Hands &amp; Legs Only · {stats.aetherRank}
                </span>
              </div>

              <div>
                <h5 className="font-['Cinzel'] font-black text-base text-[#F2F7FF]">
                  {heroDef.bodyweightDisciplines.conditioningStyle}
                </h5>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Bodyweight training builds strength through exercise — every strike comes from your hands and legs.
                </p>

                <div className="grid grid-cols-1 gap-1.5 mt-2.5 text-[11px] bg-[#061225] border border-[#1677FF]/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Hand className="w-3.5 h-3.5 text-[#F05B70] shrink-0" />
                    <span className="text-[#94A8C7]">Hands:</span>
                    <span className="text-[#F2F7FF] font-medium">{heroDef.bodyweightDisciplines.handsFocus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Footprints className="w-3.5 h-3.5 text-[#FFAA45] shrink-0" />
                    <span className="text-[#94A8C7]">Legs:</span>
                    <span className="text-[#F2F7FF] font-medium">{heroDef.bodyweightDisciplines.legsFocus}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mt-2 bg-[#061225] border border-[#1677FF]/30 rounded-lg p-2 text-[10px] font-mono text-center">
                  <div>
                    <span className="text-[#94A8C7] block">STRIKE</span>
                    <span className="text-[#F05B70] font-bold">+{rawAtk}</span>
                  </div>
                  <div>
                    <span className="text-[#94A8C7] block">GUARD</span>
                    <span className="text-[#FFAA45] font-bold">+{rawDef}</span>
                  </div>
                  <div>
                    <span className="text-[#94A8C7] block">CRIT</span>
                    <span className="text-[#FFD978] font-bold">{critPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[#94A8C7] block">REPS</span>
                    <span className="text-[#35D69A] font-bold">{stats.totalVerifiedReps}</span>
                  </div>
                </div>
              </div>

              {/* Bodyweight Techniques Preview */}
              <div className="space-y-1.5 pt-2 border-t border-[#1677FF]/30">
                <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] font-mono block">
                  Hands &amp; Legs Bodyweight Techniques:
                </span>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {bodyweightTechniques.map(tech => {
                    const badge = getElementBadge(tech.element);
                    const isWeaknessMatch = boss.weakness?.element === tech.element;
                    return (
                      <div
                        key={tech.id}
                        className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                          isWeaknessMatch
                            ? 'bg-[#102440] border-[#FFD978]/65 text-[#F2F7FF]'
                            : 'bg-[#061225] border-[#1677FF]/30 text-[#94A8C7]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {badge.icon}
                          <div className="min-w-0">
                            <span className="font-['Cinzel'] font-bold text-[11px] text-[#F2F7FF] block truncate">{tech.name}</span>
                            <span className="text-[10px] text-[#94A8C7] block truncate">
                              {tech.limb === 'hands' ? 'Hands' : tech.limb === 'legs' ? 'Legs' : 'Hands & Legs'} · Built from {tech.exerciseInspiration}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWeaknessMatch && (
                            <span className="text-[9px] font-mono font-black text-[#FFD978] animate-pulse">
                              WEAKNESS!
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#94A8C7]">
                            {tech.staminaCost} STAM
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Combat Buffs */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#FFAA45] mb-2 block">
                Combat Buffs ({buffs.filter(b => b.active).length} Active)
              </span>
              <div className="space-y-2">
                {buffs.map(b => (
                  <div
                    key={b.id}
                    onClick={() => activateBuff(b.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                      b.active
                        ? 'bg-[#36111F]/70 border-[#FFAA45]/65 text-[#F2F7FF] shadow-[0_0_12px_rgba(255,170,69,0.2)]'
                        : 'bg-[#0A1930] border-[#1677FF]/30 text-[#94A8C7] hover:text-[#F2F7FF] hover:border-[#FFAA45]/45'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${b.active ? 'text-[#FFD978]' : 'text-[#94A8C7]'}`} />
                      <span className="font-semibold">{b.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#FFD978]">
                      +{b.effectValue}% {b.effectType.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {battleError && (
              <div className="p-2.5 rounded-xl bg-[#36111F]/85 border border-[#F05B70]/50 text-xs text-rose-200 text-center">
                {battleError}
              </div>
            )}

            {/* Launch Combat Button */}
            <button
              onClick={handleStartFight}
              disabled={isStartingBattle}
              className="w-full py-4 font-black font-['Cinzel'] tracking-widest text-sm rounded-xl bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#ff6e82] hover:to-[#FFD978] text-[#061225] shadow-[0_0_20px_rgba(240,91,112,0.4)] hover:shadow-[0_0_28px_rgba(255,170,69,0.5)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isStartingBattle ? 'ENTERING COMBAT ARENA...' : 'ENGAGE IN STRATEGIC COMBAT'}
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE STRATEGIC COMBAT ARENA */}
      {battleState === 'FIGHTING' && (
        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#F05B70]/40 rounded-2xl p-5 sm:p-7 shadow-[0_12px_32px_rgba(4,12,28,0.65)] space-y-6 relative overflow-hidden">
          {/* Phase Transition Banner Overlay */}
          {phaseAnnouncement && (
            <div className="absolute top-4 inset-x-4 z-40 bg-gradient-to-r from-[#F05B70] via-[#1677FF] to-[#FFAA45] text-white p-3 rounded-xl text-center font-['Cinzel'] font-black text-sm tracking-widest shadow-2xl border border-[#FFD978] animate-in zoom-in-95">
              {phaseAnnouncement}
            </div>
          )}

          {/* TELEGRAPHED BOSS ATTACK WARNING BANNER */}
          {isTelegraphWarningActive && boss.signatureAttack && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#36111F]/95 via-[#2a0b16] to-[#36111F]/95 border-2 border-[#F05B70] shadow-2xl animate-pulse space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#F05B70] animate-bounce" />
                  <span className="font-['Cinzel'] font-black text-sm text-[#F2F7FF] tracking-wide">
                    ⚠️ TELEGRAPHED ATTACK WARNING: {boss.signatureAttack.name.toUpperCase()}!
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-[#36111F] text-rose-200 font-black border border-[#F05B70]">
                  RECOMMENDED: {boss.signatureAttack.defenseResponse.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-rose-200/90">
                {boss.signatureAttack.warningText}
              </p>
            </div>
          )}

          {/* Combatants Dual Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* PLAYER HERO HUD */}
            <div className="p-5 rounded-2xl bg-[#0A1930] border border-[#1677FF]/40 space-y-3 relative">
              {/* Floating Boss Damage over Player */}
              {lastBossDamage !== null && (
                <div className="absolute top-2 right-4 text-2xl font-black font-mono text-[#F05B70] animate-bounce">
                  {lastBossDamage === 0 ? 'EVADED! 0 DMG' : `-${lastBossDamage}`}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={getHeroArtwork(selectedHeroId, user?.characterClass)}
                    alt={`${user?.characterClass || 'Warrior'} Champion`}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover object-top border border-[#FFD978]/60"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                      {user?.characterName || user?.username || 'Hero of Aetheria'}
                    </h4>
                    <p className="text-xs text-[#FFAA45] font-mono">
                      Hands &amp; Legs · {heroDef.bodyweightDisciplines.conditioningStyle}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#061225] border border-[#1677FF]/40 flex items-center justify-center shrink-0 text-[#FFD978]">
                  <Dumbbell className="w-5 h-5" />
                </div>
              </div>

              {/* Player Vitality HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#94A8C7] mb-1 font-mono">
                  <span>Player Vitality</span>
                  <span className="font-bold text-[#35D69A]">{playerCurrentHp} / {playerMaxHp} HP</span>
                </div>
                <div className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1677FF]/30">
                  <div
                    className="bg-[#35D69A] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerCurrentHp / playerMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Player Stamina Bar (Crucial strategic resource!) */}
              <div>
                <div className="flex justify-between text-xs text-[#94A8C7] mb-1 font-mono">
                  <span className="flex items-center gap-1 text-[#FFAA45]">
                    <Zap className="w-3.5 h-3.5" /> Stamina
                  </span>
                  <span className="font-bold text-[#FFD978]">{playerStamina} / {playerMaxStamina} STAM</span>
                </div>
                <div className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1677FF]/30">
                  <div
                    className="bg-gradient-to-r from-[#FFAA45] to-[#FFD978] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerStamina / playerMaxStamina) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#94A8C7]/70 font-mono mt-0.5 block">
                  +15 passive / +25 standard attack
                </span>
              </div>
            </div>

            {/* BOSS ENCOUNTER HUD */}
            <div className={`p-5 rounded-2xl bg-[#0A1930] border border-[#F05B70]/45 space-y-3 relative ${isAnimating ? 'animate-pulse' : ''}`}>
              {/* Floating Damage Feedback over Boss */}
              {lastDamageDealt !== null && (
                <div className={`absolute top-2 right-4 text-2xl font-black font-mono animate-bounce ${
                  feedbackType === 'weakness'
                    ? 'text-[#FFD978] drop-shadow-[0_0_12px_rgba(255,217,120,0.9)]'
                    : feedbackType === 'crit'
                    ? 'text-[#FFAA45] drop-shadow'
                    : 'text-[#F05B70]'
                }`}>
                  -{lastDamageDealt}{' '}
                  {feedbackType === 'weakness' ? '💥 WEAKNESS HIT!' : feedbackType === 'crit' ? 'CRIT!' : ''}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={resolveAssetUrl(boss.image)}
                    alt={boss.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border border-[#F05B70]"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">{boss.name}</h4>
                    <p className="text-xs text-[#F05B70] font-mono">{boss.title}</p>
                  </div>
                </div>

                {/* Boss Current Phase Indicator */}
                <div className="text-right">
                  <span className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded border border-[#F05B70]/45 bg-[#061225] ${currentPhaseInfo.auraColor}`}>
                    PHASE {currentPhaseNumber}: {currentPhaseInfo.name}
                  </span>
                  <span className="text-[10px] text-[#94A8C7] block mt-0.5 font-mono">
                    ATK x{currentPhaseInfo.attackMultiplier}
                  </span>
                </div>
              </div>

              {/* Boss HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#94A8C7] mb-1 font-mono">
                  <span>Void Corruption Health</span>
                  <span className="font-bold text-[#F05B70]">{boss.health} / {boss.maxHealth} HP</span>
                </div>
                <div className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#F05B70]/30">
                  <div
                    className="bg-gradient-to-r from-[#F05B70] to-[#FFAA45] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Boss Active Weakness / Resistances Strip */}
              <div className="flex items-center gap-2 pt-1">
                {boss.weakness && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    boss.weakness.discovered
                      ? 'bg-[#061225] border-[#FFD978]/60 text-[#FFD978]'
                      : 'bg-[#061225] border-[#1677FF]/30 text-[#94A8C7]/70'
                  }`}>
                    {boss.weakness.discovered ? (
                      <>
                        {bossWeaknessBadge?.icon}
                        <span>Weak: {boss.weakness.element} ({boss.weakness.damageMultiplier}x)</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3 h-3 text-[#94A8C7]/70" />
                        <span>Weakness: ???</span>
                      </>
                    )}
                  </span>
                )}

                {boss.resistance && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-[#061225] border-[#1677FF]/35 text-[#94A8C7] flex items-center gap-1">
                    {bossResistanceBadge?.icon}
                    <span>Resist: {boss.resistance.element}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. FOUR STRATEGIC BODYWEIGHT COMBAT CHOICES */}
          <div className="p-5 rounded-2xl bg-[#0A1930] border border-[#F05B70]/30 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1677FF]/30 pb-2">
              <span className="text-xs uppercase font-['Cinzel'] font-black tracking-widest text-[#F2F7FF] flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-[#FFAA45]" />
                Hands &amp; Legs Combat Actions (Turn {turnCount})
              </span>
              <span className="text-xs font-mono text-[#FFD978] font-bold">
                Stamina: {playerStamina} / 100
              </span>
            </div>

            {/* 4 Main Action Pillars: Strike / Technique / Brace / Footwork Evade */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* ACTION 1: HANDS & LEGS STRIKE */}
              <button
                onClick={() => executeCombatAction('attack')}
                disabled={isAnimating}
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#102440] to-[#061225] hover:from-[#152E52] hover:to-[#0A1930] border border-[#F05B70]/45 hover:border-[#FFAA45] hover:shadow-[0_0_16px_rgba(240,91,112,0.22)] text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] flex items-center gap-1.5">
                    <Hand className="w-4 h-4 text-[#F05B70] group-hover:scale-110 transition-transform" />
                    STRIKE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#35D69A] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-[#35D69A]/50">
                    +25 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#94A8C7]">
                  Bodyweight punch &amp; kick combo. Restores stamina and builds pressure.
                </p>
              </button>

              {/* ACTION 2: BODYWEIGHT TECHNIQUE */}
              <button
                onClick={() => {
                  const unlocked = bodyweightTechniques.filter(t => t.unlocked);
                  if (unlocked.length > 0) {
                    executeCombatAction('ability', unlocked[0]);
                  } else {
                    executeCombatAction('attack');
                  }
                }}
                disabled={isAnimating || playerStamina < 20}
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#102440] to-[#061225] hover:from-[#152E52] hover:to-[#0A1930] border border-[#FFAA45]/55 hover:border-[#FFD978] hover:shadow-[0_0_16px_rgba(255,170,69,0.3)] text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#FFAA45] group-hover:scale-110 transition-transform" />
                    TECHNIQUE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#FFD978] bg-[#061225] px-1.5 py-0.2 rounded border border-[#FFAA45]/50">
                    20-35 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#94A8C7]">
                  Unleash a trained Hand or Leg strike to exploit boss weaknesses.
                </p>
              </button>

              {/* ACTION 3: DEFEND / BRACE */}
              <button
                onClick={() => executeCombatAction('defend')}
                disabled={isAnimating || playerStamina < 15}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'defend'
                    ? 'bg-gradient-to-b from-[#1677FF]/50 to-[#0A1930] border-[#FFD978] ring-2 ring-[#FFD978]/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#102440] to-[#061225] hover:from-[#152E52] hover:to-[#0A1930] border-[#00D9FF]/40 hover:border-[#FFD978]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#00D9FF] group-hover:scale-110 transition-transform" />
                    BRACE GUARD
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#00D9FF] bg-[#061225] px-1.5 py-0.2 rounded border border-[#00D9FF]/40">
                    15 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#94A8C7]">
                  Root your stance with forearms &amp; core. Reduces damage by 80% against Ground Slams.
                </p>
              </button>

              {/* ACTION 4: FOOTWORK DODGE */}
              <button
                onClick={() => executeCombatAction('dodge')}
                disabled={isAnimating || playerStamina < 20}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'dodge'
                    ? 'bg-gradient-to-b from-emerald-900 to-teal-950 border-[#35D69A] ring-2 ring-[#35D69A]/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#132b26] to-[#061225] border-[#35D69A]/50 hover:border-[#35D69A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-emerald-200 flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-[#35D69A] group-hover:scale-110 transition-transform" />
                    FOOTWORK EVADE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#35D69A] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-[#35D69A]/50">
                    20 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#94A8C7]">
                  Agile leg step &amp; evasive roll. Avoids 100% damage from telegraphed ambushes.
                </p>
              </button>
            </div>

            {/* HANDS & LEGS BODYWEIGHT TECHNIQUE SELECTOR STRIP */}
            <div className="pt-3 border-t border-[#1677FF]/30">
              <span className="text-[10px] uppercase tracking-widest font-black text-[#FFAA45] font-['Cinzel'] block mb-2">
                Hands &amp; Legs Bodyweight Techniques (Strength Built Through Exercise):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {bodyweightTechniques.map(tech => {
                  const isUnlocked = tech.unlocked;
                  const badge = getElementBadge(tech.element);
                  const isWeaknessMatch = boss.weakness?.element === tech.element;
                  const cost = tech.staminaCost || 25;
                  const hasEnoughStamina = playerStamina >= cost;

                  return (
                    <button
                      key={tech.id}
                      onClick={() => executeCombatAction('ability', tech)}
                      disabled={isAnimating || !isUnlocked || !hasEnoughStamina}
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                        isUnlocked && hasEnoughStamina
                          ? isWeaknessMatch
                            ? 'bg-gradient-to-r from-[#36111F] to-[#102440] border-[#FFD978] ring-2 ring-[#FFD978]/50 hover:scale-[1.02] cursor-pointer shadow-[0_0_16px_rgba(255,217,120,0.25)]'
                            : 'bg-gradient-to-r from-[#102440] to-[#061225] border-[#F05B70]/40 hover:border-[#FFAA45]/60 hover:scale-[1.01] cursor-pointer'
                          : 'bg-[#061225]/60 border-[#1677FF]/25 text-[#94A8C7]/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] truncate flex items-center gap-1.5">
                          {tech.limb === 'legs' ? (
                            <Footprints className="w-3.5 h-3.5 text-[#FFAA45] shrink-0" />
                          ) : (
                            <Hand className="w-3.5 h-3.5 text-[#F05B70] shrink-0" />
                          )}
                          {tech.name}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isWeaknessMatch
                            ? 'bg-[#FFD978] text-[#061225] animate-pulse'
                            : 'bg-[#0A1930] text-[#94A8C7] border border-[#1677FF]/35'
                        }`}>
                          {cost} STAM
                        </span>
                      </div>

                      <p className="text-[11px] text-[#94A8C7] line-clamp-1">{tech.combatEffect}</p>

                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                        <span className="text-[#94A8C7]/80">
                          {tech.exerciseInspiration} · {badge.label}
                        </span>
                        {isWeaknessMatch && (
                          <span className="text-[#FFD978] font-bold">1.8x - 2.0x BONUS!</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Combat Logs Console */}
          <div className="p-4 rounded-xl bg-[#061225] border border-[#F05B70]/30 text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto">
            {combatLogs.map((log, idx) => (
              <p
                key={idx}
                className={
                  idx === 0
                    ? 'text-[#FFD978] font-bold border-l-2 border-[#FFD978] pl-2'
                    : 'text-[#94A8C7] pl-2'
                }
              >
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 4. VICTORY SCREEN WITH COMPREHENSIVE RECAP */}
      {battleState === 'VICTORY' && (
        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#FFD978]/60 rounded-2xl p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(4,12,28,0.7)] animate-in zoom-in-95 space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E7B94F]/20 text-[#FFD978] flex items-center justify-center border border-[#FFD978]/55 shadow-[0_0_20px_rgba(255,217,120,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFD978] font-['Cinzel'] block">
              Strategic Encounter Cleared
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
              VICTORY! {boss.name.toUpperCase()} PURIFIED
            </h3>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-md mx-auto mt-1">
              Through strategic weakness exploitation and disciplined defenses, the Void corruption in {activeKingdom.name} has been banished!
            </p>
          </div>

          {/* Combat Analytics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto bg-[#0A1930] p-4 rounded-xl border border-[#1677FF]/35 text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#94A8C7] uppercase block">Turns Taken</span>
              <span className="text-base font-bold text-[#F2F7FF]">{battleStats.turns}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#FFAA45] uppercase block">Weakness Hits</span>
              <span className="text-base font-bold text-[#FFD978]">{battleStats.weaknessHits}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#00D9FF] uppercase block">Avoided / Guarded</span>
              <span className="text-base font-bold text-[#00D9FF]">{battleStats.attacksAvoided}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#35D69A] uppercase block">Damage Dealt</span>
              <span className="text-base font-bold text-[#35D69A]">{battleStats.damageDealt}</span>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto bg-[#061225] p-3 rounded-xl border border-[#FFD978]/35 font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#94A8C7] uppercase block">Player XP</span>
              <span className="text-lg font-bold text-[#FFD978]">+{boss.rewardPlayerXp}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#94A8C7] uppercase block">Aether Pts</span>
              <span className="text-lg font-bold text-[#F2F7FF]">+60</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                resetBossBattle(activeKingdom.id);
                setBattleState('PREP');
                sound.playClick();
              }}
              className="px-6 py-2.5 rounded-xl bg-[#0A1930] hover:bg-[#152E52] border border-[#1677FF]/45 hover:border-[#FFAA45]/60 text-xs font-semibold text-[#F2F7FF] transition-all cursor-pointer"
            >
              Challenge Again
            </button>
            <button
              onClick={() => setActiveTab('storyline')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#061225] font-['Cinzel'] font-bold text-xs shadow-[0_0_16px_rgba(231,185,79,0.35)] transition-all cursor-pointer"
            >
              Advance Realm Storyline
            </button>
          </div>
        </div>
      )}

      {/* 5. DEFEAT SCREEN WITH STRATEGIC HINTS */}
      {battleState === 'DEFEAT' && (
        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#F05B70]/55 rounded-2xl p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(4,12,28,0.7)] space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#36111F]/85 text-[#F05B70] flex items-center justify-center border border-[#F05B70]/55">
            <Skull className="w-7 h-7" />
          </div>

          <h3 className="text-2xl font-black font-['Cinzel'] text-[#F05B70]">
            DEFEATED BY {boss.name.toUpperCase()}
          </h3>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-[#0A1930] border border-[#F05B70]/35 text-xs text-[#94A8C7] text-left space-y-2">
            <span className="font-bold text-[#FFAA45] font-['Cinzel'] block">
              Tactical Battle Debrief:
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-[#94A8C7]">
              <li>
                <strong className="text-[#F2F7FF]">Heed Telegraphed Warnings:</strong> Use <strong className="text-[#F2F7FF]">DEFEND</strong> against slams or <strong className="text-[#F2F7FF]">DODGE</strong> against ambushes when warnings appear.
              </li>
              <li>
                <strong className="text-[#F2F7FF]">Exploit Weakness:</strong> {boss.name} is vulnerable to <strong className="text-[#F2F7FF]">{boss.weakness?.element}</strong> for massive bonus damage.
              </li>
              <li>
                <strong className="text-[#F2F7FF]">Manage Stamina:</strong> Don't deplete all stamina on abilities; standard attacks restore +25 STAM.
              </li>
            </ul>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                resetBossBattle(activeKingdom.id);
                setBattleState('PREP');
                sound.playClick();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#ff6e82] hover:to-[#FFD978] text-[#061225] text-xs font-bold shadow-[0_0_16px_rgba(240,91,112,0.35)] transition-all cursor-pointer"
            >
              Retry Encounter
            </button>
            <button
              onClick={() => setActiveTab('fitness')}
              className="px-6 py-2.5 rounded-xl bg-[#0A1930] hover:bg-[#152E52] border border-[#1677FF]/45 hover:border-[#FFAA45]/60 text-[#F2F7FF] text-xs font-bold transition-all cursor-pointer"
            >
              Train Bodyweight Strength
            </button>
          </div>
        </div>
      )}

      {/* 6. WEAKNESS DISCOVERY & CLUE MODAL */}
      {showLoreClueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061225]/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#102440] via-[#0A1930] to-[#061225] border border-[#FFD978]/50 p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1677FF]/35 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#FFD978]" />
                <h3 className="font-['Cinzel'] font-black text-lg text-[#F2F7FF]">
                  ARCHIVAL WEAKNESS CLUE
                </h3>
              </div>
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="text-[#94A8C7] hover:text-[#F2F7FF] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ancient Clue Dossier */}
            <div className="p-4 rounded-xl bg-[#061225] border border-[#F05B70]/40 space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#FFAA45] font-bold block">
                Storyline Intel · {boss.name}
              </span>
              <p className="text-xs text-[#94A8C7] leading-relaxed italic border-l-2 border-[#FFD978] pl-3">
                "{boss.weakness?.clue}"
              </p>
            </div>

            {/* Discovery State & Action */}
            <div className="p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#94A8C7] font-mono block">Bestiary Status:</span>
                <span className={`text-xs font-bold ${boss.weakness?.discovered ? 'text-[#35D69A]' : 'text-[#FFD978]'}`}>
                  {boss.weakness?.discovered
                    ? `Discovered: ${boss.weakness.element} Element (${boss.weakness.damageMultiplier}x)`
                    : 'Hidden in Bestiary'}
                </span>
              </div>

              {!boss.weakness?.discovered ? (
                <button
                  onClick={handleUnlockWeakness}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#ff6e82] hover:to-[#FFD978] text-[#061225] font-['Cinzel'] font-black text-xs shadow-[0_0_16px_rgba(240,91,112,0.4)] transition-all hover:scale-105 cursor-pointer"
                >
                  DECRYPT WEAKNESS
                </button>
              ) : (
                <span className="text-xs font-mono text-[#35D69A] font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Ready for Combat
                </span>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="px-6 py-2 rounded-xl bg-[#0A1930] hover:bg-[#152E52] border border-[#1677FF]/45 hover:border-[#FFAA45]/60 text-xs font-semibold text-[#F2F7FF] transition-all cursor-pointer"
              >
                Return to Chamber
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
