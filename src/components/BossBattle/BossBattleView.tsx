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
    auraColor: currentPhaseNumber === 3 ? 'text-rose-400' : currentPhaseNumber === 2 ? 'text-amber-400' : 'text-[#00D9FF]',
  };

  // Helper for elemental icon
  const getElementBadge = (element: ElementType) => {
    switch (element) {
      case 'Fire':
        return { label: 'Fire', color: 'bg-rose-950 border-rose-500 text-rose-300', icon: <Flame className="w-3.5 h-3.5 text-rose-400" /> };
      case 'Water':
        return { label: 'Water', color: 'bg-cyan-950 border-cyan-500 text-cyan-300', icon: <Droplets className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'Ice':
        return { label: 'Ice', color: 'bg-sky-950 border-sky-400 text-sky-200', icon: <Wind className="w-3.5 h-3.5 text-sky-300" /> };
      case 'Lightning':
        return { label: 'Lightning', color: 'bg-amber-950 border-amber-400 text-amber-300', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> };
      case 'Light':
        return { label: 'Light', color: 'bg-yellow-950 border-yellow-400 text-yellow-200', icon: <Sun className="w-3.5 h-3.5 text-yellow-300" /> };
      case 'Void':
        return { label: 'Void', color: 'bg-[#061225] border-[#00D9FF]/60 text-[#00D9FF]', icon: <Moon className="w-3.5 h-3.5 text-[#00D9FF]" /> };
      case 'Nature':
        return { label: 'Nature', color: 'bg-emerald-950 border-emerald-500 text-emerald-300', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'Earth':
        return { label: 'Earth', color: 'bg-amber-950 border-amber-700 text-amber-200', icon: <Dumbbell className="w-3.5 h-3.5 text-amber-500" /> };
      case 'Wind':
        return { label: 'Wind', color: 'bg-teal-950 border-teal-400 text-teal-200', icon: <Wind className="w-3.5 h-3.5 text-teal-300" /> };
      case 'Shadow':
        return { label: 'Shadow', color: 'bg-[#0A1930] border-slate-500 text-slate-300', icon: <Moon className="w-3.5 h-3.5 text-[#A9B8CC]" /> };
      case 'Arcane':
        return { label: 'Arcane', color: 'bg-[#0A1930] border-[#1677FF] text-sky-300', icon: <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" /> };
      case 'Cosmic':
        return { label: 'Cosmic', color: 'bg-[#061225] border-cyan-400 text-cyan-200', icon: <CloudLightning className="w-3.5 h-3.5 text-[#00D9FF]" /> };
      default:
        return { label: 'Physical', color: 'bg-[#0A1930] border-slate-600 text-slate-300', icon: <Hand className="w-3.5 h-3.5 text-[#A9B8CC]" /> };
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
      colors: ['#1677FF', '#00D9FF', '#FFFFFF'],
    });
  };

  const bossWeaknessBadge = boss.weakness ? getElementBadge(boss.weakness.element) : null;
  const bossResistanceBadge = boss.resistance ? getElementBadge(boss.resistance.element) : null;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Mode Switcher: Weekly Community Raid vs Kingdom Story Bosses */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-3 shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
        <div className="flex items-center gap-2 px-2">
          <Dumbbell className="w-4 h-4 text-[#00D9FF]" />
          <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#00D9FF]">
            Boss Encounters
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Boss battle modes"
          className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A1930] border border-[#1677FF]/30"
        >
          <button
            type="button"
            role="tab"
            aria-selected={bossMode === 'weekly'}
            onClick={() => setBossMode('weekly')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              bossMode === 'weekly'
                ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white border border-[#00D9FF]/45 shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                : 'text-[#A9B8CC] hover:text-white hover:bg-[#102440] border border-transparent'
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
                ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white border border-[#00D9FF]/45 shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                : 'text-[#A9B8CC] hover:text-white hover:bg-[#102440] border border-transparent'
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
      <div className="rounded-2xl bg-gradient-to-br from-[#061225] via-[#0A1930] to-[#102440] border border-[#1677FF]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(2,8,20,0.65)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-rose-300 bg-rose-950/70 border border-rose-500/45 px-2.5 py-0.5 rounded">
                Strategic Kingdom Encounters
              </span>
              <span className="text-xs text-[#00D9FF] font-semibold">{activeKingdom.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              KINGDOM BOSS ENCOUNTERS
            </h1>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Exploit elemental weaknesses, manage stamina, respond to telegraphed attack warnings, and weather 3 boss phases.
            </p>
          </div>

          {/* Kingdom Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#061225] rounded-xl border border-[#1677FF]/30 overflow-x-auto max-w-full">
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
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.4)] cursor-pointer'
                    : k.unlocked
                    ? 'text-[#A9B8CC] hover:text-white hover:bg-[#102440] cursor-pointer'
                    : 'text-[#A9B8CC]/40 cursor-not-allowed'
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
          <div className="lg:col-span-7 bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(2,8,20,0.65)]">
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
                <span className="bg-[#0A1930]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#00D9FF] border border-[#00D9FF]/45 shadow">
                  {boss.difficulty} Difficulty
                </span>
                <span className="bg-rose-950/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-300 border border-rose-500/45 shadow">
                  3 Boss Phases
                </span>
              </div>

              {/* Quick Inspect Weakness Clue Button */}
              <button
                onClick={handleInspectClue}
                className="absolute top-4 right-4 bg-[#0A1930]/90 hover:bg-[#16325C] border border-[#00D9FF]/50 hover:border-[#00D9FF] text-white text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all hover:scale-105 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>Weakness Dossier</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-['Cinzel'] font-black text-2xl text-white">{boss.name}</h3>
                <p className="text-xs text-[#00D9FF] font-medium">{boss.title}</p>
              </div>

              <p className="text-xs text-[#A9B8CC] leading-relaxed italic border-l-2 border-[#1677FF] pl-3">
                "{boss.lore}"
              </p>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-3 bg-[#0A1930] p-3 rounded-xl border border-[#1677FF]/25 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#A9B8CC] uppercase block">Max Health</span>
                  <span className="text-rose-400 font-bold">{boss.maxHealth} HP</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A9B8CC] uppercase block">Base Attack</span>
                  <span className="text-amber-400 font-bold">{boss.attack} ATK</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A9B8CC] uppercase block">Armor Def</span>
                  <span className="text-[#00D9FF] font-bold">{boss.defense} DEF</span>
                </div>
              </div>

              {/* TACTICAL PROFILE: WEAKNESS, RESISTANCE & MECHANICS */}
              <div className="space-y-3 pt-2 border-t border-[#1677FF]/25">
                <span className="text-xs font-['Cinzel'] font-bold text-white uppercase tracking-wider block">
                  Tactical Reconnaissance Profile
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Elemental Weakness */}
                  <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#A9B8CC] font-mono">
                        Elemental Weakness
                      </span>
                      {boss.weakness?.discovered ? (
                        <span className="text-[9px] font-mono font-bold text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700">
                          DISCOVERED
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-amber-400 px-1.5 py-0.2 rounded bg-amber-950 border border-amber-700">
                          HIDDEN INTEL
                        </span>
                      )}
                    </div>

                    {boss.weakness?.discovered ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {bossWeaknessBadge?.icon}
                          <span className="font-bold text-white font-['Cinzel'] text-xs">
                            {boss.weakness.element} Element ({boss.weakness.damageMultiplier}x Damage)
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A9B8CC] leading-tight">
                          {boss.weakness.description}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[#A9B8CC] font-mono italic text-[11px] block">
                          ??? [Undiscovered Elemental Weakness]
                        </span>
                        <button
                          onClick={handleInspectClue}
                          className="text-[10px] font-bold text-[#00D9FF] hover:text-white underline block cursor-pointer"
                        >
                          Consult Archives to Reveal Clue ➔
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resistance */}
                  <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#A9B8CC] font-mono block">
                      Damage Resistance
                    </span>
                    <div className="flex items-center gap-1.5 mb-1">
                      {bossResistanceBadge?.icon}
                      <span className="font-bold text-white font-['Cinzel'] text-xs">
                        {boss.resistance?.element} Element (-{boss.resistance?.damageReductionPercent}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A9B8CC] leading-tight">
                      {boss.resistance?.description}
                    </p>
                  </div>
                </div>

                {/* Signature Attack Warning Info */}
                {boss.signatureAttack && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/35 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Telegraphed Signature: {boss.signatureAttack.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-bold">
                        Counter with {boss.signatureAttack.defenseResponse.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#A9B8CC] text-[11px] leading-tight">
                      {boss.signatureAttack.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Prep & Champion Bodyweight Conditioning (5 Cols) */}
          <div className="lg:col-span-5 bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(2,8,20,0.65)] space-y-5">
            <h4 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#00D9FF]" />
              HANDS &amp; LEGS BODYWEIGHT READINESS
            </h4>

            {/* Bodyweight Conditioning Profile */}
            <div className="p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A9B8CC]">Combat Discipline</span>
                <span className="text-[10px] uppercase font-bold text-[#00D9FF] bg-[#061225] px-2 py-0.5 rounded border border-[#1677FF]/40">
                  Hands &amp; Legs Only · {stats.aetherRank}
                </span>
              </div>

              <div>
                <h5 className="font-['Cinzel'] font-black text-base text-white">
                  {heroDef.bodyweightDisciplines.conditioningStyle}
                </h5>
                <p className="text-xs text-[#A9B8CC] mt-0.5">
                  Bodyweight training builds strength through exercise — every strike comes from your hands and legs.
                </p>

                <div className="grid grid-cols-1 gap-1.5 mt-2.5 text-[11px] bg-[#061225] border border-[#1677FF]/25 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Hand className="w-3.5 h-3.5 text-[#1677FF] shrink-0" />
                    <span className="text-[#A9B8CC]">Hands:</span>
                    <span className="text-white font-medium">{heroDef.bodyweightDisciplines.handsFocus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Footprints className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
                    <span className="text-[#A9B8CC]">Legs:</span>
                    <span className="text-white font-medium">{heroDef.bodyweightDisciplines.legsFocus}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mt-2 bg-[#061225] border border-[#1677FF]/25 rounded-lg p-2 text-[10px] font-mono text-center">
                  <div>
                    <span className="text-[#A9B8CC] block">STRIKE</span>
                    <span className="text-[#00D9FF] font-bold">+{rawAtk}</span>
                  </div>
                  <div>
                    <span className="text-[#A9B8CC] block">GUARD</span>
                    <span className="text-[#1677FF] font-bold">+{rawDef}</span>
                  </div>
                  <div>
                    <span className="text-[#A9B8CC] block">CRIT</span>
                    <span className="text-amber-300 font-bold">{critPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[#A9B8CC] block">REPS</span>
                    <span className="text-emerald-300 font-bold">{stats.totalVerifiedReps}</span>
                  </div>
                </div>
              </div>

              {/* Bodyweight Techniques Preview */}
              <div className="space-y-1.5 pt-2 border-t border-[#1677FF]/25">
                <span className="text-[10px] uppercase tracking-wider text-[#A9B8CC] font-mono block">
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
                            ? 'bg-[#102440] border-[#00D9FF]/60 text-white'
                            : 'bg-[#061225] border-[#1677FF]/25 text-[#A9B8CC]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {badge.icon}
                          <div className="min-w-0">
                            <span className="font-['Cinzel'] font-bold text-[11px] text-white block truncate">{tech.name}</span>
                            <span className="text-[10px] text-[#A9B8CC] block truncate">
                              {tech.limb === 'hands' ? 'Hands' : tech.limb === 'legs' ? 'Legs' : 'Hands & Legs'} · Built from {tech.exerciseInspiration}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWeaknessMatch && (
                            <span className="text-[9px] font-mono font-black text-[#00D9FF] animate-pulse">
                              WEAKNESS!
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#A9B8CC]">
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
              <span className="text-xs font-semibold uppercase tracking-wider text-[#00D9FF] mb-2 block">
                Combat Buffs ({buffs.filter(b => b.active).length} Active)
              </span>
              <div className="space-y-2">
                {buffs.map(b => (
                  <div
                    key={b.id}
                    onClick={() => activateBuff(b.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                      b.active
                        ? 'bg-[#1677FF]/20 border-[#00D9FF]/60 text-white shadow-[0_0_12px_rgba(0,217,255,0.2)]'
                        : 'bg-[#0A1930] border-[#1677FF]/25 text-[#A9B8CC] hover:text-white hover:border-[#00D9FF]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${b.active ? 'text-[#00D9FF]' : 'text-[#A9B8CC]'}`} />
                      <span className="font-semibold">{b.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#00D9FF]">
                      +{b.effectValue}% {b.effectType.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {battleError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/45 text-xs text-rose-200 text-center">
                {battleError}
              </div>
            )}

            {/* Launch Combat Button */}
            <button
              onClick={handleStartFight}
              disabled={isStartingBattle}
              className="w-full py-4 font-black font-['Cinzel'] tracking-widest text-sm rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_20px_rgba(22,119,255,0.4)] hover:shadow-[0_0_28px_rgba(0,217,255,0.5)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isStartingBattle ? 'ENTERING COMBAT ARENA...' : 'ENGAGE IN STRATEGIC COMBAT'}
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE STRATEGIC COMBAT ARENA */}
      {battleState === 'FIGHTING' && (
        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/40 rounded-2xl p-5 sm:p-7 shadow-[0_12px_32px_rgba(2,8,20,0.65)] space-y-6 relative overflow-hidden">
          {/* Phase Transition Banner Overlay */}
          {phaseAnnouncement && (
            <div className="absolute top-4 inset-x-4 z-40 bg-gradient-to-r from-[#1677FF] via-rose-600 to-[#00D9FF] text-white p-3 rounded-xl text-center font-['Cinzel'] font-black text-sm tracking-widest shadow-2xl border border-[#00D9FF] animate-in zoom-in-95">
              {phaseAnnouncement}
            </div>
          )}

          {/* TELEGRAPHED BOSS ATTACK WARNING BANNER */}
          {isTelegraphWarningActive && boss.signatureAttack && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/90 via-[#2a0b16] to-rose-950/90 border-2 border-rose-500 shadow-2xl animate-pulse space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                  <span className="font-['Cinzel'] font-black text-sm text-white tracking-wide">
                    ⚠️ TELEGRAPHED ATTACK WARNING: {boss.signatureAttack.name.toUpperCase()}!
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-rose-900 text-rose-200 font-black border border-rose-400">
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
            <div className="p-5 rounded-2xl bg-[#0A1930] border border-[#1677FF]/35 space-y-3 relative">
              {/* Floating Boss Damage over Player */}
              {lastBossDamage !== null && (
                <div className="absolute top-2 right-4 text-2xl font-black font-mono text-rose-400 animate-bounce">
                  {lastBossDamage === 0 ? 'EVADED! 0 DMG' : `-${lastBossDamage}`}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={getHeroArtwork(selectedHeroId, user?.characterClass)}
                    alt={`${user?.characterClass || 'Warrior'} Champion`}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover object-top border border-[#00D9FF]/60"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">
                      {user?.characterName || user?.username || 'Hero of Aetheria'}
                    </h4>
                    <p className="text-xs text-[#00D9FF] font-mono">
                      Hands &amp; Legs · {heroDef.bodyweightDisciplines.conditioningStyle}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#061225] border border-[#1677FF]/40 flex items-center justify-center shrink-0 text-[#00D9FF]">
                  <Dumbbell className="w-5 h-5" />
                </div>
              </div>

              {/* Player Vitality HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#A9B8CC] mb-1 font-mono">
                  <span>Player Vitality</span>
                  <span className="font-bold text-emerald-400">{playerCurrentHp} / {playerMaxHp} HP</span>
                </div>
                <div className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1677FF]/25">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerCurrentHp / playerMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Player Stamina Bar (Crucial strategic resource!) */}
              <div>
                <div className="flex justify-between text-xs text-[#A9B8CC] mb-1 font-mono">
                  <span className="flex items-center gap-1 text-[#00D9FF]">
                    <Zap className="w-3.5 h-3.5" /> Stamina
                  </span>
                  <span className="font-bold text-[#00D9FF]">{playerStamina} / {playerMaxStamina} STAM</span>
                </div>
                <div className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1677FF]/25">
                  <div
                    className="bg-gradient-to-r from-[#1677FF] to-[#00D9FF] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerStamina / playerMaxStamina) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#A9B8CC]/70 font-mono mt-0.5 block">
                  +15 passive / +25 standard attack
                </span>
              </div>
            </div>

            {/* BOSS ENCOUNTER HUD */}
            <div className={`p-5 rounded-2xl bg-[#0A1930] border border-rose-500/40 space-y-3 relative ${isAnimating ? 'animate-pulse' : ''}`}>
              {/* Floating Damage Feedback over Boss */}
              {lastDamageDealt !== null && (
                <div className={`absolute top-2 right-4 text-2xl font-black font-mono animate-bounce ${
                  feedbackType === 'weakness'
                    ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                    : feedbackType === 'crit'
                    ? 'text-yellow-400 drop-shadow'
                    : 'text-[#00D9FF]'
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
                    className="w-14 h-14 rounded-xl object-cover border border-rose-500"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">{boss.name}</h4>
                    <p className="text-xs text-rose-400 font-mono">{boss.title}</p>
                  </div>
                </div>

                {/* Boss Current Phase Indicator */}
                <div className="text-right">
                  <span className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded border border-[#1677FF]/45 bg-[#061225] ${currentPhaseInfo.auraColor}`}>
                    PHASE {currentPhaseNumber}: {currentPhaseInfo.name}
                  </span>
                  <span className="text-[10px] text-[#A9B8CC] block mt-0.5 font-mono">
                    ATK x{currentPhaseInfo.attackMultiplier}
                  </span>
                </div>
              </div>

              {/* Boss HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#A9B8CC] mb-1 font-mono">
                  <span>Void Corruption Health</span>
                  <span className="font-bold text-rose-400">{boss.health} / {boss.maxHealth} HP</span>
                </div>
                <div className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1677FF]/25">
                  <div
                    className="bg-gradient-to-r from-rose-600 to-amber-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Boss Active Weakness / Resistances Strip */}
              <div className="flex items-center gap-2 pt-1">
                {boss.weakness && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    boss.weakness.discovered
                      ? 'bg-[#061225] border-[#00D9FF]/60 text-[#00D9FF]'
                      : 'bg-[#061225] border-[#1677FF]/25 text-[#A9B8CC]/70'
                  }`}>
                    {boss.weakness.discovered ? (
                      <>
                        {bossWeaknessBadge?.icon}
                        <span>Weak: {boss.weakness.element} ({boss.weakness.damageMultiplier}x)</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3 h-3 text-[#A9B8CC]/70" />
                        <span>Weakness: ???</span>
                      </>
                    )}
                  </span>
                )}

                {boss.resistance && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-[#061225] border-[#1677FF]/35 text-[#A9B8CC] flex items-center gap-1">
                    {bossResistanceBadge?.icon}
                    <span>Resist: {boss.resistance.element}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. FOUR STRATEGIC BODYWEIGHT COMBAT CHOICES */}
          <div className="p-5 rounded-2xl bg-[#0A1930] border border-[#1677FF]/30 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1677FF]/25 pb-2">
              <span className="text-xs uppercase font-['Cinzel'] font-black tracking-widest text-white flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-[#00D9FF]" />
                Hands &amp; Legs Combat Actions (Turn {turnCount})
              </span>
              <span className="text-xs font-mono text-[#00D9FF] font-bold">
                Stamina: {playerStamina} / 100
              </span>
            </div>

            {/* 4 Main Action Pillars: Strike / Technique / Brace / Footwork Evade */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* ACTION 1: HANDS & LEGS STRIKE */}
              <button
                onClick={() => executeCombatAction('attack')}
                disabled={isAnimating}
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#102440] to-[#061225] hover:from-[#16325C] hover:to-[#0A1930] border border-[#1677FF]/45 hover:border-[#00D9FF] hover:shadow-[0_0_16px_rgba(0,217,255,0.2)] text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Hand className="w-4 h-4 text-[#00D9FF] group-hover:scale-110 transition-transform" />
                    STRIKE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700">
                    +25 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A9B8CC]">
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
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#102440] to-[#061225] hover:from-[#16325C] hover:to-[#0A1930] border border-[#1677FF]/60 hover:border-[#00D9FF] hover:shadow-[0_0_16px_rgba(22,119,255,0.3)] text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#1677FF] group-hover:scale-110 transition-transform" />
                    TECHNIQUE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#00D9FF] bg-[#061225] px-1.5 py-0.2 rounded border border-[#1677FF]/50">
                    20-35 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A9B8CC]">
                  Unleash a trained Hand or Leg strike to exploit boss weaknesses.
                </p>
              </button>

              {/* ACTION 3: DEFEND / BRACE */}
              <button
                onClick={() => executeCombatAction('defend')}
                disabled={isAnimating || playerStamina < 15}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'defend'
                    ? 'bg-gradient-to-b from-[#1677FF]/40 to-[#0A1930] border-[#00D9FF] ring-2 ring-[#00D9FF]/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#102440] to-[#061225] hover:from-[#16325C] hover:to-[#0A1930] border-[#00D9FF]/40 hover:border-[#00D9FF]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#00D9FF] group-hover:scale-110 transition-transform" />
                    BRACE GUARD
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#00D9FF] bg-[#061225] px-1.5 py-0.2 rounded border border-[#00D9FF]/40">
                    15 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A9B8CC]">
                  Root your stance with forearms &amp; core. Reduces damage by 80% against Ground Slams.
                </p>
              </button>

              {/* ACTION 4: FOOTWORK DODGE */}
              <button
                onClick={() => executeCombatAction('dodge')}
                disabled={isAnimating || playerStamina < 20}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'dodge'
                    ? 'bg-gradient-to-b from-emerald-900 to-teal-950 border-emerald-400 ring-2 ring-emerald-400/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#0f2824] to-[#061225] border-emerald-700/80 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-emerald-200 flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    FOOTWORK EVADE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700">
                    20 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A9B8CC]">
                  Agile leg step &amp; evasive roll. Avoids 100% damage from telegraphed ambushes.
                </p>
              </button>
            </div>

            {/* HANDS & LEGS BODYWEIGHT TECHNIQUE SELECTOR STRIP */}
            <div className="pt-3 border-t border-[#1677FF]/25">
              <span className="text-[10px] uppercase tracking-widest font-black text-[#00D9FF] font-['Cinzel'] block mb-2">
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
                            ? 'bg-gradient-to-r from-[#16325C] to-[#102440] border-[#00D9FF] ring-2 ring-[#00D9FF]/50 hover:scale-[1.02] cursor-pointer shadow-[0_0_16px_rgba(0,217,255,0.25)]'
                            : 'bg-gradient-to-r from-[#102440] to-[#061225] border-[#1677FF]/40 hover:border-[#00D9FF]/60 hover:scale-[1.01] cursor-pointer'
                          : 'bg-[#061225]/60 border-[#1677FF]/20 text-[#A9B8CC]/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-['Cinzel'] font-black text-xs text-white truncate flex items-center gap-1.5">
                          {tech.limb === 'legs' ? (
                            <Footprints className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
                          ) : (
                            <Hand className="w-3.5 h-3.5 text-[#1677FF] shrink-0" />
                          )}
                          {tech.name}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isWeaknessMatch
                            ? 'bg-[#00D9FF] text-[#061225] animate-pulse'
                            : 'bg-[#0A1930] text-[#A9B8CC] border border-[#1677FF]/30'
                        }`}>
                          {cost} STAM
                        </span>
                      </div>

                      <p className="text-[11px] text-[#A9B8CC] line-clamp-1">{tech.combatEffect}</p>

                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                        <span className="text-[#A9B8CC]/80">
                          {tech.exerciseInspiration} · {badge.label}
                        </span>
                        {isWeaknessMatch && (
                          <span className="text-[#00D9FF] font-bold">1.8x - 2.0x BONUS!</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Combat Logs Console */}
          <div className="p-4 rounded-xl bg-[#061225] border border-[#1677FF]/30 text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto">
            {combatLogs.map((log, idx) => (
              <p
                key={idx}
                className={
                  idx === 0
                    ? 'text-[#00D9FF] font-bold border-l-2 border-[#00D9FF] pl-2'
                    : 'text-[#A9B8CC] pl-2'
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
        <div className="bg-[#102440]/90 backdrop-blur-md border border-[#00D9FF]/60 rounded-2xl p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(2,8,20,0.7)] animate-in zoom-in-95 space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1677FF]/20 text-[#00D9FF] flex items-center justify-center border border-[#00D9FF]/50 shadow-[0_0_20px_rgba(0,217,255,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00D9FF] font-['Cinzel'] block">
              Strategic Encounter Cleared
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              VICTORY! {boss.name.toUpperCase()} PURIFIED
            </h3>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-md mx-auto mt-1">
              Through strategic weakness exploitation and disciplined defenses, the Void corruption in {activeKingdom.name} has been banished!
            </p>
          </div>

          {/* Combat Analytics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto bg-[#0A1930] p-4 rounded-xl border border-[#1677FF]/30 text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#A9B8CC] uppercase block">Turns Taken</span>
              <span className="text-base font-bold text-white">{battleStats.turns}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase block">Weakness Hits</span>
              <span className="text-base font-bold text-amber-300">{battleStats.weaknessHits}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#00D9FF] uppercase block">Avoided / Guarded</span>
              <span className="text-base font-bold text-[#00D9FF]">{battleStats.attacksAvoided}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase block">Damage Dealt</span>
              <span className="text-base font-bold text-emerald-300">{battleStats.damageDealt}</span>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto bg-[#061225] p-3 rounded-xl border border-[#1677FF]/35 font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#A9B8CC] uppercase block">Player XP</span>
              <span className="text-lg font-bold text-[#00D9FF]">+{boss.rewardPlayerXp}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A9B8CC] uppercase block">Aether Pts</span>
              <span className="text-lg font-bold text-white">+60</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                resetBossBattle(activeKingdom.id);
                setBattleState('PREP');
                sound.playClick();
              }}
              className="px-6 py-2.5 rounded-xl bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/40 hover:border-[#00D9FF]/60 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Challenge Again
            </button>
            <button
              onClick={() => setActiveTab('storyline')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white font-['Cinzel'] font-bold text-xs shadow-[0_0_16px_rgba(22,119,255,0.35)] transition-all cursor-pointer"
            >
              Advance Realm Storyline
            </button>
          </div>
        </div>
      )}

      {/* 5. DEFEAT SCREEN WITH STRATEGIC HINTS */}
      {battleState === 'DEFEAT' && (
        <div className="bg-[#102440]/90 backdrop-blur-md border border-rose-500/50 rounded-2xl p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(2,8,20,0.7)] space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-500/50">
            <Skull className="w-7 h-7" />
          </div>

          <h3 className="text-2xl font-black font-['Cinzel'] text-rose-300">
            DEFEATED BY {boss.name.toUpperCase()}
          </h3>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-[#0A1930] border border-rose-500/35 text-xs text-[#A9B8CC] text-left space-y-2">
            <span className="font-bold text-[#00D9FF] font-['Cinzel'] block">
              Tactical Battle Debrief:
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-[#A9B8CC]">
              <li>
                <strong className="text-white">Heed Telegraphed Warnings:</strong> Use <strong className="text-white">DEFEND</strong> against slams or <strong className="text-white">DODGE</strong> against ambushes when warnings appear.
              </li>
              <li>
                <strong className="text-white">Exploit Weakness:</strong> {boss.name} is vulnerable to <strong className="text-white">{boss.weakness?.element}</strong> for massive bonus damage.
              </li>
              <li>
                <strong className="text-white">Manage Stamina:</strong> Don't deplete all stamina on abilities; standard attacks restore +25 STAM.
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white text-xs font-bold shadow-[0_0_16px_rgba(22,119,255,0.35)] transition-all cursor-pointer"
            >
              Retry Encounter
            </button>
            <button
              onClick={() => setActiveTab('fitness')}
              className="px-6 py-2.5 rounded-xl bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/40 hover:border-[#00D9FF]/60 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Train Bodyweight Strength
            </button>
          </div>
        </div>
      )}

      {/* 6. WEAKNESS DISCOVERY & CLUE MODAL */}
      {showLoreClueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061225]/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#102440] via-[#0A1930] to-[#061225] border border-[#00D9FF]/50 p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1677FF]/30 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#00D9FF]" />
                <h3 className="font-['Cinzel'] font-black text-lg text-white">
                  ARCHIVAL WEAKNESS CLUE
                </h3>
              </div>
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="text-[#A9B8CC] hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ancient Clue Dossier */}
            <div className="p-4 rounded-xl bg-[#061225] border border-[#1677FF]/40 space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#00D9FF] font-bold block">
                Storyline Intel · {boss.name}
              </span>
              <p className="text-xs text-[#A9B8CC] leading-relaxed italic border-l-2 border-[#00D9FF] pl-3">
                "{boss.weakness?.clue}"
              </p>
            </div>

            {/* Discovery State & Action */}
            <div className="p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#A9B8CC] font-mono block">Bestiary Status:</span>
                <span className={`text-xs font-bold ${boss.weakness?.discovered ? 'text-emerald-400' : 'text-[#00D9FF]'}`}>
                  {boss.weakness?.discovered
                    ? `Discovered: ${boss.weakness.element} Element (${boss.weakness.damageMultiplier}x)`
                    : 'Hidden in Bestiary'}
                </span>
              </div>

              {!boss.weakness?.discovered ? (
                <button
                  onClick={handleUnlockWeakness}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white font-['Cinzel'] font-black text-xs shadow-[0_0_16px_rgba(22,119,255,0.4)] transition-all hover:scale-105 cursor-pointer"
                >
                  DECRYPT WEAKNESS
                </button>
              ) : (
                <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Ready for Combat
                </span>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="px-6 py-2 rounded-xl bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/40 hover:border-[#00D9FF]/60 text-xs font-semibold text-white transition-all cursor-pointer"
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
