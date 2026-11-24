import * as THREE from 'three';
import {
  getPathProximityFactor,
  getRiverCenterZ,
  getTerrainHeight,
  WATER_LEVEL,
  WorldCollisionRegistry,
} from './terrainMath';
import { createMeadowGroundTextures, createWaterRippleTexture } from './worldTextures';

export interface HeartlandsEnvironmentInstance {
  root: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

function deterministicHash(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function buildHeartlandsEnvironment3d(
  colliders: WorldCollisionRegistry,
  lowPerfMode = false
): HeartlandsEnvironmentInstance {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.name = 'heartlands_environment';

  // 1. Cinematic Sky Dome + Warm Solar Horizon Glow
  const skyGeo = track(new THREE.SphereGeometry(210, 28, 18));
  const skyMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x061225) },
        uMidColor: { value: new THREE.Color(0x0a1930) },
        uHorizonColor: { value: new THREE.Color(0x38bdf8) },
        uSunDir: { value: new THREE.Vector3(0.55, 0.34, -0.76).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        varying vec3 vWorldDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 sky = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.24, h));
          sky = mix(sky, uTopColor, smoothstep(0.22, 0.85, h));
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          sky += vec3(1.0, 0.82, 0.45) * pow(sunDot, 16.0) * 0.45;
          sky += vec3(1.0, 0.94, 0.78) * pow(sunDot, 220.0) * 1.1;
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    })
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  root.add(skyDome);

  // 2. Sculpted Multi-Region Terrain Mesh with Vertex Color Biome Blending
  const terrainSize = 260;
  const segs = lowPerfMode ? 96 : 136;
  const terrainGeo = track(new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);

  const grassColor = new THREE.Color(0x3a6437);
  const sunlitMeadow = new THREE.Color(0x557e3f);
  const pathStone = new THREE.Color(0x7a7165);
  const riverSand = new THREE.Color(0x6e654b);
  const cliffRock = new THREE.Color(0x3f3c48);
  const tempCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getTerrainHeight(x, z);
    posAttr.setY(i, y);

    const pathBlend = getPathProximityFactor(x, z);
    const riverDist = Math.abs(z - getRiverCenterZ(x));
    const meadowNoise = 0.5 + 0.5 * Math.sin(x * 0.09 + z * 0.07);

    tempCol.copy(grassColor).lerp(sunlitMeadow, meadowNoise * 0.65);

    if (riverDist < 7.8) {
      const sandBlend = Math.max(0, 1 - riverDist / 7.8);
      tempCol.lerp(riverSand, sandBlend * 0.72);
    }

    if (y > 5.8) {
      const rockBlend = Math.min(1, (y - 5.8) / 7.0);
      tempCol.lerp(cliffRock, rockBlend * 0.88);
    }

    if (pathBlend > 0.01 && Math.abs(z - getRiverCenterZ(x)) > 4.2) {
      tempCol.lerp(pathStone, pathBlend * 0.85);
    }

    colors[i * 3] = tempCol.r;
    colors[i * 3 + 1] = tempCol.g;
    colors[i * 3 + 2] = tempCol.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const groundTex = track(createMeadowGroundTextures());
  const terrainMat = track(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: groundTex.colorMap,
      bumpMap: groundTex.bumpMap,
      bumpScale: 0.08,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // 3. Flowing Whispering River Surface + Rocky Waterfall Cascade (-35, -43)
  const waterTex = track(createWaterRippleTexture());
  const riverGeo = track(new THREE.PlaneGeometry(240, 26, 60, 10));
  riverGeo.rotateX(-Math.PI / 2);
  const rPos = riverGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rPos.count; i++) {
    const rx = rPos.getX(i);
    const rzOffset = rPos.getZ(i);
    rPos.setZ(i, getRiverCenterZ(rx) + rzOffset);
  }
  riverGeo.computeVertexNormals();

  const riverMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b8c9c,
      map: waterTex,
      roughness: 0.14,
      metalness: 0.52,
      transparent: true,
      opacity: 0.84,
      envMapIntensity: 1.4,
    })
  );
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.position.y = WATER_LEVEL;
  riverMesh.receiveShadow = true;
  root.add(riverMesh);

  // Waterfall Plume on Northern Riverbank Cliff (-35, -43)
  const waterfallMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc2f2ff,
      map: waterTex,
      emissive: 0x4ca6ba,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    })
  );
  const waterfallPlume = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 2.5, 7.6, 12, 6, true, -Math.PI * 0.35, Math.PI * 0.7),
    waterfallMat
  );
  waterfallPlume.position.set(-35, 3.6, -42.5);
  root.add(waterfallPlume);

  // Waterfall Spray Mist Particles
  const mistCount = lowPerfMode ? 18 : 44;
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = -35 + (deterministicHash(i * 11) - 0.5) * 5.2;
    mistPos[i * 3 + 1] = 0.2 + deterministicHash(i * 19) * 2.8;
    mistPos[i * 3 + 2] = -40.5 + (deterministicHash(i * 23) - 0.5) * 4.5;
  }
  const mistGeo = track(new THREE.BufferGeometry());
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = track(
    new THREE.PointsMaterial({
      color: 0xd9f7ff,
      size: 0.45,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  const mistPoints = new THREE.Points(mistGeo, mistMat);
  root.add(mistPoints);

  // 4. Instanced Forest Trees (Multi-Tier Pines & Broadleaf Oaks) + Boulders + Wind Grass
  const pinePositions: Array<{ x: number; y: number; z: number; scale: number; rot: number }> = [];
  const oakPositions: Array<{ x: number; y: number; z: number; scale: number; rot: number }> = [];
  const rockPositions: Array<{ x: number; y: number; z: number; scale: number; rot: number }> = [];
  const grassPositions: Array<{ x: number; y: number; z: number; scale: number; rot: number }> = [];

  const isClearOfStructures = (x: number, z: number): boolean => {
    if (Math.hypot(x, z) < 14) return false; // Golden Sanctuary
    if (Math.hypot(x, z + 72) < 18) return false; // Castle
    if (Math.hypot(x + 50, z + 12) < 16) return false; // Village
    if (Math.hypot(x - 52, z + 14) < 12) return false; // Shrine
    if (getPathProximityFactor(x, z) > 0.08) return false; // Roads
    if (Math.abs(z - getRiverCenterZ(x)) < 7.8) return false; // Riverbank
    if (Math.abs(x) < 5 && z < -20 && z > -52) return false; // Bridge approaches
    return true;
  };

  const totalTreeCandidates = lowPerfMode ? 120 : 210;
  for (let i = 0; i < totalTreeCandidates; i++) {
    const angle = deterministicHash(i * 3.1 + 1) * Math.PI * 2;
    const dist = 16 + deterministicHash(i * 7.3 + 2) * 76;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (!isClearOfStructures(x, z)) continue;

    const y = getTerrainHeight(x, z);
    if (y < 0.8) continue;

    const scale = 0.85 + deterministicHash(i * 13.7) * 0.72;
    const rot = deterministicHash(i * 5.9) * Math.PI * 2;

    if (i % 3 === 0) {
      oakPositions.push({ x, y, z, scale, rot });
    } else {
      pinePositions.push({ x, y, z, scale, rot });
    }
    colliders.addCircle(x, z, 0.55 * scale);
  }

  // Mossy Boulders
  const rockTarget = lowPerfMode ? 35 : 65;
  for (let i = 0; i < rockTarget; i++) {
    const angle = deterministicHash(i * 17.1 + 9) * Math.PI * 2;
    const dist = 13 + deterministicHash(i * 29.3 + 4) * 78;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.hypot(x, z) < 11 || getPathProximityFactor(x, z) > 0.25) continue;
    if (Math.abs(x) < 4 && z < -21 && z > -50) continue;

    const y = getTerrainHeight(x, z);
    const scale = 0.65 + deterministicHash(i * 19.3) * 1.15;
    rockPositions.push({ x, y, z, scale, rot: angle });
    if (scale > 1.0) {
      colliders.addCircle(x, z, 0.8 * scale);
    }
  }

  // Grass & Wildflower Clusters
  const grassCount = lowPerfMode ? 220 : 480;
  for (let i = 0; i < grassCount; i++) {
    const angle = deterministicHash(i * 41.7) * Math.PI * 2;
    const dist = 8.5 + deterministicHash(i * 59.3) * 75;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.abs(z - getRiverCenterZ(x)) < 5.5 || getPathProximityFactor(x, z) > 0.45) continue;
    const y = getTerrainHeight(x, z);
    if (y < 0.6) continue;
    grassPositions.push({
      x,
      y,
      z,
      scale: 0.75 + deterministicHash(i * 31.1) * 0.65,
      rot: angle,
    });
  }

  const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.92 }));
  const pineLeafMat = track(new THREE.MeshStandardMaterial({ color: 0x1d472c, roughness: 0.86 }));
  const oakLeafMat = track(new THREE.MeshStandardMaterial({ color: 0x2f6332, roughness: 0.84 }));
  const rockMat = track(new THREE.MeshStandardMaterial({ color: 0x4c4a55, roughness: 0.9, metalness: 0.06 }));
  const grassBladeMat = track(
    new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.9, side: THREE.DoubleSide })
  );

  const dummy = new THREE.Object3D();

  // Instanced Pines (Trunk + 3 foliage tiers)
  if (pinePositions.length > 0) {
    const pTrunkGeo = track(new THREE.CylinderGeometry(0.22, 0.36, 3.2, 7));
    const pTrunkInst = new THREE.InstancedMesh(pTrunkGeo, trunkMat, pinePositions.length);
    pTrunkInst.castShadow = !lowPerfMode;
    pTrunkInst.receiveShadow = true;

    const pCone1Geo = track(new THREE.ConeGeometry(1.9, 3.1, 7));
    const pCone2Geo = track(new THREE.ConeGeometry(1.45, 2.7, 7));
    const pCone3Geo = track(new THREE.ConeGeometry(0.95, 2.1, 7));
    const pCone1 = new THREE.InstancedMesh(pCone1Geo, pineLeafMat, pinePositions.length);
    const pCone2 = new THREE.InstancedMesh(pCone2Geo, pineLeafMat, pinePositions.length);
    const pCone3 = new THREE.InstancedMesh(pCone3Geo, pineLeafMat, pinePositions.length);
    pCone1.castShadow = !lowPerfMode;
    pCone2.castShadow = !lowPerfMode;

    pinePositions.forEach((p, idx) => {
      dummy.position.set(p.x, p.y + 1.55 * p.scale, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      pTrunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, p.y + 3.4 * p.scale, p.z);
      dummy.updateMatrix();
      pCone1.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, p.y + 5.0 * p.scale, p.z);
      dummy.updateMatrix();
      pCone2.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, p.y + 6.4 * p.scale, p.z);
      dummy.updateMatrix();
      pCone3.setMatrixAt(idx, dummy.matrix);
    });

    pTrunkInst.instanceMatrix.needsUpdate = true;
    pCone1.instanceMatrix.needsUpdate = true;
    pCone2.instanceMatrix.needsUpdate = true;
    pCone3.instanceMatrix.needsUpdate = true;
    root.add(pTrunkInst, pCone1, pCone2, pCone3);
  }

  // Instanced Oaks (Trunk + Organic Clustered Crown)
  if (oakPositions.length > 0) {
    const oTrunkGeo = track(new THREE.CylinderGeometry(0.28, 0.44, 2.8, 8));
    const oCrownGeo = track(new THREE.DodecahedronGeometry(1.85, 1));
    const oTrunkInst = new THREE.InstancedMesh(oTrunkGeo, trunkMat, oakPositions.length);
    const oCrownInst = new THREE.InstancedMesh(oCrownGeo, oakLeafMat, oakPositions.length);
    oTrunkInst.castShadow = !lowPerfMode;
    oCrownInst.castShadow = !lowPerfMode;

    oakPositions.forEach((o, idx) => {
      dummy.position.set(o.x, o.y + 1.35 * o.scale, o.z);
      dummy.rotation.set(0, o.rot, 0);
      dummy.scale.setScalar(o.scale);
      dummy.updateMatrix();
      oTrunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(o.x, o.y + 3.55 * o.scale, o.z);
      dummy.scale.set(o.scale * 1.15, o.scale * 0.85, o.scale * 1.15);
      dummy.updateMatrix();
      oCrownInst.setMatrixAt(idx, dummy.matrix);
    });

    oTrunkInst.instanceMatrix.needsUpdate = true;
    oCrownInst.instanceMatrix.needsUpdate = true;
    root.add(oTrunkInst, oCrownInst);
  }

  // Instanced Rocks
  if (rockPositions.length > 0) {
    const rockGeo = track(new THREE.DodecahedronGeometry(0.95, 0));
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockPositions.length);
    rockInst.castShadow = !lowPerfMode;
    rockInst.receiveShadow = true;

    rockPositions.forEach((r, idx) => {
      dummy.position.set(r.x, r.y + 0.35 * r.scale, r.z);
      dummy.rotation.set(r.rot * 0.4, r.rot, r.rot * 0.2);
      dummy.scale.set(r.scale * 1.2, r.scale * 0.72, r.scale);
      dummy.updateMatrix();
      rockInst.setMatrixAt(idx, dummy.matrix);
    });
    rockInst.instanceMatrix.needsUpdate = true;
    root.add(rockInst);
  }

  // Instanced Grass Tufts
  let grassInst: THREE.InstancedMesh | null = null;
  if (grassPositions.length > 0) {
    const gGeo = track(new THREE.ConeGeometry(0.14, 0.58, 4));
    gGeo.translate(0, 0.29, 0);
    grassInst = new THREE.InstancedMesh(gGeo, grassBladeMat, grassPositions.length);
    grassPositions.forEach((g, idx) => {
      dummy.position.set(g.x, g.y - 0.03, g.z);
      dummy.rotation.set(0, g.rot, 0);
      dummy.scale.set(g.scale, g.scale, g.scale);
      dummy.updateMatrix();
      grassInst!.setMatrixAt(idx, dummy.matrix);
    });
    grassInst.instanceMatrix.needsUpdate = true;
    root.add(grassInst);
  }

  // 5. Drifting Soft Sky Clouds
  const cloudsGroup = new THREE.Group();
  const cloudMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x0a1930,
      emissiveIntensity: 0.25,
      roughness: 1.0,
      transparent: true,
      opacity: 0.62,
    })
  );
  const cloudClusters: THREE.Group[] = [];
  const cloudCount = lowPerfMode ? 6 : 12;
  for (let c = 0; c < cloudCount; c++) {
    const cg = new THREE.Group();
    const ang = (c / cloudCount) * Math.PI * 2;
    const rad = 65 + (c % 3) * 28;
    cg.position.set(Math.cos(ang) * rad, 34 + (c % 4) * 5.5, Math.sin(ang) * rad);
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(4.5 + p * 1.1, 8, 6), cloudMat);
      puff.position.set((p - 1) * 4.2, p === 1 ? 1.1 : 0, 0);
      puff.scale.set(1.6, 0.45, 1.1);
      cg.add(puff);
    }
    cloudsGroup.add(cg);
    cloudClusters.push(cg);
  }
  root.add(cloudsGroup);

  // 6. Ambient World Golden Pollen / Fireflies
  const ambientCount = lowPerfMode ? 45 : 110;
  const ambientPos = new Float32Array(ambientCount * 3);
  for (let i = 0; i < ambientCount; i++) {
    const x = (deterministicHash(i * 19.1) - 0.5) * 140;
    const z = (deterministicHash(i * 23.7) - 0.5) * 140;
    const y = getTerrainHeight(x, z) + 0.6 + deterministicHash(i * 7.7) * 5.5;
    ambientPos[i * 3] = x;
    ambientPos[i * 3 + 1] = y;
    ambientPos[i * 3 + 2] = z;
  }
  const ambientGeo = track(new THREE.BufferGeometry());
  ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
  const ambientMat = track(
    new THREE.PointsMaterial({
      color: 0xf4cf76,
      size: 0.2,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
  root.add(ambientPoints);

  const update = (dt: number, elapsed: number) => {
    waterTex.offset.x = (elapsed * 0.08) % 1;
    waterTex.offset.y = (elapsed * 0.03) % 1;

    // Gentle cloud drift
    cloudClusters.forEach((cg, idx) => {
      cg.position.x += dt * (0.45 + (idx % 3) * 0.12);
      if (cg.position.x > 135) cg.position.x = -135;
    });

    // Subtle wind sway on grass instanced batch
    if (grassInst && !lowPerfMode) {
      grassInst.rotation.z = Math.sin(elapsed * 1.45) * 0.004;
    }

    // Waterfall mist cycle
    const mAttr = mistGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < mistCount; i++) {
      let y = mAttr.getY(i) + dt * 1.1;
      if (y > 3.2) y = 0.2;
      mAttr.setY(i, y);
    }
    mAttr.needsUpdate = true;

    // Ambient sunlit pollen drift
    const aAttr = ambientGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < ambientCount; i++) {
      aAttr.setY(i, aAttr.getY(i) + Math.sin(elapsed * 0.9 + i) * 0.002);
    }
    aAttr.needsUpdate = true;
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
