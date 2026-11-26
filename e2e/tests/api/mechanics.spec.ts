import { test, expect } from "@playwright/test";
import { registerMechanic, uid } from "../../helpers/api";

test("API-MECH-01 public list never exposes email, phone, NID or password", async ({ request }) => {
  const { session } = await registerMechanic(request);
  const list = await (await request.get("mechanics")).json();
  const mine = list.find((m: any) => m._id === session.account._id);
  expect(mine).toBeTruthy();
  expect(mine).toMatchObject({ shopname: session.account.shopname, latitude: 23.78, longitude: 90.28 });
  for (const field of ["email", "phone", "nid", "password"]) expect(mine[field]).toBeUndefined();
});

test("API-MECH-02 search matches shop name or service name", async ({ request }) => {
  const tag = uid();
  const { session } = await registerMechanic(request, {
    services: [{ serviceName: `Turbo tune ${tag}`, price: 1000 }],
  });
  const byService = await (await request.get(`mechanics?q=turbo tune ${tag}`)).json();
  expect(byService.map((m: any) => m._id)).toEqual([session.account._id]);
  const byShop = await (await request.get(`mechanics?q=${encodeURIComponent(session.account.shopname)}`)).json();
  expect(byShop.map((m: any) => m._id)).toEqual([session.account._id]);
  const none = await (await request.get(`mechanics?q=nothing-${tag}`)).json();
  expect(none).toEqual([]);
});

test("API-MECH-03 search text with regex characters is safe", async ({ request }) => {
  const res = await request.get("mechanics?q=.*(");
  expect(res.status()).toBe(200);
});

test("API-MECH-04 single store page is public", async ({ request }) => {
  const { session } = await registerMechanic(request);
  const res = await request.get(`mechanics/${session.account._id}`);
  expect(res.status()).toBe(200);
  const shop = await res.json();
  expect(shop.services).toHaveLength(2);
  expect(shop.email).toBeUndefined();
});

test("API-MECH-05 invalid / unknown shop id", async ({ request }) => {
  expect((await request.get("mechanics/not-an-id")).status()).toBe(400);
  expect((await request.get("mechanics/000000000000000000000000")).status()).toBe(404);
});
