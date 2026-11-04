import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "./ThemeProvider";

export function FloatingChatButton() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    button: {
      position: "absolute",
      right: 18,
      bottom: Math.max(insets.bottom, 12) + 82,
      height: 48,
      borderRadius: 24,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.green,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
    },
    icon: { marginRight: 7 },
    label: { color: colors.canvas, fontSize: 12, fontWeight: "800" },
  }));

  if (segments.includes("chat")) return null;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open chat"
        style={styles.button}
        onPress={() => router.push("/chat")}
      >
        <Ionicons name="chatbubble-ellipses" size={19} color={colors.canvas} style={styles.icon} />
        <Text style={styles.label}>Chat</Text>
      </Pressable>
    </View>
  );
}
