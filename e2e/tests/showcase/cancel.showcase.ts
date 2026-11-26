/**
 * CANCEL SHOWCASE – styled cancel / decline dialog with a required reason (no browser confirm box),
 * reason shown to both sides, cancelled jobs never counted as revenue.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { API_URL, TEST_ADMIN } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `cancel-${name}.png`) });

test("cancel with a reason", async ({ page, browser, request }) => {
  test.setTimeout(3 * 60_000);
  const t = Date.now().toString(36);
  const call = async (method: string, url: string, data?: object, token?: string) => {
    const res = await request.fetch(`${API_URL}/${url}`, { method, data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok()) throw new Error(`${method} ${url}: ${res.status()} ${await res.text()}`);
    return res.json();
  };

  // seed: a garage with a plan, a customer, two orders (one accepted + verified, one pending)
  const shopname = `Cancel Test Garage ${t}`;
  const mech = await call("POST", "auth/mechanic/register", {
    username: "Rubel Hasan", email: `cxl-m-${t}@showcase.test`, phone: "01811223344", nid: "1234509876", password: "secret123",
    shopname, latitude: 23.78, longitude: 90.4, services: [{ serviceName: "Brake repair", price: 1500 }, { serviceName: "Oil change", price: 800 }],
  });
  const admin = await call("POST", "auth/admin/login", TEST_ADMIN);
  await call("PUT", `admin/mechanics/${mech.account._id}/subscription`, { endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString() }, admin.token);
  const user = await call("POST", "auth/user/register", { username: "Mitu Akter", email: `cxl-u-${t}@showcase.test`, phone: "01799887766", password: "secret123" });
  const order = (serviceIds) => call("POST", "orders", { mechanicId: mech.account._id, serviceIds, vehicle: { type: "Sedan", make: "Honda", model: "Civic" }, serviceMode: "home", location: { latitude: 23.79, longitude: 90.41 } }, user.token);
  const job = await order([mech.account.services[0]._id]);
  const pending = await order([mech.account.services[1]._id]);
  await call("PATCH", `orders/${job._id}/status`, { status: "accepted", etaMinutes: 20 }, mech.token);
  const code = (await call("GET", "orders/mine", undefined, user.token)).find((o) => o._id === job._id).verificationCode;
  await call("POST", `orders/${job._id}/verify`, { code }, mech.token);

  let nativeDialogs = 0;
  page.on("dialog", (d) => {
    nativeDialogs++;
    d.dismiss();
  });

  // 1. mechanic cancels the accepted job – styled dialog, reason required
  await page.goto("/");
  await page.evaluate((tk) => localStorage.setItem("mm_token", tk), mech.token);
  await page.goto("/mechanic");
  const card = page.locator("article").filter({ hasText: "Brake repair" });
  await card.getByRole("button", { name: "Cancel", exact: true }).click();
  const dialog = page.getByTestId("cancel-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText(/^Cancel order MM-\d+\?$/);
  await dialog.getByRole("button", { name: "Cancel order" }).click(); // no reason yet
  await expect(dialog.getByRole("alert")).toHaveText("Please choose why you want to cancel this order.");
  await dialog.getByLabel("Parts not available").check();
  await dialog.getByLabel("Extra note").fill("Brake pads arrive tomorrow");
  await page.waitForTimeout(400);
  await shot(page, "01-mechanic-dialog");
  await dialog.getByRole("button", { name: "Cancel order" }).click();
  await expect(card.getByTestId("cancellation")).toContainText("You cancelled · Parts not available – Brake pads arrive tomorrow");
  await expect(card.getByTestId("cancellation")).toContainText("Not counted in your revenue");
  await page.waitForTimeout(500);
  await shot(page, "02-mechanic-card");

  // the money of the cancelled job is not added
  await page.getByRole("tab", { name: "Revenue" }).click();
  await expect(page.getByTestId("rev-services-total")).toContainText("৳0");
  await expect(page.getByTestId("rev-travel-month")).toContainText("৳0");

  // 2. mechanic declines the pending order – decline reasons
  await page.getByRole("tab", { name: "Orders" }).click();
  await page.locator("article").filter({ hasText: "Oil change" }).getByRole("button", { name: "Decline" }).click();
  await expect(dialog.getByRole("heading")).toHaveText(/^Decline order MM-\d+\?$/);
  await expect(dialog.getByLabel("Fully booked right now")).toBeVisible();
  await dialog.getByRole("button", { name: "Keep the order" }).click();
  await expect(dialog).toHaveCount(0);

  // 3. the customer sees who cancelled and why
  const customer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cpage = await customer.newPage();
  await cpage.goto(page.url().replace(/\/mechanic.*$/, "/"));
  await cpage.evaluate((tk) => localStorage.setItem("mm_token", tk), user.token);
  await cpage.goto(page.url().replace(/\/mechanic.*$/, "/account"));
  const cancelledCard = cpage.locator("article").filter({ hasText: "Brake repair" });
  await expect(cancelledCard.getByTestId("cancellation")).toContainText(`${shopname} cancelled · Parts not available – Brake pads arrive tomorrow`);

  // 4. the customer cancels the pending order through the same styled dialog
  await cpage.locator("article").filter({ hasText: "Oil change" }).getByRole("button", { name: "Cancel order" }).click();
  const cdialog = cpage.getByTestId("cancel-dialog");
  await cdialog.getByLabel("Other", { exact: true }).check();
  await cdialog.getByLabel("Reason").fill("My cousin fixed it");
  await cpage.waitForTimeout(400);
  await cpage.screenshot({ path: path.join(OUT, "cancel-03-customer-dialog.png") });
  await cdialog.getByRole("button", { name: "Cancel order" }).click();
  await expect(cpage.locator("article").filter({ hasText: "Oil change" }).getByTestId("cancellation")).toContainText("You cancelled · My cousin fixed it");
  await cpage.screenshot({ path: path.join(OUT, "cancel-04-customer-orders.png"), fullPage: true });
  await customer.close();

  expect(nativeDialogs, "no browser confirm boxes").toBe(0);
});
