# Doctrine Amendments: 04-staircase

Phase 8 doctrine review, 2026-07-04. Doctrines in scope (manifest-confirmed):
`coordinate`, `render`, `audio`, `mood-gate` — plus `traversal`, which this unit
CREATED mid-flight (`a712dcb`). Unusually for this template, most amendments were
applied in-flight rather than queued: commit `a712dcb` added
`docs/doctrine/traversal-doctrine.md` (registered in the manifest, pointer in
AGENTS.md) and amended render §5 / audio §3–4.1 / mood-gate §2.1. This document
records the full review outcome, including two residual fixes applied at review
time.

## Compliance Violations

None. Mechanical evidence (2026-07-04, all commands run at review):

- `git diff cfcc60c..HEAD -- src/domain/entities/` → **empty** (frozen core untouched; T-1..T-8 upstream surface intact).
- `git diff cfcc60c..HEAD -- src/presentation/audio/audio-bus.ts` → **empty** (frozen AudioBus API; `audio-bus.spec.ts` sentinel also untouched and green).
- `git diff cfcc60c..HEAD -- room/{instancing,dimensions}.ts` → **empty** (frozen slot mapping + dimensions).
- T-8: no `moveVector`/`pairing` deep imports under `src/presentation/**` (grep clean; `origin.ts` owns its own Move→delta table); `pnpm script:verify-boundaries` green.
- T-6: the only bigint→`Number` conversion is `EdgeVeil.tsx:41`, bounded inside the ramp zone — the sanctioned pattern.
- T-7: no `JSON.stringify` on coordinates; keys are the frozen `${n}:${floor}`.
- C4: no `Math.random` under `src/presentation/**`.
- Audio lifecycle MUSTs: no new `AudioContext` outside `App.tsx`'s single effect; `RoomStream` disposes **emitters only**; no `setMasterGain` outside the bus; no per-room `resume()`.
- Mood knobs: `DEFAULT_ATMOSPHERE` values and `Bulbs.tsx` values byte-unchanged (atmosphere identity-clause + frozen-pose tests green); `Bulbs.tsx` constants gained `export` keywords only (recorded, Phase 3).
- Full gate at review: compile + 160 tests + lint + verify-boundaries green.

Spec-level deviations (user/gate-approved, not doctrine violations — recorded where they happened):

- −x closet doorway narrowed ~0.5 m (KDD-1 arithmetic left a 0.568 m wall segment; Phase 2 commit).
- Far cap rendered for ALL rooms with a door gap; edge rooms get a void plug over the gap (visual-semantics-preserving variant of the spec's conditional cap; Phase 3 commit).
- `STAIR_OUTER_R` 0.60 → 0.72, Rei-directed at the Phase-7 gate (`9cf70de`); already folded into render doctrine §5.
- Edge fog ramps `fogColor` toward `#262735` alongside density, Rei-directed (`d9ce73d`); already folded into mood-gate §2.1.

## New Patterns to Add

All captured in-flight by `a712dcb` — no queue items remain:

- **traversal (new doctrine)**: commit-plane/hysteresis convention, refusal latch, the move-log-IS-the-coordinate machine, constant 11-room set, synchronous same-frame `rebaseRef` re-base, shaft phase-lock, ±64 soft stop, `src/presentation/traversal/` module home.
- **audio**: per-room hum lifecycle riding the streaming path (KDD-5), footsteps/shaft-drone lifecycles, dispose-emitters-only MUST.
- **mood-gate**: the `atmosphereAt` positional-knob pattern (`RAMP`, identity clause) and the mood-touch rule.

## Outdated Rules to Update

Two residual stale statements found at review in `render-doctrine.md`, **applied
directly in this phase's commit** (same-PR precedent: `a712dcb`):

- §4: "all 640 books are ONE `InstancedMesh`" → eleven per-room 640-instance meshes; `instanceId === slot` holds per mesh; room identity = which mesh (group `userData`); updated ledger pointer (≈20 calls interior / 21 edge).
- §6 (gotcha): "the doorway to 'the next room' leads nowhere → don't 'fix' the blockers" → true only at the ±64 edge now; interior doorways connect via the neighbor's entrance throat in the `CollisionContext`; pointer to traversal doctrine.
- §2 (seam table narrative): Unit 05 raycast note extended with the per-mesh room-identity nuance ("a doorway raycast can legally hit a neighbor's books — target the current room's mesh explicitly").

## Missing Coverage

- None blocking. One observation for the next synthesis pass: the mood-gate
  doctrine assumes the agent can re-render/compare captures itself; this unit ran
  under an operator directive of "no browser automation — the human samples
  visuals," handled via an evidence file (`docs/mood/unit-04/baseline.md`) and
  deferred capture. If that operating mode recurs, mood-gate doctrine §4 could
  name it explicitly (deferred-capture protocol with the P3 canary as the
  attribution arbiter). Left as a note, not queued — one data point isn't a
  pattern.
