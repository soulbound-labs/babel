import { describe, expect, it } from 'vitest';

import {
  base29Decode,
  base29Encode,
  digitToGlyph,
  glyphToDigit,
} from '@/domain/entities/content/alphabet';
import { bytesToBigintBE, toBytesBE } from '@/domain/entities/content/bytes';
import { decodeLineIndex, encodeLineIndex } from '@/domain/entities/content/codec';
import { LINES_PER_ROOM, M, ROOM_MAX } from '@/domain/entities/content/config';
import { isqrt } from '@/domain/entities/content/pairing';
import type { LineAddress } from '@/domain/entities/content/types';

const origin: LineAddress = { n: 0n, floor: 0n, wall: 0, shelf: 0, volume: 0, page: 0, line: 0 };

describe('alphabet edge cases', () => {
  it('glyphToDigit throws on a non-alphabet glyph (E8)', () => {
    expect(() => glyphToDigit('!')).toThrow(RangeError);
  });
  it('digitToGlyph throws out of range', () => {
    expect(() => digitToGlyph(-1)).toThrow(RangeError);
    expect(() => digitToGlyph(29)).toThrow(RangeError);
  });
  it('base29Encode throws when not exactly 80 glyphs', () => {
    expect(() => base29Encode(['a', 'b'])).toThrow(RangeError);
  });
  it('base29Decode throws on negative or on values ≥ M', () => {
    expect(() => base29Decode(-1n)).toThrow(RangeError);
    expect(() => base29Decode(M)).toThrow(RangeError);
  });
});

describe('bytes edge cases (E4)', () => {
  it('toBytesBE throws on negative and on overflow', () => {
    expect(() => toBytesBE(-1n, 4)).toThrow(RangeError);
    expect(() => toBytesBE(2n ** 64n, 4)).toThrow(RangeError);
  });
  it('toBytesBE / bytesToBigintBE round-trip', () => {
    const x = 0x0102_0304_0506n;
    expect(bytesToBigintBE(toBytesBE(x, 8))).toBe(x);
  });
});

describe('codec edge cases', () => {
  it('encodeLineIndex throws on out-of-range intra fields (E1)', () => {
    expect(() => encodeLineIndex({ ...origin, wall: 4 })).toThrow(RangeError);
    expect(() => encodeLineIndex({ ...origin, shelf: -1 })).toThrow(RangeError);
    expect(() => encodeLineIndex({ ...origin, page: 410 })).toThrow(RangeError);
    expect(() => encodeLineIndex({ ...origin, line: 40 })).toThrow(RangeError);
  });
  it('encodeLineIndex throws when the coordinate is unaddressable (E7, room ≥ ROOM_MAX)', () => {
    expect(() => encodeLineIndex({ ...origin, n: 2n ** 200n })).toThrow(RangeError);
  });
  it('decodeLineIndex returns null for the unaddressable remainder (E2)', () => {
    expect(decodeLineIndex(ROOM_MAX * LINES_PER_ROOM)).toBeNull();
    expect(decodeLineIndex(M - 1n)).toBeNull();
  });
  it('decodeLineIndex round-trips an addressable index', () => {
    const x = encodeLineIndex(origin);
    expect(decodeLineIndex(x)).toEqual(origin);
  });
});

describe('isqrt guard', () => {
  it('throws on a negative radicand', () => {
    expect(() => isqrt(-1n)).toThrow(RangeError);
  });
});
