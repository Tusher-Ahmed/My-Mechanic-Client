import { Schema, model } from "mongoose";
import { accountPlugin, phoneField } from "./accountPlugin.js";

const UserSchema = new Schema({ phone: phoneField });
UserSchema.plugin(accountPlugin);

export const User = model("User", UserSchema);
