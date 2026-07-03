/**
 * The 11-room working set (spec §4.1, KDD-3) — a constant-shape, pure function
 * of the player coordinate: current floor n ∈ [p−2, p+2] (5 rooms) + floors ±1
 * with n ∈ [p−1, p+1] (3 each). Adjacent floors are unconditionally live so no
 * mid-climb load trigger exists. Slots outside ±64 are simply absent (edge).
 *
 * Keys use the frozen `${n}:${floor}` serialization (T-7 — the hash preimage
 * format; never JSON.stringify, never Number keys). Deltas are the only
 * `number`s here — |Δ| ≤ 2 by construction (T-6: never convert an absolute
 * coordinate).
 */
import type { Coordinate } from '../../domain/entities';
import { isWithinBounds } from './bounds';

export type RoomSlot = {
  coordinate: Coordinate;
  key: string;
  /** Small relative deltas from the player's room — |dn| ≤ 2, |dfloor| ≤ 1. */
  dn: number;
  dfloor: number;
};

export function roomKey(c: Coordinate): string {
  return `${c.n}:${c.floor}`;
}

/** Shape: [dfloor, dn-reach] — 5 on the current floor, 3 on each of floors ±1. */
const SET_SHAPE: readonly { dfloor: number; reach: number }[] = [
  { dfloor: -1, reach: 1 },
  { dfloor: 0, reach: 2 },
  { dfloor: 1, reach: 1 },
];

export function liveRooms(c: Coordinate): RoomSlot[] {
  const slots: RoomSlot[] = [];
  for (const { dfloor, reach } of SET_SHAPE) {
    for (let dn = -reach; dn <= reach; dn++) {
      const coordinate: Coordinate = {
        n: c.n + BigInt(dn),
        floor: c.floor + BigInt(dfloor),
      };
      if (!isWithinBounds(coordinate)) continue; // edge rooms simply absent
      slots.push({ coordinate, key: roomKey(coordinate), dn, dfloor });
    }
  }
  return slots;
}
