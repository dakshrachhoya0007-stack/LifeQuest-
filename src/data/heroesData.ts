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
    description: 'Governs physical strike force and heavy weapon mastery.',
    realLifeSource: 'Strength training, pushups, squats & Aether Vision reps',
    accentHex: '#D97745',
  },
  {
    key: 'discipline',
    label: 'Discipline',
    shortLabel: 'DIS',
    description: 'Steadfast willpower that unlocks ancient vows and honor trials.',
    realLifeSource: 'Daily habit consistency, streaks & claimed quest bounties',
    accentHex: '#C5A15A',
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    shortLabel: 'INT',
    description: 'Tactical clarity and arcane perception across corrupted realms.',
    realLifeSource: 'Mindfulness, study habits & Aether Vision meal/form scans',
    accentHex: '#7046A5',
  },
  {
    key: 'vitality',
    label: 'Vitality',
    shortLabel: 'VIT',
    description: 'Enduring life-force forged through nourishment and hydration.',
    realLifeSource: 'Balanced meals logged, hydration glasses & recovery habits',
    accentHex: '#4E9F76',
  },
  {
    key: 'agility',
    label: 'Agility',
    shortLabel: 'AGI',
    description: 'Swift footwork, evade windows and critical tempo in battle.',
    realLifeSource: 'Running, walking, cycling, lunges & jumping jacks',
    accentHex: '#569EC4',
  },
  {
    key: 'resilience',
    label: 'Resilience',
    shortLabel: 'RES',
    description: 'Unbreakable resolve against Void corruption and boss strikes.',
    realLifeSource: 'Multi-day streaks, shield/armour upgrades & boss victories',
    accentHex: '#B68A4C',
  },
];

export const PLAYABLE_HEROES: PlayableHeroDefinition[] = [
  {
    id: 'fallen_knight',
    name: 'The Fallen Knight',
    title: 'Oathbreaker of the Shattered Keep',
    mappedClass: 'Warrior',
    archetype: 'Vanguard Greatsword',
    greatFallOrigin:
      'Once commander of the High Citadel Guard, he stood at the eastern gate when the sky fractured during The Great Fall. Stripped of banner and crest beneath collapsing towers, he awakens in the ashes sworn to rebuild Aetheria stone by stone.',
    roleSummary:
      'Central protagonist. Balanced frontline powerhouse built around heavy steel defense and relentless physical training.',
    startingEquipment: ['Battle-Scarred Steel Armor', 'Tattered Royal Cape', 'Forged Longsword'],
    attributeFocus: ['strength', 'resilience', 'discipline'],
    abilities: [
      {
        name: 'Oathbreaker Cleave',
        description: 'Sweeping rune-greatsword strike amplified by consecutive strength training sessions.',
      },
      {
        name: 'Citadel Bastion',
        description: 'Absorbs heavy boss telegraphs while converting habit streaks into defensive resolve.',
      },
    ],
    strengths: [
      'Bonus Strength (+2) & Resilience (+2) affinity from day one',
      'Dominates calisthenics, resistance sets, and frontline boss combat',
      'Fastest weapon tempering synergy with Swords & Greatswords',
    ],
    accentHex: '#C5A15A',
    secondaryHex: '#6F4A9E',
    introFlourishLabel: 'Oath-Blade Salute',
  },
  {
    id: 'shadowblade',
    name: 'The Shadowblade',
    title: 'Whisper of the Sunken Cloister',
    mappedClass: 'Ranger',
    archetype: 'Twin-Blade Assassin',
    greatFallOrigin:
      'A covert scout of the Silver Watch who survived the Fall by slipping through the collapsing catacombs beneath the citadel. She returned to surface ruins bearing stolen Void ciphers and twin obsidian-edged daggers.',
    roleSummary:
      'Agile nocturnal specialist excelling in high tempo movement, critical precision, and swift daily execution.',
    startingEquipment: ['Nightweave Assassin Cowl', 'Lightweight Shadow Leather', 'Dual Curved Blades'],
    attributeFocus: ['agility', 'intelligence', 'strength'],
    abilities: [
      {
        name: 'Amethyst Flurry',
        description: 'Rapid twin-dagger combo that builds high critical strike momentum in turn-based duels.',
      },
      {
        name: 'Catacomb Step',
        description: 'Precision dodge timing fueled by brisk cardio, lunges, and daily speed habits.',
      },
    ],
    strengths: [
      'Bonus Agility (+2) for superior evade grace & critical tempo',
      'Excels at high-cadence interval training, mobility, and daily streaks',
      'High critical precision synergy against Void Sovereign phases',
    ],
    accentHex: '#8E63C6',
    secondaryHex: '#2C223D',
    introFlourishLabel: 'Twin-Fang Cross Flourish',
  },
  {
    id: 'arcane_mage',
    name: 'The Arcane Mage',
    title: 'Keeper of the Unsealed Archive',
    mappedClass: 'Mage',
    archetype: 'Aether Crystal Conduit',
    greatFallOrigin:
      'An elder archivist who held back the first wave of Void rift-fire inside the Royal Conservatory until his own tower crumbled. Armed with a staff holding an unbroken shard of the Crown Star, he channels pure knowledge into renewal.',
    roleSummary:
      'Scholarly spellcaster scaling with mindful habits, focused recovery, nutrition awareness, and tactical weak-point discovery.',
    startingEquipment: ['Enchanted Royal Robes', 'Archivist Runic Mantle', 'Crystal-Crowned Staff'],
    attributeFocus: ['intelligence', 'vitality', 'discipline'],
    abilities: [
      {
        name: 'Crown Star Invocation',
        description: 'Exploits elemental boss weaknesses with amplified arcane burst scaling.',
      },
      {
        name: 'Conservatory Ward',
        description: 'Channels mindfulness rituals, hydration, and balanced nutrition into sustained mana.',
      },
    ],
    strengths: [
      'Highest Intelligence affinity (+3) for tactical weak-point mastery',
      'Scales smoothly with mindfulness, study, and nutrition logging',
      'Superior elemental ability scaling with Magic Staffs',
    ],
    accentHex: '#5BB4E5',
    secondaryHex: '#7046A5',
    introFlourishLabel: 'Astral Crystal Invocation',
  },
  {
    id: 'ranger',
    name: 'The Ranger',
    title: 'Pathfinder of the Thornwood',
    mappedClass: 'Ranger',
    archetype: 'Longbow Outrider',
    greatFallOrigin:
      'Guardian of Aetheria’s outer borderlands who tracked the encroaching corruption days before the Fall struck the capital. Carrying a yew longbow and tattered signal cloak, he guides survivors back toward the ruined castle.',
    roleSummary:
      'Endurance tracker built for outdoor cardio, mobility drills, steady nutrition habits, and ranged precision.',
    startingEquipment: ['Forest Leather Cuirass', 'Woodland Cloak & Quiver', 'Carved Yew Longbow'],
    attributeFocus: ['agility', 'vitality', 'resilience'],
    abilities: [
      {
        name: 'Thornwood Volley',
        description: 'Piercing longbow barrage that bypasses enemy armor plating from afar.',
      },
      {
        name: 'Pathfinder Endurance',
        description: 'Turns walking, running, and cycling distance into steady Vitality & stamina.',
      },
    ],
    strengths: [
      'Balanced Agility (+2) & Vitality (+1) affinity for endurance athletes',
      'Rewards outdoor steps, running, cycling, and wholesome fueling',
      'Deadly armor-piercing precision with Bows & Crossbows',
    ],
    accentHex: '#5BA375',
    secondaryHex: '#A67C46',
    introFlourishLabel: 'Woodland Longbow Draw',
  },
  {
    id: 'paladin',
    name: 'The Paladin',
    title: 'Standard-Bearer of the Dawn',
    mappedClass: 'Guardian',
    archetype: 'Aegis Sentinel',
    greatFallOrigin:
      'One of the few temple sentinels whose golden crest refused to tarnish when the Vault of Light shattered. Bearing shield and oath into the ruined courtyard, she stands as a living beacon of discipline and steady restoration.',
    roleSummary:
      'Steadfast protector specializing in unshakeable streaks, restorative balance, defensive bastion crafting, and sustained combat.',
    startingEquipment: ['Silver-Gold Plate Armor', 'Dawncrest Kite Shield', 'Sunforged Broadsword'],
    attributeFocus: ['resilience', 'discipline', 'vitality'],
    abilities: [
      {
        name: 'Dawncrest Aegis',
        description: 'Raises a radiant golden ward that neutralizes lethal boss attacks.',
      },
      {
        name: 'Vow of Renewal',
        description: 'Strengthens armor defense through sleep recovery, hydration, and unwavering habits.',
      },
    ],
    strengths: [
      'Elite Resilience (+2) & Discipline (+1) affinity for long streaks',
      'Thrives on restful sleep, recovery consistency, and shield craft',
      'Highest survivability in multi-phase Void Sovereign battles',
    ],
    accentHex: '#D8B36A',
    secondaryHex: '#D9D2C5',
    introFlourishLabel: 'Sun-Crest Shield Oath',
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
