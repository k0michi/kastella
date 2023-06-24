import { defineConfig } from 'vite';
import * as path from 'path';
import target from 'vite-plugin-target';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main/preload.ts'),
      formats: ['cjs'],
      fileName: () => '[name].js',
    },
    outDir: 'dist/preload',
    minify: false,
  },
  plugins: [
    target({
      'electron-preload': {},
    }),
  ]
});