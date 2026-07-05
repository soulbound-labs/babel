# Mobile Doctrine — the additive touch scheme, disjoint by lock state (DOCTRINE)

> **Preload when** you touch `src/presentation/input/**`, `src/presentation/render/hud/**`,
> the touch modules under `src/presentation/render/player/` (`touch-input.ts`, `fov.ts`) or
> `src/presentation/render/reading/` (`useBookTapPick.ts`, `proximity.ts`,
> `useBookProximityGlow.ts`), the visibility lifecycle (`audio/visibility-pause.ts`,
> `EntryOverlay`'s touch path), or anything that fires on a coarse pointer. Siblings: the
> world being driven is [`render-doctrine.md`](./render-doctrine.md) +
> [`traversal-doctrine.md`](./traversal-doctrine.md); the reading mode taps open is
> [`book-reading-doctrine.md`](./book-reading-doctrine.md); the context being suspended is
> [`audio-doctrine.md`](./audio-doctrine.md); captures are
> [`mood-gate-doctrine.md`](./mood-gate-doctrine.md).

## 1. High-level summary

The touch scheme is a set of **additive writers into existing pure seams** — nothing
downstream of input changes, and desktop behavior stays **byte-identical** (pinned by a
fast-check boolean-path property, the FOV identity clause, and frozen-constant `git diff`
checks). There is no mode switch and no forked pipeline: **both schemes are always live and
are disjoint by lock state** — every desktop handler requires `pointerLockElement !== null`,
every touch handler requires it `=== null`. On a hybrid device exactly one side of that
disjunction can fire; neither can double-fire.

The scheme: virtual joystick + drag-look feeding `LocomotionInput`, tap-to-open feeding the
one `castBookPick` pipeline, swipes feeding the reader's pure `advance`/`retreat`, ✕ routing
through `closeReader`, and `visibilitychange` as the pause signal (the touch analog of
pointer-lock loss). Capability detection (`isTouchPrimary`) governs only what **mounts** —
never runtime behavior branches.

## 2. The frozen surfaces (consumed and owned)

**Consumed (owned elsewhere — never reshape from here):**

| Surface                                          | Where                                    | Rule                                                                          |
| ------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `LocomotionHandle { suspend, resume, state }`    | `render/player/LocomotionController.tsx` | touch never widens it; visibility pause uses it like any other suspender      |
| `stepLocomotion` + `MAX_FRAME_DELTA`, `MAX_STEP` | `render/player/locomotion.ts`            | analog rides the existing clamps; they make resume-after-hide safe for free   |
| `castBookPick` / `slotTransform` / INV-B1        | `render/reading/`, `render/room/`        | tap pick is the SAME body as the reticle pick — one pipeline, two ray origins |
| `reader-state.ts` pure machine                   | `render/reading/`                        | swipes fire `advance`/`retreat` exactly once; refusal is the contract         |
| `AudioBus` / `BusContext` (frozen API)           | `audio/audio-bus.ts`                     | visibility pause suspends the RAW ctx in App.tsx — the bus is never widened   |
| `HIGHLIGHT_TINT` / `HIGHLIGHT_MIX`               | `render/reading/highlight.ts`            | one tint implementation shared by hover + glow, values frozen at the gate     |
| Desktop `fov: 62`, `dimensions.ts`               | `render/`                                | reachable only through `resolveFov`'s exact identity clause (§4)              |

**Owned here:**

- `src/presentation/input/capabilities.ts` — `isTouchPrimary()`: coarse primary pointer AND
  `maxTouchPoints > 0`; env-injectable; guards missing `window` **and** missing `matchMedia`
  (jsdom has neither guarantee).
- `src/presentation/input/gestures.ts` — pure classifiers over `{pointerId, x, y, t}` trace
  records: `classifyTouch` (tap iff max displacement ≤ `TAP_SLOP_PX`), `classifySwipe`
  (horizontal ≥ `SWIPE_MIN_PX`, duration ≤ `SWIPE_MAX_MS`, axis-dominant).
- `src/presentation/render/player/touch-input.ts` — `TouchInputState` (the shared ref the
  HUD writes and the controller drains) + `joystickVector` (hard deadzone, unit clamp,
  `-0` normalized to `+0`).
- `src/presentation/render/player/fov.ts` — `resolveFov(aspect)`: **exactly** `DESKTOP_FOV`
  for `aspect ≥ 1` (early return of the constant, no float arithmetic), horizontal-preserving
  derivation clamped to `PORTRAIT_FOV_MAX` below 1.
- `src/presentation/render/hud/TouchControls.tsx` — the DOM HUD (§5).
- `reading/useBookTapPick.ts` + `reading/proximity.ts` + `reading/useBookProximityGlow.ts` —
  the glow-as-affordance tap contract (§6).
- `src/presentation/audio/visibility-pause.ts` + the `suspendedByVisibility` flag in
  `App.tsx` — the pause lifecycle (§7).

## 3. Input topology — where listeners live is the security model

- **Touch movement flows exclusively through `LocomotionInput`.** The HUD writes
  `TouchInputState`; `LocomotionController` drains it each frame pre-step (consume-and-zero
  look deltas, mirroring the `movementX` path; analog copied in). Touch modules MUST NOT
  touch the camera transform, `traversalRef`/`trackerRef`/`collisionRef`, or call
  `crossThreshold`/`detectCommit` — audited by the greps in the mobile spec §9.
- **Analog is a speed scale, never a multiplier**: wish speed =
  `min(1, |analog|) × WALK_SPEED`, so wish ∈ `[0, WALK_SPEED]` always. The joystick deadzone
  is **hard** — below it the vector is exactly `{f: 0, r: 0}` — because thumb drift must not
  creep across commit planes (jitter at a plane is safe: cancelling move pairs keep
  `coordinate === reduce(moveLog)`, but drift is a walk).
- **World touch handlers attach to the CANVAS element** (`gl.domElement` inside the Canvas
  tree, `querySelector('canvas')` from the HUD side) — never `document`. HUD elements are
  canvas **siblings**, so HUD touches structurally cannot reach world handlers and world
  touches cannot reach the HUD: hit-exclusion with zero `stopPropagation` discipline.
- **Never build a viewport-covering DOM "look region".** The originating spec described one
  and it is a trap: any DOM overlay above the canvas swallows the canvas-attached tap-pick
  and swipe listeners. Look-drag listens on the canvas itself; the only DOM the HUD owns is
  the joystick hot zone and the ✕ (post-execution note 1, commit `c34b8cf`).
- **The splash is the gate.** While the entry/pause overlay is visible it covers the canvas
  (zIndex 1000, pointer-events auto), so no touch reaches world handlers — structural, zero
  threaded state. Don't add a `splashVisible` boolean plumbed through three layers to
  re-derive what the DOM already enforces.

## 4. Desktop invariance — how "additive" is enforced, not promised

- **Capability gates what mounts, never what runs.** `isTouchPrimary()` is evaluated once at
  mount to decide whether HUD/touch hooks exist. Desktop listeners stay wired
  unconditionally; nothing consults the capability per-event.
- **The boolean locomotion path is character-identical** with `analog` absent or zero —
  pinned by a fast-check property (`locomotion.spec.ts`). Extending `LocomotionInput` was
  legal because the input type is NOT frozen; `LocomotionHandle` is. Extend inputs, never
  handles.
- **The FOV identity clause is load-bearing**: `resolveFov(a) === 62` exactly (`===`, not
  close-to) for every `a ≥ 1`, so the desktop projection matrix — and every committed mood
  capture — stays bit-identical. Any aspect-dependent knob added later MUST follow this
  pattern: exact identity on the capture rig's domain, derivation elsewhere.
- Frozen-value audits ride the gate: `git diff` empty on `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX`
  values, `dimensions.ts`, `audio-bus.ts`, the reader machine; zero new runtime deps
  (the joystick is hand-rolled — `nipplejs` owns DOM/events outside React and fights the
  hit-exclusion model).

## 5. The HUD — DOM, findable, fat-fingered

- **HUD is DOM, never scene geometry**: canvas siblings, zero draw calls, CSS transforms
  only, no rAF repaint loop. drei `<Hud>` is ruled out (second camera — violates
  render-doctrine's one-camera rule).
- **Touch targets are zones, not glyphs** (on-device finding, 2026-07-05): thumbs miss a
  128 px ring, and in this world every miss lands on a wall of books. The joystick's hit
  target is an invisible lower-left hot zone (`min(50vw, 220px) × min(35vh, 220px)`)
  driving the visible ring from anywhere inside it. Any future HUD control gets the same
  treatment: visible element recessive, hit area generous.
- **Anchor with safe-area insets** (`calc(20px + env(safe-area-inset-*))`) — iOS Safari's
  floating bottom bar overlays `bottom: N` fixed elements and eats their touches.
- **Idle presence must survive the dark.** Opacity multiplies through nested elements; a
  0.5-opacity container with 0.4-alpha ink is invisible against this scene. The ring uses
  `RING_INK` (0.8-alpha) at 0.65 container opacity — recessive but findable. Verify HUD
  legibility against real captures, not a white devtools canvas.
- The ✕ renders only while reading, corner-anchored, and routes through the `closeRef` seam
  to `closeReader` — the reader's exact close ordering (INV-B6), never a parallel path. The
  joystick unmounts while reading (reading swipes own the canvas).
- HUD floor items (quadrant containment, no shaft occlusion, no fine-pointer mount) are
  binary checklist rows in `docs/mood/mobile/checklist.md` §1 — failed items need a recorded
  waiver, never a silent pass.

## 6. Reading on touch — the glow IS the tap affordance

- **Taps open ONLY the glowing book.** `useBookTapPick` accepts a pick iff the tap ray lands
  on `nearestFacingSlot(cameraPose, slots)` — the SAME pure selector and constants
  (`PROXIMITY_MAX_DISTANCE`, `PROXIMITY_MIN_FACING_DOT`) the proximity glow uses, so the
  affordance and the action cannot disagree. Without this gate the unit was unplayable: in a
  room papered wall-to-wall with books, every stray touch opened a reader (the on-device
  "stuck opening books forever" loop, fixed in `6d1b344`). Desktop keeps its aim-anywhere
  reticle — precision aim is its own affordance.
- The tap pick is `castBookPick` with tap NDC — INV-B1 (current-room mesh only) lives in that
  one body for both schemes. All desktop gates carry over: `enabled()`, floor epsilon, live
  coordinate, reader closed, plus tap classification and lock-null.
- **Gestures are discrete triggers, never continuous drivers.** A recognized swipe fires
  `advance`/`retreat` exactly once; the bend animates on the machine clock
  (`READ_TURN_SECONDS`) exactly like a click-turn. NEVER map finger position onto
  `uTurnProgress` — the turn cadence is frozen at the chills-gate. Refused swipes
  (mid-stream, at bounds) get no feedback; the pure functions' refusal IS the contract.
- Desktop clicks and touch swipes call the SAME `turnNext`/`turnPrev` bodies in
  `BookReader.tsx` — touch turns must not be silent (the rustle lives in the shared body).
- **The proximity glow is static and pose-inert**: shared tint via `highlight.ts`
  (byte-identical values), 12 Hz cadence, no time-driven animation of any kind, and inert
  whenever `?pose=` is active or the pointer is fine — so the capture rig structurally
  cannot render a tinted instance (mood-gate exemption by construction, not by promise).

## 7. Lifecycle — visibilitychange is the touch pause signal

- Touch has no pointer-lock loss, so **backgrounding is the pause**: the EntryOverlay touch
  path drives the `'returned'` splash on `visibilitychange → hidden` (never from
  `'initial'`), and the overlay NEVER closes the reader — an open book stays open
  underneath, exactly like Esc on desktop.
- **Zero all touch input on hide** and reset pointer tracking: iOS may never fire
  `pointerup`/`touchend` when backgrounding mid-touch — without this the player walks
  unattended forever (the touch analog of desktop's zero-WASD-on-lock-loss).
- **Audio suspends at the ctx level in `App.tsx`** (`attachVisibilityPause`), attached inside
  the SAME effect that owns the context (listener lifetime ≡ ctx lifetime — kills the
  StrictMode ghost). Suspend only when `state === 'running'`, swallow rejections, never
  `bus.dispose()`, never a new `AudioContext`. The frozen bus governs consumers; the app
  shell constructed the raw ctx and owns its lifecycle — suspending there widens nothing.
- **Resume is gesture-only** — encoded in the test types: the fake ctx in
  `visibility-pause.spec.ts` deliberately has NO `resume` method. The re-entry tap routes
  through the existing `onEnter → bus.resume()` catch-and-retry.
- **Resume only what visibility suspended.** `suspend()` is not re-entrant-aware; if the
  reader is open, locomotion is already suspended and the reader owns the `resume()`. The
  visibility path suspends locomotion only while the reader is closed and resumes only under
  its own `suspendedByVisibility` flag — otherwise a re-entry tap resumes walking under an
  open book and breaks INV-B6.
- The giant rAF delta after resume needs no code: `MAX_FRAME_DELTA` + `MAX_STEP` clamp it,
  and a mid-flight page turn fast-forwards to settled deterministically.

## 8. Tunables & testing

- Every feel constant is a **named export tuned on-device**, recorded in the mood
  checklist's tuning log (`docs/mood/mobile/checklist.md` §3): `TAP_SLOP_PX`,
  `SWIPE_MIN_PX`, `SWIPE_MAX_MS`, `TOUCH_LOOK_SENSITIVITY`, `JOYSTICK_DEADZONE`,
  `PORTRAIT_FOV_MAX`, `PROXIMITY_MAX_DISTANCE`, `PROXIMITY_MIN_FACING_DOT`. Change them in
  source, re-run the gate, log the final — never a magic literal.
- **Pure logic is node-tested; jsdom pins only mount + event topology.** Gesture modules are
  data-in/data-out over plain trace records — never live `PointerEvent`s. jsdom's
  PointerEvent fidelity is poor (tests dispatch `MouseEvent('pointerdown')`); anything
  interesting must not depend on it. `setPointerCapture` is always guarded (jsdom/older
  WebKit lack it) — capture is an optimization, not a requirement.
- On-device verification runs over `pnpm dev:lan` (plain http — everything this scheme needs
  works in insecure contexts). Device screenshots are NOT mood references; the desktop
  reference machine shoots captures (mood-gate doctrine).

## 9. Gotchas (symptom → cause → fix)

- **Every touch opens a book; user trapped in open/close loop** → tap-pick accepted any book
  the ray hit, in a world where every surface is books → gate the pick on the glowing slot
  (`isIntendedPick`, same selector as the glow) — `6d1b344`.
- **Joystick invisible / touches near it open books** → nested opacity multiplied ink to
  nothing AND `bottom: 24` sat under Safari's floating bottom bar; misses landed on the
  canvas as taps → hot zone + safe-area anchoring + `RING_INK` — `6d1b344`.
- **Player walks by themselves after backgrounding mid-touch** → iOS dropped the `touchend`
  → `visibilitychange → hidden` zeroes all touch input and resets pointer tracking.
- **Re-entry tap resumes walking under an open book** → visibility handler resumed a suspend
  it didn't own → `suspendedByVisibility` flag; the reader owns its own pairing (INV-B6).
- **`window.matchMedia is not a function` in tests/SSR** → capability probe assumed a full
  window → `isTouchPrimary` guards both missing `window` and missing `matchMedia`.
- **Hard deadzone leaks `-0`** → `-dy * scale` at a dead-level thumb → normalize with `+ 0`;
  the exact-zero contract is tested with `Object.is` semantics.
- **Touch look/tap dead but joystick works** → the canvas listeners bound to a stale/absent
  canvas element (one-shot `querySelector` at mount) → known fragility, tracked as
  `babel-sqko`; keep listener attachment resilient to canvas replacement.
- **Audio dead after a Siri/call interruption without a tab-hide** → iOS `interrupted` ctx
  state fires no `visibilitychange` → parked watch-item (checklist §5); every tap already
  retries `resume()`; candidate fix is `ctx.onstatechange → splash`.
- **Both schemes fire on a hybrid (iPad + trackpad)** → a handler missing its lock gate →
  every touch handler requires lock-null, every desktop handler lock-held; audit with the
  mobile spec §9 greps.

## 10. Pointers

- `docs/tasks/ongoing/mobile/mobile-spec.md` — the originating spec (M-1..M-10 invariants,
  FMEA, §9 audits) + its post-execution notes (the look-region trap, the batch-commit
  cadence).
- `docs/mood/mobile/checklist.md` — the mobile instrument sheet: objective floor, acceptance
  flow, tuning log, waiver table, watch-items.
- [`render-doctrine.md`](./render-doctrine.md) — one camera (why drei `<Hud>` is banned),
  perf budget (why the HUD is DOM), deterministic presentation (why the glow is static).
- [`traversal-doctrine.md`](./traversal-doctrine.md) — the commit planes the hard deadzone
  protects; the move log IS the coordinate.
- [`book-reading-doctrine.md`](./book-reading-doctrine.md) — the desktop input contract this
  scheme mirrors under lock-null; the frozen turn cadence swipes must respect.
- [`audio-doctrine.md`](./audio-doctrine.md) — the frozen bus the ctx-level suspend
  deliberately routes around; entry-gesture resume.
- [`mood-gate-doctrine.md`](./mood-gate-doctrine.md) — why touch-only visuals must be
  structurally inert on the capture rig.
