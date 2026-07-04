import { describe, expect, it } from 'vitest';

import { line } from '@/domain/entities';
import { openPage } from '@/presentation/render/reading/page-content';

/** The pinned golden capture address (§4.6): origin room, first book, first page. */
const GOLDEN = { n: 0n, floor: 0n, wall: 0, shelf: 0, volume: 0, page: 0 };
const DEEP = { n: -31337n, floor: 4096n, wall: 3, shelf: 4, volume: 31, page: 409 };

describe('openPage (INV-B2, INV-B9)', () => {
  it('yields exactly 40×80 glyph slots', () => {
    const page = openPage(GOLDEN);
    expect(page).toHaveLength(40);
    for (const row of page) {
      expect(row).toHaveLength(80);
      for (const glyph of row) {
        expect(typeof glyph).toBe('string');
        expect(glyph).toHaveLength(1);
      }
    }
  });

  it('row L equals line({...base, line: L}) for every L (the rendered page IS the library)', () => {
    for (const base of [GOLDEN, DEEP]) {
      const page = openPage(base);
      for (let l = 0; l < 40; l++) {
        expect(page[l]?.join('')).toBe(line({ ...base, line: l }).join(''));
      }
    }
  });

  it('a page opened twice is identical — same frozen buffer from the memo', () => {
    const first = openPage(GOLDEN);
    const second = openPage(GOLDEN);
    expect(second).toBe(first); // memo hit — laid out once, no regen
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
  });

  it('memoized content is byte-identical across cache eviction (determinism)', () => {
    const before = openPage(GOLDEN).map((r) => r.join(''));
    // Flood the LRU so GOLDEN is evicted, then reopen.
    for (let p = 1; p <= 9; p++) openPage({ ...GOLDEN, page: p });
    const after = openPage(GOLDEN).map((r) => r.join(''));
    expect(after).toEqual(before);
  });
});
