import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PlayableHeroId } from '../../types/game';
import { buildHero3DModel, Hero3DInstance, HeroLocomotionState } from './heroes3d';

/**
 * Reusable GLTF/GLB Asset Loader with AnimationMixer support & graceful procedural fallback.
 * Checks if optional external .glb files exist under /assets/models/ before attempting GLTFLoader
 * so missing external assets never spam errors or break rendering.
 */

export const EXPECTED_EXTERNAL_HERO_MODELS: Record<PlayableHeroId, string> = {
  fallen_knight: '/assets/models/heroes/fallen_knight.glb',
  shadowblade: '/assets/models/heroes/shadowblade.glb',
  arcane_mage: '/assets/models/heroes/arcane_mage.glb',
  ranger: '/assets/models/heroes/ranger.glb',
  paladin: '/assets/models/heroes/paladin.glb',
};

export const EXPECTED_EXTERNAL_WORLD_MODELS: Record<string, string> = {
  golden_tree: '/assets/models/world/golden_tree.glb',
  ancient_castle: '/assets/models/world/ancient_castle.glb',
  forgotten_village: '/assets/models/world/forgotten_village.glb',
  ancient_bridge: '/assets/models/world/ancient_bridge.glb',
  sacred_shrine: '/assets/models/world/sacred_shrine.glb',
};

const sharedLoader = new GLTFLoader();
const availabilityCache = new Map<string, boolean>();
const gltfPromiseCache = new Map<string, Promise<GLTF | null>>();

async function probeAssetExists(url: string): Promise<boolean> {
  if (availabilityCache.has(url)) {
    return availabilityCache.get(url) === true;
  }
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    const isBinaryOrGltf =
      res.ok &&
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain');
    availabilityCache.set(url, isBinaryOrGltf);
    return isBinaryOrGltf;
  } catch {
    availabilityCache.set(url, false);
    return false;
  }
}

export async function loadOptionalGlbAsset(url: string): Promise<GLTF | null> {
  if (gltfPromiseCache.has(url)) {
    return gltfPromiseCache.get(url)!;
  }

  const task = (async (): Promise<GLTF | null> => {
    const exists = await probeAssetExists(url);
    if (!exists) return null;

    return new Promise<GLTF | null>(resolve => {
      sharedLoader.load(
        url,
        gltf => resolve(gltf),
        undefined,
        () => resolve(null)
      );
    });
  })();

  gltfPromiseCache.set(url, task);
  return task;
}

/**
 * Loads a rigged GLB hero if present on disk under `/assets/models/heroes/{heroId}.glb`,
 * binding Idle / Walk / Run AnimationClips automatically. Falls back seamlessly to the
 * articulated procedural 3D hero rig when no external file exists.
 */
export async function loadHeroModelWithFallback(
  heroId: PlayableHeroId
): Promise<Hero3DInstance> {
  const url = EXPECTED_EXTERNAL_HERO_MODELS[heroId];
  const gltf = await loadOptionalGlbAsset(url);

  if (gltf?.scene) {
    const root = new THREE.Group();
    root.name = `hero_glb_${heroId}`;
    const model = gltf.scene;
    model.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // Normalize scale so external character stands ~1.92m tall with feet at y = 0
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.01) {
      const targetScale = 1.92 / size.y;
      model.scale.multiplyScalar(targetScale);
      box.setFromObject(model);
    }
    model.position.y -= box.min.y;
    root.add(model);

    const mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations || [];
    const findClip = (names: string[]) =>
      clips.find(c => names.some(n => c.name.toLowerCase().includes(n)));

    const idleClip = findClip(['idle', 'stand']) || clips[0];
    const walkClip = findClip(['walk', 'jog']);
    const runClip = findClip(['run', 'sprint']);

    const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
    const walkAction = walkClip ? mixer.clipAction(walkClip) : null;
    const runAction = runClip ? mixer.clipAction(runClip) : null;
    idleAction?.play();
    let currentAction = idleAction;

    const dummyRigGroup = root;
    const emptyRig = {
      root,
      hips: dummyRigGroup,
      torso: dummyRigGroup,
      chest: dummyRigGroup,
      headGroup: dummyRigGroup,
      shoulderL: dummyRigGroup,
      forearmL: dummyRigGroup,
      shoulderR: dummyRigGroup,
      forearmR: dummyRigGroup,
      legL: dummyRigGroup,
      legR: dummyRigGroup,
    };

    return {
      heroId,
      root,
      rig: emptyRig,
      isExternalGlb: true,
      update: (dt: number, _elapsed: number, _introElapsed: number, locomotion?: HeroLocomotionState) => {
        const speed = locomotion?.speedRatio ?? 0;
        const nextAction =
          speed > 0.65 && locomotion?.isSprinting && runAction
            ? runAction
            : speed > 0.12 && walkAction
            ? walkAction
            : idleAction;

        if (nextAction && nextAction !== currentAction) {
          currentAction?.fadeOut(0.18);
          nextAction.reset().fadeIn(0.18).play();
          currentAction = nextAction;
        }
        mixer.update(dt);
      },
      dispose: () => {
        mixer.stopAllAction();
        root.traverse(obj => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => m.dispose());
          }
        });
      },
    };
  }

  // Honest procedural fallback when no external GLB exists
  return buildHero3DModel(heroId);
}

export async function loadEnvironmentAssetWithFallback(
  assetKey: string,
  buildFallback: () => { root: THREE.Group; dispose: () => void }
): Promise<{ root: THREE.Group; isExternalGlb: boolean; dispose: () => void }> {
  const url = EXPECTED_EXTERNAL_WORLD_MODELS[assetKey];
  if (url) {
    const gltf = await loadOptionalGlbAsset(url);
    if (gltf?.scene) {
      const root = new THREE.Group();
      gltf.scene.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      root.add(gltf.scene);
      return {
        root,
        isExternalGlb: true,
        dispose: () => {
          root.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach(m => m.dispose());
            }
          });
        },
      };
    }
  }
  const procedural = buildFallback();
  return {
    root: procedural.root,
    isExternalGlb: false,
    dispose: procedural.dispose,
  };
}
