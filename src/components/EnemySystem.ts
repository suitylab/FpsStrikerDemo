import * as THREE from 'three';
import { createEnemyModel } from './EnemyModels';
import CollisionManager, { AABB } from './CollisionManager';

/**
 * EnemySystem — Core Enemy AI Module (Phase 6)
 *
 * Manages enemy data definitions, spawning, AI behavior, health/damage,
 * and death animations for all 6 enemy types:
 * - Grunt: Advances, stops at 10m, fires single shots, strafes
 * - Rusher: Charges with zigzag, melee within 2m
 * - Shooter: Takes cover, peeks, fires 3-round bursts
 * - Tank: Slow advance, sustained minigun fire
 * - Sniper: Maintains distance, laser telegraph, high damage
 * - Suicide Bomber: Charges, beeps, explodes within 3m or on death
 */

/** Static data definition for an enemy type. */
interface EnemyTypeData {
  /** Unique identifier for the enemy type. */
  id: string;
  /** Display name of the enemy type. */
  name: string;
  /** Maximum health points. */
  health: number;
  /** Movement speed in meters per second. */
  speed: number;
  /** Damage dealt per attack. */
  damage: number;
  /** Range at which the enemy can attack (meters). */
  attackRange: number;
  /** Cooldown between attacks in seconds. */
  attackCooldown: number;
  /** AI behavior type. */
  behavior: 'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide';
  /** Primary color for health bar. */
  color: number;
  /** Minimum preferred distance from player (for distance-keeping types). */
  minDistance: number;
  /** Maximum preferred distance from player (for distance-keeping types). */
  maxDistance: number;
}

/** Runtime state of a single enemy instance. */
interface EnemyInstance {
  /** Unique enemy ID. */
  id: number;
  /** Enemy type identifier. */
  type: 'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide';
  /** The 3D model group. */
  model: THREE.Group;
  /** Current position in world space. */
  position: THREE.Vector3;
  /** Current health points. */
  health: number;
  /** Maximum health points. */
  maxHealth: number;
  /** Current AI state. */
  state: 'ADVANCE' | 'ATTACK' | 'CHARGE' | 'SEEK_COVER' | 'IN_COVER' | 'PEEK_ATTACK' | 'DEAD';
  /** Timer for state-specific behavior. */
  stateTimer: number;
  /** Cooldown timer for attacks. */
  attackCooldown: number;
  /** Lateral strafe direction (-1 or 1). */
  strafeDirection: number;
  /** Timer for strafe direction changes. */
  strafeTimer: number;
  /** Timer for death animation. */
  deathTimer: number;
    /** Timer for death fall-over animation progress. */
  deathFallTimer: number;
  /** Random Z rotation for natural fall direction. */
  deathFallRotation: number;
  /** Whether the enemy is in the dying state. */
  isDying: boolean;
  /** Reference to the health bar foreground mesh. */
  healthBarForeground: THREE.Mesh;
  /** Reference to the health bar background mesh. */
  healthBarBackground: THREE.Mesh;
  /** Reference to the muzzle flash mesh. */
  muzzleFlash: THREE.Mesh;
  /** Timer for muzzle flash visibility. */
  muzzleFlashTimer: number;
  /** Zigzag phase offset for Rusher movement. */
  zigzagPhase: number;
  /** Remaining burst shots for Shooter. */
  burstShotsRemaining: number;
  /** Timer between burst shots for Shooter. */
  burstTimer: number;
  /** Cover target position for Shooter. */
  coverTarget: THREE.Vector3 | null;
  /** Cooldown before seeking new cover for Shooter. */
  coverCooldown: number;
  /** Whether the Shooter is currently in cover. */
  isInCover: boolean;
  /** Laser sight line for Sniper. */
  laserLine: THREE.Line | null;
  /** Timer for laser telegraph duration. */
  laserTimer: number;
  /** Whether the Sniper is currently telegraphing. */
  isTelegraphing: boolean;
  /** WebAudio oscillator for Suicide Bomber beeping. */
  beepOscillator: OscillatorNode | null;
  /** WebAudio gain node for Suicide Bomber beeping. */
  beepGain: GainNode | null;
  /** Timer for beep pulse rate. */
  beepTimer: number;
  /** Visual explosion effect group for Suicide Bomber. */
  explosionEffect: THREE.Group | null;
  /** Timer for explosion effect lifetime. */
  explosionTimer: number;
  /** Whether the Suicide Bomber is currently exploding. */
  isExploding: boolean;
}

/** Static enemy type definitions. */
const ENEMY_TYPES: Record<string, EnemyTypeData> = {
  grunt: {
    id: 'grunt',
    name: 'Grunt',
    health: 50,
    speed: 3.5,
    damage: 8,
    attackRange: 10,
    attackCooldown: 2.5,
    behavior: 'grunt',
    color: 0x00ff00,
    minDistance: 8,
    maxDistance: 12,
  },
  rusher: {
    id: 'rusher',
    name: 'Rusher',
    health: 30,
    speed: 6.0,
    damage: 15,
    attackRange: 2,
    attackCooldown: 1.0,
    behavior: 'rusher',
    color: 0xff4444,
    minDistance: 0,
    maxDistance: 0,
  },
  shooter: {
    id: 'shooter',
    name: 'Shooter',
    health: 60,
    speed: 4.0,
    damage: 10,
    attackRange: 15,
    attackCooldown: 1.5,
    behavior: 'shooter',
    color: 0x4488ff,
    minDistance: 12,
    maxDistance: 18,
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    health: 200,
    speed: 2.0,
    damage: 20,
    attackRange: 20,
    attackCooldown: 0.15,
    behavior: 'tank',
    color: 0xff8800,
    minDistance: 15,
    maxDistance: 20,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    health: 40,
    speed: 2.5,
    damage: 50,
    attackRange: 40,
    attackCooldown: 4.0,
    behavior: 'sniper',
    color: 0x88ff44,
    minDistance: 30,
    maxDistance: 50,
  },
  suicide: {
    id: 'suicide',
    name: 'Suicide Bomber',
    health: 25,
    speed: 5.0,
    damage: 100,
    attackRange: 3,
    attackCooldown: 0,
    behavior: 'suicide',
    color: 0xff0000,
    minDistance: 0,
    maxDistance: 0,
  },
};

/** Map boundary half-size (map is 100x100m, so ±50). */
const MAP_HALF_SIZE = 50;
/** Spawn interval in seconds. */
const SPAWN_INTERVAL = 2.0;
/** Death animation duration in seconds. */
const DEATH_DURATION = 2.0;
/** Death fall-over duration in seconds. */
const DEATH_FALL_DURATION = 0.5;
/** Muzzle flash duration in seconds. */
const MUZZLE_FLASH_DURATION = 0.05;
/** Separation distance for collision avoidance. */
const SEPARATION_DISTANCE = 0.8;
/** Collision radius (half-width) used for enemy vs wall checks. */
const ENEMY_COLLISION_RADIUS = 0.35;
/** Grunt shooting spread in radians. */
const GRUNT_SPREAD = 0.05;
/** Rusher zigzag amplitude. */
const ZIGZAG_AMPLITUDE = 1.5;
/** Rusher zigzag frequency. */
const ZIGZAG_FREQUENCY = 3.0;
/** Shooter burst fire count. */
const SHOOTER_BURST_COUNT = 3;
/** Shooter burst fire interval in seconds. */
const SHOOTER_BURST_INTERVAL = 0.12;
/** Shooter cover cooldown in seconds. */
const SHOOTER_COVER_COOLDOWN = 5.0;
/** Sniper laser telegraph duration in seconds. */
const SNIPER_TELEGRAPH_DURATION = 1.0;
/** Explosion radius in meters. */
const EXPLOSION_RADIUS = 5.0;
/** Explosion effect lifetime in seconds. */
const EXPLOSION_EFFECT_DURATION = 0.8;
/** Suicide bomber beep base frequency. */
const BEEP_BASE_FREQUENCY = 200;
/** Suicide bomber beep max frequency. */
const BEEP_MAX_FREQUENCY = 1200;
/** Suicide bomber beep base interval in seconds. */
const BEEP_BASE_INTERVAL = 0.5;
/** Suicide bomber beep min interval in seconds. */
const BEEP_MIN_INTERVAL = 0.05;

export default class EnemySystem {
  private scene: THREE.Scene;
  private playerPosition: () => THREE.Vector3;
  private onPlayerDamage: (damage: number, direction: THREE.Vector3) => void;
  private onEnemyKilled: (enemyId: number) => void;
  private onHitMarker: (isKill: boolean) => void;
    private collisionManager: CollisionManager;
  private waveMultiplier: number;
  private damageMultiplier: number = 1.0;

    /** All active enemy instances. */
  private enemies: EnemyInstance[] = [];
  /** Active death particle effect groups with their age. */
  private deathParticleEffects: { group: THREE.Group; age: number }[] = [];
  /** Queue of enemy types to spawn. */
  private spawnQueue: Array<'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide'> = [];
  /** Timer for staggered spawning. */
  private spawnTimer = 0;
  /** Whether spawning is active. */
  private spawning = false;
  /** Total kill count. */
  private killCount = 0;
  /** Unique ID counter for enemies. */
  private nextEnemyId = 1;
  /** Whether the system has been disposed. */
  private disposed = false;
  /** Audio context for beeping sounds. */
  private audioContext: AudioContext | null = null;

  /**
   * @param scene - The THREE.Scene to add enemy models to
   * @param playerPosition - Function returning the player's current position
   * @param onPlayerDamage - Callback when the player takes damage
   * @param onEnemyKilled - Callback when an enemy is killed
   * @param onHitMarker - Callback for hit marker feedback (isKill flag)
   * @param collisionManager - Collision manager for cover-seeking logic
      * @param waveMultiplier - Health multiplier for wave scaling (default 1.0)
   * @param damageMultiplier - Damage multiplier for wave scaling (default 1.0)
   */
  constructor(
    scene: THREE.Scene,
    playerPosition: () => THREE.Vector3,
    onPlayerDamage: (damage: number, direction: THREE.Vector3) => void,
    onEnemyKilled: (enemyId: number) => void,
    onHitMarker: (isKill: boolean) => void,
    collisionManager: CollisionManager,
    waveMultiplier: number = 1.0,
    damageMultiplier: number = 1.0
  ) {
    this.scene = scene;
    this.playerPosition = playerPosition;
    this.onPlayerDamage = onPlayerDamage;
    this.onEnemyKilled = onEnemyKilled;
    this.onHitMarker = onHitMarker;
    this.collisionManager = collisionManager;
    this.waveMultiplier = waveMultiplier;
    this.damageMultiplier = damageMultiplier;
  }

  /**
   * Updates all enemies (AI, movement, attacks, death animations).
   * Called once per frame.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  public update(deltaTime: number): void {
    if (this.disposed) return;

    // --- Handle staggered spawning ---
    if (this.spawning && this.spawnQueue.length > 0) {
      this.spawnTimer -= deltaTime;
      if (this.spawnTimer <= 0) {
        const type = this.spawnQueue.shift();
        if (type) {
          this.spawnEnemy(type);
        }
        this.spawnTimer = SPAWN_INTERVAL;
      }
    }

    // --- Update all enemies ---
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Update timers
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaTime);
      enemy.stateTimer = Math.max(0, enemy.stateTimer - deltaTime);
      enemy.strafeTimer = Math.max(0, enemy.strafeTimer - deltaTime);
      enemy.muzzleFlashTimer = Math.max(0, enemy.muzzleFlashTimer - deltaTime);
      enemy.coverCooldown = Math.max(0, enemy.coverCooldown - deltaTime);

      // Update muzzle flash visibility
      enemy.muzzleFlash.visible = enemy.muzzleFlashTimer > 0;

      // Update health bar
      this.updateHealthBar(enemy);

      // Handle death animation
      if (enemy.isDying) {
        this.updateDeathAnimation(enemy, deltaTime);
        continue;
      }

      // AI behavior based on enemy type
      switch (enemy.type) {
        case 'grunt':
          this.updateGruntAI(enemy, deltaTime);
          break;
        case 'rusher':
          this.updateRusherAI(enemy, deltaTime);
          break;
        case 'shooter':
          this.updateShooterAI(enemy, deltaTime);
          break;
        case 'tank':
          this.updateTankAI(enemy, deltaTime);
          break;
        case 'sniper':
          this.updateSniperAI(enemy, deltaTime);
          break;
        case 'suicide':
          this.updateSuicideAI(enemy, deltaTime);
          break;
      }

      // Update beeping for suicide bombers
      if (enemy.type === 'suicide' && !enemy.isExploding) {
        this.updateBeep(enemy);
      }

      // Update laser line for snipers
      if (enemy.type === 'sniper' && enemy.laserLine) {
        this.updateLaserLine(enemy);
      }

      // Update explosion effect
      if (enemy.isExploding && enemy.explosionEffect) {
        this.updateExplosionEffect(enemy, deltaTime);
      }

            // Collision avoidance (separation)
      this.applySeparation(enemy, i);

      // Push the enemy out of any walls it has walked into, then re-sync
      // the model transform so enemies cannot pass through map geometry.
      this.resolveEnemyWalls(enemy);
      enemy.model.position.copy(enemy.position);

      // Remove dead enemies after death animation completes
      if (enemy.isDying && enemy.deathTimer <= 0) {
        this.removeEnemy(i);
      }
    }

    // Update death particle effects
    this.updateDeathParticles(deltaTime);
  }

  /**
   * Spawns one enemy at a random map edge point.
   *
   * @param type - The enemy type to spawn
   */
  public spawnEnemy(type: 'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide'): void {
    if (this.disposed) return;

    const typeData = ENEMY_TYPES[type];
    if (!typeData) return;

        // Create the enemy model
    const model = createEnemyModel(type);

    // Enable frustum culling on all meshes for performance
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true;
      }
    });

    const position = this.getRandomEdgePosition();

    // Position the model
    model.position.copy(position);

    // Create health bar
    const healthBar = this.createHealthBar(typeData.color);
    model.add(healthBar.background);
    model.add(healthBar.foreground);

    // Create muzzle flash
    const muzzleFlash = this.createMuzzleFlash();
    model.add(muzzleFlash);

    // Apply wave multiplier to health
    const maxHealth = typeData.health * this.waveMultiplier;

    // Create enemy instance
    const enemy: EnemyInstance = {
      id: this.nextEnemyId++,
      type,
      model,
      position: position.clone(),
      health: maxHealth,
      maxHealth,
      state: type === 'grunt' ? 'ADVANCE' : type === 'rusher' ? 'CHARGE' : type === 'shooter' ? 'ADVANCE' : type === 'tank' ? 'ADVANCE' : type === 'sniper' ? 'ADVANCE' : 'CHARGE',
      stateTimer: 0,
      attackCooldown: 0,
      strafeDirection: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 2 + Math.random() * 2,
            deathTimer: 0,
      deathFallTimer: 0,
      deathFallRotation: (Math.random() - 0.5) * 0.4,
      isDying: false,
      healthBarForeground: healthBar.foreground,
      healthBarBackground: healthBar.background,
      muzzleFlash,
      muzzleFlashTimer: 0,
      zigzagPhase: Math.random() * Math.PI * 2,
      burstShotsRemaining: 0,
      burstTimer: 0,
      coverTarget: null,
      coverCooldown: 0,
      isInCover: false,
      laserLine: null,
      laserTimer: 0,
      isTelegraphing: false,
      beepOscillator: null,
      beepGain: null,
      beepTimer: 0,
      explosionEffect: null,
      explosionTimer: 0,
      isExploding: false,
    };

    // Create laser line for snipers
    if (type === 'sniper') {
      this.createLaserLine(enemy);
    }

    // Create beep audio for suicide bombers
    if (type === 'suicide') {
      this.initBeep(enemy);
    }

    // Add to scene and array
    this.scene.add(model);
    this.enemies.push(enemy);
  }

  /**
   * Applies damage to an enemy. Returns true if the enemy was hit.
   * Triggers death if health drops to or below zero.
   *
   * @param enemyId - The ID of the enemy to damage
   * @param damage - Amount of damage to apply
   * @returns True if the enemy was hit (exists and not already dying)
   */
  public damageEnemy(enemyId: number, damage: number): boolean {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy || enemy.isDying) return false;

    // Apply damage
    enemy.health -= damage;

    // Check for death
    if (enemy.health <= 0) {
      enemy.health = 0;
      this.startDeath(enemy);
      this.onHitMarker(true);
    } else {
      this.onHitMarker(false);
    }

    return true;
  }

  /**
   * Returns all active enemy instances.
   *
   * @returns Array of all enemies
   */
  public getEnemies(): EnemyInstance[] {
    return this.enemies;
  }

  /**
   * Returns the count of alive (non-dying) enemies.
   *
   * @returns Number of alive enemies
   */
  public getEnemyCount(): number {
    return this.enemies.filter((e) => !e.isDying).length;
  }

  /**
   * Returns the total kill count.
   *
   * @returns Total kills
   */
  public getKillCount(): number {
    return this.killCount;
  }

  /**
   * Begins the staggered spawn loop.
   * Spawns one enemy from the queue every 2 seconds.
   */
  public startSpawning(): void {
    this.spawning = true;
    this.spawnTimer = 0;
  }

  /**
   * Stops the staggered spawn loop.
   */
  public stopSpawning(): void {
    this.spawning = false;
  }

  /**
   * Adds an enemy to the spawn queue.
   *
   * @param type - The enemy type to queue
   */
  public queueSpawn(type: 'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide'): void {
    this.spawnQueue.push(type);
  }

  /**
   * Clears all enemies and resets the kill count.
   * Removes all enemy models from the scene.
   */
  public reset(): void {
    // Remove all enemy models from scene
    for (const enemy of this.enemies) {
      // Stop beeping
      this.stopBeep(enemy);

      // Remove laser line
      if (enemy.laserLine) {
        this.scene.remove(enemy.laserLine);
        enemy.laserLine.geometry.dispose();
        (enemy.laserLine.material as THREE.Material).dispose();
      }

      // Remove explosion effect
      if (enemy.explosionEffect) {
        this.scene.remove(enemy.explosionEffect);
        this.disposeGroup(enemy.explosionEffect);
      }

      this.scene.remove(enemy.model);
      this.disposeEnemyModel(enemy.model);
    }

        // Remove all death particle effects
    for (const effect of this.deathParticleEffects) {
      this.scene.remove(effect.group);
      this.disposeGroup(effect.group);
    }
    this.deathParticleEffects = [];

    // Clear arrays and counters
    this.enemies = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawning = false;
    this.killCount = 0;
    this.nextEnemyId = 1;
  }

  /**
   * Disposes of all resources held by the system.
   * Removes all enemy models from the scene and cleans up.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.reset();
  }

  /**
   * Returns the current wave multiplier.
   *
   * @returns The current wave multiplier
   */
  public getWaveMultiplier(): number {
    return this.waveMultiplier;
  }

    /**
   * Sets the wave multiplier for health scaling.
   *
   * @param multiplier - The new wave multiplier
   */
  public setWaveMultiplier(multiplier: number): void {
    this.waveMultiplier = Math.max(1.0, multiplier);
  }

  /**
   * Sets the damage multiplier for wave scaling.
   *
   * @param multiplier - The new damage multiplier
   */
  public setDamageMultiplier(multiplier: number): void {
    this.damageMultiplier = Math.max(1.0, multiplier);
  }

  /**
   * Returns the current damage multiplier.
   *
   * @returns The current damage multiplier
   */
  public getDamageMultiplier(): number {
    return this.damageMultiplier;
  }

  /**
   * Returns the display name of an enemy type.
   *
   * @param type - The enemy type
   * @returns The display name
   */
  public static getEnemyTypeName(type: string): string {
    const data = ENEMY_TYPES[type];
    return data ? data.name : 'Unknown';
  }

  // ==========================================================================
  // Private Methods — AI Behaviors
  // ==========================================================================

  /**
   * Updates Grunt AI behavior (ADVANCE → ATTACK).
   *
   * @param enemy - The Grunt enemy instance
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateGruntAI(enemy: EnemyInstance, deltaTime: number): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distanceToPlayer = toPlayer.length();

    // Face the player
    this.faceDirection(enemy, toPlayer);

    if (enemy.state === 'ADVANCE') {
      // Move toward player until within attack range
      if (distanceToPlayer > ENEMY_TYPES.grunt.attackRange) {
        const direction = toPlayer.clone().normalize();
        const moveSpeed = ENEMY_TYPES.grunt.speed * deltaTime;
        enemy.position.x += direction.x * moveSpeed;
        enemy.position.z += direction.z * moveSpeed;
      } else {
        enemy.state = 'ATTACK';
        enemy.stateTimer = 0;
        enemy.strafeTimer = 2 + Math.random() * 2;
        enemy.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      }
    } else if (enemy.state === 'ATTACK') {
      // Strafe laterally
      if (enemy.strafeTimer <= 0) {
        enemy.strafeDirection *= -1;
        enemy.strafeTimer = 2 + Math.random() * 2;
      }

      const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
      const strafeSpeed = ENEMY_TYPES.grunt.speed * 0.5 * deltaTime;
      enemy.position.x += strafeDir.x * strafeSpeed * enemy.strafeDirection;
      enemy.position.z += strafeDir.z * strafeSpeed * enemy.strafeDirection;

      // Attack when cooldown is ready
      if (enemy.attackCooldown <= 0) {
        this.gruntShoot(enemy);
        enemy.attackCooldown = ENEMY_TYPES.grunt.attackCooldown;
      }
    }

    // Clamp to map boundary
    this.clampToBoundary(enemy);

    // Update model position
    enemy.model.position.copy(enemy.position);
  }

  /**
   * Updates Rusher AI behavior (CHARGE with zigzag + melee).
   *
   * @param enemy - The Rusher enemy instance
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateRusherAI(enemy: EnemyInstance, deltaTime: number): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distanceToPlayer = toPlayer.length();

    // Face the player
    this.faceDirection(enemy, toPlayer);

        // Melee attack when within range
    if (distanceToPlayer <= ENEMY_TYPES.rusher.attackRange) {
      if (enemy.attackCooldown <= 0) {
        this.onPlayerDamage(
          ENEMY_TYPES.rusher.damage * this.damageMultiplier,
          new THREE.Vector3().subVectors(enemy.position, playerPos).setY(0).normalize()
        );
        enemy.attackCooldown = ENEMY_TYPES.rusher.attackCooldown;
      }
    } else {
      // Charge toward player with zigzag
      const direction = toPlayer.clone().normalize();

      // Zigzag: sinusoidal lateral movement perpendicular to direction
      enemy.zigzagPhase += deltaTime * ZIGZAG_FREQUENCY;
      const lateralOffset = Math.sin(enemy.zigzagPhase) * ZIGZAG_AMPLITUDE * deltaTime;

      // Perpendicular vector (right-hand rule)
      const lateral = new THREE.Vector3(-direction.z, 0, direction.x);

      // Apply movement
      const moveSpeed = ENEMY_TYPES.rusher.speed * deltaTime;
      enemy.position.x += direction.x * moveSpeed + lateral.x * lateralOffset;
      enemy.position.z += direction.z * moveSpeed + lateral.z * lateralOffset;
    }

    // Clamp to map boundary
    this.clampToBoundary(enemy);

    // Update model position
    enemy.model.position.copy(enemy.position);
  }

  /**
   * Updates Shooter AI behavior (ADVANCE → SEEK_COVER → IN_COVER → PEEK_ATTACK).
   *
   * @param enemy - The Shooter enemy instance
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateShooterAI(enemy: EnemyInstance, deltaTime: number): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distanceToPlayer = toPlayer.length();

    // Face the player
    this.faceDirection(enemy, toPlayer);

    switch (enemy.state) {
      case 'ADVANCE': {
        // Move toward player until within preferred range
        if (distanceToPlayer > ENEMY_TYPES.shooter.maxDistance) {
          const direction = toPlayer.clone().normalize();
          const moveSpeed = ENEMY_TYPES.shooter.speed * deltaTime;
          enemy.position.x += direction.x * moveSpeed;
          enemy.position.z += direction.z * moveSpeed;
        } else {
          // Within range, seek cover
          enemy.state = 'SEEK_COVER';
          enemy.stateTimer = 0;
          enemy.coverCooldown = 0;
        }
        break;
      }

      case 'SEEK_COVER': {
        // Find nearest cover
        if (!enemy.coverTarget || enemy.coverCooldown <= 0) {
          enemy.coverTarget = this.findNearestCover(enemy);
          enemy.coverCooldown = SHOOTER_COVER_COOLDOWN;
        }

        if (enemy.coverTarget) {
          // Move toward cover
          const toCover = new THREE.Vector3().subVectors(enemy.coverTarget, enemy.position);
          const distanceToCover = toCover.length();

          if (distanceToCover > 0.5) {
            const direction = toCover.clone().normalize();
            const moveSpeed = ENEMY_TYPES.shooter.speed * deltaTime;
            enemy.position.x += direction.x * moveSpeed;
            enemy.position.z += direction.z * moveSpeed;
          } else {
            // Reached cover
            enemy.state = 'IN_COVER';
            enemy.stateTimer = 1.0 + Math.random() * 1.5;
            enemy.isInCover = true;
          }
        } else {
          // No cover found, fall back to attack
          enemy.state = 'PEEK_ATTACK';
          enemy.stateTimer = 0;
        }
        break;
      }

      case 'IN_COVER': {
        // Wait in cover, then peek out
        if (enemy.stateTimer <= 0) {
          enemy.state = 'PEEK_ATTACK';
          enemy.stateTimer = 0;
          enemy.isInCover = false;
        }
        break;
      }

      case 'PEEK_ATTACK': {
        // Fire burst shots
        if (enemy.burstShotsRemaining > 0) {
          // Fire burst shot
          if (enemy.burstTimer <= 0) {
            this.shooterShoot(enemy);
            enemy.burstShotsRemaining--;
            enemy.burstTimer = SHOOTER_BURST_INTERVAL;
          } else {
            enemy.burstTimer -= deltaTime;
          }
        } else {
          // Burst complete, return to cover
          enemy.burstShotsRemaining = SHOOTER_BURST_COUNT;
          enemy.state = 'SEEK_COVER';
          enemy.stateTimer = 0;
          enemy.coverCooldown = 0;
        }
        break;
      }
    }

    // Clamp to map boundary
    this.clampToBoundary(enemy);

    // Update model position
    enemy.model.position.copy(enemy.position);
  }

  /**
   * Updates Tank AI behavior (slow advance, sustained fire).
   *
   * @param enemy - The Tank enemy instance
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateTankAI(enemy: EnemyInstance, deltaTime: number): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distanceToPlayer = toPlayer.length();

    // Face the player
    this.faceDirection(enemy, toPlayer);

    if (enemy.state === 'ADVANCE') {
      // Move toward player until within attack range
      if (distanceToPlayer > ENEMY_TYPES.tank.attackRange) {
        const direction = toPlayer.clone().normalize();
        const moveSpeed = ENEMY_TYPES.tank.speed * deltaTime;
        enemy.position.x += direction.x * moveSpeed;
        enemy.position.z += direction.z * moveSpeed;
      } else {
        enemy.state = 'ATTACK';
        enemy.stateTimer = 0;
        enemy.strafeTimer = 3 + Math.random() * 2;
        enemy.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      }
    } else if (enemy.state === 'ATTACK') {
      // Slow strafe
      if (enemy.strafeTimer <= 0) {
        enemy.strafeDirection *= -1;
        enemy.strafeTimer = 3 + Math.random() * 2;
      }

      const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
      const strafeSpeed = ENEMY_TYPES.tank.speed * 0.3 * deltaTime;
      enemy.position.x += strafeDir.x * strafeSpeed * enemy.strafeDirection;
      enemy.position.z += strafeDir.z * strafeSpeed * enemy.strafeDirection;

      // Sustained fire
      if (enemy.attackCooldown <= 0) {
        this.tankShoot(enemy);
        enemy.attackCooldown = ENEMY_TYPES.tank.attackCooldown;
      }
    }

    // Clamp to map boundary
    this.clampToBoundary(enemy);

    // Update model position
    enemy.model.position.copy(enemy.position);
  }

  /**
   * Updates Sniper AI behavior (maintain distance, laser telegraph, fire).
   *
   * @param enemy - The Sniper enemy instance
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateSniperAI(enemy: EnemyInstance, deltaTime: number): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distanceToPlayer = toPlayer.length();

    // Face the player
    this.faceDirection(enemy, toPlayer);

    // Maintain preferred distance
    if (distanceToPlayer < ENEMY_TYPES.sniper.minDistance) {
      // Move away from player
      const direction = toPlayer.clone().normalize().negate();
      const moveSpeed = ENEMY_TYPES.sniper.speed * deltaTime;
      enemy.position.x += direction.x * moveSpeed;
      enemy.position.z += direction.z * moveSpeed;
    } else if (distanceToPlayer > ENEMY_TYPES.sniper.maxDistance) {
      // Move closer to player
      const direction = toPlayer.clone().normalize();
      const moveSpeed = ENEMY_TYPES.sniper.speed * deltaTime;
      enemy.position.x += direction.x * moveSpeed;
      enemy.position.z += direction.z * moveSpeed;
    }

    // Telegraph and fire
    if (enemy.isTelegraphing) {
      // Update laser line
      if (enemy.laserLine) {
        this.updateLaserLine(enemy);
      }

      // Telegraph timer
      enemy.laserTimer -= deltaTime;
      if (enemy.laserTimer <= 0) {
        // Fire the shot
        this.sniperShoot(enemy);
        enemy.isTelegraphing = false;
        enemy.attackCooldown = ENEMY_TYPES.sniper.attackCooldown;

        // Hide laser
        if (enemy.laserLine) {
          enemy.laserLine.visible = false;
        }
      }
    } else {
      // Start telegraph when cooldown is ready
      if (enemy.attackCooldown <= 0) {
        enemy.isTelegraphing = true;
        enemy.laserTimer = SNIPER_TELEGRAPH_DURATION;

        // Show laser
        if (enemy.laserLine) {
          enemy.laserLine.visible = true;
        }
      }
    }

    // Clamp to map boundary
    this.clampToBoundary(enemy);

    // Update model position
    enemy.model.position.copy(enemy.position);
  }

  /**
   * Updates Suicide Bomber AI behavior (charge, beep, explode).
   *
   * @param enemy - The Suicide Bomber enemy instance
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateSuicideAI(enemy: EnemyInstance, deltaTime: number): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distanceToPlayer = toPlayer.length();

    // Face the player
    this.faceDirection(enemy, toPlayer);

    // Explode when within range
    if (distanceToPlayer <= ENEMY_TYPES.suicide.attackRange) {
      this.explode(enemy);
      return;
    }

    // Charge directly at player
    const direction = toPlayer.clone().normalize();
    const moveSpeed = ENEMY_TYPES.suicide.speed * deltaTime;
    enemy.position.x += direction.x * moveSpeed;
    enemy.position.z += direction.z * moveSpeed;

    // Clamp to map boundary
    this.clampToBoundary(enemy);

    // Update model position
    enemy.model.position.copy(enemy.position);
  }

  // ==========================================================================
  // Private Methods — Combat
  // ==========================================================================

  /**
   * Returns whether a wall blocks the line between the enemy and the player.
   * Used so enemy fire cannot travel through map walls (no wall-hacking).
   *
   * @param enemyPosition - The enemy's firing origin (world space)
   * @param playerPos - The player's position (world space)
   * @returns True if any wall lies between the two points
   */
  private isBlockedByWall(enemyPosition: THREE.Vector3, playerPos: THREE.Vector3): boolean {
    const dir = new THREE.Vector3().subVectors(playerPos, enemyPosition);
    const distance = dir.length();
    if (distance <= 0.001) return false;

    dir.normalize();

    // Find the nearest wall between the enemy and the player. A small offset
    // (player radius) is subtracted so grazing the player's own collider does
    // not register as a blocked shot.
    const wallDist = this.collisionManager.getWallHitDistance(enemyPosition, dir, distance + 0.3);
    if (wallDist === null) return false;

    // If a wall is hit before reaching the player, the shot is blocked.
    return wallDist <= distance;
  }

  /**
   * Makes the Grunt fire a single shot at the player with spread.
   *
   * @param enemy - The Grunt enemy instance
   */
  private gruntShoot(enemy: EnemyInstance): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distance = toPlayer.length();

    // Apply random spread
    const spreadAngle = (Math.random() - 0.5) * 2 * GRUNT_SPREAD;
    const spreadOffset = Math.tan(spreadAngle) * distance;

    // Wall occlusion: no damage if a wall blocks the line of sight.
    if (!this.isBlockedByWall(enemy.position, playerPos)) {
      // Check if the shot hits the player
      const hitRadius = 0.5;
      if (Math.abs(spreadOffset) < hitRadius) {
        this.onPlayerDamage(
          ENEMY_TYPES.grunt.damage * this.damageMultiplier,
          new THREE.Vector3().subVectors(enemy.position, playerPos).setY(0).normalize()
        );
      }
    }

    // Show muzzle flash
    enemy.muzzleFlashTimer = MUZZLE_FLASH_DURATION;
    enemy.muzzleFlash.visible = true;
  }

  /**
   * Makes the Shooter fire a single shot at the player.
   *
   * @param enemy - The Shooter enemy instance
   */
  private shooterShoot(enemy: EnemyInstance): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distance = toPlayer.length();

    // Apply spread
    const spreadAngle = (Math.random() - 0.5) * 2 * 0.04;
    const spreadOffset = Math.tan(spreadAngle) * distance;

    // Wall occlusion: a shot is blocked if a wall intrudes the line of sight.
    if (!this.isBlockedByWall(enemy.position, playerPos)) {
      // Check if the shot hits the player
      const hitRadius = 0.5;
      if (Math.abs(spreadOffset) < hitRadius) {
        this.onPlayerDamage(
          ENEMY_TYPES.shooter.damage * this.damageMultiplier,
          new THREE.Vector3().subVectors(enemy.position, playerPos).setY(0).normalize()
        );
      }
    }

    // Show muzzle flash
    enemy.muzzleFlashTimer = MUZZLE_FLASH_DURATION;
    enemy.muzzleFlash.visible = true;
  }

  /**
   * Makes the Tank fire a shot at the player.
   *
   * @param enemy - The Tank enemy instance
   */
  private tankShoot(enemy: EnemyInstance): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distance = toPlayer.length();

    // Apply spread
    const spreadAngle = (Math.random() - 0.5) * 2 * 0.06;
    const spreadOffset = Math.tan(spreadAngle) * distance;

    // Wall occlusion: a shot is blocked if a wall intrudes the line of sight.
    if (!this.isBlockedByWall(enemy.position, playerPos)) {
      // Check if the shot hits the player
      const hitRadius = 0.5;
      if (Math.abs(spreadOffset) < hitRadius) {
        this.onPlayerDamage(
          ENEMY_TYPES.tank.damage * this.damageMultiplier,
          new THREE.Vector3().subVectors(enemy.position, playerPos).setY(0).normalize()
        );
      }
    }

    // Show muzzle flash
    enemy.muzzleFlashTimer = MUZZLE_FLASH_DURATION;
    enemy.muzzleFlash.visible = true;
  }

  /**
   * Makes the Sniper fire a high-damage shot at the player.
   *
   * @param enemy - The Sniper enemy instance
   */
  private sniperShoot(enemy: EnemyInstance): void {
    const playerPos = this.playerPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const distance = toPlayer.length();

    // Minimal spread for sniper accuracy
    const spreadAngle = (Math.random() - 0.5) * 2 * 0.01;
    const spreadOffset = Math.tan(spreadAngle) * distance;

    // Wall occlusion: a shot is blocked if a wall intrudes the line of sight.
    if (!this.isBlockedByWall(enemy.position, playerPos)) {
      // Check if the shot hits the player
      const hitRadius = 0.5;
      if (Math.abs(spreadOffset) < hitRadius) {
        this.onPlayerDamage(
          ENEMY_TYPES.sniper.damage * this.damageMultiplier,
          new THREE.Vector3().subVectors(enemy.position, playerPos).setY(0).normalize()
        );
      }
    }

    // Show muzzle flash
    enemy.muzzleFlashTimer = MUZZLE_FLASH_DURATION;
    enemy.muzzleFlash.visible = true;
  }

  // ==========================================================================
  // Private Methods — Cover Seeking
  // ==========================================================================

  /**
   * Finds the nearest cover AABB that is between the enemy and the player.
   *
   * @param enemy - The Shooter enemy instance
   * @returns The cover position or null if no cover found
   */
  private findNearestCover(enemy: EnemyInstance): THREE.Vector3 | null {
    const playerPos = this.playerPosition();
    const colliders = this.collisionManager.getColliders();

    let nearestCover: THREE.Vector3 | null = null;
    let nearestDistance = Infinity;

    for (const collider of colliders) {
      // Skip small colliders (not useful as cover)
      const width = collider.maxX - collider.minX;
      const depth = collider.maxZ - collider.minZ;
      if (width < 0.5 && depth < 0.5) continue;

      // Calculate cover center
      const coverCenter = new THREE.Vector3(
        (collider.minX + collider.maxX) / 2,
        0,
        (collider.minZ + collider.maxZ) / 2
      );

      // Check if cover is between enemy and player
      const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
      const toCover = new THREE.Vector3().subVectors(coverCenter, enemy.position);

      // Cover should be roughly in the direction of the player
      const dot = toPlayer.normalize().dot(toCover.normalize());
      if (dot < 0.3) continue;

      // Calculate distance to cover
      const distance = enemy.position.distanceTo(coverCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCover = coverCenter;
      }
    }

    return nearestCover;
  }

  // ==========================================================================
  // Private Methods — Explosion System
  // ==========================================================================

  /**
   * Creates an explosion at the given position.
   * Deals area damage to the player with falloff.
   *
   * @param position - The position of the explosion
   */
  private createExplosion(position: THREE.Vector3): void {
    const playerPos = this.playerPosition();
    const distance = position.distanceTo(playerPos);

        // Apply damage with falloff
    if (distance <= EXPLOSION_RADIUS) {
      const falloff = 1 - (distance / EXPLOSION_RADIUS);
      const damage = Math.max(0, ENEMY_TYPES.suicide.damage * falloff * this.damageMultiplier);
      this.onPlayerDamage(
        damage,
        new THREE.Vector3().subVectors(position, playerPos).setY(0).normalize()
      );
    }

    // Create visual explosion effect
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);

    // Expanding sphere
    const sphereGeometry = new THREE.SphereGeometry(0.5, 12, 10);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    explosionGroup.add(sphere);

    // Point light
    const light = new THREE.PointLight(0xff6600, 3, 10);
    light.position.copy(position);
    explosionGroup.add(light);

        // Particles (small spheres) - enhanced with more variety
    const particleColors = [0xff8800, 0xffaa00, 0xff4400];
    for (let i = 0; i < 20; i++) {
      const particleSize = 0.05 + Math.random() * 0.10;
      const particleGeometry = new THREE.SphereGeometry(particleSize, 4, 3);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        transparent: true,
        opacity: 0.8,
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      explosionGroup.add(particle);
    }

    this.scene.add(explosionGroup);

    // Store explosion effect on the enemy
    const enemy = this.enemies.find((e) => e.position.distanceTo(position) < 1.0);
    if (enemy) {
      enemy.explosionEffect = explosionGroup;
      enemy.explosionTimer = EXPLOSION_EFFECT_DURATION;
      enemy.isExploding = true;
    }
  }

  /**
   * Updates the explosion effect animation.
   *
   * @param enemy - The enemy with the explosion effect
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateExplosionEffect(enemy: EnemyInstance, deltaTime: number): void {
    if (!enemy.explosionEffect) return;

    enemy.explosionTimer -= deltaTime;

    // Expand and fade the sphere
    const sphere = enemy.explosionEffect.children[0] as THREE.Mesh;
    if (sphere) {
      const scale = 1 + (1 - enemy.explosionTimer / EXPLOSION_EFFECT_DURATION) * 3;
      sphere.scale.set(scale, scale, scale);
      (sphere.material as THREE.MeshBasicMaterial).opacity = enemy.explosionTimer / EXPLOSION_EFFECT_DURATION;
    }

    // Fade the light
    const light = enemy.explosionEffect.children[1] as THREE.PointLight;
    if (light) {
      light.intensity = 3 * (enemy.explosionTimer / EXPLOSION_EFFECT_DURATION);
    }

    // Remove when done
    if (enemy.explosionTimer <= 0) {
      this.scene.remove(enemy.explosionEffect);
      this.disposeGroup(enemy.explosionEffect);
      enemy.explosionEffect = null;
      enemy.isExploding = false;
    }
  }

    /**
   * Triggers the suicide bomber explosion.
   *
   * @param enemy - The Suicide Bomber enemy instance
   */
  private explode(enemy: EnemyInstance): void {
    if (enemy.isExploding) return;

    // Create explosion at enemy position
    this.createExplosion(enemy.position.clone());

    // Kill the enemy
    this.startDeath(enemy);
  }

  /**
   * Spawns a small particle burst at the death position.
   * Creates 8 small spheres flying outward with random velocities,
   * fading over 0.5 seconds.
   *
   * @param position - The position where the enemy died
   */
  private spawnDeathParticles(position: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(position);

    // Create 8 particles
    for (let i = 0; i < 8; i++) {
      const size = 0.03 + Math.random() * 0.05;
      const particleGeometry = new THREE.SphereGeometry(size, 4, 3);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff8800 : 0xff4400,
        transparent: true,
        opacity: 0.8,
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      group.add(particle);
    }

    this.scene.add(group);
    this.deathParticleEffects.push({ group, age: 0 });
  }

  /**
   * Updates all active death particle effects.
   * Fades particles over 0.5 seconds and removes them when done.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateDeathParticles(deltaTime: number): void {
    for (let i = this.deathParticleEffects.length - 1; i >= 0; i--) {
      const effect = this.deathParticleEffects[i];
      effect.age += deltaTime;

      // Calculate fade progress (0 to 1 over 0.5s)
      const progress = effect.age / 0.5;
      if (progress >= 1) {
        // Remove when done
        this.scene.remove(effect.group);
        this.disposeGroup(effect.group);
        this.deathParticleEffects.splice(i, 1);
        continue;
      }

      // Fade opacity
      effect.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
        }
      });
    }
  }

  // ==========================================================================
  // Private Methods — Beeping System
  // ==========================================================================

  /**
   * Initializes the WebAudio beeping for a Suicide Bomber.
   *
   * @param enemy - The Suicide Bomber enemy instance
   */
  private initBeep(enemy: EnemyInstance): void {
    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.value = BEEP_BASE_FREQUENCY;

      // Create gain node
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;

      // Connect nodes
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);

      // Start oscillator
      oscillator.start();

      // Store references
      enemy.beepOscillator = oscillator;
      enemy.beepGain = gain;
      enemy.beepTimer = 0;
    } catch (e) {
      // Audio context may not be available; silently fail
      enemy.beepOscillator = null;
      enemy.beepGain = null;
    }
  }

  /**
   * Updates the beeping frequency and volume based on distance to player.
   *
   * @param enemy - The Suicide Bomber enemy instance
   */
  private updateBeep(enemy: EnemyInstance): void {
    if (!enemy.beepOscillator || !enemy.beepGain) return;

    const playerPos = this.playerPosition();
    const distance = enemy.position.distanceTo(playerPos);

    // Calculate intensity based on distance (closer = more intense)
    const intensity = Math.max(0, Math.min(1, 1 - (distance / 20)));

    // Update frequency
    const frequency = BEEP_BASE_FREQUENCY + (BEEP_MAX_FREQUENCY - BEEP_BASE_FREQUENCY) * intensity;
    enemy.beepOscillator.frequency.value = frequency;

    // Update beep interval
    enemy.beepTimer -= 1 / 60; // Approximate delta time
    if (enemy.beepTimer <= 0) {
      // Beep pulse
      const beepInterval = BEEP_BASE_INTERVAL - (BEEP_BASE_INTERVAL - BEEP_MIN_INTERVAL) * intensity;
      enemy.beepTimer = beepInterval;

      // Short beep
      enemy.beepGain.gain.setValueAtTime(0.3 * intensity, this.audioContext!.currentTime);
      enemy.beepGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.05);
    }
  }

  /**
   * Stops the beeping for a Suicide Bomber.
   *
   * @param enemy - The Suicide Bomber enemy instance
   */
  private stopBeep(enemy: EnemyInstance): void {
    if (enemy.beepOscillator) {
      try {
        enemy.beepOscillator.stop();
        enemy.beepOscillator.disconnect();
      } catch (e) {
        // Ignore errors on stop
      }
      enemy.beepOscillator = null;
    }

    if (enemy.beepGain) {
      try {
        enemy.beepGain.disconnect();
      } catch (e) {
        // Ignore errors on disconnect
      }
      enemy.beepGain = null;
    }
  }

  // ==========================================================================
  // Private Methods — Laser Sight System
  // ==========================================================================

  /**
   * Creates a laser sight line for a Sniper.
   *
   * @param enemy - The Sniper enemy instance
   */
  private createLaserLine(enemy: EnemyInstance): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });

    const line = new THREE.Line(geometry, material);
    line.visible = false;
    this.scene.add(line);

    enemy.laserLine = line;
  }

  /**
   * Updates the laser line endpoints from sniper to player.
   *
   * @param enemy - The Sniper enemy instance
   */
  private updateLaserLine(enemy: EnemyInstance): void {
    if (!enemy.laserLine) return;

    const playerPos = this.playerPosition();
    const positions = enemy.laserLine.geometry.getAttribute('position') as THREE.BufferAttribute;

    // Start at sniper position (slightly above ground)
    positions.setXYZ(0, enemy.position.x, 1.5, enemy.position.z);
    // End at player position (slightly above ground)
    positions.setXYZ(1, playerPos.x, 1.5, playerPos.z);

    positions.needsUpdate = true;
  }

  // ==========================================================================
  // Private Methods — Death & Cleanup
  // ==========================================================================

  /**
   * Starts the death sequence for an enemy.
   *
   * @param enemy - The enemy to kill
   */
  private startDeath(enemy: EnemyInstance): void {
    enemy.isDying = true;
    enemy.state = 'DEAD';
    enemy.deathTimer = DEATH_DURATION;
    enemy.deathFallTimer = 0;
    enemy.stateTimer = 0;

    // Hide health bar
    enemy.healthBarBackground.visible = false;
    enemy.healthBarForeground.visible = false;

        // Stop beeping for suicide bombers
    if (enemy.type === 'suicide') {
      this.stopBeep(enemy);

      // Explode on death if not already exploding
      if (!enemy.isExploding) {
        this.createExplosion(enemy.position.clone());
      }
    } else {
      // Spawn death particle burst for non-suicide enemies
      this.spawnDeathParticles(enemy.position.clone());
    }

    // Remove laser line for snipers
    if (enemy.laserLine) {
      this.scene.remove(enemy.laserLine);
      enemy.laserLine.geometry.dispose();
      (enemy.laserLine.material as THREE.Material).dispose();
      enemy.laserLine = null;
    }

    // Increment kill count and notify
    this.killCount++;
    if (this.onEnemyKilled) {
      this.onEnemyKilled(enemy.id);
    }
  }

  /**
   * Updates the death animation (fall over over 0.5s, then wait).
   *
   * @param enemy - The dying enemy
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateDeathAnimation(enemy: EnemyInstance, deltaTime: number): void {
    enemy.deathTimer -= deltaTime;

        // Fall over: rotate X from 0 to -90 degrees over 0.5 seconds
    if (enemy.deathFallTimer < DEATH_FALL_DURATION) {
      enemy.deathFallTimer += deltaTime;
      const progress = Math.min(1, enemy.deathFallTimer / DEATH_FALL_DURATION);
      enemy.model.rotation.x = -Math.PI / 2 * progress;
      // Apply slight random Z rotation for natural fall direction
      enemy.model.rotation.z = enemy.deathFallRotation * progress;
    }

    // Remove when death timer expires
    if (enemy.deathTimer <= 0) {
      const index = this.enemies.indexOf(enemy);
      if (index >= 0) {
        this.removeEnemy(index);
      }
    }
  }

  /**
   * Removes an enemy from the scene and array.
   *
   * @param index - Index of the enemy in the enemies array
   */
  private removeEnemy(index: number): void {
    const enemy = this.enemies[index];
    if (!enemy) return;

    // Stop beeping
    this.stopBeep(enemy);

    // Remove from scene
    this.scene.remove(enemy.model);

    // Dispose resources
    this.disposeEnemyModel(enemy.model);

    // Remove from array
    this.enemies.splice(index, 1);
  }

  /**
   * Disposes of all geometries and materials in an enemy model.
   *
   * @param model - The enemy model group to dispose
   */
  private disposeEnemyModel(model: THREE.Group): void {
    model.traverse((child) => {
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
   * Disposes of all geometries and materials in a group.
   *
   * @param group - The group to dispose
   */
  private disposeGroup(group: THREE.Group): void {
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

  // ==========================================================================
  // Private Methods — Helpers
  // ==========================================================================

  /**
   * Generates a random position along one of the four map edges.
   *
   * @returns THREE.Vector3 at ground level (Y=0)
   */
  private getRandomEdgePosition(): THREE.Vector3 {
    const edge = Math.floor(Math.random() * 4);
    const pos = new THREE.Vector3();

    switch (edge) {
      case 0: // North edge (Z = +50)
        pos.set((Math.random() * 2 - 1) * MAP_HALF_SIZE, 0, MAP_HALF_SIZE);
        break;
      case 1: // South edge (Z = -50)
        pos.set((Math.random() * 2 - 1) * MAP_HALF_SIZE, 0, -MAP_HALF_SIZE);
        break;
      case 2: // East edge (X = +50)
        pos.set(MAP_HALF_SIZE, 0, (Math.random() * 2 - 1) * MAP_HALF_SIZE);
        break;
      case 3: // West edge (X = -50)
        pos.set(-MAP_HALF_SIZE, 0, (Math.random() * 2 - 1) * MAP_HALF_SIZE);
        break;
    }

    return pos;
  }

  /**
   * Creates a health bar (background + foreground) for an enemy.
   *
   * @param color - Color for the health bar foreground
   * @returns Object with background and foreground meshes
   */
  private createHealthBar(color: number): { background: THREE.Mesh; foreground: THREE.Mesh } {
    // Background (dark)
    const bgGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.02);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.8,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.set(0, 1.9, 0);

    // Foreground (colored)
    const fgGeometry = new THREE.BoxGeometry(0.48, 0.04, 0.015);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
    const foreground = new THREE.Mesh(fgGeometry, fgMaterial);
    foreground.position.set(0, 1.9, 0.01);

    return { background, foreground };
  }

  /**
   * Creates a muzzle flash effect (small emissive sphere).
   *
   * @returns THREE.Mesh configured as a muzzle flash
   */
  private createMuzzleFlash(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.08, 8, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 1.0, 0.35);
    mesh.visible = false;
    return mesh;
  }

  /**
   * Updates the health bar scale based on current health percentage.
   *
   * @param enemy - The enemy whose health bar to update
   */
  private updateHealthBar(enemy: EnemyInstance): void {
    // Hide when full or dead
    if (enemy.health >= enemy.maxHealth || enemy.isDying) {
      enemy.healthBarBackground.visible = false;
      enemy.healthBarForeground.visible = false;
      return;
    }

    // Show health bar
    enemy.healthBarBackground.visible = true;
    enemy.healthBarForeground.visible = true;

    // Calculate health percentage
    const percentage = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));

    // Scale foreground width
    enemy.healthBarForeground.scale.x = percentage;

    // Adjust position to keep left edge aligned
    const offset = (1 - percentage) * 0.24;
    enemy.healthBarForeground.position.x = -offset;
  }

  /**
   * Applies separation force between enemies to prevent overlap.
   *
   * @param enemy - The enemy to apply separation to
   * @param index - Index of the enemy in the array
   */
  private applySeparation(enemy: EnemyInstance, index: number): void {
    for (let j = 0; j < this.enemies.length; j++) {
      if (j === index) continue;

      const other = this.enemies[j];
      if (other.isDying) continue;

      const dx = enemy.position.x - other.position.x;
      const dz = enemy.position.z - other.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < SEPARATION_DISTANCE * SEPARATION_DISTANCE && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const pushForce = (SEPARATION_DISTANCE - dist) / dist * 0.5;

        enemy.position.x += dx * pushForce;
        enemy.position.z += dz * pushForce;
      }
    }
  }

  /**
   * Rotates the enemy model to face a direction.
   *
   * @param enemy - The enemy instance
   * @param direction - Direction vector to face
   */
  private faceDirection(enemy: EnemyInstance, direction: THREE.Vector3): void {
    // Models face +Z by default, so rotation.y = atan2(dirX, dirZ)
    enemy.model.rotation.y = Math.atan2(direction.x, direction.z);
  }

  /**
   * Clamps the enemy position to the map boundary.
   *
   * @param enemy - The enemy to clamp
   */
  private clampToBoundary(enemy: EnemyInstance): void {
    enemy.position.x = Math.max(-MAP_HALF_SIZE, Math.min(MAP_HALF_SIZE, enemy.position.x));
    enemy.position.z = Math.max(-MAP_HALF_SIZE, Math.min(MAP_HALF_SIZE, enemy.position.z));
  }

  /**
   * Pushes an enemy out of any colliding wall so it cannot walk through
   * geometry. Applies collide-with-walls, independent of the AI movement.
   *
   * @param enemy - The enemy to resolve
   */
  private resolveEnemyWalls(enemy: EnemyInstance): void {
    const resolved = this.collisionManager.resolvePointCollision(
      { x: enemy.position.x, z: enemy.position.z },
      ENEMY_COLLISION_RADIUS
    );
    enemy.position.x = resolved.x;
    enemy.position.z = resolved.z;
  }
}