import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Coordinate } from '@/domain/entities';
import { WALKABLE_BOUND } from '@/presentation/traversal/bounds';
import { liveRooms, roomKey } from '@/presentation/traversal/working-set';

const interiorArb = fc.record({
  n: fc.bigInt({ min: -(WALKABLE_BOUND - 2n), max: WALKABLE_BOUND - 2n }),
  floor: fc.bigInt({ min: -(WALKABLE_BOUND - 1n), max: WALKABLE_BOUND - 1n }),
});

describe('KDD-3 — the constant 11-room working set', () => {
  it('size 11 everywhere in the interior', () => {
    fc.assert(
      fc.property(interiorArb, (c: Coordinate) => {
        expect(liveRooms(c)).toHaveLength(11);
      }),
    );
  });

  it('contains (n±1, floor) and (n, floor±1) — destinations always resident', () => {
    const c: Coordinate = { n: 3n, floor: -5n };
    const keys = new Set(liveRooms(c).map((s) => s.key));
    expect(keys.has('4:-5')).toBe(true);
    expect(keys.has('2:-5')).toBe(true);
    expect(keys.has('3:-4')).toBe(true);
    expect(keys.has('3:-6')).toBe(true);
    expect(keys.has('3:-5')).toBe(true);
    expect(keys.has('5:-5')).toBe(true); // n+2 on the current floor
    expect(keys.has('4:-4')).toBe(true); // diagonal within ±1 floor
  });

  it('clamps at n = 64: outward rooms simply absent', () => {
    const slots = liveRooms({ n: 64n, floor: 0n });
    expect(slots).toHaveLength(7); // 3 on the current floor + 2 each on floors ±1
    for (const s of slots) expect(s.coordinate.n <= 64n).toBe(true);
  });

  it('clamps at floor = ±64', () => {
    const top = liveRooms({ n: 0n, floor: 64n });
    expect(top).toHaveLength(8); // 5 current + 3 below, none above
    for (const s of top) expect(s.coordinate.floor <= 64n).toBe(true);

    const bottom = liveRooms({ n: 0n, floor: -64n });
    expect(bottom).toHaveLength(8);
    for (const s of bottom) expect(s.coordinate.floor >= -64n).toBe(true);
  });

  it('corner (64, 64): 5 rooms', () => {
    expect(liveRooms({ n: 64n, floor: 64n })).toHaveLength(5);
  });

  it('keys use the frozen `${n}:${floor}` serialization, correct for negative floors', () => {
    expect(roomKey({ n: -3n, floor: -64n })).toBe('-3:-64');
    expect(roomKey({ n: 0n, floor: 0n })).toBe('0:0');
    const slot = liveRooms({ n: -3n, floor: -64n }).find((s) => s.dn === 0 && s.dfloor === 0);
    expect(slot?.key).toBe('-3:-64');
  });

  it('deltas are small numbers: |dn| ≤ 2, |dfloor| ≤ 1, consistent with the coordinate', () => {
    fc.assert(
      fc.property(interiorArb, (c: Coordinate) => {
        for (const s of liveRooms(c)) {
          expect(Math.abs(s.dn)).toBeLessThanOrEqual(2);
          expect(Math.abs(s.dfloor)).toBeLessThanOrEqual(1);
          expect(s.coordinate.n - c.n).toBe(BigInt(s.dn));
          expect(s.coordinate.floor - c.floor).toBe(BigInt(s.dfloor));
        }
      }),
    );
  });

  it('purity: same coordinate ⇒ identical set', () => {
    fc.assert(
      fc.property(interiorArb, (c: Coordinate) => {
        expect(liveRooms(c)).toEqual(liveRooms(c));
      }),
    );
  });
});
