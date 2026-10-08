import crypto from "node:crypto";
import { apiToken } from "../config/env.js";

export function requireApiToken(req, res, next) {
  const authorization = req.get("Authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(apiToken);
  const supplied = Buffer.from(suppliedToken);

  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
export function requireV2ApiToken(req, res, next) {

}

