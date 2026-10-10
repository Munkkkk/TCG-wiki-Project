import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false, // une seule base de test partagée
    testTimeout: 20000,
  },
});
