# Mobile touch controls — instrument sheet & checklist

**Status:** prepared for Rei's on-device walkthrough (mobile spec Phase 5, Step
5.3). Everything mechanical is derived or agent-verifiable; **the on-device
walk, the tuning-log values, and the subjective verdict are Rei's to record
live** — this file is the instrument sheet.

**Device (on-device pass):** iPhone 13 — iOS Safari + iOS Chrome (both WebKit).
**Desktop reference machine (captures + regression):** Apple M3 Pro — the same
rig that shot every committed reference; device screenshots are NOT references.

**Controls (touch scheme under test):** virtual joystick lower-left = walk
(magnitude = speed) · one-finger drag on the world = look · tap a nearby
glowing book = pull & open · swipe left = next page, swipe right = previous ·
✕ (top-right, reading only) = close and walk on · backgrounding the tab =
pause splash + audio suspend; the return tap resumes. Desktop mouse+keyboard
scheme unchanged — verify side-by-side in the regression sweep.

**How to run:** `pnpm dev:lan`, open the printed `Network:` URL on the iPhone
(same Wi-Fi). Plain http is expected and sufficient for this unit.

---

## 1. Objective floor (binary — each ticks or gets a recorded waiver in §4)

- [ ] Joystick renders entirely within the lower-left quadrant; never overlaps
      the center third of the frame in either orientation.
- [ ] ✕ renders only in reading mode, corner-anchored (top-right), and does
      not overlap the open spread.
- [ ] No HUD element occludes the shaft sightline (HUD confined to
      edges/corners).
- [ ] HUD does not mount on fine-pointer devices; desktop reticle/hover
      behavior absent on touch.
- [ ] Proximity glow inert under `?pose=N` and on fine-pointer devices.
- [ ] `git diff` empty on: `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` values, desktop
      `fov: 62` (via the `resolveFov` identity clause), `DEFAULT_ATMOSPHERE`,
      `Bulbs.tsx` values, `dimensions.ts`.
- [ ] Portrait: every sightline terminates in fog or geometry — no keyhole
      reveal of horizon/sky.
- [ ] Desktop pose re-render `?pose=1..4` @ 1280×720 pixel-identical to
      `docs/mood/unit-03/pose-{1..4}.png` (the mechanical half of sign-off).
- SHOULD: joystick visually recessive at rest (reduced idle opacity).
- Evidence (not a gate): observed fps via `?debug` on the device: _pending_.

## 2. Acceptance flow (from the brief — walk it in order, on the device)

1. Load over LAN → tap to enter → audio starts.
2. Joystick walk around the room (half-stick = slow crawl, full = walk).
3. Drag-look a full circle; simultaneous joystick + look with two fingers.
4. Walk the stair helix up one floor and back down (joystick control through
   the tight turns).
5. Approach a shelf → the nearest facing book glows.
6. Tap the glowing book → it pulls, opens, glyphs stream.
7. Swipe left (next page) and swipe right (previous) — turns animate on the
   machine clock, refused mid-stream without feedback.
8. ✕ closes the book — walking resumes exactly where it was.
9. Background the tab (home screen) mid-walk → return: splash is up, audio
   silent; tap → both resume. Repeat with a book OPEN: the book stays open,
   reading resumes, walking stays suspended under it.
10. Desktop regression sweep on the reference machine: mouse+keyboard walk,
    reticle hover, click-open, click/right-click turns, Q close, Esc pause —
    all byte-familiar.

## 3. Tuning log (record finals; agent applies source edits + re-runs the gate)

| Constant                   | Module                  | Initial | Final (on-device) |
| -------------------------- | ----------------------- | ------- | ----------------- |
| `TAP_SLOP_PX`              | `input/gestures.ts`     | 12      | _pending_         |
| `SWIPE_MIN_PX`             | `input/gestures.ts`     | 48      | _pending_         |
| `SWIPE_MAX_MS`             | `input/gestures.ts`     | 500     | _pending_         |
| `TOUCH_LOOK_SENSITIVITY`   | `player/touch-input.ts` | 0.0045  | _pending_         |
| `JOYSTICK_DEADZONE`        | `player/touch-input.ts` | 0.15    | _pending_         |
| `PORTRAIT_FOV_MAX`         | `player/fov.ts`         | 85      | _pending_         |
| `PROXIMITY_MAX_DISTANCE`   | `reading/proximity.ts`  | 3.2     | _pending_         |
| `PROXIMITY_MIN_FACING_DOT` | `reading/proximity.ts`  | 0.35    | _pending_         |

## 4. Waiver table (any failed §1 item needs a row — never a silent pass)

| Item | Waiver rationale | Date |
| ---- | ---------------- | ---- |
| —    | —                | —    |

## 5. Watch-items (parked unless observed on-device — file beads if seen)

- Spread legibility in portrait (fixed `READ_DISTANCE`): any `READ_*` change
  is a deliberate frozen-seam decision, not a quiet tweak.
- Audio death after a Siri/phone-call interruption WITHOUT a tab-hide
  (`interrupted` ctx state): candidate fix is `ctx.onstatechange` → splash;
  every tap already retries `resume()`.
- Entry tap's synthesized click suppressed on some WebKit: contingency is
  `onTouchEnd` + `preventDefault()` calling the same `enter()` exactly once
  (spec §3.4 / FMEA-10).

## 6. Optional portrait references (SHOULD — skippable)

Rendered on the DESKTOP reference machine at 390×844 (`?pose=1`, `?pose=3`),
committed as `docs/mood/mobile/pose-{1,3}-portrait.png`. Deterministic, so
they qualify as references; skip if judged too heavy.

## 7. Sign-off (two-part)

- **Mechanical (agent-verifiable):** pose pixel compare green + knob
  `git diff` empty — _pending_.
- **Subjective (Rei, on-device):** does the library still hold its mood in the
  hand — fog, glow, hush intact at arm's length?

> Verdict: _pending — Rei, on-device walkthrough, <date>_

---

Re-render the committed poses and compare before changing anything this unit
touched that borders light, fog, or materials (the shared highlight tint).
