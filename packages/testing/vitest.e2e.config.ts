import { defineConfig } from 'vitest/config';

/** E2E tests MUST run serially — they share a single K8s cluster */
export default defineConfig({
  test: {
    globals: false,
    include: ['src/e2e/**/*.e2e.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 180_000,
    hookTimeout: 180_000,
    passWithNoTests: true,
    reporters: ['default', 'junit'],
    outputFile: { junit: './test-results/e2e-junit.xml' },
  },
});
