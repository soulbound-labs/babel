/**
 * Forward-declared ports (§2.1) — INTERFACES ONLY, no
 * implementations. These are frozen seams: downstream units provide adapters
 * that satisfy these shapes, so wiring them in is a swap, not a refactor.
 *
 *   - ContentProvider → implemented by the pure core in Unit 02.
 *   - PresencePort    → no-op impl in Unit 03, real Convex impl in Unit 05·B.
 *
 * Unit 02 refines Address/Glyph to their concrete domain shapes (interface
 * bodies unchanged). `domain/ports → domain/entities` is permitted by the
 * boundary rule, and `entities` never imports `ports`, so no cycle is
 * introduced. PlayerState stays loose until Unit 03. See docs/doctrine/architecture.md.
 */
import type { Glyph, LineAddress } from '../entities';

/** A ℤ² lattice room address + intra-room position (refined from Unit 01's stub). */
export type Address = LineAddress;

/** A single glyph from the 29-char alphabet (refined from Unit 01's stub). */
export type { Glyph };

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
