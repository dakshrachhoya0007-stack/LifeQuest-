import * as THREE from 'three';
import { LandmarkId, LandmarkRestorationStage, WorldLandmarkState } from '../../../types/game';
import { createCastleStoneTextures, createClothWeaveTexture } from '../heroTextures';
import { createTimberTextures } from './worldTextures';
import {
  BRIDGE_HALF_WIDTH,
  BRIDGE_Z_END,
  BRIDGE_Z_START,
  getBridgeDeckHeight,
  getTerrainHeight,
  WorldCollisionRegistry,
} from './terrainMath';

export interface HeartlandsLandmarksInstance {
  root: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

const STAGE_ORDER: Record<LandmarkRestorationStage, number> = {
  ruined: 0,
  repaired: 1,
  restored: 2,
  flourishing: 3,
  legendary: 4,
};

export function buildHeartlandsLandmarks3d(
  landmarkStates: Record<LandmarkId, WorldLandmarkState>,
  colliders: WorldCollisionRegistry,
  lowPerfMode = false
): HeartlandsLandmarksInstance {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.name = 'heartlands_landmarks';

  const stoneTex = track(createCastleStoneTextures(4, 4));
  const timberTex = track(createTimberTextures('#4b3322'));
  const bannerTex = track(createClothWeaveTexture('#0A1930', '#061225', '#00D9FF'));

  const stoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x53637a,
      map: stoneTex.colorMap,
      bumpMap: stoneTex.bumpMap,
      bumpScale: 0.045,
      roughness: 0.84,
      metalness: 0.08,
    })
  );

  const darkSlateMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x102440,
      roughness: 0.72,
      metalness: 0.22,
    })
  );

  const timberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: timberTex.colorMap,
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const thatchMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6e5938,
      roughness: 0.94,
      metalness: 0.02,
    })
  );

  const plasterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc2b59b,
      roughness: 0.9,
      metalness: 0.02,
    })
  );

  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xcfa756,
      emissive: 0x45310b,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.22,
    })
  );

  const ironMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x16243b,
      metalness: 0.84,
      roughness: 0.44,
    })
  );

  const bannerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bannerTex.colorMap,
      roughness: 0.82,
      side: THREE.DoubleSide,
    })
  );

  const torchMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffba55,
      emissive: 0xff7b1f,
      emissiveIntensity: 2.5,
      roughness: 0.3,
    })
  );

  const windowGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffd280,
      emissive: 0xf09d38,
      emissiveIntensity: 1.5,
      roughness: 0.25,
    })
  );

  const animatedFlames: THREE.Mesh[] = [];
  const animatedBanners: THREE.Mesh[] = [];
  const dynamicLights: Array<{ light: THREE.PointLight; base: number; phase: number }> = [];
  let floatingCrystal: THREE.Mesh | undefined;

  const addTorch = (parent: THREE.Object3D, x: number, y: number, z: number, withLight = false) => {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.65, 6), ironMat);
    bracket.position.set(x, y, z);
    parent.add(bracket);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 6), torchMat);
    flame.position.set(x, y + 0.46, z);
    parent.add(flame);
    animatedFlames.push(flame);

    if (withLight && !lowPerfMode) {
      const l = new THREE.PointLight(0xff9b40, 3.6, 12, 1.6);
      l.position.set(x, y + 0.65, z);
      parent.add(l);
      dynamicLights.push({ light: l, base: 3.6, phase: x * 0.7 + z * 0.3 });
    }
  };

  // =========================================================================
  // LANDMARK A: ANCIENT CASTLE (0, -72)
  // =========================================================================
  {
    const castleStage = STAGE_ORDER[landmarkStates.ancient_castle?.stage || 'repaired'];
    const cx = 0;
    const cz = -72;
    const cy = getTerrainHeight(cx, cz);

    const castleGroup = new THREE.Group();
    castleGroup.name = 'landmark_ancient_castle';
    castleGroup.position.set(cx, cy, cz);
    root.add(castleGroup);

    // Courtyard stone paving floor
    const courtyardSlab = new THREE.Mesh(new THREE.BoxGeometry(24, 0.24, 24), stoneMat);
    courtyardSlab.position.set(0, 0.04, 0);
    courtyardSlab.receiveShadow = true;
    castleGroup.add(courtyardSlab);

    const wallHeight = 5.4 + castleStage * 0.6;

    // Front Gatehouse Pillars + Arched Entryway (open archway at |x| <= 2.4 so player walks inside!)
    [-4.2, 4.2].forEach(xOff => {
      const gateTower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.95, wallHeight + 2.5, 12),
        stoneMat
      );
      gateTower.position.set(xOff, (wallHeight + 2.5) / 2, 11.2);
      gateTower.castShadow = true;
      gateTower.receiveShadow = true;
      castleGroup.add(gateTower);

      colliders.addCircle(cx + xOff, cz + 11.2, 2.0, `castle_gate_tower_${xOff}`);

      if (castleStage >= 2) {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(2.0, 3.4, 12),
          darkSlateMat
        );
        spire.position.set(xOff, wallHeight + 4.15, 11.2);
        spire.castShadow = true;
        castleGroup.add(spire);
      }

      if (castleStage >= 1) {
        addTorch(castleGroup, xOff * 0.68, 3.1, 12.6, xOff > 0);
      }
    });

    // Gatehouse Arch Lintel spanning above open doorway
    const gateLintel = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.2, 2.6), stoneMat);
    gateLintel.position.set(0, wallHeight + 0.5, 11.2);
    gateLintel.castShadow = true;
    castleGroup.add(gateLintel);

    // Carved Wooden Gate Doors (swung open inside arch)
    [-2.1, 2.1].forEach(sideX => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.1, 1.9), timberMat);
      door.position.set(sideX, 2.05, 10.1);
      door.rotation.y = sideX < 0 ? 0.25 : -0.25;
      door.castShadow = true;
      castleGroup.add(door);
    });

    if (castleStage >= 3) {
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), goldMat);
      crest.scale.set(0.95, 1.25, 0.35);
      crest.position.set(0, wallHeight + 0.7, 12.55);
      castleGroup.add(crest);
    }

    // Front Flanking Curtain Walls
    [-8.6, 8.6].forEach(xWall => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(6.8, wallHeight, 1.6), stoneMat);
      w.position.set(xWall, wallHeight / 2, 11.2);
      w.castShadow = true;
      w.receiveShadow = true;
      castleGroup.add(w);
      colliders.addBox(cx + xWall - 3.4, cx + xWall + 3.4, cz + 10.3, cz + 12.1);
    });

    // Side & Rear Curtain Walls enclosing navigable inner courtyard
    [-11.8, 11.8].forEach(sideX => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, wallHeight, 22.8), stoneMat);
      sideWall.position.set(sideX, wallHeight / 2, 0);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      castleGroup.add(sideWall);
      colliders.addBox(cx + sideX - 0.9, cx + sideX + 0.9, cz - 11.6, cz + 11.6);
    });

    // Rear Main Keep Citadel
    const keepWidth = 14.5;
    const keepHeight = wallHeight + 4.5 + castleStage * 0.8;
    const mainKeep = new THREE.Mesh(new THREE.BoxGeometry(keepWidth, keepHeight, 7.6), stoneMat);
    mainKeep.position.set(0, keepHeight / 2, -8.2);
    mainKeep.castShadow = true;
    mainKeep.receiveShadow = true;
    castleGroup.add(mainKeep);
    colliders.addBox(cx - 7.4, cx + 7.4, cz - 12.2, cz - 4.4);

    // 4 Corner Bastion Watchtowers
    [
      [-11.8, 11.2],
      [11.8, 11.2],
      [-11.8, -11.2],
      [11.8, -11.2],
    ].forEach(([tx, tz], tIdx) => {
      const tHeight = wallHeight + 3.6 + castleStage * 0.5;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, tHeight, 14), stoneMat);
      tower.position.set(tx, tHeight / 2, tz);
      tower.castShadow = true;
      tower.receiveShadow = true;
      castleGroup.add(tower);
      colliders.addCircle(cx + tx, cz + tz, 2.45);

      if (castleStage >= 2 || tIdx < 2) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.45, 3.8, 14), darkSlateMat);
        cap.position.set(tx, tHeight + 1.85, tz);
        cap.castShadow = true;
        castleGroup.add(cap);
      }
    });

    // Courtyard Royal Banners
    if (castleStage >= 2) {
      [-3.8, 3.8].forEach(bx => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 8), ironMat);
        pole.position.set(bx, 2.1, -3.5);
        castleGroup.add(pole);

        const bannerGeo = new THREE.PlaneGeometry(0.95, 2.4, 4, 8);
        bannerGeo.translate(0, -1.2, 0);
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(bx, 4.05, -3.45);
        banner.castShadow = true;
        castleGroup.add(banner);
        animatedBanners.push(banner);
      });
    }

    if (castleStage >= 4 && !lowPerfMode) {
      const beacon = new THREE.PointLight(0xffcf6b, 5.2, 32, 1.3);
      beacon.position.set(0, keepHeight + 2.5, -8.2);
      castleGroup.add(beacon);
      dynamicLights.push({ light: beacon, base: 5.2, phase: 1.5 });
    }
  }

  // =========================================================================
  // LANDMARK B: FORGOTTEN VILLAGE (-50, -12)
  // =========================================================================
  {
    const villageStage = STAGE_ORDER[landmarkStates.forgotten_village?.stage || 'ruined'];
    const vx = -50;
    const vz = -12;
    const vy = getTerrainHeight(vx, vz);

    const villageGroup = new THREE.Group();
    villageGroup.name = 'landmark_forgotten_village';
    villageGroup.position.set(vx, vy, vz);
    root.add(villageGroup);

    // Central Stone Village Well
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 1.05, 12), stoneMat);
    wellBase.position.set(0, 0.52, 0);
    wellBase.castShadow = true;
    wellBase.receiveShadow = true;
    villageGroup.add(wellBase);
    colliders.addCircle(vx, vz, 1.6, 'village_well');

    if (villageStage >= 1) {
      [-1.05, 1.05].forEach(px => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.0, 8), timberMat);
        post.position.set(px, 1.85, 0);
        villageGroup.add(post);
      });
      const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.25, 4), thatchMat);
      wellRoof.position.set(0, 3.15, 0);
      wellRoof.rotation.y = Math.PI / 4;
      wellRoof.castShadow = true;
      villageGroup.add(wellRoof);
    }

    // 4 Timber-Framed Medieval Cottages arranged around the cobblestone square
    const buildCottage = (ox: number, oz: number, rotY: number, damaged: boolean) => {
      const house = new THREE.Group();
      house.position.set(ox, 0, oz);
      house.rotation.y = rotY;

      const foundation = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.75, 4.4), stoneMat);
      foundation.position.y = 0.38;
      foundation.castShadow = true;
      foundation.receiveShadow = true;
      house.add(foundation);

      const walls = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.75, 4.0), plasterMat);
      walls.position.y = 2.05;
      walls.castShadow = true;
      walls.receiveShadow = true;
      house.add(walls);

      // Timber corner beams
      [-2.55, 2.55].forEach(bx => {
        [-1.95, 1.95].forEach(bz => {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.9, 0.24), timberMat);
          beam.position.set(bx, 2.08, bz);
          house.add(beam);
        });
      });

      // Oak Front Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.95, 0.18), timberMat);
      door.position.set(0, 1.38, 2.02);
      house.add(door);

      // Windows (lit when stage >= 2)
      const winMat = villageStage >= 2 ? windowGlowMat : darkSlateMat;
      [-1.55, 1.55].forEach(wx => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.14), winMat);
        win.position.set(wx, 2.1, 2.01);
        house.add(win);
      });

      // Pitched Gable Roof (tilted slightly if damaged & ruined)
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-2.95, 0);
      roofShape.lineTo(0, 2.2);
      roofShape.lineTo(2.95, 0);
      roofShape.closePath();
      const roofGeo = track(
        new THREE.ExtrudeGeometry(roofShape, {
          depth: 4.5,
          bevelEnabled: false,
        })
      );
      roofGeo.translate(0, 0, -2.25);
      const roof = new THREE.Mesh(roofGeo, thatchMat);
      roof.position.y = 3.42;
      if (damaged && villageStage === 0) {
        roof.rotation.z = 0.09;
        roof.position.y -= 0.18;
      }
      roof.castShadow = true;
      house.add(roof);

      // Stone Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.2, 0.85), stoneMat);
      chimney.position.set(1.5, 4.4, -0.6);
      chimney.castShadow = true;
      house.add(chimney);

      villageGroup.add(house);
      colliders.addCircle(vx + ox, vz + oz, 3.25);
    };

    buildCottage(-8.2, -6.5, 0.48, true);
    buildCottage(7.5, -7.2, -0.45, false);
    buildCottage(-8.0, 7.2, 2.45, false);
    buildCottage(6.8, 7.5, -2.5, true);

    if (villageStage >= 2) {
      addTorch(villageGroup, -2.2, 1.4, 2.2, true);
      addTorch(villageGroup, 2.2, 1.4, -2.2, false);
    }
  }

  // =========================================================================
  // LANDMARK C: ANCIENT BRIDGE (0, -36) — Fully Walkable Across River!
  // =========================================================================
  {
    const bridgeStage = STAGE_ORDER[landmarkStates.ancient_bridge?.stage || 'restored'];
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'landmark_ancient_bridge';
    root.add(bridgeGroup);

    const segmentCount = 16;
    const zSpan = BRIDGE_Z_START - BRIDGE_Z_END;
    const stepZ = zSpan / segmentCount;

    // Walkable Arched Deck Slabs & Side Stone Parapets
    for (let i = 0; i < segmentCount; i++) {
      const zA = BRIDGE_Z_START - i * stepZ;
      const zB = zA - stepZ;
      const zMid = (zA + zB) * 0.5;
      const yA = getBridgeDeckHeight(0, zA) ?? 2.0;
      const yB = getBridgeDeckHeight(0, zB) ?? 2.0;
      const yMid = (yA + yB) * 0.5;
      const slope = Math.atan2(yB - yA, -stepZ);

      const deckSlab = new THREE.Mesh(
        new THREE.BoxGeometry(BRIDGE_HALF_WIDTH * 2, 0.45, stepZ + 0.16),
        stoneMat
      );
      deckSlab.position.set(0, yMid - 0.22, zMid);
      deckSlab.rotation.x = slope;
      deckSlab.castShadow = true;
      deckSlab.receiveShadow = true;
      bridgeGroup.add(deckSlab);

      // Left & Right carved stone parapet walls along the bridge
      [-BRIDGE_HALF_WIDTH + 0.15, BRIDGE_HALF_WIDTH - 0.15].forEach(px => {
        if (bridgeStage === 0 && i % 4 === 2) return; // Ruined gap in rail visually
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.88, stepZ + 0.08),
          stoneMat
        );
        rail.position.set(px, yMid + 0.42, zMid);
        rail.rotation.x = slope;
        rail.castShadow = true;
        bridgeGroup.add(rail);
      });
    }

    // Bridge Parapet Colliders (prevent walking off sides of bridge deck)
    colliders.addBox(-BRIDGE_HALF_WIDTH - 0.45, -BRIDGE_HALF_WIDTH + 0.25, BRIDGE_Z_END + 0.5, BRIDGE_Z_START - 0.5, 'bridge_rail_l');
    colliders.addBox(BRIDGE_HALF_WIDTH - 0.25, BRIDGE_HALF_WIDTH + 0.45, BRIDGE_Z_END + 0.5, BRIDGE_Z_START - 0.5, 'bridge_rail_r');

    // Submerged Stone Bridge Piers Anchored Into Riverbed
    [-31, -36, -41].forEach(pz => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE_HALF_WIDTH * 2 + 0.7, 5.2, 1.55), stoneMat);
      pier.position.set(0, 0.9, pz);
      pier.castShadow = true;
      pier.receiveShadow = true;
      bridgeGroup.add(pier);
    });

    // Bridge Approach Pillars + Warm Lanterns
    [BRIDGE_Z_START - 0.6, BRIDGE_Z_END + 0.6].forEach(pz => {
      const baseH = getBridgeDeckHeight(0, pz) ?? 2.0;
      [-BRIDGE_HALF_WIDTH + 0.08, BRIDGE_HALF_WIDTH - 0.08].forEach(px => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.85, 0.65), stoneMat);
        post.position.set(px, baseH + 0.9, pz);
        post.castShadow = true;
        bridgeGroup.add(post);

        if (bridgeStage >= 3) {
          const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
          finial.position.set(px, baseH + 2.05, pz);
          bridgeGroup.add(finial);
        }

        if (bridgeStage >= 2) {
          addTorch(bridgeGroup, px, baseH + 1.9, pz, px > 0 && pz > -30);
        }
      });
    });
  }

  // =========================================================================
  // LANDMARK D: SACRED SHRINE (52, -14)
  // =========================================================================
  {
    const shrineStage = STAGE_ORDER[landmarkStates.sacred_shrine?.stage || 'repaired'];
    const sx = 52;
    const sz = -14;
    const sy = getTerrainHeight(sx, sz);

    const shrineGroup = new THREE.Group();
    shrineGroup.name = 'landmark_sacred_shrine';
    shrineGroup.position.set(sx, sy, sz);
    root.add(shrineGroup);

    // Circular Stepped Stone Sanctuary Dais
    const lowerStep = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.0, 0.26, 28), stoneMat);
    lowerStep.position.y = 0.12;
    lowerStep.receiveShadow = true;
    shrineGroup.add(lowerStep);

    const upperStep = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.25, 0.28, 28), stoneMat);
    upperStep.position.y = 0.36;
    upperStep.receiveShadow = true;
    shrineGroup.add(upperStep);

    // Central Pedestal & Floating Aether Altar Crystal
    const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 1.35, 10), stoneMat);
    altarBase.position.y = 1.15;
    altarBase.castShadow = true;
    shrineGroup.add(altarBase);
    colliders.addCircle(sx, sz, 1.35, 'shrine_altar');

    const crystalMat = track(
      new THREE.MeshStandardMaterial({
        color: shrineStage >= 3 ? 0xffe28a : 0x70c8ff,
        emissive: shrineStage >= 2 ? 0xe6ad38 : 0x3b6099,
        emissiveIntensity: 0.7 + shrineStage * 0.45,
        metalness: 0.25,
        roughness: 0.14,
      })
    );
    floatingCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), crystalMat);
    floatingCrystal.position.y = 2.65;
    floatingCrystal.scale.set(0.85, 1.5, 0.85);
    shrineGroup.add(floatingCrystal);

    // 6 Carved Stone Columns Ringing the Sanctuary
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const px = Math.cos(ang) * 4.4;
      const pz = Math.sin(ang) * 4.4;
      const isBroken = shrineStage === 0 && i % 2 === 1;
      const colHeight = isBroken ? 2.1 : 4.2;

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, colHeight, 10), stoneMat);
      col.position.set(px, 0.48 + colHeight / 2, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      shrineGroup.add(col);
      colliders.addCircle(sx + px, sz + pz, 0.56);

      if (!isBroken && shrineStage >= 3) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.95), goldMat);
        cap.position.set(px, 0.48 + colHeight + 0.12, pz);
        shrineGroup.add(cap);
      }

      if (shrineStage >= 2 && i % 2 === 0) {
        addTorch(shrineGroup, px * 0.82, 0.7, pz * 0.82, i === 0);
      }
    }

    if (shrineStage >= 2 && !lowPerfMode) {
      const shrineLight = new THREE.PointLight(0xffcf6b, 3.2 + shrineStage * 0.9, 20, 1.4);
      shrineLight.position.set(0, 3.2, 0);
      shrineGroup.add(shrineLight);
      dynamicLights.push({ light: shrineLight, base: 3.2 + shrineStage * 0.9, phase: 2.3 });
    }
  }

  const update = (elapsed: number) => {
    animatedFlames.forEach((f, idx) => {
      const s = 0.95 + Math.sin(elapsed * 9.5 + idx * 1.9) * 0.16;
      f.scale.set(0.95 + Math.cos(elapsed * 7 + idx) * 0.08, s, 0.95);
    });
    animatedBanners.forEach((b, idx) => {
      b.rotation.x = 0.06 + Math.sin(elapsed * 2.2 + idx * 1.1) * 0.08;
      b.rotation.z = Math.cos(elapsed * 1.5 + idx) * 0.03;
    });
    dynamicLights.forEach(item => {
      item.light.intensity =
        item.base + Math.sin(elapsed * 8.4 + item.phase) * 0.65 + Math.cos(elapsed * 13 + item.phase) * 0.22;
    });
    if (floatingCrystal) {
      floatingCrystal.rotation.y = elapsed * 0.9;
      floatingCrystal.position.y = 2.65 + Math.sin(elapsed * 1.9) * 0.22;
    }
  };

  const dispose = () => {
    disposables.forEach(d => d.dispose());
    root.traverse(obj => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
  };

  return { root, update, dispose };
}
