import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { statSync } from 'fs'
import { join } from 'path'

// In a git worktree .git is a file, not a directory — default to 5174 to
// avoid clashing with the main repo's dev server on 5173.
const isWorktree = statSync(join(import.meta.dirname, '.git')).isFile()
const defaultPort = isWorktree ? 5174 : 5173

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/untangle/' : '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Untangle',
        short_name: 'Untangle',
        description: 'Get things done at any energy level',
        theme_color: '#863bff',
        background_color: '#863bff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || defaultPort,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
