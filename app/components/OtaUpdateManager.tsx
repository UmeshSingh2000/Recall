import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Toast from "react-native-toast-message";

const LAST_SEEN_UPDATE_ID_KEY = "recall.lastSeenUpdateId";

async function logUpdateDiagnostics(context: string) {
  const configChannel =
    Constants.expoConfig?.updates?.requestHeaders?.["expo-channel-name"];

  console.log(`[OTA ${context}]`, {
    isEnabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    isEmergencyLaunch: Updates.isEmergencyLaunch,
    emergencyLaunchReason: Updates.emergencyLaunchReason,
    checkAutomatically: Updates.checkAutomatically,
    isDevBuild: __DEV__,
    configChannel,
    appVersion: Constants.expoConfig?.version,
    androidVersionCode: Constants.expoConfig?.android?.versionCode,
  });

  if (!Updates.isEnabled) {
    console.warn(
      "[OTA] expo-updates is disabled in this binary. Production OTA requires a release build " +
        "(EAS production APK/AAB or `expo run:android --variant release`). Debug/local dev builds " +
        "intentionally disable the updates controller unless you use a development client."
    );

    try {
      const entries = await Updates.readLogEntriesAsync(60_000);
      const recent = entries.slice(-8);
      if (recent.length > 0) {
        console.warn("[OTA] Recent native update logs:", recent);
      }
    } catch (error) {
      console.warn("[OTA] Could not read native update logs", error);
    }
  }
}

async function notifyIfUpdateWasApplied() {
  if (!Updates.isEnabled) return;

  const currentUpdateId = Updates.updateId;
  if (!currentUpdateId) return;

  const previousUpdateId = await SecureStore.getItemAsync(LAST_SEEN_UPDATE_ID_KEY);
  if (previousUpdateId && previousUpdateId !== currentUpdateId) {
    Toast.show({
      type: "success",
      text1: "App updated",
      text2: "You're on the latest version.",
    });
  }

  await SecureStore.setItemAsync(LAST_SEEN_UPDATE_ID_KEY, currentUpdateId);
}

async function checkDownloadAndReload() {
  if (!Updates.isEnabled) {
    return;
  }

  let checkResult;
  try {
    checkResult = await Updates.checkForUpdateAsync();
  } catch (error) {
    console.warn("[OTA] checkForUpdateAsync failed", error);
    return;
  }

  if (!checkResult.isAvailable) {
    console.log("[OTA] No update available on channel", Updates.channel);
    return;
  }

  let fetchResult;
  try {
    fetchResult = await Updates.fetchUpdateAsync();
  } catch (error) {
    console.warn("[OTA] fetchUpdateAsync failed", error);
    return;
  }

  if (!fetchResult.isNew) return;

  Toast.show({
    type: "info",
    text1: "Installing update",
    text2: "The app will restart momentarily.",
  });

  await Updates.reloadAsync();
}

/**
 * Checks for EAS updates on launch and when the app returns to the foreground,
 * and notifies the user once a newly applied OTA bundle is running.
 */
export function OtaUpdateManager() {
  const checkingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    void logUpdateDiagnostics("startup");

    const runUpdateCheck = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        await checkDownloadAndReload();
      } catch (error) {
        console.warn("[OTA] update check failed", error);
      } finally {
        checkingRef.current = false;
      }
    };

    void notifyIfUpdateWasApplied().catch((error) => {
      console.warn("[OTA] Unable to record OTA update state", error);
    });

    void runUpdateCheck();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void runUpdateCheck();
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}
