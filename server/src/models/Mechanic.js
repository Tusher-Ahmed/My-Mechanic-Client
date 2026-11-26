import { Schema, model } from "mongoose";
import { accountPlugin, phoneField } from "./accountPlugin.js";

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
});
MechanicSchema.plugin(accountPlugin);

/** Fields that anyone (not logged in) may see on the map / store page. */
export const PUBLIC_MECHANIC_FIELDS = "username shopname address latitude longitude services createdAt";

export const Mechanic = model("Mechanic", MechanicSchema);
