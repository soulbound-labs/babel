---
type: is
id: is-01kwnt1c93sg8m0cqevh9y3e12
title: Clamp the reading pose against room geometry (book clips shelves when opened point-blank)
kind: bug
status: open
priority: 2
version: 1
labels: []
dependencies: []
created_at: 2026-07-04T05:36:19.235Z
updated_at: 2026-07-04T05:36:19.235Z
---
## Why now (session signal)
The reading pose is camera.position + forward*READ_DISTANCE(0.4) with no geometry check (BookReader.tsx onPick). A player standing point-blank at a shelf wall opens a book INTO the shelf/wall — latent visual bug revealed but not triggered this session.

## Acceptance criterion
Opening a book while standing at minimum collision distance from any book wall never intersects the open spread (0.48 x 0.31 m) with wall/shelf geometry: either the reading rest is pulled toward the camera when the analytic distance to the facing wall is < READ_DISTANCE + page depth, or the pose is clamped along the wall normal. Verified live at a wall-adjacent stance + a unit test on the pure clamp function.

## State-transfer prompt
> Working in the babel repo. Your task: clamp the Unit 05 reading pose against room geometry per the acceptance criterion.
>
> Relevant files:
> - src/presentation/render/reading/BookReader.tsx — onPick computes the end EndpointPose
> - src/presentation/render/player/collision.ts — analytic wall half-planes (reuse, don't duplicate constants)
> - src/presentation/render/room/dimensions.ts — READ_DISTANCE, HEX_APOTHEM, SHELF_DEPTH
>
> Constraints — do NOT modify: the camera (held during reading — KDD-1); frozen seams; keep the clamp a pure exported function (node-testable).
>
> Verification: pnpm compile && pnpm test:unit:ci tests/unit/presentation/render/reading && pnpm lint; live: stand nose-to-shelf, open the book.

## Notes
originating-spec: docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md · originating-session: 2026-07-04 · cross-repo: in-repo · effort: S
