import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "./ThemeProvider";

type ShimmerBlockProps = {
  width: ViewStyle["width"];
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function ShimmerBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: ShimmerBlockProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.line,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
