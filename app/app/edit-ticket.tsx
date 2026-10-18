import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useModalScreenStyles } from "../components/modalScreenStyles";
import { useTheme } from "../components/ThemeProvider";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProjects, fetchTicket, updateTicketAndCache } from "../store/workspaceSlice";
import type { Ticket } from "../types";

export default function EditTicketScreen() {
  const { colors } = useTheme();
  const styles = useModalScreenStyles();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.workspace.projects) ?? [];
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [projectId, setProjectId] = useState<number>();
  const [ticketKey, setTicketKey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(ticketId);

    Promise.all([
      dispatch(fetchTicket({ id })).unwrap(),
      dispatch(fetchProjects()).unwrap(),
    ]).then(([detail]) => {
      const loadedTicket = detail.ticket;
      setTicket(loadedTicket);
      setProjectId(loadedTicket?.project_id);
      setTicketKey(loadedTicket?.ticket_key || "");
      setTitle(loadedTicket?.title || "");
      setDescription(loadedTicket?.description || "");
      setNextAction(loadedTicket?.next_action || "");
    }).catch((error) => {
      console.warn("Unable to load ticket:", error);
    });
  }, [dispatch, ticketId]);

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
      await dispatch(updateTicketAndCache({ id: ticket.id, input: {
        project_id: projectId,
        ticket_key: ticketKey.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        next_action: nextAction.trim(),
      } })).unwrap();
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

