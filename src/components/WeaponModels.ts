import * as THREE from 'three';

/**
 * WeaponModels — Procedural First-Person Weapon Models
 *
 * Constructs detailed weapon models from THREE.js primitives.
 * All models are oriented with -Z as forward (muzzle direction) to match the
 * camera's view space convention.
 *
 * Models:
 * - M9 Pistol (existing)
 * - AK-47 Rifle (existing)
 * - MP5 SMG (new)
 * - M870 Shotgun (new)
 * - AWM Sniper Rifle (new)
 * - M249 LMG (new)
 */

/** Duration of the muzzle flash effect in seconds. */
export const MUZZLE_FLASH_DURATION = 0.05;

/**
 * Creates a detailed M9 pistol model.
 * The model is oriented with the muzzle pointing toward -Z.
 *
 * @returns THREE.Group containing the complete M9 pistol model
 */
export function createM9Model(): THREE.Group {
  const m9 = new THREE.Group();
  m9.name = 'M9_Pistol';

  // --- Materials ---
  const slideMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.35,
    metalness: 0.85,
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.45,
    metalness: 0.7,
  });

  const gripMaterial = new THREE.MeshStandardMaterial({
    color: 0x151515,
    roughness: 0.6,
    metalness: 0.4,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });

  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.25,
    metalness: 0.9,
  });

  const triggerMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.5,
    metalness: 0.6,
  });

  // --- Slide (main body, slightly rounded via stacked boxes) ---
  const slideMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.045, 0.16),
    slideMaterial
  );
  slideMain.position.set(0, 0.02, -0.02);
  slideMain.castShadow = true;
  m9.add(slideMain);

  // Slide top (slightly narrower for rounded appearance)
  const slideTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.015, 0.15),
    slideMaterial
  );
  slideTop.position.set(0, 0.0475, -0.02);
  slideTop.castShadow = true;
  m9.add(slideTop);

  // Slide front (beveled look)
  const slideFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.04, 0.02),
    slideMaterial
  );
  slideFront.position.set(0, 0.02, -0.11);
  slideFront.castShadow = true;
  m9.add(slideFront);

  // --- Barrel (protruding from slide front) ---
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.14);
  barrel.castShadow = true;
  m9.add(barrel);

  // Barrel tip (slightly wider)
  const barrelTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.015, 12),
    barrelMaterial
  );
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(0, 0.02, -0.175);
  barrelTip.castShadow = true;
  m9.add(barrelTip);

  // --- Frame (lower body) ---
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.025, 0.12),
    frameMaterial
  );
  frame.position.set(0, -0.005, 0.0);
  frame.castShadow = true;
  m9.add(frame);

  // Frame rail (under slide)
  const frameRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.01, 0.08),
    frameMaterial
  );
  frameRail.position.set(0, 0.0, -0.03);
  frameRail.castShadow = true;
  m9.add(frameRail);

  // --- Grip (angled slightly) ---
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.07, 0.045),
    gripMaterial
  );
  grip.position.set(0, -0.05, 0.045);
  grip.rotation.x = 0.15; // Slight backward angle
  grip.castShadow = true;
  m9.add(grip);

  // Grip texture detail (horizontal ridges)
  for (let i = 0; i < 4; i++) {
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.004, 0.047),
      gripMaterial
    );
    ridge.position.set(0, -0.035 - i * 0.012, 0.045);
    ridge.rotation.x = 0.15;
    m9.add(ridge);
  }

  // --- Trigger Guard ---
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.02, 0.03),
    frameMaterial
  );
  triggerGuard.position.set(0, -0.025, -0.01);
  triggerGuard.castShadow = true;
  m9.add(triggerGuard);

  // --- Trigger ---
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.018, 0.012),
    triggerMaterial
  );
  trigger.position.set(0, -0.02, -0.01);
  trigger.castShadow = true;
  m9.add(trigger);

  // --- Front Sight ---
  const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.012, 0.008),
    sightMaterial
  );
  frontSight.position.set(0, 0.06, -0.09);
  frontSight.castShadow = true;
  m9.add(frontSight);

  // --- Rear Sight ---
  const rearSightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.006, 0.012),
    sightMaterial
  );
  rearSightBase.position.set(0, 0.055, 0.05);
  rearSightBase.castShadow = true;
  m9.add(rearSightBase);

  // Rear sight notches (two small posts)
  const rearSightLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.008, 0.008),
    sightMaterial
  );
  rearSightLeft.position.set(-0.005, 0.062, 0.05);
  rearSightLeft.castShadow = true;
  m9.add(rearSightLeft);

  const rearSightRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.008, 0.008),
    sightMaterial
  );
  rearSightRight.position.set(0.005, 0.062, 0.05);
  rearSightRight.castShadow = true;
  m9.add(rearSightRight);

  // --- Slide serrations (rear detail) ---
  for (let i = 0; i < 3; i++) {
    const serration = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.035, 0.003),
      slideMaterial
    );
    serration.position.set(0, 0.02, 0.055 + i * 0.006);
    m9.add(serration);
  }

  // --- Ejection port (small dark box on right side) ---
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.02, 0.025),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.3,
    })
  );
  ejectionPort.position.set(0.018, 0.025, -0.04);
  m9.add(ejectionPort);

  // --- Hammer (small box at rear) ---
  const hammer = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.012, 0.008),
    frameMaterial
  );
  hammer.position.set(0, 0.035, 0.085);
  hammer.castShadow = true;
  m9.add(hammer);

  // --- Magazine base plate ---
  const magBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.008, 0.05),
    gripMaterial
  );
  magBase.position.set(0, -0.088, 0.045);
  magBase.rotation.x = 0.15;
  magBase.castShadow = true;
  m9.add(magBase);

  return m9;
}

/**
 * Creates a detailed AK-47 rifle model.
 * The model is oriented with the muzzle pointing toward -Z.
 *
 * @returns THREE.Group containing the complete AK-47 rifle model
 */
export function createAK47Model(): THREE.Group {
  const ak47 = new THREE.Group();
  ak47.name = 'AK47_Rifle';

  // --- Materials ---
  const receiverMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.8,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4226,
    roughness: 0.7,
    metalness: 0.05,
  });

  const woodDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a3520,
    roughness: 0.75,
    metalness: 0.05,
  });

  const magazineMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.5,
    metalness: 0.6,
  });

  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.25,
    metalness: 0.9,
  });

  const gasTubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.35,
    metalness: 0.85,
  });

  // --- Receiver (main body) ---
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.28),
    receiverMaterial
  );
  receiver.position.set(0, 0.02, 0.05);
  receiver.castShadow = true;
  ak47.add(receiver);

  // Receiver top cover (slightly narrower)
  const receiverTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.015, 0.25),
    receiverMaterial
  );
  receiverTop.position.set(0, 0.0575, 0.05);
  receiverTop.castShadow = true;
  ak47.add(receiverTop);

  // --- Barrel ---
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.18);
  barrel.castShadow = true;
  ak47.add(barrel);

  // Barrel front sight base
  const frontSightBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12),
    barrelMaterial
  );
  frontSightBase.rotation.x = Math.PI / 2;
  frontSightBase.position.set(0, 0.02, -0.33);
  frontSightBase.castShadow = true;
  ak47.add(frontSightBase);

  // Muzzle brake
  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.03, 12),
    barrelMaterial
  );
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.02, -0.36);
  muzzleBrake.castShadow = true;
  ak47.add(muzzleBrake);

  // --- Gas Tube (above barrel) ---
  const gasTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.24, 10),
    gasTubeMaterial
  );
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.045, -0.15);
  gasTube.castShadow = true;
  ak47.add(gasTube);

  // Gas tube connection to receiver
  const gasBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.025, 0.02),
    gasTubeMaterial
  );
  gasBlock.position.set(0, 0.045, -0.28);
  gasBlock.castShadow = true;
  ak47.add(gasBlock);

  // --- Wooden Handguard (under barrel) ---
  const handguard = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.035, 0.18),
    woodMaterial
  );
  handguard.position.set(0, -0.005, -0.12);
  handguard.castShadow = true;
  ak47.add(handguard);

  // Handguard detail (ventilation slots)
  for (let i = 0; i < 4; i++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.025, 0.008),
      woodDarkMaterial
    );
    slot.position.set(0.02, -0.005, -0.16 + i * 0.02);
    ak47.add(slot);

    const slotLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.025, 0.008),
      woodDarkMaterial
    );
    slotLeft.position.set(-0.02, -0.005, -0.16 + i * 0.02);
    ak47.add(slotLeft);
  }

  // --- Wooden Stock ---
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.05, 0.2),
    woodMaterial
  );
  stock.position.set(0, 0.02, 0.25);
  stock.castShadow = true;
  ak47.add(stock);

  // Stock butt plate
  const buttPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.055, 0.01),
    woodDarkMaterial
  );
  buttPlate.position.set(0, 0.02, 0.35);
  buttPlate.castShadow = true;
  ak47.add(buttPlate);

  // --- Curved Magazine ---
  // Main magazine body (slightly curved via rotation)
  const magazineBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.16, 0.05),
    magazineMaterial
  );
  magazineBody.position.set(0, -0.09, 0.02);
  magazineBody.rotation.x = -0.12; // Slight curve approximation
  magazineBody.castShadow = true;
  ak47.add(magazineBody);

  // Magazine curve detail (lower section angled more)
  const magazineLower = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.06, 0.045),
    magazineMaterial
  );
  magazineLower.position.set(0, -0.18, 0.015);
  magazineLower.rotation.x = -0.25;
  magazineLower.castShadow = true;
  ak47.add(magazineLower);

  // Magazine base plate
  const magazineBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.037, 0.012, 0.052),
    magazineMaterial
  );
  magazineBase.position.set(0, -0.215, 0.01);
  magazineBase.rotation.x = -0.25;
  magazineBase.castShadow = true;
  ak47.add(magazineBase);

  // --- Front Sight Post ---
  const frontSightPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.02, 0.008),
    sightMaterial
  );
  frontSightPost.position.set(0, 0.075, -0.33);
  frontSightPost.castShadow = true;
  ak47.add(frontSightPost);

  // Front sight ears (protective wings)
  const frontSightEarLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.025, 0.015),
    sightMaterial
  );
  frontSightEarLeft.position.set(-0.012, 0.07, -0.33);
  frontSightEarLeft.castShadow = true;
  ak47.add(frontSightEarLeft);

  const frontSightEarRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.025, 0.015),
    sightMaterial
  );
  frontSightEarRight.position.set(0.012, 0.07, -0.33);
  frontSightEarRight.castShadow = true;
  ak47.add(frontSightEarRight);

  // --- Rear Sight (on receiver top) ---
  const rearSightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.01, 0.02),
    sightMaterial
  );
  rearSightBase.position.set(0, 0.07, 0.12);
  rearSightBase.castShadow = true;
  ak47.add(rearSightBase);

  const rearSightPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.012, 0.006),
    sightMaterial
  );
  rearSightPost.position.set(0, 0.081, 0.12);
  rearSightPost.castShadow = true;
  ak47.add(rearSightPost);

  // --- Trigger Guard ---
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.02, 0.04),
    receiverMaterial
  );
  triggerGuard.position.set(0, -0.035, 0.08);
  triggerGuard.castShadow = true;
  ak47.add(triggerGuard);

  // --- Trigger ---
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.02, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.6,
    })
  );
  trigger.position.set(0, -0.03, 0.08);
  trigger.castShadow = true;
  ak47.add(trigger);

  // --- Pistol Grip (below receiver) ---
  const pistolGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.06, 0.04),
    woodMaterial
  );
  pistolGrip.position.set(0, -0.06, 0.1);
  pistolGrip.rotation.x = 0.2;
  pistolGrip.castShadow = true;
  ak47.add(pistolGrip);

  // --- Charging Handle (right side) ---
  const chargingHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.012, 0.03),
    receiverMaterial
  );
  chargingHandle.position.set(0.028, 0.03, 0.1);
  chargingHandle.castShadow = true;
  ak47.add(chargingHandle);

  // --- Ejection Port (right side) ---
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.025, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.3,
    })
  );
  ejectionPort.position.set(0.026, 0.03, 0.0);
  ak47.add(ejectionPort);

  // --- Dust Cover (over ejection port) ---
  const dustCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.02, 0.035),
    receiverMaterial
  );
  dustCover.position.set(0.027, 0.035, 0.0);
  ak47.add(dustCover);

  // --- Sling Mount (left side) ---
  const slingMount = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.015, 0.01),
    receiverMaterial
  );
  slingMount.position.set(-0.028, 0.0, 0.2);
  slingMount.castShadow = true;
  ak47.add(slingMount);

  return ak47;
}

/**
 * Creates a detailed MP5 SMG model.
 * The model is oriented with the muzzle pointing toward -Z.
 *
 * @returns THREE.Group containing the complete MP5 SMG model
 */
export function createMP5Model(): THREE.Group {
  const mp5 = new THREE.Group();
  mp5.name = 'MP5_SMG';

  // --- Materials ---
  const receiverMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.8,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });

  const polymerMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.6,
    metalness: 0.3,
  });

  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.25,
    metalness: 0.9,
  });

  const magazineMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.5,
    metalness: 0.6,
  });

  // --- Receiver (main body) ---
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.055, 0.22),
    receiverMaterial
  );
  receiver.position.set(0, 0.02, 0.02);
  receiver.castShadow = true;
  mp5.add(receiver);

  // Receiver top (slightly narrower)
  const receiverTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.015, 0.2),
    receiverMaterial
  );
  receiverTop.position.set(0, 0.0525, 0.02);
  receiverTop.castShadow = true;
  mp5.add(receiverTop);

  // --- Barrel ---
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.18, 12),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.16);
  barrel.castShadow = true;
  mp5.add(barrel);

  // Suppressor-style tip
  const suppressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.06, 12),
    barrelMaterial
  );
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0.02, -0.28);
  suppressor.castShadow = true;
  mp5.add(suppressor);

  // --- Retractable Stock (two thin rods + butt pad) ---
  // Left rod
  const stockRodLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.18, 8),
    receiverMaterial
  );
  stockRodLeft.rotation.x = Math.PI / 2;
  stockRodLeft.position.set(-0.015, 0.02, 0.2);
  stockRodLeft.castShadow = true;
  mp5.add(stockRodLeft);

  // Right rod
  const stockRodRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.18, 8),
    receiverMaterial
  );
  stockRodRight.rotation.x = Math.PI / 2;
  stockRodRight.position.set(0.015, 0.02, 0.2);
  stockRodRight.castShadow = true;
  mp5.add(stockRodRight);

  // Butt pad
  const buttPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 0.02),
    polymerMaterial
  );
  buttPad.position.set(0, 0.02, 0.29);
  buttPad.castShadow = true;
  mp5.add(buttPad);

  // --- Vertical Foregrip ---
  const foregrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.06, 0.035),
    polymerMaterial
  );
  foregrip.position.set(0, -0.045, -0.1);
  foregrip.castShadow = true;
  mp5.add(foregrip);

  // --- Curved Magazine ---
  const magazineBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.14, 0.045),
    magazineMaterial
  );
  magazineBody.position.set(0, -0.08, 0.0);
  magazineBody.rotation.x = -0.15;
  magazineBody.castShadow = true;
  mp5.add(magazineBody);

  const magazineLower = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.05, 0.04),
    magazineMaterial
  );
  magazineLower.position.set(0, -0.16, -0.01);
  magazineLower.rotation.x = -0.3;
  magazineLower.castShadow = true;
  mp5.add(magazineLower);

  // Magazine base plate
  const magazineBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.01, 0.047),
    magazineMaterial
  );
  magazineBase.position.set(0, -0.185, -0.015);
  magazineBase.rotation.x = -0.3;
  magazineBase.castShadow = true;
  mp5.add(magazineBase);

  // --- Front Sight (ring type) ---
  const frontSightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.015, 0.01),
    sightMaterial
  );
  frontSightBase.position.set(0, 0.065, -0.2);
  frontSightBase.castShadow = true;
  mp5.add(frontSightBase);

  const frontSightPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.015, 0.005),
    sightMaterial
  );
  frontSightPost.position.set(0, 0.08, -0.2);
  frontSightPost.castShadow = true;
  mp5.add(frontSightPost);

  // --- Rear Sight (diopter type) ---
  const rearSightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.02, 0.015),
    sightMaterial
  );
  rearSightBase.position.set(0, 0.065, 0.12);
  rearSightBase.castShadow = true;
  mp5.add(rearSightBase);

  const rearSightRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.008, 10),
    sightMaterial
  );
  rearSightRing.rotation.x = Math.PI / 2;
  rearSightRing.position.set(0, 0.08, 0.12);
  rearSightRing.castShadow = true;
  mp5.add(rearSightRing);

  // --- Charging Handle (right side) ---
  const chargingHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.01, 0.025),
    receiverMaterial
  );
  chargingHandle.position.set(0.026, 0.03, 0.08);
  chargingHandle.castShadow = true;
  mp5.add(chargingHandle);

  // --- Ejection Port (right side) ---
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.02, 0.03),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.3,
    })
  );
  ejectionPort.position.set(0.024, 0.03, -0.02);
  mp5.add(ejectionPort);

  // --- Trigger Guard ---
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.018, 0.035),
    receiverMaterial
  );
  triggerGuard.position.set(0, -0.032, 0.06);
  triggerGuard.castShadow = true;
  mp5.add(triggerGuard);

  // --- Trigger ---
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.018, 0.01),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.6,
    })
  );
  trigger.position.set(0, -0.028, 0.06);
  trigger.castShadow = true;
  mp5.add(trigger);

  // --- Pistol Grip ---
  const pistolGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.055, 0.035),
    polymerMaterial
  );
  pistolGrip.position.set(0, -0.055, 0.08);
  pistolGrip.rotation.x = 0.15;
  pistolGrip.castShadow = true;
  mp5.add(pistolGrip);

  return mp5;
}

/**
 * Creates a detailed M870 Shotgun model.
 * The model is oriented with the muzzle pointing toward -Z.
 *
 * @returns THREE.Group containing the complete M870 Shotgun model
 */
export function createM870Model(): THREE.Group {
  const m870 = new THREE.Group();
  m870.name = 'M870_Shotgun';

  // --- Materials ---
  const receiverMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.8,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4226,
    roughness: 0.7,
    metalness: 0.05,
  });

  const woodDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a3520,
    roughness: 0.75,
    metalness: 0.05,
  });

  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.25,
    metalness: 0.9,
  });

  // --- Receiver (main body) ---
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.22),
    receiverMaterial
  );
  receiver.position.set(0, 0.02, 0.05);
  receiver.castShadow = true;
  m870.add(receiver);

  // Receiver top
  const receiverTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.015, 0.2),
    receiverMaterial
  );
  receiverTop.position.set(0, 0.0575, 0.05);
  receiverTop.castShadow = true;
  m870.add(receiverTop);

  // --- Long Cylindrical Barrel ---
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.42, 12),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.22);
  barrel.castShadow = true;
  m870.add(barrel);

  // Barrel front sight base
  const frontSightBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.02, 12),
    barrelMaterial
  );
  frontSightBase.rotation.x = Math.PI / 2;
  frontSightBase.position.set(0, 0.02, -0.42);
  frontSightBase.castShadow = true;
  m870.add(frontSightBase);

  // --- Wooden Pump Forend (under barrel) ---
  const pumpForend = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.2),
    woodMaterial
  );
  pumpForend.position.set(0, -0.015, -0.15);
  pumpForend.castShadow = true;
  m870.add(pumpForend);

  // Pump forend detail (grooves)
  for (let i = 0; i < 5; i++) {
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.042, 0.004),
      woodDarkMaterial
    );
    groove.position.set(0, -0.015, -0.19 + i * 0.02);
    m870.add(groove);
  }

  // --- Wooden Stock ---
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.055, 0.2),
    woodMaterial
  );
  stock.position.set(0, 0.02, 0.24);
  stock.castShadow = true;
  m870.add(stock);

  // Stock butt plate
  const buttPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.06, 0.01),
    woodDarkMaterial
  );
  buttPlate.position.set(0, 0.02, 0.34);
  buttPlate.castShadow = true;
  m870.add(buttPlate);

  // --- Tube Magazine (under barrel) ---
  const tubeMagazine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.3, 10),
    barrelMaterial
  );
  tubeMagazine.rotation.x = Math.PI / 2;
  tubeMagazine.position.set(0, -0.005, -0.15);
  tubeMagazine.castShadow = true;
  m870.add(tubeMagazine);

  // Tube magazine end cap
  const tubeEndCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.015, 10),
    barrelMaterial
  );
  tubeEndCap.rotation.x = Math.PI / 2;
  tubeEndCap.position.set(0, -0.005, -0.31);
  tubeEndCap.castShadow = true;
  m870.add(tubeEndCap);

  // --- Trigger Guard ---
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.02, 0.04),
    receiverMaterial
  );
  triggerGuard.position.set(0, -0.035, 0.08);
  triggerGuard.castShadow = true;
  m870.add(triggerGuard);

  // --- Trigger ---
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.02, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.6,
    })
  );
  trigger.position.set(0, -0.03, 0.08);
  trigger.castShadow = true;
  m870.add(trigger);

  // --- Front Bead Sight ---
  const frontBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.004, 8, 8),
    sightMaterial
  );
  frontBead.position.set(0, 0.045, -0.42);
  frontBead.castShadow = true;
  m870.add(frontBead);

  // --- Pump Handle (side rails connecting forend to receiver) ---
  const pumpRailLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.03, 0.12),
    receiverMaterial
  );
  pumpRailLeft.position.set(-0.024, -0.01, -0.05);
  pumpRailLeft.castShadow = true;
  m870.add(pumpRailLeft);

  const pumpRailRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.03, 0.12),
    receiverMaterial
  );
  pumpRailRight.position.set(0.024, -0.01, -0.05);
  pumpRailRight.castShadow = true;
  m870.add(pumpRailRight);

  // --- Ejection Port (right side) ---
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.025, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.3,
    })
  );
  ejectionPort.position.set(0.026, 0.03, 0.0);
  m870.add(ejectionPort);

  return m870;
}

/**
 * Creates a detailed AWM Sniper Rifle model.
 * The model is oriented with the muzzle pointing toward -Z.
 *
 * @returns THREE.Group containing the complete AWM Sniper Rifle model
 */
export function createAWMModel(): THREE.Group {
  const awm = new THREE.Group();
  awm.name = 'AWM_Sniper';

  // --- Materials ---
  const receiverMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.8,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });

  const oliveMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5d23,
    roughness: 0.7,
    metalness: 0.05,
  });

  const oliveDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a1a,
    roughness: 0.75,
    metalness: 0.05,
  });

  const scopeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.3,
    metalness: 0.8,
  });

  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a3a6a,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x112244,
    emissiveIntensity: 0.3,
  });

  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.25,
    metalness: 0.9,
  });

  // --- Long Box Receiver ---
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.3),
    receiverMaterial
  );
  receiver.position.set(0, 0.02, 0.05);
  receiver.castShadow = true;
  awm.add(receiver);

  // Receiver top rail
  const receiverTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.01, 0.28),
    receiverMaterial
  );
  receiverTop.position.set(0, 0.065, 0.05);
  receiverTop.castShadow = true;
  awm.add(receiverTop);

  // --- Long Cylindrical Barrel ---
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.5, 12),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.25);
  barrel.castShadow = true;
  awm.add(barrel);

  // Muzzle brake
  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.04, 12),
    barrelMaterial
  );
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.02, -0.52);
  muzzleBrake.castShadow = true;
  awm.add(muzzleBrake);

  // --- Large Scope (on top) ---
  // Scope main body
  const scopeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.22, 12),
    scopeMaterial
  );
  scopeBody.rotation.x = Math.PI / 2;
  scopeBody.position.set(0, 0.11, 0.0);
  scopeBody.castShadow = true;
  awm.add(scopeBody);

  // Scope front (objective lens)
  const scopeFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.022, 0.03, 12),
    scopeMaterial
  );
  scopeFront.rotation.x = Math.PI / 2;
  scopeFront.position.set(0, 0.11, -0.11);
  scopeFront.castShadow = true;
  awm.add(scopeFront);

  // Scope lens (front)
  const scopeLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 12),
    lensMaterial
  );
  scopeLens.position.set(0, 0.11, -0.125);
  scopeLens.rotation.y = Math.PI / 2;
  awm.add(scopeLens);

  // Scope rear (eyepiece)
  const scopeRear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.022, 0.03, 12),
    scopeMaterial
  );
  scopeRear.rotation.x = Math.PI / 2;
  scopeRear.position.set(0, 0.11, 0.11);
  scopeRear.castShadow = true;
  awm.add(scopeRear);

  // Scope mount rings
  const scopeRingFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.015),
    receiverMaterial
  );
  scopeRingFront.position.set(0, 0.085, -0.05);
  scopeRingFront.castShadow = true;
  awm.add(scopeRingFront);

  const scopeRingRear = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.015),
    receiverMaterial
  );
  scopeRingRear.position.set(0, 0.085, 0.05);
  scopeRingRear.castShadow = true;
  awm.add(scopeRingRear);

  // --- Bolt Handle (right side) ---
  const boltHandleBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8),
    receiverMaterial
  );
  boltHandleBase.rotation.z = Math.PI / 2;
  boltHandleBase.position.set(0.028, 0.03, 0.1);
  boltHandleBase.castShadow = true;
  awm.add(boltHandleBase);

  const boltHandleKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.008, 8, 8),
    receiverMaterial
  );
  boltHandleKnob.position.set(0.045, 0.03, 0.1);
  boltHandleKnob.castShadow = true;
  awm.add(boltHandleKnob);

  // --- Olive Stock with Cheek Rest ---
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.06, 0.25),
    oliveMaterial
  );
  stock.position.set(0, 0.02, 0.28);
  stock.castShadow = true;
  awm.add(stock);

  // Cheek rest (raised section on top of stock)
  const cheekRest = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.025, 0.12),
    oliveDarkMaterial
  );
  cheekRest.position.set(0, 0.0625, 0.28);
  cheekRest.castShadow = true;
  awm.add(cheekRest);

  // Stock butt plate
  const buttPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.047, 0.065, 0.01),
    oliveDarkMaterial
  );
  buttPlate.position.set(0, 0.02, 0.405);
  buttPlate.castShadow = true;
  awm.add(buttPlate);

  // --- Bipod Legs (two thin cylinders angled down) ---
  const bipodLegLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8),
    receiverMaterial
  );
  bipodLegLeft.position.set(-0.015, -0.06, -0.2);
  bipodLegLeft.rotation.z = 0.2;
  bipodLegLeft.castShadow = true;
  awm.add(bipodLegLeft);

  const bipodLegRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8),
    receiverMaterial
  );
  bipodLegRight.position.set(0.015, -0.06, -0.2);
  bipodLegRight.rotation.z = -0.2;
  bipodLegRight.castShadow = true;
  awm.add(bipodLegRight);

  // Bipod feet
  const bipodFootLeft = new THREE.Mesh(
    new THREE.SphereGeometry(0.005, 6, 6),
    receiverMaterial
  );
  bipodFootLeft.position.set(-0.028, -0.13, -0.2);
  awm.add(bipodFootLeft);

  const bipodFootRight = new THREE.Mesh(
    new THREE.SphereGeometry(0.005, 6, 6),
    receiverMaterial
  );
  bipodFootRight.position.set(0.028, -0.13, -0.2);
  awm.add(bipodFootRight);

  // --- Magazine Well ---
  const magazineWell = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.04, 0.06),
    receiverMaterial
  );
  magazineWell.position.set(0, -0.045, 0.05);
  magazineWell.castShadow = true;
  awm.add(magazineWell);

  // Magazine (inserted)
  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.08, 0.05),
    receiverMaterial
  );
  magazine.position.set(0, -0.09, 0.05);
  magazine.castShadow = true;
  awm.add(magazine);

  // --- Trigger Guard ---
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.02, 0.04),
    receiverMaterial
  );
  triggerGuard.position.set(0, -0.035, 0.1);
  triggerGuard.castShadow = true;
  awm.add(triggerGuard);

  // --- Trigger ---
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.02, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.6,
    })
  );
  trigger.position.set(0, -0.03, 0.1);
  trigger.castShadow = true;
  awm.add(trigger);

  // --- Front Sight (small post) ---
  const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.015, 0.005),
    sightMaterial
  );
  frontSight.position.set(0, 0.075, -0.45);
  frontSight.castShadow = true;
  awm.add(frontSight);

  return awm;
}

/**
 * Creates a detailed M249 LMG model.
 * The model is oriented with the muzzle pointing toward -Z.
 *
 * @returns THREE.Group containing the complete M249 LMG model
 */
export function createM249Model(): THREE.Group {
  const m249 = new THREE.Group();
  m249.name = 'M249_LMG';

  // --- Materials ---
  const receiverMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.8,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });

  const darkOliveMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a1a,
    roughness: 0.6,
    metalness: 0.3,
  });

  const blackMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.5,
    metalness: 0.6,
  });

  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.25,
    metalness: 0.9,
  });

  // --- Large Box Receiver ---
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.07, 0.3),
    receiverMaterial
  );
  receiver.position.set(0, 0.025, 0.05);
  receiver.castShadow = true;
  m249.add(receiver);

  // Receiver top cover
  const receiverTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.015, 0.28),
    receiverMaterial
  );
  receiverTop.position.set(0, 0.0675, 0.05);
  receiverTop.castShadow = true;
  m249.add(receiverTop);

  // --- Thick Cylindrical Barrel ---
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.35, 12),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.025, -0.2);
  barrel.castShadow = true;
  m249.add(barrel);

  // Muzzle brake
  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.04, 12),
    barrelMaterial
  );
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.025, -0.39);
  muzzleBrake.castShadow = true;
  m249.add(muzzleBrake);

  // --- Vented Handguard (around barrel) ---
  const handguard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.22, 12),
    darkOliveMaterial
  );
  handguard.rotation.x = Math.PI / 2;
  handguard.position.set(0, 0.025, -0.18);
  handguard.castShadow = true;
  m249.add(handguard);

  // Handguard vent holes (small dark circles)
  for (let i = 0; i < 6; i++) {
    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.005, 6),
      blackMaterial
    );
    vent.rotation.x = Math.PI / 2;
    vent.position.set(0.018, 0.025, -0.22 + i * 0.025);
    m249.add(vent);

    const ventLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.005, 6),
      blackMaterial
    );
    ventLeft.rotation.x = Math.PI / 2;
    ventLeft.position.set(-0.018, 0.025, -0.22 + i * 0.025);
    m249.add(ventLeft);
  }

  // --- Box Magazine (large rectangular box on bottom) ---
  const magazineBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.12, 0.12),
    darkOliveMaterial
  );
  magazineBox.position.set(0, -0.07, 0.05);
  magazineBox.castShadow = true;
  m249.add(magazineBox);

  // Magazine detail (ridges)
  for (let i = 0; i < 3; i++) {
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.005, 0.12),
      blackMaterial
    );
    ridge.position.set(0, -0.05 - i * 0.03, 0.05);
    m249.add(ridge);
  }

  // --- Bipod (two angled cylinders at front) ---
  const bipodLegLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8),
    receiverMaterial
  );
  bipodLegLeft.position.set(-0.02, -0.06, -0.25);
  bipodLegLeft.rotation.z = 0.25;
  bipodLegLeft.castShadow = true;
  m249.add(bipodLegLeft);

  const bipodLegRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8),
    receiverMaterial
  );
  bipodLegRight.position.set(0.02, -0.06, -0.25);
  bipodLegRight.rotation.z = -0.25;
  bipodLegRight.castShadow = true;
  m249.add(bipodLegRight);

  // Bipod feet
  const bipodFootLeft = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 6, 6),
    receiverMaterial
  );
  bipodFootLeft.position.set(-0.04, -0.14, -0.25);
  m249.add(bipodFootLeft);

  const bipodFootRight = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 6, 6),
    receiverMaterial
  );
  bipodFootRight.position.set(0.04, -0.14, -0.25);
  m249.add(bipodFootRight);

  // --- Carry Handle (on top) ---
  const carryHandleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.01, 0.08),
    receiverMaterial
  );
  carryHandleBase.position.set(0, 0.08, -0.05);
  carryHandleBase.castShadow = true;
  m249.add(carryHandleBase);

  const carryHandleLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.04, 0.005),
    receiverMaterial
  );
  carryHandleLeft.position.set(-0.018, 0.1, -0.05);
  carryHandleLeft.castShadow = true;
  m249.add(carryHandleLeft);

  const carryHandleRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.04, 0.005),
    receiverMaterial
  );
  carryHandleRight.position.set(0.018, 0.1, -0.05);
  carryHandleRight.castShadow = true;
  m249.add(carryHandleRight);

  const carryHandleTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.005, 0.005),
    receiverMaterial
  );
  carryHandleTop.position.set(0, 0.12, -0.05);
  carryHandleTop.castShadow = true;
  m249.add(carryHandleTop);

  // --- Stock with Buffer Tube ---
  // Buffer tube
  const bufferTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10),
    receiverMaterial
  );
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.025, 0.22);
  bufferTube.castShadow = true;
  m249.add(bufferTube);

  // Stock body
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.15),
    darkOliveMaterial
  );
  stock.position.set(0, 0.025, 0.3);
  stock.castShadow = true;
  m249.add(stock);

  // Stock butt plate
  const buttPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.065, 0.01),
    blackMaterial
  );
  buttPlate.position.set(0, 0.025, 0.375);
  buttPlate.castShadow = true;
  m249.add(buttPlate);

  // --- Front Sight ---
  const frontSightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.015, 0.01),
    sightMaterial
  );
  frontSightBase.position.set(0, 0.07, -0.35);
  frontSightBase.castShadow = true;
  m249.add(frontSightBase);

  const frontSightPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.015, 0.005),
    sightMaterial
  );
  frontSightPost.position.set(0, 0.085, -0.35);
  frontSightPost.castShadow = true;
  m249.add(frontSightPost);

  // --- Rear Sight ---
  const rearSightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.015, 0.015),
    sightMaterial
  );
  rearSightBase.position.set(0, 0.07, 0.15);
  rearSightBase.castShadow = true;
  m249.add(rearSightBase);

  const rearSightPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.012, 0.005),
    sightMaterial
  );
  rearSightPost.position.set(0, 0.086, 0.15);
  rearSightPost.castShadow = true;
  m249.add(rearSightPost);

  // --- Trigger Guard ---
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.02, 0.04),
    receiverMaterial
  );
  triggerGuard.position.set(0, -0.035, 0.1);
  triggerGuard.castShadow = true;
  m249.add(triggerGuard);

  // --- Trigger ---
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.02, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.6,
    })
  );
  trigger.position.set(0, -0.03, 0.1);
  trigger.castShadow = true;
  m249.add(trigger);

  // --- Pistol Grip ---
  const pistolGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.06, 0.04),
    darkOliveMaterial
  );
  pistolGrip.position.set(0, -0.06, 0.12);
  pistolGrip.rotation.x = 0.15;
  pistolGrip.castShadow = true;
  m249.add(pistolGrip);

  // --- Ejection Port (right side) ---
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.03, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.3,
    })
  );
  ejectionPort.position.set(0.032, 0.03, 0.0);
  m249.add(ejectionPort);

  return m249;
}

/**
 * Creates a muzzle flash sprite with a radial gradient texture.
 * The sprite uses additive blending for a bright, glowing effect.
 *
 * @returns THREE.Sprite configured for muzzle flash rendering
 */
export function createMuzzleFlashSprite(): THREE.Sprite {
  // Create canvas for the flash texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context for muzzle flash');
  }

  // Radial gradient: white core → yellow → orange → transparent
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 240, 180, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 200, 80, 0.7)');
  gradient.addColorStop(0.6, 'rgba(255, 150, 40, 0.4)');
  gradient.addColorStop(0.8, 'rgba(255, 100, 20, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 80, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  // Create sprite material with additive blending
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9,
  });

  const sprite = new THREE.Sprite(material);
  sprite.name = 'MuzzleFlash';
  sprite.scale.set(0.15, 0.15, 1);
  sprite.visible = false;

  return sprite;
}