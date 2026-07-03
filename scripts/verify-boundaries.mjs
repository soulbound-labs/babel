#!/usr/bin/env node
/**
 * Proves the hexagonal dependency rule (§2.2) is LIVE, not a false-green (E2).
 *
 * Strategy: write a throwaway file under src/domain/ that imports `react` — a
 * forbidden framework import for the pure core — run ESLint on just that file,
 * and require a NON-zero exit (i.e. ESLint reported the violation). If ESLint
 * exits 0, enforcement is broken and CI must fail.
 *
 * This is the infrastructure that turns "keep the core pure" from a convention
 * into a checked invariant. See docs/doctrine/01-frozen-contracts.md.
 */
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PROBE = join('src', 'domain', '__boundaries_probe__.ts');
const ESLINT = join('node_modules', '.bin', 'eslint');

function runEslintOnProbe() {
  try {
    execFileSync(ESLINT, [PROBE], { stdio: 'pipe' });
    return { exitCode: 0, output: '' };
  } catch (err) {
    return {
      exitCode: typeof err.status === 'number' ? err.status : 1,
      output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    };
  }
}

function main() {
  writeFileSync(
    PROBE,
    [
      '// TEMPORARY probe written by scripts/verify-boundaries.mjs — must be deleted.',
      "import { useState } from 'react';",
      'export const forbidden = useState;',
      '',
    ].join('\n'),
  );

  let result;
  try {
    result = runEslintOnProbe();
  } finally {
    rmSync(PROBE, { force: true });
  }

  if (result.exitCode === 0) {
    console.error(
      '✖ boundaries false-green: ESLint did NOT reject a `domain → react` import.\n' +
        '  The §2.2 dependency rule is not enforcing. Fix eslint.config.js.',
    );
    process.exit(1);
  }

  const sawRule = result.output.includes('boundaries/dependencies');
  if (!sawRule) {
    console.error(
      '✖ ESLint failed on the probe, but NOT via boundaries/dependencies:\n' + result.output,
    );
    process.exit(1);
  }

  console.log('✔ boundaries enforced: `domain → react` is correctly rejected by ESLint.');
  process.exit(0);
}

main();
