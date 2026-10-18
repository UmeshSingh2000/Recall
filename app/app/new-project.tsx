import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModalScreenStyles } from '../components/modalScreenStyles';
import { useTheme } from '../components/ThemeProvider';
import { useAppDispatch } from '../store/hooks';
import { createProjectAndCache } from '../store/workspaceSlice';

export default function NewProject() {
  const router = useRouter();
  const dispatch = useAppDispatch();
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
      const project = await dispatch(createProjectAndCache({
        name: name.trim(),
        description: description.trim(),
        repository_url: repo.trim(),
      })).unwrap();
      router.replace(`/project/${project.project.id}` as any);
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
