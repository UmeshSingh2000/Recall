import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { ClipboardNotifications } from "../components/ClipboardNotifications";
import { Screen } from "../components/ui";
import { useTheme, useThemedStyles } from "../components/ThemeProvider";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    content: { flex: 1 },
    back: { flexDirection: "row", alignItems: "center", gap: 5 },
    backText: { color: colors.green, fontSize: 14, fontWeight: "700" },
  }));

  return (
    <Screen
      title="Notifications"
      subtitle="Recent text from your desktop"
      right={
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={18} color={colors.green} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      }
    >
      <View style={styles.content}>
        <ClipboardNotifications fullScreen />
      </View>
    </Screen>
  );
}
