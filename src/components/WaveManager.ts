import * as THREE from 'three';
import EnemySystem from './EnemySystem';

/**
 * WaveManager — Tower Defense Survival Mode (Phase 7)
 *
 * Manages the wave-based survival game flow:
 * - Wave state machine: INTERMISSION → WAVE_ACTIVE → WAVE_CLEARED → INTERMISSION
 * - Wave count scaling: Wave N = 5 + (N × 3) enemies
 * - Enemy composition scaling based on wave number
 * - Difficulty scaling (health +5%/wave, damage +2%/wave)
 * - Spawn groups of 3-5 enemies at random edge points, staggered
 * - Wave announcements (HTML overlay with fade in/out)
 * - Game over callback when player dies
 */

/** Wave state machine states. */
export enum WaveState {
  /** Waiting between waves (10s countdown). */
  INTERMISSION = 'INTERMISSION',
  /** Wave is active, enemies are spawning and fighting. */
  WAVE_ACTIVE = 'WAVE_ACTIVE',
  /** All enemies in the wave are dead, showing cleared announcement. */
  WAVE_CLEARED = 'WAVE_CLEARED',
}

/** Enemy type identifiers used for spawn queue building. */
type EnemyType = 'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide';

/** Configuration constants for wave management. */
const INTERMISSION_DURATION = 10; // Seconds between waves
const WAVE_CLEARED_DURATION = 3; // Seconds to show "WAVE X CLEARED"
const WAVE_START_DURATION = 3; // Seconds to show "WAVE X INCOMING"
const SPAWN_GROUP_MIN = 3; // Minimum enemies per spawn group
const SPAWN_GROUP_MAX = 5; // Maximum enemies per spawn group
const SPAWN_GROUP_INTERVAL = 2.0; // Seconds between spawn groups (matches EnemySystem)

export default class WaveManager {
  private scene: THREE.Scene;
  private enemySystem: EnemySystem;
  private onWaveChangeCallback: (waveNumber: number) => void;
  private onGameOverCallback: (wavesSurvived: number, totalKills: number) => void;
  private onWaveClearedCallback: () => void;

  /** Current wave number (1-based). */
  private waveNumber: number = 0;
  /** Current wave state. */
  private state: WaveState = WaveState.INTERMISSION;
  /** Total enemies to spawn in the current wave. */
  private totalEnemiesForWave: number = 0;
  /** Number of enemies remaining (alive + queued). */
  private enemiesRemaining: number = 0;
  /** Spawn queue for the current wave. */
  private spawnQueue: EnemyType[] = [];
  /** Timer for spawn group staggering. */
  private spawnGroupTimer: number = 0;
  /** Timer for state transitions (intermission, cleared announcement). */
  private stateTimer: number = 0;
  /** Whether the wave manager is running. */
  private isRunning: boolean = false;
  /** Whether the game is over. */
  private isGameOver: boolean = false;
  /** Total kills accumulated across all waves. */
  private totalKills: number = 0;
  /** Kills in the current wave (for tracking). */
  private waveKills: number = 0;
  /** Whether the game over screen has been shown. */
  private gameOverShown: boolean = false;

  // --- Announcement Overlay DOM Elements ---
  private overlayElement: HTMLElement | null = null;
  private announcementElement: HTMLElement | null = null;
  private countdownElement: HTMLElement | null = null;
  private gameOverElement: HTMLElement | null = null;

  /**
   * @param scene - The THREE.Scene (used for context, overlay is DOM-based)
   * @param enemySystem - The EnemySystem to drive spawning
   * @param onWaveChange - Callback when the wave number changes
   * @param onGameOver - Callback when the player dies (waves survived, total kills)
   * @param onWaveCleared - Callback when a wave is cleared
   */
  constructor(
    scene: THREE.Scene,
    enemySystem: EnemySystem,
    onWaveChange: (waveNumber: number) => void,
    onGameOver: (wavesSurvived: number, totalKills: number) => void,
    onWaveCleared: () => void
  ) {
    this.scene = scene;
    this.enemySystem = enemySystem;
    this.onWaveChangeCallback = onWaveChange;
    this.onGameOverCallback = onGameOver;
    this.onWaveClearedCallback = onWaveCleared;

    // Create the announcement overlay DOM structure
    this.createOverlay();
  }

  /**
   * Returns the current wave number.
   *
   * @returns Current wave number (1-based, 0 before start)
   */
  public getWaveNumber(): number {
    return this.waveNumber;
  }

  /**
   * Returns the number of enemies remaining in the current wave.
   * Includes both alive enemies and queued spawns.
   *
   * @returns Number of enemies remaining
   */
  public getEnemiesRemaining(): number {
    return this.enemiesRemaining;
  }

  /**
   * Returns the total number of enemies for the current wave.
   *
   * @returns Total enemies in the current wave
   */
  public getTotalEnemiesForWave(): number {
    return this.totalEnemiesForWave;
  }

  /**
   * Returns the wave progress as a value between 0 and 1.
   * 0 = wave just started, 1 = wave cleared.
   *
   * @returns Wave progress (0-1)
   */
  public getWaveProgress(): number {
    if (this.totalEnemiesForWave === 0) return 0;
    const killed = this.totalEnemiesForWave - this.enemiesRemaining;
    return Math.max(0, Math.min(1, killed / this.totalEnemiesForWave));
  }

  /**
   * Returns the current wave state.
   *
   * @returns Current WaveState
   */
  public getState(): WaveState {
    return this.state;
  }

  /**
   * Starts the wave manager. Begins with Wave 1.
   * If the game is already running, this is a no-op.
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isGameOver = false;
    this.gameOverShown = false;
    this.waveNumber = 0;
    this.totalKills = 0;

    // Start with Wave 1 immediately (no initial intermission)
    this.startNextWave();
  }

  /**
   * Resets the wave manager to its initial state.
   * Stops all spawning, clears the queue, and resets counters.
   */
  public reset(): void {
    // Stop spawning
    this.enemySystem.stopSpawning();
    this.enemySystem.reset();

    // Reset state
    this.isRunning = false;
    this.isGameOver = false;
    this.gameOverShown = false;
    this.waveNumber = 0;
    this.totalEnemiesForWave = 0;
    this.enemiesRemaining = 0;
    this.spawnQueue = [];
    this.spawnGroupTimer = 0;
    this.stateTimer = 0;
    this.totalKills = 0;
    this.waveKills = 0;
    this.state = WaveState.INTERMISSION;

    // Hide all overlays
    this.hideAnnouncement();
    this.hideCountdown();
    this.hideGameOver();
  }

  /**
   * Disposes of all resources held by the WaveManager.
   * Removes the overlay from the DOM.
   */
  public dispose(): void {
    this.reset();

    // Remove overlay from DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    this.overlayElement = null;
    this.announcementElement = null;
    this.countdownElement = null;
    this.gameOverElement = null;
  }

  /**
   * Updates the wave manager. Called once per frame.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  public update(deltaTime: number): void {
    if (!this.isRunning || this.isGameOver) return;

    switch (this.state) {
      case WaveState.INTERMISSION:
        this.updateIntermission(deltaTime);
        break;
      case WaveState.WAVE_ACTIVE:
        this.updateWaveActive(deltaTime);
        break;
      case WaveState.WAVE_CLEARED:
        this.updateWaveCleared(deltaTime);
        break;
    }
  }

  /**
   * Called by external systems when the player dies.
   * Triggers the game over sequence.
   */
  public onPlayerDeath(): void {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.isRunning = false;

    // Stop spawning
    this.enemySystem.stopSpawning();

    // Hide announcements and countdown
    this.hideAnnouncement();
    this.hideCountdown();

        // Show game over screen
    this.showGameOver();
  }

  /**
   * Called by external systems when an enemy is killed.
   * Decrements the enemies remaining counter so the wave progress bar updates.
   */
  public onEnemyKilled(): void {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
  }

  // ==========================================================================
  // Private Methods — State Machine
  // ==========================================================================

  /**
   * Starts the next wave.
   * Increments wave number, builds the spawn queue, and begins spawning.
   */
  private startNextWave(): void {
    this.waveNumber++;
    this.waveKills = 0;

    // Calculate total enemies for this wave
    this.totalEnemiesForWave = 5 + (this.waveNumber * 3);
    this.enemiesRemaining = this.totalEnemiesForWave;

    // Build the spawn queue based on wave number
    this.buildSpawnQueue();

        // Apply difficulty scaling to the enemy system
    const healthMultiplier = this.calculateHealthMultiplier();
    this.enemySystem.setWaveMultiplier(healthMultiplier);
    this.enemySystem.setDamageMultiplier(this.calculateDamageMultiplier());

    // Notify wave change callback
    this.onWaveChangeCallback(this.waveNumber);

    // Show wave start announcement
    this.showAnnouncement(`WAVE ${this.waveNumber} INCOMING`, WAVE_START_DURATION);

    // Set state to WAVE_ACTIVE
    this.state = WaveState.WAVE_ACTIVE;
    this.spawnGroupTimer = 0;

    // Start spawning
    this.enemySystem.startSpawning();
  }

  /**
   * Updates the INTERMISSION state.
   * Counts down, then starts the next wave.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateIntermission(deltaTime: number): void {
    // Decrement state timer
    this.stateTimer -= deltaTime;

    // Update countdown display
    const secondsRemaining = Math.max(0, Math.ceil(this.stateTimer));
    this.updateCountdown(secondsRemaining);

    // When countdown reaches 0, start the next wave
    if (this.stateTimer <= 0) {
      this.hideCountdown();
      this.startNextWave();
    }
  }

  /**
   * Updates the WAVE_ACTIVE state.
   * Handles staggered spawn groups and wave clear detection.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateWaveActive(deltaTime: number): void {
    // Handle staggered spawn groups
    if (this.spawnQueue.length > 0) {
      this.spawnGroupTimer -= deltaTime;
      if (this.spawnGroupTimer <= 0) {
        this.spawnNextGroup();
        this.spawnGroupTimer = SPAWN_GROUP_INTERVAL;
      }
    }

        // Check if wave is cleared (all enemies dead and queue empty)
    const aliveEnemies = this.enemySystem.getEnemyCount();
    if (this.spawnQueue.length === 0 && aliveEnemies === 0) {
      // Wave cleared
      this.state = WaveState.WAVE_CLEARED;
      this.stateTimer = WAVE_CLEARED_DURATION;
      this.enemiesRemaining = 0;

      // Update total kills
      this.totalKills = this.enemySystem.getKillCount();

      // Reward player: wave cleared callback
      this.onWaveClearedCallback();

      // Show wave cleared announcement
      this.showAnnouncement(`WAVE ${this.waveNumber} CLEARED`, WAVE_CLEARED_DURATION);
    }
  }

  /**
   * Updates the WAVE_CLEARED state.
   * Waits for the announcement duration, then transitions to intermission.
   *
   * @param deltaTime - Time in seconds since the last frame
   */
  private updateWaveCleared(deltaTime: number): void {
    this.stateTimer -= deltaTime;

    // When announcement duration expires, go to intermission
    if (this.stateTimer <= 0) {
      this.hideAnnouncement();

      // Start intermission
      this.state = WaveState.INTERMISSION;
      this.stateTimer = INTERMISSION_DURATION;

      // Show countdown
      this.showCountdown(INTERMISSION_DURATION);
    }
  }

  // ==========================================================================
  // Private Methods — Spawn Queue Building
  // ==========================================================================

  /**
   * Builds the spawn queue for the current wave based on wave number.
   * Enemy composition scales with wave number:
   * - Wave 1-3: Grunts only
   * - Wave 4-6: Grunts + Rushers
   * - Wave 7-9: Grunts + Rushers + Shooters
   * - Wave 10-12: + Tanks
   * - Wave 13-15: + Snipers
   * - Wave 16+: + Suicide Bombers
   */
  private buildSpawnQueue(): void {
    this.spawnQueue = [];

    // Determine available enemy types based on wave number
    const availableTypes: EnemyType[] = ['grunt'];

    if (this.waveNumber >= 4) availableTypes.push('rusher');
    if (this.waveNumber >= 7) availableTypes.push('shooter');
    if (this.waveNumber >= 10) availableTypes.push('tank');
    if (this.waveNumber >= 13) availableTypes.push('sniper');
    if (this.waveNumber >= 16) availableTypes.push('suicide');

    // Build the queue with weighted distribution
    // Earlier types are more common, later types are rarer
    for (let i = 0; i < this.totalEnemiesForWave; i++) {
      // Weighted random selection
      const type = this.selectWeightedType(availableTypes);
      this.spawnQueue.push(type);
    }

    // Shuffle the queue for variety
    this.shuffleQueue();
  }

  /**
   * Selects an enemy type with weighted probability.
   * Earlier types in the list are more common.
   *
   * @param types - Available enemy types
   * @returns Selected enemy type
   */
  private selectWeightedType(types: EnemyType[]): EnemyType {
    // Weight: earlier types get higher weight
    const weights = types.map((_, index) => types.length - index);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;
    for (let i = 0; i < types.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return types[i];
      }
    }

    // Fallback to first type
    return types[0];
  }

  /**
   * Shuffles the spawn queue using Fisher-Yates algorithm.
   */
  private shuffleQueue(): void {
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
  }

  /**
   * Spawns the next group of enemies (3-5) from the queue.
   * Groups are spawned at staggered intervals.
   */
  private spawnNextGroup(): void {
    // Determine group size (3-5, but not more than remaining)
    const groupSize = Math.min(
      SPAWN_GROUP_MIN + Math.floor(Math.random() * (SPAWN_GROUP_MAX - SPAWN_GROUP_MIN + 1)),
      this.spawnQueue.length
    );

    // Queue the group to the enemy system
    for (let i = 0; i < groupSize; i++) {
      const type = this.spawnQueue.shift();
      if (type) {
        this.enemySystem.queueSpawn(type);
      }
    }
  }

  // ==========================================================================
  // Private Methods — Difficulty Scaling
  // ==========================================================================

  /**
   * Calculates the health multiplier for the current wave.
   * Health increases 5% per wave.
   * For waves beyond 15, additional +10% health per wave.
   *
   * @returns Health multiplier
   */
  private calculateHealthMultiplier(): number {
    let multiplier = 1 + (this.waveNumber - 1) * 0.05;

    // Additional +10% per wave beyond 15
    if (this.waveNumber > 15) {
      multiplier += (this.waveNumber - 15) * 0.10;
    }

    return multiplier;
  }

  /**
   * Calculates the damage multiplier for the current wave.
   * Damage increases 2% per wave.
   *
   * @returns Damage multiplier
   */
  private calculateDamageMultiplier(): number {
    return 1 + (this.waveNumber - 1) * 0.02;
  }

  // ==========================================================================
  // Private Methods — Announcement Overlay
  // ==========================================================================

  /**
   * Creates the announcement overlay DOM structure.
   * The overlay is a full-screen centered div with fade in/out animation.
   * It is appended to document.body to ensure it renders on top of the HUD.
   */
  private createOverlay(): void {
    // Create overlay container
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'wave-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      pointer-events: none;
      z-index: 1000;
      font-family: 'Arial Black', Arial, sans-serif;
      text-align: center;
    `;

    // Create announcement element (for WAVE X INCOMING / CLEARED)
    this.announcementElement = document.createElement('div');
    this.announcementElement.className = 'wave-announcement';
    this.announcementElement.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255, 200, 0, 0.8), 0 0 40px rgba(255, 200, 0, 0.4);
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      letter-spacing: 4px;
      text-transform: uppercase;
    `;
    this.overlayElement.appendChild(this.announcementElement);

    // Create countdown element (for NEXT WAVE IN Xs)
    this.countdownElement = document.createElement('div');
    this.countdownElement.className = 'wave-countdown';
    this.countdownElement.style.cssText = `
      font-size: 32px;
      font-weight: bold;
      color: #88ccff;
      text-shadow: 0 0 15px rgba(100, 180, 255, 0.6);
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      letter-spacing: 2px;
      margin-top: 20px;
    `;
    this.overlayElement.appendChild(this.countdownElement);

    // Create game over element
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.className = 'wave-game-over';
    this.gameOverElement.style.cssText = `
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      background: rgba(0, 0, 0, 0.85);
      padding: 40px 60px;
      border-radius: 10px;
      border: 2px solid #ff4444;
      box-shadow: 0 0 40px rgba(255, 0, 0, 0.3);
    `;
    this.overlayElement.appendChild(this.gameOverElement);

    // Append overlay to document body (on top of HUD)
    document.body.appendChild(this.overlayElement);
  }

  /**
   * Shows an announcement with fade in/out animation.
   *
   * @param text - The announcement text
   * @param duration - How long to show the announcement in seconds
   */
  private showAnnouncement(text: string, duration: number): void {
    if (!this.announcementElement) return;

    // Set text
    this.announcementElement.textContent = text;

    // Fade in
    this.announcementElement.style.opacity = '1';

    // Auto fade out after duration
    setTimeout(() => {
      if (this.announcementElement) {
        this.announcementElement.style.opacity = '0';
      }
    }, duration * 1000);
  }

  /**
   * Hides the announcement element.
   */
  private hideAnnouncement(): void {
    if (this.announcementElement) {
      this.announcementElement.style.opacity = '0';
    }
  }

  /**
   * Shows the countdown display.
   *
   * @param seconds - Initial countdown value in seconds
   */
  private showCountdown(seconds: number): void {
    if (!this.countdownElement) return;

    this.countdownElement.textContent = `NEXT WAVE IN ${Math.ceil(seconds)}s`;
    this.countdownElement.style.opacity = '1';
  }

  /**
   * Updates the countdown display with the current remaining time.
   *
   * @param seconds - Remaining seconds
   */
  private updateCountdown(seconds: number): void {
    if (!this.countdownElement) return;

    this.countdownElement.textContent = `NEXT WAVE IN ${seconds}s`;
  }

  /**
   * Hides the countdown display.
   */
  private hideCountdown(): void {
    if (this.countdownElement) {
      this.countdownElement.style.opacity = '0';
    }
  }

  /**
   * Shows the game over screen with stats.
   */
  private showGameOver(): void {
    if (!this.gameOverElement || this.gameOverShown) return;

    this.gameOverShown = true;

    // Build game over content
    this.gameOverElement.innerHTML = '';

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #ff4444;
      text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
      letter-spacing: 4px;
    `;
    title.textContent = 'GAME OVER';
    this.gameOverElement.appendChild(title);

    // Stats container
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 24px;
      color: #ffffff;
    `;
    this.gameOverElement.appendChild(statsContainer);

    // Waves survived
    const wavesSurvived = document.createElement('div');
    wavesSurvived.textContent = `WAVES SURVIVED: ${this.waveNumber}`;
    statsContainer.appendChild(wavesSurvived);

    // Total kills
    const totalKills = document.createElement('div');
    totalKills.textContent = `TOTAL KILLS: ${this.totalKills}`;
    statsContainer.appendChild(totalKills);

    // Show the game over element
    this.gameOverElement.style.display = 'flex';

    // Trigger the game over callback
    this.onGameOverCallback(this.waveNumber, this.totalKills);
  }

  /**
   * Hides the game over screen.
   */
  private hideGameOver(): void {
    if (this.gameOverElement) {
      this.gameOverElement.style.display = 'none';
    }
  }
}