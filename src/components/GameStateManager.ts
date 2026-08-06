/**
 * GameStateManager — Game State Machine (Phase 10)
 *
 * Manages the high-level game flow state machine:
 *   MAIN_MENU → MAP_SELECT → PLAYING ⇄ PAUSED
 *                    ↓              ↓
 *                 GAME_OVER ←───────┘
 *
 * Provides:
 * - State tracking with legal transition validation
 * - Transition methods for each state change
 * - State change callback subscription (with unsubscribe)
 * - Current map id tracking
 * - Reset method to return to MAIN_MENU
 */

/** Game state machine states. */
export enum GameState {
  /** Main menu screen (title, START MISSION, CONTROLS, QUIT). */
  MAIN_MENU = 'MAIN_MENU',
  /** Map selection screen (3 map buttons). */
  MAP_SELECT = 'MAP_SELECT',
  /** Active gameplay (combat, waves, movement). */
  PLAYING = 'PLAYING',
  /** Paused overlay (RESUME, RESTART, MAIN MENU). */
  PAUSED = 'PAUSED',
  /** Game over screen (WAVES SURVIVED, TOTAL KILLS, RESTART, MAIN MENU). */
  GAME_OVER = 'GAME_OVER',
}

/** Callback signature for state change notifications. */
export type GameStateChangeCallback = (
  newState: GameState,
  previousState: GameState
) => void;

/** Valid map identifiers. */
export type MapId = 'town-street' | 'desert-ruins' | 'cargo-dock';

export default class GameStateManager {
  /** Current game state. */
  private currentState: GameState = GameState.MAIN_MENU;

  /** Currently selected map id (null before map selection). */
  private currentMapId: MapId | null = null;

  /** Registered state change callbacks. */
  private callbacks: Set<GameStateChangeCallback> = new Set();

  /**
   * Returns the current game state.
   *
   * @returns Current GameState value
   */
  public getState(): GameState {
    return this.currentState;
  }

  /**
   * Returns the currently selected map id.
   *
   * @returns Map id string, or null if no map selected
   */
  public getMapId(): MapId | null {
    return this.currentMapId;
  }

  /**
   * Sets the current map id.
   * Validates that the map id is one of the known map identifiers.
   *
   * @param mapId - The map id to set (e.g., 'town-street')
   * @returns True if the map id was valid and set, false otherwise
   */
  public setMapId(mapId: MapId | null): boolean {
    // Allow null (clearing the selection)
    if (mapId === null) {
      this.currentMapId = null;
      return true;
    }

    // Validate against known map ids
    const validMapIds: MapId[] = ['town-street', 'desert-ruins', 'cargo-dock'];
    if (!validMapIds.includes(mapId)) {
      console.warn(`GameStateManager: Invalid map id '${mapId}'. Map id not set.`);
      return false;
    }

    this.currentMapId = mapId;
    return true;
  }

  /**
   * Registers a callback to be invoked on every state change.
   * The callback receives the new state and the previous state.
   *
   * @param callback - Function to call on state change
   * @returns An unsubscribe function to remove the callback
   */
  public onStateChange(callback: GameStateChangeCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Transitions to the MAIN_MENU state.
   * Legal from: MAP_SELECT, PAUSED, GAME_OVER
   * No-op if already in MAIN_MENU.
   */
  public toMainMenu(): void {
    this.transitionTo(GameState.MAIN_MENU);
  }

  /**
   * Transitions to the MAP_SELECT state.
   * Legal from: MAIN_MENU, PAUSED, GAME_OVER
   * No-op if already in MAP_SELECT.
   */
  public toMapSelect(): void {
    this.transitionTo(GameState.MAP_SELECT);
  }

  /**
   * Transitions to the PLAYING state.
   * Legal from: MAP_SELECT, PAUSED
   * No-op if already in PLAYING.
   */
  public toPlaying(): void {
    this.transitionTo(GameState.PLAYING);
  }

  /**
   * Transitions to the PAUSED state.
   * Legal only from: PLAYING
   * No-op if not currently PLAYING.
   */
  public toPause(): void {
    this.transitionTo(GameState.PAUSED);
  }

  /**
   * Resumes gameplay from the PAUSED state.
   * Legal only from: PAUSED
   * No-op if not currently PAUSED.
   */
  public toResume(): void {
    this.transitionTo(GameState.PLAYING);
  }

  /**
   * Transitions to the GAME_OVER state.
   * Legal only from: PLAYING
   * No-op if not currently PLAYING.
   */
  public toGameOver(): void {
    this.transitionTo(GameState.GAME_OVER);
  }

  /**
   * Resets the game state machine to its initial state.
   * Returns to MAIN_MENU and clears the selected map id.
   * Fires state change callbacks if the state actually changes.
   */
  public reset(): void {
    // Clear map id
    this.currentMapId = null;

    // Return to main menu
    this.transitionTo(GameState.MAIN_MENU);
  }

  /**
   * Checks whether a state transition is legal.
   *
   * @param from - The current state
   * @param to - The target state
   * @returns True if the transition is legal, false otherwise
   */
  private isLegalTransition(from: GameState, to: GameState): boolean {
    switch (from) {
      case GameState.MAIN_MENU:
        return to === GameState.MAP_SELECT;

      case GameState.MAP_SELECT:
        return to === GameState.PLAYING || to === GameState.MAIN_MENU;

      case GameState.PLAYING:
        return to === GameState.PAUSED || to === GameState.GAME_OVER;

      case GameState.PAUSED:
        return to === GameState.PLAYING || to === GameState.MAIN_MENU || to === GameState.MAP_SELECT;

            case GameState.GAME_OVER:
        return to === GameState.MAIN_MENU || to === GameState.MAP_SELECT || to === GameState.PLAYING;

      default:
        return false;
    }
  }

  /**
   * Core transition method: validates, updates state, and fires callbacks.
   *
   * @param newState - The target state to transition to
   */
  private transitionTo(newState: GameState): void {
    // No-op if already in the target state
    if (this.currentState === newState) {
      return;
    }

    // Validate the transition
    if (!this.isLegalTransition(this.currentState, newState)) {
      console.warn(
        `GameStateManager: Illegal state transition from '${this.currentState}' to '${newState}'. Transition ignored.`
      );
      return;
    }

    // Capture previous state
    const previousState = this.currentState;

    // Update state
    this.currentState = newState;

    // Fire callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(newState, previousState);
      } catch (error) {
        console.error('GameStateManager: Error in state change callback:', error);
      }
    });
  }
}