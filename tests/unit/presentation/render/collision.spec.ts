import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createCollisionContext,
  ENTRANCE_BLOCK_DEPTH,
  isWalkable,
  MAX_STEP,
  ORIGIN_ROOM_CONTEXT,
  RAILING_KEEPOUT,
  resolveMovement,
} from '@/presentation/render/player/collision';
import {
  STAIR_AXIS_X,
  STAIR_AXIS_Z,
  STAIR_INNER_R,
  STAIR_OUTER_R,
  surfaceAt,
} from '@/presentation/render/player/stair';
import {
  CEILING_HEIGHT,
  EYE_HEIGHT,
  HEX_APOTHEM,
  VESTIBULE_DEPTH,
} from '@/presentation/render/room/dimensions';

const SPAWN = { x: 0, y: EYE_HEIGHT, z: HEX_APOTHEM - 0.55 };
const EPS = 1e-6;

// Global outer bounds of the single-room walkable region (hexagon + vestibule + alcove/stair).
const Z_MAX = HEX_APOTHEM + ENTRANCE_BLOCK_DEPTH;
const Z_MIN = -(HEX_APOTHEM + VESTIBULE_DEPTH); // alcove landing reaches exactly the far wall plane

const AXIS = { x: STAIR_AXIS_X, z: STAIR_AXIS_Z };

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
            // Never inside the railing ring (the stair annulus is far from the room center).
            expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(RAILING_KEEPOUT - EPS);
            // Never beyond the entrance blocker or the vestibule far wall.
            expect(p.z).toBeLessThanOrEqual(Z_MAX + EPS);
            expect(p.z).toBeGreaterThanOrEqual(Z_MIN - EPS);
            // y untouched by collision (the surface model owns it).
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

describe('directed cases — single room (edge-like: both horizontal exits blocked)', () => {
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

  it('walk lane passes the old stair-mouth line and stops at the far wall (blocker replaced — Unit 04)', () => {
    const start = { x: 0.55, y: EYE_HEIGHT, z: -2.2 };
    expect(isWalkable(start)).toBe(true);
    const end = walk(
      start,
      Array.from({ length: 14 }, () => ({ x: 0, z: -0.2 })),
    );
    // Past the Unit 03 STAIR_ZONE blocker line (z = -3.032)…
    expect(end.z).toBeLessThan(-3.1);
    // …stopped by the far wall (no resident forward neighbor ⇒ far door blocked by construction).
    expect(end.z).toBeGreaterThanOrEqual(Z_MIN - EPS);
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

describe('stair walkability (§4.2.2)', () => {
  it('annulus and landing are walkable; the stairwell column is not', () => {
    const rMid = (STAIR_INNER_R + STAIR_OUTER_R) / 2;
    expect(isWalkable({ x: AXIS.x, y: EYE_HEIGHT, z: AXIS.z + rMid })).toBe(true); // mouth
    expect(isWalkable({ x: AXIS.x, y: EYE_HEIGHT, z: AXIS.z - rMid })).toBe(true); // opposite side
    expect(isWalkable({ x: AXIS.x, y: EYE_HEIGHT, z: AXIS.z })).toBe(false); // the column
    expect(isWalkable({ x: AXIS.x, y: EYE_HEIGHT, z: AXIS.z + 0.75 })).toBe(true); // landing sector
  });

  it('a full helix turn is walkable and climbs exactly CEILING_HEIGHT', () => {
    const r = 0.48;
    let p = { x: AXIS.x, y: EYE_HEIGHT, z: AXIS.z + 0.75 }; // on the landing, θ = 0
    expect(isWalkable(p)).toBe(true);
    let feetY = 0;
    const steps = 96; // 3.75°/step — arc length ≈ 0.03 ≤ MAX_STEP
    for (let k = 0; k <= steps; k++) {
      const theta = (k / steps) * 2 * Math.PI;
      const target = { x: AXIS.x + r * Math.sin(theta), z: AXIS.z + r * Math.cos(theta) };
      p = resolveMovement(p, { x: target.x - p.x, y: 0, z: target.z - p.z });
      expect(isWalkable(p)).toBe(true);
      const s = surfaceAt(p.x, p.z, feetY, ORIGIN_ROOM_CONTEXT.stairs);
      expect(s.surface).toBe('stair');
      expect(Math.abs(s.y - feetY)).toBeLessThanOrEqual(MAX_STEP); // tread-quantized steps resolve
      expect(s.y).toBeGreaterThanOrEqual(feetY); // monotone climb
      feetY = s.y;
    }
    expect(feetY).toBe(CEILING_HEIGHT); // one full turn = one floor, exactly
    expect(Math.hypot(p.x - AXIS.x, p.z - (AXIS.z + r))).toBeLessThan(0.05); // back at the mouth azimuth
  });
});

describe('multi-room context (room-relative cells)', () => {
  const ROOM_PITCH = 2 * HEX_APOTHEM + VESTIBULE_DEPTH;
  const DRIFT_X = 0.55;
  // A 3-room corridor: back room is an edge (entrance blocked); front room's far
  // door is blocked by construction (no farther neighbor in the context).
  const ctx = createCollisionContext([
    { offset: { x: -DRIFT_X, z: ROOM_PITCH }, entranceOpen: false },
    { offset: { x: 0, z: 0 }, entranceOpen: true },
    { offset: { x: DRIFT_X, z: -ROOM_PITCH }, entranceOpen: true },
  ]);
  const GLOBAL_Z_MAX = ROOM_PITCH + HEX_APOTHEM + ENTRANCE_BLOCK_DEPTH;
  const GLOBAL_Z_MIN = -ROOM_PITCH - (HEX_APOTHEM + VESTIBULE_DEPTH);

  it('corridor traversal: the far door leads into the next room', () => {
    const waypoints = [
      { x: 0, z: -1.0 },
      { x: 0, z: -2.2 }, // through the side-3 doorway
      { x: 0.55, z: -2.2 }, // sidestep into the walk lane
      { x: 0.55, z: -4.6 }, // down the lane, through the far door (next room's throat)
      { x: 0.55, z: -5.3 }, // inside the next hexagon
    ];
    let p = SPAWN;
    for (const w of waypoints) {
      for (let i = 0; i < 40; i++) {
        const d = { x: w.x - p.x, z: w.z - p.z };
        const len = Math.hypot(d.x, d.z);
        if (len < 1e-3) break;
        const s = Math.min(1, 0.2 / len);
        p = resolveMovement(p, { x: d.x * s, y: 0, z: d.z * s }, ctx);
      }
      expect(isWalkable(p, ctx)).toBe(true);
    }
    expect(p.z).toBeLessThan(-4.6); // through the shared plane (z = -4.132), well inside room n+1
  });

  it(
    'seeded random walks over stair + open doorways: never escapes, never NaNs, y stays coherent',
    { timeout: 60_000 },
    () => {
      const delta = fc.record({
        x: fc.double({ min: -0.35, max: 0.35, noNaN: true }),
        z: fc.double({ min: -0.35, max: 0.35, noNaN: true }),
      });
      fc.assert(
        fc.property(fc.array(delta, { minLength: 1, maxLength: 25 }), (deltas) => {
          let p = SPAWN;
          let feetY = 0;
          for (const d of deltas) {
            p = resolveMovement(p, { x: d.x, y: 0, z: d.z }, ctx);
            expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
            expect(isWalkable(p, ctx)).toBe(true);
            // Edge rooms never exited outward.
            expect(p.z).toBeLessThanOrEqual(GLOBAL_Z_MAX + EPS);
            expect(p.z).toBeGreaterThanOrEqual(GLOBAL_Z_MIN - EPS);
            const s = surfaceAt(p.x, p.z, feetY, ctx.stairs);
            expect(Number.isFinite(s.y)).toBe(true);
            expect(Math.abs(s.y - feetY)).toBeLessThanOrEqual(MAX_STEP + EPS); // never a cliff
            feetY = s.y;
          }
        }),
        { numRuns: 400, seed: 0xbabe1 },
      );
    },
  );
});
