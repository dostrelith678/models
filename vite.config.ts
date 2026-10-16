import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The repository is published as a GitHub Pages *project site*, so every asset
// URL has to be served from https://<user>.github.io/models/ rather than the
// domain root. `base` keeps the built output prefix-correct.
export default defineConfig({
  base: '/models/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
