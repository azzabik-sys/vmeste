import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { housePlugin } from './server/housePlugin'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/vmeste/' : '/',
  plugins: [react(), housePlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
