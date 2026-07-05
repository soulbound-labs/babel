import { describe, expect, it } from 'vitest';
import {
  JOYSTICK_DEADZONE,
  createTouchInputState,
  joystickVector,
} from '../../../../../src/presentation/render/player/touch-input';

const CENTER = { x: 100, y: 100 };
const RADIUS = 50;

describe('createTouchInputState', () => {
  it('starts inactive and all-zero', () => {
    expect(createTouchInputState()).toEqual({
      active: false,
      analog: { f: 0, r: 0 },
      lookDX: 0,
      lookDY: 0,
    });
  });
});

describe('joystickVector', () => {
  it('maps the cardinal directions (screen up = +f, screen right = +r)', () => {
    const n = joystickVector(CENTER, { x: 100, y: 50 }, RADIUS);
    expect(n.f).toBeCloseTo(1);
    expect(n.r).toBeCloseTo(0);

    const e = joystickVector(CENTER, { x: 150, y: 100 }, RADIUS);
    expect(e.f).toBeCloseTo(0);
    expect(e.r).toBeCloseTo(1);

    const s = joystickVector(CENTER, { x: 100, y: 150 }, RADIUS);
    expect(s.f).toBeCloseTo(-1);
    expect(s.r).toBeCloseTo(0);

    const w = joystickVector(CENTER, { x: 50, y: 100 }, RADIUS);
    expect(w.f).toBeCloseTo(0);
    expect(w.r).toBeCloseTo(-1);
  });

  it('maps the diagonals with equal components', () => {
    const ne = joystickVector(CENTER, { x: 150, y: 50 }, RADIUS);
    expect(ne.f).toBeCloseTo(Math.SQRT1_2);
    expect(ne.r).toBeCloseTo(Math.SQRT1_2);

    const sw = joystickVector(CENTER, { x: 50, y: 150 }, RADIUS);
    expect(sw.f).toBeCloseTo(-Math.SQRT1_2);
    expect(sw.r).toBeCloseTo(-Math.SQRT1_2);
  });

  it('returns EXACT zero just under the deadzone (hard deadzone)', () => {
    const justUnder = (JOYSTICK_DEADZONE - 0.001) * RADIUS;
    const v = joystickVector(CENTER, { x: 100 + justUnder, y: 100 }, RADIUS);
    expect(v).toEqual({ f: 0, r: 0 });
  });

  it('returns non-zero just over the deadzone', () => {
    const justOver = (JOYSTICK_DEADZONE + 0.001) * RADIUS;
    const v = joystickVector(CENTER, { x: 100 + justOver, y: 100 }, RADIUS);
    expect(v.r).toBeGreaterThan(0);
    expect(v.f).toBe(0);
  });

  it('clamps magnitude to 1 when the thumb is far outside the radius', () => {
    const v = joystickVector(CENTER, { x: 100 + RADIUS * 7, y: 100 - RADIUS * 4 }, RADIUS);
    expect(Math.hypot(v.f, v.r)).toBeCloseTo(1);
    expect(v.r).toBeGreaterThan(0);
    expect(v.f).toBeGreaterThan(0);
  });

  it('preserves sub-unit magnitude inside the ring (analog speed scaling)', () => {
    const v = joystickVector(CENTER, { x: 100 + RADIUS * 0.5, y: 100 }, RADIUS);
    expect(Math.hypot(v.f, v.r)).toBeCloseTo(0.5);
  });

  it('is exactly zero for a degenerate radius', () => {
    expect(joystickVector(CENTER, { x: 200, y: 200 }, 0)).toEqual({ f: 0, r: 0 });
  });
});
