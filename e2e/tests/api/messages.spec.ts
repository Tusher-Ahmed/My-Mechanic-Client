import { test, expect } from "@playwright/test";

test("API-MSG-01 anyone can send a contact message", async ({ request }) => {
  const res = await request.post("messages", {
    data: { email: "visitor@e2e.test", subject: "Hello", message: "I love this app" },
  });
  expect(res.status()).toBe(201);
});

test("API-MSG-02 contact message is validated", async ({ request }) => {
  const res = await request.post("messages", { data: { email: "bad", subject: "", message: "" } });
  expect(res.status()).toBe(400);
});

test("API-MSG-03 messages cannot be read without admin", async ({ request }) => {
  expect((await request.get("admin/messages")).status()).toBe(401);
});
