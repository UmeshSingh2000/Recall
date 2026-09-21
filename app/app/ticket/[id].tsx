import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import { MarkdownContent } from "../../components/MarkdownContent";
import { ConfirmDialog, PriorityBadge, StatusBadge } from "../../components/ui";
import { colors, radius, spacing } from "../../constants/theme";
import { generateTicketSummary } from "../../lib/api";
import { deleteTicket } from "../../lib/database";
import { subscribeToGitCommitLogs } from "../../lib/gitCommitEvents";
import { relativeTime, titleCase } from "../../lib/format";
import type {
  ProgressItem,
  Project,
  Ticket,
  TicketFile,
  TicketNote,
  WorkLog,
  WorkSession,
  TicketStatus,
} from "../../types";

const statusOptions: { label: string; value: TicketStatus }[] = [
  { label: "In progress", value: "in_progress" },
  { label: "Product review", value: "product_review" },
  { label: "Code review", value: "code_review" },
  { label: "Testing", value: "testing" },
  { label: "Live", value: "live" },
  { label: "Done", value: "done" },
  { label: "Paused", value: "paused" },
  { label: "Blocked", value: "blocked" },
];

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
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const loadTicket = () => {
    const ticketId = Number(id);
    return Promise.all([
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
  };
  useEffect(() => {
    loadTicket();
  }, [db, id]);
  useEffect(() => {
    const ticketId = Number(id);
    return subscribeToGitCommitLogs((updatedTicketId) => {
      if (updatedTicketId === ticketId) loadTicket();
    });
  }, [id]);
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
    const completed = status === 'done' || status === 'live';
    await db.runAsync('UPDATE tickets SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?', status, completed ? now : null, now, ticket.id);
    setTicket({ ...ticket, status, completed_at: completed ? now : null });
  };
  const confirmDelete = () => {
    setDeleteDialogVisible(true);
  };
  const handleDelete = async () => {
    setDeleteDialogVisible(false);
    await deleteTicket(db, ticket.id);
    router.back();
  };
  const handleSummarize = async () => {
    if (summarizing) return;

    setSummarizing(true);
    setSummaryError("");

    try {
      const ticketId = ticket.id;
      const projectId = (ticket as Ticket & { project_id: number }).project_id;
      const [project, ticketFiles, ticketNotes, workSessions] = await Promise.all([
        db.getFirstAsync<Pick<Project, "name" | "description" | "repository_url">>(
          "SELECT name, description, repository_url FROM projects WHERE id = ?",
          projectId,
        ),
        db.getAllAsync<TicketFile>(
          "SELECT * FROM ticket_files WHERE ticket_id = ? ORDER BY created_at DESC",
          ticketId,
        ),
        db.getAllAsync<TicketNote>(
          "SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY updated_at DESC",
          ticketId,
        ),
        db.getAllAsync<WorkSession>(
          "SELECT * FROM work_sessions WHERE ticket_id = ? ORDER BY started_at DESC",
          ticketId,
        ),
      ]);

      const generatedSummary = await generateTicketSummary({
        ticket: {
          ...ticket,
          next_action: nextAction,
          my_context: myContext,
          why_implementing: whyImplementing,
          how_it_works: howItWorks,
          important_decisions: importantDecisions,
        },
        project,
        progress_items: progress,
        work_logs: logs,
        ticket_files: ticketFiles,
        ticket_notes: ticketNotes,
        work_sessions: workSessions,
      });

      setSummary(generatedSummary);
    } catch (error) {
      setSummary("");
      setSummaryError(
        error instanceof Error ? error.message : "Could not generate a summary.",
      );
    } finally {
      setSummarizing(false);
    }
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
                pathname: "/edit-ticket",
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
        <Section title="Update status">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusOptions}>
            {statusOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => updateStatus(option.value)}
                style={[styles.statusOption, ticket.status === option.value && styles.statusOptionSelected]}
              >
                <Text style={[styles.statusOptionText, ticket.status === option.value && styles.statusOptionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Section>
        <Pressable
          style={[styles.summarizeButton, summarizing && styles.summarizeButtonDisabled]}
          onPress={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="sparkles-outline" size={18} color="#fff" />
          )}
          <Text style={styles.summarizeButtonText}>
            {summarizing ? "Summarizing..." : "Summarize ticket"}
          </Text>
        </Pressable>
        {summaryError ? <Text style={styles.summaryError}>{summaryError}</Text> : null}
        {summary ? (
          <Section title="AI summary">
            <View style={styles.summaryBox}>
              <MarkdownContent content={summary} />
            </View>
          </Section>
        ) : null}
        <Section title="What is this ticket?">
          <Text style={styles.body}>{ticket.description}</Text>
        </Section>
        <Section title="Last session">
          <Pressable
            disabled={!logs[0]}
            onPress={() => logs[0] && router.push(`/log/${logs[0].id}`)}
            style={({ pressed }) => [styles.session, pressed && styles.sessionPressed]}
          >
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
          </Pressable>
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
              <Pressable
                key={log.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${titleCase(log.type)} work log`}
                onPress={() => router.push(`/log/${log.id}`)}
                style={({ pressed }) => [styles.log, pressed && styles.logPressed]}
              >
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
              </Pressable>
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
          {!['done', 'live'].includes(ticket.status) ? <Pressable style={styles.secondaryButton} onPress={() => router.push({ pathname: '/switch-work' as any, params: { ticketId: ticket.id } })}><Text style={styles.secondaryText}>Pause / switch</Text></Pressable> : null}
          {!['done', 'live'].includes(ticket.status) ? <Pressable style={styles.doneButton} onPress={() => updateStatus('done')}><Ionicons name="checkmark" size={17} color={colors.green} /><Text style={styles.doneText}>Mark done</Text></Pressable> : <Pressable style={styles.secondaryButton} onPress={() => updateStatus('in_progress')}><Text style={styles.secondaryText}>Reopen ticket</Text></Pressable>}
          <Pressable style={styles.deleteButton} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={17} color={colors.red} />
            <Text style={styles.deleteText}>Delete ticket</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete ticket?"
        message={`This will permanently delete ${ticket.ticket_key} and all its progress, logs, and notes.`}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDelete}
      />
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
  statusOptions: { gap: 8, paddingBottom: 2 },
  statusOption: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statusOptionSelected: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  statusOptionText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  statusOptionTextSelected: { color: "#fff" },
  summarizeButton: {
    backgroundColor: colors.violet,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  summarizeButtonDisabled: { opacity: 0.75 },
  summarizeButtonText: { color: "#fff", fontWeight: "800" },
  summaryBox: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.md,
    padding: 16,
  },
  summaryError: { color: colors.red, fontSize: 13, lineHeight: 19, marginBottom: 8 },
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
  sessionPressed: { opacity: 0.86 },
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
  logPressed: { opacity: 0.7 },
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
