import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Use 'jsdom' for testing browser code
    include: ['tests/unit/**/*.test.js'],
    setupFiles: ['tests/setup.js'], // Add this line
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['js/lib/'],
    },
    transformMode: {
      web: [/.[tj]sx?$/],
    },
  },
})
