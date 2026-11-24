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
    auraColor: currentPhaseNumber === 3 ? 'text-[#FB7185]' : currentPhaseNumber === 2 ? 'text-[#FBBF24]' : 'text-[#D6A84B]',
  };

  // Helper for elemental icon
  const getElementBadge = (element: ElementType) => {
    switch (element) {
      case 'Fire':
        return { label: 'Fire', color: 'bg-rose-950 border-[#FB7185] text-[#FDA4AF]', icon: <Flame className="w-3.5 h-3.5 text-[#FB7185]" /> };
      case 'Water':
        return { label: 'Water', color: 'bg-sky-950 border-[#38BDF8] text-[#7DD3FC]', icon: <Droplets className="w-3.5 h-3.5 text-[#38BDF8]" /> };
      case 'Ice':
        return { label: 'Ice', color: 'bg-sky-950 border-[#38BDF8] text-sky-200', icon: <Wind className="w-3.5 h-3.5 text-[#38BDF8]" /> };
      case 'Lightning':
        return { label: 'Lightning', color: 'bg-amber-950 border-[#FBBF24] text-[#FDE68A]', icon: <Zap className="w-3.5 h-3.5 text-[#FBBF24]" /> };
      case 'Light':
        return { label: 'Light', color: 'bg-amber-950 border-[#D6A84B] text-[#FDE68A]', icon: <Sun className="w-3.5 h-3.5 text-[#D6A84B]" /> };
      case 'Void':
        return { label: 'Void', color: 'bg-[#090910] border-[#8B5CF6]/60 text-[#C4B5FD]', icon: <Moon className="w-3.5 h-3.5 text-[#8B5CF6]" /> };
      case 'Nature':
        return { label: 'Nature', color: 'bg-emerald-950 border-[#34D399] text-[#6EE7B7]', icon: <Sparkles className="w-3.5 h-3.5 text-[#34D399]" /> };
      case 'Earth':
        return { label: 'Earth', color: 'bg-amber-950 border-amber-700 text-amber-200', icon: <Dumbbell className="w-3.5 h-3.5 text-amber-500" /> };
      case 'Wind':
        return { label: 'Wind', color: 'bg-emerald-950 border-emerald-400 text-emerald-200', icon: <Wind className="w-3.5 h-3.5 text-[#34D399]" /> };
      case 'Shadow':
        return { label: 'Shadow', color: 'bg-[#0E0E17] border-slate-500 text-slate-300', icon: <Moon className="w-3.5 h-3.5 text-[#A1A1B8]" /> };
      case 'Arcane':
        return { label: 'Arcane', color: 'bg-[#0E0E17] border-[#8B5CF6] text-[#C4B5FD]', icon: <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" /> };
      case 'Cosmic':
        return { label: 'Cosmic', color: 'bg-[#090910] border-[#38BDF8] text-[#7DD3FC]', icon: <CloudLightning className="w-3.5 h-3.5 text-[#38BDF8]" /> };
      default:
        return { label: 'Physical', color: 'bg-[#0E0E17] border-slate-600 text-slate-300', icon: <Hand className="w-3.5 h-3.5 text-[#A1A1B8]" /> };
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
      colors: ['#D6A84B', '#FB7185', '#8B5CF6'],
    });
  };

  const bossWeaknessBadge = boss.weakness ? getElementBadge(boss.weakness.element) : null;
  const bossResistanceBadge = boss.resistance ? getElementBadge(boss.resistance.element) : null;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Mode Switcher: Weekly Community Raid vs Kingdom Story Bosses */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#141420]/90 backdrop-blur-md border border-[#FB7185]/30 p-3 shadow-[0_12px_32px_rgba(9,9,16,0.65)]">
        <div className="flex items-center gap-2 px-2">
          <Dumbbell className="w-4 h-4 text-[#FB7185]" />
          <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#FB7185]">
            Boss Encounters
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Boss battle modes"
          className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0E0E17] border border-white/10"
        >
          <button
            type="button"
            role="tab"
            aria-selected={bossMode === 'weekly'}
            onClick={() => setBossMode('weekly')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              bossMode === 'weekly'
                ? 'bg-gradient-to-r from-[#E11D48] to-[#FB7185] text-white border border-[#FB7185]/45 shadow-[0_0_16px_rgba(251,113,133,0.35)]'
                : 'text-[#A1A1B8] hover:text-white hover:bg-[#141420] border border-transparent'
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
                ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white border border-[#8B5CF6]/45 shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                : 'text-[#A1A1B8] hover:text-white hover:bg-[#141420] border border-transparent'
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
      <div className="rounded-2xl bg-gradient-to-br from-[#090910] via-[#141420] to-[#1B1B2B] border border-[#FB7185]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(9,9,16,0.7)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/40 px-2.5 py-0.5 rounded">
                Strategic Kingdom Encounters
              </span>
              <span className="text-xs text-[#D6A84B] font-semibold">{activeKingdom.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              KINGDOM BOSS ENCOUNTERS
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl mt-1">
              Exploit elemental weaknesses, manage stamina, respond to telegraphed attack warnings, and weather 3 boss phases.
            </p>
          </div>

          {/* Kingdom Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090910] rounded-xl border border-white/15 overflow-x-auto max-w-full">
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
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] cursor-pointer'
                    : k.unlocked
                    ? 'text-[#A1A1B8] hover:text-white hover:bg-[#141420] cursor-pointer'
                    : 'text-[#A1A1B8]/40 cursor-not-allowed'
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
          <div className="lg:col-span-7 bg-[#141420]/90 backdrop-blur-md border border-[#FB7185]/30 rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(9,9,16,0.7)]">
            {/* Header Art & Phase Indicator */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={resolveAssetUrl(boss.image)}
                alt={boss.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141420] via-[#090910]/45 to-transparent" />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-[#0E0E17]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#D6A84B] border border-[#D6A84B]/45 shadow">
                  {boss.difficulty} Difficulty
                </span>
                <span className="bg-[#FB7185]/15 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#FDA4AF] border border-[#FB7185]/45 shadow">
                  3 Boss Phases
                </span>
              </div>

              {/* Quick Inspect Weakness Clue Button */}
              <button
                onClick={handleInspectClue}
                className="absolute top-4 right-4 bg-[#0E0E17]/90 hover:bg-[#1B1B2B] border border-[#D6A84B]/50 hover:border-[#D6A84B] text-white text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all hover:scale-105 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D6A84B]" />
                <span>Weakness Dossier</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-['Cinzel'] font-black text-2xl text-white">{boss.name}</h3>
                <p className="text-xs text-[#FB7185] font-medium">{boss.title}</p>
              </div>

              <p className="text-xs text-[#A1A1B8] leading-relaxed italic border-l-2 border-[#FB7185] pl-3">
                "{boss.lore}"
              </p>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-3 bg-[#0E0E17] p-3 rounded-xl border border-white/10 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-[10px] text-[#A1A1B8] uppercase block">Max Health</span>
                  <span className="text-[#FB7185] font-bold">{boss.maxHealth} HP</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A1A1B8] uppercase block">Base Attack</span>
                  <span className="text-[#FBBF24] font-bold">{boss.attack} ATK</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A1A1B8] uppercase block">Armor Def</span>
                  <span className="text-[#38BDF8] font-bold">{boss.defense} DEF</span>
                </div>
              </div>

              {/* TACTICAL PROFILE: WEAKNESS, RESISTANCE & MECHANICS */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <span className="text-xs font-['Cinzel'] font-bold text-white uppercase tracking-wider block">
                  Tactical Reconnaissance Profile
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Elemental Weakness */}
                  <div className="p-3 rounded-xl bg-[#0E0E17] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#A1A1B8] font-mono">
                        Elemental Weakness
                      </span>
                      {boss.weakness?.discovered ? (
                        <span className="text-[9px] font-mono font-bold text-[#34D399] px-1.5 py-0.5 rounded bg-[#34D399]/10 border border-[#34D399]/35">
                          DISCOVERED
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-[#FBBF24] px-1.5 py-0.5 rounded bg-[#FBBF24]/10 border border-[#FBBF24]/35">
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
                        <p className="text-[11px] text-[#A1A1B8] leading-tight">
                          {boss.weakness.description}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[#A1A1B8] font-mono italic text-[11px] block">
                          ??? [Undiscovered Elemental Weakness]
                        </span>
                        <button
                          onClick={handleInspectClue}
                          className="text-[10px] font-bold text-[#D6A84B] hover:text-white underline block cursor-pointer"
                        >
                          Consult Archives to Reveal Clue ➔
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resistance */}
                  <div className="p-3 rounded-xl bg-[#0E0E17] border border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#A1A1B8] font-mono block">
                      Damage Resistance
                    </span>
                    <div className="flex items-center gap-1.5 mb-1">
                      {bossResistanceBadge?.icon}
                      <span className="font-bold text-white font-['Cinzel'] text-xs">
                        {boss.resistance?.element} Element (-{boss.resistance?.damageReductionPercent}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1B8] leading-tight">
                      {boss.resistance?.description}
                    </p>
                  </div>
                </div>

                {/* Signature Attack Warning Info */}
                {boss.signatureAttack && (
                  <div className="p-3 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/35 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#FDA4AF] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#FB7185]" />
                        Telegraphed Signature: {boss.signatureAttack.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#FB7185]/20 text-[#FDA4AF] font-bold">
                        Counter with {boss.signatureAttack.defenseResponse.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#A1A1B8] text-[11px] leading-tight">
                      {boss.signatureAttack.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Prep & Champion Bodyweight Conditioning (5 Cols) */}
          <div className="lg:col-span-5 bg-[#141420]/90 backdrop-blur-md border border-[#8B5CF6]/30 rounded-2xl p-6 shadow-[0_12px_32px_rgba(9,9,16,0.7)] space-y-5">
            <h4 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#D6A84B]" />
              HANDS &amp; LEGS BODYWEIGHT READINESS
            </h4>

            {/* Bodyweight Conditioning Profile */}
            <div className="p-4 rounded-xl bg-[#0E0E17] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1B8]">Combat Discipline</span>
                <span className="text-[10px] uppercase font-bold text-[#D6A84B] bg-[#090910] px-2 py-0.5 rounded border border-[#D6A84B]/35">
                  Hands &amp; Legs Only · {stats.aetherRank}
                </span>
              </div>

              <div>
                <h5 className="font-['Cinzel'] font-black text-base text-white">
                  {heroDef.bodyweightDisciplines.conditioningStyle}
                </h5>
                <p className="text-xs text-[#A1A1B8] mt-0.5">
                  Bodyweight training builds strength through exercise — every strike comes from your hands and legs.
                </p>

                <div className="grid grid-cols-1 gap-1.5 mt-2.5 text-[11px] bg-[#090910] border border-white/10 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Hand className="w-3.5 h-3.5 text-[#FB7185] shrink-0" />
                    <span className="text-[#A1A1B8]">Hands:</span>
                    <span className="text-white font-medium">{heroDef.bodyweightDisciplines.handsFocus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Footprints className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                    <span className="text-[#A1A1B8]">Legs:</span>
                    <span className="text-white font-medium">{heroDef.bodyweightDisciplines.legsFocus}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mt-2 bg-[#090910] border border-white/10 rounded-lg p-2 text-[10px] font-mono text-center tabular-nums">
                  <div>
                    <span className="text-[#A1A1B8] block">STRIKE</span>
                    <span className="text-[#FB7185] font-bold">+{rawAtk}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1B8] block">GUARD</span>
                    <span className="text-[#38BDF8] font-bold">+{rawDef}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1B8] block">CRIT</span>
                    <span className="text-[#FBBF24] font-bold">{critPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1B8] block">REPS</span>
                    <span className="text-[#34D399] font-bold">{stats.totalVerifiedReps}</span>
                  </div>
                </div>
              </div>

              {/* Bodyweight Techniques Preview */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1B8] font-mono block">
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
                            ? 'bg-[#141420] border-[#D6A84B]/60 text-white'
                            : 'bg-[#090910] border-white/10 text-[#A1A1B8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {badge.icon}
                          <div className="min-w-0">
                            <span className="font-['Cinzel'] font-bold text-[11px] text-white block truncate">{tech.name}</span>
                            <span className="text-[10px] text-[#A1A1B8] block truncate">
                              {tech.limb === 'hands' ? 'Hands' : tech.limb === 'legs' ? 'Legs' : 'Hands & Legs'} · Built from {tech.exerciseInspiration}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWeaknessMatch && (
                            <span className="text-[9px] font-mono font-black text-[#FBBF24] animate-pulse">
                              WEAKNESS!
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#A1A1B8]">
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
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5CF6] mb-2 block">
                Combat Buffs ({buffs.filter(b => b.active).length} Active)
              </span>
              <div className="space-y-2">
                {buffs.map(b => (
                  <div
                    key={b.id}
                    onClick={() => activateBuff(b.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                      b.active
                        ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/60 text-white shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                        : 'bg-[#0E0E17] border-white/10 text-[#A1A1B8] hover:text-white hover:border-[#8B5CF6]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${b.active ? 'text-[#D6A84B]' : 'text-[#A1A1B8]'}`} />
                      <span className="font-semibold">{b.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#FBBF24]">
                      +{b.effectValue}% {b.effectType.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {battleError && (
              <div className="p-2.5 rounded-xl bg-[#FB7185]/15 border border-[#FB7185]/45 text-xs text-[#FDA4AF] text-center">
                {battleError}
              </div>
            )}

            {/* Launch Combat Button */}
            <button
              onClick={handleStartFight}
              disabled={isStartingBattle}
              className="w-full py-4 font-black font-['Cinzel'] tracking-widest text-sm rounded-xl bg-gradient-to-r from-[#E11D48] to-[#FB7185] hover:from-[#F43F5E] hover:to-[#FDA4AF] text-white shadow-[0_0_20px_rgba(251,113,133,0.4)] hover:shadow-[0_0_28px_rgba(251,113,133,0.55)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isStartingBattle ? 'ENTERING COMBAT ARENA...' : 'ENGAGE IN STRATEGIC COMBAT'}
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE STRATEGIC COMBAT ARENA */}
      {battleState === 'FIGHTING' && (
        <div className="bg-[#141420]/90 backdrop-blur-md border border-[#FB7185]/35 rounded-2xl p-5 sm:p-7 shadow-[0_12px_32px_rgba(9,9,16,0.7)] space-y-6 relative overflow-hidden">
          {/* Phase Transition Banner Overlay */}
          {phaseAnnouncement && (
            <div className="absolute top-4 inset-x-4 z-40 bg-gradient-to-r from-[#6D28D9] via-[#E11D48] to-[#D6A84B] text-white p-3 rounded-xl text-center font-['Cinzel'] font-black text-sm tracking-widest shadow-2xl border border-[#D6A84B] animate-in zoom-in-95">
              {phaseAnnouncement}
            </div>
          )}

          {/* TELEGRAPHED BOSS ATTACK WARNING BANNER */}
          {isTelegraphWarningActive && boss.signatureAttack && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/90 via-[#2a0b16] to-rose-950/90 border-2 border-[#FB7185] shadow-2xl animate-pulse space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FB7185] animate-bounce" />
                  <span className="font-['Cinzel'] font-black text-sm text-white tracking-wide">
                    ⚠️ TELEGRAPHED ATTACK WARNING: {boss.signatureAttack.name.toUpperCase()}!
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-rose-900 text-[#FDA4AF] font-black border border-[#FB7185]">
                  RECOMMENDED: {boss.signatureAttack.defenseResponse.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-[#FDA4AF]/90">
                {boss.signatureAttack.warningText}
              </p>
            </div>
          )}

          {/* Combatants Dual Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* PLAYER HERO HUD */}
            <div className="p-5 rounded-2xl bg-[#0E0E17] border border-[#8B5CF6]/35 space-y-3 relative">
              {/* Floating Boss Damage over Player */}
              {lastBossDamage !== null && (
                <div className="absolute top-2 right-4 text-2xl font-black font-mono text-[#FB7185] animate-bounce">
                  {lastBossDamage === 0 ? 'EVADED! 0 DMG' : `-${lastBossDamage}`}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={getHeroArtwork(selectedHeroId, user?.characterClass)}
                    alt={`${user?.characterClass || 'Warrior'} Champion`}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover object-top border border-[#D6A84B]/60"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">
                      {user?.characterName || user?.username || 'Hero of Aetheria'}
                    </h4>
                    <p className="text-xs text-[#D6A84B] font-mono">
                      Hands &amp; Legs · {heroDef.bodyweightDisciplines.conditioningStyle}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#090910] border border-[#8B5CF6]/40 flex items-center justify-center shrink-0 text-[#8B5CF6]">
                  <Dumbbell className="w-5 h-5" />
                </div>
              </div>

              {/* Player Vitality HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#A1A1B8] mb-1 font-mono tabular-nums">
                  <span>Player Vitality</span>
                  <span className="font-bold text-[#34D399]">{playerCurrentHp} / {playerMaxHp} HP</span>
                </div>
                <div className="w-full bg-[#090910] h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[#34D399] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerCurrentHp / playerMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Player Stamina Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#A1A1B8] mb-1 font-mono tabular-nums">
                  <span className="flex items-center gap-1 text-[#38BDF8]">
                    <Zap className="w-3.5 h-3.5" /> Stamina
                  </span>
                  <span className="font-bold text-[#38BDF8]">{playerStamina} / {playerMaxStamina} STAM</span>
                </div>
                <div className="w-full bg-[#090910] h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-[#6D28D9] to-[#38BDF8] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerStamina / playerMaxStamina) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#A1A1B8]/70 font-mono mt-0.5 block">
                  +15 passive / +25 standard attack
                </span>
              </div>
            </div>

            {/* BOSS ENCOUNTER HUD */}
            <div className={`p-5 rounded-2xl bg-[#0E0E17] border border-[#FB7185]/40 space-y-3 relative ${isAnimating ? 'animate-pulse' : ''}`}>
              {/* Floating Damage Feedback over Boss */}
              {lastDamageDealt !== null && (
                <div className={`absolute top-2 right-4 text-2xl font-black font-mono animate-bounce ${
                  feedbackType === 'weakness'
                    ? 'text-[#FBBF24] drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                    : feedbackType === 'crit'
                    ? 'text-[#D6A84B] drop-shadow'
                    : 'text-[#FB7185]'
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
                    className="w-14 h-14 rounded-xl object-cover border border-[#FB7185]"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">{boss.name}</h4>
                    <p className="text-xs text-[#FB7185] font-mono">{boss.title}</p>
                  </div>
                </div>

                {/* Boss Current Phase Indicator */}
                <div className="text-right">
                  <span className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded border border-white/15 bg-[#090910] ${currentPhaseInfo.auraColor}`}>
                    PHASE {currentPhaseNumber}: {currentPhaseInfo.name}
                  </span>
                  <span className="text-[10px] text-[#A1A1B8] block mt-0.5 font-mono">
                    ATK x{currentPhaseInfo.attackMultiplier}
                  </span>
                </div>
              </div>

              {/* Boss HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#A1A1B8] mb-1 font-mono tabular-nums">
                  <span>Void Corruption Health</span>
                  <span className="font-bold text-[#FB7185]">{boss.health} / {boss.maxHealth} HP</span>
                </div>
                <div className="w-full bg-[#090910] h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-[#E11D48] to-[#FBBF24] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Boss Active Weakness / Resistances Strip */}
              <div className="flex items-center gap-2 pt-1">
                {boss.weakness && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    boss.weakness.discovered
                      ? 'bg-[#090910] border-[#D6A84B]/60 text-[#D6A84B]'
                      : 'bg-[#090910] border-white/15 text-[#A1A1B8]/70'
                  }`}>
                    {boss.weakness.discovered ? (
                      <>
                        {bossWeaknessBadge?.icon}
                        <span>Weak: {boss.weakness.element} ({boss.weakness.damageMultiplier}x)</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3 h-3 text-[#A1A1B8]/70" />
                        <span>Weakness: ???</span>
                      </>
                    )}
                  </span>
                )}

                {boss.resistance && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-[#090910] border-white/15 text-[#A1A1B8] flex items-center gap-1">
                    {bossResistanceBadge?.icon}
                    <span>Resist: {boss.resistance.element}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. FOUR STRATEGIC BODYWEIGHT COMBAT CHOICES */}
          <div className="p-5 rounded-2xl bg-[#0E0E17] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs uppercase font-['Cinzel'] font-black tracking-widest text-white flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-[#FB7185]" />
                Hands &amp; Legs Combat Actions (Turn {turnCount})
              </span>
              <span className="text-xs font-mono text-[#38BDF8] font-bold tabular-nums">
                Stamina: {playerStamina} / 100
              </span>
            </div>

            {/* 4 Main Action Pillars: Strike / Technique / Brace / Footwork Evade */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* ACTION 1: HANDS & LEGS STRIKE */}
              <button
                onClick={() => executeCombatAction('attack')}
                disabled={isAnimating}
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#141420] to-[#090910] hover:from-[#1B1B2B] hover:to-[#0E0E17] border border-[#FB7185]/45 hover:border-[#FB7185] hover:shadow-[0_0_16px_rgba(251,113,133,0.2)] text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Hand className="w-4 h-4 text-[#FB7185] group-hover:scale-110 transition-transform" />
                    STRIKE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#34D399] bg-[#34D399]/10 px-1.5 py-0.5 rounded border border-[#34D399]/35">
                    +25 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1B8]">
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
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#141420] to-[#090910] hover:from-[#1B1B2B] hover:to-[#0E0E17] border border-[#8B5CF6]/55 hover:border-[#8B5CF6] hover:shadow-[0_0_16px_rgba(139,92,246,0.3)] text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#8B5CF6] group-hover:scale-110 transition-transform" />
                    TECHNIQUE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#C4B5FD] bg-[#090910] px-1.5 py-0.5 rounded border border-[#8B5CF6]/50">
                    20-35 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1B8]">
                  Unleash a trained Hand or Leg strike to exploit boss weaknesses.
                </p>
              </button>

              {/* ACTION 3: DEFEND / BRACE */}
              <button
                onClick={() => executeCombatAction('defend')}
                disabled={isAnimating || playerStamina < 15}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'defend'
                    ? 'bg-gradient-to-b from-[#38BDF8]/30 to-[#0E0E17] border-[#38BDF8] ring-2 ring-[#38BDF8]/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#141420] to-[#090910] hover:from-[#1B1B2B] hover:to-[#0E0E17] border-[#38BDF8]/40 hover:border-[#38BDF8]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#38BDF8] group-hover:scale-110 transition-transform" />
                    BRACE GUARD
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#38BDF8] bg-[#090910] px-1.5 py-0.5 rounded border border-[#38BDF8]/40">
                    15 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1B8]">
                  Root your stance with forearms &amp; core. Reduces damage by 80% against Ground Slams.
                </p>
              </button>

              {/* ACTION 4: FOOTWORK DODGE */}
              <button
                onClick={() => executeCombatAction('dodge')}
                disabled={isAnimating || playerStamina < 20}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'dodge'
                    ? 'bg-gradient-to-b from-[#34D399]/25 to-[#0E0E17] border-[#34D399] ring-2 ring-[#34D399]/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#0E1E1A] to-[#090910] border-[#34D399]/40 hover:border-[#34D399]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-[#6EE7B7] flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-[#34D399] group-hover:scale-110 transition-transform" />
                    FOOTWORK EVADE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#34D399] bg-[#34D399]/10 px-1.5 py-0.5 rounded border border-[#34D399]/35">
                    20 STAM
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1B8]">
                  Agile leg step &amp; evasive roll. Avoids 100% damage from telegraphed ambushes.
                </p>
              </button>
            </div>

            {/* HANDS & LEGS BODYWEIGHT TECHNIQUE SELECTOR STRIP */}
            <div className="pt-3 border-t border-white/10">
              <span className="text-[10px] uppercase tracking-widest font-black text-[#D6A84B] font-['Cinzel'] block mb-2">
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
                            ? 'bg-gradient-to-r from-[#1B1B2B] to-[#141420] border-[#D6A84B] ring-2 ring-[#D6A84B]/50 hover:scale-[1.02] cursor-pointer shadow-[0_0_16px_rgba(214,168,75,0.25)]'
                            : 'bg-gradient-to-r from-[#141420] to-[#090910] border-white/15 hover:border-[#8B5CF6]/60 hover:scale-[1.01] cursor-pointer'
                          : 'bg-[#090910]/60 border-white/10 text-[#A1A1B8]/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-['Cinzel'] font-black text-xs text-white truncate flex items-center gap-1.5">
                          {tech.limb === 'legs' ? (
                            <Footprints className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                          ) : (
                            <Hand className="w-3.5 h-3.5 text-[#FB7185] shrink-0" />
                          )}
                          {tech.name}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isWeaknessMatch
                            ? 'bg-[#D6A84B] text-[#090910] animate-pulse'
                            : 'bg-[#0E0E17] text-[#A1A1B8] border border-white/15'
                        }`}>
                          {cost} STAM
                        </span>
                      </div>

                      <p className="text-[11px] text-[#A1A1B8] line-clamp-1">{tech.combatEffect}</p>

                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                        <span className="text-[#A1A1B8]/80">
                          {tech.exerciseInspiration} · {badge.label}
                        </span>
                        {isWeaknessMatch && (
                          <span className="text-[#FBBF24] font-bold">1.8x - 2.0x BONUS!</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Combat Logs Console */}
          <div className="p-4 rounded-xl bg-[#090910] border border-white/10 text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto">
            {combatLogs.map((log, idx) => (
              <p
                key={idx}
                className={
                  idx === 0
                    ? 'text-[#FBBF24] font-bold border-l-2 border-[#FBBF24] pl-2'
                    : 'text-[#A1A1B8] pl-2'
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
        <div className="bg-[#141420]/90 backdrop-blur-md border border-[#D6A84B]/60 rounded-2xl p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(9,9,16,0.75)] animate-in zoom-in-95 space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#D6A84B]/15 text-[#D6A84B] flex items-center justify-center border border-[#D6A84B]/50 shadow-[0_0_20px_rgba(214,168,75,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D6A84B] font-['Cinzel'] block">
              Strategic Encounter Cleared
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              VICTORY! {boss.name.toUpperCase()} PURIFIED
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-md mx-auto mt-1">
              Through strategic weakness exploitation and disciplined defenses, the Void corruption in {activeKingdom.name} has been banished!
            </p>
          </div>

          {/* Combat Analytics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto bg-[#0E0E17] p-4 rounded-xl border border-white/10 text-xs font-mono tabular-nums">
            <div>
              <span className="text-[10px] text-[#A1A1B8] uppercase block">Turns Taken</span>
              <span className="text-base font-bold text-white">{battleStats.turns}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#FBBF24] uppercase block">Weakness Hits</span>
              <span className="text-base font-bold text-[#FBBF24]">{battleStats.weaknessHits}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#38BDF8] uppercase block">Avoided / Guarded</span>
              <span className="text-base font-bold text-[#38BDF8]">{battleStats.attacksAvoided}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#34D399] uppercase block">Damage Dealt</span>
              <span className="text-base font-bold text-[#34D399]">{battleStats.damageDealt}</span>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto bg-[#090910] p-3 rounded-xl border border-[#D6A84B]/35 font-mono text-xs tabular-nums">
            <div>
              <span className="text-[10px] text-[#A1A1B8] uppercase block">Player XP</span>
              <span className="text-lg font-bold text-[#FBBF24]">+{boss.rewardPlayerXp}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A1A1B8] uppercase block">Aether Pts</span>
              <span className="text-lg font-bold text-[#8B5CF6]">+60</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                resetBossBattle(activeKingdom.id);
                setBattleState('PREP');
                sound.playClick();
              }}
              className="px-6 py-2.5 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] border border-white/15 hover:border-[#D6A84B]/60 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Challenge Again
            </button>
            <button
              onClick={() => setActiveTab('storyline')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] hover:from-[#E5B95C] hover:to-[#FCD34D] text-[#090910] font-['Cinzel'] font-bold text-xs shadow-[0_0_16px_rgba(214,168,75,0.35)] transition-all cursor-pointer"
            >
              Advance Realm Storyline
            </button>
          </div>
        </div>
      )}

      {/* 5. DEFEAT SCREEN WITH STRATEGIC HINTS */}
      {battleState === 'DEFEAT' && (
        <div className="bg-[#141420]/90 backdrop-blur-md border border-[#FB7185]/50 rounded-2xl p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(9,9,16,0.75)] space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FB7185]/15 text-[#FB7185] flex items-center justify-center border border-[#FB7185]/50">
            <Skull className="w-7 h-7" />
          </div>

          <h3 className="text-2xl font-black font-['Cinzel'] text-[#FB7185]">
            DEFEATED BY {boss.name.toUpperCase()}
          </h3>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-[#0E0E17] border border-[#FB7185]/35 text-xs text-[#A1A1B8] text-left space-y-2">
            <span className="font-bold text-[#D6A84B] font-['Cinzel'] block">
              Tactical Battle Debrief:
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-[#A1A1B8]">
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E11D48] to-[#FB7185] hover:from-[#F43F5E] hover:to-[#FDA4AF] text-white text-xs font-bold shadow-[0_0_16px_rgba(251,113,133,0.35)] transition-all cursor-pointer"
            >
              Retry Encounter
            </button>
            <button
              onClick={() => setActiveTab('fitness')}
              className="px-6 py-2.5 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] border border-white/15 hover:border-[#34D399]/60 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Train Bodyweight Strength
            </button>
          </div>
        </div>
      )}

      {/* 6. WEAKNESS DISCOVERY & CLUE MODAL */}
      {showLoreClueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090910]/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#1B1B2B] via-[#141420] to-[#0E0E17] border border-[#D6A84B]/50 p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D6A84B]" />
                <h3 className="font-['Cinzel'] font-black text-lg text-white">
                  ARCHIVAL WEAKNESS CLUE
                </h3>
              </div>
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="text-[#A1A1B8] hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ancient Clue Dossier */}
            <div className="p-4 rounded-xl bg-[#090910] border border-[#D6A84B]/30 space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#D6A84B] font-bold block">
                Storyline Intel · {boss.name}
              </span>
              <p className="text-xs text-[#A1A1B8] leading-relaxed italic border-l-2 border-[#D6A84B] pl-3">
                "{boss.weakness?.clue}"
              </p>
            </div>

            {/* Discovery State & Action */}
            <div className="p-3.5 rounded-xl bg-[#0E0E17] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#A1A1B8] font-mono block">Bestiary Status:</span>
                <span className={`text-xs font-bold ${boss.weakness?.discovered ? 'text-[#34D399]' : 'text-[#D6A84B]'}`}>
                  {boss.weakness?.discovered
                    ? `Discovered: ${boss.weakness.element} Element (${boss.weakness.damageMultiplier}x)`
                    : 'Hidden in Bestiary'}
                </span>
              </div>

              {!boss.weakness?.discovered ? (
                <button
                  onClick={handleUnlockWeakness}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] hover:from-[#E5B95C] hover:to-[#FCD34D] text-[#090910] font-['Cinzel'] font-black text-xs shadow-[0_0_16px_rgba(214,168,75,0.4)] transition-all hover:scale-105 cursor-pointer"
                >
                  DECRYPT WEAKNESS
                </button>
              ) : (
                <span className="text-xs font-mono text-[#34D399] font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Ready for Combat
                </span>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="px-6 py-2 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] border border-white/15 hover:border-[#D6A84B]/60 text-xs font-semibold text-white transition-all cursor-pointer"
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
