---
type: is
id: is-01kwn1ypa0tds9r599gv0excm6
title: Fix the favicon.ico 404 logged on every page load
kind: bug
status: open
priority: 3
version: 1
spec_path: docs/tasks/completed/03-world-render/03-world-render-spec.md
labels:
  - synthesis
dependencies: []
created_at: 2026-07-03T22:35:25.373Z
updated_at: 2026-07-03T22:35:25.373Z
---
## Why now (session signal)
Every browser load during the Unit 03 mood pass logged `Failed to load resource: 404 @ /favicon.ico` — noise that obscures real console errors during manual walkthroughs.

## Acceptance criterion
Loading `pnpm dev` in a browser produces zero console errors on fresh navigation. Either a favicon exists (e.g. `public/favicon.svg` — a dark hexagon suits the piece) and `index.html` references it, or an explicit `<link rel="icon" href="data:,">` suppresses the request.

## State-transfer prompt
Working in https://github.com/soulbound-labs/babel. Your task: eliminate the favicon.ico 404 console error on page load (add a real favicon or an inline data-URI link tag).
Relevant files: index.html (Vite entry; currently no icon link).
Constraints — do NOT modify: anything under src/domain/** (frozen core).
Verification: pnpm dev + zero console errors on load; pnpm ci:local.

originating-session: 2026-07-03 | effort: XS | cross-repo: in-repo
