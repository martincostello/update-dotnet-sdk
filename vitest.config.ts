import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      reporter: ['html', 'json', 'text'],
      include: ['src/**/*.ts'],
    },
    reporters: ['default', 'github-actions'],
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
