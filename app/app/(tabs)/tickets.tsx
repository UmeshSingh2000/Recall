import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, tabBarInset } from "../../constants/theme";
import {
  EmptyState,
  Screen,
  SearchInput,
  TicketCard,
} from "../../components/ui";
import type { Ticket, TicketStatus } from "../../types";

const filters: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "In progress", value: "in_progress" },
  { label: "Paused", value: "paused" },
  { label: "Blocked", value: "blocked" },
  { label: "Review", value: "review" },
  { label: "Done", value: "done" },
];
export default function TicketsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const loadTickets = useCallback(() => {
    db.getAllAsync<Ticket>(
      "SELECT t.*, p.name AS project_name FROM tickets t JOIN projects p ON p.id=t.project_id ORDER BY t.updated_at DESC",
    ).then(setTickets);
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets]),
  );
  const shown = tickets.filter(
    (ticket) =>
      (filter === "all" || ticket.status === filter) &&
      `${ticket.ticket_key} ${ticket.title} ${ticket.project_name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Screen
      title="Tickets"
      subtitle={`${shown.length} tickets in your workspace`}
      right={<Pressable accessibilityRole="button" accessibilityLabel="Add ticket" style={styles.addButton} onPress={() => router.push("/new-ticket")}><Ionicons name="add" size={20} color="#fff" /></Pressable>}
    >
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search tickets..."
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
      >
        {filters.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setFilter(item.value)}
            style={[styles.chip, filter === item.value && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filter === item.value && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sort}>
        <Text style={styles.sortLabel}>Recently updated</Text>
        <Text style={styles.sortIcon}>↕</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {shown.length ? (
          shown.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onPress={() => router.push(`/ticket/${ticket.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon="file-tray-outline"
            title="No tickets found"
            body="Try another filter or add a ticket to start remembering your work."
            action="Add ticket"
              onAction={() => router.push("/new-ticket")}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  addButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  filters: { flexGrow: 0, marginBottom: 12 },
  chip: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 7,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  sort: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  sortLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  sortIcon: { color: colors.green, fontSize: 16 },
  list: { paddingBottom: tabBarInset },
});
