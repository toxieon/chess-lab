import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works on GitHub Pages project URLs
// (https://<user>.github.io/chess-lab/) and under `vite preview`.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    sourcemap: false,
  },
});
