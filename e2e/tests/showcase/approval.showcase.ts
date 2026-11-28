/**
 * APPROVAL SHOWCASE – a garage registers itself with a trade licence, waits for approval (hidden, no plans),
 * the admin rejects it with a reason, the mechanic fixes the licence, the admin approves it – the mechanic
 * sees it live and can choose a plan. An admin-created garage needs no approval.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { ADMIN_URL, API_URL, TEST_ADMIN } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: path.join(OUT, `approval-${name}.png`), fullPage });
const pause = (page: Page, ms = 700) => page.waitForTimeout(ms);

test("garage approval", async ({ page, browser, request }) => {
  test.setTimeout(4 * 60_000);
  const t = Date.now().toString(36);
  const shopname = "Tejgaon Auto Lab";
  const onMap = async () => (await (await request.get(`${API_URL}/mechanics?q=${encodeURIComponent(shopname)}`)).json()).length;

  // 1. the mechanic registers through the wizard – trade licence required
  await page.goto("/mechanic/register");
  await page.getByLabel("Full name").fill("Nayeem Islam");
  await page.getByLabel("Phone").fill("01912345678");
  await page.getByLabel("Email").fill(`apr-${t}@showcase.test`);
  await page.getByLabel("NID number").fill("1990123456789");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Shop name").fill(shopname);
  await page.getByRole("button", { name: "Continue" }).click(); // no licence yet
  await expect(page.getByRole("alert")).toContainText("trade licence number");
  await page.getByLabel("Trade licence number").fill("TRAD/DNCC/1234");
  await pause(page, 400);
  await shot(page, "01-wizard-licence");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Use my current location" }).click();
  await pause(page, 800);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Inspection fee/).fill("400");
  await page.getByLabel("Service name").fill("Engine diagnosis");
  await page.getByLabel("Price").fill("1200");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("approval-step")).toContainText("We check your trade licence");
  await expect(page.getByTestId("approval-step")).toContainText("TRAD/DNCC/1234");
  await expect(page.getByTestId("approval-step")).toContainText("7-day free trial");
  await pause(page, 600);
  await shot(page, "02-wizard-approval-step");
  await page.getByRole("button", { name: "Submit for approval" }).click();

  // 2. waiting for approval: banner, plans locked, hidden from the map
  const banner = page.getByTestId("approval-banner");
  await expect(banner).toContainText("Waiting for approval");
  await expect(banner).toContainText("TRAD/DNCC/1234");
  await page.getByRole("tab", { name: "Subscription" }).click();
  await expect(page.getByTestId("plans-locked")).toBeVisible();
  expect(await onMap()).toBe(0);
  await pause(page, 800);
  await shot(page, "03-mechanic-pending");

  // 3. the admin sees it on the dashboard and rejects it with a reason
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await actx.newPage();
  await admin.goto(ADMIN_URL);
  await admin.getByLabel("Email").fill(TEST_ADMIN.email);
  await admin.getByLabel("Password").fill(TEST_ADMIN.password);
  await admin.getByRole("button", { name: "Log in" }).click();
  await expect(admin.getByTestId("pending-garages")).toContainText("waiting for approval");
  await pause(admin, 1200);
  await shot(admin, "04-admin-dashboard");
  await admin.getByTestId("pending-garages").click();
  await expect(admin.getByTestId("pending-filter")).toHaveAttribute("aria-pressed", "true");
  await admin.getByText(shopname).click();
  const box = admin.getByTestId("admin-approval");
  await expect(box).toContainText("TRAD/DNCC/1234");
  await box.getByRole("button", { name: "Reject" }).click(); // reason required
  await box.getByLabel("Reason (needed to reject)").fill("Licence number is incomplete – please add the year");
  // with a reason typed, Approve can't be clicked by mistake
  await expect(box.getByRole("button", { name: "Approve" })).toBeDisabled();
  await expect(admin.getByTestId("approve-disabled-hint")).toBeVisible();
  await pause(admin, 400);
  await shot(admin, "05-admin-review");
  await box.getByRole("button", { name: "Reject" }).click();
  await expect(box).toContainText("Rejected");

  // 4. the mechanic is told live, fixes the licence in My shop → pending again
  await expect(banner).toContainText("Your garage wasn't approved", { timeout: 10_000 });
  await expect(banner).toContainText("please add the year");
  await pause(page, 800);
  await shot(page, "06-mechanic-rejected");
  await banner.getByRole("button", { name: "Update trade licence" }).click();
  await page.getByLabel("Trade licence number").fill("TRAD/DNCC/1234/2026");
  await expect(page.getByText("Changing it sends your garage for approval again")).toBeVisible();
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(banner).toContainText("Waiting for approval");

  // 5. the admin approves – the mechanic sees it at once: the 7-day free trial starts, plans can be bought any time
  await admin.reload();
  await admin.getByText(shopname).click();
  await expect(box).toContainText("TRAD/DNCC/1234/2026");
  await box.getByRole("button", { name: "Approve" }).click();
  await expect(box).toHaveCount(0);
  await expect(page.getByTestId("approval-banner")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByTestId("trial-banner")).toContainText("Free trial");
  await expect(page.getByTestId("trial-banner")).toContainText("7 more days");
  await pause(page, 800);
  await shot(page, "07-mechanic-approved-trial");
  await page.getByRole("tab", { name: "Subscription" }).click();
  await expect(page.getByTestId("plans-locked")).toHaveCount(0);
  await expect(page.getByTestId("plan-status")).toContainText("Free trial · active");
  await expect(page.getByTestId("days-left")).toHaveText("7");
  await expect(page.getByTestId("plan-monthly")).toBeVisible(); // can buy during the trial
  await pause(page, 1000);
  await shot(page, "07b-mechanic-trial-plans");

  // 5b. a problem found later: the admin revokes the approval – the garage leaves the map, the mechanic sees why at once
  const approved = admin.getByTestId("admin-approved");
  await approved.getByText("Problem with this garage?").click();
  await approved.getByLabel("Reason").fill("Trade licence doesn't match the shop name");
  await pause(admin, 400);
  await shot(admin, "07c-admin-revoke");
  await approved.getByRole("button", { name: "Revoke approval" }).click();
  await expect(admin.getByTestId("admin-approval")).toContainText("Rejected");
  await expect(page.getByTestId("approval-banner")).toContainText("Your garage wasn't approved", { timeout: 10_000 });
  await expect(page.getByTestId("approval-banner")).toContainText("doesn't match the shop name");
  expect(await onMap()).toBe(0);
  await pause(page, 600);
  await shot(page, "07d-mechanic-revoked");

  // 6. a garage the admin creates is approved at once
  await admin.keyboard.press("Escape"); // close the drawer
  await admin.getByTestId("pending-filter").click(); // show all
  await admin.getByRole("button", { name: "Add mechanic" }).click();
  await admin.getByLabel("Owner name").fill("Admin Added");
  await admin.getByLabel("Phone").fill("01700000000");
  await admin.getByLabel("Email").fill(`apr-admin-${t}@showcase.test`);
  await admin.getByLabel("NID number").fill("1234567890");
  await admin.getByLabel("Password").fill("secret123");
  await admin.getByLabel("Shop name").fill(`Admin Garage ${t}`);
  await admin.getByLabel("Trade licence number").fill(`TRAD/ADMIN/${t}`);
  await admin.getByLabel(/Inspection fee/).fill("300");
  await admin.getByRole("button", { name: "Create mechanic" }).click();
  const row = admin.getByRole("row").filter({ hasText: `Admin Garage ${t}` });
  await expect(row).toContainText("approved");
  await pause(admin, 600);
  await shot(admin, "08-admin-created-approved");
  await actx.close();
});
