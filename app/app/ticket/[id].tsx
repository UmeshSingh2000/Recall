import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../constants/theme";
import { PriorityBadge, StatusBadge } from "../../components/ui";
import { deleteTicket } from "../../lib/database";
import { relativeTime, titleCase } from "../../lib/format";
import type { ProgressItem, Ticket, WorkLog } from "../../types";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [nextAction, setNextAction] = useState("");
  const [myContext, setMyContext] = useState("");
  const [whyImplementing, setWhyImplementing] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [importantDecisions, setImportantDecisions] = useState("");
  useEffect(() => {
    const ticketId = Number(id);
    Promise.all([
      db.getFirstAsync<Ticket>(
        "SELECT t.*, p.name AS project_name FROM tickets t JOIN projects p ON p.id=t.project_id WHERE t.id = ?",
        ticketId,
      ),
      db.getAllAsync<ProgressItem>(
        "SELECT * FROM progress_items WHERE ticket_id = ? ORDER BY position",
        ticketId,
      ),
      db.getAllAsync<WorkLog>(
        "SELECT * FROM work_logs WHERE ticket_id = ? ORDER BY created_at DESC",
        ticketId,
      ),
    ]).then(([nextTicket, nextProgress, nextLogs]) => {
      setTicket(nextTicket);
      setNextAction(nextTicket?.next_action || "");
      setMyContext(nextTicket?.my_context || "");
      setWhyImplementing(nextTicket?.why_implementing || "");
      setHowItWorks(nextTicket?.how_it_works || "");
      setImportantDecisions(nextTicket?.important_decisions || "");
      setProgress(nextProgress);
      setLogs(nextLogs);
    });
  }, [db, id]);
  if (!ticket)
    return (
      <SafeAreaView style={styles.loading} edges={["top", "left", "right"]}>
        <Text>Loading ticket...</Text>
      </SafeAreaView>
    );
  const saveNext = async () => {
    await db.runAsync(
      "UPDATE tickets SET next_action = ?, updated_at = ? WHERE id = ?",
      nextAction,
      new Date().toISOString(),
      ticket.id,
    );
    setTicket({ ...ticket, next_action: nextAction });
  };
  const saveContext = async (
    field: "my_context" | "why_implementing" | "how_it_works" | "important_decisions",
    value: string,
  ) => {
    const updatedAt = new Date().toISOString();
    await db.runAsync(
      `UPDATE tickets SET ${field} = ?, updated_at = ? WHERE id = ?`,
      value,
      updatedAt,
      ticket.id,
    );
    setTicket((current) =>
      current ? { ...current, [field]: value, updated_at: updatedAt } : current,
    );
  };
  const updateStatus = async (status: Ticket['status']) => {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE tickets SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?', status, status === 'done' ? now : null, now, ticket.id);
    setTicket({ ...ticket, status, completed_at: status === 'done' ? now : null });
  };
  const confirmDelete = () => {
    Alert.alert(
      "Delete ticket?",
      `This will permanently delete ${ticket.ticket_key} and all its progress, logs, and notes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTicket(db, ticket.id);
            router.back();
          },
        },
      ],
    );
  };
  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>Ticket detail</Text>
        <View style={styles.navActions}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/log-progress",
                params: { ticketId: ticket.id },
              })
            }
            style={styles.iconButton}
          >
            <Ionicons name="create-outline" size={21} color={colors.green} />
          </Pressable>
          <Pressable onPress={confirmDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={colors.red} />
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.ticketHeader}>
          <Text style={styles.key}>{ticket.ticket_key}</Text>
          <Text style={styles.title}>{ticket.title}</Text>
          <Text style={styles.project}>{ticket.project_name}</Text>
          <View style={styles.badges}>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </View>
        </View>
        <Section title="What is this ticket?">
          <Text style={styles.body}>{ticket.description}</Text>
        </Section>
        <Section title="Last session">
          <View style={styles.session}>
            <Text style={styles.sessionKicker}>
              YOU PREVIOUSLY WORKED ON THIS{" "}
              {relativeTime(logs[0]?.created_at).toUpperCase()}
            </Text>
            <Text style={styles.sessionText}>
              {logs[0]?.description ||
                "No work session logged yet. Your next note will appear here."}
            </Text>
            {logs[0]?.what_remains ? (
              <Text style={styles.sessionRemain}>
                Remaining: {logs[0].what_remains}
              </Text>
            ) : null}
          </View>
        </Section>
        <Section title="My context">
          <ContextField
            label="What is this feature?"
            value={myContext}
            onChangeText={setMyContext}
            onBlur={() => saveContext("my_context", myContext)}
          />
          <ContextField
            label="Why am I implementing it?"
            value={whyImplementing}
            onChangeText={setWhyImplementing}
            onBlur={() => saveContext("why_implementing", whyImplementing)}
          />
          <ContextField
            label="How does it work?"
            value={howItWorks}
            onChangeText={setHowItWorks}
            onBlur={() => saveContext("how_it_works", howItWorks)}
          />
          <ContextField
            label="Important decisions"
            value={importantDecisions}
            onChangeText={setImportantDecisions}
            onBlur={() => saveContext("important_decisions", importantDecisions)}
          />
        </Section>
        <Section title="Progress">
          <View style={styles.progress}>
            {progress.map((item) => (
              <View style={styles.progressRow} key={item.id}>
                <Ionicons
                  name={item.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={item.completed ? colors.green : colors.muted}
                />
                <Text style={[styles.progressText, item.completed === 1 ? styles.completed : undefined]}>
                  {item.content}
                </Text>
              </View>
            ))}
          </View>
        </Section>
        <Section title="Next action">
          <View style={styles.nextBox}>
            <Text style={styles.nextKicker}>NEXT ACTION</Text>
            <TextInput
              value={nextAction}
              onChangeText={setNextAction}
              onBlur={saveNext}
              placeholder="What should you do next?"
              placeholderTextColor={colors.muted}
              style={styles.nextInput}
              multiline
            />
          </View>
        </Section>
        <Section title="Work history">
          {logs.length ? (
            logs.map((log) => (
              <View key={log.id} style={styles.log}>
                <View style={styles.logDot} />
                <View style={styles.logMain}>
                  <Text style={styles.logDate}>
                    {relativeTime(log.created_at)} · {titleCase(log.type)}
                  </Text>
                  <Text style={styles.logText}>{log.description}</Text>
                  {log.commit_hash ? (
                    <Text style={styles.commit}>{log.commit_hash}</Text>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              Your work history will appear here as you work.
            </Text>
          )}
        </Section>
        <View style={styles.actions}>
          <Pressable style={styles.logButton} onPress={() => router.push({ pathname: "/log-progress", params: { ticketId: ticket.id } })}>
            <Ionicons name="create-outline" size={18} color="#fff" /><Text style={styles.logButtonText}>Log progress</Text>
          </Pressable>
          {ticket.status !== 'done' ? <Pressable style={styles.secondaryButton} onPress={() => router.push({ pathname: '/switch-work' as any, params: { ticketId: ticket.id } })}><Text style={styles.secondaryText}>Pause / switch</Text></Pressable> : null}
          {ticket.status !== 'done' ? <Pressable style={styles.doneButton} onPress={() => updateStatus('done')}><Ionicons name="checkmark" size={17} color={colors.green} /><Text style={styles.doneText}>Mark done</Text></Pressable> : <Pressable style={styles.secondaryButton} onPress={() => updateStatus('in_progress')}><Text style={styles.secondaryText}>Reopen ticket</Text></Pressable>}
          <Pressable style={styles.deleteButton} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={17} color={colors.red} />
            <Text style={styles.deleteText}>Delete ticket</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function ContextField({
  label,
  value,
  onChangeText,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder="Tap to add your context."
        placeholderTextColor={colors.muted}
        style={styles.fieldInput}
        multiline
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  keyboard: { flex: 1 },
  nav: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    backgroundColor: colors.canvas,
  },
  navTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  navActions: { flexDirection: "row", alignItems: "center" },
  iconButton: { padding: 7 },
  content: { padding: spacing.lg, paddingBottom: 45 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
  ticketHeader: { paddingBottom: 23 },
  key: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    marginTop: 7,
  },
  project: { color: colors.muted, marginTop: 5 },
  badges: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 16,
  },
  section: { marginTop: 12, marginBottom: 12 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 11,
  },
  body: { color: colors.charcoal, lineHeight: 22, fontSize: 14 },
  session: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.md,
    padding: 16,
  },
  sessionKicker: {
    color: "#8BD7B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  sessionText: { color: "#fff", lineHeight: 21, marginTop: 9, fontSize: 14 },
  sessionRemain: { color: "#B6C4C4", fontSize: 12, marginTop: 10 },
  field: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingVertical: 11,
  },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  fieldInput: {
    color: colors.charcoal,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    padding: 0,
  },
  progress: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 15,
  },
  progressRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 13,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  progressText: { color: colors.charcoal, fontSize: 14, flex: 1 },
  completed: { color: colors.muted, textDecorationLine: "line-through" },
  nextBox: {
    backgroundColor: colors.greenSoft,
    borderRadius: radius.md,
    padding: 16,
  },
  nextKicker: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nextInput: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    paddingTop: 8,
  },
  log: { flexDirection: "row", gap: 12, marginBottom: 17 },
  logDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.green,
    marginTop: 5,
  },
  logMain: { flex: 1 },
  logDate: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  logText: { color: colors.charcoal, lineHeight: 20, marginTop: 5 },
  commit: {
    color: colors.violet,
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 5,
  },
  muted: { color: colors.muted, lineHeight: 20 },
  actions: { gap: 10, marginTop: 13 },
  logButton: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logButtonText: { color: "#fff", fontWeight: "800" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, alignItems: 'center', backgroundColor: colors.surface },
  secondaryText: { color: colors.charcoal, fontWeight: '800' },
  doneButton: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.md, padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  doneText: { color: colors.green, fontWeight: '800' },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.redSoft,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    backgroundColor: colors.redSoft,
    marginTop: 4,
  },
  deleteText: { color: colors.red, fontWeight: '800' },
});
