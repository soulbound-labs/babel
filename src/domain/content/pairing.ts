/**
 * Origin-centred Ulam-shell pairing ℤ²↔ℕ (spec §4.5). Ring k = Chebyshev
 * distance max(|n|,|floor|) holds 8k cells (k≥1); ring 0 is the origin.
 * Small indices = rooms near the origin. Bijectivity locked by INV-5 / INV-6.
 */
import type { Coordinate } from '../coordinates/types';

/** Floor integer square root: the unique r with r² ≤ v < (r+1)². */
export function isqrt(v: bigint): bigint {
  if (v < 0n) throw new RangeError('isqrt of negative value');
  if (v < 2n) return v;
  let x = v;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + v / x) >> 1n;
  }
  return x;
}

/** Count of all cells in rings 0..k-1 = 1 + 4k(k-1) = (2k-1)². */
function start(k: bigint): bigint {
  return 1n + 4n * k * (k - 1n);
}

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

/** ℤ² room coordinate → ℕ room index. */
export function pair(n: bigint, floor: bigint): bigint {
  if (n === 0n && floor === 0n) return 0n;
  const an = abs(n);
  const af = abs(floor);
  const k = an > af ? an : af;

  let o: bigint;
  if (n === k && floor >= -k && floor <= k - 1n) {
    o = floor + k; // edge 0: right column
  } else if (floor === k && n >= -k + 1n && n <= k) {
    o = 2n * k + (k - n); // edge 1: top row
  } else if (n === -k && floor >= -k + 1n && floor <= k) {
    o = 4n * k + (k - floor); // edge 2: left column
  } else {
    // edge 3: bottom row — floor === -k && n ∈ [-k, k-1]
    o = 6n * k + (n + k);
  }
  return start(k) + o;
}

/** ℕ room index → ℤ² room coordinate. */
export function unpair(room: bigint): Coordinate {
  if (room === 0n) return { n: 0n, floor: 0n };
  const s = isqrt(room);
  const k = (s + 1n) / 2n;
  const o = room - start(k);
  const twoK = 2n * k;

  if (o < twoK) {
    return { n: k, floor: o - k }; // edge 0
  } else if (o < 4n * k) {
    return { n: k - (o - twoK), floor: k }; // edge 1
  } else if (o < 6n * k) {
    return { n: -k, floor: k - (o - 4n * k) }; // edge 2
  }
  return { n: -k + (o - 6n * k), floor: -k }; // edge 3
}
