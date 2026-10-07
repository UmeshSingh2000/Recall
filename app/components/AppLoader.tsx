import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useThemedStyles } from "@/components/ThemeProvider";

interface AppLoaderProps {
  text?: string;
  subText?: string;
  size?: number;
}

const AppLoader = ({
  text = "Setting things up...",
  subText = "Please wait a moment",
  size = 72,
}: AppLoaderProps) => {
  const spin = useSharedValue(0);
  const spinReverse = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, {
        duration: 900,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    spinReverse.value = withRepeat(
      withTiming(-360, {
        duration: 1400,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [spin, spinReverse]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinReverse.value}deg` }],
  }));

  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.canvas,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    loader: {
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
    },
    track: {
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 3,
      borderColor: c.line,
    },
    outerArc: {
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 3,
      borderColor: "transparent",
      borderTopColor: c.green,
      borderRightColor: c.green,
    },
    innerArc: {
      position: "absolute",
      width: size * 0.62,
      height: size * 0.62,
      borderRadius: size,
      borderWidth: 3,
      borderColor: "transparent",
      borderBottomColor: c.green,
      opacity: 0.55,
    },
    title: {
      color: c.ink,
      fontSize: 18,
      fontWeight: "700",
      marginTop: 28,
      textAlign: "center",
    },
    subtitle: {
      color: c.muted,
      fontSize: 13,
      marginTop: 6,
      textAlign: "center",
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.loader}>
        <View style={styles.track} />
        <Animated.View style={[styles.outerArc, outerStyle]} />
        <Animated.View style={[styles.innerArc, innerStyle]} />
      </View>
      <Text style={styles.title}>{text}</Text>
      <Text style={styles.subtitle}>{subText}</Text>
    </View>
  );
};

export default AppLoader;
