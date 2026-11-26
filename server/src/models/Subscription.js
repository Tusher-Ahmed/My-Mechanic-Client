import { Schema, model } from "mongoose";

export const PLAN_KEYS = ["monthly", "yearly"];

/** One purchase of a plan by a mechanic (demo checkout for now). */
const SubscriptionSchema = new Schema(
  {
    mechanic: { type: Schema.Types.ObjectId, ref: "Mechanic", required: true, index: true },
    plan: { type: String, enum: PLAN_KEYS, required: true },
    // intro = first-ever plan at the low starter price · renewal = returning customer with the loyalty discount
    kind: { type: String, enum: ["intro", "renewal"], required: true },
    listPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    days: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending", index: true },
    // "demo" = simulated checkout (no real money) · "admin" = granted by an admin. A real gateway can be added here later.
    gateway: { type: String, enum: ["demo", "admin"], required: true },
    tranId: { type: String, required: true, unique: true },
    startsAt: Date,
    endsAt: Date,
    paidAt: Date,
  },
  { timestamps: true, versionKey: false }
);

export const Subscription = model("Subscription", SubscriptionSchema);
