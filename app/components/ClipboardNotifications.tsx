import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { radius, spacing } from "../constants/theme";
import { BACKEND_URL, getAuthToken } from "../lib/api";
import { useTheme, useThemedStyles } from "./ThemeProvider";

type ClipboardEvent = {
  type: "clipboard";
  text: string;
  receivedAt: string;
};

const backendUrl = BACKEND_URL;
const webSocketUrl = backendUrl.replace(/^https/, "wss");
const clipboardChannelId = "clipboard-v2";

const BELL_SIZE = 44;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: AppState.currentState !== "active",
      shouldSetBadge: true,
      shouldShowBanner: AppState.currentState !== "active",
      shouldShowList: AppState.currentState !== "active",
    }),
  });
}

export function ClipboardNotifications({ fullScreen = false }: { fullScreen?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: { position: "relative", zIndex: 20 },
    bell: {
      width: BELL_SIZE,
      height: BELL_SIZE,
      borderRadius: BELL_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: colors.ink,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    bellTouch: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    count: {
      position: "absolute",
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.orange,
    },
    countText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    panel: {
      position: "absolute",
      right: 0,
      top: BELL_SIZE + spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.hero,
      borderWidth: 1,
      borderColor: colors.heroBorder,
      borderRadius: radius.md,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    screenPanel: {
      flex: 1,
      width: "100%",
      paddingBottom: spacing.lg,
      backgroundColor: colors.canvas,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    panelTitle: { color: colors.heroText, fontSize: 16, fontWeight: "700" },
    panelSubtitle: { color: colors.heroSubtext, fontSize: 11, marginTop: 4 },
    closeButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.heroBorder,
    },
    previewList: { maxHeight: 270 },
    empty: {
      color: colors.heroSubtext,
      fontSize: 13,
      lineHeight: 19,
      paddingVertical: spacing.lg,
      textAlign: "center",
    },
    notification: {
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.heroBorder,
      borderRadius: radius.sm,
    },
    notificationText: {
      color: colors.heroText,
      fontSize: 13,
      lineHeight: 20,
    },
    copyButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-end",
      marginTop: spacing.sm,
      backgroundColor: colors.greenSoft,
      borderRadius: radius.pill,
    },
    pressed: { opacity: 0.65 },
  }));
  const [notifications, setNotifications] = useState<ClipboardEvent[]>([]);
  const [isOpen, setIsOpen] = useState(fullScreen);
  const { width: screenWidth } = useWindowDimensions();

  const pushNotificationsEnabled = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let disposed = false;

    const prepareNotifications = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(
          clipboardChannelId,
          {
            name: "Clipboard",
            importance: Notifications.AndroidImportance.HIGH,
            sound: "clipboard.wav",
            vibrationPattern: [0, 250, 250, 250],
          },
        );
      }

      const currentPermissions =
        await Notifications.getPermissionsAsync();

      let status = currentPermissions.status;

      if (status !== "granted") {
        const requestedPermissions =
          await Notifications.requestPermissionsAsync();

        status = requestedPermissions.status;
      }

      if (status !== "granted") {
        return;
      }

      if (
        Platform.OS === "android" &&
        !Constants.expoConfig?.android?.googleServicesFile
      ) {
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        throw new Error("Expo project ID is missing");
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      await fetch(`${backendUrl}/api/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!disposed) {
        pushNotificationsEnabled.current = true;
      }
    };

    prepareNotifications().catch((error) => {
      console.warn(
        "Unable to enable clipboard notifications",
        error,
      );
    });

    return () => {
      disposed = true;
    };
  }, []);

  const addNotification = (message: ClipboardEvent) => {
    setNotifications((current) => {
      if (
        current.some(
          (item) => item.receivedAt === message.receivedAt,
        )
      ) {
        return current;
      }

      return [message, ...current].slice(0, 10);
    });

    setIsOpen(true);
  };

  const showBackgroundFallback = async (
    message: ClipboardEvent,
  ) => {
    if (
      Platform.OS === "web" ||
      AppState.currentState === "active" ||
      pushNotificationsEnabled.current
    ) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New clipboard text",
        body:
          message.text.length > 180
            ? `${message.text.slice(0, 177)}...`
            : message.text,
        data: message,
        sound: "clipboard.wav",
      },
      trigger:
        Platform.OS === "android"
          ? { channelId: clipboardChannelId }
          : null,
    });
  };

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          const data = notification.request.content.data;

          if (
            data?.type === "clipboard" &&
            typeof data.text === "string" &&
            typeof data.receivedAt === "string"
          ) {
            addNotification({
              type: "clipboard",
              text: data.text,
              receivedAt: data.receivedAt,
            });
          }
        },
      );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (disposed) return;

      socket = new WebSocket(webSocketUrl);

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(
            event.data,
          ) as ClipboardEvent;

          if (
            message.type !== "clipboard" ||
            typeof message.text !== "string"
          ) {
            return;
          }

          addNotification(message);

          showBackgroundFallback(message).catch((error) => {
            console.warn(
              "Unable to show background clipboard notification",
              error,
            );
          });
        } catch {
          // Ignore malformed messages from the socket.
        }
      };

      socket.onerror = (event) => {
        console.error(
          `Clipboard WebSocket error at ${webSocketUrl}`,
          event,
        );

        socket?.close();
      };

      socket.onclose = () => {
        if (!disposed) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      disposed = true;

      if (retryTimer) {
        clearTimeout(retryTimer);
      }

      socket?.close();
    };
  }, []);

  const copyNotification = async (
    notification: ClipboardEvent,
  ) => {
    await Clipboard.setStringAsync(notification.text);

    setNotifications((current) =>
      current.filter(
        (item) => item.receivedAt !== notification.receivedAt,
      ),
    );

    Toast.show({
      type: "success",
      text1: "Copied to clipboard",
    });
  };

  return (
    <View style={styles.container}>
      {!fullScreen ? (
        <View style={styles.bell}>
          <Pressable
            accessibilityLabel="Open clipboard notifications"
            style={styles.bellTouch}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
            {notifications.length > 0 ? (
              <View style={styles.count}>
                <Text style={styles.countText}>{notifications.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      {isOpen ? (
        <View
          style={[
            fullScreen ? styles.screenPanel : styles.panel,
            !fullScreen && { width: Math.min(300, Math.max(0, screenWidth - spacing.xxl)) },
          ]}
        >
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>
                Clipboard
              </Text>

              <Text style={styles.panelSubtitle}>
                Recent text from your desktop
              </Text>
            </View>

            {!fullScreen ? <Pressable
              accessibilityLabel="Close clipboard notifications"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setIsOpen(false)}
            >
              <Ionicons
                name="close"
                size={20}
                color={colors.muted}
              />
            </Pressable> : null}
          </View>

          {notifications.length === 0 ? (
            <Text style={styles.empty}>
              Copied text will appear here.
            </Text>
          ) : (
            <ScrollView
              style={styles.previewList}
              nestedScrollEnabled
              scrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((notification) => (
                <View
                  style={styles.notification}
                  key={notification.receivedAt}
                >
                  <Text
                    style={styles.notificationText}
                    numberOfLines={4}
                  >
                    {notification.text}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copy clipboard text"
                    style={({ pressed }) => [
                      styles.copyButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      copyNotification(notification)
                    }
                  >
                    <Ionicons
                      name="copy-outline"
                      size={17}
                      color={colors.green}
                    />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

    </View>
  );
}
