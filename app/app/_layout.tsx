import "@/lib/crypto-polyfill";
import "react-native-reanimated";
import { SplashScreen, Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { GitCommitListener } from "../components/GitCommitListener";
import { OtaUpdateManager } from "../components/OtaUpdateManager";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";
import AuthProvider, { useAuth } from "@/components/AuthContext";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast from 'react-native-toast-message';
import { Observe, ObserveRoot } from "expo-observe";
import { Provider } from "react-redux";
import { store } from "../store";

Observe.configure({
  integrations: {
    "expo-router": {
      filteredParams: ["token"], // SDK 57+: hide sensitive query keys
    },
  },
  dispatchInDebug: true,
});

SplashScreen.preventAutoHideAsync();
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
      <GitCommitListener />
    </>
  );
}

function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
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
                    <Stack.Screen name="notifications" options={{ presentation: "card" }} />
                  </Stack>
                </DatabaseGate>
              </AuthGate>
            </AuthProvider>
          </ThemeProvider>
        </KeyboardProvider>
        <RootToast />
        <OtaUpdateManager />
      </SafeAreaProvider>
    </Provider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function DatabaseGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      SplashScreen.hide();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <>{children}</>;
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
  }, [isLoading, isAuthenticated, inAuthGroup, navigationState?.key, router]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      SplashScreen.hide();
    }
  }, [isLoading, isAuthenticated]);

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


export default ObserveRoot.wrap(RootLayout);