import "@/lib/crypto-polyfill";
import "react-native-reanimated";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ClipboardNotifications } from "../components/ClipboardNotifications";
import { GitCommitListener } from "../components/GitCommitListener";
import { ThemeProvider, useTheme, useThemedStyles } from "../components/ThemeProvider";
import { spacing } from "../constants/theme";
import { initializeDatabase } from "../lib/database";
import AuthProvider, { useAuth } from "@/components/AuthContext";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast from 'react-native-toast-message';

function RootToast() {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.toastHost}>
      <Toast topOffset={insets.top + 8} />
    </View>
  );
}

function AuthenticatedDatabaseExtras() {
  return (
    <>
      <ClipboardNotifications />
      <GitCommitListener />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <SQLiteProvider databaseName="recall.db" onInit={initializeDatabase}>
          <ThemeProvider>
            <AuthProvider>
              <AuthGate>
                <ThemedStatusBar />
                <DatabaseGate>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
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
              </AuthGate>
            </AuthProvider>
          </ThemeProvider>
        </SQLiteProvider>
      </KeyboardProvider>
      <RootToast />
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function DatabaseGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const db = useSQLiteContext();
  const styles = useThemedStyles((colors) => ({
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
    loadingMark: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.charcoal },
    loadingMarkText: { color: colors.greenSoft, fontSize: 30, fontWeight: "900" },
    loadingTitle: { color: colors.ink, fontSize: 22, fontWeight: "800", marginTop: spacing.md },
    loadingSubtitle: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
    spinner: { marginTop: spacing.lg },
  }));
  const { colors } = useTheme();
  const [ready, setReady] = useState(!isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(true);
      return;
    }

    let mounted = true;
    setReady(false);
    Promise.all([
      db.getAllAsync("SELECT * FROM projects"),
      db.getAllAsync("SELECT * FROM tickets"),
      db.getAllAsync("SELECT * FROM work_logs"),
    ])
      .catch((error) => {
        console.warn("Database warmup failed:", error);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [db, isAuthenticated]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

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
      <AuthenticatedDatabaseExtras />
    </>
  );
}

function AuthGate({ children}: {children: React.ReactNode}) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    if (isLoading) return;
    if (!navigationState?.key) return; // router not ready
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoading, isAuthenticated, inAuthGroup, navigationState?.key]);
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  toastHost: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});

