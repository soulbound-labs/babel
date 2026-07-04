/**
 * Page folios (§4.2) — the human-facing page number, rendered as LOWERCASE
 * roman numerals. Lowercase is deliberate: roman uses only `i v x l c d m`,
 * every one of which is in the vendored 29-glyph reading subset (space + a–z +
 * ',' + '.'), so folios need no new font asset and stay offline/deterministic.
 * A whole volume is BOOK_PAGES (410) pages ⇒ the largest folio is `cdxi`, well
 * inside the additive (no-overline) range.
 *
 * Pure and node-tested (folio.spec.ts) — never called in `useFrame`.
 */

/** Value → lowercase-glyph pairs, descending (subtractive forms included). */
const NUMERALS: ReadonlyArray<readonly [number, string]> = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

/**
 * Lowercase roman numeral for `n`. Non-positive / non-integer input yields the
 * empty string (a blank folio) rather than throwing — a missing leaf simply
 * shows no number.
 */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1) return '';
  let remaining = n;
  let out = '';
  for (const [value, glyphs] of NUMERALS) {
    while (remaining >= value) {
      out += glyphs;
      remaining -= value;
    }
  }
  return out;
}
