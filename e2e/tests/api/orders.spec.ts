import { test, expect } from "@playwright/test";
import { CAR, auth, createOrderFixture, registerMechanic, registerUser, verifyCustomer } from "../../helpers/api";

test.describe("Placing orders", () => {
  test("API-ORD-01 must be logged in as a user", async ({ request }) => {
    const mech = await registerMechanic(request);
    const data = { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR };
    expect((await request.post("orders", { data })).status()).toBe(401);
    expect((await request.post("orders", { data, ...auth(mech.session.token) })).status()).toBe(403);
  });

  test("API-ORD-02 total price is calculated by the server (client value ignored)", async ({ request }) => {
    const user = await registerUser(request);
    const mech = await registerMechanic(request);
    const [s1, s2] = mech.session.account.services;
    const res = await request.post("orders", {
      data: { mechanicId: mech.session.account._id, serviceIds: [s1._id, s2._id], totalPrice: 1, vehicle: CAR },
      ...auth(user.session.token),
    });
    expect(res.status()).toBe(201);
    const order = await res.json();
    expect(order.totalPrice).toBe(1300);
    expect(order.status).toBe("pending");
    expect(order.shopname).toBe(mech.session.account.shopname);
  });

  test("API-ORD-03 rejects empty or unknown services", async ({ request }) => {
    const user = await registerUser(request);
    const mech = await registerMechanic(request);
    const mechanicId = mech.session.account._id;
    const empty = await request.post("orders", { data: { mechanicId, serviceIds: [], vehicle: CAR }, ...auth(user.session.token) });
    expect(empty.status()).toBe(400);
    const unknown = await request.post("orders", {
      data: { mechanicId, serviceIds: ["000000000000000000000000"], vehicle: CAR },
      ...auth(user.session.token),
    });
    expect(unknown.status()).toBe(400);
  });
});

test.describe("Viewing orders", () => {
  test("API-ORD-04 user and mechanic each see only their own orders", async ({ request }) => {
    const { user, mech, order } = await createOrderFixture(request);
    const other = await registerUser(request);

    const userOrders = await (await request.get("orders/mine", auth(user.session.token))).json();
    expect(userOrders.map((o: any) => o._id)).toEqual([order._id]);
    const mechOrders = await (await request.get("orders/mine", auth(mech.session.token))).json();
    expect(mechOrders.map((o: any) => o._id)).toEqual([order._id]);
    const otherOrders = await (await request.get("orders/mine", auth(other.session.token))).json();
    expect(otherOrders).toEqual([]);
  });

  test("API-ORD-05 phone numbers stay hidden while the order is pending", async ({ request }) => {
    const { user, mech } = await createOrderFixture(request);
    const [u] = await (await request.get("orders/mine", auth(user.session.token))).json();
    expect(u.mechanic.phone).toBeUndefined();
    expect(u.mechanic.email).toBeUndefined();
    const [m] = await (await request.get("orders/mine", auth(mech.session.token))).json();
    expect(m.user.phone).toBeUndefined();
    expect(m.user.username).toBe(user.body.username);
  });
});

test.describe("Order status flow", () => {
  test("API-ORD-06 mechanic accepts -> contacts shared -> completes", async ({ request }) => {
    const { user, mech, order } = await createOrderFixture(request);

    const accepted = await request.patch(`orders/${order._id}/status`, {
      data: { status: "accepted" },
      ...auth(mech.session.token),
    });
    expect(accepted.status()).toBe(200);
    const a = await accepted.json();
    expect(a.status).toBe("accepted");
    expect(a.user.phone).toBe(user.body.phone);

    const [u] = await (await request.get("orders/mine", auth(user.session.token))).json();
    expect(u.mechanic.phone).toBe(mech.body.phone);

    // can't complete before the customer's code is verified on arrival
    const early = await request.patch(`orders/${order._id}/status`, { data: { status: "completed" }, ...auth(mech.session.token) });
    expect(early.status()).toBe(400);
    expect((await verifyCustomer(request, user, mech, order._id)).status()).toBe(200);

    const done = await request.patch(`orders/${order._id}/status`, {
      data: { status: "completed" },
      ...auth(mech.session.token),
    });
    expect((await done.json()).status).toBe("completed");
  });

  test("API-ORD-07 user can cancel only while pending", async ({ request }) => {
    const { user, mech, order } = await createOrderFixture(request);
    const cancel = await request.patch(`orders/${order._id}/status`, {
      data: { status: "cancelled", reason: "Test cancellation" },
      ...auth(user.session.token),
    });
    expect((await cancel.json()).status).toBe("cancelled");

    const second = await createOrderFixture(request);
    await request.patch(`orders/${second.order._id}/status`, {
      data: { status: "accepted" },
      ...auth(second.mech.session.token),
    });
    const late = await request.patch(`orders/${second.order._id}/status`, {
      data: { status: "cancelled", reason: "Test cancellation" },
      ...auth(second.user.session.token),
    });
    expect(late.status()).toBe(400);
    void mech;
  });

  test("API-ORD-08 user cannot accept; strangers cannot touch the order", async ({ request }) => {
    const { user, order } = await createOrderFixture(request);
    const self = await request.patch(`orders/${order._id}/status`, {
      data: { status: "accepted" },
      ...auth(user.session.token),
    });
    expect(self.status()).toBe(400);

    const stranger = await registerUser(request);
    const res = await request.patch(`orders/${order._id}/status`, {
      data: { status: "cancelled", reason: "Test cancellation" },
      ...auth(stranger.session.token),
    });
    expect(res.status()).toBe(403);

    const otherMech = await registerMechanic(request);
    const res2 = await request.patch(`orders/${order._id}/status`, {
      data: { status: "accepted" },
      ...auth(otherMech.session.token),
    });
    expect(res2.status()).toBe(403);
  });

  test("API-ORD-09 invalid transitions are rejected", async ({ request }) => {
    const { mech, order } = await createOrderFixture(request);
    const res = await request.patch(`orders/${order._id}/status`, {
      data: { status: "completed" },
      ...auth(mech.session.token),
    });
    expect(res.status()).toBe(400);
  });
});
