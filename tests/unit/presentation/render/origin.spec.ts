import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { reduce } from '@/domain/entities';
import type { Move } from '@/domain/entities';
import { canMove } from '@/presentation/traversal/bounds';
import { createTraversal, crossThreshold } from '@/presentation/traversal/traversal';
import {
  COMMIT_HYSTERESIS,
  commitShift,
  detectCommit,
  ENTRANCE_PLANE_Z,
  FAR_PLANE_Z,
  INITIAL_TRACKER,
  ROOM_DRIFT_X,
  ROOM_PITCH,
  VERTICAL_COMMIT_PLANE,
  worldShift,
} from '@/presentation/render/world/origin';
import type { LocalShift, OriginTracker } from '@/presentation/render/world/origin';
import {
  CEILING_HEIGHT,
  HEX_APOTHEM,
  VESTIBULE_DEPTH,
} from '@/presentation/render/room/dimensions';

const MOVES: readonly Move[] = ['forward', 'back', 'up', 'down'];

/** A prev→next feet-space segment that performs the crossing for `m`. */
function crossingFor(m: Move): { prev: LocalShift; next: LocalShift } {
  switch (m) {
    case 'forward':
      return {
        prev: { x: 0.55, y: 0, z: FAR_PLANE_Z + 0.1 },
        next: { x: 0.55, y: 0, z: FAR_PLANE_Z - 0.1 },
      };
    case 'back':
      return {
        prev: { x: 0, y: 0, z: ENTRANCE_PLANE_Z - 0.1 },
        next: { x: 0, y: 0, z: ENTRANCE_PLANE_Z + 0.1 },
      };
    case 'up':
      return {
        prev: { x: -0.55, y: VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS - 0.05, z: -3.2 },
        next: { x: -0.55, y: VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS + 0.05, z: -3.2 },
      };
    case 'down':
      return {
        prev: { x: -0.55, y: -(VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS) + 0.05, z: -3.2 },
        next: { x: -0.55, y: -(VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS) - 0.05, z: -3.2 },
      };
  }
}

describe('the Move → world delta table (T-8: defined here, not imported from the domain)', () => {
  it('re-base shifts localPosition by the exact negation of the world shift', () => {
    for (const m of MOVES) {
      const w = worldShift(m);
      const s = commitShift(m);
      expect(s.x + w.x).toBe(0);
      expect(s.y + w.y).toBe(0);
      expect(s.z + w.z).toBe(0);
    }
    expect(worldShift('forward')).toEqual({ x: ROOM_DRIFT_X, y: 0, z: -ROOM_PITCH });
    expect(worldShift('up')).toEqual({ x: 0, y: CEILING_HEIGHT, z: 0 });
    expect(ROOM_PITCH).toBe(2 * HEX_APOTHEM + VESTIBULE_DEPTH);
  });
});

describe('commit-plane detection', () => {
  const acceptAll = () => true;

  it('each move has a detecting crossing', () => {
    for (const m of MOVES) {
      const { prev, next } = crossingFor(m);
      const step = detectCommit(INITIAL_TRACKER, prev, next, acceptAll);
      expect(step.commit).toBe(m);
      expect(step.tracker.latched).toBeNull();
    }
  });

  it('no crossing ⇒ no commit', () => {
    const step = detectCommit(
      INITIAL_TRACKER,
      { x: 0, y: 0, z: 0 },
      { x: 0.1, y: 0, z: -0.5 },
      acceptAll,
    );
    expect(step.commit).toBeNull();
  });

  it('hysteresis cannot double-commit: oscillating ±0.15 around the plane commits exactly once', () => {
    // Climb through the band (one commit), then hover ±0.15 around the plane.
    let tracker: OriginTracker = INITIAL_TRACKER;
    let commits = 0;
    let coordinateFloorShift = 0; // emulate the re-base: after 'up', feet y drops by CEILING_HEIGHT

    const heights = [
      0.9,
      VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS + 0.05, // 1.25 — crosses: commit 'up'
      // After re-base these are relative to the NEW floor: plane now at −CEILING_HEIGHT/2.
      ...Array.from({ length: 40 }, (_, i) =>
        i % 2 === 0 ? VERTICAL_COMMIT_PLANE + 0.15 : VERTICAL_COMMIT_PLANE - 0.15,
      ),
    ];
    let prevY = 0.8;
    for (const rawY of heights) {
      const y = rawY - coordinateFloorShift;
      const step = detectCommit(
        tracker,
        { x: -0.55, y: prevY, z: -3.2 },
        { x: -0.55, y, z: -3.2 },
        acceptAll,
      );
      tracker = step.tracker;
      prevY = y;
      if (step.commit === 'up') {
        commits++;
        coordinateFloorShift += CEILING_HEIGHT;
        prevY = y - CEILING_HEIGHT; // the same-frame re-base
      } else {
        expect(step.commit).toBeNull(); // hovering must not emit 'down' either
      }
    }
    expect(commits).toBe(1);
  });

  it('refusal latches; the homeward re-crossing clears WITHOUT emitting', () => {
    const rejectAll = () => false;
    const out = crossingFor('back');
    const latchedStep = detectCommit(INITIAL_TRACKER, out.prev, out.next, rejectAll);
    expect(latchedStep.commit).toBeNull();
    expect(latchedStep.tracker.latched).toBe('back');

    // Dwelling beyond the plane: still nothing.
    const dwell = detectCommit(latchedStep.tracker, out.next, out.next, rejectAll);
    expect(dwell.commit).toBeNull();
    expect(dwell.tracker.latched).toBe('back');

    // Walking back in crosses the plane inward — must NOT log a phantom 'forward'.
    const home = detectCommit(dwell.tracker, out.next, out.prev, () => true);
    expect(home.commit).toBeNull();
    expect(home.tracker.latched).toBeNull();
  });
});

describe('scripted sequences close on the algebra (fast-check)', () => {
  it('final coordinate === reduce(acceptedLog) through the full detect→gate→apply pipeline', () => {
    const moveArb = fc.constantFrom<Move>('forward', 'back', 'up', 'down');
    fc.assert(
      fc.property(fc.array(moveArb, { maxLength: 120 }), (ms) => {
        let traversal = createTraversal();
        let tracker: OriginTracker = INITIAL_TRACKER;
        for (const m of ms) {
          const { prev, next } = crossingFor(m);
          const step = detectCommit(tracker, prev, next, (mv) => canMove(traversal.coordinate, mv));
          tracker = step.tracker;
          if (step.commit !== null) {
            traversal = crossThreshold(traversal, step.commit);
            expect(tracker.latched).toBeNull();
          }
          // After an accepted commit the player is re-based to the home side, so the
          // synthetic next crossing always starts from a clean tracker state.
          tracker = INITIAL_TRACKER;
        }
        expect(traversal.coordinate).toEqual(reduce([...traversal.moveLog]));
      }),
    );
  });
});
