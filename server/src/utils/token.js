import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signToken = (account, role) =>
  jwt.sign({ sub: account._id.toString(), role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
