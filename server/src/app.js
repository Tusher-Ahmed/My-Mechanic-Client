import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import mechanicRoutes from "./routes/mechanics.js";
import orderRoutes from "./routes/orders.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { rejectMongoOperators } from "./middleware/validate.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // behind Render's proxy: needed for correct client IPs in rate limiting
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // allow tools without an Origin header (curl, health checks) and configured frontends
        // unknown origins get no CORS headers, so the browser blocks them
        cb(null, !origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin));
      },
    })
  );
  app.use(express.json({ limit: "100kb", strict: true }));
  app.use(rejectMongoOperators);
  // never write login tokens (used by the notification stream) into the logs
  morgan.token("url", (req) => req.originalUrl.replace(/token=[^&]+/, "token=***"));
  app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.get("/", (_req, res) => res.json({ name: "My Mechanic API", status: "ok" }));
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" })
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/mechanics", mechanicRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
