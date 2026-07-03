import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  ENTRANCE_BLOCK_DEPTH,
  isWalkable,
  RAILING_KEEPOUT,
  resolveMovement,
  STAIR_ZONE_DEPTH,
} from '@/presentation/render/player/collision';
import { EYE_HEIGHT, HEX_APOTHEM, VESTIBULE_DEPTH } from '@/presentation/render/room/dimensions';

const SPAWN = { x: 0, y: EYE_HEIGHT, z: HEX_APOTHEM - 0.55 };
const EPS = 1e-6;

// Global outer bounds of the walkable region (hexagon + alcove + vestibule).
const Z_MAX = HEX_APOTHEM + ENTRANCE_BLOCK_DEPTH;
const Z_MIN = -(HEX_APOTHEM + VESTIBULE_DEPTH - STAIR_ZONE_DEPTH);

function walk(start: { x: number; y: number; z: number }, deltas: { x: number; z: number }[]) {
  let p = start;
  for (const d of deltas) p = resolveMovement(p, { x: d.x, y: 0, z: d.z });
  return p;
}

describe('INV-R4 — containment (property)', () => {
  it('spawn is walkable', () => {
    expect(isWalkable(SPAWN)).toBe(true);
  });

  // 10⁴ runs × ≤25 steps takes ~6 s on a slow CI runner — past vitest's 5 s default.
  const CONTAINMENT_TIMEOUT_MS = 60_000;

  it(
    'no sequence of movement deltas escapes the walkable region (10⁴ random walks)',
    { timeout: CONTAINMENT_TIMEOUT_MS },
    () => {
      const delta = fc.record({
        x: fc.double({ min: -0.35, max: 0.35, noNaN: true }),
        z: fc.double({ min: -0.35, max: 0.35, noNaN: true }),
      });
      fc.assert(
        fc.property(fc.array(delta, { minLength: 1, maxLength: 25 }), (deltas) => {
          let p = SPAWN;
          for (const d of deltas) {
            p = resolveMovement(p, { x: d.x, y: 0, z: d.z });
            expect(isWalkable(p)).toBe(true);
            // Never inside the railing ring.
            expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(RAILING_KEEPOUT - EPS);
            // Never beyond the doorway blockers.
            expect(p.z).toBeLessThanOrEqual(Z_MAX + EPS);
            expect(p.z).toBeGreaterThanOrEqual(Z_MIN - EPS);
            // y untouched by collision (flat floor).
            expect(p.y).toBe(EYE_HEIGHT);
          }
        }),
        { numRuns: 10_000 },
      );
    },
  );

  it('rejects non-finite deltas (stays put, never NaNs)', () => {
    expect(resolveMovement(SPAWN, { x: NaN, y: 0, z: 0.1 })).toEqual(SPAWN);
    expect(resolveMovement(SPAWN, { x: Infinity, y: 0, z: 0 })).toEqual(SPAWN);
  });
});

describe('directed cases', () => {
  it('doorway pass-through: walking -z near side 3 reaches the vestibule', () => {
    const start = { x: 0, y: EYE_HEIGHT, z: -1.3 };
    expect(isWalkable(start)).toBe(true);
    const end = walk(
      start,
      Array.from({ length: 8 }, () => ({ x: 0, z: -0.2 })),
    );
    expect(end.z).toBeLessThan(-(HEX_APOTHEM + 0.2)); // past the side-3 wall plane
    expect(isWalkable(end)).toBe(true);
  });

  it('vestibule ends at the stair mouth: -z run stops at the far blocker', () => {
    const start = { x: 0, y: EYE_HEIGHT, z: -2.2 };
    const end = walk(
      start,
      Array.from({ length: 12 }, () => ({ x: 0, z: -0.2 })),
    );
    expect(end.z).toBeGreaterThanOrEqual(Z_MIN - EPS);
    expect(end.z).toBeLessThan(Z_MIN + 0.05); // pressed against it, not short of it
  });

  it('railing stops a straight run at the shaft', () => {
    const end = walk(
      SPAWN,
      Array.from({ length: 10 }, () => ({ x: 0, z: -0.2 })),
    );
    const dist = Math.hypot(end.x, end.z);
    expect(dist).toBeGreaterThanOrEqual(RAILING_KEEPOUT - EPS);
    expect(dist).toBeLessThan(RAILING_KEEPOUT + 0.05); // pressed against the railing
  });

  it('entrance is blocked just past the threshold', () => {
    const end = walk(
      SPAWN,
      Array.from({ length: 10 }, () => ({ x: 0, z: 0.2 })),
    );
    expect(end.z).toBeGreaterThan(HEX_APOTHEM); // through the doorway…
    expect(end.z).toBeLessThanOrEqual(Z_MAX + EPS); // …but not past the blocker
  });

  it('sliding along a book wall keeps the player inside the hexagon', () => {
    const end = walk(
      SPAWN,
      Array.from({ length: 15 }, () => ({ x: 0.2, z: 0.05 })),
    );
    expect(isWalkable(end)).toBe(true);
    expect(Math.hypot(end.x, end.z)).toBeLessThan(HEX_APOTHEM);
  });
});
