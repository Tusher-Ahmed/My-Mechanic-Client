/**
 * Garage approval: a trade licence is required, self-registered garages wait for an admin,
 * admin-created garages are approved at once.
 */
import { test, expect } from "@playwright/test";
import { approveGarage, auth, CAR, grantPlan, loginAdmin, registerMechanic, registerUser, uid } from "../../helpers/api";

const onMap = async (request, shopname: string) =>
  ((await (await request.get(`mechanics?q=${encodeURIComponent(shopname)}`)).json()) as any[]).some((m) => m.shopname === shopname);
const book = (request, user, mech) =>
  request.post("orders", { data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR }, ...auth(user.session.token) });
const notes = async (request, mech) => (await (await request.get("notifications", auth(mech.session.token))).json()).items;

test("API-APR-01 a trade licence is required, unique and never shown publicly", async ({ request }) => {
  const missing = await registerMechanic(request, { tradeLicense: undefined, approve: false, subscribe: false });
  expect(missing.res.status()).toBe(400);
  expect((await missing.res.json()).message).toMatch(/Trade licence number is required/);
  expect((await registerMechanic(request, { tradeLicense: "ab", approve: false, subscribe: false })).res.status()).toBe(400);
  expect((await registerMechanic(request, { tradeLicense: "TL <script>", approve: false, subscribe: false })).res.status()).toBe(400);

  const licence = `TRAD/DNCC/${uid()}`;
  const first = await registerMechanic(request, { tradeLicense: licence.toLowerCase() });
  expect(first.session.account.tradeLicense).toBe(licence.toUpperCase()); // stored uppercase
  const copy = await registerMechanic(request, { tradeLicense: licence, approve: false, subscribe: false });
  expect(copy.res.status()).toBe(409);
  expect((await copy.res.json()).message).toBe("This trade licence number is already registered");

  const pub = await (await request.get(`mechanics/${first.session.account._id}`)).json();
  expect(pub.tradeLicense).toBeUndefined();
  expect(pub.approvalStatus).toBeUndefined();
});

test("API-APR-02 a self-registered garage waits for approval: hidden, not bookable, no plan yet", async ({ request }) => {
  const mech = await registerMechanic(request, { approve: false, subscribe: false });
  expect(mech.session.account.approvalStatus).toBe("pending");

  const checkout = await request.post("subscriptions/checkout", { data: { plan: "monthly" }, ...auth(mech.session.token) });
  expect(checkout.status()).toBe(400);
  expect((await checkout.json()).message).toMatch(/waiting for approval/);

  // even with a plan granted by hand it stays off the map until approved
  await grantPlan(request, mech.session.account._id, 30);
  expect(await onMap(request, mech.body.shopname)).toBe(false);
  expect((await (await request.get(`mechanics/${mech.session.account._id}`)).json()).acceptingOrders).toBe(false);
  const user = await registerUser(request);
  expect((await book(request, user, mech)).status()).toBe(400);
});

test("API-APR-03 admin approves: the mechanic is told, the garage goes live and can buy a plan", async ({ request }) => {
  const mech = await registerMechanic(request, { approve: false, subscribe: false });
  const res = await approveGarage(request, mech.session.account._id);
  expect(res.status()).toBe(200);
  const saved = await res.json();
  expect(saved.approvalStatus).toBe("approved");
  expect(saved.approval.at).toBeTruthy();

  const [n] = await notes(request, mech);
  expect(n.title).toBe("Your garage is approved 🎉");
  expect(n.link).toBe("/mechanic?tab=subscription");

  expect((await request.post("subscriptions/checkout", { data: { plan: "monthly" }, ...auth(mech.session.token) })).status()).toBe(201);
  await grantPlan(request, mech.session.account._id, 30);
  expect(await onMap(request, mech.body.shopname)).toBe(true);
  const user = await registerUser(request);
  expect((await book(request, user, mech)).status()).toBe(201);
});

test("API-APR-04 rejecting needs a reason; a new trade licence sends the garage back for review", async ({ request }) => {
  const mech = await registerMechanic(request, { approve: false, subscribe: false });
  const noReason = await approveGarage(request, mech.session.account._id, "rejected");
  expect(noReason.status()).toBe(400);
  expect((await noReason.json()).message).toMatch(/reason for rejecting/);

  const rejected = await approveGarage(request, mech.session.account._id, "rejected", "Trade licence number doesn't match the shop name");
  expect((await rejected.json()).approvalStatus).toBe("rejected");
  const [n] = await notes(request, mech);
  expect(n.title).toBe("Your garage wasn't approved");
  expect(n.body).toContain("doesn't match the shop name");
  const checkout = await request.post("subscriptions/checkout", { data: { plan: "monthly" }, ...auth(mech.session.token) });
  expect((await checkout.json()).message).toMatch(/Update your trade licence/);

  // the mechanic fixes the licence → pending again
  const fixed = await request.put("auth/me", { data: { tradeLicense: `TRAD/FIXED/${uid()}` }, ...auth(mech.session.token) });
  const account = (await fixed.json()).account;
  expect(account.approvalStatus).toBe("pending");
  expect(account.approval).toBeUndefined();
});

test("API-APR-05 changing the licence of an approved garage takes it off the map until checked again", async ({ request }) => {
  const mech = await registerMechanic(request);
  expect(await onMap(request, mech.body.shopname)).toBe(true);
  // same licence again (any case) changes nothing
  const same = await request.put("auth/me", { data: { tradeLicense: mech.body.tradeLicense.toLowerCase() }, ...auth(mech.session.token) });
  expect((await same.json()).account.approvalStatus).toBe("approved");
  await request.put("auth/me", { data: { tradeLicense: `TRAD/NEW/${uid()}` }, ...auth(mech.session.token) });
  expect(await onMap(request, mech.body.shopname)).toBe(false);
});

test("API-APR-06 a garage created by an admin is approved at once (licence still required)", async ({ request }) => {
  const admin = await loginAdmin(request);
  const id = uid();
  const body = {
    username: "Admin Made", email: `adm-made-${id}@e2e.test`, phone: "01822222222", nid: "1234567890", password: "secret123",
    shopname: `Admin Garage ${id}`, inspectionFee: 300, latitude: 23.78, longitude: 90.28, services: [{ serviceName: "Oil change", price: 800 }],
  };
  expect((await request.post("admin/mechanics", { data: body, ...auth(admin) })).status()).toBe(400); // no licence
  const res = await request.post("admin/mechanics", { data: { ...body, tradeLicense: `TRAD/ADMIN/${id}` }, ...auth(admin) });
  expect(res.status()).toBe(201);
  const m = await res.json();
  expect(m.approvalStatus).toBe("approved");
  await grantPlan(request, m._id, 30);
  expect(await onMap(request, body.shopname)).toBe(true);
});

test("API-APR-07 only admins can approve or reject", async ({ request }) => {
  const mech = await registerMechanic(request, { approve: false, subscribe: false });
  const user = await registerUser(request);
  for (const token of [mech.session.token, user.session.token]) {
    const res = await request.put(`admin/mechanics/${mech.session.account._id}/approval`, { data: { status: "approved" }, ...auth(token) });
    expect(res.status()).toBe(403);
  }
  expect((await request.put(`admin/mechanics/${mech.session.account._id}/approval`, { data: { status: "approved" } })).status()).toBe(401);
  // a mechanic can't approve themselves through their profile
  const self = await request.put("auth/me", { data: { approvalStatus: "approved" }, ...auth(mech.session.token) });
  expect((await self.json()).account?.approvalStatus ?? "pending").toBe("pending");
});
