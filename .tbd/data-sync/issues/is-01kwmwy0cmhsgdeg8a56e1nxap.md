---
type: is
id: is-01kwmwy0cmhsgdeg8a56e1nxap
title: Make boundary-config drift fail-closed (no-unknown-files + verify-boundaries element-coverage)
kind: bug
status: open
priority: 2
version: 1
spec_path: docs/tasks/completed/09-layer-consolidation/09-layer-consolidation-spec.md
labels:
  - synthesis
  - devx-agent
dependencies: []
created_at: 2026-07-03T21:07:40.051Z
updated_at: 2026-07-03T21:07:40.051Z
---
---
id: synth-09-layer-consolidation-2026-07-03-2100-01
type: bug
status: open
effort: S
blocked-by: []
originating-spec: docs/tasks/completed/09-layer-consolidation/09-layer-consolidation-spec.md
originating-session: 2026-07-03
cross-repo: in-repo
---

# Make boundary-config drift fail-closed

## Why now (session signal)
A refactor moved src/ but left eslint `boundaries/elements` at old paths; `eslint .` exited 0
with `presentation/` unclassified, and `verify-boundaries` also passed — CI green while an
entire layer sat outside §2.2 (found + fixed in 75302a9).

## Acceptance criterion
All three hold:
1. eslint.config.ts enables `boundaries/no-unknown-files` (and `boundaries/no-unknown`) as
   errors on `src/**`, so any src file not matching a declared element fails `pnpm lint`.
2. scripts/verify-boundaries.ts asserts every `boundaries/elements` pattern matches >=1 real
   path under src/, exiting non-zero with a named message if any element is orphaned.
3. Regression proof: renaming a layer dir (e.g. `git mv src/presentation src/presentation2`)
   makes `pnpm lint` OR `pnpm script:verify-boundaries` exit non-zero (both exit 0 today).

## State-transfer prompt
> Working in https://github.com/soulbound-labs/babel. Task: make hexagonal boundary-config drift
> fail-closed so a moved/renamed layer dir can never silently fall out of §2.2 enforcement while
> CI stays green.
>
> Relevant files:
> - eslint.config.ts — boundaries/elements + boundaries/dependencies; add no-unknown-files/no-unknown
> - scripts/verify-boundaries.ts — E2 prover; add element-coverage assertion (every pattern matches >=1 path)
> - docs/doctrine/architecture.md §"Enforcement (not decoration)" — the guarantee being hardened
>
> Relevant prior commits:
> - 75302a9 — realign boundary config after a stale-path false-green (the bug this prevents)
>
> Constraints — do NOT modify:
> - the domain-purity proof (entities -> react must stay rejected)
> - verify-boundaries must stay non-flaky and not add an app-runtime dependency
>
> Verification commands:
> - pnpm lint
> - pnpm script:verify-boundaries
> - (regression) git mv src/presentation src/presentation2 && pnpm lint  # expect FAIL; then revert
>
> See doctrine-amendment babel-w3sx for which mechanism(s) the doctrine text should bless.

## Dependencies
- blocked-by: []

## Notes
Complements babel-w3sx (doctrine-text amendment). `no-unknown-files` catches orphaned files at
the moment of drift; the element-coverage assertion catches a pattern that matches nothing (dir
deleted). Both cheap; ship together.
