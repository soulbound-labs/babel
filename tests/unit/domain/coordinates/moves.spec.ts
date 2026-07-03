import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { applyMove, invertMove, reduce } from '@/domain/coordinates/moves';
import type { Coordinate, Move } from '@/domain/coordinates/types';
import { ORIGIN } from '@/domain/coordinates/types';

const move = fc.constantFrom<Move>('forward', 'back', 'up', 'down');
const coord = fc.record({ n: fc.bigInt(), floor: fc.bigInt() });

describe('coordinate algebra', () => {
  it('INV-1 loop closure: opposite moves cancel', () => {
    expect(reduce(['forward', 'back'])).toEqual(ORIGIN);
    expect(reduce(['up', 'forward', 'down', 'back'])).toEqual(ORIGIN);
  });

  it('INV-2 path-independence: equal multisets of moves reduce equally', () => {
    fc.assert(
      fc.property(
        fc.record({ forward: fc.nat(20), back: fc.nat(20), up: fc.nat(20), down: fc.nat(20) }),
        (c) => {
          const of = (m: Move, k: number): Move[] => Array.from({ length: k }, () => m);
          // Two different orderings of the same multiset → same net vector.
          const grouped: Move[] = [
            ...of('forward', c.forward),
            ...of('back', c.back),
            ...of('up', c.up),
            ...of('down', c.down),
          ];
          const interleaved: Move[] = [];
          const max = Math.max(c.forward, c.back, c.up, c.down);
          for (let i = 0; i < max; i++) {
            if (i < c.forward) interleaved.push('forward');
            if (i < c.up) interleaved.push('up');
            if (i < c.back) interleaved.push('back');
            if (i < c.down) interleaved.push('down');
          }
          expect(reduce(grouped)).toEqual(reduce(interleaved));
        },
      ),
    );
  });

  it('INV-3 move inverses: applyMove then invertMove is identity', () => {
    fc.assert(
      fc.property(coord, move, (c: Coordinate, m: Move) => {
        expect(applyMove(applyMove(c, m), invertMove(m))).toEqual(c);
      }),
    );
  });
});
