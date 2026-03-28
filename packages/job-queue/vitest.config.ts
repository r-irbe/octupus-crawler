import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.property.test.ts', 'src/**/*.integration.test.ts'],
      thresholds: { lines: 90, branches: 85 },
      reporter: ['text', 'lcov', 'json-summary'],
    },
    reporters: ['default', 'junit'],
    outputFile: { junit: './test-results/junit.xml' },
  },
});
