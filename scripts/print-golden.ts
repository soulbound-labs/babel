#!/usr/bin/env tsx
/**
 * ONE-OFF (spec §11 Step 4.3). Prints the origin line so it can be hard-coded
 * into tests/unit/domain/content/golden.spec.ts as the immutable library lock
 * (INV-14). Run once with `tsx scripts/print-golden.ts`.
 *
 * ⚠️ The captured string is FROZEN. Regenerating it after commit is forbidden —
 * it would silently redefine the entire library (§6 E5). Relative import because
 * tsx does not resolve the `@/` tsconfig alias without a loader.
 */
import { line } from '../src/domain/entities/index';

const origin = { n: 0n, floor: 0n, wall: 0, shelf: 0, volume: 0, page: 0, line: 0 };
process.stdout.write(line(origin).join('') + '\n');
