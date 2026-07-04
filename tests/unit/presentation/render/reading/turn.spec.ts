import { describe, expect, it } from 'vitest';

import { READ_TURN_SECONDS } from '@/presentation/render/room/dimensions';
import {
  curlAt,
  PAGE_BEND_GLSL,
  turnAngleAt,
  turnProgressAt,
  TURN_CURL,
} from '@/presentation/render/reading/turn';

describe('turn curve (INV-B4)', () => {
  it('0 = flat, 1 = fully turned', () => {
    expect(turnProgressAt(0)).toBe(0);
    expect(turnProgressAt(READ_TURN_SECONDS)).toBe(1);
    expect(turnAngleAt(0)).toBe(0);
    expect(turnAngleAt(1)).toBe(Math.PI);
  });

  it('progress is monotonic non-decreasing over the locked duration and clamped outside it', () => {
    let prev = 0;
    for (let i = 0; i <= 1000; i++) {
      const p = turnProgressAt((i / 1000) * (READ_TURN_SECONDS * 1.5) - 0.2);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
  });

  it('base angle is monotonic in progress (deterministic scalar params)', () => {
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const angle = turnAngleAt(i / 100);
      expect(angle).toBeGreaterThan(prev);
      prev = angle;
    }
  });

  it('curl is zero at both rest states and positive mid-turn (the curved silhouette)', () => {
    expect(curlAt(0)).toBe(0);
    expect(Math.abs(curlAt(1))).toBeLessThan(1e-12);
    expect(curlAt(0.5)).toBeCloseTo(TURN_CURL, 10);
    expect(curlAt(0.25)).toBeGreaterThan(0);
  });

  it('the GLSL chunk carries the uniforms and the same curl constant', () => {
    expect(PAGE_BEND_GLSL).toContain('uniform float uTurnProgress');
    expect(PAGE_BEND_GLSL).toContain('uniform float uPageWidth');
    expect(PAGE_BEND_GLSL).toContain('babelBendPage');
    expect(PAGE_BEND_GLSL).toContain(TURN_CURL.toFixed(4));
  });
});
