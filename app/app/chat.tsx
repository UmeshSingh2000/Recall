import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, Line, RadialGradient, Stop } from "react-native-svg";
import { useTheme, useThemedStyles } from "../components/ThemeProvider";
import { radius, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTickets } from "../store/workspaceSlice";
import {
  createChatSession,
  listChatSessions,
  streamChatWithTickets,
  updateChatSession,
} from "../lib/api";
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

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatHistoryEntry = {
  id: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
  ticket_ids?: number[];
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingTickets = (ticketsData ?? []).filter((ticket) => openTicketStatuses.has(ticket.status));
  const allTickets = ticketsData ?? [];
  const selectedTicket = pendingTickets[selectedTicketIndex];
  const carouselCardWidth = Math.max(width - spacing.lg * 2, 280);
  const accent = colors.green;
  const historyTranslateX = useRef(new Animated.Value(-width)).current;
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTickets()).unwrap().catch((error) => {
        console.warn("Unable to load tickets for chat:", error);
      });
      listChatSessions().then((sessions) => {
        setChatHistory(sessions);
      }).catch((error) => {
        console.warn("Unable to load chat history:", error);
      });
    }, [dispatch]),
  );

  useEffect(() => {
    if (selectedTicketIndex >= pendingTickets.length) {
      setSelectedTicketIndex(Math.max(pendingTickets.length - 1, 0));
    }
  }, [pendingTickets.length, selectedTicketIndex]);

  useEffect(() => {
    if (!isHistoryOpen) return;
    historyTranslateX.setValue(-width);
    Animated.timing(historyTranslateX, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [historyTranslateX, isHistoryOpen, width]);

  const styles = useThemedStyles((colors) => ({
    safe: { flex: 1, backgroundColor: colors.canvas },
    backgroundPattern: { position: "absolute", top: 60, left: 0, right: 0, bottom: 0, opacity: 0.18 },
    header: { height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
    headerCopy: { flex: 1 },
    title: { color: colors.ink, fontSize: 16, fontWeight: "800" },
    subtitle: { color: accent, fontSize: 11, fontWeight: "700", marginTop: 3 },
    action: { padding: 8 },
    menuButton: { padding: 8, marginLeft: 4 },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: 17, paddingBottom: spacing.lg },
    ticketPanel: { paddingHorizontal: spacing.lg, paddingTop: 17 },
    ticketSection: { marginBottom: 10 },
    ticket: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.line, minHeight: 64 },
    ticketCopy: { flex: 1, marginLeft: spacing.md },
    ticketKey: { color: accent, fontSize: 12, fontWeight: "800" },
    ticketTitle: { color: colors.ink, fontSize: 13, fontWeight: "700", marginTop: 5 },
    status: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, marginLeft: spacing.sm },
    statusText: { color: accent, fontSize: 10, fontWeight: "800" },
    carousel: { marginHorizontal: -spacing.lg },
    carouselContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    carouselEmpty: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
    carouselEmptyText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    carouselDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
    carouselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
    carouselDotActive: { width: 17, backgroundColor: accent },
    hero: { flex: 1, paddingBottom: 50 },
    emptyHero: { alignItems: "center", justifyContent: "center" },
    chatMessages: { alignItems: "stretch", justifyContent: "flex-start", paddingTop: 4 },
    assistantIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 16 },
    heroTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
    heroCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8, maxWidth: 340, paddingHorizontal: 8 },
    section: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 11 },
    composerBar: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
    composer: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 7, paddingVertical: 7 },
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
    messageBubble: { maxWidth: "88%", borderRadius: radius.md, padding: 12, marginBottom: 10 },
    userBubble: { alignSelf: "flex-end", backgroundColor: accent },
    assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
    messageText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
    responseIndicator: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 },
    responseIndicatorText: { color: colors.muted, fontSize: 12 },
    errorText: { color: colors.red, fontSize: 12, marginBottom: 8 },
    historyOverlay: { flex: 1, flexDirection: "row", backgroundColor: colors.overlay },
    historyDrawer: { width: "86%", maxWidth: 380, backgroundColor: colors.surface, paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg },
    historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
    historyTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
    historySubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
    historyClose: { padding: 6 },
    newChatButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.green, borderRadius: radius.md, paddingVertical: 12, marginBottom: spacing.lg },
    newChatText: { color: colors.canvas, fontSize: 13, fontWeight: "800" },
    historyList: { flex: 1 },
    historyItem: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
    historyItemCopy: { flex: 1, marginLeft: spacing.md },
    historyItemTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
    historyItemPreview: { color: colors.muted, fontSize: 12, marginTop: 4 },
    historyDate: { color: colors.muted, fontSize: 10, marginTop: 6 },
    historyEmpty: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", paddingTop: spacing.xl },
  }));

  const startNewChat = async () => {
    try {
      const ticketIds = [selectedTicket, ...attachedTickets]
        .filter((ticket): ticket is Ticket => Boolean(ticket))
        .map((ticket) => ticket.id)
        .filter((id, index, ids) => ids.indexOf(id) === index);
      const session = await createChatSession({ title: "New chat", ticket_ids: ticketIds });
      setChatHistory((current) => [session, ...current]);
      setActiveHistoryId(session.id);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start a new chat.");
      return;
    }
    setMessages([]);
    setError(null);
    setIsHistoryOpen(false);
  };

  const openHistory = (entry: ChatHistoryEntry) => {
    setMessages(entry.messages);
    setActiveHistoryId(entry.id);
    setError(null);
    setIsHistoryOpen(false);
  };

  const sendMessage = async () => {
    const trimmed = message.trim();
    const ticketIds = [selectedTicket, ...attachedTickets]
      .filter((ticket): ticket is Ticket => Boolean(ticket))
      .map((ticket) => ticket.id)
      .filter((id, index, ids) => ids.indexOf(id) === index);
    if (!trimmed || !ticketIds.length || isSending) return;
    let historyId = activeHistoryId;
    if (!historyId) {
      try {
        const session = await createChatSession({ title: trimmed, ticket_ids: ticketIds });
        historyId = session.id;
        setActiveHistoryId(historyId);
        setChatHistory((current) => [session, ...current]);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Unable to create chat.");
        return;
      }
    }
    setMessage("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    const sessionId = historyId;
    setChatHistory((current) => {
      const existing = current.find((entry) => entry.id === sessionId);
      if (existing) {
        return current.map((entry) => entry.id === sessionId
          ? {
            ...entry,
            messages: [...entry.messages, { role: "user", content: trimmed } as ChatMessage],
          }
          : entry);
      }
      return [
        {
          id: historyId,
          title: trimmed,
          preview: trimmed,
          messages: [{ role: "user", content: trimmed } as ChatMessage],
        },
        ...current,
      ];
    });
    setIsSending(true);
    try {
      let responseContent = "";
      await streamChatWithTickets(
        { message: trimmed, ticket_ids: ticketIds },
        (content) => {
          responseContent += content;
          setMessages((current) => {
            const last = current[current.length - 1];
            if (!last || last.role !== "assistant") {
              return [...current, { role: "assistant", content }];
            }
            return [
              ...current.slice(0, -1),
              { ...last, content: last.content + content },
            ];
          });
          setChatHistory((current) => current.map((entry) => {
            if (entry.id !== sessionId) return entry;
            const last = entry.messages[entry.messages.length - 1];
            const nextMessages: ChatMessage[] = last?.role === "assistant"
              ? [...entry.messages.slice(0, -1), { ...last, content: last.content + content }]
              : [...entry.messages, { role: "assistant", content } as ChatMessage];
            return { ...entry, preview: `${entry.preview}${content}`, messages: nextMessages };
          }));
        },
      );
      const savedMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
        { role: "assistant", content: responseContent },
      ];
      const updated = await updateChatSession(sessionId, {
        preview: responseContent || trimmed,
        ticket_ids: ticketIds,
        messages: savedMessages,
      });
      setChatHistory((current) => current.map((entry) => entry.id === sessionId ? updated : entry));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View pointerEvents="none" style={styles.backgroundPattern}>
        <Svg width="100%" height="100%" viewBox="0 0 400 720" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id="chatBackgroundGlow" cx="50%" cy="50%" rx="72%" ry="65%">
              <Stop offset="0" stopColor={accent} stopOpacity="0.15" />
              <Stop offset="0.58" stopColor={colors.green} stopOpacity="0.055" />
              <Stop offset="1" stopColor={colors.canvas} stopOpacity="0" />
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
        <Pressable style={styles.menuButton} onPress={() => setIsHistoryOpen(true)} accessibilityLabel="Open chat history">
          <Ionicons name="menu-outline" size={23} color={colors.ink} />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View style={styles.ticketPanel}>
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
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, messages.length ? styles.chatMessages : styles.emptyHero]}>
          {!messages.length ? <>
            <View style={styles.assistantIcon}><Ionicons name="person-outline" size={19} color={accent} /></View>
            <Text style={styles.heroTitle}>{selectedTicket ? `Ready to assist with ${selectedTicket.ticket_key}` : "Ready to assist"}</Text>
            <Text style={styles.heroCopy}>{selectedTicket ? `Ask about ${selectedTicket.title}, its progress, or the next step.` : "Choose a pending ticket to start with its workspace context."}</Text>
          </> : messages.map((chatMessage, index) => (
            <View key={`${chatMessage.role}-${index}`} style={[styles.messageBubble, chatMessage.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.messageText}>{chatMessage.content}</Text>
            </View>
          ))}
          {isSending ? (
            <View style={styles.responseIndicator} accessibilityLabel="AI is responding">
              <ActivityIndicator size="small" color={accent} />
              <Text style={styles.responseIndicatorText}>AI is responding...</Text>
            </View>
          ) : null}
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
            <TextInput value={message} onChangeText={setMessage} placeholder={selectedTicket ? `Ask anything about ${selectedTicket.ticket_key}...` : "Ask anything about your workspace..."} placeholderTextColor={colors.muted} style={styles.input} editable={!isSending} onSubmitEditing={sendMessage} />
            <Pressable style={[styles.send, isSending && { opacity: 0.6 }]} accessibilityLabel="Send message" onPress={sendMessage} disabled={isSending}>
              {isSending ? <ActivityIndicator size="small" color={colors.canvas} /> : <Ionicons name="arrow-up" size={16} color={colors.canvas} />}
            </Pressable>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
      <Modal
        visible={isHistoryOpen}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <Pressable style={styles.historyOverlay} onPress={() => setIsHistoryOpen(false)}>
          <Animated.View style={[styles.historyDrawer, { transform: [{ translateX: historyTranslateX }] }]} onStartShouldSetResponder={() => true}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>Chat history</Text>
                <Text style={styles.historySubtitle}>Pick up where you left off</Text>
              </View>
              <Pressable style={styles.historyClose} onPress={() => setIsHistoryOpen(false)} accessibilityLabel="Close chat history">
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <Pressable style={styles.newChatButton} onPress={startNewChat} accessibilityLabel="Start a new chat">
              <Ionicons name="add" size={18} color={colors.canvas} />
              <Text style={styles.newChatText}>New chat</Text>
            </Pressable>
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {chatHistory.length ? chatHistory.map((entry) => (
                <Pressable key={entry.id} style={styles.historyItem} onPress={() => openHistory(entry)} accessibilityRole="button">
                  <Ionicons name="chatbubble-ellipses-outline" size={19} color={accent} />
                  <View style={styles.historyItemCopy}>
                    <Text style={styles.historyItemTitle} numberOfLines={1}>{entry.title}</Text>
                    <Text style={styles.historyItemPreview} numberOfLines={2}>{entry.preview}</Text>
                    <Text style={styles.historyDate}>Recent chat</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              )) : (
                <Text style={styles.historyEmpty}>Your previous chats will appear here.</Text>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
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
