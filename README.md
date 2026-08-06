# FPS STRIKE SURVIVAL

[Demo URL](https://fps-strike.suitylab.com) | [SUITY Agentic Project](https://github.com/suitylab/Suity)

> **This game is fully generated with SUITY Agentic, using DeepSeek V4 Flash.**

**FPS Strike Survival** is a first-person modern shooter built with **TypeScript + Vite + THREE.js**. You are dropped into a procedurally-built, richly detailed urban battlefield and must survive endless waves of AI enemies. Built as a tower-defense survival FPS, it combines cover-based combat, weapon management, and escalating enemy pressure. Every 3D model is constructed from primitive geometries with procedural materials — no external binary assets, fully self-contained and instantly runnable.

---

## 🎮 Features

### Tower Defense Survival Mode
- Endless, wave-based combat: enemies spawn from map edges in groups of 3–5 and advance toward you.
- Escalating difficulty: enemy health grows **+5%** and damage **+2%** per wave, with new enemy types unlocking at set wave tiers.
- **10-second intermission** between waves; the game continues until you fall.

### 6 Pickable Weapons
| # | Weapon | Type | Special |
|---|--------|------|---------|
| 1 | **M9 Pistol** | Pistol | Semi-auto, infinite reserve |
| 2 | **AK-47** | Assault Rifle | Auto, reliable all-rounder |
| 3 | **MP5** | SMG | Very high fire rate, close range |
| 4 | **M870 Shotgun** | Shotgun | 8-pellet spread, devastating up close |
| 5 | **AWM Sniper** | Sniper Rifle | 100+ m range, 2x/4x/8x zoom, one-shot headshots |
| 6 | **M249 LMG** | Light MG | 100-round magazine, sustained fire |

Switch with **1–6** keys or the **scroll wheel**; reload with **R**. Right-click to **Aim Down Sights** (reduces spread).

### Grenades
- Carry **3 grenades**, thrown with **G** — 5 m explosion radius with damage falloff, replenished each wave. Perfect for clearing enemies behind cover.

### 6 Enemy AI Types
| # | Enemy | Behavior |
|---|-------|----------|
| 1 | **Grunt** | Standard rifleman, advances then holds at ~10m |
| 2 | **Rusher** | Fast knife attacker, erratic zigzag rush |
| 3 | **Shooter** | SMG burst fire, takes cover and peeks |
| 4 | **Tank** | Slow heavy minigun, high health, sustained fire |
| 5 | **Sniper** | Long-range single shots, telegraphed laser sight |
| 6 | **Suicide Bomber** | Charges and explodes, intensifying beep |

Enemies advance with simple pathfinding, strafe while firing, take cover, and spawn outside your view along the map edges.

### 3 Battlefield Maps
| Map | Theme | Cover |
|-----|-------|-------|
| **Town Street** | Realistic urban street | Cars, barriers, building corners, dumpsters |
| **Desert Ruins** | Ancient ruins, sandy terrain | Ruined walls, pillars, rubble, archways |
| **Cargo Dock** | Industrial shipping port | Containers (as corridors), crates, crane legs |

All maps are ~100m × 100m with per-map lighting and sun tone.

### Loot System
- **25% drop chance** per kill: **60%** ammo crates (restores 30% reserve) and **40%** weapon drops (weighted toward weapons you don't hold) — with glowing green/blue pickups.

### HUD & UI
- **WAVE** / **KILLS** counters, **HP** bar, weapon name + ammo + grenades
- Dynamic **crosshair** (expands on fire, red on target), **hit markers**, **damage vignette**
- Screens: **Main Menu**, **Mission Select**, **Pause**, **Game Over**, and **Controls** overlay

### Visual Polish
- Realistic sun lighting with shadows, ambient occlusion, emissive windows/crystals
- Procedural canvas textures: asphalt, brick, sand, metal, concrete
- Muzzle flash, screen shake, weapon bob, kill popups, particle-rich death effects

---

## 🛠 Tech Stack

- **TypeScript**
- **Vite**
- **THREE.js**
- All models and textures are **procedural** (no external binary assets)

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Development mode (local preview)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

Open the local URL (default `http://localhost:5173`) in your browser to play.

---

## 🎯 Controls

| Action | Key |
|--------|-----|
| Move | `WASD` / `Arrow Keys` |
| Look | `Mouse` |
| Shoot | `Left Click` |
| Aim Down Sights | `Right Click` (Hold) |
| Reload | `R` |
| Sprint | `Shift` (Hold) |
| Jump | `Space` |
| Throw Grenade | `G` |
| Switch Weapon | `1–6` / `Mouse Wheel` / `Scroll to Zoom` |
| Pause | `ESC` |

---

## 📁 Project Structure

```
├── docs/
│   ├── user-request.md        # Raw user requirement (SSOT)
│   ├── design-doc.md           # Product vision & UX design (SSOT)
│   └── development-plan.md     # Vertical-slice execution roadmap (SSOT)
├── src/
│   ├── main.ts                 # Entry point
│   ├── style.css               # Global styles
│   ├── types.ts                # Shared type definitions
│   ├── utils/                  # Procedural canvas textures
│   └── components/             # Game modules (20+ TypeScript files)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.json               # Cloudflare Pages config
```

---

## 📚 Documentation

- [Design Document](docs/design-doc.md)
- [Development Plan](docs/development-plan.md)
- [Raw User Request](docs/user-request.md)

---

## ✅ Status

**Complete** — Wave survival with 3 maps, 6 weapons, 6 enemy types, grenades, ADS/zoom, loot drops, full HUD/UI flow, and procedural visual polish are implemented and verified. The project builds with **0 errors** and deploys to Cloudflare Pages via `wrangler`.