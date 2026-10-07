import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { housePlugin } from './server/housePlugin'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/vmeste/' : '/',
  plugins: [react(), housePlugin()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
        support: fileURLToPath(new URL('./support.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
