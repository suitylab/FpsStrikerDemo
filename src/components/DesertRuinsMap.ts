import * as THREE from 'three';
import CollisionManager from './CollisionManager';
import { createSandTexture, createStoneTexture, createWoodTexture } from '../utils/TextureFactory';

/**
 * DesertRuinsMap constructs the Desert Ruins map for the FPS Strike Survival game.
 *
 * The map is 100x100m (boundary at ±50 on X and Z) with:
 * - Sandy ground with procedural noise texture
 * - Ruined stone walls (half-height, ~1.2m tall) arranged for tactical cover
 * - Broken pillars (cylinders, some tilted) in scattered rows
 * - Rubble piles (irregular boxes) clustered in groups
 * - A collapsed archway for visual richness
 * - Scattered rocks and dry bushes for environmental detail
 *
 * Lighting: harsh bright desert sun, minimal ambient, desert haze fog.
 */
export default class DesertRuinsMap {
  /** Map identifier for map selection. */
  public static readonly MAP_ID = 'desert-ruins';

  /** Display name for the map. */
  public static readonly MAP_NAME = 'DESERT RUINS';

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
   * Builds the entire Desert Ruins map and returns a THREE.Group containing
   * all map meshes. The group should be added to the scene by the caller.
   *
   * @returns THREE.Group containing all map meshes
   */
  public build(): THREE.Group {
    const mapGroup = new THREE.Group();
    mapGroup.name = 'DesertRuinsMap';

    // Build all map components in order (ground first, then props)
    mapGroup.add(this.createGround());
    mapGroup.add(this.createWalls());
    mapGroup.add(this.createPillars());
    mapGroup.add(this.createRubble());
    mapGroup.add(this.createArchway());
        mapGroup.add(this.createRocks());
    mapGroup.add(this.createBushes());

    // Enhanced desert details: abandoned structures & props
    mapGroup.add(this.createAbandonedHouses());
    mapGroup.add(this.createWells());
    mapGroup.add(this.createCacti());
    mapGroup.add(this.createDeadTrees());
    mapGroup.add(this.createTents());
    mapGroup.add(this.createCarWreck());
    mapGroup.add(this.createPottery());
    mapGroup.add(this.createBarbedWire());
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
   * Configures the lighting for the Desert Ruins map.
   * Harsh bright sun, minimal ambient, and desert haze fog.
   *
   * @param scene - The THREE.Scene to configure lighting on
   */
  public configureLighting(scene: THREE.Scene): void {
    // Harsh bright directional sun light
    const directionalLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
    directionalLight.position.set(60, 90, 40);
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

    // Minimal ambient light (harsh desert sun means little fill)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground gradient
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.4);
    scene.add(hemisphereLight);

    // Desert haze fog
    scene.fog = new THREE.Fog(0xd2b48c, 60, 150);
  }

  /**
   * Creates the sandy ground plane.
   * 100x100m at Y=0, repeated 20x20.
   *
   * @returns THREE.Mesh ground plane
   */
  private createGround(): THREE.Mesh {
    const texture = createSandTexture();
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
    ground.name = 'DesertGround';

    return ground;
  }

  /**
   * Creates ruined stone walls arranged in a defensive layout.
   * Walls are half-height (~1.2m tall) boxes scattered around the map center
   * to create tactical cover positions for shooting gameplay.
   *
   * @returns THREE.Group containing all ruined walls
   */
  private createWalls(): THREE.Group {
    const wallsGroup = new THREE.Group();
    wallsGroup.name = 'RuinedWalls';

    const texture = createStoneTexture();
    texture.repeat.set(2, 1);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Wall placement data: [x, z, length, rotationY]
    // Walls arranged in a scattered defensive pattern around map center
    const wallData = [
      // Central cluster (main cover positions)
      { x: -8, z: -5, length: 4, rotationY: 0.2 },
      { x: -3, z: 6, length: 3.5, rotationY: -0.3 },
      { x: 7, z: -8, length: 5, rotationY: 0.5 },
      { x: 12, z: 4, length: 4, rotationY: -0.1 },
      { x: -14, z: 10, length: 3, rotationY: 0.8 },

      // Outer ring (flanking cover)
      { x: -25, z: -20, length: 4, rotationY: 0.4 },
      { x: 20, z: -25, length: 3.5, rotationY: -0.6 },
      { x: 28, z: 15, length: 5, rotationY: 0.3 },
      { x: -30, z: 25, length: 3, rotationY: -0.2 },
      { x: 5, z: 30, length: 4.5, rotationY: 0.7 },

      // Mid-range positions
      { x: -20, z: -5, length: 3, rotationY: 1.2 },
      { x: 18, z: 12, length: 4, rotationY: -0.8 },
      { x: -5, z: -18, length: 3.5, rotationY: 0.1 },
      { x: 25, z: -10, length: 3, rotationY: -0.4 },
      { x: -28, z: 5, length: 4, rotationY: 0.9 },
    ];

    for (const data of wallData) {
      wallsGroup.add(this.createWall(data.x, data.z, data.length, data.rotationY, material));
    }

    return wallsGroup;
  }

  /**
   * Creates a single ruined wall segment.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param length - Wall length along its local X axis
   * @param rotationY - Y rotation in radians
   * @param material - Shared stone material
   * @returns THREE.Mesh containing the wall
   */
  private createWall(
    x: number,
    z: number,
    length: number,
    rotationY: number,
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    const wallHeight = 1.2;
    const wallThickness = 0.5;

    const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, wallHeight / 2, z);
    wall.rotation.y = rotationY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.name = `RuinedWall_${x}_${z}`;

    // Register collider (rotated AABB approximation)
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * (length / 2) + Math.abs(sin) * (wallThickness / 2);
    const rotatedHalfZ = Math.abs(sin) * (length / 2) + Math.abs(cos) * (wallThickness / 2);

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, wallHeight, z + rotatedHalfZ,
      `RuinedWall_${x}_${z}`
    );

    return wall;
  }

  /**
   * Creates broken stone pillars scattered in rows.
   * Some pillars are tilted for a ruined appearance.
   *
   * @returns THREE.Group containing all pillars
   */
  private createPillars(): THREE.Group {
    const pillarsGroup = new THREE.Group();
    pillarsGroup.name = 'BrokenPillars';

    const texture = createStoneTexture();
    texture.repeat.set(1, 2);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Pillar placement data: [x, z, radius, height, tiltX, tiltZ]
    const pillarData = [
      // Row 1 (north)
      { x: -20, z: -30, radius: 0.5, height: 2.5, tiltX: 0, tiltZ: 0 },
      { x: -10, z: -32, radius: 0.4, height: 2.0, tiltX: 0.1, tiltZ: 0 },
      { x: 0, z: -30, radius: 0.6, height: 3.0, tiltX: 0, tiltZ: -0.15 },
      { x: 10, z: -31, radius: 0.45, height: 2.2, tiltX: -0.1, tiltZ: 0 },
      { x: 20, z: -30, radius: 0.55, height: 2.8, tiltX: 0, tiltZ: 0.1 },

      // Row 2 (south)
      { x: -22, z: 28, radius: 0.5, height: 2.5, tiltX: 0.15, tiltZ: 0 },
      { x: -12, z: 30, radius: 0.4, height: 2.0, tiltX: 0, tiltZ: 0.1 },
      { x: -2, z: 29, radius: 0.6, height: 3.0, tiltX: -0.1, tiltZ: 0 },
      { x: 8, z: 31, radius: 0.45, height: 2.2, tiltX: 0, tiltZ: -0.15 },
      { x: 18, z: 28, radius: 0.55, height: 2.8, tiltX: 0.1, tiltZ: 0 },

      // Scattered pillars (mid-map)
      { x: -30, z: -10, radius: 0.5, height: 2.5, tiltX: 0, tiltZ: 0.2 },
      { x: 30, z: 10, radius: 0.45, height: 2.2, tiltX: -0.15, tiltZ: 0 },
      { x: -15, z: 15, radius: 0.55, height: 2.8, tiltX: 0.1, tiltZ: 0 },
      { x: 15, z: -15, radius: 0.4, height: 2.0, tiltX: 0, tiltZ: -0.1 },
      { x: 0, z: 0, radius: 0.6, height: 3.0, tiltX: 0.2, tiltZ: 0.1 },
    ];

    for (const data of pillarData) {
      pillarsGroup.add(this.createPillar(
        data.x, data.z, data.radius, data.height, data.tiltX, data.tiltZ, material
      ));
    }

    return pillarsGroup;
  }

  /**
   * Creates a single broken pillar.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param radius - Pillar radius
   * @param height - Pillar height
   * @param tiltX - X-axis tilt in radians
   * @param tiltZ - Z-axis tilt in radians
   * @param material - Shared stone material
   * @returns THREE.Mesh containing the pillar
   */
  private createPillar(
    x: number,
    z: number,
    radius: number,
    height: number,
    tiltX: number,
    tiltZ: number,
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.9, height, 8);
    const pillar = new THREE.Mesh(geometry, material);
    pillar.position.set(x, height / 2, z);
    pillar.rotation.x = tiltX;
    pillar.rotation.z = tiltZ;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pillar.name = `BrokenPillar_${x}_${z}`;

    // Register collider (approximate box around the cylinder)
    const halfWidth = radius * 1.2;
    this.collisionManager.addBox(
      x - halfWidth, 0, z - halfWidth,
      x + halfWidth, height, z + halfWidth,
      `BrokenPillar_${x}_${z}`
    );

    return pillar;
  }

  /**
   * Creates rubble piles clustered in groups.
   * Irregular boxes of varying sizes for low cover.
   *
   * @returns THREE.Group containing all rubble piles
   */
  private createRubble(): THREE.Group {
    const rubbleGroup = new THREE.Group();
    rubbleGroup.name = 'RubblePiles';

    const texture = createStoneTexture();
    texture.repeat.set(1, 1);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Rubble cluster data: [centerX, centerZ, count]
    const clusterData = [
      { x: -12, z: -12, count: 4 },
      { x: 12, z: 12, count: 5 },
      { x: -25, z: 5, count: 3 },
      { x: 25, z: -5, count: 4 },
      { x: -5, z: 25, count: 3 },
      { x: 5, z: -25, count: 4 },
      { x: -35, z: -25, count: 3 },
      { x: 35, z: 25, count: 3 },
      { x: 0, z: 0, count: 5 },
    ];

    for (const cluster of clusterData) {
      // Create rubble pieces around the cluster center
      for (let i = 0; i < cluster.count; i++) {
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 4;
        const size = 0.5 + Math.random() * 1.0;
        const height = 0.3 + Math.random() * 0.7;
        const rotationY = Math.random() * Math.PI;

        rubbleGroup.add(this.createRubblePiece(
          cluster.x + offsetX,
          cluster.z + offsetZ,
          size,
          height,
          rotationY,
          material
        ));
      }
    }

    return rubbleGroup;
  }

  /**
   * Creates a single rubble pile piece.
   *
   * @param x - Center X position
   * @param z - Center Z position
   * @param size - Base size of the rubble piece
   * @param height - Height of the rubble piece
   * @param rotationY - Y rotation in radians
   * @param material - Shared stone material
   * @returns THREE.Mesh containing the rubble piece
   */
  private createRubblePiece(
    x: number,
    z: number,
    size: number,
    height: number,
    rotationY: number,
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size, height, size * (0.7 + Math.random() * 0.6));
    const rubble = new THREE.Mesh(geometry, material);
    rubble.position.set(x, height / 2, z);
    rubble.rotation.y = rotationY;
    rubble.castShadow = true;
    rubble.receiveShadow = true;
    rubble.name = `Rubble_${x}_${z}`;

    // Register collider (rotated AABB approximation)
    const halfSize = size / 2;
    const halfDepth = size * (0.7 + 0.3) / 2; // Use max possible depth for safety
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const rotatedHalfX = Math.abs(cos) * halfSize + Math.abs(sin) * halfDepth;
    const rotatedHalfZ = Math.abs(sin) * halfSize + Math.abs(cos) * halfDepth;

    this.collisionManager.addBox(
      x - rotatedHalfX, 0, z - rotatedHalfZ,
      x + rotatedHalfX, height, z + rotatedHalfZ,
      `Rubble_${x}_${z}`
    );

    return rubble;
  }

  /**
   * Creates a collapsed archway structure for visual richness.
   * Two vertical pillars with a horizontal lintel on top.
   *
   * @returns THREE.Group containing the archway
   */
  private createArchway(): THREE.Group {
    const archwayGroup = new THREE.Group();
    archwayGroup.name = 'CollapsedArchway';

    const texture = createStoneTexture();
    texture.repeat.set(1, 2);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Archway position (slightly off-center for visual interest)
    const archX = -18;
    const archZ = -18;
    const pillarRadius = 0.5;
    const pillarHeight = 3.5;
    const archWidth = 4.0;
    const lintelHeight = 0.6;

    // Left pillar
    const leftPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius, pillarRadius * 0.9, pillarHeight, 8),
      material
    );
    leftPillar.position.set(archX - archWidth / 2, pillarHeight / 2, archZ);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    leftPillar.name = 'ArchwayLeftPillar';
    archwayGroup.add(leftPillar);

    // Register left pillar collider
    this.collisionManager.addBox(
      archX - archWidth / 2 - pillarRadius, 0, archZ - pillarRadius,
      archX - archWidth / 2 + pillarRadius, pillarHeight, archZ + pillarRadius,
      'ArchwayLeftPillar'
    );

    // Right pillar
    const rightPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius, pillarRadius * 0.9, pillarHeight, 8),
      material
    );
    rightPillar.position.set(archX + archWidth / 2, pillarHeight / 2, archZ);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    rightPillar.name = 'ArchwayRightPillar';
    archwayGroup.add(rightPillar);

    // Register right pillar collider
    this.collisionManager.addBox(
      archX + archWidth / 2 - pillarRadius, 0, archZ - pillarRadius,
      archX + archWidth / 2 + pillarRadius, pillarHeight, archZ + pillarRadius,
      'ArchwayRightPillar'
    );

    // Lintel (horizontal beam on top, slightly tilted for collapsed look)
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(archWidth + 1.0, lintelHeight, 0.8),
      material
    );
    lintel.position.set(archX, pillarHeight - 0.3, archZ);
    lintel.rotation.z = 0.08; // Slight tilt for collapsed appearance
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    lintel.name = 'ArchwayLintel';
    archwayGroup.add(lintel);

    // Register lintel collider
    this.collisionManager.addBox(
      archX - (archWidth + 1.0) / 2, pillarHeight - 0.6, archZ - 0.4,
      archX + (archWidth + 1.0) / 2, pillarHeight + 0.3, archZ + 0.4,
      'ArchwayLintel'
    );

    return archwayGroup;
  }

  /**
   * Creates scattered rocks for environmental detail.
   * Small stones with no collision (visual only).
   *
   * @returns THREE.Group containing all rocks
   */
  private createRocks(): THREE.Group {
    const rocksGroup = new THREE.Group();
    rocksGroup.name = 'ScatteredRocks';

    const texture = createStoneTexture();
    texture.repeat.set(1, 1);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Scatter rocks across the map
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const size = 0.15 + Math.random() * 0.35;
      const height = size * (0.5 + Math.random() * 0.5);

      const geometry = Math.random() > 0.5
        ? new THREE.BoxGeometry(size, height, size)
        : new THREE.SphereGeometry(size * 0.7, 6, 4);

      const rock = new THREE.Mesh(geometry, material);
      rock.position.set(x, height / 2, z);
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      rock.name = `Rock_${i}`;
      rocksGroup.add(rock);
    }

    return rocksGroup;
  }

  /**
   * Creates dry bushes scattered around the map.
   * Small green-brown boxes/spheres (visual only, no collision).
   *
   * @returns THREE.Group containing all bushes
   */
  private createBushes(): THREE.Group {
    const bushesGroup = new THREE.Group();
    bushesGroup.name = 'DryBushes';

    const bushMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b8e23,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Scatter bushes across the map
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 88;
      const z = (Math.random() - 0.5) * 88;
      const size = 0.3 + Math.random() * 0.4;

      const geometry = Math.random() > 0.5
        ? new THREE.BoxGeometry(size, size * 0.6, size)
        : new THREE.SphereGeometry(size * 0.5, 6, 4);

      const bush = new THREE.Mesh(geometry, bushMaterial);
      bush.position.set(x, size * 0.3, z);
      bush.rotation.y = Math.random() * Math.PI;
      bush.castShadow = true;
      bush.name = `DryBush_${i}`;
      bushesGroup.add(bush);
    }

    return bushesGroup;
  }

  // ==========================================================================
  // Enhanced Desert Details (Abandoned Houses & Desert Props)
  // ==========================================================================

  /**
   * Creates abandoned stone/mudbrick houses scattered across the ruins.
   * These half-collapsed huts serve as landmark cover and thematic detail.
   *
   * @returns THREE.Group containing the abandoned houses
   */
  public createAbandonedHouses(): THREE.Group {
    const housesGroup = new THREE.Group();
    housesGroup.name = 'AbandonedHouses';

    // [x, z, width, depth, height, rotationY]
    const hutData = [
      { x: -28, z: -34, width: 5, depth: 4, height: 3.2, rotationY: 0.2 },
      { x: -5, z: -38, width: 4, depth: 5, height: 3.0, rotationY: -0.3 },
      { x: 22, z: -35, width: 5, depth: 4, height: 3.4, rotationY: 0.15 },
      { x: -35, z: 32, width: 4, depth: 5, height: 3.0, rotationY: -0.4 },
      { x: -10, z: 36, width: 5, depth: 4, height: 3.3, rotationY: 0.1 },
      { x: 25, z: 34, width: 5, depth: 5, height: 3.1, rotationY: 0.35 },
      { x: 3, z: 20, width: 4, depth: 4, height: 3.0, rotationY: 0.5 },
      { x: -3, z: -25, width: 5, depth: 4, height: 3.2, rotationY: -0.2 },
    ];

    for (const data of hutData) {
      housesGroup.add(this.createAbandonedHut(
        data.x, data.z, data.width, data.depth, data.height, data.rotationY
      ));
    }

    return housesGroup;
  }

  /**
   * Creates a single abandoned mudbrick/stone house with a collapsed roof
   * opening, wall gaps, and a door opening for tactical cover.
   *
   * @param x - Center X
   * @param z - Center Z
   * @param width - Width (X)
   * @param depth - Depth (Z)
   * @param height - Height (Y)
   * @param rotationY - Y rotation
   * @returns THREE.Group containing the abandoned house
   */
  private createAbandonedHut(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    rotationY: number
  ): THREE.Group {
    const hutGroup = new THREE.Group();
    hutGroup.name = `AbandonedHut_${x}_${z}`;
    hutGroup.position.set(x, 0, z);
    hutGroup.rotation.y = rotationY;

    // Mudbrick / plastered stone material (warm desert tones)
    const wallTex = createSandTexture();
    wallTex.repeat.set(2, 2);
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xc9a86b,
      roughness: 0.95,
      metalness: 0.0,
    });

    const wallThickness = 0.4;

    // Frame of four walls (left/right + back; front is left open as a door)
    // Front wall is omitted to leave an entrance gap.
    const frontZ = depth / 2;
    const backZ = -depth / 2;

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      wallMaterial
    );
    backWall.position.set(0, height / 2, backZ);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    hutGroup.add(backWall);

    // Left wall (with a portion of top collapsed)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height * 0.8, depth),
      wallMaterial
    );
    leftWall.position.set(-width / 2, height * 0.4, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    hutGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height, depth),
      wallMaterial
    );
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    hutGroup.add(rightWall);

    // Front door frame columns (flank the entrance)
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x7a5a34,
      roughness: 0.9,
      metalness: 0.0,
    });
    const frameGeo = new THREE.BoxGeometry(0.35, height, 0.35);
    const frameLeft = new THREE.Mesh(frameGeo, doorFrameMat);
    frameLeft.position.set(-width / 2 + 0.5, height / 2, frontZ);
    frameLeft.castShadow = true;
    hutGroup.add(frameLeft);
    const frameRight = new THREE.Mesh(frameGeo, doorFrameMat);
    frameRight.position.set(width / 2 - 0.5, height / 2, frontZ);
    frameRight.castShadow = true;
    hutGroup.add(frameRight);

    // Collapsed partial roof (tilted slab for the ruined look)
    const roofTex = createStoneTexture();
    roofTex.repeat.set(2, 2);
    const roofMaterial = new THREE.MeshStandardMaterial({
      map: roofTex,
      roughness: 0.9,
      metalness: 0.0,
    });
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.6, 0.25, depth),
      roofMaterial
    );
    roof.position.set(0, height + 0.1, -0.4);
    roof.rotation.x = -0.15; // sagging toward the back
    roof.castShadow = true;
    roof.receiveShadow = true;
    hutGroup.add(roof);

    // A fallen beam across the opening
    const beamTex = createWoodTexture();
    const beamMat = new THREE.MeshStandardMaterial({
      map: beamTex,
      roughness: 0.9,
      metalness: 0.0,
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.25, 0.25), beamMat);
    beam.position.set(0, height * 0.7, frontZ - 0.3);
    beam.rotation.z = 0.2;
    beam.castShadow = true;
    hutGroup.add(beam);

    // Register bounding-box collider around the structure
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const hw = width / 2;
    const hd = depth / 2;
    const rotHalfX = Math.abs(cos) * hw + Math.abs(sin) * hd;
    const rotHalfZ = Math.abs(sin) * hw + Math.abs(cos) * hd;
    // Note: interior is left open by design; collider is the outer footprint.
    this.collisionManager.addBox(
      x - rotHalfX, 0, z - rotHalfZ,
      x + rotHalfX, height + 0.4, z + rotHalfZ,
      `AbandonedHut_${x}_${z}`
    );

    return hutGroup;
  }

  /**
   * Creates desert water wells (rock-ringed with a wooden frame).
   *
   * @returns THREE.Group containing the wells
   */
  public createWells(): THREE.Group {
    const wellsGroup = new THREE.Group();
    wellsGroup.name = 'Wells';

    const wellData = [
      { x: 14, z: 34 },
      { x: -32, z: -18 },
      { x: -8, z: -6 },
    ];

    for (const data of wellData) {
      wellsGroup.add(this.createWell(data.x, data.z));
    }

    return wellsGroup;
  }

  private createWell(x: number, z: number): THREE.Group {
    const wellGroup = new THREE.Group();
    wellGroup.name = `Well_${x}_${z}`;
    wellGroup.position.set(x, 0, z);

    const stoneTex = createStoneTexture();
    stoneTex.repeat.set(1, 1);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Stone ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.1, 0.8, 10),
      stoneMat
    );
    ring.position.y = 0.4;
    ring.castShadow = true;
    ring.receiveShadow = true;
    wellGroup.add(ring);

    // Two wooden posts supporting a crossbar
    const woodTex = createWoodTexture();
    woodTex.repeat.set(1, 1);
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.9,
      metalness: 0.0,
      color: 0x8a6a44,
    });
    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.6, 8);
    const post1 = new THREE.Mesh(postGeo, woodMat);
    post1.position.set(-0.9, 0.8, 0.6);
    wellGroup.add(post1);
    const post2 = new THREE.Mesh(postGeo, woodMat);
    post2.position.set(0.9, 0.8, 0.6);
    wellGroup.add(post2);

    const crossbar = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.12),
      woodMat
    );
    crossbar.position.set(0, 1.6, 0.6);
    wellGroup.add(crossbar);

    // Bucket hanging from the crossbar
    const bucketMat = new THREE.MeshStandardMaterial({
      color: 0x5a6a4a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.3, 8),
      bucketMat
    );
    bucket.position.set(0, 1.0, 0.6);
    wellGroup.add(bucket);

    // Register collider
    this.collisionManager.addBox(
      x - 1.1, 0, z - 1.1,
      x + 1.1, 1.0, z + 1.1,
      `Well_${x}_${z}`
    );

    return wellGroup;
  }

  /**
   * Creates desert cacti as semi-cover and theme detail.
   *
   * @returns THREE.Group containing the cacti
   */
  public createCacti(): THREE.Group {
    const cactiGroup = new THREE.Group();
    cactiGroup.name = 'Cacti';

    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x3a6b2e,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true,
    });

    const data = [
      { x: -25, z: -25, h: 1.6 },
      { x: 22, z: -22, h: 1.3 },
      { x: -30, z: 20, h: 1.5 },
      { x: 30, z: 22, h: 1.7 },
      { x: -2, z: 32, h: 1.4 },
      { x: 2, z: -30, h: 1.2 },
      { x: -15, z: 2, h: 1.5 },
      { x: 13, z: -3, h: 1.3 },
    ];

    for (const d of data) {
      const cactus = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, d.h, 8), cactusMat);
      cactus.position.set(d.x, d.h / 2, d.z);
      cactus.castShadow = true;
      cactus.name = `Cactus_${d.x}_${d.z}`;
      cactiGroup.add(cactus);

      // Two small arms
      const armMat = new THREE.MeshStandardMaterial({
        color: 0x3a6b2e,
        roughness: 0.7,
        metalness: 0.0,
        flatShading: true,
      });
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, d.h * 0.5, 6);
      const arm1 = new THREE.Mesh(armGeo, armMat);
      arm1.position.set(-0.25, d.h * 0.7, 0);
      arm1.rotation.z = 0.5;
      cactus.add(arm1);

      // Cactus has mild collision so players can use as small cover
      this.collisionManager.addBox(
        d.x - 0.3, 0, d.z - 0.3,
        d.x + 0.3, d.h, d.z + 0.3,
        `Cactus_${d.x}_${d.z}`
      );
    }

    return cactiGroup;
  }

  /**
   * Creates dead (dried) trees that fit the desert theme.
   *
   * @returns THREE.Group containing dead trees
   */
  public createDeadTrees(): THREE.Group {
    const treesGroup = new THREE.Group();
    treesGroup.name = 'DeadTrees';

    const woodTex = createWoodTexture();
    woodTex.repeat.set(1, 2);
    const trunkMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x6a5533,
      roughness: 0.9,
      metalness: 0.0,
    });

    const data = [
      { x: -38, z: 8, h: 3.2 },
      { x: 38, z: -8, h: 2.8 },
      { x: 20, z: 18, h: 3.0 },
      { x: -18, z: -22, h: 2.6 },
      { x: 6, z: 6, h: 3.4 },
    ];

    for (const d of data) {
      const tree = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, d.h, 6), trunkMat);
      tree.position.set(d.x, d.h / 2, d.z);
      tree.rotation.z = 0.1;
      tree.rotation.x = 0.08;
      tree.castShadow = true;
      tree.name = `DeadTree_${d.x}_${d.z}`;
      treesGroup.add(tree);

      // Bare branches (thin cylinders, no leaves)
      const branchMat = new THREE.MeshStandardMaterial({
        color: 0x5a4430,
        roughness: 0.9,
        metalness: 0.0,
      });
      // add calls internal in the loop
      const branchCount = 3;
      for (let b = 0; b < branchCount; b++) {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, d.h * 0.4, 5),
          branchMat
        );
        const angle = (b / branchCount) * Math.PI * 2;
        branch.position.set(
          d.x + Math.cos(angle) * 0.4,
          d.h * 0.75,
          d.z + Math.sin(angle) * 0.4
        );
        branch.rotation.z = Math.cos(angle) * 0.7;
        branch.rotation.x = Math.sin(angle) * 0.7 * -1;
        branch.castShadow = true;
        treesGroup.add(branch);
      }

      this.collisionManager.addBox(
        d.x - 0.3, 0, d.z - 0.3,
        d.x + 0.3, d.h, d.z + 0.3,
        `DeadTree_${d.x}_${d.z}`
      );
    }

    return treesGroup;
  }

  /**
   * Creates weathered nomad tents with canvas and poles.
   *
   * @returns THREE.Group containing the tents
   */
  public createTents(): THREE.Group {
    const tentsGroup = new THREE.Group();
    tentsGroup.name = 'Tents';

    const data = [
      { x: -32, z: -35, h: 2.2 },
      { x: 28, z: 36, h: 2.4 },
      { x: -5, z: 15, h: 2.0 },
      { x: 18, z: -32, h: 2.3 },
    ];

    for (const d of data) {
      const tentGroup = new THREE.Group();
      tentGroup.name = `Tent_${d.x}_${d.z}`;
      tentGroup.position.set(d.x, 0, d.z);
      tentGroup.rotation.y = (d.x % 3) * 0.5;

      // Canvas fabric (brown sun-bleached)
      const canvasMat = new THREE.MeshStandardMaterial({
        color: 0xcaa86a,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x8a6a44,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });

      // Pyramid-style canopy (4 slanted triangles approximated by cone)
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, d.h, 4),
        canvasMat
      );
      canopy.position.y = d.h * 0.75;
      canopy.castShadow = true;
      tentGroup.add(canopy);

      // Bottom wall skirt
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.9, 4.4),
        bodyMat
      );
      skirt.position.y = 0.45;
      skirt.castShadow = true;
      tentGroup.add(skirt);

      // Door opening flap (dark)
      const flapMat = new THREE.MeshStandardMaterial({
        color: 0x6a4a2a,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.2, 0.1),
        flapMat
      );
      flap.position.set(0, 0.6, 2.25);
      tentGroup.add(flap);

      tentsGroup.add(tentGroup);

      this.collisionManager.addBox(
        d.x - 2.2, 0, d.z - 2.2,
        d.x + 2.2, d.h * 0.8, d.z + 2.2,
        `Tent_${d.x}_${d.z}`
      );
    }

    return tentsGroup;
  }

  /**
   * Creates an aged 4x4 vehicle wreck as desert detail.
   * Non-functional (body only) with plenty of cover potential.
   *
   * @returns THREE.Group containing the car wreck
   */
  public createCarWreck(): THREE.Group {
    const wreckGroup = new THREE.Group();
    wreckGroup.name = 'CarWreck';
    wreckGroup.position.set(20, 0, -18);
    wreckGroup.rotation.y = -0.6;

    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x8a5a3a,
      roughness: 0.9,
      metalness: 0.3,
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.0, 2.0), rustMat);
    body.position.y = 0.7;
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = 'WreckBody';
    wreckGroup.add(body);

    // Cabin (roofless)
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x6a4a3a,
      roughness: 0.9,
      metalness: 0.3,
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.6), cabMat);
    cabin.position.set(-0.4, 1.25, 0);
    cabin.castShadow = true;
    wreckGroup.add(cabin);

    // Boot / tail cover missing
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x9a6a4a,
      roughness: 0.9,
      metalness: 0.3,
    });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.6), hoodMat);
    hood.position.set(1.8, 1.0, 0);
    hood.rotation.z = 0.15;
    hood.castShadow = true;
    wreckGroup.add(hood);

    // Wheels (4, slightly detached/tilted for wreck look)
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 1.0,
      metalness: 0.0,
    });
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10);
    const wheelPos = [
      [1.7, 0.45, 0.85],
      [-1.6, 0.45, 0.85],
      [1.7, 0.45, -0.85],
      [-1.6, 0.45, -0.85],
    ];
    for (const p of wheelPos) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.rotation.z = 0.4;
      wheel.position.set(p[0], p[1], p[2]);
      wheel.castShadow = true;
      wreckGroup.add(wheel);
    }

    // Register collider
    this.collisionManager.addBox(
      20 - 2.3, 0, -18 - 1.1,
      20 + 2.3, 1.3, -18 + 1.1,
      'CarWreck'
    );

    return wreckGroup;
  }

  /**
   * Creates scattered clay/ceramic pottery and broken fragments.
   *
   * @returns THREE.Group containing the pottery
   */
  public createPottery(): THREE.Group {
    const potteryGroup = new THREE.Group();
    potteryGroup.name = 'Pottery';

    const potMat = new THREE.MeshStandardMaterial({
      color: 0xb08050,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });

    const data = [
      { x: -14, z: 14, s: 0.4 },
      { x: 14, z: -14, s: 0.5 },
      { x: -22, z: -20, s: 0.35 },
      { x: 22, z: 20, s: 0.45 },
      { x: -3, z: -12, s: 0.4 },
      { x: 3, z: -20, s: 0.5 },
      { x: 8, z: 8, s: 0.4 },
      { x: -8, z: 26, s: 0.45 },
    ];

    for (const d of data) {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(d.s * 0.55, d.s * 0.8, d.s * 0.9, 7),
        potMat
      );
      pot.position.set(d.x, d.s * 0.45, d.z);
      pot.rotation.y = Math.random() * Math.PI;
      pot.castShadow = true;
      pot.name = `Pot_${d.x}_${d.z}`;
      potteryGroup.add(pot);

      // Small lip detail
      const lip = new THREE.Mesh(
        new THREE.CylinderGeometry(d.s * 0.6, d.s * 0.6, 0.1, 7),
        potMat
      );
      lip.position.set(d.x, d.s * 0.9, d.z);
      potteryGroup.add(lip);
    }

    return potteryGroup;
  }

  /**
   * Creates a few old rusty metal posts strung with barbed wire.
   *
   * @returns THREE.Group containing barbed wire fence segments
   */
  public createBarbedWire(): THREE.Group {
    const wireGroup = new THREE.Group();
    wireGroup.name = 'BarbedWire';

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.8,
      metalness: 0.6,
    });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
      metalness: 0.6,
    });

    // Fence runs: [start x, start z, length, rotationY]
    const runs = [
      { sx: -30, sz: -32, len: 8, rot: 0.2 },
      { sx: -34, sz: 30, len: 8, rot: 0.3 },
      { sx: 26, sz: -30, len: 7, rot: -0.2 },
    ];

    for (const run of runs) {
      // direction vector
      const dx = Math.cos(run.rot);
      const dz = Math.sin(run.rot);
      const posts = Math.max(2, Math.round(run.len / 2));

      const segmentGroup = new THREE.Group();
      // Two horizontal barbed wires
      for (let w = 0; w < 2; w++) {
        const wireY = 0.6 + w * 0.4;
        const wire = new THREE.Mesh(
          new THREE.BoxGeometry(run.len, 0.03, 0.03),
          wireMat
        );
        wire.position.set(run.sx + (dx * run.len) / 2, wireY, run.sz + (dz * run.len) / 2);
        wire.rotation.y = run.rot;
        wireGroup.add(wire);
      }

      for (let p = 0; p <= posts; p++) {
        const f = p / posts;
        const px = run.sx + dx * run.len * f;
        const pz = run.sz + dz * run.len * f;
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6),
          postMat
        );
        post.position.set(px, 0.65, pz);
        post.rotation.z = 0.1;
        post.castShadow = true;
        wireGroup.add(post);
      }

      // Register fence posts colliders
      for (let p = 0; p <= posts; p++) {
        const dist = p / posts;
        const px = run.sx + dx * run.len * dist;
        const pz = run.sz + dz * run.len * dist;
        this.collisionManager.addBox(
          px - 0.1, 0, pz - 0.1,
          px + 0.1, 1.3, pz + 0.1,
          `BarbedWirePost_${run.sx}_${run.sz}_${p}`
        );
      }
    }

    return wireGroup;
  }

  /**
   * Creates the outer perimeter walls enclosing the desert map.
   * Four long stone walls at the ±50m boundaries.
   *
   * @returns THREE.Group containing the outer walls
   */
  private createOuterWalls(): THREE.Group {
    const wallGroup = new THREE.Group();
    wallGroup.name = 'OuterWalls';

    const half = 50;
    const wallHeight = 3.0;
    const wallThickness = 0.6;

    const texture = createStoneTexture();
    texture.repeat.set(30, 2);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.0,
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