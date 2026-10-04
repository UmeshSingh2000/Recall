import { useTheme, useThemedStyles } from "@/components/ThemeProvider";
import { radius, spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

const OTP_LENGTH = 6;

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const otpRefs = useRef<(TextInput | null)[]>([]);

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
    primaryButton: {
      backgroundColor: c.green,
      borderRadius: radius.sm,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    primaryButtonText: {
      color: "#0B100D",
      fontSize: 14,
      fontWeight: "800",
    },
    otpRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    otpBox: {
      flex: 1,
      maxWidth: 48,
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    otpInput: {
      width: "100%",
      height: "100%",
      textAlign: "center",
      color: c.ink,
      fontSize: 18,
      fontWeight: "700",
      padding: 0,
    },
    signInRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: spacing.md,
    },
    signInMuted: {
      color: c.muted,
      fontSize: 12,
    },
    signInLink: {
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

  const handleContinue = () => {
    setShowOtp(true);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (event.nativeEvent.key !== "Backspace") return;

    if (otp[index]) {
      setOtp((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (index > 0) {
      setOtp((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      otpRefs.current[index - 1]?.focus();
    }
  };

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

        <Text style={styles.welcomeTitle}>Create your account</Text>
        <Text style={styles.welcomeSubtitle}>
          {showOtp
            ? `Enter the 6-digit code we sent to ${email || "your email"}.`
            : "Sign up with your email to get started."}
        </Text>

        {!showOtp ? (
          <>
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
                  placeholder="Create a password"
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

            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Verification code</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <View key={index} style={styles.otpBox}>
                    <TextInput
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={(value) => updateOtpDigit(index, value)}
                      onKeyPress={(event) => handleOtpKeyPress(index, event)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      accessibilityLabel={`Digit ${index + 1} of ${OTP_LENGTH}`}
                    />
                  </View>
                ))}
              </View>
            </View>

            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Verify</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setShowOtp(false);
                setOtp(Array(OTP_LENGTH).fill(""));
              }}
            >
              <Text style={[styles.signInLink, { textAlign: "center", marginBottom: spacing.md }]}>
                Use a different email
              </Text>
            </Pressable>
          </>
        )}

        <View style={styles.signInRow}>
          <Text style={styles.signInMuted}>Already have an account? </Text>
          <Pressable accessibilityRole="link" onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.signInLink}>Sign in</Text>
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
