import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@schede/exercise-selection': path.resolve(root, '../exercise-selection/src/index.ts'),
      '@shared': path.resolve(root, '../../shared'),
    },
  },
});
