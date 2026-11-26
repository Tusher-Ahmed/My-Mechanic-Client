const required = ["MONGO_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  console.error("Copy server/.env.example to server/.env and fill it in.");
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 8080,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
  // max login attempts per IP per 15 min / contact messages per IP per hour
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
  contactRateLimit: Number(process.env.CONTACT_RATE_LIMIT) || 10,
};
