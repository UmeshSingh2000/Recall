import { neonAuthUrl } from "../config/env.js";
import { createRemoteJWKSet, jwtVerify } from "jose";

const authBaseUrl = neonAuthUrl.replace(/\/+$/, "");

const jwks = createRemoteJWKSet(
  new URL(`${authBaseUrl}/.well-known/jwks.json`)
);

export async function requireNeonAuth(req, res, next) {
  const authorization = req.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  try {
    const token = authorization.slice(7);
    const expectedIssuer = new URL(neonAuthUrl).origin;
    const { payload } = await jwtVerify(token, jwks, {
      issuer: expectedIssuer,
      algorithms: ["EdDSA"],
    });

    if (!payload.sub) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    req.auth = {
      userId: payload.sub,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      },
    };

    return next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}
