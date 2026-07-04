/**
 * Book address resolution (§4.2, KDD-2) — pure, no R3F. The click pipeline is
 * `raycast → instanceId → slotToBook(instanceId)` (frozen `instancing.ts`),
 * combined with the room's live traversal `Coordinate` — NEVER reconstructed
 * from a mesh's float world-position. Only the current room's book mesh (the
 * `userData` offset `(0,0)`) resolves; a neighbor's book seen through a
 * doorway returns `null` (KDD-2, FMEA #6).
 */
import type { Coordinate, LineAddress } from '../../../domain/entities';
import { PAGE_LINES } from '../room/dimensions';
import { slotToBook } from '../room/instancing';

/** Room offset of the mesh the ray hit, from its group `userData` (Unit 04 seam). */
export type RoomOffset = { dn: number; dfloor: number };

/** A book page — everything but the line index (§4.1). */
export type PageAddress = Omit<LineAddress, 'line'>;

/**
 * The clicked book's address, or `null` for any non-current-room hit.
 * `(n, floor)` pass through as `bigint` end-to-end; `slotToBook` throws on an
 * out-of-range instanceId (validate at this seam, never in `useFrame`).
 */
export function resolveBookAddress(
  coordinate: Coordinate,
  hitOffset: RoomOffset,
  instanceId: number,
): LineAddress | null {
  if (hitOffset.dn !== 0 || hitOffset.dfloor !== 0) return null;
  const { wall, shelf, volume } = slotToBook(instanceId);
  return { n: coordinate.n, floor: coordinate.floor, wall, shelf, volume, page: 0, line: 0 };
}

/** The 40 line addresses of one page — `line 0..39`, the given `page` fixed. */
export function pageAddresses(base: PageAddress, page: number): LineAddress[] {
  return Array.from({ length: PAGE_LINES }, (_, line) => ({
    n: base.n,
    floor: base.floor,
    wall: base.wall,
    shelf: base.shelf,
    volume: base.volume,
    page,
    line,
  }));
}
