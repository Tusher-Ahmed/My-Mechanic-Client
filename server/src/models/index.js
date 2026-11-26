import { User } from "./User.js";
import { Mechanic } from "./Mechanic.js";
import { Admin } from "./Admin.js";

/** Account model for each login role. */
export const ACCOUNT_MODELS = { user: User, mechanic: Mechanic, admin: Admin };
