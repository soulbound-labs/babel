/**
 * The glyph atlas charset (§4.2, KDD-3/KDD-6) — the LOCAL 29-character set,
 * keyed by character (not digit index): space + a–z + ',' + '.'.
 *
 * KDD-6: production code must NOT import the private core `ALPHABET`; this
 * local set is pinned to it by a TEST-ONLY private import (INV-B10,
 * alphabet-coverage.spec.ts). All 29 glyphs are pre-warmed at reader mount so
 * troika's async SDF worker never races a capture (FMEA #3).
 */

import { MeshStandardMaterial } from 'three';

import {
  READ_CELL_WIDTH,
  READ_LINE_PITCH,
  VELLUM_COLOR,
  VELLUM_EMISSIVE,
  VELLUM_EMISSIVE_INTENSITY,
} from '../room/dimensions';

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

/**
 * The committed 29-glyph subset font (Courier Prime, OFL — public/fonts/).
 * Local so troika never falls back to its CDN default: offline-capable,
 * capture-deterministic, monospace ⇒ the 80-column grid holds exactly.
 */
export const READING_FONT_URL = '/fonts/reading-glyphs.woff';

/**
 * Troika layout for the 40×80 grid. Courier Prime's monospace advance is
 * 0.6 em, so `fontSize = cellWidth / 0.6` makes each glyph occupy exactly one
 * cell; lineHeight is expressed in em multiples of that size.
 */
export const GLYPH_FONT_SIZE = READ_CELL_WIDTH / 0.6;
export const GLYPH_LINE_HEIGHT = READ_LINE_PITCH / GLYPH_FONT_SIZE;

/**
 * A troika Text-shaped surface (drei `<Text>` ref) that can pre-warm the SDF
 * atlas. Narrow so unit tests inject a fake (E5) — KDD-9: no direct
 * troika-three-text import.
 */
export type PrewarmableText = {
  text: string;
  font?: string | null;
  fontSize?: number;
  sync(callback?: () => void): void;
};

/**
 * Pre-warm all 29 glyphs and resolve after troika's async SDF worker syncs
 * (FMEA #3: no atlas race, no glyph pop-in, reproducible captures). Call at
 * reader mount, and `await` before any capture pose fires.
 */
export function preloadGlyphs(text: PrewarmableText): Promise<void> {
  text.text = ATLAS_CHARS;
  text.font = READING_FONT_URL;
  return new Promise((resolve) => {
    text.sync(() => resolve());
  });
}

/**
 * Vellum page material (§4.2, KDD-3): plain, LIT, inheriting `FogExp2` + the
 * bulbs' PointLights for free. A whisper of emissive only — anti
 * grazing-black, never a glow source (Unit 06 owns richer vellum).
 */
export function createVellumMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: VELLUM_COLOR,
    roughness: 0.92,
    metalness: 0,
    emissive: VELLUM_EMISSIVE,
    emissiveIntensity: VELLUM_EMISSIVE_INTENSITY,
  });
}

/**
 * Glyph ink material — the base material troika derives from (glyphs become
 * shaded, lit SDF type: they inherit fog + lights like any lit surface,
 * KDD-3). Dark iron-gall ink on the vellum.
 */
export function createGlyphMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: '#241a10',
    roughness: 0.85,
    metalness: 0,
  });
}
