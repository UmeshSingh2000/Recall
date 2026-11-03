import { timingSafeEqual } from "crypto";
import { linuxSecret } from "../config/env.js";

function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function requireLinuxSecret(req, res, next) {
  if (!linuxSecret) {
    return res.status(503).json({ error: "Linux client is not configured." });
  }

  const authorization = req.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!secretsMatch(authorization.slice(7), linuxSecret)) {
    return res.status(401).json({ error: "Invalid Linux client secret." });
  }

  return next();
}
