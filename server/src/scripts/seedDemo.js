// Demo data: garages around Dhaka (approved, with a paid yearly plan) + a demo customer.
// Usage: npm run seed:demo        (safe to run again – existing demo accounts are updated, not duplicated)
// Refuses to run against a production database unless ALLOW_DEMO_SEED=true.
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import { Mechanic } from "../models/Mechanic.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { activate, createPending } from "../services/subscriptions.js";

if (env.isProduction && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Refusing to add demo data in production. Set ALLOW_DEMO_SEED=true if you really want it.");
  process.exit(1);
}

const PASSWORD = "demo1234";

const garages = [
  {
    email: "karim@demo.mymechanic",
    username: "Karim Hossain",
    shopname: "Karim Auto Works",
    inspectionFee: 300,
    address: "Road 4, Mirpur 10",
    latitude: 23.8069,
    longitude: 90.3687,
    phone: "01822334400",
    services: [["Engine diagnosis", 1200], ["Oil change", 800], ["Brake repair", 1500], ["Battery jump-start", 350]],
  },
  {
    email: "gulshan@demo.mymechanic",
    username: "Rafiq Ahmed",
    shopname: "Gulshan Car Care",
    inspectionFee: 500,
    address: "Gulshan 2 Circle",
    latitude: 23.7925,
    longitude: 90.4146,
    phone: "01822334401",
    vehicleTypes: ["Sedan", "Hatchback"],
    services: [["AC service", 2500], ["Car wash", 400], ["Wheel alignment", 900]],
  },
  {
    email: "dhanmondi@demo.mymechanic",
    username: "Sumon Mia",
    shopname: "Dhanmondi Motors",
    inspectionFee: 400,
    address: "Road 27, Dhanmondi",
    latitude: 23.7536,
    longitude: 90.3762,
    phone: "01822334402",
    services: [["Tyre change", 600], ["Suspension check", 1100], ["Towing", 2000]],
  },
  {
    email: "uttara@demo.mymechanic",
    username: "Jamal Uddin",
    shopname: "Uttara Auto Point",
    inspectionFee: 350,
    address: "Sector 7, Uttara",
    latitude: 23.8759,
    longitude: 90.3795,
    phone: "01822334403",
    vehicleTypes: ["SUV / Jeep", "Microbus / Van", "Pickup"],
    services: [["Engine overhaul", 8000], ["Clutch repair", 3500], ["Electrical check", 700]],
  },
];

await connectDB(env.mongoUrl);

for (const g of garages) {
  const data = {
    ...g,
    nid: "1234567890",
    tradeLicense: `TRAD/DNCC/DEMO-${garages.indexOf(g) + 1}/2026`,
    approvalStatus: "approved",
    services: g.services.map(([serviceName, price]) => ({ serviceName, price })),
  };
  let m = await Mechanic.findOne({ email: g.email });
  if (m) m.set(data);
  else m = new Mechanic({ ...data, password: PASSWORD });
  await m.save();

  // a paid yearly plan through the normal (demo) checkout, so it shows in the plan history and revenue;
  // skipped while an earlier paid plan is still running
  const paid = await Subscription.exists({ mechanic: m._id, status: "paid", endsAt: mongoose.trusted({ $gt: new Date() }) });
  if (!paid) {
    m.subscriptionEndsAt = undefined; // replace any plan that was set without a payment
    await m.save();
    await activate(await createPending(m._id, "yearly", "demo"));
  }
  const fresh = await Mechanic.findById(m._id);
  console.log(`garage   ${g.shopname.padEnd(20)} ${g.email.padEnd(28)} paid plan until ${fresh.subscriptionEndsAt.toISOString().slice(0, 10)}`);
}

let customer = await User.findOne({ email: "rahim@demo.mymechanic" });
if (!customer) {
  customer = await User.create({
    username: "Rahim Uddin",
    email: "rahim@demo.mymechanic",
    phone: "01711223344",
    password: PASSWORD,
    vehicles: [{ type: "Sedan", make: "Toyota", model: "Axio", year: 2016, plate: "DHAKA METRO-GA 12-3456" }],
  });
}
console.log(`customer Rahim Uddin          rahim@demo.mymechanic`);
console.log(`\nAll demo accounts use the password: ${PASSWORD}`);

await mongoose.disconnect();
