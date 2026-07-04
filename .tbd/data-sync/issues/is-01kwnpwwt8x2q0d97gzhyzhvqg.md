---
type: is
id: is-01kwnpwwt8x2q0d97gzhyzhvqg
title: "Shaft-drone verdict: keep or DELETE (never tune up) — Rei, at the walkthrough"
kind: task
status: open
priority: 2
version: 2
labels:
  - unit-04
  - mood-gate
  - audio
dependencies:
  - type: blocks
    target: is-01kwnpwjr5q8b4b0dey87kvhcj
created_at: 2026-07-04T04:41:26.600Z
updated_at: 2026-07-04T04:41:56.095Z
---
Spec-binding rule (04-staircase spec §4.3 + Step 5.3, USER-APPROVED with a cut clause): the shaft drone is CUT-ABLE at the mood gate — "if it doesn't land, it is DELETED, not tuned up." Rei's walkthrough verdict is binary: keep or delete. There is no third option; do NOT raise gain, change filter, or otherwise tune it toward acceptance.

What it is: src/presentation/audio/shaft-drone.ts — seeded filtered-noise drone, lowpass ~100 Hz, near-threshold gain, ONE positional emitter at the current vestibule's shaft axis (stair alcove: STAIR_AXIS_X=-0.55, STAIR_AXIS_Z from stair.ts), lifecycle follows the CURRENT room only (not all 11), re-based like any emitter inside RoomStream.applyCoordinate's same-frame path.

If verdict = DELETE:
- Remove src/presentation/audio/shaft-drone.ts and its wiring in src/presentation/render/world/RoomStream.tsx (grep `drone` — creation, reposition, and the dispose in the teardown effect at ~line 369) and any App.tsx/WorldScene prop threading (grep `shaftDrone|shaft-drone|drone`).
- Remove/adjust its unit tests if any reference it (grep tests/unit/presentation/audio).
- Keep the audio-doctrine amendment honest: a712dcb documented the drone lifecycle in docs/doctrine/audio-doctrine.md — update that passage to record the cut (append, don't silently rewrite history).
- Gate: pnpm compile · pnpm test:unit:ci · pnpm lint. Record the verdict + date in docs/mood/unit-04/checklist.md §5.

If verdict = KEEP: just record `Shaft drone: keep (Rei, <date>)` in the checklist; no code change.
