import "./crypto-polyfill";

import Constants from "expo-constants";
import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthVanillaAdapter } from "@neondatabase/neon-js/auth/vanilla/adapters";
import { getAuthTrustedOrigin } from "./auth-callback-url";

const neonAuthUrl = Constants.expoConfig?.extra?.neonAuthUrl as string | undefined;
if (!neonAuthUrl) {
  console.warn(
    "NEON_AUTH_URL is missing. Add it to .env and expose it via app.config.js extra.neonAuthUrl.",
  );
}
const trustedOrigin = getAuthTrustedOrigin();

export const authClient = createAuthClient(neonAuthUrl ?? "", {
  adapter: BetterAuthVanillaAdapter({
    fetchOptions: {
      headers: {
        "expo-origin": trustedOrigin,
        Origin: trustedOrigin,
      },
    },
  }),
});


