/**
 * PAGE LOAD – full reloads of on-demand (lazy) pages must end up visible.
 * Regression guard: a lazy page suspending above the layout once froze the page-entrance
 * animation at opacity 0 (blank mechanic dashboard after a refresh).
 */
import { test, expect, type Page } from "@playwright/test";
import { API_URL } from "../../playwright.config";

const mainVisible = (page: Page) =>
  expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.querySelector("main")!).opacity)), { timeout: 10_000 }).toBe(1);

test("lazy pages are visible after a full page load", async ({ page, request }) => {
  const t = Date.now().toString(36);
  const res = await request.post(`${API_URL}/auth/mechanic/register`, {
    data: { username: "Reload Mech", email: `reload-${t}@showcase.test`, phone: "01811111111", nid: "1234567890", password: "secret123", shopname: `Reload Garage ${t}`, inspectionFee: 300, latitude: 23.8, longitude: 90.4, services: [{ serviceName: "Oil change", price: 800 }] },
  });
  const { token } = await res.json();

  for (const path of ["/map", "/mechanic/register"]) {
    await page.goto(path);
    await mainVisible(page);
  }

  // logged-in mechanic refreshing their dashboard (auth restore + lazy page at the same time)
  await page.evaluate((tk) => localStorage.setItem("mm_token", tk), token);
  await page.goto("/mechanic");
  await expect(page.getByRole("heading", { name: `Reload Garage ${t}` })).toBeVisible();
  await mainVisible(page);
  await page.reload();
  await mainVisible(page);
});
