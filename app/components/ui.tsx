import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../constants/theme";
import { titleCase } from "../lib/format";
import type { Ticket } from "../types";

export function Screen({
  children,
  title,
  subtitle,
  right,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        {title ? (
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {right}
      </View>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function StatusBadge({ status }: { status: Ticket["status"] }) {
  const tone = {
    in_progress: [colors.greenSoft, colors.green],
    paused: [colors.orangeSoft, colors.orange],
    blocked: [colors.redSoft, colors.red],
    review: [colors.violetSoft, colors.violet],
    product_review: [colors.violetSoft, colors.violet],
    code_review: [colors.blueSoft, colors.blue],
    testing: [colors.orangeSoft, colors.orange],
    live: [colors.greenSoft, colors.green],
    done: [colors.blueSoft, colors.blue],
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone[0] }]}>
      <Text style={[styles.badgeText, { color: tone[1] }]}>
        {titleCase(status)}
      </Text>
    </View>
  );
}

export function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  const tone = {
    low: colors.muted,
    medium: colors.blue,
    high: colors.orange,
    urgent: colors.red,
  }[priority];
  return (
    <View style={styles.priority}>
      <View style={[styles.priorityDot, { backgroundColor: tone }]} />
      <Text style={[styles.priorityText, { color: tone }]}>
        {titleCase(priority)}
      </Text>
    </View>
  );
}

export function TicketCard({
  ticket,
  onPress,
}: {
  ticket: Ticket;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ticketCard, pressed && styles.pressed]}
    >
      <View style={styles.ticketTop}>
        <Text style={styles.ticketKey}>{ticket.ticket_key}</Text>
        <StatusBadge status={ticket.status} />
      </View>
      <Text style={styles.ticketTitle}>{ticket.title}</Text>
      <Text style={styles.projectLabel}>{ticket.project_name}</Text>
      <View style={styles.ticketBottom}>
        <PriorityBadge priority={ticket.priority} />
        <Text style={styles.activity}>
          {ticket.last_log || ticket.updated_at
            ? "Updated recently"
            : "No activity"}
        </Text>
      </View>
      {ticket.next_action ? (
        <View style={styles.nextRow}>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={16}
            color={colors.green}
          />
          <Text style={styles.nextText} numberOfLines={1}>
            {ticket.next_action}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}
export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.green} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? (
        <Pressable style={styles.primaryButton} onPress={onAction}>
          <Text style={styles.primaryButtonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
export function SearchInput({
  value,
  onChangeText,
  placeholder = "Search tickets, projects, notes...",
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.search, style]}>
      <Ionicons name="search" size={19} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        returnKeyType="search"
      />
    </View>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog}>
          <View style={styles.dialogIcon}>
            <Ionicons name="warning-outline" size={23} color={colors.red} />
          </View>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <Pressable style={styles.dialogCancel} onPress={onCancel}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.dialogConfirm} onPress={onConfirm}>
              <Ionicons name="trash-outline" size={17} color="#fff" />
              <Text style={styles.dialogConfirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
  },
  keyboard: { flex: 1 },
  dialogBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(23, 33, 43, 0.48)",
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dialogIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.redSoft,
    marginBottom: 16,
  },
  dialogTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  dialogMessage: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  dialogActions: { flexDirection: "row", gap: 9, marginTop: 24 },
  dialogCancel: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 13, alignItems: "center" },
  dialogCancelText: { color: colors.charcoal, fontWeight: "800" },
  dialogConfirm: { flex: 1, flexDirection: "row", gap: 7, backgroundColor: colors.red, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  dialogConfirmText: { color: "#fff", fontWeight: "800" },
  header: {
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  sectionAction: { color: colors.green, fontSize: 13, fontWeight: "700" },
  ticketCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 10,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  ticketTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketKey: {
    color: colors.green,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  ticketTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 9,
  },
  projectLabel: { color: colors.muted, fontSize: 13, marginTop: 4 },
  ticketBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },
  activity: { color: colors.muted, fontSize: 12 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  priority: { flexDirection: "row", alignItems: "center", gap: 6 },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityText: { fontSize: 12, fontWeight: "700" },
  nextRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    paddingTop: 12,
  },
  nextText: { color: colors.charcoal, fontSize: 12, flex: 1 },
  search: {
    height: 48,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    backgroundColor: colors.greenSoft,
    borderRadius: 30,
    padding: 14,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
  },
  emptyBody: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 7,
  },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 18,
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
});
