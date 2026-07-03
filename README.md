# Babel

_An interactive 3D implementation of the Library of Babel, true to the vision of
Jorge Luis Borges._

## Substrate — how work moves through this repo

Babel is a **substrate-governed** repository. On top of the app stack sits a small,
stack-agnostic kernel that turns intent into gated, reviewable change:

- **[AGENTS.md](./AGENTS.md)** (with `CLAUDE.md` as a symlink) — the canonical
  root context every agent reads first.
- **[substrate.yaml](./substrate.yaml)** — the _declared_ verification gate. The
  engine runs exactly these, never guesses: `compile → pnpm app:compile`,
  `test → pnpm test:unit:ci`, `lint → pnpm lint`.
- **[docs/doctrine/](./docs/doctrine/)** — the binding rules (architecture, frozen
  contracts, agent conduct), enforced by `doctrine-lint` in the pre-commit hook + CI.
- **[docs/protocol/sdd/](./docs/protocol/sdd/)** — the spec-driven-development format
  that briefs and specs follow.

### The core command lifecycle (every human developer should know)

Slash commands are run in Claude Code; the human owns the brief, the approvals, and
the merge.

1. **Write a brief** — a plain-language `docs/tasks/ongoing/<feature>/<feature>-brief.md`
   describing _what and why_ (not how).
2. **`/substrate:architect-spec <brief>`** — Socratic Q&A + per-doctrine analysis
   compose the brief into an executable, multi-phase **spec** with verification gates.
3. **`/substrate:execute <spec>`** — walks Phase → Step → Verify → Gate, **pausing at
   each phase gate for your approval**. Best run in a fresh session.
4. **`/substrate:synthesize-session`** — after execute archives the spec, captures the
   session's non-obvious learning back into doctrine.

Shortcuts off the main loop:

- **`/substrate:quick-spec "<objective>"`** — small, well-scoped change: plan → implement
  → verify → commit, skipping the full architect pass.
- **`/substrate:diagnose "<error>"`** — known failure: root-cause → fix → verify the gate
  _and_ that the error no longer reproduces → commit.
- **`/substrate:add-doctrine <name>`** — grow the rulebook when a new area needs governance.

Every path ends the same way: the `substrate.yaml` gate must be **green**, and the
pre-commit hook re-runs `doctrine-lint` before any commit lands.

## Vision

Babel is a deterministic **Library of Babel** rendered as a flat-screen 3D art
piece. Every book, every page, every line of glyphs is a **pure function of a
ℤ² lattice coordinate** `(n, floor)` — path-independent, identical for every
visitor, computed on the fly with **no server round-trip and no LLM**. Two people
who walk to the same hexagon, pull the same volume, and open the same page see
the exact same text, forever.

The architecture exists to protect that determinism. The content core is plain
TypeScript + BigInt and is **structurally forbidden** from importing a rendering
engine, UI framework, or backend — enforced as a lint error that fails CI, not a
code-review convention. See [docs/doctrine/00-architecture.md](./docs/doctrine/00-architecture.md).

## Full scope

Babel is built as a dependency spine of **eight units**:

```
01 → 02 → 03 → { 04·A ∥ 04·B } → { 05·A ∥ 05·B } → 06
```

| Unit                                       | Brief                                                                                                                                                                                                                                                                          | Depends on              | Freezes / consumes (the parallel-safety contract)                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| **01** Bootstrap                           | Hexagonal-arch skeleton, all deps, unit-test harness (unit-only), Convex empty scaffold, local dev loop, CI (typecheck + lint + test + build), deploy config (Convex + Vercel), docs/doctrine, this README. Auth deferred → Unit 05·B.                                         | —                       | **Freezes:** repo + directory conventions, CI contract                                             |
| **02** Deterministic core                  | ℤ² lattice algebra (move-vectors, reduce, path-independence, SHA-256 coord hash), full address tuple, content cipher `line(addr)→[glyph;80]` + inverse, 29-char alphabet, plain TS/BigInt, bridge seam forward-declared.                                                       | 01                      | **Freezes:** `reduce()`, `hash()`, `line()`, `inverse()` — the API everything imports              |
| **03** World render (LOCKED)               | R3F Lane-A; one correct hexagon (4 book-walls, 2 free sides, vestibule, railing, 2 bulbs); mood-complete dark + basic fog; instanced shelf/book geometry; WASD + mouselook; positional-audio bus; presence interface + `PlayerState` (no-op impl); placeholder mirror surface. | 01, 02                  | **Freezes:** presence interface, `PlayerState`, audio-bus API, room-module convention, mirror hook |
| **04·A** Staircase & traversal _(hero #1)_ | Continuous spiral you walk; vertical streaming of floor ±1 in motion; deterministic up/down vestibule rule; room load/unload; floating-origin / local-frame.                                                                                                                   | 02, 03                  | **Consumes:** core API, room convention                                                            |
| **04·B** Book reading _(hero #2)_          | Click → fly → open → deterministic 3D page-turn → glyphs stream onto plain vellum via SDF atlas, fed by the cipher.                                                                                                                                                            | 02, 03                  | **Consumes:** cipher API, audio bus                                                                |
| **05·A** Atmosphere & asset pass           | PBR assets (stone / aged wood / brass), volumetric fog upgrade, two-bulb lighting w/ bloom + shadows, real-time mirror reflection (render target), infinite-shaft fake, ambient-audio polish.                                                                                  | 03 (min); best after 04 | **Consumes:** room module, mirror hook, fog hooks (rendering only — never touches core logic)      |
| **05·B** Multiplayer                       | Convex Auth (introduced here); Convex Presence; swap no-op → real presence; remote avatars; debounced 5–10 Hz + interpolation; remote positional footsteps.                                                                                                                    | 01, 03                  | **Consumes:** presence interface, `PlayerState`, audio bus                                         |
| **06** Search                              | Search UI; coordinate ↔ content-index bridge (space-filling curve / keyed bijection over the bounded-astronomical region); render out-of-box result pages (see, don't walk to).                                                                                                | 02, 03 (benefits 05·B)  | **Consumes:** cipher inverse, bridge seam                                                          |

## MVP deliverables

The MVP is the single-player art piece:

- One correctly-proportioned hexagonal gallery (4 book-walls, 2 free sides,
  vestibule, railing).
- Two dim bulbs + fog for the Borgesian mood.
- Positional audio.
- A traversable spiral **staircase** between floors (hero #1).
- **Click-to-open a book** with ciphered glyphs streaming onto plain vellum,
  deterministically derived from the coordinate (hero #2).

**Multiplayer is architected-for but descoped** from the MVP: the presence
interface and `PlayerState` seam exist from Unit 03, and Unit 05·B swaps the
no-op implementation for real Convex presence without touching the core.

## Getting started

```bash
pnpm install
cp .env.example .env.local     # then fill in VITE_CONVEX_URL after `convex dev`
pnpm dev                       # Vite + Convex together
```

`pnpm dev` serves a placeholder R3F scene with the Convex provider mounted (it
runs without a backend and logs a warning if `VITE_CONVEX_URL` is unset). Before
pushing, run the composite gate that mirrors CI:

```bash
pnpm ci:local
```

| Script                                 | Does                                               |
| -------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                             | Vite dev server + `convex dev`, concurrently       |
| `pnpm build`                           | Production build to `dist/`                        |
| `pnpm app:compile`                     | Typecheck (`tsc --noEmit`)                         |
| `pnpm lint` / `pnpm format:check`      | ESLint (incl. the dependency rule) / Prettier      |
| `pnpm verify:boundaries`               | Proves the `domain → framework` import is rejected |
| `pnpm test:unit` / `pnpm test:unit:ci` | Vitest (watch / one-shot)                          |
| `pnpm ci:local`                        | The whole-repo green gate (mirrors CI)             |

## Deployment

Two independent targets:

- **Frontend → Vercel.** `vercel.json` sets `buildCommand: pnpm build`,
  `outputDirectory: dist`, and an SPA rewrite so deep links don't 404. Set
  `VITE_CONVEX_URL` in the Vercel project env to the Convex **production** URL.
- **Backend → Convex.** `npx convex deploy` publishes the (currently empty)
  backend and prints the production URL used above.

CI (`.github/workflows/ci.yml`) validates typecheck/lint/test/build on every push
and PR. It carries **no Convex or deploy secrets** — deploys are separate.

## Architecture

- [docs/doctrine/00-architecture.md](./docs/doctrine/00-architecture.md) — the
  hexagonal layers, the dependency rule, and why the core stays pure.
- [docs/doctrine/01-frozen-contracts.md](./docs/doctrine/01-frozen-contracts.md)
  — the frozen seams every unit imports; changed only via ADR.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — pnpm, `ci:local`, branch-per-unit.
