import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ShimmerBlock from '../../components/ShimmerBlock';
import { useTheme, useThemedStyles } from '../../components/ThemeProvider';
import { radius, spacing, tabBarInset } from '../../constants/theme';
import { EmptyState, Screen, SearchInput, TicketCard } from '../../components/ui';
import { relativeTime, titleCase } from '../../lib/format';
import { fetchSearchResults, type SearchResult } from '../../store/workspaceSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

export default function SearchScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    hint: { color: colors.muted, fontSize: 12, marginBottom: 12 },
    list: { paddingBottom: tabBarInset },
    result: { marginBottom: spacing.sm },
    logsToggle: {
      minHeight: 54,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
    },
    logsToggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    logsToggleIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
    logsToggleText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
    logsToggleMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
    logs: {
      marginTop: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
    },
    logsTitle: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: spacing.xs },
    log: { paddingVertical: spacing.md, paddingLeft: spacing.md, borderLeftColor: colors.greenSoft, borderLeftWidth: 2 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
    logType: { color: colors.green, fontSize: 11, fontWeight: '800' },
    logDate: { color: colors.muted, fontSize: 11 },
    logDescription: { color: colors.charcoal, fontSize: 13, lineHeight: 19, marginTop: 4 },
    logNext: { color: colors.muted, fontSize: 12, marginTop: 5 },
    pressed: { opacity: 0.65 },
    skeletonCard: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: 10,
      gap: 11,
    },
  }));
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const normalizedQuery = query.trim();
  const cachedResults = useAppSelector((state) => state.workspace.searchResults[normalizedQuery]);
  const results = cachedResults ?? [];
  const loading = useAppSelector((state) => state.workspace.searchLoading[normalizedQuery] ?? false);

  const loadResults = useCallback((force = false) => {
    return dispatch(fetchSearchResults({ query: normalizedQuery, force })).unwrap()
      .catch((error) => {
        console.warn("Unable to search workspace:", error);
      });
  }, [dispatch, normalizedQuery]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadResults(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadResults]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (cachedResults && !cachedResults.length) setExpandedTicketIds(new Set());
  }, [cachedResults]);

  return (
    <Screen title="Search" subtitle="Search your entire work memory">
      <SearchInput value={query} onChangeText={setQuery} />
      <Text style={styles.hint}>
        {query ? `${results.length} results for “${query}”` : 'Search tickets, notes, work logs, files, and commits'}
      </Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />}
      >
        {cachedResults === undefined && loading ? (
          ["one", "two", "three"].map((item) => (
            <View key={item} style={styles.skeletonCard}>
              <ShimmerBlock width={78} height={12} borderRadius={5} />
              <ShimmerBlock width="80%" height={18} borderRadius={6} />
              <ShimmerBlock width="52%" height={12} borderRadius={5} />
              <ShimmerBlock width="36%" height={12} borderRadius={5} />
            </View>
          ))
        ) : results.length === 0 ? (
          <EmptyState
            icon={query ? 'search-outline' : 'file-tray-outline'}
            title={query ? 'Nothing matched' : 'No tickets found'}
            body={
              query
                ? 'Try a ticket key, project name, or a detail from a work log.'
                : 'Add a ticket to start remembering your work.'
            }
            action={!query ? 'Add ticket' : undefined}
            onAction={!query ? () => router.push('/new-ticket') : undefined}
          />
        ) : (
          results.map((ticket) => (
            <View key={ticket.id} style={styles.result}>
              <TicketCard ticket={ticket} onPress={() => router.push(`/ticket/${ticket.id}`)} />
              {ticket.logs.length ? <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${expandedTicketIds.has(ticket.id) ? 'Hide' : 'Show'} logs for ${ticket.ticket_key}`}
                  onPress={() => setExpandedTicketIds((current) => {
                    const next = new Set(current);
                    if (next.has(ticket.id)) next.delete(ticket.id);
                    else next.add(ticket.id);
                    return next;
                  })}
                  style={({ pressed }) => [styles.logsToggle, pressed && styles.pressed]}
                >
                  <View style={styles.logsToggleLabel}>
                    <View style={styles.logsToggleIcon}>
                      <Ionicons name="time-outline" size={15} color={colors.green} />
                    </View>
                    <View>
                      <Text style={styles.logsToggleText}>{expandedTicketIds.has(ticket.id) ? 'Hide work history' : 'Show work history'}</Text>
                      <Text style={styles.logsToggleMeta}>{ticket.logs.length} {ticket.logs.length === 1 ? 'entry' : 'entries'}</Text>
                    </View>
                  </View>
                  <Ionicons name={expandedTicketIds.has(ticket.id) ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} />
                </Pressable>
              {expandedTicketIds.has(ticket.id) ? (
                <View style={styles.logs}>
                  <Text style={styles.logsTitle}>Recent activity</Text>
                  {ticket.logs.map((log) => (
                    <Pressable
                      key={log.id}
                      style={({ pressed }) => [styles.log, pressed && styles.pressed]}
                      onPress={() => router.push(`/log/${log.id}`)}
                    >
                      <View style={styles.logHeader}>
                        <View style={styles.logTypeRow}>
                          <View style={styles.logDot} />
                        <Text style={styles.logType}>{titleCase(log.type)}</Text>
                        </View>
                        <Text style={styles.logDate}>{relativeTime(log.created_at)}</Text>
                      </View>
                      <Text style={styles.logDescription} numberOfLines={3}>{log.description}</Text>
                      {log.next_action ? <Text style={styles.logNext} numberOfLines={1}>Next: {log.next_action}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              </> : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
