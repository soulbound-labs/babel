/**
 * Reveal-front math (§4.4, KDD-4) — pure. Streaming is a render-time reveal
 * over the already-computed page buffer: the front advances at the locked
 * cadence (8 lines/s ⇒ a full 40-line page in 5.0 s) and glyphs past the
 * front clip/fade in the shader. Monotonic non-decreasing in phase (INV-B3);
 * fractional values let the currently-streaming line fade in smoothly.
 */
import { PAGE_LINES, READ_LINES_PER_SECOND } from '../room/dimensions';

/** Seconds for a full page at the locked cadence — 5.0 (§3). */
export const PAGE_REVEAL_SECONDS = PAGE_LINES / READ_LINES_PER_SECOND;

/**
 * The reveal front (in lines, fractional) at `phase` seconds since page-open.
 * `phase ≤ 0 → 0`; `phase ≥ PAGE_REVEAL_SECONDS → 40`; monotonic between.
 */
export function frontAt(phase: number): number {
  if (!Number.isFinite(phase) || phase <= 0) return 0;
  return Math.min(PAGE_LINES, phase * READ_LINES_PER_SECOND);
}

/** Mid-stream turn (§4.4): the front jumps to the full page — never a half-written page mid-flight. */
export function complete(): number {
  return PAGE_LINES;
}
