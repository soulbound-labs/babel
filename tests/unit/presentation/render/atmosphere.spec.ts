import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  atmosphereAt,
  DEFAULT_ATMOSPHERE,
  RAMP,
} from '@/presentation/render/atmosphere/atmosphere';

/** Distances span comfortably past the ramp on both sides of the boundary. */
const distArb = fc.double({ min: 0, max: 3 * RAMP.width, noNaN: true });

describe('edge-fog knob (§4.4)', () => {
  it('identity clause: outside the ramp zone the profile IS DEFAULT_ATMOSPHERE (strict)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: RAMP.width, max: 3 * RAMP.width, noNaN: true }),
        fc.double({ min: RAMP.width, max: 3 * RAMP.width, noNaN: true }),
        (rooms, floors) => {
          // Both distances at or beyond the ramp ⇒ byte-identical interior experience.
          expect(atmosphereAt(rooms, floors)).toBe(DEFAULT_ATMOSPHERE);
        },
      ),
    );
  });

  it('only fogDensity ever differs from the default — never color/exposure/ambient/background', () => {
    fc.assert(
      fc.property(distArb, distArb, (rooms, floors) => {
        const p = atmosphereAt(rooms, floors);
        expect(p.fogColor).toBe(DEFAULT_ATMOSPHERE.fogColor);
        expect(p.background).toBe(DEFAULT_ATMOSPHERE.background);
        expect(p.toneMappingExposure).toBe(DEFAULT_ATMOSPHERE.toneMappingExposure);
        expect(p.ambientIntensity).toBe(DEFAULT_ATMOSPHERE.ambientIntensity);
      }),
    );
  });

  it('density is monotonic non-increasing as distance-to-edge grows (thicker toward the edge)', () => {
    fc.assert(
      fc.property(distArb, distArb, (a, b) => {
        const near = Math.min(a, b);
        const far = Math.max(a, b);
        // Same floors distance held large; vary the rooms distance only.
        const closer = atmosphereAt(near, 3 * RAMP.width).fogDensity;
        const farther = atmosphereAt(far, 3 * RAMP.width).fogDensity;
        expect(closer).toBeGreaterThanOrEqual(farther);
      }),
    );
  });

  it('density is bounded by [default, max] and peaks at the edge', () => {
    fc.assert(
      fc.property(distArb, distArb, (rooms, floors) => {
        const d = atmosphereAt(rooms, floors).fogDensity;
        expect(d).toBeGreaterThanOrEqual(DEFAULT_ATMOSPHERE.fogDensity);
        expect(d).toBeLessThanOrEqual(RAMP.maxDensity);
      }),
    );
    expect(atmosphereAt(0, 0).fogDensity).toBeCloseTo(RAMP.maxDensity, 12);
  });

  it('the nearer edge governs: min(rooms, floors) drives the density', () => {
    // A near floor edge thickens fog even with the rooms axis deep in the interior.
    expect(atmosphereAt(3 * RAMP.width, 0).fogDensity).toBeCloseTo(RAMP.maxDensity, 12);
    expect(atmosphereAt(0, 3 * RAMP.width).fogDensity).toBeCloseTo(RAMP.maxDensity, 12);
  });

  it('purity: same inputs ⇒ deep-equal profile', () => {
    fc.assert(
      fc.property(distArb, distArb, (rooms, floors) => {
        expect(atmosphereAt(rooms, floors)).toEqual(atmosphereAt(rooms, floors));
      }),
    );
  });
});
