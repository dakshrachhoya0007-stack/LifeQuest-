import React from 'react';
import { AetherRankStage, WeaponRarity } from '../types/game';
import { getRarityStyle } from '../utils/rarityStyles';
import {
  NEW_WEAPON_ARTWORK_IDS,
  NewWeaponArtworkId,
  renderNewWeaponArtwork,
} from './artworkNewWeapons';

export type ArtworkItemId =
  | NewWeaponArtworkId
  | 'w-sword-1'
  | 'w-sword-2'
  | 'w-sword-3'
  | 'w-sword-4'
  | 'w-sword-5'
  | 'w-sword-shop-1'
  | 'w-sword-flame'
  | 'w-sword-frost'
  | 'w-sword-celestial'
  | 'w-staff-1'
  | 'w-staff-2'
  | 'w-staff-3'
  | 'w-staff-4'
  | 'w-staff-5'
  | 'w-staff-astral'
  | 'w-bow-1'
  | 'w-bow-2'
  | 'w-bow-3'
  | 'w-bow-4'
  | 'w-bow-5'
  | 'w-bow-shop-1'
  | 'w-shield-1'
  | 'w-shield-2'
  | 'w-shield-3'
  | 'w-shield-4'
  | 'w-shield-5'
  | 'w-shield-dragon'
  | 'armour-leather'
  | 'armour-silverguard'
  | 'armour-obsidian'
  | 'armour-sunforged'
  | 'helm-iron'
  | 'helm-shadow'
  | 'helm-archon'
  | 'acc-flame-ring'
  | 'acc-astral-amulet'
  | 'acc-celestial-signet'
  | 'shop-elixir-focus'
  | 'shop-elixir-vitality'
  | 'shop-catalyst-ember';

const SHOP_TO_ITEM_ID: Record<string, ArtworkItemId> = {
  'shop-weapon-obsidian-blade': 'w-sword-shop-1',
  'shop-weapon-storm-bow': 'w-bow-shop-1',
  'shop-weapon-flame-sword': 'w-sword-flame',
  'shop-weapon-frostblade': 'w-sword-frost',
  'shop-weapon-celestial-sword': 'w-sword-celestial',
  'shop-staff-astral': 'w-staff-astral',
  'shop-shield-dragon': 'w-shield-dragon',
  'shop-armour-leather': 'armour-leather',
  'shop-armour-silverguard': 'armour-silverguard',
  'shop-armour-obsidian': 'armour-obsidian',
  'shop-armour-sunforged': 'armour-sunforged',
  'shop-helm-iron': 'helm-iron',
  'shop-helm-shadow': 'helm-shadow',
  'shop-helm-archon': 'helm-archon',
  'shop-acc-flame-ring': 'acc-flame-ring',
  'shop-acc-astral-amulet': 'acc-astral-amulet',
  'shop-acc-celestial': 'acc-celestial-signet',
  'shop-gs-titan': 'w-gs-titan',
  'shop-gs-volcanic': 'w-gs-volcanic',
  'shop-dag-shadow': 'w-dag-shadow',
  'shop-dag-phantom': 'w-dag-phantom',
  'shop-dual-tempest': 'w-dual-tempest',
  'shop-dual-crimson': 'w-dual-crimson',
  'shop-xbow-arbalest': 'w-xbow-arbalest',
  'shop-xbow-thunder': 'w-xbow-thunder',
  'shop-wand-ember': 'w-wand-ember',
  'shop-wand-starweave': 'w-wand-starweave',
  'shop-spear-valkyrie': 'w-spear-valkyrie',
  'shop-spear-storm': 'w-spear-storm',
  'shop-axe-berserker': 'w-axe-berserker',
  'shop-axe-bloodmoon': 'w-axe-bloodmoon',
  'shop-ham-granite': 'w-ham-granite',
  'shop-ham-thunder': 'w-ham-thunder',
  'shop-scythe-dusk': 'w-scythe-dusk',
  'shop-scythe-eclipse': 'w-scythe-eclipse',
};

export const ALL_ARTWORK_IDS: ArtworkItemId[] = [
  'w-sword-1',
  'w-sword-2',
  'w-sword-3',
  'w-sword-4',
  'w-sword-5',
  'w-sword-shop-1',
  'w-sword-flame',
  'w-sword-frost',
  'w-sword-celestial',
  'w-staff-1',
  'w-staff-2',
  'w-staff-3',
  'w-staff-4',
  'w-staff-5',
  'w-staff-astral',
  'w-bow-1',
  'w-bow-2',
  'w-bow-3',
  'w-bow-4',
  'w-bow-5',
  'w-bow-shop-1',
  'w-shield-1',
  'w-shield-2',
  'w-shield-3',
  'w-shield-4',
  'w-shield-5',
  'w-shield-dragon',
  'armour-leather',
  'armour-silverguard',
  'armour-obsidian',
  'armour-sunforged',
  'helm-iron',
  'helm-shadow',
  'helm-archon',
  'acc-flame-ring',
  'acc-astral-amulet',
  'acc-celestial-signet',
  'shop-elixir-focus',
  'shop-elixir-vitality',
  'shop-catalyst-ember',
  ...NEW_WEAPON_ARTWORK_IDS,
];

export const resolveArtworkId = (itemId: string): ArtworkItemId => {
  if (itemId in SHOP_TO_ITEM_ID) {
    return SHOP_TO_ITEM_ID[itemId];
  }
  if ((ALL_ARTWORK_IDS as string[]).includes(itemId)) {
    return itemId as ArtworkItemId;
  }
  return 'w-sword-2';
};

interface EquipmentIllustrationProps {
  itemId: string;
  rarity?: WeaponRarity;
  level?: number;
  evolutionStage?: AetherRankStage;
  className?: string;
}

/**
 * Renders an original, transparent-background vector illustration uniquely sculpted for every item ID.
 * Silhouettes, materials, crossguards, crests, and tier tempering visuals differ distinctly per item.
 */
export const EquipmentIllustration: React.FC<EquipmentIllustrationProps> = ({
  itemId,
  rarity = 'Common',
  level = 1,
  evolutionStage = 'Dormant',
  className = 'w-full h-full',
}) => {
  const id = resolveArtworkId(itemId);
  const uid = React.useId().replace(/:/g, '');
  const rarityStyle = getRarityStyle(rarity);
  const isTempered = level >= 3;
  const isEvolved = evolutionStage !== 'Dormant';
  const stageGlowColor =
    evolutionStage === 'Transcendent'
      ? '#f472b6'
      : evolutionStage === 'Mythic'
      ? '#fbbf24'
      : evolutionStage === 'Ascended'
      ? '#38bdf8'
      : evolutionStage === 'Awakened'
      ? '#a855f7'
      : rarityStyle.accentHex;

  const renderShape = () => {
    const newWeaponShape = renderNewWeaponArtwork(id, uid);
    if (newWeaponShape) return newWeaponShape;

    switch (id) {
      // ============================================================
      // SWORDS (9 unique silhouettes & materials)
      // ============================================================
      case 'w-sword-1': // Rusted Sword — wide notched blade, bent guard, pitted patina
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-rust`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="55%" stopColor="#78716c" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>
            </defs>
            {/* Jagged notched blade */}
            <path
              d="M57 14 L64 6 L71 14 L70 30 L67 34 L70 39 L70 55 L66 58 L69 62 L69 80 L58 80 L58 46 L61 42 L57 38 Z"
              fill={`url(#${uid}-rust)`}
              stroke="#292524"
              strokeWidth="2"
            />
            {/* Oxidation blotches */}
            <circle cx="62" cy="30" r="2.2" fill="#7c2d12" opacity="0.7" />
            <circle cx="66" cy="52" r="2.6" fill="#9a3412" opacity="0.65" />
            <path d="M64 16 L64 76" stroke="#44403c" strokeWidth="1.5" strokeDasharray="4 3" />
            {/* Bent tarnished guard */}
            <path d="M44 79 Q64 84 84 77 L82 84 Q64 89 45 85 Z" fill="#57534e" stroke="#1c1917" strokeWidth="1.8" />
            {/* Frayed leather grip */}
            <rect x="60" y="84" width="8" height="22" rx="2" fill="#78350f" stroke="#292524" strokeWidth="1.5" />
            <path d="M59 89 L69 92 M59 95 L69 98 M59 101 L69 104" stroke="#451a03" strokeWidth="1.5" />
            {/* Pitted pommel */}
            <circle cx="64" cy="110" r="6" fill="#57534e" stroke="#1c1917" strokeWidth="1.8" />
          </g>
        );

      case 'w-sword-2': // Iron Sword — classic tapered arming sword, clean crossguard, hex pommel
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-ironL`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            <path d="M64 7 L71 22 L70 80 L58 80 L57 22 Z" fill={`url(#${uid}-ironL)`} stroke="#1e293b" strokeWidth="2" />
            <path d="M64 7 L64 78" stroke="#f8fafc" strokeWidth="1.4" opacity="0.7" />
            <rect x="62.5" y="24" width="3" height="46" rx="1.5" fill="#334155" />
            {/* Riveted steel crossguard */}
            <path d="M42 78 L86 78 L83 84 L45 84 Z" fill="#64748b" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="46" cy="81" r="2.2" fill="#cbd5e1" />
            <circle cx="82" cy="81" r="2.2" fill="#cbd5e1" />
            {/* Leather handle */}
            <rect x="60" y="84" width="8" height="22" rx="1.5" fill="#5c3a21" stroke="#1c1917" strokeWidth="1.5" />
            <path d="M60 90 L68 90 M60 96 L68 96 M60 102 L68 102" stroke="#92400e" strokeWidth="1.2" />
            {/* Hexagonal pommel */}
            <polygon points="64,106 71,111 68,118 60,118 57,111" fill="#64748b" stroke="#0f172a" strokeWidth="1.8" />
          </g>
        );

      case 'w-sword-3': // Steel Sword — knightly bastard sword, winged silver guard, sapphire fuller
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>
            <path d="M64 5 L72 20 L71 78 L57 78 L56 20 Z" fill={`url(#${uid}-steel)`} stroke="#0f172a" strokeWidth="2" />
            <rect x="62" y="22" width="4" height="48" rx="2" fill="#0284c7" />
            <path d="M64 26 L64 66" stroke="#bae6fd" strokeWidth="1.4" strokeDasharray="3 4" />
            {/* Flared winged crossguard */}
            <path d="M38 72 L55 78 L73 78 L90 72 L84 85 L44 85 Z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.8" />
            <polygon points="64,76 69,81 64,86 59,81" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.2" />
            <rect x="60" y="85" width="8" height="22" fill="#1e3a8a" stroke="#0f172a" strokeWidth="1.5" />
            <polygon points="64,107 72,113 64,121 56,113" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.8" />
          </g>
        );

      case 'w-sword-4': // Shadow Blade — curved scimitar/katana with serrated spine & twilight mist
        return (
          <g transform="rotate(35 64 64)">
            <defs>
              <linearGradient id={`${uid}-shad`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#312e81" />
                <stop offset="50%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            {/* Curved saber blade with serrated notches */}
            <path
              d="M72 8 C82 28, 78 55, 70 78 L58 78 C62 52, 65 32, 60 15 L65 19 L63 26 L68 30 L65 38 L70 43 L66 51 Z"
              fill={`url(#${uid}-shad)`}
              stroke="#090514"
              strokeWidth="2"
            />
            <path d="M71 14 C77 32, 74 56, 68 75" stroke="#c084fc" strokeWidth="1.5" fill="none" />
            {/* Crescent claw crossguard */}
            <path d="M40 72 Q64 90 88 70 Q76 86 64 85 Q52 86 40 72 Z" fill="#4c1d95" stroke="#090514" strokeWidth="1.8" />
            <circle cx="64" cy="80" r="3.5" fill="#e879f9" />
            {/* Wrapped dark hilt */}
            <path d="M60 84 L67 84 L64 108 L57 108 Z" fill="#1e1b4b" stroke="#090514" strokeWidth="1.5" />
            <path d="M55 108 Q63 116 70 119 Q60 118 54 112 Z" fill="#7e22ce" />
          </g>
        );

      case 'w-sword-5': // Void Slayer — colossal split-fuller greatsword with floating violet core
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-void`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3e8ff" />
                <stop offset="40%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
            </defs>
            {/* Colossal jagged broadsword */}
            <path
              d="M64 4 L77 20 L74 44 L78 52 L73 78 L55 78 L50 52 L54 44 L51 20 Z"
              fill={`url(#${uid}-void)`}
              stroke="#0f0720"
              strokeWidth="2"
            />
            {/* Split void channel */}
            <polygon points="64,16 68,36 64,68 60,36" fill="#090514" />
            <polygon points="64,22 66.5,38 64,62 61.5,38" fill="#d946ef" />
            {/* Gold-and-obsidian wing guard */}
            <path d="M33 70 L53 77 L75 77 L95 70 L86 86 L42 86 Z" fill="#f59e0b" stroke="#451a03" strokeWidth="1.8" />
            <polygon points="64,73 71,81 64,89 57,81" fill="#c084fc" stroke="#fef3c7" strokeWidth="1.2" />
            <rect x="60" y="87" width="8" height="22" fill="#312e81" stroke="#0f0720" strokeWidth="1.5" />
            <polygon points="64,109 73,115 64,123 55,115" fill="#fbbf24" stroke="#451a03" strokeWidth="1.8" />
          </g>
        );

      case 'w-sword-shop-1': // Obsidian Sunblade — curved volcanic khopesh with molten gold veins
        return (
          <g transform="rotate(36 64 64)">
            <defs>
              <linearGradient id={`${uid}-obs`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="60%" stopColor="#09090b" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
            </defs>
            {/* Khopesh hooked obsidian blade */}
            <path
              d="M58 78 L58 46 C58 32, 74 26, 74 10 C84 22, 82 40, 72 52 L70 78 Z"
              fill={`url(#${uid}-obs)`}
              stroke="#f59e0b"
              strokeWidth="2"
            />
            {/* Molten gold lava veins */}
            <path d="M64 72 L65 50 C66 40, 75 30, 74 18" stroke="#fbbf24" strokeWidth="2.2" fill="none" />
            <path d="M68 42 L75 37" stroke="#f97316" strokeWidth="1.8" />
            {/* Solar disc guard */}
            <circle cx="64" cy="81" r="10" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <circle cx="64" cy="81" r="4.5" fill="#ef4444" />
            <rect x="60" y="88" width="8" height="20" fill="#292524" stroke="#f59e0b" strokeWidth="1.4" />
            <circle cx="64" cy="112" r="5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.6" />
          </g>
        );

      case 'w-sword-flame': // Flame Sword — wavy flamberge blade wreathed in fiery orange flames
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-flameB`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="45%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>
            {/* Outer fire aura */}
            <path
              d="M64 2 C74 14, 79 26, 73 38 C81 48, 78 60, 72 74 L56 74 C50 60, 47 48, 55 38 C49 26, 54 14, 64 2 Z"
              fill="#fb923c"
              opacity="0.35"
            />
            {/* Wavy flamberge blade */}
            <path
              d="M64 6 L70 18 L67 27 L72 36 L67 45 L72 54 L67 63 L71 76 L57 76 L61 63 L56 54 L61 45 L56 36 L61 27 L58 18 Z"
              fill={`url(#${uid}-flameB)`}
              stroke="#7c2d12"
              strokeWidth="1.8"
            />
            <path d="M64 12 L64 74" stroke="#fef9c3" strokeWidth="2" opacity="0.85" />
            {/* Dragon-claw crossguard */}
            <path d="M36 69 L56 77 L72 77 L92 69 L83 84 L64 87 L45 84 Z" fill="#451a03" stroke="#f97316" strokeWidth="1.8" />
            <circle cx="64" cy="81" r="4" fill="#fef08a" stroke="#dc2626" strokeWidth="1.5" />
            <rect x="60" y="86" width="8" height="21" fill="#7c2d12" stroke="#fbbf24" strokeWidth="1.4" />
            <polygon points="64,107 72,114 64,121 56,114" fill="#f97316" stroke="#7c2d12" strokeWidth="1.6" />
          </g>
        );

      case 'w-sword-frost': // Frostblade — jagged crystal glacier blade & icicle spikes
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-ice`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>
            {/* Faceted glacier crystal blade */}
            <polygon
              points="64,4 74,22 70,38 75,52 69,78 59,78 53,52 58,38 54,22"
              fill={`url(#${uid}-ice)`}
              stroke="#0c4a6e"
              strokeWidth="1.8"
            />
            <polygon points="64,6 64,77 58,38 55,22" fill="#e0f2fe" opacity="0.65" />
            {/* Icicle crossguard spikes */}
            <polygon points="36,76 54,74 58,83 41,87" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.5" />
            <polygon points="92,76 74,74 70,83 87,87" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.5" />
            <polygon points="64,73 71,81 64,89 57,81" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.6" />
            <rect x="60.5" y="87" width="7" height="20" fill="#0c4a6e" stroke="#7dd3fc" strokeWidth="1.3" />
            <polygon points="64,107 70,115 64,122 58,115" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.6" />
          </g>
        );

      case 'w-sword-celestial': // Celestial Sword — Mythic winged radiant golden greatsword + halo
        return (
          <g transform="rotate(38 64 64)">
            <defs>
              <linearGradient id={`${uid}-cel`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Sunburst halo behind guard */}
            <circle cx="64" cy="74" r="18" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="4 3" />
            {/* Radiant sword blade */}
            <path d="M64 4 L73 20 L71 75 L57 75 L55 20 Z" fill={`url(#${uid}-cel)`} stroke="#78350f" strokeWidth="1.8" />
            <path d="M64 8 L64 73" stroke="#ffffff" strokeWidth="2.4" />
            {/* Angelic feathered gold wings guard */}
            <path d="M28 65 Q44 68 58 77 L52 84 Q38 80 28 65 Z" fill="#fef08a" stroke="#b45309" strokeWidth="1.6" />
            <path d="M100 65 Q84 68 70 77 L76 84 Q90 80 100 65 Z" fill="#fef08a" stroke="#b45309" strokeWidth="1.6" />
            <circle cx="64" cy="79" r="5" fill="#38bdf8" stroke="#fef08a" strokeWidth="2" />
            <rect x="60" y="84" width="8" height="22" fill="#f8fafc" stroke="#b45309" strokeWidth="1.5" />
            <polygon points="64,106 72,114 64,122 56,114" fill="#fde047" stroke="#92400e" strokeWidth="1.6" />
          </g>
        );

      // ============================================================
      // MAGIC STAFFS (6 unique staves)
      // ============================================================
      case 'w-staff-1': // Apprentice Staff — gnarled oak twig + hemp wrap + amber quartz
        return (
          <g transform="rotate(24 64 64)">
            {/* Crooked oak branch */}
            <path
              d="M62 118 L63 82 Q60 64 65 48 Q68 36 59 24 Q70 28 73 16"
              fill="none"
              stroke="#78350f"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path d="M62 118 L63 82 Q60 64 65 48 Q68 36 59 24" fill="none" stroke="#b45309" strokeWidth="2" />
            {/* Glowing quartz pebble cradled in fork */}
            <polygon points="65,10 73,17 69,28 59,25 58,15" fill="#fbbf24" stroke="#78350f" strokeWidth="1.6" />
            <polygon points="65,12 69,18 65,24" fill="#fef3c7" opacity="0.8" />
            {/* Hemp cord wraps */}
            <path d="M58 55 L69 57 M58 60 L69 62 M58 65 L69 67" stroke="#d6d3d1" strokeWidth="2" />
          </g>
        );

      case 'w-staff-2': // Arcane Staff — bronze crescent prongs + teal glowing orb
        return (
          <g transform="rotate(24 64 64)">
            <rect x="60.5" y="42" width="7" height="78" rx="3" fill="#431407" stroke="#1c1917" strokeWidth="1.8" />
            <rect x="58.5" y="42" width="11" height="6" rx="2" fill="#d97706" stroke="#451a03" strokeWidth="1.4" />
            {/* Twin bronze crescent horns */}
            <path d="M59 42 C44 36, 44 16, 57 11 C50 20, 52 32, 62 38 Z" fill="#f59e0b" stroke="#451a03" strokeWidth="1.5" />
            <path d="M69 42 C84 36, 84 16, 71 11 C78 20, 76 32, 66 38 Z" fill="#f59e0b" stroke="#451a03" strokeWidth="1.5" />
            {/* Floating teal arcane orb */}
            <circle cx="64" cy="24" r="9.5" fill="#06b6d4" stroke="#cffafe" strokeWidth="1.8" />
            <circle cx="61" cy="21" r="3" fill="#ffffff" opacity="0.8" />
          </g>
        );

      case 'w-staff-3': // Crystal Staff — fluted silver rod + sapphire prism cluster
        return (
          <g transform="rotate(24 64 64)">
            <rect x="61" y="46" width="6" height="74" rx="2" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.8" />
            <path d="M56 46 L72 46 L69 54 L59 54 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
            {/* Clustered crystal spires */}
            <polygon points="64,6 70,22 68,45 60,45 58,22" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="1.6" />
            <polygon points="50,18 57,26 59,45 51,42" fill="#a855f7" stroke="#3b0764" strokeWidth="1.4" />
            <polygon points="78,18 71,26 69,45 77,42" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.4" />
            <polygon points="64,9 67,22 64,41" fill="#e0f2fe" opacity="0.7" />
          </g>
        );

      case 'w-staff-4': // Soul Staff — obsidian lantern crozier + violet spirit wisp
        return (
          <g transform="rotate(22 64 64)">
            <path d="M64 120 L64 46 C64 34, 48 32, 48 20 C48 10, 62 6, 74 12 C84 18, 82 34, 68 38" fill="none" stroke="#1e1b4b" strokeWidth="6.5" strokeLinecap="round" />
            <path d="M64 120 L64 46" stroke="#6366f1" strokeWidth="1.5" />
            {/* Hanging spirit cage */}
            <polygon points="64,20 74,30 64,42 54,30" fill="#2e1065" stroke="#c084fc" strokeWidth="1.8" />
            <circle cx="64" cy="31" r="5" fill="#e879f9" />
            <circle cx="64" cy="31" r="2.2" fill="#fdf4ff" />
          </g>
        );

      case 'w-staff-5': // Celestial Staff — golden astrolabe orbital rings + sun star
        return (
          <g transform="rotate(22 64 64)">
            <rect x="61" y="48" width="6" height="72" rx="2" fill="#b45309" stroke="#451a03" strokeWidth="1.8" />
            <circle cx="64" cy="27" r="18" fill="none" stroke="#fbbf24" strokeWidth="3.2" />
            <ellipse cx="64" cy="27" rx="18" ry="8" transform="rotate(-28 64 27)" fill="none" stroke="#fef08a" strokeWidth="2" />
            <ellipse cx="64" cy="27" rx="18" ry="8" transform="rotate(28 64 27)" fill="none" stroke="#a855f7" strokeWidth="2" />
            <circle cx="64" cy="27" r="6.5" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        );

      case 'w-staff-astral': // Astral Sovereign Staff — Mythic twin-helix platinum spire + nebula singularity
        return (
          <g transform="rotate(22 64 64)">
            {/* Twin intertwining helix shaft */}
            <path d="M61 118 Q54 96 64 80 Q74 64 61 48" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
            <path d="M67 118 Q74 96 64 80 Q54 64 67 48" fill="none" stroke="#f472b6" strokeWidth="3.5" />
            {/* Cosmic nebula halo */}
            <circle cx="64" cy="25" r="19" fill="#4c1d95" opacity="0.45" />
            <circle cx="64" cy="25" r="15" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeDasharray="5 3" />
            <polygon points="64,6 68,21 83,25 68,29 64,44 60,29 45,25 60,21" fill="#f8fafc" stroke="#f472b6" strokeWidth="1.5" />
            <circle cx="64" cy="25" r="5" fill="#fde047" />
          </g>
        );

      // ============================================================
      // BOWS (6 unique bows)
      // ============================================================
      case 'w-bow-1': // Wooden Bow — simple slender ash D-bow + leather wrap
        return (
          <g transform="rotate(15 64 64)">
            <path d="M48 16 C88 26, 88 102, 48 112" fill="none" stroke="#92400e" strokeWidth="6.5" strokeLinecap="round" />
            <path d="M48 16 C88 26, 88 102, 48 112" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
            <line x1="49" y1="17" x2="49" y2="111" stroke="#e7e5e4" strokeWidth="1.6" />
            <rect x="73" y="56" width="8" height="16" rx="2" fill="#451a03" stroke="#d6d3d1" strokeWidth="1.2" />
          </g>
        );

      case 'w-bow-2': // Hunter Bow — horn recurve bow + fletched arrow
        return (
          <g transform="rotate(15 64 64)">
            <path
              d="M42 14 Q62 18 70 36 Q82 64 70 92 Q62 110 42 114"
              fill="none"
              stroke="#78350f"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path d="M42 14 Q54 17 61 25" fill="none" stroke="#e7e5e4" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M42 114 Q54 111 61 103" fill="none" stroke="#e7e5e4" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="43" y1="15" x2="43" y2="113" stroke="#d6d3d1" strokeWidth="1.5" />
            {/* Nocked hunting arrow */}
            <line x1="36" y1="64" x2="98" y2="64" stroke="#d97706" strokeWidth="2.4" />
            <polygon points="104,64 93,59 95,64 93,69" fill="#94a3b8" />
            <polygon points="36,64 43,59 46,64 43,69" fill="#10b981" />
          </g>
        );

      case 'w-bow-3': // Shadow Bow — jagged bat-wing obsidian reflex bow + violet string
        return (
          <g transform="rotate(15 64 64)">
            <path
              d="M38 14 L56 26 L51 35 L76 55 L76 73 L51 93 L56 102 L38 114 L46 96 L66 72 L66 56 L46 32 Z"
              fill="#1e1b4b"
              stroke="#7c3aed"
              strokeWidth="1.8"
            />
            <line x1="40" y1="16" x2="40" y2="112" stroke="#c084fc" strokeWidth="2" />
            <circle cx="71" cy="64" r="4" fill="#a855f7" />
          </g>
        );

      case 'w-bow-4': // Phantom Bow — ethereal bone warbow + ghostly spirit arrow
        return (
          <g transform="rotate(15 64 64)">
            <defs>
              <linearGradient id={`${uid}-phm`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path
              d="M42 12 C74 16, 86 44, 72 64 C86 84, 74 112, 42 116"
              fill="none"
              stroke={`url(#${uid}-phm)`}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <line x1="42" y1="13" x2="42" y2="115" stroke="#a5f3fc" strokeWidth="1.8" strokeDasharray="3 2" />
            <line x1="34" y1="64" x2="100" y2="64" stroke="#67e8f9" strokeWidth="3" />
            <polygon points="108,64 94,57 98,64 94,71" fill="#ecfeff" />
          </g>
        );

      case 'w-bow-5': // Eclipse Bow — golden crescent moonbow + eclipse sigil + starlight arrow
        return (
          <g transform="rotate(15 64 64)">
            <path
              d="M40 10 C82 20, 92 108, 40 118 C68 96, 68 32, 40 10 Z"
              fill="#fbbf24"
              stroke="#78350f"
              strokeWidth="1.8"
            />
            <circle cx="68" cy="64" r="9" fill="#1e1b4b" stroke="#fde047" strokeWidth="2" />
            <circle cx="71" cy="64" r="6" fill="#fbbf24" />
            <line x1="41" y1="12" x2="41" y2="116" stroke="#fef08a" strokeWidth="2" />
            <line x1="38" y1="64" x2="104" y2="64" stroke="#fef9c3" strokeWidth="2.8" />
            <polygon points="110,64 96,58 100,64 96,70" fill="#fde047" />
          </g>
        );

      case 'w-bow-shop-1': // Tempest Recurve Bow — copper storm coils + crackling lightning string
        return (
          <g transform="rotate(15 64 64)">
            <path
              d="M44 12 C68 20, 82 42, 74 64 C82 86, 68 108, 44 116"
              fill="none"
              stroke="#334155"
              strokeWidth="7.5"
              strokeLinecap="round"
            />
            <circle cx="62" cy="30" r="5" fill="#d97706" stroke="#38bdf8" strokeWidth="1.6" />
            <circle cx="62" cy="98" r="5" fill="#d97706" stroke="#38bdf8" strokeWidth="1.6" />
            {/* Jagged lightning bowstring */}
            <polyline points="45,14 52,36 41,54 50,74 42,96 45,114" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="44" y1="64" x2="104" y2="64" stroke="#7dd3fc" strokeWidth="2.8" />
            <polygon points="110,64 96,59 99,64 96,69" fill="#e0f2fe" />
          </g>
        );

      // ============================================================
      // SHIELDS (6 unique shields)
      // ============================================================
      case 'w-shield-1': // Wooden Shield — round oak plank buckler + studs + center iron boss
        return (
          <g>
            <circle cx="64" cy="64" r="46" fill="#78350f" stroke="#52525b" strokeWidth="7" />
            {/* Oak plank lines */}
            <line x1="38" y1="25" x2="38" y2="103" stroke="#451a03" strokeWidth="2" />
            <line x1="55" y1="19" x2="55" y2="109" stroke="#451a03" strokeWidth="2" />
            <line x1="73" y1="19" x2="73" y2="109" stroke="#451a03" strokeWidth="2" />
            <line x1="90" y1="25" x2="90" y2="103" stroke="#451a03" strokeWidth="2" />
            {/* Rim studs */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
              const rad = (deg * Math.PI) / 180;
              return <circle key={deg} cx={64 + Math.cos(rad) * 46} cy={64 + Math.sin(rad) * 46} r="2.2" fill="#d4d4d8" />;
            })}
            <circle cx="64" cy="64" r="14" fill="#71717a" stroke="#27272a" strokeWidth="2.5" />
            <circle cx="60" cy="60" r="4" fill="#e4e4e7" opacity="0.6" />
          </g>
        );

      case 'w-shield-2': // Iron Shield — pointed medieval steel heater shield + cross brace
        return (
          <g>
            <path d="M24 20 L104 20 L100 66 C96 92, 64 114, 64 114 C64 114, 32 92, 28 66 Z" fill="#64748b" stroke="#0f172a" strokeWidth="3.5" />
            <path d="M32 28 L96 28 L93 64 C89 85, 64 104, 64 104 C64 104, 39 85, 35 64 Z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
            <rect x="61" y="28" width="6" height="75" fill="#475569" />
            <rect x="35" y="50" width="58" height="6" fill="#475569" />
            <circle cx="64" cy="53" r="6" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2" />
          </g>
        );

      case 'w-shield-3': // Guardian Shield — tall arched tower pavise + silver wings + sapphire ward
        return (
          <g>
            <path d="M30 22 Q64 10 98 22 L98 84 L64 114 L30 84 Z" fill="#1e3a8a" stroke="#cbd5e1" strokeWidth="4" />
            {/* Silver wing crest */}
            <path d="M38 42 Q50 38 60 52 L54 62 Q40 58 38 42 Z" fill="#e2e8f0" />
            <path d="M90 42 Q78 38 68 52 L74 62 Q88 58 90 42 Z" fill="#e2e8f0" />
            <polygon points="64,44 74,58 64,74 54,58" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="2" />
          </g>
        );

      case 'w-shield-4': // Titan Shield — massive hexagonal volcanic basalt slab + magma fissures
        return (
          <g>
            <polygon points="64,12 104,34 104,88 64,116 24,88 24,34" fill="#27272a" stroke="#78350f" strokeWidth="4.5" />
            <polyline points="42,36 58,56 48,78 64,96" fill="none" stroke="#f97316" strokeWidth="3.2" />
            <polyline points="86,40 68,58 80,80" fill="none" stroke="#fbbf24" strokeWidth="2.8" />
            <polygon points="64,48 76,62 64,76 52,62" fill="#ea580c" stroke="#fef08a" strokeWidth="1.8" />
          </g>
        );

      case 'w-shield-5': // Aether Shield — octagonal gold-lattice celestial aegis + portal core
        return (
          <g>
            <polygon points="64,10 98,26 112,64 98,100 64,116 30,100 16,64 30,26" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="4" />
            <polygon points="64,20 90,33 101,64 90,93 64,106 38,93 27,64 38,33" fill="none" stroke="#a855f7" strokeWidth="2" />
            <circle cx="64" cy="64" r="20" fill="#7c3aed" stroke="#fde047" strokeWidth="2.5" />
            <circle cx="64" cy="64" r="10" fill="#e879f9" />
            <circle cx="64" cy="64" r="4" fill="#ffffff" />
          </g>
        );

      case 'w-shield-dragon': // Dragon Shield — crimson dragonscale scutum + curved golden horns & crest
        return (
          <g>
            {/* Dragon horns */}
            <path d="M36 28 Q20 12 28 6 Q32 18 46 22 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
            <path d="M92 28 Q108 12 100 6 Q96 18 82 22 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
            {/* Scalloped crimson shield */}
            <path d="M28 24 Q64 16 100 24 L94 78 L64 114 L34 78 Z" fill="#991b1b" stroke="#fbbf24" strokeWidth="3.5" />
            {/* Overlapping scale motif */}
            <path d="M40 44 Q52 52 64 44 Q76 52 88 44" fill="none" stroke="#ef4444" strokeWidth="2.5" />
            <path d="M42 58 Q53 66 64 58 Q75 66 86 58" fill="none" stroke="#ef4444" strokeWidth="2.5" />
            {/* Gold dragon crest */}
            <polygon points="64,34 76,56 64,86 52,56" fill="#f59e0b" stroke="#451a03" strokeWidth="1.8" />
            <circle cx="64" cy="56" r="5" fill="#fef08a" />
          </g>
        );

      // ============================================================
      // ARMOUR (4 distinct chestplate silhouettes)
      // ============================================================
      case 'armour-leather': // Scout's Leather Brigandine
        return (
          <g>
            <path d="M38 22 L52 18 Q64 28 76 18 L90 22 L96 48 L84 54 L88 106 L40 106 L44 54 L32 48 Z" fill="#78350f" stroke="#292524" strokeWidth="2.5" />
            {/* Stitched seam & brass buckles */}
            <line x1="64" y1="26" x2="64" y2="106" stroke="#451a03" strokeWidth="2.5" />
            <rect x="44" y="68" width="40" height="8" fill="#451a03" stroke="#1c1917" strokeWidth="1.5" />
            <rect x="59" y="67" width="10" height="10" rx="1.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.4" />
            <circle cx="48" cy="40" r="3" fill="#d97706" />
            <circle cx="80" cy="40" r="3" fill="#d97706" />
          </g>
        );

      case 'armour-silverguard': // Silverguard Steel Breastplate + Pauldrons
        return (
          <g>
            {/* Layered pauldrons */}
            <path d="M18 32 Q32 16 48 26 L44 48 L22 46 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="2.2" />
            <path d="M110 32 Q96 16 80 26 L84 48 L106 46 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="2.2" />
            {/* Sculpted cuirass */}
            <path d="M40 24 Q64 34 88 24 L84 96 L64 110 L44 96 Z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2.5" />
            <path d="M64 32 L64 106" stroke="#475569" strokeWidth="2" />
            <polygon points="64,46 72,56 64,68 56,56" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.5" />
            <rect x="44" y="84" width="40" height="7" fill="#5c3a21" />
          </g>
        );

      case 'armour-obsidian': // Runic Obsidian Cuirass + Spiked Pauldrons + Violet Runes
        return (
          <g>
            <path d="M12 24 L42 18 L48 46 L22 48 Z" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2" />
            <path d="M116 24 L86 18 L80 46 L106 48 Z" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2" />
            <path d="M38 22 L64 34 L90 22 L84 98 L64 112 L44 98 Z" fill="#0f172a" stroke="#a855f7" strokeWidth="2.4" />
            {/* Glowing purple rune channels */}
            <path d="M48 44 L64 56 L80 44 M50 70 L64 82 L78 70" fill="none" stroke="#c084fc" strokeWidth="2.4" />
            <polygon points="64,48 70,58 64,68 58,58" fill="#e879f9" />
          </g>
        );

      case 'armour-sunforged': // Sunforged Paladin Plate + Crimson Cape & Winged Gold Armor
        return (
          <g>
            {/* Crimson mantle behind */}
            <path d="M26 28 L102 28 L112 114 L16 114 Z" fill="#7f1d1d" opacity="0.85" />
            {/* Winged golden pauldrons */}
            <path d="M14 26 Q34 12 50 24 L46 48 L20 44 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <path d="M114 26 Q94 12 78 24 L82 48 L108 44 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            {/* Ivory & gold breastplate */}
            <path d="M40 24 Q64 34 88 24 L84 96 L64 112 L44 96 Z" fill="#f8fafc" stroke="#d97706" strokeWidth="2.8" />
            <polygon points="64,42 69,54 81,56 71,64 74,76 64,69 54,76 57,64 47,56 59,54" fill="#fbbf24" stroke="#92400e" strokeWidth="1.2" />
          </g>
        );

      // ============================================================
      // HELMETS (3 distinct headpieces)
      // ============================================================
      case 'helm-iron': // Iron Barbute Helm — T-visor
        return (
          <g>
            <path d="M32 62 C32 24, 96 24, 96 62 L94 104 L74 108 L74 72 L54 72 L54 108 L34 104 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="2.8" />
            <path d="M42 56 L86 56 L86 66 L68 66 L68 94 L60 94 L60 66 L42 66 Z" fill="#0f172a" />
            <line x1="64" y1="24" x2="64" y2="56" stroke="#e2e8f0" strokeWidth="3" />
          </g>
        );

      case 'helm-shadow': // Shadow-Steel Warhelm — horned helm with glowing indigo visor
        return (
          <g>
            <path d="M36 42 Q18 22 24 10 Q32 26 46 32 Z" fill="#4c1d95" stroke="#a855f7" strokeWidth="1.6" />
            <path d="M92 42 Q110 22 104 10 Q96 26 82 32 Z" fill="#4c1d95" stroke="#a855f7" strokeWidth="1.6" />
            <path d="M34 62 C34 26, 94 26, 94 62 L88 106 L64 114 L40 106 Z" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2.5" />
            {/* Glowing visor eyes */}
            <polygon points="44,62 59,66 56,72 44,68" fill="#38bdf8" />
            <polygon points="84,62 69,66 72,72 84,68" fill="#38bdf8" />
          </g>
        );

      case 'helm-archon': // Crown of Aetheria — winged golden battle crown + amethyst starstone
        return (
          <g>
            {/* Golden wings */}
            <path d="M22 48 Q16 20 34 24 L42 58 Z" fill="#fde047" stroke="#92400e" strokeWidth="1.8" />
            <path d="M106 48 Q112 20 94 24 L86 58 Z" fill="#fde047" stroke="#92400e" strokeWidth="1.8" />
            {/* Crown circlet & spires */}
            <path d="M32 82 L38 42 L52 60 L64 26 L76 60 L90 42 L96 82 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2.4" />
            <rect x="30" y="80" width="68" height="14" rx="4" fill="#d97706" stroke="#78350f" strokeWidth="2" />
            <polygon points="64,46 73,62 64,78 55,62" fill="#d946ef" stroke="#fdf4ff" strokeWidth="1.6" />
          </g>
        );

      // ============================================================
      // ACCESSORIES & CONSUMABLES (6 distinct designs)
      // ============================================================
      case 'acc-flame-ring': // Ring of the First Flame
        return (
          <g>
            <ellipse cx="64" cy="74" rx="34" ry="26" fill="none" stroke="#fbbf24" strokeWidth="12" />
            <ellipse cx="64" cy="74" rx="34" ry="26" fill="none" stroke="#92400e" strokeWidth="2" />
            {/* Bezel & ruby flame stone */}
            <polygon points="64,22 82,42 64,62 46,42" fill="#dc2626" stroke="#fef08a" strokeWidth="2.4" />
            <polygon points="64,26 73,42 64,54 55,42" fill="#f97316" />
            <circle cx="61" cy="37" r="3" fill="#fef9c3" />
          </g>
        );

      case 'acc-astral-amulet': // Amulet of Astral Ward
        return (
          <g>
            {/* Silver chain */}
            <path d="M32 16 Q64 56 96 16" fill="none" stroke="#cbd5e1" strokeWidth="3.5" strokeDasharray="4 3" />
            {/* Filigree frame */}
            <path d="M64 38 L86 68 L64 110 L42 68 Z" fill="#334155" stroke="#e2e8f0" strokeWidth="2.6" />
            <polygon points="64,48 78,68 64,98 50,68" fill="#6366f1" stroke="#38bdf8" strokeWidth="1.8" />
            <circle cx="64" cy="68" r="6" fill="#e879f9" />
          </g>
        );

      case 'acc-celestial-signet': // Chrono-Star Relic (Mythic Astrolabe Talisman)
        return (
          <g>
            <circle cx="64" cy="64" r="42" fill="none" stroke="#fbbf24" strokeWidth="4" />
            <circle cx="64" cy="64" r="30" fill="none" stroke="#f472b6" strokeWidth="2.5" strokeDasharray="6 4" />
            <ellipse cx="64" cy="64" rx="40" ry="15" transform="rotate(30 64 64)" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <polygon points="64,34 71,57 94,64 71,71 64,94 57,71 34,64 57,57" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        );

      case 'shop-elixir-focus': // Elixir of Unbroken Focus — diamond-cut cyan crystal flask
        return (
          <g>
            <rect x="55" y="18" width="18" height="14" rx="3" fill="#b45309" stroke="#451a03" strokeWidth="1.6" />
            <rect x="51" y="30" width="26" height="8" rx="2" fill="#fbbf24" stroke="#78350f" strokeWidth="1.6" />
            <polygon points="52,38 76,38 96,72 64,114 32,72" fill="#082f49" stroke="#38bdf8" strokeWidth="2.8" />
            <polygon points="40,72 88,72 64,108" fill="#06b6d4" opacity="0.85" />
            <circle cx="58" cy="82" r="4" fill="#cffafe" />
          </g>
        );

      case 'shop-elixir-vitality': // Aether Vitality Tonic — round copper-wrapped ruby bottle
        return (
          <g>
            <rect x="56" y="16" width="16" height="14" rx="2" fill="#78350f" stroke="#292524" strokeWidth="1.6" />
            <rect x="53" y="30" width="22" height="14" fill="#fca5a5" opacity="0.4" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="64" cy="76" r="34" fill="#7f1d1d" stroke="#f59e0b" strokeWidth="3" />
            <path d="M32 76 A32 32 0 0 0 96 76 Z" fill="#ef4444" />
            <path d="M40 52 L88 100 M88 52 L40 100" stroke="#d97706" strokeWidth="2" opacity="0.65" />
            <circle cx="53" cy="63" r="6" fill="#fecaca" opacity="0.55" />
          </g>
        );

      case 'shop-catalyst-ember': // Starforge Catalyst Shard — brass cage + levitating amber crystal
        return (
          <g>
            <circle cx="64" cy="64" r="40" fill="none" stroke="#d97706" strokeWidth="3" />
            <ellipse cx="64" cy="64" rx="40" ry="16" transform="rotate(-35 64 64)" fill="none" stroke="#fbbf24" strokeWidth="2.2" />
            <polygon points="64,22 84,64 64,106 44,64" fill="#f59e0b" stroke="#fef08a" strokeWidth="2.2" />
            <polygon points="64,26 64,102 47,64" fill="#fde047" opacity="0.7" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label={`Equipment artwork ${id}`}
    >
      <defs>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={rarityStyle.isBeyondMythic ? rarityStyle.accentHex : stageGlowColor} stopOpacity={rarityStyle.isBeyondMythic ? 0.45 : isEvolved || rarity !== 'Common' ? 0.36 : 0.14} />
          <stop offset="70%" stopColor={rarityStyle.secondaryHex} stopOpacity={rarityStyle.isBeyondMythic ? 0.14 : 0.08} />
          <stop offset="100%" stopColor={rarityStyle.secondaryHex} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Transparent background with subtle tier/rarity energy halo */}
      <circle cx="64" cy="64" r="56" fill={`url(#${uid}-aura)`} />

      {/* Evolved / High-Level / Beyond-Mythical orbital ring */}
      {(isEvolved || isTempered || rarityStyle.isBeyondMythic) && (
        <circle
          cx="64"
          cy="64"
          r="53"
          fill="none"
          stroke={rarityStyle.isBeyondMythic ? rarityStyle.accentHex : stageGlowColor}
          strokeWidth={rarityStyle.isBeyondMythic ? '2' : isEvolved ? '1.6' : '1'}
          strokeDasharray={rarity === 'Eternal' ? '10 4 2 4' : rarityStyle.isBeyondMythic || evolutionStage === 'Mythic' || evolutionStage === 'Transcendent' ? '6 4' : '2 5'}
          opacity={rarityStyle.isBeyondMythic ? 0.85 : isEvolved ? 0.7 : 0.45}
        />
      )}

      {/* Beyond-Mythical secondary dimensional aura */}
      {rarity === 'Divine' && (
        <circle cx="64" cy="64" r="48" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
      )}
      {(rarity === 'Celestial' || rarity === 'Eternal') && (
        <g opacity="0.8">
          <circle cx="20" cy="24" r="2.2" fill="#e9d5ff" />
          <circle cx="108" cy="30" r="2" fill="#67e8f9" />
          <circle cx="24" cy="102" r="1.8" fill="#fde047" />
          <circle cx="104" cy="102" r="2.2" fill={rarity === 'Eternal' ? '#f472b6' : '#c084fc'} />
        </g>
      )}
      {rarity === 'Eternal' && (
        <ellipse
          cx="64"
          cy="64"
          rx="57"
          ry="49"
          transform="rotate(-18 64 64)"
          fill="none"
          stroke="#f472b6"
          strokeWidth="1.2"
          strokeDasharray="8 6"
          opacity="0.65"
        />
      )}

      {/* Unique item illustration */}
      {renderShape()}

      {/* Tempering / Evolution corner rune glint for upgraded or beyond-Mythic weapons */}
      {(level >= 5 || rarityStyle.isBeyondMythic) && (
        <g opacity="0.9">
          <polygon
            points="106,18 109,24 115,27 109,30 106,36 103,30 97,27 103,24"
            fill={rarityStyle.isBeyondMythic ? rarityStyle.accentHex : '#fde047'}
          />
        </g>
      )}
    </svg>
  );
};
