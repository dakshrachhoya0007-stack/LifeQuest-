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
import heroFallenKnightImg from './images/hero_fallen_knight_1794719347838.jpg';
import heroShadowbladeImg from './images/hero_shadowblade_1794719348979.jpg';
import heroArcaneMageImg from './images/hero_arcane_mage_1794719350182.jpg';
import heroRangerImg from './images/hero_ranger_1794719350899.jpg';
import heroPaladinImg from './images/hero_paladin_1794719351246.jpg';
import weeklyBossTitanImg from './images/weekly_boss_titan_1794920809847.jpg';
import recordsMuseumHallImg from './images/records_museum_hall_1794920809521.jpg';
import territoryAetheriaMapImg from './images/territory_aetheria_map_1795022646231.jpg';
import wardrobeSanctumBgImg from './images/wardrobe_sanctum_bg_1795022646444.jpg';
import realmCitadelGatheringImg from './images/realm_citadel_gathering_1795022646872.jpg';
import type { PlayableHeroId } from '../types/game';

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
  heroFallenKnightImg,
  heroShadowbladeImg,
  heroArcaneMageImg,
  heroRangerImg,
  heroPaladinImg,
  weeklyBossTitanImg,
  recordsMuseumHallImg,
  territoryAetheriaMapImg,
  wardrobeSanctumBgImg,
  realmCitadelGatheringImg,
};

export const HERO_ARTWORK_BY_ID: Record<PlayableHeroId, string> = {
  fallen_knight: heroFallenKnightImg,
  shadowblade: heroShadowbladeImg,
  arcane_mage: heroArcaneMageImg,
  ranger: heroRangerImg,
  paladin: heroPaladinImg,
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
  'hero_fallen_knight_1794719347838.jpg': heroFallenKnightImg,
  'hero_shadowblade_1794719348979.jpg': heroShadowbladeImg,
  'hero_arcane_mage_1794719350182.jpg': heroArcaneMageImg,
  'hero_ranger_1794719350899.jpg': heroRangerImg,
  'hero_paladin_1794719351246.jpg': heroPaladinImg,
  'weekly_boss_titan_1794920809847.jpg': weeklyBossTitanImg,
  'records_museum_hall_1794920809521.jpg': recordsMuseumHallImg,
  'territory_aetheria_map_1795022646231.jpg': territoryAetheriaMapImg,
  'wardrobe_sanctum_bg_1795022646444.jpg': wardrobeSanctumBgImg,
  'realm_citadel_gathering_1795022646872.jpg': realmCitadelGatheringImg,
};

export const getHeroArtwork = (
  heroId?: PlayableHeroId | string | null,
  characterClass?: string | null
): string => {
  if (heroId && heroId in HERO_ARTWORK_BY_ID) {
    return HERO_ARTWORK_BY_ID[heroId as PlayableHeroId];
  }
  switch (characterClass) {
    case 'Mage':
      return heroArcaneMageImg;
    case 'Ranger':
      return heroRangerImg;
    case 'Guardian':
      return heroPaladinImg;
    case 'Warrior':
    default:
      return heroFallenKnightImg;
  }
};

export const getRpgAvatarForClass = (characterClass?: string): string => {
  switch (characterClass) {
    case 'Mage':
      return heroArcaneMageImg;
    case 'Ranger':
      return heroRangerImg;
    case 'Guardian':
      return heroPaladinImg;
    case 'Warrior':
    default:
      return heroFallenKnightImg;
  }
};

export const getChampionShowcaseImage = (): string => aetheriaChampionShowcaseImg;

/**
 * Resolves stored or legacy `/src/assets/images/...` paths to the bundled Vite production asset URL.
 */
export const resolveAssetUrl = (path?: string | null, fallback: string = heroFallenKnightImg): string => {
  if (!path) return fallback;
  if (path.includes('/src/assets/images/')) {
    const filename = path.split('/').pop()?.split('?')[0] || '';
    if (ASSET_MAP[filename]) {
      return ASSET_MAP[filename];
    }
  }
  return path;
};
