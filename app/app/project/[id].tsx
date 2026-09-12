import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmDialog, TicketCard } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { deleteProject } from '../../lib/database';
import type { Project, Ticket } from '../../types';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', Number(id)).then(setProject);
    db.getAllAsync<Ticket>(
      'SELECT t.*, p.name AS project_name FROM tickets t JOIN projects p ON p.id = t.project_id WHERE t.project_id = ? ORDER BY t.updated_at DESC',
      Number(id),
    ).then(setTickets);
  }, [db, id]);

  const confirmDelete = () => {
    if (!project) return;
    setDeleteDialogVisible(true);
  };
  const ticketCount = tickets.length;
  const handleDelete = async () => {
    if (!project) return;
    setDeleteDialogVisible(false);
    await deleteProject(db, project.id);
    router.back();
  };

  if (!project) {
    return (
      <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
        <Text style={s.loading}>Loading project…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <View style={s.nav}>
        <Pressable onPress={() => router.back()} style={s.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={s.navTitle}>Project</Text>
        <Pressable onPress={confirmDelete} style={s.iconButton}>
          <Ionicons name="trash-outline" size={20} color={colors.red} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.name}>{project.name}</Text>
        <Text style={s.description}>{project.description || 'No description yet.'}</Text>
        {project.repository_url ? <Text style={s.repo}>{project.repository_url}</Text> : null}
        <View style={s.counts}>
          <Text style={s.count}>{tickets.filter((x) => x.status === 'in_progress').length} active</Text>
          <Text style={s.count}>{tickets.filter((x) => x.status === 'paused' || x.status === 'blocked').length} paused</Text>
          <Text style={s.count}>{tickets.filter((x) => x.status === 'done').length} done</Text>
        </View>
        <Text style={s.heading}>Tickets</Text>
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/ticket/${ticket.id}`)} />
        ))}
        <Pressable style={s.deleteButton} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={17} color={colors.red} />
          <Text style={s.deleteText}>Delete project</Text>
        </Pressable>
      </ScrollView>
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete project?"
        message={tickets.length
          ? `This will permanently delete "${project.name}" and all ${ticketCount} ticket${ticketCount === 1 ? '' : 's'} in it.`
          : `This will permanently delete "${project.name}".`}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  loading: { margin: 'auto', color: colors.muted },
  nav: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  iconButton: { padding: 7 },
  navTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  name: { fontSize: 29, fontWeight: '800', color: colors.ink },
  description: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  repo: { color: colors.green, fontSize: 13, marginTop: 12 },
  counts: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 25 },
  count: {
    backgroundColor: colors.greenSoft,
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  heading: { color: colors.ink, fontWeight: '800', fontSize: 18, marginBottom: 12 },
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
    marginTop: 18,
  },
  deleteText: { color: colors.red, fontWeight: '800' },
});
