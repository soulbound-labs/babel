# Coordinate Doctrine — the ℤ² lattice, moves, identity & pairing (DOCTRINE)

> **Preload when** you touch `src/domain/coordinates/**` or `src/domain/content/pairing.ts`,
> or anything that walks the world, sums moves, hashes a room, or converts a room
> coordinate to/from the ℕ index the cipher consumes. Sibling: the cipher itself is
> [`content-doctrine.md`](./content-doctrine.md). This is the depth tier; the trigger
> tier is the `src/domain` context.

## 1. High-level summary

The Library is an **infinite ℤ² lattice of rooms**. A room address is
`Coordinate = { n: bigint; floor: bigint }` — `n` is the horizontal chain (the
corridor), `floor` is the vertical axis (the staircase). Everything spatial is one
of three pure, framework-free operations:

- **Move algebra** (`coordinates/moves.ts`) — 4 moves, vector adds, path-independent.
- **Identity** (`coordinates/hash.ts`) — a stable SHA-256 fingerprint per room.
- **Pairing** (`content/pairing.ts`) — the bijection `ℤ² ↔ ℕ` that turns a room
  into the `room` index the cipher multiplies into a `lineIndex`. It physically
  lives under `content/` because it is a **cipher input transform and is frozen
  with the library** (§6), but its subject matter is coordinate geometry, so it is
  documented here.

Why `bigint` and not `number`: the addressable room space is ~2³⁶⁵, astronomically
past `Number.MAX_SAFE_INTEGER`. Coordinates are exact `bigint`. The render layer
never does global float math — it works in a **local float frame around a bigint
origin** (the floating-origin design). Do not "simplify" coordinates to `number`;
it silently corrupts everything past ~9×10¹⁵.

## 2. The move model

```
        up  {0,+1}          floor axis = staircase (vertical)
          │
 back ────┼──── forward     n axis = corridor / linear chain (horizontal)
{-1,0}    │      {+1,0}
        down {0,-1}
```

| Function                       | Contract                                                              |
| ------------------------------ | --------------------------------------------------------------------- |
| `moveVector(m)`                | `forward→{dn:+1,dfloor:0}`, `back→{-1,0}`, `up→{0,+1}`, `down→{0,-1}` |
| `applyMove(c, m)`              | `{ n: c.n + dn, floor: c.floor + dfloor }` (bigint adds)              |
| `invertMove(m)`                | `forward↔back`, `up↔down`                                             |
| `reduce(moves, from = ORIGIN)` | folds `applyMove` over the sequence                                   |

MVP ships **exactly 4 moves** (the linear model). 6-way honeycomb is a v2 idea —
do not add moves to `Move` without a spec; downstream `switch`es are exhaustive on
the union and will break loudly (that is intended).

## 3. Core invariants

1. **Coordinates are `bigint`.** Never `number`. (`n`, `floor` both.)
2. **`reduce` is path-independent** — it is commutative `bigint` addition, so any
   two move sequences with the same net vector land on the same room. This _is_ the
   ℤ² lattice; it is a property of the math, not something to special-case.
3. **Loops close.** `reduce(['forward','back']) === ORIGIN`;
   `reduce(['up','forward','down','back']) === ORIGIN`. (INV-1.)
4. **Move inverses undo.** `applyMove(applyMove(c,m), invertMove(m)) === c`. (INV-3.)
5. **`hash(c)` is a stable identity** = lowercase hex `sha256(utf8(\`${n}:${floor}\`))`.
Deterministic, collision-free in practice; it is the key for bookmarks/URLs
(Unit 06) and presence sync (Unit 07). **The `\`${n}:${floor}\`` string format is
   frozen** — changing it invalidates every saved bookmark and every presence key.
6. **Pairing is a total bijection `ℤ² ↔ ℕ`** with **origin-centred locality**:
   small indices are rooms near the origin, where players actually are. (INV-5/6.)

## 4. The pairing — origin-centred Ulam shell

`pair(n, floor) → room` / `unpair(room) → {n, floor}`. Ring
`k = max(|n|, |floor|)` (Chebyshev distance) holds `8k` cells for `k ≥ 1`; ring 0
is the origin. The count of all cells **before** ring `k` is
`start(k) = 1 + 4k(k-1) = (2k-1)²`.

```
ring 2: 16 cells (indices 9..24)     k=2 ─┌───────────┐
ring 1:  8 cells (indices 1..8)      k=1  │ ┌───────┐ │
ring 0:  1 cell  (index  0 = origin)      │ │   O   │ │   O = (0,0) = index 0
                                          │ └───────┘ │
                                          └───────────┘
   start(1)=1  start(2)=9  start(3)=25 …  = (2k-1)²
```

Within ring `k` the `8k` cells are walked counter-clockwise over four edges of
length `2k`; **each corner belongs to exactly one edge** (the four bound-checks in
`pair()` are disjoint and exhaustive; the `else` branch is the bottom edge,
`floor === -k`). See `src/domain/content/pairing.ts` for the exact edge table.

## 5. Gotchas (symptom → cause → fix)

- **Search resolves to a wrong/garbled room, only for "far" queries** → `unpair`
  ran on a ~366-bit `room` and the integer sqrt was off by one. **Cause:** any
  `Math.sqrt`-based or non-exact `isqrt`. **Fix:** use the frozen bigint Newton
  `isqrt` (the `while (y < x)` loop is _exact_ — returns the unique `r` with
  `r² ≤ v < (r+1)²`). Real search inputs land `unpair` near `ROOM_MAX ≈ 2³⁶⁵`, an
  regime **no small-window test reaches** — this is why INV-6 probes ring
  boundaries at large `k` and INV-11 round-trips random lines. Do not weaken those.
- **A refactor "tidied" the ring walk and now old coordinates map to new rooms** →
  **the pairing is FROZEN like the cipher.** `room` feeds `lineIndex`, so
  re-numbering rooms re-shuffles the whole library and breaks the golden vector
  (INV-14). Treat `pair`/`unpair`/`isqrt`/`start(k)` as immutable; changing them is
  a library-drift change requiring a version bump, never a cleanup.
- **`floor` confused with a render/array axis** → `floor` is the _vertical world
  axis_ (stairs), an unbounded signed `bigint`. It is not a Y pixel, not a screen
  row, not non-negative.
- **A 5th move was added and a `switch` "looked exhaustive"** → the `Move` union is
  the contract; extend it only via spec. TS exhaustiveness on the union is the guard.
- **`pair` beyond `ROOM_MAX` looks broken** → it isn't. `pair`/`unpair` are total on
  all of ℕ; `ROOM_MAX` is a _cipher addressability_ ceiling (a room `≥ ROOM_MAX`
  throws on `line()` (E7) / returns `null` on `inverse()` (E2)) — that boundary lives
  in `content/codec.ts`, not in the pairing. Don't add a `ROOM_MAX` clamp to pairing.

## 6. Where this lives / boundaries

- `src/domain/coordinates/types.ts` — `Coordinate`, `Move`, `ORIGIN`.
- `src/domain/coordinates/moves.ts` — `moveVector`, `applyMove`, `invertMove`, `reduce`.
- `src/domain/coordinates/hash.ts` — `hash` (imports `@noble/hashes` — the _only_
  external `domain` may touch; see [`content-doctrine.md`](./content-doctrine.md) §5
  and the boundary carve-out).
- `src/domain/content/pairing.ts` — `pair`, `unpair`, `isqrt` (lives here because it
  feeds the cipher and freezes with it).
- **Public surface** (frozen barrel `src/domain/index.ts`): `ORIGIN`, `applyMove`,
  `invertMove`, `reduce`, `hash` + types `Coordinate`, `Move`. `moveVector` and the
  pairing are **private** to the domain — downstream units never import them.

## 7. Pointers

- [`content-doctrine.md`](./content-doctrine.md) — the cipher that consumes `room`; the
  boundary carve-out for `@noble/hashes`; the golden-vector library lock.
- `docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md` — the spec this
  was built from (property list INV-1…INV-14, §4.5 pairing algorithm).
