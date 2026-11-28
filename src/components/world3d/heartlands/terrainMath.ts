import { HEARTLANDS_LANDMARKS } from '../../../data/heartlandsWorldData';
import { LandmarkId } from '../../../types/game';

export const WORLD_PLAYABLE_RADIUS = 96;
export const WATER_LEVEL = 0.05;

export interface CircleCollider {
  id?: string;
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider {
  id?: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface InteractableTarget {
  kind: 'golden_tree' | 'landmark';
  id: 'golden_tree' | LandmarkId;
  label: string;
  distance: number;
  x: number;
  z: number;
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Computes river centerline Z coordinate for any X coordinate so the river meanders naturally
 * through z ≈ -36 while passing cleanly beneath the Ancient Bridge at (0, -36).
 */
export const getRiverCenterZ = (x: number): number => {
  return -36 + Math.sin(x * 0.055) * 4.2 + Math.cos(x * 0.025) * 2.1;
};

/**
 * Signed distance from any cobblestone path segment for road flattening & vertex coloring.
 */
function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const lenSq = abx * abx + abz * abz;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / lenSq)) : 0;
  const cx = ax + abx * t;
  const cz = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

export const getPathProximityFactor = (x: number, z: number): number => {
  const segments: Array<[number, number, number, number]> = [
    [0, 18, 0, -24], // Southern approach -> Golden Tree -> North road
    [0, -48, 0, -64], // Bridge north exit -> Castle gate
    [-10, -2, -46, -12], // Golden Tree -> Forgotten Village
    [10, -2, 48, -14], // Golden Tree -> Sacred Shrine
  ];
  let minD = 999;
  for (const [ax, az, bx, bz] of segments) {
    const d = distToSegment(x, z, ax, az, bx, bz);
    if (d < minD) minD = d;
  }
  return 1 - smoothstep(1.9, 3.8, minD);
};

/**
 * Continuous procedural heightmap for The Heartlands.
 * Coordinates:
 *  - Golden Tree Sanctuary: (0, 0) flat dais plateau ~2.0m
 *  - Whispering River: z ≈ -36 depressed channel ~ -1.35m (water plane at +0.05m)
 *  - Ancient Bridge: (0, -36) spans the river at deck height ~2.9..3.6m
 *  - Ancient Castle: (0, -72) elevated northern plateau ~3.2m
 *  - Forgotten Village: (-50, -12) gentle valley clearing ~2.1m
 *  - Sacred Shrine: (52, -14) elevated eastern hill ~3.4m
 */
export const getTerrainHeight = (x: number, z: number): number => {
  // Natural rolling hills
  let h =
    2.1 +
    Math.sin(x * 0.042 + 0.4) * Math.cos(z * 0.038 - 0.3) * 1.35 +
    Math.sin(x * 0.095 - z * 0.07) * 0.48 +
    Math.cos((x + z) * 0.022) * 0.75;

  // 1. Flatten Central Golden Sanctuary Plateau (0, 0)
  const dCenter = Math.hypot(x, z);
  const centerBlend = 1 - smoothstep(10.5, 22, dCenter);
  h = h * (1 - centerBlend) + 2.0 * centerBlend;

  // 2. Flatten Ancient Castle Plateau (0, -72)
  const dCastle = Math.hypot(x * 0.85, z + 72);
  const castleBlend = 1 - smoothstep(14, 25, dCastle);
  h = h * (1 - castleBlend) + 3.2 * castleBlend;

  // 3. Flatten Forgotten Village Clearing (-50, -12)
  const dVillage = Math.hypot(x + 50, z + 12);
  const villageBlend = 1 - smoothstep(13, 24, dVillage);
  h = h * (1 - villageBlend) + 2.15 * villageBlend;

  // 4. Sacred Shrine Hilltop Terrace (52, -14)
  const dShrine = Math.hypot(x - 52, z + 14);
  const shrineBlend = 1 - smoothstep(9.5, 20, dShrine);
  h = h * (1 - shrineBlend) + 3.35 * shrineBlend;

  // 5. Waterfall Bluff upstream (-34, -44) creating dramatic waterfall cliff
  const dWaterfallCliff = Math.hypot(x + 35, z + 47);
  const cliffBoost = (1 - smoothstep(6, 15, dWaterfallCliff)) * 6.2;
  h += cliffBoost;

  // 6. Carve Whispering River channel across X
  const riverZ = getRiverCenterZ(x);
  const distRiver = Math.abs(z - riverZ);
  const riverCarve = 1 - smoothstep(3.2, 10.5, distRiver);
  const riverBedTarget = -1.35;
  h = h * (1 - riverCarve) + riverBedTarget * riverCarve;

  // 7. Raise scenic perimeter foothills outside playable basin
  const radial = Math.hypot(x, z);
  if (radial > 88) {
    const rim = smoothstep(88, 132, radial);
    h += rim * 18.0 + Math.sin(Math.atan2(z, x) * 9) * rim * 3.8;
  }

  return h;
};

export const getTerrainNormal = (x: number, z: number): [number, number, number] => {
  const eps = 0.45;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
};

/**
 * Arched Ancient Bridge walkable deck height solver covering |x| <= 2.95 and z in [-48.5, -23.5].
 * Connects flush into both riverbanks so the player walks smoothly across above the river.
 */
export const BRIDGE_HALF_WIDTH = 2.65;
export const BRIDGE_Z_START = -23.5; // south bank
export const BRIDGE_Z_END = -48.5;   // north bank

export const getBridgeDeckHeight = (x: number, z: number): number | null => {
  if (Math.abs(x) > BRIDGE_HALF_WIDTH) return null;
  if (z > BRIDGE_Z_START || z < BRIDGE_Z_END) return null;

  const t = (BRIDGE_Z_START - z) / (BRIDGE_Z_START - BRIDGE_Z_END); // 0 south -> 1 north
  const southGround = getTerrainHeight(0, BRIDGE_Z_START);
  const northGround = getTerrainHeight(0, BRIDGE_Z_END);
  const linearBase = southGround * (1 - t) + northGround * t;
  const archLift = Math.sin(t * Math.PI) * 1.45;
  return linearBase + archLift;
};

/**
 * Golden Tree central stone dais height for clean stair climbing around (0,0).
 */
export const getSanctuaryDaisHeight = (x: number, z: number): number | null => {
  const r = Math.hypot(x, z);
  if (r <= 6.2) return 2.48;
  if (r <= 7.8) return 2.24;
  return null;
};

/**
 * Sacred Shrine stepped stone dais at (52, -14).
 */
export const getShrineDaisHeight = (x: number, z: number): number | null => {
  const r = Math.hypot(x - 52, z + 14);
  if (r <= 5.0) return 3.82;
  if (r <= 6.6) return 3.58;
  return null;
};

/**
 * Unified ground/walkable-structure height at any (x, z).
 * Ensures player walks on top of the bridge, sanctuary dais, shrine dais, or terrain cleanly.
 */
export const getWalkableSurfaceHeight = (x: number, z: number, currentY?: number): number => {
  let maxY = getTerrainHeight(x, z);

  const bridgeY = getBridgeDeckHeight(x, z);
  if (bridgeY !== null) {
    // Allow walking onto bridge from bank, or staying on bridge if already near deck elevation
    if (currentY === undefined || currentY >= bridgeY - 1.35) {
      maxY = Math.max(maxY, bridgeY);
    }
  }

  const sanctuaryY = getSanctuaryDaisHeight(x, z);
  if (sanctuaryY !== null) {
    maxY = Math.max(maxY, sanctuaryY);
  }

  const shrineY = getShrineDaisHeight(x, z);
  if (shrineY !== null) {
    maxY = Math.max(maxY, shrineY);
  }

  return maxY;
};

export class WorldCollisionRegistry {
  public circles: CircleCollider[] = [];
  public boxes: BoxCollider[] = [];

  addCircle(x: number, z: number, radius: number, id?: string) {
    this.circles.push({ x, z, radius, id });
  }

  addBox(minX: number, maxX: number, minZ: number, maxZ: number, id?: string) {
    this.boxes.push({ minX, maxX, minZ, maxZ, id });
  }

  resolvePlayerPosition(
    x: number,
    z: number,
    playerRadius = 0.45
  ): { x: number; z: number } {
    let px = x;
    let pz = z;

    // 1. Keep inside Heartlands playable basin
    const distFromOrigin = Math.hypot(px, pz);
    if (distFromOrigin > WORLD_PLAYABLE_RADIUS) {
      const scale = WORLD_PLAYABLE_RADIUS / distFromOrigin;
      px *= scale;
      pz *= scale;
    }

    // 2. Circle colliders (trees, pillars, boulders, wells, towers, Golden Tree trunk)
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      const dx = px - c.x;
      const dz = pz - c.z;
      const minDist = c.radius + playerRadius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = minDist - dist;
        px += (dx / dist) * push;
        pz += (dz / dist) * push;
      }
    }

    // 3. Axis-aligned box colliders (castle walls, cottages, bridge parapets)
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      const closestX = Math.max(b.minX, Math.min(px, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - closestX;
      const dz = pz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < playerRadius * playerRadius) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = playerRadius - dist;
          px += (dx / dist) * overlap;
          pz += (dz / dist) * overlap;
        } else {
          // Inside box fallback: push out along nearest edge
          const penLeft = Math.abs(px - b.minX);
          const penRight = Math.abs(b.maxX - px);
          const penTop = Math.abs(pz - b.minZ);
          const penBot = Math.abs(b.maxZ - pz);
          const minPen = Math.min(penLeft, penRight, penTop, penBot);
          if (minPen === penLeft) px = b.minX - playerRadius;
          else if (minPen === penRight) px = b.maxX + playerRadius;
          else if (minPen === penTop) pz = b.minZ - playerRadius;
          else pz = b.maxZ + playerRadius;
        }
      }
    }

    return { x: px, z: pz };
  }
}

export const getHeartlandsZoneName = (x: number, z: number): string => {
  if (Math.hypot(x, z) < 16) return 'Sanctuary of the Golden Tree';
  if (Math.hypot(x, z + 72) < 19) return 'Ancient Castle Courtyard';
  if (Math.hypot(x + 50, z + 12) < 18) return 'Forgotten Village';
  if (Math.hypot(x - 52, z + 14) < 16) return 'Sacred Shrine Grove';
  if (Math.abs(x) < 6 && z <= -22 && z >= -50) return 'Ancient Stone Bridge';
  if (Math.abs(z - getRiverCenterZ(x)) < 9) return 'Whispering Riverbank';
  if (z < -48) return 'Northern Citadel Ridge';
  if (x < -25) return 'Western Whispering Woods';
  if (x > 25) return 'Eastern Sunstone Hills';
  return 'The Heartlands';
};

export const getNearestInteractable = (
  x: number,
  z: number
): InteractableTarget | null => {
  const candidates: InteractableTarget[] = [];

  const treeDist = Math.hypot(x, z);
  if (treeDist <= 9.8) {
    candidates.push({
      kind: 'golden_tree',
      id: 'golden_tree',
      label: 'The Golden Tree of Life',
      distance: treeDist,
      x: 0,
      z: 0,
    });
  }

  for (const lm of HEARTLANDS_LANDMARKS) {
    const d = Math.hypot(x - lm.coordinates.x, z - lm.coordinates.z);
    if (d <= lm.interactionRadius) {
      candidates.push({
        kind: 'landmark',
        id: lm.id,
        label: lm.name,
        distance: d,
        x: lm.coordinates.x,
        z: lm.coordinates.z,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
};
