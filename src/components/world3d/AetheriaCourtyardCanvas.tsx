import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlayableHeroId } from '../../types/game';
import { buildHero3DModel, Hero3DInstance } from './heroes3d';
import { buildCastleCourtyard3d } from './castleCourtyard3d';

export type CourtyardCameraPreset = 'courtyard' | 'hero' | 'citadel';

interface AetheriaCourtyardCanvasProps {
  heroId: PlayableHeroId;
  restorationRatio: number;
  cameraPreset: CourtyardCameraPreset;
  isSoftwareGl?: boolean;
  onWebglError?: () => void;
}

const CAMERA_PRESETS: Record<
  CourtyardCameraPreset,
  { pos: THREE.Vector3; target: THREE.Vector3 }
> = {
  courtyard: {
    pos: new THREE.Vector3(0.45, 2.35, 5.65),
    target: new THREE.Vector3(0, 1.25, -0.35),
  },
  hero: {
    pos: new THREE.Vector3(0.85, 1.72, 3.15),
    target: new THREE.Vector3(0, 1.18, 0),
  },
  citadel: {
    pos: new THREE.Vector3(-2.6, 3.6, 8.2),
    target: new THREE.Vector3(0, 2.1, -3.4),
  },
};

export const AetheriaCourtyardCanvas: React.FC<AetheriaCourtyardCanvasProps> = ({
  heroId,
  restorationRatio,
  cameraPreset,
  isSoftwareGl = false,
  onWebglError,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const heroInstanceRef = useRef<Hero3DInstance | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const introTimerRef = useRef<number>(0);
  const desiredCameraRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: CAMERA_PRESETS.courtyard.pos.clone(),
    target: CAMERA_PRESETS.courtyard.target.clone(),
  });

  // Trigger smooth camera glide when preset prop changes
  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.courtyard;
    desiredCameraRef.current.pos.copy(preset.pos);
    desiredCameraRef.current.target.copy(preset.target);
    desiredCameraRef.current.active = true;
  }, [cameraPreset]);

  // Swap 3D hero model dynamically without tearing down courtyard or WebGL context
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (heroInstanceRef.current) {
      scene.remove(heroInstanceRef.current.root);
      heroInstanceRef.current.dispose();
      heroInstanceRef.current = null;
    }

    const nextHero = buildHero3DModel(heroId);
    nextHero.root.position.set(0, 0, 0.25);
    scene.add(nextHero.root);
    heroInstanceRef.current = nextHero;
    introTimerRef.current = 0;
  }, [heroId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: isSoftwareGl ? 'low-power' : 'high-performance',
        alpha: false,
      });
    } catch {
      onWebglError?.();
      return;
    }

    const maxDpr = isSoftwareGl ? 1.0 : Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(maxDpr);
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 500, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'pan-y';
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061225);
    scene.fog = new THREE.FogExp2(0x061225, 0.026);
    sceneRef.current = scene;

    // Neutral PBR Environment Reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 180);
    camera.position.copy(CAMERA_PRESETS[cameraPreset].pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(CAMERA_PRESETS[cameraPreset].target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false; // Preserve page scroll cleanly
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 2.4;
    controls.maxDistance = 11;
    controls.update();

    const handleControlStart = () => {
      desiredCameraRef.current.active = false;
    };
    controls.addEventListener('start', handleControlStart);

    // Three-point futuristic midnight key + electric-blue rim + cyan fill
    const hemiLight = new THREE.HemisphereLight(0x5b8fd9, 0x0a1930, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.75);
    keyLight.position.set(5.5, 9.5, 6.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1536, 1536);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 28;
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0006;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x1677ff, 1.55);
    rimLight.position.set(-6.0, 5.2, -5.0);
    scene.add(rimLight);

    const moonFill = new THREE.DirectionalLight(0x00d9ff, 0.72);
    moonFill.position.set(5.5, 3.0, -7.5);
    scene.add(moonFill);

    const gateBounce = new THREE.PointLight(0x38bdf8, 1.25, 16, 1.8);
    gateBounce.position.set(0, 3.0, -4.2);
    scene.add(gateBounce);

    // Build Castle Courtyard & Initial Selected Hero
    const courtyard = buildCastleCourtyard3d({
      restorationRatio,
      lowPerfMode: isSoftwareGl,
    });
    scene.add(courtyard.root);

    const hero = buildHero3DModel(heroId);
    hero.root.position.set(0, 0, 0.25);
    scene.add(hero.root);
    heroInstanceRef.current = hero;
    introTimerRef.current = 0;

    // ResizeObserver
    const resizeObs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObs.observe(host);

    // Visibility & IntersectionObserver pause
    let isInViewport = true;
    const interObs = new IntersectionObserver(
      entries => {
        isInViewport = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    interObs.observe(host);

    let rafId = 0;
    let timeoutId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    const tick = () => {
      if (disposed) return;

      if (document.hidden || !isInViewport) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;
      introTimerRef.current += dt;

      // Damped camera preset transitions
      if (desiredCameraRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          desiredCameraRef.current.pos.x,
          5.2,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          desiredCameraRef.current.pos.y,
          5.2,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          desiredCameraRef.current.pos.z,
          5.2,
          dt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          desiredCameraRef.current.target.x,
          5.2,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          desiredCameraRef.current.target.y,
          5.2,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          desiredCameraRef.current.target.z,
          5.2,
          dt
        );
        if (
          camera.position.distanceTo(desiredCameraRef.current.pos) < 0.03 &&
          controls.target.distanceTo(desiredCameraRef.current.target) < 0.03
        ) {
          desiredCameraRef.current.active = false;
        }
      }

      controls.update();
      courtyard.update(elapsed);
      heroInstanceRef.current?.update(dt, elapsed, introTimerRef.current);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        timeoutId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(tick);
        }, 48);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      resizeObs.disconnect();
      interObs.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      courtyard.dispose();
      if (heroInstanceRef.current) {
        heroInstanceRef.current.dispose();
        heroInstanceRef.current = null;
      }
      envTarget.dispose();
      sceneRef.current = null;
      renderer.dispose();
    };
  }, [restorationRatio, isSoftwareGl]);

  return (
    <div
      ref={hostRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Castle Courtyard and Selected Hero"
    />
  );
};
