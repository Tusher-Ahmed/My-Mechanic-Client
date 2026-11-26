/**
 * Inspection visits: the customer doesn't know what's wrong → pays only the garage's inspection fee (+ travel).
 * The mechanic writes findings + recommended services; the customer then books a follow-up order
 * (travel not charged again within 24 h of a home inspection).
 * Shop from helpers is at 23.78, 90.28 with travel ৳100 + ৳30/km, free within 1 km.
 */
import { test, expect } from "@playwright/test";
import { auth, CAR, loginAdmin, registerMechanic, registerUser, verifyCustomer } from "../../helpers/api";

const at = (km: number) => ({ latitude: 23.78 + km / 111.2, longitude: 90.28 });

async function inspect(request, { mech = null, user = null, mode = "home", km = 5 } = {}) {
  user ??= await registerUser(request);
  mech ??= await registerMechanic(request, { inspectionFee: 450 });
  const res = await request.post("orders", {
    data: { mechanicId: mech.session.account._id, inspection: true, vehicle: CAR, serviceMode: mode, ...(mode === "home" ? { location: at(km) } : {}) },
    ...auth(user.session.token),
  });
  return { res, order: await res.json(), user, mech };
}
const status = (request, who, id, data) => request.patch(`orders/${id}/status`, { data, ...auth(who.session.token) });

/** inspection accepted + verified, then completed with findings */
async function finishInspection(request, f, findings) {
  await status(request, f.mech, f.order._id, { status: "accepted", etaMinutes: 20 });
  await verifyCustomer(request, f.user, f.mech, f.order._id);
  return status(request, f.mech, f.order._id, { status: "completed", findings });
}

test.describe("Inspection fee", () => {
  test("API-INS-01 opening a shop requires an inspection fee; each garage sets its own", async ({ request }) => {
    const missing = await registerMechanic(request, { inspectionFee: undefined });
    expect(missing.res.status()).toBe(400);
    expect((await missing.res.json()).message).toMatch(/Inspection fee is required/);
    expect((await registerMechanic(request, { inspectionFee: -5 })).res.status()).toBe(400);

    const { session } = await registerMechanic(request, { inspectionFee: 600 });
    expect(session.account.inspectionFee).toBe(600);
    const changed = await request.put("auth/me", { data: { inspectionFee: 250 }, ...auth(session.token) });
    expect((await changed.json()).account.inspectionFee).toBe(250);
    const pub = await (await request.get(`mechanics/${session.account._id}`)).json();
    expect(pub.inspectionFee).toBe(250);
  });
});

test.describe("Inspection orders", () => {
  test("API-INS-02 an inspection charges only the garage's fee plus travel", async ({ request }) => {
    const { res, order } = await inspect(request, { km: 5 });
    expect(res.status()).toBe(201);
    expect(order.kind).toBe("inspection");
    expect(order.services).toHaveLength(1);
    expect(order.services[0].price).toBe(450);
    expect(order.servicesTotal).toBe(450);
    expect(order.travelFee).toBe(250);
    expect(order.totalPrice).toBe(700);

    const garage = await inspect(request, { mode: "garage" });
    expect(garage.order.totalPrice).toBe(450);
  });

  test("API-INS-03 an order is either an inspection or services – never empty, never both", async ({ request }) => {
    const user = await registerUser(request);
    const mech = await registerMechanic(request);
    const post = (data) => request.post("orders", { data: { mechanicId: mech.session.account._id, vehicle: CAR, ...data }, ...auth(user.session.token) });
    const none = await post({});
    expect(none.status()).toBe(400);
    expect((await none.json()).message).toMatch(/book an inspection/);
    expect((await post({ inspection: true, serviceIds: [mech.session.account.services[0]._id] })).status()).toBe(400);
    // the browser can't set the fee
    const cheap = await post({ inspection: true, price: 1, servicesTotal: 1 });
    expect((await cheap.json()).servicesTotal).toBe(300);
  });

  test("API-INS-04 completing an inspection needs findings; recommended services come from the garage's list", async ({ request }) => {
    const f = await inspect(request);
    await status(request, f.mech, f.order._id, { status: "accepted", etaMinutes: 15 });
    await verifyCustomer(request, f.user, f.mech, f.order._id);

    const noFindings = await status(request, f.mech, f.order._id, { status: "completed" });
    expect(noFindings.status()).toBe(400);
    expect((await noFindings.json()).message).toMatch(/Write what you found/);

    const stranger = await registerMechanic(request);
    const wrong = await status(request, f.mech, f.order._id, { status: "completed", findings: { note: "Brake pads worn", serviceIds: [stranger.session.account.services[0]._id] } });
    expect(wrong.status()).toBe(400);

    const [oil, brake] = f.mech.session.account.services;
    const ok = await status(request, f.mech, f.order._id, { status: "completed", findings: { note: "Brake pads worn out, oil is black", serviceIds: [brake._id, oil._id] } });
    expect(ok.status()).toBe(200);
    const done = await ok.json();
    expect(done.findings.note).toBe("Brake pads worn out, oil is black");
    expect(done.findings.recommended.map((s) => s.serviceName)).toEqual(["Brake check", "Oil change"]);

    // customer sees the findings on the order and in the notification
    const mine = await (await request.get("orders/mine", auth(f.user.session.token))).json();
    expect(mine[0].findings.recommended).toHaveLength(2);
    const notes = await (await request.get("notifications", auth(f.user.session.token))).json();
    const n = notes.items.find((x) => x.title.startsWith("Inspection finished"));
    expect(n.body).toContain("Brake pads worn out");
    expect(n.body).toContain("Recommended: Brake check, Oil change");
  });
});

test.describe("Follow-up orders", () => {
  test("API-INS-05 booking the found services after a home inspection doesn't charge travel again", async ({ request }) => {
    const f = await inspect(request, { km: 5 });
    const [oil, brake] = f.mech.session.account.services;
    await finishInspection(request, f, { note: "Brakes need work", serviceIds: [brake._id] });

    const res = await request.post("orders", {
      data: { mechanicId: f.mech.session.account._id, serviceIds: [brake._id, oil._id], followUpOf: f.order._id, vehicle: CAR, serviceMode: "home", location: at(5) },
      ...auth(f.user.session.token),
    });
    expect(res.status()).toBe(201);
    const follow = await res.json();
    expect(follow.kind).toBe("service");
    expect(follow.followUpOf).toBe(f.order._id);
    expect(follow.travelWaived).toBe(true);
    expect(follow.travelFee).toBe(0);
    expect(follow.totalPrice).toBe(1300);
  });

  test("API-INS-06 a follow-up must be to your own completed inspection at the same garage", async ({ request }) => {
    const f = await inspect(request);
    const svc = f.mech.session.account.services[0]._id;
    const follow = (who, mechanicId, serviceIds = [svc]) =>
      request.post("orders", { data: { mechanicId, serviceIds, followUpOf: f.order._id, vehicle: CAR }, ...auth(who.session.token) });

    // not finished yet
    expect((await follow(f.user, f.mech.session.account._id)).status()).toBe(400);
    await finishInspection(request, f, { note: "Oil leak", serviceIds: [svc] });

    const other = await registerUser(request);
    expect((await follow(other, f.mech.session.account._id)).status()).toBe(400); // not your inspection
    const otherShop = await registerMechanic(request);
    expect((await follow(f.user, otherShop.session.account._id, [otherShop.session.account.services[0]._id])).status()).toBe(400);
    // an inspection can't be a follow-up
    const again = await request.post("orders", {
      data: { mechanicId: f.mech.session.account._id, inspection: true, followUpOf: f.order._id, vehicle: CAR },
      ...auth(f.user.session.token),
    });
    expect(again.status()).toBe(400);
    expect((await follow(f.user, f.mech.session.account._id)).status()).toBe(201);
  });

  test("API-INS-07 inspection fees count as service revenue, travel stays separate", async ({ request }) => {
    const f = await inspect(request, { km: 5 });
    await finishInspection(request, f, { note: "Battery is dead", serviceIds: [] });
    const admin = await loginAdmin(request);
    const all = await (await request.get("admin/orders", auth(admin))).json();
    const o = all.find((x) => x._id === f.order._id);
    expect(o.kind).toBe("inspection");
    expect(o.findings.note).toBe("Battery is dead");
    const stats = await (await request.get("admin/stats", auth(admin))).json();
    const shop = stats.topShops.find((s) => s.shopname === f.mech.session.account.shopname);
    expect(shop.serviceRevenue).toBe(450);
    expect(shop.travelRevenue).toBe(250);
  });
});
