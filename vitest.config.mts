import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** The app's import aliases (tsconfig.json paths), so unit tests can import app modules that use them. */
const alias = {
  '@convex': fileURLToPath(new URL('./convex', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'convex',
          environment: 'edge-runtime',
          include: ['convex/**/*.test.ts'],
          server: { deps: { inline: ['convex-test'] } },
          // The first test in each file loads every Convex module (convex-test's import.meta.glob); with all files
          // running in parallel that one-time load can pass 5 s on a laptop. Later tests take milliseconds.
          testTimeout: 20_000,
        },
      },
      {
        test: {
          name: 'unit',
          alias,
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'worker/**/*.test.ts'],
        },
      },
    ],
  },
});
