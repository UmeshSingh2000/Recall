import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TicketDeck } from "../../components/TicketDeck";
import { ClipboardNotifications } from "../../components/ClipboardNotifications";
import ShimmerBlock from "../../components/ShimmerBlock";
import { useTheme, useThemedStyles } from "../../components/ThemeProvider";
import { radius, spacing, tabBarInset, workloadColors } from "../../constants/theme";
import { greeting, relativeTime } from "../../lib/format";
import { fetchProjects, fetchTickets } from "../../store/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useMarkRouteInteractive } from "@/lib/useMarkRouteInteractive";

function HomeSkeleton() {
  const styles = useThemedStyles((colors) => ({
    safe: { flex: 1, backgroundColor: colors.canvas },
    scroll: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg, paddingBottom: tabBarInset + spacing.xl },
    greeting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginBottom: 22 },
    greetingCopy: { gap: 9 },
    stats: { flexDirection: "row", gap: 10, marginBottom: 22 },
    workload: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16, marginBottom: 24 },
    workloadTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    workloadTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
    workloadMeta: { color: colors.muted, fontSize: 11 },
    statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
    stat: { flex: 1 },
    statLabel: { color: colors.muted, fontSize: 11 },
    statValue: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 3 },
    progress: { height: 6, flexDirection: "row", gap: 8, marginTop: 14 },
    progressActive: { flex: 6, backgroundColor: workloadColors.active, borderRadius: 3 },
    progressPaused: { flex: 2, backgroundColor: workloadColors.paused, borderRadius: 3 },
    progressDone: { flex: 5, backgroundColor: workloadColors.done, borderRadius: 3 },
    section: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 11 },
    sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
    sectionAction: { color: colors.green, fontSize: 12, fontWeight: "800" },
    ticket: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: 10, gap: 13 },
  }));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <View style={styles.greetingCopy}>
            <ShimmerBlock width={92} height={11} />
            <ShimmerBlock width={190} height={30} borderRadius={9} />
            <ShimmerBlock width={220} height={14} />
          </View>
          <ShimmerBlock width={42} height={42} borderRadius={21} />
        </View>
        <View style={styles.stats}>
          {["active", "paused", "done"].map((item) => (
            <View key={item} style={styles.stat}>
              <ShimmerBlock width="70%" height={11} />
              <ShimmerBlock width="45%" height={25} borderRadius={7} />
            </View>
          ))}
        </View>
        <ShimmerBlock width="100%" height={180} borderRadius={radius.md} />
        <View style={styles.section}>
          <ShimmerBlock width={145} height={20} borderRadius={7} />
        </View>
        {["one", "two", "three"].map((item) => (
          <View key={item} style={styles.ticket}>
            <ShimmerBlock width={80} height={12} />
            <ShimmerBlock width="78%" height={17} borderRadius={6} />
            <ShimmerBlock width="45%" height={12} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function TabOneScreen() {
  useMarkRouteInteractive();
  const { colors } = useTheme();
  const homeAccent = colors.green;
  const homeAccentSoft = colors.greenSoft;
  const styles = useThemedStyles((colors) => ({
    safe: { flex: 1, backgroundColor: colors.canvas },
    scroll: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg, paddingBottom: tabBarInset + spacing.xl },
    greeting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginBottom: 20 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    eyebrow: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
    heading: { color: colors.ink, fontSize: 28, fontWeight: "800", marginTop: 5, letterSpacing: -0.6 },
    subheading: { color: colors.muted, fontSize: 14, marginTop: 4 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.charcoal, justifyContent: "center", alignItems: "center" },
    avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
    workload: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16, marginBottom: 22 },
    workloadTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    workloadTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
    workloadMeta: { color: colors.muted, fontSize: 11 },
    statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
    stat: { flex: 1 },
    statLabel: { color: colors.muted, fontSize: 11 },
    statValue: { fontSize: 20, fontWeight: "800", marginTop: 3 },
    progress: { height: 6, flexDirection: "row", gap: 8, marginTop: 14 },
    progressActive: { flex: 6, backgroundColor: workloadColors.active, borderRadius: 3 },
    progressPaused: { flex: 2, backgroundColor: workloadColors.paused, borderRadius: 3 },
    progressDone: { flex: 5, backgroundColor: workloadColors.done, borderRadius: 3 },
    section: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 11 },
    sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
    sectionAction: { color: colors.green, fontSize: 12, fontWeight: "800" },
    deckHeading: { marginTop: 2 },
    projectRow: { flexDirection: "row", gap: 12, marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
    projectCard: { width: 192, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
    projectIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: homeAccentSoft, marginBottom: 12 },
    projectName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
    projectMeta: { color: colors.muted, fontSize: 11, marginTop: 5 },
    projectProgress: { height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 13, overflow: "hidden" },
    projectProgressFill: { height: "100%", backgroundColor: homeAccent, borderRadius: 2 },
    insight: { backgroundColor: colors.redSoft, borderColor: colors.red + "44", borderWidth: 1, borderRadius: radius.lg, padding: 16 },
    insightKicker: { color: homeAccent, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    insightTitle: { color: colors.ink, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 12 },
    insightBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
    insightLink: { color: homeAccent, fontSize: 12, fontWeight: "800", marginTop: 12 },
    noteList: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden", marginTop: 8 },
    note: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomColor: colors.line, borderBottomWidth: 1, gap: 10 },
    noteLast: { borderBottomWidth: 0 },
    noteIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: homeAccentSoft },
    noteText: { color: colors.ink, fontSize: 12, flex: 1 },
    noteMeta: { color: colors.muted, fontSize: 10, marginTop: 2 },
    recentList: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
    recent: { flexDirection: "row", alignItems: "center", padding: 13, borderBottomColor: colors.line, borderBottomWidth: 1, gap: 10 },
    recentLast: { borderBottomWidth: 0 },
    recentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: homeAccent },
    recentTitle: { color: colors.ink, fontSize: 12, flex: 1 },
    recentTime: { color: colors.muted, fontSize: 10 },
    muted: { color: colors.muted, paddingBottom: 20 },
  }));
  const router = useRouter();
  const dispatch = useAppDispatch();
  const ticketsData = useAppSelector((state) => state.workspace.tickets);
  const projectsData = useAppSelector((state) => state.workspace.projects);
  const tickets = ticketsData ?? [];
  const projects = projectsData ?? [];
  const [now, setNow] = useState(() => new Date());
  const [deckIndex, setDeckIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadTickets = useCallback(() => {
    dispatch(fetchTickets()).unwrap().catch((error) => {
      console.warn("Unable to load tickets:", error);
    });
  }, [dispatch]);

  const loadProjects = useCallback(() => {
    dispatch(fetchProjects()).unwrap().catch((error) => {
      console.warn("Unable to load projects:", error);
    });
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    loadTickets();
    loadProjects();
  }, [loadProjects, loadTickets]));

  const active = tickets.filter((ticket) => ["in_progress", "review", "product_review", "code_review", "testing"].includes(ticket.status)).length;
  const paused = tickets.filter((ticket) => ticket.status === "paused" || ticket.status === "blocked").length;
  const done = tickets.filter((ticket) => ticket.status === "done" || ticket.status === "live").length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "done" && ticket.status !== "live");
  const current = openTickets[deckIndex];

  useEffect(() => {
    if (deckIndex >= openTickets.length && openTickets.length > 0) setDeckIndex(openTickets.length - 1);
  }, [deckIndex, openTickets.length]);

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).toUpperCase();

  if (ticketsData === null) {
    return <HomeSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <View>
            <Text style={styles.eyebrow}>{dateLabel}</Text>
            <Text style={styles.heading}>{greeting(now)}</Text>
            <Text style={styles.subheading}>Let’s pick up where you left off.</Text>
          </View>
          <View style={styles.headerActions}>
            <ClipboardNotifications />
            <View style={styles.avatar}><Text style={styles.avatarText}>U</Text></View>
          </View>
        </View>
        <View style={styles.workload}>
          <View style={styles.workloadTop}>
            <Text style={styles.workloadTitle}>Workload overview</Text>
            <Text style={styles.workloadMeta}>{tickets.length} tickets in workspace</Text>
          </View>
          <View style={styles.statRow}>
            {[["Total", tickets.length, colors.ink], ["Active", active, workloadColors.active], ["Paused", paused, workloadColors.paused], ["Done", done, workloadColors.done]].map(([label, count, tone]) => (
              <View style={styles.stat} key={label as string}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={[styles.statValue, { color: tone as string }]}>{count}</Text>
              </View>
            ))}
          </View>
          <View style={styles.progress}>
            <View style={styles.progressActive} />
            <View style={styles.progressPaused} />
            <View style={styles.progressDone} />
          </View>
        </View>
        {openTickets.length ? <>
          <View style={[styles.section, styles.deckHeading]}><Text style={styles.sectionTitle}>Pick up where you left off</Text><Text style={styles.sectionAction}>{openTickets.length} open</Text></View>
          <TicketDeck tickets={openTickets} deckIndex={deckIndex} onDeckIndexChange={setDeckIndex} accentColor={homeAccent} />
        </> : null}
        <View style={styles.section}><Text style={styles.sectionTitle}>Explore projects</Text><Pressable onPress={() => router.push("/projects")}><Text style={styles.sectionAction}>See all</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>
          {projects.slice(0, 4).map((project) => {
            const total = (project.active_count || 0) + (project.completed_count || 0);
            const progress = total ? ((project.completed_count || 0) / total) * 100 : 0;
            return <Pressable key={project.id} style={styles.projectCard} onPress={() => router.push(`/project/${project.id}`)}>
              <View style={styles.projectIcon}><Ionicons name="folder-open-outline" size={18} color={homeAccent} /></View>
              <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
              <Text style={styles.projectMeta}>{project.active_count || 0} open tickets</Text>
              <View style={styles.projectProgress}><View style={[styles.projectProgressFill, { width: `${progress}%` }]} /></View>
            </Pressable>;
          })}
        </ScrollView>
        <View style={styles.section}><Text style={styles.sectionTitle}>Developer insights</Text></View>
        <View style={styles.insight}>
          <Text style={styles.insightKicker}>RELATED TO YOUR CURRENT TICKET</Text>
          <Text style={styles.insightTitle}>{current ? `${current.title} — keep the context close` : "Keep your engineering context close"}</Text>
          <Text style={styles.insightBody}>Capture the next decision while the details are still fresh so you can return to the work without reloading the whole problem.</Text>
          <Text style={styles.insightLink}>Explore your knowledge →</Text>
        </View>
        <View style={styles.noteList}>
          {["Safe-area padding snippet for bottom sheets", "Idempotency keys pattern for payment webhooks"].map((note, index) => (
            <View key={note} style={[styles.note, index === 1 && styles.noteLast]}>
              <View style={styles.noteIcon}><Ionicons name={index ? "document-text-outline" : "code-slash-outline"} size={16} color={colors.charcoal} /></View>
              <View style={{ flex: 1 }}><Text style={styles.noteText} numberOfLines={1}>{note}</Text><Text style={styles.noteMeta}>{projects[index]?.name || "Workspace"} · saved {index + 1}w ago</Text></View>
            </View>
          ))}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Recent activity</Text></View>
        <View style={styles.recentList}>
          {tickets.slice(0, 3).map((ticket, index) => <Pressable key={ticket.id} style={[styles.recent, index === 2 && styles.recentLast]} onPress={() => router.push(`/ticket/${ticket.id}`)}>
            <View style={styles.recentDot} /><Text style={styles.recentTitle} numberOfLines={1}>{ticket.status === "done" ? "Completed" : "Updated"} {ticket.ticket_key} — {ticket.title}</Text><Text style={styles.recentTime}>{relativeTime(ticket.updated_at)}</Text>
          </Pressable>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
