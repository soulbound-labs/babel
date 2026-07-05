/**
 * Pure gesture classification (mobile spec §3.5). Classifiers are data-in/
 * data-out over plain trace records — never live PointerEvents — so the
 * interesting logic stays node-testable (jsdom's PointerEvent fidelity is
 * poor). Callers collect one trace per pointerId and reset it on
 * pointercancel / visibilitychange (no stuck half-gesture, spec §3.3).
 */
export interface TouchTracePoint {
  pointerId: number;
  x: number;
  y: number;
  t: number;
}

/** Max displacement (CSS px) from the touch origin that still reads as a tap. */
export const TAP_SLOP_PX = 12;
/** Min horizontal travel (CSS px) for a page-turn swipe. */
export const SWIPE_MIN_PX = 48;
/** Max gesture duration (ms) — slower drags are deliberate, not swipes. */
export const SWIPE_MAX_MS = 500;

/**
 * 'tap' iff the trace never strays more than TAP_SLOP_PX from its first
 * point (exactly-at-slop is still a tap). Empty/single-point traces are taps.
 */
export function classifyTouch(trace: TouchTracePoint[]): 'tap' | 'drag' {
  const first = trace[0];
  if (first === undefined) return 'tap';
  for (const p of trace) {
    if (Math.hypot(p.x - first.x, p.y - first.y) > TAP_SLOP_PX) return 'drag';
  }
  return 'tap';
}

/**
 * A swipe is a fast, axis-dominant horizontal stroke: |dx| ≥ SWIPE_MIN_PX,
 * duration ≤ SWIPE_MAX_MS, and |dx| > |dy|. Direction is the sign of dx.
 * Anything else — including a perfect diagonal — is null; refusal IS the
 * contract (spec §3.3: no feedback, no queue).
 */
export function classifySwipe(trace: TouchTracePoint[]): 'left' | 'right' | null {
  const first = trace[0];
  const last = trace[trace.length - 1];
  if (first === undefined || last === undefined || trace.length < 2) return null;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  if (Math.abs(dx) < SWIPE_MIN_PX) return null;
  if (last.t - first.t > SWIPE_MAX_MS) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 'left' : 'right';
}
