---
type: is
id: is-01kwrrm8cc5cegythpxcs2bdgf
title: Pre-flight commit-signing probe (locked 1Password burned every phase gate this session)
kind: chore
status: open
priority: 3
version: 1
labels: []
dependencies: []
created_at: 2026-07-05T09:09:23.979Z
updated_at: 2026-07-05T09:09:23.979Z
---
## Why now (session signal)
The entire 2026-07-05 mobile execution ran with a locked 1Password SSH agent: five signed-commit attempts failed across four phase gates ("1Password: failed to fill whole buffer"), so the per-phase commit cadence collapsed into an end-of-session batch. A 2-second probe at session start would have surfaced it before Phase 1.

## Acceptance criterion
A pre-flight exists (script or documented tbd/doctor step) that verifies commit signing works BEFORE a gated execution starts — e.g. `echo test | ssh-keygen -Y sign -n git -f <signing-key> >/dev/null 2>&1` or an equivalent `git commit --dry-run`-style probe against the configured gpg.ssh signer — and prints "unlock 1Password" on failure. Wired where an agent will actually hit it: either a `preflight` package script referenced by the parallel-execution doctrine's session-start ritual, or the SessionStart hook.

## State-transfer prompt
> Working in soulbound-labs/babel. Your task: add a commit-signing pre-flight probe per the acceptance criterion.
>
> Relevant files:
> - .git/config / global git config — gpg.format=ssh, user.signingkey (read, don't commit secrets)
> - package.json scripts — candidate home: "preflight"
> - docs/doctrine/agents-parallel-execution-doctrine.md — session-start ritual, if wiring there
>
> Relevant prior commits:
> - f7af5e7..8b4875f — the batch that should have been five per-gate commits
>
> Constraints — do NOT modify:
> - Never store or echo key material; probe only
>
> Verification commands:
> - with 1Password locked: probe exits non-zero with a clear message
> - with it unlocked: probe exits 0 silently

## Dependencies
- blocked-by: []

---
originating-spec: docs/tasks/ongoing/mobile/mobile-spec.md
originating-session: 2026-07-05
cross-repo: in-repo
effort: XS
