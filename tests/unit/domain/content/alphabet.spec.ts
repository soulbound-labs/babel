import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { base29Decode, base29Encode } from '@/domain/entities/content/alphabet';
import { ALPHABET, COLS } from '@/domain/entities/content/config';

const glyph = fc.constantFrom(...ALPHABET.split(''));
const line80 = fc.array(glyph, { minLength: COLS, maxLength: COLS });

describe('base-29 codec (INV-7, property #10)', () => {
  it('round-trips any 80-glyph line: decode(encode(g)) === g', () => {
    fc.assert(
      fc.property(line80, (g) => {
        expect(base29Decode(base29Encode(g))).toEqual(g);
      }),
    );
  });

  it('always produces exactly 80 glyphs, all in ALPHABET', () => {
    fc.assert(
      fc.property(line80, (g) => {
        const out = base29Decode(base29Encode(g));
        expect(out).toHaveLength(COLS);
        for (const ch of out) expect(ALPHABET.includes(ch)).toBe(true);
      }),
    );
  });
});
