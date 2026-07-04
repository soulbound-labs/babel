/**
 * Reader state machine (§4.3/§4.4) — pure, no R3F. Reading is a MODE under
 * the frozen `LocomotionHandle` seam (KDD-1): open ⇒ suspend intent, close ⇒
 * resume intent; the composition layer (BookReader) applies the intent to the
 * handle and acknowledges it. The machine never touches a coordinate or the
 * camera — the address bigints pass through untouched (INV-B6).
 *
 * Selection is refused unless `surface === 'floor'` (no book-pulling
 * mid-stair). A turn started mid-stream first completes the reveal — never a
 * half-written page mid-flight (§4.4). Retreated pages re-open fully revealed
 * (you already read them; only NEW pages stream).
 */
import { BOOK_PAGES, READ_APPROACH_SECONDS, READ_TURN_SECONDS } from '../room/dimensions';
import type { PageAddress } from './book-address';
import { frontAt, PAGE_REVEAL_SECONDS } from './reveal';
import { turnProgressAt } from './turn';

export type ReaderStatus = 'closed' | 'approaching' | 'open' | 'turning';
export type ReaderIntent = 'suspend' | 'resume' | null;
export type ReaderEvent = 'turn-lift' | 'turn-settle';
export type SurfaceModeLike = 'floor' | 'stair';

/** Pose-harness phase params (§4.6) — also the `CameraPose.book.phase` shape. */
export type ReadingPhase = {
  /** Approach fraction 0..1 (P9: 0.5). */
  approach?: number;
  /** Lines resolved 0..40 (P10: 20; P12: 40). */
  revealedLines?: number;
  /** Spine-pivot turn progress 0..1 (P11: 0.5). */
  turnProgress?: number;
};

export type ReaderState = {
  status: ReaderStatus;
  /** The book being read; `page` is the CURRENT page. Null when closed. */
  address: PageAddress | null;
  /** The shelf instance the book came from (KDD-7 dim/hide + restore). */
  slot: number | null;
  approachElapsed: number;
  /** Seconds since the current page opened — drives `frontAt` (INV-B3). */
  revealPhase: number;
  turnElapsed: number;
  turnDirection: 1 | -1;
  /** What the composition layer must apply to the LocomotionHandle (KDD-1). */
  intent: ReaderIntent;
};

export const CLOSED_READER: ReaderState = {
  status: 'closed',
  address: null,
  slot: null,
  approachElapsed: 0,
  revealPhase: 0,
  turnElapsed: 0,
  turnDirection: 1,
  intent: null,
};

/** Open a book: refused unless closed AND standing on the floor (§4.3 gate). */
export function open(
  state: ReaderState,
  address: PageAddress,
  slot: number,
  surface: SurfaceModeLike,
): ReaderState {
  if (state.status !== 'closed' || surface !== 'floor') return state;
  return {
    ...CLOSED_READER,
    status: 'approaching',
    address,
    slot,
    intent: 'suspend',
  };
}

/** Close from any open-ish state: dismiss, resume walking (KDD-1). */
export function close(state: ReaderState): ReaderState {
  if (state.status === 'closed') return state;
  return { ...CLOSED_READER, intent: 'resume' };
}

/** The composition layer applied the intent to the handle. */
export function acknowledgeIntent(state: ReaderState): ReaderState {
  return state.intent === null ? state : { ...state, intent: null };
}

export type ReaderTransition = { state: ReaderState; events: ReaderEvent[] };

/** Turn forward. Mid-stream: completes the reveal, THEN turns (§4.4). */
export function advance(state: ReaderState): ReaderTransition {
  if (state.status !== 'open' || state.address === null) return { state, events: [] };
  if (state.address.page >= BOOK_PAGES - 1) return { state, events: [] };
  return {
    state: {
      ...state,
      status: 'turning',
      revealPhase: PAGE_REVEAL_SECONDS, // reveal.complete(): never half-written mid-flight
      turnElapsed: 0,
      turnDirection: 1,
    },
    events: ['turn-lift'],
  };
}

/** Turn back. The retreated page re-opens fully revealed. */
export function retreat(state: ReaderState): ReaderTransition {
  if (state.status !== 'open' || state.address === null) return { state, events: [] };
  if (state.address.page <= 0) return { state, events: [] };
  return {
    state: {
      ...state,
      status: 'turning',
      revealPhase: PAGE_REVEAL_SECONDS,
      turnElapsed: 0,
      turnDirection: -1,
    },
    events: ['turn-lift'],
  };
}

/** One frame: advance approach/stream/turn clocks; settle finished turns. */
export function tick(state: ReaderState, deltaSeconds: number): ReaderTransition {
  const dt = Math.max(0, deltaSeconds);
  switch (state.status) {
    case 'closed':
      return { state, events: [] };
    case 'approaching': {
      const approachElapsed = state.approachElapsed + dt;
      if (approachElapsed >= READ_APPROACH_SECONDS) {
        // Arrived: the book opens and page streaming starts from zero.
        return {
          state: {
            ...state,
            status: 'open',
            approachElapsed: READ_APPROACH_SECONDS,
            revealPhase: 0,
          },
          events: [],
        };
      }
      return { state: { ...state, approachElapsed }, events: [] };
    }
    case 'open':
      return {
        state: { ...state, revealPhase: Math.min(state.revealPhase + dt, PAGE_REVEAL_SECONDS) },
        events: [],
      };
    case 'turning': {
      const turnElapsed = state.turnElapsed + dt;
      if (turnElapsed < READ_TURN_SECONDS) {
        return { state: { ...state, turnElapsed }, events: [] };
      }
      // Settle: commit the page flip; forward pages stream fresh, retreated
      // pages are already read — fully revealed.
      const address = state.address;
      if (address === null) return { state: CLOSED_READER, events: [] };
      const page = address.page + (state.turnDirection === 1 ? 1 : -1);
      return {
        state: {
          ...state,
          status: 'open',
          address: { ...address, page },
          turnElapsed: 0,
          revealPhase: state.turnDirection === 1 ? 0 : PAGE_REVEAL_SECONDS,
        },
        events: ['turn-settle'],
      };
    }
  }
}

/** Eased approach fraction 0..1 (monotonic — no snap frame, §4.3). */
export function approachFractionOf(state: ReaderState): number {
  if (state.status === 'closed') return 0;
  if (state.status !== 'approaching') return 1;
  const t = Math.min(1, state.approachElapsed / READ_APPROACH_SECONDS);
  return t * t * (3 - 2 * t);
}

/** The reveal front (lines) to write into `uRevealFront`. */
export function revealFrontOf(state: ReaderState): number {
  if (state.status === 'open' || state.status === 'turning') return frontAt(state.revealPhase);
  return 0;
}

/** The turn progress to write into `uTurnProgress` (retreat runs 1→0). */
export function turnProgressOf(state: ReaderState): number {
  if (state.status !== 'turning') return 0;
  const p = turnProgressAt(state.turnElapsed);
  return state.turnDirection === 1 ? p : 1 - p;
}
