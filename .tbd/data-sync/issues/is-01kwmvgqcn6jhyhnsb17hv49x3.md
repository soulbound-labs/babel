---
type: is
id: is-01kwmvgqcn6jhyhnsb17hv49x3
title: Enforce domain coverage >=95% in ci:local
kind: bug
status: open
priority: 1
version: 1
spec_path: docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md
labels: []
dependencies: []
created_at: 2026-07-03T20:42:56.276Z
updated_at: 2026-07-03T20:42:56.276Z
---
---
type: bug
status: open
effort: S
blocked-by: []
originating-spec: docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md
originating-session: 2026-07-03
cross-repo: in-repo
---

# Enforce domain coverage >=95% in ci:local

## Why now (session signal)
Unit 02 added a src/domain/** >=95% coverage threshold to vitest.config.ts, but ci:local runs test:unit:ci (plain `vitest run`, no --coverage), so the gate never fires. A regression below 95% would pass CI silently.

## Acceptance criterion
`pnpm ci:local` fails when src/domain/** coverage drops below 95% on statements/branches/functions/lines. Verify by stashing an edge-case test and observing a red gate, then restoring it.

## State-transfer prompt
> Working in this repo. Task: make the existing src/domain/** >=95% coverage threshold actually block CI.
> Relevant files:
> - vitest.config.ts (coverage.thresholds already set for 'src/domain/**'; provider v8; @vitest/coverage-v8 installed).
> - package.json scripts: ci:local chains compile/lint/format:check/script:verify-boundaries/test:unit:ci/build; test:unit:ci = `vitest run` (no coverage).
> Approach: add a test:coverage script (`vitest run --coverage`) and add it to the ci:local chain (or swap it in for test:unit:ci there). Keep plain `pnpm test:unit:ci` + the watch loop coverage-free for dev speed.
> Constraints — do NOT modify: the 95 threshold numbers or any src/domain source.
> Verification: `pnpm ci:local` passes at current coverage; temporarily remove an assertion in tests/unit/domain/content/edge-cases.spec.ts and confirm ci:local goes red, then restore.

## Notes
content-doctrine.md §8 documents this latent-gate gotcha.
