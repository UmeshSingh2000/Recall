import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TicketDeck } from "../../components/TicketDeck";
import { WorkloadGraph } from "../../components/WorkloadGraph";
import { SectionHeading, TicketCard } from "../../components/ui";
import { colors, radius, spacing, tabBarInset } from "../../constants/theme";
import { greeting, relativeTime } from "../../lib/format";
import type { Ticket } from "../../types";

export default function TabOneScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [deckIndex, setDeckIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadTickets = useCallback(() => {
    db.getAllAsync<Ticket>(
      "SELECT t.*, p.name AS project_name, (SELECT description FROM work_logs WHERE ticket_id=t.id ORDER BY created_at DESC LIMIT 1) AS last_log FROM tickets t JOIN projects p ON p.id=t.project_id ORDER BY t.updated_at DESC",
    ).then(setTickets);
  }, [db]);

  useFocusEffect(useCallback(() => { loadTickets(); }, [loadTickets]));

  const active = tickets.filter((ticket) => ["in_progress", "review", "product_review", "code_review", "testing"].includes(ticket.status)).length;
  const paused = tickets.filter((ticket) => ticket.status === "paused" || ticket.status === "blocked").length;
  const done = tickets.filter((ticket) => ticket.status === "done" || ticket.status === "live").length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "done" && ticket.status !== "live");
  const current = openTickets[deckIndex];

  useEffect(() => {
    if (deckIndex >= openTickets.length && openTickets.length > 0) setDeckIndex(openTickets.length - 1);
  }, [deckIndex, openTickets.length]);

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <View>
            <Text style={styles.eyebrow}>{dateLabel}</Text>
            <Text style={styles.heading}>{greeting(now)}</Text>
            <Text style={styles.subheading}>Let’s pick up where you left off.</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>U</Text></View>
        </View>
        <View style={styles.stats}>
          {[["Active", active, colors.green], ["Paused", paused, colors.orange], ["Done today", done, colors.blue]].map(([label, count, tone]) => (
            <View style={styles.stat} key={label as string}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={[styles.statValue, { color: tone as string }]}>{count}</Text>
            </View>
          ))}
        </View>
        <WorkloadGraph active={active} paused={paused} done={done} />
        {openTickets.length ? <>
          <SectionHeading title="Currently working on" action={`${openTickets.length} open`} />
          <TicketDeck tickets={openTickets} deckIndex={deckIndex} onDeckIndexChange={setDeckIndex} />
        </> : null}
        <SectionHeading title="Active tickets" action={`${active} total`} />
        <FlatList
          data={openTickets.slice(0, 4)}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TicketCard ticket={item} onPress={() => router.push(`/ticket/${item.id}`)} />}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>You’re all caught up.</Text>}
        />
        <SectionHeading title="Recently worked on" action="History" />
        <FlatList
          data={tickets.filter((ticket) => ["done", "live", "review", "product_review", "code_review"].includes(ticket.status)).slice(0, 2)}
          keyExtractor={(item) => `recent-${item.id}`}
          renderItem={({ item }) => <Pressable style={styles.recent} onPress={() => router.push(`/ticket/${item.id}`)}><View style={styles.recentMain}><Text style={styles.recentKey}>{item.ticket_key}</Text><Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text></View><Text style={styles.recentTime}>{relativeTime(item.updated_at)}</Text></Pressable>}
          scrollEnabled={false}
        />
        <View style={styles.quickRow}>
          <Pressable style={styles.quick} onPress={() => router.push("/new-ticket")}><Ionicons name="add" size={20} color={colors.green} /><Text style={styles.quickText}>Add ticket</Text></Pressable>
          <Pressable style={styles.quick} onPress={() => current && router.push({ pathname: "/log-progress", params: { ticketId: current.id } })}><Ionicons name="create-outline" size={20} color={colors.green} /><Text style={styles.quickText}>Log progress</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: tabBarInset },
  greeting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginBottom: 20 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  heading: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 5 },
  subheading: { color: colors.muted, fontSize: 14, marginTop: 4 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.charcoal, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 22 },
  stat: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, flex: 1, padding: 13 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  statValue: { fontSize: 25, fontWeight: "800", marginTop: 6 },
  muted: { color: colors.muted, paddingBottom: 20 },
  recent: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, padding: 14, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  recentMain: { flex: 1, minWidth: 0 },
  recentKey: { color: colors.green, fontSize: 11, fontWeight: "800" },
  recentTitle: { color: colors.ink, fontWeight: "700", marginTop: 4 },
  recentTime: { color: colors.muted, fontSize: 12, flexShrink: 0, marginLeft: spacing.md },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  quick: { backgroundColor: colors.greenSoft, flex: 1, borderRadius: radius.md, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  quickText: { color: colors.green, fontWeight: "800", fontSize: 13 },
});
