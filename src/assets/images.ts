import blacksmithForgeImg from './images/blacksmith_forge_1794456199237.jpg';
import bossVoidStalkerImg from './images/boss_void_stalker_1794456198816.jpg';
import characterWarriorAvatarImg from './images/character_warrior_avatar_1794456200715.jpg';
import rpgAvatarMageImg from './images/rpg_avatar_mage_1794581190659.jpg';
import rpgAvatarRangerImg from './images/rpg_avatar_ranger_1794581192080.jpg';
import rpgAvatarGuardianImg from './images/rpg_avatar_guardian_1794581192736.jpg';
import heroAetheriaWorldImg from './images/hero_aetheria_world_1794456197879.jpg';
import weaponAetherShieldImg from './images/weapon_aether_shield_1794457071725.jpg';
import weaponCelestialStaffImg from './images/weapon_celestial_staff_1794457071426.jpg';
import weaponEclipseBowImg from './images/weapon_eclipse_bow_1794457071153.jpg';
import weaponVoidSlayerSwordImg from './images/weapon_void_slayer_sword_1794457070313.jpg';
import aetheriaSkyVistaImg from './images/aetheria_sky_vista_1794654027147.jpg';
import aetheriaCitadelKingdomImg from './images/aetheria_citadel_kingdom_1794654027955.jpg';
import aetheriaForegroundTerraceImg from './images/aetheria_foreground_terrace_1794654029174.jpg';
import aetheriaChampionShowcaseImg from './images/aetheria_champion_showcase_1794654029784.jpg';

export {
  blacksmithForgeImg,
  bossVoidStalkerImg,
  characterWarriorAvatarImg,
  rpgAvatarMageImg,
  rpgAvatarRangerImg,
  rpgAvatarGuardianImg,
  heroAetheriaWorldImg,
  weaponAetherShieldImg,
  weaponCelestialStaffImg,
  weaponEclipseBowImg,
  weaponVoidSlayerSwordImg,
  aetheriaSkyVistaImg,
  aetheriaCitadelKingdomImg,
  aetheriaForegroundTerraceImg,
  aetheriaChampionShowcaseImg,
};

const ASSET_MAP: Record<string, string> = {
  'blacksmith_forge_1794456199237.jpg': blacksmithForgeImg,
  'boss_void_stalker_1794456198816.jpg': bossVoidStalkerImg,
  'character_warrior_avatar_1794456200715.jpg': characterWarriorAvatarImg,
  'rpg_avatar_mage_1794581190659.jpg': rpgAvatarMageImg,
  'rpg_avatar_ranger_1794581192080.jpg': rpgAvatarRangerImg,
  'rpg_avatar_guardian_1794581192736.jpg': rpgAvatarGuardianImg,
  'hero_aetheria_world_1794456197879.jpg': heroAetheriaWorldImg,
  'weapon_aether_shield_1794457071725.jpg': weaponAetherShieldImg,
  'weapon_celestial_staff_1794457071426.jpg': weaponCelestialStaffImg,
  'weapon_eclipse_bow_1794457071153.jpg': weaponEclipseBowImg,
  'weapon_void_slayer_sword_1794457070313.jpg': weaponVoidSlayerSwordImg,
  'aetheria_sky_vista_1794654027147.jpg': aetheriaSkyVistaImg,
  'aetheria_citadel_kingdom_1794654027955.jpg': aetheriaCitadelKingdomImg,
  'aetheria_foreground_terrace_1794654029174.jpg': aetheriaForegroundTerraceImg,
  'aetheria_champion_showcase_1794654029784.jpg': aetheriaChampionShowcaseImg,
};

export const getRpgAvatarForClass = (characterClass?: string): string => {
  switch (characterClass) {
    case 'Mage':
      return rpgAvatarMageImg;
    case 'Ranger':
      return rpgAvatarRangerImg;
    case 'Guardian':
      return rpgAvatarGuardianImg;
    case 'Warrior':
    default:
      return characterWarriorAvatarImg;
  }
};

export const getChampionShowcaseImage = (): string => aetheriaChampionShowcaseImg;

/**
 * Resolves stored or legacy `/src/assets/images/...` paths to the bundled Vite production asset URL.
 */
export const resolveAssetUrl = (path?: string | null, fallback: string = characterWarriorAvatarImg): string => {
  if (!path) return fallback;
  if (path.includes('/src/assets/images/')) {
    const filename = path.split('/').pop()?.split('?')[0] || '';
    if (ASSET_MAP[filename]) {
      return ASSET_MAP[filename];
    }
  }
  return path;
};
