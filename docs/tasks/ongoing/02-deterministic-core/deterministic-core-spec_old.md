# Babel — Unit 02: Deterministic Core — Technical Specification

> **⚠️ SUPERSEDED — treat as an inspiration brief, not an executable spec.**
> Retained for its math and narrative. Do **not** execute it: its gate commands,
> port path, and script format are stale against the repo, and its "depth-entropy
> Feistel seam" is architecturally incompatible with an invertible cipher (see the
> new spec's §7.1). The executable replacement is
> [`deterministic-core-spec.md`](./deterministic-core-spec.md).

**Version**: 1.0.0
**Status**: ~~Draft~~ **DEPRECATED / brief-only**
**Author**: Architect (Claude) + Rei
**Date**: 2026-07-03
**Unit**: 02 of 08 · Stage 2 · **depends on 01**
**Scope**: pure logic only — no rendering, no Convex, no React. This unit populates `src/domain/` and freezes the public contract that Units 03–06 import.

---

## 1. Overview

### 1.1 Objective function

Implement the **coordinate algebra** and the **invertible per-line content cipher** as a headless, exhaustively property-tested library behind the frozen `src/domain/index.ts` barrel and the `ContentProvider` port. After this unit: same coordinate → same content forever, for all users; loops close; the inverse round-trips; and a committed golden vector locks the library so the algorithm can never silently drift.

### 1.2 Series context

Content is a pure function of a **ℤ² lattice coordinate** `(n, floor)`. This unit is the keystone: every downstream unit (render, staircase, books, multiplayer, search) imports from here and never reaches inside. The dependency-rule lint from Unit 01 guarantees this file tree imports **no** framework code — verify it stays that way.

### 1.3 Constraints

- **C1 — Purity.** `src/domain/**` imports only standard library + `@noble/hashes` (audited, zero-dep SHA-256/HMAC). No three.js, React, Convex, Node built-ins beyond crypto-free utilities. The Unit 01 boundary lint enforces this.
- **C2 — BigInt, not `number`, for the cipher and coordinates.** The addressable space is ~10¹¹⁷; coordinates range far beyond `Number.MAX_SAFE_INTEGER`. All index math is `bigint`. (Render layers later work in a _local float frame_; that's their problem, not the core's.)
- **C3 — Total determinism, zero I/O.** No `Date`, no `Math.random`, no network, no filesystem. Given the same input the functions are referentially transparent. This is what makes the golden vector meaningful.
- **C4 — Invertibility is preserved even though search ships in Unit 06.** `inverse()` is built and property-tested now.
- **C5 — Swappable implementation.** All content logic sits behind the `ContentProvider` port so a future Rust→WASM adapter is a drop-in. **No WASM in this unit** — the asymptotic analysis proved plain BigInt suffices for MVP demand.
- **C6 — The `BABEL_KEY` is a choose-once-freeze-forever genesis constant.** Changing it re-shuffles the entire library. Once the golden vector is committed, the key is immutable.

### 1.4 Explicitly out of scope

Search UI and result rendering → Unit 06. The v2 "semantic entropy deepens with distance" behavior → forward-declared as a documented seam only. Any 6-way honeycomb moves → v2 (this unit ships the 4-move linear model). Rendering of anything.

### 1.5 Success criteria

`pnpm test:unit:ci tests/unit/domain` green with property tests covering determinism, forward round-trip, path-independence, loop closure, move inverses, injectivity sampling, and alphabet/length integrity; a committed golden-vector test; `pnpm verify:boundaries` still green; domain coverage ≥ 95%.

---

## 2. Architecture / Data Model

### 2.1 Types (frozen in this unit)

```ts
// coordinates
type Coordinate = { n: bigint; floor: bigint }; // ℤ² lattice room address
type Move = 'forward' | 'back' | 'up' | 'down'; // MVP: 4 moves (linear chain + stairs)
const ORIGIN: Coordinate = { n: 0n, floor: 0n };

// content addressing
type LineAddress = {
  // the cipher's input granularity
  n: bigint;
  floor: bigint; // which room
  wall: number; // 0..3   (4 book-walls; the other 2 sides are doors)
  shelf: number; // 0..4
  volume: number; // 0..31
  page: number; // 0..409
  line: number; // 0..39
};
type Glyph = string; // exactly one char from ALPHABET
// a full glyph is LineAddress + col (0..79); col indexes into line()'s output, not a cipher input
```

`LineAddress` is the concrete refinement of Unit 01's loosely-stubbed `Address` on the `ContentProvider` port. Unit 01 declared these shapes "finalized in Unit 02"; recording the refinement in an ADR (§6 Phase 4) satisfies the frozen-contract doctrine.

### 2.2 The Borges constants (checked against the source)

| Quantity             | Value                                   | Source                                                              |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Alphabet             | **29** (`a–z` + space + comma + period) | Basile-style, per your call                                         |
| book-walls / hexagon | 4 (of 6 sides)                          | "twenty bookshelves, five to each side, line four of the six sides" |
| shelves / wall       | 5                                       | ″                                                                   |
| volumes / shelf      | 32                                      | "each bookshelf holds thirty-two books"                             |
| pages / volume       | 410                                     | "each book contains four hundred ten pages"                         |
| lines / page         | 40                                      | "each page, forty lines"                                            |
| chars / line         | 80                                      | "each line, approximately eighty black letters"                     |
| ⇒ books / hexagon    | **640**                                 | 4×5×32                                                              |
| ⇒ lines / hexagon    | **10,496,000**                          | 4×5×32×410×40                                                       |
| ⇒ chars / book       | **1,312,000**                           | 410×40×80                                                           |

### 2.3 The address → content pipeline (the heart of the unit)

Line-content space size `M = 29⁸⁰ ≈ 1.0×10¹¹⁷ ≈ 2³⁸⁹`. Note `M = (29⁴⁰)²` — a perfect square, which lets a **balanced Feistel** be a clean bijection with no cycle-walking. Let `H = 29⁴⁰`.

```
LineAddress
   │  (a) intra-room mixed-radix encode  → intra ∈ [0, 10_496_000)
   │  (b) spiral pairing ℤ²↔ℕ            → room  = pair(n, floor) ∈ ℕ
   ▼
lineIndex = room · 10_496_000 + intra          ∈ [0, ROOM_MAX·10_496_000) ⊂ [0, M)
   │  (c) keyed balanced Feistel P over [0, M)  (bijection)
   ▼
contentInt ∈ [0, M)
   │  (d) base-29 decode, zero-padded to 80 digits
   ▼
Glyph[80]      ← this is line(address)
```

Inverse (search, Unit 06 consumes it; built here):

```
Glyph[80] →(d⁻¹ base29 encode)→ contentInt →(c⁻¹ Feistel)→ lineIndex
         → room = lineIndex div 10_496_000 ,  intra = lineIndex mod 10_496_000
         → if room ≥ ROOM_MAX → return null       (the vanishing unaddressable remainder)
         → else (n,floor) = unpair(room) ,  decode intra → LineAddress
```

**Why a spiral pairing, not a rectangle.** `pair : ℤ² ↔ ℕ` is an **origin-centered Ulam-shell enumeration**: ring 0 = the origin (index 0), ring `k` = the `8k` cells at Chebyshev distance `k`. Cumulative count before ring `k` is `1 + 4k(k−1)`. This makes **small indices = rooms near the origin = where players actually are**, keeps the map bijective and bounded-free, and — critically — lets `ROOM_MAX = M div 10_496_000 ≈ 2³⁶⁵·⁷` cover essentially the entire content space. Consequence: **search resolves to a walkable-in-principle coordinate for ~100% of inputs** (only a sub-room remainder < 10.5M pages out of 10¹¹⁷ returns `null`) — preserving the iconic libraryofbabel behavior where any text you type is _found somewhere_.

**The v2 seam.** Depth-dependent semantic entropy attaches at exactly one place: the Feistel **round-key derivation** may later be made a function of `ring(room)` (Chebyshev distance), so deeper rooms mix differently. This unit derives round keys from `BABEL_KEY` alone and exposes the derivation as a single internal function `roundKey(round)` — the documented extension point. Do not implement the depth behavior; just don't wall it off.

### 2.4 Module layout (all under `src/domain/`)

```
coordinates/
  types.ts        Coordinate, Move, ORIGIN
  moves.ts        moveVector, applyMove, invertMove, reduce
  hash.ts         hash(coord) → hex   (SHA-256, for bookmarks/URLs/multiplayer)
content/
  config.ts       ALPHABET, radices, LINES_PER_ROOM, M, H, ROOM_MAX, N/A bounds, FEISTEL_ROUNDS, BABEL_KEY
  alphabet.ts     glyphToDigit, digitToGlyph, base29Decode, base29Encode
  pairing.ts      pair(n,floor)↔unpair(room)   (Ulam-shell ℤ²↔ℕ, bigint)
  codec.ts        encodeLineIndex(LineAddress)↔decodeLineIndex(bigint) → LineAddress | null
  permutation.ts  feistel(x)↔feistelInverse(x) over [0,M); roundKey(round) seam
  cipher.ts       line(LineAddress)→Glyph[80] ; inverse(Glyph[80])→LineAddress|null
index.ts          FROZEN BARREL — re-exports the public surface below
```

### 2.5 Frozen public surface (`src/domain/index.ts`)

```ts
export type { Coordinate, Move, LineAddress, Glyph };
export { ORIGIN, applyMove, invertMove, reduce } from './coordinates/moves';
export { hash } from './coordinates/hash';
export { line, inverse } from './content/cipher';
```

Anything not in this barrel is private to the domain. Downstream units import **only** from `@/domain`.

---

## 3. Implementation Details

### 3.1 Coordinate algebra (`coordinates/`)

- `moveVector(m)` → `{dn, dfloor}`: forward `{+1,0}`, back `{−1,0}`, up `{0,+1}`, down `{0,−1}`.
- `applyMove(c, m)` → new `Coordinate` (bigint adds).
- `invertMove(m)`: forward↔back, up↔down.
- `reduce(moves, from = ORIGIN)` → sums all move-vectors onto `from`. Path-independent by construction (commutative addition) — this _is_ the ℤ² lattice, and the concrete answer to "up-forward-down-back = origin."
- `hash(c)`: `sha256(utf8(\`${c.n}:${c.floor}\`))` → lowercase hex. Deterministic, stable; used by bookmarks (Unit 06) and presence sync (Unit 07).

### 3.2 Alphabet & base-29 (`content/`)

- `ALPHABET = ' abcdefghijklmnopqrstuvwxyz,.'` — index 0 = space, 1–26 = `a–z`, 27 = comma, 28 = period. Frozen ordering (changing it is a library-drift change, guarded by the golden vector).
- `base29Encode(glyphs: Glyph[80]) → bigint`, `base29Decode(x: bigint) → Glyph[80]` (big-endian, left-zero-padded with the index-0 glyph to exactly 80).

### 3.3 Spiral pairing (`pairing.ts`)

`pair(n, floor) → room: bigint` and `unpair(room) → {n, floor}` implementing the origin-centered Ulam-shell bijection ℤ²↔ℕ over bigint. Correctness is guaranteed not by inspection but by an **exhaustive bijectivity property test over a bounded window** (§5) — `unpair(pair(n,floor)) === (n,floor)` for all `|n|,|floor| ≤ 512`, and `pair(unpair(k)) === k` for all `k < 4·10⁶`.

### 3.4 Codec (`codec.ts`)

- `encodeLineIndex(a)`: `intra = ((((a.wall*5 + a.shelf)*32 + a.volume)*410 + a.page)*40 + a.line)`; `room = pair(a.n, a.floor)`; return `room * LINES_PER_ROOM + intra`.
- `decodeLineIndex(x)`: `room = x / LINES_PER_ROOM`; if `room >= ROOM_MAX` return `null`; `intra = x % LINES_PER_ROOM`; `{n,floor} = unpair(room)`; unpack `intra` back through the mixed radix; return full `LineAddress`.
- All inputs validated: `wall∈0..3`, `shelf∈0..4`, `volume∈0..31`, `page∈0..409`, `line∈0..39` — out-of-range throws (programmer error, not user input).

### 3.5 Permutation (`permutation.ts`)

Balanced Feistel over `[0, M) = [0, H²)`, `FEISTEL_ROUNDS = 8`:

- Split `x → (L, R)`, `L = x / H`, `R = x % H`, both `∈ [0, H)`.
- Round `i`: `(L, R) → (R, (L + F(i, R)) mod H)`.
- `F(i, R) = HMAC_SHA256(roundKey(i), be_bytes(R))` interpreted big-endian as a 256-bit integer, reduced `mod H`. `H ≈ 2¹⁹⁴·⁵`, so modulo bias ≤ 2⁻⁶¹ — negligible for a non-adversarial deterministic art piece.
- `roundKey(i) = HMAC_SHA256(BABEL_KEY, "round" ‖ i)` — **the v2 semantic-entropy seam** (§2.3).
- `feistelInverse` runs the rounds in reverse. Recombine `x = L·H + R`.

### 3.6 Cipher (`cipher.ts`)

- `line(a) = base29Decode( feistel( encodeLineIndex(a) ) )` → `Glyph[80]`.
- `inverse(g) = ` decode path of §2.3; returns `LineAddress | null`.

### 3.7 Port adapter (`src/adapters/content/`)

`LocalContentProvider` implements the Unit 01 `ContentProvider` port by delegating to `@/domain` (`line`/`inverse`). This is the injection seam for a future `WasmContentProvider`. Lives in `adapters/`, imports `domain` — allowed by the boundary rule.

---

## 4. Error Handling & Edge Cases

- **E1 — Out-of-range intra components** throw `RangeError` (programmer bug). User-facing values never reach here in MVP.
- **E2 — `inverse` on unaddressable content** returns `null` (the sub-room remainder). Callers (Unit 06) must handle `null` as "exists in the library, at no coordinate."
- **E3 — BigInt everywhere; no `number` coercion** in the pipeline. A lint rule (`no-loss-of-precision`) plus review; the golden vector catches any accidental `Number()` truncation instantly.
- **E4 — HMAC input width.** `R` is serialized to fixed-width big-endian bytes (ceil(194.5/8)=25 bytes) so the PRF domain is unambiguous and stable forever.
- **E5 — Library drift.** Any change to `ALPHABET` ordering, radices, `BABEL_KEY`, `FEISTEL_ROUNDS`, the pairing, or the round function changes all content. The golden-vector test is the tripwire; such a change requires an ADR and a version bump, never a silent edit.
- **E6 — Endianness / padding of base-29.** Fixed big-endian, left-pad to 80. A round-trip property test locks it.

---

## 5. Testing Strategy

Unit + property tests (`fast-check`) under `tests/unit/domain/`, mirroring the module layout. Node environment (pure). Enumerated properties:

**Algebra**

1. **Loop closure**: `reduce(['forward','back']) === ORIGIN`; `reduce(['up','forward','down','back']) === ORIGIN`. (Your question, as an assertion.)
2. **Path-independence**: for any two move sequences with equal net vector, `reduce(seq₁) === reduce(seq₂)`.
3. **Move inverses**: `applyMove(applyMove(c,m), invertMove(m)) === c`.
4. **Hash**: determinism + no collision across 10⁴ distinct coords (sampled).

**Cipher** 5. **Determinism**: `line(a) === line(a)`. 6. **Forward round-trip**: `inverse(line(a)) === a` for random in-box `a` (n,floor sampled in `±10⁶`, all intra fields in range). 7. **Pairing bijectivity**: `unpair(pair(n,floor)) === {n,floor}` for `|n|,|floor| ≤ 512`; `pair(unpair(k)) === k` for `k < 4·10⁶`. 8. **Alphabet & length integrity**: every `line(a)` has length 80 and every glyph ∈ `ALPHABET`. 9. **Injectivity sampling**: 10⁴ distinct addresses → 10⁴ distinct lines (no collisions observed). 10. **Base-29 round-trip**: `base29Decode(base29Encode(g)) === g`.

**Golden vector** 11. With `BABEL_KEY` fixed, `line({n:0n,floor:0n,wall:0,shelf:0,volume:0,page:0,line:0})` equals a committed 80-char string. This **locks the library forever**; it must be generated once (Phase 4) and never regenerated.

**Gate**: domain coverage ≥ 95% (v8), enforced in `vitest.config.ts` for the domain project.

---

## 6. Prompt Execution Strategy

Executor has no context beyond this spec. All logic is `bigint`. Import hashing from `@noble/hashes/sha256` and `@noble/hashes/hmac` (add the dep in Phase 1). Do not proceed past a red gate.

### Phase 1: Types, config, alphabet

> Gate: `pnpm app:compile && pnpm lint`

#### Step 1.1: Install hashing dep and write config

Add `@noble/hashes` as a dependency. Create `src/domain/content/config.ts` exporting (all `bigint` where numeric-large): `ALPHABET = ' abcdefghijklmnopqrstuvwxyz,.'`; `RADIX = 29n`; `COLS = 80`; per-field radices `WALLS=4, SHELVES=5, VOLUMES=32, PAGES=410, LINES=40`; `LINES_PER_ROOM = 10_496_000n`; `M = RADIX ** 80n`; `H = RADIX ** 40n`; `ROOM_MAX = M / LINES_PER_ROOM`; `FEISTEL_ROUNDS = 8`; and `BABEL_KEY` as a fixed byte string constant `'babel/v1/genesis'` (documented: freeze forever after Phase 4 golden vector). Add a header comment marking `BABEL_KEY` and `ALPHABET` as library-drift-critical.

##### Verify

- `pnpm app:compile`

##### Timeout

90000

#### Step 1.2: Coordinate & content types

Create `src/domain/coordinates/types.ts` with `Coordinate`, `Move`, `ORIGIN` and `src/domain/content/` type exports for `LineAddress`, `Glyph` (place shared types where §2.1 specifies). Ensure `LineAddress.n` and `.floor` are `bigint`.

##### Verify

- `pnpm app:compile`

##### Timeout

90000

#### Step 1.3: Alphabet & base-29

Create `src/domain/content/alphabet.ts`: `glyphToDigit`, `digitToGlyph`, `base29Encode(Glyph[80]) → bigint`, `base29Decode(bigint) → Glyph[80]` (big-endian, left-pad to 80 with index-0 glyph). Create `tests/unit/domain/content/alphabet.spec.ts` asserting property #10 (base-29 round-trip) with `fast-check`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/alphabet.spec.ts`

##### Timeout

90000

### Phase 2: Coordinate algebra

> Gate: `pnpm test:unit:ci tests/unit/domain/coordinates`

#### Step 2.1: Moves & reduce

Create `src/domain/coordinates/moves.ts`: `moveVector`, `applyMove`, `invertMove`, `reduce(moves, from = ORIGIN)` per §3.1 (bigint math).

##### Verify

- `pnpm app:compile`

##### Timeout

90000

#### Step 2.2: Coordinate hash

Create `src/domain/coordinates/hash.ts`: `hash(c)` = lowercase hex SHA-256 of `` `${c.n}:${c.floor}` `` using `@noble/hashes/sha256`.

##### Verify

- `pnpm app:compile`

##### Timeout

90000

#### Step 2.3: Algebra property tests

Create `tests/unit/domain/coordinates/moves.spec.ts` and `hash.spec.ts` asserting properties #1–#4 with `fast-check`, including the explicit loop-closure assertions `reduce(['forward','back']) === ORIGIN` and `reduce(['up','forward','down','back']) === ORIGIN`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/coordinates`

##### Timeout

120000

### Phase 3: Pairing, codec, permutation, cipher

> Gate: `pnpm test:unit:ci tests/unit/domain/content`

#### Step 3.1: Spiral pairing ℤ²↔ℕ

Create `src/domain/content/pairing.ts`: `pair(n: bigint, floor: bigint) → bigint` and `unpair(room: bigint) → {n,floor}` as the origin-centered Ulam-shell bijection (ring 0 = origin; ring k = 8k cells at Chebyshev distance k; cumulative-before-ring-k = `1 + 4k(k−1)`). Create `tests/unit/domain/content/pairing.spec.ts` asserting property #7 (round-trip both directions over the bounded windows). Do not proceed unless bijectivity holds.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/pairing.spec.ts`

##### Timeout

120000

#### Step 3.2: Line-index codec

Create `src/domain/content/codec.ts`: `encodeLineIndex(LineAddress) → bigint` and `decodeLineIndex(bigint) → LineAddress | null` per §3.4, with range validation (§4 E1) and the `room >= ROOM_MAX → null` guard (§4 E2).

##### Verify

- `pnpm app:compile`

##### Timeout

90000

#### Step 3.3: Balanced Feistel permutation

Create `src/domain/content/permutation.ts`: `roundKey(i)` (HMAC-SHA256 of `BABEL_KEY` over `"round"‖i`), round function `F(i,R)` (HMAC → 256-bit big-endian int mod `H`, with `R` serialized to fixed 25-byte big-endian), and `feistel(x)` / `feistelInverse(x)` over `[0, M)` with 8 rounds per §3.5. Create `tests/unit/domain/content/permutation.spec.ts` asserting `feistelInverse(feistel(x)) === x` and `feistel` output stays in `[0, M)` for random `bigint` x in range.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/permutation.spec.ts`

##### Timeout

120000

#### Step 3.4: Cipher (line / inverse)

Create `src/domain/content/cipher.ts`: `line(LineAddress) → Glyph[80]` and `inverse(Glyph[80]) → LineAddress | null` composing alphabet + codec + permutation per §3.6. Create `tests/unit/domain/content/cipher.spec.ts` asserting properties #5, #6, #8, #9 with `fast-check`.

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/cipher.spec.ts`

##### Timeout

120000

### Phase 4: Port adapter, frozen barrel, golden vector, ADR

> Gate: `pnpm ci:local`

#### Step 4.1: Content provider adapter

Create `src/adapters/content/local-content-provider.ts` implementing the Unit 01 `ContentProvider` port by delegating to `@/domain`'s `line`/`inverse`. Ensure `application/ports`' `Address` type is refined to `LineAddress` (update the port type). Add a jsdom-free unit test that the adapter returns an 80-glyph line for the origin address.

##### Verify

- `pnpm app:compile`
- `pnpm lint`

##### Timeout

90000

#### Step 4.2: Freeze the domain barrel

Populate `src/domain/index.ts` with exactly the §2.5 exports — no more. Confirm `pnpm verify:boundaries` still passes (domain imports no framework code) and that a grep shows no `three`, `react`, or `convex` import anywhere under `src/domain/`.

##### Verify

- `pnpm verify:boundaries`
- `! grep -rE \"from '(three|react|convex)\" src/domain`

##### Timeout

90000

#### Step 4.3: Generate and commit the golden vector

Write a one-off script `scripts/print-golden.mjs` that prints `line({n:0n,floor:0n,wall:0,shelf:0,volume:0,page:0,line:0}).join('')`. Run it, capture the exact 80-char string, and hard-code it into `tests/unit/domain/content/golden.spec.ts` as property #11. Commit both. Add a comment: regenerating this string is forbidden — it locks the library. Delete the script after capturing (or keep under `scripts/` clearly marked one-off).

##### Verify

- `pnpm test:unit:ci tests/unit/domain/content/golden.spec.ts`

##### Timeout

90000

#### Step 4.4: Coverage gate + ADR + doctrine update

Set the domain vitest project coverage threshold to ≥ 95%. Write `docs/doctrine/adr/0001-content-core.md` recording: the ℤ² lattice + spiral pairing, the Feistel-over-29⁸⁰ construction, the `BABEL_KEY` freeze, the `LineAddress` refinement of Unit 01's port stub, and the v2 semantic-entropy seam at `roundKey`. Update `docs/doctrine/01-frozen-contracts.md` to mark `src/domain/index.ts` as populated-and-frozen.

##### Verify

- `pnpm ci:local`

##### Timeout

150000

---

### Acceptance (whole unit)

`pnpm ci:local` green with all eleven properties + golden vector; domain coverage ≥ 95%; `verify:boundaries` proves the core is still framework-free; `src/domain/index.ts` frozen; `LocalContentProvider` wired to the port. Units 03 (render) and the Stage-4 pair (staircase / books) can now branch against a stable, deterministic, invertible core.

---

Two things worth your eyes before you run it.

**The fork I resolved mid-spec: `Coordinate` is now `bigint`, not `number`.** Earlier I'd floated `number` for walkable simplicity. Working the search math changed my mind: if you want the _iconic_ "type any text, it's found somewhere" behavior, the addressable box has to fill nearly all of 29⁸⁰, which puts coordinates far past `Number.MAX_SAFE_INTEGER`. Bigint coords cost you almost nothing (the render layer works in a small _local float frame_ around a bigint origin — the floating-origin design we already agreed on for the infinite world), and they keep Unit 06 search from forcing a core rewrite. If you'd rather ship MVP with `number` coords and a deliberately-tiny findable region, that's a legitimate simpler v0 — but it trades away the search magic, so I defaulted to bigint. Flag if you disagree.

**The golden vector (Phase 4.3) is the single most important test in the repo.** It's the infrastructure-enforced guarantee that your deterministic library is _actually_ deterministic across every future refactor, dependency bump, and the eventual WASM swap — the Rust adapter will have to reproduce that exact 80-char string or fail CI. That's the check that makes "same coordinate, same book, forever" a fact rather than an aspiration.
