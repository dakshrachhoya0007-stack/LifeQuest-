import * as THREE from 'three';
import { PlayableHeroId } from '../../types/game';
import {
  createArcaneClothTexture,
  createClothWeaveTexture,
  createLeatherTexture,
  createScarredSteelTextures,
} from './heroTextures';

export interface Hero3DRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  chest: THREE.Group;
  headGroup: THREE.Group;
  shoulderL: THREE.Group;
  forearmL: THREE.Group;
  shoulderR: THREE.Group;
  forearmR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  capePivot?: THREE.Group;
  auraGroup?: THREE.Group;
  orbMesh?: THREE.Object3D;
  orbRing?: THREE.Object3D;
  heroLight?: THREE.PointLight;
}

export interface HeroLocomotionState {
  /** Normalized horizontal movement speed 0 (idle) to 1 (walk/sprint) */
  speedRatio: number;
  isSprinting: boolean;
  isGrounded: boolean;
  verticalVelocity: number;
}

export interface Hero3DInstance {
  heroId: PlayableHeroId;
  root: THREE.Group;
  rig: Hero3DRig;
  isExternalGlb?: boolean;
  update: (
    dt: number,
    elapsed: number,
    introElapsed: number,
    locomotion?: HeroLocomotionState
  ) => void;
  dispose: () => void;
}

interface PaletteConfig {
  skinTone: number;
  eyeGlow: number;
  gold: number;
  steel: number;
  capeColor: string;
}

const DEFAULT_PALETTE: PaletteConfig = {
  skinTone: 0xd4ad92,
  eyeGlow: 0xffe4a0,
  gold: 0xc5a15a,
  steel: 0x778091,
  capeColor: '#5c1927',
};

function createCapeGeometry(tattered: boolean): THREE.BufferGeometry {
  const wSeg = 8;
  const hSeg = 12;
  const geom = new THREE.PlaneGeometry(0.95, 1.38, wSeg, hSeg);
  geom.translate(0, -0.69, 0);
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.abs(y) / 1.38; // 0 shoulder -> 1 bottom hem
    // Flare wider toward hem
    const flare = 0.62 + t * 0.66;
    pos.setX(i, x * flare);
    // Drape gracefully outward & gentle wave folds
    const zWave = -0.04 - t * 0.22 + Math.sin(x * 7.5) * (0.02 + t * 0.035);
    pos.setZ(i, zWave);

    // Tattered notched lower border for Fallen Knight
    if (tattered && t > 0.84) {
      const notch = Math.sin(x * 16 + 1.1) * 0.09 * ((t - 0.84) / 0.16);
      pos.setY(i, y - Math.abs(notch));
    }
  }
  geom.computeVertexNormals();
  return geom;
}

export function buildHero3DModel(heroId: PlayableHeroId): Hero3DInstance {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Shared procedural textures
  const steelTex = track(
    createScarredSteelTextures(
      heroId === 'paladin' ? '#c8ced9' : heroId === 'shadowblade' ? '#2c2f3a' : '#717889',
      heroId === 'paladin' ? '#7a8090' : '#1b1d25'
    )
  );
  const capeTex = track(
    createClothWeaveTexture(
      heroId === 'fallen_knight'
        ? '#5b1b28'
        : heroId === 'ranger'
        ? '#20422d'
        : heroId === 'paladin'
        ? '#f0ece1'
        : '#0A1930',
      '#061225',
      '#00D9FF'
    )
  );
  const leatherTex = track(
    createLeatherTexture(
      heroId === 'ranger' ? '#3a2a1d' : '#102440',
      '#061225'
    )
  );
  const arcaneTex = track(createArcaneClothTexture('#0A1930', '#1677FF'));

  // Materials
  const steelMat = track(
    new THREE.MeshStandardMaterial({
      color: heroId === 'paladin' ? 0xd9dee8 : heroId === 'shadowblade' ? 0x24344d : 0x8991a2,
      map: steelTex.colorMap,
      roughnessMap: steelTex.roughnessMap,
      bumpMap: steelTex.bumpMap,
      bumpScale: 0.015,
      metalness: heroId === 'paladin' ? 0.92 : 0.82,
      roughness: heroId === 'paladin' ? 0.24 : 0.42,
      envMapIntensity: 1.25,
    })
  );

  const darkIronMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x16243b,
      roughnessMap: steelTex.roughnessMap,
      metalness: 0.78,
      roughness: 0.48,
      envMapIntensity: 1.0,
    })
  );

  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: DEFAULT_PALETTE.gold,
      metalness: 0.92,
      roughness: 0.22,
      envMapIntensity: 1.4,
    })
  );

  const leatherMat = track(
    new THREE.MeshStandardMaterial({
      color: heroId === 'ranger' ? 0x4b3826 : 0x102440,
      map: leatherTex.colorMap,
      metalness: 0.14,
      roughness: 0.76,
    })
  );

  const forestClothMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x234730,
      map: capeTex.colorMap,
      metalness: 0.05,
      roughness: 0.86,
      side: THREE.DoubleSide,
    })
  );

  const capeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: capeTex.colorMap,
      metalness: 0.05,
      roughness: 0.88,
      side: THREE.DoubleSide,
    })
  );

  const robeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: arcaneTex.colorMap,
      metalness: 0.12,
      roughness: 0.74,
      side: THREE.DoubleSide,
    })
  );

  const skinMat = track(
    new THREE.MeshStandardMaterial({
      color: heroId === 'arcane_mage' ? 0xd8bca6 : 0xcfa589,
      metalness: 0.04,
      roughness: 0.65,
    })
  );

  const hairMat = track(
    new THREE.MeshStandardMaterial({
      color: heroId === 'arcane_mage' ? 0xe6e4ea : heroId === 'ranger' ? 0x4a3121 : 0x211b20,
      metalness: 0.05,
      roughness: 0.78,
    })
  );

  const eyeColor =
    heroId === 'arcane_mage'
      ? 0x00d9ff
      : heroId === 'shadowblade'
      ? 0x38bdf8
      : heroId === 'ranger'
      ? 0x86e09f
      : heroId === 'paladin'
      ? 0xffe48f
      : 0xffb368;

  const eyeGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: eyeColor,
      emissive: eyeColor,
      emissiveIntensity: 1.9,
      roughness: 0.2,
    })
  );

  const root = new THREE.Group();
  root.name = `hero_${heroId}`;

  // Soft grounded contact shadow disc at y = 0.01
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 24),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x040b17,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    )
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.012;
  root.add(shadowDisc);

  const hips = new THREE.Group();
  hips.position.y = 0.96; // Exact hip height so boots meet y = 0 cleanly
  root.add(hips);

  // Body material selector per archetype
  const torsoMainMat =
    heroId === 'arcane_mage'
      ? robeMat
      : heroId === 'ranger'
      ? forestClothMat
      : heroId === 'shadowblade'
      ? leatherMat
      : steelMat;

  const limbArmorMat =
    heroId === 'fallen_knight' || heroId === 'paladin'
      ? steelMat
      : heroId === 'arcane_mage'
      ? robeMat
      : leatherMat;

  // --- LEGS (Left & Right, hip pivot at y = 0.96 down to y = 0) ---
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.145, 0, 0);

    const thighRadiusTop = heroId === 'shadowblade' ? 0.105 : 0.118;
    const thighRadiusBot = heroId === 'shadowblade' ? 0.088 : 0.098;

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(thighRadiusTop, thighRadiusBot, 0.44, 12),
      limbArmorMat
    );
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    legPivot.add(thigh);

    // Knee cop (knights / paladin / shadowblade)
    if (heroId !== 'arcane_mage') {
      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.092, 10, 10),
        heroId === 'paladin' ? goldMat : heroId === 'fallen_knight' ? steelMat : darkIronMat
      );
      knee.position.set(0, -0.45, 0.035);
      knee.scale.set(1, 0.9, 0.85);
      knee.castShadow = true;
      legPivot.add(knee);
    }

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.074, 0.42, 12),
      heroId === 'fallen_knight' || heroId === 'paladin' ? steelMat : leatherMat
    );
    shin.position.y = -0.66;
    shin.castShadow = true;
    legPivot.add(shin);

    // Boot / Sabaton ending cleanly at y = -0.96 (world y = 0)
    const bootUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.145, 0.11, 0.24),
      heroId === 'fallen_knight' || heroId === 'paladin' ? darkIronMat : leatherMat
    );
    bootUpper.position.set(0, -0.905, 0.04);
    bootUpper.castShadow = true;
    legPivot.add(bootUpper);

    const bootToe = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.075, 0.09),
      heroId === 'paladin' ? goldMat : darkIronMat
    );
    bootToe.position.set(0, -0.922, 0.16);
    bootToe.castShadow = true;
    legPivot.add(bootToe);

    return legPivot;
  };

  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  hips.add(legL, legR);

  // Pelvis / Belt / Tassets / Mage Skirt
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.215, 0.225, 0.11, 14),
    heroId === 'paladin' ? goldMat : leatherMat
  );
  belt.position.y = 0.03;
  belt.scale.set(1.18, 1, 0.82);
  belt.castShadow = true;
  hips.add(belt);

  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.085, 0.04), goldMat);
  beltBuckle.position.set(0, 0.03, 0.185);
  hips.add(beltBuckle);

  if (heroId === 'arcane_mage') {
    // Flowing LatheGeometry Enchanted Lower Robe Skirt
    const skirtProfile = [
      new THREE.Vector2(0.19, 0.08),
      new THREE.Vector2(0.24, -0.15),
      new THREE.Vector2(0.32, -0.52),
      new THREE.Vector2(0.41, -0.89),
    ];
    const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 18), robeMat);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    hips.add(skirt);
  } else if (heroId === 'fallen_knight' || heroId === 'paladin') {
    // Segmented armored tassets
    [-1, 1].forEach(side => {
      const tasset = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.27, 0.14),
        heroId === 'paladin' ? goldMat : darkIronMat
      );
      tasset.position.set(side * 0.18, -0.13, 0.04);
      tasset.rotation.z = side * -0.14;
      tasset.castShadow = true;
      hips.add(tasset);
    });
  } else if (heroId === 'shadowblade') {
    // Twin angled waist assassin sashes
    [-1, 1].forEach(side => {
      const sash = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.42, 0.025),
        capeMat
      );
      sash.position.set(side * 0.19, -0.19, 0.02);
      sash.rotation.z = side * -0.22;
      hips.add(sash);
    });
  }

  // --- TORSO & CHEST ---
  const torso = new THREE.Group();
  torso.position.y = 0.08;
  hips.add(torso);

  const chest = new THREE.Group();
  torso.add(chest);

  const chestWidthScale =
    heroId === 'fallen_knight' || heroId === 'paladin'
      ? 1.32
      : heroId === 'shadowblade'
      ? 1.06
      : 1.15;

  const ribcage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.195, 0.56, 14),
    torsoMainMat
  );
  ribcage.position.y = 0.29;
  ribcage.scale.set(chestWidthScale, 1, 0.78);
  ribcage.castShadow = true;
  chest.add(ribcage);

  // Chest-specific armor ornamentation
  if (heroId === 'fallen_knight') {
    const gorget = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.042, 8, 16), steelMat);
    gorget.rotation.x = Math.PI / 2;
    gorget.position.y = 0.55;
    chest.add(gorget);

    const chestCrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.04), goldMat);
    chestCrest.position.set(0, 0.34, 0.19);
    chest.add(chestCrest);
  } else if (heroId === 'paladin') {
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.08), steelMat);
    chestPlate.position.set(0, 0.35, 0.155);
    chest.add(chestPlate);

    const sunEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), goldMat);
    sunEmblem.scale.set(1, 1.35, 0.45);
    sunEmblem.position.set(0, 0.37, 0.205);
    chest.add(sunEmblem);
  } else if (heroId === 'shadowblade') {
    // Diagonal bandolier chest harness
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.065, 0.29), darkIronMat);
    strap.position.set(0, 0.32, 0.01);
    strap.rotation.z = 0.58;
    chest.add(strap);
  } else if (heroId === 'arcane_mage') {
    // High rune collar / mantle
    const mantle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.34, 0.18, 16, 1, true),
      capeMat
    );
    mantle.position.y = 0.49;
    chest.add(mantle);

    const chestPendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), eyeGlowMat);
    chestPendant.position.set(0, 0.38, 0.19);
    chest.add(chestPendant);
  } else if (heroId === 'ranger') {
    // Leather shoulder harness
    const harness = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.06, 0.28), leatherMat);
    harness.position.set(0, 0.33, 0);
    harness.rotation.z = -0.56;
    chest.add(harness);
  }

  // Fallen Knight: layered steel breastplate, segmented faulds and engraved trim.
  // These overlays add a more authored silhouette while keeping the original rig intact.
  if (heroId === 'fallen_knight') {
    const breastShape = new THREE.Shape();
    breastShape.moveTo(-0.205, 0.47);
    breastShape.quadraticCurveTo(0, 0.55, 0.205, 0.47);
    breastShape.lineTo(0.17, 0.19);
    breastShape.quadraticCurveTo(0, 0.12, -0.17, 0.19);
    breastShape.closePath();
    const breastGeom = new THREE.ExtrudeGeometry(breastShape, {
      depth: 0.045, bevelEnabled: true, bevelSegments: 3,
      steps: 1, bevelSize: 0.018, bevelThickness: 0.014,
    });
    breastGeom.computeVertexNormals();
    const breastPlate = new THREE.Mesh(breastGeom, steelMat);
    breastPlate.position.set(0, 0, 0.205);
    breastPlate.castShadow = true;
    chest.add(breastPlate);

    // Fine gold edge piping follows the upper breastplate curve.
    const chestPiping = new THREE.Mesh(
      new THREE.TorusGeometry(0.175, 0.009, 6, 32, Math.PI), goldMat
    );
    chestPiping.position.set(0, 0.455, 0.255);
    chestPiping.rotation.z = Math.PI;
    chest.add(chestPiping);

    // Three overlapping waist lames create a layered plate-skirt silhouette.
    for (let row = 0; row < 3; row++) {
      const lame = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 - row * 0.025, 0.075, 0.055),
        row === 1 ? darkIronMat : steelMat
      );
      lame.position.set(0, -0.035 - row * 0.065, 0.205 - row * 0.008);
      lame.rotation.x = -0.12;
      lame.castShadow = true;
      chest.add(lame);
    }

    // Rivets and engraved vertical gold lines on the breastplate.
    [-1, 1].forEach(side => {
      for (let row = 0; row < 3; row++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), goldMat);
        rivet.position.set(side * (0.145 - row * 0.012), 0.40 - row * 0.085, 0.262);
        chest.add(rivet);
      }
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.22, 0.018), darkIronMat);
      rib.position.set(side * 0.19, 0.29, 0.205);
      rib.rotation.z = side * -0.12;
      chest.add(rib);
    });
  }

  // --- CAPE / CLOAK PIVOT ---
  let capePivot: THREE.Group | undefined;
  if (heroId === 'fallen_knight' || heroId === 'ranger' || heroId === 'paladin' || heroId === 'shadowblade') {
    capePivot = new THREE.Group();
    capePivot.position.set(0, 0.56, -0.14);
    const isTattered = heroId === 'fallen_knight' || heroId === 'ranger';
    const capeMesh = new THREE.Mesh(createCapeGeometry(isTattered), capeMat);
    if (heroId === 'shadowblade') {
      capeMesh.scale.set(0.72, 0.78, 1);
    } else if (heroId === 'ranger') {
      capeMesh.scale.set(0.86, 0.9, 1);
    }
    capeMesh.castShadow = true;
    capePivot.add(capeMesh);
    chest.add(capePivot);
  }

  // --- HEAD GROUP (Unique Face, Hair, Visor/Helm/Hood/Cowl) ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.61, 0);
  torso.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.082, 0.11, 10), skinMat);
  neck.position.y = 0.03;
  headGroup.add(neck);

  // Base sculpted cranium
  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), skinMat);
  headSphere.position.y = 0.175;
  headSphere.scale.set(0.92, 1.08, 0.98);
  headSphere.castShadow = true;
  headGroup.add(headSphere);

  // Expressive Eyes
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), eyeGlowMat);
    eye.position.set(side * 0.046, 0.188, 0.13);
    eye.scale.set(1.3, 0.72, 0.6);
    headGroup.add(eye);
  });

  if (heroId === 'fallen_knight') {
    // Open-faced battle-scarred steel knight helm + crest & flowing rear hair
    const helmShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.66),
      steelMat
    );
    helmShell.position.y = 0.185;
    helmShell.castShadow = true;
    headGroup.add(helmShell);

    const browGuard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.042, 0.14), darkIronMat);
    browGuard.position.set(0, 0.228, 0.105);
    headGroup.add(browGuard);

    const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.11, 0.035), steelMat);
    noseGuard.position.set(0, 0.18, 0.155);
    headGroup.add(noseGuard);

    [-1, 1].forEach(side => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.15, 0.16), steelMat);
      cheek.position.set(side * 0.125, 0.13, 0.02);
      headGroup.add(cheek);
    });

    const helmRidge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.065, 0.28), goldMat);
    helmRidge.position.set(0, 0.34, -0.01);
    headGroup.add(helmRidge);

    // Layered visor brow, narrow eye slit and riveted cheek plates.
    const visorBrow = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.035, 0.045), goldMat);
    visorBrow.position.set(0, 0.205, 0.171);
    headGroup.add(visorBrow);
    const visorShadow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.012), darkIronMat);
    visorShadow.position.set(0, 0.177, 0.169);
    headGroup.add(visorShadow);
    [-1, 1].forEach(side => {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), goldMat);
      rivet.position.set(side * 0.105, 0.225, 0.145);
      headGroup.add(rivet);
      const cheekFlare = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.045), darkIronMat);
      cheekFlare.position.set(side * 0.13, 0.085, 0.105);
      cheekFlare.rotation.z = side * 0.16;
      headGroup.add(cheekFlare);
    });
  } else if (heroId === 'shadowblade') {
    // Sculpted assassin cowl/hood + dark face mask
    const cowl = new THREE.Mesh(
      new THREE.ConeGeometry(0.188, 0.32, 14),
      darkIronMat
    );
    cowl.position.set(0, 0.25, -0.04);
    cowl.rotation.x = -0.32;
    cowl.castShadow = true;
    headGroup.add(cowl);

    const hoodSides = new THREE.Mesh(
      new THREE.SphereGeometry(0.172, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.72),
      leatherMat
    );
    hoodSides.position.set(0, 0.19, -0.015);
    headGroup.add(hoodSides);

    const faceVeil = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.115, 0.11, 12), capeMat);
    faceVeil.position.set(0, 0.115, 0.025);
    headGroup.add(faceVeil);
  } else if (heroId === 'arcane_mage') {
    // Sage silver beard, swept hair, & glowing mystic circlet
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 10), hairMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 0.01, 0.095);
    headGroup.add(beard);

    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.24, 12), hairMat);
    backHair.position.set(0, 0.14, -0.04);
    headGroup.add(backHair);

    const crownHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.152, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
      hairMat
    );
    crownHair.position.y = 0.19;
    headGroup.add(crownHair);

    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 20), goldMat);
    circlet.rotation.x = Math.PI / 2 - 0.12;
    circlet.position.set(0, 0.255, 0.005);
    headGroup.add(circlet);

    const circletGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), eyeGlowMat);
    circletGem.position.set(0, 0.265, 0.152);
    headGroup.add(circletGem);
  } else if (heroId === 'ranger') {
    // Woodland ranger hood + swept brown locks
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
      forestClothMat
    );
    hood.position.set(0, 0.2, -0.02);
    hood.castShadow = true;
    headGroup.add(hood);

    const hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.24, 10), forestClothMat);
    hoodPeak.position.set(0, 0.25, -0.08);
    hoodPeak.rotation.x = -0.52;
    headGroup.add(hoodPeak);

    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.06), hairMat);
    bangs.position.set(0, 0.235, 0.12);
    headGroup.add(bangs);
  } else if (heroId === 'paladin') {
    // Wing-crested silver-gold paladin helm
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
      steelMat
    );
    helm.position.y = 0.19;
    helm.castShadow = true;
    headGroup.add(helm);

    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.02, 8, 20), goldMat);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.y = 0.24;
    headGroup.add(crownBand);

    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.19, 0.10), goldMat);
      wing.position.set(side * 0.185, 0.29, -0.01);
      wing.rotation.z = side * -0.35;
      wing.rotation.x = -0.25;
      headGroup.add(wing);
    });
  }

  // --- ARMS & UNARMED MARTIAL STANCES ---
  const buildArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * (heroId === 'fallen_knight' || heroId === 'paladin' ? 0.35 : 0.29), 0.51, 0);

    // Pauldrons
    const pauldronSize = heroId === 'paladin' || heroId === 'fallen_knight' ? 0.145 : heroId === 'shadowblade' ? 0.095 : 0.115;
    const pauldronMat = heroId === 'paladin' ? goldMat : heroId === 'arcane_mage' ? robeMat : limbArmorMat;
    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(pauldronSize, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      pauldronMat
    );
    pauldron.position.set(side * 0.02, 0.02, 0);
    pauldron.rotation.z = side * -0.3;
    pauldron.castShadow = true;
    shoulderPivot.add(pauldron);

    if (heroId === 'fallen_knight') {
      const pauldronRim = new THREE.Mesh(
        new THREE.TorusGeometry(pauldronSize * 0.91, 0.014, 6, 20, Math.PI * 1.45), goldMat
      );
      pauldronRim.position.set(side * 0.02, 0.015, 0.012);
      pauldronRim.rotation.set(Math.PI / 2.7, 0, side * -0.22);
      shoulderPivot.add(pauldronRim);

      const pauldronRidge = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.13, 0.035), darkIronMat
      );
      pauldronRidge.position.set(side * 0.02, 0.105, 0.075);
      pauldronRidge.rotation.z = side * -0.18;
      shoulderPivot.add(pauldronRidge);

      for (let plate = 0; plate < 2; plate++) {
        const lame = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.055, 0.09), steelMat
        );
        lame.position.set(side * 0.025, -0.075 - plate * 0.055, 0.015);
        lame.rotation.z = side * 0.12;
        lame.castShadow = true;
        shoulderPivot.add(lame);
      }
    }

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.062, 0.30, 10),
      limbArmorMat
    );
    upperArm.position.y = -0.15;
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.30, 0);
    shoulderPivot.add(forearmPivot);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.052, 0.27, 10),
      heroId === 'fallen_knight' || heroId === 'paladin' ? steelMat : leatherMat
    );
    forearm.position.y = -0.135;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    if (heroId === 'fallen_knight' || heroId === 'paladin') {
      const gauntletCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.058, 0.11, 8),
        steelMat
      );
      gauntletCuff.position.y = -0.20;
      gauntletCuff.castShadow = true;
      forearmPivot.add(gauntletCuff);

      const cuffTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.008, 6, 16),
        goldMat
      );
      cuffTrim.rotation.x = Math.PI / 2;
      cuffTrim.position.y = -0.15;
      forearmPivot.add(cuffTrim);
    }

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 10), heroId === 'arcane_mage' ? skinMat : darkIronMat);
    hand.position.y = -0.285;
    forearmPivot.add(hand);

    return { shoulderPivot, forearmPivot };
  };

  const { shoulderPivot: shoulderL, forearmPivot: forearmL } = buildArm(-1);
  const { shoulderPivot: shoulderR, forearmPivot: forearmR } = buildArm(1);
  chest.add(shoulderL, shoulderR);

  // Unarmed Hero Auras & Energy Foci (zero weapons)
  let orbMesh: THREE.Object3D | undefined;
  let orbRing: THREE.Object3D | undefined;
  let auraGroup: THREE.Group | undefined;
  let heroLight: THREE.PointLight | undefined;

  if (heroId === 'arcane_mage') {
    const focusGroup = new THREE.Group();
    focusGroup.position.set(0, -0.34, 0.14);

    const crystalMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x7de4ff,
        emissive: 0x45b8ff,
        emissiveIntensity: 1.9,
        metalness: 0.2,
        roughness: 0.1,
      })
    );
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), crystalMat);
    orbMesh = orb;
    focusGroup.add(orb);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 24), goldMat);
    orbRing = ring;
    focusGroup.add(ring);

    heroLight = new THREE.PointLight(0x5ecfff, 1.35, 4.0, 1.6);
    focusGroup.add(heroLight);

    forearmR.add(focusGroup);
  } else if (heroId === 'paladin') {
    // Golden Sacred Halo Ring behind shoulders
    auraGroup = new THREE.Group();
    auraGroup.position.set(0, 0.62, -0.18);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.012, 8, 36),
      track(
        new THREE.MeshStandardMaterial({
          color: 0xf4cc73,
          emissive: 0xd9a74a,
          emissiveIntensity: 1.35,
          transparent: true,
          opacity: 0.78,
        })
      )
    );
    auraGroup.add(halo);
    heroLight = new THREE.PointLight(0xffd67a, 1.15, 4.0, 1.8);
    auraGroup.add(heroLight);
    chest.add(auraGroup);
  }

  const rig: Hero3DRig = {
    root,
    hips,
    torso,
    chest,
    headGroup,
    shoulderL,
    forearmL,
    shoulderR,
    forearmR,
    legL,
    legR,
    capePivot,
    auraGroup,
    orbMesh,
    orbRing,
    heroLight,
  };

  // --- IDLE, INTRO & WALK/SPRINT/JUMP LOCOMOTION ANIMATION ---
  let stridePhase = 0;
  let moveBlend = 0;
  let airBlend = 0;

  const update = (
    dt: number,
    elapsed: number,
    introElapsed: number,
    locomotion?: HeroLocomotionState
  ) => {
    const breath = Math.sin(elapsed * 2.1);
    const slowSway = Math.sin(elapsed * 1.05);
    const introDur = 1.6;
    const rawT = Math.min(1, Math.max(0, introElapsed / introDur));
    const introPulse = Math.sin(rawT * Math.PI);

    const targetMove = locomotion ? Math.min(1, Math.max(0, locomotion.speedRatio)) : 0;
    const isSprinting = Boolean(locomotion?.isSprinting);
    const isAirborne = locomotion ? !locomotion.isGrounded : false;

    const lerpRate = Math.min(1, dt * 10);
    moveBlend += (targetMove - moveBlend) * lerpRate;
    airBlend += ((isAirborne ? 1 : 0) - airBlend) * Math.min(1, dt * 12);

    const strideFreq = isSprinting ? 11.2 : 7.6;
    stridePhase += dt * strideFreq * (0.2 + moveBlend * 0.95);
    const stride = Math.sin(stridePhase);
    const stepBounce = Math.abs(Math.sin(stridePhase)) * 0.055 * moveBlend * (1 - airBlend);
    const legAmplitude = (isSprinting ? 0.68 : 0.46) * moveBlend * (1 - airBlend * 0.65);

    // Base idle + blended walk/sprint posture
    hips.position.y =
      0.96 +
      breath * 0.008 * (1 - moveBlend) +
      stepBounce +
      airBlend * 0.04;
    hips.rotation.y = slowSway * 0.03 * (1 - moveBlend) + stride * 0.06 * moveBlend;
    torso.rotation.x =
      0.03 +
      breath * 0.014 * (1 - moveBlend) +
      (isSprinting ? 0.16 : 0.07) * moveBlend +
      airBlend * -0.06;
    chest.scale.set(1 + breath * 0.012, 1, 1 + breath * 0.016);
    headGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.05 * (1 - moveBlend);
    headGroup.rotation.x = -breath * 0.018 - (isSprinting ? 0.08 * moveBlend : 0);

    // Legs: stride cycle + airborne tuck
    legL.rotation.set(
      stride * legAmplitude + airBlend * -0.34,
      0,
      0.03
    );
    legR.rotation.set(
      -stride * legAmplitude + airBlend * 0.24,
      0,
      -0.03
    );

    if (capePivot) {
      const sprintBillow = (isSprinting ? 0.34 : 0.16) * moveBlend + airBlend * 0.28;
      const capeFlutter = Math.sin(elapsed * (2.4 + moveBlend * 6.5)) * (0.035 + moveBlend * 0.07);
      capePivot.rotation.x = 0.08 + sprintBillow + capeFlutter + introPulse * 0.14;
    }

    const armStride = stride * (isSprinting ? 0.56 : 0.36) * moveBlend;

    if (heroId === 'fallen_knight') {
      shoulderR.rotation.set(
        -0.35 - introPulse * 0.78 - armStride * 0.7,
        0.12 - introPulse * 0.45,
        0.14
      );
      forearmR.rotation.set(-0.52 - introPulse * 0.55, 0, 0.12);
      shoulderL.rotation.set(0.12 + breath * 0.03 + armStride, 0, -0.14);
      forearmL.rotation.set(-0.38 - moveBlend * 0.22, 0, 0);
    } else if (heroId === 'shadowblade') {
      const crouch = (0.06 + introPulse * 0.12) * (1 - moveBlend * 0.5);
      hips.position.y = 0.96 - crouch * 0.55 + breath * 0.01 * (1 - moveBlend) + stepBounce;
      torso.rotation.x = 0.16 - introPulse * 0.14 + (isSprinting ? 0.14 : 0.05) * moveBlend;
      legL.rotation.x = -crouch * 0.8 + stride * legAmplitude;
      legR.rotation.x = crouch * 0.4 - stride * legAmplitude;
      shoulderR.rotation.set(-0.48 - introPulse * 0.65 - armStride * 0.85, -0.25 + introPulse * 0.75, 0.22);
      forearmR.rotation.set(-0.78, 0, 0.22);
      shoulderL.rotation.set(-0.42 - introPulse * 0.6 + armStride * 0.85, 0.25 - introPulse * 0.75, -0.22);
      forearmL.rotation.set(-0.72, 0, -0.22);
    } else if (heroId === 'arcane_mage') {
      const hover = (introPulse * 0.16 + Math.sin(elapsed * 1.8) * 0.022) * (1 - moveBlend * 0.75);
      hips.position.y = 0.96 + hover + stepBounce;
      shoulderR.rotation.set(-0.28 - introPulse * 0.65 - armStride * 0.45, 0.1, 0.12);
      forearmR.rotation.set(-0.68, 0, 0);
      shoulderL.rotation.set(-0.22 - introPulse * 0.35 + armStride * 0.7, -0.18, -0.16);
      forearmL.rotation.set(-0.55, 0.3, 0);
      if (orbMesh) {
        orbMesh.rotation.y = elapsed * 1.6;
        orbMesh.rotation.x = Math.sin(elapsed * 1.2) * 0.25;
      }
      if (orbRing) {
        orbRing.rotation.z = elapsed * 1.3;
        orbRing.rotation.x = Math.PI * 0.35 + Math.sin(elapsed) * 0.2;
      }
      if (heroLight) {
        heroLight.intensity = 1.35 + Math.sin(elapsed * 3.1) * 0.25 + introPulse * 1.1;
      }
    } else if (heroId === 'ranger') {
      shoulderL.rotation.set(-0.45 - introPulse * 0.45 + armStride * 0.55, 0.38 + introPulse * 0.25, -0.12);
      forearmL.rotation.set(-0.35, 0, 0);
      shoulderR.rotation.set(-0.18 - introPulse * 0.55 - armStride * 0.85, -0.22, 0.18);
      forearmR.rotation.set(-0.55 - introPulse * 0.45, 0, 0);
      headGroup.rotation.y = (Math.sin(elapsed * 0.8) * 0.09 + introPulse * 0.18) * (1 - moveBlend);
    } else if (heroId === 'paladin') {
      shoulderL.rotation.set(-0.42 - introPulse * 0.35 + armStride * 0.5, 0.32, -0.14);
      forearmL.rotation.set(-0.72, 0, 0);
      shoulderR.rotation.set(-0.22 - introPulse * 0.85 - armStride * 0.75, 0.08, 0.14);
      forearmR.rotation.set(-0.48, 0, 0);
      if (auraGroup) {
        auraGroup.rotation.z = elapsed * 0.45;
      }
      if (heroLight) {
        heroLight.intensity = 1.15 + Math.sin(elapsed * 2.4) * 0.2 + introPulse * 0.9;
      }
    }
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

  return { heroId, root, rig, update, dispose };
}
