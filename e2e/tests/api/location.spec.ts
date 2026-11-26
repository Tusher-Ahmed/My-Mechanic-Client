import { test, expect } from "@playwright/test";
import { API_URL } from "../../playwright.config";
import { auth, CAR, loginAdmin, registerMechanic, registerUser } from "../../helpers/api";

const DHAKA = { latitude: 23.8103, longitude: 90.4125, accuracy: 15 };

async function sharedOrder(request, { share = true } = {}) {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);
  const res = await request.post("orders", {
    data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR, shareLocation: share, location: share ? DHAKA : undefined },
    ...auth(user.session.token),
  });
  return { user, mech, order: await res.json() };
}
const mechView = async (request, mech) => (await (await request.get("orders/mine", auth(mech.session.token))).json())[0];
const accept = (request, mech, order) => request.patch(`orders/${order._id}/status`, { data: { status: "accepted" }, ...auth(mech.session.token) });
const move = (request, user, order, data) => request.patch(`orders/${order._id}/location`, { data, ...auth(user.session.token) });

test("API-LOC-01 location is hidden from the mechanic until they accept", async ({ request }) => {
  const { user, mech, order } = await sharedOrder(request);
  expect(order.customerLocation).toMatchObject({ latitude: DHAKA.latitude, longitude: DHAKA.longitude }); // customer sees own
  expect((await mechView(request, mech)).customerLocation).toBeUndefined();

  await accept(request, mech, order);
  const seen = await mechView(request, mech);
  expect(seen.shareLocation).toBe(true);
  expect(seen.customerLocation).toMatchObject({ latitude: DHAKA.latitude, longitude: DHAKA.longitude, accuracy: 15 });
  expect(seen.customerLocation.updatedAt).toBeTruthy();
  void user;
});

test("API-LOC-02 without consent no location is stored or shown", async ({ request }) => {
  const { mech, order } = await sharedOrder(request, { share: false });
  expect(order.shareLocation).toBe(false);
  await accept(request, mech, order);
  expect((await mechView(request, mech)).customerLocation).toBeUndefined();
});

test("API-LOC-03 live updates reach the mechanic instantly over the stream", async ({ request }) => {
  const { user, mech, order } = await sharedOrder(request);
  await accept(request, mech, order);

  const controller = new AbortController();
  const res = await fetch(`${API_URL}/notifications/stream?token=${mech.session.token}`, { signal: controller.signal });
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
    throw new Error(`no ${event}`);
  };
  try {
    await waitFor("ready");
    expect((await move(request, user, order, { latitude: 23.82, longitude: 90.42, accuracy: 8 })).status()).toBe(200);
    const evt = await waitFor("order:location");
    expect(evt.orderId).toBe(order._id);
    expect(evt.customerLocation).toMatchObject({ latitude: 23.82, longitude: 90.42 });
  } finally {
    controller.abort();
  }
  expect((await mechView(request, mech)).customerLocation.latitude).toBe(23.82);
});

test("API-LOC-04 only the customer who placed the order can update its location", async ({ request }) => {
  const { mech, order } = await sharedOrder(request);
  const stranger = await registerUser(request);
  expect((await move(request, stranger, order, DHAKA)).status()).toBe(403);
  expect((await request.patch(`orders/${order._id}/location`, { data: DHAKA, ...auth(mech.session.token) })).status()).toBe(403);
  expect((await request.patch(`orders/${order._id}/location`, { data: DHAKA })).status()).toBe(401);
});

test("API-LOC-05 the customer can stop sharing at any time", async ({ request }) => {
  const { user, mech, order } = await sharedOrder(request);
  await accept(request, mech, order);
  const stop = await move(request, user, order, { share: false });
  expect(await stop.json()).toMatchObject({ shareLocation: false, customerLocation: null });
  const seen = await mechView(request, mech);
  expect(seen.shareLocation).toBe(false);
  expect(seen.customerLocation).toBeUndefined();
  // and can turn it back on
  await move(request, user, order, { ...DHAKA, share: true });
  expect((await mechView(request, mech)).customerLocation).toBeTruthy();
});

test("API-LOC-06 completing or cancelling deletes the location and ends sharing", async ({ request }) => {
  const a = await sharedOrder(request);
  await accept(request, a.mech, a.order);
  await request.patch(`orders/${a.order._id}/status`, { data: { status: "completed" }, ...auth(a.mech.session.token) });
  const mine = (await (await request.get("orders/mine", auth(a.user.session.token))).json())[0];
  expect(mine.customerLocation).toBeUndefined();
  expect((await move(request, a.user, a.order, DHAKA)).status()).toBe(400);

  const b = await sharedOrder(request);
  await request.patch(`orders/${b.order._id}/status`, { data: { status: "cancelled" }, ...auth(b.user.session.token) });
  expect((await move(request, b.user, b.order, DHAKA)).status()).toBe(400);
});

test("API-LOC-07 coordinates are validated", async ({ request }) => {
  const { user, order } = await sharedOrder(request);
  for (const data of [{ latitude: 123, longitude: 90 }, { latitude: 23, longitude: 500 }, { latitude: "23", longitude: "90" }, {}]) {
    expect((await move(request, user, order, data)).status(), JSON.stringify(data)).toBe(400);
  }
});

test("API-LOC-08 admins see whether sharing is on, but never the coordinates", async ({ request }) => {
  const { mech, order } = await sharedOrder(request);
  await accept(request, mech, order);
  const admin = await loginAdmin(request);
  const all = await (await request.get("admin/orders", auth(admin))).json();
  const o = all.find((x) => x._id === order._id);
  expect(o.shareLocation).toBe(true);
  expect(o.customerLocation).toBeUndefined();
});
