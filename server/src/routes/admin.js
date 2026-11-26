import { Router } from "express";
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
import { orderEvents } from "../services/notifications.js";

const router = Router();
router.use(requireAuth("admin"));

/** Build list / create / update / delete routes for an account model (bodies validated by Zod). */
function accountRoutes(path, Model, { create, update }, { onDelete } = {}) {
  router.get(`/${path}`, async (_req, res) => {
    res.json(await Model.find().sort({ createdAt: -1 }).limit(1000));
  });

  router.get(`/${path}/:id`, validate({ params: S.idParams }), async (req, res) => {
    const doc = await Model.findById(req.valid.params.id);
    if (!doc) throw notFound();
    res.json(doc);
  });

  router.post(`/${path}`, validate({ body: create }), async (req, res) => {
    const doc = await Model.create(req.valid.body);
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
  const { status } = req.valid.body;
  const order = await Order.findByIdAndUpdate(
    req.valid.params.id,
    status === "completed" || status === "cancelled" ? { status, $unset: { customerLocation: 1 } } : { status },
    { new: true, runValidators: true }
  );
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

  const [users, mechanics, messages, byStatus, revenueAgg, monthly, topShops] = await Promise.all([
    User.countDocuments(),
    Mechanic.countDocuments(),
    Message.countDocuments(),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $in: ["accepted", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $in: ["$status", ["accepted", "completed"]] }, "$totalPrice", 0] },
          },
        },
      },
    ]),
    Order.aggregate([
      { $group: { _id: "$shopname", orders: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
      { $sort: { orders: -1 } },
      { $limit: 5 },
    ]),
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
      revenue: hit?.revenue ?? 0,
    });
  }

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  byStatus.forEach((s) => (ordersByStatus[s._id] = s.count));

  res.json({
    users,
    mechanics,
    messages,
    orders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
    revenue: revenueAgg[0]?.total ?? 0,
    ordersByStatus,
    months,
    topShops: topShops.map((s) => ({ shopname: s._id, orders: s.orders, revenue: s.revenue })),
  });
});

export default router;
