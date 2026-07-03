import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { hash } from '@/domain/coordinates/hash';

const coord = fc.record({ n: fc.bigInt(), floor: fc.bigInt() });

describe('coordinate hash (INV-4)', () => {
  it('is deterministic and lowercase 64-hex', () => {
    fc.assert(
      fc.property(coord, (c) => {
        const h = hash(c);
        expect(h).toBe(hash(c));
        expect(h).toMatch(/^[0-9a-f]{64}$/);
      }),
    );
  });

  it('has no collisions across 10^4 distinct coordinates', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) {
        seen.add(hash({ n: BigInt(i), floor: BigInt(j) }));
      }
    }
    expect(seen.size).toBe(10_000);
  });
});
