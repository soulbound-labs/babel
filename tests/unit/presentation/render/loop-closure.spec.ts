/**
 * Loop closure — the REAL render pipeline (§6.1), driven purely (no three/WebGL).
 * This replicates the LocomotionController's per-frame reconciliation exactly —
 * stepLocomotion → detectCommit (origin.ts) → canMove gate → crossThreshold →
 * commitShift re-base → rebuild collision — and proves the brief's in-world
 * loop-closure claim two ways:
 *
 *   1. A HORIZONTAL round trip driven by genuine stepLocomotion walking
 *      (forward through the far door, back through the entrance, home to spawn):
 *      the floating-origin re-base is EXACT, so localPosition returns to spawn.
 *   2. The full climb→forward→descend→back loop through the same commit
 *      pipeline (the vertical legs scripted in feet space, since free-walking a
 *      helix via WASD is not deterministically scriptable): the coordinate
 *      returns EXACTLY to ORIGIN and the log reduces after every commit.
 *
 * Bigints are compared strictly; only localPosition uses toBeCloseTo (T-3).
 */
import { describe, expect, it } from 'vitest';

import { hash, ORIGIN, reduce } from '@/domain/entities';
import type { Coordinate, Move } from '@/domain/entities';
import { canMove } from '@/presentation/traversal/bounds';
import { createTraversal, crossThreshold } from '@/presentation/traversal/traversal';
import type { TraversalState } from '@/presentation/traversal/traversal';
import { createCollisionContext } from '@/presentation/render/player/collision';
import type { CollisionContext } from '@/presentation/render/player/collision';
import { createLocomotionState, stepLocomotion } from '@/presentation/render/player/locomotion';
import type { LocomotionInput, LocomotionState } from '@/presentation/render/player/locomotion';
import type { CameraPose } from '@/presentation/render/debug/poses';
import { EYE_HEIGHT } from '@/presentation/render/room/dimensions';
import {
  commitShift,
  detectCommit,
  ENTRANCE_PLANE_Z,
  FAR_PLANE_Z,
  INITIAL_TRACKER,
  VERTICAL_COMMIT_PLANE,
  COMMIT_HYSTERESIS,
} from '@/presentation/render/world/origin';
import type { LocalShift, OriginTracker } from '@/presentation/render/world/origin';
import { liveCollisionSpecs } from '@/presentation/render/world/streaming';

type Vec3 = { x: number; y: number; z: number };
const feet = (p: Vec3): LocalShift => ({ x: p.x, y: p.y - EYE_HEIGHT, z: p.z });

/**
 * The controller's per-frame reconciliation, extracted verbatim for the test.
 * `frame` advances one physical step through stepLocomotion; `pushFeet` scripts
 * a feet-space segment (for the vertical legs). Both run the SAME
 * detect→gate→cross→rebase logic and assert the reduce invariant on commit.
 */
/** A walkable start in the vestibule walk lane — short, robust door crossings. */
const LANE_POSE: CameraPose = {
  position: { x: 0.55, y: EYE_HEIGHT, z: -3.0 },
  yaw: 0,
  pitch: 0,
};

function makeController(start: Coordinate = ORIGIN, startPose: CameraPose = LANE_POSE) {
  let state: LocomotionState = createLocomotionState(startPose, start);
  let traversal: TraversalState = createTraversal(start);
  let tracker: OriginTracker = INITIAL_TRACKER;
  let ctx: CollisionContext = createCollisionContext(liveCollisionSpecs(traversal.coordinate));
  const commits: Move[] = [];

  function reconcile(prev: Vec3, next: Vec3) {
    const step = detectCommit(tracker, feet(prev), feet(next), (m) =>
      canMove(traversal.coordinate, m),
    );
    tracker = step.tracker;
    if (step.commit === null) return;
    traversal = crossThreshold(traversal, step.commit);
    const shift = commitShift(step.commit);
    state = {
      ...state,
      player: {
        ...state.player,
        coordinate: traversal.coordinate,
        localPosition: { x: next.x + shift.x, y: next.y + shift.y, z: next.z + shift.z },
      },
    };
    ctx = createCollisionContext(liveCollisionSpecs(traversal.coordinate));
    commits.push(step.commit);
    // T-3: the accepted log reduces to the coordinate after EVERY commit.
    expect(traversal.coordinate).toEqual(reduce([...traversal.moveLog]));
  }

  return {
    get position(): Vec3 {
      return state.player.localPosition;
    },
    get coordinate(): Coordinate {
      return traversal.coordinate;
    },
    get moveLog(): readonly Move[] {
      return traversal.moveLog;
    },
    commits,
    frame(input: LocomotionInput, dt: number) {
      const prev = state.player.localPosition;
      state = stepLocomotion(state, input, dt, ctx);
      reconcile(prev, state.player.localPosition);
    },
    /** Script a feet-space crossing (localPosition = feet + EYE_HEIGHT in y). */
    pushFeet(next: LocalShift) {
      const prev = state.player.localPosition;
      const nextPos = { x: next.x, y: next.y + EYE_HEIGHT, z: next.z };
      state = { ...state, player: { ...state.player, localPosition: nextPos } };
      reconcile(prev, nextPos);
    },
  };
}

type Ctl = ReturnType<typeof makeController>;

/** Steer toward a planar target via yaw + forward; stop on arrival or a commit. */
function runToward(
  ctl: Ctl,
  target: { x: number; z: number },
  opts: { maxFrames?: number; threshold?: number; stopOnCommit?: boolean } = {},
): 'arrived' | 'commit' | 'maxframes' {
  const { maxFrames = 4000, threshold = 0.04, stopOnCommit = true } = opts;
  const before = ctl.commits.length;
  const dt = 1 / 60;
  for (let i = 0; i < maxFrames; i++) {
    if (stopOnCommit && ctl.commits.length > before) return 'commit';
    const p = ctl.position;
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    if (Math.hypot(dx, dz) < threshold) return 'arrived';
    // 0 yaw faces -z; forward wish is (-sin yaw, -cos yaw) — face the target.
    const yaw = Math.atan2(-dx, -dz);
    ctl.frame({ forward: true, back: false, left: false, right: false, yaw, pitch: 0 }, dt);
  }
  return 'maxframes';
}

describe('loop closure — real render pipeline (§6.1)', () => {
  it('horizontal round trip via stepLocomotion: forward + back close on ORIGIN, localPosition returns to spawn', () => {
    const ctl = makeController();
    const spawn = { ...ctl.position };

    // Down the walk lane, out the far door into room n+1 (→ 'forward').
    expect(runToward(ctl, { x: 0.55, z: -4.7 })).toBe('commit');
    expect(ctl.coordinate).toEqual({ n: 1n, floor: 0n });

    // Nudge in, then back out the entrance of room n+1 (→ 'back'), to the origin frame.
    runToward(ctl, { x: 0, z: 0.5 }, { stopOnCommit: false });
    expect(runToward(ctl, { x: 0, z: 3.2 })).toBe('commit');
    expect(ctl.coordinate).toEqual(ORIGIN);

    // Home to the exact start spot — the local frame anchor is the origin room again.
    expect(
      runToward(ctl, { x: spawn.x, z: spawn.z }, { stopOnCommit: false, threshold: 0.02 }),
    ).toBe('arrived');

    expect(ctl.moveLog).toEqual(['forward', 'back']);
    expect(ctl.coordinate.n).toBe(0n);
    expect(ctl.coordinate.floor).toBe(0n);
    expect(hash(ctl.coordinate)).toBe(hash(ORIGIN));
    // Floating-origin re-base is exact: localPosition returns to spawn.
    expect(ctl.position.x).toBeCloseTo(spawn.x, 1);
    expect(ctl.position.y).toBeCloseTo(spawn.y, 5);
    expect(ctl.position.z).toBeCloseTo(spawn.z, 1);
  });

  it('full climb → forward → descend → back loop closes exactly on ORIGIN through the commit pipeline', () => {
    const ctl = makeController();
    const up = VERTICAL_COMMIT_PLANE + COMMIT_HYSTERESIS; // 1.2 — the vertical commit line
    // Feet-space closed loop; the re-base shifts (which net zero over the loop)
    // are applied by the controller between legs. Start on the stair axis.
    let f: LocalShift = { x: -0.55, y: up - 0.05, z: -3.2 };

    // Leg 1 — climb: feet cross the up-line. Re-base drops y by CEILING afterward.
    ctl.pushFeet(f);
    ctl.pushFeet((f = { ...f, y: up + 0.05 }));
    expect(ctl.commits).toEqual(['up']);

    // Leg 2 — forward: cross the far-door plane (z decreasing).
    f = { x: 0.55, y: feetY(ctl), z: FAR_PLANE_Z + 0.05 };
    ctl.pushFeet(f);
    ctl.pushFeet((f = { ...f, z: FAR_PLANE_Z - 0.05 }));
    expect(ctl.commits).toEqual(['up', 'forward']);

    // Leg 3 — descend: cross the down-line (y decreasing). Re-base lifts y by CEILING.
    f = { x: -0.55, y: -up + 0.05, z: -3.2 };
    ctl.pushFeet(f);
    ctl.pushFeet((f = { ...f, y: -up - 0.05 }));
    expect(ctl.commits).toEqual(['up', 'forward', 'down']);

    // Leg 4 — back: cross the entrance plane (z increasing).
    f = { x: 0, y: feetY(ctl), z: ENTRANCE_PLANE_Z - 0.05 };
    ctl.pushFeet(f);
    ctl.pushFeet((f = { ...f, z: ENTRANCE_PLANE_Z + 0.05 }));

    expect(ctl.commits).toEqual(['up', 'forward', 'down', 'back']);
    expect(ctl.moveLog).toEqual(['up', 'forward', 'down', 'back']);
    // Strict bigint closure — the coordinate is EXACTLY ORIGIN.
    expect(ctl.coordinate.n).toBe(0n);
    expect(ctl.coordinate.floor).toBe(0n);
    expect(ctl.coordinate).toEqual(ORIGIN);
    expect(hash(ctl.coordinate)).toBe(hash(ORIGIN));
  });
});

/** Current feet-space y of the controller (localPosition.y − EYE_HEIGHT). */
function feetY(ctl: Ctl): number {
  return ctl.position.y - EYE_HEIGHT;
}
