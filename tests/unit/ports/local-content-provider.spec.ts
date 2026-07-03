import { describe, expect, it } from 'vitest';

import { LocalContentProvider } from '@/adapters/content/local-content-provider';
import type { LineAddress } from '@/domain/entities';
import { ORIGIN } from '@/domain/entities';

describe('LocalContentProvider (port adapter)', () => {
  const provider = new LocalContentProvider();
  const originAddress: LineAddress = { ...ORIGIN, wall: 0, shelf: 0, volume: 0, page: 0, line: 0 };

  it('returns an 80-glyph line for the origin address', () => {
    expect(provider.line(originAddress)).toHaveLength(80);
  });

  it('round-trips through the port: inverse(line(a)) === a', () => {
    expect(provider.inverse(provider.line(originAddress))).toEqual(originAddress);
  });
});
