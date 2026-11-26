/**
 * SHOWCASE – walks through the website like a real visitor and saves screenshots + video.
 * Run:  npm run showcase            (opens a visible browser)
 * Output: e2e/showcase-output/<step>.png  and the video in e2e/test-results/
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import path from "node:path";
import { API_URL } from "../../playwright.config";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");
const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

const GARAGES = [
  { shopname: "Karim Auto Works", username: "Karim Hossain", address: "Road 4, Mirpur 10", latitude: 23.8069, longitude: 90.3687, services: [["Engine diagnosis", 1200], ["Oil change", 800], ["Brake repair", 1500], ["Battery jump-start", 350]] },
  { shopname: "Gulshan Car Care", username: "Rafiq Ahmed", address: "Gulshan 2 Circle", latitude: 23.7925, longitude: 90.4146, vehicleTypes: ["Sedan", "Hatchback"], services: [["AC service", 2500], ["Car wash", 400], ["Wheel alignment", 900]] },
  { shopname: "Dhanmondi Motors", username: "Sumon Mia", address: "Road 27, Dhanmondi", latitude: 23.7536, longitude: 90.3762, services: [["Tyre change", 600], ["Suspension check", 1100], ["Towing", 2000]] },
];
const CUSTOMER = { username: "Rahim Uddin", email: "rahim@showcase.test", phone: "01711223344", password: "secret123" };

async function seed(request) {
  const mechanics = [];
  for (const [i, g] of GARAGES.entries()) {
    const res = await request.post(`${API_URL}/auth/mechanic/register`, {
      data: {
        ...g,
        email: `garage${i + 1}@showcase.test`,
        phone: `0182233440${i}`,
        nid: `123456789${i}`,
        password: "secret123",
        services: g.services.map(([serviceName, price]) => ({ serviceName, price })),
      },
    });
    const m = await res.json();
    mechanics.push(m);
    // garages need an active plan to be on the map – buy one through the demo checkout
    const h = { headers: { Authorization: `Bearer ${m.token}` } };
    const checkout = await (await request.post(`${API_URL}/subscriptions/checkout`, { data: { plan: "monthly" }, ...h })).json();
    await request.post(`${API_URL}/subscriptions/demo/${checkout.tranId}/pay`, { data: { outcome: "success" }, ...h });
    await request.post(`${API_URL}/notifications/read-all`, h); // they've seen the "payment received" message
  }
  await request.post(`${API_URL}/auth/user/register`, { data: CUSTOMER });
  return mechanics;
}

async function loginViaDialog(page: Page, email: string, password: string, asMechanic = false) {
  await page.getByRole("button", { name: "Log in" }).first().click();
  const dialog = page.getByRole("dialog");
  if (asMechanic) await dialog.getByRole("tab", { name: "Mechanic" }).click();
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill(password);
  await dialog.getByRole("button", { name: /^Log in as/ }).click();
  await expect(dialog).toBeHidden();
}

test("client showcase", async ({ page, browser, request }) => {
  test.setTimeout(5 * 60_000);
  const mechanics = await seed(request);
  const karim = mechanics[0];

  // 1. Home – hero with the animated car scene
  await page.goto("/");
  await pause(page, 2600); // let the hero entrance + "order accepted" toast play
  await shot(page, "01-home-hero");

  // scroll through the sections
  for (const [name, heading] of [
    ["02-home-how-it-works", "From breakdown to back on the road"],
    ["03-home-features", "Everything you need when your car lets you down"],
    ["04-home-for-mechanics", "Put your garage on the map"],
    ["05-home-faq", "Frequently asked questions"],
  ] as const) {
    await page.getByRole("heading", { name: heading }).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 120);
    await pause(page, 2200);
    await shot(page, name);
  }

  // 2. Map – pins, near me, popup (other showcases may have added garages, so count what the API returns)
  const count = async (qs = "") => (await (await request.get(`${API_URL}/mechanics${qs}`)).json()).length;
  const allShops = await count();
  const suvShops = await count(`?vehicleType=${encodeURIComponent("SUV / Jeep")}`);
  const shops = (n: number) => page.getByText(new RegExp(`^${n} shops?`));
  let tiles = 0; // street-map tiles actually drawn (guards against a blank map, e.g. a broken map worker)
  page.on("response", (r) => /openfreemap.org.*.pbf/.test(r.url()) && r.ok() && tiles++);
  await page.getByRole("link", { name: "Find mechanics" }).first().click();
  await expect(shops(allShops)).toBeVisible();
  await expect.poll(() => tiles, { message: "street map tiles should load", timeout: 15_000 }).toBeGreaterThan(0);
  await pause(page, 2500); // tiles + pin drop
  await shot(page, "06-map");
  // car type filter: Gulshan Car Care only services Sedans & Hatchbacks
  await page.getByRole("combobox", { name: "My car type" }).click();
  await page.getByRole("textbox", { name: "Search car type" }).fill("suv");
  await expect(page.getByRole("option")).toHaveCount(1); // search narrows the list
  await pause(page, 500);
  await shot(page, "06a-map-car-type-search");
  await page.keyboard.press("Enter");
  await expect(shops(suvShops)).toBeVisible();
  await pause(page, 1500);
  await shot(page, "06b-map-filter-suv");
  await page.getByRole("combobox", { name: "My car type" }).click();
  await page.getByRole("option", { name: "All cars" }).click();
  await expect(shops(allShops)).toBeVisible();

  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("sorted by distance")).toBeVisible();
  await pause(page, 1800);
  await page.getByRole("button", { name: /Karim Auto Works/ }).click();
  await pause(page, 1500);
  await shot(page, "07-map-selected-shop");

  // 3. Store – guest sees "Log in to book", then logs in and books
  await page.getByRole("link", { name: /View shop & book/ }).click();
  await expect(page.getByRole("heading", { name: "Karim Auto Works" })).toBeVisible();
  await pause(page, 1200);
  await shot(page, "08-store");
  await loginViaDialog(page, CUSTOMER.email, CUSTOMER.password);

  // step 1: the car
  const carCard = page.locator("#your-car");
  await carCard.getByRole("combobox", { name: "Car type" }).click();
  await page.getByRole("option", { name: "Sedan" }).click();
  await carCard.getByLabel("Make").fill("Toyota");
  await carCard.getByLabel("Model").fill("Axio");
  await carCard.getByLabel(/Year/).fill("2016");
  await carCard.getByLabel(/Number plate/).fill("Dhaka Metro-Ga 12-3456");
  await expect(carCard.getByLabel("Save this car to my profile for next time")).toBeChecked();
  await pause(page, 600);
  await carCard.scrollIntoViewIfNeeded();
  await shot(page, "08b-store-your-car");

  // step 2: how should we meet – mechanic comes to me (default) → travel charge from the real distance
  await expect(page.getByRole("radio", { name: /Mechanic comes to me/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("trip-estimate")).toContainText(/You're .* away · travel charge ৳\d+/, { timeout: 15_000 });

  // step 3: services
  await page.getByRole("button", { name: /Engine diagnosis/ }).click();
  await page.getByRole("button", { name: /Oil change/ }).click();
  await page.getByLabel("Note for the mechanic (optional)").fill("Car won't start, I'm near Mirpur 10 metro station");
  await expect(page.getByTestId("cart-travel")).toContainText(/Travel charge · [\d.]+ km\s*৳\d+/);
  await pause(page, 800);
  await page.locator("#meet").scrollIntoViewIfNeeded();
  await shot(page, "09-store-cart");

  // open the mechanic in a second window BEFORE booking, so we see the live notification arrive
  const mechContext: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 860 }, recordVideo: { dir: path.join(OUT, "video-mechanic"), size: { width: 1280, height: 860 } } });
  const mech = await mechContext.newPage();
  await mech.goto(page.url().replace(/\/store\/.*/, "/"));
  await loginViaDialog(mech, "garage1@showcase.test", "secret123", true);
  await mech.goto(mech.url().replace(/\/$/, "") + "/mechanic");
  await expect(mech.getByRole("heading", { name: "Karim Auto Works" })).toBeVisible();

  await page.getByRole("button", { name: "Book now" }).click();
  await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
  await expect(page.getByTestId("placed-number")).toHaveText(/^MM-\d{4,}$/);
  const orderNumber = (await page.getByTestId("placed-number").textContent())!.trim();
  await pause(page, 2200); // car drives in, check pops
  await shot(page, "10-order-placed");

  // 4. Mechanic receives it LIVE: toast + bell badge + order in dashboard
  await expect(mech.getByTestId("notification-count").filter({ visible: true })).toHaveText("1", { timeout: 15_000 });
  await pause(mech, 600);
  await mech.screenshot({ path: path.join(OUT, "11-mechanic-live-notification.png") });
  await mech.getByTestId("notification-bell").filter({ visible: true }).click();
  await pause(mech, 700);
  await mech.screenshot({ path: path.join(OUT, "12-mechanic-notification-panel.png") });
  await mech.keyboard.press("Escape");
  await expect(mech.getByText("Engine diagnosis").first()).toBeVisible();
  await expect(mech.getByTestId("order-vehicle")).toContainText("Toyota Axio"); // mechanic sees the car before accepting
  await expect(mech.getByTestId("order-vehicle")).toContainText("DHAKA METRO-GA 12-3456");
  await expect(mech.getByTestId("order-number")).toHaveText(orderNumber); // same number on both sides
  await expect(mech.getByTestId("travel-fee")).toContainText(/Travel charge.*৳\d+/); // garage sees the travel charge too
  await mech.screenshot({ path: path.join(OUT, "13-mechanic-dashboard.png") });

  // before accepting: distance + approximate area only (decide early, customer privacy kept)
  await expect(mech.getByTestId("customer-distance")).toHaveText(/^≈ (\d+\.\d km|\d+0 m|under 100 m) away$/);
  await expect(mech.getByTestId("customer-area")).toBeVisible();
  await expect(mech.getByTestId("customer-location")).toHaveCount(0); // no exact pin yet
  await mech.getByTestId("customer-area").scrollIntoViewIfNeeded();
  await pause(mech, 2500);
  await mech.screenshot({ path: path.join(OUT, "13b-mechanic-pending-distance.png") });

  // customer goes to their orders (pending), then mechanic accepts → customer notified live
  await page.getByRole("button", { name: "View my orders" }).click();
  await expect(page.getByText("pending").first()).toBeVisible();
  await pause(page, 800);
  await shot(page, "14-customer-orders-pending");

  mech.on("dialog", (d) => d.accept());
  await mech.getByRole("button", { name: "Accept", exact: true }).click();
  // accepting asks for an arrival time – suggested from the distance
  const etaDialog = mech.getByRole("dialog");
  await expect(etaDialog.getByRole("heading", { name: "When can you be there?" })).toBeVisible();
  await expect(etaDialog.getByRole("radio", { name: /suggested/ })).toHaveAttribute("aria-checked", "true");
  await pause(mech, 600);
  await mech.screenshot({ path: path.join(OUT, "14b-mechanic-eta-picker.png") });
  await etaDialog.getByRole("radio", { name: /^30 min/ }).click();
  await etaDialog.getByRole("button", { name: /Accept order · 30 min/ }).click();
  await expect(mech.getByText("01711223344")).toBeVisible(); // customer's phone now visible
  await pause(mech, 800);
  await mech.screenshot({ path: path.join(OUT, "15-mechanic-accepted.png") });

  // live location: the customer agreed at booking → after accepting, the mechanic sees a live map
  const live = mech.getByTestId("customer-location");
  await expect(live).toBeVisible({ timeout: 15_000 });
  await expect(live).toHaveAttribute("data-lat", /^23.79/);
  await expect(page.getByTestId("location-sharing")).toContainText("Sharing live location with Karim Auto Works", { timeout: 15_000 });
  await live.scrollIntoViewIfNeeded();
  await pause(mech, 2500);
  await mech.screenshot({ path: path.join(OUT, "15b-mechanic-live-location.png") });
  // the customer moves ~1 km → the pin on the mechanic's map follows within seconds
  await page.context().setGeolocation({ latitude: 23.8031, longitude: 90.4132 });
  await expect(live).toHaveAttribute("data-lat", /^23.803/, { timeout: 20_000 });
  await pause(mech, 1500);
  await mech.screenshot({ path: path.join(OUT, "15c-mechanic-location-moved.png") });
  await shot(page, "15d-customer-sharing-pill");

  await expect(page.getByTestId("notification-count").filter({ visible: true })).toHaveText("1", { timeout: 15_000 });
  await expect(page.getByText(karim.account.phone)).toBeVisible(); // list refreshed live, mechanic phone shown
  await pause(page, 900);
  await shot(page, "16-customer-notified-accepted");
  await page.getByTestId("notification-bell").filter({ visible: true }).click();
  await pause(page, 700);
  await shot(page, "17-customer-notification-panel");
  await page.keyboard.press("Escape");

  // customer: countdown + the 4-digit code to tell the mechanic on arrival
  await expect(page.getByTestId("eta")).toContainText(/Arriving in ~(29|30) min/);
  const codeBox = page.getByTestId("verification-code");
  await expect(codeBox).toBeVisible();
  const code = ((await codeBox.textContent())!.match(/\d{4}/) ?? [""])[0];
  await codeBox.scrollIntoViewIfNeeded();
  await pause(page, 500);
  await shot(page, "17a-customer-code-and-eta");

  // mechanic arrives: a wrong code is refused (shake + attempts left), the right one verifies the customer
  const codeInput = mech.getByLabel("Customer's 4-digit code");
  await codeInput.scrollIntoViewIfNeeded();
  await codeInput.fill(code === "0000" ? "1111" : "0000");
  await mech.getByRole("button", { name: "Verify" }).click();
  await expect(mech.getByRole("alert")).toContainText("4 attempts left");
  await pause(mech, 500);
  await mech.screenshot({ path: path.join(OUT, "17c-mechanic-wrong-code.png") });
  await expect(mech.getByRole("button", { name: "Mark completed" })).toBeDisabled(); // can't finish before verifying
  await codeInput.fill(code);
  await mech.getByRole("button", { name: "Verify" }).click();
  await expect(mech.getByTestId("verified")).toContainText("Customer verified");
  await expect(page.getByTestId("verified")).toContainText("Mechanic arrived and verified", { timeout: 15_000 }); // customer updated live
  await expect(page.getByTestId("location-sharing")).toHaveCount(0, { timeout: 15_000 }); // sharing stopped on arrival
  await pause(mech, 600);
  await mech.screenshot({ path: path.join(OUT, "17d-mechanic-verified.png") });
  await mech.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText("completed").first()).toBeVisible({ timeout: 15_000 });
  await shot(page, "17e-customer-completed");

  // the car was saved to the customer's profile
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByText("Toyota Axio")).toBeVisible();
  await pause(page, 800);
  await shot(page, "17b-customer-my-cars");

  // 5. Mechanic shop editor + registration wizard + other pages
  // the garage's own business numbers (the completed ৳2,220 job)
  await mech.getByRole("tab", { name: "Revenue" }).click();
  await expect(mech.getByTestId("mechanic-revenue")).toContainText("৳2,220");
  await pause(mech, 1500);
  await mech.screenshot({ path: path.join(OUT, "17f-mechanic-revenue.png"), fullPage: true });

  await mech.getByRole("tab", { name: "My shop" }).click();
  await pause(mech, 2500);
  await mech.screenshot({ path: path.join(OUT, "18-mechanic-my-shop.png"), fullPage: true });
  await mechContext.close();

  await page.goto("/about");
  await pause(page, 1000);
  await shot(page, "19-about");
  await page.goto("/contact");
  await pause(page, 800);
  await shot(page, "20-contact");
  await page.goto("/this-page-does-not-exist");
  await pause(page, 2000);
  await shot(page, "21-not-found");

  // log out and look at the mechanic registration wizard
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto("/mechanic/register");
  await page.getByLabel("Full name").fill("Test Mechanic");
  await page.getByRole("button", { name: "Continue" }).click(); // invalid → shake + error
  await pause(page, 600);
  await shot(page, "22-register-wizard-validation");

  // 6. Phone size
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await pause(page, 2400);
  await shot(page, "23-mobile-home");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await pause(page, 600);
  await shot(page, "24-mobile-menu");
  await page.goto("/map");
  await pause(page, 2500);
  await shot(page, "25-mobile-map");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, "no horizontal scroll on phones").toBe(false);
});
