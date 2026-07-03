/**
 * Frozen library constants (spec §4.2–4.3).
 *
 * ⚠️ LIBRARY-DRIFT-CRITICAL. `BABEL_KEY` and `ALPHABET` — together with the
 * radices, `FEISTEL_ROUNDS`, the Ulam pairing, and the round function `F`
 * elsewhere in this folder — determine every glyph in the library. Changing any
 * of them re-shuffles all content and breaks the golden vector (§6 E5).
 * **Freeze forever once the Phase 4 golden vector is committed** (§3 C6).
 */
import { utf8Bytes } from './bytes';

/** index 0 = space, 1..26 = a..z, 27 = ',', 28 = '.'  (length 29). */
export const ALPHABET = ' abcdefghijklmnopqrstuvwxyz,.';

export const RADIX = 29n;
export const COLS = 80;

// Intra-room radices (Borges constants, §4.2).
export const WALLS = 4;
export const SHELVES = 5;
export const VOLUMES = 32;
export const PAGES = 410;
export const LINES = 40;

/** 4·5·32·410·40 — lines addressable within one room. */
export const LINES_PER_ROOM = 10_496_000n;

/** Line-content space size 29⁸⁰ ≈ 10¹¹⁷ ≈ 2³⁸⁹ — a perfect square (M = H²). */
export const M = RADIX ** 80n;
/** Feistel half-domain 29⁴⁰; M = H². */
export const H = RADIX ** 40n;
/** Rooms 0..ROOM_MAX-1 are addressable; the remainder < LINES_PER_ROOM is unaddressable. */
export const ROOM_MAX = M / LINES_PER_ROOM;

export const FEISTEL_ROUNDS = 8;
/** ceil(log2(H)/8) = ceil(194.34/8) — fixed-width big-endian serialisation of R (§4.7, E4). */
export const R_BYTES = 25;

/** Genesis key for the whole library. Freeze forever after Phase 4. */
export const BABEL_KEY = utf8Bytes('babel/v1/genesis');
