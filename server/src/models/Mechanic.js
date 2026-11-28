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
  // trade licence: checked by an admin before the garage goes live (never shown publicly)
  tradeLicense: { type: String, trim: true, uppercase: true, maxlength: 40, unique: true, sparse: true },
  // self-registered garages wait for an admin; garages created by an admin are approved at once.
  // Garages from before approvals existed have no value and count as approved.
  approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], index: true },
  approval: {
    type: new Schema({ at: Date, by: { type: Schema.Types.ObjectId, ref: "Admin" }, reason: { type: String, trim: true, maxlength: 300 } }, { _id: false }),
    default: undefined,
  },
  latitude: { type: Number, required: [true, "Shop location is required"], min: -90, max: 90 },
  longitude: { type: Number, required: [true, "Shop location is required"], min: -180, max: 180 },
  services: { type: [ServiceSchema], default: [] },
  // travel charge for home service: free within freeWithinKm, else base + perKm × distance (৳, rounded to 10)
  // fee for an inspection visit ("not sure what's wrong") – each garage sets its own, required when opening a shop
  inspectionFee: { type: Number, min: [0, "Inspection fee can't be negative"], max: 100_000, default: 300 },
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
  // subscription: the garage is on the map / bookable only while subscriptionEndsAt is in the future
  // "trial" = the free trial a new garage gets once, when it's approved (no payment)
  subscriptionPlan: { type: String, enum: ["trial", "monthly", "yearly"] },
  subscriptionEndsAt: { type: Date, index: true },
  trialStartedAt: Date,
  subscriptionReminders: {
    type: new Schema({ d7: Date, d1: Date, expired: Date }, { _id: false }),
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
export const PUBLIC_MECHANIC_FIELDS = "username shopname address latitude longitude services vehicleTypes travelPricing inspectionFee createdAt";

export const Mechanic = model("Mechanic", MechanicSchema);
