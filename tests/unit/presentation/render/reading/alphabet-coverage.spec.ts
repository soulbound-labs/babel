import { describe, expect, it } from 'vitest';

// TEST-ONLY private import (KDD-6/INV-B10): production code must never reach
// past the frozen barrel — this pin is exactly why the test may.
import { ALPHABET } from '@/domain/entities/content/config';
import {
  ATLAS_CHARS,
  hasExplicitSpaceCell,
  prewarmText,
} from '@/presentation/render/reading/atlas';

describe('atlas alphabet coverage (INV-B10)', () => {
  it('the local atlas char set equals the core ALPHABET set', () => {
    expect(new Set(ATLAS_CHARS)).toEqual(new Set([...ALPHABET]));
  });

  it('preserves the core ordering exactly (index 0 = space, 1..26 = a..z, 27 = comma, 28 = period)', () => {
    expect(ATLAS_CHARS).toBe(ALPHABET);
    expect(ATLAS_CHARS).toHaveLength(29);
  });

  it('an explicit space cell exists (content AND left-pad, never a missing-glyph box)', () => {
    expect(hasExplicitSpaceCell()).toBe(true);
    expect(prewarmText()).toContain(' ');
    expect(prewarmText()).toHaveLength(29);
  });
});
