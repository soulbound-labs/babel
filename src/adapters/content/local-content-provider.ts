/**
 * LocalContentProvider (spec §3.7, §7.2) — implements the Unit 01 `ContentProvider`
 * port by delegating to the pure domain core. This is the injection seam for a
 * future `WasmContentProvider`, which must reproduce the golden vector byte-for-byte.
 */
import { inverse as domainInverse, line as domainLine } from '../../domain/entities';
import type { Address, ContentProvider, Glyph } from '../../domain/ports';

export class LocalContentProvider implements ContentProvider {
  line(address: Address): Glyph[] {
    return domainLine(address);
  }

  inverse(glyphs: Glyph[]): Address | null {
    return domainInverse(glyphs);
  }
}
