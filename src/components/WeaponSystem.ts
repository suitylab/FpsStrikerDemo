import * as THREE from 'three';
import { InputState } from '../types';
import ScreenShake from './ScreenShake';
import {
  createM9Model,
  createAK47Model,
  createMP5Model,
  createM870Model,
  createAWMModel,
  createM249Model,
  createMuzzleFlashSprite,
  MUZZLE_FLASH_DURATION,
} from './WeaponModels';

/**
 * WeaponSystem — Core Weapon System Module
 *
 * Manages all 6 weapons (M9, AK-47, MP5, M870, AWM, M249) for Phase 5:
 * - Firing (semi-auto and auto) with raycast spread
 * - Shotgun pellet spread (8 rays per shot)
 * - Sniper variable zoom (2x/4x/8x via scroll while ADS)
 * - LMG movement penalty while firing
 * - Aim Down Sights (ADS) with FOV reduction and weapon centering
 * - Reloading with timer and weapon lowering animation
 * - Weapon switching (scroll wheel + number keys 1-6)
 * - Muzzle flash (sprite + point light)
 * - Weapon-specific recoil with varying recovery rates
 * - Dynamic crosshair spread based on movement, firing, and ADS
 * - Weapon bob while moving
 *
 * The system reads input from InputState.keys and applies effects to the camera.
 * It exposes a public API for HUD updates and enemy damage integration.
 */

/** Weapon data definition — static properties of a weapon. */
interface WeaponData {
  /** Display name of the weapon. */
  name: string;
  /** Damage per shot (per pellet for shotgun). */
  damage: number;
  /** Fire rate in rounds per minute. */
  fireRate: number;
  /** Magazine capacity. */
  magSize: number;
    /** Starting reserve ammo. */
  reserve: number;
  /** Maximum reserve ammo capacity. */
  maxReserve: number;
  /** Reload time in seconds. */
  reloadTime: number;
  /** Hip-fire spread (radians). */
  hipSpread: number;
  /** ADS spread (radians). */
  adsSpread: number;
  /** Zoom multiplier when ADS (1 for non-sniper). */
  zoom: number;
  /** Array of zoom levels for sniper (e.g., [2, 4, 8]). */
  zoomLevels: number[];
  /** Whether the weapon is fully automatic. */
  autoFire: boolean;
  /** Recoil kick per shot (radians). */
  recoilKick: number;
  /** Movement speed multiplier while firing. */
  moveModifier: number;
  /** Number of pellets per shot (1 for most, 8 for shotgun). */
  pellets: number;
  /** Hip position relative to camera. */
  hipPosition: THREE.Vector3;
  /** ADS position relative to camera. */
  adsPosition: THREE.Vector3;
    /** Muzzle offset from weapon model origin. */
  muzzleOffset: THREE.Vector3;
  /** Scale factor applied to the weapon model for first-person visibility. */
  modelScale: number;
}

/** Weapon instance — runtime state of a weapon. */
interface WeaponInstance {
  /** Static weapon data. */
  data: WeaponData;
  /** Current magazine ammo. */
  magazine: number;
    /** Current reserve ammo. */
  reserve: number;
  /** Maximum reserve ammo capacity. */
  maxReserve: number;
  /** The 3D model group. */
  model: THREE.Group;
}

/** Default FOV when not aiming. */
const DEFAULT_FOV = 75;
/** ADS lerp speed (per second). */
const ADS_LERP_SPEED = 10;
/** Weapon switch duration in seconds. */
const SWITCH_DURATION = 0.5;
/** HUD callback throttle interval in seconds. */
const HUD_THROTTLE_INTERVAL = 0.1;
/** Base crosshair spread value. */
const BASE_CROSSHAIR_SPREAD = 0.3;
/** Crosshair spread added while firing. */
const FIRING_CROSSHAIR_SPREAD = 0.4;
/** Crosshair spread added while moving. */
const MOVEMENT_CROSSHAIR_SPREAD = 0.3;
/** Crosshair spread reduction when ADS. */
const ADS_CROSSHAIR_REDUCTION = 0.5;
/** Minimum recoil recovery rate (for heavy weapons). */
const MIN_RECOIL_RECOVERY_RATE = 4;
/** Maximum recoil recovery rate (for light weapons). */
const MAX_RECOIL_RECOVERY_RATE = 10;

export default class WeaponSystem {
  private camera: THREE.PerspectiveCamera;
  private inputState: InputState;
  private onStateChange: () => void;
  /** Optional callback fired when the weapon fires (for enemy damage detection). */
  private onFireCallback: ((rayOrigin: THREE.Vector3, rayDirections: THREE.Vector3[]) => void) | null = null;

  /** Array of weapon instances (index 0-5). */
  private weapons: WeaponInstance[] = [];
  /** Index of the active weapon. */
  private activeWeaponIndex = 0;

  /** Reload timer countdown (seconds remaining). */
  private reloadTimer = 0;
  /** Whether the player is currently reloading. */
  private reloading = false;

  /** Weapon switch timer countdown (seconds remaining). */
  private switchTimer = 0;
  /** Whether the player is currently switching weapons. */
  private switching = false;
  /** Target weapon index for an in-progress switch. */
  private pendingSwitchIndex = -1;

  /** ADS amount (0 = hip, 1 = fully aimed). */
  private adsAmount = 0;
  /** Accumulated recoil offset (radians). */
  private recoilOffset = 0;
  /** Fire cooldown timer (seconds remaining). */
  private fireCooldown = 0;
  /** Muzzle flash timer (seconds remaining). */
  private muzzleFlashTimer = 0;
  /** Current crosshair spread (0-1). */
  private crosshairSpread = BASE_CROSSHAIR_SPREAD;

  /** Current zoom level index for sniper (0 = 2x, 1 = 4x, 2 = 8x). */
  private zoomLevelIndex = 0;

  /** Edge detection: whether the left mouse button was pressed last frame. */
  private lastShotFired = false;
  /** Edge detection: whether R was pressed last frame. */
  private lastReloadPressed = false;
  /** Edge detection: whether a number key was pressed last frame. */
  private lastSwitchPressed = false;

  /** Elapsed time accumulator for weapon bob animation. */
  private bobTime = 0;

  /** HUD callback throttle timer. */
  private hudThrottleTimer = 0;

  /** Muzzle flash sprite (child of active weapon model). */
  private muzzleFlashSprite: THREE.Sprite;
  /** Muzzle flash point light (child of active weapon model). */
  private muzzleFlashLight: THREE.PointLight;

  /** Last ray directions fired (for enemy damage hook). */
  private lastRayDirections: THREE.Vector3[] = [];

  /** Bullet tracer line for visual feedback. */
  private tracerLine: THREE.Line;
  /** Tracer visibility timer (seconds remaining). */
  private tracerTimer = 0;
  /** Tracer duration in seconds. */
  private static readonly TRACER_DURATION = 0.06;
  /** Tracer length in meters. */
  private static readonly TRACER_LENGTH = 25;

    /** Whether the system has been disposed. */
  private disposed = false;

  /**
   * Tracks which weapons the player currently owns (unlocked).
   * Index 0 (M9) is owned at start; other weapons are disabled until the
   * matching weapon drop is picked up.
   */
  private owned: boolean[] = [];

  /**
   * Returns whether the weapon at the given index has infinite reserve ammo.
   * The starter weapon (index 0) never runs out of reserve.
   *
   * @param index - Weapon index (0-5)
   * @returns True if the weapon has infinite reserve ammo
   */
  private isInfiniteReserve(index: number): boolean {
    return index === 0;
  }

  /** Screen shake system for firing recoil feedback (nullable). */
  private screenShake: ScreenShake | null = null;

  /**
   * @param camera - The perspective camera to attach weapons to
   * @param inputState - Input state tracking keyboard/mouse
   * @param onStateChange - Callback for HUD updates (weapon, ammo, reload, crosshair)
   * @param onFire - Optional callback fired when the weapon fires (ray directions array)
   * @param screenShake - Optional screen shake system for firing recoil feedback
   */
  constructor(
    camera: THREE.PerspectiveCamera,
    inputState: InputState,
    onStateChange: () => void,
    onFire?: (rayOrigin: THREE.Vector3, rayDirections: THREE.Vector3[]) => void,
    screenShake?: ScreenShake | null
  ) {
    this.camera = camera;
    this.inputState = inputState;
    this.onStateChange = onStateChange;
    this.onFireCallback = onFire ?? null;
    this.screenShake = screenShake ?? null;

    // --- Define weapon data ---
    const m9Data: WeaponData = {
      name: 'M9 PISTOL',
      damage: 25,
      fireRate: 300,
      magSize: 12,
            reserve: 48,
      maxReserve: 48,
      reloadTime: 1.2,
      hipSpread: 0.05,
      adsSpread: 0.01,
      zoom: 1.2,
      zoomLevels: [1],
      autoFire: false,
      recoilKick: 0.015,
      moveModifier: 1.0,
      pellets: 1,
                        hipPosition: new THREE.Vector3(0.22, -0.34, -0.4),
      adsPosition: new THREE.Vector3(0, -0.28, -0.35),
      muzzleOffset: new THREE.Vector3(0, 0.02, -0.7),
      modelScale: 4.0,
    };

    const ak47Data: WeaponData = {
      name: 'AK-47',
      damage: 34,
      fireRate: 600,
      magSize: 30,
            reserve: 120,
      maxReserve: 120,
      reloadTime: 2.5,
      hipSpread: 0.08,
      adsSpread: 0.02,
      zoom: 1.5,
      zoomLevels: [1],
      autoFire: true,
      recoilKick: 0.025,
      moveModifier: 0.9,
      pellets: 1,
                        hipPosition: new THREE.Vector3(0.25, -0.36, -0.5),
      adsPosition: new THREE.Vector3(0, -0.26, -0.45),
      muzzleOffset: new THREE.Vector3(0, 0.02, -1.26),
      modelScale: 3.5,
    };

    const mp5Data: WeaponData = {
      name: 'MP5',
      damage: 18,
      fireRate: 900,
      magSize: 30,
            reserve: 120,
      maxReserve: 120,
      reloadTime: 2.0,
      hipSpread: 0.10,
      adsSpread: 0.03,
      zoom: 1.5,
      zoomLevels: [1],
      autoFire: true,
      recoilKick: 0.012,
      moveModifier: 1.0,
      pellets: 1,
                        hipPosition: new THREE.Vector3(0.23, -0.34, -0.45),
      adsPosition: new THREE.Vector3(0, -0.29, -0.4),
      muzzleOffset: new THREE.Vector3(0, 0.02, -1.05),
      modelScale: 3.5,
    };

    const m870Data: WeaponData = {
      name: 'M870',
      damage: 12,
      fireRate: 60,
      magSize: 6,
            reserve: 24,
      maxReserve: 24,
      reloadTime: 3.0,
      hipSpread: 0.15,
      adsSpread: 0.05,
      zoom: 1.3,
      zoomLevels: [1],
      autoFire: false,
      recoilKick: 0.04,
      moveModifier: 0.85,
      pellets: 8,
                        hipPosition: new THREE.Vector3(0.25, -0.36, -0.5),
      adsPosition: new THREE.Vector3(0, -0.26, -0.45),
      muzzleOffset: new THREE.Vector3(0, 0.02, -1.47),
      modelScale: 3.5,
    };

    const awmData: WeaponData = {
      name: 'AWM',
      damage: 120,
      fireRate: 40,
      magSize: 5,
            reserve: 20,
      maxReserve: 20,
      reloadTime: 3.5,
      hipSpread: 0.02,
      adsSpread: 0.0,
      zoom: 2,
      zoomLevels: [2, 4, 8],
      autoFire: false,
      recoilKick: 0.06,
      moveModifier: 0.7,
      pellets: 1,
                        hipPosition: new THREE.Vector3(0.22, -0.34, -0.5),
      adsPosition: new THREE.Vector3(0, -0.34, -0.45),
      muzzleOffset: new THREE.Vector3(0, 0.02, -1.82),
      modelScale: 3.5,
    };

    const m249Data: WeaponData = {
      name: 'M249',
      damage: 28,
      fireRate: 750,
      magSize: 100,
            reserve: 200,
      maxReserve: 200,
      reloadTime: 5.0,
      hipSpread: 0.12,
      adsSpread: 0.04,
      zoom: 1.5,
      zoomLevels: [1],
      autoFire: true,
      recoilKick: 0.02,
      moveModifier: 0.6,
      pellets: 1,
                        hipPosition: new THREE.Vector3(0.28, -0.38, -0.55),
      adsPosition: new THREE.Vector3(0, -0.28, -0.5),
      muzzleOffset: new THREE.Vector3(0, 0.025, -1.17),
      modelScale: 3.0,
    };

            // --- Create weapon instances (scaled for first-person visibility) ---
    const m9Model = createM9Model();
    m9Model.scale.setScalar(4.0);
    m9Model.frustumCulled = false;
    m9Model.renderOrder = 999;

    const ak47Model = createAK47Model();
    ak47Model.scale.setScalar(3.5);
    ak47Model.frustumCulled = false;
    ak47Model.renderOrder = 999;

    const mp5Model = createMP5Model();
    mp5Model.scale.setScalar(3.5);
    mp5Model.frustumCulled = false;
    mp5Model.renderOrder = 999;

    const m870Model = createM870Model();
    m870Model.scale.setScalar(3.5);
    m870Model.frustumCulled = false;
    m870Model.renderOrder = 999;

    const awmModel = createAWMModel();
    awmModel.scale.setScalar(3.5);
    awmModel.frustumCulled = false;
    awmModel.renderOrder = 999;

    const m249Model = createM249Model();
    m249Model.scale.setScalar(3.0);
    m249Model.frustumCulled = false;
    m249Model.renderOrder = 999;

    this.weapons = [
            { data: m9Data, magazine: m9Data.magSize, reserve: m9Data.reserve, maxReserve: m9Data.maxReserve, model: m9Model },
            { data: ak47Data, magazine: ak47Data.magSize, reserve: ak47Data.reserve, maxReserve: ak47Data.maxReserve, model: ak47Model },
            { data: mp5Data, magazine: mp5Data.magSize, reserve: mp5Data.reserve, maxReserve: mp5Data.maxReserve, model: mp5Model },
            { data: m870Data, magazine: m870Data.magSize, reserve: m870Data.reserve, maxReserve: m870Data.maxReserve, model: m870Model },
            { data: awmData, magazine: awmData.magSize, reserve: awmData.reserve, maxReserve: awmData.maxReserve, model: awmModel },
            { data: m249Data, magazine: m249Data.magSize, reserve: m249Data.reserve, maxReserve: m249Data.maxReserve, model: m249Model },
    ];

    // --- Ownership: only M9 (index 0) is available at start ---
    this.owned = this.weapons.map((_, i) => i === 0);

    // --- Attach models to camera ---
    // M9 is active by default; others are hidden
    for (let i = 0; i < this.weapons.length; i++) {
      const weapon = this.weapons[i];
      weapon.model.position.copy(weapon.data.hipPosition);
      weapon.model.visible = i === this.activeWeaponIndex;
      this.camera.add(weapon.model);
    }

        // --- Create muzzle flash sprite and light ---
    this.muzzleFlashSprite = createMuzzleFlashSprite();
    this.muzzleFlashSprite.frustumCulled = false;
    this.muzzleFlashSprite.renderOrder = 1000;
    this.muzzleFlashLight = new THREE.PointLight(0xffaa44, 3, 3);
    this.muzzleFlashLight.visible = false;

    // --- Create bullet tracer line ---
    const tracerGeometry = new THREE.BufferGeometry();
    const tracerPositions = new Float32Array(6);
    tracerGeometry.setAttribute('position', new THREE.BufferAttribute(tracerPositions, 3));
    const tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.tracerLine = new THREE.Line(tracerGeometry, tracerMaterial);
    this.tracerLine.frustumCulled = false;
    this.tracerLine.visible = false;

    // Attach to the active weapon model
    this.attachMuzzleFlashToActiveWeapon();

    // --- Initial HUD update ---
    this.onStateChange();
  }

  /**
   * Sets the scene for the tracer line to be added to.
   * Must be called after construction.
   *
   * @param scene - The THREE.Scene to add the tracer line to
   */
  public setScene(scene: THREE.Scene): void {
    scene.add(this.tracerLine);
  }

  /**
   * Updates the weapon system each frame.
   *
   * @param deltaTime - Time in seconds since the last frame
   * @param playerSpeed - Current player movement speed in m/s
   */
  public update(deltaTime: number, playerSpeed: number): void {
    if (this.disposed) return;

    // --- Update timers ---
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaTime);
    this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - deltaTime);
    this.tracerTimer = Math.max(0, this.tracerTimer - deltaTime);
    if (this.tracerTimer <= 0) {
      this.tracerLine.visible = false;
    }
    this.hudThrottleTimer = Math.max(0, this.hudThrottleTimer - deltaTime);

    // --- Handle reload timer ---
    if (this.reloading) {
      this.reloadTimer -= deltaTime;
      if (this.reloadTimer <= 0) {
        this.completeReload();
      }
    }

    // --- Handle weapon switch timer ---
    if (this.switching) {
      this.switchTimer -= deltaTime;
      if (this.switchTimer <= 0) {
        this.completeSwitch();
      }
    }

    // --- Handle input (only when pointer is locked) ---
    if (this.inputState.isPointerLocked) {
      this.handleFiring(deltaTime);
      this.handleADS(deltaTime);
      this.handleReload();
      this.handleWeaponSwitch();
      this.handleScroll();
    }

    // --- Update recoil recovery ---
    // Recovery rate varies by weapon weight (heavier = slower recovery)
    const weapon = this.weapons[this.activeWeaponIndex];
    const recoveryRate = THREE.MathUtils.lerp(
      MIN_RECOIL_RECOVERY_RATE,
      MAX_RECOIL_RECOVERY_RATE,
      1 - (weapon.data.recoilKick / 0.06) // Normalize recoil to [0, 1]
    );
    this.recoilOffset *= Math.exp(-recoveryRate * deltaTime);
    if (Math.abs(this.recoilOffset) < 0.0001) {
      this.recoilOffset = 0;
    }

    // --- Apply recoil to camera pitch ---
    this.camera.rotation.x += this.recoilOffset;

    // --- Update ADS FOV ---
    const targetFov = this.getTargetFOV();
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    // --- Update weapon model position (ADS lerp + bob + reload/switch offsets) ---
    this.updateWeaponModelPosition(deltaTime, playerSpeed);

    // --- Update muzzle flash visibility ---
    this.updateMuzzleFlash();

    // --- Update crosshair spread ---
    this.updateCrosshairSpread(deltaTime, playerSpeed);

    // --- Throttled HUD callback ---
    if (this.hudThrottleTimer <= 0) {
      this.onStateChange();
      this.hudThrottleTimer = HUD_THROTTLE_INTERVAL;
    }
  }

  /**
   * Returns the display name of the active weapon.
   *
   * @returns Weapon name string (e.g., 'M9 PISTOL')
   */
  public getActiveWeaponName(): string {
    return this.weapons[this.activeWeaponIndex].data.name;
  }

  /**
   * Returns the damage of the active weapon.
   *
   * @returns Damage per shot (per pellet for shotgun) of the active weapon
   */
  public getActiveWeaponDamage(): number {
    return this.weapons[this.activeWeaponIndex].data.damage;
  }

  /**
   * Returns the current ammo state of the active weapon.
   *
   * @returns Object with magazine and reserve ammo counts
   */
  public getAmmo(): { magazine: number; reserve: number } {
    const weapon = this.weapons[this.activeWeaponIndex];
    return { magazine: weapon.magazine, reserve: weapon.reserve };
  }

  /**
   * Returns whether the player is currently reloading.
   *
   * @returns True if reloading
   */
  public getReloading(): boolean {
    return this.reloading;
  }

  /**
   * Returns the reload progress (0 to 1).
   * 0 = just started, 1 = complete.
   *
   * @returns Reload progress value
   */
  public getReloadProgress(): number {
    if (!this.reloading) return 0;
    const weapon = this.weapons[this.activeWeaponIndex];
    return 1 - (this.reloadTimer / weapon.data.reloadTime);
  }

  /**
   * Returns the current crosshair spread (0 to 1).
   * 0 = tight (ADS), 1 = wide (firing/moving).
   *
   * @returns Crosshair spread value
   */
  public getCrosshairSpread(): number {
    return this.crosshairSpread;
  }

  /**
   * Returns whether the player is currently aiming down sights.
   *
   * @returns True if ADS is active
   */
  public getIsADS(): boolean {
    return this.adsAmount > 0.5;
  }

  /**
   * Returns the current zoom level (1 for non-sniper).
   *
   * @returns Current zoom level
   */
  public getZoomLevel(): number {
    const weapon = this.weapons[this.activeWeaponIndex];
    return weapon.data.zoomLevels[this.zoomLevelIndex] || 1;
  }

  /**
   * Returns the maximum zoom level (1 for non-sniper, 8 for AWM).
   *
   * @returns Maximum zoom level
   */
  public getMaxZoomLevel(): number {
    const weapon = this.weapons[this.activeWeaponIndex];
    return weapon.data.zoomLevels[weapon.data.zoomLevels.length - 1] || 1;
  }

  /**
   * Returns the current movement speed modifier.
   * 1.0 normally, weapon.moveModifier while firing.
   *
   * @returns Movement speed modifier
   */
  public getMovementModifier(): number {
    const weapon = this.weapons[this.activeWeaponIndex];
    if (this.fireCooldown > 0) {
      return weapon.data.moveModifier;
    }
    return 1.0;
  }

  /**
   * Returns the index of the active weapon.
   *
   * @returns Active weapon index (0-5)
   */
  public getWeaponIndex(): number {
    return this.activeWeaponIndex;
  }

  /**
   * Returns the total number of weapons.
   *
   * @returns Weapon count (6)
   */
  public getWeaponCount(): number {
    return this.weapons.length;
  }

  /**
   * Returns the name of the weapon at the given index.
   *
   * @param index - Weapon index (0-5)
   * @returns Weapon name string
   */
  public getWeaponName(index: number): string {
    if (index < 0 || index >= this.weapons.length) return '';
    return this.weapons[index].data.name;
  }

  /**
   * Returns the ammo state of the weapon at the given index.
   *
   * @param index - Weapon index (0-5)
   * @returns Object with magazine and reserve ammo counts
   */
  public getWeaponAmmo(index: number): { magazine: number; reserve: number } {
    if (index < 0 || index >= this.weapons.length) {
      return { magazine: 0, reserve: 0 };
    }
        const weapon = this.weapons[index];
    return { magazine: weapon.magazine, reserve: weapon.reserve };
  }

  /**
   * Returns an array of all weapon display names.
   *
   * @returns Array of weapon name strings
   */
  public getWeaponNames(): string[] {
    return this.weapons.map((w) => w.data.name);
  }

  /**
   * Returns whether the player owns (has unlocked) a weapon with the given name.
   * Comparison is case-insensitive.
   *
   * @param name - Weapon name to check
   * @returns True if the weapon is owned
   */
  public hasWeapon(name: string): boolean {
    const lowerName = name.toLowerCase();
    const index = this.weapons.findIndex((w) => w.data.name.toLowerCase() === lowerName);
    return index >= 0 && this.owned[index];
  }

  /**
   * Returns whether the player owns the weapon at the given index.
   *
   * @param index - Weapon index (0 = M9)
   * @returns True if the weapon is owned/unlocked
   */
  public isWeaponOwned(index: number): boolean {
    if (index < 0 || index >= this.owned.length) return false;
    return this.owned[index];
  }

  /**
   * Returns whether the currently active weapon has infinite reserve ammo.
   *
   * @returns True if the active weapon never runs out of reserve ammo
   */
  public isActiveWeaponInfiniteReserve(): boolean {
    return this.isInfiniteReserve(this.activeWeaponIndex);
  }

  /**
   * Returns an array of owned flags for all weapons (index-aligned).
   *
   * @returns Array of booleans (true = owned/unlocked)
   */
  public getOwnedWeapons(): boolean[] {
    return this.owned.slice();
  }

  /**
   * Returns the names of weapons the player does NOT yet own.
   * Used to spawn weapon drops that unlock new weapons.
   *
   * @returns Array of unowned weapon name strings
   */
  public getUnownedWeaponNames(): string[] {
    return this.weapons.filter((_, i) => !this.owned[i]).map((w) => w.data.name);
  }

  /**
   * Unlocks a weapon by name so the player can switch to it. Returns whether
   * the weapon is now available. If it was already owned, the weapon's ammo is
   * refilled to full instead (per pickup rules).
   *
   * @param name - Weapon name to unlock
   * @returns Newly owned (true) or already owned and ammo refilled (false)
   */
  public addWeaponToInventory(name: string): boolean {
    const lowerName = name.toLowerCase();
    const index = this.weapons.findIndex((w) => w.data.name.toLowerCase() === lowerName);
    if (index < 0) return false;

    if (this.owned[index]) {
      // Already owned — refill this weapon's ammo to max.
      this.refillWeaponAmmo(index);
      this.onStateChange();
      return false;
    }

    // Unlock the weapon.
    this.owned[index] = true;
    this.onStateChange();
    return true;
  }

  /**
   * Activates (switches to) a weapon by name so it becomes the equipped weapon.
   * Does nothing if the weapon is not owned, or if a switch is already in progress.
   *
   * @param name - Weapon name to equip
   */
  public activateWeapon(name: string): void {
    const lowerName = name.toLowerCase();
    const index = this.weapons.findIndex((w) => w.data.name.toLowerCase() === lowerName);
    if (index < 0 || !this.isWeaponOwned(index)) return;
    if (index === this.activeWeaponIndex || this.switching) return;
    this.startSwitch(index);
  }

  /**
   * Refills a weapon's magazine and reserve ammo to their maximum values.
   *
   * @param index - Weapon index (0-5)
   */
  private refillWeaponAmmo(index: number): void {
    const weapon = this.weapons[index];
    if (!weapon) return;
    weapon.magazine = weapon.data.magSize;
    weapon.reserve = weapon.data.maxReserve;
  }

  /**
   * Adds a percentage of each owned weapon's max reserve ammo to its reserve pool.
   * The percentage is clamped to [0, 1]. Each weapon's reserve is clamped
   * to its maxReserve value. Locked (unowned) weapons are unaffected.
   *
   * @param percentage - Fraction of max reserve to add (0 to 1)
   */
  public addAmmoToAllWeapons(percentage: number): void {
    // Clamp percentage to [0, 1]
    const clampedPercentage = Math.max(0, Math.min(1, percentage));

    // Add ammo to each owned weapon
    for (let i = 0; i < this.weapons.length; i++) {
      if (!this.owned[i]) continue;
      const weapon = this.weapons[i];
      // The infinite-reserve starter weapon stays full; do not clamp oddly.
      if (this.isInfiniteReserve(i)) {
        weapon.reserve = weapon.data.maxReserve;
        continue;
      }
      const ammoToAdd = Math.floor(weapon.data.maxReserve * clampedPercentage);
      weapon.reserve = Math.min(weapon.data.maxReserve, weapon.reserve + ammoToAdd);
    }

    this.onStateChange();
  }

  /**
   * Refills the active weapon's magazine from its reserve ammo, so picking up
   * an ammo crate gives immediate visible feedback on the loaded magazine.
   * No-op if the magazine is already full or there is no reserve left.
   */
  public reloadActiveFromReserve(): void {
    const weapon = this.weapons[this.activeWeaponIndex];
    if (!weapon) return;

    // Infinite-reserve weapon: fill the magazine without consuming reserve.
    if (this.isInfiniteReserve(this.activeWeaponIndex)) {
      weapon.magazine = weapon.data.magSize;
      weapon.reserve = weapon.data.maxReserve;
      this.onStateChange();
      return;
    }

    const needed = weapon.data.magSize - weapon.magazine;
    if (needed <= 0 || weapon.reserve <= 0) return;
    const transfer = Math.min(needed, weapon.reserve);
    weapon.magazine += transfer;
    weapon.reserve -= transfer;
    this.onStateChange();
  }

  /**
   * Returns the current magazine ammo of the active weapon.
   *
   * @returns Current magazine ammo count
   */
  public getActiveWeaponMagazine(): number {
    return this.weapons[this.activeWeaponIndex].magazine;
  }

  /**
   * Returns the last ray directions fired (for enemy damage hook).
   *
   * @returns Array of ray direction vectors
   */
  public getLastRayDirections(): THREE.Vector3[] {
    return this.lastRayDirections.map((dir) => dir.clone());
  }

  /**
   * Returns the camera's world position (for ray origin in enemy damage detection).
   *
   * @returns A new Vector3 containing the camera's world position
   */
  public getCameraWorldPosition(): THREE.Vector3 {
    return this.camera.getWorldPosition(new THREE.Vector3());
  }

  /**
   * Returns the muzzle position in world space.
   * Useful for tracer effects or muzzle flash positioning.
   *
   * @returns A copy of the muzzle world position
   */
  public getMuzzleWorldPosition(): THREE.Vector3 {
    const weapon = this.weapons[this.activeWeaponIndex];
    const muzzleLocal = weapon.data.muzzleOffset.clone();
    weapon.model.localToWorld(muzzleLocal);
    return muzzleLocal;
  }

  /**
   * Returns the tracer line object (for debugging).
   */
  public getTracerLine(): THREE.Line {
    return this.tracerLine;
  }

  /**
   * Resets the weapon system in place (used on game restart).
   * Restores all weapons to full ammo, resets ownership to M9 only,
   * switches to index 0, and clears reload/ADS/switch state.
   *
   * This keeps the same instance referenced by other systems (e.g. LootSystem)
   * so pickups continue to affect the live weapon state.
   */
  public reset(): void {
    if (this.disposed) return;

    // Restore ownership: only M9 (index 0) available at start.
    this.owned = this.weapons.map((_, i) => i === 0);

    // Reset ammo to full and model scale for all weapons.
    for (let i = 0; i < this.weapons.length; i++) {
      const weapon = this.weapons[i];
      weapon.magazine = weapon.data.magSize;
      weapon.reserve = weapon.data.maxReserve;
      weapon.model.scale.setScalar(weapon.data.modelScale);
      weapon.model.visible = i === 0;
    }

    // Reset active weapon, animation and input state.
    this.activeWeaponIndex = 0;
    this.pendingSwitchIndex = -1;
    this.switching = false;
    this.switchTimer = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.adsAmount = 0;
    this.zoomLevelIndex = 0;
    this.recoilOffset = 0;
    this.camera.rotation.x = 0;

    // Attach muzzle flash to the (new) active weapon so it stays aligned.
    this.attachMuzzleFlashToActiveWeapon();

    this.onStateChange();
  }

  /**
   * Disposes of all resources held by the weapon system.
   * Removes weapon models and muzzle flash from the camera.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Remove weapon models from camera
    for (const weapon of this.weapons) {
      this.camera.remove(weapon.model);

      // Dispose geometries and materials
      weapon.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // Remove muzzle flash
    this.camera.remove(this.muzzleFlashSprite);
    this.camera.remove(this.muzzleFlashLight);

    // Dispose muzzle flash resources
    if (this.muzzleFlashSprite.material.map) {
      this.muzzleFlashSprite.material.map.dispose();
    }
    this.muzzleFlashSprite.material.dispose();
    this.muzzleFlashLight.dispose();

    // Dispose tracer line
    if (this.tracerLine.parent) {
      this.tracerLine.parent.remove(this.tracerLine);
    }
    this.tracerLine.geometry.dispose();
    (this.tracerLine.material as THREE.Material).dispose();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Handles firing input (left mouse button).
   * Semi-auto requires edge detection; auto fires while held.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  private handleFiring(deltaTime: number): void {
    const weapon = this.weapons[this.activeWeaponIndex];
    const leftMouseDown = this.inputState.keys['Mouse0'] === true;

    // Edge detection for semi-auto
    const shouldFire = weapon.data.autoFire
      ? leftMouseDown
      : leftMouseDown && !this.lastShotFired;

    // Update last shot state for next frame
    this.lastShotFired = leftMouseDown;

    // Check if we can fire
    const canFire =
      shouldFire &&
      !this.reloading &&
      !this.switching &&
      this.fireCooldown <= 0 &&
      weapon.magazine > 0 &&
      this.inputState.isPointerLocked;

    if (canFire) {
      this.fireWeapon();
    }
  }

  /**
   * Fires the active weapon: consumes ammo, applies recoil,
   * triggers muzzle flash, casts rays with spread.
   */
  private fireWeapon(): void {
    const weapon = this.weapons[this.activeWeaponIndex];

    // Consume ammo
    weapon.magazine--;

    // Set fire cooldown based on fire rate (RPM → seconds per shot)
    this.fireCooldown = 60 / weapon.data.fireRate;

    // Apply recoil (pitch kick)
    this.recoilOffset += weapon.data.recoilKick;

    // Trigger muzzle flash
    this.muzzleFlashTimer = MUZZLE_FLASH_DURATION;
    this.muzzleFlashSprite.visible = true;
    this.muzzleFlashLight.visible = true;

        // Make muzzle flash bigger for shotgun and scale with weapon model
    const flashScale = weapon.data.modelScale || 1;
    if (weapon.data.pellets > 1) {
      this.muzzleFlashSprite.scale.set(0.25 * flashScale, 0.25 * flashScale, 1);
    } else {
      this.muzzleFlashSprite.scale.set(0.15 * flashScale, 0.15 * flashScale, 1);
    }

    // Cast rays with spread
    this.castRaysWithSpread();

    // Fire callback for enemy damage detection
    if (this.onFireCallback) {
      this.onFireCallback(this.getCameraWorldPosition(), this.lastRayDirections);
    }

        // Trigger bullet tracer
    this.triggerTracer();

    // Trigger small screen shake for firing feedback
    if (this.screenShake) {
      this.screenShake.addTrauma(0.15);
    }

    // Spike crosshair spread
    this.crosshairSpread = Math.min(1, this.crosshairSpread + FIRING_CROSSHAIR_SPREAD);

    // Immediate HUD update (ammo changed)
    this.onStateChange();
  }

  /**
   * Casts rays from the camera center with random spread.
   * For shotgun, generates 8 rays in a cone pattern.
   * Stores the directions for enemy damage hook.
   */
  private castRaysWithSpread(): void {
    const weapon = this.weapons[this.activeWeaponIndex];

    // Get camera forward direction
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    // Determine spread based on ADS state
    const spread = THREE.MathUtils.lerp(
      weapon.data.hipSpread,
      weapon.data.adsSpread,
      this.adsAmount
    );

    // Create perpendicular basis vectors
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    // Clear previous ray directions
    this.lastRayDirections = [];

    // Generate ray directions
    const numPellets = weapon.data.pellets;
    for (let i = 0; i < numPellets; i++) {
      // Generate random perpendicular offsets for a cone spread
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread;

      // Apply spread offset
      const spreadOffset = new THREE.Vector3()
        .addScaledVector(right, Math.cos(angle) * radius)
        .addScaledVector(actualUp, Math.sin(angle) * radius);

      // Final ray direction
      const rayDir = forward.clone().add(spreadOffset).normalize();
      this.lastRayDirections.push(rayDir);
    }
  }

  /**
   * Triggers the bullet tracer effect.
   * Positions the tracer line from the muzzle along the first ray direction.
   */
  private triggerTracer(): void {
    if (this.lastRayDirections.length === 0) return;

    // Get muzzle world position
    const muzzleWorld = this.getMuzzleWorldPosition();

    // Get the first ray direction
    const rayDir = this.lastRayDirections[0];

    // Set tracer line endpoints: from muzzle to muzzle + direction * length
    const positions = this.tracerLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
    positions.setXYZ(
      1,
      muzzleWorld.x + rayDir.x * WeaponSystem.TRACER_LENGTH,
      muzzleWorld.y + rayDir.y * WeaponSystem.TRACER_LENGTH,
      muzzleWorld.z + rayDir.z * WeaponSystem.TRACER_LENGTH
    );
    positions.needsUpdate = true;

    // Show the tracer
    this.tracerLine.visible = true;
    this.tracerTimer = WeaponSystem.TRACER_DURATION;
  }

  /**
   * Handles ADS input (right mouse button hold).
   * Lerps adsAmount toward 1 (held) or 0 (released).
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  private handleADS(deltaTime: number): void {
    const rightMouseDown = this.inputState.keys['Mouse2'] === true;

    // Can't ADS while reloading or switching
    const canADS = rightMouseDown && !this.reloading && !this.switching;

    // Lerp toward target
    const target = canADS ? 1 : 0;
    const lerpSpeed = ADS_LERP_SPEED * deltaTime;
    this.adsAmount = THREE.MathUtils.lerp(this.adsAmount, target, lerpSpeed);

    // Clamp to avoid floating point drift
    if (Math.abs(this.adsAmount - target) < 0.001) {
      this.adsAmount = target;
    }

    // Reset zoom level index when not ADS
    if (!canADS && this.adsAmount < 0.5) {
      this.zoomLevelIndex = 0;
    }
  }

  /**
   * Handles reload input (R key press, edge detection).
   */
  private handleReload(): void {
    const reloadPressed = this.inputState.keys['KeyR'] === true;

    // Edge detection
    if (reloadPressed && !this.lastReloadPressed) {
      const weapon = this.weapons[this.activeWeaponIndex];

      // Can reload if: not already reloading, not switching, magazine not full,
      // and (reserve > 0 OR this weapon has infinite reserve)
      if (
        !this.reloading &&
        !this.switching &&
        weapon.magazine < weapon.data.magSize &&
        (this.isInfiniteReserve(this.activeWeaponIndex) || weapon.reserve > 0)
      ) {
        this.startReload();
      }
    }

    this.lastReloadPressed = reloadPressed;
  }

  /**
   * Starts a reload: sets timer, lowers weapon model.
   */
  private startReload(): void {
    const weapon = this.weapons[this.activeWeaponIndex];
    this.reloading = true;
    this.reloadTimer = weapon.data.reloadTime;

    // Immediate HUD update
    this.onStateChange();
  }

  /**
   * Completes the reload: transfers ammo from reserve to magazine.
   */
  private completeReload(): void {
    const weapon = this.weapons[this.activeWeaponIndex];

    // The starter weapon (index 0) has infinite reserve ammo — its magazine
    // always refills to full without consuming any reserve.
    if (this.isInfiniteReserve(this.activeWeaponIndex)) {
      weapon.magazine = weapon.data.magSize;
      weapon.reserve = weapon.data.maxReserve;
      this.reloading = false;
      this.reloadTimer = 0;
      this.onStateChange();
      return;
    }

    // Calculate how much ammo to transfer
    const needed = weapon.data.magSize - weapon.magazine;
    const transfer = Math.min(needed, weapon.reserve);

    weapon.magazine += transfer;
    weapon.reserve -= transfer;

    this.reloading = false;
    this.reloadTimer = 0;

    // Immediate HUD update
    this.onStateChange();
  }

  /**
   * Handles weapon switching (number keys 1-6, edge detection).
   */
  private handleWeaponSwitch(): void {
    // Check all 6 number keys
    const keyPressed: boolean[] = [];
    for (let i = 1; i <= 6; i++) {
      keyPressed.push(this.inputState.keys[`Digit${i}`] === true);
    }

    const switchPressed = keyPressed.some((pressed) => pressed);

    // Edge detection
    if (switchPressed && !this.lastSwitchPressed) {
      // Determine target index
      let targetIndex = -1;
      for (let i = 0; i < keyPressed.length; i++) {
        if (keyPressed[i]) {
          targetIndex = i;
          break;
        }
      }

      // Can switch if: not already switching, target is different AND owned
      if (
        targetIndex >= 0 &&
        targetIndex !== this.activeWeaponIndex &&
        !this.switching &&
        this.isWeaponOwned(targetIndex)
      ) {
        this.startSwitch(targetIndex);
      }
    }

    this.lastSwitchPressed = switchPressed;
  }

  /**
   * Handles scroll wheel input.
   * If ADS with AWM, cycles zoom levels.
   * Otherwise, cycles weapons.
   */
  private handleScroll(): void {
    const wheelDelta = this.inputState.wheelDelta;
    if (wheelDelta === 0) return;

    // Reset wheel delta for next frame
    this.inputState.wheelDelta = 0;

    // If ADS with AWM, cycle zoom levels
    if (this.getIsADS() && this.weapons[this.activeWeaponIndex].data.zoomLevels.length > 1) {
      const numLevels = this.weapons[this.activeWeaponIndex].data.zoomLevels.length;
      if (wheelDelta > 0) {
        // Scroll up: increase zoom
        this.zoomLevelIndex = Math.min(numLevels - 1, this.zoomLevelIndex + 1);
      } else {
        // Scroll down: decrease zoom
        this.zoomLevelIndex = Math.max(0, this.zoomLevelIndex - 1);
      }
      return;
    }

    // Otherwise, cycle weapons (skip locked ones)
    if (!this.switching) {
      // Find the next/prev index that navigates only over owned weapons.
      const step = wheelDelta > 0 ? 1 : -1;
      for (let offset = 1; offset <= this.weapons.length; offset++) {
        const candidate = (this.activeWeaponIndex + offset * step + this.weapons.length) % this.weapons.length;
        if (this.isWeaponOwned(candidate)) {
          if (candidate !== this.activeWeaponIndex) {
            this.startSwitch(candidate);
          }
          break;
        }
      }
    }
  }

  /**
   * Starts a weapon switch: sets timer, scales down current weapon.
   *
   * @param targetIndex - Index of the weapon to switch to
   */
  private startSwitch(targetIndex: number): void {
    // Interrupt reload if in progress
    if (this.reloading) {
      this.reloading = false;
      this.reloadTimer = 0;
    }

    this.switching = true;
    this.switchTimer = SWITCH_DURATION;
    this.pendingSwitchIndex = targetIndex;

        // Scale down current weapon during switch (preserve model scale factor)
    const currentWeapon = this.weapons[this.activeWeaponIndex];
    currentWeapon.model.scale.setScalar(currentWeapon.data.modelScale * 0.8);

    // Immediate HUD update
    this.onStateChange();
  }

  /**
   * Completes the weapon switch: swaps active weapon, shows new model.
   */
  private completeSwitch(): void {
        // Hide current weapon (restore model scale factor)
    const currentWeapon = this.weapons[this.activeWeaponIndex];
    currentWeapon.model.visible = false;
    currentWeapon.model.scale.setScalar(currentWeapon.data.modelScale);

    // Set new active weapon
    this.activeWeaponIndex = this.pendingSwitchIndex;
    this.pendingSwitchIndex = -1;

    // Show new weapon (restore model scale factor)
    const newWeapon = this.weapons[this.activeWeaponIndex];
    newWeapon.model.visible = true;
    newWeapon.model.scale.setScalar(newWeapon.data.modelScale);

    // Reset ADS and zoom when switching
    this.adsAmount = 0;
    this.zoomLevelIndex = 0;

    // Re-attach muzzle flash to new weapon
    this.attachMuzzleFlashToActiveWeapon();

    this.switching = false;
    this.switchTimer = 0;

    // Immediate HUD update
    this.onStateChange();
  }

  /**
   * Updates the weapon model position each frame:
   * - ADS lerp between hip and ADS positions
   * - Weapon bob while moving
   * - Reload lowering offset
   * - Switch scale animation
   *
   * @param deltaTime - Time in seconds since the last frame
   * @param playerSpeed - Current player movement speed in m/s
   */
  private updateWeaponModelPosition(deltaTime: number, playerSpeed: number): void {
    const weapon = this.weapons[this.activeWeaponIndex];

    // Sniper scope: hide the solid 3D model while aiming so the transparent
    // scope overlay provides the view (otherwise the lens blocks the target).
    const isSniper = weapon.data.zoomLevels.length > 1;
    weapon.model.visible = !(isSniper && this.adsAmount > 0.5);

    // --- ADS position lerp ---
    const targetPosition = new THREE.Vector3().lerpVectors(
      weapon.data.hipPosition,
      weapon.data.adsPosition,
      this.adsAmount
    );

    // --- Weapon bob ---
    // Only bob when moving and not ADS
    if (playerSpeed > 0.1 && this.adsAmount < 0.5) {
      this.bobTime += deltaTime * playerSpeed * 2;

      // Subtle bob: small vertical and horizontal oscillation
      const bobAmplitude = 0.01;
      targetPosition.y += Math.sin(this.bobTime * 2) * bobAmplitude;
      targetPosition.x += Math.cos(this.bobTime * 1.5) * bobAmplitude * 0.5;
    }

    // --- Reload lowering ---
    if (this.reloading) {
      targetPosition.y -= 0.15;
    }

    // --- Apply position ---
    weapon.model.position.copy(targetPosition);

    // --- Weapon rotation ---
    // Slight rotation when ADS to align with center
    const targetRotationX = this.adsAmount * 0.05;
    weapon.model.rotation.x = THREE.MathUtils.lerp(
      weapon.model.rotation.x,
      targetRotationX,
      ADS_LERP_SPEED * deltaTime
    );

        // --- Switch scale animation (preserve model scale factor) ---
    if (this.switching) {
      // Scale down then back up
      const progress = 1 - (this.switchTimer / SWITCH_DURATION);
      const scale = weapon.data.modelScale * (0.8 + 0.2 * progress);
      weapon.model.scale.setScalar(scale);
    }
  }

    /**
   * Updates the muzzle flash visibility and position.
   * Smoothly fades the sprite opacity and light intensity based on
   * the remaining flash timer for a natural decay effect.
   */
  private updateMuzzleFlash(): void {
    if (this.muzzleFlashTimer <= 0) {
      this.muzzleFlashSprite.visible = false;
      this.muzzleFlashLight.visible = false;
      return;
    }

    // Position at the weapon muzzle
    const weapon = this.weapons[this.activeWeaponIndex];
    this.muzzleFlashSprite.position.copy(weapon.data.muzzleOffset);
    this.muzzleFlashLight.position.copy(weapon.data.muzzleOffset);

    // Calculate fade factor (1.0 at start, 0.0 at end)
    const fadeFactor = this.muzzleFlashTimer / MUZZLE_FLASH_DURATION;

    // Smoothly fade sprite opacity
    const spriteMaterial = this.muzzleFlashSprite.material as THREE.SpriteMaterial;
    spriteMaterial.opacity = Math.max(0, Math.min(1, fadeFactor));

    // Smoothly fade light intensity
    this.muzzleFlashLight.intensity = Math.max(0, Math.min(1, fadeFactor)) * 3;
  }

  /**
   * Updates the crosshair spread based on movement, firing, and ADS.
   *
   * @param deltaTime - Time in seconds since the last frame
   * @param playerSpeed - Current player movement speed in m/s
   */
  private updateCrosshairSpread(deltaTime: number, playerSpeed: number): void {
    // Start with base spread
    let target = BASE_CROSSHAIR_SPREAD;

    // Add movement spread
    if (playerSpeed > 0.1) {
      target += MOVEMENT_CROSSHAIR_SPREAD;
    }

    // Add firing spread (decays over time)
    if (this.fireCooldown > 0) {
      const weapon = this.weapons[this.activeWeaponIndex];
      target += FIRING_CROSSHAIR_SPREAD * (this.fireCooldown / (60 / weapon.data.fireRate));
    }

    // Reduce when ADS
    if (this.adsAmount > 0) {
      target -= ADS_CROSSHAIR_REDUCTION * this.adsAmount;
    }

    // Clamp to [0, 1]
    target = Math.max(0, Math.min(1, target));

    // Smoothly interpolate toward target
    const lerpSpeed = 5 * deltaTime;
    this.crosshairSpread = THREE.MathUtils.lerp(this.crosshairSpread, target, lerpSpeed);

    // Clamp to avoid drift
    if (Math.abs(this.crosshairSpread - target) < 0.001) {
      this.crosshairSpread = target;
    }
  }

  /**
   * Calculates the target FOV based on ADS state and weapon zoom.
   *
   * @returns Target FOV value
   */
  private getTargetFOV(): number {
    const weapon = this.weapons[this.activeWeaponIndex];

    // If not ADS, use default FOV
    if (this.adsAmount <= 0) {
      return DEFAULT_FOV;
    }

    // Get zoom level (use current zoom level for AWM)
    const zoomLevel = this.getZoomLevel();

    // Target FOV = DEFAULT_FOV / zoomLevel
    return DEFAULT_FOV / zoomLevel;
  }

  /**
   * Attaches the muzzle flash sprite and light to the active weapon model.
   */
  private attachMuzzleFlashToActiveWeapon(): void {
    // Remove from current parent if any
    if (this.muzzleFlashSprite.parent) {
      this.muzzleFlashSprite.parent.remove(this.muzzleFlashSprite);
    }
    if (this.muzzleFlashLight.parent) {
      this.muzzleFlashLight.parent.remove(this.muzzleFlashLight);
    }

        // Add to active weapon model
    const weapon = this.weapons[this.activeWeaponIndex];
    weapon.model.add(this.muzzleFlashSprite);
    weapon.model.add(this.muzzleFlashLight);

    // Position at muzzle
    this.muzzleFlashSprite.position.copy(weapon.data.muzzleOffset);
    this.muzzleFlashLight.position.copy(weapon.data.muzzleOffset);

    // Scale the muzzle flash to match the weapon model scale
    const flashScale = weapon.data.modelScale || 1;
    this.muzzleFlashSprite.scale.set(0.15 * flashScale, 0.15 * flashScale, 1);
  }
}