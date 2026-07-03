/**
 * Book instancing (§4.5) — pure, node-testable. ONE InstancedMesh, 640
 * instances, one draw call. THE INSTANCE ID IS THE SLOT: Unit 05 resolves
 * clicks via `raycast → instanceId → slotToBook(instanceId)` and combines
 * with the room's `Coordinate` to form a `LineAddress`. This mapping is
 * FROZEN — the nesting order mirrors the domain codec.
 *
 * Deterministic presentation (C4): jitter derives from an integer hash of the
 * slot, never `Math.random`, so the same room renders identically forever.
 */
import {
  BOOK_HEIGHT,
  BOOK_SLOT_WIDTH,
  BOOKS_PER_SHELF,
  HEX_APOTHEM,
  SHELF_DEPTH,
  SHELF_PITCH,
  SHELVES_PER_WALL,
} from './dimensions';

export const BOOK_COUNT = 640; // 4 walls × 5 shelves × 32 volumes

const WALLS = 4;

/** Domain wall 0..3 → hexagon side (§4.1, frozen): CCW sides, 0 = entrance (+z). */
export const WALL_TO_SIDE = [1, 2, 4, 5] as const;

export type Vec3 = { x: number; y: number; z: number };

export type BookTransform = {
  position: Vec3; // room frame, meters, y-up
  rotation: Vec3; // Euler XYZ radians; y orients the spine toward the room
  scale: Vec3;
};

export type BookJitter = {
  heightScale: number; // 0.92..1.0
  lean: number; // radians, |lean| ≤ 2.5°
  depthPush: number; // meters toward the room, 0..0.006
  shade: number; // 0..1 — per-instance color variation input for setColorAt
};

function assertBookRange(wall: number, shelf: number, volume: number): void {
  if (
    !Number.isInteger(wall) ||
    wall < 0 ||
    wall >= WALLS ||
    !Number.isInteger(shelf) ||
    shelf < 0 ||
    shelf >= SHELVES_PER_WALL ||
    !Number.isInteger(volume) ||
    volume < 0 ||
    volume >= BOOKS_PER_SHELF
  ) {
    throw new RangeError(`book out of range: wall=${wall} shelf=${shelf} volume=${volume}`);
  }
}

function assertSlotRange(slot: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= BOOK_COUNT) {
    throw new RangeError(`slot out of range: ${slot}`);
  }
}

export function bookToSlot(wall: number, shelf: number, volume: number): number {
  assertBookRange(wall, shelf, volume);
  return (wall * SHELVES_PER_WALL + shelf) * BOOKS_PER_SHELF + volume; // same nesting order as the domain codec
}

export function slotToBook(slot: number): { wall: number; shelf: number; volume: number } {
  assertSlotRange(slot);
  const volume = slot % BOOKS_PER_SHELF;
  const shelf = ((slot - volume) / BOOKS_PER_SHELF) % SHELVES_PER_WALL;
  const wall = (slot - volume - shelf * BOOKS_PER_SHELF) / (SHELVES_PER_WALL * BOOKS_PER_SHELF);
  return { wall, shelf, volume };
}

/** 32-bit integer mix (splitmix-style avalanche) — the C4 seeded hash. */
function hash32(x: number): number {
  let h = x | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Uniform [0, 1) from slot + salt — pure, reproducible. */
function u01(slot: number, salt: number): number {
  return hash32(slot * 0x9e3779b1 + salt) / 0x100000000;
}

const LEAN_MAX = (2.5 * Math.PI) / 180;
const DEPTH_PUSH_MAX = 0.006;
const HEIGHT_SCALE_MIN = 0.92;

export function slotJitter(slot: number): BookJitter {
  assertSlotRange(slot);
  return {
    heightScale: HEIGHT_SCALE_MIN + (1 - HEIGHT_SCALE_MIN) * u01(slot, 1),
    lean: LEAN_MAX * (2 * u01(slot, 2) - 1),
    depthPush: DEPTH_PUSH_MAX * u01(slot, 3),
    shade: u01(slot, 4),
  };
}

const SHELF_BOARD_CLEARANCE = 0.02; // books rest just above the shelf board
const BOOK_DEPTH = SHELF_DEPTH * 0.75;
const BOOK_THICKNESS = BOOK_SLOT_WIDTH * 0.86; // slim gap between neighbours

export function slotTransform(slot: number): BookTransform {
  const { wall, shelf, volume } = slotToBook(slot);
  const jitter = slotJitter(slot);

  // Wall side placement (§4.1): side k's outward normal is k·60° CCW from +z.
  const side = WALL_TO_SIDE[wall];
  if (side === undefined) throw new RangeError(`wall out of range: ${wall}`);
  const theta = side * (Math.PI / 3);
  const nx = Math.sin(theta);
  const nz = Math.cos(theta);
  // Tangent along the wall (+90° CCW from the normal).
  const tx = Math.cos(theta);
  const tz = -Math.sin(theta);

  // Volume position along the shelf, centered on the wall.
  const along = (volume - (BOOKS_PER_SHELF - 1) / 2) * BOOK_SLOT_WIDTH;
  // Radial distance: book centered in the shelf cavity, jitter pulls it out.
  const radial = HEX_APOTHEM - SHELF_DEPTH / 2 - jitter.depthPush;

  const height = BOOK_HEIGHT * jitter.heightScale;
  const y = shelf * SHELF_PITCH + SHELF_BOARD_CLEARANCE + height / 2;

  return {
    position: {
      x: nx * radial + tx * along,
      y,
      z: nz * radial + tz * along,
    },
    // y: spine faces the room center; z: subtle lean within the slot.
    rotation: { x: 0, y: theta, z: jitter.lean },
    scale: { x: BOOK_THICKNESS, y: height, z: BOOK_DEPTH },
  };
}
