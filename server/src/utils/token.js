import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Pin the algorithm so a token can't pick its own (e.g. "none" or an asymmetric alg).
const ALG = "HS256";

export const signToken = (account, role) =>
  jwt.sign({ sub: account._id.toString(), role, ver: account.tokenVersion ?? 0 }, env.jwtSecret, {
    algorithm: ALG,
    expiresIn: env.jwtExpiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: [ALG] });
