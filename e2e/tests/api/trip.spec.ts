/**
 * Booking → arrival flow: order numbers, travel charge, arrival time (ETA), verification code.
 * Shop from helpers is at 23.78, 90.28 with default travel pricing ৳100 + ৳30/km, free within 1 km, up to 20 km.
 */
import { test, expect } from "@playwright/test";
import { auth, CAR, loginAdmin, registerMechanic, registerUser, verifyCustomer } from "../../helpers/api";

const at = (km: number) => ({ latitude: 23.78 + km / 111.2, longitude: 90.28 }); // ~km north of the shop

async function book(request, { mode = "home", km = 5, mech = null, user = null } = {}) {
  user ??= await registerUser(request);
  mech ??= await registerMechanic(request);
  const res = await request.post("orders", {
    data: {
      mechanicId: mech.session.account._id,
      serviceIds: [mech.session.account.services[0]._id], // Oil change ৳800
      vehicle: CAR,
      serviceMode: mode,
      ...(mode === "home" ? { location: at(km) } : {}),
    },
    ...auth(user.session.token),
  });
  return { res, order: await res.json(), user, mech };
}
const mine = async (request, who) => (await request.get("orders/mine", auth(who.session.token))).json();
const accept = (request, mech, id, data = {}) => request.patch(`orders/${id}/status`, { data: { status: "accepted", ...data }, ...auth(mech.session.token) });

test.describe("Order numbers", () => {
  test("API-TRIP-01 every order gets a unique, increasing number visible to everyone", async ({ request }) => {
    const a = await book(request, { mode: "garage" });
    const b = await book(request, { mode: "garage", user: a.user, mech: a.mech });
    expect(a.order.number).toBeGreaterThan(1000);
    expect(b.order.number).toBeGreaterThan(a.order.number);
    expect((await mine(request, a.mech))[0].number).toBe(b.order.number);
    const admin = await loginAdmin(request);
    const all = await (await request.get("admin/orders", auth(admin))).json();
    expect(all.find((o) => o._id === a.order._id).number).toBe(a.order.number);
  });
});

test.describe("Travel charge", () => {
  test("API-TRIP-02 home service adds a distance-based charge, calculated by the server", async ({ request }) => {
    const { order } = await book(request, { km: 5 });
    expect(order.serviceMode).toBe("home");
    expect(order.travelDistanceKm).toBeCloseTo(5, 1);
    expect(order.travelFee).toBe(250); // 100 + 30 × 5
    expect(order.servicesTotal).toBe(800);
    expect(order.totalPrice).toBe(1050);
  });

  test("API-TRIP-03 free within 1 km; bringing the car in has no travel charge", async ({ request }) => {
    expect((await book(request, { km: 0.6 })).order.travelFee).toBe(0);
    const garage = await book(request, { mode: "garage" });
    expect(garage.order.travelFee).toBe(0);
    expect(garage.order.totalPrice).toBe(800);
    expect(garage.order.customerLocation).toBeUndefined();
  });

  test("API-TRIP-04 each garage sets its own pricing and service radius", async ({ request }) => {
    const mech = await registerMechanic(request, { travelPricing: { base: 50, perKm: 40, freeWithinKm: 0, maxDistanceKm: 3 } });
    expect((await book(request, { km: 2, mech })).order.travelFee).toBe(130); // 50 + 40 × 2
    const far = await book(request, { km: 6, mech });
    expect(far.res.status()).toBe(400);
    expect(far.order.message).toContain("only travels up to 3 km");
    const shop = await (await request.get(`mechanics/${mech.session.account._id}`)).json();
    expect(shop.travelPricing).toMatchObject({ base: 50, perKm: 40, maxDistanceKm: 3 }); // public, shown before booking
  });

  test("API-TRIP-05 home service needs a location; the client can't set its own fee", async ({ request }) => {
    const user = await registerUser(request);
    const mech = await registerMechanic(request);
    const res = await request.post("orders", {
      data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR, serviceMode: "home", travelFee: 0, totalPrice: 1 },
      ...auth(user.session.token),
    });
    expect(res.status()).toBe(400);
    const ok = await request.post("orders", {
      data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR, serviceMode: "home", location: at(10), travelFee: 0, totalPrice: 1 },
      ...auth(user.session.token),
    });
    expect((await ok.json()).travelFee).toBe(400);
  });

  test("API-TRIP-06 both customer and mechanic see the travel charge on the order", async ({ request }) => {
    const { mech, user } = await book(request, { km: 5 });
    expect((await mine(request, user))[0]).toMatchObject({ travelFee: 250, totalPrice: 1050 });
    expect((await mine(request, mech))[0]).toMatchObject({ travelFee: 250, totalPrice: 1050 });
  });
});

test.describe("Arrival time", () => {
  test("API-TRIP-07 accepting sets an arrival time (suggested from distance, or chosen)", async ({ request }) => {
    const a = await book(request, { km: 10 });
    const res = await (await accept(request, a.mech, a.order._id)).json();
    expect(res.eta.minutes).toBe(40); // 10 min + 10 km at 20 km/h
    expect(new Date(res.eta.arriveBy).getTime()).toBeGreaterThan(Date.now() + 35 * 60_000);

    const b = await book(request, { km: 3 });
    expect((await (await accept(request, b.mech, b.order._id, { etaMinutes: 25 })).json()).eta.minutes).toBe(25);
    const { items } = await (await request.get("notifications", auth(b.user.session.token))).json();
    expect(items[0].body).toMatch(/Arriving in ~25 min/);
  });

  test("API-TRIP-08 mechanic can update the arrival time; customer is notified", async ({ request }) => {
    const { mech, user, order } = await book(request);
    await accept(request, mech, order._id);
    const res = await request.patch(`orders/${order._id}/eta`, { data: { etaMinutes: 45 }, ...auth(mech.session.token) });
    expect((await res.json()).eta.minutes).toBe(45);
    const { items } = await (await request.get("notifications", auth(user.session.token))).json();
    expect(items[0].title).toMatch(/^New arrival time for MM-\d+/);
    // the customer can't change it, and silly values are refused
    expect((await request.patch(`orders/${order._id}/eta`, { data: { etaMinutes: 5 }, ...auth(user.session.token) })).status()).toBe(403);
    expect((await request.patch(`orders/${order._id}/eta`, { data: { etaMinutes: 2 }, ...auth(mech.session.token) })).status()).toBe(400);
  });
});

test.describe("Verification code", () => {
  test("API-TRIP-09 only the customer sees the code; the mechanic and admin never do", async ({ request }) => {
    const { mech, user, order } = await book(request);
    expect((await mine(request, user))[0].verificationCode).toBeUndefined(); // not before acceptance
    await accept(request, mech, order._id);
    const code = (await mine(request, user))[0].verificationCode;
    expect(code).toMatch(/^\d{4}$/);
    expect((await mine(request, mech))[0].verificationCode).toBeUndefined();
    const admin = await loginAdmin(request);
    const all = await (await request.get("admin/orders", auth(admin))).json();
    expect(all.find((o) => o._id === order._id).verificationCode).toBeUndefined();
  });

  test("API-TRIP-10 correct code verifies the customer, stops location sharing and allows completion", async ({ request }) => {
    const { mech, user, order } = await book(request);
    await accept(request, mech, order._id);
    const res = await verifyCustomer(request, user, mech, order._id);
    expect(res.status()).toBe(200);
    const v = await res.json();
    expect(v.verifiedAt).toBeTruthy();
    expect(v.shareLocation).toBe(false);
    expect(v.customerLocation).toBeUndefined();
    expect((await mine(request, user))[0].verificationCode).toBeUndefined(); // used up
    const done = await request.patch(`orders/${order._id}/status`, { data: { status: "completed" }, ...auth(mech.session.token) });
    expect((await done.json()).status).toBe("completed");
  });

  test("API-TRIP-11 wrong codes are limited: 5 tries, then a 15-minute lock", async ({ request }) => {
    const { mech, user, order } = await book(request);
    await accept(request, mech, order._id);
    const real = (await mine(request, user))[0].verificationCode;
    const wrong = real === "0000" ? "1111" : "0000";
    for (let left = 4; left >= 1; left--) {
      const r = await request.post(`orders/${order._id}/verify`, { data: { code: wrong }, ...auth(mech.session.token) });
      expect(r.status()).toBe(400);
      expect((await r.json()).message).toContain(`${left} attempt`);
    }
    const locked = await request.post(`orders/${order._id}/verify`, { data: { code: wrong }, ...auth(mech.session.token) });
    expect(locked.status()).toBe(429);
    // even the right code is refused while locked
    const right = await request.post(`orders/${order._id}/verify`, { data: { code: real }, ...auth(mech.session.token) });
    expect(right.status()).toBe(429);
  });

  test("API-TRIP-12 only the assigned mechanic can verify; bad input rejected", async ({ request }) => {
    const { mech, user, order } = await book(request);
    await accept(request, mech, order._id);
    const other = await registerMechanic(request);
    expect((await verifyCustomer(request, user, other, order._id)).status()).toBe(403);
    expect((await request.post(`orders/${order._id}/verify`, { data: { code: "12a4" }, ...auth(mech.session.token) })).status()).toBe(400);
    expect((await request.post(`orders/${order._id}/verify`, { data: { code: { $ne: "" } }, ...auth(mech.session.token) })).status()).toBe(400);
  });
});
