import * as THREE from 'three';

/**
 * PlayerHealth — Player Health Tracking System (Phase 4)
 *
 * Tracks the player's health pool, applies damage from enemies,
 * handles healing, and manages the death state.
 *
 * Max health is 100 (per design doc Section 3.1).
 * Health cannot go below 0 or above maxHealth.
 * When health reaches 0, the player is marked as dead and the onDeath callback is triggered.
 */
export default class PlayerHealth {
  /** Maximum health value (100 per design doc). */
  private readonly maxHealthValue: number = 100;

  /** Current health value. */
  private currentHealth: number = 100;

  /** Whether the player is dead (health = 0). */
  private dead: boolean = false;

  /** Callback when health changes (for HUD updates). */
  private onHealthChangeCallback: (health: number, maxHealth: number) => void;

  /** Callback when player health reaches 0. */
  private onDeathCallback: () => void;

  /** Callback when player takes damage (for damage indicator feedback). */
  private onDamageTakenCallback: (damage: number, direction: THREE.Vector3 | null) => void;

  /**
   * @param onHealthChange - Callback when health changes (for HUD updates)
   * @param onDeath - Callback when player health reaches 0
   * @param onDamageTaken - Callback when player takes damage (for damage indicator feedback)
   */
  constructor(
    onHealthChange: (health: number, maxHealth: number) => void,
    onDeath: () => void,
    onDamageTaken: (damage: number, direction: THREE.Vector3 | null) => void
  ) {
    this.onHealthChangeCallback = onHealthChange;
    this.onDeathCallback = onDeath;
    this.onDamageTakenCallback = onDamageTaken;
  }

  /**
   * Returns the current health value.
   *
   * @returns Current health (0 to maxHealth)
   */
  public getHealth(): number {
    return this.currentHealth;
  }

  /**
   * Returns the maximum health value.
   *
   * @returns Max health (100)
   */
  public getMaxHealth(): number {
    return this.maxHealthValue;
  }

  /**
   * Returns whether the player is dead (health = 0).
   *
   * @returns True if the player is dead
   */
  public getIsDead(): boolean {
    return this.dead;
  }

  /**
   * Applies damage to the player.
   * Health is clamped to a minimum of 0.
   * If health reaches 0, the player is marked as dead and the onDeath callback is triggered.
   *
   * @param amount - Amount of damage to apply (must be non-negative)
   * @param direction - Optional direction the damage came from (for damage indicator feedback)
   */
  public takeDamage(amount: number, direction?: THREE.Vector3): void {
    // No-op if already dead (prevents double-death callbacks)
    if (this.dead) return;

    // Clamp damage to non-negative
    const damage = Math.max(0, amount);

    // No-op if damage is 0
    if (damage === 0) return;

    // Apply damage
    this.currentHealth = Math.max(0, this.currentHealth - damage);

    // Trigger damage taken callback (with direction or null)
    this.onDamageTakenCallback(damage, direction ?? null);

    // Trigger health change callback
    this.onHealthChangeCallback(this.currentHealth, this.maxHealthValue);

    // Check for death
    if (this.currentHealth === 0) {
      this.dead = true;
      this.onDeathCallback();
    }
  }

  /**
   * Restores health to the player.
   * Health is clamped to a maximum of maxHealth.
   * Cannot heal when dead.
   *
   * @param amount - Amount of health to restore (must be non-negative)
   */
  public heal(amount: number): void {
    // No-op if dead (cannot heal when dead)
    if (this.dead) return;

    // Clamp heal amount to non-negative
    const healAmount = Math.max(0, amount);

    // No-op if heal amount is 0
    if (healAmount === 0) return;

    // Apply healing
    this.currentHealth = Math.min(this.maxHealthValue, this.currentHealth + healAmount);

    // Trigger health change callback
    this.onHealthChangeCallback(this.currentHealth, this.maxHealthValue);
  }

  /**
   * Resets health to max and clears the dead state.
   * Triggers the health change callback to sync the HUD.
   */
  public reset(): void {
    this.currentHealth = this.maxHealthValue;
    this.dead = false;

    // Trigger health change callback to sync HUD
    this.onHealthChangeCallback(this.currentHealth, this.maxHealthValue);
  }
}