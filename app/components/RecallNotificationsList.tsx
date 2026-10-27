import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { radius, spacing } from "../constants/theme";
import { relativeTime, titleCase } from "../lib/format";
import {
  listRecallNotifications,
  markRecallNotificationRead,
  parsePendingTicketsData,
  type RecallNotification,
} from "../lib/notifications";
import ShimmerBlock from "./ShimmerBlock";
import { useTheme, useThemedStyles } from "./ThemeProvider";
import { EmptyState } from "./ui";

function stripMarkdown(value: string) {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function NotificationSkeleton() {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: 10,
    },
  }));

  return (
    <View style={styles.card}>
      <ShimmerBlock width="55%" height={14} borderRadius={5} />
      <ShimmerBlock
        width="100%"
        height={12}
        borderRadius={5}
        style={{ marginTop: 12 }}
      />
      <ShimmerBlock
        width="78%"
        height={12}
        borderRadius={5}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

function PendingTicketsNotificationCard({
  notification,
  onRefresh,
}: {
  notification: RecallNotification;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const tickets = parsePendingTicketsData(notification.data);
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: 10,
    },
    pressed: { opacity: 0.78 },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.greenSoft,
    },
    headerBody: { flex: 1 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    title: {
      flex: 1,
      color: colors.ink,
      fontSize: 16,
      fontWeight: "800",
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.green,
    },
    body: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
    meta: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 6,
    },
    ticketList: { marginTop: spacing.md, gap: spacing.sm },
    ticketRow: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
      padding: spacing.md,
      backgroundColor: colors.canvas,
    },
    ticketTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    ticketKey: {
      color: colors.green,
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.4,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.blueSoft,
    },
    statusText: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: "800",
    },
    ticketTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 6,
    },
    project: { color: colors.muted, fontSize: 12, marginTop: 3 },
    summary: {
      color: colors.charcoal,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
      marginTop: spacing.md,
    },
    footerText: {
      color: colors.green,
      fontSize: 13,
      fontWeight: "700",
    },
  }));

  const markRead = async () => {
    if (notification.is_read) return;
    try {
      await markRecallNotificationRead(notification.id);
      onRefresh();
    } catch {
      // List still shows content; read state syncs on next refresh.
    }
  };

  const openTickets = async () => {
    await markRead();
    router.push("/(tabs)/tickets");
  };

  const openTicket = async (ticketId: number) => {
    await markRead();
    router.push(`/ticket/${ticketId}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="ticket-outline" size={20} color={colors.green} />
        </View>
        <View style={styles.headerBody}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{notification.title}</Text>
            {!notification.is_read ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.body}>{notification.body}</Text>
          <Text style={styles.meta}>
            {relativeTime(notification.created_at)}
            {notification.push_status === "sent" ? " · Push sent" : null}
          </Text>
        </View>
      </View>

      {tickets.length > 0 ? (
        <View style={styles.ticketList}>
          {tickets.map((ticket) => (
            <Pressable
              key={ticket.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ticket ${ticket.ticket_key}`}
              onPress={() => openTicket(ticket.id)}
              style={({ pressed }) => [
                styles.ticketRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.ticketTop}>
                <Text style={styles.ticketKey}>{ticket.ticket_key}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>
                    {titleCase(ticket.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketTitle} numberOfLines={2}>
                {ticket.title}
              </Text>
              {ticket.project?.name ? (
                <Text style={styles.project}>{ticket.project.name}</Text>
              ) : null}
              {ticket.short_summary ? (
                <Text style={styles.summary} numberOfLines={3}>
                  {stripMarkdown(ticket.short_summary)}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View tickets"
        onPress={openTickets}
        style={({ pressed }) => [styles.footer, pressed && styles.pressed]}
      >
        <Text style={styles.footerText}>View tickets</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.green} />
      </Pressable>
    </View>
  );
}

function GenericNotificationCard({
  notification,
}: {
  notification: RecallNotification;
}) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: 10,
    },
    title: { color: colors.ink, fontSize: 16, fontWeight: "800" },
    body: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    meta: { color: colors.muted, fontSize: 12, marginTop: 8 },
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{notification.title}</Text>
      <Text style={styles.body}>{notification.body}</Text>
      <Text style={styles.meta}>{relativeTime(notification.created_at)}</Text>
    </View>
  );
}

export function useRecallNotifications() {
  const [notifications, setNotifications] = useState<RecallNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const items = await listRecallNotifications();
      setNotifications(items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load notifications.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return {
    notifications,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}

export function RecallNotificationsList({
  notifications,
  loading,
  error,
  onRefresh,
}: {
  notifications: RecallNotification[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const styles = useThemedStyles((colors) => ({
    error: {
      color: colors.red,
      fontSize: 13,
      marginBottom: spacing.md,
      lineHeight: 19,
    },
  }));

  if (loading && notifications.length === 0) {
    return (
      <View>
        <NotificationSkeleton />
        <NotificationSkeleton />
      </View>
    );
  }

  if (!loading && notifications.length === 0 && !error) {
    return (
      <EmptyState
        icon="notifications-outline"
        title="No ticket summaries yet"
        body="When Recall generates a pending-ticket summary for you, it will show up here with a short recap for each ticket."
      />
    );
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notifications.map((notification) =>
        notification.type === "pending_tickets" ? (
          <PendingTicketsNotificationCard
            key={notification.id}
            notification={notification}
            onRefresh={onRefresh}
          />
        ) : (
          <GenericNotificationCard
            key={notification.id}
            notification={notification}
          />
        ),
      )}
    </View>
  );
}
