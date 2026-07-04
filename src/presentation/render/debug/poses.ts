/**
 * Mood-gate camera poses (§7.1) — four exact, deterministic framings behind
 * `?pose=N`. Pose 1 IS the spawn pose (single source — §4.7). On mood-gate
 * approval these are locked by the committed reference captures at
 * `docs/mood/unit-03/pose-{1..4}.png`; Units 04/05/06 re-render and compare.
 */
import type { Coordinate } from '../../../domain/entities';
import { STAIR_AXIS_X, STAIR_AXIS_Z } from '../player/stair';
import { CEILING_HEIGHT, EYE_HEIGHT, HEX_APOTHEM, VESTIBULE_DEPTH } from '../room/dimensions';

export type CameraPose = {
  position: { x: number; y: number; z: number };
  yaw: number; // radians, CCW about +y, 0 = facing -z
  pitch: number; // radians
  /**
   * Optional logical coordinate the pose teleports to (§4.4). `?pose=N` settles
   * traversal + streaming here deterministically before the first frame:
   * identical coordinate ⇒ identical loaded set ⇒ identical capture. Absent for
   * P1–P4 (interior origin poses — the frozen Unit 03 references).
   */
  coordinate?: Coordinate;
};

// P1 — spawn framing: railed shaft, a book-wall's 640 spines, one bulb receding into fog.
const P1: CameraPose = {
  position: { x: 0, y: EYE_HEIGHT, z: HEX_APOTHEM - 0.55 },
  yaw: (40 * Math.PI) / 180,
  pitch: 0,
};

/** Index 0 = pose 1. */
export const POSES: readonly CameraPose[] = [
  P1,
  // P2 — at the railing, looking down the shaft: depth must be unreadable.
  {
    position: { x: 0, y: EYE_HEIGHT, z: 1.05 },
    yaw: 0,
    pitch: (-62 * Math.PI) / 180,
  },
  // P3 — close to book-wall 0 (side 1), spines filling the frame.
  {
    position: { x: 0.82, y: EYE_HEIGHT, z: 0.48 },
    yaw: (-120 * Math.PI) / 180,
    pitch: 0,
  },
  // P4 — in the vestibule: mirror (right flank) + staircase receding into fog.
  {
    position: { x: -0.45, y: EYE_HEIGHT, z: -2.05 },
    yaw: (-18 * Math.PI) / 180,
    pitch: 0,
  },
  // ── Unit 04 hero-moment poses (§4.4). Local framings are PROVISIONAL until
  //    the mood gate (Phase 7); the logical coordinates settle streaming
  //    deterministically before capture. P1–P4 above are byte-frozen.
  // P5 — mid-spiral, half a floor below a vestibule, pitched down the shaft
  //      axis (descent hero framing).
  {
    position: { x: STAIR_AXIS_X, y: EYE_HEIGHT - CEILING_HEIGHT / 2, z: STAIR_AXIS_Z },
    yaw: (30 * Math.PI) / 180,
    pitch: (-45 * Math.PI) / 180,
    coordinate: { n: 0n, floor: 0n },
  },
  // P6 — in the far doorway on the corridor axis, yaw 0 down the chain
  //      (receding doorframes).
  {
    position: { x: 0.28, y: EYE_HEIGHT, z: -(HEX_APOTHEM + VESTIBULE_DEPTH) + 0.15 },
    yaw: 0,
    pitch: 0,
    coordinate: { n: 0n, floor: 0n },
  },
  // P7 — near the n = 64 edge (edge − ramp/2 = 62), in the far-door lane PAST the
  //      vestibule stair, looking straight down the receding corridor (doors
  //      drift +0.55 x per hop) into the denser edge fog. Framing finalized at
  //      the gate; coordinate provisional until the ramp is locked.
  {
    position: { x: 0.5, y: EYE_HEIGHT, z: -3.5 },
    yaw: (-6 * Math.PI) / 180,
    pitch: 0,
    coordinate: { n: 62n, floor: 0n },
  },
  // P8 — on the stair at the first point the destination floor's room is
  //      visible through the opening.
  {
    position: { x: STAIR_AXIS_X, y: EYE_HEIGHT + CEILING_HEIGHT / 2, z: STAIR_AXIS_Z },
    yaw: (150 * Math.PI) / 180,
    pitch: (15 * Math.PI) / 180,
    coordinate: { n: 0n, floor: 0n },
  },
];

/** Spawn pose (§4.7) — pose 1, the single source. */
export const SPAWN_POSE: CameraPose = P1;

/**
 * Parse `?pose=N` from a query string. Invalid or out-of-range N is ignored
 * (E7): returns null and the caller uses the normal spawn.
 */
export function parsePoseParam(search: string): CameraPose | null {
  const raw = new URLSearchParams(search).get('pose');
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > POSES.length) return null;
  return POSES[n - 1] ?? null;
}

/** True iff `?debug` is present (E7 — query-param-gated only, no build fork). */
export function parseDebugParam(search: string): boolean {
  return new URLSearchParams(search).has('debug');
}
