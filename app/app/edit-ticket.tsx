import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../constants/theme";
import type { Project, Ticket } from "../types";

export default function EditTicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number>();
  const [ticketKey, setTicketKey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(ticketId);

    Promise.all([
      db.getFirstAsync<Ticket>(
        "SELECT t.*, p.name AS project_name FROM tickets t JOIN projects p ON p.id = t.project_id WHERE t.id = ?",
        id,
      ),
      db.getAllAsync<Project>("SELECT * FROM projects ORDER BY name"),
    ]).then(([loadedTicket, loadedProjects]) => {
      setTicket(loadedTicket);
      setProjects(loadedProjects);
      setProjectId(loadedTicket?.project_id);
      setTicketKey(loadedTicket?.ticket_key || "");
      setTitle(loadedTicket?.title || "");
      setDescription(loadedTicket?.description || "");
      setNextAction(loadedTicket?.next_action || "");
    });
  }, [db, ticketId]);

  const save = async () => {
    if (
      !ticket ||
      !projectId ||
      !ticketKey.trim() ||
      !title.trim() ||
      saving
    ) {
      return;
    }

    setSaving(true);

    try {
      await db.runAsync(
        "UPDATE tickets SET project_id = ?, ticket_key = ?, title = ?, description = ?, next_action = ?, updated_at = ? WHERE id = ?",
        projectId,
        ticketKey.trim().toUpperCase(),
        title.trim(),
        description.trim(),
        nextAction.trim(),
        new Date().toISOString(),
        ticket.id,
      );
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const valid = Boolean(
    ticket && projectId && ticketKey.trim() && title.trim(),
  );

  if (!ticket) {
    return (
      <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
        <Text style={styles.loading}>Loading ticket...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.navTitle}>Edit ticket</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Ticket ID</Text>
          <TextInput
            value={ticketKey}
            onChangeText={setTicketKey}
            autoCapitalize="characters"
            placeholder="e.g. AUTH-123"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What are you building?"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.label}>Project</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.projects}
          >
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => setProjectId(project.id)}
                style={[
                  styles.project,
                  projectId === project.id && styles.projectSelected,
                ]}
              >
                <Text
                  style={[
                    styles.projectText,
                    projectId === project.id && styles.projectTextSelected,
                  ]}
                >
                  {project.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Description</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="What is this supposed to accomplish?"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.large]}
          />

          <Text style={styles.label}>Next action</Text>
          <TextInput
            value={nextAction}
            onChangeText={setNextAction}
            placeholder="What will you do next?"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Pressable
            style={[styles.button, !valid && styles.buttonDisabled]}
            onPress={save}
            disabled={!valid}
          >
            <Text style={styles.buttonText}>
              {saving ? "Saving..." : "Save changes"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  keyboard: { flex: 1 },
  loading: {
    flex: 1,
    color: colors.muted,
    textAlign: "center",
    paddingTop: spacing.lg,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 13,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  cancel: { color: colors.muted },
  navTitle: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  navSpacer: { width: 52 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  label: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 13,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  large: { minHeight: 105, textAlignVertical: "top" },
  projects: { flexGrow: 0 },
  project: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 7,
  },
  projectSelected: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  projectText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  projectTextSelected: { color: "#fff" },
  button: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 28,
  },
  buttonDisabled: { backgroundColor: colors.line },
  buttonText: { color: "#fff", fontWeight: "800" },
});
