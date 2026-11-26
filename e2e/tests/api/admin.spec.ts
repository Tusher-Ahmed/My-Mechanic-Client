import { test, expect } from "@playwright/test";
import { auth, createOrderFixture, loginAdmin, registerMechanic, registerUser, uid } from "../../helpers/api";

test.describe("Access control", () => {
  test("API-ADM-01 admin routes need an admin token", async ({ request }) => {
    const { session } = await registerUser(request);
    const mech = await registerMechanic(request);
    for (const path of ["admin/stats", "admin/users", "admin/mechanics", "admin/orders", "admin/messages"]) {
      expect((await request.get(path)).status(), path).toBe(401);
      expect((await request.get(path, auth(session.token))).status(), path).toBe(403);
      expect((await request.get(path, auth(mech.session.token))).status(), path).toBe(403);
    }
  });

  test("API-ADM-02 admin can log in", async ({ request }) => {
    expect(await loginAdmin(request)).toBeTruthy();
  });
});

test.describe("Managing accounts", () => {
  test("API-ADM-03 lists users without passwords and mechanics with NID", async ({ request }) => {
    const token = await loginAdmin(request);
    const user = await registerUser(request);
    const mech = await registerMechanic(request);

    const users = await (await request.get("admin/users", auth(token))).json();
    const u = users.find((x: any) => x._id === user.session.account._id);
    expect(u.phone).toBe(user.body.phone);
    expect(u.password).toBeUndefined();

    const mechanics = await (await request.get("admin/mechanics", auth(token))).json();
    expect(mechanics.find((x: any) => x._id === mech.session.account._id).nid).toBe("1234567890");
  });

  test("API-ADM-04 create, edit (with password) and delete a user", async ({ request }) => {
    const token = await loginAdmin(request);
    const email = `made-${uid()}@e2e.test`;
    const created = await request.post("admin/users", {
      data: { username: "Made By Admin", email, phone: "01700000000", password: "pass1234" },
      ...auth(token),
    });
    expect(created.status()).toBe(201);
    const { _id } = await created.json();

    const edited = await request.put(`admin/users/${_id}`, {
      data: { phone: "01799999999", password: "pass5678" },
      ...auth(token),
    });
    expect((await edited.json()).phone).toBe("01799999999");
    const login = await request.post("auth/user/login", { data: { email, password: "pass5678" } });
    expect(login.status()).toBe(200);

    expect((await request.delete(`admin/users/${_id}`, auth(token))).status()).toBe(200);
    expect((await request.get(`admin/users/${_id}`, auth(token))).status()).toBe(404);
  });

  test("API-ADM-05 edit a mechanic's shop", async ({ request }) => {
    const token = await loginAdmin(request);
    const mech = await registerMechanic(request);
    const res = await request.put(`admin/mechanics/${mech.session.account._id}`, {
      data: { shopname: `Renamed ${uid()}`, services: [{ serviceName: "AC repair", price: 2000 }] },
      ...auth(token),
    });
    const updated = await res.json();
    expect(updated.shopname).toMatch(/^Renamed/);
    expect(updated.services).toHaveLength(1);
  });

  test("API-ADM-06 deleting a mechanic also deletes its orders", async ({ request }) => {
    const token = await loginAdmin(request);
    const { mech, order } = await createOrderFixture(request);
    await request.delete(`admin/mechanics/${mech.session.account._id}`, auth(token));
    const orders = await (await request.get("admin/orders", auth(token))).json();
    expect(orders.find((o: any) => o._id === order._id)).toBeUndefined();
  });

  test("API-ADM-07 admin cannot delete their own account", async ({ request }) => {
    const token = await loginAdmin(request);
    const me = await (await request.get("auth/me", auth(token))).json();
    const res = await request.delete(`admin/admins/${me.account._id}`, auth(token));
    expect(res.status()).toBe(400);
  });
});

test.describe("Orders, messages and stats", () => {
  test("API-ADM-08 sees all orders with full contact details and can filter / change status", async ({ request }) => {
    const token = await loginAdmin(request);
    const { order, user } = await createOrderFixture(request);

    const pending = await (await request.get("admin/orders?status=pending", auth(token))).json();
    const o = pending.find((x: any) => x._id === order._id);
    expect(o.user.phone).toBe(user.body.phone);
    expect(pending.every((x: any) => x.status === "pending")).toBe(true);

    const res = await request.patch(`admin/orders/${order._id}/status`, { data: { status: "completed" }, ...auth(token) });
    expect((await res.json()).status).toBe("completed");
    expect((await request.delete(`admin/orders/${order._id}`, auth(token))).status()).toBe(200);
  });

  test("API-ADM-09 reads and deletes contact messages", async ({ request }) => {
    const token = await loginAdmin(request);
    const subject = `Subject ${uid()}`;
    await request.post("messages", { data: { email: "v@e2e.test", subject, message: "hi" } });
    const list = await (await request.get("admin/messages", auth(token))).json();
    const msg = list.find((m: any) => m.subject === subject);
    expect(msg).toBeTruthy();
    expect((await request.delete(`admin/messages/${msg._id}`, auth(token))).status()).toBe(200);
  });

  test("API-ADM-10 dashboard stats have the expected shape", async ({ request }) => {
    const token = await loginAdmin(request);
    const { mech, order } = await createOrderFixture(request);
    await request.patch(`orders/${order._id}/status`, { data: { status: "accepted" }, ...auth(mech.session.token) });

    const stats = await (await request.get("admin/stats", auth(token))).json();
    expect(stats.users).toBeGreaterThanOrEqual(1);
    expect(stats.mechanics).toBeGreaterThanOrEqual(1);
    expect(stats.serviceRevenue).toBeGreaterThanOrEqual(1300);
    expect(stats.travelRevenue).toBeGreaterThanOrEqual(0); // travel charges are reported separately
    expect(stats.months[5]).toEqual(expect.objectContaining({ serviceRevenue: expect.any(Number), travelRevenue: expect.any(Number) }));
    expect(stats.months).toHaveLength(6);
    expect(Object.keys(stats.ordersByStatus).sort()).toEqual(["accepted", "cancelled", "completed", "pending"]);
    expect(stats.topShops.length).toBeGreaterThan(0);
  });
});
