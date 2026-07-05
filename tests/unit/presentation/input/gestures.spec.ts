import { describe, expect, it } from 'vitest';
import {
  SWIPE_MAX_MS,
  SWIPE_MIN_PX,
  TAP_SLOP_PX,
  classifySwipe,
  classifyTouch,
} from '../../../../src/presentation/input/gestures';
import type { TouchTracePoint } from '../../../../src/presentation/input/gestures';

function trace(points: Array<[number, number, number]>): TouchTracePoint[] {
  return points.map(([x, y, t]) => ({ pointerId: 1, x, y, t }));
}

describe('classifyTouch', () => {
  it('classifies an empty trace as tap', () => {
    expect(classifyTouch([])).toBe('tap');
  });

  it('classifies a single-point trace as tap', () => {
    expect(classifyTouch(trace([[100, 100, 0]]))).toBe('tap');
  });

  it('classifies displacement exactly at the slop as tap', () => {
    expect(
      classifyTouch(
        trace([
          [100, 100, 0],
          [100 + TAP_SLOP_PX, 100, 50],
        ]),
      ),
    ).toBe('tap');
  });

  it('classifies displacement just over the slop as drag', () => {
    expect(
      classifyTouch(
        trace([
          [100, 100, 0],
          [100 + TAP_SLOP_PX + 0.5, 100, 50],
        ]),
      ),
    ).toBe('drag');
  });

  it('is drag if ANY intermediate point strays, even when the trace returns home', () => {
    expect(
      classifyTouch(
        trace([
          [100, 100, 0],
          [100, 100 + TAP_SLOP_PX * 2, 40],
          [100, 100, 80],
        ]),
      ),
    ).toBe('drag');
  });

  it('measures diagonal displacement euclideanly', () => {
    const d = TAP_SLOP_PX; // (d, d) diagonal exceeds slop: hypot > TAP_SLOP_PX
    expect(
      classifyTouch(
        trace([
          [0, 0, 0],
          [d, d, 30],
        ]),
      ),
    ).toBe('drag');
  });
});

describe('classifySwipe', () => {
  it('is null for empty and single-point traces', () => {
    expect(classifySwipe([])).toBeNull();
    expect(classifySwipe(trace([[0, 0, 0]]))).toBeNull();
  });

  it('recognizes a fast leftward stroke as left', () => {
    expect(
      classifySwipe(
        trace([
          [200, 100, 0],
          [200 - SWIPE_MIN_PX - 10, 105, 120],
        ]),
      ),
    ).toBe('left');
  });

  it('recognizes a fast rightward stroke as right', () => {
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + SWIPE_MIN_PX + 10, 95, 120],
        ]),
      ),
    ).toBe('right');
  });

  it('accepts a stroke exactly at the min distance', () => {
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + SWIPE_MIN_PX, 100, 120],
        ]),
      ),
    ).toBe('right');
  });

  it('is null just under the min distance', () => {
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + SWIPE_MIN_PX - 1, 100, 120],
        ]),
      ),
    ).toBeNull();
  });

  it('accepts a stroke exactly at the max duration', () => {
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + SWIPE_MIN_PX, 100, SWIPE_MAX_MS],
        ]),
      ),
    ).toBe('right');
  });

  it('is null when the stroke is too slow (stale trace)', () => {
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + SWIPE_MIN_PX * 2, 100, SWIPE_MAX_MS + 1],
        ]),
      ),
    ).toBeNull();
  });

  it('is null for a diagonal with |dy| ≥ |dx| (axis dominance)', () => {
    const d = SWIPE_MIN_PX + 10;
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + d, 100 + d, 120],
        ]),
      ),
    ).toBeNull();
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100 + d, 100 + d + 1, 120],
        ]),
      ),
    ).toBeNull();
  });

  it('is null for a vertical stroke', () => {
    expect(
      classifySwipe(
        trace([
          [100, 100, 0],
          [100, 100 + SWIPE_MIN_PX * 2, 120],
        ]),
      ),
    ).toBeNull();
  });
});
