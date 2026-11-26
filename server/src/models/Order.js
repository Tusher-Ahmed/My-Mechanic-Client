import { Schema, model } from "mongoose";
import { VehicleSchema } from "./vehicle.js";

export const ORDER_STATUSES = ["pending", "accepted", "completed", "cancelled"];

const OrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mechanic: { type: Schema.Types.ObjectId, ref: "Mechanic", required: true, index: true },
    // snapshot of the shop + services at order time (prices may change later)
    shopname: { type: String, required: true },
    services: {
      type: [{ _id: false, serviceId: Schema.Types.ObjectId, serviceName: String, price: Number }],
      validate: [(v) => v.length > 0, "Choose at least one service"],
    },
    totalPrice: { type: Number, required: true, min: 0 },
    vehicle: { type: VehicleSchema, required: [true, "Tell us which car needs service"] },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
  },
  { timestamps: true, versionKey: false }
);

export const Order = model("Order", OrderSchema);
