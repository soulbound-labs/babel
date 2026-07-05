/**
 * Touch capability detection (mobile spec §3.1). One predicate governs what
 * *mounts* — desktop listeners stay wired unconditionally; touch and desktop
 * schemes are kept disjoint at runtime by lock state, never by this check.
 * The environment is injectable so the predicate is jsdom-testable without
 * monkey-patching globals.
 */
export interface CapabilityEnv {
  matchMedia(query: string): { matches: boolean };
  maxTouchPoints: number;
}

/** Coarse primary pointer AND at least one touch point ⇒ touch-primary device. */
export function isTouchPrimary(env?: CapabilityEnv): boolean {
  if (env === undefined) {
    // No window or no matchMedia (node, jsdom) — never touch-primary.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    env = {
      matchMedia: (query) => window.matchMedia(query),
      maxTouchPoints: navigator.maxTouchPoints,
    };
  }
  return env.matchMedia('(pointer: coarse)').matches && env.maxTouchPoints > 0;
}

/**
 * Pointer lock held? THE gate probe for the desktop/touch disjunction (M-2) —
 * never compare `document.pointerLockElement` against null directly.
 *
 * iOS WebKit has no Pointer Lock API: the property is UNDEFINED there, and a
 * strict `=== null` reads undefined as "locked" — inverting EVERY gate on
 * iPhone (desktop center-ray pick/hover ran on every touch; touch look/swipe
 * were dead). jsdom returns null, so only real iOS exposes this. `!= null`
 * reads both null and undefined as "not locked".
 */
export function isPointerLocked(doc: { pointerLockElement?: Element | null } = document): boolean {
  return doc.pointerLockElement != null;
}
