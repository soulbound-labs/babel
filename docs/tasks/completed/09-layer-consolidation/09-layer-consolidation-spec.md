# Spec — Unit 09: Layer Consolidation (6 top-level dirs → 4)

**Unit**: 09 · structural refactor · depends on nothing, blocks nothing (pure move)
**Path**: `docs/tasks/ongoing/09-layer-consolidation/09-layer-consolidation-spec.md`
**Owner**: Rei
**Doctrine touched**: `docs/doctrine/architecture.md` — this is a **doctrine change**, so it
carries a drift-evaluation record (see §"Why this is doctrine-legal", per `agents-doctrine.md`).

## Context

The `src/` tree currently has **six** top-level layers:

```
src/
├── domain/      PURE core — coordinates/ + content/   (lint-frozen)
├── ports/       interfaces only
├── adapters/    port implementations
├── render/      R3F scene
├── audio/       positional audio (empty today)
└── app/         React shell
```

Two of those are an architectural smell, not a feature:

1. **`ports/` is a top-level sibling of `domain/`.** In hexagonal/clean architecture the domain
   **owns** its port interfaces — the core declares the contract; adapters satisfy it. A top-level
   `ports` reads as if the contracts live outside the core they belong to.
2. **`render/` and `audio/` are two dirs for one concern** — the driving/presentation side — and
   their name invites the category error "render is an adapter" (it is not; see below).

Goal: **reduce top-level dirs and make each remaining one mean one thing**, without weakening the
lint-enforced dependency guarantee that keeps the domain pure.

## Objective

Collapse `src/` from six top-level dirs to **four**, by ownership:

```
src/
├── domain/         entities/  +  ports/          ← the hexagon interior (core + its contracts)
├── adapters/       driven implementations only   ← things that IMPLEMENT a port (convex, in-memory)
├── presentation/   render + audio                ← driving side: CONSUMES the domain, via ports only
└── app/            React shell / entry / providers
```

Dependency arrows after the move:

```
app  →  presentation  →  domain/ports  →  domain/entities
adapters  ─────────────────────────────────┘
```

This is a **pure structural move** — no behaviour changes, no new capability. Done = the exact same
program, fewer/clearer directories, and `pnpm ci:local` green with boundary enforcement still proven live.

## Why this is doctrine-legal (drift-evaluation record)

`architecture.md` is the binding architecture; changing it follows the drift-evaluation protocol in
`agents-doctrine.md`. The evaluation:

- **The invariant is unchanged.** "The domain core is pure — it may import nothing outward and no
  framework" is preserved verbatim. Renaming the core's folder to `entities/` and pulling `ports/`
  under `domain/` does not relax a single allow.
- **The layer count changes, the layering does not.** Arrows still point strictly inward. `presentation`
  is exactly today's `render`/`audio` merged under one honest name; `adapters` keeps its meaning.
- **The load-bearing decision — render is NOT an adapter.** Hexagonal architecture has two adapter
  kinds: _driven_ (secondary: Convex, in-memory — the domain calls out to them **through a port**;
  they implement an interface) and _driving_ (primary: render, audio, the React shell — they call
  **into** the domain and consume its output; they implement nothing). Render implements no port, so
  it is not an adapter. It is a **primary/driving** concern → its own `presentation` layer.
- **Why `presentation` is a sibling of `app`, not folded into it.** Today `render`/`audio` may import
  three.js but **not** Convex directly and **not** `app` — they must reach data through a port. `app`
  may import everything inward. Folding presentation into `app` would grant the scene `app`'s
  "import anything" rights and destroy the guarantee that _the scene talks to data only through ports,
  never touching Convex directly_ — the property that lets us render against fake ports in a test with
  no backend. A standalone `presentation` keeps that boundary. This is why the answer is **4 dirs, not 3**.

Net: fewer top-level dirs, the same enforced guarantees, one category error fixed. No invariant weakened.

## Decisions already locked (do not re-litigate)

- Target is **4 top-level dirs**: `domain/`, `adapters/`, `presentation/`, `app/`.
- **`ports/` moves inside the core** → `src/domain/ports/`.
- **The pure core is renamed** `src/domain/{coordinates,content}` → `src/domain/entities/{coordinates,content}`.
- **`render/` + `audio/` merge** → `src/presentation/` (driving layer).
- **`adapters/` stays driven-only** — it implements ports; it must never import three.js/React.
- **`presentation` reaches data only through ports** — it may import three.js + node core, but NOT
  Convex directly, NOT `adapters`, NOT `app`. (Inherits today's `render`/`audio` claw-back.)
- **The `@noble/hashes` core exception survives** unchanged (Unit 02 C1).
- Enforcement stays **lint-gated + proven live** — no downgrade to a code-review convention.

## Migration plan (ordered; intermediate states are red — verify at the end)

A rename can't stay green mid-flight; the gate is a single green `pnpm ci:local` at the finish, plus a
still-passing `verify-boundaries`.

1. **Move files** with `git mv` (preserve history):
   - `src/ports/` → `src/domain/ports/`
   - `src/domain/coordinates/`, `src/domain/content/` → `src/domain/entities/coordinates/`, `.../entities/content/`
   - `src/render/` → `src/presentation/` (and reserve `src/presentation/audio/` for the empty audio bus)
   - Decide the barrel layout: **no loose files directly under `src/domain/`** — every domain file
     lives in `entities/` or `ports/` so each is classified into exactly one boundary element. The old
     `src/domain/index.ts` becomes `src/domain/entities/index.ts` (the frozen entities barrel);
     `src/domain/ports/index.ts` is the ports barrel.
2. **Update path aliases + barrels + imports.** Alias is `@/*` → `./src/*` (tsconfig `paths`, Vite via
   `vite-tsconfig-paths`). Rewrite:
   - `@/render/…` → `@/presentation/…`
   - `@/ports` → `@/domain/ports`
   - `@/domain` → `@/domain/entities` (or keep `@/domain` as an aggregate re-export barrel — see open Q)
   - relative imports (`../../ports`, `../../domain`, `../content/…`, `../coordinates/…`) follow the moves.
3. **Update `eslint.config.ts` — `boundaries/elements`** (most-specific first, because `ports`/`entities`
   now nest under `src/domain`):
   ```ts
   { type: 'app',          pattern: 'src/app' },
   { type: 'presentation', pattern: 'src/presentation' },
   { type: 'adapters',     pattern: 'src/adapters' },
   { type: 'ports',        pattern: 'src/domain/ports' },
   { type: 'domain',       pattern: 'src/domain/entities' },
   ```
4. **Update `eslint.config.ts` — the `boundaries/dependencies` matrix.** Replace the two elements
   `render` + `audio` with the single `presentation`; keep every allow otherwise identical:
   - `domain → domain` · `ports → {domain, ports}` · `adapters → {domain, ports, adapters}`
   - `presentation → {domain, ports, presentation}`
   - `app → {domain, ports, adapters, presentation, app}`
   - external grants: `domain` keeps ONLY the `@noble/hashes` allow; `{adapters, presentation, app}`
     get `external`+`core`; the Convex claw-back moves from `{render, audio}` to `{presentation}`
     (message updated to name `presentation`).
5. **Update `scripts/verify-boundaries.ts` — the probe path.** It writes
   `src/domain/__boundaries_probe__.ts` today; after the move the `domain` element is `src/domain/entities`,
   so the probe MUST move to **`src/domain/entities/__boundaries_probe__.ts`** or it will no longer be
   classified as `domain` and the E2 proof silently changes meaning. Re-run and confirm it still rejects
   `domain → react` via `boundaries/dependencies`.
6. **Update `docs/doctrine/architecture.md`** — the layer table, the arrows block, the "Directory model"
   tree, and the enforcement prose (render/audio → presentation; ports under domain). Keep the "why the
   core stays pure" section verbatim.
7. **Grep for stragglers**: any doc/spec/comment referencing `src/render`, `src/audio`, `src/ports`,
   `@/render`, `@/ports`, `domain/coordinates`, `domain/content` at the old paths.

## Verification (acceptance)

- `pnpm ci:local` green end-to-end (`compile → lint → format:check → verify-boundaries → test → build`).
- `pnpm script:verify-boundaries` still prints `✔ boundaries enforced` — i.e. the E2 proof is live at
  the **new** probe path, not a false-green from a stale path.
- `git log --follow` on a moved file shows history preserved (used `git mv`).
- No import references the old layer paths (grep clean).
- `doctrine-lint.sh` (Gate 1) still passes — manifest paths/pointers resolve.

## Explicitly out of scope

- Any behaviour, rendering, or content change. This is a move + config + doctrine edit, nothing else.
- Introducing `audio` functionality (the dir is reserved under `presentation/`, still empty).
- Splitting or merging anything inside `domain/entities` (the frozen core's internals are untouched
  beyond their new parent path).
- Convex/backend adapter work.

## Open questions

- **Aggregate `@/domain` barrel?** Keep a thin `src/domain/index.ts` that re-exports `entities` (so
  consumers still write `@/domain`), or force explicit `@/domain/entities` / `@/domain/ports` imports?
  The latter is more honest but touches more call sites. Recommendation: **explicit**, unless the churn
  is large — decide when we see the import count.
- **`presentation/` internal layout** — flat, or keep `presentation/render/` + `presentation/audio/`
  subdirs to preserve the medium distinction within the one layer? Recommendation: subdirs, since audio
  lands later and render is already sizeable.
- **Is 4 the floor?** Confirmed yes without a smell — 3 requires giving presentation `app`'s import
  rights (loses the ports-only guarantee). Recorded here so it isn't reopened.

## Deliverable

The identical program under four top-level `src/` dirs — `domain/{entities,ports}`, `adapters/`,
`presentation/`, `app/` — with the architecture doctrine, the ESLint boundary matrix, and the E2
boundary prover all updated to match, `pnpm ci:local` green, and `domain → react` still provably rejected.

### Post-execution notes

Executed in `75302a9` (over HEAD `c7d6127`). Deviations from the plan-as-written, worth carrying forward:

1. **Convergent concurrent execution + a silent false-green.** A second agent had already performed the
   same file moves (`domain/{entities,ports}`, `presentation/`) and committed them — but left
   `eslint.config.ts` and `verify-boundaries.ts` pointing at the old paths (`src/render`, `src/ports`,
   `src/domain`, type `domain`). The migration plan assumed a single actor moving _from_ old paths;
   reality was a half-landed move whose enforcement config never caught up. This commit completed the
   enforcement + doctrine realignment the moves needed.

2. **The acceptance criterion was necessary but not sufficient.** The plan's "done = `pnpm ci:local`
   green + `verify-boundaries` prints ✔" **passed on the broken HEAD**: `eslint .` exited 0 while
   `presentation/` was entirely unclassified, and the E2 probe still landed in a valid element so it too
   passed. A green gate did not mean the boundary rule was actually enforced on the moved tree.
   Follow-ups filed this session: a bead to make boundary-config drift **fail-closed** (enable
   `no-unknown-files` + have `verify-boundaries` assert every element pattern matches a real path), and a
   `doctrine-amendment` (`babel-w3sx`) to state fail-closed-against-config-drift as an invariant.

3. **Open questions resolved during execution:** the aggregate-`@/domain`-barrel question was settled as
   **explicit** (`@/domain/entities`, `@/domain/ports`) — forced anyway, since the "no loose files under
   `src/domain/`" element rule precludes a barrel at `src/domain/index.ts`. `presentation/{render,audio}/`
   subdirs were kept as planned.
