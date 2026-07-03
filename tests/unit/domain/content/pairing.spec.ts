import { describe, expect, it } from 'vitest';

import { ROOM_MAX } from '@/domain/entities/content/config';
import { isqrt, pair, unpair } from '@/domain/entities/content/pairing';

const start = (k: bigint): bigint => 1n + 4n * k * (k - 1n);

describe('Ulam-shell pairing', () => {
  it('INV-5 unpair(pair(n,floor)) === {n,floor} exhaustively for |n|,|floor| ≤ 512', () => {
    let bad = 0;
    for (let n = -512; n <= 512; n++) {
      for (let f = -512; f <= 512; f++) {
        const r = pair(BigInt(n), BigInt(f));
        const back = unpair(r);
        if (back.n !== BigInt(n) || back.floor !== BigInt(f)) bad++;
      }
    }
    expect(bad).toBe(0);
  });

  it('INV-5 pair(unpair(k)) === k exhaustively for k < 4·10⁶', () => {
    let bad = 0;
    for (let k = 0; k < 4_000_000; k++) {
      const bk = BigInt(k);
      const c = unpair(bk);
      if (pair(c.n, c.floor) !== bk) bad++;
    }
    expect(bad).toBe(0);
  });

  it('INV-6 pair(unpair(k)) === k at large ring boundaries and near ROOM_MAX', () => {
    const Ks = [1000n, 1_000_000n, 1_000_000_000n, 10n ** 15n, 10n ** 30n, 10n ** 60n, 10n ** 90n];
    const probes: bigint[] = [];
    for (const K of Ks) {
      // last cell of ring K-1, first/second cell of ring K, and a mid-ring cell
      probes.push(start(K) - 1n, start(K), start(K) + 1n, start(K) + 4n * K);
    }
    // the actual addressable ceiling — exercises isqrt on a ~366-bit bigint
    probes.push(ROOM_MAX - 1n, ROOM_MAX - 2n, ROOM_MAX / 2n, ROOM_MAX - 10_496_000n);
    for (const x of probes) {
      const c = unpair(x);
      expect(pair(c.n, c.floor)).toBe(x);
    }
  });

  it('isqrt is the exact floor square root at all scales', () => {
    for (const v of [0n, 1n, 2n, 3n, 4n, 15n, 16n, 17n, 10n ** 40n, 10n ** 100n, ROOM_MAX]) {
      const r = isqrt(v);
      expect(r * r <= v).toBe(true);
      expect((r + 1n) * (r + 1n) > v).toBe(true);
    }
  });
});
