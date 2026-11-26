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
    // live location: only with the customer's consent, only revealed to the mechanic after acceptance,
    // deleted when the job is completed or cancelled
    shareLocation: { type: Boolean, default: false },
    customerLocation: {
      type: new Schema(
        {
          latitude: { type: Number, min: -90, max: 90, required: true },
          longitude: { type: Number, min: -180, max: 180, required: true },
          accuracy: { type: Number, min: 0 },
          updatedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
  },
  { timestamps: true, versionKey: false }
);

export const Order = model("Order", OrderSchema);
