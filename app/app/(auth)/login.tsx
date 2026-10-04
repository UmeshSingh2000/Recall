import { useAuth } from "@/components/AuthContext";
import { useTheme, useThemedStyles } from "@/components/ThemeProvider";
import { radius, spacing } from "@/constants/theme";
import { getAuthCallbackURL } from "@/lib/auth-callback-url";
import { authClient } from "@/lib/neon";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter();
  const styles = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.canvas },
    keyboard: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
    },
    brandBlock: { alignItems: "center", marginBottom: spacing.lg },
    logoMark: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: c.green,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    brandTitle: {
      color: c.ink,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    brandTagline: {
      color: c.muted,
      fontSize: 12,
      marginTop: 2,
      textAlign: "center",
    },
    welcomeTitle: {
      color: c.ink,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
      marginBottom: 4,
      textAlign: "center",
    },
    welcomeSubtitle: {
      color: c.muted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: spacing.lg,
      textAlign: "center",
    },
    fieldBlock: { marginBottom: spacing.md },
    fieldLabel: {
      color: c.ink,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      backgroundColor: c.surface,
      paddingHorizontal: spacing.sm + 2,
      minHeight: 44,
    },
    inputIcon: { marginRight: spacing.xs },
    input: {
      flex: 1,
      color: c.ink,
      fontSize: 14,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
    },
    forgotRow: {
      alignItems: "flex-end",
      marginTop: -2,
      marginBottom: spacing.md,
    },
    forgotText: {
      color: c.green,
      fontSize: 12,
      fontWeight: "700",
    },
    primaryButton: {
      backgroundColor: c.green,
      borderRadius: radius.sm,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    primaryButtonText: {
      color: "#0B100D",
      fontSize: 14,
      fontWeight: "800",
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.line,
    },
    dividerLabel: {
      color: c.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    googleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      minHeight: 44,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      marginBottom: spacing.md,
    },
    googleButtonText: {
      color: c.ink,
      fontSize: 13,
      fontWeight: "700",
    },
    signUpRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: spacing.md,
    },
    signUpMuted: {
      color: c.muted,
      fontSize: 12,
    },
    signUpLink: {
      color: c.green,
      fontSize: 12,
      fontWeight: "700",
    },
    legal: {
      color: c.muted,
      fontSize: 10,
      lineHeight: 15,
      textAlign: "center",
    },
    legalLink: {
      color: c.muted,
      textDecorationLine: "underline",
    },
  }));

  const handleSignIn = async() => {
    try {
        const callbackURL = getAuthCallbackURL();
        console.log("Attempting sign up with email:", email, "and password:", password);
        console.log("Using auth callback URL:", callbackURL);
        const response = await authClient.signIn.email({
            email, 
            password,
            callbackURL,
        })
        console.log("Sign up response:", response);
    }
    catch(error){
        console.error("Sign up error:", error);
    }
    // router.push("/");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAwareScrollView
        mode="layout"
        style={styles.keyboard}
        contentContainerStyle={styles.scroll}
        bottomOffset={spacing.lg}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Ionicons name="git-network-outline" size={20} color="#0B100D" />
          </View>
          <Text style={styles.brandTitle}>Recall</Text>
          <Text style={styles.brandTagline}>Your developer workspace, remembered.</Text>
        </View>

        <Text style={styles.welcomeTitle}>Welcome back</Text>
        <Text style={styles.welcomeSubtitle}>Sign in to continue to your workspace.</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={17} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="key-outline" size={17} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.muted}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
              onPress={() => setPasswordVisible((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.muted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.forgotRow}>
          <Pressable accessibilityRole="link">
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSignIn} accessibilityRole="button" style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable accessibilityRole="button" style={styles.googleButton}>
          <Ionicons name="logo-google" size={17} color={colors.ink} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <View style={styles.signUpRow}>
          <Text style={styles.signUpMuted}>Don&apos;t have an account? </Text>
          <Pressable accessibilityRole="link" onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </Pressable>
        </View>

        <Text style={styles.legal}>
          By continuing, you agree to Recall&apos;s{" "}
          <Text style={styles.legalLink}>Terms of Service</Text>
          {" and "}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
