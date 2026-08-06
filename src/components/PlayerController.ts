import * as THREE from 'three';
import { PlayerState, InputState } from '../types';
import CollisionManager from './CollisionManager';
import ScreenShake from './ScreenShake';

/**
 * PlayerController — First-Person Camera & Movement Controller (Phase 11)
 *
 * Handles:
 * - Pointer lock mouse look (yaw/pitch)
 * - WASD movement relative to camera direction (walk 5 m/s, sprint 8 m/s)
 * - Sprint (Shift key): FOV widens to 82, cannot sprint while ADS or shooting
 * - Jump (Space key): vertical impulse with gravity (20 m/s²)
 * - Screen shake integration (camera position + rotation offsets)
 * - Weapon bob (sinusoidal camera position offset based on movement speed)
 * - AABB collision against the map's CollisionManager
 *
 * The controller updates the camera transform each frame, applying bob and
 * screen shake offsets on top of the base player position and orientation.
 */

/** Walk speed in meters per second. */
const WALK_SPEED = 5.0;
/** Sprint speed in meters per second. */
const SPRINT_SPEED = 8.0;
/** Player radius (half-width) in meters. */
const PLAYER_RADIUS = 0.3;
/** Eye height (camera height above ground) in meters. */
const EYE_HEIGHT = 1.7;
/** Gravity acceleration in m/s². */
const GRAVITY = 20.0;
/** Jump impulse velocity in m/s. */
const JUMP_VELOCITY = 7.5;
/** Maximum height the player can step/climb onto while walking (meters). */
const STEP_HEIGHT = 0.5;
/** Maximum height the player can land on top of from a jump (meters). */
const MAX_LANDING_HEIGHT = 1.5;
/** Default FOV (walking). */
const DEFAULT_FOV = 75;
/** Sprint FOV (widened). */
const SPRINT_FOV = 82;
/** FOV lerp speed per second. */
const FOV_LERP_SPEED = 8.0;
/** Weapon bob walking amplitude in meters. */
const BOB_WALK_AMPLITUDE = 0.02;
/** Weapon bob sprinting amplitude in meters. */
const BOB_SPRINT_AMPLITUDE = 0.05;
/** Weapon bob frequency scale (radians per meter). */
const BOB_FREQUENCY_SCALE = 2.0;
/** Weapon bob reduction factor when ADS (0 = no bob, 1 = full bob). */
const BOB_ADS_REDUCTION = 0.3;

export default class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private playerState: PlayerState;
  private inputState: InputState;
  private collisionManager: CollisionManager;
  private screenShake: ScreenShake | null;

  /** Vertical velocity (m/s, positive = up). */
  private verticalVelocity: number = 0;
  /** Whether the player is currently grounded (y <= eyeHeight). */
  private grounded: boolean = true;
  /** Whether the player is currently sprinting. */
  private isSprinting: boolean = false;
  /** Accumulator for weapon bob animation. */
  private bobTime: number = 0;
  /** Current weapon bob phase (radians). */
  private bobPhase: number = 0;
  /** Current horizontal player speed (m/s). */
  private playerSpeed: number = 0;

  /** Edge detection for Space key (jump). */
  private lastSpacePressed: boolean = false;

  // Bound event handlers (stored for cleanup in dispose)
  private onClickBound: () => void;
  private onPointerLockChangeBound: () => void;
  private onMouseMoveBound: (event: MouseEvent) => void;
  private onMouseDownBound: (event: MouseEvent) => void;
  private onMouseUpBound: (event: MouseEvent) => void;
  private onKeyDownBound: (event: KeyboardEvent) => void;
  private onKeyUpBound: (event: KeyboardEvent) => void;
  private onWheelBound: (event: WheelEvent) => void;

  /**
   * @param camera - The perspective camera to control
   * @param domElement - The element to click for pointer lock
   * @param playerState - Player position/orientation state
   * @param inputState - Input tracking state
   * @param collisionManager - Collision manager for AABB collision resolution
   * @param screenShake - Optional screen shake system (nullable for backward compatibility)
   */
  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    playerState: PlayerState,
    inputState: InputState,
    collisionManager: CollisionManager,
    screenShake: ScreenShake | null = null
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.playerState = playerState;
    this.inputState = inputState;
    this.collisionManager = collisionManager;
    this.screenShake = screenShake;

    // Bind handlers once so they can be removed in dispose()
    this.onClickBound = this.onClick.bind(this);
    this.onPointerLockChangeBound = this.onPointerLockChange.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);

    // Pointer lock setup
    this.domElement.addEventListener('click', this.onClickBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);

    // Mouse look (only active when pointer is locked)
    document.addEventListener('mousemove', this.onMouseMoveBound);

    // Mouse buttons (shoot, ADS)
    document.addEventListener('mousedown', this.onMouseDownBound);
    document.addEventListener('mouseup', this.onMouseUpBound);

    // Keyboard input for WASD movement and weapon controls
    document.addEventListener('keydown', this.onKeyDownBound);
    document.addEventListener('keyup', this.onKeyUpBound);

    // Scroll wheel for weapon switching and sniper zoom
    this.domElement.addEventListener('wheel', this.onWheelBound, { passive: true });
  }

  /**
   * Request pointer lock when the dom element is clicked.
   */
  private onClick(): void {
    this.domElement.requestPointerLock();
  }

  /**
   * Update the pointer lock state in inputState.
   */
  private onPointerLockChange(): void {
    this.inputState.isPointerLocked = document.pointerLockElement === this.domElement;

    // Reset mouse deltas when pointer lock is lost to prevent jump on re-lock
    if (!this.inputState.isPointerLocked) {
      this.inputState.mouseDeltaX = 0;
      this.inputState.mouseDeltaY = 0;
    }
  }

  /**
   * Accumulate mouse movement deltas when pointer is locked.
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.inputState.isPointerLocked) return;

    this.inputState.mouseDeltaX += event.movementX;
    this.inputState.mouseDeltaY += event.movementY;
  }

  /**
   * Track mouse button presses (left-click = Mouse0, right-click = Mouse2).
   */
  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.inputState.keys['Mouse0'] = true;
    } else if (event.button === 2) {
      this.inputState.keys['Mouse2'] = true;
    }
  }

  /**
   * Track mouse button releases (left-click = Mouse0, right-click = Mouse2).
   */
  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.inputState.keys['Mouse0'] = false;
    } else if (event.button === 2) {
      this.inputState.keys['Mouse2'] = false;
    }
  }

  /**
   * Track keyboard input for movement and weapon controls.
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (
      event.code === 'KeyW' || event.code === 'KeyA' ||
      event.code === 'KeyS' || event.code === 'KeyD' ||
      event.code === 'KeyE' || event.code === 'KeyR' ||
      event.code === 'KeyG' ||
      event.code === 'ShiftLeft' || event.code === 'ShiftRight' ||
      event.code === 'Space' || event.code === 'Escape' ||
      event.code === 'Digit1' || event.code === 'Digit2' ||
      event.code === 'Digit3' || event.code === 'Digit4' ||
      event.code === 'Digit5' || event.code === 'Digit6'
    ) {
      this.inputState.keys[event.code] = true;
    }
  }

  /**
   * Track keyboard input releases.
   */
  private onKeyUp(event: KeyboardEvent): void {
    if (
      event.code === 'KeyW' || event.code === 'KeyA' ||
      event.code === 'KeyS' || event.code === 'KeyD' ||
      event.code === 'KeyE' || event.code === 'KeyR' ||
      event.code === 'KeyG' ||
      event.code === 'ShiftLeft' || event.code === 'ShiftRight' ||
      event.code === 'Space' || event.code === 'Escape' ||
      event.code === 'Digit1' || event.code === 'Digit2' ||
      event.code === 'Digit3' || event.code === 'Digit4' ||
      event.code === 'Digit5' || event.code === 'Digit6'
    ) {
      this.inputState.keys[event.code] = false;
    }
  }

  /**
   * Accumulate scroll wheel movement for weapon switching and sniper zoom.
   * Only captured when pointer is locked to prevent accidental switching.
   */
  private onWheel(event: WheelEvent): void {
    if (!this.inputState.isPointerLocked) return;

    this.inputState.wheelDelta += event.deltaY;
  }

  /**
   * Update the player's orientation and position based on input.
   * Called once per frame with the delta time since the last frame.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  public update(deltaTime: number): void {
    // Clamp deltaTime to prevent huge jumps (e.g., when tab is inactive)
    const dt = Math.min(Math.max(deltaTime, 0), 0.1);

    // --- Mouse Look ---
    // Apply accumulated mouse deltas to yaw/pitch
    this.playerState.yaw -= this.inputState.mouseDeltaX * this.inputState.sensitivity;
    this.playerState.pitch -= this.inputState.mouseDeltaY * this.inputState.sensitivity;

    // Clamp pitch to ±89 degrees to prevent gimbal lock
    const maxPitch = (Math.PI / 2) * 0.99;
    this.playerState.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.playerState.pitch));

    // Reset deltas after applying
    this.inputState.mouseDeltaX = 0;
    this.inputState.mouseDeltaY = 0;

    // --- Sprint State ---
    // Cannot sprint while ADS (Mouse2), shooting (Mouse0), or jumping (airborne)
    const shiftPressed = this.inputState.keys['ShiftLeft'] === true || this.inputState.keys['ShiftRight'] === true;
    const isADS = this.inputState.keys['Mouse2'] === true;
    const isShooting = this.inputState.keys['Mouse0'] === true;
    this.isSprinting = shiftPressed && !isADS && !isShooting && this.grounded;

    // --- Jump (Space key edge detection) ---
    const spacePressed = this.inputState.keys['Space'] === true;
    if (spacePressed && !this.lastSpacePressed) {
      // Cannot jump while sprinting
      if (this.grounded && !this.isSprinting) {
        this.verticalVelocity = JUMP_VELOCITY;
        this.grounded = false;
      }
    }
    this.lastSpacePressed = spacePressed;

    // --- Vertical Movement (Gravity) ---
    if (!this.grounded) {
      // Apply gravity
      this.verticalVelocity -= GRAVITY * dt;

      // Integrate vertical position (feet are at position.y - EYE_HEIGHT above ground)
      const newFeetY = this.playerState.position.y - EYE_HEIGHT + this.verticalVelocity * dt;

      // Determine the surface the player will land on at the current XZ location
      const landingHeight = this.collisionManager.getStandingHeight(
        this.playerState.position.x,
        this.playerState.position.z,
        PLAYER_RADIUS,
        MAX_LANDING_HEIGHT
      );

      // Check landing: if feet fall to (or below) the reachable standing height
      if (this.verticalVelocity <= 0 && newFeetY <= landingHeight) {
        this.playerState.position.y = landingHeight + EYE_HEIGHT;
        this.verticalVelocity = 0;
        this.grounded = true;
      } else {
        this.playerState.position.y = newFeetY + EYE_HEIGHT;
      }
    } else {
      // When grounded, snap to the highest reachable surface underfoot so the
      // player rests on top of steps/platforms rather than sinking to y=0.
      const groundHeight = this.collisionManager.getStandingHeight(
        this.playerState.position.x,
        this.playerState.position.z,
        PLAYER_RADIUS,
        MAX_LANDING_HEIGHT
      );
      this.playerState.position.y = groundHeight + EYE_HEIGHT;
      this.verticalVelocity = 0;
    }

    // --- WASD Movement ---
    const yaw = this.playerState.yaw;

    // Forward vector (THREE.js uses -Z as forward)
    // forward = (-sin(yaw), 0, -cos(yaw))
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);

    // Right vector = (cos(yaw), 0, -sin(yaw))
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    // Movement input: W=+1 forward, S=-1 forward, D=+1 right, A=-1 right
    const moveForward = (this.inputState.keys['KeyW'] ? 1 : 0) - (this.inputState.keys['KeyS'] ? 1 : 0);
    const moveRight = (this.inputState.keys['KeyD'] ? 1 : 0) - (this.inputState.keys['KeyA'] ? 1 : 0);

    // Build movement vector
    let moveX = forwardX * moveForward + rightX * moveRight;
    let moveZ = forwardZ * moveForward + rightZ * moveRight;

    // Normalize to prevent faster diagonal movement
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    // Determine movement speed (walk or sprint)
    const speed = this.isSprinting ? SPRINT_SPEED : WALK_SPEED;

    // Compute desired movement deltas
    const deltaX = moveX * speed * dt;
    const deltaZ = moveZ * speed * dt;

    // --- Collision-Aware Movement ---
    // Resolve movement against all colliders and map boundaries.
    // Obstacles below STEP_HEIGHT relative to the player's feet can be climbed
    // over; taller ones block horizontal movement.
    const feetY = this.playerState.position.y - EYE_HEIGHT;
    const resolved = this.collisionManager.resolveMovement(
      this.playerState.position,
      PLAYER_RADIUS,
      deltaX,
      deltaZ,
      feetY,
      STEP_HEIGHT
    );

    // Apply resolved position
    this.playerState.position.x = resolved.x;
    this.playerState.position.z = resolved.z;

    // --- Calculate Player Speed (horizontal) ---
    // Use actual movement deltas for speed calculation (for weapon bob/crosshair)
    const actualDeltaX = resolved.x - this.playerState.position.x;
    const actualDeltaZ = resolved.z - this.playerState.position.z;
    this.playerSpeed = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaZ * actualDeltaZ) / dt;

    // --- Weapon Bob ---
    // Advance bob time based on movement speed
    if (this.playerSpeed > 0.1) {
      this.bobTime += dt * this.playerSpeed * BOB_FREQUENCY_SCALE;
    }

    // Calculate bob amplitude (walk vs sprint)
    const bobAmplitude = this.isSprinting ? BOB_SPRINT_AMPLITUDE : BOB_WALK_AMPLITUDE;

    // Reduce bob when ADS (right mouse button held)
    const adsReduction = isADS ? BOB_ADS_REDUCTION : 1.0;

    // Calculate bob offsets (sinusoidal)
    const bobOffsetX = Math.cos(this.bobTime) * bobAmplitude * adsReduction;
    const bobOffsetY = Math.sin(this.bobTime * 2) * bobAmplitude * 0.5 * adsReduction;

    // --- Screen Shake ---
    // Update screen shake system
    if (this.screenShake) {
      this.screenShake.update(dt);
    }

    // Get screen shake offsets
    const shakePosition = new THREE.Vector3();
    const shakeRotation = new THREE.Vector3();
    if (this.screenShake) {
      this.screenShake.getOffset(shakePosition, shakeRotation);
    }

    // --- Sync Camera ---
    // Position: player position + bob offset + screen shake offset
    this.camera.position.set(
      this.playerState.position.x + bobOffsetX + shakePosition.x,
      this.playerState.position.y + bobOffsetY + shakePosition.y,
      this.playerState.position.z + shakePosition.z
    );

    // Rotation: yaw/pitch + screen shake rotation offset
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerState.yaw + shakeRotation.y;
    this.camera.rotation.x = this.playerState.pitch + shakeRotation.x;
    this.camera.rotation.z = shakeRotation.z;

    // --- FOV Handling ---
    // Only apply sprint FOV when not ADS (WeaponSystem handles ADS FOV)
    if (!isADS) {
      const targetFov = this.isSprinting ? SPRINT_FOV : DEFAULT_FOV;
      // Lerp toward target FOV
      const lerpFactor = Math.min(1, FOV_LERP_SPEED * dt);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, lerpFactor);
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Returns whether the player is currently sprinting.
   *
   * @returns True if sprinting
   */
  public getIsSprinting(): boolean {
    return this.isSprinting;
  }

  /**
   * Returns the current horizontal player speed in m/s.
   * Used for weapon bob, crosshair spread, and other movement-based effects.
   *
   * @returns Horizontal speed in m/s
   */
  public getPlayerSpeed(): number {
    return this.playerSpeed;
  }

  /**
   * Returns the current vertical velocity in m/s.
   * Positive = moving up, negative = moving down.
   *
   * @returns Vertical velocity in m/s
   */
  public getVerticalVelocity(): number {
    return this.verticalVelocity;
  }

  /**
   * Adds trauma to the screen shake system.
   * Delegates to the ScreenShake instance if present.
   * No-op if screen shake is not configured.
   *
   * @param amount - Amount of trauma to add (0-1)
   */
  public addScreenShake(amount: number): void {
    if (this.screenShake) {
      this.screenShake.addTrauma(amount);
    }
  }

  /**
   * Remove all event listeners to prevent memory leaks.
   * Call this when the game is being torn down.
   */
  public dispose(): void {
    this.domElement.removeEventListener('click', this.onClickBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('mousedown', this.onMouseDownBound);
    document.removeEventListener('mouseup', this.onMouseUpBound);
    document.removeEventListener('keydown', this.onKeyDownBound);
    document.removeEventListener('keyup', this.onKeyUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);

    // Reset input state
    this.inputState.keys = {};
    this.inputState.mouseDeltaX = 0;
    this.inputState.mouseDeltaY = 0;
    this.inputState.wheelDelta = 0;
  }
}