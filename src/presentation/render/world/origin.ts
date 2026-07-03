/**
 * Floating-origin re-base math (Unit 04 §4.2.1) — pure, framework-free. The
 * local float frame is anchored to the current room; on an ACCEPTED commit the
 * local position shifts by the exact negation of the world shift, so camera
 * and world move by the identical float delta: a screen-space no-op.
 *
 * This module owns the presentation-side `Move → world delta` table (T-8 —
 * the domain's `moveVector` is private; meters and axis orientation are
 * presentation concepts).
 *
 * Commit planes (deterministic, symmetric per portal — T-2):
 *   horizontal — the shared door-threshold plane between room n's vestibule
 *     far door and room n+1's entrance: z = −(HEX_APOTHEM + VESTIBULE_DEPTH)
 *     outbound ('forward'), z = +HEX_APOTHEM inbound ('back').
 *   vertical — feet crossing ±CEILING_HEIGHT/2 relative to the departure
 *     floor, with a ±COMMIT_HYSTERESIS band so hovering on the mid-turn tread
 *     cannot flap the coordinate (each logical crossing emits exactly one move).
 *
 * Refusal latch (T-5 corollary): a REFUSED move (edge of the ±64 region)
 * leaves the frame anchored while the player physically dwells beyond the
 * plane (e.g. the 0.35 m entrance dead-end at n = −64). The tracker latches;
 * the homeward re-crossing clears it WITHOUT emitting — otherwise the return
 * would log a phantom inverse move.
 */
import type { Move } from '../../../domain/entities';
import { CEILING_HEIGHT, HEX_APOTHEM, VESTIBULE_DEPTH } from '../room/dimensions';

/** Center-to-center distance between horizontal neighbors. */
export const ROOM_PITCH = 2 * HEX_APOTHEM + VESTIBULE_DEPTH;
/** Lateral drift per horizontal hop (KDD-1 alcove corollary — far door at x = +0.55). */
export const ROOM_DRIFT_X = 0.55;
/** Vertical commit plane, relative to the departure floor's slab. */
export const VERTICAL_COMMIT_PLANE = CEILING_HEIGHT / 2;
export const COMMIT_HYSTERESIS = 0.2;

/** Outbound horizontal plane: the far-door threshold. */
export const FAR_PLANE_Z = -(HEX_APOTHEM + VESTIBULE_DEPTH);
/** Inbound horizontal plane: the entrance threshold (the SAME shared plane, seen from room n). */
export const ENTRANCE_PLANE_Z = HEX_APOTHEM;

export type LocalShift = { x: number; y: number; z: number };

/** Where the destination room's center sits, relative to the departure room. */
export function worldShift(m: Move): LocalShift {
  switch (m) {
    case 'forward':
      return { x: ROOM_DRIFT_X, y: 0, z: -ROOM_PITCH };
    case 'back':
      return { x: -ROOM_DRIFT_X, y: 0, z: ROOM_PITCH };
    case 'up':
      return { x: 0, y: CEILING_HEIGHT, z: 0 };
    case 'down':
      return { x: 0, y: -CEILING_HEIGHT, z: 0 };
  }
}

/** localPosition shift on accepting `m` — the EXACT negation of the world shift. */
export function commitShift(m: Move): LocalShift {
  const w = worldShift(m);
  return { x: -w.x, y: -w.y, z: -w.z };
}

export type OriginTracker = {
  /** A refused move whose commit plane the player is physically beyond. */
  readonly latched: Move | null;
};

export const INITIAL_TRACKER: OriginTracker = { latched: null };

export type OriginStep = {
  tracker: OriginTracker;
  /** The accepted move to feed `crossThreshold`, or null. */
  commit: Move | null;
};

/** Positions are FEET-space: { x, y: eyeY − EYE_HEIGHT, z } in the local frame. */
function crossingCandidate(prev: LocalShift, next: LocalShift): Move | null {
  if (prev.z >= FAR_PLANE_Z && next.z < FAR_PLANE_Z) return 'forward';
  if (prev.z <= ENTRANCE_PLANE_Z && next.z > ENTRANCE_PLANE_Z) return 'back';
  const upLine = VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS;
  const downLine = -(VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS);
  if (prev.y < upLine && next.y >= upLine) return 'up';
  if (prev.y > downLine && next.y <= downLine) return 'down';
  return null;
}

/** True once the player is back on the home side of the latched plane. */
function returnedHome(latched: Move, next: LocalShift): boolean {
  switch (latched) {
    case 'forward':
      return next.z >= FAR_PLANE_Z;
    case 'back':
      return next.z <= ENTRANCE_PLANE_Z;
    case 'up':
      return next.y < VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS;
    case 'down':
      return next.y > -(VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS);
  }
}

/**
 * One frame of commit detection. `accepts` is the walkability gate
 * (`canMove(coordinate, m)` — T-5: checked BEFORE any apply). At most one
 * commit per frame (MAX_STEP ≪ plane spacing).
 */
export function detectCommit(
  tracker: OriginTracker,
  prev: LocalShift,
  next: LocalShift,
  accepts: (m: Move) => boolean,
): OriginStep {
  if (tracker.latched !== null) {
    // Dwelling beyond a refused plane: no detection until home again.
    return returnedHome(tracker.latched, next)
      ? { tracker: INITIAL_TRACKER, commit: null }
      : { tracker, commit: null };
  }
  const candidate = crossingCandidate(prev, next);
  if (candidate === null) return { tracker, commit: null };
  if (!accepts(candidate)) return { tracker: { latched: candidate }, commit: null };
  return { tracker: INITIAL_TRACKER, commit: candidate };
}
