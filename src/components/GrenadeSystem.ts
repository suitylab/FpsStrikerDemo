import * as THREE from 'three';
import ScreenShake from './ScreenShake';

/**
 * GrenadeSystem — Grenade Throwing & Explosion Effects
 *
 * Handles grenade throwing (G key), projectile physics, and explosion effects:
 * - Player carries 3 grenades, replenished on wave clear (reset to 3)
 * - Thrown with forward velocity (10 m/s) + upward velocity (5 m/s)
 * - Gravity (20 m/s²) pulls grenade in an arc
 * - Bounces off ground once (elasticity 0.4) then rests
 * - Explodes after 2.5s fuse time (or on impact after bounce)
 * - Explosion: particle burst (20 spheres), flash (light + sprite), screen shake, area damage
 * - Object pooling for particles (30 pre-created, reused)
 */

/** Number of grenades the player carries. */
const MAX_GRENADES = 3;
/** Fuse time in seconds. */
const FUSE_TIME = 2.5;
/** Forward throw velocity in m/s. */
const THROW_FORWARD_SPEED = 15.0;
/** Upward throw velocity in m/s. */
const THROW_UPWARD_SPEED = 5.5;
/** Gravity acceleration in m/s². */
const GRAVITY = 20.0;
/** Ground bounce elasticity (0-1). */
const BOUNCE_ELASTICITY = 0.4;
/** Ground collision height (grenade radius). */
const GROUND_Y = 0.08;
/** Explosion radius in meters. */
const EXPLOSION_RADIUS = 5.0;
/** Explosion damage. */
const EXPLOSION_DAMAGE = 100;
/** Particle burst count. */
const PARTICLE_COUNT = 20;
/** Particle lifetime in seconds. */
const PARTICLE_LIFETIME = 0.8;
/** Particle pool size. */
const PARTICLE_POOL_SIZE = 30;
/** Flash duration in seconds. */
const FLASH_DURATION = 0.3;
/** Flash light intensity. */
const FLASH_LIGHT_INTENSITY = 5.0;
/** Flash light radius in meters. */
const FLASH_LIGHT_RADIUS = 10.0;
/** Screen shake trauma on explosion. */
const EXPLOSION_SHAKE_TRAUMA = 0.8;
/** Grenade mesh radius. */
const GRENADE_RADIUS = 0.08;
/** Grenade blink base frequency. */
const BLINK_BASE_FREQUENCY = 2.0;
/** Grenade blink max frequency (as fuse nears end). */
const BLINK_MAX_FREQUENCY = 15.0;

/** Runtime state of a single grenade. */
interface GrenadeInstance {
  /** The 3D mesh representing the grenade. */
  mesh: THREE.Group;
  /** Current position in world space. */
  position: THREE.Vector3;
  /** Current velocity in m/s. */
  velocity: THREE.Vector3;
  /** Remaining fuse time in seconds. */
  fuseTimer: number;
  /** Whether the grenade has bounced off the ground. */
  hasBounced: boolean;
  /** Whether the grenade is currently exploding (prevents double explosion). */
  isExploding: boolean;
  /** Reference to the blinking light on the grenade. */
  blinkLight: THREE.PointLight;
}

/** Runtime state of a single particle. */
interface ParticleInstance {
  /** The 3D mesh representing the particle. */
  mesh: THREE.Mesh;
  /** Current velocity in m/s. */
  velocity: THREE.Vector3;
  /** Remaining lifetime in seconds. */
  life: number;
  /** Maximum lifetime in seconds (for opacity calculation). */
  maxLife: number;
}

/** Runtime state of the explosion flash effect. */
interface FlashInstance {
  /** The point light for the flash. */
  light: THREE.PointLight;
  /** The sprite for the bright flash. */
  sprite: THREE.Sprite;
  /** Remaining flash duration in seconds. */
  timer: number;
}

export default class GrenadeSystem {
  private scene: THREE.Scene;
  private getPlayerPosition: () => THREE.Vector3;
  private getPlayerDirection: () => THREE.Vector3;
  private onExplosion: (position: THREE.Vector3, radius: number) => void;
  private onPlayerDamage: (damage: number) => void;
  private screenShake: ScreenShake | null;

  /** Active grenades in the scene. */
  private grenades: GrenadeInstance[] = [];
  /** Active particles in the scene. */
  private activeParticles: ParticleInstance[] = [];
  /** Pool of reusable particle meshes. */
  private particlePool: THREE.Mesh[] = [];
  /** Active flash effects. */
  private flashes: FlashInstance[] = [];

  /** Current grenade count. */
  private grenadeCount: number = MAX_GRENADES;

  /** Whether the system has been disposed. */
  private disposed = false;

  /**
   * @param scene - The THREE.Scene to add grenade/particle/flash meshes to
   * @param getPlayerPosition - Function returning the player's current position
   * @param getPlayerDirection - Function returning the player's forward direction
   * @param onExplosion - Callback when a grenade explodes (position, radius)
   * @param onPlayerDamage - Callback when the player takes damage from friendly fire
   * @param screenShake - Optional ScreenShake system for explosion shake
   */
  constructor(
    scene: THREE.Scene,
    getPlayerPosition: () => THREE.Vector3,
    getPlayerDirection: () => THREE.Vector3,
    onExplosion: (position: THREE.Vector3, radius: number) => void,
    onPlayerDamage: (damage: number) => void,
    screenShake: ScreenShake | null = null
  ) {
    this.scene = scene;
    this.getPlayerPosition = getPlayerPosition;
    this.getPlayerDirection = getPlayerDirection;
    this.onExplosion = onExplosion;
    this.onPlayerDamage = onPlayerDamage;
    this.screenShake = screenShake;

    // Pre-create the particle pool
    this.initializeParticlePool();
  }

  /**
   * Updates all grenades, particles, and flash effects.
   * Called once per frame.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  public update(deltaTime: number): void {
    if (this.disposed) return;

    // Clamp deltaTime to prevent huge jumps (e.g., when tab is inactive)
    const dt = Math.max(0, Math.min(deltaTime, 0.1));

    // Update grenades
    this.updateGrenades(dt);

    // Update particles
    this.updateParticles(dt);

    // Update flashes
    this.updateFlashes(dt);
  }

  /**
   * Attempts to throw a grenade.
   * Throws if the player has grenades remaining.
   *
   * @returns True if a grenade was thrown, false otherwise
   */
  public tryThrow(): boolean {
    if (this.disposed) return false;
    if (this.grenadeCount <= 0) return false;

    // Decrement grenade count
    this.grenadeCount--;

    // Get player position and direction
    const playerPos = this.getPlayerPosition();
    const playerDir = this.getPlayerDirection();

    // Create grenade mesh
    const grenade = this.createGrenadeMesh();

    // Position at player position (slightly forward to avoid clipping)
    const spawnPos = playerPos.clone().addScaledVector(playerDir, 0.3);
    grenade.mesh.position.copy(spawnPos);

    // Set initial velocity: forward * 10 + up * 5
    const velocity = new THREE.Vector3()
      .copy(playerDir)
      .multiplyScalar(THROW_FORWARD_SPEED);
    velocity.y += THROW_UPWARD_SPEED;

    // Create grenade instance
    const grenadeInstance: GrenadeInstance = {
      mesh: grenade.mesh,
      position: spawnPos.clone(),
      velocity,
      fuseTimer: FUSE_TIME,
      hasBounced: false,
      isExploding: false,
      blinkLight: grenade.blinkLight,
    };

    // Add to scene and active list
    this.scene.add(grenade.mesh);
    this.grenades.push(grenadeInstance);

    return true;
  }

  /**
   * Returns the current grenade count.
   *
   * @returns Number of grenades remaining
   */
  public getGrenadeCount(): number {
    return this.grenadeCount;
  }

  /**
   * Adds the given number of grenades to the player's stock, clamped to MAX.
   *
   * @param count - Number of grenades to add
   */
  public addGrenades(count: number): void {
    if (this.disposed) return;
    this.grenadeCount = Math.min(MAX_GRENADES, this.grenadeCount + count);
  }

  /**
   * Resets the system: clears all grenades, particles, and flashes.
   * Resets grenade count to 3.
   */
  public reset(): void {
    // Remove all grenades
    for (const grenade of this.grenades) {
      this.scene.remove(grenade.mesh);
      this.disposeGrenadeMesh(grenade.mesh);
    }
    this.grenades = [];

    // Remove all active particles and return to pool
    for (const particle of this.activeParticles) {
      this.scene.remove(particle.mesh);
      this.particlePool.push(particle.mesh);
    }
    this.activeParticles = [];

    // Remove all flashes
    for (const flash of this.flashes) {
      this.scene.remove(flash.light);
      this.scene.remove(flash.sprite);
      this.disposeFlash(flash);
    }
    this.flashes = [];

    // Reset grenade count
    this.grenadeCount = MAX_GRENADES;
  }

  /**
   * Disposes of all resources held by the system.
   * Clears all grenades, particles, flashes, and the particle pool.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Reset all active entities
    this.reset();

    // Dispose particle pool
    for (const mesh of this.particlePool) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.particlePool = [];
  }

  // ==========================================================================
  // Private Methods — Grenade Physics & Explosion
  // ==========================================================================

  /**
   * Updates all active grenades: physics, fuse timer, blink, and explosion.
   *
   * @param dt - Clamped delta time in seconds
   */
  private updateGrenades(dt: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const grenade = this.grenades[i];

      // Skip if already exploding (should be removed immediately)
      if (grenade.isExploding) continue;

      // Decrement fuse timer
      grenade.fuseTimer -= dt;

      // Apply gravity
      grenade.velocity.y -= GRAVITY * dt;

      // Integrate position
      grenade.position.x += grenade.velocity.x * dt;
      grenade.position.y += grenade.velocity.y * dt;
      grenade.position.z += grenade.velocity.z * dt;

      // Update mesh position
      grenade.mesh.position.copy(grenade.position);

      // Ground collision
      if (grenade.position.y <= GROUND_Y) {
        grenade.position.y = GROUND_Y;

        if (!grenade.hasBounced) {
          // Bounce: invert vertical velocity with elasticity
          grenade.velocity.y = -grenade.velocity.y * BOUNCE_ELASTICITY;
          grenade.hasBounced = true;

          // If bounce velocity is very low, stop bouncing
          if (Math.abs(grenade.velocity.y) < 0.5) {
            grenade.velocity.y = 0;
          }
        } else {
          // Already bounced, explode on impact
          this.explodeGrenade(i);
          continue;
        }
      }

      // Fuse timer expired
      if (grenade.fuseTimer <= 0) {
        this.explodeGrenade(i);
        continue;
      }

      // Update blink light (frequency increases as fuse nears end)
      this.updateGrenadeBlink(grenade);
    }
  }

  /**
   * Updates the blinking light on a grenade.
   * The blink frequency increases as the fuse timer decreases.
   *
   * @param grenade - The grenade to update
   */
  private updateGrenadeBlink(grenade: GrenadeInstance): void {
    // Calculate blink frequency: base + (max - base) * (1 - fuseTimer / FUSE_TIME)
    const fuseProgress = 1 - (grenade.fuseTimer / FUSE_TIME);
    const frequency = BLINK_BASE_FREQUENCY + (BLINK_MAX_FREQUENCY - BLINK_BASE_FREQUENCY) * fuseProgress;

    // Oscillate intensity between 0 and 1
    const intensity = (Math.sin(grenade.fuseTimer * frequency * Math.PI * 2) + 1) * 0.5;

    // Set light intensity (0.5 to 2.0 range for visibility)
    grenade.blinkLight.intensity = 0.5 + intensity * 1.5;
  }

  /**
   * Triggers the explosion for a grenade at the given index.
   * Creates flash, particles, screen shake, and damage callbacks.
   *
   * @param index - Index of the grenade in the grenades array
   */
  private explodeGrenade(index: number): void {
    const grenade = this.grenades[index];
    if (!grenade || grenade.isExploding) return;

    // Mark as exploding to prevent double explosion
    grenade.isExploding = true;

    // Get explosion position
    const explosionPos = grenade.position.clone();

    // Create flash effect
    this.createFlash(explosionPos);

    // Spawn particles from pool
    this.spawnParticles(explosionPos);

    // Trigger screen shake
    if (this.screenShake) {
      this.screenShake.addTrauma(EXPLOSION_SHAKE_TRAUMA);
    }

    // Trigger explosion callback (for enemy damage)
    if (this.onExplosion) {
      this.onExplosion(explosionPos, EXPLOSION_RADIUS);
    }

    // Calculate player damage with falloff
    const playerPos = this.getPlayerPosition();
    const distanceToPlayer = explosionPos.distanceTo(playerPos);
    if (distanceToPlayer <= EXPLOSION_RADIUS) {
      const falloff = 1 - (distanceToPlayer / EXPLOSION_RADIUS);
      const damage = Math.max(0, EXPLOSION_DAMAGE * falloff);
      if (this.onPlayerDamage) {
        this.onPlayerDamage(damage);
      }
    }

    // Remove grenade from scene and array
    this.scene.remove(grenade.mesh);
    this.disposeGrenadeMesh(grenade.mesh);
    this.grenades.splice(index, 1);
  }

  // ==========================================================================
  // Private Methods — Particles
  // ==========================================================================

  /**
   * Spawns a burst of particles at the given position.
   * Particles fly outward in random directions with random velocities.
   *
   * @param position - The explosion position
   */
  private spawnParticles(position: THREE.Vector3): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Get a particle mesh from the pool
      const mesh = this.getParticleFromPool();
      if (!mesh) continue;

      // Position at explosion center
      mesh.position.copy(position);

      // Random direction (spherical distribution)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 4; // 2-6 m/s

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      // Random particle size (0.05-0.15m)
      const scale = 0.05 + Math.random() * 0.10;
      mesh.scale.setScalar(scale);

      // Random color (orange/yellow tones)
      const color = Math.random() > 0.5 ? 0xff8800 : 0xffaa44;
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;

      // Add to scene and active list
      this.scene.add(mesh);
      this.activeParticles.push({
        mesh,
        velocity,
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
      });
    }
  }

  /**
   * Updates all active particles: physics, gravity, and fading.
   *
   * @param dt - Clamped delta time in seconds
   */
  private updateParticles(dt: number): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];

      // Decrement life
      particle.life -= dt;

      // Remove if life expired
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        this.particlePool.push(particle.mesh);
        this.activeParticles.splice(i, 1);
        continue;
      }

      // Apply gravity (light gravity for particles)
      particle.velocity.y -= GRAVITY * 0.5 * dt;

      // Integrate position
      particle.mesh.position.x += particle.velocity.x * dt;
      particle.mesh.position.y += particle.velocity.y * dt;
      particle.mesh.position.z += particle.velocity.z * dt;

      // Fade opacity based on remaining life
      const opacity = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.9;
    }
  }

  // ==========================================================================
  // Private Methods — Flash Effect
  // ==========================================================================

  /**
   * Creates a flash effect (point light + sprite) at the given position.
   *
   * @param position - The explosion position
   */
  private createFlash(position: THREE.Vector3): void {
    // Create point light
    const light = new THREE.PointLight(0xffaa44, FLASH_LIGHT_INTENSITY, FLASH_LIGHT_RADIUS);
    light.position.copy(position);
    this.scene.add(light);

    // Create flash sprite
    const sprite = this.createFlashSprite();
    sprite.position.copy(position);
    this.scene.add(sprite);

    // Add to active flashes
    this.flashes.push({
      light,
      sprite,
      timer: FLASH_DURATION,
    });
  }

  /**
   * Updates all active flash effects: light decay and sprite fade.
   *
   * @param dt - Clamped delta time in seconds
   */
  private updateFlashes(dt: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i];

      // Decrement timer
      flash.timer -= dt;

      // Remove if timer expired
      if (flash.timer <= 0) {
        this.scene.remove(flash.light);
        this.scene.remove(flash.sprite);
        this.disposeFlash(flash);
        this.flashes.splice(i, 1);
        continue;
      }

      // Decay light intensity
      const intensityFactor = flash.timer / FLASH_DURATION;
      flash.light.intensity = FLASH_LIGHT_INTENSITY * intensityFactor;

      // Fade sprite opacity
      (flash.sprite.material as THREE.SpriteMaterial).opacity = intensityFactor;
    }
  }

  // ==========================================================================
  // Private Methods — Object Pooling & Mesh Creation
  // ==========================================================================

  /**
   * Initializes the particle pool with pre-created meshes.
   */
  private initializeParticlePool(): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 6, 4);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = true;
      this.particlePool.push(mesh);
    }
  }

  /**
   * Gets a particle mesh from the pool.
   * Creates a new one if the pool is empty (shouldn't happen with 30 pool size).
   *
   * @returns A particle mesh, or null if pool is empty and creation fails
   */
  private getParticleFromPool(): THREE.Mesh | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }

    // Pool exhausted (shouldn't happen), create a new one
    const geometry = new THREE.SphereGeometry(0.1, 6, 4);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = true;
    return mesh;
  }

  /**
   * Creates the grenade mesh: dark green sphere with blinking red light.
   *
   * @returns Object with the grenade group and blink light reference
   */
  private createGrenadeMesh(): { mesh: THREE.Group; blinkLight: THREE.PointLight } {
    const group = new THREE.Group();

    // Grenade body (dark green sphere)
    const bodyGeometry = new THREE.SphereGeometry(GRENADE_RADIUS, 12, 10);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      roughness: 0.6,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.frustumCulled = true;
    group.add(body);

    // Blinking red light (small emissive sphere)
    const blinkLight = new THREE.PointLight(0xff0000, 1.0, 0.5);
    blinkLight.position.set(0, 0, 0);
    group.add(blinkLight);

    // Small red emissive sphere for visual
    const lightSphereGeometry = new THREE.SphereGeometry(0.015, 6, 4);
    const lightSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
    lightSphere.position.set(0, 0, 0);
    lightSphere.frustumCulled = true;
    group.add(lightSphere);

    group.frustumCulled = true;

    return { mesh: group, blinkLight };
  }

  /**
   * Creates a flash sprite with a radial gradient texture.
   *
   * @returns THREE.Sprite configured for the explosion flash
   */
  private createFlashSprite(): THREE.Sprite {
    // Create canvas for the flash texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context for flash sprite');
    }

    // Radial gradient: white core → yellow → orange → transparent
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 240, 180, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 200, 80, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 150, 40, 0.4)');
    gradient.addColorStop(0.8, 'rgba(255, 100, 20, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 80, 0, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create sprite material with additive blending
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.0, 3.0, 1);
    sprite.frustumCulled = true;

    return sprite;
  }

  // ==========================================================================
  // Private Methods — Cleanup
  // ==========================================================================

  /**
   * Disposes of all geometries and materials in a grenade mesh group.
   *
   * @param group - The grenade group to dispose
   */
  private disposeGrenadeMesh(group: THREE.Group): void {
    group.traverse((child) => {
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

  /**
   * Disposes of a flash effect's resources.
   *
   * @param flash - The flash to dispose
   */
  private disposeFlash(flash: FlashInstance): void {
    flash.light.dispose();

    if (flash.sprite.material.map) {
      flash.sprite.material.map.dispose();
    }
    flash.sprite.material.dispose();
  }
}