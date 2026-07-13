import { defineConfig } from 'vite'

// Honor a PORT assigned by the environment (e.g. the preview harness); fall back to Vite's default.
const port = process.env.PORT ? Number(process.env.PORT) : 5173

export default defineConfig({
  server: { port, host: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
