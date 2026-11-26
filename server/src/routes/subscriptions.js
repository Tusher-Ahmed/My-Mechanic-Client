// Mechanic subscriptions – demo checkout (no real money).
// A real payment gateway can be added later by replacing startCheckout() and adding its callback routes.
import { Router } from "express";
import mongoose from "mongoose";
import { Subscription } from "../models/Subscription.js";
import { Mechanic } from "../models/Mechanic.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { activate, createPending, getPlanSettings, isActive, isApproved, markFailed, quotes } from "../services/subscriptions.js";
import * as S from "../validation/schemas.js";

const router = Router();

// GET /api/subscriptions/plans – public plan list (starter prices + renewal discount)
router.get("/plans", async (_req, res) => {
  res.json(await getPlanSettings());
});

// GET /api/subscriptions/me – mechanic: status, personal prices, history
router.get("/me", requireAuth("mechanic"), async (req, res) => {
  const mechanic = req.account;
  const [history, prices] = await Promise.all([
    Subscription.find({ mechanic: mechanic._id, status: mongoose.trusted({ $in: ["paid", "failed", "cancelled"] }) }).sort({ createdAt: -1 }).limit(50),
    quotes(mechanic._id),
  ]);
  res.json({
    active: isActive(mechanic),
    plan: mechanic.subscriptionPlan ?? null,
    endsAt: mechanic.subscriptionEndsAt ?? null,
    daysLeft: isActive(mechanic) ? Math.ceil((mechanic.subscriptionEndsAt - Date.now()) / 86_400_000) : 0,
    prices,
    history,
  });
});

/** Where the mechanic pays. Demo checkout for now – swap in a real gateway here later. */
const startCheckout = (sub) => ({ gateway: "demo", tranId: sub.tranId, checkoutUrl: `/checkout/${sub.tranId}` });

// POST /api/subscriptions/checkout { plan }
const stillActive = (mechanic) =>
  badRequest(`Your plan is still active until ${mechanic.subscriptionEndsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. You can renew once it ends.`);

router.post("/checkout", requireAuth("mechanic"), validate({ body: S.checkout }), async (req, res) => {
  // plans are sold only to garages an admin has approved
  if (!isApproved(req.account)) {
    throw badRequest(
      req.account.approvalStatus === "rejected"
        ? "Your garage wasn't approved. Update your trade licence in My shop to apply again."
        : "Your garage is waiting for approval. You can choose a plan as soon as it's approved."
    );
  }
  // one plan at a time: renewing only opens when the current plan has ended
  if (isActive(req.account)) throw stillActive(req.account);
  const sub = await createPending(req.auth.id, req.valid.body.plan, "demo");
  res.status(201).json({ ...startCheckout(sub), plan: sub.plan, kind: sub.kind, amount: sub.amount, listPrice: sub.listPrice, days: sub.days });
});

const ownPending = async (req) => {
  const sub = await Subscription.findOne({ tranId: req.valid.params.tranId });
  if (!sub) throw notFound("Payment not found");
  if (sub.mechanic.toString() !== req.auth.id) throw forbidden();
  return sub;
};

// GET /api/subscriptions/checkout/:tranId – the demo checkout page loads the payment details
router.get("/checkout/:tranId", requireAuth("mechanic"), validate({ params: S.tranParams }), async (req, res) => {
  const sub = await ownPending(req);
  const mechanic = await Mechanic.findById(sub.mechanic).select("shopname");
  res.json({ ...sub.toJSON(), shopname: mechanic?.shopname });
});

// POST /api/subscriptions/demo/:tranId/pay { outcome: "success" | "cancel" } – simulated payment
router.post("/demo/:tranId/pay", requireAuth("mechanic"), validate({ params: S.tranParams, body: S.demoPay }), async (req, res) => {
  const sub = await ownPending(req);
  if (sub.gateway !== "demo") throw badRequest("This payment can't be completed here");
  if (sub.status !== "pending") throw badRequest(`This payment is already ${sub.status}`);
  // e.g. a second tab opened before the plan was activated
  const owner = await Mechanic.findById(sub.mechanic);
  if (req.valid.body.outcome === "success" && isActive(owner)) {
    await markFailed(sub, "cancelled");
    throw stillActive(owner);
  }

  const result = req.valid.body.outcome === "success" ? await activate(sub) : await markFailed(sub, "cancelled");
  const mechanic = await Mechanic.findById(sub.mechanic);
  res.json({ subscription: result, active: isActive(mechanic), endsAt: mechanic.subscriptionEndsAt ?? null });
});

export default router;
