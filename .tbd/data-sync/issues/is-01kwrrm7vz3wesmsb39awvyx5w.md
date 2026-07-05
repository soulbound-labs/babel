---
type: is
id: is-01kwrrm7vz3wesmsb39awvyx5w
title: Migrate vite-tsconfig-paths plugin to native resolve.tsconfigPaths (kills per-run deprecation noise)
kind: chore
status: open
priority: 3
version: 1
labels: []
dependencies: []
created_at: 2026-07-05T09:09:23.453Z
updated_at: 2026-07-05T09:09:23.453Z
---
## Why now (session signal)
Every vitest invocation this session printed the deprecation notice twice: "The plugin vite-tsconfig-paths is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option." Pure agent/dev noise on every gate run.

## Acceptance criterion
`pnpm test:unit:ci` and `pnpm dev` run with zero vite-tsconfig-paths deprecation output; the `vite-tsconfig-paths` devDependency is removed; `resolve.tsconfigPaths: true` (or equivalent) set in vitest.config.ts (both projects) and vite config; full gate green (pnpm compile && pnpm test:unit:ci && pnpm lint) plus pnpm build.

## State-transfer prompt
> Working in soulbound-labs/babel. Your task: replace the vite-tsconfig-paths plugin with Vite's native resolve.tsconfigPaths in vitest.config.ts (both node + jsdom projects) and any vite config using it; remove the devDependency.
>
> Relevant files:
> - vitest.config.ts — imports tsconfigPaths() in both projects
> - vite.config.ts — check for the same plugin
> - package.json — devDependencies
>
> Constraints — do NOT modify:
> - tsconfig path aliases themselves (@/ must keep resolving in src + tests)
>
> Verification commands:
> - pnpm compile && pnpm test:unit:ci && pnpm lint && pnpm build
> - pnpm test:unit:ci 2>&1 | grep -c "vite-tsconfig-paths"  # expect 0

## Dependencies
- blocked-by: []

---
originating-spec: docs/tasks/ongoing/mobile/mobile-spec.md
originating-session: 2026-07-05
cross-repo: in-repo
effort: XS
