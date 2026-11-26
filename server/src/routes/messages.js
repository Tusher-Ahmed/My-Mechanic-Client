import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Message } from "../models/Message.js";
import { validate } from "../middleware/validate.js";
import { env } from "../config/env.js";
import * as S from "../validation/schemas.js";

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.contactRateLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many messages, please try again later" },
});

// POST /api/messages  – public contact form
router.post("/", contactLimiter, validate({ body: S.contactMessage }), async (req, res) => {
  const message = await Message.create(req.valid.body);
  res.status(201).json({ _id: message._id, message: "Thanks! We'll get back to you soon." });
});

export default router;
