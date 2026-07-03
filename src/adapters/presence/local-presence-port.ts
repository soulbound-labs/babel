import type { PresencePort } from '../../domain/ports';

/**
 * No-op presence adapter (Unit 03). Unit 07 replaces this with the
 * Convex-backed implementation — a one-line swap in `App.tsx` (§4.9).
 */
export class LocalPresencePort implements PresencePort {
  publish(): void {} // no-op — Unit 07 replaces with Convex
  subscribe(): () => void {
    return () => {}; // never emits; there is no one else here (yet)
  }
}
