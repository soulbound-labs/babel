/**
 * The glyph atlas charset (§4.2, KDD-3/KDD-6) — the LOCAL 29-character set,
 * keyed by character (not digit index): space + a–z + ',' + '.'.
 *
 * KDD-6: production code must NOT import the private core `ALPHABET`; this
 * local set is pinned to it by a TEST-ONLY private import (INV-B10,
 * alphabet-coverage.spec.ts). All 29 glyphs are pre-warmed at reader mount so
 * troika's async SDF worker never races a capture (FMEA #3).
 */

/** index 0 = space, 1..26 = a..z, 27 = ',', 28 = '.' — mirrors the core order. */
export const ATLAS_CHARS = ' abcdefghijklmnopqrstuvwxyz,.';

/** The pre-warm string handed to a hidden troika Text at mount — all 29 cells. */
export function prewarmText(): string {
  return ATLAS_CHARS;
}

/** Explicit space cell (advance/blank), not a missing-glyph box (§5). */
export function hasExplicitSpaceCell(): boolean {
  return ATLAS_CHARS.includes(' ');
}
