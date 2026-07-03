# 01 — Frozen contracts

Babel is built as a dependency spine of eight units that different people build
in parallel. That only works if the seams between units are **frozen**: their
_shape and location_ are fixed up front, so a downstream unit provides an
implementation without editing — or even reading — the units around it.

**A new unit is an adapter swap, not a core edit.**

## The frozen surfaces

| Surface       | File                                                    | Owner / lifecycle                                                                                                                                    |
| ------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain barrel | `src/domain/index.ts`                                   | Exists (empty) from Unit 01. Unit 02 populates `reduce()` / `hash()` / `line()` / `inverse()`. Its location is the contract every unit imports from. |
| Content port  | `src/application/ports` → `ContentProvider`             | Interface fixed in Unit 01; the pure core implements it in Unit 02.                                                                                  |
| Presence port | `src/application/ports` → `PresencePort`, `PlayerState` | Interface fixed in Unit 01; no-op impl in Unit 03, Convex impl in Unit 05·B.                                                                         |

The placeholder types (`Address`, `Glyph`, `PlayerState`) are intentionally
**loose** in Unit 01 (`unknown`). Their real shapes land with the unit that
designs them (cipher in Unit 02, render in Unit 03) so we do not commit a design
before it exists. Loosening later is cheap; a wrong early freeze is not.

## The rule

- **`domain/` and `application/` public surfaces change only via an ADR.** They
  are imported by everything; an unreviewed change to them ripples across every
  parallel branch. Propose the change as an ADR (see
  [02 — ADR template](./02-adr-template.md)), get it reviewed, then edit.
- **Everything else is an adapter.** Implementations under `adapters/`,
  `render/`, `audio/`, and `app/` can change freely within their layer — that is
  the point of freezing the seams.
- **Purity is enforced, not trusted.** Nothing under `domain/` may import a
  framework. This is a lint error (`boundaries/dependencies`), and CI proves the
  rule actually fires via `pnpm verify:boundaries` (writes a throwaway
  `domain → react` import and asserts ESLint rejects it). If that proof ever goes
  green-when-it-should-be-red, the whole determinism guarantee is unenforced —
  which is why it is the least-cuttable step in the bootstrap.

See [00 — Architecture](./00-architecture.md) for the full layer matrix.
