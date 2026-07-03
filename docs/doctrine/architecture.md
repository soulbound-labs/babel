# 00 — Architecture

Babel is built on a **hexagonal (ports & adapters) architecture** with one
non-negotiable invariant at its center: **the domain core is pure.**

The `src/` tree has **four** top-level layers. The hexagon interior — the pure
core plus the contracts it declares — lives together under `domain/` as two
elements, `domain/entities/` (the core) and `domain/ports/` (the interfaces).
The outside is split by role: `adapters/` are **driven** (they implement a port
the core calls out to), `presentation/` is **driving** (it calls into the core
and renders/plays the result — it implements nothing), and `app/` is the shell.

## Why the core stays pure

The whole product is a bet that Library-of-Babel content can be a **pure
function of a ℤ² lattice coordinate** `(n, floor)` — path-independent, identical
for every user, with no server round-trip and no LLM. That determinism only
holds if the code computing it cannot reach for anything non-deterministic or
environment-specific. So `domain/entities/` must never import a rendering engine
(three.js), a UI framework (React), or a backend (Convex). It is plain
TypeScript + BigInt, testable in isolation, and reproducible anywhere.

We do not keep this pure by asking nicely in code review. We keep it pure with a
**lint rule that fails CI** (see below).

## The layers

```
app  →  presentation  →  domain/ports  →  domain/entities
adapters  ──────────────────────────────┘
```

| Layer             | Responsibility                                          | May import                                     | May NOT import                                                          |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `domain/entities` | Pure lattice algebra + content cipher                   | _(nothing outside entities)_                   | ports, adapters, presentation, app, **react, three, convex, node core** |
| `domain/ports`    | Use-case ports (interfaces only)                        | domain/entities                                | adapters, presentation, app, **frameworks**                             |
| `adapters`        | Port implementations, **driven** (in-memory, Convex, …) | domain/entities, ports                         | presentation, app                                                       |
| `presentation`    | **Driving** — R3F scene + positional audio              | domain/entities, ports, third-party, node core | adapters (reach via ports), app, **convex directly**                    |
| `app`             | React shell + entry + providers                         | everything inward                              | —                                                                       |

The dependency arrows always point **inward**. Outer layers know about inner
layers; inner layers never know about outer ones. Note the asymmetry between the
two kinds of outer code: `adapters` are **driven** (the core reaches out to them
through a port), while `presentation` is **driving** (it reaches into the core).
`presentation` therefore talks to data **only through a port**, never touching a
concrete adapter or Convex directly — which is what lets the scene render against
a fake port with no backend.

## Enforcement (not decoration)

The matrix above is encoded in `eslint.config.ts` via
`eslint-plugin-boundaries` (`boundaries/dependencies`), run with
`checkAllOrigins: true` and `default: 'disallow'`. The pure core is granted
_only_ narrow inward allows, so **any** framework/external import from
`entities` or `ports` is a lint error by omission — a stronger guarantee
than an enumerated deny-list. (Each source file is classified into exactly one
element by its folder; `entities` and `ports` are matched at `src/domain/entities`
and `src/domain/ports`, so no file may sit loose directly under `src/domain/`.)

A violating import **fails `pnpm lint`**, which **fails CI**. And because a lint
rule that matches nothing is a silent false-green, we prove enforcement is live
on every CI run with `pnpm script:verify-boundaries`, which writes a throwaway
`entities → react` import (under `src/domain/entities/`, so it is classified as
the pure core) and asserts ESLint rejects it (see the E2 rationale in the Unit 01
spec).

## Directory model

```
src/
├── domain/            # The hexagon interior — pure core + its contracts.
│   ├── entities/      # PURE. ℤ² lattice + cipher. POPULATED & FROZEN (Unit 02).
│   │   ├── coordinates/   reduce(), hash()
│   │   ├── content/       line(), inverse()
│   │   └── index.ts       the FROZEN public barrel — the §4.10 surface
│   └── ports/         interfaces only (ContentProvider, PresencePort, …) — Address/Glyph refined to LineAddress/string by Unit 02
├── adapters/          driven port implementations (in-memory now, Convex later)
├── presentation/      driving side — reaches the core only through ports
│   ├── render/        R3F scene composition (placeholder in Unit 01)
│   └── audio/         positional audio bus (Unit 03)
└── app/               React shell + entry + Convex provider
```
