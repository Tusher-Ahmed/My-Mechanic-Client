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
    latitude: 23.78,
    longitude: 90.28,
    services: [
      { serviceName: "Oil change", price: 800 },
      { serviceName: "Brake check", price: 500 },
    ],
    ...overrides,
  };
  const res = await request.post("auth/mechanic/register", { data: body });
  return { res, body, session: (await res.json()) as Session };
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
