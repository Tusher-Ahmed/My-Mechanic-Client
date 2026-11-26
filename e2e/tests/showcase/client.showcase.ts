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
    mechanics.push(await res.json());
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

  // step 2: services
  await page.getByRole("button", { name: /Engine diagnosis/ }).click();
  await page.getByRole("button", { name: /Oil change/ }).click();
  await page.getByLabel("Note for the mechanic (optional)").fill("Car won't start, I'm near Mirpur 10 metro station");
  await pause(page, 800);
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
  await mech.screenshot({ path: path.join(OUT, "13-mechanic-dashboard.png") });

  // customer goes to their orders (pending), then mechanic accepts → customer notified live
  await page.getByRole("button", { name: "View my orders" }).click();
  await expect(page.getByText("pending").first()).toBeVisible();
  await pause(page, 800);
  await shot(page, "14-customer-orders-pending");

  mech.on("dialog", (d) => d.accept());
  await mech.getByRole("button", { name: "Accept", exact: true }).click();
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

  // the car was saved to the customer's profile
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByText("Toyota Axio")).toBeVisible();
  await pause(page, 800);
  await shot(page, "17b-customer-my-cars");

  // 5. Mechanic shop editor + registration wizard + other pages
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
