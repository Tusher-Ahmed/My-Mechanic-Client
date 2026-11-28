/**
 * Free trial: a new garage gets a free trial (7 days by default) once, when it's approved
 * (or created by an admin). It can buy a plan during the trial without losing trial days.
 */
import { test, expect } from "@playwright/test";
import { approveGarage, auth, buyPlan, CAR, loginAdmin, registerMechanic, registerUser, uid } from "../../helpers/api";

// TRIAL-06 changes the trial length for the whole platform, so this file runs in order
test.describe.configure({ mode: "serial" });

const DAY = 86_400_000;
const me = async (request, token) => (await request.get("subscriptions/me", auth(token))).json();
const onMap = async (request, shopname: string) =>
  ((await (await request.get(`mechanics?q=${encodeURIComponent(shopname)}`)).json()) as any[]).some((m) => m.shopname === shopname);
const notes = async (request, token) => (await (await request.get("notifications", auth(token))).json()).items;
const setPlan = async (request, admin, id, days: number, plan = "trial") =>
  request.put(`admin/mechanics/${id}/subscription`, { data: { endsAt: new Date(Date.now() + days * DAY).toISOString(), plan }, ...auth(admin) });

/** A self-registered garage, approved by the admin with the trial left running. */
async function approvedOnTrial(request) {
  const mech = await registerMechanic(request, { approve: false, subscribe: false });
  expect((await approveGarage(request, mech.session.account._id)).status()).toBe(200);
  return mech;
}

test("API-TRIAL-01 approval starts a 7-day free trial: on the map, bookable, mechanic told", async ({ request }) => {
  expect((await (await request.get("subscriptions/plans")).json()).trialDays).toBe(7);
  const mech = await registerMechanic(request, { approve: false, subscribe: false });
  expect(await onMap(request, mech.body.shopname)).toBe(false); // pending: no trial yet

  const before = Date.now();
  await approveGarage(request, mech.session.account._id);
  const sub = await me(request, mech.session.token);
  expect(sub).toMatchObject({ active: true, trial: true, plan: "trial", daysLeft: 7, canBuy: true });
  expect(new Date(sub.endsAt).getTime()).toBeGreaterThanOrEqual(before + 7 * DAY - 5000);
  expect(sub.history).toEqual([]); // nothing paid
  expect(sub.prices.monthly.kind).toBe("intro"); // starter price still applies after the trial

  const [n] = await notes(request, mech.session.token);
  expect(n.title).toBe("Your garage is approved 🎉");
  expect(n.body).toContain("free trial has started");

  expect(await onMap(request, mech.body.shopname)).toBe(true);
  const user = await registerUser(request);
  const order = await request.post("orders", {
    data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR },
    ...auth(user.session.token),
  });
  expect(order.status()).toBe(201);
});

test("API-TRIAL-02 buying a plan during the trial keeps the free days; then no second purchase", async ({ request }) => {
  const mech = await approvedOnTrial(request);
  const trialEnds = new Date((await me(request, mech.session.token)).endsAt).getTime();

  const { checkout, pay } = await buyPlan(request, mech.session.token, "monthly");
  expect(checkout).toMatchObject({ kind: "intro", amount: 99 });
  expect(pay.active).toBe(true);
  // the paid month starts when the trial ends
  expect(Math.abs(new Date(pay.endsAt).getTime() - (trialEnds + 30 * DAY))).toBeLessThan(5000);

  const sub = await me(request, mech.session.token);
  expect(sub).toMatchObject({ trial: false, plan: "monthly", canBuy: false });
  expect(sub.history[0]).toMatchObject({ status: "paid", amount: 99 });
  expect(new Date(sub.history[0].startsAt).getTime()).toBe(trialEnds);

  const again = await request.post("subscriptions/checkout", { data: { plan: "monthly" }, ...auth(mech.session.token) });
  expect(again.status()).toBe(400);
  expect((await again.json()).message).toMatch(/still active/);
});

test("API-TRIAL-03 the trial is given only once per garage", async ({ request }) => {
  const admin = await loginAdmin(request);
  const mech = await approvedOnTrial(request);
  const id = mech.session.account._id;
  const firstEnd = (await me(request, mech.session.token)).endsAt;

  // new licence → back to pending → approved again: same trial, no new one
  await request.put("auth/me", { data: { tradeLicense: `TRAD/AGAIN/${uid()}` }, ...auth(mech.session.token) });
  await approveGarage(request, id);
  expect((await me(request, mech.session.token)).endsAt).toBe(firstEnd);

  // trial over → approving again doesn't start another one
  await request.put(`admin/mechanics/${id}/subscription`, { data: { endsAt: null }, ...auth(admin) });
  await request.put("auth/me", { data: { tradeLicense: `TRAD/THIRD/${uid()}` }, ...auth(mech.session.token) });
  await approveGarage(request, id);
  const sub = await me(request, mech.session.token);
  expect(sub).toMatchObject({ active: false, trial: false, canBuy: true });
  const [n] = await notes(request, mech.session.token);
  expect(n.body).toMatch(/Choose a plan/);

  // a garage that already paid for a plan doesn't get a trial when it's approved again
  const paid = await registerMechanic(request, { subscribe: false });
  await buyPlan(request, paid.session.token, "monthly");
  await request.put(`admin/mechanics/${paid.session.account._id}/subscription`, { data: { endsAt: null }, ...auth(admin) });
  await request.put("auth/me", { data: { tradeLicense: `TRAD/PAID/${uid()}` }, ...auth(paid.session.token) });
  await approveGarage(request, paid.session.account._id);
  expect((await me(request, paid.session.token)).active).toBe(false);
});

test("API-TRIAL-04 a garage created by an admin gets the free trial too", async ({ request }) => {
  const admin = await loginAdmin(request);
  const id = uid();
  const res = await request.post("admin/mechanics", {
    data: {
      username: "Admin Made", email: `trial-adm-${id}@e2e.test`, phone: "01822222222", nid: "1234567890", password: "secret123",
      shopname: `Trial Admin Garage ${id}`, tradeLicense: `TRAD/TRIAL/${id}`, inspectionFee: 300, latitude: 23.78, longitude: 90.28,
      services: [{ serviceName: "Oil change", price: 800 }],
    },
    ...auth(admin),
  });
  expect(res.status()).toBe(201);
  const m = await res.json();
  expect(m).toMatchObject({ approvalStatus: "approved", subscriptionPlan: "trial" });
  expect(new Date(m.subscriptionEndsAt).getTime()).toBeGreaterThan(Date.now() + 6.9 * DAY);
  expect(await onMap(request, `Trial Admin Garage ${id}`)).toBe(true);
});

test("API-TRIAL-05 trial reminders: 1 day before and when it ends (starter price, not the renewal discount)", async ({ request }) => {
  const admin = await loginAdmin(request);
  const [a, b, c] = [await approvedOnTrial(request), await approvedOnTrial(request), await approvedOnTrial(request)];
  for (const m of [a, b, c]) for (const n of await notes(request, m.session.token)) await request.delete(`notifications/${n._id}`, auth(m.session.token));
  await setPlan(request, admin, a.session.account._id, 5); // mid-trial: no "7 days left" note for a 7-day trial
  await setPlan(request, admin, b.session.account._id, 0.5);
  await setPlan(request, admin, c.session.account._id, -0.1);
  await request.post("admin/subscriptions/run-reminders", auth(admin));
  await request.post("admin/subscriptions/run-reminders", auth(admin)); // nothing twice

  expect(await notes(request, a.session.token)).toEqual([]);
  const [nb] = await notes(request, b.session.token);
  expect(nb.title).toBe("Your free trial ends tomorrow");
  expect(nb.body).toContain("৳99");
  const nc = await notes(request, c.session.token);
  expect(nc.map((n) => n.title)).toEqual(["Your free trial has ended – your garage is hidden from the map"]);
  expect(nc[0].body).not.toContain("% off");
  expect(await onMap(request, c.body.shopname)).toBe(false);
});

test("API-TRIAL-06 the admin sets the trial length; 0 turns it off", async ({ request }) => {
  const admin = await loginAdmin(request);
  const original = await (await request.get("admin/plans", auth(admin))).json();
  try {
    expect((await request.put("admin/plans", { data: { ...original, trialDays: 120 }, ...auth(admin) })).status()).toBe(400);
    expect((await request.put("admin/plans", { data: { ...original, trialDays: 14 }, ...auth(admin) })).status()).toBe(200);
    expect((await me(request, (await approvedOnTrial(request)).session.token)).daysLeft).toBe(14);
    // saving prices without the field keeps the trial length
    const { trialDays, ...withoutTrial } = original;
    await request.put("admin/plans", { data: withoutTrial, ...auth(admin) });
    expect((await (await request.get("admin/plans", auth(admin))).json()).trialDays).toBe(14);

    await request.put("admin/plans", { data: { ...original, trialDays: 0 }, ...auth(admin) });
    const mech = await approvedOnTrial(request);
    expect(await me(request, mech.session.token)).toMatchObject({ active: false, trial: false });
    const [n] = await notes(request, mech.session.token);
    expect(n.body).toMatch(/Choose a plan/);
  } finally {
    await request.put("admin/plans", { data: original, ...auth(admin) });
  }
});
