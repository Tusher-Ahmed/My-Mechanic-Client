import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { runReminders } from "./services/subscriptions.js";

try {
  await connectDB(env.mongoUrl);
} catch (err) {
  console.error("Could not connect to MongoDB:", err.message);
  process.exit(1);
}

createApp().listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

// subscription expiry reminders – on start and then every hour
const reminders = () => runReminders().catch((err) => console.error("Reminder job failed:", err.message));
reminders();
setInterval(reminders, 60 * 60 * 1000).unref();
