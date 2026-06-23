import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs work for both https://user.github.io/MikuTPS/ and custom domains.
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    sourcemap: false
  }
});
