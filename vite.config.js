import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/nav-portal/',
  server: {
    port: 3000,
    host: true
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          return `assets/[name][extname]`;
        },
        manualChunks: {
          three: ['three'],
        }
      }
    }
  }
})
