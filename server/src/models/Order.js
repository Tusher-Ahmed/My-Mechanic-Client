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
    // human-friendly serial shown to customer, mechanic and admin ("MM-1042")
    number: { type: Number, index: { unique: true, sparse: true } },
    // "home": mechanic travels to the customer (needs location, travel charge) · "garage": customer brings the car
    serviceMode: { type: String, enum: ["home", "garage"], default: "garage" },
    // "inspection" = customer doesn't know the problem: only the inspection fee (+ travel) is charged
    kind: { type: String, enum: ["service", "inspection"], default: "service" },
    // a service order booked after an inspection (travel is not charged again within 24 h)
    followUpOf: { type: Schema.Types.ObjectId, ref: "Order" },
    // what the mechanic found during an inspection + the services they recommend
    findings: {
      type: new Schema(
        {
          note: { type: String, trim: true, maxlength: 1000 },
          recommended: { type: [{ _id: false, serviceId: Schema.Types.ObjectId, serviceName: String, price: Number }], default: [] },
        },
        { _id: false }
      ),
      default: undefined,
    },
    travelWaived: { type: Boolean, default: false },
    travelDistanceKm: { type: Number, min: 0 },
    travelFee: { type: Number, min: 0, default: 0 },
    servicesTotal: { type: Number, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }, // services + travel fee
    vehicle: { type: VehicleSchema, required: [true, "Tell us which car needs service"] },
    // arrival estimate set by the mechanic when accepting (home service)
    eta: {
      type: new Schema({ minutes: Number, arriveBy: Date, updatedAt: Date }, { _id: false }),
      default: undefined,
    },
    // 4-digit code shown only to the customer; the mechanic types it in on arrival to confirm the client
    verificationCode: { type: String },
    verifyAttempts: { type: Number, default: 0 },
    verifyLockedUntil: { type: Date },
    verifiedAt: { type: Date },
    // who cancelled / declined and why (required from customers and mechanics)
    cancellation: {
      type: new Schema(
        {
          by: { type: String, enum: ["user", "mechanic", "admin"], required: true },
          reason: { type: String, trim: true, maxlength: 300 },
          at: { type: Date, required: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
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
