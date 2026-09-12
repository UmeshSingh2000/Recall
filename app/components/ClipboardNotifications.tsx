import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../constants/theme";

type ClipboardEvent = {
  type: "clipboard";
  text: string;
  receivedAt: string;
};

const backendUrl = "https://recall-en47.onrender.com"
const webSocketUrl = backendUrl.replace(/^https/, "wss");
const clipboardChannelId = "clipboard-v2";

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

export function ClipboardNotifications() {
  const [notifications, setNotifications] = useState<ClipboardEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const pushNotificationsEnabled = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let disposed = false;

    const prepareNotifications = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(clipboardChannelId, {
          name: "Clipboard",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "clipboard.wav",
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const currentPermissions = await Notifications.getPermissionsAsync();
      let status = currentPermissions.status;
      if (status !== "granted") {
        const requestedPermissions = await Notifications.requestPermissionsAsync();
        status = requestedPermissions.status;
      }

      if (status !== "granted") {
        return;
      }

      if (Platform.OS === "android" && !Constants.expoConfig?.android?.googleServicesFile) {
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Expo project ID is missing");
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await fetch(`${backendUrl}/api/push-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      pushNotificationsEnabled.current = true;
    };

    prepareNotifications().catch((error) => {
      console.warn("Unable to enable clipboard notifications", error);
    });

    return () => {
      disposed = true;
    };
  }, []);

  const addNotification = (message: ClipboardEvent) => {
    setNotifications((current) => {
      if (current.some((item) => item.receivedAt === message.receivedAt)) {
        return current;
      }
      return [message, ...current].slice(0, 10);
    });
    setIsOpen(true);
  };

  const showBackgroundFallback = async (message: ClipboardEvent) => {
    if (Platform.OS === "web" || AppState.currentState === "active" || pushNotificationsEnabled.current) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New clipboard text",
        body: message.text.length > 180 ? `${message.text.slice(0, 177)}...` : message.text,
        data: message,
        sound: "clipboard.wav",
      },
      trigger: Platform.OS === "android" ? { channelId: clipboardChannelId } : null,
    });
  };

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (
        data?.type === "clipboard" &&
        typeof data.text === "string" &&
        typeof data.receivedAt === "string"
      ) {
        addNotification({ type: "clipboard", text: data.text, receivedAt: data.receivedAt });
      }
    });

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
          const message = JSON.parse(event.data) as ClipboardEvent;
          if (message.type !== "clipboard" || typeof message.text !== "string") {
            return;
          }

          addNotification(message);
          showBackgroundFallback(message).catch((error) => {
            console.warn("Unable to show background clipboard notification", error);
          });
        } catch {
          // Ignore malformed messages from the socket.
        }
      };
      socket.onerror = (event) => {
        console.error(`Clipboard WebSocket error at ${webSocketUrl}`, event);
        socket?.close();
      };
      socket.onclose = (event) => {
        if (!disposed) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  const copyNotification = async (notification: ClipboardEvent) => {
    await Clipboard.setStringAsync(notification.text);
    setCopiedId(notification.receivedAt);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        accessibilityLabel="Open clipboard notifications"
        style={styles.bell}
        onPress={() => setIsOpen((open) => !open)}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.ink} />
        {notifications.length > 0 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{notifications.length}</Text>
          </View>
        ) : null}
      </Pressable>

      {isOpen ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Clipboard</Text>
              <Text style={styles.panelSubtitle}>Recent text from your desktop</Text>
            </View>
            <Pressable
              accessibilityLabel="Close clipboard notifications"
              hitSlop={8}
              onPress={() => setIsOpen(false)}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {notifications.length === 0 ? (
            <Text style={styles.empty}>Copied text will appear here.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map((notification) => (
                <View style={styles.notification} key={notification.receivedAt}>
                  <Text style={styles.notificationText} numberOfLines={4}>
                    {notification.text}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
                    onPress={() => copyNotification(notification)}
                  >
                    <Ionicons
                      name={copiedId === notification.receivedAt ? "checkmark" : "copy-outline"}
                      size={16}
                      color={colors.green}
                    />
                    <Text style={styles.copyText}>
                      {copiedId === notification.receivedAt ? "Copied" : "Copy"}
                    </Text>
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

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  bell: {
    position: "absolute",
    top: 52,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
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
    top: 104,
    right: spacing.lg,
    width: 320,
    maxWidth: "90%",
    maxHeight: 430,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    shadowColor: colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
  },
  panelTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  panelSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: spacing.lg },
  notification: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
  },
  notificationText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  copyButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  copyText: { color: colors.green, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.65 },
});