# Unit 04 mood baseline zero

**Date:** 2026-07-03
**Branch:** `feat/04-staircase`, branched at `cfcc60c` — the SAME commit whose
render output produced the blessed Unit 03 captures (`git log -1 docs/mood/unit-03/`
→ `cfcc60c feat: world render (#1)`). Zero render-affecting commits separate the
reference captures from this branch point.
**Reference device:** Apple M3 Pro (carried forward from Unit 03; M1-class
re-verify only if perf marginal — spec §4.4).

## P1–P4 byte-identical: deferred to human capture pass (operator-directed)

Execution of this unit is running agent-autonomously with the explicit operator
instruction that no browser automation be used; visual verification is sampled
by the human (Rei) instead. An agent-side byte-compare of live re-renders is
therefore not performed at step 1.1. What stands in for it:

- **Code identity**: the working tree at baseline is byte-identical to
  `cfcc60c` for all of `src/**` (`git status` clean under `src/` at branch
  point). The renderer input is unchanged, and presentation is deterministic
  by doctrine (no `Math.random`, seeded jitter only), so a re-render at the
  same commit reproduces the blessed captures by construction unless the
  environment itself drifted (browser version, DPR, driver).
- **Environment drift risk is carried, not hidden**: if the Phase 7 regression
  pass (Step 7.1) shows P3 — the knob canary, whose frustum contains no
  doorway or shaft — differing from `docs/mood/unit-03/pose-3.png`, the diff
  must FIRST be attributed (env drift vs. Unit 04 regression) before any
  re-blessing, per mood-gate doctrine §5. P3 is the arbiter: Unit 04 changes
  must not touch its pixels, so any P3 diff at Phase 7 is either env drift
  (present already at this baseline) or a regression — either way a STOP.

**Human sampling checkpoint (Rei):** before or at the Phase 7 gate, re-render
`?pose=1..4` at 1280×720 on the M3 Pro and confirm P1–P4 match the committed
captures. If they do not match at THIS branch point, the drift source must be
found before any Unit 04 diff can be classified.
