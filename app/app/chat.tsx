import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, Line, RadialGradient, Stop } from "react-native-svg";
import { useTheme, useThemedStyles } from "../components/ThemeProvider";
import { radius, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTickets } from "../store/workspaceSlice";
import type { Ticket } from "../types";

const openTicketStatuses = new Set<Ticket["status"]>([
  "in_progress",
  "paused",
  "blocked",
  "review",
  "product_review",
  "code_review",
  "testing",
]);

function statusLabel(status: Ticket["status"]) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ChatScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ticketsData = useAppSelector((state) => state.workspace.tickets);
  const ticketsLoading = useAppSelector((state) => state.workspace.ticketsLoading);
  const [message, setMessage] = useState("");
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [isTicketPickerOpen, setIsTicketPickerOpen] = useState(false);
  const [attachedTickets, setAttachedTickets] = useState<Ticket[]>([]);
  const pendingTickets = (ticketsData ?? []).filter((ticket) => openTicketStatuses.has(ticket.status));
  const allTickets = ticketsData ?? [];
  const selectedTicket = pendingTickets[selectedTicketIndex];
  const carouselCardWidth = Math.max(width - spacing.lg * 2, 280);
  const accent = colors.violet;
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTickets()).unwrap().catch((error) => {
        console.warn("Unable to load tickets for chat:", error);
      });
    }, [dispatch]),
  );

  useEffect(() => {
    if (selectedTicketIndex >= pendingTickets.length) {
      setSelectedTicketIndex(Math.max(pendingTickets.length - 1, 0));
    }
  }, [pendingTickets.length, selectedTicketIndex]);

  const styles = useThemedStyles((colors) => ({
    safe: { flex: 1, backgroundColor: "#000000" },
    backgroundPattern: { position: "absolute", top: 60, left: 0, right: 0, bottom: 0, opacity: 0.18 },
    header: { height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, backgroundColor: "#001000", borderBottomWidth: 1, borderBottomColor: "#173018" },
    headerCopy: { flex: 1 },
    title: { color: colors.ink, fontSize: 16, fontWeight: "800" },
    subtitle: { color: accent, fontSize: 11, fontWeight: "700", marginTop: 3 },
    action: { padding: 8 },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: 17, paddingBottom: spacing.lg },
    ticketSection: { marginBottom: 10 },
    ticket: { flexDirection: "row", alignItems: "center", backgroundColor: "#001000", borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: "#173018", minHeight: 64 },
    ticketCopy: { flex: 1, marginLeft: spacing.md },
    ticketKey: { color: accent, fontSize: 12, fontWeight: "800" },
    ticketTitle: { color: "#E6E6E6", fontSize: 13, fontWeight: "700", marginTop: 5 },
    status: { backgroundColor: "#21183A", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, marginLeft: spacing.sm },
    statusText: { color: accent, fontSize: 10, fontWeight: "800" },
    carousel: { marginHorizontal: -spacing.lg },
    carouselContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    carouselEmpty: { backgroundColor: "#001000", borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: "#173018" },
    carouselEmptyText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    carouselDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
    carouselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#27302A" },
    carouselDotActive: { width: 17, backgroundColor: accent },
    hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 50 },
    assistantIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#001000", borderWidth: 1, borderColor: "#173018", marginBottom: 16 },
    heroTitle: { color: "#E6E6E6", fontSize: 17, fontWeight: "800" },
    heroCopy: { color: "#8D9990", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8, maxWidth: 340, paddingHorizontal: 8 },
    section: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 11 },
    composerBar: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 8, backgroundColor: "#001000", borderTopWidth: 1, borderTopColor: "#173018" },
    composer: { backgroundColor: "#001000", borderRadius: radius.md, borderWidth: 1, borderColor: "#173018", paddingHorizontal: 7, paddingVertical: 7 },
    attachment: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.greenSoft, borderRadius: radius.sm, paddingVertical: 5, paddingLeft: 8, paddingRight: 5, marginBottom: 5, maxWidth: "100%" },
    attachmentText: { color: colors.green, fontSize: 11, fontWeight: "700", marginHorizontal: 5, flexShrink: 1 },
    attachmentRemove: { padding: 2 },
    composerRow: { flexDirection: "row", alignItems: "center", minHeight: 38 },
    attachButton: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    input: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12 },
    send: { width: 38, height: 38, borderRadius: 10, backgroundColor: accent, alignItems: "center", justifyContent: "center" },
    pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay, zIndex: 1000, elevation: 1000 },
    picker: { maxHeight: "72%", backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, marginBottom: insets.bottom, zIndex: 1001, elevation: 1001 },
    pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
    pickerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
    pickerSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
    pickerClose: { padding: 5 },
    pickerList: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: "hidden" },
    pickerTicket: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
    pickerTicketLast: { borderBottomWidth: 0 },
    pickerTicketIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
    pickerTicketCopy: { flex: 1 },
    pickerTicketKey: { color: colors.green, fontSize: 11, fontWeight: "800" },
    pickerTicketTitle: { color: colors.ink, fontSize: 13, fontWeight: "700", marginTop: 3 },
    pickerEmpty: { color: colors.muted, fontSize: 13, paddingVertical: spacing.md },
    pickerFooter: { flexDirection: "row", justifyContent: "flex-end", paddingTop: spacing.md },
    pickerDone: { backgroundColor: colors.green, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 11 },
    pickerDoneText: { color: colors.canvas, fontSize: 13, fontWeight: "800" },
  }));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View pointerEvents="none" style={styles.backgroundPattern}>
        <Svg width="100%" height="100%" viewBox="0 0 400 720" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id="chatBackgroundGlow" cx="50%" cy="50%" rx="72%" ry="65%">
              <Stop offset="0" stopColor={accent} stopOpacity="0.15" />
              <Stop offset="0.58" stopColor={colors.green} stopOpacity="0.055" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="200" cy="365" rx="300" ry="410" fill="url(#chatBackgroundGlow)" />
          {Array.from({ length: 11 }, (_, index) => <Line key={`v-${index}`} x1={index * 40} y1="0" x2={index * 40} y2="720" stroke={colors.green} strokeWidth="0.35" opacity="0.25" />)}
          {Array.from({ length: 19 }, (_, index) => <Line key={`h-${index}`} x1="0" y1={index * 40} x2="400" y2={index * 40} stroke={colors.green} strokeWidth="0.35" opacity="0.25" />)}
          {Array.from({ length: 209 }, (_, index) => <Circle key={`d-${index}`} cx={(index % 11) * 40} cy={Math.floor(index / 11) * 40} r="1" fill={colors.green} opacity="0.7" />)}
        </Svg>
      </View>
      <View style={styles.header}>
        <Pressable style={styles.action} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Chat with Ticket</Text>
          <Text style={styles.subtitle}>{selectedTicket ? `${selectedTicket.ticket_key} • ${selectedTicket.project_name}` : "Workspace assistant"}</Text>
        </View>
        <Pressable style={styles.action} accessibilityLabel="Open ticket"><Ionicons name="open-outline" size={16} color={colors.muted} /></Pressable>
        <Pressable style={styles.action} accessibilityLabel="More options"><Ionicons name="ellipsis-vertical" size={16} color={colors.muted} /></Pressable>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.ticketSection}>
          <Text style={styles.section}>PENDING TICKETS</Text>
          {ticketsLoading && ticketsData === null ? (
            <ActivityIndicator color={colors.green} />
          ) : pendingTickets.length ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={carouselCardWidth + spacing.sm}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={styles.carouselContent}
                style={styles.carousel}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselCardWidth);
                  setSelectedTicketIndex(Math.min(Math.max(nextIndex, 0), pendingTickets.length - 1));
                }}
              >
                {pendingTickets.map((ticket) => (
                  <Pressable
                    key={ticket.id}
                    style={[styles.ticket, { width: carouselCardWidth }]}
                    onPress={() => router.push(`/ticket/${ticket.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${ticket.ticket_key}: ${ticket.title}`}
                  >
                    <Ionicons name="ticket-outline" size={16} color={accent} />
                    <View style={styles.ticketCopy}>
                      <Text style={styles.ticketKey}>{ticket.ticket_key}</Text>
                      <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                    </View>
                    <View style={styles.status}><Text style={styles.statusText}>{statusLabel(ticket.status)}</Text></View>
                    <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                  </Pressable>
                ))}
              </ScrollView>
              {pendingTickets.length > 1 ? <View style={styles.carouselDots}>
                {pendingTickets.map((ticket, index) => <View key={ticket.id} style={[styles.carouselDot, index === selectedTicketIndex && styles.carouselDotActive]} />)}
              </View> : null}
            </>
          ) : (
            <View style={styles.carouselEmpty}><Text style={styles.carouselEmptyText}>No pending tickets. You’re all caught up.</Text></View>
          )}
        </View>
        <View style={styles.hero}>
          <View style={styles.assistantIcon}><Ionicons name="person-outline" size={19} color={accent} /></View>
          <Text style={styles.heroTitle}>{selectedTicket ? `Ready to assist with ${selectedTicket.ticket_key}` : "Ready to assist"}</Text>
          <Text style={styles.heroCopy}>{selectedTicket ? `Ask about ${selectedTicket.title}, its progress, or the next step.` : "Choose a pending ticket to start with its workspace context."}</Text>
        </View>
      </ScrollView>
      <View style={styles.composerBar}>
        <View style={styles.composer}>
          {attachedTickets.map((ticket) => <View key={ticket.id} style={styles.attachment}>
            <Ionicons name="ticket-outline" size={14} color={colors.green} />
            <Text style={styles.attachmentText} numberOfLines={1}>{ticket.ticket_key}: {ticket.title}</Text>
            <Pressable
              style={styles.attachmentRemove}
              onPress={() => setAttachedTickets((current) => current.filter((attached) => attached.id !== ticket.id))}
              accessibilityLabel={`Remove ${ticket.ticket_key} attachment`}
            >
              <Ionicons name="close" size={15} color={colors.green} />
            </Pressable>
          </View>)}
          <View style={styles.composerRow}>
            <Pressable style={styles.attachButton} onPress={() => setIsTicketPickerOpen(true)} accessibilityLabel="Attach a ticket">
              <Ionicons name="add" size={23} color={accent} />
            </Pressable>
            <TextInput value={message} onChangeText={setMessage} placeholder={selectedTicket ? `Ask anything about ${selectedTicket.ticket_key}...` : "Ask anything about your workspace..."} placeholderTextColor={colors.muted} style={styles.input} />
            <Pressable style={styles.send} accessibilityLabel="Send message"><Ionicons name="arrow-up" size={16} color="#17131F" /></Pressable>
          </View>
        </View>
      </View>
      <Modal
        visible={isTicketPickerOpen}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsTicketPickerOpen(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setIsTicketPickerOpen(false)}>
          <Pressable style={styles.picker} onPress={(event) => event.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Attach tickets</Text>
                <Text style={styles.pickerSubtitle}>Select one or more tickets to add to this chat</Text>
              </View>
              <Pressable style={styles.pickerClose} onPress={() => setIsTicketPickerOpen(false)} accessibilityLabel="Close ticket picker">
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {allTickets.length ? allTickets.map((ticket, index) => {
                const isAttached = attachedTickets.some((attached) => attached.id === ticket.id);
                return <Pressable
                  key={ticket.id}
                  style={[styles.pickerTicket, index === allTickets.length - 1 && styles.pickerTicketLast]}
                  onPress={() => setAttachedTickets((current) => (
                    isAttached ? current.filter((attached) => attached.id !== ticket.id) : [...current, ticket]
                  ))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isAttached }}
                  accessibilityLabel={`Attach ${ticket.ticket_key}: ${ticket.title}`}
                >
                  <View style={styles.pickerTicketIcon}><Ionicons name="ticket-outline" size={16} color={colors.green} /></View>
                  <View style={styles.pickerTicketCopy}>
                    <Text style={styles.pickerTicketKey}>{ticket.ticket_key}</Text>
                    <Text style={styles.pickerTicketTitle} numberOfLines={1}>{ticket.title}</Text>
                  </View>
                  <Ionicons name={isAttached ? "checkmark-circle" : "add-circle-outline"} size={21} color={colors.green} />
                </Pressable>;
              }) : <Text style={styles.pickerEmpty}>No tickets are available to attach.</Text>}
            </ScrollView>
            <View style={styles.pickerFooter}>
              <Pressable style={styles.pickerDone} onPress={() => setIsTicketPickerOpen(false)} accessibilityLabel="Finish attaching tickets">
                <Text style={styles.pickerDoneText}>{attachedTickets.length ? `Attach ${attachedTickets.length} ticket${attachedTickets.length === 1 ? "" : "s"}` : "Done"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
