/**
 * CATCH-UP SHOWCASE – the live notification stream is down (as on a sleeping free server or a dropped proxy
 * connection). The admin's decisions still reach the mechanic's open page as soon as the tab is focused again:
 * rejected → red "fix your licence" banner; approved → free trial banner. No manual reload.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { API_URL, TEST_ADMIN } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `catchup-${name}.png`) });

test("decisions reach the page without the live stream", async ({ page, request }) => {
  const t = Date.now().toString(36);
  const reg = await (
    await request.post(`${API_URL}/auth/mechanic/register`, {
      data: {
        username: "Nasir Uddin", email: `catchup-${t}@showcase.test`, phone: "01744556677", nid: "1928374650", password: "secret123",
        shopname: `Lalbagh Motors ${t}`, tradeLicense: `TRAD/WRONG/${t}`, inspectionFee: 300, address: "Lalbagh",
        latitude: 23.7189, longitude: 90.3881, services: [{ serviceName: "Oil change", price: 750 }],
      },
    })
  ).json();
  const admin = { headers: { Authorization: `Bearer ${(await (await request.post(`${API_URL}/auth/admin/login`, { data: TEST_ADMIN })).json()).token}` } };
  const decide = (data: object) => request.put(`${API_URL}/admin/mechanics/${reg.account._id}/approval`, { data, ...admin });
  const comeBack = () => page.evaluate(() => window.dispatchEvent(new Event("focus"))); // the mechanic switches back to this tab

  await page.route("**/notifications/stream**", (route) => route.abort()); // no live connection at all
  await page.goto("/");
  await page.evaluate((tk) => localStorage.setItem("mm_token", tk), reg.token);
  await page.goto("/mechanic");
  await expect(page.getByTestId("approval-banner")).toContainText("Waiting for approval");

  // 1. rejected while the stream is down
  expect((await decide({ status: "rejected", reason: "Trade licence number doesn't match the shop" })).ok()).toBe(true);
  await comeBack();
  const banner = page.getByTestId("approval-banner");
  await expect(banner).toContainText("Your garage wasn't approved");
  await expect(banner).toContainText("doesn't match the shop");
  await expect(banner.getByRole("button", { name: "Update trade licence" })).toBeVisible();
  await shot(page, "01-rejected-without-stream");

  // 2. fixed and approved – the free trial shows up the same way
  await banner.getByRole("button", { name: "Update trade licence" }).click();
  await page.getByLabel("Trade licence number").fill(`TRAD/DNCC/${t}/2026`);
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByTestId("approval-banner")).toContainText("Waiting for approval");
  expect((await decide({ status: "approved" })).ok()).toBe(true);
  await comeBack();
  await expect(page.getByTestId("approval-banner")).toHaveCount(0);
  await expect(page.getByTestId("trial-banner")).toContainText("Free trial");
  await shot(page, "02-approved-trial-without-stream");
});
