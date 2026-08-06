import { PlayerState, GameState } from '../types';

/**
 * Weapon HUD state passed from WeaponSystem for display.
 */
export interface WeaponHUDState {
  /** Display name of the active weapon. */
  weaponName: string;
  /** Current magazine ammo. */
  magazine: number;
  /** Current reserve ammo. */
  reserve: number;
  /** Whether the player is reloading. */
  reloading: boolean;
  /** Reload progress (0-1). */
  reloadProgress: number;
  /** Crosshair spread (0-1). */
  crosshairSpread: number;
    /** Whether the player is aiming down sights. */
  isADS: boolean;
  /** Current zoom level (1 for non-sniper). */
  zoomLevel: number;
  /** Maximum zoom level (1 for non-sniper, 8 for AWM). */
  maxZoomLevel: number;
  /** Current weapon index (0-5). */
  weaponIndex: number;
  /** Total number of weapons (6). */
  weaponCount: number;
  /** Names of all weapons. */
  weaponNames: string[];
  /** Ammo state of all weapons. */
  weaponAmmo: { magazine: number; reserve: number }[];
  /** Ownership flags for all weapons (index-aligned). */
  ownedWeapons: boolean[];
  /** Whether the active weapon has infinite reserve ammo. */
  infiniteReserve: boolean;
}

/**
 * HUD renders the heads-up display overlay:
 * - Game title, map name, and player position readout (top-left)
 * - FPS counter (top-right)
 * - Interaction hint (bottom-center, visible when pointer is unlocked)
 */
export default class HUD {
  private hudElement: HTMLElement;
  private playerState: PlayerState;

  // DOM element references for efficient updates
  private fpsElement: HTMLElement;
    private hintElement: HTMLElement;

  // Weapon HUD state
    private weaponState: WeaponHUDState = {
    weaponName: 'M9 PISTOL',
    magazine: 12,
    reserve: 48,
    reloading: false,
    reloadProgress: 0,
    crosshairSpread: 0.3,
    isADS: false,
    zoomLevel: 1,
    maxZoomLevel: 1,
    weaponIndex: 0,
    weaponCount: 6,
    weaponNames: ['M9 PISTOL', 'AK-47', 'MP5', 'M870', 'AWM', 'M249'],
    weaponAmmo: [
      { magazine: 12, reserve: 48 },
      { magazine: 30, reserve: 120 },
      { magazine: 30, reserve: 120 },
      { magazine: 6, reserve: 24 },
      { magazine: 5, reserve: 20 },
      { magazine: 100, reserve: 200 },
    ],
    ownedWeapons: [true, false, false, false, false, false],
    infiniteReserve: true,
  };

  // Crosshair element references
  private crosshairTop: HTMLElement;
  private crosshairBottom: HTMLElement;
  private crosshairLeft: HTMLElement;
  private crosshairRight: HTMLElement;

    // Weapon panel element references
  private weaponNameElement: HTMLElement;
  private ammoElement: HTMLElement;
  private reloadBarElement: HTMLElement;
    private reloadPromptElement: HTMLElement;

    // Phase 8: Pickup prompt element reference
  private pickupPromptElement: HTMLElement;

  // Phase 11: Grenade count element reference
  private grenadeCountElement: HTMLElement;
  private grenadeCount: number = 3;

    // Phase 4: Kill counter element reference
  private killCountElement: HTMLElement;

  // Phase 7: Wave number and progress bar element references
  private waveNumberElement: HTMLElement;
  private waveProgressFillElement: HTMLElement;
  private waveProgressTextElement: HTMLElement;

  // Phase 7: Wave state tracking
  private currentWaveNumber: number = 1;
  private waveProgress: number = 0;

  // Phase 4: Player health bar element references
  private healthBarFillElement: HTMLElement;
  private healthTextElement: HTMLElement;

    // Phase 4: Hit marker element reference and timer
  private hitMarkerElement: HTMLElement;
  private hitMarkerTimer: number = 0;
  private lastElapsedTime: number = 0;

  // Phase 5: Scope overlay, weapon slots, and zoom indicator elements
  private scopeOverlayElement: HTMLElement;
  private weaponSlotsElement: HTMLElement;
  private zoomIndicatorElement: HTMLElement;
  private weaponSlotElements: HTMLElement[] = [];

  /**
   * @param hudElement - The #hud container element
   * @param playerState - Player position/orientation state
   */
  constructor(hudElement: HTMLElement, playerState: PlayerState) {
    this.hudElement = hudElement;
    this.playerState = playerState;

    // Build the HUD DOM structure
    this.buildDOM();
  }

      /**
   * Updates the weapon HUD state from the WeaponSystem.
   *
   * @param state - The current weapon state to display
   */
    public setWeaponState(state: WeaponHUDState): void {
    this.weaponState = state;
  }

  /**
   * Updates the grenade count display.
   *
   * @param count - The current grenade count
   */
  public setGrenadeCount(count: number): void {
    this.grenadeCount = Math.max(0, count);
    if (this.grenadeCountElement) {
      this.grenadeCountElement.textContent = `GRENADES: ${this.grenadeCount}`;
    }
  }

    /**
   * Updates the kill counter display.
   *
   * @param count - The current kill count
   */
  public setKillCount(count: number): void {
    this.killCountElement.textContent = `KILLS: ${count}`;
  }

  /**
   * Updates the wave number display.
   *
   * @param waveNumber - The current wave number
   */
  public setWaveNumber(waveNumber: number): void {
    this.currentWaveNumber = waveNumber;
    this.waveNumberElement.textContent = `WAVE ${waveNumber}`;
  }

  /**
   * Updates the wave progress bar.
   *
   * @param progress - Wave progress as a value between 0 and 1
   */
  public setWaveProgress(progress: number): void {
    // Clamp progress to valid range
    this.waveProgress = Math.max(0, Math.min(1, progress));

    // Update fill width
    const percentage = Math.round(this.waveProgress * 100);
    this.waveProgressFillElement.style.width = `${percentage}%`;

    // Update text
    this.waveProgressTextElement.textContent = `${percentage}%`;
  }

  /**
   * Updates the player health bar display.
   *
   * @param health - Current health value
   * @param maxHealth - Maximum health value
   */
  public setPlayerHealth(health: number, maxHealth: number): void {
    // Clamp health to valid range
    const clampedHealth = Math.max(0, Math.min(maxHealth, health));

    // Calculate percentage (0-100)
    const percentage = maxHealth > 0 ? (clampedHealth / maxHealth) * 100 : 0;

    // Update fill width
    this.healthBarFillElement.style.width = `${percentage}%`;

    // Update text
    this.healthTextElement.textContent = `${Math.round(clampedHealth)}/${maxHealth}`;

    // Change fill color based on health level
    if (percentage <= 25) {
      this.healthBarFillElement.style.background = 'linear-gradient(90deg, #ff1744, #ff5252)';
    } else if (percentage <= 50) {
      this.healthBarFillElement.style.background = 'linear-gradient(90deg, #ff8f00, #ffc107)';
    } else {
      this.healthBarFillElement.style.background = 'linear-gradient(90deg, #00c853, #69f0ae)';
    }
  }

  /**
   * Shows a hit marker at the center of the screen.
   * White for normal hits, red for kills.
   * The marker auto-hides after 0.2 seconds.
   *
   * @param isKill - Whether the hit was a kill (red marker)
   */
  public showHitMarker(isKill: boolean): void {
    // Set color class
    this.hitMarkerElement.classList.remove('hud-hitmarker-hit', 'hud-hitmarker-kill');
    this.hitMarkerElement.classList.add(isKill ? 'hud-hitmarker-kill' : 'hud-hitmarker-hit');

        // Make visible
    this.hitMarkerElement.style.display = 'block';

    // Reset timer (0.2 seconds)
    this.hitMarkerTimer = 0.2;
  }

  /**
   * Shows the pickup interaction prompt (Phase 8).
   * Displays the given text in the center-bottom pickup prompt element.
   *
   * @param text - The prompt text to display (e.g. 'PRESS E TO PICK UP AMMO')
   */
  public showPickupPrompt(text: string): void {
    this.pickupPromptElement.textContent = text;
    this.pickupPromptElement.style.display = 'block';
  }

  /**
   * Hides the pickup interaction prompt (Phase 8).
   */
  public hidePickupPrompt(): void {
    this.pickupPromptElement.style.display = 'none';
  }

  /**
   * Construct the HUD overlay DOM structure inside the hud element.
   * Creates three panels: top-left (title + map name + position), top-right (FPS), bottom-center (hint).
   */
  private buildDOM(): void {
    // Clear any existing content
    this.hudElement.innerHTML = '';

    // --- Top-Left Panel: Title + Map Name + Player Position ---
    const topLeftPanel = document.createElement('div');
    topLeftPanel.className = 'hud-panel hud-panel-top-left';

    // Game title
    const title = document.createElement('h1');
    title.className = 'hud-title';
    title.textContent = 'FPS STRIKE SURVIVAL';
    topLeftPanel.appendChild(title);

        // Map name (new in Phase 2)
    const mapName = document.createElement('div');
    mapName.className = 'hud-map-name';
    mapName.textContent = 'TOWN STREET';
    topLeftPanel.appendChild(mapName);

    // Kill counter (Phase 4)
    const killCountLabel = document.createElement('div');
    killCountLabel.className = 'hud-label';
    killCountLabel.textContent = 'KILLS';
    topLeftPanel.appendChild(killCountLabel);

        this.killCountElement = document.createElement('div');
    this.killCountElement.className = 'hud-kill-count';
    this.killCountElement.textContent = 'KILLS: 0';
    topLeftPanel.appendChild(this.killCountElement);

    // Wave number (Phase 7)
    const waveNumberLabel = document.createElement('div');
    waveNumberLabel.className = 'hud-label';
    waveNumberLabel.textContent = 'WAVE';
    topLeftPanel.appendChild(waveNumberLabel);

    this.waveNumberElement = document.createElement('div');
    this.waveNumberElement.className = 'hud-wave-number';
    this.waveNumberElement.textContent = 'WAVE 1';
    topLeftPanel.appendChild(this.waveNumberElement);

    // Wave progress bar (Phase 7)
    const waveProgressContainer = document.createElement('div');
    waveProgressContainer.className = 'hud-wave-progress-bar-container';

    this.waveProgressFillElement = document.createElement('div');
    this.waveProgressFillElement.className = 'hud-wave-progress-bar-fill';
    this.waveProgressFillElement.style.width = '0%';
    waveProgressContainer.appendChild(this.waveProgressFillElement);

    topLeftPanel.appendChild(waveProgressContainer);

    this.waveProgressTextElement = document.createElement('div');
    this.waveProgressTextElement.className = 'hud-wave-progress-text';
    this.waveProgressTextElement.textContent = '0%';
    topLeftPanel.appendChild(this.waveProgressTextElement);

    this.hudElement.appendChild(topLeftPanel);

    // --- Top-Right Panel: FPS Counter ---
    const topRightPanel = document.createElement('div');
    topRightPanel.className = 'hud-panel hud-panel-top-right';

    const fpsLabel = document.createElement('div');
    fpsLabel.className = 'hud-label';
    fpsLabel.textContent = 'FPS';
    topRightPanel.appendChild(fpsLabel);

    this.fpsElement = document.createElement('div');
    this.fpsElement.className = 'hud-fps';
    this.fpsElement.textContent = '60';
    topRightPanel.appendChild(this.fpsElement);

    this.hudElement.appendChild(topRightPanel);

        // --- Bottom-Center Hint ---
    this.hintElement = document.createElement('div');
    this.hintElement.className = 'hud-hint';
    this.hintElement.textContent = 'CLICK TO LOOK AROUND — WASD TO MOVE';
    this.hudElement.appendChild(this.hintElement);

        // --- Hit Marker (center, Phase 4) ---
    this.hitMarkerElement = document.createElement('div');
    this.hitMarkerElement.className = 'hud-hitmarker';
    this.hitMarkerElement.style.display = 'none';

    // Hit marker cross lines (X shape)
    const hitMarkerLine1 = document.createElement('div');
    hitMarkerLine1.className = 'hud-hitmarker-line hud-hitmarker-line-1';
    this.hitMarkerElement.appendChild(hitMarkerLine1);

    const hitMarkerLine2 = document.createElement('div');
    hitMarkerLine2.className = 'hud-hitmarker-line hud-hitmarker-line-2';
    this.hitMarkerElement.appendChild(hitMarkerLine2);

        this.hudElement.appendChild(this.hitMarkerElement);

    // --- Scope Overlay (Phase 5, hidden by default) ---
    this.scopeOverlayElement = document.createElement('div');
    this.scopeOverlayElement.className = 'hud-scope-overlay';
    this.scopeOverlayElement.style.display = 'none';

    // Scope crosshair (circle with cross lines)
    const scopeCrosshair = document.createElement('div');
    scopeCrosshair.className = 'hud-scope-crosshair';

    // Scope crosshair circle
    const scopeCircle = document.createElement('div');
    scopeCircle.className = 'hud-scope-circle';
    scopeCrosshair.appendChild(scopeCircle);

    // Scope crosshair lines (horizontal and vertical)
    const scopeLineH = document.createElement('div');
    scopeLineH.className = 'hud-scope-line hud-scope-line-h';
    scopeCrosshair.appendChild(scopeLineH);

    const scopeLineV = document.createElement('div');
    scopeLineV.className = 'hud-scope-line hud-scope-line-v';
    scopeCrosshair.appendChild(scopeLineV);

    this.scopeOverlayElement.appendChild(scopeCrosshair);
    this.hudElement.appendChild(this.scopeOverlayElement);

    // --- Crosshair (center) ---
    const crosshairContainer = document.createElement('div');
    crosshairContainer.className = 'hud-crosshair';
    crosshairContainer.id = 'crosshair-container';

    // Center dot
    const crosshairDot = document.createElement('div');
    crosshairDot.className = 'hud-crosshair-dot';
    crosshairContainer.appendChild(crosshairDot);

    // Four lines
    this.crosshairTop = document.createElement('div');
    this.crosshairTop.className = 'hud-crosshair-line hud-crosshair-top';
    crosshairContainer.appendChild(this.crosshairTop);

    this.crosshairBottom = document.createElement('div');
    this.crosshairBottom.className = 'hud-crosshair-line hud-crosshair-bottom';
    crosshairContainer.appendChild(this.crosshairBottom);

    this.crosshairLeft = document.createElement('div');
    this.crosshairLeft.className = 'hud-crosshair-line hud-crosshair-left';
    crosshairContainer.appendChild(this.crosshairLeft);

    this.crosshairRight = document.createElement('div');
    this.crosshairRight.className = 'hud-crosshair-line hud-crosshair-right';
    crosshairContainer.appendChild(this.crosshairRight);

    this.hudElement.appendChild(crosshairContainer);

    // --- Bottom-Right Weapon Panel ---
    const weaponPanel = document.createElement('div');
    weaponPanel.className = 'hud-panel hud-panel-bottom-right';

    // Weapon name
    const weaponNameLabel = document.createElement('div');
    weaponNameLabel.className = 'hud-label';
    weaponNameLabel.textContent = 'WEAPON';
    weaponPanel.appendChild(weaponNameLabel);

    this.weaponNameElement = document.createElement('div');
    this.weaponNameElement.className = 'hud-weapon-name';
    this.weaponNameElement.textContent = 'M9 PISTOL';
    weaponPanel.appendChild(this.weaponNameElement);

        // Ammo display
    this.ammoElement = document.createElement('div');
    this.ammoElement.className = 'hud-ammo';
    this.ammoElement.textContent = '12 / 48';
    weaponPanel.appendChild(this.ammoElement);

    // Grenade count display (Phase 11)
    this.grenadeCountElement = document.createElement('div');
    this.grenadeCountElement.className = 'hud-grenade-count';
    this.grenadeCountElement.textContent = `GRENADES: ${this.grenadeCount}`;
    weaponPanel.appendChild(this.grenadeCountElement);

    // Reload progress bar
    const reloadBarContainer = document.createElement('div');
    reloadBarContainer.className = 'hud-reload-bar-container';
    this.reloadBarElement = document.createElement('div');
    this.reloadBarElement.className = 'hud-reload-bar';
    this.reloadBarElement.style.width = '0%';
    reloadBarContainer.appendChild(this.reloadBarElement);
    weaponPanel.appendChild(reloadBarContainer);

        this.hudElement.appendChild(weaponPanel);

    // --- Bottom-Left Health Panel (Phase 4) ---
    const healthPanel = document.createElement('div');
    healthPanel.className = 'hud-panel hud-panel-bottom-left';

    // HP label
    const hpLabel = document.createElement('div');
    hpLabel.className = 'hud-label';
    hpLabel.textContent = 'HP';
    healthPanel.appendChild(hpLabel);

    // Health bar container
    const healthBarContainer = document.createElement('div');
    healthBarContainer.className = 'hud-health-bar-container';

    // Health bar fill
    this.healthBarFillElement = document.createElement('div');
    this.healthBarFillElement.className = 'hud-health-bar-fill';
    this.healthBarFillElement.style.width = '100%';
    healthBarContainer.appendChild(this.healthBarFillElement);

    healthPanel.appendChild(healthBarContainer);

    // Health text
    this.healthTextElement = document.createElement('div');
    this.healthTextElement.className = 'hud-health-text';
    this.healthTextElement.textContent = '100/100';
    healthPanel.appendChild(this.healthTextElement);

        this.hudElement.appendChild(healthPanel);

    // --- Weapon Slots (Phase 5, bottom-center) ---
    this.weaponSlotsElement = document.createElement('div');
    this.weaponSlotsElement.className = 'hud-weapon-slots';

    // Short names for weapon slots
    const weaponSlotNames = ['M9', 'AK', 'MP5', 'M870', 'AWM', 'M249'];

    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'hud-weapon-slot';
      slot.dataset.index = String(i);

      // Slot number
      const slotNumber = document.createElement('div');
      slotNumber.className = 'hud-weapon-slot-number';
      slotNumber.textContent = String(i + 1);
      slot.appendChild(slotNumber);

      // Slot name
      const slotName = document.createElement('div');
      slotName.className = 'hud-weapon-slot-name';
      slotName.textContent = weaponSlotNames[i];
      slot.appendChild(slotName);

      // Slot ammo
      const slotAmmo = document.createElement('div');
      slotAmmo.className = 'hud-weapon-slot-ammo';
      slotAmmo.textContent = '0/0';
      slot.appendChild(slotAmmo);

      this.weaponSlotsElement.appendChild(slot);
      this.weaponSlotElements.push(slot);
    }

    // Mark first slot as active by default
    if (this.weaponSlotElements.length > 0) {
      this.weaponSlotElements[0].classList.add('active');
    }

    this.hudElement.appendChild(this.weaponSlotsElement);

    // --- Zoom Indicator (Phase 5, hidden by default) ---
    this.zoomIndicatorElement = document.createElement('div');
    this.zoomIndicatorElement.className = 'hud-zoom-indicator';
    this.zoomIndicatorElement.style.display = 'none';
    this.zoomIndicatorElement.textContent = '1x';
    this.hudElement.appendChild(this.zoomIndicatorElement);

    // --- Reload Prompt (hidden by default) ---
        this.reloadPromptElement = document.createElement('div');
    this.reloadPromptElement.className = 'hud-reload-prompt';
    this.reloadPromptElement.textContent = 'PRESS R TO RELOAD';
    this.reloadPromptElement.style.display = 'none';
    this.hudElement.appendChild(this.reloadPromptElement);

    // --- Pickup Prompt (Phase 8, hidden by default) ---
    this.pickupPromptElement = document.createElement('div');
    this.pickupPromptElement.className = 'hud-pickup-prompt';
    this.pickupPromptElement.textContent = '';
    this.pickupPromptElement.style.display = 'none';
    this.hudElement.appendChild(this.pickupPromptElement);
  }

    /**
   * Updates the crosshair line positions based on the current spread.
   * Lines expand outward from center based on crosshairSpread (0-1).
   * Base gap is 6px, max gap is 30px. When ADS, lines contract to 4px.
   */
  private updateCrosshair(): void {
    // Calculate gap based on spread
    let gap: number;
    if (this.weaponState.isADS) {
      gap = 4; // Tight gap when ADS
    } else {
      // Interpolate between 6px (spread 0) and 30px (spread 1)
      gap = 6 + (30 - 6) * this.weaponState.crosshairSpread;
    }

    // Position the four lines
    this.crosshairTop.style.transform = `translate(-50%, -100%) translateY(-${gap}px)`;
    this.crosshairBottom.style.transform = `translate(-50%, 0) translateY(${gap}px)`;
    this.crosshairLeft.style.transform = `translate(-100%, -50%) translateX(-${gap}px)`;
    this.crosshairRight.style.transform = `translate(0, -50%) translateX(${gap}px)`;
  }

  /**
   * Updates the weapon panel: weapon name, ammo, reload progress bar, and reload prompt.
   */
  private updateWeaponPanel(): void {
    // Update weapon name
    this.weaponNameElement.textContent = this.weaponState.weaponName;

        // Update ammo display
    this.ammoElement.textContent = this.weaponState.infiniteReserve
      ? `${this.weaponState.magazine} / ${String.fromCharCode(0x221e)}`
      : `${this.weaponState.magazine} / ${this.weaponState.reserve}`;

    // Update grenade count display
    if (this.grenadeCountElement) {
      this.grenadeCountElement.textContent = `GRENADES: ${this.grenadeCount}`;
    }

    // Update reload progress bar
    const progressPercent = Math.round(this.weaponState.reloadProgress * 100);
    this.reloadBarElement.style.width = `${progressPercent}%`;

    // Show/hide reload prompt
    // Show when magazine is empty and not reloading
    const shouldShowPrompt = this.weaponState.magazine === 0 && !this.weaponState.reloading;
    this.reloadPromptElement.style.display = shouldShowPrompt ? 'block' : 'none';

    // Add/remove flash animation class
    if (shouldShowPrompt) {
      this.reloadPromptElement.classList.add('hud-reload-prompt-flash');
    } else {
      this.reloadPromptElement.classList.remove('hud-reload-prompt-flash');
    }
  }

      /**
   * Updates the scope overlay visibility.
   * Shows the sniper scope (black vignette + crosshair) when ADS with 8x zoom.
   */
  private updateScopeOverlay(): void {
    const shouldShow = this.weaponState.isADS && this.weaponState.maxZoomLevel > 1;
    this.scopeOverlayElement.style.display = shouldShow ? 'block' : 'none';
  }

  /**
   * Updates the weapon slots at the bottom-center of the screen.
   * Highlights the active weapon and updates ammo counts for all weapons.
   */
  private updateWeaponSlots(): void {
    for (let i = 0; i < this.weaponSlotElements.length; i++) {
      const slot = this.weaponSlotElements[i];

      // Toggle active class (only for owned weapons)
      const owned = (this.weaponState.ownedWeapons && this.weaponState.ownedWeapons[i]) ?? false;
      slot.classList.toggle('active', owned && i === this.weaponState.weaponIndex);
      slot.classList.toggle('locked', !owned);

      // Update ammo text if weapon data is available
      if (this.weaponState.weaponAmmo && i < this.weaponState.weaponAmmo.length) {
        const ammo = this.weaponState.weaponAmmo[i];
        const ammoElement = slot.querySelector('.hud-weapon-slot-ammo');
        if (ammoElement) {
          // Weapon index 0 has infinite reserve ammo.
          ammoElement.textContent = owned
            ? (i === 0
                ? `${ammo.magazine}/${String.fromCharCode(0x221e)}`
                : `${ammo.magazine}/${ammo.reserve}`)
            : 'LOCKED';
        }
      }
    }
  }

  /**
   * Updates the zoom indicator near the center-bottom of the screen.
   * Shows the current zoom level when ADS with a sniper rifle.
   */
  private updateZoomIndicator(): void {
    const shouldShow = this.weaponState.isADS && this.weaponState.zoomLevel > 1;
    this.zoomIndicatorElement.style.display = shouldShow ? 'block' : 'none';
    if (shouldShow) {
      this.zoomIndicatorElement.textContent = `${this.weaponState.zoomLevel}x`;
    }
  }

  /**
   * Update the HUD display. Called once per frame.
   *
   * @param gameState - Current game state (FPS, elapsed time, etc.)
   * @param isPointerLocked - Whether pointer lock is currently active
   */
  public update(gameState: GameState, isPointerLocked: boolean): void {
    // --- Update Hit Marker Timer ---
    // Compute delta time from elapsed time
    const deltaTime = gameState.elapsedTime - this.lastElapsedTime;
    this.lastElapsedTime = gameState.elapsedTime;

    // Decrement hit marker timer and hide when expired
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= deltaTime;
      if (this.hitMarkerTimer <= 0) {
        this.hitMarkerElement.style.display = 'none';
      }
    }

    // --- Update FPS Counter ---
    // Guard against NaN (can happen on the very first frame)
    const fps = Number.isFinite(gameState.fps) ? Math.round(gameState.fps) : 0;
    this.fpsElement.textContent = String(fps);

        // --- Toggle Hint Visibility ---
    // Show hint when pointer is unlocked, hide when locked
    this.hintElement.style.display = isPointerLocked ? 'none' : 'block';

    // --- Update Crosshair ---
    this.updateCrosshair();

        // --- Update Weapon Panel ---
    this.updateWeaponPanel();

    // --- Update Phase 5 Elements ---
    this.updateScopeOverlay();
    this.updateWeaponSlots();
    this.updateZoomIndicator();
  }
}