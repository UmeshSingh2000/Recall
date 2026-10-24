import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Toast from "react-native-toast-message";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppLoader from "../../components/AppLoader";
import { MarkdownContent } from "../../components/MarkdownContent";
import ShimmerBlock from "../../components/ShimmerBlock";
import { useTheme, useThemedStyles } from "../../components/ThemeProvider";
import { ConfirmDialog, PriorityBadge, StatusBadge } from "../../components/ui";
import { radius, spacing } from "../../constants/theme";
import { generateTicketSummary } from "../../lib/api";
import { addTicketImage, deleteTicketImage, type TicketDetail } from "../../lib/workspace";
import { subscribeToGitCommitLogs } from "../../lib/gitCommitEvents";
import { relativeTime, titleCase } from "../../lib/format";
import {
  fetchTicket,
  removeTicketAndCache,
  updateTicketAndCache,
} from "../../store/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useMarkRouteInteractive } from "@/lib/useMarkRouteInteractive";
import type { ProgressItem, Ticket, WorkLog, TicketStatus } from "../../types";

const statusOptions: { label: string; value: TicketStatus }[] = [
  { label: "In progress", value: "in_progress" },
  { label: "Product review", value: "product_review" },
  { label: "Code review", value: "code_review" },
  { label: "Testing", value: "testing" },
  { label: "Live", value: "live" },
  { label: "Done", value: "done" },
  { label: "Paused", value: "paused" },
  { label: "Blocked", value: "blocked" },
];
const MAX_TICKET_IMAGES = 10;

function useTicketDetailStyles() {
  return useThemedStyles((colors) => ({
    page: { flex: 1, backgroundColor: colors.canvas },
    keyboard: { flex: 1 },
    nav: {
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomColor: colors.line,
      borderBottomWidth: 1,
      backgroundColor: colors.canvas,
    },
    navTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
    navActions: { flexDirection: "row", alignItems: "center" },
    iconButton: { padding: 7 },
    content: { padding: spacing.lg, paddingBottom: 45 },
    ticketHeader: { paddingBottom: 23 },
    key: {
      color: colors.green,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1,
    },
    title: {
      color: colors.ink,
      fontSize: 27,
      lineHeight: 32,
      fontWeight: "800",
      marginTop: 7,
    },
    project: { color: colors.muted, marginTop: 5 },
    badges: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      marginTop: 16,
    },
    statusOptions: { gap: 8, paddingBottom: 2 },
    statusOption: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    statusOptionSelected: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
    statusOptionText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    statusOptionTextSelected: { color: "#fff" },
    summarizeButton: {
      backgroundColor: colors.violet,
      borderRadius: radius.md,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 8,
    },
    summarizeButtonDisabled: { opacity: 0.75 },
    summarizeButtonText: { color: "#fff", fontWeight: "800" },
    summaryBox: {
      backgroundColor: colors.violetSoft,
      borderRadius: radius.md,
      padding: 16,
    },
    summaryError: { color: colors.red, fontSize: 13, lineHeight: 19, marginBottom: 8 },
    imageGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
    imageButton: {
      width: 96,
      height: 96,
      position: "relative",
    },
    imageShimmer: { position: "absolute", top: 0, left: 0 },
    ticketImage: {
      width: 96,
      height: 96,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    hiddenImage: { opacity: 0 },
    imageEmpty: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 22,
      marginBottom: 10,
    },
    imageEmptyIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.greenSoft,
      marginBottom: 10,
    },
    imageEmptyTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
    imageEmptyText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 4,
    },
    imageMore: {
      position: "absolute",
      right: 6,
      bottom: 6,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      borderRadius: radius.pill,
      minWidth: 24,
      paddingHorizontal: 6,
      paddingVertical: 3,
      alignItems: "center",
    },
    previewModal: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.96)" },
    previewHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      elevation: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
    },
    previewCount: { color: "#fff", fontSize: 14, fontWeight: "800" },
    previewActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    previewDelete: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(229, 107, 107, 0.85)",
    },
    previewClose: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.16)",
    },
    previewPage: { justifyContent: "center", alignItems: "center" },
    previewImage: { height: "100%" },
    addImageButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      backgroundColor: colors.surface,
    },
    addImageText: { color: colors.charcoal, fontWeight: "800" },
    imageActions: { flexDirection: "row", gap: 10 },
    cameraButton: {
      flex: 1,
      borderRadius: radius.md,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      backgroundColor: colors.green,
    },
    cameraButtonText: { color: "#fff", fontWeight: "800" },
    cameraModal: { flex: 1, backgroundColor: "#000" },
    cameraSheet: {
      flex: 1,
      backgroundColor: "#000",
      overflow: "hidden",
    },
    cameraHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    cameraTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
    cameraClose: { padding: 4 },
    cameraPreview: { flex: 1, backgroundColor: colors.charcoal },
    cameraFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 14,
      backgroundColor: "#000",
    },
    captureButton: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: "#fff",
      borderColor: colors.green,
      borderWidth: 4,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },
    captureButtonDisabled: { opacity: 0.55 },
    section: { marginTop: 12, marginBottom: 12 },
    sectionTitle: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 11,
    },
    body: { color: colors.charcoal, lineHeight: 22, fontSize: 14 },
    session: {
      backgroundColor: colors.hero,
      borderColor: colors.heroBorder,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 16,
    },
    sessionPressed: { opacity: 0.86 },
    sessionKicker: {
      color: colors.heroKicker,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    sessionText: { color: colors.heroText, lineHeight: 21, marginTop: 9, fontSize: 14 },
    sessionRemain: { color: colors.heroSubtext, fontSize: 12, marginTop: 10 },
    field: {
      borderBottomColor: colors.line,
      borderBottomWidth: 1,
      paddingVertical: 11,
    },
    fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    fieldInput: {
      color: colors.charcoal,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
      padding: 0,
    },
    progress: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: 15,
    },
    progressRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      paddingVertical: 13,
      borderBottomColor: colors.line,
      borderBottomWidth: 1,
    },
    progressText: { color: colors.charcoal, fontSize: 14, flex: 1 },
    completed: { color: colors.muted, textDecorationLine: "line-through" },
    nextBox: {
      backgroundColor: colors.greenSoft,
      borderRadius: radius.md,
      padding: 16,
    },
    nextKicker: {
      color: colors.green,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
    },
    nextInput: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
      paddingTop: 8,
    },
    log: { flexDirection: "row", gap: 12, marginBottom: 17 },
    logPressed: { opacity: 0.7 },
    logDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.green,
      marginTop: 5,
    },
    logMain: { flex: 1 },
    logDate: { color: colors.muted, fontSize: 11, fontWeight: "800" },
    logText: { color: colors.charcoal, lineHeight: 20, marginTop: 5 },
    commit: {
      color: colors.violet,
      fontSize: 12,
      fontFamily: "monospace",
      marginTop: 5,
    },
    muted: { color: colors.muted, lineHeight: 20 },
    actions: { gap: 10, marginTop: 13 },
    logButton: {
      backgroundColor: colors.green,
      borderRadius: radius.md,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    logButtonText: { color: "#fff", fontWeight: "800" },
    secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, alignItems: "center", backgroundColor: colors.surface },
    secondaryText: { color: colors.charcoal, fontWeight: "800" },
    doneButton: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.md, padding: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
    doneText: { color: colors.green, fontWeight: "800" },
    deleteButton: {
      borderWidth: 1,
      borderColor: colors.redSoft,
      borderRadius: radius.md,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      backgroundColor: colors.redSoft,
      marginTop: 4,
    },
    deleteText: { color: colors.red, fontWeight: "800" },
  }));
}

export default function TicketDetailScreen() {
  const { colors } = useTheme();
  const styles = useTicketDetailStyles();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cachedTicket = useAppSelector((state) =>
    state.workspace.tickets?.find((item) => item.id === Number(id)),
  );
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [detail, setDetail] = useState<Pick<TicketDetail, "files" | "notes" | "sessions" | "project"> | null>(null);
  const [nextAction, setNextAction] = useState("");
  const [myContext, setMyContext] = useState("");
  const [whyImplementing, setWhyImplementing] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [importantDecisions, setImportantDecisions] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [updatingStatus, setUpdatingStatus] = useState<TicketStatus | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [loadFinished, setLoadFinished] = useState(false);
  useMarkRouteInteractive(loadFinished || Boolean(ticket));
  const loadTicket = (force = false) => {
    const ticketId = Number(id);
    return dispatch(fetchTicket({ id: ticketId, force })).unwrap().then((next) => {
      setTicket(next.ticket);
      setNextAction(next.ticket?.next_action || "");
      setMyContext(next.ticket?.my_context || "");
      setWhyImplementing(next.ticket?.why_implementing || "");
      setHowItWorks(next.ticket?.how_it_works || "");
      setImportantDecisions(next.ticket?.important_decisions || "");
      setProgress(next.progress);
      setLogs(next.logs);
      setDetail({
        files: next.files,
        notes: next.notes,
        sessions: next.sessions,
        project: next.project,
      });
    }).catch((error) => {
      console.warn("Unable to load ticket:", error);
    }).finally(() => setLoadFinished(true));
  };
  useEffect(() => {
    if (cachedTicket && !ticket) {
      setTicket(cachedTicket);
      setNextAction(cachedTicket.next_action || "");
      setMyContext(cachedTicket.my_context || "");
      setWhyImplementing(cachedTicket.why_implementing || "");
      setHowItWorks(cachedTicket.how_it_works || "");
      setImportantDecisions(cachedTicket.important_decisions || "");
    }
  }, [cachedTicket, ticket]);
  useEffect(() => {
    const images = ticket?.images ?? [];
    setLoadedImages((current) => {
      const next = Object.fromEntries(
        images.map((image) => [image, current[image] ?? false]),
      );
      return next;
    });
  }, [ticket?.images]);
  useEffect(() => {
    setLoadFinished(false);
    loadTicket();
  }, [id]);
  useEffect(() => {
    const ticketId = Number(id);
    return subscribeToGitCommitLogs((updatedTicketId) => {
      if (updatedTicketId === ticketId) loadTicket(true);
    });
  }, [id]);
  if (!ticket) return <AppLoader text="Loading ticket..." subText="Fetching ticket details" size={64} />;
  const saveNext = async () => {
    const updated = await dispatch(updateTicketAndCache({ id: ticket.id, input: { next_action: nextAction } })).unwrap();
    setTicket(updated);
  };
  const saveContext = async (
    field: "my_context" | "why_implementing" | "how_it_works" | "important_decisions",
    value: string,
  ) => {
    const updatedAt = new Date().toISOString();
    const updated = await dispatch(updateTicketAndCache({ id: ticket.id, input: { [field]: value } })).unwrap();
    setTicket({ ...updated, updated_at: updatedAt });
  };
  const updateStatus = async (status: Ticket['status']) => {
    if (updatingStatus || status === ticket.status) return;
    setUpdatingStatus(status);
    const now = new Date().toISOString();
    const completed = status === 'done' || status === 'live';
    try {
      const updated = await dispatch(updateTicketAndCache({
        id: ticket.id,
        input: { status, completed_at: completed ? now : null },
      })).unwrap();
      setTicket(updated);
    } catch (error) {
      console.warn("Unable to update ticket status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };
  const confirmDelete = () => {
    setDeleteDialogVisible(true);
  };
  const handleDelete = async () => {
    setDeleteDialogVisible(false);
    await dispatch(removeTicketAndCache(ticket.id)).unwrap();
    router.back();
  };
  const handleSummarize = async () => {
    if (summarizing) return;

    setSummarizing(true);
    setSummaryError("");

    try {
      const project = detail?.project ?? null;
      const ticketFiles = detail?.files ?? [];
      const ticketNotes = detail?.notes ?? [];
      const workSessions = detail?.sessions ?? [];

      const generatedSummary = await generateTicketSummary({
        ticket: {
          ...ticket,
          next_action: nextAction,
          my_context: myContext,
          why_implementing: whyImplementing,
          how_it_works: howItWorks,
          important_decisions: importantDecisions,
        },
        project,
        progress_items: progress,
        work_logs: logs,
        ticket_files: ticketFiles,
        ticket_notes: ticketNotes,
        work_sessions: workSessions,
      });

      setSummary(generatedSummary);
    } catch (error) {
      setSummary("");
      setSummaryError(
        error instanceof Error ? error.message : "Could not generate a summary.",
      );
    } finally {
      setSummarizing(false);
    }
  };
  const uploadImage = async ({ uri, name, type }: { uri: string; name?: string | null; type?: string | null }) => {
    if (ticket.images.length >= MAX_TICKET_IMAGES) {
      Toast.show({
        type: "error",
        text1: "Image limit reached",
        text2: "A ticket can have up to 10 images.",
      });
      return;
    }
    setUploadingImage(true);
    setImageError("");
    try {
      const uploaded = await addTicketImage(ticket.id, { uri, name, type });
      setTicket({ ...ticket, images: uploaded.images });
      await loadTicket(true);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setUploadingImage(false);
    }
  };
  const handleChooseImage = async () => {
    if (uploadingImage) return;
    if (ticket.images.length >= MAX_TICKET_IMAGES) {
      Toast.show({
        type: "error",
        text1: "Image limit reached",
        text2: "A ticket can have up to 10 images.",
      });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError("Photo library access is required to select an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await uploadImage({ uri: asset.uri, name: asset.fileName, type: asset.mimeType });
  };
  const handleOpenCamera = async () => {
    if (uploadingImage) return;
    if (ticket.images.length >= MAX_TICKET_IMAGES) {
      Toast.show({
        type: "error",
        text1: "Image limit reached",
        text2: "A ticket can have up to 10 images.",
      });
      return;
    }
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission.granted) {
      setImageError("Camera access is required to take a photo.");
      return;
    }
    setImageError("");
    setCameraVisible(true);
  };
  const handleTakePhoto = async () => {
    if (uploadingImage || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;
      setCameraVisible(false);
      await uploadImage({
        uri: photo.uri,
        name: `ticket-${ticket.id}-${Date.now()}.jpg`,
        type: "image/jpeg",
      });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not take photo.");
    }
  };
  const handleDeleteImage = async () => {
    if (!imageToDelete || deletingImage) return;
    setDeletingImage(true);
    try {
      const deletedImage = imageToDelete;
      const result = await deleteTicketImage(ticket.id, deletedImage);
      setTicket({ ...ticket, images: result.images });
      setPreviewImageIndex(null);
      setImageToDelete(null);
      await loadTicket(true);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not delete image.");
      setImageToDelete(null);
    } finally {
      setDeletingImage(false);
    }
  };
  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>Ticket detail</Text>
        <View style={styles.navActions}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/edit-ticket",
                params: { ticketId: ticket.id },
              })
            }
            style={styles.iconButton}
          >
            <Ionicons name="create-outline" size={21} color={colors.green} />
          </Pressable>
          <Pressable onPress={confirmDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={colors.red} />
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.ticketHeader}>
          <Text style={styles.key}>{ticket.ticket_key}</Text>
          <Text style={styles.title}>{ticket.title}</Text>
          <Text style={styles.project}>{ticket.project_name}</Text>
          <View style={styles.badges}>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </View>
        </View>
        <Section title="Update status">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusOptions}>
            {statusOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => updateStatus(option.value)}
                disabled={updatingStatus !== null}
                style={[styles.statusOption, ticket.status === option.value && styles.statusOptionSelected]}
              >
                {updatingStatus === option.value ? (
                  <ActivityIndicator size="small" color={ticket.status === option.value ? "#fff" : colors.green} />
                ) : (
                  <Text style={[styles.statusOptionText, ticket.status === option.value && styles.statusOptionTextSelected]}>
                    {option.label}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Section>
        <Pressable
          style={[styles.summarizeButton, summarizing && styles.summarizeButtonDisabled]}
          onPress={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="sparkles-outline" size={18} color="#fff" />
          )}
          <Text style={styles.summarizeButtonText}>
            {summarizing ? "Summarizing..." : "Summarize ticket"}
          </Text>
        </Pressable>
        {summaryError ? <Text style={styles.summaryError}>{summaryError}</Text> : null}
        {summary ? (
          <Section title="AI summary">
            <View style={styles.summaryBox}>
              <MarkdownContent content={summary} />
            </View>
          </Section>
        ) : null}
        <Section title="What is this ticket?">
          <Text style={styles.body}>{ticket.description}</Text>
        </Section>
        <Section title="Images">
          {ticket.images.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageGrid}
            >
              {ticket.images.map((image, index) => (
                <Pressable
                  key={`${image}-${index}`}
                  onPress={() => setPreviewImageIndex(index)}
                  style={styles.imageButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview image ${index + 1}`}
                >
                  {loadedImages[image] ? null : (
                    <ShimmerBlock
                      width={96}
                      height={96}
                      borderRadius={radius.md}
                      style={styles.imageShimmer}
                    />
                  )}
                  <Image
                    source={{ uri: image }}
                    style={[styles.ticketImage, !loadedImages[image] && styles.hiddenImage]}
                    onLoad={() =>
                      setLoadedImages((current) => ({ ...current, [image]: true }))
                    }
                    onError={() =>
                      setLoadedImages((current) => ({ ...current, [image]: true }))
                    }
                  />
                  {loadedImages[image] ? (
                    <View style={styles.imageMore} pointerEvents="none">
                      <Ionicons name="expand-outline" size={13} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imageEmpty}>
              <View style={styles.imageEmptyIcon}>
                <Ionicons name="images-outline" size={21} color={colors.green} />
              </View>
              <Text style={styles.imageEmptyTitle}>Add visual context</Text>
              <Text style={styles.imageEmptyText}>
                Upload screenshots, notes, or references to make this ticket easier to remember later.
              </Text>
            </View>
          )}
          <View style={styles.imageActions}>
            <Pressable
              style={styles.addImageButton}
              onPress={handleChooseImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : (
                <Ionicons name="images-outline" size={18} color={colors.green} />
              )}
              <Text style={styles.addImageText}>
                {uploadingImage ? "Uploading..." : "Gallery"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.cameraButton}
              onPress={handleOpenCamera}
              disabled={uploadingImage}
            >
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.cameraButtonText}>Camera</Text>
            </Pressable>
          </View>
          {imageError ? <Text style={styles.summaryError}>{imageError}</Text> : null}
        </Section>
        <Section title="Last session">
          <Pressable
            disabled={!logs[0]}
            onPress={() => logs[0] && router.push(`/log/${logs[0].id}`)}
            style={({ pressed }) => [styles.session, pressed && styles.sessionPressed]}
          >
            <Text style={styles.sessionKicker}>
              YOU PREVIOUSLY WORKED ON THIS{" "}
              {relativeTime(logs[0]?.created_at).toUpperCase()}
            </Text>
            <Text style={styles.sessionText}>
              {logs[0]?.description ||
                "No work session logged yet. Your next note will appear here."}
            </Text>
            {logs[0]?.what_remains ? (
              <Text style={styles.sessionRemain}>
                Remaining: {logs[0].what_remains}
              </Text>
            ) : null}
          </Pressable>
        </Section>
        <Section title="My context">
          <ContextField
            label="What is this feature?"
            value={myContext}
            onChangeText={setMyContext}
            onBlur={() => saveContext("my_context", myContext)}
          />
          <ContextField
            label="Why am I implementing it?"
            value={whyImplementing}
            onChangeText={setWhyImplementing}
            onBlur={() => saveContext("why_implementing", whyImplementing)}
          />
          <ContextField
            label="How does it work?"
            value={howItWorks}
            onChangeText={setHowItWorks}
            onBlur={() => saveContext("how_it_works", howItWorks)}
          />
          <ContextField
            label="Important decisions"
            value={importantDecisions}
            onChangeText={setImportantDecisions}
            onBlur={() => saveContext("important_decisions", importantDecisions)}
          />
        </Section>
        <Section title="Progress">
          <View style={styles.progress}>
            {progress.map((item) => (
              <View style={styles.progressRow} key={item.id}>
                <Ionicons
                  name={item.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={item.completed ? colors.green : colors.muted}
                />
                <Text style={[styles.progressText, item.completed === 1 ? styles.completed : undefined]}>
                  {item.content}
                </Text>
              </View>
            ))}
          </View>
        </Section>
        <Section title="Next action">
          <View style={styles.nextBox}>
            <Text style={styles.nextKicker}>NEXT ACTION</Text>
            <TextInput
              value={nextAction}
              onChangeText={setNextAction}
              onBlur={saveNext}
              placeholder="What should you do next?"
              placeholderTextColor={colors.muted}
              style={styles.nextInput}
              multiline
            />
          </View>
        </Section>
        <Section title="Work history">
          {logs.length ? (
            logs.map((log) => (
              <Pressable
                key={log.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${titleCase(log.type)} work log`}
                onPress={() => router.push(`/log/${log.id}`)}
                style={({ pressed }) => [styles.log, pressed && styles.logPressed]}
              >
                <View style={styles.logDot} />
                <View style={styles.logMain}>
                  <Text style={styles.logDate}>
                    {relativeTime(log.created_at)} · {titleCase(log.type)}
                  </Text>
                  <Text style={styles.logText}>{log.description}</Text>
                  {log.commit_hash ? (
                    <Text style={styles.commit}>{log.commit_hash}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.muted}>
              Your work history will appear here as you work.
            </Text>
          )}
        </Section>
        <View style={styles.actions}>
          <Pressable style={styles.logButton} onPress={() => router.push({ pathname: "/log-progress", params: { ticketId: ticket.id } })}>
            <Ionicons name="create-outline" size={18} color="#fff" /><Text style={styles.logButtonText}>Log progress</Text>
          </Pressable>
          {!['done', 'live'].includes(ticket.status) ? <Pressable style={styles.secondaryButton} onPress={() => router.push({ pathname: '/switch-work' as any, params: { ticketId: ticket.id } })}><Text style={styles.secondaryText}>Pause / switch</Text></Pressable> : null}
          {!['done', 'live'].includes(ticket.status) ? <Pressable style={styles.doneButton} onPress={() => updateStatus('done')}><Ionicons name="checkmark" size={17} color={colors.green} /><Text style={styles.doneText}>Mark done</Text></Pressable> : <Pressable style={styles.secondaryButton} onPress={() => updateStatus('in_progress')}><Text style={styles.secondaryText}>Reopen ticket</Text></Pressable>}
          <Pressable style={styles.deleteButton} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={17} color={colors.red} />
            <Text style={styles.deleteText}>Delete ticket</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={previewImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageIndex(null)}
      >
        <View style={styles.previewModal}>
          {previewImageIndex !== null ? (
            <FlatList
              key={previewImageIndex}
              data={ticket.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={previewImageIndex}
              getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
              onMomentumScrollEnd={(event) =>
                setPreviewImageIndex(Math.round(event.nativeEvent.contentOffset.x / windowWidth))
              }
              renderItem={({ item }) => (
                <View style={[styles.previewPage, { width: windowWidth }]}>
                  <Image
                    source={{ uri: item }}
                    style={[styles.previewImage, { width: windowWidth }]}
                    resizeMode="contain"
                  />
                </View>
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
            />
          ) : null}
          <View
            style={[styles.previewHeader, { paddingTop: insets.top + 14 }]}
            pointerEvents="auto"
          >
            <Text style={styles.previewCount} pointerEvents="none">
              {(previewImageIndex ?? 0) + 1} / {ticket.images.length}
            </Text>
            <View style={styles.previewActions}>
              <Pressable
                onPress={() => {
                  const image = ticket.images[previewImageIndex ?? 0];
                  if (image) {
                    setPreviewImageIndex(null);
                    setImageToDelete(image);
                  }
                }}
                style={styles.previewDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete image"
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setPreviewImageIndex(null)}
                style={styles.previewClose}
                accessibilityRole="button"
                accessibilityLabel="Close image preview"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={cameraVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraModal}>
          <View style={styles.cameraSheet}>
            <View style={[styles.cameraHeader, { paddingTop: insets.top + 12 }]}>
              <Text style={styles.cameraTitle}>Take a photo</Text>
              <Pressable
                onPress={() => setCameraVisible(false)}
                style={styles.cameraClose}
                accessibilityRole="button"
                accessibilityLabel="Close camera"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
            <View
              style={[
                styles.cameraFooter,
                { paddingBottom: Math.max(insets.bottom, 10) + 8 },
              ]}
            >
              <Pressable
                onPress={handleTakePhoto}
                disabled={uploadingImage}
                style={[styles.captureButton, uploadingImage && styles.captureButtonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
              >
                {uploadingImage ? <ActivityIndicator color={colors.green} /> : <Ionicons name="camera" size={24} color={colors.green} />}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete ticket?"
        message={`This will permanently delete ${ticket.ticket_key} and all its progress, logs, and notes.`}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        visible={imageToDelete !== null}
        title="Delete image?"
        message="This permanently removes the image from this ticket and object storage. It cannot be undone."
        confirmLabel={deletingImage ? "Deleting..." : "Delete image"}
        onCancel={() => !deletingImage && setImageToDelete(null)}
        onConfirm={handleDeleteImage}
      />
    </SafeAreaView>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const styles = useTicketDetailStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function ContextField({
  label,
  value,
  onChangeText,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
}) {
  const { colors } = useTheme();
  const styles = useTicketDetailStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder="Tap to add your context."
        placeholderTextColor={colors.muted}
        style={styles.fieldInput}
        multiline
      />
    </View>
  );
}
