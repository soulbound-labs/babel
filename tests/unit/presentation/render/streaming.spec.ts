import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Coordinate } from '@/domain/entities';
import { WALKABLE_BOUND } from '@/presentation/traversal/bounds';
import { liveRooms } from '@/presentation/traversal/working-set';
import { ROOM_DRIFT_X, ROOM_PITCH } from '@/presentation/render/world/origin';
import { roomPosition, streamTransforms } from '@/presentation/render/world/streaming';
import { CEILING_HEIGHT } from '@/presentation/render/room/dimensions';

const interiorArb = fc.record({
  n: fc.bigInt({ min: -(WALKABLE_BOUND - 2n), max: WALKABLE_BOUND - 2n }),
  floor: fc.bigInt({ min: -(WALKABLE_BOUND - 1n), max: WALKABLE_BOUND - 1n }),
});

describe('streaming transforms are pure small-delta math (T-6)', () => {
  it('transforms derive from deltas |Δn| ≤ 2, |Δfloor| ≤ 1 — bounded local floats', () => {
    fc.assert(
      fc.property(interiorArb, (c: Coordinate) => {
        const transforms = streamTransforms(liveRooms(c));
        expect(transforms).toHaveLength(11);
        for (const t of transforms) {
          expect(Math.abs(t.slot.dn)).toBeLessThanOrEqual(2);
          expect(Math.abs(t.slot.dfloor)).toBeLessThanOrEqual(1);
          expect(t.position.x).toBeCloseTo(t.slot.dn * ROOM_DRIFT_X, 12);
          expect(t.position.y).toBeCloseTo(t.slot.dfloor * CEILING_HEIGHT, 12);
          expect(t.position.z).toBeCloseTo(-t.slot.dn * ROOM_PITCH, 12);
          expect(Math.abs(t.position.z)).toBeLessThanOrEqual(2 * ROOM_PITCH);
        }
      }),
    );
  });

  it('edge clamping honored: absent rooms produce no transforms', () => {
    const atEdge = streamTransforms(liveRooms({ n: 64n, floor: 0n }));
    expect(atEdge).toHaveLength(7);
    for (const t of atEdge) expect(t.slot.coordinate.n <= 64n).toBe(true);
  });

  it('purity: same coordinate ⇒ identical transforms', () => {
    fc.assert(
      fc.property(interiorArb, (c: Coordinate) => {
        expect(streamTransforms(liveRooms(c))).toEqual(streamTransforms(liveRooms(c)));
      }),
    );
  });

  it('the current room anchors the frame: dn = dfloor = 0 ⇒ zero offset', () => {
    expect(roomPosition(0, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
