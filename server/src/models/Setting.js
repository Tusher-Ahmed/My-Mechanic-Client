import { Schema, model } from "mongoose";

/** Small key → value store for admin-editable settings (e.g. subscription plan prices). */
const SettingSchema = new Schema({ _id: String, value: Schema.Types.Mixed }, { versionKey: false, timestamps: true });
export const Setting = model("Setting", SettingSchema);
