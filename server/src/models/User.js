import { Schema, model } from "mongoose";
import { accountPlugin, phoneField } from "./accountPlugin.js";
import { VehicleSchema } from "./vehicle.js";

export const MAX_SAVED_VEHICLES = 5;

const UserSchema = new Schema({
  phone: phoneField,
  vehicles: {
    type: [VehicleSchema],
    default: [],
    validate: [(v) => v.length <= MAX_SAVED_VEHICLES, `You can save up to ${MAX_SAVED_VEHICLES} cars`],
  },
});
UserSchema.plugin(accountPlugin);

export const User = model("User", UserSchema);
