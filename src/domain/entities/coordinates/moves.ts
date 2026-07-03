/**
 * Coordinate algebra (spec §4.1, §5). Pure ℤ² vector adds — path-independent by
 * construction (commutative addition). Locked by INV-1..INV-3.
 */
import type { Coordinate, Move } from './types';
import { ORIGIN } from './types';

/** Unit displacement for a move on the ℤ² lattice. */
export function moveVector(m: Move): { dn: bigint; dfloor: bigint } {
  switch (m) {
    case 'forward':
      return { dn: 1n, dfloor: 0n };
    case 'back':
      return { dn: -1n, dfloor: 0n };
    case 'up':
      return { dn: 0n, dfloor: 1n };
    case 'down':
      return { dn: 0n, dfloor: -1n };
  }
}

/** Apply one move to a coordinate. */
export function applyMove(c: Coordinate, m: Move): Coordinate {
  const v = moveVector(m);
  return { n: c.n + v.dn, floor: c.floor + v.dfloor };
}

/** The move that undoes `m` (forward↔back, up↔down). */
export function invertMove(m: Move): Move {
  switch (m) {
    case 'forward':
      return 'back';
    case 'back':
      return 'forward';
    case 'up':
      return 'down';
    case 'down':
      return 'up';
  }
}

/** Sum a sequence of moves onto `from` (default ORIGIN). Path-independent. */
export function reduce(moves: Move[], from: Coordinate = ORIGIN): Coordinate {
  return moves.reduce<Coordinate>((c, m) => applyMove(c, m), from);
}
