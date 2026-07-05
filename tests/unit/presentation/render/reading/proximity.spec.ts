import { describe, expect, it } from 'vitest';

import {
  nearestFacingSlot,
  PROXIMITY_MAX_DISTANCE,
  PROXIMITY_MIN_FACING_DOT,
} from '@/presentation/render/reading/proximity';

const OPTS = { maxDistance: PROXIMITY_MAX_DISTANCE, minFacingDot: PROXIMITY_MIN_FACING_DOT };
/** Eye at origin looking down -z (the 0-yaw convention). */
const pose = { position: { x: 0, y: 1.7, z: 0 }, forward: { x: 0, y: 0, z: -1 } };

describe('nearestFacingSlot', () => {
  it('picks the expected slot straight ahead', () => {
    const slots = [
      { slot: 7, position: { x: 0, y: 1.7, z: -2 } },
      { slot: 9, position: { x: 0, y: 1.7, z: -3 } },
    ];
    expect(nearestFacingSlot(pose, slots, OPTS)).toBe(7);
  });

  it('the nearest of several facing candidates wins', () => {
    const slots = [
      { slot: 1, position: { x: 0.5, y: 1.7, z: -2.5 } },
      { slot: 2, position: { x: -0.2, y: 1.7, z: -1.2 } },
      { slot: 3, position: { x: 0, y: 1.7, z: -3.0 } },
    ];
    expect(nearestFacingSlot(pose, slots, OPTS)).toBe(2);
  });

  it('is null when the only candidate is behind the camera', () => {
    const slots = [{ slot: 4, position: { x: 0, y: 1.7, z: 2 } }];
    expect(nearestFacingSlot(pose, slots, OPTS)).toBeNull();
  });

  it('is null beyond maxDistance', () => {
    const slots = [{ slot: 5, position: { x: 0, y: 1.7, z: -(PROXIMITY_MAX_DISTANCE + 0.1) } }];
    expect(nearestFacingSlot(pose, slots, OPTS)).toBeNull();
  });

  it('facing threshold: at the dot boundary is accepted, below is rejected', () => {
    // A candidate at distance 2 whose direction has dot exactly minFacingDot.
    const d = 2;
    const dot = PROXIMITY_MIN_FACING_DOT;
    const lateral = Math.sqrt(1 - dot * dot);
    const at = { slot: 6, position: { x: lateral * d, y: 1.7, z: -dot * d } };
    expect(nearestFacingSlot(pose, [at], OPTS)).toBe(6);

    const beyond = {
      slot: 6,
      position: { x: Math.sqrt(1 - (dot - 0.05) ** 2) * d, y: 1.7, z: -(dot - 0.05) * d },
    };
    expect(nearestFacingSlot(pose, [beyond], OPTS)).toBeNull();
  });

  it('a candidate at zero distance is skipped, never a division by zero', () => {
    const slots = [{ slot: 8, position: { x: 0, y: 1.7, z: 0 } }];
    expect(nearestFacingSlot(pose, slots, OPTS)).toBeNull();
  });

  it('is null for an empty candidate set', () => {
    expect(nearestFacingSlot(pose, [], OPTS)).toBeNull();
  });
});
