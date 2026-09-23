import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MarkdownContent } from "../../components/MarkdownContent";
import { ConfirmDialog } from "../../components/ui";
import { colors, radius, spacing } from "../../constants/theme";
import { generateLogSummary } from "../../lib/api";
import { deleteWorkLog } from "../../lib/database";
import { relativeTime, titleCase } from "../../lib/format";
import type { TicketFile, TicketStatus, WorkLog } from "../../types";

type LogDetail = WorkLog & {
  ticket_key: string;
  ticket_title: string;
  ticket_description: string;
  ticket_status: TicketStatus;
  ticket_next_action: string;
  project_name: string;
  project_description: string;
  repository_url: string;
};

export default function LogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [log, setLog] = useState<LogDetail | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [files, setFiles] = useState<TicketFile[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const nextLog = await db.getFirstAsync<LogDetail>(
        `SELECT w.*, t.ticket_key, t.title AS ticket_title, t.description AS ticket_description,
         t.status AS ticket_status, t.next_action AS ticket_next_action,
         p.name AS project_name, p.description AS project_description, p.repository_url
         FROM work_logs w
         JOIN tickets t ON t.id = w.ticket_id
         JOIN projects p ON p.id = t.project_id
         WHERE w.id = ?`,
        Number(id),
      );

      if (cancelled) return;
      setLog(nextLog);

      if (!nextLog) {
        setFiles([]);
        return;
      }

      const nextFiles = await db.getAllAsync<TicketFile>(
        "SELECT * FROM ticket_files WHERE ticket_id = ? AND created_at = ? ORDER BY id",
        nextLog.ticket_id,
        nextLog.created_at,
      );
      if (!cancelled) setFiles(nextFiles);
    })();

    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const handleSummarize = async () => {
    if (!log || summarizing) return;
    setSummarizing(true);
    setSummaryError("");
    try {
      const generatedSummary = await generateLogSummary({
        log,
        ticket: {
          ticket_key: log.ticket_key,
          title: log.ticket_title,
          description: log.ticket_description,
          status: log.ticket_status,
          next_action: log.ticket_next_action,
        },
        project: {
          name: log.project_name,
          description: log.project_description,
          repository_url: log.repository_url,
        },
      });
      setSummary(generatedSummary);
    } catch (error) {
      setSummary("");
      setSummaryError(error instanceof Error ? error.message : "Could not generate a summary.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleDelete = async () => {
    if (!log) return;
    setDeleteDialogVisible(false);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "DELETE FROM ticket_files WHERE ticket_id = ? AND created_at = ?",
        log.ticket_id,
        log.created_at,
      );
      await deleteWorkLog(db, log.id);
    });
    router.back();
  };

  if (!log) {
    return (
      <SafeAreaView style={styles.loading} edges={["top", "left", "right"]}>
        <Text style={styles.loadingText}>Loading log...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>Log detail</Text>
        <Pressable
          onPress={() => setDeleteDialogVisible(true)}
          style={styles.iconButton}
          accessibilityLabel="Delete work log"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.ticketLink}>
          <Text style={styles.ticketKey}>{log.ticket_key}</Text>
          <Text style={styles.ticketTitle}>{log.ticket_title}</Text>
          <Text style={styles.project}>{log.project_name}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{titleCase(log.type)}</Text>
          </View>
          <Text style={styles.date}>{relativeTime(log.created_at)}</Text>
        </View>
        <Pressable
          style={[styles.summarizeButton, summarizing && styles.summarizeButtonDisabled]}
          onPress={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? <ActivityIndicator color="#fff" /> : <Ionicons name="sparkles-outline" size={18} color="#fff" />}
          <Text style={styles.summarizeButtonText}>{summarizing ? "Summarizing..." : "Summarize log"}</Text>
        </Pressable>
        {summaryError ? <Text style={styles.summaryError}>{summaryError}</Text> : null}
        {summary ? <DetailSection title="AI summary"><View style={styles.summaryBox}><MarkdownContent content={summary} /></View></DetailSection> : null}
        <DetailSection title="What happened">
          <Text style={styles.body}>{log.description}</Text>
        </DetailSection>
        {log.what_remains ? (
          <DetailSection title="What remains">
            <Text style={styles.body}>{log.what_remains}</Text>
          </DetailSection>
        ) : null}
        {log.next_action ? (
          <DetailSection title="Next action">
            <View style={styles.nextBox}>
              <Ionicons name="arrow-forward-circle-outline" size={19} color={colors.green} />
              <Text style={styles.nextText}>{log.next_action}</Text>
            </View>
          </DetailSection>
        ) : null}
        {log.commit_hash ? (
          <DetailSection title="Commit">
            <Text style={styles.commit}>{log.commit_hash}</Text>
          </DetailSection>
        ) : null}
        {files.length ? (
          <DetailSection title="Files changed">
            {files.map((file) => (
              <Text key={file.id} style={styles.filePath}>
                {file.file_path}
              </Text>
            ))}
          </DetailSection>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete work log?"
        message="This work log will be permanently deleted."
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  loadingText: { color: colors.muted },
  nav: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomColor: colors.line, borderBottomWidth: 1 },
  navTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  iconButton: { padding: 7 },
  navSpacer: { width: 36 },
  content: { padding: spacing.lg, paddingBottom: 45 },
  ticketLink: { paddingBottom: 22 },
  ticketKey: { color: colors.green, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  ticketTitle: { color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: "800", marginTop: 7 },
  project: { color: colors.muted, marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 24 },
  typeBadge: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  typeText: { color: colors.green, fontSize: 12, fontWeight: "800" },
  summarizeButton: { backgroundColor: colors.violet, borderRadius: radius.md, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 },
  summarizeButtonDisabled: { opacity: 0.75 },
  summarizeButtonText: { color: "#fff", fontWeight: "800" },
  summaryError: { color: colors.red, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  summaryBox: { backgroundColor: colors.violetSoft, borderRadius: radius.md, padding: 16 },
  date: { color: colors.muted, fontSize: 12 },
  section: { marginTop: 12, marginBottom: 13 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginBottom: 10 },
  body: { color: colors.charcoal, fontSize: 15, lineHeight: 23 },
  nextBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: 15 },
  nextText: { color: colors.charcoal, flex: 1, fontSize: 14, lineHeight: 21 },
  commit: { color: colors.violet, fontFamily: "monospace", fontSize: 14 },
  filePath: {
    color: colors.charcoal,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 4,
  },
});
