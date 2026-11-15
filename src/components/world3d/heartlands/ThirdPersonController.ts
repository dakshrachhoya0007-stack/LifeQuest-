import * as THREE from 'three';
import { HeroLocomotionState } from '../heroes3d';
import {
  getWalkableSurfaceHeight,
  WorldCollisionRegistry,
} from './terrainMath';

export interface VirtualMoveInput {
  x: number; // -1 left .. +1 right
  y: number; // -1 back .. +1 forward
  sprint: boolean;
}

export interface ControllerTelemetry {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedRatio: number;
  isSprinting: boolean;
  isGrounded: boolean;
}

const WALK_SPEED = 5.6;
const SPRINT_SPEED = 10.2;
const JUMP_IMPULSE = 9.2;
const GRAVITY = -23.0;
const PLAYER_RADIUS = 0.48;

function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

export class ThirdPersonController {
  public position = new THREE.Vector3(0, 2.5, 11.5);
  public velocityY = 0;
  public isGrounded = true;
  public characterYaw = Math.PI; // Facing Golden Tree initially (looking -Z)
  public cameraYaw = 0;
  public cameraPitch = 0.36;
  public cameraDistance = 6.4;

  private smoothCameraPos = new THREE.Vector3();
  private smoothLookTarget = new THREE.Vector3();
  private keys = new Set<string>();
  private virtualInput: VirtualMoveInput = { x: 0, y: 0, sprint: false };
  private isDraggingCamera = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private jumpRequested = false;

  private readonly colliders: WorldCollisionRegistry;
  private readonly domElement: HTMLElement;
  private readonly onInteractCallback?: () => void;

  constructor(options: {
    domElement: HTMLElement;
    colliders: WorldCollisionRegistry;
    initialPosition?: { x: number; y: number; z: number };
    onInteract?: () => void;
  }) {
    this.domElement = options.domElement;
    this.colliders = options.colliders;
    this.onInteractCallback = options.onInteract;

    if (options.initialPosition) {
      const startGround = getWalkableSurfaceHeight(
        options.initialPosition.x,
        options.initialPosition.z,
        options.initialPosition.y
      );
      this.position.set(
        options.initialPosition.x,
        Math.max(startGround, options.initialPosition.y),
        options.initialPosition.z
      );
    } else {
      const startY = getWalkableSurfaceHeight(0, 12.0);
      this.position.set(0, startY, 12.0);
    }

    this.smoothCameraPos.set(
      this.position.x,
      this.position.y + 3.2,
      this.position.z + this.cameraDistance
    );
    this.smoothLookTarget.set(this.position.x, this.position.y + 1.4, this.position.z);

    this.bindEvents();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    this.keys.add(code);

    if (code === 'Space') {
      e.preventDefault();
      this.triggerJump();
    } else if (code === 'KeyE') {
      this.onInteractCallback?.();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handlePointerDown = (e: PointerEvent) => {
    // Allow mouse or right-half touch drag to orbit camera cleanly
    if (e.button !== 0 && e.button !== 2) return;
    this.isDraggingCamera = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (document.pointerLockElement === this.domElement) {
      this.cameraYaw -= e.movementX * 0.0042;
      this.cameraPitch = Math.max(
        0.08,
        Math.min(1.08, this.cameraPitch + e.movementY * 0.0035)
      );
      return;
    }

    if (!this.isDraggingCamera) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.cameraYaw -= dx * 0.0055;
    this.cameraPitch = Math.max(0.08, Math.min(1.08, this.cameraPitch + dy * 0.0045));
  };

  private handlePointerUp = () => {
    this.isDraggingCamera = false;
  };

  private handleWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) < 1) return;
    this.cameraDistance = Math.max(
      3.8,
      Math.min(11.5, this.cameraDistance + e.deltaY * 0.005)
    );
  };

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: true });
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('wheel', this.handleWheel);
  }

  public setVirtualInput(input: VirtualMoveInput) {
    this.virtualInput = input;
  }

  public rotateCameraByDelta(dYaw: number, dPitch: number) {
    this.cameraYaw -= dYaw;
    this.cameraPitch = Math.max(0.08, Math.min(1.08, this.cameraPitch + dPitch));
  }

  public triggerJump() {
    if (this.isGrounded) {
      this.jumpRequested = true;
    }
  }

  public teleportTo(x: number, z: number) {
    const y = getWalkableSurfaceHeight(x, z);
    this.position.set(x, y, z);
    this.velocityY = 0;
    this.isGrounded = true;
  }

  public update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    characterRoot: THREE.Object3D
  ): { locomotion: HeroLocomotionState; telemetry: ControllerTelemetry } {
    // 1. Combine Keyboard + Virtual Mobile Joystick Input
    let moveForward = this.virtualInput.y;
    let moveRight = this.virtualInput.x;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveForward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveForward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

    const inputLen = Math.hypot(moveForward, moveRight);
    if (inputLen > 1) {
      moveForward /= inputLen;
      moveRight /= inputLen;
    }

    const isSprinting =
      this.virtualInput.sprint ||
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight');

    const speed = isSprinting ? SPRINT_SPEED : WALK_SPEED;

    // 2. Compute Camera-Relative Horizontal Movement Direction
    // Camera sits at offset (+sin(yaw), +cos(yaw)), so camera forward vector is (-sin(yaw), -cos(yaw))
    const fwdX = -Math.sin(this.cameraYaw);
    const fwdZ = -Math.cos(this.cameraYaw);
    const rightX = Math.cos(this.cameraYaw);
    const rightZ = -Math.sin(this.cameraYaw);

    const worldDirX = fwdX * moveForward + rightX * moveRight;
    const worldDirZ = fwdZ * moveForward + rightZ * moveRight;
    const moveMag = Math.min(1, Math.hypot(worldDirX, worldDirZ));

    if (moveMag > 0.04) {
      const nextX = this.position.x + worldDirX * speed * dt;
      const nextZ = this.position.z + worldDirZ * speed * dt;
      const resolved = this.colliders.resolvePlayerPosition(nextX, nextZ, PLAYER_RADIUS);
      this.position.x = resolved.x;
      this.position.z = resolved.z;

      const targetYaw = Math.atan2(worldDirX, worldDirZ);
      this.characterYaw = lerpAngle(this.characterYaw, targetYaw, Math.min(1, dt * 12));
    }

    // 3. Jump, Gravity & Walkable Surface / Bridge Ground Detection
    if (this.jumpRequested && this.isGrounded) {
      this.velocityY = JUMP_IMPULSE;
      this.isGrounded = false;
      this.jumpRequested = false;
    }

    this.velocityY += GRAVITY * dt;
    this.position.y += this.velocityY * dt;

    const floorY = getWalkableSurfaceHeight(this.position.x, this.position.z, this.position.y);
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.velocityY = 0;
      this.isGrounded = true;
    } else if (this.position.y > floorY + 0.18) {
      this.isGrounded = false;
    }

    // Apply transform to hero 3D root
    characterRoot.position.copy(this.position);
    characterRoot.rotation.y = this.characterYaw;

    // 4. Third-Person Follow Camera with Terrain Collision Handling
    const lookAtTarget = new THREE.Vector3(
      this.position.x,
      this.position.y + 1.48,
      this.position.z
    );

    const horizDist = Math.cos(this.cameraPitch) * this.cameraDistance;
    const vertDist = Math.sin(this.cameraPitch) * this.cameraDistance;

    let desiredCamX = lookAtTarget.x + Math.sin(this.cameraYaw) * horizDist;
    let desiredCamZ = lookAtTarget.z + Math.cos(this.cameraYaw) * horizDist;
    let desiredCamY = lookAtTarget.y + vertDist;

    // Sample terrain along camera ray so camera never clips underneath hillsides or bridge
    for (let s = 1; s <= 4; s++) {
      const frac = s / 4;
      const sx = lookAtTarget.x + (desiredCamX - lookAtTarget.x) * frac;
      const sz = lookAtTarget.z + (desiredCamZ - lookAtTarget.z) * frac;
      const sampleTerrainY = getWalkableSurfaceHeight(sx, sz) + 0.65;
      if (s === 4 && desiredCamY < sampleTerrainY) {
        desiredCamY = sampleTerrainY;
      } else if (s < 4 && desiredCamY < sampleTerrainY - 0.5) {
        desiredCamY = sampleTerrainY;
      }
    }

    const camLerp = Math.min(1, dt * 11);
    this.smoothCameraPos.lerp(
      new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ),
      camLerp
    );
    this.smoothLookTarget.lerp(lookAtTarget, Math.min(1, dt * 14));

    camera.position.copy(this.smoothCameraPos);
    camera.lookAt(this.smoothLookTarget);

    return {
      locomotion: {
        speedRatio: moveMag,
        isSprinting: isSprinting && moveMag > 0.1,
        isGrounded: this.isGrounded,
        verticalVelocity: this.velocityY,
      },
      telemetry: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
        yaw: this.cameraYaw,
        speedRatio: moveMag,
        isSprinting: isSprinting && moveMag > 0.1,
        isGrounded: this.isGrounded,
      },
    };
  }
}
