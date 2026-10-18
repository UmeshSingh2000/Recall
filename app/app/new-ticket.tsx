import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModalScreenStyles } from '../components/modalScreenStyles';
import { useTheme } from '../components/ThemeProvider';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createTicketAndCache, fetchProjects } from '../store/workspaceSlice';

export default function NewTicketScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useModalScreenStyles();
  const projects = useAppSelector((state) => state.workspace.projects) ?? [];
  const [projectId, setProjectId] = useState<number>();
  const [ticketKey, setTicketKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects()).unwrap().then((items) => {
      setProjectId((current) => current ?? items[0]?.id);
    }).catch((error) => {
      console.warn('Unable to load projects:', error);
    });
  }, [dispatch]);

  const save = async () => {
    if (!projectId || !ticketKey.trim() || !title.trim() || saving) return;
    setSaving(true);
    try {
      const ticket = await dispatch(createTicketAndCache({
        project_id: projectId,
        ticket_key: ticketKey.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        next_action: nextAction.trim(),
      })).unwrap();
      router.replace(`/ticket/${ticket.ticket.id}`);
    } catch (error) {
      console.warn('Unable to create ticket:', error);
      setSaving(false);
    }
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
