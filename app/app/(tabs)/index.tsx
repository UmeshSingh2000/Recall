import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, tabBarInset } from "../../constants/theme";
import { TicketCard, SectionHeading, StatusBadge } from "../../components/ui";
import { greeting, relativeTime } from "../../lib/format";
import type { Ticket } from "../../types";

export default function TabOneScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const loadTickets = useCallback(() => {
    db.getAllAsync<Ticket>(
      `SELECT t.*, p.name AS project_name, (SELECT description FROM work_logs WHERE ticket_id=t.id ORDER BY created_at DESC LIMIT 1) AS last_log FROM tickets t JOIN projects p ON p.id=t.project_id ORDER BY t.updated_at DESC`,
    ).then(setTickets);
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets]),
  );
  const active = tickets.filter(
    (ticket) => ticket.status === "in_progress" || ticket.status === "review",
  ).length;
  const paused = tickets.filter(
    (ticket) => ticket.status === "paused" || ticket.status === "blocked",
  ).length;
  const done = tickets.filter((ticket) => ticket.status === "done").length;
  const current =
    tickets.find((ticket) => ticket.status === "in_progress") || tickets[0];
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greeting}>
        <View>
          <Text style={styles.eyebrow}>THURSDAY, SEP 10</Text>
          <Text style={styles.heading}>{greeting()}</Text>
          <Text style={styles.subheading}>
            Let’s pick up where you left off.
          </Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      </View>
      <View style={styles.stats}>
        {[
          ["Active", active, colors.green],
          ["Paused", paused, colors.orange],
          ["Done today", done, colors.blue],
        ].map(([label, count, tone]) => (
          <View style={styles.stat} key={label as string}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color: tone as string }]}>
              {count}
            </Text>
          </View>
        ))}
      </View>
      {current ? (
        <>
          <SectionHeading title="Currently working on" action="View all" />
          <Pressable
            onPress={() => router.push(`/ticket/${current.id}`)}
            style={styles.currentCard}
          >
            <View style={styles.currentAccent} />
            <View style={styles.currentMain}>
              <View style={styles.currentTop}>
                <Text style={styles.currentKey}>{current.ticket_key}</Text>
                <StatusBadge status={current.status} />
              </View>
              <Text style={styles.currentTitle}>{current.title}</Text>
              <Text style={styles.currentProject}>{current.project_name}</Text>
              <View style={styles.lastSession}>
                <Ionicons name="time-outline" size={15} color={colors.muted} />
                <Text style={styles.lastSessionText}>
                  Last worked {relativeTime(current.updated_at)}
                </Text>
              </View>
              <View style={styles.nextAction}>
                <Text style={styles.nextLabel}>NEXT</Text>
                <Text style={styles.nextValue} numberOfLines={2}>
                  {current.next_action}
                </Text>
              </View>
              <View style={styles.continue}>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.continueText}>Continue working</Text>
              </View>
            </View>
          </Pressable>
        </>
      ) : null}
      <SectionHeading title="Active tickets" action={`${active} total`} />
      <FlatList
        data={tickets.filter((ticket) => ticket.status !== "done").slice(0, 4)}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => router.push(`/ticket/${item.id}`)}
          />
        )}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.muted}>You’re all caught up.</Text>
        }
      />
      <SectionHeading title="Recently worked on" action="History" />
      <FlatList
        data={tickets
          .filter(
            (ticket) => ticket.status === "done" || ticket.status === "review",
          )
          .slice(0, 2)}
        keyExtractor={(item) => `recent-${item.id}`}
        renderItem={({ item }) => (
          <Pressable
            style={styles.recent}
            onPress={() => router.push(`/ticket/${item.id}`)}
          >
            <View>
              <Text style={styles.recentKey}>{item.ticket_key}</Text>
              <Text style={styles.recentTitle}>{item.title}</Text>
            </View>
            <Text style={styles.recentTime}>
              {relativeTime(item.updated_at)}
            </Text>
          </Pressable>
        )}
        scrollEnabled={false}
      />
      <View style={styles.quickRow}>
        <Pressable style={styles.quick} onPress={() => router.push("/new-ticket")}>
          <Ionicons name="add" size={20} color={colors.green} />
          <Text style={styles.quickText}>Add ticket</Text>
        </Pressable>
        <Pressable
          style={styles.quick}
          onPress={() =>
            current &&
            router.push({
              pathname: "/log-progress",
              params: { ticketId: current.id },
            })
          }
        >
          <Ionicons name="create-outline" size={20} color={colors.green} />
          <Text style={styles.quickText}>Log progress</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: tabBarInset },
  greeting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 20,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heading: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 5 },
  subheading: { color: colors.muted, fontSize: 14, marginTop: 4 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.charcoal,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 22 },
  stat: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    flex: 1,
    padding: 13,
  },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  statValue: { fontSize: 25, fontWeight: "800", marginTop: 6 },
  currentCard: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 20,
  },
  currentAccent: { height: 4, backgroundColor: colors.green },
  currentMain: { padding: 18 },
  currentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentKey: {
    color: "#9BE3C6",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  currentTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 11,
  },
  currentProject: { color: "#AAB9BE", fontSize: 13, marginTop: 4 },
  lastSession: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 17,
  },
  lastSessionText: { color: "#AAB9BE", fontSize: 12 },
  nextAction: {
    borderTopColor: "#405059",
    borderTopWidth: 1,
    marginTop: 17,
    paddingTop: 13,
  },
  nextLabel: {
    color: "#88D9B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nextValue: { color: "#fff", fontSize: 13, fontWeight: "600", marginTop: 5 },
  continue: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    marginTop: 18,
  },
  continueText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  muted: { color: colors.muted, paddingBottom: 20 },
  recent: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    padding: 14,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  recentKey: { color: colors.green, fontSize: 11, fontWeight: "800" },
  recentTitle: { color: colors.ink, fontWeight: "700", marginTop: 4 },
  recentTime: { color: colors.muted, fontSize: 12 },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  quick: {
    backgroundColor: colors.greenSoft,
    flex: 1,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickText: { color: colors.green, fontWeight: "800", fontSize: 13 },
});
