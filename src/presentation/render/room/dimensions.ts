/**
 * Canonical room dimensions (§4.3) — the single source every later unit
 * (staircase, book pick, asset pass) builds against. Derivation is from the
 * Borges passages; the load-bearing choice is faithful-cramped.
 */
// Frozen after the mood gate — Units 04/05/06 consume these. Do not retune casually.
export const CEILING_HEIGHT = 2.0; // "scarcely exceeds the height of a normal librarian"
export const HEX_SIDE = 2.0; // fits 32 uniform spines + shelf frame per wall
export const HEX_APOTHEM = (HEX_SIDE * Math.sqrt(3)) / 2; // ≈ 1.732 — wall distance from center

export const SHELVES_PER_WALL = 5; // floor to ceiling
export const SHELF_PITCH = CEILING_HEIGHT / SHELVES_PER_WALL; // 0.4 — shelf-to-shelf
export const SHELF_DEPTH = 0.32;
export const BOOKS_PER_SHELF = 32;
export const BOOK_HEIGHT = 0.31; // uniform format
export const BOOK_SLOT_WIDTH = 0.052; // 32 × 0.052 = 1.664, framed within the 2.0 wall

export const SHAFT_RADIUS = 0.72; // circumradius of the hexagonal floor/ceiling opening
export const RAILING_RADIUS = 0.8;
export const RAILING_HEIGHT = 0.62; // "low railing"

export const DOOR_WIDTH = 0.9;
export const DOOR_HEIGHT = 1.9;

export const VESTIBULE_WIDTH = 2.0; // matches the free side
export const VESTIBULE_DEPTH = 2.4;
export const CLOSET_SIDE = 0.8; // two, flanking the vestibule
export const MIRROR_WIDTH = 0.7;
export const MIRROR_HEIGHT = 1.4;
export const STAIR_RADIUS = 0.78; // static spiral, this unit

export const EYE_HEIGHT = 1.62;
export const PLAYER_RADIUS = 0.28;
export const WALK_SPEED = 1.4; // m/s — a person, not a strafe-jumper
export const POSE_PITCH_MAX = (80 * Math.PI) / 180;
