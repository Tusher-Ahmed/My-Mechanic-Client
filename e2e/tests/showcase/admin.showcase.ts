/**
 * ADMIN SHOWCASE – walks through the admin panel with realistic seeded data.
 * Run: npm run showcase   ·   Output: e2e/showcase-output/admin-*.png
 */
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import path from "node:path";
import { ADMIN_URL, API_URL, TEST_ADMIN } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: path.join(OUT, `admin-${name}.png`), fullPage });
const pause = (page: Page, ms = 800) => page.waitForTimeout(ms);
const tag = Date.now().toString(36);

async function seed(request: APIRequestContext) {
  const post = async (url: string, data: object, token?: string) => {
    const res = await request.post(`${API_URL}/${url}`, { data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok()) throw new Error(`${url}: ${res.status()} ${await res.text()}`);
    return res.json();
  };
  const garages = [
    ["Uttara Auto Point", "Jamal Uddin", 23.8759, 90.3795, ["Sedan", "Hatchback", "SUV / Jeep"]],
    ["Banani Motor Clinic", "Hasan Ali", 23.7937, 90.4066, ["Sedan", "Hatchback", "SUV / Jeep", "Microbus / Van", "Pickup"]],
    ["Motijheel Car Doctor", "Kamal Hossain", 23.7330, 90.4172, ["Microbus / Van", "Pickup"]],
  ] as const;
  const mechs = [];
  for (const [i, [shopname, username, latitude, longitude, vehicleTypes]] of garages.entries()) {
    mechs.push(
      await post("auth/mechanic/register", {
        shopname: `${shopname}`,
        username,
        email: `adm-garage${i}-${tag}@showcase.test`,
        phone: `0191100000${i}`,
        nid: `987654321${i}`,
        password: "secret123",
        address: shopname.split(" ")[0],
        latitude,
        longitude,
        vehicleTypes,
        services: [
          { serviceName: "Engine diagnosis", price: 1200 + i * 100 },
          { serviceName: "Oil change", price: 800 },
          { serviceName: "AC service", price: 2500 },
        ],
      })
    );
    // each garage buys a plan through the demo checkout (yearly for the first, renewals for the second)
    const token = mechs[i].token;
    const plans = i === 0 ? ["yearly"] : i === 1 ? ["monthly", "monthly"] : ["monthly"];
    for (const plan of plans) {
      const checkout = await post("subscriptions/checkout", { plan }, token);
      await post(`subscriptions/demo/${checkout.tranId}/pay`, { outcome: "success" }, token);
    }
  }
  // a garage that never paid (shows up under "Hidden from the map")
  await post("auth/mechanic/register", {
    shopname: "Sleepy Garage", username: "Nobody Yet", email: `adm-sleepy-${tag}@showcase.test`, phone: "01911000009", nid: "9876543219", password: "secret123",
    latitude: 23.75, longitude: 90.39, services: [{ serviceName: "Car wash", price: 300 }],
  });
  const people = ["Nusrat Jahan", "Arif Rahman", "Sadia Islam", "Tanvir Ahmed"];
  const users = [];
  for (const [i, username] of people.entries()) {
    users.push(await post("auth/user/register", { username, email: `adm-user${i}-${tag}@showcase.test`, phone: `0171200000${i}`, password: "secret123" }));
  }
  const cars = [
    { type: "Sedan", make: "Toyota", model: "Premio", year: 2015 },
    { type: "SUV / Jeep", make: "Mitsubishi", model: "Pajero", year: 2012 },
    { type: "Microbus / Van", make: "Toyota", model: "Noah", year: 2014, plate: "Dhaka Metro-Cha 11-2233" },
    { type: "Hatchback", make: "Suzuki", model: "Swift", year: 2019 },
  ];
  const plan = [
    [0, 0, 0, "completed"], [1, 1, 1, "accepted"], [2, 2, 2, "pending"], [3, 1, 3, "pending"],
    [0, 1, 0, "completed"], [1, 0, 1, "cancelled"], [2, 1, 2, "completed"], [3, 0, 3, "pending"],
  ] as const;
  for (const [u, m, c, status] of plan) {
    const mech = mechs[m];
    const order = await post(
      "orders",
      { mechanicId: mech.account._id, serviceIds: mech.account.services.slice(0, 1 + (u % 3)).map((s) => s._id), vehicle: cars[c], note: u === 2 ? "Engine making a knocking sound" : undefined },
      users[u].token
    );
    const h = { Authorization: `Bearer ${mech.token}` };
    if (status === "accepted" || status === "completed") await request.patch(`${API_URL}/orders/${order._id}/status`, { data: { status: "accepted" }, headers: h });
    if (status === "completed") {
      // mechanic verifies the customer's code on arrival, then completes
      const mine = await (await request.get(`${API_URL}/orders/mine`, { headers: { Authorization: `Bearer ${users[u].token}` } })).json();
      const code = mine.find((o) => o._id === order._id).verificationCode;
      await request.post(`${API_URL}/orders/${order._id}/verify`, { data: { code }, headers: h });
      await request.patch(`${API_URL}/orders/${order._id}/status`, { data: { status: "completed" }, headers: h });
    }
    if (status === "cancelled") await request.patch(`${API_URL}/orders/${order._id}/status`, { data: { status: "cancelled" }, headers: h });
  }
  await post("messages", { email: "rafi@example.com", subject: "Can I book for my motorbike?", message: "Hi! Do you also support motorbikes? My bike broke down near Farmgate.\n\nThanks, Rafi" });
  await post("messages", { email: "garage.owner@example.com", subject: "Partnership", message: "I own three garages in Chattogram and would like to join the platform." });
}

test("admin showcase", async ({ page, request }) => {
  test.setTimeout(5 * 60_000);
  await seed(request);

  // 1. login – wrong password first (shake + message), then real credentials
  await page.goto(ADMIN_URL);
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  await page.getByLabel("Email").fill(TEST_ADMIN.email);
  await page.getByLabel("Password").fill("wrongPassword1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await pause(page, 600);
  await shot(page, "01-login-error");
  await page.getByLabel("Password").fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();

  // 2. dashboard
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  await expect(page.getByText("Top garages")).toBeVisible();
  await pause(page, 1800); // numbers count up, bars grow
  await shot(page, "02-dashboard", true);
  await page.getByRole("img", { name: /^[A-Z][a-z]{2}: \d+$/ }).last().hover(); // a bar in the orders chart
  await pause(page, 500);
  await shot(page, "03-dashboard-chart-tooltip");

  // 3. orders – filter, open, change status
  await page.getByRole("link", { name: "Orders" }).first().click();
  await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /^pending/ }).click();
  await pause(page, 600);
  await shot(page, "04-orders-pending");
  await page.getByRole("row").filter({ hasText: "Noah" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("DHAKA METRO-CHA 11-2233")).toBeVisible();
  await pause(page, 600);
  await shot(page, "05-order-drawer");
  await page.getByRole("dialog").getByRole("radio", { name: "accepted" }).click();
  await expect(page.getByText(/Order marked as accepted/)).toBeVisible();
  await pause(page, 600);
  await shot(page, "06-order-status-changed");
  await page.keyboard.press("Escape");

  // 4. mechanics – table + edit drawer
  await page.getByRole("link", { name: "Mechanics" }).first().click();
  await expect(page.getByRole("cell", { name: /Banani Motor Clinic/ }).first()).toBeVisible();
  await pause(page, 600);
  await shot(page, "07-mechanics");
  await page.getByRole("row").filter({ hasText: "Motijheel Car Doctor" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Motijheel Car Doctor" })).toBeVisible();
  await pause(page, 700);
  await shot(page, "08-mechanic-drawer");
  await page.keyboard.press("Escape");

  // 5. customers
  await page.getByRole("link", { name: "Customers" }).first().click();
  await expect(page.getByRole("cell", { name: /Nusrat Jahan/ }).first()).toBeVisible();
  await page.getByPlaceholder("Search…").fill("Sadia");
  await pause(page, 600);
  await shot(page, "09-customers-search");

  // 6. messages
  await page.getByRole("link", { name: "Messages" }).first().click();
  await page.getByRole("button", { name: /Can I book for my motorbike/ }).click();
  await expect(page.getByRole("link", { name: "Reply by email" })).toBeVisible();
  await pause(page, 600);
  await shot(page, "10-messages");

  // 7. admins – weak password rejected, then created
  await page.getByRole("link", { name: "Admins" }).first().click();
  await page.getByRole("button", { name: "Add admin" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Name").fill("Second Admin");
  await dlg.getByLabel("Email").fill(`admin2-${tag}@showcase.test`);
  await dlg.getByLabel("Password").fill("password");
  await dlg.getByRole("button", { name: "Create admin" }).click();
  await expect(page.getByText("Password must contain a number")).toBeVisible();
  await pause(page, 500);
  await shot(page, "11-admin-weak-password");
  await dlg.getByLabel("Password").fill("StrongPass2026");
  await dlg.getByRole("button", { name: "Create admin" }).click();
  await expect(page.getByRole("cell", { name: /Second Admin/ }).first()).toBeVisible();
  await pause(page, 500);
  await shot(page, "12-admins");

  // 8. phone width
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await pause(page, 500);
  await shot(page, "13-mobile-menu");
  await page.getByRole("link", { name: "Dashboard" }).click();
  await pause(page, 1500);
  await shot(page, "14-mobile-dashboard");
  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > doc.clientWidth + 1; })
      .slice(0, 6)
      .map((el) => el.tagName.toLowerCase() + "." + String(el.className).slice(0, 80));
    return { overflow: doc.scrollWidth > doc.clientWidth, offenders };
  });
  expect(res.overflow, "no horizontal scroll on phones: " + res.offenders.join(" | ")).toBe(false);
});
