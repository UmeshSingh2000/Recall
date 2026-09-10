import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../constants/theme';
import { EmptyState, Screen, SearchInput, TicketCard } from '../../components/ui';
import type { Ticket } from '../../types';

export default function SearchScreen() { const db = useSQLiteContext(); const router = useRouter(); const [query, setQuery] = useState(''); const [results, setResults] = useState<Ticket[]>([]); useEffect(() => { const search = `%${query.trim()}%`; db.getAllAsync<Ticket>(`SELECT DISTINCT t.*, p.name AS project_name FROM tickets t JOIN projects p ON p.id=t.project_id LEFT JOIN work_logs w ON w.ticket_id=t.id WHERE ? = '%%' OR t.ticket_key LIKE ? OR t.title LIKE ? OR t.description LIKE ? OR t.next_action LIKE ? OR w.description LIKE ? OR w.commit_hash LIKE ? ORDER BY t.updated_at DESC`, search, search, search, search, search, search, search).then(setResults); }, [db, query]); return <Screen title="Search" subtitle="Search your entire work memory"><SearchInput value={query} onChangeText={setQuery} /><Text style={styles.hint}>{query ? `${results.length} results for “${query}”` : 'Search tickets, notes, work logs, files, and commits'}</Text><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>{query && results.length === 0 ? <EmptyState icon="search-outline" title="Nothing matched" body="Try a ticket key, project name, or a detail from a work log." /> : results.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/ticket/${ticket.id}`)} />)}</ScrollView></Screen>; }
const styles = StyleSheet.create({ hint: { color: colors.muted, fontSize: 12, marginBottom: 12 }, list: { paddingBottom: 30 } });
