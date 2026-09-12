import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../constants/theme";
import { relativeTime, titleCase } from "../../lib/format";
import type { WorkLog } from "../../types";

type LogDetail = WorkLog & {
  ticket_key: string;
  ticket_title: string;
  project_name: string;
};

export default function LogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [log, setLog] = useState<LogDetail | null>(null);

  useEffect(() => {
    db.getFirstAsync<LogDetail>(
      `SELECT w.*, t.ticket_key, t.title AS ticket_title, p.name AS project_name
       FROM work_logs w
       JOIN tickets t ON t.id = w.ticket_id
       JOIN projects p ON p.id = t.project_id
       WHERE w.id = ?`,
      Number(id),
    ).then(setLog);
  }, [db, id]);

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
        <View style={styles.navSpacer} />
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
      </ScrollView>
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
  date: { color: colors.muted, fontSize: 12 },
  section: { marginTop: 12, marginBottom: 13 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginBottom: 10 },
  body: { color: colors.charcoal, fontSize: 15, lineHeight: 23 },
  nextBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: 15 },
  nextText: { color: colors.charcoal, flex: 1, fontSize: 14, lineHeight: 21 },
  commit: { color: colors.violet, fontFamily: "monospace", fontSize: 14 },
});
