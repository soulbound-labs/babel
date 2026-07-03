#!/usr/bin/env tsx
/**
 * Proves the hexagonal dependency rule (§2.2) is LIVE, not a false-green (E2).
 *
 * Strategy: write a throwaway file under src/domain/entities/ that imports
 * `react` — a forbidden framework import for the pure core — run ESLint on just
 * that file, and require a NON-zero exit (i.e. ESLint reported the violation).
 * If ESLint exits 0, enforcement is broken and CI must fail.
 *
 * The probe MUST live under src/domain/entities/ (the `entities` boundary
 * element). A probe elsewhere under src/domain/ would not be classified as the
 * pure core, silently changing what this proof asserts.
 *
 * Run with tsx (see docs/doctrine/tooling-doctrine.md — no JS in this repo):
 *   pnpm script:verify-boundaries
 */
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PROBE = join('src', 'domain', 'entities', '__boundaries_probe__.ts');
const ESLINT = join('node_modules', '.bin', 'eslint');

interface EslintFailure {
  status?: number;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
}

function runEslintOnProbe(): { exitCode: number; output: string } {
  try {
    execFileSync(ESLINT, [PROBE], { stdio: 'pipe' });
    return { exitCode: 0, output: '' };
  } catch (err) {
    const e = err as EslintFailure;
    return {
      exitCode: typeof e.status === 'number' ? e.status : 1,
      output: `${e.stdout ?? ''}${e.stderr ?? ''}`,
    };
  }
}

function main(): void {
  writeFileSync(
    PROBE,
    [
      '// TEMPORARY probe written by scripts/verify-boundaries.ts — must be deleted.',
      "import { useState } from 'react';",
      'export const forbidden = useState;',
      '',
    ].join('\n'),
  );

  let result: { exitCode: number; output: string };
  try {
    result = runEslintOnProbe();
  } finally {
    rmSync(PROBE, { force: true });
  }

  if (result.exitCode === 0) {
    console.error(
      '✖ boundaries false-green: ESLint did NOT reject an `entities → react` import.\n' +
        '  The §2.2 dependency rule is not enforcing. Fix eslint.config.ts.',
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

  console.log('✔ boundaries enforced: `entities → react` is correctly rejected by ESLint.');
  process.exit(0);
}

main();
