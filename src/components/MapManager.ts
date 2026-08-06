import * as THREE from 'three';
import CollisionManager from './CollisionManager';
import TownStreetMap from './TownStreetMap';
import DesertRuinsMap from './DesertRuinsMap';
import CargoDockMap from './CargoDockMap';

/**
 * Represents a map definition in the registry.
 * The builder class must have a constructor taking CollisionManager,
 * a build() method returning THREE.Group, and a configureLighting(scene) method.
 */
export interface MapDefinition {
  /** Unique identifier for the map (e.g., 'town-street'). */
  id: string;
  /** Display name shown in the UI (e.g., 'TOWN STREET'). */
  name: string;
  /** Short description of the map for the selection screen. */
  description: string;
  /** Builder class reference for constructing the map. */
  builder: new (collisionManager: CollisionManager) => {
    build(): THREE.Group;
    configureLighting(scene: THREE.Scene): void;
  };
}

/**
 * MapManager manages the map registry and dispatches map construction.
 *
 * It maintains a registry of all available maps, handles building a map
 * into the scene, and cleans up the previous map when switching.
 */
export default class MapManager {
  /** Registry of all registered maps keyed by id. */
  private registry: Map<string, MapDefinition> = new Map();

  /** The currently built map group in the scene (null if none built yet). */
  private currentMapGroup: THREE.Group | null = null;

  /**
   * Creates a new MapManager and registers all default maps.
   */
  constructor() {
    // Register Town Street
    this.registerMap({
      id: 'town-street',
      name: 'TOWN STREET',
      description: 'Urban street with buildings and cars',
      builder: TownStreetMap,
    });

    // Register Desert Ruins
    this.registerMap({
      id: 'desert-ruins',
      name: 'DESERT RUINS',
      description: 'Open sandy terrain with ruined walls and pillars',
      builder: DesertRuinsMap,
    });

    // Register Cargo Dock
    this.registerMap({
      id: 'cargo-dock',
      name: 'CARGO DOCK',
      description: 'Industrial dock with shipping containers and cranes',
      builder: CargoDockMap,
    });
  }

  /**
   * Registers a new map definition in the registry.
   *
   * @param mapDef - The map definition to register
   */
  public registerMap(mapDef: MapDefinition): void {
    this.registry.set(mapDef.id, mapDef);
  }

  /**
   * Returns all registered map definitions as an array.
   *
   * @returns Array of all registered map definitions
   */
  public getMapList(): MapDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Returns a specific map definition by id.
   *
   * @param id - The map id to look up
   * @returns The map definition, or undefined if not found
   */
  public getMap(id: string): MapDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Builds a map by id and adds it to the scene.
   *
   * If a previous map exists in the scene, it is removed and disposed first.
   * The collision manager is cleared before building the new map.
   *
   * @param mapId - The id of the map to build
   * @param scene - The THREE.Scene to add the map to
   * @param collisionManager - The CollisionManager to register colliders with
   * @returns The built map group, or null if the map id is not found
   */
  public buildMap(
    mapId: string,
    scene: THREE.Scene,
    collisionManager: CollisionManager
  ): THREE.Group | null {
    // Look up the map definition
    const mapDef = this.registry.get(mapId);
    if (!mapDef) {
      console.warn(`MapManager: Map with id '${mapId}' not found in registry.`);
      return null;
    }

    // Clear the collision manager (removes old colliders and boundary)
    collisionManager.clear();

    // Remove and dispose the previous map group if it exists
    if (this.currentMapGroup) {
      scene.remove(this.currentMapGroup);
      this.disposeGroup(this.currentMapGroup);
      this.currentMapGroup = null;
    }

    // Create a new instance of the map builder
    const builder = new mapDef.builder(collisionManager);

    // Build the map group
    const mapGroup = builder.build();

    // Configure map-specific lighting
    builder.configureLighting(scene);

    // Store the current map group reference
    this.currentMapGroup = mapGroup;

    return mapGroup;
  }

  /**
   * Returns the default map id.
   *
   * @returns The default map id ('town-street')
   */
  public static getDefaultMapId(): string {
    return 'town-street';
  }

  /**
   * Recursively disposes all geometries and materials in a THREE.Group.
   * Used to free GPU resources when removing a map from the scene.
   *
   * @param group - The THREE.Group to dispose
   */
  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Dispose geometry
        child.geometry.dispose();

        // Dispose material(s)
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else if (material) {
          material.dispose();
        }
      }
    });
  }
}