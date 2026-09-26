import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModalScreenStyles } from '../components/modalScreenStyles';
import { useTheme } from '../components/ThemeProvider';
import { titleCase } from '../lib/format';
import type { WorkLogType } from '../types';

const types: WorkLogType[] = ['code', 'bug_fix', 'investigation', 'testing', 'refactoring', 'documentation', 'decision', 'other'];

export default function LogProgressScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = useModalScreenStyles();
  const [description, setDescription] = useState('');
  const [remains, setRemains] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [commit, setCommit] = useState('');
  const [files, setFiles] = useState('');
  const [type, setType] = useState<WorkLogType>('code');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!description.trim() || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO work_logs (ticket_id, type, description, what_remains, next_action, commit_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        Number(ticketId),
        type,
        description.trim(),
        remains.trim(),
        nextAction.trim(),
        commit.trim(),
        now,
      );
      for (const path of files.split(/[\n,]/).map((x) => x.trim()).filter(Boolean)) {
        await db.runAsync('INSERT INTO ticket_files (ticket_id, file_path, created_at) VALUES (?, ?, ?)', Number(ticketId), path, now);
      }
      await db.runAsync(
        "UPDATE tickets SET status = CASE WHEN status = 'paused' THEN 'in_progress' ELSE status END, next_action = ?, updated_at = ? WHERE id = ?",
        nextAction.trim(),
        now,
        Number(ticketId),
      );
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.navTitle}>Log progress</Text>
          <Pressable onPress={save} disabled={!description.trim()}>
            <Text style={[styles.save, !description.trim() && styles.disabled]}>Save</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>A small note now makes the next session easier.</Text>
          <Text style={styles.label}>What did you do? <Text style={styles.required}>Required</Text></Text>
          <TextInput autoFocus multiline value={description} onChangeText={setDescription} placeholder="Describe the progress in a sentence or two..." placeholderTextColor={colors.muted} style={[styles.input, styles.large]} />
          <Text style={styles.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.types}>
            {types.map((item) => (
              <Pressable key={item} onPress={() => setType(item)} style={[styles.type, type === item && styles.typeSelected]}>
                <Text style={[styles.typeText, type === item && styles.typeTextSelected]}>{titleCase(item)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.label}>What remains?</Text>
          <TextInput multiline value={remains} onChangeText={setRemains} placeholder="Anything unfinished or worth remembering..." placeholderTextColor={colors.muted} style={[styles.input, styles.medium]} />
          <Text style={styles.label}>Next action</Text>
          <TextInput value={nextAction} onChangeText={setNextAction} placeholder="What will you do next?" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Files changed <Text style={styles.optional}>Optional</Text></Text>
          <TextInput value={files} onChangeText={setFiles} multiline placeholder="src/cache.ts, auth-service.ts" placeholderTextColor={colors.muted} style={[styles.input, styles.medium]} />
          <Text style={styles.label}>Commit hash <Text style={styles.optional}>Optional</Text></Text>
          <TextInput value={commit} onChangeText={setCommit} autoCapitalize="none" placeholder="e.g. a82cf1d" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable style={[styles.button, !description.trim() && styles.buttonDisabled]} onPress={save} disabled={!description.trim()}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save progress'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
