import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { invertMove, ORIGIN, reduce } from '@/domain/entities';
import type { Coordinate, Move } from '@/domain/entities';
import { isWithinBounds, WALKABLE_BOUND } from '@/presentation/traversal/bounds';
import { createTraversal, crossThreshold } from '@/presentation/traversal/traversal';

const moveArb = fc.constantFrom<Move>('forward', 'back', 'up', 'down');
const movesArb = fc.array(moveArb, { maxLength: 200 });
/** Arbitrary in-bounds start, so bound refusals actually get exercised. */
const startArb = fc.record({
  n: fc.bigInt({ min: -WALKABLE_BOUND, max: WALKABLE_BOUND }),
  floor: fc.bigInt({ min: -WALKABLE_BOUND, max: WALKABLE_BOUND }),
});

describe('T-3 — standing invariant: the move log IS the coordinate', () => {
  it('path independence: coordinate deep-equals reduce(acceptedLog, start)', () => {
    fc.assert(
      fc.property(startArb, movesArb, (start: Coordinate, ms) => {
        let s = createTraversal(start);
        for (const m of ms) {
          s = crossThreshold(s, m);
          expect(s.coordinate).toEqual(reduce([...s.moveLog], start));
        }
      }),
    );
  });
});

describe('T-5 — bound safety under arbitrary sequences', () => {
  it('isWithinBounds(coordinate) never false; refused moves absent from the log', () => {
    fc.assert(
      fc.property(startArb, movesArb, (start: Coordinate, ms) => {
        let s = createTraversal(start);
        for (const m of ms) {
          const before = s;
          s = crossThreshold(s, m);
          expect(isWithinBounds(s.coordinate)).toBe(true);
          if (s === before) continue; // refused — state exactly unchanged
          // Accepted: log grew by exactly this move.
          expect(s.moveLog.length).toBe(before.moveLog.length + 1);
          expect(s.moveLog[s.moveLog.length - 1]).toBe(m);
        }
      }),
    );
  });
});

describe('INV-3 inherited — inverse retrace returns exactly to ORIGIN', () => {
  it('reversed inverted accepted log retraces with zero refusals', () => {
    fc.assert(
      fc.property(movesArb, (ms) => {
        let out = createTraversal(ORIGIN);
        for (const m of ms) out = crossThreshold(out, m);

        const retrace = [...out.moveLog].reverse().map(invertMove);
        let back = createTraversal(out.coordinate);
        for (const m of retrace) {
          const before = back;
          back = crossThreshold(back, m);
          // Retraced path revisits only proven-in-bounds rooms: no refusals.
          expect(back.moveLog.length).toBe(before.moveLog.length + 1);
        }
        expect(back.coordinate).toEqual(ORIGIN);
        expect(back.coordinate.n === 0n && back.coordinate.floor === 0n).toBe(true);
      }),
    );
  });
});
