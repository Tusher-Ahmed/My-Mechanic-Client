import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Message } from "../models/Message.js";
import { pick } from "../utils/pick.js";
import { env } from "../config/env.js";

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.contactRateLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many messages, please try again later" },
});

// POST /api/messages  – public contact form
router.post("/", contactLimiter, async (req, res) => {
  const message = await Message.create(pick(req.body, ["email", "subject", "message"]));
  res.status(201).json({ _id: message._id, message: "Thanks! We'll get back to you soon." });
});

export default router;
