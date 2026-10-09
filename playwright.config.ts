import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5180',
    url: 'http://localhost:5180',
    reuseExistingServer: false,
    env: {
      // Exclusivo dos testes: as requisições são interceptadas, nunca enviadas ao Supabase.
      VITE_SUPABASE_URL: 'https://auth.editaltrack.test',
      VITE_SUPABASE_ANON_KEY: 'public-placeholder-for-intercepted-tests',
    },
  },
})
