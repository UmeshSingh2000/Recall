import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Dimensions, Platform, Pressable, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from './ThemeProvider';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  projects: 'layers',
  tickets: 'list',
  search: 'search',
  settings: 'settings',
};

export const FLOATING_TAB_BAR_HEIGHT = 64;

const PILL_WIDTH = 58;
const PILL_HEIGHT = 50;
const ICON_SIZE = 17;
const TABS_PADDING_H = 8;
/** Soft, overshooting spring — fractional index drives stretch while it moves. */
const PILL_SPRING = {
  damping: 13,
  stiffness: 118,
  mass: 0.9,
  overshootClamping: false,
};

const MAX_STRETCH_X = 0.38;
const STRETCH_CURVE = 0.72;

function estimatedSlotWidth(tabCount: number) {
  const barWidth = Math.min(Dimensions.get('window').width - 84, 340);
  return (barWidth - TABS_PADDING_H * 2) / tabCount;
}

type TabSlotProps = {
  index: number;
  activeIndex: SharedValue<number>;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  colors: { green: string; muted: string };
  onPress: () => void;
  tabStyle: object;
  contentSlotStyle: object;
  labelStyle: object;
  labelActiveStyle: object;
};

function TabSlot({
  index,
  activeIndex,
  label,
  iconName,
  isFocused,
  colors,
  onPress,
  tabStyle,
  contentSlotStyle,
  labelStyle,
  labelActiveStyle,
}: TabSlotProps) {
  const contentAnimStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const scale = interpolate(distance, [0, 0.55, 1.2], [1.05, 0.98, 0.94], Extrapolation.CLAMP);
    const travel = activeIndex.value - index;
    const lean = interpolate(travel, [-0.55, 0, 0.55], [3, 0, -3], Extrapolation.CLAMP);
    return { transform: [{ translateX: lean }, { scale }] };
  });

  const labelAnimStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const opacity = interpolate(distance, [0, 0.7, 1.3], [1, 0.82, 0.7], Extrapolation.CLAMP);
    const color = interpolateColor(distance, [0, 1], [colors.green, colors.muted]);
    return { opacity, color };
  });

  return (
    <Pressable
      onPress={onPress}
      style={tabStyle}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <View style={contentSlotStyle}>
        <Animated.View style={[contentAnimStyle, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name={iconName} size={ICON_SIZE} color={isFocused ? colors.green : colors.muted} />
          <Animated.Text
            style={[labelStyle, isFocused && labelActiveStyle, labelAnimStyle]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const activeIndex = useSharedValue(state.index);
  const slotWidth = useSharedValue(estimatedSlotWidth(state.routes.length));

  useEffect(() => {
    activeIndex.value = withSpring(state.index, PILL_SPRING);
  }, [state.index, activeIndex]);

  const pillTop = (FLOATING_TAB_BAR_HEIGHT - PILL_HEIGHT) / 2;

  const styles = useThemedStyles((colors) => ({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      paddingHorizontal: 42,
    },
    shadow: {
      width: '100%',
      maxWidth: 340,
      borderRadius: 34,
      shadowColor: isDark ? '#000' : '#1A2B33',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.5 : 0.2,
      shadowRadius: 32,
      elevation: 16,
    },
    blur: {
      borderRadius: 34,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.65)',
      backgroundColor: isDark
        ? Platform.OS === 'android'
          ? 'rgba(18, 24, 30, 0.78)'
          : 'rgba(255, 255, 255, 0.04)'
        : Platform.OS === 'android'
          ? 'rgba(255, 255, 255, 0.72)'
          : 'rgba(255, 255, 255, 0.12)',
    },
    tabs: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: FLOATING_TAB_BAR_HEIGHT,
      paddingHorizontal: TABS_PADDING_H,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    contentSlot: {
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    activePill: {
      position: 'absolute',
      top: pillTop,
      left: TABS_PADDING_H,
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      borderRadius: PILL_HEIGHT / 2,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.78)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.95)',
      shadowColor: '#1A2B33',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      zIndex: 1,
    },
    label: {
      marginTop: 1,
      fontSize: 8.5,
      fontWeight: '600',
      color: colors.muted,
      letterSpacing: 0.05,
      maxWidth: PILL_WIDTH - 8,
      textAlign: 'center',
      lineHeight: 11,
    },
    labelActive: {
      color: colors.green,
      fontWeight: '800',
    },
  }));

  const pillStyle = useAnimatedStyle(() => {
    const w = slotWidth.value;
    const index = activeIndex.value;
    const x = index * w + (w - PILL_WIDTH) / 2;

    const nearest = Math.round(index);
    const offset = index - nearest;
    const stretchAmount = Math.min(Math.abs(offset) * STRETCH_CURVE, MAX_STRETCH_X);
    const scaleX = 1 + stretchAmount;
    const scaleY = 1 - stretchAmount * 0.4;

    return {
      transform: [{ translateX: x }, { scaleX }, { scaleY }],
    };
  });

  const onTabsLayout = (width: number) => {
    slotWidth.value = (width - TABS_PADDING_H * 2) / state.routes.length;
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadow}>
        <BlurView
          intensity={Platform.OS === 'ios' ? (isDark ? 72 : 96) : 64}
          tint={isDark ? 'dark' : 'light'}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={styles.blur}
        >
          <View style={styles.tabs} onLayout={(e) => onTabsLayout(e.nativeEvent.layout.width)}>
            <Animated.View style={[styles.activePill, pillStyle]} pointerEvents="none" />
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;
              const isFocused = state.index === index;
              const baseIcon = TAB_ICONS[route.name] ?? 'ellipse';
              const iconName = (isFocused ? baseIcon : `${baseIcon}-outline`) as keyof typeof Ionicons.glyphMap;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <TabSlot
                  key={route.key}
                  index={index}
                  activeIndex={activeIndex}
                  label={label}
                  iconName={iconName}
                  isFocused={isFocused}
                  colors={colors}
                  onPress={onPress}
                  tabStyle={styles.tab}
                  contentSlotStyle={styles.contentSlot}
                  labelStyle={styles.label}
                  labelActiveStyle={styles.labelActive}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}
