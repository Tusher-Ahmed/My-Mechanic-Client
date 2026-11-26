/**
 * LAYOUT STRESS – fakes "extreme" garages (many car types, very long names, lots of services)
 * by intercepting the API, then checks the pages never overflow horizontally.
 * Protects the design against data we don't control (mechanics type whatever they want).
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../../showcase-output");

const MANY_TYPES = [
  "Sedan", "Hatchback", "Microbus / Van", "Pickup",
  // types that might be added in the future – the UI must cope with unknown, long names
  "Electric vehicle", "Hybrid", "Luxury / Sports car", "Ambulance", "Mini truck", "Tractor", "Three-wheeler CNG", "Vintage & classic cars restoration",
];
const LONG = "Super-long garage name that a mechanic might type without thinking about the layout at all";

const fakeShop = (id: string, overrides = {}) => ({
  _id: id,
  username: "Abdur Rahman Chowdhury the Mechanic with a Very Long Name",
  shopname: LONG,
  address: "House 123, Road 45, Block C, Section 12, Mirpur, Dhaka-1216, Bangladesh (behind the big mosque)",
  latitude: 23.8069,
  longitude: 90.3687,
  vehicleTypes: MANY_TYPES,
  services: Array.from({ length: 15 }, (_, i) => ({
    _id: `s${i}`,
    serviceName: i % 3 === 0 ? `Complete engine overhaul with full diagnostics, parts and labour – package ${i}` : `Service ${i}`,
    price: 1000 * (i + 1) * 13,
  })),
  createdAt: new Date().toISOString(),
  ...overrides,
});

async function mockApi(page: Page) {
  const shops = [
    fakeShop("aaaaaaaaaaaaaaaaaaaaaaaa"),
    fakeShop("bbbbbbbbbbbbbbbbbbbbbbbb", { shopname: "All types garage", vehicleTypes: ["Sedan", "Hatchback", "SUV / Jeep", "Microbus / Van", "Pickup"], latitude: 23.79, longitude: 90.41 }),
    fakeShop("cccccccccccccccccccccccc", { shopname: "Two types", vehicleTypes: ["Sedan", "Hatchback"], latitude: 23.75, longitude: 90.38 }),
  ];
  await page.route(/\/api\/mechanics(\?.*)?$/, (route) => route.fulfill({ json: shops }));
  await page.route(/\/api\/mechanics\/[a-f0-9]{24}$/, (route) => {
    const id = route.request().url().split("/").pop();
    return route.fulfill({ json: shops.find((s) => s._id === id) ?? shops[0] });
  });
}

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > doc.clientWidth + 1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return { overflow: doc.scrollWidth > doc.clientWidth, offenders };
  });

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
]) {
  test(`layout stress – ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockApi(page);

    // store page with 12 car types, long names, 15 services
    await page.goto("/store/aaaaaaaaaaaaaaaaaaaaaaaa");
    await expect(page.getByRole("heading", { name: LONG })).toBeVisible();
    const badges = page.getByTestId("vehicle-types").first();
    await expect(badges.getByRole("button", { name: "+9 more" })).toBeVisible(); // only 3 chips + "more"
    let res = await noHorizontalOverflow(page);
    expect(res.overflow, `store overflow: ${res.offenders.join(", ")}`).toBe(false);
    await page.screenshot({ path: path.join(OUT, `stress-${viewport.name}-store.png`) });

    await badges.getByRole("button", { name: "+9 more" }).click(); // expanded: still no overflow
    await page.waitForTimeout(400);
    res = await noHorizontalOverflow(page);
    expect(res.overflow, `expanded overflow: ${res.offenders.join(", ")}`).toBe(false);
    await page.screenshot({ path: path.join(OUT, `stress-${viewport.name}-store-expanded.png`) });

    // a garage with every standard type collapses to one badge
    await page.goto("/store/bbbbbbbbbbbbbbbbbbbbbbbb");
    await expect(page.getByTestId("vehicle-types").first()).toHaveText(/All car types/);

    // map list
    await page.goto("/map");
    await expect(page.getByText("3 shops")).toBeVisible();
    await page.waitForTimeout(1200);
    res = await noHorizontalOverflow(page);
    expect(res.overflow, `map overflow: ${res.offenders.join(", ")}`).toBe(false);
    await page.screenshot({ path: path.join(OUT, `stress-${viewport.name}-map.png`) });
  });
}
