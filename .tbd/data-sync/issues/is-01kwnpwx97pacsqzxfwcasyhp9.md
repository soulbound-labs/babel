---
type: is
id: is-01kwnpwx97pacsqzxfwcasyhp9
title: "Triage doctrine-updates queue: 04-staircase amendments (ratify in-flight doctrine changes)"
kind: chore
status: open
priority: 2
version: 1
labels:
  - unit-04
  - doctrine
dependencies: []
created_at: 2026-07-04T04:41:27.078Z
updated_at: 2026-07-04T04:41:27.078Z
---
Triage the doctrine-updates queue entry from Unit 04's Phase-8 review: docs/tasks/ongoing/doctrine-updates/04-staircase-amendments.md (canonical copy lives with the spec at docs/tasks/ongoing/04-staircase/doctrine-amendments.md — moves to docs/tasks/completed/04-staircase/ when the unit archives).

Context: unusually, most amendments were APPLIED IN-FLIGHT rather than queued —
- a712dcb: created docs/doctrine/traversal-doctrine.md (9th doctrine, manifest-registered, AGENTS.md pointer) + amended render §5 (helicoid stair inside the analytic collision model; 0.72 walk-band), audio §3–4.1 (per-room hum lifecycle, footsteps/drone, dispose-emitters-only MUST), mood-gate §2.1 (edge-fog RAMP knob + identity clause + mood-touch rule).
- 6b9ac2a (Phase 8): fixed two residual stale render-doctrine statements — §4 "all 640 books are ONE InstancedMesh" → eleven per-room 640-instance meshes (instanceId===slot PER MESH; room identity = which mesh, group userData carries roomKey/coordinate) with the 20/21-call ledger pointer; §6 "doorway leads nowhere / don't fix the blockers" gotcha → edge-only (±64) now, interior doorways connect via the neighbor's entrance throat in the CollisionContext.

Triage decisions needed from the human/doctrine owner:
1. Ratify the in-flight amendments (they're already live; this is retroactive review per agents-doctrine drift protocol). doctrine-lint is green (9 registered).
2. One PARKED observation (not queued, one data point): mood-gate doctrine §4 assumes the agent can re-render/compare captures itself; Unit 04 ran under "no browser automation — human samples visuals", handled via a deferred-capture evidence file (docs/mood/unit-04/baseline.md) with the P3 canary as attribution arbiter. If this operating mode recurs in Unit 05/06, promote it into mood-gate doctrine §4 as a named protocol.
3. After triage, delete the queue file (docs/tasks/ongoing/doctrine-updates/04-staircase-amendments.md) or mark it triaged, per whatever convention the doctrine owner sets — the queue exists for exactly this review.
