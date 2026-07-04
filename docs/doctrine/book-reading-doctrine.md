# Book Reading Doctrine — glyphs on vellum, the spread stream & the reading-mode seam (DOCTRINE)

> **Preload when** you touch `src/presentation/render/reading/**` — the book reader, glyph
> pipeline, page turn, reveal stream, folios, hover/pick — or the reading-glow knob, the
> vendored reading font, or any input that fires while a book is open. Siblings: the world
> the book sits in is [`render-doctrine.md`](./render-doctrine.md); the rustle emitter is
> [`audio-doctrine.md`](./audio-doctrine.md) §4.1; the chills-gate ritual is
> [`mood-gate-doctrine.md`](./mood-gate-doctrine.md); the glyphs' _content_ is
> [`content-doctrine.md`](./content-doctrine.md) (frozen core — never touched from here).

## 1. High-level summary

Unit 05's hero moment: look at a book, click, and the book — not the camera — eases to a
reading rest where **real ciphered glyphs resolve out of the dark, line by line, as lit SDF
type on plain vellum**. Reading is a **MODE under the locomotion seam, not a second camera**:
`suspend()` → the book moves in front of the HELD camera → `resume()` reads back the identical
pose, so no phantom coordinate commit can ever fire (INV-B6). The open book is a **spread**:
the leaf pair `(page, page+1)` — left leaf flat, right leaf the turning one — and both leaves
stream **in parallel** under one shared reveal front.

Everything here is a pure consumer of the frozen `@/domain` barrel (`line`, types only — KDD-6):
content is computed **once per spread** via the memoized `openPage`, never in `useFrame`, never
per reveal step. No `Math.random`, no wall-clock-coupled visuals — every phase (approach
fraction, revealed lines, turn progress) is settable to an exact value, which is what makes the
P9–P12 reference captures references instead of screenshots.

## 2. The frozen surfaces (consumed and owned)

**Consumed (owned elsewhere — never reshape from here):**

| Surface                                                               | Where                                    | Rule                                                                                               |
| --------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `instanceId === slot`, `slotToBook`/`slotTransform`                   | `render/room/instancing.ts`              | the click pipeline is `raycast → instanceId → slotToBook`                                          |
| Room identity = which mesh the ray hit (`userData.dn/dfloor/roomKey`) | `world/RoomStream.tsx`                   | pick is restricted to the `(0,0)` mesh — a neighbor's book through a doorway is not in the ray set |
| `LocomotionHandle { suspend, resume, state }`                         | `render/player/LocomotionController.tsx` | one camera, one owner; the reader never writes the camera                                          |
| The live traversal coordinate                                         | `handleRef.current.state.coordinate`     | bigint pass-through; NEVER reconstructed from a float position                                     |
| `READ_*` / `PAGE_*` constants                                         | `render/room/dimensions.ts`              | appended additively by Unit 05; seams/geometry, not knobs                                          |

**Owned here (frozen at the chills-gate):**

- **The spread model**: an open spread is `(page, page+1)`; `advance`/`retreat` move **±2**;
  flips are **refused mid-stream** (the spread must finish resolving — never a half-written
  page in flight) and at the volume bounds; a retreated spread re-opens fully revealed (only
  unread spreads stream). Pure machine: `reading/reader-state.ts`.
- **The locked cadence**: `READ_LINES_PER_SECOND = 16`, both leaves in parallel over a shared
  0..40 front ⇒ a full spread resolves in **2.5 s** (`reveal.ts` `SPREAD_REVEAL_SECONDS`).
  Line _k_ resolves on the left and the right leaf **together**.
- **The uniforms contract** (`page-shader.ts`): `uTurnProgress`, `uPageWidth`, `uXOffset`,
  `uRevealFront`, `uLineTop`, `uLinePitch`, `uLineStart`. Shared **by reference** across
  patched programs — one `uniforms.page.uRevealFront.value` write per frame reaches every
  glyph block.
- **The golden capture address** `{n:0, floor:0, wall:0, shelf:0, volume:0, page:0}`
  (`debug/poses.ts` `GOLDEN_BOOK`) and poses **P9–P12**, pinned by `CameraPose.book`
  phase params (approach fraction / revealed lines / turn progress) — never wall-clock.
- **The reading glow** (`reading/reading-light.ts`) — the ONE declared mood knob; defaults in
  `dimensions.ts` (`READ_GLOW_*`), tuned only at the gate.

## 3. The reading mode — one camera, held

- Open: `useBookPick` (screen-centre reticle, pointer-locked, on-slab) → `open()` sets the
  suspend **intent**; the composition layer calls `handleRef.suspend()` and acknowledges. The
  shelf instance is hidden via its own instance matrix and restored on close from the pure
  `slotTransform` (KDD-7 — the pool's neighbors are never touched).
- The shelf→rest endpoints are computed **once at open**. The rest orientation is
  `camera.quaternion.clone()` — the camera looks down its local −z, so its +z already points
  back at the eye and the spread's front (+z: FrontSide glyphs, vellum face) faces the reader.
  **Do not "face the camera" with a yaw-π flip** — that shows the culled back (see §7).
- **Floor gate without widening the frozen handle**: the handle exposes no surface mode, so
  the gate reads the held camera — on the slab the eye is exactly `EYE_HEIGHT` in the local
  frame (`|camera.y − EYE_HEIGHT| ≤ 0.02`); on the helix it is off by ≥ a tread rise. If a
  THIRD consumer ever needs surface mode, widen the seam deliberately (bead `babel-su0p`)
  instead of copying this heuristic again.
- Close: restore the instance, `resume()` — the camera was never moved, so resume reads an
  identical pose: zero first-frame delta, no commit, latch preserved.

**The input contract (pointer-lock reality — hard-won, don't relitigate):**

- Left-click = next spread · right-click = previous spread · **Q = close** (a plain keydown:
  the lock never drops, walking resumes instantly). All reading input is gated on
  `document.pointerLockElement !== null` (E1).
- **Esc is NOT and CANNOT be a close key.** Esc is the browser's own pointer-lock exit —
  unpreventable, no reliable keydown, and the lock cannot be programmatically re-acquired
  afterwards (Chrome enforces a ~1.3 s post-Esc cooldown). Esc therefore pauses to the entry
  overlay's "Click to Continue" splash like anywhere else; the book stays open and reading
  continues on re-lock. The overlay's Continue is **lock-confirmed with retry** through the
  cooldown (`src/app/EntryOverlay.tsx`).

## 4. The glyph pipeline — troika via drei, one vendored font

- Glyphs are troika SDF text consumed **through drei `<Text>`** — no direct `troika-three-text`
  dependency (single `0.52.4` copy via drei, confirmed with `pnpm why`). **Break-glass (KDD-9)**:
  a direct dep is added ONLY if drei's surface provably cannot express something, version-locked
  to drei's resolved copy so pnpm dedupes. The glyph base material is a lit
  `MeshStandardMaterial` (`atlas.ts` `createGlyphMaterial`) so type inherits `FogExp2` + the
  bulbs + the glow for free — shaded ink, never flat ASCII.
- **The vendored font**: `public/fonts/reading-glyphs.woff` — Courier Prime subset to exactly
  the 29-glyph alphabet (3.2 KB, OFL; provenance + regeneration command in
  `public/fonts/README.md`). Vendored because troika otherwise fetches its default font from a
  CDN — a runtime network dependency that breaks offline use and capture determinism. Monospace
  is load-bearing: `GLYPH_FONT_SIZE = READ_CELL_WIDTH / 0.6` (Courier's 0.6 em advance) is what
  makes the 80-column grid exact.
- The local `ATLAS_CHARS` is pinned to the core `ALPHABET` by a **TEST-ONLY** private import
  (`alphabet-coverage.spec.ts`, INV-B10) — production code never reaches past the barrel.
  All 29 glyphs pre-warm at mount via the hidden `GlyphPrewarm` text (invisible ⇒ no draw
  call); captures wait for troika `sync()` (FMEA #3 — no atlas race).
- **Folios** (`folio.ts`): page numbers as **lowercase roman numerals** — deliberate, because
  roman uses only `i v x l c d m`, all inside the 29-glyph subset, so folios need **no new
  font asset**. Max is `cdxi` (410). Folios sit in the bottom vellum margin, never reveal
  (always visible), and the right folio rides the turning leaf's bend.

## 5. The bend + reveal injection (`page-shader.ts`)

The page turn is a deterministic **spine-pivot vertex bend** (`turn.ts`: base angle π·progress
plus a curl peaking mid-turn — the silhouette CURVES, never a flat flip), and the SAME
`babelBendPage` is injected into the glyph material so **type rides the curl** (KDD-5). The
reveal clips glyph alpha by line index (`vBabelLine = uLineStart + (uLineTop − y)/uLinePitch`
against `uRevealFront`, with a one-line fade and a `discard` below zero).

Mechanics that must not regress:

- Injection is string surgery in `onBeforeCompile`, chained over any existing hook, with
  `customProgramCacheKey` keyed by the injection shape so variants never share a program.
  Anchors: `#include <begin_vertex>` first, `#include <project_vertex>` fallback; a miss logs
  `babel: page shader anchors not found` — **loud, never a silent visual no-op**.
- `uXOffset` is each mesh's distance from its spine at local x = 0: page mesh `0`, glyph
  blocks `PAGE_TEXT_MARGIN`, and the right folio `PAGE_FACE_WIDTH − PAGE_TEXT_MARGIN`
  (it's `anchorX="right"` at the outer edge). Getting this wrong bends about the wrong axis.
- Materials by role: left vellum flat (no injection) · right vellum `DoubleSide` + bend (the
  turned leaf's back reads as blank paper) · left glyphs reveal-only · right glyphs
  bend+reveal, FrontSide so type vanishes past 90° · folios bend-only (right) / plain (left).
- Distinct uniforms objects per mesh where values differ; **share only the driven uniform
  objects** (`uRevealFront`, `uTurnProgress`) by reference. Never share a whole uniforms bag
  between meshes that need different `uXOffset` — the last writer wins for both.

## 6. Budget & determinism

- With a spread open the reader adds ~8 draws: covers+spine merged (1), two page meshes (2),
  two glyph blocks (2), two folios (2), the closed travel book (1, hidden once open). The
  reading glow adds **zero** — it is a permanently-mounted `PointLight` at intensity 0 while
  closed (constant light count ⇒ no shader relink hitch at open), lit over the approach ease,
  steady at rest. Ledger + measured numbers: `docs/mood/unit-05/checklist.md` §1; ≤ 30 total
  holds at an edge room (render-doctrine §4).
- The **hover highlight** (`useBookHover.ts`) rewrites ONE instance colour (~12 Hz raycast),
  restores on move-off, and is input-driven only — it never animates on its own, and the
  mood-gate captures are shot without hover. Its gates mirror the pick exactly.
- Determinism invariants INV-B1..B11 live in `tests/unit/presentation/render/reading/` (+
  `page-rustle.spec.ts`); the grep gates (no `Math.random`, no `line()` in `useFrame`, no
  private `content/**` import in `src/`) are in the Unit 05 spec §9 (mechanization tracked by
  bead `babel-84wy`).

## 7. Gotchas (symptom → cause → fix)

- **The open spread renders dark/empty though the glow is lit** → the rest quaternion was
  composed with a yaw-π "face the camera" flip, so the spread faces AWAY and the FrontSide
  glyphs cull → copy `camera.quaternion` unmodified (the camera's +z already points at the
  eye). Shipped fix: `00e70e8`.
- **Glyphs don't curl with the page / don't clip on the front** → a derived material consumed
  the injection anchors; check the console for `babel: page shader anchors not found` → apply
  the KDD-9 break-glass (direct `troika-three-text@^0.52.4` + `createDerivedMaterial`), never
  a silent workaround. Tracked: bead `babel-log8`.
- **"Esc should close the book" / stuck unlocked after Esc** → Esc is the browser's lock exit;
  it can't be intercepted and re-lock is cooldown-gated → Q closes; Esc pauses to the splash;
  Continue retries the lock until confirmed (`98c7616`, `3b42b87`, `5419371`).
- **Glyphs pop in late on the first open / captures differ** → SDF atlas raced the first
  render → `GlyphPrewarm` mounts all 29 glyphs at app start; wait for `sync()` before any
  capture pose.
- **Half the spread bends, or the bend axis is off the spine** → a uniforms bag was shared
  between meshes with different `uXOffset`, or `uXOffset` doesn't match the mesh's anchor →
  one bag per mesh, share only `uRevealFront`/`uTurnProgress` by reference (§5).
- **Turn feels dead / no sound** → the rustle is ONE positional emitter per reading session
  firing on `turn-lift`/`turn-settle` machine events, buffers selected by page index — see
  [`audio-doctrine.md`](./audio-doctrine.md) §4.1; never `bus.dispose()`, never a new
  `AudioContext`.
- **A book across a doorway opens / opens the wrong book** → the ray set widened past the
  `(0,0)` mesh, or slot↔book renumbered → the pick must intersect ONLY the current-room mesh
  and resolve through the frozen `slotToBook` (INV-B1).

## 8. Pointers

- `docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md` — the originating spec
  (KDD-1..9, INV-B1..B11) + its post-execution notes.
- `docs/mood/unit-05/checklist.md` — the chills-gate instrument sheet: poses P9–P12, the
  objective floor, the glow knob values, perf ledger.
- [`render-doctrine.md`](./render-doctrine.md) — the one-camera rule, budget, deterministic
  presentation this layer instantiates.
- [`mood-gate-doctrine.md`](./mood-gate-doctrine.md) — phase-param-pinned poses; re-render
  P1–P4 before touching anything that lights the room.
- [`content-doctrine.md`](./content-doctrine.md) — what the glyphs ARE; the barrel is the
  only door.
