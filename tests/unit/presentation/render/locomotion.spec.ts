import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ORIGIN } from '@/domain/entities';
import {
  clampPitch,
  createLocomotionState,
  MAX_FRAME_DELTA,
  stepLocomotion,
} from '@/presentation/render/player/locomotion';
import type { LocomotionInput } from '@/presentation/render/player/locomotion';
import { SPAWN_POSE } from '@/presentation/render/debug/poses';
import { STAIR_AXIS_X, STAIR_AXIS_Z } from '@/presentation/render/player/stair';
import {
  CEILING_HEIGHT,
  EYE_HEIGHT,
  POSE_PITCH_MAX,
  WALK_SPEED,
} from '@/presentation/render/room/dimensions';

const idleInput = (overrides: Partial<LocomotionInput> = {}): LocomotionInput => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  yaw: 0,
  pitch: 0,
  ...overrides,
});

const spawn = () => createLocomotionState(SPAWN_POSE);

describe('INV-R5 — seam integrity (pure step logic)', () => {
  it('state is a valid PlayerState with coordinate === ORIGIN', () => {
    const s = spawn();
    expect(s.player.coordinate).toBe(ORIGIN);
    expect(s.player.localPosition.y).toBe(EYE_HEIGHT);
    expect(Number.isFinite(s.player.yaw)).toBe(true);
    expect(Math.abs(s.player.pitch)).toBeLessThanOrEqual(POSE_PITCH_MAX);
  });

  it('walking forward moves the player; y stays locked to EYE_HEIGHT', () => {
    let s = spawn();
    const input = idleInput({ forward: true, yaw: s.player.yaw });
    for (let i = 0; i < 30; i++) s = stepLocomotion(s, input, 1 / 60);
    const moved = Math.hypot(
      s.player.localPosition.x - SPAWN_POSE.position.x,
      s.player.localPosition.z - SPAWN_POSE.position.z,
    );
    expect(moved).toBeGreaterThan(0.1);
    expect(s.player.localPosition.y).toBe(EYE_HEIGHT);
    expect(s.player.coordinate).toBe(ORIGIN);
  });

  it('suspend() stops input→movement', () => {
    const s = { ...spawn(), suspended: true };
    const after = stepLocomotion(s, idleInput({ forward: true }), 1 / 60);
    expect(after).toBe(s); // exactly unchanged — the camera belongs to the suspender
  });

  it('resume() restores movement from wherever the pose was returned', () => {
    const moved = {
      ...spawn(),
      player: { ...spawn().player, localPosition: { x: 0.4, y: EYE_HEIGHT, z: 0.9 }, yaw: 1.2 },
      suspended: false, // what resume() sets
    };
    const after = stepLocomotion(moved, idleInput({ forward: true, yaw: 1.2 }), 1 / 60);
    expect(after.player.localPosition).not.toEqual(moved.player.localPosition);
  });

  it('pitch is clamped to ±POSE_PITCH_MAX', () => {
    expect(clampPitch(Math.PI)).toBe(POSE_PITCH_MAX);
    expect(clampPitch(-Math.PI)).toBe(-POSE_PITCH_MAX);
    const s = stepLocomotion(spawn(), idleInput({ pitch: 10 }), 1 / 60);
    expect(s.player.pitch).toBe(POSE_PITCH_MAX);
  });

  it('surface mode: stair positions ride the tread-top helix, floor stays slab-locked', () => {
    // Mid-annulus at the mouth azimuth (tread 0 — floor level).
    const onStair = {
      ...spawn(),
      player: {
        ...spawn().player,
        localPosition: { x: STAIR_AXIS_X, y: EYE_HEIGHT, z: STAIR_AXIS_Z + 0.48 },
      },
    };
    const s1 = stepLocomotion(onStair, idleInput(), 1 / 60);
    expect(s1.surface).toBe('stair');
    expect(s1.player.localPosition.y).toBe(EYE_HEIGHT); // tread 0 is AT floor level

    // Half a floor up the helix (θ = π side) — y follows the tread top.
    const midClimb = {
      ...spawn(),
      player: {
        ...spawn().player,
        localPosition: {
          x: STAIR_AXIS_X,
          y: CEILING_HEIGHT / 2 + EYE_HEIGHT,
          z: STAIR_AXIS_Z - 0.48,
        },
      },
    };
    const s2 = stepLocomotion(midClimb, idleInput(), 1 / 60);
    expect(s2.surface).toBe('stair');
    expect(s2.player.localPosition.y).toBeCloseTo(CEILING_HEIGHT / 2 + EYE_HEIGHT, 1);

    // Spawn is flat floor.
    const s3 = stepLocomotion(spawn(), idleInput(), 1 / 60);
    expect(s3.surface).toBe('floor');
    expect(s3.player.localPosition.y).toBe(EYE_HEIGHT);
  });

  it('analog property: absent ≡ explicit zero — the boolean path is character-identical', () => {
    const angle = fc.double({ min: -Math.PI, max: Math.PI, noNaN: true, noDefaultInfinity: true });
    fc.assert(
      fc.property(
        fc.record({
          forward: fc.boolean(),
          back: fc.boolean(),
          left: fc.boolean(),
          right: fc.boolean(),
          yaw: angle,
          pitch: angle,
        }),
        fc.integer({ min: 1, max: 30 }),
        (base, steps) => {
          let absent = spawn();
          let zeroed = spawn();
          for (let i = 0; i < steps; i++) {
            absent = stepLocomotion(absent, { ...base, analog: undefined }, 1 / 60);
            zeroed = stepLocomotion(zeroed, { ...base, analog: { f: 0, r: 0 } }, 1 / 60);
          }
          expect(zeroed).toEqual(absent);
        },
      ),
    );
  });

  it('analog magnitude 0.5 settles to half walk speed', () => {
    let s = spawn();
    const input = idleInput({ analog: { f: 0.5, r: 0 } });
    for (let i = 0; i < 120; i++) s = stepLocomotion(s, input, 1 / 60);
    expect(Math.hypot(s.velocity.x, s.velocity.z)).toBeCloseTo(WALK_SPEED / 2, 3);
  });

  it('analog magnitude 2 clamps to walk speed (M-3: touch never outruns the keyboard)', () => {
    let s = spawn();
    const input = idleInput({ analog: { f: 2, r: 0 } });
    for (let i = 0; i < 120; i++) s = stepLocomotion(s, input, 1 / 60);
    expect(Math.hypot(s.velocity.x, s.velocity.z)).toBeCloseTo(WALK_SPEED, 3);
  });

  it('analog with delta 30 displaces at most WALK_SPEED × MAX_FRAME_DELTA', () => {
    let s = spawn();
    const input = idleInput({ analog: { f: 1, r: 0 } });
    for (let i = 0; i < 20; i++) s = stepLocomotion(s, input, 1 / 60);
    const before = s.player.localPosition;
    s = stepLocomotion(s, input, 30);
    const jump = Math.hypot(
      s.player.localPosition.x - before.x,
      s.player.localPosition.z - before.z,
    );
    expect(jump).toBeLessThanOrEqual(WALK_SPEED * MAX_FRAME_DELTA + 1e-9);
  });

  it('delta is clamped (E8): a stalled tab cannot teleport the player', () => {
    let s = spawn();
    // Pre-warm velocity, then hit it with a 10-second frame.
    const input = idleInput({ forward: true });
    for (let i = 0; i < 20; i++) s = stepLocomotion(s, input, 1 / 60);
    const before = s.player.localPosition;
    s = stepLocomotion(s, input, 10);
    const jump = Math.hypot(
      s.player.localPosition.x - before.x,
      s.player.localPosition.z - before.z,
    );
    expect(jump).toBeLessThanOrEqual(WALK_SPEED * MAX_FRAME_DELTA + 1e-9);
  });
});
