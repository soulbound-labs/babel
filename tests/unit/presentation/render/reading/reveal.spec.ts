import { describe, expect, it } from 'vitest';

import { complete, frontAt, PAGE_REVEAL_SECONDS } from '@/presentation/render/reading/reveal';

describe('reveal front (INV-B3)', () => {
  it('is 0 at phase 0 (and for any non-positive/garbage phase)', () => {
    expect(frontAt(0)).toBe(0);
    expect(frontAt(-1)).toBe(0);
    expect(frontAt(Number.NaN)).toBe(0);
    expect(frontAt(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('is 40 at and beyond the full-page time', () => {
    expect(frontAt(PAGE_REVEAL_SECONDS)).toBe(40);
    expect(frontAt(PAGE_REVEAL_SECONDS + 0.001)).toBe(40);
    expect(frontAt(1e9)).toBe(40);
  });

  it('locked cadence: 8 lines/s, full page in exactly 5.0 s', () => {
    expect(PAGE_REVEAL_SECONDS).toBe(5);
    expect(frontAt(1)).toBe(8);
    expect(frontAt(2.5)).toBe(20);
  });

  it('is monotonic non-decreasing and bounded 0..40 across a fine phase sweep', () => {
    let prev = 0;
    for (let i = 0; i <= 1000; i++) {
      const front = frontAt((i / 1000) * (PAGE_REVEAL_SECONDS + 1));
      expect(front).toBeGreaterThanOrEqual(prev);
      expect(front).toBeGreaterThanOrEqual(0);
      expect(front).toBeLessThanOrEqual(40);
      prev = front;
    }
  });

  it('complete() jumps the front to the full page (mid-stream turn)', () => {
    expect(complete()).toBe(40);
  });
});
