import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  BOOK_COUNT,
  bookToSlot,
  slotJitter,
  slotToBook,
  slotTransform,
} from '@/presentation/render/room/instancing';

const LEAN_MAX = (2.5 * Math.PI) / 180;

describe('INV-R1 — slot bijectivity', () => {
  it('round-trips all 640 (wall, shelf, volume) tuples with no collisions', () => {
    const seen = new Set<number>();
    for (let wall = 0; wall < 4; wall++) {
      for (let shelf = 0; shelf < 5; shelf++) {
        for (let volume = 0; volume < 32; volume++) {
          const slot = bookToSlot(wall, shelf, volume);
          expect(slot).toBeGreaterThanOrEqual(0);
          expect(slot).toBeLessThan(BOOK_COUNT);
          expect(seen.has(slot)).toBe(false);
          seen.add(slot);
          expect(slotToBook(slot)).toEqual({ wall, shelf, volume });
        }
      }
    }
    expect(seen.size).toBe(BOOK_COUNT);
  });

  it('covers slots exactly 0..639', () => {
    for (let slot = 0; slot < BOOK_COUNT; slot++) {
      const { wall, shelf, volume } = slotToBook(slot);
      expect(bookToSlot(wall, shelf, volume)).toBe(slot);
    }
  });
});

describe('INV-R2 — domain agreement + range guards', () => {
  it('BOOK_COUNT is 4 walls × 5 shelves × 32 volumes', () => {
    expect(BOOK_COUNT).toBe(4 * 5 * 32);
  });

  it.each([
    [-1, 0, 0],
    [4, 0, 0],
    [0, -1, 0],
    [0, 5, 0],
    [0, 0, -1],
    [0, 0, 32],
    [0.5, 0, 0],
  ])('bookToSlot(%d, %d, %d) throws RangeError', (wall, shelf, volume) => {
    expect(() => bookToSlot(wall, shelf, volume)).toThrow(RangeError);
  });

  it.each([[-1], [640], [1.5], [NaN]])('slotToBook(%d) throws RangeError', (slot) => {
    expect(() => slotToBook(slot)).toThrow(RangeError);
  });

  it('slotTransform/slotJitter reject out-of-range slots', () => {
    expect(() => slotTransform(-1)).toThrow(RangeError);
    expect(() => slotJitter(640)).toThrow(RangeError);
  });
});

describe('INV-R3 — deterministic presentation', () => {
  it('slotTransform and slotJitter are pure: repeated calls are identical', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: BOOK_COUNT - 1 }), (slot) => {
        expect(slotTransform(slot)).toEqual(slotTransform(slot));
        expect(slotJitter(slot)).toEqual(slotJitter(slot));
      }),
    );
  });

  it('jitter stays within documented bounds for every slot', () => {
    for (let slot = 0; slot < BOOK_COUNT; slot++) {
      const j = slotJitter(slot);
      expect(j.heightScale).toBeGreaterThanOrEqual(0.92);
      expect(j.heightScale).toBeLessThanOrEqual(1.0);
      expect(Math.abs(j.lean)).toBeLessThanOrEqual(LEAN_MAX);
      expect(j.depthPush).toBeGreaterThanOrEqual(0);
      expect(j.depthPush).toBeLessThanOrEqual(0.006);
      expect(j.shade).toBeGreaterThanOrEqual(0);
      expect(j.shade).toBeLessThan(1);
    }
  });

  it('jitter varies across slots (the hash actually mixes)', () => {
    const shades = new Set<number>();
    for (let slot = 0; slot < BOOK_COUNT; slot++) shades.add(slotJitter(slot).shade);
    expect(shades.size).toBeGreaterThan(BOOK_COUNT / 2);
  });

  it('transforms are finite and land books on the correct shelf row', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: BOOK_COUNT - 1 }), (slot) => {
        const t = slotTransform(slot);
        const { shelf } = slotToBook(slot);
        for (const v of [t.position, t.rotation, t.scale]) {
          expect(Number.isFinite(v.x)).toBe(true);
          expect(Number.isFinite(v.y)).toBe(true);
          expect(Number.isFinite(v.z)).toBe(true);
        }
        // Book center sits within its shelf row (pitch 0.4).
        expect(t.position.y).toBeGreaterThan(shelf * 0.4);
        expect(t.position.y).toBeLessThan((shelf + 1) * 0.4);
      }),
    );
  });
});
