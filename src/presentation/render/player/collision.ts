/**
 * Analytic collision (§4.7) — pure, node-testable. No physics engine (§7.4):
 * the walkable region is a union of convex cells built from `dimensions.ts`
 * half-planes and keep-out circles. A position is walkable iff it satisfies
 * at least one cell. Response is slide: push the target out of the nearest
 * cell's violated constraints (≤ 3 iterations); if it cannot be resolved the
 * delta is rejected — never tunnels, never NaNs (E6).
 *
 * Cells (2D, xz-plane — the floor is flat this unit):
 *   HEX    hexagon interior; book sides recessed by SHELF_DEPTH; railing keep-out
 *   DOOR0  entrance alcove on side 0 (+z), blocked just past the threshold
 *   DOOR3  side-3 doorway throat into the vestibule
 *   VEST   vestibule corridor; far end blocked at the stair mouth (§7.3)
 */
import {
  DOOR_WIDTH,
  HEX_APOTHEM,
  PLAYER_RADIUS,
  RAILING_RADIUS,
  SHELF_DEPTH,
  VESTIBULE_DEPTH,
  VESTIBULE_WIDTH,
} from '../room/dimensions';
import type { Vec3 } from '../room/instancing';

type Vec2 = { x: number; z: number };

/** Require dot(p, n) ≤ limit. */
type HalfPlane = { nx: number; nz: number; limit: number };
/** Keep OUT: dist(p, c) ≥ r. */
type KeepOutCircle = { cx: number; cz: number; r: number };
type Cell = { planes: HalfPlane[]; keepOut: KeepOutCircle[] };

/** How far past the side-0 threshold the entrance blocker sits (§4.1). */
export const ENTRANCE_BLOCK_DEPTH = 0.35;
/** Depth of the vestibule's far zone owned by the stairwell — walking stops at its mouth (§7.3). */
export const STAIR_ZONE_DEPTH = 1.1;
/** Player-center keep-out radius at the shaft: you press against the low railing, never cross it. */
export const RAILING_KEEPOUT = RAILING_RADIUS - PLAYER_RADIUS;
/** Max displacement resolved per call — walking never tunnels (E6/E8). */
export const MAX_STEP = 0.25;

const SLIDE_ITERATIONS = 3;
const DOOR_HALF = DOOR_WIDTH / 2 - PLAYER_RADIUS;
const EPS = 1e-9;

/** Hexagon side k's outward normal is k·60° CCW from +z (§4.1). */
function sideNormal(side: number): { nx: number; nz: number } {
  const theta = side * (Math.PI / 3);
  return { nx: Math.sin(theta), nz: Math.cos(theta) };
}

const BOOK_SIDES = new Set([1, 2, 4, 5]);

function hexCell(): Cell {
  const planes: HalfPlane[] = [];
  for (let side = 0; side < 6; side++) {
    const { nx, nz } = sideNormal(side);
    const limit = BOOK_SIDES.has(side)
      ? HEX_APOTHEM - SHELF_DEPTH - PLAYER_RADIUS // shelf faces
      : HEX_APOTHEM - PLAYER_RADIUS; // free sides (door cells overlap for passage)
    planes.push({ nx, nz, limit });
  }
  return { planes, keepOut: [{ cx: 0, cz: 0, r: RAILING_KEEPOUT }] };
}

/** Axis-aligned rectangular cell: xMin ≤ x ≤ xMax, zMin ≤ z ≤ zMax. */
function rectCell(xMin: number, xMax: number, zMin: number, zMax: number): Cell {
  return {
    planes: [
      { nx: 1, nz: 0, limit: xMax },
      { nx: -1, nz: 0, limit: -xMin },
      { nx: 0, nz: 1, limit: zMax },
      { nx: 0, nz: -1, limit: -zMin },
    ],
    keepOut: [],
  };
}

const CELLS: Cell[] = [
  hexCell(),
  // DOOR0 — entrance alcove: through the side-0 doorway, blocked just past the threshold.
  rectCell(-DOOR_HALF, DOOR_HALF, HEX_APOTHEM - 0.6, HEX_APOTHEM + ENTRANCE_BLOCK_DEPTH),
  // DOOR3 — throat through the side-3 doorway into the vestibule.
  rectCell(-DOOR_HALF, DOOR_HALF, -(HEX_APOTHEM + 0.6), -(HEX_APOTHEM - 0.6)),
  // VEST — vestibule corridor; far end stops at the stair mouth.
  rectCell(
    -(VESTIBULE_WIDTH / 2 - PLAYER_RADIUS),
    VESTIBULE_WIDTH / 2 - PLAYER_RADIUS,
    -(HEX_APOTHEM + VESTIBULE_DEPTH - STAIR_ZONE_DEPTH),
    -(HEX_APOTHEM + PLAYER_RADIUS),
  ),
];

function violation(p: Vec2, cell: Cell): { nx: number; nz: number; depth: number } | null {
  for (const pl of cell.planes) {
    const d = p.x * pl.nx + p.z * pl.nz - pl.limit;
    if (d > EPS) return { nx: pl.nx, nz: pl.nz, depth: d };
  }
  for (const c of cell.keepOut) {
    const dx = p.x - c.cx;
    const dz = p.z - c.cz;
    const dist = Math.hypot(dx, dz);
    if (dist < c.r - EPS) {
      // Push radially outward; degenerate center exits along +x.
      const inv = dist > EPS ? 1 / dist : 0;
      return { nx: dist > EPS ? -dx * inv : -1, nz: dist > EPS ? -dz * inv : 0, depth: c.r - dist };
    }
  }
  return null;
}

function inCell(p: Vec2, cell: Cell): boolean {
  return violation(p, cell) === null;
}

function resolveAgainstCell(p: Vec2, cell: Cell): Vec2 {
  let q = { x: p.x, z: p.z };
  for (let i = 0; i < SLIDE_ITERATIONS; i++) {
    const v = violation(q, cell);
    if (!v) break;
    // Slide: remove the normal component only — tangential motion survives.
    q = { x: q.x - v.nx * v.depth, z: q.z - v.nz * v.depth };
  }
  return q;
}

function isWalkable2(p: Vec2): boolean {
  return CELLS.some((cell) => inCell(p, cell));
}

/** True iff the player capsule center may rest at `p` (xz used; y ignored — flat floor). */
export function isWalkable(p: Vec3): boolean {
  return isWalkable2({ x: p.x, z: p.z });
}

/**
 * Resolve a movement delta against the colliders: returns the new position.
 * Pure — `(position, delta) → position`. y passes through unchanged (the
 * controller locks it to EYE_HEIGHT). Non-finite or unresolvable deltas are
 * rejected: the player stays put (E6).
 */
export function resolveMovement(position: Vec3, delta: Vec3): Vec3 {
  let dx = delta.x;
  let dz = delta.z;
  const len = Math.hypot(dx, dz);
  if (!Number.isFinite(len) || len === 0) return position;
  if (len > MAX_STEP) {
    dx *= MAX_STEP / len;
    dz *= MAX_STEP / len;
  }

  const target: Vec2 = { x: position.x + dx, z: position.z + dz };
  if (isWalkable2(target)) return { x: target.x, y: position.y, z: target.z };

  // Slide against the cell that resolves the target with the smallest correction.
  let best: Vec2 | null = null;
  let bestDistSq = Infinity;
  for (const cell of CELLS) {
    const q = resolveAgainstCell(target, cell);
    if (!inCell(q, cell)) continue; // wedged in this cell within the iteration cap
    const ex = q.x - target.x;
    const ez = q.z - target.z;
    const distSq = ex * ex + ez * ez;
    if (distSq < bestDistSq) {
      best = q;
      bestDistSq = distSq;
    }
  }

  if (best && isWalkable2(best)) return { x: best.x, y: position.y, z: best.z };
  return position; // reject the delta — stay put rather than tunnel (E6)
}
