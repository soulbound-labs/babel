/**
 * FROZEN PUBLIC CONTRACT — the deterministic core barrel (spec §4.10).
 *
 * This is the ONLY surface downstream units may import; anything not re-exported
 * here is private to the domain. Populated by Unit 02 with the pure lattice +
 * cipher API and nothing else.
 *
 * INVARIANT: nothing under src/domain/ may import framework code (react, three,
 * convex) or any outward layer. Enforced as a lint error by
 * `boundaries/dependencies` (see eslint.config.ts), proven live by
 * `pnpm script:verify-boundaries`. The single permitted external is
 * `@noble/hashes` (audited SHA-256/HMAC — Unit 02 C1).
 */
export type { Coordinate, Move } from './coordinates/types';
export type { LineAddress, Glyph } from './content/types';
export { ORIGIN } from './coordinates/types';
export { applyMove, invertMove, reduce } from './coordinates/moves';
export { hash } from './coordinates/hash';
export { line, inverse } from './content/cipher';
