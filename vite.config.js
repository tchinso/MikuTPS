import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs work at both GitHub Pages subpaths and Cloudflare Pages roots.
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    sourcemap: false
  }
});
