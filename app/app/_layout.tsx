import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeDatabase } from "../lib/database";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="recall.db" onInit={initializeDatabase}>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ticket/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="log-progress" options={{ presentation: "modal" }} />
        <Stack.Screen name="switch-work" options={{ presentation: "modal" }} />
        <Stack.Screen name="new-ticket" options={{ presentation: "modal" }} />
        <Stack.Screen name="new-project" options={{ presentation: "modal" }} />
        <Stack.Screen name="project/[id]" options={{ presentation: "card" }} />
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
