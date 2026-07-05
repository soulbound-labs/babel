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
