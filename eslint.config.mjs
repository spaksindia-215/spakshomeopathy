import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint configuration.
 *
 * MIGRATION CONTRACT NOTES
 * ------------------------
 * Contract §5.2 permits standard tooling applied to NEW code only. Lint
 * rules must never be allowed to drive behavioral change:
 *
 * - `react/no-danger` is NOT enabled. Blueprint P-14 / R-30 require
 *   reproducing Laravel's unescaped `{!! !!}` output via
 *   dangerouslySetInnerHTML. A lint rule forbidding it would push an
 *   engineer toward escaping output, changing rendered HTML (contract F-8).
 *
 * - `jsx-a11y` accessibility rules are NOT enabled. Contract §3.2 places
 *   accessibility remediation out of scope; a11y warnings would create
 *   pressure to alter markup, violating NN-5.
 *
 * - `@next/next/no-img-element` is disabled. The Laravel app uses plain
 *   <img> tags; contract F-29 forbids switching to next/image.
 *
 * - `@next/next/no-sync-scripts` is disabled. Laravel's Blade views load
 *   jQuery, Bootstrap, and plugin scripts as plain synchronous <script>
 *   tags in a specific, load-bearing order (jQuery before plugins before
 *   theme.js). Adding `async`/`defer` — the rule's suggested fix — would
 *   change execution order and timing, which is a JS-behavior change
 *   forbidden by contract NN-1/F-9. This is a lint-rule accommodation
 *   with zero effect on rendered output or runtime behavior.
 *
 * - `@next/next/no-css-tags` is disabled. The Metadata API cannot emit
 *   <link rel="stylesheet"> tags at all, so `PublicStylesheets` renders
 *   them directly with React's `precedence` prop (the documented hoisting
 *   mechanism — see PublicStylesheets.tsx). The rule's suggested
 *   alternative (a CSS import) does not exist for these Laravel-served,
 *   unbundled stylesheet files.
 */
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@next/next/no-img-element': 'off',
      '@next/next/no-sync-scripts': 'off',
      '@next/next/no-css-tags': 'off',
      'jsx-a11y/alt-text': 'off',
      'jsx-a11y/aria-props': 'off',
      'jsx-a11y/aria-proptypes': 'off',
      'jsx-a11y/aria-unsupported-elements': 'off',
      'jsx-a11y/role-has-required-aria-props': 'off',
      'jsx-a11y/role-supports-aria-props': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'public/**',
      'baseline/**',
      // Playwright generated output. `playwright-report/` embeds the minified
      // trace-viewer bundle, which ESLint would otherwise parse and report
      // thousands of violations in. These are Playwright's own build
      // artifacts, not project source, and are gitignored.
      'playwright-report/**',
      'test-results/**',
      // OI-12 asset audit working dirs. `.audit-cache/` holds vendor JS fetched
      // verbatim from production (jQuery, Bootstrap, Isotope, …) as AUDIT
      // EVIDENCE, and `.asset-backup/` holds pre-change copies. Neither is
      // project source. Linting them is meaningless and, worse, would invite
      // "fixing" third-party code that contract F-30/F-23 require shipping
      // unchanged. Same rationale as `public/**` above.
      '.audit-cache/**',
      '.asset-backup/**',
      'next-env.d.ts',
      'src/lib/db/schema.generated.ts',
    ],
  },
];

export default eslintConfig;
