import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroArtwork, resolveAssetUrl } from '../../assets/images';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import {
  Swords,
  Shield,
  Sparkles,
  Flame,
  RotateCcw,
  Trophy,
  ArrowRight,
  Zap,
  Heart,
  AlertTriangle,
  Eye,
  Info,
  ShieldAlert,
  Wind,
  Droplets,
  CloudLightning,
  Sun,
  Moon,
  Compass,
  BookOpen,
  Check,
  HelpCircle,
  Skull,
  Crosshair,
} from 'lucide-react';
import { ElementType, WeaponAbility } from '../../types/game';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { WeeklyBossRaidPanel } from './WeeklyBossRaidPanel';

export const BossBattleView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    kingdoms,
    equippedWeapon,
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

  // Calculate Boss Current Phase
  const bossHpRatio = boss.health / boss.maxHealth;
  const currentPhaseNumber = bossHpRatio <= 0.33 ? 3 : bossHpRatio <= 0.66 ? 2 : 1;
  const currentPhaseInfo = boss.phases?.find(p => p.phaseNumber === currentPhaseNumber) || {
    phaseNumber: currentPhaseNumber,
    name: currentPhaseNumber === 3 ? 'Desperation Frenzy' : currentPhaseNumber === 2 ? 'Enraged Awakening' : 'Initial Stance',
    description: 'Engaging challenger in battle.',
    attackMultiplier: currentPhaseNumber === 3 ? 1.5 : currentPhaseNumber === 2 ? 1.25 : 1.0,
    auraColor: currentPhaseNumber === 3 ? 'text-rose-400' : currentPhaseNumber === 2 ? 'text-amber-400' : 'text-purple-400',
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
        return { label: 'Void', color: 'bg-purple-950 border-purple-500 text-purple-300', icon: <Moon className="w-3.5 h-3.5 text-purple-400" /> };
      case 'Nature':
        return { label: 'Nature', color: 'bg-emerald-950 border-emerald-500 text-emerald-300', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'Earth':
        return { label: 'Earth', color: 'bg-amber-950 border-amber-700 text-amber-200', icon: <Shield className="w-3.5 h-3.5 text-amber-500" /> };
      case 'Wind':
        return { label: 'Wind', color: 'bg-teal-950 border-teal-400 text-teal-200', icon: <Wind className="w-3.5 h-3.5 text-teal-300" /> };
      case 'Shadow':
        return { label: 'Shadow', color: 'bg-slate-950 border-indigo-600 text-indigo-300', icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> };
      case 'Arcane':
        return { label: 'Arcane', color: 'bg-fuchsia-950 border-fuchsia-500 text-fuchsia-200', icon: <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> };
      case 'Cosmic':
        return { label: 'Cosmic', color: 'bg-violet-950 border-violet-400 text-violet-200', icon: <CloudLightning className="w-3.5 h-3.5 text-violet-300" /> };
      default:
        return { label: 'Physical', color: 'bg-slate-900 border-slate-600 text-slate-300', icon: <Swords className="w-3.5 h-3.5 text-slate-400" /> };
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
        `Battle commenced! You brandish ${equippedWeapon.name} against ${boss.name}.`,
        `[Tip] Monitor stamina, exploit weaknesses, and heed telegraphed attack warnings!`,
      ]);
      sound.playClick();
    } finally {
      setIsStartingBattle(false);
    }
  };

  // Execute Strategic Action: Attack, Ability, Defend, or Dodge
  const executeCombatAction = async (
    action: 'attack' | 'ability' | 'defend' | 'dodge',
    abilityToUse?: WeaponAbility
  ) => {
    if (isAnimating || boss.health <= 0) return;

    // 1. Stamina Cost Validation (UI check; server enforces authoritatively)
    let staminaCost = 0;
    if (action === 'dodge') staminaCost = 20;
    else if (action === 'defend') staminaCost = 15;
    else if (action === 'ability' && abilityToUse) staminaCost = abilityToUse.staminaCost || 30;

    if (playerStamina < staminaCost) {
      sound.playClick();
      setCombatLogs(prev => [
        `⚠️ Not enough stamina! Need ${staminaCost} STAM (Current: ${playerStamina}). Rest with a standard Attack!`,
        ...prev.slice(0, 4),
      ]);
      return;
    }

    setIsAnimating(true);

    try {
      // 2. Execute Strategic Engine via Server RPC
      const abilityId = action === 'ability' && abilityToUse ? abilityToUse.id : undefined;
      const isWarning = isTelegraphWarningActive;
      const result = await attackBoss(activeKingdom.id, action, abilityId, isWarning);

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
        sound.playShieldBlock();
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
      colors: ['#f59e0b', '#38bdf8', '#a855f7'],
    });
  };

  const bossWeaknessBadge = boss.weakness ? getElementBadge(boss.weakness.element) : null;
  const bossResistanceBadge = boss.resistance ? getElementBadge(boss.resistance.element) : null;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Mode Switcher: Weekly Community Raid vs Kingdom Story Bosses */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-3">
        <div className="flex items-center gap-2 px-2">
          <Swords className="w-4 h-4 text-[#C5A15A]" />
          <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#C5A15A]">
            Boss Encounters
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Boss battle modes"
          className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090714] border border-[#C5A15A]/20"
        >
          <button
            type="button"
            role="tab"
            aria-selected={bossMode === 'weekly'}
            onClick={() => setBossMode('weekly')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              bossMode === 'weekly'
                ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                : 'text-[#D9D2C5]/65 hover:text-white border border-transparent'
            }`}
          >
            Weekly Community Raid
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={bossMode === 'kingdom'}
            onClick={() => setBossMode('kingdom')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              bossMode === 'kingdom'
                ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                : 'text-[#D9D2C5]/65 hover:text-white border border-transparent'
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
      <div className="rounded-2xl bg-gradient-to-r from-[#200e1e] via-[#150a1b] to-[#26102a] border border-rose-950/80 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-rose-400 bg-rose-950/70 border border-rose-700/60 px-2.5 py-0.5 rounded">
                Strategic Kingdom Encounters
              </span>
              <span className="text-xs text-purple-300 font-semibold">{activeKingdom.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              KINGDOM BOSS ENCOUNTERS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Exploit elemental weaknesses, manage stamina, respond to telegraphed attack warnings, and weather 3 boss phases.
            </p>
          </div>

          {/* Kingdom Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090714] rounded-xl border border-purple-950 overflow-x-auto max-w-full">
            {kingdoms.map(k => (
              <button
                key={k.id}
                onClick={() => {
                  setSelectedKingdomId(k.id);
                  setBattleState('PREP');
                  sound.playClick();
                }}
                disabled={!k.unlocked}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedKingdomId === k.id
                    ? 'bg-rose-800 text-white shadow'
                    : k.unlocked
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed'
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
          <div className="lg:col-span-7 bg-[#0e0a1b] border-2 border-purple-950 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header Art & Phase Indicator */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={resolveAssetUrl(boss.image)}
                alt={boss.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0a1b] via-[#0e0a1b]/40 to-transparent" />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-purple-950/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-purple-200 border border-purple-700/60 shadow">
                  {boss.difficulty} Difficulty
                </span>
                <span className="bg-rose-950/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-300 border border-rose-700/60 shadow">
                  3 Boss Phases
                </span>
              </div>

              {/* Quick Inspect Weakness Clue Button */}
              <button
                onClick={handleInspectClue}
                className="absolute top-4 right-4 bg-amber-950/90 hover:bg-amber-900 border border-amber-500/80 text-amber-300 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-transform hover:scale-105"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Weakness Dossier</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-['Cinzel'] font-black text-2xl text-white">{boss.name}</h3>
                <p className="text-xs text-purple-400 font-medium">{boss.title}</p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-purple-800 pl-3">
                "{boss.lore}"
              </p>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-3 bg-[#130f24] p-3 rounded-xl border border-purple-950 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Max Health</span>
                  <span className="text-rose-400 font-bold">{boss.maxHealth} HP</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Base Attack</span>
                  <span className="text-amber-400 font-bold">{boss.attack} ATK</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Armor Def</span>
                  <span className="text-indigo-400 font-bold">{boss.defense} DEF</span>
                </div>
              </div>

              {/* TACTICAL PROFILE: WEAKNESS, RESISTANCE & MECHANICS */}
              <div className="space-y-3 pt-2 border-t border-purple-950/80">
                <span className="text-xs font-['Cinzel'] font-bold text-slate-200 uppercase tracking-wider block">
                  Tactical Reconnaissance Profile
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Elemental Weakness */}
                  <div className="p-3 rounded-xl bg-[#120a22] border border-purple-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
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
                        <p className="text-[11px] text-purple-200/90 leading-tight">
                          {boss.weakness.description}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-slate-400 font-mono italic text-[11px] block">
                          ??? [Undiscovered Elemental Weakness]
                        </span>
                        <button
                          onClick={handleInspectClue}
                          className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline block"
                        >
                          Consult Archives to Reveal Clue ➔
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resistance */}
                  <div className="p-3 rounded-xl bg-[#120a22] border border-purple-900/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                      Damage Resistance
                    </span>
                    <div className="flex items-center gap-1.5 mb-1">
                      {bossResistanceBadge?.icon}
                      <span className="font-bold text-white font-['Cinzel'] text-xs">
                        {boss.resistance?.element} Element (-{boss.resistance?.damageReductionPercent}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-200/90 leading-tight">
                      {boss.resistance?.description}
                    </p>
                  </div>
                </div>

                {/* Signature Attack Warning Info */}
                {boss.signatureAttack && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Telegraphed Signature: {boss.signatureAttack.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-bold">
                        Counter with {boss.signatureAttack.defenseResponse.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-tight">
                      {boss.signatureAttack.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Prep & Champion Loadout (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0e0a1b] border-2 border-purple-950 rounded-2xl p-6 shadow-xl space-y-5">
            <h4 className="font-['Cinzel'] font-bold text-sm text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              CHAMPION COMBAT READINESS
            </h4>

            {/* Equipped Weapon & Strategic Elements */}
            <div className="p-4 rounded-xl bg-[#130f24] border border-purple-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Equipped Hand</span>
                <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  {equippedWeapon.evolutionStage || 'Dormant'} · Lv.{equippedWeapon.level}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="font-['Cinzel'] font-black text-base text-white">{equippedWeapon.name}</h5>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#090514] border border-purple-700/70 text-amber-300">
                    {equippedWeapon.rarity}
                  </span>
                  {equippedWeapon.awakened && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 border border-teal-500/70 text-teal-200 font-bold">
                      Awakened (+8% Strike)
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-300 font-mono">
                  {equippedWeapon.category} · {equippedWeapon.masteryPath} Path (Mastery Lv.{equippedWeapon.masteryLevel || 1})
                </p>
                <div className="grid grid-cols-4 gap-1.5 mt-2 bg-[#090514] border border-purple-950 rounded-lg p-2 text-[10px] font-mono text-center">
                  <div>
                    <span className="text-slate-500 block">CRIT</span>
                    <span className="text-amber-300 font-bold">+{equippedWeapon.critChance ?? 5}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CRIT DMG</span>
                    <span className="text-rose-300 font-bold">{equippedWeapon.critDamage ?? 180}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SPEED</span>
                    <span className="text-cyan-300 font-bold">{equippedWeapon.speed ?? 65}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">AP / ELEM</span>
                    <span className="text-purple-200 font-bold">+{equippedWeapon.abilityPower ?? 5}% {equippedWeapon.element || 'Phys'}</span>
                  </div>
                </div>
              </div>

              {/* Equipped Weapon Abilities Preview */}
              <div className="space-y-1.5 pt-2 border-t border-purple-950/80">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                  Available Mastery Elements:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {equippedWeapon.abilities?.map(ab => {
                    const badge = ab.element ? getElementBadge(ab.element) : null;
                    const isWeaknessMatch = boss.weakness?.element === ab.element;
                    return (
                      <div
                        key={ab.id}
                        className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                          ab.unlocked
                            ? isWeaknessMatch
                              ? 'bg-amber-950/50 border-amber-500/80 text-amber-200'
                              : 'bg-[#090514] border-purple-900/70 text-slate-300'
                            : 'bg-[#06030c] border-purple-950/40 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {badge?.icon}
                          <span className="font-['Cinzel'] font-bold text-[11px] truncate">{ab.name}</span>
                          {badge && (
                            <span className="text-[9px] font-mono px-1 rounded bg-black/60 text-slate-400">
                              {badge.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isWeaknessMatch && (
                            <span className="text-[9px] font-mono font-black text-amber-400 animate-pulse">
                              WEAKNESS!
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {ab.staminaCost || 30} STAM
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
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2 block">
                Combat Buffs ({buffs.filter(b => b.active).length} Active)
              </span>
              <div className="space-y-2">
                {buffs.map(b => (
                  <div
                    key={b.id}
                    onClick={() => activateBuff(b.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                      b.active
                        ? 'bg-purple-900/50 border-purple-500 text-purple-100 shadow'
                        : 'bg-[#130f24] border-purple-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${b.active ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="font-semibold">{b.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-purple-300">
                      +{b.effectValue}% {b.effectType.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {battleError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 text-center">
                {battleError}
              </div>
            )}

            {/* Launch Combat Button */}
            <button
              onClick={handleStartFight}
              disabled={isStartingBattle}
              className="w-full py-4 font-black font-['Cinzel'] tracking-widest text-sm rounded-xl bg-gradient-to-r from-rose-700 via-purple-700 to-indigo-700 hover:from-rose-600 hover:to-purple-600 text-white shadow-xl shadow-purple-950/80 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isStartingBattle ? 'ENTERING COMBAT ARENA...' : 'ENGAGE IN STRATEGIC COMBAT'}
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE STRATEGIC COMBAT ARENA */}
      {battleState === 'FIGHTING' && (
        <div className="bg-[#0e0a1b] border-2 border-purple-900 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Phase Transition Banner Overlay */}
          {phaseAnnouncement && (
            <div className="absolute top-4 inset-x-4 z-40 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 text-slate-950 p-3 rounded-xl text-center font-['Cinzel'] font-black text-sm tracking-widest shadow-2xl border-2 border-amber-300 animate-in zoom-in-95">
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
            <div className="p-5 rounded-2xl bg-[#130f24] border border-purple-800/80 space-y-3 relative">
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
                    className="w-14 h-14 rounded-xl object-cover object-top border border-purple-500"
                  />
                  <div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">
                      {user?.characterName || user?.username || 'Hero of Aetheria'}
                    </h4>
                    <p className="text-xs text-purple-300 font-mono">Wielding {equippedWeapon.name}</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#080511] border border-purple-700/60 p-1 shrink-0">
                  <EquipmentIllustration
                    itemId={equippedWeapon.id}
                    rarity={equippedWeapon.rarity}
                    level={equippedWeapon.level}
                    evolutionStage={equippedWeapon.evolutionStage}
                  />
                </div>
              </div>

              {/* Player Vitality HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>Player Vitality</span>
                  <span className="font-bold text-emerald-400">{playerCurrentHp} / {playerMaxHp} HP</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerCurrentHp / playerMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Player Stamina Bar (Crucial strategic resource!) */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Zap className="w-3.5 h-3.5" /> Stamina
                  </span>
                  <span className="font-bold text-cyan-400">{playerStamina} / {playerMaxStamina} STAM</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerStamina / playerMaxStamina) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  +15 passive / +25 standard attack
                </span>
              </div>
            </div>

            {/* BOSS ENCOUNTER HUD */}
            <div className={`p-5 rounded-2xl bg-[#130f24] border border-rose-900/80 space-y-3 relative ${isAnimating ? 'animate-pulse' : ''}`}>
              {/* Floating Damage Feedback over Boss */}
              {lastDamageDealt !== null && (
                <div className={`absolute top-2 right-4 text-2xl font-black font-mono animate-bounce ${
                  feedbackType === 'weakness'
                    ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                    : feedbackType === 'crit'
                    ? 'text-yellow-400 drop-shadow'
                    : 'text-amber-400'
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
                  <span className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded border border-purple-700 bg-purple-950 ${currentPhaseInfo.auraColor}`}>
                    PHASE {currentPhaseNumber}: {currentPhaseInfo.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    ATK x{currentPhaseInfo.attackMultiplier}
                  </span>
                </div>
              </div>

              {/* Boss HP Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>Void Corruption Health</span>
                  <span className="font-bold text-rose-400">{boss.health} / {boss.maxHealth} HP</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
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
                      ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}>
                    {boss.weakness.discovered ? (
                      <>
                        {bossWeaknessBadge?.icon}
                        <span>Weak: {boss.weakness.element} ({boss.weakness.damageMultiplier}x)</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                        <span>Weakness: ???</span>
                      </>
                    )}
                  </span>
                )}

                {boss.resistance && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-slate-900 border-purple-900 text-purple-300 flex items-center gap-1">
                    {bossResistanceBadge?.icon}
                    <span>Resist: {boss.resistance.element}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. FOUR STRATEGIC COMBAT CHOICES */}
          <div className="p-5 rounded-2xl bg-[#090714] border border-purple-950 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-950 pb-2">
              <span className="text-xs uppercase font-['Cinzel'] font-black tracking-widest text-slate-300 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-purple-400" />
                Select Combat Action (Turn {turnCount})
              </span>
              <span className="text-xs font-mono text-cyan-300 font-bold">
                Stamina: {playerStamina} / 100
              </span>
            </div>

            {/* 4 Main Action Pillars: Attack / Use Ability / Defend / Dodge */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* ACTION 1: ATTACK */}
              <button
                onClick={() => executeCombatAction('attack')}
                disabled={isAnimating}
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#1b1035] to-[#110722] hover:from-[#241547] hover:to-[#170a2f] border border-purple-700/80 hover:border-purple-500 text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-white flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    ATTACK
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700">
                    +25 STAM
                  </span>
                </div>
                <p className="text-[11px] text-purple-200">
                  Standard weapon blow. Restores stamina and maintains pressure.
                </p>
              </button>

              {/* ACTION 2: USE ABILITY (Toggles ability panel or casts chosen ability) */}
              <button
                onClick={() => {
                  const unlocked = equippedWeapon.abilities?.filter(a => a.unlocked);
                  if (unlocked && unlocked.length > 0) {
                    executeCombatAction('ability', unlocked[0]);
                  } else {
                    executeCombatAction('attack');
                  }
                }}
                disabled={isAnimating || playerStamina < 20}
                className="p-3.5 rounded-xl bg-gradient-to-b from-[#2a1340] to-[#160a28] hover:from-[#351952] hover:to-[#1f0e38] border border-amber-600/80 hover:border-amber-400 text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    USE ABILITY
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-700">
                    20-45 STAM
                  </span>
                </div>
                <p className="text-[11px] text-amber-100">
                  Unleash elemental mastery to exploit boss weaknesses.
                </p>
              </button>

              {/* ACTION 3: DEFEND */}
              <button
                onClick={() => executeCombatAction('defend')}
                disabled={isAnimating || playerStamina < 15}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'defend'
                    ? 'bg-gradient-to-b from-indigo-900 to-indigo-950 border-cyan-400 ring-2 ring-cyan-400/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#131a38] to-[#0a0e22] border-indigo-700/80 hover:border-indigo-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-cyan-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    DEFEND
                  </span>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-700">
                    15 STAM
                  </span>
                </div>
                <p className="text-[11px] text-cyan-100">
                  Raise shield & guard. Reduces damage by 80% and mitigates Ground Slams.
                </p>
              </button>

              {/* ACTION 4: DODGE */}
              <button
                onClick={() => executeCombatAction('dodge')}
                disabled={isAnimating || playerStamina < 20}
                className={`p-3.5 rounded-xl border text-left transition-all shadow-md group disabled:opacity-50 cursor-pointer ${
                  isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'dodge'
                    ? 'bg-gradient-to-b from-emerald-900 to-teal-950 border-emerald-400 ring-2 ring-emerald-400/80 animate-pulse'
                    : 'bg-gradient-to-b from-[#0f2824] to-[#071714] border-emerald-700/80 hover:border-emerald-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-['Cinzel'] font-black text-xs text-emerald-200 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    DODGE
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700">
                    20 STAM
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100">
                  Evasive roll. Evades 100% damage from telegraphed ambushes.
                </p>
              </button>
            </div>

            {/* WEAPON MASTERY ABILITY SELECTOR STRIP */}
            {equippedWeapon?.abilities && equippedWeapon.abilities.length > 0 && (
              <div className="pt-3 border-t border-purple-950">
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-400 font-['Cinzel'] block mb-2">
                  Tactical Mastery Abilities ({equippedWeapon.name}):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {equippedWeapon.abilities.map(ability => {
                    const isUnlocked = ability.unlocked;
                    const badge = ability.element ? getElementBadge(ability.element) : null;
                    const isWeaknessMatch = boss.weakness?.element === ability.element;
                    const cost = ability.staminaCost || 30;
                    const hasEnoughStamina = playerStamina >= cost;

                    return (
                      <button
                        key={ability.id}
                        onClick={() => executeCombatAction('ability', ability)}
                        disabled={isAnimating || !isUnlocked || !hasEnoughStamina}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                          isUnlocked && hasEnoughStamina
                            ? isWeaknessMatch
                              ? 'bg-gradient-to-r from-[#2c1340] to-[#1c0828] border-amber-400 ring-2 ring-amber-400/60 hover:scale-[1.02] cursor-pointer shadow-lg'
                              : 'bg-gradient-to-r from-[#170c2a] to-[#0e061c] border-purple-800/80 hover:border-purple-500 hover:scale-[1.01] cursor-pointer'
                            : 'bg-[#080512]/60 border-purple-950 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-['Cinzel'] font-black text-xs text-white truncate flex items-center gap-1.5">
                            {badge?.icon}
                            {ability.name}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isWeaknessMatch
                              ? 'bg-amber-400 text-slate-950 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {cost} STAM
                          </span>
                        </div>

                        <p className="text-[11px] text-purple-200 line-clamp-1">{ability.combatEffect}</p>

                        <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                          <span className="text-slate-400">{badge?.label} Element</span>
                          {isWeaknessMatch && (
                            <span className="text-amber-400 font-bold">1.8x - 2.0x BONUS!</span>
                          )}
                          {!isUnlocked && (
                            <span className="text-slate-500 italic">Unlock at M-Lv.{ability.unlockMasteryLevel}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Combat Logs Console */}
          <div className="p-4 rounded-xl bg-[#090712] border border-purple-950 text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto">
            {combatLogs.map((log, idx) => (
              <p
                key={idx}
                className={
                  idx === 0
                    ? 'text-amber-300 font-bold border-l-2 border-amber-400 pl-2'
                    : 'text-slate-400 pl-2'
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
        <div className="bg-[#0e0a1b] border-2 border-amber-500/80 rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-['Cinzel'] block">
              Strategic Encounter Cleared
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              VICTORY! {boss.name.toUpperCase()} PURIFIED
            </h3>
            <p className="text-xs sm:text-sm text-purple-300 max-w-md mx-auto mt-1">
              Through strategic weakness exploitation and disciplined defenses, the Void corruption in {activeKingdom.name} has been banished!
            </p>
          </div>

          {/* Combat Analytics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto bg-[#130f24] p-4 rounded-xl border border-purple-900 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Turns Taken</span>
              <span className="text-base font-bold text-white">{battleStats.turns}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase block">Weakness Hits</span>
              <span className="text-base font-bold text-amber-300">{battleStats.weaknessHits}</span>
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 uppercase block">Avoided / Guarded</span>
              <span className="text-base font-bold text-cyan-300">{battleStats.attacksAvoided}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase block">Damage Dealt</span>
              <span className="text-base font-bold text-emerald-300">{battleStats.damageDealt}</span>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto bg-[#120822] p-3 rounded-xl border border-amber-500/50 font-mono text-xs">
            <div>
              <span className="text-[10px] text-purple-300 uppercase block">Player XP</span>
              <span className="text-lg font-bold text-purple-200">+{boss.rewardPlayerXp}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-300 uppercase block">Forge XP</span>
              <span className="text-lg font-bold text-amber-200">+{boss.rewardForgeXp}</span>
            </div>
            <div>
              <span className="text-[10px] text-cyan-300 uppercase block">Aether Pts</span>
              <span className="text-lg font-bold text-cyan-200">+60</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                resetBossBattle(activeKingdom.id);
                setBattleState('PREP');
                sound.playClick();
              }}
              className="px-6 py-2.5 rounded-xl border border-purple-700 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Challenge Again
            </button>
            <button
              onClick={() => setActiveTab('storyline')}
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-['Cinzel'] font-bold text-xs"
            >
              Advance Realm Storyline
            </button>
          </div>
        </div>
      )}

      {/* 5. DEFEAT SCREEN WITH STRATEGIC HINTS */}
      {battleState === 'DEFEAT' && (
        <div className="bg-[#0e0a1b] border-2 border-rose-900 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-700">
            <Skull className="w-7 h-7" />
          </div>

          <h3 className="text-2xl font-black font-['Cinzel'] text-rose-300">
            DEFEATED BY {boss.name.toUpperCase()}
          </h3>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-[#130b1c] border border-rose-900/60 text-xs text-slate-300 text-left space-y-2">
            <span className="font-bold text-amber-400 font-['Cinzel'] block">
              Tactical Battle Debrief:
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-300">
              <li>
                <strong>Heed Telegraphed Warnings:</strong> Use <strong>DEFEND</strong> against slams or <strong>DODGE</strong> against ambushes when warnings appear.
              </li>
              <li>
                <strong>Exploit Weakness:</strong> {boss.name} is vulnerable to <strong>{boss.weakness?.element}</strong> for massive bonus damage.
              </li>
              <li>
                <strong>Manage Stamina:</strong> Don't deplete all stamina on abilities; standard attacks restore +25 STAM.
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
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold"
            >
              Retry Encounter
            </button>
            <button
              onClick={() => setActiveTab('armory')}
              className="px-6 py-2.5 rounded-xl border border-amber-600/70 text-amber-300 hover:bg-amber-950/40 text-xs font-bold"
            >
              Upgrade at Armory
            </button>
          </div>
        </div>
      )}

      {/* 6. WEAKNESS DISCOVERY & CLUE MODAL */}
      {showLoreClueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#1c0f33] via-[#0d0718] to-[#120822] border-2 border-amber-500 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-['Cinzel'] font-black text-lg text-white">
                  ARCHIVAL WEAKNESS CLUE
                </h3>
              </div>
              <button
                onClick={() => setShowLoreClueModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Ancient Clue Parchment */}
            <div className="p-4 rounded-xl bg-[#090514] border border-amber-600/60 space-y-2">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                Storyline Intel · {boss.name}
              </span>
              <p className="text-xs text-amber-100/90 leading-relaxed italic border-l-2 border-amber-500 pl-3">
                "{boss.weakness?.clue}"
              </p>
            </div>

            {/* Discovery State & Action */}
            <div className="p-3.5 rounded-xl bg-[#120924] border border-purple-900 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">Bestiary Status:</span>
                <span className={`text-xs font-bold ${boss.weakness?.discovered ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {boss.weakness?.discovered
                    ? `Discovered: ${boss.weakness.element} Element (${boss.weakness.damageMultiplier}x)`
                    : 'Hidden in Bestiary'}
                </span>
              </div>

              {!boss.weakness?.discovered ? (
                <button
                  onClick={handleUnlockWeakness}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-['Cinzel'] font-black text-xs shadow-lg transition-transform hover:scale-105"
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
                className="px-6 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-xs font-semibold text-slate-300 hover:text-white"
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
