// Starts the real API for end-to-end tests: wipes the test database,
// creates the test admin, then boots the server (server/src/index.js).
import mongoose from "mongoose";

const url = process.env.MONGO_URL;
if (!/e2e|test/i.test(url)) {
  console.error(`Refusing to wipe "${url}": the e2e database name must contain "e2e" or "test".`);
  process.exit(1);
}

await mongoose.connect(url);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();

const { Admin } = await import("../../server/src/models/Admin.js");
const { connectDB } = await import("../../server/src/config/db.js");
await connectDB(url);
await Admin.syncIndexes();
await Admin.create({ username: "E2E Admin", email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
await mongoose.disconnect();

await import("../../server/src/index.js");
