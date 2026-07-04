---
type: is
id: is-01kwn1zbyg6316paqyvt89vm8b
title: Split the 1.16 MB main chunk (three.js) flagged by every build
kind: task
status: open
priority: 2
version: 1
spec_path: docs/tasks/completed/03-world-render/03-world-render-spec.md
labels:
  - synthesis
  - optimisation
dependencies: []
created_at: 2026-07-03T22:35:47.535Z
updated_at: 2026-07-03T22:35:47.535Z
---
## Why now (session signal)
Unit 03 pulled three.js + R3F into the bundle: `pnpm build` now emits `dist/assets/index-*.js 1,162.97 kB (gzip 321 kB)` and warns on every build. Units 04-07 only grow this; the warning will train everyone to ignore build output.

## Acceptance criterion
`pnpm build` completes with no chunk-size warning: either three/R3F land in a separate chunk (manual chunks or dynamic import of `WorldScene`), or a deliberate, commented `chunkSizeWarningLimit` records why one chunk is acceptable. Bundle behaviour verified by loading the built app.

## State-transfer prompt
Working in https://github.com/soulbound-labs/babel. Your task: resolve the Vite chunk-size warning for the ~1.16 MB main chunk dominated by three.js — split vendor chunks or document a deliberate limit raise.
Relevant files: vite.config.ts (rolldown-vite; note codeSplitting options); src/app/main.tsx + src/presentation/render/WorldScene.tsx (the import chain that pulls three).
Relevant prior commits: b83cd28 (Unit 03 execution that introduced the three.js scene).
Constraints — do NOT modify: src/domain/** (frozen); the WorldScene component contract in App.tsx.
Verification: pnpm build (no warning); pnpm ci:local.

originating-session: 2026-07-03 | effort: S | cross-repo: in-repo
