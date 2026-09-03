import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration.
 *
 * MIGRATION CONTRACT NOTES
 * ------------------------
 * Contract Part 5 defines fourteen mandatory verification categories. Vitest
 * covers the programmatic ones (V-05 DB writes, V-06 DB reads, V-07 forms,
 * V-08 validation, V-11 AJAX/API, V-12 error handling).
 *
 * The DOM-diff, screenshot, console and network categories (V-01, V-02,
 * V-13, V-14) require a browser driver, which is NOT installed in Milestone 0.
 * Selecting and installing that tooling is Milestone 0's remaining
 * infrastructure task and is recorded as Outstanding Issue OI-3.
 *
 * NO COVERAGE THRESHOLD IS SET. Contract §8.3 explicitly excludes test
 * coverage percentage from the success criteria. Fidelity is measured by
 * baseline diffing (contract T-1, T-2), not by coverage numbers. Setting a
 * threshold would create pressure to write tests that satisfy a metric rather
 * than prove parity.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
