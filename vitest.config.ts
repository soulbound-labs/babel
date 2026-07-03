import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Unit-only test harness (C5). Two projects:
 *   - `node`  : pure domain/ports/presentation-logic specs (.ts) — fast, no DOM.
 *   - `jsdom` : app/presentation component specs (.tsx) — needs a DOM.
 * `tests/unit/` mirrors `src/`. Coverage is configured (report-only); thresholds
 * arrive with Unit 02's real logic. integration/ and e2e/ are post-MVP.
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'tests/unit/*.{test,spec}.ts',
            'tests/unit/{domain,ports}/**/*.{test,spec}.{ts,tsx}',
            'tests/unit/presentation/**/*.{test,spec}.ts',
          ],
        },
      },
      {
        plugins: [react(), tsconfigPaths()],
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['tests/unit/{app,presentation}/**/*.{test,spec}.tsx'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      // Unit 02: gate the deterministic core at ≥95% (spec §8). Other layers are
      // report-only until their units land. Enforced when coverage runs
      // (`vitest run --coverage`).
      thresholds: {
        'src/domain/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
      },
    },
  },
});
