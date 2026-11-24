import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  GoldenTreeStage,
  LandmarkId,
  PlayableHeroId,
  WorldGraphicsQuality,
  WorldLandmarkState,
  WorldPlayerPosition,
} from '../../../types/game';
import { Hero3DInstance } from '../heroes3d';
import { loadHeroModelWithFallback } from '../assetLoader';
import { buildHeartlandsEnvironment3d } from './environment3d';
import { buildGoldenTree3d, GoldenTree3DInstance } from './goldenTree3d';
import {
  buildHeartlandsLandmarks3d,
  HeartlandsLandmarksInstance,
} from './landmarks3d';
import {
  getHeartlandsZoneName,
  getNearestInteractable,
  InteractableTarget,
  WorldCollisionRegistry,
} from './terrainMath';
import {
  ControllerTelemetry,
  ThirdPersonController,
  VirtualMoveInput,
} from './ThirdPersonController';

export interface HeartlandsHudSnapshot {
  telemetry: ControllerTelemetry;
  zoneName: string;
  nearestInteractable: InteractableTarget | null;
  usingExternalHeroGlb: boolean;
}

export interface HeartlandsWorldHandle {
  setVirtualInput: (input: VirtualMoveInput) => void;
  rotateCamera: (dYaw: number, dPitch: number) => void;
  triggerJump: () => void;
  teleportTo: (x: number, z: number) => void;
}

interface HeartlandsWorldCanvasProps {
  heroId: PlayableHeroId;
  goldenTreeStage: GoldenTreeStage;
  landmarks: Record<LandmarkId, WorldLandmarkState>;
  graphicsQuality: WorldGraphicsQuality;
  initialPosition?: WorldPlayerPosition;
  isPaused?: boolean;
  onHudUpdate: (snapshot: HeartlandsHudSnapshot) => void;
  onInteractTarget: (target: InteractableTarget) => void;
  onPositionPersist?: (pos: WorldPlayerPosition) => void;
  onWorldReady?: () => void;
  onWebglError?: (reason: string) => void;
}

export const HeartlandsWorldCanvas = forwardRef<
  HeartlandsWorldHandle,
  HeartlandsWorldCanvasProps
>(
  (
    {
      heroId,
      goldenTreeStage,
      landmarks,
      graphicsQuality,
      initialPosition,
      isPaused = false,
      onHudUpdate,
      onInteractTarget,
      onPositionPersist,
      onWorldReady,
      onWebglError,
    },
    ref
  ) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const collidersRef = useRef<WorldCollisionRegistry | null>(null);
    const controllerRef = useRef<ThirdPersonController | null>(null);
    const heroRef = useRef<Hero3DInstance | null>(null);
    const treeRef = useRef<GoldenTree3DInstance | null>(null);
    const landmarksRef = useRef<HeartlandsLandmarksInstance | null>(null);

    const isPausedRef = useRef(isPaused);
    isPausedRef.current = isPaused;
    const onHudUpdateRef = useRef(onHudUpdate);
    onHudUpdateRef.current = onHudUpdate;
    const onInteractRef = useRef(onInteractTarget);
    onInteractRef.current = onInteractTarget;
    const onPersistRef = useRef(onPositionPersist);
    onPersistRef.current = onPositionPersist;
    const latestNearestRef = useRef<InteractableTarget | null>(null);
    const usingGlbRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      setVirtualInput: input => {
        controllerRef.current?.setVirtualInput(input);
      },
      rotateCamera: (dYaw, dPitch) => {
        controllerRef.current?.rotateCameraByDelta(dYaw, dPitch);
      },
      triggerJump: () => {
        controllerRef.current?.triggerJump();
      },
      teleportTo: (x, z) => {
        controllerRef.current?.teleportTo(x, z);
      },
    }));

    // Live swap Hero model if heroId changes
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      let cancelled = false;

      void loadHeroModelWithFallback(heroId).then(instance => {
        if (cancelled || !sceneRef.current) {
          instance.dispose();
          return;
        }
        if (heroRef.current) {
          scene.remove(heroRef.current.root);
          heroRef.current.dispose();
        }
        if (controllerRef.current) {
          instance.root.position.copy(controllerRef.current.position);
          instance.root.rotation.y = controllerRef.current.characterYaw;
        }
        usingGlbRef.current = Boolean(instance.isExternalGlb);
        scene.add(instance.root);
        heroRef.current = instance;
      });

      return () => {
        cancelled = true;
      };
    }, [heroId]);

    // Live rebuild Golden Tree & Landmarks when Phase 1 stage preview changes (without rebuilding terrain/WebGL!)
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      const lowPerf = graphicsQuality === 'low';
      const rebuildColliders = new WorldCollisionRegistry();

      if (treeRef.current) {
        scene.remove(treeRef.current.root);
        treeRef.current.dispose();
      }
      const nextTree = buildGoldenTree3d(goldenTreeStage, rebuildColliders, lowPerf);
      scene.add(nextTree.root);
      treeRef.current = nextTree;

      if (landmarksRef.current) {
        scene.remove(landmarksRef.current.root);
        landmarksRef.current.dispose();
      }
      const nextLandmarks = buildHeartlandsLandmarks3d(
        landmarks,
        rebuildColliders,
        lowPerf
      );
      scene.add(nextLandmarks.root);
      landmarksRef.current = nextLandmarks;

      // Sync structural colliders while keeping initial forest colliders intact
      if (collidersRef.current && controllerRef.current) {
        // Keep base terrain/tree colliders and rebuild structural ones cleanly
        collidersRef.current.boxes = [...rebuildColliders.boxes];
      }
    }, [goldenTreeStage, landmarks, graphicsQuality]);

    // Main WebGL World Initialization
    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const lowPerf = graphicsQuality === 'low';
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !lowPerf,
          powerPreference: lowPerf ? 'low-power' : 'high-performance',
          alpha: false,
        });
      } catch (err: any) {
        onWebglError?.(err?.message || 'WebGL context could not be initialized on this device.');
        return;
      }

      const dpr = lowPerf ? 1.0 : Math.min(1.8, window.devicePixelRatio || 1);
      const initW = Math.max(320, host.clientWidth || 960);
      const initH = Math.max(240, host.clientHeight || 600);

      renderer.setPixelRatio(dpr);
      renderer.setSize(initW, initH, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;
      renderer.shadowMap.enabled = !lowPerf;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      host.innerHTML = '';
      host.appendChild(renderer.domElement);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        onWebglError?.('Graphics context was lost. Try switching to Low Performance Graphics mode.');
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x061225);
      scene.fog = new THREE.FogExp2(0x0a1930, 0.0082);
      sceneRef.current = scene;

      // Environment reflections via PMREM
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTarget = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envTarget.texture;
      roomEnv.dispose();
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(52, initW / initH, 0.2, 320);

      // Cinematic Lighting (Crisp Daylight + Deep Navy Bounce + Electric Blue Rim Fill)
      const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x0a1930, 1.05);
      scene.add(hemi);

      const sunLight = new THREE.DirectionalLight(0xe0f2fe, 2.75);
      sunLight.position.set(48, 62, -32);
      if (!lowPerf) {
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(2048, 2048);
        sunLight.shadow.camera.near = 5;
        sunLight.shadow.camera.far = 180;
        sunLight.shadow.camera.left = -58;
        sunLight.shadow.camera.right = 58;
        sunLight.shadow.camera.top = 58;
        sunLight.shadow.camera.bottom = -58;
        sunLight.shadow.bias = -0.0005;
      }
      scene.add(sunLight);
      scene.add(sunLight.target);

      const rimFill = new THREE.DirectionalLight(0x1677ff, 0.85);
      rimFill.position.set(-42, 24, 48);
      scene.add(rimFill);

      // Build Heartlands World + Colliders
      const colliders = new WorldCollisionRegistry();
      collidersRef.current = colliders;

      const env = buildHeartlandsEnvironment3d(colliders, lowPerf);
      scene.add(env.root);

      const tree = buildGoldenTree3d(goldenTreeStage, colliders, lowPerf);
      scene.add(tree.root);
      treeRef.current = tree;

      const lm = buildHeartlandsLandmarks3d(landmarks, colliders, lowPerf);
      scene.add(lm.root);
      landmarksRef.current = lm;

      const controller = new ThirdPersonController({
        domElement: renderer.domElement,
        colliders,
        initialPosition,
        onInteract: () => {
          if (latestNearestRef.current && !isPausedRef.current) {
            onInteractRef.current(latestNearestRef.current);
          }
        },
      });
      controllerRef.current = controller;

      // Load Player Hero (GLB if present or procedural 3D rig fallback)
      let cancelled = false;
      void loadHeroModelWithFallback(heroId).then(instance => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        instance.root.position.copy(controller.position);
        instance.root.rotation.y = controller.characterYaw;
        usingGlbRef.current = Boolean(instance.isExternalGlb);
        scene.add(instance.root);
        heroRef.current = instance;
        onWorldReady?.();
      });

      // Controlled UnrealBloom Post-Processing on High quality mode
      let composer: EffectComposer | null = null;
      if (!lowPerf) {
        try {
          composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
          const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(initW, initH),
            0.32, // subtle glow on Golden Tree / torches
            0.55,
            0.82
          );
          composer.addPass(bloomPass);
          composer.addPass(new OutputPass());
        } catch {
          composer = null;
        }
      }

      const resizeObs = new ResizeObserver(entries => {
        for (const entry of entries) {
          const w = Math.max(1, Math.floor(entry.contentRect.width));
          const h = Math.max(1, Math.floor(entry.contentRect.height));
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
          composer?.setSize(w, h);
        }
      });
      resizeObs.observe(host);

      let rafId = 0;
      let disposed = false;
      let lastTime = performance.now();
      let elapsed = 0;
      let hudAccum = 0;
      let persistAccum = 0;

      const tick = () => {
        if (disposed) return;

        if (document.hidden) {
          lastTime = performance.now();
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        elapsed += dt;

        env.update(dt, elapsed);
        treeRef.current?.update(elapsed);
        landmarksRef.current?.update(elapsed);

        const activeHero = heroRef.current;
        if (activeHero) {
          if (!isPausedRef.current) {
            const { locomotion, telemetry } = controller.update(
              dt,
              camera,
              activeHero.root
            );
            activeHero.update(dt, elapsed, elapsed, locomotion);

            // Follow sun shadow frustum subtly near player for crisp local shadows
            if (!lowPerf) {
              sunLight.position.set(
                telemetry.x + 42,
                telemetry.y + 56,
                telemetry.z - 28
              );
              sunLight.target.position.set(telemetry.x, telemetry.y, telemetry.z);
              sunLight.target.updateMatrixWorld();
            }

            hudAccum += dt;
            if (hudAccum >= 0.09) {
              hudAccum = 0;
              const nearest = getNearestInteractable(telemetry.x, telemetry.z);
              latestNearestRef.current = nearest;
              onHudUpdateRef.current({
                telemetry,
                zoneName: getHeartlandsZoneName(telemetry.x, telemetry.z),
                nearestInteractable: nearest,
                usingExternalHeroGlb: usingGlbRef.current,
              });
            }

            persistAccum += dt;
            if (persistAccum >= 6.0) {
              persistAccum = 0;
              onPersistRef.current?.({
                x: Number(telemetry.x.toFixed(2)),
                y: Number(telemetry.y.toFixed(2)),
                z: Number(telemetry.z.toFixed(2)),
              });
            }
          } else {
            activeHero.update(dt, elapsed, elapsed);
          }
        }

        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        rafId = window.requestAnimationFrame(tick);
      };

      rafId = window.requestAnimationFrame(tick);

      return () => {
        disposed = true;
        cancelled = true;
        window.cancelAnimationFrame(rafId);
        resizeObs.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        controller.dispose();
        env.dispose();
        treeRef.current?.dispose();
        landmarksRef.current?.dispose();
        if (heroRef.current) {
          heroRef.current.dispose();
          heroRef.current = null;
        }
        composer?.dispose();
        envTarget.dispose();
        sceneRef.current = null;
        renderer.dispose();
      };
    }, [graphicsQuality]);

    return (
      <div
        ref={hostRef}
        className="w-full h-full relative select-none"
        aria-label="The Heartlands Explorable 3D World"
      />
    );
  }
);

HeartlandsWorldCanvas.displayName = 'HeartlandsWorldCanvas';
