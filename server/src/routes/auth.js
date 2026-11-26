import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { ACCOUNT_MODELS } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { signToken } from "../utils/token.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import { env } from "../config/env.js";
import * as S from "../validation/schemas.js";

const router = Router();

const limiter = (limit, windowMs, message) =>
  rateLimit({ windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false, message: { message } });

const loginLimiter = limiter(env.loginRateLimit, 15 * 60 * 1000, "Too many login attempts, please try again in 15 minutes");
const registerLimiter = limiter(env.registerRateLimit, 60 * 60 * 1000, "Too many accounts created from this network, please try again later");

const session = (account, role) => ({ token: signToken(account, role), role, account });

// a real bcrypt hash used to keep login timing the same whether or not the email exists
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password-1", 12);

// POST /api/auth/user/register  |  /api/auth/mechanic/register
router.post(
  "/:role/register",
  registerLimiter,
  validate({ params: S.registerRoleParams }),
  (req, res, next) => validate({ body: req.valid.params.role === "user" ? S.registerUser : S.registerMechanic })(req, res, next),
  async (req, res) => {
    const { role } = req.valid.params;
    const account = await ACCOUNT_MODELS[role].create(req.valid.body);
    res.status(201).json(session(account, role));
  }
);

// POST /api/auth/:role/login
router.post("/:role/login", loginLimiter, validate({ params: S.roleParams, body: S.login }), async (req, res) => {
  const { role } = req.valid.params;
  const { email, password } = req.valid.body;

  const account = await ACCOUNT_MODELS[role].findOne({ email }).select("+password");
  const ok = await bcrypt.compare(password, account?.password ?? DUMMY_HASH);
  if (!account || !ok) throw unauthorized("Invalid email or password");
  res.json(session(account, role));
});

// GET /api/auth/me
router.get("/me", requireAuth(), (req, res) => {
  res.json({ role: req.auth.role, account: req.account });
});

// PUT /api/auth/me  – update own profile; changing password needs currentPassword and returns a fresh token
router.put(
  "/me",
  requireAuth(),
  (req, res, next) => validate({ body: S.updateMe[req.auth.role] })(req, res, next),
  async (req, res) => {
    const { role, id } = req.auth;
    const { currentPassword, newPassword, ...changes } = req.valid.body;
    const account = await ACCOUNT_MODELS[role].findById(id).select("+password");
    if (!account) throw unauthorized("This account no longer exists");

    account.set(changes);

    if (newPassword) {
      const ok = await account.comparePassword(String(currentPassword ?? ""));
      if (!ok) throw badRequest("Current password is incorrect");
      account.password = newPassword;
    }

    await account.save();
    // other sessions are now revoked (passwordChangedAt); give this device a new token
    res.json({ role, account, ...(newPassword ? { token: signToken(account, role) } : {}) });
  }
);

export default router;
