import Constants from "expo-constants";

/** User-facing app version from Expo config (sourced from package.json at build time). */
export const appVersion =
  Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? "0.0.0";
