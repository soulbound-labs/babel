---
type: is
id: is-01kwnt1cy9ds45kjmz293k1b2t
title: Mechanize the INV-B5 determinism/boundary greps into ci:local (scripts/verify-determinism.ts)
kind: chore
status: open
priority: 2
version: 1
labels: []
dependencies: []
created_at: 2026-07-04T05:36:19.912Z
updated_at: 2026-07-04T05:36:19.912Z
---
## Why now (session signal)
render-doctrine §3 says no-Math.random is "enforced by grep in the unit gate", but the greps (INV-B5: Math.random under presentation, line() in useFrame, private content/** imports in src) are run ad-hoc by agents each unit. Units 03/04/05 all repeated this by hand.

## Acceptance criterion
A scripts/verify-determinism.ts (tsx, no JS — tooling doctrine) encodes the three greps and exits non-zero on any hit outside comments/specs; wired into ci:local (package.json). pnpm ci:local fails if a Math.random is introduced under src/presentation/**.

## State-transfer prompt
> Working in the babel repo. Your task: mechanize the INV-B5 determinism/boundary greps into a tsx script wired into ci:local.
>
> Relevant files:
> - scripts/verify-boundaries.ts — the pattern to mirror (tsx script + package script)
> - docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md §9 — the three canonical grep commands
> - package.json ci:local
>
> Constraints — do NOT modify: doctrine files (the doctrine claim becomes true, not reworded); no .js files (tooling doctrine).
>
> Verification: pnpm script name runs green; temporarily add a Math.random under src/presentation and confirm it fails; pnpm ci:local green after revert.

## Notes
originating-session: 2026-07-04 · cross-repo: in-repo · effort: S · type devx-agent
