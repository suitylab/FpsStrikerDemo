import * as THREE from 'three';
import WeaponSystem from './WeaponSystem';
import HUD from './HUD';
import { InputState } from '../types';

/**
 * LootSystem — Weapon, Ammo & Medkit Drop System (Phase 8)
 *
 * Handles weapon, ammo, and medkit drops from enemy kills:
 * - 25% drop chance on enemy death
 * - ~15% medkit / ~51% ammo crate / ~34% weapon drop
 * - Floating glowing crates with bob/rotation animation
 * - E key pickup with distance detection (2m)
 * - Pickups persist indefinitely (no despawn timer)
 * - Weapon pickup: unlocks a weapon not yet owned (adds to inventory);
 *   if already owned, refills that weapon's ammo to full
 * - Ammo pickup: restores 40% reserve ammo to all owned weapons
 * - Medkit pickup: restores 30 health to the player
 */

/** Pickup type identifier. */
type PickupType = 'ammo' | 'weapon' | 'medkit';

/** Runtime state of a single pickup entity. */
interface PickupInstance {
  /** Pickup type: ammo crate or weapon drop. */
  type: PickupType;
  /** Weapon name (only for weapon drops). */
  weaponName: string;
  /** The 3D group containing the box and glow sprite. */
  group: THREE.Group;
  /** The box mesh (for material opacity control during fade). */
  boxMesh: THREE.Mesh;
  /** The glow sprite (for material opacity control during fade). */
  glowSprite: THREE.Sprite;
  /** Base Y position (ground level) for bobbing animation. */
  baseY: number;
  /** Age of the pickup in seconds. */
  age: number;
  /** Whether the pickup is being collected (scale-up animation). */
  isBeingCollected: boolean;
  /** Collection animation timer. */
  collectTimer: number;
  /** Whether the player is currently in pickup range. */
  isInRange: boolean;
}

/** Configuration constants. */
const DROP_CHANCE = 0.25; // 25% drop chance on enemy kill
const AMMO_DROP_CHANCE = 0.60; // 60% ammo, 40% weapon
const MEDKIT_DROP_CHANCE = 0.15; // 15% chance a drop is a medkit instead
const MEDKIT_HEAL_AMOUNT = 30; // Health restored per medkit
const AMMO_GRENADE_RESTORE = 2; // Grenades restored per ammo pickup
const PICKUP_RADIUS = 2.0; // Meters
const COLLECT_DURATION = 0.2; // Seconds (scale-up animation)
const BOB_AMPLITUDE = 0.15; // Meters
const BOB_SPEED = 2.0; // Radians per second
const ROTATION_SPEED = 1.5; // Radians per second
const BOX_SIZE = 0.4; // Meters
const GLOW_SCALE = 1.2; // Sprite scale relative to box

export default class LootSystem {
  private scene: THREE.Scene;
  private getPlayerPosition: () => THREE.Vector3;
  private weaponSystem: WeaponSystem;
  private hud: HUD;
  private inputState: InputState;
  /** Callback to heal the player when a medkit is picked up. */
  private onHealPlayer: (amount: number) => void;
  /** Callback to add grenades when an ammo pickup is collected. */
  private onAddGrenades: (count: number) => void;

  /** All active pickups. */
  private pickups: PickupInstance[] = [];

  /** Edge detection for E key. */
  private lastEState = false;

  /** Whether the system has been disposed. */
  private disposed = false;

  /**
   * @param scene - The THREE.Scene to add pickups to
   * @param getPlayerPosition - Function returning the player's current position
   * @param weaponSystem - The WeaponSystem for ammo/inventory operations
   * @param hud - The HUD for pickup prompts
   * @param inputState - The shared input state for E key detection
   * @param onHealPlayer - Callback to heal the player when a medkit is picked up
   * @param onAddGrenades - Callback to add grenades when an ammo pickup is collected
   */
  constructor(
    scene: THREE.Scene,
    getPlayerPosition: () => THREE.Vector3,
    weaponSystem: WeaponSystem,
    hud: HUD,
    inputState: InputState,
    onHealPlayer: (amount: number) => void,
    onAddGrenades: (count: number) => void
  ) {
    this.scene = scene;
    this.getPlayerPosition = getPlayerPosition;
    this.weaponSystem = weaponSystem;
    this.hud = hud;
    this.inputState = inputState;
    this.onHealPlayer = onHealPlayer;
    this.onAddGrenades = onAddGrenades;
  }

  /**
   * Called when an enemy dies. Rolls the drop chance and spawns a pickup.
   *
   * @param position - The world position where the enemy died
   */
  public onEnemyKilled(position: THREE.Vector3): void {
    if (this.disposed) return;

    // Roll drop chance
    if (Math.random() > DROP_CHANCE) return;

    // Determine drop type: ~15% medkit, otherwise 60% ammo / 40% weapon
    if (Math.random() < MEDKIT_DROP_CHANCE) {
      this.spawnMedkitPickup(position);
      return;
    }

    const isAmmo = Math.random() < AMMO_DROP_CHANCE;

    if (isAmmo) {
      this.spawnAmmoPickup(position);
    } else {
      this.spawnWeaponPickup(position);
    }
  }

  /**
   * Updates all pickups each frame.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  public update(deltaTime: number): void {
    if (this.disposed) return;

    const playerPos = this.getPlayerPosition();

    // Track whether any pickup is in range (for prompt management)
    let anyInRange = false;
    let inRangeText = '';

    // Update all pickups (iterate backwards for safe removal)
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];

      // Increment age
      pickup.age += deltaTime;

      // Handle collection animation
      if (pickup.isBeingCollected) {
        pickup.collectTimer += deltaTime;
        const progress = Math.min(1, pickup.collectTimer / COLLECT_DURATION);

        // Scale up
        const scale = 1 + progress * 0.5;
        pickup.group.scale.set(scale, scale, scale);

        // Fade out during collection
        const opacity = 1 - progress;
        this.setPickupOpacity(pickup, opacity);

        // Remove when animation completes
        if (progress >= 1) {
          this.removePickup(i);
        }
        continue;
      }

      // Floating bob animation
      pickup.group.position.y = pickup.baseY + Math.sin(pickup.age * BOB_SPEED) * BOB_AMPLITUDE;

      // Rotation animation
      pickup.group.rotation.y += ROTATION_SPEED * deltaTime;

      // Distance check for pickup range
      const distance = playerPos.distanceTo(pickup.group.position);
      pickup.isInRange = distance < PICKUP_RADIUS;

      if (pickup.isInRange) {
        anyInRange = true;
        inRangeText = pickup.type === 'ammo'
          ? 'PRESS E TO PICK UP AMMO'
          : pickup.type === 'medkit'
            ? 'PRESS E TO PICK UP MEDKIT'
            : `PRESS E TO PICK UP ${pickup.weaponName}`;
      }
    }

    // Handle pickup prompt visibility
    if (anyInRange) {
      this.hud.showPickupPrompt(inRangeText);
    } else {
      this.hud.hidePickupPrompt();
    }

    // Handle E key pickup (edge detection)
    const ePressed = this.inputState.keys['KeyE'] === true;
    if (ePressed && !this.lastEState) {
      // Find the nearest pickup in range
      let nearestPickup: PickupInstance | null = null;
      let nearestDistance = Infinity;

      for (const pickup of this.pickups) {
        if (pickup.isInRange && !pickup.isBeingCollected) {
          const distance = playerPos.distanceTo(pickup.group.position);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPickup = pickup;
          }
        }
      }

      if (nearestPickup) {
        this.collectPickup(nearestPickup);
      }
    }
    this.lastEState = ePressed;
  }

  /**
   * Removes all pickups from the scene and resets state.
   */
  public reset(): void {
    // Remove all pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      this.removePickup(i);
    }

    // Reset edge detection
    this.lastEState = false;

    // Hide pickup prompt
    this.hud.hidePickupPrompt();
  }

  /**
   * Disposes of all resources held by the system.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.reset();
  }

  // ==========================================================================
  // Private Methods — Spawning
  // ==========================================================================

  /**
   * Spawns an ammo crate pickup at the given position.
   *
   * @param position - World position to spawn at
   */
  private spawnAmmoPickup(position: THREE.Vector3): void {
    const pickup = this.createPickup('ammo', '', position, 0x00ff88);
    this.pickups.push(pickup);
  }

  /**
   * Spawns a medkit pickup at the given position.
   *
   * @param position - World position to spawn at
   */
  private spawnMedkitPickup(position: THREE.Vector3): void {
    const pickup = this.createPickup('medkit', '', position, 0xff4466);
    this.pickups.push(pickup);
  }

  /**
   * Spawns a weapon drop pickup at the given position.
   * Randomly selects a weapon from the WeaponSystem's weapon names.
   *
   * @param position - World position to spawn at
   */
  private spawnWeaponPickup(position: THREE.Vector3): void {
    // Only drop weapons the player has not yet unlocked, so pickups grant new guns.
    const weaponNames = this.weaponSystem.getUnownedWeaponNames();
    if (weaponNames.length === 0) return;

    // Randomly select a weapon
    const weaponName = weaponNames[Math.floor(Math.random() * weaponNames.length)];

    const pickup = this.createPickup('weapon', weaponName, position, 0x4488ff);
    this.pickups.push(pickup);
  }

  /**
   * Creates a pickup entity with box mesh and glow sprite.
   *
   * @param type - Pickup type ('ammo' or 'weapon')
   * @param weaponName - Weapon name (empty for ammo)
   * @param position - World position to spawn at
   * @param glowColor - Color for the glow sprite (hex)
   * @returns The created pickup instance
   */
  private createPickup(
    type: PickupType,
    weaponName: string,
    position: THREE.Vector3,
    glowColor: number
  ): PickupInstance {
    // Create group
    const group = new THREE.Group();

    // Create box mesh (0.4m)
    const boxGeometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const boxColor = type === 'ammo' ? 0x00cc66 : type === 'medkit' ? 0xcc3355 : 0x2266cc;
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: boxColor,
      emissive: glowColor,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 1.0,
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);

    // Create glow sprite (canvas-generated radial gradient)
    const glowSprite = this.createGlowSprite(glowColor);
    group.add(glowSprite);

    // Create an identifying label above the pickup (letter/symbol per type)
    const label = this.createLabel(type, weaponName, glowColor);
    group.add(label);

    // Position the group at the kill location, slightly above ground
    const baseY = position.y + 0.5;
    group.position.set(position.x, baseY, position.z);

    // Add to scene
    this.scene.add(group);

    // Create pickup instance
    return {
      type,
      weaponName,
      group,
      boxMesh,
      glowSprite,
      baseY,
      age: 0,
      isBeingCollected: false,
      collectTimer: 0,
      isInRange: false,
    };
  }

  /**
   * Creates a glow sprite using a canvas-generated radial gradient texture.
   *
   * @param color - Hex color for the glow
   * @returns THREE.Sprite with additive blending
   */
  private createGlowSprite(color: number): THREE.Sprite {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;

    // Draw radial gradient
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Convert hex to RGB components
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;

      // Create radial gradient (bright center, transparent edges)
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
      gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.2)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);

    // Create sprite material with additive blending
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
    });

    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(BOX_SIZE * GLOW_SCALE, BOX_SIZE * GLOW_SCALE, 1);
    sprite.position.y = 0;

    return sprite;
  }

  /**
   * Creates a text label sprite displayed above a pickup to help identify it.
   * - ammo: 'A' (green)
   * - medkit: '+' (red)
   * - weapon: weapon initial, e.g. 'A', 'M', 'A', 'M' (blue)
   *
   * @param type - Pickup type
   * @param weaponName - Weapon name (empty for ammo/medkit)
   * @param color - Hex color for the label text
   * @returns THREE.Sprite with transparent canvas text
   */
  private createLabel(type: PickupType, weaponName: string, color: number): THREE.Sprite {
    // Determine the symbol to draw.
    let symbol = '?';
    if (type === 'ammo') {
      symbol = 'A';
    } else if (type === 'medkit') {
      symbol = '+';
    } else {
      // Use the first letter of the weapon name (uppercase).
      const trimmed = weaponName.trim();
      symbol = trimmed.length > 0 ? trimmed[0].toUpperCase() : 'W';
    }

    // Create a canvas and draw the symbol.
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;

      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.font = 'bold 96px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, 64, 64);
    }

    // Create sprite material (no additive blending so text is crisp).
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Position the label above the box and make it face the camera.
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1);
    sprite.position.y = 0.55;
    sprite.renderOrder = 1001;
    return sprite;
  }

  // ==========================================================================
  // Private Methods — Collection & Removal
  // ==========================================================================

  /**
   * Collects a pickup (E key pressed while in range).
   *
   * @param pickup - The pickup to collect
   */
  private collectPickup(pickup: PickupInstance): void {
    // Handle based on type
    if (pickup.type === 'medkit') {
      // Heal the player
      this.onHealPlayer(MEDKIT_HEAL_AMOUNT);
      this.startCollection(pickup);
    } else if (pickup.type === 'ammo') {
      // Add 40% reserve ammo to all owned weapons, visually top up the
      // active weapon's magazine, and restore a grenade.
      this.weaponSystem.addAmmoToAllWeapons(0.40);
      this.weaponSystem.reloadActiveFromReserve();
      this.onAddGrenades(AMMO_GRENADE_RESTORE);
      this.startCollection(pickup);
    } else {
      // Weapon pickup: addWeaponToInventory unlocks the weapon if unowned,
      // and refills its ammo to full if already owned.
      const newlyOwned = this.weaponSystem.addWeaponToInventory(pickup.weaponName);
      // Immediately equip newly unlocked weapons so they become active.
      if (newlyOwned) {
        this.weaponSystem.activateWeapon(pickup.weaponName);
      }
      this.startCollection(pickup);
    }
  }

  /**
   * Starts the collection animation (scale-up then remove).
   *
   * @param pickup - The pickup to collect
   */
  private startCollection(pickup: PickupInstance): void {
    pickup.isBeingCollected = true;
    pickup.collectTimer = 0;

    // Hide the pickup prompt
    this.hud.hidePickupPrompt();
  }

  /**
   * Removes a pickup from the scene and disposes its resources.
   *
   * @param index - Index of the pickup in the pickups array
   */
  private removePickup(index: number): void {
    const pickup = this.pickups[index];
    if (!pickup) return;

    // Remove from scene
    this.scene.remove(pickup.group);

    // Dispose all geometries, materials and textures under the group
    // (box, glow sprite, and label sprite).
    pickup.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if (mat instanceof THREE.Material) {
            const map = (mat as THREE.MeshStandardMaterial).map;
            if (map) map.dispose();
            mat.dispose();
          }
        }
      } else if (child instanceof THREE.Sprite) {
        if (child.material.map) {
          child.material.map.dispose();
        }
        child.material.dispose();
      }
    });

    // Remove from array
    this.pickups.splice(index, 1);
  }

  /**
   * Sets the opacity of all materials in a pickup.
   *
   * @param pickup - The pickup to modify
   * @param opacity - Opacity value (0-1)
   */
  private setPickupOpacity(pickup: PickupInstance, opacity: number): void {
    // Clamp opacity
    const clamped = Math.max(0, Math.min(1, opacity));

    // Set box material opacity
    const boxMaterial = pickup.boxMesh.material as THREE.MeshStandardMaterial;
    boxMaterial.opacity = clamped;

    // Set glow sprite opacity
    const spriteMaterial = pickup.glowSprite.material as THREE.SpriteMaterial;
    spriteMaterial.opacity = clamped * 0.9;

    // Fade the label sprite too (it sits above the box, scales up with group).
    pickup.group.children.forEach((child) => {
      if (child instanceof THREE.Sprite && child !== pickup.glowSprite) {
        (child.material as THREE.SpriteMaterial).opacity = clamped;
      }
    });
  }
}