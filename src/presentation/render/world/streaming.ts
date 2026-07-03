/**
 * Streaming transforms (Unit 04 §4.2.3) — pure: the 11-slot working set
 * (`traversal/working-set.ts`) → local-frame room transforms. The local frame
 * is anchored to the current room; neighbors place at small-delta multiples
 * of the pitch/drift constants (T-6: only |Δ| ≤ 2 deltas ever touch float
 * math — never absolute coordinates). Streaming is a pure synchronous
 * function of the coordinate: no timers, no promises, nothing to pop (KDD-3).
 */
import type { Coordinate } from '../../../domain/entities';
import { WALKABLE_BOUND } from '../../traversal/bounds';
import { liveRooms } from '../../traversal/working-set';
import type { RoomSlot } from '../../traversal/working-set';
import type { RoomCollisionSpec } from '../player/collision';
import { CEILING_HEIGHT } from '../room/dimensions';
import { COMMIT_HYSTERESIS, ROOM_DRIFT_X, ROOM_PITCH, VERTICAL_COMMIT_PLANE } from './origin';

export type LocalPosition = { x: number; y: number; z: number };

export type RoomTransform = {
  slot: RoomSlot;
  /** The room center in the local float frame. */
  position: LocalPosition;
};

/** Local-frame center of a room `dn` hops forward and `dfloor` floors up. */
export function roomPosition(dn: number, dfloor: number): LocalPosition {
  return {
    x: dn * ROOM_DRIFT_X,
    y: dfloor * CEILING_HEIGHT,
    z: dn === 0 ? 0 : -dn * ROOM_PITCH, // avoid -0 at the anchor
  };
}

/** All live rooms' transforms, in working-set order (stable — pool slots map 1:1). */
export function streamTransforms(slots: readonly RoomSlot[]): RoomTransform[] {
  return slots.map((slot) => ({ slot, position: roomPosition(slot.dn, slot.dfloor) }));
}

/**
 * The collision footprint of the live set: the current floor's 5 rooms
 * (vertical neighbors share xz footprints — the y climb is the stair model's
 * job). At floor ±64 the stair is capped just short of the commit band, so a
 * refused vertical move can never be reached on the helix (§4.2.5).
 */
export function liveCollisionSpecs(c: Coordinate): RoomCollisionSpec[] {
  const capMax =
    c.floor === WALKABLE_BOUND ? VERTICAL_COMMIT_PLANE - COMMIT_HYSTERESIS / 2 : undefined;
  const capMin =
    c.floor === -WALKABLE_BOUND ? -(VERTICAL_COMMIT_PLANE - COMMIT_HYSTERESIS / 2) : undefined;
  return liveRooms(c)
    .filter((s) => s.dfloor === 0)
    .map((s) => {
      const pos = roomPosition(s.dn, 0);
      return {
        offset: { x: pos.x, z: pos.z },
        entranceOpen: s.coordinate.n > -WALKABLE_BOUND,
        stairMinFeetY: capMin,
        stairMaxFeetY: capMax,
      };
    });
}
