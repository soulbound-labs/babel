import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { inverse, line } from '@/domain/content/cipher';
import { ALPHABET, COLS } from '@/domain/content/config';
import type { LineAddress } from '@/domain/content/types';

const addr = fc.record({
  n: fc.bigInt({ min: -1_000_000n, max: 1_000_000n }),
  floor: fc.bigInt({ min: -1_000_000n, max: 1_000_000n }),
  wall: fc.integer({ min: 0, max: 3 }),
  shelf: fc.integer({ min: 0, max: 4 }),
  volume: fc.integer({ min: 0, max: 31 }),
  page: fc.integer({ min: 0, max: 409 }),
  line: fc.integer({ min: 0, max: 39 }),
});

const glyph = fc.constantFrom(...ALPHABET.split(''));
const line80 = fc.array(glyph, { minLength: COLS, maxLength: COLS });

describe('content cipher', () => {
  it('INV-9 determinism: line(a) === line(a)', () => {
    fc.assert(
      fc.property(addr, (a: LineAddress) => {
        expect(line(a)).toEqual(line(a));
      }),
    );
  });

  it('INV-12 length & alphabet integrity: 80 glyphs, all in ALPHABET', () => {
    fc.assert(
      fc.property(addr, (a: LineAddress) => {
        const l = line(a);
        expect(l).toHaveLength(COLS);
        for (const ch of l) expect(ALPHABET.includes(ch)).toBe(true);
      }),
    );
  });

  it('INV-10 forward round-trip: inverse(line(a)) === a', () => {
    fc.assert(
      fc.property(addr, (a: LineAddress) => {
        expect(inverse(line(a))).toEqual(a);
      }),
    );
  });

  it('INV-11 reverse round-trip: line(inverse(g)) === g when inverse(g) !== null (the search path)', () => {
    let nullCount = 0;
    fc.assert(
      fc.property(line80, (g) => {
        const a = inverse(g);
        if (a === null) {
          nullCount++;
          return;
        }
        expect(line(a)).toEqual(g);
      }),
      { numRuns: 500 },
    );
    // The unaddressable remainder is < 10.5M of ~10¹¹⁷ inputs — should essentially never hit.
    expect(nullCount).toBe(0);
  });

  it('INV-13 bijection tripwire: 10⁴ distinct addresses → 10⁴ distinct lines', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(
        line({ n: BigInt(i), floor: 0n, wall: 0, shelf: 0, volume: 0, page: 0, line: 0 }).join(''),
      );
    }
    expect(seen.size).toBe(10_000);
  });
});
