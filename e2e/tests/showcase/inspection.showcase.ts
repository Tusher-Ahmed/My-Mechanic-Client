/**
 * INSPECTION SHOWCASE – the customer doesn't know what's wrong: books an inspection (fee + travel only),
 * the mechanic writes what they found and recommends services, the customer books the fix in one tap
 * (travel not charged again).
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { approveQuietly } from "../../helpers/showcase";
import { API_URL, TEST_ADMIN } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `inspection-${name}.png`) });

test("inspection → findings → book the fix", async ({ page, browser, request }) => {
  test.setTimeout(4 * 60_000);
  const t = Date.now().toString(36);
  const call = async (method: string, url: string, data?: object, token?: string) => {
    const res = await request.fetch(`${API_URL}/${url}`, { method, data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok()) throw new Error(`${method} ${url}: ${res.status()} ${await res.text()}`);
    return res.json();
  };

  // seed: a garage (inspection fee ৳450) with a plan, a customer with a saved car
  const shopname = "Banani Auto Lab";
  const mech = await call("POST", "auth/mechanic/register", {
    username: "Sohel Rana", email: `ins-m-${t}@showcase.test`, phone: "01812345678", nid: "1234512345", password: "secret123",
    shopname, tradeLicense: `TRAD/INS/${t}`, inspectionFee: 450, address: "Tejgaon", latitude: 23.78, longitude: 90.4,
    services: [{ serviceName: "Brake pad replacement", price: 1800 }, { serviceName: "Oil change", price: 800 }, { serviceName: "AC gas refill", price: 2500 }],
  });
  await approveQuietly(request, mech.account._id, mech.token);
  const admin = await call("POST", "auth/admin/login", TEST_ADMIN);
  await call("PUT", `admin/mechanics/${mech.account._id}/subscription`, { endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString() }, admin.token);
  const user = await call("POST", "auth/user/register", { username: "Farhana Akter", email: `ins-u-${t}@showcase.test`, phone: "01798765432", password: "secret123" });
  await call("PUT", "auth/me", { vehicles: [{ type: "Sedan", make: "Toyota", model: "Premio", year: 2015 }] }, user.token);

  // 1. customer books an inspection – no services, only the fee + travel
  await page.goto("/");
  await page.evaluate((tk) => localStorage.setItem("mm_token", tk), user.token);
  await page.goto(`/store/${mech.account._id}`);
  await expect(page.getByRole("heading", { name: shopname })).toBeVisible();
  await expect(page.getByTestId("trip-estimate")).toContainText(/travel charge/, { timeout: 15_000 });
  const option = page.getByTestId("inspection-option");
  await expect(option).toContainText("Not sure what's wrong?");
  await expect(option).toContainText("৳450");
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("cart-inspection")).toContainText("৳450");
  // picking a service switches the inspection off (one or the other)
  await page.getByRole("button", { name: /Oil change/ }).click();
  await expect(option).toHaveAttribute("aria-pressed", "false");
  await option.click();
  await page.getByLabel("Note for the mechanic (optional)").fill("Grinding noise when I brake, and the car smells of burnt oil");
  await option.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await shot(page, "01-store-inspection");
  await page.getByRole("button", { name: "Book inspection" }).click();
  await expect(page.getByRole("heading", { name: "Inspection booked!" })).toBeVisible();
  await page.waitForTimeout(1800);
  await shot(page, "02-booked");

  // 2. mechanic accepts + verifies (API), then finishes the inspection in the dashboard with findings
  const order = (await call("GET", "orders/mine", undefined, user.token))[0];
  expect(order.kind).toBe("inspection");
  await call("PATCH", `orders/${order._id}/status`, { status: "accepted", etaMinutes: 20 }, mech.token);
  const code = (await call("GET", "orders/mine", undefined, user.token))[0].verificationCode;
  await call("POST", `orders/${order._id}/verify`, { code }, mech.token);

  const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mpage = await mctx.newPage();
  await mpage.goto(page.url().replace(/\/store\/.*$/, "/"));
  await mpage.evaluate((tk) => localStorage.setItem("mm_token", tk), mech.token);
  await mpage.goto(page.url().replace(/\/store\/.*$/, "/mechanic"));
  const card = mpage.locator("article").filter({ hasText: "Inspection – find the problem" });
  await expect(card.getByTestId("inspection-badge")).toBeVisible();
  await card.getByRole("button", { name: "Finish inspection" }).click();
  const dialog = mpage.getByTestId("findings-dialog");
  await dialog.getByRole("button", { name: "Finish inspection" }).click(); // nothing written yet
  await expect(dialog.getByRole("alert")).toContainText("Write what you found");
  await dialog.getByLabel("What did you find?").fill("Front brake pads are worn to the metal and the engine oil is long overdue.");
  await dialog.getByLabel(/Brake pad replacement/).check();
  await dialog.getByLabel(/Oil change/).check();
  await expect(dialog).toContainText("Estimate for the customer: ৳2,600");
  await mpage.waitForTimeout(400);
  await mpage.screenshot({ path: path.join(OUT, "inspection-03-findings-dialog.png") });
  await dialog.getByRole("button", { name: "Finish inspection" }).click();
  await expect(card.getByTestId("findings")).toContainText("Front brake pads are worn");
  await mctx.close();

  // 3. customer sees the findings and books the recommended services – travel waived
  await page.goto(page.url().replace(/\/store\/.*$/, "/account"));
  const done = page.locator("article").filter({ hasText: "Inspection – find the problem" });
  await expect(done.getByTestId("findings")).toContainText(`What ${shopname} found`);
  await expect(done.getByTestId("findings")).toContainText("Brake pad replacement");
  await done.getByTestId("findings").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, "04-customer-findings");
  await done.getByTestId("book-recommended").click();

  await expect(page.getByTestId("follow-up-banner")).toContainText(/Follow-up to inspection MM-\d+/);
  await expect(page.getByTestId("follow-up-banner")).toContainText("No travel charge this time");
  await expect(page.getByRole("button", { name: /Brake pad replacement/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Oil change/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("cart-travel")).toContainText("Waived (follow-up)");
  await page.getByTestId("follow-up-banner").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await shot(page, "05-follow-up-cart");
  await page.getByRole("button", { name: "Book now" }).click();
  await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
  await page.goto(page.url().replace(/\/store\/.*$/, "/account"));
  const follow = page.locator("article").filter({ hasText: "Brake pad replacement" }).filter({ has: page.getByTestId("follow-up-of") });
  await expect(follow.getByTestId("travel-fee")).toContainText("Waived");
  await expect(follow).toContainText("৳2,600");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "inspection-06-orders.png"), fullPage: true });

  // 4. notifications: the ✕ deletes one for good (still gone after a reload)
  await page.getByTestId("notification-bell").filter({ visible: true }).click();
  const items = page.getByTestId("notification-item");
  const count = await items.count();
  expect(count).toBeGreaterThan(1);
  const first = items.first();
  const title = (await first.locator("button").nth(1).locator("span").nth(1).textContent())!;
  await first.hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "inspection-07-notification-delete.png") });
  await first.getByRole("button", { name: /^Delete notification/ }).click();
  await expect(items).toHaveCount(count - 1);
  await expect(page.getByRole("dialog", { name: "Notifications" })).not.toContainText(title);
  await page.reload();
  await page.getByTestId("notification-bell").filter({ visible: true }).click();
  await expect(items).toHaveCount(count - 1);
  await expect(page.getByRole("dialog", { name: "Notifications" })).not.toContainText(title);
});
