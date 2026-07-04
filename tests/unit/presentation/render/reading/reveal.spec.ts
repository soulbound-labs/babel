import { describe, expect, it } from 'vitest';

import { complete, frontAt, SPREAD_REVEAL_SECONDS } from '@/presentation/render/reading/reveal';

describe('reveal front (INV-B3)', () => {
  it('is 0 at phase 0 (and for any non-positive/garbage phase)', () => {
    expect(frontAt(0)).toBe(0);
    expect(frontAt(-1)).toBe(0);
    expect(frontAt(Number.NaN)).toBe(0);
    expect(frontAt(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('is 80 (the full spread) at and beyond the full-spread time', () => {
    expect(frontAt(SPREAD_REVEAL_SECONDS)).toBe(80);
    expect(frontAt(SPREAD_REVEAL_SECONDS + 0.001)).toBe(80);
    expect(frontAt(1e9)).toBe(80);
  });

  it('locked cadence: 8 lines/s, full spread (both leaves) in exactly 10.0 s', () => {
    expect(SPREAD_REVEAL_SECONDS).toBe(10);
    expect(frontAt(1)).toBe(8);
    expect(frontAt(2.5)).toBe(20);
    // Left leaf fills first (0..39), then the front CONTINUES onto the right.
    expect(frontAt(5)).toBe(40); // left leaf complete, right about to begin
    expect(frontAt(7.5)).toBe(60); // right leaf half-streamed
  });

  it('is monotonic non-decreasing and bounded 0..80 across a fine phase sweep', () => {
    let prev = 0;
    for (let i = 0; i <= 1000; i++) {
      const front = frontAt((i / 1000) * (SPREAD_REVEAL_SECONDS + 1));
      expect(front).toBeGreaterThanOrEqual(prev);
      expect(front).toBeGreaterThanOrEqual(0);
      expect(front).toBeLessThanOrEqual(80);
      prev = front;
    }
  });

  it('complete() jumps the front to the full spread (mid-stream turn)', () => {
    expect(complete()).toBe(80);
  });
});
