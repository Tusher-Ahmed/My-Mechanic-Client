import { test, expect } from "@playwright/test";

test("API-HEALTH-01 health endpoint reports DB connected", async ({ request }) => {
  const res = await request.get("health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok", db: "connected" });
});

test("API-HEALTH-02 unknown route returns JSON 404", async ({ request }) => {
  const res = await request.get("does-not-exist");
  expect(res.status()).toBe(404);
  expect((await res.json()).message).toContain("Route not found");
});

test("API-HEALTH-03 CORS allows the frontend origin", async ({ request }) => {
  const res = await request.get("health", { headers: { Origin: "http://localhost:5173" } });
  expect(res.headers()["access-control-allow-origin"]).toBe("http://localhost:5173");
});

test("API-HEALTH-04 CORS rejects unknown origins", async ({ request }) => {
  const res = await request.get("health", { headers: { Origin: "https://evil.example" } });
  expect(res.headers()["access-control-allow-origin"]).toBeUndefined();
});
