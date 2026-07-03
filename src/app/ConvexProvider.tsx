import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

/**
 * Wraps the app in a Convex client. In Unit 01 the backend is empty scaffold, so
 * this is intentionally forgiving: if VITE_CONVEX_URL is unset (e.g. in CI, which
 * has no Convex secrets, or a fresh clone before `convex dev`), we render the
 * scene without a Convex context and log a warning rather than crashing (E1).
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const client = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function AppConvexProvider({ children }: { children: ReactNode }) {
  if (!client) {
    console.warn(
      '[convex] VITE_CONVEX_URL is not set — running without a Convex backend. ' +
        'Copy .env.example to .env.local and run `pnpm dev` to connect.',
    );
    return <>{children}</>;
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
