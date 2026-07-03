Reading your architect-agent skill first so I match your spec format exactly rather than inventing one.Read your architect skill — matching its format: numbered sections, machine-readable **Prompt Execution Strategy** as the final section with `Phase → Gate → Step → Verify → Timeout`, `pnpm app:compile` / `pnpm test:unit:ci` conventions, self-contained executor prompts. Since this is a greenfield bootstrap, you're right that a phased execution spec beats a prose brief. Here it is.

---

# Babel — Unit 01: Bootstrap — Technical Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: Architect (Claude) + Rei
**Date**: 2026-07-03
**Unit**: 01 of 08 · Stage 1 · _no dependencies_| Stage | Brief | Depends on | Freezes / consumes (the parallel-safety contract) |
|-------|-------|-----------|--------------------------------------------------|
| 1 | Bootstrap — substrate framework, hexagonal-arch skeleton, all deps, unit-test harness (unit-only), Convex as empty scaffold, local dev loop, CI (lint + typecheck + test), deploy (Convex + Vercel), docs/doctrine, README (vision / full scope / MVP). Auth removed → Brief 7. | — | Freezes: repo + directory conventions, CI contract |
| 2 | Deterministic core — ℤ² lattice algebra (move-vectors, reduce, path-independence, SHA-256 coord hash), full address tuple, content cipher line(addr)→[glyph;80] + inverse, 29-char alphabet, plain TS/BigInt, bridge seam forward-declared | 1 | Freezes: reduce(), hash(), line(), inverse() — the API everything imports |
| 2a | World render — single room + locomotion (LOCKED) — R3F Lane-A; one correct hexagon (4 book-walls, 2 free sides, vestibule, railing, 2 bulbs); mood-complete dark + basic fog; instanced shelf/book geometry only; WASD + mouselook; positional-audio bus (N emitters); presence interface + PlayerState (no-op impl); placeholder mirror surface | 1, 2 | Freezes: presence interface, PlayerState, audio-bus API, room-module convention, mirror hook |
| 2b | Staircase & inter-room traversal (hero #1) — continuous spiral you walk; vertical streaming of floor ±1 in motion; deterministic up/down vestibule rule; room load/unload; floating-origin/local-frame | 2, 3 | Consumes: core API, room convention |
| 3a | Book reading (hero #2) — click → fly → open → deterministic 3D page-turn → glyphs stream onto plain vellum via SDF atlas, fed by the cipher; plain glyphs | 2, 3 | Consumes: cipher API, audio bus |
| 3b | Atmosphere & asset pass — PBR assets (stone / aged wood / brass), volumetric fog upgrade, two-bulb lighting w/ bloom + shadows, real-time mirror reflection (render target), infinite-shaft fake (fog + repeat + parallax), ambient-audio polish | 3 (min); best after 4 + 5 | Consumes: room module, mirror hook, fog hooks (rendering only — cannot touch core logic) |
| 4 | Multiplayer — Convex Auth (here); Convex Presence; swap no-op → real presence; remote avatars; debounced 5–10 Hz + interpolation; remote positional footsteps | 1, 3 | Consumes: presence interface, PlayerState, audio bus |
| 5 | Search — search UI; coordinate ↔ content-index bridge (space-filling curve / keyed bijection over the bounded-astronomical region); render out-of-box result pages (see, not walk to) | 2, 3 (benefits 4) | Consumes: cipher inverse, bridge seam || Stage | Brief | Depends on | Freezes / consumes (the parallel-safety contract) |
|-------|-------|-----------|--------------------------------------------------|
| 1 | Bootstrap — substrate framework, hexagonal-arch skeleton, all deps, unit-test harness (unit-only), Convex as empty scaffold, local dev loop, CI (lint + typecheck + test), deploy (Convex + Vercel), docs/doctrine, README (vision / full scope / MVP). Auth removed → Brief 7. | — | Freezes: repo + directory conventions, CI contract |
| 2 | Deterministic core — ℤ² lattice algebra (move-vectors, reduce, path-independence, SHA-256 coord hash), full address tuple, content cipher line(addr)→[glyph;80] + inverse, 29-char alphabet, plain TS/BigInt, bridge seam forward-declared | 1 | Freezes: reduce(), hash(), line(), inverse() — the API everything imports |
| 2a | World render — single room + locomotion (LOCKED) — R3F Lane-A; one correct hexagon (4 book-walls, 2 free sides, vestibule, railing, 2 bulbs); mood-complete dark + basic fog; instanced shelf/book geometry only; WASD + mouselook; positional-audio bus (N emitters); presence interface + PlayerState (no-op impl); placeholder mirror surface | 1, 2 | Freezes: presence interface, PlayerState, audio-bus API, room-module convention, mirror hook |
| 2b | Staircase & inter-room traversal (hero #1) — continuous spiral you walk; vertical streaming of floor ±1 in motion; deterministic up/down vestibule rule; room load/unload; floating-origin/local-frame | 2, 3 | Consumes: core API, room convention |
| 3a | Book reading (hero #2) — click → fly → open → deterministic 3D page-turn → glyphs stream onto plain vellum via SDF atlas, fed by the cipher; plain glyphs | 2, 3 | Consumes: cipher API, audio bus |
| 3b | Atmosphere & asset pass — PBR assets (stone / aged wood / brass), volumetric fog upgrade, two-bulb lighting w/ bloom + shadows, real-time mirror reflection (render target), infinite-shaft fake (fog + repeat + parallax), ambient-audio polish | 3 (min); best after 4 + 5 | Consumes: room module, mirror hook, fog hooks (rendering only — cannot touch core logic) |
| 4 | Multiplayer — Convex Auth (here); Convex Presence; swap no-op → real presence; remote avatars; debounced 5–10 Hz + interpolation; remote positional footsteps | 1, 3 | Consumes: presence interface, PlayerState, audio bus |
| 5 | Search — search UI; coordinate ↔ content-index bridge (space-filling curve / keyed bijection over the bounded-astronomical region); render out-of-box result pages (see, not walk to) | 2, 3 (benefits 4) | Consumes: cipher inverse, bridge seam |
**Codename**: `babel` (package scope `@soulbound/babel`) — rename freely; only `package.json` `name` and README are affected.

---

## 1. Overview

### 1.1 Objective function

Produce a **branchable, green, deploy-ready monorepo skeleton** with an enforced hexagonal architecture, a working local dev loop, unit-test harness, CI, and doctrine docs — such that two engineers can immediately branch off and build Units 02–08 in parallel without touching each other's subsystems or inventing conventions mid-flight.

**This unit ships zero application logic.** No coordinates, no cipher, no rendering, no Convex schema. It ships the _frame_ those things will hang on, and the _enforced contracts_ that keep parallel work from colliding.

### 1.2 Series context (carried in every unit spec)

Deterministic Library of Babel as a flat-screen 3D art piece. Content is a pure function of a **ℤ² lattice coordinate** `(n, floor)` — path-independent, identical for all users, no LLM. The dependency spine is `01 → 02 → 03 → {04·A staircase ∥ 04·B books} → {05·A atmosphere ∥ 05·B multiplayer} → 06 search`. The load-bearing invariant beneath all of it: **the domain core (Unit 02) is pure and framework-free** — it must never import three.js, React, or Convex. This unit encodes that invariant as a lint rule, not a guideline.

### 1.3 Constraints

- **C1 — Package manager: `pnpm`.** All scripts and CI assume it.
- **C2 — Language: TypeScript, `strict: true`**, no implicit `any`, `noUncheckedIndexedAccess: true` (the cipher indexes fixed-width arrays; off-by-one must be a type error where possible).
- **C3 — Lane A rendering.** three.js + React Three Fiber own rendering. This unit installs them but renders only a placeholder canvas.
- **C4 — Hexagonal architecture, dependency rule enforced in lint.** `domain` imports nothing outward; `application` imports only `domain`; `adapters`/`render`/`app` may import inward but never the reverse.
- **C5 — Unit tests only for MVP.** Vitest configured; integration/e2e directories forward-declared but empty.
- **C6 — Convex present as _empty scaffold only_.** `convex/` exists, `convex dev` runs, schema is empty. No functions, no auth.
- **C7 — Versions pinned by lockfile, not by spec.** Executor installs latest stable of each dep and commits `pnpm-lock.yaml`; the spec names packages, not version numbers.

### 1.4 Explicitly out of scope (and which unit owns it)

Convex Auth → Unit 07. Convex schema/functions → first real use in 07. Any `domain` logic → Unit 02. R3F scene/room → Unit 03. Locomotion → Unit 03. CI e2e/integration jobs → post-MVP.

### 1.5 Success criteria

A fresh clone runs `pnpm install && pnpm ci:local` to green, `pnpm dev` serves a placeholder scene with Convex connected, CI passes on a PR, and the dependency-rule lint **fails** a deliberate `domain → react` import (proving enforcement is live, not decorative).

---

## 2. Architecture / Directory Model

```
babel/
├── src/
│   ├── domain/              # PURE. No framework imports. (Unit 02 fills this.)
│   │   ├── coordinates/     #   ℤ² lattice algebra          → reduce(), hash()
│   │   ├── content/         #   invertible per-line cipher  → line(), inverse()
│   │   └── index.ts         #   the FROZEN public barrel — the series' core contract
│   ├── application/
│   │   └── ports/           # interfaces only (presence, content-provider, persistence)
│   │       └── index.ts
│   ├── adapters/            # port implementations (in-memory now; Convex/three later)
│   ├── render/              # R3F scene composition (Unit 03+); placeholder canvas now
│   ├── audio/               # positional audio bus (Unit 03); empty now
│   └── app/                 # React shell + entry (main.tsx, App.tsx)
├── convex/                  # empty scaffold: schema.ts (no tables), _generated
├── tests/
│   ├── unit/                # Vitest specs (mirrors src/ layout)
│   ├── integration/         # forward-declared, empty
│   └── e2e/                 # forward-declared, empty
├── docs/
│   ├── doctrine/            # ADRs + the frozen-contract doctrine
│   └── tasks/ongoing/       # where future unit briefs/specs land
├── .github/workflows/ci.yml
├── package.json  vite.config.ts  vitest.config.ts  tsconfig.json
├── eslint.config.js  .prettierrc  .editorconfig  .gitignore
├── convex.json  vercel.json  pnpm-lock.yaml  README.md
```

### 2.1 Forward-declared contracts (defined here, implemented later)

These are stubbed in this unit so downstream units are adapter swaps, not refactors:

- **`application/ports`** — TypeScript `interface`s only, no impls:
  - `ContentProvider` → `line(address): Glyph[]` / `inverse(line): Address | null` _(Unit 02 implements)_
  - `PresencePort` → `publish(state)`, `subscribe(cb)`, with a `PlayerState` type _(Unit 03 no-op impl, Unit 07 Convex impl)_
- **`domain/index.ts`** — the frozen barrel. Empty now; its _existence and location_ are the contract every other unit imports from.

### 2.2 The dependency rule (the one thing this unit exists to enforce)

Enforced via `eslint-plugin-boundaries` (or `import/no-restricted-paths`):

| Layer              | May import                 | May NOT import                                           |
| ------------------ | -------------------------- | -------------------------------------------------------- |
| `domain`           | _(nothing outside domain)_ | application, adapters, render, app, react, three, convex |
| `application`      | domain                     | adapters, render, app, three, convex                     |
| `adapters`         | domain, application        | render, app                                              |
| `render` / `audio` | domain, application        | adapters (except via ports), app                         |
| `app`              | all                        | —                                                        |

A violating import is a **lint error** → fails CI. This is the infrastructure-enforced version of "keep the core pure," not a code-review convention.

---

## 3. Toolchain & Dependencies

**Runtime**: Node ≥ 20 LTS, pnpm ≥ 9. **Build**: Vite. **UI**: React + React DOM. **3D**: `three`, `@react-three/fiber`, `@react-three/drei`. **Backend scaffold**: `convex`. **Test**: `vitest`, `@vitest/coverage-v8`, optionally `fast-check` (property tests — Unit 02 leans on it; install now). **Quality**: `eslint` (flat config) + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-boundaries`, `prettier`. **Dev DX**: `concurrently` (run Vite + Convex together), `vite-tsconfig-paths` (import via `@/…`).

### 3.1 `package.json` scripts (canonical names — downstream specs reference these verbatim)

```jsonc
{
  "dev": "concurrently -n vite,convex \"vite\" \"convex dev\"",
  "build": "vite build",
  "app:compile": "tsc --noEmit", // typecheck gate
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test:unit": "vitest", // watch
  "test:unit:ci": "vitest run", // one-shot, takes optional <path>
  "ci:local": "pnpm app:compile && pnpm lint && pnpm format:check && pnpm test:unit:ci && pnpm build",
}
```

`ci:local` is the single composite gate that mirrors CI exactly — the whole-repo green check.

---

## 4. Error Handling & Edge Cases (bootstrap-specific)

- **E1 — Convex needs a deployment to run `convex dev`.** Executor must not block on interactive login. `convex/schema.ts` defines an empty schema; env vars (`VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`) are documented in `.env.example` and `.gitignore`'d in `.env.local`. CI does **not** run `convex dev` (no secrets in CI for this unit) — CI validates build/lint/test only.
- **E2 — Dependency-rule false-green.** Risk: the rule is configured but matches nothing. Mitigation: **ship a deliberately-failing fixture test** (`tests/unit/architecture/dependency-rule.fixture.ts.txt` — a non-compiled `.txt` documenting the forbidden import) _and_ a CI step that asserts `eslint` errors on a temporary `domain → react` import, then reverts. Enforcement must be _proven_, per §1.5.
- **E3 — `noUncheckedIndexedAccess` friction.** It will surface later in cipher/array code (intended). This unit only ensures it's on and the placeholder compiles under it.
- **E4 — Vercel + Vite SPA routing.** `vercel.json` includes SPA rewrite so deep links don't 404; documented even though there's one route now.
- **E5 — R3F placeholder must not import from `domain`.** The placeholder canvas lives in `render/` and imports nothing inward yet, so Unit 02 can't accidentally couple through it.

---

## 5. Testing Strategy

Unit-only (C5). Vitest with `environment: 'node'` for `domain`/`application` (fast, pure) and a `jsdom` project for `app`/`render` smoke tests. `tests/unit/` mirrors `src/`. Coverage configured (v8) but no threshold gate in this unit — thresholds arrive with Unit 02's real logic. One canonical passing example test ships so `test:unit:ci` is green and the pattern is copyable. `integration/` and `e2e/` exist with a `.gitkeep` and a README noting they're post-MVP.

---

## 6. Prompt Execution Strategy

Executor has **no context beyond this spec**. Each step is self-contained; paths, deps, and conventions are explicit. Run phases in order; do not proceed past a red gate.

### Phase 1: Repository & TypeScript foundation

> Gate: `pnpm install && pnpm app:compile`

#### Step 1.1: Initialize repo and pnpm workspace

Create a new git repo at project root named `babel`. Run `pnpm init`. Set `package.json` `name` to `@soulbound/babel`, `private: true`, `type: "module"`, `packageManager` to the current pnpm version, and `engines.node` `">=20"`. Add `.gitignore` covering `node_modules`, `dist`, `.env.local`, `.convex`, `convex/_generated`, coverage output, and OS/editor junk. Add `.editorconfig` (2-space indent, LF, final newline, UTF-8). Create the full directory tree from §2 with a `.gitkeep` in each empty leaf directory.

##### Verify

- `test -d src/domain/coordinates && test -d src/domain/content && test -d src/application/ports`
- `git status --porcelain | head`

##### Timeout

90000

#### Step 1.2: TypeScript strict config with path aliases

Install `typescript` and `vite-tsconfig-paths` as devDeps. Create `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ES2022"`, `jsx: "react-jsx"`, `verbatimModuleSyntax: true`, and a `paths` alias `"@/*": ["src/*"]`. Add script `"app:compile": "tsc --noEmit"`. Create `src/app/App.tsx` and `src/app/main.tsx` as minimal valid React placeholders (App returns a `<div>Babel</div>`; main is not yet wired to a DOM node — keep it compile-only) so `app:compile` has something to check.

##### Verify

- `pnpm app:compile`

##### Timeout

90000

### Phase 2: Build tooling & quality gates

> Gate: `pnpm lint && pnpm format:check && pnpm build`

#### Step 2.1: Vite + React + R3F install and config

Install `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, and dev types `@types/react`, `@types/react-dom`, `@types/three`. Create `vite.config.ts` using the React plugin and `vite-tsconfig-paths`. Create `index.html` at root with a `#root` div and a module script importing `/src/app/main.tsx`. Wire `main.tsx` to `createRoot(#root).render(<App/>)`. In `src/render/`, create `PlaceholderScene.tsx`: an R3F `<Canvas>` containing a single rotating mesh with basic lighting and dark background — it must import only `@react-three/fiber`/`drei`/`three`, nothing from `@/domain` or `@/application`. Render `PlaceholderScene` inside `App.tsx`. Add scripts `"dev"` (temporary: just `"vite"` — Convex added in Phase 4) and `"build": "vite build"`.

##### Verify

- `pnpm build`
- `pnpm app:compile`

##### Timeout

120000

#### Step 2.2: ESLint flat config + Prettier + the dependency rule

Install `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-boundaries`, `prettier`, `eslint-config-prettier`. Create `eslint.config.js` (flat config) that: applies typescript-eslint recommended + react-hooks rules to `src/**`; configures `eslint-plugin-boundaries` with element types `domain`, `application`, `adapters`, `render`, `audio`, `app` mapped to the §2 directories; and enforces the §2.2 allow/deny matrix (`domain` may import nothing outward; `application` only `domain`; etc.), erroring on violation. Disable stylistic rules that conflict with Prettier via `eslint-config-prettier`. Create `.prettierrc` (semi, single-quote, trailing commas, 100 print width) and `.prettierignore`. Add scripts `lint`, `lint:fix`, `format`, `format:check` per §3.1.

##### Verify

- `pnpm lint`
- `pnpm format:check`

##### Timeout

90000

#### Step 2.3: Prove the dependency rule is live (E2)

Add a CI-only assertion script `scripts/verify-boundaries.mjs` that: writes a temporary line `import React from 'react'` into a throwaway file under `src/domain/`, runs `eslint` on it expecting a **non-zero** exit, deletes the temp file, and exits `0` only if eslint errored. Add script `"verify:boundaries": "node scripts/verify-boundaries.mjs"`. This guarantees enforcement isn't a false-green.

##### Verify

- `pnpm verify:boundaries`

##### Timeout

90000

### Phase 3: Unit test harness

> Gate: `pnpm test:unit:ci`

#### Step 3.1: Vitest config with node + jsdom projects

Install `vitest`, `@vitest/coverage-v8`, `jsdom`, `fast-check`. Create `vitest.config.ts` defining two projects: a `node` project (`environment: 'node'`) globbing `tests/unit/{domain,application}/**` and a `jsdom` project globbing `tests/unit/{app,render}/**`. Enable v8 coverage (report only, no threshold). Add scripts `"test:unit": "vitest"` and `"test:unit:ci": "vitest run"`. Create one passing example spec `tests/unit/example.spec.ts` asserting a trivial pure function, and one `tests/unit/render/smoke.spec.tsx` that mounts `App` under jsdom and asserts it renders without throwing. Add `.gitkeep` + `README.md` in `tests/integration/` and `tests/e2e/` noting they are post-MVP.

##### Verify

- `pnpm test:unit:ci`

##### Timeout

120000

### Phase 4: Convex empty scaffold + full dev loop

> Gate: `pnpm app:compile && pnpm build`

#### Step 4.1: Convex scaffold (schema-empty, no functions, no auth)

Install `convex`. Create `convex/schema.ts` exporting `defineSchema({})` (no tables). Create `convex.json` with default config. Create `src/app/ConvexProvider.tsx` wrapping the app in `ConvexReactClient` fed by `import.meta.env.VITE_CONVEX_URL`, and wrap `<App/>` with it in `main.tsx`, guarding for a missing URL (render the scene without Convex if unset, log a warning — CI has no Convex URL). Create `.env.example` documenting `VITE_CONVEX_URL` and `CONVEX_DEPLOYMENT`; ensure `.env.local` is gitignored. Update the `"dev"` script to `concurrently -n vite,convex "vite" "convex dev"` (install `concurrently`). Do **not** run `convex dev` non-interactively in the executor; only ensure typecheck/build pass with Convex wired.

##### Verify

- `pnpm app:compile`
- `pnpm build`

##### Timeout

120000

#### Step 4.2: Forward-declared ports and frozen barrel

Create `src/application/ports/index.ts` exporting **interfaces only**: `ContentProvider` (`line(address: Address): Glyph[]`, `inverse(line: Glyph[]): Address | null`) and `PresencePort` (`publish(state: PlayerState): void`, `subscribe(cb: (states: PlayerState[]) => void): () => void`), plus placeholder `type Address`, `type Glyph`, and `type PlayerState` (documented as "shape finalized in Unit 02/03"). Create `src/domain/index.ts` as an empty barrel with a header comment: "FROZEN PUBLIC CONTRACT — Unit 02 populates reduce()/hash()/line()/inverse(). Do not import framework code here." These compile but export only types/stubs; no logic.

##### Verify

- `pnpm app:compile`
- `pnpm lint`

##### Timeout

90000

### Phase 5: CI/CD & deploy config

> Gate: `pnpm ci:local`

#### Step 5.1: Composite local gate + GitHub Actions

Add script `"ci:local"` per §3.1. Create `.github/workflows/ci.yml`: trigger on `push` and `pull_request`; single job on `ubuntu-latest`, Node 20, `pnpm/action-setup`, cache pnpm store, `pnpm install --frozen-lockfile`, then run `pnpm app:compile`, `pnpm lint`, `pnpm format:check`, `pnpm verify:boundaries`, `pnpm test:unit:ci`, `pnpm build` as ordered steps. No Convex/deploy secrets in this workflow.

##### Verify

- `pnpm ci:local`
- `node -e "require('fs').accessSync('.github/workflows/ci.yml')"`

##### Timeout

150000

#### Step 5.2: Vercel + Convex deploy config

Create `vercel.json` with `buildCommand: "pnpm build"`, `outputDirectory: "dist"`, and an SPA rewrite (`/(.*) → /index.html`) (E4). Document in README the two-target deploy: Vercel builds the frontend; `convex deploy` publishes the backend, with `VITE_CONVEX_URL` set in Vercel env to the Convex prod URL. Do not execute a deploy; only commit config and docs.

##### Verify

- `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`

##### Timeout

90000

### Phase 6: Doctrine & README

> Gate: `pnpm format:check` (docs are Prettier-formatted markdown)

#### Step 6.1: Doctrine docs

In `docs/doctrine/`, create: `00-architecture.md` (hexagonal layers, the §2.2 dependency rule and _why_ the domain stays pure — the deterministic-core invariant); `01-frozen-contracts.md` (lists `domain/index.ts` and `application/ports` as frozen surfaces every downstream unit imports; states the rule that units are adapter swaps, not core edits); `02-adr-template.md` (a short ADR template). Create `docs/tasks/ongoing/.gitkeep`. Create `CONTRIBUTING.md` documenting: pnpm, `ci:local` before push, branch-per-unit strategy (`unit-02-core`, `unit-03-render`, …), and the rule that `domain`/`application` public surfaces change only via ADR.

##### Verify

- `test -f docs/doctrine/00-architecture.md && test -f docs/doctrine/01-frozen-contracts.md`
- `pnpm format:check`

##### Timeout

90000

#### Step 6.2: README (vision · scope · MVP deliverables)

Write `README.md` with: **Vision** (deterministic Library of Babel as a flat-screen 3D art piece; content = pure function of a ℤ² lattice coordinate; no LLM); **Full scope** (the 8-unit dependency graph `01→02→03→{04·A∥04·B}→{05·A∥05·B}→06` as a table); **MVP deliverables** (one correctly-proportioned hexagon, two dim bulbs, fog, audio, traversable staircase, click-to-open book with streaming ciphered glyphs on plain vellum; multiplayer architected-for but descoped); **Getting started** (`pnpm install`, `.env.local` from `.env.example`, `pnpm dev`, `pnpm ci:local`); **Architecture** (link to doctrine). Keep it accurate to this spec — no features not yet built.

##### Verify

- `pnpm format:check`
- `grep -q "ℤ²\|lattice" README.md`

##### Timeout

90000

---

### Acceptance (whole unit)

`git clone` → `pnpm install` → `pnpm ci:local` green; `pnpm dev` serves the placeholder scene with Convex provider mounted; a PR runs CI green; `pnpm verify:boundaries` proves the dependency rule rejects a `domain → react` import. At that point the repo is branchable for Units 02 (core) and 03 (render) in parallel.

---

Two notes before you run it. First, **Phase 4.2 hard-stubs the `PlayerState`/`Address`/`Glyph` shapes** — I kept them deliberately loose because their real definition is Unit 02/03's job; if you'd rather freeze those types _now_ (stronger contract, but commits you before the cipher's designed), that's a one-line change to move them earlier. Second, the **`verify:boundaries` proof-step (2.3 + CI)** is the piece that turns your "core stays pure" doctrine from discipline into enforced infrastructure — it's the most Rei-shaped decision in the whole unit, and the one I'd least want cut under time pressure.

Want Unit 02 (the deterministic core) next in the same format, or the shared preamble block extracted into `docs/doctrine/` first so every subsequent unit spec inherits it by reference?
