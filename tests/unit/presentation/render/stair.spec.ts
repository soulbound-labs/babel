import { describe, expect, it } from 'vitest';

import { MAX_STEP } from '@/presentation/render/player/collision';
import {
  LANDING_HALF_ANGLE,
  LANDING_OUTER_R,
  rampY,
  RISE_PER_TURN,
  STAIR_AXIS_X,
  STAIR_AXIS_Z,
  STAIR_INNER_R,
  STAIR_OUTER_R,
  stairSurfaceY,
  surfaceAt,
  TREAD_RISE,
  TREADS_PER_TURN,
} from '@/presentation/render/player/stair';
import {
  CEILING_HEIGHT,
  HEX_APOTHEM,
  VESTIBULE_DEPTH,
} from '@/presentation/render/room/dimensions';

const SITE = { x: STAIR_AXIS_X, z: STAIR_AXIS_Z };

describe('frozen cross-section (Unit 03 spec §7.3)', () => {
  it('rise per turn === CEILING_HEIGHT exactly', () => {
    expect(RISE_PER_TURN).toBe(CEILING_HEIGHT);
    expect(rampY(2 * Math.PI)).toBe(CEILING_HEIGHT);
  });

  it('12 treads per turn; tread rise ≈ 0.167 < MAX_STEP', () => {
    expect(TREADS_PER_TURN).toBe(12);
    expect(TREAD_RISE).toBeCloseTo(CEILING_HEIGHT / 12, 12);
    expect(TREAD_RISE).toBeLessThan(MAX_STEP);
  });

  it('axis sits in the alcove (KDD-1)', () => {
    expect(STAIR_AXIS_X).toBe(-0.55);
    expect(STAIR_AXIS_Z).toBe(-(HEX_APOTHEM + VESTIBULE_DEPTH - 0.9));
  });
});

describe('mouth azimuth repeats every floor (the deterministic up/down rule as geometry)', () => {
  it('θ = 0 is at floor level on every floor, −64..64', () => {
    for (let k = -64; k <= 64; k++) {
      expect(stairSurfaceY(0, k * CEILING_HEIGHT)).toBe(k * CEILING_HEIGHT);
      // Slightly off the exact level still snaps to the same landing tread.
      expect(stairSurfaceY(0, k * CEILING_HEIGHT + 0.05)).toBe(k * CEILING_HEIGHT);
    }
  });
});

describe('surface is monotone in θ', () => {
  it('tread tops never descend while climbing through 4 full turns', () => {
    let prev = -Infinity;
    for (let i = -2 * 360; i <= 2 * 360; i++) {
      const theta = (i / 360) * 2 * Math.PI; // unwrapped
      const wrapped = Math.atan2(Math.sin(theta), Math.cos(theta));
      const y = stairSurfaceY(wrapped, rampY(theta));
      expect(y).toBeGreaterThanOrEqual(prev);
      // The snap never strays more than half a tread from the ideal ramp.
      expect(Math.abs(y - rampY(theta))).toBeLessThanOrEqual(TREAD_RISE / 2 + 1e-9);
      prev = y;
    }
  });
});

describe('annulus + landing bounds', () => {
  it('inside the annulus ⇒ stair surface; outside all footprints ⇒ floor snap', () => {
    const rMid = (STAIR_INNER_R + STAIR_OUTER_R) / 2;
    // Mid-climb azimuth (θ = π, opposite the mouth), half a floor up.
    const p = { x: SITE.x + rMid * Math.sin(Math.PI), z: SITE.z + rMid * Math.cos(Math.PI) };
    const s = surfaceAt(p.x, p.z, CEILING_HEIGHT / 2, [SITE]);
    expect(s.surface).toBe('stair');
    expect(s.y).toBeCloseTo(CEILING_HEIGHT / 2, 1);

    const far = surfaceAt(SITE.x + 2.5, SITE.z, 0.01, [SITE]);
    expect(far.surface).toBe('floor');
    expect(far.y).toBe(0);

    const nearFloorMinus1 = surfaceAt(SITE.x + 2.5, SITE.z, -CEILING_HEIGHT + 0.02, [SITE]);
    expect(nearFloorMinus1.y).toBe(-CEILING_HEIGHT); // floors repeat; floor is negative here
  });

  it('inside the inner column radius is not stair (keep-out)', () => {
    const s = surfaceAt(SITE.x + 0.1, SITE.z + 0.1, 0.5, [SITE]);
    expect(s.surface).toBe('floor');
  });

  it('landing sector reaches past the annulus only near the mouth', () => {
    const rLanding = (STAIR_OUTER_R + LANDING_OUTER_R) / 2; // between annulus and landing edge
    const mouth = surfaceAt(SITE.x, SITE.z + rLanding, 0.02, [SITE]); // θ = 0
    expect(mouth.surface).toBe('stair');
    expect(mouth.y).toBe(0); // landing tread is AT floor level

    const side = surfaceAt(SITE.x + rLanding, SITE.z, 0.02, [SITE]); // θ = π/2 > LANDING_HALF_ANGLE
    expect(LANDING_HALF_ANGLE).toBeLessThan(Math.PI / 2);
    expect(side.surface).toBe('floor');
  });
});
