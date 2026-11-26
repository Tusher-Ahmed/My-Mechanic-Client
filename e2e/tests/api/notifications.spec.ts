import { test, expect } from "@playwright/test";
import { API_URL } from "../../playwright.config";
import { auth, createOrderFixture, registerMechanic, registerUser } from "../../helpers/api";

const list = async (request, token) => (await request.get("notifications", auth(token))).json();

test("API-NOTIF-01 new order notifies the mechanic", async ({ request }) => {
  const { mech, user } = await createOrderFixture(request);
  const { items, unread } = await list(request, mech.session.token);
  expect(unread).toBe(1);
  expect(items[0]).toMatchObject({ type: "order_new", read: false, link: "/mechanic" });
  expect(items[0].title).toContain(user.body.username);
  expect(items[0].body).toContain("Oil change");
});

test("API-NOTIF-02 accept and complete notify the customer", async ({ request }) => {
  const { mech, user, order } = await createOrderFixture(request);
  await request.patch(`orders/${order._id}/status`, { data: { status: "accepted" }, ...auth(mech.session.token) });
  await request.patch(`orders/${order._id}/status`, { data: { status: "completed" }, ...auth(mech.session.token) });
  const { items, unread } = await list(request, user.session.token);
  expect(unread).toBe(2);
  expect(items.map((n) => n.type)).toEqual(["order_completed", "order_accepted"]);
  expect(items[1].link).toBe("/account");
});

test("API-NOTIF-03 cancel/decline notify the other party only", async ({ request }) => {
  const a = await createOrderFixture(request);
  await request.patch(`orders/${a.order._id}/status`, { data: { status: "cancelled" }, ...auth(a.user.session.token) });
  expect((await list(request, a.mech.session.token)).items.map((n) => n.type)).toEqual(["order_cancelled", "order_new"]);
  expect((await list(request, a.user.session.token)).items).toEqual([]);

  const b = await createOrderFixture(request);
  await request.patch(`orders/${b.order._id}/status`, { data: { status: "cancelled" }, ...auth(b.mech.session.token) });
  const userNotes = (await list(request, b.user.session.token)).items;
  expect(userNotes).toHaveLength(1);
  expect(userNotes[0].title).toContain("declined");
});

test("API-NOTIF-04 mark one as read, then mark all as read", async ({ request }) => {
  const { mech } = await createOrderFixture(request);
  const user2 = await registerUser(request);
  // second order to the same mechanic
  const services = mech.session.account.services;
  await request.post("orders", { data: { mechanicId: mech.session.account._id, serviceIds: [services[0]._id] }, ...auth(user2.session.token) });

  let data = await list(request, mech.session.token);
  expect(data.unread).toBe(2);
  const one = await request.patch(`notifications/${data.items[0]._id}/read`, auth(mech.session.token));
  expect((await one.json()).read).toBe(true);
  expect((await list(request, mech.session.token)).unread).toBe(1);

  const all = await request.post("notifications/read-all", auth(mech.session.token));
  expect((await all.json()).updated).toBe(1);
  data = await list(request, mech.session.token);
  expect(data.unread).toBe(0);
  expect(data.items.every((n) => n.read)).toBe(true);
});

test("API-NOTIF-05 notifications are private", async ({ request }) => {
  const { mech } = await createOrderFixture(request);
  const stranger = await registerMechanic(request);
  const { items } = await list(request, mech.session.token);
  expect((await list(request, stranger.session.token)).items).toEqual([]);
  expect((await request.patch(`notifications/${items[0]._id}/read`, auth(stranger.session.token))).status()).toBe(404);
  expect((await request.get("notifications")).status()).toBe(401);
});

test("API-NOTIF-06 live stream rejects a missing/invalid token", async ({ request }) => {
  expect((await request.get("notifications/stream")).status()).toBe(401);
  expect((await request.get("notifications/stream?token=bad")).status()).toBe(401);
});

test("API-NOTIF-07 live stream delivers a notification instantly", async ({ request }) => {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);

  const controller = new AbortController();
  const res = await fetch(`${API_URL}/notifications/stream?token=${mech.session.token}`, { signal: controller.signal });
  expect(res.headers.get("content-type")).toContain("text/event-stream");
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const waitFor = async (event: string) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const block = buffer.split("\n\n").find((b) => b.includes(`event: ${event}`));
      if (block) return JSON.parse(block.split("\n").find((l) => l.startsWith("data: "))!.slice(6));
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    throw new Error(`no "${event}" event received`);
  };

  try {
    await waitFor("ready");
    const s = mech.session.account.services[0];
    await request.post("orders", { data: { mechanicId: mech.session.account._id, serviceIds: [s._id] }, ...auth(user.session.token) });
    const n = await waitFor("notification");
    expect(n.type).toBe("order_new");
    expect(n.title).toContain(user.body.username);
  } finally {
    controller.abort();
  }
});
