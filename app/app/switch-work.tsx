import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModalScreenStyles } from '../components/modalScreenStyles';
import { useTheme } from '../components/ThemeProvider';

const reasons = ['Higher priority task', 'Blocked', 'Waiting for someone', 'Taking a break', 'Finished for now', 'Other'];

export default function SwitchWork() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = useModalScreenStyles();
  const [summary, setSummary] = useState('');
  const [remains, setRemains] = useState('');
  const [next, setNext] = useState('');
  const [reason, setReason] = useState(reasons[0]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await db.runAsync(
        'INSERT INTO work_sessions (ticket_id, started_at, paused_at, pause_reason, summary, next_action) VALUES (?, ?, ?, ?, ?, ?)',
        Number(ticketId),
        now,
        now,
        reason,
        summary.trim(),
        next.trim(),
      );
      await db.runAsync(
        'INSERT INTO work_logs (ticket_id, type, description, what_remains, next_action, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        Number(ticketId),
        'other',
        summary.trim() || 'Paused work session.',
        remains.trim(),
        next.trim(),
        now,
      );
      await db.runAsync("UPDATE tickets SET status = 'paused', next_action = ?, updated_at = ? WHERE id = ?", next.trim(), now, Number(ticketId));
      router.dismissAll();
      router.replace('/');
    } catch {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.navTitle}>Switch work</Text>
          <View style={{ width: 45 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Before you switch...</Text>
          <Text style={[styles.intro, { marginTop: 5, marginBottom: 0 }]}>Leave a lightweight handoff for your future self.</Text>
          <Text style={[styles.label, { marginTop: 19 }]}>What did you accomplish?</Text>
          <TextInput value={summary} onChangeText={setSummary} multiline placeholder="A short summary of what changed..." placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} />
          <Text style={styles.label}>What remains?</Text>
          <TextInput value={remains} onChangeText={setRemains} multiline placeholder="Anything still open or risky..." placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} />
          <Text style={styles.label}>What should you do next?</Text>
          <TextInput value={next} onChangeText={setNext} placeholder="Your first next step" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Why are you switching?</Text>
          <View style={styles.chips}>
            {reasons.map((x) => (
              <Pressable onPress={() => setReason(x)} key={x} style={[styles.chip, reason === x && styles.chipOn]}>
                <Text style={[styles.chipText, reason === x && styles.chipTextOn]}>{x}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={save} style={styles.button}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save & pause ticket'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
