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
