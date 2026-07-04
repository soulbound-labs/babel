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

// ── Unit 05 reading constants (§4.2) — appended, additive only (§4.7).
// Seams/geometry, not knobs: byte-frozen at the chills-gate. The one declared
// mood KNOB is the reading glow (defaults below, module: reading/reading-light.ts).
export const PAGE_LINES = 40; // Borges page format — pinned to the core codec by INV-B9
export const PAGE_COLS = 80; // pinned to the core codec by INV-B9
export const BOOK_PAGES = 410; // pages per volume (Borges constant, mirrors the core codec)
export const READ_LINES_PER_SECOND = 16; // locked cadence — a full spread resolves in 2.5 s
export const READ_TURN_SECONDS = 0.9; // spine-pivot page turn, lift → settle
export const READ_APPROACH_SECONDS = 1.1; // shelf → reading-rest ease (monotonic, no snap)
export const READ_DISTANCE = 0.4; // book rest, meters in front of the held camera
export const READ_HEIGHT_OFFSET = -0.1; // book center sits below the eye line
/** One page face — the book's shelf depth becomes the open page width. */
export const PAGE_FACE_WIDTH = SHELF_DEPTH * 0.75; // 0.24 — matches the shelved book depth
export const PAGE_FACE_HEIGHT = BOOK_HEIGHT; // 0.31
export const PAGE_TEXT_MARGIN = 0.02; // vellum border around the glyph block
/** Glyph cell (§4.2): 80 cols × 40 lines inside the margins. */
export const READ_CELL_WIDTH = (PAGE_FACE_WIDTH - 2 * PAGE_TEXT_MARGIN) / PAGE_COLS;
export const READ_LINE_PITCH = (PAGE_FACE_HEIGHT - 2 * PAGE_TEXT_MARGIN) / PAGE_LINES;
/** Reading-glow defaults (KDD-8) — live-tuned at the gate via reading-light.ts. */
export const READ_GLOW_COLOR = '#ffc78f'; // warmer than the bulbs' #ffd9a0
export const READ_GLOW_INTENSITY = 1.4;
export const READ_GLOW_DISTANCE = 1.3; // short range: lifts the book, never the walls
/** Whisper of vellum emissive — anti grazing-black only, never a glow source. */
export const VELLUM_COLOR = '#c7b592';
export const VELLUM_EMISSIVE = '#181309';
export const VELLUM_EMISSIVE_INTENSITY = 0.5;
