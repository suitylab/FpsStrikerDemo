import * as THREE from 'three';
import CollisionManager from './CollisionManager';
import { createConcreteTexture, createContainerTexture, createCorrugatedMetalTexture, createWoodTexture, createMetalTexture } from '../utils/TextureFactory';

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
}