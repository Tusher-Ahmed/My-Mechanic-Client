import { test, expect } from "@playwright/test";
import { auth, registerMechanic, registerUser, uid } from "../../helpers/api";

test.describe("Registration", () => {
  test("API-AUTH-01 user can register and gets a token (no password in response)", async ({ request }) => {
    const { res, session } = await registerUser(request);
    expect(res.status()).toBe(201);
    expect(session.token).toBeTruthy();
    expect(session.role).toBe("user");
    expect(session.account.password).toBeUndefined();
  });

  test("API-AUTH-02 email is case-insensitive and must be unique", async ({ request }) => {
    const email = `Dup-${uid()}@E2E.test`;
    const first = await registerUser(request, { email });
    expect(first.session.account.email).toBe(email.toLowerCase());
    const second = await registerUser(request, { email: email.toLowerCase() });
    expect(second.res.status()).toBe(409);
  });

  test("API-AUTH-03 invalid data returns 400 with a readable message", async ({ request }) => {
    const { res } = await registerUser(request, { username: "x", email: "not-an-email", password: "1" });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toEqual(expect.any(String));
  });

  test("API-AUTH-04 mechanic can register with shop, location and services", async ({ request }) => {
    const { res, session } = await registerMechanic(request);
    expect(res.status()).toBe(201);
    expect(session.role).toBe("mechanic");
    expect(session.account.services).toHaveLength(2);
  });

  test("API-AUTH-05 mechanic registration requires a valid NID", async ({ request }) => {
    const { res } = await registerMechanic(request, { nid: "12" });
    expect(res.status()).toBe(400);
  });

  test("API-AUTH-06 nobody can register as admin publicly", async ({ request }) => {
    const res = await request.post("auth/admin/register", {
      data: { username: "evil", email: `evil-${uid()}@e2e.test`, password: "secret123" },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe("Login", () => {
  test("API-AUTH-07 login succeeds with correct credentials", async ({ request }) => {
    const { body } = await registerUser(request);
    const res = await request.post("auth/user/login", { data: { email: body.email, password: body.password } });
    expect(res.status()).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });

  test("API-AUTH-08 unknown email returns 401 and the server does not crash", async ({ request }) => {
    const res = await request.post("auth/user/login", { data: { email: `nobody-${uid()}@e2e.test`, password: "x" } });
    expect(res.status()).toBe(401);
    expect((await request.get("health")).status()).toBe(200);
  });

  test("API-AUTH-09 wrong password returns 401", async ({ request }) => {
    const { body } = await registerUser(request);
    const res = await request.post("auth/user/login", { data: { email: body.email, password: "wrong" } });
    expect(res.status()).toBe(401);
  });

  test("API-AUTH-10 a user account cannot log in as a mechanic", async ({ request }) => {
    const { body } = await registerUser(request);
    const res = await request.post("auth/mechanic/login", { data: { email: body.email, password: body.password } });
    expect(res.status()).toBe(401);
  });
});

test.describe("Profile (/auth/me)", () => {
  test("API-AUTH-11 /me needs a token", async ({ request }) => {
    expect((await request.get("auth/me")).status()).toBe(401);
    expect((await request.get("auth/me", auth("garbage"))).status()).toBe(401);
  });

  test("API-AUTH-12 /me returns own account without password", async ({ request }) => {
    const { session, body } = await registerUser(request);
    const me = await (await request.get("auth/me", auth(session.token))).json();
    expect(me.role).toBe("user");
    expect(me.account.email).toBe(body.email);
    expect(me.account.password).toBeUndefined();
  });

  test("API-AUTH-13 user can update name/phone but not email", async ({ request }) => {
    const { session, body } = await registerUser(request);
    const res = await request.put("auth/me", {
      data: { username: "New Name", phone: "01999999999", email: "hijack@e2e.test" },
      ...auth(session.token),
    });
    const { account } = await res.json();
    expect(account.username).toBe("New Name");
    expect(account.phone).toBe("01999999999");
    expect(account.email).toBe(body.email);
  });

  test("API-AUTH-14 password change requires the current password", async ({ request }) => {
    const { session, body } = await registerUser(request);
    const bad = await request.put("auth/me", {
      data: { currentPassword: "wrong", newPassword: "newpass123" },
      ...auth(session.token),
    });
    expect(bad.status()).toBe(400);

    const good = await request.put("auth/me", {
      data: { currentPassword: body.password, newPassword: "newpass123" },
      ...auth(session.token),
    });
    expect(good.status()).toBe(200);
    const login = await request.post("auth/user/login", { data: { email: body.email, password: "newpass123" } });
    expect(login.status()).toBe(200);
  });

  test("API-AUTH-15 mechanic can update shop services", async ({ request }) => {
    const { session } = await registerMechanic(request);
    const res = await request.put("auth/me", {
      data: { services: [{ serviceName: "Car wash", price: 300 }] },
      ...auth(session.token),
    });
    const { account } = await res.json();
    expect(account.services).toHaveLength(1);
    expect(account.services[0].serviceName).toBe("Car wash");
  });
});
