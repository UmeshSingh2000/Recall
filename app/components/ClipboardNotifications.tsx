import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../constants/theme";

type ClipboardEvent = {
  type: "clipboard";
  text: string;
  receivedAt: string;
};

const backendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");
const webSocketUrl = backendUrl.replace(/^http/, "ws");

export function ClipboardNotifications() {
  const [notifications, setNotifications] = useState<ClipboardEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (disposed) return;

      console.log(`Connecting to clipboard WebSocket at ${webSocketUrl}`);
      socket = new WebSocket(webSocketUrl);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ClipboardEvent;
          if (message.type !== "clipboard" || typeof message.text !== "string") {
            return;
          }

          setNotifications((current) => [message, ...current].slice(0, 10));
          setIsOpen(true);
        } catch {
          // Ignore malformed messages from the socket.
        }
      };
      socket.onerror = (event) => {
        console.error(`Clipboard WebSocket error at ${webSocketUrl}`, event);
        socket?.close();
      };
      socket.onclose = (event) => {
        console.log(`Clipboard WebSocket closed (${event.code}): ${event.reason || "no reason"}`);
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