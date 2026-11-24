import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WeaponCategory, WeaponRarity } from '../../../types/game';

export interface GpuProbeResult {
  webglAvailable: boolean;
  isSoftwareGl: boolean;
  lowHardwareTier: boolean;
}

export function probeWebGLCapabilities(): GpuProbeResult {
  if (typeof document === 'undefined') {
    return { webglAvailable: false, isSoftwareGl: false, lowHardwareTier: true };
  }
  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return { webglAvailable: false, isSoftwareGl: false, lowHardwareTier: true };
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpuStr = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuStr);
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const lowHardwareTier = isSoftwareGl || cores <= 4;

    return { webglAvailable: true, isSoftwareGl, lowHardwareTier };
  } catch {
    return { webglAvailable: false, isSoftwareGl: false, lowHardwareTier: true };
  }
}

interface AetheriaRelicCanvasProps {
  category: WeaponCategory;
  rarity: WeaponRarity;
  level: number;
  isSoftwareGl: boolean;
  onWebglError: () => void;
}

function getRarityAccentHex(rarity: WeaponRarity): number {
  switch (rarity) {
    case 'Uncommon':
      return 0x5c946e;
    case 'Rare':
      return 0x5a7fb8;
    case 'Epic':
    case 'Mythic':
      return 0x7046a5;
    case 'Legendary':
    case 'Ascendant':
    case 'Divine':
    case 'Celestial':
    case 'Eternal':
      return 0xc5a15a;
    case 'Common':
    default:
      return 0xa89f91;
  }
}

function buildWeaponMeshGroup(
  category: WeaponCategory,
  rarity: WeaponRarity,
  level: number
): {
  root: THREE.Group;
  artifact: THREE.Group;
  rings: THREE.Mesh[];
  coreCrystal: THREE.Mesh;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const artifact = new THREE.Group();
  const rings: THREE.Mesh[] = [];
  const disposables: { dispose: () => void }[] = [];

  const accentHex = getRarityAccentHex(rarity);

  // Sculpted PBR materials following dark-fantasy obsidian, brushed steel, antique gold & subtle violet accent
  const steelMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9d2c5,
    metalness: 0.92,
    roughness: 0.22,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1a1526,
    metalness: 0.85,
    roughness: 0.42,
  });
  const antiqueGoldMat = new THREE.MeshPhysicalMaterial({
    color: 0xc5a15a,
    metalness: 0.94,
    roughness: 0.24,
    clearcoat: 0.25,
  });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.45,
    metalness: 0.1,
    roughness: 0.12,
    transmission: 0.35,
    ior: 1.55,
    thickness: 0.6,
  });
  const pedestalStoneMat = new THREE.MeshStandardMaterial({
    color: 0x141020,
    metalness: 0.18,
    roughness: 0.78,
  });

  disposables.push(steelMat, darkIronMat, antiqueGoldMat, crystalMat, pedestalStoneMat);

  // Carved obsidian sanctuary plinth below weapon
  const plinthPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.18, 0),
    new THREE.Vector2(1.14, 0.14),
    new THREE.Vector2(0.95, 0.24),
    new THREE.Vector2(0.92, 0.36),
    new THREE.Vector2(0, 0.36),
  ];
  const plinthGeo = new THREE.LatheGeometry(plinthPoints, 28);
  const plinthMesh = new THREE.Mesh(plinthGeo, pedestalStoneMat);
  plinthMesh.position.y = -1.65;
  root.add(plinthMesh);

  const plinthTrimGeo = new THREE.TorusGeometry(0.93, 0.025, 10, 48);
  const plinthTrim = new THREE.Mesh(plinthTrimGeo, antiqueGoldMat);
  plinthTrim.rotation.x = Math.PI / 2;
  plinthTrim.position.y = -1.29;
  root.add(plinthTrim);

  disposables.push(plinthGeo, plinthTrimGeo);

  // Subtle orbital gold astrolabe rings (subtle progression cue based on weapon level)
  const ringCount = level >= 7 ? 2 : 1;
  for (let i = 0; i < ringCount; i++) {
    const rGeo = new THREE.TorusGeometry(1.18 + i * 0.22, 0.014, 10, 64);
    const rMesh = new THREE.Mesh(rGeo, antiqueGoldMat);
    rMesh.rotation.x = Math.PI * (0.35 + i * 0.2);
    rMesh.rotation.z = i * 0.6;
    artifact.add(rMesh);
    rings.push(rMesh);
    disposables.push(rGeo);
  }

  // Faceted Aether core crystal present on every weapon focal axis
  const coreGeo = new THREE.OctahedronGeometry(0.16, 0);
  const coreCrystal = new THREE.Mesh(coreGeo, crystalMat);
  disposables.push(coreGeo);

  if (
    category === 'Swords' ||
    category === 'Daggers' ||
    category === 'Greatswords' ||
    category === 'Dual Blades'
  ) {
    const isGreat = category === 'Greatswords';
    const isDagger = category === 'Daggers' || category === 'Dual Blades';
    const bladeLen = isGreat ? 2.15 : isDagger ? 1.25 : 1.75;
    const halfW = isGreat ? 0.16 : isDagger ? 0.095 : 0.115;

    // Beveled diamond cross-section extruded blade
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(halfW, 0.16);
    bladeShape.lineTo(halfW * 0.72, bladeLen * 0.82);
    bladeShape.lineTo(0, bladeLen);
    bladeShape.lineTo(-halfW * 0.72, bladeLen * 0.82);
    bladeShape.lineTo(-halfW, 0.16);
    bladeShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    bladeGeo.center();
    const bladeMesh = new THREE.Mesh(bladeGeo, steelMat);
    bladeMesh.position.y = 0.28;
    artifact.add(bladeMesh);

    // Central fuller inlay strip
    const fullerGeo = new THREE.CylinderGeometry(0.018, 0.014, bladeLen * 0.65, 8);
    const fullerMesh = new THREE.Mesh(fullerGeo, antiqueGoldMat);
    fullerMesh.position.y = 0.22;
    artifact.add(fullerMesh);

    // Swept crossguard wings
    const guardCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.48, -bladeLen * 0.42 + 0.22, 0),
      new THREE.Vector3(-0.18, -bladeLen * 0.42 + 0.14, 0),
      new THREE.Vector3(0, -bladeLen * 0.42 + 0.16, 0),
      new THREE.Vector3(0.18, -bladeLen * 0.42 + 0.14, 0),
      new THREE.Vector3(0.48, -bladeLen * 0.42 + 0.22, 0),
    ]);
    const guardGeo = new THREE.TubeGeometry(guardCurve, 20, 0.042, 10, false);
    const guardMesh = new THREE.Mesh(guardGeo, antiqueGoldMat);
    artifact.add(guardMesh);

    // Turned leather/iron hilt + sculpted pommel
    const hiltPoints = [
      new THREE.Vector2(0, -0.58),
      new THREE.Vector2(0.085, -0.5),
      new THREE.Vector2(0.045, -0.4),
      new THREE.Vector2(0.05, 0),
      new THREE.Vector2(0, 0),
    ];
    const hiltGeo = new THREE.LatheGeometry(hiltPoints, 16);
    const hiltMesh = new THREE.Mesh(hiltGeo, darkIronMat);
    hiltMesh.position.y = -bladeLen * 0.42 + 0.14;
    artifact.add(hiltMesh);

    coreCrystal.position.set(0, -bladeLen * 0.42 + 0.16, 0.04);
    coreCrystal.scale.setScalar(0.65);
    artifact.add(coreCrystal);

    artifact.rotation.z = -0.18;
    disposables.push(bladeGeo, fullerGeo, guardGeo, hiltGeo);
  } else if (category === 'Bows' || category === 'Crossbows') {
    const bowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.34, 1.25, 0),
      new THREE.Vector3(0.14, 0.72, 0),
      new THREE.Vector3(0.24, 0, 0),
      new THREE.Vector3(0.14, -0.72, 0),
      new THREE.Vector3(-0.34, -1.25, 0),
    ]);
    const bowGeo = new THREE.TubeGeometry(bowCurve, 36, 0.042, 10, false);
    const bowMesh = new THREE.Mesh(bowGeo, antiqueGoldMat);
    artifact.add(bowMesh);

    const riserGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.42, 12);
    const riserMesh = new THREE.Mesh(riserGeo, darkIronMat);
    riserMesh.position.set(0.24, 0, 0);
    artifact.add(riserMesh);

    const stringGeo = new THREE.CylinderGeometry(0.007, 0.007, 2.5, 6);
    const stringMesh = new THREE.Mesh(stringGeo, steelMat);
    stringMesh.position.set(-0.34, 0, 0);
    artifact.add(stringMesh);

    coreCrystal.position.set(0.29, 0, 0);
    coreCrystal.scale.setScalar(0.6);
    artifact.add(coreCrystal);

    artifact.rotation.z = category === 'Crossbows' ? 1.38 : -0.1;
    disposables.push(bowGeo, riserGeo, stringGeo);
  } else if (category === 'Magic Staffs' || category === 'Wands' || category === 'Spears') {
    const shaftGeo = new THREE.CylinderGeometry(0.036, 0.028, 2.35, 14);
    const shaftMesh = new THREE.Mesh(shaftGeo, darkIronMat);
    shaftMesh.position.y = -0.1;
    artifact.add(shaftMesh);

    const collarGeo = new THREE.TorusGeometry(0.14, 0.025, 10, 24);
    const collarMesh = new THREE.Mesh(collarGeo, antiqueGoldMat);
    collarMesh.position.y = 1.02;
    artifact.add(collarMesh);

    coreCrystal.position.set(0, 1.04, 0);
    coreCrystal.scale.setScalar(category === 'Spears' ? 0.85 : 1.05);
    artifact.add(coreCrystal);

    artifact.rotation.z = -0.14;
    disposables.push(shaftGeo, collarGeo);
  } else if (category === 'Axes' || category === 'War Hammers' || category === 'Scythes') {
    const haftGeo = new THREE.CylinderGeometry(0.04, 0.034, 2.1, 14);
    const haftMesh = new THREE.Mesh(haftGeo, darkIronMat);
    artifact.add(haftMesh);

    const axeShape = new THREE.Shape();
    axeShape.moveTo(0, 0.35);
    axeShape.quadraticCurveTo(0.65, 0.65, 0.72, 0.95);
    axeShape.quadraticCurveTo(0.84, 0.5, 0.7, 0.02);
    axeShape.quadraticCurveTo(0.45, 0.25, 0, 0.2);
    axeShape.closePath();

    const axeHeadGeo = new THREE.ExtrudeGeometry(axeShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    axeHeadGeo.center();
    const headMesh = new THREE.Mesh(axeHeadGeo, steelMat);
    headMesh.position.set(0.28, 0.56, 0);
    artifact.add(headMesh);

    coreCrystal.position.set(0, 0.56, 0.06);
    coreCrystal.scale.setScalar(0.62);
    artifact.add(coreCrystal);

    artifact.rotation.z = -0.16;
    disposables.push(haftGeo, axeHeadGeo);
  } else {
    // Shields, Armour, Helmets, Accessories -> Sculpted Heraldic Aegis Crest + Relic Crystal
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.92);
    shieldShape.lineTo(0.72, 0.72);
    shieldShape.quadraticCurveTo(0.76, -0.25, 0, -0.95);
    shieldShape.quadraticCurveTo(-0.76, -0.25, -0.72, 0.72);
    shieldShape.closePath();

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    shieldGeo.center();
    const shieldMesh = new THREE.Mesh(shieldGeo, darkIronMat);
    artifact.add(shieldMesh);

    const bossGeo = new THREE.TorusGeometry(0.32, 0.032, 10, 32);
    const bossMesh = new THREE.Mesh(bossGeo, antiqueGoldMat);
    bossMesh.position.z = 0.08;
    artifact.add(bossMesh);

    coreCrystal.position.set(0, 0.05, 0.14);
    coreCrystal.scale.setScalar(0.85);
    artifact.add(coreCrystal);

    disposables.push(shieldGeo, bossGeo);
  }

  root.add(artifact);

  return {
    root,
    artifact,
    rings,
    coreCrystal,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}

export const AetheriaRelicCanvas: React.FC<AetheriaRelicCanvasProps> = ({
  category,
  rarity,
  level,
  isSoftwareGl,
  onWebglError,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<ReturnType<typeof buildWeaponMeshGroup> | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Swap sculpted 3D weapon when equipped item changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
      rigRef.current.dispose();
    }
    const nextRig = buildWeaponMeshGroup(category, rarity, level);
    rigRef.current = nextRig;
    scene.add(nextRig.root);
  }, [category, rarity, level]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      onWebglError();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const width = Math.max(220, container.clientWidth);
    const height = Math.max(220, container.clientHeight);
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // PMREM metallic studio reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.2, 50);
    camera.position.set(0.35, 0.55, 4.35);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.9;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = 0.65;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.target.set(0, -0.05, 0);
    controls.update();

    // Dark-fantasy studio key + rim lighting
    const keyLight = new THREE.DirectionalLight(0xffe7b3, 2.2);
    keyLight.position.set(3.5, 4.2, 4.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7046a5, 1.55);
    rimLight.position.set(-3.8, 1.8, -3.0);
    scene.add(rimLight);

    const fillLight = new THREE.HemisphereLight(0xd9d2c5, 0x100d19, 0.65);
    scene.add(fillLight);

    const rig = buildWeaponMeshGroup(category, rarity, level);
    rigRef.current = rig;
    scene.add(rig.root);

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(220, Math.floor(entry.contentRect.width));
      const h = Math.max(220, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(container);

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let isVisible = true;
    let isDocVisible = typeof document === 'undefined' ? true : !document.hidden;
    let isDisposed = false;
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function scheduleNextFrame() {
      if (isDisposed || !isVisible || !isDocVisible) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    function tick() {
      if (isDisposed || !isVisible || !isDocVisible) return;
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      const activeRig = rigRef.current;
      if (activeRig && !reducedMotion) {
        activeRig.artifact.rotation.y += dt * 0.42;
        activeRig.artifact.position.y = Math.sin(elapsed * 1.55) * 0.07;
        activeRig.coreCrystal.rotation.y += dt * 1.15;

        for (let i = 0; i < activeRig.rings.length; i++) {
          activeRig.rings[i].rotation.y += dt * (0.38 + i * 0.2) * (i % 2 === 0 ? 1 : -1);
          activeRig.rings[i].rotation.x += dt * 0.16;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      scheduleNextFrame();
    }

    const startLoop = () => {
      if (!isDisposed && isVisible && isDocVisible) {
        clock.getDelta();
        scheduleNextFrame();
      }
    };

    const io = new IntersectionObserver(
      entries => {
        const next = Boolean(entries[0]?.isIntersecting);
        if (next !== isVisible) {
          isVisible = next;
          if (next) startLoop();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    const onVisibility = () => {
      isDocVisible = !document.hidden;
      if (isDocVisible) startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    renderer.render(scene, camera);
    startLoop();

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      if (rigRef.current) {
        rigRef.current.dispose();
        rigRef.current = null;
      }
      sceneRef.current = null;
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      aria-label="Interactive 3D Equipped Weapon Showcase"
    />
  );
};
