# Tooling (DOCTRINE)

> **Preload when:** adding or changing a script, a build/config file, a package
> script, or a dependency — anything about _how the repo is built, linted,
> tested, or run_. It states the durable toolchain invariants so an agent does
> not reintroduce JavaScript, guess the gate, or run a script the wrong way.

## The one rule: no JavaScript

**All first-party code in this repo is TypeScript.** There are **no `.js`,
`.mjs`, or `.cjs` files** in tracked, first-party code — not in `scripts/`, not
in build config.

- **Executable scripts live in `scripts/*.ts` and run via `tsx`**, never `node`.
  Package scripts invoke them as `tsx scripts/<name>.ts` (e.g.
  `verify:boundaries`). `tsx` transpiles + runs TS directly, so there is no build
  step and no compiled `.js` artifact to drift from its source.
- **Build/tool configs are TypeScript too:** `vite.config.ts`, `vitest.config.ts`,
  and `eslint.config.ts`. ESLint loads a TS flat config natively because
  [`jiti`](https://www.npmjs.com/package/jiti) is installed (a devDependency that
  exists **only** to let ESLint 10 read `eslint.config.ts` — do not remove it, or
  linting silently falls back / breaks).

**The single exception — bash for the zero-dep kernel.** The substrate
docs-core kernel ships intentionally dependency-free shell:
`docs/scripts/doctrine-lint.sh` and the git hooks under `.hooks/`. These are
**not** first-party app code; they must run with nothing installed (before
`pnpm install`, inside a bare pre-commit). Keep them bash; do **not** "upgrade"
them to TS — that would give the Gate-1 linter a runtime dependency, defeating
its purpose.

## Why

- **One language, one mental model, one set of lint/type rules.** A stray `.mjs`
  escapes `tsc` and the boundary rule; TypeScript everywhere means the whole tree
  is under the same strictness (`noUncheckedIndexedAccess`, etc.).
- **`tsx` over a compile step** keeps scripts as close to zero-friction as a shell
  script while staying typed. No `dist/` for tooling, nothing to keep in sync.

## How it's enforced

- **Typecheck.** Scripts have their own `tsconfig.scripts.json` (Node lib +
  `types: ["node"]`, no DOM), kept separate from the browser app config so Node
  globals resolve without polluting `src`. `pnpm app:compile` runs **both**
  projects (`tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json`). `@types/node`
  is a devDependency so `node:*` builtins, `process`, and `Buffer` type-check.
- **Lint.** `eslint.config.ts` adds `scripts/**/*.ts` to the typescript-eslint
  file set, so `pnpm lint` covers scripts with the same parser/rules as `src`.
- **The gate itself is declared, not guessed:** `substrate.yaml` names the repo's
  verification commands (`compile` / `test` / `lint`). Read it before running or
  wiring CI; never probe for a toolchain. See root `AGENTS.md`.

## Cookbook (symptom → cause → fix)

- **`eslint .` errors "Could not find config" / ignores rules after config edit** →
  `jiti` missing or ESLint can't load `eslint.config.ts` → ensure `jiti` is a
  devDependency; it is the only reason the TS config loads.
- **`tsc` flags `process`/`Buffer` as undefined in a script** → `@types/node`
  missing, or the script isn't covered by `tsconfig.scripts.json` (`include:
["scripts"]`, `types: ["node"]`) → restore both. Don't add Node types to the
  main `tsconfig.json`; that strips the ambient `@types/react` JSX namespace.
- **A new helper script is `.mjs`/`.js`** → violates the no-JS rule → author it as
  `scripts/<name>.ts` and call it with `tsx`.
- **Tempted to rewrite `doctrine-lint.sh` in TS** → don't; it must be zero-dep so
  the pre-commit hook works before `pnpm install`. Bash is correct here.

## Pointers

- `substrate.yaml` — the declared build/test/lint gate.
- `eslint.config.ts` — flat config (loaded via `jiti`) incl. the boundary rule.
- `docs/doctrine/00-architecture.md` — the hexagonal layers the lint rule enforces.
- `AGENTS.md` — root map; the spec/task lifecycle.
