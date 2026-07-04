/**
 * Walkability policy (spec §4.1, T-5) — the ±64 bound on the walkable region.
 * Policy lives OUTSIDE the lattice (the frozen algebra is unbounded); this
 * module gates move EMISSION, it never clamps a coordinate after `applyMove`
 * (KDD-2). Unit 07 imports `WALKABLE_BOUND` from here (co-location radius is
 * the same number) — never re-declares 64. Bigint comparisons only.
 */
import { applyMove } from '../../domain/entities';
import type { Coordinate, Move } from '../../domain/entities';

/** The walkable region: n ∈ [−64, 64], floor ∈ [−64, 64]. */
export const WALKABLE_BOUND = 64n;

export function isWithinBounds(c: Coordinate): boolean {
  return (
    c.n >= -WALKABLE_BOUND &&
    c.n <= WALKABLE_BOUND &&
    c.floor >= -WALKABLE_BOUND &&
    c.floor <= WALKABLE_BOUND
  );
}

/** True iff `m`'s destination stays within bounds — checked BEFORE applyMove commits (T-5). */
export function canMove(c: Coordinate, m: Move): boolean {
  return isWithinBounds(applyMove(c, m));
}
