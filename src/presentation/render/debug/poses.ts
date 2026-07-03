/**
 * Mood-gate camera poses (§7.1) — four exact, deterministic framings behind
 * `?pose=N`. Pose 1 IS the spawn pose (single source — §4.7). On mood-gate
 * approval these are locked by the committed reference captures at
 * `docs/mood/unit-03/pose-{1..4}.png`; Units 04/05/06 re-render and compare.
 */
import { EYE_HEIGHT, HEX_APOTHEM } from '../room/dimensions';

export type CameraPose = {
  position: { x: number; y: number; z: number };
  yaw: number; // radians, CCW about +y, 0 = facing -z
  pitch: number; // radians
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
