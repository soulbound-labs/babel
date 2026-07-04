import { describe, expect, it } from 'vitest';

import { pageAddresses, resolveBookAddress } from '@/presentation/render/reading/book-address';
import { bookToSlot, slotToBook, BOOK_COUNT } from '@/presentation/render/room/instancing';

const COORD = { n: 12345678901234567890n, floor: -987654321987654321n };

describe('resolveBookAddress (INV-B1)', () => {
  it('resolves a (0,0) hit to the LineAddress of that slot, coordinate passed through as bigint', () => {
    const slot = bookToSlot(2, 3, 17);
    const address = resolveBookAddress(COORD, { dn: 0, dfloor: 0 }, slot);
    expect(address).not.toBeNull();
    // Strict bigint equality — never round-tripped through number.
    expect(address?.n).toBe(COORD.n);
    expect(address?.floor).toBe(COORD.floor);
    expect(address?.wall).toBe(2);
    expect(address?.shelf).toBe(3);
    expect(address?.volume).toBe(17);
    expect(address?.page).toBe(0);
    expect(address?.line).toBe(0);
  });

  it('returns null for every neighbor offset (books through a doorway are not clickable)', () => {
    for (const hitOffset of [
      { dn: 1, dfloor: 0 },
      { dn: -1, dfloor: 0 },
      { dn: 0, dfloor: 1 },
      { dn: 0, dfloor: -1 },
      { dn: 2, dfloor: 0 },
      { dn: -1, dfloor: 1 },
    ]) {
      expect(resolveBookAddress(COORD, hitOffset, 0)).toBeNull();
    }
  });

  it('round-trips bookToSlot(slotToBook(id)) === id across representative slots', () => {
    for (const slot of [0, 1, 31, 32, 159, 160, 320, 480, 505, 639]) {
      const { wall, shelf, volume } = slotToBook(slot);
      expect(bookToSlot(wall, shelf, volume)).toBe(slot);
      const address = resolveBookAddress(COORD, { dn: 0, dfloor: 0 }, slot);
      expect(address && bookToSlot(address.wall, address.shelf, address.volume)).toBe(slot);
    }
  });

  it('throws on an out-of-range instanceId (validated at the resolver seam)', () => {
    expect(() => resolveBookAddress(COORD, { dn: 0, dfloor: 0 }, BOOK_COUNT)).toThrow(RangeError);
    expect(() => resolveBookAddress(COORD, { dn: 0, dfloor: 0 }, -1)).toThrow(RangeError);
  });
});

describe('pageAddresses', () => {
  it('yields exactly 40 addresses with line 0..39 and the given page fixed', () => {
    const base = { ...COORD, wall: 1, shelf: 4, volume: 31, page: 0 };
    const addresses = pageAddresses(base, 217);
    expect(addresses).toHaveLength(40);
    addresses.forEach((a, i) => {
      expect(a.line).toBe(i);
      expect(a.page).toBe(217);
      expect(a.n).toBe(COORD.n);
      expect(a.floor).toBe(COORD.floor);
      expect(a.wall).toBe(1);
      expect(a.shelf).toBe(4);
      expect(a.volume).toBe(31);
    });
  });
});
