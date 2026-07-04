---
type: is
id: is-01kwmwjjgmqxztd2n4epvg45q6
title: Enforcement doctrine understates the stale-element false-green failure mode
kind: chore
status: open
priority: 2
version: 1
spec_path: docs/tasks/completed/09-layer-consolidation/09-layer-consolidation-spec.md
labels:
  - doctrine-amendment
  - synthesis
dependencies: []
created_at: 2026-07-03T21:01:25.395Z
updated_at: 2026-07-03T21:01:25.395Z
---
---
type: doctrine-amendment
status: queued
originating-spec: docs/tasks/completed/09-layer-consolidation/09-layer-consolidation-spec.md
originating-session: 2026-07-03
---

# Enforcement doctrine understates the stale-element false-green failure mode

## The current doctrine claim
docs/doctrine/architecture.md §"Enforcement (not decoration)":
> "any framework/external import from `entities` or `ports` is a lint error by
> omission — a stronger guarantee than an enumerated deny-list" and "because a lint
> rule that matches nothing is a silent false-green, we prove enforcement is live ...
> with pnpm script:verify-boundaries".

## What the session observed
The guarantee holds only while every `boundaries/elements` pattern still maps to a real
directory. This session (commit 75302a9 fixing HEAD c7d6127): a prior refactor moved
src/ to domain/{entities,ports}+presentation but left the element patterns at old paths.
Result: `eslint .` exited 0, `presentation/` was unclassified (its imports unchecked),
and `verify-boundaries` ALSO passed (its single probe still landed in a valid element).
CI was green while an entire layer sat outside §2.2. The doctrine's own "false-green"
guard covers rule-liveness for one path — NOT element-config drift.

## Options
| # | Option | Risks |
|---|--------|-------|
| A | Enable eslint-plugin-boundaries `no-unknown-files` (+ `no-unknown`) so any unclassified src file fails lint | every src file must be classified; may flag intentional scratch files |
| B | Extend verify-boundaries to assert every declared element pattern matches >=1 real path | prover grows a second responsibility; must stay zero-flaky |
| C | CI grep: fail if any `pattern:` in eslint.config.ts points at a non-existent dir | brittle string-parsing of the config; drifts from the real matcher |
| D | A+B together (defense in depth) | more moving parts to maintain |

## Considerations
A fails closed at the moment of drift (a moved dir immediately orphans its files). B
catches the inverse (a pattern with zero files) which A misses when a dir is deleted
outright. Complementary, not redundant. The bead filed alongside this amendment
implements A+B; this amendment is about whether the DOCTRINE TEXT should promote
fail-closed-against-config-drift from an implicit assumption to a stated invariant.

## Risks of deferring
Every future rename/move of a layer can silently re-open the same false-green. The
doctrine currently reads as if `verify-boundaries` closes the false-green hole; it does
not close the element-drift hole, so a reader trusts a guarantee that isn't total.
