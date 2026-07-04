# Unit 05 mood baseline zero

**Date:** 2026-07-04
**Branch:** `feat/05-book-reading`, branched at `26bf00e` — the merge of Unit 04
(`feat/04-staircase`, PR #2) into `main`. The Unit 03 reference captures were
blessed at `cfcc60c` (`git log -1 docs/mood/unit-03/`); the commits between
`cfcc60c` and `26bf00e` are exactly the Unit 04 branch, whose P1–P4 identity is
guaranteed by the atmosphere identity clause (interior profile byte-identical to
`DEFAULT_ATMOSPHERE`) and whose own P1–P4 re-render was likewise deferred to
Rei's capture pass (`docs/mood/unit-04/baseline.md`, still pending).
**Reference device:** Apple M3 Pro (carried forward from Unit 03; M1-class
re-verify only if perf marginal).

## P1–P4 byte-identical: deferred to human capture pass (operator-directed)

Execution of this unit runs agent-autonomously with the explicit operator
instruction that no browser automation be used; visual verification is sampled
by the human (Rei) instead. An agent-side byte-compare of live re-renders is
therefore not performed at step 1.1. What stands in for it:

- **Code identity**: at this branch point the working tree is byte-identical to
  `main`/`26bf00e` (clean `git status`). The frozen mood knobs
  (`DEFAULT_ATMOSPHERE`, `Bulbs.tsx` values, materials) are byte-unchanged
  since `cfcc60c` (Unit 04's checklist §4 verified this mechanically), and
  presentation is deterministic by doctrine (no `Math.random`, seeded jitter
  only), so a re-render reproduces the blessed captures by construction unless
  the environment itself drifted (browser version, DPR, driver) **or** a Unit 04
  regression exists that Rei's pending Unit 04 pass would surface first.
- **Environment drift risk is carried, not hidden**: P3 remains the knob canary
  (its frustum contains no doorway or shaft). If the Phase 6.4 mood-touch pass
  shows P3 differing from `docs/mood/unit-03/pose-3.png`, the diff must FIRST
  be attributed (env drift vs. Unit 04 vs. Unit 05 regression) before any
  re-blessing, per mood-gate doctrine §5. Any P3 diff is a STOP.

**Human sampling checkpoint (Rei):** before or at the Phase 7 gate, re-render
`?pose=1..4` at 1280×720 on the M3 Pro and confirm P1–P4 match the committed
captures — this simultaneously discharges the Unit 04 and Unit 05 baselines. If
they do not match at THIS branch point, the drift source must be found before
any Unit 05 diff can be classified.
