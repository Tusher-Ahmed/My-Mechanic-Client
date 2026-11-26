import { verifyToken } from "../utils/token.js";
import { forbidden, unauthorized } from "../utils/httpError.js";
import { ACCOUNT_MODELS } from "../models/index.js";

/**
 * Verify a token AND the account behind it:
 *  - signature, algorithm and expiry are valid
 *  - the account still exists (deleted accounts lose access immediately)
 *  - the token version matches (a password change revokes every older session)
 * Returns { id, role, account } or throws 401.
 */
export async function authenticate(token) {
  let payload;
  try {
    payload = verifyToken(String(token || ""));
  } catch {
    throw unauthorized("Your session has expired, please log in again");
  }
  const Model = ACCOUNT_MODELS[payload.role];
  if (!Model || typeof payload.sub !== "string") throw unauthorized();

  const account = await Model.findById(payload.sub);
  if (!account) throw unauthorized("This account no longer exists");
  if ((payload.ver ?? 0) !== (account.tokenVersion ?? 0)) {
    throw unauthorized("Your password was changed – please log in again");
  }
  return { id: account._id.toString(), role: payload.role, account };
}

/** Require a valid token. Optionally restrict to the given roles ("user" | "mechanic" | "admin"). */
export const requireAuth =
  (...roles) =>
  async (req, _res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next(unauthorized());

    try {
      const { id, role, account } = await authenticate(token);
      req.auth = { id, role };
      req.account = account;
    } catch (err) {
      return next(err);
    }

    if (roles.length && !roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
