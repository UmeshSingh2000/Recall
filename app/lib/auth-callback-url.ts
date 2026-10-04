import Constants from "expo-constants";

/**
 * Origin header for auth API calls.
 * Neon Auth “Allow Localhost” trusts `http://localhost` (any port). Custom schemes
 * such as `recall://` are rejected as Invalid origin unless added under Domains.
 */
export function getAuthTrustedOrigin(): string {
  const configured = Constants.expoConfig?.extra?.neonAuthRequestOrigin as string | undefined;
  if (configured?.trim()) {
    return configured.trim();
  }
  return "http://localhost";
}

/**
 * Callback URL for Better Auth sign-up / sign-in API calls.
 *
 * Custom schemes like `recall://(tabs)` fail unless that exact origin is in Neon’s
 * trusted allowlist. A relative path (`/`) is accepted by Better Auth without a
 * deep-link entry (see origin-check + allowRelativePaths).
 *
 * Optional override: set EXPO_PUBLIC_NEON_AUTH_CALLBACK_URL in .env (must be allowlisted in Neon Console → Auth → Domains).
 */
export function getAuthCallbackURL(): string {
  const configured = Constants.expoConfig?.extra?.neonAuthCallbackUrl as string | undefined;
  if (configured?.trim()) {
    return configured.trim();
  }
  return "/";
}
