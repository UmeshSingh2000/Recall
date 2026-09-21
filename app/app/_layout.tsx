import { Stack } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClipboardNotifications } from "../components/ClipboardNotifications";
import { GitCommitListener } from "../components/GitCommitListener";
import { colors, spacing } from "../constants/theme";
import { initializeDatabase } from "../lib/database";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="recall.db" onInit={initializeDatabase}>
        <DatabaseGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="ticket/[id]" options={{ presentation: "card" }} />
            <Stack.Screen name="log/[id]" options={{ presentation: "card" }} />
            <Stack.Screen name="log-progress" options={{ presentation: "modal" }} />
            <Stack.Screen name="edit-ticket" options={{ presentation: "modal" }} />
            <Stack.Screen name="switch-work" options={{ presentation: "modal" }} />
            <Stack.Screen name="new-ticket" options={{ presentation: "modal" }} />
            <Stack.Screen name="new-project" options={{ presentation: "modal" }} />
            <Stack.Screen name="project/[id]" options={{ presentation: "card" }} />
          </Stack>
        </DatabaseGate>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function DatabaseGate({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      db.getAllAsync("SELECT * FROM projects"),
      db.getAllAsync("SELECT * FROM tickets"),
      db.getAllAsync("SELECT * FROM work_logs"),
    ]).finally(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [db]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingMark}>
          <Text style={styles.loadingMarkText}>R</Text>
        </View>
        <Text style={styles.loadingTitle}>Recall</Text>
        <Text style={styles.loadingSubtitle}>Loading your workspace</Text>
        <ActivityIndicator color={colors.green} style={styles.spinner} />
      </View>
    );
  }

  return (
    <>
      {children}
      <ClipboardNotifications />
      <GitCommitListener />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  loadingMark: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.charcoal },
  loadingMarkText: { color: colors.greenSoft, fontSize: 30, fontWeight: "900" },
  loadingTitle: { color: colors.ink, fontSize: 22, fontWeight: "800", marginTop: spacing.md },
  loadingSubtitle: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  spinner: { marginTop: spacing.lg },
});
