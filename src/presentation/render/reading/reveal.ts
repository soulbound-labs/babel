/**
 * Reveal-front math (§4.4, KDD-4) — pure. Streaming is a render-time reveal
 * over the already-computed spread buffer: the front advances at the locked
 * cadence (16 lines/s) and glyphs past the front clip/fade in the shader. An
 * open spread is TWO leaves — the left page (40 lines) and the right page (40
 * lines) — streamed IN PARALLEL: both glyph blocks share one front over local
 * lines 0..40 (each block's `uLineStart` is 0), so line k resolves on the left
 * and the right leaf simultaneously. Monotonic non-decreasing in phase
 * (INV-B3); fractional values let the currently-streaming line fade in
 * smoothly.
 */
import { PAGE_LINES, READ_LINES_PER_SECOND } from '../room/dimensions';

/** The reveal-front domain: both leaves stream in parallel over 0..40. */
export const REVEAL_LINES = PAGE_LINES;

/** Seconds for a full spread at the locked cadence — 40 / 16 = 2.5 (§3). */
export const SPREAD_REVEAL_SECONDS = REVEAL_LINES / READ_LINES_PER_SECOND;

/**
 * The reveal front (in lines, fractional) at `phase` seconds since spread-open.
 * `phase ≤ 0 → 0`; `phase ≥ SPREAD_REVEAL_SECONDS → 40`; monotonic between.
 * Line k of the LEFT leaf and line k of the RIGHT leaf resolve together.
 */
export function frontAt(phase: number): number {
  if (!Number.isFinite(phase) || phase <= 0) return 0;
  return Math.min(REVEAL_LINES, phase * READ_LINES_PER_SECOND);
}

/** The fully-revealed front — the settled value of a completed stream. */
export function complete(): number {
  return REVEAL_LINES;
}
