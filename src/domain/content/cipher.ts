/**
 * The content cipher (spec §4.4, §4.10). `line` maps a LineAddress to its
 * deterministic 80-glyph line; `inverse` is the search direction, total except
 * for the vanishing unaddressable remainder (returns null — E2). Locked by
 * INV-9..INV-14.
 */
import { base29Decode, base29Encode } from './alphabet';
import { decodeLineIndex, encodeLineIndex } from './codec';
import { feistel, feistelInverse } from './permutation';
import type { Glyph, LineAddress } from './types';

/** LineAddress → the 80 glyphs on that line. */
export function line(a: LineAddress): Glyph[] {
  return base29Decode(feistel(encodeLineIndex(a)));
}

/** 80 glyphs → the LineAddress that produces them, or null if unaddressable (E2). */
export function inverse(glyphs: Glyph[]): LineAddress | null {
  const contentInt = base29Encode(glyphs);
  const lineIndex = feistelInverse(contentInt);
  return decodeLineIndex(lineIndex);
}
