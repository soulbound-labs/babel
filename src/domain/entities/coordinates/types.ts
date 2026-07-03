/**
 * Coordinate algebra types (spec §4.1). A room address is a point on the ℤ²
 * lattice; coordinates are `bigint` because the addressable space runs far past
 * `Number.MAX_SAFE_INTEGER` (§3 C2, §7.3).
 */

/** ℤ² lattice room address. */
export type Coordinate = { n: bigint; floor: bigint };

/** MVP move set: linear chain (forward/back) + stairs (up/down). */
export type Move = 'forward' | 'back' | 'up' | 'down';

/** The origin room. */
export const ORIGIN: Coordinate = { n: 0n, floor: 0n };
