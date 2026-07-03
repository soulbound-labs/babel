import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

import { App } from '@/app/App';

/**
 * R3F's <Canvas> creates a WebGL renderer, which jsdom cannot provide. This
 * smoke test exercises the React shell wiring (main → App → PlaceholderScene),
 * not the GPU, so we replace Canvas with a plain host element and stub the
 * frame loop. `flushSync` forces a synchronous commit so any render-time throw
 * propagates into the assertion rather than an unhandled async rejection.
 */
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => <div data-r3f-canvas>{children}</div>,
  useFrame: () => {},
}));

afterEach(() => {
  vi.restoreAllMocks();
});

it('mounts App without throwing', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  expect(() => {
    flushSync(() => root.render(<App />));
  }).not.toThrow();

  flushSync(() => root.unmount());
  container.remove();
});
