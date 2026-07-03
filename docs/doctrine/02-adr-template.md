# 02 — ADR template

Architecture Decision Records capture _why_ a load-bearing decision was made.
Any change to a [frozen contract](./01-frozen-contracts.md) (the `domain/` or
`application/` public surface) requires one.

Copy the block below to `docs/doctrine/adr/NNNN-short-title.md` (zero-padded,
incrementing), fill it in, and open it for review **before** editing the frozen
surface.

---

```markdown
# ADR NNNN — <short title>

- **Status:** Proposed | Accepted | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Unit / branch:** <e.g. unit-02-core>
- **Deciders:** <names>

## Context

What forces are at play? What frozen surface does this touch, and why does the
current shape not work? Link the relevant unit spec.

## Decision

The change we are making, stated precisely. Include the new type/interface
signature if a contract shape changes.

## Consequences

- What becomes easier or safer.
- What becomes harder; what downstream units must adapt to.
- Migration notes for branches already in flight.

## Alternatives considered

- **<Option>** — why not.
```
