# Babel — orientation for agents

> Canonical **root** agent-context. `CLAUDE.md` is a symlink to this file so Claude Code
> and cross-tool agents read one source. Read this first, then open the doctrine for the
> area you're working in.

A substrate-governed repository.

## Verification gates — declared, never assumed

This repo declares its build/test/lint gate in `substrate.yaml` (`gate: {compile, test, lint}`).
`/substrate:execute` reads and runs those; it does not guess a toolchain. If `substrate.yaml`
or its `gate` block is missing, execution aborts with an explanation — fix the file, don't probe.

## Spec & task lifecycle — ALL planning docs live under `docs/tasks/`

One home for every planning artifact — feature specs, plan docs, research briefs, spike records:
**`docs/tasks/ongoing/<slug>/` while the work is active → `git mv` the whole folder to
`docs/tasks/completed/<slug>/` when its tracking bead/epic closes.** No other location. tbd does
**not** move these files — it tracks beads in `.tbd/`, never your spec files; the move is a
deliberate manual step.

## Doctrine — the binding architecture

Every change is bound to the doctrines registered in `docs/doctrine/doctrine-manifest.yaml`
(enforced by `docs/scripts/doctrine-lint.sh`). Read before touching the matching area:

- `docs/doctrine/agents-doctrine.md` — **the doctrine on doctrines** (the meta-doctrine): authoring
  rules, the manifest as single source of truth, the two enforcement gates, and the drift-evaluation
  protocol. Read before adding/renaming any doctrine.
- `docs/doctrine/agents-parallel-execution-doctrine.md` — parallel-bead orchestration (single-writer
  tracker, integration branch + merge-on-green, file-disjoint waves, gate-before-close, two-stage
  gate, worktree hygiene). Read before running a bead DAG with subagents.
- `docs/doctrine/tooling-doctrine.md` — the no-JS toolchain: TypeScript everywhere, scripts run via
  `tsx` (never `node`), TS build/ESLint config (via `jiti`), bash reserved for the zero-dep kernel,
  and the gate declared in `substrate.yaml`. Read before adding a script, config, or dependency.
- `docs/doctrine/coordinate-doctrine.md` — the ℤ² lattice: `bigint` coordinates, the 4-move algebra
  (path-independent `reduce`), coordinate `hash` identity, and the frozen origin-centred Ulam-shell
  pairing `ℤ²↔ℕ` with exact bigint `isqrt`. Read before touching `src/domain/coordinates/**` or `pairing.ts`.
- `docs/doctrine/content-doctrine.md` — the deterministic library cipher: the `LineAddress→Glyph[80]`
  bijection over 29⁸⁰, the balanced Feistel (`M=H²`), the `@noble/hashes` boundary carve-out, the
  _impossible_ depth-entropy seam, and the frozen golden vector. Read before touching `src/domain/content/**`.

Add your own stack/domain doctrines with `/substrate:add-doctrine`; each self-registers in the manifest.

<!-- BEGIN TBD INTEGRATION format=f06 surface=agents-md -->

## tbd

This repository uses **tbd** for git-native issue tracking (beads), spec-driven
planning, and on-demand engineering guidelines.
As the agent, you operate tbd on the user’s behalf: translate their requests into tbd
actions rather than telling them to run commands.

- Run `tbd prime` to load current project state and the full tbd workflow.
- Run `tbd skill` for the complete reusable tbd skill instructions.
- Run `tbd shortcut --list` and `tbd guidelines --list` for on-demand resources.
- Track all work as beads: `tbd create`, `tbd ready`, `tbd close`, and `tbd sync`.

<!-- END TBD INTEGRATION -->
