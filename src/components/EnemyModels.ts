import * as THREE from 'three';

/**
 * EnemyModels — Procedural Humanoid Enemy Models
 *
 * Constructs detailed enemy models from THREE.js primitives for all 6 enemy types:
 * Grunt, Rusher, Shooter, Tank, Sniper, and Suicide Bomber.
 * Models are built standing upright with feet at Y=0, facing +Z direction.
 * All materials are procedural MeshStandardMaterial with appropriate
 * roughness/metalness values for fabric vs metal surfaces.
 */

/** Skin tone color for enemy heads and hands. */
const SKIN_TONE = 0xd4a574;
/** Dark pants color for legs. */
const DARK_PANTS = 0x2a2a2a;
/** Gray uniform color for Grunt torso and arms. */
const GRUNT_GRAY = 0x6a6a6a;
/** Dark shirt color for Rusher torso. */
const RUSHER_SHIRT = 0x3a3a3a;
/** Red bandana color for Rusher head. */
const BANDANA_RED = 0xcc2222;
/** Metal color for weapons. */
const METAL_DARK = 0x333333;
/** Wood color for rifle stock/grip. */
const WOOD_BROWN = 0x6b4226;
/** Dark armor color for Shooter. */
const SHOOTER_ARMOR = 0x2a2a3a;
/** Dark armor accent color for Shooter. */
const SHOOTER_ARMOR_ACCENT = 0x1a1a2a;
/** Heavy armor color for Tank. */
const TANK_ARMOR = 0x4a4a4a;
/** Heavy armor accent color for Tank. */
const TANK_ARMOR_ACCENT = 0x3a3a3a;
/** Ghillie suit base color for Sniper. */
const GHILLIE_BASE = 0x4a5a3a;
/** Ghillie suit tuft color for Sniper. */
const GHILLIE_TUFT = 0x5a6a4a;
/** Ghillie suit dark tuft color for Sniper. */
const GHILLIE_TUFT_DARK = 0x3a4a2a;
/** Suicide bomber vest color. */
const BOMBER_VEST = 0x8a8a8a;
/** Suicide bomber vest dark color. */
const BOMBER_VEST_DARK = 0x6a6a6a;
/** Suicide bomber wire color. */
const BOMBER_WIRE = 0xcc4400;
/** Suicide bomber backpack color. */
const BOMBER_BACKPACK = 0x4a4a4a;
/** Emissive red color for bomber vest light. */
const BOMBER_LIGHT_RED = 0xff0000;

/**
 * Creates a cylinder limb (arm or leg) with the given dimensions and material.
 *
 * @param radius - Radius of the limb cylinder
 * @param height - Height of the limb cylinder
 * @param material - Material to apply to the limb
 * @returns THREE.Mesh configured as a limb
 */
function createLimb(radius: number, height: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.9, height, 8);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a sphere head with skin tone material.
 *
 * @param radius - Radius of the head sphere
 * @returns THREE.Mesh configured as a head
 */
function createHead(radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 12, 10);
  const material = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a box torso with the given dimensions and material.
 *
 * @param width - Width of the torso (X axis)
 * @param height - Height of the torso (Y axis)
 * @param depth - Depth of the torso (Z axis)
 * @param material - Material to apply to the torso
 * @returns THREE.Mesh configured as a torso
 */
function createTorso(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a box mesh with the given dimensions and material.
 *
 * @param width - Width of the box (X axis)
 * @param height - Height of the box (Y axis)
 * @param depth - Depth of the box (Z axis)
 * @param material - Material to apply to the box
 * @returns THREE.Mesh configured as a box
 */
function createBox(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates the Grunt enemy model — a gray-uniformed soldier with a rifle.
 * Height ~1.8m, facing +Z direction.
 *
 * @returns THREE.Group containing the complete Grunt model
 */
export function createGruntModel(): THREE.Group {
  const grunt = new THREE.Group();
  grunt.name = 'Grunt_Enemy';
  grunt.userData.enemyType = 'grunt';
  grunt.userData.hitbox = {
    minX: -0.3,
    minY: 0,
    minZ: -0.3,
    maxX: 0.3,
    maxY: 1.8,
    maxZ: 0.3,
  };

  // --- Materials ---
  const uniformMaterial = new THREE.MeshStandardMaterial({
    color: GRUNT_GRAY,
    roughness: 0.85,
    metalness: 0.05,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: DARK_PANTS,
    roughness: 0.9,
    metalness: 0.0,
  });

  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.0,
  });

  const rifleMetalMaterial = new THREE.MeshStandardMaterial({
    color: METAL_DARK,
    roughness: 0.4,
    metalness: 0.8,
  });

  const rifleWoodMaterial = new THREE.MeshStandardMaterial({
    color: WOOD_BROWN,
    roughness: 0.7,
    metalness: 0.05,
  });

  // --- Torso ---
  const torso = createTorso(0.45, 0.55, 0.25, uniformMaterial);
  torso.position.set(0, 1.15, 0);
  grunt.add(torso);

  // --- Head ---
  const head = createHead(0.13);
  head.position.set(0, 1.55, 0);
  grunt.add(head);

  // --- Legs ---
  const legMaterial = pantsMaterial;

  // Left leg
  const leftLeg = createLimb(0.09, 0.75, legMaterial);
  leftLeg.position.set(-0.12, 0.375, 0);
  grunt.add(leftLeg);

  // Right leg
  const rightLeg = createLimb(0.09, 0.75, legMaterial);
  rightLeg.position.set(0.12, 0.375, 0);
  grunt.add(rightLeg);

  // --- Boots ---
  const bootGeometry = new THREE.BoxGeometry(0.14, 0.08, 0.25);
  const bootMesh = new THREE.Mesh(bootGeometry, bootMaterial);
  bootMesh.castShadow = true;
  bootMesh.receiveShadow = true;

  // Left boot
  const leftBoot = bootMesh.clone();
  leftBoot.position.set(-0.12, 0.04, 0.05);
  grunt.add(leftBoot);

  // Right boot
  const rightBoot = bootMesh.clone();
  rightBoot.position.set(0.12, 0.04, 0.05);
  grunt.add(rightBoot);

  // --- Arms ---
  const armMaterial = uniformMaterial;

  // Left arm
  const leftArm = createLimb(0.06, 0.6, armMaterial);
  leftArm.position.set(-0.32, 1.25, 0);
  leftArm.rotation.z = 0.1;
  grunt.add(leftArm);

  // Right arm (holding rifle, extended forward)
  const rightArm = createLimb(0.06, 0.6, armMaterial);
  rightArm.position.set(0.32, 1.25, 0);
  rightArm.rotation.z = -0.1;
  grunt.add(rightArm);

  // --- Hands ---
  const handGeometry = new THREE.SphereGeometry(0.06, 8, 6);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.32, 0.92, 0.1);
  leftHand.castShadow = true;
  grunt.add(leftHand);

  // Right hand
  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.32, 0.92, 0.1);
  rightHand.castShadow = true;
  grunt.add(rightHand);

  // --- Rifle ---
  const rifle = new THREE.Group();
  rifle.name = 'Rifle';

  // Receiver (main body)
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.07, 0.35),
    rifleMetalMaterial
  );
  receiver.position.set(0, 0, 0.1);
  receiver.castShadow = true;
  rifle.add(receiver);

  // Barrel
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8),
    rifleMetalMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.15);
  barrel.castShadow = true;
  rifle.add(barrel);

  // Magazine (curved box approximation)
  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.18, 0.06),
    rifleMetalMaterial
  );
  magazine.position.set(0, -0.12, 0.08);
  magazine.rotation.x = -0.15;
  magazine.castShadow = true;
  rifle.add(magazine);

  // Stock
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.2),
    rifleWoodMaterial
  );
  stock.position.set(0, 0.01, 0.32);
  stock.castShadow = true;
  rifle.add(stock);

  // Handguard
  const handguard = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.04, 0.15),
    rifleWoodMaterial
  );
  handguard.position.set(0, -0.01, -0.05);
  handguard.castShadow = true;
  rifle.add(handguard);

  // Front sight
  const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.02, 0.01),
    rifleMetalMaterial
  );
  frontSight.position.set(0, 0.05, -0.32);
  frontSight.castShadow = true;
  rifle.add(frontSight);

  // Position rifle in front of torso, held by both hands
  rifle.position.set(0, 1.0, 0.25);
  grunt.add(rifle);

  // --- Debug name tag (small floating label above head) ---
  const tagGeometry = new THREE.BoxGeometry(0.2, 0.03, 0.05);
  const tagMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.3,
  });
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.position.set(0, 1.75, 0);
  grunt.add(tag);

  return grunt;
}

/**
 * Creates the Rusher enemy model — a fast melee attacker with a red bandana and knife.
 * Height ~1.75m, facing +Z direction.
 *
 * @returns THREE.Group containing the complete Rusher model
 */
export function createRusherModel(): THREE.Group {
  const rusher = new THREE.Group();
  rusher.name = 'Rusher_Enemy';
  rusher.userData.enemyType = 'rusher';
  rusher.userData.hitbox = {
    minX: -0.28,
    minY: 0,
    minZ: -0.28,
    maxX: 0.28,
    maxY: 1.75,
    maxZ: 0.28,
  };

  // --- Materials ---
  const shirtMaterial = new THREE.MeshStandardMaterial({
    color: RUSHER_SHIRT,
    roughness: 0.9,
    metalness: 0.0,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: DARK_PANTS,
    roughness: 0.9,
    metalness: 0.0,
  });

  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.0,
  });

  const bandanaMaterial = new THREE.MeshStandardMaterial({
    color: BANDANA_RED,
    roughness: 0.7,
    metalness: 0.0,
  });

  const knifeBladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.2,
    metalness: 0.9,
  });

  const knifeHandleMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.6,
    metalness: 0.4,
  });

  // --- Torso (slightly smaller than Grunt for lighter build) ---
  const torso = createTorso(0.4, 0.5, 0.22, shirtMaterial);
  torso.position.set(0, 1.1, 0);
  rusher.add(torso);

  // --- Head ---
  const head = createHead(0.12);
  head.position.set(0, 1.5, 0);
  rusher.add(head);

  // --- Red Bandana (cylinder wrap around head) ---
  const bandanaGeometry = new THREE.CylinderGeometry(0.135, 0.135, 0.08, 12);
  const bandana = new THREE.Mesh(bandanaGeometry, bandanaMaterial);
  bandana.position.set(0, 1.52, 0);
  bandana.castShadow = true;
  rusher.add(bandana);

  // Bandana knot (small box at back of head)
  const knotGeometry = new THREE.BoxGeometry(0.05, 0.04, 0.04);
  const knot = new THREE.Mesh(knotGeometry, bandanaMaterial);
  knot.position.set(0, 1.52, -0.14);
  knot.castShadow = true;
  rusher.add(knot);

  // --- Legs ---
  // Left leg
  const leftLeg = createLimb(0.08, 0.7, pantsMaterial);
  leftLeg.position.set(-0.11, 0.35, 0);
  rusher.add(leftLeg);

  // Right leg
  const rightLeg = createLimb(0.08, 0.7, pantsMaterial);
  rightLeg.position.set(0.11, 0.35, 0);
  rusher.add(rightLeg);

  // --- Boots ---
  const bootGeometry = new THREE.BoxGeometry(0.13, 0.07, 0.23);
  const bootMesh = new THREE.Mesh(bootGeometry, bootMaterial);
  bootMesh.castShadow = true;
  bootMesh.receiveShadow = true;

  // Left boot
  const leftBoot = bootMesh.clone();
  leftBoot.position.set(-0.11, 0.035, 0.05);
  rusher.add(leftBoot);

  // Right boot
  const rightBoot = bootMesh.clone();
  rightBoot.position.set(0.11, 0.035, 0.05);
  rusher.add(rightBoot);

  // --- Arms ---
  const armMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left arm (slightly bent)
  const leftArm = createLimb(0.055, 0.55, armMaterial);
  leftArm.position.set(-0.28, 1.2, 0);
  leftArm.rotation.z = 0.15;
  rusher.add(leftArm);

  // Right arm (holding knife, extended forward)
  const rightArm = createLimb(0.055, 0.55, armMaterial);
  rightArm.position.set(0.28, 1.2, 0);
  rightArm.rotation.z = -0.15;
  rusher.add(rightArm);

  // --- Hands ---
  const handGeometry = new THREE.SphereGeometry(0.055, 8, 6);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.28, 0.9, 0.1);
  leftHand.castShadow = true;
  rusher.add(leftHand);

  // Right hand (holding knife)
  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.28, 0.9, 0.15);
  rightHand.castShadow = true;
  rusher.add(rightHand);

  // --- Knife ---
  const knife = new THREE.Group();
  knife.name = 'Knife';

  // Blade (flat box with slight taper approximation)
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.04, 0.25),
    knifeBladeMaterial
  );
  blade.position.set(0, 0, -0.1);
  blade.castShadow = true;
  knife.add(blade);

  // Blade tip (smaller box for taper)
  const bladeTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.03, 0.08),
    knifeBladeMaterial
  );
  bladeTip.position.set(0, 0, -0.25);
  bladeTip.castShadow = true;
  knife.add(bladeTip);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8),
    knifeHandleMaterial
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0.08);
  handle.castShadow = true;
  knife.add(handle);

  // Guard (cross piece between blade and handle)
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.02),
    knifeHandleMaterial
  );
  guard.position.set(0, 0, 0.0);
  guard.castShadow = true;
  knife.add(guard);

  // Position knife in right hand, pointing forward
  knife.position.set(0.28, 0.9, 0.3);
  rusher.add(knife);

  // --- Debug name tag (small floating label above head) ---
  const tagGeometry = new THREE.BoxGeometry(0.18, 0.03, 0.05);
  const tagMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.3,
  });
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.position.set(0, 1.7, 0);
  rusher.add(tag);

  return rusher;
}

/**
 * Creates the Shooter enemy model — a compact soldier with dark armor and an SMG.
 * Height ~1.8m, facing +Z direction.
 *
 * @returns THREE.Group containing the complete Shooter model
 */
export function createShooterModel(): THREE.Group {
  const shooter = new THREE.Group();
  shooter.name = 'Shooter_Enemy';
  shooter.userData.enemyType = 'shooter';
  shooter.userData.hitbox = {
    minX: -0.3,
    minY: 0,
    minZ: -0.3,
    maxX: 0.3,
    maxY: 1.8,
    maxZ: 0.3,
  };

  // --- Materials ---
  const armorMaterial = new THREE.MeshStandardMaterial({
    color: SHOOTER_ARMOR,
    roughness: 0.6,
    metalness: 0.4,
  });

  const armorAccentMaterial = new THREE.MeshStandardMaterial({
    color: SHOOTER_ARMOR_ACCENT,
    roughness: 0.7,
    metalness: 0.3,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: DARK_PANTS,
    roughness: 0.9,
    metalness: 0.0,
  });

  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.0,
  });

  const smgMetalMaterial = new THREE.MeshStandardMaterial({
    color: METAL_DARK,
    roughness: 0.4,
    metalness: 0.8,
  });

  const smgDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.6,
  });

  // --- Torso (compact build) ---
  const torso = createTorso(0.42, 0.5, 0.24, armorMaterial);
  torso.position.set(0, 1.1, 0);
  shooter.add(torso);

  // --- Chest armor plate ---
  const chestPlate = createBox(0.36, 0.22, 0.06, armorAccentMaterial);
  chestPlate.position.set(0, 1.2, 0.14);
  shooter.add(chestPlate);

  // --- Shoulder armor plates ---
  const leftShoulder = createBox(0.14, 0.1, 0.18, armorAccentMaterial);
  leftShoulder.position.set(-0.26, 1.38, 0);
  shooter.add(leftShoulder);

  const rightShoulder = createBox(0.14, 0.1, 0.18, armorAccentMaterial);
  rightShoulder.position.set(0.26, 1.38, 0);
  shooter.add(rightShoulder);

  // --- Head ---
  const head = createHead(0.12);
  head.position.set(0, 1.5, 0);
  shooter.add(head);

  // --- Helmet ---
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8),
    armorAccentMaterial
  );
  helmet.position.set(0, 1.53, 0);
  helmet.scale.y = 0.7;
  helmet.castShadow = true;
  shooter.add(helmet);

  // --- Legs ---
  // Left leg
  const leftLeg = createLimb(0.08, 0.7, pantsMaterial);
  leftLeg.position.set(-0.11, 0.35, 0);
  shooter.add(leftLeg);

  // Right leg
  const rightLeg = createLimb(0.08, 0.7, pantsMaterial);
  rightLeg.position.set(0.11, 0.35, 0);
  shooter.add(rightLeg);

  // --- Boots ---
  const bootGeometry = new THREE.BoxGeometry(0.13, 0.07, 0.23);
  const bootMesh = new THREE.Mesh(bootGeometry, bootMaterial);
  bootMesh.castShadow = true;
  bootMesh.receiveShadow = true;

  // Left boot
  const leftBoot = bootMesh.clone();
  leftBoot.position.set(-0.11, 0.035, 0.05);
  shooter.add(leftBoot);

  // Right boot
  const rightBoot = bootMesh.clone();
  rightBoot.position.set(0.11, 0.035, 0.05);
  shooter.add(rightBoot);

  // --- Arms ---
  const armMaterial = armorMaterial;

  // Left arm
  const leftArm = createLimb(0.055, 0.55, armMaterial);
  leftArm.position.set(-0.28, 1.2, 0);
  leftArm.rotation.z = 0.1;
  shooter.add(leftArm);

  // Right arm (holding SMG, extended forward)
  const rightArm = createLimb(0.055, 0.55, armMaterial);
  rightArm.position.set(0.28, 1.2, 0);
  rightArm.rotation.z = -0.1;
  shooter.add(rightArm);

  // --- Hands ---
  const handGeometry = new THREE.SphereGeometry(0.055, 8, 6);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.28, 0.9, 0.1);
  leftHand.castShadow = true;
  shooter.add(leftHand);

  // Right hand
  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.28, 0.9, 0.1);
  rightHand.castShadow = true;
  shooter.add(rightHand);

  // --- SMG ---
  const smg = new THREE.Group();
  smg.name = 'SMG';

  // Receiver (main body)
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.3),
    smgMetalMaterial
  );
  receiver.position.set(0, 0, 0.08);
  receiver.castShadow = true;
  smg.add(receiver);

  // Short barrel
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8),
    smgMetalMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.12);
  barrel.castShadow = true;
  smg.add(barrel);

  // Box magazine
  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.15, 0.05),
    smgDarkMaterial
  );
  magazine.position.set(0, -0.1, 0.06);
  magazine.rotation.x = -0.1;
  magazine.castShadow = true;
  smg.add(magazine);

  // Stock (compact)
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.05, 0.12),
    smgDarkMaterial
  );
  stock.position.set(0, 0.01, 0.24);
  stock.castShadow = true;
  smg.add(stock);

  // Front grip
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.08, 0.03),
    smgDarkMaterial
  );
  grip.position.set(0, -0.05, -0.05);
  grip.castShadow = true;
  smg.add(grip);

  // Position SMG in front of torso
  smg.position.set(0, 0.95, 0.25);
  shooter.add(smg);

  // --- Debug name tag ---
  const tagGeometry = new THREE.BoxGeometry(0.2, 0.03, 0.05);
  const tagMaterial = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.3,
  });
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.position.set(0, 1.75, 0);
  shooter.add(tag);

  return shooter;
}

/**
 * Creates the Tank enemy model — a large, bulky soldier with heavy armor and a minigun.
 * Height ~2.2m, facing +Z direction.
 *
 * @returns THREE.Group containing the complete Tank model
 */
export function createTankModel(): THREE.Group {
  const tank = new THREE.Group();
  tank.name = 'Tank_Enemy';
  tank.userData.enemyType = 'tank';
  tank.userData.hitbox = {
    minX: -0.45,
    minY: 0,
    minZ: -0.45,
    maxX: 0.45,
    maxY: 2.2,
    maxZ: 0.45,
  };

  // --- Materials ---
  const armorMaterial = new THREE.MeshStandardMaterial({
    color: TANK_ARMOR,
    roughness: 0.5,
    metalness: 0.6,
  });

  const armorAccentMaterial = new THREE.MeshStandardMaterial({
    color: TANK_ARMOR_ACCENT,
    roughness: 0.6,
    metalness: 0.5,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.9,
    metalness: 0.0,
  });

  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.0,
  });

  const minigunMetalMaterial = new THREE.MeshStandardMaterial({
    color: METAL_DARK,
    roughness: 0.3,
    metalness: 0.9,
  });

  const minigunDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.7,
  });

  const ammoBeltMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a6a3a,
    roughness: 0.8,
    metalness: 0.2,
  });

  // --- Torso (large and bulky) ---
  const torso = createTorso(0.65, 0.7, 0.35, armorMaterial);
  torso.position.set(0, 1.4, 0);
  tank.add(torso);

  // --- Chest armor plate (heavy) ---
  const chestPlate = createBox(0.55, 0.35, 0.08, armorAccentMaterial);
  chestPlate.position.set(0, 1.5, 0.2);
  tank.add(chestPlate);

  // --- Shoulder armor plates (large) ---
  const leftShoulder = createBox(0.22, 0.15, 0.28, armorAccentMaterial);
  leftShoulder.position.set(-0.4, 1.7, 0);
  tank.add(leftShoulder);

  const rightShoulder = createBox(0.22, 0.15, 0.28, armorAccentMaterial);
  rightShoulder.position.set(0.4, 1.7, 0);
  tank.add(rightShoulder);

  // --- Head (smaller relative to body) ---
  const head = createHead(0.13);
  head.position.set(0, 1.9, 0);
  tank.add(head);

  // --- Helmet (heavy) ---
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 8),
    armorAccentMaterial
  );
  helmet.position.set(0, 1.93, 0);
  helmet.scale.y = 0.7;
  helmet.castShadow = true;
  tank.add(helmet);

  // --- Legs (thick) ---
  // Left leg
  const leftLeg = createLimb(0.13, 0.85, pantsMaterial);
  leftLeg.position.set(-0.18, 0.425, 0);
  tank.add(leftLeg);

  // Right leg
  const rightLeg = createLimb(0.13, 0.85, pantsMaterial);
  rightLeg.position.set(0.18, 0.425, 0);
  tank.add(rightLeg);

  // --- Boots (large) ---
  const bootGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
  const bootMesh = new THREE.Mesh(bootGeometry, bootMaterial);
  bootMesh.castShadow = true;
  bootMesh.receiveShadow = true;

  // Left boot
  const leftBoot = bootMesh.clone();
  leftBoot.position.set(-0.18, 0.05, 0.06);
  tank.add(leftBoot);

  // Right boot
  const rightBoot = bootMesh.clone();
  rightBoot.position.set(0.18, 0.05, 0.06);
  tank.add(rightBoot);

  // --- Arms (thick) ---
  const armMaterial = armorMaterial;

  // Left arm
  const leftArm = createLimb(0.09, 0.7, armMaterial);
  leftArm.position.set(-0.42, 1.55, 0);
  leftArm.rotation.z = 0.08;
  tank.add(leftArm);

  // Right arm (holding minigun)
  const rightArm = createLimb(0.09, 0.7, armMaterial);
  rightArm.position.set(0.42, 1.55, 0);
  rightArm.rotation.z = -0.08;
  tank.add(rightArm);

  // --- Hands ---
  const handGeometry = new THREE.SphereGeometry(0.08, 8, 6);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.42, 1.2, 0.12);
  leftHand.castShadow = true;
  tank.add(leftHand);

  // Right hand
  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.42, 1.2, 0.12);
  rightHand.castShadow = true;
  tank.add(rightHand);

  // --- Minigun ---
  const minigun = new THREE.Group();
  minigun.name = 'Minigun';

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.14, 0.4),
    minigunMetalMaterial
  );
  body.position.set(0, 0, 0.1);
  body.castShadow = true;
  minigun.add(body);

  // Rotating barrel cylinder (6 barrels)
  const barrelCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6),
    minigunDarkMaterial
  );
  barrelCylinder.rotation.x = Math.PI / 2;
  barrelCylinder.position.set(0, 0.02, -0.15);
  barrelCylinder.castShadow = true;
  minigun.add(barrelCylinder);

  // Barrel tips
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const barrelTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6),
      minigunMetalMaterial
    );
    barrelTip.rotation.x = Math.PI / 2;
    barrelTip.position.set(
      Math.cos(angle) * 0.05,
      0.02 + Math.sin(angle) * 0.05,
      -0.32
    );
    barrelTip.castShadow = true;
    minigun.add(barrelTip);
  }

  // Ammo belt (curved boxes)
  for (let i = 0; i < 5; i++) {
    const beltLink = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.03),
      ammoBeltMaterial
    );
    beltLink.position.set(0, -0.1 - i * 0.04, 0.15 + i * 0.02);
    beltLink.castShadow = true;
    minigun.add(beltLink);
  }

  // Ammo box
  const ammoBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.12, 0.1),
    minigunDarkMaterial
  );
  ammoBox.position.set(0, -0.15, 0.2);
  ammoBox.castShadow = true;
  minigun.add(ammoBox);

  // Position minigun in front of torso
  minigun.position.set(0, 1.25, 0.35);
  tank.add(minigun);

  // --- Debug name tag ---
  const tagGeometry = new THREE.BoxGeometry(0.25, 0.03, 0.05);
  const tagMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.3,
  });
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.position.set(0, 2.15, 0);
  tank.add(tag);

  return tank;
}

/**
 * Creates the Sniper enemy model — a soldier in a ghillie suit with a sniper rifle.
 * Height ~1.8m, facing +Z direction.
 *
 * @returns THREE.Group containing the complete Sniper model
 */
export function createSniperModel(): THREE.Group {
  const sniper = new THREE.Group();
  sniper.name = 'Sniper_Enemy';
  sniper.userData.enemyType = 'sniper';
  sniper.userData.hitbox = {
    minX: -0.3,
    minY: 0,
    minZ: -0.3,
    maxX: 0.3,
    maxY: 1.8,
    maxZ: 0.3,
  };

  // --- Materials ---
  const ghillieBaseMaterial = new THREE.MeshStandardMaterial({
    color: GHILLIE_BASE,
    roughness: 0.95,
    metalness: 0.0,
  });

  const ghillieTuftMaterial = new THREE.MeshStandardMaterial({
    color: GHILLIE_TUFT,
    roughness: 0.95,
    metalness: 0.0,
  });

  const ghillieTuftDarkMaterial = new THREE.MeshStandardMaterial({
    color: GHILLIE_TUFT_DARK,
    roughness: 0.95,
    metalness: 0.0,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a2a,
    roughness: 0.9,
    metalness: 0.0,
  });

  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3a1a,
    roughness: 0.95,
    metalness: 0.0,
  });

  const rifleMetalMaterial = new THREE.MeshStandardMaterial({
    color: METAL_DARK,
    roughness: 0.3,
    metalness: 0.9,
  });

  const rifleDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.7,
  });

  const scopeMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.2,
    metalness: 0.8,
  });

  const scopeGlassMaterial = new THREE.MeshStandardMaterial({
    color: 0x4488cc,
    roughness: 0.1,
    metalness: 0.3,
    emissive: 0x224466,
    emissiveIntensity: 0.3,
  });

  // --- Torso ---
  const torso = createTorso(0.42, 0.52, 0.24, ghillieBaseMaterial);
  torso.position.set(0, 1.12, 0);
  sniper.add(torso);

  // --- Ghillie tufts on torso (small boxes/spheres) ---
  const tuftPositions: [number, number, number][] = [
    [-0.15, 1.3, 0.12],
    [0.15, 1.3, 0.12],
    [-0.1, 1.15, 0.13],
    [0.1, 1.15, 0.13],
    [-0.18, 1.25, 0.08],
    [0.18, 1.25, 0.08],
    [-0.12, 1.05, 0.12],
    [0.12, 1.05, 0.12],
  ];

  for (const [x, y, z] of tuftPositions) {
    const tuft = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 4),
      Math.random() > 0.5 ? ghillieTuftMaterial : ghillieTuftDarkMaterial
    );
    tuft.position.set(x, y, z);
    tuft.scale.y = 1.5;
    tuft.castShadow = true;
    sniper.add(tuft);
  }

  // --- Head ---
  const head = createHead(0.12);
  head.position.set(0, 1.5, 0);
  sniper.add(head);

  // --- Ghillie hood (tufted sphere around head) ---
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 10, 8),
    ghillieBaseMaterial
  );
  hood.position.set(0, 1.52, 0);
  hood.scale.y = 0.8;
  hood.castShadow = true;
  sniper.add(hood);

  // Hood tufts
  const hoodTuftPositions: [number, number, number][] = [
    [-0.1, 1.6, 0.05],
    [0.1, 1.6, 0.05],
    [0, 1.62, 0],
    [-0.12, 1.55, -0.05],
    [0.12, 1.55, -0.05],
  ];

  for (const [x, y, z] of hoodTuftPositions) {
    const tuft = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 4),
      Math.random() > 0.5 ? ghillieTuftMaterial : ghillieTuftDarkMaterial
    );
    tuft.position.set(x, y, z);
    tuft.scale.y = 1.5;
    tuft.castShadow = true;
    sniper.add(tuft);
  }

  // --- Legs ---
  // Left leg
  const leftLeg = createLimb(0.08, 0.72, pantsMaterial);
  leftLeg.position.set(-0.11, 0.36, 0);
  sniper.add(leftLeg);

  // Right leg
  const rightLeg = createLimb(0.08, 0.72, pantsMaterial);
  rightLeg.position.set(0.11, 0.36, 0);
  sniper.add(rightLeg);

  // --- Boots ---
  const bootGeometry = new THREE.BoxGeometry(0.13, 0.07, 0.23);
  const bootMesh = new THREE.Mesh(bootGeometry, bootMaterial);
  bootMesh.castShadow = true;
  bootMesh.receiveShadow = true;

  // Left boot
  const leftBoot = bootMesh.clone();
  leftBoot.position.set(-0.11, 0.035, 0.05);
  sniper.add(leftBoot);

  // Right boot
  const rightBoot = bootMesh.clone();
  rightBoot.position.set(0.11, 0.035, 0.05);
  sniper.add(rightBoot);

  // --- Arms ---
  const armMaterial = ghillieBaseMaterial;

  // Left arm
  const leftArm = createLimb(0.055, 0.55, armMaterial);
  leftArm.position.set(-0.28, 1.2, 0);
  leftArm.rotation.z = 0.1;
  sniper.add(leftArm);

  // Right arm
  const rightArm = createLimb(0.055, 0.55, armMaterial);
  rightArm.position.set(0.28, 1.2, 0);
  rightArm.rotation.z = -0.1;
  sniper.add(rightArm);

  // Arm tufts
  const armTuftPositions: [number, number, number][] = [
    [-0.28, 1.15, 0.08],
    [0.28, 1.15, 0.08],
    [-0.25, 1.25, 0.05],
    [0.25, 1.25, 0.05],
  ];

  for (const [x, y, z] of armTuftPositions) {
    const tuft = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 4),
      Math.random() > 0.5 ? ghillieTuftMaterial : ghillieTuftDarkMaterial
    );
    tuft.position.set(x, y, z);
    tuft.scale.y = 1.5;
    tuft.castShadow = true;
    sniper.add(tuft);
  }

  // --- Hands ---
  const handGeometry = new THREE.SphereGeometry(0.055, 8, 6);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.28, 0.9, 0.1);
  leftHand.castShadow = true;
  sniper.add(leftHand);

  // Right hand
  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.28, 0.9, 0.1);
  rightHand.castShadow = true;
  sniper.add(rightHand);

  // --- Sniper Rifle ---
  const rifle = new THREE.Group();
  rifle.name = 'Sniper_Rifle';

  // Receiver (long main body)
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.45),
    rifleMetalMaterial
  );
  receiver.position.set(0, 0, 0.1);
  receiver.castShadow = true;
  rifle.add(receiver);

  // Long barrel
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8),
    rifleMetalMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.25);
  barrel.castShadow = true;
  rifle.add(barrel);

  // Magazine
  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.15, 0.05),
    rifleDarkMaterial
  );
  magazine.position.set(0, -0.1, 0.08);
  magazine.rotation.x = -0.1;
  magazine.castShadow = true;
  rifle.add(magazine);

  // Stock
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.05, 0.2),
    rifleDarkMaterial
  );
  stock.position.set(0, 0.01, 0.38);
  stock.castShadow = true;
  rifle.add(stock);

  // Scope (cylinder + lens)
  const scopeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8),
    scopeMaterial
  );
  scopeBody.rotation.x = Math.PI / 2;
  scopeBody.position.set(0, 0.06, 0.05);
  scopeBody.castShadow = true;
  rifle.add(scopeBody);

  // Scope front lens
  const scopeLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.025, 8),
    scopeGlassMaterial
  );
  scopeLens.rotation.y = Math.PI / 2;
  scopeLens.position.set(0, 0.06, -0.04);
  rifle.add(scopeLens);

  // Scope rear lens
  const scopeRear = new THREE.Mesh(
    new THREE.CircleGeometry(0.02, 8),
    scopeGlassMaterial
  );
  scopeRear.rotation.y = -Math.PI / 2;
  scopeRear.position.set(0, 0.06, 0.14);
  rifle.add(scopeRear);

  // Bipod
  const bipodLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4),
    rifleDarkMaterial
  );
  bipodLeft.position.set(-0.02, -0.08, -0.15);
  bipodLeft.rotation.z = 0.3;
  bipodLeft.castShadow = true;
  rifle.add(bipodLeft);

  const bipodRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4),
    rifleDarkMaterial
  );
  bipodRight.position.set(0.02, -0.08, -0.15);
  bipodRight.rotation.z = -0.3;
  bipodRight.castShadow = true;
  rifle.add(bipodRight);

  // Position rifle in front of torso
  rifle.position.set(0, 0.95, 0.3);
  sniper.add(rifle);

  // --- Debug name tag ---
  const tagGeometry = new THREE.BoxGeometry(0.2, 0.03, 0.05);
  const tagMaterial = new THREE.MeshBasicMaterial({
    color: 0x88ff44,
    transparent: true,
    opacity: 0.3,
  });
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.position.set(0, 1.75, 0);
  sniper.add(tag);

  return sniper;
}

/**
 * Creates the Suicide Bomber enemy model — a soldier with a vest with blinking red light.
 * Height ~1.75m, facing +Z direction.
 *
 * @returns THREE.Group containing the complete Suicide Bomber model
 */
export function createSuicideBomberModel(): THREE.Group {
  const bomber = new THREE.Group();
  bomber.name = 'Suicide_Bomber_Enemy';
  bomber.userData.enemyType = 'suicide';
  bomber.userData.hitbox = {
    minX: -0.28,
    minY: 0,
    minZ: -0.28,
    maxX: 0.28,
    maxY: 1.75,
    maxZ: 0.28,
  };

  // --- Materials ---
  const vestMaterial = new THREE.MeshStandardMaterial({
    color: BOMBER_VEST,
    roughness: 0.8,
    metalness: 0.1,
  });

  const vestDarkMaterial = new THREE.MeshStandardMaterial({
    color: BOMBER_VEST_DARK,
    roughness: 0.8,
    metalness: 0.1,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: DARK_PANTS,
    roughness: 0.9,
    metalness: 0.0,
  });

  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.0,
  });

  const wireMaterial = new THREE.MeshStandardMaterial({
    color: BOMBER_WIRE,
    roughness: 0.5,
    metalness: 0.5,
  });

  const backpackMaterial = new THREE.MeshStandardMaterial({
    color: BOMBER_BACKPACK,
    roughness: 0.7,
    metalness: 0.3,
  });

  const lightMaterial = new THREE.MeshBasicMaterial({
    color: BOMBER_LIGHT_RED,
    transparent: true,
    opacity: 0.9,
  });

  // --- Torso ---
  const torso = createTorso(0.4, 0.5, 0.22, vestMaterial);
  torso.position.set(0, 1.1, 0);
  bomber.add(torso);

  // --- Explosive vest (outer layer) ---
  const vest = createBox(0.44, 0.4, 0.1, vestDarkMaterial);
  vest.position.set(0, 1.15, 0.14);
  bomber.add(vest);

  // --- Blinking red light on chest ---
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 6),
    lightMaterial
  );
  light.position.set(0, 1.2, 0.2);
  light.castShadow = true;
  bomber.add(light);

  // --- Wires (thin cylinders from light to vest edges) ---
  const wirePositions: [number, number, number, number, number, number][] = [
    [0, 1.2, 0.2, -0.15, 1.15, 0.18],
    [0, 1.2, 0.2, 0.15, 1.15, 0.18],
    [0, 1.2, 0.2, 0, 1.35, 0.17],
    [0, 1.2, 0.2, 0, 1.0, 0.18],
  ];

  for (const [x1, y1, z1, x2, y2, z2] of wirePositions) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1, 4),
      wireMaterial
    );
    wire.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    wire.scale.y = Math.sqrt(
      (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (z2 - z1) * (z2 - z1)
    );
    wire.rotation.z = Math.atan2(x2 - x1, y2 - y1);
    wire.rotation.x = Math.atan2(z2 - z1, y2 - y1);
    wire.castShadow = true;
    bomber.add(wire);
  }

  // --- Backpack (explosive charge on back) ---
  const backpack = createBox(0.3, 0.35, 0.15, backpackMaterial);
  backpack.position.set(0, 1.15, -0.18);
  bomber.add(backpack);

  // Backpack straps (thin boxes)
  const strapLeft = createBox(0.03, 0.4, 0.02, vestDarkMaterial);
  strapLeft.position.set(-0.2, 1.15, -0.05);
  bomber.add(strapLeft);

  const strapRight = createBox(0.03, 0.4, 0.02, vestDarkMaterial);
  strapRight.position.set(0.2, 1.15, -0.05);
  bomber.add(strapRight);

  // --- Head ---
  const head = createHead(0.12);
  head.position.set(0, 1.5, 0);
  bomber.add(head);

  // --- Legs ---
  // Left leg
  const leftLeg = createLimb(0.08, 0.7, pantsMaterial);
  leftLeg.position.set(-0.11, 0.35, 0);
  bomber.add(leftLeg);

  // Right leg
  const rightLeg = createLimb(0.08, 0.7, pantsMaterial);
  rightLeg.position.set(0.11, 0.35, 0);
  bomber.add(rightLeg);

  // --- Boots ---
  const bootGeometry = new THREE.BoxGeometry(0.13, 0.07, 0.23);
  const bootMesh = new THREE.Mesh(bootGeometry, bootMaterial);
  bootMesh.castShadow = true;
  bootMesh.receiveShadow = true;

  // Left boot
  const leftBoot = bootMesh.clone();
  leftBoot.position.set(-0.11, 0.035, 0.05);
  bomber.add(leftBoot);

  // Right boot
  const rightBoot = bootMesh.clone();
  rightBoot.position.set(0.11, 0.035, 0.05);
  bomber.add(rightBoot);

  // --- Arms ---
  const armMaterial = vestMaterial;

  // Left arm
  const leftArm = createLimb(0.055, 0.55, armMaterial);
  leftArm.position.set(-0.28, 1.2, 0);
  leftArm.rotation.z = 0.1;
  bomber.add(leftArm);

  // Right arm
  const rightArm = createLimb(0.055, 0.55, armMaterial);
  rightArm.position.set(0.28, 1.2, 0);
  rightArm.rotation.z = -0.1;
  bomber.add(rightArm);

  // --- Hands ---
  const handGeometry = new THREE.SphereGeometry(0.055, 8, 6);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: SKIN_TONE,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.28, 0.9, 0.1);
  leftHand.castShadow = true;
  bomber.add(leftHand);

  // Right hand
  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.28, 0.9, 0.1);
  rightHand.castShadow = true;
  bomber.add(rightHand);

  // --- Debug name tag ---
  const tagGeometry = new THREE.BoxGeometry(0.18, 0.03, 0.05);
  const tagMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.3,
  });
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.position.set(0, 1.7, 0);
  bomber.add(tag);

  return bomber;
}

/**
 * Factory function to create an enemy model by type.
 *
 * @param type - The enemy type: 'grunt', 'rusher', 'shooter', 'tank', 'sniper', or 'suicide'
 * @returns THREE.Group containing the enemy model
 * @throws Error if an unknown enemy type is provided
 */
export function createEnemyModel(
  type: 'grunt' | 'rusher' | 'shooter' | 'tank' | 'sniper' | 'suicide'
): THREE.Group {
  switch (type) {
    case 'grunt':
      return createGruntModel();
    case 'rusher':
      return createRusherModel();
    case 'shooter':
      return createShooterModel();
    case 'tank':
      return createTankModel();
    case 'sniper':
      return createSniperModel();
    case 'suicide':
      return createSuicideBomberModel();
    default:
      throw new Error(`Unknown enemy type: ${type}`);
  }
}