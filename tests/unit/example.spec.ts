import { describe, expect, it } from 'vitest';

/**
 * Canonical passing spec — proves the `node` project + `test:unit:ci` are green
 * and gives downstream units a copyable pattern for pure-function tests.
 */
function add(a: number, b: number): number {
  return a + b;
}

describe('example (harness smoke)', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
