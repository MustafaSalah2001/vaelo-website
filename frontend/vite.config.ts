import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "/" for normal hosting. Set VITE_BASE=./ together with VITE_ROUTER=hash to serve
  // the static build from a sub-path (e.g. GitHub Pages) without rewrite rules.
  base: process.env.VITE_BASE ?? '/',
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep the 3D stack out of the first-load bundle.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber'],
          motion: ['gsap', 'framer-motion']
        }
      }
    }
  },
  server: { port: 5174 }
});
