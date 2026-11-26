import { Router } from "express";
import { randomInt, timingSafeEqual } from "node:crypto";
import { Order } from "../models/Order.js";
import { Mechanic } from "../models/Mechanic.js";
import { User, MAX_SAVED_VEHICLES } from "../models/User.js";
import { nextSeq } from "../models/Counter.js";
import { sameVehicle } from "../models/vehicle.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { badRequest, forbidden, HttpError, notFound } from "../utils/httpError.js";
import { orderEvents, publish } from "../services/notifications.js";
import * as S from "../validation/schemas.js";
import { approximate, distanceKm } from "../utils/geo.js";
import { suggestedEtaMinutes, travelFeeFor } from "../utils/pricing.js";
import { isActive } from "../services/subscriptions.js";

const router = Router();

const MAX_CODE_ATTEMPTS = 5;
const CODE_LOCK_MINUTES = 15;

/**
 * What each viewer may see of an order:
 *  - contact details: after acceptance (admin always)
 *  - exact location: customer always (own); mechanic only while accepted; admin never
 *  - before accepting the mechanic gets distance + an approximate area
 *  - the verification code: only the customer, only until it has been used
 */
export function shapeOrder(order, viewerRole) {
  const o = order.toJSON();
  const loc = o.shareLocation ? o.customerLocation : null;
  const shop = o.mechanic && typeof o.mechanic === "object" ? o.mechanic : null;

  if (viewerRole === "mechanic" && loc && shop) {
    const d = distanceKm(shop, loc);
    if (d != null) o.customerDistanceKm = Math.round(d * 100) / 100; // 10 m steps
  }
  if (viewerRole === "mechanic" && loc && o.status === "pending") o.approxLocation = approximate(loc);

  const showLocation = viewerRole === "user" || (viewerRole === "mechanic" && o.status === "accepted" && o.shareLocation);
  if (!showLocation) delete o.customerLocation;

  if (viewerRole !== "user" || o.status !== "accepted" || o.verifiedAt) delete o.verificationCode;
  if (viewerRole !== "mechanic") {
    delete o.verifyAttempts;
    delete o.verifyLockedUntil;
  }

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

// POST /api/orders
//   { mechanicId, serviceIds: [], vehicle, serviceMode?: "home" | "garage", location?, saveVehicle?, note? }
router.post("/", requireAuth("user"), validate({ body: S.createOrder }), async (req, res) => {
  const { mechanicId, serviceIds, vehicle, saveVehicle, note, location } = req.valid.body;
  // home service = the mechanic comes to the customer (needs the location). Older clients only sent shareLocation.
  const serviceMode = req.valid.body.serviceMode ?? (req.valid.body.shareLocation ? "home" : "garage");

  const mechanic = await Mechanic.findById(mechanicId);
  if (!mechanic) throw notFound("Shop not found");
  if (!isActive(mechanic)) throw badRequest(`${mechanic.shopname} isn't taking bookings right now. Try another garage on the map.`);
  if (!mechanic.vehicleTypes.includes(vehicle.type)) {
    throw badRequest(`${mechanic.shopname} doesn't service ${vehicle.type} cars. Try another garage.`);
  }

  // prices are taken from the database, never trusted from the browser
  const services = [...new Set(serviceIds)].map((id) => {
    const s = mechanic.services.id(id);
    if (!s) throw badRequest("One of the selected services no longer exists");
    return { serviceId: s._id, serviceName: s.serviceName, price: s.price };
  });
  const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);

  // travel charge (home service only), computed from the real distance
  let travelFee = 0;
  let travelDistanceKm;
  if (serviceMode === "home") {
    if (!location) throw badRequest("We need your location so the mechanic can come to you – allow location access, or choose to bring the car to the garage.");
    const d = distanceKm(mechanic, location);
    const pricing = mechanic.travelPricing?.toObject?.() ?? mechanic.travelPricing;
    if (pricing?.maxDistanceKm && d > pricing.maxDistanceKm) {
      throw badRequest(`${mechanic.shopname} only travels up to ${pricing.maxDistanceKm} km – you're ${d.toFixed(1)} km away. Choose a closer garage or bring the car in.`);
    }
    travelDistanceKm = Math.round(d * 100) / 100;
    travelFee = travelFeeFor(pricing, d);
  }

  const order = await Order.create({
    number: await nextSeq("order"),
    user: req.auth.id,
    mechanic: mechanic._id,
    shopname: mechanic.shopname,
    services,
    servicesTotal,
    serviceMode,
    travelDistanceKm,
    travelFee,
    totalPrice: servicesTotal + travelFee,
    vehicle,
    note,
    shareLocation: serviceMode === "home",
    customerLocation: serviceMode === "home" ? { ...location, updatedAt: new Date() } : undefined,
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
  if ((order.status !== "pending" && order.status !== "accepted") || order.verifiedAt) {
    throw badRequest("Location sharing has ended for this order");
  }
  if (order.serviceMode !== "home") throw badRequest("Location isn't needed – you're bringing the car to the garage");

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

const setEta = (order, minutes) => {
  const now = new Date();
  order.eta = { minutes, arriveBy: new Date(now.getTime() + minutes * 60_000), updatedAt: now };
};

// PATCH /api/orders/:id/status  { status, etaMinutes? }
router.patch("/:id/status", requireAuth("user", "mechanic"), validate({ params: S.idParams, body: S.orderStatus }), async (req, res) => {
  const { id, role } = req.auth;
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw notFound("Order not found");
  if (order[role].toString() !== id) throw forbidden();

  const next = req.valid.body.status;
  const allowed = TRANSITIONS[role][order.status] || [];
  if (!allowed.includes(next)) throw badRequest(`Can't change a ${order.status} order to ${next}`);
  if (next === "cancelled" && !req.valid.body.reason) {
    throw badRequest(role === "mechanic" && order.status === "pending" ? "Please choose a reason for declining." : "Please choose a reason for cancelling.");
  }
  if (next === "completed" && !order.verifiedAt) {
    throw badRequest("Verify the customer's 4-digit code first – ask them for it when you arrive.");
  }

  order.status = next;
  if (next === "accepted") {
    order.verificationCode = String(randomInt(0, 10_000)).padStart(4, "0");
    if (order.serviceMode === "home") setEta(order, req.valid.body.etaMinutes ?? suggestedEtaMinutes(order.travelDistanceKm ?? 0));
  }
  if (next === "completed" || next === "cancelled") {
    order.customerLocation = undefined; // stop + delete location
    order.verificationCode = undefined;
  }
  if (next === "cancelled") order.cancellation = { by: role, reason: req.valid.body.reason, at: new Date() };
  await order.save();
  const populated = await populateParties(Order.findById(order._id));
  await orderEvents.statusChanged(populated, role);
  res.json(shapeOrder(populated, role));
});

// PATCH /api/orders/:id/eta  { etaMinutes }  – mechanic updates the arrival time ("running late")
router.patch("/:id/eta", requireAuth("mechanic"), validate({ params: S.idParams, body: S.etaUpdate }), async (req, res) => {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw notFound("Order not found");
  if (order.mechanic.toString() !== req.auth.id) throw forbidden();
  if (order.status !== "accepted" || order.verifiedAt) throw badRequest("The arrival time can only be changed while you're on the way");

  setEta(order, req.valid.body.etaMinutes);
  await order.save();
  const populated = await populateParties(Order.findById(order._id));
  await orderEvents.etaUpdated(populated);
  res.json(shapeOrder(populated, "mechanic"));
});

// POST /api/orders/:id/verify  { code }  – mechanic confirms the customer on arrival
router.post("/:id/verify", requireAuth("mechanic"), validate({ params: S.idParams, body: S.verifyCode }), async (req, res) => {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw notFound("Order not found");
  if (order.mechanic.toString() !== req.auth.id) throw forbidden();
  if (order.status !== "accepted") throw badRequest("Only accepted orders can be verified");
  if (order.verifiedAt) throw badRequest("This customer is already verified");
  if (order.verifyLockedUntil && order.verifyLockedUntil > new Date()) {
    const mins = Math.ceil((order.verifyLockedUntil - Date.now()) / 60_000);
    throw new HttpError(429, `Too many wrong codes. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }

  const given = Buffer.from(req.valid.body.code);
  const expected = Buffer.from(order.verificationCode ?? "----");
  const ok = given.length === expected.length && timingSafeEqual(given, expected);

  if (!ok) {
    order.verifyAttempts = (order.verifyAttempts ?? 0) + 1;
    const left = MAX_CODE_ATTEMPTS - order.verifyAttempts;
    if (left <= 0) {
      order.verifyAttempts = 0;
      order.verifyLockedUntil = new Date(Date.now() + CODE_LOCK_MINUTES * 60_000);
      await order.save();
      throw new HttpError(429, `Too many wrong codes. Try again in ${CODE_LOCK_MINUTES} minutes.`);
    }
    await order.save();
    throw badRequest(`Wrong code – ${left} attempt${left === 1 ? "" : "s"} left. Ask the customer to read it from their order.`);
  }

  order.verifiedAt = new Date();
  order.verifyAttempts = 0;
  order.verifyLockedUntil = undefined;
  order.verificationCode = undefined;
  // the mechanic has arrived – live location is no longer needed
  order.shareLocation = false;
  order.customerLocation = undefined;
  await order.save();

  const populated = await populateParties(Order.findById(order._id));
  await orderEvents.verified(populated);
  res.json(shapeOrder(populated, "mechanic"));
});

export default router;
