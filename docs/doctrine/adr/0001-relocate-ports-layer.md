# ADR 0001 — Relocate the ports layer to `src/ports`

- **Status:** Accepted
- **Date:** 2026-07-03
- **Unit / branch:** post-Unit-01 iteration (main)
- **Deciders:** Rei, Claude

## Context

Unit 01 placed the forward-declared ports under `src/application/ports/`, giving
the hexagonal model an `application` layer. In practice that layer held **only**
`ports/` — there are no application services, orchestrators, or use-case
implementations, and none are planned near-term (the pure core in `domain/`
implements `ContentProvider` directly; presence is a thin adapter seam).

The `application` wrapper therefore added a directory level and a longer import
path (`@/application/...`) without carrying any distinct responsibility. Per
[01 — Frozen contracts](../01-frozen-contracts.md), the ports surface is frozen
and its **location is part of the contract**, so relocating it is an ADR-gated
change even though no downstream unit imports it yet.

## Decision

Collapse the vacuous `application` layer: move `src/application/ports/` →
`src/ports/` and delete `src/application/`. `ports` becomes its own architectural
layer sitting between `domain` and the outer layers.

- Import path is now `@/ports` (was `@/application/ports`).
- The boundary rule's element `application` (pattern `src/application`) is renamed
  to `ports` (pattern `src/ports`); every allow-list swaps `application → ports`;
  the pure-core external ban now covers `domain` + `ports`.
- The Vitest `node` project glob becomes `tests/unit/{domain,ports}/**`.

The layer's semantics are unchanged: interfaces only, pure, no framework imports
(enforced by `boundaries/dependencies`).

## Consequences

- Shorter, flatter imports; one fewer empty directory level.
- **Trade-off:** if genuine application services (use-case orchestration beyond
  port interfaces) appear later, they need a new home — reintroduce an
  `application/` layer then, via a follow-up ADR. Interface-only ports living at
  `src/ports` do not preclude that.
- No code consumers existed at relocation time, so this is a zero-risk move for
  in-flight branches (there were none). Future units import from `@/ports`.

## Alternatives considered

- **Keep `application/ports`.** Rejected: pays a permanent path/nesting cost for a
  layer with no current occupant besides ports.
- **Rename the layer to `application` but flatten the file to
  `src/application/index.ts`.** Rejected: keeps the misleading "application
  services live here" signal while gaining nothing.
