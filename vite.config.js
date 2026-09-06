import { defineConfig } from 'vite';

export default defineConfig({
  base: '/line-striping-trainer/',
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});
