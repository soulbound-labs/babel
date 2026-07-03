/**
 * Pure bigint↔bytes helpers (spec §4.3, §4.7). No Node `Buffer`, no framework —
 * `src/domain/**` must stay import-clean (C1). Only `TextEncoder` (a standard
 * global) and manual byte math.
 */

const encoder = new TextEncoder();

/** UTF-8 encode a string to bytes. */
export function utf8Bytes(s: string): Uint8Array {
  return encoder.encode(s);
}

/**
 * Serialise a non-negative bigint to exactly `len` big-endian bytes.
 * Throws `RangeError` if the value is negative or does not fit (E4 — fixed-width
 * PRF input must be unambiguous forever).
 */
export function toBytesBE(x: bigint, len: number): Uint8Array {
  if (x < 0n) throw new RangeError('toBytesBE: negative value');
  const out = new Uint8Array(len);
  let v = x;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new RangeError(`toBytesBE: value does not fit in ${len} bytes`);
  return out;
}

/** Interpret bytes as a big-endian non-negative bigint. */
export function bytesToBigintBE(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) {
    x = (x << 8n) | BigInt(byte);
  }
  return x;
}
