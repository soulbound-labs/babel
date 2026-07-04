/**
 * Loop closure — the pure traversal machine (§6.1). The brief's required proof
 * at the algebra level: a closed physical loop must return the coordinate
 * EXACTLY to ORIGIN, and the move log must reduce to the coordinate after every
 * single commit (T-3). Bigints are compared strictly — never epsilon.
 *
 * The render-pipeline variant (driving stepLocomotion + origin.ts) lives in
 * tests/unit/presentation/render/loop-closure.spec.ts; the fast-check versions
 * are in traversal.spec.ts (Step 1.3).
 */
import { describe, expect, it } from 'vitest';

import { hash, ORIGIN, reduce } from '@/domain/entities';
import type { Coordinate, Move } from '@/domain/entities';
import { createTraversal, crossThreshold } from '@/presentation/traversal/traversal';

describe('loop closure — pure traversal machine (§6.1)', () => {
  it('climb, forward, descend, back returns to ORIGIN with the log reducing after every commit', () => {
    const script: Move[] = ['up', 'forward', 'down', 'back'];
    let state = createTraversal();

    for (const m of script) {
      state = crossThreshold(state, m);
      // T-3: the move log IS the coordinate at every step.
      expect(state.coordinate).toEqual(reduce([...state.moveLog]));
    }

    expect(state.moveLog).toEqual(script);
    // Strict bigint identity — the loop closes exactly, no float epsilon.
    expect(state.coordinate.n).toBe(0n);
    expect(state.coordinate.floor).toBe(0n);
    expect(state.coordinate).toEqual(ORIGIN);
    expect(hash(state.coordinate)).toBe(hash(ORIGIN));
  });

  it('traces the expected intermediate coordinates around the loop', () => {
    const script: Move[] = ['up', 'forward', 'down', 'back'];
    const expected: Coordinate[] = [
      { n: 0n, floor: 1n }, // up
      { n: 1n, floor: 1n }, // forward
      { n: 1n, floor: 0n }, // down
      { n: 0n, floor: 0n }, // back → ORIGIN
    ];
    let state = createTraversal();
    script.forEach((m, i) => {
      state = crossThreshold(state, m);
      expect(state.coordinate).toEqual(expected[i]);
    });
  });

  it('a doubled loop (two full circuits) still closes exactly on ORIGIN', () => {
    const script: Move[] = ['up', 'forward', 'down', 'back', 'up', 'forward', 'down', 'back'];
    let state = createTraversal();
    for (const m of script) {
      state = crossThreshold(state, m);
      expect(state.coordinate).toEqual(reduce([...state.moveLog]));
    }
    expect(state.coordinate).toEqual(ORIGIN);
    expect(hash(state.coordinate)).toBe(hash(ORIGIN));
  });
});
