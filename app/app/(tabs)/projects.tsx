import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { EmptyState, Screen } from '../../components/ui';
import type { Project } from '../../types';

export default function ProjectsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(() => {
    db.getAllAsync<Project>(`SELECT p.*, SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) AS active_count, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_count FROM projects p LEFT JOIN tickets t ON t.project_id=p.id GROUP BY p.id ORDER BY p.name`).then(setProjects);
  }, [db]);
  useFocusEffect(loadProjects);

  return <Screen title="Projects" subtitle="Your engineering landscape" right={<Pressable onPress={() => router.push('/new-project')}><Text style={styles.add}>Add project</Text></Pressable>}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>{projects.length ? projects.map((project) => <Pressable key={project.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]} onPress={() => router.push(`/tickets?projectId=${project.id}`)}><View style={styles.icon}><Text style={styles.iconText}>{project.name.slice(0, 1)}</Text></View><View style={styles.main}><Text style={styles.name}>{project.name}</Text><Text style={styles.description} numberOfLines={2}>{project.description}</Text><View style={styles.meta}><Text style={styles.active}>{project.active_count || 0} active</Text><Text style={styles.dot}>·</Text><Text style={styles.completed}>{project.completed_count || 0} completed</Text></View></View><Text style={styles.arrow}>›</Text></Pressable>) : <EmptyState icon="layers-outline" title="No projects yet" body="Create your first project to give your tickets a home." action="Add project" onAction={() => router.push('/new-project')} />}</ScrollView></Screen>;
}

const styles = StyleSheet.create({
  add: { color: colors.green, fontWeight: '800', fontSize: 13 },
  list: { paddingBottom: 30 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.green, fontSize: 18, fontWeight: '800' },
  main: { flex: 1, marginLeft: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 7 },
  active: { color: colors.green, fontSize: 12, fontWeight: '800' },
  completed: { color: colors.muted, fontSize: 12 },
  dot: { color: colors.line },
  arrow: { color: colors.muted, fontSize: 26, lineHeight: 28 },
});
