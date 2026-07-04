---
type: is
id: is-01kwnpwxqfkkxywcra7j15g18c
title: Run /substrate:synthesize-session for Unit 04 (after archive)
kind: chore
status: open
priority: 2
version: 1
labels:
  - unit-04
dependencies: []
created_at: 2026-07-04T04:41:27.535Z
updated_at: 2026-07-04T04:41:27.535Z
---
Run /substrate:synthesize-session for Unit 04 AFTER the spec archives to docs/tasks/completed/04-staircase/ (blocked by the close-unit-04 bead). It is the terminal SDD phase: captures chat-only learning the spec/commit format can't carry, emits ≤5 leverage-ranked doctrine fixes, queued amendments, state-transfer beads, and parked design questions; idempotent via .substrate/synthesis-state.json.

Session learning worth feeding it (from the two execution sessions, in case the chat context is gone):
1. REFUSAL LATCH (origin.ts OriginTracker): the spec didn't cover a refused edge move leaving the player physically past a commit plane (0.35 m entrance dead-end at n=−64); the homeward re-crossing must clear WITHOUT emitting or you log a phantom inverse move. Already in traversal-doctrine §2.6 — synthesis should check nothing more is needed.
2. SAME-FRAME RE-BASE via rebaseRef callback (NOT React state): React state re-base pops (camera and world desync by a frame). LocomotionController.useFrame → rebaseRef.current(coordinate) → RoomStream.applyCoordinate moves matrices/lights/mirrors/emitters synchronously. Traversal-doctrine §2.5 has it.
3. Spec arithmetic bugs found by doing the geometry: (a) −x closet doorway (0.8 m) can't fit the 0.568 m wall segment the alcove leaves — narrowed to ~0.5 m; (b) spec's "conditional far cap" would z-fight/backface — replaced with always-cap-with-door-gap + edge-only void plug; (c) STAIR_ZONE_DEPTH blocker kept-at-edge (spec §4.2.2 wording) would make stairs unreachable at n=±64 — deleted entirely, edge far-doors block via neighbor-absence in CollisionContext.
4. HUMAN-GATE CALIBRATION: analytic collision band [0.36,0.60] = 0.24 m was narrower than the 0.56 m capsule — tests all green, geometry provably walkable, but FELT like "squeezing through a cutout". Lesson: capsule-vs-band width ratios need a floor (band ≥ capsule width?) — candidate render-doctrine §5 addition.
5. Dense near-black fog reads as a WALL, not murk — the edge ramp had to lighten fogColor (#262735) alongside density (d9ce73d). Already in mood-gate + traversal gotchas.
6. Deferred-capture mood protocol (no-browser-automation operating mode, P3 canary as attribution arbiter) — parked in doctrine-amendments.md Missing Coverage; one data point.
7. Unit 05 seam notes (spec §4.5): Unit 04's RoomStream restructure should land FIRST; Unit 05 rebases onto it; raycasts must target the CURRENT room's book mesh (per-mesh identity, neighbor books hittable through doorways).

Also: 1Password SSH signing intermittently fails for agent commits ("failed to fill whole buffer") — workflow note, maybe agent-setup doc material (docs/general/agent-setup/).
