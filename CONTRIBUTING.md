# Contributing

## Toolchain

- **Package manager: `pnpm`** (pinned via `packageManager` in `package.json`).
  All scripts and CI assume it. Node ≥ 20.
- Install: `pnpm install`. Configure env: `cp .env.example .env.local`.

## Before you push

Run the composite gate locally — it mirrors CI exactly:

```bash
pnpm ci:local
```

which runs, in order: `compile` (typecheck) → `lint` → `format:check` →
`script:verify-boundaries` (proves the dependency rule fires) → `test:unit:ci` →
`build`. Do not push red.

## Branch-per-unit

Babel is built as a dependency spine of eight units (see the
[README](./README.md) scope table). Each unit is developed on its own branch so
work can proceed in parallel without collisions:

```
unit-02-core        unit-03-render      unit-04a-staircase
unit-04b-books      unit-05a-atmosphere unit-05b-multiplayer
unit-06-search
```

Branch off `main` once Unit 01 is green. The frozen seams (see below) are what
let these branches avoid touching each other's subsystems.

## Changing a frozen surface (ADR-gated)

The `domain/` and `ports/` public surfaces
(`src/domain/index.ts`, `src/ports`) are **frozen contracts**. Every
other unit imports them, so they change **only via an ADR** — see the frozen
domain/ports seams in
[docs/doctrine/architecture.md](./docs/doctrine/architecture.md). Everything
under `adapters/`, `render/`, `audio/`, and `app/` is an adapter and can change
freely within its layer.

## The one rule that fails CI on purpose

Nothing under `src/domain/` (or `src/ports/`) may import a framework
(react, three, convex). This keeps the deterministic core pure and is enforced
by `boundaries/dependencies` in `eslint.config.ts`. See
[docs/doctrine/architecture.md](./docs/doctrine/architecture.md).
