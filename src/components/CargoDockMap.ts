import * as THREE from 'three';
import CollisionManager from './CollisionManager';
import { createConcreteTexture, createContainerTexture, createCorrugatedMetalTexture, createWoodTexture, createMetalTexture, createAsphaltTexture } from '../utils/TextureFactory';

/**
 * CargoDockMap constructs the Cargo Dock map for the FPS Strike Survival game.
 *
 * The map is 100x100m (boundary at ±50 on X and Z) with:
 * - Concrete ground with procedural texture
 * - Shipping containers arranged in corridors for tactical cover
 * - Gantry cranes at the dock edge
 * - Wooden crates and pallets as low cover
 * - Raised concrete dock edge along the water side
 * - Warning lights on cranes and container corners
 * - Scattered debris for environmental detail
 *
 * Lighting: cool industrial directional light, moderate ambient, industrial haze fog.
 */
export default class CargoDockMap {
  /** Map identifier for map selection. */
  public static readonly MAP_ID = 'cargo-dock';

  /** Display name for the map. */
  public static readonly MAP_NAME = 'CARGO DOCK';

  /** Player spawn position (center of the map). */
  public static readonly SPAWN_POSITION = { x: 0, z: 0 };

  /** Map boundary half-size (map is 100x100m, so ±50). */
  private static readonly MAP_HALF_SIZE = 50;

  /** Reference to the collision manager for registering colliders. */
  private collisionManager: CollisionManager;

  /**
   * @param collisionManager - The CollisionManager to register colliders with
   */
  constructor(collisionManager: CollisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Builds the entire Cargo Dock map and returns a THREE.Group containing
   * all map meshes. The group should be added to the scene by the caller.
   *
   * @returns THREE.Group containing all map meshes
   */
  public build(): THREE.Group {
    const mapGroup = new THREE.Group();
    mapGroup.name = 'CargoDockMap';

    // Build all map components in order (ground first, then structures)
    mapGroup.add(this.createGround());
    mapGroup.add(this.createContainers());
    mapGroup.add(this.createCranes());
    mapGroup.add(this.createCrates());
    mapGroup.add(this.createPallets());
    mapGroup.add(this.createDockEdge());
    mapGroup.add(this.createWarningLights());
        mapGroup.add(this.createDebris());
    mapGroup.add(this.createWarehouse());
    mapGroup.add(this.createForklifts());
    mapGroup.add(this.createFuelBarrels());
    mapGroup.add(this.createCableReels());
    mapGroup.add(this.createMooringEquipment());
    mapGroup.add(this.createBollards());
    mapGroup.add(this.createDockLines());
    mapGroup.add(this.createOverheadGantry());
    mapGroup.add(this.createOuterWalls());

    // Enable frustum culling on all meshes for performance
    mapGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true;
      }
    });

    return mapGroup;
  }

  /**
   * Configures the lighting for the Cargo Dock map.
   * Cool industrial directional light, moderate ambient, industrial haze fog.
   *
   * @param scene - The THREE.Scene to configure lighting on
   */
  public configureLighting(scene: THREE.Scene): void {
    // Cool industrial directional light
    const directionalLight = new THREE.DirectionalLight(0xc0d8ff, 1.2);
    directionalLight.position.set(-40, 70, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    // Moderate ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground gradient
    const hemisphereLight = new THREE.HemisphereLight(0xb0c4de, 0x4a4a4a, 0.5);
    scene.add(hemisphereLight);

    // Industrial haze fog
    scene.fog = new THREE.Fog(0x8a9ba8, 70, 160);
  }

  /**
   * Creates the concrete ground plane.
   * 100x100m at Y=0, repeated 20x20.
   *
   * @returns THREE.Mesh ground plane
   */
  private createGround(): THREE.Mesh {
    const texture = createConcreteTexture();
    texture.repeat.set(20, 20);

    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1,
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'CargoDockGround';

    return ground;
  }

  /**
   * Creates shipping containers arranged in corridors for tactical cover.
   * Containers are ~6m long, 2.4m wide, 2.6m tall. Some are stacked 2-high.
   * Arranged in rows with gaps between them so the player can move between.
   *
   * @returns THREE.Group containing all containers
   */
  private createContainers(): THREE.Group {
    const containersGroup = new THREE.Group();
    containersGroup.name = 'ShippingContainers';

    // Blue container texture
    const blueTexture = createContainerTexture();
    blueTexture.repeat.set(3, 1);

    // Gray container texture
    const grayTexture = createCorrugatedMetalTexture();
    grayTexture.repeat.set(3, 1);

    const blueMaterial = new THREE.MeshStandardMaterial({
      map: blueTexture,
      roughness: 0.7,
      metalness: 0.4,
    });

    const grayMaterial = new THREE.MeshStandardMaterial({
      map: grayTexture,
      roughness: 0.7,
      metalness: 0.5,
    });

    // Container dimensions
    const containerLength = 6.0; // X axis
    const containerWidth = 2.4;  // Z axis
    const containerHeight = 2.6; // Y axis

    // Container placement data: [x, z, rotationY, stacked, color]
    // Arranged in rows/corridors with 4m gaps for player movement
    const containerData = [
      // Row 1 (north area) - horizontal containers
      { x: -30, z: -25, rotationY: 0, stacked: false, color: 'blue' },
      { x: -22, z: -25, rotationY: 0, stacked: false, color: 'gray' },
      { x: -14, z: -25, rotationY: 0, stacked: false, color: 'blue' },
      { x: -6, z: -25, rotationY: 0, stacked: false, color: 'gray' },
      { x: 2, z: -25, rotationY: 0, stacked: false, color: 'blue' },
      { x: 10, z: -25, rotationY: 0, stacked: false, color: 'gray' },
      { x: 18, z: -25, rotationY: 0, stacked: false, color: 'blue' },
      { x: 26, z: -25, rotationY: 0, stacked: false, color: 'gray' },

      // Row 2 (mid-north) - vertical containers creating corridors
      { x: -28, z: -15, rotationY: Math.PI / 2, stacked: false, color: 'gray' },
      { x: -20, z: -15, rotationY: Math.PI / 2, stacked: true, color: 'blue' },
      { x: -12, z: -15, rotationY: Math.PI / 2, stacked: false, color: 'gray' },
      { x: -4, z: -15, rotationY: Math.PI / 2, stacked: false, color: 'blue' },
      { x: 4, z: -15, rotationY: Math.PI / 2, stacked: true, color: 'gray' },
      { x: 12, z: -15, rotationY: Math.PI / 2, stacked: false, color: 'blue' },
      { x: 20, z: -15, rotationY: Math.PI / 2, stacked: false, color: 'gray' },
      { x: 28, z: -15, rotationY: Math.PI / 2, stacked: true, color: 'blue' },

      // Row 3 (mid-south) - horizontal containers
      { x: -30, z: 5, rotationY: 0, stacked: false, color: 'gray' },
      { x: -22, z: 5, rotationY: 0, stacked: true, color: 'blue' },
      { x: -14, z: 5, rotationY: 0, stacked: false, color: 'gray' },
      { x: -6, z: 5, rotationY: 0, stacked: false, color: 'blue' },
      { x: 2, z: 5, rotationY: 0, stacked: true, color: 'gray' },
      { x: 10, z: 5, rotationY: 0, stacked: false, color: 'blue' },
      { x: 18, z: 5, rotationY: 0, stacked: false, color: 'gray' },
      { x: 26, z: 5, rotationY: 0, stacked: true, color: 'blue' },

      // Row 4 (south area) - vertical containers
      { x: -28, z: 15, rotationY: Math.PI / 2, stacked: false, color: 'blue' },
      { x: -20, z: 15, rotationY: Math.PI / 2, stacked: false, color: 'gray' },
      { x: -12, z: 15, rotationY: Math.PI / 2, stacked: true, color: 'blue' },
      { x: -4, z: 15, rotationY: Math.PI / 2, stacked: false, color: 'gray' },
      { x: 4, z: 15, rotationY: Math.PI / 2, stacked: false, color: 'blue' },
      { x: 12, z: 15, rotationY: Math.PI / 2, stacked: true, color: 'gray' },
      { x: 20, z: 15, rotationY: Math.PI / 2, stacked: false, color: 'blue' },
      { x: 28, z: 15, rotationY: Math.PI / 2, stacked: false, color: 'gray' },

      // Row 5 (far south) - horizontal containers
      { x: -30, z: 25, rotationY: 0, stacked: false, color: 'blue' },
      { x: -22, z: 25, rotationY: 0, stacked: false, color: 'gray' },
      { x: -14, z: 25, rotationY: 0, stacked: true, color: 'blue' },
      { x: -6, z: 25, rotationY: 0, stacked: false, color: 'gray' },
      { x: 2, z: 25, rotationY: 0, stacked: false, color: 'blue' },
      { x: 10, z: 25, rotationY: 0, stacked: true, color: 'gray' },
      { x: 18, z: 25, rotationY: 0, stacked: false, color: 'blue' },
      { x: 26, z: 25, rotationY: 0, stacked: false, color: 'gray' },
    ];

    for (const data of containerData) {
      const material = data.color === 'blue' ? blueMaterial : grayMaterial;

      // Bottom container
      containersGroup.add(this.createContainer(
        data.x, data.z, data.rotationY, containerLength, containerWidth, containerHeight, material
      ));

      // Stacked container (2-high)
      if (data.stacked) {
        containersGroup.add(this.createContainer(
          data.x, data.z, data.rotationY, containerLength, containerWidth, containerHeight, material, true
        ));
      }
    }

    return containersGroup;
  }

  /**
   * Creates a single shipping container.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param rotationY - Y rotation in radians
   * @param length - Container length (X axis)
   * @param width - Container width (Z axis)
   * @param height - Container height (Y axis)
   * @param material - Container material
   * @param stacked - Whether this is a stacked container (2-high)
   * @returns THREE.Mesh containing the container
   */
  private createContainer(
    x: number,
    z: number,
    rotationY: number,
    length: number,
    width: number,
    height: number,
    material: THREE.MeshStandardMaterial,
    stacked: boolean = false
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(length, height, width);
    const container = new THREE.Mesh(geometry, material);
    container.position.set(x, stacked ? height * 1.5 : height / 2, z);
    container.rotation.y = rotationY;
    container.castShadow = true;
    container.receiveShadow = true;
    container.name = `Container_${x}_${z}_${stacked ? 'top' : 'bottom'}`;

    // Register collider (rotated AABB approximation)
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * (length / 2) + Math.abs(sin) * (width / 2);
    const rotatedHalfZ = Math.abs(sin) * (length / 2) + Math.abs(cos) * (width / 2);

    const bottomY = stacked ? height : 0;
    const topY = stacked ? height * 2 : height;

    this.collisionManager.addBox(
      x - rotatedHalfX, bottomY, z - rotatedHalfZ,
      x + rotatedHalfX, topY, z + rotatedHalfZ,
      `Container_${x}_${z}_${stacked ? 'top' : 'bottom'}`
    );

    return container;
  }

  /**
   * Creates gantry cranes at the dock edge.
   * Each crane has two tall legs, a horizontal beam, and a small cabin.
   *
   * @returns THREE.Group containing all cranes
   */
  private createCranes(): THREE.Group {
    const cranesGroup = new THREE.Group();
    cranesGroup.name = 'GantryCranes';

    const metalTexture = createMetalTexture();
    metalTexture.repeat.set(2, 4);

    const metalMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.5,
      metalness: 0.7,
      color: 0xaa6633,
    });

    const beamMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.5,
      metalness: 0.7,
      color: 0xcc8844,
    });

    // Crane positions (at dock edge, north side)
    const cranePositions = [
      { x: -20, z: -40 },
      { x: 20, z: -40 },
    ];

    for (const pos of cranePositions) {
      cranesGroup.add(this.createCrane(pos.x, pos.z, metalMaterial, beamMaterial));
    }

    return cranesGroup;
  }

  /**
   * Creates a single gantry crane.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param legMaterial - Material for crane legs
   * @param beamMaterial - Material for crane beam
   * @returns THREE.Group containing the crane
   */
  private createCrane(
    x: number,
    z: number,
    legMaterial: THREE.MeshStandardMaterial,
    beamMaterial: THREE.MeshStandardMaterial
  ): THREE.Group {
    const craneGroup = new THREE.Group();
    craneGroup.name = `Crane_${x}_${z}`;
    craneGroup.position.set(x, 0, z);

    // Crane dimensions
    const legHeight = 12;
    const legWidth = 0.8;
    const legDepth = 0.8;
    const legSpacing = 6.0; // Distance between legs (X axis)
    const beamLength = legSpacing + legWidth * 2;
    const beamHeight = 1.2;
    const beamDepth = 1.0;

    // --- Left leg ---
    const leftLeg = new THREE.Mesh(
      new THREE.BoxGeometry(legWidth, legHeight, legDepth),
      legMaterial
    );
    leftLeg.position.set(-legSpacing / 2, legHeight / 2, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLeg.name = 'CraneLeftLeg';
    craneGroup.add(leftLeg);

    // Register left leg collider
    this.collisionManager.addBox(
      x - legSpacing / 2 - legWidth / 2, 0, z - legDepth / 2,
      x - legSpacing / 2 + legWidth / 2, legHeight, z + legDepth / 2,
      `Crane_${x}_${z}_LeftLeg`
    );

    // --- Right leg ---
    const rightLeg = new THREE.Mesh(
      new THREE.BoxGeometry(legWidth, legHeight, legDepth),
      legMaterial
    );
    rightLeg.position.set(legSpacing / 2, legHeight / 2, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLeg.name = 'CraneRightLeg';
    craneGroup.add(rightLeg);

    // Register right leg collider
    this.collisionManager.addBox(
      x + legSpacing / 2 - legWidth / 2, 0, z - legDepth / 2,
      x + legSpacing / 2 + legWidth / 2, legHeight, z + legDepth / 2,
      `Crane_${x}_${z}_RightLeg`
    );

    // --- Horizontal beam (across the top) ---
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(beamLength, beamHeight, beamDepth),
      beamMaterial
    );
    beam.position.set(0, legHeight + beamHeight / 2, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    beam.name = 'CraneBeam';
    craneGroup.add(beam);

    // --- Cabin (small box on the beam) ---
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.6,
      metalness: 0.5,
    });

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.0, 1.2),
      cabinMaterial
    );
    cabin.position.set(1.0, legHeight + beamHeight + 0.5, 0);
    cabin.castShadow = true;
    cabin.name = 'CraneCabin';
    craneGroup.add(cabin);

    // --- Cabin window (emissive) ---
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x88ccff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });

    const window = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.6, 0.1),
      windowMaterial
    );
    window.position.set(1.0, legHeight + beamHeight + 0.5, 0.65);
    window.name = 'CraneCabinWindow';
    craneGroup.add(window);

    return craneGroup;
  }

  /**
   * Creates wooden crates clustered in groups for low cover.
   * Various sizes (0.8-1.5m) arranged between container rows.
   *
   * @returns THREE.Group containing all crates
   */
  private createCrates(): THREE.Group {
    const cratesGroup = new THREE.Group();
    cratesGroup.name = 'WoodenCrates';

    const texture = createWoodTexture();
    texture.repeat.set(1, 1);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Crate cluster data: [centerX, centerZ, count]
    const clusterData = [
      { x: -25, z: -20, count: 4 },
      { x: -15, z: -20, count: 3 },
      { x: 15, z: -20, count: 4 },
      { x: 25, z: -20, count: 3 },
      { x: -25, z: 0, count: 3 },
      { x: 25, z: 0, count: 4 },
      { x: -15, z: 10, count: 3 },
      { x: 15, z: 10, count: 4 },
      { x: -25, z: 20, count: 3 },
      { x: 25, z: 20, count: 4 },
      { x: 0, z: -10, count: 5 },
      { x: 0, z: 20, count: 3 },
    ];

    for (const cluster of clusterData) {
      for (let i = 0; i < cluster.count; i++) {
        const offsetX = (Math.random() - 0.5) * 3;
        const offsetZ = (Math.random() - 0.5) * 3;
        const size = 0.8 + Math.random() * 0.7;
        const height = size * (0.8 + Math.random() * 0.4);
        const rotationY = Math.random() * Math.PI;

        cratesGroup.add(this.createCrate(
          cluster.x + offsetX,
          cluster.z + offsetZ,
          size,
          height,
          rotationY,
          material
        ));
      }
    }

    return cratesGroup;
  }

  /**
   * Creates a single wooden crate.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param size - Base size of the crate
   * @param height - Height of the crate
   * @param rotationY - Y rotation in radians
   * @param material - Shared wood material
   * @returns THREE.Mesh containing the crate
   */
  private createCrate(
    x: number,
    z: number,
    size: number,
    height: number,
    rotationY: number,
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size, height, size);
    const crate = new THREE.Mesh(geometry, material);
    crate.position.set(x, height / 2, z);
    crate.rotation.y = rotationY;
    crate.castShadow = true;
    crate.receiveShadow = true;
    crate.name = `Crate_${x}_${z}`;

    // Register collider (rotated AABB approximation)
    const halfSize = size / 2;
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * halfSize + Math.abs(sin) * halfSize;
    const rotatedHalfZ = Math.abs(sin) * halfSize + Math.abs(cos) * halfSize;

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, height, z + rotatedHalfZ,
      `Crate_${x}_${z}`
    );

    return crate;
  }

  /**
   * Creates low flat pallets with wood texture.
   * Used as low cover and visual detail.
   *
   * @returns THREE.Group containing all pallets
   */
  private createPallets(): THREE.Group {
    const palletsGroup = new THREE.Group();
    palletsGroup.name = 'Pallets';

    const texture = createWoodTexture();
    texture.repeat.set(1, 1);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Pallet dimensions
    const palletLength = 1.2; // X axis
    const palletWidth = 1.0;  // Z axis
    const palletHeight = 0.15; // Y axis

    // Pallet positions (scattered between container rows)
    const palletPositions = [
      { x: -27, z: -22, rotationY: 0 },
      { x: -17, z: -22, rotationY: Math.PI / 2 },
      { x: 17, z: -22, rotationY: 0 },
      { x: 27, z: -22, rotationY: Math.PI / 2 },
      { x: -27, z: 2, rotationY: Math.PI / 2 },
      { x: 27, z: 2, rotationY: 0 },
      { x: -17, z: 12, rotationY: 0 },
      { x: 17, z: 12, rotationY: Math.PI / 2 },
      { x: -27, z: 22, rotationY: 0 },
      { x: 27, z: 22, rotationY: Math.PI / 2 },
      { x: -2, z: -12, rotationY: 0 },
      { x: 2, z: 22, rotationY: Math.PI / 2 },
    ];

    for (const data of palletPositions) {
      const geometry = new THREE.BoxGeometry(palletLength, palletHeight, palletWidth);
      const pallet = new THREE.Mesh(geometry, material);
      pallet.position.set(data.x, palletHeight / 2, data.z);
      pallet.rotation.y = data.rotationY;
      pallet.castShadow = true;
      pallet.receiveShadow = true;
      pallet.name = `Pallet_${data.x}_${data.z}`;

      // Register collider (rotated AABB approximation)
      const cos = Math.cos(data.rotationY);
      const sin = Math.sin(data.rotationY);
      const rotatedHalfX = Math.abs(cos) * (palletLength / 2) + Math.abs(sin) * (palletWidth / 2);
      const rotatedHalfZ = Math.abs(sin) * (palletLength / 2) + Math.abs(cos) * (palletWidth / 2);

      this.collisionManager.addBox(
        data.x - rotatedHalfX, 0, data.z - rotatedHalfZ,
        data.x + rotatedHalfX, palletHeight, data.z + rotatedHalfZ,
        `Pallet_${data.x}_${data.z}`
      );

      palletsGroup.add(pallet);
    }

    return palletsGroup;
  }

  /**
   * Creates a raised concrete dock edge along the water side (north edge).
   * A long low box with concrete texture.
   *
   * @returns THREE.Group containing the dock edge
   */
  private createDockEdge(): THREE.Group {
    const dockEdgeGroup = new THREE.Group();
    dockEdgeGroup.name = 'DockEdge';

    const texture = createConcreteTexture();
    texture.repeat.set(25, 1);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Dock edge dimensions
    const edgeLength = 100; // X axis (full map width)
    const edgeWidth = 2.0;  // Z axis
    const edgeHeight = 0.5; // Y axis

    // Dock edge along the north edge (Z = -48)
    const dockEdge = new THREE.Mesh(
      new THREE.BoxGeometry(edgeLength, edgeHeight, edgeWidth),
      material
    );
    dockEdge.position.set(0, edgeHeight / 2, -48);
    dockEdge.castShadow = true;
    dockEdge.receiveShadow = true;
    dockEdge.name = 'DockEdgeNorth';
    dockEdgeGroup.add(dockEdge);

    // Register collider
    this.collisionManager.addBox(
      -50, 0, -49,
      50, edgeHeight, -47,
      'DockEdgeNorth'
    );

    // Dock edge along the south edge (Z = 48)
    const dockEdgeSouth = new THREE.Mesh(
      new THREE.BoxGeometry(edgeLength, edgeHeight, edgeWidth),
      material
    );
    dockEdgeSouth.position.set(0, edgeHeight / 2, 48);
    dockEdgeSouth.castShadow = true;
    dockEdgeSouth.receiveShadow = true;
    dockEdgeSouth.name = 'DockEdgeSouth';
    dockEdgeGroup.add(dockEdgeSouth);

    // Register collider
    this.collisionManager.addBox(
      -50, 0, 47,
      50, edgeHeight, 49,
      'DockEdgeSouth'
    );

    return dockEdgeGroup;
  }

  /**
   * Creates warning lights on cranes and container corners.
   * Small emissive red/orange spheres.
   *
   * @returns THREE.Group containing all warning lights
   */
  private createWarningLights(): THREE.Group {
    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'WarningLights';

    // Red warning light material
    const redMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2.0,
      roughness: 0.3,
      metalness: 0.0,
    });

    // Orange warning light material
    const orangeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 2.0,
      roughness: 0.3,
      metalness: 0.0,
    });

    const lightGeometry = new THREE.SphereGeometry(0.15, 8, 8);

    // Warning lights on crane tops (at crane positions)
    const craneLightPositions = [
      { x: -20, y: 14, z: -40 },
      { x: 20, y: 14, z: -40 },
    ];

    for (const pos of craneLightPositions) {
      const light = new THREE.Mesh(lightGeometry, redMaterial);
      light.position.set(pos.x, pos.y, pos.z);
      light.name = `CraneWarningLight_${pos.x}_${pos.z}`;
      lightsGroup.add(light);
    }

    // Warning lights on container corners (scattered)
    const containerLightPositions = [
      { x: -30, y: 2.6, z: -25, color: 'red' },
      { x: -6, y: 2.6, z: -25, color: 'orange' },
      { x: 18, y: 2.6, z: -25, color: 'red' },
      { x: -20, y: 5.2, z: -15, color: 'orange' },
      { x: 4, y: 5.2, z: -15, color: 'red' },
      { x: 28, y: 5.2, z: -15, color: 'orange' },
      { x: -22, y: 5.2, z: 5, color: 'red' },
      { x: 2, y: 5.2, z: 5, color: 'orange' },
      { x: 26, y: 5.2, z: 5, color: 'red' },
      { x: -12, y: 5.2, z: 15, color: 'orange' },
      { x: 12, y: 5.2, z: 15, color: 'red' },
      { x: -14, y: 5.2, z: 25, color: 'orange' },
      { x: 10, y: 5.2, z: 25, color: 'red' },
    ];

    for (const pos of containerLightPositions) {
      const material = pos.color === 'red' ? redMaterial : orangeMaterial;
      const light = new THREE.Mesh(lightGeometry, material);
      light.position.set(pos.x, pos.y, pos.z);
      light.name = `ContainerWarningLight_${pos.x}_${pos.z}`;
      lightsGroup.add(light);
    }

    return lightsGroup;
  }

  /**
   * Creates scattered debris for environmental detail.
   * Small boxes with metal/wood texture (visual only, no collision).
   *
   * @returns THREE.Group containing all debris
   */
  private createDebris(): THREE.Group {
    const debrisGroup = new THREE.Group();
    debrisGroup.name = 'ScatteredDebris';

    // Metal debris material
    const metalTexture = createMetalTexture();
    metalTexture.repeat.set(1, 1);

    const metalMaterial = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: 0.6,
      metalness: 0.6,
      color: 0x888888,
    });

    // Wood debris material
    const woodTexture = createWoodTexture();
    woodTexture.repeat.set(1, 1);

    const woodMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Scatter debris across the map
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const size = 0.1 + Math.random() * 0.3;
      const height = size * (0.3 + Math.random() * 0.5);
      const isMetal = Math.random() > 0.5;

      const geometry = new THREE.BoxGeometry(size, height, size);
      const debris = new THREE.Mesh(geometry, isMetal ? metalMaterial : woodMaterial);
      debris.position.set(x, height / 2, z);
      debris.rotation.y = Math.random() * Math.PI;
      debris.rotation.x = (Math.random() - 0.5) * 0.3;
      debris.rotation.z = (Math.random() - 0.5) * 0.3;
      debris.castShadow = true;
      debris.receiveShadow = true;
      debris.name = `Debris_${i}`;
      debrisGroup.add(debris);
    }

    return debrisGroup;
  }

  /**
   * Creates warehouse buildings along the dock edge for backdrop and cover.
   * Simple sheet-metal workshop structures with a peaked (shed) roof.
   *
   * @returns THREE.Group containing the warehouse
   */
  private createWarehouse(): THREE.Group {
    const warehouseGroup = new THREE.Group();
    warehouseGroup.name = 'Warehouse';

    const metalTexture = createMetalTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x9aa5ad,
      roughness: 0.8,
      metalness: 0.4,
      map: metalTexture,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x6a7a84,
      roughness: 0.9,
      metalness: 0.3,
    });

    // Warehouse footprint along south-east corner
    const warehouseData = [
      { x: -40, z: 34, width: 18, depth: 18, height: 6 },
      { x: 30, z: 40, width: 20, depth: 16, height: 5.5 },
    ];

    for (const data of warehouseData) {
      const building = new THREE.Group();
      building.name = `Warehouse_${data.x}_${data.z}`;
      building.position.set(data.x, 0, data.z);

      // Walls
      const wallGeo = new THREE.BoxGeometry(data.width, data.height, data.depth);
      const walls = new THREE.Mesh(wallGeo, wallMat);
      walls.position.y = data.height / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      building.add(walls);

      // Shed roof (prism)
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-data.width / 2, 0);
      roofShape.lineTo(-data.width / 2, 1.2);
      roofShape.lineTo(0, 2.2);
      roofShape.lineTo(data.width / 2, 1.2);
      roofShape.lineTo(data.width / 2, 0);
      roofShape.closePath();
      const roofExtrude = new THREE.ExtrudeGeometry(roofShape, {
        depth: data.depth,
        bevelEnabled: false,
      });
      const roof = new THREE.Mesh(roofExtrude, roofMat);
      roof.rotation.x = Math.PI / 2;
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.y = data.height;
      roof.name = 'ShedRoof';
      building.add(roof);

      warehouseGroup.add(building);

      // Register collider
      this.collisionManager.addBox(
        data.x - data.width / 2, 0, data.z - data.depth / 2,
        data.x + data.width / 2, data.height, data.z + data.depth / 2,
        `Warehouse_${data.x}_${data.z}`
      );
    }

    return warehouseGroup;
  }

  /**
   * Creates parked warehouse forklifts.
   * Simplified body with mast, fork, and cab.
   *
   * @returns THREE.Group containing the forklifts
   */
  private createForklifts(): THREE.Group {
    const forkliftGroup = new THREE.Group();
    forkliftGroup.name = 'Forklifts';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf0a020,
      roughness: 0.6,
      metalness: 0.4,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2,
    });

    const data = [
      { x: -32, z: -30, rotationY: 0.3 },
      { x: 12, z: -32, rotationY: -0.5 },
      { x: 34, z: -30, rotationY: 0.1 },
      { x: -28, z: 0, rotationY: 2.6 },
    ];

    for (const item of data) {
      const fl = new THREE.Group();
      fl.position.set(item.x, 0, item.z);
      fl.rotation.y = item.rotationY;

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.2), bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      fl.add(body);

      // Cab (seat area)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 1.0), darkMat);
      cab.position.set(-0.3, 1.2, 0);
      cab.castShadow = true;
      fl.add(cab);

      // Mast (front vertical)
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.5), darkMat);
      mast.position.set(0.9, 1.3, 0);
      fl.add(mast);

      // Forks
      const forkMat = new THREE.MeshStandardMaterial({
        color: 0xb0b0b0,
        roughness: 0.5,
        metalness: 0.7,
      });
      const forkGeo = new THREE.BoxGeometry(1.2, 0.08, 0.1);
      const fork1 = new THREE.Mesh(forkGeo, forkMat);
      fork1.position.set(1.0, 0.15, 0.35);
      fork1.rotation.x = Math.PI / 2;
      fl.add(fork1);
      const fork2 = fork1.clone();
      fork2.position.z = -0.35;
      fl.add(fork2);

      // 4 wheels
      const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
      for (const [wx, wz] of [[0.7, 0.65], [0.7, -0.65], [-0.7, 0.6], [-0.7, -0.6]]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.3, wz);
        fl.add(wheel);
      }

      forkliftGroup.add(fl);

      // Register collider
      const cos = Math.cos(item.rotationY);
      const sin = Math.sin(item.rotationY);
      const rotatedHalfX = Math.abs(cos) * 1.2 + Math.abs(sin) * 0.8;
      const rotatedHalfZ = Math.abs(sin) * 1.2 + Math.abs(cos) * 0.8;
      this.collisionManager.addBox(
        item.x - rotatedHalfX, 0, item.z - rotatedHalfZ,
        item.x + rotatedHalfX, 1.6, item.z + rotatedHalfZ,
        `Forklift_${item.x}_${item.z}`
      );
    }

    return forkliftGroup;
  }

  /**
   * Creates clusters of fuel/chemical barrels stacked in rows.
   *
   * @returns THREE.Group containing the fuel barrels
   */
  private createFuelBarrels(): THREE.Group {
    const barrelGroup = new THREE.Group();
    barrelGroup.name = 'FuelBarrels';

    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xc03a2a,
      roughness: 0.5,
      metalness: 0.3,
    });

    // Barrel cluster data: [centerX, centerZ, count, rotation]
    const clusters = [
      { x: -33, z: -28, count: 6 },
      { x: 10, z: -28, count: 8 },
      { x: -30, z: 10, count: 5 },
      { x: 14, z: 22, count: 7 },
      { x: 0, z: 0, count: 4 },
    ];

    for (const cluster of clusters) {
      // Arrange in a 3-wide grid
      const cols = 3;
      const spacing = 0.6;
      for (let i = 0; i < cluster.count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const ox = (col - (cols - 1) / 2) * spacing;
        const oz = row * spacing;
        const height = 0.9;

        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, height, 10),
          barrelMat
        );
        barrel.position.set(cluster.x + ox, height / 2, cluster.z + oz);
        barrel.rotation.y = Math.random() * Math.PI;
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        barrel.name = `FuelBarrel_${cluster.x}_${cluster.z}_${i}`;
        barrelGroup.add(barrel);

        // Lid ring
        const lid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.41, 0.41, 0.06, 10),
          barrelMat
        );
        lid.position.set(cluster.x + ox, height + 0.03, cluster.z + oz);
        barrelGroup.add(lid);

        this.collisionManager.addBox(
          cluster.x + ox - 0.42, 0, cluster.z + oz - 0.42,
          cluster.x + ox + 0.42, height, cluster.z + oz + 0.42,
          `FuelBarrel_${cluster.x}_${cluster.z}_${i}`
        );
      }
    }

    return barrelGroup;
  }

  /**
   * Creates large industrial cable reels scattered around the dock.
   *
   * @returns THREE.Group containing the cable reels
   */
  private createCableReels(): THREE.Group {
    const reelGroup = new THREE.Group();
    reelGroup.name = 'CableReels';

    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x7a5a34,
      roughness: 0.85,
      metalness: 0.1,
      map: createWoodTexture(),
    });
    const spoolMat = new THREE.MeshStandardMaterial({
      color: 0x556677,
      roughness: 0.6,
      metalness: 0.5,
    });

    const data = [
      { x: -18, z: -26, rotationY: 0 },
      { x: 6, z: -26, rotationY: 0.5 },
      { x: 14, z: 0, rotationY: 0.3 },
      { x: -16, z: 12, rotationY: 0.2 },
      { x: 6, z: 30, rotationY: 0.6 },
    ];

    for (const item of data) {
      const reel = new THREE.Group();
      reel.position.set(item.x, 0, item.z);
      reel.rotation.y = item.rotationY;

      // Drum (cable barrel)
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.0, 14), spoolMat);
      drum.rotation.x = Math.PI / 2;
      drum.position.y = 0.5;
      drum.castShadow = true;
      reel.add(drum);

      // Two wooden flanges
      const flangeGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.12, 14);
      const flangeL = new THREE.Mesh(flangeGeo, drumMat);
      flangeL.rotation.x = Math.PI / 2;
      flangeL.position.set(-0.55, 0.5, 0);
      flangeL.castShadow = true;
      reel.add(flangeL);
      const flangeR = flangeL.clone();
      flangeR.position.x = 0.55;
      reel.add(flangeR);

      reelGroup.add(reel);

      // Register collider
      this.collisionManager.addBox(
        item.x - 1.1, 0, item.z - 1.1,
        item.x + 1.1, 1.1, item.z + 1.1,
        `CableReel_${item.x}_${item.z}`
      );
    }

    return reelGroup;
  }

  /**
   * Creates mooring equipment along the water edge: posts, fenders,
   * and a lifebuoy cluster.
   *
   * @returns THREE.Group containing the mooring equipment
   */
  private createMooringEquipment(): THREE.Group {
    const mooringGroup = new THREE.Group();
    mooringGroup.name = 'MooringEquipment';

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x8a8a8a,
      roughness: 0.6,
      metalness: 0.5,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xb0b0b0,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Mooring posts along the dock edge (z = -48)
    const postXs = [-45, -30, -10, 5, 25, 42];
    for (const px of postXs) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), concreteMat);
      base.position.set(px, 0.35, -48);
      base.castShadow = true;
      mooringGroup.add(base);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.1, 8), postMat);
      post.position.set(px, 1.1, -48);
      mooringGroup.add(post);

      this.collisionManager.addBox(
        px - 0.5, 0, -48.5,
        px + 0.5, 1.3, -47.5,
        `MooringPost_${px}`
      );
    }

    // Tires / rubber fenders hung against the dock edge
    const fenderMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
      metalness: 0.1,
    });
    const fenderXs = [-22, 2, 32];
    for (const fx of fenderXs) {
      const fender = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.18, 8, 12),
        fenderMat
      );
      fender.position.set(fx, 1.2, -47.8);
      fender.castShadow = true;
      mooringGroup.add(fender);
    }

    // Lifebuoy near the dock office
    const buoyMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0x662222,
      emissiveIntensity: 0.2,
    });
    const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 8, 14), buoyMat);
    buoy.position.set(-20, 0.9, -49);
    buoy.rotation.x = Math.PI / 2;
    buoy.castShadow = true;
    mooringGroup.add(buoy);

    return mooringGroup;
  }

  /**
   * Creates round concrete bollards/stanchions scattered on the apron
   * to mark traffic lanes and provide cover.
   *
   * @returns THREE.Group containing the bollards
   */
  private createBollards(): THREE.Group {
    const bollardGroup = new THREE.Group();
    bollardGroup.name = 'Bollards';

    const bollardMat = new THREE.MeshStandardMaterial({
      color: 0xc8c8c8,
      roughness: 0.8,
      metalness: 0.1,
    });

    const bollardData = [
      { x: -35, z: -5, height: 0.9 },
      { x: 35, z: -5, height: 0.9 },
      { x: -38, z: 12, height: 0.9 },
      { x: 30, z: 12, height: 1.1 },
      { x: -16, z: 32, height: 0.9 },
      { x: 14, z: 33, height: 1.0 },
    ];

    for (const item of bollardData) {
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(item.height * 0.3, item.height * 0.38, item.height, 10),
        bollardMat
      );
      bollard.position.set(item.x, item.height / 2, item.z);
      bollard.castShadow = true;
      bollard.receiveShadow = true;
      bollard.name = `Bollard_${item.x}_${item.z}`;
      bollardGroup.add(bollard);

      // Safety cap (orange band)
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xff7a1a,
        roughness: 0.6,
        metalness: 0.1,
      });
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(item.height * 0.33, item.height * 0.33, 0.15, 10),
        capMat
      );
      cap.position.set(item.x, item.height - 0.05, item.z);
      bollardGroup.add(cap);

      const r = item.height * 0.4;
      this.collisionManager.addBox(
        item.x - r, 0, item.z - r,
        item.x + r, item.height, item.z + r,
        `Bollard_${item.x}_${item.z}`
      );
    }

    return bollardGroup;
  }

  /**
   * Creates painted traffic / guide lines on the concrete pavement
   * (forklift lanes and safety walkways).
   *
   * @returns THREE.Group containing the dock lines
   */
  private createDockLines(): THREE.Group {
    const linesGroup = new THREE.Group();
    linesGroup.name = 'DockLines';

    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      roughness: 0.6,
      metalness: 0.1,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.6,
      metalness: 0.1,
    });

    const addLine = (x: number, z: number, w: number, l: number, rotY: number, mat: THREE.MeshStandardMaterial) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = rotY;
      line.position.set(x, 0.02, z);
      line.receiveShadow = true;
      linesGroup.add(line);
    };

    // Central yellow lane
    addLine(-8, -8, 0.18, 48, 0, lineMat);
    addLine(8, 10, 0.18, 48, 0, lineMat);
    // Crosswalk / walkway dashes near containers
    for (let i = 0; i < 6; i++) {
      addLine(-30 + i * 3, 40, 0.12, 1.5, 0, whiteMat);
    }

    return linesGroup;
  }

  /**
   * Creates an overhead loading gantry / truss bridge spanning part of the dock,
   * complementing the portal cranes with additional industrial depth.
   *
   * @returns THREE.Group containing the overhead gantry
   */
  private createOverheadGantry(): THREE.Group {
    const gantryGroup = new THREE.Group();
    gantryGroup.name = 'OverheadGantry';

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x667788,
      roughness: 0.5,
      metalness: 0.7,
    });

    const gantryX = 0;
    const gantryZ = -37;
    const span = 24;
    const archHeight = 5;

    // Two portal frames
    for (const zOff of [-6, 6]) {
      const frame = new THREE.Group();
      const legGeo = new THREE.BoxGeometry(0.5, archHeight, 0.5);
      const l1 = new THREE.Mesh(legGeo, steelMat);
      l1.position.set(-span / 2, archHeight / 2, zOff);
      frame.add(l1);
      const l2 = l1.clone();
      l2.position.x = span / 2;
      frame.add(l2);

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(span + 1, 0.6, 0.5),
        steelMat
      );
      beam.position.set(0, archHeight + 0.3, zOff);
      beam.castShadow = true;
      frame.add(beam);

      frame.position.set(gantryX, 0, gantryZ + zOff);
      gantryGroup.add(frame);
    }

    // Top cross-member
    const topBeam = new THREE.Mesh(
      new THREE.BoxGeometry(span + 1, 0.5, 13),
      steelMat
    );
    topBeam.position.set(gantryX, archHeight + 0.3, gantryZ);
    topBeam.castShadow = true;
    gantryGroup.add(topBeam);

    // Some yellow caution chevrons on the structure
    const chevronMat = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0xf5c518,
      emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 4; i++) {
      const chev = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.3, 0.6),
        chevronMat
      );
      chev.position.set(-span / 2 + 3 + i * 4, archHeight + 0.6, gantryZ);
      gantryGroup.add(chev);
    }

    // Register central legs collider
    this.collisionManager.addBox(
      gantryX - span / 2 - 0.3, 0, gantryZ - 6.3,
      gantryX - span / 2 + 0.3, archHeight, gantryZ - 5.7,
      'GantryLeftOuter'
    );
    this.collisionManager.addBox(
      gantryX + span / 2 - 0.3, 0, gantryZ - 6.3,
      gantryX + span / 2 + 0.3, archHeight, gantryZ - 5.7,
      'GantryRightOuter'
    );

    return gantryGroup;
  }

  /**
   * Creates the outer perimeter walls enclosing the cargo dock.
   * Four long concrete/metal walls at the ±50m boundaries.
   *
   * @returns THREE.Group containing the outer walls
   */
  private createOuterWalls(): THREE.Group {
    const wallGroup = new THREE.Group();
    wallGroup.name = 'OuterWalls';

    const half = 50;
    const wallHeight = 3.5;
    const wallThickness = 0.6;

    const texture = createConcreteTexture();
    texture.repeat.set(40, 2);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.2,
    });

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
      wallGroup.add(mesh);

      this.collisionManager.addBox(
        w.x - w.lenX / 2, 0, w.z - w.lenZ / 2,
        w.x + w.lenX / 2, wallHeight, w.z + w.lenZ / 2,
        `OuterWall_${i}`
      );
    }

    return wallGroup;
  }
}