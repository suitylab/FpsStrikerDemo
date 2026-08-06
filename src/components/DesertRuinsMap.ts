import * as THREE from 'three';
import CollisionManager from './CollisionManager';
import { createSandTexture, createStoneTexture } from '../utils/TextureFactory';

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
}