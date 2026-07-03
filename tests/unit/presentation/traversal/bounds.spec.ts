import { describe, expect, it } from 'vitest';

import { ORIGIN } from '@/domain/entities';
import { canMove, isWithinBounds, WALKABLE_BOUND } from '@/presentation/traversal/bounds';

describe('T-5 — the ±64 bound gates move emission', () => {
  it('WALKABLE_BOUND is the exported bigint 64n (Unit 07 seam)', () => {
    expect(WALKABLE_BOUND === 64n).toBe(true);
  });

  it('isWithinBounds(ORIGIN) is true', () => {
    expect(isWithinBounds(ORIGIN)).toBe(true);
  });

  it('forward refused at n = 64n, accepted at n = 63n', () => {
    expect(canMove({ n: 64n, floor: 0n }, 'forward')).toBe(false);
    expect(canMove({ n: 63n, floor: 0n }, 'forward')).toBe(true);
  });

  it('back accepted at n = 64n, refused at n = -64n', () => {
    expect(canMove({ n: 64n, floor: 0n }, 'back')).toBe(true);
    expect(canMove({ n: -64n, floor: 0n }, 'back')).toBe(false);
    expect(canMove({ n: -64n, floor: 0n }, 'forward')).toBe(true);
  });

  it('up refused at floor = 64n, accepted at floor = 63n', () => {
    expect(canMove({ n: 0n, floor: 64n }, 'up')).toBe(false);
    expect(canMove({ n: 0n, floor: 63n }, 'up')).toBe(true);
  });

  it('down refused at floor = -64n, accepted at floor = -63n; up accepted at floor = -64n', () => {
    expect(canMove({ n: 0n, floor: -64n }, 'down')).toBe(false);
    expect(canMove({ n: 0n, floor: -63n }, 'down')).toBe(true);
    expect(canMove({ n: 0n, floor: -64n }, 'up')).toBe(true);
  });

  it('corners: every outward move refused, every inward move accepted (strict bigint)', () => {
    const corner = { n: 64n, floor: -64n };
    expect(canMove(corner, 'forward')).toBe(false);
    expect(canMove(corner, 'down')).toBe(false);
    expect(canMove(corner, 'back')).toBe(true);
    expect(canMove(corner, 'up')).toBe(true);
    expect(isWithinBounds(corner)).toBe(true);
    expect(isWithinBounds({ n: 65n, floor: 0n })).toBe(false);
    expect(isWithinBounds({ n: 0n, floor: -65n })).toBe(false);
  });
});
