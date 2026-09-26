import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModalScreenStyles } from '../components/modalScreenStyles';
import { useTheme } from '../components/ThemeProvider';
import type { Project } from '../types';

export default function NewTicketScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useModalScreenStyles();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number>();
  const [ticketKey, setTicketKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.getAllAsync<Project>('SELECT * FROM projects ORDER BY name').then((items) => {
      setProjects(items);
      setProjectId(items[0]?.id);
    });
  }, [db]);

  const save = async () => {
    if (!projectId || !ticketKey.trim() || !title.trim() || saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO tickets (project_id, ticket_key, title, description, status, priority, next_action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      projectId,
      ticketKey.trim().toUpperCase(),
      title.trim(),
      description.trim(),
      'in_progress',
      'medium',
      nextAction.trim(),
      now,
      now,
    );
    router.replace(`/ticket/${result.lastInsertRowId}`);
  };

  const valid = Boolean(projectId && ticketKey.trim() && title.trim());

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.navTitle}>New ticket</Text>
          <View style={{ width: 52 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>Capture just enough to make this ticket easy to pick up later.</Text>
          <Text style={styles.label}>Ticket ID</Text>
          <TextInput value={ticketKey} onChangeText={setTicketKey} placeholder="e.g. AUTH-123" autoCapitalize="characters" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="What are you building?" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projects}>
            {projects.map((project) => (
              <Pressable key={project.id} onPress={() => setProjectId(project.id)} style={[styles.project, projectId === project.id && styles.projectSelected]}>
                <Text style={[styles.projectText, projectId === project.id && styles.projectTextSelected]}>{project.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.label}>Description</Text>
          <TextInput multiline value={description} onChangeText={setDescription} placeholder="What is this supposed to accomplish?" placeholderTextColor={colors.muted} style={[styles.input, styles.large]} />
          <Text style={styles.label}>Next action</Text>
          <TextInput value={nextAction} onChangeText={setNextAction} placeholder="What will you do first?" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable style={[styles.button, !valid && styles.buttonDisabled]} onPress={save} disabled={!valid}>
            <Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create ticket'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
