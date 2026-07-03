/**
 * Line-index codec (spec §4.6). Packs a LineAddress into a global line index and
 * back. Forward guards against unaddressable coordinates (E7); inverse returns
 * null for the sub-room remainder (E2).
 */
import { LINES, LINES_PER_ROOM, PAGES, ROOM_MAX, SHELVES, VOLUMES, WALLS } from './config';
import { pair, unpair } from './pairing';
import type { LineAddress } from './types';

function assertField(name: string, v: number, max: number): void {
  if (!Number.isInteger(v) || v < 0 || v >= max) {
    throw new RangeError(`encodeLineIndex: ${name}=${v} out of range [0, ${max})`);
  }
}

/** LineAddress → global line index ∈ [0, M). Throws on invalid/unaddressable input. */
export function encodeLineIndex(a: LineAddress): bigint {
  assertField('wall', a.wall, WALLS);
  assertField('shelf', a.shelf, SHELVES);
  assertField('volume', a.volume, VOLUMES);
  assertField('page', a.page, PAGES);
  assertField('line', a.line, LINES);

  const intra =
    (((a.wall * SHELVES + a.shelf) * VOLUMES + a.volume) * PAGES + a.page) * LINES + a.line;
  const room = pair(a.n, a.floor);
  if (room >= ROOM_MAX) {
    throw new RangeError('encodeLineIndex: coordinate is unaddressable (room ≥ ROOM_MAX)'); // E7
  }
  return room * LINES_PER_ROOM + BigInt(intra);
}

/** Global line index → LineAddress, or null if it falls in the unaddressable remainder (E2). */
export function decodeLineIndex(x: bigint): LineAddress | null {
  const room = x / LINES_PER_ROOM;
  if (room >= ROOM_MAX) return null;

  let intra = Number(x % LINES_PER_ROOM);
  const line = intra % LINES;
  intra = Math.floor(intra / LINES);
  const page = intra % PAGES;
  intra = Math.floor(intra / PAGES);
  const volume = intra % VOLUMES;
  intra = Math.floor(intra / VOLUMES);
  const shelf = intra % SHELVES;
  intra = Math.floor(intra / SHELVES);
  const wall = intra; // 0..3

  const { n, floor } = unpair(room);
  return { n, floor, wall, shelf, volume, page, line };
}
