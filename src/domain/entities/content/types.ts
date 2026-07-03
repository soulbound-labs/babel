/**
 * Content addressing types (spec §4.1). `LineAddress` is the cipher's input
 * granularity and the concrete refinement of Unit 01's stubbed `Address`.
 */

/** The cipher's input: which room, plus the intra-room position down to one line. */
export type LineAddress = {
  n: bigint; // room coordinate (ℤ)
  floor: bigint; // room coordinate (ℤ)
  wall: number; // 0..3   (4 book-walls; the other 2 hexagon sides are doors)
  shelf: number; // 0..4
  volume: number; // 0..31
  page: number; // 0..409
  line: number; // 0..39
};

/**
 * Exactly one character from `ALPHABET`. A runtime invariant, not compile-time
 * enforced. A full on-screen glyph is a `LineAddress` + `col` (0..79); `col`
 * indexes into `line()`'s 80-char output and is not a cipher input.
 */
export type Glyph = string;
