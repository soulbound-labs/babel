import { describe, expect, it } from 'vitest';

import { reduce } from '@/domain/entities';
import type { Move } from '@/domain/entities';
import { canMove } from '@/presentation/traversal/bounds';
import { createTraversal, crossThreshold } from '@/presentation/traversal/traversal';
import {
  commitShift,
  detectCommit,
  ENTRANCE_PLANE_Z,
  FAR_PLANE_Z,
  INITIAL_TRACKER,
} from '@/presentation/render/world/origin';
import type { OriginTracker } from '@/presentation/render/world/origin';
import { createLocomotionState, stepLocomotion } from '@/presentation/render/player/locomotion';
import type { LocomotionInput } from '@/presentation/render/player/locomotion';
import { JOYSTICK_DEADZONE } from '@/presentation/render/player/touch-input';
import { SPAWN_POSE } from '@/presentation/render/debug/poses';

/**
 * Traversal safety under analog input (mobile spec §3.2/§6): sub-centimeter
 * analog steps must behave exactly like keyboard steps at the commit planes —
 * one crossing ⇒ one move, jitter self-cancels, the ±64 refusal latch holds.
 * Per-frame distances come from the REAL analog kinematics (stepLocomotion at
 * a just-over-deadzone magnitude); the plane walk is synthetic feet-space,
 * mirroring the controller's same-frame re-base (origin.spec idiom).
 */
function analogCrawlDistances(frames: number): number[] {
  let s = createLocomotionState(SPAWN_POSE);
  const input: LocomotionInput = {
    forward: false,
    back: false,
    left: false,
    right: false,
    yaw: SPAWN_POSE.yaw,
    pitch: 0,
    analog: { f: JOYSTICK_DEADZONE + 0.05, r: 0 },
  };
  const distances: number[] = [];
  for (let i = 0; i < frames; i++) {
    const prev = s.player.localPosition;
    s = stepLocomotion(s, input, 1 / 60);
    distances.push(
      Math.hypot(s.player.localPosition.x - prev.x, s.player.localPosition.z - prev.z),
    );
  }
  return distances;
}

describe('analog traversal safety (detect → gate → apply pipeline)', () => {
  it('a slow analog crawl across FAR_PLANE_Z emits exactly one forward', () => {
    const distances = analogCrawlDistances(400);
    expect(Math.max(...distances)).toBeGreaterThan(0); // the crawl actually moves
    let traversal = createTraversal();
    let tracker: OriginTracker = INITIAL_TRACKER;
    let z = FAR_PLANE_Z + 0.05; // approaching the far door threshold
    const commits: Move[] = [];
    for (const d of distances) {
      const prevZ = z;
      z -= d; // outbound crawl (−z)
      const step = detectCommit(tracker, { x: 0.55, y: 0, z: prevZ }, { x: 0.55, y: 0, z }, (m) =>
        canMove(traversal.coordinate, m),
      );
      tracker = step.tracker;
      if (step.commit !== null) {
        traversal = crossThreshold(traversal, step.commit);
        commits.push(step.commit);
        z += commitShift(step.commit).z; // same-frame re-base
      }
    }
    expect(commits).toEqual(['forward']);
    expect(traversal.coordinate).toEqual(reduce(['forward']));
  });

  it('jitter at the shared plane yields cancelling pairs with coordinate === reduce(moveLog)', () => {
    let traversal = createTraversal();
    let tracker: OriginTracker = INITIAL_TRACKER;
    const eps = 0.006; // sub-centimeter thumb jitter
    let z = ENTRANCE_PLANE_Z - 0.004;
    for (let i = 0; i < 50; i++) {
      const prevZ = z;
      z += i % 2 === 0 ? eps : -eps;
      const step = detectCommit(tracker, { x: 0, y: 0, z: prevZ }, { x: 0, y: 0, z }, (m) =>
        canMove(traversal.coordinate, m),
      );
      tracker = step.tracker;
      if (step.commit !== null) {
        traversal = crossThreshold(traversal, step.commit);
        z += commitShift(step.commit).z;
      }
    }
    // Every crossing committed and every pair cancels: the log IS the coordinate.
    expect(traversal.moveLog.length).toBe(50);
    expect(traversal.coordinate).toEqual(reduce([...traversal.moveLog]));
    expect(traversal.coordinate).toEqual(reduce([]));
  });

  it('a crawl into the −64 dead-end latches; the homeward re-crossing clears WITHOUT emitting', () => {
    const start = reduce(Array.from({ length: 64 }, (): Move => 'back'));
    const traversal = createTraversal(start);
    let tracker: OriginTracker = INITIAL_TRACKER;
    let z = ENTRANCE_PLANE_Z - 0.01;

    // Outbound crawl into the dead-end: the 65th 'back' must be refused + latched.
    for (let i = 0; i < 10; i++) {
      const prevZ = z;
      z += 0.005;
      const step = detectCommit(tracker, { x: 0, y: 0, z: prevZ }, { x: 0, y: 0, z }, (m) =>
        canMove(traversal.coordinate, m),
      );
      tracker = step.tracker;
      expect(step.commit).toBeNull();
    }
    expect(tracker.latched).toBe('back');
    expect(traversal.moveLog).toEqual([]);

    // Homeward crawl: the latch clears without a phantom inverse move.
    for (let i = 0; i < 20; i++) {
      const prevZ = z;
      z -= 0.005;
      const step = detectCommit(tracker, { x: 0, y: 0, z: prevZ }, { x: 0, y: 0, z }, (m) =>
        canMove(traversal.coordinate, m),
      );
      tracker = step.tracker;
      expect(step.commit).toBeNull();
    }
    expect(tracker.latched).toBeNull();
    expect(traversal.moveLog).toEqual([]);
    expect(traversal.coordinate).toEqual(start);
  });
});
