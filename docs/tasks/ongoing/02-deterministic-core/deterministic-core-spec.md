# Babel — Unit 02: Deterministic Core Specification

**Version**: 1.0.0
**Status**: Draft
**Date**: 2026-07-03
**Unit**: 02 of 08 · Stage 2 · **depends on Unit 01**
**Supersedes**: [`deterministic-core-spec_old.md`](./deterministic-core-spec_old.md) (retained as inspiration brief only)
**Parent Spec**: none
**Child Specs (downstream consumers)**: Unit 03 (render), Unit 04 (staircase/books), Unit 06 (search), Unit 07 (multiplayer)

---

## 1. Overview

This unit populates `src/domain/` with the **pure, deterministic, framework-free
core** of Babel: a coordinate algebra over a ℤ² lattice and an **invertible
per-line content cipher**. It freezes the public contract (`src/domain/index.ts`)
that every downstream unit imports and never reaches behind, and it commits a
**golden-vector test** that locks the library's output forever.

After this unit: the same coordinate yields the same content for every user for
all time; move-loops close; `inverse()` round-trips against `line()`; and CI fails
the instant the algorithm drifts.

There is **no rendering, no Convex, no React, no I/O** in this unit. The Unit 01
boundary lint (`boundaries/dependencies`, proven live by
`pnpm script:verify-boundaries`) guarantees `src/domain/**` imports only the
standard library plus the audited `@noble/hashes`.

### 1.1 What "deterministic core" buys us

Content is a pure function of a **ℤ² lattice coordinate** `(n, floor)` plus an
intra-room address. Because the map is a **bijection over the 29⁸⁰ line-content
space**, two iconic behaviours fall out for free and are locked by tests:

1. **"Same coordinate → same book, forever."** Enforced by the golden vector +
   `@noble/hashes` (no runtime entropy, no `Date`, no `Math.random`).
2. **"Type (almost) any 80-char line → it is found somewhere."** `inverse()` is
   total except for a vanishing sub-room remainder (< 10.5M inputs out of ~10¹¹⁷).

---

## 2. Scope

| In Scope | Out of Scope |
|----------|--------------|
| Coordinate algebra: `moveVector`, `applyMove`, `invertMove`, `reduce` | Rendering of anything (Unit 03) |
| Coordinate `hash()` (SHA-256, for bookmarks/URLs/presence) | Search UI / result rendering (Unit 06) |
| Alphabet + base-29 codec | Convex, React, Node I/O, network, filesystem |
| Ulam-shell pairing `pair`/`unpair` (ℤ²↔ℕ, bigint) | WASM/Rust adapter (seam only — §7.2) |
| Line-index codec `encodeLineIndex`/`decodeLineIndex` | Depth-dependent semantic entropy (relocated to render — §7.1) |
| Balanced Feistel permutation + inverse | 6-way honeycomb moves (v2; MVP ships 4 linear moves) |
| Cipher `line()` / `inverse()` | Any change to `src/ports/` interfaces beyond type-refinement of `Address`/`Glyph` |
| `LocalContentProvider` adapter (delegates to domain) | Persisting/caching content |
| Frozen `src/domain/index.ts` barrel | The v2 "entropy deepens with distance" *cipher* behaviour (proven impossible — §7.1) |
| Golden-vector lock + property tests + ≥95% domain coverage | |

**Prerequisites (must already exist — verified true in this repo):**
`src/ports/index.ts` (Unit 01 forward-declared ports), `src/domain/index.ts`
(empty frozen barrel), the `boundaries/dependencies` lint, and the gate scripts
`compile` / `lint` / `test:unit:ci` / `script:verify-boundaries` / `ci:local` in
`package.json`.

---

## 3. Constraints (binding)

- **C1 — Purity.** `src/domain/**` imports only the JS standard library +
  `@noble/hashes`. No three.js, React, Convex, or Node built-ins. Enforced by
  `boundaries/dependencies` (no external grant to `domain`) and proven live by
  `pnpm script:verify-boundaries`.
- **C2 — `bigint`, never `number`, in the cipher and coordinates.** The
  addressable space is ~10¹¹⁷ ≫ `Number.MAX_SAFE_INTEGER`. All index/coordinate
  math is `bigint`. Intra-room field values (`wall`, `shelf`, …) are small
  non-negative `number`s (they index fixed small radices) and are converted to
  `bigint` before entering index math.
- **C3 — Total determinism, zero I/O.** No `Date`, `Math.random`, network, or
  filesystem anywhere under `src/domain/**`. Referential transparency is what
  makes the golden vector meaningful.
- **C4 — Invertibility is built and tested now**, even though search ships in
  Unit 06. `inverse()` and both round-trip directions are property-tested here.
- **C5 — Swappable implementation.** All content logic sits behind the
  `ContentProvider` port so a future `WasmContentProvider` is a drop-in. **No WASM
  in this unit.**
- **C6 — `BABEL_KEY`, `ALPHABET`, radices, `FEISTEL_ROUNDS`, the pairing, and the
  round function are choose-once-freeze-forever.** Changing any re-shuffles the
  whole library. The golden vector is the tripwire.
- **C7 — Toolchain (tooling-doctrine).** TypeScript only; **no `.js`/`.mjs`/`.cjs`**.
  Any executable script is `scripts/<name>.ts` run via `tsx`, and must typecheck
  under `tsconfig.scripts.json`.
- **C8 — Boundary-safe imports.** There is no eslint import-resolver configured,
  so cross-layer imports **inside `src/`** use **relative paths** (`../domain`),
  which the boundary plugin classifies correctly. **Test files** (`tests/**`) may
  use the `@/` alias (resolved at runtime by `vite-tsconfig-paths`); tests are not
  subject to the boundary lint.

---

## 4. Data Model (all types frozen in this unit)

### 4.1 Coordinate & content types

```ts
// src/domain/coordinates/types.ts
export type Coordinate = { n: bigint; floor: bigint };          // ℤ² lattice room address
export type Move = 'forward' | 'back' | 'up' | 'down';          // MVP: 4 moves (linear chain + stairs)
export const ORIGIN: Coordinate = { n: 0n, floor: 0n };

// src/domain/content/types.ts
export type LineAddress = {           // the cipher's input granularity
  n: bigint;                          // room coordinate (ℤ)
  floor: bigint;                      // room coordinate (ℤ)
  wall: number;                       // 0..3   (4 book-walls; the other 2 hexagon sides are doors)
  shelf: number;                      // 0..4
  volume: number;                     // 0..31
  page: number;                       // 0..409
  line: number;                       // 0..39
};
export type Glyph = string;           // exactly one char from ALPHABET (runtime invariant, not compile-enforced)
```

`LineAddress` is the concrete refinement of Unit 01's loosely-stubbed `Address`.
A full on-screen glyph is `LineAddress + col (0..79)`; `col` indexes into
`line()`'s 80-char output and is **not** a cipher input.

### 4.2 The Borges constants (frozen)

| Quantity | Value | Const name |
|---|---|---|
| Alphabet size | **29** (` ` + `a–z` + `,` + `.`) | `ALPHABET.length` |
| book-walls / hexagon | 4 | `WALLS` |
| shelves / wall | 5 | `SHELVES` |
| volumes / shelf | 32 | `VOLUMES` |
| pages / volume | 410 | `PAGES` |
| lines / page | 40 | `LINES` |
| chars / line | 80 | `COLS` |
| lines / room | **10,496,000** (4·5·32·410·40) | `LINES_PER_ROOM` |

### 4.3 Derived cryptographic constants (frozen)

```
RADIX          = 29n
M              = 29n ** 80n              // line-content space size ≈ 1.0×10¹¹⁷ ≈ 2³⁸⁹  (a PERFECT SQUARE)
H              = 29n ** 40n              // Feistel half-domain; M = H²
LINES_PER_ROOM = 10_496_000n
ROOM_MAX       = M / LINES_PER_ROOM      // floor division ≈ 2³⁶⁵ ; rooms 0..ROOM_MAX-1 are addressable
FEISTEL_ROUNDS = 8
BABEL_KEY      = utf8Bytes('babel/v1/genesis')   // library-drift-critical — freeze after Phase 4 golden vector
R_BYTES        = 25                      // ceil(log2(H)/8) = ceil(194.34/8); fixed-width PRF input for R
```

> **Invariant note.** `M = H²` and `H = 29⁴⁰` make the balanced Feistel a **clean
> bijection with no cycle-walking**. `ROOM_MAX · LINES_PER_ROOM ≤ M`, and the
> unaddressable remainder `M mod LINES_PER_ROOM < LINES_PER_ROOM = 10_496_000`,
> so `inverse()` returns `null` for fewer than 10.5M of the ~10¹¹⁷ possible lines.

### 4.4 The address → content pipeline

```
LineAddress
   │  (a) intra-room mixed-radix encode  → intra ∈ [0, 10_496_000)
   │  (b) Ulam-shell pairing ℤ²↔ℕ        → room  = pair(n, floor) ∈ ℕ
   │      GUARD: room ≥ ROOM_MAX ⇒ throw RangeError  (E7 — unaddressable-forward)
   ▼
lineIndex = room · LINES_PER_ROOM + intra                    ∈ [0, ROOM_MAX·LINES_PER_ROOM) ⊂ [0, M)
   │  (c) keyed balanced Feistel P over [0, M)  (bijection)
   ▼
contentInt ∈ [0, M)
   │  (d) base-29 decode, zero-padded (index-0 glyph = space) to exactly 80 digits
   ▼
Glyph[80]      ← this is line(address)
```

Inverse (`inverse`, consumed by Unit 06, built here):

```
Glyph[80] →(d⁻¹ base29 encode)→ contentInt ∈ [0, M)
         →(c⁻¹ feistelInverse)→ lineIndex ∈ [0, M)
         → room = lineIndex div LINES_PER_ROOM ,  intra = lineIndex mod LINES_PER_ROOM
         → if room ≥ ROOM_MAX ⇒ return null      (E2 — the vanishing unaddressable remainder)
         → else (n,floor) = unpair(room) ,  decode intra → LineAddress
```

### 4.5 Ulam-shell pairing (exact, invertible — no ambiguity permitted)

`pair : ℤ² → ℕ` is the origin-centred square-spiral bijection. Ring
`k = max(|n|, |floor|)` (Chebyshev distance) holds `8k` cells for `k ≥ 1`; ring 0
is the origin (index 0). Cumulative count of all cells in rings `0..k-1` is
`start(k) = 1 + 4k(k-1) = (2k-1)²`. Within ring `k`, the `8k` cells are walked
counter-clockwise over four edges of length `2k`, corners assigned to exactly one
edge:

| offset `o` in `[0, 8k)` | cell |
|---|---|
| `o ∈ [0, 2k)`  | `n = k`,        `floor = -k + o`          |
| `o ∈ [2k, 4k)` | `floor = k`,    `n = k - (o - 2k)`         |
| `o ∈ [4k, 6k)` | `n = -k`,       `floor = k - (o - 4k)`     |
| `o ∈ [6k, 8k)` | `floor = -k`,   `n = -k + (o - 6k)`        |

**`pair(n, floor)`** — if `n==0 && floor==0` return `0n`; else `k = max(|n|,|floor|)`,
then classify onto exactly one edge (bounds below are disjoint and exhaustive) to
get `o`, return `start(k) + o`:

- `n == k  && -k ≤ floor ≤ k-1`  → `o = floor + k`
- `floor == k && -k+1 ≤ n ≤ k`   → `o = 2k + (k - n)`
- `n == -k && -k+1 ≤ floor ≤ k`  → `o = 4k + (k - floor)`
- `floor == -k && -k ≤ n ≤ k-1`  → `o = 6k + (n + k)`

**`unpair(room)`** — if `room==0` return `{n:0n, floor:0n}`; else
`s = isqrt(room)`, `k = (s + 1n) / 2n`, `o = room - start(k)` (`o ∈ [0, 8k)`),
then invert the edge table above.

**`isqrt(v: bigint)`** — floor integer square root via Newton with exact
convergence (returns the unique `r` with `r² ≤ v < (r+1)²`):

```ts
function isqrt(v: bigint): bigint {
  if (v < 0n) throw new RangeError('isqrt of negative');
  if (v < 2n) return v;
  let x = v, y = (x + 1n) >> 1n;
  while (y < x) { x = y; y = (x + v / x) >> 1n; }
  return x;
}
```

### 4.6 Line-index codec (exact)

```
encodeLineIndex(a):
  validate wall∈0..3, shelf∈0..4, volume∈0..31, page∈0..409, line∈0..39   // else RangeError (E1)
  intra = ((((a.wall*5 + a.shelf)*32 + a.volume)*410 + a.page)*40 + a.line)   // ∈ [0, 10_496_000)
  room  = pair(a.n, a.floor)
  if room >= ROOM_MAX: throw RangeError                                       // E7 (unaddressable-forward)
  return room * LINES_PER_ROOM + BigInt(intra)

decodeLineIndex(x):                    // x assumed ∈ [0, M)
  room  = x / LINES_PER_ROOM
  if room >= ROOM_MAX: return null                                           // E2
  intra = Number(x % LINES_PER_ROOM)
  {n, floor} = unpair(room)
  line   = intra % 40;  intra //= 40
  page   = intra % 410; intra //= 410
  volume = intra % 32;  intra //= 32
  shelf  = intra % 5;   intra //= 5
  wall   = intra           // now 0..3
  return { n, floor, wall, shelf, volume, page, line }
```

### 4.7 Balanced Feistel (exact)

```
roundKey(i)          = hmac(sha256, BABEL_KEY, utf8(`round:${i}`))            // Uint8Array
F(i, R: bigint)      = bytesToBigintBE( hmac(sha256, roundKey(i), toBytesBE(R, R_BYTES)) ) mod H
feistel(x):          L = x / H; R = x % H
                     for i in 0..FEISTEL_ROUNDS-1:  (L, R) = (R, (L + F(i, R)) mod H)
                     return L * H + R
feistelInverse(y):   L = y / H; R = y % H
                     for i in FEISTEL_ROUNDS-1..0:  (L, R) = ((R - F(i, L) + H) mod H, L)
                     return L * H + R
```

`toBytesBE(R, 25)` serialises `R ∈ [0, H)` to exactly 25 big-endian bytes
(`H < 2¹⁹⁵ < 2²⁰⁰`, fits). Modulo bias reducing a 256-bit HMAC output `mod H` is
`≤ H/2²⁵⁶ ≈ 2⁻⁶¹` — negligible for a non-adversarial deterministic art piece, and
**irrelevant to invertibility** (any deterministic `F` yields a bijection).

### 4.8 Alphabet & base-29 (exact)

```
ALPHABET = ' abcdefghijklmnopqrstuvwxyz,.'   // index 0 = space, 1..26 = a..z, 27 = ',', 28 = '.'
glyphToDigit(g) = ALPHABET.indexOf(g)         // throws/asserts on -1
digitToGlyph(d) = ALPHABET[d]
base29Encode(glyphs: Glyph[]): bigint         // x = Σ digit·29^(79-i); requires length 80
base29Decode(x: bigint): Glyph[]              // big-endian, left-pad with index-0 glyph to exactly 80
```

### 4.9 Module layout (all under `src/domain/`)

```
coordinates/
  types.ts        Coordinate, Move, ORIGIN
  moves.ts        moveVector, applyMove, invertMove, reduce
  hash.ts         hash(coord) → hex   (SHA-256; bookmarks/URLs/presence)
content/
  types.ts        LineAddress, Glyph
  config.ts       ALPHABET, radices, LINES_PER_ROOM, M, H, ROOM_MAX, FEISTEL_ROUNDS, BABEL_KEY, R_BYTES
  bytes.ts        toBytesBE, bytesToBigintBE, utf8Bytes         (pure bigint↔bytes helpers)
  alphabet.ts     glyphToDigit, digitToGlyph, base29Encode, base29Decode
  pairing.ts      isqrt, pair, unpair                            (Ulam-shell ℤ²↔ℕ)
  codec.ts        encodeLineIndex, decodeLineIndex
  permutation.ts  roundKey, F, feistel, feistelInverse
  cipher.ts       line, inverse
index.ts          FROZEN BARREL — re-exports the §4.10 surface only
```

### 4.10 Frozen public surface (`src/domain/index.ts`)

```ts
export type { Coordinate, Move } from './coordinates/types';
export type { LineAddress, Glyph } from './content/types';
export { ORIGIN } from './coordinates/types';
export { applyMove, invertMove, reduce } from './coordinates/moves';
export { hash } from './coordinates/hash';
export { line, inverse } from './content/cipher';
```

Anything not re-exported here is private to the domain. Downstream `src/` layers
import from `../domain` (relative — C8); test files import from `@/domain`.

### 4.11 Port refinement (`src/ports/index.ts`)

Unit 01 declared `Address` and `Glyph` as `unknown`, "finalized in Unit 02". This
unit refines them **without changing the `ContentProvider`/`PresencePort`
interface shapes**:

```ts
import type { LineAddress, Glyph } from '../domain';   // relative — ports→domain is lint-allowed (C8)
export type Address = LineAddress;
export type { Glyph };
// ContentProvider / PresencePort interface bodies unchanged (still line/inverse, publish/subscribe)
```

`ports → domain` is permitted by `boundaries/dependencies`
(`{ from: ports, allow: { to: [domain, ports] } }`), and `domain` never imports
`ports`, so no cycle is introduced.

---

## 5. Invariants

Each has a machine-checkable property test (§8). `INV` ids are referenced by the
FMEA (§9) and verification (§10).

| # | Invariant | Check |
|---|---|---|
| INV-1 | **Loop closure.** `reduce(['forward','back']) === ORIGIN`; `reduce(['up','forward','down','back']) === ORIGIN`. | Property #1 |
| INV-2 | **Path-independence.** Any two move sequences with equal net vector reduce to the same coordinate. | Property #2 |
| INV-3 | **Move inverses.** `applyMove(applyMove(c,m), invertMove(m)) === c`. | Property #3 |
| INV-4 | **Hash determinism + no observed collision** across 10⁴ distinct coords. | Property #4 |
| INV-5 | **Pairing bijectivity.** `unpair(pair(n,floor)) === {n,floor}` for `|n|,|floor| ≤ 512`; `pair(unpair(k)) === k` for `k < 4·10⁶`. | Property #7 |
| INV-6 | **Large-room pairing bijectivity.** `pair(unpair(k)) === k` at ring boundaries `start(k)`, `start(k)±1`, and near `ROOM_MAX-1`, for `k` up to ~10⁹ and beyond. | Property #7b |
| INV-7 | **Base-29 round-trip.** `base29Decode(base29Encode(g)) === g` for any `Glyph[80]`. | Property #10 |
| INV-8 | **Feistel bijectivity.** `feistelInverse(feistel(x)) === x` and `feistel(x) ∈ [0, M)` for random `x ∈ [0, M)`. | Property #12 |
| INV-9 | **Cipher determinism.** `line(a) === line(a)`. | Property #5 |
| INV-10 | **Forward round-trip.** `inverse(line(a)) === a` for random in-box `a`. | Property #6 |
| INV-11 | **Reverse round-trip (the search path).** For random `Glyph[80]` g: if `inverse(g) !== null` then `line(inverse(g)) === g`. | Property #6b |
| INV-12 | **Alphabet & length integrity.** Every `line(a)` has length 80; every glyph ∈ `ALPHABET`. | Property #8 |
| INV-13 | **Bijection tripwire.** 10⁴ distinct addresses → 10⁴ distinct lines (guaranteed by construction; catches accidental `Number()` truncation / key mixups). | Property #9 |
| INV-14 | **Golden vector.** `line({n:0n,floor:0n,wall:0,shelf:0,volume:0,page:0,line:0}).join('')` equals the committed 80-char string. | Property #11 |
| INV-15 | **Framework-free core.** No `three`/`react`/`convex` import under `src/domain/`; `pnpm script:verify-boundaries` green. | §10 gate |

---

## 6. Error Handling & Edge Cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Out-of-range intra field (`wall`/`shelf`/`volume`/`page`/`line`) | `encodeLineIndex` throws `RangeError` (programmer bug; never user input in MVP). |
| E2 | `inverse` on unaddressable content (sub-room remainder) | returns `null`. Unit 06 must render as "exists in the library, at no walkable coordinate." |
| E3 | Accidental `number` coercion in index math | Banned by review + `@typescript-eslint`; the golden vector (INV-14) catches any `Number()` truncation instantly. |
| E4 | HMAC input width | `R` serialised to fixed 25-byte big-endian (`R_BYTES`), so the PRF domain is unambiguous and stable forever. |
| E5 | Library drift (any change to `ALPHABET`, radices, `BABEL_KEY`, `FEISTEL_ROUNDS`, pairing, or `F`) | Changes all content → golden-vector test (INV-14) fails. Requires a deliberate version bump, never a silent edit. |
| E6 | Base-29 endianness / padding | Fixed big-endian, left-pad to 80 with index-0 glyph; locked by INV-7. |
| E7 | **Unaddressable-forward:** `line()` on a coordinate whose `pair(n,floor) ≥ ROOM_MAX` | `encodeLineIndex` throws `RangeError`. Unreachable for MVP (players walk near origin), but makes the forward map **total and honest** rather than silently overflowing the Feistel domain. Symmetric with E2 on the inverse side. |
| E8 | `inverse` receives a string of wrong length / non-alphabet glyph | `base29Encode`/`glyphToDigit` throws `RangeError` (contract: `inverse` takes a valid `Glyph[80]`). |

---

## 7. Key Design Decisions

### 7.1 The depth-entropy Feistel "seam" is impossible — depth aesthetics move to the render layer

> **Insight**: A globally-invertible content cipher **cannot** have its scrambling
> keyed on the room's depth, because the room is not known at decrypt time.

The inspiration brief proposed a v2 seam where `roundKey(i)` becomes a function of
`ring(room)` so "deeper rooms mix differently." Trace the inverse:

```
inverse: contentInt → (need round keys) → (need ring) → (need room) → (need lineIndex)
                                                                        └── which is what we are computing
```

The round keys depend on `ring(room)`, but `room` is only recovered **after**
`feistelInverse`. This is a hard circular dependency: a tweak for tweakable
format-preserving encryption must be known **independently** to both encrypt and
decrypt. Here the would-be tweak (`ring`) is part of the plaintext being
encrypted and is **not** recoverable from the ciphertext without first decrypting.

| Approach | Behaviour | Problem |
|---|---|---|
| Per-ring Feistel keys (brief's seam) | Deep rooms mix differently | **Breaks `inverse()`** — ring unknown at decrypt time |
| Permute only *within* a room (room preserved in clear) | Keeps per-ring keying possible | **Kills the "type anything → found in an unpredictable far room" magic** — nearby strings map to nearby rooms |
| **Global fixed bijection (chosen)** | One permutation over all of `[0, M)`; `roundKey(i)` depends on `BABEL_KEY` + round only | Preserves both invertibility **and** the "found anywhere" magic |

**Resolution.** The cipher is a single fixed global bijection. `roundKey(i)`
depends only on `BABEL_KEY` and the round index `i` — never on the room. The
"depth feels different" *aesthetic* is relocated to the **render layer** (Unit 03+),
which stands in a known room and therefore **has `ring(room)` in the clear**. Depth
can drive colour, fog, glyph treatment, audio — none of which touch the invertible
core. This is the honest version of the seam: the extension point is real, it just
lives where the room coordinate is actually available.

### 7.2 The real swap seam is the port, not the cipher internals

The only sanctioned future replacement is a whole-provider swap
(`LocalContentProvider` → `WasmContentProvider`) behind `ContentProvider`. A Rust→WASM
port **must reproduce the golden vector byte-for-byte or fail CI** — that is what
makes "same coordinate, same book, forever" a fact rather than an aspiration.

### 7.3 `bigint` coordinates, not `number`

Coordinates are `bigint` because the addressable box fills nearly all of 29⁸⁰ to
deliver the "found anywhere" behaviour, which puts room indices far past
`Number.MAX_SAFE_INTEGER`. The render layer works in a small **local float frame**
around a bigint origin (the floating-origin design), so bigint coords cost the
renderer almost nothing while keeping Unit 06 search from forcing a core rewrite.

---

## 8. Testing Strategy

Property + unit tests (`fast-check`) under `tests/unit/domain/`, mirroring the
module layout. **Node** vitest project (pure, no DOM — matches the existing
`tests/unit/{domain,ports}/**` include). Test files import via `@/domain` (C8).

**Algebra**
1. Loop closure (INV-1) — includes the explicit assertions
   `reduce(['forward','back']) === ORIGIN` and `reduce(['up','forward','down','back']) === ORIGIN`.
2. Path-independence (INV-2).
3. Move inverses (INV-3).
4. Hash determinism + no collision across 10⁴ sampled coords (INV-4).

**Cipher**
5. Determinism (INV-9).
6. Forward round-trip `inverse(line(a)) === a`, `n,floor` sampled in `±10⁶`, intra fields in range (INV-10).
6b. **Reverse round-trip** `line(inverse(g)) === g` for random `Glyph[80]` g where `inverse(g) !== null` (INV-11) — **this is the property that exercises `unpair` on astronomically large rooms**, the real search path.
7. Pairing bijectivity over the bounded window (INV-5).
7b. **Large-room pairing** at ring boundaries and near `ROOM_MAX` (INV-6) — direct `unpair`/`isqrt` stress at the scale real search inputs hit.
8. Alphabet & length integrity (INV-12).
9. Bijection tripwire: 10⁴ distinct addresses → 10⁴ distinct lines (INV-13). *Note: cannot fail unless a bug collapses distinct indices — that is its purpose.*
10. Base-29 round-trip (INV-7).
11. **Golden vector** (INV-14): with `BABEL_KEY` fixed, the origin line equals a committed 80-char string. Generated once (Phase 4.3), never regenerated.
12. Feistel bijectivity + range (INV-8).

**Coverage gate:** `src/domain/**` ≥ 95% (v8), configured as a per-glob threshold
in `vitest.config.ts`.

---

## 9. Failure Modes & Mitigations (FMEA)

| # | Failure Mode | Severity | Mitigation |
|---|---|---|---|
| 1 | Algorithm silently drifts (dep bump, refactor, WASM swap) → every book changes | **Critical** | Golden vector INV-14 fails CI (E5). Freeze constants (C6). |
| 2 | `number` truncation sneaks into index math | **Critical** | `bigint`-only (C2); INV-14 tripwire; INV-13. |
| 3 | `unpair`/`isqrt` off-by-one at a ring boundary → search maps to wrong room | **High** | INV-6 boundary tests + INV-11 reverse round-trip; exact `isqrt` correction loop (§4.5). |
| 4 | Feistel not actually invertible (round-inverse coded wrong) | **High** | INV-8 direct test + INV-10/INV-11 round-trips. |
| 5 | Base-29 padding/endianness inconsistency | **High** | INV-7 round-trip; fixed big-endian left-pad (E6). |
| 6 | `line()` overflows Feistel domain on a far coordinate | Medium | E7 guard throws `RangeError` (total forward map). |
| 7 | A framework import leaks into `src/domain/` | **High** | `boundaries/dependencies` lint + `pnpm script:verify-boundaries` (INV-15). |
| 8 | Port `Address`/`Glyph` refinement breaks Unit 01 consumers or the boundary lint | Medium | Refine types only (interface bodies unchanged); relative import (C8); `pnpm compile` + `pnpm lint` gate. |
| 9 | `@noble/hashes` subpath differs across `^1.8 \|\| ^2.0` | Medium | Use `@noble/hashes/sha2` + `@noble/hashes/hmac` (valid in both majors); verify import resolves in Phase 1. |

**Recovery / idempotency.** Every phase gate is re-runnable and side-effect-free
(pure code + tests). A crash mid-phase is recovered by re-running the phase's
`Verify`/`Gate` — no data store, no migration, nothing to roll back. The **one**
irreversible act is committing the golden vector (Phase 4.3): once captured it must
**never** be regenerated; if it is lost before commit, re-run the print script (the
value is deterministic, so it reproduces exactly).

---

## 10. Verification (whole-unit acceptance)

- [ ] `pnpm ci:local` green (compile → lint → format:check → boundaries → unit tests → build).
- [ ] All twelve property groups pass, including INV-11 (reverse round-trip) and INV-6 (large-room pairing).
- [ ] Golden-vector test (INV-14) present with a hard-coded 80-char string and a "never regenerate" comment.
- [ ] `src/domain/**` coverage ≥ 95%.
- [ ] `pnpm script:verify-boundaries` green; `grep -rE "from '(three|react|convex)" src/domain` returns nothing.
- [ ] `src/domain/index.ts` exports exactly the §4.10 surface — no more.
- [ ] `LocalContentProvider` implements `ContentProvider` and returns an 80-glyph line for `ORIGIN`.
- [ ] `src/ports/index.ts` `Address = LineAddress`, `Glyph = string`; interface shapes unchanged.

---

## 11. Prompt Execution Strategy

Executor has no context beyond this spec. **All index/coordinate logic is `bigint`.**
Hashing comes from `@noble/hashes/sha2` (`sha256`) and `@noble/hashes/hmac` (`hmac`).
Cross-layer `src/` imports are **relative**; test imports use `@/`. **Do not proceed
past a red gate.**

> **Gate command reference (verified against `package.json`):**
> `pnpm compile` · `pnpm lint` · `pnpm test:unit:ci [path]` ·
> `pnpm script:verify-boundaries` · `pnpm ci:local`.

### Phase 1: Types, config, alphabet, byte helpers

#### Step 1.1: Install hashing dep + write config & byte helpers

Add `@noble/hashes` as a direct dependency (`pnpm add @noble/hashes`). Confirm the
subpaths `@noble/hashes/sha2` (exports `sha256`) and `@noble/hashes/hmac` (exports
`hmac`) resolve for the installed major (works for `^1.8.0 || ^2.0.0`).

Create `src/domain/content/config.ts` exporting the §4.2–4.3 constants (all
`bigint` where numeric-large): `ALPHABET`, `RADIX=29n`, `COLS=80`, `WALLS=4`,
`SHELVES=5`, `VOLUMES=32`, `PAGES=410`, `LINES=40`, `LINES_PER_ROOM=10_496_000n`,
`M=RADIX**80n`, `H=RADIX**40n`, `ROOM_MAX=M/LINES_PER_ROOM`, `FEISTEL_ROUNDS=8`,
`R_BYTES=25`, and `BABEL_KEY=utf8Bytes('babel/v1/genesis')`. Add a header comment
marking `BABEL_KEY` and `ALPHABET` as library-drift-critical (freeze after the
Phase 4 golden vector).

Create `src/domain/content/bytes.ts`: `utf8Bytes(s)`, `toBytesBE(x: bigint, len: number)`
(fixed-width big-endian, throws if `x` doesn't fit), `bytesToBigintBE(b)`. Pure, no
Node `Buffer` (use `TextEncoder` + manual byte math to stay framework/Node-free).

##### Verify

- `pnpm compile`
- `pnpm lint`

##### Timeout

120000

#### Step 1.2: Coordinate & content types

Create `src/domain/coordinates/types.ts` (`Coordinate`, `Move`, `ORIGIN`) and
`src/domain/content/types.ts` (`LineAddress`, `Glyph`) exactly per §4.1. Ensure
`LineAddress.n` and `.floor` are `bigint`.

##### Verify

- `pnpm compile`

##### Timeout

90000

#### Step 1.3: Alphabet & base-29 (+ test)

Create `src/domain/content/alphabet.ts`: `glyphToDigit`, `digitToGlyph`,
`base29Encode(Glyph[]) → bigint`, `base29Decode(bigint) → Glyph[]` per §4.8
(big-endian, left-pad to 80 with index-0 glyph). Create
`tests/unit/domain/content/alphabet.spec.ts` asserting INV-7 (property #10) with
`fast-check`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/alphabet.spec.ts`

##### Timeout

120000

#### Gate

- `pnpm compile`
- `pnpm lint`

### Phase 2: Coordinate algebra

#### Step 2.1: Moves & reduce

Create `src/domain/coordinates/moves.ts`: `moveVector` (forward `{+1,0}`, back
`{-1,0}`, up `{0,+1}`, down `{0,-1}`), `applyMove`, `invertMove`
(forward↔back, up↔down), `reduce(moves, from = ORIGIN)` summing move-vectors onto
`from` (bigint adds; path-independent by construction).

##### Verify

- `pnpm compile`

##### Timeout

90000

#### Step 2.2: Coordinate hash

Create `src/domain/coordinates/hash.ts`: `hash(c)` = lowercase hex SHA-256 of
`` `${c.n}:${c.floor}` `` using `sha256` from `@noble/hashes/sha2`.

##### Verify

- `pnpm compile`

##### Timeout

90000

#### Step 2.3: Algebra property tests

Create `tests/unit/domain/coordinates/moves.spec.ts` and `hash.spec.ts` asserting
INV-1..INV-4 (properties #1–#4) with `fast-check`, including the explicit
loop-closure assertions
`reduce(['forward','back']) === ORIGIN` and
`reduce(['up','forward','down','back']) === ORIGIN`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/coordinates`

##### Timeout

150000

#### Gate

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci tests/unit/domain/coordinates`

### Phase 3: Pairing, codec, permutation, cipher

#### Step 3.1: Ulam-shell pairing ℤ²↔ℕ (+ test)

Create `src/domain/content/pairing.ts`: `isqrt`, `pair`, `unpair` exactly per §4.5
(Newton `isqrt` with the correction loop; the four-edge table for pair/unpair).
Create `tests/unit/domain/content/pairing.spec.ts` asserting **INV-5** (property #7:
round-trip both directions over `|n|,|floor| ≤ 512` and `k < 4·10⁶`) **and INV-6**
(property #7b: `pair(unpair(k)) === k` at `k = start(K)`, `start(K)±1n` for several
large `K` up to ~1e9, and at `ROOM_MAX - 1n`). Do not proceed unless both hold.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/pairing.spec.ts`

##### Timeout

180000

#### Step 3.2: Line-index codec

Create `src/domain/content/codec.ts`: `encodeLineIndex` and `decodeLineIndex` per
§4.6, with intra-field validation (E1 → `RangeError`), the forward
`room >= ROOM_MAX → RangeError` guard (E7), and the inverse
`room >= ROOM_MAX → null` guard (E2).

##### Verify

- `pnpm compile`

##### Timeout

90000

#### Step 3.3: Balanced Feistel permutation (+ test)

Create `src/domain/content/permutation.ts`: `roundKey(i)`, `F(i, R)`, `feistel(x)`,
`feistelInverse(x)` exactly per §4.7 (HMAC via `hmac` from `@noble/hashes/hmac`
with `sha256`; `R` serialised through `toBytesBE(R, R_BYTES)`; 8 rounds). Create
`tests/unit/domain/content/permutation.spec.ts` asserting **INV-8** (property #12):
`feistelInverse(feistel(x)) === x` and `feistel(x) ∈ [0, M)` for random `bigint`
`x ∈ [0, M)`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/permutation.spec.ts`

##### Timeout

180000

#### Step 3.4: Cipher (line / inverse) (+ test)

Create `src/domain/content/cipher.ts`: `line(LineAddress) → Glyph[]` (length 80)
and `inverse(Glyph[]) → LineAddress | null` composing alphabet + codec +
permutation per §4.4. Create `tests/unit/domain/content/cipher.spec.ts` asserting
**INV-9, INV-10, INV-11, INV-12, INV-13** (properties #5, #6, #6b, #8, #9) with
`fast-check`. INV-11 (`line(inverse(g)) === g` for non-null) is mandatory — it is
the reverse round-trip that validates the search path and large-room `unpair`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/cipher.spec.ts`

##### Timeout

180000

#### Gate

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci tests/unit/domain/content`

### Phase 4: Port refinement, adapter, frozen barrel, golden vector, coverage

#### Step 4.1: Refine the port + content-provider adapter

Refine `src/ports/index.ts` per §4.11: `import type { LineAddress, Glyph } from '../domain'`,
`export type Address = LineAddress`, re-export `Glyph`; leave the `ContentProvider`
and `PresencePort` **interface bodies unchanged**.

Create `src/adapters/content/local-content-provider.ts`: `LocalContentProvider`
implementing `ContentProvider` by delegating to `../domain`'s `line`/`inverse`
(relative import — C8). Add `tests/unit/domain/... ` is DOM-free; place the adapter
test at `tests/unit/domain/adapters-local-content-provider.spec.ts` **or**
`tests/unit/ports/...` (both are in the node vitest project) asserting the adapter
returns an 80-glyph line for `ORIGIN`'s address
`{n:0n,floor:0n,wall:0,shelf:0,volume:0,page:0,line:0}`.

> Note: `tests/unit/adapters/**` is **not** in the vitest include globs — put
> adapter tests under `tests/unit/domain/**` or `tests/unit/ports/**` so they run.

##### Verify

- `pnpm compile`
- `pnpm lint`

##### Timeout

120000

#### Step 4.2: Freeze the domain barrel

Populate `src/domain/index.ts` with exactly the §4.10 exports — no more. Confirm
the boundary lint still passes and no framework import exists under `src/domain/`.

##### Verify

- `pnpm script:verify-boundaries`
- `! grep -rE "from '(three|react|convex)" src/domain`

##### Timeout

90000

#### Step 4.3: Generate and commit the golden vector

Write a one-off TypeScript script `scripts/print-golden.ts` (run via `tsx`, **not**
node — C7) that imports `line` via a **relative** path (`../src/domain/index` — the
`@/` alias is not resolved by `tsx` without a loader) and prints
`line({n:0n,floor:0n,wall:0,shelf:0,volume:0,page:0,line:0}).join('')`. Run it with
`tsx scripts/print-golden.ts`, capture the exact 80-char string, and hard-code it
into `tests/unit/domain/content/golden.spec.ts` as INV-14 (property #11). Add a
comment: **regenerating this string is forbidden — it locks the library.** Keep the
script under `scripts/` clearly marked one-off (it is covered by
`tsconfig.scripts.json`), or delete it after capture.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/golden.spec.ts`

##### Timeout

120000

#### Step 4.4: Coverage gate + doctrine mark

In `vitest.config.ts`, add a per-glob coverage threshold for the domain:
`coverage.thresholds` with `'src/domain/**': { statements: 95, branches: 95, functions: 95, lines: 95 }`.
Update `docs/doctrine/01-frozen-contracts.md` to mark `src/domain/index.ts` as
**populated-and-frozen** (§4.10 surface). *(No ADR — per project decision.)*

##### Verify

- `pnpm ci:local`

##### Timeout

180000

#### Gate

- `pnpm ci:local`

---

## 12. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-03 | Initial spec, rewritten from first principles off the inspiration brief. Resolves: gate/port/script staleness (aligned to actual `package.json` + `src/ports/` + tsx); **removes the impossible depth-entropy Feistel seam** and relocates depth aesthetics to the render layer (§7.1); adds reverse round-trip (INV-11) and large-room pairing (INV-6) properties; adds forward `ROOM_MAX` guard (E7); reframes injectivity as a bijection tripwire (INV-13); pins `@noble/hashes` `sha2`/`hmac` subpaths. |
