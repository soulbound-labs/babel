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
- `docs/doctrine/render-doctrine.md` — the presentation/render layer: R3F+three Lane A, the frozen
  seams (dimensions, book-slot mapping, camera suspend/resume, atmosphere/mirror hooks), deterministic
  presentation, the perf budget, analytic collision. Read before touching `src/presentation/render/**`.
- `docs/doctrine/traversal-doctrine.md` — the coordinate-driven world: the constant 11-room working
  set, the traversal machine (the move log IS the coordinate), synchronous same-frame floating-origin
  re-base via the `rebaseRef` callback, streaming + shaft phase-lock, and the ±64 soft-stop edge. Read
  before touching `src/presentation/traversal/**` or `src/presentation/render/world/**`.
- `docs/doctrine/audio-doctrine.md` — the N-emitter `AudioBus`: frozen handle-based API, the narrow
  `BusContext` test seam, procedural ambient, entry-gesture resume, and the Web Audio lifecycle
  gotchas. Read before touching `src/presentation/audio/**` or debugging silence.
- `docs/doctrine/book-reading-doctrine.md` — the book hero moment: troika SDF glyphs on vellum via
  drei, the parallel spread reveal, the spine-pivot bend the type rides, the
  reading-mode-under-`suspend()` seam, and the pointer-lock input contract (Q closes, Esc pauses).
  Read before touching `src/presentation/render/reading/**` or the vendored reading font.
- `docs/doctrine/mobile-doctrine.md` — the additive touch scheme: capability-gated DOM HUD, pure
  gesture classifiers, the analog `LocomotionInput` seam, the glow-as-affordance tap contract,
  canvas-attached world handlers (structural hit-exclusion), and `visibilitychange` as the touch
  pause signal — desktop byte-identical, schemes disjoint by lock state. Read before touching
  `src/presentation/input/**`, `src/presentation/render/hud/**`, or anything that fires on a
  coarse pointer.
- `docs/doctrine/mood-gate-doctrine.md` — pinning subjective quality: deterministic poses + committed
  reference captures + objective checklist floor, the human as instrument, and the re-render-and-compare
  regression protocol. Read before changing anything that touches light, fog, or materials.

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
