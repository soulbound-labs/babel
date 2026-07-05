# Mobile Touch Controls: Technical Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: Architect Agent
**Date**: 2026-07-05
**Brief**: `docs/tasks/ongoing/mobile/mobile-brief.md`

---

## 1. Overview

### 1.1 Objective

Make the web experience playable on touch devices. Desktop is a pointer-lock FPS
walker; every input path (WASD, mouselook, reticle pick, click/Q reading) is gated on
`document.pointerLockElement !== null` and is therefore structurally dead on touch.
This unit adds a parallel, additive touch scheme — virtual joystick + drag-look,
tap-to-open-book, swipe pages + ✕ close, tap-to-enter + pause-on-hide — reaching
feature parity without altering any desktop behavior.

### 1.2 Constraints

- MUST: keep desktop behavior byte-identical (listeners, gates, `fov: 62`, entry/relock overlay).
- MUST: keep every frozen seam intact: `LocomotionHandle` (`suspend()/resume()/state`),
  single camera owned by `LocomotionController`, `instanceId === slot` book mapping,
  `dimensions.ts`, room-identity-by-mesh, frozen `AudioBus` API.
- MUST: route all touch movement exclusively through the `LocomotionInput` seam and all
  reading actions through the pure functions in `reader-state.ts`.
- MUST: exclude HUD DOM touches from world handlers structurally (world touch handlers
  attach to the canvas element; HUD is a canvas sibling).
- MUST NOT: add rendering-engine changes for mobile performance (already verified on
  iPhone 13 Chrome), add a second camera, add scene-geometry HUD, or add new runtime
  dependencies.
- MUST NOT: widen `AudioBus`/`BusContext`, `LocomotionHandle`, or the desktop reading
  input contract (left/right click, Q closes, Esc-is-pause-not-close).
- SHOULD: keep HUD minimal and in the world's tone; keep all gesture math pure and
  node-testable.

### 1.3 Success Criteria (binary)

- `pnpm compile && pnpm test:unit:ci && pnpm lint` green at every phase gate.
- New unit tests pass: boolean-input equivalence property on `stepLocomotion`,
  `resolveFov(a) === 62` exactly for all `a ≥ 1`, gesture classifier tables,
  visibility-pause seam behavior, tap-pick NDC casting, proximity selector.
- Desktop pose re-render (`?pose=1..4`, 1280×720) is pixel-identical to
  `docs/mood/unit-03/pose-{1..4}.png`.
- `git diff` empty on frozen values: `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX`, desktop `fov: 62`
  usage, `dimensions.ts`, `audio-bus.ts`, `reader-state.ts` state machine.
- Manual on-device pass (iPhone 13, WebKit) completes the brief's acceptance flow and is
  recorded in `docs/mood/mobile/checklist.md`.

---

## 2. Scope

| In Scope                                                                         | Out of Scope                                                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Touch locomotion (joystick + drag-look) into the existing `LocomotionInput` seam | Any change to desktop input behavior or bindings                                                           |
| Tap-point book pick reusing the pick pipeline                                    | Mobile performance tuning / render-engine changes                                                          |
| Swipe page turns + ✕ close via `reader-state.ts` pure functions                  | Finger-scrubbed page turns (violates the frozen turn cadence)                                              |
| Capability detection (`pointer: coarse` + `maxTouchPoints`), both schemes live   | A user-facing mode-switch UI                                                                               |
| Tap-to-enter + `visibilitychange` pause; ctx-level audio suspend                 | Widening `AudioBus`/`BusContext`/`LocomotionHandle`                                                        |
| Portrait FOV via pure `resolveFov(aspect)` with landscape identity clause        | Changing `READ_DISTANCE`/spread geometry for portrait legibility (parked — needs on-device evidence first) |
| Proximity-driven book glow (touch-only, pose-inert)                              | Time-animated glow/pulse (violates determinism)                                                            |
| `dev:lan` script for on-device verification                                      | HTTPS/secure-context tooling (parked until an API needs it)                                                |
| Mobile mood checklist `docs/mood/mobile/checklist.md`                            | On-device capture instrument (device screenshots are not references)                                       |
| iOS `interrupted` ctx state without `visibilitychange` (Siri/call)               | — parked as follow-up pending on-device observation                                                        |

**External dependencies**: none added. Existing: react-three-fiber, drei, three, Web
Audio, Vite. **Auth**: none (fully client-side unit).

---

## 3. Architecture

The touch scheme is a set of additive writers into existing pure seams. Nothing
downstream of input changes.

```
DOM HUD (canvas siblings)            Canvas element (world touch surface)
┌──────────────────────┐             ┌─────────────────────────────────┐
│ TouchControls        │             │ look-drag / tap-pick / swipe    │
│  joystick · ✕ button │             │ listeners (touch path only)     │
└─────────┬────────────┘             └────────────┬────────────────────┘
          │ writes                                │ classify (pure gestures.ts)
          ▼                                       ▼
   TouchInputState ref ──drained each frame──► LocomotionController.useFrame
          │                                       │ stepLocomotion (pure)
          │                                       ▼
          │                          traversal machine · re-base · streaming
          │                                     (untouched)
          └── reading gestures ──► reader-state.ts pure fns (untouched)
```

### 3.1 Render (frontend)

- **Input injection, not a new seam.** `LocomotionController` gains one optional prop
  `touchInput?: RefObject<TouchInputState | null>`. In `useFrame`, before
  `stepLocomotion`, the controller drains accumulated look deltas
  (`yaw -= lookDX * TOUCH_LOOK_SENSITIVITY`, pitch via existing `clampPitch`) and
  copies the joystick vector into the input. Consume-and-zero semantics mirror the
  `movementX` path. `LocomotionHandle` is untouched; because `useFrame` early-returns
  on `suspended`, touch input is automatically dead during reading — same as desktop.
- **Analog extension of `LocomotionInput`** (non-frozen type): optional
  `analog?: { f: number; r: number }` with `|vector| ≤ 1`. When present and non-zero,
  `stepLocomotion` uses it as the wish direction and scales wish speed by
  `min(1, hypot(f, r)) * WALK_SPEED` instead of normalizing to full speed. When
  absent, the code path is character-identical to today (pinned by a property test).
- **HUD is DOM, never scene geometry.** `TouchControls` renders as a sibling of
  `<Canvas>`: zero draw calls, CSS transforms only, no rAF repaint loop. drei `<Hud>`
  is ruled out (second camera). `touchAction: 'none'` on the Canvas style.
- **Portrait FOV**: pure `resolveFov(aspect)` in `src/presentation/render/player/fov.ts`.
  Identity clause: for `aspect ≥ 1` it returns **exactly** `DESKTOP_FOV = 62` (desktop
  projection matrix bit-identical). For `aspect < 1`: preserve the horizontal FOV
  derived at `FOV_REF_ASPECT = 16/9`, clamped to `PORTRAIT_FOV_MAX` (initial 85 —
  the unclamped identity yields ~133° on iPhone 13 portrait, unusable; the clamp is
  load-bearing and its value is an on-device mood judgment). Applied by a tiny
  in-Canvas `PortraitFovDriver` on resize only — mutates the one existing camera.
- **Capability detection**: `src/presentation/input/capabilities.ts` exporting
  `isTouchPrimary()` (`matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0`),
  injectable for jsdom tests. Governs what _mounts_; desktop listeners stay wired
  unconditionally.

### 3.2 Traversal (frontend)

- Analog input is traversal-safe **iff** wish speed stays in `[0, WALK_SPEED]` — never
  a multiplier > 1. `MAX_FRAME_DELTA = 0.1` (locomotion.ts) and the `MAX_STEP = 0.25`
  displacement clamp (collision.ts) are untouched; they guarantee one-commit-per-frame
  and make the giant-delta-on-visibility-resume case safe with no new code.
- Joystick **hard deadzone**: resting/near-center magnitude writes exactly zero wish
  velocity (thumb drift must not creep across commit planes). No new hysteresis on the
  horizontal planes — the plane model is frozen; micro-jitter at a plane is
  self-consistent (`coordinate === reduce(moveLog)` via cancelling pairs).
- Touch input is strictly upstream: it must never touch `traversalRef`, `trackerRef`,
  `collisionRef`, the camera transform, or call `crossThreshold`/`detectCommit`.
- On `visibilitychange → hidden`: zero the touch scheme's movement fields and reset
  joystick touch-tracking (iOS may never fire `touchend` when backgrounding mid-touch —
  the exact reason desktop zeroes WASD flags on lock loss). Backgrounding has **zero**
  working-set/streaming implication — no visibility-driven eviction or re-base.

### 3.3 Book-reading (frontend)

- **Extract the cast, don't fork the pipeline**: the body of `useBookPick`'s handler
  becomes exported `castBookPick(ndc, camera, scene, coordinate): BookPick | null`.
  The desktop hook calls it with `Vector2(0,0)`; new `useBookTapPick` calls it with
  tap NDC. INV-B1 (current-room mesh only via `findCurrentRoomBookMesh`, doorway books
  unreachable) lives in exactly one place. All gates identical: `enabled()`, floor
  epsilon, live coordinate, reader closed.
- **Mutual exclusion by construction**: desktop handlers require lock-held (never true
  on touch); every touch handler requires `pointerLockElement === null` AND
  splash-not-visible. Disjoint on hybrids; neither can double-fire.
- **Gestures are discrete triggers, never continuous drivers.** A recognized swipe
  fires `advance()`/`retreat()` exactly once; the bend animates on the machine clock
  (`READ_TURN_SECONDS`) exactly as a click-turn. Never map finger position onto
  `uTurnProgress`. Refused swipes (mid-stream, at bounds) get no feedback — the pure
  functions' refusal IS the contract; no queue.
- **Shared turn bodies**: extract `turnNext`/`turnPrev` callbacks in `BookReader.tsx`
  (advance/retreat + machine write + `fireRustle`) consumed by both desktop
  `onPointerDown` and the touch swipe handler — touch turns must not be silent.
- **✕ close routes through the existing `closeReader`** (`close` → `acknowledgeIntent`
  → `restoreShelfInstance` → `resume()` → `setDisplay(null)`, in that order — INV-B6
  zero-first-frame-delta depends on it). Seam to the DOM HUD: `BookReader` gains
  `closeRef?: RefObject<(() => void) | null>` (populated with `closeReader` while
  open) and `onReadingChange?: (open: boolean) => void`. Nothing else widens.
- **Backgrounding while reading = Esc semantics verbatim**: splash over the open book,
  reader machine untouched, touch reading handlers inert under splash, re-entry tap
  resumes reading. The overlay never calls `closeReader`. Post-resume `tick` with a
  large delta fast-forwards a mid-flight turn to settled — acceptable and
  deterministic; the resulting `turn-settle` rustle fires into a just-resumed context
  (harmless; the scene never blocks on audio).
- **Proximity glow**: extract apply/clear tint mechanics from `useBookHover.ts` into
  `reading/highlight.ts` (constants `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` byte-unchanged);
  new `useBookProximityGlow` swaps only the _selection_ — pure
  `nearestFacingSlot(cameraPose, slotTransforms) → slot | null` in
  `reading/proximity.ts` (no raycast; `instanceId === slot` never at risk). Gates
  mirror the pick, plus: touch-primary only, inert when `?pose=` is active, inert when
  pinned. Static tint, 12 Hz cadence, **no time-driven animation**.

### 3.4 Audio (frontend)

- **Suspend-on-hide is app-shell context lifecycle, not bus routing.** New
  `src/presentation/audio/visibility-pause.ts` exporting
  `attachVisibilityPause(doc: VisibilityDocLike, ctx: SuspendableContextLike): () => void`
  — suspends only when `ctx.state === 'running'`, swallows rejections, returns detach.
  `SuspendableContextLike = { readonly state: string; suspend(): Promise<void> }` is a
  locally-declared narrow seam; `BusContext` and the frozen `AudioBus` are untouched.
- **Listener lifetime ≡ context lifetime**: attach inside the _existing_ audio
  `useEffect` in `App.tsx` (the StrictMode-safe one that creates ctx + bus + emitters),
  detach in that effect's cleanup. Never register it elsewhere capturing ctx via state.
- Suspend is reversible pause — never `bus.dispose()`, never a new `AudioContext`.
  The re-entry tap routes through the existing `onEnter → bus.resume()` with its
  catch-and-retry (resume when already running is a no-op; repeated taps safe).
  Explicit suspend-on-hide also normalizes iOS's flaky `interrupted` auto-resume path.
- The tap's synthesized `click` carries user activation on iOS 13+ — `onClick={enter}`
  works on touch as-is. Contingency if on-device verification shows the click
  suppressed: add `onTouchEnd` calling the same `enter()` with `preventDefault()` (so
  it fires exactly once).
- Footsteps / page-rustle / hums / drone: **zero changes**. They hang off locomotion
  cadence and reader-state transitions, which the touch scheme feeds identically. Any
  diff touching those files or `audio-bus.spec.ts` is a red flag.

### 3.5 Tooling (infra)

- **No new dependencies.** drei has no joystick; `nipplejs` owns DOM/events outside
  React and fights the hit-exclusion constraint. Hand-rolled: one pure math module +
  one thin overlay component, fully under `tsc`/ESLint.
- **LAN dev server**: one additive package script —
  `"dev:lan": "concurrently -n vite,convex \"vite --host\" \"convex dev\""`.
  Keeps plain `pnpm dev` loopback-only; `vite.config.ts` untouched. Phone loads over
  plain http — everything this unit needs (PointerEvents, media queries,
  `visibilitychange`, gesture-gated audio resume) works in insecure contexts.
- **Gate (declared in `substrate.yaml`, in order)**: `pnpm compile` →
  `pnpm test:unit:ci` → `pnpm lint`. No out-of-band gate is declared: the iPhone check
  is a recorded human step, not a gate command.
- **Test placement** (`vitest.config.ts` projects): pure logic as `.ts` in the node
  project (`tests/unit/presentation/**/*.{test,spec}.ts`); component-mount specs as
  `.tsx` in jsdom. Design gesture modules as data-in/data-out over plain records
  (`{pointerId, x, y, t}`), never consuming live `PointerEvent`s — jsdom's
  PointerEvent fidelity is poor; keep the interesting logic node-tested.

### 3.6 Mood-gate (cross-cutting, woven)

- The proximity glow is a mood-touch _unless_ it structurally cannot run during
  captures: touch-primary gate + `?pose=` inertness make it exempt by construction.
- The shared-tint refactor of `useBookHover.ts` triggers one §4 re-render-and-compare
  pass of committed poses (`?pose=1..4`, 1280×720) vs `docs/mood/unit-03/pose-{1..4}.png`
  — zero diff expected, no re-bless. (Unit-04/05 captures are still pending Rei and
  cannot be compared; this unit's compare covers the committed set only.)
- Portrait FOV keeps captures valid via the identity clause (`aspect ≥ 1 → exactly 62`).
  Optional (SHOULD): 1–2 portrait-aspect references rendered **on the desktop
  reference machine** at 390×844 (`?pose=1`, `?pose=3`) committed to
  `docs/mood/mobile/` — deterministic, so they qualify; skippable if judged too heavy.
- `docs/mood/mobile/checklist.md` gains the objective HUD floor (see Phase 5) and
  records the device ("iPhone 13, iOS Safari + iOS Chrome") distinct from the desktop
  reference machine. Two-part sign-off: mechanical desktop regression (pixel compare +
  knob `git diff` empty) and Rei's on-device walkthrough with subjective verdict.
  Failed objective items need a recorded waiver, never a silent pass.

---

## 4. Implementation Details

### 4.1 New files

| Path                                                      | Exports                                                                                                                                                      | Purpose                                                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presentation/input/capabilities.ts`                  | `isTouchPrimary(env?)`                                                                                                                                       | Coarse-pointer + maxTouchPoints predicate; env injectable (`{ matchMedia, maxTouchPoints }`) for tests                                                                                        |
| `src/presentation/input/gestures.ts`                      | `TAP_SLOP_PX`, `SWIPE_MIN_PX`, `SWIPE_MAX_MS`, `classifyTouch(trace): 'tap' \| 'drag'`, `classifySwipe(trace): 'left' \| 'right' \| null`, `TouchTracePoint` | Pure gesture classification over `{pointerId, x, y, t}` records; explicit reset semantics on cancel                                                                                           |
| `src/presentation/render/player/touch-input.ts`           | `TouchInputState`, `createTouchInputState()`, `joystickVector(center, thumb, radius)`, `JOYSTICK_DEADZONE`, `TOUCH_LOOK_SENSITIVITY`                         | `TouchInputState = { active: boolean; analog: { f: number; r: number }; lookDX: number; lookDY: number }` — look deltas accumulate-and-drain; joystick math with hard deadzone and unit clamp |
| `src/presentation/render/player/fov.ts`                   | `DESKTOP_FOV = 62`, `FOV_REF_ASPECT`, `PORTRAIT_FOV_MAX`, `resolveFov(aspect)`                                                                               | Pure; exact identity for `aspect ≥ 1`; clamped horizontal-preserving derivation below                                                                                                         |
| `src/presentation/render/hud/TouchControls.tsx`           | `TouchControls`                                                                                                                                              | DOM overlay (canvas sibling): joystick lower-left, look-capture region, ✕ while reading; writes `TouchInputState`; zeroes on `visibilitychange → hidden`; mounts only when touch-primary      |
| `src/presentation/render/reading/useBookTapPick.ts`       | `useBookTapPick`                                                                                                                                             | Canvas-attached tap → NDC → `castBookPick`; gates: lock-null, touch session, splash hidden, tap-classified, `enabled()`, floor epsilon, live coordinate                                       |
| `src/presentation/render/reading/highlight.ts`            | `applyHighlight`, `clearHighlight`, `HIGHLIGHT_TINT`, `HIGHLIGHT_MIX`                                                                                        | Tint mechanics extracted from `useBookHover.ts`, values byte-unchanged                                                                                                                        |
| `src/presentation/render/reading/proximity.ts`            | `nearestFacingSlot(pose, slots)`                                                                                                                             | Pure nearest-openable-in-front selector over `slotTransform` positions                                                                                                                        |
| `src/presentation/render/reading/useBookProximityGlow.ts` | `useBookProximityGlow`                                                                                                                                       | Touch-primary + pose-inert + reader-closed + on-slab gated; 12 Hz; static tint via `highlight.ts`                                                                                             |
| `src/presentation/audio/visibility-pause.ts`              | `attachVisibilityPause`, `SuspendableContextLike`, `VisibilityDocLike`                                                                                       | Suspend-on-hide only; no resume (gesture-only); detach fn                                                                                                                                     |
| `docs/mood/mobile/checklist.md`                           | —                                                                                                                                                            | Mobile instrument sheet (Phase 5)                                                                                                                                                             |

### 4.2 Modified files (all additive)

| Path                                                      | Change                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presentation/render/player/locomotion.ts`            | Optional `analog?: {f, r}` on `LocomotionInput`; wish-speed normalization becomes clamp `min(1,                                                                                                                                                                                                                 | analog | ) × WALK_SPEED` on the analog path; boolean path character-identical |
| `src/presentation/render/player/LocomotionController.tsx` | Optional `touchInput` prop; drain look deltas + merge analog in `useFrame` pre-step; desktop lock-gated listeners byte-identical                                                                                                                                                                                |
| `src/presentation/render/WorldScene.tsx`                  | Fragment: `<Canvas>` + `<TouchControls>`; create `touchInputRef`; `PortraitFovDriver` (uses `resolveFov` on `size` change); `touchAction: 'none'` on Canvas style; thread `closeRef`/`onReadingChange` between `BookReader` and `TouchControls`                                                                 |
| `src/presentation/render/reading/useBookPick.ts`          | Extract exported `castBookPick`; desktop hook behavior unchanged                                                                                                                                                                                                                                                |
| `src/presentation/render/reading/useBookHover.ts`         | Consume `highlight.ts`; `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` re-exported or imported, values unchanged; no behavioral change                                                                                                                                                                                        |
| `src/presentation/render/reading/BookReader.tsx`          | Extract `turnNext`/`turnPrev`; canvas-attached swipe effect (lock-null + splash-hidden gated, active only while `display !== null`); populate `closeRef`; call `onReadingChange`                                                                                                                                |
| `src/app/App.tsx`                                         | Attach/detach `attachVisibilityPause(document, ctx)` inside the existing audio effect; visibility-hide → conditional `handle.suspend()` (only if reader closed) + input zeroing; track `suspendedByVisibility` so re-entry resumes only what visibility suspended                                               |
| `src/app/EntryOverlay.tsx`                                | Touch-primary path: skip pointer-lock acquire/relock machinery entirely; tap → `onEnter()` + dismiss; `visibilitychange → hidden` drives the `'returned'` splash phase on touch (analog of lock loss); re-entry tap → `onEnter()` (+ locomotion resume if visibility suspended it). Desktop path byte-identical |
| `package.json`                                            | Add `"dev:lan"` script                                                                                                                                                                                                                                                                                          |

### 4.3 Key design decisions

> **Insight (analog seam)**: `LocomotionHandle` is frozen but `LocomotionInput` is not —
> extending the input type keeps `stepLocomotion` pure and every existing test green,
> while quantize-to-boolean would force 8-way full-speed movement on the tight stair
> helix.

| Approach                             | Behavior                              | Problem                                               |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------------- |
| Quantize to WASD booleans            | Zero locomotion change                | 8-way, full-speed-only; poor helix control            |
| **Optional `analog` field, clamped** | Magnitude scales speed ≤ `WALK_SPEED` | None — additive; boolean path pinned by property test |

> **Insight (audio suspend)**: the frozen contract governs _consumers_ of the bus;
> `App.tsx` constructed the raw context and already owns its lifecycle — `ctx.suspend()`
> there widens nothing.

| Approach                 | Behavior      | Problem                                    |
| ------------------------ | ------------- | ------------------------------------------ |
| `bus.suspend()`          | Symmetric API | Requires amending the frozen spec §4.6 API |
| **Ctx-level in App.tsx** | Same effect   | None — matches existing ownership split    |

> **Insight (hit-exclusion)**: attaching world touch handlers to the **canvas element**
> (not `document`) makes HUD exclusion structural — HUD elements are canvas siblings,
> so their touches can never reach world handlers; no `stopPropagation` discipline.

> **Insight (visibility vs reader suspend)**: `suspend()` is not re-entrant-aware. If
> the reader is open, locomotion is already suspended and the reader owns the
> `resume()`. The visibility handler therefore suspends only when the reader is closed
> and resumes only what it suspended (`suspendedByVisibility` flag) — otherwise a
> re-entry tap would wrongly resume locomotion under an open book, breaking INV-B6.

### 4.4 Invariants

| #    | Invariant                                                                                                                              | Audit                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| M-1  | Desktop byte-identical: no change to lock-gated listeners, `KEY_MAP`, `MOUSE_SENSITIVITY`, desktop reading contract, entry/relock flow | Code review + pose pixel compare + `git diff` on frozen constants |
| M-2  | Touch and desktop gates mutually exclusive: desktop requires lock-held; touch requires lock-null ∧ splash-hidden                       | Unit test: pick handlers never both enabled for one event         |
| M-3  | Wish speed ∈ [0, `WALK_SPEED`]; `MAX_FRAME_DELTA`, `MAX_STEP` untouched                                                                | `pnpm test:unit:ci` locomotion specs; grep audit (§9)             |
| M-4  | Touch writes only `LocomotionInput` / `reader-state` pure fns — never camera, traversal refs, `crossThreshold`                         | grep audit (§9)                                                   |
| M-5  | `LocomotionHandle` shape unchanged                                                                                                     | grep audit (§9)                                                   |
| M-6  | ✕ routes through `closeReader`; never calls `resume()` directly                                                                        | Code review; jsdom test asserts `closeRef` wiring                 |
| M-7  | Hide → at most one `ctx.suspend()`; never dispose/new ctx; resume is gesture-only                                                      | `visibility-pause.spec.ts`                                        |
| M-8  | Proximity glow: static tint, touch-primary, inert under `?pose=`/pinned; `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` unchanged                    | Unit test + `git diff` check                                      |
| M-9  | Swipes discrete: exactly one `advance`/`retreat` per recognized gesture; no `uTurnProgress` scrubbing                                  | gesture spec + code review                                        |
| M-10 | Zero new runtime deps; zero new draw calls (HUD is DOM)                                                                                | `git diff package.json` dependencies block empty                  |

---

## 5. Error Handling

| Error                                     | Cause                                                                  | Handling                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ctx.suspend()` rejects                   | Context closed (StrictMode first-mount ghost) or already transitioning | Swallowed (`catch(() => {})`) + `state === 'running'` guard; listener lifetime ≡ ctx lifetime prevents the ghost                          |
| `ctx.resume()` rejects on tap             | iOS transient                                                          | Existing catch-and-retry: next tap retries; scene never blocks on audio                                                                   |
| `touchend`/`touchcancel` never fires      | iOS backgrounds mid-touch                                              | `visibilitychange → hidden` zeroes all touch input + resets joystick tracking                                                             |
| Tap misclassified as drag (or vice versa) | Slop boundary                                                          | Pure classifier with named constants; boundary cases table-tested; constants tuned on-device                                              |
| Swipe during turn-in-flight               | User swipes fast                                                       | `advance`/`retreat` refuse mid-stream by design; no feedback, no queue (desktop parity)                                                   |
| Tap through doorway at neighbor's books   | Doorway ray                                                            | Structurally impossible: ray set is `findCurrentRoomBookMesh` only (INV-B1)                                                               |
| Giant frame delta after resume            | rAF suspended while hidden                                             | `MAX_FRAME_DELTA` clamps displacement to 0.14 m; `MAX_STEP` clamps again; mid-flight page turn fast-forwards to settled deterministically |
| Both input schemes fire on hybrid         | iPad + trackpad                                                        | Gate disjointness (M-2): lock-held vs lock-null are mutually exclusive states                                                             |

---

## 6. Testing Strategy

| Layer             | Test Focus                                                                                                                                                                                      | File (node project unless noted)                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Pure input        | `joystickVector` deadzone/clamp/direction table; `classifyTouch` slop boundaries; `classifySwipe` axis dominance, min-distance, max-duration, cancel reset                                      | `tests/unit/presentation/input/gestures.spec.ts`, `tests/unit/presentation/render/player/touch-input.spec.ts` |
| Capabilities      | Injectable env: coarse+touch → true; fine pointer → false                                                                                                                                       | `tests/unit/presentation/input/capabilities.spec.ts`                                                          |
| FOV               | `resolveFov(a) === 62` **exactly** ∀ a ≥ 1 (incl. 1280/720); portrait monotone in aspect; clamp engages at iPhone-13 portrait aspect; purity                                                    | `tests/unit/presentation/render/player/fov.spec.ts`                                                           |
| Locomotion        | Property: `analog` absent ⇒ output identical to current behavior; magnitude 0.5 ⇒ half speed; magnitude > 1 clamps; delta 30 moves ≤ `WALK_SPEED × MAX_FRAME_DELTA`                             | extend `tests/unit/presentation/render/locomotion.spec.ts`                                                    |
| Traversal safety  | Slow-crawl across `FAR_PLANE_Z` emits exactly one `forward`; jitter at plane yields cancelling pairs with `coordinate === reduce(moveLog)`; crawl into −64 dead-end latches and clears homeward | `tests/unit/presentation/render/analog-commit.spec.ts`                                                        |
| Book pick         | `castBookPick`: non-current-room mesh yields null; NDC conversion exact at corners/center                                                                                                       | `tests/unit/presentation/render/reading/book-pick.spec.ts`                                                    |
| Proximity         | `nearestFacingSlot`: expected slot for pose; null when behind camera/off-floor; never a neighbor-room slot                                                                                      | `tests/unit/presentation/render/reading/proximity.spec.ts`                                                    |
| Reader state      | `advance`/`retreat` from non-settled status refused unchanged; large post-resume `tick` settles with exactly one `turn-settle`                                                                  | extend `tests/unit/presentation/render/reading/reader-state.spec.ts` (create if absent)                       |
| Audio pause       | Hide while running → one `suspend()`; hide while suspended/closed → zero; visible → zero resume (fake ctx type has no `resume`); rejection swallowed; detach removes + idempotent               | `tests/unit/presentation/audio/visibility-pause.spec.ts`                                                      |
| HUD mount (jsdom) | `TouchControls` mounts iff touch-primary (mocked capability); `pointerdown` on joystick never reaches a canvas-scoped handler; ✕ invokes `closeRef`                                             | `tests/unit/presentation/render/hud/TouchControls.spec.tsx`                                                   |
| Frozen            | `tests/unit/presentation/audio/audio-bus.spec.ts` — **must not change**; a diff there means the frozen API widened                                                                              | —                                                                                                             |

Commands: `pnpm compile` · `pnpm test:unit:ci` · `pnpm lint` (the `substrate.yaml` gate,
in order). Visual/feel verification is Rei's manual on-device pass (Phase 5) — no
browser automation in this project.

---

## 7. Failure Modes (FMEA)

| #   | Failure Mode                                                                | Severity | Mitigation                                                                                                                                                          |
| --- | --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Desktop regression (input, framing, captures)                               | High     | Additive-only changes behind capability/lock gates; boolean-path property test; `resolveFov` identity clause; pose pixel compare; frozen-constant `git diff` checks |
| 2   | Player walks unattended after backgrounding mid-touch                       | High     | Input zeroing + joystick reset on `visibilitychange → hidden` (mirrors desktop lock-loss zeroing)                                                                   |
| 3   | Re-entry tap resumes locomotion under an open book (INV-B6 break)           | High     | `suspendedByVisibility` flag: visibility path suspends only when reader closed, resumes only what it suspended                                                      |
| 4   | HUD touches leak into world pick/reading handlers                           | High     | Structural: world touch handlers on canvas element; HUD is a canvas sibling; jsdom test pins it                                                                     |
| 5   | Audio dead on iOS after interruption without `visibilitychange` (Siri/call) | Medium   | Parked follow-up: observe on-device; candidate fix is `ctx.onstatechange` → splash. Every tap retries `resume()` meanwhile                                          |
| 6   | `suspend()` called on closed ctx (StrictMode ghost)                         | Medium   | Listener attached in the same effect that owns ctx; `state === 'running'` guard; rejection swallowed                                                                |
| 7   | Spread illegible in portrait (fixed `READ_DISTANCE`)                        | Medium   | Route to Rei's on-device pass early; any `READ_*` change is a deliberate frozen-seam decision, not a quiet tweak — parked unless observed                           |
| 8   | Proximity glow tints a committed capture                                    | Medium   | Touch-primary gate + `?pose=` inertness (structurally cannot run on capture rig); compare pass proves it                                                            |
| 9   | Thumb drift creeps across a commit plane                                    | Low      | Hard joystick deadzone; plane self-consistency (cancelling move pairs)                                                                                              |
| 10  | Entry tap's synthesized click suppressed on some WebKit                     | Low      | Contingency: `onTouchEnd` + `preventDefault()` calling the same `enter()` exactly once                                                                              |

**Idempotency / rollback**: every phase is an ordinary git commit of additive changes;
rollback is `git revert` of the phase commit(s). No data, schema, or persisted state.
Re-running any step overwrites the same files (Write is idempotent; Edits are
uniquely anchored).

---

## 8. Prompt Execution Strategy

<!--
PROTOCOL: docs/protocol/sdd/execution-format.md
COMPLETENESS: docs/protocol/sdd/_SPEC-STANDARD.md §5
Gate commands come from substrate.yaml: pnpm compile · pnpm test:unit:ci · pnpm lint.
Execution preferences (user): autonomous within a phase, per-phase signed commits,
honor the Phase 5 human review pause. NO browser automation.
-->

### Phase 1: Pure foundations (zero behavior change)

#### Step 1.1: Capability predicate and gesture classifiers

Read `docs/tasks/ongoing/mobile/mobile-spec.md` §3.1, §3.5, §4.1.

Create `src/presentation/input/capabilities.ts`:

- `export interface CapabilityEnv { matchMedia(query: string): { matches: boolean }; maxTouchPoints: number }`
- `export function isTouchPrimary(env?: CapabilityEnv): boolean` — defaults to
  `window`/`navigator` when `env` omitted; returns
  `env.matchMedia('(pointer: coarse)').matches && env.maxTouchPoints > 0`.
  Guard `typeof window === 'undefined'` → false.

Create `src/presentation/input/gestures.ts` — pure, no DOM types:

- `export interface TouchTracePoint { pointerId: number; x: number; y: number; t: number }`
- `export const TAP_SLOP_PX = 12`, `export const SWIPE_MIN_PX = 48`,
  `export const SWIPE_MAX_MS = 500` (named tunables — final values tuned on-device in Phase 5).
- `export function classifyTouch(trace: TouchTracePoint[]): 'tap' | 'drag'` — 'tap'
  iff max displacement from first point ≤ `TAP_SLOP_PX`. Empty/single-point trace → 'tap'.
- `export function classifySwipe(trace: TouchTracePoint[]): 'left' | 'right' | null` —
  non-null iff horizontal displacement ≥ `SWIPE_MIN_PX`, duration ≤ `SWIPE_MAX_MS`,
  and |dx| > |dy| (axis dominance). Direction is sign of dx.

Create node tests `tests/unit/presentation/input/capabilities.spec.ts` and
`tests/unit/presentation/input/gestures.spec.ts` per §6 (boundary cases: exactly-at-slop
is a tap; exactly-at-min-distance is a swipe; diagonal with |dy| ≥ |dx| is null; stale
trace over `SWIPE_MAX_MS` is null).

Match the repo's existing module/comment style (see `src/presentation/render/player/locomotion.ts`).

Tools to use: Write
Tools to NOT use: Edit (files don't exist)

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/input`

#### Step 1.2: Joystick math and touch input state

Read spec §3.1, §3.2, §4.1.

Create `src/presentation/render/player/touch-input.ts` — pure, no DOM:

- `export interface TouchInputState { active: boolean; analog: { f: number; r: number }; lookDX: number; lookDY: number }`
- `export function createTouchInputState(): TouchInputState` (all zero / false).
- `export const JOYSTICK_DEADZONE = 0.15`, `export const TOUCH_LOOK_SENSITIVITY = 0.0045`
  (radians per CSS px; ~2× mouse — tuned on-device in Phase 5).
- `export function joystickVector(center: {x: number; y: number}, thumb: {x: number; y: number}, radius: number): { f: number; r: number }`
  — screen-space offset → `{f, r}` (screen up = +f, screen right = +r), magnitude
  clamped to 1, **exactly** `{f: 0, r: 0}` when magnitude < `JOYSTICK_DEADZONE`
  (hard deadzone per §3.2 — thumb drift must not creep across commit planes).

Create `tests/unit/presentation/render/player/touch-input.spec.ts`: direction table
(N/E/S/W and diagonals), deadzone boundary (just-under → exact zero; just-over →
non-zero), radius clamp (|v| ≤ 1 for thumb far outside radius).

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/player/touch-input.spec.ts`

#### Step 1.3: Portrait FOV resolver

Read spec §3.1, §3.6, §4.1.

Create `src/presentation/render/player/fov.ts` — pure:

- `export const DESKTOP_FOV = 62` (frozen render-doctrine value — landscape identity).
- `export const FOV_REF_ASPECT = 16 / 9`, `export const PORTRAIT_FOV_MAX = 85`
  (named tunable; on-device mood judgment in Phase 5).
- `export function resolveFov(aspect: number): number`:
  - `aspect >= 1` → return `DESKTOP_FOV` **exactly** (early return of the constant,
    not via float arithmetic — the desktop projection matrix must be bit-identical).
  - `aspect < 1` → `hRef = 2·atan(tan(DESKTOP_FOV/2 · π/180) · FOV_REF_ASPECT)`;
    `vFov = 2·atan(tan(hRef/2) / aspect) · 180/π`; return `min(vFov, PORTRAIT_FOV_MAX)`.
  - Guard non-finite/≤ 0 aspect → `DESKTOP_FOV`.

Create `tests/unit/presentation/render/player/fov.spec.ts` per §6, including
`resolveFov(1280/720) === 62` with `===` (not toBeCloseTo) and clamp engagement at
aspect `390/844`.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/player/fov.spec.ts`

#### Step 1.4: Analog extension of the pure locomotion step

Read spec §3.1, §3.2, §4.3 (analog seam decision), then read
`src/presentation/render/player/locomotion.ts` in full.

Edit `src/presentation/render/player/locomotion.ts`:

- Add to `LocomotionInput`:
  `/** Analog move override (touch joystick): camera-frame, |vector| ≤ 1. Absent or zero ⇒ boolean path. */`
  `analog?: { f: number; r: number };`
- In `stepLocomotion`'s wish computation: when `input.analog` is present with non-zero
  magnitude, use it as the move vector and scale wish speed by
  `Math.min(1, Math.hypot(f, r)) * WALK_SPEED` (defensive clamp). When absent or zero
  magnitude, the existing boolean path runs **unmodified** — do not restructure it.
- `MAX_FRAME_DELTA` and everything else untouched.

Extend `tests/unit/presentation/render/locomotion.spec.ts` (find the existing
locomotion spec; if the path differs, extend the actual file):

- Property (use `fast-check`, already a devDependency): for arbitrary boolean inputs
  and state, output with `analog` absent is deep-equal to output before this change
  (pin by running the boolean path with `analog: undefined` vs `analog: {f:0,r:0}`
  and by asserting current expected values from existing cases).
- Analog magnitude 0.5 straight ahead ⇒ horizontal speed `WALK_SPEED/2` (after
  accel settles or by inspecting wish velocity per the file's existing test idiom).
- Analog magnitude 2 ⇒ clamped to `WALK_SPEED`.
- `stepLocomotion` with `delta = 30` displaces ≤ `WALK_SPEED × MAX_FRAME_DELTA` (add
  if not already pinned).

Create `tests/unit/presentation/render/analog-commit.spec.ts` per §6 (slow-crawl
single-commit, jitter cancelling pairs, −64 latch) using the existing traversal/commit
test utilities — read `tests/unit/presentation/render/` and the traversal specs first
to reuse their harness idioms.

Tools to use: Read, Edit, Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

##### Timeout

300000

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 2: Touch locomotion (joystick + drag-look)

#### Step 2.1: LocomotionController touch injection

Read spec §3.1, §3.2, §4.2, then `src/presentation/render/player/LocomotionController.tsx` in full.

Edit `LocomotionController.tsx` (additive only):

- New optional prop `touchInput?: React.RefObject<TouchInputState | null>`.
- In `useFrame`, after the existing suspended early-return and before `stepLocomotion`:
  if `touchInput?.current?.active`, drain it: `yaw -= lookDX * TOUCH_LOOK_SENSITIVITY`;
  `pitch = clampPitch(pitch - lookDY * TOUCH_LOOK_SENSITIVITY)`; zero `lookDX/lookDY`
  (consume-and-drain); set `input.analog = { ...touchInput.current.analog }`; else set
  `input.analog = undefined`.
- Do NOT touch the pointer-lock listeners, `KEY_MAP`, `MOUSE_SENSITIVITY`, or
  `LocomotionHandle`. The desktop path with `touchInput` absent must be byte-identical.

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

#### Step 2.2: TouchControls HUD overlay

Read spec §3.1, §3.2, §4.1, §4.3 (hit-exclusion decision), and `src/app/EntryOverlay.tsx`
for the repo's inline-style DOM idiom.

Create `src/presentation/render/hud/TouchControls.tsx`:

- Props: `{ touchInput: React.RefObject<TouchInputState | null>; readingOpen: boolean; onCloseReading: () => void }`.
- Renders `null` unless `isTouchPrimary()`.
- Fixed-position DOM (sibling of Canvas, zIndex between canvas and EntryOverlay's 1000):
  - **Joystick** lower-left: base ring + thumb dot, CSS transforms only, pointer
    events with `setPointerCapture`; writes `joystickVector(...)` into
    `touchInput.current.analog` on move; zeroes on `pointerup`/`pointercancel`.
    Hidden while `readingOpen`.
  - **Look region**: a transparent region covering the rest of the viewport that
    accumulates drag deltas into `lookDX/lookDY`. Suppressed while `readingOpen`
    (reading swipes belong to BookReader per §3.3). Two simultaneous pointers
    (joystick + look) must work — track by `pointerId`.
  - **✕ button**: corner-anchored (top-right), rendered only while `readingOpen`;
    `onClick={onCloseReading}`. Minimal styling in the world's tone (dim vellum-warm
    monochrome, recessive idle opacity ~0.5).
- `visibilitychange → hidden`: zero `analog` and look deltas, reset all pointer
  tracking, set `active = false` until next touch (§3.2 — iOS may drop touchend).
  Set `active = true` on first pointer interaction.
- Styling judgment is delegated (brief): keep it minimal, translucent, non-occluding;
  joystick fully inside the lower-left quadrant (mood checklist item).

Create jsdom test `tests/unit/presentation/render/hud/TouchControls.spec.tsx`:
mounts iff touch-primary (inject/mock capability); joystick `pointerdown` does not
propagate to a sibling canvas-element listener; ✕ renders only when `readingOpen` and
invokes `onCloseReading`.

Tools to use: Write, Read

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/hud`

##### Timeout

300000

#### Step 2.3: WorldScene wiring + portrait FOV driver

Read spec §4.2, then `src/presentation/render/WorldScene.tsx` in full.

Edit `WorldScene.tsx`:

- Create `touchInputRef` (`useRef<TouchInputState | null>`, initialized via
  `createTouchInputState()` when `isTouchPrimary()`, else `null`).
- Pass `touchInput={touchInputRef}` to `LocomotionController`.
- Add `touchAction: 'none'` to the Canvas style object.
- Add `PortraitFovDriver` (small component inside Canvas): `useThree((s) => s.size)`;
  on size change, `camera.fov = resolveFov(size.width / size.height)`;
  `camera.updateProjectionMatrix()`. Never per-frame. (On desktop aspects this writes
  exactly 62 — a no-op by the identity clause.)
- Return a fragment: `<Canvas>…</Canvas>` + `<TouchControls …>` (touch-primary mounts
  are handled inside TouchControls). Thread `readingOpen` state + `closeRef` here —
  create `const readerCloseRef = useRef<(() => void) | null>(null)` and
  `const [readingOpen, setReadingOpen] = useState(false)`; pass `closeRef`/
  `onReadingChange` to `BookReader` (wired in Phase 3 — pass now, BookReader accepts
  them in Step 3.4; to keep this step compiling, add the props to BookReader's
  signature here as no-ops if needed, or defer passing until 3.4. Prefer: pass in 3.4).
- For this step, `TouchControls` gets `readingOpen={false}` and a no-op
  `onCloseReading` placeholder — replaced in Step 3.4.

Manual smoke (not a gate): `pnpm dev`, desktop unchanged; Chrome DevTools device
emulation shows joystick and drag-look moving the camera.

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 3: Touch book interaction (tap, glow, swipe, ✕)

#### Step 3.1: Extract castBookPick (behavior-preserving)

Read spec §3.3, then `src/presentation/render/reading/useBookPick.ts` in full.

Edit `useBookPick.ts`: extract the handler body (find-mesh → `raycaster.setFromCamera`
→ `intersectObject(mesh, false)` → `resolveBookAddress`) into
`export function castBookPick(ndc: THREE.Vector2, camera: THREE.Camera, scene: THREE.Object3D, coordinate: Coordinate): BookPick | null`.
The existing hook calls `castBookPick(new Vector2(0, 0), …)` — identical behavior, all
gates stay in the hook.

Create `tests/unit/presentation/render/reading/book-pick.spec.ts` per §6 (build a
minimal scene with two instanced meshes, only one flagged `dn===0 && dfloor===0`; ray
toward the neighbor mesh returns null — INV-B1 pinned through the refactor).

Tools to use: Read, Edit, Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`

#### Step 3.2: useBookTapPick

Read spec §3.3, §4.1.

Create `src/presentation/render/reading/useBookTapPick.ts`, modeled on `useBookPick`:

- Attaches pointer listeners to the **canvas element** (`gl.domElement` via `useThree`),
  not `document` (structural hit-exclusion, §4.3).
- Collects a `TouchTracePoint[]` per pointer; on pointer-up, `classifyTouch(trace)`;
  only 'tap' proceeds.
- Gates (all required): `document.pointerLockElement === null`; `isTouchPrimary()`;
  splash hidden (accept an `enabled()`-style callback prop from WorldScene, mirroring
  useBookPick's pattern; wire the splash state through the same prop the desktop hook
  uses for reader-closed + add visibility); same floor gate (`|camera.y − EYE_HEIGHT| ≤ 0.02`);
  live coordinate present; reader closed.
- Converts tap client coords to NDC against the canvas rect:
  `((clientX − rect.left)/rect.width)*2 − 1`, `−((clientY − rect.top)/rect.height)*2 + 1`;
  calls `castBookPick`; on hit → `onPick` (same shape as useBookPick).
- Mount it inside `BookReader` alongside `useBookPick` (both always mounted; gates make
  them disjoint — M-2).

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

#### Step 3.3: Shared highlight core + proximity glow

Read spec §3.3, §3.6, §4.1, then `src/presentation/render/reading/useBookHover.ts` in full.

1. Create `src/presentation/render/reading/highlight.ts`: move the tint apply/clear
   mechanics and `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` constants out of `useBookHover.ts`
   **byte-unchanged** (`#ffcf9a`, `0.55` — verify against the source; if the source
   values differ, keep the source's). Exact-restore semantics preserved (read back base
   color, restore on clear).
2. Edit `useBookHover.ts` to consume `highlight.ts`. Zero behavioral change; the
   pointer-lock gate stays.
3. Create `src/presentation/render/reading/proximity.ts`:
   `export function nearestFacingSlot(pose: { position: THREE.Vector3; forward: THREE.Vector3 }, slots: ReadonlyArray<{ slot: number; position: THREE.Vector3 }>, opts: { maxDistance: number; minFacingDot: number }): number | null`
   — nearest slot within `maxDistance` whose direction from the camera has
   `dot(forward, dir) ≥ minFacingDot`. Pure; defaults `maxDistance = 3.2`,
   `minFacingDot = 0.35` exported as named constants (tuned on-device).
4. Create `src/presentation/render/reading/useBookProximityGlow.ts`: 12 Hz interval
   (mirror useBookHover's cadence), computes slot positions from the current room's
   mesh via the existing `slotTransform` utility, applies/clears via `highlight.ts`.
   Gates: `isTouchPrimary()`; `document.pointerLockElement === null`; reader closed;
   not pinned; on-slab; **and inert when a `?pose=` URL param is present** (reuse the
   existing pose-param parser in `src/presentation/render/debug/poses.ts`). Static
   tint — no time-driven animation of any kind.
5. Mount `useBookProximityGlow` alongside `useBookHover` in `BookReader`.

Create `tests/unit/presentation/render/reading/proximity.spec.ts` per §6.

Tools to use: Read, Edit, Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/reading`
- `git diff --exit-code -G"HIGHLIGHT_TINT|HIGHLIGHT_MIX" -- src/presentation/render/reading/useBookHover.ts || true` — then manually confirm the constants' VALUES are unchanged (moved, not modified)

##### Timeout

300000

#### Step 3.4: Reading-mode swipes and the ✕ seam

Read spec §3.3, §4.2, §4.3, then `src/presentation/render/reading/BookReader.tsx` in
full (large file — focus on the reading-mode input effect, `closeReader`, and `onPick`).

Edit `BookReader.tsx`:

- Extract the two pointer-down bodies (advance + rustle, retreat + rustle) into
  `turnNext`/`turnPrev` `useCallback`s; desktop `onPointerDown` now calls them
  (behavior identical).
- New props: `closeRef?: React.RefObject<(() => void) | null>` (populated with
  `closeReader` while `display !== null`, nulled on close/unmount) and
  `onReadingChange?: (open: boolean) => void` (called on open/close transitions).
- New reading-mode touch effect (attached only while `display !== null`, listeners on
  the canvas element): collect trace; on pointer-up, `classifySwipe(trace)`;
  'left' → `turnNext()`, 'right' → `turnPrev()`. Gates: lock-null + splash-hidden
  (same enabled callback as Step 3.2) + `isTouchPrimary()`. Reset trace on
  `pointercancel` and `visibilitychange` (no stuck half-gesture, §3.3).
- Do NOT modify the desktop reading effect's gates, the Q handler, or `closeReader`'s
  internal ordering.

Edit `WorldScene.tsx`: pass `closeRef={readerCloseRef}` and
`onReadingChange={setReadingOpen}` to `BookReader`; replace TouchControls placeholders:
`readingOpen={readingOpen}`, `onCloseReading={() => readerCloseRef.current?.()}`.

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

##### Timeout

300000

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 4: Entry, pause, and audio lifecycle

#### Step 4.1: Visibility pause seam (audio)

Read spec §3.4, §4.1, then `src/presentation/audio/audio-bus.ts` (for the BusContext
seam style) and `tests/unit/presentation/audio/audio-bus.spec.ts` (for the fake idiom).

Create `src/presentation/audio/visibility-pause.ts`:

- `export interface SuspendableContextLike { readonly state: string; suspend(): Promise<void> }`
- `export interface VisibilityDocLike { readonly visibilityState: string; addEventListener(t: 'visibilitychange', l: () => void): void; removeEventListener(t: 'visibilitychange', l: () => void): void }`
- `export function attachVisibilityPause(doc: VisibilityDocLike, ctx: SuspendableContextLike): () => void`
  — on `visibilitychange` with `visibilityState === 'hidden'` and
  `ctx.state === 'running'`: `void ctx.suspend().catch(() => {})`. Nothing on visible
  (resume is gesture-only). Returns idempotent detach.

Create `tests/unit/presentation/audio/visibility-pause.spec.ts` per §6 — note the fake
ctx type deliberately has **no** `resume` method, encoding gesture-only resume in the
type. Do NOT touch `audio-bus.spec.ts` or `audio-bus.ts`.

Tools to use: Write, Read

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/audio`
- `git diff --exit-code -- src/presentation/audio/audio-bus.ts tests/unit/presentation/audio/audio-bus.spec.ts`

#### Step 4.2: App shell + EntryOverlay touch lifecycle

Read spec §3.4, §4.2, §4.3 (visibility-vs-reader decision), then `src/app/App.tsx` and
`src/app/EntryOverlay.tsx` in full.

Edit `src/app/App.tsx`:

- Inside the **existing** audio effect (same one creating ctx/bus/emitters):
  `const detachPause = attachVisibilityPause(document, ctx)`; add `detachPause()` to
  its cleanup. Do not create a second effect for this.
- Visibility-driven locomotion pause (touch-primary only): a `visibilitychange`
  listener that on `hidden`, **iff** the reader is not open (App learns reader state —
  thread `onReadingChange` up from WorldScene via a prop callback, or lift
  `readingOpen` state to App and pass it down; choose the smaller diff given
  WorldScene's current prop surface) and locomotion not already suspended: call
  `locomotionRef.current?.suspend()` and set a `suspendedByVisibility` ref true.
- Re-entry (EntryOverlay `onEnter`): in addition to `bus.resume()`, if
  `suspendedByVisibility` is true → `locomotionRef.current?.resume()` and clear the
  flag. Never resume when the flag is false (M-6/INV-B6: the reader owns its own
  suspend/resume pairing).

Edit `src/app/EntryOverlay.tsx` (desktop path byte-identical; branch on
`isTouchPrimary()` evaluated once at mount):

- Touch path: entry tap → `onEnter()` + fade out; **no** pointer-lock request, no
  relock retry loop, no `pointerlockchange` phase transitions.
- Touch path pause: `visibilitychange → hidden` sets phase `'returned'` (splash
  visible). Splash tap → `onEnter()` + dismiss (phase `'hidden'`).
- The existing lock-driven machinery remains completely untouched for the desktop path.
- Export or thread a "splash visible" boolean (smallest option: a module-level
  callback prop `onPhaseChange`, or reuse an existing signal if one exists) so
  WorldScene's touch gates (Steps 3.2/3.4) can require splash-hidden. Read what
  exists first and pick the narrowest wiring; document the choice in the commit body.

Manual smoke (not a gate): DevTools device emulation — entering starts audio, switching
tabs pauses (splash returns), tapping resumes; opening a book then hiding + returning
leaves the book open and reading resumable.

Tools to use: Read, Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

##### Timeout

300000

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 5: Mood instruments + manual on-device acceptance

#### Step 5.1: LAN dev script

Edit `package.json`: add to scripts —
`"dev:lan": "concurrently -n vite,convex \"vite --host\" \"convex dev\""` (mirror the
existing `dev` script's exact shape). No other changes; the `dependencies` block must
show zero additions for this whole unit.

##### Verify

- `pnpm compile`
- `git diff --exit-code -- pnpm-lock.yaml`

#### Step 5.2: Mobile mood checklist

Read spec §3.6 and `docs/mood/unit-05/checklist.md` for the instrument-sheet form.

Create `docs/mood/mobile/checklist.md` with:

- **Device record**: "iPhone 13 — iOS Safari + iOS Chrome (WebKit)"; desktop reference
  machine noted separately.
- **Objective floor** (each binary):
  - [ ] Joystick renders entirely within the lower-left quadrant; never overlaps the
        center third of the frame in either orientation.
  - [ ] ✕ renders only in reading mode, corner-anchored, does not overlap the spread.
  - [ ] No HUD element occludes the shaft sightline (HUD confined to edges/corners).
  - [ ] HUD does not mount on fine-pointer devices; desktop reticle/hover behavior
        absent on touch.
  - [ ] Proximity glow inert under `?pose=N` and on fine-pointer devices.
  - [ ] `git diff` empty on: `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` values, desktop `fov: 62`
        (via `resolveFov` identity), `DEFAULT_ATMOSPHERE`, `Bulbs.tsx` values,
        `dimensions.ts`.
  - [ ] Portrait: every sightline terminates in fog or geometry — no keyhole reveal of
        horizon/sky.
  - [ ] Desktop pose re-render `?pose=1..4` @1280×720 pixel-identical to
        `docs/mood/unit-03/pose-{1..4}.png` (mechanical half of sign-off).
  - SHOULD: joystick visually recessive at rest (reduced idle opacity).
  - Evidence (not gate): observed fps via `?debug` on the device.
- **Acceptance flow** (from the brief): enter → joystick walk → drag look → stairs →
  glow → tap-open → swipe both directions → ✕ close → background/return pause cycle →
  desktop regression sweep with mouse+keyboard.
- **Sign-off block**: subjective verdict line + waiver table for any failed objective
  item.
- **Tuning log**: table to record final on-device values for `TAP_SLOP_PX`,
  `SWIPE_MIN_PX`, `SWIPE_MAX_MS`, `TOUCH_LOOK_SENSITIVITY`, `JOYSTICK_DEADZONE`,
  `PORTRAIT_FOV_MAX`, proximity `maxDistance`/`minFacingDot`.

Tools to use: Write, Read

##### Verify

- `test -f docs/mood/mobile/checklist.md`

#### Step 5.3: PAUSE — human on-device verification (Rei)

STOP. This step is a human gate — do not proceed to Phase 6 without explicit sign-off.

Print for Rei:

1. Run `pnpm dev:lan`; open the printed `Network:` URL on the iPhone 13 (same Wi-Fi).
2. Walk the acceptance flow in `docs/mood/mobile/checklist.md`; tick the objective
   floor; tune the constants in the tuning log (edit source values as directed, agent
   applies + re-verifies gate after each tuning change).
3. Re-render `?pose=1..4` at 1280×720 on the desktop reference machine and compare to
   `docs/mood/unit-03/pose-{1..4}.png` (zero diff expected).
4. Optional (SHOULD, skippable): commit portrait references `?pose=1`/`?pose=3` at
   390×844 from the desktop machine to `docs/mood/mobile/`.
5. Record verdict + any waivers in the checklist.

Known watch-items for the walkthrough (parked unless observed): spread legibility in
portrait (fixed `READ_DISTANCE`); audio death after Siri/phone-call interruption
without tab-hide; entry tap click suppression (contingency in spec §3.4/FMEA-10).

##### Verify

- `grep -qiE "sign.?off|verdict" docs/mood/mobile/checklist.md`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 6: Doctrine Review

#### Step 6.1: Review Implementation Against Doctrines

Review all code written in this spec against the doctrines that were loaded.

Check the doctrine manifest at `docs/doctrine/doctrine-manifest.yaml`. Relevant to this
spec: `render`, `traversal`, `book-reading`, `audio`, `tooling`, `mood-gate`.

For each, answer:

1. **Compliance**: Did we follow all MUST/MUST NOT rules?
   - If NO: document the violation and why it was necessary.
2. **New Patterns**: Did we discover patterns that should become doctrine?
   - Expected candidates from this unit: the touch corollary to book-reading E1
     ("touch reading input requires lock-null AND splash-not-visible"); the
     capability-gate pattern (both schemes live, disjoint by lock state); the
     ctx-level-suspend-without-widening-the-bus pattern; the FOV identity-clause
     pattern for aspect-dependent knobs.
3. **Outdated Rules**: Did we find doctrine that is wrong or outdated?
   - Candidate: book-reading doctrine's input-contract section is written as
     desktop-absolute; it should note the touch corollary rather than imply
     pointer-lock is the only gate.
4. **Missing Coverage**: Did we encounter scenarios doctrine doesn't address?
   - Candidates: visibilitychange as a pause signal (no doctrine owns app lifecycle);
     mobile mood instruments (mood-gate assumes the desktop capture rig).

If ANY amendments are needed, create `docs/tasks/ongoing/mobile/doctrine-amendments.md`:

```markdown
# Doctrine Amendments: mobile

## Compliance Violations

- [doctrine]: [rule violated] - [justification]

## New Patterns to Add

- [doctrine]: [pattern] - [rationale]

## Outdated Rules to Update

- [doctrine]: [current rule] → [proposed update]

## Missing Coverage

- [doctrine]: [scenario not covered]
```

If no amendments needed, this step passes automatically.

##### Verify

- `test -f docs/tasks/ongoing/mobile/doctrine-amendments.md && echo "Amendments documented" || echo "No amendments needed"`

#### Step 6.2: Commit Doctrine Amendments (if any)

If `doctrine-amendments.md` exists, stage it for human review:

```bash
mkdir -p docs/tasks/ongoing/doctrine-updates
cp docs/tasks/ongoing/mobile/doctrine-amendments.md \
   docs/tasks/ongoing/doctrine-updates/mobile-amendments.md
```

##### Verify

- `ls docs/tasks/ongoing/doctrine-updates/ 2>/dev/null || echo "No doctrine updates pending"`

---

## 9. Operational Queries

Client-side unit — audits are shell greps (expected output noted per command).

### Frozen-seam audit (expected: no output = pass)

```bash
# M-5: LocomotionHandle not widened (exactly suspend/resume/state)
grep -n "interface LocomotionHandle" -A 8 src/presentation/render/player/LocomotionController.tsx

# M-4: touch modules never touch traversal internals or the camera
grep -rn "crossThreshold\|traversalRef\|trackerRef\|camera\.rotation\|camera\.position" \
  src/presentation/render/hud/ src/presentation/input/ src/presentation/render/player/touch-input.ts

# M-3: no speed multiplier above WALK_SPEED introduced
grep -rn "WALK_SPEED\s*\*" src/presentation/render/player/ | grep -v "min(1"

# M-10: no new runtime deps
git diff main -- package.json | grep '^+' | grep -v dev:lan | grep -v '^+++'
```

### Invariant audit (expected: listed occurrences only)

```bash
# M-2: every touch handler carries the lock-null gate
grep -rn "pointerLockElement === null" src/presentation/render/reading/ src/presentation/render/hud/

# M-8: proximity glow pose-inertness present
grep -n "pose" src/presentation/render/reading/useBookProximityGlow.ts

# M-7: exactly one ctx.suspend site, inside visibility-pause
grep -rn "\.suspend()" src/presentation/audio/ src/app/
```

---

## 10. Spec Completeness Checklist

### Semantic Completeness

- [x] All data structures fully defined (no `...`) — §4.1 types
- [x] All terms defined or linked — doctrines + brief linked
- [x] All state machines exhaustive — no new state machines (frozen `reader-state.ts` reused; entry-overlay phase reuse documented)
- [x] Nullability explicit — optional fields marked `?` with absent-semantics stated

### Verification Completeness

- [x] Each phase has executable verification (substrate.yaml gate)
- [x] All invariants have audit commands (§9)
- [x] Success criteria are binary (§1.3)

### Recovery Completeness

- [x] FMEA table present (§7)
- [x] Idempotency guaranteed (additive file writes; anchored edits)
- [x] Rollback procedures defined (per-phase git revert; no persisted state)

### Context Completeness

- [x] Brief linked (header)
- [x] Decision rationale captured (§4.3)
- [x] Change log present (§11)

### Boundary Completeness

- [x] Scope table present (§2)
- [x] Auth requirements explicit (none — client-side)
- [x] External dependencies listed (none added)

---

### Post-execution notes

Execution session 2026-07-05 (commits `f7af5e7..8b4875f`). Phases 1–5 mechanical
steps green; **paused at Step 5.3** (Rei's on-device walkthrough) — Phase 6
doctrine review and the archive move are pending. Deviations from the letter of
the spec:

1. **Step 2.2 "look region" is canvas-attached, not a DOM overlay.** The spec
   conflicts internally: §3's diagram and the §4.3 hit-exclusion insight put
   look-drag on the canvas element (world touch surface), while Step 2.2
   describes a viewport-covering DOM region — which would structurally swallow
   the canvas-attached tap-pick of Step 3.2. Resolved in favor of the canvas;
   `TouchControls` owns the listeners' lifecycle but binds them to the canvas
   element (commit `c34b8cf`).
2. **Splash gate is structural, not threaded state.** Step 4.2 delegated the
   wiring choice; the narrowest is zero wiring — while the entry/pause splash
   is visible it covers the canvas (zIndex 1000, pointer-events auto), so no
   touch reaches the canvas-attached handlers. During the 1.6 s entry fade the
   gates are open, matching desktop's post-lock fade semantics.
3. **`isTouchPrimary` guards missing `matchMedia`** (not just missing
   `window`) — jsdom mounts App without matchMedia; caught by the existing
   world-scene smoke test.
4. **`joystickVector` normalizes `-0` to `+0`** so the hard-deadzone
   "exact zero" contract holds under `Object.is`.
5. **Commit cadence**: per-phase signing was blocked by a locked 1Password
   agent at every gate; phases landed as a batch afterwards with per-phase
   boundaries preserved by file grouping (shared files landed with the phase
   completing their seam: `WorldScene`/`BookReader` in phase 3, `App`/
   `EntryOverlay` in phase 4 — every commit compiles standalone).

## 11. Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-07-05 | Initial specification. Architect defaults chosen (user delegated): analog joystick magnitude scales walk speed via optional `LocomotionInput.analog` (vs boolean quantization); FOV module at `player/fov.ts` as `resolveFov` with `PORTRAIT_FOV_MAX = 85` initial (on-device tunable); audio suspend at ctx level in App.tsx (frozen bus untouched); visibility pause guards on reader-open via `suspendedByVisibility` flag; gesture constants (`TAP_SLOP_PX = 12`, `SWIPE_MIN_PX = 48`, `SWIPE_MAX_MS = 500`, `TOUCH_LOOK_SENSITIVITY = 0.0045`, `JOYSTICK_DEADZONE = 0.15`) initial values tuned on-device in Phase 5; `visibility-pause.ts` homed in `src/presentation/audio/`; ✕ seam as `closeRef` + `onReadingChange` props; pause splash reuses EntryOverlay's `'returned'` phase; portrait reference captures optional at 390×844; iOS `interrupted`-without-visibilitychange and portrait `READ_DISTANCE` legibility parked as watch-items in Step 5.3. |
