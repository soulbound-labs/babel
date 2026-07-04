/**
 * Traversal state machine (spec §4.1, KDD-2) — pure `{ coordinate, moveLog }`.
 * One threshold crossing ⇒ exactly one `Move`; the move log IS the coordinate:
 * `coordinate === reduce(moveLog, start)` at every step (T-3). The ±64 bound
 * gates emission via `canMove` — a refused move returns the state unchanged
 * and NEVER enters the log (T-5). No react/three imports.
 */
import { applyMove, ORIGIN } from '../../domain/entities';
import type { Coordinate, Move } from '../../domain/entities';
import { canMove } from './bounds';

export type TraversalState = {
  coordinate: Coordinate;
  moveLog: readonly Move[];
};

export function createTraversal(start: Coordinate = ORIGIN): TraversalState {
  return { coordinate: start, moveLog: [] };
}

/** Cross one commit plane: gated apply. Refusal is a soft stop — state unchanged. */
export function crossThreshold(state: TraversalState, m: Move): TraversalState {
  if (!canMove(state.coordinate, m)) return state;
  return {
    coordinate: applyMove(state.coordinate, m),
    moveLog: [...state.moveLog, m],
  };
}
