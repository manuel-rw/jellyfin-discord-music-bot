import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e-spec.ts',
      '**/helpers/e2e/**',
    ],
    coverage: {
      reporter: ['lcov'],
    },
  },
  plugins: [
    // This is required to build the test files with SWC
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: { type: 'es6' },
    }),
  ],
});
