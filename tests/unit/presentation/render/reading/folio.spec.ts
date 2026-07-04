import { describe, expect, it } from 'vitest';

import { BOOK_PAGES } from '../../../../../../src/presentation/render/room/dimensions';
import { toRoman } from '../../../../../../src/presentation/render/reading/folio';

describe('toRoman', () => {
  it('renders the canonical numerals (lowercase)', () => {
    const cases: Array<[number, string]> = [
      [1, 'i'],
      [4, 'iv'],
      [9, 'ix'],
      [14, 'xiv'],
      [40, 'xl'],
      [90, 'xc'],
      [400, 'cd'],
      [410, 'cdx'],
      [411, 'cdxi'],
    ];
    for (const [n, roman] of cases) expect(toRoman(n)).toBe(roman);
  });

  it('yields a blank folio for non-positive / non-integer input', () => {
    expect(toRoman(0)).toBe('');
    expect(toRoman(-3)).toBe('');
    expect(toRoman(1.5)).toBe('');
  });

  it('only ever uses letters the reading-glyph subset covers', () => {
    // i v x l c d m — all lowercase a–z, so the vendored subset renders them.
    const allowed = /^[ivxlcdm]*$/;
    for (let page = 1; page <= BOOK_PAGES + 1; page++) {
      expect(toRoman(page)).toMatch(allowed);
    }
  });
});
