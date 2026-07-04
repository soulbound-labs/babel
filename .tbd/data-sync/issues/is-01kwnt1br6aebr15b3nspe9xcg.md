---
type: is
id: is-01kwnt1br6aebr15b3nspe9xcg
title: "Close Unit 05: chills-gate walkthrough (Rei), P9-P12 captures, HUD perf, P1-P4 mood-touch, archive spec"
kind: task
status: open
priority: 1
version: 1
spec_path: docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md
labels: []
dependencies: []
created_at: 2026-07-04T05:36:18.693Z
updated_at: 2026-07-04T05:36:18.693Z
---
## Why now (session signal)
Unit 05 executed fully (phases 1-8, ci:local green) but the deliverable's acceptance is human-judged: the chills-gate. All machine-checkable floors are green; the human instrument items are open in docs/mood/unit-05/checklist.md.

## Acceptance criterion
docs/mood/unit-05/checklist.md complete: (1) P9-P12 captured at 1280x720 and committed as docs/mood/unit-05/pose-{9..12}.png + determinism smoke (each rendered twice, pixel-hash-equal); (2) ?debug HUD draw-calls/fps recorded (analytic: 24 interior / 25 edge, <=30) at an edge room with a book open; (3) P1-P4 re-rendered zero-diff vs docs/mood/unit-03/ (or waiver recorded); (4) objective floor checkboxes ticked; (5) "Approved by: Rei, live walkthrough, <date>" recorded (or deviations in Rei's words). Then: git mv docs/tasks/ongoing/05-book-reading docs/tasks/completed/05-book-reading, final commit, PR ready.

## State-transfer prompt
> Working in the babel repo, branch feat/05-book-reading. Your task: assist Rei's live chills-gate pass and close Unit 05 per the acceptance criterion above.
>
> Relevant files:
> - docs/mood/unit-05/checklist.md — the instrument sheet (fill it)
> - docs/mood/unit-05/baseline.md — P3 is the drift arbiter
> - src/presentation/render/debug/poses.ts — P9-P12 (?pose=9..12), GOLDEN_BOOK
> - src/presentation/render/reading/reading-light.ts + room/dimensions.ts READ_GLOW_* — the one tunable knob; record final values
>
> Relevant prior commits: db722a1..d1b2a65 (the seven Unit 05 phase commits)
>
> Constraints — do NOT modify: frozen seams (instancing, LocomotionHandle, atmosphere defaults); do not self-certify the gate.
>
> Verification: pnpm dev → ?pose=9..12 and ?debug; pnpm ci:local before the closing commit.

## Notes
Mirrors babel-oe9o (Unit 04 close). Taste feedback expected on checklist §5 reviewable defaults (blank left page, font, input scheme, cover-open swap, glyph size at READ_DISTANCE 0.4).
originating-spec: docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md · originating-session: 2026-07-04 · cross-repo: in-repo · effort: M
