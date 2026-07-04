/**
 * Locomotion step logic (§4.7, Unit 04 §4.2.2) — extracted PURE so INV-R5/R6
 * are node-testable. A walking body, not a flying camera: damped velocity
 * (~10 s⁻¹ time-constant), no sprint, no jump. Unit 04 adds the surface mode:
 * on flat floor, eye height locks to the room slab; on the stair, y follows
 * the tread-top helix (`stair.ts`) — you WALK up stairs, no "go up" button.
 * The controller component owns the camera and calls `stepLocomotion` each
 * frame. Coordinate commits are the traversal machine's job (§4.2.1), wired
 * in the controller — this module never constructs or mutates a Coordinate (T-1).
 */
import { ORIGIN } from '../../../domain/entities';
import type { Coordinate } from '../../../domain/entities';
import type { PlayerState } from '../../../domain/ports';
import { ORIGIN_ROOM_CONTEXT, MAX_STEP, resolveMovement } from './collision';
import type { CollisionContext } from './collision';
import { surfaceAt } from './stair';
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

export type SurfaceMode = 'floor' | 'stair';

export type LocomotionState = {
  player: PlayerState;
  velocity: { x: number; z: number };
  /** What the player is standing on — footstep classification + y model. */
  surface: SurfaceMode;
  /** suspend() stops input→movement; the camera is yielded to the caller (Unit 05). */
  suspended: boolean;
};

/** Movement integrates with clamped delta so a stalled tab can't teleport through a wall (E8). */
export const MAX_FRAME_DELTA = 0.1; // seconds
const ACCEL_RATE = 10; // s⁻¹ — accel/decel smoothing time-constant

export function clampPitch(pitch: number): number {
  return Math.min(POSE_PITCH_MAX, Math.max(-POSE_PITCH_MAX, pitch));
}

export function createLocomotionState(
  pose: {
    position: { x: number; y: number; z: number };
    yaw: number;
    pitch: number;
  },
  coordinate: Coordinate = ORIGIN,
): LocomotionState {
  return {
    player: {
      coordinate, // the traversal machine moves this on commit (§4.2.1); teleport poses seed it
      localPosition: { x: pose.position.x, y: pose.position.y, z: pose.position.z },
      yaw: pose.yaw,
      pitch: clampPitch(pose.pitch),
    },
    velocity: { x: 0, z: 0 },
    surface: 'floor',
    suspended: false,
  };
}

/**
 * One frame of walking: `(state, input, delta) → state`. Pure — callers keep
 * the returned state. While suspended, input produces no movement and the
 * pose is left exactly where the caller (or resume()) put it. The optional
 * collision context carries the live rooms' cells + stair sites (Phase 3);
 * the default is the single origin room.
 */
export function stepLocomotion(
  state: LocomotionState,
  input: LocomotionInput,
  deltaSeconds: number,
  ctx: CollisionContext = ORIGIN_ROOM_CONTEXT,
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

  const from = state.player.localPosition;
  const feetFrom = from.y - EYE_HEIGHT;
  const to = resolveMovement(from, { x: vx * dt, y: 0, z: vz * dt }, ctx);

  // Surface model: tread top on the stair, slab elsewhere; reject a step the
  // legs can't make (tread rise 0.167 < MAX_STEP resolves everything on the
  // helix — this guard only fires on a would-be cliff).
  const sample = surfaceAt(to.x, to.z, feetFrom, ctx.stairs);
  if (sample.capped === true || Math.abs(sample.y - feetFrom) > MAX_STEP) {
    return {
      player: { coordinate: state.player.coordinate, localPosition: from, yaw, pitch },
      velocity: { x: 0, z: 0 },
      surface: state.surface,
      suspended: false,
    };
  }

  return {
    player: {
      coordinate: state.player.coordinate,
      localPosition: { x: to.x, y: sample.y + EYE_HEIGHT, z: to.z },
      yaw,
      pitch,
    },
    velocity: { x: vx, z: vz },
    surface: sample.surface,
    suspended: false,
  };
}
