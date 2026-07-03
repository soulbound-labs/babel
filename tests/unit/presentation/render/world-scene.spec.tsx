import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

import { App } from '@/app/App';

/**
 * jsdom has no WebGL (E5): R3F's <Canvas> cannot mount its renderer here, so
 * we replace it with an empty host element — the scene graph under it is
 * three.js territory that jsdom cannot host either (instanced meshes take
 * refs to real THREE objects). This smoke test asserts the React shell
 * (main → App → WorldScene) mounts without throwing; visual truth lives in
 * the §7.1 mood-gate ritual, not here.
 */
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-r3f-canvas />,
  useFrame: () => {},
  useThree: () => ({}),
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

  expect(container.querySelector('[data-r3f-canvas]')).not.toBeNull();

  flushSync(() => root.unmount());
  container.remove();
});
