import { pushTokens } from "../models/pushToken.js";

export function registerPushToken(req, res) {
  const { token } = req.body;
  if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "The request body must include a valid Expo push token." });
  }
  pushTokens.set(token, req.auth.userId);
  return res.status(204).send();
}
