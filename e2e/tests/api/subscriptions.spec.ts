/**
 * Mechanic subscriptions (demo checkout): visibility on the map, prices, renewals, reminders, admin revenue.
 * Tests that change plan prices run serially at the end and restore the defaults.
 */
import { test, expect } from "@playwright/test";
import { auth, buyPlan, CAR, grantPlan, loginAdmin, registerMechanic, registerUser } from "../../helpers/api";

// these tests buy plans and compare platform-wide revenue totals, so they must not run in parallel with each other
test.describe.configure({ mode: "serial" });
const me = async (request, token) => (await request.get("subscriptions/me", auth(token))).json();
const onMap = async (request, mech) => (await (await request.get(`mechanics?q=${encodeURIComponent(mech.session.account.shopname)}`)).json()).length === 1;
const notes = async (request, token) => (await (await request.get("notifications", auth(token))).json()).items;

test("API-SUB-01 a garage without a plan is hidden from the map and can't be booked", async ({ request }) => {
  const mech = await registerMechanic(request, { subscribe: false });
  expect(await onMap(request, mech)).toBe(false);
  const shop = await (await request.get(`mechanics/${mech.session.account._id}`)).json();
  expect(shop.acceptingOrders).toBe(false);
  expect(shop.subscriptionEndsAt).toBeUndefined(); // internal field not exposed
  const user = await registerUser(request);
  const res = await request.post("orders", {
    data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR },
    ...auth(user.session.token),
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).message).toContain("isn't taking bookings");
});

test("API-SUB-02 first plan uses the starter price, activates the garage and notifies the mechanic", async ({ request }) => {
  const mech = await registerMechanic(request, { subscribe: false });
  const before = await me(request, mech.session.token);
  expect(before).toMatchObject({ active: false, daysLeft: 0 });
  expect(before.prices.monthly).toMatchObject({ kind: "intro", amount: 99, listPrice: 299 });
  expect(before.prices.yearly).toMatchObject({ kind: "intro", amount: 1499, listPrice: 2499 });

  const { checkout, pay } = await buyPlan(request, mech.session.token, "monthly");
  expect(checkout).toMatchObject({ gateway: "demo", amount: 99, kind: "intro", checkoutUrl: `/checkout/${checkout.tranId}` });
  expect(pay.active).toBe(true);
  const after = await me(request, mech.session.token);
  expect(after).toMatchObject({ active: true, plan: "monthly" });
  expect(after.daysLeft).toBe(30);
  expect(after.history[0]).toMatchObject({ status: "paid", amount: 99, kind: "intro", gateway: "demo" });
  expect(await onMap(request, mech)).toBe(true);
  expect((await notes(request, mech.session.token))[0]).toMatchObject({ type: "subscription", title: "Payment received – your monthly plan is active" });
});

test("API-SUB-03 returning customers get the loyalty discount; renewing early stacks the days", async ({ request }) => {
  const mech = await registerMechanic(request, { subscribe: false });
  await buyPlan(request, mech.session.token, "monthly"); // ৳99 starter
  expect((await me(request, mech.session.token)).prices.monthly).toMatchObject({ kind: "renewal", amount: 239, discountPercent: 20 }); // 299 − 20 %
  const { checkout } = await buyPlan(request, mech.session.token, "monthly");
  expect(checkout).toMatchObject({ kind: "renewal", amount: 239 });
  const s = await me(request, mech.session.token);
  expect(s.daysLeft).toBe(60); // second month starts when the first ends
  expect(s.history.map((h) => h.amount)).toEqual([239, 99]);
});

test("API-SUB-04 cancelled payments don't activate; payments can't be reused or paid by someone else", async ({ request }) => {
  const mech = await registerMechanic(request, { subscribe: false });
  const { checkout, pay } = await buyPlan(request, mech.session.token, "yearly", "cancel");
  expect(pay.active).toBe(false);
  expect((await me(request, mech.session.token)).history[0]).toMatchObject({ status: "cancelled", amount: 1499 });
  expect((await me(request, mech.session.token)).prices.yearly.kind).toBe("intro"); // still a new customer

  const again = await request.post(`subscriptions/demo/${checkout.tranId}/pay`, { data: { outcome: "success" }, ...auth(mech.session.token) });
  expect(again.status()).toBe(400);
  const other = await registerMechanic(request, { subscribe: false });
  const theirs = await (await request.post("subscriptions/checkout", { data: { plan: "monthly" }, ...auth(other.session.token) })).json();
  expect((await request.post(`subscriptions/demo/${theirs.tranId}/pay`, { data: { outcome: "success" }, ...auth(mech.session.token) })).status()).toBe(403);
  expect((await request.post("subscriptions/demo/MMS-FAKE-0000/pay", { data: { outcome: "success" }, ...auth(mech.session.token) })).status()).toBe(404);
});

test("API-SUB-05 when a plan expires the garage disappears; renewing brings it back at the discount", async ({ request }) => {
  const mech = await registerMechanic(request, { subscribe: false });
  await buyPlan(request, mech.session.token, "monthly");
  await grantPlan(request, mech.session.account._id, -1); // expired yesterday
  expect(await onMap(request, mech)).toBe(false);
  expect((await me(request, mech.session.token)).active).toBe(false);
  const { checkout } = await buyPlan(request, mech.session.token, "monthly");
  expect(checkout.kind).toBe("renewal");
  const s = await me(request, mech.session.token);
  expect(s.active).toBe(true);
  expect(s.daysLeft).toBe(30); // restarts from today, not from the old end date
  expect(await onMap(request, mech)).toBe(true);
});

test("API-SUB-06 expiry reminders: 7 days, 1 day and expired – each sent once", async ({ request }) => {
  const admin = await loginAdmin(request);
  const run = () => request.post("admin/subscriptions/run-reminders", auth(admin));
  const a = await registerMechanic(request, { subscribe: false });
  const b = await registerMechanic(request, { subscribe: false });
  const c = await registerMechanic(request, { subscribe: false });
  await grantPlan(request, a.session.account._id, 5);
  await grantPlan(request, b.session.account._id, 0.5);
  await grantPlan(request, c.session.account._id, -0.1);
  await run();
  await run(); // second run must not repeat anything

  const [na, nb, nc] = [await notes(request, a.session.token), await notes(request, b.session.token), await notes(request, c.session.token)];
  expect(na.map((n) => n.title)).toEqual(["Your plan ends in 5 days"]);
  expect(nb.map((n) => n.title)).toEqual(["Your plan ends tomorrow"]);
  expect(nc.map((n) => n.title)).toEqual(["Your plan has expired – your garage is hidden from the map"]);
  expect(nc[0].body).toContain("20% off");
  expect(nc[0].link).toBe("/mechanic?tab=subscription");
});

test("API-SUB-07 only mechanics can buy plans; plan list is public", async ({ request }) => {
  const user = await registerUser(request);
  expect((await request.post("subscriptions/checkout", { data: { plan: "monthly" }, ...auth(user.session.token) })).status()).toBe(403);
  expect((await request.post("subscriptions/checkout", { data: { plan: "monthly" } })).status()).toBe(401);
  const mech = await registerMechanic(request, { subscribe: false });
  expect((await request.post("subscriptions/checkout", { data: { plan: "weekly" }, ...auth(mech.session.token) })).status()).toBe(400);
  const plans = await (await request.get("subscriptions/plans")).json();
  expect(plans.plans.monthly).toMatchObject({ price: 299, introPrice: 99, days: 30 });
});

test.describe.serial("Admin revenue & plan prices", () => {
  test("API-SUB-08 revenue report: totals, new vs renewals, per plan, garages", async ({ request }) => {
    const admin = await loginAdmin(request);
    const before = await (await request.get("admin/revenue", auth(admin))).json();
    const mech = await registerMechanic(request, { subscribe: false });
    await buyPlan(request, mech.session.token, "yearly"); // 1499 intro
    await buyPlan(request, mech.session.token, "monthly"); // 239 renewal
    const after = await (await request.get("admin/revenue", auth(admin))).json();

    expect(after.allTime.revenue - before.allTime.revenue).toBe(1499 + 239);
    expect(after.thisMonth - before.thisMonth).toBe(1499 + 239);
    expect(after.months).toHaveLength(12);
    const kind = (r, k) => r.byKind.find((x) => x.kind === k).revenue;
    expect(kind(after, "intro") - kind(before, "intro")).toBe(1499);
    expect(kind(after, "renewal") - kind(before, "renewal")).toBe(239);
    expect(after.recent[0]).toMatchObject({ amount: 239, kind: "renewal", shopname: mech.session.account.shopname });
    expect(after.garages.total).toBeGreaterThan(0);
    expect(after.garages.active).toBeGreaterThan(0);

    const mechToken = mech.session.token;
    expect((await request.get("admin/revenue", auth(mechToken))).status()).toBe(403);
  });

  test("API-SUB-09 admin changes plan prices and the discount; mechanics see the new prices", async ({ request }) => {
    const admin = await loginAdmin(request);
    const original = await (await request.get("admin/plans", auth(admin))).json();
    try {
      const changed = { plans: { monthly: { ...original.plans.monthly, introPrice: 49 }, yearly: original.plans.yearly }, renewalDiscountPercent: 25 };
      expect((await request.put("admin/plans", { data: changed, ...auth(admin) })).status()).toBe(200);
      const mech = await registerMechanic(request, { subscribe: false });
      expect((await me(request, mech.session.token)).prices.monthly.amount).toBe(49);
      await buyPlan(request, mech.session.token, "monthly");
      expect((await me(request, mech.session.token)).prices.monthly).toMatchObject({ amount: 224, discountPercent: 25 }); // 299 − 25 %
      const bad = await request.put("admin/plans", { data: { ...changed, renewalDiscountPercent: 150 }, ...auth(admin) });
      expect(bad.status()).toBe(400);
    } finally {
      await request.put("admin/plans", { data: original, ...auth(admin) });
    }
  });
});
