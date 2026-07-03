/**
 * Locomotion step logic (§4.7) — extracted PURE so INV-R5/R6 are
 * node-testable. A walking body, not a flying camera: damped velocity
 * (~10 s⁻¹ time-constant), no sprint, no jump, y locked to EYE_HEIGHT (flat
 * floor — stairs are Unit 04). The controller component owns the camera and
 * calls `stepLocomotion` each frame.
 */
import { ORIGIN } from '../../../domain/entities';
import type { PlayerState } from '../../../domain/ports';
import { resolveMovement } from './collision';
import { EYE_HEIGHT, POSE_PITCH_MAX, WALK_SPEED } from '../room/dimensions';

export type LocomotionInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  /** Mouselook orientation — yaw unbounded, pitch clamped by the step. */
  yaw: number;
  pitch: number;
};

export type LocomotionState = {
  player: PlayerState;
  velocity: { x: number; z: number };
  /** suspend() stops input→movement; the camera is yielded to the caller (Unit 05). */
  suspended: boolean;
};

/** Movement integrates with clamped delta so a stalled tab can't teleport through a wall (E8). */
export const MAX_FRAME_DELTA = 0.1; // seconds
const ACCEL_RATE = 10; // s⁻¹ — accel/decel smoothing time-constant

export function clampPitch(pitch: number): number {
  return Math.min(POSE_PITCH_MAX, Math.max(-POSE_PITCH_MAX, pitch));
}

export function createLocomotionState(pose: {
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
}): LocomotionState {
  return {
    player: {
      coordinate: ORIGIN, // one room, this unit
      localPosition: { x: pose.position.x, y: EYE_HEIGHT, z: pose.position.z },
      yaw: pose.yaw,
      pitch: clampPitch(pose.pitch),
    },
    velocity: { x: 0, z: 0 },
    suspended: false,
  };
}

/**
 * One frame of walking: `(state, input, delta) → state`. Pure — callers keep
 * the returned state. While suspended, input produces no movement and the
 * pose is left exactly where the caller (or resume()) put it.
 */
export function stepLocomotion(
  state: LocomotionState,
  input: LocomotionInput,
  deltaSeconds: number,
): LocomotionState {
  if (state.suspended) return state;
  const dt = Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DELTA);
  const yaw = input.yaw;
  const pitch = clampPitch(input.pitch);

  // Wish velocity in the camera's ground plane (0 yaw faces -z).
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const move = {
    f: (input.forward ? 1 : 0) - (input.back ? 1 : 0),
    r: (input.right ? 1 : 0) - (input.left ? 1 : 0),
  };
  let wishX = fx * move.f + -fz * move.r;
  let wishZ = fz * move.f + fx * move.r;
  const wishLen = Math.hypot(wishX, wishZ);
  if (wishLen > 0) {
    wishX = (wishX / wishLen) * WALK_SPEED;
    wishZ = (wishZ / wishLen) * WALK_SPEED;
  }

  // Damped approach to the wish velocity.
  const alpha = 1 - Math.exp(-ACCEL_RATE * dt);
  const vx = state.velocity.x + (wishX - state.velocity.x) * alpha;
  const vz = state.velocity.z + (wishZ - state.velocity.z) * alpha;

  const from = { ...state.player.localPosition, y: EYE_HEIGHT };
  const to = resolveMovement(from, { x: vx * dt, y: 0, z: vz * dt });

  return {
    player: { coordinate: state.player.coordinate, localPosition: to, yaw, pitch },
    velocity: { x: vx, z: vz },
    suspended: false,
  };
}
