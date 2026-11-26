/**
 * Cancelling and declining: a reason is required, it's stored and shown to both sides,
 * and cancelled orders never count as money earned.
 */
import { test, expect } from "@playwright/test";
import { auth, createOrderFixture, loginAdmin, verifyCustomer } from "../../helpers/api";

const status = (request, token, id, data) => request.patch(`orders/${id}/status`, { data, ...auth(token) });
const mine = async (request, token) => (await request.get("orders/mine", auth(token))).json();
const notes = async (request, token) => (await (await request.get("notifications", auth(token))).json()).items;

test("API-CXL-01 cancelling or declining without a reason is refused", async ({ request }) => {
  const { user, mech, order } = await createOrderFixture(request);
  const noReason = await status(request, user.session.token, order._id, { status: "cancelled" });
  expect(noReason.status()).toBe(400);
  expect((await noReason.json()).message).toBe("Please choose a reason for cancelling.");
  const tooShort = await status(request, mech.session.token, order._id, { status: "cancelled", reason: "no" });
  expect(tooShort.status()).toBe(400);
  const declineNoReason = await status(request, mech.session.token, order._id, { status: "cancelled" });
  expect((await declineNoReason.json()).message).toBe("Please choose a reason for declining.");
});

test("API-CXL-02 customer cancels: reason stored, shown to both, mechanic notified with it", async ({ request }) => {
  const { user, mech, order } = await createOrderFixture(request);
  const res = await status(request, user.session.token, order._id, { status: "cancelled", reason: "Found another mechanic" });
  expect(res.status()).toBe(200);
  for (const who of [user, mech]) {
    const [o] = await mine(request, who.session.token);
    expect(o.cancellation).toMatchObject({ by: "user", reason: "Found another mechanic" });
  }
  const [n] = await notes(request, mech.session.token);
  expect(n.type).toBe("order_cancelled");
  expect(n.body).toContain("Reason: Found another mechanic.");
});

test("API-CXL-03 mechanic declines (pending) or cancels after verifying – customer sees why", async ({ request }) => {
  const a = await createOrderFixture(request);
  await status(request, a.mech.session.token, a.order._id, { status: "cancelled", reason: "Fully booked right now" });
  const [declined] = await notes(request, a.user.session.token);
  expect(declined.title).toMatch(/declined MM-\d+/);
  expect(declined.body).toContain("Reason: Fully booked right now.");

  const b = await createOrderFixture(request);
  await status(request, b.mech.session.token, b.order._id, { status: "accepted" });
  await verifyCustomer(request, b.user, b.mech, b.order._id);
  await status(request, b.mech.session.token, b.order._id, { status: "cancelled", reason: "Parts not available" });
  const [o] = await mine(request, b.user.session.token);
  expect(o).toMatchObject({ status: "cancelled", cancellation: { by: "mechanic", reason: "Parts not available" } });
  expect((await notes(request, b.user.session.token))[0].title).toMatch(/cancelled MM-\d+/);
});

test("API-CXL-04 cancelled orders never count as money earned", async ({ request }) => {
  const admin = await loginAdmin(request);

  // accepted, then cancelled by the mechanic (other tests run in parallel, so only this garage's numbers are checked)
  const a = await createOrderFixture(request);
  await status(request, a.mech.session.token, a.order._id, { status: "accepted" });
  await status(request, a.mech.session.token, a.order._id, { status: "cancelled", reason: "Customer not reachable" });

  const after = await (await request.get("admin/stats", auth(admin))).json();
  const shop = after.topShops.find((s) => s.shopname === a.mech.session.account.shopname);
  expect(shop).toBeUndefined(); // a garage with only cancelled orders doesn't appear in top garages

  // customer "spent" stays 0 in the admin list
  const users = await (await request.get("admin/orders?status=cancelled", auth(admin))).json();
  expect(users.find((o) => o._id === a.order._id).cancellation.reason).toBe("Customer not reachable");
});

test("API-CXL-05 admin can cancel with a reason (default given if none)", async ({ request }) => {
  const admin = await loginAdmin(request);
  const { user, order } = await createOrderFixture(request);
  const res = await request.patch(`admin/orders/${order._id}/status`, { data: { status: "cancelled" }, ...auth(admin) });
  expect((await res.json()).cancellation).toMatchObject({ by: "admin", reason: "Cancelled by My Mechanic support" });
  expect((await notes(request, user.session.token))[0].title).toMatch(/was cancelled by My Mechanic/);
});
