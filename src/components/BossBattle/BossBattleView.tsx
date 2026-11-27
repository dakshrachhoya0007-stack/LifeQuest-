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
    auraColor: currentPhaseNumber === 3 ? 'text-[#D65C66]' : currentPhaseNumber === 2 ? 'text-[#E8C777]' : 'text-[#9A72CC]',
  };

  // Helper for elemental icon
  const getElementBadge = (element: ElementType) => {
    switch (element) {
      case 'Fire':
        return { label: 'Fire', color: 'bg-[#171220] border-[#D65C66] text-[#D65C66]', icon: <Flame className="w-3.5 h-3.5 text-[#D65C66]" /> };
      case 'Water':
        return { label: 'Water', color: 'bg-[#171220] border-[#9A72CC] text-[#9A72CC]', icon: <Droplets className="w-3.5 h-3.5 text-[#9A72CC]" /> };
      case 'Ice':
        return { label: 'Ice', color: 'bg-[#171220] border-[#A69AAF] text-[#F2EDF7]', icon: <Wind className="w-3.5 h-3.5 text-[#A69AAF]" /> };
      case 'Lightning':
        return { label: 'Lightning', color: 'bg-[#171220] border-[#D6A84B] text-[#E8C777]', icon: <Zap className="w-3.5 h-3.5 text-[#E8C777]" /> };
      case 'Light':
        return { label: 'Light', color: 'bg-[#171220] border-[#E8C777] text-[#E8C777]', icon: <Sun className="w-3.5 h-3.5 text-[#E8C777]" /> };
      case 'Void':
        return { label: 'Void', color: 'bg-[#100D18] border-[#7045A0] text-[#9A72CC]', icon: <Moon className="w-3.5 h-3.5 text-[#9A72CC]" /> };
      case 'Nature':
        return { label: 'Nature', color: 'bg-[#171220] border-[#49B88A] text-[#49B88A]', icon: <Sparkles className="w-3.5 h-3.5 text-[#49B88A]" /> };
      case 'Earth':
        return { label: 'Earth', color: 'bg-[#171220] border-[#D6A84B] text-[#D6A84B]', icon: <Dumbbell className="w-3.5 h-3.5 text-[#D6A84B]" /> };
      case 'Wind':
        return { label: 'Wind', color: 'bg-[#171220] border-[#49B88A] text-[#49B88A]', icon: <Wind className="w-3.5 h-3.5 text-[#49B88A]" /> };
      case 'Shadow':
        return { label: 'Shadow', color: 'bg-[#171220] border-[#7045A0] text-[#A69AAF]', icon: <Moon className="w-3.5 h-3.5 text-[#A69AAF]" /> };
      case 'Arcane':
        return { label: 'Arcane', color: 'bg-[#171220] border-[#9A72CC] text-[#9A72CC]', icon: <Sparkles className="w-3.5 h-3.5 text-[#9A72CC]" /> };
      case 'Cosmic':
        return { label: 'Cosmic', color: 'bg-[#100D18] border-[#E8C777] text-[#E8C777]', icon: <CloudLightning className="w-3.5 h-3.5 text-[#E8C777]" /> };
      default:
        return { label: 'Physical', color: 'bg-[#171220] border-[#362B45] text-[#A69AAF]', icon: <Hand className="w-3.5 h-3.5 text-[#A69AAF]" /> };
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
      colors: ['#D65C66', '#D6A84B', '#E8C777'],
    });
  };

  const bossWeaknessBadge = boss.weakness ? getElementBadge(boss.weakness.element) : null;
  const bossResistanceBadge = boss.resistance ? getElementBadge(boss.resistance.element) : null;

  return (
    <div className="space-y-6 pb-12 max-w-[1360px] mx-auto">
      {/* Mode Switcher: Weekly Community Raid vs Kingdom Story Bosses */}
      <div className="lq-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5">
        <div className="flex items-center gap-2 px-2">
          <Dumbbell className="w-4 h-4 text-[#D65C66]" />
          <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#E8C777]">
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
                    <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#D65C66]">
                      Strategic Kingdom Encounters
                    </span>
                    <span className="text-[#766D82]" aria-hidden="true">·</span>
                    <span className="text-[#E8C777] font-semibold">{activeKingdom.name}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7]">
                    Kingdom Boss Encounters
                  </h1>
                  <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
                    Exploit elemental weaknesses, manage stamina, respond to telegraphed attack warnings, and weather 3 boss phases.
                  </p>
                </div>

                {/* Kingdom Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-[#100D18] rounded-xl border border-[#362B45] overflow-x-auto max-w-full">
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
                          ? 'text-[#A69AAF] hover:text-[#F2EDF7] hover:bg-[#21152F] cursor-pointer'
                          : 'text-[#766D82] cursor-not-allowed'
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171220] via-[#100D18]/45 to-transparent" />

                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="bg-[#100D18]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#E8C777] border border-[#D6A84B]/45">
                        {boss.difficulty} Difficulty
                      </span>
                      <span className="bg-[#100D18]/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-[#D65C66] border border-[#D65C66]/45">
                        3 Boss Phases
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleInspectClue}
                      className="lq-btn lq-btn-secondary absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#D6A84B]" />
                      <span>Weakness Dossier</span>
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-['Cinzel'] font-black text-2xl text-[#F2EDF7]">{boss.name}</h3>
                      <p className="text-xs text-[#E8C777] font-medium">{boss.title}</p>
                    </div>

                    <p className="lq-surface p-3 rounded-xl text-xs text-[#A69AAF] leading-relaxed italic">
                      &ldquo;{boss.lore}&rdquo;
                    </p>

                    {/* Vitals Grid */}
                    <div className="lq-surface grid grid-cols-3 gap-3 p-3 rounded-xl text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-[10px] text-[#A69AAF] uppercase block">Max Health</span>
                        <span className="text-[#D65C66] font-bold">{boss.maxHealth} HP</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A69AAF] uppercase block">Base Attack</span>
                        <span className="text-[#E8C777] font-bold">{boss.attack} ATK</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A69AAF] uppercase block">Armor Def</span>
                        <span className="text-[#9A72CC] font-bold">{boss.defense} DEF</span>
                      </div>
                    </div>

                    {/* TACTICAL PROFILE */}
                    <div className="space-y-3 pt-2 border-t border-[#362B45]">
                      <span className="text-xs font-['Cinzel'] font-bold text-[#F2EDF7] uppercase tracking-wider block">
                        Tactical Reconnaissance Profile
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="lq-surface p-3 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[#A69AAF] font-mono">
                              Elemental Weakness
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                boss.weakness?.discovered ? 'text-[#49B88A]' : 'text-[#E8C777]'
                              }`}
                            >
                              {boss.weakness?.discovered ? 'DISCOVERED' : 'HIDDEN INTEL'}
                            </span>
                          </div>

                          {boss.weakness?.discovered ? (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                {bossWeaknessBadge?.icon}
                                <span className="font-bold text-[#F2EDF7] font-['Cinzel'] text-xs">
                                  {boss.weakness.element} Element ({boss.weakness.damageMultiplier}x Damage)
                                </span>
                              </div>
                              <p className="text-[11px] text-[#A69AAF] leading-tight">
                                {boss.weakness.description}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[#A69AAF] font-mono italic text-[11px] block">
                                ??? [Undiscovered Elemental Weakness]
                              </span>
                              <button
                                type="button"
                                onClick={handleInspectClue}
                                className="text-[10px] font-bold text-[#E8C777] hover:text-[#F2EDF7] underline block cursor-pointer"
                              >
                                Consult Archives to Reveal Clue →
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="lq-surface p-3 rounded-xl space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-[#A69AAF] font-mono block">
                            Damage Resistance
                          </span>
                          <div className="flex items-center gap-1.5 mb-1">
                            {bossResistanceBadge?.icon}
                            <span className="font-bold text-[#F2EDF7] font-['Cinzel'] text-xs">
                              {boss.resistance?.element} Element (-{boss.resistance?.damageReductionPercent}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A69AAF] leading-tight">
                            {boss.resistance?.description}
                          </p>
                        </div>
                      </div>

                      {boss.signatureAttack && (
                        <div className="p-3 rounded-xl bg-[#D65C66]/10 border border-[#D65C66]/40 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-[#D65C66] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#D65C66]" />
                              Telegraphed Signature: {boss.signatureAttack.name}
                            </span>
                            <span className="text-[10px] font-mono uppercase text-[#E8C777] font-bold">
                              Counter with {boss.signatureAttack.defenseResponse.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[#A69AAF] text-[11px] leading-tight">
                            {boss.signatureAttack.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Battle Prep & Champion Bodyweight Conditioning (5 Cols) */}
                <div className="lg:col-span-5 lq-card rounded-2xl p-6 space-y-5">
                  <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-[#D6A84B]" />
                    Hands &amp; Legs Bodyweight Readiness
                  </h4>

                  <div className="lq-surface p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A69AAF]">Combat Discipline</span>
                      <span className="text-[10px] uppercase font-bold text-[#E8C777]">
                        Hands &amp; Legs Only · {stats.aetherRank}
                      </span>
                    </div>

                    <div>
                      <h5 className="font-['Cinzel'] font-black text-base text-[#F2EDF7]">
                        {heroDef.bodyweightDisciplines.conditioningStyle}
                      </h5>
                      <p className="text-xs text-[#A69AAF] mt-0.5">
                        Bodyweight training builds strength through exercise — every strike comes from your hands and legs.
                      </p>

                      <div className="grid grid-cols-1 gap-1.5 mt-2.5 text-[11px] bg-[#100D18] border border-[#362B45] rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <Hand className="w-3.5 h-3.5 text-[#D65C66] shrink-0" />
                          <span className="text-[#A69AAF]">Hands:</span>
                          <span className="text-[#F2EDF7] font-medium">{heroDef.bodyweightDisciplines.handsFocus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Footprints className="w-3.5 h-3.5 text-[#D6A84B] shrink-0" />
                          <span className="text-[#A69AAF]">Legs:</span>
                          <span className="text-[#F2EDF7] font-medium">{heroDef.bodyweightDisciplines.legsFocus}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 mt-2 bg-[#100D18] border border-[#362B45] rounded-lg p-2 text-[10px] font-mono text-center tabular-nums">
                        <div>
                          <span className="text-[#A69AAF] block">STRIKE</span>
                          <span className="text-[#D65C66] font-bold">+{rawAtk}</span>
                        </div>
                        <div>
                          <span className="text-[#A69AAF] block">GUARD</span>
                          <span className="text-[#9A72CC] font-bold">+{rawDef}</span>
                        </div>
                        <div>
                          <span className="text-[#A69AAF] block">CRIT</span>
                          <span className="text-[#E8C777] font-bold">{critPercent}%</span>
                        </div>
                        <div>
                          <span className="text-[#A69AAF] block">REPS</span>
                          <span className="text-[#49B88A] font-bold">{stats.totalVerifiedReps}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bodyweight Techniques Preview */}
                    <div className="space-y-1.5 pt-2 border-t border-[#362B45]">
                      <span className="text-[10px] uppercase tracking-wider text-[#A69AAF] font-mono block">
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
                                  ? 'bg-[#21152F] border-[#D6A84B]/60 text-[#F2EDF7]'
                                  : 'bg-[#100D18] border-[#362B45] text-[#A69AAF]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {badge.icon}
                                <div className="min-w-0">
                                  <span className="font-['Cinzel'] font-bold text-[11px] text-[#F2EDF7] block truncate">
                                    {tech.name}
                                  </span>
                                  <span className="text-[10px] text-[#A69AAF] block truncate">
                                    {tech.limb === 'hands' ? 'Hands' : tech.limb === 'legs' ? 'Legs' : 'Hands & Legs'} · Built from {tech.exerciseInspiration}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isWeaknessMatch && (
                                  <span className="text-[9px] font-mono font-black text-[#E8C777]">
                                    WEAKNESS
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-[#A69AAF] tabular-nums">
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
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#D6A84B] mb-2 block">
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
                              ? 'lq-surface-gold text-[#F2EDF7]'
                              : 'lq-surface text-[#A69AAF] hover:text-[#F2EDF7]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className={`w-3.5 h-3.5 ${b.active ? 'text-[#E8C777]' : 'text-[#A69AAF]'}`} />
                            <span className="font-semibold">{b.name}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-[#E8C777] tabular-nums">
                            +{b.effectValue}% {b.effectType.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {battleError && (
                    <div className="p-2.5 rounded-xl bg-[#D65C66]/12 border border-[#D65C66]/45 text-xs text-[#D65C66] text-center">
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
                  <div className="lq-card-gold absolute top-4 inset-x-4 z-40 p-3 rounded-xl text-center font-['Cinzel'] font-black text-sm tracking-widest text-[#E8C777]">
                    {phaseAnnouncement}
                  </div>
                )}

                {isTelegraphWarningActive && boss.signatureAttack && (
                  <div className="p-4 rounded-xl bg-[#D65C66]/14 border-2 border-[#D65C66] space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#D65C66]" />
                        <span className="font-['Cinzel'] font-black text-sm text-[#F2EDF7] tracking-wide">
                          TELEGRAPHED ATTACK WARNING: {boss.signatureAttack.name.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-[#100D18] text-[#E8C777] font-black border border-[#D65C66]">
                        RECOMMENDED: {boss.signatureAttack.defenseResponse.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-[#F2EDF7]/90">
                      {boss.signatureAttack.warningText}
                    </p>
                  </div>
                )}

                {/* Combatants Dual Showcase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  {/* PLAYER HERO HUD */}
                  <div className="lq-surface p-5 rounded-2xl space-y-3 relative">
                    {lastBossDamage !== null && (
                      <div className="absolute top-2 right-4 text-2xl font-black font-mono text-[#D65C66]">
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
                          <h4 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">
                            {user?.characterName || user?.username || 'Hero of Aetheria'}
                          </h4>
                          <p className="text-xs text-[#D6A84B] font-mono">
                            Hands &amp; Legs · {heroDef.bodyweightDisciplines.conditioningStyle}
                          </p>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-center shrink-0 text-[#E8C777]">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#A69AAF] mb-1 font-mono tabular-nums">
                        <span>Player Vitality</span>
                        <span className="font-bold text-[#49B88A]">{playerCurrentHp} / {playerMaxHp} HP</span>
                      </div>
                      <AnimatedProgressBar
                        percentage={(playerCurrentHp / playerMaxHp) * 100}
                        className="w-full bg-[#100D18] h-2.5 rounded-full overflow-hidden border border-[#362B45]"
                        barClassName="bg-[#49B88A]"
                        shimmer={false}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#A69AAF] mb-1 font-mono tabular-nums">
                        <span className="flex items-center gap-1 text-[#D6A84B]">
                          <Zap className="w-3.5 h-3.5" /> Stamina
                        </span>
                        <span className="font-bold text-[#E8C777]">{playerStamina} / {playerMaxStamina} STAM</span>
                      </div>
                      <AnimatedProgressBar
                        percentage={(playerStamina / playerMaxStamina) * 100}
                        className="w-full bg-[#100D18] h-2.5 rounded-full overflow-hidden border border-[#362B45]"
                        barClassName="bg-gradient-to-r from-[#D6A84B] to-[#E8C777]"
                        shimmer={false}
                      />
                      <span className="text-[10px] text-[#766D82] font-mono mt-0.5 block">
                        +15 passive / +25 standard attack
                      </span>
                    </div>
                  </div>

                  {/* BOSS ENCOUNTER HUD */}
                  <div className="lq-surface p-5 rounded-2xl border border-[#D65C66]/45 space-y-3 relative">
                    {lastDamageDealt !== null && (
                      <div
                        className={`absolute top-2 right-4 text-2xl font-black font-mono ${
                          feedbackType === 'weakness'
                            ? 'text-[#E8C777]'
                            : feedbackType === 'crit'
                            ? 'text-[#D6A84B]'
                            : 'text-[#D65C66]'
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
                          className="w-14 h-14 rounded-xl object-cover border border-[#D65C66]"
                        />
                        <div>
                          <h4 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">{boss.name}</h4>
                          <p className="text-xs text-[#D65C66] font-mono">{boss.title}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-mono uppercase font-black ${currentPhaseInfo.auraColor}`}>
                          PHASE {currentPhaseNumber}: {currentPhaseInfo.name}
                        </span>
                        <span className="text-[10px] text-[#A69AAF] block mt-0.5 font-mono tabular-nums">
                          ATK x{currentPhaseInfo.attackMultiplier}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#A69AAF] mb-1 font-mono tabular-nums">
                        <span>Void Corruption Health</span>
                        <span className="font-bold text-[#D65C66]">{boss.health} / {boss.maxHealth} HP</span>
                      </div>
                      <AnimatedProgressBar
                        percentage={(boss.health / boss.maxHealth) * 100}
                        className="w-full bg-[#100D18] h-2.5 rounded-full overflow-hidden border border-[#362B45]"
                        barClassName="bg-gradient-to-r from-[#D65C66] to-[#D6A84B]"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-[10px] font-mono">
                      {boss.weakness && (
                        <span className={`flex items-center gap-1 ${boss.weakness.discovered ? 'text-[#E8C777]' : 'text-[#A69AAF]'}`}>
                          {boss.weakness.discovered ? (
                            <>
                              {bossWeaknessBadge?.icon}
                              <span>Weak: {boss.weakness.element} ({boss.weakness.damageMultiplier}x)</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3 h-3 text-[#A69AAF]" />
                              <span>Weakness: ???</span>
                            </>
                          )}
                        </span>
                      )}

                      {boss.resistance && (
                        <span className="text-[#A69AAF] flex items-center gap-1">
                          {bossResistanceBadge?.icon}
                          <span>Resist: {boss.resistance.element}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. FOUR STRATEGIC BODYWEIGHT COMBAT CHOICES */}
                <div className="lq-surface p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#362B45] pb-2">
                    <span className="text-xs uppercase font-['Cinzel'] font-black tracking-widest text-[#F2EDF7] flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-[#D6A84B]" />
                      Hands &amp; Legs Combat Actions (Turn {turnCount})
                    </span>
                    <span className="text-xs font-mono text-[#E8C777] font-bold tabular-nums">
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
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2EDF7] flex items-center gap-1.5">
                          <Hand className="w-4 h-4 text-[#D65C66]" />
                          STRIKE
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#49B88A]">
                          +25 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A69AAF]">
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
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2EDF7] flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-[#E8C777]" />
                          TECHNIQUE
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#E8C777]">
                          20-35 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A69AAF]">
                        Unleash a trained Hand or Leg strike to exploit boss weaknesses.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeCombatAction('defend')}
                      disabled={isAnimating || playerStamina < 15}
                      className={`p-3.5 rounded-xl border text-left transition-all group disabled:opacity-50 cursor-pointer ${
                        isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'defend'
                          ? 'lq-card-gold ring-2 ring-[#D6A84B]/80'
                          : 'lq-card lq-card-interactive'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Cinzel'] font-black text-xs text-[#F2EDF7] flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-[#9A72CC]" />
                          BRACE GUARD
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#9A72CC]">
                          15 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A69AAF]">
                        Root your stance with forearms &amp; core. Reduces damage by 80% against Ground Slams.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeCombatAction('dodge')}
                      disabled={isAnimating || playerStamina < 20}
                      className={`p-3.5 rounded-xl border text-left transition-all group disabled:opacity-50 cursor-pointer ${
                        isTelegraphWarningActive && boss.signatureAttack?.defenseResponse === 'dodge'
                          ? 'bg-[#49B88A]/18 border-[#49B88A] ring-2 ring-[#49B88A]/80'
                          : 'lq-card lq-card-interactive'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Cinzel'] font-black text-xs text-[#49B88A] flex items-center gap-1.5">
                          <Footprints className="w-4 h-4 text-[#49B88A]" />
                          FOOTWORK EVADE
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#49B88A]">
                          20 STAM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A69AAF]">
                        Agile leg step &amp; evasive roll. Avoids 100% damage from telegraphed ambushes.
                      </p>
                    </button>
                  </div>

                  {/* HANDS & LEGS BODYWEIGHT TECHNIQUE SELECTOR STRIP */}
                  <div className="pt-3 border-t border-[#362B45]">
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
                            type="button"
                            onClick={() => executeCombatAction('ability', tech)}
                            disabled={isAnimating || !isUnlocked || !hasEnoughStamina}
                            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                              isUnlocked && hasEnoughStamina
                                ? isWeaknessMatch
                                  ? 'lq-card-gold lq-card-interactive cursor-pointer'
                                  : 'lq-surface lq-card-interactive cursor-pointer'
                                : 'bg-[#100D18]/60 border-[#362B45] text-[#766D82] cursor-not-allowed opacity-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-['Cinzel'] font-black text-xs text-[#F2EDF7] truncate flex items-center gap-1.5">
                                {tech.limb === 'legs' ? (
                                  <Footprints className="w-3.5 h-3.5 text-[#D6A84B] shrink-0" />
                                ) : (
                                  <Hand className="w-3.5 h-3.5 text-[#D65C66] shrink-0" />
                                )}
                                {tech.name}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold tabular-nums ${
                                  isWeaknessMatch ? 'text-[#E8C777]' : 'text-[#A69AAF]'
                                }`}
                              >
                                {cost} STAM
                              </span>
                            </div>

                            <p className="text-[11px] text-[#A69AAF] line-clamp-1">{tech.combatEffect}</p>

                            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                              <span className="text-[#766D82]">
                                {tech.exerciseInspiration} · {badge.label}
                              </span>
                              {isWeaknessMatch && (
                                <span className="text-[#E8C777] font-bold">1.8x - 2.0x BONUS</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Combat Logs Console */}
                <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto">
                  {combatLogs.map((log, idx) => (
                    <p
                      key={idx}
                      className={idx === 0 ? 'text-[#E8C777] font-bold' : 'text-[#A69AAF]'}
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
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#D6A84B]/18 text-[#E8C777] flex items-center justify-center border border-[#D6A84B]/55">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#D6A84B] font-['Cinzel'] block">
                    Strategic Encounter Cleared
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7]">
                    VICTORY! {boss.name.toUpperCase()} PURIFIED
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A69AAF] max-w-md mx-auto mt-1">
                    Through strategic weakness exploitation and disciplined defenses, the Void corruption in {activeKingdom.name} has been banished!
                  </p>
                </div>

                <div className="lq-surface grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto p-4 rounded-xl text-xs font-mono tabular-nums">
                  <div>
                    <span className="text-[10px] text-[#A69AAF] uppercase block">Turns Taken</span>
                    <span className="text-base font-bold text-[#F2EDF7]">
                      <AnimatedCounter value={battleStats.turns} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#D6A84B] uppercase block">Weakness Hits</span>
                    <span className="text-base font-bold text-[#E8C777]">
                      <AnimatedCounter value={battleStats.weaknessHits} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9A72CC] uppercase block">Avoided / Guarded</span>
                    <span className="text-base font-bold text-[#9A72CC]">
                      <AnimatedCounter value={battleStats.attacksAvoided} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#49B88A] uppercase block">Damage Dealt</span>
                    <span className="text-base font-bold text-[#49B88A]">
                      <AnimatedCounter value={battleStats.damageDealt} />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto bg-[#100D18] p-3 rounded-xl border border-[#D6A84B]/35 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-[10px] text-[#A69AAF] uppercase block">Player XP</span>
                    <span className="text-lg font-bold text-[#E8C777]">+{boss.rewardPlayerXp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A69AAF] uppercase block">Aether Pts</span>
                    <span className="text-lg font-bold text-[#F2EDF7]">+60</span>
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
              <div className="lq-card rounded-2xl border border-[#D65C66]/55 p-6 sm:p-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D65C66]/15 text-[#D65C66] flex items-center justify-center border border-[#D65C66]/50">
                  <Skull className="w-7 h-7" />
                </div>

                <h3 className="text-2xl font-black font-['Cinzel'] text-[#D65C66]">
                  DEFEATED BY {boss.name.toUpperCase()}
                </h3>

                <div className="lq-surface max-w-md mx-auto p-4 rounded-xl text-xs text-[#A69AAF] text-left space-y-2">
                  <span className="font-bold text-[#E8C777] font-['Cinzel'] block">
                    Tactical Battle Debrief:
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-[11px] text-[#A69AAF]">
                    <li>
                      <strong className="text-[#F2EDF7]">Heed Telegraphed Warnings:</strong> Use <strong className="text-[#F2EDF7]">DEFEND</strong> against slams or <strong className="text-[#F2EDF7]">DODGE</strong> against ambushes when warnings appear.
                    </li>
                    <li>
                      <strong className="text-[#F2EDF7]">Exploit Weakness:</strong> {boss.name} is vulnerable to <strong className="text-[#F2EDF7]">{boss.weakness?.element}</strong> for massive bonus damage.
                    </li>
                    <li>
                      <strong className="text-[#F2EDF7]">Manage Stamina:</strong> Don&apos;t deplete all stamina on abilities; standard attacks restore +25 STAM.
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
                <div className="flex items-center justify-between border-b border-[#362B45] pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#D6A84B]" />
                    <h3 className="font-['Cinzel'] font-black text-lg text-[#F2EDF7]">
                      ARCHIVAL WEAKNESS CLUE
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLoreClueModal(false)}
                    aria-label="Close weakness dossier"
                    className="text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#100D18] border border-[#D65C66]/40 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-[#D6A84B] font-bold block">
                    Storyline Intel · {boss.name}
                  </span>
                  <p className="text-xs text-[#A69AAF] leading-relaxed italic">
                    &ldquo;{boss.weakness?.clue}&rdquo;
                  </p>
                </div>

                <div className="lq-surface p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#A69AAF] font-mono block">Bestiary Status:</span>
                    <span className={`text-xs font-bold ${boss.weakness?.discovered ? 'text-[#49B88A]' : 'text-[#E8C777]'}`}>
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
                    <span className="text-xs font-mono text-[#49B88A] font-semibold flex items-center gap-1">
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
