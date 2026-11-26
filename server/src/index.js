import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

try {
  await connectDB(env.mongoUrl);
} catch (err) {
  console.error("Could not connect to MongoDB:", err.message);
  process.exit(1);
}

createApp().listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
