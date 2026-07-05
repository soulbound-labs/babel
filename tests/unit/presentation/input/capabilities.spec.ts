import { describe, expect, it } from 'vitest';
import { isTouchPrimary } from '../../../../src/presentation/input/capabilities';
import type { CapabilityEnv } from '../../../../src/presentation/input/capabilities';

function env(coarse: boolean, maxTouchPoints: number): CapabilityEnv {
  return {
    matchMedia: (query) => ({ matches: query === '(pointer: coarse)' && coarse }),
    maxTouchPoints,
  };
}

describe('isTouchPrimary', () => {
  it('is true for a coarse pointer with touch points (phone)', () => {
    expect(isTouchPrimary(env(true, 5))).toBe(true);
  });

  it('is false for a fine pointer even with touch points (touchscreen laptop)', () => {
    expect(isTouchPrimary(env(false, 10))).toBe(false);
  });

  it('is false for a coarse pointer without touch points', () => {
    expect(isTouchPrimary(env(true, 0))).toBe(false);
  });

  it('is false for a plain desktop', () => {
    expect(isTouchPrimary(env(false, 0))).toBe(false);
  });

  it('is false when no window exists (node, env omitted)', () => {
    expect(isTouchPrimary()).toBe(false);
  });
});
