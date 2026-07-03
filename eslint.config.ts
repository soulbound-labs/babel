import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Flat ESLint config.
 *
 * The load-bearing part is the `boundaries/dependencies` block: it encodes the
 * §2.2 hexagonal dependency rule as lint errors (fails CI), not a code-review
 * convention. `domain` imports nothing outward and no framework; each layer may
 * only reach inward. See docs/doctrine/architecture.md.
 *
 * We run with `checkAllOrigins: true` and `default: 'disallow'`, so the pure
 * core (`domain`/`ports`) is granted ONLY narrow inward allows — every
 * external/core package import is therefore a violation by omission (a stronger,
 * enumeration-free guarantee than a deny-list of framework names). Outer layers
 * are explicitly re-granted external/core, with `convex` clawed back from
 * `render`/`audio` so they reach the backend through a port, never directly.
 */
export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'convex/_generated/', '**/*.txt'],
  },

  // Base TS rules for our source, tests, and executable scripts.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },

  // React hooks + the hexagonal boundary rule — source only.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      boundaries,
      'react-hooks': reactHooks,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      // Order: most specific paths first. Each source file is classified into
      // exactly one architectural element by the folder it lives in.
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'render', pattern: 'src/render' },
        { type: 'audio', pattern: 'src/audio' },
        { type: 'adapters', pattern: 'src/adapters' },
        { type: 'ports', pattern: 'src/ports' },
        { type: 'domain', pattern: 'src/domain' },
      ],
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // §2.2 — the whole point of this unit. Rules are last-write-wins; within a
      // rule, disallow beats allow.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          rules: [
            // --- Inward layer matrix (local element → local element) ---
            { from: { type: 'domain' }, allow: { to: { type: 'domain' } } },
            {
              from: { type: 'ports' },
              allow: { to: { type: ['domain', 'ports'] } },
            },
            {
              from: { type: 'adapters' },
              allow: { to: { type: ['domain', 'ports', 'adapters'] } },
            },
            {
              from: { type: 'render' },
              allow: { to: { type: ['domain', 'ports', 'render'] } },
            },
            {
              from: { type: 'audio' },
              allow: { to: { type: ['domain', 'ports', 'audio'] } },
            },
            {
              from: { type: 'app' },
              allow: {
                to: { type: ['domain', 'ports', 'adapters', 'render', 'audio', 'app'] },
              },
            },

            // --- External/core packages ---
            // domain & ports get NO general external grant → any framework
            // import (react/three/convex/node core) is a violation. This is the
            // deterministic-core invariant, enforced by omission.
            //
            // The SINGLE exception: the pure core may import `@noble/hashes`
            // (audited, zero-dep SHA-256/HMAC — Unit 02 C1). This narrow allow
            // does NOT weaken the guarantee: every other external is still a
            // violation by omission, and `pnpm script:verify-boundaries` still
            // proves `domain → react` is rejected.
            {
              from: { type: 'domain' },
              allow: { to: { origin: 'external' }, dependency: { module: '@noble/hashes' } },
            },
            //
            // Outer layers may use third-party + node core freely...
            {
              from: { type: ['adapters', 'render', 'audio', 'app'] },
              allow: { to: { origin: ['external', 'core'] } },
            },
            // ...except render/audio must not import the Convex backend directly
            // (that is an adapter concern reached through a port).
            {
              from: { type: ['render', 'audio'] },
              disallow: { to: { origin: 'external' }, dependency: { module: 'convex' } },
              message:
                'render/audio must reach the backend through a port, not import convex directly (§2.2).',
            },
          ],
        },
      ],
    },
  },

  // Turn off stylistic rules that would fight Prettier.
  prettier,
);
