# 00 — Architecture

Babel is built on a **hexagonal (ports & adapters) architecture** with one
non-negotiable invariant at its center: **the domain core is pure.**

## Why the core stays pure

The whole product is a bet that Library-of-Babel content can be a **pure
function of a ℤ² lattice coordinate** `(n, floor)` — path-independent, identical
for every user, with no server round-trip and no LLM. That determinism only
holds if the code computing it cannot reach for anything non-deterministic or
environment-specific. So `domain/` must never import a rendering engine
(three.js), a UI framework (React), or a backend (Convex). It is plain
TypeScript + BigInt, testable in isolation, and reproducible anywhere.

We do not keep this pure by asking nicely in code review. We keep it pure with a
**lint rule that fails CI** (see below).

## The layers

```
app  →  render / audio  →  ports  →  domain
adapters  ───────────────────────────┘
```

| Layer              | Responsibility                              | May import                            | May NOT import                                                           |
| ------------------ | ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `domain`           | Pure lattice algebra + content cipher       | _(nothing outside domain)_            | ports, adapters, render, audio, app, **react, three, convex, node core** |
| `ports`            | Use-case ports (interfaces only)            | domain                                | adapters, render, audio, app, **frameworks**                             |
| `adapters`         | Port implementations (in-memory, Convex, …) | domain, ports                         | render, audio, app                                                       |
| `render` / `audio` | R3F scene / positional audio                | domain, ports, third-party, node core | adapters (reach via ports), app, **convex directly**                     |
| `app`              | React shell + entry + providers             | everything inward                     | —                                                                        |

The dependency arrows always point **inward**. Outer layers know about inner
layers; inner layers never know about outer ones.

## Enforcement (not decoration)

The matrix above is encoded in `eslint.config.ts` via
`eslint-plugin-boundaries` (`boundaries/dependencies`), run with
`checkAllOrigins: true` and `default: 'disallow'`. The pure core is granted
_only_ narrow inward allows, so **any** framework/external import from
`domain` or `ports` is a lint error by omission — a stronger guarantee
than an enumerated deny-list.

A violating import **fails `pnpm lint`**, which **fails CI**. And because a lint
rule that matches nothing is a silent false-green, we prove enforcement is live
on every CI run with `pnpm verify:boundaries`, which writes a throwaway
`domain → react` import and asserts ESLint rejects it (see
[01 — Frozen contracts](./01-frozen-contracts.md) and the E2 rationale in the
Unit 01 spec).

## Directory model

```
src/
├── domain/        # PURE. ℤ² lattice + cipher. (Unit 02 fills this.)
│   ├── coordinates/   reduce(), hash()
│   ├── content/       line(), inverse()
│   └── index.ts       the FROZEN public barrel
├── ports/         interfaces only (ContentProvider, PresencePort, …)
├── adapters/      port implementations
├── render/        R3F scene composition (placeholder in Unit 01)
├── audio/         positional audio bus (Unit 03)
└── app/           React shell + entry + Convex provider
```
