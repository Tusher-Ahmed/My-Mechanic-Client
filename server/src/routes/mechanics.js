import { Router } from "express";
import { Mechanic, PUBLIC_MECHANIC_FIELDS } from "../models/Mechanic.js";
import { notFound } from "../utils/httpError.js";
import { VEHICLE_TYPES } from "../models/vehicle.js";

const router = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/mechanics?q=brake&vehicleType=Sedan  – public list for the map
router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const vehicleType = VEHICLE_TYPES.includes(req.query.vehicleType) ? req.query.vehicleType : null;
  const textFilter = q
    ? {
        $or: [
          { shopname: { $regex: escapeRegex(q), $options: "i" } },
          { "services.serviceName": { $regex: escapeRegex(q), $options: "i" } },
        ],
      }
    : {};
  const filter = vehicleType ? { ...textFilter, vehicleTypes: vehicleType } : textFilter;
  const mechanics = await Mechanic.find(filter).select(PUBLIC_MECHANIC_FIELDS).sort({ createdAt: -1 });
  res.json(mechanics);
});

// GET /api/mechanics/:id  – public store page
router.get("/:id", async (req, res) => {
  const mechanic = await Mechanic.findById(req.params.id).select(PUBLIC_MECHANIC_FIELDS);
  if (!mechanic) throw notFound("Shop not found");
  res.json(mechanic);
});

export default router;
