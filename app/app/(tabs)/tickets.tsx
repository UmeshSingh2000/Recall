import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  Pressable,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../../components/ThemeProvider";
import ShimmerBlock from "../../components/ShimmerBlock";
import { radius, tabBarInset } from "../../constants/theme";
import {
  EmptyState,
  Screen,
  SearchInput,
  TicketCard,
} from "../../components/ui";
import type { Ticket, TicketStatus } from "../../types";
import { listTickets } from "../../lib/workspace";

function TicketListSkeleton() {
  const styles = useThemedStyles((colors) => ({
    list: { paddingBottom: tabBarInset },
    search: { flexDirection: "row", gap: 8, marginBottom: 16 },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 16,
      marginBottom: 10,
      gap: 11,
    },
  }));

  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      <View style={styles.search}>
        <ShimmerBlock width="100%" height={48} borderRadius={radius.md} />
      </View>
      <ShimmerBlock width={125} height={13} borderRadius={5} />
      {["one", "two", "three", "four"].map((item) => (
        <View key={item} style={styles.card}>
          <ShimmerBlock width={75} height={12} borderRadius={5} />
          <ShimmerBlock width="78%" height={18} borderRadius={6} />
          <ShimmerBlock width="48%" height={12} borderRadius={5} />
          <ShimmerBlock width="35%" height={12} borderRadius={5} />
        </View>
      ))}
    </ScrollView>
  );
}

const filters: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "In progress", value: "in_progress" },
  { label: "Paused", value: "paused" },
  { label: "Blocked", value: "blocked" },
  { label: "Review", value: "review" },
  { label: "Product review", value: "product_review" },
  { label: "Code review", value: "code_review" },
  { label: "Testing", value: "testing" },
  { label: "Live", value: "live" },
  { label: "Done", value: "done" },
];

export default function TicketsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    addButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.green,
      alignItems: "center",
      justifyContent: "center",
    },
    searchRow: {
      position: "relative",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      zIndex: 10,
    },
    searchField: { flex: 1, minWidth: 0 },
    filterButton: {
      width: 48,
      height: 48,
      marginBottom: 16,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
    },
    filterButtonActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
    filterMenu: {
      position: "absolute",
      top: 54,
      right: 0,
      width: 210,
      padding: 6,
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      shadowColor: colors.ink,
      shadowOpacity: 0.14,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 8,
    },
    menuItem: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    menuItemActive: { backgroundColor: colors.charcoal },
    menuText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
    menuTextActive: { color: "#fff" },
    sort: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 12,
    },
    sortLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    sortIcon: { color: colors.green, fontSize: 16 },
    list: { paddingBottom: tabBarInset },
  }));
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState(2);
  const loadingMoreRef = useRef(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listTickets(1);
      setTickets(result.tickets);
      setHasNextPage(result.pagination.hasNextPage);
      setNextPage(2);
    } catch (error) {
      console.warn("Unable to load tickets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreTickets = useCallback(async () => {
    if (loading || loadingMoreRef.current || !hasNextPage) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await listTickets(nextPage);
      setTickets((current) => {
        const existingIds = new Set(current.map((ticket) => ticket.id));
        const newTickets = result.tickets.filter((ticket) => !existingIds.has(ticket.id));
        return [...current, ...newTickets];
      });
      setHasNextPage(result.pagination.hasNextPage);
      setNextPage((page) => page + 1);
    } catch (error) {
      console.warn("Unable to load more tickets:", error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasNextPage, loading, nextPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTickets();
    } finally {
      setRefreshing(false);
    }
  }, [loadTickets]);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets]),
  );

  if (loading && tickets.length === 0) {
    return (
      <Screen title="Tickets" subtitle="Your workspace">
        <TicketListSkeleton />
      </Screen>
    );
  }

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
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add ticket"
          style={styles.addButton}
          onPress={() => router.push("/new-ticket")}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      }
    >
      <FlatList
        data={shown}
        keyExtractor={(ticket) => String(ticket.id)}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />
        }
        onEndReached={loadMoreTickets}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <View style={styles.searchRow}>
              <SearchInput value={search} onChangeText={setSearch} placeholder="Search tickets..." style={styles.searchField} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter tickets"
                onPress={() => setFilterMenuOpen((open) => !open)}
                style={[styles.filterButton, filter !== "all" && styles.filterButtonActive]}
              >
                <Ionicons name="options-outline" size={20} color={filter !== "all" ? "#fff" : colors.ink} />
              </Pressable>
              {filterMenuOpen ? (
                <View style={styles.filterMenu}>
                  {filters.map((item) => (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setFilter(item.value);
                        setFilterMenuOpen(false);
                      }}
                      style={[styles.menuItem, filter === item.value && styles.menuItemActive]}
                    >
                      <Text style={[styles.menuText, filter === item.value && styles.menuTextActive]}>{item.label}</Text>
                      {filter === item.value ? <Ionicons name="checkmark" size={17} color="#fff" /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.sort}>
              <Text style={styles.sortLabel}>Recently updated</Text>
              <Text style={styles.sortIcon}>↕</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TicketCard ticket={item} onPress={() => router.push(`/ticket/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="file-tray-outline"
            title="No tickets found"
            body="Try another filter or add a ticket to start remembering your work."
            action="Add ticket"
            onAction={() => router.push("/new-ticket")}
          />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.green} style={{ paddingVertical: 16 }} /> : null
        }
      />
    </Screen>
  );
}
