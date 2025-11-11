import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/**/*_test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*_test.ts',
        'src/**/*.d.ts',
        'src/types.d.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        branches: 25,
        functions: 50,
        lines: 55,
        statements: 10,
      },
    },
  },
});
