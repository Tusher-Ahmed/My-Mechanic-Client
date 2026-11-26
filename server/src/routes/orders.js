import { Router } from "express";
import { Order } from "../models/Order.js";
import { Mechanic } from "../models/Mechanic.js";
import { User, MAX_SAVED_VEHICLES } from "../models/User.js";
import { sameVehicle } from "../models/vehicle.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { orderEvents, publish } from "../services/notifications.js";
import * as S from "../validation/schemas.js";

const router = Router();

/** Contact details (email/phone) are only shared once the mechanic has accepted the order. */
export function shapeOrder(order, viewerRole) {
  const o = order.toJSON();
  // exact location: the customer always sees their own; the mechanic only while the job is accepted; admins never
  const showLocation = viewerRole === "user" || (viewerRole === "mechanic" && o.status === "accepted" && o.shareLocation);
  if (!showLocation) delete o.customerLocation;
  const shareContact = viewerRole === "admin" || o.status === "accepted" || o.status === "completed";
  if (!shareContact) {
    if (o.user && typeof o.user === "object") o.user = { _id: o.user._id, username: o.user.username };
    if (o.mechanic && typeof o.mechanic === "object") {
      o.mechanic = { _id: o.mechanic._id, username: o.mechanic.username, shopname: o.mechanic.shopname };
    }
  }
  return o;
}

export const populateParties = (query) =>
  query
    .populate("user", "username email phone")
    .populate("mechanic", "username email phone shopname address latitude longitude");

// POST /api/orders  { mechanicId, serviceIds: [], vehicle: {type, make, model, year?, plate?}, saveVehicle?, note? }
router.post("/", requireAuth("user"), validate({ body: S.createOrder }), async (req, res) => {
  const { mechanicId, serviceIds, vehicle, saveVehicle, note, shareLocation = false, location } = req.valid.body;

  const mechanic = await Mechanic.findById(mechanicId);
  if (!mechanic) throw notFound("Shop not found");
  if (!mechanic.vehicleTypes.includes(vehicle.type)) {
    throw badRequest(`${mechanic.shopname} doesn't service ${vehicle.type} cars. Try another garage.`);
  }

  // prices are taken from the database, never trusted from the browser
  const services = [...new Set(serviceIds)].map((id) => {
    const s = mechanic.services.id(id);
    if (!s) throw badRequest("One of the selected services no longer exists");
    return { serviceId: s._id, serviceName: s.serviceName, price: s.price };
  });
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

  const order = await Order.create({
    user: req.auth.id,
    mechanic: mechanic._id,
    shopname: mechanic.shopname,
    services,
    totalPrice,
    vehicle,
    note,
    shareLocation,
    customerLocation: shareLocation && location ? { ...location, updatedAt: new Date() } : undefined,
  });

  // optionally remember the car on the user's profile (newest first, max 5)
  if (saveVehicle) {
    const user = await User.findById(req.auth.id);
    if (user && !user.vehicles.some((v) => sameVehicle(v, order.vehicle))) {
      user.vehicles = [order.vehicle.toObject(), ...user.vehicles.map((v) => v.toObject())].slice(0, MAX_SAVED_VEHICLES);
      await user.save();
    }
  }

  await orderEvents.created(await populateParties(Order.findById(order._id)));
  res.status(201).json(shapeOrder(order, "user"));
});

// PATCH /api/orders/:id/location  – customer shares / updates / stops their live location
//   { latitude, longitude, accuracy? }  or  { share: false }
router.patch("/:id/location", requireAuth("user"), validate({ params: S.idParams, body: S.locationUpdate }), async (req, res) => {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw notFound("Order not found");
  if (order.user.toString() !== req.auth.id) throw forbidden();
  if (order.status !== "pending" && order.status !== "accepted") {
    throw badRequest("Location sharing has ended for this order");
  }

  const body = req.valid.body;
  if (body.share === false) {
    order.shareLocation = false;
    order.customerLocation = undefined;
  } else {
    order.shareLocation = true;
    order.customerLocation = { latitude: body.latitude, longitude: body.longitude, accuracy: body.accuracy, updatedAt: new Date() };
  }
  await order.save();

  // live push to the mechanic – only once they've accepted the job
  if (order.status === "accepted") {
    publish("mechanic", order.mechanic.toString(), "order:location", {
      orderId: order._id,
      shareLocation: order.shareLocation,
      customerLocation: order.shareLocation ? order.customerLocation : null,
    });
  }
  res.json({ _id: order._id, shareLocation: order.shareLocation, customerLocation: order.customerLocation ?? null });
});

// GET /api/orders/mine  – orders placed by this user / received by this mechanic
router.get("/mine", requireAuth("user", "mechanic"), async (req, res) => {
  const { id, role } = req.auth;
  const orders = await populateParties(Order.find({ [role]: id }).sort({ createdAt: -1 }).limit(500));
  res.json(orders.map((o) => shapeOrder(o, role)));
});

const TRANSITIONS = {
  mechanic: { pending: ["accepted", "cancelled"], accepted: ["completed", "cancelled"] },
  user: { pending: ["cancelled"] },
};

// PATCH /api/orders/:id/status  { status }
router.patch("/:id/status", requireAuth("user", "mechanic"), validate({ params: S.idParams, body: S.orderStatus }), async (req, res) => {
  const { id, role } = req.auth;
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw notFound("Order not found");
  if (order[role].toString() !== id) throw forbidden();

  const next = req.valid.body.status;
  const allowed = TRANSITIONS[role][order.status] || [];
  if (!allowed.includes(next)) throw badRequest(`Can't change a ${order.status} order to ${next}`);

  order.status = next;
  if (next === "completed" || next === "cancelled") order.customerLocation = undefined; // stop + delete location
  await order.save();
  const populated = await populateParties(Order.findById(order._id));
  await orderEvents.statusChanged(populated, role);
  res.json(shapeOrder(populated, role));
});

export default router;
