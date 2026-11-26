import { Router } from "express";
import { User } from "../models/User.js";
import { Mechanic } from "../models/Mechanic.js";
import { Admin } from "../models/Admin.js";
import { Order, ORDER_STATUSES } from "../models/Order.js";
import { Message } from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { pick } from "../utils/pick.js";
import { populateParties, shapeOrder } from "./orders.js";

const router = Router();
router.use(requireAuth("admin"));

/** Build list / create / update / delete routes for an account model. */
function accountRoutes(path, Model, fields, { onDelete } = {}) {
  router.get(`/${path}`, async (_req, res) => {
    res.json(await Model.find().sort({ createdAt: -1 }));
  });

  router.get(`/${path}/:id`, async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw notFound();
    res.json(doc);
  });

  router.post(`/${path}`, async (req, res) => {
    const doc = await Model.create(pick(req.body, [...fields, "password"]));
    res.status(201).json(doc);
  });

  router.put(`/${path}/:id`, async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw notFound();
    doc.set(pick(req.body, fields));
    if (req.body.password) doc.password = String(req.body.password); // hashed by pre-save hook
    await doc.save();
    res.json(doc);
  });

  router.delete(`/${path}/:id`, async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw notFound();
    if (onDelete) await onDelete(doc, req);
    res.json({ _id: doc._id });
  });
}

accountRoutes("users", User, ["username", "email", "phone"], {
  onDelete: (doc) => Order.deleteMany({ user: doc._id }),
});
accountRoutes(
  "mechanics",
  Mechanic,
  ["username", "email", "phone", "nid", "shopname", "address", "latitude", "longitude", "services"],
  { onDelete: (doc) => Order.deleteMany({ mechanic: doc._id }) }
);

// admins: an admin can't delete their own account (so there is always at least one)
router.delete("/admins/:id", async (req, res, next) => {
  if (req.params.id === req.auth.id) return next(badRequest("You can't delete your own admin account"));
  next();
});
accountRoutes("admins", Admin, ["username", "email"]);

// ---------- orders ----------
router.get("/orders", async (req, res) => {
  const filter = ORDER_STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
  const orders = await populateParties(Order.find(filter).sort({ createdAt: -1 }));
  res.json(orders.map((o) => shapeOrder(o, "admin")));
});

router.patch("/orders/:id/status", async (req, res) => {
  if (!ORDER_STATUSES.includes(req.body?.status)) throw badRequest("Invalid status");
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!order) throw notFound("Order not found");
  res.json(shapeOrder(await populateParties(Order.findById(order._id)), "admin"));
});

router.delete("/orders/:id", async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw notFound("Order not found");
  res.json({ _id: order._id });
});

// ---------- messages ----------
router.get("/messages", async (_req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }));
});

router.delete("/messages/:id", async (req, res) => {
  const msg = await Message.findByIdAndDelete(req.params.id);
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
