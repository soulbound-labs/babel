/**
 * Analytic collision (§4.7, Unit 04 §4.2.2) — pure, node-testable. No physics
 * engine: the walkable region is a union of convex cells built from
 * `dimensions.ts` half-planes and keep-in/keep-out circles. A position is
 * walkable iff it satisfies at least one cell. Response is slide: push the
 * target out of the nearest cell's violated constraints (≤ 3 iterations); if
 * it cannot be resolved the delta is rejected — never tunnels, never NaNs.
 *
 * Unit 04: cells are generated PER LIVE ROOM at its local-frame offset (the
 * signature grew a `CollisionContext`). Cells are 2D (xz) — floors repeat
 * every CEILING_HEIGHT with identical local footprints, so one 2D union
 * serves every floor; the y climb is `stair.ts` + locomotion's job.
 *
 * Cells per room (relative to its offset):
 *   HEX      hexagon interior; book sides recessed by SHELF_DEPTH; railing keep-out
 *   DOOR0    entrance throat on side 0 (+z). Open (neighbor n−1 resident):
 *            reaches 0.6 m through the shared plane into that neighbor's
 *            vestibule far zone. Closed (edge, n = −64): Unit 03 blocker —
 *            dead-ends ENTRANCE_BLOCK_DEPTH past the threshold.
 *   DOOR3    side-3 doorway throat into the vestibule
 *   VESTN    vestibule near zone (between the side-3 wall and the alcove mouth)
 *   VESTF    vestibule far zone + stair alcove; stairwell keep-out
 *   STAIR    annulus r ∈ [STAIR_INNER_R, STAIR_OUTER_R] around the stair axis
 *   LAND     landing sector joining the walk area to the helix at θ = 0
 *
 * The far-cap door needs no cell of its own: the passage to room n+1 IS room
 * n+1's DOOR0 throat. An edge room (n = 64) has no resident forward neighbor,
 * so its far door is blocked by construction — the Unit 03 "invisible stop"
 * semantics, kept only on outward sides (spec §4.2.5).
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
import {
  ALCOVE_BACK_X,
  ALCOVE_NEAR_Z,
  LANDING_HALF_ANGLE,
  LANDING_OUTER_R,
  STAIR_AXIS_X,
  STAIR_AXIS_Z,
  STAIR_INNER_R,
  STAIR_OUTER_R,
  STAIRWELL_RADIUS,
} from './stair';
import type { StairSite } from './stair';

type Vec2 = { x: number; z: number };

/** Require dot(p, n) ≤ limit. */
type HalfPlane = { nx: number; nz: number; limit: number };
/** Keep OUT: dist(p, c) ≥ r. */
type KeepOutCircle = { cx: number; cz: number; r: number };
/** Keep IN: dist(p, c) ≤ r. */
type KeepInCircle = { cx: number; cz: number; r: number };
type Cell = { planes: HalfPlane[]; keepOut: KeepOutCircle[]; keepIn: KeepInCircle[] };

/** How far past the side-0 threshold the edge-room entrance blocker sits (§4.2.5). */
export const ENTRANCE_BLOCK_DEPTH = 0.35;
/** How far an OPEN entrance throat reaches through the shared plane into the neighbor. */
const DOOR_THROAT_REACH = 0.6;
/** Player-center keep-out radius at the shaft: you press against the low railing, never cross it. */
export const RAILING_KEEPOUT = RAILING_RADIUS - PLAYER_RADIUS;
/** Max displacement resolved per call — walking never tunnels (E6/E8). */
export const MAX_STEP = 0.25;

const SLIDE_ITERATIONS = 3;
const DOOR_HALF = DOOR_WIDTH / 2 - PLAYER_RADIUS;
const EPS = 1e-9;
const HALF_W = VESTIBULE_WIDTH / 2;
const NEAR_Z = -HEX_APOTHEM;
const FAR_Z = -(HEX_APOTHEM + VESTIBULE_DEPTH);

/** One live room's collision footprint, in the local float frame. */
export type RoomCollisionSpec = {
  /** Local-frame offset of the room center (xz — floors share footprints). */
  offset: Vec2;
  /** Backward neighbor (n−1) resident/in-bounds ⇒ the entrance continues; else Unit 03 blocker. */
  entranceOpen: boolean;
};

export type CollisionContext = {
  readonly cells: readonly Cell[];
  /** Stair axes, one per room — locomotion samples `surfaceAt` against these. */
  readonly stairs: readonly StairSite[];
};

/** Hexagon side k's outward normal is k·60° CCW from +z (§4.1). */
function sideNormal(side: number): { nx: number; nz: number } {
  const theta = side * (Math.PI / 3);
  return { nx: Math.sin(theta), nz: Math.cos(theta) };
}

const BOOK_SIDES = new Set([1, 2, 4, 5]);

function hexCell(o: Vec2): Cell {
  const planes: HalfPlane[] = [];
  for (let side = 0; side < 6; side++) {
    const { nx, nz } = sideNormal(side);
    const base = BOOK_SIDES.has(side)
      ? HEX_APOTHEM - SHELF_DEPTH - PLAYER_RADIUS // shelf faces
      : HEX_APOTHEM - PLAYER_RADIUS; // free sides (door cells overlap for passage)
    planes.push({ nx, nz, limit: base + nx * o.x + nz * o.z });
  }
  return {
    planes,
    keepOut: [{ cx: o.x, cz: o.z, r: RAILING_KEEPOUT }],
    keepIn: [],
  };
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
    keepIn: [],
  };
}

function roomCells(spec: RoomCollisionSpec): Cell[] {
  const o = spec.offset;
  const axis = { x: o.x + STAIR_AXIS_X, z: o.z + STAIR_AXIS_Z };

  // DOOR0 — entrance throat: through the side-0 doorway; reach depends on the edge flag.
  const entranceReach = spec.entranceOpen ? DOOR_THROAT_REACH : ENTRANCE_BLOCK_DEPTH;
  const door0 = rectCell(
    o.x - DOOR_HALF,
    o.x + DOOR_HALF,
    o.z + HEX_APOTHEM - 0.6,
    o.z + HEX_APOTHEM + entranceReach,
  );

  // DOOR3 — throat through the side-3 doorway into the vestibule.
  const door3 = rectCell(
    o.x - DOOR_HALF,
    o.x + DOOR_HALF,
    o.z - (HEX_APOTHEM + 0.6),
    o.z - (HEX_APOTHEM - 0.6),
  );

  // VESTN — between the side-3 wall and the alcove mouth (overlaps the landing sector).
  const vestNear = rectCell(
    o.x - (HALF_W - PLAYER_RADIUS),
    o.x + (HALF_W - PLAYER_RADIUS),
    o.z + ALCOVE_NEAR_Z - 0.3,
    o.z + NEAR_Z - PLAYER_RADIUS,
  );

  // VESTF — far zone + alcove: the walk lane past the mirror, minus the stairwell opening.
  const vestFar = rectCell(
    o.x + ALCOVE_BACK_X + PLAYER_RADIUS,
    o.x + (HALF_W - PLAYER_RADIUS),
    o.z + FAR_Z + PLAYER_RADIUS,
    o.z + ALCOVE_NEAR_Z - PLAYER_RADIUS,
  );
  vestFar.keepOut.push({ cx: axis.x, cz: axis.z, r: STAIRWELL_RADIUS });

  // STAIR — the walkable annulus of the helix.
  const stair: Cell = {
    planes: [],
    keepOut: [{ cx: axis.x, cz: axis.z, r: STAIR_INNER_R }],
    keepIn: [{ cx: axis.x, cz: axis.z, r: STAIR_OUTER_R }],
  };

  // LAND — sector |θ| ≤ LANDING_HALF_ANGLE about the mouth (θ = 0 faces +z),
  // joining the walk area (r ≥ STAIRWELL_RADIUS) to the annulus (r ≤ STAIR_OUTER_R).
  const cosA = Math.cos(LANDING_HALF_ANGLE);
  const sinA = Math.sin(LANDING_HALF_ANGLE);
  const landing: Cell = {
    planes: [
      { nx: cosA, nz: -sinA, limit: cosA * axis.x - sinA * axis.z },
      { nx: -cosA, nz: -sinA, limit: -cosA * axis.x - sinA * axis.z },
    ],
    keepOut: [{ cx: axis.x, cz: axis.z, r: STAIR_INNER_R }],
    keepIn: [{ cx: axis.x, cz: axis.z, r: LANDING_OUTER_R }],
  };

  return [hexCell(o), door0, door3, vestNear, vestFar, stair, landing];
}

/** Precompute the cell union for a set of live rooms. Pure; call on set change, not per frame. */
export function createCollisionContext(rooms: readonly RoomCollisionSpec[]): CollisionContext {
  const cells: Cell[] = [];
  const stairs: StairSite[] = [];
  for (const spec of rooms) {
    cells.push(...roomCells(spec));
    stairs.push({ x: spec.offset.x + STAIR_AXIS_X, z: spec.offset.z + STAIR_AXIS_Z });
  }
  return { cells, stairs };
}

/** The Unit 03 world: one room, both horizontal exits blocked (edge-like). */
export const ORIGIN_ROOM_CONTEXT: CollisionContext = createCollisionContext([
  { offset: { x: 0, z: 0 }, entranceOpen: false },
]);

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
  for (const c of cell.keepIn) {
    const dx = p.x - c.cx;
    const dz = p.z - c.cz;
    const dist = Math.hypot(dx, dz);
    if (dist > c.r + EPS) {
      // Push radially inward, toward the circle.
      const inv = 1 / dist;
      return { nx: dx * inv, nz: dz * inv, depth: dist - c.r };
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

function isWalkable2(p: Vec2, cells: readonly Cell[]): boolean {
  return cells.some((cell) => inCell(p, cell));
}

/** True iff the player capsule center may rest at `p` (xz used; y is the surface model's job). */
export function isWalkable(p: Vec3, ctx: CollisionContext = ORIGIN_ROOM_CONTEXT): boolean {
  return isWalkable2({ x: p.x, z: p.z }, ctx.cells);
}

/**
 * Resolve a movement delta against the colliders: returns the new position.
 * Pure — `(position, delta, ctx) → position`. y passes through unchanged (the
 * controller derives it from the surface model). Non-finite or unresolvable
 * deltas are rejected: the player stays put (E6).
 */
export function resolveMovement(
  position: Vec3,
  delta: Vec3,
  ctx: CollisionContext = ORIGIN_ROOM_CONTEXT,
): Vec3 {
  let dx = delta.x;
  let dz = delta.z;
  const len = Math.hypot(dx, dz);
  if (!Number.isFinite(len) || len === 0) return position;
  if (len > MAX_STEP) {
    dx *= MAX_STEP / len;
    dz *= MAX_STEP / len;
  }

  const target: Vec2 = { x: position.x + dx, z: position.z + dz };
  if (isWalkable2(target, ctx.cells)) return { x: target.x, y: position.y, z: target.z };

  // Slide against the cell that resolves the target with the smallest correction.
  let best: Vec2 | null = null;
  let bestDistSq = Infinity;
  for (const cell of ctx.cells) {
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

  if (best && isWalkable2(best, ctx.cells)) return { x: best.x, y: position.y, z: best.z };
  return position; // reject the delta — stay put rather than tunnel (E6)
}
