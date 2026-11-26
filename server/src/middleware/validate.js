import { badRequest, HttpError } from "../utils/httpError.js";

/**
 * Validate (and clean) req.body / req.params / req.query with Zod schemas.
 * Unknown fields are stripped, so only validated data reaches the route.
 * The cleaned values are stored on req.valid = { body, params, query }.
 */
export const validate =
  ({ body, params, query } = {}) =>
  (req, _res, next) => {
    req.valid = req.valid ?? {};
    for (const [part, schema] of Object.entries({ params, query, body })) {
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const errors = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        // invalid route params (e.g. unknown role) look like a missing route
        if (part === "params" && errors.some((e) => e.message === "Not found")) return next(new HttpError(404, "Not found"));
        const err = badRequest(errors[0].message);
        err.errors = errors;
        return next(err);
      }
      req.valid[part] = result.data;
    }
    next();
  };

/**
 * Block NoSQL-injection payloads: any object key that starts with "$" or contains "."
 * (e.g. { "email": { "$ne": null } }) anywhere in the body or query is rejected.
 */
export function rejectMongoOperators(req, _res, next) {
  const bad = (value, depth = 0) => {
    if (depth > 20) return true; // absurdly deep nesting
    if (Array.isArray(value)) return value.some((v) => bad(v, depth + 1));
    if (value && typeof value === "object") {
      return Object.entries(value).some(([k, v]) => k.startsWith("$") || k.includes(".") || bad(v, depth + 1));
    }
    return false;
  };
  if (bad(req.body) || bad(req.query)) return next(badRequest("Invalid characters in request"));
  next();
}
