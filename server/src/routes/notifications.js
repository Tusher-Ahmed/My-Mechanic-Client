import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyToken } from "../utils/token.js";
import { notFound, unauthorized } from "../utils/httpError.js";
import { sendEvent, subscribe } from "../services/notifications.js";

const router = Router();

const mine = (req) => ({ recipient: req.auth.id, recipientRole: req.auth.role });

// GET /api/notifications/stream?token=...  – real-time feed (Server-Sent Events).
// EventSource can't send headers, so the token comes in the query string (redacted from logs).
router.get("/stream", (req, res, next) => {
  let auth;
  try {
    const payload = verifyToken(String(req.query.token || ""));
    auth = { id: payload.sub, role: payload.role };
  } catch {
    return next(unauthorized());
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 5000\n\n");
  sendEvent(res, "ready", { ok: true });

  const unsubscribe = subscribe(auth.role, auth.id, res);
  // comment line every 25s keeps proxies (Render, browsers) from closing an idle connection
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.use(requireAuth());

// GET /api/notifications  – latest 30 + unread count
router.get("/", async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find(mine(req)).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ ...mine(req), read: false }),
  ]);
  res.json({ items, unread });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, ...mine(req) }, { read: true }, { new: true });
  if (!n) throw notFound("Notification not found");
  res.json(n);
});

// POST /api/notifications/read-all
router.post("/read-all", async (req, res) => {
  const { modifiedCount } = await Notification.updateMany({ ...mine(req), read: false }, { read: true });
  res.json({ updated: modifiedCount });
});

export default router;
