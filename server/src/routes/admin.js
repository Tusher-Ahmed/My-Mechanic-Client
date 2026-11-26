import { Router } from "express";
import { randomInt } from "node:crypto";
import { User } from "../models/User.js";
import { Mechanic } from "../models/Mechanic.js";
import { Admin } from "../models/Admin.js";
import { Order, ORDER_STATUSES } from "../models/Order.js";
import { Message } from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";
import { validate } from "../middleware/validate.js";
import { badRequest, notFound } from "../utils/httpError.js";
import * as S from "../validation/schemas.js";
import { populateParties, shapeOrder } from "./orders.js";
import { notify, orderEvents } from "../services/notifications.js";
import { Subscription } from "../models/Subscription.js";
import { getPlanSettings, runReminders, savePlanSettings } from "../services/subscriptions.js";

const router = Router();
router.use(requireAuth("admin"));

/** Build list / create / update / delete routes for an account model (bodies validated by Zod). */
function accountRoutes(path, Model, { create, update }, { onDelete, onCreate = (b) => b } = {}) {
  router.get(`/${path}`, async (_req, res) => {
    res.json(await Model.find().sort({ createdAt: -1 }).limit(1000));
  });

  router.get(`/${path}/:id`, validate({ params: S.idParams }), async (req, res) => {
    const doc = await Model.findById(req.valid.params.id);
    if (!doc) throw notFound();
    res.json(doc);
  });

  router.post(`/${path}`, validate({ body: create }), async (req, res) => {
    const doc = await Model.create(onCreate(req.valid.body, req));
    res.status(201).json(doc);
  });

  router.put(`/${path}/:id`, validate({ params: S.idParams, body: update }), async (req, res) => {
    const doc = await Model.findById(req.valid.params.id);
    if (!doc) throw notFound();
    const { password, ...changes } = req.valid.body;
    doc.set(changes);
    if (password) doc.password = password; // hashed by pre-save hook; revokes that account's sessions
    await doc.save();
    res.json(doc);
  });

  router.delete(`/${path}/:id`, validate({ params: S.idParams }), async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.valid.params.id);
    if (!doc) throw notFound();
    if (onDelete) await onDelete(doc, req);
    res.json({ _id: doc._id });
  });
}

accountRoutes("users", User, { create: S.adminUserCreate, update: S.adminUserUpdate }, {
  onDelete: (doc) => Promise.all([Order.deleteMany({ user: doc._id }), Notification.deleteMany({ recipient: doc._id })]),
});
accountRoutes("mechanics", Mechanic, { create: S.adminMechanicCreate, update: S.adminMechanicUpdate }, {
  // created by an admin = already checked, so approved at once
  onCreate: (body, req) => ({ ...body, approvalStatus: "approved", approval: { at: new Date(), by: req.auth.id } }),
  onDelete: (doc) => Promise.all([Order.deleteMany({ mechanic: doc._id }), Notification.deleteMany({ recipient: doc._id })]),
});

// admins: an admin can't delete their own account (so there is always at least one)
router.delete("/admins/:id", async (req, res, next) => {
  if (req.params.id === req.auth.id) return next(badRequest("You can't delete your own admin account"));
  next();
});
accountRoutes("admins", Admin, { create: S.adminAdminCreate, update: S.adminAdminUpdate });

// ---------- orders ----------
router.get("/orders", validate({ query: S.ordersQuery }), async (req, res) => {
  const { status } = req.valid.query;
  const filter = ORDER_STATUSES.includes(status) ? { status } : {};
  const orders = await populateParties(Order.find(filter).sort({ createdAt: -1 }).limit(2000));
  res.json(orders.map((o) => shapeOrder(o, "admin")));
});

router.patch("/orders/:id/status", validate({ params: S.idParams, body: S.orderStatus }), async (req, res) => {
  const { status, reason } = req.valid.body;
  const update =
    status === "cancelled"
      ? { status, cancellation: { by: "admin", reason: reason ?? "Cancelled by My Mechanic support", at: new Date() }, $unset: { customerLocation: 1, verificationCode: 1 } }
      : status === "completed"
      ? { status, $unset: { customerLocation: 1, verificationCode: 1 } }
      : status === "accepted"
        ? { status, verificationCode: String(randomInt(0, 10_000)).padStart(4, "0") } // admin override still gives the customer a code
        : { status };
  const order = await Order.findByIdAndUpdate(req.valid.params.id, update, { new: true, runValidators: true });
  if (!order) throw notFound("Order not found");
  const populated = await populateParties(Order.findById(order._id));
  await orderEvents.statusChanged(populated, "admin");
  res.json(shapeOrder(populated, "admin"));
});

router.delete("/orders/:id", validate({ params: S.idParams }), async (req, res) => {
  const order = await Order.findByIdAndDelete(req.valid.params.id);
  if (!order) throw notFound("Order not found");
  res.json({ _id: order._id });
});

// ---------- messages ----------
router.get("/messages", async (_req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }).limit(1000));
});

router.delete("/messages/:id", validate({ params: S.idParams }), async (req, res) => {
  const msg = await Message.findByIdAndDelete(req.valid.params.id);
  if (!msg) throw notFound("Message not found");
  res.json({ _id: msg._id });
});

// ---------- dashboard stats ----------
router.get("/stats", async (_req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // money is only counted for accepted (in progress) and completed jobs – never cancelled ones.
  // Service revenue and travel (transport) charges are always reported separately.
  const earned = { $in: ["$status", ["accepted", "completed"]] };
  const travel = { $ifNull: ["$travelFee", 0] };
  const services = { $ifNull: ["$servicesTotal", { $subtract: ["$totalPrice", travel] }] };
  const sumIfEarned = (expr) => ({ $sum: { $cond: [earned, expr, 0] } });

  const [users, mechanics, messages, byStatus, totals, monthly, topShops, pendingGarages] = await Promise.all([
    User.countDocuments(),
    Mechanic.countDocuments(),
    Message.countDocuments(),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: null, serviceRevenue: sumIfEarned(services), travelRevenue: sumIfEarned(travel) } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          orders: { $sum: 1 },
          serviceRevenue: sumIfEarned(services),
          travelRevenue: sumIfEarned(travel),
        },
      },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: "$shopname", orders: { $sum: 1 }, serviceRevenue: sumIfEarned(services), travelRevenue: sumIfEarned(travel) } },
      { $sort: { orders: -1 } },
      { $limit: 5 },
    ]),
    Mechanic.countDocuments({ approvalStatus: "pending" }),
  ]);

  // fill the last 6 months so the chart has no gaps
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const hit = monthly.find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1);
    months.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      orders: hit?.orders ?? 0,
      serviceRevenue: hit?.serviceRevenue ?? 0,
      travelRevenue: hit?.travelRevenue ?? 0,
    });
  }

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  byStatus.forEach((s) => (ordersByStatus[s._id] = s.count));

  res.json({
    users,
    mechanics,
    pendingGarages,
    messages,
    orders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
    serviceRevenue: totals[0]?.serviceRevenue ?? 0,
    travelRevenue: totals[0]?.travelRevenue ?? 0,
    ordersByStatus,
    months,
    topShops: topShops.map((t) => ({ shopname: t._id, orders: t.orders, serviceRevenue: t.serviceRevenue, travelRevenue: t.travelRevenue })),
  });
});

// ---------- subscriptions (platform revenue) ----------
router.get("/plans", async (_req, res) => res.json(await getPlanSettings()));
router.put("/plans", validate({ body: S.planSettings }), async (req, res) => res.json(await savePlanSettings(req.valid.body)));

// approve or reject a garage that registered itself; the mechanic is notified either way
router.put("/mechanics/:id/approval", validate({ params: S.idParams, body: S.approval }), async (req, res) => {
  const m = await Mechanic.findById(req.valid.params.id);
  if (!m) throw notFound();
  const { status, reason } = req.valid.body;
  m.approvalStatus = status;
  m.approval = { at: new Date(), by: req.auth.id, reason: status === "rejected" ? reason : undefined };
  await m.save();
  await notify({
    recipient: m._id,
    role: "mechanic",
    type: status === "approved" ? "order_completed" : "order_cancelled",
    title: status === "approved" ? "Your garage is approved 🎉" : "Your garage wasn't approved",
    body:
      status === "approved"
        ? "Choose a plan and your garage appears on the map for drivers nearby."
        : `Reason: ${reason}. Update your trade licence in My shop to apply again.`,
    link: status === "approved" ? "/mechanic?tab=subscription" : "/mechanic?tab=shop",
  });
  res.json(m);
});

// grant / extend / end a garage's plan by hand (e.g. a free trial or a support case) – no payment recorded
router.put("/mechanics/:id/subscription", validate({ params: S.idParams, body: S.grantSubscription }), async (req, res) => {
  const m = await Mechanic.findById(req.valid.params.id);
  if (!m) throw notFound();
  m.subscriptionEndsAt = req.valid.body.endsAt ? new Date(req.valid.body.endsAt) : undefined;
  if (req.valid.body.plan) m.subscriptionPlan = req.valid.body.plan;
  m.subscriptionReminders = {};
  await m.save();
  res.json(m);
});

// run the expiry-reminder job now (it also runs every hour)
router.post("/subscriptions/run-reminders", async (_req, res) => res.json(await runReminders()));

// GET /api/admin/revenue – subscription income (the platform's revenue, separate from garages' order revenue)
router.get("/revenue", async (_req, res) => {
  const now = new Date();
  const monthStart = (offset) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const since = monthStart(-11);
  const paid = { status: "paid" };

  const [allTime, monthly, byPlan, byKind, recent, mechanics] = await Promise.all([
    Subscription.aggregate([{ $match: paid }, { $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Subscription.aggregate([
      { $match: { ...paid, paidAt: { $gte: since } } },
      { $group: { _id: { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } }, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Subscription.aggregate([{ $match: paid }, { $group: { _id: "$plan", revenue: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Subscription.aggregate([{ $match: paid }, { $group: { _id: "$kind", revenue: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Subscription.find(paid).sort({ paidAt: -1 }).limit(20).populate("mechanic", "shopname username"),
    Mechanic.find().select("shopname username subscriptionPlan subscriptionEndsAt"),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = monthStart(i - 11);
    const hit = monthly.find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1);
    return { month: d.toLocaleString("en-US", { month: "short" }), year: d.getFullYear(), revenue: hit?.revenue ?? 0, count: hit?.count ?? 0 };
  });
  const day = 86_400_000;
  const garage = (m) => ({ _id: m._id, shopname: m.shopname, username: m.username, plan: m.subscriptionPlan ?? null, endsAt: m.subscriptionEndsAt ?? null });
  const active = mechanics.filter((m) => m.subscriptionEndsAt > now);

  res.json({
    allTime: { revenue: allTime[0]?.revenue ?? 0, payments: allTime[0]?.count ?? 0 },
    thisMonth: months[11].revenue,
    lastMonth: months[10].revenue,
    months,
    byPlan: ["monthly", "yearly"].map((p) => ({ plan: p, revenue: byPlan.find((x) => x._id === p)?.revenue ?? 0, count: byPlan.find((x) => x._id === p)?.count ?? 0 })),
    byKind: ["intro", "renewal"].map((k) => ({ kind: k, revenue: byKind.find((x) => x._id === k)?.revenue ?? 0, count: byKind.find((x) => x._id === k)?.count ?? 0 })),
    garages: {
      active: active.length,
      total: mechanics.length,
      expiringSoon: active.filter((m) => m.subscriptionEndsAt - now <= 7 * day).map(garage),
      expired: mechanics.filter((m) => m.subscriptionEndsAt && m.subscriptionEndsAt <= now).map(garage),
      neverSubscribed: mechanics.filter((m) => !m.subscriptionEndsAt).map(garage),
    },
    recent: recent.map((s) => ({ _id: s._id, tranId: s.tranId, plan: s.plan, kind: s.kind, amount: s.amount, paidAt: s.paidAt, gateway: s.gateway, shopname: s.mechanic?.shopname ?? "Deleted garage" })),
  });
});

export default router;
