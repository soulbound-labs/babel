/**
 * FROZEN PUBLIC CONTRACT — the deterministic core barrel (§2.1).
 *
 * Empty in Unit 01: its *existence and location* are the contract every other
 * unit imports from. Unit 02 populates it with the pure lattice + cipher API —
 * reduce(), hash(), line(), inverse() — and nothing else may live behind it.
 *
 * INVARIANT: nothing under src/domain/ may import framework code (react, three,
 * convex) or any outward layer. This is enforced as a lint error by
 * `boundaries/dependencies` (see eslint.config.ts), proven live by
 * `pnpm script:verify-boundaries`, and explained in docs/doctrine/architecture.md.
 */
export {};
