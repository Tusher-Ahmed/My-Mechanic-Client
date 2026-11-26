import mongoose from "mongoose";
import { env } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: errors[0], errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    return res.status(409).json({ message: `This ${field} is already registered` });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && env.isProduction ? "Something went wrong" : err.message,
  });
};
