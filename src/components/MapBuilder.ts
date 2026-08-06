import * as THREE from 'three';
import CollisionManager from './CollisionManager';
import {
  createAsphaltTexture,
  createConcreteTexture,
  createBrickTexture,
  createMetalTexture,
  createWindowTexture,
  createSidewalkTexture,
  createRoofTexture,
  createDirtTexture,
  createCurbTexture,
  createWoodTexture,
} from '../utils/TextureFactory';

/**
 * MapBuilder constructs the detailed Town Street map from THREE.js primitives
 * with procedural textures, and registers all collidable objects with the
 * CollisionManager.
 *
 * The map is 100x100m (boundary at ±50 on X and Z) with:
 * - Central asphalt road (12m wide, east-west)
 * - Sidewalks on both sides (4m wide)
 * - 2-3 story buildings with brick/window textures
 * - Parked cars with metal texture
 * - Street lamps with emissive heads
 * - Dumpsters, concrete barriers, and planters for tactical cover
 */
export default class MapBuilder {
  private collisionManager: CollisionManager;

  /** Map boundary half-size (map is 100x100m, so ±50). */
  private static readonly MAP_HALF_SIZE = 50;

  /** Road half-width (road is 12m wide, so ±6). */
  private static readonly ROAD_HALF_WIDTH = 6;

  /** Sidewalk width in meters. */
  private static readonly SIDEWALK_WIDTH = 4;

  /** Player spawn position (center of road). */
  private static readonly SPAWN_POSITION = { x: 0, z: 0 };

  /**
   * @param collisionManager - The CollisionManager to register colliders with
   */
  constructor(collisionManager: CollisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Builds the entire Town Street map and returns a THREE.Group containing
   * all map meshes. The group should be added to the scene by the caller.
   *
   * @returns THREE.Group containing all map meshes
   */
  public build(): THREE.Group {
    const mapGroup = new THREE.Group();
    mapGroup.name = 'TownStreetMap';

    // Build all map components in order (ground first, then props)
    mapGroup.add(this.createGround());
    mapGroup.add(this.createRoad());
    mapGroup.add(this.createSidewalk());
    mapGroup.add(this.createCurb());

    // Buildings (both sides)
    this.createBuildings(mapGroup);

        // Props
    this.createCars(mapGroup);
    this.createStreetLamps(mapGroup);
    this.createDumpsters(mapGroup);
    this.createBarriers(mapGroup);
    this.createPlanters(mapGroup);

    // Enhanced street details (Phase: environment polish)
    this.createAwnings(mapGroup);
    this.createTrees(mapGroup);
    this.createCrates(mapGroup);
    this.createBarrels(mapGroup);
    this.createHydrants(mapGroup);
    this.createTrafficCones(mapGroup);
    this.createMailboxes(mapGroup);
    this.createBenches(mapGroup);

    // Outer boundary walls (perimeter)
    this.createOuterWalls(mapGroup);

    // Enable frustum culling on all meshes for performance
    mapGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true;
      }
    });

    return mapGroup;
  }

  /**
   * Configures map-specific lighting for the scene.
   * Adds ambient light for base illumination and a directional
   * sun light with shadow mapping for the town street environment.
   *
   * @param scene - The THREE.Scene to configure lighting for
   */
  public configureLighting(scene: THREE.Scene): void {
    // Add ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Add directional light (sun) with shadows
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(30, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    scene.add(sunLight);
  }

  /**
   * Creates the base ground plane with dirt texture.
   * 100x100m at Y=0, repeated 20x20.
   *
   * @returns THREE.Mesh ground plane
   */
  private createGround(): THREE.Mesh {
    const texture = createDirtTexture();
    texture.repeat.set(20, 20);

    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'Ground';

    return ground;
  }

  /**
   * Creates the central asphalt road with lane markings.
   * 12m wide, spans X from -50 to +50, Z from -6 to +6.
   *
   * @returns THREE.Group containing road mesh and lane markings
   */
  private createRoad(): THREE.Group {
    const roadGroup = new THREE.Group();
    roadGroup.name = 'Road';

    // Asphalt road surface
    const asphaltTexture = createAsphaltTexture();
    asphaltTexture.repeat.set(25, 3);

    const roadGeometry = new THREE.PlaneGeometry(100, 12);
    const roadMaterial = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.9,
      metalness: 0.1,
    });

    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 0);
    road.receiveShadow = true;
    road.name = 'RoadSurface';
    roadGroup.add(road);

    // --- Lane markings ---
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.0,
    });

    // Dashed center line (yellow)
    const centerLineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.8,
      metalness: 0.0,
    });

    // Dashed center line segments (3m long, 2m gap, 0.15m wide)
    const dashLength = 3;
    const dashGap = 2;
    const dashWidth = 0.15;
    const totalDashes = Math.floor(100 / (dashLength + dashGap));

    for (let i = 0; i < totalDashes; i++) {
      const x = -50 + (i * (dashLength + dashGap)) + dashLength / 2;
      const dashGeometry = new THREE.PlaneGeometry(dashLength, dashWidth);
      const dash = new THREE.Mesh(dashGeometry, centerLineMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, 0);
      dash.receiveShadow = true;
      roadGroup.add(dash);
    }

    // Solid edge lines (white)
    const edgeLineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.0,
    });

    // South edge line
    const southEdgeGeometry = new THREE.PlaneGeometry(100, 0.15);
    const southEdge = new THREE.Mesh(southEdgeGeometry, edgeLineMaterial);
    southEdge.rotation.x = -Math.PI / 2;
    southEdge.position.set(0, 0.02, -5.5);
    southEdge.receiveShadow = true;
    roadGroup.add(southEdge);

    // North edge line
    const northEdge = new THREE.Mesh(southEdgeGeometry, edgeLineMaterial);
    northEdge.rotation.x = -Math.PI / 2;
    northEdge.position.set(0, 0.02, 5.5);
    northEdge.receiveShadow = true;
    roadGroup.add(northEdge);

    return roadGroup;
  }

  /**
   * Creates sidewalks on both sides of the road.
   * South sidewalk: Z from -10 to -6. North sidewalk: Z from +6 to +10.
   *
   * @returns THREE.Group containing both sidewalks
   */
  private createSidewalk(): THREE.Group {
    const sidewalkGroup = new THREE.Group();
    sidewalkGroup.name = 'Sidewalks';

    const sidewalkTexture = createSidewalkTexture();
    sidewalkTexture.repeat.set(25, 1);

    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      map: sidewalkTexture,
      roughness: 0.9,
      metalness: 0.0,
    });

    // South sidewalk (Z: -10 to -6)
    const southGeometry = new THREE.PlaneGeometry(100, 4);
    const southSidewalk = new THREE.Mesh(southGeometry, sidewalkMaterial);
    southSidewalk.rotation.x = -Math.PI / 2;
    southSidewalk.position.set(0, 0.02, -8);
    southSidewalk.receiveShadow = true;
    southSidewalk.name = 'SouthSidewalk';
    sidewalkGroup.add(southSidewalk);

    // North sidewalk (Z: +6 to +10)
    const northSidewalk = new THREE.Mesh(southGeometry, sidewalkMaterial);
    northSidewalk.rotation.x = -Math.PI / 2;
    northSidewalk.position.set(0, 0.02, 8);
    northSidewalk.receiveShadow = true;
    northSidewalk.name = 'NorthSidewalk';
    sidewalkGroup.add(northSidewalk);

    return sidewalkGroup;
  }

  /**
   * Creates curbs between road and sidewalks.
   * South curb at Z=-6, North curb at Z=+6.
   *
   * @returns THREE.Group containing both curbs
   */
  private createCurb(): THREE.Group {
    const curbGroup = new THREE.Group();
    curbGroup.name = 'Curbs';

    const curbTexture = createCurbTexture();
    curbTexture.repeat.set(50, 1);

    const curbMaterial = new THREE.MeshStandardMaterial({
      map: curbTexture,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Curb dimensions: 0.3m wide, 0.15m tall, 100m long
    const curbGeometry = new THREE.BoxGeometry(100, 0.15, 0.3);

    // South curb
    const southCurb = new THREE.Mesh(curbGeometry, curbMaterial);
    southCurb.position.set(0, 0.075, -6);
    southCurb.castShadow = true;
    southCurb.receiveShadow = true;
    southCurb.name = 'SouthCurb';
    curbGroup.add(southCurb);

    // Register collider
    this.collisionManager.addBox(
      -50, 0, -6.15,
      50, 0.15, -5.85,
      'SouthCurb'
    );

    // North curb
    const northCurb = new THREE.Mesh(curbGeometry, curbMaterial);
    northCurb.position.set(0, 0.075, 6);
    northCurb.castShadow = true;
    northCurb.receiveShadow = true;
    northCurb.name = 'NorthCurb';
    curbGroup.add(northCurb);

    // Register collider
    this.collisionManager.addBox(
      -50, 0, 5.85,
      50, 0.15, 6.15,
      'NorthCurb'
    );

    return curbGroup;
  }

  /**
   * Creates buildings along both sides of the street.
   * Buildings have varied widths (8-16m), depths (8-12m), and heights (6-9m).
   * Gaps (alleyways) of 3-5m between buildings.
   *
   * @param parent - The parent group to add buildings to
   */
  private createBuildings(parent: THREE.Group): void {
    // Building placement data: [x, z, width, depth, height]
    // South side buildings (Z around -14 to -30)
    const southBuildings = [
      { x: -35, z: -22, width: 14, depth: 10, height: 8 },
      { x: -18, z: -20, width: 12, depth: 9, height: 7 },
      { x: -2, z: -24, width: 16, depth: 11, height: 9 },
      { x: 16, z: -19, width: 10, depth: 8, height: 6 },
      { x: 32, z: -23, width: 13, depth: 10, height: 8 },
    ];

    // North side buildings (Z around +14 to +30)
    const northBuildings = [
      { x: -32, z: 21, width: 15, depth: 10, height: 9 },
      { x: -14, z: 19, width: 11, depth: 9, height: 7 },
      { x: 2, z: 23, width: 14, depth: 11, height: 8 },
      { x: 20, z: 20, width: 12, depth: 8, height: 6 },
      { x: 36, z: 22, width: 9, depth: 10, height: 7 },
    ];

    // Create south buildings
    for (const data of southBuildings) {
      parent.add(this.createBuilding(data.x, data.z, data.width, data.depth, data.height, 'South'));
    }

    // Create north buildings
    for (const data of northBuildings) {
      parent.add(this.createBuilding(data.x, data.z, data.width, data.depth, data.height, 'North'));
    }
  }

  /**
   * Creates a single building with brick walls and window strips.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param width - Building width (X axis)
   * @param depth - Building depth (Z axis)
   * @param height - Building height (Y axis)
   * @param side - Which side of the street ('South' or 'North')
   * @returns THREE.Group containing the building
   */
  private createBuilding(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    side: string
  ): THREE.Group {
    const buildingGroup = new THREE.Group();
    buildingGroup.name = `Building_${side}_${x}`;

    // --- Main building body ---
    const brickTexture = createBrickTexture();
    brickTexture.repeat.set(Math.max(2, Math.floor(width / 4)), Math.max(2, Math.floor(height / 3)));

    const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: brickTexture,
      roughness: 0.9,
      metalness: 0.0,
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(x, height / 2, z);
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = 'BuildingBody';
    buildingGroup.add(body);

    // --- Window strips on street-facing side ---
    const windowTexture = createWindowTexture();
    windowTexture.repeat.set(Math.max(2, Math.floor(width / 4)), Math.max(2, Math.floor(height / 3)));

    const windowMaterial = new THREE.MeshStandardMaterial({
      map: windowTexture,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x1a2a4a,
      emissiveIntensity: 0.3,
    });

    // Window strip dimensions (slightly inset from building face)
    const windowStripWidth = width - 1.0;
    const windowStripHeight = height - 1.0;
    const windowStripDepth = 0.1;

    const windowGeometry = new THREE.BoxGeometry(windowStripWidth, windowStripHeight, windowStripDepth);

    // Determine which face faces the street
    const streetZ = side === 'South' ? z + depth / 2 - 0.05 : z - depth / 2 + 0.05;

    const windowStrip = new THREE.Mesh(windowGeometry, windowMaterial);
    windowStrip.position.set(x, height / 2, streetZ);
    windowStrip.castShadow = true;
    windowStrip.name = 'WindowStrip';
    buildingGroup.add(windowStrip);

    // --- Roof ---
    const roofTexture = createRoofTexture();
    roofTexture.repeat.set(Math.max(2, Math.floor(width / 4)), Math.max(2, Math.floor(depth / 4)));

    const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.3, depth + 0.5);
    const roofMaterial = new THREE.MeshStandardMaterial({
      map: roofTexture,
      roughness: 0.95,
      metalness: 0.0,
    });

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, height + 0.15, z);
    roof.castShadow = true;
    roof.name = 'Roof';
    buildingGroup.add(roof);

    // --- Register collider ---
    this.collisionManager.addBox(
      x - width / 2, 0, z - depth / 2,
      x + width / 2, height, z + depth / 2,
      `Building_${side}_${x}`
    );

    return buildingGroup;
  }

  /**
   * Creates parked cars along both sides of the road.
   * Cars are parked parallel to the road near the curb.
   *
   * @param parent - The parent group to add cars to
   */
  private createCars(parent: THREE.Group): void {
    // Car placement data: [x, z, rotationY]
    // South side (parked facing east, near south curb)
    const southCars = [
      { x: -30, z: -4.5, rotationY: 0 },
      { x: -20, z: -4.5, rotationY: 0 },
      { x: 10, z: -4.5, rotationY: 0 },
      { x: 25, z: -4.5, rotationY: 0 },
      { x: 38, z: -4.5, rotationY: 0 },
    ];

    // North side (parked facing west, near north curb)
    const northCars = [
      { x: -28, z: 4.5, rotationY: Math.PI },
      { x: -15, z: 4.5, rotationY: Math.PI },
      { x: 5, z: 4.5, rotationY: Math.PI },
      { x: 22, z: 4.5, rotationY: Math.PI },
      { x: 35, z: 4.5, rotationY: Math.PI },
    ];

    // Create south cars
    for (const data of southCars) {
      parent.add(this.createCar(data.x, data.z, data.rotationY, 'South'));
    }

    // Create north cars
    for (const data of northCars) {
      parent.add(this.createCar(data.x, data.z, data.rotationY, 'North'));
    }
  }

  /**
   * Creates a single parked car with body, cabin, wheels, and lights.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param rotationY - Y rotation in radians
   * @param side - Which side of the street ('South' or 'North')
   * @returns THREE.Group containing the car
   */
  private createCar(
    x: number,
    z: number,
    rotationY: number,
    side: string
  ): THREE.Group {
    const carGroup = new THREE.Group();
    carGroup.name = `Car_${side}_${x}`;
    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = rotationY;

    // Car dimensions
    const carLength = 4.5; // X axis
    const carWidth = 2.0;  // Z axis
    const carHeight = 1.4; // Y axis

    // --- Car body ---
    const metalTexture = createMetalTexture();
    metalTexture.repeat.set(2, 1);

    const bodyGeometry = new THREE.BoxGeometry(carLength, carHeight * 0.6, carWidth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.4,
      metalness: 0.7,
      color: 0x888888,
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = carHeight * 0.3;
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = 'CarBody';
    carGroup.add(body);

    // --- Cabin (windows) ---
    const windowTexture = createWindowTexture();
    windowTexture.repeat.set(1, 1);

    const cabinGeometry = new THREE.BoxGeometry(carLength * 0.55, carHeight * 0.4, carWidth * 0.85);
    const cabinMaterial = new THREE.MeshStandardMaterial({
      map: windowTexture,
      roughness: 0.2,
      metalness: 0.8,
      color: 0x4488aa,
    });

    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(-carLength * 0.05, carHeight * 0.65, 0);
    cabin.castShadow = true;
    cabin.name = 'CarCabin';
    carGroup.add(cabin);

    // --- Wheels (4 cylinders) ---
    const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1,
    });

    const wheelPositions = [
      { x: carLength * 0.35, z: carWidth / 2 },
      { x: carLength * 0.35, z: -carWidth / 2 },
      { x: -carLength * 0.35, z: carWidth / 2 },
      { x: -carLength * 0.35, z: -carWidth / 2 },
    ];

    for (let i = 0; i < wheelPositions.length; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wheelPositions[i].x, 0.35, wheelPositions[i].z);
      wheel.castShadow = true;
      wheel.name = `Wheel_${i}`;
      carGroup.add(wheel);
    }

    // --- Headlights (front) ---
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0xffffee,
      emissiveIntensity: 1.0,
    });

    const headlightGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.3);

    // Front headlights (at +X end of car)
    const headlight1 = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight1.position.set(carLength / 2, carHeight * 0.35, carWidth * 0.35);
    carGroup.add(headlight1);

    const headlight2 = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight2.position.set(carLength / 2, carHeight * 0.35, -carWidth * 0.35);
    carGroup.add(headlight2);

    // --- Taillights (rear) ---
    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
    });

    const taillightGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.3);

    const taillight1 = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillight1.position.set(-carLength / 2, carHeight * 0.35, carWidth * 0.35);
    carGroup.add(taillight1);

    const taillight2 = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillight2.position.set(-carLength / 2, carHeight * 0.35, -carWidth * 0.35);
    carGroup.add(taillight2);

    // --- Register collider (in world space) ---
    // Car is rotated, so compute AABB based on rotation
    const halfLength = carLength / 2;
    const halfWidth = carWidth / 2;

    // For 0 or PI rotation, X is length, Z is width
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);

    // Compute rotated half-extents
    const rotatedHalfX = Math.abs(cos) * halfLength + Math.abs(sin) * halfWidth;
    const rotatedHalfZ = Math.abs(sin) * halfLength + Math.abs(cos) * halfWidth;

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, carHeight, z + rotatedHalfZ,
      `Car_${side}_${x}`
    );

    return carGroup;
  }

  /**
   * Creates street lamps along both sidewalks at regular intervals.
   *
   * @param parent - The parent group to add lamps to
   */
  private createStreetLamps(parent: THREE.Group): void {
    // Lamp positions along sidewalks (every ~12-15m)
    const lampPositions = [-40, -28, -16, -4, 8, 20, 32, 44];

    // South side lamps (Z = -8)
    for (const x of lampPositions) {
      parent.add(this.createStreetLamp(x, -8, 'South'));
    }

    // North side lamps (Z = 8)
    for (const x of lampPositions) {
      parent.add(this.createStreetLamp(x, 8, 'North'));
    }
  }

  /**
   * Creates a single street lamp with pole, base, and emissive head.
   *
   * @param x - X position
   * @param z - Z position
   * @param side - Which side of the street ('South' or 'North')
   * @returns THREE.Group containing the lamp
   */
  private createStreetLamp(x: number, z: number, side: string): THREE.Group {
    const lampGroup = new THREE.Group();
    lampGroup.name = `StreetLamp_${side}_${x}`;
    lampGroup.position.set(x, 0, z);

    // --- Base ---
    const concreteTexture = createConcreteTexture();
    concreteTexture.repeat.set(1, 1);

    const baseGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.4);
    const baseMaterial = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      roughness: 0.9,
      metalness: 0.0,
    });

    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    base.name = 'LampBase';
    lampGroup.add(base);

    // --- Pole ---
    const metalTexture = createMetalTexture();
    metalTexture.repeat.set(1, 2);

    const poleGeometry = new THREE.CylinderGeometry(0.08, 0.1, 5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.5,
      metalness: 0.8,
      color: 0x555555,
    });

    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2.5 + 0.15;
    pole.castShadow = true;
    pole.name = 'LampPole';
    lampGroup.add(pole);

    // --- Lamp arm (extends toward road) ---
    const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
    const armMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.5,
      metalness: 0.8,
      color: 0x555555,
    });

    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(0, 5.15, side === 'South' ? 0.6 : -0.6);
    arm.castShadow = true;
    arm.name = 'LampArm';
    lampGroup.add(arm);

    // --- Lamp head (emissive) ---
    const lampHeadMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd9a0,
      emissive: 0xffd9a0,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.0,
    });

    const lampHeadGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const lampHead = new THREE.Mesh(lampHeadGeometry, lampHeadMaterial);
    lampHead.position.set(0, 5.15, side === 'South' ? 1.2 : -1.2);
    lampHead.castShadow = true;
    lampHead.name = 'LampHead';
    lampGroup.add(lampHead);

    // --- Register collider (pole only, thin AABB) ---
    this.collisionManager.addBox(
      x - 0.1, 0, z - 0.1,
      x + 0.1, 5.3, z + 0.1,
      `StreetLamp_${side}_${x}`
    );

    return lampGroup;
  }

  /**
   * Creates dumpsters in the alleyways between buildings.
   *
   * @param parent - The parent group to add dumpsters to
   */
  private createDumpsters(parent: THREE.Group): void {
    // Dumpster positions (in alleyways between buildings)
    const dumpsterPositions = [
      { x: -26, z: -14, rotationY: 0 },
      { x: -8, z: -16, rotationY: Math.PI / 2 },
      { x: 8, z: -15, rotationY: 0 },
            { x: -22, z: 13, rotationY: Math.PI / 2 },
      { x: 12, z: 15, rotationY: 0 },
    ];

    for (const data of dumpsterPositions) {
      parent.add(this.createDumpster(data.x, data.z, data.rotationY));
    }
  }

  /**
   * Creates a single dumpster with metal texture and darker lid.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param rotationY - Y rotation in radians
   * @returns THREE.Group containing the dumpster
   */
  private createDumpster(x: number, z: number, rotationY: number): THREE.Group {
    const dumpsterGroup = new THREE.Group();
    dumpsterGroup.name = `Dumpster_${x}_${z}`;
    dumpsterGroup.position.set(x, 0, z);
    dumpsterGroup.rotation.y = rotationY;

    // Dumpster dimensions
    const dumpsterLength = 2.0; // X axis
    const dumpsterWidth = 1.2;  // Z axis
    const dumpsterHeight = 1.2; // Y axis

    // --- Body ---
    const metalTexture = createMetalTexture();
    metalTexture.repeat.set(1, 1);

    const bodyGeometry = new THREE.BoxGeometry(dumpsterLength, dumpsterHeight * 0.8, dumpsterWidth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.6,
      metalness: 0.6,
      color: 0x556666,
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = dumpsterHeight * 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = 'DumpsterBody';
    dumpsterGroup.add(body);

    // --- Lid (darker) ---
    const lidMaterial = new THREE.MeshStandardMaterial({
      color: 0x334444,
      roughness: 0.7,
      metalness: 0.5,
    });

    const lidGeometry = new THREE.BoxGeometry(dumpsterLength + 0.1, 0.1, dumpsterWidth + 0.1);
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = dumpsterHeight * 0.8 + 0.05;
    lid.castShadow = true;
    lid.name = 'DumpsterLid';
    dumpsterGroup.add(lid);

    // --- Register collider ---
    // Compute rotated half-extents
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * (dumpsterLength / 2) + Math.abs(sin) * (dumpsterWidth / 2);
    const rotatedHalfZ = Math.abs(sin) * (dumpsterLength / 2) + Math.abs(cos) * (dumpsterWidth / 2);

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, dumpsterHeight, z + rotatedHalfZ,
      `Dumpster_${x}_${z}`
    );

    return dumpsterGroup;
  }

  /**
   * Creates concrete barriers as tactical cover on the road and near sidewalks.
   *
   * @param parent - The parent group to add barriers to
   */
  private createBarriers(parent: THREE.Group): void {
    // Barrier positions with varying heights
    const barrierData = [
      // Road center line barriers
      { x: -15, z: 0, rotationY: 0, height: 0.8 },
      { x: -10, z: 0, rotationY: 0, height: 1.0 },
      { x: 10, z: 0, rotationY: 0, height: 0.8 },
      { x: 15, z: 0, rotationY: 0, height: 1.0 },

      // Near building corners (south side)
      { x: -40, z: -12, rotationY: Math.PI / 2, height: 1.0 },
      { x: -25, z: -11, rotationY: Math.PI / 2, height: 0.8 },
      { x: 25, z: -12, rotationY: Math.PI / 2, height: 1.0 },

      // Near building corners (north side)
      { x: -38, z: 12, rotationY: Math.PI / 2, height: 0.8 },
      { x: 22, z: 11, rotationY: Math.PI / 2, height: 1.0 },
      { x: 40, z: 12, rotationY: Math.PI / 2, height: 0.8 },

      // In front of cars (south side)
      { x: -35, z: -3, rotationY: 0, height: 0.8 },
      { x: 30, z: -3, rotationY: 0, height: 1.0 },
    ];

    for (const data of barrierData) {
      parent.add(this.createBarrier(data.x, data.z, data.rotationY, data.height));
    }
  }

  /**
   * Creates a single concrete barrier.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param rotationY - Y rotation in radians
   * @param height - Barrier height in meters
   * @returns THREE.Mesh containing the barrier
   */
  private createBarrier(
    x: number,
    z: number,
    rotationY: number,
    height: number
  ): THREE.Mesh {
    // Barrier dimensions
    const barrierLength = 2.0; // X axis
    const barrierWidth = 0.5;  // Z axis

    const concreteTexture = createConcreteTexture();
    concreteTexture.repeat.set(1, 1);

    const geometry = new THREE.BoxGeometry(barrierLength, height, barrierWidth);
    const material = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      roughness: 0.9,
      metalness: 0.0,
    });

    const barrier = new THREE.Mesh(geometry, material);
    barrier.position.set(x, height / 2, z);
    barrier.rotation.y = rotationY;
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    barrier.name = `Barrier_${x}_${z}`;

    // --- Register collider ---
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * (barrierLength / 2) + Math.abs(sin) * (barrierWidth / 2);
    const rotatedHalfZ = Math.abs(sin) * (barrierLength / 2) + Math.abs(cos) * (barrierWidth / 2);

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, height, z + rotatedHalfZ,
      `Barrier_${x}_${z}`
    );

    return barrier;
  }

  /**
   * Creates planters with green bushes near building entrances.
   *
   * @param parent - The parent group to add planters to
   */
  private createPlanters(parent: THREE.Group): void {
    // Planter positions near building entrances
        const planterPositions = [
      { x: -40, z: -14, rotationY: 0 },
      { x: -24, z: -13, rotationY: Math.PI / 2 },
      { x: 10, z: -16, rotationY: 0 },
      { x: -36, z: 14, rotationY: 0 },
      { x: 28, z: 14, rotationY: Math.PI / 2 },
    ];

    for (const data of planterPositions) {
      parent.add(this.createPlanter(data.x, data.z, data.rotationY));
    }
  }

  /**
   * Creates a single planter with concrete base and green bush.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param rotationY - Y rotation in radians
   * @returns THREE.Group containing the planter
   */
  private createPlanter(x: number, z: number, rotationY: number): THREE.Group {
    const planterGroup = new THREE.Group();
    planterGroup.name = `Planter_${x}_${z}`;
    planterGroup.position.set(x, 0, z);
    planterGroup.rotation.y = rotationY;

    // Planter dimensions
    const planterLength = 1.5; // X axis
    const planterWidth = 0.8;  // Z axis
    const planterHeight = 0.6; // Y axis

    // --- Concrete base ---
    const concreteTexture = createConcreteTexture();
    concreteTexture.repeat.set(1, 1);

    const baseGeometry = new THREE.BoxGeometry(planterLength, planterHeight, planterWidth);
    const baseMaterial = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      roughness: 0.9,
      metalness: 0.0,
    });

    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = planterHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    base.name = 'PlanterBase';
    planterGroup.add(base);

    // --- Bush (green box) ---
    const bushMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.9,
      metalness: 0.0,
    });

    const bushGeometry = new THREE.BoxGeometry(planterLength * 0.8, 0.5, planterWidth * 0.8);
    const bush = new THREE.Mesh(bushGeometry, bushMaterial);
    bush.position.y = planterHeight + 0.25;
    bush.castShadow = true;
    bush.name = 'Bush';
    planterGroup.add(bush);

    // --- Register collider ---
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * (planterLength / 2) + Math.abs(sin) * (planterWidth / 2);
    const rotatedHalfZ = Math.abs(sin) * (planterLength / 2) + Math.abs(cos) * (planterWidth / 2);

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, planterHeight + 0.5, z + rotatedHalfZ,
      `Planter_${x}_${z}`
    );

    return planterGroup;
  }

  /**
   * Creates awnings (rain canopies) over building entrances and storefronts.
   * Slanted canvas that projects from the street-facing facade.
   *
   * @param parent - The parent group to add awnings to
   */
  private createAwnings(parent: THREE.Group): void {
    // [x, z, side, width, canopyDepth]
    const awningData: Array<[number, number, string, number, number]> = [
      [-18, -20, 'South', 3.0, 1.4],
      [-2, -24, 'South', 3.6, 1.6],
      [16, -19, 'South', 2.8, 1.3],
      [-14, 19, 'North', 2.8, 1.3],
      [2, 23, 'North', 3.4, 1.5],
      [20, 20, 'North', 2.6, 1.3],
    ];

    for (const data of awningData) {
      parent.add(this.createAwning(data[0], data[1], data[2], data[3], data[4]));
    }
  }

  /**
   * Creates a single slanted awning canopy over a storefront.
   *
   * @param x - Center X position
   * @param z - Building center Z position
   * @param side - Which side of the street ('South' or 'North')
   * @param width - Canopy width along X
   * @param depth - Canopy protrusion depth toward the street
   * @returns THREE.Group containing the awning
   */
  private createAwning(
    x: number,
    z: number,
    side: string,
    width: number,
    depth: number
  ): THREE.Group {
    const awningGroup = new THREE.Group();
    awningGroup.name = `Awning_${side}_${x}`;

    // Canvas height above ground
    const height = 3.0;

    // Striped canvas material (awning fabric)
    const awningMaterial = new THREE.MeshStandardMaterial({
      color: 0xb04a3a,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Slanted canopy panel
    const canopyGeometry = new THREE.PlaneGeometry(width, depth, 1, 4);
    const canopy = new THREE.Mesh(canopyGeometry, awningMaterial);
    canopy.position.set(x, height, z);
    canopy.castShadow = true;

    // Tilt downward toward the street
    canopy.rotation.x = side === 'South' ? Math.PI / 9 : -Math.PI / 9;
    // Building is at z; face toward street means the canopy slants in +Z for south buildings
    if (side === 'South') {
      canopy.position.z = z - depth / 2;
    } else {
      canopy.position.z = z + depth / 2;
    }
    awningGroup.add(canopy);

    // Scalloped fringe (a thin front bar to suggest the flap edge)
    const fringeMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a3a2a,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const fringeGeometry = new THREE.BoxGeometry(width + 0.1, 0.08, 0.06);
    const fringe = new THREE.Mesh(fringeGeometry, fringeMaterial);
    fringe.position.set(x, height, side === 'South' ? z - depth : z + depth);
    fringe.castShadow = true;
    awningGroup.add(fringe);

    // Support arms
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.6,
    });
    const armGeometry = new THREE.BoxGeometry(0.08, 0.08, depth - 0.2);
    const arm1 = new THREE.Mesh(armGeometry, armMaterial);
    arm1.position.set(x - width / 4, height - 0.15, side === 'South' ? z - 0.1 : z + 0.1);
    const arm2 = arm1.clone();
    arm2.position.x = x + width / 4;
    awningGroup.add(arm1);
    awningGroup.add(arm2);

    return awningGroup;
  }

  /**
   * Creates trees along the sidewalks for greenery.
   *
   * @param parent - The parent group to add trees to
   */
  private createTrees(parent: THREE.Group): void {
    // Tree positions along sidewalks, offset between street lamps
    const treePositions = [
      { x: -36, z: -9 },
      { x: -11, z: -9 },
      { x: 14, z: -9 },
      { x: 42, z: -9 },
      { x: -25, z: 9 },
      { x: 3, z: 9 },
      { x: 28, z: 9 },
      { x: -45, z: 9 },
    ];

    for (const data of treePositions) {
      parent.add(this.createTree(data.x, data.z));
    }
  }

  /**
   * Creates a single tree with a trunk and foliage canopy.
   *
   * @param x - X position
   * @param z - Z position
   * @returns THREE.Group containing the tree
   */
  private createTree(x: number, z: number): THREE.Group {
    const treeGroup = new THREE.Group();
    treeGroup.name = `Tree_${x}_${z}`;
    treeGroup.position.set(x, 0, z);

    const woodTexture = createWoodTexture();
    woodTexture.repeat.set(1, 2);

    // --- Trunk ---
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2.6, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.9,
      metalness: 0.0,
      color: 0x6b4a2b,
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.3;
    trunk.castShadow = true;
    trunk.name = 'TreeTrunk';
    treeGroup.add(trunk);

    // --- Foliage (leafy canopy using layered spheres) ---
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a7a2a,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
    });

    const canopyGeo = new THREE.IcosahedronGeometry(1.3, 0);
    const canopy = new THREE.Mesh(canopyGeo, leafMaterial);
    canopy.position.y = 3.0;
    canopy.castShadow = true;
    canopy.name = 'TreeCanopy';
    treeGroup.add(canopy);

    const canopy2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9, 0),
      leafMaterial
    );
    canopy2.position.set(0.4, 3.8, 0.2);
    canopy2.castShadow = true;
    treeGroup.add(canopy2);

    // --- Register collider (trunk only) ---
    this.collisionManager.addBox(
      x - 0.2, 0, z - 0.2,
      x + 0.2, 2.6, z + 0.2,
      `Tree_${x}_${z}`
    );

    return treeGroup;
  }

  /**
   * Creates wooden crates as low tactical cover scattered near buildings.
   *
   * @param parent - The parent group to add crates to
   */
  private createCrates(parent: THREE.Group): void {
    const crateData = [
      { x: -27, z: -15, rotationY: 0, scale: 1 },
      { x: -9, z: -14, rotationY: Math.PI / 2, scale: 1.2 },
      { x: 7, z: -16, rotationY: 0, scale: 0.9 },
      { x: 18, z: -14, rotationY: 0.4, scale: 1 },
      { x: -23, z: 14, rotationY: Math.PI / 2, scale: 1.1 },
      { x: 5, z: 15, rotationY: 0, scale: 1 },
      { x: 27, z: 13, rotationY: 0.3, scale: 0.8 },
      { x: 38, z: -14, rotationY: 0, scale: 1.1 },
    ];

    for (const data of crateData) {
      parent.add(this.createCrate(data.x, data.z, data.rotationY, data.scale));
    }
  }

  /**
   * Creates a single wooden crate.
   *
   * @param x - X position
   * @param z - Z position
   * @param rotationY - Y rotation
   * @param scale - Size multiplier
   * @returns THREE.Group containing the crate
   */
  private createCrate(x: number, z: number, rotationY: number, scale: number): THREE.Group {
    const crateGroup = new THREE.Group();
    crateGroup.name = `Crate_${x}_${z}`;
    crateGroup.position.set(x, 0, z);
    crateGroup.rotation.y = rotationY;

    const woodTexture = createWoodTexture();
    woodTexture.repeat.set(1, 1);

    const size = 0.9 * scale;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.85,
      metalness: 0.0,
      color: 0xa07a4a,
    });
    const crate = new THREE.Mesh(geometry, material);
    crate.position.y = size / 2;
    crate.castShadow = true;
    crate.receiveShadow = true;
    crate.name = 'CrateBody';
    crateGroup.add(crate);

    // Edge frame detail (darker rims)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a5a34,
      roughness: 0.9,
      metalness: 0.0,
    });
    for (let i = 0; i < 3; i++) {
      const rimGeo = new THREE.BoxGeometry(size, 0.06, size);
      const rim = new THREE.Mesh(rimGeo, rimMaterial);
      rim.position.y = 0.1 + i * (size / 2.5);
      rim.castShadow = true;
      crateGroup.add(rim);
    }

    // Register collider
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const h = (size / 2);
    const rotatedHalfX = Math.abs(cos) * h + Math.abs(sin) * h;
    const rotatedHalfZ = Math.abs(sin) * h + Math.abs(cos) * h;

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, size, z + rotatedHalfZ,
      `Crate_${x}_${z}`
    );

    return crateGroup;
  }

  /**
   * Creates wooden barrels scattered near dumpsters and alleyways.
   *
   * @param parent - The group to add barrels to
   */
  private createBarrels(parent: THREE.Group): void {
    const barrelData = [
      { x: -24, z: -12, rotationY: 0 },
      { x: -7, z: -13, rotationY: 0 },
      { x: 5, z: -14, rotationY: 0 },
      { x: 30, z: -15, rotationY: 0 },
      { x: -26, z: 12, rotationY: 0 },
      { x: -19, z: -16, rotationY: 0 },
    ];

    for (const data of barrelData) {
      parent.add(this.createBarrel(data.x, data.z, data.rotationY));
    }
  }

  /**
   * Creates a single wooden barrel.
   *
   * @param x - X position
   * @param z - Z position
   * @param rotationY - Y rotation
   * @returns THREE.Group containing the barrel
   */
  private createBarrel(x: number, z: number, rotationY: number): THREE.Group {
    const barrelGroup = new THREE.Group();
    barrelGroup.name = `Barrel_${x}_${z}`;
    barrelGroup.position.set(x, 0, z);
    barrelGroup.rotation.y = rotationY;

    const woodTexture = createWoodTexture();
    woodTexture.repeat.set(1, 1);

    // Slightly tapered wooden barrel (radius_radius_radius, height)
    const radius = 0.45;
    const height = 1.1;
    const geometry = new THREE.CylinderGeometry(radius * 0.85, radius, height, 10);
    const material = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.85,
      metalness: 0.0,
      color: 0xa87a42,
    });
    const barrel = new THREE.Mesh(geometry, material);
    barrel.position.y = height / 2;
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    barrel.name = 'BarrelBody';
    barrelGroup.add(barrel);

    // Metal hoops (darker rings)
    const hoopMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.5,
      metalness: 0.7,
    });
    for (const yOffset of [0.25, 0.85]) {
      const hoopGeo = new THREE.TorusGeometry(radius * 0.9, 0.05, 6, 14);
      const hoop = new THREE.Mesh(hoopGeo, hoopMaterial);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = yOffset;
      hoop.castShadow = true;
      barrelGroup.add(hoop);
    }

    // Register collider (approximate cylinder as box)
    this.collisionManager.addBox(
      x - radius, 0, z - radius,
      x + radius, height, z + radius,
      `Barrel_${x}_${z}`
    );

    return barrelGroup;
  }

  /**
   * Creates red fire hydrants along the curbs.
   *
   * @param parent - The group to add hydrants to
   */
  private createHydrants(parent: THREE.Group): void {
    const hydrantPositions = [
      { x: -33, z: -5.2 },
      { x: 2, z: -5.2 },
      { x: 27, z: -5.2 },
      { x: -20, z: 5.2 },
      { x: 15, z: 5.2 },
    ];

    for (const data of hydrantPositions) {
      parent.add(this.createHydrant(data.x, data.z));
    }
  }

  /**
   * Creates a single red fire hydrant.
   *
   * @param x - X position
   * @param z - Z position
   * @returns THREE.Mesh containing the hydrant
   */
  private createHydrant(x: number, z: number): THREE.Mesh {
    const hydrantMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      roughness: 0.5,
      metalness: 0.4,
    });

    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.7, 10);
    const hydrant = new THREE.Mesh(bodyGeometry, hydrantMaterial);
    hydrant.position.set(x, 0.35, z);
    hydrant.castShadow = true;
    hydrant.name = `Hydrant_${x}_${z}`;

    // Dome cap
    const capGeometry = new THREE.SphereGeometry(0.16, 10, 8);
    const cap = new THREE.Mesh(capGeometry, hydrantMaterial);
    cap.position.y = 0.7;
    hydrant.add(cap);

    // Side nozzles
    const nozzleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8);
    const nozzle1 = new THREE.Mesh(nozzleGeometry, hydrantMaterial);
    nozzle1.rotation.z = Math.PI / 2;
    nozzle1.position.y = 0.35;
    hydrant.add(nozzle1);
    const nozzle2 = nozzle1.clone();
    nozzle2.rotation.y = Math.PI / 2;
    hydrant.add(nozzle2);

    // Register collider
    this.collisionManager.addBox(
      x - 0.2, 0, z - 0.2,
      x + 0.2, 0.8, z + 0.2,
      `Hydrant_${x}_${z}`
    );

    return hydrant;
  }

  /**
   * Creates traffic cones on the road as navigation and cover dividers.
   *
   * @param parent - The group to add cones to
   */
  private createTrafficCones(parent: THREE.Group): void {
    const conePositions = [
      { x: -8, z: -3 },
      { x: 2, z: 3 },
      { x: 20, z: -1.5 },
      { x: 33, z: 2.5 },
      { x: -38, z: 1 },
      { x: 5, z: -4 },
    ];

    for (const data of conePositions) {
      parent.add(this.createTrafficCone(data.x, data.z));
    }
  }

  /**
   * Creates a single orange traffic cone.
   *
   * @param x - X position
   * @param z - Z position
   * @returns THREE.Group containing the cone
   */
  private createTrafficCone(x: number, z: number): THREE.Group {
    const coneGroup = new THREE.Group();
    coneGroup.name = `Cone_${x}_${z}`;
    coneGroup.position.set(x, 0, z);

    const coneMaterial = new THREE.MeshStandardMaterial({
      color: 0xff7a1a,
      roughness: 0.6,
      metalness: 0.1,
    });

    // Cone body
    const coneGeometry = new THREE.CylinderGeometry(0.05, 0.2, 0.5, 12);
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = 0.25;
    cone.castShadow = true;
    cone.name = 'ConeBody';
    coneGroup.add(cone);

    // White reflective band
    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.4,
      metalness: 0.2,
    });
    const bandGeometry = new THREE.CylinderGeometry(0.12, 0.13, 0.08, 12);
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.y = 0.28;
    coneGroup.add(band);

    // Square base
    const baseGeometry = new THREE.BoxGeometry(0.42, 0.05, 0.42);
    const base = new THREE.Mesh(baseGeometry, coneMaterial);
    base.position.y = 0.025;
    base.castShadow = true;
    coneGroup.add(base);

    // Register collider
    this.collisionManager.addBox(
      x - 0.22, 0, z - 0.22,
      x + 0.22, 0.55, z + 0.22,
      `Cone_${x}_${z}`
    );

    return coneGroup;
  }

  /**
   * Creates street mailboxes along the sidewalk.
   *
   * @param parent - The group to add mailboxes to
   */
  private createMailboxes(parent: THREE.Group): void {
    const mailboxPositions = [
      { x: -16, z: -8.5 },
      { x: 12, z: -8.5 },
      { x: -12, z: 8.5 },
      { x: 24, z: 8.5 },
    ];

    for (const data of mailboxPositions) {
      parent.add(this.createMailbox(data.x, data.z));
    }
  }

  /**
   * Creates a single blue street mailbox on a post.
   *
   * @param x - X position
   * @param z - Z position
   * @returns THREE.Group containing the mailbox
   */
  private createMailbox(x: number, z: number): THREE.Group {
    const mailboxGroup = new THREE.Group();
    mailboxGroup.name = `Mailbox_${x}_${z}`;
    mailboxGroup.position.set(x, 0, z);

    // Post (wooden)
    const woodTexture = createWoodTexture();
    woodTexture.repeat.set(1, 1);
    const postGeometry = new THREE.CylinderGeometry(0.07, 0.08, 1.3, 8);
    const postMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.9,
      metalness: 0.0,
      color: 0x6b4a2b,
    });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 0.65;
    post.castShadow = true;
    mailboxGroup.add(post);

    // Mailbox body (rounded box)
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x3377aa,
      roughness: 0.5,
      metalness: 0.4,
    });
    const bodyGeometry = new THREE.BoxGeometry(0.55, 0.28, 0.35);
    const body = new THREE.Mesh(bodyGeometry, boxMaterial);
    body.position.y = 1.25;
    body.castShadow = true;
    body.name = 'MailboxBody';
    mailboxGroup.add(body);

    // Dome top
    const domeGeometry = new THREE.SphereGeometry(0.2, 10, 6);
    const dome = new THREE.Mesh(domeGeometry, boxMaterial);
    dome.position.y = 1.42;
    dome.castShadow = true;
    mailboxGroup.add(dome);

    // Register collider
    this.collisionManager.addBox(
      x - 0.3, 0, z - 0.2,
      x + 0.3, 1.5, z + 0.2,
      `Mailbox_${x}_${z}`
    );

    return mailboxGroup;
  }

  /**
   * Creates park benches along the sidewalk.
   *
   * @param parent - The group to add benches to
   */
  private createBenches(parent: THREE.Group): void {
    const benchPositions = [
      { x: -33, z: 8.5 },
      { x: 18, z: -8.5 },
      { x: 7, z: 8.5 },
    ];

    for (const data of benchPositions) {
      parent.add(this.createBench(data.x, data.z, data.x > 10 ? Math.PI : 0));
    }
  }

  /**
   * Creates a single wooden park bench.
   *
   * @param x - X position
   * @param z - Z position
   * @param rotationY - Y rotation (facing toward road)
   * @returns THREE.Group containing the bench
   */
  private createBench(x: number, z: number, rotationY: number): THREE.Group {
    const benchGroup = new THREE.Group();
    benchGroup.name = `Bench_${x}_${z}`;
    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = rotationY;

    const woodTexture = createWoodTexture();
    woodTexture.repeat.set(1, 1);
    const woodMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.85,
      metalness: 0.0,
      color: 0x7a5a34,
    });
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.6,
    });

    const benchWidth = 1.8;

    // Seat slats
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(benchWidth, 0.06, 0.12),
        woodMaterial
      );
      slat.position.set(0, 0.55, -0.1 + i * 0.1);
      slat.rotation.x = 0.03 * (i - 1);
      slat.castShadow = true;
      benchGroup.add(slat);
    }

    // Backrest slats
    for (let i = 0; i < 2; i++) {
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(benchWidth, 0.06, 0.1),
        woodMaterial
      );
      back.position.set(0, 0.85, 0.3);
      back.rotation.x = 0.2;
      back.castShadow = true;
      benchGroup.add(back);
    }

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.08, 0.5, 0.3);
    for (const dx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(dx, 0.25, 0);
      leg.castShadow = true;
      benchGroup.add(leg);
    }

    // Register collider (bench footprint)
    this.collisionManager.addBox(
      x - 1.0, 0, z - 0.4,
      x + 1.0, 0.9, z + 0.4,
      `Bench_${x}_${z}`
    );

    return benchGroup;
  }

  /**
   * Creates the outer perimeter walls that enclose the entire town map.
   * Four long walls at the ±50m boundaries with a concrete/brick finish.
   *
   * @param parent - The parent group to add the walls to
   */
  private createOuterWalls(parent: THREE.Group): void {
    const half = 50;
    const wallHeight = 3.5;
    const wallThickness = 0.6;

    const texture = createConcreteTexture();
    texture.repeat.set(40, 2);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Four walls centered on the boundary lines (faces sit just inside ±50).
    const wallDefs = [
      { x: 0, z: -half, lenX: half * 2, lenZ: wallThickness },
      { x: 0, z: half, lenX: half * 2, lenZ: wallThickness },
      { x: -half, z: 0, lenX: wallThickness, lenZ: half * 2 },
      { x: half, z: 0, lenX: wallThickness, lenZ: half * 2 },
    ];

    for (let i = 0; i < wallDefs.length; i++) {
      const w = wallDefs[i];
      const geometry = new THREE.BoxGeometry(w.lenX, wallHeight, w.lenZ);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(w.x, wallHeight / 2, w.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = `OuterWall_${i}`;
      parent.add(mesh);

      // Register collider (walls block player + bullets)
      this.collisionManager.addBox(
        w.x - w.lenX / 2, 0, w.z - w.lenZ / 2,
        w.x + w.lenX / 2, wallHeight, w.z + w.lenZ / 2,
        `OuterWall_${i}`
      );
    }
  }
}