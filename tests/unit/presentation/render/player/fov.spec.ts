import { describe, expect, it } from 'vitest';
import {
  DESKTOP_FOV,
  PORTRAIT_FOV_MAX,
  resolveFov,
} from '../../../../../src/presentation/render/player/fov';

describe('resolveFov', () => {
  it('returns EXACTLY 62 for every landscape/square aspect (identity clause)', () => {
    for (const aspect of [1, 1280 / 720, 16 / 9, 4 / 3, 21 / 9, 2, 100]) {
      expect(resolveFov(aspect)).toBe(DESKTOP_FOV);
    }
  });

  it('returns exactly 62 for the capture-rig aspect 1280/720 with ===', () => {
    expect(resolveFov(1280 / 720) === 62).toBe(true);
  });

  it('is monotone non-increasing in aspect across portrait', () => {
    const aspects = [0.4, 0.5, 0.6, 0.75, 0.9, 0.99];
    const fovs = aspects.map(resolveFov);
    for (let i = 1; i < fovs.length; i++) {
      const prev = fovs[i - 1] ?? NaN;
      const curr = fovs[i] ?? NaN;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it('exceeds the desktop FOV just under square (wider vertical in portrait)', () => {
    const v = resolveFov(0.99);
    expect(v).toBeGreaterThan(DESKTOP_FOV);
    expect(v).toBeLessThanOrEqual(PORTRAIT_FOV_MAX);
  });

  it('engages the clamp at iPhone 13 portrait aspect (390/844)', () => {
    expect(resolveFov(390 / 844)).toBe(PORTRAIT_FOV_MAX);
  });

  it('guards non-finite and non-positive aspects with the desktop constant', () => {
    for (const bad of [NaN, Infinity, -Infinity, 0, -1]) {
      expect(resolveFov(bad)).toBe(DESKTOP_FOV);
    }
  });

  it('is pure — repeated calls agree exactly', () => {
    expect(resolveFov(0.7)).toBe(resolveFov(0.7));
  });
});
