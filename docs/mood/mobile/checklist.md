# Mobile touch controls — instrument sheet & checklist

**Status:** CLOSED 2026-07-05 at Rei's direction, after the round-4 on-device
interaction pass (see §7). Items verified by that pass or by mechanical audit
are ticked; items not individually re-walked at close carry waivers in §4.
The four-round repair history (tap-to-open → READ button; the iOS
`pointerLockElement === undefined` gate inversion) is recorded in
`docs/doctrine/mobile-doctrine.md` and the spec's Post-execution notes.

**Device (on-device pass):** iPhone 13 — iOS Safari + iOS Chrome (both WebKit).
**Desktop reference machine (captures + regression):** Apple M3 Pro — the same
rig that shot every committed reference; device screenshots are NOT references.

**Controls (touch scheme under test):** virtual joystick lower-left = walk
(magnitude = speed) · one-finger drag on the world = look · walk up to a
shelf → nearest facing book glows → **READ button (lower-right)** pulls &
opens it — canvas taps never open a book · swipe left = next page, swipe
right = previous · ✕ (top-right, reading only) = close and walk on ·
backgrounding the tab = pause splash + audio suspend; the return tap resumes.
Desktop mouse+keyboard scheme unchanged — verify side-by-side in the
regression sweep.

**How to run:** `pnpm dev:lan`, open the printed `Network:` URL on the iPhone
(same Wi-Fi). Plain http is expected and sufficient for this unit.

---

## 1. Objective floor (binary — each ticks or gets a recorded waiver in §4)

- [x] Joystick renders entirely within the lower-left quadrant; never overlaps
      the center third of the frame in either orientation. _(round-4 pass +
      screen recording, portrait)_
- [x] ✕ renders only in reading mode, corner-anchored (top-right), and does
      not overlap the open spread. _(round-4 pass + recording)_
- [x] READ renders only while a book glows and the reader is closed
      (lower-right, above the safe-area inset); it is the ONLY touch path
      that opens a book — no canvas tap or drag ever opens one. _(round-4
      pass; also pinned by jsdom tests)_
- [ ] No HUD element occludes the shaft sightline (HUD confined to
      edges/corners). _(waived — §4)_
- [x] HUD does not mount on fine-pointer devices; desktop reticle/hover
      behavior absent on touch. _(mechanical: jsdom mount tests +
      `isPointerLocked` gates; hover requires the lock, unattainable on iOS)_
- [x] Proximity glow inert under `?pose=N` and on fine-pointer devices.
      _(mechanical: structural gates in `useBookProximityGlow`)_
- [x] `git diff` empty on: `HIGHLIGHT_TINT`/`HIGHLIGHT_MIX` values, desktop
      `fov: 62` (via the `resolveFov` identity clause), `DEFAULT_ATMOSPHERE`,
      `Bulbs.tsx` values, `dimensions.ts`. _(audited at `4716fc5`)_
- [ ] Portrait: every sightline terminates in fog or geometry — no keyhole
      reveal of horizon/sky. _(waived — §4)_
- [ ] Desktop pose re-render `?pose=1..4` @ 1280×720 pixel-identical to
      `docs/mood/unit-03/pose-{1..4}.png` (the mechanical half of sign-off).
      _(waived — §4; run before the next light/fog/material change)_
- SHOULD: joystick visually recessive at rest (reduced idle opacity) —
  present (`RING_INK` at 0.65 container opacity).
- Evidence (not a gate): observed fps via `?debug` on the device: _not
  recorded_.

## 2. Acceptance flow (from the brief — walk it in order, on the device)

1. Load over LAN → tap to enter → audio starts.
2. Joystick walk around the room (half-stick = slow crawl, full = walk).
3. Drag-look a full circle; simultaneous joystick + look with two fingers.
4. Walk the stair helix up one floor and back down (joystick control through
   the tight turns).
5. Approach a shelf → the nearest facing book glows AND the READ button
   appears (lower-right); step back / face away → both retract.
6. Tap READ → the glowing book pulls, opens, glyphs stream. Then confirm the
   loop is dead: taps and drags on the world (walking, looking, near shelves)
   never open a book.
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

| Constant                   | Module                  | Initial | Final (on-device)   |
| -------------------------- | ----------------------- | ------- | ------------------- |
| `TAP_SLOP_PX`              | `input/gestures.ts`     | 12      | 12 (as-shipped)     |
| `SWIPE_MIN_PX`             | `input/gestures.ts`     | 48      | 48 (as-shipped)     |
| `SWIPE_MAX_MS`             | `input/gestures.ts`     | 500     | 500 (as-shipped)    |
| `TOUCH_LOOK_SENSITIVITY`   | `player/touch-input.ts` | 0.0045  | 0.0045 (as-shipped) |
| `JOYSTICK_DEADZONE`        | `player/touch-input.ts` | 0.15    | 0.15 (as-shipped)   |
| `PORTRAIT_FOV_MAX`         | `player/fov.ts`         | 85      | 85 (as-shipped)     |
| `PROXIMITY_MAX_DISTANCE`   | `reading/proximity.ts`  | 1.2¹    | 1.2                 |
| `PROXIMITY_MIN_FACING_DOT` | `reading/proximity.ts`  | 0.5¹    | 0.5                 |

Finals accepted implicitly by the round-4 pass (no re-tune requested);
retune on demand and update this table if any value changes.

¹ Third cut (quick-spec 2026-07-05): 3.2/0.35 lit a book from everywhere;
1.5/0.5 still glowed from SPAWN (shelf books are ~1.5–1.6 m from the room
center). 1.2/0.5 means "stepped up to this shelf, facing it" — nothing glows
from mid-room, and the READ affordance rides the glow.

## 4. Waiver table (any failed §1 item needs a row — never a silent pass)

| Item                                          | Waiver rationale                                                                                                                                                                                                                  | Date       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Shaft-sightline occlusion                     | Not individually re-walked at close (close directed by Rei after the round-4 interaction pass). HUD is corner-anchored by construction; joystick + READ both edge-bound.                                                          | 2026-07-05 |
| Portrait keyhole (fog/geometry sightlines)    | Not individually re-walked at close. Portrait FOV is clamped (`PORTRAIT_FOV_MAX = 85`) and the round-4 recording (portrait) showed no sky/horizon reveal in the frames reviewed.                                                  | 2026-07-05 |
| Desktop pose re-render compare (`?pose=1..4`) | Not run at close. Mitigations: knob `git diff` empty (`HIGHLIGHT_*`, fov 62 identity, `dimensions.ts`); glow + portrait FOV structurally inert on the capture rig. MUST run before the next change bordering light/fog/materials. | 2026-07-05 |

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

- **Mechanical (agent-verifiable):** knob `git diff` empty ✓ (audited at
  `4716fc5`); pose pixel compare WAIVED (§4) — owed before the next
  light/fog/material change.
- **Subjective (Rei, on-device):** does the library still hold its mood in the
  hand — fog, glow, hush intact at arm's length?

> Verdict: PASS — Rei, iPhone 13 (WebKit), 2026-07-05, round-4 build
> (`4716fc5`): enter without a book opening, look-drag pans, taps inert,
> glow + READ at a shelf, READ opens, swipes turn, ✕ closes, walk on.
> Confirmed "y" after the full interaction flow; unit closed at Rei's
> direction with the §4 waivers recorded.

---

Re-render the committed poses and compare before changing anything this unit
touched that borders light, fog, or materials (the shared highlight tint).
