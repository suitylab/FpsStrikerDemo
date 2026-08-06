import * as THREE from 'three';

/**
 * ScreenShake — Camera Shake System
 *
 * Manages camera offset with exponential decay for screen shake effects.
 * Uses a trauma value (0-1) that decays over time. The shake offset is
 * calculated as trauma^2 * maxOffset for a natural quadratic falloff.
 *
 * Supports:
 * - Small shakes (weapon fire) via addTrauma(0.1-0.3)
 * - Large shakes (grenade explosions) via addTrauma(0.5-1.0)
 *
 * The system generates pseudo-random offsets using sin/cos with time-based
 * frequencies and random phase offsets. This produces smooth, organic-looking
 * camera motion without per-frame allocations.
 */
export default class ScreenShake {
  /** Current trauma value (0-1). Higher = more intense shake. */
  private trauma: number = 0;

  /** Internal time accumulator for noise generation. */
  private time: number = 0;

  /** Trauma decay rate per second. */
  private readonly decayRate: number;

  /** Maximum position offset in meters (at trauma = 1). */
  private readonly maxPositionOffset: number;

  /** Maximum rotation offset in radians (at trauma = 1). */
  private readonly maxRotationOffset: number;

  /** Random phase offsets for position noise (X, Y, Z). */
  private readonly positionPhases: [number, number, number];

  /** Random phase offsets for rotation noise (X, Y, Z). */
  private readonly rotationPhases: [number, number, number];

  /** Position noise frequencies (X, Y, Z). */
  private readonly positionFrequencies: [number, number, number];

  /** Rotation noise frequencies (X, Y, Z). */
  private readonly rotationFrequencies: [number, number, number];

  /**
   * Creates a new ScreenShake system.
   *
   * @param decayRate - Trauma decay rate per second (default 2.5)
   * @param maxPositionOffset - Maximum position offset in meters (default 0.15)
   * @param maxRotationOffset - Maximum rotation offset in radians (default 0.05)
   */
  constructor(
    decayRate: number = 2.5,
    maxPositionOffset: number = 0.15,
    maxRotationOffset: number = 0.05
  ) {
    this.decayRate = Math.max(0, decayRate);
    this.maxPositionOffset = Math.max(0, maxPositionOffset);
    this.maxRotationOffset = Math.max(0, maxRotationOffset);

    // Generate random phase offsets for each axis
    this.positionPhases = [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ];
    this.rotationPhases = [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ];

    // Define noise frequencies for each axis (higher = more jitter)
    this.positionFrequencies = [12.0, 15.0, 10.0];
    this.rotationFrequencies = [18.0, 22.0, 16.0];
  }

  /**
   * Adds trauma to the shake system.
   * Trauma is clamped to a maximum of 1.0.
   *
   * @param amount - Amount of trauma to add (0-1)
   */
  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + Math.max(0, amount));
  }

  /**
   * Updates the shake system.
   * Decays trauma over time and advances the internal time accumulator.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  public update(deltaTime: number): void {
    // Clamp deltaTime to prevent huge jumps (e.g., when tab is inactive)
    const dt = Math.max(0, Math.min(deltaTime, 0.1));

    // Decay trauma linearly
    this.trauma = Math.max(0, this.trauma - this.decayRate * dt);

    // Advance time for noise generation
    this.time += dt;
  }

  /**
   * Fills the provided output vectors with the current camera offsets.
   * The position offset is in meters, the rotation offset is in radians.
   *
   * @param outPosition - Vector3 to receive the position offset
   * @param outRotation - Vector3 to receive the rotation offset (Euler angles)
   */
  public getOffset(outPosition: THREE.Vector3, outRotation: THREE.Vector3): void {
    // Calculate shake intensity with quadratic falloff
    const intensity = this.trauma * this.trauma;

    // If trauma is zero, zero out the offsets
    if (intensity <= 0.0001) {
      outPosition.set(0, 0, 0);
      outRotation.set(0, 0, 0);
      return;
    }

    // --- Position Offset ---
    // Use sin/cos with different frequencies and phases for organic motion
    const posX = Math.sin(this.time * this.positionFrequencies[0] + this.positionPhases[0]);
    const posY = Math.cos(this.time * this.positionFrequencies[1] + this.positionPhases[1]);
    const posZ = Math.sin(this.time * this.positionFrequencies[2] + this.positionPhases[2]);

    outPosition.set(
      posX * this.maxPositionOffset * intensity,
      posY * this.maxPositionOffset * intensity,
      posZ * this.maxPositionOffset * intensity
    );

    // --- Rotation Offset ---
    // Use different frequencies for rotation to avoid correlated motion
    const rotX = Math.sin(this.time * this.rotationFrequencies[0] + this.rotationPhases[0]);
    const rotY = Math.cos(this.time * this.rotationFrequencies[1] + this.rotationPhases[1]);
    const rotZ = Math.sin(this.time * this.rotationFrequencies[2] + this.rotationPhases[2]);

    outRotation.set(
      rotX * this.maxRotationOffset * intensity,
      rotY * this.maxRotationOffset * intensity,
      rotZ * this.maxRotationOffset * intensity
    );
  }

  /**
   * Returns the current trauma value.
   *
   * @returns Current trauma (0-1)
   */
  public getTrauma(): number {
    return this.trauma;
  }

  /**
   * Resets the shake system to its initial state.
   * Zeroes trauma and time.
   */
  public reset(): void {
    this.trauma = 0;
    this.time = 0;
  }

  /**
   * Disposes of the shake system.
   * No external resources to clean up (no event listeners, DOM elements, or GPU resources).
   * Provided for API symmetry with other game systems.
   */
  public dispose(): void {
    this.reset();
  }
}