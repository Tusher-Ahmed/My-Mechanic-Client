import { Router } from "express";
import rateLimit from "express-rate-limit";
import { User } from "../models/User.js";
import { Mechanic } from "../models/Mechanic.js";
import { Admin } from "../models/Admin.js";
import { requireAuth } from "../middleware/auth.js";
import { signToken } from "../utils/token.js";
import { badRequest, notFound, unauthorized } from "../utils/httpError.js";
import { pick } from "../utils/pick.js";
import { env } from "../config/env.js";

const router = Router();

const MODELS = { user: User, mechanic: Mechanic, admin: Admin };

/** Fields each role may set on itself (register + profile update). */
const EDITABLE = {
  user: ["username", "phone"],
  mechanic: ["username", "phone", "shopname", "address", "latitude", "longitude", "services"],
  admin: ["username"],
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.loginRateLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in 15 minutes" },
});

const session = (account, role) => ({ token: signToken(account, role), role, account });

const getModel = (role) => {
  const Model = MODELS[role];
  if (!Model) throw notFound();
  return Model;
};

// POST /api/auth/user/register  |  /api/auth/mechanic/register
router.post("/:role/register", async (req, res) => {
  const { role } = req.params;
  if (role !== "user" && role !== "mechanic") throw notFound();

  const fields = [...EDITABLE[role], "email", "password", ...(role === "mechanic" ? ["nid"] : [])];
  const account = await getModel(role).create(pick(req.body, fields));
  res.status(201).json(session(account, role));
});

// POST /api/auth/:role/login
router.post("/:role/login", loginLimiter, async (req, res) => {
  const { role } = req.params;
  const Model = getModel(role);
  const { email, password } = req.body ?? {};
  if (!email || !password) throw badRequest("Email and password are required");

  const account = await Model.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
  if (!account || !(await account.comparePassword(String(password)))) {
    throw unauthorized("Invalid email or password");
  }
  res.json(session(account, role));
});

// GET /api/auth/me
router.get("/me", requireAuth(), async (req, res) => {
  const account = await getModel(req.auth.role).findById(req.auth.id);
  if (!account) throw unauthorized("Account no longer exists");
  res.json({ role: req.auth.role, account });
});

// PUT /api/auth/me  – update own profile; changing password needs currentPassword
router.put("/me", requireAuth(), async (req, res) => {
  const { role, id } = req.auth;
  const account = await getModel(role).findById(id).select("+password");
  if (!account) throw unauthorized("Account no longer exists");

  account.set(pick(req.body, EDITABLE[role]));

  if (req.body.newPassword) {
    const ok = await account.comparePassword(String(req.body.currentPassword || ""));
    if (!ok) throw badRequest("Current password is incorrect");
    account.password = String(req.body.newPassword);
  }

  await account.save();
  res.json({ role, account });
});

export default router;
