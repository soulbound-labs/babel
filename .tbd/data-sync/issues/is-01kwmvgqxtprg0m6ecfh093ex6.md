---
type: is
id: is-01kwmvgqxtprg0m6ecfh093ex6
title: Adopt a TS eslint import-resolver for @/ cross-layer imports?
kind: task
status: open
priority: 4
version: 1
spec_path: docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md
labels:
  - open-question
  - parked
dependencies: []
created_at: 2026-07-03T20:42:56.825Z
updated_at: 2026-07-03T20:42:56.825Z
---
---
type: open-question
status: parked
originating-spec: docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md
originating-session: 2026-07-03
---

# Adopt a TS eslint import-resolver for @/ cross-layer imports?

## The question
eslint-plugin-boundaries has no import-resolver configured, so it can't classify the `@/` tsconfig alias. Unit 02 therefore mandates (spec C8) that cross-layer imports inside src/ use RELATIVE paths (`../domain`), while tests use `@/`. Should we add eslint-import-resolver-typescript so boundaries resolve `@/`, letting src/ converge on one `@/` convention everywhere?

## Why parked
No doctrine claim is at stake and no caller is currently confused — the relative-import workaround works and is documented (C8; coordinate/content doctrines). Adding a resolver is a dependency + repo-wide convention change with no urgent payoff.

## When to revisit
Next time cross-layer import churn becomes painful (a refactor moving many files across layers), or when a new src/ layer is added and relative-path ergonomics bite.
