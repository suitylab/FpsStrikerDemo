/**
 * Represents the player's position and orientation in the game world.
 */
export interface PlayerState {
  /** World position in meters. */
  position: { x: number; y: number; z: number };
  /** Horizontal rotation in radians. */
  yaw: number;
  /** Vertical rotation in radians (clamped to ±89 degrees). */
  pitch: number;
  /** Current velocity vector. */
  velocity: { x: number; y: number; z: number };
  /** Movement speed in m/s (default 5). */
  speed: number;
  /** Camera height above ground (default 1.7). */
  eyeHeight: number;
}

/**
 * Tracks the current keyboard/mouse input state.
 */
export interface InputState {
  /** Map of key code to pressed state (e.g. 'KeyW': true). */
  keys: Record<string, boolean>;
  /** Accumulated mouse X movement since last frame. */
  mouseDeltaX: number;
  /** Accumulated mouse Y movement since last frame. */
  mouseDeltaY: number;
  /** Whether pointer lock is currently active. */
  isPointerLocked: boolean;
    /** Mouse look sensitivity (default 0.002). */
  sensitivity: number;
  /** Accumulated scroll wheel movement (positive = scroll up/next, negative = scroll down/previous). */
  wheelDelta: number;
}

/**
 * Tracks overall game state.
 */
export interface GameState {
  /** Whether the game loop is running. */
  isRunning: boolean;
  /** Total elapsed time in seconds. */
  elapsedTime: number;
  /** Total frames rendered. */
  frameCount: number;
  /** Current frames per second (smoothed). */
  fps: number;
  /** Timestamp of the last frame (ms). */
  lastTime: number;
}