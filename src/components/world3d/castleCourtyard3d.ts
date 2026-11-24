import * as THREE from 'three';
import { createCastleStoneTextures, createClothWeaveTexture } from './heroTextures';

export interface CastleCourtyardOptions {
  /** 0.0 (ruined courtyard) to 1.0 (restored fortress) */
  restorationRatio: number;
  lowPerfMode?: boolean;
}

export interface CastleCourtyardInstance {
  root: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

export function buildCastleCourtyard3d(
  options: CastleCourtyardOptions
): CastleCourtyardInstance {
  const restoration = Math.max(0, Math.min(1, options.restorationRatio));
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.name = 'aetheria_castle_courtyard';

  const flagstoneTex = track(createCastleStoneTextures(6, 6));
  const wallStoneTex = track(createCastleStoneTextures(3, 2));
  const bannerTex = track(createClothWeaveTexture('#0A1930', '#061225', '#00D9FF'));

  const floorMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x24344d,
      map: flagstoneTex.colorMap,
      bumpMap: flagstoneTex.bumpMap,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.08,
    })
  );

  const stoneWallMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x344966,
      map: wallStoneTex.colorMap,
      bumpMap: wallStoneTex.bumpMap,
      bumpScale: 0.04,
      roughness: 0.85,
      metalness: 0.1,
    })
  );

  const darkSlateMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x102440,
      roughness: 0.78,
      metalness: 0.18,
    })
  );

  const antiqueGoldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1677ff,
      emissive: 0x0066cc,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.25,
      envMapIntensity: 1.25,
    })
  );

  const ironMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x16243b,
      metalness: 0.85,
      roughness: 0.42,
    })
  );

  const bannerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bannerTex.colorMap,
      roughness: 0.82,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })
  );

  // 1. Ground Courtyard Terrain & Stone Plaza
  const outerGround = new THREE.Mesh(
    new THREE.CircleGeometry(36, 36),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x061225,
        roughness: 0.96,
        metalness: 0.04,
      })
    )
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.06;
  outerGround.receiveShadow = true;
  root.add(outerGround);

  const courtyardSlab = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.9, 0.14, 32), floorMat);
  courtyardSlab.position.y = -0.07;
  courtyardSlab.receiveShadow = true;
  root.add(courtyardSlab);

  // Central carved medallion ring under the hero's feet (top surface flush at y = 0)
  const centerTrimRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.52, 0.045, 8, 42),
    antiqueGoldMat
  );
  centerTrimRing.rotation.x = Math.PI / 2;
  centerTrimRing.position.y = 0.005;
  root.add(centerTrimRing);

  const outerMedallion = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.03, 6, 48),
    darkSlateMat
  );
  outerMedallion.rotation.x = Math.PI / 2;
  outerMedallion.position.y = 0.004;
  root.add(outerMedallion);

  // Stone causeway running forward from the keep gate
  const pathway = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 10.5), floorMat);
  pathway.position.set(0, -0.01, -0.8);
  pathway.receiveShadow = true;
  root.add(pathway);

  // 2. Foreground Low Parapet Stones (left & right corners framing foreground depth)
  [-3.8, 3.8].forEach(xPos => {
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.58, 0.62), stoneWallMat);
    parapet.position.set(xPos, 0.28, 4.9);
    parapet.castShadow = true;
    parapet.receiveShadow = true;
    root.add(parapet);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.78), stoneWallMat);
    post.position.set(xPos + (xPos < 0 ? 1.35 : -1.35), 0.46, 4.9);
    post.castShadow = true;
    post.receiveShadow = true;
    root.add(post);

    const postCap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.86), darkSlateMat);
    postCap.position.set(post.position.x, 0.98, 4.9);
    root.add(postCap);
  });

  // 3. Midground Ruined / Restored Castle Courtyard Walls, Towers & Gothic Gatehouse
  const wallZ = -4.9;
  const keepHeight = 3.4 + restoration * 1.4;

  // Flanking curtain walls
  [-4.4, 4.4].forEach(xPos => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.8, keepHeight, 0.95), stoneWallMat);
    wall.position.set(xPos, keepHeight / 2 - 0.05, wallZ);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);

    // Merlons (crenellations along the top)
    for (let m = -1; m <= 1; m++) {
      // Leave one outer merlon missing if ruined (restoration < 0.45)
      if (restoration < 0.45 && xPos > 0 && m === 1) continue;
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.56, 1.02), stoneWallMat);
      merlon.position.set(xPos + m * 1.45, keepHeight + 0.22, wallZ);
      merlon.castShadow = true;
      root.add(merlon);
    }
  });

  // Central Gatehouse Arch Pillars & Lintel
  [-1.65, 1.65].forEach(xPillar => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.15, keepHeight + 1.1, 1.4), stoneWallMat);
    pillar.position.set(xPillar, (keepHeight + 1.1) / 2 - 0.05, wallZ);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    root.add(pillar);
  });

  const gateArchTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.35, 1.35), stoneWallMat);
  gateArchTop.position.set(0, keepHeight + 0.48, wallZ);
  gateArchTop.castShadow = true;
  root.add(gateArchTop);

  // Subtle recessed dark portal inside gatehouse
  const portalVoid = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, keepHeight - 0.2),
    track(new THREE.MeshBasicMaterial({ color: 0x040b17 }))
  );
  portalVoid.position.set(0, (keepHeight - 0.2) / 2, wallZ - 0.35);
  root.add(portalVoid);

  // Crest Shield above central gate
  const gateCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), antiqueGoldMat);
  gateCrest.scale.set(0.95, 1.25, 0.3);
  gateCrest.position.set(0, keepHeight + 0.55, wallZ + 0.72);
  root.add(gateCrest);

  // Corner Medieval Watchtowers (tall left & right silhouettes + distant High Keep spire)
  const buildTower = (x: number, z: number, height: number, radius: number, hasRoof: boolean) => {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.94, radius * 1.06, height, 14),
      stoneWallMat
    );
    body.position.y = height / 2 - 0.05;
    body.castShadow = true;
    body.receiveShadow = true;
    tower.add(body);

    const crownRing = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.08, radius * 0.96, 0.55, 14),
      darkSlateMat
    );
    crownRing.position.y = height + 0.18;
    tower.add(crownRing);

    if (hasRoof) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.12, radius * 2.1, 14), darkSlateMat);
      spire.position.y = height + 0.45 + radius * 1.02;
      spire.castShadow = true;
      tower.add(spire);
    }

    // Cool electric-blue arrow-slit window glow
    const windowGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.55, 0.12),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x60a5fa,
          emissive: 0x1677ff,
          emissiveIntensity: 1.5,
        })
      )
    );
    windowGlow.position.set(0, height * 0.62, radius * 0.95);
    tower.add(windowGlow);

    root.add(tower);
  };

  buildTower(-6.9, -4.6, 6.2 + restoration * 1.6, 1.35, restoration > 0.35);
  buildTower(6.9, -4.6, 5.6 + restoration * 1.9, 1.35, restoration > 0.55);
  // Distant High Citadel Keep rising behind the gatehouse
  buildTower(0, -11.5, 10.5 + restoration * 2.2, 2.35, true);
  buildTower(-3.4, -10.8, 7.8 + restoration * 1.5, 1.45, true);
  buildTower(3.4, -10.8, 7.6 + restoration * 1.5, 1.45, restoration > 0.25);

  // Side Courtyard Cloister Ruins / Arches
  [-6.8, 6.8].forEach(xPos => {
    for (let zIdx = 0; zIdx < 2; zIdx++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.75, 0.75), stoneWallMat);
      col.position.set(xPos, 1.35, -1.6 + zIdx * 2.8);
      col.castShadow = true;
      col.receiveShadow = true;
      root.add(col);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.48, 3.8), stoneWallMat);
    lintel.position.set(xPos, 2.85, -0.2);
    lintel.castShadow = true;
    root.add(lintel);
  });

  // Scattered fallen rubble blocks when restoration < 0.75
  if (restoration < 0.75) {
    const rubblePositions: Array<[number, number, number, number]> = [
      [-4.6, 0.22, -2.8, 0.5],
      [-5.1, 0.16, -2.3, -0.4],
      [4.5, 0.24, -2.5, 0.9],
      [3.9, 0.18, 2.8, 0.2],
    ];
    rubblePositions.forEach(([rx, ry, rz, rot], i) => {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.55 + (i % 2) * 0.2, 0.36, 0.44),
        stoneWallMat
      );
      block.position.set(rx, ry, rz);
      block.rotation.set(0.08 * i, rot, 0.05);
      block.castShadow = true;
      block.receiveShadow = true;
      root.add(block);
    });
  }

  // 4. Gently Swaying Medieval Courtyard Banners
  const banners: THREE.Mesh[] = [];
  [-2.25, 2.25].forEach(xPos => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 3.1, 8), ironMat);
    pole.position.set(xPos, 1.55, -3.55);
    root.add(pole);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.84, 8), antiqueGoldMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(xPos, 2.95, -3.55);
    root.add(crossbar);

    const bannerGeom = new THREE.PlaneGeometry(0.72, 1.95, 4, 8);
    bannerGeom.translate(0, -0.975, 0);
    const banner = new THREE.Mesh(bannerGeom, bannerMat);
    banner.position.set(xPos, 2.95, -3.52);
    banner.castShadow = true;
    root.add(banner);
    banners.push(banner);
  });

  // 5. Courtyard Wrought-Iron Braziers with Flickering Warm Fire Light
  const flameCores: THREE.Mesh[] = [];
  const brazierLights: THREE.PointLight[] = [];

  const flameMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x00d9ff,
      emissive: 0x1677ff,
      emissiveIntensity: 2.4,
      roughness: 0.25,
    })
  );

  [
    [-2.5, -1.65],
    [2.5, -1.65],
  ].forEach(([bx, bz], idx) => {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.92, 8), ironMat);
    stand.position.set(bx, 0.46, bz);
    stand.castShadow = true;
    root.add(stand);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.20, 0.28, 10), ironMat);
    bowl.position.set(bx, 0.96, bz);
    bowl.castShadow = true;
    root.add(bowl);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 7), flameMat);
    flame.position.set(bx, 1.24, bz);
    root.add(flame);
    flameCores.push(flame);

    if (!options.lowPerfMode || idx === 0) {
      const fireLight = new THREE.PointLight(0x00d9ff, 4.4, 11, 1.55);
      fireLight.position.set(bx, 1.48, bz);
      root.add(fireLight);
      brazierLights.push(fireLight);
    }
  });

  // 6. Distant Mountain Silhouette Ridge Framing the Horizon
  const mountainMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0a1930,
      roughness: 0.95,
      metalness: 0.04,
    })
  );
  const peakCount = 14;
  for (let i = 0; i < peakCount; i++) {
    const angle = (i / peakCount) * Math.PI * 2;
    const dist = 24 + (i % 3) * 3.5;
    const h = 6.5 + ((i * 37) % 7);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(5.5 + (i % 2) * 2.2, h, 5), mountainMat);
    peak.position.set(Math.cos(angle) * dist, h / 2 - 0.6, Math.sin(angle) * dist);
    peak.rotation.y = i * 0.7;
    root.add(peak);
  }

  // 7. Architectural depth: buttresses, gold inlay, planted stone urns and grass.
  // These details are deliberately low-poly and share materials to stay performant.
  [-4.4, 4.4].forEach((xPos) => {
    for (let z = -5.0; z <= -1.0; z += 2.0) {
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, keepHeight * 0.78, 1.12),
        darkSlateMat
      );
      buttress.position.set(xPos + (xPos < 0 ? 2.35 : -2.35), keepHeight * 0.39, z);
      buttress.castShadow = true;
      buttress.receiveShadow = true;
      root.add(buttress);
    }
  });

  // Fine concentric floor inlays catch the electric-blue & cyan light around the hero.
  const inlayMat = track(new THREE.MeshStandardMaterial({
    color: 0x00d9ff, emissive: 0x1677ff, emissiveIntensity: 0.55, metalness: 0.8, roughness: 0.28,
    transparent: true, opacity: 0.72
  }));
  [1.82, 2.08, 3.05].forEach((radius, idx) => {
    const inlay = new THREE.Mesh(
      new THREE.TorusGeometry(radius, idx === 1 ? 0.018 : 0.012, 5, 64),
      inlayMat
    );
    inlay.rotation.x = Math.PI / 2;
    inlay.position.y = 0.012 + idx * 0.001;
    root.add(inlay);
  });

  // Stone planters with stylized evergreen shrubs frame the gate.
  [-5.7, 5.7].forEach((xPos) => {
    const planter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.42, 0.48, 10),
      stoneWallMat
    );
    planter.position.set(xPos, 0.24, -1.7);
    planter.castShadow = true;
    planter.receiveShadow = true;
    root.add(planter);

    const shrubMat = track(new THREE.MeshStandardMaterial({
      color: 0x23402f, roughness: 0.92, metalness: 0.02
    }));
    const shrub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 1),
      shrubMat
    );
    shrub.position.set(xPos, 0.92, -1.7);
    shrub.scale.set(0.82, 1.2, 0.82);
    shrub.castShadow = true;
    root.add(shrub);
  });

  // Short grass tufts soften the edge of the stone plaza.
  const grassMat = track(new THREE.MeshStandardMaterial({
    color: 0x40553a, roughness: 1, side: THREE.DoubleSide
  }));
  const grassPositions: Array<[number, number]> = [
    [-7.2, 1.8], [-7.8, 2.7], [-7.0, 3.4], [7.1, 1.7], [7.7, 2.8], [7.0, 3.5],
    [-5.8, 5.8], [-4.8, 6.2], [5.0, 6.0], [6.0, 5.6]
  ];
  grassPositions.forEach(([gx, gz], i) => {
    const tuft = new THREE.Group();
    for (let blade = 0; blade < 3; blade++) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.42 + (blade % 2) * 0.12, 4),
        grassMat
      );
      mesh.position.set((blade - 1) * 0.07, 0.19, 0);
      mesh.rotation.z = (blade - 1) * 0.24;
      tuft.add(mesh);
    }
    tuft.position.set(gx, 0.02, gz);
    tuft.rotation.y = i * 0.8;
    root.add(tuft);
  });

  // 8. Ambient Golden Dust Motes & Rising Brazier Embers
  const moteCount = options.lowPerfMode ? 45 : 95;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = ((i * 73) % 100) / 100 * 13 - 6.5;
    motePositions[i * 3 + 1] = 0.25 + ((i * 37) % 100) / 100 * 4.5;
    motePositions[i * 3 + 2] = ((i * 53) % 100) / 100 * 11 - 6.0;
  }
  const moteGeom = track(new THREE.BufferGeometry());
  moteGeom.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = track(
    new THREE.PointsMaterial({
      color: 0x00d9ff,
      size: 0.055,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const motes = new THREE.Points(moteGeom, moteMat);
  root.add(motes);

  // Subtle animation loop (flicker, banner ripple, drifting embers)
  const update = (elapsed: number) => {
    flameCores.forEach((flame, idx) => {
      const s = 1 + Math.sin(elapsed * 9.5 + idx * 2.1) * 0.14;
      flame.scale.set(0.95 + Math.cos(elapsed * 7 + idx) * 0.08, s, 0.95);
    });

    brazierLights.forEach((light, idx) => {
      light.intensity = 4.6 + Math.sin(elapsed * 8.4 + idx * 1.7) * 0.85 + Math.cos(elapsed * 13) * 0.25;
    });

    banners.forEach((b, idx) => {
      b.rotation.x = 0.05 + Math.sin(elapsed * 2.1 + idx) * 0.06;
      b.rotation.z = Math.cos(elapsed * 1.4 + idx) * 0.025;
    });

    const mAttr = moteGeom.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < moteCount; i++) {
      let y = mAttr.getY(i) + 0.0045;
      if (y > 4.8) y = 0.2;
      mAttr.setY(i, y);
      mAttr.setX(i, mAttr.getX(i) + Math.sin(elapsed * 0.8 + i) * 0.0014);
    }
    mAttr.needsUpdate = true;
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
    root.traverse(obj => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
  };

  return { root, update, dispose };
}
