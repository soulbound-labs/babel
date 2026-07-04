# Unit 05 — Book Reading (Hero Moment #2, the Chills-Gate): Technical Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: Architect (skill-orchestrated: render · traversal · audio · mood-gate · content · tooling)
**Date**: 2026-07-04
**Brief**: `docs/tasks/ongoing/05-book-reading/05-book-reading-brief.md`
**Stage**: 4·B · depends on 01, 02, 03 · **parallel with Unit 04** (shares only the frozen core + Unit 03 room)

---

## 1. Overview

### 1.1 Objective

Deliver the full **book hero moment**: look at a book on the instanced shelf and click → the specific book's `LineAddress` resolves from what you clicked → the book eases to a reading pose in front of the (held) camera → it opens → its pages fill with **real ciphered glyphs streaming in line-by-line** as shaded SDF type on plain vellum → pages **turn in deterministic 3D** → you close it and walk on. Lit only by Unit 03's two dim bulbs plus one warm local "reading glow"; scored by the ambient bed continuing underneath and a page rustle on each turn. Plain vellum, plain glyphs, sourced entirely from Unit 02's frozen `@/domain` core.

This is the **chills-gate** — the go/no-go on whether the piece's central act lands. Judgment is Rei's alone (§4.6).

### 1.2 Constraints (inherited from brief + Q&A)

- **MUST** render content as a pure function of the book's address via the frozen `@/domain` barrel `line(address)`; touch **no** core logic (KDD-6, §4.1).
- **MUST** read the book **in place** through the frozen `LocomotionHandle.suspend()/resume()` seam — one camera, one owner. **No** second camera, **no** scripted camera path outside this seam (KDD-1).
- **MUST** ease only the **book** to the reading pose; the **camera is held still** during reading (position + rotation), so `resume()` reads back an identical pose and no phantom coordinate commit fires (KDD-1, §4.2, INV-B6).
- **MUST** render glyphs as **shaded, lit SDF type** on vellum (via `troika-three-text`/drei `<Text>`), **never** flat ASCII (KDD-3).
- **MUST** stream glyphs **line-by-line** as a render-time reveal over already-computed content; content is generated **once on page-open**, never per-frame, never per-line (KDD-4, §4.1).
- **MUST** animate the page-turn as a deterministic rigged **vertex bend** (spine pivot, `turnProgress` uniform). **No** physics, **no** cloth (KDD-5).
- **MUST** be deterministic: **no `Math.random`** anywhere under `src/presentation/**`; streaming/turn/glow driven by uniforms/phase params, never wall-clock in a way that defeats capture reproducibility (§4.1, §4.6).
- **MUST** obey the render budget: **≤ 30 draw calls total with a book open at an edge room**, DPR ≤ 1.5, no shadow maps, no post-processing (§4.2, INV-B7).
- **MUST** use the Unit 03 `AudioBus` unchanged — page rustle is "just more emitters"; **never** call `bus.dispose()`, **never** construct a new `AudioContext` (§4.5).
- **MUST NOT** edit files Unit 04 owns (`src/presentation/traversal/**`, `src/presentation/render/world/**`, the commit/re-base path in `LocomotionController.tsx`) so this branch rebases cleanly onto Unit 04's `RoomStream` (§4.7).
- **MUST NOT** build ornamented capitals, gold leaf, richer vellum/bindings, volumetric fog, or a real mirror — those are Unit 06.

### 1.3 Success Criteria (binary)

1. Clicking a book you are looking at opens **exactly the book at that `(n, floor, wall, shelf, volume)`** — the rendered page-0/line-0 glyphs equal `line(address)` for that address (node-proved: INV-B1, INV-B9).
2. A page displays **all 3200 glyph slots** (40 lines × 80 cols), laid out once on open; the streamed strings equal `line()` output and never mutate during the reveal (INV-B2, INV-B9).
3. The glyph reveal is **line-by-line, monotonic**, filling a full page in **5.0 s** (locked cadence, §3, INV-B3); nothing appears all-at-once and no loading/spinner artifact is ever in frame.
4. The page-turn is a **continuous spine-pivot bend** over its locked duration; the page silhouette curves (not a flat flip); glyphs **ride the curl** (INV-B4).
5. While a book is open, the **coordinate never changes** and `moveLog` is invariant; on close, walking resumes from the identical pre-read pose (INV-B6).
6. Reading in place keeps the room **visible and fog-dark behind** the book; the reading-glow lifts the open book legibly **without lifting wall/ceiling/fog** in the Unit 03 P1/P4 sightlines (mood floor, §4.6).
7. Budget holds: **60 fps and ≤ 30 draw calls** with a book open at an edge room, on the reference device; DPR ≤ 1.5; no shadow/post (INV-B7).
8. Page rustle fires on each turn over the continuing ambient bed; the emitter is created on open and disposed on close with **no `AudioContext` leak** (INV-B8).
9. **Chills-gate**: Rei, in a live walkthrough, judges that pulling a book and watching glyphs resolve out of the dark raises the hair on the neck. Go/no-go recorded in `docs/mood/unit-05/checklist.md` (§4.6). _This is the human-judged ceiling; criteria 1–8 are the machine-checkable floor._

---

## 2. Scope

| In Scope                                                                                              | Out of Scope                                                                                       |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Click→address resolution from the current room's book mesh (screen-center reticle under pointer-lock) | Inter-room movement, staircase, streaming rooms (Unit 04)                                          |
| Book approach animation (book eases to reading pose; **camera held**)                                 | Physics / cloth / soft-body of any kind                                                            |
| Open + deterministic 3D page-turn (spine-pivot vertex bend)                                           | Reading through a doorway into a neighbor room (books not in the current room are not clickable)   |
| Line-by-line glyph streaming (reveal-front uniform over pre-computed content)                         | Illuminated manuscript styling, ornamented drop caps, gold leaf, high-fi vellum/bindings (Unit 06) |
| SDF glyph atlas as shaded lit type on vellum (`troika`/drei `<Text>`)                                 | Volumetric fog, real mirror render-target (Unit 06)                                                |
| Warm short-range "reading glow" local light (declared mood knob)                                      | Multiplayer / others watching you read (Unit 07)                                                   |
| Page rustle emitter on the Unit 03 audio bus, ambient bed underneath                                  | Search / jump-to-book-by-text (Unit 08)                                                            |
| Chills-gate acceptance ritual (poses P9–P12, captures, checklist)                                     | Any reading affordance — translation, decoding, highlighting (you behold)                          |
| Reading gated to `surface mode === 'floor'` (not mid-stair)                                           | LLM / readable prose / any change to the deterministic core                                        |

---

## 3. Key Design Decisions

### KDD-1: Read in place; one camera; the book moves, the camera is held (USER-DECIDED Q1)

Reading is a **mode, not a second camera**. On open, the reader calls `LocomotionHandle.suspend()`; the **book** eases from its shelf transform to a fixed reading pose in front of the current camera; the **camera is not moved** (position + rotation held). On close, `resume()` reads the identical camera pose back. This composes with Unit 04 (which extends movement _under_ the same controller) with zero camera-ownership conflict, and — because `suspend()` early-returns the locomotion frame loop _before_ commit detection (`LocomotionController.tsx:176`) and the `OriginTracker` ref is untouched by suspend/resume — no phantom commit can fire while a book is open. A dedicated reading-view mode was rejected: it would force an explicit camera-ownership seam into both parallel branches.

### KDD-2: Click resolves to the **current room's** book mesh only (USER-DECIDED Q1 corollary)

`raycast → instanceId → slotToBook(instanceId)` (frozen `instancing.ts`) yields `{wall, shelf, volume}`; combined with the room's `Coordinate {n, floor}` (taken **directly from the live traversal coordinate**, never reconstructed from a mesh's float world-position) it forms a `LineAddress`. Under Unit 04's 11-room streaming there are 11 book meshes; the raycast is **restricted to the mesh whose `userData` room offset is `(0,0)`** — you cannot open a neighbor's book seen through a doorway. Under Unit 03 (single room) this degenerates to the one mesh. Selection is gated to `surface mode === 'floor'` (no book-pulling mid-stair).

### KDD-3: Glyphs = `troika-three-text` via drei `<Text>` — the SDF atlas, inheriting fog + lights (USER-DECIDED library)

drei (`^10.7.7`, already a dependency) re-exports `<Text>`, which wraps `troika-three-text@0.52.4(three@0.185.1)` (already in the lockfile). Troika generates the SDF glyph atlas in a web worker and **patches the Three material so glyphs inherit `FogExp2` + the two bulbs' `PointLight`s for free** — half the reading-moment mood at zero shader cost. The atlas is keyed **by character** (not digit index), covering all **29 alphabet chars including space**. All 29 glyphs are **pre-warmed** at reader mount and `await troika.sync()` is honored before any capture pose. `three-text` (geometry-based) is a documented **break-glass only** — not a dependency to add. See KDD-9 for the transitive-vs-direct dependency rule.

### KDD-4: Content computed once on open; streaming is a render-time reveal-front uniform (USER-DECIDED Q4)

A page = 40 arrays `line({...base, line: 0..39})` (~1 ms worst-case, Unit 02), assembled **once on page-open** into a frozen `Glyph[40][80]` buffer, **memoized** by the 6-tuple `(n, floor, wall, shelf, volume, page)`. Streaming reveals glyphs by **advancing a reveal-front uniform** that clips/fades glyphs past the front — all 3200 glyph quads are laid out once; **no per-frame geometry regen, no per-frame `line()` calls**. Cadence is line-by-line (§3). Turning a page mid-stream **completes the current page instantly**, then turns.

### KDD-5: Page-turn = spine-pivot vertex bend; the same bend rides the glyphs (USER-DECIDED Q3)

The page is a subdivided-plane mesh bent by a **vertex shader driven by one `turnProgress` uniform (0→1)**, pivoting at the spine. The **same bend function** is injected into troika's glyph material (`onBeforeCompile`) so the type curves _with_ the paper. No baked GLTF animation (no asset pipeline; can't carry procedural text), no cloth, no physics — consistent with the analytic/pure ethos of the render doctrine.

### KDD-6: Pure consumer of the frozen core; no barrel widening (USER-DECIDED Q4 corollary)

Unit 05 imports **only** `line`, `type LineAddress`, `type Glyph` from `@/domain/entities`. It does **not** call `inverse` (Unit 08), does **not** import any private `content/**` module in production code (a boundaries violation), and does **not** widen the frozen barrel. The 29-char alphabet set is defined **locally** in render and pinned to the core `ALPHABET` by a **test-only** private import (INV-B10).

### KDD-7: The pulled book is a **separate mesh**, not an animated instance in the pool

Taking a book off the shelf must not disturb the `InstancedMesh` matrices or the draw-call budget of the shelf. The opened book is its own small mesh group (covers + spine + two page faces), created on open and removed on close. The shelf instance it came from may be dimmed/hidden via its own instance matrix without touching neighbors.

### KDD-8: Reading-glow is the one new mood knob; geometry/schedule are frozen seams

The warm short-range local light is the single genuinely new **mood knob**, confined to a declared module `src/presentation/render/reading/reading-light.ts` (analogous to `atmosphere.ts`). Its intensity/range/warmth are live-tuned at the gate and recorded in `checklist.md`. The book mesh, page geometry, spine-pivot rig, streaming schedule, and cadence constant are **seams/geometry, not knobs** — byte-frozen at the gate.

### KDD-9: Consume troika via drei `<Text>` (no new dep); direct dep only if a lower-level API is proven needed

Default: consume through drei's `<Text>` — **no new dependency**. drei surfaces a ref to the underlying troika `Text` object, whose material accepts the bend/reveal injection. **Only if** the bend-injection or reveal-front demonstrably requires a troika API drei does not surface, add `"troika-three-text": "^0.52.4"` to `dependencies` — **version-locked to drei's resolved copy** so pnpm dedupes to the single existing `0.52.4(three@0.185.1)` (a phantom `import 'troika-three-text'` from `src/` will not resolve under pnpm's strict layout otherwise). Either way this is a **deliberate, documented** decision (tooling doctrine), recorded in the Change Log.

---

## 4. Architecture

Layer boundary (lint-enforced): all new code lives under `src/presentation/**` and imports only `domain/entities`, `domain/ports`, third-party, and other presentation modules. New reader modules go in a **new sibling folder `src/presentation/render/reading/`** (one file per feature, per the room-module convention — an _extension_ of the convention, not a change to a frozen seam). No new files under `traversal/` or `render/world/` (Unit 04 territory).

### 4.1 Content consumption (content doctrine — domain, no changes)

- **Entry point (frozen):** `import { line, type LineAddress, type Glyph } from '@/domain/entities'`. `line(a: LineAddress): Glyph[]` returns **80 single-char strings**; `col ∈ 0..79` indexes that array (never a `line()` input).
- **`LineAddress`** = `{ n: bigint; floor: bigint; wall: 0..3; shelf: 0..4; volume: 0..31; page: 0..409; line: 0..39 }`. Keep `n, floor` as **`bigint` end-to-end** — never round-trip through `number`.
- **Page assembly** (`reading/page-content.ts`, pure): `openPage(base: PageAddress): Glyph[][]` returns the 40×80 buffer via 40 `line()` calls; **memoized** by the 6-tuple (determinism makes the cache trivially correct; evict on close / bounded LRU).
- **No core change.** `src/domain/**` is untouched. `inverse` is not called.

### 4.2 Render layer (render doctrine — frontend, the bulk of the unit)

Frozen seams honored (no shape changes): `dimensions.ts` constants; `instancing.ts` (`bookToSlot`/`slotToBook`, `instanceId === slot`); `LocomotionHandle { suspend, resume, state }` (one camera, one owner — this unit _reads in place under_ it); `AtmosphereProfile`/`applyAtmosphere`; `BULB_POSITIONS`. New reading constants (reading-pose offset, glyph cell size, cadence, glow defaults, vellum emissive) are appended to the canonical `render/room/dimensions.ts` so they are frozen and capture-deterministic.

New modules under `src/presentation/render/reading/`:

| File               | Kind | Purpose                                                                                                                                                                                                              |
| ------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `book-address.ts`  | pure | `resolveBookAddress(coordinate, hitOffset, instanceId): LineAddress \| null` — current-room `(0,0)` guard + coordinate pass-through + `slotToBook`; `pageAddresses(base, page): LineAddress[40]`.                    |
| `page-content.ts`  | pure | `openPage(base): Glyph[][]` (40×80), memoized by 6-tuple.                                                                                                                                                            |
| `reveal.ts`        | pure | reveal-front math: `frontAt(phase): number` (monotonic non-decreasing; `0 → none`, `≥ T_full → all 40`); `complete()` jumps front to full (mid-stream turn).                                                         |
| `turn.ts`          | pure | bend-curve scalar params: `turnProgress ∈ [0,1]`, `0 = flat`, `1 = fully turned`, monotonic; exports the GLSL bend chunk as a string (the string is mood-gate-visual, its params are node-tested).                   |
| `page-shader.ts`   | glue | shared vertex-bend + reveal-front GLSL chunks and the troika `onBeforeCompile` patcher so glyphs ride the curl and clip on the front.                                                                                |
| `atlas.ts`         | glue | the local 29-char set, `preloadGlyphs()` (pre-warm + `await sync()`), vellum + glyph material config inheriting fog/lights.                                                                                          |
| `reading-light.ts` | knob | the warm short-range reading-glow `PointLight` (the one declared mood knob).                                                                                                                                         |
| `reader-state.ts`  | pure | open/close/turn/stream state machine (no R3F): `open(address)`, `close()`, `advance()/retreat()`, `tick(phase)`; asserts suspend-on-open / resume-on-close.                                                          |
| `BookReader.tsx`   | R3F  | composes the above: opened-book mesh group (KDD-7), troika `<Text>` per page face, reading-glow, approach lerp, drives `turnProgress`/reveal in `useFrame`; consumes `LocomotionHandle`; fires turn events to audio. |
| `useBookPick.ts`   | R3F  | pointer-lock reticle raycast restricted to the current-room `(0,0)` book mesh → `instanceId` → `book-address.ts`; gated to `surface mode === 'floor'`.                                                               |

**Draw-call accounting (INV-B7).** Reading is in-place, so the full room (≈ 20 interior / 21 edge) renders behind the book. Book additions: covers+spine merged = **1**; two page faces reusing one bent page material = **1–2**; troika `<Text>` batches a page face into **1** draw call each (**1–2**); reading-glow = **1** non-shadow `PointLight` (bulbs 2 → 3 point lights, no shadow maps). Added ≈ **5–7** → ≈ **27 interior / 28 edge**, within ≤ 30 with ~2 spare at an edge. **Safety fallback:** if an edge room breaches 30, collapse both page faces into a single `<Text>` spanning the spread (one troika draw). Asserted on the `?debug` HUD with a book open at an edge room.

**Determinism.** No `Math.random`; `line()` never called in `useFrame`; reveal-front and `turnProgress` are settable to exact values for byte-identical captures (pre-warm 29 glyphs + `await sync()` first). Reading-glow is steady/unceasing (no flicker).

### 4.3 Selection & approach (render + traversal)

- **Reticle raycast** (pointer-lock has no free cursor): on `pointerdown` while locked, cast from screen-center against the current-room `(0,0)` book `InstancedMesh` only. A hit on any neighbor-offset mesh → ignore (KDD-2).
- **Gate:** selection enabled only when `locomotion surface mode === 'floor'`.
- **Approach:** `suspend()`; ease the **book** (a separate mesh, KDD-7) from `slotTransform(slot)` to the fixed reading pose in front of the held camera, on a monotonic eased path (no snap frame). The reading-glow lights up over the ease.
- **Reading camera is presentation-only:** the reader **never writes** `localPosition` or `camera.rotation` in a way that isn't restored; the camera is held. This is the load-bearing correctness constraint for the commit seam (§4.7).
- **Close:** dismiss (same click/key), reverse the ease (or cut), remove the book mesh, `resume()`.

### 4.4 Page-turn & streaming (render)

- **Turn:** `advance()`/`retreat()` drive `turnProgress` 0→1 over the locked turn duration via the spine-pivot vertex bend; the bend is injected into the glyph material so type rides the curl. Deterministic (uniform-driven).
- **Stream:** on page-open, all 40 lines are laid out; a **reveal-front uniform** advances at the locked cadence (§3), fading in glyphs line-by-line top-to-bottom. All 3200 glyphs exist from frame 0; only their reveal state changes.
- **Mid-stream turn:** `advance()` while streaming calls `reveal.complete()` (snap current page to fully revealed), then turns — never a half-written page mid-flight.
- **Turn events → audio:** the turn state machine emits `rustle('lift')` on turn-start and `rustle('settle')` on turn-commit (§4.5). The reader owns the events; audio reacts.

### 4.5 Audio layer (audio doctrine — page rustle on the Unit 03 bus)

- **One positional emitter per reading session** (not per turn): `bus.createEmitter({ kind: 'positional', position })` on open, held for the session, `emitter.dispose()` on close. New file `src/presentation/audio/page-rustle.ts` exporting `startPageRustle(bus, getBookPosition) → { rustle(phase), reposition(pos), dispose() }`, mirroring `room-hums.ts` / `footsteps.ts`.
- **One-shot `BufferSource` per trigger:** `rustle('lift'|'settle')` builds a fresh `BufferSource` from a **precomputed** rustle buffer → `BiquadFilter` (highpass/bandpass ~2–8 kHz) → `emitter.input`, `start()`, self-disconnect in `onended`.
- **Deterministic synthesis:** a rustle is a **filtered seeded-noise burst under an envelope** — `xorshift32` with a `RUSTLE_SEED` (distinct from ambient's `0xbabe1`), reusing the existing PRNG helper; fast attack (~5–10 ms) + exponential decay (~150–300 ms), computed offline into the buffer once at handle creation. Precompute a small fixed bank (3–4 buffers by seed offset); select **by page index** (`buffers[pageIndex % n]`) — variation without `Math.random`.
- **Lifecycle (create-in-body / dispose-in-cleanup):** `startPageRustle` in the reader effect body, `dispose()` in cleanup; `emitter.dispose()` idempotent (StrictMode double-mount safe). **Never** `bus.dispose()`, **never** `new AudioContext()`. The shared bus/context from `App.tsx` is consumed, not recreated. `RUSTLE_GAIN` lives in `page-rustle.ts` (tuned near-threshold at the gate, never at master).
- **Listener pose:** `WorldScene` continues to drive `setListenerPose` from the (held) camera every frame during reading; the ambient bed continues underneath.

### 4.6 Mood-gate (cross-cutting — the chills-gate; woven into Phases 1, 6, 7)

The chills-gate is an **instantiation of the standard mood-gate ritual** (not a bespoke procedure) — the same ritual Unit 03/04 used, differing only in {poses, reference PNGs, floor items}. It shares one ritual with Unit 03's "mood-complete": **Rei is the sole instrument for both.**

- **Ceiling (Rei alone, non-delegable, no waiver):** does pulling the book and watching glyphs resolve out of the dark raise the hair on the neck — the gestalt of _inviting / revelation / paper_.
- **Floor (binary, mood-blind + `?debug` HUD verifiable):**
  - Approach: book travels shelf→reading-rest on a monotonic eased path, arrives centred + upright, no snap/teleport frame.
  - Stream: glyphs resolve line-by-line top-to-bottom at the locked cadence; **no spinner/progress/loading artifact** anywhere in frame; clean resolved/unresolved boundary.
  - Turn: continuous spine-pivot bend over the locked duration; silhouette **curves** (not a flat flip); no z-fighting / backface-black.
  - Legibility: at P-resolved all 40 lines' glyphs are individually distinguishable **and** the room region behind the book stays fog-dark (diff the room area against Unit 03 P1/P4 — the glow falloff must not lift wall/ceiling/fog).
  - Standard floor: 60 fps and ≤ 30 draw calls at every Unit 05 pose on the reference device; no visible horizon/sky; the determinism smoke below.
- **Poses (append after Unit 04's P5–P8; reserve P9–P12; never renumber P1–P8):**
  - **P9 P-approach** — book mid-travel (approach fraction `t = 0.5`), upright.
  - **P10 P-stream** — page open, **20 of 40 lines resolved** (front at the locked cadence's midpoint), 21–40 blank vellum.
  - **P11 P-turn** — spine-pivot bend at **`turnProgress = 0.5`** (half-turn).
  - **P12 P-resolved** — all 40 lines resolved, book at rest, room visible + fog-dark behind.
  - _(Optional P13 establishing — book arrived + closed, glow lit, room dark behind.)_
- **`CameraPose` extension (render-owned):** append optional fields `book?: { address: LineAddress; phase: ReadingPhase }` where `ReadingPhase` carries approach-fraction / resolved-line-count / turn-angle. Optional ⇒ non-breaking against Unit 04's P5–P8.
- **Golden capture address (pinned):** `{ n: 0n, floor: 0n, wall: 0, shelf: 0, volume: 0, page: 0 }` — the origin room's first book, first page. Anchored to the frozen golden vector so P10–P12 render byte-identical glyphs forever.
- **Determinism preconditions (the capture harness MUST satisfy before any pose fires):** pre-warm all 29 glyphs + `await troika.sync()`; drive approach/stream/turn from the pose phase param (or a fixed frame index), never wall-clock; lock DPR + canvas to 1280×720; reuse Unit 03's frozen exposure/fog/ambient knobs unchanged.
- **Mood-touch rule (§2.1):** reading is in-place with the room behind, so the reading-glow may enter Unit 03's P1–P4 frustums. Unit 05 therefore **re-renders P1–P4 and proves zero diff** (or records a Rei waiver) — a checklist line, not an afterthought.
- **Regression baseline:** `docs/mood/unit-05/pose-{9..12}.png` are the **pre-beauty-pass** reference Unit 06 will re-render-and-compare against (Unit 06 _will_ diff them by design — the protocol working).
- **Capture script:** any capture/pose helper is `scripts/<name>.ts` run via `tsx` (no JS, no `node`).

### 4.7 Unit 04 coordination (parallel branch — clean rebase)

- **Merge order:** Unit 04's `RoomStream` restructure lands first; Unit 05 rebases onto it. Unit 05 can be **developed against Unit 03's single book mesh** (the `(0,0)` filter degenerates to the one mesh) and rebased — the current-room filter becomes the `userData` offset check.
- **File disjointness:** Unit 05 touches **none** of `src/presentation/traversal/**`, `src/presentation/render/world/**`, or the commit/re-base path in `LocomotionController.tsx`. Shared surfaces are additive only: `render/room/dimensions.ts` (append constants), `render/debug/poses.ts` (append P9–P12 + optional `book` field — **reserve the P9–P12 index range** before both branches edit it).
- **Seam confirmations (verified against `LocomotionController.tsx`):** `suspend()` early-returns the frame loop before `detectCommit` (line 176) ⇒ no re-base while reading; `resume()` (145–166) reads pose from the held camera and preserves the `OriginTracker` ref ⇒ no phantom commit, no latch clearing. Unit 05 **must not** re-implement or reach into either.

---

## 5. Error Handling

| Error / Edge                                            | Cause                                    | Handling                                                                                                                                                                                                      |
| ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raycast hits a neighbor room's book (through a doorway) | 11-room streaming, ray passes a door gap | `resolveBookAddress` returns `null` for any offset ≠ `(0,0)`; the ray set is restricted to the `(0,0)` mesh. No-op.                                                                                           |
| Click while `surface mode === 'stair'`                  | Player mid-climb                         | Selection gated to `'floor'`; click ignored.                                                                                                                                                                  |
| Book opened while standing on/near a commit plane       | Player idles on a threshold              | Irrelevant while suspended (no commit detection); on `resume()` the held camera yields a ~zero first-frame delta; `OriginTracker` hysteresis/latch preserved ⇒ no spurious commit.                            |
| Address field out of range                              | Bad resolver input                       | Fields are bounded by construction from `slotToBook` (0..639) + live coordinate; `slotToBook` throws on out-of-range slot; `line()` is total within ranges. Validate at the resolver seam, not in `useFrame`. |
| Glyph pops in late / atlas race                         | Troika async worker SDF gen              | Pre-warm all 29 glyphs at mount; `await sync()` before captures; the 29-char alphabet is tiny so the atlas is warm before any book opens.                                                                     |
| Missing glyph box for space                             | Space is both content and left-pad       | Atlas defines an explicit cell for the space glyph (advance/blank), not a missing-glyph box.                                                                                                                  |
| Rustle `BufferSource` reuse after `stop()`              | One-shot node restarted                  | Build a fresh `BufferSource` per trigger; self-disconnect in `onended`.                                                                                                                                       |
| StrictMode double-mount audio                           | React 18 dev double-invoke               | Create-in-body / dispose-in-cleanup; `emitter.dispose()` idempotent.                                                                                                                                          |
| Scene bright/flat in jsdom / CI                         | jsdom has no WebGL (E5)                  | Visual truth is mood-gate-only; node tests cover pure logic; jsdom covers mount/close-overlay DOM only.                                                                                                       |

---

## 6. Testing Strategy

| Layer            | Test Focus                                                                                                            | Command                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Render (pure)    | address round-trip, page assembly/determinism, reveal monotonicity, turn-curve, reader state machine                  | `pnpm test:unit:ci tests/unit/presentation/render/reading`            |
| Content boundary | rendered page == `line()`; atlas char-set == core `ALPHABET` (test-only private import); golden-prefix tripwire       | `pnpm test:unit:ci tests/unit/presentation/render/reading`            |
| Audio (pure)     | seeded-buffer determinism, envelope shape, emitter lifecycle vs. `BusContext` fake, no `AudioContext`/`bus.dispose()` | `pnpm test:unit:ci tests/unit/presentation/audio/page-rustle.spec.ts` |
| Grep gate        | no `Math.random` under new files; no `line()` inside any `useFrame` body; no private `content/**` import in `src/`    | `pnpm lint` + targeted grep (Step 7.x)                                |
| Build            | troika worker bundles cleanly under Vite production build                                                             | `pnpm build` (via `pnpm ci:local`)                                    |
| Visual / mood    | SDF legibility in the dim light, stream-as-revelation, turn-as-paper, glow-without-gloom-break                        | **mood-gate ritual** (§4.6), not automated                            |

Invariants (INV-B namespace, continuing after Unit 03's INV-R10 / Unit 04):

- **INV-B1** `resolveBookAddress((0,0), instanceId)` round-trips against `bookToSlot`/`slotToBook`; `(n,floor)` strictly equals the live coordinate (bigint equality); neighbor offsets → `null`.
- **INV-B2** `openPage` yields exactly 3200 glyph slots (40×80), byte-identical across repeated calls, laid out once (no regen); the reveal never mutates the buffer.
- **INV-B3** reveal front is monotonic non-decreasing in phase; `phase 0 → 0`, `phase ≥ T_full → 40`; `complete()` jumps to 40.
- **INV-B4** turn curve: `0 = flat`, `1 = fully turned`, monotonic; deterministic scalar params.
- **INV-B5** no `Math.random` under `src/presentation/**` new files; `line()` never referenced inside `useFrame`.
- **INV-B6** reading seam integrity: open ⇒ `suspend()`; close ⇒ `resume()`; coordinate + `moveLog` invariant across a read; scripted frames while reading produce **zero** commits; selection refused when `surface mode === 'stair'`.
- **INV-B7** budget: ≤ 30 draw calls with a book open at an **edge** room, DPR ≤ 1.5, no shadow/post, reading-glow = 1 non-shadow `PointLight`.
- **INV-B8** audio: one positional emitter per session; `dispose()` idempotent; `bus.dispose()`/`new AudioContext()` never called; rustle buffers deterministic (seed → byte-identical), envelope bounded (|s| ≤ 1, ≈0 at ends), selection-by-page-index deterministic.
- **INV-B9** rendered page row `L` `.join('')` equals `line({...base, line: L}).join('')` for `L = 0..39`; a page opened twice is identical.
- **INV-B10** the atlas char set equals the core `ALPHABET` set (test-only private import); an explicit space cell exists.
- **INV-B11** mood lock: P9–P12 match committed captures, reproducible via pinned uniforms + pre-warmed troika `sync()`; P1–P4 re-render zero-diff (or recorded waiver).

---

## 7. Failure Modes (FMEA)

| #   | Failure Mode                                                 | Severity | Mitigation                                                                                                                                           |
| --- | ------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Phantom coordinate commit while reading                      | Critical | `suspend()` halts commit detection by construction; camera held; `resume()` re-reads identical pose; INV-B6 scripted-frame test.                     |
| 2   | Glyphs float off the bending page during a turn              | High     | Same bend function injected into troika material (KDD-5); P11 mid-turn capture proves type rides the curl.                                           |
| 3   | Atlas race → glyphs pop in / non-reproducible captures       | High     | Pre-warm 29 glyphs + `await sync()` before captures; determinism smoke (render pose twice, hash-equal).                                              |
| 4   | Reading-glow lifts the room, breaking the gloom              | High     | Short-range warm `PointLight`; P1–P4 mood-touch re-render must be zero-diff; legibility floor item diffs the room area.                              |
| 5   | Edge-room draw calls exceed 30 with a book open              | Medium   | ~2 spare measured; fallback collapses both page faces to one `<Text>`; INV-B7 asserted at an edge room.                                              |
| 6   | Reading a neighbor's book through a doorway                  | Medium   | `(0,0)`-only ray set + `null` guard (KDD-2); INV-B1 neighbor-offset test.                                                                            |
| 7   | `AudioContext` leak / StrictMode double emitter              | Medium   | Create-in-body/dispose-in-cleanup; idempotent `dispose()`; INV-B8.                                                                                   |
| 8   | Merge collision with Unit 04 on `poses.ts` / `dimensions.ts` | Medium   | Additive-only edits; reserve P9–P12; append constants; no edits to traversal/world/commit path (§4.7).                                               |
| 9   | Phantom `troika-three-text` import fails under pnpm          | Low      | Consume via drei `<Text>`; direct dep only if needed, version-locked to drei's resolved `0.52.4` (KDD-9); `pnpm build` catches worker-bundle breaks. |
| 10  | Silent content drift (rendering a stub, not the library)     | Low      | Golden-prefix tripwire (INV-B9) at the origin address; atlas↔`ALPHABET` coverage (INV-B10).                                                          |

---

## 8. Prompt Execution Strategy

<!--
PROTOCOL: docs/protocol/sdd/execution-format.md
COMPLETENESS: docs/protocol/sdd/_SPEC-STANDARD.md §5
Gate commands are this repo's real scripts: `pnpm compile`, `pnpm test:unit:ci [path]`, `pnpm lint`, `pnpm build`/`pnpm ci:local`.
Targeted tests filter vitest by path. Visual truth is mood-gate-only (jsdom has no WebGL).
-->

### Phase 1: Mood baseline + pure foundations

#### Step 1.1: Mood baseline zero (before ANY code change)

On the Unit 05 branch, before touching any file: run `pnpm dev`, open the app, and re-render Unit 03's committed poses P1–P4 via `?pose=1..4` at 1280×720. Compare each against `docs/mood/unit-03/pose-{1..4}.png` — they must be byte-identical (proves the baseline reproduces, so later diffs are attributable to Unit 05, not env/DPR drift). If Unit 04 has merged, also re-render P5–P8 against `docs/mood/unit-04/`. Record (date, device, "P1–P4 byte-identical: yes/no") in a new file `docs/mood/unit-05/baseline.md`. If NOT identical: STOP and find the drift source (mood-gate §5).

Tools to use: Bash (dev server), Write (`baseline.md`)

##### Verify

- `test -f docs/mood/unit-05/baseline.md`

##### Timeout

180000

#### Step 1.2: Address resolver

Create `src/presentation/render/reading/book-address.ts` per §4.2/KDD-2: `resolveBookAddress(coordinate, hitOffset, instanceId): LineAddress | null` (return `null` unless `hitOffset` is `(0,0)`; take `n,floor` from the coordinate — never reconstruct from a position; `{wall,shelf,volume} = slotToBook(instanceId)`); `pageAddresses(base, page): LineAddress[40]`. Import `slotToBook` from `../room/instancing` and `type LineAddress` from `@/domain/entities`. Pure module, no R3F.

Create `tests/unit/presentation/render/reading/book-address.spec.ts` (INV-B1): `(0,0)`+instanceId → `LineAddress` whose `(n,floor)` strictly equals the coordinate (bigint); neighbor offsets `(±1,0)/(0,±1)` → `null`; `bookToSlot(slotToBook(id)) === id` across representative slots; `pageAddresses` yields 40 addresses, `line 0..39`, fixed `page`.

Tools to use: Write
Tools to NOT use: Edit (files don't exist)

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading/book-address.spec.ts`

#### Step 1.3: Page content (assembly + memo)

Create `src/presentation/render/reading/page-content.ts` per §4.1: `openPage(base): Glyph[][]` — 40 `line()` calls, memoized by the 6-tuple, returning a frozen 40×80 buffer. Import `line`, `type LineAddress`, `type Glyph` from `@/domain/entities` **only** (KDD-6).

Create `tests/unit/presentation/render/reading/page-content.spec.ts` (INV-B2, INV-B9): row `L` `.join('')` equals `line({...base, line: L}).join('')` for all `L`; exactly 40×80; opened twice → identical; each `line()` result length 80, each element a single char.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading/page-content.spec.ts`

#### Step 1.4: Reveal-front + turn-curve math

Create `src/presentation/render/reading/reveal.ts` (§4.4: `frontAt(phase)`, `complete()`, monotonic, bounded 0..40) and `src/presentation/render/reading/turn.ts` (§4.4/KDD-5: `turnProgress` params, `0=flat`/`1=turned`, monotonic; export the GLSL bend chunk string). Pure.

Create `tests/unit/presentation/render/reading/reveal.spec.ts` (INV-B3) and `turn.spec.ts` (INV-B4).

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading/reveal.spec.ts tests/unit/presentation/render/reading/turn.spec.ts`

#### Step 1.5: Atlas alphabet coverage

Create `src/presentation/render/reading/atlas.ts` with the **local** 29-char set (space + a–z + `,` + `.`), keyed by character (KDD-6). Create `tests/unit/presentation/render/reading/alphabet-coverage.spec.ts` (INV-B10): `expect(new Set(atlasChars)).toEqual(new Set([...ALPHABET]))` importing `ALPHABET` from the **private** `@/domain/entities/content/config` **in the test only**; assert an explicit space cell exists. (Production code must NOT import the private module.)

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading/alphabet-coverage.spec.ts`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`
- `pnpm lint`

### Phase 2: Glyph atlas & vellum page (static render)

#### Step 2.1: Troika consumption + pre-warm

In `src/presentation/render/reading/atlas.ts`, add `preloadGlyphs()` that pre-warms all 29 glyphs via drei `<Text>`/troika and resolves after `await sync()`; add the vellum + glyph material config inheriting `FogExp2` + the bulbs' lights (§4.2). Consume via drei's `<Text>` — **do NOT add a direct `troika-three-text` dependency** unless Step 2.3 proves a lower-level API is needed (KDD-9). If added, it is `"^0.52.4"` version-locked to drei's resolved copy, recorded in the Change Log.

Tools to use: Edit, Bash (`pnpm why troika-three-text` to confirm resolution)

##### Verify

- `pnpm compile`
- `pnpm build`

#### Step 2.2: Page mesh + vellum + whisper emissive

Create the subdivided-plane page mesh + vellum material (plain, KDD-3) with a whisper of emissive only (anti grazing-black), append reading constants (glyph cell size, reading-pose offset, cadence, glow defaults, vellum emissive) to `src/presentation/render/room/dimensions.ts` (additive — §4.7). Wire a static `BookReader.tsx` skeleton that renders one open page of the golden address as SDF type on vellum (no interaction yet).

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm lint`

#### Step 2.3: Bend + reveal shader injection

Create `src/presentation/render/reading/page-shader.ts`: the vertex-bend + reveal-front GLSL and the troika `onBeforeCompile` patcher so glyphs ride the curl and clip on the front (§4.4/KDD-5). If drei's `<Text>` surface cannot inject this, add the direct `troika-three-text` dep per KDD-9 and document it. Drive `turnProgress`/reveal-front as uniforms.

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm build`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`
- `pnpm lint`
- `pnpm build`

### Phase 3: Selection, approach & the reading seam

#### Step 3.1: Reader state machine

Create `src/presentation/render/reading/reader-state.ts` (§4.3, pure): `open(address)`, `close()`, `advance()/retreat()`, `tick(phase)`; open ⇒ intent-suspend, close ⇒ intent-resume; selection refused unless `surface mode === 'floor'`. Create `tests/unit/presentation/render/reading/reader-state.spec.ts` (INV-B6): open sets suspend intent, close sets resume intent, coordinate unchanged across a read, stair-mode selection refused.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading/reader-state.spec.ts`

#### Step 3.2: Reticle pick + current-room mesh

Create `src/presentation/render/reading/useBookPick.ts` (§4.3): pointer-lock reticle raycast (screen-center) restricted to the current-room `(0,0)` book mesh, gated to floor mode, delegating to `resolveBookAddress`. Under Unit 03 (single mesh) the filter degenerates to the one mesh; note the `userData` `(0,0)` filter for the Unit 04 rebase.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm lint`

#### Step 3.3: Approach animation + suspend/resume wiring

Wire `BookReader.tsx` to the `LocomotionHandle`: on pick → `suspend()` + ease the **separate** book mesh (KDD-7) from `slotTransform(slot)` to the reading pose in front of the **held** camera (never write `localPosition`/rotation un-restored, §4.3); on close → remove mesh + `resume()`. Confirm the composition site holds the single `handleRef` shared with `LocomotionController` (and Unit 04's movement).

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`
- `pnpm lint`

### Phase 4: Page-turn & streaming

#### Step 4.1: Turn animation

Drive `turnProgress` 0→1 over the locked turn duration on `advance()/retreat()` via the spine-pivot bend (§4.4); page silhouette curves, glyphs ride the curl. Deterministic (uniform-driven).

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm lint`

#### Step 4.2: Line-by-line streaming + mid-stream turn

Advance the reveal-front uniform at the locked cadence (§3: 8 lines/s, full page 5.0 s), fading glyphs line-by-line top-to-bottom, all 3200 laid out from frame 0 (no regen, no per-frame `line()`). A turn mid-stream calls `reveal.complete()` then turns (§4.4).

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`
- `pnpm lint`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`
- `pnpm lint`
- `pnpm build`

### Phase 5: Audio — page rustle

#### Step 5.1: Page-rustle module

Create `src/presentation/audio/page-rustle.ts` per §4.5: `startPageRustle(bus, getBookPosition)` → one positional emitter, precomputed seeded-noise rustle buffer bank (`RUSTLE_SEED`, xorshift32 helper reused), envelope, `rustle(phase)` one-shot `BufferSource → BiquadFilter → emitter.input`, `reposition()`, `dispose()`. `audio-bus.ts` is **untouched**.

Create `tests/unit/presentation/audio/page-rustle.spec.ts` against the `BusContext` fake (INV-B8): buffer determinism (seed → byte-identical), envelope bounded + ≈0 at ends, one `createEmitter({kind:'positional'})`, idempotent `dispose()`, `bus.dispose()`/`new AudioContext()` never called, selection-by-page-index deterministic.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/audio/page-rustle.spec.ts`

#### Step 5.2: Wire rustle to turn events

In `BookReader.tsx`: create the rustle handle in the reader effect body, dispose in cleanup (§4.5); fire `rustle('lift')` on turn-start, `rustle('settle')` on turn-commit; `reposition()` once at the settled reading pose. Confirm the ambient bed continues and `setListenerPose` still runs during reading.

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci tests/unit/presentation/audio`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 6: Reading-glow & mood-gate captures

#### Step 6.1: Reading-glow knob module

Create `src/presentation/render/reading/reading-light.ts` (§4.2/KDD-8): the warm short-range reading-glow `PointLight` (the one declared mood knob), bound to the book, steady/unceasing. Wire into `BookReader.tsx`.

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm lint`

#### Step 6.2: Poses P9–P12 + `CameraPose` extension

Extend `CameraPose` in `src/presentation/render/debug/poses.ts` with the optional `book?: { address; phase }` field (additive — §4.7) and append **P9 P-approach (t=0.5)**, **P10 P-stream (20/40)**, **P11 P-turn (turnProgress=0.5)**, **P12 P-resolved** at the golden address `{n:0n,floor:0n,wall:0,shelf:0,volume:0,page:0}`. Do NOT renumber P1–P8. Update `tests/unit/presentation/render/poses.spec.ts` for the new poses.

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/poses.spec.ts`

#### Step 6.3: Deterministic capture harness + determinism smoke

Ensure the pose harness drives approach/stream/turn from the pose phase param (not wall-clock), pre-warms 29 glyphs + `await sync()`, and locks DPR/canvas to 1280×720 before capture. Author any capture helper as `scripts/<name>.ts` (tsx, no JS). Render each of P9–P12 **twice** headless and assert pixel-hash-equal (the §5 "captures differ but scene same" guard).

Tools to use: Write, Edit, Bash

##### Verify

- `pnpm compile`
- `pnpm lint`

#### Step 6.4: Commit reference captures + checklist + P1–P4 mood-touch

Capture `docs/mood/unit-05/pose-{9..12}.png` at 1280×720. Re-render Unit 03 P1–P4 and prove zero diff against `docs/mood/unit-03/pose-{1..4}.png` (or record a Rei waiver). Write `docs/mood/unit-05/checklist.md`: the binary floor results, reference device + fps/draw-calls, the tuned reading-glow knob values, the verbatim mood-gate locked sentence ("These captures are the mood reference. Re-render the poses and compare before changing anything that touches light, fog, or materials."), the P1–P4 re-render result, and any recorded waivers.

Tools to use: Bash (captures), Write (`checklist.md`)

##### Verify

- `test -f docs/mood/unit-05/pose-9.png && test -f docs/mood/unit-05/pose-12.png`
- `test -f docs/mood/unit-05/checklist.md`

##### Timeout

300000

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 7: Integration, perf & the chills-gate

#### Step 7.1: Full-flow integration + grep gates

Wire the complete flow (look → click → approach → open → stream → turn → close → walk on) at the composition site, sharing the one `handleRef`. Run the determinism/boundary grep gates: no `Math.random` under the new files; no `line()` inside any `useFrame`; no private `content/**` import in `src/` production code.

Tools to use: Edit, Bash (grep)

##### Verify

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci`

#### Step 7.2: Perf evidence (edge room, book open)

With a book open at an **edge** room, read the `?debug` HUD: assert ≤ 30 draw calls, DPR ≤ 1.5, 60 fps on the reference device (INV-B7). If the edge count breaches 30, apply the single-`<Text>`-spread fallback (§4.2) and re-measure. Record numbers + device in `docs/mood/unit-05/checklist.md`.

Tools to use: Bash (dev server), Edit

##### Verify

- `pnpm build`

##### Timeout

300000

#### Step 7.3: Chills-gate go/no-go (Rei, live)

Rei runs the full moment live and records the go/no-go (the human-judged ceiling, §4.6/§1.3 criterion 9) in `docs/mood/unit-05/checklist.md` as `Approved by: Rei, live walkthrough, <date>` — or the deviations/waivers in Rei's words. This is the deliverable's acceptance; do not self-certify.

Tools to use: Bash (dev server), Edit

##### Verify

- `grep -q "Approved by: Rei" docs/mood/unit-05/checklist.md`

#### Gate

- `pnpm ci:local`

### Phase 8: Doctrine Review

<!-- MANDATORY per spec-template. -->

#### Step 8.1: Review implementation against doctrines

Review all Unit 05 code against the doctrines loaded for this spec (render, traversal, audio, mood-gate, content, tooling — confirm via `docs/doctrine/doctrine-manifest.yaml` triggers). For each: (1) Compliance — all MUST/MUST NOT honored? (2) New patterns — e.g. the reading-mode-under-`suspend()` pattern, the troika bend/reveal-injection pattern, the current-room `(0,0)` pick, the reveal-front-uniform streaming pattern — worth doctrine? (3) Outdated rules? (4) Missing coverage? If any amendments are needed, create `docs/tasks/ongoing/05-book-reading/doctrine-amendments.md` in the template's format.

Tools to use: Read, Write

##### Verify

- `test -f docs/tasks/ongoing/05-book-reading/doctrine-amendments.md && echo "Amendments documented" || echo "No amendments needed"`

#### Step 8.2: Route amendments for review (if any)

If `doctrine-amendments.md` exists, `mkdir -p docs/tasks/ongoing/doctrine-updates` and copy it to `docs/tasks/ongoing/doctrine-updates/05-book-reading-amendments.md` for human review.

Tools to use: Bash

##### Verify

- `ls docs/tasks/ongoing/doctrine-updates/ 2>/dev/null || echo "No doctrine updates pending"`

#### Gate

- `pnpm ci:local`

---

## 9. Operational Queries

This unit has no database. The equivalent audits are the deterministic invariant checks:

### Determinism audit (expected: pass)

```bash
# No non-determinism under presentation (INV-B5)
grep -rn "Math.random" src/presentation/render/reading src/presentation/audio/page-rustle.ts   # expected: no matches
# No core call in the hot path
grep -n "line(" src/presentation/render/reading/BookReader.tsx | grep -i "useFrame"             # expected: no matches
# No private domain reach past the barrel in production code
grep -rn "entities/content/" src/presentation/render/reading | grep -v ".spec."                 # expected: no matches
```

### Content-fidelity audit (expected: 0 failures)

```bash
# Rendered page equals the library (INV-B9) + atlas covers ALPHABET (INV-B10)
pnpm test:unit:ci tests/unit/presentation/render/reading/page-content.spec.ts tests/unit/presentation/render/reading/alphabet-coverage.spec.ts
```

### Budget audit (expected: ≤ 30)

```bash
# Read the ?debug HUD draw-call count with a book open at an edge room (INV-B7)
pnpm dev   # open ?debug, open a book at an edge room, read draw calls
```

---

## 10. Spec Completeness Checklist

### Semantic Completeness

- [x] All data structures fully defined (`LineAddress`, page buffer 40×80, `ReadingPhase`, reveal-front, `turnProgress`)
- [x] All terms defined or linked (reading-glow, reveal-front, spine-pivot bend, current-room `(0,0)` mesh)
- [x] All state machines exhaustive (reader open/stream/turn/close; mid-stream turn; stair-gate; suspend/resume seam)
- [x] Nullability explicit (`resolveBookAddress → LineAddress | null` on neighbor/out-of-room)

### Verification Completeness

- [x] Each phase has executable verification (real `pnpm` scripts)
- [x] All invariants have checks (INV-B1..B11 mapped to tests / HUD / mood ritual)
- [x] Success criteria are binary (§1.3)

### Recovery Completeness

- [x] FMEA table present (§7)
- [x] Idempotency guaranteed (pure-code steps; `git revert` per commit; captures append-only, recoverable from git)
- [x] Rollback procedures defined (no persistent state, no migrations, no external services)

### Context Completeness

- [x] Brief linked
- [x] Decision rationale captured (KDD-1..9; Change Log records Q&A defaults)
- [x] Change log present (§11)

### Boundary Completeness

- [x] Scope table present (§2)
- [x] Auth requirements explicit (N/A — no backend, no auth; local deterministic render only)
- [x] External dependencies listed (drei `<Text>`/troika `0.52.4`; no new dep unless KDD-9 fork)

---

## 11. Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-04 | Initial specification. **User-decided in Q&A**: (Q1) read **in place** via `suspend()/resume()`, one camera, camera held / book moves; (Q2) chills-gate judgment is **Rei's alone**, capture + checklist are the floor/scaffolding; **library** — lean on the R3F ecosystem (drei `<Text>`/troika) to cut scope. **Architect defaults (reviewable)**: stream cadence = **8 lines/s, 5.0 s/page** (mid-band of 4–6 s); P-stream capture = 20/40 resolved; P-turn capture = `turnProgress 0.5`; golden capture address = `{n:0,floor:0,wall:0,shelf:0,volume:0,page:0}`; selection gated to `surface mode 'floor'` (no mid-stair pulling); pulled book = **separate mesh** (KDD-7); books through a doorway **not clickable** (`(0,0)`-only ray); troika consumed **transitively via drei** — direct `troika-three-text ^0.52.4` dep only if a lower-level API is proven needed (KDD-9); reading-glow = the one declared mood knob (`reading-light.ts`); edge-room draw-call fallback = single-`<Text>` spread. **Seam facts verified against code**: `LocomotionController.suspend()` halts commit detection (`:176`); `resume()` preserves the `OriginTracker` ref. **Merge**: rebases onto Unit 04 `RoomStream`; additive-only edits to `poses.ts`/`dimensions.ts`; reserves poses P9–P12. Real gate commands (`pnpm compile`/`test:unit:ci`/`lint`/`build`/`ci:local`) replace the template's `app:*` placeholders. |

---

### Post-execution notes

Executed 2026-07-04 on `feat/05-book-reading` (`db722a1..d1b2a65`), agent-autonomous per operator direction. Deviations from the prescribed steps:

1. **Browser-verification steps deferred to the gate owner** (operator-directed: no agent browser automation). Steps 1.1 (P1–P4 byte-compare), 6.3 (determinism smoke), 6.4 (`pose-{9..12}.png` captures), 7.2 (HUD numbers), and 7.3 (chills-gate) are recorded as pending-Rei in `docs/mood/unit-05/{baseline,checklist}.md` — the Unit 04 precedent. Step 6.4's `test -f pose-*.png` verify lines are therefore unsatisfied by design; tracked by bead `babel-t2yu`.
2. **Phases 4 and 7 produced no dedicated commits.** Their behaviors (turn/stream driving; composition-site wiring) landed inside the Phase 3/5/6 commits because the state machine + `useFrame` loop are one unit; every phase gate still ran in order and passed. Six phase commits instead of eight.
3. **Vendored asset not in the spec:** `public/fonts/reading-glyphs.woff` (Courier Prime subset, 29 glyphs, OFL, 3.2 KB) — troika otherwise fetches its default font from a CDN, breaking offline determinism. Provenance + regeneration in `public/fonts/README.md`; policy question queued as amendment A4.
4. **KDD-9 outcome:** no direct `troika-three-text` dependency was needed at compile/build time (single `0.52.4` copy via drei confirmed). Live verification of the `onBeforeCompile` injection into the derived glyph material is open — bead `babel-log8` carries the break-glass.
5. **Architect-default choices within spec latitude**, recorded as reviewable in `docs/mood/unit-05/checklist.md` §5: blank-vellum left page (single streamed face), input scheme (click/right-click/E), retreated pages re-open fully revealed, closed→open swap at approach arrival (no cover-board animation).
6. **Archive deferred:** this folder moves to `docs/tasks/completed/` when the chills-gate closes (same convention as Unit 04). Doctrine amendments A1–A6 queued in `docs/tasks/ongoing/doctrine-updates/05-book-reading-amendments.md`.

<!-- Spec authored by /substrate:architect-spec — render · traversal · audio · mood-gate · content · tooling architects, orchestrated at skill level. Execute in a fresh session via /substrate:execute. -->
