import { timingSafeEqual } from "crypto";
import { cronSecret } from "../config/env.js";

function secretsMatch(provided, expected) {
  if (!expected || !provided) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requireCronSecret(req, res, next) {
  if (!cronSecret) {
    return res.status(503).json({ error: "Cron is not configured." });
  }

  const authorization = req.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = authorization.slice(7);

  if (!secretsMatch(token, cronSecret)) {
    return res.status(401).json({ error: "Invalid cron secret." });
  }

  return next();
}
