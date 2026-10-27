import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ClipboardNotifications } from "../components/ClipboardNotifications";
import {
  RecallNotificationsList,
  useRecallNotifications,
} from "../components/RecallNotificationsList";
import { Screen, SectionHeading } from "../components/ui";
import { useTheme, useThemedStyles } from "../components/ThemeProvider";
import { spacing } from "../constants/theme";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const recall = useRecallNotifications();
  const styles = useThemedStyles((colors) => ({
    scroll: { flex: 1 },
    content: { paddingBottom: spacing.xxl },
    back: { flexDirection: "row", alignItems: "center", gap: 5 },
    backText: { color: colors.green, fontSize: 14, fontWeight: "700" },
    clipboardSection: {
      marginTop: spacing.sm,
      minHeight: 80,
    },
  }));

  return (
    <Screen
      title="Notifications"
      subtitle="Ticket summaries and desktop clipboard"
      right={
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={colors.green} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={recall.refreshing}
            onRefresh={recall.refresh}
          />
        }
      >
        <SectionHeading title="Ticket summaries" />
        <RecallNotificationsList
          notifications={recall.notifications}
          loading={recall.loading}
          error={recall.error}
          onRefresh={recall.refresh}
        />

        <SectionHeading title="Desktop clipboard" />
        <View style={styles.clipboardSection}>
          <ClipboardNotifications fullScreen embedded />
        </View>
      </ScrollView>
    </Screen>
  );
}
