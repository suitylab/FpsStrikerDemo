import * as THREE from 'three';
import { PlayerState, InputState, GameState as GameStateType } from './types';
import PlayerController from './components/PlayerController';
import HUD from './components/HUD';
import MapManager from './components/MapManager';
import CollisionManager from './components/CollisionManager';
import { createSkyTexture } from './utils/TextureFactory';
import WeaponSystem from './components/WeaponSystem';
import { WeaponHUDState } from './components/HUD';
import EnemySystem from './components/EnemySystem';
import PlayerHealth from './components/PlayerHealth';
import WaveManager from './components/WaveManager';
import LootSystem from './components/LootSystem';
import GameStateManager, { GameState } from './components/GameStateManager';
import ScreenShake from './components/ScreenShake';
import GrenadeSystem from './components/GrenadeSystem';

/**
 * FPS Strike Survival — Phase 11: Final Polish & Balancing
 *
 * Entry point that initializes the THREE.js renderer, scene, camera,
 * MapManager (3 maps), collision system, lighting, skybox, player controller,
 * HUD, weapon system, enemy system, wave manager, loot system, screen shake,
 * grenade system, and the complete game state machine
 * (MAIN_MENU → MAP_SELECT → PLAYING ⇄ PAUSED → GAME_OVER).
 */
function init(): void {
  // --- Get the #app container ---
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('Fatal: #app container not found in the DOM.');
    return;
  }

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a12); // Dark sky color
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  appContainer.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Sky Texture ---
  const skyTexture = createSkyTexture();
  scene.background = skyTexture;

  // --- Skybox Sphere (immersive sky) ---
  const skyboxGeometry = new THREE.SphereGeometry(400, 32, 16);
  const skyboxMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
  });
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  skybox.name = 'Skybox';
  skybox.castShadow = false;
  skybox.receiveShadow = false;
  scene.add(skybox);

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // Add camera to scene so weapon models (children of camera) are rendered
  scene.add(camera);

  // --- Collision Manager ---
  const collisionManager = new CollisionManager();

  // --- Map Manager (Phase 9: 3 maps) ---
  const mapManager = new MapManager();

  // --- Game State Initialization ---
  // Player state: spawn at center, eye height 1.7m (reset per map in startGame)
  const playerState: PlayerState = {
    position: { x: 0, y: 1.7, z: 0 },
    yaw: 0,
    pitch: 0,
    velocity: { x: 0, y: 0, z: 0 },
    speed: 5,
    eyeHeight: 1.7,
  };

  // Input state: no keys pressed, no mouse movement, pointer unlocked
  const inputState: InputState = {
    keys: {},
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    isPointerLocked: false,
    sensitivity: 0.002,
    wheelDelta: 0,
  };

  // Game state: running, zero elapsed time, zero frames
  const gameState: GameStateType = {
    isRunning: true,
    elapsedTime: 0,
    frameCount: 0,
    fps: 0,
    lastTime: performance.now(),
  };

  // --- Screen Shake System (Phase 11) ---
  const screenShake = new ScreenShake(2.5, 0.15, 0.05);

  // --- Player Controller (pointer lock + WASD movement + collision + screen shake) ---
  const playerController = new PlayerController(
    camera,
    renderer.domElement,
    playerState,
    inputState,
    collisionManager,
    screenShake
  );

  // --- HUD (title, position, FPS overlay) ---
  const hudElement = document.getElementById('hud');
  if (!hudElement) {
    console.error('Fatal: #hud element not found in the DOM.');
    return;
  }
  const hud = new HUD(hudElement, playerState);

  // --- Game State Manager (Phase 10) ---
  const gameStateManager = new GameStateManager();

  // --- Damage Indicator & Low Health Vignette DOM Elements (Phase 10) ---
  // Create damage indicator container
  const damageIndicator = document.createElement('div');
  damageIndicator.className = 'damage-indicator';
  damageIndicator.id = 'damage-indicator';
  damageIndicator.style.display = 'none';
  hudElement.appendChild(damageIndicator);

  // Create damage indicator flash child
  const damageIndicatorFlash = document.createElement('div');
  damageIndicatorFlash.className = 'damage-indicator-flash';
  damageIndicator.appendChild(damageIndicatorFlash);

  // Create low health vignette
  const lowHealthVignette = document.createElement('div');
  lowHealthVignette.className = 'low-health-vignette';
  lowHealthVignette.id = 'low-health-vignette';
  lowHealthVignette.style.display = 'none';
  hudElement.appendChild(lowHealthVignette);

  // --- Wave Manager (Phase 7) ---
  let waveManager: WaveManager | null = null;

  // --- Weapon System (Phase 3) ---
  let weaponSystem: WeaponSystem | null = null;

  // --- Loot System (Phase 8) ---
  let lootSystem: LootSystem | null = null;

  // --- Grenade System (Phase 11) ---
  let grenadeSystem: GrenadeSystem | null = null;

  // --- Player Health (Phase 4) ---
  const playerHealth = new PlayerHealth(
    (health, maxHealth) => {
      hud.setPlayerHealth(health, maxHealth);
      // Update low health vignette visibility
      if (lowHealthVignette) {
        lowHealthVignette.style.display = health < 30 ? 'block' : 'none';
      }
    },
    () => {
      // Player died — trigger game over sequence
      if (waveManager) {
        waveManager.onPlayerDeath();
      }
      // Transition to GAME_OVER state
      gameStateManager.toGameOver();
    },
    (damage, direction) => {
      // Show damage indicator with direction
      showDamageIndicator(direction);
    }
  );

  // --- Enemy System (Phase 4) ---
  const enemySystem = new EnemySystem(
    scene,
    () => camera.getWorldPosition(new THREE.Vector3()),
    (damage, direction) => {
      // Pass the attack direction to the health system so the damage
      // indicator can show which direction the attack came from.
      playerHealth.takeDamage(damage, direction);
    },
    (enemyId: number) => {
      hud.setKillCount(enemySystem.getKillCount());
      if (waveManager) {
        waveManager.onEnemyKilled();
      }
      // Phase 8: Trigger loot drop at enemy death position
      const enemies = enemySystem.getEnemies();
      const deadEnemy = enemies.find((e) => e.id === enemyId);
      if (deadEnemy && lootSystem) {
        lootSystem.onEnemyKilled(deadEnemy.position.clone());
      }
    },
    (isKill) => {
      hud.showHitMarker(isKill);
    },
    collisionManager,
    1.0
  );

  // --- Wave Manager (Phase 7) ---
  waveManager = new WaveManager(
    scene,
    enemySystem,
    (waveNumber) => {
      hud.setWaveNumber(waveNumber);
    },
    (wavesSurvived, totalKills) => {
      // Update game over stats
      const wavesElement = document.getElementById('game-over-waves');
      const killsElement = document.getElementById('game-over-kills');
      if (wavesElement) {
        wavesElement.textContent = String(wavesSurvived);
      }
      if (killsElement) {
        killsElement.textContent = String(totalKills);
      }
    }
  );

  // --- Raycaster for enemy damage detection (Phase 4) ---
  const raycaster = new THREE.Raycaster();

  /**
   * Handles weapon fire by raycasting against all enemies.
   * Called by WeaponSystem when the weapon fires.
   *
   * Bullets are blocked by map walls: each ray is first cast against the
   * collision manager's colliders. Any wall hit closer than an enemy stops
   * the bullet, so firing through walls is impossible.
   */
  function handleWeaponFire(rayOrigin: THREE.Vector3, rayDirections: THREE.Vector3[]): void {
    if (!weaponSystem) return;

    const damage = weaponSystem.getActiveWeaponDamage();
    const enemies = enemySystem.getEnemies();
    for (const rayDir of rayDirections) {
      raycaster.set(rayOrigin, rayDir);

      // Distance to the nearest wall along this ray (if any).
      const wallDistance = collisionManager.getWallHitDistance(rayOrigin, rayDir);

      // Find the closest enemy hit in front of any wall.
      let bestEnemy: number | null = null;
      let bestEnemyDist = Infinity;
      for (const enemy of enemies) {
        if (enemy.isDying) continue;
        const intersects = raycaster.intersectObject(enemy.model, true);
        if (intersects.length > 0) {
          const dist = intersects[0].distance;
          // Enemy is only a valid target if it is nearer than the wall (if any).
          if ((wallDistance === null || dist <= wallDistance) && dist < bestEnemyDist) {
            bestEnemy = enemy.id;
            bestEnemyDist = dist;
          }
        }
      }

      if (bestEnemy !== null) {
        enemySystem.damageEnemy(bestEnemy, damage);
      }
    }
  }

  // --- Weapon System (M9 + AK-47) ---
  // Creates weapon models, handles firing, ADS, reload, switching, and ammo
  // Phase 11: Pass ScreenShake for firing shake
  weaponSystem = new WeaponSystem(camera, inputState, updateWeaponHUD, handleWeaponFire, screenShake);

  // Add the tracer line to the scene (Phase 5)
  weaponSystem.setScene(scene);

  // --- Grenade System (Phase 11) ---
  grenadeSystem = new GrenadeSystem(
    scene,
    () => camera.getWorldPosition(new THREE.Vector3()),
    () => {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      return dir;
    },
    (position, radius) => {
      // Damage enemies within radius
      const enemies = enemySystem.getEnemies();
      for (const enemy of enemies) {
        if (enemy.isDying) continue;
        const dist = enemy.position.distanceTo(position);
        if (dist <= radius) {
          const falloff = 1 - (dist / radius);
          const damage = 100 * falloff;
          enemySystem.damageEnemy(enemy.id, damage);
        }
      }
    },
    (damage) => {
      playerHealth.takeDamage(damage);
    },
    screenShake
  );

  // --- Loot System (Phase 8) ---
  lootSystem = new LootSystem(
    scene,
    () => camera.getWorldPosition(new THREE.Vector3()),
    weaponSystem,
    hud,
    inputState,
    (amount) => {
      // Medkit pickup — heal the player
      playerHealth.heal(amount);
    },
    (count) => {
      // Ammo pickup — restore grenades
      if (grenadeSystem) {
        grenadeSystem.addGrenades(count);
        hud.setGrenadeCount(grenadeSystem.getGrenadeCount());
      }
    }
  );

  // Initialize the HUD weapon state
  updateWeaponHUD();

  // Initialize HUD grenade count
  hud.setGrenadeCount(grenadeSystem.getGrenadeCount());

  /**
   * Updates the HUD weapon display from the WeaponSystem state.
   * Called by WeaponSystem whenever weapon state changes.
   */
  function updateWeaponHUD(): void {
    if (!weaponSystem) return;

    // Build weapon names and ammo arrays for all 6 weapons
    const weaponNames: string[] = [];
    const weaponAmmo: { magazine: number; reserve: number }[] = [];
    for (let i = 0; i < weaponSystem.getWeaponCount(); i++) {
      weaponNames.push(weaponSystem.getWeaponName(i));
      weaponAmmo.push(weaponSystem.getWeaponAmmo(i));
    }

    const weaponState: WeaponHUDState = {
      weaponName: weaponSystem.getActiveWeaponName(),
      magazine: weaponSystem.getAmmo().magazine,
      reserve: weaponSystem.getAmmo().reserve,
      reloading: weaponSystem.getReloading(),
      reloadProgress: weaponSystem.getReloadProgress(),
      crosshairSpread: weaponSystem.getCrosshairSpread(),
      isADS: weaponSystem.getIsADS(),
      zoomLevel: weaponSystem.getZoomLevel(),
      maxZoomLevel: weaponSystem.getMaxZoomLevel(),
      weaponIndex: weaponSystem.getWeaponIndex(),
      weaponCount: weaponSystem.getWeaponCount(),
      weaponNames: weaponNames,
      weaponAmmo: weaponAmmo,
      ownedWeapons: weaponSystem.getOwnedWeapons(),
      infiniteReserve: weaponSystem.isActiveWeaponInfiniteReserve(),
    };
    hud.setWeaponState(weaponState);
  }

  /**
   * Updates the HUD wave display from the WaveManager state.
   * Called once per frame.
   */
  function updateWaveHUD(): void {
    if (!waveManager) return;
    hud.setWaveNumber(waveManager.getWaveNumber());
    hud.setWaveProgress(waveManager.getWaveProgress());
  }

  /**
   * Shows the damage indicator flash with directional information.
   * Computes the angle between the camera forward and the damage direction
   * to determine which of 8 directional classes to apply.
   *
   * @param direction - Optional direction the damage came from
   */
  function showDamageIndicator(direction: THREE.Vector3 | null): void {
    if (!damageIndicator) return;

    // Remove all directional classes
    damageIndicator.classList.remove(
      'damage-indicator-front',
      'damage-indicator-back',
      'damage-indicator-left',
      'damage-indicator-right',
      'damage-indicator-front-left',
      'damage-indicator-front-right',
      'damage-indicator-back-left',
      'damage-indicator-back-right'
    );

    // If no direction, show full-screen flash (no directional class)
    if (direction) {
      // Get camera forward direction in world space
      const cameraForward = new THREE.Vector3();
      camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      cameraForward.normalize();

      // Get direction from player to damage source
      const damageDir = direction.clone();
      damageDir.y = 0;
      damageDir.normalize();

      // Compute angle between camera forward and damage direction
      // Angle in range [-PI, PI], 0 = front, PI = back
      const angle = Math.atan2(
        cameraForward.x * damageDir.z - cameraForward.z * damageDir.x,
        cameraForward.x * damageDir.x + cameraForward.z * damageDir.z
      );

      // Determine directional class based on angle sectors (8 directions)
      // Each sector is 45 degrees (PI/4)
      const sector = Math.round(angle / (Math.PI / 4));

      // Map sector to class name
      // 0 = front, 1 = front-right, 2 = right, 3 = back-right,
      // 4 = back, -3 = back-left, -2 = left, -1 = front-left
      const sectorClasses: Record<number, string> = {
        0: 'damage-indicator-front',
        1: 'damage-indicator-front-right',
        2: 'damage-indicator-right',
        3: 'damage-indicator-back-right',
        4: 'damage-indicator-back',
        [-3]: 'damage-indicator-back-left',
        [-2]: 'damage-indicator-left',
        [-1]: 'damage-indicator-front-left',
      };

      const className = sectorClasses[sector];
      if (className) {
        damageIndicator.classList.add(className);
      }
    }

    // Show the indicator
    damageIndicator.style.display = 'block';

    // Auto-hide after 0.5 seconds
    setTimeout(() => {
      if (damageIndicator) {
        damageIndicator.style.display = 'none';
        // Remove all directional classes
        damageIndicator.classList.remove(
          'damage-indicator-front',
          'damage-indicator-back',
          'damage-indicator-left',
          'damage-indicator-right',
          'damage-indicator-front-left',
          'damage-indicator-front-right',
          'damage-indicator-back-left',
          'damage-indicator-back-right'
        );
      }
    }, 500);
  }

  /**
   * Resets the weapon system in place.
   * Restores all weapons to full ammo, resets ownership to M9 only,
   * resets active weapon to index 0, and cancels reload/switch/ADS.
   * Reusing the same instance keeps LootSystem's reference valid so
   * pickups continue to affect the live weapon state.
   */
  function resetWeaponSystem(): void {
    if (!weaponSystem) return;
    weaponSystem.reset();
    updateWeaponHUD();
  }

  /**
   * Resets the grenade system by disposing the old instance and creating a new one.
   * This restores grenade count to 3 and clears all active grenades/particles.
   */
  function resetGrenadeSystem(): void {
    if (grenadeSystem) {
      grenadeSystem.dispose();
    }
    grenadeSystem = new GrenadeSystem(
      scene,
      () => camera.getWorldPosition(new THREE.Vector3()),
      () => {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        return dir;
      },
      (position, radius) => {
        // Damage enemies within radius
        const enemies = enemySystem.getEnemies();
        for (const enemy of enemies) {
          if (enemy.isDying) continue;
          const dist = enemy.position.distanceTo(position);
          if (dist <= radius) {
            const falloff = 1 - (dist / radius);
            const damage = 100 * falloff;
            enemySystem.damageEnemy(enemy.id, damage);
          }
        }
      },
      (damage) => {
        playerHealth.takeDamage(damage);
      },
      screenShake
    );

    // Update HUD grenade count
    hud.setGrenadeCount(grenadeSystem.getGrenadeCount());
  }

  /**
   * Starts the game on the selected map.
   * Builds the map, configures lighting, sets spawn, and starts waves.
   *
   * @param mapId - The id of the map to play on
   */
  function startGame(mapId: string): void {
    // Build the selected map via MapManager
    const mapGroup = mapManager.buildMap(mapId, scene, collisionManager);
    if (!mapGroup) {
      console.error(`Failed to build map: ${mapId}`);
      return;
    }

    // Add the map group to the scene
    scene.add(mapGroup);

    // Re-add the map boundary (MapManager clears collision manager)
    collisionManager.addBoundary(-50, -50, 50, 50);

    // Reset player position to map spawn
    playerState.position.x = 0;
    playerState.position.y = playerState.eyeHeight;
    playerState.position.z = 0;
    playerState.velocity.x = 0;
    playerState.velocity.y = 0;
    playerState.velocity.z = 0;
    playerState.yaw = 0;
    playerState.pitch = 0;

    // Reset camera position
    camera.position.set(0, playerState.eyeHeight, 0);
    camera.rotation.set(0, 0, 0);

    // Reset player health
    playerHealth.reset();

    // Reset enemy system
    enemySystem.reset();

    // Reset wave manager
    if (waveManager) {
      waveManager.reset();
    }

    // Reset loot system
    if (lootSystem) {
      lootSystem.reset();
    }

    // Reset weapon system (restores ammo, active weapon, ADS)
    resetWeaponSystem();

    // Reset grenade system (restores grenade count, clears active grenades)
    resetGrenadeSystem();

    // Start the wave manager
    if (waveManager) {
      waveManager.start();
    }

    // Update HUD with initial values
    hud.setPlayerHealth(playerHealth.getHealth(), playerHealth.getMaxHealth());
    hud.setKillCount(0);
    hud.setWaveNumber(1);
    hud.setWaveProgress(0);
    hud.setGrenadeCount(grenadeSystem.getGrenadeCount());
  }

  /**
   * Restarts the current game with the same map.
   * Fully resets all systems and rebuilds the map.
   */
  function restartGame(): void {
    const mapId = gameStateManager.getMapId();
    if (!mapId) {
      console.error('Cannot restart: no map selected.');
      return;
    }

    // Start the game on the same map
    startGame(mapId);

    // Transition to PLAYING state
    gameStateManager.toPlaying();
  }

  /**
   * Resets the game to the main menu.
   * Clears all systems and shows the main menu overlay.
   */
  function resetToMainMenu(): void {
    // Reset all systems
    if (waveManager) {
      waveManager.reset();
    }
    enemySystem.reset();
    if (lootSystem) {
      lootSystem.reset();
    }
    playerHealth.reset();
    resetWeaponSystem();
    resetGrenadeSystem();

    // Clear the map from the scene
    // MapManager will handle this on next build

    // Reset player position
    playerState.position.x = 0;
    playerState.position.y = playerState.eyeHeight;
    playerState.position.z = 0;
    playerState.velocity.x = 0;
    playerState.velocity.y = 0;
    playerState.velocity.z = 0;
    playerState.yaw = 0;
    playerState.pitch = 0;

    // Reset camera
    camera.position.set(0, playerState.eyeHeight, 0);
    camera.rotation.set(0, 0, 0);

    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Reset game state manager
    gameStateManager.reset();
  }

  /**
   * Shows a specific overlay and hides all others.
   *
   * @param overlayId - The id of the overlay to show
   */
  function showOverlay(overlayId: string): void {
    // Hide all game overlays
    const overlays = document.querySelectorAll('.game-overlay');
    overlays.forEach((overlay) => {
      (overlay as HTMLElement).hidden = true;
    });

    // Show the target overlay
    const target = document.getElementById(overlayId);
    if (target) {
      target.hidden = false;
    }
  }

  /**
   * Hides all game overlays.
   */
  function hideAllOverlays(): void {
    const overlays = document.querySelectorAll('.game-overlay');
    overlays.forEach((overlay) => {
      (overlay as HTMLElement).hidden = true;
    });
  }

  /**
   * Requests pointer lock on the renderer's canvas.
   */
  function requestPointerLock(): void {
    if (!document.pointerLockElement) {
      renderer.domElement.requestPointerLock();
    }
  }

  /**
   * Exits pointer lock if active.
   */
  function exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  // ==========================================================================
  // Game State Manager Callback Wiring
  // ==========================================================================

  // Subscribe to game state changes
  gameStateManager.onStateChange((newState, previousState) => {
    switch (newState) {
      case GameState.MAIN_MENU:
        showOverlay('main-menu-overlay');
        exitPointerLock();
        break;

      case GameState.MAP_SELECT:
        showOverlay('map-select-overlay');
        exitPointerLock();
        break;

      case GameState.PLAYING:
        hideAllOverlays();
        requestPointerLock();
        break;

      case GameState.PAUSED:
        showOverlay('pause-overlay');
        exitPointerLock();
        break;

      case GameState.GAME_OVER:
        showOverlay('game-over-overlay');
        exitPointerLock();
        break;
    }
  });

  // ==========================================================================
  // Menu Button Wiring
  // ==========================================================================

  // --- Main Menu Buttons ---
  const startButton = document.querySelector('[data-action="start"]');
  if (startButton) {
    startButton.addEventListener('click', () => {
      gameStateManager.toMapSelect();
    });
  }

  const controlsButton = document.querySelector('[data-action="controls"]');
  if (controlsButton) {
    controlsButton.addEventListener('click', () => {
      showOverlay('controls-overlay');
    });
  }

  const quitButton = document.querySelector('[data-action="quit"]');
  if (quitButton) {
    quitButton.addEventListener('click', () => {
      window.close();
    });
  }

  // --- Controls Overlay Back Button ---
  const backButton = document.querySelector('[data-action="back-to-main"]');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showOverlay('main-menu-overlay');
    });
  }

  // --- Map Selection Buttons ---
  const mapButtons = document.querySelectorAll('.map-select-button');
  mapButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mapId = button.getAttribute('data-map-id');
      if (mapId) {
        // Set the map id in the game state manager
        gameStateManager.setMapId(mapId as 'town-street' | 'desert-ruins' | 'cargo-dock');
        // Start the game
        startGame(mapId);
        // Transition to PLAYING state
        gameStateManager.toPlaying();
      }
    });
  });

  // --- Pause Menu Buttons ---
  const resumeButton = document.querySelector('[data-action="resume"]');
  if (resumeButton) {
    resumeButton.addEventListener('click', () => {
      gameStateManager.toResume();
    });
  }

  const restartButtons = document.querySelectorAll('[data-action="restart"]');
  restartButtons.forEach((button) => {
    button.addEventListener('click', () => {
      restartGame();
    });
  });

  const mainMenuButtons = document.querySelectorAll('[data-action="main-menu"]');
  mainMenuButtons.forEach((button) => {
    button.addEventListener('click', () => {
      resetToMainMenu();
    });
  });

  // ==========================================================================
  // ESC Key Handling (Pause/Resume Toggle)
  // ==========================================================================

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      const currentState = gameStateManager.getState();

      if (currentState === GameState.PLAYING) {
        // Pause the game
        gameStateManager.toPause();
      } else if (currentState === GameState.PAUSED) {
        // Resume the game
        gameStateManager.toResume();
      }
    }
  });

  // ==========================================================================
  // Window Resize Handler
  // ==========================================================================

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ==========================================================================
  // FPS Tracking Variables
  // ==========================================================================

  let fpsAccumulator = 0; // Accumulated delta time for FPS calculation
  let fpsFrames = 0; // Frames rendered during the accumulation window

  // ==========================================================================
  // G Key Edge Detection (Phase 11)
  // ==========================================================================

  let lastGState = false;

  // ==========================================================================
  // Main Loop
  // ==========================================================================

  function animate(): void {
    // Calculate delta time, clamped to prevent huge jumps when tab is inactive
    const now = performance.now();
    const deltaTime = Math.min((now - gameState.lastTime) / 1000, 0.1);

    // Update game state
    gameState.lastTime = now;
    gameState.elapsedTime += deltaTime;
    gameState.frameCount++;

    // --- FPS Calculation (exponential moving average) ---
    fpsAccumulator += deltaTime;
    fpsFrames++;

    // Update FPS every 0.5 seconds
    if (fpsAccumulator >= 0.5) {
      gameState.fps = fpsFrames / fpsAccumulator;
      fpsAccumulator = 0;
      fpsFrames = 0;
    }

    // --- Update Systems (only when state is PLAYING) ---
    const currentState = gameStateManager.getState();
    if (currentState === GameState.PLAYING) {
      playerController.update(deltaTime);

      // Apply LMG movement penalty while firing (Phase 5)
      if (weaponSystem) {
        const moveMod = weaponSystem.getMovementModifier();
        playerState.velocity.x *= moveMod;
        playerState.velocity.z *= moveMod;

        // Compute player speed for weapon bob and crosshair spread
        const playerSpeed = Math.sqrt(
          playerState.velocity.x * playerState.velocity.x +
          playerState.velocity.z * playerState.velocity.z
        );

        // Update weapon system (firing, ADS, reload, switching, ammo)
        weaponSystem.update(deltaTime, playerSpeed);
      }

      // Update enemy system (AI, movement, attacks, death animations)
      enemySystem.update(deltaTime);

      // Update grenade system (grenade physics, particles, flashes)
      if (grenadeSystem) {
        grenadeSystem.update(deltaTime);

        // Handle G key input (edge detection)
        const gPressed = inputState.keys['KeyG'] === true;
        if (gPressed && !lastGState) {
          if (grenadeSystem.tryThrow()) {
            // Update HUD grenade count
            hud.setGrenadeCount(grenadeSystem.getGrenadeCount());
          }
        }
        lastGState = gPressed;
      }

      // Update loot system (pickup animations, detection, despawn)
      if (lootSystem) {
        lootSystem.update(deltaTime);
      }

      // Update wave manager (spawning, state machine, announcements)
      if (waveManager) {
        waveManager.update(deltaTime);
      }

      // Update wave HUD display
      updateWaveHUD();
    }

    hud.update(gameState, inputState.isPointerLocked);

    // --- Render ---
    renderer.render(scene, camera);

    // Request next frame
    requestAnimationFrame(animate);
  }

  // ==========================================================================
  // Initial HUD Setup
  // ==========================================================================

  hud.setPlayerHealth(playerHealth.getHealth(), playerHealth.getMaxHealth());
  hud.setKillCount(enemySystem.getKillCount());
  hud.setGrenadeCount(grenadeSystem.getGrenadeCount());

  // ==========================================================================
  // Initial Game State (MAIN_MENU)
  // ==========================================================================

  // Show main menu overlay, hide all others
  showOverlay('main-menu-overlay');

  // ==========================================================================
  // Start the Loop
  // ==========================================================================

  gameState.lastTime = performance.now();
  animate();

  // ==========================================================================
  // WebGL Context Loss Handling
  // ==========================================================================

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('WebGL context lost. Attempting to recover...');
  });
}

// --- Boot the Game ---
init();