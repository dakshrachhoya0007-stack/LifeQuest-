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
  X,
} from 'lucide-react';
import { BodyweightTechnique, ElementType } from '../../types/game';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { WeeklyBossRaidPanel } from './WeeklyBossRaidPanel';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgModalWrapper,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';

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
    auraColor: currentPhaseNumber === 3 ? 'text-[#F43F5E]' : currentPhaseNumber === 2 ? 'text-[#FBBF24]' : 'text-[#38D9F5]',
  };

  // Helper for elemental icon
  const getElementBadge = (element: ElementType) => {
    switch (element) {
      case 'Fire':
        return { label: 'Fire', color: 'bg-[#0A1930] border-[#F43F5E] text-[#F43F5E]', icon: <Flame className="w-3.5 h-3.5 text-[#F43F5E]" /> };
      case 'Water':
        return { label: 'Water', color: 'bg-[#0A1930] border-[#38D9F5] text-[#38D9F5]', icon: <Droplets className="w-3.5 h-3.5 text-[#38D9F5]" /> };
      case 'Ice':
        return { label: 'Ice', color: 'bg-[#0A1930] border-[#94A8C7] text-[#F2F7FF]', icon: <Wind className="w-3.5 h-3.5 text-[#94A8C7]" /> };
      case 'Lightning':
        return { label: 'Lightning', color: 'bg-[#0A1930] border-[#F59E0B] text-[#FBBF24]', icon: <Zap className="w-3.5 h-3.5 text-[#FBBF24]" /> };
      case 'Light':
        return { label: 'Light', color: 'bg-[#0A1930] border-[#FBBF24] text-[#FBBF24]', icon: <Sun className="w-3.5 h-3.5 text-[#FBBF24]" /> };
      case 'Void':
        return { label: 'Void', color: 'bg-[#061225] border-[#1677FF] text-[#38D9F5]', icon: <Moon className="w-3.5 h-3.5 text-[#38D9F5]" /> };
      case 'Nature':
        return { label: 'Nature', color: 'bg-[#0A1930] border-[#10B981] text-[#10B981]', icon: <Sparkles className="w-3.5 h-3.5 text-[#10B981]" /> };
      case 'Earth':
        return { label: 'Earth', color: 'bg-[#0A1930] border-[#F59E0B] text-[#F59E0B]', icon: <Dumbbell className="w-3.5 h-3.5 text-[#F59E0B]" /> };
      case 'Wind':
        return { label: 'Wind', color: 'bg-[#0A1930] border-[#10B981] text-[#10B981]', icon: <Wind className="w-3.5 h-3.5 text-[#10B981]" /> };
      case 'Shadow':
        return { label: 'Shadow', color: 'bg-[#0A1930] border-[#1677FF] text-[#94A8C7]', icon: <Moon className="w-3.5 h-3.5 text-[#94A8C7]" /> };
      case 'Arcane':
        return { label: 'Arcane', color: 'bg-[#0A1930] border-[#38D9F5] text-[#38D9F5]', icon: <Sparkles className="w-3.5 h-3.5 text-[#38D9F5]" /> };
      case 'Cosmic':
        return { label: 'Cosmic', color: 'bg-[#061225] border-[#FBBF24] text-[#FBBF24]', icon: <CloudLightning className="w-3.5 h-3.5 text-[#FBBF24]" /> };
      default:
        return { label: 'Physical', color: 'bg-[#0A1930] border-[#1E3A63] text-[#94A8C7]', icon: <Hand className="w-3.5 h-3.5 text-[#94A8C7]" /> };
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

    let staminaCost = 0;
    if (action === 'dodge') staminaCost = 20;
    else if (action === 'defend') staminaCost = 15;
    else if (action === 'ability' && techniqueToUse) staminaCost = techniqueToUse.staminaCost || 25;

    if (playerStamina < staminaCost) {
      sound.playClick();
      setCombatLogs(prev => [
        `Not enough stamina! Need ${staminaCost} STAM (Current: ${playerStamina}). Recover with a Hands & Legs Combo!`,
        ...prev.slice(0, 4),
      ]);
      return;
    }

    setIsAnimating(true);

    try {
      const abilityId = action === 'ability' && techniqueToUse ? techniqueToUse.id : undefined;
      const isWarning = isTelegraphWarningActive;
      const result = await attackBoss(activeKingdom.id, action, abilityId);

      if (result.error) {
        setCombatLogs(prev => [`${result.error}`, ...prev.slice(0, 5)]);
        setIsAnimating(false);
        return;
      }

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

      setBattleStats(prev => ({
        turns: prev.turns + 1,
        weaknessHits: result.isWeaknessHit ? prev.weaknessHits + 1 : prev.weaknessHits,
        attacksAvoided: result.isDodged || (result.isDefended && isWarning) ? prev.attacksAvoided + 1 : prev.attacksAvoided,
        damageDealt: prev.damageDealt + result.playerDamage,
        damageTaken: prev.damageTaken + result.bossDamage,
      }));

      if (result.newPhase) {
        sound.playVictory();
        setPhaseAnnouncement(`PHASE ${result.newPhase} ACTIVATED: ${boss.phases?.[result.newPhase - 1]?.name || 'ENRAGE'}!`);
        setTimeout(() => setPhaseAnnouncement(null), 3000);
      }

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
      colors: ['#F43F5E', '#F59E0B', '#FBBF24', '#00D9FF'],
    });
  };

  const bossWeaknessBadge = boss.weakness ? getElementBadge(boss.weakness.element) : null;
  const bossResistanceBadge = boss.resistance ? getElementBadge(boss.resistance.element) : null;

  return (
    <div className="space-y-6 pb-12 max-w-[1360px] mx-auto">
      {/* Mode Switcher: Weekly Community Raid vs Kingdom Story Bosses */}
      <div className="lq-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5">
        <div className="flex items-center gap-2 px-2">
          <Dumbbell className="w-4 h-4 text-[#F43F5E]" />
          <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#38D9F5]">
            Boss Encounters
          </span>
        </div>
        <FeatureTabBar
          themeId="boss-battles"
          layoutId="boss-mode-pill"
          ariaLabel="Boss battle modes"
          activeId={bossMode}
          onSelect={id => setBossMode(id)}
          tabs={[
            { id: 'weekly', label: 'Weekly Community Raid' },
            { id: 'kingdom', label: 'Kingdom Story Bosses' },
          ]}
        />
      </div>

      <RpgSubTabTransition tabKey={bossMode}>
        {bossMode === 'weekly' ? (
          <WeeklyBossRaidPanel />
        ) : (
          <div className="space-y-6">
            {/* Top Banner & Kingdom Navigation */}
            <FeatureBanner themeId="boss-battles">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
                    <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#F43F5E]">
                      Strategic Kingdom Encounters
                    </span>
                    <span className="text-[#647A9E]" aria-hidden="true">·</span>
                    <span className="text-[#38D9F5] font-semibold">{activeKingdom.name}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
                    Kingdom Boss Encounters
                  </h1>
                  <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
                    Exploit elemental weaknesses, manage stamina, respond to telegraphed attack warnings, and weather 3 boss phases.
                  </p>
                </div>

                {/* Kingdom Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-[#061225] rounded-xl border border-[#1E3A63] overflow-x-auto max-w-full">
                  {kingdoms.map(k => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setSelectedKingdomId(k.id);
                        setBattleState('PREP');
                        sound.playClick();
                      }}
                      disabled={!k.unlocked}
                      className={`lq-btn px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 ${
                        selectedKingdomId === k.id
                          ? 'lq-btn-gold font-bold cursor-pointer'
                          : k.unlocked
                          ? 'text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-[#102440] cursor-pointer'
                          : 'text-[#647A9E] cursor-not-allowed'
                      }`}
                    >
                      {k.name} {!k.unlocked && '· Locked'}
                    </button>
                  ))}
                </div>
              </div>
            </FeatureBanner>

            {/* 1. PREPARATION SCREEN */}
            {battleState === 'PREP' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Boss Tactical Dossier (7 Cols) */}
                <div className="lg:col-span-7 lq-card rounded-2xl overflow-hidden">
                  {/* Header Art & Phase Indicator */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={resolveAssetUrl(boss.image)}
                      alt={boss.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover filter brightness-90 contrast-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1930] via-[#061225]/45 to-transparent" />

                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="bg-[#061225]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#38D9F5] border border-[#00D9FF]/45">
                        {boss.difficulty} Difficulty
                      </span>
                      <span className="bg-[#061225]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#F43F5E] border border-[#F43F5E]/45">
                        3 Boss Phases
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleInspectClue}
                      className="lq-btn lq-btn-secondary absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#38D9F5]" />
                      <span>Weakness Dossier</span>
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-['Cinzel'] font-black text-2xl text-[#F2F7FF]">{boss.name}</h3>
                      <p className="text-xs text-[#38D9F5] font-medium">{boss.title}</p>
                    </div>

                    <p className="lq-surface p-3 rounded-xl text-xs text-[#94A8C7] leading-relaxed italic">
                      &ldquo;{boss.lore}&rdquo;
                    </p>

                    {/* Vitals Grid */}
                    <div className="lq-surface grid grid-cols-3 gap-3 p-3 rounded-xl text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-[10px] text-[#94A8C7] uppercase block">Max Health</span>
                        <span className="text-[#F43F5E] font-bold">{boss.maxHealth} HP</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#94A8C7] uppercase block">Base Attack</span>
                        <span className="text-[#F59E0B] font-bold">{boss.attack} ATK</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#94A8C7] uppercase block">Armor Def</span>
                        <span className="text-[#38D9F5] font-bold">{boss.defense} DEF</span>
                      </div>
                    </div>

                    {/* TACTICAL PROFILE */}
                    <div className="space-y-3 pt-2 border-t border-[#1E3A63]">
                      <span className="text-xs font-['Cinzel'] font-bold text-[#F2F7FF] uppercase tracking-wider block">
                        Tactical Reconnaissance Profile
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="lq-surface p-3 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[#94A8C7] font-mono">
                              Elemental Weakness
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                boss.weakness?.discovered ? 'text-[#10B981]' : 'text-[#38D9F5]'
                              }`}
                            >
                              {boss.weakness?.discovered ? 'DISCOVERED' : 'HIDDEN INTEL'}
                            </span>
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
                                type="button"
                                onClick={handleInspectClue}
                                className="text-[10px] font-bold text-[#38D9F5] hover:text-[#F2F7FF] underline block cursor-pointer"
                              >
                                Consult Archives to Reveal Clue →
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="lq-surface p-3 rounded-xl space-y-1.5">
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

                      {boss.signatureAttack && (
                        <div className="p-3 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/40 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-[#F43F5E] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#F43F5E]" />
                              Telegraphed Signature: {boss.signatureAttack.name}
                            </span>
                            <span className="text-[10px] font-mono uppercase text-[#FBBF24] font-bold">
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
                <div className="lg:col-span-5 lq-card rounded-2xl p-6 space-y-5">
                  <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-[#38D9F5]" />
                    Hands &amp; Legs Bodyweight Readiness
                  </h4>

                  <div className="lq-surface p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94A8C7]">Combat Discipline</span>
                      <span className="text-[10px] uppercase font-bold text-[#FBBF24]">
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

                      <div className="grid grid-cols-1 gap-1.5 mt-2.5 text-[11px] bg-[#061225] border border-[#1E3A63] rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <Hand className="w-3.5 h-3.5 text-[#F43F5E] shrink-0" />
                          <span className="text-[#94A8C7]">Hands:</span>
                          <span className="text-[#F2F7FF] font-medium">{heroDef.bodyweightDisciplines.handsFocus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Footprints className="w-3.5 h-3.5 text-[#38D9F5] shrink-0" />
                          <span className="text-[#94A8C7]">Legs:</span>
                          <span className="text-[#F2F7FF] font-medium">{heroDef.bodyweightDisciplines.legsFocus}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 mt-2 bg-[#061225] border border-[#1E3A63] rounded-lg p-2 text-[10px] font-mono text-center tabular-nums">
                        <div>
                          <span className="text-[#94A8C7] block">STRIKE</span>
                          <span className="text-[#F43F5E] font-bold">+{rawAtk}</span>
                        </div>
                        <div>
                          <span className="text-[#94A8C7] block">GUARD</span>
                          <span className="text-[#38D9F5] font-bold">+{rawDef}</span>
                        </div>
                        <div>
                          <span className="text-[#94A8C7] block">CRIT</span>
                          <span className="text-[#FBBF24] font-bold">{critPercent}%</span>
                        </div>
                        <div>
                          <span className="text-[#94A8C7] block">REPS</span>
                          <span className="text-[#10B981] font-bold">{stats.totalVerifiedReps}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bodyweight Techniques Preview */}
                    <div className="space-y-1.5 pt-2 border-t border-[#1E3A63]">
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
                                  ? 'bg-[#102440] border-[#F59E0B]/60 text-[#F2F7FF]'
                                  : 'bg-[#061225] border-[#1E3A63] text-[#94A8C7]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {badge.icon}
                                <div className="min-w-0">
                                  <span className="font-['Cinzel'] font-bold text-[11px] text-[#F2F7FF] block truncate">
                                    {tech.name}
                                  </span>
                                  <span className="text-[10px] text-[#94A8C7] block truncate">
                                    {tech.limb === 'hands' ? 'Hands' : tech.limb === 'legs' ? 'Legs' : 'Hands & Legs'} · Built from {tech.exerciseInspiration}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isWeaknessMatch && (
                                  <span className="text-[9px] font-mono font-black text-[#FBBF24]">
                                    WEAKNESS
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-[#94A8C7] tabular-nums">
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
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#38D9F5] mb-2 block">
                      Combat Buffs ({buffs.filter(b => b.active).length} Active)
                    </span>
                    <div className="space-y-2">
                      {buffs.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => activateBuff(b.id)}
                          className={`w-full p-2.5 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                            b.active
                              ? 'lq-surface-gold text-[#F2F7FF]'
                              : 'lq-surface text-[#94A8C7] hover:text-[#F2F7FF]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className={`w-3.5 h-3.5 ${b.active ? 'text-[#38D9F5]' : 'text-[#94A8C7]'}`} />
                            <span className="font-semibold">{b.name}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-[#38D9F5] tabular-nums">
                            +{b.effectValue}% {b.effectType.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {battleError && (
                    <div className="p-2.5 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/45 text-xs text-[#F43F5E] text-center">
                      {battleError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStartFight}
                    disabled={isStartingBattle}
                    className="lq-btn lq-btn-gold w-full py-4 font-black font-['Cinzel'] tracking-widest text-sm rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    {isStartingBattle ? 'ENTERING COMBAT ARENA...' : 'ENGAGE IN STRATEGIC COMBAT'}
                  </button>
                </div>
              </div>
            )}

            {/* 2. ACTIVE STRATEGIC COMBAT ARENA */}
            {battleState === 'FIGHTING' && (
              <div className="lq-card rounded-2xl p-5 sm:p-7 space-y-6 relative overflow-hidden">
                {phaseAnnouncement && (
                  <div className="lq-card-gold absolute top-4 inset-x-4 z-40 p-3 rounded-xl text-center font-['Cinzel'] font-black text-sm tracking-widest text-[#FBBF24]">
                    {phaseAnnouncement}
                  </div>
                )}

                {isTelegraphWarningActive && boss.signatureAttack && (
                  <div className="p-4 rounded-xl bg-[#F43F5E]/14 border-2 border-[#F43F5E] space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#F43F5E]" />
                        <span className="font-['Cinzel'] font-black text-sm text-[#F2F7FF] tracking-wide">
                          TELEGRAPHED ATTACK WARNING: {boss.signatureAttack.name.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-[#061225] text-[#FBBF24] font-black border border-[#F43F5E]">
                        RECOMMENDED: {boss.signatureAttack.defenseResponse.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-[#F2F7FF]/90">
                      {boss.signatureAttack.warningText}
                    </p>
                  </div>
                )}

                {/* Combatants Dual Showcase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  {/* PLAYER HERO HUD */}
                  <div className="lq-surface p-5 rounded-2xl space-y-3 relative">
                    {lastBossDamage !== null && (
                      <div className="absolute top-2 right-4 text-2xl font-black font-mono text-[#F43F5E]">
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
                          <h4 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                            {user?.characterName || user?.username || 'Hero of Aetheria'}
                          </h4>
                          <p className="text-xs text-[#38D9F5] font-mono">
                            Hands &amp; Legs · {heroDef.bodyweightDisciplines.conditioningStyle}
                          </p>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-[#061225] border border-[#1E3A63] flex items-center justify-center shrink-0 text-[#38D9F5]">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#94A8C7] mb-1 font-mono tabular-nums">
                        <span>Player Vitality</span>
                        <span className="font-bold text-[#10B981]">{playerCurrentHp} / {playerMaxHp} HP</span>
                      </div>
                      <AnimatedProgressBar
                        percentage={(playerCurrentHp / playerMaxHp) * 100}
                        className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1E3A63]"
                        barClassName="bg-[#10B981]"
                        shimmer={false}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#94A8C7] mb-1 font-mono tabular-nums">
                        <span className="flex items-center gap-1 text-[#38D9F5]">
                          <Zap className="w-3.5 h-3.5" /> Stamina
                        </span>
                        <span className="font-bold text-[#38D9F5]">{playerStamina} / {playerMaxStamina} STAM</span>
                      </div>
                      <AnimatedProgressBar
                        percentage={(playerStamina / playerMaxStamina) * 100}
                        className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1E3A63]"
                        barClassName="bg-gradient-to-r from-[#1677FF] to-[#00D9FF]"
                        shimmer={false}
                      />
                      <span className="text-[10px] text-[#647A9E] font-mono mt-0.5 block">
                        +15 passive / +25 standard attack
                      </span>
                    </div>
                  </div>

                  {/* BOSS ENCOUNTER HUD */}
                  <div className="lq-surface p-5 rounded-2xl border border-[#F43F5E]/45 space-y-3 relative">
                    {lastDamageDealt !== null && (
                      <div
                        className={`absolute top-2 right-4 text-2xl font-black font-mono ${
                          feedbackType === 'weakness'
                            ? 'text-[#FBBF24]'
                            : feedbackType === 'crit'
                            ? 'text-[#F59E0B]'
                            : 'text-[#F43F5E]'
                        }`}
                      >
                        -{lastDamageDealt}{' '}
                        {feedbackType === 'weakness' ? 'WEAKNESS HIT!' : feedbackType === 'crit' ? 'CRIT!' : ''}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveAssetUrl(boss.image)}
                          alt={boss.name}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border border-[#F43F5E]"
                        />
                        <div>
                          <h4 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">{boss.name}</h4>
                          <p className="text-xs text-[#F43F5E] font-mono">{boss.title}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-mono uppercase font-black ${currentPhaseInfo.auraColor}`}>
                          PHASE {currentPhaseNumber}: {currentPhaseInfo.name}
                        </span>
                        <span className="text-[10px] text-[#94A8C7] block mt-0.5 font-mono tabular-nums">
                          ATK x{currentPhaseInfo.attackMultiplier}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#94A8C7] mb-1 font-mono tabular-nums">
                        <span>Void Corruption Health</span>
                        <span className="font-bold text-[#F43F5E]">{boss.health} / {boss.maxHealth} HP</span>
                      </div>
                      <AnimatedProgressBar
                        percentage={(boss.health / boss.maxHealth) * 100}
                        className="w-full bg-[#061225] h-2.5 rounded-full overflow-hidden border border-[#1E3A63]"
                        barClassName="bg-gradient-to-r from-[#F43F5E] to-[#F59E0B]"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-[10px] font-mono">
                      {boss.weakness && (
                        <span className={`flex items-center gap-1 ${boss.weakness.discovered ? 'text-[#FBBF24]' : 'text-[#94A8C7]'}`}>
                          {boss.weakness.discovered ? (
                            <>
                              {bossWeaknessBadge?.icon}
                              <span>Weak: {boss.weakness.element} ({boss.weakness.damageMultiplier}x)</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3 h-3 text-[#94A8C7]" />
                              <span>Weakness: ???</span>
                            </>
                          )}
                        </span>
                      )}

                      {boss.resistance && (
                        <span className="text-[#94A8C7] flex items-center gap-1">
                          {bossResistanceBadge?.icon}
                          <span>Resist: {boss.resistance.element}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. FOUR STRATEGIC BODYWEIGHT COMBAT CHOICES */}
                <div className="lq-surface p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1E3A63] pb-2">
                    <span className="text-xs uppercase font-['Cinzel'] font-black tracking-widest text-[#F2F7FF] flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-[#38D9F5]" />
                      Hands &amp; Legs Combat Actions (Turn {turnCount})
                    </span>
                    <span className="text-xs font-mono text-[#38D9F5] font-bold tabular-nums">
                      Stamina: {playerStamina} / 100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => executeCombatAction('attack')}
                      disabled={isAnimating}
                      className="lq-card lq-card-interactive p-3.5 rounded-xl text-left group disabled:opacity-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] flex items-center gap-1.5">
                          <Hand className="w-4 h-4 text-[#F43F5E]" />
                          STRIKE
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#10B981]">
                          +25 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A8C7]">
                        Bodyweight punch &amp; kick combo. Restores stamina and builds pressure.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const unlocked = bodyweightTechniques.filter(t => t.unlocked);
                        if (unlocked.length > 0) {
                          executeCombatAction('ability', unlocked[0]);
                        } else {
                          executeCombatAction('attack');
                        }
                      }}
                      disabled={isAnimating || playerStamina < 20}
                      className="lq-card lq-card-interactive p-3.5 rounded-xl text-left group disabled:opacity-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-[#38D9F5]" />
                          TECHNIQUE
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#38D9F5]">
                          20-35 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A8C7]">
                        Unleash a trained Hand or Leg strike to exploit boss weaknesses.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeCombatAction('defend')}
                      disabled={isAnimating || playerStamina < 15}
                      className={`p-3.5 rounded-xl border text-left transition-all group disabled:opacity-50 cursor-pointer ${
                        isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'defend'
                          ? 'bg-[#1677FF]/20 border-[#00D9FF] ring-2 ring-[#00D9FF]/80'
                          : 'lq-card lq-card-interactive'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-[#38D9F5]" />
                          BRACE GUARD
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#38D9F5]">
                          15 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A8C7]">
                        Root your stance with forearms &amp; core. Reduces damage by 80% against Ground Slams.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeCombatAction('dodge')}
                      disabled={isAnimating || playerStamina < 20}
                      className={`p-3.5 rounded-xl border text-left transition-all group disabled:opacity-50 cursor-pointer ${
                        isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'dodge'
                          ? 'bg-[#10B981]/18 border-[#10B981] ring-2 ring-[#10B981]/80'
                          : 'lq-card lq-card-interactive'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Cinzel'] font-black text-xs text-[#10B981] flex items-center gap-1.5">
                          <Footprints className="w-4 h-4 text-[#10B981]" />
                          FOOTWORK EVADE
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#10B981]">
                          20 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A8C7]">
                        Agile leg step &amp; evasive roll. Avoids 100% damage from telegraphed ambushes.
                      </p>
                    </button>
                  </div>

                  {/* HANDS & LEGS BODYWEIGHT TECHNIQUE SELECTOR STRIP */}
                  <div className="pt-3 border-t border-[#1E3A63]">
                    <span className="text-[10px] uppercase tracking-widest font-black text-[#38D9F5] font-['Cinzel'] block mb-2">
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
                            type="button"
                            onClick={() => executeCombatAction('ability', tech)}
                            disabled={isAnimating || !isUnlocked || !hasEnoughStamina}
                            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                              isUnlocked && hasEnoughStamina
                                ? isWeaknessMatch
                                  ? 'lq-card-gold lq-card-interactive cursor-pointer'
                                  : 'lq-surface lq-card-interactive cursor-pointer'
                                : 'bg-[#061225]/60 border-[#1E3A63] text-[#647A9E] cursor-not-allowed opacity-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-['Cinzel'] font-black text-xs text-[#F2F7FF] truncate flex items-center gap-1.5">
                                {tech.limb === 'legs' ? (
                                  <Footprints className="w-3.5 h-3.5 text-[#38D9F5] shrink-0" />
                                ) : (
                                  <Hand className="w-3.5 h-3.5 text-[#F43F5E] shrink-0" />
                                )}
                                {tech.name}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold tabular-nums ${
                                  isWeaknessMatch ? 'text-[#FBBF24]' : 'text-[#94A8C7]'
                                }`}
                              >
                                {cost} STAM
                              </span>
                            </div>

                            <p className="text-[11px] text-[#94A8C7] line-clamp-1">{tech.combatEffect}</p>

                            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                              <span className="text-[#647A9E]">
                                {tech.exerciseInspiration} · {badge.label}
                              </span>
                              {isWeaknessMatch && (
                                <span className="text-[#FBBF24] font-bold">1.8x - 2.0x BONUS</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Combat Logs Console */}
                <div className="p-4 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto">
                  {combatLogs.map((log, idx) => (
                    <p
                      key={idx}
                      className={idx === 0 ? 'text-[#38D9F5] font-bold' : 'text-[#94A8C7]'}
                    >
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 4. VICTORY SCREEN */}
            {battleState === 'VICTORY' && (
              <div className="lq-card-gold rounded-2xl p-6 sm:p-8 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F59E0B]/18 text-[#FBBF24] flex items-center justify-center border border-[#F59E0B]/55">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#F59E0B] font-['Cinzel'] block">
                    Strategic Encounter Cleared
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
                    VICTORY! {boss.name.toUpperCase()} PURIFIED
                  </h3>
                  <p className="text-xs sm:text-sm text-[#94A8C7] max-w-md mx-auto mt-1">
                    Through strategic weakness exploitation and disciplined defenses, the Void corruption in {activeKingdom.name} has been banished!
                  </p>
                </div>

                <div className="lq-surface grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto p-4 rounded-xl text-xs font-mono tabular-nums">
                  <div>
                    <span className="text-[10px] text-[#94A8C7] uppercase block">Turns Taken</span>
                    <span className="text-base font-bold text-[#F2F7FF]">
                      <AnimatedCounter value={battleStats.turns} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#F59E0B] uppercase block">Weakness Hits</span>
                    <span className="text-base font-bold text-[#FBBF24]">
                      <AnimatedCounter value={battleStats.weaknessHits} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#38D9F5] uppercase block">Avoided / Guarded</span>
                    <span className="text-base font-bold text-[#38D9F5]">
                      <AnimatedCounter value={battleStats.attacksAvoided} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#10B981] uppercase block">Damage Dealt</span>
                    <span className="text-base font-bold text-[#10B981]">
                      <AnimatedCounter value={battleStats.damageDealt} />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto bg-[#061225] p-3 rounded-xl border border-[#F59E0B]/35 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-[10px] text-[#94A8C7] uppercase block">Player XP</span>
                    <span className="text-lg font-bold text-[#38D9F5]">+{boss.rewardPlayerXp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94A8C7] uppercase block">Aether Pts</span>
                    <span className="text-lg font-bold text-[#F2F7FF]">+60</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetBossBattle(activeKingdom.id);
                      setBattleState('PREP');
                      sound.playClick();
                    }}
                    className="lq-btn lq-btn-secondary px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Challenge Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('storyline')}
                    className="lq-btn lq-btn-gold px-6 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs cursor-pointer"
                  >
                    Advance Realm Storyline
                  </button>
                </div>
              </div>
            )}

            {/* 5. DEFEAT SCREEN */}
            {battleState === 'DEFEAT' && (
              <div className="lq-card rounded-2xl border border-[#F43F5E]/55 p-6 sm:p-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F43F5E]/15 text-[#F43F5E] flex items-center justify-center border border-[#F43F5E]/50">
                  <Skull className="w-7 h-7" />
                </div>

                <h3 className="text-2xl font-black font-['Cinzel'] text-[#F43F5E]">
                  DEFEATED BY {boss.name.toUpperCase()}
                </h3>

                <div className="lq-surface max-w-md mx-auto p-4 rounded-xl text-xs text-[#94A8C7] text-left space-y-2">
                  <span className="font-bold text-[#38D9F5] font-['Cinzel'] block">
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
                      <strong className="text-[#F2F7FF]">Manage Stamina:</strong> Don&apos;t deplete all stamina on abilities; standard attacks restore +25 STAM.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetBossBattle(activeKingdom.id);
                      setBattleState('PREP');
                      sound.playClick();
                    }}
                    className="lq-btn lq-btn-gold px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Retry Encounter
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fitness')}
                    className="lq-btn lq-btn-secondary px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Train Bodyweight Strength
                  </button>
                </div>
              </div>
            )}

            {/* 6. WEAKNESS DISCOVERY & CLUE MODAL */}
            <RpgModalWrapper
              isOpen={showLoreClueModal}
              onClose={() => setShowLoreClueModal(false)}
              panelClassName="w-full max-w-lg"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Archival Weakness Clue"
                className="lq-card-gold rounded-2xl p-6 sm:p-7 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#1E3A63] pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#38D9F5]" />
                    <h3 className="font-['Cinzel'] font-black text-lg text-[#F2F7FF]">
                      ARCHIVAL WEAKNESS CLUE
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLoreClueModal(false)}
                    aria-label="Close weakness dossier"
                    className="text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#061225] border border-[#F43F5E]/40 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-[#38D9F5] font-bold block">
                    Storyline Intel · {boss.name}
                  </span>
                  <p className="text-xs text-[#94A8C7] leading-relaxed italic">
                    &ldquo;{boss.weakness?.clue}&rdquo;
                  </p>
                </div>

                <div className="lq-surface p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#94A8C7] font-mono block">Bestiary Status:</span>
                    <span className={`text-xs font-bold ${boss.weakness?.discovered ? 'text-[#10B981]' : 'text-[#38D9F5]'}`}>
                      {boss.weakness?.discovered
                        ? `Discovered: ${boss.weakness.element} Element (${boss.weakness.damageMultiplier}x)`
                        : 'Hidden in Bestiary'}
                    </span>
                  </div>

                  {!boss.weakness?.discovered ? (
                    <button
                      type="button"
                      onClick={handleUnlockWeakness}
                      className="lq-btn lq-btn-gold px-4 py-2 rounded-xl font-['Cinzel'] font-black text-xs cursor-pointer"
                    >
                      DECRYPT WEAKNESS
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-[#10B981] font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Ready for Combat
                    </span>
                  )}
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowLoreClueModal(false)}
                    className="lq-btn lq-btn-secondary px-6 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Return to Chamber
                  </button>
                </div>
              </div>
            </RpgModalWrapper>
          </div>
        )}
      </RpgSubTabTransition>
    </div>
  );
};
