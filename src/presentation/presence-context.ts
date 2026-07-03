import { createContext } from 'react';

import type { PresencePort } from '../domain/ports';

/**
 * Presence seam (§4.9). Typed against the port only — presentation never
 * imports `adapters`. The `app` layer instantiates the adapter (Unit 03:
 * `LocalPresencePort`; Unit 07: the Convex one) and provides it here.
 * The default is a safe no-op so a missing provider degrades to solitude.
 */
export const PresenceContext = createContext<PresencePort>({
  publish(): void {},
  subscribe(): () => void {
    return () => {};
  },
});
