---
type: is
id: is-01kwmwy0wgt8138yde0v3hj0ns
title: "Concurrent agents in a shared working tree: guard against duplicate/half-landed refactors?"
kind: task
status: open
priority: 2
version: 1
spec_path: docs/tasks/completed/09-layer-consolidation/09-layer-consolidation-spec.md
labels:
  - synthesis
  - open-question
  - parked
dependencies: []
created_at: 2026-07-03T21:07:40.559Z
updated_at: 2026-07-03T21:07:40.559Z
---
---
id: synth-09-layer-consolidation-2026-07-03-2100-02
type: open-question
status: parked
originating-spec: docs/tasks/completed/09-layer-consolidation/09-layer-consolidation-spec.md
originating-session: 2026-07-03
---

# How should concurrent agents in one shared working tree avoid duplicate / half-landed refactors of the same paths?

## The question
This session, two agents independently executed the SAME layer-consolidation refactor in the same
working directory. One committed a half-done version (file moves without the eslint/verify-boundaries
realignment) that passed CI as a false-green; the other (this session) converged on the same design
and completed it. `agents-parallel-execution-doctrine.md` already prescribes single-writer tracker +
integration branch + file-disjoint waves — none followed here. Open: is a lightweight guard warranted
(e.g. a claim/lock on a path-set or bead before an agent starts moving files), or is the existing
doctrine sufficient and this was simply non-adherence?

## Why parked
No doctrine CLAIM is currently wrong — the parallel-execution doctrine is correct as written. This is
an adherence/tooling question with no committed acceptance criterion yet. Filing it as actionable work
would presuppose a solution not yet chosen.

## When to revisit
Next time two agents run concurrently against this repo, OR if another half-landed / false-green
refactor surfaces. If it recurs, promote to a bead against the parallel-execution doctrine.
