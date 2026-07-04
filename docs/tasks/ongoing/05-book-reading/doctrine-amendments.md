# Unit 05 — doctrine amendments (Phase 8 review)

**Reviewed against:** render, traversal, audio, mood-gate, content, tooling
(triggers confirmed via `docs/doctrine/doctrine-manifest.yaml`).
**Compliance verdict:** all MUST / MUST NOT honored — no violations found.
The items below are additive: new proven patterns worth doctrine, plus one
policy decision to record. Human review routes via
`docs/tasks/ongoing/doctrine-updates/`.

---

## Compliance summary (per doctrine)

- **render** — Lane A only (drei `<Text>`/troika, no new engine); frozen seams
  consumed, not reshaped (`dimensions.ts` appended additively; `instancing.ts`,
  `LocomotionHandle`, `BULB_POSITIONS` untouched); one camera, one owner (the
  reader never writes the camera); no `Math.random`; no shadow/post; DPR
  unchanged; analytic draw-call ledger 24 interior / 25 edge ≤ 30
  (`docs/mood/unit-05/checklist.md` §1). Cross-layer imports relative in `src/`.
- **traversal** — zero edits under `traversal/**`, `render/world/**`, or the
  commit/re-base path; `suspend()` halts commit detection by construction;
  coordinate consumed live from the handle as bigint, never reconstructed from
  float positions (T-1/T-6 respected).
- **audio** — `audio-bus.ts` byte-untouched; page rustle is emitters-only, one
  positional emitter per session, create-in-body/dispose-in-cleanup, idempotent
  `dispose()`, fresh one-shot sources per trigger, gain tuned in-module (never
  at master), no `AudioContext` construction, no `bus.dispose()` (INV-B8 suite).
- **mood-gate** — ritual instantiated, not bespoke: P9–P12 appended (P1–P8
  never renumbered), one declared knob module, checklist + objective floor
  authored, mood-touch P1–P4 re-render obligation recorded. Reference captures
  are pending the gate owner's live pass (operator-directed: no agent browser
  automation) — captures lock at approval per doctrine §2.4, so this is
  sequencing, not deviation.
- **content** — pure consumer of the frozen barrel (`line`, types only); no
  `inverse`; no core edits; the 29-char set defined locally and pinned by a
  TEST-ONLY private import (INV-B10); bigint end-to-end; golden address
  anchored to the frozen golden vector (INV-B9).
- **tooling** — no JS introduced; no new dependency (troika consumed
  transitively via drei, single resolved copy confirmed via `pnpm why`); no
  script changes. One vendored binary asset (see A4).

---

## A1 — render-doctrine: the reading-mode-under-`suspend()` pattern + the `reading/` module folder

**What changed:** Unit 05 shipped `src/presentation/render/reading/` (one file
per reading feature — a sibling of the `room/` convention) and proved the
"mode, not a second camera" pattern: `suspend()` → the OBJECT eases to a pose
in front of the held camera → `resume()` reads back the identical pose ⇒ zero
first-frame delta, no phantom commit.

**Proposed amendment (render §2 table + §2 "one camera" paragraph):**

- Add `src/presentation/render/reading/` to the module-layout convention row
  (room modules in `room/`, world streaming in `world/`, reading in
  `reading/`).
- Append to the one-camera paragraph: _"Unit 05's reader is the reference
  implementation: reading is a MODE under `suspend()` — the book moves, the
  camera is held; any future in-place interaction (inspecting, Unit 06 mirror
  gazing) should copy this shape rather than negotiate camera ownership."_

## A2 — render-doctrine: SDF type via drei `<Text>` + `onBeforeCompile` injection (and the break-glass rule)

**What changed:** glyphs render as troika SDF text consumed through drei (no
direct dep), lit + fogged for free; a shared GLSL bend/reveal is injected into
BOTH the vellum material and troika's derived glyph material via chained
`onBeforeCompile` + `customProgramCacheKey`, with anchor fallbacks and a loud
console warning if anchors vanish (never a silent visual no-op).

**Proposed amendment (render, new subsection under §3 or §6):** record the
pattern (shared uniform objects by reference; distinct `uXOffset` per mesh;
prewarm all 29 glyphs + `sync()` before captures) and the KDD-9 break-glass:
_"a direct `troika-three-text` dep is added ONLY if drei's surface provably
cannot inject — version-locked to drei's resolved copy so pnpm dedupes."_

## A3 — audio-doctrine: add page rustle to the §4.1 emitters list

**Proposed amendment (audio §4.1):** add a bullet: _"**Page rustle**
(`page-rustle.ts`, `startPageRustle`) — ONE positional emitter per reading
session (not per turn); a precomputed seeded 4-buffer bank (RUSTLE_SEED,
shared `xorshift32` exported from `footsteps.ts`); a fresh one-shot
`BufferSource → bandpass` per trigger, selected BY PAGE INDEX — variation
without `Math.random`."_ Also note `xorshift32` is now the exported shared PRNG
helper.

## A4 — tooling-doctrine: the vendored-asset policy (first committed asset file)

**What changed:** `public/fonts/reading-glyphs.woff` (3.2 KB, Courier Prime
subset to the 29-glyph alphabet, OFL, provenance + regeneration command in
`public/fonts/README.md`). Rationale: troika falls back to a CDN-fetched font —
a network dependency that breaks offline use and capture determinism. The
repo's "zero asset files" ethos was audio-scoped; this is the first render
asset.

**Proposed amendment (tooling, new short section):** _"Vendored binary assets
are permitted only when a dependency would otherwise reach the network at
runtime; each must carry a README with source, license, and an exact
regeneration command, and be minimized (subset) to what the piece uses."_

## A5 — mood-gate-doctrine: pose phase params (the `book` field pattern)

**What changed:** `CameraPose` gained an optional, additive
`book?: { address, phase }`; the reader renders pinned at exact phase values
(approach fraction / revealed lines / turn progress) — interactive state
captured as a pure function of pose params, never wall-clock.

**Proposed amendment (mood-gate §2.1):** generalize: _"a pose may pin
INTERACTIVE state via optional additive `CameraPose` fields whose values drive
the state deterministically (Unit 04: coordinate teleport; Unit 05: reading
phase). Time-driven animations must be expressible as a phase param to be
capturable."_

## A6 — traversal-doctrine (note, no text change required): floor-gating without widening the frozen handle

Unit 05 needed `surface mode === 'floor'` but `LocomotionHandle` (frozen) does
not expose surface. The shipped pattern reads the held camera instead: on the
slab the eye sits exactly at `EYE_HEIGHT` in the local frame; on the helix it
is off-slab by ≥ a tread rise (gate: `|camera.y − EYE_HEIGHT| ≤ 0.02`). If a
third consumer ever needs surface mode, widen the seam deliberately instead of
proliferating this heuristic — until then, the handle stays frozen.

---

## Outdated rules / missing coverage found

- render-doctrine §4 still cites "~20 calls interior, 21 at an edge" as the
  ledger — after Unit 05 the with-book-open ledger is 24/25
  (`docs/mood/unit-05/checklist.md` §1). Update the pointer when amending.
- No doctrine currently owns "input-mode layering" (walking input vs reading
  input listeners). Not yet worth doctrine — one consumer. Re-evaluate at
  Unit 08 (search UI).
