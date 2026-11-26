import { verifyToken } from "../utils/token.js";
import { forbidden, unauthorized } from "../utils/httpError.js";

/** Require a valid token. Optionally restrict to the given roles ("user" | "mechanic" | "admin"). */
export const requireAuth =
  (...roles) =>
  (req, _res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next(unauthorized());

    try {
      const payload = verifyToken(token);
      req.auth = { id: payload.sub, role: payload.role };
    } catch {
      return next(unauthorized("Your session has expired, please log in again"));
    }

    if (roles.length && !roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
