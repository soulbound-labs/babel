import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { M } from '@/domain/content/config';
import { feistel, feistelInverse } from '@/domain/content/permutation';

const inRange = fc.bigInt({ min: 0n, max: M - 1n });

describe('balanced Feistel (INV-8)', () => {
  it('feistelInverse(feistel(x)) === x and output stays in [0, M)', () => {
    fc.assert(
      fc.property(inRange, (x) => {
        const y = feistel(x);
        expect(y >= 0n && y < M).toBe(true);
        expect(feistelInverse(y)).toBe(x);
      }),
    );
  });

  it('is a permutation on small representative points (no fixed collapse)', () => {
    const pts = [0n, 1n, 2n, M - 1n, M / 2n, M / 3n];
    const images = pts.map(feistel);
    expect(new Set(images.map(String)).size).toBe(pts.length);
    for (const y of images) expect(y >= 0n && y < M).toBe(true);
  });
});
