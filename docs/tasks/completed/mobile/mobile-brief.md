# Mobile Brief

**Author**: Rei Jarram
**Date**: 2026-07-05
**Status**: Approved

---

## User Story

As a visitor on a phone,
I want to walk the library, look around, and open and read books with touch gestures,
so that the full experience is playable on mobile — not just rendered.

---

## Goal

Make the web experience playable on mobile touch devices. Desktop is a pointer-lock
FPS walker (WASD + mouselook, reticle book-pick, click/Q reading controls); none of
that input path can fire on touch. Add a parallel touch scheme that reaches feature
parity — walk, look, open a book, read it, close it — without touching the desktop
contract.

## Decisions (locked via Socratic Q&A, 2026-07-05)

### Locomotion — virtual joystick + drag-look

- Virtual joystick anchored lower-left drives walking (maps onto the existing
  `LocomotionInput` seam — analog direction is fine to quantize/scale into it).
- One-finger drag anywhere else on screen drives yaw/pitch look.
- Two simultaneous touches (joystick thumb + look thumb) must work.

### Book open — tap the book directly

- Raycast from the **tap point** (not screen center) against the current room's book
  mesh. Reuse `findCurrentRoomBookMesh` / `resolveBookAddress` and preserve the
  existing gates: current-room-only (`dn === 0 && dfloor === 0`), floor gate
  (`|camera.y − EYE_HEIGHT| ≤ 0.02`), reader closed.
- Tap-vs-drag disambiguation required: a touch that moves beyond a small slop
  threshold is a look-drag, never a pick.

### Reading mode — swipe pages, ✕ closes

- Swipe left → next spread (`advance`), swipe right → previous (`retreat`).
- Small ✕ close button in a corner → `close` + locomotion `resume()`.
- The pure functions in `reader-state.ts` are the call targets; no new state machine.
- The desktop reading contract (left/right click, Q closes, Esc = pause not close)
  is frozen doctrine and remains untouched.

### Detection — capability-based, both schemes live

- Detect coarse pointer / touch (`pointer: coarse` + `maxTouchPoints`).
- Touch controls mount when touch is the primary pointer; desktop listeners stay
  wired regardless, so hybrids (iPad + keyboard) can use either. No mode switch UI.

### Entry & pause — tap-to-enter, pause on hide

- Keep the entry curtain on mobile: a tap fires `bus.resume()` (audio autoplay
  policy still applies) and dismisses the curtain. Skip all pointer-lock
  acquisition/retry machinery on the touch path.
- `visibilitychange` (tab/app backgrounded) is the mobile pause signal and brings
  the splash back — the analog of desktop lock-loss.

### Orientation — both, tuned FOV

- Support portrait and landscape, no rotate nag.
- Tune vertical FOV in portrait so rooms don't feel like a keyhole (desktop fov 62
  is frozen for desktop; portrait-only adjustment).

### Affordance — proximity highlight

- Desktop's center-ray hover highlight has no touch equivalent. Drive the existing
  highlight machinery by proximity/facing instead: the nearest openable book in
  front of the player glows subtly. No hint text, no extra HUD.

## Constraints

- **DO NOT impact current desktop functionality.** Desktop input flow (pointer-lock
  gate, reticle pick, click/Q reading, entry/relock overlay) must be byte-for-byte
  behaviorally identical. Touch code paths must be additive and gated.
- **DO NOT make breaking changes to the rendering engine** for mobile performance.
  Rendering is already verified working on iPhone 13 Chrome; this is an input/UX
  unit, not a perf unit.
- **Frozen seams** (per render/traversal/book-reading/audio doctrines):
  - `LocomotionHandle` shape (`suspend()/resume()/state`) — no widening.
  - Single camera owned by `LocomotionController`; touch look injects into the
    existing yaw/pitch state, never a second camera.
  - `instanceId === slot` book mapping, `dimensions.ts`, room-identity-by-mesh.
  - `AudioBus` frozen API; entry gesture must still call `bus.resume()`.
- All DOM touch UI (joystick, ✕ button) must not leak `pointerdown` into the
  world-pick/reading handlers (current handlers are only safe because they gate on
  pointer lock — the touch gate needs explicit hit-exclusion).

## Considerations

- Mobile-only HUD is permitted where needed (joystick visual, ✕ close button);
  styling judgment is delegated — keep it minimal and in the world's tone.
- Prefer the existing R3F ecosystem (drei etc.) over new heavyweight deps; a
  hand-rolled joystick over a plain DOM overlay is acceptable if smaller.
- Desktop reticle/hover UI should not render on touch devices (reticle aiming is a
  pointer-lock artifact).

## References

- Doctrines: docs/doctrine/render-doctrine.md, docs/doctrine/traversal-doctrine.md,
  docs/doctrine/book-reading-doctrine.md, docs/doctrine/audio-doctrine.md
- Input layer: src/presentation/render/player/LocomotionController.tsx (WASD/mouselook,
  `LocomotionInput` seam, `LocomotionHandle`), src/presentation/render/player/locomotion.ts
- Book pick + reading: src/presentation/render/reading/useBookPick.ts,
  useBookHover.ts, BookReader.tsx, reader-state.ts
- Entry/pause overlay: src/app/EntryOverlay.tsx; app shell: src/app/App.tsx
- Scene: src/presentation/render/WorldScene.tsx (Canvas, fov 62, handle teeing)
- Audio entry gesture: src/presentation/audio/audio-bus.ts (`bus.resume()`)

## Acceptance

- Target: **iPhone (iOS Safari / iOS Chrome — shared WebKit)**. Android/tablets are
  expected to work via the capability-based design but are not acceptance-gated.
- Playable end-to-end on iPhone 13: enter (audio starts) → walk with joystick →
  look with drag → stairs traversal works → nearest book glows → tap opens it →
  swipe both directions turns spreads → ✕ closes and walking resumes →
  backgrounding the app pauses, returning re-enters cleanly.
- Desktop regression check: full existing flow unchanged with mouse + keyboard.
- Verification is manual on-device by Rei (no browser automation in this project);
  the dev server should be reachable from the phone on the local network.
