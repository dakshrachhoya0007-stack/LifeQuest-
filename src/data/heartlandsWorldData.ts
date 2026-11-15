import {
  aetheriaCitadelKingdomImg,
  aetheriaForegroundTerraceImg,
  aetheriaSkyVistaImg,
  blacksmithForgeImg,
  heroAetheriaWorldImg,
} from '../assets/images';
import {
  GoldenTreeStage,
  LandmarkId,
  LandmarkRestorationStage,
  WorldPersistenceState,
  WorldRegionId,
} from '../types/game';

export interface WorldRegionDefinition {
  id: WorldRegionId;
  name: string;
  subtitle: string;
  description: string;
  status: 'active' | 'locked';
  paletteSummary: string;
  artwork: string;
  phaseNote: string;
}

export interface LandmarkDefinition {
  id: LandmarkId;
  name: string;
  subtitle: string;
  description: string;
  lore: string;
  coordinates: { x: number; z: number };
  interactionRadius: number;
  artwork: string;
  stageSummaries: Record<LandmarkRestorationStage, string>;
}

export interface GoldenTreeStageMeta {
  id: GoldenTreeStage;
  label: string;
  order: number;
  percent: number;
  summary: string;
  visualNotes: string;
}

export interface LandmarkStageMeta {
  id: LandmarkRestorationStage;
  label: string;
  order: number;
  defaultPercent: number;
  summary: string;
}

export const WORLD_REGIONS: WorldRegionDefinition[] = [
  {
    id: 'heartlands',
    name: 'The Heartlands',
    subtitle: 'Heart of Aetheria · Emerald Sanctuary',
    description:
      'Sun-dappled emerald valleys, ancient stone roads, a rushing silver river, and the spiritual seat of the Golden Tree. Walk freely between the Ancient Castle, Forgotten Village, Ancient Bridge, and Sacred Shrine.',
    status: 'active',
    paletteSummary: 'Emerald · Ancient Stone · Royal Gold',
    artwork: heroAetheriaWorldImg,
    phaseNote: 'Playable Region — Phase 1 Foundation',
  },
  {
    id: 'emerald_wilds',
    name: 'Emerald Wilds',
    subtitle: 'Whispering Canopy & Elven Glades',
    description:
      'Monumental primeval redwoods, bioluminescent moss ravines, and sunken druidic amphitheaters shrouded in perpetual woodland mist.',
    status: 'locked',
    paletteSummary: 'Deep Moss · Jade Mist · Moonstone',
    artwork: aetheriaForegroundTerraceImg,
    phaseNote: 'Locked Preview — Future Phase',
  },
  {
    id: 'frozen_crown',
    name: 'Frozen Crown',
    subtitle: 'Glacial Peaks & Sunless Spires',
    description:
      'Jagged frost-locked bastions carved directly into sky-piercing glaciers where aurora light dances above silent watchfires.',
    status: 'locked',
    paletteSummary: 'Glacial Slate · Pale Silver · Aurora Violet',
    artwork: aetheriaSkyVistaImg,
    phaseNote: 'Locked Preview — Future Phase',
  },
  {
    id: 'ashen_expanse',
    name: 'Ashen Expanse',
    subtitle: 'Shattered Calderas & Forge Wastes',
    description:
      'Obsidian basalt ridges and ember-lit obsidian monoliths guarding the ancient subterranean smithies of the First Forgemasters.',
    status: 'locked',
    paletteSummary: 'Charcoal Obsidian · Molten Amber · Bronze',
    artwork: blacksmithForgeImg,
    phaseNote: 'Locked Preview — Future Phase',
  },
  {
    id: 'celestial_reach',
    name: 'Celestial Reach',
    subtitle: 'Floating Citadel Above the Firmament',
    description:
      'Golden marble sky-bridges suspended above starlit clouds where the highest astral observatories of Aetheria once aligned the cosmos.',
    status: 'locked',
    paletteSummary: 'Astral Indigo · Sunfire Gold · Ivory',
    artwork: aetheriaCitadelKingdomImg,
    phaseNote: 'Locked Preview — Future Phase',
  },
];

export const GOLDEN_TREE_STAGES: GoldenTreeStageMeta[] = [
  {
    id: 'fallen',
    label: '1. Fallen',
    order: 1,
    percent: 15,
    summary: 'Charred bark and dormant roots clinging faintly to the broken sanctuary dais.',
    visualNotes: 'Sparse dim ember leaves, muted root glow, cracked stone silence.',
  },
  {
    id: 'awakening',
    label: '2. Awakening',
    order: 2,
    percent: 38,
    summary: 'Warm golden sap veins awaken beneath the bark as first radiant shoots unfurl.',
    visualNotes: 'Amber glowing bark seams, sprouting young gold clusters, soft sanctuary aura.',
  },
  {
    id: 'growing',
    label: '3. Growing',
    order: 3,
    percent: 62,
    summary: 'Spreading emerald-and-gold boughs cast dappled light across the stone ring.',
    visualNotes: 'Balanced golden crown, lit sanctuary runes, steady drifting motes.',
  },
  {
    id: 'radiant',
    label: '4. Radiant',
    order: 4,
    percent: 84,
    summary: 'A monumental living beacon whose gilded leaves hum with restored vitality.',
    visualNotes: 'Lush multi-tier gold canopy, bright root sanctuary glow, abundant particles.',
  },
  {
    id: 'eternal',
    label: '5. Eternal',
    order: 5,
    percent: 100,
    summary: 'Full celestial majesty towering over the Heartlands as an unquenchable beacon.',
    visualNotes: 'Transcendent golden-violet blossom aura, soaring particles, zenith radiance.',
  },
];

export const LANDMARK_RESTORATION_STAGES: LandmarkStageMeta[] = [
  {
    id: 'ruined',
    label: '1. Ruined',
    order: 1,
    defaultPercent: 18,
    summary: 'Weathered masonry, collapsed timberwork, and creeping ivy reclaim the stone.',
  },
  {
    id: 'repaired',
    label: '2. Repaired',
    order: 2,
    defaultPercent: 40,
    summary: 'Structural stone arches, timber supports, and clear walkways are stabilized.',
  },
  {
    id: 'restored',
    label: '3. Restored',
    order: 3,
    defaultPercent: 65,
    summary: 'Original medieval battlements, roofs, banners, and warm braziers stand whole again.',
  },
  {
    id: 'flourishing',
    label: '4. Flourishing',
    order: 4,
    defaultPercent: 85,
    summary: 'Crafted gold trim, vibrant flora, and bright lanterns signal a thriving haven.',
  },
  {
    id: 'legendary',
    label: '5. Legendary',
    order: 5,
    defaultPercent: 100,
    summary: 'Crowned with sacred Aetheric gold emblems and ceremonial light across the skyline.',
  },
];

export const HEARTLANDS_LANDMARKS: LandmarkDefinition[] = [
  {
    id: 'ancient_castle',
    name: 'Ancient Castle',
    subtitle: 'Northern Bastion of the High Keep',
    description:
      'A fortified medieval citadel overlooking the northern ridge of the Heartlands. Walk through the arched gatehouse into its stone courtyard flanked by watchtowers and banners.',
    lore:
      'Once the seat of the Shield-Wardens of Aetheria, its gatehouse held firm during the Great Fall until its watchfires were extinguished.',
    coordinates: { x: 0, z: -72 },
    interactionRadius: 11.5,
    artwork: aetheriaCitadelKingdomImg,
    stageSummaries: {
      ruined: 'Crumbling merlons, weathered gate doors, and unlit courtyard sconces.',
      repaired: 'Reinforced gatehouse stone, patched curtain walls, and steady torchlight.',
      restored: 'Rising watchtower spires, royal purple banners, and open stone courtyard.',
      flourishing: 'Gilded gate crest, bright battlements, and lush courtyard flora.',
      legendary: 'Radiant Aetheria citadel keep gleaming with golden beacons and banners.',
    },
  },
  {
    id: 'forgotten_village',
    name: 'Forgotten Village',
    subtitle: 'Western Crossroads Hamlet',
    description:
      'A quiet medieval settlement along the western cobble road with timber-framed cottages, a stone village well, and mossy garden walls.',
    lore:
      'Traders, herbalists, and blacksmith apprentices gathered around this central well before the mist drove families beyond the river.',
    coordinates: { x: -50, z: -12 },
    interactionRadius: 11.0,
    artwork: blacksmithForgeImg,
    stageSummaries: {
      ruined: 'Sagging cottage roofs, cold hearths, and overgrown cobblestone lanes.',
      repaired: 'Mended timber trusses, cleared stone paths, and restored well stonework.',
      restored: 'Intact pitched roofs, glowing cottage lanterns, and lively stone square.',
      flourishing: 'Warm window hearths, blooming village planters, and golden road lamps.',
      legendary: 'Celebratory hamlet glowing with golden banners and master-crafted woodwork.',
    },
  },
  {
    id: 'ancient_bridge',
    name: 'Ancient Bridge',
    subtitle: 'Span of the Whispering River',
    description:
      'A multi-arch medieval stone bridge crossing the swift emerald river beside a cascading rock waterfall, linking the Golden Tree sanctuary to the northern citadel.',
    lore:
      'Stonemasons anchored each arch into riverbed bedrock with gold-riveted keystones so travelers could cross even in monsoon floods.',
    coordinates: { x: 0, z: -36 },
    interactionRadius: 8.8,
    artwork: heroAetheriaWorldImg,
    stageSummaries: {
      ruined: 'Cracked parapet rails and moss-stained flagstones above churning rapids.',
      repaired: 'Replaced bridge coping stones and stabilized arch keystones.',
      restored: 'Full carved stone balusters and twin lit bridge lanterns at each approach.',
      flourishing: 'Golden bridge inlays and blossoming riverbank reeds flanking the crossing.',
      legendary: 'Ceremonial royal crossing crowned with radiant golden arch lanterns.',
    },
  },
  {
    id: 'sacred_shrine',
    name: 'Sacred Shrine',
    subtitle: 'Eastern Sunstone Grove',
    description:
      'A circle of carved stone pillars and moss-draped altar steps tucked inside the eastern hills, resonating with a levitating Aether crystal monolith.',
    lore:
      'Pilgrims walked to this grove at dawn to align their oaths beneath the golden canopy light of the Heartlands.',
    coordinates: { x: 52, z: -14 },
    interactionRadius: 9.5,
    artwork: aetheriaSkyVistaImg,
    stageSummaries: {
      ruined: 'Toppled stone columns and a dim cracked altar ring.',
      repaired: 'Upright fluted pillars and cleared mossy sanctuary steps.',
      restored: 'Glowing rune dais, lit sacred braziers, and humming Aether crystal.',
      flourishing: 'Gilded pillar capitals and golden wildflowers ringing the sanctuary.',
      legendary: 'Radiant celestial shrine pulsing with an ascending spire of golden light.',
    },
  },
];

export const DEFAULT_WORLD_STATE: WorldPersistenceState = {
  hasEnteredWorld: false,
  selectedRegionId: 'heartlands',
  goldenTreeStage: 'growing',
  landmarks: {
    ancient_castle: {
      id: 'ancient_castle',
      stage: 'repaired',
      restorationPercent: 40,
    },
    forgotten_village: {
      id: 'forgotten_village',
      stage: 'ruined',
      restorationPercent: 18,
    },
    ancient_bridge: {
      id: 'ancient_bridge',
      stage: 'restored',
      restorationPercent: 65,
    },
    sacred_shrine: {
      id: 'sacred_shrine',
      stage: 'repaired',
      restorationPercent: 40,
    },
  },
  graphicsQuality: 'high',
};

export const getGoldenTreeStageMeta = (stage: GoldenTreeStage): GoldenTreeStageMeta =>
  GOLDEN_TREE_STAGES.find(s => s.id === stage) || GOLDEN_TREE_STAGES[2];

export const getLandmarkDefinition = (id: LandmarkId): LandmarkDefinition =>
  HEARTLANDS_LANDMARKS.find(l => l.id === id) || HEARTLANDS_LANDMARKS[0];

export const getLandmarkStageMeta = (stage: LandmarkRestorationStage): LandmarkStageMeta =>
  LANDMARK_RESTORATION_STAGES.find(s => s.id === stage) || LANDMARK_RESTORATION_STAGES[0];
