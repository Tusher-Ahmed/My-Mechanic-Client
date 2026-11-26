import { Router } from "express";
import mongoose from "mongoose";
import { Mechanic, PUBLIC_MECHANIC_FIELDS } from "../models/Mechanic.js";
import { VEHICLE_TYPES } from "../models/vehicle.js";
import { validate } from "../middleware/validate.js";
import { notFound } from "../utils/httpError.js";
import * as S from "../validation/schemas.js";
import { activeFilter, isActive } from "../services/subscriptions.js";

const router = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/mechanics?q=brake&vehicleType=Sedan  – public list for the map
router.get("/", validate({ query: S.mechanicsQuery }), async (req, res) => {
  const { q = "", vehicleType } = req.valid.query;
  const filter = activeFilter(); // only garages with an active plan appear on the map
  if (q) {
    // built by us from escaped text, so it is marked trusted for mongoose sanitizeFilter
    const rx = mongoose.trusted({ $regex: escapeRegex(q), $options: "i" });
    filter.$or = [{ shopname: rx }, { "services.serviceName": rx }];
  }
  if (VEHICLE_TYPES.includes(vehicleType)) filter.vehicleTypes = vehicleType;

  const mechanics = await Mechanic.find(filter).select(PUBLIC_MECHANIC_FIELDS).sort({ createdAt: -1 }).limit(500);
  res.json(mechanics);
});

// GET /api/mechanics/:id  – public store page
router.get("/:id", validate({ params: S.idParams }), async (req, res) => {
  const mechanic = await Mechanic.findById(req.valid.params.id).select(`${PUBLIC_MECHANIC_FIELDS} subscriptionEndsAt`);
  if (!mechanic) throw notFound("Shop not found");
  const { subscriptionEndsAt, ...shop } = mechanic.toJSON();
  res.json({ ...shop, acceptingOrders: isActive({ subscriptionEndsAt }) });
});

export default router;
