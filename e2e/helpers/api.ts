import type { APIRequestContext, APIResponse } from "@playwright/test";
import { TEST_ADMIN } from "../playwright.config";

let counter = 0;
/** Unique suffix so every test creates its own accounts and tests can run in parallel. */
export const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Default car used when a test places an order. */
export const CAR = { type: "Sedan", make: "Toyota", model: "Axio", year: 2016, plate: "Dhaka-Ga-12-3456" };

export const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export type Session = { token: string; role: string; account: any };

export async function registerUser(request: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const id = uid();
  const body = {
    username: `User ${id}`,
    email: `user-${id}@e2e.test`,
    phone: "01711111111",
    password: "secret123",
    ...overrides,
  };
  const res = await request.post("auth/user/register", { data: body });
  return { res, body, session: (await res.json()) as Session };
}

export async function registerMechanic(request: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const id = uid();
  const body = {
    username: `Mechanic ${id}`,
    email: `mech-${id}@e2e.test`,
    phone: "01822222222",
    nid: "1234567890",
    password: "secret123",
    shopname: `Auto Works ${id}`,
    tradeLicense: `TRAD/E2E/${id}`,
    inspectionFee: 300,
    latitude: 23.78,
    longitude: 90.28,
    services: [
      { serviceName: "Oil change", price: 800 },
      { serviceName: "Brake check", price: 500 },
    ],
    ...overrides,
  };
  // by default the garage gets an active plan (silent admin grant – no payment, no notification) so it's on
  // the map and bookable; subscription tests pass subscribe: false and use buyPlan() instead
  // garages that register themselves wait for an admin; by default the helper approves them quietly
  // (approval notification removed) – approval tests pass approve: false
  const { subscribe = true, approve = true, ...data } = body as typeof body & { subscribe?: boolean; approve?: boolean };
  const res = await request.post("auth/mechanic/register", { data });
  const session = (await res.json()) as Session;
  if (approve && res.ok()) {
    await approveGarage(request, session.account._id);
    const { items } = await (await request.get("notifications", auth(session.token))).json();
    for (const n of items) await request.delete(`notifications/${n._id}`, auth(session.token));
    session.account.approvalStatus = "approved";
  }
  if (subscribe && res.ok()) await grantPlan(request, session.account._id, 30);
  return { res, body: data, session };
}

/** Admin approves (or rejects, with a reason) a self-registered garage. */
export async function approveGarage(request: APIRequestContext, mechanicId: string, status: "approved" | "rejected" = "approved", reason?: string) {
  adminToken ??= await loginAdmin(request);
  return request.put(`admin/mechanics/${mechanicId}/approval`, { data: { status, reason }, ...auth(adminToken) });
}

let adminToken: string | null = null;
/** Admin sets a garage's plan end date directly (days from now; negative = already expired, null = none). */
export async function grantPlan(request: APIRequestContext, mechanicId: string, days: number | null) {
  adminToken ??= await loginAdmin(request);
  const endsAt = days == null ? null : new Date(Date.now() + days * 86_400_000).toISOString();
  return request.put(`admin/mechanics/${mechanicId}/subscription`, { data: { endsAt, plan: "monthly" }, ...auth(adminToken) });
}

/** Mechanic buys a plan through the demo checkout. Returns the checkout + payment results. */
export async function buyPlan(request: APIRequestContext, token: string, plan: "monthly" | "yearly" = "monthly", outcome: "success" | "cancel" = "success") {
  const checkout = await (await request.post("subscriptions/checkout", { data: { plan }, ...auth(token) })).json();
  const pay = await request.post(`subscriptions/demo/${checkout.tranId}/pay`, { data: { outcome }, ...auth(token) });
  return { checkout, pay: await pay.json(), payRes: pay };
}

export async function loginAdmin(request: APIRequestContext) {
  const res = await request.post("auth/admin/login", { data: TEST_ADMIN });
  return ((await res.json()) as Session).token;
}

/** A user + a mechanic + one pending order between them. */
export async function createOrderFixture(request: APIRequestContext) {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);
  const [s1, s2] = mech.session.account.services;
  const res = await request.post("orders", {
    data: { mechanicId: mech.session.account._id, serviceIds: [s1._id, s2._id], vehicle: CAR },
    ...auth(user.session.token),
  });
  return { user, mech, order: await res.json(), res };
}

export const json = (res: APIResponse) => res.json();

/** Mechanic confirms the customer on arrival: read the code from the customer's order, type it in. */
export async function verifyCustomer(request: APIRequestContext, user: { session: Session }, mech: { session: Session }, orderId: string) {
  const mine = await (await request.get("orders/mine", auth(user.session.token))).json();
  const code = mine.find((o: any) => o._id === orderId)?.verificationCode;
  return request.post(`orders/${orderId}/verify`, { data: { code }, ...auth(mech.session.token) });
}
