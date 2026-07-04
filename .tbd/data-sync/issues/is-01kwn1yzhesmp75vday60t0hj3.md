---
type: is
id: is-01kwn1yzhesmp75vday60t0hj3
title: Gitignore agent browser artifacts (.playwright-mcp/)
kind: chore
status: open
priority: 3
version: 1
spec_path: docs/tasks/completed/03-world-render/03-world-render-spec.md
labels:
  - synthesis
  - devx-agent
dependencies: []
created_at: 2026-07-03T22:35:34.829Z
updated_at: 2026-07-03T22:35:34.829Z
---
## Why now (session signal)
The Playwright MCP browser wrote `.playwright-mcp/` (snapshots, console logs, screenshots) into the repo root twice during the Unit 03 mood pass; it had to be manually `rm -rf`'d before each commit to keep the tree clean.

## Acceptance criterion
`.playwright-mcp/` is listed in `.gitignore`; `git status --porcelain` stays empty after an agent browser session takes snapshots/screenshots.

## State-transfer prompt
Working in https://github.com/soulbound-labs/babel. Your task: add `.playwright-mcp/` to .gitignore so agent browser-session artifacts never show up as untracked files.
Relevant files: .gitignore.
Verification: mkdir -p .playwright-mcp && touch .playwright-mcp/x && git status --porcelain (expect empty) && rm -rf .playwright-mcp

originating-session: 2026-07-03 | effort: XS | cross-repo: in-repo
