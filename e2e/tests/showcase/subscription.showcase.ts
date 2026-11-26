/**
 * SUBSCRIPTION SHOWCASE – a new garage without a plan: hidden, red renew banner on every visit,
 * buys a plan through the demo checkout, goes live; an expired garage can't be booked;
 * the garage's own revenue tab; the admin Revenue page.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { ADMIN_URL, API_URL, TEST_ADMIN } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: path.join(OUT, `sub-${name}.png`), fullPage });
const pause = (page: Page, ms = 700) => page.waitForTimeout(ms);

test("subscription showcase", async ({ page, request, browser }) => {
  test.setTimeout(4 * 60_000);
  const t = Date.now().toString(36);
  const register = async (shopname: string, email: string) =>
    (
      await request.post(`${API_URL}/auth/mechanic/register`, {
        data: { username: "Shapla Mia", email, phone: "01733445566", nid: "1928374650", password: "secret123", shopname, inspectionFee: 350, address: "Mohammadpur", latitude: 23.7651, longitude: 90.3589, services: [{ serviceName: "Engine tune-up", price: 1500 }, { serviceName: "Oil change", price: 750 }] },
      })
    ).json();

  // 1. new garage, no plan yet → hidden from the map, red banner on the dashboard
  const shopname = `Shapla Motors ${t}`;
  const fresh = await register(shopname, `shapla-${t}@showcase.test`);
  const onMap = async () => (await (await request.get(`${API_URL}/mechanics?q=${encodeURIComponent(shopname)}`)).json()).length;
  expect(await onMap()).toBe(0);

  await page.goto("/");
  await page.evaluate((tk) => localStorage.setItem("mm_token", tk), fresh.token);
  await page.goto("/mechanic");
  const banner = page.getByTestId("renew-banner");
  await expect(banner).toContainText("Choose a plan to go live");
  await expect(banner).toContainText("hidden from the map");
  await pause(page, 900);
  await shot(page, "01-dashboard-no-plan");
  await page.reload(); // shown on every visit, can't be dismissed
  await expect(page.getByTestId("renew-banner")).toBeVisible();

  // 2. choose a plan → demo checkout → paid → live
  await page.getByRole("button", { name: "Choose a plan" }).click();
  await expect(page.getByTestId("plan-yearly")).toContainText("৳1,499");
  await expect(page.getByTestId("plan-monthly")).toContainText("৳99");
  await pause(page, 800);
  await shot(page, "02-plans");
  await page.getByTestId("plan-monthly").getByRole("button", { name: /Get started/ }).click();
  await expect(page.getByTestId("demo-checkout")).toBeVisible();
  await expect(page.getByTestId("checkout-amount")).toHaveText("৳99");
  await expect(page.getByText("Demo payment – no real money")).toBeVisible();
  await page.getByRole("radio", { name: "Nagad" }).click();
  await pause(page, 500);
  await shot(page, "03-demo-checkout");
  await page.getByRole("button", { name: "Pay ৳99" }).click();
  await expect(page.getByRole("heading", { name: "Payment successful" })).toBeVisible();
  await pause(page, 900);
  await shot(page, "04-payment-success");
  await page.getByRole("link", { name: "Go to my dashboard" }).click();
  await expect(page.getByTestId("renew-banner")).toHaveCount(0); // live – no banner
  expect(await onMap()).toBe(1);
  await page.getByRole("tab", { name: "Subscription" }).click();
  // while the plan has plenty of time left the page leads with "Your plan" – no renew buttons
  await expect(page.getByTestId("plan-status")).toContainText("Your plan");
  await expect(page.getByTestId("plan-status")).toContainText("Monthly plan · active");
  await expect(page.getByTestId("days-left")).toHaveText("30");
  // while a plan is running there is nothing to buy – renewal opens when it ends
  await expect(page.getByTestId("plan-monthly")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Renew|Extend|Get started/ })).toHaveCount(0);
  await expect(page.getByTestId("renew-locked")).toContainText("Renewal opens when your plan ends");
  await expect(page.getByTestId("renew-locked")).toContainText("20% off");
  await pause(page, 800);
  await shot(page, "05-subscription-active", true);

  // 3. a garage whose plan expired: customers see it but can't book; the mechanic sees the red renew banner
  const adminLogin = await (await request.post(`${API_URL}/auth/admin/login`, { data: TEST_ADMIN })).json();
  const adminH = { headers: { Authorization: `Bearer ${adminLogin.token}` } };
  const expiredShop = `Old Town Garage ${t}`;
  const old = await register(expiredShop, `old-${t}@showcase.test`);
  const oh = { headers: { Authorization: `Bearer ${old.token}` } };
  const ck = await (await request.post(`${API_URL}/subscriptions/checkout`, { data: { plan: "monthly" }, ...oh })).json();
  await request.post(`${API_URL}/subscriptions/demo/${ck.tranId}/pay`, { data: { outcome: "success" }, ...oh });
  await request.put(`${API_URL}/admin/mechanics/${old.account._id}/subscription`, { data: { endsAt: new Date(Date.now() - 86_400_000).toISOString() }, ...adminH });
  await request.post(`${API_URL}/admin/subscriptions/run-reminders`, adminH);

  const customer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cpage = await customer.newPage();
  await cpage.goto(`${page.url().split("/mechanic")[0]}/store/${old.account._id}`);
  await expect(cpage.getByTestId("shop-closed")).toContainText("isn't taking bookings right now");
  await expect(cpage.getByRole("button", { name: "Not taking bookings" })).toBeDisabled();
  await pause(cpage, 900);
  await cpage.screenshot({ path: path.join(OUT, "sub-06-store-not-taking-bookings.png") });
  await customer.close();

  await page.evaluate((tk) => localStorage.setItem("mm_token", tk), old.token);
  await page.goto("/mechanic");
  await expect(page.getByTestId("renew-banner")).toContainText("Your plan expired");
  await expect(page.getByTestId("renew-banner")).toContainText("20% off");
  await expect(page.getByTestId("notification-count").filter({ visible: true })).toBeVisible(); // "plan expired" reminder
  await pause(page, 900);
  await shot(page, "07-dashboard-expired");

  // 4. admin Revenue page
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const apage = await admin.newPage();
  await apage.goto(ADMIN_URL);
  await apage.getByLabel("Email").fill(TEST_ADMIN.email);
  await apage.getByLabel("Password").fill(TEST_ADMIN.password);
  await apage.getByRole("button", { name: "Log in" }).click();
  await apage.getByRole("link", { name: "Revenue" }).first().click();
  await expect(apage.getByTestId("revenue-page")).toBeVisible();
  await expect(apage.getByText("Hidden from the map")).toBeVisible();
  await expect(apage.getByTestId("recent-payments")).toContainText(shopname);
  await pause(apage, 1800);
  await apage.screenshot({ path: path.join(OUT, "sub-08-admin-revenue.png"), fullPage: true });
  await admin.close();
});
