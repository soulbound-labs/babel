/**
 * Forward-declared application ports (§2.1) — INTERFACES ONLY, no
 * implementations. These are frozen seams: downstream units provide adapters
 * that satisfy these shapes, so wiring them in is a swap, not a refactor.
 *
 *   - ContentProvider → implemented by the pure core in Unit 02.
 *   - PresencePort    → no-op impl in Unit 03, real Convex impl in Unit 05·B.
 *
 * The placeholder types below are deliberately loose (`unknown`); their real
 * shapes are finalized in Unit 02 (Address/Glyph, alongside reduce/hash/line/
 * inverse) and Unit 03 (PlayerState). Keeping them loose here avoids committing
 * the cipher/render design before it exists — see docs/doctrine/01-frozen-contracts.md.
 */

/** A ℤ² lattice address `(n, floor)` + intra-volume position. Shape finalized in Unit 02. */
export type Address = unknown;

/** A single glyph from the 29-char alphabet. Shape finalized in Unit 02. */
export type Glyph = unknown;

/** A player's presence/pose in the world. Shape finalized in Unit 03. */
export type PlayerState = unknown;

/**
 * Maps a lattice address to its deterministic line of glyphs, and back.
 * Implemented by the pure domain core (Unit 02).
 */
export interface ContentProvider {
  line(address: Address): Glyph[];
  inverse(line: Glyph[]): Address | null;
}

/**
 * Publish/subscribe transport for remote player presence.
 * No-op impl in Unit 03; Convex-backed impl in Unit 05·B.
 */
export interface PresencePort {
  publish(state: PlayerState): void;
  subscribe(cb: (states: PlayerState[]) => void): () => void;
}
