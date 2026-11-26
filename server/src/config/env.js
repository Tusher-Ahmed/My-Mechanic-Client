const required = ["MONGO_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  console.error("Copy server/.env.example to server/.env and fill it in.");
  process.exit(1);
}

// in production the token-signing secret must be long and random
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is too short for production – use at least 32 random characters.");
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
  // new accounts per IP per hour
  registerRateLimit: Number(process.env.REGISTER_RATE_LIMIT) || 10,
};
