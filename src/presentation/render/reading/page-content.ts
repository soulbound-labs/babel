/**
 * Page assembly (§4.1, KDD-4) — pure consumer of the frozen core. A page is
 * 40 `line()` calls (~1 ms worst-case, Unit 02) assembled ONCE on page-open
 * into a frozen 40×80 buffer, memoized by the 6-tuple
 * `(n, floor, wall, shelf, volume, page)`. Streaming is a render-time reveal
 * over this buffer — `line()` is never called per-frame or per-line reveal
 * (INV-B5), and the reveal never mutates the buffer (INV-B2).
 *
 * KDD-6: imports ONLY the frozen `@/domain/entities` barrel. Determinism makes
 * the cache trivially correct; a small bounded LRU keeps memory flat.
 */
import { line } from '../../../domain/entities';
import type { Glyph } from '../../../domain/entities';
import { PAGE_LINES } from '../room/dimensions';
import type { PageAddress } from './book-address';

export type PageBuffer = readonly (readonly Glyph[])[];

const MAX_CACHED_PAGES = 8; // a reading session turns pages one at a time
const cache = new Map<string, PageBuffer>();

function cacheKey(base: PageAddress): string {
  return `${base.n}:${base.floor}:${base.wall}:${base.shelf}:${base.volume}:${base.page}`;
}

/** The 40×80 glyph buffer of one page — frozen, memoized, byte-stable. */
export function openPage(base: PageAddress): PageBuffer {
  const key = cacheKey(base);
  const hit = cache.get(key);
  if (hit) return hit;

  const rows: PageBuffer = Object.freeze(
    Array.from({ length: PAGE_LINES }, (_, l) =>
      Object.freeze(
        line({
          n: base.n,
          floor: base.floor,
          wall: base.wall,
          shelf: base.shelf,
          volume: base.volume,
          page: base.page,
          line: l,
        }),
      ),
    ),
  );

  if (cache.size >= MAX_CACHED_PAGES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, rows);
  return rows;
}
