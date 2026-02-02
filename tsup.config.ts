import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/manager.tsx', 'src/preview.ts', 'src/preset.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'storybook', 'zod'],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
});
