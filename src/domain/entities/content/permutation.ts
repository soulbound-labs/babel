/**
 * Keyed balanced Feistel permutation over [0, M) = [0, H²) (spec §4.7).
 * A clean bijection because M = H² is a perfect square (no cycle-walking).
 * `roundKey(i)` depends ONLY on BABEL_KEY + round index — never on the room, so
 * the permutation stays globally invertible (§7.1). Bijectivity locked by INV-8.
 */
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { bytesToBigintBE, toBytesBE, utf8Bytes } from './bytes';
import { BABEL_KEY, FEISTEL_ROUNDS, H, R_BYTES } from './config';

/** Per-round key derived from the genesis key alone (the fixed, room-independent seam). */
export function roundKey(i: number): Uint8Array {
  return hmac(sha256, BABEL_KEY, utf8Bytes(`round:${i}`));
}

/** Round function: HMAC(roundKey(i), be25(R)) as a 256-bit big-endian int, mod H. */
export function F(i: number, R: bigint): bigint {
  const digest = hmac(sha256, roundKey(i), toBytesBE(R, R_BYTES));
  return bytesToBigintBE(digest) % H;
}

export function feistel(x: bigint): bigint {
  let L = x / H;
  let R = x % H;
  for (let i = 0; i < FEISTEL_ROUNDS; i++) {
    const nextR = (L + F(i, R)) % H;
    L = R;
    R = nextR;
  }
  return L * H + R;
}

export function feistelInverse(y: bigint): bigint {
  let L = y / H;
  let R = y % H;
  for (let i = FEISTEL_ROUNDS - 1; i >= 0; i--) {
    const prevL = (((R - F(i, L)) % H) + H) % H;
    R = L;
    L = prevL;
  }
  return L * H + R;
}
