# Mood-Gate Doctrine — pinning subjective quality with deterministic captures (DOCTRINE)

> **Preload when** you change anything that touches light, fog, materials, or camera
> framing — or when you design an acceptance gate for a subjective quality bar
> ("does this give chills"). Siblings: the deterministic rendering that makes this
> possible is [`render-doctrine.md`](./render-doctrine.md) §3.

## 1. The problem this solves

Babel's core quality bar is subjective: the piece lives or dies on atmosphere, and
"mood-complete" / "does this give chills" cannot be mechanized. But an unmechanized
gate rots into vibes — judged differently each time, hostage to whoever looks last,
and silently regressable by any later change. The mood gate **pins** the subjective
judgment: a human makes the call once, and determinism turns that call into a
regression reference every later unit can check against.

**The gate is the human's chills, full stop.** The machinery below doesn't replace
the human instrument — it makes the instrument's verdict reproducible.

## 2. The ritual (the template every later gate reuses)

1. **Exact poses.** `src/presentation/render/debug/poses.ts` defines exact camera
   poses (position/yaw/pitch), reachable via `?pose=N`. Pose 1 **is** the spawn pose —
   single source, never a copy. Invalid `N` is ignored (normal spawn); `?debug` shows
   the fps/draw-call HUD. Query-param-gated only — no build fork.
2. **Deterministic rendering** (no `Math.random` in presentation, no flicker — C4)
   means a pose always produces the same image. This is the load-bearing property:
   without it, captures are screenshots; with it, they are references.
3. **Live tuning with the human.** Tune only within the designated knob modules
   (this unit: `render/atmosphere/atmosphere.ts` + `render/room/Bulbs.tsx` — fog
   density/color, exposure, bulb intensity/placement, ambient floor). Geometry and
   seams are not mood knobs.
4. **On approval, lock it.** Capture every pose at 1280×720 PNG and commit to
   `docs/mood/<unit>/pose-{N}.png` with a `checklist.md` recording the checked
   objective floor, the reference-device fps and draw calls, and the sentence:
   _"These captures are the mood reference. Re-render the poses and compare before
   changing anything that touches light, fog, or materials."_
5. **A failed checklist item needs an explicit recorded waiver** from the human gate
   owner — never a silent pass.

## 3. The objective floor (so review isn't hostage to vibes)

The checklist carries the _objective_ half — for Unit 03: no visible horizon or sky
(every sightline terminates in fog or geometry); shaft depth unreadable; bulbs read
as insufficient (most of every frame in deep shadow); vestibule far end fog-eaten;
60 fps and ≤ 30 draw calls at every pose on the `?debug` HUD. The subjective half —
whether it _lands_ — belongs to the human alone. Keep the two halves separate: the
floor catches regressions a mood-blind reviewer can verify; the human catches what
the floor can't state.

## 4. The regression protocol (what the captures are FOR)

**Before changing anything that touches light, fog, or materials** — including
"unrelated" refactors of shared materials, tone mapping, or the atmosphere module —
re-render the committed poses (`?pose=N` at 1280×720) and compare against
`docs/mood/<unit>/`. Deterministic rendering makes the comparison exact: any diff is
a real change, not noise. Units 04/05/06 all build on Unit 03's mood; the captures
are how they prove they didn't silently break it. If captures are ever lost
pre-commit, re-render — determinism reproduces them exactly.

## 5. Gotchas

- **"The captures differ but the scene looks the same"** → something nondeterministic
  crept in (a `Math.random`, a time-based animation, an unlocked DPR). Fix the
  nondeterminism; do not re-bless captures until the source is found.
- **Tuning spilled outside the knob modules** → the mood pass quietly changed a frozen
  seam (geometry, slot mapping, camera contract). Revert; renegotiate the seam
  explicitly if truly needed ([`render-doctrine.md`](./render-doctrine.md) §2).
- **Gate judged on a machine unlike the reference device** → the perf floor is
  mid-iGPU (Apple M1 / Iris Xe class), not your best GPU. Record which device the
  checklist numbers came from.

## 6. Pointers

- `docs/tasks/completed/03-world-render/03-world-render-spec.md` §7.1 — the ritual's
  origin (Unit 03's four poses + checklist); Unit 05's chills gate reuses this
  mechanism per its brief.
- [`render-doctrine.md`](./render-doctrine.md) — deterministic presentation (§3) and
  the perf budget (§4) the checklist floor enforces.
