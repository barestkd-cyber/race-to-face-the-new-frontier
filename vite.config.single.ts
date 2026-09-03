/**
 * Single-file build.
 *
 * Produces one self-contained bundle so the whole game can be inlined into a
 * single HTML document and hosted anywhere — no dev server, no local network,
 * no firewall. Saves still work: the persistence layer falls back through
 * IndexedDB, localStorage, and memory on its own.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    outDir: 'dist-single',
    // One chunk, classic script format, so it can be dropped inline without
    // module resolution or CORS getting involved.
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
