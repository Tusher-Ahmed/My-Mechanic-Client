import { Schema, model } from "mongoose";

export const NOTIFICATION_TYPES = ["order_new", "order_accepted", "order_completed", "order_cancelled", "order_updated", "subscription", "system"];

const NotificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, required: true },
    recipientRole: { type: String, enum: ["user", "mechanic", "admin"], required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "system" },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, maxlength: 300 },
    link: { type: String, maxlength: 200 }, // client route to open, e.g. "/account"
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

NotificationSchema.index({ recipient: 1, recipientRole: 1, createdAt: -1 });
// keep the collection small on the free database tier: delete after 60 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export const Notification = model("Notification", NotificationSchema);
