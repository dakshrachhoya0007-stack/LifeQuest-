import * as THREE from 'three';
import { GoldenTreeStage } from '../../../types/game';
import { createCastleStoneTextures } from '../heroTextures';
import { createGoldenBarkTextures } from './worldTextures';
import { WorldCollisionRegistry } from './terrainMath';

export interface GoldenTree3DInstance {
  root: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

const STAGE_CONFIG: Record<
  GoldenTreeStage,
  {
    barkColor: number;
    emissiveColor: number;
    barkEmissiveIntensity: number;
    leafColor: number;
    leafEmissive: number;
    leafEmissiveIntensity: number;
    canopyScale: number;
    foliageDensity: number;
    lightColor: number;
    lightIntensity: number;
    runeOpacity: number;
    particleScale: number;
    treeScale: number;
  }
> = {
  fallen: {
    barkColor: 0x3a2c22,
    emissiveColor: 0x5c2e0a,
    barkEmissiveIntensity: 0.14,
    leafColor: 0x6b4b28,
    leafEmissive: 0x5e3410,
    leafEmissiveIntensity: 0.25,
    canopyScale: 0.35,
    foliageDensity: 0.22,
    lightColor: 0xd47f38,
    lightIntensity: 1.4,
    runeOpacity: 0.18,
    particleScale: 0.45,
    treeScale: 0.86,
  },
  awakening: {
    barkColor: 0x5a4124,
    emissiveColor: 0xd48e29,
    barkEmissiveIntensity: 0.38,
    leafColor: 0xd9a848,
    leafEmissive: 0xc27b1e,
    leafEmissiveIntensity: 0.65,
    canopyScale: 0.68,
    foliageDensity: 0.5,
    lightColor: 0xffb84d,
    lightIntensity: 3.2,
    runeOpacity: 0.52,
    particleScale: 0.8,
    treeScale: 0.94,
  },
  growing: {
    barkColor: 0x6d5027,
    emissiveColor: 0xe6a838,
    barkEmissiveIntensity: 0.48,
    leafColor: 0xf0c15a,
    leafEmissive: 0xd99b26,
    leafEmissiveIntensity: 0.92,
    canopyScale: 0.9,
    foliageDensity: 0.78,
    lightColor: 0xffcf6b,
    lightIntensity: 4.8,
    runeOpacity: 0.78,
    particleScale: 1.0,
    treeScale: 1.0,
  },
  radiant: {
    barkColor: 0x826029,
    emissiveColor: 0xffc852,
    barkEmissiveIntensity: 0.72,
    leafColor: 0xffd773,
    leafEmissive: 0xf5b027,
    leafEmissiveIntensity: 1.25,
    canopyScale: 1.08,
    foliageDensity: 0.95,
    lightColor: 0xffe08a,
    lightIntensity: 6.8,
    runeOpacity: 0.95,
    particleScale: 1.25,
    treeScale: 1.08,
  },
  eternal: {
    barkColor: 0x99732e,
    emissiveColor: 0xffe07d,
    barkEmissiveIntensity: 0.95,
    leafColor: 0xffe89e,
    leafEmissive: 0xffc23b,
    leafEmissiveIntensity: 1.55,
    canopyScale: 1.22,
    foliageDensity: 1.0,
    lightColor: 0xffe9a6,
    lightIntensity: 8.6,
    runeOpacity: 1.0,
    particleScale: 1.55,
    treeScale: 1.15,
  },
};

export function buildGoldenTree3d(
  stage: GoldenTreeStage,
  colliders: WorldCollisionRegistry,
  lowPerfMode = false
): GoldenTree3DInstance {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.growing;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  const root = new THREE.Group();
  root.name = `golden_tree_${stage}`;
  // Grounded on central Sanctuary plateau (terrain y ≈ 2.0)
  const baseTerrainY = 2.0;
  root.position.set(0, baseTerrainY, 0);

  const stoneTex = track(createCastleStoneTextures(5, 5));
  const barkTex = track(createGoldenBarkTextures());

  const stoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x625d6b,
      map: stoneTex.colorMap,
      bumpMap: stoneTex.bumpMap,
      bumpScale: 0.04,
      roughness: 0.84,
      metalness: 0.08,
    })
  );

  const goldTrimMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd6ae5b,
      emissive: 0x6e4f16,
      emissiveIntensity: cfg.runeOpacity * 0.45,
      metalness: 0.88,
      roughness: 0.24,
    })
  );

  const barkMat = track(
    new THREE.MeshStandardMaterial({
      color: cfg.barkColor,
      map: barkTex.colorMap,
      bumpMap: barkTex.bumpMap,
      bumpScale: 0.06,
      emissive: cfg.emissiveColor,
      emissiveIntensity: cfg.barkEmissiveIntensity,
      roughness: 0.68,
      metalness: 0.28,
    })
  );

  const leafMat = track(
    new THREE.MeshStandardMaterial({
      color: cfg.leafColor,
      emissive: cfg.leafEmissive,
      emissiveIntensity: cfg.leafEmissiveIntensity,
      roughness: 0.42,
      metalness: 0.16,
      side: THREE.DoubleSide,
    })
  );

  // 1. Ancient Stepped Stone Sanctuary Dais
  const outerStep = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8.2, 0.26, 36), stoneMat);
  outerStep.position.y = 0.11;
  outerStep.receiveShadow = true;
  root.add(outerStep);

  const upperDais = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.45, 0.26, 36), stoneMat);
  upperDais.position.y = 0.35;
  upperDais.receiveShadow = true;
  root.add(upperDais);

  // Glowing golden sanctuary rune ring around the roots
  const runeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffd778,
      emissive: 0xf5b83d,
      emissiveIntensity: 0.6 + cfg.runeOpacity * 1.4,
      transparent: true,
      opacity: 0.35 + cfg.runeOpacity * 0.6,
      roughness: 0.25,
    })
  );
  const innerRuneRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.075, 8, 56), runeMat);
  innerRuneRing.rotation.x = Math.PI / 2;
  innerRuneRing.position.y = 0.49;
  root.add(innerRuneRing);

  const outerRuneRing = new THREE.Mesh(new THREE.TorusGeometry(5.85, 0.05, 6, 64), goldTrimMat);
  outerRuneRing.rotation.x = Math.PI / 2;
  outerRuneRing.position.y = 0.49;
  root.add(outerRuneRing);

  // 8 carved perimeter sanctuary low obelisks / bollards
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rx = Math.cos(ang) * 5.9;
    const rz = Math.sin(ang) * 5.9;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.35, 8), stoneMat);
    pillar.position.set(rx, 1.05, rz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    root.add(pillar);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), runeMat);
    crystal.position.set(rx, 1.92, rz);
    root.add(crystal);

    colliders.addCircle(rx, rz, 0.36, `sanctuary_pillar_${i}`);
  }

  // Register solid central trunk collider so character walks onto dais & around roots smoothly
  colliders.addCircle(0, 0, 1.65, 'golden_tree_trunk');

  // 2. Massive Twisted Golden Tree Trunk + Buttress Roots + Branching Boughs
  const treeGroup = new THREE.Group();
  treeGroup.position.y = 0.46;
  treeGroup.scale.setScalar(cfg.treeScale);
  root.add(treeGroup);

  // Main gnarled multi-strand trunk splines
  const trunkStrands = 4;
  for (let s = 0; s < trunkStrands; s++) {
    const baseAngle = (s / trunkStrands) * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const twist = baseAngle + t * 1.45;
      const r = (1.05 - t * 0.65) * (s === 0 ? 0.55 : 0.82);
      pts.push(
        new THREE.Vector3(
          Math.cos(twist) * r,
          t * 8.6,
          Math.sin(twist) * r
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const trunkGeom = new THREE.TubeGeometry(curve, 20, 0.62, 10, false);
    const trunkMesh = new THREE.Mesh(trunkGeom, barkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);
  }

  // 7 Sweeping Buttress Roots gripping the sanctuary dais
  const rootCount = 7;
  for (let r = 0; r < rootCount; r++) {
    const ang = (r / rootCount) * Math.PI * 2 + 0.25;
    const len = 3.6 + (r % 2) * 0.9;
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(ang) * 0.65, 2.35, Math.sin(ang) * 0.65),
      new THREE.Vector3(Math.cos(ang + 0.14) * (len * 0.52), 0.72, Math.sin(ang + 0.14) * (len * 0.52)),
      new THREE.Vector3(Math.cos(ang - 0.06) * len, 0.08, Math.sin(ang - 0.06) * len),
      new THREE.Vector3(Math.cos(ang) * (len + 0.55), -0.16, Math.sin(ang) * (len + 0.55)),
    ]);
    const rootGeom = new THREE.TubeGeometry(rootCurve, 14, 0.28, 7, false);
    const rootMesh = new THREE.Mesh(rootGeom, barkMat);
    rootMesh.castShadow = true;
    rootMesh.receiveShadow = true;
    treeGroup.add(rootMesh);
  }

  // 3. Complex Spreading Canopy Branches & Leaf Cluster Coordinates
  const branchTips: THREE.Vector3[] = [];
  const mainBranches = 8;

  for (let b = 0; b < mainBranches; b++) {
    const az = (b / mainBranches) * Math.PI * 2 + (b % 2) * 0.18;
    const tierY = 6.2 + (b % 3) * 1.15;
    const reach = 4.6 + (b % 2) * 1.65;
    const endY = tierY + 3.1 + (b % 2) * 1.25;

    const p0 = new THREE.Vector3(Math.cos(az) * 0.45, tierY - 0.7, Math.sin(az) * 0.45);
    const p1 = new THREE.Vector3(Math.cos(az + 0.12) * (reach * 0.5), tierY + 1.4, Math.sin(az + 0.12) * (reach * 0.5));
    const p2 = new THREE.Vector3(Math.cos(az) * reach, endY, Math.sin(az) * reach);

    const bCurve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const bMesh = new THREE.Mesh(new THREE.TubeGeometry(bCurve, 12, 0.24, 7, false), barkMat);
    bMesh.castShadow = true;
    treeGroup.add(bMesh);
    branchTips.push(p2);

    // Secondary forked sub-branches
    [-0.45, 0.42].forEach((offsetAng, subIdx) => {
      const subAz = az + offsetAng;
      const subEnd = new THREE.Vector3(
        p1.x + Math.cos(subAz) * (2.5 + subIdx * 0.5),
        p1.y + 1.85 + subIdx * 0.65,
        p1.z + Math.sin(subAz) * (2.5 + subIdx * 0.5)
      );
      const subCurve = new THREE.CatmullRomCurve3([p1, subEnd]);
      const subMesh = new THREE.Mesh(new THREE.TubeGeometry(subCurve, 8, 0.13, 6, false), barkMat);
      subMesh.castShadow = true;
      treeGroup.add(subMesh);
      branchTips.push(subEnd);
    });
  }

  // Crown apex branches
  branchTips.push(
    new THREE.Vector3(0, 12.2, 0),
    new THREE.Vector3(1.6, 11.4, 1.3),
    new THREE.Vector3(-1.8, 11.2, -1.2),
    new THREE.Vector3(-1.4, 11.5, 1.6),
    new THREE.Vector3(1.5, 11.3, -1.7)
  );

  // 4. Instanced Golden Canopy Foliage Clusters (scales dynamically by tree stage)
  const clusterGeo = track(new THREE.DodecahedronGeometry(1.0, 1));
  const activeTipsCount = Math.max(
    4,
    Math.round(branchTips.length * cfg.foliageDensity)
  );
  const subClustersPerTip = stage === 'fallen' ? 1 : lowPerfMode ? 2 : 3;
  const totalInstances = activeTipsCount * subClustersPerTip;

  const foliageInst = new THREE.InstancedMesh(clusterGeo, leafMat, totalInstances);
  foliageInst.castShadow = !lowPerfMode;
  foliageInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let instIdx = 0;
  for (let t = 0; t < activeTipsCount; t++) {
    const tip = branchTips[t];
    for (let c = 0; c < subClustersPerTip; c++) {
      const ang = t * 1.9 + c * 2.1;
      const spread = c === 0 ? 0 : 1.05;
      dummy.position.set(
        tip.x + Math.cos(ang) * spread,
        tip.y + (c === 0 ? 0.35 : 0.05),
        tip.z + Math.sin(ang) * spread
      );
      const s = (1.35 + ((t + c) % 3) * 0.32) * cfg.canopyScale;
      dummy.scale.set(s * 1.18, s * 0.72, s * 1.18);
      dummy.rotation.set(0.1 * c, ang, 0.08 * t);
      dummy.updateMatrix();
      foliageInst.setMatrixAt(instIdx++, dummy.matrix);
    }
  }
  foliageInst.instanceMatrix.needsUpdate = true;
  treeGroup.add(foliageInst);

  // 5. Sanctuary Magical Light + Floating Golden Motes
  const treeLight = new THREE.PointLight(cfg.lightColor, cfg.lightIntensity, 34, 1.35);
  treeLight.position.set(0, 4.4, 0);
  root.add(treeLight);

  const canopyLight = new THREE.PointLight(cfg.lightColor, cfg.lightIntensity * 0.75, 42, 1.4);
  canopyLight.position.set(0, 10.5, 0);
  root.add(canopyLight);

  const moteCount = Math.round((lowPerfMode ? 36 : 96) * cfg.particleScale);
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const ang = i * 2.399;
    const rad = 1.4 + ((i * 37) % 100) / 100 * 5.8;
    motePositions[i * 3] = Math.cos(ang) * rad;
    motePositions[i * 3 + 1] = 0.6 + ((i * 53) % 100) / 100 * 11.5;
    motePositions[i * 3 + 2] = Math.sin(ang) * rad;
  }
  const moteGeom = track(new THREE.BufferGeometry());
  moteGeom.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = track(
    new THREE.PointsMaterial({
      color: stage === 'eternal' ? 0xfff0aa : 0xf5c864,
      size: 0.16 * Math.max(0.8, cfg.particleScale * 0.8),
      transparent: true,
      opacity: stage === 'fallen' ? 0.38 : 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const motes = new THREE.Points(moteGeom, moteMat);
  root.add(motes);

  // Eternal stage celestial crown ring
  let eternalHalo: THREE.Mesh | undefined;
  if (stage === 'eternal' || stage === 'radiant') {
    eternalHalo = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, stage === 'eternal' ? 0.11 : 0.06, 8, 64),
      runeMat
    );
    eternalHalo.rotation.x = Math.PI / 2;
    eternalHalo.position.y = 9.5;
    root.add(eternalHalo);
  }

  const update = (elapsed: number) => {
    const pulse = 0.9 + Math.sin(elapsed * 1.8) * 0.12;
    treeLight.intensity = cfg.lightIntensity * pulse;
    treeGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.012;

    if (eternalHalo) {
      eternalHalo.rotation.z = elapsed * 0.25;
      eternalHalo.position.y = 9.5 + Math.sin(elapsed * 1.4) * 0.25;
    }

    const posAttr = moteGeom.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < moteCount; i++) {
      let y = posAttr.getY(i) + 0.014 * cfg.particleScale;
      if (y > 13.5) y = 0.65;
      const swirl = elapsed * 0.22 + i * 0.15;
      posAttr.setY(i, y);
      posAttr.setX(i, posAttr.getX(i) + Math.cos(swirl) * 0.005);
      posAttr.setZ(i, posAttr.getZ(i) + Math.sin(swirl) * 0.005);
    }
    posAttr.needsUpdate = true;
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
