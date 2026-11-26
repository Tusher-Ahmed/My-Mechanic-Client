import { test, expect } from "@playwright/test";
import { auth, CAR, loginAdmin, registerMechanic, registerUser, uid } from "../../helpers/api";

const order = (request, user, mech, extra = {}) =>
  request.post("orders", {
    data: { mechanicId: mech.session.account._id, serviceIds: [mech.session.account.services[0]._id], vehicle: CAR, ...extra },
    ...auth(user.session.token),
  });

test("API-CAR-01 an order needs the car (type, make, model)", async ({ request }) => {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);
  expect((await order(request, user, mech, { vehicle: undefined })).status()).toBe(400);
  const noModel = await order(request, user, mech, { vehicle: { type: "Sedan", make: "Toyota" } });
  expect(noModel.status()).toBe(400);
  expect((await noModel.json()).message).toMatch(/model/i);
  const badType = await order(request, user, mech, { vehicle: { ...CAR, type: "Spaceship" } });
  expect(badType.status()).toBe(400);
  const future = await order(request, user, mech, { vehicle: { ...CAR, year: new Date().getFullYear() + 5 } });
  expect(future.status()).toBe(400);
});

test("API-CAR-02 the car is stored on the order (plate uppercased, year/plate optional)", async ({ request }) => {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);
  const res = await order(request, user, mech);
  expect(res.status()).toBe(201);
  expect((await res.json()).vehicle).toEqual({ ...CAR, plate: CAR.plate.toUpperCase() });

  const minimal = await order(request, user, mech, { vehicle: { type: "SUV / Jeep", make: "Mitsubishi", model: "Pajero", year: "", plate: "" } });
  expect(minimal.status()).toBe(201);
  expect((await minimal.json()).vehicle).toEqual({ type: "SUV / Jeep", make: "Mitsubishi", model: "Pajero" });
});

test("API-CAR-03 the mechanic sees the car on the order and in the notification", async ({ request }) => {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);
  await order(request, user, mech);
  const [o] = await (await request.get("orders/mine", auth(mech.session.token))).json();
  expect(o.vehicle).toMatchObject({ make: "Toyota", model: "Axio", type: "Sedan" });
  const { items } = await (await request.get("notifications", auth(mech.session.token))).json();
  expect(items[0].body).toContain("Toyota Axio · Sedan · 2016");
});

test("API-CAR-04 garages list the car types they service; map can filter by type", async ({ request }) => {
  const tag = uid();
  const suvOnly = await registerMechanic(request, { shopname: `SUV Garage ${tag}`, vehicleTypes: ["SUV / Jeep"] });
  const all = await registerMechanic(request, { shopname: `All Cars ${tag}` });
  expect(all.session.account.vehicleTypes).toHaveLength(5); // default: every type
  expect(suvOnly.session.account.vehicleTypes).toEqual(["SUV / Jeep"]);

  const ids = async (qs) => (await (await request.get(`mechanics?q=${tag}${qs}`)).json()).map((m) => m.shopname).sort();
  expect(await ids("")).toEqual([`All Cars ${tag}`, `SUV Garage ${tag}`]);
  expect(await ids("&vehicleType=Sedan")).toEqual([`All Cars ${tag}`]);
  expect(await ids(`&vehicleType=${encodeURIComponent("SUV / Jeep")}`)).toEqual([`All Cars ${tag}`, `SUV Garage ${tag}`]);
  expect(await ids("&vehicleType=nonsense")).toHaveLength(2); // unknown filter is ignored

  const shop = await (await request.get(`mechanics/${suvOnly.session.account._id}`)).json();
  expect(shop.vehicleTypes).toEqual(["SUV / Jeep"]);
});

test("API-CAR-05 booking a car type the garage doesn't service is refused", async ({ request }) => {
  const user = await registerUser(request);
  const mech = await registerMechanic(request, { vehicleTypes: ["Microbus / Van"] });
  const res = await order(request, user, mech); // CAR is a Sedan
  expect(res.status()).toBe(400);
  expect((await res.json()).message).toContain("doesn't service Sedan");
});

test("API-CAR-06 mechanic must keep at least one car type and can update them", async ({ request }) => {
  const mech = await registerMechanic(request);
  const empty = await request.put("auth/me", { data: { vehicleTypes: [] }, ...auth(mech.session.token) });
  expect(empty.status()).toBe(400);
  const ok = await request.put("auth/me", { data: { vehicleTypes: ["Sedan", "Hatchback"] }, ...auth(mech.session.token) });
  expect((await ok.json()).account.vehicleTypes).toEqual(["Sedan", "Hatchback"]);
});

test("API-CAR-07 'save this car' stores it on the profile once (newest first, max 5)", async ({ request }) => {
  const user = await registerUser(request);
  const mech = await registerMechanic(request);
  await order(request, user, mech, { saveVehicle: true });
  await order(request, user, mech, { saveVehicle: true }); // same car again → no duplicate
  let me = await (await request.get("auth/me", auth(user.session.token))).json();
  expect(me.account.vehicles).toHaveLength(1);

  for (const model of ["Premio", "Noah", "Corolla", "Allion", "Prado"]) {
    await order(request, user, mech, { saveVehicle: true, vehicle: { ...CAR, model, plate: "" } });
  }
  me = await (await request.get("auth/me", auth(user.session.token))).json();
  expect(me.account.vehicles).toHaveLength(5);
  expect(me.account.vehicles[0].model).toBe("Prado"); // newest first, oldest dropped
  expect(me.account.vehicles.map((v) => v.model)).not.toContain("Axio");

  await order(request, user, mech, { vehicle: { ...CAR, model: "Not saved" } }); // saveVehicle not set
  me = await (await request.get("auth/me", auth(user.session.token))).json();
  expect(me.account.vehicles.map((v) => v.model)).not.toContain("Not saved");
});

test("API-CAR-08 user manages saved cars from the profile; admin can see them", async ({ request }) => {
  const user = await registerUser(request);
  const res = await request.put("auth/me", {
    data: { vehicles: [{ type: "Hatchback", make: "Suzuki", model: "Swift", year: 2019 }] },
    ...auth(user.session.token),
  });
  expect((await res.json()).account.vehicles).toEqual([{ type: "Hatchback", make: "Suzuki", model: "Swift", year: 2019 }]);
  const tooMany = await request.put("auth/me", { data: { vehicles: Array.from({ length: 6 }, () => CAR) }, ...auth(user.session.token) });
  expect(tooMany.status()).toBe(400);

  const admin = await loginAdmin(request);
  const users = await (await request.get("admin/users", auth(admin))).json();
  expect(users.find((u) => u._id === user.session.account._id).vehicles[0].model).toBe("Swift");
});
