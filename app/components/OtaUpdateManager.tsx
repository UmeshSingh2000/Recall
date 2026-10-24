import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Toast from "react-native-toast-message";

const LAST_SEEN_UPDATE_ID_KEY = "recall.lastSeenUpdateId";

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
  if (!Updates.isEnabled) return;

  const checkResult = await Updates.checkForUpdateAsync();
  if (!checkResult.isAvailable) return;

  const fetchResult = await Updates.fetchUpdateAsync();
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

    const runUpdateCheck = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        await checkDownloadAndReload();
      } catch (error) {
        console.warn("OTA update check failed", error);
      } finally {
        checkingRef.current = false;
      }
    };

    void notifyIfUpdateWasApplied().catch((error) => {
      console.warn("Unable to record OTA update state", error);
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
