import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import copy from 'rollup-plugin-copy';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist/renderer',
    target: 'es2021',
    rollupOptions: {
      plugins: [
        copy({
          targets: [
            {
              src: 'node_modules/@excalidraw/excalidraw/dist/excalidraw-assets',
              dest: 'dist/excalidraw-assets'
            },
            {
              src: 'node_modules/@excalidraw/excalidraw/dist/excalidraw-assets-dev',
              dest: 'dist/excalidraw-assets-dev'
            }
          ]
        })
      ]
    }
  },
  publicDir: 'dist'
});