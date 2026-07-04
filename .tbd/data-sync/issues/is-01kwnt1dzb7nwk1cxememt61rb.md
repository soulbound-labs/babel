---
type: is
id: is-01kwnt1dzb7nwk1cxememt61rb
title: "Should LocomotionHandle expose surface mode? (parked: revisit at the next consumer)"
kind: task
status: open
priority: 3
version: 1
labels:
  - open-question
  - parked
dependencies: []
created_at: 2026-07-04T05:36:20.970Z
updated_at: 2026-07-04T05:36:20.970Z
---
## The question
Should the frozen LocomotionHandle expose surface mode ('floor' | 'stair')? Unit 05 needed the floor gate but did NOT widen the seam — it reads the held camera instead (|camera.y - EYE_HEIGHT| <= 0.02 in useBookPick.ts + BookReader.tsx), which is a heuristic tied to the slab model.

## Why parked
Only one consumer exists; the heuristic is correct under the current surface model; widening a frozen seam for one consumer contradicts the seam discipline. No doctrine claim is wrong today (recorded as note A6 in the Unit 05 amendments).

## When to revisit
The NEXT consumer that needs surface mode (Unit 06 mirror-gazing interaction, Unit 08 search UI, or any input-mode gating). At that point: widen the handle deliberately (add readonly surface) and replace both heuristic call sites, or reject and bless the heuristic in render-doctrine.

## Notes
status: parked · originating-spec: docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md · originating-session: 2026-07-04
