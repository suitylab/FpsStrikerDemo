# FPS Strike Survival — Development Plan

## Overview

This document is the **Execution Roadmap SSOT** for FPS Strike Survival. It is organized as **vertical slices** — each phase delivers a complete, runnable feature (data + logic + UI together). Every phase ends with the repository in a buildable, runnable state.

**Tech Stack:** TypeScript + Vite + THREE.js (strict: false)
**Constraint:** All 3D models procedural (primitive geometries + procedural canvas textures). No external binary assets.

---

## Phase 1: Walking Skeleton & Core Initialization

### Functional Feature Scope (User Experience & Visuals)
- A window launches displaying a dark gray ground plane with a simple grid pattern.
- The player sees the scene from a first-person camera at eye height (1.7m).
- The player can move forward/backward/strafe with **WASD** and look around with the **mouse** (pointer lock on click).
- A minimal HUD overlay shows the game title and a "PLAYER POSITION" readout (X, Y, Z) in the top-left corner.
- The game loop runs at 60 FPS with a visible frame counter in the corner.

### Technical Tasks
1. Scaffold Vite + TypeScript project with `strict: false` in `tsconfig.json`.
2. Create `src/main.ts` as the entry point.
3. Set up the THREE.js renderer (WebGL, antialias), scene, and perspective camera (FOV 75°).
4. Implement the main loop using `requestAnimationFrame` with delta-time calculation.
5. Create a basic ground plane (`PlaneGeometry` 100×100m) with a procedural grid texture (canvas).
6. Implement pointer lock controls (mouse look) with yaw/pitch clamping.
7. Implement WASD movement relative to camera direction (speed 5 m/s).
8. Define initial TypeScript interfaces: `PlayerState`, `InputState`, `GameState`.
9. Add a simple HUD overlay (HTML/CSS) showing title, position, and FPS.

### Prior Code Adjustments & Rewiring
- N/A (initial phase).

### Verification Goal
- The project compiles and runs without errors.
- The player can move freely with WASD and look around with the mouse.
- The HUD updates the position readout in real time.
- The FPS counter shows a stable frame rate.

---

## Phase 2: Town Street Map & Collision

### Functional Feature Scope (User Experience & Visuals)
- The empty ground plane is replaced with a **detailed town street**: a central asphalt road flanked by sidewalks, 2–3 story buildings, parked cars, street lamps, dumpsters, and concrete barriers.
- Realistic lighting: warm directional sun, ambient light, and shadows cast by buildings and props.
- The player collides with all buildings, cars, barriers, and map boundaries (cannot walk through them).
- The player can use cars and barriers as **cover** — crouching behind them blocks line of sight (visually).
- The map is enclosed by invisible walls at the 100×100m boundary.

### Technical Tasks
1. Create a `MapBuilder` module that constructs the Town Street map from primitives:
   - Buildings: `BoxGeometry` with procedural brick/window textures.
   - Cars: box body + cylinder wheels with metal texture.
   - Street lamps: cylinder + sphere with emissive material.
   - Barriers/dumpsters: boxes with concrete/metal textures.
2. Implement AABB collision detection between the player and all static map objects.
3. Add a `CollisionManager` that stores all collidable AABBs and checks player movement against them.
4. Implement procedural texture generation utility (`TextureFactory`) using canvas: asphalt, concrete, brick, metal, window.
5. Set up lighting: `DirectionalLight` (warm #FFD9A0, shadows), `AmbientLight` (0.4), `HemisphereLight`.
6. Add a procedural skybox (gradient blue with sun disc).
7. Replace the Phase 1 ground plane with the full map.

### Prior Code Adjustments & Rewiring
- **Replace** the Phase 1 placeholder ground plane with the Town Street map.
- **Extend** the player movement system to check collision against `CollisionManager` AABBs.
- **Update** the HUD to show "TOWN STREET" as the map name.

### Verification Goal
- The player spawns in the town street and can walk around.
- The player cannot walk through buildings, cars, or barriers.
- The player can stand behind a car and visually use it as cover.
- Shadows are cast by buildings and props.
- The scene renders at 60 FPS.

---

## Phase 3: Core Weapon System (M9 + AK-47)

### Functional Feature Scope (User Experience & Visuals)
- The player holds a visible **M9 Pistol** model in the bottom-right of the view (first-person weapon view).
- **Left-click** fires the weapon with a muzzle flash and recoil (camera kick).
- **Right-click (hold)** aims down sights (ADS): the weapon model centers, spread reduces, FOV narrows slightly.
- **R** reloads the weapon (2.5s for AK-47, 1.2s for M9) with a visible reload animation (weapon lowers).
- The HUD shows: weapon name, ammo (magazine / reserve), and a dynamic crosshair that expands when moving/firing.
- When the magazine is empty, a flashing prompt appears: **"PRESS R TO RELOAD"**.
- The player can switch between the M9 and AK-47 with **1** and **2** keys.

### Technical Tasks
1. Create a `WeaponSystem` module with weapon data definitions (damage, fire rate, mag size, reserve, reload time, spread, zoom).
2. Implement weapon models procedurally:
   - M9: box slide + cylinder barrel + grip.
   - AK-47: box receiver + curved magazine + wooden stock.
3. Implement raycast shooting: on click, cast a ray from camera center; apply spread; damage enemies (Phase 4 hook).
4. Implement muzzle flash (point light + sprite) at the weapon muzzle.
5. Implement recoil: camera pitch kick that recovers over time.
6. Implement ADS: reduce spread, change FOV, reposition weapon model.
7. Implement reload: timer-based, interrupts firing, shows weapon lowering animation.
8. Implement ammo tracking: magazine + reserve per weapon.
9. Add crosshair (HTML/CSS) that expands with movement/firing and contracts when ADS.
10. Update HUD: weapon name, ammo count, reload prompt.

### Prior Code Adjustments & Rewiring
- **Connect** the weapon firing to the Phase 1 input system (left-click, right-click, R key).
- **Attach** the weapon model to the Phase 1 camera (child of camera, positioned in view space).
- **Extend** the HUD from Phase 1 to include weapon info and crosshair.

### Verification Goal
- The player can fire the M9 and AK-47 with visible muzzle flash and recoil.
- ADS reduces spread and narrows FOV.
- Reloading works with correct timing and ammo updates.
- The crosshair expands/contracts correctly.
- The HUD shows accurate ammo and weapon name.
- The reload prompt appears when the magazine is empty.

---

## Phase 4: Enemy AI Foundation (Grunt + Rusher)

### Functional Feature Scope (User Experience & Visuals)
- **Grunts** (gray uniform, rifle) spawn at random points along the map edges and advance toward the player. They stop at ~10m and fire single shots.
- **Rushers** (red bandana, knife) spawn at map edges and charge directly at the player at high speed, dealing melee damage on contact.
- Enemies are visible as humanoid figures built from primitives (box torso, sphere head, cylinder limbs).
- When an enemy is killed, it falls over (rotation animation) and disappears after 2 seconds.
- The player can damage enemies with the M9 and AK-47; hit markers appear on successful hits.
- A kill counter appears in the HUD.

### Technical Tasks
1. Create an `EnemySystem` module with enemy data definitions (health, speed, damage, attack range, behavior).
2. Implement enemy models procedurally (Grunt: gray uniform; Rusher: red bandana).
3. Implement enemy spawning: random edge points, staggered spawn (1 enemy per 2 seconds).
4. Implement enemy AI:
   - Grunt: advance toward player → stop at 10m → shoot (raycast, spread-based) → strafe laterally.
   - Rusher: direct charge toward player, melee attack within 2m.
5. Implement enemy health and damage: player raycast hits reduce health; death triggers fall animation.
6. Implement enemy shooting: raycast from enemy toward player with spread; damage applied to player.
7. Implement hit markers (white X on hit, red X on kill) in the HUD.
8. Add a kill counter to the HUD.

### Prior Code Adjustments & Rewiring
- **Connect** the Phase 3 weapon raycast to damage enemies.
- **Connect** enemy damage to the player's health (new `PlayerHealth` system).
- **Extend** the HUD to show kill count and player health.

### Verification Goal
- Grunts and Rushers spawn at map edges and behave correctly (advance, shoot, charge).
- The player can kill enemies with both weapons.
- Hit markers appear on hits and kills.
- Enemy damage reduces player health.
- The kill counter increments correctly.

---

## Phase 5: Full Weapons Arsenal (MP5, M870, AWM, M249)

### Functional Feature Scope (User Experience & Visuals)
- The player now has access to all **6 weapons**: M9, AK-47, MP5, M870 Shotgun, AWM Sniper, M249 LMG.
- **Scroll wheel** cycles through weapons; **1–6** selects directly.
- Each weapon has distinct visuals and handling:
  - **MP5**: compact SMG, high fire rate, low damage.
  - **M870**: pump shotgun, 8 pellets per shot, devastating at close range.
  - **AWM**: bolt-action sniper, variable zoom (2x/4x/8x via scroll while ADS), one-shot headshot.
  - **M249**: heavy LMG, 100-round magazine, slow movement while firing.
- A weapon switch animation (0.5s) plays when changing weapons; the player cannot shoot during the switch.
- The HUD shows the current weapon name and ammo.

### Technical Tasks
1. Extend `WeaponSystem` with 4 new weapon definitions (MP5, M870, AWM, M249).
2. Implement weapon models procedurally for each new weapon.
3. Implement weapon switching: scroll wheel cycles, number keys select; 0.5s switch timer.
4. Implement shotgun pellet spread (8 rays per shot).
5. Implement sniper variable zoom: scroll wheel while ADS cycles 2x → 4x → 8x; scope overlay (black vignette with crosshair) at 8x.
6. Implement LMG movement penalty (speed × 0.6 while firing).
7. Implement weapon-specific recoil patterns and spread values.
8. Update HUD to show weapon name and ammo for all weapons.

### Prior Code Adjustments & Rewiring
- **Extend** the Phase 3 weapon system to support 6 weapons with switching.
- **Modify** the input handler to capture scroll wheel and number keys.
- **Update** the HUD to display the active weapon correctly.

### Verification Goal
- The player can switch between all 6 weapons with scroll and number keys.
- Each weapon fires with distinct behavior (fire rate, spread, damage).
- The shotgun fires 8 pellets; the sniper zooms 2x/4x/8x; the LMG slows movement.
- The HUD shows the correct weapon name and ammo.

---

## Phase 6: Full Enemy Roster (Shooter, Tank, Sniper, Suicide Bomber)

### Functional Feature Scope (User Experience & Visuals)
- Four new enemy types join the battlefield:
  - **Shooter** (dark armor, SMG): advances, takes cover behind objects, peeks to fire 3-round bursts.
  - **Tank** (heavy armor, minigun): slow, high health, sustained fire at 20m.
  - **Sniper** (ghillie suit): stays at 30–50m, fires high-damage shots with a telegraphed laser sight.
  - **Suicide Bomber** (vest with blinking red light): charges the player, beeping intensifies, explodes within 3m (or on death).
- Each enemy type has distinct visual appearance and behavior.
- The player must adapt tactics: use cover against snipers, focus fire on tanks, keep distance from bombers.

### Technical Tasks
1. Extend `EnemySystem` with 4 new enemy definitions.
2. Implement enemy models procedurally for each type.
3. Implement AI behaviors:
   - Shooter: find nearest cover object, move behind it, peek and fire 3-round bursts.
   - Tank: slow advance, sustained fire, cannot take cover.
   - Sniper: maintain 30–50m distance, laser sight telegraph (red line) for 1s before firing.
   - Suicide Bomber: charge player, beeping (WebAudio oscillator) intensifies, explode within 3m or on death (5m radius).
4. Implement cover-seeking logic for Shooter (raycast to find cover objects).
5. Implement explosion damage for Suicide Bomber (area damage to player).
6. Add enemy health scaling (+5% per wave — hook for Phase 7).

### Prior Code Adjustments & Rewiring
- **Extend** the Phase 4 enemy system to support 6 enemy types.
- **Modify** the enemy spawner to include new types based on wave number (hook for Phase 7).
- **Update** the HUD to show enemy type on kill (optional).

### Verification Goal
- All 6 enemy types spawn and behave distinctly.
- Shooters take cover; Tanks absorb damage; Snipers telegraph shots; Bombers explode.
- The player can kill all enemy types with appropriate tactics.

---

## Phase 7: Tower Defense Survival Mode

### Functional Feature Scope (User Experience & Visuals)
- The game now runs as a **wave-based survival mode**:
  - Wave 1 starts with 8 enemies (5 + 1×3).
  - Each wave increases enemy count by 3.
  - Enemy composition scales: Grunts only (1–3), +Rushers (4–6), +Shooters (7–9), +Tanks (10–12), +Snipers (13–15), +Bombers (16+).
  - Enemy health +5% per wave; damage +2% per wave.
- Wave announcements appear center-screen:
  - **"WAVE X INCOMING"** (3s) at wave start.
  - **"WAVE X CLEARED"** (3s) when all enemies die.
  - **"NEXT WAVE IN 10s"** countdown during intermission.
- The HUD shows: wave number, kill count, and a wave progress bar.
- When the player dies, a **"GAME OVER"** screen appears with stats (waves survived, total kills).

### Technical Tasks
1. Create a `WaveManager` module:
   - Track current wave number, enemies remaining, spawn queue.
   - Spawn enemies in groups of 3–5 at random edge points, staggered.
   - Determine enemy composition based on wave number.
   - Apply health/damage scaling.
2. Implement wave state machine: `INTERMISSION → WAVE_ACTIVE → WAVE_CLEARED → INTERMISSION`.
3. Implement wave announcements (HTML overlay with fade in/out).
4. Implement game over: when player health ≤ 0, show game over screen with stats.
5. Add wave progress bar to HUD (enemies remaining / total).
6. Implement difficulty scaling formulas.

### Prior Code Adjustments & Rewiring
- **Wrap** the Phase 4/6 enemy spawning into the `WaveManager`.
- **Connect** the game over state to the player health system.
- **Extend** the HUD to show wave number and progress bar.

### Verification Goal
- Waves start with announcements and countdown timers.
- Enemy composition and count scale correctly with wave number.
- Enemy health/damage increases per wave.
- The player dies → game over screen with stats.
- The wave progress bar updates correctly.

---

## Phase 8: Loot System (Weapon & Ammo Drops)

### Functional Feature Scope (User Experience & Visuals)
- Killing enemies has a **25% chance** to drop a loot pickup:
  - **60% Ammo Crate** (green glow): restores 30% reserve ammo for all weapons.
  - **40% Weapon Drop** (blue glow): spawns a random weapon the player doesn't hold.
- Pickups appear as floating glowing crates at the kill location.
- When the player walks within 2m, a prompt appears:
  - **"PRESS E TO PICK UP AMMO"** or **"PRESS E TO PICK UP [WEAPON NAME]"**.
- Pressing **E** collects the pickup:
  - Ammo: instantly adds reserve ammo.
  - Weapon: adds to inventory; if already owned, converts to ammo; if inventory full (6 weapons), shows **"INVENTORY FULL"**.

### Technical Tasks
1. Create a `LootSystem` module:
   - On enemy death, roll 25% drop chance.
   - Determine drop type (60/40).
   - Spawn pickup entity (box + glow sprite + floating animation).
2. Implement pickup detection: distance check between player and pickup.
3. Implement interaction prompt (HTML overlay) when in range.
4. Implement E key pickup logic:
   - Ammo: add 30% reserve to all weapons.
   - Weapon: add to inventory; if full, show "INVENTORY FULL" and ignore.
5. Implement pickup despawn timer (30 seconds).

### Prior Code Adjustments & Rewiring
- **Hook** the loot drop into the Phase 4/6 enemy death handler.
- **Connect** the E key input to the pickup logic.
- **Extend** the HUD to show pickup prompts.

### Verification Goal
- Enemies drop loot with correct probability and type distribution.
- The player can pick up ammo and weapons with E.
- The "INVENTORY FULL" message appears when trying to pick up a weapon with a full inventory.
- Pickups despawn after 30 seconds.

---

## Phase 9: Additional Maps (Desert Ruins & Cargo Dock)

### Functional Feature Scope (User Experience & Visuals)
- The player can now play on **3 maps**:
  - **Town Street** (existing): urban street with buildings and cars.
  - **Desert Ruins**: open sandy terrain with ruined stone walls, broken pillars, and rubble piles for cover.
  - **Cargo Dock**: industrial dock with stacked shipping containers, cranes, and wooden crates.
- A map selection screen appears before the game starts (after main menu — hook for Phase 10).
- Each map has distinct lighting (warm sun for Town, harsh bright for Desert, cool industrial for Dock) and distinct cover placement.
- The player can take cover behind map-specific objects (ruined walls, containers, crates).

### Technical Tasks
1. Refactor `MapBuilder` into a `MapManager` that supports multiple map definitions.
2. Create `DesertRuinsMap`:
   - Sandy ground (procedural noise texture).
   - Ruined walls (half-height boxes), pillars (cylinders), rubble piles (irregular boxes).
   - Harsh directional light (#FFF5E0), minimal ambient.
3. Create `CargoDockMap`:
   - Concrete ground (procedural concrete texture).
   - Shipping containers (boxes with corrugated texture), cranes (box + cylinder structure), wooden crates.
   - Cool directional light (#C0D8FF), moderate ambient.
4. Implement map selection: a simple HTML overlay with 3 buttons (hook for Phase 10).
5. Ensure collision works for all new map objects.

### Prior Code Adjustments & Rewiring
- **Refactor** the Phase 2 `MapBuilder` into a reusable `MapManager`.
- **Move** the Town Street map definition into the new system.
- **Connect** the map selection to the game initialization.

### Verification Goal
- The player can select and play on all 3 maps.
- Each map has distinct visuals, lighting, and cover placement.
- Collision works correctly on all maps.
- The game runs at 60 FPS on all maps.

---

## Phase 10: UI Polish & Game Flow

### Functional Feature Scope (User Experience & Visuals)
- The full game flow is now complete:
  - **Main Menu** (title "FPS STRIKE SURVIVAL", buttons: START MISSION, CONTROLS, QUIT).
  - **Controls Overlay** (lists all key bindings, BACK button).
  - **Map Selection** (3 map buttons).
  - **Gameplay** (HUD with health, ammo, weapon, wave, kills).
  - **Pause Menu** (ESC during gameplay: RESUME, RESTART, MAIN MENU).
  - **Game Over** (WAVES SURVIVED, TOTAL KILLS, RESTART, MAIN MENU).
- Damage indicators: red vignette flash on the screen edge from the direction of incoming damage.
- Low health warning: persistent red vignette when health < 30%.
- Hit markers: white X on hit, red X on kill (already in Phase 4, polish visuals).

### Technical Tasks
1. Implement full menu system (HTML/CSS overlays):
   - Main menu with title and buttons.
   - Controls overlay.
   - Map selection screen.
   - Pause menu (ESC toggle).
   - Game over screen with stats.
2. Implement damage indicators: directional red flash based on damage source angle.
3. Implement low health warning: red vignette overlay when health < 30%.
4. Polish hit markers (scale/fade animations).
5. Implement game state machine: `MAIN_MENU → MAP_SELECT → PLAYING → PAUSED → GAME_OVER`.
6. Ensure all UI strings match the design doc exactly.

### Prior Code Adjustments & Rewiring
- **Connect** the Phase 7 game over state to the new game over screen.
- **Connect** the Phase 9 map selection to the new map selection screen.
- **Wrap** the entire game loop in the new game state machine.
- **Reset** all systems (player, enemies, waves, loot) on restart.

### Verification Goal
- The player can navigate the full game flow: main menu → map select → gameplay → pause → game over → restart.
- All UI strings match the design doc.
- Damage indicators and low health warning appear correctly.
- Restart fully resets the game state.

---

## Phase 11: Final Polish & Balancing

### Functional Feature Scope (User Experience & Visuals)
- The game feels polished and complete:
  - **Screen shake** on shooting (small) and grenade explosions (large).
  - **Weapon bob** while walking (subtle) and sprinting (pronounced).
  - **Muzzle flash** improved with sprite + light.
  - **Enemy death effects**: Grunt/Rusher/Shooter/Tank fall over; Suicide Bomber explodes with particle burst.
  - **Grenade explosions**: particle burst + screen shake + brief flash.
  - **Performance optimization**: frustum culling, object pooling for projectiles/enemies, LOD for distant props.
  - **Balance tuning**: weapon damage, enemy health, wave scaling, loot drop rates.

### Technical Tasks
1. Implement screen shake system (camera offset with decay).
2. Implement weapon bob (camera position offset based on movement speed).
3. Improve muzzle flash (sprite + point light with decay).
4. Implement enemy death animations (rotation fall, particle burst for bomber).
5. Implement grenade explosion effects (particles, flash, shake).
6. Optimize performance:
   - Object pooling for projectiles and enemy instances.
   - Frustum culling for map props.
   - LOD (distance-based detail reduction).
7. Balance gameplay:
   - Tune weapon damage/fire rate/reload times.
   - Tune enemy health/speed/damage.
   - Tune wave scaling and loot drop rates.
8. Clean up debug logs, temporary flags, and stub functions.

### Prior Code Adjustments & Rewiring
- **Add** screen shake and weapon bob to the Phase 1 camera controller.
- **Improve** the Phase 3 muzzle flash.
- **Enhance** the Phase 4/6 enemy death handling.
- **Optimize** all systems for performance.
- **Tune** all balance parameters across weapons, enemies, and waves.

### Verification Goal
- The game runs at a stable 60 FPS on mid-range hardware.
- All visual effects (screen shake, weapon bob, muzzle flash, explosions) work correctly.
- The game is balanced: the player can survive at least 10 waves with skilled play.
- No debug logs or temporary code remain.
- The full product vision from the design doc is realized.