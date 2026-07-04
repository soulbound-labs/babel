import { describe, expect, it } from 'vitest';

import { EYE_HEIGHT, HEX_APOTHEM } from '@/presentation/render/room/dimensions';
import { parsePoseParam, POSES, SPAWN_POSE } from '@/presentation/render/debug/poses';

/**
 * The Unit 03 frozen references (§4.4): P1–P4 are load-bearing mood-gate
 * captures — any drift silently invalidates every downstream regression. These
 * literals are copied from the committed Unit 03 definitions; the test fails
 * loudly if a Unit 04 edit perturbs them.
 */
const FROZEN_P1_TO_P4 = [
  {
    position: { x: 0, y: EYE_HEIGHT, z: HEX_APOTHEM - 0.55 },
    yaw: (40 * Math.PI) / 180,
    pitch: 0,
  },
  {
    position: { x: 0, y: EYE_HEIGHT, z: 1.05 },
    yaw: 0,
    pitch: (-62 * Math.PI) / 180,
  },
  {
    position: { x: 0.82, y: EYE_HEIGHT, z: 0.48 },
    yaw: (-120 * Math.PI) / 180,
    pitch: 0,
  },
  {
    position: { x: -0.45, y: EYE_HEIGHT, z: -2.05 },
    yaw: (-18 * Math.PI) / 180,
    pitch: 0,
  },
];

describe('camera poses (§4.4)', () => {
  it('P1–P4 deep-equal their frozen Unit 03 definitions (regression canary)', () => {
    for (let i = 0; i < 4; i++) {
      expect(POSES[i]).toEqual(FROZEN_P1_TO_P4[i]);
    }
  });

  it('P1–P4 carry NO logical coordinate — they are interior origin poses', () => {
    for (let i = 0; i < 4; i++) {
      expect(POSES[i]?.coordinate).toBeUndefined();
    }
  });

  it('SPAWN_POSE is P1, the single source', () => {
    expect(SPAWN_POSE).toBe(POSES[0]);
  });

  it('P5–P8 each carry a logical (n, floor) bigint coordinate to teleport to', () => {
    expect(POSES).toHaveLength(12);
    for (let i = 4; i < 8; i++) {
      const coord = POSES[i]?.coordinate;
      expect(coord).toBeDefined();
      expect(typeof coord?.n).toBe('bigint');
      expect(typeof coord?.floor).toBe('bigint');
    }
  });

  it('P1–P8 carry NO book field — the Unit 05 extension is additive (§4.7)', () => {
    for (let i = 0; i < 8; i++) {
      expect(POSES[i]?.book).toBeUndefined();
    }
  });

  it('P9–P12 pin the golden address: origin room, first book, first page', () => {
    for (let i = 8; i < 12; i++) {
      const book = POSES[i]?.book;
      expect(book).toBeDefined();
      expect(book?.address.n).toBe(0n);
      expect(book?.address.floor).toBe(0n);
      expect(book?.address.wall).toBe(0);
      expect(book?.address.shelf).toBe(0);
      expect(book?.address.volume).toBe(0);
      expect(book?.address.page).toBe(0);
      expect(POSES[i]?.coordinate).toEqual({ n: 0n, floor: 0n });
    }
  });

  it('P9–P12 phases: approach 0.5 / 60 of 80 / turnProgress 0.5 / fully resolved', () => {
    expect(POSES[8]?.book?.phase).toEqual({ approach: 0.5 });
    expect(POSES[9]?.book?.phase).toEqual({ revealedLines: 60 });
    expect(POSES[10]?.book?.phase).toEqual({ revealedLines: 80, turnProgress: 0.5 });
    expect(POSES[11]?.book?.phase).toEqual({ revealedLines: 80 });
  });

  it('P7 sits near the n = 64 edge (edge − ramp/2 = 62), inside the walkable bound', () => {
    const p7 = POSES[6]?.coordinate;
    expect(p7?.n).toBe(62n);
    expect(p7?.n).toBeLessThanOrEqual(64n);
  });

  describe('parsePoseParam (E7)', () => {
    it('parses 1–12 to the matching pose', () => {
      for (let n = 1; n <= 12; n++) {
        expect(parsePoseParam(`?pose=${n}`)).toBe(POSES[n - 1]);
      }
    });

    it('rejects 0, 13, and out-of-range with null (normal spawn)', () => {
      expect(parsePoseParam('?pose=0')).toBeNull();
      expect(parsePoseParam('?pose=13')).toBeNull();
      expect(parsePoseParam('?pose=100')).toBeNull();
      expect(parsePoseParam('?pose=-1')).toBeNull();
    });

    it('rejects garbage and missing param with null', () => {
      expect(parsePoseParam('?pose=abc')).toBeNull();
      expect(parsePoseParam('?pose=2.5')).toBeNull();
      expect(parsePoseParam('?pose=')).toBeNull();
      expect(parsePoseParam('')).toBeNull();
      expect(parsePoseParam('?debug')).toBeNull();
    });
  });
});
