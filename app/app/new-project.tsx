import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModalScreenStyles } from '../components/modalScreenStyles';
import { useTheme } from '../components/ThemeProvider';

export default function NewProject() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useModalScreenStyles();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repo, setRepo] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const r = await db.runAsync(
        'INSERT INTO projects (name, description, repository_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        name.trim(),
        description.trim(),
        repo.trim(),
        now,
        now,
      );
      router.replace(`/project/${r.lastInsertRowId}` as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.navTitle}>New project</Text>
          <View style={{ width: 45 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>Projects keep your ticket context organized.</Text>
          <Text style={styles.label}>Project name</Text>
          <TextInput autoFocus value={name} onChangeText={setName} placeholder="e.g. Atlas Platform" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} multiline placeholder="What does this project own?" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} />
          <Text style={styles.label}>Repository URL <Text style={styles.optional}>Optional</Text></Text>
          <TextInput value={repo} onChangeText={setRepo} autoCapitalize="none" placeholder="https://github.com/org/repo" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable style={[styles.button, !name.trim() && styles.buttonDisabled]} disabled={!name.trim()} onPress={save}>
            <Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create project'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
