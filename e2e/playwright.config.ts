import { defineConfig, devices } from "@playwright/test";

/**
 * Test environment (separate from your dev data):
 *  - API on http://localhost:8090 using the database "my-mechanic-e2e" (wiped at start)
 *  - client website on http://localhost:5175 talking to that API
 * See ../TESTING.md for the full list of test cases.
 *
 *   npm run test:api     – backend API tests (no browser)
 *   npm run showcase     – opens a real browser and walks through the app, saving screenshots + video
 */
export const API_PORT = 8090;
export const API_URL = `http://localhost:${API_PORT}/api`;
export const CLIENT_PORT = 5175;
export const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;
export const ADMIN_PORT = 5176;
export const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;
export const TEST_ADMIN = { email: "admin@e2e.test", password: "AdminPass123" };

const needsClient = !process.argv.includes("--project=api");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: `${API_URL}/` },
    },
    {
      name: "showcase",
      testDir: "./tests/showcase",
      testMatch: "**/*.showcase.ts",
      fullyParallel: false,
      timeout: 5 * 60_000,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: CLIENT_URL,
        viewport: { width: 1440, height: 900 },
        video: { mode: "on", size: { width: 1440, height: 900 } },
        launchOptions: { slowMo: Number(process.env.SLOWMO ?? 250) },
        geolocation: { latitude: 23.7937, longitude: 90.4066 }, // Dhaka
        permissions: ["geolocation"],
      },
    },
  ],
  webServer: [
    {
      command: "node scripts/start-test-api.js",
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        MONGO_URL: process.env.E2E_MONGO_URL || "mongodb://127.0.0.1:27017/my-mechanic-e2e",
        JWT_SECRET: "e2e-secret",
        CORS_ORIGINS: `http://localhost:5173,http://localhost:5174,${CLIENT_URL},${ADMIN_URL}`,
        LOGIN_RATE_LIMIT: "10000",
        REGISTER_RATE_LIMIT: "10000",
        CONTACT_RATE_LIMIT: "10000",
        ADMIN_EMAIL: TEST_ADMIN.email,
        ADMIN_PASSWORD: TEST_ADMIN.password,
      },
    },
    ...(needsClient
      ? [
          {
            // production build + preview: tests exactly what gets deployed, no dev-server reloads
            command: `npx vite build --logLevel warn && npx vite preview --port ${CLIENT_PORT} --strictPort`,
            cwd: "../client",
            url: CLIENT_URL,
            reuseExistingServer: false,
            timeout: 120_000,
            env: { VITE_API_URL: API_URL },
          },
          {
            command: `npx vite build --logLevel warn && npx vite preview --port ${ADMIN_PORT} --strictPort`,
            cwd: "../admin",
            url: ADMIN_URL,
            reuseExistingServer: false,
            timeout: 120_000,
            env: { VITE_API_URL: API_URL, VITE_CLIENT_URL: CLIENT_URL },
          },
        ]
      : []),
  ],
});
