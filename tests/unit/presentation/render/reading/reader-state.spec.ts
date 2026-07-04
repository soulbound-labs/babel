import { describe, expect, it } from 'vitest';

import { READ_APPROACH_SECONDS, READ_TURN_SECONDS } from '@/presentation/render/room/dimensions';
import {
  acknowledgeIntent,
  advance,
  approachFractionOf,
  close,
  CLOSED_READER,
  open,
  retreat,
  revealFrontOf,
  tick,
  turnProgressOf,
} from '@/presentation/render/reading/reader-state';
import type { ReaderState } from '@/presentation/render/reading/reader-state';
import { SPREAD_REVEAL_SECONDS } from '@/presentation/render/reading/reveal';

const ADDRESS = { n: 42n, floor: -7n, wall: 1, shelf: 2, volume: 3, page: 0 };

/** Drive the machine to the settled-open state at page 0, stream just begun. */
function openedReader() {
  let s = open(CLOSED_READER, ADDRESS, 123, 'floor');
  s = acknowledgeIntent(s);
  s = tick(s, READ_APPROACH_SECONDS + 0.01).state;
  return s;
}

/** Open AND fully streamed — the only state a turn is accepted from (§4.4). */
function streamedReader() {
  return tick(openedReader(), SPREAD_REVEAL_SECONDS).state;
}

describe('reader state machine (INV-B6)', () => {
  it('open sets the suspend intent; close sets the resume intent (KDD-1 seam)', () => {
    const opened = open(CLOSED_READER, ADDRESS, 123, 'floor');
    expect(opened.status).toBe('approaching');
    expect(opened.intent).toBe('suspend');
    const closed = close(acknowledgeIntent(opened));
    expect(closed.status).toBe('closed');
    expect(closed.intent).toBe('resume');
  });

  it('selection is refused when surface mode is stair (no book-pulling mid-climb)', () => {
    const refused = open(CLOSED_READER, ADDRESS, 123, 'stair');
    expect(refused).toBe(CLOSED_READER);
    expect(refused.intent).toBeNull();
  });

  it('open is refused while a book is already open', () => {
    const s = openedReader();
    expect(open(s, { ...ADDRESS, volume: 9 }, 300, 'floor')).toBe(s);
  });

  it('the address bigints pass through untouched across a full read (coordinate invariance)', () => {
    let s = streamedReader();
    s = advance(s).state;
    for (let i = 0; i < 50; i++) s = tick(s, 0.1).state;
    expect(s.address?.n).toBe(42n);
    expect(s.address?.floor).toBe(-7n);
    expect(s.address?.wall).toBe(1);
  });

  it('approach eases 0→1 monotonically, then the book opens streaming from zero', () => {
    let s = open(CLOSED_READER, ADDRESS, 123, 'floor');
    let prev = 0;
    for (let i = 0; i < 20; i++) {
      s = tick(s, READ_APPROACH_SECONDS / 20 + 1e-9).state;
      const f = approachFractionOf(s);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(s.status).toBe('open');
    expect(revealFrontOf(s)).toBe(0);
  });

  it('streaming reveals at the locked cadence and caps at the full spread', () => {
    let s = openedReader();
    s = tick(s, 1).state;
    expect(revealFrontOf(s)).toBe(16); // 16 lines/s
    s = tick(s, SPREAD_REVEAL_SECONDS).state;
    expect(revealFrontOf(s)).toBe(40); // both leaves, in parallel
  });

  it('advance AND retreat are refused mid-stream — no flip until the spread resolves (§4.4)', () => {
    let s: ReaderState = { ...openedReader(), address: { ...ADDRESS, page: 6 } };
    s = tick(s, 1.0).state; // 16 of 40 lines revealed — still streaming
    expect(advance(s).state).toBe(s);
    expect(advance(s).events).toEqual([]);
    expect(retreat(s).state).toBe(s);
    expect(retreat(s).events).toEqual([]);
    // The moment the stream completes, the same click is accepted.
    const done = tick(s, SPREAD_REVEAL_SECONDS).state;
    expect(advance(done).state.status).toBe('turning');
    expect(advance(done).events).toEqual(['turn-lift']);
  });

  it('the turn settles after the locked duration onto the next spread (+2), streaming fresh', () => {
    const s = advance(streamedReader()).state;
    const settled = tick(s, READ_TURN_SECONDS + 0.01);
    expect(settled.events).toEqual(['turn-settle']);
    expect(settled.state.status).toBe('open');
    expect(settled.state.address?.page).toBe(2); // spread (0,1) → (2,3)
    expect(revealFrontOf(settled.state)).toBe(0);
  });

  it('turn progress is monotonic 0→1 during an advance turn', () => {
    let s = advance(streamedReader()).state;
    let prev = 0;
    for (let i = 0; i < 10; i++) {
      s = tick(s, READ_TURN_SECONDS / 12).state;
      const p = turnProgressOf(s);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
  });

  it('retreat is refused on the first spread; advance is refused on the last spread', () => {
    const s = streamedReader(); // spread (0,1), fully revealed
    expect(retreat(s).state).toBe(s);
    expect(retreat(s).events).toEqual([]);
    const atEnd = { ...s, address: { ...ADDRESS, page: 408 } }; // last spread (408,409)
    expect(advance(atEnd).state).toBe(atEnd);
  });

  it('a retreated spread re-opens fully revealed (only new spreads stream)', () => {
    let s: ReaderState = { ...streamedReader(), address: { ...ADDRESS, page: 6 } };
    s = retreat(s).state;
    const settled = tick(s, READ_TURN_SECONDS + 0.01).state;
    expect(settled.address?.page).toBe(4); // spread (6,7) → (4,5)
    expect(revealFrontOf(settled)).toBe(40);
    // Already read ⇒ already complete ⇒ it can flip again immediately.
    expect(retreat(settled).state.status).toBe('turning');
  });

  it('close from mid-approach or mid-turn returns cleanly to CLOSED with resume intent', () => {
    const midApproach = tick(open(CLOSED_READER, ADDRESS, 1, 'floor'), 0.2).state;
    expect(close(midApproach).status).toBe('closed');
    expect(close(midApproach).intent).toBe('resume');
    const midTurn = advance(streamedReader()).state;
    expect(close(midTurn).status).toBe('closed');
  });
});
