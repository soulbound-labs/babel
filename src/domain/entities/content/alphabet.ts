/**
 * Alphabet & base-29 codec (spec §4.8). Big-endian, fixed width 80, left-padded
 * with the index-0 glyph (space). Round-trip locked by INV-7.
 */
import { ALPHABET, COLS, RADIX } from './config';
import type { Glyph } from './types';

/** Glyph → its 0..28 alphabet index. Throws on a non-alphabet glyph (E8). */
export function glyphToDigit(g: Glyph): number {
  const d = ALPHABET.indexOf(g);
  if (d < 0) throw new RangeError(`glyphToDigit: ${JSON.stringify(g)} is not in ALPHABET`);
  return d;
}

/** 0..28 index → glyph. Throws out of range. */
export function digitToGlyph(d: number): Glyph {
  if (d < 0 || d >= ALPHABET.length) throw new RangeError(`digitToGlyph: ${d} out of range`);
  return ALPHABET.charAt(d);
}

/** Big-endian base-29 encode of exactly `COLS` glyphs → bigint in [0, M). */
export function base29Encode(glyphs: Glyph[]): bigint {
  if (glyphs.length !== COLS) {
    throw new RangeError(`base29Encode: expected ${COLS} glyphs, got ${glyphs.length}`);
  }
  let x = 0n;
  for (const g of glyphs) {
    x = x * RADIX + BigInt(glyphToDigit(g));
  }
  return x;
}

/** Big-endian base-29 decode → exactly `COLS` glyphs, left-padded with glyph 0. */
export function base29Decode(x: bigint): Glyph[] {
  if (x < 0n) throw new RangeError('base29Decode: negative value');
  const out: Glyph[] = new Array<Glyph>(COLS);
  let v = x;
  for (let i = COLS - 1; i >= 0; i--) {
    out[i] = digitToGlyph(Number(v % RADIX));
    v /= RADIX;
  }
  if (v !== 0n) throw new RangeError(`base29Decode: value exceeds ${COLS} base-29 digits`);
  return out;
}
