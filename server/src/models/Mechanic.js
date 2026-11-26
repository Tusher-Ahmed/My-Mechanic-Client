import { Schema, model } from "mongoose";
import { accountPlugin, phoneField } from "./accountPlugin.js";
import { VEHICLE_TYPES } from "./vehicle.js";
import { DEFAULT_TRAVEL_PRICING } from "../utils/pricing.js";

const ServiceSchema = new Schema({
  serviceName: { type: String, required: [true, "Service name is required"], trim: true },
  price: { type: Number, required: [true, "Service price is required"], min: [0, "Price can't be negative"] },
});

const MechanicSchema = new Schema({
  phone: phoneField,
  nid: {
    type: String,
    required: [true, "NID number is required"],
    trim: true,
    match: [/^[0-9]{10,17}$/, "NID must be 10 to 17 digits"],
  },
  shopname: {
    type: String,
    required: [true, "Shop name is required"],
    unique: true,
    trim: true,
    minlength: [3, "Shop name must be at least 3 characters"],
    maxlength: [100, "Shop name must be at most 100 characters"],
  },
  address: { type: String, trim: true, maxlength: 200 },
  latitude: { type: Number, required: [true, "Shop location is required"], min: -90, max: 90 },
  longitude: { type: Number, required: [true, "Shop location is required"], min: -180, max: 180 },
  services: { type: [ServiceSchema], default: [] },
  // travel charge for home service: free within freeWithinKm, else base + perKm × distance (৳, rounded to 10)
  travelPricing: {
    type: new Schema(
      {
        base: { type: Number, min: 0, max: 100_000, default: DEFAULT_TRAVEL_PRICING.base },
        perKm: { type: Number, min: 0, max: 10_000, default: DEFAULT_TRAVEL_PRICING.perKm },
        freeWithinKm: { type: Number, min: 0, max: 100, default: DEFAULT_TRAVEL_PRICING.freeWithinKm },
        maxDistanceKm: { type: Number, min: 1, max: 500, default: DEFAULT_TRAVEL_PRICING.maxDistanceKm },
      },
      { _id: false }
    ),
    default: () => ({}),
  },
  // car types this garage works on (all by default)
  vehicleTypes: {
    type: [{ type: String, enum: { values: VEHICLE_TYPES, message: "Invalid car type" } }],
    default: () => [...VEHICLE_TYPES],
    validate: [(v) => v.length > 0, "Select at least one car type you service"],
  },
});
MechanicSchema.plugin(accountPlugin);

/** Fields that anyone (not logged in) may see on the map / store page. */
export const PUBLIC_MECHANIC_FIELDS = "username shopname address latitude longitude services vehicleTypes travelPricing createdAt";

export const Mechanic = model("Mechanic", MechanicSchema);
