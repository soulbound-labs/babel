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
import { PAGE_REVEAL_SECONDS } from '@/presentation/render/reading/reveal';

const ADDRESS = { n: 42n, floor: -7n, wall: 1, shelf: 2, volume: 3, page: 0 };

/** Drive the machine to the settled-open state at page 0. */
function openedReader() {
  let s = open(CLOSED_READER, ADDRESS, 123, 'floor');
  s = acknowledgeIntent(s);
  s = tick(s, READ_APPROACH_SECONDS + 0.01).state;
  return s;
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
    let s = openedReader();
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

  it('streaming reveals at the locked cadence and caps at the full page', () => {
    let s = openedReader();
    s = tick(s, 1).state;
    expect(revealFrontOf(s)).toBe(8); // 8 lines/s
    s = tick(s, PAGE_REVEAL_SECONDS).state;
    expect(revealFrontOf(s)).toBe(40);
  });

  it('advance mid-stream completes the reveal FIRST, then turns (never half-written)', () => {
    let s = openedReader();
    s = tick(s, 1.0).state; // 8 of 40 lines revealed
    const { state, events } = advance(s);
    expect(events).toEqual(['turn-lift']);
    expect(state.status).toBe('turning');
    expect(revealFrontOf(state)).toBe(40); // reveal.complete()
  });

  it('the turn settles after the locked duration onto the next page, streaming fresh', () => {
    const s = advance(openedReader()).state;
    const settled = tick(s, READ_TURN_SECONDS + 0.01);
    expect(settled.events).toEqual(['turn-settle']);
    expect(settled.state.status).toBe('open');
    expect(settled.state.address?.page).toBe(1);
    expect(revealFrontOf(settled.state)).toBe(0);
  });

  it('turn progress is monotonic 0→1 during an advance turn', () => {
    let s = advance(openedReader()).state;
    let prev = 0;
    for (let i = 0; i < 10; i++) {
      s = tick(s, READ_TURN_SECONDS / 12).state;
      const p = turnProgressOf(s);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
  });

  it('retreat is refused at page 0; advance is refused at the last page', () => {
    const s = openedReader();
    expect(retreat(s).state).toBe(s);
    expect(retreat(s).events).toEqual([]);
    const atEnd = { ...s, address: { ...ADDRESS, page: 409 } };
    expect(advance(atEnd).state).toBe(atEnd);
  });

  it('a retreated page re-opens fully revealed (only new pages stream)', () => {
    let s: ReaderState = { ...openedReader(), address: { ...ADDRESS, page: 5 } };
    s = retreat(s).state;
    const settled = tick(s, READ_TURN_SECONDS + 0.01).state;
    expect(settled.address?.page).toBe(4);
    expect(revealFrontOf(settled)).toBe(40);
  });

  it('close from mid-approach or mid-turn returns cleanly to CLOSED with resume intent', () => {
    const midApproach = tick(open(CLOSED_READER, ADDRESS, 1, 'floor'), 0.2).state;
    expect(close(midApproach).status).toBe('closed');
    expect(close(midApproach).intent).toBe('resume');
    const midTurn = advance(openedReader()).state;
    expect(close(midTurn).status).toBe('closed');
  });
});
