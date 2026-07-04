/**
 * Reveal-front math (§4.4, KDD-4) — pure. Streaming is a render-time reveal
 * over the already-computed spread buffer: the front advances at the locked
 * cadence (8 lines/s) and glyphs past the front clip/fade in the shader. An
 * open spread is TWO leaves — the left page (40 lines) then the right page (40
 * lines) — so the front runs 0..80: it fills the left leaf top-to-bottom, then
 * CONTINUES onto the right leaf. Monotonic non-decreasing in phase (INV-B3);
 * fractional values let the currently-streaming line fade in smoothly.
 */
import { PAGE_LINES, READ_LINES_PER_SECOND } from '../room/dimensions';

/** Lines in one open spread: the left leaf + the right leaf (2 × 40 = 80). */
export const SPREAD_LINES = 2 * PAGE_LINES;

/** Seconds for a full spread at the locked cadence — 80 / 8 = 10.0 (§3). */
export const SPREAD_REVEAL_SECONDS = SPREAD_LINES / READ_LINES_PER_SECOND;

/**
 * The reveal front (in lines, fractional) at `phase` seconds since spread-open.
 * `phase ≤ 0 → 0`; `phase ≥ SPREAD_REVEAL_SECONDS → 80`; monotonic between.
 * Lines 0..39 are the left leaf; 40..79 the right leaf.
 */
export function frontAt(phase: number): number {
  if (!Number.isFinite(phase) || phase <= 0) return 0;
  return Math.min(SPREAD_LINES, phase * READ_LINES_PER_SECOND);
}

/** Mid-stream turn (§4.4): the front jumps to the full spread — never a half-written spread mid-flight. */
export function complete(): number {
  return SPREAD_LINES;
}
