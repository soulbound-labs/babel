---
type: is
id: is-01kwmvp1megeggfy9bn6gpvzhm
title: Realign content/coordinate doctrines to the DDD refactor paths
kind: chore
status: open
priority: 2
version: 2
spec_path: docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md
labels: []
dependencies: []
created_at: 2026-07-03T20:45:50.605Z
updated_at: 2026-07-03T20:54:00.450Z
---
---
type: chore
status: open
effort: S
blocked-by: []
originating-spec: docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md
originating-session: 2026-07-03
cross-repo: in-repo
---

# Realign content/coordinate doctrines to the DDD refactor paths

## Why now (session signal)
Immediately after the two domain doctrines were written (commit 9fcb6b0), the src
tree was refactored to a DDD layout (uncommitted WIP at synthesis time), moving the
exact paths those "source-of-truth" doctrines cite. The doctrines are now stale.

## Path mapping (old -> new)
- src/domain/content/**            -> src/domain/entities/content/**
- src/domain/coordinates/**        -> src/domain/entities/coordinates/**
- src/domain/index.ts (barrel)     -> src/domain/entities/index.ts
- src/ports/index.ts               -> src/domain/ports/index.ts
- eslint element/type names: 'domain' -> 'entities'; 'render'/'audio' -> 'presentation'
  (the @noble carve-out is now `from: { type: 'entities' }`)
- src/adapters/content/local-content-provider.ts is UNCHANGED in path (imports updated).

## Acceptance criterion
No stale path/element references remain in the doctrines or the archived spec's
post-execution notes, and doctrine-lint stays green. Concretely:
`grep -rnE "src/domain/(content|coordinates)/|src/ports/|src/domain/index\.ts|type: 'domain'|type: 'render'|type: 'audio'" docs/doctrine docs/tasks/completed/02-deterministic-core`
returns nothing, and `bash docs/scripts/doctrine-lint.sh` is ok.

## State-transfer prompt
> Working in this repo. Task: realign docs to the DDD refactor (src/domain/{entities,ports}, presentation).
> Files to edit:
> - docs/doctrine/content-doctrine.md — §5 quotes the eslint carve-out (from: domain -> entities); §9 "Where this lives" paths; barrel path; ports path.
> - docs/doctrine/coordinate-doctrine.md — §6 "Where this lives" paths; barrel; pairing path under entities/content.
> - docs/doctrine/architecture.md — the "Directory model" tree (domain/{coordinates,content} -> entities/**; ports -> domain/ports; render/audio -> presentation).
> - docs/tasks/completed/02-deterministic-core/deterministic-core-spec.md — the ### Post-execution notes block references src/ports/ and the doctrine-path note; refresh to new paths (this is the sanctioned post-exec edit; replace-in-place, do not duplicate the block).
> Ground truth for new paths: src/domain/entities/{content,coordinates}/, src/domain/entities/index.ts, src/domain/ports/index.ts, eslint.config.ts boundaries/elements (already refactored).
> Constraints — do NOT change: any doctrine's technical claims (algorithms, invariants, the golden vector); only paths + element-type names.
> Verification:
> - grep command in the acceptance criterion returns empty
> - `bash docs/scripts/doctrine-lint.sh` -> ok
> - `pnpm compile && pnpm lint` still green (sanity that the refactor itself builds)

## Notes

Living doctrines (content, coordinate) + architecture.md realigned to entities/ports/presentation paths in commit 75302a9 — their acceptance grep is now clean. REMAINING: docs/tasks/completed/02-deterministic-core/*.md (archived spec) still cite old paths. Held back deliberately — rewriting a completed/archived spec's history is a user judgment call, not an agent default. Decide: rewrite archived paths, or rescope this bead to living docs only.
