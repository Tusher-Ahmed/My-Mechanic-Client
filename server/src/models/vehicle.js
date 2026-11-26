import { Schema } from "mongoose";

export const VEHICLE_TYPES = ["Sedan", "Hatchback", "SUV / Jeep", "Microbus / Van", "Pickup"];

/** A customer's car – stored on orders (snapshot) and in the user's saved cars. */
export const VehicleSchema = new Schema(
  {
    type: {
      type: String,
      required: [true, "Car type is required"],
      enum: { values: VEHICLE_TYPES, message: "Choose a valid car type" },
    },
    make: { type: String, required: [true, "Car make is required (e.g. Toyota)"], trim: true, maxlength: 40 },
    model: { type: String, required: [true, "Car model is required (e.g. Axio)"], trim: true, maxlength: 60 },
    year: {
      type: Number,
      min: [1960, "Year looks too old"],
      max: [new Date().getFullYear() + 1, "Year can't be in the future"],
    },
    plate: { type: String, trim: true, uppercase: true, maxlength: [24, "Number plate is too long"] },
  },
  { _id: false }
);

export const vehicleLabel = (v) => [`${v.make} ${v.model}`, v.type, v.year, v.plate].filter(Boolean).join(" · ");

export const sameVehicle = (a, b) =>
  a.make.toLowerCase() === b.make.toLowerCase() &&
  a.model.toLowerCase() === b.model.toLowerCase() &&
  (a.plate || "").toUpperCase() === (b.plate || "").toUpperCase();
