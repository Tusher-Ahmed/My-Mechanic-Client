import { Schema, model } from "mongoose";
import { accountPlugin } from "./accountPlugin.js";

const AdminSchema = new Schema({});
AdminSchema.plugin(accountPlugin);

export const Admin = model("Admin", AdminSchema);
