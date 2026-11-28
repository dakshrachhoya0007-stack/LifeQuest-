import { PlayableHeroDefinition, PlayableHeroId, RpgAttributeKey } from '../types/game';

export const RPG_ATTRIBUTE_META: Array<{
  key: RpgAttributeKey;
  label: string;
  shortLabel: string;
  description: string;
  realLifeSource: string;
  accentHex: string;
}> = [
  {
    key: 'strength',
    label: 'Strength',
    shortLabel: 'STR',
    description: 'Governs unarmed strike force and heavy bodyweight power.',
    realLifeSource: 'Strength training, pushups, squats & Aether Vision reps',
    accentHex: '#F43F5E',
  },
  {
    key: 'discipline',
    label: 'Discipline',
    shortLabel: 'DIS',
    description: 'Steadfast willpower that unlocks ancient vows and honor trials.',
    realLifeSource: 'Daily habit consistency, streaks & claimed quest bounties',
    accentHex: '#F59E0B',
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    shortLabel: 'INT',
    description: 'Tactical clarity and arcane perception across corrupted realms.',
    realLifeSource: 'Mindfulness, study habits & Aether Vision meal/form scans',
    accentHex: '#00D9FF',
  },
  {
    key: 'vitality',
    label: 'Vitality',
    shortLabel: 'VIT',
    description: 'Enduring life-force built through nourishment and hydration.',
    realLifeSource: 'Balanced meals logged, hydration glasses & recovery habits',
    accentHex: '#10B981',
  },
  {
    key: 'agility',
    label: 'Agility',
    shortLabel: 'AGI',
    description: 'Swift footwork, evade windows and critical leg-work tempo in battle.',
    realLifeSource: 'Running, walking, cycling, lunges & jumping jacks',
    accentHex: '#38D9F5',
  },
  {
    key: 'resilience',
    label: 'Resilience',
    shortLabel: 'RES',
    description: 'Unbreakable physical conditioning against Void corruption and boss strikes.',
    realLifeSource: 'Multi-day streaks, core conditioning & boss victories',
    accentHex: '#1677FF',
  },
];

export const PLAYABLE_HEROES: PlayableHeroDefinition[] = [
  {
    id: 'fallen_knight',
    name: 'The Fallen Knight',
    title: 'Oathbreaker of the Shattered Keep',
    mappedClass: 'Warrior',
    archetype: 'Vanguard Bodyweight Brawler',
    greatFallOrigin:
      'Once commander of the High Citadel Guard, he stood at the eastern gate when the sky fractured during The Great Fall. Stripped of banner and crest beneath collapsing towers, he awakens in the ashes sworn to rebuild Aetheria through sheer physical discipline.',
    roleSummary:
      'Central protagonist. Balanced frontline powerhouse built around heavy gauntleted hand strikes, thunderous kicks, and relentless bodyweight training.',
    bodyweightDisciplines: {
      conditioningStyle: 'Pushup & Core Calisthenics Brawler',
      handsFocus: 'Power Palm & Knuckle Strikes',
      legsFocus: 'Stance-Breaking Heel & Squat Kicks',
    },
    attributeFocus: ['strength', 'resilience', 'discipline'],
    abilities: [
      {
        name: 'Oathbreaker Knuckle Drive',
        description: 'Heavy driving palm and fist strike amplified by consecutive upper-body bodyweight training sessions.',
      },
      {
        name: 'Citadel Stance Guard',
        description: 'Braces core, forearms, and shins to absorb heavy boss telegraphs while converting habit streaks into defensive resolve.',
      },
    ],
    strengths: [
      'Bonus Strength (+2) & Resilience (+2) affinity from day one',
      'Dominates calisthenics, pushup/squat sets, and frontline boss combat',
      'Heavy-impact hand and leg strikes scale directly with bodyweight conditioning',
    ],
    accentHex: '#F59E0B',
    secondaryHex: '#1677FF',
    introFlourishLabel: 'Iron-Knuckle Salute',
  },
  {
    id: 'shadowblade',
    name: 'The Nightstriker',
    title: 'Whisper of the Sunken Cloister',
    mappedClass: 'Ranger',
    archetype: 'Agile Kick & Palm Tactician',
    greatFallOrigin:
      'A covert scout of the Silver Watch who survived the Fall by vaulting through the collapsing catacombs beneath the citadel. Returning to surface ruins, she relies solely on lightning-fast footwork, sweeping kicks, and open-hand strikes.',
    roleSummary:
      'Agile nocturnal specialist excelling in high-tempo legwork, explosive kicks, critical precision, and swift daily execution.',
    bodyweightDisciplines: {
      conditioningStyle: 'High-Tempo Lunge & Plyo Tactician',
      handsFocus: 'Precision Open-Hand & Ridge Strikes',
      legsFocus: 'Swift Roundhouse & Sweeping Kicks',
    },
    attributeFocus: ['agility', 'intelligence', 'strength'],
    abilities: [
      {
        name: 'Amethyst Roundhouse Flurry',
        description: 'Rapid kick-and-palm combo that builds high critical strike momentum in turn-based duels.',
      },
      {
        name: 'Catacomb Footwork Step',
        description: 'Precision evade timing fueled by brisk cardio, lunges, and daily speed habits.',
      },
    ],
    strengths: [
      'Bonus Agility (+2) for superior evade grace & critical tempo',
      'Excels at high-cadence interval training, mobility, and daily streaks',
      'High critical kick precision against Void Sovereign phases',
    ],
    accentHex: '#00D9FF',
    secondaryHex: '#F59E0B',
    introFlourishLabel: 'Swift Stance Cross Flourish',
  },
  {
    id: 'arcane_mage',
    name: 'The Arcane Channeler',
    title: 'Keeper of the Unsealed Archive',
    mappedClass: 'Mage',
    archetype: 'Unarmed Aether Conduit',
    greatFallOrigin:
      'An elder archivist who held back the first wave of Void rift-fire inside the Royal Conservatory until his own tower crumbled. Focusing breath, posture, and open-palm forms, he channels pure focus and elemental energy through bare hands and steady stance.',
    roleSummary:
      'Scholarly martial mystic scaling with mindful habits, focused recovery, nutrition awareness, and elemental palm-and-kick forms.',
    bodyweightDisciplines: {
      conditioningStyle: 'Mindful Breath & Posture Martial Flow',
      handsFocus: 'Elemental Open-Palm Energy Strikes',
      legsFocus: 'Grounding Stance & Mobility Kicks',
    },
    attributeFocus: ['intelligence', 'vitality', 'discipline'],
    abilities: [
      {
        name: 'Crown Star Palm Invocation',
        description: 'Channels elemental energy through focused open-hand strikes to exploit boss weaknesses.',
      },
      {
        name: 'Conservatory Posture Ward',
        description: 'Channels mindfulness rituals, hydration, and balanced nutrition into sustained combat stamina.',
      },
    ],
    strengths: [
      'Highest Intelligence affinity (+3) for tactical weak-point mastery',
      'Scales smoothly with mindfulness, study, and nutrition logging',
      'Amplified elemental hand-and-leg technique power',
    ],
    accentHex: '#1677FF',
    secondaryHex: '#FBBF24',
    introFlourishLabel: 'Astral Open-Palm Invocation',
  },
  {
    id: 'ranger',
    name: 'The Outrider',
    title: 'Pathfinder of the Thornwood',
    mappedClass: 'Ranger',
    archetype: 'Endurance Kick-Striker',
    greatFallOrigin:
      'Guardian of Aetheria’s outer borderlands who outran the encroaching corruption days before the Fall struck the capital. Conditioned by endless mountain trails, he turns stamina, squats, and driving kicks into unstoppable momentum.',
    roleSummary:
      'Endurance specialist built for outdoor cardio, mobility drills, steady nutrition habits, and powerful leg-driven combat.',
    bodyweightDisciplines: {
      conditioningStyle: 'Endurance Stride & Squat Conditioning',
      handsFocus: 'Momentum Jab & Parry Combinations',
      legsFocus: 'Driving Knee & Crescent Trail Kicks',
    },
    attributeFocus: ['agility', 'vitality', 'resilience'],
    abilities: [
      {
        name: 'Thornwood Tempest Kick',
        description: 'Flying knee and crescent kick combo that shatters enemy guard through raw leg power.',
      },
      {
        name: 'Pathfinder Endurance',
        description: 'Turns walking, running, and cycling distance into steady Vitality & stamina.',
      },
    ],
    strengths: [
      'Balanced Agility (+2) & Vitality (+1) affinity for endurance athletes',
      'Rewards outdoor steps, running, cycling, squats, and wholesome fueling',
      'Relentless leg-strike impact and mobility',
    ],
    accentHex: '#10B981',
    secondaryHex: '#F59E0B',
    introFlourishLabel: 'Thornwood Stride Stance',
  },
  {
    id: 'paladin',
    name: 'The Paladin',
    title: 'Standard-Bearer of the Dawn',
    mappedClass: 'Guardian',
    archetype: 'Iron-Body Sentinel',
    greatFallOrigin:
      'One of the few temple sentinels whose resolve held firm when the Vault of Light shattered. Relying strictly on disciplined bodyweight conditioning, iron-braced forearms, and grounded stances, she stands as a living beacon of restoration.',
    roleSummary:
      'Steadfast protector specializing in unshakeable streaks, restorative balance, braced forearm guards, and sustained close-quarters combat.',
    bodyweightDisciplines: {
      conditioningStyle: 'Core Stability & Iron-Body Conditioning',
      handsFocus: 'Forearm Brace & Solar Fist Counters',
      legsFocus: 'Rooted Stance & Heavy Heel Drives',
    },
    attributeFocus: ['resilience', 'discipline', 'vitality'],
    abilities: [
      {
        name: 'Dawncrest Forearm Guard',
        description: 'Raises a disciplined iron-arm guard stance that neutralizes lethal boss attacks.',
      },
      {
        name: 'Vow of Renewal',
        description: 'Strengthens physical resilience through sleep recovery, hydration, and unwavering habits.',
      },
    ],
    strengths: [
      'Elite Resilience (+2) & Discipline (+1) affinity for long streaks',
      'Thrives on restful sleep, recovery consistency, and full-body bodyweight work',
      'Highest survivability in multi-phase Void Sovereign battles',
    ],
    accentHex: '#FBBF24',
    secondaryHex: '#F43F5E',
    introFlourishLabel: 'Dawn-Guard Stance Oath',
  },
];

export const getHeroById = (id?: PlayableHeroId | string | null): PlayableHeroDefinition => {
  return PLAYABLE_HEROES.find(h => h.id === id) || PLAYABLE_HEROES[0];
};

export const mapClassToDefaultHeroId = (characterClass?: string): PlayableHeroId => {
  switch (characterClass) {
    case 'Mage':
      return 'arcane_mage';
    case 'Ranger':
      return 'ranger';
    case 'Guardian':
      return 'paladin';
    case 'Warrior':
    default:
      return 'fallen_knight';
  }
};
