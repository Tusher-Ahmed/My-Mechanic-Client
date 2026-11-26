import { defineConfig } from "@playwright/test";

/**
 * Test environment (separate from your dev data):
 *  - API on http://localhost:8090 using the database "my-mechanic-e2e" (wiped at start)
 *  - client / admin UI projects are added once those apps are migrated
 * See ../TESTING.md for the full list of test cases.
 */
export const API_PORT = 8090;
export const API_URL = `http://localhost:${API_PORT}/api`;
export const TEST_ADMIN = { email: "admin@e2e.test", password: "AdminPass123" };

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
        CORS_ORIGINS: "http://localhost:5173,http://localhost:5174",
        LOGIN_RATE_LIMIT: "10000",
        CONTACT_RATE_LIMIT: "10000",
        ADMIN_EMAIL: TEST_ADMIN.email,
        ADMIN_PASSWORD: TEST_ADMIN.password,
      },
    },
  ],
});
