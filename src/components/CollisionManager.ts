import * as THREE from 'three';

/**
 * Represents an axis-aligned bounding box for collision detection.
 * The Y-axis is used for height but collision checks are performed in the XZ plane.
 */
export interface AABB {
  /** Minimum X coordinate (west edge). */
  minX: number;
  /** Minimum Y coordinate (bottom). */
  minY: number;
  /** Minimum Z coordinate (south edge). */
  minZ: number;
  /** Maximum X coordinate (east edge). */
  maxX: number;
  /** Maximum Y coordinate (top). */
  maxY: number;
  /** Maximum Z coordinate (north edge). */
  maxZ: number;
  /** Optional label for debugging. */
  label?: string;
}

/**
 * CollisionManager handles AABB collision detection and resolution
 * for the player against all static map objects.
 *
 * Uses axis-separated resolution to allow smooth wall sliding:
 * - X-axis movement is resolved first, then Z-axis.
 * - If a collision occurs on one axis, the player is clamped to the
 *   nearest collider edge, allowing movement along the other axis.
 */
export default class CollisionManager {
  /** All registered collidable AABBs. */
  private colliders: AABB[] = [];

  /** Map boundary (invisible walls). Null until set via addBoundary(). */
  private boundary: { minX: number; minZ: number; maxX: number; maxZ: number } | null = null;

  /** Debug wireframe meshes for visualizing colliders. */
  private debugMeshes: THREE.Mesh[] = [];

  /** Whether debug visualization is currently enabled. */
  private debugEnabled = false;

  /** The scene to add debug meshes to. */
  private debugScene: THREE.Scene | null = null;

  /** Default player radius (half-width) in meters. */
  public static readonly DEFAULT_RADIUS = 0.3;

  /**
   * Creates a new CollisionManager with no colliders or boundary.
   */
  constructor() {
    this.colliders = [];
    this.boundary = null;
    this.debugMeshes = [];
  }

  /**
   * Registers a new collidable AABB.
   * If debug mode is enabled, a wireframe box is added to the scene.
   *
   * @param aabb - The AABB to register
   */
  public addCollider(aabb: AABB): void {
    this.colliders.push(aabb);

    // Add debug visualization if enabled
    if (this.debugEnabled && this.debugScene) {
      this.addDebugMesh(aabb);
    }
  }

  /**
   * Convenience method to construct an AABB from min/max coordinates and register it.
   *
   * @param minX - Minimum X coordinate
   * @param minY - Minimum Y coordinate (bottom)
   * @param minZ - Minimum Z coordinate
   * @param maxX - Maximum X coordinate
   * @param maxY - Maximum Y coordinate (top)
   * @param maxZ - Maximum Z coordinate
   * @param label - Optional label for debugging
   */
  public addBox(
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
    label?: string
  ): void {
    this.addCollider({ minX, minY, minZ, maxX, maxY, maxZ, label });
  }

  /**
   * Sets the map boundary (invisible walls).
   * The boundary is stored separately from regular colliders for efficient checks.
   *
   * @param minX - Minimum X coordinate of the play area
   * @param minZ - Minimum Z coordinate of the play area
   * @param maxX - Maximum X coordinate of the play area
   * @param maxZ - Maximum Z coordinate of the play area
   */
  public addBoundary(minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.boundary = { minX, minZ, maxX, maxZ };
  }

  /**
   * Checks if a point (with radius padding) intersects any collider.
   * Used for general queries like spawn validation.
   *
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point (unused in 2D check, kept for API completeness)
   * @param z - Z coordinate of the point
   * @param radius - Radius padding around the point
   * @returns True if the point intersects any collider
   */
  public checkPointCollision(x: number, y: number, z: number, radius: number): boolean {
    const r = Math.max(0, radius);

    for (const collider of this.colliders) {
      if (this.intersects(x - r, z - r, x + r, z + r, collider)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves player movement against all colliders and the map boundary.
   * Uses axis-separated resolution for smooth wall sliding.
   *
   * Colliders are treated as height-aware obstacles: a collider only blocks
   * horizontal movement if its top is above the player's feet + step height.
   * Low obstacles (e.g. curbs, small steps) do NOT block the player, allowing
   * the character to climb small ledges by holding into/hop over them.
   *
   * @param position - Current player position {x, y, z}
   * @param radius - Player radius (half-width) in meters
   * @param deltaX - Desired X-axis movement delta
   * @param deltaZ - Desired Z-axis movement delta
   * @param feetY - Current height of the player's feet (bottom of character)
   * @param stepHeight - Max height the player can step/climb without jumping
   * @returns Resolved position {x, z} after clamping against all colliders
   */
  public resolveMovement(
    position: { x: number; y: number; z: number },
    radius: number,
    deltaX: number,
    deltaZ: number,
    feetY: number = 0,
    stepHeight: number = 0
  ): { x: number; z: number } {
    const r = Math.max(0, radius);
    // A collider that is at or below the player's usable step height is climbable
    // and therefore does not block horizontal motion.
    const climbableTop = feetY + stepHeight;
    let resolvedX = position.x;
    let resolvedZ = position.z;

    // --- X-Axis Movement ---
    const newX = position.x + deltaX;

    // Check collision at (newX, position.z)
    let xCollision = false;
    for (const collider of this.colliders) {
      // Skip obstacles the player can step/climb over (below usable height).
      if (collider.maxY <= climbableTop) continue;

      if (this.intersects(newX - r, position.z - r, newX + r, position.z + r, collider)) {
        xCollision = true;

        // Clamp to nearest edge
        const leftEdge = collider.minX - r;
        const rightEdge = collider.maxX + r;

        // Choose the closer edge relative to the original position
        if (Math.abs(leftEdge - position.x) <= Math.abs(rightEdge - position.x)) {
          resolvedX = leftEdge;
        } else {
          resolvedX = rightEdge;
        }

        break;
      }
    }

    // If no collision, use the new X
    if (!xCollision) {
      resolvedX = newX;
    }

    // --- Z-Axis Movement ---
    const newZ = position.z + deltaZ;

    // Check collision at (resolvedX, newZ)
    let zCollision = false;
    for (const collider of this.colliders) {
      // Skip this collider if the player can step/climb over it.
      if (collider.maxY <= climbableTop) continue;

      if (this.intersects(resolvedX - r, newZ - r, resolvedX + r, newZ + r, collider)) {
        zCollision = true;

        // Clamp to nearest edge
        const nearEdge = collider.minZ - r;
        const farEdge = collider.maxZ + r;

        // Choose the closer edge relative to the original position
        if (Math.abs(nearEdge - position.z) <= Math.abs(farEdge - position.z)) {
          resolvedZ = nearEdge;
        } else {
          resolvedZ = farEdge;
        }

        break;
      }
    }

    // If no collision, use the new Z
    if (!zCollision) {
      resolvedZ = newZ;
    }

    // --- Enforce Map Boundary ---
    if (this.boundary) {
      resolvedX = Math.max(this.boundary.minX + r, Math.min(this.boundary.maxX - r, resolvedX));
      resolvedZ = Math.max(this.boundary.minZ + r, Math.min(this.boundary.maxZ - r, resolvedZ));
    }

    return { x: resolvedX, z: resolvedZ };
  }

  /**
   * Checks if a position is valid (does not intersect any collider and is within boundaries).
   * Used for spawn point validation.
   *
   * @param x - X coordinate to check
   * @param z - Z coordinate to check
   * @param radius - Player radius (half-width) in meters
   * @returns True if the position is valid
   */
  public isPositionValid(x: number, z: number, radius: number): boolean {
    const r = Math.max(0, radius);

    // Check boundary
    if (this.boundary) {
      if (x - r < this.boundary.minX || x + r > this.boundary.maxX) return false;
      if (z - r < this.boundary.minZ || z + r > this.boundary.maxZ) return false;
    }

    // Check colliders
    for (const collider of this.colliders) {
      if (this.intersects(x - r, z - r, x + r, z + r, collider)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Pushes a movable point (e.g. an enemy) out of any overlapping collider.
   *
   * Enemies use this so they cannot walk through walls. Each overlapping
   * collider is resolved by pushing the point out along the axis of least
   * penetration (X or Z), keeping the point's radius clear of the box.
   *
   * @param position - Current position {x, z} to resolve
   * @param radius - Radius of the moving entity (half-width)
   * @returns The resolved position {x, z} after being pushed out of colliders
   */
  public resolvePointCollision(
    position: { x: number; z: number },
    radius: number
  ): { x: number; z: number } {
    const r = Math.max(0, radius);
    let x = position.x;
    let z = position.z;

    for (const collider of this.colliders) {
      // Skip boxes not overlapping the entity's padded footprint.
      if (x - r >= collider.maxX || x + r <= collider.minX) continue;
      if (z - r >= collider.maxZ || z + r <= collider.minZ) continue;

      // Distance to slide out along each axis (to the nearest face). These are
      // always >= 0 when overlapping, whether the center is inside or outside
      // the box. The minimum over the two sides on each axis is the escape
      // translation for that axis.
      const escapeX = Math.min(x + r - collider.minX, collider.maxX - (x - r));
      const escapeZ = Math.min(z + r - collider.minZ, collider.maxZ - (z - r));
      // Guard against tiny floating-point negatives.
      const penX = Math.max(0, escapeX);
      const penZ = Math.max(0, escapeZ);

      // Push out along the axis requiring the smallest translation.
      if (penX < penZ) {
        x += (x + r - collider.minX) < (collider.maxX - (x - r))
          ? -penX
          : penX;
      } else {
        z += (z + r - collider.minZ) < (collider.maxZ - (z - r))
          ? -penZ
          : penZ;
      }
    }

    return { x, z };
  }

  /**
   * Returns the highest standing surface height under the player's footprint.
   *
   * Used to determine the vertical position when landing on elevated platforms
   * (steps, crates, raised docks). Iterates all colliders overlapping the given
   * XZ footprint and returns the highest `maxY` among them that is within the
   * player's reachable max step height. If no reachable surface is found, falls
   * back to the base ground height (0).
   *
   * @param x - X coordinate of the player center
   * @param z - Z coordinate of the player center
   * @param radius - Player radius (half-width) in meters
   * @param maxStep - Maximum climbable height above the base ground (0) to land on
   * @returns The height (Y) the player would stand on, or 0 for base ground
   */
  public getStandingHeight(x: number, z: number, radius: number, maxStep: number): number {
    const r = Math.max(0, radius);
    let standingY = 0;

    for (const collider of this.colliders) {
      // Only surfaces the player can physically reach (within maxStep) count.
      if (collider.maxY > maxStep) continue;

      // Must overlap the player's XZ footprint to be stood on.
      if (!this.intersects(x - r, z - r, x + r, z + r, collider)) continue;

      if (collider.maxY > standingY) {
        standingY = collider.maxY;
      }
    }

    return standingY;
  }

  /**
   * Returns the distance from `origin` along `direction` to the nearest
   * blocking collider, or `null` if no wall is hit.
   *
   * Used to stop bullets/projectiles at walls instead of passing through.
   * Performs a ray vs AABB (slab) test against every registered collider.
   * The boundary is intentionally excluded so bullets fly over the world edges
   * naturally.
   *
   * @param origin - Ray origin (world space)
   * @param direction - Normalized ray direction
   * @param maxDistance - Maximum distance to search (stops the search early)
   * @returns Distance to the nearest wall hit, or null if none within range
   */
  public getWallHitDistance(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number = Infinity
  ): number | null {
    let nearest: number | null = null;

    for (const collider of this.colliders) {
      const dist = this.raycastAABB(origin, direction, collider);
      if (dist !== null && dist <= maxDistance) {
        if (nearest === null || dist < nearest) {
          nearest = dist;
        }
      }
    }

    return nearest;
  }

  /**
   * Ray vs axis-aligned bounding box intersection (slab method).
   *
   * @param origin - Ray origin
   * @param dir - Normalized ray direction
   * @param box - The AABB collider
   * @returns The entry distance along the ray, or null if no intersection
   */
  private raycastAABB(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    box: AABB
  ): number | null {
    let tmin = -Infinity;
    let tmax = Infinity;

    for (let i = 0; i < 3; i++) {
      const axisMin = i === 0 ? box.minX : i === 1 ? box.minY : box.minZ;
      const axisMax = i === 0 ? box.maxX : i === 1 ? box.maxY : box.maxZ;
      const o = i === 0 ? origin.x : i === 1 ? origin.y : origin.z;
      const d = i === 0 ? dir.x : i === 1 ? dir.y : dir.z;

      if (Math.abs(d) < 1e-8) {
        // Ray is parallel to this slab; must lie inside it to hit.
        if (o < axisMin || o > axisMax) return null;
        continue;
      }

      const t1 = (axisMin - o) / d;
      const t2 = (axisMax - o) / d;
      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);

      tmin = Math.max(tmin, tNear);
      tmax = Math.min(tmax, tFar);

      if (tmin > tmax) return null;
    }

    if (tmax < 0) return null; // Box entirely behind the ray origin
    return tmin >= 0 ? tmin : tmax;
  }

  /**
   * Returns the list of all registered colliders.
   *
   * @returns Array of all AABBs
   */
  public getColliders(): AABB[] {
    return this.colliders;
  }

  /**
   * Removes all colliders, the boundary, and debug meshes.
   * Used when rebuilding the map.
   */
  public clear(): void {
    this.colliders = [];
    this.boundary = null;

    // Remove debug meshes from the scene
    if (this.debugScene) {
      for (const mesh of this.debugMeshes) {
        this.debugScene.remove(mesh);
      }
    }
    this.debugMeshes = [];
  }

  /**
   * Enables or disables debug visualization of collision volumes.
   * When enabled, wireframe boxes are created for each collider.
   * When disabled, all debug meshes are removed.
   *
   * @param enabled - Whether debug mode should be on
   * @param scene - The THREE.Scene to add/remove debug meshes from
   */
  public setDebugMode(enabled: boolean, scene: THREE.Scene): void {
    this.debugEnabled = enabled;
    this.debugScene = scene;

    // Remove all existing debug meshes
    for (const mesh of this.debugMeshes) {
      scene.remove(mesh);
    }
    this.debugMeshes = [];

    // Add debug meshes for all current colliders if enabling
    if (enabled) {
      for (const collider of this.colliders) {
        this.addDebugMesh(collider);
      }
    }
  }

  /**
   * Creates a wireframe box mesh for the given AABB and adds it to the scene.
   * The mesh is semi-transparent green wireframe for visibility.
   *
   * @param aabb - The AABB to visualize
   */
  private addDebugMesh(aabb: AABB): void {
    if (!this.debugScene) return;

    const width = aabb.maxX - aabb.minX;
    const height = aabb.maxY - aabb.minY;
    const depth = aabb.maxZ - aabb.minZ;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (aabb.minX + aabb.maxX) / 2,
      (aabb.minY + aabb.maxY) / 2,
      (aabb.minZ + aabb.maxZ) / 2
    );

    this.debugScene.add(mesh);
    this.debugMeshes.push(mesh);
  }

  /**
   * Internal helper: standard 2D AABB overlap test in the XZ plane.
   * Y-axis is ignored since the player is always at eye height and
   * colliders are treated as full-height obstacles.
   *
   * @param playerMinX - Player AABB minimum X
   * @param playerMinZ - Player AABB minimum Z
   * @param playerMaxX - Player AABB maximum X
   * @param playerMaxZ - Player AABB maximum Z
   * @param collider - The collider AABB to test against
   * @returns True if the player AABB overlaps the collider in the XZ plane
   */
  private intersects(
    playerMinX: number,
    playerMinZ: number,
    playerMaxX: number,
    playerMaxZ: number,
    collider: AABB
  ): boolean {
    // Standard AABB overlap test: no separation on either axis means overlap
    return (
      playerMinX < collider.maxX &&
      playerMaxX > collider.minX &&
      playerMinZ < collider.maxZ &&
      playerMaxZ > collider.minZ
    );
  }
}