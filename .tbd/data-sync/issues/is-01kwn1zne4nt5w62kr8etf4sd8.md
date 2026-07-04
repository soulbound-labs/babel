---
type: is
id: is-01kwn1zne4nt5w62kr8etf4sd8
title: Does the 60 fps floor hold on a real M1-class / Iris Xe device?
kind: task
status: open
priority: 3
version: 1
spec_path: docs/tasks/completed/03-world-render/03-world-render-spec.md
labels:
  - synthesis
  - open-question
  - parked
dependencies: []
created_at: 2026-07-03T22:35:57.252Z
updated_at: 2026-07-03T22:35:57.252Z
---
## The question
The spec's perf floor (C3) is 60 fps on a mid iGPU (Apple M1 / Intel Iris Xe class). The mood-gate numbers in docs/mood/unit-03/checklist.md were measured on an Apple M3 Pro (119-121 fps, display-capped) — comfortably passing, but not on the reference class. Is the floor actually verified?

## Why parked
No mid-iGPU device was available this session. Headroom is large (7-14 draw calls of a 30 budget) so risk is low, but "probably fine" is not a measurement.

## When to revisit
Before Unit 06's beauty-pass gate (which adds asset cost on top of this baseline), or immediately when an M1-class machine is available — re-run ?pose=1..4 with ?debug and append the numbers to docs/mood/unit-03/checklist.md.

originating-session: 2026-07-03 | status: parked | type: open-question
