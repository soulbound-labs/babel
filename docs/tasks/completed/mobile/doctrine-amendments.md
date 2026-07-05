# Doctrine Amendments: mobile

Phase 6 review, 2026-07-05. Doctrines in scope: render, traversal,
book-reading, audio, tooling, mood-gate, mobile (minted at synthesis,
amended in-place during the quick-spec repair rounds — those changes are
already binding and are listed here as the record, not as proposals).

## Compliance Violations

- **mobile (M-2, as originally implemented)**: the desktop/touch gate
  disjunction was implemented as strict `=== null` / `!== null` comparisons
  against `document.pointerLockElement`. On iOS WebKit the property is
  UNDEFINED (no Pointer Lock API), inverting every gate — desktop center-ray
  pick/hover fired on every touch, touch look/swipe were dead. Fixed in
  `4716fc5` (`isPointerLocked()` in `capabilities.ts`); iOS case pinned in
  tests; doctrine updated (§1, §9). No further action.
- **mood-gate (§4, open at close)**: the re-render-and-compare pass of
  committed poses (`?pose=1..4` vs `docs/mood/unit-03/`) was NOT run before
  the unit closed — recorded as a waiver in `docs/mood/mobile/checklist.md`
  §4, with the mechanical mitigations noted there (knob `git diff` empty;
  glow and FOV structurally inert on the capture rig). Run the compare before
  the next change that borders light/fog/materials.

## New Patterns to Add

- **[book-reading, render] Normalized lock probe**: any handler gated on
  pointer-lock state MUST probe via `isPointerLocked()`
  (`src/presentation/input/capabilities.ts`, `!= null`) — never a strict null
  comparison. Rationale: iOS `undefined` inverts strict gates; jsdom returns
  `null` so no test catches it. Already binding in mobile-doctrine §1; the
  sibling doctrines should adopt the same wording where they describe the
  gate (see Outdated Rules).
- **[mobile §5, recorded] Tight targets for consequential actions**: the
  generous-hot-zone rule applies to harmless controls (joystick); actions
  with consequences (open a book) get tight, VISIBLY present targets so a
  miss falls through to a harmless gesture.
- **[mobile §6, recorded] The affordance and the action share one selector**:
  the glow's `nearestFacingSlot` output IS what the READ button opens — they
  cannot disagree by construction. Generalizes: never compute an affordance
  and its action from two different predicates.

## Outdated Rules to Update

- **book-reading §3/E1**: "All reading input is gated on
  `document.pointerLockElement !== null`" → "All desktop reading input is
  gated on the lock being HELD, probed via `isPointerLocked()` — never a
  strict null comparison (iOS has no Pointer Lock API; the property is
  undefined there). The touch corollary (lock FREE + splash hidden) lives in
  mobile-doctrine §6." The frozen contract itself (clicks turn, Q closes,
  Esc pauses) is unchanged — only the probe wording is stale.
- **book-reading (tap-to-open mention)**: any wording implying touch taps
  open books is superseded — the touch open path is the glow-driven READ
  button (mobile-doctrine §6); `useBookTapPick.ts` no longer exists.

## Missing Coverage

- **App-shell lifecycle ownership (bead babel-cg8h — RESOLVED)**: the parked
  question "which doctrine owns visibility pause / ctx suspend / splash
  phases?" is answered: **mobile-doctrine §7 owns it** (visibilitychange as
  the pause signal, ctx-level suspend with listener-lifetime ≡ ctx-lifetime,
  `suspendedByVisibility` resume-only-what-you-suspended, splash as the
  structural gate). Suggested cross-pointers when convenient: audio-doctrine
  (entry-gesture section) and book-reading (Esc-pause section) → mobile §7.
  No new doctrine needed.
- **mood-gate**: assumes the desktop capture rig is the only instrument. The
  mobile unit added a second instrument class — the on-device human
  walkthrough recorded in an instrument sheet (`docs/mood/mobile/checklist.md`)
  with device identity, tuning log, and waiver table. Consider a short
  mood-gate note blessing the pattern: device walkthroughs are ACCEPTANCE
  instruments; device screenshots are never capture references.
- **mobile §8 (added this session)**: the on-device diagnosis protocol that
  cracked round 4 — curtain build sentinel, fresh-port origin to defeat iOS
  caching, ffmpeg frame extraction of user screen recordings.
