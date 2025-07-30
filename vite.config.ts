import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // ← add this

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 8080
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ← this tells Vite what "@" means
    },
  },
})
