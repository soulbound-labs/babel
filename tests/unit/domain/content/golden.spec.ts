import { describe, expect, it } from 'vitest';

import { line } from '@/domain/entities/content/cipher';

/**
 * INV-14 — THE GOLDEN VECTOR. The single most important test in the repo.
 *
 * ⚠️ FROZEN FOREVER. This 80-char string is the infrastructure-enforced proof
 * that the deterministic library is actually deterministic across every future
 * refactor, dependency bump, and the eventual Rust→WASM swap (which must
 * reproduce it byte-for-byte or fail CI). **Regenerating it is forbidden** — a
 * change here means the whole library silently drifted (spec §6 E5).
 *
 * Generated once via `tsx scripts/print-golden.ts` with BABEL_KEY = 'babel/v1/genesis'.
 */
const GOLDEN_ORIGIN_LINE =
  'egfwzeujlb,i,lfqimvdg yjzsctf.xxmi.qe,aalpoedumdoswfpnfewrkhqprsfpgssv pfyfyrumq';

describe('golden vector (INV-14)', () => {
  it('line(origin) equals the committed, frozen 80-char string', () => {
    const origin = { n: 0n, floor: 0n, wall: 0, shelf: 0, volume: 0, page: 0, line: 0 };
    expect(line(origin).join('')).toBe(GOLDEN_ORIGIN_LINE);
  });
});
