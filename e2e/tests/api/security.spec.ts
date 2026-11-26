/**
 * SECURITY – each test performs a real attack against the running API and expects it to fail safely.
 */
import { test, expect } from "@playwright/test";
import jwt from "jsonwebtoken";
import { auth, CAR, createOrderFixture, loginAdmin, registerMechanic, registerUser, uid } from "../../helpers/api";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

test.describe("Injection & malformed input", () => {
  test("API-SEC-01 NoSQL injection in login is rejected (no login without a password)", async ({ request }) => {
    const { body } = await registerUser(request);
    for (const data of [
      { email: body.email, password: { $ne: null } },
      { email: { $ne: null }, password: { $ne: null } },
      { email: { $regex: ".*" }, password: "x" },
    ]) {
      const res = await request.post("auth/user/login", { data });
      expect(res.status(), JSON.stringify(data)).toBe(400);
      expect((await res.json()).token).toBeUndefined();
    }
  });

  test("API-SEC-02 $-operators and dotted keys anywhere in a body are blocked", async ({ request }) => {
    const { session } = await registerUser(request);
    const r1 = await request.post("messages", { data: { email: "a@b.co", subject: "x", message: "y", $where: "sleep(1000)" } });
    expect(r1.status()).toBe(400);
    const r2 = await request.put("auth/me", { data: { vehicles: [{ ...CAR, "make.$": "x" }] }, ...auth(session.token) });
    expect(r2.status()).toBe(400);
    const r3 = await request.get("mechanics?q[$gt]=");
    expect([200, 400]).toContain(r3.status()); // Express 5 doesn't parse nested query objects – either way no injection
  });

  test("API-SEC-03 invalid ids are rejected before reaching the database", async ({ request }) => {
    const { session } = await registerUser(request);
    for (const id of ["abc", "' OR 1=1 --", "000000000000000000000000z"]) {
      const res = await request.patch(`orders/${encodeURIComponent(id)}/status`, { data: { status: "cancelled" }, ...auth(session.token) });
      expect(res.status(), id).toBe(400);
    }
  });

  test("API-SEC-04 wrong types are rejected (no silent coercion of objects/arrays)", async ({ request }) => {
    const res = await request.post("auth/user/register", {
      data: { username: ["a", "b", "c"], email: `t-${uid()}@e2e.test`, phone: { x: 1 }, password: "secret123" },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.errors.map((e) => e.path)).toEqual(expect.arrayContaining(["username", "phone"]));
  });

  test("API-SEC-05 oversized and over-long input is refused", async ({ request }) => {
    const big = await request.post("messages", { data: { email: "a@b.co", subject: "x", message: "y".repeat(200_000) } });
    expect(big.status()).toBe(413);
    const long = await request.post("messages", { data: { email: "a@b.co", subject: "x", message: "y".repeat(3001) } });
    expect(long.status()).toBe(400);
    const search = await request.get(`mechanics?q=${"a".repeat(200)}`);
    expect(search.status()).toBe(400);
    const { user, mech } = await createOrderFixture(request);
    const note = await request.post("orders", {
      data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR, note: "n".repeat(501) },
      ...auth(user.session.token),
    });
    expect(note.status()).toBe(400);
  });

  test("API-SEC-06 HTML/script in text is stored as plain text, not executed by the API", async ({ request }) => {
    const xss = `<img src=x onerror=alert(1)><script>alert("x")</script>`;
    const { session } = await registerUser(request, { username: `Evil ${xss}`.slice(0, 50) });
    const res = await request.get("auth/me", auth(session.token));
    expect(res.headers()["content-type"]).toContain("application/json"); // never served as HTML
    expect((await res.json()).account.username).toContain("<img");
  });
});

test.describe("Passwords & mass assignment", () => {
  test("API-SEC-07 weak passwords are rejected", async ({ request }) => {
    for (const password of ["short1", "allletters", "12345678", "a".repeat(80) + "1"]) {
      const { res } = await registerUser(request, { password });
      expect(res.status(), password).toBe(400);
    }
  });

  test("API-SEC-08 extra fields can't escalate privileges or overwrite server data", async ({ request }) => {
    const { res, session } = await registerUser(request, { role: "admin", isAdmin: true, _id: "000000000000000000000001", createdAt: "2000-01-01" });
    expect(res.status()).toBe(201);
    expect(session.role).toBe("user");
    expect(session.account._id).not.toBe("000000000000000000000001");
    expect(session.account.tokenVersion).toBeUndefined(); // internal fields never leak
    expect(session.account.createdAt.startsWith("2000")).toBe(false);
    expect((await request.get("admin/stats", auth(session.token))).status()).toBe(403);

    // a user can't change their email / role through the profile endpoint
    const me = await request.put("auth/me", { data: { email: "admin@e2e.test", role: "admin" }, ...auth(session.token) });
    expect((await me.json()).account.email).not.toBe("admin@e2e.test");
  });

  test("API-SEC-09 price manipulation: client-side totals and fake service prices are ignored", async ({ request }) => {
    const user = await registerUser(request);
    const mech = await registerMechanic(request);
    const s = mech.session.account.services[0];
    const res = await request.post("orders", {
      data: { mechanicId: mech.session.account._id, serviceIds: [s._id, s._id, s._id], vehicle: CAR, totalPrice: 1, services: [{ serviceName: "x", price: 0 }] },
      ...auth(user.session.token),
    });
    const order = await res.json();
    expect(order.services).toHaveLength(1); // duplicates collapsed
    expect(order.totalPrice).toBe(s.price);
  });
});

test.describe("Tokens & sessions", () => {
  test("API-SEC-10 forged tokens are rejected (wrong secret, alg none, tampered role)", async ({ request }) => {
    const { session } = await registerUser(request);
    const id = session.account._id;
    const now = Math.floor(Date.now() / 1000);

    const wrongSecret = jwt.sign({ sub: id, role: "admin" }, "not-the-secret");
    const algNone = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: id, role: "admin", iat: now })}.`;
    const [h, , sig] = session.token.split(".");
    const tamperedRole = `${h}.${b64({ sub: id, role: "admin", iat: now, exp: now + 3600 })}.${sig}`;
    const expired = jwt.sign({ sub: id, role: "user", iat: now - 7200, exp: now - 3600 }, "e2e-secret");

    for (const token of [wrongSecret, algNone, tamperedRole, expired, "garbage"]) {
      expect((await request.get("auth/me", auth(token))).status()).toBe(401);
      expect((await request.get("admin/stats", auth(token))).status()).toBe(401);
    }
  });

  test("API-SEC-11 changing the password revokes old sessions; the new token works", async ({ request }) => {
    const { session, body } = await registerUser(request);
    const old = session.token;
    const res = await request.put("auth/me", { data: { currentPassword: body.password, newPassword: "brandNew123" }, ...auth(old) });
    const { token: fresh } = await res.json();
    expect(fresh).toBeTruthy();
    expect((await request.get("auth/me", auth(old))).status()).toBe(401);
    expect((await request.get("auth/me", auth(fresh))).status()).toBe(200);
    expect((await request.get(`notifications/stream?token=${old}`)).status()).toBe(401);
  });

  test("API-SEC-12 admin resetting a password or deleting an account cuts off that account at once", async ({ request }) => {
    const admin = await loginAdmin(request);
    const a = await registerUser(request);
    await request.put(`admin/users/${a.session.account._id}`, { data: { password: "AdminReset123" }, ...auth(admin) });
    expect((await request.get("auth/me", auth(a.session.token))).status()).toBe(401);

    const b = await registerMechanic(request);
    await request.delete(`admin/mechanics/${b.session.account._id}`, auth(admin));
    expect((await request.get("orders/mine", auth(b.session.token))).status()).toBe(401);
  });

  test("API-SEC-13 login doesn't reveal whether an email exists", async ({ request }) => {
    const { body } = await registerUser(request);
    const known = await request.post("auth/user/login", { data: { email: body.email, password: "wrongPass1" } });
    const unknown = await request.post("auth/user/login", { data: { email: `nobody-${uid()}@e2e.test`, password: "wrongPass1" } });
    expect(known.status()).toBe(401);
    expect(unknown.status()).toBe(401);
    expect((await known.json()).message).toBe((await unknown.json()).message);
  });
});

test.describe("HTTP hardening", () => {
  test("API-SEC-14 security headers are set and the framework is not advertised", async ({ request }) => {
    const res = await request.get("health");
    const h = res.headers();
    expect(h["x-powered-by"]).toBeUndefined();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBeTruthy();
    expect(h["content-security-policy"]).toBeTruthy();
    expect(h["strict-transport-security"]).toBeTruthy();
  });

  test("API-SEC-15 errors never leak stack traces or internals", async ({ request }) => {
    const res = await request.post("auth/user/login", { data: "{not json", headers: { "Content-Type": "application/json" } });
    expect(res.status()).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/at .*\.js:\d+|node_modules|stack/i);
  });
});
