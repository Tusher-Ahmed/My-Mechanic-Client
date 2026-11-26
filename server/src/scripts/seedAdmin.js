// Creates (or resets the password of) the admin from ADMIN_* env vars.
// Usage: npm run seed:admin   (from the repo root or the server folder)
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import { Admin } from "../models/Admin.js";

const { ADMIN_USERNAME = "admin", ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8 || !/[A-Za-z]/.test(ADMIN_PASSWORD) || !/[0-9]/.test(ADMIN_PASSWORD)) {
  console.error("ADMIN_PASSWORD must be at least 8 characters with a letter and a number.");
  process.exit(1);
}

await connectDB(env.mongoUrl);

let admin = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
if (admin) {
  admin.password = ADMIN_PASSWORD;
  await admin.save();
  console.log(`Admin ${ADMIN_EMAIL} already existed - password updated.`);
} else {
  admin = await Admin.create({ username: ADMIN_USERNAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log(`Admin ${ADMIN_EMAIL} created.`);
}

await mongoose.disconnect();
